import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { ApiError } from '../../lib/api-error.js';
import { getModelProvider } from '../../services/model-provider/index.js';
import { enforceDailyGenerationLimitForUser } from './generation-usage.service.js';
import type { ChatMessageRequestInput, ChatMessagesQueryInput } from './project.schemas.js';

const recentDocumentLimit = 6;
const recentHistoryLimit = 12;

const projectChatInclude = {
  answers: {
    orderBy: {
      createdAt: 'asc',
    },
  },
  documents: {
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      completedAt: true,
      content: true,
      createdAt: true,
      id: true,
      status: true,
      summary: true,
      title: true,
      type: true,
    },
    take: recentDocumentLimit,
  },
} satisfies Prisma.ProjectInclude;

type ProjectChatWorkspace = Prisma.ProjectGetPayload<{ include: typeof projectChatInclude }>;

type ChatMessageRecord = Prisma.ChatMessageGetPayload<{
  select: {
    content: true;
    createdAt: true;
    id: true;
    metadata: true;
    projectId: true;
    role: true;
    updatedAt: true;
  };
}>;

const chatMessageSelect = {
  content: true,
  createdAt: true,
  id: true,
  metadata: true,
  projectId: true,
  role: true,
  updatedAt: true,
} satisfies Prisma.ChatMessageSelect;

const normalizeDocumentType = (type: string) => {
  if (type === 'ROADMAP') {
    return 'roadmap';
  }

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

  if (type === 'VETTING_SCORECARD') {
    return 'vetting_scorecard';
  }

  if (type === 'DEVELOPER_JD' || type === 'developer_jd' || type === 'developer_job_description') {
    return 'developer_jd';
  }

  return type;
};

const toStringArray = (value: Prisma.JsonValue): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
};

const compactText = (value: string) => value.replace(/\s+/g, ' ').trim();

const truncateText = (value: string, maxLength: number) => {
  const compacted = compactText(value);

  if (compacted.length <= maxLength) {
    return compacted;
  }

  return `${compacted.slice(0, maxLength - 1).trim()}...`;
};

const formatNullable = (label: string, value: string | null) =>
  value?.trim() ? `${label}: ${truncateText(value, 900)}` : null;

const formatJsonValue = (value: Prisma.JsonValue) => {
  if (typeof value === 'string') {
    return truncateText(value, 700);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
      .filter(Boolean)
      .map((item) => `- ${truncateText(item, 240)}`)
      .join('\n');
  }

  if (value && typeof value === 'object') {
    return truncateText(JSON.stringify(value), 700);
  }

  return 'Not provided';
};

const formatAnswers = (project: ProjectChatWorkspace) => {
  if (!project.answers.length) {
    return 'No saved onboarding answers.';
  }

  return project.answers
    .map((answer) => `${answer.label ?? answer.key}: ${formatJsonValue(answer.answer)}`)
    .join('\n');
};

const formatDocuments = (project: ProjectChatWorkspace) => {
  if (!project.documents.length) {
    return 'No generated documents yet.';
  }

  return project.documents
    .map((document) => {
      const summary = document.summary
        ? `Summary: ${truncateText(document.summary, 700)}`
        : 'Summary: Not provided';
      const excerpt = document.content
        ? `Excerpt: ${truncateText(document.content, 900)}`
        : 'Excerpt: Not available';

      return [
        `Title: ${document.title}`,
        `Type: ${normalizeDocumentType(document.type)}`,
        `Status: ${document.status}`,
        summary,
        excerpt,
      ].join('\n');
    })
    .join('\n\n');
};

const roleLabel = (role: ChatMessageRecord['role']) => {
  if (role === 'FOUNDER') {
    return 'Founder';
  }

  if (role === 'ADVISOR') {
    return 'Technical co-founder';
  }

  return 'System';
};

const formatHistory = (messages: ChatMessageRecord[]) => {
  if (!messages.length) {
    return 'No earlier chat history.';
  }

  return messages
    .map((message) => `${roleLabel(message.role)}: ${truncateText(message.content, 900)}`)
    .join('\n\n');
};

const buildProjectContextSnapshot = (project: ProjectChatWorkspace) => {
  const mustHaveFeatures = toStringArray(project.mustHaveFeatures);
  const existingAssets = toStringArray(project.existingAssets);
  const projectFacts = [
    `Project: ${project.name}`,
    formatNullable('Company', project.companyName),
    formatNullable('Industry', project.industry),
    formatNullable('Stage', project.currentStage),
    formatNullable('Idea summary', project.ideaSummary ?? project.summary),
    formatNullable('Target customer', project.targetCustomer),
    formatNullable('Product type', project.productType),
    formatNullable('Monetization', project.monetization),
    formatNullable('Budget range', project.budgetRange),
    formatNullable('Launch timeline', project.launchTimeline),
    formatNullable('Founder technical level', project.founderTechnicalLevel),
    formatNullable('Biggest concern', project.biggestConcern),
    mustHaveFeatures.length
      ? `Must-have features:\n${mustHaveFeatures.map((item) => `- ${item}`).join('\n')}`
      : null,
    existingAssets.length
      ? `Existing assets:\n${existingAssets.map((item) => `- ${item}`).join('\n')}`
      : null,
  ].filter((item): item is string => Boolean(item));

  return [
    'PROJECT FACTS',
    projectFacts.join('\n'),
    '',
    'SAVED ONBOARDING ANSWERS',
    formatAnswers(project),
    '',
    'RECENT GENERATED DOCUMENTS',
    formatDocuments(project),
  ].join('\n');
};

