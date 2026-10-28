# Cogent — Operational Features & Implementation Reference Manual

> **Scope**: Detailed module-by-module operational manual. Reverse-engineered directly from source files, database schemas, and active route implementations. Replaces the legacy documentation.

---

## 1. Active Feature Modules Breakdown

### 1.1 Executive Command Center
- **Source Paths**:
  - Cockpit UI: `src/app/overview/page.tsx`, `src/modules/executive/ui/ExecutiveDashboard.tsx`, `ExecutiveCommandCenter.tsx`
  - Widgets: `RegulatoryPressureStrip.tsx`, `UpcomingDeadlinesTimeline.tsx`
  - Services: `src/modules/executive/services/executiveOverviewService.ts`, `executiveTelemetryService.ts`
  - API Routes: `GET /api/executive/overview`, `POST /api/executive/export`
- **Capabilities Built**:
  - **Aggregated Fine Liability Avoidance**: Computes total avoided balance-sheet fines (in ₦ NGN) by summing penalties prevented across Marketing Shield pre-vetted scans, resolved Radar circular mandates, and closed Policy Gap items.
  - **Composite Institutional Health Grade**: Calculates a single normalized compliance score (0–100%) and letter grade (A+, A, B, C, CRITICAL) derived from active drift alerts, critical policy gaps, and upcoming unenforced deadlines.
  - **Regulatory Pressure Strip**: Live indicator monitoring regulatory enforcement activity across apex bodies (CBN, ARCON, NDPC, SEC, FCCPC, NFIU, NDIC).
  - **Cross-Pillar Activity Ledger**: Chronological audit trail displaying recent circular ratifications, marketing drift alerts, and policy concordance evaluations.
  - **Upcoming Deadlines Countdown**: Tracks circular statutory enforcement dates with color-coded urgency countdowns.
  - **Executive Compliance Export**: Generates an audit-ready executive compliance summary in Markdown/PDF formats.

---

### 1.2 Pillar 1: Marketing Shield
- **Source Paths**:
  - Cockpit UI: `src/app/marketing/page.tsx`, `src/modules/marketing-shield/ui/MarketingShieldDashboard.tsx`
  - Sub-views & Tabs:
    - `CampaignCopyEditor.tsx` (real-time editor with character counts & pre-vet triggers)
    - `VerdictBanner.tsx` (evidence-bounded verdict display: NO_ISSUE_DETECTED, REVIEW_RECOMMENDED, ISSUE_DETECTED, BLOCKING_ISSUE)
    - `FindingCard.tsx` & `FindingsList.tsx` (granular violation cards with fine calculation and citations)
    - `SplitViewComparison.tsx` (diff comparison between original copy and compliant rewrite)
    - `ActionChecklist.tsx` (actionable remediation items for Marketing, Compliance, and Legal)
    - `CcoGovernanceBlock.tsx` (formal sign-off: Approve, Reject, Needs Revision, with digital signature)
    - `ClaimsLedgerTab.tsx` (Approved Phrasings Ledger interface)
    - `DriftWatcherTab.tsx` (Live URL monitoring interface)
    - `CampaignsOverviewView.tsx` (Historical campaign scans table)
    - `NewCampaignDrawer.tsx` (Modal campaign intake drawer)
  - Core Services:
    - `src/modules/marketing-shield/marketingShieldService.ts` (orchestrator)
    - `src/modules/marketing-shield/deterministicMatcher.ts` (sub-50ms regex engine)
    - `src/modules/marketing-shield/hybridRetrieval.ts` (RRF hybrid search)
    - `src/modules/marketing-shield/claimsLedgerService.ts` (approved phrasings engine)
    - `src/modules/marketing-shield/driftWatcherService.ts` (live URL hash comparison)
    - `src/modules/marketing-shield/auditDefenseExporter.ts` (ARCON ASP PDF bundle)
    - `src/modules/marketing-shield/services/marketingCascadeListener.ts` (cascade invalidation)
  - API Routes:
    - `POST /api/marketing/scan`
    - `GET, POST /api/marketing/claims-ledger`
    - `GET, POST /api/marketing/drift`
    - `POST /api/marketing/dossier`
    - `POST /api/marketing/signoff`
    - `POST /api/marketing/cascade`
