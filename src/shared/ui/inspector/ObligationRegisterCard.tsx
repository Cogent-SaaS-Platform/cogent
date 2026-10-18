'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Scale,
  UserCheck,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Tag,
  AlertOctagon,
} from 'lucide-react';
import { AssessmentCriterion, ObligationUserOverride } from '@/shared/types';

export interface ObligationPenaltyView {
  penaltyMinNaira: number;
  penaltyMaxNaira: number;
  dailyFineNaira: number;
  carriesPersonalCriminalLiability: boolean;
  carriesLicenseSuspensionRisk: boolean;
  penaltyLegalCitation: string;
}

export interface DecomposedObligationData {
  id: string;
  obligationType: string;
  summary: string;
  severityFloor: string;
  statutoryTimelineDays?: number | null;
  mandatoryDisclosureText?: string | null;
  targetRole?: string;
  verbatimClauseText?: string;
  sectionReference?: string;
  penalties?: ObligationPenaltyView[];
  assessmentCriteria?: AssessmentCriterion[];
  userOverride?: ObligationUserOverride;
}

export interface ObligationRegisterCardProps {
  obligation: DecomposedObligationData;
  onUpdateOverride?: (obligationId: string, override: ObligationUserOverride) => void;
}

export function ObligationRegisterCard({
  obligation,
  onUpdateOverride,
}: ObligationRegisterCardProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showOverrideForm, setShowOverrideForm] = useState<boolean>(false);
  
  // Track interactive checklist state
  const [checkedCriteria, setCheckedCriteria] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (obligation.assessmentCriteria) {
      obligation.assessmentCriteria.forEach((crit) => {
        initial[crit.id] = crit.defaultChecked ?? false;
      });
    }
    return initial;
  });

  const [overrideState, setOverrideState] = useState<ObligationUserOverride>(() => ({
    status: obligation.userOverride?.status || 'PENDING_REVIEW',
    internalNotes: obligation.userOverride?.internalNotes || '',
    internalSopCitation: obligation.userOverride?.internalSopCitation || '',
    assignedOwner: obligation.userOverride?.assignedOwner || obligation.targetRole || 'Chief Compliance Officer',
  }));

  const toggleCriterion = (critId: string) => {
    const updated = { ...checkedCriteria, [critId]: !checkedCriteria[critId] };
    setCheckedCriteria(updated);

    if (onUpdateOverride) {
      const activeVerified = Object.keys(updated).filter((k) => updated[k]);
      onUpdateOverride(obligation.id, {
        ...overrideState,
        verifiedCriteriaIds: activeVerified,
        lastReviewedAt: new Date().toISOString(),
      });
    }
  };

  const handleSaveOverride = () => {
    if (onUpdateOverride) {
      onUpdateOverride(obligation.id, {
        ...overrideState,
        lastReviewedAt: new Date().toISOString(),
      });
    }
    setShowOverrideForm(false);
  };

  const primaryPenalty = obligation.penalties?.[0];

  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="rounded-xl border border-[#DDE3EE] bg-white shadow-xs overflow-hidden transition-all hover:border-[#2A4BFF]/50">
      {/* 1. Header Bar: Obligation Type, Severity, Statutory Timeline */}
      <div className="p-3.5 bg-[#F9FAFC] border-b border-[#DDE3EE] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[#EEF2FF] text-[#2A4BFF] border border-[#C7D2FE]">
            {obligation.obligationType.replace(/_/g, ' ')}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
              obligation.severityFloor === 'CRITICAL'
                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                : obligation.severityFloor === 'HIGH'
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-blue-100 text-blue-800 border border-blue-200'
            }`}
          >
            {obligation.severityFloor} SEVERITY
          </span>
          {obligation.targetRole && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#4B5565] font-medium">
              <UserCheck className="w-3.5 h-3.5 text-[#8D99AE]" />
              <span>Owner: {obligation.targetRole}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {obligation.statutoryTimelineDays && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              <Clock className="w-3 h-3" />
              <span>{obligation.statutoryTimelineDays}d Cure Window</span>
            </span>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-[#8D99AE] hover:text-[#0B0F1A] rounded transition-colors"
            title={isExpanded ? 'Collapse obligation' : 'Expand obligation'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Executive Summary */}
      <div className="p-4 space-y-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D99AE] block mb-1">
            Executive Summary
          </span>
          <p className="text-xs font-semibold text-[#0B0F1A] leading-relaxed">
            {obligation.summary}
          </p>
        </div>

        {/* 3. The Verbatim Statutory Rule */}
        {obligation.verbatimClauseText && (
          <div className="p-3 rounded-lg bg-[#F5F6FA] border-l-2 border-[#2A4BFF] space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#8D99AE]">
              <span>THE RULE ({obligation.sectionReference || 'STATUTORY CITATION'})</span>
              <Scale className="w-3.5 h-3.5 text-[#2A4BFF]" />
            </div>
            <p className="text-[11px] text-[#334155] italic leading-relaxed font-serif">
              &ldquo;{obligation.verbatimClauseText}&rdquo;
            </p>
          </div>
        )}

        {isExpanded && (
          <>
            {/* 4. Assessment Criteria Checklist */}
            {obligation.assessmentCriteria && obligation.assessmentCriteria.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#E8EDF5]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5565] flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-[#2A4BFF]" />
                    <span>Compliance Assessment Criteria ({obligation.assessmentCriteria.length} items)</span>
                  </span>
                  <span className="text-[10px] text-[#8D99AE]">Audit Verification Proofs</span>
                </div>

                <div className="space-y-1.5">
                  {obligation.assessmentCriteria.map((crit) => {
                    const isChecked = checkedCriteria[crit.id] ?? false;
                    return (
                      <div
                        key={crit.id}
                        onClick={() => toggleCriterion(crit.id)}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                            : 'bg-white border-[#DDE3EE] hover:bg-[#F9FAFC] text-[#0B0F1A]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent div
                          className="mt-0.5 h-3.5 w-3.5 rounded border-[#8D99AE] text-[#2A4BFF] focus:ring-[#2A4BFF]"
                        />
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`font-medium ${isChecked ? 'line-through text-emerald-800' : ''}`}>
                              {crit.criterionText}
                            </span>
                            {crit.isMandatory && (
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                                Mandatory
                              </span>
                            )}
                          </div>
                          {crit.evidenceRequired && (
                            <p className="text-[10px] text-[#8D99AE]">
                              Required Evidence: {crit.evidenceRequired}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. Deterministic Penalty Matrix (ADR-004) */}
            {primaryPenalty && (
              <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Statutory Penalty Schedule</span>
                  </span>
                  <span className="text-[10px] font-mono text-rose-800 font-bold">
                    {primaryPenalty.penaltyLegalCitation}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                  <div className="p-2 rounded-lg bg-white border border-rose-100">
                    <span className="text-[10px] text-[#8D99AE] block">Base Fine Range</span>
                    <span className="font-bold text-rose-700">
                      {formatNaira(primaryPenalty.penaltyMinNaira)} – {formatNaira(primaryPenalty.penaltyMaxNaira)}
                    </span>
                  </div>

                  {primaryPenalty.dailyFineNaira > 0 && (
                    <div className="p-2 rounded-lg bg-white border border-rose-100">
                      <span className="text-[10px] text-[#8D99AE] block">Daily Compounding Fine</span>
                      <span className="font-bold text-rose-700 font-mono">
                        +{formatNaira(primaryPenalty.dailyFineNaira)}/day
                      </span>
                    </div>
                  )}

                  <div className="p-2 rounded-lg bg-white border border-rose-100 col-span-2 sm:col-span-1 space-y-1">
                    <span className="text-[10px] text-[#8D99AE] block">Statutory Sanctions</span>
                    <div className="flex flex-col gap-0.5 text-[10px]">
                      {primaryPenalty.carriesPersonalCriminalLiability && (
                        <span className="text-red-700 font-bold flex items-center gap-1">
                          <AlertOctagon className="w-3 h-3 text-red-600" />
                          Criminal Liability (Directors)
                        </span>
                      )}
                      {primaryPenalty.carriesLicenseSuspensionRisk && (
                        <span className="text-amber-800 font-bold flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-amber-600" />
                          License Suspension Risk
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Mandatory Disclosure Alert if required */}
            {obligation.mandatoryDisclosureText && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
                <Tag className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-[10px] uppercase tracking-wider text-amber-800">
                    Mandatory Public Disclosure Wording
                  </span>
                  <span className="font-mono text-[11px]">&ldquo;{obligation.mandatoryDisclosureText}&rdquo;</span>
                </div>
              </div>
            )}

            {/* 7. Interactive User Override & Internal Linking */}
            <div className="pt-2 border-t border-[#E8EDF5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#8D99AE] uppercase font-bold tracking-wider">
                  Internal Status:
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                    overrideState.status === 'VERIFIED_MET'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : overrideState.status === 'NON_COMPLIANT'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {overrideState.status.replace(/_/g, ' ')}
                </span>
                {overrideState.internalSopCitation && (
                  <span className="text-[11px] text-[#4B5565] font-mono">
                    Ref: {overrideState.internalSopCitation}
                  </span>
                )}
              </div>

              <button
                onClick={() => setShowOverrideForm(!showOverrideForm)}
                className="text-xs font-semibold text-[#2A4BFF] hover:underline"
              >
                {showOverrideForm ? 'Close Override' : 'Configure Override'}
              </button>
            </div>

            {/* Override Edit Drawer */}
            {showOverrideForm && (
              <div className="p-3 rounded-xl bg-[#F9FAFC] border border-[#DDE3EE] space-y-2.5 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-[#4B5565] block mb-1">
                      Institutional Status
                    </label>
                    <select
                      value={overrideState.status}
                      onChange={(e) => setOverrideState({ ...overrideState, status: e.target.value as any })}
                      className="w-full rounded-md border border-[#DDE3EE] bg-white px-2 py-1 text-xs"
                    >
                      <option value="VERIFIED_MET">VERIFIED MET (Audited)</option>
                      <option value="PARTIALLY_MET">PARTIALLY MET (In Progress)</option>
                      <option value="NON_COMPLIANT">NON COMPLIANT (Critical Gap)</option>
                      <option value="NOT_APPLICABLE">NOT APPLICABLE</option>
                      <option value="PENDING_REVIEW">PENDING REVIEW</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#4B5565] block mb-1">
                      Internal SOP Citation
                    </label>
                    <input
                      type="text"
                      value={overrideState.internalSopCitation || ''}
                      onChange={(e) => setOverrideState({ ...overrideState, internalSopCitation: e.target.value })}
                      placeholder="e.g. Policy-AML-04, Section 3"
                      className="w-full rounded-md border border-[#DDE3EE] bg-white px-2 py-1 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#4B5565] block mb-1">
                    Compliance Officer Verification Notes
                  </label>
                  <textarea
                    rows={2}
                    value={overrideState.internalNotes || ''}
                    onChange={(e) => setOverrideState({ ...overrideState, internalNotes: e.target.value })}
                    placeholder="Enter evidence notes or Board Risk Committee resolution reference..."
                    className="w-full rounded-md border border-[#DDE3EE] bg-white p-2 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setShowOverrideForm(false)}
                    className="px-2.5 py-1 text-xs text-[#4B5565] hover:text-[#0B0F1A]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveOverride}
                    className="px-3 py-1 bg-[#2A4BFF] text-white rounded-md text-xs font-bold hover:bg-[#203ECC]"
                  >
                    Save Override
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
