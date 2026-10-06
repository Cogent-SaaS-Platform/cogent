# COGENT — Complete Platform Implementation Backlog (BACKLOG.md)

> **Version:** 1.1.0 (Hardened Foundation)  
> **Status:** APPROVED & LOCKED FOR BUILD PHASES  
> **Scope:** Full 3-Pillar Platform (Pillar 1: Marketing Shield, Pillar 2: Regulatory Radar, Pillar 3: 5-W Gap Matrix)  
> **Architecture Style:** Modular Monolith (TypeScript / Next.js App Router / Supabase / Gemini)

---

## Master Architecture Roadmap

```
PHASE 1: Foundation & Pillar 1 (The First Vertical Slice) [COMPLETED]
  └─ Epic 1: Scaffolding, Tooling & Modular Directory Structure [COMPLETED]
  └─ Epic 2: Supabase DB, pgvector, Full Provenance Schema & RLS Security [COMPLETED]
  └─ Epic 3: Seed Verified Nigerian Regulatory Corpus (ARCON + CBN) with Version Lineage [COMPLETED]
  └─ Epic 4: AI Engine Core (Configurable Gemini Models + Zod Schemas + ZDR) [COMPLETED]
  └─ Epic 5: Pillar 1 Core Service (Deterministic Matcher + Hybrid RAG + AI Rewriter) [COMPLETED]
  └─ Epic 6: Pillar 1 Interactive UI (Pre-Vetting Dashboard & Split-View) [COMPLETED]
  └─ Epic 7: Tamper-Evident Audit Ledger, AI Traceability & CCO Dossier Export [COMPLETED]
  └─ Epic 8: Automated Security & Regression Test Verification [COMPLETED]

PHASE 2: Pillar 2 (Regulatory Radar & Circular Impact Tracer)
  └─ Epic 9: Multi-Regulator Ingestion & PDF Parser Pipeline (Inngest)
  └─ Epic 10: Circular Deterministic Metadata Extraction & Ingestion
  └─ Epic 11: Relational Tenant Applicability Engine (`tenant_licenses` & `tenant_payment_rails`)
  └─ Epic 12: Multi-Role Impact Synthesis & Deadline Countdown (Gemini Pro + Resend)
  └─ Epic 13: Regulatory Radar Interactive UI & Action Item Tracker

PHASE 3: Pillar 3 (5-W Decision Gap Matrix & Audit Defense Pack)
  └─ Epic 14: Policy Document Ingestion & Structural Chunking Pipeline
  └─ Epic 15: Policy Clause Vector Indexing & RLS Isolation (pgvector 768d)
  └─ Epic 16: Clause-by-Clause Statutory Evaluation Engine
  └─ Epic 17: 5-W Operational Synthesis Engine (Gemini Pro + Deterministic Penalties)
  └─ Epic 18: Gap Matrix Interactive UI & Bank Examiner Defense Pack Export

PHASE 4: Unified Platform & Production Hardening
  └─ Epic 19: Unified Executive Dashboard & Cross-Pillar Synergies
  └─ Epic 20: Production Hardening, Performance Optimization & Security Verification
```

---

## Detailed Task Breakdown by Pillar

---

### PHASE 1: FOUNDATION & PILLAR 1 (MARKETING PRE-VETTING SHIELD)

#### EPIC 1: Scaffolding, Tooling & Modular Directory Structure [COMPLETED]
- [x] **Task 1.1:** Scaffold fresh Next.js 16+ App Router TypeScript project with strict configuration (`strict: true`, path aliases `@/modules/*`, `@/shared/*`).
- [x] **Task 1.2:** Install production dependencies (`@google/genai`, `ai`, `@ai-sdk/google`, `@supabase/supabase-js`, `zod`, `pino`, `lucide-react`, `vitest`).
- [x] **Task 1.3:** Implement `AppError` class hierarchy and Pino structured logger with automatic PII & sensitive token redaction.

#### EPIC 2: Database Schema, Vector Extensions & Multi-Tenant RLS [COMPLETED]
- [x] **Task 2.1:** Apply initial PostgreSQL migrations defining all tables, enums (`license_type_enum`, `payment_rail_enum`, `regulator_code_enum`, `scan_verdict_enum`), and vector extensions (`pgvector`, `uuid-ossp`, `pg_trgm`). Include full regulatory provenance tables: `regulatory_instruments`, `regulatory_document_versions`, `regulatory_clauses`, `regulatory_obligations`, `applicability_rules`, `statutory_penalties`, `tenant_licenses`, `tenant_payment_rails`, and `ai_analysis_runs`.
- [x] **Task 2.2:** Configure PostgreSQL Row-Level Security (RLS) on all tenant-specific tables and child tables (`marketing_findings`, `policy_clauses`, `gap_matrix_items`) with denormalized `organization_id`. Configure Clerk JWT helper function `current_org_id()`.

