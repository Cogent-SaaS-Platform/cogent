import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MarketingShieldService } from '@/modules/marketing-shield';
import { MarketingChannel, ProductCategoryCode, PRODUCT_CATEGORY_CODES } from '@/shared/types';
import { getTenantContext } from '@/shared/auth';
import { checkRateLimit, createRateLimitResponse } from '@/shared/security';
import { EntitlementEngine } from '@/shared/billing';
import { AppError } from '@/shared/errors';
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

    const { campaignName, channel, productCategory, rawCopy, targetAudience } =
      validationResult.data;

    // Resolve tenant identity and active subscription state
    const tenantCtx = await getTenantContext();
    const resolvedOrgId = tenantCtx.organizationId;
    const resolvedUserId = tenantCtx.userId;

    // Upstash Rate Limiting Enforcement (Task A3.1)
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const rateLimitId =
        resolvedOrgId || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous';
      const limitResult = await checkRateLimit(rateLimitId, 'standard');
      if (!limitResult.success) {
        return createRateLimitResponse(limitResult);
      }
    }

    // Task A4.4 / A4.5: Feature Entitlement Gate
    // 1. Check current monthly usage if tier has a finite quota
    let currentMonthScanCount = 0;
    if (tenantCtx.subscription.marketingScanQuota !== -1 && !tenantCtx.isDevFallback) {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count } = await tenantCtx.dbClient
        .from('marketing_scans')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', resolvedOrgId)
        .gte('created_at', startOfMonth);

      currentMonthScanCount = count || 0;
    }

    // 2. Enforce active subscription and quota bounds (throws SubscriptionRequiredError on failure)
    EntitlementEngine.assertCanScan(tenantCtx.subscription, currentMonthScanCount);

    logger.info(
      {
        campaignName,
        channel,
        productCategory,
        copyLength: rawCopy.length,
        organizationId: resolvedOrgId,
        userId: resolvedUserId,
        isDevFallback: tenantCtx.isDevFallback,
        tier: tenantCtx.subscription.tier,
        status: tenantCtx.subscription.status,
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
  } catch (error: unknown) {
    if (error instanceof AppError) {
      logger.warn(
        { errorCode: error.code, statusCode: error.statusCode, message: error.message },
        'Marketing scan halted by application security or entitlement gate'
      );
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message, stack: err.stack }, 'Marketing Shield scan API failed');

    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal server error processing marketing copy scan',
      },
      { status: 500 }
    );
  }
}
