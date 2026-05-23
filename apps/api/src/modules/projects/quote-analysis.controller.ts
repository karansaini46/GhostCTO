import type { RequestHandler } from 'express';

import { ApiError } from '../../lib/api-error.js';
import { sendJson } from '../../lib/responses.js';
import { projectIdParamSchema, quoteAnalysisRequestSchema } from './project.schemas.js';
import { analyzeQuoteForUser } from './quote-analysis.service.js';

const getUserId = (request: Parameters<RequestHandler>[0]) => {
  if (!request.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  return request.user.id;
};

export const analyzeQuote: RequestHandler = async (request, response, next) => {
  try {
    const params = projectIdParamSchema.parse(request.params);
    const input = quoteAnalysisRequestSchema.parse(request.body ?? {});
    const result = await analyzeQuoteForUser(getUserId(request), params.id, input);

    sendJson(response, result, 201);
  } catch (error) {
    next(error);
  }
};
