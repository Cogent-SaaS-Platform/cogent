# COGENT — Database & Data Model Specification (DATA_MODEL.md)

> **Version:** 1.1.0 (Hardened Foundation)  
> **Status:** RATIFIED & LOCKED  
> **Target Engine:** PostgreSQL 16 (Supabase) + pgvector extension + pg_trgm  
> **Key Architecture Changes in v1.1:**
> - Full regulatory corpus provenance (Instruments, Document Versions, Clauses, Obligations, Penalties).
> - Explicit Clerk Organization ID mapping (`clerk_organization_id`).
> - Relational tenant context (`tenant_licenses` and `tenant_payment_rails`).
> - AI Analysis traceability ledger (`ai_analysis_runs`).
> - Complete RLS policies for 100% of tables including child tables with denormalized `organization_id`.
> - Deterministic `prohibited_terms` foreign key links back to verified regulatory clauses and obligations.

---

## 1. Database Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

---

## 2. Enumerations

```sql
-- Nigerian Regulatory Authorities
CREATE TYPE regulator_code_enum AS ENUM (
  'CBN',    -- Central Bank of Nigeria
  'ARCON',  -- Advertising Regulatory Council of Nigeria
  'SEC',    -- Securities and Exchange Commission
  'NDPC',   -- Nigeria Data Protection Commission
  'FCCPC',  -- Federal Competition & Consumer Protection Commission
  'NFIU'    -- Nigerian Financial Intelligence Unit
);

-- Regulatory Instrument Hierarchy & Classification
CREATE TYPE instrument_type_enum AS ENUM (
  'PRIMARY_ACT',           -- Act of National Assembly (e.g. BOFIA 2020, ARCON Act 2022)
  'SUBSIDIARY_REGULATION', -- Formal Gazette Regulations (e.g. CBN AML/CFT Regulations 2022)
  'REGULATORY_FRAMEWORK',  -- Published Framework (e.g. Consumer Protection Framework 2019)
  'CIRCULAR_DIRECTIVE',    -- Binding Circular / Directive (e.g. Midnight CBN Circulars)
  'OPERATIONAL_GUIDELINE', -- Technical Standards & Guidance Notes
  'ENFORCEMENT_NOTICE'     -- Specific warning or sanction notice
);

CREATE TYPE verification_status_enum AS ENUM (
  'UNVERIFIED_INGESTION',  -- Scraped or uploaded; pending human legal check
  'HUMAN_VERIFIED',        -- Verified against official government gazette / portal
  'LEGAL_COUNSEL_LOCKED'   -- Formally reviewed by Nigerian legal partner
);

CREATE TYPE obligation_type_enum AS ENUM (
  'STRICT_PROHIBITION',    -- Expressly forbidden (e.g., "zero interest", "guaranteed return")
  'MANDATORY_DISCLOSURE', -- Legally required statement or disclaimer
  'CONDITIONAL_PERMISSION',-- Allowed only if specific operational conditions are met
  'STATUTORY_TIMELINE',   -- Hard deadline (e.g., 72-hour STR reporting, 30-day attestation)
  'GOVERNANCE_CONTROL'    -- Board committee, audit oversight, or executive sign-off required
);

-- License Types for Nigerian Financial Institutions & Fintechs
CREATE TYPE license_type_enum AS ENUM (
  'COMMERCIAL_BANK',
  'MERCHANT_BANK',
  'PAYMENT_SERVICE_BANK',
  'MICROFINANCE_BANK_NATIONAL',
  'MICROFINANCE_BANK_STATE',
  'MICROFINANCE_BANK_UNIT',
  'FINANCE_COMPANY',
  'SWITCHING_AND_PROCESSING',
  'PAYMENT_SOLUTION_SERVICES_PSSP',
  'PAYMENT_TERMINAL_SERVICE_PROVIDER_PTSP',
  'MOBILE_MONEY_OPERATOR_MMO',
  'SUPER_AGENT',
  'DIGITAL_LENDER_FCCPC_REGISTERED',
  'SEC_REGISTERED_DIGITAL_SUB_BROKER',
  'SEC_REGISTERED_ROBO_ADVISOR',
  'CRYPTO_VASP_SEC_APPROVED'
);

-- Payment Rails Operating in Nigeria
CREATE TYPE payment_rail_enum AS ENUM (
  'NIBSS_NIP',
  'NIBSS_CENTRAL_PAY',
  'INTERSWITCH_WEBPAY',
  'PAYSTACK',
  'FLUTTERWAVE',
  'DIRECT_DEBIT_ACH',
  'CARD_ACQUIRING_VERVE',
  'CARD_ACQUIRING_MASTERCARD_VISA',
  'USSD',
  'AGENT_BANKING_CASH_IN_OUT'
);

-- Tenancy RBAC Roles & Departments
CREATE TYPE org_role_enum AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

CREATE TYPE org_department_enum AS ENUM (
  'EXECUTIVE_LEADERSHIP',
  'COMPLIANCE_LEGAL',
  'GROWTH_MARKETING',
  'PRODUCT_MANAGEMENT',
  'ENGINEERING_TECH',
  'OPERATIONS',
  'TREASURY_FINANCE'
);

-- Marketing Scan Statuses (Evidence-Bounded)
CREATE TYPE marketing_channel_enum AS ENUM (
  'SMS_BLAST',
  'SOCIAL_MEDIA_POST',
  'IN_APP_PUSH_NOTIFICATION',
  'LANDING_PAGE_WEBSITE',
  'EMAIL_NEWSLETTER',
  'OUTDOOR_BILLBOARD',
  'RADIO_TV_SCRIPT'
);

CREATE TYPE scan_verdict_enum AS ENUM (
  'NO_ISSUE_DETECTED',     -- Bounded to verified retrieved rules; no issues detected
  'REVIEW_RECOMMENDED',    -- Borderline or ambiguous copy; human review advised
  'ISSUE_DETECTED',        -- Clear statutory violation; remediation required
  'BLOCKING_ISSUE'         -- Severe multi-regulator violation or existential fine risk
);

CREATE TYPE human_approval_status_enum AS ENUM (
  'PENDING_REVIEW',
  'APPROVED_BY_CCO',
  'MODIFIED_AND_APPROVED',
  'REJECTED'
);

-- Pillar 2 & 3 Enums
CREATE TYPE radar_priority_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL_EMERGENCY');

CREATE TYPE compliance_status_enum AS ENUM (
  'ADEQUATELY_MET',
  'PARTIALLY_MET',
  'CRITICAL_GAP'
);

CREATE TYPE severity_level_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
```

