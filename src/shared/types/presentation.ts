/**
 * Human-Readable Presentation & ViewModel Contracts
 * Adheres strictly to docs/AI_ENGINE.md Section 7
 *
 * Core Principle: "Gemini determines structured meaning. Cogent determines presentation."
 */

import {
  SeverityLevel,
  ScanVerdict,
  HumanApprovalStatus,
  RegulatorCode,
  MarketingChannel,
  ProductCategoryCode,
} from '@/shared/types';

/**
 * Modular card representation of a statutory finding
 */
export interface FindingPresentationCard {
  id: string;
  ruleCode: string;
  regulatorCode: RegulatorCode;
  severity: SeverityLevel;
  findingType: 'DETERMINISTIC_MATCH' | 'AI_CANDIDATE_MATCH' | 'CLAIMS_LEDGER_MATCH';
  flaggedExcerpt: string;
  startIndex?: number;
  endIndex?: number;
  whyItMatters: string;
  statutoryCitation: string;
  statutoryPenaltyNaira: number;
  recommendedAction: string;
  mandatoryDisclosureRequired: string | null;
}

/**
 * Action item in progressive disclosure flow
 */
export interface PresentationActionItem {
  id: string;
  title: string;
  description: string;
  priority: SeverityLevel;
  ownerDepartment: 'Marketing' | 'Compliance' | 'Legal' | 'Product' | 'Executive';
  suggestedDeadlineDays?: number;
  completed?: boolean;
}

/**
 * Base presentation model shared across all compliance workflows
 */
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

/**
 * Pillar 1: Marketing Shield Presentation Model
 */
export interface MarketingShieldViewModel extends BaseResponseViewModel {
  scanId?: string;
  productCategory?: ProductCategoryCode;
  channel: MarketingChannel;
  originalCopy: string;
  compliantRewrite: string;
  arconPreclearanceRequired: boolean;
  activeLicenseProfiles: string[];
}

/**
 * Pillar 2: Regulatory Radar Presentation Model
 */
export interface RadarCircularViewModel extends BaseResponseViewModel {
  circularReference: string;
  issuingBody: RegulatorCode;
  publicationDate: string;
  effectiveDate: string;
  statutoryDeadline: string;
  daysRemaining: number;
  applicabilityReason: string;
  impactBriefs: {
    coo?: string;
    cco?: string;
    productEng?: string;
    cfo?: string;
  };
}

/**
 * Pillar 3: 5-W Decision Gap Matrix Presentation Model
 */
export interface GapMatrixViewModel extends BaseResponseViewModel {
  policyDocumentId: string;
  policyTitle: string;
  statutoryFrameworkCode: string;
  compliancePercentage: number;
  criticalGapsCount: number;
  partiallyMetCount: number;
  adequatelyMetCount: number;
  estimatedFineAvoidanceNaira: number;
}

