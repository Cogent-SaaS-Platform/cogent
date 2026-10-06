-- ==============================================================================
-- COGENT DATABASE MIGRATION: Phase 4 (The Connected Compliance Cascade)
-- Target File: supabase/migrations/20261006000006_connected_compliance_cascade.sql
-- Adheres to docs/INTEGRATION_ROADMAP_AND_AGENT_WORKFLOWS.md (Phase 4)
-- ==============================================================================

-- 1. Ensure human_approval_status_enum supports cascade state NEEDS_RE_REVIEW
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'human_approval_status_enum' AND pg_enum.enumlabel = 'NEEDS_RE_REVIEW'
  ) THEN
    ALTER TYPE human_approval_status_enum ADD VALUE 'NEEDS_RE_REVIEW';
  END IF;
END $$;

-- 2. Extend gap_evaluations with cascade status and trigger metadata
ALTER TABLE gap_evaluations 
  ADD COLUMN IF NOT EXISTS status VARCHAR(64) DEFAULT 'COMPLETED',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 3. Extend marketing_scans with cascade invalidation state reason
ALTER TABLE marketing_scans 
  ADD COLUMN IF NOT EXISTS state_reason TEXT;

-- 4. Extend tenant_claims_ledger with drift flagging columns
ALTER TABLE tenant_claims_ledger 
  ADD COLUMN IF NOT EXISTS drift_flagged BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS drift_reason TEXT;

-- 5. Dedicated role-specific radar_notifications table for cascade alerts
CREATE TABLE IF NOT EXISTS radar_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(64) DEFAULT 'CASCADE_ALERT',
  priority VARCHAR(32) DEFAULT 'HIGH',
  target_department org_department_enum DEFAULT 'COMPLIANCE_LEGAL',
  action_url TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Enable Row-Level Security on radar_notifications
ALTER TABLE radar_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'radar_notifications' AND policyname = 'tenant_radar_notifications_policy'
  ) THEN
    CREATE POLICY tenant_radar_notifications_policy ON radar_notifications
      FOR ALL TO authenticated
      USING (organization_id = current_org_id())
      WITH CHECK (organization_id = current_org_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'radar_notifications' AND policyname = 'admin_manage_radar_notifications'
  ) THEN
    CREATE POLICY admin_manage_radar_notifications ON radar_notifications
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Indexes for cascade queries
CREATE INDEX IF NOT EXISTS idx_radar_notifications_org ON radar_notifications(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gap_evaluations_status ON gap_evaluations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_marketing_scans_approval ON marketing_scans(organization_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_claims_ledger_drift ON tenant_claims_ledger(organization_id, drift_flagged);
