import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { ApiError } from '../../lib/api-error.js';
import type { ProjectPayloadInput, UpdateProjectPayloadInput } from './project.schemas.js';

const answerDefinitions = [
  { key: 'name', label: 'Project name', step: 'foundation' },
  { key: 'ideaSummary', label: 'Idea summary', step: 'foundation' },
  { key: 'targetCustomer', label: 'Target customer', step: 'foundation' },
  { key: 'industry', label: 'Industry', step: 'market' },
  { key: 'productType', label: 'Product type', step: 'market' },
  { key: 'monetization', label: 'Monetization', step: 'market' },
  { key: 'currentStage', label: 'Current stage', step: 'execution' },
  { key: 'budgetRange', label: 'Budget range', step: 'execution' },
  { key: 'launchTimeline', label: 'Launch timeline', step: 'execution' },
  { key: 'founderTechnicalLevel', label: 'Founder technical level', step: 'execution' },
  { key: 'existingAssets', label: 'Existing assets', step: 'context' },
  { key: 'mustHaveFeatures', label: 'Must-have features', step: 'context' },
  { key: 'biggestConcern', label: 'Biggest concern', step: 'context' },
] as const;

type AnswerKey = (typeof answerDefinitions)[number]['key'];
type ProjectAnswerInput = Partial<Record<AnswerKey, ProjectPayloadInput[AnswerKey]>>;

const projectInclude = {
  answers: {
    orderBy: {
      createdAt: 'asc',
    },
  },
  documents: {
    orderBy: {
      createdAt: 'desc',
    },
    take: 6,
  },
} satisfies Prisma.ProjectInclude;

type ProjectWithWorkspace = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

const slugify = (value: string): string => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 64);

  return slug || 'project';
};

const toStringArray = (value: Prisma.JsonValue): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
};

const normalizeDocumentType = (type: string) => {
  if (type === 'STACK_ADVICE') {
    return 'stack_advisor';
  }

  if (type === 'TECH_SPEC') {
    return 'technical_spec';
  }

  if (type === 'QUOTE_ANALYSIS') {
    return 'rate_validator';
  }

  if (type === 'CODE_AUDIT') {
    return 'code_audit';
  }

  return type;
};

const buildAnswerRecords = (userId: string, input: ProjectAnswerInput) =>
  answerDefinitions.flatMap((definition) => {
    const value = input[definition.key];

    if (value === undefined) {
      return [];
    }

    return {
      answer: value as Prisma.InputJsonValue,
      key: definition.key,
      label: definition.label,
      metadata: {
        onboardingVersion: 1,
        step: definition.step,
      },
      type: 'project_onboarding',
      userId,
    };
  });

const buildProjectCreateData = (userId: string, slug: string, input: ProjectPayloadInput) => ({
  biggestConcern: input.biggestConcern,
  budgetRange: input.budgetRange,
  context: {
    onboardingCompletedAt: new Date().toISOString(),
    onboardingVersion: 1,
  },
  currentStage: input.currentStage,
  existingAssets: input.existingAssets,
  founderTechnicalLevel: input.founderTechnicalLevel,
  ideaSummary: input.ideaSummary,
  industry: input.industry,
  launchTimeline: input.launchTimeline,
  monetization: input.monetization,
  mustHaveFeatures: input.mustHaveFeatures,
  name: input.name,
  productType: input.productType,
  slug,
  stage: input.currentStage,
  status: 'ACTIVE' as const,
  summary: input.ideaSummary,
  targetCustomer: input.targetCustomer,
  userId,
});

const buildProjectUpdateData = (input: UpdateProjectPayloadInput): Prisma.ProjectUpdateInput => {
  const data: Prisma.ProjectUpdateInput = {};

  if (input.biggestConcern !== undefined) {
    data.biggestConcern = input.biggestConcern;
  }

  if (input.budgetRange !== undefined) {
    data.budgetRange = input.budgetRange;
  }

  if (input.currentStage !== undefined) {
    data.currentStage = input.currentStage;
    data.stage = input.currentStage;
  }

  if (input.existingAssets !== undefined) {
    data.existingAssets = input.existingAssets;
  }

  if (input.founderTechnicalLevel !== undefined) {
    data.founderTechnicalLevel = input.founderTechnicalLevel;
  }

  if (input.ideaSummary !== undefined) {
    data.ideaSummary = input.ideaSummary;
    data.summary = input.ideaSummary;
  }

  if (input.industry !== undefined) {
    data.industry = input.industry;
  }

  if (input.launchTimeline !== undefined) {
    data.launchTimeline = input.launchTimeline;
  }

  if (input.monetization !== undefined) {
    data.monetization = input.monetization;
  }

  if (input.mustHaveFeatures !== undefined) {
    data.mustHaveFeatures = input.mustHaveFeatures;
  }

  if (input.name !== undefined) {
    data.name = input.name;
  }

  if (input.productType !== undefined) {
    data.productType = input.productType;
  }

  if (input.targetCustomer !== undefined) {
    data.targetCustomer = input.targetCustomer;
  }

  return data;
};

