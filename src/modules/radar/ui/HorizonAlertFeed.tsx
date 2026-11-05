'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  ShieldCheck,
  Copy,
  X,
} from 'lucide-react';
import { RadarCircularPresentationCard } from '../types';
import { RegulatorCode } from '@/shared/types';
import { TeamMember, FunctionalRole } from '@/modules/organization/types';

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
  onUpdateCircular?: (updated: Partial<RadarCircularPresentationCard> & { id: string }) => void;
  lastUpdatedText?: string;
  initialSearchQuery?: string;
}

const ALL_REGULATORS: Array<{ code: string; label: string }> = [
  { code: 'CBN', label: 'Central Bank of Nigeria (CBN)' },
  { code: 'NDPC', label: 'Nigeria Data Protection Commission (NDPC)' },
  { code: 'FCCPC', label: 'Federal Competition & Consumer Protection (FCCPC)' },
  { code: 'SEC', label: 'Securities & Exchange Commission (SEC)' },
  { code: 'ARCON', label: 'Advertising Regulatory Council (ARCON)' },
  { code: 'NFIU', label: 'Nigerian Financial Intelligence Unit (NFIU)' },
  { code: 'NDIC', label: 'Nigeria Deposit Insurance Corporation (NDIC)' },
];

const ALL_DOC_TYPES = [
  'Circular / Directive',
  'Regulations & Guidelines',
  'Exposure Draft',
  'Enforcement & Sanctions',
  'Reports & Research',
  'News & Events',
];

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
  onUpdateCircular,
  lastUpdatedText = 'Just now',
  initialSearchQuery = '',
}: HorizonAlertFeedProps) {
  // Feed Tab Filter: 'pending' | 'all' | 'starred'
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'starred'>('pending');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
  const [sourceSearchTerm, setSourceSearchTerm] = useState('');
  const sourceDropdownRef = useRef<HTMLDivElement>(null);

  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('all');
  const [relevantOnly, setRelevantOnly] = useState<boolean>(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  const [filterDocType, setFilterDocType] = useState<string>('ALL');
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');

  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Dynamic team members & functional roles for assignment filtering
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [functionalRoles, setFunctionalRoles] = useState<FunctionalRole[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function fetchOrgMembers() {
      try {
        const res = await fetch('/api/organization/members');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success) {
            setTeamMembers(data.members || []);
            setFunctionalRoles(data.functionalRoles || []);
          }
        }
      } catch (err) {
        console.error('Failed fetching team members for feed filter', err);
      }
    }
    fetchOrgMembers();
    return () => {
      isMounted = false;
    };
  }, []);

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

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(e.target as Node)) {
        setIsSourceDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Interactive Table Action States (Assign Popover & Context Menu)
  const [activeAssignRowId, setActiveAssignRowId] = useState<string | null>(null);
  const [activeMenuRowId, setActiveMenuRowId] = useState<string | null>(null);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);
  const [resynthesizingId, setResynthesizingId] = useState<string | null>(null);

  const handleSelectAssignee = async (
    circularId: string,
    selection: {
      type: 'USER' | 'ROLE' | 'UNASSIGNED';
      id?: string;
      name: string;
      initials?: string;
      department?: string;
    }
  ) => {
    const newAssignee =
      selection.type === 'UNASSIGNED'
        ? null
        : { id: selection.id || selection.name, name: selection.name, avatar: selection.initials };

    onUpdateCircular?.({ id: circularId, assignee: newAssignee });
    setActiveAssignRowId(null);

    try {
      await fetch(`/api/radar/circulars/${encodeURIComponent(circularId)}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedToUserId: selection.type === 'USER' ? selection.id : null,
          assignedRole: selection.type === 'ROLE' ? (selection.name || selection.id) : null,
          targetDepartment: selection.department || null,
        }),
      });
    } catch (err) {
      console.error('Failed to persist circular assignment', err);
    }
  };

  const handleAlertTypeChange = async (
    circularId: string,
    newAlertType: 'Actionable' | 'Informative',
    e: React.MouseEvent | React.ChangeEvent<HTMLSelectElement>
  ) => {
    e.stopPropagation();
    onUpdateCircular?.({ id: circularId, alertType: newAlertType });

    try {
      await fetch(`/api/radar/circulars/${encodeURIComponent(circularId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertType: newAlertType }),
      });
    } catch (err) {
      console.error('Failed to update alert type', err);
    }
  };

  const handleResynthesizeRow = async (circularId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuRowId(null);
    setResynthesizingId(circularId);

    try {
      const res = await fetch(`/api/radar/circulars/${encodeURIComponent(circularId)}/resynthesize`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.data) {
        const synth = data.data;
        onUpdateCircular?.({
          id: circularId,
          docType: synth.docType,
          alertType: synth.alertType,
          executiveSummary: synth.executiveSummary,
          keyPoints: synth.keyPoints,
          departments: synth.impactedDepartments,
          severityTier: synth.severityMatrix?.tier,
          severityScore: synth.severityMatrix?.score,
          severityMatrixCode: `${synth.severityMatrix?.tier || 'G1'} | ${synth.severityMatrix?.score || 18}%`,
          severityMatrix: synth.severityMatrix,
          topics: synth.topics,
          impactedAreas: synth.impactedAreas,
          importantDates: synth.importantDates,
        });
      }
    } catch (err) {
      console.error('Failed to re-synthesize alert', err);
    } finally {
      setResynthesizingId(null);
    }
  };

  const handleCopyCircularRef = (refCode: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(refCode);
      setCopiedRowId(id);
      setTimeout(() => {
        setCopiedRowId(null);
      }, 2000);
    } catch {
      // Ignore clipboard error
    }
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
      if (relevantOnly) {
        const isRel = c.isRelevant !== undefined ? c.isRelevant : c.applicability.isApplicable;
        if (!isRel) return false;
      }

      // Multi-Source filter
      if (selectedSources.length > 0) {
        if (!selectedSources.includes(c.regulator.toUpperCase())) {
          return false;
        }
      }

      // Dynamic Assignee filter
      if (selectedAssignee !== 'ALL') {
        if (selectedAssignee === 'UN' || selectedAssignee === 'UNASSIGNED') {
          if (c.assignee) return false;
        } else {
          const target = selectedAssignee.toLowerCase();
          const assigneeName = (c.assignee?.name || '').toLowerCase();
          const assigneeId = (c.assignee?.id || '').toLowerCase();
          const matches =
            assigneeId === target ||
            assigneeName === target ||
            assigneeName.includes(target) ||
            target.includes(assigneeName);
          if (!matches) return false;
        }
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

      // Doc Type filter
      if (filterDocType !== 'ALL') {
        if ((c.docType || '').toLowerCase() !== filterDocType.toLowerCase()) {
          return false;
        }
      }

      // Urgency filter
      if (filterUrgency !== 'ALL') {
        if (filterUrgency === 'CRITICAL' && c.priority !== 'CRITICAL_EMERGENCY') return false;
        if (filterUrgency === 'HIGH' && c.priority !== 'HIGH') return false;
        if (filterUrgency === 'STANDARD' && c.priority !== 'MEDIUM' && c.priority !== 'LOW') return false;
      }

      // Search & Topic Filter Pipeline (Guarantees zero empty screens on topic drill-down)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullAlertText = `${c.subject} ${c.circularNumber} ${c.regulator} ${c.summary || ''} ${c.executiveSummary || ''} ${(c.topics || []).join(' ')} ${(c.impactedAreas || []).join(' ')}`.toLowerCase();

        // 1. Direct match on title, circular number, regulator, summary, or topics
        const matchDirect = fullAlertText.includes(q);

        // 2. Domain taxonomy synonym expansion for trending topics
        let matchTopicTaxonomy = false;
        if (q.includes('aml') || q.includes('sanction') || q.includes('cft')) {
          matchTopicTaxonomy = ['aml', 'cft', 'kyc', 'sanction', 'fatf', 'nigsac', 'ofac', 'str', 'money laundering', 'beneficial ownership', 'dcb finance', 'pep', 'tier-3', 'watch-list'].some((kw) => fullAlertText.includes(kw));
        } else if (q.includes('consumer') || q.includes('apr') || q.includes('protection')) {
          matchTopicTaxonomy = ['consumer', 'apr', 'disclosure', 'fee', 'tariff', 'complaint', 'interest', 'fccpc', 'fair lending', 'dormant', 'unclaimed', 'charges', 'dud cheque', 'advertisement', 'airtime', 'failed', 'cash-related', 'cash disbursement', 'app fraud', 'push payment'].some((kw) => fullAlertText.includes(kw));
        } else if (q.includes('data') || q.includes('privacy') || q.includes('ndpa') || q.includes('cyber')) {
          matchTopicTaxonomy = ['data', 'privacy', 'ndpa', 'ndpc', 'personal data', 'consent', 'dpo', 'controller', 'cybersecurity', 'cloud', 'soc', 'threat intelligence', 'csat', 'data localisation'].some((kw) => fullAlertText.includes(kw));
        } else if (q.includes('payment') || q.includes('switching') || q.includes('rail') || q.includes('pos')) {
          matchTopicTaxonomy = ['contactless', 'interchange', 'payment', 'pos', 'pssp', 'switching', 'rail', 'efems', 'nfem', 'bswitch', 'settlement', 'cash', 'atms', 'dmb', 'geo-fencing', 'geo-tagging', 'bvn', 'instant payment', 'iso 20022', 'cheque', 'nicpas', 'tms', 'ptsas', 'agent banking', 'foreign cards'].some((kw) => fullAlertText.includes(kw));
        } else if (q.includes('lending') || q.includes('broker') || q.includes('vasp') || q.includes('crypto')) {
          matchTopicTaxonomy = ['lending', 'loan', 'nano', 'credit', 'sub-broker', 'digital asset', 'vasp', 'crypto', 'arip', 'custody', 'cross-border', 'algorithmic', 'robo-advisory', 'virtual asset', 'stma', 'movable assets'].some((kw) => fullAlertText.includes(kw));
        } else if (q.includes('governance') || q.includes('cama') || q.includes('corporate') || q.includes('prudential')) {
          matchTopicTaxonomy = ['governance', 'cama', 'director', 'board', 'capital adequacy', 'mpc', 'sdf', 'prudential', 'bullion', 'balance of payments', 'inspection agent', 'bofia', 'audit', 'holding companies', 'ring-fencing', 'union bank', 'successors', 'sustainability', 'ifrs', 't+1 settlement', 'nnmra', 'non-interest'].some((kw) => fullAlertText.includes(kw));
        }

        // 3. Token-level matching (match if at least one meaningful token >= 4 chars matches)
        const tokens = q.split(/[\s/&,-]+/).filter((t) => t.length >= 4);
        const matchTokens = tokens.length > 0 && tokens.some((tok) => fullAlertText.includes(tok));

        if (!matchDirect && !matchTopicTaxonomy && !matchTokens) {
          return false;
        }
      }

      return true;
    });
  }, [
    circulars,
    activeTab,
    starredIds,
    relevantOnly,
    selectedSources,
    selectedAssignee,
    selectedTimeRange,
    filterDocType,
    filterUrgency,
    searchQuery,
  ]);

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

  const toggleSourceSelection = (code: string) => {
    setSelectedSources((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      return [...prev, code];
    });
    setCurrentPage(1);
  };

  const filteredRegulatorsList = useMemo(() => {
    if (!sourceSearchTerm.trim()) return ALL_REGULATORS;
    const term = sourceSearchTerm.toLowerCase();
    return ALL_REGULATORS.filter(
      (r) => r.code.toLowerCase().includes(term) || r.label.toLowerCase().includes(term)
    );
  }, [sourceSearchTerm]);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
      {/* ──────────────────────────────────────────────────────────────────────────
          1. TOP BAR: TABS & CONTROLS (Ref Video 00:33 – 00:59)
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
          {/* Relevant Only Green Toggle Switch */}
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
                relevantOnly ? 'bg-emerald-600' : 'bg-slate-200'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full bg-white transition-transform transform shadow-xs ${
                  relevantOnly ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </div>
            <span className="font-medium text-xs">Relevant Only</span>
          </label>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Multi-Select Searchable Source Dropdown */}
          <div className="relative" ref={sourceDropdownRef}>
            <button
              type="button"
              onClick={() => setIsSourceDropdownOpen(!isSourceDropdownOpen)}
              className="h-8 pl-2.5 pr-7 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:border-slate-300 focus:outline-hidden flex items-center gap-1.5 transition-colors"
            >
              <span>
                {selectedSources.length === 0
                  ? 'All Sources'
                  : selectedSources.length === 1
                  ? selectedSources[0]
                  : `${selectedSources.length} Sources`}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
            </button>

            {isSourceDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-lg border border-slate-200 shadow-lg p-2 z-50 space-y-2">
                <div className="relative">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2 pointer-events-none" />
                  <input
                    type="text"
                    value={sourceSearchTerm}
                    onChange={(e) => setSourceSearchTerm(e.target.value)}
                    placeholder="Search regulators..."
                    className="w-full h-7 pl-7 pr-2 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:bg-white"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] px-1 text-slate-500 border-b border-slate-100 pb-1">
                  <span>Filter Regulators</span>
                  {selectedSources.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSources([]);
                        setCurrentPage(1);
                      }}
                      className="text-slate-700 hover:underline font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredRegulatorsList.map((r) => {
                    const isChecked = selectedSources.includes(r.code);
                    return (
                      <label
                        key={r.code}
                        className="flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-slate-50 cursor-pointer text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSourceSelection(r.code)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-0"
                        />
                        <span className="font-semibold text-slate-900">{r.code}</span>
                        <span className="text-[11px] text-slate-500 truncate">{r.label.split('(')[0]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Assignee Dropdown */}
          <div className="relative">
            <select
              value={selectedAssignee}
              onChange={(e) => {
                setSelectedAssignee(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 pl-2.5 pr-6 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:border-slate-300 focus:outline-hidden appearance-none cursor-pointer max-w-[180px] truncate"
            >
              <option value="ALL">All Assignees</option>
              <option value="UNASSIGNED">Unassigned</option>
              {teamMembers.length > 0 && (
                <optgroup label="Organization Members">
                  {teamMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.fullName} ({m.initials})
                    </option>
                  ))}
                </optgroup>
              )}
              {functionalRoles.length > 0 && (
                <optgroup label="Statutory Roles">
                  {functionalRoles.map((r) => (
                    <option key={r.roleId} value={r.roleTitle}>
                      {r.roleTitle}
                    </option>
                  ))}
                </optgroup>
              )}
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
              className={`h-8 px-2.5 rounded-md border flex items-center gap-1.5 transition-colors text-xs font-medium ${
                showFilterDropdown || filterUrgency !== 'ALL' || filterDocType !== 'ALL'
                  ? 'border-slate-400 bg-slate-50 text-slate-900 font-semibold'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
              title="Extended Filters"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>

            {showFilterDropdown && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-lg border border-slate-200 shadow-lg p-3 z-40 space-y-3">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Document Taxonomy
                  </div>
                  <select
                    value={filterDocType}
                    onChange={(e) => {
                      setFilterDocType(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-7 px-2 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-hidden"
                  >
                    <option value="ALL">All Doc Types</option>
                    {ALL_DOC_TYPES.map((dt) => (
                      <option key={dt} value={dt}>
                        {dt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Urgency Tier
                  </div>
                  <div className="space-y-1">
                    {[
                      { id: 'ALL', label: 'All Urgencies' },
                      { id: 'CRITICAL', label: 'Critical Emergency (G3)' },
                      { id: 'HIGH', label: 'High Priority (G2)' },
                      { id: 'STANDARD', label: 'Standard / Routine (G1)' },
                    ].map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setFilterUrgency(u.id);
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

                <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterDocType('ALL');
                      setFilterUrgency('ALL');
                      setCurrentPage(1);
                    }}
                    className="text-slate-500 hover:text-slate-900 underline text-[11px]"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFilterDropdown(false)}
                    className="px-2 py-1 bg-slate-900 text-white rounded text-[11px] font-semibold"
                  >
                    Done
                  </button>
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
          3. FEED TABLE (Ref Video 00:33 – 00:59)
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
              <th className="py-2.5 px-3 w-36">Doc Type</th>
              <th className="py-2.5 px-3 w-36">Alert Type</th>
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
                      setSelectedSources([]);
                      setFilterUrgency('ALL');
                      setFilterDocType('ALL');
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
                const isActionable = c.alertType ? c.alertType === 'Actionable' : (c.priority === 'CRITICAL_EMERGENCY' || c.priority === 'HIGH' || Boolean(c.statutoryDeadline));
                const isRelevant = c.isRelevant !== false;
                const isResynthesizing = resynthesizingId === c.id;

                const formattedDate = (() => {
                  if (!c.publicationDate) return '—';
                  try {
                    const parsed = new Date(c.publicationDate);
                    if (isNaN(parsed.getTime())) return c.publicationDate;
                    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                  } catch {
                    return c.publicationDate;
                  }
                })();

                const severityDisplay = c.severityMatrixCode || (c.severityTier ? `${c.severityTier} | ${c.severityScore || 18}%` : (c.priority === 'CRITICAL_EMERGENCY' ? 'G3 | 88%' : c.priority === 'HIGH' ? 'G2 | 62%' : 'G1 | 18%'));

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
                        <span>{formattedDate}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">{c.regulator}</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px] font-medium">
                          {severityDisplay}
                        </span>
                      </div>
                    </td>

                    {/* Doc Type (Plain Clean Text) */}
                    <td className="py-3 px-3 text-slate-600 font-normal text-xs whitespace-nowrap">
                      {c.docType || 'Circular / Directive'}
                    </td>

                    {/* Alert Type (Compact Pill Dropdown: Actionable vs Informative) */}
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-flex items-center">
                        <select
                          value={isActionable ? 'Actionable' : 'Informative'}
                          onChange={(e) =>
                            handleAlertTypeChange(c.id, e.target.value as 'Actionable' | 'Informative', e)
                          }
                          className="h-6 pl-5 pr-5 font-mono text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded appearance-none cursor-pointer hover:border-slate-300 focus:outline-hidden"
                        >
                          <option value="Actionable">Actionable</option>
                          <option value="Informative">Informative</option>
                        </select>
                        <span
                          className={`w-1.5 h-1.5 rounded-full absolute left-2 pointer-events-none ${
                            isActionable ? 'bg-emerald-500' : 'bg-blue-500'
                          }`}
                        />
                        <ChevronDown className="w-2.5 h-2.5 text-slate-400 absolute right-1.5 pointer-events-none" />
                      </div>
                    </td>

                    {/* Relevant Green Toggle Switch */}
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <label className="flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isRelevant}
                          onChange={(e) => {
                            if (onToggleRelevant) onToggleRelevant(c.id, e as unknown as React.MouseEvent);
                          }}
                          className="sr-only"
                        />
                        <div
                          className={`w-7 h-4 rounded-full transition-colors relative flex items-center ${
                            isRelevant ? 'bg-emerald-600' : 'bg-slate-200'
                          }`}
                        >
                          <div
                            className={`w-3 h-3 rounded-full bg-white transition-transform transform shadow-xs ${
                              isRelevant ? 'translate-x-3.5' : 'translate-x-0.5'
                            }`}
                          />
                        </div>
                      </label>
                    </td>

                    {/* Assign Column */}
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        {c.assignee ? (
                          <button
                            type="button"
                            onClick={() => setActiveAssignRowId(activeAssignRowId === c.id ? null : c.id)}
                            className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-700 font-medium"
                          >
                            <span className="w-4 h-4 rounded-full bg-slate-900 text-white font-mono text-[9px] flex items-center justify-center font-bold">
                              {c.assignee.avatar || c.assignee.name.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="truncate max-w-[70px]">{c.assignee.name}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveAssignRowId(activeAssignRowId === c.id ? null : c.id)}
                            className="inline-flex items-center gap-1 py-0.5 px-2 rounded border border-dashed border-slate-300 hover:border-slate-400 text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Assign</span>
                          </button>
                        )}

                        {activeAssignRowId === c.id && (
                          <div className="absolute left-0 mt-1 w-52 bg-white rounded-lg border border-slate-200 shadow-lg p-2 z-50 space-y-2">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
                              Assign Alert
                            </div>
                            <div className="max-h-44 overflow-y-auto space-y-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleSelectAssignee(c.id, { type: 'UNASSIGNED', name: 'Unassigned' })
                                }
                                className="w-full text-left px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 rounded"
                              >
                                None (Unassign)
                              </button>
                              {teamMembers.map((m) => (
                                <button
                                  key={m.userId}
                                  type="button"
                                  onClick={() =>
                                    handleSelectAssignee(c.id, {
                                      type: 'USER',
                                      id: m.userId,
                                      name: m.fullName,
                                      initials: m.initials,
                                    })
                                  }
                                  className="w-full text-left px-2 py-1 text-xs text-slate-800 hover:bg-slate-50 rounded flex items-center gap-1.5"
                                >
                                  <span className="w-4 h-4 rounded-full bg-slate-200 font-mono text-[8px] flex items-center justify-center font-bold">
                                    {m.initials}
                                  </span>
                                  <span className="truncate">{m.fullName}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Star Icon */}
                    <td className="py-3 px-2 text-center" onClick={(e) => handleStarClick(c.id, e)}>
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-slate-100 transition-colors"
                        title={isStarred ? 'Starred alert' : 'Star alert'}
                      >
                        <Star
                          className={`w-3.5 h-3.5 mx-auto ${
                            isStarred ? 'text-amber-500 fill-amber-500' : 'text-slate-400 hover:text-slate-600'
                          }`}
                        />
                      </button>
                    </td>

                    {/* Context Menu Three-dot */}
                    <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setActiveMenuRowId(activeMenuRowId === c.id ? null : c.id)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5 mx-auto" />
                        </button>

                        {activeMenuRowId === c.id && (
                          <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg border border-slate-200 shadow-lg p-1.5 z-50 text-xs space-y-0.5">
                            <button
                              type="button"
                              onClick={(e) => handleCopyCircularRef(c.circularNumber, c.id, e)}
                              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                            >
                              <Copy className="w-3 h-3 text-slate-400" />
                              <span>{copiedRowId === c.id ? 'Copied Reference' : 'Copy Reference'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleResynthesizeRow(c.id, e)}
                              disabled={isResynthesizing}
                              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-50 flex items-center gap-2 text-slate-700 disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3 h-3 text-slate-400 ${isResynthesizing ? 'animate-spin' : ''}`} />
                              <span>{isResynthesizing ? 'Re-synthesizing...' : 'Re-synthesize'}</span>
                            </button>

                            {c.sourceFileUrl && (
                              <a
                                href={c.sourceFileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                              >
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                                <span>Official Source</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
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
