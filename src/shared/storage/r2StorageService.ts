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
 * Cloudflare R2 Storage Service
 * Provides typed, hardened operations for zero-egress object storage.
 * Adheres to docs/launch/PHASE_A1_INFRASTRUCTURE.md & docs/SECURITY.md
 */
export class R2StorageService {
  private readonly client: S3Client;
  private readonly bucketName: string;

  constructor(client: S3Client = r2Client, bucketName: string = R2_BUCKET_NAME) {
    this.client = client;
    this.bucketName = bucketName;
  }

  /**
   * Upload binary data to Cloudflare R2
   * @param key Target object key (path) in the bucket
   * @param body Binary payload (Buffer or Uint8Array)
   * @param contentType MIME type of the file
   * @returns Key of the uploaded object
   */
  async uploadFile(
    key: string,
    body: Buffer | Uint8Array,
    contentType: string
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      });

      await this.client.send(command);

      logger.info(
        {
          key,
          bucket: this.bucketName,
          contentType,
          sizeBytes: body.byteLength,
        },
        'Uploaded file to R2 object storage'
      );

      return key;
    } catch (error) {
      logger.error(
        { key, bucket: this.bucketName, err: error },
        'Failed to upload file to R2 object storage'
      );
      throw new AppError({
        message: `Failed to upload object '${key}' to R2 storage: ${(error as Error).message}`,
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        cause: error,
      });
    }
  }

  /**
   * Generates a presigned HTTPS URL for downloading an object from Cloudflare R2
   * @param key Target object key in the bucket
   * @param expiresInSeconds Duration before the link expires (default: 3600 seconds)
   * @returns Presigned HTTPS download URL
   */
  async getPresignedDownloadUrl(
    key: string,
    expiresInSeconds: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const presignedUrl = await getSignedUrl(this.client, command, {
        expiresIn: expiresInSeconds,
      });

      return presignedUrl;
    } catch (error) {
      logger.error(
        { key, bucket: this.bucketName, err: error },
        'Failed to generate presigned download URL for R2'
      );
      throw new AppError({
        message: `Failed to generate presigned URL for '${key}': ${(error as Error).message}`,
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        cause: error,
      });
    }
  }

  /**
   * Delete an object from Cloudflare R2
   * @param key Target object key to delete
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);

      logger.info(
        { key, bucket: this.bucketName },
        'Deleted file from R2 object storage'
      );
    } catch (error) {
      logger.error(
        { key, bucket: this.bucketName, err: error },
        'Failed to delete file from R2 object storage'
      );
      throw new AppError({
        message: `Failed to delete object '${key}' from R2 storage: ${(error as Error).message}`,
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        cause: error,
      });
    }
  }

  getBucket(): string {
    return this.bucketName;
  }
}

/**
 * Singleton service instance
 */
export const r2StorageService = new R2StorageService();

export const uploadFile = (
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> => r2StorageService.uploadFile(key, body, contentType);

export const getPresignedDownloadUrl = (
  key: string,
  expiresInSeconds?: number
): Promise<string> => r2StorageService.getPresignedDownloadUrl(key, expiresInSeconds);

export const deleteFile = (key: string): Promise<void> =>
  r2StorageService.deleteFile(key);
