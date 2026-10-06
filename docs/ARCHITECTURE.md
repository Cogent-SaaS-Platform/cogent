# COGENT — System Architecture Constitution (ARCHITECTURE.md)

> **Version:** 1.2.0 (Enterprise Connected Intelligence Constitution)  
> **Status:** RATIFIED & LOCKED  
> **Architecture Pattern:** Modular Monolith (TypeScript / Next.js Full-Stack / Supabase / Gemini)  
> **Key Architecture Additions in v1.2:**
> - **4-Layer Context Engineering Architecture:** BM25 keyword matching + pgvector semantic search + cross-encoder reranking + metadata versioning.
> - **The Connected Compliance Chain:** Upstream Horizon Ingestion (Pillar 2) automatically cascades downstream into Policy Gap Concordance (Pillar 3) and Marketing Drift Re-screening (Pillar 1).
> - **Institutional Claims Ledger:** Tenant-isolated approved phrasings memory that travels across campaigns and copywriters.
> - **Multi-Role ExCo Action Synthesis:** One circular parsed into 4 distinct executive briefs (COO, CCO, VP Product/Engineering, CFO).
> - **Bank Examiner Audit Defense Pack:** Cryptographic (SHA-256) evidence binders for CBN, NDIC, and ARCON on-site examinations.

---

## 1. Architectural Style & Core Principles

Cogent is designed as a **Modular Monolith**.

### Core Design Rules
1. **Single Deployable Unit:** One unified Next.js codebase combining the user-facing web application, authenticated API route handlers, and background event triggers.
2. **Strict Module Encapsulation:** Business logic is segmented into isolated domain modules (`src/modules/*`). Direct cross-module database writes or queries bypassing module services are strictly prohibited.
3. **Deterministic First, AI Second:** Every compliance check prioritizes deterministic rule matching (regex, boolean flags, license lookups, statutory penalty calculations). AI is invoked only for semantic candidate extraction, legal reasoning, and creative rewriting.
4. **Context Engineering Over Prompt Engineering:** To avoid "Lost in the Middle" errors and attention scarcity on 200-page regulatory circulars, Cogent employs a strict 4-layer context curation pipeline before LLM inference.
5. **Zero-Trust Multi-Tenancy:** Multi-tenancy is enforced at the database kernel level using PostgreSQL Row-Level Security (RLS) driven by Clerk JWT organization claims. Application bugs cannot cause cross-tenant data contamination.

---

## 2. High-Level System Architecture Diagram

```
                                      CLIENT TIER
         ┌───────────────────────────────────────────────────────────────────┐
         │ Next.js 15+ App Router (React Server Components + Client Islands) │
         │   • Marketing Pre-Vetting UI   • Regulatory Radar & ExCo Briefs   │
         │   • 5-W Gap Matrix Viewer      • Examiner Audit Defense Dossiers  │
         │   • Live Drift Watcher         • Institutional Claims Ledger      │
         └──────────────────┬─────────────────────────────┬──────────────────┘
                            │ HTTPS / RSC                 │ WebSockets
                            ▼                             ▼
┌─────────────────────────────────────────────────────────┼──────────────────┐
│ NEXT.JS BACKEND (Vercel Edge / Serverless)              │ Supabase Realtime│
│                                                         │ (In-App Alerts)  │
│  API Routes & Server Actions:                           └──────────────────┘
│  • /api/marketing/scan      • /api/radar/feed                              │
│  • /api/marketing/drift     • /api/claims-ledger                           │
│  • /api/gap-matrix/evaluate • /api/inngest (Async Job Coordinator)          │
│                                                                            │
│  Domain Modules (src/modules/*):                                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐ │
│  │   Identity   │ │  Regulatory  │ │  Marketing   │ │ Regulatory Radar  │ │
│  │ & Relational │ │    Corpus    │ │    Shield    │ │ & Impact Tracer   │ │
│  │   Tenancy    │ │  Provenance  │ │ (Decoupled)  │ │ (Applicability)   │ │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └─────────┬─────────┘ │
│         │                │                │                   │           │
│         │                │         ┌──────┴───────────────────┴─────────┐ │
│         │                │         │ 5-W Decision Gap Matrix (Pillar 3) │ │
│         │                │         └────────────────────────────────────┘ │
│         └────────────────┼────────────────┼───────────────────┘           │
│                          ▼                ▼                               │
│  Shared Infrastructure (src/shared/*):                                    │
│  • AiEngine (Configurable Models + Zod Validation + ZDR)                  │
│  • DbClient (Supabase PostgreSQL + Clerk JWT RLS Helper)                  │
│  • ContextEngineeringService (BM25 + pgvector + Rerank)                   │
│  • AuditLogger (Immutable SHA-256 Ledger + ai_analysis_runs)              │
└──────────────────────────┬───────────────────────────────┬────────────────┘
                           │                               │
                           ▼                               ▼
       ┌───────────────────────────────┐       ┌───────────────────────┐
       │     SUPABASE (Frankfurt)      │       │     AI PROVIDER       │
       │ • PostgreSQL 16 with RLS      │       │ • Configurable Gemini │
       │ • pgvector (768d Embeddings)  │       │   (Flash & Pro)       │
       │ • gemini-embedding-2 (768d)   │       │ • Zero Data Retention │
       │ • tsvector English Full-Text  │       │ • Regional Pinned     │
       │ • Storage (Private Buckets)   │       └───────────────────────┘
       └──────────────┬────────────────┘
                      │
                      ▼
       ┌───────────────────────────────┐
       │      ASYNC WORKERS            │
       │ • Inngest Step Functions      │
       │ • Circular Ingestion & OCR    │
       │ • Downstream Cascade Queue    │
       └───────────────────────────────┘
```

