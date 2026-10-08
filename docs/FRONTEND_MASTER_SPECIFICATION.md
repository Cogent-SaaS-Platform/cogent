# Cogent Frontend Architecture & UI/UX Design System Specification

> **CRITICAL ARCHITECTURAL DIRECTIVE:**  
> **The Zango video is strictly an INTERACTION REFERENCE (spatial continuity, progressive disclosure, persistent shell, contextual inspectors over dimmed tables, and dual-pane statutory evidence viewers).**  
> **All ACTUAL visual design, UI components, typography, styling, color tokens (#2A4BFF, #F5F6FA, #0B0F1A, #DDE3EE), and RegTech domain features are 100% proprietary to Cogent.** Do not copy third-party brand assets or styling; use the interaction mechanics to power Cogent's authentic, premium design language.

---

## 1. Executive Summary & Design System Foundations

This specification defines the complete UI/UX and frontend engineering overhaul for **Cogent**, an enterprise regulatory intelligence and compliance automation platform for the Nigerian financial sector (CBN, SEC, ARCON, NDPC, FCCPC, NFIU, NDIC).

### Core Aesthetic Tokens
* **Brand Primary**: `#2A4BFF` (Electric Cobalt — decisive action, active focus)
* **Canvas Background**: `#F5F6FA` (Soft alabaster enterprise workspace)
* **High-Contrast Text**: `#0B0F1A` (Obsidian dark slate)
* **Muted / Secondary Text**: `#4B5565` (Refined neutral slate)
* **Hairline Border & Dividers**: `#DDE3EE` (Subtle boundary delineation)
* **Elevated Surfaces**: `#FFFFFF` (Pure white cards and floating drawers)
* **Semantic Status Scale**:
  * **Healthy / Exemplary**: Emerald `#10B981` (Badge: `#ECFDF5`, Border: `#A7F3D0`, Text: `#065F46`)
  * **Watch / Needs Review**: Amber `#F59E0B` (Badge: `#FFFBEB`, Border: `#FDE68A`, Text: `#92400E`)
  * **Critical / Non-Compliant**: Crimson `#EF4444` (Badge: `#FEF2F2`, Border: `#FECACA`, Text: `#991B1B`)

### Visual References & Benchmark Mapping
* **Primary Interaction Engine**: `Zango AI platform overview(720P_HD).mp4` (Persistent shell, progressive disclosure, 6-level interaction depth, dual-pane statutory evidence split).
* **Data Density & Inspector Styling**: `uio.mp4` (High-density tabular records, floating rounded side-sheet with `< 1 / N >` pagination, 4-metric summary strip, accordion sections).
* **Onboarding Wizard**: `onb.webp` (5-step progress spine, high-converting focused forms).
* **Administrative Settings**: `settingg.webp` (Horizontal segmented navigation, card details, tabular billing history).
* **Iconography Language**: `icon.webp` (Crisp geometric outline-to-solid dual states).

---

## 2. The 6-Level Interaction Architecture

```
LEVEL 1 — PRODUCT AREA ROUTE (/overview, /insight, /marketing, /gap, /settings)
  │
  ├── LEVEL 2 — MAJOR ENTITY WORKSPACE (/insight/circulars/[id], /gap/policies/[id])
  │     │
  │     ├── LEVEL 3 — LOCAL WORKSPACE TABS (?tab=obligations, ?tab=lineage, ?tab=audit)
  │     │     │
  │     │     └── LEVEL 4 — CONTEXTUAL DETAIL INSPECTOR (?inspect=obl-104)
  │     │           │
  │     │           └── LEVEL 5 — DUAL-PANE STATUTORY REFERENCE (?ref=bofia-s57)
  │
  └── LEVEL 6 — FOCUSED TASK OVERLAYS (Ingest Circular, Pre-Vet Ad Copy, Export Dossier)
```

### URL Synchronization Contract
* **Level 1 & 2**: Route navigation paths (`/insight`, `/insight/cbn-bsd-01-2026`, `/gap`).
* **Level 3**: Shallow query params (`?tab=obligations`).
* **Level 4**: Inspector param (`?inspect=obl-104`). Maintains underlying table scroll and selection.
* **Level 5**: Evidence reference param (`?ref=bofia-s57`). Opens split pane alongside inspector.
* **Browser Back Handling**: 
  1. First Back click closes Level 5 (restores standalone Level 4).
  2. Second Back click closes Level 4 (restores untouched Level 1/2/3 table view).

---

## 3. Layout Structure & App Shell (Layer 0)

### 3.1 Compact Icon Rail (64px) & Expandable Sidebar (240px)
* **Default**: 64px width, persistent left rail.
* **Branding**: Monogram logo badge at top (`#2A4BFF` with white "C").
* **Navigation Items (Updated Naming)**:
  1. **Overview** (`/overview` — Executive Command Center)
  2. **Insight** (`/insight` — Horizon Scanning, Circulars & Intelligence, formerly Radar)
  3. **Marketing Shield** (`/marketing` — Ad Pre-Vetting, Claims Ledger, Drift)
  4. **Gap** (`/gap` — Policy Concordance, 5-W Gap Matrix, Forensic Dossiers)
  5. **Regulatory Library** (`/library` — Master Corpus of Acts & Guidelines)
  6. **Audit Ledger** (`/audit` — Immutable CAMA 2020 SHA-256 Logs)
  7. **Settings** (`/settings` — Profile, Team, Licenses, Billing, Security)
* **State Behavior**: Hover shows clean tooltip; active item receives `#EEF2FF` pill background and filled `#2A4BFF` icon (`icon.webp` style).
* **Manual Toggle**: Bottom collapse/expand chevron button persisted in `localStorage`.
* **Tenant & Profile**: Organization switcher and Clerk user avatar pinned at bottom.

### 3.2 Global Command Header
* **Breadcrumb Trail**: `Workspace > Insight > CBN Circulars > CBN/BSD/DIR/01/2026`.
* **Instant Command Palette (`Cmd+K`)**: Quick jump across circulars, marketing claims, and policies.
* **Notification Inspector Trigger**: Bell icon with unread badge opening the AI Smart Insight drawer (`notic.webp`).

---

## 4. Pillar-by-Pillar Functional Architecture

### Pillar 1: Insight — Horizon Scanning & Intelligence (`/insight`)
*(Reference: Zango AI 0:30–2:10)*
* **Level 1 (Horizon Scanning Workspace)**:
  * Dense table of circulars with columns: Regulator (CBN, SEC, etc.), Reference Code, Title, Issuance Date, Statutory Deadline, Priority Badge, Status.
  * Filters: Regulator, Priority, Department Impact, Deadline Window.
  * Top Actions: `Ingest Circular` (Level 6 task drawer), `Export Feed`.
* **Level 2 (Circular Dossier Workspace)**:
  * Persistent breadcrumb, Title, Issuing body, Publication/Effective dates.
  * 4-Metric Strip: Days Remaining, Potential Fine Exposure (₦), Applicability Verdict, Department Impact Count.
* **Level 3 (Local Tabs)**:
  * `Overview & AI Synthesis`
  * `Statutory Obligations`
  * `Multi-Role Impact Briefs (CCO, COO, CFO, Product/Eng)`
  * `Circular Lineage & Supersession Tree`
* **Level 4 (Obligation Inspector)**:
  * Floating 480px side-sheet with `< 1 / N >` pagination.
  * Obligation text, strictness type, penalty exposure in Naira, compliance checklist.
* **Level 5 (Gazette Reference Pane)**:
  * 440px pane displaying the original Nigerian Gazette / Circular PDF text with highlighted citation clause.

---

### Pillar 2: Marketing Pre-Vetting Shield (`/marketing`)
*(Reference: Zango AI 4:10–4:41 & uio.mp4)*
* **Level 1 (Ad Campaigns & Scan Feed)**:
  * Table of scanned promotional assets: Campaign Name, Channel (SMS, Social, Push, Billboard), Product Category, Scan Verdict (`NO_ISSUE`, `REVIEW_RECOMMENDED`, `ISSUE_DETECTED`, `BLOCKING_ISSUE`), ARCON Status, Vetted Date.
  * Top Action: `New Ad Scan` (Level 6 task drawer).
* **Level 3 (Local Tabs)**:
  * `Scanned Assets Feed`
  * `Tenant Claims Ledger (Verified Financial Product Returns)`
  * `Post-Publish Drift Watcher (Live Web & Social Assets)`
* **Level 4 (Finding & Rule Inspector)**:
  * Floating side-sheet with `< 1 / N >` pagination.
  * Flagged excerpt, deterministic rule code violated, statutory penalty in Naira, suggested AI compliant rewrite.
* **Level 5 (Regulatory Source Reference Pane)**:
  * Side-by-side view of the governing ARCON Act 2022 or FCCPA 2018 clause.

---

### Pillar 3: Gap — Policy Concordance & Gap Matrix (`/gap`)
*(Reference: Zango AI 1:56–2:40)*
* **Level 1 (Policy Governance & Audit Feed)**:
  * Operational policies table: Policy Title, Governing Statutory Framework, Concordance %, Critical Gaps Count, Fine Avoidance Total (₦), Last Evaluated.
  * Top Actions: `Upload Internal Policy`, `Run Full Concordance Audit`.
* **Level 2 (Policy Clause Matrix Workspace)**:
  * Clause-by-clause evaluation table (Who, What, When, Where, Why).
* **Level 4 (5-W Decision Drawer)**:
  * Gap analysis, board-adopted replacement wording, responsible department, fine exposure.
* **Level 5 (Benchmark Statutory Clause Reference)**:
  * Exact BOFIA 2020 or NDPA 2023 section displayed side-by-side.
* **Level 6 (Forensic Audit Defense Dossier)**:
  * One-click export modal producing the CAMA 2020 / BOFIA certified defense report.

---

### Pillar 4: Overview — Executive Command Center (`/overview`)
*(Reference: Zango AI 1:00 & uio.mp4 summary strip)*
* **Composite Health Grade**: Institutional attestation card (e.g., `94% - EXEMPLARY`).
* **Aggregate Sanctions Avoided**: Total statutory fines prevented across all Nigerian regulators (₦ in Millions).
* **3-Pillar Cross-Pillar Scorecard**: Direct health status, active counts, and drill-down links (`Insight`, `Marketing Shield`, `Gap`).
* **7-Regulator Enforcement Radar**: CBN, SEC, NDPC, NFIU, ARCON, FCCPC, NDIC compliance rates.
* **Urgent Regulatory Gates**: Countdown cards with statutory deadlines.
* **Export Action**: Direct export of the Executive Attestation Dossier (`/api/executive/export`).

---

### Pillar 5: Tenant Onboarding (`/onboarding`) & Settings (`/settings`)
*(Reference: onb.webp & settingg.webp)*
* **Onboarding Flow (`onb.webp`)**:
  * **Step 1: Institution Details**:
    * Legal Entity Name *
    * **RC Number (Optional)** — Not required for sandboxes, international entities, or pre-incorporation teams.
    * Institution Size *
    * Company Website / Primary Domain
  * **Step 2: Role & Department**:
    * Department: `EXECUTIVE_LEADERSHIP` | `COMPLIANCE_LEGAL` | `GROWTH_MARKETING` | `PRODUCT_MANAGEMENT` | `ENGINEERING_TECH` | `OPERATIONS` | `TREASURY_FINANCE` | **`OTHER` (Custom Write-in)**
    * Institutional Title *
  * **Step 3: Regulatory Profile & Licenses**:
    * Primary Regulators (CBN, SEC, NDPC, ARCON, FCCPC)
    * License Type(s) (Commercial Bank, PSB, Microfinance Bank, Digital Lender, etc.)
    * License Number (Optional)
  * **Step 4: Payment Rails & Operational Scope**:
    * Rails connected (NIBSS NIP, Interswitch, Paystack, Flutterwave)
    * Product categories operated
  * **Step 5: Invite Compliance Team**:
    * Multi-seat invite inputs with role assignments (`OWNER`, `ADMIN`, `MEMBER`, `OTHER`).
* **Settings Hub (`settingg.webp`)**:
  * Horizontal Tabs: `Profile` | `Institution & Licenses` (RC Number optional) | `Team & Access` (custom roles supported) | `Billings` | `Audit & Security` | `Notifications`.

---

## 5. Implementation Roadmap: Step-by-Step Task Breakdown

> **MANDATORY INSTRUCTION FOR EXECUTING TASKS:**  
> Before starting ANY task below, the executing agent must review `Zango AI platform overview(720P_HD).mp4` to ensure adherence to spatial continuity, progressive drill-down, and restraint in layout transitions.

| Task ID | Component / Milestone | Primary Objective & Zango Reference | Backend API Wiring |
| :--- | :--- | :--- | :--- |
| **TASK-01** | **Design Tokens & Theme Foundation** | Define CSS custom properties for `#2A4BFF`, `#F5F6FA`, `#0B0F1A`, `#DDE3EE`. Purge old dark styles in `globals.css`. | N/A |
| **TASK-02** | **App Shell & 64px Icon Rail** | Build `AppShell`, collapsible 64px/240px navigation rail with updated names (`Overview`, `Insight`, `Marketing Shield`, `Gap`, `Library`, `Audit`, `Settings`) and `icon.webp` dual-state icons. | Clerk Auth & Supabase Org Context |
| **TASK-03** | **Zango Multi-Pane Engine** | Build reusable `DetailInspector` (Layer 4) with `< 1 / N >` pagination, metric strip, accordions, and `ReferencePane` (Layer 5) for side-by-side evidence inspection. *(Zango 2:10)* | URL query sync (`useInspectorStore`) |
| **TASK-04** | **Overview Command Center (`/overview`)** | Build executive cockpit, aggregate Naira fine avoidance counter, 7-regulator breakdown, urgent countdowns, and cross-pillar links. *(Zango 1:00)* | `/api/executive/overview` & `/api/executive/export` |
| **TASK-05** | **Insight Intelligence Hub (`/insight`)** | Build dense circulars table, circular dossier workspace, obligation inspector, and gazette split-pane viewer. *(Zango 0:30, 1:30, 1:56)* | `/api/radar/circulars`, `/brief`, `/evaluate`, `/lineage`, `/cascade` |
| **TASK-06** | **Marketing Shield (`/marketing`)** | Build campaign table, claims ledger tab, drift watcher tab, finding inspector, and compliant rewrite split-view. *(Zango 4:10, 4:41)* | `/api/marketing/scan`, `/claims-ledger`, `/drift`, `/signoff`, `/dossier` |
| **TASK-07** | **Gap Matrix Hub (`/gap`)** | Build policy concordance table, clause-by-clause 5-W drawer, benchmark reference viewer, and defense exporter. *(Zango 1:56, 2:40)* | `/api/gap-matrix/policies`, `/benchmarks`, `/evaluate`, `/dossier` |
| **TASK-08** | **Onboarding Wizard (`/onboarding`)** | Build 5-step institutional setup wizard modeled after `onb.webp`, with **optional RC Number** and **"Other" role option**. | Supabase `organizations`, `licenses`, `rails` tables |
| **TASK-09** | **Settings & Admin (`/settings`)** | Build settings layout modeled after `settingg.webp`, with team RBAC, license management, and billing history. | Clerk Organizations & Supabase RLS |
| **TASK-10** | **Auth Styling & Polish** | Re-theme Clerk Sign-In & Sign-Up pages to match `#2A4BFF` and clean alabaster aesthetic. | Clerk Next.js Provider |
