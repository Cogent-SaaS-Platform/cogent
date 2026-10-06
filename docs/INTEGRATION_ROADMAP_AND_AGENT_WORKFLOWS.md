# COGENT — Integration Roadmap & Coding Agent Workflows

> **Document Identifier:** `docs/INTEGRATION_ROADMAP_AND_AGENT_WORKFLOWS.md`  
> **Version:** 1.0.0 (Master Execution Guide)  
> **Target Audience:** Autonomous Coding Agents, Tech Leads, Full-Stack Engineers  
> **Status:** RATIFIED & ACTIVE  

---

## 1. Mission Briefing & System Context

**Cogent** is the Enterprise AI Regulatory Intelligence & Compliance Operating System built specifically for African financial institutions and fintechs (Banks, Microfinance Banks, Payment Processors, Digital Lenders, Wealthtechs).

Unlike generic, stateless compliance checkers, Cogent is built on **Institutional Memory**, **Deterministic Statutory Sanctions**, and a **Connected Compliance Chain** across 3 core pillars:
1. **Pillar 1 (Marketing Pre-Vetting Shield):** Pre-clears marketing copy in < 3.5s against ARCON, CBN, FCCPC, and SEC regulations, backed by the tenant's **Claims Ledger** and **Live Asset Drift Watcher**.
2. **Pillar 2 (Regulatory Radar & Circular Impact Tracer):** Ingests Nigerian regulatory circulars, filters out noise via relational licenses (`tenant_licenses`) and payment rails (`tenant_payment_rails`), synthesizes **4-Way Multi-Role ExCo Briefs** (COO, CCO, Product/Eng, CFO), and enforces **Statutory Countdown Deadlines**.
3. **Pillar 3 (5-W Decision Gap Matrix & Audit Defense Pack):** Ingests internal company policies, evaluates them clause-by-clause against statutory baselines (`ADEQUATELY_MET`, `PARTIALLY_MET`, `CRITICAL_GAP`), applies the **5-W Decision Matrix**, and generates **Bank Examiner Audit Defense Dossiers**.

---

## 2. Mandatory Pre-Flight Audit Protocol for Coding Agents

**BEFORE WRITING A SINGLE LINE OF CODE**, any agent working on this repository must execute this 5-step pre-flight audit:

```
┌────────────────────────────────────────────────────────────────────────┐
│ STEP 1: AUDIT THE RATIFIED ARCHITECTURE DOCS                           │
│ • Read docs/ARCHITECTURE.md for modular boundaries and RLS rules       │
│ • Read docs/DATA_MODEL.md for database schemas and enum constraints    │
│ • Read docs/PILLAR_1_MARKETING_SHIELD.md for Pillar 1 specs            │
│ • Read docs/PILLAR_2_REGULATORY_RADAR.md for Pillar 2 specs            │
│ • Read docs/PILLAR_3_5W_GAP_MATRIX.md for Pillar 3 specs               │
├────────────────────────────────────────────────────────────────────────┤
│ STEP 2: AUDIT EXISTING CODEBASE IMPLEMENTATIONS                        │
│ • Check src/modules/marketing-shield/ for existing pipeline stages     │
│ • Check src/modules/radar/ and src/modules/gap-matrix/ for skeletons   │
│ • Check src/shared/ai-engine/ for model aliases and structured runners │
│ • Check src/shared/db/ for Supabase client and seed files              │
├────────────────────────────────────────────────────────────────────────┤
│ STEP 3: AUDIT DATABASE MIGRATIONS                                      │
│ • Check supabase/migrations/ for active database schema state          │
│ • Never create migrations that break existing RLS policies             │
├────────────────────────────────────────────────────────────────────────┤
│ STEP 4: VERIFY RUNTIME CONSTRAINTS                                     │
│ • TypeScript strict mode is enabled                                    │
│ • Zero currency calculations in LLMs (deterministic tables only!)      │
│ • Next.js App Router (React Server Components + Client Islands)        │
├────────────────────────────────────────────────────────────────────────┤
│ STEP 5: RUN PRE-EXISTING TESTS                                         │
│ • Run `npm test` or `npx vitest run` to ensure clean baseline          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Phase-by-Phase Execution Roadmap

```
PHASE 1: PILLAR 1 UPGRADE (Marketing Shield Enterprise)
  ├── 1.1 DB Migration: Claims Ledger & Drift Tables
  ├── 1.2 Claims Ledger Service & Memory Matching
  ├── 1.3 Product Category Context Injection
  ├── 1.4 Post-Publish Live Asset & Drift Watcher
  ├── 1.5 ARCON / CBN Audit Defense Pack Generator
  └── 1.6 Frontend UI Polish (Claims Suggestions & Drift Tab)

