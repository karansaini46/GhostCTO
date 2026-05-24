import { Router } from 'express';

import { asyncHandler } from '../../middleware/async-handler.js';
import { authenticateRequest, requireAdmin, requireAuth } from '../../middleware/auth.js';
import { getAdminStatsController, lookupAdminUsersController } from './admin.controller.js';

export const adminRouter = Router();

adminRouter.use(authenticateRequest, requireAuth, requireAdmin);

adminRouter.get('/stats', asyncHandler(getAdminStatsController));
adminRouter.get('/users', asyncHandler(lookupAdminUsersController));
