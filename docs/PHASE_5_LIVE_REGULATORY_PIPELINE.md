# Phase 5: Production Live Regulatory Pipeline & Data Integrity Specification

**System:** Cogent RegTech Nigeria (`https://stem-cogent.com`)  
**Architecture Model:** The Zango AI Connected Compliance Paradigm  
**Target Phase:** Phase 5 — Regulatory Compliance, Live Ingestion & Honest Telemetry  
**Execution Standard:** Zero Mocking, Real Database Ingestion, Real AI Embeddings, Live Verification  

---

## 1. Architectural Blueprint: The 4 Core Pillars of Phase 5

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 5 PRODUCTION ARCHITECTURE (ZANGO PARADIGM)                      │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│  [1] INGESTION PIPELINE (Live Regulatory Adapters & Scrapers)                                   │
│      ├── CBN Adapter: HTML parser + PDF fetcher for cbn.gov.ng/documents/circulars.asp          │
│      ├── SEC Adapter: WordPress REST / HTML scraper for sec.gov.ng circulars & VASP directives  │
│      ├── NDPC / ARCON / FCCPC Adapters: Statutory notices & advertising code releases           │
│      ├── SHA-256 Checksum Engine: Deduplicates existing items (HTTP 409 / skip)                 │
│      └── Vector Embeddings: Gemini text-embedding-004 generated for semantic search             │
│                                                                                                 │
│  [2] TENANT CONTEXT & APPLICABILITY (Relational Matching)                                       │
│      ├── Tenant Profile: Active licenses (tenant_licenses) & rails (tenant_payment_rails)       │
│      ├── Deterministic Filter: Matches targetedLicenseTypes against tenant profile              │
│      ├── Plain-English Rationale: Explains WHY a circular impacts the tenant or is filtered     │
│      └── ExCo Brief Synthesis: 4-way briefs (CCO, CFO, CTO, CEO/CRO) stored in DB               │
│                                                                                                 │
│  [3] THE CONNECTED COMPLIANCE CHAIN (Downstream Impact)                                         │
│      └── Circular ➔ Statutory Obligations ➔ Internal Policies (Gap Matrix)                     │
│                   ➔ Active Marketing Ad Claims (Drift Alert) ➔ Audit Ledger (SHA-256)           │
│                                                                                                 │
│  [4] ZERO MOCKING & HONEST ZERO-STATE TELEMETRY                                                 │
│      ├── Strip PRESET_CIRCULARS mock array from RadarCockpit.tsx                                │
│      ├── Strip hardcoded ₦86.5M and 88% fallbacks from executiveOverviewService.ts              │
│      └── Real database aggregations; honest zero metrics for new tenants                        │
│                                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Itemized Implementation Roadmap

### Step 5.1: Authentic Nigerian Regulatory Corpus Seeder
- **Script:** `scripts/seedRadarCirculars.ts`
- **Tables Populated:** `radar_circulars`, `circular_supersession_links`, `regulatory_document_versions`
- **Authentic Circulars Seeded:**
  1. **CBN Contactless Payments Directive 2026** (`PSM/DIR/CON/CWS/08/014`)
  2. **CBN Electronic Payments & VAS Framework** (`BPS/DIR/GEN/CIR/05/011`)
  3. **CBN Risk-Based Cybersecurity Framework** (`BSD/DIR/GEN/CIR/11/023`)
  4. **SEC Virtual Assets Service Providers (VASP) Directive 2026** (`SEC/CIR/VASP/2026/009`)
  5. **SEC Robo-Advisory & Automated WealthTech Rules** (`SEC/ISA/2024/002`)
  6. **NDPC Statutory Guidance on Financial Data Transfers 2024** (`NDPC/GDPR/CIR/2024/001`)
  7. **ARCON Advertising Code & FinTech Promotion Directive** (`ARCON/VET/DIR/2023/004`)
  8. **FCCPC Digital Lending Directives** (`FCCPC/DLR/2022/001`)

---

### Step 5.2: Live Feed Ingestion Adapter Layer
- **Service:** `src/modules/radar/services/liveFeedCollector.ts`
- **Endpoints & Jobs:**
  - `POST /api/radar/sync`: Interactive on-demand synchronization.
  - Scheduled Inngest Cron: `radarDailySyncCron` in `src/modules/radar/inngest/circularIngestionHandler.ts`.
- **Deduplication Safeguard:** SHA-256 document hashing ensures zero duplicates.

---

### Step 5.3: Tenant License-Aware Live Querying
- **API Endpoint:** `GET /api/radar/circulars/route.ts`
  - Retrieves authenticated tenant ID and active licenses and rails.
  - Evaluates applicability dynamically using `ApplicabilityEngine.evaluatePure()`.
  - Attaches calculated statutory countdowns, urgency tiers, and 4-way executive briefs.
- **UI Component:** `src/modules/radar/ui/RadarCockpit.tsx`
  - Remove the 400-line `PRESET_CIRCULARS` mock array.
  - Initial state queries `/api/radar/circulars` live.
  - Add **[Sync Live Feeds]** interactive button with real-time feedback.
  - Render honest empty states when no circulars match a filter.

---

### Step 5.4: Elimination of Hardcoded Fallbacks in Executive Services
- **Service:** `src/modules/executive/services/executiveOverviewService.ts`
  - Replace hardcoded baseline fallbacks (₦86.5M, 18 scans) with honest zeros and real database aggregations.
- **Component:** `src/modules/executive/ui/ExecutiveDashboard.tsx`
  - Remove `totalFinesAvoidedNaira ?? 86500000` and `compositeHealthScore ?? 88`.
  - Display honest zero-state or real metrics.
