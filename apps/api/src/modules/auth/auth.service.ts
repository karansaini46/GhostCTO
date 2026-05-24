import bcrypt from 'bcryptjs';
import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { ApiError } from '../../lib/api-error.js';
import { config } from '../../core/config.js';
import {
  createAccessToken,
  createRefreshToken,
  getAccessTokenExpiresAt,
  getRefreshTokenExpiresAt,
  hashToken,
  verifyAccessToken,
} from './auth.tokens.js';
import type { AuthSession, GoogleOAuthProfile, SafeUser } from './auth.types.js';
import type { LoginInput, RegisterInput, UpdateProfileInput } from './auth.schemas.js';

const safeUserSelect = {
  avatarUrl: true,
  createdAt: true,
  email: true,
  id: true,
  name: true,
  plan: true,
  role: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const userWithPasswordSelect = {
  ...safeUserSelect,
  passwordHash: true,
} satisfies Prisma.UserSelect;

const toSafeUser = (user: Prisma.UserGetPayload<{ select: typeof safeUserSelect }>): SafeUser => ({
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt.toISOString(),
  email: user.email,
  id: user.id,
  name: user.name,
  plan: user.plan,
  role: user.role,
  updatedAt: user.updatedAt.toISOString(),
});

const buildSession = async (
  userId: string,
): Promise<{ refreshToken: string; session: AuthSession }> => {
  const user = await prisma.user.findUnique({
    select: safeUserSelect,
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  const safe = toSafeUser(user);
  const accessToken = createAccessToken(safe);
  const refreshToken = createRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const refreshTokenExpiresAt = getRefreshTokenExpiresAt();

  await prisma.refreshToken.create({
    data: {
      expiresAt: refreshTokenExpiresAt,
      tokenHash: refreshTokenHash,
      userId,
    },
  });

  return {
    refreshToken,
    session: {
      accessToken,
      accessTokenExpiresAt: getAccessTokenExpiresAt(accessToken),
      user: safe,
    },
  };
};

const getGoogleProfileUpdates = (
  user: { avatarUrl: string | null; name: string | null },
  profile: GoogleOAuthProfile,
) => ({
  avatarUrl: user.avatarUrl ?? profile.avatarUrl,
  googleAccountId: profile.id,
  name: user.name ?? profile.name,
});

const getUserByEmailWithPassword = async (email: string) =>
  prisma.user.findUnique({
    select: userWithPasswordSelect,
    where: { email },
  });

export const registerUser = async (
  input: RegisterInput,
): Promise<{ refreshToken: string; session: AuthSession }> => {
  const existingUser = await prisma.user.findUnique({
    select: { id: true },
    where: { email: input.email },
  });

  if (existingUser) {
    throw new ApiError(409, 'EMAIL_IN_USE', 'An account already exists for that email.');
  }

  const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);

  let user: { id: string };

  try {
    user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name ?? null,
        passwordHash,
        role: 'FOUNDER',
      },
      select: { id: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ApiError(409, 'EMAIL_IN_USE', 'An account already exists for that email.');
    }

    throw error;
  }

  return buildSession(user.id);
};

export const loginUser = async (
  input: LoginInput,
): Promise<{ refreshToken: string; session: AuthSession }> => {
  const user = await getUserByEmailWithPassword(input.email);

  if (!user?.passwordHash) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  return buildSession(user.id);
};

export const loginWithGoogleProfile = async (
  profile: GoogleOAuthProfile,
): Promise<{ refreshToken: string; session: AuthSession }> => {
  if (!profile.emailVerified) {
    throw new ApiError(
      401,
      'GOOGLE_EMAIL_UNVERIFIED',
      'Google could not confirm that email address.',
    );
  }

  const linkedUser = await prisma.user.findUnique({
    select: { id: true },
    where: { googleAccountId: profile.id },
  });

  if (linkedUser) {
    return buildSession(linkedUser.id);
  }

  let user: { id: string };

  try {
    user = await prisma.$transaction(async (transaction) => {
      const userWithEmail = await transaction.user.findUnique({
        select: {
          avatarUrl: true,
          googleAccountId: true,
          id: true,
          name: true,
        },
        where: { email: profile.email },
      });

      if (userWithEmail) {
        if (userWithEmail.googleAccountId && userWithEmail.googleAccountId !== profile.id) {
          throw new ApiError(
            409,
            'GOOGLE_ACCOUNT_CONFLICT',
            'That email is already linked to another Google account.',
          );
        }

        return transaction.user.update({
          data: getGoogleProfileUpdates(userWithEmail, profile),
          select: { id: true },
          where: { id: userWithEmail.id },
        });
      }

      return transaction.user.create({
        data: {
          avatarUrl: profile.avatarUrl,
          email: profile.email,
          googleAccountId: profile.id,
          name: profile.name,
          role: 'FOUNDER',
        },
        select: { id: true },
      });
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ApiError(
        409,
        'GOOGLE_ACCOUNT_CONFLICT',
        'That email is already linked to another Google account.',
      );
    }

    throw error;
  }

  return buildSession(user.id);
};

export const refreshUserSession = async (
  rawRefreshToken: string,
): Promise<{ refreshToken: string; session: AuthSession }> => {
  const refreshTokenHash = hashToken(rawRefreshToken);
  const tokenRecord = await prisma.refreshToken.findUnique({
    include: {
      user: {
        select: safeUserSelect,
      },
    },
    where: { tokenHash: refreshTokenHash },
  });

  if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt <= new Date()) {
    throw new ApiError(401, 'REFRESH_TOKEN_INVALID', 'Session has expired. Please sign in again.');
  }

  const accessToken = createAccessToken(toSafeUser(tokenRecord.user));
  const nextRefreshToken = createRefreshToken();
  const nextRefreshTokenHash = hashToken(nextRefreshToken);
  const nextRefreshTokenExpiresAt = getRefreshTokenExpiresAt();

  await prisma.$transaction([
    prisma.refreshToken.update({
      data: {
        revokedAt: new Date(),
      },
      where: { id: tokenRecord.id },
    }),
    prisma.refreshToken.create({
      data: {
        expiresAt: nextRefreshTokenExpiresAt,
        tokenHash: nextRefreshTokenHash,
        userId: tokenRecord.userId,
      },
    }),
  ]);

  return {
    refreshToken: nextRefreshToken,
    session: {
      accessToken,
      accessTokenExpiresAt: getAccessTokenExpiresAt(accessToken),
      user: toSafeUser(tokenRecord.user),
    },
  };
};

export const logoutUserSession = async (rawRefreshToken: string): Promise<void> => {
  const refreshTokenHash = hashToken(rawRefreshToken);
  const tokenRecord = await prisma.refreshToken.findUnique({
    select: { id: true, revokedAt: true },
    where: { tokenHash: refreshTokenHash },
  });

  if (!tokenRecord || tokenRecord.revokedAt) {
    return;
  }

  await prisma.refreshToken.update({
    data: {
      revokedAt: new Date(),
    },
    where: { id: tokenRecord.id },
  });
};

export const authenticateAccessToken = async (
  authorizationHeader: string | undefined,
): Promise<SafeUser | null> => {
  const token = authorizationHeader?.startsWith('Bearer ')
    ? authorizationHeader.slice('Bearer '.length).trim()
    : null;

  if (!token) {
    return null;
  }

  let userId: string;

  try {
    ({ userId } = verifyAccessToken(token));
  } catch {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  const user = await prisma.user.findUnique({
    select: safeUserSelect,
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  return toSafeUser(user);
};

export const getSafeUserById = async (userId: string): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({
    select: safeUserSelect,
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  return toSafeUser(user);
};

export const updateUserProfile = async (
  userId: string,
  input: UpdateProfileInput,
): Promise<SafeUser> => {
  const user = await prisma.user.update({
    data: {
      name: input.name,
    },
    select: safeUserSelect,
    where: { id: userId },
  });

  return toSafeUser(user);
};
