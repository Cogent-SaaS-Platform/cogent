# Cogent — System Context & Technical Architecture Manual

> **Scope**: Hyper-dense reference manual for AI agents, Principal Engineers, and RegTech architects. Reverse-engineered directly from source code, database migrations, and active route handlers.

---

## 1. System Architecture Overview

Cogent is an enterprise B2B supervisory compliance and regulatory intelligence platform built as a modular Next.js application, backed by PostgreSQL 16 (Supabase) with vector similarity search (`pgvector`), Clerk multi-tenant identity, Inngest durable workers, and Google Gemini multi-tier LLM routing.

### 1.1 Architectural Layers

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT RUNTIME                                │
│ Next.js 16 (React 19) App Router Cockpits + Presentation ViewModels        │
│ (/overview, /marketing, /radar, /gap-matrix, /library, /settings)          │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │ HTTP / JSON
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    EDGE GATEWAY PROXY (src/proxy.ts)                       │
│ - Clerk Session & Organization Context Enforcement                         │
│ - Upstash Redis Rate Limiting (standard: 60/min, aiHeavy: 10/min)          │
│ - Fail-open resiliency in non-production / dev bypass                      │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│               TENANT CONTEXT RESOLVER (src/shared/auth)                    │
│ - Extracts clerkOrgId & clerkUserId from JWT claims                        │
│ - Performs JIT sync via TenantSyncService -> (organizations, users, roles) │
│ - Injects bearer JWT into Supabase client -> Enforces PostgreSQL RLS       │
│ - EntitlementEngine resolves subscription tier & active feature quotas     │
└───────────────────┬─────────────────────────┬──────────────────────────────┘
                    │                         │
     ┌──────────────┴──────────┐   ┌──────────┴──────────────┐
     ▼                         ▼   ▼                         ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────────────────┐
│  PILLAR 1:   │ │  PILLAR 2:   │ │  PILLAR 3:   │ │  CONNECTED CASCADE:     │
│  Marketing   │ │  Regulatory  │ │  5-W Policy  │ │  Multi-Hop Event Bus    │
│  Shield      │ │  Radar       │ │  Gap Matrix  │ │  (compliance_cascade_   │
│              │ │              │ │              │ │   events ledger)        │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └───────────┬─────────────┘
       │                │                │                     │
       └────────────────┼────────────────┼─────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         CORE PERSISTENCE & SERVICES                        │
│ - Supabase PostgreSQL 16 (pgvector 768d, pg_trgm, tsvector, RLS)          │
│ - AI Engine: Google Gemini (gemini-3.8-flash, gemini-3.5-pro, embeddings) │
│ - Inngest Worker Queue (circular ingestion, policy chunking, feed sync)   │
│ - Cloudflare R2 / AWS S3 presigned object storage                         │
│ - Paystack Subscription Engine & Idempotent Webhook Replay Ledger          │
│ - Audit Ledger (CAMA 2020 / BOFIA 2020 Section 5.2 compliant SHA-256)     │
└────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Module Directory Blueprint

```
src/
├── app/                      # Next.js App Router entry points & REST routes
│   ├── api/                  # 15 backend API route handlers
│   ├── overview/             # Executive Command Center cockpit
│   ├── marketing/            # Pillar 1 Marketing Shield cockpit
│   ├── radar/                # Pillar 2 Regulatory Radar cockpit
│   ├── insight/              # Route alias pointing to /radar
│   ├── gap-matrix/           # Pillar 3 5-W Policy Gap Matrix cockpit
│   ├── gap/                  # Route alias pointing to /gap-matrix
│   ├── library/              # Statutory Corpus & Obligations hub
│   ├── operations/telemetry/ # Scraper telemetry & golden benchmark runs
│   ├── settings/             # 8-tab tenant settings, RBAC, Paystack billing
│   ├── onboarding/           # 5-step institutional tenant bootstrap wizard
│   ├── audit/                # Redirects to /overview
│   └── proxy.ts              # Edge proxy (Next.js 16 middleware replacement)
├── modules/                  # Domain-Driven Core Modules
│   ├── executive/            # Executive overview aggregator & telemetry
│   ├── marketing-shield/     # Ad scanner, claims ledger, drift watcher, ARCON exporter
│   ├── radar/                # Circular ingestion, lineage graph, role briefs, scrapers
│   ├── gap-matrix/           # Policy chunker, concordance engine, 5-W synthesis, dossiers
│   ├── regulatory/           # Instrument detail viewers, atomic obligations register
│   ├── operations/           # Telemetry collectors, scraper health probes
│   ├── onboarding/           # TenantBootstrapService & wizard step components
│   ├── audit/                # AuditService & ArconDossierService
│   ├── shared/events/        # ComplianceEventBus (cross-pillar cascade)
│   ├── identity/             # [Pending/Empty - handled in src/shared/auth]
│   └── notifications/        # [Pending/Empty - handled in src/shared/notifications]
└── shared/                   # Cross-cutting foundational infrastructure
    ├── ai-engine/            # Google Gemini client, model routing, prompts, schemas
    ├── auth/                 # TenantContext, TenantSyncService, RBAC requireRole
    ├── billing/              # Paystack client, EntitlementEngine, plan limits
    ├── db/                   # Supabase clients (browser, server, admin), types, seeds
    ├── errors/               # Domain errors (UnauthorizedError, ForbiddenError, etc.)
    ├── hooks/                # useUserProfile
    ├── inngest/              # Inngest client configuration
    ├── logger/               # Pino JSON logger + Logtail stream
    ├── network/              # Resilient fetch utilities
    ├── notifications/        # Resend email notification service
    ├── security/             # Upstash Redis rate limiter & fail-open guard
    ├── storage/              # Cloudflare R2 / AWS S3 presigned URL client
    ├── types/                # Canonical domain enums, models, presentation contracts
    └── ui/                   # Design system components (AppShell, NavigationRail, Header)
```

