# COGENT — AI Engine Specification & Contracts (AI_ENGINE.md)

> **Version:** 1.1.0 (Hardened Foundation)  
> **Status:** RATIFIED & LOCKED  
> **AI Foundation:** Configurable Google Gemini Architecture via Vercel AI SDK (`ai` + `@ai-sdk/google`)  
> **Key Architecture Changes in v1.1:**
> - Strict boundary: AI only extracts candidates; deterministic code owns penalties, applicability, dates, and severity floors.
> - Removed hardcoded models; introduced configurable model aliases (`FAST_MODEL`, `REASONING_MODEL`, `EMBEDDING_MODEL`).
> - Replaced deprecated `text-embedding-004` with Google `gemini-embedding-2` (768d).
> - Replaced "100% compliant / CLEARED" with evidence-bounded epistemic states.
> - Mandatory traceability logging into `ai_analysis_runs`.
> - Explicit Zero Data Retention (ZDR) provider specification.

---

## 1. Architectural Contract: Deterministic Code vs. AI Engine

Cogent enforces an uncompromising institutional rule:
> **"The AI engine is strictly a semantic extraction, interpretation, and drafting layer. It is NEVER the system of record, rule engine, or financial penalty calculator."**

### 1.1 The Strict Separation of Duties

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PIPELINE RESPONSIBILITY BOUNDARY               │
├───────────────────────────────────┬────────────────────────────────────┤
│ AI ENGINE CAN DO:                 │ DETERMINISTIC CODE MUST DO:        │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Extract candidate rule codes    │ • Verify candidate rules against   │
│   ["ARCON_SEC_24", "CBN_CPF_03"]  │   verified database corpus         │
│ • Identify flagged text excerpts  │ • Calculate statutory penalties    │
│ • Explain why copy violates rule  │ • Enforce severity floors          │
│ • Draft compliant copy rewrites   │ • Enforce mandatory disclosures    │
│ • Draft role-based impact briefs  │ • Enforce license applicability    │
│ • Synthesize 5-W narratives       │ • Calculate statutory deadlines    │
│                                   │ • Record SHA-256 audit hashes      │
└───────────────────────────────────┴────────────────────────────────────┘
```

**CRITICAL INVARIANT:** Under no circumstances does the Gemini model calculate or return currency numbers for fines (e.g. `penaltyExposureNaira`). Gemini identifies the candidate violation; Cogent's deterministic rule engine queries the verified `statutory_penalties` table to look up statutory minimum, maximum, and daily fines.

---

## 2. Configurable Model Architecture (Zero Hardcoding)

To prevent architectural obsolescence as frontier models evolve, Cogent defines dynamic model aliases resolved through configuration:

```typescript
// src/shared/ai-engine/config/modelConfig.ts
export const AI_MODELS = {
  // High-throughput, sub-second latency for classification & candidate triage
  FAST_MODEL: process.env.AI_FAST_MODEL || 'gemini-3.8-flash',
  
  // High-reasoning engine for clause tension analysis, 5-W synthesis & rewrites
  REASONING_MODEL: process.env.AI_REASONING_MODEL || 'gemini-3.5-pro',
  
  // 768-dimensional multimodal vector embeddings (gemini-embedding-2)
  EMBEDDING_MODEL: process.env.AI_EMBEDDING_MODEL || 'gemini-embedding-2'
} as const;
```

### Model Deprecation Guardrail:
- **`text-embedding-004` is fully retired:** Google shut down `text-embedding-004` on January 14, 2026. Cogent uses `gemini-embedding-2` configured with an output dimensionality of 768 (`outputDimensionality: 768`), maintaining full compatibility with our PostgreSQL `vector(768)` schemas.

---

## 3. Epistemic Modesty & Evidence-Bounded Statuses

Cogent operates on the principle of **epistemic modesty**. The absence of a retrieved violation does not prove that a campaign is "100% compliant" (the retrieval engine could have experienced a recall gap, or a new circular could be pending publication).

### 3.1 Scan Verdicts (Bounded to Retrieved Evidence)
- **`NO_ISSUE_DETECTED`:** No statutory violations were detected against the verified retrieved corpus. (Replaces "CLEARED / 100% Compliant").
- **`REVIEW_RECOMMENDED`:** Copy contains subtle or ambiguous claims; human compliance review is strongly advised.
- **`ISSUE_DETECTED`:** Copy contains confirmed statutory violations against verified rules.
- **`BLOCKING_ISSUE`:** Severe multi-regulator violation, direct prohibition, or existential fine risk.

### 3.2 Human Approval Governance
Only a human Chief Compliance Officer (CCO) or authorized legal officer can formally clear an item. System states and human states are strictly bifurcated:
- **System Analysis State:** `AI_ANALYZED`
- **Human Governance State:** `PENDING_REVIEW` → `APPROVED_BY_CCO` | `MODIFIED_AND_APPROVED` | `REJECTED`

---

## 4. Structured Output Validation Contracts (Zod)

Every call to the Gemini AI Engine that returns compliance insights **MUST** pass strict validation through a typed Zod schema. Unvalidated LLM output is prohibited from entering the database or presentation layer.

### 4.1 Pillar 1: Candidate Extraction Schema (No Penalties in LLM Schema!)

```typescript
// src/shared/ai-engine/schemas/marketingCandidateSchema.ts
import { z } from 'zod';

