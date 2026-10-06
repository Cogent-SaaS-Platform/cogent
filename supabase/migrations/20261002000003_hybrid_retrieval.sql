-- Migration: 20261002000003_hybrid_retrieval.sql
-- Description: Adds PostgreSQL RPC functions for pgvector cosine similarity and full-text search on regulatory_clauses
-- Adheres to docs/PILLAR_1_MARKETING_SHIELD.md Stage 3 and docs/AI_ENGINE.md Section 2

-- 1. Vector Cosine Similarity Search on Verified Regulatory Clauses
CREATE OR REPLACE FUNCTION match_regulatory_clauses(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.2,
  match_count int DEFAULT 5,
  filter_regulator regulator_code_enum DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  section_reference varchar,
  section_heading text,
  clause_text text,
  similarity float,
  regulator_code regulator_code_enum,
  instrument_title text,
  instrument_short_name varchar
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.id,
    rc.section_reference,
    rc.section_heading,
    rc.clause_text,
    ROUND((1 - (rc.embedding <=> query_embedding))::numeric, 4)::float AS similarity,
    rb.code AS regulator_code,
    ri.title AS instrument_title,
    ri.short_name AS instrument_short_name
  FROM regulatory_clauses rc
  JOIN regulatory_document_versions rdv ON rc.document_version_id = rdv.id
  JOIN regulatory_instruments ri ON rdv.instrument_id = ri.id
  JOIN regulatory_bodies rb ON ri.body_id = rb.id
  WHERE rc.embedding IS NOT NULL
    AND rdv.is_active = true
    AND (filter_regulator IS NULL OR rb.code = filter_regulator)
    AND (1 - (rc.embedding <=> query_embedding)) >= match_threshold
  ORDER BY rc.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

-- 2. Full-Text Keyword Search on Verified Regulatory Clauses
CREATE OR REPLACE FUNCTION search_regulatory_clauses_fts(
  query_text text,
  match_count int DEFAULT 5,
  filter_regulator regulator_code_enum DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  section_reference varchar,
  section_heading text,
  clause_text text,
  fts_rank float,
  regulator_code regulator_code_enum,
  instrument_title text,
  instrument_short_name varchar
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.id,
    rc.section_reference,
    rc.section_heading,
    rc.clause_text,
    ROUND(ts_rank_cd(rc.tsv, plainto_tsquery('english', query_text))::numeric, 4)::float AS fts_rank,
    rb.code AS regulator_code,
    ri.title AS instrument_title,
    ri.short_name AS instrument_short_name
  FROM regulatory_clauses rc
  JOIN regulatory_document_versions rdv ON rc.document_version_id = rdv.id
  JOIN regulatory_instruments ri ON rdv.instrument_id = ri.id
  JOIN regulatory_bodies rb ON ri.body_id = rb.id
  WHERE rdv.is_active = true
    AND (filter_regulator IS NULL OR rb.code = filter_regulator)
    AND rc.tsv @@ plainto_tsquery('english', query_text)
  ORDER BY ts_rank_cd(rc.tsv, plainto_tsquery('english', query_text)) DESC
  LIMIT match_count;
END;
$$;

-- Grant execution to authenticated and anon roles (read-only queries on public regulatory corpus)
GRANT EXECUTE ON FUNCTION match_regulatory_clauses TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_regulatory_clauses_fts TO anon, authenticated, service_role;