---

## 3. The Verified Regulatory Corpus (Moat & Provenance)

The regulatory corpus is modeled with full version lineage, gazette citations, repeal tracking, and backward links from deterministic rules.

```
[ RegulatoryBody ]
        │ 1
        ▼ *
[ RegulatoryInstrument ] (e.g. BOFIA 2020, ARCON Act 2022)
        │ 1
        ▼ *
[ RegulatoryDocumentVersion ] (v1.0, 2025 Amendment, Circular Revision)
        │ 1
        ▼ *
[ RegulatoryClause ] (Section 24(1)(a) with 768d embedding)
        │ 1
        ├──* [ RegulatoryObligation ] ──► [ ProhibitedTerm ] (FK backwards)
        │            │ 1
        │            ▼ *
        │    [ StatutoryPenalty ]
        │
        └──* [ ApplicabilityRule ] (Licenses & Rails impacted)
```

```sql
-- 1. Regulatory Bodies
CREATE TABLE regulatory_bodies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code regulator_code_enum UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  enforcement_power_summary TEXT NOT NULL,
  official_portal_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Regulatory Instruments (The enduring legal entity)
CREATE TABLE regulatory_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body_id UUID NOT NULL REFERENCES regulatory_bodies(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,                  -- e.g. "Banks and Other Financial Institutions Act"
  short_name VARCHAR(100) NOT NULL,     -- e.g. "BOFIA 2020"
  instrument_type instrument_type_enum NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Document Versions (Version lineage, amendments, and verification state)
CREATE TABLE regulatory_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID NOT NULL REFERENCES regulatory_instruments(id) ON DELETE CASCADE,
  version_number VARCHAR(50) NOT NULL,  -- e.g. "2020-ORIGINAL", "2024-AMENDMENT-01"
  reference_code VARCHAR(100) NOT NULL, -- Gazette reference or circular code
  publication_date DATE NOT NULL,
  effective_date DATE NOT NULL,
  canonical_source_url TEXT NOT NULL,
  source_file_url TEXT NOT NULL,        -- Storage path in private Supabase bucket
  source_file_hash VARCHAR(64) NOT NULL,-- SHA-256 of primary document
  verification_status verification_status_enum NOT NULL DEFAULT 'UNVERIFIED_INGESTION',
  verified_by_user_id UUID,             -- Staff / Legal Reviewer ID
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  superseded_by_id UUID REFERENCES regulatory_document_versions(id),
  repealed_at TIMESTAMPTZ,
  repealed_by_document_id UUID REFERENCES regulatory_document_versions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Regulatory Clauses (Atomic text chunks with embeddings)
CREATE TABLE regulatory_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id UUID NOT NULL REFERENCES regulatory_document_versions(id) ON DELETE CASCADE,
  section_reference VARCHAR(100) NOT NULL, -- e.g. "Section 24(1)(a)"
  section_heading TEXT,
  clause_text TEXT NOT NULL,
  page_number INTEGER,
  paragraph_reference VARCHAR(50),
  embedding vector(768),                   -- gemini-embedding-2 (768d)
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(section_heading, '') || ' ' || clause_text)) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Regulatory Obligations (What must or must not be done)
CREATE TABLE regulatory_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_id UUID NOT NULL REFERENCES regulatory_clauses(id) ON DELETE CASCADE,
  obligation_type obligation_type_enum NOT NULL,
  summary TEXT NOT NULL,
  severity_floor severity_level_enum NOT NULL DEFAULT 'HIGH',
  statutory_timeline_days INTEGER,        -- e.g. 3 (72 hours), 30 (monthly attestation)
  mandatory_disclosure_text TEXT,          -- Verbatim required disclosure text
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Applicability Rules (Relational targeting for institutions and rails)
CREATE TABLE applicability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES regulatory_obligations(id) ON DELETE CASCADE,
  applicable_license_type license_type_enum,
  applicable_payment_rail payment_rail_enum,
  minimum_capital_threshold_naira NUMERIC(16, 2),
  all_institutions_flag BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Statutory Penalties (Quantified liability backed by legal citation)
CREATE TABLE statutory_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES regulatory_obligations(id) ON DELETE CASCADE,
  penalty_min_naira NUMERIC(14, 2) NOT NULL DEFAULT 0,
  penalty_max_naira NUMERIC(14, 2) NOT NULL DEFAULT 0,
  daily_fine_naira NUMERIC(12, 2) NOT NULL DEFAULT 0,
  carries_personal_criminal_liability BOOLEAN NOT NULL DEFAULT false,
  carries_license_suspension_risk BOOLEAN NOT NULL DEFAULT false,
  penalty_legal_citation TEXT NOT NULL,    -- e.g. "Section 57(2) BOFIA 2020"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Prohibited Terms (Deterministic Pattern Matcher with Full Provenance)
CREATE TABLE prohibited_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES regulatory_obligations(id) ON DELETE RESTRICT,
  clause_id UUID NOT NULL REFERENCES regulatory_clauses(id) ON DELETE RESTRICT,
  regulator_code regulator_code_enum NOT NULL,
  exact_pattern TEXT NOT NULL,             -- e.g. "guaranteed return", "zero interest loan"
  is_regex BOOLEAN NOT NULL DEFAULT false,
  severity severity_level_enum NOT NULL DEFAULT 'CRITICAL',
  statutory_rationale TEXT NOT NULL,
  mandatory_disclosure_required TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 4. Identity, Tenancy & Relational Institutional Context

```sql
-- 1. Organizations (Tenants)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_organization_id VARCHAR(128) UNIQUE NOT NULL, -- Maps directly to Clerk org_id claim
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  rc_number VARCHAR(50),
  fccpc_registration_number VARCHAR(50),
  cbn_approval_ref VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Users (Mirrors Clerk user identity)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id VARCHAR(128) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Organization Memberships (RBAC & Department mapping)