PHASE 2: HORIZON SCANNER & PILLAR 2 UPGRADE (Regulatory Radar)
  ├── 2.1 DB Migration: Circulars, Lineage Graph & Role Briefs
  ├── 2.2 Circular Document Ingestion & Text Parser (PDF/OCR)
  ├── 2.3 Zero-Noise Relational Applicability Engine
  ├── 2.4 4-Way Multi-Role ExCo Synthesis Engine
  ├── 2.5 Circular Lineage & Supersession Graph Resolver
  ├── 2.6 Statutory Countdown Clock & SLA Alerts
  └── 2.7 Regulatory Radar UI Implementation

PHASE 3: PILLAR 3 UPGRADE (5-W Decision Gap Matrix)
  ├── 3.1 DB Migration: Policy Documents, Clauses & Gap Items
  ├── 3.2 Atomic Policy Chunking & pgvector Indexer
  ├── 3.3 3-Tier Clause-by-Clause Concordance Engine
  ├── 3.4 5-W Decision Framework & Draft Replacement Language
  ├── 3.5 Bank Examiner Audit Defense Dossier Generator
  └── 3.6 5-W Gap Matrix UI Implementation

PHASE 4: THE CONNECTED COMPLIANCE CASCADE (Integration Loop)
  ├── 4.1 Upstream Circular -> Trigger Downstream Gap Re-evaluation
  ├── 4.2 Upstream Circular -> Trigger Downstream Marketing Drift Check
  └── 4.3 Unified Executive Command Center
```

---

## 4. Detailed Agent Workflows for Each Build Phase

---

### PHASE 1: Pillar 1 Upgrade (Marketing Shield Enterprise)

#### Task 1.1: Database Migration for Claims Ledger
- **Target File:** `supabase/migrations/20261006_claims_ledger_and_drift.sql`
- **Tables to Create:**
  - `tenant_claims_ledger`:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`
    - `product_category VARCHAR(64) NOT NULL` (e.g., `SAVINGS_DEPOSIT`, `DIGITAL_NANO_LOAN`)
    - `approved_text TEXT NOT NULL`
    - `prohibited_counterpart TEXT`
    - `governing_regulator regulator_code_enum NOT NULL`
    - `statutory_citation TEXT NOT NULL`
    - `cco_rationale TEXT NOT NULL`
    - `approved_by_user_id VARCHAR(128)`
    - `approved_at TIMESTAMPTZ DEFAULT now()`
    - `is_active BOOLEAN DEFAULT true`
    - Enable RLS: `organization_id = current_org_id()`
  - `marketing_live_assets`:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `organization_id UUID NOT NULL REFERENCES organizations(id)`
    - `scan_id UUID REFERENCES marketing_scans(id)`
    - `live_url TEXT NOT NULL`
    - `channel marketing_channel_enum NOT NULL`
    - `original_approved_hash VARCHAR(64) NOT NULL`
    - `last_checked_at TIMESTAMPTZ DEFAULT now()`
    - `drift_status VARCHAR(32) DEFAULT 'SYNCED'` (`SYNCED`, `DRIFT_DETECTED`, `ERROR`)
    - `drift_findings JSONB`

#### Task 1.2: Claims Ledger Matching Service
- **Target File:** `src/modules/marketing-shield/claimsLedgerService.ts`
- **Responsibilities:**
  - Ingest tenant approved claims into memory / cache.
  - Prior to calling the LLM, evaluate input copy against `tenant_claims_ledger` for the selected `product_category`.
  - When exact or fuzzy match occurs: generate a `CLAIMS_LEDGER_MATCH` finding offering the CCO-approved replacement.
  - Implement `addApprovedClaim(entry: CreateClaimInput)` method invoked when CCO approves copy with the "Save to Ledger" checkbox checked.

