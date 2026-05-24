import type { RequestHandler } from 'express';

import { ApiError } from '../../lib/api-error.js';
import { sendJson } from '../../lib/responses.js';
import { getBillingStatusForUser, verifyLicenseForUser } from './billing.service.js';
import { licenseVerificationSchema } from './billing.schemas.js';

const getUserId = (request: Parameters<RequestHandler>[0]) => {
  if (!request.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  return request.user.id;
};

export const getBillingStatus: RequestHandler = async (request, response, next) => {
  try {
    const billingStatus = await getBillingStatusForUser(getUserId(request));

    sendJson(response, { billingStatus });
  } catch (error) {
    next(error);
  }
};

export const verifyLicense: RequestHandler = async (request, response, next) => {
  try {
    const input = licenseVerificationSchema.parse(request.body);
    const result = await verifyLicenseForUser(getUserId(request), input);

    sendJson(response, result, 201);
  } catch (error) {
    next(error);
  }
};
