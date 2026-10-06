import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/shared/auth';
import { DriftWatcherService } from '@/modules/marketing-shield/driftWatcherService';
import { logger } from '@/shared/logger';

const VerifyDriftSchema = z.object({
  liveUrl: z.string().url('Must provide a valid HTTP/HTTPS URL'),
  scanId: z.string().optional(),
  channel: z
    .enum([
      'SMS_BLAST',
      'SOCIAL_MEDIA_POST',
      'IN_APP_PUSH_NOTIFICATION',
      'LANDING_PAGE_WEBSITE',
      'EMAIL_NEWSLETTER',
      'OUTDOOR_BILLBOARD',
      'RADIO_TV_SCRIPT',
    ] as const)
    .optional(),
  directLiveText: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const body = await req.json();

    const validationResult = VerifyDriftSchema.safeParse(body);
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

    const { liveUrl, scanId, channel, directLiveText } = validationResult.data;

    const driftWatcher = new DriftWatcherService(tenantCtx.dbClient);
    const report = await driftWatcher.verifyLiveUrl({
      liveUrl,
      organizationId: tenantCtx.organizationId,
      originalScanId: scanId,
      channel,
      directLiveText,
    });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Live asset drift verification failed');
    return NextResponse.json(
      { success: false, error: error.message || 'Drift check failed' },
      { status: 500 }
    );
  }
}
