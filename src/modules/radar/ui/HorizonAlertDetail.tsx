'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Share2,
  Star,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Plus,
  Send,
  BookOpen,
  X,
  ExternalLink,
  ShieldCheck,
  Check,
  RefreshCw,
  Copy,
  Layers,
  Scale,
  FileText,
  ArrowUpRight,
  Bold,
  Italic,
  Strikethrough,
  Link2,
  Code,
  List,
} from 'lucide-react';
import { RadarCircularPresentationCard } from '../types';
import { AssigneeSelect, AssigneeSelection } from '@/modules/organization/ui/AssigneeSelect';
import { RoleBriefViewer } from './RoleBriefViewer';

export function formatTopicPill(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  const KNOWN_TOPIC_MAP: Record<string, string> = {
    'COMMERCIAL_BANK': 'Commercial Bank',
    'MERCHANT_BANK': 'Merchant Bank',
    'PAYMENT_SERVICE_BANK': 'Payment Service Bank (PSB)',
    'MICROFINANCE_BANK_NATIONAL': 'National Microfinance Bank',
    'MICROFINANCE_BANK_STATE': 'State Microfinance Bank',
    'MICROFINANCE_BANK_UNIT': 'Unit Microfinance Bank',
    'FINANCE_COMPANY': 'Finance Company',
    'SWITCHING_AND_PROCESSING': 'Switching & Processing',
    'PAYMENT_SOLUTION_SERVICES_PSSP': 'Payment Solution Services (PSSP)',
    'PAYMENT_TERMINAL_SERVICE_PROVIDER_PTSP': 'Payment Terminal Service Provider (PTSP)',
    'MOBILE_MONEY_OPERATOR_MMO': 'Mobile Money Operator (MMO)',
    'SUPER_AGENT': 'Super Agent',
    'DIGITAL_LENDER_FCCPC_REGISTERED': 'Digital Lender (FCCPC Registered)',
    'SEC_REGISTERED_DIGITAL_SUB_BROKER': 'Digital Sub-Broker (SEC Registered)',
    'SEC_REGISTERED_ROBO_ADVISOR': 'Robo-Advisor (SEC Registered)',
    'CRYPTO_VASP_SEC_APPROVED': 'Virtual Asset Provider (VASP)',
    'NIBSS_INSTANT_PAYMENT': 'NIBSS Instant Payment (NIP)',
    'CENTRAL_PAY_DIRECT': 'Direct Debit / PayDirect',
    'ATM_SETTLEMENT': 'ATM Settlement',
    'POS_ACQUIRING': 'POS Acquiring',
    'INTERSWITCH_WEBPAY': 'WebPay Rails',
    'UNIFIED_PAYMENTS_PAYATTITUDE': 'PayAttitude Rails',
    'REMITA_COLLECTIONS': 'Remita Collections',
    'E_NAIRA': 'eNaira Digital Rail',
    'EFEMS': 'Enhanced Foreign Exchange Market (EFEMS)',
    'NIGSAC': 'Nigeria Sanctions Committee (NIGSAC)',
    'UNSC': 'UN Security Council (UNSC)',
    'OFAC': 'OFAC Sanctions',
    'AML_CFT': 'AML / CFT Compliance',
    'KYC_EDD': 'Tiered KYC & EDD',
    'NDPA_2023': 'NDPA 2023 Privacy',
    'ARCON_ASP': 'ARCON ASP Pre-Vetting',
  };

  if (KNOWN_TOPIC_MAP[trimmed]) return KNOWN_TOPIC_MAP[trimmed];
  if (KNOWN_TOPIC_MAP[trimmed.toUpperCase()]) return KNOWN_TOPIC_MAP[trimmed.toUpperCase()];

  if (trimmed.includes('_')) {
    return trimmed
      .split('_')
      .map((word) => {
        const u = word.toUpperCase();
        if (
          [
            'CBN', 'SEC', 'NDPC', 'FCCPC', 'ARCON', 'NFIU', 'NDIC',
            'ATM', 'POS', 'PTSP', 'PTSA', 'PSSP', 'MMO', 'PSB', 'DMB', 'MFB',
            'KYC', 'AML', 'CFT', 'PEP', 'STR', 'CTR', 'BVN', 'NIN', 'NIP',
            'FX', 'USSD', 'API', 'VASP', 'EFEMS', 'NFEM', 'DPO', 'CAR', 'GAID'
          ].includes(u)
        ) {
          return u;
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  return trimmed;
}

interface HorizonAlertDetailProps {
  circular: RadarCircularPresentationCard;
  onBack: () => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  onExportBrief?: (format: 'markdown' | 'pdf') => void;
  onToggleRelevant?: (id: string, e: React.MouseEvent) => void;
  onUpdateCircular?: (updated: Partial<RadarCircularPresentationCard> & { id: string }) => void;
}

export function HorizonAlertDetail({
  circular,
  onBack,
  onNavigatePrev,
  onNavigateNext,
  onExportBrief,
  onToggleRelevant,
  onUpdateCircular,
}: HorizonAlertDetailProps) {
  // Local state initialized from circular
  const [isStarred, setIsStarred] = useState(Boolean(circular.isStarred));
  const [alertType, setAlertType] = useState<'Actionable' | 'Informative'>(
    circular.alertType || (circular.priority === 'CRITICAL_EMERGENCY' || circular.priority === 'HIGH' ? 'Actionable' : 'Informative')
  );
  const [workflowStatus, setWorkflowStatus] = useState<string>(
    circular.workflowStatus || 'Pending Review'
  );
  const [currentAssignee, setCurrentAssignee] = useState(circular.assignee || null);
  const [departments, setDepartments] = useState<string[]>(
    circular.departments && circular.departments.length > 0
      ? circular.departments
      : ['COMPLIANCE']
  );
  const [showAddDept, setShowAddDept] = useState(false);
  const [newDeptInput, setNewDeptInput] = useState('');

  // Key Points collapsible state
  const [showAllKeyPoints, setShowAllKeyPoints] = useState(false);

  // Dates tab & management
  const [datesTab, setDatesTab] = useState<'important' | 'other'>('important');
  const [importantDates, setImportantDates] = useState(circular.importantDates || []);
  const [otherDates, setOtherDates] = useState(circular.otherDates || []);
  const [showAddDate, setShowAddDate] = useState(false);
  const [newDateLabel, setNewDateLabel] = useState('Compliance Deadline');
  const [newDateVal, setNewDateVal] = useState('');
  const [newDateDesc, setNewDateDesc] = useState('');

  // Activity Tabs: Comments vs Audit Logs
  const [activityTab, setActivityTab] = useState<'comments' | 'audit'>('comments');
  const [comments, setComments] = useState(circular.comments || []);
  const [newCommentText, setNewCommentText] = useState('');

  // Modals & UI helpers
  const [showArchiveDrawer, setShowArchiveDrawer] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isResynthesizing, setIsResynthesizing] = useState(false);
  const [resynthFeedback, setResynthFeedback] = useState<string | null>(null);

  // Sync state when circular prop changes
  useEffect(() => {
    setIsStarred(Boolean(circular.isStarred));
    setAlertType(
      circular.alertType || (circular.priority === 'CRITICAL_EMERGENCY' || circular.priority === 'HIGH' ? 'Actionable' : 'Informative')
    );
    setWorkflowStatus(circular.workflowStatus || 'Pending Review');
    setCurrentAssignee(circular.assignee || null);
    setDepartments(
      circular.departments && circular.departments.length > 0
        ? circular.departments
        : ['COMPLIANCE']
    );
    setImportantDates(
      circular.importantDates && circular.importantDates.length > 0
        ? circular.importantDates
        : [
            { id: '1', label: 'Publication Date', date: circular.publicationDate, description: 'Official notice gazetted by regulatory authority' },
            { id: '2', label: 'Effective Date', date: circular.effectiveDate, description: 'Statutory provisions become operative across financial system' },
          ]
    );
    setOtherDates(circular.otherDates || []);
    setComments(circular.comments || []);
  }, [circular]);

  const auditLogs =
    circular.auditLogs && circular.auditLogs.length > 0
      ? circular.auditLogs
      : [
          {
            id: 'l1',
            timestamp: `${circular.publicationDate}`,
            action: `Official notice gazetted by ${circular.regulator}`,
            author: circular.regulator,
          },
          {
            id: 'l2',
            timestamp: `${circular.publicationDate}`,
            action: 'Document ingested and classified into Horizon Radar',
            author: 'System Service',
          },
          ...(circular.applicability?.isApplicable
            ? [
                {
                  id: 'l3',
                  timestamp: `${circular.publicationDate}`,
                  action: 'Statutory applicability matched operating licenses',
                  author: 'Applicability Engine',
                },
              ]
            : []),
        ];

  // Key Points list
  const keyPoints = circular.keyPoints && circular.keyPoints.length > 0 ? circular.keyPoints : [];
  const displayedKeyPoints = showAllKeyPoints ? keyPoints : keyPoints.slice(0, 3);

  // Executive summary paragraphs
  const summaryParagraphs = circular.executiveSummary
    ? circular.executiveSummary.split('\n\n').filter(Boolean)
    : [
        circular.summary || `Authentic regulatory synthesis pending analysis by Horizon Engine for ${circular.circularNumber}.`,
      ];

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleToggleStar = async () => {
    const next = !isStarred;
    setIsStarred(next);
    onUpdateCircular?.({ id: circular.id, isStarred: next });
    try {
      await fetch(`/api/radar/circulars/${encodeURIComponent(circular.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: next }),
      });
    } catch (err) {
      console.error('Failed to persist star status', err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const text = newCommentText.trim();
    setNewCommentText('');
    const tempCmt = {
      id: `c_${Date.now()}`,
      author: 'Compliance Officer',
      avatar: 'CO',
      text,
      timestamp: 'Just now',
    };
    const nextComments = [tempCmt, ...comments];
    setComments(nextComments);

    try {
      const res = await fetch(`/api/radar/circulars/${encodeURIComponent(circular.id)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.success && data.comments) {
        setComments(data.comments);
        onUpdateCircular?.({ id: circular.id, comments: data.comments, auditLogs: data.auditLogs });
      }
    } catch (err) {
      console.error('Failed to post comment', err);
    }
  };

  const handleAddDateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDateLabel.trim() || !newDateVal.trim()) return;
    const newDate = {
      id: `d_${Date.now()}`,
      label: newDateLabel.trim(),
      date: newDateVal.trim(),
      description: newDateDesc.trim() || 'Custom statutory milestone',
    };

    if (datesTab === 'important') {
      const nextDates = [...importantDates, newDate];
      setImportantDates(nextDates);
      onUpdateCircular?.({ id: circular.id, importantDates: nextDates });
      try {
        await fetch(`/api/radar/circulars/${encodeURIComponent(circular.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ importantDates: nextDates }),
        });
      } catch (err) {
        console.error('Failed to persist date', err);
      }
    } else {
      const nextDates = [...otherDates, newDate];
      setOtherDates(nextDates);
      onUpdateCircular?.({ id: circular.id, otherDates: nextDates });
      try {
        await fetch(`/api/radar/circulars/${encodeURIComponent(circular.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otherDates: nextDates }),
        });
      } catch (err) {
        console.error('Failed to persist other date', err);
      }
    }

    setNewDateDesc('');
    setNewDateVal('');
    setShowAddDate(false);
  };

  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newDeptInput.trim().toUpperCase();
    if (clean && !departments.includes(clean)) {
      const next = [...departments, clean];
      setDepartments(next);
      onUpdateCircular?.({ id: circular.id, departments: next });
    }
    setNewDeptInput('');
    setShowAddDept(false);
  };

  const handleRemoveDept = (deptToRemove: string) => {
    const next = departments.filter((d) => d !== deptToRemove);
    setDepartments(next);
    onUpdateCircular?.({ id: circular.id, departments: next });
  };

  const handleAlertTypeChange = async (newVal: 'Actionable' | 'Informative') => {
    setAlertType(newVal);
    onUpdateCircular?.({ id: circular.id, alertType: newVal });
    try {
      await fetch(`/api/radar/circulars/${encodeURIComponent(circular.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertType: newVal }),
      });
    } catch (err) {
      console.error('Failed to update alert type', err);
    }
  };

  const handleToggleRelevant = async (e: React.MouseEvent | React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const nextVal = circular.isRelevant !== false ? false : true;
    onUpdateCircular?.({ id: circular.id, isRelevant: nextVal });
    if (onToggleRelevant) {
      onToggleRelevant(circular.id, e as any);
    }
  };

  const handleAssigneeChange = async (selection: AssigneeSelection) => {
    let nextAssignee: { id: string; name: string; avatar?: string } | null = null;
    if (selection.type !== 'UNASSIGNED' && selection.name) {
      nextAssignee = {
        id: selection.id || selection.name,
        name: selection.name,
        avatar: selection.initials || selection.name.slice(0, 2).toUpperCase(),
      };
    }
    setCurrentAssignee(nextAssignee);
    onUpdateCircular?.({ id: circular.id, assignee: nextAssignee });
    try {
      await fetch(`/api/radar/circulars/${encodeURIComponent(circular.id)}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedToUserId: nextAssignee?.id && nextAssignee.id.length > 10 ? nextAssignee.id : null,
          assignedRole: nextAssignee?.name || null,
        }),
      });
    } catch (err) {
      console.error('Failed to assign user', err);
    }
  };

  const handleResynthesize = async () => {
    try {
      setIsResynthesizing(true);
      setResynthFeedback(null);
      const res = await fetch(`/api/radar/circulars/${encodeURIComponent(circular.id)}/resynthesize`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.data) {
        const synth = data.data;
        onUpdateCircular?.({
          id: circular.id,
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
          otherDates: synth.otherDates,
        });
        setResynthFeedback('Alert re-synthesized successfully.');
        setTimeout(() => setResynthFeedback(null), 3000);
      } else {
        setResynthFeedback(data.error || 'Re-synthesis failed');
      }
    } catch (err: any) {
      setResynthFeedback(err.message || 'Network error');
    } finally {
      setIsResynthesizing(false);
    }
  };

  const docNature =
    circular.severityMatrix?.natureOfDocument ||
    (alertType === 'Informative' ? 'Notice / Press Release' : 'Circular Directive');

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* ──────────────────────────────────────────────────────────────────────────
          1. TOP BREADCRUMB & ACTION BAR (Ref Video 01:00)
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-2 text-xs min-w-0">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900 transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Horizon Scanning</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-md lg:max-w-xl">
            {circular.subject}
          </span>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Prev / Next Alert buttons */}
          <div className="hidden sm:inline-flex items-center rounded-md border border-slate-200 bg-white">
            <button
              onClick={onNavigatePrev}
              disabled={!onNavigatePrev}
              className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 rounded-l-md border-r border-slate-200"
              title="Previous Alert"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onNavigateNext}
              disabled={!onNavigateNext}
              className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 rounded-r-md"
              title="Next Alert"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Re-synthesize Alert Action */}
          <button
            onClick={handleResynthesize}
            disabled={isResynthesizing}
            className="h-8 px-2.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Re-run structured statutory synthesis against captured document text"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResynthesizing ? 'animate-spin text-slate-900' : ''}`} />
            <span className="hidden sm:inline">{isResynthesizing ? 'Synthesizing...' : 'Re-synthesize'}</span>
          </button>

          {/* Star Action */}
          <button
            onClick={handleToggleStar}
            className="h-8 px-2.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Toggle Star"
          >
            <Star
              className={`w-3.5 h-3.5 ${
                isStarred ? 'text-amber-500 fill-amber-500' : 'text-slate-400'
              }`}
            />
            <span className="hidden sm:inline">{isStarred ? 'Starred' : 'Star'}</span>
          </button>

          {/* Context Options */}
          <button
            onClick={() => onExportBrief?.('pdf')}
            className="h-8 px-2 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            title="Export Options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. TWO-COLUMN HIGH-DENSITY WORKSPACE (Ref Video 01:00 – 01:20)
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ────────────────────────────────────────────────────────────────────────
            LEFT MAIN COLUMN (70% WIDTH)
            ──────────────────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header Card: Metadata Bar & Title */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-2xs space-y-4">
            {/* Metadata Pill Bar */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Regulator Badge */}
              <a
                href={circular.sourceFileUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-0.5 rounded border border-slate-200 transition-colors"
              >
                <span>{circular.regulator}</span>
                <ArrowUpRight className="w-3 h-3 text-slate-500" />
              </a>

              {/* Doc Type Pill */}
              <span className="font-mono text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                {circular.docType || 'Circular / Directive'}
              </span>

              {/* Interactive Alert Type Dropdown */}
              <div className="relative inline-flex items-center">
                <select
                  value={alertType}
                  onChange={(e) => handleAlertTypeChange(e.target.value as 'Actionable' | 'Informative')}
                  className="h-6 pl-5 pr-5 font-mono text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded appearance-none cursor-pointer hover:border-slate-300 focus:outline-hidden"
                >
                  <option value="Actionable">Actionable</option>
                  <option value="Informative">Informative</option>
                </select>
                <span
                  className={`w-1.5 h-1.5 rounded-full absolute left-2 pointer-events-none ${
                    alertType === 'Actionable' ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                />
                <ChevronDown className="w-2.5 h-2.5 text-slate-400 absolute right-1.5 pointer-events-none" />
              </div>

              {/* Interactive Relevant Green Toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-slate-700 font-medium ml-1">
                <input
                  type="checkbox"
                  checked={circular.isRelevant !== false}
                  onChange={handleToggleRelevant}
                  className="sr-only"
                />
                <div
                  className={`w-6 h-3.5 rounded-full transition-colors relative flex items-center ${
                    circular.isRelevant !== false ? 'bg-emerald-600' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full bg-white transition-transform transform shadow-xs ${
                      circular.isRelevant !== false ? 'translate-x-3' : 'translate-x-0.5'
                    }`}
                  />
                </div>
                <span>Relevant</span>
              </label>

              {/* Jurisdiction / Language Badges */}
              <div className="ml-auto flex items-center gap-1 font-mono text-[10px] text-slate-500">
                <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">EN</span>
                <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">NG</span>
              </div>
            </div>

            {/* Alert Title & Reference Line */}
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight leading-snug">
                {circular.subject}
              </h1>
              <div className="font-mono text-xs text-slate-500 mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-slate-700 font-medium">{circular.circularNumber}</span>
                <span>•</span>
                <span>Published {circular.publicationDate}</span>
                <span>•</span>
                <span>Effective {circular.effectiveDate}</span>
                {circular.statutoryDeadline && (
                  <>
                    <span>•</span>
                    <span className="text-rose-700 font-medium">
                      Deadline: {circular.statutoryDeadline} ({circular.daysRemaining ?? 0} days remaining)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────────────
              UNIFIED SYNTHESIS CARD (Executive Summary + Key Points + Departments)
              Single cohesive card modeled on Zango 01:03–01:08
              ──────────────────────────────────────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {/* 1. Executive Summary Section */}
            <div className="p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Executive Summary
                </div>
                {resynthFeedback && (
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {resynthFeedback}
                  </span>
                )}
              </div>
              <div className="space-y-3 text-xs leading-relaxed text-slate-700 font-normal">
                {summaryParagraphs.map((para, idx) => (
                  <p key={`summary-para-${idx}`}>{para}</p>
                ))}
              </div>
            </div>

            {/* 2. Key Points Section with View More / View Less Toggle */}
            <div className="p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Key Points
                </div>
                {keyPoints.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllKeyPoints(!showAllKeyPoints)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
                  >
                    <span>{showAllKeyPoints ? 'View Less' : `View More (${keyPoints.length})`}</span>
                    {showAllKeyPoints ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
              </div>

              {keyPoints.length > 0 ? (
                <div className="space-y-2.5">
                  {displayedKeyPoints.map((pt, idx) => (
                    <div key={`kp-${idx}`} className="flex items-start gap-2.5 text-xs text-slate-700">
                      <span className="font-mono text-[11px] font-bold text-slate-400 shrink-0 mt-0.5">
                        {(idx + 1).toString().padStart(2, '0')}.
                      </span>
                      <div className="leading-relaxed">{pt}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No extracted key points recorded for this notice.</p>
              )}
            </div>

            {/* 3. Departments Section (bottom of unified card) */}
            <div className="p-4 sm:px-6 bg-slate-50/50 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mr-1">
                Departments
              </span>
              {departments.map((dept) => (
                <span
                  key={dept}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-700 font-mono shadow-2xs"
                >
                  <span>{dept}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDept(dept)}
                    className="text-slate-400 hover:text-slate-700"
                    title={`Remove ${dept}`}
                  >
                    ×
                  </button>
                </span>
              ))}

              {showAddDept ? (
                <form onSubmit={handleAddDept} className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={newDeptInput}
                    onChange={(e) => setNewDeptInput(e.target.value)}
                    placeholder="e.g. TREASURY"
                    className="h-6 px-2 text-xs font-mono border border-slate-300 rounded focus:outline-hidden bg-white"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="h-6 px-2 text-xs font-semibold bg-slate-900 text-white rounded"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddDept(false)}
                    className="h-6 px-1.5 text-xs text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddDept(true)}
                  className="h-6 px-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-dashed border-slate-300 rounded inline-flex items-center gap-1 bg-white hover:bg-slate-50 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Department</span>
                </button>
              )}
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────────────
              DEPARTMENTAL SUPERVISORY BRIEFS CARD (Cogent Executive Value-Add)
              ──────────────────────────────────────────────────────────────────────── */}
          <RoleBriefViewer
            circularNumber={circular.circularNumber}
            generalCounselBrief={circular.generalCounselBrief}
            executiveBriefCco={circular.executiveBriefCco}
            actionBriefCoo={circular.actionBriefCoo}
            technicalBriefProductEng={circular.technicalBriefProductEng}
            technicalBriefCto={circular.technicalBriefCto}
            financialBriefCfo={circular.financialBriefCfo}
            governanceBriefCeoCro={circular.governanceBriefCeoCro}
            isInformative={alertType === 'Informative'}
          />

          {/* ────────────────────────────────────────────────────────────────────────
              IMPORTANT DATES & OTHER DATES CARD (Ref Video 01:07 – 01:12)
              ──────────────────────────────────────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setDatesTab('important')}
                  className={`text-xs font-semibold transition-colors pb-1 border-b-2 ${
                    datesTab === 'important'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Important Dates
                </button>
                <button
                  type="button"
                  onClick={() => setDatesTab('other')}
                  className={`text-xs font-semibold transition-colors pb-1 border-b-2 ${
                    datesTab === 'other'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Other Dates
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowAddDate(!showAddDate)}
                className="text-xs font-semibold text-slate-900 hover:text-slate-700 inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add date</span>
              </button>
            </div>

            {/* Inline Add Date Form */}
            {showAddDate && (
              <form onSubmit={handleAddDateSubmit} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newDateLabel}
                    onChange={(e) => setNewDateLabel(e.target.value)}
                    placeholder="Label (e.g. Audit Review)"
                    className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden"
                    required
                  />
                  <input
                    type="date"
                    value={newDateVal}
                    onChange={(e) => setNewDateVal(e.target.value)}
                    className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden font-mono"
                    required
                  />
                  <input
                    type="text"
                    value={newDateDesc}
                    onChange={(e) => setNewDateDesc(e.target.value)}
                    placeholder="Context / Milestone description"
                    className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddDate(false)}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-slate-900 text-white text-xs font-medium rounded hover:bg-slate-800"
                  >
                    Save Date
                  </button>
                </div>
              </form>
            )}

            {/* Date Rows Table */}
            <div className="divide-y divide-slate-100">
              {(datesTab === 'important' ? importantDates : otherDates).map((d) => (
                <div key={d.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 text-xs">
                  <div className="w-44 font-medium text-slate-800 shrink-0">
                    {d.label}
                  </div>
                  <div className="font-mono text-slate-600 text-xs shrink-0">
                    {d.date}
                  </div>
                  <div className="text-slate-500 text-xs sm:text-right flex-1 truncate">
                    {d.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────────────
              LINKED REGULATORY INSTRUMENT ACTION CARD (Shown for binding regulatory instruments)
              ──────────────────────────────────────────────────────────────────────── */}
          {alertType === 'Actionable' &&
            circular.docType !== 'News & Events' &&
            circular.docType !== 'Reports & Research' &&
            circular.docType !== 'Legal Briefing / Law Firm Alert' && (
              <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      Linked Regulatory Instrument
                    </div>
                    <div className="text-[11px] text-slate-500">
                      View codified statutory obligations, enforcement clauses, and penalty floors in Regulation Library.
                    </div>
                  </div>
                </div>
                <Link
                  href={`/library?circularNumber=${encodeURIComponent(circular.circularNumber)}&view=obligations`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium shrink-0 transition-colors shadow-2xs"
                >
                  <span>View Obligations in Regulation Library</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

          {/* ────────────────────────────────────────────────────────────────────────
              COMMENTS & AUDIT LOGS CARD (Ref Video 01:10 – 01:17)
              ──────────────────────────────────────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setActivityTab('comments')}
                className={`text-xs font-semibold pb-1 border-b-2 transition-colors ${
                  activityTab === 'comments'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Comments ({comments.length})
              </button>
              <button
                type="button"
                onClick={() => setActivityTab('audit')}
                className={`text-xs font-semibold pb-1 border-b-2 transition-colors ${
                  activityTab === 'audit'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Audit Logs ({auditLogs.length})
              </button>
            </div>

            {activityTab === 'comments' ? (
              <div className="space-y-4">
                {/* Rich Comment Input with Toolbar */}
                <form onSubmit={handleAddComment} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  {/* Formatting Toolbar */}
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-slate-600">
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-slate-200 transition-colors"
                      title="Bold"
                      onClick={() => setNewCommentText((prev) => `${prev} **bold**`)}
                    >
                      <Bold className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-slate-200 transition-colors"
                      title="Italic"
                      onClick={() => setNewCommentText((prev) => `${prev} *italic*`)}
                    >
                      <Italic className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-slate-200 transition-colors"
                      title="Strikethrough"
                      onClick={() => setNewCommentText((prev) => `${prev} ~~strike~~`)}
                    >
                      <Strikethrough className="w-3 h-3" />
                    </button>
                    <div className="h-3 w-px bg-slate-300 mx-1" />
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-slate-200 transition-colors"
                      title="Link"
                      onClick={() => setNewCommentText((prev) => `${prev} [link](url)`)}
                    >
                      <Link2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-slate-200 transition-colors"
                      title="Code snippet"
                      onClick={() => setNewCommentText((prev) => `${prev} \`code\``)}
                    >
                      <Code className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-slate-200 transition-colors"
                      title="Bullet list"
                      onClick={() => setNewCommentText((prev) => `${prev}\n- Item`)}
                    >
                      <List className="w-3 h-3" />
                    </button>
                  </div>

                  <textarea
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Write an internal compliance comment, tag an officer, or note a precedent..."
                    rows={3}
                    className="w-full p-3 text-xs border-0 focus:outline-hidden placeholder:text-slate-400 font-sans"
                  />

                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50/50 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400">
                      Markdown formatting supported
                    </span>
                    <button
                      type="submit"
                      disabled={!newCommentText.trim()}
                      className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-40 transition-colors shadow-2xs"
                    >
                      <Send className="w-3 h-3" />
                      <span>Post comment</span>
                    </button>
                  </div>
                </form>

                {/* Comment List */}
                <div className="divide-y divide-slate-100">
                  {comments.map((cmt) => (
                    <div key={cmt.id} className="py-3 flex gap-3 text-xs">
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-mono text-[9px] font-bold flex items-center justify-center shrink-0">
                        {cmt.avatar}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">{cmt.author}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{cmt.timestamp}</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{cmt.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Audit Logs timeline
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-slate-400 mt-1 shrink-0" />
                    <div className="flex-1">
                      <div className="text-slate-800 font-medium">{log.action}</div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                        {log.timestamp} • {log.author}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────────────────
            RIGHT CONTEXT & TRIAGE RAIL (30% WIDTH, Sticky)
            Modeled on Zango 01:02 – 01:18
            ──────────────────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-5">
          {/* Section 1: Actions */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Actions
            </div>

            {/* Workflow Status Selector */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Status
              </label>
              <div className="relative">
                <select
                  value={workflowStatus}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setWorkflowStatus(nextVal);
                    onUpdateCircular?.({ id: circular.id, workflowStatus: nextVal });
                    fetch(`/api/radar/circulars/${encodeURIComponent(circular.id)}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ workflowStatus: nextVal }),
                    }).catch(console.error);
                  }}
                  className="w-full h-8 pl-3 pr-8 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-md appearance-none hover:border-slate-300 focus:outline-hidden"
                >
                  <option value="Pending Review">Pending Review</option>
                  <option value="In Review">In Review</option>
                  <option value="Actioned">Actioned</option>
                  <option value="Archived">Archived</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Assignee Selector */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Assignee
              </label>
              <AssigneeSelect
                value={currentAssignee?.name || currentAssignee?.id || null}
                onChange={handleAssigneeChange}
              />
            </div>

            {/* 2-Button Row: Share / Export & Copy link */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onExportBrief?.('pdf')}
                className="py-1.5 px-3 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-md flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export Brief</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="py-1.5 px-3 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-md flex items-center justify-center gap-1.5 transition-colors"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{isCopied ? 'Copied' : 'Copy link'}</span>
              </button>
            </div>

            {/* Re-synthesize Alert Button */}
            <button
              type="button"
              onClick={handleResynthesize}
              disabled={isResynthesizing}
              className="w-full py-1.5 px-3 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              title="Run fresh structured statutory synthesis on this publication"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResynthesizing ? 'animate-spin text-slate-900' : 'text-slate-500'}`} />
              <span>{isResynthesizing ? 'Synthesizing...' : 'Re-synthesize Alert'}</span>
            </button>
          </div>

          {/* Section 2: Source Document */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Source Document
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Captured
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-900">
                {circular.regulator} Official Gazette
              </div>

              {/* Primary action: Read Captured Statutory Text Modal */}
              <button
                type="button"
                onClick={() => setShowArchiveDrawer(true)}
                className="w-full py-2 px-3 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md flex items-center justify-center gap-2 transition-colors shadow-2xs"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-200" />
                <span>Read Captured Statutory Text</span>
              </button>

              {/* Secondary action: Official External Link */}
              <a
                href={circular.sourceFileUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className="w-full py-1.5 px-3 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Open Regulator Portal Link</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>

              <div className="pt-1 text-[11px] text-slate-500 leading-normal flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Cogent maintains an immutable, cryptographically captured copy to shield audit defense against remote 404 link rot.</span>
              </div>
            </div>
          </div>

          {/* Section 3: Severity Matrix Accordion */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Severity Matrix
              </span>
              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                {circular.severityMatrixCode || (circular.severityTier ? `${circular.severityTier} | ${circular.severityScore || 18}%` : 'G1 | 18%')}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Nature of Document</span>
                <span className="font-medium text-slate-800 text-right">
                  {circular.severityMatrix?.natureOfDocument || docNature}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Importance / Complexity</span>
                <span className="font-mono text-slate-700">
                  {circular.severityMatrix?.complexity || 'Standard'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Implementation Date</span>
                <span className="font-mono text-slate-700">
                  {circular.severityMatrix?.implementationDate || circular.effectiveDate || 'Immediate'}
                </span>
              </div>
              {circular.severityMatrix?.externalEntities && circular.severityMatrix.externalEntities.length > 0 && (
                <div>
                  <span className="text-slate-600 block mb-1">External Entities Involved</span>
                  <div className="flex flex-wrap gap-1">
                    {circular.severityMatrix.externalEntities.map((ent: string) => (
                      <span key={ent} className="px-1.5 py-0.5 bg-slate-100 text-[10px] font-mono text-slate-700 rounded border border-slate-200">
                        {ent}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Alert Info Accordion */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Alert Information
            </div>
            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Alert Date</span>
                <span className="font-mono font-medium text-slate-900">{circular.publicationDate}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] mb-1">Topics</span>
                <div className="flex flex-wrap gap-1">
                  {(circular.topics && circular.topics.length > 0 ? circular.topics : [circular.regulator, 'Regulatory Directive']).map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-medium text-slate-700 border border-slate-200">
                      {formatTopicPill(t)}
                    </span>
                  ))}
                </div>
              </div>
              {circular.impactedAreas && circular.impactedAreas.length > 0 && (
                <div>
                  <span className="text-slate-500 block text-[11px] mb-1">Impacted Areas</span>
                  <div className="flex flex-wrap gap-1">
                    {circular.impactedAreas.map((area: string) => (
                      <span key={area} className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-medium text-slate-700 border border-slate-200">
                        {formatTopicPill(area)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Related Documents Accordion */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Related Documents
              </span>
              <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-700">
                {circular.amends?.length ? circular.amends.length : 0}
              </span>
            </div>
            <div className="text-xs text-slate-600">
              {circular.amends && circular.amends.length > 0 ? (
                <ul className="space-y-1.5">
                  {circular.amends.map((docRef: string) => (
                    <li key={docRef} className="font-mono text-[11px] text-slate-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span>{docRef}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-slate-500 italic">Primary statutory enactment (0 parent amendments)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. IMMUTABLE STATUTORY TRANSCRIPT DRAWER (LINK-ROT SHIELD)
          ────────────────────────────────────────────────────────────────────────── */}
      {showArchiveDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="h-full w-full max-w-3xl border-l border-slate-200 bg-white p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900">
                        Immutable Statutory Transcript
                      </h2>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Verified Archive
                      </span>
                    </div>
                    <p className="font-mono text-xs text-slate-500 mt-0.5">
                      {circular.circularNumber} • {circular.regulator} Official Gazette
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (circular.rawText) {
                        navigator.clipboard.writeText(circular.rawText);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      }
                    }}
                    className="h-8 px-2.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Copy Text'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowArchiveDrawer(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 rounded transition-colors"
                    aria-label="Close archive drawer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Statutory Integrity Banner */}
              <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tamper-Evident Regulatory Archive</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  This document was captured and cryptographically indexed directly from the {circular.regulator} official portal upon enactment ({circular.publicationDate}). Cogent maintains this immutable transcript to ensure compliance teams retain permanent audit defense evidence regardless of government server downtime or link rot.
                </p>
              </div>

              {/* Transcript Body */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 font-mono text-xs leading-relaxed text-slate-800 whitespace-pre-wrap max-h-[60vh] overflow-y-auto selection:bg-slate-200">
                {circular.rawText || (
                  <div className="text-slate-500 italic py-8 text-center">
                    No transcript body stored for this circular. Please reference the official gazette publication notice.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 pt-4 mt-4 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono text-[11px]">
                Preserved pursuant to CAMA & BOFIA 6-year statutory audit standards.
              </span>
              <button
                type="button"
                onClick={() => setShowArchiveDrawer(false)}
                className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium"
              >
                Close Transcript
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
