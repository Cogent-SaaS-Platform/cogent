'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Search,
  Filter,
  Star,
  FileText,
  ShieldCheck,
  AlertCircle,
  Layers,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  X,
  MoreVertical,
  CheckCircle2,
  BookOpen,
  Scale,
  Building2,
  Loader2,
  Save,
  CheckSquare,
  Square,
  Download,
} from 'lucide-react';
import {
  RegulatoryInstrumentPresentation,
  StatutorySection,
  RegulatoryObligationPresentation,
  ObligationRuleType,
  PolicyApplicabilityType,
  ObligationReviewStatus,
  AssessmentCriterionItem,
} from '../types';
import { sanitizeSectionHeading } from '../utils/statutoryUtils';
import { UpgradePlanModal } from '@/shared/ui/UpgradePlanModal';
import { PlanTier } from '@/lib/plans';

interface ObligationsRegisterViewProps {
  instrument?: RegulatoryInstrumentPresentation | null;
  sections?: StatutorySection[];
  isLoading?: boolean;
  onBack?: () => void;
  onToggleStar?: (obligationId: string) => void;
  circularId?: string;
}

export function ObligationsRegisterView({
  instrument,
  sections: initialSections = [],
  isLoading: initialLoading = false,
  onBack,
  onToggleStar,
  circularId,
}: ObligationsRegisterViewProps) {
  // 1. Data State
  const [sections, setSections] = useState<StatutorySection[]>(initialSections);
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('ALL');

  // 2. Active Obligation (Split-Screen Inspector: null = View 1 full table, non-null = View 2 50/50 split)
  const [activeObligation, setActiveObligation] = useState<RegulatoryObligationPresentation | null>(null);

  // 3. Edit Mode in Left Inspector
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    title: string;
    description: string;
    ruleType: ObligationRuleType;
    policyApplicability: PolicyApplicabilityType;
    status: ObligationReviewStatus;
    clauseId: string;
    criteria: AssessmentCriterionItem[];
  }>({
    title: '',
    description: '',
    ruleType: 'Prescriptive',
    policyApplicability: 'Policy Applicable',
    status: 'Pending Review',
    clauseId: '',
    criteria: [],
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // 4. Modals
  const [isAddObligationModalOpen, setIsAddObligationModalOpen] = useState(false);
  const [isChangeSectionModalOpen, setIsChangeSectionModalOpen] = useState(false);
  const [newObligationData, setNewObligationData] = useState({
    title: '',
    description: '',
    ruleType: 'Prescriptive' as ObligationRuleType,
    policyApplicability: 'Policy Applicable' as PolicyApplicabilityType,
    clauseId: '',
  });

  // 5. Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [ruleTypeFilter, setRuleTypeFilter] = useState<string>('ALL');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL');

  // 6. Accordions in Left Inspector
  const [isCriteriaOpen, setIsCriteriaOpen] = useState(true);
  const [isRiskOpen, setIsRiskOpen] = useState(false);

  // 7. Checked criteria tracking for audit defense
  const [checkedCriteriaIds, setCheckedCriteriaIds] = useState<Set<string>>(new Set());

  // 8. Ref for scrolling right viewer to highlighted quote
  const quoteRef = useRef<HTMLDivElement | null>(null);

  // 9. Subscription Entitlement & Upgrade Modal State
  const [subscriptionPlan, setSubscriptionPlan] = useState<{
    tier: string;
    canEditObligationCriteria: boolean;
  } | null>(null);

  const [upgradeModalState, setUpgradeModalState] = useState<{
    isOpen: boolean;
    featureName?: string;
    requiredPlan?: PlanTier;
    reason?: string;
    isReadOnly?: boolean;
  }>({ isOpen: false });

  useEffect(() => {
    fetch('/api/billing/subscription')
      .then((res) => res.json())
      .then((data) => {
        if (data?.planConfig) {
          setSubscriptionPlan({
            tier: data.tier || 'TRIAL',
            canEditObligationCriteria: !!data.planConfig.canEditObligationCriteria,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Fetch obligations if instrument provided and initial sections empty
  useEffect(() => {
    if (initialSections && initialSections.length > 0) {
      setSections(initialSections);
      return;
    }

    if (instrument?.id) {
      setIsLoading(true);
      fetch(`/api/library/${encodeURIComponent(instrument.id)}/obligations`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.sections) {
            setSections(data.sections);
          }
        })
        .catch((err) => console.error('Failed to load obligations:', err))
        .finally(() => setIsLoading(false));
    }
  }, [instrument?.id, initialSections]);

  // Auto-scroll to referenced quote when active obligation changes
  useEffect(() => {
    if (activeObligation) {
      const timer = setTimeout(() => {
        if (quoteRef.current) {
          quoteRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [activeObligation?.id, activeObligation?.clauseId]);

  // Flattened obligations list
  const allObligations: RegulatoryObligationPresentation[] = useMemo(() => {
    const list: RegulatoryObligationPresentation[] = [];
    for (const sec of sections) {
      if (sec.obligations) {
        for (const obl of sec.obligations) {
          list.push(obl);
        }
      }
    }
    return list;
  }, [sections]);

  // Filtered obligations list
  const filteredObligations = useMemo(() => {
    return allObligations.filter((obl) => {
      // Section filter
      if (selectedSectionId !== 'ALL' && obl.clauseId !== selectedSectionId) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ALL' && obl.status !== statusFilter) {
        return false;
      }
      // Rule Type filter
      if (ruleTypeFilter !== 'ALL' && obl.ruleType !== ruleTypeFilter) {
        return false;
      }
      // Assignee filter
      if (selectedAssignee !== 'ALL') {
        if (selectedAssignee === 'UNASSIGNED' && obl.assignee) return false;
        if (selectedAssignee !== 'UNASSIGNED' && obl.assignee?.name !== selectedAssignee) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = obl.title.toLowerCase().includes(q);
        const matchesDesc = obl.description.toLowerCase().includes(q);
        const matchesCode = obl.code.toLowerCase().includes(q);
        const matchesSec = obl.sectionHeading?.toLowerCase().includes(q) || obl.sectionReference?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCode && !matchesSec) return false;
      }
      return true;
    });
  }, [allObligations, selectedSectionId, statusFilter, ruleTypeFilter, selectedAssignee, searchQuery]);

  // Handler: Open Split-Screen Inspector
  const handleSelectObligation = (obl: RegulatoryObligationPresentation) => {
    setActiveObligation(obl);
    setIsEditMode(false);
    setEditFormData({
      title: obl.title,
      description: obl.description,
      ruleType: obl.ruleType,
      policyApplicability: obl.policyApplicability,
      status: obl.status,
      clauseId: obl.clauseId,
      criteria: obl.assessmentCriteria ? [...obl.assessmentCriteria] : [],
    });

    // Auto-scroll to quote after pane render
    setTimeout(() => {
      if (quoteRef.current) {
        quoteRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  // Handler: Toggle Relevance
  const handleToggleRelevance = async (obligationId: string, current: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextVal = !current;

    // Optimistic update
    setSections((prev) =>
      prev.map((sec) => ({
        ...sec,
        obligations: sec.obligations.map((o) =>
          o.id === obligationId ? { ...o, isRelevant: nextVal } : o
        ),
      }))
    );

    if (activeObligation && activeObligation.id === obligationId) {
      setActiveObligation({ ...activeObligation, isRelevant: nextVal });
    }

    try {
      await fetch(`/api/obligations/${encodeURIComponent(obligationId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRelevant: nextVal }),
      });
    } catch (err) {
      console.error('Failed to toggle relevance', err);
    }
  };

  // Handler: Toggle Star
  const handleToggleStar = async (obligationId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const obl = allObligations.find((o) => o.id === obligationId);
    const nextStarred = !obl?.isStarred;

    setSections((prev) =>
      prev.map((sec) => ({
        ...sec,
        obligations: sec.obligations.map((o) =>
          o.id === obligationId ? { ...o, isStarred: nextStarred } : o
        ),
      }))
    );

    if (activeObligation && activeObligation.id === obligationId) {
      setActiveObligation({ ...activeObligation, isStarred: nextStarred });
    }

    if (onToggleStar) onToggleStar(obligationId);

    try {
      await fetch(`/api/obligations/${encodeURIComponent(obligationId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: nextStarred }),
      });
    } catch (err) {
      console.error('Failed to star obligation', err);
    }
  };

  // Handler: Export Filtered Obligations to CSV
  const handleExportCsv = () => {
    const headers = [
      'Statutory Code',
      'Section Reference',
      'Section Heading',
      'Obligation Title',
      'Rule Description',
      'Rule Nature',
      'Policy Applicability',
      'Review Status',
      'Assessment Criteria Count',
      'Is Relevant',
      'Verbatim Statutory Quote'
    ];
    const rows = filteredObligations.map((obl) => [
      `"${obl.code || ''}"`,
      `"${obl.sectionReference || ''}"`,
      `"${(obl.sectionHeading || '').replace(/"/g, '""')}"`,
      `"${(obl.title || '').replace(/"/g, '""')}"`,
      `"${(obl.description || '').replace(/"/g, '""')}"`,
      `"${obl.ruleType || ''}"`,
      `"${obl.policyApplicability || ''}"`,
      `"${obl.status || ''}"`,
      `"${obl.assessmentCriteria?.length || 0}"`,
      `"${obl.isRelevant ? 'Yes' : 'No'}"`,
      `"${(obl.verbatimQuote || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const cleanTitle = (instrument?.shortTitle || 'statutory_obligations').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    link.setAttribute('download', `${cleanTitle}_register.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handler: Update Status
  const handleUpdateStatus = async (
    obligationId: string,
    newStatus: ObligationReviewStatus,
    e?: React.MouseEvent | React.ChangeEvent<HTMLSelectElement>
  ) => {
    if (e) e.stopPropagation();

    setSections((prev) =>
      prev.map((sec) => ({
        ...sec,
        obligations: sec.obligations.map((o) =>
          o.id === obligationId ? { ...o, status: newStatus } : o
        ),
      }))
    );

    if (activeObligation && activeObligation.id === obligationId) {
      setActiveObligation({ ...activeObligation, status: newStatus });
      setEditFormData((prev) => ({ ...prev, status: newStatus }));
    }

    try {
      await fetch(`/api/obligations/${encodeURIComponent(obligationId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  // Handler: Save Edit Changes
  const handleSaveEdit = async () => {
    if (!activeObligation) return;
    setIsSavingEdit(true);

    try {
      const res = await fetch(`/api/obligations/${encodeURIComponent(activeObligation.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editFormData.title,
          description: editFormData.description,
          ruleType: editFormData.ruleType,
          policyApplicability: editFormData.policyApplicability,
          status: editFormData.status,
          clauseId: editFormData.clauseId,
          criteria: editFormData.criteria,
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        const savedCriteria: AssessmentCriterionItem[] = Array.isArray(data?.criteria)
          ? data.criteria
          : editFormData.criteria;

        // Find assigned section info
        const targetSection = sections.find((s) => s.id === editFormData.clauseId) || sections[0];

        const updatedObl: RegulatoryObligationPresentation = {
          ...activeObligation,
          title: editFormData.title,
          description: editFormData.description,
          ruleType: editFormData.ruleType,
          policyApplicability: editFormData.policyApplicability,
          status: editFormData.status,
          clauseId: editFormData.clauseId,
          sectionHeading: targetSection?.sectionHeading || activeObligation.sectionHeading,
          sectionReference: targetSection?.sectionReference || activeObligation.sectionReference,
          assessmentCriteria: savedCriteria,
        };

        // Update sections state
        setSections((prev) =>
          prev.map((sec) => {
            const filteredObs = sec.obligations.filter((o) => o.id !== activeObligation.id);
            if (sec.id === editFormData.clauseId) {
              return {
                ...sec,
                obligations: [...filteredObs, updatedObl],
                obligationsCount: filteredObs.length + 1,
              };
            }
            return {
              ...sec,
              obligations: filteredObs,
              obligationsCount: filteredObs.length,
            };
          })
        );

        setActiveObligation(updatedObl);
        setEditFormData((prev) => ({ ...prev, criteria: savedCriteria }));
        setIsEditMode(false);
      } else if (res.status === 402 || res.status === 403) {
        const errData = await res.json().catch(() => null);
        setUpgradeModalState({
          isOpen: true,
          featureName: errData?.featureName || 'Inline Obligation & Assessment Criteria Editing (✎)',
          requiredPlan: (errData?.requiredPlan as PlanTier) || 'PRO',
          reason: errData?.error || 'Inline editing of statutory obligations and criteria requires the Pro Tier.',
          isReadOnly: errData?.code === 'TRIAL_EXPIRED',
        });
      }
    } catch (err) {
      console.error('Failed to save obligation edits', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handler: Add Criteria in Edit Mode
  const handleAddCriterionInline = () => {
    const newCrit: AssessmentCriterionItem = {
      id: `crit-new-${Date.now()}`,
      type: 'Core Criteria',
      text: 'Internal policy mandate enforces operational boundary and supervisor reporting',
      evidenceRequired: 'Approved institutional policy document or standard operating procedure',
      isMandatory: true,
    };
    setEditFormData((prev) => ({
      ...prev,
      criteria: [...prev.criteria, newCrit],
    }));
  };

  // Handler: Remove Criteria in Edit Mode
  const handleRemoveCriterionInline = (critId: string) => {
    setEditFormData((prev) => ({
      ...prev,
      criteria: prev.criteria.filter((c) => c.id !== critId),
    }));
  };

  // Toggle criterion checked in inspector for audit readiness
  const handleToggleCheckCriterion = (critId: string) => {
    setCheckedCriteriaIds((prev) => {
      const next = new Set(prev);
      if (next.has(critId)) next.delete(critId);
      else next.add(critId);
      return next;
    });
  };

  // Status Badge Component (6px dot + text)
  const renderStatusDot = (status: ObligationReviewStatus) => {
    let dotColor = 'bg-amber-500';
    if (status === 'Reviewed / Active' || status === 'Approved') dotColor = 'bg-emerald-500';
    if (status === 'Archived') dotColor = 'bg-slate-400';

    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span>{status}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
            <span>/</span>
            <span className="font-semibold text-slate-900">
              {instrument?.shortTitle || 'Statutory Instrument'}
            </span>
            <span>/</span>
            <span className="text-slate-400">Obligations Register</span>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <span>Obligations Register</span>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
              {allObligations.length} Duties
            </span>
          </h1>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (subscriptionPlan && !subscriptionPlan.canEditObligationCriteria) {
                setUpgradeModalState({
                  isOpen: true,
                  featureName: 'Custom Obligation Creation & Criteria Editing (✎)',
                  requiredPlan: 'PRO',
                  reason:
                    'Creating custom statutory obligations and editing assessment criteria requires the Pro Tier. Starter and 7-Day Trial plans provide read-only baseline access.',
                });
                return;
              }
              setNewObligationData({
                title: '',
                description: '',
                ruleType: 'Prescriptive',
                policyApplicability: 'Policy Applicable',
                clauseId: sections[0]?.id || '',
              });
              setIsAddObligationModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Obligation</span>
          </button>
        </div>
      </div>

      {/* 2. Global Filter & Search Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by statutory rule, code, or keyword..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Reviewed / Active">Reviewed / Active</option>
            <option value="Approved">Approved</option>
            <option value="Archived">Archived</option>
          </select>

          {/* Rule Type Filter */}
          <select
            value={ruleTypeFilter}
            onChange={(e) => setRuleTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Rule Types</option>
            <option value="Prescriptive">Prescriptive</option>
            <option value="Risk Based">Risk Based</option>
            <option value="Conditional">Conditional</option>
            <option value="Prohibitive">Prohibitive</option>
          </select>

          {/* Reset Filters */}
          {(statusFilter !== 'ALL' || ruleTypeFilter !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setRuleTypeFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-slate-500 hover:text-slate-900 underline px-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Workspace: View 1 (Table + Tree) OR View 2 (50/50 Split Screen) */}
      {!activeObligation ? (
        /* ================= VIEW 1: LEFT SECTION TREE (25%) + RIGHT OBLIGATIONS TABLE (75%) ================= */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">
          {/* Left Navigation Tree (25%) */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Statutory Sections
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {sections.length} parts
              </span>
            </div>

            {/* "All Sections" Item */}
            <div
              onClick={() => setSelectedSectionId('ALL')}
              className={`p-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors ${
                selectedSectionId === 'ALL'
                  ? 'bg-slate-900 text-white font-medium'
                  : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span>All Sections</span>
              <span
                className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                  selectedSectionId === 'ALL'
                    ? 'bg-slate-800 text-slate-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {allObligations.length}
              </span>
            </div>

            {/* Individual Sections */}
            <div className="space-y-1 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              {sections.map((sec) => {
                const count = sec.obligationsCount || sec.obligations?.length || 0;
                const isSelected = selectedSectionId === sec.id;
                return (
                  <div
                    key={sec.id}
                    onClick={() => setSelectedSectionId(sec.id)}
                    className={`p-2 rounded-lg text-xs cursor-pointer transition-colors flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-slate-900 text-white font-medium'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-mono text-[10px] font-bold px-1 rounded ${
                            isSelected
                              ? 'bg-slate-800 text-slate-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {sec.sectionReference}
                        </span>
                      </div>
                      <p
                        className={`truncate text-[11px] mt-0.5 ${
                          isSelected ? 'text-slate-200' : 'text-slate-600'
                        }`}
                      >
                        {sanitizeSectionHeading(sec.sectionReference, sec.sectionHeading)}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                        isSelected
                          ? 'bg-slate-800 text-slate-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Obligations Table (75%) */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {isLoading ? (
              <div className="p-12 text-center space-y-3">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500">Loading statutory obligations register...</p>
              </div>
            ) : filteredObligations.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">No Statutory Obligations Match Filters</p>
                <p className="text-[11px] text-slate-400">
                  Try clearing your search query or adjusting your filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4 w-10 text-center">
                        <input type="checkbox" className="rounded border-slate-300" />
                      </th>
                      <th className="py-3 px-4">Statutory Obligation</th>
                      <th className="py-3 px-4 w-36">Review Status</th>
                      <th className="py-3 px-4 w-36">Assignee</th>
                      <th className="py-3 px-4 w-24 text-center">Relevant</th>
                      <th className="py-3 px-3 w-12 text-center">Star</th>
                      <th className="py-3 px-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredObligations.map((obl) => {
                      return (
                        <tr
                          key={obl.id}
                          onClick={() => handleSelectObligation(obl)}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                        >
                          {/* Checkbox */}
                          <td
                            className="py-3.5 px-4 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input type="checkbox" className="rounded border-slate-300" />
                          </td>

                          {/* Obligation Content */}
                          <td className="py-3.5 px-4 space-y-1">
                            <div className="font-bold text-slate-900 group-hover:text-slate-800 flex items-center gap-2">
                              <span>{obl.title}</span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              {obl.description}
                            </p>
                            <div className="flex items-center gap-2 pt-0.5">
                              <span className="font-mono text-[10px] text-slate-500">
                                {obl.code}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="font-mono text-[10px] font-medium text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded">
                                {obl.ruleType}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="font-mono text-[10px] text-slate-500">
                                {obl.sectionReference}
                              </span>
                            </div>
                          </td>

                          {/* Status Dropdown Pill */}
                          <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={obl.status}
                              onChange={(e) =>
                                handleUpdateStatus(obl.id, e.target.value as ObligationReviewStatus)
                              }
                              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
                            >
                              <option value="Pending Review">Pending Review</option>
                              <option value="Reviewed / Active">Reviewed / Active</option>
                              <option value="Approved">Approved</option>
                              <option value="Archived">Archived</option>
                            </select>
                          </td>

                          {/* Assignee */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {obl.assignee?.initials || 'CC'}
                              </span>
                              <span className="truncate text-slate-800 font-medium">
                                {obl.assignee?.name || 'Chief Compliance Officer'}
                              </span>
                            </div>
                          </td>

                          {/* Relevant Green Toggle */}
                          <td
                            className="py-3.5 px-4 text-center"
                            onClick={(e) => handleToggleRelevance(obl.id, obl.isRelevant, e)}
                          >
                            <button
                              type="button"
                              className={`w-9 h-5 rounded-full transition-colors relative inline-block ${
                                obl.isRelevant ? 'bg-emerald-500' : 'bg-slate-200'
                              }`}
                            >
                              <span
                                className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                                  obl.isRelevant ? 'right-0.5' : 'left-0.5'
                                }`}
                              />
                            </button>
                          </td>

                          {/* Star */}
                          <td
                            className="py-3.5 px-3 text-center"
                            onClick={(e) => handleToggleStar(obl.id, e)}
                          >
                            <button type="button" className="p-1 hover:bg-slate-100 rounded">
                              <Star
                                className={`w-4 h-4 ${
                                  obl.isStarred
                                    ? 'text-amber-500 fill-amber-500'
                                    : 'text-slate-300 hover:text-slate-500'
                                }`}
                              />
                            </button>
                          </td>

                          {/* 3-Dot Actions */}
                          <td className="py-3.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectObligation(obl);
                              }}
                              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= VIEW 2: 50/50 SPLIT-SCREEN WORKSPACE ================= */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* ================= LEFT PANE (50%): OBLIGATION INSPECTOR ================= */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col h-[calc(100vh-210px)] max-h-[820px] min-h-[520px]">
            {/* Top Bar */}
            <div className="shrink-0 p-3.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                  {activeObligation.code}
                </span>

                {/* Status Dropdown */}
                <select
                  value={activeObligation.status}
                  onChange={(e) =>
                    handleUpdateStatus(
                      activeObligation.id,
                      e.target.value as ObligationReviewStatus
                    )
                  }
                  className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-800 focus:outline-none"
                >
                  <option value="Pending Review">Pending Review</option>
                  <option value="Reviewed / Active">Reviewed / Active</option>
                  <option value="Approved">Approved</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1.5">
                {/* Relevance Toggle Switch */}
                <button
                  type="button"
                  onClick={() =>
                    handleToggleRelevance(activeObligation.id, activeObligation.isRelevant)
                  }
                  className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeObligation.isRelevant ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                  <span>{activeObligation.isRelevant ? 'Relevant' : 'Not Relevant'}</span>
                </button>

                {/* Edit Pen Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (subscriptionPlan && !subscriptionPlan.canEditObligationCriteria) {
                      setUpgradeModalState({
                        isOpen: true,
                        featureName: 'Inline Obligation & Assessment Criteria Editing (✎)',
                        requiredPlan: 'PRO',
                        reason:
                          'Inline editing of statutory obligations, section remapping, and assessment criteria customization requires the Pro Tier. Starter and 7-Day Trial plans provide read-only baseline access.',
                      });
                      return;
                    }
                    setIsEditMode(!isEditMode);
                  }}
                  title="Toggle Edit Mode"
                  className={`p-1.5 rounded-md border transition-colors ${
                    isEditMode
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                {/* Star Button */}
                <button
                  type="button"
                  onClick={() => handleToggleStar(activeObligation.id)}
                  className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50"
                >
                  <Star
                    className={`w-3.5 h-3.5 ${
                      activeObligation.isStarred
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-slate-400'
                    }`}
                  />
                </button>

                {/* Close Inspector (Return to View 1) */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveObligation(null);
                    setIsEditMode(false);
                  }}
                  title="Close Split View"
                  className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Pane Content */}
            <div className="flex-1 p-5 space-y-5 overflow-y-auto min-w-0">
              {isEditMode ? (
                /* ================= EDIT MODE ================= */
                <div className="space-y-4">
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between">
                    <span>Editing Obligation & Assessment Criteria</span>
                    <button
                      type="button"
                      onClick={() => setIsChangeSectionModalOpen(true)}
                      className="font-medium underline hover:text-amber-900"
                    >
                      Change Section
                    </button>
                  </div>

                  {/* Rule Type & Policy Applicability */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Rule Nature
                      </label>
                      <select
                        value={editFormData.ruleType}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            ruleType: e.target.value as ObligationRuleType,
                          })
                        }
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none"
                      >
                        <option value="Prescriptive">Prescriptive</option>
                        <option value="Risk Based">Risk Based</option>
                        <option value="Conditional">Conditional</option>
                        <option value="Prohibitive">Prohibitive</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Policy Applicability
                      </label>
                      <select
                        value={editFormData.policyApplicability}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            policyApplicability: e.target.value as PolicyApplicabilityType,
                          })
                        }
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none"
                      >
                        <option value="Policy Applicable">Policy Applicable</option>
                        <option value="Operational Only">Operational Only</option>
                        <option value="Not Applicable">Not Applicable</option>
                      </select>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Obligation Title
                    </label>
                    <input
                      type="text"
                      value={editFormData.title}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, title: e.target.value })
                      }
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Plain-English Rule Statement
                    </label>
                    <textarea
                      rows={3}
                      value={editFormData.description}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, description: e.target.value })
                      }
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none resize-none"
                    />
                  </div>

                  {/* Editable Assessment Criteria */}
                  <div className="space-y-2 border-t border-slate-200 pt-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Assessment Criteria ({editFormData.criteria.length})
                      </label>
                      <button
                        type="button"
                        onClick={handleAddCriterionInline}
                        className="inline-flex items-center gap-1 text-xs text-slate-900 hover:underline font-medium"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Criterion</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {editFormData.criteria.map((crit, idx) => (
                        <div
                          key={crit.id || idx}
                          className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <select
                              value={crit.type}
                              onChange={(e) => {
                                const val = e.target.value as 'Core Criteria' | 'Best Practice';
                                setEditFormData((prev) => ({
                                  ...prev,
                                  criteria: prev.criteria.map((c, i) =>
                                    i === idx ? { ...c, type: val } : c
                                  ),
                                }));
                              }}
                              className="px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium"
                            >
                              <option value="Core Criteria">Core Criteria</option>
                              <option value="Best Practice">Best Practice</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleRemoveCriterionInline(crit.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <textarea
                            rows={2}
                            value={crit.text}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditFormData((prev) => ({
                                ...prev,
                                criteria: prev.criteria.map((c, i) =>
                                  i === idx ? { ...c, text: val } : c
                                ),
                              }));
                            }}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800 resize-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Save / Cancel Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSavingEdit}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium rounded-lg shadow-xs"
                    >
                      {isSavingEdit ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* ================= READ MODE ================= */
                <div className="space-y-5">
                  {/* Rule Nature & Applicability Badges */}
                  <div className="flex items-center flex-wrap gap-2 text-xs">
                    <span className="font-mono text-[11px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {activeObligation.ruleType}
                    </span>
                    <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {activeObligation.policyApplicability}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {activeObligation.sectionReference}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1.5">
                    <h2 className="text-base font-bold text-slate-900 leading-snug">
                      {activeObligation.title}
                    </h2>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {activeObligation.description}
                    </p>
                  </div>

                  {/* Referenced Clause Pill with jump button */}
                  <div className="p-3 bg-purple-50/60 border border-purple-200/80 rounded-lg flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                      <div>
                        <span className="font-semibold text-purple-950">
                          {activeObligation.sectionReference}: {sanitizeSectionHeading(activeObligation.sectionReference, activeObligation.sectionHeading)}
                        </span>
                        <p className="text-[11px] text-purple-800 line-clamp-1">
                          &ldquo;{activeObligation.verbatimQuote}&rdquo;
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (quoteRef.current) {
                          quoteRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                      className="font-mono text-[11px] font-bold text-purple-900 bg-white border border-purple-200 px-2 py-1 rounded hover:bg-purple-100 shrink-0"
                    >
                      [1] Jump ↗
                    </button>
                  </div>

                  {/* Accordion 1: Assessment Criteria */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setIsCriteriaOpen(!isCriteriaOpen)}
                      className="w-full p-3 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-100/70 transition-colors"
                    >
                      <span>
                        Assessment Criteria ({activeObligation.assessmentCriteria?.length || 0})
                      </span>
                      {isCriteriaOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </button>

                    {isCriteriaOpen && (
                      <div className="p-3 space-y-2.5 divide-y divide-slate-100">
                        {activeObligation.assessmentCriteria &&
                        activeObligation.assessmentCriteria.length > 0 ? (
                          activeObligation.assessmentCriteria.map((crit, idx) => {
                            const isChecked = checkedCriteriaIds.has(crit.id);
                            return (
                              <div
                                key={crit.id || idx}
                                className={`pt-2.5 first:pt-0 space-y-1.5 transition-colors ${
                                  isChecked ? 'opacity-75' : ''
                                }`}
                              >
                                <div className="flex items-start gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCheckCriterion(crit.id)}
                                    className="mt-0.5 text-slate-400 hover:text-slate-900 shrink-0"
                                  >
                                    {isChecked ? (
                                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                                    ) : (
                                      <Square className="w-4 h-4" />
                                    )}
                                  </button>
                                  <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                          crit.type === 'Core Criteria'
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-slate-100 text-slate-700'
                                        }`}
                                      >
                                        {crit.type}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-800 leading-relaxed">
                                      {crit.text}
                                    </p>
                                    {crit.evidenceRequired && (
                                      <p className="text-[10px] text-slate-400 font-mono">
                                        Evidence: {crit.evidenceRequired}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-slate-400 py-2">
                            No discrete assessment criteria defined.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Accordion 2: Risk & Statutory Exposure */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setIsRiskOpen(!isRiskOpen)}
                      className="w-full p-3 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-100/70 transition-colors"
                    >
                      <span>Risk & Statutory Exposure</span>
                      {isRiskOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </button>

                    {isRiskOpen && (
                      <div className="p-3 space-y-2 text-xs">
                        <p className="text-slate-700 leading-relaxed">
                          {activeObligation.riskDescription ||
                            'Non-compliance with this directive constitutes a supervisory infraction subject to immediate statutory penalties, administrative sanctions, and personal liability under financial regulations.'}
                        </p>
                        {activeObligation.penalties && activeObligation.penalties.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                              Enforcement Penalties
                            </span>
                            {activeObligation.penalties.map((pen, idx) => (
                              <div key={idx} className="font-mono text-[11px] text-rose-700">
                                {pen.penaltyLegalCitation}: ₦{pen.penaltyMinNaira.toLocaleString()} - ₦{pen.penaltyMaxNaira.toLocaleString()}
                                {pen.carriesPersonalCriminalLiability && ' · Personal Criminal Liability'}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Concordance & Policy Mapping Action Card */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-900 block">
                        Internal Policy Concordance
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Evaluate compliance alignment against uploaded internal policies in Gap Matrix.
                      </p>
                    </div>
                    <a
                      href={`/gap-matrix?obligationId=${encodeURIComponent(activeObligation.id)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg shrink-0 shadow-xs transition-colors"
                    >
                      <span>Map in Gap Matrix</span>
                      <ExternalLink className="w-3 h-3 text-slate-300" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ================= RIGHT PANE (50%): SYNCHRONIZED SOURCE VIEWER ================= */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col h-[calc(100vh-210px)] max-h-[820px] min-h-[520px]">
            {/* Top Bar */}
            <div className="shrink-0 p-3.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                  Authoritative Statutory Source
                </span>
                <h3 className="text-xs font-bold text-slate-900 truncate">
                  {instrument?.fullTitle || activeObligation.sourceDocumentTitle || 'Regulatory Instrument'}
                </h3>
              </div>

              {/* Jump to reference button */}
              <button
                type="button"
                onClick={() => {
                  if (quoteRef.current) {
                    quoteRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-purple-100 text-purple-900 border border-purple-300 rounded-md hover:bg-purple-200 transition-colors shrink-0"
              >
                <span>View Reference 1</span>
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
              </button>
            </div>

            {/* Document Reader Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-6 font-serif leading-relaxed text-slate-800 text-xs min-w-0">
              {/* If source document is PDF and has a direct file URL */}
              {instrument?.sourceFileUrl?.toLowerCase().endsWith('.pdf') ? (
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg font-sans text-xs">
                    <span className="font-semibold text-purple-900">Verbatim Statutory Citation:</span>
                    <p className="mt-1 font-serif text-purple-950 bg-white p-2.5 rounded border border-purple-200">
                      &ldquo;{activeObligation.verbatimQuote}&rdquo;
                    </p>
                  </div>
                  <iframe
                    src={`${instrument.sourceFileUrl}#toolbar=0`}
                    className="w-full h-[500px] border border-slate-200 rounded-lg"
                    title="PDF Gazette Viewer"
                  />
                </div>
              ) : (
                /* Structured Clean Multi-Section Statutory Reader */
                <div className="space-y-6">
                  {sections.map((sec) => {
                    const isReferencedSection =
                      sec.id === activeObligation.clauseId ||
                      (activeObligation.sectionReference && sec.sectionReference === activeObligation.sectionReference) ||
                      (activeObligation.verbatimQuote &&
                        sec.clauseText &&
                        sec.clauseText.toLowerCase().includes(activeObligation.verbatimQuote.trim().toLowerCase().slice(0, 30)));

                    const headingClean = sanitizeSectionHeading(sec.sectionReference, sec.sectionHeading);

                    return (
                      <div
                        key={sec.id}
                        className={`space-y-2 p-3.5 rounded-lg transition-colors ${
                          isReferencedSection
                            ? 'bg-purple-50/40 border border-purple-200/90 shadow-xs'
                            : 'border border-transparent'
                        }`}
                      >
                        <div className="font-sans flex items-center gap-2 pb-1 border-b border-slate-200/80">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                            {sec.sectionReference}
                          </span>
                          <span className="font-bold text-slate-900 text-xs">
                            {headingClean}
                          </span>
                        </div>

                        {/* Clause Text with Verbatim Quote Highlight (Zero Text Duplication) */}
                        <div className="text-slate-800 text-xs leading-relaxed space-y-2 font-serif">
                          {isReferencedSection && activeObligation.verbatimQuote ? (
                            <div className="space-y-2">
                              {/* Single Authoritative Highlighted Quote Box */}
                              <div
                                ref={quoteRef}
                                className="bg-purple-100/90 text-purple-950 border-l-4 border-purple-600 px-3.5 py-3 rounded-r shadow-xs my-2 font-medium leading-relaxed font-sans"
                              >
                                <span className="font-mono text-[10px] uppercase font-bold text-purple-700 block mb-1">
                                  [Reference 1 · Verbatim Statutory Mandate]
                                </span>
                                &ldquo;{activeObligation.verbatimQuote}&rdquo;
                              </div>
                              {/* Only show supplementary clause text if it is NOT substantially identical to the quote */}
                              {(() => {
                                const normClause = (sec.clauseText || '').trim().toLowerCase();
                                const normQuote = (activeObligation.verbatimQuote || '').trim().toLowerCase();
                                const isDuplicate =
                                  !normClause ||
                                  normClause === normQuote ||
                                  (normClause.includes(normQuote) && normClause.length <= normQuote.length + 40);
                                if (isDuplicate) return null;
                                return (
                                  <p className="text-slate-600 font-sans text-[11px] leading-relaxed pt-1">
                                    {sec.clauseText}
                                  </p>
                                );
                              })()}
                            </div>
                          ) : (
                            <p className="text-slate-700 leading-relaxed font-sans">
                              {sec.clauseText || 'Statutory provisions enacted by regulatory authority.'}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD OBLIGATION ================= */}
      {isAddObligationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add Statutory Obligation</h3>
              <button
                type="button"
                onClick={() => setIsAddObligationModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Target Statutory Section
                </label>
                <select
                  value={newObligationData.clauseId}
                  onChange={(e) =>
                    setNewObligationData({ ...newObligationData, clauseId: e.target.value })
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.sectionReference}: {s.sectionHeading}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Rule Nature
                  </label>
                  <select
                    value={newObligationData.ruleType}
                    onChange={(e) =>
                      setNewObligationData({
                        ...newObligationData,
                        ruleType: e.target.value as ObligationRuleType,
                      })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="Prescriptive">Prescriptive</option>
                    <option value="Risk Based">Risk Based</option>
                    <option value="Conditional">Conditional</option>
                    <option value="Prohibitive">Prohibitive</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Policy Applicability
                  </label>
                  <select
                    value={newObligationData.policyApplicability}
                    onChange={(e) =>
                      setNewObligationData({
                        ...newObligationData,
                        policyApplicability: e.target.value as PolicyApplicabilityType,
                      })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="Policy Applicable">Policy Applicable</option>
                    <option value="Operational Only">Operational Only</option>
                    <option value="Not Applicable">Not Applicable</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Obligation Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Daily Reconciliation Protocol"
                  value={newObligationData.title}
                  onChange={(e) =>
                    setNewObligationData({ ...newObligationData, title: e.target.value })
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Plain-English Rule Statement
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the exact statutory requirement..."
                  value={newObligationData.description}
                  onChange={(e) =>
                    setNewObligationData({ ...newObligationData, description: e.target.value })
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsAddObligationModalOpen(false)}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!newObligationData.title.trim()) return;
                  const sec = sections.find((s) => s.id === newObligationData.clauseId) || sections[0];
                  if (!sec) return;

                  if (instrument?.id) {
                    try {
                      const res = await fetch(
                        `/api/library/${encodeURIComponent(instrument.id)}/obligations`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            clauseId: sec.id,
                            title: newObligationData.title.trim(),
                            description: newObligationData.description.trim() || newObligationData.title.trim(),
                            ruleType: newObligationData.ruleType,
                            policyApplicability: newObligationData.policyApplicability,
                          }),
                        }
                      );

                      if (res.status === 402 || res.status === 403) {
                        const errData = await res.json().catch(() => null);
                        setIsAddObligationModalOpen(false);
                        setUpgradeModalState({
                          isOpen: true,
                          featureName:
                            errData?.featureName || 'Custom Obligation Creation & Criteria Editing (✎)',
                          requiredPlan: (errData?.requiredPlan as PlanTier) || 'PRO',
                          reason:
                            errData?.error ||
                            'Creating statutory obligations requires the Pro Tier.',
                          isReadOnly: errData?.code === 'TRIAL_EXPIRED',
                        });
                        return;
                      }

                      const data = await res.json();
                      if (res.ok && data?.success && data.obligation) {
                        setSections((prev) =>
                          prev.map((s) =>
                            s.id === sec.id
                              ? {
                                  ...s,
                                  obligations: [...(s.obligations || []), data.obligation],
                                  obligationsCount:
                                    (s.obligationsCount || s.obligations?.length || 0) + 1,
                                }
                              : s
                          )
                        );
                        setIsAddObligationModalOpen(false);
                        return;
                      }
                    } catch (err) {
                      console.error('Failed persisting custom obligation', err);
                    }
                  }
                }}
                className="px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg"
              >
                Create Obligation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHANGE SECTION ================= */}
      {isChangeSectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Change Assigned Section</h3>
              <button
                type="button"
                onClick={() => setIsChangeSectionModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {sections.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setEditFormData((prev) => ({ ...prev, clauseId: s.id }));
                    setIsChangeSectionModalOpen(false);
                  }}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    editFormData.clauseId === s.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'hover:bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <span className="font-mono font-bold">{s.sectionReference}</span>: {s.sectionHeading}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: UPGRADE PLAN ================= */}
      <UpgradePlanModal
        isOpen={upgradeModalState.isOpen}
        onClose={() => setUpgradeModalState({ isOpen: false })}
        featureName={upgradeModalState.featureName}
        requiredPlan={upgradeModalState.requiredPlan}
        reason={upgradeModalState.reason}
        isReadOnly={upgradeModalState.isReadOnly}
      />
    </div>
  );
}
