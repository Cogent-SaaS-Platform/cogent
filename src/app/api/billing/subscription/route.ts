/**
 * Cogent Current Tenant Subscription Status & Real-Time Telemetry Route
 * GET /api/billing/subscription
 * 
 * Returns the active organization's subscription summary, real database usage counts,
 * and single-source-of-truth PLAN_CONFIG for Phase 6.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { COGENT_PLANS } from '@/shared/billing';
import {
  PLAN_CONFIG,
  PlanTier,
  resolveEffectiveTier,
  getPlanConfig,
  getLiveTenantUsage,
} from '@/lib/plans';
import { logger } from '@/shared/logger';
import { AppError } from '@/shared/errors';

export const dynamic = 'force-dynamic';

export async function GET(req?: NextRequest): Promise<NextResponse> {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    let { organizationId, subscription, dbClient } = tenantCtx;

    if (req && process.env.NODE_ENV !== 'production') {
      try {
        const url = new URL(req.url);
        const queryOrgId = url.searchParams.get('orgId');
        if (queryOrgId) organizationId = queryOrgId;
      } catch {
        // Ignore URL parse failure
      }
    }

    if (dbClient) {
      try {
        const subQuery = (dbClient.from('tenant_subscriptions') as any)
          .select('*')
          .eq('organization_id', organizationId);
        const { data: subRecord } = subQuery?.maybeSingle
          ? await subQuery.maybeSingle()
          : subQuery?.single
          ? await subQuery.single()
          : { data: null };

        if (subRecord) {
          const isExpiredTrial =
            subRecord.status === 'trialing' &&
            subRecord.trial_ends_at &&
            new Date(subRecord.trial_ends_at) < new Date();

          subscription = {
            ...subscription,
            tier: subRecord.tier || 'STARTER',
            status: subRecord.status || 'trialing',
            trialEndsAt: subRecord.trial_ends_at || null,
            isInternalDemoOrAdmin: tenantCtx.isInternalDemoOrAdmin || Boolean(subRecord.is_internal_demo_or_admin),
            isReadOnly: tenantCtx.isInternalDemoOrAdmin ? false : isExpiredTrial,
          };
        }
      } catch {
        // Safe fallback to tenantCtx.subscription
      }
    }

    if (tenantCtx.isInternalDemoOrAdmin) {
      subscription = {
        ...subscription,
        isInternalDemoOrAdmin: true,
      };
    }

    const effectiveTier: PlanTier = resolveEffectiveTier(
      subscription.tier,
      subscription.status
    );
    const planConfig = getPlanConfig(effectiveTier);

    // Compute trial countdown
    let daysRemaining = 7;
    if (subscription.trialEndsAt) {
      const trialEnds = new Date(subscription.trialEndsAt);
      const msLeft = trialEnds.getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    }

    // Query real live database counters
    const liveCounts = await getLiveTenantUsage(
      dbClient,
      organizationId,
      subscription.trialEndsAt
    );

    const telemetry = {
      organizationId,
      effectiveTier,
      status: subscription.status,
      isActive: subscription.isActive,
      isTrial: subscription.status === 'trialing',
      isReadOnly: subscription.isReadOnly,
      isInGracePeriod: subscription.isInGracePeriod,
      isInternalDemoOrAdmin: Boolean(tenantCtx.isInternalDemoOrAdmin),
      trialEndsAt: subscription.trialEndsAt,
      daysRemaining,
      usage: {
        marketingCampaigns: {
          used: liveCounts.campaignsCount,
          limit: planConfig.maxMarketingCampaignsPerMonth,
          isUnlimited: planConfig.maxMarketingCampaignsPerMonth === -1,
        },
        gapAnalyses: {
          used: liveCounts.gapAnalysesCount,
          limit: planConfig.maxGapAnalysesPerMonth,
          isUnlimited: planConfig.maxGapAnalysesPerMonth === -1,
        },
        regulationIngestions: {
          used: liveCounts.regulationIngestionsCount,
          limit: planConfig.maxCustomRegulationIngestionsPerMonth,
          isUnlimited: planConfig.maxCustomRegulationIngestionsPerMonth === -1,
        },
        policiesUploaded: {
          used: liveCounts.policiesCount,
          limit: planConfig.maxPoliciesUploaded,
          isUnlimited: planConfig.maxPoliciesUploaded === -1,
        },
        teamSeats: {
          used: liveCounts.seatsCount,
          limit: planConfig.maxSeats,
          isUnlimited: planConfig.maxSeats === -1,
        },
      },
      planConfig,
    };

    return NextResponse.json({
      success: true,
      tier: effectiveTier,
      isTrial: subscription.status === 'trialing',
      isExpired: subscription.isReadOnly,
      isInternalDemoOrAdmin: Boolean(tenantCtx.isInternalDemoOrAdmin),
      isAdminSwitcherAllowed: Boolean(
        process.env.NODE_ENV !== 'production' ||
        tenantCtx.isInternalDemoOrAdmin
      ),
      usage: {
        marketingCampaigns: liveCounts.campaignsCount,
        gapAnalyses: liveCounts.gapAnalysesCount,
        regulationIngestions: liveCounts.regulationIngestionsCount,
        policiesUploaded: liveCounts.policiesCount,
        teamSeats: liveCounts.seatsCount,
      },
      planConfig,
      data: {
        subscription,
        isSubscriptionActive: tenantCtx.isSubscriptionActive,
        isInternalDemoOrAdmin: Boolean(tenantCtx.isInternalDemoOrAdmin),
        isAdminSwitcherAllowed: Boolean(
          process.env.NODE_ENV !== 'production' ||
          tenantCtx.isInternalDemoOrAdmin
        ),
        organizationId,
        availablePlans: COGENT_PLANS,
        allPlans: PLAN_CONFIG,
        telemetry,
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
