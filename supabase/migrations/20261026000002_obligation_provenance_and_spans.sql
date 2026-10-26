-- Migration: 20261026000002_obligation_provenance_and_spans.sql
-- Description: Adds character-span mapping, verbatim quote provenance, and structured extraction metadata to regulatory_obligations
-- Part of Phase 2: LLM-Driven Obligation Extraction & Grounded Quote Validation

ALTER TABLE regulatory_obligations ADD COLUMN IF NOT EXISTS verbatim_quote TEXT;
ALTER TABLE regulatory_obligations ADD COLUMN IF NOT EXISTS character_span_start INTEGER;
ALTER TABLE regulatory_obligations ADD COLUMN IF NOT EXISTS character_span_end INTEGER;
ALTER TABLE regulatory_obligations ADD COLUMN IF NOT EXISTS page_number INTEGER;
ALTER TABLE regulatory_obligations ADD COLUMN IF NOT EXISTS actor VARCHAR(255);
ALTER TABLE regulatory_obligations ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE regulatory_obligations ADD COLUMN IF NOT EXISTS target_object TEXT;
ALTER TABLE regulatory_obligations ADD COLUMN IF NOT EXISTS condition TEXT;
ALTER TABLE regulatory_obligations ADD COLUMN IF NOT EXISTS deadline_text VARCHAR(255);
ALTER TABLE regulatory_obligations ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_regulatory_obligations_clause_id ON regulatory_obligations (clause_id);
