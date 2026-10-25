# Cogent Enterprise RegTech: Zango Redesign Handover & Continuity Guide

> **Note for Future Agent Sessions**: Read this file first when resuming work or beginning a new chat. It documents the platform vision, modules covered, backend connections, architectural patterns, strict design system rules, and the exact roadmap for upcoming pillars.

---

## 1. Project Aim & Vision

Cogent is an enterprise sovereign RegTech & supervisory compliance platform engineered for General Counsels, Chief Compliance Officers (CCOs), Chief Risk Officers (CROs), and Bank Examiners across Pan-African financial corridors (Nigeria, Ghana, Kenya, South Africa, and WAEMU).

### Core Objectives
1. **Zango RegTech Standard**: Transform Cogent's interface into the high-density, authoritative visual standard demonstrated by **Zango RegTech**, **Stripe**, **Linear**, **Vanta**, and **Palantir Foundry**.
2. **End-to-End Functional Connectivity (NO Superficial UI)**: Every single screen, table row, filter, search input, star button, review status dropdown, drawer, and document viewer MUST be functionally integrated with real backend APIs and database tables. Fake mock dummy data is strictly forbidden.
3. **AI as Invisible Infrastructure**: Zero AI marketing sparkles or mentions of LLM models. AI is treated as silent, deterministic compliance infrastructure executing statutory concordance, clause decomposition, and rule verification.

---

## 2. Strict Design System Rules (Enforced from `AGENTS.md`)

When designing and writing code, you **MUST** strictly adhere to these rules without exception:

1. **Metric Cards & Counters**:
   - **NO decorative icons** inside metric cards.
   - **NO traffic light numbers**: Numbers must NEVER be colored green, red, amber, or blue. ALL numbers must be monochrome: `text-slate-900 font-mono text-2xl font-bold tracking-tight`.
   - **Labels**: Clean uppercase tracking: `text-[11px] font-semibold text-slate-500 uppercase tracking-wider`.
   - **Layout**: Hairline dividers in a single unified container: `bg-white border border-slate-200 rounded-xl grid divide-x divide-slate-200`.

2. **Identifiers, Citations & Codes**:
   - **NO pills or tinted boxes**: Circular references (`CBN/BSD/DIR/...`), clause codes (`BOFIA Section 3.2`), and hashes must NEVER be enclosed in rounded pill containers (`px-2 py-0.5 rounded-full bg-blue-50`).
   - Format: Plain muted monospace text: `font-mono text-xs text-slate-600`.

3. **Status Indicators**:
   - **NO heavy filled pills**: Do NOT use thick neon badges for routine statuses (`ADEQUATELY_MET`, `PARTIALLY_MET`, `PENDING_REVIEW`).
   - **6px Status Dot**: Render status as a 6px dot next to slate text:
     ```tsx
     <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
       Adequately Met
     </span>
     ```
   - **Blocking Errors Only**: Reserve soft tinted borders strictly for blocking audit failures: `bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-xs font-medium`.

4. **Typography & Departmental Styling**:
   - **NO rainbow roles**: All role headers are uniform: `text-[10px] font-bold uppercase tracking-wider text-slate-700`.
   - Primary buttons: `bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-medium text-xs shadow-xs`. Secondary buttons: `bg-white text-slate-700 border border-slate-200 hover:bg-slate-50`.

---

## 3. Covered Modules & Completed Work

### Module 1: Global Navigation & Header System
- **Files Modified**: `src/shared/ui/GlobalHeader.tsx`, `src/shared/ui/NavigationRail.tsx`
- **Accomplishments**:
  - Replaced legacy breadcrumbs with route-aware authoritative badges:
    - `/overview` -> `[Shield] Executive Command Room`
    - `/radar` -> `[Radio] Regulatory Radar`
    - `/library` -> `[BookOpen] Regulation Library`
  - Streamlined the global navigation rail to eliminate visual noise and match the Zango layout.

### Module 2: Executive Overview Dashboard (`/overview`)
- **Files Created/Modified**: `src/modules/executive/ui/ExecutiveDashboard.tsx`, `RegulatoryPressureStrip.tsx`, `UpcomingDeadlinesTimeline.tsx`
- **Accomplishments**:
  - Replaced floating colorful metric cards with a unified, high-density regulatory pressure container with 1px hairline dividers.
  - Monochrome font-mono counters for active directives, compliance countdowns, and potential statutory penalties.
  - Integrated with live Supabase circular queries and deadline calculators.

