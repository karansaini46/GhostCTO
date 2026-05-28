import type { RequestHandler } from 'express';

import { sendJson } from '../../lib/responses.js';
import { adminUsersQuerySchema } from './admin.schemas.js';
import { getAdminStats, lookupAdminUsersByEmail } from './admin.service.js';

export const getAdminStatsController: RequestHandler = async (_request, response, next) => {
  try {
    const stats = await getAdminStats();

    sendJson(response, { stats });
  } catch (error) {
    next(error);
  }
};

export const lookupAdminUsersController: RequestHandler = async (request, response, next) => {
  try {
    const query = adminUsersQuerySchema.parse(request.query);
    const users = await lookupAdminUsersByEmail(query.email);

    sendJson(response, { users });
  } catch (error) {
    next(error);
  }
};
