'use client';

import React from 'react';
import { FindingPresentationCard } from '@/shared/types/presentation';
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  Scale,
  BookOpen,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface FindingCardProps {
  finding: FindingPresentationCard;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  isSelected = false,
  onSelect,
}) => {
  const severityConfig = {
    CRITICAL: {
      badgeBg: 'bg-red-50 text-red-700 border-red-200',
      icon: AlertOctagon,
      border: isSelected ? 'border-red-500 ring-2 ring-red-500/20' : 'border-[#DDE3EE] hover:border-red-300',
      leftBar: 'bg-red-600',
    },
    HIGH: {
      badgeBg: 'bg-orange-50 text-orange-800 border-orange-200',
      icon: AlertTriangle,
      border: isSelected ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-[#DDE3EE] hover:border-orange-300',
      leftBar: 'bg-orange-500',
    },
    MEDIUM: {
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: Info,
      border: isSelected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-[#DDE3EE] hover:border-amber-300',
      leftBar: 'bg-amber-500',
    },
    LOW: {
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Info,
      border: isSelected ? 'border-[#2A4BFF] ring-2 ring-[#2A4BFF]/20' : 'border-[#DDE3EE] hover:border-blue-300',
      leftBar: 'bg-[#2A4BFF]',
    },
    INFORMATIONAL: {
      badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
      icon: Info,
      border: isSelected ? 'border-slate-500 ring-2 ring-slate-500/20' : 'border-[#DDE3EE] hover:border-slate-300',
      leftBar: 'bg-slate-400',
    },
  }[finding.severity] || {
    badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: Info,
    border: 'border-[#DDE3EE]',
    leftBar: 'bg-slate-400',
  };

  const SeverityIcon = severityConfig.icon;

  const formattedPenalty = finding.statutoryPenaltyNaira
    ? new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
      }).format(finding.statutoryPenaltyNaira)
    : 'Administrative Sanction / Caution';

  return (
    <div
      id={`finding-${finding.id}`}
      onClick={onSelect}
      className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-xs transition-all cursor-pointer ${severityConfig.border}`}
    >
      {/* Visual Accent Strip on Left */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 ${severityConfig.leftBar}`}
      />

      <div className="pl-2 space-y-4">
        {/* Header Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Severity Chip */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${severityConfig.badgeBg}`}
            >
              <SeverityIcon className="h-3.5 w-3.5" />
              <span>{finding.severity}</span>
            </span>

            {/* Regulator Badge */}
            <span className="rounded-full bg-[#EEF2FF] border border-[#2A4BFF]/20 px-2.5 py-0.5 text-xs font-bold text-[#2A4BFF]">
              {finding.regulatorCode}
            </span>

            {/* Finding Type */}
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                finding.findingType === 'CLAIMS_LEDGER_MATCH'
                  ? 'bg-purple-50 border-purple-200 text-purple-800'
                  : 'bg-[#F5F6FA] border-[#DDE3EE] text-[#4B5565]'
              }`}
            >
              {finding.findingType === 'CLAIMS_LEDGER_MATCH'
                ? '⚡ Claims Ledger Match'
                : finding.findingType === 'DETERMINISTIC_MATCH'
                ? 'Zero-Latency Prohibited Term'
                : 'Statutory Clause Match'}
            </span>
          </div>

          {/* Rule Code */}
          <span className="font-mono text-xs text-[#0B0F1A] bg-[#F9FAFC] px-2.5 py-1 rounded-md border border-[#DDE3EE] font-semibold">
            {finding.ruleCode}
          </span>
        </div>

        {/* Verbatim Flagged Excerpt */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5">
          <div className="text-[11px] uppercase tracking-wider text-red-700 font-bold mb-1 flex items-center gap-1.5">
            <ShieldAlert className="h-3 w-3 text-red-600" />
            <span>Flagged Excerpt</span>
          </div>
          <p className="text-sm font-semibold text-red-900 italic">
            &ldquo;{finding.flaggedExcerpt}&rdquo;
          </p>
        </div>

        {/* Why It Matters */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#4B5565] mb-1">
            Why It Matters Under Nigerian Law
          </h4>
          <p className="text-xs leading-relaxed text-[#0B0F1A]">{finding.whyItMatters}</p>
        </div>

        {/* Recommended Action */}
        <div className="rounded-xl bg-[#F9FAFC] border border-[#DDE3EE] p-3.5">
          <div className="text-xs font-bold text-[#2A4BFF] mb-1 flex items-center gap-1.5">
            <ArrowRight className="h-3.5 w-3.5 text-[#2A4BFF]" />
            <span>Recommended Remediation</span>
          </div>
          <p className="text-xs text-[#4B5565] leading-relaxed">{finding.recommendedAction}</p>

          {finding.mandatoryDisclosureRequired && (
            <div className="mt-2.5 pt-2 border-t border-[#DDE3EE] text-[11px] text-amber-800 flex items-start gap-1.5 font-medium">
              <span className="font-bold text-amber-900">Mandatory Disclosure:</span>
              <span>{finding.mandatoryDisclosureRequired}</span>
            </div>
          )}
        </div>

        {/* Statutory Citation Block & Penalty Schedule */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DDE3EE] pt-3 text-xs">
          <div className="flex items-center gap-1.5 text-[#4B5565]">
            <BookOpen className="h-3.5 w-3.5 text-[#2A4BFF]" />
            <span className="font-semibold text-[#0B0F1A]">Authority:</span>
            <span className="text-[#2A4BFF] font-mono font-medium line-clamp-1 max-w-xs">{finding.statutoryCitation}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[#4B5565]">
            <Scale className="h-3.5 w-3.5 text-red-600" />
            <span className="font-semibold text-[#0B0F1A]">Statutory Fine:</span>
            <span className="font-bold text-red-700">{formattedPenalty}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