---

## 2. Key User Workflows & Core Capabilities

### 2.1 Workflow 1: Ad Copy Pre-Vetting & ARCON Dossier Export (Pillar 1)
1. **Input Submission**: Marketer/Compliance Officer submits campaign text, channel (`SMS_BLAST`, `SOCIAL_MEDIA_POST`, etc.), and product category (`SAVINGS_DEPOSIT`, `DIGITAL_NANO_LOAN`, etc.) via `CampaignCopyEditor.tsx`.
2. **Stage 1 — Deterministic Matching (<50ms)**: `DeterministicRuleEvaluator` matches exact phrases and regexes against `prohibited_terms` (loaded from DB or fallback seed).
3. **Stage 2 — Institutional Context**: Filters active tenant licenses (`COMMERCIAL_BANK`, `MICROFINANCE_BANK_NATIONAL`, etc.) to suppress irrelevant rules.
4. **Stage 3 — Hybrid Statutory Retrieval**: `HybridRetrievalService` executes parallel semantic vector search (`gemini-embedding-2`) and PostgreSQL full-text search (`tsvector`), merged with Reciprocal Rank Fusion (RRF).
5. **Stage 4 — Gemini Candidate Extraction & Rewrite**: `AiEngine.generateStructured()` routes to `gemini-3.8-flash` to extract contextual violations and generate legally compliant alternative phrasing.
6. **Stage 5 — Penalty Attachment**: Attaches hard statutory fine ranges (`statutory_penalties`) and legal citations.
7. **Stage 6 — Audit Sealing**: Stores scan in `marketing_scans` and findings in `marketing_findings`. Records SHA-256 hashes in `audit_logs`.
8. **Stage 7 — CCO Governance & Dossier**: CCO reviews via `CcoGovernanceBlock.tsx`, approves or edits, and exports a signed ARCON ASP submission dossier via `ArconDossierService`.

### 2.2 Workflow 2: Post-Publish Claims Drift Monitoring (Pillar 1)
1. Approved web copy is registered in `marketing_live_assets` with target URL and SHA-256 hash of approved text.
2. Scheduled worker / API endpoint fetches live HTML, normalizes text, computes live SHA-256 hash, and compares against `original_approved_hash`.
3. If drift is detected, status flips to `DRIFT_DETECTED`, details are logged in `drift_findings`, and email alert is dispatched via Resend.

### 2.3 Workflow 3: Regulatory Circular Ingestion & Impact Synthesis (Pillar 2)
1. Circular PDF is ingested via `/api/radar/circulars/ingest` or uploaded via `CircularUploadDrawer.tsx`.
2. `PdfStructureExtractor` parses PDF text while preserving section boundaries.
3. `DeterministicMetadataExtractor` parses circular reference code, issuance date, effective date, and issuing authority.
4. `LineageService` queries `circular_supersession_links` to identify previous circulars modified or repealed.
5. `RoleSynthesisService` dispatches Gemini reasoning model to produce structured ExCo briefs:
   - **CCO**: Legal risk, mandatory disclosures, balance sheet penalties.
   - **COO**: Process modifications, customer communication adjustments.
   - **CTO**: API modifications, ledger updates, architecture security requirements.
   - **CFO**: Statutory capital reserves, liquidity ratios, fine exposures.
