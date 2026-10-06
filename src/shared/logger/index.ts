import pino, { Logger, LoggerOptions } from 'pino';

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

const isDevelopment = process.env.NODE_ENV !== 'production';

const options: LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  redact: {
    paths: SENSITIVE_PATHS,
    censor: '[REDACTED_PII]',
  },
  base: {
    env: process.env.NODE_ENV ?? 'development',
    service: 'cogent-engine',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
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
