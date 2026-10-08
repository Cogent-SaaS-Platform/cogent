/**
 * Centralized Domain Error Hierarchy for Cogent
 * Adheres to docs/ENGINEERING.md and docs/SECURITY.md
 */

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFIGURATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'TENANT_ISOLATION_VIOLATION'
  | 'STATUTORY_CONFLICT'
  | 'AI_PROVIDER_ERROR'
  | 'AI_TIMEOUT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'FILE_MALICIOUS'
  | 'INTERNAL_SERVER_ERROR';

export interface SerializedAppError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(params: {
    message: string;
    code?: ErrorCode;
    statusCode?: number;
    isOperational?: boolean;
    details?: Record<string, unknown>;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = this.constructor.name;
    this.code = params.code ?? 'INTERNAL_SERVER_ERROR';
    this.statusCode = params.statusCode ?? 500;
    this.isOperational = params.isOperational ?? true;
    this.details = params.details;

    if (params.cause) {
      this.cause = params.cause;
    }

    // Capture standard V8 stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON(): SerializedAppError {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Invalid request parameters', details?: Record<string, unknown>) {
    super({
      message,
      code: 'BAD_REQUEST',
      statusCode: 400,
      details,
    });
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: Record<string, unknown>) {
    super({
      message,
      code: 'VALIDATION_ERROR',
      statusCode: 422,
      details,
    });
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super({
      message,
      code: 'UNAUTHORIZED',
      statusCode: 401,
    });
  }
}

export class UnauthorizedError extends AuthenticationError {
  constructor(message = 'Authentication session required') {
    super(message);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied: insufficient organization permissions') {
    super({
      message,
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }
}

export class ForbiddenError extends AuthorizationError {
  constructor(message = 'Access forbidden: insufficient organization permissions') {
    super(message);
  }
}

export class SubscriptionRequiredError extends AuthorizationError {
  constructor(
    message = 'SUBSCRIPTION_REQUIRED: Active subscription or trial required to perform this action',
    details?: Record<string, unknown>
  ) {
    super(message);
    // Explicitly set code and details for subscription gate responses
    (this as any).code = 'FORBIDDEN';
    (this as any).statusCode = 403;
    (this as any).details = {
      gate: 'SUBSCRIPTION_REQUIRED',
      ...details,
    };
  }
}


export class ConfigurationError extends AppError {
  constructor(message = 'Invalid system or service configuration') {
    super({
      message,
      code: 'CONFIGURATION_ERROR',
      statusCode: 500,
    });
  }
}

export class TenantIsolationError extends AppError {
  constructor(organizationId?: string) {
    super({
      message: 'Cross-tenant access violation detected',
      code: 'TENANT_ISOLATION_VIOLATION',
      statusCode: 403,
      details: organizationId ? { targetOrganizationId: organizationId } : undefined,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', id?: string) {
    super({
      message: id ? `${resource} with id '${id}' was not found` : `${resource} was not found`,
      code: 'NOT_FOUND',
      statusCode: 404,
    });
  }
}

export class AiProviderError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, cause?: unknown) {
    super({
      message,
      code: 'AI_PROVIDER_ERROR',
      statusCode: 502,
      details,
      cause,
    });
  }
}

export class AiTimeoutError extends AppError {
  constructor(modelAlias: string, timeoutMs: number) {
    super({
      message: `AI inference timeout exceeded (${timeoutMs}ms) for model ${modelAlias}`,
      code: 'AI_TIMEOUT',
      statusCode: 504,
      details: { modelAlias, timeoutMs },
    });
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded. Please retry later.', retryAfterSec?: number) {
    super({
      message,
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      details: retryAfterSec ? { retryAfterSeconds: retryAfterSec } : undefined,
    });
  }
}

export class StatutoryConflictError extends AppError {
  constructor(message: string, regulatoryCitations?: string[]) {
    super({
      message,
      code: 'STATUTORY_CONFLICT',
      statusCode: 409,
      details: regulatoryCitations ? { citations: regulatoryCitations } : undefined,
    });
  }
}

export class MaliciousFileError extends AppError {
  constructor(reason: string) {
    super({
      message: `File rejected for security reasons: ${reason}`,
      code: 'FILE_MALICIOUS',
      statusCode: 400,
      details: { reason },
    });
  }
}
