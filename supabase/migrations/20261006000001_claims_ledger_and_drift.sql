-- ==============================================================================
-- COGENT MIGRATION 20261006000001: CLAIMS LEDGER & POST-PUBLISH DRIFT WATCHER
-- Phase 1 / Task 1.1 — docs/INTEGRATION_ROADMAP_AND_AGENT_WORKFLOWS.md Section 4
-- Schema source of truth: docs/DATA_MODEL.md Section 6 & Section 11.3
-- Spec: docs/PILLAR_1_MARKETING_SHIELD.md v1.2.0 Sections 2, 5, 6
--
-- Additive only. Does NOT modify any existing table or RLS policy.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Institutional Memory Engine: Approved Phrasings Ledger
-- ------------------------------------------------------------------------------
CREATE TABLE tenant_claims_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_category VARCHAR(64) NOT NULL,
  approved_text TEXT NOT NULL,
  prohibited_counterpart TEXT,
  governing_regulator regulator_code_enum NOT NULL,
  statutory_citation TEXT NOT NULL,
  cco_rationale TEXT NOT NULL,
  approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Product taxonomy (PILLAR_1 Section 2). VARCHAR + CHECK keeps the ratified
  -- column type while rejecting unknown categories at the kernel level.
  CONSTRAINT tenant_claims_ledger_product_category_chk CHECK (
    product_category IN (
      'SAVINGS_DEPOSIT',
      'DIGITAL_NANO_LOAN',
      'PAYMENTS_WALLET',
      'REMITTANCE_FX',
      'WEALTHTECH_INVEST'
    )
  ),
  CONSTRAINT tenant_claims_ledger_approved_text_not_blank_chk CHECK (length(btrim(approved_text)) > 0),
  CONSTRAINT tenant_claims_ledger_rationale_not_blank_chk CHECK (length(btrim(cco_rationale)) > 0),
  CONSTRAINT tenant_claims_ledger_expiry_chk CHECK (expires_at IS NULL OR expires_at > approved_at)
);

-- Hot path: Stage 1 matcher loads active claims per (tenant, product category)
CREATE INDEX idx_claims_ledger_org_category_active
  ON tenant_claims_ledger(organization_id, product_category)
  WHERE is_active = true;

-- Fuzzy matching support (pg_trgm enabled in 20261002000001)
CREATE INDEX idx_claims_ledger_prohibited_trgm
  ON tenant_claims_ledger USING GIN (prohibited_counterpart gin_trgm_ops);

CREATE INDEX idx_claims_ledger_approved_trgm
  ON tenant_claims_ledger USING GIN (approved_text gin_trgm_ops);

-- ------------------------------------------------------------------------------
-- 2. Post-Publish Drift & Live Asset Watcher
-- ------------------------------------------------------------------------------
CREATE TABLE marketing_live_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES marketing_scans(id) ON DELETE SET NULL,
  live_url TEXT NOT NULL,
  channel marketing_channel_enum NOT NULL,
  original_approved_hash VARCHAR(64) NOT NULL,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  drift_status VARCHAR(32) NOT NULL DEFAULT 'SYNCED',
  drift_findings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT marketing_live_assets_drift_status_chk CHECK (
    drift_status IN ('SYNCED', 'DRIFT_DETECTED', 'ERROR')
  ),
  -- SHA-256 hex digest: exactly 64 lowercase hex chars
  CONSTRAINT marketing_live_assets_hash_format_chk CHECK (
    original_approved_hash ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT marketing_live_assets_url_scheme_chk CHECK (
    live_url ~* '^https?://'
  ),
  -- A tenant should not register the same URL twice
  CONSTRAINT marketing_live_assets_org_url_uniq UNIQUE (organization_id, live_url)
);

CREATE INDEX idx_live_assets_org_status
  ON marketing_live_assets(organization_id, drift_status, last_checked_at DESC);

CREATE INDEX idx_live_assets_scan
  ON marketing_live_assets(scan_id);

-- ------------------------------------------------------------------------------
-- 3. Row-Level Security (DATA_MODEL.md Section 11.3)
--    Tenant isolation: organization_id = current_org_id()
--    Explicit WITH CHECK prevents writing rows into another tenant.
-- ------------------------------------------------------------------------------
ALTER TABLE tenant_claims_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_live_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_claims_ledger_policy ON tenant_claims_ledger
  FOR ALL TO authenticated
  USING (organization_id = current_org_id())
  WITH CHECK (organization_id = current_org_id());

CREATE POLICY tenant_live_assets_policy ON marketing_live_assets
  FOR ALL TO authenticated
  USING (organization_id = current_org_id())
  WITH CHECK (organization_id = current_org_id());
