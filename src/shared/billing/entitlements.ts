/**
 * Cogent Entitlement & Feature Gating Engine
 * Enforces tier quotas, grace periods, and read-only archive fallbacks.
 * Adheres strictly to docs/launch/PHASE_A4_BILLING_SUBSCRIPTIONS.md
 */

import { SubscriptionRequiredError } from '@/shared/errors';
import {
  TenantSubscriptionSummary,
  SubscriptionTier,
  PlanLimits,
} from '@/shared/types';
import { COGENT_PLANS } from './paystackClient';

export class EntitlementEngine {
  /**
   * Evaluates whether the tenant is permitted to run a new Marketing Shield pre-vetting scan.
   * Throws SubscriptionRequiredError if in read-only mode or quota is exceeded.
   */
  public static assertCanScan(
    subscription: TenantSubscriptionSummary,
    currentUsageCount = 0
  ): void {
    this.assertEngineActive(subscription, 'Marketing Shield pre-vetting scan');

    if (
      subscription.marketingScanQuota !== -1 &&
      currentUsageCount >= subscription.marketingScanQuota
    ) {
      throw new SubscriptionRequiredError(
        `QUOTA_EXCEEDED: You have reached your monthly limit of ${subscription.marketingScanQuota} marketing scans for the ${subscription.tier} tier. Please upgrade your plan for higher or unlimited volume.`,
        {
          tier: subscription.tier,
          quota: subscription.marketingScanQuota,
          currentUsage: currentUsageCount,
          actionUrl: '/settings?tab=plan',
        }
      );
    }
  }

  /**
   * Evaluates whether the tenant is permitted to run AI-powered statutory rewrites.
   */
  public static assertCanGenerateRewrite(
    subscription: TenantSubscriptionSummary,
    currentUsageCount = 0
  ): void {
    this.assertEngineActive(subscription, 'AI statutory conversion rewrite');

    const limits = COGENT_PLANS[subscription.tier].limits;
    if (
      limits.aiRewritesPerMonth !== -1 &&
      currentUsageCount >= limits.aiRewritesPerMonth
    ) {
      throw new SubscriptionRequiredError(
        `QUOTA_EXCEEDED: You have reached your monthly limit of ${limits.aiRewritesPerMonth} AI rewrites on the ${subscription.tier} tier. Upgrade to Pro for unlimited rewrites.`,
        {
          tier: subscription.tier,
          quota: limits.aiRewritesPerMonth,
          currentUsage: currentUsageCount,
          actionUrl: '/settings?tab=plan',
        }
      );
    }
  }

  /**
   * Evaluates whether the tenant can ingest and evaluate a new internal corporate policy in the Gap Matrix.
   */
  public static assertCanEvaluatePolicy(
    subscription: TenantSubscriptionSummary,
    currentPolicyCount = 0
  ): void {
    this.assertEngineActive(subscription, '5-W Gap Matrix policy evaluation');

    if (
      subscription.policyDocumentQuota !== -1 &&
      currentPolicyCount >= subscription.policyDocumentQuota
    ) {
      throw new SubscriptionRequiredError(
        `QUOTA_EXCEEDED: You have reached your active policy document limit (${subscription.policyDocumentQuota} policies) for the ${subscription.tier} tier. Please upgrade to evaluate additional corporate policies.`,
        {
          tier: subscription.tier,
          quota: subscription.policyDocumentQuota,
          currentPolicyCount,
          actionUrl: '/settings?tab=plan',
        }
      );
    }
  }

  /**
   * Evaluates whether the tenant is eligible to export full cryptographic defense packs.
   */
  public static assertCanExportCryptographicPack(
    subscription: TenantSubscriptionSummary
  ): void {
    this.assertEngineActive(subscription, 'Cryptographic Bank Examiner Defense Pack export');

    if (subscription.tier === 'STARTER' && subscription.status !== 'trialing') {
      throw new SubscriptionRequiredError(
        'PLAN_UPGRADE_REQUIRED: Full cryptographic Bank Examiner Defense Packs and tamper-evident ZIP bundles require Cogent Pro or Enterprise tier.',
        {
          currentTier: subscription.tier,
          requiredTier: 'PRO',
          actionUrl: '/settings?tab=plan',
        }
      );
    }
  }