CREATE TABLE organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role org_role_enum NOT NULL DEFAULT 'MEMBER',
  department org_department_enum NOT NULL DEFAULT 'COMPLIANCE_LEGAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- 4. Tenant Licenses (Rich relational license profile)
CREATE TABLE tenant_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  license_type license_type_enum NOT NULL,
  license_number VARCHAR(100),
  issuing_regulator regulator_code_enum NOT NULL,
  issuance_date DATE,
  renewal_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  operating_conditions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tenant Payment Rails (Rich relational payment rail profile)
CREATE TABLE tenant_payment_rails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rail_type payment_rail_enum NOT NULL,
  integration_status VARCHAR(50) NOT NULL DEFAULT 'LIVE_PRODUCTION',
  settlement_bank_code VARCHAR(20),
  daily_volume_tier VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 5. AI Traceability & Execution Tracking

Every AI invocation is logged with complete parameter provenance, retrieved evidence citations, and token accounting.

```sql
CREATE TYPE ai_pipeline_enum AS ENUM (
  'MARKETING_PREVET',
  'RADAR_CIRCULAR_EXTRACTION',
  'RADAR_IMPACT_SYNTHESIS',
  'GAP_MATRIX_EVALUATION',
  'REWRITE_GENERATION'
);

CREATE TABLE ai_analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  pipeline_type ai_pipeline_enum NOT NULL,
  model_identifier VARCHAR(100) NOT NULL, -- e.g. "gemini-3.8-flash" or "gemini-3.5-pro"
  model_config JSONB NOT NULL DEFAULT '{}',-- Temperature, top_p, max_tokens
  prompt_template_version VARCHAR(50) NOT NULL,
  input_token_count INTEGER NOT NULL DEFAULT 0,
  output_token_count INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  retrieved_clause_ids UUID[] NOT NULL DEFAULT '{}',
  triggered_rule_ids UUID[] NOT NULL DEFAULT '{}',
  raw_prompt_hash VARCHAR(64) NOT NULL,
  raw_output_hash VARCHAR(64) NOT NULL,
  human_approval_status human_approval_status_enum NOT NULL DEFAULT 'PENDING_REVIEW',
  reviewed_by_user_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 6. Pillar 1: Marketing Shield (With Denormalized Tenancy)

```sql
CREATE TABLE marketing_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  analysis_run_id UUID REFERENCES ai_analysis_runs(id),
  campaign_name VARCHAR(255) NOT NULL,
  channel marketing_channel_enum NOT NULL,
  target_audience TEXT,
  raw_copy TEXT NOT NULL,
  verdict scan_verdict_enum NOT NULL DEFAULT 'REVIEW_RECOMMENDED',
  overall_risk_score INTEGER NOT NULL DEFAULT 0, -- 0 (Safe) to 100 (Severe Violation)
  deterministic_penalty_naira NUMERIC(14, 2) NOT NULL DEFAULT 0, -- CALCULATED DETERMINISTICALLY
  compliant_rewrite_full TEXT,
  arcon_preclearance_required BOOLEAN NOT NULL DEFAULT true,
  approval_status human_approval_status_enum NOT NULL DEFAULT 'PENDING_REVIEW',
  approved_by_user_id UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Child table: Denormalized organization_id for strict, performant RLS
