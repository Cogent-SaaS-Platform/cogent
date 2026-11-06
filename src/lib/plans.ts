/**
 * Cogent Enterprise SaaS Plan Architecture & Production Entitlement Matrix
 * Single source-of-truth configuration shared by backend API guards and frontend UI components.
 * 
 * Aligned with Phase 1-5 production rebuild:
 * - Horizon Scanning (/insight)
 * - Regulation Library & Obligations (/library)
 * - 5-W Policy Concordance Gap Matrix (/gap)
 * - Marketing Shield Studio (/marketing)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database, createAdminClient } from '@/shared/db';
import { logger } from '@/shared/logger';

export type PlanTier = 'TRIAL' | 'STARTER' | 'PRO' | 'ENTERPRISE' | 'FOUNDER_ADMIN';

/**
 * Checks whether an email address is listed in the FOUNDER_ADMIN_EMAILS environment variable allowlist.
 */
export function isFounderAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const allowlistRaw = process.env.FOUNDER_ADMIN_EMAILS || '';
  const allowlist = allowlistRaw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowlist.includes(email.trim().toLowerCase());
}

export interface PlanPricingInfo {
  usdMonthly: number;
  usdAnnual: number;
  ngnMonthlyKobo: number;
  ngnAnnualKobo: number;
  ngnMonthlyFormatted: string;
  ngnAnnualFormatted: string;
}

export interface PlanEntitlements {
  tier: PlanTier;
  name: string;
  badge: string;
  description: string;
  durationDays?: number; // 7 for TRIAL
  maxSeats: number; // -1 for unlimited
  maxRegulatorsMonitored: number; // -1 for all
  maxCustomRegulationIngestionsPerMonth: number; // -1 for unlimited
  canEditObligationCriteria: boolean; // inline ✎ editing of obligations & criteria
  maxPoliciesUploaded: number; // -1 for unlimited
  maxGapAnalysesPerMonth: number; // -1 for unlimited
  canRunMultiRegGapAnalysis: boolean; // Multi-Regulation vs Multi-Policy
  maxMarketingCampaignsPerMonth: number; // -1 for unlimited
  maxInlineRewritesPerMonth: number; // -1 for unlimited
  canAddCustomMarketingRules: boolean; // + Add Rule in Marketing Knowledge Base
  canExportDossierPdf: boolean; // Pre-clearance PDF export
  canExportCryptographicBundle: boolean; // Cryptographic ARCON / Examiner ZIP pack
  canAccessDepartmentalBriefs: boolean; // Full 6-role departmental supervisory briefs
  auditRetentionDays: number; // 7, 90, 365, 2555 (7-Year BOFIA)
  monthlyPriceUsd: number;
  monthlyPriceNgn: number;
  pricing: PlanPricingInfo;
  features: string[];
}

