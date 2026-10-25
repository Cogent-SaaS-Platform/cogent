'use client';

import React, { useState } from 'react';
import { FindingPresentationCard } from '@/shared/types/presentation';
import { MarketingChannel } from '@/shared/types';
import {
  Copy,
  Check,
  AlertCircle,
  ArrowRightLeft,
  ShieldCheck,
} from 'lucide-react';

interface SplitViewComparisonProps {
  originalCopy: string;
  compliantRewrite: string;
  channel: MarketingChannel;
  findings: FindingPresentationCard[];
  onSelectFinding?: (findingId: string) => void;
  selectedFindingId?: string | null;
}

export const SplitViewComparison: React.FC<SplitViewComparisonProps> = ({
  originalCopy,
  compliantRewrite,
  channel,
  findings,
  onSelectFinding,
  selectedFindingId,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(compliantRewrite);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to render original copy with flagged spans highlighted
  const renderHighlightedOriginal = () => {
    if (!originalCopy) return null;
    if (!findings || findings.length === 0) {
      return <span className="text-[#0B0F1A]">{originalCopy}</span>;
    }

    // Sort longer excerpts first to prevent partial substring collision
    const sortedFindings = [...findings].sort(
      (a, b) => (b.flaggedExcerpt?.length || 0) - (a.flaggedExcerpt?.length || 0)
    );

    type Segment = {
      text: string;
      finding?: FindingPresentationCard;
    };

    let segments: Segment[] = [{ text: originalCopy }];

    for (const finding of sortedFindings) {
      if (!finding.flaggedExcerpt) continue;
      const target = finding.flaggedExcerpt.trim();
      if (!target) continue;

      const nextSegments: Segment[] = [];
      for (const seg of segments) {
        if (seg.finding) {
          nextSegments.push(seg);
          continue;
        }

        const lowerText = seg.text.toLowerCase();
        const lowerTarget = target.toLowerCase();
        const idx = lowerText.indexOf(lowerTarget);

        if (idx !== -1) {
          const before = seg.text.slice(0, idx);
          const matched = seg.text.slice(idx, idx + target.length);
          const after = seg.text.slice(idx + target.length);

          if (before) nextSegments.push({ text: before });
          nextSegments.push({ text: matched, finding });
          if (after) nextSegments.push({ text: after });
        } else {
          nextSegments.push(seg);
        }
      }
      segments = nextSegments;
    }

    return segments.map((seg, i) => {
      if (!seg.finding) {
        return <span key={i} className="text-[#0B0F1A]">{seg.text}</span>;
      }

      const finding = seg.finding;
      const isSelected = selectedFindingId === finding.id || activeHighlightId === finding.id;

      const badgeColor =
        finding.severity === 'CRITICAL'
          ? 'bg-red-100 text-red-900 border-red-300 hover:bg-red-200'
          : finding.severity === 'HIGH'
          ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
          : 'bg-yellow-100 text-yellow-900 border-yellow-300 hover:bg-yellow-200';

      return (
        <mark
          key={i}
          onClick={() => onSelectFinding?.(finding.id)}
          onMouseEnter={() => setActiveHighlightId(finding.id)}
          onMouseLeave={() => setActiveHighlightId(null)}
          title={`Click to inspect statutory rule: ${finding.ruleCode} (${finding.severity})`}
          className={`cursor-pointer rounded border px-1.5 py-0.5 font-semibold transition-all ${badgeColor} ${
            isSelected ? 'ring-2 ring-[#2A4BFF] ring-offset-2 ring-offset-white' : ''
          }`}
        >
          {seg.text}
        </mark>
      );
    });
  };

  const originalWords = originalCopy.trim().split(/\s+/).filter(Boolean).length;
  const originalChars = originalCopy.length;

  const rewriteWords = compliantRewrite.trim().split(/\s+/).filter(Boolean).length;
  const rewriteChars = compliantRewrite.length;

  const isSms = channel === 'SMS_BLAST';
  const smsSegments = Math.ceil(rewriteChars / 160) || 1;

  return (
    <div id="marketing-shield-split-view" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-[#2A4BFF]" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B0F1A]">
            Split-View Copy Audit & Compliant Rewrite
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#4B5565]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Flagged Violation Spans
          </span>
          <span className="text-[#8D99AE]">•</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Pre-Cleared Compliant Alternative
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Pane: Original Copy with Flagged Spans */}
        <div className="flex flex-col rounded-2xl border border-[#DDE3EE] bg-white shadow-xs overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#DDE3EE] px-5 py-3.5 bg-[#F9FAFC]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-xs font-bold text-[#0B0F1A]">Original Marketing Copy</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#4B5565] font-mono">
              <span>{originalChars} chars</span>
              <span>•</span>
              <span>{originalWords} words</span>
            </div>
          </div>

          {/* Copy Body */}
          <div className="flex-1 p-5 min-h-[160px] text-sm leading-relaxed whitespace-pre-wrap">
            {renderHighlightedOriginal()}
          </div>

          {/* Footer Warning / Findings Tally */}
          <div className="border-t border-[#DDE3EE] bg-[#F9FAFC] px-5 py-2.5 text-xs text-[#4B5565] flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-red-700 font-semibold">
              <AlertCircle className="h-3.5 w-3.5 text-red-600" />
              {findings.length} statutory {findings.length === 1 ? 'infraction' : 'infractions'} identified
            </span>
            <span className="text-[11px] text-[#8D99AE]">
              Click flagged text to inspect rule in side-sheet
            </span>
          </div>
        </div>

        {/* Right Pane: Compliant Rewrite */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-700" />
              <span className="text-xs font-semibold text-slate-900">
                Compliant Rewrite (ARCON / FCCPC Pre-Cleared)
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded bg-white border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span>Copy Rewrite</span>
                </>
              )}
            </button>
          </div>

          {/* Rewrite Body */}
          <div className="flex-1 p-5 min-h-[160px] text-sm leading-relaxed text-[#0B0F1A] whitespace-pre-wrap font-medium">
            {compliantRewrite || (
              <span className="italic text-[#8D99AE]">
                Compliant rewrite will generate upon execution...
              </span>
            )}
          </div>

          {/* Footer Metrics */}
          <div className="border-t border-emerald-200 bg-emerald-50/50 px-5 py-2.5 text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Includes required statutory APR and license disclosures</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[#4B5565]">
              <span>{rewriteChars} chars</span>
              <span>•</span>
              <span>{rewriteWords} words</span>
              {isSms && (
                <span className="rounded bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 text-[10px] text-emerald-800 font-bold">
                  {smsSegments} SMS {smsSegments === 1 ? 'part' : 'parts'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

