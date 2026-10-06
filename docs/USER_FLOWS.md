# COGENT — Operational User Flows (USER_FLOWS.md)

> **Version:** 1.1.0 (Hardened Foundation)  
> **Status:** RATIFIED & LOCKED  
> **Coverage:** Onboarding, Marketing Shield, Regulatory Radar, and 5-W Gap Matrix  
> **Key Updates in v1.1:**
> - Integrated evidence-bounded verdicts (`NO_ISSUE_DETECTED`, `REVIEW_RECOMMENDED`, `ISSUE_DETECTED`, `BLOCKING_ISSUE`).
> - Human CCO approval states (`PENDING_REVIEW` → `APPROVED_BY_CCO`).
> - Decoupled AI candidate extraction and deterministic penalty calculation.
> - Relational tenant profile configuration (`tenant_licenses`, `tenant_payment_rails`).

---

## Flow 1: Tenant Onboarding & Relational License Configuration

```
[ New Organization Signs Up via Clerk ]
                   │
                   ▼
[ Step 1: Organization Profile & Identity ]
  • Enter Company Name, RC Number, Official Domain
  • Clerk assigns `clerk_organization_id`
  • Cogent creates `organizations` record with unique UUID
                   │
                   ▼
[ Step 2: Relational License Configuration ]
  • Add Licenses: [ + Add Operating License ]
    - Type: [ PSSP | MMO | MFB | Digital Lender | Commercial Bank ]
    - License Number: (e.g. "CBN/PSD/PSSP/2023/044")
    - Issuing Regulator: [ CBN | FCCPC | SEC ]
    - Issuance & Renewal Dates
  • Inserts records into `tenant_licenses` table
                   │
                   ▼
[ Step 3: Operational Payment Rails Configuration ]
  • Add Rails: [ + Add Active Payment Rail ]
    - Rail: [ NIBSS NIP | Interswitch WebPAY | Paystack | Card Acquiring ]
    - Settlement Bank Code: (e.g. "044" Access Bank, "058" GTBank)
    - Status: [ Live Production | Staging Sandbox ]
  • Inserts records into `tenant_payment_rails` table
                   │
                   ▼
[ Workspace Initialized with Relational Tenant Profile ]
```

---

## Flow 2: Pillar 1 — Marketing Pre-Vetting Shield

*Primary User: Growth Marketer, Copywriter, Product Manager, CCO*

```
1. Access Marketing Shield Dashboard
   • Marketer selects campaign channel: [ SMS | Social | Push | Landing Page | Ad Script ]
   • Enters Campaign Name (e.g. "Easter Flash Loan Promotion")
   • Pastes raw campaign copy into the editor.

2. Run Pre-Vetting Audit (Click: "Scan for Compliance")
   • Client sends payload to `/api/marketing/scan`.
   • Backend executes:
     a. Deterministic rule check (< 50ms): matches exact phrases in `prohibited_terms`.
     b. Relational filter (< 30ms): matches against `tenant_licenses` and `tenant_payment_rails`.
     c. Hybrid vector retrieval (< 200ms): retrieves ARCON Code 2022 & CBN CPF 2019 clauses via `gemini-embedding-2`.
     d. Gemini Pro extraction (< 2.2s): identifies candidate rule codes and drafts compliant rewrite.
     e. Deterministic penalty engine (< 50ms): looks up statutory fine minimums/maximums from `statutory_penalties`.
     f. Traceability logging (< 50ms): logs execution parameters to `ai_analysis_runs`.
   • Total roundtrip: ~3.0 seconds.

3. Interactive Results Screen
   • Evidence-Bounded Verdict Chip:
     [ BLOCKING_ISSUE ] (Red) or [ ISSUE_DETECTED ] (Amber) or [ NO_ISSUE_DETECTED ] (Green)
   • Human Approval Badge: [ PENDING CCO REVIEW ]
   • Split-Screen Review:
     - Left Pane: Original copy with highlighted violation spans.
     - Right Pane: Compliant Rewrite with one-click "Copy Clean Copy" button.
   • Deterministic Penalty Banner: "Statutory Penalty Exposure Avoided: ₦1,000,000 – ₦3,000,000".
   • Citation Cards: Each violation displays statutory clause reference, legal citation, and explanation.

4. CCO Clearance & Dossier Export
   • Chief Compliance Officer reviews the scan and clicks: [ APPROVE AND SIGN ]
   • System updates status to `APPROVED_BY_CCO`.
   • System exports official "ARCON Pre-Clearance Dossier" (PDF/Markdown) with SHA-256 integrity hash.
   • Audit entry written to `audit_logs`.
```

