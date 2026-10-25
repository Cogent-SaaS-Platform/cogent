'use client';

import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Upload,
  ShieldCheck,
  MoreVertical,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { GapAnalysisSummaryItem } from '@/app/api/gap-matrix/evaluations/route';
import { RegulatorCode } from '@/shared/types';

interface GapAnalysisListViewProps {
  evaluations: GapAnalysisSummaryItem[];
  isLoading: boolean;
  onSelectAnalysis: (analysisId: string) => void;
  onOpenNewAnalysisDrawer: () => void;
  onOpenUploadDrawer: () => void;
  onOpenDossierModal: () => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);

    if (diffMonth >= 1) {
      return diffMonth === 1 ? 'Last updated a month ago' : `Last updated ${diffMonth} months ago`;
    }
    if (diffDay >= 1) {
      return diffDay === 1 ? 'Last updated yesterday' : `Last updated ${diffDay} days ago`;
    }
    if (diffHour >= 1) {
      return diffHour === 1 ? 'Last updated an hour ago' : `Last updated ${diffHour} hours ago`;
    }
    if (diffMin >= 1) {
      return diffMin === 1 ? 'Last updated a minute ago' : `Last updated ${diffMin} minutes ago`;
    }
    return 'Last updated just now';
  } catch {
    return 'Last updated recently';
  }
}

export function GapAnalysisListView({
  evaluations,
  isLoading,
  onSelectAnalysis,
  onOpenNewAnalysisDrawer,
  onOpenUploadDrawer,
  onOpenDossierModal,
}: GapAnalysisListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const filteredEvaluations = evaluations.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.analysisName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.regulationShortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.policyTitle.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar (Zango Layout temp (11).png) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Gap analysis
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Analyse gap between regulations and policies
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenUploadDrawer}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload Policy Manual</span>
          </button>

          <button
            type="button"
            onClick={onOpenDossierModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>Bank Examiner Defense Pack</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewAnalysisDrawer}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>New Gap Analysis</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gap analyses, regulations, or policies..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs text-slate-900 placeholder-slate-400 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-slate-900 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({evaluations.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'IN_PROGRESS'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              In Progress
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'COMPLETED'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completed
            </button>
          </div>
        </div>
      </div>

      {/* 3. Analysis Cards Stack (Zango Layout temp (11).png) */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-6 bg-white border border-slate-200 rounded-xl space-y-4 animate-pulse"
            >
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-1/4" />
              <div className="h-2 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filteredEvaluations.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">No gap analyses found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            {searchQuery
              ? 'No gap analyses matched your query. Clear your search or try different keywords.'
              : 'Start your first statutory gap evaluation between your internal compliance manuals and verified regulations.'}
          </p>
          <button
            type="button"
            onClick={onOpenNewAnalysisDrawer}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Start a New Gap Analysis</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvaluations.map((item) => {
            const total = item.obligationsAssessedCount || 1;
            const adequatePct = Math.round((item.adequateCount / total) * 100);
            const partialPct = Math.round((item.partialCount / total) * 100);
            const gapPct = Math.max(0, 100 - adequatePct - partialPct);

            const isCompleted = item.status === 'COMPLETED' || item.gapCount === 0;
            const isMenuOpen = activeMenuId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => onSelectAnalysis(item.id)}
                className="group relative bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-6 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
              >
                {/* Top Section */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 group-hover:bg-slate-200/70 transition-colors">
                      {item.scope === 'POLICY_REGULATORY_REVIEW' ? (
                        <BookOpen className="w-5 h-5 text-slate-600" />
                      ) : (
                        <FileText className="w-5 h-5 text-slate-600" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-slate-700 transition-colors truncate">
                        {item.analysisName}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.scope === 'COMPLETE_REGULATORY_REVIEW'
                          ? 'Complete Regulatory Review'
                          : 'Policy Regulatory Review'}
                      </p>
                    </div>
                  </div>

                  {/* 3-Dots Action Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : item.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                      title="More options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-8 z-30 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 text-xs animate-in fade-in duration-150"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onSelectAnalysis(item.id);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          <span>Open Detailed Gap Matrix</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onOpenDossierModal();
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>Export Defense Dossier</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Middle Status & Coverage Strip (Zango temp (11).png) */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 items-end justify-between gap-4">
                  {/* Status Indicator */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-400 block">Status</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isCompleted ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      {isCompleted ? 'Completed' : 'In Progress'}
                    </span>
                  </div>

                  {/* Segmented Tri-Color Coverage Bar */}
                  <div className="space-y-1.5 flex flex-col items-start sm:items-end">
                    <div className="text-xs font-medium text-slate-600">
                      <span className="font-mono font-semibold text-slate-900">
                        {item.overallCompliancePercentage.toFixed(0)}%
                      </span>{' '}
                      Coverage
                    </div>

                    {/* Segmented Bar */}
                    <div className="w-48 sm:w-64 h-2 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                      <div
                        style={{ width: `${adequatePct}%` }}
                        className="bg-emerald-500 h-full rounded-l-full transition-all"
                        title={`Adequately Met: ${item.adequateCount}`}
                      />
                      <div
                        style={{ width: `${partialPct}%` }}
                        className="bg-amber-400 h-full transition-all"
                        title={`Partially Met: ${item.partialCount}`}
                      />
                      <div
                        style={{ width: `${gapPct}%` }}
                        className="bg-rose-400 h-full rounded-r-full transition-all"
                        title={`Critical Gap: ${item.gapCount}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Hairline Divider (Zango temp (11).png) */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-y-2">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      1 Regulation
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      1 Policies
                    </span>
                    <span className="font-medium text-slate-600">
                      {item.closedCount > 0
                        ? `${Math.round((item.closedCount / total) * 100)}% Closed`
                        : '0% Closed'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span>{formatRelativeTime(item.lastModifiedAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

