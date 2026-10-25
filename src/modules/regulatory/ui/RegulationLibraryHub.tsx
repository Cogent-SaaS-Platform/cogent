'use client';

import React, { useState } from 'react';
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  FileText,
  Star,
  ExternalLink,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  RegulatoryInstrumentPresentation,
  DomainFilterItem,
  JurisdictionFilterItem,
} from '../types';

interface RegulationLibraryHubProps {
  instruments: RegulatoryInstrumentPresentation[];
  selectedDomain: string;
  onSelectDomain: (domain: string) => void;
  selectedJurisdiction: string;
  onSelectJurisdiction: (jurisdiction: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectInstrument: (instrument: RegulatoryInstrumentPresentation) => void;
  onOpenIngestDrawer: () => void;
  domainCounts: Record<string, number>;
  jurisdictionCounts: Record<string, number>;
}

export function RegulationLibraryHub({
  instruments,
  selectedDomain,
  onSelectDomain,
  selectedJurisdiction,
  onSelectJurisdiction,
  searchQuery,
  onSearchChange,
  onSelectInstrument,
  onOpenIngestDrawer,
  domainCounts,
  jurisdictionCounts,
}: RegulationLibraryHubProps) {
  const [showAllDomains, setShowAllDomains] = useState(false);

  // Curated prominent domain categories with live counts
  const domainsList: { code: string; label: string }[] = [
    { code: 'ALL', label: 'All Domains' },
    { code: 'CONSUMER_PROTECTION', label: 'Consumer Protection' },
    { code: 'FINTECH_PAYMENTS', label: 'FinTech & Payments' },
    { code: 'AML_CFT', label: 'AML/CFT & Sanctions' },
    { code: 'DIGITAL_LENDING', label: 'Digital Lending & Credit' },
    { code: 'DATA_PRIVACY_AI', label: 'Data Privacy & AI' },
    { code: 'CAPITAL_MARKETS', label: 'Capital Markets & Wealth' },
    { code: 'CRYPTO_VASP', label: 'Virtual Assets & Web3' },
  ];

  const visibleDomains = showAllDomains ? domainsList : domainsList.slice(0, 5);

  const jurisdictionsList: { code: string; name: string; flag: string }[] = [
    { code: 'ALL', name: 'All Jurisdictions', flag: '🌍' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
    { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
    { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
    { code: 'SUPRANATIONAL', name: 'Supranational', flag: '🌐' },
  ];

  // Top 4 recommended suggested statutory frameworks
  const suggestedInstruments = instruments.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* 1. Top Hub Header & Ingest Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Regulation Library
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative regulatory library containing pan-African statutory acts, gazette directives, and decomposed compliance obligations.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenIngestDrawer}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ingest Statutory Regulation</span>
          </button>
        </div>
      </div>

      {/* 2. Hero Search Bar (Zango Discovery Centered Bar) */}
      <div className="relative max-w-2xl mx-auto w-full">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Type to search the Regulation library..."
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent shadow-xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 text-xs font-mono text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 3. Domains Matrix & Jurisdiction Selectors */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5">
        {/* Domain Filter Pills */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-2">
            Domains:
          </span>
          {visibleDomains.map((dom) => {
            const count = dom.code === 'ALL'
              ? instruments.length
              : domainCounts[dom.code] || 0;
            const isSelected = selectedDomain === dom.code;

            return (
              <button
                key={dom.code}
                type="button"
                onClick={() => onSelectDomain(dom.code)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{dom.label}</span>
                <span
                  className={`font-mono text-[11px] px-1.5 py-0.2 rounded ${
                    isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowAllDomains(!showAllDomains)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span>{showAllDomains ? 'Show less' : 'Show all'}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                showAllDomains ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Hairline Divider */}
        <div className="border-t border-slate-100" />

        {/* Jurisdiction Selectors with Flag Badges */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-2">
            Jurisdiction:
          </span>
          {jurisdictionsList.map((jur) => {
            const count = jur.code === 'ALL'
              ? instruments.length
              : jurisdictionCounts[jur.code] || 0;
            const isSelected = selectedJurisdiction === jur.code;

            return (
              <button
                key={jur.code}
                type="button"
                onClick={() => onSelectJurisdiction(jur.code)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{jur.flag}</span>
                <span>{jur.name}</span>
                <span
                  className={`font-mono text-[11px] px-1.5 py-0.2 rounded ${
                    isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Suggested Statutory Regulations Carousel / Featured Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Suggested Regulations
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {suggestedInstruments.length} Primary Frameworks
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {suggestedInstruments.map((inst) => {
            const flag = inst.jurisdiction === 'NG' ? '🇳🇬' : inst.jurisdiction === 'GH' ? '🇬🇭' : '🌐';
            return (
              <div
                key={inst.id}
                onClick={() => onSelectInstrument(inst)}
                className="group relative bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 flex flex-col justify-between cursor-pointer transition-all hover:shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-slate-500">
                      <span>{flag}</span>
                      <span>{inst.regulator}</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {inst.year}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-slate-700 line-clamp-2 mb-1.5">
                    {inst.shortTitle}
                  </h3>

                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {inst.description || inst.fullTitle}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-mono text-[11px] text-slate-500">
                    {inst.sectionsCount} Provisions
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 group-hover:text-slate-900">
                    <span>View</span>
                    <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
