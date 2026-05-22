import { config } from '../../core/config.js';

export type HealthStatus = {
  environment: string;
  status: 'ok';
  timestamp: string;
};

export const getHealthStatus = (): HealthStatus => ({
  environment: config.nodeEnv,
  status: 'ok',
  timestamp: new Date().toISOString(),
});