export const PLAN_CONFIG: Record<PlanTier, PlanEntitlements> = {
  TRIAL: {
    tier: 'TRIAL',
    name: '7-Day Institutional Evaluation Pilot',
    badge: 'Free 7-Day Evaluation',
    description: 'Full evaluation access across Horizon Scanning, Regulation Library, Gap Analysis, and Marketing Shield.',
    durationDays: 7,
    monthlyPriceUsd: 0,
    monthlyPriceNgn: 0,
    maxSeats: 2,
    maxRegulatorsMonitored: 1, // 1 Core regulator feed
    maxCustomRegulationIngestionsPerMonth: 1, // Can test uploading 1 PDF or URL
    canEditObligationCriteria: false, // View-only criteria; inline ✎ requires Pro
    maxPoliciesUploaded: 1,
    maxGapAnalysesPerMonth: 1, // Single Regulation vs Single Policy
    canRunMultiRegGapAnalysis: false, // Multi-Regulation requires Pro
    maxMarketingCampaignsPerMonth: 3, // Full access to Split-Screen Studio
    maxInlineRewritesPerMonth: 10,
    canAddCustomMarketingRules: false, // + Add Rule requires Pro
    canExportDossierPdf: false, // Requires Starter / Pro
    canExportCryptographicBundle: false,
    canAccessDepartmentalBriefs: false, // Departmental Briefs preview limited to 3 views
    auditRetentionDays: 7, // 7-day evaluation retention; transitions to Read-Only after Day 7
    pricing: {
      usdMonthly: 0,
      usdAnnual: 0,
      ngnMonthlyKobo: 0,
      ngnAnnualKobo: 0,
      ngnMonthlyFormatted: '₦0',
      ngnAnnualFormatted: '₦0',
    },
    features: [
      '1 Core regulator feed in Horizon Scanning',
      '1 Custom PDF/URL regulation ingestion + Split-Screen Inspector',
      '1 Internal policy manual & 1 Single-Reg Gap Analysis',
      '3 Marketing Studio campaigns total + 10 inline rewrites',
      'Up to 2 team seats with evaluation access',
      '7-Day evaluation data retention (Read-only archive fallback)',
    ],
  },

  STARTER: {
    tier: 'STARTER',
    name: 'Starter Tier',
    badge: 'Seed FinTechs & MFBs',
    description: 'Essential pre-vetting for marketing copy and single-license regulatory circular monitoring.',
    maxSeats: 3,
    maxRegulatorsMonitored: 2, // 2 Core regulator feeds
    maxCustomRegulationIngestionsPerMonth: 5, // 5 PDF or Web URL ingestions
    canEditObligationCriteria: false, // View-only; ✎ editing requires Pro
    maxPoliciesUploaded: 3,
    maxGapAnalysesPerMonth: 5, // Single Regulation vs Single Policy
    canRunMultiRegGapAnalysis: false, // Multi-Regulation requires Pro
    maxMarketingCampaignsPerMonth: 25,
    maxInlineRewritesPerMonth: 100,
    canAddCustomMarketingRules: false, // + Add Rule requires Pro
    canExportDossierPdf: true, // Standard Pre-Clearance PDF Dossier
    canExportCryptographicBundle: false,
    canAccessDepartmentalBriefs: false,
    auditRetentionDays: 90, // 90-day cryptographic audit logs
    monthlyPriceUsd: 199,
    monthlyPriceNgn: 300000,
    pricing: {
      usdMonthly: 199,
      usdAnnual: 1990,
      ngnMonthlyKobo: 30000000, // ₦300,000.00
      ngnAnnualKobo: 300000000, // ₦3,000,000.00
      ngnMonthlyFormatted: '₦300,000',
      ngnAnnualFormatted: '₦3,000,000',
    },
    features: [
      '25 Marketing Studio campaigns / month',
      '100 Inline Canvas compliant rewrites / month',
      'Standard Pre-Clearance PDF Dossier export',
      '2 Core regulator feeds in Horizon Scanning',
      '5 Custom PDF/URL regulation ingestions / month',
      'Up to 3 internal policies & 5 Gap Analyses / month',
      'Up to 3 team seats with RBAC & 90-day audit logs',
    ],
  },

  PRO: {
    tier: 'PRO',
    name: 'Pro Tier',
    badge: 'Most Popular for FinTechs & MMOs',
    description: 'Unlimited marketing campaigns, multimodal flyer vision audits, criteria editing, and multi-reg gap analysis.',
    maxSeats: 10,
    maxRegulatorsMonitored: -1, // All 7 Nigerian Regulators (CBN, NDPC, SEC, FCCPC, ARCON, NFIU, NDIC)
    maxCustomRegulationIngestionsPerMonth: -1, // UNLIMITED PDF & Web URL regulation ingestions
    canEditObligationCriteria: true, // Full Inline Editing (✎) of Obligations & Assessment Criteria
    maxPoliciesUploaded: 15,
    maxGapAnalysesPerMonth: -1, // UNLIMITED Multi-Regulation vs Multi-Policy Gap Analysis
    canRunMultiRegGapAnalysis: true,
    maxMarketingCampaignsPerMonth: -1, // UNLIMITED Campaigns
    maxInlineRewritesPerMonth: -1, // UNLIMITED Inline Rewrites
    canAddCustomMarketingRules: true, // Custom Knowledge Base Rules (+ Add Rule)
    canExportDossierPdf: true,
    canExportCryptographicBundle: true, // Full Signed ARCON Pre-Clearance ZIP Bundle
    canAccessDepartmentalBriefs: true, // Full 6-Role Departmental Supervisory Briefs
    auditRetentionDays: 365, // 1-Year (365-Day) immutable audit retention
    monthlyPriceUsd: 549,
    monthlyPriceNgn: 850000,
    pricing: {
      usdMonthly: 549,
      usdAnnual: 5490,
      ngnMonthlyKobo: 85000000, // ₦850,000.00
      ngnAnnualKobo: 850000000, // ₦8,500,000.00
      ngnMonthlyFormatted: '₦850,000',
      ngnAnnualFormatted: '₦8,500,000',
    },
    features: [
      'Unlimited Marketing Studio campaigns & inline rewrites',
      'Multimodal Ad Flyer & Image compliance auditing',
      'Custom Marketing Knowledge Base rules (+ Add Rule)',
      'All 7 Nigerian regulators + 6-Role Departmental Briefs',
      'Unlimited PDF/URL regulation ingestions & Criteria editing (✎)',
      'Multi-Regulation vs. Multi-Policy Gap Analysis (15 policies)',
      'Pre-cleared policy remediation drafting & Action Plans',
      'Up to 10 team seats & 1-Year immutable audit retention',
    ],
  },

  ENTERPRISE: {
    tier: 'ENTERPRISE',
    name: 'Enterprise Tier',
    badge: 'Commercial Banks & HoldCos',
    description: 'Unlimited institutional defense, multi-entity holding architecture, bespoke baselines, and 7-year audit retention.',
    maxSeats: -1, // UNLIMITED - Includes SAML SSO & Multi-Entity Holding Architecture
    maxRegulatorsMonitored: -1, // All Nigerian + Global Regulators & Custom Statutory Feeds
    maxCustomRegulationIngestionsPerMonth: -1, // UNLIMITED
    canEditObligationCriteria: true,
    maxPoliciesUploaded: -1, // UNLIMITED
    maxGapAnalysesPerMonth: -1, // UNLIMITED Multi-Regulation & Bank Examiner Defense Packs
    canRunMultiRegGapAnalysis: true,
    maxMarketingCampaignsPerMonth: -1, // UNLIMITED + Bulk Campaign API
    maxInlineRewritesPerMonth: -1,
    canAddCustomMarketingRules: true,
    canExportDossierPdf: true,
    canExportCryptographicBundle: true,
    canAccessDepartmentalBriefs: true,
    auditRetentionDays: 2555, // 7-Year BOFIA 2020 Statutory Audit Retention
    monthlyPriceUsd: 1999,
    monthlyPriceNgn: 3000000,
    pricing: {
      usdMonthly: 1999,
      usdAnnual: 19990,
      ngnMonthlyKobo: 300000000, // ₦3,000,000.00
      ngnAnnualKobo: 3000000000, // ₦30,000,000.00
      ngnMonthlyFormatted: '₦3,000,000',
      ngnAnnualFormatted: '₦30,000,000',
    },
    features: [
      'Unlimited capacity across Horizon, Library, Gap & Marketing',
      'Multi-entity holding group & subsidiary license architecture',
      'Bank Examiner Audit Defense Dossier exports',
      'Custom statutory baseline feeds & webhook integrations',
      '7-Year BOFIA 2020 statutory audit trail retention',
      'Unlimited seats, SAML/SSO & Dedicated Concierge (<2h SLA)',
    ],
  },

  FOUNDER_ADMIN: {
    tier: 'FOUNDER_ADMIN',
    name: 'Founder / Demo Super-Admin (Unlimited)',
    badge: 'Founder Super-Admin',
    description: 'Internal demo & executive super-admin override with unlimited institutional capacity across all modules.',
    maxSeats: -1,
    maxRegulatorsMonitored: -1,
    maxCustomRegulationIngestionsPerMonth: -1,
    canEditObligationCriteria: true,
    maxPoliciesUploaded: -1,
    maxGapAnalysesPerMonth: -1,
    canRunMultiRegGapAnalysis: true,
    maxMarketingCampaignsPerMonth: -1,
    maxInlineRewritesPerMonth: -1,
    canAddCustomMarketingRules: true,
    canExportDossierPdf: true,
    canExportCryptographicBundle: true,
    canAccessDepartmentalBriefs: true,
    auditRetentionDays: 2555,
    monthlyPriceUsd: 0,
    monthlyPriceNgn: 0,
    pricing: {
      usdMonthly: 0,
      usdAnnual: 0,
      ngnMonthlyKobo: 0,
      ngnAnnualKobo: 0,
      ngnMonthlyFormatted: '₦0',
      ngnAnnualFormatted: '₦0',
    },
    features: [
      'Founder & Executive Demo Super-Admin Privileges',
      'Zero trial expiration lockouts & unlimited quota bypass',
      'All 7 Nigerian apex regulators + custom statutory baselines',
      'Unlimited custom PDF/URL regulation ingestions & Criteria editing (✎)',
      'Unlimited Multi-Regulation vs Multi-Policy Gap Analysis & Examiner Packs',
      'Unlimited Marketing Studio campaigns, flyer vision audits & rewrites',
      'Full Cryptographic ARCON ZIP Pre-Clearance Dossiers',
      'Interactive Admin Plan Switcher enabled in Settings',
    ],
  },
};

