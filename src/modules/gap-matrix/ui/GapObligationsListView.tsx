'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Filter,
  Star,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Check,
} from 'lucide-react';
import { ComplianceStatus } from '@/shared/types';

export interface GapObligationItemViewModel {
  id: string;
  evaluationId: string;
  regulatoryClauseReference: string;
  statutoryLegalCitation: string;
  complianceStatus: ComplianceStatus;
  statutoryPenaltyNaira: number;
  whatHappened: string;
  whatToKnow: string;
  whatHasChanged: string;
  whatToDo: string;
  draftReplacementLanguage?: string;
  derivedInsight?: string;
  responsibleRole?: string;
  statutoryRemediationTimelineDays?: number;
  matchedPolicySection?: string | null;
  matchedPolicyText?: string | null;
  isStarred?: boolean;
}

interface GapObligationsListViewProps {
  analysisName: string;
  items: GapObligationItemViewModel[];
  initialStatusFilter?: 'ALL' | 'ADEQUATELY_MET' | 'PARTIALLY_MET' | 'CRITICAL_GAP';
  onBack: () => void;
  onNavigateToAnalysisList?: () => void;
  onSelectObligation: (obligationId: string) => void;
  onToggleStar?: (obligationId: string) => void;
}

export function GapObligationsListView({
  analysisName,
  items,
  initialStatusFilter = 'ALL',
  onBack,
  onNavigateToAnalysisList,
  onSelectObligation,
  onToggleStar,
}: GapObligationsListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ADEQUATELY_MET' | 'PARTIALLY_MET' | 'CRITICAL_GAP'>(
    initialStatusFilter
  );
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Synchronize when initialStatusFilter prop changes (e.g. clicking Adequate, Partial, Gap tabs)
  React.useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
      setCurrentPage(1);
    }
  }, [initialStatusFilter]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus =
        statusFilter === 'ALL' || item.complianceStatus === statusFilter;

      const matchesReview =
        reviewStatusFilter === 'ALL' ||
        (reviewStatusFilter === 'COMPLETED'
          ? item.complianceStatus === 'ADEQUATELY_MET'
          : item.complianceStatus !== 'ADEQUATELY_MET');

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.regulatoryClauseReference.toLowerCase().includes(q) ||
        item.whatHappened.toLowerCase().includes(q) ||
        item.statutoryLegalCitation.toLowerCase().includes(q) ||
        (item.responsibleRole && item.responsibleRole.toLowerCase().includes(q));

      const matchesRole =
        selectedRole === 'ALL' || item.responsibleRole === selectedRole;

      return matchesStatus && matchesReview && matchesSearch && matchesRole;
    });
  }, [items, statusFilter, reviewStatusFilter, searchQuery, selectedRole]);

  // Pagination
  const totalCount = filteredItems.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage]);

  const handleToggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (onToggleStar) onToggleStar(id);
  };

  const handleSelectAll = () => {
    if (selectedRowIds.size === paginatedItems.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(paginatedItems.map((p) => p.id)));
    }
  };

  const handleToggleRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allRoles = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      if (it.responsibleRole) set.add(it.responsibleRole);
    }
    return Array.from(set);
  }, [items]);

  return (
    <div className="space-y-6">
      {/* 1. Breadcrumbs */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Back to Gap Analysis Detail"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <button
              type="button"
              onClick={onNavigateToAnalysisList || onBack}
              className="hover:text-slate-900 hover:underline transition-colors"
            >
              Gap Analysis
            </button>
            <span>&gt;</span>
            <button
              type="button"
              onClick={onBack}
              className="hover:text-slate-900 hover:underline transition-colors truncate max-w-xs"
            >
              {analysisName}
            </button>
            <span>&gt;</span>
            <span className="font-semibold text-slate-900">Obligations List</span>
          </div>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search obligations..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs text-slate-900 placeholder-slate-400 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-slate-900 transition-all"
          />
        </div>
      </div>

      {/* 2. Toolbar & Filter Row (Zango temp (14).png) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={
              paginatedItems.length > 0 &&
              selectedRowIds.size === paginatedItems.length
            }
            onChange={handleSelectAll}
            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
          />

          <span className="text-xs font-mono text-slate-500">
            {paginatedItems.length > 0
              ? `${(currentPage - 1) * pageSize + 1}-${Math.min(
                  currentPage * pageSize,
                  totalCount
                )} of ${totalCount}`
              : `0 of 0`}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2">
          {/* Review Status Filter */}
          <div className="relative">
            <select
              value={reviewStatusFilter}
              onChange={(e) => {
                setReviewStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg outline-none cursor-pointer border transition-colors ${
                reviewStatusFilter !== 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <option value="ALL">Review Status</option>
              <option value="PENDING">Review Pending</option>
              <option value="COMPLETED">Closed / Clean</option>
            </select>
          </div>

          {/* Gap Status Filter (Zango temp (14).png) */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg outline-none cursor-pointer border transition-colors ${
                statusFilter !== 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <option value="ALL">Gap Status</option>
              <option value="CRITICAL_GAP">Gap Status (Critical Gap)</option>
              <option value="PARTIALLY_MET">Gap Status (Partial)</option>
              <option value="ADEQUATELY_MET">Gap Status (Adequate)</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="relative">
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg outline-none cursor-pointer border transition-colors ${
                selectedRole !== 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <option value="ALL">Assignee</option>
              {allRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Obligations List Items (Zango temp (14).png) */}
      {paginatedItems.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-xs text-slate-500">
            No obligations matched your filter settings.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedItems.map((item) => {
            const isStarred = starredIds.has(item.id) || Boolean(item.isStarred);
            const isSelected = selectedRowIds.has(item.id);

            const isAdequate = item.complianceStatus === 'ADEQUATELY_MET';
            const isPartial = item.complianceStatus === 'PARTIALLY_MET';
            const isCritical = item.complianceStatus === 'CRITICAL_GAP';

            return (
              <div
                key={item.id}
                onClick={() => onSelectObligation(item.id)}
                className={`group bg-white border rounded-xl p-4.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
                  isSelected ? 'border-slate-400 bg-slate-50/40' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onClick={(e) => handleToggleRow(item.id, e)}
                    onChange={() => {}}
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                  />

                  <div className="min-w-0 flex-1 space-y-1.5">
                    {/* Title */}
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-slate-950 transition-colors">
                        {item.regulatoryClauseReference}
                      </h4>

                      {/* Right Status Dot & Assignee */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* 6px Status Dot per AGENTS.md */}
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAdequate
                                ? 'bg-emerald-500'
                                : isPartial
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          <span className="font-medium">
                            {isAdequate
                              ? 'Adequate'
                              : isPartial
                              ? 'Partial'
                              : 'Critical Gap'}
                          </span>
                        </span>

                        {/* Fine Exposure */}
                        {item.statutoryPenaltyNaira > 0 && (
                          <span className="font-mono text-xs font-bold text-slate-900">
                            ₦{(item.statutoryPenaltyNaira / 1_000_000).toFixed(0)}M
                          </span>
                        )}

                        {/* Assignee Avatar */}
                        <div
                          className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600"
                          title={item.responsibleRole || 'Chief Compliance Officer'}
                        >
                          {item.responsibleRole
                            ?.split(' ')
                            .map((w) => w[0])
                            .join('')
                            .slice(0, 2) || 'CC'}
                        </div>

                        {/* Star Toggle */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleStar(item.id, e)}
                          className="p-1 text-slate-300 hover:text-amber-500 transition-colors"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              isStarred
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Summary text */}
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {item.whatHappened}
                    </p>

                    {/* Citations & Codes (Plain monospace per AGENTS.md) */}
                    <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-slate-500">
                      <span>{item.id}</span>
                      <span>•</span>
                      <span>Prescriptive</span>
                      <span>•</span>
                      <span>{item.statutoryLegalCitation}</span>
                      {item.matchedPolicySection && (
                        <>
                          <span>•</span>
                          <span className="text-slate-700 font-semibold">
                            Matched: {item.matchedPolicySection}
                          </span>
                        </>
                      )}
                    </div>
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
