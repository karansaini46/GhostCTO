import request from 'supertest';
import { expect } from 'vitest';

import { createApp } from '../core/app.js';
import type { SafeUser } from '../modules/auth/auth.types.js';
import type { ProjectPayloadInput } from '../modules/projects/project.schemas.js';

export const app = createApp();

export const testPassword = 'founder-test-password';

let emailCounter = 0;

export const uniqueEmail = (prefix = 'founder') => {
  emailCounter += 1;

  return `${prefix}.${Date.now()}.${emailCounter}@example.com`;
};

export type TestSession = {
  accessToken: string;
  authHeader: { Authorization: string };
  user: SafeUser;
};

export const createSession = async (prefix?: string): Promise<TestSession> => {
  const email = uniqueEmail(prefix);
  const response = await request(app)
    .post('/auth/register')
    .send({
      email,
      name: 'Test Founder',
      password: testPassword,
    })
    .expect(201);

  const accessToken = response.body.accessToken as string;

  expect(accessToken).toEqual(expect.any(String));

  return {
    accessToken,
    authHeader: {
      Authorization: `Bearer ${accessToken}`,
    },
    user: response.body.user as SafeUser,
  };
};

export const buildProjectPayload = (
  overrides: Partial<ProjectPayloadInput> = {},
): ProjectPayloadInput => ({
  biggestConcern:
    'The largest risk is paying for a broad build before customers validate the first workflow.',
  budgetRange: '15000_50000',
  currentStage: 'validating',
  existingAssets: ['customer_interviews'],
  founderTechnicalLevel: 'non_technical',
  ideaSummary:
    'A founder operations workspace that helps early teams compare vendor proposals, document product scope, and make confident budget decisions before hiring technical help.',
  industry: 'B2B operations',
  launchTimeline: '8_to_12_weeks',
  monetization: 'subscription',
  mustHaveFeatures: [
    'Founder uploads vendor proposals and sees major scope risks before signing.',
    'Team tracks launch-critical features with enough detail for delivery planning.',
    'Founder exports a concise decision memo for advisors and contractors.',
  ],
  name: 'Vendor Trust Platform',
  productType: 'saas',
  targetCustomer:
    'Non-technical startup founders comparing contractors or agencies while trying to protect runway and avoid unclear delivery commitments.',
  ...overrides,
});

export const createProject = async (
  session: TestSession,
  overrides: Partial<ProjectPayloadInput> = {},
) => {
  const payload = buildProjectPayload(overrides);
  const response = await request(app)
    .post('/projects')
    .set(session.authHeader)
    .send(payload)
    .expect(201);

  return {
    payload,
    project: response.body.project,
  };
};