#### Task 1.3: Product Category Context Injection
- **Target Files:**
  - `src/modules/marketing-shield/marketingShieldService.ts`
  - `src/shared/ai-engine/prompts/marketingShieldPrompts.ts`
- **Changes:**
  - Add `productCategory: ProductCategoryCode` to `ExecuteScanInput`.
  - In `buildMarketingShieldPrompt`: inject product category constraints (e.g. if `DIGITAL_NANO_LOAN`, inject FCCPC APR transparency rules).

#### Task 1.4: Post-Publish Live Asset & Drift Watcher
- **Target File:** `src/modules/marketing-shield/driftWatcherService.ts`
- **Responsibilities:**
  - Implement `verifyLiveUrl(url: string, originalScanId: string)`:
    - Fetches live HTML / text from URL.
    - Computes current text SHA-256 hash.
    - If hash differs from `original_approved_hash`:
      - Runs deterministic checks for missing license disclosures ("Licensed by CBN").
      - Calls `FAST_MODEL` to compare original approved claims against live claims.
      - Returns `DriftReportViewModel` (`isDrifted: boolean`, `omittedDisclosures: string[]`, `modifiedClaims: string[]`).

#### Task 1.5: Official ARCON & CBN Audit Defense Pack Export
- **Target File:** `src/modules/marketing-shield/auditDefenseExporter.ts`
- **Responsibilities:**
  - Given a `scanId`, fetch scan record, findings, CCO signoff, and audit log.
  - Generate a formal printable HTML / PDF view:
    - Official Transmittal Header addressed to Director, Advertising Standards Panel (ARCON) or CBN Consumer Protection.
    - Cryptographic verification block (SHA-256 hash + Clerk user ID).
    - Verbatim side-by-side comparison.

---

### PHASE 2: Horizon Scanner & Pillar 2 Upgrade (Regulatory Radar)

#### Task 2.1: Database Migration for Circulars & Lineage
- **Target File:** `supabase/migrations/20261006_radar_circulars_and_lineage.sql`
- **Tables to Create:**
  - `radar_circulars`:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `regulator regulator_code_enum NOT NULL`
    - `circular_reference VARCHAR(128) NOT NULL UNIQUE`
    - `title TEXT NOT NULL`
    - `issuing_department VARCHAR(128)`
    - `issuance_date DATE NOT NULL`
    - `effective_date DATE`
    - `statutory_deadline_date DATE`
    - `raw_text TEXT NOT NULL`
    - `document_checksum VARCHAR(64) NOT NULL`
    - `targeted_licenses license_type_enum[]`
    - `affected_rails payment_rail_enum[]`
    - `applies_universally BOOLEAN DEFAULT false`
    - `lineage_status VARCHAR(32) DEFAULT 'ACTIVE_LAW'` (`ACTIVE_LAW`, `AMENDED`, `SUPERSEDED`)
  - `circular_supersession_links`:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `parent_circular_id UUID REFERENCES radar_circulars(id)`
    - `child_circular_id UUID REFERENCES radar_circulars(id)`
    - `amendment_type VARCHAR(32) NOT NULL` (`AMENDS`, `REVOKES_AND_REPLACES`, `PARTIALLY_REPEALS`)
    - `clause_references TEXT`
  - `radar_tenant_impacts`:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `organization_id UUID NOT NULL REFERENCES organizations(id)`
    - `circular_id UUID NOT NULL REFERENCES radar_circulars(id)`
    - `is_applicable BOOLEAN NOT NULL`
    - `applicability_rationale TEXT NOT NULL`
    - `priority_level severity_level_enum NOT NULL`
    - `coo_brief JSONB NOT NULL`
    - `cco_brief JSONB NOT NULL`
    - `product_eng_brief JSONB NOT NULL`
    - `cfo_brief JSONB NOT NULL`
    - `acknowledged_by_cco BOOLEAN DEFAULT false`

