import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { prisma } from '../../infrastructure/database/prisma.js';
import { app, createProject, createSession } from '../../test/helpers.js';

describe('project document routes', () => {
  it('lists and fetches documents for the owning user', async () => {
    const owner = await createSession('owner');
    const { project } = await createProject(owner);
    const document = await prisma.generatedDocument.create({
      data: {
        completedAt: new Date(),
        content: '# Roadmap\n\nFounder-focused execution plan.',
        metadata: {
          source: 'test',
        },
        projectId: project.id,
        status: 'COMPLETED',
        summary: 'Execution plan summary.',
        title: 'Technical Roadmap',
        type: 'roadmap',
        userId: owner.user.id,
      },
    });

    const listResponse = await request(app)
      .get(`/projects/${project.id}/documents`)
      .set(owner.authHeader)
      .expect(200);

    expect(listResponse.body.documents).toHaveLength(1);
    expect(listResponse.body.documents[0]).toMatchObject({
      id: document.id,
      projectId: project.id,
      title: 'Technical Roadmap',
      type: 'roadmap',
    });

    const getResponse = await request(app)
      .get(`/projects/${project.id}/documents/${document.id}`)
      .set(owner.authHeader)
      .expect(200);

    expect(getResponse.body.document).toMatchObject({
      content: '# Roadmap\n\nFounder-focused execution plan.',
      id: document.id,
      title: 'Technical Roadmap',
    });
  });

  it('blocks document access across account boundaries', async () => {
    const owner = await createSession('owner');
    const other = await createSession('other');
    const { project: ownerProject } = await createProject(owner);
    const { project: otherProject } = await createProject(other);
    const document = await prisma.generatedDocument.create({
      data: {
        completedAt: new Date(),
        content: '# Private Document',
        metadata: {},
        projectId: ownerProject.id,
        status: 'COMPLETED',
        summary: 'Private founder plan.',
        title: 'Private Roadmap',
        type: 'roadmap',
        userId: owner.user.id,
      },
    });

    await request(app)
      .get(`/projects/${ownerProject.id}/documents`)
      .set(other.authHeader)
      .expect(404);

    await request(app)
      .get(`/projects/${ownerProject.id}/documents/${document.id}`)
      .set(other.authHeader)
      .expect(404);

    await request(app)
      .get(`/projects/${otherProject.id}/documents/${document.id}`)
      .set(other.authHeader)
      .expect(404);
  });

  it('stores feedback for a project document owned by the user', async () => {
    const owner = await createSession('feedback-owner');
    const other = await createSession('feedback-other');
    const { project } = await createProject(owner);
    const document = await prisma.generatedDocument.create({
      data: {
        completedAt: new Date(),
        content: '# Stack Advice',
        metadata: {},
        projectId: project.id,
        status: 'COMPLETED',
        summary: 'Stack choice summary.',
        title: 'Stack Advisor',
        type: 'stack_advisor',
        userId: owner.user.id,
      },
    });

    await request(app)
      .post(`/projects/${project.id}/documents/${document.id}/feedback`)
      .set(other.authHeader)
      .send({
        comment: 'This should not be accepted.',
        issueType: 'OTHER',
        usefulness: 'WRONG',
      })
      .expect(404);

    const feedbackResponse = await request(app)
      .post(`/projects/${project.id}/documents/${document.id}/feedback`)
      .set(owner.authHeader)
      .send({
        comment: 'Useful enough to send to a vendor.',
        usefulness: 'USEFUL',
      })
      .expect(201);

    expect(feedbackResponse.body.feedback).toMatchObject({
      comment: 'Useful enough to send to a vendor.',
      documentId: document.id,
      documentType: 'stack_advisor',
      issueType: null,
      projectId: project.id,
      rating: 3,
      usefulness: 'USEFUL',
    });

    const updateResponse = await request(app)
      .post(`/projects/${project.id}/documents/${document.id}/feedback`)
      .set(owner.authHeader)
      .send({
        comment: 'The recommendation missed one constraint.',
        issueType: 'MISSING_CONTEXT',
        usefulness: 'NEEDS_WORK',
      })
      .expect(201);

    expect(updateResponse.body.feedback).toMatchObject({
      comment: 'The recommendation missed one constraint.',
      id: feedbackResponse.body.feedback.id,
      issueType: 'MISSING_CONTEXT',
      rating: 2,
      usefulness: 'NEEDS_WORK',
    });

    const listResponse = await request(app)
      .get(`/projects/${project.id}/documents`)
      .set(owner.authHeader)
      .expect(200);

    expect(listResponse.body.documents[0].feedback).toMatchObject({
      id: feedbackResponse.body.feedback.id,
      issueType: 'MISSING_CONTEXT',
      rating: 2,
      usefulness: 'NEEDS_WORK',
    });
  });
});