6. Triggers Inngest job or autonomous cascade.

### 2.4 Workflow 4: 5-W Policy Concordance Evaluation (Pillar 3)
1. Internal operational manual or SOP document is uploaded via `PolicyUploadDrawer.tsx`.
2. `PolicyChunkerService` segments document into atomic sections; `PolicyVectorIndexService` computes 768d embeddings.
3. User selects statutory benchmark version (e.g. BOFIA 2020, CBN AML/CFT 2022).
4. `ConcordanceEngine` iterates statutory obligations, retrieving internal policy candidate matches via cosine vector similarity.
5. Classifies obligations into `ADEQUATELY_MET`, `PARTIALLY_MET`, or `CRITICAL_GAP`.
6. `GapSynthesisService` calls Gemini to generate "5-W Decision Cards":
   - **What Happened**: Statutory rule enacted vs internal control status.
   - **What to Know**: Operational requirement and enforcement rationale.
   - **What Has Changed**: Delta between prior regime and current directive.
   - **What to Do**: Immediate corrective actions and owner assignments.
   - **Derived Insight**: Strategic governance observation.
7. Generates pre-cleared draft policy language stored in `draft_language`.
8. Exports signed Audit Defense Pack via `DossierExportService`.

### 2.5 Workflow 5: The Connected Compliance Cascade
1. When a new circular is ratified in Pillar 2, `ComplianceEventBus.publish()` is executed.
2. **Hop 1**: Re-evaluates all tenant policies linked to affected regulatory obligations.
3. **Hop 2**: Checks active marketing campaigns against new circular obligations. Conflicting campaigns are transitioned to `approval_status = 'NEEDS_RE_REVIEW'`.
4. **Hop 3**: Computes delta in institutional fine exposure and updates Executive Command Center.
5. Appends immutable event to `compliance_cascade_events` with parent event hash chaining.

### 2.6 Workflow 6: Paystack SaaS Billing Lifecycle
1. Tenant visits `/settings?tab=plan`.
2. Selects Starter, Pro, or Enterprise (monthly or annual in USD or NGN).
3. Invokes `/api/billing/initialize` -> Paystack API returns checkout URL.
4. User completes payment -> Paystack fires webhook to `/api/webhooks/paystack`.
5. Webhook verifies HMAC SHA-512 signature using `PAYSTACK_SECRET_KEY`.
6. Verifies event idempotency against `billing_events(event_id)`.
7. Updates `tenant_subscriptions` table (`tier`, `status`, `current_period_end`, quotas).

---

## 3. Data Model & Schema Overview

PostgreSQL 16 database managed by Supabase migrations (`supabase/migrations/`).

### 3.1 Extensions Enabled
- `uuid-ossp`: UUID v4 generation.
- `vector`: 768-dimensional vector operations (`vector_cosine_ops`, HNSW indexing).
- `pg_trgm`: Trigram fuzzy text matching for claims and prohibited terms.

### 3.2 Core Database Tables

