import { z } from 'zod';

import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { ApiError } from '../../lib/api-error.js';
import { getModelProvider } from '../../services/model-provider/index.js';
import {
  buildStructuredPrompt,
  type ProjectPromptAnswer,
  type ProjectPromptContext,
} from '../../services/prompts/index.js';
import {
  createVersionedGeneratedDocument,
  serializeGeneratedDocument,
} from './document-history.service.js';
import { enforceDailyGenerationLimitForUser } from './generation-usage.service.js';
import type { TechnicalSpecRequestInput } from './project.schemas.js';

const technicalSpecDocumentType = 'TECH_SPEC';

const projectWorkspaceInclude = {
  answers: {
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.ProjectInclude;

type ProjectWorkspace = Prisma.ProjectGetPayload<{ include: typeof projectWorkspaceInclude }>;

const nonEmptyText = (label: string, maxLength = 320) =>
  z.string().trim().min(1, `${label} is required.`).max(maxLength, `${label} is too long.`);

const featureOverviewSchema = z
  .object({
    goal: nonEmptyText('Feature goal', 360),
    priorityRationale: nonEmptyText('Priority rationale', 360),
    problem: nonEmptyText('Feature problem', 360),
    summary: nonEmptyText('Feature overview summary', 720),
  })
  .strict();

const userStorySchema = z
  .object({
    actor: nonEmptyText('User story actor', 140),
    benefit: nonEmptyText('User story benefit', 240),
    goal: nonEmptyText('User story goal', 240),
    story: nonEmptyText('User story', 320),
  })
  .strict();

const userFlowSchema = z
  .object({
    actor: nonEmptyText('User flow actor', 140),
    failureHandling: nonEmptyText('User flow failure handling', 320),
    steps: z.array(nonEmptyText('User flow step', 220)).min(2).max(12),
    successOutcome: nonEmptyText('User flow success outcome', 260),
    title: nonEmptyText('User flow title', 140),
  })
  .strict();

const apiEndpointSchema = z
  .object({
    auth: nonEmptyText('API auth requirement', 160),
    errorStates: z.array(nonEmptyText('Endpoint error state', 240)).min(1).max(8),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    path: nonEmptyText('API path', 180),
    purpose: nonEmptyText('API purpose', 260),
    requestBody: z.array(nonEmptyText('Request body field', 220)).max(12),
    requestExample: z.string().trim().min(2).max(2400),
    responseBody: z.array(nonEmptyText('Response body field', 220)).min(1).max(12),
    responseExample: z.string().trim().min(2).max(2400),
  })
  .strict();

const databaseChangeSchema = z
  .object({
    changeType: z.enum(['create', 'update', 'delete', 'none']),
    entity: nonEmptyText('Database entity', 160),
    fields: z.array(nonEmptyText('Database field', 220)).max(12),
    migrationNotes: nonEmptyText('Migration notes', 360),
    relationships: z.array(nonEmptyText('Database relationship', 220)).max(8),
  })
  .strict();

const permissionSchema = z
  .object({
    actor: nonEmptyText('Permission actor', 140),
    accessLevel: z.enum(['none', 'read', 'write', 'owner', 'admin']),
    enforcement: nonEmptyText('Permission enforcement', 320),
    requirement: nonEmptyText('Permission requirement', 260),
  })
  .strict();

const edgeCaseSchema = z
  .object({
    case: nonEmptyText('Edge case', 240),
    expectedBehavior: nonEmptyText('Expected behavior', 320),
    handling: nonEmptyText('Edge case handling', 320),
  })
  .strict();

const errorStateSchema = z
  .object({
    condition: nonEmptyText('Error condition', 240),
    message: nonEmptyText('Error message', 220),
    recovery: nonEmptyText('Error recovery', 320),
    statusCode: z.string().trim().min(1).max(40).optional().nullable(),
  })
  .strict();

const analyticsEventSchema = z
  .object({
    eventName: nonEmptyText('Analytics event name', 120),
    properties: z.array(nonEmptyText('Analytics property', 160)).max(12),
    purpose: nonEmptyText('Analytics event purpose', 260),
    trigger: nonEmptyText('Analytics event trigger', 240),
  })
  .strict();

const acceptanceCriterionSchema = z
  .object({
    criterion: nonEmptyText('Acceptance criterion', 260),
    verification: nonEmptyText('Acceptance verification', 260),
  })
  .strict();

const testCaseSchema = z
  .object({
    expectedResult: nonEmptyText('Expected result', 320),
    scenario: nonEmptyText('Test scenario', 260),
    steps: z.array(nonEmptyText('Test step', 220)).min(1).max(10),
    testType: z.enum(['unit', 'integration', 'end_to_end', 'manual']),
  })
  .strict();

const implementationStepSchema = z
  .object({
    dependencies: z.array(nonEmptyText('Implementation dependency', 180)).max(6),
    order: z.number().int().min(1).max(30),
    title: nonEmptyText('Implementation step title', 140),
    verification: nonEmptyText('Implementation verification', 260),
    work: nonEmptyText('Implementation work', 360),
  })
  .strict();

const assumptionSchema = z
  .object({
    reason: nonEmptyText('Assumption reason', 280),
    text: nonEmptyText('Assumption', 240),
  })
  .strict();

const technicalSpecOutputSchema = z
  .object({
    acceptanceCriteria: z.array(acceptanceCriterionSchema).min(4).max(14),
    analyticsEvents: z.array(analyticsEventSchema).min(1).max(8),
    apiEndpoints: z.array(apiEndpointSchema).min(1).max(12),
    assumptions: z.array(assumptionSchema).min(1).max(8),
    databaseChanges: z.array(databaseChangeSchema).min(1).max(12),
    edgeCases: z.array(edgeCaseSchema).min(3).max(12),
    errorStates: z.array(errorStateSchema).min(3).max(12),
    featureOverview: featureOverviewSchema,
    implementationSequence: z.array(implementationStepSchema).min(3).max(12),
    moduleType: z.literal(technicalSpecDocumentType),
    outOfScope: z.array(nonEmptyText('Out-of-scope item', 240)).min(2).max(12),
    permissions: z.array(permissionSchema).min(1).max(8),
    reportMarkdown: z.string().trim().min(1).max(50000),
    testCases: z.array(testCaseSchema).min(4).max(16),
    userFlows: z.array(userFlowSchema).min(2).max(8),
    userStories: z.array(userStorySchema).min(3).max(12),
  })
  .strict();

const toStringArray = (value: Prisma.JsonValue): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
};

const toProjectPromptAnswers = (project: ProjectWorkspace): ProjectPromptAnswer[] =>
  project.answers.map((answer) => ({
    answer: answer.answer,
    key: answer.key,
    label: answer.label,
  }));

const toProjectPromptContext = (project: ProjectWorkspace): ProjectPromptContext => ({
  answers: toProjectPromptAnswers(project),
  biggestConcern: project.biggestConcern,
  budgetRange: project.budgetRange,
  currentStage: project.currentStage,
  existingAssets: toStringArray(project.existingAssets),
  founderTechnicalLevel: project.founderTechnicalLevel,
  ideaSummary: project.ideaSummary,
  industry: project.industry,
  launchTimeline: project.launchTimeline,
  monetization: project.monetization,
  mustHaveFeatures: toStringArray(project.mustHaveFeatures),
  name: project.name,
  productType: project.productType,
  targetCustomer: project.targetCustomer,
});

const getProjectForUser = async (userId: string, projectId: string) => {
  const project = await prisma.project.findUnique({
    include: projectWorkspaceInclude,
    where: {
      id_userId: {
        id: projectId,
        userId,
      },
    },
  });

  if (!project) {
    throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  }

  return project;
};

const formatList = (items: string[]) =>
  items.length ? items.map((item) => `- ${item}`).join('\n') : '- None provided.';

const buildTechnicalSpecPrompt = (
  project: ProjectPromptContext,
  input: TechnicalSpecRequestInput,
) =>
  buildStructuredPrompt({
    project,
    requirements: [
      'Use the feature request as the scope boundary. Do not expand the feature beyond the stated description, constraints, and project context.',
      'The markdown report must include these headings: Feature overview, User stories, User flows, API endpoints, Request and response examples, Database changes, Permissions, Edge cases, Error states, Analytics events, Acceptance criteria, Test cases, Implementation sequence, Out of scope, Assumptions.',
      'Do not use vague statements such as "handle appropriately", "as needed", "etc.", "TBD", or "future improvements" without a concrete decision.',
      'Do not add new services, database entities, background jobs, third-party integrations, or workflow branches unless they are required by the feature description or project context.',
      'Every API endpoint must include method, path, auth, purpose, request fields, response fields, request JSON example, response JSON example, and endpoint error states.',
      'Every database change must identify the entity, change type, fields, relationships, and migration notes. If no database change is needed, include one databaseChanges item with changeType "none" and explain why.',
      'Every acceptance criterion and test case must be objectively verifiable.',
      'Write for a developer handoff. Use precise implementation language and avoid founder strategy language.',
    ],
    schemaDescription:
      'Return { moduleType: "TECH_SPEC", reportMarkdown, featureOverview, userStories, userFlows, apiEndpoints, databaseChanges, permissions, edgeCases, errorStates, analyticsEvents, acceptanceCriteria, testCases, implementationSequence, outOfScope, assumptions }. Request and response examples must be valid JSON strings.',
    schemaName: 'FeatureTechnicalSpecOutput',
    task: [
      'Create a build-ready technical specification for this feature.',
      '',
      'Feature request:',
      `- Feature name: ${input.featureName}`,
      `- Priority: ${input.priority}`,
      `- Feature description: ${input.featureDescription}`,
      '',
      'Constraints:',
      formatList(input.constraints),
      '',
      'Existing system notes:',
      formatList(input.existingSystemNotes),
    ].join('\n'),
  });

export const generateTechnicalSpecForUser = async (
  userId: string,
  projectId: string,
  input: TechnicalSpecRequestInput,
) => {
  const project = await getProjectForUser(userId, projectId);
  await enforceDailyGenerationLimitForUser(userId);
  const promptContext = toProjectPromptContext(project);
  const provider = getModelProvider();
  const prompt = buildTechnicalSpecPrompt(promptContext, input);
  const generatedAt = new Date();
  const generation = await provider.generateStructured({
    maxOutputTokens: 12288,
    modelTier: 'quality',
    prompt,
    requestName: 'projects.technicalSpec.generate',
    schema: technicalSpecOutputSchema,
  });

  const document = await createVersionedGeneratedDocument(prisma, {
    completedAt: generatedAt,
    content: generation.data.reportMarkdown,
    metadata: {
      generatedAt: generatedAt.toISOString(),
      request: input,
      technicalSpec: generation.data,
      usage: generation.usage
        ? {
            inputTokens: generation.usage.inputTokens ?? null,
            outputTokens: generation.usage.outputTokens ?? null,
            totalTokens: generation.usage.totalTokens ?? null,
          }
        : null,
    },
    projectId: project.id,
    status: 'COMPLETED',
    summary: generation.data.featureOverview.summary,
    title: `Technical Spec: ${input.featureName}`,
    type: technicalSpecDocumentType,
    userId,
  });

  return {
    document: serializeGeneratedDocument(document),
    technicalSpec: generation.data,
  };
};
