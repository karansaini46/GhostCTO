import { Router } from 'express';

import { authRouter } from '../modules/auth/auth.routes.js';
import { healthRouter } from '../modules/health/health.routes.js';

export const routes = Router();

routes.use('/auth', authRouter);
routes.use('/health', healthRouter);
