'use client';

import React, { useState } from 'react';
import {
  X,
  Star,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Save,
  Check,
  Scale,
  Clock,
} from 'lucide-react';
import {
  DecomposedObligationPresentation,
  RegulatoryInstrumentPresentation,
} from '../types';

interface ObligationDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  obligation: DecomposedObligationPresentation | null;
  instrument: RegulatoryInstrumentPresentation | null;
  onUpdateOverride: (
    obligationId: string,
    override: {
      status?: 'ADEQUATELY_MET' | 'PARTIALLY_MET' | 'GAP_DETECTED' | 'NOT_APPLICABLE' | 'PENDING_REVIEW';
      assignedOwner?: string;
      internalNotes?: string;
      internalSopCitation?: string;
      verifiedCriteriaIds?: string[];
    }
  ) => Promise<void>;
  onToggleStar?: (obligationId: string) => void;
}

interface ObligationDetailDrawerContentProps {
  onClose: () => void;
  obligation: DecomposedObligationPresentation;
  instrument: RegulatoryInstrumentPresentation | null;
  onUpdateOverride: ObligationDetailDrawerProps['onUpdateOverride'];
  onToggleStar?: (obligationId: string) => void;
}

function ObligationDetailDrawerContent({
  onClose,
  obligation,
  instrument,
  onUpdateOverride,
  onToggleStar,
}: ObligationDetailDrawerContentProps) {

  const [currentStatus, setCurrentStatus] = useState(obligation.status || 'PENDING_REVIEW');
  const [isApplicable, setIsApplicable] = useState(obligation.isApplicable ?? true);
  const [internalNotes, setInternalNotes] = useState(
    obligation.userOverride?.internalNotes || ''
  );
  const [internalSopCitation, setInternalSopCitation] = useState(
    obligation.userOverride?.internalSopCitation || ''
  );
  const [assignedOwner, setAssignedOwner] = useState(
    obligation.userOverride?.assignedOwner || obligation.targetRole || 'Chief Compliance Officer'
  );
  const [verifiedCriteriaIds, setVerifiedCriteriaIds] = useState<string[]>(
    obligation.userOverride?.verifiedCriteriaIds ||
      obligation.assessmentCriteria.filter((c) => c.defaultChecked).map((c) => c.id)
  );

  const [isCriteriaOpen, setIsCriteriaOpen] = useState(true);
  const [isRiskProfileOpen, setIsRiskProfileOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleToggleCriterion = async (criterionId: string) => {
    const nextCriteria = verifiedCriteriaIds.includes(criterionId)
      ? verifiedCriteriaIds.filter((id) => id !== criterionId)
      : [...verifiedCriteriaIds, criterionId];

    setVerifiedCriteriaIds(nextCriteria);

    // Auto calculate status recommendation
    let nextStatus = currentStatus;
    if (nextCriteria.length === obligation.assessmentCriteria.length && nextCriteria.length > 0) {
      nextStatus = 'ADEQUATELY_MET';
      setCurrentStatus('ADEQUATELY_MET');
    } else if (nextCriteria.length > 0) {
      nextStatus = 'PARTIALLY_MET';
      setCurrentStatus('PARTIALLY_MET');
    }

    try {
      await onUpdateOverride(obligation.id, {
        status: nextStatus,
        assignedOwner,
        internalNotes,
        internalSopCitation,
        verifiedCriteriaIds: nextCriteria,
      });
    } catch (err) {
      console.error('Failed to sync criterion check', err);
    }
  };

  const handleSaveNotes = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onUpdateOverride(obligation.id, {
        status: currentStatus,
        assignedOwner,
        internalNotes,
        internalSopCitation,
        verifiedCriteriaIds,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to persist obligation override', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: any) => {
    setCurrentStatus(newStatus);
    try {
      await onUpdateOverride(obligation.id, {
        status: newStatus,
        assignedOwner,
        internalNotes,
        internalSopCitation,
        verifiedCriteriaIds,
      });
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'ADEQUATELY_MET':
        return 'bg-emerald-500';
      case 'PARTIALLY_MET':
        return 'bg-amber-500';
      case 'GAP_DETECTED':
        return 'bg-rose-500';
      case 'NOT_APPLICABLE':
        return 'bg-slate-400';
      case 'PENDING_REVIEW':
      default:
        return 'bg-slate-500';
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const primaryPenalty = obligation.penalties?.[0];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/30 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden">
        {/* 1. Drawer Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/75 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold text-slate-900">
              {obligation.id}
            </span>
            <div className="relative">
              <select
                value={currentStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="pl-2 pr-6 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="ADEQUATELY_MET">Adequately Met</option>
                <option value="PARTIALLY_MET">Partially Met</option>
                <option value="GAP_DETECTED">Gap Detected</option>
                <option value="NOT_APPLICABLE">Not Applicable</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Relevance toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600 font-medium">
              <span>Applicable:</span>
              <input
                type="checkbox"
                checked={isApplicable}
                onChange={(e) => {
                  const val = e.target.checked;
                  setIsApplicable(val);
                  handleStatusChange(val ? currentStatus : 'NOT_APPLICABLE');
                }}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
            </label>

            {/* Star button */}
            {onToggleStar && (
              <button
                type="button"
                onClick={() => onToggleStar(obligation.id)}
                className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Star
                  className={`w-4 h-4 ${
                    obligation.isStarred ? 'text-amber-500 fill-amber-500' : ''
                  }`}
                />
              </button>
            )}

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Scrollable Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Rule Nature & Section Tag */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              {obligation.ruleNature || 'Prescriptive Mandate'}
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              {obligation.sectionReference}
            </span>
          </div>

          {/* Obligation Title */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-snug">
              {obligation.title || obligation.summary}
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {obligation.summary}
            </p>
          </div>

          {/* Statutory Legal Quote */}
          {obligation.statutoryText && (
            <div className="bg-slate-50 border-l-2 border-slate-900 p-3 rounded-r-lg space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Statutory Gazette Extract:
              </span>
              <p className="text-xs text-slate-700 font-mono italic leading-relaxed">
                &ldquo;{obligation.statutoryText}&rdquo;
              </p>
            </div>
          )}

          {/* Parent Regulatory Instrument Card */}
          {instrument && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <div className="font-medium text-slate-900 line-clamp-1">
                    {instrument.shortTitle}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500">
                    {obligation.sectionReference} · {obligation.sectionHeading}
                  </div>
                </div>
              </div>
              <span className="font-mono text-[11px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                Section Reference
              </span>
            </div>
          )}

          {/* Assignee Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Assigned Compliance Lead:
            </label>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                {assignedOwner.slice(0, 2).toUpperCase()}
              </div>
              <select
                value={assignedOwner}
                onChange={(e) => setAssignedOwner(e.target.value)}
                className="flex-1 py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="Chief Compliance Officer">Chief Compliance Officer</option>
                <option value="Head of Legal & Regulatory">Head of Legal & Regulatory</option>
                <option value="Chief Risk Officer">Chief Risk Officer</option>
                <option value="Head of Internal Audit">Head of Internal Audit</option>
                <option value="Operations Lead">Operations Lead</option>
              </select>
            </div>
          </div>

          {/* Accordion 1: Assessment Criteria */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setIsCriteriaOpen(!isCriteriaOpen)}
              className="w-full p-3.5 bg-slate-50/75 flex items-center justify-between text-left border-b border-slate-200 hover:bg-slate-100/75 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-bold text-slate-900">
                  Assessment Criteria
                </span>
                <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                  {verifiedCriteriaIds.length}/{obligation.assessmentCriteria?.length || 0}
                </span>
              </div>
              {isCriteriaOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>

            {isCriteriaOpen && (
              <div className="p-3.5 space-y-3">
                {(!obligation.assessmentCriteria || obligation.assessmentCriteria.length === 0) ? (
                  <p className="text-xs text-slate-400 italic">No specific assessment criteria registered.</p>
                ) : (
                  obligation.assessmentCriteria.map((crit) => {
                    const isChecked = verifiedCriteriaIds.includes(crit.id);
                    return (
                      <div
                        key={crit.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          isChecked
                            ? 'bg-slate-50 border-slate-300'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleCriterion(crit.id)}
                            className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-slate-900">
                              {crit.criterionText}
                            </div>
                            {crit.evidenceRequired && (
                              <div className="text-[11px] text-slate-500 font-mono">
                                Evidence: {crit.evidenceRequired}
                              </div>
                            )}
                            <div className="flex items-center gap-2 pt-0.5">
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                                  crit.isMandatory
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {crit.isMandatory ? 'Core Mandatory' : 'Best Practice'}
                              </span>
                            </div>
                          </div>
                        </label>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Accordion 2: Risk Profile & Penalties */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setIsRiskProfileOpen(!isRiskProfileOpen)}
              className="w-full p-3.5 bg-slate-50/75 flex items-center justify-between text-left border-b border-slate-200 hover:bg-slate-100/75 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-bold text-slate-900">
                  Risk Profile & Penalty Schedule
                </span>
              </div>
              {isRiskProfileOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>

            {isRiskProfileOpen && (
              <div className="p-3.5 space-y-3.5 text-xs">
                {/* Risk Floors */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                      Severity Floor
                    </span>
                    <div className="font-mono text-xs font-bold text-slate-900 mt-0.5">
                      {obligation.severityFloor || 'LEVEL_3'}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                      Statutory Timeline
                    </span>
                    <div className="font-mono text-xs font-bold text-slate-900 mt-0.5">
                      {obligation.statutoryTimelineDays
                        ? `${obligation.statutoryTimelineDays} Days`
                        : 'Continuous Mandate'}
                    </div>
                  </div>
                </div>

                {/* Fine Penalties */}
                {primaryPenalty && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Statutory Fine Range:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(primaryPenalty.penaltyMinNaira)} &ndash;{' '}
                        {formatCurrency(primaryPenalty.penaltyMaxNaira)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Daily Recurrent Fine:</span>
                      <span className="font-mono text-slate-900">
                        {formatCurrency(primaryPenalty.dailyFineNaira)} / day
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Personal Criminal Liability:</span>
                      <span className="font-mono text-slate-900 font-medium">
                        {primaryPenalty.carriesPersonalCriminalLiability ? 'Yes' : 'No'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">License Suspension Risk:</span>
                      <span className="font-mono text-slate-900 font-medium">
                        {primaryPenalty.carriesLicenseSuspensionRisk ? 'Yes' : 'No'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 text-[11px] font-mono text-slate-500">
                      Citation: {primaryPenalty.penaltyLegalCitation}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Internal Compliance Notes & SOP Citation */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Internal Compliance Notes & Policy Citation
            </h3>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-500 font-medium">
                Internal Standard Operating Procedure (SOP) Reference:
              </label>
              <input
                type="text"
                value={internalSopCitation}
                onChange={(e) => setInternalSopCitation(e.target.value)}
                placeholder="e.g. SOP-COMP-042 rev 2 · Compliance Operations"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-500 font-medium">
                Internal Verification Notes:
              </label>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={3}
                placeholder="Document operational readiness, evidence locations, or audit review logs..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400 font-mono">
                Persisted to sovereign audit log
              </span>

              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Notes'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 3. Drawer Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs shrink-0">
          <span className="font-mono text-[11px] text-slate-500">
            Audit Trail Active
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export function ObligationDetailDrawer(props: ObligationDetailDrawerProps) {
  if (!props.isOpen || !props.obligation) return null;

  return (
    <ObligationDetailDrawerContent
      {...props}
      obligation={props.obligation}
    />
  );
}
