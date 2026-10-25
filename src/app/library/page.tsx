'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppShell } from '@/shared/ui/AppShell';
import { CircularUploadDrawer } from '@/modules/radar/ui/CircularUploadDrawer';
import {
  RegulatoryInstrumentPresentation,
  StatutorySection,
  DecomposedObligationPresentation,
} from '@/modules/regulatory/types';
import { RegulationLibraryHub } from '@/modules/regulatory/ui/RegulationLibraryHub';
import { RegulatoryInstrumentsTable } from '@/modules/regulatory/ui/RegulatoryInstrumentsTable';
import { InstrumentDetailPage } from '@/modules/regulatory/ui/InstrumentDetailPage';
import { ObligationsRegisterView } from '@/modules/regulatory/ui/ObligationsRegisterView';
import { SideBySideDocViewer } from '@/modules/regulatory/ui/SideBySideDocViewer';
import { AlertCircle, RefreshCw } from 'lucide-react';

type LibraryViewMode = 'hub' | 'instrument' | 'obligations' | 'viewer';

export default function RegulatoryLibraryPage() {
  const [viewMode, setViewMode] = useState<LibraryViewMode>('hub');
  const [instruments, setInstruments] = useState<RegulatoryInstrumentPresentation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>('ALL');

  // Active Selected Instrument & Sections
  const [activeInstrument, setActiveInstrument] = useState<RegulatoryInstrumentPresentation | null>(null);
  const [sections, setSections] = useState<StatutorySection[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);

  // Local Starred & Ingest Drawer
  const [starredInstrumentIds, setStarredInstrumentIds] = useState<Set<string>>(new Set());
  const [starredObligationIds, setStarredObligationIds] = useState<Set<string>>(new Set());
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // 1. Fetch Instruments from /api/library
  const fetchInstruments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedDomain !== 'ALL') params.set('domain', selectedDomain);
      if (selectedJurisdiction !== 'ALL') params.set('jurisdiction', selectedJurisdiction);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/library?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load statutory library: HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        const mapped: RegulatoryInstrumentPresentation[] = (data.instruments || []).map((inst: any) => ({
          ...inst,
          isStarred: starredInstrumentIds.has(inst.id),
        }));
        setInstruments(mapped);
      } else {
        throw new Error(data.error || 'Failed to fetch statutory corpus');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to live regulatory database.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDomain, selectedJurisdiction, searchQuery, starredInstrumentIds]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInstruments();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchInstruments]);

  // 2. Fetch Sections & Decomposed Obligations for an Instrument
  const fetchClausesForInstrument = useCallback(async (inst: RegulatoryInstrumentPresentation) => {
    setIsLoadingSections(true);
    try {
      const res = await fetch(`/api/library/clauses?instrumentId=${encodeURIComponent(inst.id)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success && data.clauses) {
        const mappedSections: StatutorySection[] = data.clauses.map((c: any) => {
          const obligations: DecomposedObligationPresentation[] = (c.obligations || []).map((obl: any) => {
            let ruleNature: 'Prescriptive' | 'Risk Based' | 'Policy Applicable' | 'Mandatory Disclosure' = 'Prescriptive';
            if (obl.obligationType === 'MANDATORY_DISCLOSURE') ruleNature = 'Mandatory Disclosure';
            else if (obl.obligationType === 'RISK_BASED') ruleNature = 'Risk Based';
            else if (obl.obligationType === 'POLICY_APPLICABLE') ruleNature = 'Policy Applicable';

            const isStarred = starredObligationIds.has(obl.id);
            const status = obl.status || (obl.userOverride?.status) || 'PENDING_REVIEW';

            return {
              id: obl.id,
              clauseId: c.id,
              sectionReference: c.sectionReference,
              sectionHeading: c.sectionHeading,
              obligationType: obl.obligationType,
              ruleNature,
              title: obl.summary || c.sectionHeading,
              summary: obl.summary,
              statutoryText: c.clauseText,
              severityFloor: obl.severityFloor || 'LEVEL_3',
              statutoryTimelineDays: obl.statutoryTimelineDays || null,
              mandatoryDisclosureText: obl.mandatoryDisclosureText || null,
              targetRole: obl.targetRole || 'Chief Compliance Officer',
              status,
              isApplicable: status !== 'NOT_APPLICABLE',
              isStarred,
              penalties: obl.penalties || [],
              assessmentCriteria: obl.assessmentCriteria || [
                {
                  id: `crit-${obl.id}-1`,
                  criterionText: `Internal operational manual contains unambiguous rules implementing ${c.sectionReference}`,
                  evidenceRequired: 'Approved institutional policy document or standard operating procedure',
                  isMandatory: true,
                  defaultChecked: true,
                },
              ],
              userOverride: obl.userOverride,
            };
          });

          return {
            id: c.id,
            sectionReference: c.sectionReference,
            sectionHeading: c.sectionHeading,
            clauseText: c.clauseText,
            pageNumber: c.pageNumber,
            paragraphReference: c.paragraphReference,
            obligationsCount: obligations.length,
            obligations,
          };
        });

        setSections(mappedSections);
      } else {
        setSections([]);
      }
    } catch (err) {
      console.error('Failed to load clauses', err);
      setSections([]);
    } finally {
      setIsLoadingSections(false);
    }
  }, [starredObligationIds]);

  // 3. Update Obligation User Override
  const handleUpdateObligationOverride = async (
    obligationId: string,
    override: {
      status?: 'ADEQUATELY_MET' | 'PARTIALLY_MET' | 'GAP_DETECTED' | 'NOT_APPLICABLE' | 'PENDING_REVIEW';
      assignedOwner?: string;
      internalNotes?: string;
      internalSopCitation?: string;
      verifiedCriteriaIds?: string[];
    }
  ) => {
    try {
      await fetch('/api/library/obligations/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obligationId, override }),
      });

      // Optimistically update sections state
      setSections((prevSections) =>
        prevSections.map((sec) => ({
          ...sec,
          obligations: sec.obligations.map((obl) => {
            if (obl.id === obligationId) {
              return {
                ...obl,
                status: override.status || obl.status,
                targetRole: override.assignedOwner || obl.targetRole,
                userOverride: {
                  ...obl.userOverride,
                  status: (override.status as any) || obl.status,
                  assignedOwner: override.assignedOwner || obl.targetRole,
                  internalNotes: override.internalNotes || '',
                  internalSopCitation: override.internalSopCitation || '',
                  verifiedCriteriaIds: override.verifiedCriteriaIds || [],
                },
              };
            }
            return obl;
          }),
        }))
      );
    } catch (err) {
      console.error('Failed to persist obligation override', err);
    }
  };

  // 4. Star Toggles
  const handleToggleStarInstrument = (instrumentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
        i.id === instrumentId ? { ...i, isStarred: !i.isStarred } : i
      )
    );

    if (activeInstrument && activeInstrument.id === instrumentId) {
      setActiveInstrument({
        ...activeInstrument,
        isStarred: !activeInstrument.isStarred,
      });
    }
  };

  const handleToggleStarObligation = (obligationId: string) => {
    setStarredObligationIds((prev) => {
      const next = new Set(prev);
      if (next.has(obligationId)) {
        next.delete(obligationId);
      } else {
        next.add(obligationId);
      }
      return next;
    });

    setSections((prevSections) =>
      prevSections.map((sec) => ({
        ...sec,
        obligations: sec.obligations.map((obl) =>
          obl.id === obligationId ? { ...obl, isStarred: !obl.isStarred } : obl
        ),
      }))
    );
  };

  // 5. Select Instrument
  const handleSelectInstrument = (inst: RegulatoryInstrumentPresentation) => {
    setActiveInstrument(inst);
    setViewMode('instrument');
    fetchClausesForInstrument(inst);
  };

  const handleViewDoc = (inst: RegulatoryInstrumentPresentation, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveInstrument(inst);
    fetchClausesForInstrument(inst);
    setViewMode('viewer');
  };

  // Live Counts for Matrix
  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const inst of instruments) {
      counts[inst.domain] = (counts[inst.domain] || 0) + 1;
    }
    return counts;
  }, [instruments]);

  const jurisdictionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const inst of instruments) {
      counts[inst.jurisdiction] = (counts[inst.jurisdiction] || 0) + 1;
    }
    return counts;
  }, [instruments]);

  return (
    <AppShell activePillarOverride="library">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={fetchInstruments}
              className="inline-flex items-center gap-1 font-semibold text-rose-800 hover:underline"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* View Mode 1: Centralized Regulation Library Hub & Directory Table */}
        {viewMode === 'hub' && (
          <div className="space-y-8">
            <RegulationLibraryHub
              instruments={instruments}
              selectedDomain={selectedDomain}
              onSelectDomain={setSelectedDomain}
              selectedJurisdiction={selectedJurisdiction}
              onSelectJurisdiction={setSelectedJurisdiction}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectInstrument={handleSelectInstrument}
              onOpenIngestDrawer={() => setIsUploadOpen(true)}
              domainCounts={domainCounts}
              jurisdictionCounts={jurisdictionCounts}
            />

            <RegulatoryInstrumentsTable
              instruments={instruments}
              isLoading={isLoading}
              onSelectInstrument={handleSelectInstrument}
              onToggleStar={handleToggleStarInstrument}
              onViewDoc={handleViewDoc}
            />
          </div>
        )}

        {/* View Mode 2: Instrument Detail Page */}
        {viewMode === 'instrument' && activeInstrument && (
          <InstrumentDetailPage
            instrument={activeInstrument}
            onBack={() => setViewMode('hub')}
            onViewObligations={() => setViewMode('obligations')}
            onViewDoc={() => setViewMode('viewer')}
            onToggleStar={handleToggleStarInstrument}
          />
        )}

        {/* View Mode 3: Statutory Obligations Register View & Slide-Over Drawer */}
        {viewMode === 'obligations' && activeInstrument && (
          <ObligationsRegisterView
            instrument={activeInstrument}
            sections={sections}
            isLoading={isLoadingSections}
            onBack={() => setViewMode('instrument')}
            onUpdateObligationOverride={handleUpdateObligationOverride}
            onToggleStar={handleToggleStarObligation}
          />
        )}

        {/* View Mode 4: Side-By-Side Regulatory Document Viewer */}
        {viewMode === 'viewer' && activeInstrument && (
          <SideBySideDocViewer
            instrument={activeInstrument}
            sections={sections}
            onBack={() => setViewMode('instrument')}
          />
        )}

        {/* Ingest Statutory Regulation Modal / Drawer */}
        <CircularUploadDrawer
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onIngestSuccess={() => {
            setIsUploadOpen(false);
            fetchInstruments();
          }}
        />
      </div>
    </AppShell>
  );
}