| Table Name | Description | Key Foreign Keys |
| :--- | :--- | :--- |
| `regulatory_bodies` | Apex regulators (CBN, ARCON, SEC, NDPC, FCCPC, NFIU, NDIC) | Unique `code` |
| `regulatory_instruments` | Enduring legal acts, frameworks, and regulations | `body_id` -> `regulatory_bodies` |
| `regulatory_document_versions`| Gazette versions, effective dates, canonical URLs, verification state | `instrument_id` -> `regulatory_instruments` |
| `regulatory_clauses` | Atomic text chunks with 768d vector embeddings and `tsvector` | `document_version_id` -> `regulatory_document_versions` |
| `regulatory_obligations` | Decomposed statutory duties, verbatim quotes, character spans | `clause_id` -> `regulatory_clauses` |
| `applicability_rules` | Relational targeting for license types and payment rails | `obligation_id` -> `regulatory_obligations` |
| `statutory_penalties` | Quantified fines (min, max, daily), personal criminal liability | `obligation_id` -> `regulatory_obligations` |
| `prohibited_terms` | Deterministic exact/regex patterns, rationale, disclosures | `obligation_id`, `clause_id` |
| `organizations` | Tenant accounts linked to Clerk organization ID | Unique `clerk_organization_id` |
| `users` | User accounts linked to Clerk user ID | Unique `clerk_user_id` |
| `organization_memberships`| Tenant RBAC mappings (roles: OWNER, ADMIN, MEMBER; departments) | `organization_id`, `user_id` |
| `tenant_licenses` | Active regulatory licenses held by tenant | `organization_id` |
| `tenant_payment_rails` | Active payment rails operated by tenant | `organization_id` |
| `ai_analysis_runs` | AI prompt/output hashes, token counts, model latency, approval | `organization_id`, `user_id` |
| `marketing_scans` | Pillar 1 marketing copy evaluations, risk scores, verdicts | `organization_id`, `user_id`, `analysis_run_id` |
| `marketing_findings` | Violations flagged per scan, recommended fixes, citations | `organization_id`, `scan_id`, `prohibited_term_id` |
| `tenant_claims_ledger` | CCO-ratified approved phrases and prohibited counterparts | `organization_id`, `approved_by_user_id` |
| `marketing_live_assets` | Monitored live URLs, approved hashes, drift status | `organization_id`, `scan_id` |
| `radar_circulars` | Pillar 2 circular directives, deadlines, priorities, checksums | `document_version_id` |
| `circular_supersession_links`| Lineage links between circulars (AMENDS, REPLACES, REPEALS) | `parent_circular_id`, `child_circular_id` |
| `radar_tenant_impacts` | 4-way executive impact briefs per tenant | `organization_id`, `circular_id` |
| `radar_action_items` | Departmental action items with assignment & deadlines | `organization_id`, `impact_id` |
| `radar_notifications` | Role-specific cascade and deadline alerts | `organization_id`, `user_id` |
| `policy_documents` | Pillar 3 uploaded internal policy manuals | `organization_id` |
| `policy_clauses` | Internal policy atomic text chunks with 768d embeddings | `organization_id`, `policy_id` |
| `gap_evaluations` | Policy vs statutory benchmark evaluation runs | `organization_id`, `policy_id`, `benchmark_document_version_id` |
| `gap_matrix_items` | 5-W decision cards, compliance status, draft remediation language| `organization_id`, `evaluation_id`, `regulatory_clause_id` |
| `audit_logs` | Immutable audit ledger with SHA-256 input/output seals | `organization_id`, `user_id` |
| `tenant_subscriptions` | Paystack SaaS billing state, tier, trial/grace dates, quotas | Unique `organization_id` |
| `billing_events` | Idempotent Paystack webhook event replay defense ledger | Unique `event_id` |
| `source_runs` | Regulatory scraper/poller health, latency, HTTP status | Unique run records |
| `compliance_cascade_events`| Cryptographically chained multi-hop cascade ledger | `organization_id`, `circular_id`, `sha256_hash` |
| `supervisory_benchmark_runs`| Model accuracy evaluation ledger (precision, recall, fidelity) | Unique suite run records |

### 3.3 Multi-Tenant Row-Level Security (RLS) Model
- All tenant tables enable `ROW LEVEL SECURITY`.
- Active policy on tenant tables:
  ```sql
  CREATE POLICY tenant_isolation_policy ON <table>
    FOR ALL TO authenticated
    USING (organization_id = current_org_id())
    WITH CHECK (organization_id = current_org_id());
  ```
- `current_org_id()` reads the Clerk JWT claim `org_id` or session header set by `createServerClient()`.
- Unauthenticated requests or mismatched tenant context are rejected at the database level.
- `createAdminClient()` (service-role key) bypasses RLS and is strictly quarantined to Inngest workers and CLI scripts.

---

## 4. State Management & API / Routing Structure

### 4.1 Client State Management
- **Local React State (`useState`, `useReducer`, `useEffect`)**: Used within cockpits for form inputs, drawers, active tab navigation, and filters.
- **Server State / Data Fetching**: Direct REST API calls (`fetch()`) inside client cockpits, managed via `useEffect` with optimistic local updates.
- **URL Query Parameters**: Cockpits bind active tabs, open drawers, and filter selections directly to URL search params (`?tab=`, `?circular=`, `?pillar=`, `?id=`) for deep linking.
- **Clerk React Hooks**: `useAuth()`, `useUser()`, `useOrganization()` provide client-side user and organization state.

### 4.2 Complete API Route Registry

