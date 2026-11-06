-- ============================================================================
-- COGENT DATABASE MIGRATION: Compliance Overview & Deadlines Engine
-- Target: supabase/migrations/20261102000003_compliance_overview_deadlines.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  regulator_code VARCHAR(32) NOT NULL,
  source_module VARCHAR(32) NOT NULL DEFAULT 'horizon', -- 'horizon' | 'library' | 'gap' | 'marketing'
  source_id TEXT,
  due_date DATE NOT NULL,
  summary TEXT,
  target_url TEXT,
  priority VARCHAR(32) DEFAULT 'HIGH',
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comp_deadlines_org_date ON compliance_deadlines(organization_id, due_date ASC);

ALTER TABLE compliance_deadlines ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS comp_deadlines_tenant_policy ON compliance_deadlines;
  CREATE POLICY comp_deadlines_tenant_policy ON compliance_deadlines
    FOR ALL TO authenticated
    USING (organization_id = (select public.current_org_id()))
    WITH CHECK (organization_id = (select public.current_org_id()));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
