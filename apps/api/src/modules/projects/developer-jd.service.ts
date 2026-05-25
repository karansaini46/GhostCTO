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

const developerJdDocumentType = 'DEVELOPER_JD';

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

const toDocumentTitle = (roleTitle: string) => `Developer Job Description: ${roleTitle}`;

export const createDeveloperJdForUser = async (userId: string, projectId: string) => {
  const project = await getProjectForUser(userId, projectId);
  await enforceDailyGenerationLimitForUser(userId);
  const promptContext = toProjectPromptContext(project);
  const provider = getModelProvider();
  const schema = getGhostctoModuleSchema('developer_job_description');
  const prompt = buildGhostctoModulePrompt('developer_job_description', promptContext);
  const generatedAt = new Date();
  const generation = await provider.generateStructured({
    maxOutputTokens: 10000,
    modelTier: 'quality',
    prompt,
    requestName: 'projects.developerJd.create',
    schema,
  });

  const document = await createVersionedGeneratedDocument(prisma, {
    completedAt: generatedAt,
    content: generation.data.reportMarkdown,
    metadata: {
      developerJobDescription: generation.data,
      generatedAt: generatedAt.toISOString(),
      moduleType: generation.data.moduleType,
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
    summary: generation.data.roleSummary,
    title: toDocumentTitle(generation.data.roleTitle),
    type: developerJdDocumentType,
    userId,
  });

  return {
    developerJobDescription: generation.data,
    document: serializeGeneratedDocument(document),
  };
};
