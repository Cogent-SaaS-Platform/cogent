# Phase A4: Subscription & Billing Engine (Paystack)

> **Objective:** Implement full SaaS billing lifecycle, subscription tiers, cryptographically verified webhooks, and tenant-level feature gating for African fintech and enterprise users.  
> **Target Tooling:** Paystack Subscriptions API + PostgreSQL Billing Ledger + HMAC-SHA512 Webhook Verification.

---

## 1. Executive Summary & Deliverables

1. **Subscription Data Schema:** Create database tables for plans, tenant subscriptions, and idempotent webhook audit events.
2. **Paystack Integration Client:** Build server-side Paystack client handling customer creation, payment initialization, plan subscription, and card authorization.
3. **Cryptographically Verified Webhook Endpoint:** Establish `/api/webhooks/paystack` verifying the `x-paystack-signature` header using HMAC-SHA512 with the Paystack Secret Key.
4. **Subscription Lifecycle Synchronization:** Listen to and handle `charge.success`, `subscription.create`, `invoice.payment_failed`, and `subscription.disable`.
5. **Entitlement Feature Gates:** Integrate subscription status checks directly into `getTenantContext()` to block scanning, policy ingestion, or dossier exports if a subscription is delinquent.

---

## 2. Technical Task Specifications (For the Coding Agent)

### Task A4.1: Database Migration for Billing & Subscriptions
- **Target File:** `supabase/migrations/20261006000007_paystack_subscriptions.sql`
- **SQL Schema Definition:**
  ```sql
  -- Tiers: STARTER (Free/Trial), PRO, ENTERPRISE
  CREATE TYPE subscription_status_enum AS ENUM (
    'trialing', 'active', 'past_due', 'canceled', 'unpaid'
  );

  CREATE TABLE IF NOT EXISTS tenant_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    paystack_customer_code TEXT NOT NULL,
    paystack_subscription_code TEXT,
    paystack_plan_code TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('STARTER', 'PRO', 'ENTERPRISE')),
    status subscription_status_enum NOT NULL DEFAULT 'trialing',
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_subscription UNIQUE (organization_id)
  );

  -- Idempotent Webhook Event Log to Prevent Replay Attacks
  CREATE TABLE IF NOT EXISTS billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- RLS: Only tenant users can read their subscription status
  ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY tenant_read_own_subscription ON tenant_subscriptions
    FOR SELECT USING (organization_id = (auth.jwt() ->> 'org_id')::uuid);
  ```

### Task A4.2: Paystack API Server Client
- **Target File:** `src/shared/billing/paystackClient.ts`
- **Implementation:**
  ```typescript
  export interface PaystackInitResponse {
    status: boolean;
    message: string;
    data: {
      authorization_url: string;
      access_code: string;
      reference: string;
    };
  }

  export class PaystackClient {
    private secretKey: string;

    constructor() {
      this.secretKey = process.env.PAYSTACK_SECRET_KEY!;
      if (!this.secretKey && process.env.NODE_ENV === 'production') {
        throw new Error('PAYSTACK_SECRET_KEY is required in production');
      }
    }

    public async initializeSubscription(params: {
      email: string;
      amountInKobo: number; // e.g. 15000000 = ₦150,000
      planCode: string;
      callbackUrl: string;
      metadata: { organizationId: string; userId: string };
    }): Promise<PaystackInitResponse> {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: params.email,
          amount: params.amountInKobo,
          plan: params.planCode,
          callback_url: params.callbackUrl,
          metadata: params.metadata,
        }),
      });

      return response.json();
    }
  }

  export const paystack = new PaystackClient();
  ```

