import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { paystackClient, COGENT_PLANS, EntitlementEngine } from '@/shared/billing';
import { POST as paystackWebhookHandler } from '@/app/api/webhooks/paystack/route';
import { SubscriptionRequiredError } from '@/shared/errors';
import { TenantSubscriptionSummary } from '@/shared/types';
import * as dbModule from '@/shared/db';

describe('Phase A4: Paystack Billing & Subscription Engine Verification', () => {
  const TEST_SECRET = 'sk_test_mock_paystack_secret_key_12345';

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.PAYSTACK_SECRET_KEY = TEST_SECRET;
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Paystack Client Specification Tests
  // ──────────────────────────────────────────────────────────────────────────
  describe('Task A4.2: Paystack API Server Client', () => {
    it('correctly maps plan metadata and converts amounts to kobo', () => {
      const starter = paystackClient.getPlanMetadata('STARTER');
      expect(starter.pricing.ngnMonthlyKobo).toBe(30000000); // ₦300,000.00
      expect(starter.limits.marketingScansPerMonth).toBe(50);
      expect(starter.limits.policyDocuments).toBe(3);

      const pro = paystackClient.getPlanMetadata('PRO');
      expect(pro.pricing.ngnMonthlyKobo).toBe(85000000); // ₦850,000.00
      expect(pro.limits.marketingScansPerMonth).toBe(-1); // Unlimited
      expect(pro.limits.policyDocuments).toBe(15);

      const enterprise = paystackClient.getPlanMetadata('ENTERPRISE');
      expect(enterprise.pricing.ngnMonthlyKobo).toBe(300000000); // ₦3,000,000.00
      expect(enterprise.limits.marketingScansPerMonth).toBe(-1); // Unlimited
      expect(enterprise.limits.policyDocuments).toBe(-1); // Unlimited
    });

    it('initializes a subscription checkout session with valid headers and payload', async () => {
      const mockFetchResponse = {
        status: true,
        message: 'Authorization URL created',
        data: {
          authorization_url: 'https://checkout.paystack.com/0peioxfhpn',
          access_code: '0peioxfhpn',
          reference: 'test_ref_123',
        },
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockFetchResponse,
      } as any);

      const result = await paystackClient.initializeSubscription({
        email: 'compliance@apexbank.ng',
        amountInKobo: 85000000,
        planCode: 'PLN_cogent_pro_monthly',
        callbackUrl: 'https://app.cogent.africa/settings?tab=plan',
        metadata: {
          organizationId: '00000000-0000-0000-0000-000000000001',
          userId: '00000000-0000-0000-0000-000000000010',
          tier: 'PRO',
        },
      });

      expect(result.status).toBe(true);
      expect(result.data.authorization_url).toBe('https://checkout.paystack.com/0peioxfhpn');
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.paystack.co/transaction/initialize',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${TEST_SECRET}`,
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('verifies a transaction reference against Paystack endpoint', async () => {
      const mockVerifyResponse = {
        status: true,
        message: 'Verification successful',
        data: {
          id: 123456,
          domain: 'test',
          status: 'success',
          reference: 'test_ref_123',
          amount: 85000000,
        },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockVerifyResponse,
      } as any);

      const result = await paystackClient.verifyTransaction('test_ref_123');
      expect(result.status).toBe(true);
      expect(result.data.status).toBe('success');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Webhook HMAC Cryptographic Verification & Idempotency
  // ──────────────────────────────────────────────────────────────────────────
  describe('Task A4.3: Secure Webhook Controller with HMAC-SHA512', () => {
    function createSignedWebhookRequest(bodyObj: Record<string, unknown>, signatureOverride?: string): NextRequest {
      const bodyText = JSON.stringify(bodyObj);
      const signature =
        signatureOverride ??
        crypto.createHmac('sha512', TEST_SECRET).update(bodyText, 'utf8').digest('hex');

      return new NextRequest('https://app.cogent.africa/api/webhooks/paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-paystack-signature': signature,
        },
        body: bodyText,
      });
    }

    it('rejects webhooks with missing signature header with HTTP 401', async () => {
      const req = new NextRequest('https://app.cogent.africa/api/webhooks/paystack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'charge.success' }),
      });

      const res = await paystackWebhookHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/missing/i);
    });

    it('rejects webhooks with counterfeit/tampered HMAC signature with HTTP 401', async () => {
      const req = createSignedWebhookRequest(
        { event: 'charge.success' },
        'deadbeef_counterfeit_tampered_signature_1234567890abcdef'
      );

      const res = await paystackWebhookHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/invalid/i);
    });

    it('idempotently acknowledges duplicate webhook events without double processing', async () => {
      const testEvent = {
        event: 'charge.success',
        data: {
          reference: 'txn_duplicate_001',
          amount: 85000000,
        },
      };

      // Mock database admin client: billing_events already contains txn_duplicate_001
      const mockAdminDb = {
        from: vi.fn((table: string) => {
          if (table === 'billing_events') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { id: 'evt-uuid-1', processed_at: new Date().toISOString() },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(dbModule, 'createAdminClient').mockReturnValue(mockAdminDb as any);

      const req = createSignedWebhookRequest(testEvent);
      const res = await paystackWebhookHandler(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ALREADY_PROCESSED');
      expect(json.eventId).toBe('txn_duplicate_001');
    });

    it('successfully processes charge.success event and activates subscription', async () => {
      const testEvent = {
        event: 'charge.success',
        data: {
          reference: 'txn_fresh_999',
          amount: 85000000,
          customer: { customer_code: 'CUS_mock_123' },
          subscription_code: 'SUB_mock_456',
          plan: { plan_code: 'PLN_cogent_pro_monthly' },
          metadata: {
            organizationId: '00000000-0000-0000-0000-000000000001',
            tier: 'PRO',
          },
        },
      };

      const upsertSpy = vi.fn().mockResolvedValue({ error: null });
      const insertLedgerSpy = vi.fn().mockResolvedValue({ error: null });

      const mockAdminDb = {
        from: vi.fn((table: string) => {
          if (table === 'billing_events') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
              insert: insertLedgerSpy,
            };
          }
          if (table === 'tenant_subscriptions') {
            return {
              upsert: upsertSpy,
            };
          }
          return {};
        }),
      };

      vi.spyOn(dbModule, 'createAdminClient').mockReturnValue(mockAdminDb as any);

      const req = createSignedWebhookRequest(testEvent);
      const res = await paystackWebhookHandler(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('PROCESSED');
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: '00000000-0000-0000-0000-000000000001',
          tier: 'PRO',
          status: 'active',
          paystack_customer_code: 'CUS_mock_123',
        }),
        expect.anything()
      );
      expect(insertLedgerSpy).toHaveBeenCalled();
    });

    it('transitions subscription to past_due and grants 7-day grace period on invoice.payment_failed', async () => {
      const testEvent = {
        event: 'invoice.payment_failed',
        data: {
          reference: 'inv_fail_777',
          subscription_code: 'SUB_mock_456',
        },
      };

      const updateSpy = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));

      const mockAdminDb = {
        from: vi.fn((table: string) => {
          if (table === 'billing_events') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          if (table === 'tenant_subscriptions') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { organization_id: '00000000-0000-0000-0000-000000000001' },
                    error: null,
                  }),
                }),
              }),
              update: updateSpy,
            };
          }
          return {};
        }),
      };

      vi.spyOn(dbModule, 'createAdminClient').mockReturnValue(mockAdminDb as any);

      const req = createSignedWebhookRequest(testEvent);
      const res = await paystackWebhookHandler(req);

      expect(res.status).toBe(200);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'past_due',
          grace_period_ends_at: expect.any(String),
        })
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Entitlement Feature Gates & Grace Period Lifecycle
  // ──────────────────────────────────────────────────────────────────────────
  describe('Task A4.4 & A4.5: Entitlement Feature Gates', () => {
    it('permits marketing scans when subscription is active', () => {
      const activeSubscription = EntitlementEngine.computeSummary({
        tier: 'PRO',
        status: 'active',
        marketingScanQuota: -1,
      });

      expect(() => EntitlementEngine.assertCanScan(activeSubscription, 100)).not.toThrow();
    });

    it('permits marketing scans during active 7-day grace period on past_due', () => {
      const gracePeriodActive = EntitlementEngine.computeSummary({
        tier: 'PRO',
        status: 'past_due',
        gracePeriodEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days left
      });

      expect(gracePeriodActive.isInGracePeriod).toBe(true);
      expect(gracePeriodActive.isReadOnly).toBe(false);
      expect(() => EntitlementEngine.assertCanScan(gracePeriodActive, 10)).not.toThrow();
    });

    it('throws SubscriptionRequiredError (HTTP 403) when past_due grace period has expired', () => {
      const gracePeriodExpired = EntitlementEngine.computeSummary({
        tier: 'PRO',
        status: 'past_due',
        gracePeriodEndsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Expired 2 days ago
      });

      expect(gracePeriodExpired.isReadOnly).toBe(true);
      expect(() => EntitlementEngine.assertCanScan(gracePeriodExpired, 0)).toThrow(
        SubscriptionRequiredError
      );
    });

    it('throws SubscriptionRequiredError (HTTP 403) when trial has expired', () => {
      const trialExpired = EntitlementEngine.computeSummary({
        tier: 'STARTER',
        status: 'trialing',
        trialEndsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Expired yesterday
      });

      expect(trialExpired.isReadOnly).toBe(true);
      expect(() => EntitlementEngine.assertCanScan(trialExpired, 0)).toThrow(
        SubscriptionRequiredError
      );
    });

    it('throws SubscriptionRequiredError when monthly scan quota is exceeded on Starter tier', () => {
      const starterActive = EntitlementEngine.computeSummary({
        tier: 'STARTER',
        status: 'active',
        marketingScanQuota: 50,
      });

      expect(() => EntitlementEngine.assertCanScan(starterActive, 50)).toThrow(
        SubscriptionRequiredError
      );
    });

    it('permits unlimited scans on Pro and Enterprise tiers', () => {
      const proActive = EntitlementEngine.computeSummary({
        tier: 'PRO',
        status: 'active',
        marketingScanQuota: -1,
      });

      expect(() => EntitlementEngine.assertCanScan(proActive, 99999)).not.toThrow();
    });

    it('restricts cryptographic defense packs to Pro and Enterprise tiers', () => {
      const starterActive = EntitlementEngine.computeSummary({
        tier: 'STARTER',
        status: 'active',
      });
      const proActive = EntitlementEngine.computeSummary({
        tier: 'PRO',
        status: 'active',
      });

      expect(() => EntitlementEngine.assertCanExportCryptographicPack(starterActive)).toThrow(
        SubscriptionRequiredError
      );
      expect(() => EntitlementEngine.assertCanExportCryptographicPack(proActive)).not.toThrow();
    });
  });
});
