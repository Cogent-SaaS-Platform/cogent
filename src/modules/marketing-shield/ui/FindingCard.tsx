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
  FileCheck,
  CheckCircle,
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
      badgeBg: 'bg-red-500/10 text-red-400 border-red-500/30',
      icon: AlertOctagon,
      border: isSelected ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-800 hover:border-red-500/40',
      leftBar: 'bg-red-500',
    },
    HIGH: {
      badgeBg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      icon: AlertTriangle,
      border: isSelected ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-slate-800 hover:border-orange-500/40',
      leftBar: 'bg-orange-500',
    },
    MEDIUM: {
      badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: Info,
      border: isSelected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-800 hover:border-amber-500/40',
      leftBar: 'bg-amber-500',
    },
    LOW: {
      badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      icon: Info,
      border: isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-800 hover:border-blue-500/40',
      leftBar: 'bg-blue-500',
    },
    INFORMATIONAL: {
      badgeBg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
      icon: Info,
      border: isSelected ? 'border-slate-500 ring-2 ring-slate-500/20' : 'border-slate-800 hover:border-slate-500/40',
      leftBar: 'bg-slate-500',
    },
  }[finding.severity] || {
    badgeBg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    icon: Info,
    border: 'border-slate-800',
    leftBar: 'bg-slate-500',
  };

  const SeverityIcon = severityConfig.icon;

  const formattedPenalty = finding.statutoryPenaltyNaira
    ? new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
      }).format(finding.statutoryPenaltyNaira)
    : 'Administrative Sanction / Revocation Warning';

  return (
    <div
      id={`finding-${finding.id}`}
      onClick={onSelect}
      className={`relative overflow-hidden rounded-2xl border bg-slate-900/70 p-5 backdrop-blur-xl shadow-md transition-all cursor-pointer ${severityConfig.border}`}
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
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${severityConfig.badgeBg}`}
            >
              <SeverityIcon className="h-3.5 w-3.5" />
              <span>{finding.severity}</span>
            </span>

            {/* Regulator Badge */}
            <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
              {finding.regulatorCode}
            </span>

            {/* Finding Type */}
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                finding.findingType === 'CLAIMS_LEDGER_MATCH'
                  ? 'bg-purple-950/70 border-purple-500/40 text-purple-300'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-400'
              }`}
            >
              {finding.findingType === 'CLAIMS_LEDGER_MATCH'
                ? '⚡ Institutional Claims Ledger Match'
                : finding.findingType === 'DETERMINISTIC_MATCH'
                ? 'Zero-Latency Prohibited Term'
                : 'Statutory Clause Match'}
            </span>
          </div>

          {/* Rule Code */}
          <span className="font-mono text-xs text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            {finding.ruleCode}
          </span>
        </div>

        {/* Verbatim Flagged Excerpt */}
        <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-3.5">
          <div className="text-[11px] uppercase tracking-wider text-red-400 font-semibold mb-1 flex items-center gap-1.5">
            <ShieldAlert className="h-3 w-3" />
            <span>Flagged Excerpt</span>
          </div>
          <p className="text-sm font-medium text-red-200 italic">
            &ldquo;{finding.flaggedExcerpt}&rdquo;
          </p>
        </div>

        {/* Why It Matters (Plain-English Advisory Counsel) */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Why It Matters Under Nigerian Law
          </h4>
          <p className="text-sm leading-relaxed text-slate-300">{finding.whyItMatters}</p>
        </div>

        {/* Recommended Action */}
        <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3.5">
          <div className="text-xs font-semibold text-indigo-300 mb-1 flex items-center gap-1.5">
            <ArrowRight className="h-3.5 w-3.5 text-indigo-400" />
            <span>Recommended Remediation</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{finding.recommendedAction}</p>

          {finding.mandatoryDisclosureRequired && (
            <div className="mt-2.5 pt-2 border-t border-slate-800 text-[11px] text-amber-300 flex items-start gap-1.5">
              <span className="font-semibold text-amber-400">Mandatory Disclosure:</span>
              <span>{finding.mandatoryDisclosureRequired}</span>
            </div>
          )}
        </div>

        {/* Level 4: Statutory Citation Block & Penalty Schedule */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <BookOpen className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-medium text-slate-300">Statutory Authority:</span>
            <span className="text-cyan-300 font-mono">{finding.statutoryCitation}</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <Scale className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-medium text-slate-300">Statutory Fine:</span>
            <span className="font-bold text-amber-400">{formattedPenalty}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