const buildChatPrompt = (
  project: ProjectChatWorkspace,
  recentMessages: ChatMessageRecord[],
  message: string,
) =>
  [
    'You are answering as a senior technical co-founder advising a non-technical founder on this specific project.',
    '',
    'Guardrails:',
    '- Use the project context below and the recent conversation. Do not give generic startup advice.',
    '- Admit uncertainty when the saved context or provided facts are incomplete.',
    '- Ask for missing information only when it is absolutely necessary to avoid a misleading answer.',
    '- Explain technical terms in founder language the first time you use them.',
    '- Be direct about tradeoffs, delivery risk, cost risk, and what the founder should do next.',
    '- When action is needed, give exact next steps the founder can take.',
    '',
    buildProjectContextSnapshot(project),
    '',
    'RECENT CHAT HISTORY',
    formatHistory(recentMessages),
    '',
    `FOUNDER QUESTION\n${message}`,
    '',
    'Answer with practical, project-specific guidance.',
  ].join('\n');

const serializeChatMessage = (message: ChatMessageRecord) => ({
  content: message.content,
  createdAt: message.createdAt.toISOString(),
  id: message.id,
  metadata: message.metadata,
  projectId: message.projectId,
  role: message.role.toLowerCase(),
  updatedAt: message.updatedAt.toISOString(),
});

const getProjectForUser = async (userId: string, projectId: string) => {
  const project = await prisma.project.findUnique({
    include: projectChatInclude,
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

export const createProjectChatMessageForUser = async (
  userId: string,
  projectId: string,
  input: ChatMessageRequestInput,
) => {
  const project = await getProjectForUser(userId, projectId);
  await enforceDailyGenerationLimitForUser(userId);
  const recentMessages = (
    await prisma.chatMessage.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: chatMessageSelect,
      take: recentHistoryLimit,
      where: {
        projectId,
        userId,
      },
    })
  ).reverse();
  const provider = getModelProvider();
  const prompt = buildChatPrompt(project, recentMessages, input.message);
  const generation = await provider.generateText({
    maxOutputTokens: 4096,
    prompt,
    requestName: 'projects.chat.answer',
    temperature: 0.25,
  });
  const usage = generation.usage
    ? {
        inputTokens: generation.usage.inputTokens ?? null,
        outputTokens: generation.usage.outputTokens ?? null,
        totalTokens: generation.usage.totalTokens ?? null,
      }
    : null;

  const [founderMessage, advisorMessage] = await prisma.$transaction(async (transaction) => {
    const createdFounderMessage = await transaction.chatMessage.create({
      data: {
        content: input.message,
        metadata: {},
        projectId: project.id,
        role: 'FOUNDER',
        userId,
      },
      select: chatMessageSelect,
    });

    const createdAdvisorMessage = await transaction.chatMessage.create({
      data: {
        content: generation.text,
        metadata: {
          context: {
            documentIds: project.documents.map((document) => document.id),
            historyMessageIds: recentMessages.map((messageRecord) => messageRecord.id),
          },
          finishReason: generation.finishReason ?? null,
          usage,
        },
        projectId: project.id,
        role: 'ADVISOR',
        userId,
      },
      select: chatMessageSelect,
    });

    return [createdFounderMessage, createdAdvisorMessage];
  });

  return {
    assistantMessage: serializeChatMessage(advisorMessage),
    messages: [serializeChatMessage(founderMessage), serializeChatMessage(advisorMessage)],
  };
};

export const listProjectChatMessagesForUser = async (
  userId: string,
  projectId: string,
  query: ChatMessagesQueryInput,
) => {
  await assertProjectForUser(userId, projectId);

  const skip = (query.page - 1) * query.limit;
  const [total, messages] = await prisma.$transaction([
    prisma.chatMessage.count({
      where: {
        projectId,
        userId,
      },
    }),
    prisma.chatMessage.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: chatMessageSelect,
      skip,
      take: query.limit,
      where: {
        projectId,
        userId,
      },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / query.limit));

  return {
    messages: messages.reverse().map(serializeChatMessage),
    pagination: {
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
      limit: query.limit,
      page: query.page,
      total,
      totalPages,
    },
  };
};
