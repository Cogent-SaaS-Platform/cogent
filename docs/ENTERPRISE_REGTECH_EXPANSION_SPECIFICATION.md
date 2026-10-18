# Cogent Enterprise RegTech Expansion Specification: The Zango AI Connected Compliance Paradigm

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Target Platform:** Cogent RegTech Enterprise (`https://stem-cogent.com`)  
**Core Benchmark Reference:** Zango AI Platform Architecture (Horizon Scanning, Multi-Tier Regulatory Library, Decomposed Obligation Register, 5-W Concordance Gap Analysis)  
**Target ICP:** Multi-Jurisdiction African FinTechs, Tier-1 Banks, Digital Lenders, Payment Service Providers (PSPs), and Cross-Border Capital Market Operators (Nigeria, Ghana, Kenya, South Africa, WAEMU).

---

## 1. Executive Summary & Problem Statement

### 1.1 The "Weekend Project" Bottleneck vs. Enterprise Reality
Historically, early-stage regulatory technology products suffer from the **"4-Source Sandbox Trap"**:
- Hardcoded or static polling of a handful of local apex regulatory portals (e.g., CBN, SEC, NDPC, ARCON, FCCPC).
- Reliance on sporadic, delayed gazette publications (often months behind actual enforcement).
- Flat, unsegmented document lists that display statutory acts without domain categorization.
- "Obligations" reduced to single-sentence summaries that provide zero actionable guidance to compliance officers or bank examiners.

### 1.2 The Pan-African Regulatory Reality (Multi-Document Sprawl)
In Africa, regulations are **never housed in a single, consolidated code**. When a fintech launches a cross-border payment corridor or digital credit product, they face severe **statutory fragmentation**:
- **Nigeria Example:** A digital credit and payment app is governed concurrently by:
  1. *Primary Legislation:* BOFIA 2020 (Sections 57–65), FCCPA 2018 (Sections 124–130), NDPA 2023, ARCON Act 2022.
  2. *Secondary Guidelines:* CBN Guidelines on Mobile Money 2021, CBN Regulatory Framework for Open Banking 2023.
  3. *Ad-Hoc Directives & Circulars:* FCCPC Limited Interim Regulatory Framework for Digital Lending, CBN Circular on Virtual Asset Service Providers (VASPs), NFIU AML/CFT Regulations 2022.
  4. *Multi-Corridor Jurisdictions:* Bank of Ghana (BOG) Payment Systems and Services Act, Central Bank of Kenya (CBK) Digital Credit Providers Regulations 2022.

Missing a single overnight circular or regional directive leads to immediate account freezes, administrative penalties (ranging from ₦10M to ₦50M+), director criminal liabilities, and license revocations.

### 1.3 The Cogent Competitive Moat
Where legacy platforms stop at passive evaluation ("Met" vs. "Not Met"), Cogent provides **Operationalized Sovereign Defense**:
1. **The 5-W Decision Framework:** What Happened, What to Know, What Has Changed, What to Do (with Board-ready replacement clause drafting), and Derived Insight.
2. **Deterministic Statutory Penalty Matrix (ADR-004):** Zero LLM hallucinated penalties; financial liabilities and license risks are tied deterministically to verified statutory schedules.
3. **Automated Cross-Pillar Cascading:** A regulatory change automatically updates the Gap Matrix, alerts executives via tailored briefs, and instantly activates the Marketing Shield to block non-compliant ad copy.

---

