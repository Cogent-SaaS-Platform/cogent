'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  PlatformPillar,
  CrossPillarLinkContext,
  LicenseType,
  PaymentRail,
  RadarPriority,
  RegulatorCode,
  LineageStatus,
} from '@/shared/types';
import {
  RadarCircularPresentationCard,
  CircularIngestResult,
} from '../types';
import { CircularUploadDrawer } from './CircularUploadDrawer';
import { HorizonAlertFeed } from './HorizonAlertFeed';
import { HorizonAlertDetail } from './HorizonAlertDetail';
import { defaultCountdownCalculator } from '../services/deadlineCountdownCalculator';
import { MultiPaneContainer } from '@/shared/ui/inspector/MultiPaneContainer';
import { useInspectorStore } from '@/shared/ui/inspector/inspectorStore';
import {
  circularToInspectorItem,
  obligationToInspectorItem,
} from '@/shared/ui/inspector/adapters';
import { InspectorItemData, StatutoryReferenceData } from '@/shared/ui/inspector/types';

export interface RadarCockpitProps {
  onSwitchPillar?: (pillar: PlatformPillar, context?: CrossPillarLinkContext) => void;
  initialContext?: CrossPillarLinkContext | null;
}

export function RadarCockpit({ onSwitchPillar, initialContext }: RadarCockpitProps) {
  const searchParams = useSearchParams();
  const urlSearch = searchParams?.get('search') || searchParams?.get('topic') || '';

  const [circulars, setCirculars] = useState<RadarCircularPresentationCard[]>([]);
  const [selectedCircularId, setSelectedCircularId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'feed' | 'detail'>('feed');

  // Overlay & Sync States
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState<boolean>(false);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);
  const [isSyncingFeeds, setIsSyncingFeeds] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Today, 10:45 AM');

  // Tenant Profile Context
  const [tenantProfile, setTenantProfile] = useState<{
    organizationId?: string;
    organizationName?: string;
    activeLicenses?: string[];
    activeRails?: string[];
  } | null>(null);

  // Live Database Fetcher
  const fetchLiveCirculars = useCallback(async () => {
    try {
      setIsLoadingLive(true);
      const res = await fetch('/api/radar/circulars');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        if (data.tenantProfile) {
          setTenantProfile(data.tenantProfile);
        }
        if (Array.isArray(data.circulars)) {
          setCirculars(data.circulars);
          if (data.circulars.length > 0) {
            setSelectedCircularId((prev) => {
              if (prev && data.circulars.some((c: RadarCircularPresentationCard) => c.id === prev)) {
                return prev;
              }
              return data.circulars[0].id;
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch live circulars', err);
    } finally {
      setIsLoadingLive(false);
    }
  }, []);

  // Live Feed Synchronizer (Silent background sync)
  const handleSyncLiveFeeds = async () => {
    try {
      setIsSyncingFeeds(true);
      const res = await fetch('/api/radar/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        setLastSyncTime(`Today, ${timeStr}`);
        await fetchLiveCirculars();
      }
    } catch (err: unknown) {
      console.error('Sync network failure', err);
    } finally {
      setIsSyncingFeeds(false);
    }
  };

  useEffect(() => {
    fetchLiveCirculars();
  }, [fetchLiveCirculars]);

  // Deep linking initial context consumption
  useEffect(() => {
    if (initialContext) {
      if (initialContext.circularNumber) {
        const found = circulars.find((c) => c.circularNumber.includes(initialContext.circularNumber!));
        if (found) {
          setSelectedCircularId(found.id);
          setViewMode('detail');
        }
      } else if (initialContext.searchTerm) {
        const term = initialContext.searchTerm.toLowerCase();
        const found = circulars.find(
          (c) =>
            c.subject.toLowerCase().includes(term) ||
            c.circularNumber.toLowerCase().includes(term) ||
            c.regulator.toLowerCase().includes(term)
        );
        if (found) {
          setSelectedCircularId(found.id);
          setViewMode('detail');
        }
      }
    }
  }, [initialContext, circulars]);

  const selectedCircular = useMemo(() => {
    if (!circulars || circulars.length === 0) return null;
    return circulars.find((c) => c.id === selectedCircularId) || circulars[0] || null;
  }, [circulars, selectedCircularId]);

  // Navigation between circulars in Detail view
  const currentCircularIndex = useMemo(() => {
    return circulars.findIndex((c) => c.id === selectedCircularId);
  }, [circulars, selectedCircularId]);

  const handleNavigatePrev = useMemo(() => {
    if (currentCircularIndex > 0) {
      return () => setSelectedCircularId(circulars[currentCircularIndex - 1].id);
    }
    return undefined;
  }, [circulars, currentCircularIndex]);

  const handleNavigateNext = useMemo(() => {
    if (currentCircularIndex >= 0 && currentCircularIndex < circulars.length - 1) {
      return () => setSelectedCircularId(circulars[currentCircularIndex + 1].id);
    }
    return undefined;
  }, [circulars, currentCircularIndex]);

  // Toggle relevance handler
  const handleToggleRelevant = (id: string) => {
    setCirculars((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            applicability: {
              ...c.applicability,
              isApplicable: !c.applicability.isApplicable,
            },
          };
        }
        return c;
      })
    );
  };

  // Toggle star handler
  const handleToggleStar = (id: string) => {
    setCirculars((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isStarred: !c.isStarred } : c))
    );
  };

  // Master circular update handler
  const handleUpdateCircular = useCallback(
    (updated: Partial<RadarCircularPresentationCard> & { id: string }) => {
      setCirculars((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
      );
    },
    []
  );

  // Multi-Pane Inspector Engine Wiring
  const inspectableIds = useMemo(() => {
    const ids: string[] = circulars.map((c) => c.id);
    if (selectedCircular?.actionItems) {
      selectedCircular.actionItems.forEach((act) => ids.push(act.id));
    }
    return ids;
  }, [circulars, selectedCircular]);

  const inspector = useInspectorStore(inspectableIds);

  const activeInspectorItem: InspectorItemData | null = useMemo(() => {
    if (!inspector.inspectId) return null;
    const circ = circulars.find((c) => c.id === inspector.inspectId);
    if (circ) return circularToInspectorItem(circ);
    for (const c of circulars) {
      const act = c.actionItems?.find((a) => a.id === inspector.inspectId);
      if (act) return obligationToInspectorItem(act, c);
    }
    return null;
  }, [inspector.inspectId, circulars]);

  const activeReference: StatutoryReferenceData | null = useMemo(() => {
    if (!inspector.refId) return null;
    if (activeInspectorItem?.statutoryReference?.id === inspector.refId) {
      return activeInspectorItem.statutoryReference;
    }
    const matchedCirc = circulars.find(
      (c) => c.id === inspector.refId || `ref-${c.id}` === inspector.refId
    );
    if (matchedCirc) {
      return {
        id: `ref-${matchedCirc.id}`,
        statutoryInstrumentTitle: `${matchedCirc.regulator} Directive ${matchedCirc.circularNumber}`,
        citationClause: matchedCirc.circularNumber,
        regulatorCode: matchedCirc.regulator,
        verbatimLegalText: `${matchedCirc.subject}\n\n${matchedCirc.summary}`,
        statutoryPenaltyNaira: matchedCirc.penaltyEscalationProjection?.totalProjectedExposureNaira,
        dailyFineNaira: matchedCirc.penaltyEscalationProjection?.dailyFineNaira,
        effectiveDate: matchedCirc.effectiveDate,
        highlightedPhrase: matchedCirc.subject,
      };
    }
    return activeInspectorItem?.statutoryReference || null;
  }, [inspector.refId, activeInspectorItem, circulars]);

  const handleIngestSuccess = (rawResult: unknown) => {
    const result = rawResult as CircularIngestResult;
    const meta = result?.metadata;
    if (!meta) return;

    const countdown = defaultCountdownCalculator.calculateCountdown({
      statutoryDeadline: meta.statutoryDeadline || null,
      publicationDate: meta.publicationDate,
      regulator: meta.regulatorCode,
    });

    const newCard: RadarCircularPresentationCard = {
      id: result.circularId,
      circularNumber: meta.circularNumber,
      regulator: meta.regulatorCode,
      subject: meta.subject,
      summary: meta.summary,
      publicationDate: meta.publicationDate,
      effectiveDate: meta.effectiveDate,
      statutoryDeadline: meta.statutoryDeadline ?? null,
      daysRemaining: countdown.daysRemaining,
      businessDaysRemaining: countdown.businessDaysRemaining,
      countdownTier: countdown.tier,
      urgencyWindow: countdown.urgencyWindow,
      priority: meta.priority,
      enforcementRiskLevel: meta.enforcementRiskLevel,
      lineageStatus: (result.lineageStatus || 'ACTIVE_LAW') as LineageStatus,
      targetedLicenses: meta.targetedLicenseTypes,
      affectedRails: meta.affectedPaymentRails,
      appliesUniversally: meta.appliesUniversally,
      penaltyEscalationProjection: countdown.penaltyEscalation,
      deduplicated: result.deduplicated,
      applicability: {
        isApplicable: true,
        reason: `Matched during live ingestion: targets [ ${(meta.targetedLicenseTypes || []).join(', ')} ].`,
        matchedLicenses: meta.targetedLicenseTypes,
        matchedRails: meta.affectedPaymentRails,
      },
      executiveBriefCco: `Official directive from ${meta.regulatorCode}. Full compliance required by ${meta.statutoryDeadline || 'statutory timeline'}.`,
      actionBriefCoo: `Verify rail continuity for ${(meta.affectedPaymentRails || []).join(', ')}.`,
      technicalBriefProductEng: 'Implement required schema and authentication limit adjustments.',
      technicalBriefCto: 'Audit microservice APIs and database models to support statutory compliance.',
      financialBriefCfo: 'Verify reserve adequacy and transaction fee allocations.',
      governanceBriefCeoCro: 'Convene Executive Risk Committee to review remediation SLA.',
      actionItems: [
        {
          id: `act_${Date.now()}`,
          targetDepartment: 'COMPLIANCE_LEGAL',
          actionTitle: `Statutory Review: ${meta.circularNumber}`,
          actionDescription: 'Execute regulatory risk review and prepare board brief.',
          suggestedDeadline: meta.statutoryDeadline,
          isCompleted: false,
        },
      ],
    };

    setCirculars([newCard, ...circulars]);
    setSelectedCircularId(newCard.id);
    setViewMode('detail');
  };

  const handleExportBrief = async (format: 'markdown' | 'pdf' = 'markdown') => {
    if (!selectedCircular) {
      alert('Please select a regulatory directive to export its board brief.');
      return;
    }
    try {
      const fetchFormat = format === 'pdf' ? 'html' : format;
      const res = await fetch('/api/radar/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circular: selectedCircular,
          applicability: selectedCircular.applicability,
          roleBriefs: {
            executiveBriefCco: selectedCircular.executiveBriefCco,
            actionBriefCoo: selectedCircular.actionBriefCoo,
            technicalBriefProductEng: selectedCircular.technicalBriefProductEng,
            financialBriefCfo: selectedCircular.financialBriefCfo,
            technicalBriefCto: selectedCircular.technicalBriefCto,
            governanceBriefCeoCro: selectedCircular.governanceBriefCeoCro,
          },
          actionItems: selectedCircular.actionItems,
          format: fetchFormat,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate Board Brief');

      if (format === 'pdf') {
        const html = await res.text();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.open();
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => printWindow.print(), 350);
        }
      } else {
        const text = await res.text();
        const blob = new Blob([text], { type: 'text/markdown' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Executive_Board_Brief_${selectedCircular.circularNumber.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err: unknown) {
      alert('Error exporting brief: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <MultiPaneContainer
      inspector={inspector}
      activeItem={activeInspectorItem}
      activeReference={activeReference}
    >
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
          {viewMode === 'feed' ? (
            <HorizonAlertFeed
              circulars={circulars}
              selectedId={selectedCircularId}
              onSelectCircular={(id) => {
                setSelectedCircularId(id);
                setViewMode('detail');
              }}
              isLoading={isLoadingLive}
              isSyncing={isSyncingFeeds}
              onTriggerSync={handleSyncLiveFeeds}
              onOpenIngest={() => setIsUploadDrawerOpen(true)}
              onToggleRelevant={(id) => handleToggleRelevant(id)}
              onToggleStar={(id) => handleToggleStar(id)}
              lastUpdatedText={lastSyncTime}
              initialSearchQuery={urlSearch || initialContext?.searchTerm || ''}
            />
          ) : selectedCircular ? (
            <HorizonAlertDetail
              circular={selectedCircular}
              onBack={() => setViewMode('feed')}
              onNavigatePrev={handleNavigatePrev}
              onNavigateNext={handleNavigateNext}
              onExportBrief={handleExportBrief}
              onToggleRelevant={(id) => handleToggleRelevant(id)}
              onUpdateCircular={handleUpdateCircular}
            />
          ) : (
            <HorizonAlertFeed
              circulars={circulars}
              selectedId={selectedCircularId}
              onSelectCircular={(id) => {
                setSelectedCircularId(id);
                setViewMode('detail');
              }}
              isLoading={isLoadingLive}
              isSyncing={isSyncingFeeds}
              onTriggerSync={handleSyncLiveFeeds}
              onOpenIngest={() => setIsUploadDrawerOpen(true)}
              onToggleRelevant={(id) => handleToggleRelevant(id)}
              onToggleStar={(id) => handleToggleStar(id)}
              lastUpdatedText={lastSyncTime}
              initialSearchQuery={urlSearch || initialContext?.searchTerm || ''}
            />
          )}
        </main>

        {/* Ingest Circular Drawer */}
        <CircularUploadDrawer
          isOpen={isUploadDrawerOpen}
          onClose={() => setIsUploadDrawerOpen(false)}
          onIngestSuccess={(result) => {
            handleIngestSuccess(result);
            setIsUploadDrawerOpen(false);
          }}
        />
      </div>
    </MultiPaneContainer>
  );
}
