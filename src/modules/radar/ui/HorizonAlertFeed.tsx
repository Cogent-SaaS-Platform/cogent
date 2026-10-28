'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Plus,
  Star,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  ChevronDown,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { RadarCircularPresentationCard } from '../types';
import { RegulatorCode } from '@/shared/types';

interface HorizonAlertFeedProps {
  circulars: RadarCircularPresentationCard[];
  selectedId: string | null;
  onSelectCircular: (id: string) => void;
  isLoading: boolean;
  isSyncing: boolean;
  onTriggerSync: () => void;
  onOpenIngest: () => void;
  onToggleRelevant?: (id: string, e: React.MouseEvent) => void;
  onToggleStar?: (id: string, e: React.MouseEvent) => void;
  lastUpdatedText?: string;
}

export function HorizonAlertFeed({
  circulars,
  selectedId,
  onSelectCircular,
  isLoading,
  isSyncing,
  onTriggerSync,
  onOpenIngest,
  onToggleRelevant,
  onToggleStar,
  lastUpdatedText = 'Today, 10:45 AM',
}: HorizonAlertFeedProps) {
  // Feed Tab Filter: 'pending' | 'all' | 'starred'
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'starred'>('pending');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('all');
  const [relevantOnly, setRelevantOnly] = useState<boolean>(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');

  // Multi-selection state
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Starred IDs set (local state overlaid on cards)
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  const handleStarClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (onToggleStar) onToggleStar(id, e);
  };

  // Filter pipeline
  const filteredCirculars = useMemo(() => {
    return circulars.filter((c) => {
      // Tab filter
      if (activeTab === 'pending') {
        const status = c.workflowStatus || 'Pending Review';
        if (status !== 'Pending Review') return false;
      } else if (activeTab === 'starred') {
        const isStarred = starredIds.has(c.id) || Boolean(c.isStarred);
        if (!isStarred) return false;
      }

      // Relevant only filter
      if (relevantOnly && !c.applicability.isApplicable) {
        return false;
      }

      // Source filter
      if (selectedSource !== 'ALL' && c.regulator !== selectedSource) {
        return false;
      }

      // Assignee filter
      if (selectedAssignee !== 'ALL') {
        if (selectedAssignee === 'UN' && c.assignee) return false;
        if (selectedAssignee === 'CCO' && c.assignee?.avatar !== 'CCO' && !c.assignee?.name?.toLowerCase().includes('compliance')) return false;
        if (selectedAssignee === 'AM' && c.assignee?.avatar !== 'AM' && !c.assignee?.name?.toLowerCase().includes('alex')) return false;
      }

      // Time range filter
      if (selectedTimeRange !== 'all') {
        const pubTime = new Date(c.publicationDate).getTime();
        if (!isNaN(pubTime)) {
          const daysDiff = (Date.now() - pubTime) / (1000 * 60 * 60 * 24);
          if (selectedTimeRange === '3d' && daysDiff > 3) return false;
          if (selectedTimeRange === '7d' && daysDiff > 7) return false;
          if (selectedTimeRange === '30d' && daysDiff > 30) return false;
        }
      }

      // Urgency filter
      if (filterUrgency !== 'ALL') {
        if (filterUrgency === 'CRITICAL' && c.priority !== 'CRITICAL_EMERGENCY') return false;
        if (filterUrgency === 'HIGH' && c.priority !== 'HIGH') return false;
        if (filterUrgency === 'STANDARD' && c.priority !== 'MEDIUM' && c.priority !== 'LOW') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.subject.toLowerCase().includes(q);
        const matchNumber = c.circularNumber.toLowerCase().includes(q);
        const matchRegulator = c.regulator.toLowerCase().includes(q);
        const matchSummary = (c.summary || '').toLowerCase().includes(q);
        if (!matchTitle && !matchNumber && !matchRegulator && !matchSummary) {
          return false;
        }
      }

      return true;
    });
  }, [circulars, activeTab, starredIds, relevantOnly, selectedSource, filterUrgency, searchQuery]);

  // Pagination calculations
  const totalItems = filteredCirculars.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedCirculars = filteredCirculars.slice(startIndex, endIndex);

  // Selection toggle
  const handleSelectAll = () => {
    if (selectedRowIds.size === paginatedCirculars.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(paginatedCirculars.map((c) => c.id)));
    }
  };

  const handleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pendingCount = useMemo(() => {
    return circulars.filter((c) => (c.workflowStatus || 'Pending Review') === 'Pending Review').length;
  }, [circulars]);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
      {/* ──────────────────────────────────────────────────────────────────────────
          1. TOP BAR: TABS & CONTROLS
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-200 px-4 py-2.5 gap-3 bg-white">
        {/* Left: View Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setActiveTab('pending');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>Pending Review</span>
            {pendingCount > 0 && (
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'all'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            All
          </button>

          <button
            onClick={() => {
              setActiveTab('starred');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
              activeTab === 'starred'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Starred</span>
          </button>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Relevant Only Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none px-2 py-1 text-xs text-slate-700 hover:text-slate-900">
            <input
              type="checkbox"
              checked={relevantOnly}
              onChange={(e) => {
                setRelevantOnly(e.target.checked);
                setCurrentPage(1);
              }}
              className="sr-only"
            />
            <div
              className={`w-7 h-4 rounded-full transition-colors relative flex items-center ${
                relevantOnly ? 'bg-slate-900' : 'bg-slate-200'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full bg-white transition-transform transform ${
                  relevantOnly ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </div>
            <span className="font-medium text-xs">Relevant Only</span>
          </label>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Source Dropdown */}
          <div className="relative">
            <select
              value={selectedSource}
              onChange={(e) => {
                setSelectedSource(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 pl-2.5 pr-6 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:border-slate-300 focus:outline-hidden appearance-none cursor-pointer"
            >
              <option value="ALL">All Sources</option>
              <option value="CBN">CBN</option>
              <option value="NFIU">NFIU</option>
              <option value="SEC">SEC</option>
              <option value="NDPC">NDPC</option>
              <option value="FCCPC">FCCPC</option>
              <option value="ARCON">ARCON</option>
              <option value="NDIC">NDIC</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Assignee Dropdown */}
          <div className="relative">
            <select
              value={selectedAssignee}
              onChange={(e) => {
                setSelectedAssignee(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 pl-2.5 pr-6 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:border-slate-300 focus:outline-hidden appearance-none cursor-pointer"
            >
              <option value="ALL">All Assignees</option>
              <option value="CCO">Chief Compliance Officer</option>
              <option value="AM">Alex Marco</option>
              <option value="UN">Unassigned</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Time Range Dropdown */}
          <div className="relative">
            <select
              value={selectedTimeRange}
              onChange={(e) => {
                setSelectedTimeRange(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 pl-2.5 pr-6 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:border-slate-300 focus:outline-hidden appearance-none cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="3d">Last 3 Days</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Extended Filters Popover Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`h-8 px-2 rounded-md border flex items-center justify-center transition-colors ${
                showFilterDropdown || filterUrgency !== 'ALL'
                  ? 'border-slate-400 bg-slate-50 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
              title="Extended Filters"
            >
              <Filter className="w-3.5 h-3.5" />
            </button>

            {showFilterDropdown && (
              <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-lg border border-slate-200 shadow-lg p-2.5 z-40 space-y-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Filter by Urgency
                </div>
                <div className="space-y-1">
                  {[
                    { id: 'ALL', label: 'All Urgencies' },
                    { id: 'CRITICAL', label: 'Critical Emergency' },
                    { id: 'HIGH', label: 'High Priority' },
                    { id: 'STANDARD', label: 'Standard' },
                  ].map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setFilterUrgency(u.id);
                        setShowFilterDropdown(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${
                        filterUrgency === u.id ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{u.label}</span>
                      {filterUrgency === u.id && <Check className="w-3 h-3 text-slate-900" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search..."
              className="h-8 pl-8 pr-2 text-xs bg-white border border-slate-200 rounded-md w-36 sm:w-44 focus:w-56 focus:outline-hidden focus:border-slate-400 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Ingest Circular CTA */}
          <button
            onClick={onOpenIngest}
            className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ingest Circular</span>
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. SUB-BAR: LAST UPDATED & PAGINATION
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50/60 border-b border-slate-200 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>Last Updated {lastUpdatedText}</span>
          <button
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors disabled:opacity-50"
            title="Silently synchronise latest regulatory publications"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-slate-900' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-600">
            {totalItems === 0 ? '0 of 0' : `${startIndex + 1}-${endIndex} of ${totalItems}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="p-1 rounded text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="p-1 rounded text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. FEED TABLE
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-2.5 px-3 w-8">
                <input
                  type="checkbox"
                  checked={paginatedCirculars.length > 0 && selectedRowIds.size === paginatedCirculars.length}
                  onChange={handleSelectAll}
                  className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                />
              </th>
              <th className="py-2.5 px-3">Title</th>
              <th className="py-2.5 px-3 w-32">Doc Type</th>
              <th className="py-2.5 px-3 w-32">Alert Type</th>
              <th className="py-2.5 px-3 w-24">Relevant</th>
              <th className="py-2.5 px-3 w-28">Assign</th>
              <th className="py-2.5 px-2 w-10 text-center">
                <Star className="w-3.5 h-3.5 text-slate-400 mx-auto" />
              </th>
              <th className="py-2.5 px-2 w-10 text-center">···</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {isLoading ? (
              // Shimmer Loading Skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`shimmer-${i}`} className="animate-pulse">
                  <td className="py-3 px-3">
                    <div className="w-4 h-4 bg-slate-200 rounded" />
                  </td>
                  <td className="py-3 px-3">
                    <div className="h-3.5 bg-slate-200 rounded w-3/4 mb-1.5" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                  </td>
                  <td className="py-3 px-3">
                    <div className="h-3 bg-slate-200 rounded w-20" />
                  </td>
                  <td className="py-3 px-3">
                    <div className="h-4 bg-slate-200 rounded w-16" />
                  </td>
                  <td className="py-3 px-3">
                    <div className="w-7 h-4 bg-slate-200 rounded-full" />
                  </td>
                  <td className="py-3 px-3">
                    <div className="h-5 bg-slate-100 rounded w-14" />
                  </td>
                  <td className="py-3 px-2">
                    <div className="w-3.5 h-3.5 bg-slate-200 rounded mx-auto" />
                  </td>
                  <td className="py-3 px-2">
                    <div className="w-3.5 h-3.5 bg-slate-200 rounded mx-auto" />
                  </td>
                </tr>
              ))
            ) : paginatedCirculars.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <p className="text-xs font-medium">No regulatory alerts match the active filters.</p>
                  <button
                    onClick={() => {
                      setActiveTab('all');
                      setSearchQuery('');
                      setSelectedSource('ALL');
                      setFilterUrgency('ALL');
                      setRelevantOnly(false);
                    }}
                    className="mt-2 text-xs font-semibold text-slate-900 underline hover:text-slate-700"
                  >
                    Reset all filters
                  </button>
                </td>
              </tr>
            ) : (
              paginatedCirculars.map((c) => {
                const isSelected = selectedId === c.id;
                const isRowChecked = selectedRowIds.has(c.id);
                const isStarred = starredIds.has(c.id) || Boolean(c.isStarred);
                const isActionable = c.alertType === 'Actionable' || c.priority === 'CRITICAL_EMERGENCY' || c.priority === 'HIGH';

                return (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCircular(c.id)}
                    className={`cursor-pointer transition-colors group ${
                      isSelected
                        ? 'bg-slate-50/90'
                        : isRowChecked
                        ? 'bg-slate-50/50'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-3" onClick={(e) => handleSelectRow(c.id, e)}>
                      <input
                        type="checkbox"
                        checked={isRowChecked}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Title & Metadata Subtitle */}
                    <td className="py-3 px-3 min-w-[300px]">
                      <div className="font-medium text-slate-900 group-hover:text-slate-950 transition-colors line-clamp-1">
                        {c.subject}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{c.publicationDate}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">{c.regulator}</span>
                        <span>•</span>
                        <span>
                          {c.priority === 'CRITICAL_EMERGENCY'
                            ? 'Critical Severity'
                            : c.priority === 'HIGH'
                            ? 'High Severity'
                            : 'Standard Severity'}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-0.5 text-slate-600">
                          <TrendingUp className="w-2.5 h-2.5" />
                          <span>Trending Up</span>
                        </span>
                      </div>
                    </td>

                    {/* Doc Type */}
                    <td className="py-3 px-3 text-slate-600 font-mono text-xs">
                      {c.docType || 'Circular'}
                    </td>

                    {/* Alert Type (Actionable / Informative) */}
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isActionable ? 'bg-amber-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{isActionable ? 'Actionable' : 'Informative'}</span>
                      </span>
                    </td>

                    {/* Relevant Toggle */}
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <label className="flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={c.applicability.isApplicable}
                          onChange={(e) => {
                            if (onToggleRelevant) onToggleRelevant(c.id, e as unknown as React.MouseEvent);
                          }}
                          className="sr-only"
                        />
                        <div
                          className={`w-7 h-4 rounded-full transition-colors relative flex items-center ${
                            c.applicability.isApplicable ? 'bg-slate-900' : 'bg-slate-200'
                          }`}
                        >
                          <div
                            className={`w-3 h-3 rounded-full bg-white transition-transform transform ${
                              c.applicability.isApplicable ? 'translate-x-3.5' : 'translate-x-0.5'
                            }`}
                          />
                        </div>
                      </label>
                    </td>

                    {/* Assign */}
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      {c.assignee ? (
                        <div className="inline-flex items-center gap-1.5 text-slate-700 text-xs">
                          <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-mono text-[9px] font-bold text-slate-700">
                            {c.assignee.avatar || c.assignee.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="truncate max-w-[80px]">{c.assignee.name}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {}}
                          className="text-[11px] font-medium text-slate-500 hover:text-slate-800 border border-dashed border-slate-300 hover:border-slate-400 rounded px-2 py-0.5 transition-colors"
                        >
                          + Assign
                        </button>
                      )}
                    </td>

                    {/* Star */}
                    <td className="py-3 px-2 text-center" onClick={(e) => handleStarClick(c.id, e)}>
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-slate-100 transition-colors inline-flex items-center justify-center"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isStarred
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-slate-300 hover:text-slate-500'
                          }`}
                        />
                      </button>
                    </td>

                    {/* Context menu */}
                    <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
