# COGENT — Pillar 2 Specification: Regulatory Radar & Circular Impact Tracer

> **Module Identifier:** `src/modules/radar`  
> **Version:** 1.2.0 (Horizon Scanning & Executive Control Edition)  
> **Status:** RATIFIED & LOCKED  
> **Target Audience:** Chief Operating Officer (COO), Chief Compliance Officer (CCO), VP of Product & Engineering, Chief Financial Officer (CFO), Board Risk Committee  
> **Key Updates in v1.2:**
> - **African Horizon Scanning Ingestion:** Robust extraction pipeline designed for unstructured Nigerian PDFs, gazettes, and official circulars.
> - **Zero-Noise Relational Targeting:** Deterministic filtering matching circulars against tenant licenses (`tenant_licenses`), payment rails (`tenant_payment_rails`), and product types.
> - **4-Way Multi-Role ExCo Synthesis:** Tailored operational action briefs for COO, CCO, VP Product/Engineering, and CFO.
> - **Circular Lineage & Supersession Graph:** Tracks amendment parentage, showing which circulars are active, amended, or repealed.
> - **Statutory Countdown Engine & Escalation SLA:** Absolute deadline calculation with automated executive notification triggers.
> - **Downstream Compliance Cascade:** Feeds directly into Pillar 3 (Policy Gap Matrix) and Pillar 1 (Marketing Drift Checks).

---

## 1. Executive Summary & Objective

In Nigeria's financial services sector, regulatory changes arrive without advance warning:
- The **Central Bank of Nigeria (CBN)** regularly publishes circulars late in the evening with **14-to-30-day compliance windows** or *"with immediate effect"*.
- Failure to comply triggers catastrophic sanctions: suspension from the **NIBSS NIP settlement rail**, revocation of operating licenses, and multimillion-Naira balance sheet fines (e.g., ₦1B on leading mobile money operators, ₦250M on payment processors).
- A fintech operates under a web of overlapping regulators: **CBN, SEC, NDPC, FCCPC, NFIU, and ARCON**.
- **The Executive Communication Failure:** CCOs typically email raw 10-page circular PDFs to executives. COOs don't know settlement windows moved; engineers don't know KYC requirements changed; CFOs don't know statutory reserve ratios were adjusted.

**Pillar 2 Mission:** Replace regulatory panic with an automated **Regulatory Radar & Circular Impact Tracer**. The system ingests circulars, determines immediate institutional applicability, generates role-specific executive action briefs, enforces statutory countdown deadlines, and maintains an auditable lineage of changing laws.

---

## 2. Supported Regulatory Bodies & Ingestion Taxonomy

Pillar 2 prioritizes the **"Core 6" Nigerian Regulatory Bodies**, with modular support for Pan-African expansion:

| Regulator | Code | Primary Regulatory Domains | Ingestion Sources |
| :--- | :--- | :--- | :--- |
| **Central Bank of Nigeria** | `CBN` | Banking, payments, FX guidelines, capital adequacy, AML/CFT, KYC, interchange fees, cybersecurity. | Official circular portal, gazette publications, verified CCO PDF upload. |
| **Securities and Exchange Commission** | `SEC` | Digital assets, VASPs, crowdfunding, robo-advisory, capital market operations. | SEC regulatory circulars, market notices. |
| **Advertising Regulatory Council of Nigeria** | `ARCON` | Marketing communications, brand vetting, consumer disclosures, ASP directives. | ARCON notices, Advertising Standards Panel circulars. |
| **Nigeria Data Protection Commission** | `NDPC` | Data privacy, cross-border data transfer, DPIA filings, breach notifications. | NDPC guidelines, NDPA 2023 directives. |
| **Federal Competition & Consumer Protection Commission** | `FCCPC` | Digital lending guidelines, consumer credit fairness, debt recovery practices. | FCCPC directives, registered lender notices. |
| **Nigerian Financial Intelligence Unit** | `NFIU` | Suspicious Transaction Reports (STR), Currency Transaction Reports (CTR), PEP lists. | NFIU advisories, AML/CFT red-flag directives. |
| *Pan-African Extensions* | `CBK`, `BoG`, `FSCA` | Cross-border remittance, mobile money interoperability, crypto asset licensing. | Central Bank of Kenya, Bank of Ghana, South Africa FSCA gazettes. |

---

## 3. End-to-End Ingestion & Processing Architecture

