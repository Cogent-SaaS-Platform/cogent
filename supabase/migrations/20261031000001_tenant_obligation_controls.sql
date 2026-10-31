-- ==============================================================================
-- COGENT MIGRATION 20261031000001: TENANT OBLIGATION CONTROLS & 4-PHASE MAPPING
-- Supports Step 3: 4-Phase Obligation Architecture, 3 Core Supervisory Metrics
-- ==============================================================================

CREATE TABLE IF NOT EXISTS tenant_obligation_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  obligation_id UUID NOT NULL REFERENCES regulatory_obligations(id) ON DELETE CASCADE,
  control_id VARCHAR(100),
  control_name TEXT,
  policy_id VARCHAR(100),
  policy_name TEXT,
  custodian_role VARCHAR(100),
  department VARCHAR(100),
  effectiveness_status VARCHAR(50) NOT NULL DEFAULT 'NEEDS_REVIEW',
  evidence_status VARCHAR(50) NOT NULL DEFAULT 'PENDING_AUDIT',
  evidence_artifact_name TEXT,
  notes TEXT,
  last_audited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, obligation_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_obligation_controls_org ON tenant_obligation_controls (organization_id);
CREATE INDEX IF NOT EXISTS idx_tenant_obligation_controls_obl ON tenant_obligation_controls (obligation_id);
CREATE INDEX IF NOT EXISTS idx_tenant_obligation_controls_ctrl ON tenant_obligation_controls (control_id);

ALTER TABLE tenant_obligation_controls ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_obligation_controls'
  ) THEN
    CREATE POLICY tenant_isolation_obligation_controls ON tenant_obligation_controls
      FOR ALL USING (organization_id = current_org_id());
  END IF;
END
$$;
