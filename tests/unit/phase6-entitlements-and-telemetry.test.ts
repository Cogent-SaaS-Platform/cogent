import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  PLAN_CONFIG,
  resolveEffectiveTier,
  verifyEntitlement,
  getPlanConfig,
} from '@/lib/plans';
import * as dbModule from '@/shared/db';
import { POST as devSwitchTierHandler } from '@/app/api/billing/dev-switch-tier/route';
import { GET as getSubscriptionHandler } from '@/app/api/billing/subscription/route';

describe('Phase 6: SaaS Feature Gating, Live Quota Telemetry & Updated Pricing Architecture', () => {
  const TEST_ORG_ID = 'org-test-regtech-001';

  const createCountQueryMock = (count = 0) => {
    const queryObj: any = {
      count,
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: (resolve: (val: any) => void) => resolve({ count, error: null }),
    };
    return queryObj;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Single Source-of-Truth Plan Configuration Matrix (lib/plans.ts)
  // ──────────────────────────────────────────────────────────────────────────
  describe('Part 1: Plan Configuration Matrix & Invisible AI Compliance', () => {
    it('accurately defines TRIAL tier with 7-day duration and evaluation quotas', () => {
      const trial = PLAN_CONFIG.TRIAL;
      expect(trial.tier).toBe('TRIAL');
      expect(trial.durationDays).toBe(7);
      expect(trial.maxSeats).toBe(2);
      expect(trial.maxRegulatorsMonitored).toBe(1);
      expect(trial.maxCustomRegulationIngestionsPerMonth).toBe(1);
      expect(trial.canEditObligationCriteria).toBe(false);
      expect(trial.maxPoliciesUploaded).toBe(1);
      expect(trial.maxGapAnalysesPerMonth).toBe(1);
      expect(trial.maxMarketingCampaignsPerMonth).toBe(3);
      expect(trial.maxInlineRewritesPerMonth).toBe(10);
      expect(trial.canAddCustomMarketingRules).toBe(false);
      expect(trial.auditRetentionDays).toBe(7);
    });

    it('accurately defines STARTER tier pricing and quotas', () => {
      const starter = PLAN_CONFIG.STARTER;
      expect(starter.monthlyPriceUsd).toBe(199);
      expect(starter.monthlyPriceNgn).toBe(300000);
      expect(starter.maxSeats).toBe(3);
      expect(starter.maxRegulatorsMonitored).toBe(2);
      expect(starter.maxCustomRegulationIngestionsPerMonth).toBe(5);
      expect(starter.canEditObligationCriteria).toBe(false);
      expect(starter.maxPoliciesUploaded).toBe(3);
      expect(starter.maxGapAnalysesPerMonth).toBe(5);
      expect(starter.maxMarketingCampaignsPerMonth).toBe(25);
      expect(starter.maxInlineRewritesPerMonth).toBe(100);
      expect(starter.canAddCustomMarketingRules).toBe(false);
      expect(starter.auditRetentionDays).toBe(90);
    });

    it('accurately defines PRO tier with unlimited core operations and criteria editing', () => {
      const pro = PLAN_CONFIG.PRO;
      expect(pro.monthlyPriceUsd).toBe(549);
      expect(pro.monthlyPriceNgn).toBe(850000);
      expect(pro.maxSeats).toBe(10);
      expect(pro.maxRegulatorsMonitored).toBe(-1); // ALL 7 regulators
      expect(pro.maxCustomRegulationIngestionsPerMonth).toBe(-1); // Unlimited
      expect(pro.canEditObligationCriteria).toBe(true);
      expect(pro.maxPoliciesUploaded).toBe(15);
      expect(pro.maxGapAnalysesPerMonth).toBe(-1); // Unlimited
      expect(pro.maxMarketingCampaignsPerMonth).toBe(-1); // Unlimited
      expect(pro.maxInlineRewritesPerMonth).toBe(-1); // Unlimited
      expect(pro.canAddCustomMarketingRules).toBe(true);
      expect(pro.auditRetentionDays).toBe(365);
    });

    it('accurately defines ENTERPRISE tier with 7-year statutory audit retention', () => {
      const enterprise = PLAN_CONFIG.ENTERPRISE;
      expect(enterprise.monthlyPriceUsd).toBe(1999);
      expect(enterprise.monthlyPriceNgn).toBe(3000000);
      expect(enterprise.maxSeats).toBe(-1);
      expect(enterprise.maxPoliciesUploaded).toBe(-1);
      expect(enterprise.maxGapAnalysesPerMonth).toBe(-1);
      expect(enterprise.canEditObligationCriteria).toBe(true);
      expect(enterprise.canAddCustomMarketingRules).toBe(true);
      expect(enterprise.auditRetentionDays).toBe(2555); // 7 years BOFIA 2020 mandate
    });

    it('strictly enforces the Invisible AI brand rule across all tier feature bullets', () => {
      const allTiers = [PLAN_CONFIG.TRIAL, PLAN_CONFIG.STARTER, PLAN_CONFIG.PRO, PLAN_CONFIG.ENTERPRISE];
      for (const plan of allTiers) {
        for (const bullet of plan.features) {
          expect(bullet.toLowerCase()).not.toContain('ai compliant rewrites');
          expect(bullet.toLowerCase()).not.toContain('gemini');
          expect(bullet.toLowerCase()).not.toContain('ai-powered');
        }
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Effective Tier Resolution & Trial Expiration
  // ──────────────────────────────────────────────────────────────────────────
  describe('Part 2: Effective Tier Resolution & Trial Expiration Guard', () => {
    it('resolves active trial status within 7 days as non-expired TRIAL', () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      const res = resolveEffectiveTier({
        tier: 'TRIAL',
        status: 'trialing',
        trialEndsAt: futureDate,
      });

      expect(res.effectiveTier).toBe('TRIAL');
      expect(res.isTrial).toBe(true);
      expect(res.isExpired).toBe(false);
      expect(res.daysRemaining).toBe(5);
    });

    it('flags expired trial and transitions to read-only mode when trialEndsAt has passed', () => {
      const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const res = resolveEffectiveTier({
        tier: 'TRIAL',
        status: 'trialing',
        trialEndsAt: pastDate,
      });

      expect(res.effectiveTier).toBe('TRIAL');
      expect(res.isTrial).toBe(true);
      expect(res.isExpired).toBe(true);
      expect(res.daysRemaining).toBe(0);
    });

    it('resolves active paid subscriptions regardless of trial dates', () => {
      const res = resolveEffectiveTier({
        tier: 'PRO',
        status: 'active',
        trialEndsAt: null,
      });

      expect(res.effectiveTier).toBe('PRO');
      expect(res.isTrial).toBe(false);
      expect(res.isExpired).toBe(false);
      expect(res.daysRemaining).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Server-Side Entitlement & Quota Enforcement Middleware
  // ──────────────────────────────────────────────────────────────────────────
  describe('Part 3: verifyEntitlement Server-Side Enforcement Engine', () => {
    it('blocks mutating actions when trial has expired with TRIAL_EXPIRED code', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'tenant_subscriptions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  organization_id: TEST_ORG_ID,
                  tier: 'TRIAL',
                  status: 'trialing',
                  trial_ends_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                },
                error: null,
              }),
              single: vi.fn().mockResolvedValue({
                data: {
                  organization_id: TEST_ORG_ID,
                  tier: 'TRIAL',
                  status: 'trialing',
                  trial_ends_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                },
                error: null,
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            count: 0,
          };
        }),
      };

      const decision = await verifyEntitlement(mockSupabase as any, TEST_ORG_ID, 'MARKETING_CAMPAIGN_CREATE');

      expect(decision.allowed).toBe(false);
      expect(decision.statusCode).toBe(402);
      expect(decision.code).toBe('TRIAL_EXPIRED');
      expect(decision.requiredPlan).toBe('STARTER');
    });

    it('enforces custom regulation ingestion quota on Starter (max 5)', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'tenant_subscriptions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  organization_id: TEST_ORG_ID,
                  tier: 'STARTER',
                  status: 'active',
                },
                error: null,
              }),
              single: vi.fn().mockResolvedValue({
                data: {
                  organization_id: TEST_ORG_ID,
                  tier: 'STARTER',
                  status: 'active',
                },
                error: null,
              }),
            };
          }
          if (table === 'regulatory_instruments' || table === 'tenant_ingestion_events') {
            return createCountQueryMock(5);
          }
          return createCountQueryMock(0);
        }),
      };

      const decision = await verifyEntitlement(mockSupabase as any, TEST_ORG_ID, 'CUSTOM_REGULATION_INGEST');

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe('PLAN_LIMIT_REACHED');
      expect(decision.requiredPlan).toBe('PRO');
      expect(decision.currentUsage).toBe(5);
      expect(decision.maxAllowed).toBe(5);
    });

    it('gates obligation criteria editing (✎) strictly to Pro and Enterprise', async () => {
      // Mock Starter subscription
      const mockSupabaseStarter = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              organization_id: TEST_ORG_ID,
              tier: 'STARTER',
              status: 'active',
            },
            error: null,
          }),
          single: vi.fn().mockResolvedValue({
            data: {
              organization_id: TEST_ORG_ID,
              tier: 'STARTER',
              status: 'active',
            },
            error: null,
          }),
        })),
      };

      const starterDecision = await verifyEntitlement(mockSupabaseStarter as any, TEST_ORG_ID, 'EDIT_OBLIGATION_CRITERIA');

      expect(starterDecision.allowed).toBe(false);
      expect(starterDecision.requiredPlan).toBe('PRO');
      expect(starterDecision.reason).toContain('Pro Tier');

      // Mock Pro subscription
      const mockSupabasePro = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              organization_id: TEST_ORG_ID,
              tier: 'PRO',
              status: 'active',
            },
            error: null,
          }),
          single: vi.fn().mockResolvedValue({
            data: {
              organization_id: TEST_ORG_ID,
              tier: 'PRO',
              status: 'active',
            },
            error: null,
          }),
        })),
      };

      const proDecision = await verifyEntitlement(mockSupabasePro as any, TEST_ORG_ID, 'EDIT_OBLIGATION_CRITERIA');

      expect(proDecision.allowed).toBe(true);
    });

    it('rejects Multi-Regulation vs. Multi-Policy gap analysis on Trial and Starter', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              organization_id: TEST_ORG_ID,
              tier: 'STARTER',
              status: 'active',
            },
            error: null,
          }),
          single: vi.fn().mockResolvedValue({
            data: {
              organization_id: TEST_ORG_ID,
              tier: 'STARTER',
              status: 'active',
            },
            error: null,
          }),
        })),
      };

      const multiRegDecision = await verifyEntitlement(mockSupabase as any, TEST_ORG_ID, 'GAP_ANALYSIS_RUN', {
        regulationIds: ['reg-1', 'reg-2'],
        policyIds: ['pol-1'],
      });

      expect(multiRegDecision.allowed).toBe(false);
      expect(multiRegDecision.code).toBe('PLAN_LIMIT_REACHED');
      expect(multiRegDecision.requiredPlan).toBe('PRO');
      expect(multiRegDecision.reason).toContain('Multi-Regulation');
    });

    it('permits Multi-Regulation vs. Multi-Policy gap analysis on Pro Tier', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'tenant_subscriptions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  organization_id: TEST_ORG_ID,
                  tier: 'PRO',
                  status: 'active',
                },
                error: null,
              }),
              single: vi.fn().mockResolvedValue({
                data: {
                  organization_id: TEST_ORG_ID,
                  tier: 'PRO',
                  status: 'active',
                },
                error: null,
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            count: 0,
          };
        }),
      };

      const decision = await verifyEntitlement(mockSupabase as any, TEST_ORG_ID, 'GAP_ANALYSIS_RUN', {
        regulationIds: ['reg-1', 'reg-2', 'reg-3'],
        policyIds: ['pol-1', 'pol-2'],
      });

      expect(decision.allowed).toBe(true);
    });

    it('gates custom marketing knowledge base rules (+ Add Rule) to Pro and Enterprise', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              organization_id: TEST_ORG_ID,
              tier: 'TRIAL',
              status: 'trialing',
              trial_ends_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
            },
            error: null,
          }),
          single: vi.fn().mockResolvedValue({
            data: {
              organization_id: TEST_ORG_ID,
              tier: 'TRIAL',
              status: 'trialing',
              trial_ends_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
            },
            error: null,
          }),
        })),
      };

      const decision = await verifyEntitlement(mockSupabase as any, TEST_ORG_ID, 'MARKETING_CUSTOM_RULE');

      expect(decision.allowed).toBe(false);
      expect(decision.requiredPlan).toBe('PRO');
      expect(decision.reason).toContain('Custom Marketing Knowledge Base rules');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Developer / Founder Test Mode Switcher API (/api/billing/dev-switch-tier)
  // ──────────────────────────────────────────────────────────────────────────
  describe('Part 4: Developer Test Mode Switcher Endpoint', () => {
    it('successfully switches workspace tier to TRIAL_EXPIRED with retroactive trial date', async () => {
      let updatedPayload: any = null;

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'tenant_subscriptions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  organization_id: TEST_ORG_ID,
                  tier: 'STARTER',
                  status: 'trialing',
                },
                error: null,
              }),
              single: vi.fn().mockResolvedValue({
                data: {
                  organization_id: TEST_ORG_ID,
                  tier: 'STARTER',
                  status: 'trialing',
                },
                error: null,
              }),
              upsert: vi.fn((payload) => {
                updatedPayload = payload;
                return {
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: {
                      ...payload,
                      organization_id: TEST_ORG_ID,
                      updated_at: new Date().toISOString(),
                    },
                    error: null,
                  }),
                };
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      };

      vi.spyOn(dbModule, 'createAdminClient').mockReturnValue(mockSupabase as any);
      vi.spyOn(dbModule, 'createClient').mockReturnValue(mockSupabase as any);

      const req = new NextRequest('http://localhost:3000/api/billing/dev-switch-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetTier: 'TRIAL_EXPIRED',
          organizationId: TEST_ORG_ID,
        }),
      });

      const response = await devSwitchTierHandler(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.effectiveTier).toBe('TRIAL');
      expect(json.isExpired).toBe(true);
      expect(new Date(updatedPayload.trial_ends_at).getTime()).toBeLessThan(Date.now());
    });

    it('successfully switches workspace tier to PRO with active status', async () => {
      let updatedPayload: any = null;

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'tenant_subscriptions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  organization_id: TEST_ORG_ID,
                  tier: 'PRO',
                  status: 'active',
                },
                error: null,
              }),
              single: vi.fn().mockResolvedValue({
                data: {
                  organization_id: TEST_ORG_ID,
                  tier: 'PRO',
                  status: 'active',
                },
                error: null,
              }),
              upsert: vi.fn((payload) => {
                updatedPayload = payload;
                return {
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: {
                      ...payload,
                      organization_id: TEST_ORG_ID,
                      updated_at: new Date().toISOString(),
                    },
                    error: null,
                  }),
                };
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      };

      vi.spyOn(dbModule, 'createAdminClient').mockReturnValue(mockSupabase as any);
      vi.spyOn(dbModule, 'createClient').mockReturnValue(mockSupabase as any);

      const req = new NextRequest('http://localhost:3000/api/billing/dev-switch-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetTier: 'PRO',
          organizationId: TEST_ORG_ID,
        }),
      });

      const response = await devSwitchTierHandler(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.effectiveTier).toBe('PRO');
      expect(json.isExpired).toBe(false);
      expect(updatedPayload.tier).toBe('PRO');
      expect(updatedPayload.status).toBe('active');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Live Quota Telemetry API (/api/billing/subscription)
  // ──────────────────────────────────────────────────────────────────────────
  describe('Part 5: Live Quota Telemetry Endpoint & Counts', () => {
    it('returns 4-metric live usage telemetry and planConfig from database', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'tenant_subscriptions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  organization_id: TEST_ORG_ID,
                  tier: 'TRIAL',
                  status: 'trialing',
                  trial_ends_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
                },
                error: null,
              }),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  organization_id: TEST_ORG_ID,
                  tier: 'TRIAL',
                  status: 'trialing',
                  trial_ends_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
                },
                error: null,
              }),
            };
          }
          if (table === 'marketing_campaigns') {
            return createCountQueryMock(2);
          }
          if (table === 'gap_evaluations' || table === 'gap_matrix_evaluations') {
            return createCountQueryMock(1);
          }
          if (table === 'policy_documents') {
            return createCountQueryMock(1);
          }
          if (table === 'regulatory_instruments' || table === 'tenant_ingestion_events') {
            return createCountQueryMock(1);
          }
          if (table === 'organization_members' || table === 'users' || table === 'organization_memberships') {
            return createCountQueryMock(1);
          }
          return createCountQueryMock(0);
        }),
      };

      vi.spyOn(dbModule, 'createAdminClient').mockReturnValue(mockSupabase as any);
      vi.spyOn(dbModule, 'createClient').mockReturnValue(mockSupabase as any);

      const req = new NextRequest(`http://localhost:3000/api/billing/subscription?orgId=${TEST_ORG_ID}`);
      const response = await getSubscriptionHandler(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.tier).toBe('TRIAL');
      expect(json.isTrial).toBe(true);
      expect(json.isExpired).toBe(false);
      expect(json.usage).toBeDefined();
      expect(json.usage.marketingCampaigns).toBe(2);
      expect(json.usage.gapAnalyses).toBe(1);
      expect(json.usage.regulationIngestions).toBe(1);
      expect(json.usage.teamSeats).toBe(1);
      expect(json.planConfig).toBeDefined();
      expect(json.planConfig.maxMarketingCampaignsPerMonth).toBe(3);
      expect(json.planConfig.maxGapAnalysesPerMonth).toBe(1);
    });
  });
});
