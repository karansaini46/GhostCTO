import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { ApiError } from '../../lib/api-error.js';

export type ProjectDocumentType =
  | 'code_audit'
  | 'developer_jd'
  | 'rate_validator'
  | 'roadmap'
  | 'stack_advisor'
  | 'technical_spec'
  | 'vetting_scorecard';

const storedDocumentTypesByPublicType: Record<ProjectDocumentType, string[]> = {
  code_audit: ['CODE_AUDIT', 'code_audit'],
  developer_jd: ['DEVELOPER_JD', 'developer_jd', 'developer_job_description'],
  rate_validator: ['QUOTE_ANALYSIS', 'rate_validator'],
  roadmap: ['roadmap', 'ROADMAP'],
  stack_advisor: ['STACK_ADVICE', 'stack_advisor'],
  technical_spec: ['TECH_SPEC', 'technical_spec'],
  vetting_scorecard: ['VETTING_SCORECARD', 'vetting_scorecard'],
};

const publicDocumentTypeByStoredType = Object.entries(storedDocumentTypesByPublicType).reduce(
  (lookup, [publicType, storedTypes]) => {
    storedTypes.forEach((storedType) => {
      lookup[storedType] = publicType as ProjectDocumentType;
    });

    return lookup;
  },
  {} as Record<string, ProjectDocumentType>,
);

export const normalizeGeneratedDocumentType = (type: string) =>
  publicDocumentTypeByStoredType[type] ?? type;

export const getStoredDocumentTypeFilter = (type?: ProjectDocumentType) => {
  if (!type) {
    return undefined;
  }

  return storedDocumentTypesByPublicType[type];
};

export const generatedDocumentSelect = {
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
  version: true,
} satisfies Prisma.GeneratedDocumentSelect;

export type GeneratedDocumentRecord = Prisma.GeneratedDocumentGetPayload<{
  select: typeof generatedDocumentSelect;
}>;

type DocumentCreateClient = Pick<Prisma.TransactionClient, 'generatedDocument'>;

type CreateGeneratedDocumentInput = {
  completedAt: Date;
  content: string;
  metadata: Prisma.InputJsonValue;
  projectId: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING' | 'PROCESSING';
  summary: string | null;
  title: string;
  type: string;
  userId: string;
};

export const serializeGeneratedDocument = (document: GeneratedDocumentRecord) => ({
  completedAt: document.completedAt?.toISOString() ?? null,
  content: document.content,
  createdAt: document.createdAt.toISOString(),
  id: document.id,
  metadata: document.metadata,
  projectId: document.projectId,
  status: document.status,
  summary: document.summary,
  title: document.title,
  type: normalizeGeneratedDocumentType(document.type),
  updatedAt: document.updatedAt.toISOString(),
  version: document.version,
});

export const createVersionedGeneratedDocument = async (
  client: DocumentCreateClient,
  input: CreateGeneratedDocumentInput,
) => {
  const publicType = normalizeGeneratedDocumentType(input.type) as ProjectDocumentType;
  const typeFilter = getStoredDocumentTypeFilter(publicType) ?? [input.type];
  const latestVersion = await client.generatedDocument.aggregate({
    _max: {
      version: true,
    },
    where: {
      projectId: input.projectId,
      type: {
        in: typeFilter,
      },
      userId: input.userId,
    },
  });

  return client.generatedDocument.create({
    data: {
      completedAt: input.completedAt,
      content: input.content,
      metadata: input.metadata,
      projectId: input.projectId,
      status: input.status,
      summary: input.summary,
      title: input.title,
      type: input.type,
      userId: input.userId,
      version: (latestVersion._max.version ?? 0) + 1,
    },
    select: generatedDocumentSelect,
  });
};

const assertProjectForUser = async (userId: string, projectId: string) => {
  const project = await prisma.project.findUnique({
    select: {
      id: true,
    },
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
};

export const listProjectDocumentsForUser = async (
  userId: string,
  projectId: string,
  type?: ProjectDocumentType,
) => {
  await assertProjectForUser(userId, projectId);

  const storedTypes = getStoredDocumentTypeFilter(type);
  const documents = await prisma.generatedDocument.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    select: generatedDocumentSelect,
    where: {
      projectId,
      type: storedTypes
        ? {
            in: storedTypes,
          }
        : undefined,
      userId,
    },
  });

  return documents.map(serializeGeneratedDocument);
};

export const getProjectDocumentForUser = async (
  userId: string,
  projectId: string,
  documentId: string,
) => {
  await assertProjectForUser(userId, projectId);

  const document = await prisma.generatedDocument.findFirst({
    select: generatedDocumentSelect,
    where: {
      id: documentId,
      projectId,
      userId,
    },
  });

  if (!document) {
    throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
  }

  return serializeGeneratedDocument(document);
};
