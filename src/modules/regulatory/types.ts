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

// ============================================================================
// 4-Phase Obligation Architecture & Supervisory Metrics (Step 3)
// ============================================================================

export type ObligationCategory =
  | 'STRICT_PROHIBITION'
  | 'MANDATORY_DISCLOSURE'
  | 'CONDITIONAL_PERMISSION'
  | 'STATUTORY_TIMELINE'
  | 'GOVERNANCE_CONTROL';

export type ControlEffectivenessStatus =
  | 'EFFECTIVE'
  | 'NEEDS_REVIEW'
  | 'CRITICAL_GAP'
  | 'UNMAPPED';

export type EvidenceStatus =
  | 'VERIFIED'
  | 'PENDING_AUDIT'
  | 'MISSING_EVIDENCE'
  | 'NOT_APPLICABLE';

export interface FourPhaseObligation {
  // Internal key for database mutations (NEVER displayed raw in UI)
  internalId: string;

  // Phase 1: Regulatory Source
  phase1Source: {
    regulator: string;
    regulatorName: string;
    rulebook: string;
    circularNumber?: string;
    circularId?: string;
    documentVersionId?: string;
    sectionReference: string;
    sectionHeading: string;
    statutoryCitation: string;
  };

  // Phase 2: The Obligation
  phase2Obligation: {
    humanId: string; // e.g. "OBL-CBN-2024-001" or "OBL-SEC-2023-014"
    obligationType: ObligationCategory | string;
    atomicRequirement: string;
    statutoryText: string;
    severity: SeverityLevel;
    statutoryTimelineDays?: number | null;
    statutoryTimelineText?: string | null;
    penalties: StatutoryPenaltyPresentation[];
  };

  // Phase 3: Internal Safeguards
  phase3Safeguards: {
    controlId: string | null; // e.g. "CTRL-IT-884" (or null if ORPHAN)
    controlName: string | null;
    policyId: string | null; // e.g. "POL-AML-2024"
    policyName: string | null;
    custodianRole: string; // e.g. "Chief Compliance Officer", "Head of IT"
    department: string;
  };

  // Phase 4: Operational Health
  phase4Health: {
    effectivenessStatus: ControlEffectivenessStatus;
    evidenceStatus: EvidenceStatus;
    evidenceArtifactName?: string | null;
    lastAuditedAt?: string | null;
    isOrphan: boolean;
  };
}

export interface SupervisoryMetrics {
  // Metric 1: The Orphan Obligation Rate (The Gaps)
  orphanRate: {
    percentage: number;
    orphanCount: number;
    totalObligations: number;
    mappedCount: number;
    riskSeverityLevel: 'CRITICAL' | 'ELEVATED' | 'MODERATE' | 'LOW';
    statutoryGrounding: string;
  };

  // Metric 2: Control Concentration (The Bottlenecks)
  controlConcentration: {
    bottleneckCount: number;
    maxRatio: number;
    topBottlenecks: {
      controlId: string;
      controlName: string;
      custodianRole: string;
      mappedObligationsCount: number;
      ratioDescription: string;
    }[];
    riskSummary: string;
  };

  // Metric 3: Redundant Controls (The Cost-Cutters)
  redundantControls: {
    redundancyFactor: number;
    redundantClusterCount: number;
    estimatedRedundantSavingsNaira: number;
    redundantPairs: {
      statutoryCitation: string;
      coveredControls: string[];
      departments: string[];
    }[];
    optimizationSummary: string;
  };
}