## 2. Architectural Blueprint & High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   COGENT ENTERPRISE REGTECH ARCHITECTURE MATRIX                                       │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                        │
│  [LAYER 1: MULTI-STREAM SOURCE MESH & INGESTION]                                                                      │
│  ├── Apex Regulators: CBN (NG), SEC (NG), NDPC (NG), ARCON (NG), FCCPC (NG), BOG (GH), CBK (KE), SARB/FSCA (ZA)        │
│  ├── Tier-1 Law Firm Portals: Aluko & Oyebode, Banwo & Ighodalo, Templars, Bowmans, Olaniwun Ajayi                     │
│  ├── Verified Regulatory Media: TechCabal, Techpoint Africa, Nairametrics, BusinessDay, Lawyard                        │
│  └── Ingestion Adapters: RSS/Atom, Headless Scrapers, Webhooks, PDF Textractor, SHA-256 Deduplication Engine          │
│                                                                                                                        │
│  [LAYER 2: HORIZON SCANNING & REAL-TIME ALERTS (00:34 - 01:08)]                                                       │
│  ├── Dual-Date Verification: Publication Date (Issuance) vs Ingestion Date (Discovery) vs Zero-Day Alert Delta       │
│  ├── On-Demand "Scan Sources Now" Engine: Webhook/Worker invocation with real-time SSE streaming pulse                │
│  ├── Multi-Jurisdictional Taxonomy: NG, GH, KE, ZA, REGIONAL/WAEMU, SUPRANATIONAL (FATF/Basel)                        │
│  └── Instant Applicability Matching: Deterministic filter matching tenant license types and payment rails              │
│                                                                                                                        │
│  [LAYER 3: MULTI-TIER REGULATORY CONTROL ROOM (01:27)]                                                                │
│  ├── Multi-Tier Classification: Jurisdiction ➔ Regulatory Domain ➔ Document Type ➔ Instrument ➔ Clause                │
│  ├── Regulatory Domains: Fintech & Payments, AML/CFT, Digital Credit & Lending, Data Protection & AI, Capital Markets  │
│  ├── Document Types: Primary Legislation (Acts), Subsidiary Regulations, Circulars & Directives, Standards & Guidance │
│  └── Interactive Control Room: Domain Health Cards, Hierarchical Accordion Grid, Section Deep-Inspector                │
│                                                                                                                        │
│  [LAYER 4: DECOMPOSED OBLIGATION REGISTER (02:01)]                                                                    │
│  ├── Decomposed Attributes: The Rule (Verbatim) | Summary | Assessment Criteria (Checklist) | Penalty Schedule        │
│  ├── Ownership & Timeline: Responsible Corporate Role (CCO, MLRO, CTO, DPO) | Statutory Cure Window (Days)            │
│  └── Interactive User Overrides: Custom Status, Internal Evidence Upload, SOP Cross-Reference, Manual Verification   │
│                                                                                                                        │
│  [LAYER 5: 5-W GAP ANALYSIS & DETERMINISTIC CONCORDANCE (02:39 - 03:19)]                                              │
│  ├── Multi-Document Baseline Aggregation: Cross-statute obligation grouping against internal compliance manuals       │
│  ├── Vector Search & Clause Concordance: Tenant-isolated pgvector matching internal policy clauses against statutes   │
│  ├── Gemini 5-W Operational Synthesis: What Happened | What to Know | What Has Changed | What to Do | Derived Insight │
│  ├── Deterministic Penalty Attachment: Zero LLM hallucinations; statutory penalty schedules queried deterministically │
│  └── Automated Cascades: Marketing Shield Ad Pre-vetting + Executive Briefs + Board Audit Concordance Dossier Export   │
│                                                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Step-by-Step Implementation Specification

---

### Step 1: Multi-Stream Source Expansion Pipeline

#### 1.1 Objective
Expand Cogent's regulatory ingestion beyond the initial 4-5 apex bodies to encompass a comprehensive intelligence network:
1. **Apex Regulatory Portals (Nigeria & Pan-Africa):**
   - Nigeria: CBN, SEC, NDPC, ARCON, FCCPC, NFIU.
   - Ghana: Bank of Ghana (BOG), Data Protection Commission (DPC).
   - Kenya: Central Bank of Kenya (CBK), Capital Markets Authority (CMA), Office of Data Protection (ODPC).
   - South Africa: Financial Sector Conduct Authority (FSCA), South African Reserve Bank (SARB).
   - Regional: BCEAO (Francophone West Africa), FATF / GIABA (AML/CFT).
2. **Tier-1 Law Firm Briefings:**
   - Templars, Aluko & Oyebode, Banwo & Ighodalo, Olaniwun Ajayi, Bowmans.
