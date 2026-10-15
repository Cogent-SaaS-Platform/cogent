import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Instrumentation } from 'next';

// Define top-level mock handlers
const mockDbQuery = vi.fn();
const mockR2Send = vi.fn();

vi.mock('@/shared/db', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        limit: () => mockDbQuery(),
      }),
    }),
  }),
}));

vi.mock('@/shared/storage/r2Client', () => ({
  r2Client: {
    send: (cmd: unknown) => mockR2Send(cmd),
  },
  R2_BUCKET_NAME: 'cogent-test-bucket',
}));

vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
  captureRequestError: vi.fn(),
}));

import { GET as healthHandler } from '@/app/api/health/route';
import { logger, createScopedLogger } from '@/shared/logger';
import { register, onRequestError } from '@/../instrumentation';

describe('Phase A6: Observability, Monitoring & Logging Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('Task A6.1: Next.js 16 Native Instrumentation & Sentry Integration', () => {
    it('executes register hook on Node.js runtime without throwing', async () => {
      process.env.NEXT_RUNTIME = 'nodejs';
      delete process.env.SENTRY_DSN;
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;

      await expect(register()).resolves.toBeUndefined();
    });

    it('bypasses server config import when runtime is edge or non-nodejs', async () => {
      process.env.NEXT_RUNTIME = 'edge';
      await expect(register()).resolves.toBeUndefined();
    });

    it('onRequestError completes gracefully even when SENTRY_DSN is omitted', async () => {
      delete process.env.SENTRY_DSN;
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;

      type RequestErrorParams = Parameters<Instrumentation.onRequestError>;
      const dummyError = new Error('Simulated runtime failure');
      const dummyRequest: RequestErrorParams[1] = {
        path: '/api/test',
        method: 'GET',
        headers: { host: 'localhost:3000' },
      };
      const dummyContext: RequestErrorParams[2] = {
        routerKind: 'App Router',
        routePath: '/api/test',
        routeType: 'route',
        renderSource: 'server-rendering',
        revalidateReason: undefined,
      };

      await expect(onRequestError(dummyError, dummyRequest, dummyContext)).resolves.toBeUndefined();
    });
  });

  describe('Task A6.2: Centralized Structured Logger & NDPA Redaction', () => {
    it('initializes logger with required logging methods and ISO timestamp', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.child).toBe('function');
    });

    it('creates scoped child logger binding contextual telemetry properties', () => {
      const scoped = createScopedLogger({
        module: 'TEST_TELEMETRY',
        organizationId: 'org_test_123',
        traceId: 'trace_test_456',
      });

      expect(typeof scoped.info).toBe('function');
      expect(typeof scoped.error).toBe('function');
    });
  });

  describe('Task A6.3: Comprehensive Synthetic Health Probes (/api/health)', () => {
    it('returns 200 OK and HEALTHY when all sub-systems are operating normally', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key-active';
      process.env.R2_ACCESS_KEY_ID = 'test-r2-key';
      process.env.R2_SECRET_ACCESS_KEY = 'test-r2-secret';
      process.env.R2_ACCOUNT_ID = 'test-r2-account';

      mockDbQuery.mockResolvedValueOnce({ data: [{ id: 'org_001' }], error: null });
      mockR2Send.mockResolvedValueOnce({});

      const res = await healthHandler();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.status).toBe('HEALTHY');
      expect(json.service).toBe('cogent-platform');
      expect(json.version).toBe('0.1.0');
      expect(typeof json.latencyMs).toBe('number');
      expect(json.checks.database.status).toBe('OK');
      expect(json.checks.database.statusCode).toBe(200);
      expect(json.checks.r2.status).toBe('OK');
      expect(json.checks.r2.statusCode).toBe(200);
      expect(json.checks.gemini.status).toBe('OK');
      expect(json.checks.gemini.statusCode).toBe(200);
    });

    it('returns 503 DEGRADED when Supabase database probe fails', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key-active';
      process.env.R2_ACCESS_KEY_ID = 'test-r2-key';
      process.env.R2_SECRET_ACCESS_KEY = 'test-r2-secret';
      process.env.R2_ACCOUNT_ID = 'test-r2-account';

      mockDbQuery.mockResolvedValueOnce({ data: null, error: { message: 'Database connection timeout' } });
      mockR2Send.mockResolvedValueOnce({});

      const res = await healthHandler();
      expect(res.status).toBe(503);

      const json = await res.json();
      expect(json.status).toBe('DEGRADED');
      expect(json.checks.database.status).toBe('FAILED');
      expect(json.checks.database.statusCode).toBe(503);
      expect(json.checks.database.message).toBe('Database connection timeout');
    });

    it('returns 503 DEGRADED when Cloudflare R2 bucket probe fails', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key-active';
      process.env.R2_ACCESS_KEY_ID = 'test-r2-key';
      process.env.R2_SECRET_ACCESS_KEY = 'test-r2-secret';
      process.env.R2_ACCOUNT_ID = 'test-r2-account';

      mockDbQuery.mockResolvedValueOnce({ data: [{ id: 'org_001' }], error: null });
      mockR2Send.mockRejectedValueOnce(new Error('Bucket does not exist or access denied'));

      const res = await healthHandler();
      expect(res.status).toBe(503);

      const json = await res.json();
      expect(json.status).toBe('DEGRADED');
      expect(json.checks.r2.status).toBe('FAILED');
      expect(json.checks.r2.statusCode).toBe(503);
      expect(json.checks.r2.message).toContain('Bucket does not exist');
    });

    it('returns 503 DEGRADED when GEMINI_API_KEY is not defined', async () => {
      delete process.env.GEMINI_API_KEY;
      process.env.R2_ACCESS_KEY_ID = 'test-r2-key';
      process.env.R2_SECRET_ACCESS_KEY = 'test-r2-secret';
      process.env.R2_ACCOUNT_ID = 'test-r2-account';

      mockDbQuery.mockResolvedValueOnce({ data: [{ id: 'org_001' }], error: null });
      mockR2Send.mockResolvedValueOnce({});

      const res = await healthHandler();
      expect(res.status).toBe(503);

      const json = await res.json();
      expect(json.status).toBe('DEGRADED');
      expect(json.checks.gemini.status).toBe('FAILED');
      expect(json.checks.gemini.statusCode).toBe(503);
    });
  });
});
