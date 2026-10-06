-- ============================================================================
-- COGENT DATABASE MIGRATION: Pillar 2 (Regulatory Radar & Lineage Graph)
-- Target File: supabase/migrations/20261006000005_radar_circulars_and_lineage.sql
-- Adheres to docs/INTEGRATION_ROADMAP_AND_AGENT_WORKFLOWS.md (Task 2.1)
-- ============================================================================

-- 1. Ensure NDIC is present in regulator_code_enum
ALTER TYPE regulator_code_enum ADD VALUE IF NOT EXISTS 'NDIC';

-- 2. Insert NDIC into regulatory_bodies
INSERT INTO regulatory_bodies (code, name, enforcement_power_summary, official_portal_url)
VALUES (
  'NDIC',
  'Nigeria Deposit Insurance Corporation',
  'Insuring deposit liabilities of licensed banks and assisting monetary authorities in formulating banking policy.',
  'https://ndic.gov.ng'
)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    enforcement_power_summary = EXCLUDED.enforcement_power_summary,
    official_portal_url = EXCLUDED.official_portal_url;

-- 3. Enhance radar_circulars with lineage tracking, dates, checksum, and embeddings
ALTER TABLE radar_circulars
  ADD COLUMN IF NOT EXISTS lineage_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE_LAW',
  ADD COLUMN IF NOT EXISTS issuance_date DATE,
  ADD COLUMN IF NOT EXISTS effective_date DATE,
  ADD COLUMN IF NOT EXISTS raw_text TEXT,
  ADD COLUMN IF NOT EXISTS document_checksum VARCHAR(64),
  ADD COLUMN IF NOT EXISTS embedding vector(768);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'radar_circulars_lineage_status_chk'
  ) THEN
    ALTER TABLE radar_circulars
      ADD CONSTRAINT radar_circulars_lineage_status_chk
      CHECK (lineage_status IN ('ACTIVE_LAW', 'AMENDED', 'SUPERSEDED'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_radar_circulars_checksum ON radar_circulars(document_checksum);
CREATE INDEX IF NOT EXISTS idx_radar_circulars_number ON radar_circulars(circular_number);
CREATE INDEX IF NOT EXISTS idx_radar_circulars_lineage ON radar_circulars(lineage_status);
CREATE INDEX IF NOT EXISTS idx_radar_circulars_deadline ON radar_circulars(statutory_deadline);

-- 4. Circular Lineage & Supersession Links Table
CREATE TABLE IF NOT EXISTS circular_supersession_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_circular_id UUID NOT NULL REFERENCES radar_circulars(id) ON DELETE CASCADE,
  child_circular_id UUID NOT NULL REFERENCES radar_circulars(id) ON DELETE CASCADE,
  amendment_type VARCHAR(32) NOT NULL,
  affected_clause_references TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT circular_supersession_links_amendment_type_chk
    CHECK (amendment_type IN ('AMENDS', 'REPLACES', 'REVOKES_AND_REPLACES', 'REPEALS', 'PARTIALLY_REPEALS', 'CITES')),
  UNIQUE(parent_circular_id, child_circular_id)
);

CREATE INDEX IF NOT EXISTS idx_supersession_parent ON circular_supersession_links(parent_circular_id);
CREATE INDEX IF NOT EXISTS idx_supersession_child ON circular_supersession_links(child_circular_id);

-- Enable Row Level Security on circular_supersession_links
ALTER TABLE circular_supersession_links ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'public_read_circular_supersession_links'
  ) THEN
    CREATE POLICY public_read_circular_supersession_links ON circular_supersession_links
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'admin_manage_circular_supersession_links'
  ) THEN
    CREATE POLICY admin_manage_circular_supersession_links ON circular_supersession_links
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 5. Upgrade radar_tenant_impacts for 4-way ExCo briefs and acknowledgment
ALTER TABLE radar_tenant_impacts
  ADD COLUMN IF NOT EXISTS role_briefs JSONB,
  ADD COLUMN IF NOT EXISTS priority_level severity_level_enum DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS acknowledged_by_cco BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS brief_cco JSONB,
  ADD COLUMN IF NOT EXISTS brief_cfo JSONB,
  ADD COLUMN IF NOT EXISTS brief_cto JSONB,
  ADD COLUMN IF NOT EXISTS brief_ceo_cro JSONB;

-- 6. Ensure full-text search index on radar_circulars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_radar_circulars_search'
  ) THEN
    CREATE INDEX idx_radar_circulars_search ON radar_circulars
      USING gin(to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(summary, '')));
  END IF;
END $$;
