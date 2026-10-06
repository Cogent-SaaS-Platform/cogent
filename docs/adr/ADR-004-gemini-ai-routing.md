# ADR-004: Configurable Multi-Model AI Routing, Candidate Decoupling, and Zero Data Retention

## Status
Accepted & Hardened (v1.1) — 2 October 2026

## Context
Cogent requires both ultra-fast contextual triage and deep statutory reasoning. In v1.0, models were hardcoded (including versions being deprecated by Google), the AI schema allowed Gemini to hallucinate financial penalties directly, and epistemic states claimed "100% compliance".

## Decision
1. **Configurable Model Aliases:** Replace hardcoded model strings with environment-configured aliases:
   - `FAST_MODEL`: `gemini-3.8-flash` or `gemini-3.5-flash-lite` (default).
   - `REASONING_MODEL`: `gemini-3.5-pro` (default).
   - `EMBEDDING_MODEL`: `gemini-embedding-2` configured to 768 dimensions.
2. **Decoupled Candidate Extraction:** The AI Engine extracts candidate rule codes, flagged excerpts, and draft rewrites. It is strictly prohibited from generating monetary penalty numbers. Penalties are computed deterministically by querying verified `statutory_penalties` records.
3. **Epistemic Modesty:** System replaces "100% compliant / CLEARED" with evidence-bounded statuses: `NO_ISSUE_DETECTED`, `REVIEW_RECOMMENDED`, `ISSUE_DETECTED`, `BLOCKING_ISSUE`. Human CCO approval is required for formal clearance.
4. **Mandatory AI Traceability:** Every call is recorded in `ai_analysis_runs` with token usage, prompt/output SHA-256 hashes, and retrieved evidence IDs.
5. **Zero Data Retention (ZDR):** Configured via Google Cloud Vertex AI / Enterprise Paid Gemini with data storage disabled (`store: false`).

## Consequences
- **Positive:** Immune to model deprecation; impossible for LLM to hallucinate incorrect penalty numbers; legally defensible evidence-bounded terminology; complete auditability for bank examiners.
- **Negative:** Requires an extra deterministic post-processing step in code to enrich candidate rule codes with penalty schedules.