- **Capabilities Built**:
  - **6-Stage Ad Pre-Vetting Pipeline**:
    1. *Deterministic Matching*: Checks exact string and regex patterns from `prohibited_terms` table (`zero interest`, `guaranteed return`, `100% risk-free`, `free loan`, `instant approval`, etc.).
    2. *Tenant License Alignment*: Loads active tenant licenses (`COMMERCIAL_BANK`, `MICROFINANCE_BANK_NATIONAL`, `PAYMENT_SOLUTION_SERVICES_PSSP`, etc.) to filter out irrelevant rules.
    3. *Hybrid Retrieval*: Combines semantic vector similarity (`gemini-embedding-2`) and keyword full-text search (`tsvector` + GIN) via Reciprocal Rank Fusion (RRF).
    4. *Gemini Candidate Extraction & Compliant Rewrite*: Prompts `gemini-3.8-flash` using structured JSON schema (`MarketingAnalysisOutputSchema`) to identify subtle statutory nuances and generate compliant alternative copy.
    5. *Deterministic Penalty Attachment*: Calculates statutory minimum/maximum fines from `statutory_penalties`.
    6. *Cryptographic Audit Sealing*: Saves scan record to `marketing_scans`, findings to `marketing_findings`, and writes SHA-256 hashes to `audit_logs`.
  - **Approved Phrasings Claims Ledger**:
    - Central repository of CCO-approved marketing statements and prohibited counterparts.
    - Categorized by ratified financial product taxonomy (`SAVINGS_DEPOSIT`, `DIGITAL_NANO_LOAN`, `PAYMENTS_WALLET`, `REMITTANCE_FX`, `WEALTHTECH_INVEST`).
    - Hot-path Stage 1 matcher checks against active claims per tenant.
  - **Post-Publish Drift Watcher**:
    - Registers live public URLs in `marketing_live_assets` with approved SHA-256 hash.
    - Periodically fetches live HTML, extracts text, computes current hash, and detects unauthorized copy drift.
    - Dispatches Resend email alerts when drift is detected.
  - **ARCON ASP Pre-Clearance Dossier**:
    - Generates statutory submission packet adhering to ARCON Act 2022 Article 24 and Advertising Standards Panel guidelines.
    - Includes applicant CCO attestation, statutory fee computation, legal citations, and SHA-256 seals.

---

### 1.3 Pillar 2: Regulatory Horizon Radar & Lineage Graph
- **Source Paths**:
  - Cockpit UI: `src/app/radar/page.tsx`, `src/app/insight/page.tsx`, `src/modules/radar/ui/RadarCockpit.tsx`
  - Sub-views & Components:
    - `HorizonAlertFeed.tsx` (Chronological feed of ingested circulars)
    - `HorizonAlertDetail.tsx` (Deep inspection drawer with full text, ExCo briefs, and lineage)
    - `CircularCard.tsx` (Individual circular summary card)
    - `RoleBriefViewer.tsx` (Tabbed 4-way ExCo impact viewer)
    - `ActionItemTracker.tsx` (Departmental action item tracker)
    - `CircularUploadDrawer.tsx` (Manual PDF circular upload drawer)
  - Core Services:
    - `src/modules/radar/services/circularIngestionService.ts` (ingestion orchestrator)
    - `src/modules/radar/services/pdfStructureExtractor.ts` (PDF parsing via `unpdf`)
    - `src/modules/radar/services/deterministicMetadataExtractor.ts` (metadata regex extractor)
    - `src/modules/radar/services/lineageService.ts` (circular supersession graph)
    - `src/modules/radar/services/roleSynthesisService.ts` (4-way ExCo brief synthesis)
    - `src/modules/radar/services/deadlineCountdownCalculator.ts` (deadline tracking)
    - `src/modules/radar/services/applicabilityEngine.ts` (license & rail targeting)
    - `src/modules/radar/services/clauseSegmentationEngine.ts` (atomic clause chunker)
    - `src/modules/radar/services/obligationExtractionService.ts` (character-span extractor)
    - `src/modules/radar/services/liveFeedCollector.ts` (live scrapers and RSS collectors)
    - `src/modules/radar/services/sourceRegistry.ts` (catalog of official sources)
    - `src/modules/radar/services/cascadeTriggerService.ts` (initiates cascade upon ratification)
    - `src/modules/radar/services/radarNotificationService.ts` (creates `radar_notifications`)
  - Background Workers (`Inngest`):
    - `src/modules/radar/inngest/circularIngestionHandler.ts` (`circularIngestionJob`)
    - `src/modules/radar/inngest/scheduledFeedSync.ts` (`scheduledRegulatoryFeedSync`)
  - API Routes:
    - `GET, POST /api/radar/circulars`
    - `GET /api/radar/circulars/[id]`
    - `GET, POST /api/radar/brief`
    - `GET /api/radar/lineage`
    - `GET, POST /api/radar/sources`
    - `POST /api/radar/sync`
    - `POST /api/radar/cascade`
