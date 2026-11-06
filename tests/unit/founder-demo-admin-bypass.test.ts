import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  PLAN_CONFIG,
  resolveEffectiveTier,
  verifyEntitlement,
  isFounderAdminEmail,
} from '@/lib/plans';
import * as dbModule from '@/shared/db';
import { POST as devSwitchTierHandler } from '@/app/api/billing/dev-switch-tier/route';
import { GET as getSubscriptionHandler } from '@/app/api/billing/subscription/route';
import * as tenantAuthModule from '@/shared/auth';

describe('Founder & Demo Super-Admin Bypass Architecture', () => {
  const TEST_ORG_ID = '00000000-0000-0000-0000-000000000099';
  const FOUNDER_EMAIL = 'founder@stem-cogent.com';
  const DEMO_EMAIL = 'demo@stem-cogent.com';
  const NORMAL_EMAIL = 'compliance@commercialbank.ng';

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.FOUNDER_ADMIN_EMAILS = `${FOUNDER_EMAIL}, ${DEMO_EMAIL}`;
  });

  describe('1. Email Allowlist & Environment Detection', () => {
    it('accurately identifies founder and demo emails regardless of casing and whitespace', () => {
      expect(isFounderAdminEmail('founder@stem-cogent.com')).toBe(true);
      expect(isFounderAdminEmail('FOUNDER@STEM-COGENT.COM')).toBe(true);
      expect(isFounderAdminEmail('  demo@stem-cogent.com  ')).toBe(true);
      expect(isFounderAdminEmail(NORMAL_EMAIL)).toBe(false);
      expect(isFounderAdminEmail('')).toBe(false);
      expect(isFounderAdminEmail(null)).toBe(false);
      expect(isFounderAdminEmail(undefined)).toBe(false);
    });

    it('defines FOUNDER_ADMIN in PLAN_CONFIG with unlimited capacity across all modules', () => {
      const founderPlan = PLAN_CONFIG.FOUNDER_ADMIN;
      expect(founderPlan).toBeDefined();
      expect(founderPlan.tier).toBe('FOUNDER_ADMIN');
      expect(founderPlan.maxSeats).toBe(-1);
      expect(founderPlan.maxRegulatorsMonitored).toBe(-1);
      expect(founderPlan.maxCustomRegulationIngestionsPerMonth).toBe(-1);
      expect(founderPlan.canEditObligationCriteria).toBe(true);
      expect(founderPlan.maxPoliciesUploaded).toBe(-1);
      expect(founderPlan.maxGapAnalysesPerMonth).toBe(-1);
      expect(founderPlan.canRunMultiRegGapAnalysis).toBe(true);
      expect(founderPlan.maxMarketingCampaignsPerMonth).toBe(-1);
      expect(founderPlan.maxInlineRewritesPerMonth).toBe(-1);
      expect(founderPlan.canAddCustomMarketingRules).toBe(true);
      expect(founderPlan.canExportDossierPdf).toBe(true);
      expect(founderPlan.canExportCryptographicBundle).toBe(true);
      expect(founderPlan.canAccessDepartmentalBriefs).toBe(true);
      expect(founderPlan.auditRetentionDays).toBe(2555); // 7-year BOFIA standard
    });

    it('resolves FOUNDER_ADMIN tier correctly in resolveEffectiveTier', () => {
      expect(resolveEffectiveTier('FOUNDER_ADMIN', 'active')).toBe('FOUNDER_ADMIN');
      expect(resolveEffectiveTier('founder_admin', 'active')).toBe('FOUNDER_ADMIN');
      const objResult = resolveEffectiveTier({ tier: 'FOUNDER_ADMIN', status: 'active' });
      expect(objResult.effectiveTier).toBe('FOUNDER_ADMIN');
      expect(objResult.isTrial).toBe(false);
      expect(objResult.isExpired).toBe(false);
    });
  });

  describe('2. Entitlement Guard Bypass & Zero Trial Lockouts', () => {
    it('bypasses marketing scan limit for founder admin even with high usage', async () => {
      const mockAdminDb: any = {
        from: vi.fn((table: string) => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockImplementation(async () => {
            if (table === 'tenant_subscriptions') {
              return {
                data: {
                  tier: 'FOUNDER_ADMIN',
                  status: 'active',
                  trial_ends_at: null,
                },
              };
            }
            if (table === 'organizations') {
              return { data: { is_internal_demo_or_admin: true } };
            }
            return { data: null };
          }),
        })),
      };

      const result = await verifyEntitlement(mockAdminDb, TEST_ORG_ID, 'MARKETING_CAMPAIGN_CREATE');
      expect(result.allowed).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.isFounderAdmin).toBe(true);
    });

    it('prevents trial expiration lockout for an internal demo organization', async () => {
      const pastDate = new Date(Date.now() - 24 * 3600000).toISOString(); // Expired yesterday
      const mockAdminDb: any = {
        from: vi.fn((table: string) => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockImplementation(async () => {
            if (table === 'tenant_subscriptions') {
              return {
                data: {
                  tier: 'ENTERPRISE',
                  status: 'trialing',
                  trial_ends_at: pastDate,
                  is_internal_demo_or_admin: true,
                },
              };
            }
            if (table === 'organizations') {
              return { data: { is_internal_demo_or_admin: true } };
            }
            return { data: null };
          }),
        })),
      };

      const result = await verifyEntitlement(mockAdminDb, TEST_ORG_ID, 'GAP_ANALYSIS_RUN', {
        isInternalDemoOrAdmin: true,
      });

      expect(result.allowed).toBe(true);
      expect(result.statusCode).toBe(200);
    });

    it('permits deliberate trial expired simulation when explicitly requested by founder', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const mockAdminDb: any = {
        from: vi.fn((table: string) => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockImplementation(async () => {
            if (table === 'tenant_subscriptions') {
              return {
                data: {
                  tier: 'STARTER',
                  status: 'trialing',
                  trial_ends_at: pastDate,
                },
              };
            }
            if (table === 'organizations') {
              return { data: { is_internal_demo_or_admin: true } };
            }
            return { data: null };
          }),
        })),
      };

      const result = await verifyEntitlement(mockAdminDb, TEST_ORG_ID, 'MARKETING_CAMPAIGN_CREATE', {
        simulateExpired: true,
        isInternalDemoOrAdmin: true,
      });

      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(402);
      expect(result.code).toBe('TRIAL_EXPIRED');
    });
  });

  describe('3. Admin Plan Switcher in Dev & Production Routes', () => {
    it('authorizes founder email in production to switch plans', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = 'production';

      const mockUpsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'sub-123', tier: 'PRO', status: 'active' },
            error: null,
          }),
        }),
      });

      vi.spyOn(tenantAuthModule, 'getTenantContext').mockResolvedValue({
        organizationId: TEST_ORG_ID,
        userId: 'user-founder-1',
        userEmail: FOUNDER_EMAIL,
        isDevFallback: false,
        isInternalDemoOrAdmin: true,
        dbClient: {} as any,
        isSubscriptionActive: true,
        subscription: {} as any,
      });

      vi.spyOn(dbModule, 'createAdminClient').mockReturnValue({
        from: vi.fn().mockReturnValue({
          upsert: mockUpsert,
        }),
      } as any);

      const req = new NextRequest('http://localhost:3000/api/billing/dev-switch-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'PRO' }),
      });

      const response = await devSwitchTierHandler(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.effectiveTier).toBe('PRO');

      (process.env as any).NODE_ENV = originalNodeEnv;
    });

    it('rejects unauthorized non-founder users in production mode from accessing the switcher', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = 'production';

      vi.spyOn(tenantAuthModule, 'getTenantContext').mockResolvedValue({
        organizationId: 'org-external-001',
        userId: 'user-external-1',
        userEmail: NORMAL_EMAIL,
        isDevFallback: false,
        isInternalDemoOrAdmin: false,
        dbClient: {} as any,
        isSubscriptionActive: true,
        subscription: {} as any,
      });

      const req = new NextRequest('http://localhost:3000/api/billing/dev-switch-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'PRO' }),
      });

      const response = await devSwitchTierHandler(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);

      (process.env as any).NODE_ENV = originalNodeEnv;
    });

    it('returns isInternalDemoOrAdmin: true in GET /api/billing/subscription for founder admin', async () => {
      vi.spyOn(tenantAuthModule, 'getTenantContext').mockResolvedValue({
        organizationId: TEST_ORG_ID,
        userId: 'user-founder-1',
        userEmail: FOUNDER_EMAIL,
        isDevFallback: false,
        isInternalDemoOrAdmin: true,
        dbClient: {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { tier: 'ENTERPRISE', status: 'active', is_internal_demo_or_admin: true },
            }),
          }),
        } as any,
        isSubscriptionActive: true,
        subscription: {
          tier: 'ENTERPRISE',
          status: 'active',
          isActive: true,
          isInGracePeriod: false,
          isReadOnly: false,
          isInternalDemoOrAdmin: true,
          trialEndsAt: null,
          gracePeriodEndsAt: null,
          currentPeriodEnd: null,
          marketingScanQuota: -1,
          policyDocumentQuota: -1,
          paystackSubscriptionCode: null,
          paystackPlanCode: null,
        },
      });

      const response = await getSubscriptionHandler();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isInternalDemoOrAdmin).toBe(true);
      expect(data.isAdminSwitcherAllowed).toBe(true);
    });
  });
});
