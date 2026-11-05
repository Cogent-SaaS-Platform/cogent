'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, ArrowUpRight } from 'lucide-react';
import {
  MultiPillarLiveTelemetry,
  RegulatorCoverageItem,
  TrendingTopicItem,
  ImpactedPolicyItem,
} from '../types';
import {
  DashboardTrendingTopicItem,
  DashboardImpactedPolicyItem,
} from '@/app/api/dashboard/overview/route';

export interface RegulatoryPressureStripProps {
  telemetry?: MultiPillarLiveTelemetry;
  regulators?: RegulatorCoverageItem[];
  trendingTopics?: DashboardTrendingTopicItem[] | TrendingTopicItem[];
  impactedPolicies?: DashboardImpactedPolicyItem[] | ImpactedPolicyItem[];
  totalAlerts90d?: number;
  trendPercentage?: string;
  totalImpactedSections?: number;
  onSelectTopic?: (topic: string) => void;
  onSelectPolicy?: (policyNameOrUrl: string) => void;
}

export function RegulatoryPressureStrip({
  telemetry,
  regulators = [],
  trendingTopics = [],
  impactedPolicies = [],
  totalAlerts90d,
  trendPercentage = '↑24%',
  totalImpactedSections,
  onSelectTopic,
  onSelectPolicy,
}: RegulatoryPressureStripProps) {
  const router = useRouter();

  // Compute total alerts count from props or telemetry
  const alertsCount = totalAlerts90d ?? telemetry?.radar?.activeCirculars ?? 86;

  // Compute total impacted sections
  const impactedSectionsCount =
    totalImpactedSections ??
    telemetry?.gapMatrix?.criticalGapsCount ??
    impactedPolicies.reduce((sum, p) => sum + (p.alertCount || 0), 0);

  const handleTopicClick = (topic: any) => {
    if (onSelectTopic) {
      onSelectTopic(topic.name);
    } else if (topic.filterUrl) {
      router.push(topic.filterUrl);
    } else {
      router.push(`/insight?topic=${encodeURIComponent(topic.name)}`);
    }
  };

  const handlePolicyClick = (policy: any) => {
    if (onSelectPolicy) {
      onSelectPolicy(policy.targetUrl || policy.name);
    } else if (policy.targetUrl) {
      router.push(policy.targetUrl);
    } else {
      router.push(`/gap?policy=${encodeURIComponent(policy.name)}`);
    }
  };

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
              <span className="font-semibold text-slate-900">{alertsCount} alerts</span> · 90d{' '}
              <span className="text-emerald-600 font-bold ml-1">{trendPercentage}</span>
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {trendingTopics.length > 0 ? (
              trendingTopics.map((topic: any) => {
                const max = topic.max || Math.max(...trendingTopics.map((t: any) => t.count), 1);
                const barWidthPercent = Math.max(4, Math.round((topic.count / max) * 100));
                const deltaStr = topic.delta || topic.trendValue || '→';

                return (
                  <div
                    key={topic.name || topic.topicKey}
                    onClick={() => handleTopicClick(topic)}
                    className="flex items-center justify-between gap-3 group cursor-pointer hover:bg-slate-50/80 -mx-2 px-2 py-1 rounded-md transition-colors"
                    title={`Filter Horizon alerts for ${topic.name}`}
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

                    {/* Trend Delta Indicator */}
                    <span
                      className={`font-mono text-[11px] font-semibold w-6 text-right ${
                        deltaStr.startsWith('↑')
                          ? 'text-rose-600'
                          : deltaStr.startsWith('↓')
                          ? 'text-emerald-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {deltaStr}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No active topic signals detected in the selected 90-day window.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Most Impacted Policies */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800">
              Most Impacted Policies
            </span>
            <span className="text-[11px] text-slate-500">
              Open Gap findings ·{' '}
              <span className="font-mono font-semibold text-slate-900">
                {impactedSectionsCount} obligations
              </span>{' '}
              impacted
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {impactedPolicies.length > 0 ? (
              impactedPolicies.map((policy: any) => {
                const regs = Array.isArray(policy.regulators) ? policy.regulators.join(' · ') : 'CBN';

                return (
                  <div
                    key={policy.id}
                    onClick={() => handlePolicyClick(policy)}
                    className="flex items-center justify-between gap-3 group cursor-pointer hover:bg-slate-50/80 -mx-2 px-2 py-1.5 rounded-md transition-colors"
                    title={`Inspect Gap Analysis for ${policy.name}`}
                  >
                    {/* Left: Policy Title & Regulatory Sources */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h3 className="text-xs font-semibold text-slate-900 truncate group-hover:text-slate-950 transition-colors">
                        {policy.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-mono truncate">
                        {regs}
                      </p>
                    </div>

                    {/* Right: Alert Count, Owner Initials & Arrow */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-xs text-slate-600 font-medium">
                        {policy.alertCount} {policy.alertCount === 1 ? 'finding' : 'findings'}
                      </span>

                      <div
                        className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 flex items-center justify-center shrink-0 uppercase"
                        title={`Policy Owner: ${policy.ownerInitials || 'CCO'}`}
                      >
                        {policy.ownerInitials || 'CCO'}
                      </div>

                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 flex flex-col items-center justify-center space-y-2 text-center">
                <p className="text-xs text-slate-500">
                  No internal policies evaluated yet.
                </p>
                <Link
                  href="/gap"
                  className="btn-base btn-primary btn-xs gap-1"
                >
                  <span>Run Gap Analysis</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
