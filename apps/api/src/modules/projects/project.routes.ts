import { Router } from 'express';

import { asyncHandler } from '../../middleware/async-handler.js';
import { authenticateRequest, requireAuth } from '../../middleware/auth.js';
import { createProject, getProject, listProjects, updateProject } from './project.controller.js';
import { generateRoadmap, listRoadmapDocuments } from './roadmap.controller.js';
import { generateStackAdvice } from './stack-advice.controller.js';

export const projectRouter = Router();

projectRouter.use(authenticateRequest, requireAuth);

projectRouter.post('/', asyncHandler(createProject));
projectRouter.post('/:id/roadmap', asyncHandler(generateRoadmap));
projectRouter.post('/:id/stack-advice', asyncHandler(generateStackAdvice));
projectRouter.get('/:id/documents', asyncHandler(listRoadmapDocuments));
projectRouter.get('/', asyncHandler(listProjects));
projectRouter.get('/:id', asyncHandler(getProject));
projectRouter.patch('/:id', asyncHandler(updateProject));
