import type { RequestHandler } from 'express';

export const requestLogger: RequestHandler = (request, response, next) => {
  const startedAt = process.hrtime.bigint();

  response.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    console.info('Request completed.', {
      durationMs: Number(durationMs.toFixed(1)),
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
    });
  });

  next();
};
