# Cogent — Enterprise RegTech & Supervisory Compliance Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.3.8-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%2016-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![pgvector](https://img.shields.io/badge/pgvector-768d%20HNSW-green?style=flat-square)](https://github.com/pgvector/pgvector)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-3.8%20Flash%20%7C%203.5%20Pro-4285F4?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)
[![Clerk](https://img.shields.io/badge/Clerk-Multi--Tenant%20Auth-6C47FF?style=flat-square&logo=clerk)](https://clerk.com/)
[![Inngest](https://img.shields.io/badge/Inngest-Durable%20Execution-orange?style=flat-square)](https://www.inngest.com/)
[![Paystack](https://img.shields.io/badge/Paystack-Billing%20Engine-0BA4DB?style=flat-square)](https://paystack.com/)

**Cogent** is an enterprise B2B RegTech and supervisory intelligence platform engineered for General Counsels (GCs), Chief Compliance Officers (CCOs), Chief Financial Officers (CFOs), and Bank Examiners operating within African financial markets.

The platform continuously bridges statutory mandates from apex regulators—including the **Central Bank of Nigeria (CBN)**, **Advertising Regulatory Council of Nigeria (ARCON)**, **Nigeria Data Protection Commission (NDPC)**, **Securities and Exchange Commission (SEC)**, **Federal Competition and Consumer Protection Commission (FCCPC)**, **Nigerian Financial Intelligence Unit (NFIU)**, and **Nigeria Deposit Insurance Corporation (NDIC)**—directly into corporate policies, customer marketing, and banking operations.

---

## High-Level Value Proposition

Commercial banks, digital lenders, payment service banks (PSBs), mobile money operators (MMOs), and wealthtech platforms face volatile, frequently issued regulatory circulars with catastrophic balance-sheet consequences (licensing revocation, daily statutory fines, and personal officer criminal liability under BOFIA 2020 and ARCON Act 2022).

Cogent provides an end-to-end, multi-pillar supervisory defense engine:
1. **Pillar 1 — Marketing Shield**: Pre-vets customer-facing marketing copy, SMS blasts, push notifications, and billboards against statutory rules in under 50ms, detects claims drift on published URLs, and exports pre-cleared ARCON Advertising Standards Panel (ASP) submission dossiers.
2. **Pillar 2 — Regulatory Horizon Radar**: Ingests midnight regulatory circulars, parses character-span obligations, tracks circular lineage and supersession trees, calculates statutory compliance deadlines, and synthesizes 4-way executive impact briefs tailored for the CCO, COO, CTO, and CFO.
3. **Pillar 3 — 5-W Policy Concordance Gap Matrix**: Automates clause-by-clause concordance auditing of tenant internal operational policies against official statutory gazettes, attaches quantified legal penalty liabilities, produces 5-W operational decision cards, and outputs pre-cleared draft remediation language.
4. **The Connected Compliance Cascade**: Autonomously propagates new regulatory circulars across all pillars—re-auditing internal policies, invalidating live marketing claims, and updating institutional risk posture in a cryptographically chained audit ledger.

---

## Core Feature Highlights

### 1. Executive Command Center (`/overview`)
- **Real-Time Financial Exposure Metric**: Quantifies prevented statutory liabilities in Nigerian Naira (₦ NGN) backed by exact legal citations (e.g., BOFIA 2020 Section 65, ARCON Act 2022 Section 54).
- **Composite Health Grading**: Multi-pillar index tracking organizational compliance across Marketing, Regulatory Radar, and Policy Governance.
- **Cross-Pillar Activity Ledger**: Real-time event feed tracing circular ratifications, claims drift invalidations, and concordance updates.
- **Regulatory Pressure Strip**: Heatmap of active regulatory oversight intensity across apex regulators.

### 2. Pillar 1: Marketing Shield (`/marketing`)
- **Deterministic Rule Evaluator (<50ms)**: Sub-50ms regex and pattern evaluation of prohibited promotional claims (`zero interest`, `guaranteed return`, `free loan`, `instant approval`) tied directly to statutory citations.
- **Hybrid Statutory Retrieval**: Combines semantic embeddings (`gemini-embedding-2` in 768-dimensional `vector` space) with PostgreSQL full-text search (`tsvector` + GIN) via Reciprocal Rank Fusion (RRF).
- **Context-Aware AI Rewrites**: Generates legally defensible, commercially viable alternative copy while preserving institutional marketing intent.
- **Approved Phrasings Claims Ledger**: Enterprise repository of CCO-ratified claims and prohibited counter-statements categorized by financial product taxonomy.
- **Live Asset Drift Watcher**: Continuously monitors published website landing pages and web assets for copy drift against approved compliance baselines.
- **ARCON ASP Pre-Clearance Dossier**: One-click generation of statutory pre-vetting application packets with SHA-256 cryptographic verification seals.

### 3. Pillar 2: Regulatory Radar (`/radar` or `/insight`)
- **Automated Circular Ingestion**: Preserves visual document hierarchy and extracts structured metadata from apex regulator circulars (PDFs and gazettes).
- **Circular Lineage & Supersession Graph**: Tracks amendment relationships (`AMENDS`, `REPLACES`, `REVOKES_AND_REPLACES`, `REPEALS`, `PARTIALLY_REPEALS`, `CITES`) to ensure teams never comply with superseded law.
- **Statutory Countdown Clock**: Tracks exact days remaining until binding regulatory enforcement deadlines.
- **4-Way Role-Specific Synthesis**: Uses Gemini reasoning models to generate distinct operational directives for CCO (legal exposure), COO (operational readiness), CTO (technical architecture), and CFO (capital reserves).

### 4. Pillar 3: 5-W Policy Gap Matrix (`/gap-matrix` or `/gap`)
- **Automated Policy Chunking & Ingestion**: Decomposes uploaded operational manuals (PDF/DOCX) into atomic clauses and stores them in vector space.
- **3-Tier Concordance Classification**:
  - `ADEQUATELY_MET`: Satisfies all statutory mandates, windows, and reporting thresholds.
  - `PARTIALLY_MET`: Aligns in general intent but diverges on timelines, thresholds, or board approvals.
  - `CRITICAL_GAP`: Complete omission of mandatory statutory controls.
- **5-W Decision Framework**: Synthesizes *What Happened*, *What to Know*, *What Has Changed*, *What to Do*, and *Derived Insight* for each identified gap.
- **Pre-Cleared Remediation Drafting**: Generates copy-paste-ready policy clauses engineered to close critical statutory deficiencies immediately.
- **Audit Defense Pack Export**: Comprehensive audit binder formatted for external banking examiners and external legal audits.

### 5. Connected Compliance Cascade
- **Autonomous Multi-Hop Event Bus**: Event-driven loop triggered upon circular ratification in Pillar 2:
  - **Hop 1 (Radar → Gap Matrix)**: Initiates automated re-evaluation of affected internal policies.
  - **Hop 2 (Radar → Marketing Shield)**: Identifies conflicting marketing campaigns and marks them as `NEEDS_RE_REVIEW`.
  - **Hop 3 (Gap Matrix / Marketing → Executive)**: Recalculates institutional balance-sheet exposure and notifies department heads.
- **Cryptographic Chain of Custody**: Every cascade hop is sealed in the immutable `compliance_cascade_events` ledger using SHA-256 block hashing (`previous_event_hash`).

### 6. Regulatory Library (`/library`)
- **Statutory Register**: Searchable database of primary acts, gazetted frameworks, and circulars across 7 regulatory domains:
  - FinTech, Payments & Banking Rails
  - Anti-Money Laundering & CFT
  - Digital Lending & Consumer Credit
  - Data Privacy & AI Governance (NDPA 2023)
  - Capital Markets & WealthTech
  - Virtual Assets & Web3 Regulations
  - Consumer Protection & Truth-in-Advertising
- **Atomic Obligations Register**: Verbatim statutory excerpts with character-span provenance, fine schedules, and compliance criteria.

### 7. Supervisory Telemetry (`/operations/telemetry`)
- Health and latency monitoring of official regulatory scrapers and RSS pollers.
- Model failover and inference latency metrics.
- Golden benchmark verification tracking precision, recall, and character-span fidelity against ratifying legal ground truth.

---

## Tech Stack Overview

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16.3.8** (App Router, Webpack) | Server-rendered cockpits, streaming suspense, layouts |
| **UI Engine** | **React 19.2.8**, **Tailwind CSS v4** | RegTech design system, zero decorative clutter, high-density layouts |
| **Icons & Design** | **Lucide React**, **Tailwind Merge**, **clsx** | Enterprise typography, 6px status indicators, dual-state icons |
| **Edge Security & Routing**| **Next.js 16 Edge Proxy** (`src/proxy.ts`) | Route matching, session verification, rate-limit enforcement |
| **Authentication & RBAC** | **Clerk** (`@clerk/nextjs` 7.9.10) | Multi-tenant organization isolation, JIT profile synchronization |
| **Database & Vector Moat** | **Supabase** (PostgreSQL 16) | `pgvector` (768d HNSW Cosine), `pg_trgm`, `tsvector`, strict RLS |
| **AI Orchestration** | **Google Gemini** (`@google/genai`, `@ai-sdk/google`) | Fast triage (`gemini-3.8-flash`), Deep Reasoning (`gemini-3.5-pro`) |
| **Vector Embeddings** | **Google Gemini** (`gemini-embedding-2`) | 768-dimensional statutory and internal policy vector index |
| **Durable Jobs & Workers**| **Inngest 3.31.0** | Asynchronous circular ingestion, policy chunking, scheduled feeds |
| **Object Storage** | **Cloudflare R2 / AWS S3** (`@aws-sdk/client-s3`) | Presigned URL storage for circular PDFs and policy documents |
| **Payments & Billing** | **Paystack API** | Recurring SaaS subscriptions (Starter, Pro, Enterprise) |
| **Transactional Email** | **Resend** (`resend`) | Cascade breach alerts and regulatory notifications |
| **Observability** | **Sentry** (`@sentry/nextjs`), **Pino**, **Logtail** | Real-time performance profiling and structured audit logging |
| **Testing** | **Vitest 5.0.3**, **Playwright 1.63.0** | Unit, security RLS verification, golden evaluations, and E2E |

---

## Architecture at a Glance

```
                                  [ Client Browser / Cockpit UI ]
                                                 │
                                                 ▼
                             [ Next.js 16 Edge Gateway Proxy ]
                             (src/proxy.ts — Clerk Auth & Upstash Rate Limiting)
                                                 │
                 ┌───────────────────────────────┴───────────────────────────────┐
                 ▼                                                               ▼
        [ App Cockpit Pages ]                                           [ REST API Routes ]
   (/overview, /marketing, /radar,                                    (/api/marketing, /api/radar,
    /gap-matrix, /library, /settings)                                 /api/gap-matrix, /api/billing)
                 │                                                               │
                 └───────────────────────────────┬───────────────────────────────┘
                                                 ▼
                                     [ Tenant Context Resolver ]
                                    (src/shared/auth/tenantContext.ts)
                                                 │
                 ┌───────────────────────────────┼───────────────────────────────┐
                 ▼                               ▼                               ▼
       [ Supabase Client ]             [ Google Gemini Engine ]          [ Inngest Worker Engine ]
     (PostgreSQL 16 + RLS)             - gemini-3.8-flash (Fast)         - circularIngestionJob
     - pgvector (768d HNSW)            - gemini-3.5-pro (Reasoning)      - policyIngestionJob
     - tsvector / pg_trgm              - gemini-embedding-2              - scheduledRegulatoryFeedSync
     - Multi-tenant isolation                    │                               │
                 │                               └───────────────┬───────────────┘
                 ▼                                               ▼
     [ Immutable Ledgers ]                           [ External Integrations ]
     - audit_logs                                    - Paystack (Billing)
     - compliance_cascade_events                     - Cloudflare R2 / AWS S3 (PDFs)
     - supervisory_benchmark_runs                    - Resend (Email Alerts)
```

---

## Quick Start & Installation

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **Package Manager**: `npm`
- **Supabase Account**: With PostgreSQL 16, `pgvector`, and `pg_trgm` extensions enabled
- **Clerk Account**: For multi-tenant user authentication
- **Google AI Studio Key**: With Gemini 3.8 Flash, 3.5 Pro, and Gemini Embedding access

### 1. Clone the Repository
```bash
git clone https://github.com/Alexmarco-gif/cogent.git
cd cogent
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy the provided environment template:
```bash
cp .env.example .env.local
```

Populate the required environment variables:
```env
# Core App URL & Environment
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
LOG_LEVEL="debug"

# Clerk Authentication (Multi-Tenant Org Claims)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Supabase (PostgreSQL 16 + pgvector)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..." # Quarantined to migrations/seed/workers

# Google Gemini AI Engine
GEMINI_API_KEY="AIzaSy..."
AI_FAST_MODEL="gemini-3.8-flash"
AI_REASONING_MODEL="gemini-3.5-pro"
AI_EMBEDDING_MODEL="gemini-embedding-2"

# Background Execution & Notifications
INNGEST_EVENT_KEY="test"
INNGEST_SIGNING_KEY="test"
RESEND_API_KEY="re_..."

# Cloudflare R2 / AWS S3 Storage (Optional for local dev)
S3_BUCKET_NAME="cogent-regulatory-documents"
S3_ENDPOINT="https://..."
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."

# Paystack Subscriptions (Optional for local dev)
PAYSTACK_SECRET_KEY="sk_test_..."
PAYSTACK_PUBLIC_KEY="pk_test_..."
```

### 4. Database Setup & Migrations
Apply the migrations in sequential order using Supabase CLI or SQL editor:
```bash
npx supabase db push
```

### 5. Seed the Verified Statutory Corpus
Populate the regulatory bodies, primary legislation, circulars, and atomic obligations:
```bash
# Seed verified regulatory instruments, clauses, and penalties
npm run seed

# Generate 768-dimensional vector embeddings for the statutory corpus
npm run embed
```

### 6. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available NPM Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `next dev --webpack` | Launches development server on port 3000 |
| `npm run build` | `next build --webpack` | Compiles production bundle |
| `npm run start` | `next start` | Runs compiled production server |
| `npm run lint` | `eslint` | Runs ESLint 9 checks |
| `npm run typecheck`| `tsc --noEmit` | Validates TypeScript types across the codebase |
| `npm test` | `vitest run --no-isolate` | Executes comprehensive unit test suite (44+ test suites) |
| `npm run test:security` | `vitest run tests/security` | Executes strict Supabase RLS and multi-tenant isolation tests |
| `npm run test:e2e` | `playwright test` | Runs Playwright browser end-to-end test suite |
| `npm run seed` | `tsx scripts/seedCorpus.ts` | Seeds Nigerian regulatory bodies, acts, and circulars |
| `npm run embed` | `tsx scripts/embedCorpus.ts`| Computes Gemini vector embeddings for all statutory clauses |

---

## Security & Compliance Architecture

- **Strict Multi-Tenancy**: All database tables enforce Row-Level Security (RLS) via `organization_id = current_org_id()`. Direct tenant data leakage across tenants is impossible at the database kernel level.
- **Service Role Isolation**: `SUPABASE_SERVICE_ROLE_KEY` is strictly quarantined to server-side Inngest workers and CLI maintenance scripts. It is never imported into public route handlers or client bundles.
- **Cryptographic Audit Defense**: CAMA 2020 and BOFIA 2020 Section 5.2 compliant audit ledger (`audit_logs`) records SHA-256 hashes of every input prompt, statutory finding, and exported remediation dossier.
- **Fail-Open Rate Limiting**: Edge Proxy incorporates Upstash Redis rate-limiting on sensitive API endpoints with automatic fail-open guards to ensure high-availability compliance operations.

---

## License
Proprietary & Confidential. Copyright © Cogent Technologies. All rights reserved.
