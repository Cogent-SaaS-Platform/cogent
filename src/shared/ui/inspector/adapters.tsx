'use client';

import React from 'react';
import {
  InspectorItemData,
  InspectorMetric,
  AssessmentCriterion,
  StatutoryReferenceData,
  InspectorCustomSection,
} from './types';
import { RadarCircularPresentationCard } from '@/modules/radar/types';
import { FindingPresentationCard } from '@/shared/types/presentation';
import { RegulatorCode } from '@/shared/types';
import { Sparkles, ArrowRight, ShieldCheck, FileText, CheckCircle2, AlertTriangle, Scale, Lock, BookOpen } from 'lucide-react';

/**
 * Transforms a Radar Circular Presentation Card (Pillar 1: Insight)
 * into a standard InspectorItemData for the Multi-Pane Engine.
 */
export function circularToInspectorItem(
  circular: RadarCircularPresentationCard
): InspectorItemData {
  const penalty = circular.penaltyEscalationProjection;
  const isUrgent = circular.daysRemaining !== null && circular.daysRemaining <= 14;

  const metrics: InspectorMetric[] = [
    {
      label: 'Days to Deadline',
      value: circular.daysRemaining !== null ? `${circular.daysRemaining}d` : 'Open',
      subtext: circular.urgencyWindow ? circular.urgencyWindow.replace(/_/g, ' ') : 'Active',
      variant: isUrgent ? 'critical' : 'watch',
    },
    {
      label: 'Fine Exposure',
      value: penalty?.totalProjectedExposureNaira
        ? `₦${(penalty.totalProjectedExposureNaira / 1_000_000).toFixed(1)}M`
        : '₦0',
      subtext: penalty?.dailyFineNaira ? `+₦${(penalty.dailyFineNaira / 1_000_000).toFixed(1)}M/day` : 'Fixed sanction',
      variant: penalty?.totalProjectedExposureNaira ? 'critical' : 'healthy',
    },
    {
      label: 'Applicability',
      value: circular.applicability?.isApplicable ? 'Mandatory' : 'Exempt',
      subtext: circular.regulator,
      variant: circular.applicability?.isApplicable ? 'critical' : 'healthy',
    },
    {
      label: 'Affected Rails',
      value: circular.affectedRails?.length ?? 0,
      subtext: circular.targetedLicenses?.length ? `${circular.targetedLicenses.length} licenses` : 'Institutional',
      variant: 'info',
    },
  ];

  const criteria: AssessmentCriterion[] = [
    {
      id: `crit-applicability-${circular.id}`,
      title: 'Institutional License & Scope Match',
      description: circular.applicability?.reason || 'Evaluated against active institution license profile.',
      status: circular.applicability?.isApplicable ? 'NOT_MET' : 'MET',
      type: 'STATUTORY_MANDATE',
      aiReason: 'Deterministic RLS matcher evaluated active operational rails and license classes.',
    },
    ...(circular.actionItems || []).map((act) => ({
      id: act.id,
      title: act.actionTitle,
      description: act.actionDescription,
      status: 'PARTIAL' as const,
      type: 'CORE_CRITERIA' as const,
      aiReason: `Assigned to ${act.targetDepartment.replace(/_/g, ' ')} department for statutory mitigation.`,
    })),
  ];

  const statutoryRef: StatutoryReferenceData = {
    id: `ref-${circular.id}`,
    statutoryInstrumentTitle: `${circular.regulator} Circular ${circular.circularNumber}`,
    citationClause: circular.circularNumber,
    regulatorCode: circular.regulator,
    verbatimLegalText: circular.summary,
    statutoryPenaltyNaira: penalty?.totalProjectedExposureNaira,
    dailyFineNaira: penalty?.dailyFineNaira,
    effectiveDate: circular.effectiveDate,
    highlightedPhrase: circular.subject,
  };

  const customSections: InspectorCustomSection[] = [];

  // Multi-Role Impact Briefs custom section (CCO, COO, CTO, CFO)
  if (
    circular.executiveBriefCco ||
    circular.actionBriefCoo ||
    circular.technicalBriefProductEng ||
    circular.financialBriefCfo
  ) {
    customSections.push({
      id: 'role-briefs',
      title: 'Multi-Role Departmental Impact Briefs',
      icon: <Sparkles className="w-4 h-4 text-[#2A4BFF]" />,
      badge: '4 Roles',
      defaultOpen: true,
      content: (
        <div className="space-y-3">
          {circular.executiveBriefCco && (
            <div className="p-3 rounded-xl bg-[#F9FAFC] border border-[#E8EDF5] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2A4BFF] block">
                Chief Compliance Officer (CCO) Brief
              </span>
              <p className="text-xs text-[#4B5565] leading-relaxed">{circular.executiveBriefCco}</p>
            </div>
          )}
          {circular.actionBriefCoo && (
            <div className="p-3 rounded-xl bg-[#F9FAFC] border border-[#E8EDF5] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#10B981] block">
                Chief Operating Officer (COO) Operations Brief
              </span>
              <p className="text-xs text-[#4B5565] leading-relaxed">{circular.actionBriefCoo}</p>
            </div>
          )}
          {circular.technicalBriefProductEng && (
            <div className="p-3 rounded-xl bg-[#F9FAFC] border border-[#E8EDF5] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C3AED] block">
                Engineering & Product Brief
              </span>
              <p className="text-xs text-[#4B5565] leading-relaxed">{circular.technicalBriefProductEng}</p>
            </div>
          )}
          {circular.financialBriefCfo && (
            <div className="p-3 rounded-xl bg-[#F9FAFC] border border-[#E8EDF5] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#F59E0B] block">
                Chief Financial Officer (CFO) Treasury Brief
              </span>
              <p className="text-xs text-[#4B5565] leading-relaxed">{circular.financialBriefCfo}</p>
            </div>
          )}
        </div>
      ),
    });
  }

  const tags: string[] = [circular.regulator];
  if (circular.lineageStatus) {
    tags.push(circular.lineageStatus);
  }

  return {
    id: circular.id,
    referenceCode: circular.circularNumber,
    title: circular.subject,
    subtitle: `Issued by ${circular.regulator} on ${circular.publicationDate}`,
    statusText: isUrgent ? 'Statutory Action Required' : 'Monitored',
    statusVariant: isUrgent ? 'critical' : 'watch',
    strictnessType: 'Prescriptive',
    summary: circular.summary,
    metrics,
    criteria,
    riskAnalysis: penalty
      ? `Failure to satisfy this directive exposes the entity to baseline statutory fine of ₦${penalty.baselineFineNaira.toLocaleString('en-NG')} plus ongoing daily penalties of ₦${penalty.dailyFineNaira.toLocaleString('en-NG')} under ${penalty.statutoryCitation}.`
      : undefined,
    statutoryPenaltyNaira: penalty?.totalProjectedExposureNaira,
    departmentOwners: circular.actionItems?.map((a) => a.targetDepartment) || ['COMPLIANCE_LEGAL'],
    suggestedDeadlineDays: circular.daysRemaining ?? undefined,
    statutoryDeadline: circular.statutoryDeadline ?? undefined,
    regulatorCode: circular.regulator,
    statutoryReference: statutoryRef,
    customSections,
    tags,
  };
}

