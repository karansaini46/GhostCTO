import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { prisma } from '../../infrastructure/database/prisma.js';
import { app, createProject, createSession } from '../../test/helpers.js';

describe('admin routes', () => {
  it('returns average document feedback rating by document type', async () => {
    const admin = await createSession('admin-feedback');
    await prisma.user.update({
      data: { role: 'ADMIN' },
      where: { id: admin.user.id },
    });

    const founder = await createSession('founder-feedback');
    const { project } = await createProject(founder);
    const roadmap = await prisma.generatedDocument.create({
      data: {
        completedAt: new Date(),
        content: '# Roadmap',
        metadata: {},
        projectId: project.id,
        status: 'COMPLETED',
        summary: 'Roadmap summary.',
        title: 'Roadmap',
        type: 'roadmap',
        userId: founder.user.id,
      },
    });
    const spec = await prisma.generatedDocument.create({
      data: {
        completedAt: new Date(),
        content: '# Spec',
        metadata: {},
        projectId: project.id,
        status: 'COMPLETED',
        summary: 'Spec summary.',
        title: 'Spec',
        type: 'technical_spec',
        userId: founder.user.id,
      },
    });

    await prisma.$transaction([
      prisma.generatedDocumentFeedback.create({
        data: {
          comment: 'Clear enough to use.',
          documentId: roadmap.id,
          documentType: 'roadmap',
          issueType: null,
          projectId: project.id,
          rating: 3,
          usefulness: 'USEFUL',
          userId: founder.user.id,
        },
      }),
      prisma.generatedDocumentFeedback.create({
        data: {
          comment: 'Missing a critical acceptance rule.',
          documentId: spec.id,
          documentType: 'technical_spec',
          issueType: 'MISSING_DETAIL',
          projectId: project.id,
          rating: 1,
          usefulness: 'WRONG',
          userId: founder.user.id,
        },
      }),
    ]);

    const response = await request(app).get('/admin/stats').set(admin.authHeader).expect(200);

    expect(response.body.stats.documentFeedbackAverages).toEqual(
      expect.arrayContaining([
        {
          averageRating: 3,
          documentType: 'roadmap',
          feedbackCount: 1,
        },
        {
          averageRating: 1,
          documentType: 'technical_spec',
          feedbackCount: 1,
        },
      ]),
    );
  });
});
