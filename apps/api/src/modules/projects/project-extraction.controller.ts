import type { RequestHandler } from 'express';
import { ApiError } from '../../lib/api-error.js';
import { sendJson } from '../../lib/responses.js';
import { extractContextRequestSchema } from './project.schemas.js';
import { extractProjectContext } from './project-extraction.service.js';

export const extractContext: RequestHandler = async (request, response, next) => {
  try {
    if (!request.user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
    }
    const input = extractContextRequestSchema.parse(request.body);
    const result = await extractProjectContext(input.description);
    sendJson(response, { result });
  } catch (error) {
    next(error);
  }
};
