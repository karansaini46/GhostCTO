import { Router } from 'express';

import { asyncHandler } from '../../middleware/async-handler.js';
import { authenticateRequest, requireAuth } from '../../middleware/auth.js';
import { getBillingStatus } from './billing.controller.js';

export const billingRouter = Router();

billingRouter.use(authenticateRequest, requireAuth);

billingRouter.get('/status', asyncHandler(getBillingStatus));
