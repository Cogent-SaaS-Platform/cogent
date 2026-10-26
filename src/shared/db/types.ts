/**
 * Supabase Database TypeScript Schema Definitions for Cogent
 * Matches PostgreSQL DDL in supabase/migrations/20261002000001_initial_schema.sql
 */

import {
  RegulatorCode,
  InstrumentType,
  VerificationStatus,
  ObligationType,
  SeverityLevel,
  LicenseType,
  PaymentRail,
  MarketingChannel,
  ScanVerdict,
  HumanApprovalStatus,
  RadarPriority,
  ComplianceStatus,
  OrgDepartment,
  OrgRole,
  ProductCategoryCode,
  DriftStatus,
  LineageStatus,
  AmendmentType,
  SubscriptionTier,
  SubscriptionStatus,
} from '@/shared/types';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      regulatory_bodies: {
        Row: {
          id: string;
          code: RegulatorCode;
          name: string;
          enforcement_power_summary: string;
          official_portal_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: RegulatorCode;
          name: string;
          enforcement_power_summary: string;
          official_portal_url: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['regulatory_bodies']['Insert']>;
        Relationships: [];
      };
      regulatory_instruments: {
        Row: {
          id: string;
          body_id: string;
          title: string;
          short_name: string;
          instrument_type: InstrumentType;
          created_at: string;
        };
        Insert: {
          id?: string;
          body_id: string;
          title: string;
          short_name: string;
          instrument_type: InstrumentType;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['regulatory_instruments']['Insert']>;
        Relationships: [];
      };
      regulatory_document_versions: {
        Row: {
          id: string;
          instrument_id: string;
          version_number: string;
          reference_code: string;
          publication_date: string;
          effective_date: string;
          canonical_source_url: string;
          source_file_url: string;
          source_file_hash: string;
          verification_status: VerificationStatus;
          verified_by_user_id: string | null;
          verified_at: string | null;
          verification_notes: string | null;
          is_active: boolean;
          superseded_by_id: string | null;
          repealed_at: string | null;
          repealed_by_document_id: string | null;
          provenance?: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          instrument_id: string;
          version_number: string;
          reference_code: string;
          publication_date: string;
          effective_date: string;
          canonical_source_url: string;
          source_file_url: string;
          source_file_hash: string;
          verification_status?: VerificationStatus;
          verified_by_user_id?: string | null;
          verified_at?: string | null;
          verification_notes?: string | null;
          is_active?: boolean;
          superseded_by_id?: string | null;
          repealed_at?: string | null;
          repealed_by_document_id?: string | null;
          provenance?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['regulatory_document_versions']['Insert']>;
        Relationships: [];
      };
      regulatory_clauses: {
        Row: {
          id: string;
          document_version_id: string;
          section_reference: string;
          section_heading: string | null;
          clause_text: string;
          page_number: number | null;
          paragraph_reference: string | null;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_version_id: string;
          section_reference: string;
          section_heading?: string | null;
          clause_text: string;
          page_number?: number | null;
          paragraph_reference?: string | null;
          embedding?: number[] | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['regulatory_clauses']['Insert']>;
        Relationships: [];
      };
      regulatory_obligations: {
        Row: {
          id: string;
          clause_id: string;
          obligation_type: ObligationType;
          summary: string;
          severity_floor: SeverityLevel;
          statutory_timeline_days: number | null;
          mandatory_disclosure_text: string | null;
          verbatim_quote?: string | null;
          character_span_start?: number | null;
          character_span_end?: number | null;
          page_number?: number | null;
          actor?: string | null;
          action?: string | null;
          target_object?: string | null;
          condition?: string | null;
          deadline_text?: string | null;
          metadata?: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          clause_id: string;
          obligation_type: ObligationType;
          summary: string;
          severity_floor?: SeverityLevel;
          statutory_timeline_days?: number | null;
          mandatory_disclosure_text?: string | null;
          verbatim_quote?: string | null;
          character_span_start?: number | null;
          character_span_end?: number | null;
          page_number?: number | null;
          actor?: string | null;
          action?: string | null;
          target_object?: string | null;
          condition?: string | null;
          deadline_text?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['regulatory_obligations']['Insert']>;
        Relationships: [];
      };
      applicability_rules: {
        Row: {
          id: string;
          obligation_id: string;
          applicable_license_type: LicenseType | null;
          applicable_payment_rail: PaymentRail | null;
          minimum_capital_threshold_naira: number | null;
          all_institutions_flag: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          obligation_id: string;
          applicable_license_type?: LicenseType | null;
          applicable_payment_rail?: PaymentRail | null;
          minimum_capital_threshold_naira?: number | null;
          all_institutions_flag?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['applicability_rules']['Insert']>;
        Relationships: [];
      };
      statutory_penalties: {
        Row: {
          id: string;
          obligation_id: string;
          penalty_min_naira: number;
          penalty_max_naira: number;
          daily_fine_naira: number;
          carries_personal_criminal_liability: boolean;
          carries_license_suspension_risk: boolean;
          penalty_legal_citation: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          obligation_id: string;
          penalty_min_naira?: number;
          penalty_max_naira?: number;
          daily_fine_naira?: number;
          carries_personal_criminal_liability?: boolean;
          carries_license_suspension_risk?: boolean;
          penalty_legal_citation: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['statutory_penalties']['Insert']>;
        Relationships: [];
      };
      prohibited_terms: {
        Row: {
          id: string;
          obligation_id: string;
          clause_id: string;
          regulator_code: RegulatorCode;
          exact_pattern: string;
          is_regex: boolean;
          severity: SeverityLevel;
          statutory_rationale: string;
          mandatory_disclosure_required: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          obligation_id: string;
          clause_id: string;
          regulator_code: RegulatorCode;
          exact_pattern: string;
          is_regex?: boolean;
          severity?: SeverityLevel;
          statutory_rationale: string;
          mandatory_disclosure_required?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['prohibited_terms']['Insert']>;
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          clerk_organization_id: string;
          name: string;
          slug: string;
          rc_number: string | null;
          fccpc_registration_number: string | null;
          cbn_approval_ref: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_organization_id: string;
          name: string;
          slug: string;
          rc_number?: string | null;
          fccpc_registration_number?: string | null;
          cbn_approval_ref?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          clerk_user_id: string;
          email: string;
          full_name: string;
          job_title?: string | null;
          department?: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          email: string;
          full_name: string;
          job_title?: string | null;
          department?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
        Relationships: [];
      };
      organization_memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: OrgRole;
          department: OrgDepartment;
          job_title?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: OrgRole;
          department?: OrgDepartment;
          job_title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organization_memberships']['Insert']>;
        Relationships: [];
      };
      tenant_licenses: {
        Row: {
          id: string;
          organization_id: string;
          license_type: LicenseType;
          license_number: string | null;
          issuing_regulator: RegulatorCode;
          issuance_date: string | null;
          renewal_date: string | null;
          is_active: boolean;
          operating_conditions: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          license_type: LicenseType;
          license_number?: string | null;
          issuing_regulator: RegulatorCode;
          issuance_date?: string | null;
          renewal_date?: string | null;
          is_active?: boolean;
          operating_conditions?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tenant_licenses']['Insert']>;
        Relationships: [];
      };
      tenant_payment_rails: {
        Row: {
          id: string;
          organization_id: string;
          rail_type: PaymentRail;
          integration_status: string;
          settlement_bank_code: string | null;
          daily_volume_tier: string | null;
          is_active: boolean;
          drift_flagged: boolean;
          drift_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          rail_type: PaymentRail;
          integration_status?: string;
          settlement_bank_code?: string | null;
          daily_volume_tier?: string | null;
          is_active?: boolean;
          drift_flagged?: boolean;
          drift_reason?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tenant_payment_rails']['Insert']>;
        Relationships: [];
      };
      ai_analysis_runs: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          pipeline_type: string;
          model_identifier: string;
          model_config: Json;
          prompt_template_version: string;
          input_token_count: number;
          output_token_count: number;
          latency_ms: number;
          retrieved_clause_ids: string[];
          triggered_rule_ids: string[];
          raw_prompt_hash: string;
          raw_output_hash: string;
          human_approval_status: HumanApprovalStatus;
          reviewed_by_user_id: string | null;
          reviewed_at: string | null;
          reviewer_feedback: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          pipeline_type: string;
          model_identifier: string;
          model_config?: Json;
          prompt_template_version: string;
          input_token_count?: number;
          output_token_count?: number;
          latency_ms?: number;
          retrieved_clause_ids?: string[];
          triggered_rule_ids?: string[];
          raw_prompt_hash: string;
          raw_output_hash: string;
          human_approval_status?: HumanApprovalStatus;
          reviewed_by_user_id?: string | null;
          reviewed_at?: string | null;
          reviewer_feedback?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['ai_analysis_runs']['Insert']>;
        Relationships: [];
      };
      marketing_scans: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          analysis_run_id: string | null;
          campaign_name: string;
          channel: MarketingChannel;
          product_category: ProductCategoryCode;
          target_audience: string | null;
          raw_copy: string;
          verdict: ScanVerdict;
          overall_risk_score: number;
          deterministic_penalty_naira: number;
          compliant_rewrite_full: string | null;
          arcon_preclearance_required: boolean;
          approval_status: HumanApprovalStatus;
          state_reason: string | null;
          approved_by_user_id: string | null;
          approved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          analysis_run_id?: string | null;
          campaign_name: string;
          channel: MarketingChannel;
          product_category?: ProductCategoryCode;
          target_audience?: string | null;
          raw_copy: string;
          verdict?: ScanVerdict;
          overall_risk_score?: number;
          deterministic_penalty_naira?: number;
          compliant_rewrite_full?: string | null;
          arcon_preclearance_required?: boolean;
          approval_status?: HumanApprovalStatus;
          state_reason?: string | null;
          approved_by_user_id?: string | null;
          approved_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['marketing_scans']['Insert']>;
        Relationships: [];
      };
      marketing_findings: {
        Row: {
          id: string;
          organization_id: string;
          scan_id: string;
          prohibited_term_id: string | null;
          obligation_id: string | null;
          clause_id: string | null;
          rule_code: string;
          flagged_text: string;
          severity: SeverityLevel;
          finding_type: string;
          explanation: string;
          recommended_fix: string;
          statutory_citation: string;
          statutory_penalty_naira: number;
        };
        Insert: {
          id?: string;
          organization_id: string;
          scan_id: string;
          prohibited_term_id?: string | null;
          obligation_id?: string | null;
          clause_id?: string | null;
          rule_code: string;
          flagged_text: string;
          severity: SeverityLevel;
          finding_type: string;
          explanation: string;
          recommended_fix: string;
          statutory_citation: string;
          statutory_penalty_naira?: number;
        };
        Update: Partial<Database['public']['Tables']['marketing_findings']['Insert']>;
        Relationships: [];
      };
      // Migration 20261006000001 — Phase 1 / Task 1.1
      tenant_claims_ledger: {
        Row: {
          id: string;
          organization_id: string;
          product_category: ProductCategoryCode;
          approved_text: string;
          prohibited_counterpart: string | null;
          governing_regulator: RegulatorCode;
          statutory_citation: string;
          cco_rationale: string;
          approved_by_user_id: string | null;
          approved_at: string;
          expires_at: string | null;
          is_active: boolean;
          drift_flagged: boolean;
          drift_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          product_category: ProductCategoryCode;
          approved_text: string;
          prohibited_counterpart?: string | null;
          governing_regulator: RegulatorCode;
          statutory_citation: string;
          cco_rationale: string;
          approved_by_user_id?: string | null;
          approved_at?: string;
          expires_at?: string | null;
          is_active?: boolean;
          drift_flagged?: boolean;
          drift_reason?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tenant_claims_ledger']['Insert']>;
        Relationships: [];
      };
      marketing_live_assets: {
        Row: {
          id: string;
          organization_id: string;
          scan_id: string | null;
          live_url: string;
          channel: MarketingChannel;
          original_approved_hash: string;
          last_checked_at: string;
          drift_status: DriftStatus;
          drift_findings: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          scan_id?: string | null;
          live_url: string;
          channel: MarketingChannel;
          original_approved_hash: string;
          last_checked_at?: string;
          drift_status?: DriftStatus;
          drift_findings?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['marketing_live_assets']['Insert']>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          sha256_input_hash: string;
          sha256_output_hash: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          sha256_input_hash: string;
          sha256_output_hash: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          title: string;
          message: string;
          type: string;
          action_url: string | null;
          link: string | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          title: string;
          message: string;
          type?: string;
          action_url?: string | null;
          link?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
        Relationships: [];
      };
      radar_notifications: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          title: string;
          message: string;
          type: string;
          priority: string;
          target_department: OrgDepartment;
          action_url: string | null;
          link: string | null;
          is_read: boolean;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          title: string;
          message: string;
          type?: string;
          priority?: string;
          target_department?: OrgDepartment;
          action_url?: string | null;
          link?: string | null;
          is_read?: boolean;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['radar_notifications']['Insert']>;
        Relationships: [];
      };
      policy_documents: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          department: OrgDepartment;
          version_tag: string;
          storage_path: string;
          raw_text: string;
          source_file_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          department: OrgDepartment;
          version_tag?: string;
          storage_path: string;
          raw_text: string;
          source_file_hash: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['policy_documents']['Insert']>;
        Relationships: [];
      };
      policy_clauses: {
        Row: {
          id: string;
          organization_id: string;
          policy_id: string;
          section_number: string;
          clause_text: string;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          policy_id: string;
          section_number: string;
          clause_text: string;
          embedding?: number[] | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['policy_clauses']['Insert']>;
        Relationships: [];
      };
      gap_evaluations: {
        Row: {
          id: string;
          organization_id: string;
          policy_id: string;
          benchmark_document_version_id: string;
          analysis_run_id: string | null;
          overall_compliance_percentage: number;
          critical_gaps_count: number;
          partially_met_count: number;
          adequately_met_count: number;
          status: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          policy_id: string;
          benchmark_document_version_id: string;
          analysis_run_id?: string | null;
          overall_compliance_percentage?: number;
          critical_gaps_count?: number;
          partially_met_count?: number;
          adequately_met_count?: number;
          status?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['gap_evaluations']['Insert']>;
        Relationships: [];
      };
      gap_matrix_items: {
        Row: {
          id: string;
          organization_id: string;
          evaluation_id: string;
          regulatory_clause_id: string;
          obligation_id: string | null;
          policy_clause_id: string | null;
          compliance_status: ComplianceStatus;
          statutory_penalty_naira: number;
          what_happened: string;
          what_to_know: string;
          what_has_changed: string;
          what_to_do: string;
          draft_replacement_language: string | null;
          responsible_role: string | null;
          remediation_timeline_days: number | null;
          derived_insight: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          evaluation_id: string;
          regulatory_clause_id: string;
          obligation_id?: string | null;
          policy_clause_id?: string | null;
          compliance_status: ComplianceStatus;
          statutory_penalty_naira?: number;
          what_happened: string;
          what_to_know: string;
          what_has_changed: string;
          what_to_do: string;
          draft_replacement_language?: string | null;
          responsible_role?: string | null;
          remediation_timeline_days?: number | null;
          derived_insight: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['gap_matrix_items']['Insert']>;
        Relationships: [];
      };
      radar_circulars: {
        Row: {
          id: string;
          document_version_id: string;
          circular_number: string;
          subject: string;
          summary: string;
          priority: RadarPriority;
          statutory_deadline: string | null;
          enforcement_risk_level: string;
          targeted_license_types: LicenseType[];
          affected_payment_rails: PaymentRail[];
          applies_universally: boolean;
          lineage_status: LineageStatus;
          issuance_date: string | null;
          effective_date: string | null;
          raw_text: string | null;
          document_checksum: string | null;
          embedding: number[] | null;
          source_tier?: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_version_id: string;
          circular_number: string;
          subject: string;
          summary: string;
          priority?: RadarPriority;
          statutory_deadline?: string | null;
          enforcement_risk_level: string;
          targeted_license_types?: LicenseType[];
          affected_payment_rails?: PaymentRail[];
          applies_universally?: boolean;
          lineage_status?: LineageStatus;
          issuance_date?: string | null;
          effective_date?: string | null;
          raw_text?: string | null;
          document_checksum?: string | null;
          embedding?: number[] | null;
          source_tier?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['radar_circulars']['Insert']>;
        Relationships: [];
      };
      circular_supersession_links: {
        Row: {
          id: string;
          parent_circular_id: string;
          child_circular_id: string;
          amendment_type: AmendmentType;
          affected_clause_references: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          parent_circular_id: string;
          child_circular_id: string;
          amendment_type: AmendmentType;
          affected_clause_references?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['circular_supersession_links']['Insert']>;
        Relationships: [];
      };
      radar_tenant_impacts: {
        Row: {
          id: string;
          organization_id: string;
          circular_id: string;
          analysis_run_id: string | null;
          is_applicable: boolean;
          applicability_reason: string;
          executive_brief_cco: string;
          action_brief_coo: string;
          technical_brief_product_eng: string;
          financial_brief_cfo: string;
          status: string;
          acknowledged_by: string | null;
          acknowledged_at: string | null;
          acknowledged_by_cco: boolean | null;
          priority_level: SeverityLevel | null;
          role_briefs: Json | null;
          brief_cco: Json | null;
          brief_cfo: Json | null;
          brief_cto: Json | null;
          brief_ceo_cro: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          circular_id: string;
          analysis_run_id?: string | null;
          is_applicable: boolean;
          applicability_reason: string;
          executive_brief_cco: string;
          action_brief_coo: string;
          technical_brief_product_eng: string;
          financial_brief_cfo: string;
          status?: string;
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          acknowledged_by_cco?: boolean | null;
          priority_level?: SeverityLevel | null;
          role_briefs?: Json | null;
          brief_cco?: Json | null;
          brief_cfo?: Json | null;
          brief_cto?: Json | null;
          brief_ceo_cro?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['radar_tenant_impacts']['Insert']>;
        Relationships: [];
      };
      radar_action_items: {
        Row: {
          id: string;
          organization_id: string;
          impact_id: string;
          target_department: OrgDepartment;
          action_title: string;
          action_description: string;
          assigned_to_user_id: string | null;
          suggested_deadline: string | null;
          is_completed: boolean;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          impact_id: string;
          target_department: OrgDepartment;
          action_title: string;
          action_description: string;
          assigned_to_user_id?: string | null;
          suggested_deadline?: string | null;
          is_completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['radar_action_items']['Insert']>;
        Relationships: [];
      };
      tenant_subscriptions: {
        Row: {
          id: string;
          organization_id: string;
          paystack_customer_code: string | null;
          paystack_subscription_code: string | null;
          paystack_plan_code: string | null;
          tier: SubscriptionTier;
          status: SubscriptionStatus;
          trial_ends_at: string | null;
          grace_period_ends_at: string | null;
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          marketing_scan_quota: number;
          policy_document_quota: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          paystack_customer_code?: string | null;
          paystack_subscription_code?: string | null;
          paystack_plan_code?: string | null;
          tier?: SubscriptionTier;
          status?: SubscriptionStatus;
          trial_ends_at?: string | null;
          grace_period_ends_at?: string | null;
          current_period_start?: string;
          current_period_end?: string;
          cancel_at_period_end?: boolean;
          marketing_scan_quota?: number;
          policy_document_quota?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tenant_subscriptions']['Insert']>;
        Relationships: [];
      };
      billing_events: {
        Row: {
          id: string;
          event_id: string;
          event_type: string;
          organization_id: string | null;
          payload: Json;
          processed_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          event_type: string;
          organization_id?: string | null;
          payload: Json;
          processed_at?: string;
        };
        Update: Partial<Database['public']['Tables']['billing_events']['Insert']>;
        Relationships: [];
      };
      source_runs: {
        Row: {
          id: string;
          source_code: string;
          source_name: string;
          status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'STALE';
          items_seen: number;
          items_ingested: number;
          items_deduplicated: number;
          error_message: string | null;
          started_at: string;
          completed_at: string | null;
          http_status: number | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          source_code: string;
          source_name: string;
          status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'STALE';
          items_seen?: number;
          items_ingested?: number;
          items_deduplicated?: number;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
          http_status?: number | null;
          metadata?: Json | null;
        };
        Update: Partial<Database['public']['Tables']['source_runs']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_org_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      current_user_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      match_policy_clauses: {
        Args: {
          p_organization_id: string;
          p_policy_id: string;
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
        };
        Returns: {
          id: string;
          section_number: string;
          clause_text: string;
          similarity: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