  /**
   * Evaluates whether the tenant can receive automated real-time compliance cascades.
   */
  public static assertCanAccessCascade(
    subscription: TenantSubscriptionSummary
  ): void {
    this.assertEngineActive(subscription, 'Real-time compliance cascade automation');

    if (subscription.tier === 'STARTER' && subscription.status !== 'trialing') {
      throw new SubscriptionRequiredError(
        'PLAN_UPGRADE_REQUIRED: Real-time automated circular-to-policy compliance cascades require Cogent Pro or Enterprise tier.',
        {
          currentTier: subscription.tier,
          requiredTier: 'PRO',
          actionUrl: '/settings?tab=plan',
        }
      );
    }
  }

  /**
   * Core assertion verifying that the tenant is NOT in read-only archive mode.
   * If the account is past due (beyond 7-day grace), trialing expired, or canceled,
   * heavy computation is halted while allowing historic data access.
   */
  public static assertEngineActive(
    subscription: TenantSubscriptionSummary,
    actionDescription: string
  ): void {
    if (subscription.isReadOnly) {
      let reasonMessage = `Your organization's subscription is currently ${subscription.status}.`;
      if (subscription.status === 'trialing') {
        reasonMessage = 'Your 14-day free trial period has concluded.';
      } else if (subscription.status === 'past_due') {
        reasonMessage = 'Your billing payment is past due and the 7-day grace period has expired.';
      } else if (subscription.status === 'canceled') {
        reasonMessage = 'Your subscription has been canceled.';
      }

      throw new SubscriptionRequiredError(
        `SUBSCRIPTION_REQUIRED: ${reasonMessage} Cannot perform ${actionDescription}. Your historical audit trails and existing scans remain preserved in read-only mode. Please update your payment method to reactivate active compliance analysis.`,
        {
          status: subscription.status,
          tier: subscription.tier,
          isReadOnly: true,
          actionUrl: '/settings?tab=plan',
        }
      );
    }
  }

  /**
   * Computes a normalized TenantSubscriptionSummary from raw database records.
   */
  public static computeSummary(params: {
    tier?: SubscriptionTier;
    status?: string;
    trialEndsAt?: string | null;
    gracePeriodEndsAt?: string | null;
    currentPeriodEnd?: string | null;
    marketingScanQuota?: number;
    policyDocumentQuota?: number;
    paystackSubscriptionCode?: string | null;
    paystackPlanCode?: string | null;
  }): TenantSubscriptionSummary {
    const tier = (params.tier || 'STARTER') as SubscriptionTier;
    const rawStatus = params.status || 'trialing';
    const now = new Date();

    let status = rawStatus as TenantSubscriptionSummary['status'];
    let isInGracePeriod = false;
    let isReadOnly = false;

    if (status === 'trialing') {
      const trialEnds = params.trialEndsAt ? new Date(params.trialEndsAt) : null;
      if (trialEnds && trialEnds < now) {
        isReadOnly = true;
      }
    } else if (status === 'past_due') {
      const graceEnds = params.gracePeriodEndsAt ? new Date(params.gracePeriodEndsAt) : null;
      if (graceEnds && graceEnds > now) {
        isInGracePeriod = true;
        isReadOnly = false;
      } else {
        isReadOnly = true;
      }
    } else if (status === 'canceled' || status === 'unpaid') {
      isReadOnly = true;
    }

    const isActive = !isReadOnly;

    const defaultLimits = COGENT_PLANS[tier].limits;

    return {
      tier,
      status,
      isActive,
      isInGracePeriod,
      isReadOnly,
      trialEndsAt: params.trialEndsAt || null,
      gracePeriodEndsAt: params.gracePeriodEndsAt || null,
      currentPeriodEnd: params.currentPeriodEnd || null,
      marketingScanQuota: params.marketingScanQuota ?? defaultLimits.marketingScansPerMonth,
      policyDocumentQuota: params.policyDocumentQuota ?? defaultLimits.policyDocuments,
      paystackSubscriptionCode: params.paystackSubscriptionCode || null,
      paystackPlanCode: params.paystackPlanCode || null,
    };
  }

  /**
   * Returns limits for a given subscription tier.
   */
  public static getLimits(tier: SubscriptionTier): PlanLimits {
    return COGENT_PLANS[tier].limits;
  }
}
