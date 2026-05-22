import type { UserRole } from '../../generated/prisma/enums.js';

export type SafeUser = {
  avatarUrl: string | null;
  createdAt: string;
  email: string;
  id: string;
  name: string | null;
  role: UserRole;
  updatedAt: string;
};

export type AuthSession = {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: SafeUser;
};