- **Capabilities Built**:
  - **Layout-Preserving Circular Ingestion**: Extracts text from raw PDF circulars, detects circular numbers (e.g. `CBN/BSD/DIR/PUB/CIR/001/053`), dates, issuing regulator, and targeted license types.
  - **Circular Lineage & Supersession Tree**: Manages relationships in `circular_supersession_links`:
    - `AMENDS`: Modifies specific clauses of an existing instrument.
    - `REPLACES` / `REVOKES_AND_REPLACES`: Complete substitution of previous circular.
    - `REPEALS` / `PARTIALLY_REPEALS`: Revocation of statutory force.
    - `CITES`: References preceding statutory instrument.
    - Displays active vs superseded badge (`ACTIVE_LAW`, `AMENDED`, `SUPERSEDED`).
  - **4-Way Role-Specific ExCo Impact Synthesis**:
    - Synthesizes structured impact directives for 4 executive roles:
      - **Chief Compliance Officer (CCO)**: Statutory exposure, reporting obligations, filing timelines.
      - **Chief Operating Officer (COO)**: Operational workflows, SLA modifications, customer communications.
      - **Chief Technology Officer (CTO) / Product Eng**: API endpoints, transaction limits, ledger modifications.
      - **Chief Financial Officer (CFO)**: Capital adequacy, escrow requirements, statutory penalty exposure.
  - **Obligation Character-Span Mapping**: Decomposes circular text into discrete statutory obligations with exact character span offsets (`character_span_start`, `character_span_end`), page number, actor, action, target object, and condition.
  - **Live Feed Collectors**: Adapter framework for scheduled polling of official apex portals (RSS feeds, HTML scrapers, REST APIs) with run telemetry saved to `source_runs`.

---

### 1.4 Pillar 3: 5-W Policy Concordance Gap Matrix
- **Source Paths**:
  - Cockpit UI: `src/app/gap-matrix/page.tsx`, `src/app/gap/page.tsx`, `src/modules/gap-matrix/ui/GapMatrixDashboard.tsx`
  - Sub-views & Components:
    - `GapAnalysisListView.tsx` (Evaluation history table)
    - `GapAnalysisDetailView.tsx` (Deep concordance view with score cards)
    - `ObligationAssessmentEvaluationView.tsx` (Interactive 3-tier obligation checklist)
    - `FiveWDecisionDrawer.tsx` (Deep inspection drawer for individual gap items)
    - `NewGapAnalysisDrawer.tsx` (Drawer to initiate new concordance evaluation)
    - `PolicyUploadDrawer.tsx` (Internal policy manual PDF upload drawer)
    - `AuditDefensePackModal.tsx` (Modal to export audit defense binder)
  - Core Services:
    - `src/modules/gap-matrix/services/concordanceEngine.ts` (3-tier concordance evaluator)
    - `src/modules/gap-matrix/services/statutoryBenchmarkService.ts` (statutory obligations baseline)
    - `src/modules/gap-matrix/services/policyChunkerService.ts` (internal policy segmenter)
    - `src/modules/gap-matrix/services/policyVectorIndexService.ts` (embeddings & vector search)
    - `src/modules/gap-matrix/services/gapSynthesisService.ts` (5-W decision card generator)
    - `src/modules/gap-matrix/services/dossierExportService.ts` (Audit Defense Pack generator)
    - `src/modules/gap-matrix/services/geminiEmbeddingClient.ts` (calls `gemini-embedding-2`)
  - Background Workers (`Inngest`):
    - `src/modules/gap-matrix/inngest/policyIngestionHandler.ts` (`policyIngestionJob`)
  - API Routes:
    - `GET, POST /api/gap-matrix/policies`
    - `POST /api/gap-matrix/policies/ingest`
    - `GET /api/gap-matrix/benchmarks`
    - `POST /api/gap-matrix/evaluate`
    - `GET /api/gap-matrix/evaluations`
    - `GET /api/gap-matrix/evaluations/[id]`
    - `PATCH /api/gap-matrix/items/[id]`
    - `POST /api/gap-matrix/dossier`
