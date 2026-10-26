-- ==============================================================================
-- COGENT DATABASE MIGRATION: Phase 4 (Cryptographic Compliance Cascade Ledger)
-- Target File: supabase/migrations/20261026000003_compliance_cascade_events.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS compliance_cascade_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  circular_id UUID REFERENCES radar_circulars(id) ON DELETE SET NULL,
  hop_number INT NOT NULL DEFAULT 1,
  source_pillar VARCHAR(64) NOT NULL,
  target_pillar VARCHAR(64) NOT NULL,
  event_type VARCHAR(128) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id UUID,
  status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
  details JSONB NOT NULL DEFAULT '{}',
  sha256_hash VARCHAR(64) NOT NULL,
  previous_event_hash VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE compliance_cascade_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'compliance_cascade_events' AND policyname = 'tenant_compliance_cascade_events_policy'
  ) THEN
    CREATE POLICY tenant_compliance_cascade_events_policy ON compliance_cascade_events
      FOR ALL TO authenticated
      USING (organization_id = current_org_id())
      WITH CHECK (organization_id = current_org_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'compliance_cascade_events' AND policyname = 'admin_manage_compliance_cascade_events'
  ) THEN
    CREATE POLICY admin_manage_compliance_cascade_events ON compliance_cascade_events
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cascade_events_org ON compliance_cascade_events(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cascade_events_circular ON compliance_cascade_events(circular_id);