3. **Verified Regulatory & Financial Media:**
   - TechCabal, Techpoint Africa, Nairametrics, BusinessDay, Lawyard.

#### 1.2 Data Contract & Schema Additions
We define a unified `RegulatorySource` interface and database table:

```typescript
export type SourceCategory = 
  | 'APEX_REGULATOR' 
  | 'LAW_FIRM_ADVISORY' 
  | 'REGULATORY_NEWS_MEDIA' 
  | 'SUPRANATIONAL_BODY';

export type JurisdictionCode = 'NG' | 'GH' | 'KE' | 'ZA' | 'WAEMU' | 'SUPRANATIONAL';

export interface RegulatorySourceDefinition {
  id: string;
  code: string;
  name: string;
  category: SourceCategory;
  jurisdiction: JurisdictionCode;
  officialUrl: string;
  feedUrl?: string;
  adapterType: 'RSS_FEED' | 'HTML_SCRAPER' | 'REST_API' | 'MANUAL_VERIFIED';
  isActive: boolean;
  pollingFrequencyHours: number;
  trustScore: number; // 0.00 to 1.00
  tags: string[];
}
```

#### 1.3 Technical Deliverables for Step 1
- **File:** `src/modules/radar/services/sourceRegistry.ts` (Master catalog of 20+ verified African sources).
- **File:** `src/modules/radar/services/liveFeedCollector.ts` (Refactored to ingest across `APEX_REGULATOR`, `LAW_FIRM_ADVISORY`, and `REGULATORY_NEWS_MEDIA`).
- **File:** `src/modules/radar/services/adapters/rssFeedAdapter.ts` (Generic RSS/Atom parser with sanitization and link resolution).
- **File:** `src/modules/radar/services/adapters/htmlScraperAdapter.ts` (Polite, cached scraper for non-RSS regulatory portals).

---

### Step 2: Horizon Scanning & Real-Time Alert Engine (The Zango 00:34 - 01:08 Paradigm)

#### 2.1 Objective
Transform Radar from a static list into an active, real-time command center where users can trigger on-demand scans and see incoming alerts with transparent dual-date tracking (`publication_date` vs. `ingested_at`), severity metrics, and direct downstream applicability.

#### 2.2 Functional Capabilities
1. **Dual-Date Lineage & Discovery Velocity:**
   - **Publication Date:** The official date stamped on the circular/article.
   - **Ingestion Date:** The timestamp Cogent’s crawler indexed and vectorized the document.
   - **Zero-Day Indicator:** Visual badge displaying elapsed discovery time (e.g., *“Indexed 2 hours after release”*).
2. **On-Demand "Scan Sources Now" Trigger:**
   - Button in the UI that issues an authenticated `POST /api/radar/sync` request.
   - Emits Server-Sent Events (SSE) or polling status (`Checking CBN... Checking BOG... Checking Templars... Done: 2 new items`).
3. **Multi-Jurisdiction & Source-Type Filters:**
   - Toggle buttons for:
     - Jurisdiction: `ALL`, `🇳🇬 Nigeria`, `🇬🇭 Ghana`, `🇰🇪 Kenya`, `🇿🇦 South Africa`, `🌍 Pan-Africa`.
     - Category: `Official Gazettes`, `Legal Advisories`, `Fintech News`.
     - Impact Level: `CRITICAL`, `HIGH`, `MEDIUM`, `INFORMATIONAL`.

#### 2.3 Technical Deliverables for Step 2
- **File:** `src/app/api/radar/sync/route.ts` (Endpoint triggering parallel source polling and returning structured telemetry).
- **File:** `src/modules/radar/ui/RadarCockpit.tsx` (Enhanced header with "Scan Sources Now" button, live status pulsing indicator, and multi-jurisdiction filter tabs).
- **File:** `src/modules/radar/ui/RadarFeedCard.tsx` (Enriched alert cards showing dual-dates, source category badge, verified link, and affected license indicators).

---

### Step 3: Enterprise Regulatory Library Re-Architecture (The Zango 01:27 Paradigm)