- **Capabilities Built**:
  - **Internal Policy Document Ingestion**: Ingests uploaded operational manuals, AML/CFT policies, risk frameworks, and business continuity plans; decomposes them into numbered clauses (`policy_clauses`) with 768d vector embeddings.
  - **3-Tier Concordance Evaluation**:
    - Compares internal policy clauses against statutory benchmark obligations (BOFIA 2020, CBN AML/CFT 2022, Open Banking 2023, NDPA 2023, etc.).
    - Classifies every statutory obligation into:
      - `ADEQUATELY_MET`: Full control alignment.
      - `PARTIALLY_MET`: Substantive alignment but diverges on timelines, thresholds, or board approvals.
      - `CRITICAL_GAP`: Zero control coverage; total statutory omission.
  - **5-W Operational Decision Synthesizer**:
    - Generates 5 structured operational viewpoints per gap item:
      - *What Happened*: Enacted requirement vs internal gap.
      - *What to Know*: Regulatory intent and enforcement rationale.
      - *What Has Changed*: Shift from prior statutory standard.
      - *What to Do*: Immediate remediation plan and assigned department.
      - *Derived Insight*: Broader institutional compliance takeaway.
  - **Pre-Cleared Draft Remediation Language**:
    - Synthesizes verbatim policy clauses ready to be inserted directly into internal manuals to achieve `ADEQUATELY_MET` concordance.
  - **Interactive CCO Overrides & Assessment Criteria**:
    - Compliance officers can manually review criteria checklists, add internal SOP citations, record audit notes, and override AI classifications.
  - **Audit Defense Pack Export**:
    - Exports comprehensive audit dossier detailing policy version, benchmark edition, compliance percentage, gap matrix items, statutory penalty exposures, and SHA-256 seal.

---

### 1.5 The Connected Compliance Cascade
- **Source Paths**:
  - Event Bus: `src/modules/shared/events/complianceEventBus.ts`
  - Radar Trigger: `src/modules/radar/services/cascadeTriggerService.ts`
  - Marketing Listener: `src/modules/marketing-shield/services/marketingCascadeListener.ts`
  - API Mounts: `POST /api/radar/cascade`, `POST /api/marketing/cascade`
  - Schema: `supabase/migrations/20261026000003_compliance_cascade_events.sql`
- **Capabilities Built**:
  - **Autonomous 3-Hop Compliance Ripple**:
    - **Hop 1 (Radar -> Gap Matrix)**: Upon circular ratification, queries all tenant policies linked to benchmark version; flags `gap_evaluations.status = 'NEEDS_RE_EVALUATION'`.
    - **Hop 2 (Radar -> Marketing Shield)**: Scans tenant claims ledger and marketing campaigns for newly prohibited claims; flags conflicting campaigns as `approval_status = 'NEEDS_RE_REVIEW'`.
    - **Hop 3 (Gap Matrix / Marketing -> Executive)**: Recalculates institutional fine exposure and publishes notifications to `radar_notifications`.
  - **Cryptographically Chained Audit Ledger**:
    - Records each hop in `compliance_cascade_events` table with `sha256_hash` and `previous_event_hash` forming an unbroken Merkle-like chain.

---

### 1.6 Statutory Regulatory Library
- **Source Paths**:
  - UI: `src/app/library/page.tsx`, `src/modules/regulatory/ui/`
    - `RegulationLibraryHub.tsx` (Domain-filtered browse hub)
    - `RegulatoryInstrumentsTable.tsx` (Searchable instruments directory)
    - `InstrumentDetailPage.tsx` (Gazette viewer with version history & clauses)
    - `ObligationsRegisterView.tsx` (Register of decomposed atomic obligations)
    - `SideBySideDocViewer.tsx` (Side-by-side split screen viewer for comparison)
  - Data & Seeds: `src/shared/db/regulatoryCorpusData.ts`
  - API Routes: `GET /api/library`, `GET /api/library/clauses`, `GET /api/library/obligations`
