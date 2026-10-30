<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Cogent Enterprise RegTech Design System Rules

You are designing for an enterprise B2B RegTech & supervisory compliance platform used by General Counsels, Chief Compliance Officers, and Bank Examiners.
Avoid "LLM Tailwind Default Syndrome" (over-pill-ification, saturated primary colors, icon spam, and AI sparkles). The interface must evoke Stripe, Linear, Vanta, and Palantir Foundry.

## 1. Metric Cards & Pulse Strips
- **NO decorative icons** inside metric cards.
- **NO traffic light numbers**: Do NOT render metric figures in red, green, amber, or blue. ALL numbers must be monochrome: `text-slate-900 font-mono text-2xl font-bold tracking-tight`.
- **Labels**: Clean uppercase tracking: `text-[11px] font-semibold text-slate-500 uppercase tracking-wider`.
- **Layout**: Do NOT use multiple floating rounded cards. Group related metrics into a single unified container with 1px hairline dividers: `bg-white border border-slate-200 rounded-lg grid divide-x divide-slate-200`.

## 2. Identifiers, Codes, and Citations
- **NO pills or tinted boxes**: Circular numbers (`CBN/BSD/DIR/...`), clause codes (`BOFIA Section 5.2`), hash prefixes (`65e478d1...`), and channel types (`SOCIAL_MEDIA_POST`) must NEVER be enclosed in rounded pill containers (`px-2 py-0.5 rounded-full bg-blue-50`).
- **Standard format**: Render citations and codes as plain muted monospace text: `font-mono text-xs text-slate-600`.

## 3. Status Indicators & Badges
- **NO heavy filled pills**: Do NOT use thick neon badges for routine statuses (`ADEQUATELY_MET`, `PARTIALLY_MET`, `VERIFIED`, `ACTIVE`).
- **6px Status Dot**: Render status as a 6px dot next to slate text:
  ```tsx
  <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
    Adequately Met
  </span>
  ```
- **Critical Gaps**: Reserve soft tinted borders strictly for blocking errors: `bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-xs font-medium`.

## 4. AI & Infrastructure Transparency
- **AI is invisible infrastructure**: Never mention "Gemini", "AI-powered", or "AI Deterministic Rationale" in customer-facing UI copy.
- **NO `<Sparkles>` icons**: Do not use sparkle icons on analysis sections, buttons, or drawers. Use domain-specific icons like `<Layers>`, `<FileText>`, `<Scale>`, or `<ShieldCheck>`.
- **Statutory copy**: Use regulatory phrasing: "Deterministic Rule Evaluation", "Statutory Concordance Analysis", "Pre-Cleared Remediations".

## 5. Typography, Colors & Role Alignment
- **NO rainbow departments**: Do not assign arbitrary colors to roles (e.g., CCO blue, COO green, Engineering purple, CFO amber). All role headers must be uniform: `text-[10px] font-bold uppercase tracking-wider text-slate-700`.
- **Subtle metadata**: "Optional" labels must be plain text (`text-xs text-slate-400 font-normal`), not green pills.
- **Actions**: Primary CTA buttons should be `bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-medium text-xs shadow-xs`. Secondary buttons should be `bg-white text-slate-700 border border-slate-300 hover:bg-slate-50`.

---

# Cogent Product Intelligence & Persistent Memory Architecture

