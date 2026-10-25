'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  Search,
  Scale,
  ShieldCheck,
  ChevronRight,
  Maximize2,
  Columns,
  BookOpen,
} from 'lucide-react';
import {
  RegulatoryInstrumentPresentation,
  StatutorySection,
} from '../types';

interface SideBySideDocViewerProps {
  instrument: RegulatoryInstrumentPresentation;
  sections: StatutorySection[];
  onBack: () => void;
}

export function SideBySideDocViewer({
  instrument,
  sections,
  onBack,
}: SideBySideDocViewerProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    sections[0]?.id || ''
  );
  const [viewMode, setViewMode] = useState<'split' | 'structured' | 'gazette'>('split');
  const [searchTerm, setSearchTerm] = useState('');

  const activeSection = sections.find((s) => s.id === selectedSectionId) || sections[0];

  const filteredSections = sections.filter(
    (s) =>
      s.sectionReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.sectionHeading.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.clauseText.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-100 rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* 1. Top Global Viewer Bar */}
      <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="border-l border-slate-200 pl-3">
            <div className="font-semibold text-xs text-slate-900 line-clamp-1">
              {instrument.shortTitle}
            </div>
            <div className="font-mono text-[10px] text-slate-500">
              {instrument.officialCitation}
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setViewMode('structured')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                viewMode === 'structured'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Extraction Only
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                viewMode === 'split'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Split View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('gazette')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                viewMode === 'gazette'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gazette Source
            </button>
          </div>

          {instrument.sourceFileUrl && (
            <a
              href={instrument.sourceFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </a>
          )}
        </div>
      </div>

      {/* 2. Main Viewer Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Structured Extraction */}
        {(viewMode === 'split' || viewMode === 'structured') && (
          <div
            className={`flex flex-col bg-white border-r border-slate-200 overflow-hidden ${
              viewMode === 'split' ? 'w-1/2' : 'w-full'
            }`}
          >
            {/* Search Header */}
            <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search extracted provisions..."
                className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* Split layout inside structured view: sections list + active section detail */}
            <div className="flex-1 flex overflow-hidden">
              {/* Section Selector List */}
              <div className="w-2/5 border-r border-slate-100 overflow-y-auto divide-y divide-slate-100 text-xs">
                {filteredSections.map((sec) => {
                  const isSelected = activeSection?.id === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setSelectedSectionId(sec.id)}
                      className={`w-full p-3 text-left transition-colors ${
                        isSelected
                          ? 'bg-slate-100/90 font-medium text-slate-900 border-l-2 border-slate-900'
                          : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="font-mono text-[10px] text-slate-400 font-semibold">
                        {sec.sectionReference}
                      </div>
                      <div className="text-xs line-clamp-2 mt-0.5">
                        {sec.sectionHeading}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active Section Extraction Body */}
              <div className="w-3/5 p-4 overflow-y-auto space-y-4">
                {activeSection ? (
                  <>
                    <div>
                      <div className="font-mono text-[11px] font-bold text-slate-500 uppercase">
                        {activeSection.sectionReference}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                        {activeSection.sectionHeading}
                      </h3>
                    </div>

                    {/* Extracted Clause Text */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {activeSection.clauseText}
                    </div>

                    {/* Associated Obligations */}
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Decomposed Statutory Obligations ({activeSection.obligations?.length || 0})
                      </h4>
                      {activeSection.obligations?.map((obl) => (
                        <div
                          key={obl.id}
                          className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5 shadow-xs"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono font-bold text-slate-700">
                              {obl.id}
                            </span>
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                              {obl.ruleNature}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700">
                            {obl.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Select a provision from the left to view parsed statutory details.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Right Side: Gazette Document Reader */}
        {(viewMode === 'split' || viewMode === 'gazette') && (
          <div
            className={`flex flex-col bg-slate-200/60 overflow-hidden ${
              viewMode === 'split' ? 'w-1/2' : 'w-full'
            }`}
          >
            {/* Gazette Document Container */}
            <div className="flex-1 overflow-y-auto p-6 flex justify-center">
              <div className="w-full max-w-2xl bg-white shadow-md border border-slate-300 rounded-sm p-8 space-y-6 text-slate-900 font-serif">
                {/* Official Gazette Header */}
                <div className="text-center border-b-2 border-slate-900 pb-5 space-y-1">
                  <div className="text-[10px] font-mono tracking-widest uppercase text-slate-600 font-bold">
                    Federal Republic of Nigeria Official Gazette
                  </div>
                  <div className="text-sm font-bold tracking-tight uppercase">
                    Extraordinary Statutory Regulatory Publication
                  </div>
                  <div className="font-mono text-[11px] text-slate-500">
                    No. 42 · Vol. 107 · Sovereign Concordance Verified
                  </div>
                </div>

                {/* Title & Enactment Recital */}
                <div className="text-center space-y-2 py-2">
                  <h1 className="text-base font-bold uppercase tracking-wide">
                    {instrument.fullTitle}
                  </h1>
                  <p className="text-xs italic text-slate-600 max-w-lg mx-auto">
                    An Act to repeal the previous statutory enactments, regulate the operations of financial
                    institutions, and establish supervisory standards for sovereign compliance.
                  </p>
                  <div className="font-mono text-xs font-bold pt-1">
                    [{instrument.officialCitation}]
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4 space-y-4 text-xs leading-relaxed font-sans">
                  {sections.map((sec) => (
                    <div
                      key={sec.id}
                      className={`p-3 rounded transition-colors ${
                        sec.id === activeSection?.id
                          ? 'bg-amber-50/70 border-l-2 border-amber-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-mono text-[11px] font-bold text-slate-800">
                        {sec.sectionReference} &mdash; {sec.sectionHeading}
                      </div>
                      <div className="text-slate-700 mt-1 leading-relaxed">
                        {sec.clauseText}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Gazette Footer Authentication Stamp */}
                <div className="border-t-2 border-slate-900 pt-4 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>PRINTED BY AUTHORITY OF THE FEDERAL GOVERNMENT</span>
                  <span>VERIFIED BY COGENT SOVEREIGN PARSER</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
