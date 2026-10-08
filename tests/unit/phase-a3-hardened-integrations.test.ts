import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkRateLimit,
  createRateLimitResponse,
  getRateLimitHeaders,
  standardApiLimiter,
  aiHeavyScanLimiter,
} from '@/shared/security/rateLimiter';
import { inngest } from '@/shared/inngest/client';
import { circularIngestionJob } from '@/modules/radar/inngest/circularIngestionHandler';
import { policyIngestionJob } from '@/modules/gap-matrix/inngest/policyIngestionHandler';
import { inngestDispatcher } from '@/modules/radar/inngest/client';
import { inngestGapMatrixDispatcher } from '@/modules/gap-matrix/inngest/client';
import {
  sendUrgentComplianceAlert,
  resend,
  ComplianceAlertPayload,
} from '@/shared/notifications/emailService';
import {
  R2StorageService,
  uploadDocument,
  getPresignedDownloadUrl,
} from '@/shared/storage/r2StorageService';
import { S3Client } from '@aws-sdk/client-s3';
import { AppError } from '@/shared/errors';

// Mock getSignedUrl from @aws-sdk/s3-request-presigner
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async (client, command, options) => {
    const bucket = command.input?.Bucket || 'test-bucket';
    const key = command.input?.Key || 'test-key';
    const expiresIn = options?.expiresIn || 3600;
    return `https://${bucket}.r2.cloudflarestorage.com/${key}?X-Amz-Expires=${expiresIn}&mock=true`;
  }),
}));

