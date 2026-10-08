/**
 * Cogent Billing Initialization Route
 * POST /api/billing/initialize
 * 
 * Initializes a Paystack checkout session for the authenticated tenant.
 * Translates Tier and Interval into Amount in Kobo and Paystack Plan Code.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext, requireRole } from '@/shared/auth';
import { paystackClient, COGENT_PLANS } from '@/shared/billing';
import { logger } from '@/shared/logger';
import { AppError } from '@/shared/errors';
import { SubscriptionTier } from '@/shared/types';

const InitializeBillingSchema = z.object({
  tier: z.enum(['STARTER', 'PRO', 'ENTERPRISE'] as const),
  billingInterval: z.enum(['monthly', 'annual']).default('monthly'),
  callbackUrl: z.string().url().optional(),
  userEmail: z.string().email().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const tenantCtx = await getTenantContext();

    // Only org admins may initiate billing checkout
    if (!tenantCtx.isDevFallback && tenantCtx.userOrgRole) {
      await requireRole(tenantCtx, ['org:admin']);
    }

    const body = await req.json();
    const parseResult = InitializeBillingSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { tier, billingInterval, callbackUrl, userEmail } = parseResult.data;
    const planMeta = COGENT_PLANS[tier as SubscriptionTier];

    const amountInKobo =
      billingInterval === 'annual'
        ? planMeta.pricing.ngnAnnualKobo
        : planMeta.pricing.ngnMonthlyKobo;

    const planCode =
      billingInterval === 'annual'
        ? planMeta.paystackPlanCodeAnnual
        : planMeta.paystackPlanCodeMonthly;

    const resolvedCallbackUrl =
      callbackUrl ||
      `${req.nextUrl.origin}/settings?tab=plan&payment=callback`;

    // Attempt to acquire user email from request or fallback
    const email = userEmail || `${tenantCtx.userId}@tenant.cogent.africa`;

    logger.info(
      {
        organizationId: tenantCtx.organizationId,
        tier,
        billingInterval,
        amountInKobo,
        planCode,
      },
      'Initiating Paystack subscription checkout'
    );

    const initResult = await paystackClient.initializeSubscription({
      email,
      amountInKobo,
      planCode,
      callbackUrl: resolvedCallbackUrl,
      metadata: {
        organizationId: tenantCtx.organizationId,
        userId: tenantCtx.userId,
        tier: tier as SubscriptionTier,
        billingInterval,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        authorizationUrl: initResult.data.authorization_url,
        accessCode: initResult.data.access_code,
        reference: initResult.data.reference,
        amountInKobo,
        planCode,
        tier,
        billingInterval,
      },
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json(err.toJSON(), { status: err.statusCode });
    }

    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(
      { error: error.message, stack: error.stack },
      'Failed to initialize billing session'
    );

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error initializing payment',
      },
      { status: 500 }
    );
  }
}
