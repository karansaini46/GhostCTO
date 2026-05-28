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
import type { VettingRequestInput } from './project.schemas.js';

const vettingScorecardType = 'vetting_scorecard';
const vettingScorecardTitle = 'Vetting Scorecard';

const projectWorkspaceInclude = {
  answers: {
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.ProjectInclude;

type ProjectWorkspace = Prisma.ProjectGetPayload<{ include: typeof projectWorkspaceInclude }>;

type VettingReportRecord = Prisma.VettingReportGetPayload<{
  select: {
    completedAt: true;
    createdAt: true;
    criteria: true;
    id: true;
    metadata: true;
    projectId: true;
    result: true;
    status: true;
    subjectName: true;
    summary: true;
    type: true;
    updatedAt: true;
  };
}>;

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

const toVettingPromptAnswers = (input: VettingRequestInput): ProjectPromptAnswer[] => [
  {
    answer: input.subjectName,
    key: 'subjectName',
    label: 'Person or agency name',
  },
  {
    answer: input.websiteUrl ?? 'Not provided',
    key: 'websiteUrl',
    label: 'Website URL',
  },
  {
    answer: input.proposalText,
    key: 'proposalText',
    label: 'Pasted proposal',
  },
  {
    answer: input.portfolioText,
    key: 'portfolioText',
    label: 'Portfolio or profile text',
  },
  {
    answer: input.founderConcern,
    key: 'founderConcern',
    label: 'Founder concern',
  },
];

const toProjectPromptContext = (
  project: ProjectWorkspace,
  input: VettingRequestInput,
): ProjectPromptContext => ({
  answers: [...toProjectPromptAnswers(project), ...toVettingPromptAnswers(input)],
  biggestConcern: input.founderConcern || project.biggestConcern,
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

const serializeVettingReport = (report: VettingReportRecord) => ({
  completedAt: report.completedAt?.toISOString() ?? null,
  createdAt: report.createdAt.toISOString(),
  criteria: report.criteria,
  id: report.id,
  metadata: report.metadata,
  projectId: report.projectId,
  result: report.result,
  status: report.status,
  subjectName: report.subjectName,
  summary: report.summary,
  type: report.type,
  updatedAt: report.updatedAt.toISOString(),
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

const buildSummary = (subjectName: string, score: number, recommendation: string) =>
  `${subjectName} scored ${score}/10. Final recommendation: ${recommendation.replace(/_/g, ' ')}.`;

export const generateVettingScorecardForUser = async (
  userId: string,
  projectId: string,
  input: VettingRequestInput,
) => {
  const project = await getProjectForUser(userId, projectId);
  await enforceDailyGenerationLimitForUser(userId);
  const promptContext = toProjectPromptContext(project, input);
  const provider = getModelProvider();
  const schema = getGhostctoModuleSchema('vetting_scorecard');
  const prompt = buildGhostctoModulePrompt('vetting_scorecard', promptContext);
  const generatedAt = new Date();
  const generation = await provider.generateStructured({
    maxOutputTokens: 12288,
    prompt,
    requestName: 'projects.vetting.generate',
    schema,
  });
  const summary = buildSummary(
    input.subjectName,
    generation.data.overallScore,
    generation.data.finalRecommendation,
  );
  const usage = generation.usage
    ? {
        inputTokens: generation.usage.inputTokens ?? null,
        outputTokens: generation.usage.outputTokens ?? null,
        totalTokens: generation.usage.totalTokens ?? null,
      }
    : null;

  const { document, vettingReport } = await prisma.$transaction(async (transaction) => {
    const vettingReportRecord = await transaction.vettingReport.create({
      data: {
        completedAt: generatedAt,
        criteria: generation.data.criteria,
        metadata: {
          generatedAt: generatedAt.toISOString(),
          moduleType: generation.data.moduleType,
          request: input,
          usage,
          websiteUrl: input.websiteUrl,
        },
        projectId: project.id,
        result: generation.data,
        status: 'COMPLETED',
        subjectName: input.subjectName,
        summary,
        type: vettingScorecardType,
        userId,
      },
      select: {
        completedAt: true,
        createdAt: true,
        criteria: true,
        id: true,
        metadata: true,
        projectId: true,
        result: true,
        status: true,
        subjectName: true,
        summary: true,
        type: true,
        updatedAt: true,
      },
    });

    const generatedDocument = await createVersionedGeneratedDocument(transaction, {
      completedAt: generatedAt,
      content: generation.data.reportMarkdown,
      metadata: {
        generatedAt: generatedAt.toISOString(),
        moduleType: generation.data.moduleType,
        request: input,
        usage,
        vettingReportId: vettingReportRecord.id,
        vettingScorecard: generation.data,
      },
      projectId: project.id,
      status: 'COMPLETED',
      summary,
      title: vettingScorecardTitle,
      type: vettingScorecardType,
      userId,
    });

    return {
      document: generatedDocument,
      vettingReport: vettingReportRecord,
    };
  });

  return {
    document: serializeGeneratedDocument(document),
    vettingReport: serializeVettingReport(vettingReport),
    vettingScorecard: generation.data,
  };
};
