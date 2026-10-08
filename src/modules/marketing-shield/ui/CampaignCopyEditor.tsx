'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Image as ImageIcon,
  Link as LinkIcon,
  ChevronDown,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  Type,
  FileText,
  Sliders,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { FindingPresentationCard } from '@/shared/types/presentation';
import { MarketingChannel, ProductCategoryCode } from '@/shared/types';

export interface CampaignCopyEditorProps {
  campaignTitle: string;
  onCampaignTitleChange?: (title: string) => void;
  subtitle?: string;
  productCategory: ProductCategoryCode;
  channel: MarketingChannel;
  copyText: string;
  onChangeCopyText: (text: string) => void;
  findings: FindingPresentationCard[];
  compliantRewrite?: string;
  selectedFindingId?: string | null;
  onSelectFinding?: (findingId: string) => void;
  onApplyFix?: (fixText: string) => void;
  onRunScan?: () => void;
  isScanning?: boolean;
}

export const CampaignCopyEditor: React.FC<CampaignCopyEditorProps> = ({
  campaignTitle,
  onCampaignTitleChange,
  subtitle = 'Promotional Copy & Dissemination Draft — Nigerian Regulatory Pre-Vetting',
  productCategory,
  channel,
  copyText,
  onChangeCopyText,
  findings,
  compliantRewrite,
  selectedFindingId,
  onSelectFinding,
  onApplyFix,
  onRunScan,
  isScanning = false,
}) => {
  // Toolbar formatting states (cosmetic & functional state to mimic rich text editor)
  const [fontFamily, setFontFamily] = useState<'Inter' | 'Roboto' | 'Outfit' | 'JetBrains Mono'>('Inter');
  const [fontSize, setFontSize] = useState<number>(14);
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [isUnderline, setIsUnderline] = useState<boolean>(false);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [showFontMenu, setShowFontMenu] = useState<boolean>(false);
  const [showSizeMenu, setShowSizeMenu] = useState<boolean>(false);
  const [showAssistantMenu, setShowAssistantMenu] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Selection & Floating Bubble Menu State (matching note.jpg)
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; text: string } | null>(null);
  const [bubblePosition, setBubblePosition] = useState<{ top: number; left: number } | null>(null);
  const [activeFlaggedFinding, setActiveFlaggedFinding] = useState<FindingPresentationCard | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Calculate metrics
  const charCount = copyText.length;
  const wordCount = copyText.trim().split(/\s+/).filter(Boolean).length;
  const isSms = channel === 'SMS_BLAST';
  const smsSegments = Math.ceil(charCount / 160) || 1;

  // Handle text selection inside textarea to position floating bubble
  const handleSelectText = () => {
    if (!textareaRef.current) return;
    const { selectionStart, selectionEnd } = textareaRef.current;
    if (selectionStart !== selectionEnd) {
      const selectedStr = copyText.slice(selectionStart, selectionEnd).trim();
      if (selectedStr.length > 0) {
        setSelectionRange({ start: selectionStart, end: selectionEnd, text: selectedStr });

        // Check if selected text matches any finding
        const matched = findings.find(
          (f) =>
            f.flaggedExcerpt.toLowerCase().includes(selectedStr.toLowerCase()) ||
            selectedStr.toLowerCase().includes(f.flaggedExcerpt.toLowerCase())
        );
        setActiveFlaggedFinding(matched || null);

        // Approximate bubble positioning over the text
        if (editorRef.current) {
          const rect = textareaRef.current.getBoundingClientRect();
          const editorRect = editorRef.current.getBoundingClientRect();
          // Approximate relative top based on selection position
          const lineApprox = Math.min(220, Math.floor(selectionStart / 60) * 24 + 110);
          setBubblePosition({
            top: lineApprox,
            left: Math.min(rect.width - 280, Math.max(30, (rect.width / 2) - 150)),
          });
        }
        return;
      }
    }
    // If no active range selection, keep bubble visible only if a finding is explicitly selected
    if (!selectedFindingId) {
      setSelectionRange(null);
      setBubblePosition(null);
      setActiveFlaggedFinding(null);
    }
  };

  // Sync when selectedFindingId changes from outside
  useEffect(() => {
    if (selectedFindingId) {
      const finding = findings.find((f) => f.id === selectedFindingId);
      if (finding) {
        setActiveFlaggedFinding(finding);
        // Find index of flagged excerpt in copy
        const idx = copyText.toLowerCase().indexOf(finding.flaggedExcerpt.toLowerCase());
        if (idx !== -1) {
          setSelectionRange({
            start: idx,
            end: idx + finding.flaggedExcerpt.length,
            text: finding.flaggedExcerpt,
          });
          setBubblePosition({
            top: 130,
            left: 80,
          });
        }
      }
    } else {
      if (!textareaRef.current || textareaRef.current.selectionStart === textareaRef.current.selectionEnd) {
        setBubblePosition(null);
        setActiveFlaggedFinding(null);
      }
    }
  }, [selectedFindingId, findings, copyText]);

  // Handle applying a quick cure / replacement
  const handleApplyQuickCure = () => {
    if (compliantRewrite && onApplyFix) {
      onApplyFix(compliantRewrite);
    } else if (activeFlaggedFinding?.mandatoryDisclosureRequired) {
      const newText = copyText.replace(
        activeFlaggedFinding.flaggedExcerpt,
        `${activeFlaggedFinding.flaggedExcerpt} (${activeFlaggedFinding.mandatoryDisclosureRequired})`
      );
      onChangeCopyText(newText);
    }
    setBubblePosition(null);
    setSelectionRange(null);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={editorRef}
      className="relative flex flex-col rounded-2xl border border-[#DDE3EE] bg-white shadow-xs overflow-hidden transition-all font-sans"
    >
      {/* ──────────────────────────────────────────────────────────────────────────
          1. DOCUMENT TITLE & METADATA BAR (Reference: note.jpg)
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="border-b border-[#DDE3EE] bg-[#FFFFFF] px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 max-w-xl">
            {onCampaignTitleChange ? (
              <input
                type="text"
                value={campaignTitle}
                onChange={(e) => onCampaignTitleChange(e.target.value)}
                className="w-full text-lg sm:text-xl font-bold text-[#0B0F1A] placeholder-[#8D99AE] bg-transparent border-none p-0 focus:outline-none focus:ring-0 tracking-tight"
                placeholder="Enter Campaign Title..."
              />
            ) : (
              <h2 className="text-lg sm:text-xl font-bold text-[#0B0F1A] tracking-tight">
                {campaignTitle}
              </h2>
            )}
            <p className="text-xs text-[#4B5565] flex items-center gap-2">
              <span>{subtitle}</span>
              <span className="text-[#DDE3EE]">•</span>
              <span className="inline-flex items-center gap-1 rounded bg-[#F5F6FA] px-2 py-0.5 text-[11px] font-semibold text-[#0B0F1A] border border-[#DDE3EE]">
                {productCategory}
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-[#2A4BFF]/10 px-2 py-0.5 text-[11px] font-semibold text-[#2A4BFF] border border-[#2A4BFF]/20">
                {channel}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDE3EE] bg-white px-3 py-1.5 text-xs font-semibold text-[#0B0F1A] hover:bg-[#F9FAFC] transition-all shadow-xs"
              title="Copy current draft copy"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-[#4B5565]" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {onRunScan && (
              <button
                type="button"
                disabled={isScanning}
                onClick={onRunScan}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#2A4BFF] hover:bg-[#203ECC] text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Pre-Vet Scan</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. RICH TEXT TOOLBAR (Faithful to note.jpg toolbar)
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DDE3EE] bg-[#F9FAFC] px-4 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Font Family Selector [T Inter ▾] */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFontMenu(!showFontMenu)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3EE] bg-white px-2.5 py-1 text-xs font-medium text-[#0B0F1A] hover:bg-[#F5F6FA] shadow-xs"
            >
              <Type className="h-3.5 w-3.5 text-[#4B5565]" />
              <span>{fontFamily}</span>
              <ChevronDown className="h-3 w-3 text-[#8D99AE]" />
            </button>
            {showFontMenu && (
              <div className="absolute left-0 top-full mt-1 z-30 w-36 rounded-xl border border-[#DDE3EE] bg-white p-1 shadow-lg">
                {(['Inter', 'Roboto', 'Outfit', 'JetBrains Mono'] as const).map((font) => (
                  <button
                    key={font}
                    type="button"
                    onClick={() => {
                      setFontFamily(font);
                      setShowFontMenu(false);
                    }}
                    className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                      fontFamily === font ? 'bg-[#2A4BFF]/10 text-[#2A4BFF] font-bold' : 'text-[#0B0F1A] hover:bg-[#F5F6FA]'
                    }`}
                  >
                    {font}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Font Size Selector [14 ▾] */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSizeMenu(!showSizeMenu)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3EE] bg-white px-2.5 py-1 text-xs font-medium text-[#0B0F1A] hover:bg-[#F5F6FA] shadow-xs"
            >
              <span>{fontSize}</span>
              <ChevronDown className="h-3 w-3 text-[#8D99AE]" />
            </button>
            {showSizeMenu && (
              <div className="absolute left-0 top-full mt-1 z-30 w-20 rounded-xl border border-[#DDE3EE] bg-white p-1 shadow-lg">
                {[12, 14, 16, 18, 20].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setFontSize(size);
                      setShowSizeMenu(false);
                    }}
                    className={`w-full text-center rounded-lg px-2 py-1 text-xs transition-colors ${
                      fontSize === size ? 'bg-[#2A4BFF]/10 text-[#2A4BFF] font-bold' : 'text-[#0B0F1A] hover:bg-[#F5F6FA]'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Color Indicator [■ ▾] */}
          <div className="flex items-center rounded-lg border border-[#DDE3EE] bg-white px-2 py-1 shadow-xs">
            <span className="h-3.5 w-3.5 rounded bg-[#0B0F1A] border border-[#DDE3EE]" />
            <ChevronDown className="h-3 w-3 text-[#8D99AE] ml-1" />
          </div>

          <div className="h-4 w-px bg-[#DDE3EE] mx-1" />

          {/* Style Toggles: Bold, Italic, Underline */}
          <button
            type="button"
            onClick={() => setIsBold(!isBold)}
            className={`p-1.5 rounded-lg border transition-all ${
              isBold
                ? 'bg-[#2A4BFF]/10 border-[#2A4BFF] text-[#2A4BFF] font-bold'
                : 'bg-white border-[#DDE3EE] text-[#0B0F1A] hover:bg-[#F5F6FA]'
            }`}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsItalic(!isItalic)}
            className={`p-1.5 rounded-lg border transition-all ${
              isItalic
                ? 'bg-[#2A4BFF]/10 border-[#2A4BFF] text-[#2A4BFF] font-bold'
                : 'bg-white border-[#DDE3EE] text-[#0B0F1A] hover:bg-[#F5F6FA]'
            }`}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsUnderline(!isUnderline)}
            className={`p-1.5 rounded-lg border transition-all ${
              isUnderline
                ? 'bg-[#2A4BFF]/10 border-[#2A4BFF] text-[#2A4BFF] font-bold'
                : 'bg-white border-[#DDE3EE] text-[#0B0F1A] hover:bg-[#F5F6FA]'
            }`}
            title="Underline"
          >
            <Underline className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-[#DDE3EE] mx-1" />

          {/* Text Alignment */}
          <button
            type="button"
            onClick={() => setAlignment('left')}
            className={`p-1.5 rounded-lg border transition-all ${
              alignment === 'left'
                ? 'bg-[#2A4BFF]/10 border-[#2A4BFF] text-[#2A4BFF]'
                : 'bg-white border-[#DDE3EE] text-[#0B0F1A] hover:bg-[#F5F6FA]'
            }`}
            title="Align Left"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setAlignment('center')}
            className={`p-1.5 rounded-lg border transition-all ${
              alignment === 'center'
                ? 'bg-[#2A4BFF]/10 border-[#2A4BFF] text-[#2A4BFF]'
                : 'bg-white border-[#DDE3EE] text-[#0B0F1A] hover:bg-[#F5F6FA]'
            }`}
            title="Align Center"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setAlignment('right')}
            className={`p-1.5 rounded-lg border transition-all ${
              alignment === 'right'
                ? 'bg-[#2A4BFF]/10 border-[#2A4BFF] text-[#2A4BFF]'
                : 'bg-white border-[#DDE3EE] text-[#0B0F1A] hover:bg-[#F5F6FA]'
            }`}
            title="Align Right"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-[#DDE3EE] mx-1" />

          {/* Lists */}
          <button
            type="button"
            className="p-1.5 rounded-lg bg-white border border-[#DDE3EE] text-[#0B0F1A] hover:bg-[#F5F6FA] transition-all"
            title="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            className="p-1.5 rounded-lg bg-white border border-[#DDE3EE] text-[#0B0F1A] hover:bg-[#F5F6FA] transition-all"
            title="Numbered List"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-[#DDE3EE] mx-1" />

          {/* Media / Link */}
          <button
            type="button"
            className="p-1.5 rounded-lg bg-white border border-[#DDE3EE] text-[#0B0F1A] hover:bg-[#F5F6FA] transition-all"
            title="Insert Creative Asset"
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            className="p-1.5 rounded-lg bg-white border border-[#DDE3EE] text-[#0B0F1A] hover:bg-[#F5F6FA] transition-all"
            title="Insert Link / Terms URL"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Live Tally Info */}
        <div className="flex items-center gap-3 text-[11px] text-[#4B5565] font-mono">
          <span>{charCount} chars</span>
          <span>•</span>
          <span>{wordCount} words</span>
          {isSms && (
            <>
              <span>•</span>
              <span className="font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                {smsSegments} SMS {smsSegments === 1 ? 'part' : 'parts'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. EDITABLE DOCUMENT CANVAS WITH INTERACTIVE FLAGGED SPANS & BUBBLE MENU
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="relative p-6 min-h-[220px]">
        {/* Floating Bubble AI Assistant Menu (matching the dark bubble in note.jpg) */}
        {bubblePosition && (
          <div
            style={{
              top: `${bubblePosition.top}px`,
              left: `${bubblePosition.left}px`,
            }}
            className="absolute z-40 flex items-center gap-1.5 rounded-xl bg-[#0B0F1A] text-white px-3 py-1.5 shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
          >
            {/* Assistant dropdown trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAssistantMenu(!showAssistantMenu)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white hover:text-[#2A4BFF] pr-2 border-r border-[#2A3447]"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#2A4BFF]" />
                <span>Assistant</span>
                <ChevronDown className="h-3 w-3 text-[#8D99AE]" />
              </button>

              {showAssistantMenu && (
                <div className="absolute left-0 top-full mt-2 w-56 rounded-xl bg-[#0B0F1A] border border-[#2A3447] p-1.5 shadow-2xl text-xs z-50">
                  <div className="px-2 py-1 text-[10px] font-bold text-[#8D99AE] uppercase tracking-wider">
                    Statutory AI Actions
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleApplyQuickCure();
                      setShowAssistantMenu(false);
                    }}
                    className="w-full text-left rounded-lg px-2.5 py-1.5 hover:bg-[#1E293B] text-[#10B981] flex items-center gap-2 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
                    <span>Apply Compliant Rewrite</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeFlaggedFinding && onSelectFinding) {
                        onSelectFinding(activeFlaggedFinding.id);
                      }
                      setShowAssistantMenu(false);
                    }}
                    className="w-full text-left rounded-lg px-2.5 py-1.5 hover:bg-[#1E293B] text-[#60A5FA] flex items-center gap-2 transition-colors"
                  >
                    <Scale className="h-3.5 w-3.5 text-[#60A5FA]" />
                    <span>Inspect Statutory Gazette</span>
                  </button>
                </div>
              )}
            </div>

            {/* If a flagged finding was detected on the selection, show quick statutory badge */}
            {activeFlaggedFinding ? (
              <div className="flex items-center gap-2 pl-1">
                <span className="text-[11px] font-bold text-red-300 bg-red-950/80 border border-red-700/60 px-2 py-0.5 rounded">
                  {activeFlaggedFinding.ruleCode}
                </span>

                <button
                  type="button"
                  onClick={handleApplyQuickCure}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-xs font-semibold shadow-xs transition-colors"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Cure Violation</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectFinding?.(activeFlaggedFinding.id)}
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-1 text-xs font-medium"
                  title="Inspect in side-sheet"
                >
                  Inspect
                </button>
              </div>
            ) : (
              /* Standard bubble formatting buttons matching note.jpg */
              <div className="flex items-center gap-1 pl-1 text-slate-300">
                <button
                  type="button"
                  onClick={() => setIsBold(!isBold)}
                  className="p-1 hover:text-white rounded"
                  title="Bold"
                >
                  <Bold className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsItalic(!isItalic)}
                  className="p-1 hover:text-white rounded"
                  title="Italic"
                >
                  <Italic className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsUnderline(!isUnderline)}
                  className="p-1 hover:text-white rounded"
                  title="Underline"
                >
                  <Underline className="h-3 w-3" />
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={handleApplyQuickCure}
                  className="inline-flex items-center gap-1 text-[11px] text-purple-300 hover:text-purple-200 font-semibold px-1"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Pre-Vet Wording</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Textarea for live typing & selection */}
        <textarea
          ref={textareaRef}
          value={copyText}
          onChange={(e) => onChangeCopyText(e.target.value)}
          onSelect={handleSelectText}
          onMouseUp={handleSelectText}
          onKeyUp={handleSelectText}
          rows={6}
          style={{
            fontFamily:
              fontFamily === 'JetBrains Mono'
                ? 'monospace'
                : fontFamily === 'Roboto'
                ? 'Roboto, sans-serif'
                : fontFamily === 'Outfit'
                ? 'Outfit, sans-serif'
                : 'Inter, sans-serif',
            fontSize: `${fontSize}px`,
            textAlign: alignment,
            fontWeight: isBold ? '700' : '400',
            fontStyle: isItalic ? 'italic' : 'normal',
            textDecoration: isUnderline ? 'underline' : 'none',
          }}
          className="w-full bg-transparent text-[#0B0F1A] placeholder-[#8D99AE] leading-relaxed resize-y border-none p-0 focus:outline-none focus:ring-0"
          placeholder="Paste or write promotional copy to pre-vet against ARCON, CBN, FCCPC, and SEC regulations..."
        />

        {/* Flagged Infractions Visual Chips Strip directly under editor */}
        {findings.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#DDE3EE] flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-red-700 flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
              <span>{findings.length} Infractions Flagged in Copy:</span>
            </span>

            {findings.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  onSelectFinding?.(f.id);
                  setActiveFlaggedFinding(f);
                }}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  selectedFindingId === f.id
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-red-50 text-red-800 border border-red-200 hover:bg-red-100'
                }`}
              >
                <span>&ldquo;{f.flaggedExcerpt}&rdquo;</span>
                <span className="text-[10px] font-mono opacity-80 font-bold">
                  ({f.regulatorCode})
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          4. FOOTER STATUS BAR
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="border-t border-[#DDE3EE] bg-[#F9FAFC] px-6 py-2.5 flex flex-wrap items-center justify-between text-xs text-[#4B5565]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Active Nigerian Regulators: ARCON (Adv. Code 2022) • CBN CPF 2019 • FCCPC 2022 • SEC 2024</span>
        </div>

        <div className="text-[11px] text-[#8D99AE]">
          Select any text to summon AI Assistant & Statutory Pre-Vetting Tools
        </div>
      </div>
    </div>
  );
};