- **Capabilities Built**:
  - Searchable catalog of 8+ major verified statutory instruments across 7 domains:
    1. *FinTech, Payments & Banking Rails* (BOFIA 2020, CBN Open Banking 2023, Mobile Money Framework)
    2. *AML / CFT & Financial Crime* (CBN AML/CFT Regulations 2022, NFIU Act)
    3. *Digital Lending & Credit Standards* (FCCPC Digital Lending Framework 2022)
    4. *Data Privacy & AI Governance* (Nigeria Data Protection Act 2023)
    5. *Capital Markets & WealthTech* (SEC Consolidated Rules 2013 as amended 2022)
    6. *Virtual Assets & Web3 Regulations* (SEC VASP Rules)
    7. *Consumer Protection & Truth-in-Advertising* (ARCON Code 2022, CBN Consumer Protection Framework 2019)
  - Decomposed atomic clauses with legal section headings, page numbers, verbatim quotes, penalty citations, and assessment criteria.

---

### 1.7 Supervisory Telemetry & Operations
- **Source Paths**:
  - UI: `src/app/operations/telemetry/page.tsx`, `src/modules/operations/ui/SupervisoryTelemetryDashboard.tsx`
  - Services: `src/modules/operations/services/operationalTelemetryService.ts`, `src/modules/radar/services/goldenBenchmarkEvaluator.ts`
  - API Route: `GET /api/operations/telemetry`
- **Capabilities Built**:
  - **Scraper & Feed Health**: Monitors official regulatory scrapers (CBN, ARCON, NDPC, etc.), HTTP response statuses, polling latencies, and ingestion counters.
  - **Model Failover Telemetry**: Tracks primary model invocations (`gemini-3.8-flash`), fallback failovers, circuit-breaker trips, and inference latency.
  - **Cascade Ledger Telemetry**: Real-time counter of total cascade events, completed hops, and average propagation latency.
  - **Golden Benchmark Suite**: Compares extracted obligations against human-verified gold standards (`tests/golden/golden-regulatory-corpus.json`), tracking precision, recall, F1 score, and character-span fidelity. Results recorded in `supervisory_benchmark_runs`.

---

### 1.8 Institutional Onboarding Flow
- **Source Paths**:
  - UI: `src/app/onboarding/page.tsx`, `src/modules/onboarding/ui/OnboardingWizard.tsx`, `RapidOnboardingFlow.tsx`
  - Step Components:
    - `Step1InstitutionDetails.tsx` (RC Number, FCCPC Ref, CBN Approval)
    - `Step2RoleAndMandate.tsx` (Job Title, Department, Executive Mandate)
    - `Step3RegulatoryScope.tsx` (Select active license profiles)
    - `Step4PaymentRailsScope.tsx` (Select active payment rails: NIP, Paystack, Interswitch, etc.)
    - `Step5InviteTeam.tsx` (Invite team members with role assignments)
  - Services: `src/modules/onboarding/services/tenantBootstrapService.ts`
  - API Routes: `GET, POST /api/onboarding`, `POST /api/onboarding/bootstrap`
- **Capabilities Built**:
  - 5-step rapid onboarding wizard executed upon first institutional sign-up.
  - Populates tenant institutional profile, active license classifications (`tenant_licenses`), and payment rails (`tenant_payment_rails`).
  - Edge proxy enforces completion before granting cockpit access (`src/proxy.ts` line 81).

---

### 1.9 Settings, Identity & Team Management
- **Source Paths**:
  - UI: `src/app/settings/page.tsx`
  - Hook: `src/shared/hooks/useUserProfile.ts`
  - Tabs Built:
    1. `details`: Organization legal name, RC number, FCCPC registration, CBN approval ref, address.
    2. `profile`: User full name, job title, email, phone number, avatar upload.
    3. `security`: Multi-factor authentication status, session management, password resets via Clerk.
    4. `team`: Active members list, pending invitations, departmental assignments, and role promotion.
    5. `billings`: Past payment receipts, invoices, transaction references, billing currency toggle (USD / NGN).
    6. `plan`: Subscription tier comparison (Starter, Pro, Enterprise), monthly/annual toggle, upgrade checkout triggers.
    7. `email`: System email notification preferences (cascade alerts, weekly digests, drift notifications).
    8. `notifications`: In-app notification preferences and alert delivery routing.

