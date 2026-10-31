import {
  RegulatorCode,
  LicenseType,
  PaymentRail,
  RadarPriority,
  OrgDepartment,
  SeverityLevel,
  LineageStatus,
  AmendmentType,
} from '@/shared/types';
import {
  ExtractedCircularStructure,
  RadarRoleImpactOutput,
  RadarActionItemOutput
} from './schema';

export * from './schema';

/**
 * Tenant profile context queried from tenant_licenses & tenant_payment_rails
 */
export interface TenantProfileContext {
  organizationId: string;
  activeLicenses: LicenseType[];
  activeRails: PaymentRail[];
}

/**
 * Circular targeting parameters for relational filtering
 */
export interface CircularTargetingContext {
  regulator: RegulatorCode;
  targetedLicenses: LicenseType[];
  affectedRails: PaymentRail[];
  appliesUniversally: boolean;
}

/**
 * Evaluated applicability output for a specific tenant
 */
export interface ApplicabilityResult {
  isApplicable: boolean;
  reason: string;
  matchedLicenses: LicenseType[];
  matchedRails: PaymentRail[];
}

/**
 * Deterministic metadata parsed from circular text and document headers
 */
export interface DeterministicMetadataResult {
  circularNumber: string;
  regulatorCode: RegulatorCode;
  publicationDate: string; // ISO YYYY-MM-DD
  effectiveDate: string;   // ISO YYYY-MM-DD
  statutoryDeadline: string | null; // ISO YYYY-MM-DD
  priority: RadarPriority;
  enforcementRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL_SANCTION_RISK';
  targetedLicenseTypes: LicenseType[];
  affectedPaymentRails: PaymentRail[];
  appliesUniversally: boolean;
  subject: string;
  summary: string;
  signatoryDepartment?: string | null;
  signatoryName?: string | null;
}

/**
 * Input payload for circular ingestion
 */
export interface CircularIngestInput {
  fileBuffer: Buffer | Uint8Array;
  fileName: string;
  mimeType?: string;
  organizationId?: string;
  manualRegulator?: RegulatorCode;
  manualReferenceCode?: string;
  manualSubject?: string;
  manualPublicationDate?: string;
  sourceUrl?: string;
  provenance?: 'PRIMARY' | 'SECONDARY' | 'MANUAL';
}

/**
 * Result returned upon successful circular ingestion
 */
export interface CircularIngestResult {
  circularId: string;
  documentVersionId: string;
  circularNumber: string;
  sourceFileHash: string;
  storagePath: string;
  metadata: DeterministicMetadataResult;
  extractedStructure: ExtractedCircularStructure;
  auditId: string;
  deduplicated?: boolean;
  lineageStatus?: LineageStatus;
}

/**
 * Penalty escalation projection for approaching or overdue deadlines
 */
export interface PenaltyEscalationProjection {
  baselineFineNaira: number;
  dailyFineNaira: number;
  accruedDailyFineNaira: number;
  totalProjectedExposureNaira: number;
  statutoryCitation: string;
  carriesPersonalCriminalLiability: boolean;
  carriesLicenseSuspensionRisk: boolean;
}

/**
 * Presentation view model for Radar Cockpit (Zango-style continuous spatial UI)
 */
export interface RadarCircularPresentationCard {
  id: string;
  circularNumber: string;
  regulator: RegulatorCode;
  subject: string;
  summary: string;
  publicationDate: string;
  effectiveDate: string;
  statutoryDeadline: string | null;
  daysRemaining: number | null;
  businessDaysRemaining?: number | null;
  countdownTier: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL_EMERGENCY';
  urgencyWindow?: 'CRITICAL_EMERGENCY' | 'URGENT_ACTION' | 'STANDARD_WINDOW' | 'NO_DEADLINE';
  penaltyEscalationProjection?: PenaltyEscalationProjection;
  priority: RadarPriority;
  enforcementRiskLevel: string;
  targetedLicenses: LicenseType[];
  affectedRails: PaymentRail[];
  appliesUniversally: boolean;
  lineageStatus?: LineageStatus;
  activeGoverningCircularId?: string | null;
  supersededBy?: string | null;
  amends?: string[];
  deduplicated?: boolean;
  applicability: {
    isApplicable: boolean;
    reason: string;
    matchedLicenses: LicenseType[];
    matchedRails: PaymentRail[];
  };
  executiveBriefCco?: string;
  actionBriefCoo?: string;
  technicalBriefProductEng?: string;
  financialBriefCfo?: string;
  technicalBriefCto?: string;
  governanceBriefCeoCro?: string;
  generalCounselBrief?: string;
  actionItems?: RadarActionItemPresentation[];
  sourceFileUrl?: string;
  rawText?: string;
  executiveSummary?: string;
  keyPoints?: string[];
  departments?: string[];
  docType?: string;
  alertType?: 'Actionable' | 'Informative';
  isStarred?: boolean;
  severityMatrixCode?: string;
  importantDates?: Array<{ id: string; label: string; date: string; description: string }>;
  comments?: Array<{ id: string; author: string; avatar?: string; text: string; timestamp: string }>;
  auditLogs?: Array<{ id: string; timestamp: string; action: string; author: string }>;
  workflowStatus?: 'Pending Review' | 'In Progress' | 'Reviewed' | 'Closed';
  assignee?: { id: string; name: string; avatar?: string } | null;
  topics?: string[];
}

export interface RadarActionItemPresentation {
  id: string;
  targetDepartment: OrgDepartment;
  actionTitle: string;
  actionDescription: string;
  suggestedDeadline: string | null;
  isCompleted: boolean;
  assignedTo?: string | null;
}
