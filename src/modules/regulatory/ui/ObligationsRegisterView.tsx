'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Filter,
  Star,
  MoreHorizontal,
  ChevronRight,
  FileText,
  User,
  CheckCircle2,
  AlertCircle,
  Layers,
  Check,
  Copy,
} from 'lucide-react';
import {
  RegulatoryInstrumentPresentation,
  StatutorySection,
  DecomposedObligationPresentation,
} from '../types';
import { ObligationDetailDrawer } from './ObligationDetailDrawer';

interface ObligationsRegisterViewProps {
  instrument: RegulatoryInstrumentPresentation;
  sections: StatutorySection[];
  isLoading: boolean;
  onBack: () => void;
  onUpdateObligationOverride: (
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
}

export function ObligationsRegisterView({
  instrument,
  sections,
  isLoading,
  onBack,
  onUpdateObligationOverride,
  onToggleStar,
}: ObligationsRegisterViewProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedRuleNature, setSelectedRuleNature] = useState<string>('ALL');
  const [activeObligation, setActiveObligation] = useState<DecomposedObligationPresentation | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Flatten all obligations across sections
  const allObligations: DecomposedObligationPresentation[] = useMemo(() => {
    const list: DecomposedObligationPresentation[] = [];
    for (const sec of sections) {
      if (sec.obligations) {
        for (const obl of sec.obligations) {
          list.push(obl);
        }
      }
    }
    return list;
  }, [sections]);

