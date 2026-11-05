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

    if (req) {
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
          subscription = {
            ...subscription,
            tier: subRecord.tier || 'STARTER',
            status: subRecord.status || 'trialing',
            trialEndsAt: subRecord.trial_ends_at || null,
            isReadOnly:
              subRecord.status === 'trialing' &&
              subRecord.trial_ends_at &&
              new Date(subRecord.trial_ends_at) < new Date(),
          };
        }
      } catch {
        // Safe fallback to tenantCtx.subscription
      }
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
