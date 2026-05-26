import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import {
  setModelProviderForTesting,
  type ModelProvider,
} from '../../services/model-provider/index.js';
import { app, createProject, createSession } from '../../test/helpers.js';

const categories = [
  'frontend',
  'backend',
  'database',
  'auth',
  'hosting',
  'payments',
  'analytics',
  'email',
  'file_storage',
  'monitoring',
] as const;

const buildStackAdviceFixture = () => ({
  assumptions: [
    {
      reason: 'The founder is still validating demand.',
      text: 'The first build should keep operational complexity low.',
    },
  ],
  cards: [
    {
      detail: 'Use familiar managed services where possible.',
      title: 'Delivery posture',
      tone: 'positive',
      value: 'MVP-ready stack',
    },
    {
      detail: 'Delay nonessential infrastructure until revenue proves the workflow.',
      title: 'Cost posture',
      tone: 'warning',
      value: 'Control fixed costs',
    },
  ],
  categories: categories.map((category) => ({
    category,
    commonAlternative: 'Custom platform assembled from multiple unmanaged services.',
    costRisk: 'The main cost risk is adding services before usage justifies them.',
    costRiskLevel: 'low',
    founderExplanation: `Use a practical ${category} choice that a small team can operate.`,
    operationalComplexity: 'Operational overhead remains manageable for a founder-led team.',
    operationalComplexityLevel: 'low',
    recommendation: `Managed ${category} option`,
    whyItFits: 'It keeps launch scope focused while preserving room to scale.',
    whyNotCommonAlternative: 'The alternative adds coordination cost before the product needs it.',
  })),
  executiveSummary:
    'Use a focused managed stack that lets the founder validate the core workflow without hiring a large technical team.',
  moduleType: 'STACK_ADVICE',
  nextSteps: [
    {
      action: 'Confirm the launch workflow before adding secondary integrations.',
      reason: 'The workflow drives the stack decisions that matter most.',
    },
    {
      action: 'Choose managed services with clear ownership and export paths.',
      reason: 'This reduces vendor and maintenance risk for a small team.',
    },
  ],
  recommendation:
    'Start with a conservative managed stack, keep the data model simple, and revisit infrastructure after paid usage appears.',
  reportMarkdown: '# Stack Advice\n\nUse a focused managed stack for the first launch.',
  risks: [
    {
      impact: 'Extra infrastructure could slow launch and consume budget.',
      mitigation: 'Limit the first release to services directly tied to revenue validation.',
      risk: 'Overbuilding before validation.',
    },
  ],
  scaleView:
    'This stack should support early usage and can be revisited once the product has repeatable customer demand.',
  teamAssumption:
    'A founder and one full-stack contractor can operate this setup during the first launch window.',
});

const createMockProvider = () => {
  const provider: ModelProvider = {
    generateStructured: vi.fn(async (input) => {
      const data = input.schema.parse(buildStackAdviceFixture());

      return {
        attempts: 1,
        data,
        text: JSON.stringify(data),
        usage: {
          inputTokens: 100,
          outputTokens: 200,
          totalTokens: 300,
        },
      };
    }),
    generateText: vi.fn(),
  };

  return provider;
};

describe('generation routes', () => {
  it('generates stack advice with a mocked model provider', async () => {
    const session = await createSession('owner');
    const { project } = await createProject(session);
    const provider = createMockProvider();

    setModelProviderForTesting(provider);

    const response = await request(app)
      .post(`/projects/${project.id}/stack-advisor`)
      .set(session.authHeader)
      .send({
        complianceSensitivity: 'medium',
        speedPriority: 'high',
        targetScale: 'early_mvp',
      })
      .expect(201);

    expect(provider.generateStructured).toHaveBeenCalledTimes(1);
    expect(response.body.document).toMatchObject({
      content: '# Stack Advice\n\nUse a focused managed stack for the first launch.',
      projectId: project.id,
      status: 'COMPLETED',
      title: 'Stack Advisor',
      type: 'stack_advisor',
      version: 1,
    });
    expect(response.body.stackAdvice.moduleType).toBe('STACK_ADVICE');
  });

  it('does not call the model provider for another user project', async () => {
    const owner = await createSession('owner');
    const other = await createSession('other');
    const { project } = await createProject(owner);
    const provider = createMockProvider();

    setModelProviderForTesting(provider);

    await request(app)
      .post(`/projects/${project.id}/stack-advisor`)
      .set(other.authHeader)
      .send({})
      .expect(404);

    expect(provider.generateStructured).not.toHaveBeenCalled();
  });

  it('rejects unexpected bodies on bodyless generation routes', async () => {
    const session = await createSession('owner');
    const { project } = await createProject(session);
    const provider = createMockProvider();

    setModelProviderForTesting(provider);

    await request(app)
      .post(`/projects/${project.id}/roadmap`)
      .set(session.authHeader)
      .send({
        unexpected: true,
      })
      .expect(400);

    await request(app)
      .post(`/projects/${project.id}/developer-jd`)
      .set(session.authHeader)
      .send({
        roleTitle: 'Full-stack developer',
      })
      .expect(400);

    expect(provider.generateStructured).not.toHaveBeenCalled();
  });
});
