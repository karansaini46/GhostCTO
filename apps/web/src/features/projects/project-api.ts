import { apiFileRequest, apiRequest } from '../../lib/api';
import type { CodeAuditGenerationInput, CodeAuditOutput } from './code-audit-types';
import type { RateValidatorGenerationInput, RateValidatorOutput } from './rate-validator-types';
import type { TechnicalSpecGenerationInput, TechnicalSpecOutput } from './technical-spec-types';
import type { VettingGenerationInput, VettingOutput } from './vetting-types';
import type {
  Project,
  ProjectChatMessage,
  ProjectChatPagination,
  ProjectDocumentType,
  ProjectPayload,
  StackAdviceGenerationOverrides,
} from './project-types';

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export const listProjectsRequest = (accessToken: string) =>
  apiRequest<{ projects: Project[] }>('/projects', {
    headers: authHeaders(accessToken),
  });

export const getProjectRequest = (accessToken: string, projectId: string) =>
  apiRequest<{ project: Project }>(`/projects/${projectId}`, {
    headers: authHeaders(accessToken),
  });

export const createProjectRequest = (accessToken: string, payload: ProjectPayload) =>
  apiRequest<{ project: Project }>('/projects', {
    body: JSON.stringify(payload),
    headers: authHeaders(accessToken),
    method: 'POST',
  });

export const updateProjectRequest = (
  accessToken: string,
  projectId: string,
  payload: Partial<ProjectPayload>,
) =>
  apiRequest<{ project: Project }>(`/projects/${projectId}`, {
    body: JSON.stringify(payload),
    headers: authHeaders(accessToken),
    method: 'PATCH',
  });

export const deleteProjectRequest = (
  accessToken: string,
  projectId: string,
  confirmationName: string,
) =>
  apiRequest<void>(`/projects/${projectId}`, {
    body: JSON.stringify({ confirmationName }),
    headers: authHeaders(accessToken),
    method: 'DELETE',
  });

export const generateRoadmapRequest = (accessToken: string, projectId: string) =>
  apiRequest<{ document: Project['documents'][number]; roadmap: unknown }>(
    `/projects/${projectId}/roadmap`,
    {
      body: JSON.stringify({}),
      headers: authHeaders(accessToken),
      method: 'POST',
    },
  );

export const createDeveloperJdRequest = (accessToken: string, projectId: string) =>
  apiRequest<{ developerJobDescription: unknown; document: Project['documents'][number] }>(
    `/projects/${projectId}/developer-jd`,
    {
      body: JSON.stringify({}),
      headers: authHeaders(accessToken),
      method: 'POST',
    },
  );

export const generateStackAdviceRequest = (
  accessToken: string,
  projectId: string,
  payload: StackAdviceGenerationOverrides,
) =>
  apiRequest<{ document: Project['documents'][number]; stackAdvice: unknown }>(
    `/projects/${projectId}/stack-advisor`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: 'POST',
    },
  );

export const generateTechnicalSpecRequest = (
  accessToken: string,
  projectId: string,
  payload: TechnicalSpecGenerationInput,
) =>
  apiRequest<{ document: Project['documents'][number]; technicalSpec: TechnicalSpecOutput }>(
    `/projects/${projectId}/technical-spec`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: 'POST',
    },
  );

export const generateRateValidationRequest = (
  accessToken: string,
  projectId: string,
  payload: RateValidatorGenerationInput,
) =>
  apiRequest<{
    document: Project['documents'][number];
    quoteAnalysis: unknown;
    rateValidation: RateValidatorOutput;
  }>(`/projects/${projectId}/rate-validator`, {
    body: JSON.stringify(payload),
    headers: authHeaders(accessToken),
    method: 'POST',
  });

export const generateCodeAuditRequest = (
  accessToken: string,
  projectId: string,
  payload: CodeAuditGenerationInput,
) =>
  apiRequest<{
    auditReport: unknown;
    codeAudit: CodeAuditOutput;
    document: Project['documents'][number];
  }>(`/projects/${projectId}/code-audit`, {
    body: JSON.stringify(payload),
    headers: authHeaders(accessToken),
    method: 'POST',
  });

export const generateVettingScorecardRequest = (
  accessToken: string,
  projectId: string,
  payload: VettingGenerationInput,
) =>
  apiRequest<{
    document: Project['documents'][number];
    vettingReport: unknown;
    vettingScorecard: VettingOutput;
  }>(`/projects/${projectId}/vetting`, {
    body: JSON.stringify(payload),
    headers: authHeaders(accessToken),
    method: 'POST',
  });

export const listProjectDocumentsRequest = (
  accessToken: string,
  projectId: string,
  type?: ProjectDocumentType,
) => {
  const query = type ? `?type=${type}` : '';

  return apiRequest<{ documents: Project['documents'] }>(
    `/projects/${projectId}/documents${query}`,
    {
      headers: authHeaders(accessToken),
    },
  );
};

export const getProjectDocumentRequest = (
  accessToken: string,
  projectId: string,
  documentId: string,
) =>
  apiRequest<{ document: Project['documents'][number] }>(
    `/projects/${projectId}/documents/${documentId}`,
    {
      headers: authHeaders(accessToken),
    },
  );

export const listProjectChatMessagesRequest = (accessToken: string, projectId: string, page = 1) =>
  apiRequest<{ messages: ProjectChatMessage[]; pagination: ProjectChatPagination }>(
    `/projects/${projectId}/chat?page=${page}&limit=30`,
    {
      headers: authHeaders(accessToken),
    },
  );

export const createProjectChatMessageRequest = (
  accessToken: string,
  projectId: string,
  message: string,
) =>
  apiRequest<{ assistantMessage: ProjectChatMessage; messages: ProjectChatMessage[] }>(
    `/projects/${projectId}/chat`,
    {
      body: JSON.stringify({ message }),
      headers: authHeaders(accessToken),
      method: 'POST',
    },
  );

export const exportProjectDocumentPdfRequest = (
  accessToken: string,
  projectId: string,
  documentId: string,
) =>
  apiFileRequest(`/projects/${projectId}/documents/${documentId}/export.pdf`, {
    headers: authHeaders(accessToken),
  });
