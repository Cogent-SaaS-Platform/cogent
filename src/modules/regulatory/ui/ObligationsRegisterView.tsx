'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  RefreshCw,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import {
  RegulatoryInstrumentPresentation,
  StatutorySection,
  DecomposedObligationPresentation,
  FourPhaseObligation,
  SupervisoryMetrics,
  ControlEffectivenessStatus,
  EvidenceStatus,
} from '../types';
import {
  ObligationMetricsService,
  formatStatutoryIdentifier,
  sanitizeRequirementText,
  categorizeObligationType,
} from '../services/obligationMetricsService';
import { ObligationDetailDrawer } from './ObligationDetailDrawer';

interface ObligationsRegisterViewProps {
  instrument?: RegulatoryInstrumentPresentation | null;
  sections?: StatutorySection[];
  isLoading?: boolean;
  onBack?: () => void;
  onUpdateObligationOverride?: (
    obligationId: string,
    override: {
      status?: 'ADEQUATELY_MET' | 'PARTIALLY_MET' | 'GAP_DETECTED' | 'NOT_APPLICABLE' | 'PENDING_REVIEW';
      assignedOwner?: string;
      internalNotes?: string;
      internalSopCitation?: string;
      verifiedCriteriaIds?: string[];
    }
  ) => Promise<void>;
  onToggleStar?: (obligationId: string) => void;
  circularId?: string;
}

