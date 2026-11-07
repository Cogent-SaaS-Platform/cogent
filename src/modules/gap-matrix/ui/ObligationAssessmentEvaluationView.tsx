'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  FileText,
  BookOpen,
  Copy,
  Check,
  CheckCircle,
  Plus,
  Scale,
  ShieldCheck,
  Star,
  ExternalLink,
  User,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import { ComplianceStatus } from '@/shared/types';
import { CriterionEvaluationResult } from '../services/multiConcordanceService';
import { SeniorCounselBriefing } from '../types';
import { ExecutiveMarkdownRenderer } from '@/shared/ui/ExecutiveMarkdownRenderer';

export interface ObligationGapInspectorItem {
  id: string;
  evaluationId: string;
  obligationTitle?: string;
  obligationCode?: string;
  obligationDescription?: string;
  regulatoryClauseReference: string;
  statutoryLegalCitation?: string;
  ruleType?: string;
  policyApplicability?: string;
  complianceStatus: ComplianceStatus;
  statutoryPenaltyNaira: number;
  whatHappened: string;
  whatToKnow: string;
  whatHasChanged: string;
  whatToDo: string;
  draftReplacementLanguage?: string;
  draftReplacementPolicyLanguage?: string;
  criteriaEvaluations?: CriterionEvaluationResult[];
  actionItems?: Array<{ id: string; title: string; completed: boolean; policyTitle?: string; assigneeName?: string }>;
  suggestedActionItem?: string;
  regulationTitle?: string;
  sourceSectionRef?: string;
  matchedPolicySection?: string | null;
  matchedPolicyText?: string | null;
  derivedInsight?: string;
  responsibleRole?: string;
  statutoryRemediationTimelineDays?: number;
  isStarred?: boolean;
  seniorCounselBriefing?: SeniorCounselBriefing;
}

interface ObligationAssessmentEvaluationViewProps {
  analysisName: string;
  obligation: ObligationGapInspectorItem;
  policyTitle?: string;
  initialAuditLogs?: Array<{ id: string; action: string; performedBy?: string; timestamp: string; details?: any }>;
  initialComments?: Array<{ id: string; authorName?: string; author?: string; authorRole?: string; role?: string; timestamp?: string; time?: string; content?: string; text?: string }>;
  onBack: () => void;
  onNavigateToAnalysisList?: () => void;
  onNavigateToDetail?: () => void;
  onStatusChange?: (itemId: string, newStatus: ComplianceStatus) => void;
  onOpenDossierModal?: () => void;
}

