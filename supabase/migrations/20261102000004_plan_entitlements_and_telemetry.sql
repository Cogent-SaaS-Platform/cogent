-- ============================================================================
-- COGENT DATABASE MIGRATION: Plan Entitlements, Telemetry & Ingestion Tracking
-- Target: supabase/migrations/20261102000004_plan_entitlements_and_telemetry.sql
-- ============================================================================

-- 1. ADD ORGANIZATION_ID TO REGULATORY_INSTRUMENTS TO TRACK CUSTOM INGESTIONS PER TENANT
ALTER TABLE regulatory_instruments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reg_instruments_org_id ON regulatory_instruments(organization_id);

-- 2. CREATE INGESTION TELEMETRY AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS tenant_ingestion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(64) NOT NULL, -- 'CUSTOM_REGULATION_INGEST', 'POLICY_UPLOAD', 'GAP_ANALYSIS_RUN', 'CAMPAIGN_CREATE'
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_ingestion_events_org_created 
  ON tenant_ingestion_events(organization_id, created_at DESC);

-- 3. RLS SECURITY POLICIES FOR INGESTION EVENTS
ALTER TABLE tenant_ingestion_events ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tenant_ingestion_events' 
    AND policyname = 'tenant_isolation_ingestion_events'
  ) THEN
    CREATE POLICY tenant_isolation_ingestion_events ON tenant_ingestion_events
      FOR ALL
      USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;
