import { apiRequest, toApiUrl } from '../../lib/api';
import type { AuthSession } from './auth-types';

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = LoginPayload & {
  name?: string;
};

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export const registerRequest = (payload: RegisterPayload) =>
  apiRequest<AuthSession>('/auth/register', {
    body: JSON.stringify(payload),
    method: 'POST',
  });

export const loginRequest = (payload: LoginPayload) =>
  apiRequest<AuthSession>('/auth/login', {
    body: JSON.stringify(payload),
    method: 'POST',
  });

export const refreshRequest = () => apiRequest<AuthSession>('/auth/refresh', { method: 'POST' });

export const logoutRequest = () => apiRequest<void>('/auth/logout', { method: 'POST' });

export const meRequest = (accessToken: string) =>
  apiRequest<{ user: AuthSession['user'] }>('/auth/me', {
    headers: authHeaders(accessToken),
  });

export const updateProfileRequest = (accessToken: string, payload: { name: string | null }) =>
  apiRequest<{ user: AuthSession['user'] }>('/auth/me', {
    body: JSON.stringify(payload),
    headers: authHeaders(accessToken),
    method: 'PATCH',
  });

export const getGoogleAuthUrl = () => toApiUrl('/auth/google');
