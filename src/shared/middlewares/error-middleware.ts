import * as Sentry from '@sentry/node';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/app-error';
import { createResponse } from '../../utils/create-response';
import { httpStatusCodes } from '../../utils/http-constants';

function isBodyParserJsonError(err: unknown): boolean {
  if (!(err instanceof SyntaxError)) return false;
  const maybe = err as unknown as { type?: unknown };
  return typeof maybe.type === 'string' && maybe.type.includes('entity.parse.failed');
}

export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return;

  if (isBodyParserJsonError(err)) {
    const status = httpStatusCodes.BAD_REQUEST;
    return res
      .status(status)
      .json(createResponse(status, 'Invalid JSON body', undefined, 'INVALID_JSON'));
  }

  if (err instanceof AppError) {
    return res
      .status(err.statusCode)
      .json(createResponse(err.statusCode, err.message, err.data, err.code));
  }

  const isProd = process.env.NODE_ENV === 'production';
  const legacy = err as Error & { statusCode?: number };

  const rawStatus = typeof legacy.statusCode === 'number' ? legacy.statusCode : undefined;
  const status =
    rawStatus && rawStatus >= 400 && rawStatus < 600
      ? rawStatus
      : httpStatusCodes.INTERNAL_SERVER_ERROR;

  const isServerError = status >= 500;
  const message =
    isServerError && isProd ? 'Internal server error' : legacy.message || 'Internal server error';

  if (isServerError) {
    Sentry.captureException(err);
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${status}] ${req.method} ${req.originalUrl} - ${message}`);
  }

  return res
    .status(status)
    .json(
      createResponse(
        status,
        message,
        undefined,
        isServerError ? 'INTERNAL_SERVER_ERROR' : 'UNEXPECTED_ERROR',
      ),
    );
}
