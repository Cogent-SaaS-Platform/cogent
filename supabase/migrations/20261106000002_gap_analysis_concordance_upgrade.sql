-- ============================================================================
-- COGENT DATABASE MIGRATION: Gap Analysis Production Concordance Upgrade
-- Target: supabase/migrations/20261106000002_gap_analysis_concordance_upgrade.sql
-- ============================================================================

-- 1. PURGE ALL HARDCODED / FAKE DEMO SEEDS & CORRUPTED METADATA
DELETE FROM gap_matrix_items
WHERE evaluation_id IN (
  SELECT id FROM gap_evaluations
  WHERE id::text LIKE 'eval-seed-%'
     OR metadata->>'analysisName' ILIKE '%Retail Banking Investigation%'
     OR metadata->>'analysisName' ILIKE '%Reg (EU) 2024/1624%'
     OR metadata->>'analysisName' ILIKE '%Special situations of simplified%'
     OR metadata->>'analysisName' ILIKE '%Special Risk Situations%'
) 
OR what_happened ILIKE '%corrupted file metadata%'
OR what_happened ILIKE '%The CBN enforces strict transp%'
OR obligation_title ILIKE '%The CBN enforces strict transp%';

DELETE FROM gap_evaluations
WHERE id::text LIKE 'eval-seed-%'
   OR metadata->>'analysisName' ILIKE '%Retail Banking Investigation%'
   OR metadata->>'analysisName' ILIKE '%Reg (EU) 2024/1624%'
   OR metadata->>'analysisName' ILIKE '%Special situations of simplified%'
   OR metadata->>'analysisName' ILIKE '%Special Risk Situations%';

-- 2. ENHANCE POLICY_CLAUSES WITH SECTION_TITLE
ALTER TABLE policy_clauses
  ADD COLUMN IF NOT EXISTS section_title TEXT;

-- 3. CREATE STRUCTURAL POLICY_SECTIONS TABLE FOR AUTHENTIC DECOMPOSITION
CREATE TABLE IF NOT EXISTS policy_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES policy_documents(id) ON DELETE CASCADE,
  section_number VARCHAR(100) NOT NULL,
  section_title TEXT NOT NULL,
  verbatim_content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for high-concurrency lookups
CREATE INDEX IF NOT EXISTS idx_policy_sections_org_pol ON policy_sections(organization_id, policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_sections_pol_id ON policy_sections(policy_id);

-- RLS Enforcement
ALTER TABLE policy_sections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'policy_sections' AND policyname = 'tenant_policy_sections_policy'
  ) THEN
    CREATE POLICY tenant_policy_sections_policy ON policy_sections
      FOR ALL
      USING (
        organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR organization_id IS NULL
      )
      WITH CHECK (
        organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      );
  END IF;
END $$;
