export type SafeUser = {
  avatarUrl: string | null;
  createdAt: string;
  email: string;
  id: string;
  name: string | null;
  role: 'FOUNDER' | 'ADMIN';
  updatedAt: string;
};

export type AuthSession = {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: SafeUser;
};

