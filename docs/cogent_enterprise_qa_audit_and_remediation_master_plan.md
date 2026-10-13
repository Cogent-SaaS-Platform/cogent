# COGENT Enterprise QA Audit & Production Remediation Master Plan

**Role:** Lead Quality Assurance (QA) Engineer, Functional Software Tester, & Principal Systems Architect  
**Classification:** Complete Functional Audit & Remediation Specification (No Code Written — Pre-Implementation Stage)  
**Target Platform:** `https://stem-cogent.com` (Cogent RegTech Nigeria)  
**Audit Artifacts Inspected:**  
- `Cture.JPG`, `er (1).png` – `er (4).png`  
- `re,ao.JPG`, `remoa.JPG`, `remove_1.JPG`, `remove_3.JPG`, `removea.JPG`, `removead.JPG`  
- `err.JPG`, `erra.JPG`, `error_1.JPG`, `errora.JPG`, `rad.JPG`  
- `public/icon.png`, `src/app/favicon.ico`, `src/app/layout.tsx`, `src/proxy.ts`, `src/app/page.tsx`, and all module source files.

---

## 1. Executive QA Audit Summary

Having conducted an end-to-end functional and visual QA audit across every route, component, and database interface, this report documents the **complete list of defects, architectural mismatches, and visual noise** preventing Cogent from operating as an enterprise-grade, value-delivering production RegTech SaaS.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  THE CORE DIAGNOSTIC ASSESSMENT                                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Cogent has high visual polish, but is currently wired as a static prototype / demo museum.     │
│ 2. Public visitors bypass authentication, landing directly into a mock dashboard.              │
│ 3. Favicon displays the Vercel logo instead of Cogent's royal blue emblem.                      │
│ 4. Navigation rail defaults to collapsed, lacks hover-expansion, and conceals platform features.│
│ 5. Internal developer jargon ("Pillar 1, 2, 3, 4, 6") is stamped across customer-facing UI.      │
│ 6. Duplicate sub-navigation bars and decorative badges create heavy visual noise.                │
│ 7. Marketing Shield presents a completed static case study instead of an interactive studio.     │
│ 8. Data is hardcoded (₦86.5M avoided, 88% score) instead of pulling real pre-seeded regulations. │
│ 9. Critical buttons in Regulatory Library and Audit Ledger have empty onClick handlers.          │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Exhaustive Itemized Audit & Root-Cause Matrix

