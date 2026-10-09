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
const betterStackToken = process.env.BETTER_STACK_SOURCE_TOKEN;

function resolveTransport(): TransportSingleOptions | undefined {
  // If Better Stack token is provided, stream via HTTPS transport (quarantined from test runner)
  if (betterStackToken && !isTest) {
    return {
      target: '@logtail/pino',
      options: { sourceToken: betterStackToken },
    };
  }

  // Fallback to pretty printing in local development (non-production, non-CI, non-test)
  if (!isProduction && !isTest) {
    return {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
      },
    };
  }

  // Fallback to standard JSON stdout in production or CI/test
  return undefined;
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