export function ObligationsRegisterView({
  instrument,
  sections = [],
  isLoading: initialLoading = false,
  onBack,
  onUpdateObligationOverride,
  onToggleStar,
  circularId,
}: ObligationsRegisterViewProps) {
  // Service instance for metrics calculation
  const metricsService = useMemo(() => new ObligationMetricsService(), []);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegulator, setSelectedRegulator] = useState<string>('ALL');
  const [selectedEffectiveness, setSelectedEffectiveness] = useState<string>('ALL');
  const [selectedRuleCategory, setSelectedRuleCategory] = useState<string>('ALL');
  const [metricFilter, setMetricFilter] = useState<'ALL' | 'ORPHANS' | 'BOTTLENECKS' | 'REDUNDANT'>('ALL');

  // Drawer & Selection State
  const [activeObligation, setActiveObligation] = useState<FourPhaseObligation | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  // Obligations state (can be derived from sections prop or loaded from API)
  const [fourPhaseObligations, setFourPhaseObligations] = useState<FourPhaseObligation[]>([]);
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Convert sections prop into FourPhaseObligation[] if sections are provided
  const propDerivedObligations: FourPhaseObligation[] = useMemo(() => {
    if (!sections || sections.length === 0) return [];

    let seq = 1;
    const list: FourPhaseObligation[] = [];
    const regCode = instrument?.regulator || 'CBN';
    const regName = instrument?.regulatorName || 'Central Bank of Nigeria';
    const rulebookTitle = instrument?.shortTitle || 'Regulatory Directives';

    for (const sec of sections) {
      if (!sec.obligations) continue;
      for (const obl of sec.obligations) {
        const cleanSummary = sanitizeRequirementText(obl.summary);
        const humanId = formatStatutoryIdentifier(regCode, instrument?.year || 2024, seq);
        seq++;

        // Determine control mapping
        const assignedRole = obl.targetRole || obl.assignee?.role || 'Chief Compliance Officer';
        const isNotApplicable = obl.status === 'NOT_APPLICABLE';
        const hasGap = obl.status === 'GAP_DETECTED';

        // Internal control ID: if adequately or partially met, synthesize/derive or leave null if gap
        const controlId = hasGap || isNotApplicable ? null : `CTRL-COMP-${String(seq).padStart(3, '0')}`;
        const isOrphan = !controlId;

        const effectivenessStatus: ControlEffectivenessStatus = isOrphan
          ? 'UNMAPPED'
          : obl.status === 'ADEQUATELY_MET'
          ? 'EFFECTIVE'
          : 'NEEDS_REVIEW';

        const evidenceStatus: EvidenceStatus = isOrphan
          ? 'MISSING_EVIDENCE'
          : obl.status === 'ADEQUATELY_MET'
          ? 'VERIFIED'
          : 'PENDING_AUDIT';

        list.push({
          internalId: obl.id,
          phase1Source: {
            regulator: regCode,
            regulatorName: regName,
            rulebook: rulebookTitle,
            circularId,
            sectionReference: sec.sectionReference || obl.sectionReference,
            sectionHeading: sec.sectionHeading || obl.sectionHeading,
            statutoryCitation: instrument?.officialCitation
              ? `${instrument.officialCitation} §${sec.sectionReference || obl.sectionReference}`
              : `${rulebookTitle} §${sec.sectionReference || obl.sectionReference}`,
          },
          phase2Obligation: {
            humanId,
            obligationType: categorizeObligationType(obl.obligationType),
            atomicRequirement: cleanSummary,
            statutoryText: obl.statutoryText || sec.clauseText || cleanSummary,
            severity: obl.severityFloor,
            statutoryTimelineDays: obl.statutoryTimelineDays,
            statutoryTimelineText: obl.statutoryTimelineDays ? `${obl.statutoryTimelineDays} Days` : null,
            penalties: obl.penalties || [],
          },
          phase3Safeguards: {
            controlId,
            controlName: controlId ? `Internal Safeguard ${controlId}` : null,
            policyId: controlId ? `POL-OPS-2024` : null,
            policyName: controlId ? `Enterprise Compliance Operating Policy` : null,
            custodianRole: assignedRole,
            department: 'COMPLIANCE_LEGAL',
          },
          phase4Health: {
            effectivenessStatus,
            evidenceStatus,
            evidenceArtifactName: controlId ? `SOP-${sec.sectionReference.replace(/[^A-Za-z0-9]/g, '')}.pdf` : null,
            lastAuditedAt: new Date().toISOString(),
            isOrphan,
          },
        });
      }
    }
    return list;
  }, [sections, instrument, circularId]);

  // Load from API when not provided via props or if circularId filter given
  const loadFromApi = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (circularId) params.set('circularId', circularId);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (selectedEffectiveness !== 'ALL') params.set('status', selectedEffectiveness);
      if (selectedRegulator !== 'ALL') params.set('regulator', selectedRegulator);
      params.set('limit', '200');

      const res = await fetch(`/api/regulatory/obligations?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setFourPhaseObligations(data.data);
      } else {
        throw new Error(data.error || 'Failed loading obligations');
      }
    } catch (err: any) {
      setFetchError(err.message || 'Unable to connect to live obligations API');
    } finally {
      setIsLoading(false);
    }
  }, [circularId, searchQuery, selectedEffectiveness, selectedRegulator]);

  // Sync state with prop derived obligations if present, or fetch from API
  useEffect(() => {
    if (propDerivedObligations.length > 0) {
      setFourPhaseObligations(propDerivedObligations);
      setIsLoading(false);
    } else {
      loadFromApi();
    }
  }, [propDerivedObligations, loadFromApi]);

  // Real-time calculation of the 3 Core Metrics
  const metrics: SupervisoryMetrics = useMemo(() => {
    return metricsService.calculateSupervisoryMetrics(fourPhaseObligations);
  }, [fourPhaseObligations, metricsService]);

  // High-ratio bottleneck control IDs
  const bottleneckControlIds = useMemo(() => {
    return new Set(metrics.controlConcentration.topBottlenecks.map((b) => b.controlId));
  }, [metrics]);

  // Redundant citations
  const redundantCitations = useMemo(() => {
    return new Set(metrics.redundantControls.redundantPairs.map((r) => r.statutoryCitation));
  }, [metrics]);

  // Filtered obligations
  const filteredObligations = useMemo(() => {
    let result = fourPhaseObligations;

    // Metric pulse filters
    if (metricFilter === 'ORPHANS') {
      result = result.filter((o) => o.phase4Health.isOrphan);
    } else if (metricFilter === 'BOTTLENECKS') {
      result = result.filter((o) => o.phase3Safeguards.controlId && bottleneckControlIds.has(o.phase3Safeguards.controlId));
    } else if (metricFilter === 'REDUNDANT') {
      result = result.filter((o) => redundantCitations.has(o.phase1Source.statutoryCitation));
    }

    // Regulators
    if (selectedRegulator !== 'ALL') {
      result = result.filter((o) => o.phase1Source.regulator.toUpperCase() === selectedRegulator.toUpperCase());
    }

    // Effectiveness
    if (selectedEffectiveness !== 'ALL') {
      result = result.filter((o) => o.phase4Health.effectivenessStatus === selectedEffectiveness);
    }

    // Category
    if (selectedRuleCategory !== 'ALL') {
      result = result.filter((o) => o.phase2Obligation.obligationType === selectedRuleCategory);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (o) =>
          o.phase2Obligation.humanId.toLowerCase().includes(q) ||
          o.phase2Obligation.atomicRequirement.toLowerCase().includes(q) ||
          o.phase1Source.statutoryCitation.toLowerCase().includes(q) ||
          o.phase1Source.sectionReference.toLowerCase().includes(q) ||
          (o.phase3Safeguards.controlId && o.phase3Safeguards.controlId.toLowerCase().includes(q)) ||
          o.phase3Safeguards.custodianRole.toLowerCase().includes(q)
      );
    }

    return result;
  }, [
    fourPhaseObligations,
    metricFilter,
    bottleneckControlIds,
    redundantCitations,
    selectedRegulator,
    selectedEffectiveness,
    selectedRuleCategory,
    searchQuery,
  ]);

  const handleOpenDrawer = (obl: FourPhaseObligation) => {
    setActiveObligation(obl);
    setIsDrawerOpen(true);
  };

  const handleUpdateControlMapping = async (
    obligationId: string,
    mapping: {
      controlId?: string | null;
      controlName?: string | null;
      policyId?: string | null;
      policyName?: string | null;
      custodianRole?: string;
      department?: string;
      effectivenessStatus?: ControlEffectivenessStatus;
      evidenceStatus?: EvidenceStatus;
      evidenceArtifactName?: string | null;
      notes?: string | null;
    }
  ) => {
    try {
      await fetch(`/api/regulatory/obligations/${obligationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapping),
      });

      // Optimistically update register state
      setFourPhaseObligations((prev) =>
        prev.map((item) => {
          if (item.internalId === obligationId) {
            const isOrphan = !mapping.controlId;
            return {
              ...item,
              phase3Safeguards: {
                ...item.phase3Safeguards,
                controlId: mapping.controlId ?? null,
                controlName: mapping.controlName ?? (mapping.controlId ? `Internal Control ${mapping.controlId}` : null),
                policyId: mapping.policyId ?? null,
                policyName: mapping.policyName ?? null,
                custodianRole: mapping.custodianRole || item.phase3Safeguards.custodianRole,
                department: mapping.department || item.phase3Safeguards.department,
              },
              phase4Health: {
                ...item.phase4Health,
                effectivenessStatus: mapping.effectivenessStatus || (isOrphan ? 'UNMAPPED' : 'EFFECTIVE'),
                evidenceStatus: mapping.evidenceStatus || (isOrphan ? 'MISSING_EVIDENCE' : 'PENDING_AUDIT'),
                evidenceArtifactName: mapping.evidenceArtifactName ?? null,
                isOrphan,
              },
            };
          }
          return item;
        })
      );

      // If active in drawer, update active obligation
      if (activeObligation && activeObligation.internalId === obligationId) {
        const isOrphan = !mapping.controlId;
        setActiveObligation({
          ...activeObligation,
          phase3Safeguards: {
            ...activeObligation.phase3Safeguards,
            controlId: mapping.controlId ?? null,
            controlName: mapping.controlName ?? (mapping.controlId ? `Internal Control ${mapping.controlId}` : null),
            policyId: mapping.policyId ?? null,
            policyName: mapping.policyName ?? null,
            custodianRole: mapping.custodianRole || activeObligation.phase3Safeguards.custodianRole,
            department: mapping.department || activeObligation.phase3Safeguards.department,
          },
          phase4Health: {
            ...activeObligation.phase4Health,
            effectivenessStatus: mapping.effectivenessStatus || (isOrphan ? 'UNMAPPED' : 'EFFECTIVE'),
            evidenceStatus: mapping.evidenceStatus || (isOrphan ? 'MISSING_EVIDENCE' : 'PENDING_AUDIT'),
            evidenceArtifactName: mapping.evidenceArtifactName ?? null,
            isOrphan,
          },
        });
      }
    } catch (err) {
      console.error('Failed updating control mapping', err);
    }
  };

  const handleToggleStarLocal = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (onToggleStar) onToggleStar(id);
  };

  return (
    <div className="space-y-6">
      {/* ────────────────────────────────────────────────────────────────────
          1. HEADER & BREADCRUMBS
          ──────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
          {onBack && (
            <>
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <span>/</span>
            </>
          )}
          <span className="font-semibold text-slate-900">
            {instrument?.shortTitle || '4-Phase Statutory Obligations Register'}
          </span>
          {circularId && (
            <span className="font-mono text-[11px] text-slate-500">
              [Circular Filter: {circularId}]
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
          <span>{fourPhaseObligations.length} Total Obligations</span>
          <span>·</span>
          <span>{metrics.orphanRate.orphanCount} Unhedged</span>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          2. THE 3 CORE SUPERVISORY METRICS PULSE STRIP (Rule #1 Invariant)
          ──────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-lg grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 shadow-2xs">
        {/* Metric 1: The Orphan Obligation Rate (The Gaps) */}
        <button
          type="button"
          onClick={() => setMetricFilter((prev) => (prev === 'ORPHANS' ? 'ALL' : 'ORPHANS'))}
          className={`p-4 sm:p-5 text-left transition-colors cursor-pointer ${
            metricFilter === 'ORPHANS' ? 'bg-slate-50 ring-1 ring-inset ring-slate-300' : 'hover:bg-slate-50/60'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Orphan Obligation Rate</span>
            <span className="text-[10px] font-mono text-slate-400">BOFIA §65 Risk</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-slate-900 font-mono text-2xl font-bold tracking-tight">
              {metrics.orphanRate.percentage}%
            </span>
            <span className="text-xs font-mono text-slate-500">
              ({metrics.orphanRate.orphanCount} of {metrics.orphanRate.totalObligations})
            </span>
          </div>
          <div className="mt-1.5 text-xs text-slate-600 line-clamp-1">
            {metrics.orphanRate.orphanCount > 0
              ? `${metrics.orphanRate.orphanCount} statutory duties without internal control safeguards`
              : 'All statutory duties hedged against internal controls'}
          </div>
          <div className="mt-2 text-[10px] text-slate-400 font-mono">
            {metricFilter === 'ORPHANS' ? 'Showing orphans only · Click to reset' : 'Click to filter unhedged duties'}
          </div>
        </button>

        {/* Metric 2: Control Concentration (The Bottlenecks) */}
        <button
          type="button"
          onClick={() => setMetricFilter((prev) => (prev === 'BOTTLENECKS' ? 'ALL' : 'BOTTLENECKS'))}
          className={`p-4 sm:p-5 text-left transition-colors cursor-pointer ${
            metricFilter === 'BOTTLENECKS' ? 'bg-slate-50 ring-1 ring-inset ring-slate-300' : 'hover:bg-slate-50/60'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Control Concentration</span>
            <span className="text-[10px] font-mono text-slate-400">Bottlenecks</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-slate-900 font-mono text-2xl font-bold tracking-tight">
              {metrics.controlConcentration.maxRatio}:1
            </span>
            <span className="text-xs font-mono text-slate-500">
              ({metrics.controlConcentration.bottleneckCount} high-ratio controls)
            </span>
          </div>
          <div className="mt-1.5 text-xs text-slate-600 line-clamp-1">
            {metrics.controlConcentration.bottleneckCount > 0
              ? `${metrics.controlConcentration.bottleneckCount} controls bear >= 3 disparate statutory rules`
              : 'Controls evenly distributed across operating teams'}
          </div>
          <div className="mt-2 text-[10px] text-slate-400 font-mono">
            {metricFilter === 'BOTTLENECKS' ? 'Showing bottleneck controls · Click to reset' : 'Click to filter bottleneck controls'}
          </div>
        </button>

        {/* Metric 3: Redundant Controls (The Cost-Cutters) */}
        <button
          type="button"
          onClick={() => setMetricFilter((prev) => (prev === 'REDUNDANT' ? 'ALL' : 'REDUNDANT'))}
          className={`p-4 sm:p-5 text-left transition-colors cursor-pointer ${
            metricFilter === 'REDUNDANT' ? 'bg-slate-50 ring-1 ring-inset ring-slate-300' : 'hover:bg-slate-50/60'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Redundant Controls</span>
            <span className="text-[10px] font-mono text-slate-400">OpEx Recovery</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-slate-900 font-mono text-2xl font-bold tracking-tight">
              {metrics.redundantControls.redundancyFactor}x
            </span>
            <span className="text-xs font-mono text-slate-500">
              ({metrics.redundantControls.redundantClusterCount} duplicate clusters)
            </span>
          </div>
          <div className="mt-1.5 text-xs text-slate-600 line-clamp-1">
            {metrics.redundantControls.redundantClusterCount > 0
              ? `Est. ₦${(metrics.redundantControls.estimatedRedundantSavingsNaira / 1000000).toFixed(1)}M recoverable OpEx`
              : 'Zero redundant controls detected across teams'}
          </div>
          <div className="mt-2 text-[10px] text-slate-400 font-mono">
            {metricFilter === 'REDUNDANT' ? 'Showing duplicate clusters · Click to reset' : 'Click to filter duplicate clusters'}
          </div>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          3. SEARCH & REGULATORY FILTERS
          ──────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by human ID (OBL-...), requirement, citation, or control ID..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Regulator Filter */}
          <select
            value={selectedRegulator}
            onChange={(e) => setSelectedRegulator(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="ALL">All Regulators</option>
            <option value="CBN">CBN</option>
            <option value="SEC">SEC</option>
            <option value="NDPC">NDPC</option>
            <option value="ARCON">ARCON</option>
            <option value="NFIU">NFIU</option>
            <option value="FCCPC">FCCPC</option>
          </select>

          {/* Effectiveness Filter */}
          <select
            value={selectedEffectiveness}
            onChange={(e) => setSelectedEffectiveness(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="ALL">All Control Health</option>
            <option value="EFFECTIVE">Effective</option>
            <option value="NEEDS_REVIEW">Needs Review</option>
            <option value="CRITICAL_GAP">Critical Gap</option>
            <option value="UNMAPPED">Unmapped (Orphan)</option>
          </select>

          {/* Rule Category Filter */}
          <select
            value={selectedRuleCategory}
            onChange={(e) => setSelectedRuleCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="ALL">All Obligation Types</option>
            <option value="STRICT_PROHIBITION">Strict Prohibition</option>
            <option value="MANDATORY_DISCLOSURE">Mandatory Disclosure</option>
            <option value="STATUTORY_TIMELINE">Statutory Timeline</option>
            <option value="CONDITIONAL_PERMISSION">Conditional Permission</option>
            <option value="GOVERNANCE_CONTROL">Governance Control</option>
          </select>

          {/* Reset Filters if active */}
          {(metricFilter !== 'ALL' || selectedRegulator !== 'ALL' || selectedEffectiveness !== 'ALL' || selectedRuleCategory !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setMetricFilter('ALL');
                setSelectedRegulator('ALL');
                setSelectedEffectiveness('ALL');
                setSelectedRuleCategory('ALL');
                setSearchQuery('');
              }}
              className="px-2.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-md text-xs text-slate-600 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          4. 4-PHASE INDUSTRY STANDARD REGISTER MASTER TABLE
          ──────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-3 w-8 text-center"></th>
                {/* Phase 1: Regulatory Source */}
                <th className="py-3 px-3.5">
                  Phase 1: Regulatory Source
                </th>
                {/* Phase 2: The Obligation */}
                <th className="py-3 px-3.5">
                  Phase 2: The Obligation
                </th>
                {/* Phase 3: Internal Safeguards */}
                <th className="py-3 px-3.5">
                  Phase 3: Safeguards
                </th>
                {/* Phase 4: Operational Health */}
                <th className="py-3 px-3.5">
                  Phase 4: Operational Health
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3 px-3 text-center">
                      <div className="w-3.5 h-3.5 bg-slate-200 rounded mx-auto" />
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="h-3 bg-slate-200 rounded w-24 mb-1.5" />
                      <div className="h-2.5 bg-slate-100 rounded w-32" />
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="h-3 bg-slate-200 rounded w-48 mb-1.5" />
                      <div className="h-2.5 bg-slate-100 rounded w-64" />
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="h-3 bg-slate-200 rounded w-24 mb-1.5" />
                      <div className="h-2.5 bg-slate-100 rounded w-32" />
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="h-3 bg-slate-200 rounded w-20" />
                    </td>
                  </tr>
                ))
              ) : filteredObligations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-700">
                      No statutory obligations match the filter criteria
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Try clearing search parameters or adjusting filter criteria
                    </p>
                  </td>
                </tr>
              ) : (
                filteredObligations.map((obl) => {
                  const isStarred = starredIds.has(obl.internalId);

                  // 6px status dot mapping
                  let dotColor = 'bg-slate-400';
                  let statusLabel = 'Unmapped';
                  switch (obl.phase4Health.effectivenessStatus) {
                    case 'EFFECTIVE':
                      dotColor = 'bg-emerald-500';
                      statusLabel = 'Effective';
                      break;
                    case 'NEEDS_REVIEW':
                      dotColor = 'bg-amber-500';
                      statusLabel = 'Needs Review';
                      break;
                    case 'CRITICAL_GAP':
                      dotColor = 'bg-rose-500';
                      statusLabel = 'Critical Gap';
                      break;
                    case 'UNMAPPED':
                    default:
                      dotColor = 'bg-slate-400';
                      statusLabel = 'Unmapped';
                      break;
                  }

                  const isOrphan = obl.phase4Health.isOrphan;

                  return (
                    <tr
                      key={obl.internalId}
                      onClick={() => handleOpenDrawer(obl)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      {/* Star */}
                      <td
                        className="py-3 px-3 text-center"
                        onClick={(e) => handleToggleStarLocal(obl.internalId, e)}
                      >
                        <Star
                          className={`w-3.5 h-3.5 text-slate-300 hover:text-amber-500 transition-colors ${
                            isStarred ? 'text-amber-500 fill-amber-500' : ''
                          }`}
                        />
                      </td>

                      {/* Phase 1: Regulatory Source */}
                      <td className="py-3 px-3.5 max-w-[210px]">
                        <div className="font-mono text-xs font-semibold text-slate-800">
                          {obl.phase1Source.regulator}
                        </div>
                        <div className="font-mono text-xs text-slate-600 line-clamp-1 mt-0.5">
                          {obl.phase1Source.statutoryCitation}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {obl.phase1Source.sectionHeading}
                        </div>
                      </td>

                      {/* Phase 2: The Obligation */}
                      <td className="py-3 px-3.5 max-w-[340px]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {obl.phase2Obligation.humanId}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            · {obl.phase2Obligation.obligationType.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="font-medium text-slate-900 group-hover:text-slate-800 line-clamp-2 mt-0.5">
                          {obl.phase2Obligation.atomicRequirement}
                        </div>
                        {obl.phase2Obligation.statutoryTimelineText && (
                          <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                            Timeline: {obl.phase2Obligation.statutoryTimelineText}
                          </div>
                        )}
                      </td>

                      {/* Phase 3: Internal Safeguards */}
                      <td className="py-3 px-3.5 max-w-[220px]">
                        {isOrphan ? (
                          <div className="text-rose-700 font-medium text-xs flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>Unmapped (Orphan)</span>
                          </div>
                        ) : (
                          <div>
                            <div className="font-mono text-xs font-semibold text-slate-800">
                              {obl.phase3Safeguards.controlId}
                            </div>
                            <div className="font-mono text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                              {obl.phase3Safeguards.policyId || 'Internal Policy'}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {obl.phase3Safeguards.custodianRole}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Phase 4: Operational Health */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                            <span>{statusLabel}</span>
                          </span>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {obl.phase4Health.evidenceStatus === 'VERIFIED'
                              ? 'Verified Dossier'
                              : obl.phase4Health.evidenceStatus === 'PENDING_AUDIT'
                              ? 'Pending Audit'
                              : 'Missing Evidence'}
                          </div>
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

      {/* ────────────────────────────────────────────────────────────────────
          5. OBLIGATION DETAIL SLIDE-OVER DRAWER
          ──────────────────────────────────────────────────────────────────── */}
      <ObligationDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        obligation={activeObligation}
        instrument={instrument || null}
        onUpdateControlMapping={handleUpdateControlMapping}
        onUpdateOverride={onUpdateObligationOverride}
        onToggleStar={onToggleStar}
      />
    </div>
  );
}
