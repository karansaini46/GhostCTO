import { ApiError } from '../../lib/api';

const limitErrorCodes = new Set([
  'DAILY_GENERATION_LIMIT_REACHED',
  'PLAN_LIMIT_REACHED',
  'TOO_MANY_GENERATION_REQUESTS',
]);

export const getGenerationErrorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

export const isGenerationLimitError = (error: unknown) =>
  error instanceof ApiError && limitErrorCodes.has(error.code);
