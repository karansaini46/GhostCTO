import { expect, test, type Page, type Route } from '@playwright/test';

const now = '2026-05-24T00:00:00.000Z';

const founder = {
  avatarUrl: null,
  createdAt: now,
  email: 'founder@example.com',
  id: 'user-1',
  name: 'Ava Founder',
  plan: 'FREE',
  role: 'FOUNDER',
  updatedAt: now,
};

const authSession = {
  accessToken: 'test-access-token',
  accessTokenExpiresAt: '2030-01-01T00:00:00.000Z',
  user: founder,
};

const billingStatus = {
  access: {
    canCreateProject: true,
    canGenerate: true,
    canUseChat: true,
  },
  limits: {
    chatMessages: 3,
    generations: 3,
    projects: 1,
  },
  plan: 'FREE',
  usage: {
    chatMessages: 0,
    generations: 0,
    projects: 0,
  },
};

const projectPayload = {
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
};

const documentRecord = {
  completedAt: now,
  content: '# Technical Roadmap\n\nPrioritize quote review, launch scope, and advisor handoff.',
  createdAt: now,
  id: 'document-1',
  metadata: {},
  projectId: 'project-1',
  status: 'COMPLETED',
  summary: 'Execution plan for validating the first revenue workflow.',
  title: 'Technical Roadmap',
  type: 'roadmap',
  updatedAt: now,
  version: 1,
};

const buildProject = (overrides: Record<string, unknown> = {}) => ({
  answers: [],
  documents: [],
  id: 'project-1',
  slug: 'vendor-trust-platform',
  status: 'ACTIVE',
  ...projectPayload,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

const fulfillJson = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    body: JSON.stringify(body),
    contentType: 'application/json',
    status,
  });

const mockUnauthenticatedBootstrap = async (page: Page) => {
  await page.route('**/auth/refresh', (route) =>
    fulfillJson(
      route,
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      },
      401,
    ),
  );
};

const mockAuthenticatedBootstrap = async (page: Page) => {
  await page.route('**/auth/refresh', (route) => fulfillJson(route, authSession));
  await page.route('**/billing/status', (route) =>
    fulfillJson(route, {
      billingStatus,
    }),
  );
};

test('login page signs in with email and shows failed login errors', async ({ page }) => {
  await mockUnauthenticatedBootstrap(page);
  await page.route('**/auth/login', (route) => {
    const payload = route.request().postDataJSON() as { email?: string };

    if (payload.email === 'wrong@example.com') {
      return fulfillJson(
        route,
        {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
          },
        },
        401,
      );
    }

    return fulfillJson(route, authSession);
  });
  await page.route('http://localhost:4000/projects', (route) =>
    fulfillJson(route, {
      projects: [],
    }),
  );

  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

  await page.getByLabel('Email').fill('wrong@example.com');
  await page.getByLabel('Password').fill('wrong-password-value');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByText('Invalid email or password.')).toBeVisible();

  await page.getByLabel('Email').fill(founder.email);
  await page.getByLabel('Password').fill('founder-test-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

test('dashboard renders authenticated workspace project data', async ({ page }) => {
  await mockAuthenticatedBootstrap(page);
  await page.route('http://localhost:4000/projects', (route) =>
    fulfillJson(route, {
      projects: [
        buildProject({
          documents: [documentRecord],
        }),
      ],
    }),
  );

  await page.goto('/workspace');

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Vendor Trust Platform/ })).toBeVisible();
  await expect(page.getByText('Active').first()).toBeVisible();
  await expect(page.getByText('Turn scope into a technical spec').first()).toBeVisible();
  await expect(page.getByText(founder.email)).toBeVisible();
});

test('project onboarding creates a project and opens its workspace', async ({ page }) => {
  await mockAuthenticatedBootstrap(page);
  let submittedPayload: unknown = null;

  await page.route('http://localhost:4000/projects', (route) => {
    if (route.request().method() === 'POST') {
      submittedPayload = route.request().postDataJSON();

      return fulfillJson(
        route,
        {
          project: buildProject(submittedPayload as Record<string, unknown>),
        },
        201,
      );
    }

    return fulfillJson(route, {
      projects: [],
    });
  });
  await page.route('http://localhost:4000/projects/project-1', (route) =>
    fulfillJson(route, {
      project: buildProject(submittedPayload as Record<string, unknown>),
    }),
  );

  await page.goto('/projects/new');

  await page.getByLabel('Project name').fill(projectPayload.name);
  await page.getByLabel('Idea summary').fill(projectPayload.ideaSummary);
  await page.getByLabel('Target customer').fill(projectPayload.targetCustomer);
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Industry').fill(projectPayload.industry);
  await page.getByLabel('Product type').selectOption(projectPayload.productType);
  await page.getByLabel('Monetization').selectOption(projectPayload.monetization);
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Current stage').selectOption(projectPayload.currentStage);
  await page.getByLabel('Budget range').selectOption(projectPayload.budgetRange);
  await page.getByLabel('Desired launch timeline').selectOption(projectPayload.launchTimeline);
  await page
    .getByLabel('Founder technical level')
    .selectOption(projectPayload.founderTechnicalLevel);
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Customer interviews').check();
  await page.getByLabel('Must-have features').fill(projectPayload.mustHaveFeatures.join('\n'));
  await page.getByLabel('Biggest concern').fill(projectPayload.biggestConcern);
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.waitForTimeout(500);

  const createProjectButton = page.getByRole('button', { name: 'Create project' });

  if (await createProjectButton.isVisible()) {
    await createProjectButton.click();
  }

  await expect(page).toHaveURL(/\/projects\/project-1$/);
  expect(submittedPayload).toMatchObject(projectPayload);
  await expect(page.getByRole('heading', { name: projectPayload.name })).toBeVisible();
});

test('document viewer renders project document content', async ({ page }) => {
  await mockAuthenticatedBootstrap(page);
  await page.route('http://localhost:4000/projects/project-1', (route) =>
    fulfillJson(route, {
      project: buildProject({
        documents: [documentRecord],
      }),
    }),
  );
  await page.route('http://localhost:4000/projects/project-1/documents/document-1', (route) =>
    fulfillJson(route, {
      document: documentRecord,
    }),
  );

  await page.goto('/projects/project-1/documents/document-1');

  await expect(page.getByRole('heading', { name: 'Technical Roadmap' })).toBeVisible();
  await expect(
    page.getByText('Execution plan for validating the first revenue workflow.'),
  ).toBeVisible();
  await expect(
    page.getByText('Prioritize quote review, launch scope, and advisor handoff.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export Markdown' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export PDF' })).toBeVisible();
});