#### 3.1 Objective
Rebuild `src/app/library/page.tsx` from a simple flat list into an enterprise-grade **Regulatory Control Room** with domain-segmented visual cards and a hierarchical document classification taxonomy.

#### 3.2 Multi-Tier Taxonomy Model

```
Level 1: Jurisdiction
  ├── 🇳🇬 Federal Republic of Nigeria
  ├── 🇬🇭 Republic of Ghana
  ├── 🇰🇪 Republic of Kenya
  ├── 🇿🇦 Republic of South Africa
  └── 🌍 Pan-African / Regional Corridors

Level 2: Regulatory Domain
  ├── 💳 Fintech, Payments & Banking Infrastructure
  ├── 🛡️ AML/CFT, Sanctions & Financial Crime
  ├── 📱 Digital Lending, Consumer Credit & Fair Practices
  ├── 🔐 Data Privacy, Cybersecurity & AI Governance
  ├── 📈 Capital Markets, WealthTech & Crowdfunding
  └── 🪙 Virtual Assets, Crypto & Web3 Regulations

Level 3: Document Classification
  ├── ⚖️ Primary Legislation (Acts enacted by Legislature)
  ├── 📜 Subsidiary Regulations & Directives (Apex regulatory statutory frameworks)
  ├── 📢 Operational Circulars & Guidelines (Time-bound instructions & letters)
  └── 📝 Guidance Notes & Industry Standards (Technical frameworks & best practices)
```

#### 3.3 UI / UX Master Components
1. **Domain Overview Grid:**
   - 6 Interactive Domain Cards showing:
     - Domain Icon & Title.
     - Active Instruments count.
     - Total Decomposed Obligations.
     - Criticality Distribution (Critical / High / Medium).
     - "Explore Domain" quick action.
2. **Hierarchical Document Table:**
   - Grouped by Document Classification (`Legislation`, `Regulations`, `Circulars`, `Standards`).
   - Rich metadata columns: Citation, Enactment Year, Issuing Authority, Enforcing Powers, Obligation Count, Verification Seal (Official Gazette Verified).
3. **Interactive Clause & Obligation Drawer (Slide-Over):**
   - Deep inspection drawer revealing clauses, section citations, and child obligations without page navigation.

#### 3.4 Technical Deliverables for Step 3
- **File:** `src/shared/db/regulatoryCorpusData.ts` (Enriched corpus data model with domain taxonomy and multi-jurisdiction support).
- **File:** `src/app/library/page.tsx` (Complete redesign into enterprise control room with domain segmentation and hierarchy).
- **File:** `src/app/api/library/route.ts` (API updated to support filtering by `domain`, `jurisdiction`, and `instrumentType`).

---

### Step 4: Decomposed Obligation Extraction & Register (The Zango 02:01 Paradigm)

#### 4.1 Objective
Upgrade Cogent’s obligation data model from single-line text descriptions into a **Structured, Decomposed Enterprise Obligation Register**. 

#### 4.2 The 7-Element Decomposed Obligation Model
Every extracted obligation in Cogent must contain:

| Element | Field Name | Description | Example from Nigerian Regs |
| :--- | :--- | :--- | :--- |
| **1. The Rule** | `verbatimClauseSnippet` | Exact statutory language excerpted verbatim from official gazette. | *"Article 38(1): All marketing communications... must be submitted to the ASP for pre-exposure vetting prior to public transmission."* |
| **2. Executive Summary** | `plainLanguageSummary` | Clear, jargon-free operational explanation for executive leaders. | *Mandatory pre-approval required for all advertisements and promotional materials before release.* |
| **3. Assessment Criteria** | `assessmentCriteria` | Specific verifiable checklist items an auditor requires to verify compliance. | 1. Official ASP Certificate of Approval issued.<br>2. Advertising copy matches vetted text.<br>3. Disclaimers visible in min 10pt font. |
| **4. Statutory Penalty Matrix** | `penaltyMatrix` | Deterministic fines and administrative sanctions pulled from statutory schedules. | - Base Fine: ₦1,000,000 to ₦5,000,000<br>- Daily Recurrent Fine: ₦50,000/day<br>- License Risk: Suspension/Revocation<br>- Citation: Section 54 ARCON Act 2022 |
| **5. Department & Role** | `targetRole` | Institutional owner responsible for implementation. | `Chief Compliance Officer`, `Head of Marketing`, `DPO` |
| **6. Statutory Timeline** | `statutoryTimelineDays` | Official cure period or filing deadline (days). | `10 Working Days` prior to public release |
| **7. User Override & Verification** | `userOverride` | Interactive state for compliance teams to review, override, and link internal evidence. | Status: `VERIFIED_MET`, Notes: *"Approved via ASP certificate #2026-9042"*, SOP: `SOP-MKT-04` |

