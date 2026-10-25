import {
  RegulatoryDomainCode,
  DocumentClassification,
  JurisdictionCode,
  RegulatorCode,
  InstrumentType,
  ObligationType,
  SeverityLevel,
  AssessmentCriterion,
  ObligationUserOverride,
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
  status: 'ACTIVE_LAW' | 'AMENDED';
  description: string;
  activeVersionId?: string | null;
  publicationDate?: string | null;
  effectiveDate?: string | null;
  sourceFileUrl?: string | null;
  isStarred?: boolean;
  owner?: string | null;
  overviewSummary?: string;
  scopeInstitutions?: string[];
  keyRequirements?: string[];
}

export interface StatutoryPenaltyPresentation {
  penaltyMinNaira: number;
  penaltyMaxNaira: number;
  dailyFineNaira: number;
  carriesPersonalCriminalLiability: boolean;
  carriesLicenseSuspensionRisk: boolean;
  penaltyLegalCitation: string;
}

export interface DecomposedObligationPresentation {
  id: string;
  clauseId: string;
  sectionReference: string;
  sectionHeading: string;
  obligationType: ObligationType;
  ruleNature: 'Prescriptive' | 'Risk Based' | 'Policy Applicable' | 'Mandatory Disclosure';
  title: string;
  summary: string;
  statutoryText: string;
  severityFloor: SeverityLevel;
  statutoryTimelineDays?: number | null;
  mandatoryDisclosureText?: string | null;
  targetRole: string;
  status: 'ADEQUATELY_MET' | 'PARTIALLY_MET' | 'GAP_DETECTED' | 'NOT_APPLICABLE' | 'PENDING_REVIEW';
  isApplicable: boolean;
  isStarred?: boolean;
  assignee?: {
    name: string;
    role: string;
    initials: string;
  };
  penalties: StatutoryPenaltyPresentation[];
  assessmentCriteria: AssessmentCriterion[];
  userOverride?: ObligationUserOverride;
}

export interface StatutorySection {
  id: string;
  sectionReference: string;
  sectionHeading: string;
  clauseText: string;
  pageNumber?: number | null;
  paragraphReference?: string | null;
  obligationsCount: number;
  obligations: DecomposedObligationPresentation[];
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
