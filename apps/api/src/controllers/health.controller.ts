import type { RequestHandler } from 'express';

import { sendJson } from '../lib/responses.js';
import { getHealthStatus } from '../services/health.service.js';

export const getHealth: RequestHandler = (_request, response) => {
  sendJson(response, getHealthStatus());
};
