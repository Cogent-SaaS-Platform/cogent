'use client';

import React, { useState, useMemo } from 'react';
import {
  Star,
  ArrowUpDown,
  Search,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Filter,
  Download,
} from 'lucide-react';
import { RegulatoryInstrumentPresentation } from '../types';

interface RegulatoryInstrumentsTableProps {
  instruments: RegulatoryInstrumentPresentation[];
  isLoading: boolean;
  onSelectInstrument: (instrument: RegulatoryInstrumentPresentation) => void;
  onToggleStar: (instrumentId: string, e: React.MouseEvent) => void;
  onViewDoc: (instrument: RegulatoryInstrumentPresentation, e: React.MouseEvent) => void;
  onBack?: () => void;
}

const PAGE_SIZE = 10;

export function RegulatoryInstrumentsTable({
  instruments,
  isLoading,
  onSelectInstrument,
  onToggleStar,
  onViewDoc,
  onBack,
}: RegulatoryInstrumentsTableProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'starred'>('all');
  const [sortField, setSortField] = useState<'title' | 'year' | 'regulator'>('year');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [tableSearch, setTableSearch] = useState('');
  const [selectedDomainFilter, setSelectedDomainFilter] = useState('ALL');
  const [selectedRegulatorFilter, setSelectedRegulatorFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

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

  // Filtered and Sorted instruments
  const filteredItems = useMemo(() => {
    let result = [...instruments];

    if (activeTab === 'starred') {
      result = result.filter((i) => i.isStarred);
    }

    if (selectedDomainFilter !== 'ALL') {
      result = result.filter((i) => i.domain === selectedDomainFilter);
    }

    if (selectedRegulatorFilter !== 'ALL') {
      result = result.filter((i) => i.regulator.toUpperCase() === selectedRegulatorFilter);
    }

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      result = result.filter(
        (i) =>
          i.shortTitle.toLowerCase().includes(q) ||
          i.fullTitle.toLowerCase().includes(q) ||
          i.officialCitation.toLowerCase().includes(q) ||
          i.regulator.toLowerCase().includes(q) ||
          (i.overview && i.overview.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'title') {
        const titleA = a.fullTitle || a.shortTitle;
        const titleB = b.fullTitle || b.shortTitle;
        cmp = titleA.localeCompare(titleB);
      } else if (sortField === 'year') {
        cmp = (a.year || 0) - (b.year || 0);
      } else if (sortField === 'regulator') {
        cmp = a.regulator.localeCompare(b.regulator);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [instruments, activeTab, selectedDomainFilter, selectedRegulatorFilter, tableSearch, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedItems = filteredItems.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);

  const toggleSort = (field: 'title' | 'year' | 'regulator') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleExportCsv = () => {
    const headers = [
      'Official Citation',
      'Full Title',
      'Short Title',
      'Regulator',
      'Jurisdiction',
      'Enacted Year',
      'Domain',
      'Instrument Type',
      'Sections Count',
      'Total Obligations',
      'Is Starred',
    ];
    const rows = filteredItems.map((inst) => [
      `"${inst.officialCitation || ''}"`,
      `"${(inst.fullTitle || '').replace(/"/g, '""')}"`,
      `"${(inst.shortTitle || '').replace(/"/g, '""')}"`,
      `"${inst.regulator || ''}"`,
      `"${inst.jurisdiction || ''}"`,
      `"${inst.year || ''}"`,
      `"${inst.domain || ''}"`,
      `"${inst.instrumentType || ''}"`,
      `"${inst.sectionsCount || 0}"`,
      `"${inst.totalObligationsCount || 0}"`,
      `"${inst.isStarred ? 'Yes' : 'No'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'cogent_regulatory_instruments_register.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* 1. Breadcrumb navigation if onBack is provided */}
      {onBack && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Regulation Library</span>
          </button>
          <span>/</span>
          <span className="font-semibold text-slate-900">
            Regulatory Instrument List
          </span>
          <span className="font-mono text-slate-400">
            ({filteredItems.length} Instruments)
          </span>
        </div>
      )}

      {/* 2. Main Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs: All / Starred */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Regulations ({instruments.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('starred');
                setCurrentPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
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

          {/* Search & Filters */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => {
                  setTableSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filter table..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white w-44 transition-all"
              />
            </div>

            {/* Domain Dropdown */}
            <select
              value={selectedDomainFilter}
              onChange={(e) => {
                setSelectedDomainFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Domains</option>
              <option value="AML_CFT">AML/CFT & Sanctions</option>
              <option value="CAPITAL_MARKETS">Capital Markets & Wealth</option>
              <option value="CONSUMER_PROTECTION">Consumer Protection & APR</option>
              <option value="DIGITAL_LENDING">Digital Lending & Credit</option>
              <option value="DATA_PRIVACY_AI">Data Privacy & AI (NDPA)</option>
              <option value="CRYPTO_VASP">Virtual Assets & Web3</option>
              <option value="FINTECH_PAYMENTS">FinTech & Payments</option>
            </select>

            {/* Regulator Dropdown */}
            <select
              value={selectedRegulatorFilter}
              onChange={(e) => {
                setSelectedRegulatorFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Regulators</option>
              <option value="CBN">CBN (Central Bank)</option>
              <option value="SEC">SEC (Securities)</option>
              <option value="NDPC">NDPC (Data Protection)</option>
              <option value="FCCPC">FCCPC (Consumer)</option>
              <option value="ARCON">ARCON (Advertising)</option>
              <option value="NFIU">NFIU (Intelligence)</option>
              <option value="NDIC">NDIC (Deposit Insurance)</option>
            </select>

            {/* Sort Toggle */}
            <button
              type="button"
              onClick={() => toggleSort('year')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
              <span>Year {sortField === 'year' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</span>
            </button>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              title="Export all filtered instruments to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center"></th>
                <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('title')}>
                  <div className="flex items-center gap-1">
                    <span>Title & Citation</span>
                    {sortField === 'title' && (
                      <span className="text-slate-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 w-32 cursor-pointer" onClick={() => toggleSort('regulator')}>
                  <div className="flex items-center gap-1">
                    <span>Regulator</span>
                    {sortField === 'regulator' && (
                      <span className="text-slate-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 w-36">Type</th>
                <th className="py-3 px-4 w-44">Domain</th>
                <th className="py-3 px-4 w-28 text-center">Provisions</th>
                <th className="py-3 px-4 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading statutory regulations...
                  </td>
                </tr>
              ) : pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No regulatory instruments match the selected filters.
                  </td>
                </tr>
              ) : (
                pagedItems.map((inst) => {
                  return (
                    <tr
                      key={inst.id}
                      onClick={() => onSelectInstrument(inst)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      {/* Star Button */}
                      <td
                        className="py-3 px-3 text-center"
                        onClick={(e) => onToggleStar(inst.id, e)}
                      >
                        <button
                          type="button"
                          className="p-1 hover:bg-slate-200/60 rounded text-slate-400 hover:text-amber-500 transition-colors"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              inst.isStarred
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-slate-300'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Title & Citation */}
                      <td className="py-3.5 px-4 space-y-0.5 max-w-md">
                        <div className="font-bold text-slate-900 group-hover:text-slate-700 truncate">
                          {inst.shortTitle}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 truncate">
                          {inst.officialCitation} · Enacted {inst.year}
                        </div>
                      </td>

                      {/* Regulator */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          <span>🇳🇬</span>
                          <span>{inst.regulator}</span>
                        </span>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        {formatInstrumentType(inst.instrumentType)}
                      </td>

                      {/* Domain */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] text-slate-700">
                          {formatDomainLabel(inst.domain)}
                        </span>
                      </td>

                      {/* Provisions Count */}
                      <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-500">
                        {inst.sectionsCount}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => onViewDoc(inst, e)}
                            title="View Authoritative Document"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectInstrument(inst)}
                            title="View Instrument"
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 3. ZANGO PAGINATION FOOTER: 1–10 of [Count] < > */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <span className="font-mono font-medium">{filteredItems.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1}</span>–
            <span className="font-mono font-medium">{Math.min(safeCurrentPage * PAGE_SIZE, filteredItems.length)}</span> of{' '}
            <span className="font-mono font-bold text-slate-900">{filteredItems.length}</span> instruments
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="font-mono text-slate-500 px-2">
              Page {safeCurrentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
