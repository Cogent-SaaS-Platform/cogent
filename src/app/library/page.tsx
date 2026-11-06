'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppShell } from '@/shared/ui/AppShell';
import { IngestRegulationModal } from '@/modules/regulatory/ui/IngestRegulationModal';
import {
  RegulatoryInstrumentPresentation,
  StatutorySection,
} from '@/modules/regulatory/types';
import { RegulationLibraryHub } from '@/modules/regulatory/ui/RegulationLibraryHub';
import { RegulatoryInstrumentsTable } from '@/modules/regulatory/ui/RegulatoryInstrumentsTable';
import { InstrumentDetailPage } from '@/modules/regulatory/ui/InstrumentDetailPage';
import { ObligationsRegisterView } from '@/modules/regulatory/ui/ObligationsRegisterView';
import { SideBySideDocViewer } from '@/modules/regulatory/ui/SideBySideDocViewer';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

type LibraryViewMode = 'hub' | 'list' | 'instrument' | 'obligations' | 'viewer';

const TOPIC_TO_UI_DOMAIN: Record<string, string> = {
  aml_cft: 'AML_CFT',
  data_privacy: 'DATA_PRIVACY_AI',
  consumer_protection: 'CONSUMER_PROTECTION',
  digital_lending: 'DIGITAL_LENDING',
  payments_rails: 'FINTECH_PAYMENTS',
  cybersecurity: 'DATA_PRIVACY_AI',
  capital_liquidity: 'CAPITAL_MARKETS',
  crypto_vasp: 'CRYPTO_VASP',
  corporate_governance: 'FINTECH_PAYMENTS',
};