#### EPIC 3: Seed Verified Nigerian Regulatory Corpus with Provenance Lineage [COMPLETED]
- [x] **Task 3.1:** Ingest primary statutory instruments: ARCON Act 2022 / Code 2022, CBN Consumer Protection Framework 2019, FCCPC Digital Lending Guidelines 2022, and SEC Rules into `regulatory_instruments` and `regulatory_document_versions` with SHA-256 hashes and verification status.
- [x] **Task 3.2:** Ingest clauses, obligations, and penalties into `regulatory_clauses`, `regulatory_obligations`, and `statutory_penalties`. Compute genuine 768d embeddings using `gemini-embedding-2`.
- [x] **Task 3.3:** Populate `prohibited_terms` with foreign keys linking back to verified `regulatory_obligations` and `regulatory_clauses`.

#### EPIC 4: AI Engine Core (Configurable Gemini Models + Zod Schemas + ZDR) [COMPLETED]
- [x] **Task 4.1:** Implement central `AiEngine` abstraction with configurable model aliases (`FAST_MODEL`, `REASONING_MODEL`, `EMBEDDING_MODEL`), zero data retention (ZDR) configuration, and typed Zod parsing.
- [x] **Task 4.2:** Define `MarketingAnalysisOutputSchema` (candidate extraction only — no penalties in LLM output!) and implement closed-world prompt construction with XML delimiters.
- [x] **Task 4.3:** Ratify Section 7 Presentation Contract in `docs/AI_ENGINE.md` and codify typed `ResponseViewModel` & `MarketingShieldViewModel` in `src/shared/types/presentation.ts` enforcing *"Gemini determines structured meaning. Cogent determines presentation."*

#### EPIC 5: Pillar 1 Core Service (Marketing Pre-Vetting Shield) [COMPLETED]
- [x] **Task 5.1:** Implement `DeterministicRuleEvaluator` for zero-latency prohibited phrase and regex matching (verified with Canonical Scenarios A & B).
- [x] **Task 5.2:** Build hybrid retrieval service querying Supabase `regulatory_clauses` via `tsvector` English full-text search + `pgvector` cosine similarity (768d) using Reciprocal Rank Fusion (RRF). Verified on live Supabase and Gemini.
- [x] **Task 5.3:** Assemble `MarketingShieldService.executeScan()` coordinating deterministic checking, hybrid RAG, Gemini candidate extraction, deterministic penalty calculation from `statutory_penalties`, database persistence (`marketing_scans`, `marketing_findings`, `ai_analysis_runs`), and transformation into `MarketingShieldViewModel` per Section 7 contract.

#### EPIC 6: Marketing Shield Interactive UI [COMPLETED]
- [x] **Task 6.1:** Build interactive Next.js dashboard consuming `MarketingShieldViewModel` featuring split-view copy comparison, channel selector (SMS, Social, Push, Ad), and highlighted violation spans.
- [x] **Task 6.2:** Implement statutory citation cards, evidence-bounded verdict chips (`NO_ISSUE_DETECTED`, `REVIEW_RECOMMENDED`, `ISSUE_DETECTED`, `BLOCKING_ISSUE`), action item checklists with owner/deadline, and penalty exposure banner following the 6-level progressive disclosure hierarchy.

#### EPIC 7: Tamper-Evident Audit Ledger, AI Traceability & CCO Dossier Export [COMPLETED]
- [x] **Task 7.1:** Integrate execution tracking into `ai_analysis_runs` and append-only record writing to `audit_logs` with SHA-256 hashes.
- [x] **Task 7.2:** Implement one-click export of the official ARCON Pre-Clearance Dossier with pre-populated CCO attestation signature block.

#### EPIC 8: Automated Security & Regression Test Verification [COMPLETED]
- [x] **Task 8.1:** Write and run Vitest deterministic rule test suite (100% test coverage).
- [x] **Task 8.2:** Write and execute automated RLS multi-tenant security test suite verifying zero cross-tenant data leakage on parent and child tables.
- [x] **Task 8.3:** Playwright E2E smoke test covering user login, copy audit, and dossier export.

---

### PHASE 2: PILLAR 2 (REGULATORY RADAR & CIRCULAR IMPACT TRACER)

#### EPIC 9: Multi-Regulator Ingestion & PDF Parser Pipeline [COMPLETED]
- [x] **Task 9.1:** Configure Inngest background event handler (`radar/circular.ingested`) to process raw regulatory PDF circulars from Supabase Storage.
- [x] **Task 9.2:** Implement layout-preserving PDF text extractor retaining section numbering, official seals, issuing signatory, and tabular statutory schedules.

#### EPIC 10: Circular Deterministic Metadata Extraction & Ingestion [COMPLETED]
- [x] **Task 10.1:** Implement deterministic extraction of circular reference code, issuing body (`CBN`, `SEC`, `ARCON`, `NDPC`, `FCCPC`, `NFIU`), publication date, effective date, and statutory compliance deadline.
- [x] **Task 10.2:** Extract target entity classifications and affected payment rails into `radar_circulars`.

#### EPIC 11: Relational Tenant Applicability Engine [COMPLETED]
- [x] **Task 11.1:** Build deterministic `evaluateCircularApplicability()` matching circular mandates against relational `tenant_licenses` and `tenant_payment_rails`.
- [x] **Task 11.2:** Generate human-readable applicability explanations with exact license and rail references.

