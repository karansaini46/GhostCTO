import type { Response } from 'express';

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export const sendJson = <Body extends object>(response: Response, body: Body, statusCode = 200) => {
  response.status(statusCode).json(body);
};

export const sendError = (
  response: Response,
  statusCode: number,
  code: string,
  message: string,
) => {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
    },
  };

  response.status(statusCode).json(body);
};
