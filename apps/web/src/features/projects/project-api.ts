import { apiRequest } from '../../lib/api';
import type { TechnicalSpecGenerationInput, TechnicalSpecOutput } from './technical-spec-types';
import type {
  Project,
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

export const generateStackAdviceRequest = (
  accessToken: string,
  projectId: string,
  payload: StackAdviceGenerationOverrides,
) =>
  apiRequest<{ document: Project['documents'][number]; stackAdvice: unknown }>(
    `/projects/${projectId}/stack-advice`,
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
    `/projects/${projectId}/specs`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: 'POST',
    },
  );

export const listProjectDocumentsRequest = (
  accessToken: string,
  projectId: string,
  type: ProjectDocumentType,
) =>
  apiRequest<{ documents: Project['documents'] }>(`/projects/${projectId}/documents?type=${type}`, {
    headers: authHeaders(accessToken),
  });
