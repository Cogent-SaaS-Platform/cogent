'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Building,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  MessageSquare,
  Maximize2,
  Minimize2,
  ArrowRight,
  Scale,
  ShieldCheck,
  Hash,
  Clock,
  Loader2,
} from 'lucide-react';
import { InspectorItemData, InspectorAction } from './types';

export interface DetailInspectorProps {
  item: InspectorItemData;
  currentIndex: number;
  totalCount: number;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
  onOpenReference?: (refId: string) => void;
  isDualPaneOpen?: boolean;
  onToggleMaximize?: () => void;
  isMaximized?: boolean;
  actions?: InspectorAction[];
}

export function DetailInspector({
  item,
  currentIndex,
  totalCount,
  onNext,
  onPrevious,
  onClose,
  onOpenReference,
  isDualPaneOpen = false,
  onToggleMaximize,
  isMaximized = false,
  actions,
}: DetailInspectorProps) {
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [criteriaOpen, setCriteriaOpen] = useState(true);
  const [riskOpen, setRiskOpen] = useState(true);
  const [departmentsOpen, setDepartmentsOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [openCustomSections, setOpenCustomSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    item.customSections?.forEach((sec) => {
      initial[sec.id] = sec.defaultOpen !== false;
    });
    return initial;
  });

  const [noteInput, setNoteInput] = useState('');
  const [notesList, setNotesList] = useState<Array<{ id: string; author: string; text: string; time: string }>>([
    {
      id: 'note-1',
      author: 'Compliance Officer',
      text: 'Automated statutory assessment verified against official regulatory gazette.',
      time: 'Just now',
    },
  ]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyCode = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(item.referenceCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleAddNote = () => {
    if (noteInput.trim()) {
      setNotesList((prev) => [
        {
          id: `note-${Date.now()}`,
          author: 'Compliance Officer',
          text: noteInput.trim(),
          time: 'Just now',
        },
        ...prev,
      ]);
      setNoteInput('');
    }
  };

  const toggleCustomSection = (id: string) => {
    setOpenCustomSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getStatusBadge = () => {
    switch (item.statusVariant) {
      case 'healthy':
        return (
          <span className="pill-status pill-healthy">
            <span className="pill-dot pill-dot-healthy" />
            {item.statusText}
          </span>
        );
      case 'watch':
        return (
          <span className="pill-status pill-watch">
            <span className="pill-dot pill-dot-watch" />
            {item.statusText}
          </span>
        );
      case 'critical':
        return (
          <span className="pill-status pill-critical">
            <span className="pill-dot pill-dot-critical" />
            {item.statusText}
          </span>
        );
      case 'neutral':
        return (
          <span className="pill-status pill-neutral">
            <span className="pill-dot pill-dot-neutral" />
            {item.statusText}
          </span>
        );
      default:
        return (
          <span className="pill-status pill-info">
            <span className="pill-dot pill-dot-info" />
            {item.statusText}
          </span>
        );
    }
  };

  // Combine actions from prop and item data
  const combinedActions = actions || item.actions || [];

  return (
    <div
      id="contextual-side-inspector"
      className={`h-full bg-white border-l border-[#DDE3EE] md:rounded-l-2xl shadow-drawer flex flex-col justify-between overflow-hidden transition-all duration-200 select-none ${
        isMaximized
          ? 'w-full'
          : isDualPaneOpen
          ? 'w-full lg:w-[480px] xl:w-[500px]'
          : 'w-full sm:w-[520px] lg:w-[560px]'
      }`}
    >
      {/* 1. Header with < 1 / N > Stepper (per uio.mp4 & Zango) */}
      <div className="p-4 border-b border-[#DDE3EE] flex items-center justify-between gap-3 bg-white sticky top-0 z-10">
        {/* Stepper Pagination */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center rounded-lg border border-[#DDE3EE] bg-[#F9FAFC] p-0.5 shadow-2xs">
            <button
              onClick={onPrevious}
              disabled={totalCount <= 1}
              className="p-1 rounded text-[#4B5565] hover:text-[#0B0F1A] hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Previous record (Left Arrow)"
              aria-label="Previous record"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 text-xs font-mono font-semibold text-[#0B0F1A] select-none">
              {totalCount > 0 ? currentIndex + 1 : 1} / {Math.max(totalCount, 1)}
            </span>
            <button
              onClick={onNext}
              disabled={totalCount <= 1}
              className="p-1 rounded text-[#4B5565] hover:text-[#0B0F1A] hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Next record (Right Arrow)"
              aria-label="Next record"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-[#F5F6FA] text-[#4B5565] transition-colors"
            title="Click to copy reference code"
          >
            <span className="font-mono text-xs font-semibold truncate max-w-[140px] sm:max-w-[200px]">
              {item.referenceCode}
            </span>
            {copiedCode ? (
              <Check className="w-3 h-3 text-[#10B981]" />
            ) : (
              <Copy className="w-3 h-3 text-[#8D99AE]" />
            )}
          </button>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyLink}
            className="p-1.5 text-[#8D99AE] hover:text-[#0B0F1A] hover:bg-[#F5F6FA] rounded-lg transition-colors"
            title={copied ? 'Deep-Link Copied!' : 'Copy direct link to this record'}
            aria-label="Copy direct link"
          >
            {copied ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4 text-[#4B5565]" />}
          </button>

          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className="p-1.5 text-[#8D99AE] hover:text-[#0B0F1A] hover:bg-[#F5F6FA] rounded-lg transition-colors hidden sm:block"
              title={isMaximized ? 'Restore Width' : 'Expand Inspector'}
              aria-label="Toggle expand"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4 text-[#4B5565]" /> : <Maximize2 className="w-4 h-4 text-[#4B5565]" />}
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 text-[#8D99AE] hover:text-[#0B0F1A] hover:bg-[#F5F6FA] rounded-lg transition-colors"
            title="Close Inspector (Esc)"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4 text-[#4B5565]" />
          </button>
        </div>
      </div>

      {/* 2. Scrollable Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Title, Badges & Classification */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadge()}

            {item.regulatorCode && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#0B0F1A] text-white">
                {item.regulatorCode}
              </span>
            )}

            {item.strictnessType && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F5F6FA] text-[#4B5565] border border-[#DDE3EE]">
                {item.strictnessType}
              </span>
            )}

            {item.suggestedDeadlineDays !== undefined && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#F59E0B]" />
                <span>{item.suggestedDeadlineDays}d remaining</span>
              </span>
            )}
          </div>

          <h2 className="text-base sm:text-lg font-bold text-[#0B0F1A] leading-snug">
            {item.title}
          </h2>

          {item.subtitle && (
            <p className="text-xs text-[#4B5565] font-medium">{item.subtitle}</p>
          )}

          <p className="text-xs text-[#4B5565] leading-relaxed pt-1">
            {item.summary}
          </p>
        </div>

        {/* 3. 4-Metric Strip Container (per uio.mp4) */}
        {item.metrics && item.metrics.length > 0 && (
          <div className="cogent-metric-strip grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F9FAFC] border border-[#DDE3EE] rounded-xl p-3.5">
            {item.metrics.slice(0, 4).map((metric, idx) => (
              <div key={idx} className="space-y-0.5 min-w-0">
                <span className="text-[10px] uppercase font-semibold text-[#8D99AE] block tracking-wider truncate">
                  {metric.label}
                </span>
                <span className="text-sm font-bold text-[#0B0F1A] block font-mono truncate">
                  {metric.value}
                </span>
                {metric.subtext && (
                  <span className="text-[10px] text-[#4B5565] block truncate font-medium">
                    {metric.subtext}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 4. Statutory Evidence Action Button (Zango 2:10) */}
        {item.statutoryReference && onOpenReference && (
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded border border-slate-200 bg-white text-slate-700 flex items-center justify-center shrink-0">
                <Scale className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Official Statutory Evidence
                </span>
                <span className="text-xs font-semibold text-slate-900 block truncate">
                  {item.statutoryReference.statutoryInstrumentTitle}
                </span>
                <span className="text-xs text-slate-500 block font-mono">
                  Clause: {item.statutoryReference.citationClause}
                </span>
              </div>
            </div>

            <button
              onClick={() => onOpenReference(item.statutoryReference!.id)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded transition-colors shadow-xs shrink-0"
              title="Open dual-pane statutory evidence viewer"
            >
              <span>Inspect Evidence</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* 5. Injected Custom Sections from Caller */}
        {item.customSections && item.customSections.length > 0 && (
          <div className="space-y-3">
            {item.customSections.map((sec) => {
              const isOpen = openCustomSections[sec.id] !== false;
              return (
                <div key={sec.id} className="cogent-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleCustomSection(sec.id)}
                    className="w-full p-3.5 bg-[#F9FAFC] border-b border-[#DDE3EE] flex items-center justify-between text-xs font-bold text-[#0B0F1A] hover:bg-[#F5F6FA] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {sec.icon}
                      <span>{sec.title}</span>
                      {sec.badge !== undefined && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#EEF2FF] text-[#2A4BFF] font-semibold">
                          {sec.badge}
                        </span>
                      )}
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#8D99AE]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#8D99AE]" />
                    )}
                  </button>

                  {isOpen && <div className="p-3.5">{sec.content}</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* 6. Collapsible Accordion: Assessment Criteria Checklist */}
        {item.criteria && item.criteria.length > 0 && (
          <div className="cogent-card overflow-hidden">
            <button
              type="button"
              onClick={() => setCriteriaOpen(!criteriaOpen)}
              className="w-full p-3.5 bg-[#F9FAFC] border-b border-[#DDE3EE] flex items-center justify-between text-xs font-bold text-[#0B0F1A] hover:bg-[#F5F6FA] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>Assessment Criteria Checklist</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#EEF2FF] text-[#2A4BFF] font-semibold">
                  {item.criteria.length}
                </span>
              </div>
              {criteriaOpen ? <ChevronUp className="w-4 h-4 text-[#8D99AE]" /> : <ChevronDown className="w-4 h-4 text-[#8D99AE]" />}
            </button>

            {criteriaOpen && (
              <div className="p-3.5 divide-y divide-[#E8EDF5] space-y-3">
                {item.criteria.map((crit) => (
                  <div key={crit.id} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {crit.status === 'MET' && (
                            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                          )}
                          {crit.status === 'PARTIAL' && (
                            <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />
                          )}
                          {crit.status === 'NOT_MET' && (
                            <XCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
                          )}
                          <span className="text-xs font-semibold text-[#0B0F1A]">
                            {crit.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#4B5565] leading-relaxed pl-6">
                          {crit.description}
                        </p>
                      </div>

                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 shrink-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            crit.status === 'MET'
                              ? 'bg-emerald-500'
                              : crit.status === 'PARTIAL'
                              ? 'bg-amber-500'
                              : 'bg-rose-600'
                          }`}
                        />
                        {crit.status === 'MET'
                          ? 'Met'
                          : crit.status === 'PARTIAL'
                          ? 'Partial'
                          : 'Not Met'}
                      </span>
                    </div>

                    {/* Deterministic Evaluation Callout Box */}
                    {crit.aiReason && (
                      <div className="ml-6 p-2.5 rounded-md bg-slate-50 border border-slate-200 space-y-1">
                        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                          Deterministic Rule Evaluation
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {crit.aiReason}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 7. Collapsible Accordion: Regulatory Risk & Penalty Analysis */}
        {(item.riskAnalysis || item.statutoryPenaltyNaira) && (
          <div className="cogent-card overflow-hidden">
            <button
              type="button"
              onClick={() => setRiskOpen(!riskOpen)}
              className="w-full p-3.5 bg-[#F9FAFC] border-b border-[#DDE3EE] flex items-center justify-between text-xs font-bold text-[#0B0F1A] hover:bg-[#F5F6FA] transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
                <span>Statutory Penalty & Fine Exposure</span>
              </div>
              {riskOpen ? <ChevronUp className="w-4 h-4 text-[#8D99AE]" /> : <ChevronDown className="w-4 h-4 text-[#8D99AE]" />}
            </button>

            {riskOpen && (
              <div className="p-3.5 space-y-3">
                {item.statutoryPenaltyNaira !== undefined && (
                  <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#991B1B] block tracking-wider">
                        Baseline Statutory Sanction
                      </span>
                      <span className="text-base font-bold font-mono text-[#991B1B]">
                        ₦{item.statutoryPenaltyNaira.toLocaleString('en-NG')}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-[#991B1B] bg-white px-2 py-0.5 rounded border border-[#FECACA]">
                      Non-Negotiable
                    </span>
                  </div>
                )}
                {item.riskAnalysis && (
                  <p className="text-xs text-[#4B5565] leading-relaxed">
                    {item.riskAnalysis}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 8. Collapsible Accordion: Departmental Ownership */}
        {item.departmentOwners && item.departmentOwners.length > 0 && (
          <div className="cogent-card overflow-hidden">
            <button
              type="button"
              onClick={() => setDepartmentsOpen(!departmentsOpen)}
              className="w-full p-3.5 bg-[#F9FAFC] border-b border-[#DDE3EE] flex items-center justify-between text-xs font-bold text-[#0B0F1A] hover:bg-[#F5F6FA] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-[#2A4BFF]" />
                <span>Impacted Institutional Departments</span>
              </div>
              {departmentsOpen ? <ChevronUp className="w-4 h-4 text-[#8D99AE]" /> : <ChevronDown className="w-4 h-4 text-[#8D99AE]" />}
            </button>

            {departmentsOpen && (
              <div className="p-3.5 flex flex-wrap gap-2">
                {item.departmentOwners.map((dept, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#EEF2FF] text-[#2A4BFF] border border-[#C7D2FE]"
                  >
                    {dept.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 9. Collapsible Accordion: Compliance Notes & Audit Trail (uio.mp4) */}
        <div className="cogent-card overflow-hidden">
          <button
            type="button"
            onClick={() => setNotesOpen(!notesOpen)}
            className="w-full p-3.5 bg-[#F9FAFC] border-b border-[#DDE3EE] flex items-center justify-between text-xs font-bold text-[#0B0F1A] hover:bg-[#F5F6FA] transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#4B5565]" />
              <span>Compliance Notes & Audit Trail</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#F5F6FA] text-[#8D99AE]">
                {notesList.length}
              </span>
            </div>
            {notesOpen ? <ChevronUp className="w-4 h-4 text-[#8D99AE]" /> : <ChevronDown className="w-4 h-4 text-[#8D99AE]" />}
          </button>

          {notesOpen && (
            <div className="p-3.5 space-y-3">
              {/* Note input box */}
              <div className="space-y-2">
                <textarea
                  rows={2}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Record an attestation note or compliance remark..."
                  className="w-full p-2.5 text-xs border border-[#DDE3EE] rounded-lg focus:outline-none focus:border-[#2A4BFF] resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={!noteInput.trim()}
                    className="btn-base btn-primary btn-xs disabled:opacity-40"
                  >
                    Save Note
                  </button>
                </div>
              </div>

              {/* Existing notes */}
              <div className="space-y-2 pt-2 border-t border-[#E8EDF5]">
                {notesList.map((note) => (
                  <div key={note.id} className="p-2.5 rounded-lg bg-[#F9FAFC] border border-[#E8EDF5] text-xs text-[#4B5565] space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-[#8D99AE]">
                      <span className="font-semibold text-[#0B0F1A]">{note.author}</span>
                      <span>{note.time}</span>
                    </div>
                    <p className="leading-relaxed">{note.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Footer Action Controls */}
      <div className="p-4 border-t border-[#DDE3EE] bg-[#F9FAFC] space-y-3">
        {/* Primary/Secondary custom actions if configured */}
        {combinedActions.length > 0 && (
          <div className="flex items-center gap-2 justify-end flex-wrap">
            {combinedActions.map((act) => (
              <button
                key={act.id}
                onClick={act.onClick}
                disabled={act.disabled || act.loading}
                title={act.tooltip}
                className={`btn-base btn-xs gap-1.5 shadow-2xs ${
                  act.variant === 'primary'
                    ? 'btn-primary'
                    : act.variant === 'danger'
                    ? 'bg-[#EF4444] text-white hover:bg-[#DC2626]'
                    : act.variant === 'ghost'
                    ? 'btn-ghost'
                    : 'btn-secondary'
                }`}
              >
                {act.loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {!act.loading && act.icon}
                <span>{act.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 text-xs text-[#8D99AE]">
          {item.auditMetadata ? (
            <div
              className="flex items-center gap-1.5 font-mono text-[10px] text-[#4B5565] truncate"
              title={`Verified under CAMA 2020: ${item.auditMetadata.sha256Hash}`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
              <span className="truncate">CAMA SHA-256: {item.auditMetadata.sha256Hash.slice(0, 12)}…</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] text-[#8D99AE]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Immutable Regulatory Record</span>
            </div>
          )}

          <button
            onClick={onClose}
            className="btn-base btn-secondary btn-xs shrink-0"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