| ID | Issue / Symptom | Evidence Image | Code Location | Root Cause | Production Remediation Target |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **QA-01** | **Vercel icon displayed in browser tab and taskbar** | `remove_3.JPG` | `src/app/favicon.ico`, `src/app/layout.tsx` | Next.js serves the default boilerplate `favicon.ico`. `metadata.icons` is not defined in `layout.tsx`. Cogent's actual icon (`public/icon.png`) is not linked. | Replace `src/app/favicon.ico` with Cogent icon. Set `metadata.icons: { icon: '/icon.png', apple: '/icon.png' }`. |
| **QA-02** | **Navigation rail starts collapsed & lacks hover-expansion** | `errora.JPG` | `src/shared/ui/NavigationRail.tsx`, `src/shared/ui/AppShell.tsx` | `isRailExpanded` defaults to `false`. No `onMouseEnter` / `onMouseLeave` handlers exist on `<aside>`. Nav stays 64px unless manually clicked. | Default rail to **OPEN / EXPANDED** (`true`). If collapsed, add smooth hover-expansion (flyout peek) with optional pin/lock toggle. |
| **QA-03** | **Unauthenticated root route (`stem-cogent.com`) bypasses auth & landing** | `Cture.JPG`, `er (1).png` | `src/proxy.ts`, `src/app/page.tsx` | Edge gateway named `src/proxy.ts` (ignored by Next.js). Route `/` explicitly exempted in `isPublicRoute`. `src/app/page.tsx` directly renders `<ExecutiveDashboard>` inside `<AppShell>`. | Migrate `src/proxy.ts` to `src/middleware.ts`. Build a high-converting public **Landing Page** at `/` with [Sign In] and [Get Started] CTAs. Redirect authenticated users to `/overview`. |
| **QA-04** | **Internal "Pillar" developer jargon stamped across UI** | `error_1.JPG`, `err.JPG`, `removea.JPG`, `removead.JPG` | `ExecutiveDashboard.tsx`, `RadarCockpit.tsx`, `MarketingShieldDashboard.tsx`, `AuditLedgerPage.tsx` | Architectural spec tags (`Pillar 1`, `Pillar 2`, `Pillar 3`, `Pillar 4`, `PILLAR 6`) were hardcoded into UI badges and titles. | Completely strip all "Pillar X" labels. Use clean SaaS names: *Executive Overview*, *Regulatory Radar*, *Marketing Shield*, *Policy Gap Matrix*, *Regulatory Library*, *Audit Ledger*. |
| **QA-05** | **Redundant duplicate sub-navigation tab bar** | `removea.JPG`, `removead.JPG` | `RadarCockpit.tsx` (lines 405–420), `MarketingShieldDashboard.tsx` (lines 460–480) | Top section contains secondary tab pills (`Unified Executive | Insight | Marketing | Gap Matrix`) that duplicate the left sidebar rail. | Remove the redundant inner pill bar entirely. Let the primary Navigation Rail handle routing. |
| **QA-06** | **Cluttered decorative badges & noisy footer strips** | `rad.JPG`, `erra.JPG`, `removea.JPG` | `AppShell.tsx`, `GlobalHeader.tsx`, `SmartInsightDrawer.tsx` | `rad.JPG` shows fixed bottom footer (`Cogent AI — Nigerian Regulatory Moat Platform...`). `erra.JPG` shows meaningless `• CBN • SEC • NDPC Enclaves` pill. `removea.JPG` has regulator circle badge. | Excise the fixed bottom footer strip and decorative enclave pills. Clean up the header to maximize workspace height. |
| **QA-07** | **Marketing Shield loads static case study instead of input studio** | `er (3).png`, `re,ao.JPG` | `MarketingShieldDashboard.tsx` (lines 355–375) | Initial state defaults to `SCENARIO_A_VIEW_MODEL` ("QuickKash SMS Flash Campaign", ₦11.5M fine, Olumide Adebayo CCO signoff). Inspector and Briefing cards display before a scan is run. Latency box (`re,ao.JPG`) shows fake engine stats. | Default to an **active campaign input studio**: empty copy editor, channel selector, category selector, and [Pre-Vet Scan] button. Results cards (Inspector, Briefing, CCO Attestation) only slide in **after** a live scan completes. |
| **QA-08** | **Fabricated numbers & hardcoded baselines in Executive Cockpit** | `remove_1.JPG`, `err.JPG` | `executiveOverviewService.ts` (lines 44–65), `ExecutiveDashboard.tsx` (lines 181–183) | Hardcodes `₦86.5M Sanctions Prevented`, `88% Satisfactory`, `18/18 Pre-cleared`, `₦16.5M`, `₦25.0M`, `₦45.0M` into service fallbacks and JSX nullish coalescing. | Remove fake fallbacks. Zero-state shows honest tenant metrics (`0 Scans`, `₦0 Prevented`, `Concordance: Pending`). Active metrics compute strictly from live DB tables (`marketing_scans`, `policy_evaluations`). |
| **QA-09** | **Hardcoded Horizon Scanner (Regulatory Radar) directives** | `er (4).png`, `remoa.JPG` | `RadarCockpit.tsx` (lines 64–140) | Loads from in-memory array `PRESET_CIRCULARS`. Top strip (`remoa.JPG`: `Monitored: 7`, `Applicable: 4`, `₦450M+ Avoided`) is hardcoded. | Query live Supabase `regulatory_circulars` table pre-seeded with authentic Nigerian regulatory circulars (CBN, SEC, ARCON, NDPC, FCCPC). Filter dynamically by the tenant's actual registered licenses. |
| **QA-10** | **Non-functional buttons in Regulatory Library** | N/A | `src/app/library/page.tsx` (lines 183–186) | "Inspect Clauses" button has **no `onClick` handler**. Displays static 5-item array `STATUTORY_ITEMS`. | Query `regulatory_document_versions` and `regulatory_clauses` from Supabase. Wire "Inspect Clauses" to open an interactive clause reader modal/drawer. |
| **QA-11** | **Non-functional buttons & fake counts in Audit Ledger** | N/A | `src/app/audit/page.tsx` (lines 101–108) | Hardcodes `1,482 entries`, `42 Board Packs`, 5 static mock rows. "Verify Chain Integrity" and "Export Signed Ledger" buttons have **no `onClick` handlers**. | Query live rows from `audit_ledger_events`. Wire "Verify Chain Integrity" to perform real SHA-256 hash recalculation and display an interactive cryptographic verification report. |
| **QA-12** | **Notifications drawer duplication & static in-memory feed** | `er (2).png` | `SmartInsightDrawer.tsx` (lines 34–83) | Uses static `NOTIFICATIONS` array. "Mark all as read" only updates local component state and resets on reload. Fixed positioning causes vertical duplication in full-page browser captures. | Connect drawer to `/api/notifications` reading from `notifications` table. Persist read state to Supabase. Fix container stacking to prevent screenshot duplication. |

