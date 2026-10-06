'use client';

import React from 'react';
import { ScanVerdict } from '@/shared/types';
import { ShieldAlert, AlertTriangle, Eye, ShieldCheck, Scale, AlertOctagon } from 'lucide-react';

interface VerdictBannerProps {
  verdict: ScanVerdict;
  riskScore: number;
  deterministicPenaltyNaira: number;
  campaignName: string;
  findingsCount: number;
}

export const VerdictBanner: React.FC<VerdictBannerProps> = ({
  verdict,
  riskScore,
  deterministicPenaltyNaira,
  campaignName,
  findingsCount,
}) => {
  // Config based on evidence-bounded scan verdict
  const verdictConfig = {
    BLOCKING_ISSUE: {
      label: 'BLOCKING ISSUE DETECTED',
      badgeBg: 'bg-red-500/10 border-red-500/30 text-red-400',
      bannerBg: 'from-red-950/40 via-red-900/10 to-slate-900/60 border-red-500/30',
      icon: ShieldAlert,
      iconColor: 'text-red-400',
      description:
        'Copy contains direct statutory prohibitions under Nigerian financial & advertising regulations. Dissemination is strictly prohibited prior to full legal remediation.',
      riskColor: 'text-red-400',
      barColor: 'bg-red-500',
    },
    ISSUE_DETECTED: {
      label: 'STATUTORY ISSUES DETECTED',
      badgeBg: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
      bannerBg: 'from-orange-950/40 via-orange-900/10 to-slate-900/60 border-orange-500/30',
      icon: AlertTriangle,
      iconColor: 'text-orange-400',
      description:
        'Copy breaches specific regulatory obligations under applicable supervisory codes. Statutory fines apply if published without mandatory disclosures.',
      riskColor: 'text-orange-400',
      barColor: 'bg-orange-500',
    },
    REVIEW_RECOMMENDED: {
      label: 'COMPLIANCE REVIEW RECOMMENDED',
      badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      bannerBg: 'from-amber-950/40 via-amber-900/10 to-slate-900/60 border-amber-500/30',
      icon: Eye,
      iconColor: 'text-amber-400',
      description:
        'No direct statutory prohibitions found, but promotional wording presents potential regulatory ambiguity. CCO verification advised.',
      riskColor: 'text-amber-400',
      barColor: 'bg-amber-500',
    },
    NO_ISSUE_DETECTED: {
      label: 'NO STATUTORY ISSUES DETECTED',
      badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      bannerBg: 'from-emerald-950/40 via-emerald-900/10 to-slate-900/60 border-emerald-500/30',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400',
      description:
        'No violations detected against verified retrieved statutory corpus (ARCON Code 2022, CBN CPF 2019, FCCPC Guidelines). Epistemic note: Final clearance subject to human CCO sign-off.',
      riskColor: 'text-emerald-400',
      barColor: 'bg-emerald-500',
    },
  }[verdict];

  const IconComponent = verdictConfig.icon;

  const formattedPenalty = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(deterministicPenaltyNaira);

  return (
    <div
      id="marketing-shield-verdict-banner"
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-r ${verdictConfig.bannerBg} p-6 shadow-xl backdrop-blur-xl transition-all`}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Verdict & Description */}
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold tracking-wider ${verdictConfig.badgeBg}`}
            >
              <IconComponent className={`h-4 w-4 ${verdictConfig.iconColor}`} />
              <span>{verdictConfig.label}</span>
            </div>

            <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-400 border border-slate-700/50">
              {findingsCount} {findingsCount === 1 ? 'Finding Flagged' : 'Findings Flagged'}
            </span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            {campaignName}
          </h2>

          <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
            {verdictConfig.description}
          </p>
        </div>

        {/* Right: Risk Score & Deterministic Penalty Exposure */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 border-t border-slate-800/80 pt-4 lg:border-t-0 lg:pt-0">
          {/* Risk Score Widget */}
          <div className="flex flex-col items-center justify-center rounded-xl bg-slate-900/80 border border-slate-800 px-5 py-3.5 min-w-[120px]">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
              Risk Score
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={`text-3xl font-extrabold ${verdictConfig.riskColor}`}>
                {riskScore}
              </span>
              <span className="text-xs text-slate-500">/ 100</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${verdictConfig.barColor}`}
                style={{ width: `${Math.min(100, Math.max(0, riskScore))}%` }}
              />
            </div>
          </div>

          {/* Deterministic Statutory Exposure */}
          <div className="flex flex-col rounded-xl bg-slate-900/90 border border-slate-800 px-5 py-3.5 min-w-[200px]">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-400 font-medium">
              <Scale className="h-3.5 w-3.5 text-amber-400" />
              <span>Statutory Fine Exposure</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold tracking-tight text-white">
                {formattedPenalty}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
              <span>Deterministic Statutory Schedule</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
