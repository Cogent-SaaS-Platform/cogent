import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MarketingShieldService } from '@/modules/marketing-shield';
import { MarketingChannel, ProductCategoryCode, PRODUCT_CATEGORY_CODES } from '@/shared/types';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';

const ScanRequestSchema = z.object({
  campaignName: z.string().min(1, 'Campaign name is required').max(255),
  channel: z.enum([
    'SMS_BLAST',
    'SOCIAL_MEDIA_POST',
    'IN_APP_PUSH_NOTIFICATION',
    'LANDING_PAGE_WEBSITE',
    'EMAIL_NEWSLETTER',
    'OUTDOOR_BILLBOARD',
    'RADIO_TV_SCRIPT',
  ] as const),
  productCategory: z.enum(PRODUCT_CATEGORY_CODES).default('SAVINGS_DEPOSIT'),
  rawCopy: z.string().min(5, 'Marketing copy must be at least 5 characters').max(5000),
  targetAudience: z.string().optional(),
  organizationId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const startTime = performance.now();

  try {
    const body = await req.json();
    const validationResult = ScanRequestSchema.safeParse(body);

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

    const { campaignName, channel, productCategory, rawCopy, targetAudience, organizationId } =
      validationResult.data;

    // Resolve tenant identity from Clerk session or dev fallback
    const tenantCtx = await getTenantContext();
    const resolvedOrgId = tenantCtx.organizationId;
    const resolvedUserId = tenantCtx.userId;

    logger.info(
      {
        campaignName,
        channel,
        productCategory,
        copyLength: rawCopy.length,
        organizationId: resolvedOrgId,
        userId: resolvedUserId,
        isDevFallback: tenantCtx.isDevFallback,
      },
      'Received marketing pre-vetting scan request'
    );

    const shieldService = new MarketingShieldService(undefined, undefined, tenantCtx.dbClient);

    const viewModel = await shieldService.executeScan({
      organizationId: resolvedOrgId,
      userId: resolvedUserId,
      campaignName,
      channel: channel as MarketingChannel,
      productCategory: productCategory as ProductCategoryCode,
      rawCopy,
      targetAudienceDescription: targetAudience,
    });

    const elapsedMs = Math.round(performance.now() - startTime);

    return NextResponse.json({
      success: true,
      data: viewModel,
      elapsedMs,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Marketing Shield scan API failed');

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error processing marketing copy scan',
      },
      { status: 500 }
    );
  }
}