---

## 3. Product Architecture: The "Zango AI" Day One Value Model

To address the core requirement:
> *"We are not trying to go for nice UI, nice design and all that. No. We want to be actually connected to real data sources. Real data... the way Zango AI did their own... at day one they should see value."*

We establish a clear architectural separation between **Tenant Activity Data** and **Global Regulatory Corpus Data**:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   DAY ONE DATA ARCHITECTURE                                      │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   1. GLOBAL NIGERIAN REGULATORY CORPUS (Pre-Seeded & Dynamic in Supabase)                         │
│   ├── Central Bank of Nigeria (CBN): Contactless Guidelines 2026, Cybersecurity Framework, CPF  │
│   ├── ARCON: Advertising Regulatory Council of Nigeria Act 2022 & Advertising Code Art. 24       │
│   ├── SEC: Capital Market Operators Rules, ISA 2007, Digital Assets & Robo-Advisory Guidelines   │
│   ├── NDPC: Nigeria Data Protection Act (NDPA 2023) Statutory Safeguards & Retention Periods     │
│   ├── FCCPC: Digital Lending Regulations 2022 & Consumer Rights Directives                      │
│   └── NFIU: AML/CFT/CPF Regulations 2022 Compliance Directives                                   │
│   ==> Delivers immediate, tangible value on Day One. CCO can search, filter, and inspect clauses!│
│                                                                                                  │
│   2. TENANT ACTIVITY DATA (Honest Zero-State -> Live Scans -> Audit Ledger)                      │
│   ├── Ad Scans: Starts at 0. When user scans an ad, Gemini + Regex analyzes copy in real time.  │
│   ├── Exposure Prevented: Computes from actual detected violations (e.g. ARCON Art 24 = ₦5M).    │
│   ├── Policy Gap Evaluations: Populates when user uploads an internal PDF/DOCX policy.           │
│   └── Audit Ledger: Cryptographically seals every real scan and sign-off into SHA-256 events.    │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Component Workflow Re-Engineering

### 4.1. Marketing Shield: "Work Studio First, Live Results on Scan"
- **Initial View (Empty Canvas / Studio):**
  - **Header:** Title *"Marketing Shield: Regulatory Ad Pre-Vetting"*, subtitle *"Deterministic regex & Gemini 3.8 Flash compliance screening against ARCON, CBN & FCCPC standards."*
  - **Left / Center (Campaign Studio):**
    - Campaign Name (e.g., *"Easter Promo SMS Blast"*).
    - Channel Selector: SMS Blast, Social Media Post, Billboard / Outdoor, Digital Display, Email.
    - Product Category: Digital Nano-Loan, WealthTech / Investment, Remittance & FX, Payments.
    - Copy Input Box: Clean textarea with placeholder *"Type or paste campaign copy to pre-vet before broadcast..."*
    - **One-Click Quick Load Presets:** *"Try Sample Loan Ad"* and *"Try Sample Wealth Ad"* buttons that populate the text box on click so users can test the live engine instantly with one tap.
    - Prominent Primary CTA: **[Run Pre-Vet Scan]** (triggers `/api/marketing/scan`).
  - **Right / Bottom Cards (HIDDEN initially):**
    - `Regulatory Context Inspector`, `Executive Compliance Briefing`, and `Human Legal Governance & CCO Attestation` are **not displayed** until a scan has been run.
