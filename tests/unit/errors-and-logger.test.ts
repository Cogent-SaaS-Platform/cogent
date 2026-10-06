import { describe, it, expect } from 'vitest';
import {
  AppError,
  BadRequestError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  TenantIsolationError,
  NotFoundError,
  AiProviderError,
  AiTimeoutError,
  RateLimitError,
  StatutoryConflictError,
  MaliciousFileError,
} from '@/shared/errors';
import { logger, createScopedLogger } from '@/shared/logger';
import { Ok, Err } from '@/shared/types';

describe('Centralized AppError Hierarchy', () => {
  it('correctly maps HTTP status codes and error codes', () => {
    const badReq = new BadRequestError('Invalid params');
    expect(badReq.statusCode).toBe(400);
    expect(badReq.code).toBe('BAD_REQUEST');
    expect(badReq.isOperational).toBe(true);

    const valErr = new ValidationError('Schema invalid', { field: 'copy_text' });
    expect(valErr.statusCode).toBe(422);
    expect(valErr.code).toBe('VALIDATION_ERROR');
    expect(valErr.details).toEqual({ field: 'copy_text' });

    const authErr = new AuthenticationError();
    expect(authErr.statusCode).toBe(401);
    expect(authErr.code).toBe('UNAUTHORIZED');

    const authzErr = new AuthorizationError();
    expect(authzErr.statusCode).toBe(403);
    expect(authzErr.code).toBe('FORBIDDEN');

    const tenantErr = new TenantIsolationError('org_123');
    expect(tenantErr.statusCode).toBe(403);
    expect(tenantErr.code).toBe('TENANT_ISOLATION_VIOLATION');
    expect(tenantErr.details).toEqual({ targetOrganizationId: 'org_123' });

    const notFound = new NotFoundError('RegulatoryInstrument', 'inst_abc');
    expect(notFound.statusCode).toBe(404);
    expect(notFound.code).toBe('NOT_FOUND');
    expect(notFound.message).toContain('inst_abc');

    const aiErr = new AiProviderError('Gemini 503 Overloaded');
    expect(aiErr.statusCode).toBe(502);
    expect(aiErr.code).toBe('AI_PROVIDER_ERROR');

    const aiTimeout = new AiTimeoutError('gemini-3.5-pro', 15000);
    expect(aiTimeout.statusCode).toBe(504);
    expect(aiTimeout.code).toBe('AI_TIMEOUT');

    const rateLimit = new RateLimitError('Too many requests', 60);
    expect(rateLimit.statusCode).toBe(429);
    expect(rateLimit.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(rateLimit.details).toEqual({ retryAfterSeconds: 60 });

    const statutory = new StatutoryConflictError('Overlapping CBN circular', ['BOFIA 2020 S.57']);
    expect(statutory.statusCode).toBe(409);
    expect(statutory.code).toBe('STATUTORY_CONFLICT');

    const fileMalicious = new MaliciousFileError('Contains embedded javascript actions');
    expect(fileMalicious.statusCode).toBe(400);
    expect(fileMalicious.code).toBe('FILE_MALICIOUS');
  });

  it('safely serializes to JSON for client responses without leaking stack', () => {
    const err = new ValidationError('Prohibited term detected', { term: '100% risk free' });
    const json = err.toJSON();

    expect(json).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Prohibited term detected',
        details: { term: '100% risk free' },
      },
    });
    expect((json as unknown as Record<string, unknown>).stack).toBeUndefined();
  });
});

describe('Functional Result Pattern', () => {
  it('handles Ok and Err states cleanly', () => {
    const successResult = Ok({ id: 'scan_001' });
    expect(successResult.success).toBe(true);
    if (successResult.success) {
      expect(successResult.data.id).toBe('scan_001');
    }

    const failureResult = Err(new BadRequestError('Missing campaign text'));
    expect(failureResult.success).toBe(false);
    if (!failureResult.success) {
      expect(failureResult.error.statusCode).toBe(400);
    }
  });
});

describe('Structured Pino Logger', () => {
  it('exports valid logger and creates child instances with metadata', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');

    const child = createScopedLogger({
      module: 'marketing-shield',
      organizationId: 'org_acme',
      traceId: 'trace_test_001',
    });
    expect(child).toBeDefined();
    expect(typeof child.info).toBe('function');
  });
});
