-- ============================================================================
-- COGENT DATABASE MIGRATION: Senior Regulatory Counsel Briefing & Executive Advisory
-- Target: supabase/migrations/20261106000003_senior_counsel_briefing.sql
-- ============================================================================

-- 1. ADD SENIOR COUNSEL BRIEFING TO GAP MATRIX ITEMS
ALTER TABLE gap_matrix_items
  ADD COLUMN IF NOT EXISTS senior_counsel_briefing JSONB DEFAULT NULL;

-- 2. ADD EXECUTIVE MACRO BRIEFING TO GAP EVALUATIONS
ALTER TABLE gap_evaluations
  ADD COLUMN IF NOT EXISTS executive_briefing JSONB DEFAULT NULL;

-- 3. INDEX FOR FAST RETRIEVAL
CREATE INDEX IF NOT EXISTS idx_gap_matrix_items_briefing ON gap_matrix_items USING GIN (senior_counsel_briefing);
CREATE INDEX IF NOT EXISTS idx_gap_evaluations_briefing ON gap_evaluations USING GIN (executive_briefing);