export default function RegulatoryLibraryPage() {
  const [viewMode, setViewMode] = useState<LibraryViewMode>('hub');
  const [instruments, setInstruments] = useState<RegulatoryInstrumentPresentation[]>([]);
  const [rawTotalCount, setRawTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [selectedRegulator, setSelectedRegulator] = useState<string>('ALL');

  // Active Selected Instrument & Sections
  const [activeInstrument, setActiveInstrument] = useState<RegulatoryInstrumentPresentation | null>(null);
  const [sections, setSections] = useState<StatutorySection[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);

  // Local Starred & Ingest Modal
  const [starredInstrumentIds, setStarredInstrumentIds] = useState<Set<string>>(new Set());
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [urlCircularId, setUrlCircularId] = useState<string | undefined>(undefined);

  // 2. Fetch Sections & Decomposed Obligations for an Instrument
  const fetchClausesForInstrument = useCallback(async (inst: RegulatoryInstrumentPresentation) => {
    setIsLoadingSections(true);
    try {
      const res = await fetch(`/api/library/${encodeURIComponent(inst.id)}/obligations`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success && data.sections) {
        setSections(data.sections);
      } else {
        setSections([]);
      }
    } catch (err) {
      console.error('Failed to load obligations for instrument', err);
      setSections([]);
    } finally {
      setIsLoadingSections(false);
    }
  }, []);

  // Check URL params on mount (?instrumentId=, ?domain=, ?search=, ?view=, ?circularId=)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const view = sp.get('view');
    const cId = sp.get('circularId');
    const instId = sp.get('instrumentId');
    const domParam = sp.get('domain');
    const qParam = sp.get('search');
    const regParam = sp.get('regulator');

    if (domParam) {
      const mapped = TOPIC_TO_UI_DOMAIN[domParam.toLowerCase()] || domParam.toUpperCase();
      setSelectedDomain(mapped);
    }
    if (regParam) {
      setSelectedRegulator(regParam.toUpperCase());
    }
    if (qParam) {
      setSearchQuery(qParam);
    }
    if (cId) {
      setUrlCircularId(cId);
    }

    const targetInstrumentId = instId || cId;
    if (targetInstrumentId) {
      fetch(`/api/library/${encodeURIComponent(targetInstrumentId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.success && data.instrument) {
            setActiveInstrument(data.instrument);
            fetchClausesForInstrument(data.instrument);
            setViewMode(view === 'obligations' ? 'obligations' : 'instrument');
          }
        })
        .catch(() => {});
    } else if (view === 'obligations') {
      setViewMode('obligations');
    } else if (view === 'list') {
      setViewMode('list');
    }
  }, [fetchClausesForInstrument]);

  // 1. Fetch Instruments from /api/library
  const fetchInstruments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedDomain !== 'ALL') params.set('domain', selectedDomain);
      if (selectedRegulator !== 'ALL') params.set('regulator', selectedRegulator);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/library?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Your session token is refreshing. Please refresh your browser or re-authenticate.');
        }
        const errPayload = await res.json().catch(() => null);
        throw new Error(errPayload?.error || `Failed to load statutory library: HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        const mapped: RegulatoryInstrumentPresentation[] = (data.instruments || []).map((inst: any) => ({
          ...inst,
          isStarred: starredInstrumentIds.has(inst.id) || Boolean(inst.isStarred),
        }));
        setInstruments(mapped);
        setRawTotalCount(data.totalAllCount || mapped.length);
      } else {
        throw new Error(data.error || 'Failed to fetch statutory corpus');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to live regulatory database.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDomain, selectedRegulator, searchQuery, starredInstrumentIds]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInstruments();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchInstruments]);

  // 3. Star Toggle for Instrument
  const handleToggleStarInstrument = async (instrumentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const inst = instruments.find((i) => i.id === instrumentId);
    const nextStarred = !inst?.isStarred;

    setStarredInstrumentIds((prev) => {
      const next = new Set(prev);
      if (next.has(instrumentId)) {
        next.delete(instrumentId);
      } else {
        next.add(instrumentId);
      }
      return next;
    });

    setInstruments((prev) =>
      prev.map((i) =>
        i.id === instrumentId ? { ...i, isStarred: nextStarred } : i
      )
    );

    if (activeInstrument && activeInstrument.id === instrumentId) {
      setActiveInstrument({
        ...activeInstrument,
        isStarred: nextStarred,
      });
    }

    try {
      await fetch(`/api/library/${encodeURIComponent(instrumentId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: nextStarred }),
      });
    } catch (err) {
      console.error('Failed to star instrument', err);
    }
  };

  // 4. Select Instrument
  const handleSelectInstrument = (inst: RegulatoryInstrumentPresentation) => {
    setActiveInstrument(inst);
    setViewMode('instrument');
    fetchClausesForInstrument(inst);
    fetch(`/api/library/${encodeURIComponent(inst.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.instrument) {
          setActiveInstrument(data.instrument);
        }
      })
      .catch(() => {});
  };

  const handleViewDoc = (inst: RegulatoryInstrumentPresentation, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveInstrument(inst);
    fetchClausesForInstrument(inst);
    setViewMode('viewer');
  };

  // Live Counts for Domains
  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const inst of instruments) {
      counts[inst.domain] = (counts[inst.domain] || 0) + 1;
    }
    return counts;
  }, [instruments]);

  // Live Counts for Nigerian Regulators
  const regulatorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const inst of instruments) {
      const reg = inst.regulator.toUpperCase();
      counts[reg] = (counts[reg] || 0) + 1;
    }
    return counts;
  }, [instruments]);

  return (
    <AppShell activePillarOverride="library">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={fetchInstruments}
              className="inline-flex items-center gap-1 font-semibold text-rose-800 hover:underline cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* VIEW MODE 1: HUB VIEW (Side-by-side Domains + Regulators, Suggested Cards, 6-Row Preview Table) */}
        {viewMode === 'hub' && (
          <RegulationLibraryHub
            instruments={instruments}
            selectedDomain={selectedDomain}
            onSelectDomain={setSelectedDomain}
            selectedRegulator={selectedRegulator}
            onSelectRegulator={setSelectedRegulator}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectInstrument={handleSelectInstrument}
            onOpenIngestDrawer={() => setIsIngestModalOpen(true)}
            onViewAll={() => setViewMode('list')}
            domainCounts={domainCounts}
            regulatorCounts={regulatorCounts}
            totalAllCount={rawTotalCount || instruments.length}
          />
        )}

        {/* VIEW MODE 2: DEDICATED PAGINATED INSTRUMENT LIST VIEW (1–10 of X, Zango 01:28) */}
        {viewMode === 'list' && (
          <RegulatoryInstrumentsTable
            instruments={instruments}
            isLoading={isLoading}
            onSelectInstrument={handleSelectInstrument}
            onToggleStar={handleToggleStarInstrument}
            onViewDoc={handleViewDoc}
            onBack={() => setViewMode('hub')}
          />
        )}

        {/* VIEW MODE 3: INSTRUMENT DETAIL VIEW (Single Unified Card, No Decomposed Sections on Main Page) */}
        {viewMode === 'instrument' && activeInstrument && (
          <InstrumentDetailPage
            instrument={activeInstrument}
            sections={sections}
            isLoadingSections={isLoadingSections}
            onBack={() => setViewMode('hub')}
            onViewObligations={() => setViewMode('obligations')}
            onViewDoc={() => setViewMode('viewer')}
            onToggleStar={handleToggleStarInstrument}
            onUpdateInstrument={async (id, updates) => {
              setActiveInstrument((prev) => (prev ? { ...prev, ...updates } : null));
              setInstruments((prev) =>
                prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
              );
            }}
          />
        )}

        {/* VIEW MODE 4: OBLIGATIONS REGISTER & SPLIT-SCREEN WORKSPACE */}
        {viewMode === 'obligations' && (
          <ObligationsRegisterView
            instrument={activeInstrument}
            sections={sections}
            isLoading={isLoadingSections}
            onBack={() => {
              if (activeInstrument) setViewMode('instrument');
              else setViewMode('hub');
            }}
            circularId={urlCircularId}
          />
        )}

        {/* VIEW MODE 5: SIDE-BY-SIDE STATUTORY DOCUMENT VIEWER */}
        {viewMode === 'viewer' && activeInstrument && (
          <SideBySideDocViewer
            instrument={activeInstrument}
            sections={sections}
            onBack={() => setViewMode('instrument')}
          />
        )}

        {/* Ingest Regulation Modal */}
        <IngestRegulationModal
          isOpen={isIngestModalOpen}
          onClose={() => setIsIngestModalOpen(false)}
          onSuccess={(newInstrument) => {
            setIsIngestModalOpen(false);
            setInstruments((prev) => [newInstrument, ...prev]);
            setActiveInstrument(newInstrument);
            setViewMode('instrument');
            fetchClausesForInstrument(newInstrument);
          }}
        />
      </div>
    </AppShell>
  );
}
