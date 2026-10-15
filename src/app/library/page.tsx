'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/shared/ui/AppShell';
import {
  BookOpen,
  Search,
  ShieldCheck,
  Download,
  ExternalLink,
  X,
  FileText,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
  Scale,
  CheckCircle2,
} from 'lucide-react';

interface StatutoryCorpusItem {
  id: string;
  shortTitle: string;
  fullTitle: string;
  officialCitation: string;
  regulator: string;
  regulatorName: string;
  year: number;
  sectionsCount: number;
  status: 'ACTIVE_LAW' | 'AMENDED' | 'REPEALED';
  description: string;
  activeVersionId?: string | null;
  publicationDate?: string | null;
  effectiveDate?: string | null;
  sourceFileUrl?: string | null;
}

interface StatutoryClause {
  id: string;
  sectionReference: string;
  sectionHeading: string;
  clauseText: string;
  pageNumber?: number | null;
  paragraphReference?: string | null;
  obligations?: Array<{
    id: string;
    obligationType: string;
    summary: string;
    severityFloor: string;
    statutoryTimelineDays?: number | null;
    mandatoryDisclosureText?: string | null;
  }>;
}

export default function RegulatoryLibraryPage() {
  const [instruments, setInstruments] = useState<StatutoryCorpusItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegulator, setSelectedRegulator] = useState('ALL');

  // Inspect Clause slide-over modal state
  const [activeInstrument, setActiveInstrument] = useState<StatutoryCorpusItem | null>(null);
  const [clauses, setClauses] = useState<StatutoryClause[]>([]);
  const [isLoadingClauses, setIsLoadingClauses] = useState(false);
  const [clauseSearchTerm, setClauseSearchTerm] = useState('');

  const fetchInstruments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedRegulator !== 'ALL') params.set('regulator', selectedRegulator);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const res = await fetch(`/api/library?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load statutory library: HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setInstruments(data.instruments || []);
      } else {
        throw new Error(data.error || 'Failed to fetch statutory corpus');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to live regulatory database.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRegulator, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInstruments();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchInstruments]);

  const handleInspectClauses = async (item: StatutoryCorpusItem) => {
    setActiveInstrument(item);
    setIsLoadingClauses(true);
    setClauseSearchTerm('');
    try {
      const res = await fetch(`/api/library/clauses?instrumentId=${encodeURIComponent(item.id)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setClauses(data.clauses || []);
      } else {
        setClauses([]);
      }
    } catch (err) {
      console.error('Failed to load clauses', err);
      setClauses([]);
    } finally {
      setIsLoadingClauses(false);
    }
  };

  const handleExportGazettes = () => {
    if (instruments.length === 0) return;
    const exportData = {
      jurisdiction: 'Federal Republic of Nigeria',
      exportedAt: new Date().toISOString(),
      statutoryFrameworksCount: instruments.length,
      corpus: instruments.map((i) => ({
        id: i.id,
        shortTitle: i.shortTitle,
        fullTitle: i.fullTitle,
        citation: i.officialCitation,
        regulator: i.regulator,
        regulatorName: i.regulatorName,
        enactedYear: i.year,
        sectionsCount: i.sectionsCount,
        status: i.status,
        canonicalSource: i.sourceFileUrl,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cogent-statutory-gazettes-index-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredClauses = clauses.filter((c) => {
    if (!clauseSearchTerm.trim()) return true;
    const term = clauseSearchTerm.toLowerCase();
    return (
      c.sectionReference.toLowerCase().includes(term) ||
      c.sectionHeading.toLowerCase().includes(term) ||
      c.clauseText.toLowerCase().includes(term)
    );
  });

  return (
    <AppShell activePillarOverride="library">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Page Header Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#EEF2FF] text-[#2A4BFF] border border-[#C7D2FE]">
                REGULATORY LIBRARY
              </span>
              <span className="text-xs text-[#8D99AE]">Federal Republic of Nigeria Official Gazettes</span>
            </div>
            <h1 className="text-2xl font-bold text-[#0B0F1A]">Master Regulatory Library</h1>
            <p className="text-xs text-[#4B5565] mt-0.5">
              Authoritative statutory corpus of primary acts, subsidiary regulations, and official circular directives.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportGazettes}
              disabled={isLoading || instruments.length === 0}
              className="btn-base btn-secondary btn-sm gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Gazettes Index</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="cogent-card p-4 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#8D99AE] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search across statutory frameworks, citations, and official titles..."
              className="cogent-input pl-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            {['ALL', 'CBN', 'ARCON', 'NDPC', 'FCCPC', 'SEC'].map((reg) => (
              <button
                key={reg}
                onClick={() => setSelectedRegulator(reg)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  selectedRegulator === reg
                    ? 'bg-[#2A4BFF] text-white shadow-xs'
                    : 'bg-[#F5F6FA] text-[#4B5565] hover:text-[#0B0F1A] border border-[#DDE3EE]'
                }`}
              >
                {reg}
              </button>
            ))}
          </div>
        </div>

        {/* Tabular Library or Loading / Empty States */}
        {error ? (
          <div className="cogent-card p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <h3 className="text-base font-semibold text-[#0B0F1A]">Error Loading Regulatory Library</h3>
            <p className="text-xs text-[#4B5565] max-w-md mx-auto">{error}</p>
            <button onClick={() => fetchInstruments()} className="btn-base btn-secondary btn-sm mx-auto">
              Retry Connection
            </button>
          </div>
        ) : isLoading ? (
          <div className="cogent-card p-12 text-center space-y-3">
            <Loader2 className="w-7 h-7 text-[#2A4BFF] animate-spin mx-auto" />
            <p className="text-xs text-[#4B5565]">Connecting to Nigerian Federal Gazettes Database...</p>
          </div>
        ) : instruments.length === 0 ? (
          <div className="cogent-card p-12 text-center space-y-3">
            <BookOpen className="w-8 h-8 text-[#8D99AE] mx-auto" />
            <h3 className="text-sm font-semibold text-[#0B0F1A]">No Statutory Frameworks Found</h3>
            <p className="text-xs text-[#4B5565]">
              No instruments match regulator &ldquo;{selectedRegulator}&rdquo; with query &ldquo;{searchTerm}&rdquo;.
            </p>
          </div>
        ) : (
          <div className="cogent-table-container">
            <table className="cogent-table">
              <thead>
                <tr>
                  <th>Statutory Framework</th>
                  <th>Citation</th>
                  <th>Regulator</th>
                  <th>Enacted</th>
                  <th>Clauses</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {instruments.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer hover:bg-[#F9FAFC] transition-colors"
                    onClick={() => handleInspectClauses(item)}
                  >
                    <td className="max-w-md">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#2A4BFF] flex items-center justify-center shrink-0 mt-0.5">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-semibold text-[#0B0F1A] block">{item.shortTitle}</span>
                          <span className="text-[11px] text-[#4B5565] line-clamp-1">{item.fullTitle}</span>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-[#4B5565]">{item.officialCitation}</td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#F5F6FA] text-[#0B0F1A] border border-[#DDE3EE]">
                        {item.regulator}
                      </span>
                    </td>
                    <td className="text-xs text-[#4B5565] font-mono">{item.year}</td>
                    <td className="text-xs text-[#4B5565] font-mono">
                      {item.sectionsCount > 0 ? `${item.sectionsCount} Clauses` : 'Corpus Ingested'}
                    </td>
                    <td>
                      <span
                        className={`pill-status ${
                          item.status === 'ACTIVE_LAW' ? 'pill-healthy' : 'pill-warning'
                        }`}
                      >
                        <span
                          className={`pill-dot ${
                            item.status === 'ACTIVE_LAW' ? 'pill-dot-healthy' : 'pill-dot-warning'
                          }`}
                        />
                        {item.status === 'ACTIVE_LAW' ? 'Active Law' : 'Amended'}
                      </span>
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleInspectClauses(item)}
                        className="btn-base btn-ghost btn-xs text-[#2A4BFF] hover:bg-[#EEF2FF]"
                      >
                        <span>Inspect Clauses</span>
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Slide-over Clause Reader Drawer */}
        {activeInstrument && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Statutory Clause Reader"
            className="fixed inset-0 z-50 flex justify-end cogent-dim-backdrop animate-in fade-in duration-200"
            onClick={() => setActiveInstrument(null)}
          >
            <div
              className="w-full max-w-[620px] h-full bg-white border-l border-[#DDE3EE] shadow-drawer flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-[#DDE3EE] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#EEF2FF] text-[#2A4BFF] border border-[#C7D2FE]">
                      {activeInstrument.regulator}
                    </span>
                    <span className="text-xs font-mono text-[#8D99AE]">
                      {activeInstrument.officialCitation}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveInstrument(null)}
                    className="p-1.5 text-[#8D99AE] hover:text-[#0B0F1A] hover:bg-[#F5F6FA] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0B0F1A]">{activeInstrument.shortTitle}</h2>
                  <p className="text-xs text-[#4B5565] mt-0.5 line-clamp-2">{activeInstrument.fullTitle}</p>
                </div>

                {/* Clause Search Input */}
                <div className="pt-1">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#8D99AE] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={clauseSearchTerm}
                      onChange={(e) => setClauseSearchTerm(e.target.value)}
                      placeholder="Filter clauses by section, heading, or keywords..."
                      className="cogent-input pl-8 text-xs py-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {isLoadingClauses ? (
                  <div className="py-16 text-center space-y-2">
                    <Loader2 className="w-6 h-6 text-[#2A4BFF] animate-spin mx-auto" />
                    <p className="text-xs text-[#4B5565]">Retrieving statutory clauses from vector corpus...</p>
                  </div>
                ) : filteredClauses.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <Scale className="w-8 h-8 text-[#8D99AE] mx-auto" />
                    <h3 className="text-sm font-semibold text-[#0B0F1A]">No Clauses Indexed</h3>
                    <p className="text-xs text-[#4B5565] max-w-xs mx-auto">
                      {clauseSearchTerm
                        ? `No clauses match "${clauseSearchTerm}".`
                        : 'Clauses for this instrument are scheduled for granular tokenization in the statutory pipeline.'}
                    </p>
                  </div>
                ) : (
                  filteredClauses.map((clause) => (
                    <div
                      key={clause.id}
                      className="p-4 rounded-xl border border-[#DDE3EE] bg-[#F9FAFC] space-y-2.5 hover:border-[#2A4BFF] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-[#2A4BFF] bg-[#EEF2FF] px-2 py-0.5 rounded border border-[#C7D2FE]">
                          {clause.sectionReference}
                        </span>
                        {clause.pageNumber && (
                          <span className="text-[10px] text-[#8D99AE] font-mono">
                            Page {clause.pageNumber}
                          </span>
                        )}
                      </div>

                      {clause.sectionHeading && (
                        <h4 className="text-xs font-bold text-[#0B0F1A]">{clause.sectionHeading}</h4>
                      )}

                      <p className="text-xs text-[#334155] leading-relaxed whitespace-pre-wrap">
                        {clause.clauseText}
                      </p>

                      {clause.obligations && clause.obligations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#E8EDF5] space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5565] block">
                            Enforceable Obligations & Penalties
                          </span>
                          {clause.obligations.map((obl) => (
                            <div
                              key={obl.id}
                              className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  {obl.obligationType}
                                </span>
                                {obl.statutoryTimelineDays && (
                                  <span className="text-[10px] text-[#8D99AE] font-mono">
                                    Deadline: {obl.statutoryTimelineDays} Days
                                  </span>
                                )}
                              </div>
                              <p className="text-[#0B0F1A] text-[11px]">{obl.summary}</p>
                              {obl.mandatoryDisclosureText && (
                                <div className="text-[10px] text-rose-700 bg-rose-50 p-1.5 rounded border border-rose-100 font-mono">
                                  Mandatory: {obl.mandatoryDisclosureText}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-[#DDE3EE] bg-white flex items-center justify-between">
                <span className="text-xs text-[#8D99AE] font-mono">
                  {filteredClauses.length} clauses displayed
                </span>
                {activeInstrument.sourceFileUrl && (
                  <a
                    href={activeInstrument.sourceFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-base btn-secondary btn-xs gap-1"
                  >
                    <span>View Gazette Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
