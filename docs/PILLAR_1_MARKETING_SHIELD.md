# COGENT — Pillar 1 Specification: Marketing & Growth Pre-Vetting Shield

> **Module Identifier:** `src/modules/marketing-shield`  
> **Version:** 1.2.0 (Enterprise Memory & Regulatory Control Edition)  
> **Status:** RATIFIED & LOCKED  
> **Target Audience:** Growth Marketers, Copywriters, Product Managers, Chief Compliance Officers (CCO), Legal Counsel  
> **Key Updates in v1.2:**
> - **Institutional Claims Ledger:** Memory engine preserving CCO-approved phrasings, eliminating ground-zero reviews ("Tuesday's sign-off traveling to Wednesday's asset").
> - **Product & License Taxonomy:** Contextual vetting bounded to specific Nigerian financial product tiers (MFB, PSSP, IMTO, Digital Lending, Wealthtech).
> - **Post-Publish Drift & Finfluencer Watcher:** Continuous monitoring of live landing pages and social links against approved pre-vetting baselines.
> - **Official ARCON & CBN Audit Defense Pack:** One-click generation of formal regulatory examination dossiers with SHA-256 cryptographic fingerprints.
> - **Upstream Horizon Linkage:** Automatic re-review flagging when upstream circulars in Pillar 2 modify advertising baselines.

---

## 1. Executive Summary & Objective

In Nigeria and across Africa, marketing financial products without strict regulatory vetting is an immediate, balance-sheet-threatening risk:
- **ARCON (Advertising Regulatory Council of Nigeria - Act No. 23 of 2022):** Mandates pre-vetting of all advertising through the Advertising Standards Panel (ASP). Unvetted or misleading advertisements incur immediate fines of **₦1,000,000 to ₦3,000,000** per exposure channel, plus media takedowns and potential criminal prosecution of corporate officers.
- **CBN Consumer Protection Framework (CPF 2019):** Prohibits misleading financial promotions, concealed charges, and deceptive interest rates. Sanctions include fines up to **₦250,000,000** for systemic deceptive marketing.
- **FCCPC Digital Lending Regulations (DELR 2022):** Prohibits false promises of "instant loan without credit check" and aggressive recovery harassment.
- **SEC Nigeria Rules on Digital Assets & Collective Investments:** Strictly prohibits promising "guaranteed returns" or "risk-free" capital on investment and wealthtech products.
- **The "Memory Gap" Trap:** Traditional marketing review is asset-by-asset with zero institutional memory. Reviewers argue the same risk qualifiers every week. When senior compliance personnel depart, institutional memory is lost.

**Pillar 1 Mission:** Eliminate the two-week legal bottleneck by pre-clearing marketing copy in **under 3.5 seconds**, grounding every review in the institution's **living Claims Ledger**, evaluating live assets for **post-publish drift**, and producing **bulletproof audit defense dossiers** in seconds.

---

## 2. Product Taxonomy & License-Aware Context

Marketing compliance is not a generic keyword filter. In Nigeria, what is legal for an IMTO is illegal for a pure PSSP. Pillar 1 binds every scan to a specific **Product Taxonomy** backed by relational tenant licenses:

| Product Category Code | Display Name | Governing Regulators | Mandatory Statutory Hotspots |
| :--- | :--- | :--- | :--- |
| `SAVINGS_DEPOSIT` | High-Yield Savings & Fixed Deposits | CBN, NDIC | Must disclose NDIC insurance limits; prohibits "guaranteed" interest without variable rate qualifications; requires APR schedules. |
| `DIGITAL_NANO_LOAN` | Instant Credit / Nano-Lending | FCCPC, CBN | Must disclose total cost of credit (all-in APR); strictly prohibits "no credit check" and "guaranteed approval"; requires repayment terms. |
| `PAYMENTS_WALLET` | E-Money Wallet & P2P Transfers | CBN (PSMD, BSD) | License disclosure ("Licensed by CBN as PSSP/MMO"); prohibited from claiming banking deposit status without MFB partner disclosure. |
| `REMITTANCE_FX` | Cross-Border IMTO & FX Transfers | CBN (TED, FPRD) | Transparent FX spreads; disclaimer on CBN reference exchange rates; volatility warnings on currency conversions. |
| `WEALTHTECH_INVEST` | Digital Assets & Stock/Fund Trading | SEC Nigeria | Strict ban on "capital guaranteed" and "risk-free"; mandatory risk disclaimer: *"Capital at risk. Past performance does not guarantee future returns."* |

