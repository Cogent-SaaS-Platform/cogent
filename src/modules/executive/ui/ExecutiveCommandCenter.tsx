'use client';

import React, { useState, useEffect } from 'react';
import {
  Scale,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ArrowRight,
  FileText,
  Radio,
  Layers,
  ChevronRight,
  Download,
  Play,
  CheckCircle,
  Eye,
  X,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  PlatformPillar,
  CrossPillarLinkContext,
  RegulatorCode,
  OrgDepartment,
} from '@/shared/types';
import {
  ExecutiveOverviewData,
  UrgentComplianceGate,
  ExecutiveComplianceExportResult,
} from '../types';

export interface ExecutiveCommandCenterProps {
  onSwitchPillar?: (pillar: PlatformPillar, context?: CrossPillarLinkContext) => void;
  organizationId?: string;
  organizationName?: string;
}

export function ExecutiveCommandCenter({
  onSwitchPillar,
  organizationId = '00000000-0000-0000-0000-000000000001',
  organizationName = 'Apex Commercial Bank Plc',
}: ExecutiveCommandCenterProps) {
  const router = useRouter();
  const [data, setData] = useState<ExecutiveOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'REGULATORS' | 'DEPARTMENTS' | 'AUDIT_TRAIL'>('REGULATORS');

  // Cascade Simulator Modal State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorCircularId, setSimulatorCircularId] = useState('b20fb350-262a-409c-a7bc-9807604da6ec');
  const [isSimulating, setIsSimulating] = useState(false);
  const [cascadeResult, setCascadeResult] = useState<{
    success: boolean;
    impactedPoliciesCount?: number;
    invalidatedCampaignsCount?: number;
    totalStatutoryFineExposureNaira?: number;
    affectedDomains?: string[];
  } | null>(null);

  // Board Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportData, setExportData] = useState<ExecutiveComplianceExportResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'HTML' | 'MARKDOWN'>('HTML');

  const handleNavigate = (path: string, pillar: PlatformPillar, context?: CrossPillarLinkContext) => {
    if (onSwitchPillar) {
      onSwitchPillar(pillar, context);
    } else {
      router.push(path);
    }
  };

  const fetchOverview = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/executive/overview?organizationId=${organizationId}&organizationName=${encodeURIComponent(
          organizationName
        )}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      console.warn('Failed loading executive overview from API', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [organizationId, organizationName]);

  const handleTriggerCascade = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/radar/cascade/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circularId: simulatorCircularId,
          organizationId,
        }),
      });

      const mRes = await fetch('/api/marketing/cascade/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circularId: simulatorCircularId,
          organizationId,
          simulate: false,
        }),
      });

      if (res.ok && mRes.ok) {
        const gapJson = await res.json();
        const mJson = await mRes.json();
        setCascadeResult({
          success: true,
          impactedPoliciesCount: gapJson.data?.impactedPoliciesCount,
          invalidatedCampaignsCount: mJson.data?.invalidatedCampaignsCount,
          totalStatutoryFineExposureNaira: mJson.data?.totalStatutoryFineExposureNaira,
          affectedDomains: gapJson.data?.affectedDomains,
        });
        await fetchOverview();
      }
    } catch (err) {
      console.error('Failed triggering compliance cascade', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleOpenExportModal = async () => {
    setIsExportModalOpen(true);
    setIsExporting(true);
    try {
      const res = await fetch('/api/executive/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          organizationName,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setExportData(json.data);
      }
    } catch (err) {
      console.error('Failed generating executive export', err);
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusDotColor = (grade?: string) => {
    if (grade === 'EXEMPLARY') return 'bg-emerald-500';
    if (grade === 'SATISFACTORY') return 'bg-teal-500';
    if (grade === 'SUPERVISORY_CONCERN') return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-16">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              C
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-slate-900">
                  Unified Executive Command Center
                </h1>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(data?.healthGrade)}`} />
                  {data?.healthGrade || 'ACTIVE'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                {organizationName} · Supervisory Telemetry Active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSimulatorOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Play className="w-3.5 h-3.5 text-slate-500" />
              Simulate Cascade
            </button>

            <button
              onClick={handleOpenExportModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              Board Audit Dossier
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Metric Cards & Pulse Strip: Unified Hairline Grid Container per AGENTS.md */}
        <section aria-label="Executive Metrics Summary">
          <div className="bg-white border border-slate-200 rounded-lg grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 shadow-xs">
            {/* Metric 1: Composite Health */}
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Composite Health
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-slate-900 font-mono text-2xl font-bold tracking-tight">
                  {isLoading ? '...' : `${data?.compositeHealthScore ?? 100}%`}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(data?.healthGrade)}`} />
                  {data?.healthGrade ?? 'SATISFACTORY'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Weighted 30% Mktg · 35% Radar · 35% Gap
              </p>
            </div>

            {/* Metric 2: Fines Avoided */}
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Statutory Fines Avoided
              </span>
              <div className="mt-2">
                <span className="text-slate-900 font-mono text-2xl font-bold tracking-tight">
                  {isLoading ? '...' : `₦${(data?.totalFinesAvoidedNaira ?? 0).toLocaleString()}`}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Aggregated across 3 statutory pillars
              </p>
            </div>

            {/* Metric 3: Active Circulars */}
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Active Directives Tracked
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-slate-900 font-mono text-2xl font-bold tracking-tight">
                  {isLoading ? '...' : `${data?.liveTelemetry?.radar?.activeCirculars ?? 35}`}
                </span>
                <span className="font-mono text-xs text-slate-600">
                  Directives
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {data?.liveTelemetry?.radar?.unreadHighPriority ?? 0} urgent action gates pending
              </p>
            </div>

            {/* Metric 4: Concordance Alignment */}
            <div className="p-4 sm:p-5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Policy Concordance
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-slate-900 font-mono text-2xl font-bold tracking-tight">
                  {isLoading ? '...' : `${data?.pillars?.gapMatrix?.healthPercentage ?? 100}%`}
                </span>
                <span className="font-mono text-xs text-slate-600">
                  Aligned
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {data?.pillars?.gapMatrix?.openItemsCount ?? 0} critical statutory gaps
              </p>
            </div>
          </div>
        </section>

        {/* Three Pillar Cards: Lineage Navigation */}
        <section aria-label="Three Institutional Pillars">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pillar 1: Marketing Shield */}
            <div
              onClick={() => handleNavigate('/marketing', 'marketing')}
              className="bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-400 cursor-pointer transition-colors shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-slate-700" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Pillar 1 · Marketing Shield
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {data?.pillars?.marketing?.healthPercentage ?? 100}%
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Pre-Cleared Scans</span>
                    <span className="font-mono font-bold text-slate-900">
                      {data?.pillars?.marketing?.primaryMetricValue || '0 Scans'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Active Live Assets</span>
                    <span className="font-mono font-bold text-slate-900">
                      {data?.liveTelemetry?.marketing?.totalScans ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Drift Flagged</span>
                    <span className="font-mono font-bold text-slate-900">
                      {data?.liveTelemetry?.marketing?.activeDriftAlerts ?? 0}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>View claims ledger</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Pillar 2: Regulatory Radar */}
            <div
              onClick={() => handleNavigate('/radar', 'radar')}
              className="bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-400 cursor-pointer transition-colors shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-slate-700" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Pillar 2 · Regulatory Radar
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {data?.pillars?.radar?.healthPercentage ?? 95}%
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Statutory Directives</span>
                    <span className="font-mono font-bold text-slate-900">
                      {data?.pillars?.radar?.primaryMetricValue || '35 Directives'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Monitored Portals</span>
                    <span className="font-mono font-bold text-slate-900">
                      6 Apex Regulators
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Urgent Action Items</span>
                    <span className="font-mono font-bold text-slate-900">
                      {data?.liveTelemetry?.radar?.unreadHighPriority ?? 0}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>View statutory radar</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Pillar 3: Policy Gap Matrix */}
            <div
              onClick={() => handleNavigate('/gap-matrix', 'gap-matrix')}
              className="bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-400 cursor-pointer transition-colors shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-slate-700" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Pillar 3 · 5-W Gap Matrix
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {data?.pillars?.gapMatrix?.healthPercentage ?? 100}%
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Internal Policies</span>
                    <span className="font-mono font-bold text-slate-900">
                      {data?.liveTelemetry?.gapMatrix?.activePolicies ?? 0} Uploaded
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Critical Gaps</span>
                    <span className="font-mono font-bold text-slate-900">
                      {data?.liveTelemetry?.gapMatrix?.criticalGapsCount ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Audit Defense Dossier</span>
                    <span className="font-mono font-bold text-slate-900">
                      SHA-256 Sealed
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>View gap evaluation</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        </section>

        {/* Urgent Compliance Countdown Gates */}
        <section aria-label="Urgent Compliance Gates" className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Urgent Compliance Countdown Gates
              </h2>
              <p className="text-[11px] text-slate-500">
                Statutory implementation windows ranked strictly by days remaining
              </p>
            </div>
            <span className="text-xs font-mono text-slate-600">
              {data?.urgentGates?.length || 0} Statutory Gates
            </span>
          </div>

          <div className="space-y-3">
            {(!data?.urgentGates || data.urgentGates.length === 0) ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No active statutory compliance gates detected for this reporting window.
              </div>
            ) : (
              data.urgentGates.map((gate: UrgentComplianceGate) => (
                <div
                  key={gate.id}
                  onClick={() => {
                    if (gate.sourcePillar === 'radar') handleNavigate('/radar', 'radar', gate.linkContext);
                    else if (gate.sourcePillar === 'gap-matrix') handleNavigate('/gap-matrix', 'gap-matrix', gate.linkContext);
                    else handleNavigate('/marketing', 'marketing', gate.linkContext);
                  }}
                  className="border border-slate-200 rounded-lg p-4 hover:border-slate-400 cursor-pointer transition-colors flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-600">
                        {gate.regulatorCode}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="font-mono text-xs text-slate-600">
                        Deadline: {gate.deadlineDate}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900">
                      {gate.title}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {gate.actionRequired}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-slate-900 font-mono text-lg font-bold tracking-tight block">
                        {gate.daysRemaining}d
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">
                        Remaining
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Tabbed Institutional Breakdown */}
        <section aria-label="Institutional Breakdown" className="bg-white border border-slate-200 rounded-lg shadow-xs">
          <div className="border-b border-slate-200 px-5 flex gap-6">
            <button
              onClick={() => setActiveTab('REGULATORS')}
              className={`py-3 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'REGULATORS'
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Supervisory Regulators ({data?.regulatorCoverage?.length || 6})
            </button>
            <button
              onClick={() => setActiveTab('DEPARTMENTS')}
              className={`py-3 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'DEPARTMENTS'
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Departmental Readiness ({data?.departmentalReadiness?.length || 6})
            </button>
            <button
              onClick={() => setActiveTab('AUDIT_TRAIL')}
              className={`py-3 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'AUDIT_TRAIL'
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Cryptographic Audit Stream
            </button>
          </div>

          <div className="p-5">
            {activeTab === 'REGULATORS' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(data?.regulatorCoverage || []).map((reg) => (
                  <div key={reg.regulatorCode} className="border border-slate-200 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {reg.regulatorCode}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {reg.complianceRate}% Compliant
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">
                      {reg.regulatorName}
                    </p>
                    <div className="text-[11px] font-mono text-slate-500 border-t border-slate-100 pt-1.5">
                      {reg.activeInstrumentsCount} Instruments · {reg.keyStatute}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'DEPARTMENTS' && (
              <div className="space-y-2">
                {(data?.departmentalReadiness || []).map((dept) => (
                  <div
                    key={dept.department}
                    className="border border-slate-200 rounded-lg p-3.5 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                        {dept.departmentLabel}
                      </span>
                      <span className="text-xs text-slate-500">
                        Lead: {dept.leadRole} · {dept.openObligationsCount} Open Obligations
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-900 font-mono text-sm font-bold">
                        ₦{(dept.finesAvoidedNaira || 0).toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                        <span className={`w-1.5 h-1.5 rounded-full ${dept.overallRisk === 'HIGH' ? 'bg-rose-500' : dept.overallRisk === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        {dept.overallRisk}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'AUDIT_TRAIL' && (
              <div className="space-y-2">
                {(!data?.recentActivities || data.recentActivities.length === 0) ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No recent supervisory audit activities recorded.
                  </div>
                ) : (
                  data.recentActivities.map((act) => (
                    <div
                      key={act.id}
                      className="border border-slate-200 rounded-lg p-3 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-slate-500">{act.timestamp}</span>
                          <span className="font-mono text-xs text-slate-600 font-semibold">{act.action}</span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{act.description}</p>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400 truncate max-w-[180px]">
                        {act.sha256VerificationHash || 'VERIFIED'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Simulator Modal */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Connected Compliance Cascade Trigger
              </h3>
              <button
                onClick={() => {
                  setIsSimulatorOpen(false);
                  setCascadeResult(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Trigger an upstream statutory circular event to test autonomous propagation across Pillar 2 (Radar), Pillar 3 (Gap Matrix), and Pillar 1 (Marketing Shield).
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Upstream Directive / Circular ID
              </label>
              <input
                type="text"
                value={simulatorCircularId}
                onChange={(e) => setSimulatorCircularId(e.target.value)}
                className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900"
              />
            </div>

            {cascadeResult && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1 font-mono">
                <div className="text-emerald-700 font-bold">✓ Cascade Completed Successfully</div>
                <div>• Impacted Internal Policies: {cascadeResult.impactedPoliciesCount}</div>
                <div>• Invalidated Marketing Campaigns: {cascadeResult.invalidatedCampaignsCount}</div>
                <div>• Total Fine Exposure: ₦{(cascadeResult.totalStatutoryFineExposureNaira || 0).toLocaleString()}</div>
                <div>• Affected Domains: {cascadeResult.affectedDomains?.join(', ')}</div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsSimulatorOpen(false);
                  setCascadeResult(null);
                }}
                className="px-3 py-1.5 text-xs text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={handleTriggerCascade}
                disabled={isSimulating}
                className="px-3 py-1.5 text-xs text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                {isSimulating ? 'Executing Cascade...' : 'Execute Cascade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Board Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Board Audit Committee Compliance Briefing
                </h3>
                <p className="text-[11px] font-mono text-slate-500">
                  Cryptographic Seal: {exportData?.sha256Seal?.substring(0, 16)}...
                </p>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-4 border-b border-slate-100 pb-2 text-xs">
              <button
                onClick={() => setExportFormat('HTML')}
                className={`font-medium ${exportFormat === 'HTML' ? 'text-slate-900 font-bold underline' : 'text-slate-500'}`}
              >
                Printable HTML
              </button>
              <button
                onClick={() => setExportFormat('MARKDOWN')}
                className={`font-medium ${exportFormat === 'MARKDOWN' ? 'text-slate-900 font-bold underline' : 'text-slate-500'}`}
              >
                Markdown Dossier
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50 font-mono text-[11px] text-slate-800">
              {isExporting ? (
                <div>Generating cryptographic dossier...</div>
              ) : exportFormat === 'HTML' ? (
                <pre className="whitespace-pre-wrap">{exportData?.printableHtml?.substring(0, 1500)}...</pre>
              ) : (
                <pre className="whitespace-pre-wrap">{exportData?.markdownBrief}</pre>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-slate-500 font-mono">
                Attestation: {exportData?.boardAttestationBlock?.signoffStatus || 'VERIFIED'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const content = exportFormat === 'HTML' ? exportData?.printableHtml : exportData?.markdownBrief;
                    const blob = new Blob([content || ''], { type: exportFormat === 'HTML' ? 'text/html' : 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `executive-compliance-brief-${exportData?.sha256Seal?.substring(0, 8)}.${exportFormat.toLowerCase()}`;
                    a.click();
                  }}
                  className="px-3 py-1.5 text-xs text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                >
                  Download Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
