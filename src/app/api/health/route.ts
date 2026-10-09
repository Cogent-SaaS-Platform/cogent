import { NextResponse } from 'next/server';
import { HeadBucketCommand } from '@aws-sdk/client-s3';
import { createAdminClient } from '@/shared/db';
import { r2Client, R2_BUCKET_NAME } from '@/shared/storage/r2Client';

export const dynamic = 'force-dynamic';

export interface SubsystemStatus {
  status: 'OK' | 'FAILED';
  statusCode: 200 | 503;
  latencyMs: number;
  message?: string;
}

export interface HealthCheckResponse {
  status: 'HEALTHY' | 'DEGRADED';
  timestamp: string;
  service: string;
  version: string;
  latencyMs: number;
  checks: {
    database: SubsystemStatus;
    r2: SubsystemStatus;
    gemini: SubsystemStatus;
  };
}

async function checkDatabase(): Promise<SubsystemStatus> {
  const start = Date.now();
  try {
    const db = createAdminClient();
    const { error } = await db.from('organizations').select('id').limit(1);
    const latencyMs = Date.now() - start;

    if (error) {
      return {
        status: 'FAILED',
        statusCode: 503,
        latencyMs,
        message: error.message,
      };
    }

    return {
      status: 'OK',
      statusCode: 200,
      latencyMs,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: 'FAILED',
      statusCode: 503,
      latencyMs,
      message,
    };
  }
}

async function checkR2(): Promise<SubsystemStatus> {
  const start = Date.now();
  try {
    const hasCredentials = Boolean(
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      (process.env.R2_ACCOUNT_ID || process.env.R2_ENDPOINT)
    );

    if (!hasCredentials) {
      return {
        status: 'FAILED',
        statusCode: 503,
        latencyMs: Date.now() - start,
        message: 'R2 credentials or endpoint not configured in environment',
      };
    }

    await r2Client.send(new HeadBucketCommand({ Bucket: R2_BUCKET_NAME }));
    const latencyMs = Date.now() - start;

    return {
      status: 'OK',
      statusCode: 200,
      latencyMs,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: 'FAILED',
      statusCode: 503,
      latencyMs,
      message,
    };
  }
}

function checkGemini(): SubsystemStatus {
  const start = Date.now();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const latencyMs = Date.now() - start;

  if (!geminiKey) {
    return {
      status: 'FAILED',
      statusCode: 503,
      latencyMs,
      message: 'GEMINI_API_KEY environment variable is missing or empty',
    };
  }

  return {
    status: 'OK',
    statusCode: 200,
    latencyMs,
  };
}

export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  const startTime = Date.now();

  const [database, r2] = await Promise.all([
    checkDatabase(),
    checkR2(),
  ]);

  const gemini = checkGemini();

  const checks = {
    database,
    r2,
    gemini,
  };

  const isHealthy =
    checks.database.status === 'OK' &&
    checks.r2.status === 'OK' &&
    checks.gemini.status === 'OK';

  const totalLatencyMs = Date.now() - startTime;

  const payload: HealthCheckResponse = {
    status: isHealthy ? 'HEALTHY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    service: 'cogent-platform',
    version: '0.1.0',
    latencyMs: totalLatencyMs,
    checks,
  };

  return NextResponse.json(payload, {
    status: isHealthy ? 200 : 503,
  });
}
