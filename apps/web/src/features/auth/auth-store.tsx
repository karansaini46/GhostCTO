import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { ApiError } from '../../lib/api';
import { loginRequest, logoutRequest, refreshRequest, registerRequest } from './auth-api';
import { AuthContext } from './auth-context';
import type { AuthState } from './auth-context';
import type { AuthSession } from './auth-types';

const initialState: AuthState = {
  accessToken: null,
  accessTokenExpiresAt: null,
  error: null,
  status: 'loading',
  user: null,
};

const applySession = (session: AuthSession): AuthState => ({
  accessToken: session.accessToken,
  accessTokenExpiresAt: session.accessTokenExpiresAt,
  error: null,
  status: 'authenticated',
  user: session.user,
});

const getFriendlyError = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'Unable to complete the request.';
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [state, setState] = useState<AuthState>(initialState);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const session = await refreshRequest();
        if (!active) {
          return;
        }
        setState(applySession(session));
      } catch {
        if (!active) {
          return;
        }

        setState({
          accessToken: null,
          accessTokenExpiresAt: null,
          error: null,
          status: 'unauthenticated',
          user: null,
        });
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const updateSession = useCallback((session: AuthSession) => {
    setState(applySession(session));
  }, []);

  const updateUser = useCallback((user: AuthSession['user']) => {
    setState((current) => ({ ...current, user }));
  }, []);

  const login = useCallback(
    async (payload: { email: string; password: string }) => {
      try {
        updateSession(await loginRequest(payload));
      } catch (error) {
        setState((current) => ({ ...current, error: getFriendlyError(error) }));
        throw error;
      }
    },
    [updateSession],
  );

  const register = useCallback(
    async (payload: { email: string; name?: string; password: string }) => {
      try {
        updateSession(await registerRequest(payload));
      } catch (error) {
        setState((current) => ({ ...current, error: getFriendlyError(error) }));
        throw error;
      }
    },
    [updateSession],
  );

  const refreshSession = useCallback(async () => {
    try {
      updateSession(await refreshRequest());
    } catch (error) {
      setState({
        accessToken: null,
        accessTokenExpiresAt: null,
        error: getFriendlyError(error),
        status: 'unauthenticated',
        user: null,
      });
      throw error;
    }
  }, [updateSession]);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setState({
        accessToken: null,
        accessTokenExpiresAt: null,
        error: null,
        status: 'unauthenticated',
        user: null,
      });
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      ...state,
      login,
      logout,
      refreshSession,
      register,
      updateUser,
    }),
    [login, logout, refreshSession, register, state, updateUser],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
