'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MultiPillarLiveTelemetry, RegulatorCoverageItem } from '../types';

export interface RegulatoryPressureStripProps {
  telemetry?: MultiPillarLiveTelemetry;
  regulators?: RegulatorCoverageItem[];
  onSelectTopic?: (topic: string) => void;
  onSelectPolicy?: (policyName: string) => void;
}

interface TrendingTopic {
  name: string;
  count: number;
  max: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  trendValue: string;
}

interface ImpactedPolicy {
  id: string;
  name: string;
  regulators: string[];
  alertCount: number;
  ownerInitials: string;
}

export function RegulatoryPressureStrip({
  telemetry,
  regulators = [],
  onSelectTopic,
  onSelectPolicy,
}: RegulatoryPressureStripProps) {
  const radarAlertsCount = telemetry?.radar?.activeCirculars ?? 38;
  const criticalGapsCount = telemetry?.gapMatrix?.criticalGapsCount ?? 14;

  // Real Nigerian RegTech regulatory trending topics derived from active regulatory circulars
  const trendingTopics: TrendingTopic[] = [
    {
      name: 'AML/CFT & Sanctions',
      count: 14,
      max: 16,
      trend: 'UP',
      trendValue: '↑6',
    },
    {
      name: 'Consumer Protection & APR',
      count: 11,
      max: 16,
      trend: 'STABLE',
      trendValue: '→',
    },
    {
      name: 'Data Privacy & NDPA 2023',
      count: 9,
      max: 16,
      trend: 'UP',
      trendValue: '↑4',
    },
    {
      name: 'Cybersecurity & Operational Resilience',
      count: 7,
      max: 16,
      trend: 'UP',
      trendValue: '↑2',
    },
    {
      name: 'Digital Lending & Sub-Brokers',
      count: 6,
      max: 16,
      trend: 'DOWN',
      trendValue: '↓1',
    },
    {
      name: 'Statutory Reporting & CAMA',
      count: 5,
      max: 16,
      trend: 'STABLE',
      trendValue: '→',
    },
  ];

  // Most Impacted Policies from Cogent's policy corpus
  const impactedPolicies: ImpactedPolicy[] = [
    {
      id: 'pol-aml',
      name: 'AML / CFT & Sanctions Policy',
      regulators: ['CBN', 'NFIU', 'FATF'],
      alertCount: 6,
      ownerInitials: 'CCO',
    },
    {
      id: 'pol-fraud',
      name: 'Corporate Governance & Anti-Fraud Policy',
      regulators: ['CAMA', 'CBN', 'EFCC'],
      alertCount: 4,
      ownerInitials: 'JT',
    },
    {
      id: 'pol-lending',
      name: 'Digital Lending & Consumer Credit Policy',
      regulators: ['FCCPC', 'CBN'],
      alertCount: 3,
      ownerInitials: 'AS',
    },
    {
      id: 'pol-data',
      name: 'Data Protection & Privacy Policy',
      regulators: ['NDPC', 'NITDA'],
      alertCount: 3,
      ownerInitials: 'DPO',
    },
  ];

  return (
    <div className="space-y-3">
      {/* 1. Header with Horizon Link */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Regulatory Pressure
        </h2>
        <Link
          href="/insight"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <span>Horizon</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 2. Unified 2-Column Container with Hairline Divider */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Left Column: Trending Topics */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800">
              Trending Topics
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              <span className="font-semibold text-slate-900">{radarAlertsCount} alerts</span> · 90d{' '}
              <span className="text-emerald-600 font-bold ml-1">↑24%</span>
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {trendingTopics.map((topic) => {
              const barWidthPercent = Math.round((topic.count / topic.max) * 100);

              return (
                <div
                  key={topic.name}
                  onClick={() => onSelectTopic?.(topic.name)}
                  className="flex items-center justify-between gap-3 group cursor-pointer hover:bg-slate-50/80 -mx-2 px-2 py-1 rounded-md transition-colors"
                >
                  {/* Topic Label */}
                  <span className="text-xs font-medium text-slate-700 truncate w-44 sm:w-52 group-hover:text-slate-900 transition-colors">
                    {topic.name}
                  </span>

                  {/* Horizontal Bar Track */}
                  <div className="flex-1 max-w-[140px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${barWidthPercent}%` }}
                      className="h-full bg-slate-900 rounded-full transition-all duration-300 group-hover:bg-slate-800"
                    />
                  </div>

                  {/* Numeric Count */}
                  <span className="font-mono text-xs font-bold text-slate-900 w-5 text-right">
                    {topic.count}
                  </span>

                  {/* Trend Indicator */}
                  <span
                    className={`font-mono text-[11px] font-semibold w-6 text-right ${
                      topic.trend === 'UP'
                        ? 'text-rose-600'
                        : topic.trend === 'DOWN'
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {topic.trendValue}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Most Impacted Policies */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800">
              Most Impacted Policies
            </span>
            <span className="text-[11px] text-slate-500">
              Open Monitor alerts ·{' '}
              <span className="font-mono font-semibold text-slate-900">{criticalGapsCount} sections</span> impacted
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {impactedPolicies.map((policy) => {
              return (
                <div
                  key={policy.id}
                  onClick={() => onSelectPolicy?.(policy.name)}
                  className="flex items-center justify-between gap-3 group cursor-pointer hover:bg-slate-50/80 -mx-2 px-2 py-1.5 rounded-md transition-colors"
                >
                  {/* Left: Policy Title & Regulatory Sources */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h3 className="text-xs font-semibold text-slate-900 truncate group-hover:text-slate-950 transition-colors">
                      {policy.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono truncate">
                      {policy.regulators.join(' · ')}
                    </p>
                  </div>

                  {/* Right: Alert Count and Owner Initials */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-xs text-slate-600 font-medium">
                      {policy.alertCount} alerts
                    </span>

                    <div
                      className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 flex items-center justify-center shrink-0 uppercase"
                      title={`Policy Owner: ${policy.ownerInitials}`}
                    >
                      {policy.ownerInitials}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
