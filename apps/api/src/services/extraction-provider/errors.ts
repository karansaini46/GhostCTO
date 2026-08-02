export class ExtractionProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly statusCode?: number;

  constructor({
    code,
    message,
    retryable = false,
    statusCode,
  }: {
    code: string;
    message: string;
    retryable?: boolean;
    statusCode?: number;
  }) {
    super(message);
    this.name = 'ExtractionProviderError';
    this.code = code;
    this.retryable = retryable;
    this.statusCode = statusCode;
  }
}
