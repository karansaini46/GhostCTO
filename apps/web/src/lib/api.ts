const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:4000';

export type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
    this.status = status;
  }
}

export const toApiUrl = (path: string) => new URL(path, apiBaseUrl).toString();

const readResponse = async <Body>(response: Response): Promise<Body> => {
  const text = await response.text();
  return text ? (JSON.parse(text) as Body) : (undefined as Body);
};

export const apiRequest = async <Body>(
  path: string,
  options: RequestInit = {},
): Promise<Body> => {
  const response = await fetch(toApiUrl(path), {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = await readResponse<ApiErrorResponse>(response);
    throw new ApiError(
      response.status,
      errorBody.error?.code ?? 'REQUEST_ERROR',
      errorBody.error?.message ?? 'The request could not be completed.',
    );
  }

  if (response.status === 204) {
    return undefined as Body;
  }

  return readResponse<Body>(response);
};
