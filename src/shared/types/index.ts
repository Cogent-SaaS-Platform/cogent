/**
 * Foundational Domain Enums and Core Interfaces for Cogent
 * 100% aligned with docs/DATA_MODEL.md (v1.1)
 */

// Branded identifier types for compile-time safety
export type OrganizationId = string & { readonly __brand: unique symbol };
export type UserId = string & { readonly __brand: unique symbol };
export type InstrumentId = string & { readonly __brand: unique symbol };
export type ClauseId = string & { readonly __brand: unique symbol };
export type ScanId = string & { readonly __brand: unique symbol };

// Nigerian Regulators
export type RegulatorCode =
  | 'CBN'    // Central Bank of Nigeria
  | 'ARCON'  // Advertising Regulatory Council of Nigeria
  | 'SEC'    // Securities and Exchange Commission
  | 'NDPC'   // Nigeria Data Protection Commission
  | 'FCCPC'  // Federal Competition & Consumer Protection Commission
  | 'NFIU'   // Nigerian Financial Intelligence Unit
  | 'NDIC';  // Nigeria Deposit Insurance Corporation

// Circular Lineage & Supersession Enums
export type LineageStatus = 'ACTIVE_LAW' | 'AMENDED' | 'SUPERSEDED';
export type AmendmentType =
  | 'AMENDS'
  | 'REPLACES'
  | 'REVOKES_AND_REPLACES'
  | 'REPEALS'
  | 'PARTIALLY_REPEALS'
  | 'CITES';


// Regulatory Instrument Classification
export type InstrumentType =
  | 'PRIMARY_ACT'
  | 'SUBSIDIARY_REGULATION'
  | 'REGULATORY_FRAMEWORK'
  | 'CIRCULAR_DIRECTIVE'
  | 'OPERATIONAL_GUIDELINE'
  | 'ENFORCEMENT_NOTICE';

export type VerificationStatus =
  | 'UNVERIFIED_INGESTION'
  | 'HUMAN_VERIFIED'
  | 'LEGAL_COUNSEL_LOCKED';

export type ObligationType =
  | 'STRICT_PROHIBITION'
  | 'MANDATORY_DISCLOSURE'
  | 'CONDITIONAL_PERMISSION'
  | 'STATUTORY_TIMELINE'
  | 'GOVERNANCE_CONTROL';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Nigerian Financial License Profiles
export type LicenseType =
  | 'COMMERCIAL_BANK'
  | 'MERCHANT_BANK'
  | 'PAYMENT_SERVICE_BANK'
  | 'MICROFINANCE_BANK_NATIONAL'
  | 'MICROFINANCE_BANK_STATE'
  | 'MICROFINANCE_BANK_UNIT'
  | 'FINANCE_COMPANY'
  | 'SWITCHING_AND_PROCESSING'
  | 'PAYMENT_SOLUTION_SERVICES_PSSP'
  | 'PAYMENT_TERMINAL_SERVICE_PROVIDER_PTSP'
  | 'MOBILE_MONEY_OPERATOR_MMO'
  | 'SUPER_AGENT'
  | 'DIGITAL_LENDER_FCCPC_REGISTERED'
  | 'SEC_REGISTERED_DIGITAL_SUB_BROKER'
  | 'SEC_REGISTERED_ROBO_ADVISOR'
  | 'CRYPTO_VASP_SEC_APPROVED';

// Payment Rails
export type PaymentRail =
  | 'NIBSS_NIP'
  | 'NIBSS_CENTRAL_PAY'
  | 'INTERSWITCH_WEBPAY'
  | 'PAYSTACK'
  | 'FLUTTERWAVE'
  | 'DIRECT_DEBIT_ACH'
  | 'CARD_ACQUIRING_VERVE'
  | 'CARD_ACQUIRING_MASTERCARD_VISA'
  | 'USSD'
  | 'AGENT_BANKING_CASH_IN_OUT';

// Marketing Channels
export type MarketingChannel =
  | 'SMS_BLAST'
  | 'SOCIAL_MEDIA_POST'
  | 'IN_APP_PUSH_NOTIFICATION'
  | 'LANDING_PAGE_WEBSITE'
  | 'EMAIL_NEWSLETTER'
  | 'OUTDOOR_BILLBOARD'
  | 'RADIO_TV_SCRIPT';

// Evidence-Bounded Scan Verdicts (Epistemic Modesty)
export type ScanVerdict =
  | 'NO_ISSUE_DETECTED'
  | 'REVIEW_RECOMMENDED'
  | 'ISSUE_DETECTED'
  | 'BLOCKING_ISSUE';

export type HumanApprovalStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED_BY_CCO'
  | 'MODIFIED_AND_APPROVED'
  | 'REJECTED'
  | 'NEEDS_RE_REVIEW';

// Pillar 1 v1.2 Product Taxonomy (docs/PILLAR_1_MARKETING_SHIELD.md Section 2)
// Mirrors CHECK constraint tenant_claims_ledger_product_category_chk
export const PRODUCT_CATEGORY_CODES = [
  'SAVINGS_DEPOSIT',
  'DIGITAL_NANO_LOAN',
  'PAYMENTS_WALLET',
  'REMITTANCE_FX',
  'WEALTHTECH_INVEST',
] as const;
export type ProductCategoryCode = (typeof PRODUCT_CATEGORY_CODES)[number];

// Post-Publish Drift Watcher status
// Mirrors CHECK constraint marketing_live_assets_drift_status_chk
export const DRIFT_STATUSES = ['SYNCED', 'DRIFT_DETECTED', 'ERROR'] as const;
export type DriftStatus = (typeof DRIFT_STATUSES)[number];

// Radar & Gap Matrix Enums
export type RadarPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL_EMERGENCY';

export type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export type OrgDepartment =
  | 'EXECUTIVE_LEADERSHIP'
  | 'COMPLIANCE_LEGAL'
  | 'GROWTH_MARKETING'
  | 'PRODUCT_MANAGEMENT'
  | 'ENGINEERING_TECH'
  | 'OPERATIONS'
  | 'TREASURY_FINANCE';

export type ComplianceStatus =
  | 'ADEQUATELY_MET'
  | 'PARTIALLY_MET'
  | 'CRITICAL_GAP'
  | 'NOT_APPLICABLE'
  | 'PENDING_REVIEW';

// Cross-Pillar Platform Navigation & Context (Epic 19)
export type PlatformPillar = 'executive' | 'marketing' | 'radar' | 'gap-matrix';

export interface CrossPillarLinkContext {
  targetPillar: PlatformPillar;
  circularId?: string;
  circularNumber?: string;
  regulatorCode?: RegulatorCode;
  benchmarkId?: string;
  policySectionNumber?: string;
  findingRuleCode?: string;
  searchTerm?: string;
  action?: 'inspect' | 'trace' | 'pre-vet' | 'filter' | 'open_upload' | 'open_dossier' | 'open_drawer' | 'run_scan';
}

// Audit Ledger Types (CAMA 2020 & BOFIA 2020 Section 5.2)
export interface AuditLogEntry {
  id: string;
  organizationId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  sha256InputHash: string;
  sha256OutputHash: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CreateAuditLogParams {
  organizationId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  sha256InputHash: string;
  sha256OutputHash: string;
  metadata?: Record<string, unknown>;
}

// Functional Result Type for clean railway-oriented error handling
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export const Ok = <T>(data: T): Result<T, never> => ({ success: true, data });
export const Err = <E>(error: E): Result<never, E> => ({ success: false, error });

export * from './billing';

