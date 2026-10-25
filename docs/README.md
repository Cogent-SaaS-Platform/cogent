# COGENT — Complete System Documentation Index (README.md)

> **Platform:** Cogent — Regulatory Compliance Decision Engine for Nigerian Financial Institutions  
> **Version:** 1.1.0 (Hardened Foundation)  
> **Status:** RATIFIED & LOCKED  
> **Architecture Pattern:** Modular Monolith (TypeScript / Next.js App Router / Supabase / Gemini)

Welcome to the Cogent system documentation repository. This directory contains the complete, binding architectural constitution, technical specifications, and engineering backlogs for all three product pillars. 

**Every engineer and AI pair programmer must consult these documents before authoring code, modifying database schemas, or writing prompts.**

> 🚀 **CURRENT REDESIGN SPRINT**: See [**`PHASE_ZANGO_REDESIGN_HANDOVER_GUIDE.md`**](file:///c:/Users/Alex%20Marco/Documents/Cogent/docs/PHASE_ZANGO_REDESIGN_HANDOVER_GUIDE.md) for the active Zango RegTech redesign constitution, completed modules, and next steps for new chat sessions.

---

## 1. System Constitution & Foundation Documents (v1.1)

| Document | Purpose & Summary |
| :--- | :--- |
| [**`PRODUCT.md`**](file:///c:/Users/Alex%20Marco/Documents/Cogent/docs/PRODUCT.md) | Nigerian market reality, 3 pillars, buyer personas, commercial pricing tiers, explicit MVP vs Non-MVP scope, success criteria, assumptions, risk register, and epistemic modesty. |
| [**`ARCHITECTURE.md`**](file:///c:/Users/Alex%20Marco/Documents/Cogent/docs/ARCHITECTURE.md) | Modular Monolith architecture, Next.js App Router structure, Clerk JWT RLS integration, regulatory corpus provenance hierarchy, and Inngest async processing. |
| [**`DATA_MODEL.md`**](file:///c:/Users/Alex%20Marco/Documents/Cogent/docs/DATA_MODEL.md) | PostgreSQL 16 relational DDL, Clerk org mapping, regulatory instruments & versions, relational tenant licenses & rails, AI traceability (`ai_analysis_runs`), and RLS on all tables. |
| [**`AI_ENGINE.md`**](file:///c:/Users/Alex%20Marco/Documents/Cogent/docs/AI_ENGINE.md) | Configurable Gemini model aliases (`FAST_MODEL`, `REASONING_MODEL`, `gemini-embedding-2` 768d), decoupled AI candidate extraction vs deterministic penalties, and ZDR provider configuration. |
| [**`SECURITY.md`**](file:///c:/Users/Alex%20Marco/Documents/Cogent/docs/SECURITY.md) | NDPA 2023 compliance, prompt injection defense, file threat handling, CAMA/BOFIA 6-year audit retention, service-role quarantine, and incident response. |
| [**`USER_FLOWS.md`**](file:///c:/Users/Alex%20Marco/Documents/Cogent/docs/USER_FLOWS.md) | Detailed operational workflows for Relational Onboarding, Marketing Pre-Vetting, Regulatory Radar Ingestion, and 5-W Gap Matrix Auditing. |
| [**`ENGINEERING.md`**](file:///c:/Users/Alex%20Marco/Documents/Cogent/docs/ENGINEERING.md) | Strict TypeScript standards, complete directory tree, Supabase migrations workflow, secrets conventions, CI/CD pipeline, AI call conventions, and Definition of Done. |
| [**`MVP.md`**](file:///c:/Users/Alex%20Marco/Documents/Cogent/docs/MVP.md) | Definition, canonical test fixtures, evidence-bounded statuses, and acceptance criteria for the First Vertical Slice (Pillar 1: Marketing Pre-Vetting Shield). |
| [**`BACKLOG.md`**](file:///c:/Users/Alex%20Marco/Documents/Cogent/docs/BACKLOG.md) | Comprehensive 20-Epic engineering backlog detailing step-by-step tasks across all three pillars and platform hardening. |

---

## 2. Dedicated Pillar Specifications (v1.1)

| Document | Product Pillar | Focus Area |
| :--- | :--- | :--- |
| [**`PILLAR_1_MARKETING_SHIELD.md`**](file:///c:/Users/Alex%20Marco/Documents/Cogent/docs/PILLAR_1_MARKETING_SHIELD.md) | **Pillar 1: Marketing Pre-Vetting Shield** | Prohibited terms catalog with statutory obligation FKs, channel constraints, hybrid RAG retrieval, decoupled AI candidate extraction, deterministic penalty engine, and ARCON pre-clearance export. |
| [**`PILLAR_2_REGULATORY_RADAR.md`**](file:///c:/Users/Alex%20Marco/Documents/Cogent/docs/PILLAR_2_REGULATORY_RADAR.md) | **Pillar 2: Regulatory Radar & Impact Tracer** | Multi-regulator ingestion pipeline (CBN, SEC, ARCON, NDPC, FCCPC, NFIU), relational license & rail applicability engine, multi-role executive impact briefs (COO, CCO, Product/Eng, CFO), and statutory deadline countdown engine. |
| [**`PILLAR_3_5W_GAP_MATRIX.md`**](file:///c:/Users/Alex%20Marco/Documents/Cogent/docs/PILLAR_3_5W_GAP_MATRIX.md) | **Pillar 3: 5-W Decision Gap Matrix** | Policy document ingestion, clause-by-clause statutory evaluation, compliance status classification (Adequately Met, Partially Met, Critical Gap), the 5-W Operational Framework, and Bank Examiner Audit Defense Packs. |

---

## 3. Architecture Decision Records (ADRs)

- [**`ADR-001: TypeScript Full-Stack Adoption`**](file:///c:/Users/Alex%20Marco/Documents/Cogent/docs/adr/ADR-001-typescript-fullstack.md)
- [**`ADR-002: Modular Monolith with Next.js App Router`**](file:///c:/Users/Alex%20Marco/Documents/Cogent/docs/adr/ADR-002-modular-monolith-nextjs.md)
- [**`ADR-003: Multi-Tenancy via Shared DB, Clerk JWT Claims, and PostgreSQL RLS`**](file:///c:/Users/Alex%20Marco/Documents/Cogent/docs/adr/ADR-003-multi-tenancy-rls.md)
- [**`ADR-004: Configurable Multi-Model AI Routing, Candidate Decoupling, and ZDR`**](file:///c:/Users/Alex%20Marco/Documents/Cogent/docs/adr/ADR-004-gemini-ai-routing.md)
- [**`ADR-005: Hybrid Statutory Retrieval via Native PostgreSQL and gemini-embedding-2`**](file:///c:/Users/Alex%20Marco/Documents/Cogent/docs/adr/ADR-005-postgres-hybrid-retrieval.md)
- [**`ADR-006: Serverless Background Jobs via Inngest`**](file:///c:/Users/Alex%20Marco/Documents/Cogent/docs/adr/ADR-006-inngest-async-jobs.md)
