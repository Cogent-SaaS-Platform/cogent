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
  ChevronLeft,
  FileText,
  Lock,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { PlatformPillar, CrossPillarLinkContext } from '@/shared/types';

interface ContextualInspectorProps {
  selectedFinding: FindingPresentationCard | null;
  onClearSelection: () => void;
  viewModel: MarketingShieldViewModel;
  onApplyFix?: (fix: string) => void;
  onSwitchPillar?: (pillar: PlatformPillar, context?: CrossPillarLinkContext) => void;
  onSelectFinding?: (findingId: string) => void;
  onOpenStatutoryRef?: (refId: string) => void;
}

export const ContextualInspector: React.FC<ContextualInspectorProps> = ({
  selectedFinding,
  onClearSelection,
  viewModel,
  onApplyFix,
  onSwitchPillar,
  onSelectFinding,
  onOpenStatutoryRef,
}) => {
  const allFindings = viewModel.findings;
  const currentIndex = selectedFinding
    ? allFindings.findIndex((f) => f.id === selectedFinding.id)
    : -1;

  const handlePrev = () => {
    if (currentIndex > 0 && onSelectFinding) {
      onSelectFinding(allFindings[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < allFindings.length - 1 && onSelectFinding) {
      onSelectFinding(allFindings[currentIndex + 1].id);
    }
  };

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
        badgeBg: 'bg-red-50 text-red-700 border-red-200',
        icon: AlertOctagon,
      },
      HIGH: {
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: AlertTriangle,
      },
      MEDIUM: {
        badgeBg: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        icon: Info,
      },
      LOW: {
        badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
        icon: Info,
      },
      INFORMATIONAL: {
        badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
        icon: Info,
      },
    }[selectedFinding.severity];

    const SeverityIcon = severityConfig.icon;

    return (
      <div
        id="contextual-side-inspector"
        className="flex flex-col h-full rounded-2xl border border-[#DDE3EE] bg-white shadow-xs overflow-hidden transition-all font-sans"
      >
        {/* 1. Header with Zango Bounded < 1 / N > Stepper & Dismiss */}
        <div className="flex items-center justify-between border-b border-[#DDE3EE] px-5 py-3.5 bg-[#F9FAFC]">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#2A4BFF]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#0B0F1A]">
              Statutory Clause Inspector
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Zango Bounded Stepper */}
            {allFindings.length > 1 && (
              <div className="flex items-center gap-1 bg-white border border-[#DDE3EE] rounded-lg px-2 py-1 text-xs">
                <button
                  type="button"
                  disabled={currentIndex <= 0}
                  onClick={handlePrev}
                  className="text-[#4B5565] hover:text-[#0B0F1A] disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Previous Finding"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono text-[11px] font-semibold text-[#0B0F1A] px-1">
                  {currentIndex + 1} / {allFindings.length}
                </span>
                <button
                  type="button"
                  disabled={currentIndex >= allFindings.length - 1}
                  onClick={handleNext}
                  className="text-[#4B5565] hover:text-[#0B0F1A] disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Next Finding"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={onClearSelection}
              className="flex items-center gap-1 rounded-lg border border-[#DDE3EE] bg-white px-2 py-1 text-xs font-semibold text-[#4B5565] hover:bg-[#F5F6FA] hover:text-[#0B0F1A] transition-all shadow-xs"
              title="Return to Executive Overview"
            >
              <span>Close</span>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 2. Scrollable Inspector Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Metadata Badges */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${severityConfig.badgeBg}`}
              >
                <SeverityIcon className="h-3.5 w-3.5" />
                <span>{selectedFinding.severity} VIOLATION</span>
              </span>

              <span className="rounded-full bg-[#2A4BFF]/10 border border-[#2A4BFF]/20 px-2.5 py-0.5 text-xs font-bold text-[#2A4BFF]">
                {selectedFinding.regulatorCode}
              </span>

              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                <FileCheck className="h-3 w-3 text-emerald-600" />
                <span>Verified Gazette Corpus</span>
              </span>
            </div>

            <div className="font-mono text-sm font-bold text-[#0B0F1A]">
              {selectedFinding.ruleCode}
            </div>
          </div>

          {/* Flagged Excerpt vs Compliant Alternative (Split Zango Style) */}
          <div className="space-y-3">
            {/* Flagged Copy */}
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 space-y-1.5">
              <div className="text-[11px] uppercase tracking-wider text-red-700 font-bold flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                <span>Flagged Infraction in Copy</span>
              </div>
              <p className="text-sm font-semibold text-red-900 italic leading-relaxed">
                &ldquo;{selectedFinding.flaggedExcerpt}&rdquo;
              </p>
            </div>

            {/* Compliant Rewrite Recommendation */}
            {viewModel.compliantRewrite && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-wider text-emerald-800 font-bold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Compliant Substitute Wording</span>
                  </div>
                  {onApplyFix && (
                    <button
                      type="button"
                      onClick={() => onApplyFix(viewModel.compliantRewrite!)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs font-bold shadow-xs transition-colors"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Adopt Fix</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                  {viewModel.compliantRewrite}
                </p>
              </div>
            )}
          </div>

          {/* Statutory Penalty Exposure */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-amber-800 font-bold flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5 text-amber-600" />
              <span>Deterministic Statutory Fine Exposure</span>
            </div>
            <div className="text-xl font-extrabold text-[#0B0F1A]">
              {formattedPenalty}
            </div>
            <p className="text-[11px] text-[#4B5565]">
              Deterministic penalty based on verified Nigerian statutory instrument schedules.
            </p>
          </div>

          {/* Statutory Citation & Gazette Authority */}
          <div className="rounded-xl border border-[#DDE3EE] bg-[#F9FAFC] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider text-[#2A4BFF] font-bold flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5 text-[#2A4BFF]" />
                <span>Statutory Authority & Clause Citation</span>
              </div>
              {onOpenStatutoryRef && (
                <button
                  type="button"
                  onClick={() => onOpenStatutoryRef(`ref-${selectedFinding.id}`)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2A4BFF] hover:underline"
                >
                  <span>Open Act</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="text-xs font-mono font-semibold text-[#0B0F1A] leading-relaxed">
              {selectedFinding.statutoryCitation}
            </div>
            <p className="text-[11px] text-[#4B5565] leading-relaxed">
              Enforced by {selectedFinding.regulatorCode}. Non-compliance triggers administrative sanctions, publication bans, and corrective advertising orders.
            </p>
          </div>

          {/* Why It Matters Legal Counsel Analysis */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#4B5565]">
              Why It Matters Under Nigerian Law
            </h4>
            <div className="rounded-xl bg-[#F9FAFC] border border-[#DDE3EE] p-4 text-xs text-[#0B0F1A] leading-relaxed font-normal">
              {selectedFinding.whyItMatters}
            </div>
          </div>

          {/* Mandatory Regulatory Disclosure Required */}
          {selectedFinding.mandatoryDisclosureRequired && (
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 space-y-1.5">
              <div className="text-[11px] uppercase tracking-wider text-purple-900 font-bold">
                Mandatory Regulatory Disclosure
              </div>
              <p className="text-xs text-purple-950 font-medium leading-relaxed">
                {selectedFinding.mandatoryDisclosureRequired}
              </p>
            </div>
          )}

          {/* Cross-Pillar Synergies */}
          {onSwitchPillar && (
            <div className="rounded-xl border border-[#DDE3EE] bg-[#F9FAFC] p-3.5 space-y-2">
              <span className="text-[10px] font-bold text-[#4B5565] uppercase tracking-wider block">
                Cross-Pillar Traceability
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
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#F5F6FA] text-[11px] font-semibold text-[#2A4BFF] border border-[#DDE3EE] transition-colors shadow-xs"
                >
                  <span>Trace in Insight</span>
                  <ExternalLink className="w-3 h-3 text-[#2A4BFF]" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSwitchPillar('gap-matrix', {
                      targetPillar: 'gap-matrix',
                      searchTerm: selectedFinding.ruleCode,
                    })
                  }
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#F5F6FA] text-[11px] font-semibold text-purple-700 border border-[#DDE3EE] transition-colors shadow-xs"
                >
                  <span>Trace in 5-W Gap</span>
                  <ExternalLink className="w-3 h-3 text-purple-600" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. Footer */}
        <div className="border-t border-[#DDE3EE] p-4 bg-[#F9FAFC] flex items-center justify-between">
          <span className="text-[11px] text-[#4B5565] font-mono">
            Gazette Ref: {selectedFinding.ruleCode}
          </span>
          <button
            onClick={onClearSelection}
            className="rounded-lg bg-white border border-[#DDE3EE] px-3 py-1.5 text-xs font-semibold text-[#0B0F1A] hover:bg-[#F5F6FA] transition-colors shadow-xs"
          >
            Done Inspecting
          </button>
        </div>
      </div>
    );
  }

  // Default State: Executive Briefing & ARCON Notice
  return (
    <div
      id="contextual-side-inspector-overview"
      className="flex flex-col h-full rounded-2xl border border-[#DDE3EE] bg-white shadow-xs overflow-hidden transition-all font-sans"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#DDE3EE] px-5 py-3.5 bg-[#F9FAFC]">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#2A4BFF]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#0B0F1A]">
            Regulatory Context Inspector
          </span>
        </div>
        <span className="rounded-full bg-[#2A4BFF]/10 border border-[#2A4BFF]/20 px-2.5 py-0.5 text-[11px] text-[#2A4BFF] font-mono font-bold">
          {viewModel.channel}
        </span>
      </div>

      {/* Scrollable Overview */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* ARCON Pre-Clearance Card */}
        <div
          className={`rounded-xl border p-4 space-y-2 ${
            viewModel.arconPreclearanceRequired
              ? 'border-amber-200 bg-amber-50/50'
              : 'border-emerald-200 bg-emerald-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0B0F1A]">
              ARCON ASP Clearance
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                viewModel.arconPreclearanceRequired
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}
            >
              {viewModel.arconPreclearanceRequired ? 'Mandatory Submission' : 'Standard Compliance'}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-[#4B5565]">
            {viewModel.arconPreclearanceRequired
              ? 'Under ARCON Code Article 24(1), financial advertisements must receive pre-exposure clearance from the Advertising Standards Panel prior to public dissemination.'
              : 'Standard pre-vetting thresholds met. Retain internal audit records for supervisory inspection.'}
          </p>
        </div>

        {/* Operational Executive Briefing */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#4B5565]">
            Executive Briefing
          </h4>
          <p className="text-xs leading-relaxed text-[#0B0F1A] bg-[#F9FAFC] border border-[#DDE3EE] rounded-xl p-3.5">
            {viewModel.executiveSummary}
          </p>
        </div>

        {/* Tenant Active Licenses */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#4B5565]">
            Applicable Tenant License Profiles
          </h4>
          {viewModel.activeLicenseProfiles && viewModel.activeLicenseProfiles.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {viewModel.activeLicenseProfiles.map((lic) => (
                <span
                  key={lic}
                  className="rounded-lg bg-[#F5F6FA] border border-[#DDE3EE] px-2.5 py-1 text-[11px] font-mono text-[#0B0F1A] font-semibold"
                >
                  {lic}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8D99AE] italic">
              Standard non-bank fintech & consumer lender profile active.
            </p>
          )}
        </div>

        {/* Interactive Instruction Banner */}
        <div className="rounded-xl border border-dashed border-[#DDE3EE] bg-[#F9FAFC] p-4 text-center space-y-1">
          <p className="text-xs font-bold text-[#0B0F1A]">
            Select any finding or highlighted text
          </p>
          <p className="text-[11px] text-[#4B5565]">
            Clicking an infraction opens the full statutory evidence and Gazette citations here.
          </p>
        </div>
      </div>

      {/* Footer Lineage & Hash */}
      <div className="border-t border-[#DDE3EE] p-4 bg-[#F9FAFC] flex items-center justify-between text-xs text-[#4B5565]">
        <span className="flex items-center gap-1.5 font-medium">
          <Lock className="h-3.5 w-3.5 text-emerald-600" />
          <span>RLS & ZDR Enforced</span>
        </span>
        <span className="font-mono text-[11px] text-[#8D99AE]">
          SHA: {viewModel.telemetry.auditHash.substring(0, 8)}...
        </span>
      </div>
    </div>
  );
};
