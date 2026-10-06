# ADR-005: Hybrid Statutory Retrieval via Native PostgreSQL and gemini-embedding-2

## Status
Accepted & Hardened (v1.1) — 2 October 2026

## Context
Cogent must retrieve exact statutory clauses from the Nigerian regulatory corpus. Google shut down `text-embedding-004` on January 14, 2026. We need a modern, actively supported embedding model that maintains compatibility with PostgreSQL `vector(768)` without altering database schema dimensions.

## Decision
1. We adopt Google's current **`gemini-embedding-2`** model configured with `outputDimensionality: 768`.
2. Retrieval executes as a Two-Stage Hybrid Engine within PostgreSQL:
   - **Stage 1 (Deterministic Filter):** Filter by regulator code, tenant license type (`tenant_licenses`), and payment rails (`tenant_payment_rails`).
   - **Stage 2 (Hybrid Search):** Combine PostgreSQL full-text search (`tsvector` with GIN indexing) and vector similarity (`pgvector` with HNSW cosine distance indexing on 768d vectors).

## Consequences
- **Positive:** Modern embedding model supported by Google; maintains 768-dimensional vector size; zero external vector database infrastructure required; exact legal citations matched via tsvector while semantic intent matched via gemini-embedding-2.
- **Negative:** Re-indexing requires calling `gemini-embedding-2` API asynchronously via Inngest workers.
