'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Share2,
  Star,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Send,
  CheckCircle2,
  Shield,
  FileText,
  Copy,
  Check,
  ArrowUpRight,
  ShieldCheck,
  BookOpen,
  X,
} from 'lucide-react';
import { RadarCircularPresentationCard } from '../types';
import { RegulatorCode } from '@/shared/types';
import { RoleBriefViewer } from './RoleBriefViewer';

interface HorizonAlertDetailProps {
  circular: RadarCircularPresentationCard;
  onBack: () => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  onExportBrief?: (format: 'pdf' | 'markdown') => void;
  onToggleRelevant?: (id: string) => void;
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
  // Local state for interactive items
  const [isStarred, setIsStarred] = useState<boolean>(Boolean(circular.isStarred));
  const [workflowStatus, setWorkflowStatus] = useState<string>(circular.workflowStatus || 'Pending Review');
  const [alertType, setAlertType] = useState<'Actionable' | 'Informative'>(
    circular.alertType || (circular.priority === 'CRITICAL_EMERGENCY' || circular.priority === 'HIGH' ? 'Actionable' : 'Informative')
  );
  const [docNature, setDocNature] = useState<string>('Mandatory Directive');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showAllKeyPoints, setShowAllKeyPoints] = useState<boolean>(false);
  const [showArchiveDrawer, setShowArchiveDrawer] = useState<boolean>(false);

  // Important Dates tab & records
  const [datesTab, setDatesTab] = useState<'important' | 'other'>('important');
  const [importantDates, setImportantDates] = useState(
    circular.importantDates || [
      { id: '1', label: 'Publication Date', date: circular.publicationDate, description: 'Official notice gazetted by regulator' },
      { id: '2', label: 'Effective Date', date: circular.effectiveDate, description: 'Date requirements become operative' },
      ...(circular.statutoryDeadline
        ? [{ id: '3', label: 'Compliance Deadline', date: circular.statutoryDeadline, description: 'Statutory deadline for institutional audit proof' }]
        : []),
    ]
  );
  const [showAddDate, setShowAddDate] = useState<boolean>(false);
  const [newDateLabel, setNewDateLabel] = useState('');
  const [newDateVal, setNewDateVal] = useState('');
  const [newDateDesc, setNewDateDesc] = useState('');

  // Department Tags
  const [departments, setDepartments] = useState<string[]>(
    circular.departments || ['COMPLIANCE_LEGAL', 'OPERATIONS', 'GROWTH_MARKETING', 'ENGINEERING_TECH', 'TREASURY_FINANCE']
  );
  const [showAddDept, setShowAddDept] = useState<boolean>(false);
  const [newDeptInput, setNewDeptInput] = useState('');

  // Comments & Audit Logs
  const [activityTab, setActivityTab] = useState<'comments' | 'audit'>('comments');
  const [comments, setComments] = useState<Array<{ id: string; author: string; avatar?: string; text: string; timestamp: string }>>(
    circular.comments || []
  );
  const [newCommentText, setNewCommentText] = useState('');

  // Synchronize state when circular prop changes (e.g. next/prev navigation)
  useEffect(() => {
    setIsStarred(Boolean(circular.isStarred));
    setWorkflowStatus(circular.workflowStatus || 'Pending Review');
    setAlertType(
      circular.alertType ||
        (circular.priority === 'CRITICAL_EMERGENCY' || circular.priority === 'HIGH' ? 'Actionable' : 'Informative')
    );
    setDepartments(
      circular.departments || ['COMPLIANCE_LEGAL', 'OPERATIONS', 'GROWTH_MARKETING', 'ENGINEERING_TECH', 'TREASURY_FINANCE']
    );
    setImportantDates(
      circular.importantDates || [
        { id: '1', label: 'Publication Date', date: circular.publicationDate, description: 'Official notice gazetted by regulator' },
        { id: '2', label: 'Effective Date', date: circular.effectiveDate, description: 'Date requirements become operative' },
        ...(circular.statutoryDeadline
          ? [{ id: '3', label: 'Compliance Deadline', date: circular.statutoryDeadline, description: 'Statutory deadline for institutional audit proof' }]
          : []),
      ]
    );
    setComments(circular.comments || []);
  }, [circular]);

  const auditLogs = circular.auditLogs && circular.auditLogs.length > 0
    ? circular.auditLogs
    : [
        { id: 'l1', timestamp: `${circular.publicationDate} 08:30 WAT`, action: `Official directive gazetted by ${circular.regulator}`, author: circular.regulator },
        { id: 'l2', timestamp: `${circular.publicationDate} 09:12 WAT`, action: 'Automated regulatory ingestion & classification completed', author: 'Cogent Ingestion Engine' },
        { id: 'l3', timestamp: `${circular.publicationDate} 09:15 WAT`, action: circular.applicability?.isApplicable ? 'Applicability confirmed: matched operating licenses' : 'Applicability scanned: no direct license conflict', author: 'Applicability Engine' },
      ];

  // Key Points list
  const keyPoints = circular.keyPoints || [
    `Formal statutory enactment under ${circular.regulator} supervisory authority: Establishes binding operating rules across all regulated institutions.`,
    `Mandatory operational controls and policy concordance: Demands immediate review and update of internal standard operating procedures.`,
    `Enforced reporting & documentation obligations: All records, audit trails, and transactional evidence must be systematically preserved for examination.`,
    `Supervisory deadline & compliance escalation: Strict enforcement schedule with auto-escalation to the Chief Compliance Officer and Board Risk Committee.`,
    `Statutory liability & fine exposure: Non-compliance carries progressive daily default fines and administrative remediation orders.`,
  ];
  const displayedKeyPoints = showAllKeyPoints ? keyPoints : keyPoints.slice(0, 3);

  // Executive summary paragraphs
  const summaryParagraphs = circular.executiveSummary
    ? circular.executiveSummary.split('\n\n').filter(Boolean)
    : [
        `On ${circular.publicationDate}, the ${circular.regulator} enacted circular directive ${circular.circularNumber} concerning '${circular.subject}', formally exercising statutory supervisory powers. The directive establishes binding standards across all regulated operations to enhance systemic risk controls, eliminate supervisory deficiencies, and ensure institutional alignment with current prudential baselines.`,
        `The directive mandates comprehensive operational compliance regarding ${circular.subject.toLowerCase()}. Affected licensed institutions must review their internal risk appetite, governance controls, customer onboarding documentation, and automated technical rails. Operating teams are directed to eliminate any policy ambiguity, implement strict access and reporting mechanisms, and ensure total conformity across partner networks.`,
        `Failure to conform to the statutory mandates set out in this circular exposes the institution to regulatory sanctions, monetary penalties, administrative escalation, and potential review of operating permissions. Accountable departmental leads are required to execute immediate concordance reviews, compile remediation evidence, and secure executive sign-off.`,
      ];

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleToggleStar = () => {
    const next = !isStarred;
    setIsStarred(next);
    onUpdateCircular?.({ id: circular.id, isStarred: next });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const newCmt = {
      id: `c_${Date.now()}`,
      author: 'Compliance Officer',
      avatar: 'CO',
      text: newCommentText.trim(),
      timestamp: 'Just now',
    };
    const nextComments = [newCmt, ...comments];
    setComments(nextComments);
    onUpdateCircular?.({ id: circular.id, comments: nextComments });
    setNewCommentText('');
  };

  const handleAddDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDateLabel.trim() || !newDateVal.trim()) return;
    const newDate = {
      id: `d_${Date.now()}`,
      label: newDateLabel.trim(),
      date: newDateVal.trim(),
      description: newDateDesc.trim() || 'Custom regulatory timeline entry',
    };
    const nextDates = [...importantDates, newDate];
    setImportantDates(nextDates);
    onUpdateCircular?.({ id: circular.id, importantDates: nextDates });
    setNewDateLabel('');
    setNewDateVal('');
    setNewDateDesc('');
    setShowAddDate(false);
  };

  const handleDeleteDate = (id: string) => {
    const nextDates = importantDates.filter((d) => d.id !== id);
    setImportantDates(nextDates);
    onUpdateCircular?.({ id: circular.id, importantDates: nextDates });
  };

  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newDeptInput.trim().toUpperCase().replace(/\s+/g, '_');
    if (clean && !departments.includes(clean)) {
      const nextDepts = [...departments, clean];
      setDepartments(nextDepts);
      onUpdateCircular?.({ id: circular.id, departments: nextDepts });
    }
    setNewDeptInput('');
    setShowAddDept(false);
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">
      {/* ──────────────────────────────────────────────────────────────────────────
          1. DETAIL TOP BAR: BREADCRUMB & UTILITY ACTIONS
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Horizon Scanning</span>
          </button>
          <span className="text-slate-400">/</span>
          <span className="font-mono text-slate-700 truncate max-w-xs sm:max-w-md font-medium">
            {circular.circularNumber}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Previous / Next buttons */}
          <div className="flex items-center border border-slate-200 rounded-md bg-white">
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

          {/* Share */}
          <button
            onClick={handleCopyLink}
            className="h-8 px-2.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isCopied ? 'Link Copied' : 'Share'}</span>
          </button>

          {/* Star */}
          <button
            onClick={handleToggleStar}
            className="h-8 px-2.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition-colors"
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
            title="More Options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. TWO-COLUMN SPLIT PANEL LAYOUT
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ────────────────────────────────────────────────────────────────────────
            LEFT MAIN CONTENT PANEL (~68% WIDTH)
            ──────────────────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-2xs space-y-4">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Regulator Badge with External Link */}
              <a
                href={circular.sourceFileUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-200 transition-colors"
              >
                <span>{circular.regulator}</span>
                <ArrowUpRight className="w-3 h-3 text-slate-500" />
              </a>

              {/* Document Type Badge */}
              <span className="font-mono text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                {circular.docType || 'Circular Directive'}
              </span>

              {/* Alert Type Dropdown */}
              <div className="relative inline-flex items-center">
                <select
                  value={alertType}
                  onChange={(e) => {
                    const nextVal = e.target.value as 'Actionable' | 'Informative';
                    setAlertType(nextVal);
                    onUpdateCircular?.({ id: circular.id, alertType: nextVal });
                  }}
                  className="h-6 pl-5 pr-5 font-mono text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded appearance-none cursor-pointer hover:border-slate-300 focus:outline-hidden"
                >
                  <option value="Actionable">Actionable</option>
                  <option value="Informative">Informative</option>
                </select>
                <span
                  className={`w-1.5 h-1.5 rounded-full absolute left-2 pointer-events-none ${
                    alertType === 'Actionable' ? 'bg-amber-500' : 'bg-slate-400'
                  }`}
                />
                <ChevronDown className="w-2.5 h-2.5 text-slate-400 absolute right-1.5 pointer-events-none" />
              </div>

              {/* Relevant Toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-slate-700 font-medium ml-1">
                <input
                  type="checkbox"
                  checked={circular.applicability.isApplicable}
                  onChange={() => onToggleRelevant?.(circular.id)}
                  className="sr-only"
                />
                <div
                  className={`w-6 h-3.5 rounded-full transition-colors relative flex items-center ${
                    circular.applicability.isApplicable ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full bg-white transition-transform transform ${
                      circular.applicability.isApplicable ? 'translate-x-3' : 'translate-x-0.5'
                    }`}
                  />
                </div>
                <span>Relevant</span>
              </label>

              {/* Language Tags */}
              <div className="ml-auto flex items-center gap-1 font-mono text-[10px] text-slate-500">
                <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">EN</span>
                <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">NG</span>
              </div>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                {circular.subject}
              </h1>
              <div className="font-mono text-xs text-slate-500 mt-1.5 flex items-center gap-2 flex-wrap">
                <span>{circular.circularNumber}</span>
                <span>•</span>
                <span>Published {circular.publicationDate}</span>
                <span>•</span>
                <span>Effective {circular.effectiveDate}</span>
                {circular.statutoryDeadline && (
                  <>
                    <span>•</span>
                    <span className="text-rose-700 font-semibold">
                      Deadline: {circular.statutoryDeadline} ({circular.daysRemaining ?? 0} days remaining)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-2xs space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Executive Summary
            </div>
            <div className="space-y-3 text-xs leading-relaxed text-slate-700 font-normal">
              {summaryParagraphs.map((para, idx) => (
                <p key={`para-${idx}`}>{para}</p>
              ))}
            </div>
          </div>

          {/* Departmental Impact Briefs (CCO, COO, CTO, CFO, CEO/CRO) */}
          <RoleBriefViewer
            circularNumber={circular.circularNumber}
            executiveBriefCco={circular.executiveBriefCco}
            actionBriefCoo={circular.actionBriefCoo}
            technicalBriefProductEng={circular.technicalBriefProductEng}
            technicalBriefCto={circular.technicalBriefCto}
            financialBriefCfo={circular.financialBriefCfo}
            governanceBriefCeoCro={circular.governanceBriefCeoCro}
          />

          {/* Key Points */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Key Points
              </div>
              {keyPoints.length > 3 && (
                <button
                  onClick={() => setShowAllKeyPoints(!showAllKeyPoints)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  <span>{showAllKeyPoints ? 'View Less' : `View More (${keyPoints.length})`}</span>
                  {showAllKeyPoints ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>

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
          </div>

          {/* Departments */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-2xs space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Impacted Departments
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {departments.map((dept) => (
                <span
                  key={dept}
                  className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-700 font-mono"
                >
                  {dept}
                </span>
              ))}

              {showAddDept ? (
                <form onSubmit={handleAddDept} className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={newDeptInput}
                    onChange={(e) => setNewDeptInput(e.target.value)}
                    placeholder="e.g. TREASURY"
                    className="h-6 px-2 text-xs font-mono border border-slate-300 rounded focus:outline-hidden"
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
                  onClick={() => setShowAddDept(true)}
                  className="h-6 px-2 text-xs font-medium text-slate-500 hover:text-slate-800 border border-dashed border-slate-300 rounded inline-flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Department</span>
                </button>
              )}
            </div>
          </div>

          {/* Important Dates */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-3">
                <button
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
                    placeholder="Description / Requirement"
                    className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddDate(false)}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800"
                  >
                    Save Date
                  </button>
                </div>
              </form>
            )}

            {/* Dates Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2 px-3 w-36">Date</th>
                    <th className="py-2 px-3 w-44">Label</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-2 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importantDates.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                        {d.date}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {d.label}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {d.description}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => handleDeleteDate(d.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Comments & Audit Logs */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-2">
              <button
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
                {/* Add Comment input */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                    SJ
                  </div>
                  <div className="flex-1 space-y-2">
                    <textarea
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Add an internal compliance note or tag team member..."
                      rows={2}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:bg-white focus:border-slate-400"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!newCommentText.trim()}
                        className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        <span>Post Note</span>
                      </button>
                    </div>
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
            RIGHT SIDEBAR (~32% WIDTH)
            ──────────────────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-5">
          {/* Box 1: Actions */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Actions
            </div>

            {/* Workflow Status */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Workflow Status
              </label>
              <div className="relative">
                <select
                  value={workflowStatus}
                  onChange={(e) => {
                    const nextVal = e.target.value as 'Pending Review' | 'In Progress' | 'Reviewed' | 'Closed';
                    setWorkflowStatus(nextVal);
                    onUpdateCircular?.({ id: circular.id, workflowStatus: nextVal });
                  }}
                  className="w-full h-8 pl-3 pr-8 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-md appearance-none hover:border-slate-300 focus:outline-hidden"
                >
                  <option value="Pending Review">Pending Review</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Reviewed">Reviewed</option>
                  <option value="Closed">Closed</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Assignee
              </label>
              <div className="relative">
                <select className="w-full h-8 pl-3 pr-8 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-md appearance-none hover:border-slate-300 focus:outline-hidden">
                  <option value="CCO">Chief Compliance Officer</option>
                  <option value="AM">Alex Marco</option>
                  <option value="UN">Unassigned</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-1.5 pt-1">
              <button
                onClick={handleCopyLink}
                className="w-full py-1.5 px-3 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{isCopied ? 'Link Copied!' : 'Copy Permanent Link'}</span>
              </button>

              <button
                onClick={() => onExportBrief?.('pdf')}
                className="w-full py-1.5 px-3 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-md flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export Board Brief (PDF)</span>
              </button>
            </div>
          </div>

          {/* Box 2: Source & Immutable Archive */}
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

              {/* Primary action: Read Captured Transcript (Guaranteed availability against 404s) */}
              <button
                onClick={() => setShowArchiveDrawer(true)}
                className="w-full py-2 px-3 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-200" />
                <span>Read Captured Statutory Text</span>
              </button>

              {/* Secondary action: External Official Link */}
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
                <span>Regulatory websites frequently encounter link rot or 404 changes. Cogent maintains an immutable, tamper-evident captured copy.</span>
              </div>
            </div>
          </div>

          {/* Box 3: Severity Matrix */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Severity Matrix
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Risk Assessment Score</span>
                <span className="font-mono text-xs font-bold text-slate-900">
                  {circular.severityMatrixCode || 'G1 | 89%'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Enforcement Tier</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      circular.priority === 'CRITICAL_EMERGENCY'
                        ? 'bg-rose-500'
                        : circular.priority === 'HIGH'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <span>{circular.priority}</span>
                </span>
              </div>
              {circular.penaltyEscalationProjection && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                    Projected Daily Fine Exposure
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                    ₦{(circular.penaltyEscalationProjection.accruedDailyFineNaira / 1_000_000).toFixed(2)}M
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Box 4: Nature of Document */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Nature of Document
            </div>
            <div className="relative">
              <select
                value={docNature}
                onChange={(e) => setDocNature(e.target.value)}
                className="w-full h-8 pl-3 pr-8 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-md appearance-none hover:border-slate-300 focus:outline-hidden"
              >
                <option value="Mandatory Directive">Mandatory Directive</option>
                <option value="Statutory Rule">Statutory Rule</option>
                <option value="Regulatory Advisory">Regulatory Advisory</option>
                <option value="Supervisory Guidelines">Supervisory Guidelines</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Box 5: Alert Info */}
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
                  {(circular.topics || ['Payments', 'Fintech', 'AML/CFT', 'Prudential']).map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-mono text-slate-700">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Related Documents</span>
                <span className="font-mono text-xs text-slate-900">
                  {circular.amends?.length ? `${circular.amends.length} Amending Circulars` : 'Primary Enactment (0 amendments)'}
                </span>
              </div>
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
                onClick={() => setShowArchiveDrawer(false)}
                className="btn-base btn-secondary btn-sm"
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
