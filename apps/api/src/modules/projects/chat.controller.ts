import type { RequestHandler } from 'express';

import { ApiError } from '../../lib/api-error.js';
import { sendJson } from '../../lib/responses.js';
import {
  chatMessageRequestSchema,
  chatMessagesQuerySchema,
  projectIdParamSchema,
} from './project.schemas.js';
import { createProjectChatMessageForUser, listProjectChatMessagesForUser } from './chat.service.js';

const getUserId = (request: Parameters<RequestHandler>[0]) => {
  if (!request.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  return request.user.id;
};

export const createProjectChatMessage: RequestHandler = async (request, response, next) => {
  try {
    const params = projectIdParamSchema.parse(request.params);
    const input = chatMessageRequestSchema.parse(request.body ?? {});
    const result = await createProjectChatMessageForUser(getUserId(request), params.id, input);

    sendJson(response, result, 201);
  } catch (error) {
    next(error);
  }
};

export const listProjectChatMessages: RequestHandler = async (request, response, next) => {
  try {
    const params = projectIdParamSchema.parse(request.params);
    const query = chatMessagesQuerySchema.parse(request.query);
    const result = await listProjectChatMessagesForUser(getUserId(request), params.id, query);

    sendJson(response, result);
  } catch (error) {
    next(error);
  }
};
