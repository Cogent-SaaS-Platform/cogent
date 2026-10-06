-- ==============================================================================
-- COGENT MIGRATION 20261002000001: INITIAL SCHEMA & REGULATORY PROVENANCE
-- Adheres to docs/DATA_MODEL.md v1.1 and docs/ENGINEERING.md
-- ==============================================================================

-- 1. Database Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Enumerations

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

CREATE TYPE severity_level_enum AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
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

CREATE TYPE radar_priority_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL_EMERGENCY');

CREATE TYPE compliance_status_enum AS ENUM (
  'ADEQUATELY_MET',
  'PARTIALLY_MET',
  'CRITICAL_GAP',
  'NOT_APPLICABLE',
  'PENDING_REVIEW'
);

CREATE TYPE ai_pipeline_enum AS ENUM (
  'MARKETING_PREVET',
  'RADAR_CIRCULAR_EXTRACTION',
  'RADAR_IMPACT_SYNTHESIS',
  'GAP_MATRIX_EVALUATION',
  'REWRITE_GENERATION'
);

-- 3. The Verified Regulatory Corpus (Moat & Provenance)

-- 3.1 Regulatory Bodies
CREATE TABLE regulatory_bodies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code regulator_code_enum UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  enforcement_power_summary TEXT NOT NULL,
  official_portal_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.2 Regulatory Instruments (The enduring legal entity)
CREATE TABLE regulatory_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body_id UUID NOT NULL REFERENCES regulatory_bodies(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  short_name VARCHAR(100) NOT NULL,
  instrument_type instrument_type_enum NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.3 Document Versions (Version lineage, amendments, and verification state)
CREATE TABLE regulatory_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID NOT NULL REFERENCES regulatory_instruments(id) ON DELETE CASCADE,
  version_number VARCHAR(50) NOT NULL,
  reference_code VARCHAR(100) NOT NULL,
  publication_date DATE NOT NULL,
  effective_date DATE NOT NULL,
  canonical_source_url TEXT NOT NULL,
  source_file_url TEXT NOT NULL,
  source_file_hash VARCHAR(64) NOT NULL,
  verification_status verification_status_enum NOT NULL DEFAULT 'UNVERIFIED_INGESTION',
  verified_by_user_id UUID,
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  superseded_by_id UUID REFERENCES regulatory_document_versions(id),
  repealed_at TIMESTAMPTZ,
  repealed_by_document_id UUID REFERENCES regulatory_document_versions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.4 Regulatory Clauses (Atomic text chunks with embeddings)
CREATE TABLE regulatory_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id UUID NOT NULL REFERENCES regulatory_document_versions(id) ON DELETE CASCADE,
  section_reference VARCHAR(100) NOT NULL,
  section_heading TEXT,
  clause_text TEXT NOT NULL,
  page_number INTEGER,
  paragraph_reference VARCHAR(50),
  embedding vector(768),
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(section_heading, '') || ' ' || clause_text)) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.5 Regulatory Obligations
CREATE TABLE regulatory_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_id UUID NOT NULL REFERENCES regulatory_clauses(id) ON DELETE CASCADE,
  obligation_type obligation_type_enum NOT NULL,
  summary TEXT NOT NULL,
  severity_floor severity_level_enum NOT NULL DEFAULT 'HIGH',
  statutory_timeline_days INTEGER,
  mandatory_disclosure_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.6 Applicability Rules (Relational targeting for institutions and rails)
CREATE TABLE applicability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES regulatory_obligations(id) ON DELETE CASCADE,
  applicable_license_type license_type_enum,
  applicable_payment_rail payment_rail_enum,
  minimum_capital_threshold_naira NUMERIC(16, 2),
  all_institutions_flag BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.7 Statutory Penalties (Quantified liability backed by legal citation)
CREATE TABLE statutory_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES regulatory_obligations(id) ON DELETE CASCADE,
  penalty_min_naira NUMERIC(14, 2) NOT NULL DEFAULT 0,
  penalty_max_naira NUMERIC(14, 2) NOT NULL DEFAULT 0,
  daily_fine_naira NUMERIC(12, 2) NOT NULL DEFAULT 0,
  carries_personal_criminal_liability BOOLEAN NOT NULL DEFAULT false,
  carries_license_suspension_risk BOOLEAN NOT NULL DEFAULT false,
  penalty_legal_citation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.8 Prohibited Terms (Deterministic Pattern Matcher with Provenance)
CREATE TABLE prohibited_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES regulatory_obligations(id) ON DELETE RESTRICT,
  clause_id UUID NOT NULL REFERENCES regulatory_clauses(id) ON DELETE RESTRICT,
  regulator_code regulator_code_enum NOT NULL,
  exact_pattern TEXT NOT NULL,
  is_regex BOOLEAN NOT NULL DEFAULT false,
  severity severity_level_enum NOT NULL DEFAULT 'CRITICAL',
  statutory_rationale TEXT NOT NULL,
  mandatory_disclosure_required TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Identity, Tenancy & Relational Context

-- 4.1 Organizations (Tenants)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_organization_id VARCHAR(128) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  rc_number VARCHAR(50),
  fccpc_registration_number VARCHAR(50),
  cbn_approval_ref VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.2 Users (Mirrors Clerk user identity)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id VARCHAR(128) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.3 Organization Memberships
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

-- 4.4 Tenant Licenses
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

-- 4.5 Tenant Payment Rails
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

-- 5. AI Traceability & Execution Tracking
CREATE TABLE ai_analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  pipeline_type ai_pipeline_enum NOT NULL,
  model_identifier VARCHAR(100) NOT NULL,
  model_config JSONB NOT NULL DEFAULT '{}',
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

-- 6. Pillar 1: Marketing Shield
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
  overall_risk_score INTEGER NOT NULL DEFAULT 0,
  deterministic_penalty_naira NUMERIC(14, 2) NOT NULL DEFAULT 0,
  compliant_rewrite_full TEXT,
  arcon_preclearance_required BOOLEAN NOT NULL DEFAULT true,
  approval_status human_approval_status_enum NOT NULL DEFAULT 'PENDING_REVIEW',
  approved_by_user_id UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Child Table with denormalized organization_id
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
  finding_type VARCHAR(50) NOT NULL,
  explanation TEXT NOT NULL,
  recommended_fix TEXT NOT NULL,
  statutory_citation TEXT NOT NULL,
  statutory_penalty_naira NUMERIC(12, 2) NOT NULL DEFAULT 0
);

-- 7. Pillar 2: Regulatory Radar Module
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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

-- Child Table with denormalized organization_id
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

-- 8. Pillar 3: 5-W Decision Gap Matrix Module
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

-- Child Table with denormalized organization_id
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

-- Child Table with denormalized organization_id
CREATE TABLE gap_matrix_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  evaluation_id UUID NOT NULL REFERENCES gap_evaluations(id) ON DELETE CASCADE,
  regulatory_clause_id UUID NOT NULL REFERENCES regulatory_clauses(id),
  obligation_id UUID REFERENCES regulatory_obligations(id),
  policy_clause_id UUID REFERENCES policy_clauses(id),
  compliance_status compliance_status_enum NOT NULL,
  statutory_penalty_naira NUMERIC(14, 2) NOT NULL DEFAULT 0,
  what_happened TEXT NOT NULL,
  what_to_know TEXT NOT NULL,
  what_has_changed TEXT NOT NULL,
  what_to_do TEXT NOT NULL,
  derived_insight TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Immutable Audit Ledger & Notifications
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

-- 10. Performance Indexing Strategy

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