---

## 3. Supported Marketing Channels & Technical Constraints

| Channel Code | Display Name | Content Type | Constraints | Specific Regulatory Hotspots |
| :--- | :--- | :--- | :--- | :--- |
| `SMS_BLAST` | SMS Promotion | Plain text | 160 chars (GSM standard) | Mandatory license disclosure ("Licensed by CBN") often omitted due to character limits. |
| `SOCIAL_MEDIA_POST` | Social Media (X, IG, TikTok) | Text + Caption | 280 (X) to 2,200 chars | Finfluencer hype, omitted risk disclaimers, misleading hashtags (#RiskFreeMoney). |
| `IN_APP_PUSH_NOTIFICATION` | In-App Push Notification | Title (50c) + Body (120c) | Truncated display | Aggressive artificial urgency ("Claim ₦100k bonus expiring in 10 mins!"). |
| `LANDING_PAGE_WEBSITE` | Landing Page / Web Copy | HTML / Markdown | Multi-section | APR tables, hidden fee footnotes, T&Cs hyperlinks, license badge prominence. |
| `OUTDOOR_BILLBOARD` | Billboard / OOH Script | Headline + Subhead | High visual impact | Prominent font size for ARCON approval certificate numbers and mandatory risk warnings. |
| `EMAIL_NEWSLETTER` | Email Campaign | Subject + HTML Body | Long-form | Unsubscribe links, APR disclosure tables, fee schedules. |
| `AFFILIATE_INFLUENCER` | Finfluencer / Affiliate Script | Talking Points / Script | Audio/Video/Text | Scripted claims, strict liability for unauthorized third-party promises. |

---

## 4. End-to-End Execution Pipeline (With Claims Ledger & Memory)

```
[ User Input: Campaign Copy + Channel + Target Audience + Product Category ]
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 1: Tenant Claims Ledger Matcher (< 20ms)                              │
│ • Queries `tenant_claims_ledger` for approved phrasings for this product.   │
│ • If previous CCO sign-off matches: injects "Approved Phrasing Match".      │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 2: Deterministic Rule Evaluator (< 50ms)                              │
│ • Regex pattern matching against `prohibited_terms` table                   │
│ • Flags exact prohibited phrases ("zero interest", "risk-free", etc.)      │
│ • Queries `statutory_penalties` for exact statutory fine exposure (₦ Naira) │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 3: Relational Tenant License Context (< 30ms)                         │
│ • Queries `tenant_licenses` and `tenant_payment_rails`                      │
│ • Filters out statutory obligations irrelevant to tenant's license tier     │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 4: Hybrid Statutory Retrieval (PostgreSQL pgvector + tsvector)        │
│ • Generates 768d embedding via `gemini-embedding-2`                         │
│ • Searches ARCON Code 2022, CBN CPF 2019, FCCPC DELR 2022, SEC Rules       │
│ • Returns top 5 relevant statutory clauses with legal citations             │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 5: Gemini Pro AI Synthesis & Compliant Rewrite (< 2.5s)               │
│ • Context: Retrieved statutory clauses + Product profile + Claims Ledger    │
│ • Extracts candidate rule codes and crafts high-converting, compliant copy  │
│ • Strictly NO currency numbers generated by LLM                             │
│ • Validates output against `MarketingAnalysisOutputSchema`                  │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 6: Deterministic Post-Processing & Penalty Calculation                │
│ • Matches candidate rule codes to `statutory_penalties`                     │
│ • Computes verified deterministic fine exposure and severity floor          │
│ • Verifies presence of mandatory disclosures                                │
│ • Assigns evidence-bounded verdict                                          │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 7: Persistence, Audit Ledger & Claims Memory Loop (< 100ms)           │
│ • Inserts execution record into `ai_analysis_runs`                          │
│ • Inserts scan into `marketing_scans` with RLS                              │
│ • Inserts findings into `marketing_findings` with org_id                    │
│ • Computes SHA-256 hash and writes to `audit_logs`                          │
│ • If CCO modifies and approves: prompts to save to `tenant_claims_ledger`   │
│ • Returns full interactive report to Next.js Client                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. The Institutional Claims Ledger (Memory Engine)

The Claims Ledger ensures that **sign-offs travel across time and across copywriters**:
1. When a CCO edits non-compliant copy and approves it, the system gives the option: `[ APPROVE & ADD TO CLAIMS LEDGER ]`.
2. The approved phrasing is indexed with:
   - `approved_text`: The exact approved claim.
   - `prohibited_counterpart`: The phrase it replaced.
   - `product_category`: e.g. `SAVINGS_DEPOSIT`.
   - `governing_regulator`: e.g. `CBN`.
   - `cco_rationale`: Why this wording was settled upon.
3. Subsequent scans immediately surface these approved phrasings to copywriters as high-priority suggestions, dramatically boosting first-pass approval rates.

---

## 6. Post-Publish Drift & Finfluencer Watcher

Pre-vetting alone leaves a fatal blind spot: **live asset drift**. 
- Affiliates alter approved landing pages.
- Finfluencers add exaggerated claims to approved caption templates.
- Content managers remove mandatory license footnotes to save space.

**The Post-Publish Watcher Flow:**
1. User supplies a **Live Asset URL** (Landing page, X thread, Instagram post).
2. Cogent extracts live text and generates a SHA-256 fingerprint.
3. Cogent compares the live text against the original `APPROVED_BY_CCO` scan.
4. **Drift Detection Engine** flags:
   - *Omitted Mandatory Disclosures* (e.g., deleted "Licensed by CBN").
   - *Rate & Yield Changes* (e.g., APR changed from 15% to 28% without updating disclosures).
   - *Added Exaggerated Promises* (e.g., added "guaranteed returns").

---

## 7. Official ARCON / CBN Examination Defense Pack

When ARCON or the CBN Consumer Protection Department sends a formal query regarding an advertisement:
1. The CCO clicks **`[ EXPORT AUDIT DEFENSE DOSSIER ]`**.
2. Cogent compiles a publication-ready PDF dossier containing:
   - **Formal Regulatory Transmittal Header:** Addressed to the Director of the Advertising Standards Panel (ARCON) or CBN Consumer Protection.
   - **Verbatim Scan Record:** Original draft, timestamp, and submitting user.
   - **Statutory Concordance:** Exact statutory citations evaluated (ARCON Code Art. 24, CBN CPF Sec. 5).
   - **Approved Compliant Copy:** The CCO-ratified copy.
   - **Cryptographic Attestation:** SHA-256 hash, CCO digital signature, and immutable audit log entry ID.

---

## 8. Structured Schemas & Database Models

### 8.1 Claims Ledger Database Model
```typescript
export interface TenantClaimLedgerEntry {
  id: string;
  organizationId: string;
  productCategory: string;
  approvedText: string;
  prohibitedCounterpart: string | null;
  governingRegulator: 'CBN' | 'ARCON' | 'FCCPC' | 'SEC' | 'NDPC';
  statutoryCitation: string;
  ccoRationale: string;
  approvedByUserId: string;
  approvedAt: string;
  expiresAt: string | null;
  isActive: boolean;
}
```

### 8.2 AI Candidate Output Schema
```typescript
import { z } from 'zod';

export const CandidateFindingSchema = z.object({
  candidateRuleCode: z.string().describe("e.g. 'ARCON_SEC_24_GUARANTEE'"),
  flaggedExcerpt: z.string().describe("Verbatim excerpt from user copy"),
  explanation: z.string().describe("Plain English explanation of why excerpt is problematic"),
  recommendedFix: z.string().describe("Actionable copywriting guidance")
});

export const MarketingAnalysisOutputSchema = z.object({
  candidateVerdict: z.enum(['NO_ISSUE_DETECTED', 'REVIEW_RECOMMENDED', 'ISSUE_DETECTED', 'BLOCKING_ISSUE']),
  candidateFindings: z.array(CandidateFindingSchema),
  compliantRewrite: z.string().describe("High-converting rewrite preserving marketing intent"),
  arconPreclearanceSuggested: z.boolean(),
  claimsLedgerRecommendations: z.array(z.string()).optional()
});

export type MarketingAnalysisOutput = z.infer<typeof MarketingAnalysisOutputSchema>;
```

### 8.3 Verified Presentation Model
```typescript
export interface VerifiedMarketingFinding {
  id: string;
  scanId: string;
  organizationId: string;
  ruleCode: string;
  flaggedText: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  findingType: 'DETERMINISTIC_MATCH' | 'AI_CANDIDATE_MATCH' | 'CLAIMS_LEDGER_MATCH';
  explanation: string;
  recommendedFix: string;
  statutoryCitation: string;
  statutoryPenaltyNaira: number; // DETERMINISTICALLY COMPUTED FROM statutory_penalties TABLE
  matchedClaimsLedgerId?: string;
}
```
