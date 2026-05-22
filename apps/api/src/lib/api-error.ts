export class ApiError extends Error {
  readonly code: string;
  readonly expose: boolean;
  readonly statusCode: number;

  constructor(statusCode: number, code: string, message: string, expose = true) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.expose = expose;
    this.statusCode = statusCode;
  }
}