---

### 1.10 Paystack Subscription Billing Engine
- **Source Paths**:
  - Services: `src/shared/billing/paystackClient.ts`, `entitlements.ts`
  - Types: `src/shared/types/billing.ts`
  - Schema: `supabase/migrations/20261006000008_paystack_subscriptions.sql`
  - API Routes:
    - `GET /api/billing/subscription`
    - `POST /api/billing/initialize`
    - `GET /api/billing/history`
    - `POST /api/webhooks/paystack`
- **Capabilities Built**:
  - **Plan Tiers**:
    - `STARTER`: 5 team seats, 50 marketing scans/mo, 3 policy documents, Watermarked PDF exports.
    - `PRO`: Unlimited team seats, 500 marketing scans/mo, 15 policy documents, Full Cryptographic Dossier, Real-time cascade.
    - `ENTERPRISE`: Unlimited scans, unlimited documents, custom webhook cascade triggers, dedicated regulatory feeds.
  - **Lifecycle States**: `trialing` (14-day default), `active`, `past_due`, `canceled`, `unpaid`. Grace period support (`grace_period_ends_at`).
  - **Idempotent Webhook Replay Defense**:
    - Incoming webhooks validated using HMAC SHA-512 with `PAYSTACK_SECRET_KEY`.
    - Every event ID recorded in `billing_events(event_id)`. Duplicate webhook deliveries exit with HTTP 200 without reprocessing.
  - **Entitlement Engine**:
    - Evaluates active feature gates (`EntitlementEngine.computeSummary()`).
    - Enforces read-only mode if subscription is expired or grace period has elapsed.

---

### 1.11 Audit Defense & Cryptographic Integrity
- **Source Paths**:
  - Services: `src/modules/audit/auditService.ts`, `arconDossierService.ts`
  - Schema: `audit_logs` table (in `20261002000001_initial_schema.sql`)
  - API Routes: `GET /api/audit`, `POST /api/audit/verify`
- **Capabilities Built**:
  - **Cryptographic Hash Anchoring**: Computes SHA-256 digests of raw input copy, retrieved legal clauses, AI outputs, and remediation language.
  - **Immutable Verification**: `/api/audit/verify` re-computes hashes against stored `audit_logs` records to verify zero post-scan tampering for regulatory examiners.

---

## 2. Permissions, Roles & Multi-Tenant Logic

### 2.1 Identity Hierarchy
- **Clerk Claims**:
  - `userId`: Clerk User ID (`user_...`).
  - `orgId`: Clerk Organization ID (`org_...`).
  - `orgRole`: Clerk Organization Role (`org:admin`, `org:compliance_officer`, `org:viewer`).
- **Database Identity Mirror**:
  - `users`: Local user row mapped via `clerk_user_id`.
  - `organizations`: Local tenant row mapped via `clerk_organization_id`.
  - `organization_memberships`: Join table establishing tenant membership, role, and department.

### 2.2 Role Definitions & Capabilities

| Role Identifier | Title | Allowed Actions |
| :--- | :--- | :--- |
| `org:admin` / `OWNER` | Managing Partner / General Counsel | Full administrative privileges: billing, plan upgrades, team invites, role assignments, organization settings. |
| `org:compliance_officer` / `ADMIN` | Chief Compliance Officer (CCO) | Full compliance operations: sign off marketing scans, override gap criteria, ingest circulars, export audit dossiers. |
| `org:viewer` / `MEMBER` | Auditor / Compliance Analyst | Read-only inspection across all cockpits; can run draft scans and view circular feeds; cannot formally sign off or invite members. |