### Module 3: Horizon Scanning & Regulatory Radar (`/radar`)
- **Files Created/Modified**: `src/modules/radar/ui/RadarCockpit.tsx`, `HorizonAlertFeed.tsx`, `HorizonAlertDetail.tsx`, `clauseSegmentationEngine.ts`, `deterministicMetadataExtractor.ts`
- **Accomplishments**:
  - Eliminated legacy unstyled clutter (old Table/Dossier tabs, redundant apex filters).
  - Built Zango-style high-density directive feed with live search, regulator tabs, urgency tags, and star bookmarks.
  - Rebuilt the Circular Detail view to deliver substantive, multi-paragraph **Executive Summaries** and **Multi-Role Impact Syntheses** (tailored across CCO, Legal, Tech, and Risk) rather than 1-line generic summaries.
  - Connected to `/api/radar/circulars` and live RSS / PDF ingestion pipelines.

### Module 4: Centralised Regulation Library & Statutory Obligations Register (`/library`)
- **Files Created/Modified**:
  - `src/modules/regulatory/types.ts`: Presentation and view model interfaces.
  - `src/modules/regulatory/ui/RegulationLibraryHub.tsx`: Discovery Hub with hero search, domains matrix, jurisdiction selectors, and suggested regulations carousel.
  - `src/modules/regulatory/ui/RegulatoryInstrumentsTable.tsx`: Zango directory table with `Title`, `Jurisdiction`, `Type`, `Domain`, `Entry into Force Date`, `Star`, `···` menu, and shimmer skeleton loading wave.
  - `src/modules/regulatory/ui/InstrumentDetailPage.tsx`: Detail page with breadcrumb, star, `↗ View Doc`, regulator badges, `Overview`, `Scope of Applicability`, numbered `Key Requirement Areas`, and `Actions & Ownership` card.
  - `src/modules/regulatory/ui/ObligationsRegisterView.tsx`: Two-column split layout with left statutory sections tree (TOC) and right obligations master table featuring 6px status dots, assignee avatars, and relevance switches.
  - `src/modules/regulatory/ui/ObligationDetailDrawer.tsx`: Slide-over drawer with verbatim statutory text quote, parent instrument link, collapsible **Assessment Criteria checklist** (interactive checkboxes with live API sync), collapsible **Risk Profile & Penalty Schedule**, and SOP citation inputs.
  - `src/modules/regulatory/ui/SideBySideDocViewer.tsx`: Split-screen reader with structured extraction on the left and canonical Gazette preview on the right.
  - `src/app/library/page.tsx`: Clean orchestrator coordinating the 4 view modes.
  - `src/app/api/library/route.ts`: Database query joining `regulatory_instruments`, `regulatory_bodies`, and versions with seed fallbacks.
  - `src/app/api/library/clauses/route.ts`: Clause and obligation segmentation endpoint.
  - `src/app/api/library/obligations/override/route.ts`: Persistent compliance override persistence endpoint.
  - `tests/unit/regulatory-library-zango.test.ts`: 4/4 passing unit tests verifying view models, matrices, and status dots.

---

## 4. Current State of the Codebase

- **Build & Types**: `npm run typecheck` (`tsc --noEmit`) passes cleanly with **0 errors**.
- **Automated Tests**: Unit test suite passes across all core modules.
- **Server State**: Next.js runs cleanly on port 3000 with live SSR and client hydration.
- **Tenant Context**: `src/shared/auth/tenantContext.ts` updated with `allowDevFallback: true` in non-production environments to allow rapid local development while enforcing strict Clerk RLS security in production.

---

## 5. Next Steps for Incoming Agent (Where to Continue)

The next major pillar in the redesign plan is **Pillar 3: The 5W Gap Matrix & Statutory Benchmark Pairing Engine** (`/gap-matrix`):

1. **Audit & Plan**:
   - Inspect existing `/gap-matrix` page and related components in `src/modules/gap-matrix/`.
   - Remove legacy clutter, unstyled tabs, and colorful badges to match Zango's Benchmark Pairing and Audit Defense layout.
2. **5W Architecture Implementation**:
   - **Who**: Regulated institutions, target licenses, and executive roles.
   - **What**: Prescriptive statutory obligations and decomposed clauses.
   - **When**: Statutory compliance countdowns and filing deadlines.
   - **Where**: Jurisdictions, regulatory boundaries, and cross-border payment corridors.
   - **Why**: Statutory penalty schedules, daily fine liabilities, and license suspension risks.
3. **Interactive Components**:
   - Statutory Benchmark Selector (BOFIA 2020, NDPA 2023, CBN Consumer Protection Framework, ARCON Advertising Code).
   - Institutional Policy Uploader & Clause Alignment Grid with side-by-side gap readout.
   - Remediation Workflow Drawer with pre-cleared policy templates and action checklists.
4. **Backend Connectivity**:
   - Integrate with `/api/gap-matrix/pair`, `/api/gap-matrix/benchmark`, and tenant policy storage in Supabase / Cloudflare R2.
   - Zero hardcoded placeholder data.
