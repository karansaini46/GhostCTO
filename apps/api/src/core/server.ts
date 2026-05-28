import type { Server } from 'node:http';

import { config } from './config.js';
import { createApp } from './app.js';
import { logger } from '../lib/logger.js';

type ShutdownSignal = 'SIGINT' | 'SIGTERM';

const closeServer = (server: Server, signal: ShutdownSignal) => {
  logger.info('Received shutdown signal. Closing HTTP server.', { signal });

  server.close((error) => {
    if (error) {
      logger.error('HTTP server closed with an error.', { error: error.message });
      process.exit(1);
    }

    logger.info('HTTP server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('HTTP server shutdown timed out.');
    process.exit(1);
  }, 10_000).unref();
};

export const startServer = () => {
  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info('API server listening.', { port: config.port });
  });

  process.once('SIGINT', () => closeServer(server, 'SIGINT'));
  process.once('SIGTERM', () => closeServer(server, 'SIGTERM'));

  return server;
};
