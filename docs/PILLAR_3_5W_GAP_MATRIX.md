# COGENT — Pillar 3 Specification: 5-W Decision Gap Matrix & Audit Defense Pack

> **Module Identifier:** `src/modules/gap-matrix`  
> **Version:** 1.2.0 (Atomic Concordance & Bank Examiner Defense Edition)  
> **Status:** RATIFIED & LOCKED  
> **Target Audience:** Chief Compliance Officer (CCO), Internal Auditor, Board Risk & Audit Committee, Managing Director/CEO, Bank Examiners (CBN BSD, NDIC, NDPC)  
> **Key Updates in v1.2:**
> - **Atomic Policy Concordance Engine:** Evaluates internal policies clause-by-clause against verified statutory baselines, eliminating the "Shelf Policy" trap.
> - **Three-Tier Compliance Classification:** `ADEQUATELY_MET`, `PARTIALLY_MET`, and `CRITICAL_GAP` with deterministic fine calculations.
> - **The 5-W Operational Decision Framework:** Operationalizes legal divergence into 5 executive dimensions, including ready-to-adopt draft replacement wording for board approval.
> - **Bank Examiner Audit Defense Pack:** One-click generation of an official, cryptographic, publication-grade defense dossier for CBN Banking Supervision and NDIC audits.
> - **Upstream Radar Cascade:** Automatically triggers gap evaluations when new circulars land in Pillar 2.

---

## 1. Executive Summary & Objective

In Nigeria, financial institutions undergo rigorous on-site examinations by the **Central Bank of Nigeria (CBN) Banking Supervision Department (BSD)**, **NDIC bank examiners**, and **NDPC privacy auditors**:
- **The "Shelf Policy" Problem:** To secure initial operating licenses (PSSP, MMO, MFB, Digital Lending), fintechs pay law firms millions of Naira to draft voluminous compliance policies (AML/CFT, Consumer Protection, Information Security, Credit Risk). Once the license is issued, these documents sit unmaintained in Google Drive while regulations constantly evolve.
- **The Bank Examiner Trap:** When CBN examiners conduct annual audits, they perform a **Concordance Audit** comparing written internal procedures against current statutory baselines. Any divergence—such as an internal policy stating *"Suspicious transactions will be reported within 7 business days"* while the NFIU/CBN 2022 regulation mandates **72 hours**—is classified as a **Level 1 Material Deficiency**, resulting in severe fines (₦10M–₦50M), public sanctions, or personal regulatory warnings to the CCO.

**Pillar 3 Mission:** Transform internal company policies from dead PDF shelfware into an active, verified, operational defense system. Cogent performs clause-by-clause evaluation against statutory baselines, maps operational gaps into the **5-W Decision Matrix**, and generates **Bank Examiner Audit Defense Dossiers** in minutes.

---

## 2. Ingestion & Atomic Clause Chunking Architecture

```
[ CCO / Admin Uploads Internal Policy (PDF / DOCX) ]
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ STAGE 1: Ingestion & Storage                           │
│ • Uploaded to private tenant bucket:                   │
│   `policies/{org_id}/{policy_id}/{filename}.pdf`       │
│ • Fires Inngest event: `gap-matrix/policy.uploaded`    │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ STAGE 2: Structural Clause Extraction (Inngest Worker) │
│ • Hierarchical parsing: Headings, Section Numbers,     │
│   Sub-clauses (e.g., "Section 4.1.2 Reporting Window") │
│ • Atomic chunking with full context preservation       │
│ • Inserts raw text into `policy_documents`             │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ STAGE 3: Tenant Vector Indexing (pgvector)             │
│ • Computes 768d vector via `gemini-embedding-2`        │
│ • Inserts into tenant-isolated `policy_clauses` table  │
│ • Enforces strict multi-tenancy via RLS                │
└────────────────────────────────────────────────────────┘
```

---

## 3. Clause-by-Clause Statutory Concordance Engine

When a user initiates an evaluation, Cogent tests the internal policy against the verified statutory baseline (e.g., *Internal AML/CFT Policy* vs. *CBN AML/CFT Regulations 2022 + Money Laundering Prevention Act 2022*):

```
                       STATUTORY BASELINE
                  (e.g., CBN AML/CFT Regulations)
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
      [ Statutory Clause 1 ]            [ Statutory Clause 2 ]
     "72-hour STR reporting"            "Mandatory PEP Approval"
               │                                 │
               ▼                                 ▼
    [ Vector Search in Tenant's Internal Policy Clauses ]
               │                                 │
               ▼                                 ▼
   [ Matched Internal Clause ]       [ No Matched Clause Found ]
   "Policy Sec 4: 7-day window"      "PEP policy unaddressed"
               │                                 │
               ▼                                 ▼
         PARTIALLY MET                      CRITICAL GAP
    (Fails statutory timeline)       (Missing mandatory mandate)
               │                                 │
               └────────────────┬────────────────┘
                                │
                                ▼
         [ GEMINI PRO 5-W DECISION SYNTHESIS ENGINE ]
  Synthesizes the complete operational 5-W Decision Matrix
                                │
                                ▼
         [ DETERMINISTIC STATUTORY PENALTY ENGINE ]
  Attaches verified statutory penalty ranges from `statutory_penalties`
```

