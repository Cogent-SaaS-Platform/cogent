# COGENT — Product Constitution (PRODUCT.md)

> **Version:** 1.1.0 (Hardened Foundation)  
> **Status:** RATIFIED & LOCKED  
> **Target Audience:** Engineering, Product, Design, and Commercial Teams  
> **Key Updates in v1.1:**
> - Explicit MVP Boundaries vs. Non-MVP Scope.
> - Measurable Success Criteria (Technical & Commercial).
> - Comprehensive Assumptions & Risk Register.
> - Epistemic modesty & evidence-bounded language (no "100% compliant" claims).
> - Clarified human CCO legal accountability under BOFIA 2020.

---

## 1. Product Mission & Vision

**Cogent** is an operational compliance and regulatory decision engine for Nigerian financial institutions, fintechs, and digital lenders.

In Nigeria's hyper-active financial market, regulatory compliance has historically been slow, manual, subjective, and fear-driven. Fintechs receive surprise midnight circulars from the Central Bank of Nigeria (CBN) with 14-day compliance deadlines and balance-sheet threatening fines (₦250M to ₦1B+). Meanwhile, advertising approval from the Advertising Regulatory Council of Nigeria (ARCON) is fraught with ambiguity, leading to immediate ₦1M–₦3M penalties and brand disruption.

Cogent converts regulatory compliance from a friction-filled roadblock into an automated operational asset and competitive advantage.

### The Immutable Philosophy
> **"The verified regulatory corpus, tenant institutional context, and audit trails are the asset. The LLM is strictly an interpretation, synthesis, and drafting layer."**

Cogent is **NOT**:
- A generic chatbot or "wrapper" around ChatGPT.
- An autonomous legal counsel or legal guarantee of immunity.
- A replacement for human accountability (the Chief Compliance Officer remains the legally recognized officer under BOFIA 2020).

---

## 2. Epistemic Modesty: Evidence-Bounded Truth

Cogent rejects the claim of "100% compliance" or absolute legal omniscience. The platform operates under strict **evidence-bounded logic**:
1. When no violation is found, the system reports **`NO_ISSUE_DETECTED`** (bounded strictly to the verified statutory rules retrieved in context), not "100% Compliant" or "Government Approved".
2. Cogent is an **Attestation Evidence Compiler**, not an attestation signer. It compiles the audit evidence, citations, and risk delta; the Chief Compliance Officer (CCO) must review and formally sign.
3. Every screen and export displays statutory disclaimers:
   *"Cogent provides operational compliance decision support based on published Nigerian statutory instruments. It does not constitute formal legal counsel."*

---

## 3. The Three Product Pillars

### Pillar 1: Marketing & Growth Pre-Vetting Shield
*Target Users: Growth Marketers, Copywriters, Product Managers, Compliance Officers*
- Pre-publication scanning of marketing copy across SMS, social, ads, and landing pages.
- Deterministic matching of prohibited financial terminology.
- Hybrid vector retrieval against ARCON Advertising Code 2022 and CBN Consumer Protection Framework 2019.
- Compliant rewrite generation via Gemini Pro that preserves marketing punch while ensuring statutory alignment.
- One-click export of ARCON Pre-Clearance Dossiers and CCO approval records.

### Pillar 2: Regulatory Radar & Circular Impact Tracer
*Target Users: COO, CCO, Head of Product, Engineering Leads, CFO*
- Ingestion and layout-preserving parsing of circulars from CBN, SEC, ARCON, NDPC, FCCPC, and NFIU.
- Deterministic institutional applicability matching based on tenant license profiles and active payment rails.
- Role-based executive impact briefs (COO, CCO, Product/Eng, CFO).
- Statutory deadline countdown clocks with automated escalation alerts.

### Pillar 3: 5-W Decision Gap Matrix & Audit Defense
*Target Users: Chief Compliance Officer, Internal Audit, Bank Examiners, Board*
- Semantic chunking of internal company policies.
- Clause-by-clause evaluation against statutory baselines into three tiers: **Adequately Met**, **Partially Met**, **Critical Gap**.
- The **5-W Decision Framework**: *What Happened, What to Know, What Changed, What to Do, Derived Insight*.
- Export of tamper-evident Bank Examiner Audit Defense Packs.

---

## 4. MVP Boundaries vs. Non-MVP Scope

