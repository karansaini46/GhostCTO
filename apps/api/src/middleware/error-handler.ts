import type { ErrorRequestHandler } from 'express';

import { config } from '../core/config.js';
import { ApiError } from '../lib/api-error.js';
import { sendError } from '../lib/responses.js';

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

export const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const httpStatusCode = getHttpStatusCode(error as HttpErrorLike);
  const normalized =
    error instanceof ApiError
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
