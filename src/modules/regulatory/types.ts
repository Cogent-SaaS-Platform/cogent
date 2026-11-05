import {
  RegulatoryDomainCode,
  DocumentClassification,
  JurisdictionCode,
  RegulatorCode,
  InstrumentType,
  ObligationType,
  SeverityLevel,
} from '@/shared/types';

export interface RegulatoryInstrumentPresentation {
  id: string;
  shortTitle: string;
  fullTitle: string;
  officialCitation: string;
  regulator: string;
  regulatorName: string;
  instrumentType: InstrumentType | string;
  domain: RegulatoryDomainCode;
  jurisdiction: JurisdictionCode;
  classification: DocumentClassification;
  year: number;
  sectionsCount: number;
  totalObligationsCount?: number;
  status: 'ACTIVE_LAW' | 'AMENDED';
  description: string;
  activeVersionId?: string | null;
  publicationDate?: string | null;
  effectiveDate?: string | null;
  sourceFileUrl?: string | null;
  isStarred?: boolean;
  owner?: string | null;
  overview?: string;
  scope?: string;
  keyRequirementAreas?: Array<{ title: string; description: string }>;
  comments?: Array<{
    id: string;
    author: string;
    role: string;
    text: string;
    createdAt: string;
  }>;
  auditLogs?: Array<{
    id: string;
    timestamp: string;
    action: string;
    author: string;
    details?: any;
  }>;
  policies?: Array<{
    id: string;
    code: string;
    title: string;
    status: string;
    mappedObligationsCount: number;
  }>;
  capturedText?: string | null;
}

export interface StatutoryPenaltyPresentation {
  penaltyMinNaira: number;
  penaltyMaxNaira: number;
  dailyFineNaira: number;
  carriesPersonalCriminalLiability: boolean;
  carriesLicenseSuspensionRisk: boolean;
  penaltyLegalCitation: string;
}

export type ObligationRuleType =
  | 'Prescriptive'
  | 'Risk Based'
  | 'Conditional'
  | 'Prohibitive';

export type PolicyApplicabilityType =
  | 'Policy Applicable'
  | 'Operational Only'
  | 'Not Applicable';

export type ObligationReviewStatus =
  | 'Pending Review'
  | 'Reviewed / Active'
  | 'Approved'
  | 'Archived';

export interface AssessmentCriterionItem {
  id: string;
  type: 'Core Criteria' | 'Best Practice';
  text: string;
  evidenceRequired?: string;
  isMandatory?: boolean;
}

export interface RegulatoryObligationPresentation {
  id: string;
  clauseId: string;
  sectionNumber?: string;
  sectionReference: string;
  sectionHeading: string;
  code: string; // e.g., "OBL-482B-101"
  title: string; // Bold Title
  description: string; // Plain-English statement of the rule
  ruleType: ObligationRuleType;
  policyApplicability: PolicyApplicabilityType;
  verbatimQuote: string;
  sectionOrPageRef?: string;
  characterSpan?: [number, number] | null;
  assessmentCriteria: AssessmentCriterionItem[];
  riskDescription: string;
  status: ObligationReviewStatus;
  isRelevant: boolean;
  isStarred: boolean;
  assignee?: {
    id?: string;
    name: string;
    role: string;
    initials: string;
    avatarUrl?: string | null;
  } | null;
  penalties: StatutoryPenaltyPresentation[];
  sourceDocumentTitle?: string;
  sourceDocumentUrl?: string | null;
}

// Section with nested obligations
export interface StatutorySection {
  id: string;
  sectionNumber?: string;
  sectionReference: string;
  sectionHeading: string;
  clauseText: string;
  pageNumber?: number | null;
  paragraphReference?: string | null;
  obligationsCount: number;
  obligations: RegulatoryObligationPresentation[];
}

export interface DomainFilterItem {
  code: RegulatoryDomainCode | 'ALL';
  name: string;
  count: number;
}

export interface JurisdictionFilterItem {
  code: JurisdictionCode | 'ALL';
  name: string;
  flag: string;
  count: number;
}

export type DecomposedObligationPresentation = RegulatoryObligationPresentation;


