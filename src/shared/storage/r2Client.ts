import { S3Client } from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 Client Configuration
 * Adheres to docs/launch/PHASE_A1_INFRASTRUCTURE.md (Task A1.4) & docs/SECURITY.md
 *
 * Cloudflare R2 provides S3-compatible zero-egress object storage for:
 * - Ingested regulatory circular PDFs
 * - Corporate policy manuals
 * - ARCON marketing audit dossiers
 * - Nightly encrypted database backups
 */

export const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
export const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
export const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'cogent-prod-storage';

/**
 * Computes the S3-compatible Cloudflare R2 endpoint URL
 */
export function getR2Endpoint(accountId?: string): string {
  if (accountId && accountId.trim()) {
    return `https://${accountId.trim()}.r2.cloudflarestorage.com`;
  }
  if (process.env.R2_ENDPOINT) {
    return process.env.R2_ENDPOINT;
  }
  const cleanId = (accountId ?? R2_ACCOUNT_ID).trim();
  return cleanId ? `https://${cleanId}.r2.cloudflarestorage.com` : 'https://r2.cloudflarestorage.com';
}

/**
 * Factory function to create an S3Client instance targeted at Cloudflare R2
 * Configured with region 'auto' and non-caching static credentials.
 */
export function createR2Client(options?: {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
}): S3Client {
  const accountId = options?.accountId ?? R2_ACCOUNT_ID;
  const endpoint = options?.endpoint ?? getR2Endpoint(accountId);
  const accessKeyId = options?.accessKeyId ?? R2_ACCESS_KEY_ID;
  const secretAccessKey = options?.secretAccessKey ?? R2_SECRET_ACCESS_KEY;

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: accessKeyId || 'mock-r2-access-key',
      secretAccessKey: secretAccessKey || 'mock-r2-secret-key',
    },
  });
}

/**
 * Singleton R2 S3 client for production usage
 */
export const r2Client = createR2Client();