- **Post-Scan View (Live Results Reveal):**
  - After user clicks [Run Pre-Vet Scan], loading indicator displays during analysis (<1s).
  - Results animate into view:
    - **Verdict Banner:** Risk Score (0–100), Verdict (`BLOCKING_ISSUE` / `WARNING` / `CLEAN`), and Deterministic Fine Exposure (e.g., `₦5,000,000`).
    - **Findings List:** Highlighted violation excerpts with statutory citations (ARCON 2022 Art 24, CBN CPF Sec 4).
    - **Compliant Rewrite:** One-click copy of the AI-generated compliant rewrite.
    - **Regulatory Context Inspector:** Slides in showing applicable gazette sections.
    - **Executive Briefing & CCO Attestation Block:** Enables compliance officer to digitally sign or reject the campaign, saving the event to `audit_ledger_events`.

### 4.2. Navigation Rail: "Open by Default with Smooth Hover-Expansion"
- **Default State:** Rail opens in expanded mode (`w-60`), displaying full titles (*Overview*, *Insight*, *Marketing Shield*, *Gap*, *Regulatory Library*, *Audit Ledger*, *Settings*) and subtitles.
- **Collapse Toggle:** A chevron button allows the user to collapse to mini-rail (`w-16`).
- **Hover Expansion:** When collapsed, hovering the mouse over the rail smoothly expands it (`w-60` flyout peek) so the user can see all section names, collapsing back when the cursor leaves. A pin button allows locking it in either state.

### 4.3. Navigation Clean-up: "Zero Redundancy"
- Remove the secondary pill bar (`Unified Executive | Insight | Marketing | Gap Matrix`) from `RadarCockpit.tsx` and `MarketingShieldDashboard.tsx`.
- Remove the `• CBN • SEC • NDPC Enclaves` status pill from `GlobalHeader.tsx`.
- Remove the fixed bottom footer (`rad.JPG`: *"Cogent AI — Nigerian Regulatory Moat Platform..."*).
- Remove the developer latency box (`re,ao.JPG`) from standard views.

---

## 5. Sequential 6-Phase Remediation Roadmap

```
  Phase 1: Brand Assets & Navigation Rail
  ├── Replace favicon.ico with Cogent icon (QA-01)
  ├── Set metadata.icons in layout.tsx (QA-01)
  └── Update NavigationRail: Open by default, hover-expansion, pin toggle (QA-02)

  Phase 2: Auth Gate, Routing & Public Landing Page
  ├── Rename src/proxy.ts to src/middleware.ts with standard Next.js edge auth (QA-03)
  ├── Create high-converting Public Landing Page at src/app/page.tsx (QA-03)
  └── Move Executive Dashboard to dedicated /overview route (QA-03)

  Phase 3: Visual De-Cluttering & Terminology Standardization
  ├── Strip all "Pillar 1, 2, 3, 4, 6" labels from all pages and components (QA-04)
  ├── Remove duplicate inner navigation pill bars (QA-05)
  └── Excise fixed footer strips and meaningless enclave pills (QA-06)

  Phase 4: Marketing Shield Work Studio Re-Architecture
  ├── Refactor initial state to clean Campaign Input Studio (QA-07)
  ├── Add 1-click "Try Sample Ad" presets to test the live engine (QA-07)
  └── Gate Inspector, Briefing, and CCO Attestation cards to only appear on scan completion (QA-07)

  Phase 5: Day One Regulatory Corpus & Honest Tenant Telemetry
  ├── Seed Supabase with authentic Nigerian regulations and circulars (QA-09)
  ├── Connect Regulatory Radar to query live circulars filtered by tenant license (QA-09)
  └── Remove fake fallback numbers (₦86.5M) from executiveOverviewService (QA-08)

  Phase 6: Regulatory Library, Audit Ledger & Notification Persistence
  ├── Connect Regulatory Library to Supabase clauses with interactive reader (QA-10)
  ├── Connect Audit Ledger to live audit_ledger_events with SHA-256 integrity verifier (QA-11)
  └── Connect Notifications drawer to /api/notifications and Supabase read state (QA-12)
```

---

## 6. Ratification & Next Steps

This Master Plan addresses every defect identified across your 16 image artifacts and functional requirements. Once you review and approve this specification, we will proceed phase by phase to execute the engineering implementation.
