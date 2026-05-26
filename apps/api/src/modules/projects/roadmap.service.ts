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
  generatedDocumentSelect,
  serializeGeneratedDocument,
} from './document-history.service.js';
import { enforceDailyGenerationLimitForUser } from './generation-usage.service.js';

const roadmapDocumentType = 'roadmap';
const roadmapDocumentTypes = ['roadmap', 'ROADMAP'];
const stackAdviceDocumentType = 'STACK_ADVICE';
const technicalSpecDocumentType = 'TECH_SPEC';
const quoteAnalysisDocumentType = 'QUOTE_ANALYSIS';
const codeAuditDocumentType = 'CODE_AUDIT';
const vettingScorecardDocumentType = 'VETTING_SCORECARD';
const developerJdDocumentTypes = ['DEVELOPER_JD', 'developer_jd', 'developer_job_description'];
const roadmapDocumentTitle = 'Technical Roadmap';

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

export const generateRoadmapForUser = async (userId: string, projectId: string) => {
  const project = await getProjectForUser(userId, projectId);
  await enforceDailyGenerationLimitForUser(userId);
  const promptContext = toProjectPromptContext(project);
  const provider = getModelProvider();
  const schema = getGhostctoModuleSchema('roadmap');
  const prompt = buildGhostctoModulePrompt('roadmap', promptContext);
  const generatedAt = new Date();
  const generation = await provider.generateStructured({
    maxOutputTokens: 8192,
    prompt,
    requestName: 'projects.roadmap.generate',
    schema,
  });

  const document = await createVersionedGeneratedDocument(prisma, {
    completedAt: generatedAt,
    content: generation.data.reportMarkdown,
    metadata: {
      generatedAt: generatedAt.toISOString(),
      moduleType: generation.data.moduleType,
      roadmap: generation.data,
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
    title: roadmapDocumentTitle,
    type: roadmapDocumentType,
    userId,
  });

  return {
    document: serializeGeneratedDocument(document),
    roadmap: generation.data,
  };
};

export const listRoadmapDocumentsForUser = async (
  userId: string,
  projectId: string,
  documentType:
    | 'code_audit'
    | 'developer_jd'
    | 'rate_validator'
    | 'roadmap'
    | 'stack_advisor'
    | 'technical_spec'
    | 'vetting_scorecard' = 'roadmap',
) => {
  await getProjectForUser(userId, projectId);
  let normalizedDocumentType: string | string[] = roadmapDocumentTypes;

  if (documentType === 'stack_advisor') {
    normalizedDocumentType = stackAdviceDocumentType;
  } else if (documentType === 'technical_spec') {
    normalizedDocumentType = technicalSpecDocumentType;
  } else if (documentType === 'rate_validator') {
    normalizedDocumentType = quoteAnalysisDocumentType;
  } else if (documentType === 'code_audit') {
    normalizedDocumentType = codeAuditDocumentType;
  } else if (documentType === 'vetting_scorecard') {
    normalizedDocumentType = vettingScorecardDocumentType;
  } else if (documentType === 'developer_jd') {
    normalizedDocumentType = developerJdDocumentTypes;
  }

  const documents = await prisma.generatedDocument.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    select: generatedDocumentSelect,
    where: {
      projectId,
      type: Array.isArray(normalizedDocumentType)
        ? {
            in: normalizedDocumentType,
          }
        : normalizedDocumentType,
      userId,
    },
  });

  return documents.map((document) => serializeGeneratedDocument(document));
};
