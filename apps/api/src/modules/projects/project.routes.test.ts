import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app, buildProjectPayload, createProject, createSession } from '../../test/helpers.js';

describe('project routes', () => {
  it('creates, reads, updates, lists, and deletes an owned project', async () => {
    const session = await createSession();
    const { payload, project } = await createProject(session);

    expect(project).toMatchObject({
      biggestConcern: payload.biggestConcern,
      name: payload.name,
      status: 'ACTIVE',
    });
    expect(project.answers).toHaveLength(13);

    const listResponse = await request(app).get('/projects').set(session.authHeader).expect(200);

    expect(listResponse.body.projects).toHaveLength(1);
    expect(listResponse.body.projects[0].id).toBe(project.id);

    const getResponse = await request(app)
      .get(`/projects/${project.id}`)
      .set(session.authHeader)
      .expect(200);

    expect(getResponse.body.project).toMatchObject({
      id: project.id,
      name: payload.name,
    });

    const updateResponse = await request(app)
      .patch(`/projects/${project.id}`)
      .set(session.authHeader)
      .send({
        name: 'Updated Vendor Platform',
      })
      .expect(200);

    expect(updateResponse.body.project.name).toBe('Updated Vendor Platform');

    const mismatch = await request(app)
      .delete(`/projects/${project.id}`)
      .set(session.authHeader)
      .send({
        confirmationName: payload.name,
      })
      .expect(400);

    expect(mismatch.body.error.code).toBe('PROJECT_DELETE_CONFIRMATION_MISMATCH');

    await request(app)
      .delete(`/projects/${project.id}`)
      .set(session.authHeader)
      .send({
        confirmationName: 'Updated Vendor Platform',
      })
      .expect(204);

    await request(app).get(`/projects/${project.id}`).set(session.authHeader).expect(404);
  });

  it('scopes project data to the authenticated user', async () => {
    const owner = await createSession('owner');
    const other = await createSession('other');
    const { project } = await createProject(owner);

    const otherList = await request(app).get('/projects').set(other.authHeader).expect(200);

    expect(otherList.body.projects).toEqual([]);

    await request(app).get(`/projects/${project.id}`).set(other.authHeader).expect(404);

    await request(app)
      .patch(`/projects/${project.id}`)
      .set(other.authHeader)
      .send({
        name: 'Attempted Cross Account Update',
      })
      .expect(404);

    await request(app)
      .delete(`/projects/${project.id}`)
      .set(other.authHeader)
      .send({
        confirmationName: buildProjectPayload().name,
      })
      .expect(404);
  });

  it('requires authentication for project access', async () => {
    await request(app).get('/projects').expect(401);
    await request(app).post('/projects').send(buildProjectPayload()).expect(401);
  });
});
