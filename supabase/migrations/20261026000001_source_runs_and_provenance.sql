-- Migration: source_runs_and_provenance
-- Adds source_runs table for tracking scraper/poller health, latency, and freshness
-- Adds provenance and source_tier columns for rigorous lineage tracking

CREATE TABLE IF NOT EXISTS source_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_code VARCHAR(100) NOT NULL,
  source_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  items_seen INTEGER NOT NULL DEFAULT 0,
  items_ingested INTEGER NOT NULL DEFAULT 0,
  items_deduplicated INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  http_status INTEGER,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_source_runs_source_code_started ON source_runs (source_code, started_at DESC);

ALTER TABLE regulatory_document_versions ADD COLUMN IF NOT EXISTS provenance VARCHAR(50) DEFAULT 'PRIMARY';
ALTER TABLE radar_circulars ADD COLUMN IF NOT EXISTS source_tier VARCHAR(50) DEFAULT 'PRIMARY';

ALTER TABLE source_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'source_runs' AND policyname = 'Allow service_role full access to source_runs'
  ) THEN
    CREATE POLICY "Allow service_role full access to source_runs" ON source_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'source_runs' AND policyname = 'Allow authenticated read to source_runs'
  ) THEN
    CREATE POLICY "Allow authenticated read to source_runs" ON source_runs FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