export type EntitlementActionType =
  | 'CUSTOM_REGULATION_INGEST'
  | 'EDIT_OBLIGATION_CRITERIA'
  | 'POLICY_UPLOAD'
  | 'GAP_ANALYSIS_RUN'
  | 'MARKETING_CAMPAIGN_CREATE'
  | 'MARKETING_INLINE_REWRITE'
  | 'MARKETING_CUSTOM_RULE'
  | 'DOSSIER_PDF_EXPORT'
  | 'CRYPTOGRAPHIC_BUNDLE_EXPORT'
  | 'DEPARTMENTAL_BRIEFS_ACCESS';

export interface EntitlementCheckResult {
  allowed: boolean;
  statusCode: number; // 200 if allowed, 402 or 403 if restricted
  errorPayload?: {
    success: false;
    error: string;
    code: 'PLAN_LIMIT_REACHED' | 'TRIAL_EXPIRED' | 'SUBSCRIPTION_REQUIRED';
    requiredPlan: PlanTier;
    featureName: string;
    currentUsage?: number;
    maxAllowed?: number;
    actionUrl: string;
    isReadOnly?: boolean;
  };
}

export interface TenantLiveUsage {
  marketingCampaigns: { used: number; limit: number; isUnlimited: boolean };
  gapAnalyses: { used: number; limit: number; isUnlimited: boolean };
  regulationIngestions: { used: number; limit: number; isUnlimited: boolean };
  policiesUploaded: { used: number; limit: number; isUnlimited: boolean };
  teamSeats: { used: number; limit: number; isUnlimited: boolean };
}

