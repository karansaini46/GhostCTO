import type { Server } from 'node:http';

import { config } from './config.js';
import { createApp } from './app.js';

type ShutdownSignal = 'SIGINT' | 'SIGTERM';

const closeServer = (server: Server, signal: ShutdownSignal) => {
  console.info(`Received ${signal}. Closing HTTP server.`);

  server.close((error) => {
    if (error) {
      console.error('HTTP server closed with an error.');
      process.exit(1);
    }

    console.info('HTTP server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('HTTP server shutdown timed out.');
    process.exit(1);
  }, 10_000).unref();
};

export const startServer = () => {
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.info(`GhostCTO API listening on port ${config.port}.`);
  });

  process.once('SIGINT', () => closeServer(server, 'SIGINT'));
  process.once('SIGTERM', () => closeServer(server, 'SIGTERM'));

  return server;
};
