import { apiRequest } from '../../lib/api';
import type { SafeUser } from '../auth/auth-types';
import type { BillingStatus, PaymentRecord } from './billing-types';

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export const getBillingStatusRequest = (accessToken: string) =>
  apiRequest<{ billingStatus: BillingStatus }>('/billing/status', {
    headers: authHeaders(accessToken),
  });

export const verifyLicenseRequest = (accessToken: string, licenseKey: string) =>
  apiRequest<{
    billingStatus: BillingStatus;
    payment: PaymentRecord;
    user: SafeUser;
  }>('/billing/verify', {
    body: JSON.stringify({ licenseKey }),
    headers: authHeaders(accessToken),
    method: 'POST',
  });
