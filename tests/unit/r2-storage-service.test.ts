import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  r2Client,
  createR2Client,
  getR2Endpoint,
  R2_BUCKET_NAME,
} from '@/shared/storage/r2Client';
import {
  R2StorageService,
  uploadFile,
  getPresignedDownloadUrl,
  deleteFile,
} from '@/shared/storage/r2StorageService';
import { AppError } from '@/shared/errors';
import { S3Client } from '@aws-sdk/client-s3';

// Mock getSignedUrl from @aws-sdk/s3-request-presigner
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async (client, command, options) => {
    const bucket = command.input?.Bucket || 'test-bucket';
    const key = command.input?.Key || 'test-key';
    const expiresIn = options?.expiresIn || 3600;
    return `https://${bucket}.r2.cloudflarestorage.com/${key}?X-Amz-Expires=${expiresIn}&mock=true`;
  }),
}));

describe('Cloudflare R2 Client & Storage Service (Phase A1)', () => {
  describe('r2Client Configuration & Endpoint Factory', () => {
    it('initializes default r2Client singleton with auto region', () => {
      expect(r2Client).toBeDefined();
      expect(r2Client).toBeInstanceOf(S3Client);
    });

    it('generates correct Cloudflare R2 endpoint URL based on account ID', () => {
      const endpoint = getR2Endpoint('test-account-12345');
      expect(endpoint).toBe('https://test-account-12345.r2.cloudflarestorage.com');
    });

    it('handles custom account ID and options in createR2Client', () => {
      const customClient = createR2Client({
        accountId: 'acc-custom-888',
        accessKeyId: 'custom-key',
        secretAccessKey: 'custom-secret',
      });
      expect(customClient).toBeInstanceOf(S3Client);
    });

    it('exports standard bucket name constant', () => {
      expect(typeof R2_BUCKET_NAME).toBe('string');
      expect(R2_BUCKET_NAME.length).toBeGreaterThan(0);
    });
  });

  describe('R2StorageService Operations', () => {
    let mockSend: ReturnType<typeof vi.fn>;
    let mockS3Client: S3Client;
    let service: R2StorageService;

    beforeEach(() => {
      mockSend = vi.fn().mockResolvedValue({});
      mockS3Client = {
        send: mockSend,
      } as unknown as S3Client;
      service = new R2StorageService(mockS3Client, 'cogent-test-bucket');
    });

    it('uploads a file buffer and returns the storage key', async () => {
      const key = 'circulars/cbn/2026/test_circular.pdf';
      const body = Buffer.from('Mock PDF Content');
      const contentType = 'application/pdf';

      const returnedKey = await service.uploadFile(key, body, contentType);

      expect(returnedKey).toBe(key);
      expect(mockSend).toHaveBeenCalledTimes(1);
      const calledCommand = mockSend.mock.calls[0][0];
      expect(calledCommand.input).toEqual({
        Bucket: 'cogent-test-bucket',
        Key: key,
        Body: body,
        ContentType: contentType,
      });
    });

    it('generates a presigned download URL with custom expiration', async () => {
      const key = 'policies/org-1/aml_policy.pdf';
      const url = await service.getPresignedDownloadUrl(key, 1800);

      expect(url).toContain('cogent-test-bucket.r2.cloudflarestorage.com');
      expect(url).toContain(key);
      expect(url).toContain('X-Amz-Expires=1800');
    });

    it('generates a presigned download URL with default expiration', async () => {
      const key = 'dossiers/arcon_audit_package.zip';
      const url = await service.getPresignedDownloadUrl(key);

      expect(url).toContain(key);
      expect(url).toContain('X-Amz-Expires=3600');
    });

    it('deletes a file and sends DeleteObjectCommand', async () => {
      const key = 'temp/stale_document.docx';
      await service.deleteFile(key);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const calledCommand = mockSend.mock.calls[0][0];
      expect(calledCommand.input).toEqual({
        Bucket: 'cogent-test-bucket',
        Key: key,
      });
    });

    it('wraps client errors into AppError on upload failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('R2 Network Connection Refused'));

      await expect(
        service.uploadFile('test.pdf', Buffer.from('data'), 'application/pdf')
      ).rejects.toThrow(AppError);
    });

    it('wraps client errors into AppError on delete failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('Access Denied'));

      await expect(service.deleteFile('protected.pdf')).rejects.toThrow(AppError);
    });
  });

  describe('Convenience Functions Export', () => {
    it('exports standalone convenience functions', () => {
      expect(typeof uploadFile).toBe('function');
      expect(typeof getPresignedDownloadUrl).toBe('function');
      expect(typeof deleteFile).toBe('function');
    });
  });
});
