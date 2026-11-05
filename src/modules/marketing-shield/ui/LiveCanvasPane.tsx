'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Check,
  AlertTriangle,
  Scale,
  Download,
  Bold,
  Italic,
  Link as LinkIcon,
  Layers,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  RefreshCw,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import {
  MarketingCampaign,
  ExtractedPromotionalClaim,
  StructuredFinding,
  PRODUCT_CATEGORIES_CATALOG,
} from '../types';
import { ProductCategoryCode, MarketingChannel } from '@/shared/types';

interface LiveCanvasPaneProps {
  campaign: MarketingCampaign;
  canvasContent: string;
  findings: StructuredFinding[];
  extractedClaims: ExtractedPromotionalClaim[];
  onCanvasChange: (newText: string) => void;
  onClaimStatusChange: (claimId: string, newStatus: 'APPROVED' | 'REJECTED') => Promise<void>;
  onExportDossierClick: () => void;
}

export const LiveCanvasPane: React.FC<LiveCanvasPaneProps> = ({
  campaign,
  canvasContent,
  findings,
  extractedClaims,
  onCanvasChange,
  onClaimStatusChange,
  onExportDossierClick,
}) => {
  const [activeTab, setActiveTab] = useState<'canvas' | 'claims' | 'dossier'>('canvas');

  // Selection & Aurora Floating Menu State
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [isGeneratingRewrite, setIsGeneratingRewrite] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [highlightAnimation, setHighlightAnimation] = useState(false);

  // Popover state for clicked findings
  const [inspectedFinding, setInspectedFinding] = useState<StructuredFinding | null>(null);
  const [findingPopoverPos, setFindingPopoverPos] = useState<{ top: number; left: number } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Character and SMS segment calculation
  const charCount = canvasContent.length;
  const wordCount = canvasContent.trim() ? canvasContent.trim().split(/\s+/).length : 0;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  // Handle Text Selection for Aurora Toolbar
  const handleSelectText = () => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;

    if (start !== end && end > start) {
      const text = el.value.substring(start, end);
      setSelectedText(text);
      setSelectionRange({ start, end });

      // Calculate approximate position relative to editor container
      if (editorContainerRef.current) {
        const containerRect = editorContainerRef.current.getBoundingClientRect();
        setToolbarPos({
          top: 10,
          left: Math.min(containerRect.width - 240, 40),
        });
      }
    } else {
      if (!isAiMenuOpen && !aiSuggestion) {
        setSelectedText('');
        setSelectionRange(null);
        setToolbarPos(null);
      }
    }
  };

  // Aurora Inline Action Execution
  const handleExecuteRewrite = async (instruction: string) => {
    if (!selectedText) return;
    try {
      setIsGeneratingRewrite(true);
      setAiSuggestion(null);

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
      if (data.success && data.suggestion) {
        setAiSuggestion(data.suggestion);
      } else {
        setAiSuggestion(selectedText);
      }
    } catch (err) {
      console.error('Rewrite failed:', err);
    } finally {
      setIsGeneratingRewrite(false);
    }
  };

  // Accept Suggestion with Purple Fade Animation (Aurora Ref Video 2 00:12)
  const handleAcceptRewrite = () => {
    if (!aiSuggestion || !selectionRange) return;

    const before = canvasContent.substring(0, selectionRange.start);
    const after = canvasContent.substring(selectionRange.end);
    const updated = `${before}${aiSuggestion}${after}`;

    onCanvasChange(updated);
    setHighlightAnimation(true);
    setTimeout(() => setHighlightAnimation(false), 1200);

    // Reset Aurora menu
    setAiSuggestion(null);
    setIsAiMenuOpen(false);
    setSelectedText('');
    setSelectionRange(null);
    setToolbarPos(null);
  };

  const handleDiscardRewrite = () => {
    setAiSuggestion(null);
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
            1. Live Copy & Creative Canvas
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
            3. Pre-Clearance Dossier & Audit
          </button>
        </div>

        {/* Action Button */}
        <button
          onClick={onExportDossierClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
        >
          <Download className="h-3.5 w-3.5 text-slate-600" />
          <span>Export ARCON Pack</span>
        </button>
      </div>

      {/* TAB 1: LIVE CANVAS & AURORA INLINE EDITOR */}
      {activeTab === 'canvas' && (
        <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4" ref={editorContainerRef}>
          {/* Metadata Strip (Ref Video 2 Aurora Header 00:01) */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1.5">
                  Category:
                </span>
                <span className="font-semibold text-slate-800">
                  {PRODUCT_CATEGORIES_CATALOG[campaign.productCategory]?.label || campaign.productCategory}
                </span>
              </div>
              <span className="text-slate-300">•</span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1.5">
                  Channel:
                </span>
                <span className="font-semibold text-slate-800">{campaign.channel}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
              <span>{wordCount} words</span>
              <span>•</span>
              <span>
                {charCount} chars
                {campaign.channel === 'SMS_BLAST' && ` (${smsSegments} SMS ${smsSegments > 1 ? 'segments' : 'segment'})`}
              </span>
            </div>
          </div>

          {/* Ad Creative Visual Preview if attached */}
          {campaign.attachedAssetUrl && (
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Attached Creative Flyer (OCR & Visual Prominence Audited)
                </span>
                <span className="font-mono text-slate-500">{campaign.attachedAssetType}</span>
              </div>
              <div className="flex items-center gap-4">
                <img
                  src={campaign.attachedAssetUrl}
                  alt="Campaign Asset"
                  className="max-h-28 rounded border border-slate-200 object-contain bg-white"
                />
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-medium text-slate-800">Visual Prominence Assessment:</p>
                  <p className="text-[11px] text-slate-500">
                    Mandatory risk warnings and license attribution must occupy at least 10% of image height with high-contrast text under ARCON Code Article 24.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Rich Copy Canvas */}
          <div className="relative flex-1 flex flex-col min-h-[320px]">
            {/* Aurora Floating Selection Toolbar (Ref Video 2 00:02) */}
            {toolbarPos && selectedText && !isAiMenuOpen && !aiSuggestion && (
              <div
                style={{ top: toolbarPos.top, left: toolbarPos.left }}
                className="absolute z-20 flex items-center gap-1 bg-slate-900 text-white rounded-md px-2 py-1 shadow-lg text-xs animate-in fade-in zoom-in-95 duration-100"
              >
                <button
                  type="button"
                  onClick={() => setIsAiMenuOpen(true)}
                  className="inline-flex items-center gap-1 font-semibold text-purple-300 hover:text-white px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                >
                  <ShieldCheck className="h-3 w-3" />
                  <span>Ask AI</span>
                </button>
              </div>
            )}

            {/* Aurora "EDIT SELECTION" Popover Menu (Ref Video 2 00:04) */}
            {toolbarPos && isAiMenuOpen && !aiSuggestion && (
              <div
                style={{ top: toolbarPos.top + 32, left: Math.max(10, toolbarPos.left - 40) }}
                className="absolute z-30 w-80 bg-white border border-slate-200 rounded-lg shadow-xl p-3 text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-purple-600" />
                    <span>Edit Selection with Cogent</span>
                  </span>
                  <button
                    onClick={() => setIsAiMenuOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-1">
                  <input
                    type="text"
                    value={aiCustomPrompt}
                    onChange={(e) => setAiCustomPrompt(e.target.value)}
                    placeholder="Tell Cogent how to edit the selection..."
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  {aiCustomPrompt && (
                    <button
                      onClick={() => handleExecuteRewrite(aiCustomPrompt)}
                      disabled={isGeneratingRewrite}
                      className="w-full mt-1 px-2.5 py-1 rounded bg-slate-900 text-white text-[11px] font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {isGeneratingRewrite ? 'Rewriting...' : 'Apply Instruction'}
                    </button>
                  )}
                </div>

                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                    Quick Compliance Actions
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleExecuteRewrite('Make 100% compliant with CBN and ARCON guarantee prohibitions.')}
                      className="text-left px-2 py-1 rounded hover:bg-slate-100 text-[11px] text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>🛡️</span>
                      <span>Make compliant with flagged regulation</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExecuteRewrite('Add mandatory statutory disclosure (APR and regulatory license).')}
                      className="text-left px-2 py-1 rounded hover:bg-slate-100 text-[11px] text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>➕</span>
                      <span>Add mandatory statutory disclosure</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExecuteRewrite('Make more persuasive and conversion-friendly while strictly staying compliant.')}
                      className="text-left px-2 py-1 rounded hover:bg-slate-100 text-[11px] text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>✨</span>
                      <span>Make more persuasive</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExecuteRewrite('Make it shorter to fit within standard 160-character SMS limit.')}
                      className="text-left px-2 py-1 rounded hover:bg-slate-100 text-[11px] text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>✂️</span>
                      <span>Make it shorter (fit SMS limit)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Aurora "COGENT SUGGESTION" Card (Ref Video 2 00:06 - 00:11) */}
            {toolbarPos && aiSuggestion && (
              <div
                style={{ top: toolbarPos.top + 32, left: Math.max(10, toolbarPos.left - 40) }}
                className="absolute z-30 w-88 bg-white border border-purple-200 rounded-lg shadow-xl p-3 text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between border-b border-purple-100 pb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-purple-600" />
                    <span>Cogent Compliant Suggestion</span>
                  </span>
                  <button
                    onClick={handleDiscardRewrite}
                    className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-2.5 rounded bg-purple-50/60 border border-purple-100 text-slate-800 font-medium leading-relaxed">
                  &ldquo;{aiSuggestion}&rdquo;
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-purple-100">
                  <button
                    type="button"
                    onClick={handleDiscardRewrite}
                    className="px-2.5 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-medium cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptRewrite}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold shadow-xs cursor-pointer"
                  >
                    <Check className="h-3 w-3" />
                    <span>Accept (Swap Inline)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Textarea Editor with smooth transition */}
            <textarea
              ref={textareaRef}
              value={canvasContent}
              onChange={(e) => onCanvasChange(e.target.value)}
              onSelect={handleSelectText}
              placeholder="Paste or write your marketing copy here... Highlight any sentence to trigger Ask AI."
              className={`w-full flex-1 min-h-[300px] p-4 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 font-sans resize-none transition-all duration-300 ${
                highlightAnimation ? 'bg-purple-50 ring-2 ring-purple-300' : ''
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
                    onClick={() => onCanvasChange(canvasContent.replace(f.claimElement, f.suggestedRewrite))}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-200 hover:border-slate-400 text-xs text-slate-800 transition-all cursor-pointer shadow-2xs"
                    title={`Click to replace "${f.claimElement}" with compliant wording`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span className="font-mono text-slate-600">&ldquo;{f.claimElement}&rdquo;</span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="font-medium text-emerald-700">Apply Fix</span>
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
                Paste copy into the canvas or chat with the Copilot to extract and evaluate claims.
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
                      <span className="font-mono text-xs font-bold text-slate-700">{claim.code}</span>
                      <span className="font-mono text-xs text-slate-500">{claim.statutoryCitation}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-700">
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
                          ? 'Warning / Disclosure'
                          : 'Compliant'}
                      </span>

                      <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
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
                      <div className="text-xs text-emerald-800 font-medium">
                        Compliant rewrite: &ldquo;{claim.suggestedRewrite}&rdquo;
                      </div>
                      <button
                        onClick={() => onCanvasChange(canvasContent.replace(claim.claimText, claim.suggestedRewrite!))}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold shrink-0 cursor-pointer transition-colors"
                      >
                        Apply to Canvas
                      </button>
                    </div>
                  )}

                  {/* Sign-off Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => onClaimStatusChange(claim.id, 'REJECTED')}
                      className="px-2.5 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                    >
                      Reject Claim
                    </button>
                    <button
                      onClick={() => onClaimStatusChange(claim.id, 'APPROVED')}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer"
                    >
                      ✓ Approve Claim
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-xs"
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
                <span className="font-mono font-semibold text-slate-900">{campaign.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Statutory Infractions Count</span>
                <span className="font-mono font-semibold text-slate-900">{findings.length} findings</span>
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