---

## Flow 3: Pillar 2 — Regulatory Radar & Circular Impact Tracer

*Primary User: COO, Chief Compliance Officer, VP of Product, CFO*

```
1. Circular Ingestion & Deterministic Metadata Parsing
   • New circular ingested from official portal or CCO upload.
   • Inngest worker extracts text and deterministically parses circular number, dates, and deadline.
   • System stores master record in `radar_circulars`.

2. Relational Tenant Applicability Filter
   • `evaluateCircularApplicability()` matches targeted license types and affected rails against `tenant_licenses` and `tenant_payment_rails`.
   • Applicability banner displays: "Applies to your organization because you hold: [ PSSP (CBN/PSD/PSSP/2023/044) ] operating [ NIBSS NIP ]".

3. Multi-Role Executive Impact Briefs
   • COO Tab: Settlement continuity, partner bank uptime, operational workflow disruptions.
   • CCO Tab: Statutory mandates, mandatory reporting timelines, sanctions for default.
   • Product & Engineering Tab: API specifications, KYC flow changes, payload schemas.
   • CFO Tab: Reserve capital ratios, interchange caps, balance sheet exposure.

4. Action Plan Assignment & Countdown Enforcement
   • CCO creates action items from the generated checklist and assigns to Engineering Lead.
   • Inngest automated countdown scheduler monitors statutory deadline:
     - > 30 Days: Low priority dashboard badge.
     - 15–30 Days: Weekly digest reminder.
     - 7–14 Days: High priority amber badge + email alert to CCO & COO.
     - < 7 Days: Critical Emergency red flashing countdown + daily escalation alerts.
```

---

## Flow 4: Pillar 3 — 5-W Decision Gap Matrix & Audit Defense

*Primary User: Chief Compliance Officer, Internal Auditor, Board Risk Committee, Bank Examiners*

```
1. Internal Policy Upload & Structural Chunking
   • CCO uploads company policy PDF (e.g. "Fintech Alpha AML & CFT Policy 2026.pdf").
   • Inngest worker extracts hierarchical sections and generates 768d embeddings (`gemini-embedding-2`).
   • Vectors stored in tenant-isolated `policy_clauses` with denormalized `organization_id`.

2. Run 5-W Gap Evaluation
   • CCO selects benchmark: [ CBN AML/CFT Regulations 2022 + BOFIA 2020 ].
   • AI Engine compares internal policy clauses against statutory requirements.
   • Deterministic engine queries `statutory_penalties` for fine calculations.

3. Interactive Gap Matrix
   • Scorecard: [ 82% Met | 4 Critical Gaps | 7 Partially Met ].
   • Filter by Status: [ CRITICAL GAP ]
   • The 5-W Decision View:
     - What Happened: Factual statutory requirement vs company policy baseline.
     - What to Know: Enforcement context and historical regulatory stance.
     - What Has Changed: Operational delta identified.
     - What to Do: Role-based remediation checklist with draft replacement wording.
     - Derived Insight: Strategic business impact, fine prevention, and bank examiner defense argument.

4. Bank Examiner Audit Defense Dossier
   • CCO clicks: "Export Audit Defense Pack".
   • Generates board-ready and examiner-ready dossier with cryptographic SHA-256 evidence logs.
```
