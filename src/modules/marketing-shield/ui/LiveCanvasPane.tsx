'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
  FileText,
  Check,
  AlertTriangle,
  Scale,
  Download,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  MarketingCampaign,
  ExtractedPromotionalClaim,
  StructuredFinding,
  PRODUCT_CATEGORIES_CATALOG,
} from '../types';
import { PlanTier } from '@/lib/plans';

interface LiveCanvasPaneProps {
  campaign: MarketingCampaign;
  canvasContent: string;
  findings: StructuredFinding[];
  extractedClaims: ExtractedPromotionalClaim[];
  onCanvasChange: (newText: string) => void;
  onClaimStatusChange: (claimId: string, newStatus: 'APPROVED' | 'REJECTED') => Promise<void>;
  onExportDossierClick: () => void;
  onUpgradeRequired?: (modalState: {
    featureName?: string;
    requiredPlan?: PlanTier;
    reason?: string;
    isReadOnly?: boolean;
    currentUsage?: number;
    maxAllowed?: number;
  }) => void;
}

export const LiveCanvasPane: React.FC<LiveCanvasPaneProps> = ({
  campaign,
  canvasContent,
  findings,
  extractedClaims,
  onCanvasChange,
  onClaimStatusChange,
  onExportDossierClick,
  onUpgradeRequired,
}) => {
  const [activeTab, setActiveTab] = useState<'canvas' | 'claims' | 'dossier'>('canvas');

  // Selection & Inline Rewrite Menu State
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [lastRewriteInstruction, setLastRewriteInstruction] = useState<string>(
    'Make compliant with flagged regulatory rules.'
  );
  const [isGeneratingRewrite, setIsGeneratingRewrite] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [highlightAnimation, setHighlightAnimation] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const charCount = canvasContent.length;
  const wordCount = canvasContent.trim() ? canvasContent.trim().split(/\s+/).length : 0;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  // Compute inline red/amber violation segments inside canvasContent
  const highlightedCopySegments = useMemo(() => {
    if (!canvasContent || findings.length === 0) return null;

    interface MatchSpan {
      start: number;
      end: number;
      finding: StructuredFinding;
    }

    const spans: MatchSpan[] = [];
    const lowerCopy = canvasContent.toLowerCase();

    for (const f of findings) {
      const needle = f.claimElement?.trim();
      if (!needle || needle.length < 2) continue;
      const idx = lowerCopy.indexOf(needle.toLowerCase());
      if (idx !== -1) {
        spans.push({
          start: idx,
          end: idx + needle.length,
          finding: f,
        });
      }
    }

    if (spans.length === 0) return null;

    spans.sort((a, b) => a.start - b.start);
    const nonOverlapping: MatchSpan[] = [];
    let cursor = 0;
    for (const sp of spans) {
      if (sp.start >= cursor) {
        nonOverlapping.push(sp);
        cursor = sp.end;
      }
    }

    const parts: Array<{
      text: string;
      finding?: StructuredFinding;
    }> = [];
    let pos = 0;
    for (const sp of nonOverlapping) {
      if (sp.start > pos) {
        parts.push({ text: canvasContent.slice(pos, sp.start) });
      }
      parts.push({
        text: canvasContent.slice(sp.start, sp.end),
        finding: sp.finding,
      });
      pos = sp.end;
    }
    if (pos < canvasContent.length) {
      parts.push({ text: canvasContent.slice(pos) });
    }
    return parts;
  }, [canvasContent, findings]);

  const handleSelectText = () => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;

    if (start !== end && end > start) {
      const text = el.value.substring(start, end);
      setSelectedText(text);
      setSelectionRange({ start, end });
      setRewriteError(null);

      if (editorContainerRef.current) {
        const containerRect = editorContainerRef.current.getBoundingClientRect();
        setToolbarPos({
          top: 10,
          left: Math.min(containerRect.width - 240, 40),
        });
      }
    } else {
      if (!isAiMenuOpen && !aiSuggestion && !rewriteError) {
        setSelectedText('');
        setSelectionRange(null);
        setToolbarPos(null);
      }
    }
  };

  const selectFindingInEditor = (finding: StructuredFinding) => {
    const needle = finding.claimElement;
    if (!needle) return;
    const idx = canvasContent.toLowerCase().indexOf(needle.toLowerCase());
    if (idx === -1) return;

    setSelectedText(canvasContent.slice(idx, idx + needle.length));
    setSelectionRange({ start: idx, end: idx + needle.length });
    setToolbarPos({ top: 10, left: 40 });
    setIsAiMenuOpen(true);
    setAiSuggestion(null);
    setRewriteError(null);

    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(idx, idx + needle.length);
    }
  };

  const handleExecuteRewrite = async (instruction: string) => {
    if (!selectedText) return;
    try {
      setIsGeneratingRewrite(true);
      setRewriteError(null);
      setAiSuggestion(null);
      setLastRewriteInstruction(instruction);

      const res = await fetch(`/api/marketing/campaigns/${campaign.id}/inline-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedText,
          actionPrompt: instruction,
          productCategory: campaign.productCategory,
          channel: campaign.channel,
        }),
      });

      const data = await res.json();

      if (res.status === 402 || res.status === 403) {
        setIsAiMenuOpen(false);
        onUpgradeRequired?.({
          featureName: 'Inline Statutory Copy Rewrite',
          requiredPlan: (data.requiredPlan as PlanTier) || 'PRO',
          reason: data.error,
          isReadOnly: !!data.isReadOnly,
          currentUsage: data.currentUsage,
          maxAllowed: data.maxAllowed,
        });
        return;
      }

      if (!res.ok || !data.success || !data.suggestion) {
        throw new Error(data.error || 'Inline statutory rewrite failed. Please retry.');
      }

      setAiSuggestion(data.suggestion);
    } catch (err: unknown) {
      setRewriteError(err instanceof Error ? err.message : 'Inline rewrite failed. Please retry.');
    } finally {
      setIsGeneratingRewrite(false);
    }
  };

  const handleAcceptRewrite = () => {
    if (!aiSuggestion || !selectionRange) return;

    const before = canvasContent.substring(0, selectionRange.start);
    const after = canvasContent.substring(selectionRange.end);
    const updated = `${before}${aiSuggestion}${after}`;

    onCanvasChange(updated);
    setHighlightAnimation(true);
    setTimeout(() => setHighlightAnimation(false), 1200);

    setAiSuggestion(null);
    setRewriteError(null);
    setIsAiMenuOpen(false);
    setSelectedText('');
    setSelectionRange(null);
    setToolbarPos(null);
  };

  const handleDiscardRewrite = () => {
    setAiSuggestion(null);
    setRewriteError(null);
    setIsAiMenuOpen(false);
    setSelectedText('');
    setSelectionRange(null);
    setToolbarPos(null);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top 3 Sub-Tabs Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 bg-slate-50">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('canvas')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'canvas'
                ? 'border-slate-900 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Live Copy &amp; Creative Canvas
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'claims'
                ? 'border-slate-900 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Extracted Claims ({extractedClaims.length})
          </button>
          <button
            onClick={() => setActiveTab('dossier')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'dossier'
                ? 'border-slate-900 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            3. Pre-Clearance Dossier &amp; Audit
          </button>
        </div>

        <button
          onClick={onExportDossierClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-slate-600" />
          <span>Export ARCON Pack</span>
        </button>
      </div>

      {/* TAB 1: LIVE CANVAS & INLINE EDITOR */}
      {activeTab === 'canvas' && (
        <div
          className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4"
          ref={editorContainerRef}
        >
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1.5">
                  Category:
                </span>
                <span className="font-semibold text-slate-800">
                  {PRODUCT_CATEGORIES_CATALOG[campaign.productCategory]?.label ||
                    campaign.productCategory}
                </span>
              </div>
              <span className="text-slate-300">•</span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1.5">
                  Channel:
                </span>
                <span className="font-mono text-xs text-slate-600">{campaign.channel}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-600 font-mono text-xs">
              <span>{wordCount} words</span>
              <span>•</span>
              <span>
                {charCount} chars
                {campaign.channel === 'SMS_BLAST' &&
                  ` (${smsSegments} SMS ${smsSegments > 1 ? 'segments' : 'segment'})`}
              </span>
            </div>
          </div>

          {/* Ad Creative Visual Preview if attached */}
          {campaign.attachedAssetUrl && (
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Attached Campaign Asset
                </span>
                <span className="font-mono text-xs text-slate-600">
                  {campaign.attachedAssetType}
                </span>
              </div>
              {campaign.attachedAssetType === 'IMAGE' ? (
                <div className="flex items-center gap-4">
                  <img
                    src={campaign.attachedAssetUrl}
                    alt="Campaign Asset"
                    className="max-h-28 rounded border border-slate-200 object-contain bg-white"
                  />
                  <div className="text-xs text-slate-600 space-y-1">
                    <p className="font-medium text-slate-800">Visual Prominence Assessment:</p>
                    <p className="text-[11px] text-slate-500">
                      Mandatory risk warnings and license attribution must remain legible with high-contrast text under ARCON Code 2022 Article 24.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="font-mono text-xs text-slate-600 break-all">
                  {campaign.attachedAssetUrl}
                </div>
              )}
            </div>
          )}

          {/* Inline Red/Amber Violation Highlight Preview */}
          {highlightedCopySegments && (
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Inline Violation Highlights (Click Highlighted Claim to Remediate)
                </span>
                <div className="flex items-center gap-3 text-[11px] text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Blocking
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Warning
                  </span>
                </div>
              </div>
              <div className="p-3 rounded bg-white border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                {highlightedCopySegments.map((seg, idx) => {
                  if (!seg.finding) {
                    return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
                  }
                  const isBlocking = seg.finding.severity === 'BLOCKING_ISSUE';
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectFindingInEditor(seg.finding!)}
                      title={`${seg.finding.regulatoryRule} (${seg.finding.statutoryCitation}): Click to remediate`}
                      className={`px-1 py-0.5 rounded font-medium underline underline-offset-2 cursor-pointer transition-colors ${
                        isBlocking
                          ? 'bg-rose-50 text-rose-800 decoration-rose-500 hover:bg-rose-100'
                          : 'bg-amber-50 text-amber-900 decoration-amber-500 hover:bg-amber-100'
                      }`}
                    >
                      {seg.text}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive Copy Canvas */}
          <div className="relative flex-1 flex flex-col min-h-[280px]">
            {/* Floating Selection Toolbar */}
            {toolbarPos && selectedText && !isAiMenuOpen && !aiSuggestion && (
              <div
                style={{ top: toolbarPos.top, left: toolbarPos.left }}
                className="absolute z-20 flex items-center gap-1 bg-slate-900 text-white rounded-md px-2 py-1 shadow-lg text-xs"
              >
                <button
                  type="button"
                  onClick={() => setIsAiMenuOpen(true)}
                  className="inline-flex items-center gap-1.5 font-semibold text-white hover:text-slate-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Ask AI</span>
                </button>
              </div>
            )}

            {/* "EDIT SELECTION" Popover Menu */}
            {toolbarPos && isAiMenuOpen && !aiSuggestion && (
              <div
                style={{ top: toolbarPos.top + 32, left: Math.max(10, toolbarPos.left - 40) }}
                className="absolute z-30 w-80 bg-white border border-slate-200 rounded-lg shadow-xl p-3 text-xs space-y-2.5"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Scale className="h-3 w-3 text-slate-700" />
                    <span>Pre-Cleared Selection Rewrite</span>
                  </span>
                  <button
                    onClick={handleDiscardRewrite}
                    className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {rewriteError && (
                  <div className="bg-rose-50 text-rose-700 border border-rose-200 p-2 rounded text-[11px] space-y-1.5">
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{rewriteError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExecuteRewrite(lastRewriteInstruction)}
                      disabled={isGeneratingRewrite}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 text-[11px] font-medium cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Retry</span>
                    </button>
                  </div>
                )}

                <div className="space-y-1">
                  <input
                    type="text"
                    value={aiCustomPrompt}
                    onChange={(e) => setAiCustomPrompt(e.target.value)}
                    placeholder="Specify custom compliance edit instruction..."
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  {aiCustomPrompt && (
                    <button
                      onClick={() => handleExecuteRewrite(aiCustomPrompt)}
                      disabled={isGeneratingRewrite}
                      className="w-full mt-1 px-2.5 py-1 rounded bg-slate-900 text-white text-[11px] font-semibold hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingRewrite ? 'Generating...' : 'Apply Instruction'}
                    </button>
                  )}
                </div>

                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Statutory Rewrite Actions
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={isGeneratingRewrite}
                      onClick={() =>
                        handleExecuteRewrite(
                          'Make compliant with CBN, FCCPC, and ARCON statutory prohibitions.'
                        )
                      }
                      className="text-left px-2 py-1.5 rounded hover:bg-slate-100 text-[11px] text-slate-700 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                      <span>Make compliant</span>
                    </button>
                    <button
                      type="button"
                      disabled={isGeneratingRewrite}
                      onClick={() =>
                        handleExecuteRewrite(
                          'Add mandatory statutory disclosure (APR terms and regulatory license attribution).'
                        )
                      }
                      className="text-left px-2 py-1.5 rounded hover:bg-slate-100 text-[11px] text-slate-700 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Scale className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                      <span>Add mandatory disclosure</span>
                    </button>
                    <button
                      type="button"
                      disabled={isGeneratingRewrite}
                      onClick={() =>
                        handleExecuteRewrite(
                          'Make more persuasive and conversion-oriented while preserving regulatory compliance.'
                        )
                      }
                      className="text-left px-2 py-1.5 rounded hover:bg-slate-100 text-[11px] text-slate-700 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <FileText className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                      <span>Make more persuasive</span>
                    </button>
                    <button
                      type="button"
                      disabled={isGeneratingRewrite}
                      onClick={() =>
                        handleExecuteRewrite(
                          'Make shorter to fit within a standard 160-character SMS segment.'
                        )
                      }
                      className="text-left px-2 py-1.5 rounded hover:bg-slate-100 text-[11px] text-slate-700 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Layers className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                      <span>Make shorter</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Real-Time Rewrite Suggestion Popover (`Accept` / `Try again` / `Discard`) */}
            {toolbarPos && aiSuggestion && (
              <div
                style={{ top: toolbarPos.top + 32, left: Math.max(10, toolbarPos.left - 40) }}
                className="absolute z-30 w-96 bg-white border border-slate-200 rounded-lg shadow-xl p-3 text-xs space-y-2.5"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Pre-Cleared Remediation Suggestion</span>
                  </span>
                  <button
                    onClick={handleDiscardRewrite}
                    className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-900 font-medium leading-relaxed">
                  &ldquo;{aiSuggestion}&rdquo;
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleDiscardRewrite}
                      className="px-2.5 py-1 rounded bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 text-[11px] font-medium cursor-pointer"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      disabled={isGeneratingRewrite}
                      onClick={() => handleExecuteRewrite(lastRewriteInstruction)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 text-[11px] font-medium cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${isGeneratingRewrite ? 'animate-spin' : ''}`} />
                      <span>Try again</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleAcceptRewrite}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-medium shadow-xs cursor-pointer"
                  >
                    <Check className="h-3 w-3" />
                    <span>Accept</span>
                  </button>
                </div>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={canvasContent}
              onChange={(e) => onCanvasChange(e.target.value)}
              onSelect={handleSelectText}
              placeholder="Paste or write your marketing copy here... Highlight any sentence to open Pre-Cleared Selection Rewrite."
              className={`w-full flex-1 min-h-[260px] p-4 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 font-sans resize-none transition-all duration-300 ${
                highlightAnimation ? 'bg-emerald-50/50 ring-2 ring-emerald-300' : ''
              }`}
            />
          </div>

          {/* Active Redline Findings Guide Below Canvas */}
          {findings.length > 0 && (
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Statutory Redline Annotations ({findings.length} Flagged)
              </div>
              <div className="flex flex-wrap gap-2">
                {findings.map((f) => (
                  <button
                    key={f.id}
                    onClick={() =>
                      onCanvasChange(canvasContent.replace(f.claimElement, f.suggestedRewrite))
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-200 hover:border-slate-400 text-xs text-slate-800 transition-all cursor-pointer shadow-2xs"
                    title={`Click to replace "${f.claimElement}" with compliant wording`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        f.severity === 'BLOCKING_ISSUE' ? 'bg-rose-500' : 'bg-amber-500'
                      }`}
                    />
                    <span className="font-mono text-xs text-slate-600">
                      &ldquo;{f.claimElement}&rdquo;
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="font-medium text-slate-900">Apply Fix</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXTRACTED CLAIMS REGISTRY */}
      {activeTab === 'claims' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Extracted Promotional Claims Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Discrete claims extracted from this campaign for institutional compliance verification.
              </p>
            </div>
          </div>

          {extractedClaims.length === 0 ? (
            <div className="p-8 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
              <p className="text-xs font-semibold text-slate-700">Zero isolated claims extracted yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Paste copy into the canvas or evaluate with the Copilot to extract and register claims.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {extractedClaims.map((claim) => (
                <div
                  key={claim.id}
                  className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-600 font-semibold">
                        {claim.code}
                      </span>
                      <span className="font-mono text-xs text-slate-600">
                        {claim.statutoryCitation}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            claim.verdict === 'BLOCKING_ISSUE'
                              ? 'bg-rose-500'
                              : claim.verdict === 'WARNING'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        {claim.verdict === 'BLOCKING_ISSUE'
                          ? 'Blocking Issue'
                          : claim.verdict === 'WARNING'
                          ? 'Review Recommended'
                          : 'No Issue Detected'}
                      </span>

                      <span className="font-mono text-xs text-slate-600">
                        {claim.reviewStatus}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-slate-900">
                    &ldquo;{claim.claimText}&rdquo;
                  </div>

                  <div className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded p-2 italic">
                    &ldquo;{claim.verbatimRule}&rdquo;
                  </div>

                  <p className="text-xs text-slate-600">{claim.aiRationale}</p>

                  {claim.suggestedRewrite && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div className="text-xs text-slate-800 font-medium">
                        Pre-cleared rewrite: &ldquo;{claim.suggestedRewrite}&rdquo;
                      </div>
                      <button
                        onClick={() =>
                          onCanvasChange(
                            canvasContent.replace(claim.claimText, claim.suggestedRewrite!)
                          )
                        }
                        className="px-2 py-1 rounded bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 text-[11px] font-medium shrink-0 cursor-pointer transition-colors"
                      >
                        Apply to Canvas
                      </button>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => onClaimStatusChange(claim.id, 'REJECTED')}
                      className="px-2.5 py-1 rounded bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                    >
                      Reject Claim
                    </button>
                    <button
                      onClick={() => onClaimStatusChange(claim.id, 'APPROVED')}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs cursor-pointer"
                    >
                      Approve Claim
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DOSSIER & AUDIT TRAIL */}
      {activeTab === 'dossier' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Pre-Clearance Audit Dossier
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official supervisory pack ready for internal governance and ARCON ASP submission.
                </p>
              </div>
              <button
                onClick={onExportDossierClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Official Dossier (PDF)</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded bg-white p-3 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Campaign Title</span>
                <span className="font-semibold text-slate-900">{campaign.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Supervisory Status</span>
                <span className="font-mono text-xs text-slate-600">{campaign.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Statutory Infractions Count</span>
                <span className="font-mono text-xs text-slate-600">{findings.length} findings</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Designated CCO Reviewer</span>
                <span className="font-semibold text-slate-900">{campaign.assignedReviewer}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
