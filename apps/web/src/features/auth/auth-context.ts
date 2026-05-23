import { createContext, useContext } from 'react';

import type { SafeUser } from './auth-types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type AuthState = {
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  error: string | null;
  status: AuthStatus;
  user: SafeUser | null;
};

export type AuthContextValue = AuthState & {
  login: (payload: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  register: (payload: { email: string; name?: string; password: string }) => Promise<void>;
  updateUser: (user: SafeUser) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
};
