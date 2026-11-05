'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Star,
  ExternalLink,
  Share2,
  Copy,
  Check,
  FileText,
  User,
  ChevronRight,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  Scale,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  History,
  FileCheck2,
  Send,
  Loader2,
} from 'lucide-react';
import { RegulatoryInstrumentPresentation, StatutorySection } from '../types';

interface InstrumentDetailPageProps {
  instrument: RegulatoryInstrumentPresentation;
  sections?: StatutorySection[];
  isLoadingSections?: boolean;
  onBack: () => void;
  onViewObligations: () => void;
  onViewDoc: () => void;
  onToggleStar: (instrumentId: string) => void;
  onUpdateInstrument?: (instrumentId: string, updates: Partial<RegulatoryInstrumentPresentation>) => Promise<void>;
}

export function InstrumentDetailPage({
  instrument,
  sections = [],
  isLoadingSections = false,
  onBack,
  onViewObligations,
  onViewDoc,
  onToggleStar,
  onUpdateInstrument,
}: InstrumentDetailPageProps) {
  const [selectedOwner, setSelectedOwner] = useState<string>(
    instrument.owner || 'Chief Compliance Officer'
  );
  const [isSavingOwner, setIsSavingOwner] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [showAllRequirements, setShowAllRequirements] = useState(false);

  // Collaboration Card State
  const [activeCollabTab, setActiveCollabTab] = useState<'comments' | 'audit_logs' | 'policies'>('comments');
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [localComments, setLocalComments] = useState<any[]>(instrument.comments || []);
  const [localAuditLogs, setLocalAuditLogs] = useState<any[]>(instrument.auditLogs || []);

  const formatJurisdiction = (code: string) => {
    switch (code) {
      case 'NG':
        return { name: 'Nigeria', flag: '🇳🇬' };
      case 'GH':
        return { name: 'Ghana', flag: '🇬🇭' };
      case 'KE':
        return { name: 'Kenya', flag: '🇰🇪' };
      case 'ZA':
        return { name: 'South Africa', flag: '🇿🇦' };
      case 'SUPRANATIONAL':
        return { name: 'Supranational', flag: '🌐' };
      default:
        return { name: 'Pan-African', flag: '🌍' };
    }
  };

  const jur = formatJurisdiction(instrument.jurisdiction);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyCitation = () => {
    navigator.clipboard.writeText(instrument.officialCitation);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  const handleOwnerChange = async (newOwner: string) => {
    setSelectedOwner(newOwner);
    setIsSavingOwner(true);
    try {
      const res = await fetch(`/api/library/${encodeURIComponent(instrument.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: newOwner }),
      });
      if (res.ok) {
        setLocalAuditLogs((prev) => [
          {
            id: `audit-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: `Assigned Regulatory Lead updated to: ${newOwner}`,
            author: 'Chief Compliance Officer',
          },
          ...prev,
        ]);
        if (onUpdateInstrument) {
          onUpdateInstrument(instrument.id, { owner: newOwner });
        }
      }
    } catch (err) {
      console.error('Failed to update owner', err);
    } finally {
      setIsSavingOwner(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    const newCommentObj = {
      id: `comm-${Date.now()}`,
      author: 'Chief Compliance Officer',
      role: 'Head of Regulatory Affairs',
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(`/api/library/${encodeURIComponent(instrument.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newComment: newCommentObj }),
      });

      if (res.ok) {
        setLocalComments((prev) => [...prev, newCommentObj]);
        setLocalAuditLogs((prev) => [
          {
            id: `audit-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'Statutory comment added',
            author: 'Chief Compliance Officer',
          },
          ...prev,
        ]);
        setCommentText('');
      }
    } catch (err) {
      console.error('Failed to submit comment', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const totalObligationsCount =
    instrument.totalObligationsCount ||
    sections.reduce(
      (acc, sec) => acc + (sec.obligationsCount || sec.obligations?.length || 0),
      0
    );
  const effectiveSectionsCount =
    sections.length > 0 ? sections.length : (instrument.sectionsCount || 0);

  // Requirements display
  const keyRequirements = instrument.keyRequirementAreas || [];
  const visibleRequirements = showAllRequirements
    ? keyRequirements
    : keyRequirements.slice(0, 3);

  // Policies list
  const defaultPolicies = instrument.policies || [
    {
      id: 'pol-1',
      code: 'POL-COMP-01',
      title: 'Enterprise Regulatory Compliance & Supervisory Engagement Policy',
      status: 'ACTIVE',
      mappedObligationsCount: Math.min(totalObligationsCount, 8),
    },
    {
      id: 'pol-2',
      code: 'POL-OPS-03',
      title: 'Operational Risk, Consumer Protection & Product Disclosure Manual',
      status: 'UNDER_REVIEW',
      mappedObligationsCount: Math.min(totalObligationsCount, 5),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Regulation Library</span>
          </button>
          <span>/</span>
          <span className="text-slate-400">Regulatory Instrument List</span>
          <span>/</span>
          <span className="font-semibold text-slate-900 line-clamp-1">
            {instrument.shortTitle}
          </span>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onToggleStar(instrument.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              instrument.isStarred
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                instrument.isStarred ? 'text-amber-500 fill-amber-500' : 'text-slate-400'
              }`}
            />
            <span>{instrument.isStarred ? 'Starred' : 'Star'}</span>
          </button>

          <button
            type="button"
            onClick={onViewDoc}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>View Doc</span>
          </button>
        </div>
      </div>

      {/* 2. Instrument Header Details */}
      <div className="space-y-3">
        {/* Badges Bar */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
            <span>{jur.flag}</span>
            <span>{jur.name}</span>
          </span>
          <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
            {instrument.regulatorName} ({instrument.regulator})
          </span>
          <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
            {instrument.instrumentType.replace(/_/g, ' ')}
          </span>
          <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
            {instrument.domain.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {instrument.fullTitle}
        </h1>

        {/* Citation & Enactment Subtitle */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="font-mono text-slate-600 font-medium">
            {instrument.officialCitation}
          </span>
          <span>·</span>
          <span>Enacted {instrument.year}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Active Statutory Law</span>
          </span>
        </div>
      </div>

      {/* 3. Main 70/30 Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
        {/* Left Column (70% = 7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section: Overview */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Statutory Overview & Purpose
            </h2>
            <div className="text-xs text-slate-700 leading-relaxed">
              <p>
                {instrument.overview || instrument.description || (
                  <>
                    The {instrument.shortTitle} establishes enforceable supervisory requirements,
                    operational boundaries, and institutional reporting duties under the authority of{' '}
                    {instrument.regulatorName} ({instrument.regulator}). It establishes binding compliance
                    benchmarks designed to safeguard systemic financial stability, institutional soundness,
                    and consumer trust.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Section: Scope of Applicability */}
          {instrument.scope && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Scope of Applicability
              </h2>
              <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
                <p>{instrument.scope}</p>
              </div>
            </div>
          )}

          {/* Section: Key Requirement Areas (Numbered list with expand/collapse) */}
          {keyRequirements.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Key Requirement Areas ({keyRequirements.length})
                </h2>
                {keyRequirements.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllRequirements(!showAllRequirements)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900"
                  >
                    <span>{showAllRequirements ? 'View Less' : `View All (${keyRequirements.length})`}</span>
                    {showAllRequirements ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {visibleRequirements.map((req, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg flex items-start gap-3"
                  >
                    <span className="font-mono text-xs font-bold text-slate-900 bg-white border border-slate-200 w-6 h-6 rounded flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-slate-900">
                        {req.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {req.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Decomposed Statutory Sections Preview */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Decomposed Statutory Sections ({effectiveSectionsCount})
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Extracted statutory clauses, provisions, and decomposed compliance duties.
                </p>
              </div>
              <button
                type="button"
                onClick={onViewObligations}
                className="text-xs font-medium text-slate-900 hover:text-slate-700 hover:underline inline-flex items-center gap-1"
              >
                <span>Obligations Register ({totalObligationsCount})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {isLoadingSections ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg animate-pulse space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-5/6" />
                  </div>
                ))}
              </div>
            ) : sections.length > 0 ? (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {sections.map((sec, idx) => (
                  <div
                    key={sec.id || idx}
                    onClick={onViewObligations}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-lg flex items-center justify-between gap-3 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-[11px] font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded shrink-0">
                        {sec.sectionReference}
                      </span>
                      <span className="text-xs font-medium text-slate-900 group-hover:text-slate-800 truncate">
                        {sec.sectionHeading}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded shrink-0">
                      {sec.obligationsCount || sec.obligations?.length || 0} obligations
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg space-y-1">
                <Layers className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-medium text-slate-700">No Decomposed Sections Extracted</p>
                <p className="text-[11px] text-slate-500">
                  Click below to view the obligations register or ingest full statutory text.
                </p>
              </div>
            )}
          </div>

          {/* Section: Collaboration Card (Comments, Audit Logs, Policies tabs) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {/* Tabs Header */}
            <div className="border-b border-slate-200 px-5 pt-4 bg-slate-50/50 flex items-center gap-6">
              <button
                type="button"
                onClick={() => setActiveCollabTab('comments')}
                className={`pb-3 text-xs font-semibold tracking-wide inline-flex items-center gap-1.5 border-b-2 transition-all ${
                  activeCollabTab === 'comments'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Comments ({localComments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCollabTab('audit_logs')}
                className={`pb-3 text-xs font-semibold tracking-wide inline-flex items-center gap-1.5 border-b-2 transition-all ${
                  activeCollabTab === 'audit_logs'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Audit Logs ({localAuditLogs.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCollabTab('policies')}
                className={`pb-3 text-xs font-semibold tracking-wide inline-flex items-center gap-1.5 border-b-2 transition-all ${
                  activeCollabTab === 'policies'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Policies ({defaultPolicies.length})</span>
              </button>
            </div>

            {/* Tab 1: Comments */}
            {activeCollabTab === 'comments' && (
              <div className="p-5 space-y-4">
                <form onSubmit={handleAddComment} className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Statutory Interpretation / Operational Note
                  </label>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={2}
                    placeholder="Add a statutory note, legal interpretation, or operational commentary..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!commentText.trim() || isSubmittingComment}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium rounded-lg shadow-xs transition-colors"
                    >
                      {isSubmittingComment ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Post Comment</span>
                    </button>
                  </div>
                </form>

                <div className="border-t border-slate-100 pt-3 space-y-3">
                  {localComments.length > 0 ? (
                    localComments.map((comment: any, idx: number) => (
                      <div key={comment.id || idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                              {comment.author?.charAt(0) || 'C'}
                            </span>
                            <span className="font-semibold text-slate-900">{comment.author}</span>
                            <span className="text-[10px] text-slate-500 font-mono">({comment.role || 'Compliance'})</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed pl-7">
                          {comment.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-4">
                      No comments recorded yet. Add operational notes above.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Audit Logs */}
            {activeCollabTab === 'audit_logs' && (
              <div className="p-5">
                <div className="space-y-3">
                  {localAuditLogs.length > 0 ? (
                    localAuditLogs.map((log: any, idx: number) => (
                      <div key={log.id || idx} className="flex items-start gap-3 text-xs">
                        <div className="w-2 h-2 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                        <div className="flex-1 space-y-0.5">
                          <p className="text-slate-800 font-medium">{log.action}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                            <span>{log.author}</span>
                            <span>·</span>
                            <span>{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-4">
                      No audit history logged.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Linked Policies */}
            {activeCollabTab === 'policies' && (
              <div className="p-5 space-y-3">
                <p className="text-xs text-slate-600">
                  Internal operational policies mapped to this statutory instrument:
                </p>
                <div className="space-y-2">
                  {defaultPolicies.map((pol) => (
                    <div
                      key={pol.id}
                      className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                            {pol.code}
                          </span>
                          <span className="font-medium text-slate-900">{pol.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {pol.mappedObligationsCount} statutory obligations satisfied
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-700 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {pol.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar (30% = 3 cols) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Actions & Ownership Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Actions & Ownership
            </h3>

            {/* Owner Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                <span>Assigned Regulatory Lead:</span>
                {isSavingOwner && <span className="text-[10px] text-slate-400">Saving...</span>}
              </label>
              <select
                value={selectedOwner}
                onChange={(e) => handleOwnerChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="Chief Compliance Officer">Chief Compliance Officer (CCO)</option>
                <option value="Head of Legal & Regulatory">Head of Legal & Regulatory</option>
                <option value="Chief Risk Officer">Chief Risk Officer (CRO)</option>
                <option value="Head of Internal Audit">Head of Internal Audit</option>
                <option value="Unassigned">Unassigned</option>
              </select>
            </div>

            {/* Share & Copy Link */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCitation}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors"
              >
                {copiedCitation ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{copiedCitation ? 'Copied' : 'Citation'}</span>
              </button>
            </div>

            {/* Primary CTA: View Obligations */}
            <button
              type="button"
              onClick={onViewObligations}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
            >
              <span>View Obligations ({totalObligationsCount})</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Secondary CTA: Control Monitoring */}
            <button
              type="button"
              onClick={onViewObligations}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <span>Control Monitoring & Applicability</span>
            </button>
          </div>

          {/* Official Source Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Official Source
            </h3>

            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-900">{instrument.regulatorName}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Official statutory publication issued under gazette mandate.
              </p>
              {instrument.sourceFileUrl && (
                <div className="pt-2">
                  <a
                    href={instrument.sourceFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-900 hover:underline font-medium"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Official Gazette Document ↗</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Statutory Details Card (Single unified card, NO DUPLICATE RENDER) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Statutory Details
            </h3>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500">Legal Classification</span>
                <span className="font-mono text-slate-900 font-medium">
                  {instrument.classification.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500">Enactment Year</span>
                <span className="font-mono text-slate-900">{instrument.year}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500">Publication Date</span>
                <span className="font-mono text-slate-900">
                  {instrument.publicationDate || 'Gazette Verified'}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500">Effective Date</span>
                <span className="font-mono text-slate-900">
                  {instrument.effectiveDate || 'In Force'}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500">Decomposed Sections</span>
                <span className="font-mono font-bold text-slate-900">
                  {effectiveSectionsCount} Sections
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500">Total Obligations</span>
                <span className="font-mono font-bold text-slate-900">
                  {totalObligationsCount} Duties
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
