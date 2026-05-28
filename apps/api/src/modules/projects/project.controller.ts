import type { RequestHandler } from 'express';

import { ApiError } from '../../lib/api-error.js';
import { sendJson } from '../../lib/responses.js';
import {
  deleteProjectPayloadSchema,
  projectIdParamSchema,
  projectPayloadSchema,
  updateProjectPayloadSchema,
} from './project.schemas.js';
import {
  createProjectForUser,
  deleteProjectForUser,
  getProjectForUser,
  listProjectsForUser,
  updateProjectForUser,
} from './project.service.js';

const getUserId = (request: Parameters<RequestHandler>[0]) => {
  if (!request.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  return request.user.id;
};

export const createProject: RequestHandler = async (request, response, next) => {
  try {
    const input = projectPayloadSchema.parse(request.body);
    const project = await createProjectForUser(getUserId(request), input);

    sendJson(response, { project }, 201);
  } catch (error) {
    next(error);
  }
};

export const listProjects: RequestHandler = async (request, response, next) => {
  try {
    const projects = await listProjectsForUser(getUserId(request));

    sendJson(response, { projects });
  } catch (error) {
    next(error);
  }
};

export const getProject: RequestHandler = async (request, response, next) => {
  try {
    const params = projectIdParamSchema.parse(request.params);
    const project = await getProjectForUser(getUserId(request), params.id);

    sendJson(response, { project });
  } catch (error) {
    next(error);
  }
};

export const updateProject: RequestHandler = async (request, response, next) => {
  try {
    const params = projectIdParamSchema.parse(request.params);
    const input = updateProjectPayloadSchema.parse(request.body);
    const project = await updateProjectForUser(getUserId(request), params.id, input);

    sendJson(response, { project });
  } catch (error) {
    next(error);
  }
};

export const deleteProject: RequestHandler = async (request, response, next) => {
  try {
    const params = projectIdParamSchema.parse(request.params);
    const input = deleteProjectPayloadSchema.parse(request.body);

    await deleteProjectForUser(getUserId(request), params.id, input);

    response.status(204).send();
  } catch (error) {
    next(error);
  }
};
