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
