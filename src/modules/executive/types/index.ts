import {
  PlatformPillar,
  CrossPillarLinkContext,
  RegulatorCode,
  OrgDepartment,
  SeverityLevel,
} from '@/shared/types';

export * from './schema';

export interface PillarComplianceSnapshot {
  pillar: PlatformPillar;
  name: string;
  tagline: string;
  healthPercentage: number;
  status: 'OPTIMAL' | 'ATTENTION_REQUIRED' | 'CRITICAL_ACTION_NEEDED';
  primaryMetricLabel: string;
  primaryMetricValue: string | number;
  secondaryMetricLabel: string;
  secondaryMetricValue: string | number;
  fineExposureAvoidedNaira: number;
  openItemsCount: number;
}

export interface DepartmentalReadinessItem {
  department: OrgDepartment;
  departmentLabel: string;
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  openObligationsCount: number;
  imminentDeadlinesCount: number;
  finesAvoidedNaira: number;
  leadRole: string;
}

export interface RegulatorCoverageItem {
  regulatorCode: RegulatorCode;
  regulatorName: string;
  activeInstrumentsCount: number;
  complianceRate: number;
  status: 'COMPLIANT' | 'REVIEW_UNDERWAY' | 'GAP_DETECTED';
  keyStatute: string;
}

export interface UrgentComplianceGate {
  id: string;
  title: string;
  regulatorCode: RegulatorCode;
  sourcePillar: PlatformPillar;
  deadlineDate: string; // ISO date
  daysRemaining: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL_EMERGENCY';
  actionRequired: string;
  linkContext: CrossPillarLinkContext;
}

export interface CrossPillarActivityItem {
  id: string;
  timestamp: string;
  sourcePillar: PlatformPillar;
  action: string;
  description: string;
  regulatorCode: RegulatorCode;
  sha256VerificationHash: string;
  linkContext: CrossPillarLinkContext;
}

export type ComplianceHealthGrade =
  | 'EXEMPLARY'
  | 'SATISFACTORY'
  | 'SUPERVISORY_CONCERN'
  | 'CRITICAL_INTERVENTION';

export interface MultiPillarLiveTelemetry {
  marketing: {
    totalScans: number;
    approvedCount: number;
    needsReReviewCount: number;
    approvalRate: number;
    activeDriftAlerts: number;
    avoidedFineNaira: number;
  };
  radar: {
    activeCirculars: number;
    unreadHighPriority: number;
    supersededCount: number;
    avoidedFineNaira: number;
  };
  gapMatrix: {
    activePolicies: number;
    concordancePercentage: number;
    criticalGapsCount: number;
    partiallyMetCount: number;
    unhedgedBalanceSheetPenaltyRiskNaira: number;
    avoidedFineNaira: number;
  };
}

export interface ExecutiveComplianceExportResult {
  markdownBrief: string;
  printableHtml: string;
  sha256Seal: string;
  generatedAt: string;
  organizationId: string;
  organizationName: string;
  compositeHealthScore: number;
  healthGrade: ComplianceHealthGrade;
  totalFinesAvoidedNaira: number;
  boardAttestationBlock: {
    signoffStatus: string;
    ccoDigitalSignature: string;
    boardAuditCommitteeChair: string;
    cryptographicVerificationSeal: string;
    signedAt: string;
  };
}

export interface ExecutiveOverviewData {
  organizationId: string;
  organizationName: string;
  generatedAt: string;
  compositeHealthScore: number; // 0 - 100
  healthGrade: ComplianceHealthGrade;
  totalFinesAvoidedNaira: number;
  activeSanctionsRiskCount: number;
  liveTelemetry?: MultiPillarLiveTelemetry;
  pillars: {
    marketing: PillarComplianceSnapshot;
    radar: PillarComplianceSnapshot;
    gapMatrix: PillarComplianceSnapshot;
  };
  regulatorCoverage: RegulatorCoverageItem[];
  departmentalReadiness: DepartmentalReadinessItem[];
  urgentGates: UrgentComplianceGate[];
  recentActivities: CrossPillarActivityItem[];
}