#### 4.3 Technical Deliverables for Step 4
- **File:** `src/shared/types/index.ts` (Updated `RegulatoryObligation` type with structured assessment criteria checklist and user override states).
- **File:** `src/shared/db/regulatoryCorpusData.ts` (Seeded with full decomposed obligations across all core statutory frameworks).
- **File:** `src/shared/ui/inspector/ObligationRegisterCard.tsx` (New reusable enterprise card rendering the 7-element decomposed obligation layout with checklist interactions).
- **File:** `src/app/api/library/obligations/override/route.ts` (Endpoint allowing compliance officers to update verification status and add internal evidence notes).

---

### Step 5: 5-W Gap Analysis & Multi-Document Concordance (The Zango 02:39 - 03:19 Paradigm)

#### 5.1 Objective
Enhance Cogent's Gap Matrix to solve the **Multi-Document Sprawl** challenge:
- Allow an institution to benchmark their internal policy against a **Composite Regulatory Baseline** (e.g., Digital Credit Policy evaluated simultaneously against FCCPA 2018 + FCCPC Guidelines + CBN Mobile Money Guidelines + NDPA 2023).
- Preserve and strengthen Cogent's unique moats:
  1. **5-W Operational Remediation Blueprint:** Generating actionable, role-based draft replacement clauses ready for Board adoption.
  2. **Deterministic Penalty Attachment:** Zero-LLM hallucination guarantee.
  3. **Automated Cross-Pillar Cascading:** Real-time synchronization with Marketing Shield and Executive Cockpit.

#### 5.2 The 5-W Output Schema (Gemini Structured Generation)
```typescript
export interface Decomposed5WGapFinding {
  regulatoryClauseReference: string;
  matchedInternalPolicySection: string | null;
  complianceStatus: 'ADEQUATELY_MET' | 'PARTIALLY_MET' | 'CRITICAL_GAP';
  assessmentCriteriaResults: Array<{
    criterionText: string;
    isSatisfied: boolean;
    evidenceFoundInPolicy: string | null;
  }>;
  whatHappened: string;       // Factual baseline delta
  whatToKnow: string;         // Historical supervisory background & precedent sanctions
  whatHasChanged: string;     // Exact operational shortfall or timeline divergence
  whatToDo: string;           // Step-by-step remediation protocol
  draftReplacementPolicyLanguage: string; // Ready-to-adopt legal policy clause
  derivedInsight: string;     // Bank examiner defense rationale & fine avoidance argument
  responsibleRole: string;    // CCO, MLRO, Head of Lending, CTO
  statutoryRemediationTimelineDays: number;
  deterministicPenalty: {
    baseFineNaira: number;
    dailyFineNaira: number;
    carriesCriminalLiability: boolean;
    carriesLicenseSuspensionRisk: boolean;
    statutoryCitation: string;
  };
}
```

#### 5.3 Technical Deliverables for Step 5
- **File:** `src/modules/gap-matrix/types/schema.ts` (Updated to include `assessmentCriteriaResults` checklist evaluation).
- **File:** `src/shared/ai-engine/prompts/gapMatrixPrompts.ts` (Prompt enriched to evaluate each statutory assessment criterion against internal policy evidence).
- **File:** `src/modules/gap-matrix/services/gapSynthesisService.ts` (Integrated with multi-document statutory baseline querying and composite scoring).
- **File:** `src/modules/gap-matrix/ui/GapMatrixDashboard.tsx` (Updated finding modal showing the interactive assessment checklist alongside the 5-W remediation tabs).

