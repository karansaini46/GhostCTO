import type { RequestHandler } from 'express';

import { ApiError } from '../../lib/api-error.js';
import { sendJson } from '../../lib/responses.js';
import {
  documentFeedbackPayloadSchema,
  documentDetailParamsSchema,
  projectDocumentsQuerySchema,
  projectIdParamSchema,
} from './project.schemas.js';
import {
  getProjectDocumentForUser,
  listProjectDocumentsForUser,
  upsertProjectDocumentFeedbackForUser,
} from './document-history.service.js';

const getUserId = (request: Parameters<RequestHandler>[0]) => {
  if (!request.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  return request.user.id;
};

export const listProjectDocuments: RequestHandler = async (request, response, next) => {
  try {
    const params = projectIdParamSchema.parse(request.params);
    const query = projectDocumentsQuerySchema.parse(request.query);
    const documents = await listProjectDocumentsForUser(getUserId(request), params.id, query.type);

    sendJson(response, { documents });
  } catch (error) {
    next(error);
  }
};

export const getProjectDocument: RequestHandler = async (request, response, next) => {
  try {
    const params = documentDetailParamsSchema.parse(request.params);
    const document = await getProjectDocumentForUser(
      getUserId(request),
      params.id,
      params.documentId,
    );

    sendJson(response, { document });
  } catch (error) {
    next(error);
  }
};

export const submitProjectDocumentFeedback: RequestHandler = async (request, response, next) => {
  try {
    const params = documentDetailParamsSchema.parse(request.params);
    const body = documentFeedbackPayloadSchema.parse(request.body ?? {});
    const feedback = await upsertProjectDocumentFeedbackForUser(
      getUserId(request),
      params.id,
      params.documentId,
      body,
    );

    sendJson(response, { feedback }, 201);
  } catch (error) {
    next(error);
  }
};
