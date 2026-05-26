import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

import { config } from '../../core/config.js';
import { ApiError } from '../../lib/api-error.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { authenticateRequest, requireAuth } from '../../middleware/auth.js';
import {
  requireChatCapacity,
  requireGenerationCapacity,
  requireProjectCapacity,
} from '../billing/billing.middleware.js';
import { createProjectChatMessage, listProjectChatMessages } from './chat.controller.js';
import { generateCodeAudit } from './code-audit.controller.js';
import {
  getProjectDocument,
  listProjectDocuments,
  submitProjectDocumentFeedback,
} from './document-history.controller.js';
import { exportProjectDocumentPdf } from './document-export.controller.js';
import { createDeveloperJd } from './developer-jd.controller.js';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from './project.controller.js';
import { analyzeQuote } from './quote-analysis.controller.js';
import { generateRoadmap } from './roadmap.controller.js';
import { generateStackAdvice } from './stack-advice.controller.js';
import { generateTechnicalSpec } from './technical-spec.controller.js';
import { generateVettingScorecard } from './vetting.controller.js';

export const projectRouter = Router();

projectRouter.use(authenticateRequest, requireAuth);

const generationEndpointLimiter = rateLimit({
  handler: (_request, _response, next) => {
    next(
      new ApiError(
        429,
        'TOO_MANY_GENERATION_REQUESTS',
        'Too many generation requests. Please wait a moment before trying again.',
      ),
    );
  },
  keyGenerator: (request) => request.user?.id ?? ipKeyGenerator(request.ip ?? 'anonymous'),
  legacyHeaders: false,
  limit: config.generationRateLimitMax,
  standardHeaders: true,
  windowMs: config.generationRateLimitWindowMs,
});

projectRouter.post('/', requireProjectCapacity, asyncHandler(createProject));
projectRouter.post(
  '/:id/code-audit',
  generationEndpointLimiter,
  requireGenerationCapacity,
  asyncHandler(generateCodeAudit),
);
projectRouter.post(
  '/:id/chat',
  generationEndpointLimiter,
  requireChatCapacity,
  asyncHandler(createProjectChatMessage),
);
projectRouter.post(
  '/:id/roadmap',
  generationEndpointLimiter,
  requireGenerationCapacity,
  asyncHandler(generateRoadmap),
);
projectRouter.post(
  '/:id/stack-advisor',
  generationEndpointLimiter,
  requireGenerationCapacity,
  asyncHandler(generateStackAdvice),
);
projectRouter.post(
  '/:id/technical-spec',
  generationEndpointLimiter,
  requireGenerationCapacity,
  asyncHandler(generateTechnicalSpec),
);
projectRouter.post(
  '/:id/rate-validator',
  generationEndpointLimiter,
  requireGenerationCapacity,
  asyncHandler(analyzeQuote),
);
projectRouter.post(
  '/:id/vetting',
  generationEndpointLimiter,
  requireGenerationCapacity,
  asyncHandler(generateVettingScorecard),
);
projectRouter.get('/:id/chat', asyncHandler(listProjectChatMessages));
projectRouter.get(
  '/:projectId/documents/:documentId/export.pdf',
  asyncHandler(exportProjectDocumentPdf),
);
projectRouter.post(
  '/:id/developer-jd',
  generationEndpointLimiter,
  requireGenerationCapacity,
  asyncHandler(createDeveloperJd),
);
projectRouter.get('/:id/documents', asyncHandler(listProjectDocuments));
projectRouter.get('/:id/documents/:documentId', asyncHandler(getProjectDocument));
projectRouter.post('/:id/documents/:documentId/feedback', asyncHandler(submitProjectDocumentFeedback));
projectRouter.get('/', asyncHandler(listProjects));
projectRouter.get('/:id', asyncHandler(getProject));
projectRouter.patch('/:id', asyncHandler(updateProject));
projectRouter.delete('/:id', asyncHandler(deleteProject));