---

## 4. Implementation Phasing & Sequence

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   IMPLEMENTATION EXECUTION PHASES                                │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  [PHASE A: DATA LAYER & CORPUS DECOMPOSITION]                                                    │
│  ├── 1. Enrich `src/shared/types/index.ts` with Domain, Assessment Criteria & Override types      │
│  ├── 2. Expand `src/shared/db/regulatoryCorpusData.ts` with authentic multi-tier data:          │
│  │      • 6 Domains (Fintech, AML, Credit, Data, Capital Markets, Crypto)                       │
│  │      • Full 7-element Decomposed Obligations with Assessment Criteria & Penalty Schedules     │
│  └── 3. Implement Multi-Source Registry (`src/modules/radar/services/sourceRegistry.ts`)         │
│                                                                                                  │
│  [PHASE B: HORIZON SCANNING & REAL-TIME ALERTS]                                                  │
│  ├── 1. Implement `/api/radar/sync` route for on-demand source scanning and ingestion            │
│  ├── 2. Enhance `RadarCockpit.tsx` with "Scan Sources Now" action, live pulse, & dual-dates      │
│  └── 3. Update `RadarFeedCard.tsx` with Source Badges, Jurisdiction flags, and Zero-Day velocity │
│                                                                                                  │
│  [PHASE C: REGULATORY CONTROL ROOM & DOMAIN LIBRARY]                                            │
│  ├── 1. Redesign `src/app/library/page.tsx` with Domain Overview Cards and Hierarchy Accordion    │
│  ├── 2. Update `/api/library` routes to support multi-tier domain filtering                      │
│  └── 3. Build Clause Inspection slide-over with Decomposed Obligation Register                   │
│                                                                                                  │
│  [PHASE D: OBLIGATION REGISTER & 5-W GAP MATRIX INTEGRATION]                                     │
│  ├── 1. Build `ObligationRegisterCard.tsx` with assessment checklists and user override inputs   │
│  ├── 2. Update `gapSynthesisService.ts` to output criteria-level compliance evaluations          │
│  └── 3. Verify cross-pillar cascades into Marketing Shield and Executive Cockpit                 │
│                                                                                                  │
│  [PHASE E: QUALITY ASSURANCE & VERIFICATION]                                                     │
│  ├── 1. Execute Vitest test suites (`npm run test`) across all updated services                  │
│  ├── 2. Verify Next.js build compilation (`npm run build`)                                       │
│  └── 3. Validate zero mock data leakage and zero hallucinated penalties                          │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Definition of Done (DoD) & Acceptance Criteria

1. **Multi-Source Ingestion:**
   - Platform must support at least 15 verified regulatory and intelligence sources across Nigeria, Ghana, Kenya, and Pan-African corridors.
   - Sources must include apex regulators, Tier-1 law firm advisory portals, and verified fintech media.
2. **Horizon Scanning:**
   - Real-time "Scan Sources Now" button functional with live ingestion status.
   - Alert cards display official Publication Date vs. Cogent Ingestion Date with Zero-Day detection delta.
3. **Master Regulatory Library:**
   - Navigable by 6 defined Regulatory Domains with real instrument counts and obligation tallies.
   - 4-Tier Document Hierarchy (Legislation, Regulations, Circulars, Standards).
4. **Decomposed Obligations:**
   - Every obligation in the library and gap matrix must display: Verbatim Rule, Executive Summary, Assessment Criteria Checklist, Deterministic Penalty Schedule, Target Role, and Timeline.
   - Compliance users can toggle assessment criteria and add internal verification notes.
5. **5-W Gap Matrix:**
   - Internal policies can be benchmarked against cross-document regulatory baselines.
   - Findings provide specific, legally hardened draft replacement clauses ready for Board Risk Committee adoption.
   - Zero currency/fine hallucinations (ADR-004 compliance).