CREATE TABLE marketing_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scan_id UUID NOT NULL REFERENCES marketing_scans(id) ON DELETE CASCADE,
  prohibited_term_id UUID REFERENCES prohibited_terms(id),
  obligation_id UUID REFERENCES regulatory_obligations(id),
  clause_id UUID REFERENCES regulatory_clauses(id),
  rule_code VARCHAR(100) NOT NULL,
  flagged_text TEXT NOT NULL,
  severity severity_level_enum NOT NULL,
  finding_type VARCHAR(50) NOT NULL, -- 'DETERMINISTIC_MATCH', 'AI_CANDIDATE_MATCH'
  explanation TEXT NOT NULL,
  recommended_fix TEXT NOT NULL,
  statutory_citation TEXT NOT NULL,
  statutory_penalty_naira NUMERIC(12, 2) NOT NULL DEFAULT 0 -- COMPUTED DETERMINISTICALLY
);

-- Institutional Memory Engine: Approved Phrasings Ledger
CREATE TABLE tenant_claims_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_category VARCHAR(64) NOT NULL, -- 'SAVINGS_DEPOSIT', 'DIGITAL_NANO_LOAN', etc.
  approved_text TEXT NOT NULL,
  prohibited_counterpart TEXT,
  governing_regulator regulator_code_enum NOT NULL,
  statutory_citation TEXT NOT NULL,
  cco_rationale TEXT NOT NULL,
  approved_by_user_id UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Post-Publish Drift & Live Asset Watcher