#### Task 2.2: Document Ingestion & Text Parser
- **Target File:** `src/modules/radar/services/circularIngestionService.ts`
- **Responsibilities:**
  - Extract text and structural metadata from circular documents (PDF/Markdown).
  - Extract circular reference numbers using regex patterns (e.g. `/(CBN|ARCON|FCCPC)\/[A-Z0-9\/_-]+/i`).
  - Calculate deterministic checksum (SHA-256).

#### Task 2.3: Zero-Noise Relational Applicability Engine
- **Target File:** `src/modules/radar/services/applicabilityEngine.ts`
- **Responsibilities:**
  - Query tenant's active licenses and payment rails from `tenant_licenses` and `tenant_payment_rails`.
  - Compare against circular targeting.
  - Return deterministic match boolean and detailed explanation.

#### Task 2.4: 4-Way Multi-Role ExCo Synthesis Engine
- **Target File:** `src/modules/radar/services/roleBriefSynthesisService.ts`
- **Responsibilities:**
  - Call Gemini with `RadarTenantImpactSchema`.
  - Generate tailored briefs:
    - COO: Operational rails and settlement windows.
    - CCO: Legal citations, statutory filings, penalties.
    - VP Product/Eng: API schema changes, KYC logic, database migrations.
    - CFO: Capital adequacy, reserve ratios, levy deductions.

#### Task 2.5: Lineage & Supersession Graph Resolver
- **Target File:** `src/modules/radar/services/lineageService.ts`
- **Responsibilities:**
  - Query `circular_supersession_links` to construct an interactive tree.
  - Calculate active governing version for any section of Nigerian financial regulation.

#### Task 2.6: Statutory Countdown Clock & SLA Alerts
- **Target File:** `src/modules/radar/services/countdownService.ts`
- **Responsibilities:**
  - Compute `remainingDays = statutory_deadline_date - today`.
  - Expose status: `SAFE` (>30d), `ACTION_REQUIRED` (15-30d), `CRITICAL_URGENCY` (<14d), `PAST_DEADLINE` (<0d).

---

### PHASE 3: Pillar 3 Upgrade (5-W Decision Gap Matrix)

#### Task 3.1: Database Migration for Policy Concordance
- **Target File:** `supabase/migrations/20261006_gap_matrix_concordance.sql`
- **Tables to Create:**
  - `policy_documents`:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `organization_id UUID NOT NULL REFERENCES organizations(id)`
    - `title VARCHAR(255) NOT NULL`
    - `policy_domain VARCHAR(64) NOT NULL` (e.g., `AML_CFT`, `CONSUMER_PROTECTION`, `INFO_SECURITY`)
    - `version_tag VARCHAR(32) NOT NULL`
    - `document_checksum VARCHAR(64) NOT NULL`
    - `uploaded_by_user_id VARCHAR(128)`
  - `policy_clauses`:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `organization_id UUID NOT NULL REFERENCES organizations(id)`
    - `policy_id UUID NOT NULL REFERENCES policy_documents(id) ON DELETE CASCADE`
    - `section_number VARCHAR(64) NOT NULL`
    - `heading TEXT`
    - `clause_text TEXT NOT NULL`
    - `embedding vector(768)`
  - `gap_evaluations`:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `organization_id UUID NOT NULL REFERENCES organizations(id)`
    - `policy_id UUID NOT NULL REFERENCES policy_documents(id)`
    - `statutory_instrument_id UUID REFERENCES regulatory_instruments(id)`
    - `overall_score INTEGER NOT NULL` (0-100)
    - `total_fine_exposure_naira NUMERIC DEFAULT 0`
    - `status VARCHAR(32) DEFAULT 'PENDING_REVIEW'`
  - `gap_matrix_items`:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `organization_id UUID NOT NULL REFERENCES organizations(id)`
    - `evaluation_id UUID NOT NULL REFERENCES gap_evaluations(id) ON DELETE CASCADE`
    - `statutory_clause_ref VARCHAR(128) NOT NULL`
    - `matched_policy_clause_id UUID REFERENCES policy_clauses(id)`
    - `compliance_status VARCHAR(32) NOT NULL` (`ADEQUATELY_MET`, `PARTIALLY_MET`, `CRITICAL_GAP`)
    - `what_happened TEXT NOT NULL`
    - `what_to_know TEXT NOT NULL`
    - `what_has_changed TEXT NOT NULL`
    - `what_to_do TEXT NOT NULL`
    - `draft_replacement_language TEXT`
    - `derived_insight TEXT NOT NULL`
    - `statutory_penalty_naira NUMERIC DEFAULT 0`

