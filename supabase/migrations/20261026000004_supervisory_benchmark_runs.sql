-- ==============================================================================
-- COGENT DATABASE MIGRATION: Phase 5 (Supervisory Benchmark Runs Ledger)
-- Target File: supabase/migrations/20261026000004_supervisory_benchmark_runs.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS supervisory_benchmark_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_suite_version VARCHAR(50) NOT NULL DEFAULT 'v1.0.0-phase5',
  total_instruments INTEGER NOT NULL,
  total_ground_truth_obligations INTEGER NOT NULL,
  total_extracted_obligations INTEGER NOT NULL,
  true_positives INTEGER NOT NULL,
  false_positives INTEGER NOT NULL,
  false_negatives INTEGER NOT NULL,
  precision_score NUMERIC(5, 4) NOT NULL,
  recall_score NUMERIC(5, 4) NOT NULL,
  f1_score NUMERIC(5, 4) NOT NULL,
  character_span_fidelity_score NUMERIC(5, 4) NOT NULL,
  statutory_penalty_grounding_score NUMERIC(5, 4) NOT NULL,
  hallucinated_penalties_count INTEGER NOT NULL DEFAULT 0,
  character_drift_count INTEGER NOT NULL DEFAULT 0,
  sha256_seal VARCHAR(64) NOT NULL,
  execution_latency_ms INTEGER NOT NULL,
  results_summary JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE supervisory_benchmark_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'supervisory_benchmark_runs' AND policyname = 'service_role_full_access_supervisory_benchmark'
  ) THEN
    CREATE POLICY service_role_full_access_supervisory_benchmark ON supervisory_benchmark_runs
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'supervisory_benchmark_runs' AND policyname = 'authenticated_read_supervisory_benchmark'
  ) THEN
    CREATE POLICY authenticated_read_supervisory_benchmark ON supervisory_benchmark_runs
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_supervisory_benchmark_runs_created ON supervisory_benchmark_runs (created_at DESC);
