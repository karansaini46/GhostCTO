import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { ApiError } from '../../lib/api-error.js';
import { getModelProvider } from '../../services/model-provider/index.js';
import {
  buildProjectContextSection,
  getGhostctoModuleSchema,
  type ProjectPromptAnswer,
  type ProjectPromptContext,
} from '../../services/prompts/index.js';
import {
  buildGithubRepositoryContextSection,
  fetchPublicGithubRepository,
  type GithubRepositorySnapshot,
} from '../../services/github/github.service.js';
import type { CodeAuditRequestInput } from './project.schemas.js';

const codeAuditDocumentType = 'CODE_AUDIT';
const codeAuditDocumentTitle = 'Code Audit';
const sourceSnippetLimit = 18_000;

const projectWorkspaceInclude = {
  answers: {
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.ProjectInclude;

type ProjectWorkspace = Prisma.ProjectGetPayload<{ include: typeof projectWorkspaceInclude }>;

type GeneratedCodeAuditDocument = Prisma.GeneratedDocumentGetPayload<{
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

type AuditReportRecord = Prisma.AuditReportGetPayload<{
  select: {
    completedAt: true;
    createdAt: true;
    findings: true;
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

const normalizeDocumentType = (type: string) => (type === codeAuditDocumentType ? 'code_audit' : type);

const serializeGeneratedDocument = (document: GeneratedCodeAuditDocument) => ({
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

const serializeAuditReport = (report: AuditReportRecord) => ({
  completedAt: report.completedAt?.toISOString() ?? null,
  createdAt: report.createdAt.toISOString(),
  findings: report.findings,
  id: report.id,
  metadata: report.metadata,
  projectId: report.projectId,
  status: report.status,
  summary: report.summary,
  title: report.title,
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

const truncateSnippet = (snippet: string) => {
  const normalized = snippet.trim().replace(/\r\n/g, '\n');

  if (normalized.length <= sourceSnippetLimit) {
    return {
      content: normalized,
      truncated: false,
    };
  }

  return {
    content: normalized.slice(0, sourceSnippetLimit).trimEnd(),
    truncated: true,
  };
};

const buildSourceContextSection = (
  input: CodeAuditRequestInput,
  repositorySnapshot: GithubRepositorySnapshot | null,
) => {
  if (repositorySnapshot) {
    return buildGithubRepositoryContextSection(repositorySnapshot);
  }

  const snippet = truncateSnippet(input.codeSnippet ?? '');
  return [
    'Code snippet context:',
    `- Source: Pasted code snippet`,
    `- Characters reviewed: ${snippet.content.length}`,
    `- Snippet truncated: ${snippet.truncated ? 'yes' : 'no'}`,
    'Snippet:',
    '```',
    snippet.content,
    '```',
  ].join('\n');
};

const buildCodeAuditPrompt = (
  project: ProjectPromptContext,
  input: CodeAuditRequestInput,
  repositorySnapshot: GithubRepositorySnapshot | null,
) => {
  const sharedRequirements = [
    'The markdown report must include an executive summary, critical risks, security issues, scalability issues, maintainability issues, signs of rushed or poor work, what is acceptable, questions for the developer, recommended next actions, and a clear advisory disclaimer.',
    'Prioritize the findings so a founder can see the most important items first.',
    'Do not claim full security certification, a complete penetration test, or certainty that the code is safe.',
    'Use direct, founder-friendly language and clearly separate facts, assumptions, and recommendations.',
    'Every finding must include severity, explanation, evidence, and a suggested fix.',
  ];

  const task = input.repoUrl
    ? 'Review the provided public GitHub repository as a founder-facing advisory audit. Use the repository metadata and selected files to identify material delivery risk, security issues, maintainability problems, scalability concerns, and signs of rushed work. Explain what is acceptable, what needs attention before more money is invested, and what questions should be asked before continuing.'
    : 'Review the pasted code snippet as a founder-facing advisory audit. Identify material delivery risk, security issues, maintainability problems, scalability concerns, and signs of rushed work. Explain what is acceptable, what needs attention before more money is invested, and what questions should be asked before continuing.';

  return [
    buildProjectContextSection(project),
    '',
    buildSourceContextSection(input, repositorySnapshot),
    '',
    'Safety boundaries:',
    '- Use only the provided project context and source code context for project-specific claims.',
    '- State assumptions when context is missing or incomplete.',
    '- Do not provide legal, tax, medical, investment, or security guarantees.',
    '- Keep the guidance practical for a non-technical founder making product and hiring decisions.',
    '',
    'Strict JSON requirements:',
    '- Return valid JSON only.',
    '- Do not wrap JSON in Markdown fences.',
    '- Do not include commentary before or after the JSON value.',
    '- Use null for unknown optional values.',
    '- Use arrays for list fields, even when the list has one item.',
    '',
    'Schema target: CodeAuditOutput',
    'Schema details: Return { moduleType, reportMarkdown, cards, assumptions, risks, nextSteps, recommendation, executiveSummary, disclaimer, overviewRiskLevel, findings, criticalRisks, securityIssues, scalabilityIssues, maintainabilityIssues, rushedWorkSignals, acceptableAreas, questionsForDeveloper, recommendedNextActions }. Each finding must include category, severity, priority, title, explanation, evidence, impact, confidenceLevel, and suggestedFix.',
    '',
    'Output requirements:',
    ...sharedRequirements.map((requirement) => `- ${requirement}`),
    '',
    'Task:',
    task,
  ].join('\n');
};

const buildRequestMetadata = (
  input: CodeAuditRequestInput,
  repositorySnapshot: GithubRepositorySnapshot | null,
) => ({
  repository: repositorySnapshot
    ? {
        defaultBranch: repositorySnapshot.metadata.defaultBranch,
        fullName: repositorySnapshot.metadata.fullName,
        repoUrl: repositorySnapshot.repoUrl,
        selectedFiles: repositorySnapshot.selectedFiles.map((file) => ({
          path: file.path,
          reason: file.reason,
          size: file.size,
        })),
        skippedFiles: repositorySnapshot.skippedFiles.slice(0, 30),
      }
    : null,
  request: {
    codeSnippet: input.codeSnippet ? { characters: input.codeSnippet.trim().length } : null,
    repoUrl: input.repoUrl ?? null,
  },
});

export const generateCodeAuditForUser = async (
  userId: string,
  projectId: string,
  input: CodeAuditRequestInput,
) => {
  const project = await getProjectForUser(userId, projectId);
  const repositorySnapshot = input.repoUrl ? await fetchPublicGithubRepository(input.repoUrl) : null;
  const promptContext = toProjectPromptContext(project);
  const prompt = buildCodeAuditPrompt(promptContext, input, repositorySnapshot);
  const provider = getModelProvider();
  const schema = getGhostctoModuleSchema('code_audit');
  const generatedAt = new Date();
  const generation = await provider.generateStructured({
    maxOutputTokens: 12288,
    prompt,
    requestName: 'projects.codeAudit.generate',
    schema,
  });
  const summary = generation.data.executiveSummary;
  const usage = generation.usage
    ? {
        inputTokens: generation.usage.inputTokens ?? null,
        outputTokens: generation.usage.outputTokens ?? null,
        totalTokens: generation.usage.totalTokens ?? null,
      }
    : null;

  const { auditReport, document } = await prisma.$transaction(async (transaction) => {
    const auditReportRecord = await transaction.auditReport.create({
      data: {
        completedAt: generatedAt,
        findings: generation.data.findings,
        metadata: {
          ...buildRequestMetadata(input, repositorySnapshot),
          generatedAt: generatedAt.toISOString(),
          moduleType: generation.data.moduleType,
          source: repositorySnapshot
            ? {
                type: 'github_repository',
                url: repositorySnapshot.repoUrl,
              }
            : {
                type: 'code_snippet',
              },
          usage,
        },
        projectId: project.id,
        status: 'COMPLETED',
        summary,
        title: codeAuditDocumentTitle,
        type: codeAuditDocumentType,
        userId,
      },
      select: {
        completedAt: true,
        createdAt: true,
        findings: true,
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

    const generatedDocument = await transaction.generatedDocument.create({
      data: {
        completedAt: generatedAt,
        content: generation.data.reportMarkdown,
        metadata: {
          ...buildRequestMetadata(input, repositorySnapshot),
          auditReportId: auditReportRecord.id,
          codeAudit: generation.data,
          generatedAt: generatedAt.toISOString(),
          moduleType: generation.data.moduleType,
          usage,
        },
        projectId: project.id,
        status: 'COMPLETED',
        summary,
        title: codeAuditDocumentTitle,
        type: codeAuditDocumentType,
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
      auditReport: auditReportRecord,
      document: generatedDocument,
    };
  });

  return {
    auditReport: serializeAuditReport(auditReport),
    codeAudit: generation.data,
    document: serializeGeneratedDocument(document),
  };
};