export const CandidateFindingSchema = z.object({
  candidateRuleCode: z.string().describe("Standardized rule identifier, e.g. 'ARCON_SEC_24_GUARANTEE'"),
  flaggedExcerpt: z.string().describe("Verbatim excerpt from user copy that triggers the rule"),
  explanation: z.string().describe("Plain English explanation of why this excerpt is problematic"),
  recommendedFix: z.string().describe("Actionable guidance for copywriters on how to fix the issue")
});

export const MarketingAnalysisOutputSchema = z.object({
  candidateVerdict: z.enum(['NO_ISSUE_DETECTED', 'REVIEW_RECOMMENDED', 'ISSUE_DETECTED', 'BLOCKING_ISSUE']),
  candidateFindings: z.array(CandidateFindingSchema),
  compliantRewrite: z.string().describe("Draft marketing copy rewritten to preserve conversion intent without violating rules"),
  arconPreclearanceSuggested: z.boolean().describe("Whether this ad type falls under mandatory ARCON ASP vetting")
});

export type MarketingAnalysisOutput = z.infer<typeof MarketingAnalysisOutputSchema>;
```

### 4.2 Deterministic Post-Processing Pipeline
When `MarketingAnalysisOutput` is received:
1. Deterministic code takes each `candidateRuleCode` and queries `prohibited_terms`, `regulatory_obligations`, and `statutory_penalties`.
2. Verifies that the rule actually applies to the tenant's `license_types`.
3. Attaches exact verified statutory citation (e.g. *"ARCON Act 2022 Section 24(1)(a)"*).
4. Attaches statutory penalty numbers (e.g. ₦1,000,000 minimum fine).
5. Checks whether mandatory disclosures (e.g. *"Licensed by the CBN"*) are present in the copy.
6. Computes final `overall_risk_score` and `deterministic_penalty_naira`.

---

## 5. Mandatory AI Traceability Logging (`ai_analysis_runs`)

Every AI invocation generates an immutable audit record:

```typescript
export interface AiRunLogContext {
  organizationId: string;
  userId?: string;
  pipelineType: 'MARKETING_PREVET' | 'RADAR_CIRCULAR_EXTRACTION' | 'RADAR_IMPACT_SYNTHESIS' | 'GAP_MATRIX_EVALUATION' | 'REWRITE_GENERATION';
  modelIdentifier: string;
  modelConfig: Record<string, unknown>;
  promptTemplateVersion: string;
  inputTokenCount: number;
  outputTokenCount: number;
  latencyMs: number;
  retrievedClauseIds: string[];
  triggeredRuleIds: string[];
  rawPromptHash: string; // SHA-256
  rawOutputHash: string; // SHA-256
}
```

---

## 6. Provider Selection & Zero Data Retention (ZDR)

### 6.1 Provider Choice: Google Cloud Gemini Developer API (Paid Tier) vs. Vertex AI
For Cogent's production architecture:
- **Development & Staging:** Google Cloud Gemini Developer API (Paid Tier).
- **Production (Enterprise Fintech):** Google Cloud **Vertex AI** via `@ai-sdk/google` or direct Google Vertex SDK.

### 6.2 Data Privacy & Zero Data Retention Commitments
1. **No Model Training:** Under Google Cloud Vertex AI and Paid Tier Gemini Developer agreements, customer data (prompts and completions) is **NEVER** used to train base or fine-tuned Google models.
2. **Zero Data Retention (ZDR) Configuration:** Storage of prompt logs in Google Cloud is explicitly disabled via API parameters and IAM project configurations.
3. **Regional Processing:** In Vertex AI, requests are pinned to the Frankfurt (`europe-west3`) or London (`europe-west2`) regions to match our Supabase database location, ensuring data never transits unauthorized legal jurisdictions.

---

## 7. Human-Readable Response & Presentation Contract (Three-Layer Architecture)

### 7.1 The Core Architectural Principle
> **"Gemini determines structured meaning. Cogent determines presentation."**

To maintain absolute institutional trust with Nigerian Chief Compliance Officers, bank examiners, and fintech leadership, free-form Markdown generation by LLMs is strictly disallowed as a primary contract. 

Instead, Cogent enforces a clean **Three-Layer Architecture**:

```
Gemini Output ──► Validation & Business Logic ──► ResponseViewModel ──► Cogent UI Components
```

```
┌────────────────────────────────────────────────────────┐
│ 1. GEMINI STRUCTURED OUTPUT LAYER                     │
│ • Validated JSON via typed Zod schemas                 │
│ • Candidate rule codes, verbatim excerpts, fixes       │
│ • Strictly NO currency numbers, NO ad-hoc layout HTML  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. BUSINESS LOGIC & ENRICHMENT LAYER (Cogent Engine)   │
│ • Verifies candidate codes against statutory database  │
│ • Queries statutory_penalties for exact fine amounts   │
│ • Filters out obligations inapplicable to tenant rails │
│ • Validates mandatory regulatory disclosures           │
│ • Maps to typed ResponseViewModel (Presentation Model) │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 3. COGENT UI DESIGN SYSTEM (Presentation Layer)        │
│ • Next.js React Server & Client Components             │
│ • Standardized visual hierarchy & progressive flow     │
│ • Stat chips, citation badges, highlighted split-view  │
│ • Human CCO review state & audit export drawer         │
└────────────────────────────────────────────────────────┘
```

---

### 7.2 Strict Separation of Rendering Ownership
1. **No Ad-Hoc Markdown Layouts:** The AI engine outputs structured objects with explicit semantic keys (`candidateRuleCode`, `flaggedExcerpt`, `explanation`, `recommendedFix`, `compliantRewrite`). It never outputs styling wrappers, raw HTML, markdown headings, or markdown table scaffolding.
2. **Deterministic UI Construction:** Cogent's UI components own 100% of formatting, typography, color semantics, and iconography (e.g. red for `BLOCKING_ISSUE`, amber for `REVIEW_RECOMMENDED`, emerald for `NO_ISSUE_DETECTED`).

---

### 7.3 Standardized Information Hierarchy (Progressive Disclosure)
All platform workflows (Marketing Shield, Regulatory Radar, 5-W Gap Matrix) strictly adhere to this 6-level progressive disclosure hierarchy:

| Level | Component | Purpose & Visual Treatment |
| :--- | :--- | :--- |
| **1. Title & Status** | **Verdict Header & Status Chip** | Prominent top-level visual indicators showing evidence-bounded verdict (`NO_ISSUE_DETECTED` to `BLOCKING_ISSUE`), overall risk score (0-100), and deterministic penalty exposure banner. |
| **2. Executive Summary** | **Operational Briefing** | 1 to 3 concise, high-impact paragraphs summarizing institutional posture for fast CCO scanning without generic AI filler or jargon. |
| **3. Key Findings** | **Structured Violation Cards** | Modular cards containing verbatim flagged excerpts, rule category, and plain-English explanation of "Why It Matters" under Nigerian law (avoiding walls of text). |
| **4. Evidence & Citations** | **Statutory Citation Blocks** | Visually distinct from AI interpretations; contains exact Gazette section references (e.g. *ARCON Code Article 24(1)*, *BOFIA 2020 S.57*), official verification badges, and links to source clauses. |
| **5. Actions & Next Steps** | **Remediation & Action Plan** | Structured checklists with priority, departmental owner, and statutory compliance countdowns. |
| **6. Human Review State** | **CCO Governance Block** | Strict separation between AI analysis state (`AI_ANALYZED`) and formal human legal sign-off (`PENDING_REVIEW` &rarr; `APPROVED_BY_CCO`). |

---

### 7.4 The `ResponseViewModel` Specification
Between raw Gemini output and the UI, the Cogent engine constructs an internal `ResponseViewModel` (or `AnalysisPresentationModel`). This ensures AI schemas remain decoupled from UI requirements and allows room for business logic enrichment and evidence verification before rendering:

```typescript
// src/shared/types/presentation.ts
import { SeverityLevel, ScanVerdict, HumanApprovalStatus, RegulatorCode, MarketingChannel } from '@/shared/types';

