import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME } from './r2Client';
import { logger } from '@/shared/logger';
import { AppError } from '@/shared/errors';

/**
 * Cloudflare R2 Storage Service (Task A3.4 & ADR-005)
 *
 * Provides typed, hardened S3-compatible operations for zero-egress object storage:
 * - Regulatory circular source PDFs
 * - Corporate compliance manuals
 * - ARCON marketing audit packages (ZIP dossiers)
 * - Encrypted snapshot artifacts
 */
export class R2StorageService {
  private readonly client: S3Client;
  private readonly defaultBucket: string;

  constructor(client: S3Client = r2Client, defaultBucket: string = R2_BUCKET_NAME) {
    this.client = client;
    this.defaultBucket = defaultBucket;
  }

  /**
   * Uploads a document artifact (PDF, ZIP, JSON) to Cloudflare R2.
   *
   * @param bucket Target R2 storage bucket
   * @param key Unique storage object path
   * @param fileBuffer Binary file payload
   * @param mimeType MIME content type
   * @returns Key of the uploaded object
   */
  async uploadDocument(
    bucket: string,
    key: string,
    fileBuffer: Buffer | Uint8Array,
    mimeType: string
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
      });

      await this.client.send(command);

      logger.info(
        {
          key,
          bucket,
          mimeType,
          sizeBytes: fileBuffer.byteLength,
        },
        'Uploaded document to Cloudflare R2 object storage'
      );

      return key;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(
        { key, bucket, error: err.message, stack: err.stack },
        'Failed to upload document to Cloudflare R2 object storage'
      );
      throw new AppError({
        message: `Failed to upload object '${key}' to R2 storage: ${err.message}`,
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        cause: error,
      });
    }
  }

  /**
   * Convenience upload handler using default configured bucket
   */
  async uploadFile(
    key: string,
    body: Buffer | Uint8Array,
    contentType: string,
    bucket?: string
  ): Promise<string> {
    return this.uploadDocument(bucket || this.defaultBucket, key, body, contentType);
  }

  /**
   * Generates a secure presigned HTTPS URL for downloading an object from Cloudflare R2
   * without routing heavy binary streams through Next.js server threads.
   */
  async getPresignedDownloadUrl(
    keyOrBucket: string,
    keyOrExpires?: string | number,
    maybeExpiresInSeconds?: number
  ): Promise<string> {
    let targetBucket: string;
    let targetKey: string;
    let expiresIn: number;

    if (typeof keyOrExpires === 'string') {
      // Called as: getPresignedDownloadUrl(bucket, key, expiresInSeconds)
      targetBucket = keyOrBucket;
      targetKey = keyOrExpires;
      expiresIn = typeof maybeExpiresInSeconds === 'number' ? maybeExpiresInSeconds : 3600;
    } else {
      // Called as: getPresignedDownloadUrl(key, expiresInSeconds)
      targetBucket = this.defaultBucket;
      targetKey = keyOrBucket;
      expiresIn = typeof keyOrExpires === 'number' ? keyOrExpires : 3600;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: targetBucket,
        Key: targetKey,
      });

      const presignedUrl = await getSignedUrl(this.client, command, {
        expiresIn,
      });

      logger.info(
        {
          key: targetKey,
          bucket: targetBucket,
          expiresIn,
        },
        'Generated presigned download URL for R2 document'
      );

      return presignedUrl;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(
        { key: targetKey, bucket: targetBucket, error: err.message, stack: err.stack },
        'Failed to generate presigned download URL for Cloudflare R2'
      );
      throw new AppError({
        message: `Failed to generate presigned URL for '${targetKey}': ${err.message}`,
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        cause: error,
      });
    }
  }

  /**
   * Deletes an object from Cloudflare R2
   */
  async deleteFile(key: string, bucket?: string): Promise<void> {
    const targetBucket = bucket || this.defaultBucket;
    try {
      const command = new DeleteObjectCommand({
        Bucket: targetBucket,
        Key: key,
      });

      await this.client.send(command);

      logger.info(
        { key, bucket: targetBucket },
        'Deleted file from Cloudflare R2 object storage'
      );
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(
        { key, bucket: targetBucket, error: err.message, stack: err.stack },
        'Failed to delete file from Cloudflare R2 object storage'
      );
      throw new AppError({
        message: `Failed to delete object '${key}' from R2 storage: ${err.message}`,
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        cause: error,
      });
    }
  }

  getBucket(): string {
    return this.defaultBucket;
  }
}

/**
 * Singleton service instance for global application usage
 */
export const r2StorageService: R2StorageService = new R2StorageService();

export const uploadDocument = (
  bucket: string,
  key: string,
  fileBuffer: Buffer | Uint8Array,
  mimeType: string
): Promise<string> => r2StorageService.uploadDocument(bucket, key, fileBuffer, mimeType);

export const uploadFile = (
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
  bucket?: string
): Promise<string> => r2StorageService.uploadFile(key, body, contentType, bucket);

export function getPresignedDownloadUrl(
  key: string,
  expiresInSeconds?: number
): Promise<string>;
export function getPresignedDownloadUrl(
  bucket: string,
  key: string,
  expiresInSeconds?: number
): Promise<string>;
export function getPresignedDownloadUrl(
  keyOrBucket: string,
  keyOrExpires?: string | number,
  maybeExpiresInSeconds?: number
): Promise<string> {
  return r2StorageService.getPresignedDownloadUrl(
    keyOrBucket,
    keyOrExpires,
    maybeExpiresInSeconds
  );
}

export const deleteFile = (key: string, bucket?: string): Promise<void> =>
  r2StorageService.deleteFile(key, bucket);
