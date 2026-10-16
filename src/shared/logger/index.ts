import pino, { Logger, LoggerOptions, TransportSingleOptions } from 'pino';

/**
 * Sensitive fields to redact per NDPA 2023 & docs/SECURITY.md
 */
const SENSITIVE_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'authorization',
  'cookie',
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'bvn',
  'nin',
  'account_number',
  'phone',
  'phoneNumber',
  'document_body',
  'raw_content',
  'copy_text',
  '*.password',
  '*.token',
  '*.apiKey',
  '*.api_key',
  '*.secret',
  '*.bvn',
  '*.nin',
  '*.account_number',
  '*.phone',
  '*.document_body',
  '*.raw_content',
  '*.copy_text',
];

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
const isVercel = Boolean(process.env.VERCEL);
const isEdge =
  process.env.NEXT_RUNTIME === 'edge' ||
  typeof (globalThis as unknown as { EdgeRuntime?: string }).EdgeRuntime === 'string';

function resolveTransport(): TransportSingleOptions | undefined {
  // In Edge runtime, Vercel serverless environments, production, or CI/test:
  // Pino worker-thread transports (@logtail/pino, pino-pretty) must NOT be used.
  // 1. Edge runtime / Next.js middleware has no worker_threads or Node filesystem modules,
  //    causing runtime 500 errors: "unable to determine transport target for @logtail/pino".
  // 2. On Vercel, serverless worker threads are frozen and cannot resolve bundled package targets.
  //    Vercel natively ingests all stdout JSON logs and forwards them to Better Stack via Log Drain.
  // 3. Fallback to standard JSON stdout in production, Vercel, Edge, or CI/test.
  if (isEdge || isVercel || isProduction || isTest) {
    return undefined;
  }

  // Fallback to pretty printing only in local development
  try {
    return {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
      },
    };
  } catch {
    return undefined;
  }
}

const transport = resolveTransport();

const options: LoggerOptions = {
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  redact: {
    paths: SENSITIVE_PATHS,
    censor: '[REDACTED_PII]',
  },
  base: {
    env: process.env.NODE_ENV ?? 'development',
    service: 'cogent-engine',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(transport ? { transport } : {}),
};

export const logger: Logger = pino(options);

/**
 * Creates a contextual child logger with bound organization, module, and correlation IDs
 */
export function createScopedLogger(scope: {
  module: string;
  organizationId?: string;
  traceId?: string;
}): Logger {
  return logger.child(scope);
}

export default logger;
