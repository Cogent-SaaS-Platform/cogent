-- ============================================================================
-- COGENT DATABASE MIGRATION: Horizon Scanning & Insight Production Upgrade
-- Target File: supabase/migrations/20261031000003_horizon_scanning_production_upgrade.sql
-- ============================================================================

-- 1. Add complete production document object model columns to radar_circulars
ALTER TABLE radar_circulars
  ADD COLUMN IF NOT EXISTS doc_type VARCHAR(64) DEFAULT 'Circular / Directive',
  ADD COLUMN IF NOT EXISTS alert_type VARCHAR(32) DEFAULT 'Informative',
  ADD COLUMN IF NOT EXISTS severity_tier VARCHAR(16) DEFAULT 'G1',
  ADD COLUMN IF NOT EXISTS severity_score INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS executive_summary TEXT,
  ADD COLUMN IF NOT EXISTS key_points JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS impacted_departments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS important_dates JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS other_dates JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS topics JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS impacted_areas JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS severity_matrix JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS synthesis_status VARCHAR(32) DEFAULT 'PENDING_SYNTHESIS',
  ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS audit_logs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(32) DEFAULT 'Pending Review',
  ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_relevant BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_to JSONB DEFAULT NULL;

-- 2. Add indexes for high-throughput queries & filtering
CREATE INDEX IF NOT EXISTS idx_radar_circulars_doc_type ON radar_circulars(doc_type);
CREATE INDEX IF NOT EXISTS idx_radar_circulars_alert_type ON radar_circulars(alert_type);
CREATE INDEX IF NOT EXISTS idx_radar_circulars_synthesis_status ON radar_circulars(synthesis_status);
CREATE INDEX IF NOT EXISTS idx_radar_circulars_is_relevant ON radar_circulars(is_relevant);
CREATE INDEX IF NOT EXISTS idx_radar_circulars_is_starred ON radar_circulars(is_starred);
CREATE INDEX IF NOT EXISTS idx_radar_circulars_workflow_status ON radar_circulars(workflow_status);

-- 3. Sanitation: Delete corrupted test scrape items and junk titles
DELETE FROM radar_tenant_impacts
WHERE circular_id IN (
  SELECT id FROM radar_circulars 
  WHERE LOWER(TRIM(subject)) IN (
    'circular',
    'federal competition & consumer protection commission',
    'consumer rights & responsibilities',
    'civil society/consumer protection alliances',
    'data controllers/processors registration',
    'registered data controllers/data processors of major importance'
  )
);

DELETE FROM circular_supersession_links
WHERE parent_circular_id IN (
  SELECT id FROM radar_circulars 
  WHERE LOWER(TRIM(subject)) IN (
    'circular',
    'federal competition & consumer protection commission',
    'consumer rights & responsibilities',
    'civil society/consumer protection alliances',
    'data controllers/processors registration',
    'registered data controllers/data processors of major importance'
  )
) OR child_circular_id IN (
  SELECT id FROM radar_circulars 
  WHERE LOWER(TRIM(subject)) IN (
    'circular',
    'federal competition & consumer protection commission',
    'consumer rights & responsibilities',
    'civil society/consumer protection alliances',
    'data controllers/processors registration',
    'registered data controllers/data processors of major importance'
  )
);

DELETE FROM radar_circulars
WHERE LOWER(TRIM(subject)) IN (
  'circular',
  'federal competition & consumer protection commission',
  'consumer rights & responsibilities',
  'civil society/consumer protection alliances',
  'data controllers/processors registration',
  'registered data controllers/data processors of major importance'
);
