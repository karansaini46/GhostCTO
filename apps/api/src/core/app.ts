import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { config } from './config.js';
import { ApiError } from '../lib/api-error.js';
import { errorHandler } from '../middleware/error-handler.js';
import { notFoundHandler } from '../middleware/not-found.js';
import { requestLogger } from '../middleware/request-logger.js';
import { routes } from '../routes/index.js';

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || config.clientOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'Origin is not allowed.'));
      },
    }),
  );
  app.use(express.json({ limit: config.jsonLimit }));
  app.use(requestLogger);
  app.use(routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