```
[ New Circular Dropped (Official Portal, Gazette, or Verified CCO Upload) ]
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────┐
│ STAGE 1: Ingestion & Document Extraction (Inngest Worker)    │
│ • Layout-preserving text extraction for scanned/messy PDFs    │
│ • Computes SHA-256 document checksum                         │
│ • Extracts metadata: Circular Ref, Dates, Issuing Department │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ STAGE 2: Circular Lineage & Supersession Resolution          │
│ • Scans for revoked or amended circular citations            │
│ • Updates `circular_supersession_links` (parent-child graph) │
│ • Flags older circular versions as `SUPERSEDED` or `AMENDED` │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ STAGE 3: Tenant Applicability Engine (Deterministic Filter)   │
│ • Matches circular against tenant licenses & payment rails   │
│ • If MATCH: Flags `is_applicable = true` with direct reason  │
│ • If NO MATCH: Flags `is_applicable = false` (Noise filtered)│
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ STAGE 4: 4-Way Multi-Role Impact Synthesis (Gemini Pro)      │
│ • Generates tailored operational action briefs:              │
│   1. COO Brief (Operations, settlement, partner banks)       │
│   2. CCO Brief (Statutory mandates, filings, penalties)      │
│   3. VP Product/Eng Brief (API specs, KYC schemas, DB migs)  │
│   4. CFO Brief (Capital reserves, fee impacts, levies)       │
│ • Extracts statutory deadline dates and priority level       │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ STAGE 5: Downstream Cascade Triggering                       │
│ • Trigger Pillar 3: Flags affected internal policies for gap │
│   concordance re-evaluation.                                 │
│ • Trigger Pillar 1: Flags active marketing campaigns for     │
│   compliance drift re-screening.                             │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ STAGE 6: Countdown Tracking, Realtime Alerting & SLA Engine  │
│ • Calculates exact remaining days (`statutory_deadline`)     │
│ • Broadcasts real-time alert to tenant dashboard             │
│ • Dispatches High/Critical alerts to ExCo email / Slack      │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Multi-Role Executive Action Synthesis (The 4 Briefs)

Every applicable circular is broken down into **role-specific operational briefings**:

```typescript
export interface MultiRoleExCoBrief {
  cooBrief: {
    operationalImpact: string;
    settlementRailsAffected: string[];
    partnerBankRequirements: string;
    immediateActionItems: string[];
  };
  ccoBrief: {
    statutoryMandateSummary: string;
    requiredRegulatoryFilings: string[];
    statutoryPenaltyRiskNaira: number;
    recommendedBoardReporting: string;
  };
  productEngineeringBrief: {
    apiSchemaChangesRequired: string[];
    kycWorkflowUpdates: string[];
    databaseMigrationNeeds: string[];
    technicalDeadline: string;
  };
  cfoBrief: {
    capitalReserveImpact: string;
    statutoryLevyDeductions: string;
    balanceSheetLiquidityGuidance: string;
    budgetAllocationRequiredNaira: number;
  };
}
```

---

## 5. Circular Lineage & Supersession Graph

Nigerian regulations are an iterative chain of amendments. Pillar 2 tracks this via the **Circular Supersession Graph**:

```
[ CBN Circular 2018 (Original) ] 
               │
               ▼ amended by
[ CBN Circular 2021-04 (Interim) ]
               │
               ▼ revoked & replaced by
[ CBN Circular 2026-08 (Active Statutory Law) ]
```

When viewing any circular or obligation, Cogent displays the **Lineage Status Badge**:
- 🟢 `ACTIVE_LAW`: The latest governing rule.
- 🟡 `AMENDED`: Portions of this circular have been modified by a newer directive.
- 🔴 `SUPERSEDED`: Entirely revoked; references to this document are obsolete.

---

## 6. Statutory Countdown Engine & Escalation SLA

1. **Deterministic Date Parsing:** Parses clauses such as *"Within thirty (30) days from the date of this circular"* into an absolute ISO deadline timestamp.
2. **Visual Dashboard Countdown:** Displays a prominent badge: e.g., `19 DAYS REMAINING UNTIL ENFORCEMENT`.
3. **Escalation Rules:**
   - **T-14 Days:** Automated alert to task owners.
   - **T-7 Days:** Escalation notification to CCO and COO.
   - **T-48 Hours:** Red critical alert to CEO and Board Risk Committee.

---

## 7. Downstream Cascade: The Connected Compliance Chain

When a circular is ratified by the CCO in Pillar 2:
1. **Cascade to Pillar 3 (Policy Gap Matrix):**
   - Automatically queries `policy_documents` and `policy_clauses`.
   - Identifies internal policies covering the affected domain (e.g., AML Policy, Consumer Protection Policy).
   - Marks affected clauses as `NEEDS_RE_EVALUATION`, prompting the CCO to run an updated Concordance Check.
2. **Cascade to Pillar 1 (Marketing Shield):**
   - If the circular touches consumer disclosures, APR calculations, or promotional claims, it triggers a drift check across all `APPROVED` marketing scans.
   - Flags any active public copy that conflicts with the new directive.

---

## 8. Structured Zod Schemas

```typescript
import { z } from 'zod';

export const RadarRoleBriefSchema = z.object({
  cooBrief: z.object({
    operationalImpact: z.string(),
    settlementRailsAffected: z.array(z.string()),
    partnerBankRequirements: z.string(),
    immediateActionItems: z.array(z.string())
  }),
  ccoBrief: z.object({
    statutoryMandateSummary: z.string(),
    requiredRegulatoryFilings: z.array(z.string()),
    statutoryPenaltyRiskNaira: z.number(),
    recommendedBoardReporting: z.string()
  }),
  productEngineeringBrief: z.object({
    apiSchemaChangesRequired: z.array(z.string()),
    kycWorkflowUpdates: z.array(z.string()),
    databaseMigrationNeeds: z.array(z.string()),
    technicalDeadline: z.string()
  }),
  cfoBrief: z.object({
    capitalReserveImpact: z.string(),
    statutoryLevyDeductions: z.string(),
    balanceSheetLiquidityGuidance: z.string(),
    budgetAllocationRequiredNaira: z.number()
  })
});

export const RadarTenantImpactSchema = z.object({
  isApplicable: z.boolean(),
  applicabilityRationale: z.string(),
  priorityLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  statutoryDeadlineIso: z.string().nullable(),
  roleBriefs: RadarRoleBriefSchema,
  actionItems: z.array(z.object({
    title: z.string(),
    role: z.enum(['COO', 'CCO', 'VP_PRODUCT_ENG', 'CFO']),
    description: z.string(),
    deadlineDays: z.number()
  }))
});

export type RadarTenantImpact = z.infer<typeof RadarTenantImpactSchema>;
```
