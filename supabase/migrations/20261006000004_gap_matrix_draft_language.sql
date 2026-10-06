-- ==============================================================================
-- COGENT MIGRATION 20261006000004: GAP MATRIX 5-W DRAFT REPLACEMENT LANGUAGE
-- Adheres to docs/PILLAR_3_5W_GAP_MATRIX.md Section 7 and docs/DATA_MODEL.md Section 8
-- Adds draft_replacement_language, responsible_role, and remediation_timeline_days
-- to gap_matrix_items table with tenant-isolated RLS guarantees.
-- ==============================================================================

-- 1. Extend gap_matrix_items with board-ready draft replacement language and remediation metadata
ALTER TABLE gap_matrix_items 
  ADD COLUMN IF NOT EXISTS draft_replacement_language TEXT,
  ADD COLUMN IF NOT EXISTS responsible_role VARCHAR(100),
  ADD COLUMN IF NOT EXISTS remediation_timeline_days INTEGER DEFAULT 30;

-- 2. Compound indexes for high-throughput compliance queries
CREATE INDEX IF NOT EXISTS idx_gap_matrix_items_status 
  ON gap_matrix_items(organization_id, compliance_status);

CREATE INDEX IF NOT EXISTS idx_gap_matrix_items_evaluation 
  ON gap_matrix_items(organization_id, evaluation_id);

CREATE INDEX IF NOT EXISTS idx_gap_evaluations_policy 
  ON gap_evaluations(organization_id, policy_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_policy_documents_tenant_date 
  ON policy_documents(organization_id, created_at DESC);

-- 3. Confirm and re-affirm RLS policies on Pillar 3 tables
ALTER TABLE policy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE gap_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gap_matrix_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gap_matrix_items' AND policyname = 'tenant_gap_matrix_items_policy'
  ) THEN
    CREATE POLICY tenant_gap_matrix_items_policy ON gap_matrix_items
      FOR ALL TO authenticated 
      USING (organization_id = current_org_id());
  END IF;
END $$;
