import cors from 'cors';
import express from 'express';

import { config } from './config.js';

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      credentials: true,
      origin: config.clientOrigin,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_request, response) => {
    response.status(200).json({
      service: 'ghostcto-api',
      status: 'ok',
    });
  });

  return app;
};