---

## 3. The 4-Layer Context Engineering Architecture

To guarantee accuracy on complex, 200-page Nigerian regulatory circulars (e.g., BOFIA 2020, CBN AML Regulations 2022, NDPA 2023), Cogent enforces a 4-layer retrieval pipeline:

```
[ Incoming Query / Policy Clause / Marketing Copy ]
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: KEYWORD SEARCH (PostgreSQL tsvector / BM25)        │
│ • Exact statutory matches: "Regulation 14(2)",              │
│   "CBN/BPS/CIR/GEN/02/010", "Tier 3 KYC"                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: HYBRID SEMANTIC SEARCH (pgvector 768d Embeddings)  │
│ • Conceptual matches: "third-party settlement delay",       │
│   "unauthorized loan recovery tactics"                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: CROSS-ENCODER RERANKING                            │
│ • Elevates specific sub-clauses, narrow exceptions, and     │
│   overriding statutory caveats to the top of context        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 4: METADATA & VERSION CONTROL FILTERING               │
│ • Excludes superseded circulars                             │
│ • Matches tenant license profile (`tenant_licenses`)        │
│ • Injects tenant's institutional `tenant_claims_ledger`     │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. The Connected Compliance Cascade

The platform operates as a synchronized regulatory feedback loop:

```
[ New Circular Dropped ]
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│ PILLAR 2: REGULATORY RADAR                              │
│ • Evaluates license & rail applicability                │
│ • Generates 4-Way ExCo Briefs (COO, CCO, Eng, CFO)      │
│ • Establishes statutory countdown deadline              │
└──────────┬──────────────────────────────────────────────┘
           │
           ├──────────────────────────────┐
           ▼ (Cascade Trigger 1)          ▼ (Cascade Trigger 2)
┌─────────────────────────────────┐ ┌─────────────────────────────────┐
│ PILLAR 3: 5-W GAP MATRIX        │ │ PILLAR 1: MARKETING SHIELD      │
│ • Identifies affected internal  │ │ • Re-evaluates active approved  │
│   policies (AML, Consumer Prot) │ │   campaigns & live landing pages│
│ • Flags clauses for updated     │ │ • Flags compliance drift        │
│   concordance check             │ │   against new disclosure rules  │
└─────────────────────────────────┘ └─────────────────────────────────┘
```

---

## 5. Three-Layer Presentation Architecture & Response Contract

Cogent guarantees institutional presentation consistency across all regulatory pillars through a strict Three-Layer Architecture:

```
Gemini Output ──► Validation & Business Logic ──► ResponseViewModel ──► Cogent UI Components
```

1. **Separation of Rendering Ownership:** Free-form Markdown generation by LLMs is strictly disallowed. The AI engine returns strictly typed candidate extractions. Cogent's UI components own 100% of formatting, typography, color semantics, and layout.
2. **Standardized Progressive Disclosure:** All platform workflows follow a unified 6-level disclosure flow:
   - **Level 1:** Title, Verdict Chip & Penalty Exposure Banner
   - **Level 2:** Executive Summary (1–3 concise paragraphs for fast CCO scanning)
   - **Level 3:** Key Findings & "Why It Matters" Cards (modular, avoiding walls of text)
   - **Level 4:** Statutory Citations & Official Gazette Verification Blocks
   - **Level 5:** Actions & Next Steps (Structured checklists with departmental priority & owner)
   - **Level 6:** Human Review State (Strict bifurcation: `AI_ANALYZED` vs. `APPROVED_BY_CCO`)
3. **Decoupled `ResponseViewModel`:** Application services enrich raw AI output with database-verified statutory penalties, mandatory disclosures, and tenant applicability before instantiating the strongly-typed `ResponseViewModel`.