/**
 * Transforms a Marketing Pre-Vetting Finding (Pillar 2: Marketing Shield)
 * into a standard InspectorItemData for the Multi-Pane Engine.
 */
export function findingToInspectorItem(
  finding: FindingPresentationCard,
  options?: {
    originalCopy?: string;
    compliantRewrite?: string;
    onApplyFix?: (fix: string) => void;
  }
): InspectorItemData {
  const isCritical = finding.severity === 'CRITICAL' || finding.severity === 'HIGH';

  const metrics: InspectorMetric[] = [
    {
      label: 'Severity Level',
      value: finding.severity,
      subtext: finding.findingType.replace(/_/g, ' '),
      variant: isCritical ? 'critical' : 'watch',
    },
    {
      label: 'Regulator',
      value: finding.regulatorCode,
      subtext: 'Enforcing Body',
      variant: 'info',
    },
    {
      label: 'Potential Fine',
      value: finding.statutoryPenaltyNaira
        ? `₦${(finding.statutoryPenaltyNaira / 1_000_000).toFixed(1)}M`
        : 'Sanction',
      subtext: 'Administrative fine',
      variant: finding.statutoryPenaltyNaira ? 'critical' : 'neutral',
    },
    {
      label: 'Rule Code',
      value: finding.ruleCode,
      subtext: 'Deterministic Rule',
      variant: 'neutral',
    },
  ];

  const criteria: AssessmentCriterion[] = [
    {
      id: `rule-${finding.ruleCode}`,
      title: `${finding.regulatorCode} Regulatory Standard`,
      description: finding.whyItMatters,
      status: 'NOT_MET',
      type: 'STATUTORY_MANDATE',
      aiReason: `Deterministic rule violation detected in marketing copy: "${finding.flaggedExcerpt}".`,
      statutoryClauseRef: finding.statutoryCitation,
    },
  ];

  const statutoryRef: StatutoryReferenceData = {
    id: `ref-${finding.id}`,
    statutoryInstrumentTitle: `${finding.regulatorCode} Advertising Standards & Statutory Acts`,
    citationClause: finding.statutoryCitation,
    regulatorCode: finding.regulatorCode,
    verbatimLegalText: `${finding.statutoryCitation}: Commercial financial communications and promotional materials must not contain false, misleading, or deceptive representations regarding guaranteed returns, terms, or risk coverage. Mandatory regulatory disclosure: ${finding.mandatoryDisclosureRequired || 'None'}`,
    statutoryPenaltyNaira: finding.statutoryPenaltyNaira,
    highlightedPhrase: finding.flaggedExcerpt,
  };

  const customSections: InspectorCustomSection[] = [];

  // Flagged Excerpt & Compliant Rewrite custom section
  customSections.push({
    id: 'copy-rewrite-comparison',
    title: 'Flagged Excerpt & AI Compliant Rewrite',
    icon: <Sparkles className="w-4 h-4 text-[#2A4BFF]" />,
    defaultOpen: true,
    content: (
      <div className="space-y-3">
        {/* Flagged copy */}
        <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#991B1B] block">
            Flagged Non-Compliant Excerpt
          </span>
          <p className="text-xs font-semibold text-[#991B1B] italic">
            &ldquo;{finding.flaggedExcerpt}&rdquo;
          </p>
        </div>

        {/* Suggested Rewrite */}
        {options?.compliantRewrite && (
          <div className="p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#065F46] block">
                ARCON / FCCPC Pre-Cleared Compliant Alternative
              </span>
              <span className="text-[10px] font-bold text-[#065F46] bg-white px-2 py-0.5 rounded border border-[#A7F3D0]">
                Pre-Vetted
              </span>
            </div>
            <p className="text-xs text-[#065F46] leading-relaxed font-medium">
              &ldquo;{options.compliantRewrite}&rdquo;
            </p>
            {options.onApplyFix && (
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => options.onApplyFix?.(options.compliantRewrite!)}
                  className="btn-base btn-primary btn-xs gap-1"
                >
                  <span>Apply Pre-Cleared Copy</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    ),
  });

  return {
    id: finding.id,
    referenceCode: finding.ruleCode,
    title: `${finding.regulatorCode} Advertising Standard Violation`,
    subtitle: finding.statutoryCitation,
    statusText: isCritical ? 'Blocking Violation' : 'Review Required',
    statusVariant: isCritical ? 'critical' : 'watch',
    strictnessType: 'Proscriptive',
    summary: finding.whyItMatters,
    metrics,
    criteria,
    riskAnalysis: finding.statutoryPenaltyNaira
      ? `Promotional broadcast of this asset without pre-vetting exposes the organization to administrative penalties of ₦${finding.statutoryPenaltyNaira.toLocaleString('en-NG')} under ${finding.statutoryCitation}.`
      : undefined,
    statutoryPenaltyNaira: finding.statutoryPenaltyNaira,
    departmentOwners: ['GROWTH_MARKETING', 'COMPLIANCE_LEGAL'],
    regulatorCode: finding.regulatorCode,
    statutoryReference: statutoryRef,
    customSections,
    tags: [finding.regulatorCode, finding.severity],
  };
}

/**
 * Transforms a Gap Matrix Policy Clause (Pillar 3: Gap)
 * into a standard InspectorItemData for the Multi-Pane Engine.
 */
export function gapItemToInspectorItem(gapItem: {
  id: string;
  policyTitle: string;
  clauseNumber: string;
  governingFramework: string;
  statutoryCitation: string;
  statutoryVerbatimText: string;
  concordanceScore: number;
  regulatorCode: string;
  statutoryPenaltyNaira?: number;
  gapSummary: string;
  boardAdoptedReplacement?: string;
  department: string;
}): InspectorItemData {
  const isConcordant = gapItem.concordanceScore >= 85;

  const metrics: InspectorMetric[] = [
    {
      label: 'Concordance Score',
      value: `${gapItem.concordanceScore}%`,
      subtext: isConcordant ? 'Compliant' : 'Deficient',
      variant: isConcordant ? 'healthy' : 'critical',
    },
    {
      label: 'Framework',
      value: gapItem.regulatorCode,
      subtext: gapItem.governingFramework,
      variant: 'info',
    },
    {
      label: 'Fine Exposure',
      value: gapItem.statutoryPenaltyNaira
        ? `₦${(gapItem.statutoryPenaltyNaira / 1_000_000).toFixed(1)}M`
        : '₦0',
      subtext: 'Sanction risk',
      variant: gapItem.statutoryPenaltyNaira ? 'critical' : 'healthy',
    },
    {
      label: 'Department',
      value: gapItem.department.replace(/_/g, ' '),
      subtext: 'Responsible Team',
      variant: 'neutral',
    },
  ];

  const criteria: AssessmentCriterion[] = [
    {
      id: `crit-5w-${gapItem.id}`,
      title: '5-W Statutory Concordance Matrix',
      description: gapItem.gapSummary,
      status: isConcordant ? 'MET' : 'NOT_MET',
      type: 'STATUTORY_MANDATE',
      aiReason: `Clause evaluation mapped against statutory benchmark ${gapItem.statutoryCitation}.`,
    },
  ];

  const statutoryRef: StatutoryReferenceData = {
    id: `ref-${gapItem.id}`,
    statutoryInstrumentTitle: gapItem.governingFramework,
    citationClause: gapItem.statutoryCitation,
    regulatorCode: gapItem.regulatorCode as RegulatorCode,
    verbatimLegalText: gapItem.statutoryVerbatimText,
    statutoryPenaltyNaira: gapItem.statutoryPenaltyNaira,
    highlightedPhrase: gapItem.clauseNumber,
  };

  const customSections: InspectorCustomSection[] = [];

  if (gapItem.boardAdoptedReplacement) {
    customSections.push({
      id: 'board-adopted-wording',
      title: 'Board-Adopted Replacement Wording',
      icon: <ShieldCheck className="w-4 h-4 text-[#10B981]" />,
      defaultOpen: true,
      content: (
        <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#166534]">
              Recommended Policy Clause Replacement
            </span>
            <span className="text-[10px] font-bold text-[#166534] bg-white px-2 py-0.5 rounded border border-[#BBF7D0]">
              CAMA 2020 Compliant
            </span>
          </div>
          <p className="text-xs text-[#166534] leading-relaxed font-mono">
            {gapItem.boardAdoptedReplacement}
          </p>
        </div>
      ),
    });
  }

  return {
    id: gapItem.id,
    referenceCode: gapItem.clauseNumber,
    title: `${gapItem.policyTitle} — Clause ${gapItem.clauseNumber}`,
    subtitle: `Governing Act: ${gapItem.governingFramework} (${gapItem.statutoryCitation})`,
    statusText: isConcordant ? 'Concordant' : 'Critical Gap Identified',
    statusVariant: isConcordant ? 'healthy' : 'critical',
    strictnessType: 'Principles-Based',
    summary: gapItem.gapSummary,
    metrics,
    criteria,
    riskAnalysis: gapItem.statutoryPenaltyNaira
      ? `Operating with this policy gap exposes the company to statutory sanctions of ₦${gapItem.statutoryPenaltyNaira.toLocaleString('en-NG')} under ${gapItem.statutoryCitation}.`
      : undefined,
    statutoryPenaltyNaira: gapItem.statutoryPenaltyNaira,
    departmentOwners: [gapItem.department],
    regulatorCode: gapItem.regulatorCode as RegulatorCode,
    statutoryReference: statutoryRef,
    customSections,
    tags: [gapItem.regulatorCode, 'GAP_MATRIX'],
  };
}

/**
 * Transforms a Statutory Obligation / Action Item from a Circular
 * into an InspectorItemData for the Multi-Pane Inspector Engine.
 */
export function obligationToInspectorItem(
  actionItem: {
    id: string;
    targetDepartment: string;
    actionTitle: string;
    actionDescription: string;
    suggestedDeadline: string | null;
    isCompleted: boolean;
  },
  parentCircular: RadarCircularPresentationCard
): InspectorItemData {
  const penalty = parentCircular.penaltyEscalationProjection;

  const metrics: InspectorMetric[] = [
    {
      label: 'Compliance Status',
      value: actionItem.isCompleted ? 'Remediated' : 'Pending',
      subtext: actionItem.isCompleted ? 'Verified' : 'Statutory Action',
      variant: actionItem.isCompleted ? 'healthy' : 'critical',
    },
    {
      label: 'Responsible Dept',
      value: actionItem.targetDepartment.replace(/_/g, ' '),
      subtext: 'Operational Owner',
      variant: 'info',
    },
    {
      label: 'SLA Deadline',
      value: actionItem.suggestedDeadline ? actionItem.suggestedDeadline.slice(5) : 'Open',
      subtext: parentCircular.statutoryDeadline ? `By ${parentCircular.statutoryDeadline}` : 'Immediate',
      variant: actionItem.isCompleted ? 'neutral' : 'watch',
    },
    {
      label: 'Sanction Risk',
      value: penalty?.totalProjectedExposureNaira
        ? `₦${(penalty.totalProjectedExposureNaira / 1_000_000).toFixed(1)}M`
        : 'Sanction',
      subtext: parentCircular.regulator,
      variant: penalty?.totalProjectedExposureNaira ? 'critical' : 'healthy',
    },
  ];

  const criteria: AssessmentCriterion[] = [
    {
      id: `crit-mandate-${actionItem.id}`,
      title: 'Statutory Obligation Verification',
      description: actionItem.actionDescription,
      status: actionItem.isCompleted ? 'MET' : 'NOT_MET',
      type: 'STATUTORY_MANDATE',
      aiReason: `Binds ${actionItem.targetDepartment.replace(/_/g, ' ')} department under ${parentCircular.regulator} directive ${parentCircular.circularNumber}.`,
      statutoryClauseRef: parentCircular.circularNumber,
    },
    {
      id: `crit-attest-${actionItem.id}`,
      title: 'Board Supervisory Attestation',
      description: 'Documentary evidence and audit trail filed with Chief Compliance Officer.',
      status: actionItem.isCompleted ? 'MET' : 'PARTIAL',
      type: 'CORE_CRITERIA',
      aiReason: 'Required for annual CBN / CAMA 2020 supervisory examination ledger.',
    },
  ];

  const statutoryRef: StatutoryReferenceData = {
    id: `ref-act-${actionItem.id}`,
    statutoryInstrumentTitle: `${parentCircular.regulator} Directive ${parentCircular.circularNumber}`,
    citationClause: parentCircular.circularNumber,
    regulatorCode: parentCircular.regulator,
    verbatimLegalText: `${parentCircular.subject}\n\n${parentCircular.summary}`,
    statutoryPenaltyNaira: penalty?.totalProjectedExposureNaira,
    dailyFineNaira: penalty?.dailyFineNaira,
    effectiveDate: parentCircular.effectiveDate,
    highlightedPhrase: actionItem.actionTitle,
  };

  return {
    id: actionItem.id,
    referenceCode: `${parentCircular.circularNumber} / ${actionItem.id}`,
    title: actionItem.actionTitle,
    subtitle: `${parentCircular.regulator} Mandate • Assigned to ${actionItem.targetDepartment.replace(/_/g, ' ')}`,
    statusText: actionItem.isCompleted ? 'Obligation Fulfilled' : 'Mandatory Action Pending',
    statusVariant: actionItem.isCompleted ? 'healthy' : 'critical',
    strictnessType: 'Prescriptive',
    summary: actionItem.actionDescription,
    metrics,
    criteria,
    riskAnalysis: penalty
      ? `Non-compliance with this obligation exposes the entity to statutory sanctions of up to ₦${penalty.baselineFineNaira.toLocaleString('en-NG')} under ${penalty.statutoryCitation}.`
      : undefined,
    statutoryPenaltyNaira: penalty?.totalProjectedExposureNaira,
    departmentOwners: [actionItem.targetDepartment],
    suggestedDeadlineDays: parentCircular.daysRemaining ?? undefined,
    statutoryDeadline: actionItem.suggestedDeadline ?? parentCircular.statutoryDeadline ?? undefined,
    regulatorCode: parentCircular.regulator,
    statutoryReference: statutoryRef,
    tags: [parentCircular.regulator, actionItem.targetDepartment, 'STATUTORY_OBLIGATION'],
  };
}