  // Filter obligations
  const filteredObligations = useMemo(() => {
    let result = allObligations;

    if (selectedSectionId !== 'ALL') {
      result = result.filter((o) => o.clauseId === selectedSectionId || o.sectionReference.includes(selectedSectionId));
    }

    if (selectedStatus !== 'ALL') {
      result = result.filter((o) => o.status === selectedStatus);
    }

    if (selectedRuleNature !== 'ALL') {
      result = result.filter((o) => o.ruleNature === selectedRuleNature);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.title.toLowerCase().includes(q) ||
          o.summary.toLowerCase().includes(q) ||
          o.sectionReference.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allObligations, selectedSectionId, selectedStatus, selectedRuleNature, searchQuery]);

  const handleOpenDrawer = (obl: DecomposedObligationPresentation) => {
    setActiveObligation(obl);
    setIsDrawerOpen(true);
  };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleRelevance = async (obl: DecomposedObligationPresentation, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = obl.status === 'NOT_APPLICABLE' ? 'PENDING_REVIEW' : 'NOT_APPLICABLE';
    await onUpdateObligationOverride(obl.id, {
      status: newStatus,
      assignedOwner: obl.targetRole,
    });
  };

  const renderStatus = (status: string) => {
    let dotColor = 'bg-slate-400';
    let label = 'Pending Review';

    switch (status) {
      case 'ADEQUATELY_MET':
        dotColor = 'bg-emerald-500';
        label = 'Adequately Met';
        break;
      case 'PARTIALLY_MET':
        dotColor = 'bg-amber-500';
        label = 'Partially Met';
        break;
      case 'GAP_DETECTED':
        dotColor = 'bg-rose-500';
        label = 'Gap Detected';
        break;
      case 'NOT_APPLICABLE':
        dotColor = 'bg-slate-400';
        label = 'Not Applicable';
        break;
      case 'PENDING_REVIEW':
      default:
        dotColor = 'bg-slate-500';
        label = 'Pending Review';
        break;
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 whitespace-nowrap">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span>{label}</span>
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {instrument.shortTitle}</span>
          </button>
          <span>/</span>
          <span className="font-semibold text-slate-900">
            Statutory Obligations Register
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
          <span>{allObligations.length} Total Obligations</span>
          <span>·</span>
          <span>{sections.length} Sections</span>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search obligations or section codes..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="ALL">All Review Statuses</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="ADEQUATELY_MET">Adequately Met</option>
            <option value="PARTIALLY_MET">Partially Met</option>
            <option value="GAP_DETECTED">Gap Detected</option>
            <option value="NOT_APPLICABLE">Not Applicable</option>
          </select>

          {/* Rule Nature Filter */}
          <select
            value={selectedRuleNature}
            onChange={(e) => setSelectedRuleNature(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="ALL">All Rule Natures</option>
            <option value="Prescriptive">Prescriptive</option>
            <option value="Risk Based">Risk Based</option>
            <option value="Policy Applicable">Policy Applicable</option>
            <option value="Mandatory Disclosure">Mandatory Disclosure</option>
          </select>
        </div>
      </div>

      {/* 3. Main Split View: Left TOC Tree & Right Obligations Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">
        {/* Left Column: Table of Contents / Sections Tree */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-3 bg-slate-50/75 border-b border-slate-200 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Statutory Sections
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {sections.length}
            </span>
          </div>

          <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100 text-xs">
            {/* All Sections Button */}
            <button
              type="button"
              onClick={() => setSelectedSectionId('ALL')}
              className={`w-full p-3 text-left transition-colors flex items-center justify-between ${
                selectedSectionId === 'ALL'
                  ? 'bg-slate-900 text-white font-medium'
                  : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span>All Sections</span>
              <span
                className={`font-mono text-[10px] px-1.5 py-0.2 rounded ${
                  selectedSectionId === 'ALL'
                    ? 'bg-slate-800 text-slate-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {allObligations.length}
              </span>
            </button>

            {sections.map((sec) => {
              const isSelected = selectedSectionId === sec.id || selectedSectionId === sec.sectionReference;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSelectedSectionId(sec.id)}
                  className={`w-full p-3 text-left transition-colors flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div
                      className={`font-mono text-[11px] ${
                        isSelected ? 'text-slate-300 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {sec.sectionReference}
                    </div>
                    <div
                      className={`line-clamp-2 text-xs ${
                        isSelected ? 'text-white font-medium' : 'text-slate-900'
                      }`}
                    >
                      {sec.sectionHeading}
                    </div>
                  </div>

                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded shrink-0 ${
                      isSelected
                        ? 'bg-slate-800 text-slate-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {sec.obligations?.length || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Obligations Master Table */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3.5 w-8 text-center"></th>
                  <th className="py-3 px-3.5">Obligation ID</th>
                  <th className="py-3 px-3.5">Nature</th>
                  <th className="py-3 px-3.5">Substantive Duty</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Assignee</th>
                  <th className="py-3 px-3.5 text-center">Relevance</th>
                  <th className="py-3 px-3.5 w-10 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-3 px-3.5 text-center">
                        <div className="w-3.5 h-3.5 bg-slate-200 rounded mx-auto" />
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="h-3 bg-slate-200 rounded w-24" />
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="h-3 bg-slate-200 rounded w-16" />
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="space-y-1">
                          <div className="h-3 bg-slate-200 rounded w-3/4" />
                          <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="h-3 bg-slate-200 rounded w-20" />
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="h-3 bg-slate-200 rounded w-16" />
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <div className="w-6 h-3 bg-slate-200 rounded mx-auto" />
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <div className="w-4 h-4 bg-slate-200 rounded ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredObligations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-medium text-slate-600">
                        No statutory obligations found
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Try selecting another section or adjusting filter criteria
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredObligations.map((obl) => {
                    const initials = (obl.targetRole || 'CCO')
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <tr
                        key={obl.id}
                        onClick={() => handleOpenDrawer(obl)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                      >
                        {/* Star */}
                        <td
                          className="py-3 px-3.5 text-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onToggleStar) onToggleStar(obl.id);
                          }}
                        >
                          <Star
                            className={`w-3.5 h-3.5 text-slate-300 hover:text-amber-500 transition-colors ${
                              obl.isStarred ? 'text-amber-400 fill-amber-400' : ''
                            }`}
                          />
                        </td>

                        {/* ID */}
                        <td className="py-3 px-3.5 font-mono text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                          {obl.id}
                        </td>

                        {/* Nature */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {obl.ruleNature || 'Prescriptive'}
                          </span>
                        </td>

                        {/* Substantive Duty */}
                        <td className="py-3 px-3.5">
                          <div className="font-medium text-slate-900 group-hover:text-slate-800 line-clamp-1">
                            {obl.title || obl.summary}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-mono">
                            {obl.sectionReference} &ndash; {obl.summary}
                          </div>
                        </td>

                        {/* Review Status */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {renderStatus(obl.status)}
                        </td>

                        {/* Assignee */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono text-[9px] flex items-center justify-center font-bold">
                              {initials}
                            </div>
                            <span className="text-[11px] text-slate-600 truncate max-w-[90px]">
                              {obl.targetRole}
                            </span>
                          </div>
                        </td>

                        {/* Relevance Switch */}
                        <td
                          className="py-3 px-3.5 text-center"
                          onClick={(e) => handleToggleRelevance(obl, e)}
                        >
                          <input
                            type="checkbox"
                            checked={obl.status !== 'NOT_APPLICABLE'}
                            onChange={() => {}}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                          />
                        </td>

                        {/* Actions */}
                        <td
                          className="py-3 px-3.5 text-right relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(obl.id, e)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Copy Obligation ID"
                          >
                            {copiedId === obl.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>
              Showing {filteredObligations.length} of {allObligations.length} Decomposed Obligations
            </span>
            <span>Deterministic Clause Concordance</span>
          </div>
        </div>
      </div>

      {/* 4. Slide-Over Obligation Detail Drawer */}
      <ObligationDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        obligation={activeObligation}
        instrument={instrument}
        onUpdateOverride={async (id, override) => {
          await onUpdateObligationOverride(id, override);
          // Update active obligation local state
          if (activeObligation && activeObligation.id === id) {
            setActiveObligation({
              ...activeObligation,
              status: (override.status as any) || activeObligation.status,
              targetRole: override.assignedOwner || activeObligation.targetRole,
              userOverride: {
                ...activeObligation.userOverride,
                status: (override.status as any) || activeObligation.status,
                assignedOwner: override.assignedOwner || activeObligation.targetRole,
                internalNotes: override.internalNotes || '',
                internalSopCitation: override.internalSopCitation || '',
                verifiedCriteriaIds: override.verifiedCriteriaIds || [],
              },
            });
          }
        }}
        onToggleStar={onToggleStar}
      />
    </div>
  );
}
