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
import type { QuoteAnalysisRequestInput } from './project.schemas.js';

const quoteAnalysisType = 'QUOTE_ANALYSIS';
const quoteAnalysisDocumentTitle = 'Rate Validator';

const projectWorkspaceInclude = {
  answers: {
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.ProjectInclude;

type ProjectWorkspace = Prisma.ProjectGetPayload<{ include: typeof projectWorkspaceInclude }>;

type GeneratedQuoteAnalysisDocument = Prisma.GeneratedDocumentGetPayload<{
  select: {
    completedAt: true;
    content: true;
    createdAt: true;
    id: true;
    metadata: true;
    projectId: true;
    status: true;
    summary: true;
    title: true;
    type: true;
    updatedAt: true;
  };
}>;

type QuoteAnalysisRecord = Prisma.QuoteAnalysisGetPayload<{
  select: {
    completedAt: true;
    createdAt: true;
    currency: true;
    id: true;
    metadata: true;
    projectId: true;
    quoteAmount: true;
    result: true;
    status: true;
    summary: true;
    type: true;
    updatedAt: true;
    vendorName: true;
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

const toQuotePromptAnswers = (input: QuoteAnalysisRequestInput): ProjectPromptAnswer[] => [
  {
    answer: input.proposalText,
    key: 'proposalText',
    label: 'Pasted developer proposal text',
  },
  {
    answer: input.currency ?? 'Not provided',
    key: 'quoteCurrency',
    label: 'Quote currency',
  },
  {
    answer: input.countryMarket ?? 'Not provided',
    key: 'countryMarket',
    label: 'Country or market',
  },
  {
    answer: input.projectUrgency,
    key: 'projectUrgency',
    label: 'Project urgency',
  },
  {
    answer: input.deadline ?? 'Not provided',
    key: 'deadline',
    label: 'Founder deadline',
  },
  {
    answer: input.developerType,
    key: 'developerType',
    label: 'Developer type',
  },
];

const toProjectPromptContext = (
  project: ProjectWorkspace,
  input: QuoteAnalysisRequestInput,
): ProjectPromptContext => ({
  answers: [...toProjectPromptAnswers(project), ...toQuotePromptAnswers(input)],
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
  speedPriority:
    input.projectUrgency === 'urgent'
      ? 'high'
      : input.projectUrgency === 'flexible'
        ? 'low'
        : 'medium',
  targetCustomer: project.targetCustomer,
});

const normalizeDocumentType = (type: string) =>
  type === quoteAnalysisType ? 'rate_validator' : type;

const serializeGeneratedDocument = (document: GeneratedQuoteAnalysisDocument) => ({
  completedAt: document.completedAt?.toISOString() ?? null,
  content: document.content,
  createdAt: document.createdAt.toISOString(),
  id: document.id,
  metadata: document.metadata,
  projectId: document.projectId,
  status: document.status,
  summary: document.summary,
  title: document.title,
  type: normalizeDocumentType(document.type),
  updatedAt: document.updatedAt.toISOString(),
});

const serializeQuoteAnalysis = (quoteAnalysis: QuoteAnalysisRecord) => ({
  completedAt: quoteAnalysis.completedAt?.toISOString() ?? null,
  createdAt: quoteAnalysis.createdAt.toISOString(),
  currency: quoteAnalysis.currency,
  id: quoteAnalysis.id,
  metadata: quoteAnalysis.metadata,
  projectId: quoteAnalysis.projectId,
  quoteAmount: quoteAnalysis.quoteAmount?.toString() ?? null,
  result: quoteAnalysis.result,
  status: quoteAnalysis.status,
  summary: quoteAnalysis.summary,
  type: quoteAnalysis.type,
  updatedAt: quoteAnalysis.updatedAt.toISOString(),
  vendorName: quoteAnalysis.vendorName,
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

const toQuoteAmount = (amount: number | null) => (amount ? new Prisma.Decimal(amount) : null);

const toDocumentSummary = (verdict: string, confidenceLevel: string, riskScore: number) =>
  `${verdict.replace(/_/g, ' ')} verdict with ${confidenceLevel} confidence and ${riskScore}/100 risk score.`;

export const analyzeQuoteForUser = async (
  userId: string,
  projectId: string,
  input: QuoteAnalysisRequestInput,
) => {
  const project = await getProjectForUser(userId, projectId);
  const promptContext = toProjectPromptContext(project, input);
  const provider = getModelProvider();
  const schema = getGhostctoModuleSchema('quote_analysis');
  const prompt = buildGhostctoModulePrompt('quote_analysis', promptContext);
  const generatedAt = new Date();
  const generation = await provider.generateStructured({
    maxOutputTokens: 12288,
    prompt,
    requestName: 'projects.quoteAnalysis.analyze',
    schema,
  });
  const summary = toDocumentSummary(
    generation.data.priceFairnessVerdict.verdict,
    generation.data.priceFairnessVerdict.confidenceLevel,
    generation.data.riskScore,
  );
  const usage = generation.usage
    ? {
        inputTokens: generation.usage.inputTokens ?? null,
        outputTokens: generation.usage.outputTokens ?? null,
        totalTokens: generation.usage.totalTokens ?? null,
      }
    : null;

  const { document, quoteAnalysis } = await prisma.$transaction(async (transaction) => {
    const quoteAnalysisRecord = await transaction.quoteAnalysis.create({
      data: {
        completedAt: generatedAt,
        currency: input.currency ?? generation.data.quotedPrice.currency ?? null,
        metadata: {
          generatedAt: generatedAt.toISOString(),
          moduleType: generation.data.moduleType,
          request: input,
          usage,
        },
        projectId: project.id,
        quoteAmount: toQuoteAmount(generation.data.quotedPrice.amount),
        result: generation.data,
        status: 'COMPLETED',
        summary,
        type: quoteAnalysisType,
        userId,
      },
      select: {
        completedAt: true,
        createdAt: true,
        currency: true,
        id: true,
        metadata: true,
        projectId: true,
        quoteAmount: true,
        result: true,
        status: true,
        summary: true,
        type: true,
        updatedAt: true,
        vendorName: true,
      },
    });

    const generatedDocument = await transaction.generatedDocument.create({
      data: {
        completedAt: generatedAt,
        content: generation.data.reportMarkdown,
        metadata: {
          generatedAt: generatedAt.toISOString(),
          moduleType: generation.data.moduleType,
          quoteAnalysis: generation.data,
          quoteAnalysisId: quoteAnalysisRecord.id,
          request: input,
          usage,
        },
        projectId: project.id,
        status: 'COMPLETED',
        summary,
        title: quoteAnalysisDocumentTitle,
        type: quoteAnalysisType,
        userId,
      },
      select: {
        completedAt: true,
        content: true,
        createdAt: true,
        id: true,
        metadata: true,
        projectId: true,
        status: true,
        summary: true,
        title: true,
        type: true,
        updatedAt: true,
      },
    });

    return {
      document: generatedDocument,
      quoteAnalysis: quoteAnalysisRecord,
    };
  });

  return {
    document: serializeGeneratedDocument(document),
    quoteAnalysis: serializeQuoteAnalysis(quoteAnalysis),
    rateValidation: generation.data,
  };
};
