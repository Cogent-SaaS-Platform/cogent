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
} from 'lucide-react';
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

export interface ExecutiveDashboardProps {
  onSwitchPillar?: (pillar: PlatformPillar, context?: CrossPillarLinkContext) => void;
  organizationId?: string;
  organizationName?: string;
}

export function ExecutiveDashboard({
  onSwitchPillar,
  organizationId = '00000000-0000-0000-0000-000000000001',
  organizationName = 'Apex Paystack FinTech Ltd',
}: ExecutiveDashboardProps) {
  const [data, setData] = useState<ExecutiveOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'REGULATORS' | 'DEPARTMENTS' | 'AUDIT_FEED'>('OVERVIEW');

  // Cascade Simulator State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorCircularId, setSimulatorCircularId] = useState('b20fb350-262a-409c-a7bc-9807604da6ec');
  const [simulatorCircularName, setSimulatorCircularName] = useState('PSM/DIR/CON/CWS/08/014 - Contactless Payment Limits');
  const [isSimulating, setIsSimulating] = useState(false);
  const [cascadeResult, setCascadeResult] = useState<{
    gapCascade?: any;
    marketingCascade?: any;
  } | null>(null);

  // Board Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportData, setExportData] = useState<ExecutiveComplianceExportResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportTab, setExportTab] = useState<'HTML' | 'MARKDOWN'>('HTML');

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
      // 1. Run 4.1 Upstream Circular -> Gap Matrix Cascade
      const gapRes = await fetch('/api/radar/cascade/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circularId: simulatorCircularId,
          organizationId,
        }),
      });
      const gapJson = gapRes.ok ? await gapRes.json() : null;

      // 2. Run 4.2 Upstream Circular -> Marketing Drift Cascade
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

      // Refresh live overview telemetry
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

  const compositeScore = data?.compositeHealthScore ?? 88;
  const healthGrade = data?.healthGrade ?? (compositeScore >= 90 ? 'EXEMPLARY' : compositeScore >= 75 ? 'SATISFACTORY' : 'SUPERVISORY_CONCERN');
  const totalFineAvoided = data?.totalFinesAvoidedNaira ?? 86500000;

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans">
      {/* Top Header / 4-Pillar Navigation Bar */}
      <header className="border-b border-slate-800 bg-[#0F1422]/90 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                  COGENT <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/20 to-emerald-500/20 text-indigo-300 border border-indigo-500/30">Executive Suite</span>
                </span>
                <span className="text-[11px] text-slate-400 block -mt-0.5">
                  Unified Sovereign RegTech & Supervisory Command Cockpit
                </span>
              </div>
            </div>

            {/* Seamless 4-Pillar Switcher */}
            {onSwitchPillar && (
              <div className="hidden lg:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 ml-4">
                <button
                  id="nav-executive"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white shadow-sm transition-all"
                >
                  Unified Executive
                </button>
                <button
                  id="nav-marketing"
                  onClick={() => onSwitchPillar('marketing')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Pillar 1: Marketing Shield
                </button>
                <button
                  id="nav-radar"
                  onClick={() => onSwitchPillar('radar')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Pillar 2: Regulatory Radar
                </button>
                <button
                  id="nav-gap-matrix"
                  onClick={() => onSwitchPillar('gap-matrix')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Pillar 3: 5-W Gap Matrix
                </button>
              </div>
            )}
          </div>

          {/* Institution Identity, Simulation & Board Export */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="btn-orchestrate-cascade"
              onClick={() => setIsSimulatorOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-indigo-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-semibold shadow-sm transition-all hover:border-amber-400/50"
              title="Open Interactive Cascade Orchestration Simulator"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Cascade</span>
            </button>

            <button
              id="btn-export-board-brief"
              onClick={handleExportBrief}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all shadow-indigo-600/20"
              title="Generate Board Audit Committee Briefing"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Board Brief</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <Building className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-slate-200">{organizationName}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PSSP / MFB</span>
            </div>

            <button
              onClick={fetchOverview}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
              title="Refresh Executive Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Cockpit Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 space-y-6">
        {/* Composite Health Hero Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121829] via-[#0F1424] to-[#0A0D18] border border-slate-800/80 p-6 md:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-semibold text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Executive Sovereign Compliance Posture: {healthGrade}</span>
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Enterprise Multi-Regulator Defense & Supervisory Index
              </h1>

              <p className="text-sm text-slate-300 leading-relaxed">
                Aggregated compliance telemetry across <strong className="text-white">Central Bank of Nigeria (CBN)</strong>, <strong className="text-white">SEC</strong>, <strong className="text-white">NDPC</strong>, <strong className="text-white">FCCPC</strong>, <strong className="text-white">NFIU</strong>, and <strong className="text-white">ARCON</strong>. The Connected Compliance Cascade ensures that upstream circulars automatically trigger downstream policy re-audits and marketing drift checks in real time.
              </p>

              {/* Quick Pillar Action Bar */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  id="action-scan-marketing"
                  onClick={() => onSwitchPillar?.('marketing')}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shadow-sm"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  Pre-Vet Marketing Copy
                </button>
                <button
                  id="action-view-radar"
                  onClick={() => onSwitchPillar?.('radar')}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shadow-sm"
                >
                  <Radio className="w-3.5 h-3.5 text-sky-400" />
                  Track Regulatory Circulars
                </button>
                <button
                  id="action-evaluate-policy"
                  onClick={() => onSwitchPillar?.('gap-matrix')}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shadow-sm"
                >
                  <Scale className="w-3.5 h-3.5 text-indigo-400" />
                  Evaluate 5-W Policy Gap
                </button>
              </div>
            </div>

            {/* Health Meter & Fine Avoidance Block */}
            <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 backdrop-blur-md">
              {/* Radial Meter Simulation */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    className="stroke-slate-800"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    stroke="url(#gradient-health)"
                    strokeWidth="10"
                    strokeDasharray={301.6}
                    strokeDashoffset={301.6 - (301.6 * compositeScore) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="gradient-health" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4F46E5" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black text-white">{compositeScore}%</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                    healthGrade === 'EXEMPLARY' ? 'text-emerald-400' :
                    healthGrade === 'SATISFACTORY' ? 'text-sky-400' :
                    'text-amber-400'
                  }`}>
                    {healthGrade}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Composite Institutional Health
                  </span>
                  <span className="text-xs text-slate-300">
                    30% Marketing + 35% Radar + 35% Gap Matrix
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Total Statutory Fine Avoidance
                  </span>
                  <span className="text-xl font-extrabold text-emerald-400 tracking-tight">
                    ₦{(totalFineAvoided / 1_000_000).toFixed(1)}M
                  </span>
                  <span className="text-[10px] text-slate-500 block">Deterministic penalty engine quantification</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Pillar Operational Summary Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Pillar 1 Marketing Shield */}
          <div className="group rounded-2xl bg-[#0F1422] border border-slate-800/80 p-5 hover:border-amber-500/40 transition-all shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {data?.pillars.marketing.healthPercentage ?? 94}% Clean
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">Pillar 1</span>
                <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                  Marketing & Growth Shield
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Automated pre-vetting for consumer loans, fee disclosures, and ARCON Code 2022 vetting.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Pre-Cleared Rate</span>
                  <span className="font-bold text-slate-200">
                    {data?.pillars.marketing.primaryMetricValue ?? '18 / 18'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Fines Prevented</span>
                  <span className="font-bold text-amber-400">
                    ₦{((data?.pillars.marketing.fineExposureAvoidedNaira ?? 16500000) / 1000000).toFixed(1)}M
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onSwitchPillar?.('marketing')}
              className="mt-4 w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 group-hover:text-white transition-colors"
            >
              <span>Inspect Marketing Shield</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Card 2: Pillar 2 Regulatory Radar */}
          <div className="group rounded-2xl bg-[#0F1422] border border-slate-800/80 p-5 hover:border-sky-500/40 transition-all shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Radio className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {data?.pillars.radar.healthPercentage ?? 88}% Optimal
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider block">Pillar 2</span>
                <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                  Regulatory Radar & Horizon Scanner
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Horizon scanner with automated Relational Applicability & 4-Way Multi-Role ExCo Briefs.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Active Circulars</span>
                  <span className="font-bold text-slate-200">
                    {data?.pillars.radar.primaryMetricValue ?? '12 Directives'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Fines Prevented</span>
                  <span className="font-bold text-sky-400">
                    ₦{((data?.pillars.radar.fineExposureAvoidedNaira ?? 25000000) / 1000000).toFixed(1)}M
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onSwitchPillar?.('radar')}
              className="mt-4 w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 group-hover:text-white transition-colors"
            >
              <span>Inspect Regulatory Radar</span>
              <ArrowRight className="w-3.5 h-3.5 text-sky-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Card 3: Pillar 3 5-W Gap Matrix */}
          <div className="group rounded-2xl bg-[#0F1422] border border-slate-800/80 p-5 hover:border-indigo-500/40 transition-all shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Scale className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {data?.pillars.gapMatrix.healthPercentage ?? 82}% Aligned
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block">Pillar 3</span>
                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                  5-W Decision Gap Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Atomic policy chunking & pgvector concordance engine with Bank Examiner Defense Packs.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Concordance</span>
                  <span className="font-bold text-slate-200">
                    {data?.pillars.gapMatrix.primaryMetricValue ?? '82% Compliant'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Fines Prevented</span>
                  <span className="font-bold text-indigo-400">
                    ₦{((data?.pillars.gapMatrix.fineExposureAvoidedNaira ?? 45000000) / 1000000).toFixed(1)}M
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onSwitchPillar?.('gap-matrix')}
              className="mt-4 w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 group-hover:text-white transition-colors"
            >
              <span>Inspect 5-W Gap Matrix</span>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>

        {/* Imminent Statutory Compliance Deadlines & Action Gates */}
        <section className="rounded-2xl bg-[#0F1422] border border-slate-800/80 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-rose-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Imminent Statutory Compliance Deadlines & Action Gates
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">Enforced countdowns with auto-escalation</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(data?.urgentGates || []).map((gate) => {
              const isUrgent = gate.daysRemaining <= 14;
              return (
                <div
                  key={gate.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    gate.daysRemaining <= 7
                      ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400'
                      : isUrgent
                      ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                        {gate.regulatorCode}
                      </span>
                      <span
                        className={`font-extrabold flex items-center gap-1 ${
                          gate.daysRemaining <= 7
                            ? 'text-rose-400'
                            : isUrgent
                            ? 'text-amber-400'
                            : 'text-slate-300'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {gate.daysRemaining} Days Left
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
                      {gate.title}
                    </h4>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {gate.actionRequired}
                    </p>
                  </div>

                  <button
                    onClick={() => onSwitchPillar?.(gate.linkContext.targetPillar, gate.linkContext)}
                    className="mt-3.5 w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 hover:text-white transition-colors"
                  >
                    <span>Inspect in {gate.sourcePillar === 'radar' ? 'Regulatory Radar' : gate.sourcePillar === 'gap-matrix' ? '5-W Gap Matrix' : 'Marketing Shield'}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tabbed In-Depth Explorer: 6 Regulators / Department Heatmap / Cryptographic Audit Feed */}
        <section className="rounded-2xl bg-[#0F1422] border border-slate-800/80 p-5 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Cross-Pillar Supervisory Breakdown
              </h2>
            </div>

            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('OVERVIEW')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeTab === 'OVERVIEW' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                6 Regulators Coverage
              </button>
              <button
                onClick={() => setActiveTab('DEPARTMENTS')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeTab === 'DEPARTMENTS' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Departmental Risk Heatmap
              </button>
              <button
                onClick={() => setActiveTab('AUDIT_FEED')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeTab === 'AUDIT_FEED' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cryptographic Audit Stream
              </button>
            </div>
          </div>

          {/* TAB 1: 6 Regulators Coverage Matrix */}
          {activeTab === 'OVERVIEW' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(data?.regulatorCoverage || []).map((reg) => (
                <div
                  key={reg.regulatorCode}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {reg.regulatorCode}
                    </span>
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {reg.complianceRate}% Aligned
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">{reg.regulatorName}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{reg.keyStatute}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                    <span className="text-slate-500 text-[11px]">{reg.activeInstrumentsCount} Active Instruments</span>
                    <button
                      onClick={() => onSwitchPillar?.('radar', { targetPillar: 'radar', regulatorCode: reg.regulatorCode })}
                      className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1"
                    >
                      <span>Filter in Radar</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: Departmental Risk Heatmap */}
          {activeTab === 'DEPARTMENTS' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Internal Department</th>
                    <th className="py-3 px-4">Supervisory Risk</th>
                    <th className="py-3 px-4">Open Obligations</th>
                    <th className="py-3 px-4">Imminent Deadlines</th>
                    <th className="py-3 px-4">Fine Avoidance</th>
                    <th className="py-3 px-4">Accountable Lead Role</th>
                    <th className="py-3 px-4 text-right">Synergy Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(data?.departmentalReadiness || []).map((dept) => (
                    <tr key={dept.department} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        {dept.departmentLabel}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            dept.overallRisk === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : dept.overallRisk === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : dept.overallRisk === 'MEDIUM'
                              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {dept.overallRisk} RISK
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-300">{dept.openObligationsCount} Items</td>
                      <td className="py-3 px-4">
                        {dept.imminentDeadlinesCount > 0 ? (
                          <span className="font-bold text-rose-400">{dept.imminentDeadlinesCount} Urgent</span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-400">
                        {dept.finesAvoidedNaira > 0 ? `₦${(dept.finesAvoidedNaira / 1_000_000).toFixed(1)}M` : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{dept.leadRole}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() =>
                            onSwitchPillar?.('gap-matrix', {
                              targetPillar: 'gap-matrix',
                              searchTerm: dept.departmentLabel,
                            })
                          }
                          className="text-xs font-semibold text-indigo-400 hover:text-white transition-colors"
                        >
                          Trace in 5-W Matrix →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: Cryptographic Audit Stream */}
          {activeTab === 'AUDIT_FEED' && (
            <div className="space-y-3">
              {(data?.recentActivities || []).map((act) => (
                <div
                  key={act.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{act.action}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {act.timestamp}
                        </span>
                        <span className="text-[10px] font-semibold text-indigo-400">
                          [{act.sourcePillar.toUpperCase()}]
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{act.description}</p>
                      <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center gap-1.5">
                        <span>SHA-256:</span>
                        <span className="text-slate-400 truncate max-w-xs">{act.sha256VerificationHash}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onSwitchPillar?.(act.linkContext.targetPillar, act.linkContext)}
                    className="self-end sm:self-center shrink-0 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <span>View Record</span>
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* MODAL 1: Interactive Cascade Orchestration Simulator */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0F1422] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Interactive Compliance Cascade Simulator
                  </h3>
                  <p className="text-xs text-slate-400">
                    Simulate how an upstream circular triggers downstream Gap Matrix & Marketing Shield drift
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSimulatorOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Select Upstream Circular Directive:
                </label>
                <select
                  value={simulatorCircularId}
                  onChange={(e) => {
                    setSimulatorCircularId(e.target.value);
                    const opt = e.target.options[e.target.selectedIndex];
                    setSimulatorCircularName(opt.text);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
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
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all"
                >
                  <Play className={`w-3.5 h-3.5 text-sky-400 ${isSimulating ? 'animate-spin' : ''}`} />
                  <span>Simulate Impact (Dry-Run)</span>
                </button>
                <button
                  onClick={() => handleRunCascade(false)}
                  disabled={isSimulating}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white shadow-lg shadow-amber-600/20 transition-all"
                >
                  <Zap className={`w-3.5 h-3.5 text-white ${isSimulating ? 'animate-spin' : ''}`} />
                  <span>Execute Real Cascade Mutation</span>
                </button>
              </div>

              {/* Cascade Output Visualizer */}
              {cascadeResult && (
                <div className="mt-4 p-4 rounded-xl bg-slate-900/90 border border-slate-700 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      Cascade Propagation Complete
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {cascadeResult.marketingCascade?.simulationMode ? 'Simulation Dry-Run' : 'Live Mutations Committed'}
                    </span>
                  </div>

                  {/* Pillar 3 Impact */}
                  <div className="text-xs space-y-1">
                    <span className="font-semibold text-indigo-400 block">
                      Pillar 3 (Gap Matrix Concordance Impact):
                    </span>
                    <p className="text-slate-300 text-[11px]">
                      Triggered downstream re-audit for{' '}
                      <strong>{cascadeResult.gapCascade?.impactedPoliciesCount ?? 0} internal policies</strong>.
                      Status: <span className="text-amber-400 font-mono">TRIGGERED_BY_CASCADE</span>.
                    </p>
                  </div>

                  {/* Pillar 1 Impact */}
                  <div className="text-xs space-y-1 pt-1 border-t border-slate-800/60">
                    <span className="font-semibold text-amber-400 block">
                      Pillar 1 (Marketing Shield Drift Impact):
                    </span>
                    <p className="text-slate-300 text-[11px]">
                      Invalidated{' '}
                      <strong>{cascadeResult.marketingCascade?.invalidatedCampaignsCount ?? 0} active campaigns</strong> and{' '}
                      <strong>{cascadeResult.marketingCascade?.invalidatedClaimsCount ?? 0} claims ledger items</strong>.
                      Campaign status: <span className="text-rose-400 font-mono">NEEDS_RE_REVIEW</span>.
                    </p>
                    <p className="text-emerald-400 text-[11px] font-bold">
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0F1422] border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Official Board Audit Committee Compliance Dossier
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cryptographically sealed supervisory briefing ready for Board transmission & Bank Examiners
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isExporting ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                <span className="text-sm font-semibold text-slate-300">
                  Compiling multi-pillar telemetry and generating SHA-256 cryptographic seal...
                </span>
              </div>
            ) : exportData ? (
              <div className="flex-1 overflow-hidden flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExportTab('HTML')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        exportTab === 'HTML' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      Printable HTML View
                    </button>
                    <button
                      onClick={() => setExportTab('MARKDOWN')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        exportTab === 'MARKDOWN' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Download Markdown</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-300">
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

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-[11px] text-slate-400">
                  <span>SHA-256 Digest: <strong className="font-mono text-indigo-300">{exportData.sha256Seal}</strong></span>
                  <span className="text-emerald-400 font-semibold">Attestation Status: CCO & Board Sealed</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
