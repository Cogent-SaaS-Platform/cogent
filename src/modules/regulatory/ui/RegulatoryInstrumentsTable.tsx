'use client';

import React, { useState, useMemo } from 'react';
import {
  Star,
  MoreHorizontal,
  ArrowUpDown,
  Filter,
  Search,
  ExternalLink,
  FileText,
  ListFilter,
  Check,
  Copy,
  ChevronRight,
} from 'lucide-react';
import { RegulatoryInstrumentPresentation } from '../types';

interface RegulatoryInstrumentsTableProps {
  instruments: RegulatoryInstrumentPresentation[];
  isLoading: boolean;
  onSelectInstrument: (instrument: RegulatoryInstrumentPresentation) => void;
  onToggleStar: (instrumentId: string, e: React.MouseEvent) => void;
  onViewDoc: (instrument: RegulatoryInstrumentPresentation, e: React.MouseEvent) => void;
}

export function RegulatoryInstrumentsTable({
  instruments,
  isLoading,
  onSelectInstrument,
  onToggleStar,
  onViewDoc,
}: RegulatoryInstrumentsTableProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'starred'>('all');
  const [sortField, setSortField] = useState<'title' | 'year' | 'jurisdiction'>('year');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [tableSearch, setTableSearch] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const formatDomainLabel = (domain: string) => {
    switch (domain) {
      case 'CONSUMER_PROTECTION':
        return 'Consumer Protection';
      case 'FINTECH_PAYMENTS':
        return 'FinTech & Payments';
      case 'AML_CFT':
        return 'AML/CFT & Sanctions';
      case 'DIGITAL_LENDING':
        return 'Digital Lending & Credit';
      case 'DATA_PRIVACY_AI':
        return 'Data Privacy & AI';
      case 'CAPITAL_MARKETS':
        return 'Capital Markets & Wealth';
      case 'CRYPTO_VASP':
        return 'Virtual Assets & Web3';
      default:
        return domain.replace(/_/g, ' ');
    }
  };

  const formatInstrumentType = (type: string) => {
    switch (type) {
      case 'PRIMARY_ACT':
        return 'Primary Act';
      case 'SUBSIDIARY_REGULATION':
        return 'Subsidiary Regulation';
      case 'DIRECTIVE':
        return 'Directive';
      case 'GUIDELINE':
        return 'Guideline';
      case 'CIRCULAR':
        return 'Circular';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  const formatEntryDate = (inst: RegulatoryInstrumentPresentation) => {
    if (inst.effectiveDate) {
      try {
        const d = new Date(inst.effectiveDate);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch {
        // Fallback
      }
    }
    if (inst.publicationDate) {
      try {
        const d = new Date(inst.publicationDate);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch {
        // Fallback
      }
    }
    return `${inst.year}`;
  };

  const filteredItems = useMemo(() => {
    let result = [...instruments];

    if (activeTab === 'starred') {
      result = result.filter((i) => i.isStarred);
    }

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      result = result.filter(
        (i) =>
          i.shortTitle.toLowerCase().includes(q) ||
          i.fullTitle.toLowerCase().includes(q) ||
          i.officialCitation.toLowerCase().includes(q) ||
          i.regulator.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'title') {
        cmp = a.shortTitle.localeCompare(b.shortTitle);
      } else if (sortField === 'year') {
        cmp = a.year - b.year;
      } else if (sortField === 'jurisdiction') {
        cmp = a.jurisdiction.localeCompare(b.jurisdiction);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [instruments, activeTab, tableSearch, sortField, sortOrder]);

  const toggleSort = (field: 'title' | 'year' | 'jurisdiction') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleCopyCitation = (citation: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(citation);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    setActiveMenuId(null);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Table Toolbar */}
      <div className="p-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tabs: All / Starred */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Regulations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('starred')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'starred'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>Starred</span>
            <span className="font-mono text-[10px] text-slate-400">
              {instruments.filter((i) => i.isStarred).length}
            </span>
          </button>
        </div>

        {/* Search & Sort Actions */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Filter table..."
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white w-48 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={() => toggleSort('year')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors"
          >
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <span>Year {sortField === 'year' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</span>
          </button>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4 w-10 text-center"></th>
              <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('title')}>
                <div className="flex items-center gap-1">
                  <span>Title</span>
                  {sortField === 'title' && (
                    <span className="text-slate-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('jurisdiction')}>
                <div className="flex items-center gap-1">
                  <span>Jurisdiction</span>
                  {sortField === 'jurisdiction' && (
                    <span className="text-slate-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Domain</th>
              <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('year')}>
                <div className="flex items-center gap-1">
                  <span>Entry into Force</span>
                  {sortField === 'year' && (
                    <span className="text-slate-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="py-3 px-4 w-12 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {isLoading ? (
              // Shimmer Skeleton Loading Rows (Zango Wave Loading Effect)
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-3.5 px-4 text-center">
                    <div className="w-3.5 h-3.5 bg-slate-200 rounded mx-auto" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="space-y-1.5">
                      <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                      <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-3 bg-slate-200 rounded w-20" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-3 bg-slate-200 rounded w-24" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-3 bg-slate-200 rounded w-28" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-3 bg-slate-200 rounded w-16" />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="w-4 h-4 bg-slate-200 rounded ml-auto" />
                  </td>
                </tr>
              ))
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">No regulatory instruments found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Try adjusting your filters or search terms
                  </p>
                </td>
              </tr>
            ) : (
              filteredItems.map((inst) => {
                const jur = formatJurisdiction(inst.jurisdiction);
                return (
                  <tr
                    key={inst.id}
                    onClick={() => onSelectInstrument(inst)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    {/* Star Button */}
                    <td
                      className="py-3 px-4 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar(inst.id, e);
                      }}
                    >
                      <button
                        type="button"
                        className="text-slate-300 hover:text-amber-500 transition-colors p-1"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            inst.isStarred ? 'text-amber-400 fill-amber-400' : ''
                          }`}
                        />
                      </button>
                    </td>

                    {/* Title & Citation */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-slate-800 line-clamp-1">
                        {inst.shortTitle}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {inst.officialCitation}
                      </div>
                    </td>

                    {/* Jurisdiction */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-slate-700">
                        <span>{jur.flag}</span>
                        <span>{jur.name}</span>
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-slate-600">
                        {formatInstrumentType(inst.instrumentType)}
                      </span>
                    </td>

                    {/* Domain */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-slate-700 font-medium">
                        {formatDomainLabel(inst.domain)}
                      </span>
                    </td>

                    {/* Entry into Force Date */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600">
                      {formatEntryDate(inst)}
                    </td>

                    {/* Actions Menu */}
                    <td
                      className="py-3 px-4 text-right relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setActiveMenuId(activeMenuId === inst.id ? null : inst.id)
                        }
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {activeMenuId === inst.id && (
                        <div className="absolute right-4 top-8 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 text-left text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onSelectInstrument(inst);
                            }}
                            className="w-full px-3 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>View Instrument</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              setActiveMenuId(null);
                              onViewDoc(inst, e);
                            }}
                            className="w-full px-3 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                            <span>Open Document</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) =>
                              handleCopyCitation(inst.officialCitation, inst.id, e)
                            }
                            className="w-full px-3 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            {copiedId === inst.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span>{copiedId === inst.id ? 'Copied Citation' : 'Copy Citation'}</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Count */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>Showing {filteredItems.length} of {instruments.length} Statutory Instruments</span>
        <span>Deterministic Gazette Registry</span>
      </div>
    </div>
  );
}