CREATE TABLE marketing_live_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES marketing_scans(id) ON DELETE SET NULL,
  live_url TEXT NOT NULL,
  channel marketing_channel_enum NOT NULL,
  original_approved_hash VARCHAR(64) NOT NULL,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  drift_status VARCHAR(32) NOT NULL DEFAULT 'SYNCED', -- 'SYNCED', 'DRIFT_DETECTED', 'ERROR'
  drift_findings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 7. Pillar 2: Regulatory Radar Module

```sql
CREATE TABLE radar_circulars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id UUID NOT NULL REFERENCES regulatory_document_versions(id) ON DELETE CASCADE,
  circular_number VARCHAR(100) NOT NULL,
  subject TEXT NOT NULL,
  summary TEXT NOT NULL,
  priority radar_priority_enum NOT NULL DEFAULT 'MEDIUM',
  statutory_deadline DATE,
  enforcement_risk_level VARCHAR(50) NOT NULL,
  targeted_license_types license_type_enum[] NOT NULL DEFAULT '{}',
  affected_payment_rails payment_rail_enum[] NOT NULL DEFAULT '{}',
  applies_universally BOOLEAN NOT NULL DEFAULT false,
  lineage_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE_LAW', -- 'ACTIVE_LAW', 'AMENDED', 'SUPERSEDED'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Circular Lineage & Supersession Graph
CREATE TABLE circular_supersession_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_circular_id UUID NOT NULL REFERENCES radar_circulars(id) ON DELETE CASCADE,
  child_circular_id UUID NOT NULL REFERENCES radar_circulars(id) ON DELETE CASCADE,
  amendment_type VARCHAR(32) NOT NULL, -- 'AMENDS', 'REVOKES_AND_REPLACES', 'PARTIALLY_REPEALS'
  affected_clause_references TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_circular_id, child_circular_id)
);

CREATE TABLE radar_tenant_impacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  circular_id UUID NOT NULL REFERENCES radar_circulars(id) ON DELETE CASCADE,
  analysis_run_id UUID REFERENCES ai_analysis_runs(id),
  is_applicable BOOLEAN NOT NULL DEFAULT true,
  applicability_reason TEXT NOT NULL,
  executive_brief_cco TEXT NOT NULL,
  action_brief_coo TEXT NOT NULL,
  technical_brief_product_eng TEXT NOT NULL,
  financial_brief_cfo TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'NEW',
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, circular_id)
);

CREATE TABLE radar_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  impact_id UUID NOT NULL REFERENCES radar_tenant_impacts(id) ON DELETE CASCADE,
  target_department org_department_enum NOT NULL,
  action_title VARCHAR(255) NOT NULL,
  action_description TEXT NOT NULL,
  assigned_to_user_id UUID REFERENCES users(id),
  suggested_deadline DATE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 8. Pillar 3: 5-W Decision Gap Matrix Module

```sql
CREATE TABLE policy_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  department org_department_enum NOT NULL,
  version_tag VARCHAR(50) NOT NULL DEFAULT '1.0',
  storage_path TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  source_file_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Child table: Denormalized organization_id for performant RLS
