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
  MessageSquare,
  History,
  Send,
  CheckSquare,
  Square,
} from 'lucide-react';
import { GapAnalysisSummaryItem } from '@/app/api/gap-matrix/evaluations/route';
import { ComplianceStatus } from '@/shared/types';
import { ExecutiveMarkdownRenderer } from '@/shared/ui/ExecutiveMarkdownRenderer';

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
  const [copiedBriefing, setCopiedBriefing] = useState(false);
  const [isBriefingExpanded, setIsBriefingExpanded] = useState(true);
  const [workflowStatus, setWorkflowStatus] = useState<string>(
    analysis.status === 'COMPLETED' ? 'Completed' : 'Review Pending'
  );
  const [activeCollaborationTab, setActiveCollaborationTab] = useState<'COMMENTS' | 'AUDIT_LOGS'>('COMMENTS');

  const resolvedMacroBriefing = React.useMemo(() => {
    if (analysis.executiveBriefing && analysis.executiveBriefing.executiveBriefingMarkdown) {
      return analysis.executiveBriefing;
    }

    const total = analysis.obligationsAssessedCount || items.length;
    const adequate = analysis.adequateCount;
    const partial = analysis.partialCount;
    const gap = analysis.gapCount;
    const pct = analysis.overallCompliancePercentage;

    const riskRating =
      gap > 0 ? 'CRITICAL_SUPERVISORY_EXPOSURE' : partial > 0 ? 'MODERATE_EXPOSURE' : 'LOW_DEFENSE_EXPOSURE';

    const headline =
      gap > 0
        ? `Material Supervisory Deficiencies Identified: ${gap} Critical Gap(s) Across Evaluated Policies`
        : partial > 0
        ? `Defensible Baseline with Operational Divergences: ${partial} Partial Gap(s) Requiring Board Action`
        : `High-Fidelity Regulatory Concordance: Zero Critical Gaps Across Evaluated Policies`;

    const memo = `This Senior Regulatory Counsel Briefing evaluates ${analysis.policyTitle} against binding statutory mandates under ${analysis.regulationTitle}. The assessment examined ${total} obligation(s), establishing ${adequate} adequate control(s), ${partial} partial divergence(s), and ${gap} critical gap(s), resulting in an institutional compliance posture of ${pct}%. Immediate executive oversight is recommended to operationalize board-ready remediation clauses.`;

    const md = `# EXECUTIVE REGULATORY COUNSEL BRIEFING & BOARD ADVISORY DOSSIER
**Analysis Name:** ${analysis.analysisName}  
**Statutory Benchmark:** ${analysis.regulationTitle} (${analysis.regulatorCode})  
**Internal Policy:** ${analysis.policyTitle} (v${analysis.versionTag})  
**Concordance Rating:** **${pct}%** | **Risk Posture:** \`${riskRating}\`  

---

## 1. Executive Legal Verdict & Board Memorandum
> [!${riskRating === 'LOW_DEFENSE_EXPOSURE' ? 'TIP' : riskRating === 'MODERATE_EXPOSURE' ? 'WARNING' : 'CRITICAL'}]
> **${headline}**  
> ${memo}

---

## 2. Key Supervisory Examination Focus Areas
- **Affirmative Evidentiary Records**: Bank examiners will prioritize inspection of documented procedures and verifiable audit logs.
- **Escalation Disconnects**: Policies lacking deterministic reporting timelines expose compliance officers to personal liability under statutory schedules.
- **Remediation Priority**: Immediate board adoption of pre-drafted remediation clauses mitigates balance sheet sanction vulnerability.

---

## 3. Strategic 30-Day Executive Action Items
1. Formalize and approve draft policy replacement clauses at the upcoming Board Audit & Risk Committee meeting.
2. Institute timestamped exception approval logs for all high-risk operational transactions.
3. Align departmental standard operating procedures with amended policy mandates.

---
*Project Cogent — Senior Regulatory Counsel & Banking Supervision Advisory Engine*`;

    return {
      headlineVerdict: headline,
      riskPostureRating: riskRating,
      boardExecutiveSummary: memo,
      executiveBriefingMarkdown: md,
    };
  }, [analysis, items]);

  const handleCopyMacroBriefing = () => {
    navigator.clipboard.writeText(resolvedMacroBriefing.executiveBriefingMarkdown);
    setCopiedBriefing(true);
    setTimeout(() => setCopiedBriefing(false), 2500);
  };
  const [comments, setComments] = useState<Array<{ id: string; authorName: string; authorRole: string; timestamp: string; content: string }>>(
    analysis.comments || []
  );
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; action: string; performedBy?: string; timestamp: string; details?: any }>>(
    analysis.auditLogs || []
  );

  const handlePostComment = async () => {
    if (!newCommentText.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    const newEntry = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'c-' + Date.now(),
      authorName: 'Authorized Compliance Officer',
      authorRole: 'Reviewer',
      timestamp: new Date().toISOString(),
      content: newCommentText.trim(),
    };

    try {
      const res = await fetch('/api/gap-matrix/evaluations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationId: analysis.id,
          newComment: {
            content: newCommentText.trim(),
            authorName: 'Authorized Compliance Officer',
            authorRole: 'Reviewer',
          },
        }),
      });

      if (res.ok) {
        setComments((prev) => [newEntry, ...prev]);
        setNewCommentText('');
      } else {
        // Optimistic fallback
        setComments((prev) => [newEntry, ...prev]);
        setNewCommentText('');
      }
    } catch {
      setComments((prev) => [newEntry, ...prev]);
      setNewCommentText('');
    } finally {
      setIsSubmittingComment(false);
    }
  };

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
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 text-xs transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 shrink-0" />
                  <span className="font-medium text-slate-700 group-hover:text-slate-950">
                    Adequate
                  </span>
                  <span className="font-mono text-slate-500 font-semibold">
                    [{adequateCount}]
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateToObligations('PARTIALLY_MET')}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 text-xs transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 shrink-0" />
                  <span className="font-medium text-slate-700 group-hover:text-slate-950">
                    Partial
                  </span>
                  <span className="font-mono text-slate-500 font-semibold">
                    [{partialCount}]
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateToObligations('CRITICAL_GAP')}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 text-xs transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-400 shrink-0" />
                  <span className="font-medium text-slate-700 group-hover:text-slate-950">
                    Gap
                  </span>
                  <span className="font-mono text-slate-500 font-semibold">
                    [{gapCount}]
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

          {/* Executive Regulatory Counsel Briefing & Board Advisory Dossier Card */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs space-y-0">
            <div className="p-4 px-5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-slate-800 text-emerald-400">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block font-semibold">
                    Senior Regulatory Counsel Briefing
                  </span>
                  <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                    <span>Executive Legal Opinion &amp; Board Advisory</span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold font-mono uppercase tracking-wider bg-slate-800 border border-slate-700 text-slate-200">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      resolvedMacroBriefing.riskPostureRating === 'LOW_DEFENSE_EXPOSURE'
                        ? 'bg-emerald-400'
                        : resolvedMacroBriefing.riskPostureRating === 'MODERATE_EXPOSURE'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                  />
                  <span>
                    {resolvedMacroBriefing.riskPostureRating === 'LOW_DEFENSE_EXPOSURE'
                      ? 'Low Exposure'
                      : resolvedMacroBriefing.riskPostureRating === 'MODERATE_EXPOSURE'
                      ? 'Moderate Risk'
                      : 'Critical Exposure'}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={handleCopyMacroBriefing}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copy Executive Memorandum in Markdown for Board Packs"
                >
                  {copiedBriefing ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedBriefing ? 'Copied Memo' : 'Copy Memo'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsBriefingExpanded(!isBriefingExpanded)}
                  className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isBriefingExpanded ? 'rotate-90' : ''}`} />
                </button>
              </div>
            </div>

            {isBriefingExpanded && (
              <div className="p-6 bg-white border-t border-slate-100">
                <ExecutiveMarkdownRenderer content={resolvedMacroBriefing.executiveBriefingMarkdown} />
              </div>
            )}
          </div>

          {/* Action Plan Table (Zango temp (13).png - 03:12) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 px-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Action Plan
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded-full bg-slate-100 text-slate-700">
                  {analysis.actionPlan && analysis.actionPlan.length > 0
                    ? analysis.actionPlan.length
                    : items.filter((i) => i.complianceStatus !== 'ADEQUATELY_MET').length}
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

            {(() => {
              const actionList = (analysis.actionPlan && analysis.actionPlan.length > 0)
                ? analysis.actionPlan
                : items
                    .filter((i) => i.complianceStatus !== 'ADEQUATELY_MET')
                    .map((it) => ({
                      id: it.id,
                      title: it.whatToDo || `Implement compliance baseline for ${it.regulatoryClauseReference}`,
                      policyTitle: it.matchedPolicySection || analysis.policyTitle,
                      assigneeName: it.responsibleRole || 'Chief Compliance Officer',
                      assigneeRole: 'CCO',
                      linkedObligationCode: it.regulatoryClauseReference,
                      completed: false,
                    }));

              if (actionList.length === 0) {
                return (
                  <div className="p-8 text-center text-xs text-slate-500">
                    All assessed obligations are adequately met. Zero pending remediation actions.
                  </div>
                );
              }

              return (
                <div className="divide-y divide-slate-100">
                  {actionList.slice(0, 6).map((action: any, idx: number) => {
                    const isDone = Boolean(action.completed);
                    return (
                      <div
                        key={action.id || idx}
                        className="p-3.5 px-5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => {
                              action.completed = !isDone;
                              setWorkflowStatus((prev) => prev);
                              fetch('/api/gap-matrix/evaluations', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  evaluationId: analysis.id,
                                  toggleActionItemId: action.id,
                                }),
                              }).catch(() => {});
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-medium truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                              {action.title}
                            </p>
                            <span className="text-[11px] font-mono text-slate-500">
                              {action.policyTitle || analysis.policyTitle}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          <span className="text-[11px] text-slate-500 font-medium">
                            {action.assigneeName || 'Chief Compliance Officer'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onNavigateToObligations('ALL')}
                            className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                          >
                            {action.linkedObligationCode || 'OBL'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Card 5: Comments & Audit Logs Card (Zango 03:04) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            {/* Tabs Header */}
            <div className="border-b border-slate-200 px-5 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => setActiveCollaborationTab('COMMENTS')}
                  className={`py-3.5 text-xs font-semibold inline-flex items-center gap-1.5 border-b-2 transition-colors ${
                    activeCollaborationTab === 'COMMENTS'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Comments {comments.length > 0 ? `(${comments.length})` : ''}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCollaborationTab('AUDIT_LOGS')}
                  className={`py-3.5 text-xs font-semibold inline-flex items-center gap-1.5 border-b-2 transition-colors ${
                    activeCollaborationTab === 'AUDIT_LOGS'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Audit Logs {auditLogs.length > 0 ? `(${auditLogs.length})` : ''}</span>
                </button>
              </div>
            </div>

            {/* Tab Body */}
            <div className="p-5">
              {activeCollaborationTab === 'COMMENTS' ? (
                <div className="space-y-4">
                  {/* Comment Input */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      CO
                    </div>
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder="Add a compliance note or remediation guidance for this analysis..."
                        rows={2}
                        className="w-full p-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:ring-1 focus:ring-slate-900 transition-all resize-none"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={!newCommentText.trim() || isSubmittingComment}
                          onClick={handlePostComment}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          <span>{isSubmittingComment ? 'Posting...' : 'Post comment'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Comments List */}
                  {comments.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No comments posted yet. Add a note to document reviewer findings.
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      {comments.map((c, i) => (
                        <div key={c.id || i} className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-800">
                              {c.authorName} <span className="font-normal text-slate-400">({c.authorRole})</span>
                            </span>
                            <span className="text-slate-400">
                              {new Date(c.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 whitespace-pre-wrap">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Audit Logs Tab */
                <div className="space-y-2">
                  {auditLogs.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      Zero overrides logged. Evaluation was initialized automatically.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {auditLogs.map((log, i) => (
                        <div key={log.id || i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between text-xs">
                          <div className="space-y-0.5">
                            <span className="font-medium text-slate-800 block">{log.action}</span>
                            <span className="text-[11px] font-mono text-slate-400">
                              By {log.performedBy || 'System'}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
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
                onChange={(e) => {
                  const val = e.target.value;
                  setWorkflowStatus(val);
                  fetch('/api/gap-matrix/evaluations', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      evaluationId: analysis.id,
                      status: val === 'Completed' ? 'COMPLETED' : 'IN_PROGRESS',
                    }),
                  }).catch(() => {});
                }}
                className="w-full px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer focus:bg-white"
              >
                <option value="Review Pending">• Review Pending</option>
                <option value="Under Board Review">• Under Board Review</option>
                <option value="Completed">• Completed / Audited</option>
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
                {analysis.createdByName || 'Authorized Compliance Officer'}
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
              {analysis.totalPenaltyNaira > 0 ? (
                <>
                  <span className="font-mono text-base font-bold text-slate-900">
                    ₦{(analysis.totalPenaltyNaira / 1_000_000).toFixed(1)}M
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Explicit statutory pecuniary penalty recorded in source text
                  </span>
                </>
              ) : (
                <span className="font-mono text-xs text-slate-600 block mt-0.5">
                  Not explicitly specified in source text
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