export interface FindingPresentationCard {
  id: string;
  ruleCode: string;
  regulatorCode: RegulatorCode;
  severity: SeverityLevel;
  findingType: 'DETERMINISTIC_MATCH' | 'AI_CANDIDATE_MATCH';
  flaggedExcerpt: string;
  startIndex?: number;
  endIndex?: number;
  whyItMatters: string;
  statutoryCitation: string;
  statutoryPenaltyNaira: number;
  recommendedAction: string;
  mandatoryDisclosureRequired: string | null;
}

export interface PresentationActionItem {
  id: string;
  title: string;
  description: string;
  priority: SeverityLevel;
  ownerDepartment: 'Marketing' | 'Compliance' | 'Legal' | 'Product' | 'Executive';
  suggestedDeadlineDays?: number;
  completed?: boolean;
}

export interface BaseResponseViewModel {
  title: string;
  verdict: ScanVerdict;
  overallRiskScore: number;
  deterministicPenaltyTotalNaira: number;
  executiveSummary: string;
  findings: FindingPresentationCard[];
  actions: PresentationActionItem[];
  humanReviewState: {
    status: HumanApprovalStatus;
    reviewedBy?: string;
    reviewedAt?: string;
    canApprove: boolean;
  };
  telemetry: {
    latencyMs: number;
    modelIdentifier: string;
    verifiedAt: string;
    auditHash: string;
  };
}

export interface MarketingShieldViewModel extends BaseResponseViewModel {
  channel: MarketingChannel;
  originalCopy: string;
  compliantRewrite: string;
  arconPreclearanceRequired: boolean;
  activeLicenseProfiles: string[];
}
```

---

### 7.5 Tone, Voice & Adaptability
- **Tone (Clear, Calm, Operational, Evidence-Based):** Explanations must read like high-caliber regulatory counsel advisory memos—calm, precise, objective. Avoid generic AI filler ("Here is what I found..."), alarmist exclamation marks, sensationalized warnings, or excessive legalese.
- **Statutory Precision:** Always reference specific statutory obligations rather than vague legal concepts ("Violates Section 3.2.1 of CBN CPF 2019 regarding transparency in credit pricing" vs. "This sounds illegal").
- **Epistemic Modesty:** When no violations are detected in the retrieved evidence, Cogent presents the result as *"No issues detected against verified retrieved regulatory corpus"*, never *"100% compliant / legally risk-free"*.
- **Adaptability:** Responsive formatting that scales cleanly from simple, single-finding results to complex multi-layered reviews across all devices and density settings.

