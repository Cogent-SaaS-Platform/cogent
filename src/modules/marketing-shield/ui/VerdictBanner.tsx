'use client';

import React from 'react';
import { ScanVerdict } from '@/shared/types';
import { ShieldAlert, AlertTriangle, Eye, ShieldCheck, Scale } from 'lucide-react';

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
  const verdictConfig = {
    BLOCKING_ISSUE: {
      label: 'BLOCKING ISSUE DETECTED',
      badgeBg: 'bg-red-50 border-red-200 text-red-700',
      bannerBg: 'from-red-50/80 via-white to-white border-red-200',
      icon: ShieldAlert,
      iconColor: 'text-red-600',
      description:
        'Copy contains direct statutory prohibitions under Nigerian financial & advertising regulations. Dissemination is strictly prohibited prior to full legal remediation.',
      riskColor: 'text-red-700',
      barColor: 'bg-red-600',
    },
    ISSUE_DETECTED: {
      label: 'STATUTORY ISSUES DETECTED',
      badgeBg: 'bg-orange-50 border-orange-200 text-orange-800',
      bannerBg: 'from-orange-50/80 via-white to-white border-orange-200',
      icon: AlertTriangle,
      iconColor: 'text-orange-600',
      description:
        'Copy breaches specific regulatory obligations under applicable supervisory codes. Statutory fines apply if published without mandatory disclosures.',
      riskColor: 'text-orange-800',
      barColor: 'bg-orange-500',
    },
    REVIEW_RECOMMENDED: {
      label: 'COMPLIANCE REVIEW RECOMMENDED',
      badgeBg: 'bg-amber-50 border-amber-200 text-amber-800',
      bannerBg: 'from-amber-50/80 via-white to-white border-amber-200',
      icon: Eye,
      iconColor: 'text-amber-600',
      description:
        'No direct statutory prohibitions found, but promotional wording presents potential regulatory ambiguity. CCO verification advised.',
      riskColor: 'text-amber-800',
      barColor: 'bg-amber-500',
    },
    NO_ISSUE_DETECTED: {
      label: 'NO STATUTORY ISSUES DETECTED',
      badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      bannerBg: 'from-emerald-50/80 via-white to-white border-emerald-200',
      icon: ShieldCheck,
      iconColor: 'text-emerald-600',
      description:
        'No violations detected against verified retrieved statutory corpus (ARCON Code 2022, CBN CPF 2019, FCCPC Guidelines). Epistemic note: Final clearance subject to human CCO sign-off.',
      riskColor: 'text-emerald-800',
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
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-r ${verdictConfig.bannerBg} p-6 shadow-xs transition-all`}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Verdict & Description */}
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-bold tracking-wider ${verdictConfig.badgeBg}`}
            >
              <IconComponent className={`h-4 w-4 ${verdictConfig.iconColor}`} />
              <span>{verdictConfig.label}</span>
            </div>

            <span className="rounded-full bg-[#F5F6FA] px-3 py-1 text-xs font-semibold text-[#4B5565] border border-[#DDE3EE]">
              {findingsCount} {findingsCount === 1 ? 'Finding Flagged' : 'Findings Flagged'}
            </span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-[#0B0F1A] sm:text-2xl">
            {campaignName}
          </h2>

          <p className="max-w-2xl text-sm leading-relaxed text-[#4B5565]">
            {verdictConfig.description}
          </p>
        </div>

        {/* Right: Risk Score & Deterministic Penalty Exposure */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 border-t border-[#DDE3EE] pt-4 lg:border-t-0 lg:pt-0">
          {/* Risk Score Widget */}
          <div className="flex flex-col items-center justify-center rounded-xl bg-white border border-[#DDE3EE] px-5 py-3.5 min-w-[120px] shadow-xs">
            <span className="text-xs uppercase tracking-wider text-[#4B5565] font-semibold">
              Risk Score
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={`text-3xl font-extrabold ${verdictConfig.riskColor}`}>
                {riskScore}
              </span>
              <span className="text-xs text-[#8D99AE]">/ 100</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-[#E8EDF5] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${verdictConfig.barColor}`}
                style={{ width: `${Math.min(100, Math.max(0, riskScore))}%` }}
              />
            </div>
          </div>

          {/* Deterministic Statutory Exposure */}
          <div className="flex flex-col rounded-xl bg-white border border-[#DDE3EE] px-5 py-3.5 min-w-[200px] shadow-xs">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#4B5565] font-semibold">
              <Scale className="h-3.5 w-3.5 text-amber-600" />
              <span>Statutory Fine Exposure</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold tracking-tight text-[#0B0F1A]">
                {formattedPenalty}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-[#4B5565]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              <span>Deterministic Statutory Schedule</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
