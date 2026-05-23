import type { RequestHandler } from 'express';

import { ApiError } from '../../lib/api-error.js';
import { sendJson } from '../../lib/responses.js';
import { codeAuditRequestSchema, projectIdParamSchema } from './project.schemas.js';
import { generateCodeAuditForUser } from './code-audit.service.js';

const getUserId = (request: Parameters<RequestHandler>[0]) => {
  if (!request.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  return request.user.id;
};

export const generateCodeAudit: RequestHandler = async (request, response, next) => {
  try {
    const params = projectIdParamSchema.parse(request.params);
    const input = codeAuditRequestSchema.parse(request.body ?? {});
    const result = await generateCodeAuditForUser(getUserId(request), params.id, input);

    sendJson(response, result, 201);
  } catch (error) {
    next(error);
  }
};
