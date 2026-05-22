import { apiRequest } from '../../lib/api';
import type { AuthSession } from './auth-types';

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = LoginPayload & {
  name?: string;
};

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

export const meRequest = () => apiRequest<{ user: AuthSession['user'] }>('/auth/me');