CREATE TABLE policy_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES policy_documents(id) ON DELETE CASCADE,
  section_number VARCHAR(50) NOT NULL,
  clause_text TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE gap_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES policy_documents(id) ON DELETE CASCADE,
  benchmark_document_version_id UUID NOT NULL REFERENCES regulatory_document_versions(id),
  analysis_run_id UUID REFERENCES ai_analysis_runs(id),
  overall_compliance_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
  critical_gaps_count INTEGER NOT NULL DEFAULT 0,
  partially_met_count INTEGER NOT NULL DEFAULT 0,
  adequately_met_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Child table: Denormalized organization_id for performant RLS
CREATE TABLE gap_matrix_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  evaluation_id UUID NOT NULL REFERENCES gap_evaluations(id) ON DELETE CASCADE,
  regulatory_clause_id UUID NOT NULL REFERENCES regulatory_clauses(id),
  obligation_id UUID REFERENCES regulatory_obligations(id),
  policy_clause_id UUID REFERENCES policy_clauses(id),
  compliance_status compliance_status_enum NOT NULL,
  statutory_penalty_naira NUMERIC(14, 2) NOT NULL DEFAULT 0, -- DETERMINISTIC
  what_happened TEXT NOT NULL,
  what_to_know TEXT NOT NULL,
  what_has_changed TEXT NOT NULL,
  what_to_do TEXT NOT NULL,
  draft_replacement_language TEXT, -- Ready-to-adopt board policy wording
  derived_insight TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 9. Immutable Audit Ledger & Notifications

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  sha256_input_hash VARCHAR(64) NOT NULL,
  sha256_output_hash VARCHAR(64) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 10. Performance Indexing Strategy

```sql
-- GIN Indexes for Full-Text Search
CREATE INDEX idx_regulatory_clauses_tsv ON regulatory_clauses USING GIN(tsv);

-- Vector Indexes (HNSW with Cosine Similarity for 768d vectors)
CREATE INDEX idx_regulatory_clauses_embedding 
  ON regulatory_clauses USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_policy_clauses_embedding 
  ON policy_clauses USING hnsw (embedding vector_cosine_ops);

-- Tenancy Compound Indexes
CREATE INDEX idx_org_clerk_id ON organizations(clerk_organization_id);
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_org_memberships_lookup ON organization_memberships(organization_id, user_id);
CREATE INDEX idx_tenant_licenses_org ON tenant_licenses(organization_id);
CREATE INDEX idx_tenant_payment_rails_org ON tenant_payment_rails(organization_id);
CREATE INDEX idx_ai_analysis_runs_org ON ai_analysis_runs(organization_id, created_at DESC);
CREATE INDEX idx_marketing_scans_org ON marketing_scans(organization_id, created_at DESC);
CREATE INDEX idx_marketing_findings_org ON marketing_findings(organization_id, scan_id);
CREATE INDEX idx_radar_impacts_org ON radar_tenant_impacts(organization_id, circular_id);
CREATE INDEX idx_radar_action_items_org ON radar_action_items(organization_id, impact_id);
CREATE INDEX idx_policy_documents_org ON policy_documents(organization_id);
CREATE INDEX idx_policy_clauses_org ON policy_clauses(organization_id, policy_id);
CREATE INDEX idx_gap_evaluations_org ON gap_evaluations(organization_id, created_at DESC);
CREATE INDEX idx_gap_matrix_items_org ON gap_matrix_items(organization_id, evaluation_id);
CREATE INDEX idx_audit_logs_org_date ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_notifications_org_user ON notifications(organization_id, user_id, is_read);
```

---

## 11. Complete Row-Level Security (RLS) Policy Specifications

### 11.1 Identity Resolution Contract: Clerk JWT Claims
Supabase authenticates requests using Clerk's JWT template. The active organization is extracted from `auth.jwt() -> 'org_id'` (matching `clerk_organization_id` on the `organizations` table).

To optimize query execution, we define a cached SQL helper function:

```sql
CREATE OR REPLACE FUNCTION current_org_id() 
RETURNS UUID AS $$
  SELECT id FROM organizations 
  WHERE clerk_organization_id = (auth.jwt() ->> 'org_id')
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### 11.2 Public / Global Tables (Read by Authenticated, Write by Service Role)
`regulatory_bodies`, `regulatory_instruments`, `regulatory_document_versions`, `regulatory_clauses`, `regulatory_obligations`, `applicability_rules`, `statutory_penalties`, `prohibited_terms`, `radar_circulars`.

```sql
ALTER TABLE regulatory_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE statutory_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE prohibited_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_circulars ENABLE ROW LEVEL SECURITY;

