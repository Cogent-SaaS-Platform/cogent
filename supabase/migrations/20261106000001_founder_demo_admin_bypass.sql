-- ============================================================================
-- COGENT DATABASE MIGRATION: Founder / Demo Admin Entitlement Override
-- Target: supabase/migrations/20261106000001_founder_demo_admin_bypass.sql
-- ============================================================================

-- 1. ADD is_internal_demo_or_admin COLUMN TO ORGANIZATIONS
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS is_internal_demo_or_admin BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_organizations_is_internal_demo_or_admin
  ON organizations(is_internal_demo_or_admin)
  WHERE is_internal_demo_or_admin = true;

-- 2. ADD is_internal_demo_or_admin COLUMN TO USERS
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_internal_demo_or_admin BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_is_internal_demo_or_admin
  ON users(is_internal_demo_or_admin)
  WHERE is_internal_demo_or_admin = true;

-- 3. ADD is_internal_demo_or_admin TO TENANT_SUBSCRIPTIONS
ALTER TABLE tenant_subscriptions
  ADD COLUMN IF NOT EXISTS is_internal_demo_or_admin BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_is_internal_demo_or_admin
  ON tenant_subscriptions(is_internal_demo_or_admin)
  WHERE is_internal_demo_or_admin = true;

-- 4. UPDATE TIER CHECK CONSTRAINT TO SUPPORT FOUNDER_ADMIN
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tenant_subscriptions_tier_check'
  ) THEN
    ALTER TABLE tenant_subscriptions DROP CONSTRAINT tenant_subscriptions_tier_check;
  END IF;

  ALTER TABLE tenant_subscriptions ADD CONSTRAINT tenant_subscriptions_tier_check 
    CHECK (tier IN ('TRIAL', 'STARTER', 'PRO', 'ENTERPRISE', 'FOUNDER_ADMIN'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
