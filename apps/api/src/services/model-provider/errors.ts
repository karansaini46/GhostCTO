export type ModelProviderErrorCode =
  | 'PROVIDER_NOT_CONFIGURED'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_REQUEST_FAILED'
  | 'PROVIDER_RESPONSE_EMPTY'
  | 'INVALID_STRUCTURED_OUTPUT';

export type ModelProviderErrorOptions = {
  code: ModelProviderErrorCode;
  message: string;
  retryable?: boolean;
  statusCode?: number;
};

export class ModelProviderError extends Error {
  readonly code: ModelProviderErrorCode;
  readonly retryable: boolean;
  readonly statusCode?: number;

  constructor({ code, message, retryable = false, statusCode }: ModelProviderErrorOptions) {
    super(message);
    this.name = 'ModelProviderError';
    this.code = code;
    this.retryable = retryable;
    this.statusCode = statusCode;
  }
}
