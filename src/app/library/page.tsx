'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  CreditCard,
  ShieldAlert,
  Smartphone,
  Lock,
  TrendingUp,
  Coins,
  Filter,
  Check,
  Clock,
  ChevronRight,
  Globe,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  RegulatoryDomainCode,
  DocumentClassification,
  JurisdictionCode,
} from '@/shared/types';
import { ObligationRegisterCard, DecomposedObligationData } from '@/shared/ui/inspector/ObligationRegisterCard';
import { CircularUploadDrawer } from '@/modules/radar/ui/CircularUploadDrawer';

interface StatutoryCorpusItem {
  id: string;
  shortTitle: string;
  fullTitle: string;
  officialCitation: string;
  regulator: string;
  regulatorName: string;
  domain: RegulatoryDomainCode;
  jurisdiction: JurisdictionCode;
  classification: DocumentClassification;
  year: number;
  sectionsCount: number;
  status: 'ACTIVE_LAW' | 'AMENDED';
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
  obligations?: DecomposedObligationData[];
}

interface DomainSummary {
  code: RegulatoryDomainCode;
  name: string;
  description: string;
  iconName: string;
  totalInstruments: number;
  totalObligations: number;
  criticalObligations: number;
}

export default function RegulatoryLibraryPage() {
  const [instruments, setInstruments] = useState<StatutoryCorpusItem[]>([]);
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegulator, setSelectedRegulator] = useState('ALL');
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>('ALL');
  const [selectedClassification, setSelectedClassification] = useState<string>('ALL');

  // Inspect Clause slide-over modal state
  const [activeInstrument, setActiveInstrument] = useState<StatutoryCorpusItem | null>(null);
  const [clauses, setClauses] = useState<StatutoryClause[]>([]);
  const [isLoadingClauses, setIsLoadingClauses] = useState(false);
  const [clauseSearchTerm, setClauseSearchTerm] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchInstruments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedRegulator !== 'ALL') params.set('regulator', selectedRegulator);
      if (selectedDomain !== 'ALL') params.set('domain', selectedDomain);
      if (selectedJurisdiction !== 'ALL') params.set('jurisdiction', selectedJurisdiction);
      if (selectedClassification !== 'ALL') params.set('classification', selectedClassification);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const res = await fetch(`/api/library?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load statutory library: HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setInstruments(data.instruments || []);
        if (data.domains) {
          setDomains(data.domains);
        }
      } else {
        throw new Error(data.error || 'Failed to fetch statutory corpus');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to live regulatory database.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRegulator, selectedDomain, selectedJurisdiction, selectedClassification, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInstruments();
    }, 150);
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

  const handleUpdateObligationOverride = async (obligationId: string, override: any) => {
    try {
      await fetch('/api/library/obligations/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obligationId, override }),
      });
    } catch (err) {
      console.error('Failed to persist obligation override', err);
    }
  };

  const handleExportGazettes = () => {
    if (instruments.length === 0) return;
    const exportData = {
      platform: 'Cogent Sovereign RegTech',
      jurisdictionScope: selectedJurisdiction === 'ALL' ? 'Pan-African & Nigerian Corridors' : selectedJurisdiction,
      exportedAt: new Date().toISOString(),
      statutoryFrameworksCount: instruments.length,
      corpus: instruments.map((i) => ({
        id: i.id,
        shortTitle: i.shortTitle,
        fullTitle: i.fullTitle,
        citation: i.officialCitation,
        domain: i.domain,
        classification: i.classification,
        jurisdiction: i.jurisdiction,
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
    a.download = `cogent-enterprise-statutory-register-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredClauses = useMemo(() => {
    if (!clauseSearchTerm.trim()) return clauses;
    const term = clauseSearchTerm.toLowerCase();
    return clauses.filter(
      (c) =>
        c.sectionReference.toLowerCase().includes(term) ||
        c.sectionHeading.toLowerCase().includes(term) ||
        c.clauseText.toLowerCase().includes(term)
    );
  }, [clauses, clauseSearchTerm]);

  const getDomainIcon = (iconName: string) => {
    switch (iconName) {
      case 'CreditCard':
        return <CreditCard className="w-5 h-5 text-indigo-600" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-5 h-5 text-rose-600" />;
      case 'Smartphone':
        return <Smartphone className="w-5 h-5 text-amber-600" />;
      case 'Lock':
        return <Lock className="w-5 h-5 text-teal-600" />;
      case 'TrendingUp':
        return <TrendingUp className="w-5 h-5 text-blue-600" />;
      case 'Coins':
        return <Coins className="w-5 h-5 text-purple-600" />;
      case 'Scale':
      default:
        return <Scale className="w-5 h-5 text-emerald-600" />;
    }
  };

  const getJurisdictionLabel = (code: JurisdictionCode) => {
    switch (code) {
      case 'NG':
        return '🇳🇬 Nigeria';
      case 'GH':
        return '🇬🇭 Ghana';
      case 'KE':
        return '🇰🇪 Kenya';
      case 'ZA':
        return '🇿🇦 South Africa';
      case 'WAEMU':
        return '🌍 WAEMU';
      case 'SUPRANATIONAL':
        return '🌐 Supranational';
      default:
        return '🌍 Pan-Africa';
    }
  };

  return (
    <AppShell activePillarOverride="library">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* 1. Page Header Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#EEF2FF] text-[#2A4BFF] border border-[#C7D2FE]">
                ENTERPRISE REGULATORY CONTROL ROOM
              </span>
              <span className="text-xs text-[#8D99AE]">
                Pan-African Statutory Acts, Directives & Decomposed Obligation Registers
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#0B0F1A]">Master Regulatory Library</h1>
            <p className="text-xs text-[#4B5565] mt-0.5">
              Authoritative, gazette-verified statutory corpus segmented by domain, jurisdiction, and legal classification.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="btn-base btn-primary btn-sm gap-1.5 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ingest Statutory Regulation</span>
            </button>
            <button
              onClick={handleExportGazettes}
              disabled={isLoading || instruments.length === 0}
              className="btn-base btn-secondary btn-sm gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Statutory Register</span>
            </button>
          </div>
        </div>

        {/* 2. Interactive Domain Overview Cards (Zango Enterprise Grid) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#4B5565] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#2A4BFF]" />
              <span>Regulatory Domains ({domains.length > 0 ? domains.length : 7})</span>
            </span>
            {selectedDomain !== 'ALL' && (
              <button
                onClick={() => setSelectedDomain('ALL')}
                className="text-xs text-[#2A4BFF] hover:underline font-semibold"
              >
                Clear Domain Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {domains.map((dom) => {
              const isSelected = selectedDomain === dom.code;
              return (
                <div
                  key={dom.code}
                  onClick={() => setSelectedDomain(isSelected ? 'ALL' : dom.code)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#2A4BFF] bg-[#2A4BFF]/5 ring-1 ring-[#2A4BFF] shadow-sm'
                      : 'border-[#DDE3EE] bg-white hover:border-[#2A4BFF]/40 hover:bg-[#F9FAFC]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-9 h-9 rounded-lg bg-[#F5F6FA] flex items-center justify-center border border-[#DDE3EE]">
                      {getDomainIcon(dom.iconName)}
                    </div>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#F5F6FA] text-[#4B5565] border border-[#DDE3EE]">
                      {dom.totalInstruments} Frameworks
                    </span>
                  </div>

                  <h3 className={`text-xs font-bold leading-snug mb-1 ${isSelected ? 'text-[#2A4BFF]' : 'text-[#0B0F1A]'}`}>
                    {dom.name}
                  </h3>
                  <p className="text-[11px] text-[#4B5565] line-clamp-2 leading-relaxed">
                    {dom.description}
                  </p>

                  <div className="mt-3 pt-2 border-t border-[#E8EDF5] flex items-center justify-between text-[10px]">
                    <span className="text-[#8D99AE]">Obligations: {dom.totalObligations}</span>
                    <span className="text-rose-600 font-bold">{dom.criticalObligations} Critical</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Multi-Tier Filter & Search Command Strip */}
        <div className="cogent-card p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#8D99AE] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search across statutory acts, circular references, legal citations, and keywords..."
                className="cogent-input pl-9 text-xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8D99AE] hover:text-[#0B0F1A]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Jurisdiction Filter Dropdown */}
            <div className="w-full md:w-auto">
              <select
                value={selectedJurisdiction}
                onChange={(e) => setSelectedJurisdiction(e.target.value)}
                className="cogent-input text-xs py-2 w-full md:w-44"
              >
                <option value="ALL">🌍 All Jurisdictions</option>
                <option value="NG">🇳🇬 Nigeria</option>
                <option value="GH">🇬🇭 Ghana</option>
                <option value="KE">🇰🇪 Kenya</option>
                <option value="ZA">🇿🇦 South Africa</option>
                <option value="WAEMU">🌍 WAEMU (BCEAO)</option>
                <option value="SUPRANATIONAL">🌐 Supranational (FATF)</option>
              </select>
            </div>

            {/* Document Classification Filter Dropdown */}
            <div className="w-full md:w-auto">
              <select
                value={selectedClassification}
                onChange={(e) => setSelectedClassification(e.target.value)}
                className="cogent-input text-xs py-2 w-full md:w-48"
              >
                <option value="ALL">All Classifications</option>
                <option value="PRIMARY_LEGISLATION">⚖️ Primary Acts</option>
                <option value="SUBSIDIARY_REGULATION">📜 Subsidiary Regulations</option>
                <option value="CIRCULAR_DIRECTIVE">📢 Circulars & Directives</option>
                <option value="GUIDANCE_STANDARD">📝 Guidance & Standards</option>
              </select>
            </div>
          </div>

          {/* Apex Regulator Filter Pills */}
          <div className="flex items-center justify-between pt-2 border-t border-[#E8EDF5] flex-wrap gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] font-bold text-[#8D99AE] uppercase tracking-wider mr-1">
                Apex Body:
              </span>
              {['ALL', 'CBN', 'SEC', 'NDPC', 'FCCPC', 'ARCON', 'NFIU'].map((reg) => (
                <button
                  key={reg}
                  onClick={() => setSelectedRegulator(reg)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all shrink-0 ${
                    selectedRegulator === reg
                      ? 'bg-[#2A4BFF] text-white shadow-xs'
                      : 'bg-[#F5F6FA] text-[#4B5565] hover:text-[#0B0F1A] border border-[#DDE3EE]'
                  }`}
                >
                  {reg}
                </button>
              ))}
            </div>

            <div className="text-xs text-[#8D99AE] font-mono">
              Showing {instruments.length} Statutory Frameworks
            </div>
          </div>
        </div>

        {/* 4. Tabular Master Control Room */}
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
            <p className="text-xs text-[#4B5565]">Synchronizing pan-African statutory gazettes and decomposed registers...</p>
          </div>
        ) : instruments.length === 0 ? (
          <div className="cogent-card p-12 text-center space-y-3">
            <BookOpen className="w-8 h-8 text-[#8D99AE] mx-auto" />
            <h3 className="text-sm font-semibold text-[#0B0F1A]">No Statutory Frameworks Found</h3>
            <p className="text-xs text-[#4B5565]">
              No instruments match the selected filters.
            </p>
            <button
              onClick={() => {
                setSelectedRegulator('ALL');
                setSelectedDomain('ALL');
                setSelectedJurisdiction('ALL');
                setSelectedClassification('ALL');
                setSearchTerm('');
              }}
              className="btn-base btn-secondary btn-xs mx-auto"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="cogent-table-container">
            <table className="cogent-table">
              <thead>
                <tr>
                  <th>Statutory Framework & Domain</th>
                  <th>Citation & Jurisdiction</th>
                  <th>Classification</th>
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
                    {/* Title & Domain */}
                    <td className="max-w-md">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#2A4BFF] flex items-center justify-center shrink-0 mt-0.5 border border-[#C7D2FE]">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[#0B0F1A] text-xs">{item.shortTitle}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#F5F6FA] text-[#2A4BFF] border border-[#DDE3EE]">
                              {item.domain.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#4B5565] line-clamp-1 mt-0.5">{item.fullTitle}</span>
                        </div>
                      </div>
                    </td>

                    {/* Citation & Jurisdiction */}
                    <td>
                      <div className="space-y-0.5">
                        <span className="font-mono text-xs text-[#0B0F1A] font-semibold block">
                          {item.officialCitation}
                        </span>
                        <span className="text-[10px] text-[#8D99AE]">
                          {getJurisdictionLabel(item.jurisdiction)}
                        </span>
                      </div>
                    </td>

                    {/* Classification */}
                    <td>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F5F6FA] text-[#4B5565] border border-[#DDE3EE]">
                        {item.classification ? item.classification.replace(/_/g, ' ') : 'REGULATION'}
                      </span>
                    </td>

                    {/* Regulator */}
                    <td>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#EEF2FF] text-[#2A4BFF] border border-[#C7D2FE]">
                        {item.regulator}
                      </span>
                    </td>

                    {/* Enacted Year */}
                    <td className="text-xs text-[#4B5565] font-mono">{item.year}</td>

                    {/* Clauses & Obligations */}
                    <td className="text-xs text-[#4B5565] font-mono">
                      <span className="font-bold text-[#0B0F1A]">
                        {item.sectionsCount > 0 ? `${item.sectionsCount} Sections` : '0 Sections'}
                      </span>
                    </td>

                    {/* Status */}
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

                    {/* Action */}
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleInspectClauses(item)}
                        className="btn-base btn-secondary btn-xs text-[#2A4BFF] hover:bg-[#EEF2FF] gap-1"
                      >
                        <span>Inspect Register</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Slide-Over Decomposed Obligation Register Drawer */}
        {activeInstrument && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Statutory Obligation Register"
            className="fixed inset-0 z-50 flex justify-end cogent-dim-backdrop animate-in fade-in duration-200"
            onClick={() => setActiveInstrument(null)}
          >
            <div
              className="w-full max-w-[760px] h-full bg-white border-l border-[#DDE3EE] shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-[#DDE3EE] space-y-2.5 bg-[#F9FAFC]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#EEF2FF] text-[#2A4BFF] border border-[#C7D2FE]">
                      {activeInstrument.regulator}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#0B0F1A]">
                      {activeInstrument.officialCitation}
                    </span>
                    <span className="text-[10px] text-[#8D99AE]">
                      {getJurisdictionLabel(activeInstrument.jurisdiction)}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveInstrument(null)}
                    className="p-1.5 text-[#8D99AE] hover:text-[#0B0F1A] hover:bg-[#E8EDF5] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-[#0B0F1A]">{activeInstrument.shortTitle}</h2>
                  <p className="text-xs text-[#4B5565] mt-0.5 leading-relaxed">{activeInstrument.description}</p>
                </div>

                {/* Search in Drawer */}
                <div className="pt-1">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#8D99AE] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={clauseSearchTerm}
                      onChange={(e) => setClauseSearchTerm(e.target.value)}
                      placeholder="Filter obligations by section number, keyword, or role..."
                      className="cogent-input pl-8 text-xs py-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Drawer Scrollable Content: Decomposed Obligation Register */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#F5F6FA]">
                {isLoadingClauses ? (
                  <div className="py-20 text-center space-y-3">
                    <Loader2 className="w-7 h-7 text-[#2A4BFF] animate-spin mx-auto" />
                    <p className="text-xs text-[#4B5565]">
                      Decomposing legal clauses into structured obligation register...
                    </p>
                  </div>
                ) : filteredClauses.length === 0 ? (
                  <div className="py-20 text-center space-y-2">
                    <Scale className="w-8 h-8 text-[#8D99AE] mx-auto" />
                    <h3 className="text-sm font-semibold text-[#0B0F1A]">No Clauses Found</h3>
                    <p className="text-xs text-[#4B5565] max-w-xs mx-auto">
                      {clauseSearchTerm
                        ? `No clauses match "${clauseSearchTerm}".`
                        : 'No clauses currently indexed for this statutory framework.'}
                    </p>
                  </div>
                ) : (
                  filteredClauses.map((clause) => (
                    <div
                      key={clause.id}
                      className="p-4 rounded-xl border border-[#DDE3EE] bg-white space-y-3 shadow-xs"
                    >
                      {/* Section Citation Bar */}
                      <div className="flex items-center justify-between gap-2 border-b border-[#E8EDF5] pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#2A4BFF] bg-[#EEF2FF] px-2 py-0.5 rounded border border-[#C7D2FE]">
                            {clause.sectionReference}
                          </span>
                          <h4 className="text-xs font-bold text-[#0B0F1A]">{clause.sectionHeading}</h4>
                        </div>
                        {clause.pageNumber && (
                          <span className="text-[10px] text-[#8D99AE] font-mono">
                            Page {clause.pageNumber}
                          </span>
                        )}
                      </div>

                      {/* Verbatim Clause Excerpt */}
                      <p className="text-xs text-[#334155] leading-relaxed italic bg-[#F9FAFC] p-3 rounded-lg border border-[#E8EDF5]">
                        &ldquo;{clause.clauseText}&rdquo;
                      </p>

                      {/* Decomposed Obligations */}
                      {clause.obligations && clause.obligations.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5565] block">
                            Enforceable Obligations ({clause.obligations.length})
                          </span>

                          {clause.obligations.map((obl) => (
                            <ObligationRegisterCard
                              key={obl.id}
                              obligation={{
                                ...obl,
                                verbatimClauseText: clause.clauseText,
                                sectionReference: clause.sectionReference,
                              }}
                              onUpdateOverride={handleUpdateObligationOverride}
                            />
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
                  {filteredClauses.length} Sections / Clauses Indexed
                </span>
                <div className="flex items-center gap-2">
                  {activeInstrument.sourceFileUrl && (
                    <a
                      href={activeInstrument.sourceFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-base btn-secondary btn-xs gap-1"
                    >
                      <span>Official Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <button
                    onClick={() => setActiveInstrument(null)}
                    className="btn-base btn-primary btn-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. Ingest Regulation Modal Drawer */}
        <CircularUploadDrawer
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onIngestSuccess={() => {
            fetchInstruments();
          }}
        />
      </div>
    </AppShell>
  );
}
