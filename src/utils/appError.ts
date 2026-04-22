export type AppErrorParams = {
  message: string;
  statusCode: number;
  code: string;
  data?: unknown;
};

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly data?: unknown;

  constructor(params: AppErrorParams) {
    super(params.message);
    this.name = 'AppError';
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.data = params.data;
  }

  static badRequest(message = 'Invalid request', code = 'BAD_REQUEST', data?: unknown) {
    return new AppError({ statusCode: 400, message, code, data });
  }

  static notFound(message = 'Not found', code = 'NOT_FOUND', data?: unknown) {
    return new AppError({ statusCode: 404, message, code, data });
  }

  static internal(message = 'Internal server error', code = 'INTERNAL_SERVER_ERROR', data?: unknown) {
    return new AppError({ statusCode: 500, message, code, data });
  }
}
