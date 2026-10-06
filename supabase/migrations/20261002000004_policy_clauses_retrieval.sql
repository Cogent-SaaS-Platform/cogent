-- Migration: 20261002000004_policy_clauses_retrieval.sql
-- Description: Adds PostgreSQL RPC function for pgvector cosine similarity search on tenant-isolated policy_clauses
-- Adheres to docs/PILLAR_3_5W_GAP_MATRIX.md Section 3 and docs/DATA_MODEL.md Section 8

CREATE OR REPLACE FUNCTION match_policy_clauses(
  p_organization_id uuid,
  p_policy_id uuid,
  query_embedding vector(768),
  match_threshold float DEFAULT 0.1,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  section_number varchar,
  clause_text text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.section_number,
    pc.clause_text,
    ROUND((1 - (pc.embedding <=> query_embedding))::numeric, 4)::float AS similarity
  FROM policy_clauses pc
  WHERE pc.organization_id = p_organization_id
    AND pc.policy_id = p_policy_id
    AND pc.embedding IS NOT NULL
    AND (1 - (pc.embedding <=> query_embedding)) >= match_threshold
  ORDER BY pc.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_policy_clauses TO anon, authenticated, service_role;
