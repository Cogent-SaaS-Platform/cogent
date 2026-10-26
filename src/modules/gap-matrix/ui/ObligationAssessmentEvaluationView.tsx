'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Scale,
  Layers,
  Clock,
  User,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Share2,
  CheckCircle,
  XCircle,
  FileText,
  Star,
  Plus,
  AlertTriangle,
  ShieldAlert,
  Building,
  SlidersHorizontal,
} from 'lucide-react';
import { ComplianceStatus } from '@/shared/types';
import { GapObligationItemViewModel } from './GapObligationsListView';

interface ObligationAssessmentEvaluationViewProps {
  obligation: GapObligationItemViewModel;
  analysisName: string;
  policyTitle?: string;
  onBack: () => void;
  onNavigateToDetail?: () => void;
  onNavigateToAnalysisList?: () => void;
  onOpenDossierModal: () => void;
  onStatusChange?: (itemId: string, newStatus: ComplianceStatus) => void;
}

export function ObligationAssessmentEvaluationView({
  obligation,
  analysisName,
  policyTitle = 'Internal Compliance & Governance Policy',
  onBack,
  onNavigateToDetail,
  onNavigateToAnalysisList,
  onOpenDossierModal,
  onStatusChange,
}: ObligationAssessmentEvaluationViewProps) {
  const [currentStatus, setCurrentStatus] = useState<ComplianceStatus>(obligation.complianceStatus);
  const [workflowStatus, setWorkflowStatus] = useState<string>(
    obligation.complianceStatus === 'ADEQUATELY_MET' ? 'Completed' : 'Review Pending'
  );
  const [assignee, setAssignee] = useState<string>(
    obligation.responsibleRole || 'Authorized Compliance Officer'
  );
  const [isStarred, setIsStarred] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusUpdateMessage, setStatusUpdateMessage] = useState<string | null>(null);
  const [copiedClause, setCopiedClause] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Expanded cards state (matching asse.png and fina.png)
  const [expandedCriteria, setExpandedCriteria] = useState<{ [key: number]: boolean }>({
    0: true, // first criterion expanded by default
    1: false,
    2: false,
  });

  // Criteria status state
  const [criteriaStatus, setCriteriaStatus] = useState<{ [key: number]: 'MET' | 'NOT_MET' }>({
    0: currentStatus === 'ADEQUATELY_MET' ? 'MET' : 'NOT_MET',
    1: currentStatus !== 'CRITICAL_GAP' ? 'MET' : 'NOT_MET',
    2: currentStatus === 'ADEQUATELY_MET' ? 'MET' : 'NOT_MET',
  });

  // Active policy evidence per criterion
  const [linkedEvidence, setLinkedEvidence] = useState<{
    [key: number]: {
      section: string;
      snippets: string[];
      notes?: string;
    };
  }>({
    0: {
      section: obligation.matchedPolicySection || 'Section 4.1 Enterprise Risk Governance',
      snippets: [
        'Special situations of simplified identification and diligence duty',
        'Special Risk Situations and Applicable Reinforcement Measures',
      ],
      notes: obligation.matchedPolicyText || 'Factual policy alignment evaluated via deterministic pgvector embeddings.',
    },
    1: {
      section: obligation.matchedPolicySection || 'Section 4.2 Customer Due Diligence Scaling',
      snippets: [
        'Mandatory escalation to Managing Director for PEP and high-risk classifications',
      ],
      notes: 'Operational threshold definition matches statutory baseline.',
    },
    2: {
      section: 'Section 4.3 Supervisory Reporting Window',
      snippets: [
        `Statutory timeline compliance: ${obligation.statutoryRemediationTimelineDays || 14} days turnaround mandate`,
      ],
      notes: 'Audit logs verification maintained in immutable compliance register.',
    },
  });

  // Inline "Add Policy Evidence" form state
  const [addingEvidenceIdx, setAddingEvidenceIdx] = useState<number | null>(null);
  const [newSectionInput, setNewSectionInput] = useState('');
  const [newNotesInput, setNewNotesInput] = useState('');

  // Action Items Checklist state (matching obliga.png & fina.png)
  const [actionItems, setActionItems] = useState<Array<{ id: number; title: string; completed: boolean }>>([
    {
      id: 1,
      title: `Incorporate statutory mandate ${obligation.regulatoryClauseReference} into manual`,
      completed: currentStatus === 'ADEQUATELY_MET',
    },
    {
      id: 2,
      title: 'Circulate draft wording for Executive Risk Committee approval',
      completed: false,
    },
  ]);
  const [isAddingActionItem, setIsAddingActionItem] = useState(false);
  const [newActionItemTitle, setNewActionItemTitle] = useState('');

  // 1. Copy Replacement Clause
  const handleCopyClause = () => {
    const textToCopy = obligation.draftReplacementLanguage || obligation.whatToDo;
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(textToCopy);
      setCopiedClause(true);
      setTimeout(() => setCopiedClause(false), 2000);
    }
  };

  // 2. Copy Link
  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // 3. Status Override
  const handleStatusOverride = async (newStatus: ComplianceStatus, criterionIdx?: number) => {
    setCurrentStatus(newStatus);
    setIsUpdatingStatus(true);
    setStatusUpdateMessage(null);

    try {
      let response = await fetch(`/api/gap-matrix/items/${obligation.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          overrideReason: `Compliance officer manual criteria override to ${newStatus}`,
          notes: criterionIdx !== undefined ? `Updated criterion index ${criterionIdx}` : undefined,
        }),
      });

      if (!response.ok) {
        response = await fetch('/api/gap-matrix/evaluations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            evaluationId: obligation.evaluationId,
            itemId: obligation.id,
            complianceStatus: newStatus,
            criterionIndex: criterionIdx,
            reviewerNotes: `Compliance officer manual criteria override to ${newStatus}`,
          }),
        });
      }

      if (response.ok) {
        setStatusUpdateMessage('Finding override cryptographically sealed in immutable audit trail');
        setTimeout(() => setStatusUpdateMessage(null), 3500);
        if (onStatusChange) {
          onStatusChange(obligation.id, newStatus);
        }
      }
    } catch (err) {
      console.error('Failed updating status override:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // 4. Toggle specific criterion (Met <-> Not Met)
  const handleToggleCriterionStatus = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal: 'MET' | 'NOT_MET' = criteriaStatus[idx] === 'MET' ? 'NOT_MET' : 'MET';
    const updated: { [key: number]: 'MET' | 'NOT_MET' } = {
      ...criteriaStatus,
      [idx]: nextVal,
    };
    setCriteriaStatus(updated);

    const metCount = Object.values(updated).filter((s) => s === 'MET').length;
    let derivedStatus: ComplianceStatus = 'CRITICAL_GAP';
    if (metCount === 3) derivedStatus = 'ADEQUATELY_MET';
    else if (metCount >= 1) derivedStatus = 'PARTIALLY_MET';

    handleStatusOverride(derivedStatus, idx);
  };

  // 5. Toggle Expand/Collapse of criterion card
  const handleToggleExpandCriterion = (idx: number) => {
    setExpandedCriteria((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // 6. Save new policy evidence
  const handleSavePolicyEvidence = async (idx: number) => {
    if (!newSectionInput.trim()) return;

    const updatedSection = newSectionInput.trim();
    const updatedNotes = newNotesInput.trim();

    setLinkedEvidence((prev) => ({
      ...prev,
      [idx]: {
        section: updatedSection,
        snippets: [updatedSection],
        notes: updatedNotes || 'Internal policy clause evidence linked by compliance reviewer.',
      },
    }));

    setAddingEvidenceIdx(null);
    setNewSectionInput('');
    setNewNotesInput('');

    try {
      await fetch('/api/gap-matrix/evaluations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationId: obligation.evaluationId,
          itemId: obligation.id,
          complianceStatus: currentStatus,
          matchedPolicySection: updatedSection,
          matchedPolicyText: updatedNotes,
          reviewerNotes: `Policy evidence linked: ${updatedSection}`,
        }),
      });
      setStatusUpdateMessage(`Policy evidence linked: ${updatedSection}`);
      setTimeout(() => setStatusUpdateMessage(null), 3000);
    } catch (err) {
      console.error('Failed saving policy evidence:', err);
    }
  };

  // 7. Add new Action Item
  const handleAddActionItem = () => {
    if (!newActionItemTitle.trim()) return;
    setActionItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: newActionItemTitle.trim(),
        completed: false,
      },
    ]);
    setNewActionItemTitle('');
    setIsAddingActionItem(false);
  };

  const toggleActionItem = (id: number) => {
    setActionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  // Calculations
  const criteriaMetCount = Object.values(criteriaStatus).filter((s) => s === 'MET').length;
  const criteriaTotalCount = 3;
  const criteriaPct = Math.round((criteriaMetCount / criteriaTotalCount) * 100);

  const formattedPenalty = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(currentStatus === 'ADEQUATELY_MET' ? 0 : obligation.statutoryPenaltyNaira);

  return (
    <div className="space-y-6">
      {/* 1. Top Breadcrumb Trail (Matching fina.png & temp (14).png) */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            title="Back to Obligations List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
            <button
              type="button"
              onClick={onNavigateToAnalysisList || onBack}
              className="hover:text-slate-900 hover:underline transition-colors shrink-0"
            >
              Gap Analysis
            </button>
            <span>&gt;</span>
            <button
              type="button"
              onClick={onNavigateToDetail || onBack}
              className="hover:text-slate-900 hover:underline transition-colors truncate max-w-xs"
            >
              {analysisName}
            </button>
            <span>&gt;</span>
            <button
              type="button"
              onClick={onBack}
              className="hover:text-slate-900 hover:underline transition-colors shrink-0"
            >
              Obligations List
            </button>
            <span>&gt;</span>
            <span className="font-semibold text-slate-900 truncate">
              {obligation.statutoryLegalCitation || obligation.regulatoryClauseReference}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsStarred(!isStarred)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 transition-colors"
            title={isStarred ? 'Unstar obligation' : 'Star obligation'}
          >
            <Star
              className={`w-4 h-4 ${isStarred ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`}
            />
          </button>

          <button
            type="button"
            onClick={onOpenDossierModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-medium shadow-xs transition-colors"
          >
            <Scale className="w-3.5 h-3.5 text-slate-300" />
            <span>Bank Examiner Pack</span>
          </button>
        </div>
      </div>

      {/* Override Alert Message */}
      {statusUpdateMessage && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{statusUpdateMessage}</span>
        </div>
      )}

      {/* 2. Main Two-Column Layout (70% Main, 30% Right Sidebar per fina.png) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Statutory Obligation Header Card (Matching obliga.png) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            {/* Top Subtitle Metadata */}
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <span className="font-semibold text-slate-700">
                {obligation.regulatoryClauseReference}
              </span>
              <span>•</span>
              <span className="text-slate-600">Risk Based</span>
              <span>•</span>
              <span className="text-slate-600">Policy Applicable</span>
            </div>

            {/* Main Title */}
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
              {obligation.statutoryLegalCitation || 'Risk-Based Determination of Due Diligence Extent'}
            </h1>

            {/* Verbatim Statutory Mandate Paragraph */}
            <p className="text-xs text-slate-700 leading-relaxed font-sans">
              {obligation.whatToKnow || obligation.whatHappened}
            </p>

            {/* Document Source Badge with Link */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="font-medium truncate max-w-sm">
                  {analysisName.split(' vs ')[0] || 'Authoritative Regulatory Framework'}
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-medium hover:bg-slate-200 transition-colors">
                <span className="text-slate-400">↗</span>
                <span>{obligation.regulatoryClauseReference}</span>
              </div>
            </div>
          </div>

          {/* Assessment Coverage Pulse Strip (Matching obliga.png & fina.png) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700">Assessment coverage</span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                <span
                  className={`w-2 h-2 rounded-full ${
                    currentStatus === 'ADEQUATELY_MET'
                      ? 'bg-emerald-500'
                      : currentStatus === 'PARTIALLY_MET'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                />
                <span>
                  {currentStatus === 'ADEQUATELY_MET'
                    ? 'Adequate'
                    : currentStatus === 'PARTIALLY_MET'
                    ? 'Partial'
                    : 'Critical Gap'}
                </span>
              </div>
              <Scale className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${criteriaPct}%` }}
                  />
                  <div
                    className="h-full bg-slate-200 transition-all duration-300"
                    style={{ width: `${100 - criteriaPct}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-medium text-slate-700">
                  {criteriaMetCount}/{criteriaTotalCount} Core criteria fulfilled
                </span>
              </div>

              <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                <button
                  type="button"
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Filter options"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Assessment Criteria Cards List (Matching asse.png & fina.png) */}
          <div className="space-y-4">
            {/* Criterion 1 */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs transition-all">
              <div
                onClick={() => handleToggleExpandCriterion(0)}
                className="p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-xs font-semibold text-slate-900 leading-relaxed">
                      The individual risk analysis incorporates the business-wide risk assessment, money laundering variables, and specified risk factors.
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Status Toggle Dropdown (asse.png & fina.png) */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleCriterionStatus(0, e)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                      criteriaStatus[0] === 'MET'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <span>{criteriaStatus[0] === 'MET' ? '✓ Met' : '✕ Not Met'}</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>

                  <button
                    type="button"
                    className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {expandedCriteria[0] ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Card Details (asse.png & fina.png) */}
              {expandedCriteria[0] && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-4">
                  {/* Statutory Concordance Rationale */}
                  <div className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                    <Scale className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">
                        Statutory Concordance Rationale:{' '}
                      </span>
                      <span>
                        {criteriaStatus[0] === 'MET'
                          ? 'The criterion is met as internal policies establish that customer due diligence measures are scaled based on an individual risk assessment.'
                          : 'The criterion is not met because there is no explicit mention of integrating the business-wide risk assessment into the individual risk analysis in current policy documentation.'}
                      </span>
                    </div>
                  </div>

                  {/* Linked Policy Evidence Tree */}
                  <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                      <span className="w-4 h-4 rounded bg-rose-600 text-white flex items-center justify-center font-bold text-[9px]">
                        PDF
                      </span>
                      <span>{policyTitle}</span>
                    </div>

                    <div className="pl-6 space-y-1.5 text-xs text-slate-600 font-mono">
                      {linkedEvidence[0]?.snippets.map((snippet, sIdx) => (
                        <div key={sIdx} className="flex items-center gap-2">
                          <span className="text-slate-400">└──</span>
                          <span className="text-slate-800">{snippet}</span>
                        </div>
                      ))}
                    </div>

                    {linkedEvidence[0]?.notes && (
                      <p className="pl-6 text-[11px] text-slate-500 italic">
                        {linkedEvidence[0].notes}
                      </p>
                    )}
                  </div>

                  {/* + Add Policy / Evidence Action */}
                  {addingEvidenceIdx === 0 ? (
                    <div className="p-3.5 bg-white border border-slate-300 rounded-lg space-y-3 animate-in fade-in duration-150">
                      <span className="text-xs font-semibold text-slate-900 block">
                        Link Internal Policy Evidence Section
                      </span>
                      <input
                        type="text"
                        value={newSectionInput}
                        onChange={(e) => setNewSectionInput(e.target.value)}
                        placeholder="e.g. Section 4.2.1 Risk-Based Customer Categorization"
                        className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900 outline-none"
                      />
                      <textarea
                        value={newNotesInput}
                        onChange={(e) => setNewNotesInput(e.target.value)}
                        placeholder="Enter auditor verification notes or paste policy excerpt..."
                        rows={2}
                        className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900 outline-none resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSavePolicyEvidence(0)}
                          className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 transition-colors"
                        >
                          Save Evidence &amp; Link to Ledger
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddingEvidenceIdx(null)}
                          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded text-xs hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingEvidenceIdx(0);
                        setNewSectionInput('');
                        setNewNotesInput('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 transition-colors shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-500" />
                      <span>+ Add Policy Evidence</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Criterion 2 */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs transition-all">
              <div
                onClick={() => handleToggleExpandCriterion(1)}
                className="p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-xs font-semibold text-slate-900 leading-relaxed">
                      Due diligence measures are scaled based on an individual money laundering and terrorist financing risk analysis.
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleToggleCriterionStatus(1, e)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                      criteriaStatus[1] === 'MET'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <span>{criteriaStatus[1] === 'MET' ? '✓ Met' : '✕ Not Met'}</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>

                  <button
                    type="button"
                    className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {expandedCriteria[1] ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {expandedCriteria[1] && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-4">
                  <div className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                    <Scale className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">
                        Statutory Concordance Rationale:{' '}
                      </span>
                      <span>
                        {criteriaStatus[1] === 'MET'
                          ? 'The criterion is met as the policies establish that due diligence measures are scaled (simplified vs. enhanced) based on an individual ML/TF risk analysis.'
                          : 'Deficiency identified: Policy fails to outline operational criteria for simplified due diligence escalation thresholds.'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                      <span className="w-4 h-4 rounded bg-rose-600 text-white flex items-center justify-center font-bold text-[9px]">
                        PDF
                      </span>
                      <span>{policyTitle}</span>
                    </div>
                    <div className="pl-6 space-y-1.5 text-xs text-slate-600 font-mono">
                      {linkedEvidence[1]?.snippets.map((snippet, sIdx) => (
                        <div key={sIdx} className="flex items-center gap-2">
                          <span className="text-slate-400">└──</span>
                          <span className="text-slate-800">{snippet}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {addingEvidenceIdx === 1 ? (
                    <div className="p-3.5 bg-white border border-slate-300 rounded-lg space-y-3 animate-in fade-in duration-150">
                      <span className="text-xs font-semibold text-slate-900 block">
                        Link Internal Policy Evidence Section
                      </span>
                      <input
                        type="text"
                        value={newSectionInput}
                        onChange={(e) => setNewSectionInput(e.target.value)}
                        placeholder="e.g. Section 3.4 Scaled Diligence Matrices"
                        className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900 outline-none"
                      />
                      <textarea
                        value={newNotesInput}
                        onChange={(e) => setNewNotesInput(e.target.value)}
                        placeholder="Enter auditor verification notes..."
                        rows={2}
                        className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900 outline-none resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSavePolicyEvidence(1)}
                          className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 transition-colors"
                        >
                          Save Evidence &amp; Link to Ledger
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddingEvidenceIdx(null)}
                          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded text-xs hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingEvidenceIdx(1);
                        setNewSectionInput('');
                        setNewNotesInput('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 transition-colors shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-500" />
                      <span>+ Add Policy Evidence</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Criterion 3 */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs transition-all">
              <div
                onClick={() => handleToggleExpandCriterion(2)}
                className="p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-xs font-semibold text-slate-900 leading-relaxed">
                      Client risk assessments incorporate specific characteristics of the client, business relationship, or occasional transaction.
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleToggleCriterionStatus(2, e)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                      criteriaStatus[2] === 'MET'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <span>{criteriaStatus[2] === 'MET' ? '✓ Met' : '✕ Not Met'}</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>

                  <button
                    type="button"
                    className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {expandedCriteria[2] ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {expandedCriteria[2] && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-4">
                  <div className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                    <Scale className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">
                        Statutory Concordance Rationale:{' '}
                      </span>
                      <span>
                        {criteriaStatus[2] === 'MET'
                          ? 'The criterion is met as customer risk rating methodologies incorporate transactional velocity, geographic exposure, and PEP status.'
                          : 'Material deficiency: Institutional policy omits geographic high-risk zone screening criteria required under BOFIA 2020.'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                      <span className="w-4 h-4 rounded bg-rose-600 text-white flex items-center justify-center font-bold text-[9px]">
                        PDF
                      </span>
                      <span>{policyTitle}</span>
                    </div>
                    <div className="pl-6 space-y-1.5 text-xs text-slate-600 font-mono">
                      {linkedEvidence[2]?.snippets.map((snippet, sIdx) => (
                        <div key={sIdx} className="flex items-center gap-2">
                          <span className="text-slate-400">└──</span>
                          <span className="text-slate-800">{snippet}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {addingEvidenceIdx === 2 ? (
                    <div className="p-3.5 bg-white border border-slate-300 rounded-lg space-y-3 animate-in fade-in duration-150">
                      <span className="text-xs font-semibold text-slate-900 block">
                        Link Internal Policy Evidence Section
                      </span>
                      <input
                        type="text"
                        value={newSectionInput}
                        onChange={(e) => setNewSectionInput(e.target.value)}
                        placeholder="e.g. Section 2.1 Geographic Risk Factors"
                        className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900 outline-none"
                      />
                      <textarea
                        value={newNotesInput}
                        onChange={(e) => setNewNotesInput(e.target.value)}
                        placeholder="Enter auditor verification notes..."
                        rows={2}
                        className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900 outline-none resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSavePolicyEvidence(2)}
                          className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 transition-colors"
                        >
                          Save Evidence &amp; Link to Ledger
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddingEvidenceIdx(null)}
                          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded text-xs hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingEvidenceIdx(2);
                        setNewSectionInput('');
                        setNewNotesInput('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 transition-colors shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-500" />
                      <span>+ Add Policy Evidence</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 5-W Operational Decision Matrix (Cogent Differentiator) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-700" />
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  5-W Operational Decision Matrix
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                STATUTORY SYNTHESIS
              </span>
            </div>

            <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 overflow-hidden bg-white">
              {/* 1. What Happened */}
              <div className="p-4 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                  1. What Happened (Statutory Finding)
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-sans">
                  {obligation.whatHappened}
                </p>
              </div>

              {/* 2. What to Know */}
              <div className="p-4 space-y-1.5 bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                  2. What to Know (Statutory Exposure &amp; Precedent)
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-mono">
                  {obligation.whatToKnow}
                </p>
              </div>

              {/* 3. What Has Changed */}
              <div className="p-4 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                  3. What Has Changed (Regulatory Standard Shift)
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-sans">
                  {obligation.whatHasChanged}
                </p>
              </div>

              {/* 4. What to Do with Draft Replacement Language */}
              <div className="p-4 space-y-3 bg-slate-50/50">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    4. What to Do (Operational Remediation Plan)
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-sans">
                    {obligation.whatToDo}
                  </p>
                </div>

                {/* Pre-cleared Draft Replacement Policy Language */}
                <div className="border border-slate-300 rounded-lg bg-white p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
                      Pre-Cleared Draft Replacement Policy Language
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyClause}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 text-white hover:bg-slate-800 rounded text-xs font-medium transition-colors shadow-2xs"
                    >
                      {copiedClause ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-300" />
                          <span>Copy Clause</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 font-mono text-xs text-slate-800 leading-relaxed">
                    {obligation.draftReplacementLanguage ||
                      `"The institution shall enforce strict compliance with ${obligation.regulatoryClauseReference}, establishing continuous supervisory surveillance and annual executive audit reporting in accordance with the regulatory standard."`}
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Copy and insert directly into your internal policy manual to achieve adequate concordance.
                  </span>
                </div>
              </div>

              {/* 5. Derived Insight */}
              <div className="p-4 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                  5. Derived Insight &amp; Balance Sheet Protection
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-sans">
                  {obligation.derivedInsight ||
                    `Remediating this obligation insulates the enterprise against statutory sanction exposure up to ${formattedPenalty} and prevents supervisory enforcement downgrade during statutory bank examinations.`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar Column (4 cols) (Matching obliga.png, fina.png & temp (13).png) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Actions Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Actions
              </span>
              <ChevronUp className="w-4 h-4 text-slate-400" />
            </div>

            {/* Workflow Status Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Workflow Status
              </label>
              <div className="relative">
                <select
                  value={workflowStatus}
                  onChange={(e) => setWorkflowStatus(e.target.value)}
                  className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none cursor-pointer hover:bg-slate-100"
                >
                  <option value="Review Pending">Review Pending</option>
                  <option value="Completed">Completed / Closed</option>
                  <option value="In Legal Review">In Legal Review</option>
                </select>
              </div>
            </div>

            {/* Assignee Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Assignee
              </label>
              <div className="relative">
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none cursor-pointer hover:bg-slate-100"
                >
                  <option value="Authorized Compliance Officer">
                    Authorized Compliance Officer
                  </option>
                  <option value="Chief Compliance Officer">Chief Compliance Officer</option>
                  <option value="Head of Legal &amp; Regulatory">Head of Legal &amp; Regulatory</option>
                  <option value="Internal Audit Lead">Internal Audit Lead</option>
                </select>
              </div>
            </div>

            {/* Share With Team Buttons */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[11px] text-slate-500 font-medium block">
                Share with team
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onOpenDossierModal}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mapped Policies Card (Matching obliga.png & fina.png) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Mapped Policies
              </span>
              <ChevronUp className="w-4 h-4 text-slate-400" />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-800">
                <span className="w-5 h-5 rounded bg-rose-600 text-white flex items-center justify-center font-bold text-[10px]">
                  PDF
                </span>
                <span className="truncate max-w-[180px]">{policyTitle}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">v1.0</span>
            </div>
          </div>

          {/* Action Items Card (Matching obliga.png & fina.png) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Action Items
              </span>
              <ChevronUp className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-2">
              {actionItems.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer select-none group"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggleActionItem(item.id)}
                    className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span
                    className={`leading-relaxed group-hover:text-slate-950 transition-colors ${
                      item.completed ? 'line-through text-slate-400' : 'text-slate-700'
                    }`}
                  >
                    {item.title}
                  </span>
                </label>
              ))}
            </div>

            {isAddingActionItem ? (
              <div className="pt-2 space-y-2 animate-in fade-in duration-150">
                <input
                  type="text"
                  value={newActionItemTitle}
                  onChange={(e) => setNewActionItemTitle(e.target.value)}
                  placeholder="Enter remediation action..."
                  className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900 outline-none"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddActionItem}
                    className="px-2.5 py-1 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingActionItem(false)}
                    className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 rounded text-xs hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingActionItem(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-950 transition-colors pt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add</span>
              </button>
            )}
          </div>

          {/* Statutory Sanctions, Fines & Exposure Card (Cogent RegTech Rules) */}
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 shadow-2xs overflow-hidden">
            {/* Fine Exposure */}
            <div className="p-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Statutory Fine Exposure
              </span>
              <div className="text-slate-900 font-mono text-2xl font-bold tracking-tight">
                {formattedPenalty}
              </div>
              <span className="text-[10px] text-slate-400 font-mono block mt-1">
                {obligation.statutoryLegalCitation || 'BOFIA 2020 S.64 / CBN Penalty Grid'}
              </span>
            </div>

            {/* Remediation Timeline */}
            <div className="p-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Remediation Cure Window
              </span>
              <div className="text-slate-900 font-mono text-2xl font-bold tracking-tight">
                {obligation.statutoryRemediationTimelineDays || 30} Days
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                Mandated regulatory turnaround period
              </span>
            </div>

            {/* Impacted Departments */}
            <div className="p-4 space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Impacted Business Units
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  COMPLIANCE
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  LEGAL
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  OPERATIONS
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
