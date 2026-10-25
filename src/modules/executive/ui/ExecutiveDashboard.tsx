'use client';

import React, { useState, useEffect } from 'react';
import {
  Scale,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  FileText,
  Radio,
  CheckCircle2,
  Calendar,
  Building,
  Sparkles,
  RefreshCw,
  Lock,
  Layers,
  ChevronRight,
  Zap,
  Download,
  Play,
  CheckCircle,
  Eye,
  X,
  Activity,
  Check,
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
  PillarComplianceSnapshot,
  DepartmentalReadinessItem,
  RegulatorCoverageItem,
  UrgentComplianceGate,
  CrossPillarActivityItem,
  ExecutiveComplianceExportResult,
} from '../types';
import { UpcomingDeadlinesTimeline } from './UpcomingDeadlinesTimeline';
import { RegulatoryPressureStrip } from './RegulatoryPressureStrip';

export interface ExecutiveDashboardProps {
  onSwitchPillar?: (pillar: PlatformPillar, context?: CrossPillarLinkContext) => void;
  organizationId?: string;
  organizationName?: string;
}

export function ExecutiveDashboard({
  onSwitchPillar,
  organizationId = '00000000-0000-0000-0000-000000000001',
  organizationName = 'Authorized Tenant',
}: ExecutiveDashboardProps) {
  const router = useRouter();
  const [data, setData] = useState<ExecutiveOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'REGULATORS' | 'DEPARTMENTS' | 'AUDIT_FEED'>('REGULATORS');

  // Cascade Simulator State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorCircularId, setSimulatorCircularId] = useState('b20fb350-262a-409c-a7bc-9807604da6ec');
  const [simulatorCircularName, setSimulatorCircularName] = useState('PSM/DIR/CON/CWS/08/014 - Contactless Payment Limits');
  const [isSimulating, setIsSimulating] = useState(false);
  const [cascadeResult, setCascadeResult] = useState<{
    gapCascade?: {
      impactedPoliciesCount?: number;
    };
    marketingCascade?: {
      simulationMode?: boolean;
      invalidatedCampaignsCount?: number;
      invalidatedClaimsCount?: number;
      totalStatutoryFineExposureNaira?: number;
    };
  } | null>(null);

  // Board Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportData, setExportData] = useState<ExecutiveComplianceExportResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportTab, setExportTab] = useState<'HTML' | 'MARKDOWN'>('HTML');

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
      console.warn('Failed loading executive overview from API; using baseline data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [organizationId, organizationName]);

  const handleRunCascade = async (simulateMode: boolean = false) => {
    setIsSimulating(true);
    setCascadeResult(null);
    try {
      const gapRes = await fetch('/api/radar/cascade/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circularId: simulatorCircularId,
          organizationId,
        }),
      });
      const gapJson = gapRes.ok ? await gapRes.json() : null;

      const mktRes = await fetch('/api/marketing/cascade/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circularId: simulatorCircularId,
          organizationId,
          simulate: simulateMode,
        }),
      });
      const mktJson = mktRes.ok ? await mktRes.json() : null;

      setCascadeResult({
        gapCascade: gapJson?.data,
        marketingCascade: mktJson?.data,
      });

      await fetchOverview();
    } catch (err) {
      console.error('Error running cascade simulation', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleExportBrief = async () => {
    setIsExporting(true);
    setIsExportModalOpen(true);
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

  const compositeScore = data?.compositeHealthScore ?? 100;
  const healthGrade = data?.healthGrade ?? (compositeScore >= 90 ? 'EXEMPLARY' : compositeScore >= 75 ? 'SATISFACTORY' : 'SUPERVISORY_CONCERN');
  const totalFineAvoided = data?.totalFinesAvoidedNaira ?? 0;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto text-[#0B0F1A]">
      {/* 1. Page Title Bar: Compliance Overview (Zango Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Compliance Overview
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Entity Group Selector */}
          <div className="relative">
            <select
              aria-label="Select Entity Group"
              className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-1.5 pr-8 text-xs font-semibold text-slate-800 hover:border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-slate-400 shadow-2xs cursor-pointer"
              defaultValue="All Entities"
            >
              <option value="All Entities">Entity Group</option>
              <option value="Commercial Banking Group">Commercial Banking Group</option>
              <option value="Fintech & Digital Rails">Fintech & Digital Rails</option>
              <option value="Asset Management & Trust">Asset Management & Trust</option>
            </select>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
          </div>

          {/* Dynamic Sync Timestamp */}
          <span className="text-xs text-slate-500 font-mono">
            Updated {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>

          <button
            onClick={fetchOverview}
            disabled={isLoading}
            className="p-1.5 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors shadow-2xs"
            title="Refresh Telemetry"
            aria-label="Refresh telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Upcoming Deadlines Interactive Timeline (Zango Style) */}
      <UpcomingDeadlinesTimeline
        gates={data?.urgentGates}
        onInspectGate={(gate) =>
          handleNavigate(
            gate.sourcePillar === 'radar'
              ? '/insight'
              : gate.sourcePillar === 'gap-matrix'
              ? '/gap'
              : '/marketing',
            gate.linkContext.targetPillar,
            gate.linkContext
          )
        }
      />

      {/* 3. Regulatory Pressure Strip (Zango Style: Trending Topics + Most Impacted Policies) */}
      <RegulatoryPressureStrip
        telemetry={data?.liveTelemetry}
        regulators={data?.regulatorCoverage}
        onSelectTopic={(topic) => router.push('/insight')}
        onSelectPolicy={(policyName) => router.push('/gap')}
      />

      {/* MODAL 1: Interactive Cascade Orchestration Simulator */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B0F1A]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE3EE] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#DDE3EE] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#2A4BFF] flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0B0F1A]">
                    Interactive Compliance Cascade Simulator
                  </h3>
                  <p className="text-xs text-[#4B5565]">
                    Simulate how an upstream circular triggers downstream Gap Matrix & Marketing Shield drift
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSimulatorOpen(false)}
                className="p-1 text-[#8D99AE] hover:text-[#0B0F1A] rounded-lg hover:bg-[#F5F6FA]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#0B0F1A] block mb-1.5">
                  Select Upstream Circular Directive:
                </label>
                <select
                  value={simulatorCircularId}
                  onChange={(e) => {
                    setSimulatorCircularId(e.target.value);
                    const opt = e.target.options[e.target.selectedIndex];
                    setSimulatorCircularName(opt.text);
                  }}
                  className="w-full bg-[#F5F6FA] border border-[#DDE3EE] rounded-xl px-3 py-2 text-xs text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF]"
                >
                  <option value="b20fb350-262a-409c-a7bc-9807604da6ec">
                    CBN PSM/DIR/CON/CWS/08/014 — Operational Directive on Contactless Payments
                  </option>
                  <option value="d56e2659-4f9e-4ef8-b264-af73a0d60de5">
                    SEC SEC/CIR/VASP/2026/009 — Directive on Virtual Assets & Investment Guarantees
                  </option>
                  <option value="cbn-cpf-2026-consumer">
                    CBN CBN/DIR/CON/2026/04 — Digital Lending APR Transparency & Fee Cap
                  </option>
                  <option value="arcon-asp-2026-promo">
                    ARCON ARCON/DIR/2026/01 — Advertising Vetting & Direct Identification
                  </option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleRunCascade(true)}
                  disabled={isSimulating}
                  className="flex-1 btn-base btn-secondary btn-sm gap-2"
                >
                  <Play className={`w-3.5 h-3.5 text-[#2A4BFF] ${isSimulating ? 'animate-spin' : ''}`} />
                  <span>Simulate Impact (Dry-Run)</span>
                </button>
                <button
                  onClick={() => handleRunCascade(false)}
                  disabled={isSimulating}
                  className="flex-1 btn-base btn-primary btn-sm gap-2"
                >
                  <Zap className={`w-3.5 h-3.5 text-white ${isSimulating ? 'animate-spin' : ''}`} />
                  <span>Execute Real Cascade Mutation</span>
                </button>
              </div>

              {/* Cascade Output Visualizer */}
              {cascadeResult && (
                <div className="mt-4 p-4 rounded-xl bg-[#F9FAFC] border border-[#DDE3EE] space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs border-b border-[#E8EDF5] pb-2">
                    <span className="font-bold text-[#10B981] flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-[#10B981]" />
                      Cascade Propagation Complete
                    </span>
                    <span className="text-[11px] text-[#4B5565]">
                      {cascadeResult.marketingCascade?.simulationMode ? 'Simulation Dry-Run' : 'Live Mutations Committed'}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <span className="font-semibold text-[#2A4BFF] block">
                      Policy Gap Matrix Concordance Impact:
                    </span>
                    <p className="text-[#4B5565] text-[11px]">
                      Triggered downstream re-audit for{' '}
                      <strong className="text-[#0B0F1A]">{cascadeResult.gapCascade?.impactedPoliciesCount ?? 0} internal policies</strong>.
                      Status: <span className="text-[#92400E] font-mono font-semibold">TRIGGERED_BY_CASCADE</span>.
                    </p>
                  </div>

                  <div className="text-xs space-y-1 pt-1 border-t border-[#E8EDF5]">
                    <span className="font-semibold text-[#F59E0B] block">
                      Marketing Shield Drift Impact:
                    </span>
                    <p className="text-[#4B5565] text-[11px]">
                      Invalidated{' '}
                      <strong className="text-[#0B0F1A]">{cascadeResult.marketingCascade?.invalidatedCampaignsCount ?? 0} active campaigns</strong> and{' '}
                      <strong className="text-[#0B0F1A]">{cascadeResult.marketingCascade?.invalidatedClaimsCount ?? 0} claims ledger items</strong>.
                    </p>
                    <p className="text-[#991B1B] text-[11px] font-bold">
                      Deterministic Statutory Exposure Flagged: ₦
                      {(cascadeResult.marketingCascade?.totalStatutoryFineExposureNaira ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Board Audit & Executive Brief Exporter */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B0F1A]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE3EE] rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#DDE3EE] pb-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-[#2A4BFF]" />
                <div>
                  <h3 className="text-base font-bold text-[#0B0F1A]">
                    Official Board Audit Committee Compliance Dossier
                  </h3>
                  <p className="text-xs text-[#4B5565]">
                    Cryptographically sealed supervisory briefing ready for Board transmission & Bank Examiners
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1 text-[#8D99AE] hover:text-[#0B0F1A] rounded-lg hover:bg-[#F5F6FA]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isExporting ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-[#2A4BFF] animate-spin" />
                <span className="text-sm font-semibold text-[#4B5565]">
                  Compiling multi-pillar telemetry and generating SHA-256 cryptographic seal...
                </span>
              </div>
            ) : exportData ? (
              <div className="flex-1 overflow-hidden flex flex-col space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="cogent-tab-group">
                    <button
                      onClick={() => setExportTab('HTML')}
                      className={`cogent-tab-item ${exportTab === 'HTML' ? 'cogent-tab-item-active' : ''}`}
                    >
                      Printable HTML View
                    </button>
                    <button
                      onClick={() => setExportTab('MARKDOWN')}
                      className={`cogent-tab-item ${exportTab === 'MARKDOWN' ? 'cogent-tab-item-active' : ''}`}
                    >
                      Raw Markdown Source
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const blob = new Blob([exportData.printableHtml], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Cogent_Board_Brief_${organizationName.replace(/\s+/g, '_')}.html`;
                        a.click();
                      }}
                      className="btn-base btn-primary btn-xs gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download HTML Dossier</span>
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([exportData.markdownBrief], { type: 'text/markdown' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Cogent_Board_Brief_${organizationName.replace(/\s+/g, '_')}.md`;
                        a.click();
                      }}
                      className="btn-base btn-secondary btn-xs gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Download Markdown</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto border border-[#DDE3EE] rounded-xl bg-[#F9FAFC] p-4 font-mono text-xs text-[#0B0F1A]">
                  {exportTab === 'HTML' ? (
                    <iframe
                      srcDoc={exportData.printableHtml}
                      title="Export Dossier Preview"
                      className="w-full h-96 rounded border-0 bg-white"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap">{exportData.markdownBrief}</pre>
                  )}
                </div>

                <div className="p-3 bg-[#F5F6FA] border border-[#DDE3EE] rounded-xl flex items-center justify-between text-[11px] text-[#4B5565] flex-wrap gap-2">
                  <span className="font-mono">
                    SHA-256 Digest: <strong className="text-[#2A4BFF]">{exportData.sha256Seal}</strong>
                  </span>
                  <span className="text-[#10B981] font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Attestation Status: CCO & Board Sealed</span>
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