### 4.1 What is Strictly IN the MVP (First Vertical Slice)
1. **Core Platform Foundation:** Clerk authentication mapped to `clerk_organization_id`, two-gate multi-tenant PostgreSQL RLS, and strict TypeScript modular monolith layout.
2. **Verified Regulatory Corpus (Initial Baseline):** Seeded ARCON Advertising Code 2022 and CBN Consumer Protection Framework 2019 with verified document version lineage and `gemini-embedding-2` vectors.
3. **Pillar 1 Marketing Pre-Vetting Shield:**
   - Multi-channel copy analysis (SMS, Social, Push, Ads).
   - Zero-latency deterministic prohibited terms matcher with statutory citation links.
   - Hybrid retrieval (pgvector + tsvector) for contextual regulatory clauses.
   - Gemini Pro candidate extraction and conversion-focused compliant rewriting.
   - Deterministic penalty and risk score calculation.
   - Split-view comparison UI with violation chips and penalty avoidance counter.
   - Cryptographic SHA-256 audit logging and exportable ARCON Pre-Clearance Dossier.

### 4.2 What is Strictly NON-MVP (Explicitly Deferred)
- Direct API integration with the ARCON ASP digital filing portal (manual submission via Cogent export for MVP).
- Full Pillar 2 (Regulatory Radar) and Pillar 3 (5-W Gap Matrix) (delivered in subsequent phases).
- In-app payment processing via Paystack/Flutterwave (billed manually/invoiced annually for initial institutional pilots).
- Enterprise SAML/SSO (Okta, Azure AD) (Clerk standard auth + Google/LinkedIn social suffices for MVP).
- Autonomous web crawlers for dark web or social media sentiment analysis.

---

## 5. Measurable Success Criteria

| Category | Metric | MVP Target |
| :--- | :--- | :--- |
| **Performance** | End-to-end marketing scan latency | **< 3.5 seconds** |
| **Deterministic Speed** | Prohibited terms regex matching | **< 50 milliseconds** |
| **Security** | Cross-tenant data leakage under automated RLS tests | **0 rows leaked (100% isolated)** |
| **Quality** | Deterministic rule test coverage | **100% unit test coverage** |
| **Epistemic Accuracy** | Ground truth benchmark accuracy on canonical test cases | **> 95% violation recall** |
| **Product Utility** | Marketer rewrite adoption rate in pilot testing | **> 75% rewrites accepted without edit** |

---

## 6. Assumptions & Risk Register

| Risk / Assumption | Impact | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **A1: Aggressive Regulatory Enforcement** | High | High | Nigerian regulators (CBN, ARCON) have increased fines exponentially in 2024–2026; market pain is acute and growing. |
| **R1: Regulatory Corpus Staleness** | High | Medium | Every document version in `regulatory_document_versions` has a `verification_status` and repeal tracking; unverified sources are clearly flagged. |
| **R2: Legal Liability for False Clearance** | Critical | Low | System uses evidence-bounded statuses (`NO_ISSUE_DETECTED`), enforces CCO human sign-off, and includes statutory disclaimers on every export. |
| **R3: AI Prompt Injection via Marketing Copy** | Medium | Medium | XML delimiter encapsulation (`<user_campaign_copy>`), closing-tag stripping, and meta-prompt hardening in the AI Engine. |
| **R4: Infrastructure FX Volatility** | Medium | Medium | Fixed $90/mo base stack (Supabase, Clerk, Vercel) where one customer on Growth Tier (₦350k/mo) covers >2.5x total monthly cloud costs. |
| **R5: Model API Deprecation** | Medium | High | Configurable model aliases (`FAST_MODEL`, `REASONING_MODEL`, `EMBEDDING_MODEL`) resolved via environment variables without code rewrites. |

---

## 7. Commercial Model & Pricing Strategy

- **7-Day Free Trial:** Full live scan of 5 marketing campaigns with real statutory citations.
- **Growth Tier:** ₦350,000 / month (Seed fintechs, digital lenders).
- **Business Scale Tier:** ₦850,000 / month (Series A/B fintechs, Microfinance Banks, PSSPs).
- **Enterprise Tier:** ₦2,500,000 to ₦4,000,000 / month (Commercial banks, super-fintechs).
- **Billing Frequency:** Annual or Quarterly upfront.
