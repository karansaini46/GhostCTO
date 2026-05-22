import type { RequestHandler } from 'express';

import { ApiError } from '../../lib/api-error.js';
import { sendJson } from '../../lib/responses.js';
import { projectDocumentsQuerySchema, projectIdParamSchema } from './project.schemas.js';
import { generateRoadmapForUser, listRoadmapDocumentsForUser } from './roadmap.service.js';

const getUserId = (request: Parameters<RequestHandler>[0]) => {
  if (!request.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  return request.user.id;
};

export const generateRoadmap: RequestHandler = async (request, response, next) => {
  try {
    const params = projectIdParamSchema.parse(request.params);
    const result = await generateRoadmapForUser(getUserId(request), params.id);

    sendJson(response, result, 201);
  } catch (error) {
    next(error);
  }
};

export const listRoadmapDocuments: RequestHandler = async (request, response, next) => {
  try {
    const params = projectIdParamSchema.parse(request.params);
    projectDocumentsQuerySchema.parse(request.query);
    const documents = await listRoadmapDocumentsForUser(getUserId(request), params.id);

    sendJson(response, { documents });
  } catch (error) {
    next(error);
  }
};