#### EPIC 12: Multi-Role Impact Synthesis & Deadline Countdown Engine [COMPLETED]
- [x] **Task 12.1:** Implement Gemini Pro multi-role synthesis service generating distinct, role-tailored briefs (COO, CCO, Product/Eng, CFO).
- [x] **Task 12.2:** Build automated deadline countdown calculator with tiered escalation levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL EMERGENCY`).
- [x] **Task 12.3:** Integrate Resend transactional email dispatches for critical regulatory alerts and scheduled Inngest reminders.

#### EPIC 13: Regulatory Radar Interactive UI & Action Item Tracker [COMPLETED]
- [x] **Task 13.1:** Construct the Regulatory Radar Feed UI displaying circular cards with urgency color-coding, countdown timers, and applicability badges.
- [x] **Task 13.2:** Build role-switching tabbed viewer (COO, CCO, Product/Eng, CFO) for deep-dive impact exploration.
- [x] **Task 13.3:** Build interactive Action Item Tracker allowing CCOs to assign compliance tasks with deadlines and track execution progress.
- [x] **Task 13.4:** Implement "Download Executive Board Brief" export.

---

### PHASE 3: PILLAR 3 (5-W DECISION GAP MATRIX & AUDIT DEFENSE PACK)

#### EPIC 14: Policy Document Ingestion & Structural Chunking Pipeline [COMPLETED]
- [x] **Task 14.1:** Build authenticated policy upload interface and private Supabase Storage handler (`policies/{org_id}/{policy_id}/`).
- [x] **Task 14.2:** Implement Inngest workflow (`gap-matrix/policy.uploaded`) performing structural heading detection, section number tracking, and atomic clause chunking.

#### EPIC 15: Policy Clause Vector Indexing & RLS Isolation [COMPLETED]
- [x] **Task 15.1:** Generate 768-dimensional embeddings via Google `gemini-embedding-2` for all extracted policy clauses.
- [x] **Task 15.2:** Bulk insert vectors into tenant-private `policy_clauses` table with denormalized `organization_id` and strict Row-Level Security verification.

#### EPIC 16: Clause-by-Clause Statutory Evaluation Engine [COMPLETED]
- [x] **Task 16.1:** Build statutory benchmark pairing engine linking internal policies to relevant statutory frameworks.
- [x] **Task 16.2:** Execute hybrid retrieval querying tenant `policy_clauses` for every statutory clause requirement.
- [x] **Task 16.3:** Classify compliance status into three standardized tiers: `ADEQUATELY_MET`, `PARTIALLY_MET`, `CRITICAL_GAP`.

#### EPIC 17: 5-W Operational Synthesis Engine (Gemini + Deterministic Penalties) [COMPLETED]
- [x] **Task 17.1:** Construct Gemini synthesis prompt enforcing the 5-W Operational Framework.
- [x] **Task 17.2:** Attach deterministic statutory penalties from `statutory_penalties` table.
- [x] **Task 17.3:** Validate complete evaluation output against `GapEvaluationOutputSchema` with typed Zod parser.
- [x] **Task 17.4:** Persist evaluation results to `gap_evaluations`, `gap_matrix_items`, and `ai_analysis_runs`.

#### EPIC 18: Gap Matrix Interactive UI & Bank Examiner Defense Pack Export [COMPLETED]
- [x] **Task 18.1:** Construct the 5-W Gap Matrix UI with summary metric cards (Compliance %, Critical Gaps, Partially Met, Adequately Met, Total Fine Avoidance).
- [x] **Task 18.2:** Build expandable 5-W decision drawer showing detailed operational breakdowns, replacement wording, and fine avoidance estimates.
- [x] **Task 18.3:** Implement one-click export of the official **CBN Bank Examiner Audit Defense Dossier** with SHA-256 verification hashes and CCO signature block.
- [x] **Task 18.4:** Wire seamless pillar navigation across the platform (`Pillar 1: Marketing Shield`, `Pillar 2: Regulatory Radar`, `Pillar 3: 5-W Gap Matrix`).

---

### PHASE 4: UNIFIED PLATFORM & PRODUCTION HARDENING

#### EPIC 19: Unified Executive Dashboard & Cross-Pillar Synergies [COMPLETED]
- [x] **Task 19.1:** Build unified Executive Overview Dashboard displaying cross-pillar compliance health.
- [x] **Task 19.2:** Implement cross-pillar linking (e.g., clicking a new CBN circular in Radar highlights affected policy clauses in the Gap Matrix).

#### EPIC 20: Production Hardening, Performance Optimization & Security Verification
- **Task 20.1:** Execute end-to-end multi-tenant penetration and RLS leak testing across all three pillars.
- **Task 20.2:** Run synthetic AI regression eval benchmarks to ensure prompt fidelity across 50 canonical Nigerian compliance scenarios.
- **Task 20.3:** Configure production deployment pipeline on Vercel and Supabase EU region with automated health checks.