| Endpoint | Methods | Auth Required | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/health` | GET | No (Public) | Synthetic uptime monitoring probe |
| `/api/inngest` | GET, POST, PUT | Inngest Sig | Durable job execution handler |
| `/api/webhooks/paystack` | POST | HMAC SHA-512 | Paystack subscription lifecycle webhooks |
| `/api/library` | GET | Yes / Public | Statutory regulatory library search |
| `/api/library/clauses` | GET | Yes / Public | Atomic clause details & obligations |
| `/api/library/obligations` | GET | Yes / Public | Regulatory obligations register |
| `/api/marketing/scan` | POST | Yes (Tenant) | Executes 6-stage ad copy pre-vetting scan |
| `/api/marketing/claims-ledger`| GET, POST | Yes (Tenant) | Approved phrasings claims ledger CRUD |
| `/api/marketing/drift` | GET, POST | Yes (Tenant) | Live URL asset drift registration & check |
| `/api/marketing/dossier` | POST | Yes (Tenant) | Generates ARCON ASP submission dossier |
| `/api/marketing/signoff` | POST | Yes (Tenant) | CCO formal approval or rejection |
| `/api/marketing/cascade` | POST | Yes (Tenant) | Cascade invalidation check listener |
| `/api/radar/circulars` | GET, POST | Yes (Tenant) | Regulatory circulars list & ingestion |
| `/api/radar/circulars/[id]` | GET | Yes (Tenant) | Circular details, ExCo briefs, lineage |
| `/api/radar/brief` | GET, POST | Yes (Tenant) | Executive brief retrieval & generation |
| `/api/radar/lineage` | GET | Yes (Tenant) | Circular supersession graph |
| `/api/radar/sources` | GET, POST | Yes (Tenant) | Regulatory feed sources register |
| `/api/radar/sync` | POST | Yes (Tenant) | Manual regulatory feed sync trigger |
| `/api/radar/cascade` | POST | Yes (Tenant) | Triggers multi-hop compliance cascade |
| `/api/gap-matrix/policies` | GET, POST | Yes (Tenant) | Internal policy manuals list & ingestion |
| `/api/gap-matrix/benchmarks`| GET | Yes (Tenant) | Statutory benchmark versions list |
| `/api/gap-matrix/evaluate` | POST | Yes (Tenant) | Triggers policy concordance evaluation |
| `/api/gap-matrix/evaluations`| GET | Yes (Tenant) | History of concordance evaluations |
| `/api/gap-matrix/evaluations/[id]`| GET | Yes (Tenant) | Evaluation detail with 5-W gap items |
| `/api/gap-matrix/items/[id]`| PATCH | Yes (Tenant) | Updates gap status / draft remediation |
| `/api/gap-matrix/dossier` | POST | Yes (Tenant) | Exports Audit Defense Pack |
| `/api/executive/overview` | GET | Yes (Tenant) | Multi-pillar executive overview data |
| `/api/executive/export` | POST | Yes (Tenant) | Exports executive compliance summary |
| `/api/operations/telemetry` | GET | Yes (Tenant) | Scraper health, inference & benchmark stats|
| `/api/billing/subscription`| GET | Yes (Tenant) | Active subscription & entitlement summary |
| `/api/billing/initialize` | POST | Yes (Tenant) | Initializes Paystack checkout transaction |
| `/api/billing/history` | GET | Yes (Tenant) | Billing receipts and event logs |
| `/api/notifications` | GET | Yes (Tenant) | Unread cascade & deadline notifications |
| `/api/notifications/read` | POST | Yes (Tenant) | Marks notification as read |
| `/api/onboarding` | GET, POST | Yes (Tenant) | Tenant profile & onboarding progress |
| `/api/onboarding/bootstrap` | POST | Yes (Tenant) | Seeds default tenant licenses & rails |
| `/api/user/profile` | GET, PATCH | Yes (Tenant) | User preferences, job title, role badge |
| `/api/audit` | GET | Yes (Tenant) | Query audit logs |
| `/api/audit/verify` | POST | Yes (Tenant) | Cryptographically verifies SHA-256 seal |

---

## 5. Security & Isolation Invariants

1. **Deterministic Precedence**: Deterministic pattern matching always executes *before* LLM generation. An LLM cannot override a statutory prohibition detected by regex or exact pattern.
2. **Epistemic Modesty**: AI scans never issue a blanket "100% Compliant" guarantee. Verdicts are evidence-bounded: `NO_ISSUE_DETECTED`, `REVIEW_RECOMMENDED`, `ISSUE_DETECTED`, `BLOCKING_ISSUE`.
3. **No Decorative UI**: Metric cards must never contain decorative icons or traffic light colored numbers. Numbers must remain monochrome (`text-slate-900 font-mono text-2xl font-bold tracking-tight`). Statuses use 6px solid dots.
4. **AI is Infrastructure**: Public copy must never state "AI-powered" or mention LLM model names. Customer-facing terminology is strictly statutory: "Deterministic Rule Evaluation", "Statutory Concordance Analysis", "Pre-Cleared Remediations".
5. **Multi-Tenancy Kernel Barrier**: No database query in client-facing routes may omit `organization_id = current_org_id()`. Service-role keys are quarantined to Inngest and background scripts.
