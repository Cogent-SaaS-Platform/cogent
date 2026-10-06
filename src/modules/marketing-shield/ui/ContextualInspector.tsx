'use client';

import React from 'react';
import { FindingPresentationCard, MarketingShieldViewModel } from '@/shared/types/presentation';
import {
  Scale,
  BookOpen,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  FileCheck,
  AlertOctagon,
  AlertTriangle,
  Info,
  X,
  ExternalLink,
  ChevronRight,
  FileText,
  Lock,
} from 'lucide-react';

import { PlatformPillar, CrossPillarLinkContext } from '@/shared/types';

interface ContextualInspectorProps {
  selectedFinding: FindingPresentationCard | null;
  onClearSelection: () => void;
  viewModel: MarketingShieldViewModel;
  onApplyFix?: (fix: string) => void;
  onSwitchPillar?: (pillar: PlatformPillar, context?: CrossPillarLinkContext) => void;
}

export const ContextualInspector: React.FC<ContextualInspectorProps> = ({
  selectedFinding,
  onClearSelection,
  viewModel,
  onApplyFix,
  onSwitchPillar,
}) => {
  // If a specific finding is selected, show deep-dive Statutory Clause Inspector
  if (selectedFinding) {
    const formattedPenalty = selectedFinding.statutoryPenaltyNaira
      ? new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: 'NGN',
          maximumFractionDigits: 0,
        }).format(selectedFinding.statutoryPenaltyNaira)
      : 'Administrative Sanction / Caution';

    const severityConfig = {
      CRITICAL: {
        badgeBg: 'bg-red-500/10 text-red-400 border-red-500/30',
        icon: AlertOctagon,
        border: 'border-red-500/30',
      },
      HIGH: {
        badgeBg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
        icon: AlertTriangle,
        border: 'border-orange-500/30',
      },
      MEDIUM: {
        badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        icon: Info,
        border: 'border-amber-500/30',
      },
      LOW: {
        badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        icon: Info,
        border: 'border-blue-500/30',
      },
      INFORMATIONAL: {
        badgeBg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
        icon: Info,
        border: 'border-slate-500/30',
      },
    }[selectedFinding.severity];

    const SeverityIcon = severityConfig.icon;

    return (
      <div
        id="contextual-side-inspector"
        className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300"
      >
        {/* Inspector Header with Dismiss */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Statutory Clause Inspector
            </span>
          </div>

          <button
            onClick={onClearSelection}
            className="flex items-center gap-1 rounded-lg bg-slate-800/80 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
            title="Return to Executive Overview"
          >
            <span className="text-[11px]">Overview</span>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Metadata Header & Badges */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${severityConfig.badgeBg}`}
              >
                <SeverityIcon className="h-3.5 w-3.5" />
                <span>{selectedFinding.severity} VIOLATION</span>
              </span>

              <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
                {selectedFinding.regulatorCode}
              </span>

              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-400 flex items-center gap-1">
                <FileCheck className="h-3 w-3" />
                <span>Verified Gazette Corpus</span>
              </span>
            </div>

            <div className="font-mono text-sm font-semibold text-white">
              {selectedFinding.ruleCode}
            </div>
          </div>

          {/* Verbatim Flagged Excerpt */}
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 space-y-1.5">
            <div className="text-[11px] uppercase tracking-wider text-red-400 font-semibold flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Flagged Copy Excerpt</span>
            </div>
            <p className="text-sm font-medium text-red-200 italic leading-relaxed">
              &ldquo;{selectedFinding.flaggedExcerpt}&rdquo;
            </p>
          </div>

          {/* Statutory Authority & Section Reference */}
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-4 space-y-2">
            <div className="text-[11px] uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5" />
              <span>Statutory Authority & Official Gazette</span>
            </div>
            <div className="text-sm font-mono text-white font-medium">
              {selectedFinding.statutoryCitation}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enforced by the {selectedFinding.regulatorCode}. Non-compliance triggers administrative sanctions and mandatory corrective publishing orders.
            </p>
          </div>

          {/* Deterministic Statutory Penalty Schedule */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4 space-y-1.5">
            <div className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5" />
              <span>Statutory Penalty Schedule</span>
            </div>
            <div className="text-xl font-extrabold text-white">
              {formattedPenalty}
            </div>
            <p className="text-[11px] text-slate-400">
              Deterministic penalty based on verified statutory instrument schedules. Zero hallucination.
            </p>
          </div>

          {/* "Why It Matters" Nigerian Regulatory Counsel Note */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Why It Matters Under Nigerian Law
            </h4>
            <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 text-sm text-slate-300 leading-relaxed">
              {selectedFinding.whyItMatters}
            </div>
          </div>

          {/* Mandatory Regulatory Disclosure Required */}
          {selectedFinding.mandatoryDisclosureRequired && (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4 space-y-1.5">
              <div className="text-[11px] uppercase tracking-wider text-indigo-300 font-semibold">
                Mandatory Regulatory Disclosure
              </div>
              <p className="text-xs text-indigo-200 leading-relaxed">
                {selectedFinding.mandatoryDisclosureRequired}
              </p>
            </div>
          )}

          {/* Recommended Remediation Action */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" />
              <span>Recommended Remediation</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedFinding.recommendedAction}
            </p>
          </div>

          {/* Cross-Pillar Synergies (Task 19.2) */}
          {onSwitchPillar && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Cross-Pillar Traceability Links
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onSwitchPillar('radar', {
                      targetPillar: 'radar',
                      regulatorCode: selectedFinding.regulatorCode,
                      searchTerm: selectedFinding.ruleCode,
                    })
                  }
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-semibold text-sky-400 border border-slate-800 transition-colors"
                >
                  <span>Trace in Radar</span>
                  <ExternalLink className="w-3 h-3 text-sky-400" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSwitchPillar('gap-matrix', {
                      targetPillar: 'gap-matrix',
                      searchTerm: selectedFinding.ruleCode,
                    })
                  }
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-semibold text-indigo-400 border border-slate-800 transition-colors"
                >
                  <span>Trace in 5-W Matrix</span>
                  <ExternalLink className="w-3 h-3 text-indigo-400" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-800 p-4 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Lineage: {selectedFinding.ruleCode}
          </span>
          <button
            onClick={onClearSelection}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Done Inspecting
          </button>
        </div>
      </div>
    );
  }

  // Default state: Show Overview Inspector with Executive Briefing, ARCON Notice & CCO Status
  return (
    <div
      id="contextual-side-inspector-overview"
      className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-xl overflow-hidden transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-indigo-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Institutional Context Inspector
          </span>
        </div>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-cyan-300 font-mono">
          {viewModel.channel}
        </span>
      </div>

      {/* Scrollable Overview */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* ARCON Pre-Clearance Card */}
        <div
          className={`rounded-xl border p-4 space-y-2 ${
            viewModel.arconPreclearanceRequired
              ? 'border-amber-500/30 bg-amber-950/20'
              : 'border-emerald-500/30 bg-emerald-950/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              ARCON ASP Status
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                viewModel.arconPreclearanceRequired
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {viewModel.arconPreclearanceRequired ? 'Mandatory Submission' : 'Standard Compliance'}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-300">
            {viewModel.arconPreclearanceRequired
              ? 'Under ARCON Code Article 24(1), financial advertisements must receive pre-exposure clearance from the Advertising Standards Panel prior to public dissemination.'
              : 'Standard pre-vetting thresholds met. Retain internal audit records for supervisory inspection.'}
          </p>
        </div>

        {/* Operational Executive Briefing */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Executive Briefing
          </h4>
          <p className="text-xs leading-relaxed text-slate-300 bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
            {viewModel.executiveSummary}
          </p>
        </div>

        {/* Tenant Active Licenses */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Active Tenant License Profiles
          </h4>
          {viewModel.activeLicenseProfiles && viewModel.activeLicenseProfiles.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {viewModel.activeLicenseProfiles.map((lic) => (
                <span
                  key={lic}
                  className="rounded-lg bg-slate-800/90 border border-slate-700 px-2.5 py-1 text-[11px] font-mono text-cyan-300"
                >
                  {lic}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Standard non-bank fintech & consumer lender profile active.
            </p>
          )}
        </div>

        {/* Interactive Instruction Banner */}
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-4 text-center space-y-1">
          <p className="text-xs font-medium text-slate-300">
            Select any finding or highlighted text
          </p>
          <p className="text-[11px] text-slate-500">
            Clicking a violation span opens the full statutory evidence and Gazette citations here.
          </p>
        </div>
      </div>

      {/* Footer Lineage & Hash */}
      <div className="border-t border-slate-800 p-4 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-emerald-400" />
          <span>RLS & ZDR Enforced</span>
        </span>
        <span className="font-mono text-[11px] text-slate-500">
          SHA: {viewModel.telemetry.auditHash.substring(0, 8)}...
        </span>
      </div>
    </div>
  );
};