-- Standard Public Read Policy for Authenticated Users
CREATE POLICY public_read_regulatory_bodies ON regulatory_bodies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY public_read_regulatory_instruments ON regulatory_instruments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY public_read_regulatory_document_versions ON regulatory_document_versions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY public_read_regulatory_clauses ON regulatory_clauses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY public_read_regulatory_obligations ON regulatory_obligations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY public_read_applicability_rules ON applicability_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY public_read_statutory_penalties ON statutory_penalties
  FOR SELECT TO authenticated USING (true);
CREATE POLICY public_read_prohibited_terms ON prohibited_terms
  FOR SELECT TO authenticated USING (true);
CREATE POLICY public_read_radar_circulars ON radar_circulars
  FOR SELECT TO authenticated USING (true);
```

### 11.3 Tenant Tables (Enforced via `organization_id = current_org_id()`)

Every tenant-private table and child table enforces this policy:

```sql
-- Enable RLS on all tenant tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_payment_rails ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_tenant_impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE gap_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gap_matrix_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies
CREATE POLICY tenant_org_policy ON organizations
  FOR ALL TO authenticated USING (id = current_org_id());

CREATE POLICY tenant_memberships_policy ON organization_memberships
  FOR ALL TO authenticated USING (organization_id = current_org_id());

CREATE POLICY tenant_licenses_policy ON tenant_licenses
  FOR ALL TO authenticated USING (organization_id = current_org_id());

CREATE POLICY tenant_rails_policy ON tenant_payment_rails
  FOR ALL TO authenticated USING (organization_id = current_org_id());

CREATE POLICY tenant_ai_runs_policy ON ai_analysis_runs
  FOR ALL TO authenticated USING (organization_id = current_org_id());

CREATE POLICY tenant_marketing_scans_policy ON marketing_scans
  FOR ALL TO authenticated USING (organization_id = current_org_id());

CREATE POLICY tenant_marketing_findings_policy ON marketing_findings
  FOR ALL TO authenticated USING (organization_id = current_org_id());

CREATE POLICY tenant_radar_impacts_policy ON radar_tenant_impacts
  FOR ALL TO authenticated USING (organization_id = current_org_id());

CREATE POLICY tenant_radar_actions_policy ON radar_action_items
  FOR ALL TO authenticated USING (organization_id = current_org_id());

CREATE POLICY tenant_policies_policy ON policy_documents
  FOR ALL TO authenticated USING (organization_id = current_org_id());

CREATE POLICY tenant_policy_clauses_policy ON policy_clauses
  FOR ALL TO authenticated USING (organization_id = current_org_id());

CREATE POLICY tenant_gap_evaluations_policy ON gap_evaluations
  FOR ALL TO authenticated USING (organization_id = current_org_id());

CREATE POLICY tenant_gap_matrix_items_policy ON gap_matrix_items
  FOR ALL TO authenticated USING (organization_id = current_org_id());

CREATE POLICY tenant_claims_ledger_policy ON tenant_claims_ledger
  FOR ALL TO authenticated USING (organization_id = current_org_id());

CREATE POLICY tenant_live_assets_policy ON marketing_live_assets
  FOR ALL TO authenticated USING (organization_id = current_org_id());

CREATE POLICY tenant_audit_logs_policy ON audit_logs
  FOR ALL TO authenticated USING (organization_id = current_org_id());

CREATE POLICY tenant_notifications_policy ON notifications
  FOR ALL TO authenticated USING (organization_id = current_org_id());
```

### 11.4 Privileged Access Quarantine
- **The Service-Role Key:** Supabase's `service_role` key explicitly bypasses RLS.
- **Rule:** The `service_role` key is **strictly quarantined** to database migration scripts, initial seeding runners, and verified Inngest system workers. It is **banned** from being passed to browser clients or used in standard tenant API routes.
