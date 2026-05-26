import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { ApiError } from '../../lib/api-error.js';
import { getModelProvider } from '../../services/model-provider/index.js';
import {
  buildGhostctoModulePrompt,
  getGhostctoModuleSchema,
  type ProjectPromptAnswer,
  type ProjectPromptContext,
} from '../../services/prompts/index.js';
import {
  createVersionedGeneratedDocument,
  serializeGeneratedDocument,
} from './document-history.service.js';
import { enforceDailyGenerationLimitForUser } from './generation-usage.service.js';
import type { StackAdviceOverridesInput } from './project.schemas.js';

const stackAdviceDocumentType = 'stack_advisor';
const stackAdviceDocumentTitle = 'Stack Advisor';

const projectWorkspaceInclude = {
  answers: {
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.ProjectInclude;

type ProjectWorkspace = Prisma.ProjectGetPayload<{ include: typeof projectWorkspaceInclude }>;

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
  complianceSensitivity: null,
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
  speedPriority: null,
  targetCustomer: project.targetCustomer,
  targetScale: null,
});

const applyStackAdviceOverrides = (
  context: ProjectPromptContext,
  overrides: StackAdviceOverridesInput,
): ProjectPromptContext => ({
  ...context,
  budgetRange: overrides.budgetRange ?? context.budgetRange,
  complianceSensitivity: overrides.complianceSensitivity ?? context.complianceSensitivity,
  founderTechnicalLevel: overrides.founderTechnicalLevel ?? context.founderTechnicalLevel,
  speedPriority: overrides.speedPriority ?? context.speedPriority,
  targetScale: overrides.targetScale ?? context.targetScale,
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

export const generateStackAdviceForUser = async (
  userId: string,
  projectId: string,
  overrides: StackAdviceOverridesInput = {},
) => {
  const project = await getProjectForUser(userId, projectId);
  await enforceDailyGenerationLimitForUser(userId);
  const promptContext = applyStackAdviceOverrides(toProjectPromptContext(project), overrides);
  const provider = getModelProvider();
  const schema = getGhostctoModuleSchema('stack_advice');
  const prompt = buildGhostctoModulePrompt('stack_advice', promptContext);
  const generatedAt = new Date();
  const generation = await provider.generateStructured({
    maxOutputTokens: 8192,
    prompt,
    requestName: 'projects.stackAdvice.generate',
    schema,
  });

  const document = await createVersionedGeneratedDocument(prisma, {
    completedAt: generatedAt,
    content: generation.data.reportMarkdown,
    metadata: {
      generatedAt: generatedAt.toISOString(),
      moduleType: generation.data.moduleType,
      requestOverrides: overrides,
      stackAdvice: generation.data,
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
    summary: generation.data.executiveSummary,
    title: stackAdviceDocumentTitle,
    type: stackAdviceDocumentType,
    userId,
  });

  return {
    document: serializeGeneratedDocument(document),
    stackAdvice: generation.data,
  };
};