### Task A4.3: Secure Webhook Route Handler with HMAC Verification
- **Target File:** `src/app/api/webhooks/paystack/route.ts`
- **Security Logic:**
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import crypto from 'crypto';
  import { createAdminClient } from '@/shared/db';
  import { logger } from '@/shared/logger';

  export async function POST(req: NextRequest) {
    try {
      const bodyText = await req.text();
      const signature = req.headers.get('x-paystack-signature');
      const secret = process.env.PAYSTACK_SECRET_KEY || '';

      // 1. Verify HMAC-SHA512 Signature
      const hash = crypto
        .createHmac('sha512', secret)
        .update(bodyText)
        .digest('hex');

      if (hash !== signature) {
        logger.warn({ signature }, 'Invalid Paystack webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      const event = JSON.parse(bodyText);
      const adminDb = createAdminClient();

      // 2. Idempotency Check: Prevent duplicate processing
      const eventRef = event.data?.reference || `${event.event}_${event.data?.id}`;
      const { data: existing } = await adminDb
        .from('billing_events')
        .select('id')
        .eq('event_id', eventRef)
        .single();

      if (existing) {
        return NextResponse.json({ status: 'ALREADY_PROCESSED' });
      }

      // 3. Process Events
      switch (event.event) {
        case 'charge.success':
        case 'subscription.create': {
          const orgId = event.data?.metadata?.organizationId;
          const planCode = event.data?.plan?.plan_code;
          if (orgId) {
            await adminDb.from('tenant_subscriptions').upsert({
              organization_id: orgId,
              paystack_customer_code: event.data.customer.customer_code,
              paystack_subscription_code: event.data.subscription_code,
              paystack_plan_code: planCode,
              tier: planCode.includes('ENTERPRISE') ? 'ENTERPRISE' : 'PRO',
              status: 'active',
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }, { onConflict: 'organization_id' });
          }
          break;
        }

        case 'invoice.payment_failed':
        case 'subscription.disable': {
          const subscriptionCode = event.data?.subscription_code;
          if (subscriptionCode) {
            await adminDb
              .from('tenant_subscriptions')
              .update({ status: 'past_due' })
              .eq('paystack_subscription_code', subscriptionCode);
          }
          break;
        }
      }

      // 4. Record Event in Ledger
      await adminDb.from('billing_events').insert({
        event_id: eventRef,
        event_type: event.event,
        payload: event,
      });

      return NextResponse.json({ status: 'PROCESSED' });
    } catch (err: any) {
      logger.error({ err }, 'Paystack webhook processing error');
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
  ```

### Task A4.4: Enforcing Feature Entitlement Gates
- **Target File:** `src/shared/auth/tenantContext.ts`
- **Logic:**
  Query `tenant_subscriptions` for the active `organizationId`. If `status` is `'past_due'` or `'canceled'`, attach `isSubscriptionActive: false`.
- **Target Route Handlers:**
  In heavy endpoints (`/api/marketing/scan`, `/api/gap-matrix/evaluate`, `/api/radar/brief`), check:
  ```typescript
  if (!tenantCtx.isSubscriptionActive) {
    throw new ForbiddenError(
      'SUBSCRIPTION_REQUIRED: Your organization’s billing cycle is past due or inactive. Please update payment method.'
    );
  }
  ```

---

## 3. Human-Operator Setup Guide (Your Step-by-Step Actions)

### Step 1: Paystack Dashboard Configuration
1. Log into your [Paystack Dashboard](https://dashboard.paystack.com/).
2. Under **Settings** -> **API Keys & Webhooks**:
   - For Testing: Copy **Test Secret Key** (`sk_test_...`) and **Test Public Key** (`pk_test_...`).
   - For Live Launch: Copy **Live Secret Key** (`sk_live_...`) and **Live Public Key** (`pk_live_...`).
   - Set **Webhook URL** to: `https://yourdomain.com/api/webhooks/paystack`.
3. Create Subscription Plans under **Subscriptions** -> **Plans**:
   - **Pro Tier**:
     - Name: `Cogent Pro Tier`
     - Interval: **Monthly**
     - Amount: e.g. `₦150,000` (150,000 NGN)
     - Note the generated Plan Code (e.g. `PLN_pro123...`).
   - **Enterprise Tier**:
     - Name: `Cogent Enterprise Tier`
     - Interval: **Monthly** / **Annually**
     - Amount: e.g. `₦450,000`
     - Note the Plan Code.

---

## 4. Acceptance Criteria & Phase A4 Verification Checklist

- [ ] Webhook rejects requests with missing or counterfeit `x-paystack-signature` headers (HTTP 401).
- [ ] Valid signed `charge.success` test event updates `tenant_subscriptions` to `'active'`.
- [ ] Duplicate webhook submissions are acknowledged safely without double-inserting records.
- [ ] Calling AI scanning endpoints with an expired subscription returns HTTP 403 with `SUBSCRIPTION_REQUIRED`.