### 2.3 Departmental Taxonomy
Every organization member is assigned to one of seven operational departments (`org_department_enum`):
1. `EXECUTIVE_LEADERSHIP` (CEO, Board Members)
2. `COMPLIANCE_LEGAL` (CCO, General Counsel, Regulatory Counsel)
3. `GROWTH_MARKETING` (CMO, Growth Lead, Brand Managers)
4. `PRODUCT_MANAGEMENT` (CPO, Product Managers)
5. `ENGINEERING_TECH` (CTO, Lead Engineers, Infrastructure)
6. `OPERATIONS` (COO, Head of Operations, Risk Officers)
7. `TREASURY_FINANCE` (CFO, Head of Treasury, Financial Controllers)

### 2.4 Multi-Tenant Enforcement Rules
1. **Edge Proxy Isolation (`src/proxy.ts`)**:
   - Every protected route requires both `userId` and `orgId`.
   - Missing `orgId` redirects the user to `/onboarding`.
2. **Database Row-Level Security**:
   - `organization_id = current_org_id()` is enforced by PostgreSQL RLS on every tenant table.
   - Cross-tenant data leakage is structurally impossible at the SQL query planner level.
3. **Role Guard Helper (`requireRole`)**:
   - Server-side helper in `src/shared/auth/tenantContext.ts`:
     ```typescript
     await requireRole(context, ['org:admin', 'org:compliance_officer']);
     ```
   - Throws `ForbiddenError` (HTTP 403) if role claim is absent.

---

## 3. Current Limitations, Stubs & Pending Hooks

Through our forensic code audit, the following structural patterns, empty folders, and pending hooks were identified in the codebase:

### 3.1 Empty Directory Modules
1. **`src/modules/identity/`**:
   - Directory exists in `src/modules/` but contains 0 files.
   - *Status*: Identity and tenant resolution are fully implemented in `src/shared/auth/` (`tenantContext.ts`, `tenantSyncService.ts`) and Clerk components. The empty directory is an abandoned structural placeholder.
2. **`src/modules/notifications/`**:
   - Directory exists in `src/modules/` but contains 0 files.
   - *Status*: Notification infrastructure is split across `src/shared/notifications/emailService.ts` (Resend integration), `src/modules/radar/services/radarNotificationService.ts`, and the `radar_notifications` table.

### 3.2 Page-Level Stubs & Aliases
1. **`src/app/audit/page.tsx`**:
   - Implementation:
     ```typescript
     import { redirect } from 'next/navigation';
     export default function AuditPage() {
       redirect('/overview');
     }
     ```
   - *Status*: Does not render a standalone audit cockpit. Audit verification is surfaced via modal dialogs in Marketing Shield and Gap Matrix, while the `/audit` route redirects directly to `/overview`.
2. **`src/app/operations/page.tsx`**:
   - The root `/operations` directory does not have a `page.tsx`.
   - *Status*: The operational dashboard is mounted specifically at `/operations/telemetry` (`src/app/operations/telemetry/page.tsx`).
3. **Route Aliases**:
   - `/gap` is a thin client wrapper that renders `GapMatrixDashboard` (alias for `/gap-matrix`).
   - `/insight` is a thin client wrapper that renders `RadarCockpit` (alias for `/radar`).

### 3.3 Duplicate API Stubs
- **`src/app/api/marketing-shield/`**:
  - Contains `claims/route.ts` and `scan/route.ts`.
  - *Status*: Subsumed by the unified endpoints in `src/app/api/marketing/` (`/api/marketing/scan`, `/api/marketing/claims-ledger`, `/api/marketing/drift`, etc.). These remain as backward-compatible stubs.

### 3.4 Development & Test Fallback Mode
- In `src/shared/auth/tenantContext.ts`:
  - When `NODE_ENV === 'development'` or `'test'` and Clerk keys are not set, `getTenantContext()` returns a dummy tenant (`DEFAULT_DEV_ORG_ID: '00000000-0000-0000-0000-000000000001'`).
  - When `NODE_ENV === 'production'`, Clerk configuration is strictly mandatory; missing keys throw an immediate `ConfigurationError`.

### 3.5 Cloud Storage Configuration
- In `src/shared/storage/r2StorageService.ts`:
  - If `S3_BUCKET_NAME` or `S3_ACCESS_KEY_ID` is missing, the service logs a warning and generates fallback simulated data URLs (`data:application/pdf;base64,...`) rather than halting execution. This allows local development without active Cloudflare R2 credentials.
