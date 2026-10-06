import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/shared/auth';
import { DriftWatcherService } from '@/modules/marketing-shield/driftWatcherService';
import { logger } from '@/shared/logger';

const RegisterAssetSchema = z.object({
  liveUrl: z.string().url('Must provide a valid HTTP/HTTPS URL'),
  scanId: z.string().optional(),
  channel: z.enum([
    'SMS_BLAST',
    'SOCIAL_MEDIA_POST',
    'IN_APP_PUSH_NOTIFICATION',
    'LANDING_PAGE_WEBSITE',
    'EMAIL_NEWSLETTER',
    'OUTDOOR_BILLBOARD',
    'RADIO_TV_SCRIPT',
  ] as const),
  originalApprovedHash: z.string().regex(/^[0-9a-f]{64}$/, 'Must be a 64-char lowercase SHA-256 hash'),
});

export async function GET() {
  try {
    const tenantCtx = await getTenantContext();
    const driftWatcher = new DriftWatcherService(tenantCtx.dbClient);
    const assets = await driftWatcher.listTrackedAssets(tenantCtx.organizationId);

    return NextResponse.json({
      success: true,
      data: {
        organizationId: tenantCtx.organizationId,
        count: assets.length,
        assets,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to fetch tracked live assets');
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list assets' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const body = await req.json();

    const validationResult = RegisterAssetSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { liveUrl, scanId, channel, originalApprovedHash } = validationResult.data;

    const driftWatcher = new DriftWatcherService(tenantCtx.dbClient);
    const asset = await driftWatcher.registerLiveAsset({
      organizationId: tenantCtx.organizationId,
      liveUrl,
      scanId,
      channel,
      originalApprovedHash,
    });

    return NextResponse.json(
      {
        success: true,
        data: asset,
      },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to register live asset');
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to register asset' },
      { status: 500 }
    );
  }
}