const toProjectResponse = (project: ProjectWithWorkspace) => ({
  answers: project.answers.map((answer) => ({
    answer: answer.answer,
    createdAt: answer.createdAt.toISOString(),
    id: answer.id,
    key: answer.key,
    label: answer.label,
    metadata: answer.metadata,
    type: answer.type,
    updatedAt: answer.updatedAt.toISOString(),
  })),
  biggestConcern: project.biggestConcern,
  budgetRange: project.budgetRange,
  createdAt: project.createdAt.toISOString(),
  currentStage: project.currentStage,
  documents: project.documents.map((document) => ({
    completedAt: document.completedAt?.toISOString() ?? null,
    createdAt: document.createdAt.toISOString(),
    content: document.content,
    id: document.id,
    metadata: document.metadata,
    status: document.status,
    summary: document.summary,
    title: document.title,
    type: normalizeDocumentType(document.type),
    updatedAt: document.updatedAt.toISOString(),
  })),
  existingAssets: toStringArray(project.existingAssets),
  founderTechnicalLevel: project.founderTechnicalLevel,
  id: project.id,
  ideaSummary: project.ideaSummary,
  industry: project.industry,
  launchTimeline: project.launchTimeline,
  monetization: project.monetization,
  mustHaveFeatures: toStringArray(project.mustHaveFeatures),
  name: project.name,
  productType: project.productType,
  slug: project.slug,
  status: project.status,
  targetCustomer: project.targetCustomer,
  updatedAt: project.updatedAt.toISOString(),
});

export const createProjectForUser = async (userId: string, input: ProjectPayloadInput) => {
  const project = await prisma.$transaction(async (transaction) => {
    const baseSlug = slugify(input.name);
    let slug = baseSlug;
    let suffix = 2;

    while (
      await transaction.project.findUnique({
        select: { id: true },
        where: {
          userId_slug: {
            slug,
            userId,
          },
        },
      })
    ) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return transaction.project.create({
      data: {
        ...buildProjectCreateData(userId, slug, input),
        answers: {
          create: buildAnswerRecords(userId, input),
        },
      },
      include: projectInclude,
    });
  });

  return toProjectResponse(project);
};

export const listProjectsForUser = async (userId: string) => {
  const projects = await prisma.project.findMany({
    include: projectInclude,
    orderBy: { createdAt: 'desc' },
    where: { userId },
  });

  return projects.map(toProjectResponse);
};

export const getProjectForUser = async (userId: string, projectId: string) => {
  const project = await prisma.project.findUnique({
    include: projectInclude,
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

  return toProjectResponse(project);
};

export const updateProjectForUser = async (
  userId: string,
  projectId: string,
  input: UpdateProjectPayloadInput,
) => {
  const project = await prisma.$transaction(async (transaction) => {
    const existingProject = await transaction.project.findUnique({
      select: { id: true },
      where: {
        id_userId: {
          id: projectId,
          userId,
        },
      },
    });

    if (!existingProject) {
      throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    }

    await transaction.project.update({
      data: buildProjectUpdateData(input),
      where: {
        id_userId: {
          id: projectId,
          userId,
        },
      },
    });

    const answers = buildAnswerRecords(userId, input);

    for (const answer of answers) {
      await transaction.projectAnswer.upsert({
        create: {
          ...answer,
          projectId,
        },
        update: {
          answer: answer.answer,
          label: answer.label,
          metadata: answer.metadata,
          type: answer.type,
        },
        where: {
          projectId_key: {
            key: answer.key,
            projectId,
          },
        },
      });
    }

    return transaction.project.findUniqueOrThrow({
      include: projectInclude,
      where: {
        id_userId: {
          id: projectId,
          userId,
        },
      },
    });
  });

  return toProjectResponse(project);
};
