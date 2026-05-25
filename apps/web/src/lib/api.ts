const apiBaseUrl =
  import.meta.env.VITE_API_URL?.trim() ||
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  'http://localhost:4000';

export type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

export type ApiFileResponse = {
  blob: Blob;
  filename: string | null;
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

export const apiRequest = async <Body>(path: string, options: RequestInit = {}): Promise<Body> => {
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

const readFilename = (contentDisposition: string | null) => {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const match = /filename="([^"]+)"/i.exec(contentDisposition);

  return match?.[1] ?? null;
};

export const apiFileRequest = async (
  path: string,
  options: RequestInit = {},
): Promise<ApiFileResponse> => {
  const response = await fetch(toApiUrl(path), {
    ...options,
    credentials: 'include',
    headers: {
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

  return {
    blob: await response.blob(),
    filename: readFilename(response.headers.get('Content-Disposition')),
  };
};
