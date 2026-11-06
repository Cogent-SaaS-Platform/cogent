'use client';

import React from 'react';
import {
  Search,
  Plus,
  ChevronRight,
  FileText,
  Building2,
  Calendar,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { RegulatoryInstrumentPresentation } from '../types';

interface RegulationLibraryHubProps {
  instruments: RegulatoryInstrumentPresentation[];
  selectedDomain: string;
  onSelectDomain: (domain: string) => void;
  selectedRegulator: string;
  onSelectRegulator: (regulator: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectInstrument: (instrument: RegulatoryInstrumentPresentation) => void;
  onOpenIngestDrawer: () => void;
  onViewAll: () => void;
  domainCounts: Record<string, number>;
  regulatorCounts: Record<string, number>;
  totalAllCount: number;
}

const DOMAINS_LIST: { code: string; label: string }[] = [
  { code: 'ALL', label: 'All Domains' },
  { code: 'CONSUMER_PROTECTION', label: 'Consumer Protection & APR' },
  { code: 'FINTECH_PAYMENTS', label: 'FinTech & Payments' },
  { code: 'AML_CFT', label: 'AML/CFT & Sanctions' },
  { code: 'DIGITAL_LENDING', label: 'Digital Lending & Credit' },
  { code: 'DATA_PRIVACY_AI', label: 'Data Privacy & AI (NDPA)' },
  { code: 'CAPITAL_MARKETS', label: 'Capital Markets & Wealth' },
  { code: 'CRYPTO_VASP', label: 'Virtual Assets & Web3' },
];

const NIGERIAN_REGULATORS_LIST: { code: string; name: string; flag: string }[] = [
  { code: 'ALL', name: 'Nigeria (All Regulators)', flag: '🇳🇬' },
  { code: 'CBN', name: 'Central Bank of Nigeria (CBN)', flag: '🇳🇬' },
  { code: 'SEC', name: 'Securities and Exchange Commission (SEC)', flag: '🇳🇬' },
  { code: 'NDPC', name: 'Nigeria Data Protection Commission (NDPC)', flag: '🇳🇬' },
  { code: 'FCCPC', name: 'Consumer Protection Commission (FCCPC)', flag: '🇳🇬' },
  { code: 'ARCON', name: 'Advertising Regulatory Council (ARCON)', flag: '🇳🇬' },
  { code: 'NFIU', name: 'Financial Intelligence Unit (NFIU)', flag: '🇳🇬' },
  { code: 'NDIC', name: 'Nigeria Deposit Insurance Corporation (NDIC)', flag: '🇳🇬' },
];

export function RegulationLibraryHub({
  instruments,
  selectedDomain,
  onSelectDomain,
  selectedRegulator,
  onSelectRegulator,
  searchQuery,
  onSearchChange,
  onSelectInstrument,
  onOpenIngestDrawer,
  onViewAll,
  domainCounts,
  regulatorCounts,
  totalAllCount,
}: RegulationLibraryHubProps) {
  // Top 4 suggested statutory frameworks
  const suggestedInstruments = instruments.slice(0, 4);

  // 6 preview instruments for Hub table
  const previewInstruments = instruments.slice(0, 6);

  const formatDomainLabel = (domain: string) => {
    switch (domain) {
      case 'CONSUMER_PROTECTION':
        return 'Consumer Protection';
      case 'FINTECH_PAYMENTS':
        return 'FinTech & Payments';
      case 'AML_CFT':
        return 'AML/CFT & Sanctions';
      case 'DIGITAL_LENDING':
        return 'Digital Lending';
      case 'DATA_PRIVACY_AI':
        return 'Data Privacy & AI';
      case 'CAPITAL_MARKETS':
        return 'Capital Markets';
      case 'CRYPTO_VASP':
        return 'Virtual Assets';
      default:
        return domain.replace(/_/g, ' ');
    }
  };

  const formatInstrumentType = (type: string) => {
    switch (type) {
      case 'PRIMARY_ACT':
        return 'Primary Act';
      case 'SUBSIDIARY_REGULATION':
        return 'Regulation';
      case 'REGULATORY_FRAMEWORK':
        return 'Framework';
      case 'OPERATIONAL_GUIDELINE':
        return 'Guideline';
      case 'CIRCULAR_DIRECTIVE':
        return 'Circular Directive';
      case 'EXPOSURE_DRAFT':
        return 'Exposure Draft';
      case 'SANCTIONS_ORDER':
        return 'Sanctions Order';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Regulation Library
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative regulatory library containing pan-African statutory acts, gazetted directives, and decomposed compliance obligations.
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

      {/* 2. Hero Search Bar (Zango Centered Search Bar) */}
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

      {/* 3. ZANGO 2-COLUMN SIDE-BY-SIDE GRID: DOMAINS (Left 50%) & REGULATORS (Right 50%) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* LEFT COLUMN: DOMAINS */}
        <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Domains
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {totalAllCount} Total Instruments
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {DOMAINS_LIST.map((dom) => {
              const count = dom.code === 'ALL'
                ? totalAllCount
                : domainCounts[dom.code] || 0;
              const isSelected = selectedDomain === dom.code;

              return (
                <button
                  key={dom.code}
                  type="button"
                  onClick={() => onSelectDomain(dom.code)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white hover:bg-slate-100/80 border-slate-200 text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-medium truncate pr-2">
                    {dom.label}
                  </span>
                  <span
                    className={`font-mono text-xs px-2 py-0.5 rounded shrink-0 ${
                      isSelected
                        ? 'bg-slate-800 text-slate-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: JURISDICTIONS / NIGERIAN REGULATORS */}
        <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Jurisdictions / Regulators
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Apex Regulatory Bodies
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {NIGERIAN_REGULATORS_LIST.map((reg) => {
              const count = reg.code === 'ALL'
                ? totalAllCount
                : regulatorCounts[reg.code] || 0;
              const isSelected = selectedRegulator === reg.code;

              return (
                <button
                  key={reg.code}
                  type="button"
                  onClick={() => onSelectRegulator(reg.code)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white hover:bg-slate-100/80 border-slate-200 text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 pr-2">
                    <span className="text-sm shrink-0">{reg.flag}</span>
                    <span className="text-xs font-medium truncate">
                      {reg.name}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-xs px-2 py-0.5 rounded shrink-0 ${
                      isSelected
                        ? 'bg-slate-800 text-slate-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Suggested Regulations (Zango 01:27 — Never repeat title as subtitle!) */}
      {suggestedInstruments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Suggested for you
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Primary Statutory Frameworks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {suggestedInstruments.map((inst) => {
              const typeLabel = formatInstrumentType(inst.instrumentType);
              const domainLabel = formatDomainLabel(inst.domain);

              return (
                <div
                  key={inst.id}
                  onClick={() => onSelectInstrument(inst)}
                  className="group relative bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 flex flex-col justify-between cursor-pointer transition-all hover:shadow-xs min-h-[170px]"
                >
                  <div className="space-y-2">
                    {/* Top: Regulator Flag + Year */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        <span>🇳🇬</span>
                        <span>{inst.regulator}</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        Enacted {inst.year}
                      </span>
                    </div>

                    {/* Title (Bold, 2 lines max, never repeated!) */}
                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-slate-700 line-clamp-2 leading-snug">
                      {inst.shortTitle}
                    </h3>
                  </div>

                  {/* Footer: [Type] • [Domain] + View Provisions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="font-medium text-slate-500 truncate mr-2">
                      {typeLabel} · {domainLabel}
                    </span>
                    <span className="inline-flex items-center gap-0.5 font-medium text-slate-800 group-hover:text-slate-950 shrink-0">
                      <span>{inst.sectionsCount} Provisions</span>
                      <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. HUB PREVIEW TABLE (5–8 Rows) with View All > Button (Zango 01:28) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-0">
        {/* Preview Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">
              All regulatory instruments ({instruments.length})
            </h2>
            {(selectedDomain !== 'ALL' || selectedRegulator !== 'ALL' || searchQuery) && (
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Filtered
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 6-Row Preview Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Title & Citation</th>
                <th className="py-3 px-4 w-32">Regulator</th>
                <th className="py-3 px-4 w-36">Type</th>
                <th className="py-3 px-4 w-44">Domain</th>
                <th className="py-3 px-4 w-28 text-center">Provisions</th>
                <th className="py-3 px-4 w-20 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {previewInstruments.map((inst) => {
                return (
                  <tr
                    key={inst.id}
                    onClick={() => onSelectInstrument(inst)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4 space-y-0.5 max-w-md">
                      <div className="font-bold text-slate-900 group-hover:text-slate-700 truncate">
                        {inst.shortTitle}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 truncate">
                        {inst.officialCitation}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        <span>🇳🇬</span>
                        <span>{inst.regulator}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      {formatInstrumentType(inst.instrumentType)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] text-slate-700">
                        {formatDomainLabel(inst.domain)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-500">
                      {inst.sectionsCount}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700 group-hover:text-slate-950">
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Bar with View All Link */}
        <div className="p-3.5 bg-slate-50/60 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing 1–{previewInstruments.length} of {instruments.length} instruments</span>
          <button
            type="button"
            onClick={onViewAll}
            className="font-semibold text-slate-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Open Dedicated Paginated Instrument List</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
