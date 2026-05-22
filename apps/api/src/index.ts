import { config } from './config.js';
import { createApp } from './server.js';

const app = createApp();

app.listen(config.port, () => {
  console.info(`GhostCTO API listening on port ${config.port}`);
});
