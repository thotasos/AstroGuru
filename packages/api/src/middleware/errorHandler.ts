/**
 * errorHandler.ts — Centralised Fastify error handler
 *
 * Responsibilities:
 *   - Maps Zod validation errors to HTTP 400 with field-level details
 *   - Sanitises calculation / internal errors → HTTP 500 (no stack in prod)
 *   - Logs all errors with ISO timestamp and request context
 *   - Returns a consistent JSON envelope: { error, code?, details? }
 */

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

// ---------------------------------------------------------------------------
// Response shape
// ---------------------------------------------------------------------------

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

// ---------------------------------------------------------------------------
// Discriminators
// ---------------------------------------------------------------------------

function isZodError(err: unknown): err is ZodError {
  return err instanceof ZodError;
}

function isFastifyError(err: unknown): err is FastifyError {
  return (
    err !== null &&
    typeof err === 'object' &&
    'statusCode' in err &&
    typeof (err as FastifyError).statusCode === 'number'
  );
}

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

type LogLevel = 'warn' | 'error';

function logError(
  level: LogLevel,
  req: FastifyRequest,
  status: number,
  message: string,
  err: unknown,
): void {
  const ts = new Date().toISOString();
  const isProduction = process.env['NODE_ENV'] === 'production';

  const entry: Record<string, unknown> = {
    ts,
    level,
    method: req.method,
    url: req.url,
    status,
    error: message,
  };

  if (!isProduction && err instanceof Error && err.stack) {
    entry['stack'] = err.stack;
  }

  // Delegate to Fastify's built-in pino logger so output is consistent
  if (level === 'warn') {
    req.log.warn(entry);
  } else {
    req.log.error(entry);
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export function errorHandler(
  err: FastifyError | Error | unknown,
  req: FastifyRequest,
  reply: FastifyReply,
): void {
  const isProduction = process.env['NODE_ENV'] === 'production';

  // ── 1. Zod validation errors ────────────────────────────────────────────
  if (isZodError(err)) {
    const details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    logError('warn', req, 400, 'Validation error', err);

    void reply.status(400).send({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details,
    } satisfies ErrorResponse);
    return;
  }

  // ── 2. Fastify built-in errors (404, 405, 413, etc.) ───────────────────
  if (isFastifyError(err)) {
    const status = err.statusCode ?? 500;
    const message = err.message ?? 'Request error';

    logError(status >= 500 ? 'error' : 'warn', req, status, message, err);

    const body: ErrorResponse = {
      error: message,
      code: err.code,
    };

    void reply.status(status).send(body);
    return;
  }

  // ── 3. Generic / calculation errors → 500 ──────────────────────────────
  const message =
    err instanceof Error ? err.message : 'An unexpected error occurred';

  // Never leak internal messages or stack traces in production
  const safeMessage = isProduction
    ? 'Internal server error'
    : message;

  logError('error', req, 500, message, err);

  void reply.status(500).send({
    error: safeMessage,
    code: 'INTERNAL_ERROR',
  } satisfies ErrorResponse);
}
