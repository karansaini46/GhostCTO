import type { RequestHandler } from 'express';

import { ApiError } from '../../lib/api-error.js';
import { documentExportParamsSchema } from './project.schemas.js';
import { exportProjectDocumentPdfForUser } from './document-export.service.js';

const getUserId = (request: Parameters<RequestHandler>[0]) => {
  if (!request.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  return request.user.id;
};

export const exportProjectDocumentPdf: RequestHandler = async (request, response, next) => {
  try {
    const params = documentExportParamsSchema.parse(request.params);
    const result = await exportProjectDocumentPdfForUser(
      getUserId(request),
      params.projectId,
      params.documentId,
    );

    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    response.setHeader('Content-Length', result.buffer.byteLength);
    response.setHeader('Content-Type', 'application/pdf');
    response.status(200).send(result.buffer);
  } catch (error) {
    next(error);
  }
};
