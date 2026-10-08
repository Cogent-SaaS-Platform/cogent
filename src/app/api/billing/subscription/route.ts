/**
 * Cogent Current Tenant Subscription Status Route
 * GET /api/billing/subscription
 * 
 * Returns the active organization's subscription summary, tier limits,
 * and available plan pricing options.
 */

import { NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { COGENT_PLANS } from '@/shared/billing';
import { logger } from '@/shared/logger';
import { AppError } from '@/shared/errors';

export async function GET(): Promise<NextResponse> {
  try {
    const tenantCtx = await getTenantContext();

    return NextResponse.json({
      success: true,
      data: {
        subscription: tenantCtx.subscription,
        isSubscriptionActive: tenantCtx.isSubscriptionActive,
        organizationId: tenantCtx.organizationId,
        availablePlans: COGENT_PLANS,
      },
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json(err.toJSON(), { status: err.statusCode });
    }

    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(
      { error: error.message },
      'Failed to fetch tenant subscription status'
    );

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch subscription status',
      },
      { status: 500 }
    );
  }
}
