'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Search,
  ExternalLink,
  BookOpen,
  ZoomIn,
  ZoomOut,
  FileCheck,
  ShieldCheck,
  Scale,
  Copy,
  Check,
  Library,
  AlertOctagon,
} from 'lucide-react';
import Link from 'next/link';
import { StatutoryReferenceData } from './types';

export interface ReferencePaneProps {
  reference: StatutoryReferenceData;
  onClose: () => void;
  onOpenLibrary?: (citation: string) => void;
}

export function ReferencePane({ reference, onClose, onOpenLibrary }: ReferencePaneProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [activeTab, setActiveTab] = useState<'verbatim' | 'gazette_scan'>('verbatim');
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCopyCitation = () => {
    if (typeof window !== 'undefined') {
      const text = `${reference.statutoryInstrumentTitle} — Clause ${reference.citationClause}`;
      navigator.clipboard.writeText(text);
      setCopiedCitation(true);
      setTimeout(() => setCopiedCitation(false), 2000);
    }
  };

  // Highlight search occurrences inside verbatim legal text
  const renderedVerbatimText = useMemo(() => {
    if (!searchQuery.trim()) {
      return reference.verbatimLegalText;
    }

    const q = searchQuery.toLowerCase();
    const parts = reference.verbatimLegalText.split(new RegExp(`(${searchQuery})`, 'gi'));

    return parts.map((part, i) =>
      part.toLowerCase() === q ? (
        <mark key={i} className="bg-[#FEF08A] text-[#854D0E] px-1 py-0.5 rounded font-semibold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }, [reference.verbatimLegalText, searchQuery]);

  return (
    <div
      id="dual-pane-reference-viewer"
      className="h-full bg-white border-l border-[#DDE3EE] md:rounded-l-2xl shadow-drawer flex flex-col justify-between overflow-hidden select-none w-full lg:w-[480px] xl:w-[520px] transition-all duration-200"
    >
      {/* 1. Gazette Header (per Zango 2:10) */}
      <div className="p-4 border-b border-[#DDE3EE] flex items-center justify-between gap-3 bg-[#F9FAFC] sticky top-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#0B0F1A] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Scale className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2A4BFF] block">
              Official Statutory Corpus
            </span>
            <span className="text-xs font-bold text-[#0B0F1A] truncate block">
              {reference.statutoryInstrumentTitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyCitation}
            className="p-1.5 text-[#8D99AE] hover:text-[#0B0F1A] hover:bg-white rounded-lg transition-colors"
            title={copiedCitation ? 'Citation Copied!' : 'Copy Citation Clause'}
            aria-label="Copy Citation Clause"
          >
            {copiedCitation ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4 text-[#4B5565]" />}
          </button>

          {reference.officialGazetteUrl && (
            <a
              href={reference.officialGazetteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-[#8D99AE] hover:text-[#0B0F1A] hover:bg-white rounded-lg transition-colors"
              title="Download Gazette PDF"
              aria-label="Download Gazette PDF"
            >
              <Download className="w-4 h-4 text-[#4B5565]" />
            </a>
          )}

          <button
            onClick={onClose}
            className="p-1.5 text-[#8D99AE] hover:text-[#0B0F1A] hover:bg-white rounded-lg transition-colors"
            title="Close Statutory Reference (Esc)"
            aria-label="Close statutory reference pane"
          >
            <X className="w-4 h-4 text-[#4B5565]" />
          </button>
        </div>
      </div>

      {/* 2. Sub-Header: Clause Citation Strip & View Mode Switcher */}
      <div className="px-4 py-2.5 border-b border-[#DDE3EE] bg-white flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xs font-semibold font-mono text-slate-900 truncate">
            {reference.citationClause}
          </span>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            {reference.regulatorCode}
          </span>
          <span className="text-xs text-slate-500 hidden sm:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Verbatim Ingested
          </span>
        </div>

        {/* View Mode Toggle */}
        <div className="cogent-tab-group">
          <button
            onClick={() => setActiveTab('verbatim')}
            className={`cogent-tab-item ${activeTab === 'verbatim' ? 'cogent-tab-item-active' : ''}`}
          >
            Text
          </button>
          <button
            onClick={() => setActiveTab('gazette_scan')}
            className={`cogent-tab-item ${activeTab === 'gazette_scan' ? 'cogent-tab-item-active' : ''}`}
          >
            Gazette View
          </button>
        </div>
      </div>

      {/* Search within text toolbar */}
      {activeTab === 'verbatim' && (
        <div className="px-4 py-2 border-b border-[#E8EDF5] bg-[#F9FAFC] flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-[#8D99AE]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clause text (e.g. fine, 2FA, limit)..."
            className="w-full bg-transparent text-xs text-[#0B0F1A] placeholder-[#8D99AE] focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[#8D99AE] hover:text-[#0B0F1A] text-xs"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* 3. Verbatim Statutory Clause Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white">
        {activeTab === 'verbatim' ? (
          <div className="space-y-4">
            {/* Citation Banner */}
            <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#92400E] block">
                Governing Nigerian Statutory Enactment
              </span>
              <p className="text-xs font-semibold text-[#92400E]">
                {reference.citationClause} · {reference.statutoryInstrumentTitle}
              </p>
              {reference.effectiveDate && (
                <span className="text-[10px] text-[#92400E]/80 font-mono block">
                  Effective Date: {reference.effectiveDate}
                </span>
              )}
            </div>

            {/* Verbatim Legal Text with Highlight (per Zango 2:15) */}
            <div className="p-5 rounded-xl bg-[#F9FAFC] border border-[#DDE3EE] space-y-3 font-serif shadow-2xs">
              <div className="border-b border-[#DDE3EE] pb-2 flex items-center justify-between text-xs font-sans text-[#8D99AE]">
                <span className="font-semibold text-[#0B0F1A]">Federal Republic of Nigeria Official Gazette</span>
                {reference.gazettePageNumber && (
                  <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-[#DDE3EE]">
                    Page {reference.gazettePageNumber}
                  </span>
                )}
              </div>

              <div className="text-xs sm:text-sm text-[#0B0F1A] leading-relaxed space-y-3 font-serif">
                <div className="whitespace-pre-line text-justify leading-relaxed">
                  {renderedVerbatimText}
                </div>

                {reference.highlightedPhrase && (
                  <div className="p-3 rounded-lg bg-[#FEF3C7] border-l-4 border-[#F59E0B] text-[#92400E] font-sans text-xs my-2 font-medium">
                    <span className="font-bold block mb-1">Offending / Required Statutory Clause:</span>
                    &ldquo;{reference.highlightedPhrase}&rdquo;
                  </div>
                )}
              </div>
            </div>

            {/* Statutory Penalty Breakdown */}
            {reference.statutoryPenaltyNaira && (
              <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#991B1B] block">
                    Prescribed Administrative Penalty
                  </span>
                  <span className="text-[10px] font-bold text-white bg-[#EF4444] px-1.5 py-0.5 rounded">
                    Strict Liability
                  </span>
                </div>
                <span className="text-lg font-bold text-[#991B1B] font-mono block">
                  ₦{reference.statutoryPenaltyNaira.toLocaleString('en-NG')}
                </span>
                <span className="text-[11px] text-[#991B1B]/80 block leading-tight">
                  Non-negotiable statutory fine enforced by {reference.regulatorCode} for non-compliance under CAMA 2020 and enabling regulatory acts.
                </span>
              </div>
            )}

            {/* Regulatory Library Deep Link */}
            <div className="p-3 rounded-xl bg-[#F5F6FA] border border-[#DDE3EE] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-[#4B5565]">
                <Library className="w-4 h-4 text-[#2A4BFF]" />
                <span className="truncate">View full act in Regulatory Library</span>
              </div>
              <Link
                href={`/library?query=${encodeURIComponent(reference.statutoryInstrumentTitle)}`}
                className="btn-base btn-secondary btn-xs gap-1 text-[11px]"
              >
                <span>Open Corpus</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ) : (
          /* Simulated Gazette PDF View */
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-[#F5F6FA] p-2 rounded-lg border border-[#DDE3EE] text-xs">
              <span className="text-[11px] text-[#4B5565] font-mono">
                Gazette PDF Facsimile ({zoomLevel}%)
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(75, z - 10))}
                  className="p-1 hover:bg-white rounded text-[#4B5565] transition-colors"
                  title="Zoom Out"
                  aria-label="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                  className="p-1 hover:bg-white rounded text-[#4B5565] transition-colors"
                  title="Zoom In"
                  aria-label="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div
              className="p-6 bg-[#FCFDFD] border border-[#DDE3EE] rounded-xl shadow-xs font-serif text-xs leading-relaxed space-y-4"
              style={{ fontSize: `${(zoomLevel / 100) * 0.75}rem` }}
            >
              <div className="text-center border-b border-[#DDE3EE] pb-4 space-y-1">
                <h3 className="font-bold uppercase tracking-wider text-[#0B0F1A]">
                  Federal Republic of Nigeria
                </h3>
                <p className="text-[10px] text-[#8D99AE] uppercase font-sans">
                  Official Gazette Extraordinary
                </p>
                {reference.gazettePageNumber && (
                  <p className="text-[10px] text-[#4B5565] font-mono">
                    Government Notice No. 84 · Page {reference.gazettePageNumber}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <p className="font-bold text-[#0B0F1A] font-sans">
                  {reference.citationClause}
                </p>
                <p className="text-[#0B0F1A] text-justify leading-relaxed whitespace-pre-line">
                  {reference.verbatimLegalText}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Footer info bar */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2 font-mono text-xs text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Official Statutory Corpus</span>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium"
        >
          Close Reference
        </button>
      </div>
    </div>
  );
}
