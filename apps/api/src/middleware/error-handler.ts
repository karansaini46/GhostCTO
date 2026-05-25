import type { ErrorRequestHandler } from 'express';

import { ZodError } from 'zod';

import { config } from '../core/config.js';
import { ApiError } from '../lib/api-error.js';
import { sendError } from '../lib/responses.js';
import { ModelProviderError } from '../services/model-provider/errors.js';

const fallbackError = {
  code: 'INTERNAL_SERVER_ERROR',
  message: 'An unexpected error occurred.',
  statusCode: 500,
};

type HttpErrorLike = Error & {
  expose?: boolean;
  status?: number;
  statusCode?: number;
  type?: string;
};

const getHttpStatusCode = (error: HttpErrorLike) => {
  const statusCode = error.statusCode ?? error.status;

  if (!Number.isInteger(statusCode) || !statusCode || statusCode < 400 || statusCode > 599) {
    return undefined;
  }

  return statusCode;
};

const getHttpErrorMessage = (error: HttpErrorLike) => {
  if (error.type === 'entity.parse.failed') {
    return 'Invalid request body.';
  }

  if (error.type === 'entity.too.large') {
    return 'Request body is too large.';
  }

  if (error.expose && error.status && error.status < 500) {
    return error.message;
  }

  return fallbackError.message;
};

const getErrorCode = (statusCode: number) => {
  if (statusCode === 400) {
    return 'BAD_REQUEST';
  }

  if (statusCode === 403) {
    return 'FORBIDDEN';
  }

  if (statusCode === 404) {
    return 'NOT_FOUND';
  }

  return statusCode >= 500 ? fallbackError.code : 'REQUEST_ERROR';
};

const normalizeModelProviderError = (error: ModelProviderError) => {
  if (error.code === 'PROVIDER_RATE_LIMITED') {
    return {
      code: error.code,
      message: 'Generation is temporarily rate limited. Please try again shortly.',
      statusCode: 429,
    };
  }

  if (error.code === 'PROVIDER_NOT_CONFIGURED') {
    return {
      code: error.code,
      message: 'Generation is not configured for this environment.',
      statusCode: 503,
    };
  }

  return {
    code: error.code,
    message: 'Generation could not be completed. Please try again.',
    statusCode: 502,
  };
};

export const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const httpStatusCode = getHttpStatusCode(error as HttpErrorLike);
  const normalized =
    error instanceof ZodError
      ? {
          code: 'VALIDATION_ERROR',
          message: error.issues[0]?.message ?? 'Invalid request body.',
          statusCode: 400,
        }
      : error instanceof ModelProviderError
        ? normalizeModelProviderError(error)
        : error instanceof ApiError
          ? {
              code: error.code,
              message: error.expose ? error.message : fallbackError.message,
              statusCode: error.statusCode,
            }
          : httpStatusCode
            ? {
                code: getErrorCode(httpStatusCode),
                message: getHttpErrorMessage(error as HttpErrorLike),
                statusCode: httpStatusCode,
              }
            : fallbackError;

  if (normalized.statusCode >= 500) {
    console.error('Request failed.', {
      code: normalized.code,
      method: request.method,
      path: request.path,
      statusCode: normalized.statusCode,
    });
  }

  const message =
    config.isProduction && normalized.statusCode >= 500
      ? fallbackError.message
      : normalized.message;

  sendError(response, normalized.statusCode, normalized.code, message);
};