#### Task 3.2: Atomic Policy Chunking & Vector Indexer
- **Target File:** `src/modules/gap-matrix/services/policyChunkerService.ts`
- **Responsibilities:**
  - Parse uploaded policy PDF / DOCX.
  - Chunk hierarchically: keep section numbers and sub-clauses intact.
  - Generate 768d embeddings using `EMBEDDING_MODEL` (`gemini-embedding-2`).
  - Store in `policy_clauses`.

#### Task 3.3: Clause-by-Clause Statutory Concordance Engine
- **Target File:** `src/modules/gap-matrix/services/concordanceEngine.ts`
- **Responsibilities:**
  - Retrieve statutory baseline clauses for the selected regulatory domain.
  - For each statutory clause: run vector search + keyword search in `policy_clauses`.
  - Classify clause:
    - High semantic similarity + all statutory constraints met $\rightarrow$ `ADEQUATELY_MET`
    - Match found but missing timelines or parameter differences $\rightarrow$ `PARTIALLY_MET`
    - No match or low similarity $\rightarrow$ `CRITICAL_GAP`

#### Task 3.4: 5-W Decision Framework & Draft Replacement Language
- **Target File:** `src/modules/gap-matrix/services/fiveWDecisionService.ts`
- **Responsibilities:**
  - Invoke Gemini with `GapEvaluationOutputSchema`.
  - For every `PARTIALLY_MET` or `CRITICAL_GAP`: generate **ready-to-adopt draft replacement policy language**.
  - Query `statutory_penalties` deterministically for fine exposures.

#### Task 3.5: Bank Examiner Audit Defense Dossier Generator
- **Target File:** `src/modules/gap-matrix/services/examinerDefenseExporter.ts`
- **Responsibilities:**
  - Generate official PDF/HTML export containing:
    1. Transmittal Letter to CBN Banking Supervision Department / NDIC.
    2. Clause Concordance Matrix table.
    3. Active Board Remediation Plan with SHA-256 hashes.
    4. CCO and Board Audit Committee attestation signature block.

---

### PHASE 4: The Connected Compliance Cascade

#### Task 4.1: Upstream Circular Cascade to Gap Matrix
- **Target File:** `src/modules/radar/services/cascadeTriggerService.ts`
- **Responsibilities:**
  - When CCO ratifies a new circular in Pillar 2:
  - Query all internal policies in `policy_documents` matching the circular's regulatory domain.
  - Create a notification/task: *"New Circular Ingested: Re-run Concordance Audit on Internal AML Policy"*.

#### Task 4.2: Upstream Circular Cascade to Marketing Shield
- **Target File:** `src/modules/marketing-shield/marketingCascadeListener.ts`
- **Responsibilities:**
  - If the new circular updates advertising or disclosure obligations:
  - Query all `APPROVED` scans in `marketing_scans`.
  - Flag campaigns as `NEEDS_RE_REVIEW` with an explanation: *"Underlying statutory rule moved by Circular CBN 2026-X"*.

---

## 5. Coding Agent Rules of Engagement

1. **Deterministic Penalty Rule:** Never generate Naira fine figures with LLMs. Always pull from `statutory_penalties` or deterministic penalty lookups.
2. **Strict Multi-Tenancy:** Always include `organization_id` on tenant database writes, and verify RLS is enabled.
3. **Zod Validation:** Every AI call must use typed schemas validated by Zod.
4. **Design System Adherence:** Use the Cogent dark-mode palette (`slate-950` background, `slate-900` cards, `slate-800` borders, `cyan-500` primary accents, `rose-500` critical alerts).
5. **Progressive Disclosure:** UIs must follow Level 1 (Banner) $\rightarrow$ Level 2 (Summary) $\rightarrow$ Level 3 (Cards) $\rightarrow$ Level 4 (Citations) $\rightarrow$ Level 5 (Actions) $\rightarrow$ Level 6 (Governance).