export interface TenantTelemetrySummary {
  organizationId: string;
  effectiveTier: PlanTier;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  isActive: boolean;
  isTrial: boolean;
  isReadOnly: boolean;
  isInGracePeriod: boolean;
  trialEndsAt: string | null;
  daysRemaining: number;
  usage: TenantLiveUsage;
  limits: PlanEntitlements;
}

/**
 * Resolves the effective plan tier for an organization.
 * If status is trialing, effective tier is TRIAL.
 * Otherwise returns the commercial tier (STARTER, PRO, ENTERPRISE).
 */
export function resolveEffectiveTier(
  rawTierOrRecord?:
    | string
    | null
    | { tier?: string | null; status?: string | null; trialEndsAt?: string | null },
  rawStatus?: string | null,
  rawTrialEndsAt?: string | null
): any {
  let tier: string | null = null;
  let status: string | null = null;
  let trialEndsAt: string | null = null;
  let isObjectCall = false;

  if (typeof rawTierOrRecord === 'object' && rawTierOrRecord !== null) {
    isObjectCall = true;
    tier = rawTierOrRecord.tier || null;
    status = rawTierOrRecord.status || null;
    trialEndsAt = rawTierOrRecord.trialEndsAt || null;
  } else {
    tier = rawTierOrRecord || null;
    status = rawStatus || null;
    trialEndsAt = rawTrialEndsAt || null;
  }

  const normalizedStatus = (status || '').toLowerCase();
  const normalizedTier = (tier || '').toUpperCase();
  const isTrial = normalizedStatus === 'trialing' || normalizedTier === 'TRIAL';

  let isExpired = false;
  let daysRemaining: number | null = null;

  if (isTrial && trialEndsAt) {
    const diffMs = new Date(trialEndsAt).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    if (diffMs <= 0) {
      isExpired = true;
    }
  }

  let effectiveTier: PlanTier = 'STARTER';
  if (normalizedTier === 'FOUNDER_ADMIN') {
    effectiveTier = 'FOUNDER_ADMIN';
  } else if (isTrial) {
    effectiveTier = 'TRIAL';
  } else if (normalizedTier === 'ENTERPRISE') {
    effectiveTier = 'ENTERPRISE';
  } else if (normalizedTier === 'PRO') {
    effectiveTier = 'PRO';
  }

  if (isObjectCall) {
    return {
      effectiveTier,
      isTrial,
      isExpired,
      daysRemaining,
    };
  }

  return effectiveTier;
}

