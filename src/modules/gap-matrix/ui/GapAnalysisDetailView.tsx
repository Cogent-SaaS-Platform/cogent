'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Share2,
  Download,
  Copy,
  Check,
  MoreVertical,
  ChevronRight,
  Info,
  FileText,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  User,
  Clock,
  Layers,
  AlertTriangle,
  Scale,
} from 'lucide-react';
import { GapAnalysisSummaryItem } from '@/app/api/gap-matrix/evaluations/route';
import { ComplianceStatus } from '@/shared/types';

interface GapAnalysisDetailViewProps {
  analysis: GapAnalysisSummaryItem;
  items: Array<{
    id: string;
    regulatoryClauseReference: string;
    complianceStatus: ComplianceStatus;
    whatHappened: string;
    whatToDo: string;
    responsibleRole: string;
    statutoryPenaltyNaira: number;
    statutoryLegalCitation: string;
    matchedPolicySection: string | null;
  }>;
  onBack: () => void;
  onNavigateToObligations: (filterStatus?: 'ALL' | 'ADEQUATELY_MET' | 'PARTIALLY_MET' | 'CRITICAL_GAP') => void;
  onOpenDossierModal: () => void;
}

export function GapAnalysisDetailView({
  analysis,
  items,
  onBack,
  onNavigateToObligations,
  onOpenDossierModal,
}: GapAnalysisDetailViewProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<string>(
    analysis.status === 'COMPLETED' ? 'Completed' : 'Review Pending'
  );

  const total = items.length || analysis.obligationsAssessedCount || 1;
  const adequateCount = items.filter((i) => i.complianceStatus === 'ADEQUATELY_MET').length || analysis.adequateCount;
  const partialCount = items.filter((i) => i.complianceStatus === 'PARTIALLY_MET').length || analysis.partialCount;
  const gapCount = items.filter((i) => i.complianceStatus === 'CRITICAL_GAP').length || analysis.gapCount;
  const pendingReviewCount = partialCount + gapCount;
  const closedCount = adequateCount;

  const adequatePct = Math.round((adequateCount / total) * 100);
  const partialPct = Math.round((partialCount / total) * 100);
  const gapPct = Math.max(0, 100 - adequatePct - partialPct);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Breadcrumb & Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Back to Gap Analysis List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <button
              type="button"
              onClick={onBack}
              className="hover:text-slate-900 hover:underline transition-colors"
            >
              Gap Analysis
            </button>
            <span>&gt;</span>
            <span className="font-semibold text-slate-900 truncate max-w-md">
              {analysis.analysisName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenDossierModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Dossier</span>
          </button>
        </div>
      </div>

      {/* 2. Main Workspace Grid: Left Content (2 cols) & Right Sidebar (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top 3 Metric Cards Strip (Per AGENTS.md: Hairline divided, monochrome font-mono) */}
          <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 shadow-2xs">
            {/* Card 1: Total Obligations Assessed */}
            <div
              onClick={() => onNavigateToObligations('ALL')}
              className="p-5 cursor-pointer hover:bg-slate-50/80 transition-colors group"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block group-hover:text-slate-900">
                Obligations Assessed
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-slate-900 font-mono text-2xl font-bold tracking-tight">
                  {total}
                </span>
                <span className="text-slate-400 text-xs group-hover:text-slate-700">View All →</span>
              </div>
            </div>

            {/* Card 2: Review Pending */}
            <div
              onClick={() => onNavigateToObligations('PARTIALLY_MET')}
              className="p-5 cursor-pointer hover:bg-slate-50/80 transition-colors group"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block group-hover:text-slate-900">
                Review Pending
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-slate-900 font-mono text-2xl font-bold tracking-tight">
                  {pendingReviewCount}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Requires Review →
                </span>
              </div>
            </div>

            {/* Card 3: Closed */}
            <div
              onClick={() => onNavigateToObligations('ADEQUATELY_MET')}
              className="p-5 cursor-pointer hover:bg-slate-50/80 transition-colors group"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block group-hover:text-slate-900">
                Closed
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-slate-900 font-mono text-2xl font-bold tracking-tight">
                  {closedCount}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Adequate →
                </span>
              </div>
            </div>
          </div>

          {/* Assessed Coverage Section (Zango temp (13).png) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Assessed Coverage
              </h3>
              <div className="inline-flex items-center gap-1 text-xs text-slate-500">
                <span>
                  {analysis.scope === 'COMPLETE_REGULATORY_REVIEW'
                    ? 'Complete Regulatory Review'
                    : 'Policy Regulatory Review'}
                </span>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            {/* Tri-Color Segmented Progress Bar (Clickable segments) */}
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex cursor-pointer">
              <div
                style={{ width: `${adequatePct}%` }}
                onClick={() => onNavigateToObligations('ADEQUATELY_MET')}
                className="bg-emerald-500 h-full transition-all hover:opacity-90"
                title={`Adequately Met: ${adequateCount} (Click to view)`}
              />
              <div
                style={{ width: `${partialPct}%` }}
                onClick={() => onNavigateToObligations('PARTIALLY_MET')}
                className="bg-amber-400 h-full transition-all hover:opacity-90"
                title={`Partially Met: ${partialCount} (Click to view)`}
              />
              <div
                style={{ width: `${gapPct}%` }}
                onClick={() => onNavigateToObligations('CRITICAL_GAP')}
                className="bg-rose-400 h-full transition-all hover:opacity-90"
                title={`Critical Gap: ${gapCount} (Click to view)`}
              />
            </div>

            {/* Interactive Filter Links that navigate to Obligations List */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onNavigateToObligations('ADEQUATELY_MET')}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 text-xs transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 shrink-0" />
                  <span className="font-medium text-slate-700 group-hover:text-slate-950">
                    Adequate
                  </span>
                  <span className="font-mono text-slate-500 font-semibold">
                    {adequateCount}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateToObligations('PARTIALLY_MET')}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 text-xs transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 shrink-0" />
                  <span className="font-medium text-slate-700 group-hover:text-slate-950">
                    Partial
                  </span>
                  <span className="font-mono text-slate-500 font-semibold">
                    {partialCount}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateToObligations('CRITICAL_GAP')}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 text-xs transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-400 shrink-0" />
                  <span className="font-medium text-slate-700 group-hover:text-slate-950">
                    Gap
                  </span>
                  <span className="font-mono text-slate-500 font-semibold">
                    {gapCount}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>

          {/* Mapped Regulations & Policies Visual Bridge (Zango temp (13).png) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center relative">
              {/* Left Column: Regulations */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <BookOpen className="w-3 h-3 text-slate-400" />
                  <span>Regulations</span>
                </div>
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {analysis.regulationTitle}
                </p>
                <span className="text-[11px] font-mono text-slate-500 block">
                  [{analysis.regulatorCode}] {analysis.regulationShortName}
                </span>
              </div>

              {/* Right Column: Policies */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <FileText className="w-3 h-3 text-slate-400" />
                  <span>Policies</span>
                </div>
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {analysis.policyTitle}
                </p>
                <span className="text-[11px] font-mono text-slate-500 block">
                  Version v{analysis.versionTag} • Dept: {analysis.department}
                </span>
              </div>
            </div>
          </div>

          {/* Action Plan Table (Zango temp (13).png) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 px-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Action Plan
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded-full bg-slate-100 text-slate-700">
                  {items.filter((i) => i.complianceStatus !== 'ADEQUATELY_MET').length}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigateToObligations('ALL')}
                  className="text-xs font-semibold text-slate-900 hover:underline inline-flex items-center gap-1"
                >
                  <span>View All Obligations</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {items.filter((i) => i.complianceStatus !== 'ADEQUATELY_MET').length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                All assessed obligations are adequately met. Zero pending remediation actions.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {items
                  .filter((i) => i.complianceStatus !== 'ADEQUATELY_MET')
                  .slice(0, 4)
                  .map((action, idx) => (
                    <div
                      key={action.id || idx}
                      onClick={() => onNavigateToObligations('ALL')}
                      className="p-4 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {action.regulatoryClauseReference}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            {action.statutoryLegalCitation}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-1">
                          {action.whatToDo}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 text-xs text-slate-600">
                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                          <span>Policy:</span>
                          <span className="font-semibold text-slate-700">
                            {action.matchedPolicySection || 'Omitted'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                            {action.responsibleRole
                              ?.split(' ')
                              .map((w) => w[0])
                              .join('')
                              .slice(0, 2) || 'CC'}
                          </div>
                          <span className="text-[11px] text-slate-600">
                            {action.responsibleRole || 'CCO'}
                          </span>
                        </div>

                        <span className="font-mono text-xs font-semibold text-slate-900">
                          ₦{(action.statutoryPenaltyNaira / 1_000_000).toFixed(0)}M
                        </span>

                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column Sidebar (Zango temp (13).png) */}
        <div className="space-y-6">
          {/* Actions & Workflow Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Actions
            </h4>

            {/* Workflow Status Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">Status</label>
              <select
                value={workflowStatus}
                onChange={(e) => setWorkflowStatus(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer focus:bg-white"
              >
                <option value="Review Pending">Review Pending</option>
                <option value="Under Board Review">Under Board Review</option>
                <option value="Completed">Completed / Audited</option>
              </select>
            </div>

            {/* Assignee */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">Assignee</label>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium">Chief Compliance Officer</span>
              </div>
            </div>

            {/* Share & Export Buttons */}
            <div className="pt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onOpenDossierModal}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Analysis Details Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3.5 text-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Analysis Details
            </h4>

            <div>
              <span className="text-slate-400 block text-[11px]">Last modified</span>
              <span className="font-medium text-slate-800">
                {new Date(analysis.lastModifiedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Analysis created on</span>
              <span className="font-medium text-slate-800">
                {new Date(analysis.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Analysis created by</span>
              <span className="font-medium text-slate-800">
                Compliance Risk & Assurance Lead
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Analysis Type</span>
              <span className="font-medium text-slate-800">
                {analysis.scope === 'COMPLETE_REGULATORY_REVIEW'
                  ? 'Complete Regulatory Review'
                  : 'Policy Regulatory Review'}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-400 block text-[11px]">Statutory Fine Exposure</span>
              <span className="font-mono text-base font-bold text-slate-900">
                ₦{(analysis.totalPenaltyNaira / 1_000_000).toFixed(1)}M
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Deterministic liability hedged via remediation
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