---

## 4. The Three Compliance Status Classifications

| Status Code | Display Label | Definition | Regulatory Consequence |
| :--- | :--- | :--- | :--- |
| `ADEQUATELY_MET` | **Adequately Met** | The internal policy completely satisfies all mandatory provisions, timelines, and reporting thresholds of the statute. | Clean audit finding; eligible for Examiner Green Light. |
| `PARTIALLY_MET` | **Partially Met** | The policy addresses the general intent but diverges on specific statutory parameters (e.g., outdated reporting deadlines, missing board committee approval, or divergent threshold amounts). | Level 2 Examiner Finding; 30-day remediation order; potential administrative fine. |
| `CRITICAL_GAP` | **Critical Gap** | The statutory requirement is completely omitted from the company policy; zero internal controls exist for this mandate. | Level 1 Material Deficiency; immediate financial sanction or operating restriction. |

---

## 5. The 5-W Operational Decision Matrix

For every evaluated clause, Cogent structures the analysis across the **5-W Operational Dimensions**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    THE 5-W OPERATIONAL DECISION MATRIX                  │
├────────────────────┬────────────────────────────────────────────────────┤
│ 1. What Happened?  │ Factual Baseline: The exact wording of the         │
│                    │ statutory obligation paired against the current    │
│                    │ wording in the company's internal policy.          │
├────────────────────┼────────────────────────────────────────────────────┤
│ 2. What to Know?   │ Regulatory Context: Why the regulator enacted this │
│                    │ rule, historical CBN enforcement patterns, and     │
│                    │ precedent fines levied on peer institutions.       │
├────────────────────┼────────────────────────────────────────────────────┤
│ 3. What Has        │ Operational Delta: Exactly where the company's     │
│    Changed?        │ current internal procedures fall short or diverge  │
│                    │ from the latest regulatory amendments.             │
├────────────────────┼────────────────────────────────────────────────────┤
│ 4. What to Do?     │ Remediation Playbook: Role-assigned action         │
│                    │ checklist + DRAFT REPLACEMENT POLICY WORDING       │
│                    │ ready for Board Risk Committee adoption.           │
├────────────────────┼────────────────────────────────────────────────────┤
│ 5. Derived         │ Business Bottom Line: Balance sheet exposure, fine │
│    Insight         │ avoidance quantification, and the precise defense  │
│                    │ argument to present to bank examiners.             │
└────────────────────┴────────────────────────────────────────────────────┘
```

---

## 6. The Bank Examiner Audit Defense Pack (The "Green Light" Dossier)

When CBN examiners arrive on-site, the CCO clicks **`[ GENERATE BANK EXAMINER DEFENSE PACK ]`**.
In seconds, Cogent generates a publication-ready audit package:

1. **Formal Transmittal Cover Sheet:** Addressed to:
   *The Director, Banking Supervision Department / Other Financial Institutions Supervision Department (OFISD), Central Bank of Nigeria.*
2. **Statutory Concordance Concordance Matrix:** Full cross-walk table showing every statutory obligation, the corresponding section of company policy, and verified status.
3. **Active Remediation Log:** Any amended policy language with Board approval timestamps, assigned owners, and implementation verification.
4. **Cryptographic Integrity Block:** SHA-256 hash of the evaluated policy document, evaluation timestamp, and CCO digital sign-off record.

---

## 7. Structured Zod Schema & Output Contract

```typescript
import { z } from 'zod';

export const GapItemSynthesisSchema = z.object({
  regulatoryClauseReference: z.string().describe("e.g. 'Regulation 14(2) CBN AML Regulations 2022'"),
  matchedPolicySection: z.string().nullable().describe("e.g. 'Section 6.2' or null if Critical Gap"),
  matchedPolicyText: z.string().nullable().describe("Excerpt from company policy or null"),
  suggestedStatus: z.enum(['ADEQUATELY_MET', 'PARTIALLY_MET', 'CRITICAL_GAP']),
  whatHappened: z.string().describe("Statutory obligation vs current company policy"),
  whatToKnow: z.string().describe("Enforcement context and historical regulatory stance"),
  whatHasChanged: z.string().describe("Exact operational delta between statute and policy"),
  whatToDo: z.string().describe("Role-based remediation checklist with draft replacement wording"),
  draftReplacementPolicyLanguage: z.string().describe("Exact legal wording ready for board adoption"),
  derivedInsight: z.string().describe("Strategic business impact and examiner defense argument"),
  statutoryPenaltyNaira: z.number().describe("Deterministic penalty exposure")
});

export const GapEvaluationOutputSchema = z.object({
  executiveSummary: z.string(),
  overallComplianceScore: z.number().min(0).max(100),
  totalFineExposureNaira: z.number(),
  items: z.array(GapItemSynthesisSchema)
});

export type GapEvaluationOutput = z.infer<typeof GapEvaluationOutputSchema>;
```