/**
 * Retrieves the configuration for a given plan tier.
 */
export function getPlanConfig(tier: PlanTier | string): PlanEntitlements {
  const normalized = (tier || 'STARTER').toUpperCase() as PlanTier;
  return PLAN_CONFIG[normalized] || PLAN_CONFIG.STARTER;
}

/**
 * Collects live usage counts directly from Supabase tables for an organization.
 */
export async function getLiveTenantUsage(
  dbClient: SupabaseClient<Database>,
  organizationId: string,
  cycleStartIso?: string | null
): Promise<{
  campaignsCount: number;
  gapAnalysesCount: number;
  regulationIngestionsCount: number;
  policiesCount: number;
  seatsCount: number;
}> {
  try {
    const cycleStart = cycleStartIso || new Date(Date.now() - 30 * 86400000).toISOString();

    const fetchCampaigns = async () => {
      try {
        const q = dbClient.from('marketing_campaigns').select('*', { count: 'exact', head: true });
        return q.eq ? await q.eq('organization_id', organizationId) : await q;
      } catch {
        return { count: 0 };
      }
    };

    const fetchGaps = async () => {
      try {
        const q = (dbClient.from('gap_evaluations') as any).select('*', { count: 'exact', head: true });
        return q.eq ? await q.eq('organization_id', organizationId) : await q;
      } catch {
        return { count: 0 };
      }
    };

    const fetchPolicies = async () => {
      try {
        const q = dbClient.from('policy_documents').select('*', { count: 'exact', head: true });
        return q.eq ? await q.eq('organization_id', organizationId) : await q;
      } catch {
        return { count: 0 };
      }
    };

    const fetchRegs = async () => {
      try {
        const q = (dbClient.from('regulatory_instruments') as any).select('*', { count: 'exact', head: true });
        if (q.eq) return await q.eq('organization_id', organizationId);
        return await q;
      } catch {
        return { count: 0 };
      }
    };

    const fetchMembers = async () => {
      try {
        const q = (dbClient as any).from('organization_memberships').select('*', { count: 'exact', head: true });
        return q.eq ? await q.eq('organization_id', organizationId) : await q;
      } catch {
        return { count: 1 };
      }
    };

    const [campaignsRes, gapRes, policiesRes, regsRes, membersRes] = await Promise.all([
      fetchCampaigns(),
      fetchGaps(),
      fetchPolicies(),
      fetchRegs(),
      fetchMembers(),
    ]);

    const campaignsCount = campaignsRes?.count ?? 0;
    const gapAnalysesCount = gapRes?.count ?? 0;
    const policiesCount = policiesRes?.count ?? 0;
    const regulationIngestionsCount = regsRes?.count ?? 0;
    const seatsCount = Math.max(membersRes?.count ?? 1, 1);

    return {
      campaignsCount,
      gapAnalysesCount,
      regulationIngestionsCount,
      policiesCount,
      seatsCount,
    };
  } catch (err) {
    logger.warn({ err, organizationId }, 'Error calculating live tenant usage counters; using safe fallbacks');
    return {
      campaignsCount: 0,
      gapAnalysesCount: 0,
      regulationIngestionsCount: 0,
      policiesCount: 0,
      seatsCount: 1,
    };
  }
}

export interface EntitlementErrorPayload {
  error: string;
  code: string;
  success?: boolean;
  featureName?: string;
  requiredPlan?: PlanTier;
  currentUsage?: number;
  maxAllowed?: number;
  isReadOnly?: boolean;
  actionUrl?: string;
  [key: string]: any;
}

function formatRejection(statusCode: number, payload: EntitlementErrorPayload) {
  return {
    allowed: false,
    statusCode,
    code: payload.code,
    requiredPlan: payload.requiredPlan,
    featureName: payload.featureName,
    reason: payload.error,
    error: payload.error,
    currentUsage: payload.currentUsage,
    maxAllowed: payload.maxAllowed,
    isReadOnly: payload.isReadOnly,
    errorPayload: payload,
  };
}

/**
 * Server-side quota & feature verification guard.
 * Returns structured 402/403 payload when limits are exceeded.
 */
