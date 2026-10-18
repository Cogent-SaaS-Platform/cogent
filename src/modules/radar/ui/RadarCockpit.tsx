'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Radio,
  Clock,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Download,
  Printer,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Filter,
  Plus,
  RefreshCw,
  Scale,
  Shield,
  GitBranch,
  GitCommit,
  AlertOctagon,
  Calendar,
  Briefcase,
  Coins,
  Sparkles,
  ExternalLink,
  Search,
  BookOpen,
  ArrowRight,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
} from 'lucide-react';
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
  RadarActionItemPresentation,
  CircularIngestResult,
} from '../types';
import { CircularCard } from './CircularCard';
import { RoleBriefViewer } from './RoleBriefViewer';
import { ActionItemTracker } from './ActionItemTracker';
import { CircularUploadDrawer } from './CircularUploadDrawer';
import { defaultCountdownCalculator } from '../services/deadlineCountdownCalculator';
import { DenseDataTable, TableColumn } from '@/shared/ui/inspector/DenseDataTable';
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
  const [circulars, setCirculars] = useState<RadarCircularPresentationCard[]>([]);
  const [selectedCircularId, setSelectedCircularId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'dossier' | 'cards'>('table');
  const [activeTab, setActiveTab] = useState<'overview' | 'obligations' | 'briefs' | 'lineage'>('overview');

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRegulator, setFilterRegulator] = useState<string>('ALL');
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');
  const [filterLicense, setFilterLicense] = useState<string>('ALL');
  const [filterLineage, setFilterLineage] = useState<string>('ALL');
  const [relevantOnly, setRelevantOnly] = useState<boolean>(false);

  // Overlay & Sync States
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);
  const [isSyncingFeeds, setIsSyncingFeeds] = useState<boolean>(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);

  // Tenant Profile Context
  const [tenantProfile, setTenantProfile] = useState<{
    organizationId?: string;
    organizationName?: string;
    activeLicenses?: string[];
    activeRails?: string[];
  } | null>(null);

  // Live Database Fetcher (queries authenticated tenant applicability)
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
          } else {
            setSelectedCircularId(null);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch live circulars', err);
    } finally {
      setIsLoadingLive(false);
    }
  }, []);

  // Live Feed Synchronizer (triggers scrapers for CBN, SEC, NDPC, ARCON, FCCPC, Law Firms, and Media)
  const handleSyncLiveFeeds = async () => {
    try {
      setIsSyncingFeeds(true);
      setSyncStatusMessage('Scanning 18+ African regulatory portals, Tier-1 law firm advisories, and fintech wires...');
      const res = await fetch('/api/radar/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncStatusMessage(data.message || 'Live synchronization across all 18+ sources completed successfully.');
        await fetchLiveCirculars();
      } else {
        setSyncStatusMessage('Sync failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err: unknown) {
      setSyncStatusMessage('Sync network failure: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSyncingFeeds(false);
      setTimeout(() => setSyncStatusMessage(null), 8000);
    }
  };

  useEffect(() => {
    fetchLiveCirculars();
  }, [fetchLiveCirculars]);

  // Deep linking initial context consumption
  useEffect(() => {
    if (initialContext) {
      if (initialContext.regulatorCode) {
        setFilterRegulator(initialContext.regulatorCode);
      }
      if (initialContext.circularNumber) {
        const found = circulars.find((c) => c.circularNumber.includes(initialContext.circularNumber!));
        if (found) {
          setSelectedCircularId(found.id);
          setViewMode('dossier');
        }
      } else if (initialContext.searchTerm) {
        setSearchQuery(initialContext.searchTerm);
        const term = initialContext.searchTerm.toLowerCase();
        const found = circulars.find(
          (c) =>
            c.subject.toLowerCase().includes(term) ||
            c.circularNumber.toLowerCase().includes(term) ||
            c.regulator.toLowerCase().includes(term)
        );
        if (found) {
          setSelectedCircularId(found.id);
          setViewMode('dossier');
        }
      }
    }
  }, [initialContext, circulars]);

  // Filtered dataset
  const displayedCirculars = useMemo(() => {
    return circulars.filter((c) => {
      if (relevantOnly && !c.applicability.isApplicable) return false;
      if (filterRegulator !== 'ALL' && c.regulator !== filterRegulator) return false;
      if (filterUrgency !== 'ALL') {
        if (filterUrgency === 'CRITICAL_EMERGENCY' && c.priority !== 'CRITICAL_EMERGENCY' && c.urgencyWindow !== 'CRITICAL_EMERGENCY') return false;
        if (filterUrgency === 'URGENT_ACTION' && c.priority !== 'HIGH' && c.urgencyWindow !== 'URGENT_ACTION') return false;
        if (filterUrgency === 'STANDARD_WINDOW' && c.priority !== 'MEDIUM' && c.priority !== 'LOW' && c.urgencyWindow !== 'STANDARD_WINDOW') return false;
      }
      if (filterLicense !== 'ALL' && !c.targetedLicenses.includes(filterLicense as LicenseType) && !c.appliesUniversally) {
        return false;
      }
      if (filterLineage !== 'ALL' && (c.lineageStatus || 'ACTIVE_LAW') !== filterLineage) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSubject = c.subject.toLowerCase().includes(q);
        const matchesNumber = c.circularNumber.toLowerCase().includes(q);
        const matchesSummary = c.summary.toLowerCase().includes(q);
        const matchesRegulator = c.regulator.toLowerCase().includes(q);
        if (!matchesSubject && !matchesNumber && !matchesSummary && !matchesRegulator) {
          return false;
        }
      }
      return true;
    });
  }, [circulars, filterRegulator, filterUrgency, filterLicense, filterLineage, relevantOnly, searchQuery]);

  const selectedCircular = useMemo(() => {
    if (!circulars || circulars.length === 0) return null;
    return circulars.find((c) => c.id === selectedCircularId) || circulars[0] || null;
  }, [circulars, selectedCircularId]);

  // Multi-Pane Inspector Engine Wiring (Level 4 & Level 5)
  const inspectableIds = useMemo(() => {
    const ids: string[] = displayedCirculars.map((c) => c.id);
    if (selectedCircular?.actionItems) {
      selectedCircular.actionItems.forEach((act) => ids.push(act.id));
    }
    return ids;
  }, [displayedCirculars, selectedCircular]);

  const inspector = useInspectorStore(inspectableIds);

  // Resolve current active item data for the inspector
  const activeInspectorItem: InspectorItemData | null = useMemo(() => {
    if (!inspector.inspectId) return null;

    // Check if inspecting a circular
    const circ = circulars.find((c) => c.id === inspector.inspectId);
    if (circ) {
      return circularToInspectorItem(circ);
    }

    // Check if inspecting an action item / obligation
    for (const c of circulars) {
      const act = c.actionItems?.find((a) => a.id === inspector.inspectId);
      if (act) {
        return obligationToInspectorItem(act, c);
      }
    }

    return null;
  }, [inspector.inspectId, circulars]);

  // Resolve active statutory reference
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

  // Pulse metrics
  const totalMonitored = circulars.length;
  const applicableCount = circulars.filter((c) => c.applicability.isApplicable).length;
  const urgentCount = circulars.filter(
    (c) => c.priority === 'CRITICAL_EMERGENCY' || c.priority === 'HIGH' || c.urgencyWindow === 'CRITICAL_EMERGENCY'
  ).length;

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
    setViewMode('dossier');
  };

  const handleExportBrief = async (format: 'markdown' | 'pdf' = 'markdown') => {
    if (!selectedCircular) {
      alert('Please select a regulatory directive to export its board brief.');
      return;
    }
    setIsExporting(true);
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
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const totalFineExposure = useMemo(() => {
    return circulars.reduce((acc, c) => {
      return acc + (c.penaltyEscalationProjection?.totalProjectedExposureNaira || 0);
    }, 0);
  }, [circulars]);

  const currentLineageStatus = selectedCircular?.lineageStatus || 'ACTIVE_LAW';
  const penalty = selectedCircular?.penaltyEscalationProjection || {
    baselineFineNaira: 0,
    dailyFineNaira: 0,
    accruedDailyFineNaira: 0,
    totalProjectedExposureNaira: 0,
    statutoryCitation: 'N/A',
    carriesPersonalCriminalLiability: false,
    carriesLicenseSuspensionRisk: false,
  };

  // Dense Table Columns for Level 1 Horizon Scanning (Zango Dense View)
  const columns: TableColumn<RadarCircularPresentationCard>[] = [
    {
      key: 'regulator',
      header: 'Regulator',
      width: '100px',
      sortable: true,
      render: (row) => {
        const colors: Record<string, string> = {
          CBN: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          SEC: 'bg-blue-50 text-blue-800 border-blue-200',
          ARCON: 'bg-purple-50 text-purple-800 border-purple-200',
          NDPC: 'bg-teal-50 text-teal-800 border-teal-200',
          FCCPC: 'bg-amber-50 text-amber-800 border-amber-200',
          NFIU: 'bg-rose-50 text-rose-800 border-rose-200',
          NDIC: 'bg-cyan-50 text-cyan-800 border-cyan-200',
        };
        const badgeClass = colors[row.regulator] || 'bg-slate-100 text-slate-800 border-slate-200';
        return (
          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${badgeClass}`}>
            {row.regulator}
          </span>
        );
      },
    },
    {
      key: 'circularNumber',
      header: 'Directive Ref',
      width: '180px',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-bold text-[#0B0F1A] hover:text-[#2A4BFF] transition-colors">
          {row.circularNumber}
        </span>
      ),
    },
    {
      key: 'subject',
      header: 'Directive Title & AI Synthesis',
      sortable: true,
      render: (row) => (
        <div className="space-y-0.5 max-w-xl">
          <div className="text-xs font-semibold text-[#0B0F1A] line-clamp-1">
            {row.subject}
          </div>
          <div className="text-[11px] text-[#4B5565] line-clamp-1">
            {row.summary}
          </div>
        </div>
      ),
    },
    {
      key: 'publicationDate',
      header: 'Lineage Dates',
      width: '130px',
      sortable: true,
      render: (row) => (
        <div className="space-y-0.5 text-[11px]">
          <div className="text-[#0B0F1A] font-medium">Issued: {row.publicationDate}</div>
          <div className="text-[#8D99AE] text-[10px]">Eff: {row.effectiveDate || row.publicationDate}</div>
        </div>
      ),
    },
    {
      key: 'daysRemaining',
      header: 'Statutory SLA',
      width: '140px',
      sortable: true,
      render: (row) => {
        const isCritical = row.countdownTier === 'CRITICAL_EMERGENCY';
        const isHigh = row.countdownTier === 'HIGH';
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              isCritical
                ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                : isHigh
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            {row.daysRemaining !== null
              ? row.daysRemaining < 0
                ? `Expired (${Math.abs(row.daysRemaining)}d)`
                : `${row.daysRemaining}d left`
              : 'Active'}
          </span>
        );
      },
    },
    {
      key: 'exposure',
      header: 'Sanction Exposure',
      width: '130px',
      render: (row) => {
        const exp = row.penaltyEscalationProjection?.totalProjectedExposureNaira;
        return (
          <span className="text-xs font-bold text-[#0B0F1A]">
            {exp ? `₦${(exp / 1_000_000).toFixed(1)}M` : 'Statutory'}
          </span>
        );
      },
    },
    {
      key: 'lineageStatus',
      header: 'Lineage',
      width: '120px',
      render: (row) => {
        const st = row.lineageStatus || 'ACTIVE_LAW';
        if (st === 'SUPERSEDED') {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Superseded
            </span>
          );
        }
        if (st === 'AMENDED') {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Amended
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active Law
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '160px',
      render: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              setSelectedCircularId(row.id);
              setViewMode('dossier');
            }}
            className="px-2.5 py-1 text-[11px] font-semibold text-[#2A4BFF] bg-[#2A4BFF]/5 hover:bg-[#2A4BFF]/10 rounded-md border border-[#2A4BFF]/20 transition-all"
          >
            Open Dossier
          </button>
          <button
            onClick={() => inspector.openInspector(row.id)}
            className="p-1 text-[#4B5565] hover:text-[#2A4BFF] hover:bg-[#F5F6FA] rounded border border-[#DDE3EE] transition-all"
            title="Inspect with Multi-Pane Side-Sheet"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <MultiPaneContainer
      inspector={inspector}
      activeItem={activeInspectorItem}
      activeReference={activeReference}
    >
      <div className="min-h-screen bg-[#F5F6FA] text-[#0B0F1A] font-sans pb-16">
        {/* ──────────────────────────────────────────────────────────────────────────
            TOP HEADER & COMMAND BAR
            ────────────────────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 border-b border-[#DDE3EE] bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              {/* Breadcrumb Navigation */}
              <div className="flex items-center gap-2 text-xs">
                <span className="font-extrabold tracking-wider text-[#2A4BFF] uppercase">Cogent</span>
                <ChevronRight className="h-3.5 w-3.5 text-[#8D99AE]" />
                <button
                  onClick={() => setViewMode('table')}
                  className="text-[#4B5565] hover:text-[#0B0F1A] font-medium transition-colors"
                >
                  Regulatory Radar
                </button>
                <ChevronRight className="h-3.5 w-3.5 text-[#8D99AE]" />
                {viewMode === 'dossier' && selectedCircular ? (
                  <>
                    <span className="text-[#4B5565]">{selectedCircular.regulator}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-[#8D99AE]" />
                    <span className="font-semibold text-[#0B0F1A] truncate max-w-[180px] sm:max-w-xs">
                      {selectedCircular.circularNumber}
                    </span>
                  </>
                ) : (
                  <span className="font-semibold text-[#0B0F1A]">Horizon Scanning Feed</span>
                )}
              </div>

              {/* Active Tenant Profile Badge */}
              {tenantProfile && tenantProfile.activeLicenses && tenantProfile.activeLicenses.length > 0 && (
                <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EEF2FF] border border-[#2A4BFF]/20 text-[11px] font-semibold text-[#2A4BFF]">
                  <Shield className="w-3.5 h-3.5 text-[#2A4BFF]" />
                  <span className="font-bold">{tenantProfile.organizationName}:</span>
                  <span className="truncate max-w-[200px]">
                    {tenantProfile.activeLicenses.map((l) => l.replace(/_/g, ' ')).join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-2.5">

              {/* View Switcher Pills */}
              <div className="inline-flex rounded-lg border border-[#DDE3EE] bg-[#F5F6FA] p-0.5">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    viewMode === 'table'
                      ? 'bg-white text-[#2A4BFF] shadow-xs'
                      : 'text-[#4B5565] hover:text-[#0B0F1A]'
                  }`}
                  title="Dense Table View"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </button>
                <button
                  onClick={() => setViewMode('dossier')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    viewMode === 'dossier'
                      ? 'bg-white text-[#2A4BFF] shadow-xs'
                      : 'text-[#4B5565] hover:text-[#0B0F1A]'
                  }`}
                  title="Dossier Workspace"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Dossier</span>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    viewMode === 'cards'
                      ? 'bg-white text-[#2A4BFF] shadow-xs'
                      : 'text-[#4B5565] hover:text-[#0B0F1A]'
                  }`}
                  title="Card Grid"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
              </div>

              {/* Export Button & Dropdown */}
              <div className="relative">
                <div className="inline-flex rounded-lg shadow-xs">
                  <button
                    disabled={isExporting || !selectedCircular}
                    onClick={() => handleExportBrief('markdown')}
                    className="inline-flex items-center gap-1.5 rounded-l-lg border border-[#DDE3EE] bg-white px-3 py-1.5 text-xs font-semibold text-[#0B0F1A] hover:bg-[#F9FAFC] transition-all disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5 text-[#2A4BFF]" />
                    <span>{isExporting ? 'Exporting...' : 'Export'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="inline-flex items-center rounded-r-lg border border-l-0 border-[#DDE3EE] bg-white px-2 py-1.5 text-xs font-semibold text-[#4B5565] hover:bg-[#F9FAFC] transition-all"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[#DDE3EE] bg-white p-1.5 shadow-xl z-50">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-[#8D99AE] uppercase tracking-wider">
                      Statutory Board Briefs
                    </div>
                    <button
                      onClick={() => handleExportBrief('pdf')}
                      className="w-full text-left flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-xs hover:bg-[#F5F6FA] transition-colors"
                    >
                      <Printer className="h-4 w-4 text-[#EF4444] mt-0.5" />
                      <div>
                        <div className="font-semibold text-[#0B0F1A]">Print / Save as PDF</div>
                        <div className="text-[11px] text-[#4B5565]">
                          Board pack with CCO Attestation & SHA-256 seal
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleExportBrief('markdown')}
                      className="w-full text-left flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-xs hover:bg-[#F5F6FA] transition-colors"
                    >
                      <FileText className="h-4 w-4 text-[#2A4BFF] mt-0.5" />
                      <div>
                        <div className="font-semibold text-[#0B0F1A]">Download Markdown (.md)</div>
                        <div className="text-[11px] text-[#4B5565]">
                          Statutory schedules and compliance obligations
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Scan Live Regulatory Feeds (Multi-Stream Scraper Trigger) */}
              <button
                onClick={handleSyncLiveFeeds}
                disabled={isSyncingFeeds || isLoadingLive}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A4BFF]/30 bg-[#2A4BFF]/5 hover:bg-[#2A4BFF]/10 text-[#2A4BFF] px-3.5 py-1.5 text-xs font-bold transition-all disabled:opacity-50 shadow-xs"
                title="Scan live Nigerian and Pan-African regulatory portals, law firm advisories, and fintech media"
              >
                <Radio className={`h-3.5 w-3.5 ${isSyncingFeeds ? 'animate-pulse text-[#2A4BFF]' : ''}`} />
                <span className="hidden sm:inline">{isSyncingFeeds ? 'Scanning 18+ Feeds...' : 'Scan Sources Now'}</span>
              </button>

              {/* Refresh Database Directives */}
              <button
                onClick={() => fetchLiveCirculars()}
                disabled={isLoadingLive || isSyncingFeeds}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3EE] bg-white px-3 py-1.5 text-xs font-semibold text-[#4B5565] hover:text-[#0B0F1A] hover:bg-[#F9FAFC] transition-all disabled:opacity-50"
                title="Refresh directives from live database"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingLive ? 'animate-spin text-[#2A4BFF]' : ''}`} />
                <span className="hidden sm:inline">{isLoadingLive ? 'Refreshing...' : 'Refresh'}</span>
              </button>

              {/* Ingest Circular CTA */}
              <button
                onClick={() => setIsUploadDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2A4BFF] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#203ECC] transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Ingest Circular</span>
              </button>
            </div>
          </div>
        </header>

        {/* ──────────────────────────────────────────────────────────────────────────
            MAIN CONTENT AREA
            ────────────────────────────────────────────────────────────────────────── */}
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 space-y-6">
          {/* Live Sync Status Alert Banner */}
          {syncStatusMessage && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-blue-200 bg-blue-50/80 text-blue-900 text-xs font-medium shadow-xs">
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncingFeeds ? 'animate-spin text-[#2A4BFF]' : 'text-emerald-600'}`} />
                <span>{syncStatusMessage}</span>
              </div>
              <button
                onClick={() => setSyncStatusMessage(null)}
                className="text-blue-600 hover:text-blue-900 text-[11px] font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* 1. Metric Pulse Strip (4 elevated cards) */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[#DDE3EE] bg-white p-4 shadow-xs">
              <div className="flex items-center gap-2 text-[#4B5565] text-xs mb-1">
                <Radio className="h-3.5 w-3.5 text-[#2A4BFF]" />
                <span className="font-medium">Monitored Directives</span>
              </div>
              <div className="text-2xl font-black text-[#0B0F1A]">{totalMonitored}</div>
              <div className="text-[10px] text-[#4B5565]">Across 7 Nigerian Regulators</div>
            </div>

            <div className="rounded-xl border border-[#DDE3EE] bg-white p-4 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-700 text-xs mb-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-medium">Applicable Directives</span>
              </div>
              <div className="text-2xl font-black text-emerald-700">{applicableCount}</div>
              <div className="text-[10px] text-[#4B5565]">Zero-Noise Relational Matches</div>
            </div>

            <div className="rounded-xl border border-[#DDE3EE] bg-white p-4 shadow-xs">
              <div className="flex items-center gap-2 text-amber-800 text-xs mb-1">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <span className="font-medium">Active Compliance Gates</span>
              </div>
              <div className="text-2xl font-black text-amber-800">{urgentCount}</div>
              <div className="text-[10px] text-[#4B5565]">Statutory countdown deadlines</div>
            </div>

            <div className="rounded-xl border border-[#DDE3EE] bg-white p-4 shadow-xs">
              <div className="flex items-center gap-2 text-red-700 text-xs mb-1">
                <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                <span className="font-medium">Sanction Fine Avoided</span>
              </div>
              <div className="text-2xl font-black text-red-700">
                {totalFineExposure > 0
                  ? `₦${(totalFineExposure / 1_000_000).toLocaleString('en-NG', { maximumFractionDigits: 1 })}M`
                  : '₦0'}
              </div>
              <div className="text-[10px] text-[#4B5565]">BOFIA, ISA & NDPA exposure</div>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────────────────────
              VIEW MODE: LEVEL 1 HORIZON SCANNING (Dense Table / Cards)
              ────────────────────────────────────────────────────────────────────────── */}
          {viewMode === 'table' && (
            <div className="space-y-4">
              {/* Horizon Filter Cockpit */}
              <div className="rounded-xl border border-[#DDE3EE] bg-white p-4 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Search Bar */}
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8D99AE]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by directive code, subject, or regulatory mandate..."
                      className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-[#DDE3EE] bg-[#F9FAFC] text-xs text-[#0B0F1A] placeholder-[#8D99AE] focus:bg-white focus:border-[#2A4BFF] outline-hidden transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-2.5 text-xs text-[#8D99AE] hover:text-[#0B0F1A]"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filter Controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Urgency Window */}
                    <select
                      value={filterUrgency}
                      onChange={(e) => setFilterUrgency(e.target.value)}
                      className="rounded-lg border border-[#DDE3EE] bg-white px-2.5 py-1.5 text-xs text-[#0B0F1A] outline-hidden focus:border-[#2A4BFF]"
                    >
                      <option value="ALL">All Urgency Windows</option>
                      <option value="CRITICAL_EMERGENCY">Critical Emergency (&lt; 7d)</option>
                      <option value="URGENT_ACTION">Urgent Action (&lt; 14d)</option>
                      <option value="STANDARD_WINDOW">Standard Window (&gt; 14d)</option>
                    </select>

                    {/* Lineage Status */}
                    <select
                      value={filterLineage}
                      onChange={(e) => setFilterLineage(e.target.value)}
                      className="rounded-lg border border-[#DDE3EE] bg-white px-2.5 py-1.5 text-xs text-[#0B0F1A] outline-hidden focus:border-[#2A4BFF]"
                    >
                      <option value="ALL">All Lineage States</option>
                      <option value="ACTIVE_LAW">🟢 Active Law</option>
                      <option value="AMENDED">🟡 Amended</option>
                      <option value="SUPERSEDED">🔴 Superseded</option>
                    </select>

                    {/* Relevant Only Toggle */}
                    <button
                      onClick={() => setRelevantOnly(!relevantOnly)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        relevantOnly
                          ? 'bg-[#2A4BFF] text-white border-[#2A4BFF]'
                          : 'bg-white text-[#4B5565] border-[#DDE3EE] hover:bg-[#F9FAFC]'
                      }`}
                    >
                      {relevantOnly ? '✓ Applicable Only' : 'Show All'}
                    </button>

                    {/* Reset Button */}
                    <button
                      onClick={() => {
                        setFilterRegulator('ALL');
                        setFilterUrgency('ALL');
                        setFilterLicense('ALL');
                        setFilterLineage('ALL');
                        setSearchQuery('');
                        setRelevantOnly(false);
                      }}
                      className="text-xs text-[#2A4BFF] hover:underline px-1 font-medium"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Regulator Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#DDE3EE]">
                  <span className="text-[11px] font-bold text-[#8D99AE] uppercase tracking-wider mr-1">
                    Regulator:
                  </span>
                  {['ALL', 'CBN', 'SEC', 'NDIC', 'FCCPC', 'NFIU', 'ARCON', 'NDPC'].map((reg) => (
                    <button
                      key={reg}
                      onClick={() => setFilterRegulator(reg)}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                        filterRegulator === reg
                          ? 'bg-[#2A4BFF] text-white shadow-xs'
                          : 'bg-[#F5F6FA] text-[#4B5565] hover:bg-[#E8EDF5] hover:text-[#0B0F1A]'
                      }`}
                    >
                      {reg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dense Data Table (Zango AI Reference) */}
              <div className="rounded-xl border border-[#DDE3EE] bg-white shadow-xs overflow-hidden">
                <DenseDataTable
                  columns={columns}
                  data={displayedCirculars}
                  selectedId={selectedCircularId ?? undefined}
                  onRowClick={(row) => {
                    setSelectedCircularId(row.id);
                    setViewMode('dossier');
                  }}
                  searchPlaceholder="Filter circulars in table..."
                  emptyMessage="No regulatory directives match the selected horizon criteria."
                  totalRecordsCount={displayedCirculars.length}
                />
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────────────
              VIEW MODE: CARD GRID
              ────────────────────────────────────────────────────────────────────────── */}
          {viewMode === 'cards' && (
            <div className="space-y-4">
              {/* Regulator Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-xl border border-[#DDE3EE] bg-white">
                <span className="text-[11px] font-bold text-[#8D99AE] uppercase tracking-wider mr-1">
                  Regulator:
                </span>
                {['ALL', 'CBN', 'SEC', 'NDIC', 'FCCPC', 'NFIU', 'ARCON', 'NDPC'].map((reg) => (
                  <button
                    key={reg}
                    onClick={() => setFilterRegulator(reg)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                      filterRegulator === reg
                        ? 'bg-[#2A4BFF] text-white shadow-xs'
                        : 'bg-[#F5F6FA] text-[#4B5565] hover:bg-[#E8EDF5] hover:text-[#0B0F1A]'
                    }`}
                  >
                    {reg}
                  </button>
                ))}
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedCirculars.map((card) => (
                  <CircularCard
                    key={card.id}
                    card={card}
                    isSelected={card.id === selectedCircularId}
                    onSelect={() => {
                      setSelectedCircularId(card.id);
                      setViewMode('dossier');
                    }}
                    onInspect={() => inspector.openInspector(card.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────────────
              VIEW MODE: LEVEL 2 CIRCULAR DOSSIER WORKSPACE
              ────────────────────────────────────────────────────────────────────────── */}
          {viewMode === 'dossier' && (
            !selectedCircular ? (
              <div className="rounded-2xl border border-[#DDE3EE] bg-white p-12 text-center shadow-sm space-y-4">
                <Radio className="w-10 h-10 text-[#8D99AE] mx-auto animate-pulse" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#0B0F1A]">No Regulatory Directive Selected</h3>
                  <p className="text-xs text-[#4B5565] max-w-md mx-auto">
                    Please select a circular from the Horizon Scanning table to inspect its statutory obligations, penalty models, and multi-role briefs.
                  </p>
                </div>
                <button
                  onClick={() => setViewMode('table')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2A4BFF] text-white text-xs font-bold hover:bg-[#203ECC] transition-all"
                >
                  <TableIcon className="w-4 h-4" />
                  <span>View Scanning Table</span>
                </button>
              </div>
            ) : (
            <div className="space-y-5">
              {/* Back Navigation Bar */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setViewMode('table')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#4B5565] hover:text-[#2A4BFF] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Horizon Scanning Table</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => inspector.openInspector(selectedCircular.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DDE3EE] bg-white text-xs font-semibold text-[#0B0F1A] hover:bg-[#F9FAFC] transition-all shadow-xs"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#2A4BFF]" />
                    <span>Inspect Directive</span>
                  </button>
                  <button
                    onClick={() => {
                      inspector.openInspector(selectedCircular.id);
                      inspector.openReference(`ref-${selectedCircular.id}`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DDE3EE] bg-white text-xs font-semibold text-[#0B0F1A] hover:bg-[#F9FAFC] transition-all shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>View Gazette Text</span>
                  </button>
                </div>
              </div>

              {/* Dossier Header Card */}
              <div className="rounded-2xl border border-[#DDE3EE] bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-md border border-[#2A4BFF]/30 bg-[#2A4BFF]/5 px-2.5 py-0.5 text-xs font-mono font-bold text-[#2A4BFF]">
                        {selectedCircular.circularNumber}
                      </span>
                      <span className="text-xs text-[#4B5565]">
                        Issued: {selectedCircular.publicationDate}
                      </span>
                      <span className="text-xs text-[#4B5565]">
                        • Effective: {selectedCircular.effectiveDate}
                      </span>

                      {/* Lineage Badge */}
                      {currentLineageStatus === 'SUPERSEDED' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] font-extrabold text-red-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          SUPERSEDED / OBSOLETE
                        </span>
                      ) : currentLineageStatus === 'AMENDED' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          AMENDED DIRECTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          ACTIVE GOVERNING LAW
                        </span>
                      )}
                    </div>

                    <h1 className="text-xl font-black text-[#0B0F1A] leading-snug">
                      {selectedCircular.subject}
                    </h1>
                  </div>

                  {/* Urgency Badge */}
                  <div className="text-right">
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold ${
                        selectedCircular.countdownTier === 'CRITICAL_EMERGENCY'
                          ? 'border-red-200 bg-red-50 text-red-700 animate-pulse'
                          : selectedCircular.countdownTier === 'HIGH'
                          ? 'border-amber-200 bg-amber-50 text-amber-800'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      <Clock className="h-4 w-4" />
                      <span>
                        {selectedCircular.daysRemaining !== null
                          ? selectedCircular.daysRemaining < 0
                            ? `OVERDUE (${Math.abs(selectedCircular.daysRemaining)} DAYS)`
                            : `${selectedCircular.daysRemaining} DAYS TO COMPLIANCE`
                          : 'ACTIVE DIRECTIVE'}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#4B5565] mt-1 font-medium">
                      Statutory Deadline: {selectedCircular.statutoryDeadline || 'None specified'}
                    </div>
                  </div>
                </div>

                {/* Supersession Warning Banner */}
                {currentLineageStatus === 'SUPERSEDED' && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
                    <div className="flex items-start gap-3">
                      <AlertOctagon className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-bold text-red-900 uppercase tracking-wide">
                          Institutional Alert: Superseded Directive
                        </div>
                        <p className="leading-relaxed">
                          This circular has been formally superseded by Circular{' '}
                          <span className="font-mono font-bold text-[#0B0F1A]">
                            {selectedCircular.supersededBy || 'PSM/DIR/CON/CWS/08/014'}
                          </span>
                          . Operating in reliance on this obsolete document creates severe statutory audit liability under CBN & BOFIA standards.
                        </p>
                        {selectedCircular.supersededBy && (
                          <button
                            onClick={() => {
                              const repl = circulars.find(
                                (c) => c.circularNumber === selectedCircular.supersededBy
                              );
                              if (repl) setSelectedCircularId(repl.id);
                            }}
                            className="mt-1 inline-flex items-center gap-1 font-bold text-[#2A4BFF] hover:underline"
                          >
                            <span>Switch to Active Replacement Directive</span>
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4 Statutory SLA Countdown Chips (Zango & uio.mp4 summary strip) */}
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-[#DDE3EE] bg-[#F9FAFC] p-3">
                    <div className="text-[10px] text-[#4B5565] mb-0.5 flex items-center gap-1 font-medium">
                      <Calendar className="h-3 w-3 text-[#2A4BFF]" />
                      <span>Calendar Window</span>
                    </div>
                    <div className="text-sm font-bold text-[#0B0F1A]">
                      {selectedCircular.daysRemaining !== null
                        ? `${selectedCircular.daysRemaining} Days`
                        : 'Ongoing'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#DDE3EE] bg-[#F9FAFC] p-3">
                    <div className="text-[10px] text-[#4B5565] mb-0.5 flex items-center gap-1 font-medium">
                      <Briefcase className="h-3 w-3 text-emerald-600" />
                      <span>Business Days</span>
                    </div>
                    <div className="text-sm font-bold text-emerald-700">
                      {selectedCircular.businessDaysRemaining !== undefined && selectedCircular.businessDaysRemaining !== null
                        ? `${selectedCircular.businessDaysRemaining} Work Days`
                        : 'N/A'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#DDE3EE] bg-[#F9FAFC] p-3">
                    <div className="text-[10px] text-[#4B5565] mb-0.5 flex items-center gap-1 font-medium">
                      <Coins className="h-3 w-3 text-amber-600" />
                      <span>Fine Escalation</span>
                    </div>
                    <div className="text-sm font-bold text-amber-800 truncate">
                      ₦{(penalty.totalProjectedExposureNaira / 1_000_000).toFixed(1)}M Base
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#DDE3EE] bg-[#F9FAFC] p-3">
                    <div className="text-[10px] text-[#4B5565] mb-0.5 flex items-center gap-1 font-medium">
                      <ShieldAlert className="h-3 w-3 text-red-600" />
                      <span>SLA Escalation</span>
                    </div>
                    <div className="text-xs font-bold text-red-700 truncate">
                      {selectedCircular.countdownTier === 'CRITICAL_EMERGENCY'
                        ? 'CEO & Board Alert'
                        : selectedCircular.countdownTier === 'HIGH'
                        ? 'CCO & COO Action'
                        : 'Task Lead Gate'}
                    </div>
                  </div>
                </div>

                {/* Progress Countdown Bar */}
                {selectedCircular.statutoryDeadline && (
                  <div className="mb-4 rounded-xl border border-[#DDE3EE] bg-[#F9FAFC] p-3">
                    <div className="flex justify-between text-[11px] text-[#4B5565] mb-1.5">
                      <span className="font-medium text-[#0B0F1A]">
                        Statutory Enforcement Countdown Window
                      </span>
                      <span className="font-mono text-[#2A4BFF] font-bold">
                        {selectedCircular.daysRemaining} Days Remaining
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#E8EDF5] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          selectedCircular.countdownTier === 'CRITICAL_EMERGENCY'
                            ? 'bg-gradient-to-r from-red-600 to-rose-400 animate-pulse'
                            : selectedCircular.countdownTier === 'HIGH'
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        }`}
                        style={{
                          width: `${Math.max(
                            10,
                            Math.min(100, (selectedCircular.daysRemaining || 14) * 5)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Institutional Applicability Card */}
                <div
                  className={`rounded-xl border p-4 ${
                    selectedCircular.applicability.isApplicable
                      ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900'
                      : 'border-[#DDE3EE] bg-[#F9FAFC] text-[#4B5565]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {selectedCircular.applicability.isApplicable ? (
                      <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldCheck className="h-5 w-5 text-[#8D99AE] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {selectedCircular.applicability.isApplicable
                            ? 'Institutional Applicability: Direct Mandate'
                            : 'Institutional Applicability: Noise Filtered'}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed">
                        {selectedCircular.applicability.reason}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Level 3 Local Workspace Tabs */}
              <div className="space-y-4">
                <div className="flex border-b border-[#DDE3EE] gap-6 text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 transition-colors relative ${
                      activeTab === 'overview'
                        ? 'text-[#2A4BFF] border-b-2 border-[#2A4BFF] font-bold'
                        : 'text-[#4B5565] hover:text-[#0B0F1A]'
                    }`}
                  >
                    Overview & AI Synthesis
                  </button>
                  <button
                    onClick={() => setActiveTab('obligations')}
                    className={`pb-3 transition-colors relative flex items-center gap-1.5 ${
                      activeTab === 'obligations'
                        ? 'text-[#2A4BFF] border-b-2 border-[#2A4BFF] font-bold'
                        : 'text-[#4B5565] hover:text-[#0B0F1A]'
                    }`}
                  >
                    <span>Statutory Obligations</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#EEF2FF] text-[#2A4BFF] font-bold">
                      {selectedCircular.actionItems?.length || 0}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('briefs')}
                    className={`pb-3 transition-colors relative ${
                      activeTab === 'briefs'
                        ? 'text-[#2A4BFF] border-b-2 border-[#2A4BFF] font-bold'
                        : 'text-[#4B5565] hover:text-[#0B0F1A]'
                    }`}
                  >
                    Multi-Role Impact Briefs
                  </button>
                  <button
                    onClick={() => setActiveTab('lineage')}
                    className={`pb-3 transition-colors relative ${
                      activeTab === 'lineage'
                        ? 'text-[#2A4BFF] border-b-2 border-[#2A4BFF] font-bold'
                        : 'text-[#4B5565] hover:text-[#0B0F1A]'
                    }`}
                  >
                    Circular Lineage & Supersession Tree
                  </button>
                </div>

                {/* Tab 1: Overview & AI Synthesis */}
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-[#DDE3EE] bg-white p-5 shadow-xs space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B0F1A]">
                        Executive Synthesis & Regulatory Scope
                      </h3>
                      <p className="text-xs leading-relaxed text-[#4B5565]">
                        {selectedCircular.summary}
                      </p>

                      {/* Connected Compliance Cascade Actions */}
                      {onSwitchPillar && (
                        <div className="pt-4 border-t border-[#DDE3EE] flex flex-wrap items-center justify-between gap-3">
                          <span className="text-[11px] font-semibold text-[#4B5565]">
                            Connected Compliance Cascade:
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() =>
                                onSwitchPillar('gap-matrix', {
                                  targetPillar: 'gap-matrix',
                                  circularNumber: selectedCircular.circularNumber,
                                  searchTerm: selectedCircular.subject,
                                  action: 'inspect',
                                })
                              }
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF2FF] hover:bg-[#2A4BFF] text-[#2A4BFF] hover:text-white border border-[#2A4BFF]/30 text-xs font-semibold transition-all shadow-xs"
                            >
                              <Scale className="w-3.5 h-3.5" />
                              <span>Evaluate Policy Gap Concordance</span>
                              <ExternalLink className="w-3 h-3 ml-0.5" />
                            </button>
                            <button
                              onClick={() =>
                                onSwitchPillar('marketing', {
                                  targetPillar: 'marketing',
                                  regulatorCode: selectedCircular.regulator,
                                  action: 'pre-vet',
                                })
                              }
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white border border-amber-300 text-xs font-semibold transition-all shadow-xs"
                            >
                              <Shield className="w-3.5 h-3.5" />
                              <span>Pre-Vet Marketing Copy for this Directive</span>
                              <ExternalLink className="w-3 h-3 ml-0.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 2: Statutory Obligations */}
                {activeTab === 'obligations' && (
                  <ActionItemTracker
                    initialItems={selectedCircular.actionItems}
                    circularNumber={selectedCircular.circularNumber}
                    statutoryDeadline={selectedCircular.statutoryDeadline}
                    onInspectItem={(item) => inspector.openInspector(item.id)}
                  />
                )}

                {/* Tab 3: Multi-Role Impact Briefs */}
                {activeTab === 'briefs' && (
                  <RoleBriefViewer
                    circularNumber={selectedCircular.circularNumber}
                    executiveBriefCco={selectedCircular.executiveBriefCco}
                    actionBriefCoo={selectedCircular.actionBriefCoo}
                    technicalBriefProductEng={selectedCircular.technicalBriefProductEng}
                    financialBriefCfo={selectedCircular.financialBriefCfo}
                    technicalBriefCto={selectedCircular.technicalBriefCto}
                    governanceBriefCeoCro={selectedCircular.governanceBriefCeoCro}
                  />
                )}

                {/* Tab 4: Circular Lineage & Supersession Tree */}
                {activeTab === 'lineage' && (
                  <div className="rounded-xl border border-[#DDE3EE] bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#DDE3EE]">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#0B0F1A]">
                        <GitBranch className="h-4 w-4 text-[#2A4BFF]" />
                        <span>Statutory Circular Lineage & Supersession DAG</span>
                      </div>
                      <span className="text-[10px] text-[#4B5565] font-mono">
                        Node ID: {selectedCircular.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 overflow-x-auto py-3 text-xs">
                      {/* Predecessor Node */}
                      <div className="flex items-center gap-2 rounded-xl border border-[#DDE3EE] bg-[#F9FAFC] px-3.5 py-2.5 shrink-0">
                        <GitCommit className="h-3.5 w-3.5 text-amber-500" />
                        <div>
                          <div className="text-[10px] text-[#4B5565]">Predecessor Law</div>
                          <div className="font-mono text-xs font-semibold text-[#0B0F1A]">
                            {selectedCircular.amends?.[0] || 'Original Directive'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center text-[#8D99AE] shrink-0">
                        <ArrowRight className="h-4 w-4 text-[#2A4BFF]" />
                      </div>

                      {/* Current Node */}
                      <div className="flex items-center gap-2 rounded-xl border border-[#2A4BFF] bg-[#2A4BFF]/5 px-3.5 py-2.5 shrink-0 ring-1 ring-[#2A4BFF]">
                        <GitCommit className="h-3.5 w-3.5 text-[#2A4BFF]" />
                        <div>
                          <div className="text-[10px] text-[#2A4BFF] font-bold">This Directive</div>
                          <div className="font-mono text-xs font-bold text-[#0B0F1A]">
                            {selectedCircular.circularNumber}
                          </div>
                        </div>
                      </div>

                      {/* Successor Node if superseded */}
                      {selectedCircular.supersededBy && (
                        <>
                          <div className="flex items-center text-[#8D99AE] shrink-0">
                            <ArrowRight className="h-4 w-4 text-red-500" />
                          </div>
                          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 shrink-0">
                            <GitCommit className="h-3.5 w-3.5 text-red-500" />
                            <div>
                              <div className="text-[10px] text-red-700 font-bold">Revoked By</div>
                              <div className="font-mono text-xs font-bold text-red-900">
                                {selectedCircular.supersededBy}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
          )}
        </main>

        {/* Circular Ingestion Drawer (Level 6) */}
        <CircularUploadDrawer
          isOpen={isUploadDrawerOpen}
          onClose={() => setIsUploadDrawerOpen(false)}
          onIngestSuccess={handleIngestSuccess}
        />
      </div>
    </MultiPaneContainer>
  );
}
