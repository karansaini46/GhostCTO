import type { RequestHandler } from 'express';

import { ApiError } from '../../lib/api-error.js';
import { sendJson } from '../../lib/responses.js';
import { projectIdParamSchema } from './project.schemas.js';
import { generateStackAdviceForUser } from './stack-advice.service.js';

const getUserId = (request: Parameters<RequestHandler>[0]) => {
  if (!request.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  return request.user.id;
};

export const generateStackAdvice: RequestHandler = async (request, response, next) => {
  try {
    const params = projectIdParamSchema.parse(request.params);
    const result = await generateStackAdviceForUser(getUserId(request), params.id);

    sendJson(response, result, 201);
  } catch (error) {
    next(error);
  }
};