export async function verifyEntitlement(
  dbClientOrOrgId: any,
  orgIdOrAction: any,
  actionOrOptions?: any,
  maybeOptions?: any
): Promise<any> {
  let dbClient: SupabaseClient<Database>;
  let organizationId: string;
  let action: EntitlementActionType;
  let options: any = {};

  if (typeof dbClientOrOrgId === 'string') {
    organizationId = dbClientOrOrgId;
    dbClient = createAdminClient();
    if (typeof orgIdOrAction === 'string') {
      action = orgIdOrAction as EntitlementActionType;
      options = actionOrOptions || {};
    } else {
      action = orgIdOrAction?.action;
      options = orgIdOrAction || {};
    }
  } else {
    dbClient = dbClientOrOrgId;
    organizationId = orgIdOrAction;
    action = actionOrOptions;
    options = maybeOptions || {};
  }

  try {
    // 1. Fetch tenant subscription record and organization metadata
    const subQuery = (dbClient.from('tenant_subscriptions') as any)
      .select('*')
      .eq('organization_id', organizationId);
    const orgQuery = (dbClient.from('organizations') as any)
      .select('is_internal_demo_or_admin')
      .eq('id', organizationId);

    const [subRes, orgRes] = await Promise.all([
      subQuery?.maybeSingle ? subQuery.maybeSingle() : subQuery?.single ? subQuery.single() : Promise.resolve({ data: null }),
      orgQuery?.maybeSingle ? orgQuery.maybeSingle() : orgQuery?.single ? orgQuery.single() : Promise.resolve({ data: null }),
    ]).catch(() => [{ data: null }, { data: null }]);

    const subData = subRes?.data || null;
    const orgData = orgRes?.data || null;

    const isOrgFounderAdmin = Boolean(orgData?.is_internal_demo_or_admin || subData?.is_internal_demo_or_admin);
    const isUserFounderAdmin = Boolean(
      options?.isInternalDemoOrAdmin ||
      (options?.userEmail && isFounderAdminEmail(options.userEmail))
    );
    const isInternalDemoOrAdmin = isOrgFounderAdmin || isUserFounderAdmin;

    const isDevOrg = organizationId === '00000000-0000-0000-0000-000000000001' || !organizationId;
    const rawStatus = subData?.status || (isDevOrg || isInternalDemoOrAdmin ? 'active' : 'trialing');
    const rawTier = subData?.tier || (isInternalDemoOrAdmin ? 'FOUNDER_ADMIN' : isDevOrg ? 'PRO' : 'STARTER');
    const trialEndsAt = subData?.trial_ends_at || null;
    const now = new Date();

    const isTrial = rawStatus === 'trialing';
    let isReadOnly = false;

    if (isTrial && trialEndsAt && new Date(trialEndsAt) < now) {
      isReadOnly = isInternalDemoOrAdmin ? Boolean(options?.simulateExpired) : true;
    } else if (rawStatus === 'canceled' || rawStatus === 'unpaid') {
      isReadOnly = true;
    }

    const effectiveTier = resolveEffectiveTier(rawTier, rawStatus);

    // 2. Founder Super-Admin Unlimited Entitlement Override
    // Bypasses all quota checks with unlimited capacity and zero lockouts across all modules
    if (effectiveTier === 'FOUNDER_ADMIN' || (isInternalDemoOrAdmin && !isReadOnly && effectiveTier === 'ENTERPRISE')) {
      return { allowed: true, statusCode: 200, isFounderAdmin: true };
    }

    // 3. Immediate Trial Expiration / Read-Only Gate
    if (isReadOnly) {
      return formatRejection(402, {
        success: false,
        error:
          'Your 7-day institutional evaluation trial has concluded. Your workspace is currently in Read-Only Archive Mode. Please upgrade to continue active compliance analysis.',
        code: 'TRIAL_EXPIRED',
        requiredPlan: 'STARTER',
        featureName: 'Live Compliance Workspace',
        actionUrl: '/settings?tab=plan',
        isReadOnly: true,
      });
    }

    const plan = PLAN_CONFIG[effectiveTier as PlanTier] || PLAN_CONFIG.STARTER;

    // 3. Action-Specific Entitlement Gates
    switch (action) {
      case 'CUSTOM_REGULATION_INGEST': {
        const usage = await getLiveTenantUsage(dbClient, organizationId);
        if (
          plan.maxCustomRegulationIngestionsPerMonth !== -1 &&
          usage.regulationIngestionsCount >= plan.maxCustomRegulationIngestionsPerMonth
        ) {
          return formatRejection(402, {
            success: false,
            error: `You have reached your limit of ${plan.maxCustomRegulationIngestionsPerMonth} custom regulation ingestion(s) on the ${plan.name}. Upgrade to Pro for unlimited custom PDF & URL regulation ingestions.`,
            code: 'PLAN_LIMIT_REACHED',
            requiredPlan: 'PRO',
            featureName: 'Custom Regulation Ingestions',
            currentUsage: usage.regulationIngestionsCount,
            maxAllowed: plan.maxCustomRegulationIngestionsPerMonth,
            actionUrl: '/settings?tab=plan',
          });
        }
        break;
      }

      case 'EDIT_OBLIGATION_CRITERIA': {
        if (!plan.canEditObligationCriteria) {
          return formatRejection(403, {
            success: false,
            error:
              'Inline editing (✎) of regulatory obligations and testable assessment criteria requires the Cogent Pro Tier.',
            code: 'PLAN_LIMIT_REACHED',
            requiredPlan: 'PRO',
            featureName: 'Obligation & Assessment Criteria Editing (✎)',
            actionUrl: '/settings?tab=plan',
          });
        }
        break;
      }

      case 'POLICY_UPLOAD': {
        const usage = await getLiveTenantUsage(dbClient, organizationId);
        if (
          plan.maxPoliciesUploaded !== -1 &&
          usage.policiesCount >= plan.maxPoliciesUploaded
        ) {
          return formatRejection(402, {
            success: false,
            error: `You have reached your policy document limit (${plan.maxPoliciesUploaded} document${plan.maxPoliciesUploaded === 1 ? '' : 's'}) on the ${plan.name}. Upgrade to Pro to evaluate up to 15 corporate policies.`,
            code: 'PLAN_LIMIT_REACHED',
            requiredPlan: 'PRO',
            featureName: 'Internal Corporate Policy Uploads',
            currentUsage: usage.policiesCount,
            maxAllowed: plan.maxPoliciesUploaded,
            actionUrl: '/settings?tab=plan',
          });
        }
        break;
      }

      case 'GAP_ANALYSIS_RUN': {
        // Multi-reg vs multi-policy check
        const regCount = options?.regulationCount ?? options?.regulationIds?.length ?? 1;
        const polCount = options?.policyCount ?? options?.policyIds?.length ?? 1;
        const isMulti = options?.isMultiRegOrPolicy || regCount > 1 || polCount > 1;

        if (isMulti && !plan.canRunMultiRegGapAnalysis) {
          return formatRejection(403, {
            success: false,
            error:
              'Multi-Regulation vs. Multi-Policy Gap Analysis is a Pro Tier capability. Starter and 7-Day Trial plans allow Single Regulation vs. Single Policy analysis. Upgrade to Pro for multi-statutory matrix benchmarking.',
            code: 'PLAN_LIMIT_REACHED',
            requiredPlan: 'PRO',
            featureName: 'Multi-Regulation vs. Multi-Policy Gap Analysis',
            actionUrl: '/settings?tab=plan',
          });
        }

        const usage = await getLiveTenantUsage(dbClient, organizationId);
        if (
          plan.maxGapAnalysesPerMonth !== -1 &&
          usage.gapAnalysesCount >= plan.maxGapAnalysesPerMonth
        ) {
          return formatRejection(402, {
            success: false,
            error: `You have reached your limit of ${plan.maxGapAnalysesPerMonth} Gap Analysis run(s) on the ${plan.name}. Upgrade to Pro for unlimited Gap Analyses.`,
            code: 'PLAN_LIMIT_REACHED',
            requiredPlan: 'PRO',
            featureName: 'Policy Gap Analyses',
            currentUsage: usage.gapAnalysesCount,
            maxAllowed: plan.maxGapAnalysesPerMonth,
            actionUrl: '/settings?tab=plan',
          });
        }
        break;
      }

      case 'MARKETING_CAMPAIGN_CREATE': {
        const usage = await getLiveTenantUsage(dbClient, organizationId);
        if (
          plan.maxMarketingCampaignsPerMonth !== -1 &&
          usage.campaignsCount >= plan.maxMarketingCampaignsPerMonth
        ) {
          return formatRejection(402, {
            success: false,
            error: `You have reached your limit of ${plan.maxMarketingCampaignsPerMonth} Marketing Studio campaigns on the ${plan.name}. Upgrade to Pro for unlimited campaigns and multimodal audits.`,
            code: 'PLAN_LIMIT_REACHED',
            requiredPlan: 'PRO',
            featureName: 'Marketing Studio Campaigns',
            currentUsage: usage.campaignsCount,
            maxAllowed: plan.maxMarketingCampaignsPerMonth,
            actionUrl: '/settings?tab=plan',
          });
        }
        break;
      }

      case 'MARKETING_INLINE_REWRITE': {
        if (plan.maxInlineRewritesPerMonth !== -1) {
          let rewritesCount = 0;
          try {
            const cycleStart = new Date(Date.now() - 30 * 86400000).toISOString();
            const q = (dbClient as any)
              .from('tenant_ingestion_events')
              .select('*', { count: 'exact', head: true });
            const eqOrg = q.eq ? q.eq('organization_id', organizationId) : q;
            const eqType = eqOrg.eq ? eqOrg.eq('event_type', 'MARKETING_INLINE_REWRITE') : eqOrg;
            const res = eqType.gte ? await eqType.gte('created_at', cycleStart) : await eqType;
            rewritesCount = res?.count ?? 0;
          } catch {
            rewritesCount = 0;
          }

          if (rewritesCount >= plan.maxInlineRewritesPerMonth) {
            return formatRejection(402, {
              success: false,
              error: `You have reached your limit of ${plan.maxInlineRewritesPerMonth} inline statutory copy rewrites on the ${plan.name}. Upgrade to Pro for unlimited inline rewrites.`,
              code: 'PLAN_LIMIT_REACHED',
              requiredPlan: 'PRO',
              featureName: 'Inline Statutory Copy Rewrites',
              currentUsage: rewritesCount,
              maxAllowed: plan.maxInlineRewritesPerMonth,
              actionUrl: '/settings?tab=plan',
            });
          }
        }
        break;
      }

      case 'MARKETING_CUSTOM_RULE': {
        if (!plan.canAddCustomMarketingRules) {
          return formatRejection(403, {
            success: false,
            error: 'Custom Marketing Knowledge Base rules (+ Add Rule) requires the Cogent Pro Tier.',
            code: 'PLAN_LIMIT_REACHED',
            requiredPlan: 'PRO',
            featureName: 'Custom Marketing Rules (+ Add Rule)',
            actionUrl: '/settings?tab=plan',
          });
        }
        break;
      }

      case 'DOSSIER_PDF_EXPORT': {
        if (!plan.canExportDossierPdf) {
          return formatRejection(403, {
            success: false,
            error: 'Pre-Clearance PDF Dossier export requires a paid Starter or Pro subscription.',
            code: 'PLAN_LIMIT_REACHED',
            requiredPlan: 'STARTER',
            featureName: 'Standard Pre-Clearance PDF Dossier',
            actionUrl: '/settings?tab=plan',
          });
        }
        break;
      }

      case 'CRYPTOGRAPHIC_BUNDLE_EXPORT': {
        if (!plan.canExportCryptographicBundle) {
          return formatRejection(403, {
            success: false,
            error:
              'Full cryptographic ARCON pre-clearance ZIP bundles and Bank Examiner Defense Packs require the Cogent Pro or Enterprise Tier.',
            code: 'PLAN_LIMIT_REACHED',
            requiredPlan: 'PRO',
            featureName: 'Cryptographic ARCON ZIP Bundle Export',
            actionUrl: '/settings?tab=plan',
          });
        }
        break;
      }

      case 'DEPARTMENTAL_BRIEFS_ACCESS': {
        if (!plan.canAccessDepartmentalBriefs) {
          return formatRejection(403, {
            success: false,
            error: 'Full 6-Role Departmental Supervisory Briefs (CCO, COO, CFO, CTO, Risk, Legal) require the Cogent Pro Tier.',
            code: 'PLAN_LIMIT_REACHED',
            requiredPlan: 'PRO',
            featureName: '6-Role Departmental Supervisory Briefs',
            actionUrl: '/settings?tab=plan',
          });
        }
        break;
      }
    }

    return { allowed: true, statusCode: 200 };
  } catch (err) {
    logger.error({ err, organizationId, action }, 'Error verifying plan entitlement');
    // In case of unexpected server errors, permit request with warning
    return { allowed: true, statusCode: 200 };
  }
}

export default PLAN_CONFIG;
