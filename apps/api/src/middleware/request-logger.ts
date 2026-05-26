import type { RequestHandler } from 'express';

import { logger } from '../lib/logger.js';

export const requestLogger: RequestHandler = (request, response, next) => {
  const startedAt = process.hrtime.bigint();
  const path = request.originalUrl.split('?')[0] || request.path;

  response.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    logger.info('Request completed.', {
      durationMs: Number(durationMs.toFixed(1)),
      method: request.method,
      path,
      statusCode: response.statusCode,
    });
  });

  next();
};