> **Authoritative Knowledge Base**: Consult [PRODUCT_INTELLIGENCE/00_MASTER_PRODUCT_CONTEXT.md](file:///c:/Users/Alex%20Marco/Documents/Cogent/PRODUCT_INTELLIGENCE/00_MASTER_PRODUCT_CONTEXT.md) and related files in `PRODUCT_INTELLIGENCE/` for exhaustive product, commercial, and customer context.
> **Operational Domain**: `https://stem-cogent.com` | **Commercial Identity**: Cogent / Stem Cogent

## 1. Stable Core Memory (Non-Negotiable Product Truths)
- **Product Identity**: Sovereign RegTech operating system engineered for African financial institutions (Commercial Banks, MFBs, FinTechs, PSSPs, Digital Lenders) under regulatory oversight by the **CBN, ARCON, NDPC, SEC, NFIU, and FCCPC**.
- **Mission**: Protect institutional balance sheets from catastrophic statutory penalties (BOFIA 2020 §65, ARCON 2022 §54, NDPA 2023) and insulate corporate officers from personal criminal liability through autonomous, continuous supervisory governance.
- **Three Supervisory Pillars**:
  1. *Pillar 01 — Marketing Shield* (`/marketing`): Sub-50ms deterministic regex & prohibited terms scanner, hybrid statutory retrieval, Gemini conversion-preserving rewrites, post-publish live URL drift watcher, and signed ARCON ASP pre-clearance dossiers.
  2. *Pillar 02 — Regulatory Horizon Radar* (`/radar` or `/insight`): Automated PDF circular ingestion, supersession & lineage graph (`AMENDS`, `REPLACES`, `REPEALS`), 4-way ExCo impact synthesis (CCO, COO, CTO, CFO), and statutory countdown clocks.
  3. *Pillar 03 — 5-W Policy Concordance Gap Matrix* (`/gap-matrix` or `/gap`): Automated internal manual chunking, 768d vector embeddings, 3-tier concordance (`ADEQUATELY_MET`, `PARTIALLY_MET`, `CRITICAL_GAP`), 5-W decision cards, pre-cleared remediation clauses, and Bank Examiner Audit Defense Packs.
  4. *Connected Compliance Cascade*: Autonomous multi-hop event bus propagating circular updates across policies, live campaigns, and balance-sheet exposure in a cryptographically chained ledger (`compliance_cascade_events`).
- **Product Boundaries**:
  - NOT a generic legal chatbot or conversational prompt tool.
  - NOT a substitute for formal judicial representation or a licensed law firm.
  - NOT an IT/hardware GRC scanner (like Vanta/Drata).
  - NOT a dummy sandbox.

## 2. Inviolable Founder Invariants
1. **Self-Serve Velocity Over Enterprise Procurement**: Users visit `stem-cogent.com`, click **"Start 7-Day Pilot"**, sign up via Google OAuth (`@gmail.com` permitted), and land directly in their real, multi-tenant workspace with zero procurement friction.
2. **Deterministic Precedence**: Deterministic pattern matching always precedes and supersedes LLM generation. An LLM cannot override an exact statutory prohibition.
3. **Decoupled Architecture**: Public marketing pages (`src/modules/marketing-site/`, `/`, `/pricing`, `/about`, `/contact`) are strictly decoupled from internal product cockpits (`src/modules/executive`, `radar`, `marketing-shield`, `gap-matrix`, `regulatory`). Never tamper with cockpit code when editing marketing assets.
4. **Epistemic Modesty**: Never claim "100% compliant". All verdicts are evidence-bounded (`NO_ISSUE_DETECTED`, `REVIEW_RECOMMENDED`, `ISSUE_DETECTED`, `BLOCKING_ISSUE`).

## 3. Active Business & Strategic Context (October 2026)
- **Launch Phase**: Phase 2 — Public Self-Serve Pilot Rollout on `stem-cogent.com` and early design partner conversion.
- **Active Pricing Architecture (Paystack Billed)**:
  - **Starter**: $199/mo (₦300k/mo) or $1,990/yr (₦3m/yr) — 3 seats, 50 scans/mo, 3 policy documents.
  - **Pro (Core Engine)**: $549/mo (₦850k/mo) or $5,490/yr (₦8.5m/yr) — 10 seats, unlimited scans/rewrites, 15 policy documents, full cryptographic ARCON bundle, real-time automated cascade.
  - **Enterprise**: $1,999/mo (₦3m/mo) or $19,990/yr (₦30m/yr) — Unlimited seats/scans/policies, bespoke statutory rules, 7-year BOFIA audit log retention.
- **Primary ICP Hypothesis**: High-growth Nigerian FinTechs and National MFBs with 30–350 employees under active CBN/FCCPC/ARCON oversight, where the CCO needs operational leverage and the CMO needs fast campaign turnaround.

## 4. Reasoning & Execution Guardrails for Agents
- **Ground Every Recommendation in Statutory Evidence**: Cite real Nigerian financial law (*BOFIA 2020*, *ARCON Code 2022*, *CBN AML Regulations 2022*, *NDPA 2023*). Reject generic startup fluff.
- **Separate Business Strategy from Code Edits**: When solving a product strategy or commercial challenge, do not alter application code or database migrations unless explicitly instructed.
- **Utilize Progressive Disclosure**: For deep dive tasks, activate the specialized skills in `.agents/skills/`:
  - `cogent-product-strategist`: Feature roadmap, statutory alignment, pillar protection.
  - `cogent-customer-researcher`: ICP qualification, stakeholder buying personas, discovery scripts.
  - `cogent-gtm-playbook`: 7-day self-serve pilot motions, sales scripts, objection handling.
  - `cogent-statutory-positioning`: Brand copy, regulatory terminology, landing page sections.

