import type { BillingPlan, UserRole } from '../../generated/prisma/enums.js';

export type SafeUser = {
  avatarUrl: string | null;
  createdAt: string;
  email: string;
  id: string;
  name: string | null;
  plan: BillingPlan;
  role: UserRole;
  updatedAt: string;
};

export type AuthSession = {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: SafeUser;
};

export type GoogleOAuthProfile = {
  avatarUrl: string | null;
  email: string;
  emailVerified: boolean;
  id: string;
  name: string | null;
};
