-- ==============================================================================
-- COGENT MIGRATION 20261006000008: PAYSTACK SUBSCRIPTIONS & BILLING ENGINE
-- Implements Phase A4 SaaS Subscription Lifecycle, Webhook Ledger, and RLS Gates
-- ==============================================================================

-- 1. Create Subscription Status Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status_enum') THEN
    CREATE TYPE subscription_status_enum AS ENUM (
      'trialing', 'active', 'past_due', 'canceled', 'unpaid'
    );
  END IF;
END $$;

-- 2. Create Tenant Subscriptions Table
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  paystack_customer_code TEXT,
  paystack_subscription_code TEXT,
  paystack_plan_code TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('STARTER', 'PRO', 'ENTERPRISE')) DEFAULT 'STARTER',
  status subscription_status_enum NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  grace_period_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_scan_quota INT NOT NULL DEFAULT 50, -- -1 represents unlimited
  policy_document_quota INT NOT NULL DEFAULT 3, -- -1 represents unlimited
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tenant_subscription UNIQUE (organization_id)
);

-- Indexes for high-throughput lookup during webhook processing & tenant resolution
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_org 
  ON tenant_subscriptions (organization_id);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_code 
  ON tenant_subscriptions (paystack_subscription_code) 
  WHERE paystack_subscription_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_customer 
  ON tenant_subscriptions (paystack_customer_code) 
  WHERE paystack_customer_code IS NOT NULL;

-- 3. Idempotent Webhook Event Log Table (Replay Defense Ledger)
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_event_id 
  ON billing_events (event_id);

CREATE INDEX IF NOT EXISTS idx_billing_events_org 
  ON billing_events (organization_id) 
  WHERE organization_id IS NOT NULL;

-- 4. Trigger to maintain updated_at on tenant_subscriptions
CREATE OR REPLACE FUNCTION set_tenant_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenant_subscriptions_updated_at ON tenant_subscriptions;
CREATE TRIGGER trg_tenant_subscriptions_updated_at
  BEFORE UPDATE ON tenant_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION set_tenant_subscriptions_updated_at();

-- 5. Row Level Security Policies
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- Tenant users can only read their own organization's subscription status
DROP POLICY IF EXISTS tenant_read_own_subscription ON tenant_subscriptions;
CREATE POLICY tenant_read_own_subscription ON tenant_subscriptions
  FOR SELECT TO authenticated
  USING (organization_id = current_org_id());

-- Tenant users can read their own organization's billing receipts / event logs
DROP POLICY IF EXISTS tenant_read_own_billing_events ON billing_events;
CREATE POLICY tenant_read_own_billing_events ON billing_events
  FOR SELECT TO authenticated
  USING (organization_id = current_org_id());

-- Mutations (INSERT, UPDATE, DELETE) are restricted to service role / admin client
-- via standard Supabase service_role bypass. No direct client mutations permitted.
