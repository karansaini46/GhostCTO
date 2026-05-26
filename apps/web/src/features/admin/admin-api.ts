import { apiRequest } from '../../lib/api';
import type { AdminStats, AdminUserLookup } from './admin-types';

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export const getAdminStatsRequest = (accessToken: string) =>
  apiRequest<{ stats: AdminStats }>('/admin/stats', {
    headers: authHeaders(accessToken),
  });

export const lookupAdminUsersRequest = (accessToken: string, email: string) =>
  apiRequest<{ users: AdminUserLookup[] }>(`/admin/users?email=${encodeURIComponent(email)}`, {
    headers: authHeaders(accessToken),
  });