export function ObligationAssessmentEvaluationView({
  analysisName,
  obligation,
  policyTitle = 'Internal Compliance Manual',
  initialAuditLogs = [],
  initialComments = [],
  onBack,
  onNavigateToAnalysisList,
  onNavigateToDetail,
  onStatusChange,
  onOpenDossierModal,
}: ObligationAssessmentEvaluationViewProps) {
  const [currentStatus, setCurrentStatus] = useState<ComplianceStatus>(obligation.complianceStatus);
  const [copiedClause, setCopiedClause] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isStarred, setIsStarred] = useState(Boolean(obligation.isStarred));
  const [statusUpdateMessage, setStatusUpdateMessage] = useState<string | null>(null);

  // Criteria state (strictly grounded in real obligation criteriaEvaluations)
  const defaultCriteria: CriterionEvaluationResult[] = useMemo(() => {
    if (obligation.criteriaEvaluations && obligation.criteriaEvaluations.length > 0) {
      return obligation.criteriaEvaluations;
    }
    const oblTitle =
      obligation.obligationTitle || obligation.regulatoryClauseReference || 'Statutory Obligation';
    return [
      {
        id: `crit-${obligation.id}-1`,
        criterionText: oblTitle,
        criterionType: 'Core Criteria',
        status: obligation.complianceStatus === 'ADEQUATELY_MET' ? 'MET' : 'NOT_MET',
        aiReason:
          obligation.derivedInsight ||
          'Not explicitly specified in source text — link internal policy section evidence or re-run concordance evaluation.',
        matchedPolicySections: obligation.matchedPolicySection
          ? [
              {
                policyId: '',
                policyTitle,
                sectionNumber: obligation.matchedPolicySection,
                sectionTitle: obligation.matchedPolicySection,
                verbatimPolicyExcerpt:
                  obligation.matchedPolicyText || 'Not explicitly specified in source text',
              },
            ]
          : [],
      },
    ];
  }, [obligation, policyTitle]);

  const [criteria, setCriteria] = useState<CriterionEvaluationResult[]>(defaultCriteria);
  const [expandedCriteria, setExpandedCriteria] = useState<{ [key: number]: boolean }>({ 0: true, 1: true });
  const [activeOverrideDropdownIdx, setActiveOverrideDropdownIdx] = useState<number | null>(null);

  // Evidence Modal / Drawer state
  const [addingEvidenceIdx, setAddingEvidenceIdx] = useState<number | null>(null);
  const [newSectionInput, setNewSectionInput] = useState('');
  const [newNotesInput, setNewNotesInput] = useState('');
  const [isStatuteModalOpen, setIsStatuteModalOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<'BRIEFING' | 'CRITERIA' | 'CLAUSE'>('BRIEFING');
  const [copiedBriefing, setCopiedBriefing] = useState(false);

  const resolvedBriefing: SeniorCounselBriefing = useMemo(() => {
    if (obligation.seniorCounselBriefing && obligation.seniorCounselBriefing.briefingMarkdown) {
      return obligation.seniorCounselBriefing;
    }

    const oblTitle =
      obligation.obligationTitle || obligation.regulatoryClauseReference || 'Statutory Compliance Obligation';
    const regTitle = obligation.regulationTitle || analysisName.split(' vs ')[0] || 'Statutory Regulation';
    const sectionRef = obligation.sourceSectionRef || 'General Mandate';

    const isAdequate = currentStatus === 'ADEQUATELY_MET';
    const isPartial = currentStatus === 'PARTIALLY_MET';

    const executiveVerdict = isAdequate
      ? 'SUPERVISORY COMPLIANT'
      : isPartial
      ? 'DEFENSIBLE WITH NOTABLE OPERATIONAL EXPOSURES'
      : 'SUBSTANTIAL NON-COMPLIANCE RISK';

    const verdictSummary = isAdequate
      ? `Forensic policy concordance confirms internal operational manuals incorporate verified, enforceable controls satisfying statutory requirements for ${oblTitle} under ${regTitle}.`
      : isPartial
      ? `Internal operational procedures satisfy baseline statutory requirements under ${regTitle}. While baseline controls exist, procedural documentation omits formal escalation thresholds and audit verification triggers.`
      : `Comprehensive gap identified: internal company documentation entirely omits mandatory operational controls required under ${regTitle} (${sectionRef}). Zero verifiable safeguards were detected in the uploaded policy suite.`;

    const supervisoryContext =
      obligation.whatToKnow ||
      `Statutory oversight under ${regTitle} (${sectionRef}). Regulatory examiners prioritize affirmative documentation and active supervisory reporting to prevent unhedged institutional liabilities.`;

    const evidentiaryAnalysis =
      obligation.whatHappened ||
      (isAdequate
        ? `Forensic concordance confirms internal operating policies explicitly establish all mandatory governance gates, approval hierarchies, and reporting schedules cited in ${oblTitle}.`
        : `Cross-clause evidentiary concordance highlights missing procedural safeguards. Reliance on undocumented custom or verbal practice exposes the institution to severe supervisory sanctions.`);

    const strategicRemediation =
      obligation.whatToDo ||
      (isAdequate
        ? 'Maintain documented controls and retain quarterly audit execution artifacts for supervisory inspection.'
        : `Adopt the board-ready remediation clause into ${policyTitle} and institute timestamped governance exception reporting.`);

    const briefingMarkdown = `### Senior Regulatory Counsel Briefing: ${oblTitle}

> [!${isAdequate ? 'TIP' : isPartial ? 'WARNING' : 'CRITICAL'}]
> **Executive Legal Opinion**: ${verdictSummary}

#### 1. Statutory Intent & Supervisory Risk Exposure
Under **${regTitle}** (${sectionRef}), supervisory authorities require financial institutions to maintain explicit, demonstrable controls over **${oblTitle}**. During routine and targeted on-site examinations, regulatory inspection panels specifically inspect whether operational manuals contain unambiguous governance thresholds and verifiable audit documentation.

#### 2. Evidentiary Concordance & Gap Dissection
${evidentiaryAnalysis}

#### 3. Strategic Remediation Playbook for General Counsel & CCO
- **Policy Amendment**: Adopt the recommended draft remediation clause into the next executive governance revision cycle.
- **Examiner Defensibility**: Establish timestamped exception logs to demonstrate affirmative compliance during routine examination.
- **Board Reporting**: Disclose operational alignment status to the Board Audit & Risk Committee.`;

    return {
      executiveVerdict,
      verdictSummary,
      supervisoryContext,
      evidentiaryAnalysis,
      strategicRemediation,
      briefingMarkdown,
    };
  }, [obligation, currentStatus, analysisName, policyTitle]);

  const handleCopyBriefing = () => {
    navigator.clipboard.writeText(resolvedBriefing.briefingMarkdown);
    setCopiedBriefing(true);
    setTimeout(() => setCopiedBriefing(false), 2500);
  };

  // Action Items state
  const [actionItems, setActionItems] = useState<Array<{ id: string; title: string; completed: boolean }>>(
    obligation.actionItems && obligation.actionItems.length > 0
      ? obligation.actionItems.map((a, idx) => ({ id: a.id || String(idx), title: a.title, completed: Boolean(a.completed) }))
      : []
  );
  const [isAddingActionItem, setIsAddingActionItem] = useState(false);
  const [newActionItemTitle, setNewActionItemTitle] = useState('');

  // Comments & Audit Logs state (strictly DB-backed)
  const [comments, setComments] = useState<Array<{ id: string; author: string; role: string; time: string; text: string }>>(
    initialComments.map((c, idx) => ({
      id: c.id || String(idx),
      author: c.authorName || c.author || 'Authorized Compliance Officer',
      role: c.authorRole || c.role || 'Reviewer',
      time: c.timestamp
        ? new Date(c.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        : c.time || '',
      text: c.content || c.text || '',
    }))
  );
  const [auditLogs, setAuditLogs] = useState<
    Array<{ id: string; action: string; performedBy?: string; timestamp: string; details?: any }>
  >(initialAuditLogs);
  const [newCommentText, setNewCommentText] = useState('');
  const [activeTab, setActiveTab] = useState<'COMMENTS' | 'AUDIT_LOGS'>('COMMENTS');

  // Preview Modal for Verbatim Policy Excerpt
  const [previewExcerpt, setPreviewExcerpt] = useState<{ title: string; excerpt: string } | null>(null);

  // Reset criteria when obligation changes
  useEffect(() => {
    setCurrentStatus(obligation.complianceStatus);
    setCriteria(defaultCriteria);
    setActionItems(
      obligation.actionItems && obligation.actionItems.length > 0
        ? obligation.actionItems.map((a, idx) => ({ id: a.id || String(idx), title: a.title, completed: Boolean(a.completed) }))
        : []
    );
    setAuditLogs(initialAuditLogs);
    setComments(
      initialComments.map((c, idx) => ({
        id: c.id || String(idx),
        author: c.authorName || c.author || 'Authorized Compliance Officer',
        role: c.authorRole || c.role || 'Reviewer',
        time: c.timestamp
          ? new Date(c.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
          : c.time || '',
        text: c.content || c.text || '',
      }))
    );
  }, [obligation, defaultCriteria, initialAuditLogs, initialComments]);

  // Compute Core criteria fulfillment count
  const coreCriteria = criteria.filter((c) => c.criterionType === 'Core Criteria');
  const rollupBasis = coreCriteria.length > 0 ? coreCriteria : criteria;
  const totalCoreCount = rollupBasis.length || 1;
  const metCoreCount = rollupBasis.filter((c) => c.status === 'MET').length;
  const corePct = Math.round((metCoreCount / totalCoreCount) * 100);

  // 1. Toggle / Override Criterion Verdict
  const handleToggleCriterionStatus = async (idx: number, targetStatus?: 'MET' | 'NOT_MET') => {
    const currentVal = criteria[idx].status;
    const nextVal = targetStatus || (currentVal === 'MET' ? 'NOT_MET' : 'MET');

    const updatedList = criteria.map((c, i) =>
      i === idx ? { ...c, status: nextVal, humanOverride: true } : c
    );
    setCriteria(updatedList);
    setActiveOverrideDropdownIdx(null);

    const updatedCore = updatedList.filter((c) => c.criterionType === 'Core Criteria');
    const basis = updatedCore.length > 0 ? updatedCore : updatedList;
    const updatedTotalCore = basis.length || 1;
    const updatedMetCore = basis.filter((c) => c.status === 'MET').length;

    let derivedStatus: ComplianceStatus = 'CRITICAL_GAP';
    if (updatedMetCore === updatedTotalCore) {
      derivedStatus = 'ADEQUATELY_MET';
    } else if (updatedMetCore > 0) {
      derivedStatus = 'PARTIALLY_MET';
    } else {
      derivedStatus = 'CRITICAL_GAP';
    }

    setCurrentStatus(derivedStatus);
    if (onStatusChange) {
      onStatusChange(obligation.id, derivedStatus);
    }

    setStatusUpdateMessage(`Criterion marked as ${nextVal === 'MET' ? 'Met ✓' : 'Not Met ✕'}. Obligation recalculated to ${derivedStatus}.`);
    setTimeout(() => setStatusUpdateMessage(null), 3000);

    try {
      const res = await fetch('/api/gap-matrix/evaluations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationId: obligation.evaluationId,
          itemId: obligation.id,
          criterionIndex: idx,
          criterionStatus: nextVal,
          complianceStatus: derivedStatus,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.success && Array.isArray(json.data?.auditLogs)) {
        setAuditLogs(json.data.auditLogs);
      }
    } catch (err) {
      console.error('Failed to persist criterion override:', err);
    }
  };

  // 2. Link Policy Evidence Section
  const handleSaveEvidence = async (idx: number) => {
    if (!newSectionInput.trim()) return;

    const sectionTitle = newSectionInput.trim();
    const sectionExcerpt = newNotesInput.trim() || 'Internal policy clause evidence linked by compliance reviewer.';

    const updatedList = criteria.map((c, i) => {
      if (i === idx) {
        const sections = c.matchedPolicySections ? [...c.matchedPolicySections] : [];
        sections.push({
          policyId: '',
          policyTitle,
          sectionNumber: sectionTitle,
          sectionTitle,
          verbatimPolicyExcerpt: sectionExcerpt,
        });
        return {
          ...c,
          status: 'MET' as const,
          matchedPolicySections: sections,
          humanOverride: true,
        };
      }
      return c;
    });

    setCriteria(updatedList);
    setAddingEvidenceIdx(null);
    setNewSectionInput('');
    setNewNotesInput('');

    const updatedCore = updatedList.filter((c) => c.criterionType === 'Core Criteria');
    const basis = updatedCore.length > 0 ? updatedCore : updatedList;
    const updatedTotalCore = basis.length || 1;
    const updatedMetCore = basis.filter((c) => c.status === 'MET').length;

    let derivedStatus: ComplianceStatus = 'CRITICAL_GAP';
    if (updatedMetCore === updatedTotalCore) derivedStatus = 'ADEQUATELY_MET';
    else if (updatedMetCore > 0) derivedStatus = 'PARTIALLY_MET';

    setCurrentStatus(derivedStatus);
    if (onStatusChange) onStatusChange(obligation.id, derivedStatus);

    setStatusUpdateMessage(`Evidence linked: ${sectionTitle}`);
    setTimeout(() => setStatusUpdateMessage(null), 3000);

    try {
      const res = await fetch('/api/gap-matrix/evaluations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationId: obligation.evaluationId,
          itemId: obligation.id,
          criterionIndex: idx,
          matchedPolicySection: sectionTitle,
          matchedPolicyText: sectionExcerpt,
          criterionStatus: 'MET',
          complianceStatus: derivedStatus,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.success && Array.isArray(json.data?.auditLogs)) {
        setAuditLogs(json.data.auditLogs);
      }
    } catch (err) {
      console.error('Failed saving policy evidence:', err);
    }
  };

  // 3. Remove Mapped Section
  const handleRemoveSection = (cIdx: number, sIdx: number) => {
    const updatedList = criteria.map((c, i) => {
      if (i === cIdx) {
        const nextSections = c.matchedPolicySections.filter((_, idx) => idx !== sIdx);
        return {
          ...c,
          matchedPolicySections: nextSections,
        };
      }
      return c;
    });
    setCriteria(updatedList);
  };

  // 4. Action Items Checklist
  const handleAddActionItem = async () => {
    if (!newActionItemTitle.trim()) return;
    const title = newActionItemTitle.trim();
    const newItem = {
      id: crypto.randomUUID(),
      title,
      completed: false,
    };
    setActionItems((prev) => [...prev, newItem]);
    setNewActionItemTitle('');
    setIsAddingActionItem(false);

    try {
      const res = await fetch('/api/gap-matrix/evaluations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationId: obligation.evaluationId,
          itemId: obligation.id,
          newActionItem: {
            title,
            policyTitle,
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.success && Array.isArray(json.data?.actionItems)) {
        setActionItems(
          json.data.actionItems.map((a: any, idx: number) => ({
            id: a.id || String(idx),
            title: a.title,
            completed: Boolean(a.completed),
          }))
        );
      }
      if (json.success && Array.isArray(json.data?.auditLogs)) {
        setAuditLogs(json.data.auditLogs);
      }
    } catch (err) {
      console.error('Failed saving action item:', err);
    }
  };

  const handleToggleActionItem = async (id: string) => {
    setActionItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, completed: !it.completed } : it))
    );
    try {
      const res = await fetch('/api/gap-matrix/evaluations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationId: obligation.evaluationId,
          itemId: obligation.id,
          toggleActionItemId: id,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.success && Array.isArray(json.data?.auditLogs)) {
        setAuditLogs(json.data.auditLogs);
      }
    } catch (err) {
      console.error('Failed toggling action item:', err);
    }
  };

  // 5. Add Comment (persisted to DB)
  const handlePostComment = async () => {
    if (!newCommentText.trim()) return;
    const content = newCommentText.trim();
    const optimistic = {
      id: crypto.randomUUID(),
      author: 'Authorized Compliance Officer',
      role: 'Reviewer',
      time: 'Just now',
      text: content,
    };
    setComments((prev) => [optimistic, ...prev]);
    setNewCommentText('');

    try {
      const res = await fetch('/api/gap-matrix/evaluations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationId: obligation.evaluationId,
          itemId: obligation.id,
          newComment: {
            content,
            authorName: 'Authorized Compliance Officer',
            authorRole: 'Reviewer',
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.success && Array.isArray(json.data?.auditLogs)) {
        setAuditLogs(json.data.auditLogs);
      }
    } catch (err) {
      console.error('Failed persisting comment:', err);
    }
  };

  const handleCopyClause = () => {
    const textToCopy = obligation.draftReplacementLanguage || obligation.whatToDo;
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(textToCopy);
      setCopiedClause(true);
      setTimeout(() => setCopiedClause(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const fullTitle = obligation.obligationTitle || obligation.regulatoryClauseReference || 'Statutory Compliance Obligation';
  const fullCode = obligation.obligationCode || obligation.regulatoryClauseReference || 'OBL';
  const fullDescription = obligation.obligationDescription || obligation.whatHappened;

  return (
    <div className="space-y-6">
      {/* 1. Top Breadcrumb Trail */}
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
              {fullTitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsStarred(!isStarred)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 transition-colors"
            title={isStarred ? 'Unstar' : 'Star'}
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

      {/* 2. Main Two-Column Layout (70% Left, 30% Right Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols / ~70%) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Statutory Obligation Header Block */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <span className="font-bold text-slate-800">{fullCode}</span>
              <span>•</span>
              <span>{obligation.ruleType || 'Prescriptive'}</span>
              <span>•</span>
              <span>{obligation.policyApplicability || 'Policy Applicable'}</span>
            </div>

            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
              {fullTitle}
            </h1>

            <p className="text-xs text-slate-700 leading-relaxed font-sans">
              {fullDescription}
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsStatuteModalOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 transition-colors cursor-pointer group"
                title="Click to view verbatim statutory clause"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-900 shrink-0" />
                <span className="font-medium truncate max-w-sm">
                  {obligation.regulationTitle || analysisName.split(' vs ')[0] || 'Statutory Regulation'}
                </span>
                <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-700 underline">
                  View Statutory Clause →
                </span>
              </button>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-medium">
                <span className="text-slate-400">Section:</span>
                <span>{obligation.sourceSectionRef || 'Not explicitly specified in source text'}</span>
              </div>
            </div>
          </div>

          {/* Assessment Coverage Summary Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700">Assessment coverage</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-800 font-medium px-2 py-0.5 rounded bg-slate-100">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
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
              </span>
              <Scale className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="flex items-center gap-3">
              <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${corePct}%` }}
                />
                <div
                  className="h-full bg-slate-200 transition-all duration-300"
                  style={{ width: `${100 - corePct}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-slate-800">
                {metCoreCount}/{totalCoreCount} Core criteria fulfilled
              </span>
            </div>
          </div>

          {/* Executive Section Navigation Tabs */}
          <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-2xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setInspectorTab('BRIEFING')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  inspectorTab === 'BRIEFING'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Scale className={`w-3.5 h-3.5 ${inspectorTab === 'BRIEFING' ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>Senior Counsel Briefing</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('CRITERIA')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  inspectorTab === 'CRITERIA'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileText className={`w-3.5 h-3.5 ${inspectorTab === 'CRITERIA' ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>Evidence &amp; Criteria ({criteria.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('CLAUSE')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  inspectorTab === 'CLAUSE'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className={`w-3.5 h-3.5 ${inspectorTab === 'CLAUSE' ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>Remediation Clause</span>
              </button>
            </div>

            {inspectorTab === 'BRIEFING' && (
              <button
                type="button"
                onClick={handleCopyBriefing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer mr-1"
                title="Copy Briefing Markdown for Legal Memo or Board Pack"
              >
                {copiedBriefing ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span className="font-sans">{copiedBriefing ? 'Copied Briefing' : 'Copy Briefing'}</span>
              </button>
            )}
          </div>

          {/* TAB 1: Senior Regulatory Counsel Executive Briefing */}
          {inspectorTab === 'BRIEFING' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-800 text-emerald-400">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block font-semibold">
                      Senior Regulatory Counsel Legal Verdict
                    </span>
                    <h2 className="text-sm font-bold tracking-tight text-white">
                      {resolvedBriefing.executiveVerdict}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider ${
                      currentStatus === 'ADEQUATELY_MET'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : currentStatus === 'PARTIALLY_MET'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        currentStatus === 'ADEQUATELY_MET'
                          ? 'bg-emerald-400'
                          : currentStatus === 'PARTIALLY_MET'
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                    />
                    <span>
                      {currentStatus === 'ADEQUATELY_MET'
                        ? 'Adequate'
                        : currentStatus === 'PARTIALLY_MET'
                        ? 'Partial'
                        : 'Critical Gap'}
                    </span>
                  </span>
                </div>
              </div>

              <div className="prose prose-slate max-w-none">
                <ExecutiveMarkdownRenderer content={resolvedBriefing.briefingMarkdown} />
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  <span>Cites {obligation.sourceSectionRef ? `Section ${obligation.sourceSectionRef}` : 'Statutory Mandate'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectorTab('CRITERIA')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <span>View Evidence Breakdown ({criteria.length})</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectorTab('CLAUSE')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <span>Inspect Remediation Clause</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Assessment Criteria Header & Cards */}
          {inspectorTab === 'CRITERIA' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Assessment Criteria ({criteria.length})
            </h2>
            <span className="text-[11px] text-slate-400">
              Click verdict badge to manually override
            </span>
          </div>

          {/* Criterion-by-Criterion Evaluation Cards */}
          <div className="space-y-4">
            {criteria.map((crit, idx) => {
              const isMet = crit.status === 'MET';
              const isExpanded = expandedCriteria[idx] ?? true;
              const isOverrideOpen = activeOverrideDropdownIdx === idx;

              return (
                <div
                  key={crit.id || idx}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs transition-all"
                >
                  <div className="p-4 flex items-start justify-between gap-4 bg-white hover:bg-slate-50/60 transition-colors">
                    <div
                      onClick={() => setExpandedCriteria((prev) => ({ ...prev, [idx]: !isExpanded }))}
                      className="flex items-start gap-3 cursor-pointer min-w-0 flex-1"
                    >
                      <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                          {crit.criterionType}
                        </span>
                        <h3 className="text-xs font-semibold text-slate-900 leading-relaxed">
                          {crit.criterionText}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 relative">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setActiveOverrideDropdownIdx(isOverrideOpen ? null : idx)}
                          className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                            isMet
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                          title="Click to override verdict"
                        >
                          <span>{isMet ? '✓ Met' : '✕ Not Met'}</span>
                          <Edit2 className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                          <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>

                        {isOverrideOpen && (
                          <div className="absolute right-0 top-8 z-30 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-xs animate-in fade-in duration-150">
                            <button
                              type="button"
                              onClick={() => handleToggleCriterionStatus(idx, 'MET')}
                              className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-emerald-800 font-medium flex items-center justify-between"
                            >
                              <span>✓ Met</span>
                              {isMet && <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleCriterionStatus(idx, 'NOT_MET')}
                              className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-700 font-medium flex items-center justify-between"
                            >
                              <span>✕ Not Met</span>
                              {!isMet && <Check className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedCriteria((prev) => ({ ...prev, [idx]: !isExpanded }))}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-4">
                      {/* 1. Truthful AI Reason Callout */}
                      <div className="p-3.5 bg-slate-50/90 border border-slate-200 rounded-lg space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                          <span className="text-amber-500 font-bold">✨</span>
                          <span>AI reason</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-sans">
                          {crit.aiReason}
                        </p>
                      </div>

                      {/* 2. Mapped Policy Sections Evidence Box */}
                      <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                            <span className="w-4 h-4 rounded bg-rose-600 text-white flex items-center justify-center font-bold text-[9px]">
                              PDF
                            </span>
                            <span className="truncate max-w-sm">{policyTitle}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setAddingEvidenceIdx(idx);
                              setNewSectionInput('');
                              setNewNotesInput('');
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-950 px-2 py-0.5 rounded hover:bg-slate-100 transition-colors"
                          >
                            <Plus className="w-3 h-3 text-slate-500" />
                            <span>+ Add Policy / Section</span>
                          </button>
                        </div>

                        {crit.matchedPolicySections && crit.matchedPolicySections.length > 0 ? (
                          <div className="pl-6 space-y-2 text-xs">
                            {crit.matchedPolicySections.map((sec, sIdx) => (
                              <div
                                key={sIdx}
                                onClick={() =>
                                  setPreviewExcerpt({
                                    title: sec.sectionTitle || sec.sectionNumber,
                                    excerpt: sec.verbatimPolicyExcerpt,
                                  })
                                }
                                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/70 transition-all cursor-pointer group"
                                title="Click to view verbatim policy excerpt"
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <span className="text-slate-400">└──</span>
                                  <span className="font-mono text-slate-800 truncate font-medium group-hover:text-slate-950">
                                    {sec.sectionTitle || sec.sectionNumber}
                                  </span>
                                  <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    (Preview)
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewExcerpt({
                                        title: sec.sectionTitle || sec.sectionNumber,
                                        excerpt: sec.verbatimPolicyExcerpt,
                                      });
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-900 transition-colors"
                                    title="Preview excerpt"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveSection(idx, sIdx);
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                    title="Remove mapping"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="pl-6 text-[11px] text-slate-400 italic">
                            No internal policy clauses currently satisfy this criterion. Click &quot;+ Add Policy / Section&quot; to link evidence manually.
                          </p>
                        )}
                      </div>

                      {addingEvidenceIdx === idx && (
                        <div className="p-3.5 bg-white border border-slate-300 rounded-lg space-y-3 animate-in fade-in duration-150">
                          <span className="text-xs font-semibold text-slate-900 block">
                            Link Internal Policy Section Evidence
                          </span>
                          <input
                            type="text"
                            value={newSectionInput}
                            onChange={(e) => setNewSectionInput(e.target.value)}
                            placeholder="e.g. Section 2.1 Customer Due Diligence"
                            className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900 outline-none"
                          />
                          <textarea
                            value={newNotesInput}
                            onChange={(e) => setNewNotesInput(e.target.value)}
                            placeholder="Enter policy excerpt or auditor verification notes..."
                            rows={2}
                            className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900 outline-none resize-none"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEvidence(idx)}
                              className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 transition-colors"
                            >
                              Save Evidence &amp; Mark Met
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
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Draft Policy Remediation Language */}
      {inspectorTab === 'CLAUSE' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Draft Policy Remediation Language
              </h3>
            </div>
            <button
              type="button"
              onClick={handleCopyClause}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {copiedClause ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedClause ? 'Copied Clause!' : 'Copy Clause'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            This clause has been synthesized by Senior Regulatory Counsel to directly satisfy all missing core criteria under {obligation.regulationTitle || 'the statutory benchmark'}. It is formatted for immediate adoption into {policyTitle}.
          </p>

          <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 font-mono text-xs text-emerald-300 leading-relaxed whitespace-pre-wrap shadow-inner">
            {obligation.draftReplacementLanguage || obligation.whatToDo}
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
            <span className="font-semibold text-slate-800 block">Board Governance Note:</span>
            <p>
              Adopting this clause establishes demonstrable compliance with {obligation.sourceSectionRef ? `Section ${obligation.sourceSectionRef}` : 'statutory mandates'} and eliminates supervisory vulnerability during routine bank examinations.
            </p>
          </div>
        </div>
      )}

          {/* Collaboration Card: Comments & Audit Logs */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="flex items-center border-b border-slate-200 px-4">
              <button
                type="button"
                onClick={() => setActiveTab('COMMENTS')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === 'COMMENTS'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Comments ({comments.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('AUDIT_LOGS')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === 'AUDIT_LOGS'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Audit Logs ({auditLogs.length})
              </button>
            </div>

            <div className="p-4 space-y-4">
              {activeTab === 'COMMENTS' ? (
                <>
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="font-bold text-slate-800">{c.author}</span>
                          <span className="font-mono text-[11px]">{c.time}</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{c.text}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                      placeholder="Add compliance note or audit rationale..."
                      className="flex-1 text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handlePostComment}
                      className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
                    >
                      Post
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-2 text-xs font-mono text-slate-600">
                  {auditLogs.length === 0 ? (
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 font-sans">
                      No audit log entries recorded yet for this obligation.
                    </div>
                  ) : (
                    auditLogs.map((log, idx) => (
                      <div key={log.id || idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{log.action}</span>
                          <span>{log.timestamp ? new Date(log.timestamp).toISOString().replace('T', ' ').slice(0, 19) : ''}</span>
                        </div>
                        <p className="text-slate-800 font-sans">
                          {typeof log.details === 'string'
                            ? log.details
                            : log.details
                            ? JSON.stringify(log.details)
                            : `${log.performedBy ? `${log.performedBy} — ` : ''}Obligation ${fullCode} (${metCoreCount}/${totalCoreCount} core criteria fulfilled).`}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Action & Context Rail */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Actions
            </span>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-500 block">Review status</label>
              <select
                value={currentStatus}
                onChange={async (e) => {
                  const s = e.target.value as ComplianceStatus;
                  setCurrentStatus(s);
                  if (onStatusChange) onStatusChange(obligation.id, s);
                  try {
                    const res = await fetch('/api/gap-matrix/evaluations', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        evaluationId: obligation.evaluationId,
                        itemId: obligation.id,
                        complianceStatus: s,
                      }),
                    });
                    const json = await res.json().catch(() => ({}));
                    if (json.success && Array.isArray(json.data?.auditLogs)) {
                      setAuditLogs(json.data.auditLogs);
                    }
                  } catch (err) {
                    console.error('Failed to persist review status:', err);
                  }
                }}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer font-medium"
              >
                <option value="CRITICAL_GAP">Critical Gap</option>
                <option value="PARTIALLY_MET">Partial Review</option>
                <option value="ADEQUATELY_MET">Adequately Met</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-500 block">Assignee</label>
              <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{obligation.responsibleRole || 'Chief Compliance Officer'}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenDossierModal}
                className="flex-1 py-1.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 transition-colors shadow-2xs"
              >
                Export
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-1.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 transition-colors shadow-2xs"
              >
                {copiedLink ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Mapped Policies
            </span>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2.5 text-xs text-slate-800">
              <span className="w-4 h-4 rounded bg-rose-600 text-white flex items-center justify-center font-bold text-[9px] shrink-0">
                PDF
              </span>
              <span className="font-medium truncate">{policyTitle}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Action Items ({actionItems.length})
              </span>
              <button
                type="button"
                onClick={() => setIsAddingActionItem(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900"
              >
                <Plus className="w-3 h-3 text-slate-500" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-2">
              {actionItems.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleActionItem(item.id)}
                    className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                  />
                  <span
                    className={`leading-relaxed ${
                      item.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'
                    }`}
                  >
                    {item.title}
                  </span>
                </label>
              ))}

              {isAddingActionItem && (
                <div className="p-2.5 border border-slate-200 rounded-lg space-y-2 bg-slate-50">
                  <input
                    type="text"
                    value={newActionItemTitle}
                    onChange={(e) => setNewActionItemTitle(e.target.value)}
                    placeholder="Enter remediation action task..."
                    className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddActionItem}
                      className="px-2.5 py-1 bg-slate-900 text-white rounded text-xs font-medium"
                    >
                      Save Task
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingActionItem(false)}
                      className="px-2 py-1 bg-white border border-slate-300 text-slate-600 rounded text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Verbatim Excerpt Preview Modal */}
      {previewExcerpt && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Policy Excerpt: {previewExcerpt.title}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewExcerpt(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs text-slate-700 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
              {previewExcerpt.excerpt}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewExcerpt(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verbatim Statutory Clause Modal */}
      {isStatuteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Verbatim Statutory Clause
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStatuteModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-slate-700">Source Regulation:</span>
                <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-medium">
                  {obligation.regulationTitle || analysisName.split(' vs ')[0] || 'Statutory Regulation'}
                </span>
                {obligation.sourceSectionRef && (
                  <span className="text-slate-600 font-mono text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    Section {obligation.sourceSectionRef}
                  </span>
                )}
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Statutory Text
                </label>
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                  {obligation.whatHasChanged || obligation.obligationDescription || obligation.whatHappened || 'Verbatim statutory text not available for this obligation.'}
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsStatuteModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
