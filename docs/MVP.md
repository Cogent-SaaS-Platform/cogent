# COGENT — Minimum Viable Product & First Vertical Slice (MVP.md)

> **Version:** 1.1.0 (Hardened Foundation)  
> **Status:** RATIFIED & LOCKED  
> **First Vertical Slice:** Pillar 1 — Marketing & Growth Pre-Vetting Shield  
> **Key Updates in v1.1:**
> - Integrated evidence-bounded statuses (`NO_ISSUE_DETECTED`, `REVIEW_RECOMMENDED`, `ISSUE_DETECTED`, `BLOCKING_ISSUE`).
> - Human approval governance (`PENDING_REVIEW` → `APPROVED_BY_CCO`).
> - AI candidate extraction decoupled from deterministic statutory penalty calculations.
> - Full traceability verification via `ai_analysis_runs`.
> - Tested on relational tenant profiles (`tenant_licenses`, `tenant_payment_rails`).

---

## 1. Objective of the First Vertical Slice

The goal of the first vertical slice is a fully functional, production-grade slice of Cogent that proves the entire technical, regulatory, and commercial thesis end-to-end:

1. **Authentication & Multi-Tenancy:** User authenticates via Clerk, binds to an Organization mapped via `clerk_organization_id`, and accesses their private tenant workspace.
2. **Relational Tenant Context:** Tenant profile possesses active relational records in `tenant_licenses` (e.g. `DIGITAL_LENDER_FCCPC_REGISTERED`, `PAYMENT_SOLUTION_SERVICES_PSSP`) and `tenant_payment_rails` (`NIBSS_NIP`).
3. **Deterministic Engine:** Zero-latency (< 50ms) pattern matching of prohibited financial phrases linked back to verified statutory obligations.
4. **Hybrid Statutory Retrieval:** PostgreSQL full-text search (`tsvector`) + vector search (`pgvector` via `gemini-embedding-2` 768d) against verified seeds of the **ARCON Advertising Code 2022** and **CBN Consumer Protection Framework 2019**.
5. **AI Extraction & Rewriting:** Google Gemini Pro extracts candidate rule codes, explains violations, and outputs a high-converting compliant rewrite.
6. **Deterministic Penalty Engine:** Application code looks up statutory minimum/maximum fines, verifies license applicability, and calculates penalty exposure.
7. **Traceability & Audit Logging:** Records parameter and citation provenance in `ai_analysis_runs` and writes an immutable SHA-256 hash log to `audit_logs`.
8. **Exportable Dossier:** One-click generation of the **ARCON Pre-Clearance & CCO Attestation Dossier**.

---

## 2. Canonical Test Fixtures (Ground Truth Scenarios)

### Test Scenario A: Aggressive Digital Lending SMS
```text
"Urgent Cash Alert! Get ₦250,000 instant loan in 5 mins directly to your account! Zero interest, 100% guaranteed approval, no collateral, no credit checks. Download QuickKash app now!"
```
- **Violations Detected:**
  - *"Zero interest"* — CBN Consumer Protection Framework Section 3.2 (Deceptive pricing).
  - *"100% guaranteed approval"* — ARCON Code Section 24(1) (Misleading guarantee).
  - *"No credit checks"* — FCCPC Lending Guidelines 2022 Section 5 (Mandatory credit assessment).
  - *Missing mandatory disclosure* — "Licensed by FCCPC / CBN" not stated.
- **System Verdict:** `BLOCKING_ISSUE`
- **Deterministic Penalty Exposure:** ₦2,500,000 minimum fine.
- **Expected Compliant Rewrite:**
  *"Need business or personal funds? Access up to ₦250,000 fast with transparent rates and flexible repayment terms. Subject to credit assessment. QuickKash is a digital lending platform registered with the FCCPC."*

### Test Scenario B: High-Yield Savings & Investment Ad
```text
"Tired of inflation? Invest your Naira in PrimeYield and earn 35% risk-free annual return guaranteed! Your capital is 100% safe and backed by the government."
```
- **Violations Detected:**
  - *"35% risk-free annual return guaranteed"* — SEC Code of Conduct & ARCON Section 18 (Unrealistic guaranteed yield).
  - *"Backed by the government"* — CBN / NDIC False Representation Rule (Fraudulent backing claim).
- **System Verdict:** `BLOCKING_ISSUE`
- **Deterministic Penalty Exposure:** ₦3,000,000 minimum fine + immediate regulatory suspension risk.

---

## 3. First Vertical Slice Acceptance Criteria

| ID | Criterion | Verification Method |
| :--- | :--- | :--- |
| **AC-01** | User logs in and tenant profile displays active licenses (`PSSP`, `Digital Lender`) from `tenant_licenses`. | Playwright UI test & Session inspection. |
| **AC-02** | Pasting Test Scenario A into the editor triggers deterministic match in < 50ms. | Vitest unit test. |
| **AC-03** | Full scan executes and returns complete result with citations in < 3.5 seconds. | API latency telemetry. |
| **AC-04** | AI outputs candidate rule codes; penalties and mandatory disclosures are computed deterministically. | Schema assertion test. |
| **AC-05** | System verdict returns `BLOCKING_ISSUE`; status is `PENDING_REVIEW` until CCO approves. | Database & UI assertion. |
| **AC-06** | Every finding cites an exact section of ARCON Code 2022 or CBN Consumer Protection. | Schema assertion test. |
| **AC-07** | Scan and child findings are saved with proper `organization_id` denormalized. | Database query assertion. |
| **AC-08** | Attempting to access scan from another organization ID returns empty set via PostgreSQL RLS. | Automated RLS security test. |
| **AC-09** | Execution parameters and token metrics are logged to `ai_analysis_runs`. | Audit query assertion. |
| **AC-10** | CCO Pre-Clearance Dossier exports with SHA-256 hash and CCO signature block. | File export verification. |