describe('Phase A3: Live Integration & Security Hardening Verification', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. Upstash Redis Rate Limiting Gateway
  // ──────────────────────────────────────────────────────────────────────────
  describe('Task A3.1: Upstash Redis Token Bucket Rate Limiter', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('allows requests when token bucket quota is not exceeded', async () => {
      vi.spyOn(standardApiLimiter, 'limit').mockResolvedValueOnce({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
        pending: Promise.resolve(),
      });

      const result = await checkRateLimit('tenant-org-001', 'standard');

      expect(result.success).toBe(true);
      expect(result.limit).toBe(60);
      expect(result.remaining).toBe(59);

      const headers = getRateLimitHeaders(result);
      expect(headers['X-RateLimit-Limit']).toBe('60');
      expect(headers['X-RateLimit-Remaining']).toBe('59');
      expect(headers['Retry-After']).toBeUndefined();
    });

    it('rejects rapid requests exceeding quota and constructs HTTP 429 response', async () => {
      const resetTime = Date.now() + 45000;
      vi.spyOn(aiHeavyScanLimiter, 'limit').mockResolvedValueOnce({
        success: false,
        limit: 10,
        remaining: 0,
        reset: resetTime,
        pending: Promise.resolve(),
      });

      const result = await checkRateLimit('tenant-org-heavy', 'aiHeavy');

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);

      const response = createRateLimitResponse(result);
      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');

      const body = await response.json();
      expect(body.error).toBe('Too Many Requests');
      expect(body.limit).toBe(10);
      expect(body.remaining).toBe(0);
    });

    it('propagates network exceptions with diagnostic trace instead of silently swallowing', async () => {
      vi.spyOn(standardApiLimiter, 'limit').mockRejectedValueOnce(
        new Error('Upstash Connection Timeout: ECONNREFUSED')
      );

      await expect(
        checkRateLimit('tenant-org-fail', 'standard')
      ).rejects.toThrow('Upstash Connection Timeout: ECONNREFUSED');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Official Inngest SDK Migration & Durable Functions
  // ──────────────────────────────────────────────────────────────────────────
  describe('Task A3.2: Official Inngest SDK & Durable Handlers', () => {
    it('registers circularIngestionJob with official Inngest function definition', () => {
      expect(circularIngestionJob).toBeDefined();
      expect(circularIngestionJob.id).toBeDefined();
    });

    it('registers policyIngestionJob with official Inngest function definition', () => {
      expect(policyIngestionJob).toBeDefined();
      expect(policyIngestionJob.id).toBeDefined();
    });

    it('dispatches radar circular events via inngest.send()', async () => {
      const sendSpy = vi.spyOn(inngest, 'send').mockResolvedValueOnce({
        ids: ['evt_radar_test_123'],
      });

      const result = await inngestDispatcher.send({
        name: 'radar/circular.ingested',
        data: {
          circularId: 'circ-001',
          circularNumber: 'CBN/BSD/2026/01',
          storagePath: 'circulars/cbn/2026/01.pdf',
          sourceFileHash: 'sha256_abcdef123456',
          regulator: 'CBN',
        },
      });

      expect(result.status).toBe('DISPATCHED');
      expect(result.eventId).toBe('evt_radar_test_123');
      expect(sendSpy).toHaveBeenCalledWith({
        name: 'radar/circular.ingested',
        data: expect.objectContaining({
          circularNumber: 'CBN/BSD/2026/01',
        }),
      });
    });

    it('dispatches gap matrix policy events via inngest.send()', async () => {
      const sendSpy = vi.spyOn(inngest, 'send').mockResolvedValueOnce({
        ids: ['evt_gap_test_456'],
      });

      const result = await inngestGapMatrixDispatcher.send({
        name: 'gap-matrix/policy.uploaded',
        data: {
          policyId: 'policy-001',
          organizationId: 'org-123',
          title: 'Institutional AML Policy 2026',
          storagePath: 'policies/org-123/aml.pdf',
          sourceFileHash: 'sha256_pol123',
          clausesCount: 14,
        },
      });

      expect(result.status).toBe('DISPATCHED');
      expect(result.eventId).toBe('evt_gap_test_456');
      expect(sendSpy).toHaveBeenCalledWith({
        name: 'gap-matrix/policy.uploaded',
        data: expect.objectContaining({
          clausesCount: 14,
        }),
      });
    });

    it('propagates Inngest network exceptions on dispatch failure', async () => {
      vi.spyOn(inngest, 'send').mockRejectedValueOnce(
        new Error('Inngest Cloud Unreachable')
      );

      await expect(
        inngestDispatcher.send({
          name: 'radar/circular.ingested',
          data: {
            circularId: 'circ-err',
            circularNumber: 'ERR/01',
            storagePath: 'path/err.pdf',
            sourceFileHash: 'hash',
            regulator: 'SEC',
          },
        })
      ).rejects.toThrow('Inngest Cloud Unreachable');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Resend Transactional Email Delivery
  // ──────────────────────────────────────────────────────────────────────────
  describe('Task A3.3: Production Resend Email Delivery', () => {
    const alertPayload: ComplianceAlertPayload = {
      recipientEmail: 'compliance@firstbank.test',
      organizationName: 'First Global Trust Ltd',
      circularNumber: 'BSD/DIR/CON/2026/088',
      circularTitle: 'Mandatory Re-KYC Verification Protocols',
      effectiveDate: '2026-04-15',
      urgencyLevel: 'CRITICAL',
    };

    it('transmits compliant HTML payload over network and returns true on success', async () => {
      vi.spyOn(resend.emails, 'send').mockResolvedValueOnce({
        data: { id: 'msg_resend_999' },
        error: null,
        headers: null,
      });

      const success = await sendUrgentComplianceAlert(alertPayload);

      expect(success).toBe(true);
      expect(resend.emails.send).toHaveBeenCalledTimes(1);
      const callArg = (resend.emails.send as unknown as { mock: { calls: Array<[Record<string, unknown>]> } }).mock.calls[0][0];
      expect(callArg.to).toEqual(['compliance@firstbank.test']);
      expect(callArg.subject).toContain('BSD/DIR/CON/2026/088');
      expect(callArg.html).toContain('First Global Trust Ltd');
      expect(callArg.html).toContain('CRITICAL DIRECTIVE');
    });

    it('returns false and records error if Resend API returns an error response', async () => {
      vi.spyOn(resend.emails, 'send').mockResolvedValueOnce({
        data: null,
        error: {
          name: 'validation_error',
          message: 'Domain not verified in DNS records',
          statusCode: 400,
        },
        headers: null,
      });

      const success = await sendUrgentComplianceAlert(alertPayload);
      expect(success).toBe(false);
    });

    it('traps network exceptions and returns false without crashing application thread', async () => {
      vi.spyOn(resend.emails, 'send').mockRejectedValueOnce(
        new Error('Resend TLS handshake timeout')
      );

      const success = await sendUrgentComplianceAlert(alertPayload);
      expect(success).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Cloudflare R2 Object Storage
  // ──────────────────────────────────────────────────────────────────────────
  describe('Task A3.4: Cloudflare R2 Document Management Service', () => {
    let mockSend: ReturnType<typeof vi.fn>;
    let mockS3Client: S3Client;
    let service: R2StorageService;

    beforeEach(() => {
      mockSend = vi.fn().mockResolvedValue({});
      mockS3Client = { send: mockSend } as unknown as S3Client;
      service = new R2StorageService(mockS3Client, 'cogent-storage-vault');
    });

    it('uploads documents with custom bucket, key, and MIME type via uploadDocument()', async () => {
      const buffer = Buffer.from('PDF Content Data');
      const key = await service.uploadDocument(
        'arcon-dossiers-prod',
        'audits/2026/dossier.zip',
        buffer,
        'application/zip'
      );

      expect(key).toBe('audits/2026/dossier.zip');
      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command.input).toEqual({
        Bucket: 'arcon-dossiers-prod',
        Key: 'audits/2026/dossier.zip',
        Body: buffer,
        ContentType: 'application/zip',
      });
    });

    it('supports 3-parameter presigned URL generator getPresignedDownloadUrl(bucket, key, expiresIn)', async () => {
      const url = await service.getPresignedDownloadUrl(
        'arcon-dossiers-prod',
        'dossiers/pkg.zip',
        1800
      );

      expect(url).toContain('arcon-dossiers-prod.r2.cloudflarestorage.com');
      expect(url).toContain('dossiers/pkg.zip');
      expect(url).toContain('X-Amz-Expires=1800');
    });

    it('supports 2-parameter presigned URL generator getPresignedDownloadUrl(key, expiresIn)', async () => {
      const url = await service.getPresignedDownloadUrl('policies/manual.pdf', 7200);

      expect(url).toContain('cogent-storage-vault.r2.cloudflarestorage.com');
      expect(url).toContain('policies/manual.pdf');
      expect(url).toContain('X-Amz-Expires=7200');
    });

    it('wraps S3 client exceptions into typed AppError on failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('R2 SignatureDoesNotMatch'));

      await expect(
        service.uploadDocument('test-bucket', 'key.pdf', Buffer.from(''), 'application/pdf')
      ).rejects.toThrow(AppError);
    });
  });
});
