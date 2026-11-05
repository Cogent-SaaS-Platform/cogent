-- ============================================================================
-- COGENT DATABASE MIGRATION: Gap Analysis Production Rebuild
-- Target: supabase/migrations/20261102000001_gap_analysis_production_rebuild.sql
-- ============================================================================

-- 1. PURGE CORRUPTED / FAKE SEEDED GAP EVALUATIONS
DELETE FROM gap_matrix_items
WHERE evaluation_id IN (
  SELECT id FROM gap_evaluations
  WHERE id::text LIKE 'eval-seed-%'
     OR metadata->>'analysisName' ILIKE '%Retail Banking Investigation%'
     OR metadata->>'analysisName' ILIKE '%Reg (EU) 2024/1624%'
) OR what_happened ILIKE '%corrupted file metadata%';

DELETE FROM gap_evaluations
WHERE id::text LIKE 'eval-seed-%'
   OR metadata->>'analysisName' ILIKE '%Retail Banking Investigation%'
   OR metadata->>'analysisName' ILIKE '%Reg (EU) 2024/1624%';

-- 2. ENHANCE GAP_EVALUATIONS FOR MULTI-REGULATION VS MULTI-POLICY
ALTER TABLE gap_evaluations
  ADD COLUMN IF NOT EXISTS regulation_ids JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS policy_ids JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS action_plan JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS audit_logs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scope VARCHAR(64) DEFAULT 'COMPLETE_REGULATORY_REVIEW',
  ADD COLUMN IF NOT EXISTS analysis_name TEXT,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT DEFAULT 'Authorized Compliance Officer';

-- 3. ENHANCE GAP_MATRIX_ITEMS FOR REAL CRITERIA-LEVEL EVALUATION
ALTER TABLE gap_matrix_items
  ADD COLUMN IF NOT EXISTS obligation_title TEXT,
  ADD COLUMN IF NOT EXISTS obligation_code VARCHAR(64),
  ADD COLUMN IF NOT EXISTS obligation_description TEXT,
  ADD COLUMN IF NOT EXISTS rule_type VARCHAR(64) DEFAULT 'Prescriptive',
  ADD COLUMN IF NOT EXISTS policy_applicability VARCHAR(64) DEFAULT 'Policy Applicable',
  ADD COLUMN IF NOT EXISTS criteria_evaluations JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS action_items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS suggested_action_item TEXT,
  ADD COLUMN IF NOT EXISTS draft_remediation_clause TEXT,
  ADD COLUMN IF NOT EXISTS regulation_title TEXT,
  ADD COLUMN IF NOT EXISTS regulation_id UUID,
  ADD COLUMN IF NOT EXISTS source_section_ref TEXT;

-- 4. CREATE INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_gap_items_eval_id ON gap_matrix_items(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_gap_eval_org ON gap_evaluations(organization_id, created_at DESC);
