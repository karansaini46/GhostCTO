import type { RequestHandler } from 'express';

import { ApiError } from '../../lib/api-error.js';
import { sendJson } from '../../lib/responses.js';
import { projectIdParamSchema, vettingRequestSchema } from './project.schemas.js';
import { generateVettingScorecardForUser } from './vetting.service.js';

const getUserId = (request: Parameters<RequestHandler>[0]) => {
  if (!request.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  return request.user.id;
};

export const generateVettingScorecard: RequestHandler = async (request, response, next) => {
  try {
    const params = projectIdParamSchema.parse(request.params);
    const input = vettingRequestSchema.parse(request.body ?? {});
    const result = await generateVettingScorecardForUser(getUserId(request), params.id, input);

    sendJson(response, result, 201);
  } catch (error) {
    next(error);
  }
};
