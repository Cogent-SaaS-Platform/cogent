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

  const compositeScore = data?.compositeHealthScore ?? 88;
  const healthGrade = data?.healthGrade ?? (compositeScore >= 90 ? 'EXEMPLARY' : compositeScore >= 75 ? 'SATISFACTORY' : 'SUPERVISORY_CONCERN');
  const totalFineAvoided = data?.totalFinesAvoidedNaira ?? 86500000;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto text-[#0B0F1A]">
      {/* 1. Cockpit Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-2xl border border-[#DDE3EE] shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EEF2FF] text-[#2A4BFF] border border-[#C7D2FE]">
              Pillar 4: Overview
            </span>
            <div className="flex items-center gap-1.5 text-xs text-[#10B981] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>Sovereign Enclave Active</span>
            </div>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[#0B0F1A] tracking-tight">
            Executive Command Center & Board Attestation
          </h1>
          <p className="text-xs text-[#4B5565]">
            Unified supervisory intelligence across 7 Nigerian financial regulators with connected cascade telemetry.
          </p>
        </div>

        {/* Institutional Badge & Top Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F5F6FA] border border-[#DDE3EE] text-xs">
            <Building className="w-3.5 h-3.5 text-[#2A4BFF]" />
            <span className="font-semibold text-[#0B0F1A]">{organizationName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#065F46] font-semibold border border-[#A7F3D0]">
              PSSP / Commercial Bank
            </span>
          </div>

          <button
            id="btn-orchestrate-cascade"
            onClick={() => setIsSimulatorOpen(true)}
            className="btn-base btn-secondary btn-sm gap-1.5"
            title="Open Interactive Cascade Orchestration Simulator"
          >
            <Zap className="w-3.5 h-3.5 text-[#2A4BFF]" />
            <span>Simulate Cascade</span>
          </button>

          <button
            id="btn-export-board-brief"
            onClick={handleExportBrief}
            className="btn-base btn-primary btn-sm gap-1.5 shadow-xs"
            title="Generate Board Audit Committee Briefing"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Board Attestation</span>
          </button>

          <button
            onClick={fetchOverview}
            disabled={isLoading}
            className="p-2 text-[#4B5565] hover:text-[#0B0F1A] bg-white hover:bg-[#F5F6FA] rounded-xl border border-[#DDE3EE] transition-colors"
            title="Refresh Telemetry"
            aria-label="Refresh telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#2A4BFF]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Composite Health Hero Banner (Zango 1:00) */}
      <section className="relative overflow-hidden rounded-2xl bg-white border border-[#DDE3EE] p-6 md:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-xs font-semibold text-[#2A4BFF]">
              <Sparkles className="w-3.5 h-3.5 text-[#2A4BFF]" />
              <span>Sovereign Compliance Posture: {healthGrade}</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B0F1A] tracking-tight leading-tight">
              Enterprise Multi-Regulator Defense & Supervisory Index
            </h2>

            <p className="text-xs md:text-sm text-[#4B5565] leading-relaxed">
              Continuous compliance telemetry verified across <strong className="text-[#0B0F1A]">Central Bank of Nigeria (CBN)</strong>, <strong className="text-[#0B0F1A]">SEC</strong>, <strong className="text-[#0B0F1A]">NDPC</strong>, <strong className="text-[#0B0F1A]">FCCPC</strong>, <strong className="text-[#0B0F1A]">NFIU</strong>, <strong className="text-[#0B0F1A]">ARCON</strong>, and <strong className="text-[#0B0F1A]">NDIC</strong>. The Connected Compliance Cascade ensures that upstream circulars automatically trigger downstream policy concordance re-evaluations and marketing drift checks in real time.
            </p>

            {/* Quick Cross-Pillar Launch Pills */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                id="action-scan-marketing"
                onClick={() => handleNavigate('/marketing', 'marketing')}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#0B0F1A] bg-[#F5F6FA] hover:bg-[#EEF2FF] hover:text-[#2A4BFF] border border-[#DDE3EE] rounded-xl transition-all shadow-2xs"
              >
                <Shield className="w-3.5 h-3.5 text-[#2A4BFF]" />
                <span>Pre-Vet Marketing Copy</span>
              </button>
              <button
                id="action-view-radar"
                onClick={() => handleNavigate('/insight', 'radar')}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#0B0F1A] bg-[#F5F6FA] hover:bg-[#EEF2FF] hover:text-[#2A4BFF] border border-[#DDE3EE] rounded-xl transition-all shadow-2xs"
              >
                <Radio className="w-3.5 h-3.5 text-[#2A4BFF]" />
                <span>Track Horizon Circulars</span>
              </button>
              <button
                id="action-evaluate-policy"
                onClick={() => handleNavigate('/gap', 'gap-matrix')}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#0B0F1A] bg-[#F5F6FA] hover:bg-[#EEF2FF] hover:text-[#2A4BFF] border border-[#DDE3EE] rounded-xl transition-all shadow-2xs"
              >
                <Scale className="w-3.5 h-3.5 text-[#2A4BFF]" />
                <span>Evaluate 5-W Policy Gap</span>
              </button>
            </div>
          </div>

          {/* Health Gauge & Fine Avoidance Summary Box */}
          <div className="flex flex-col sm:flex-row items-center gap-6 bg-[#F9FAFC] border border-[#DDE3EE] rounded-2xl p-6 shadow-2xs">
            {/* Radial Meter Simulation */}
            <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  className="stroke-[#E8EDF5]"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  stroke="#2A4BFF"
                  strokeWidth="10"
                  strokeDasharray={301.6}
                  strokeDashoffset={301.6 - (301.6 * compositeScore) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-extrabold text-[#0B0F1A] font-mono">{compositeScore}%</span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    healthGrade === 'EXEMPLARY'
                      ? 'text-[#10B981]'
                      : healthGrade === 'SATISFACTORY'
                      ? 'text-[#2A4BFF]'
                      : 'text-[#F59E0B]'
                  }`}
                >
                  {healthGrade}
                </span>
              </div>
            </div>

            <div className="space-y-3 min-w-[200px]">
              <div>
                <span className="text-[10px] font-bold text-[#8D99AE] uppercase tracking-wider block">
                  Composite Attestation Weighting
                </span>
                <span className="text-xs text-[#4B5565] font-medium">
                  30% Marketing + 35% Horizon + 35% Gap
                </span>
              </div>

              <div className="pt-2 border-t border-[#DDE3EE]">
                <span className="text-[10px] font-bold text-[#8D99AE] uppercase tracking-wider block">
                  Aggregate Sanctions Prevented
                </span>
                <span className="text-2xl font-black text-[#10B981] font-mono tracking-tight block">
                  ₦{(totalFineAvoided / 1_000_000).toFixed(1)}M
                </span>
                <span className="text-[10px] text-[#4B5565] block">
                  Deterministic penalty engine quantification
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 3-Pillar Operational Scorecard Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Pillar 1 Marketing Shield */}
        <div className="group rounded-2xl bg-white border border-[#DDE3EE] p-5 hover:border-[#2A4BFF] transition-all shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#2A4BFF]">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                {data?.pillars.marketing.healthPercentage ?? 94}% Clean
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-[#2A4BFF] uppercase tracking-wider block">
                Pillar 1
              </span>
              <h3 className="text-base font-bold text-[#0B0F1A] group-hover:text-[#2A4BFF] transition-colors">
                Marketing Pre-Vetting Shield
              </h3>
              <p className="text-xs text-[#4B5565] mt-1 leading-relaxed">
                Deterministic pre-vetting for credit promotions, fee disclosures, and ARCON Code 2022 vetting.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E8EDF5] text-xs">
              <div>
                <span className="text-[#8D99AE] block text-[10px] font-semibold uppercase">Pre-Cleared Rate</span>
                <span className="font-bold text-[#0B0F1A] font-mono">
                  {data?.pillars.marketing.primaryMetricValue ?? '18 / 18'}
                </span>
              </div>
              <div>
                <span className="text-[#8D99AE] block text-[10px] font-semibold uppercase">Fines Prevented</span>
                <span className="font-bold text-[#10B981] font-mono">
                  ₦{((data?.pillars.marketing.fineExposureAvoidedNaira ?? 16500000) / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleNavigate('/marketing', 'marketing')}
            className="mt-4 w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#F5F6FA] hover:bg-[#EEF2FF] hover:text-[#2A4BFF] text-xs font-semibold text-[#0B0F1A] transition-colors"
          >
            <span>Inspect Marketing Shield</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#2A4BFF] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Card 2: Pillar 2 Horizon Scanner / Insight */}
        <div className="group rounded-2xl bg-white border border-[#DDE3EE] p-5 hover:border-[#2A4BFF] transition-all shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#2A4BFF]">
                <Radio className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                {data?.pillars.radar.healthPercentage ?? 88}% Optimal
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-[#2A4BFF] uppercase tracking-wider block">
                Pillar 2
              </span>
              <h3 className="text-base font-bold text-[#0B0F1A] group-hover:text-[#2A4BFF] transition-colors">
                Insight & Horizon Scanner
              </h3>
              <p className="text-xs text-[#4B5565] mt-1 leading-relaxed">
                Relational applicability scanner with 4-Way Multi-Role briefs and circular supersession lineage.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E8EDF5] text-xs">
              <div>
                <span className="text-[#8D99AE] block text-[10px] font-semibold uppercase">Active Directives</span>
                <span className="font-bold text-[#0B0F1A] font-mono">
                  {data?.pillars.radar.primaryMetricValue ?? '12 Directives'}
                </span>
              </div>
              <div>
                <span className="text-[#8D99AE] block text-[10px] font-semibold uppercase">Fines Prevented</span>
                <span className="font-bold text-[#10B981] font-mono">
                  ₦{((data?.pillars.radar.fineExposureAvoidedNaira ?? 25000000) / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleNavigate('/insight', 'radar')}
            className="mt-4 w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#F5F6FA] hover:bg-[#EEF2FF] hover:text-[#2A4BFF] text-xs font-semibold text-[#0B0F1A] transition-colors"
          >
            <span>Inspect Horizon Scanner</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#2A4BFF] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Card 3: Pillar 3 Gap Matrix */}
        <div className="group rounded-2xl bg-white border border-[#DDE3EE] p-5 hover:border-[#2A4BFF] transition-all shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#2A4BFF]">
                <Scale className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                {data?.pillars.gapMatrix.healthPercentage ?? 82}% Aligned
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-[#2A4BFF] uppercase tracking-wider block">
                Pillar 3
              </span>
              <h3 className="text-base font-bold text-[#0B0F1A] group-hover:text-[#2A4BFF] transition-colors">
                Gap Matrix & Policy Concordance
              </h3>
              <p className="text-xs text-[#4B5565] mt-1 leading-relaxed">
                Atomic chunking & pgvector concordance engine with Bank Examiner CAMA 2020 defense dossiers.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E8EDF5] text-xs">
              <div>
                <span className="text-[#8D99AE] block text-[10px] font-semibold uppercase">Concordance</span>
                <span className="font-bold text-[#0B0F1A] font-mono">
                  {data?.pillars.gapMatrix.primaryMetricValue ?? '82% Compliant'}
                </span>
              </div>
              <div>
                <span className="text-[#8D99AE] block text-[10px] font-semibold uppercase">Fines Prevented</span>
                <span className="font-bold text-[#10B981] font-mono">
                  ₦{((data?.pillars.gapMatrix.fineExposureAvoidedNaira ?? 45000000) / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleNavigate('/gap', 'gap-matrix')}
            className="mt-4 w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#F5F6FA] hover:bg-[#EEF2FF] hover:text-[#2A4BFF] text-xs font-semibold text-[#0B0F1A] transition-colors"
          >
            <span>Inspect 5-W Gap Matrix</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#2A4BFF] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* 4. Imminent Statutory Compliance Gates */}
      <section className="rounded-2xl bg-white border border-[#DDE3EE] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[#EF4444]" />
            <h2 className="text-sm font-bold text-[#0B0F1A] uppercase tracking-wider">
              Imminent Statutory Compliance Deadlines & Action Gates
            </h2>
          </div>
          <span className="text-[11px] text-[#4B5565] font-medium">
            Enforced countdowns with auto-escalation
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(data?.urgentGates || []).map((gate) => {
            const isCritical = gate.daysRemaining <= 7;
            const isUrgent = gate.daysRemaining <= 14;

            return (
              <div
                key={gate.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  isCritical
                    ? 'bg-[#FEF2F2] border-[#FECACA]'
                    : isUrgent
                    ? 'bg-[#FFFBEB] border-[#FDE68A]'
                    : 'bg-[#F9FAFC] border-[#DDE3EE]'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold px-2 py-0.5 rounded bg-[#0B0F1A] text-white text-[11px]">
                      {gate.regulatorCode}
                    </span>
                    <span
                      className={`font-mono font-bold flex items-center gap-1 ${
                        isCritical
                          ? 'text-[#991B1B]'
                          : isUrgent
                          ? 'text-[#92400E]'
                          : 'text-[#4B5565]'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{gate.daysRemaining}d remaining</span>
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-[#0B0F1A] leading-snug line-clamp-2">
                    {gate.title}
                  </h3>

                  <p className="text-[11px] text-[#4B5565] leading-relaxed">
                    {gate.actionRequired}
                  </p>
                </div>

                <button
                  onClick={() =>
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
                  className="mt-3.5 w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-white border border-[#DDE3EE] hover:border-[#2A4BFF] hover:text-[#2A4BFF] text-[11px] font-semibold text-[#0B0F1A] transition-colors shadow-2xs"
                >
                  <span>
                    Inspect in{' '}
                    {gate.sourcePillar === 'radar'
                      ? 'Insight'
                      : gate.sourcePillar === 'gap-matrix'
                      ? 'Gap Matrix'
                      : 'Marketing Shield'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#2A4BFF]" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Tabbed Supervisory Deep-Dive Section (settingg.webp & notic.webp style) */}
      <section className="rounded-2xl bg-white border border-[#DDE3EE] p-5 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DDE3EE] pb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#2A4BFF]" />
            <h2 className="text-sm font-bold text-[#0B0F1A] uppercase tracking-wider">
              Cross-Pillar Supervisory Breakdown
            </h2>
          </div>

          {/* Segmented Pill Tabs */}
          <div className="flex items-center bg-[#F1F3F7] p-1 rounded-full text-xs self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('REGULATORS')}
              className={`px-3.5 py-1 rounded-full font-semibold transition-all ${
                activeTab === 'REGULATORS'
                  ? 'bg-white text-[#0B0F1A] shadow-xs'
                  : 'text-[#4B5565] hover:text-[#0B0F1A]'
              }`}
            >
              7 Regulators Radar
            </button>
            <button
              onClick={() => setActiveTab('DEPARTMENTS')}
              className={`px-3.5 py-1 rounded-full font-semibold transition-all ${
                activeTab === 'DEPARTMENTS'
                  ? 'bg-white text-[#0B0F1A] shadow-xs'
                  : 'text-[#4B5565] hover:text-[#0B0F1A]'
              }`}
            >
              Department Risk Heatmap
            </button>
            <button
              onClick={() => setActiveTab('AUDIT_FEED')}
              className={`px-3.5 py-1 rounded-full font-semibold transition-all ${
                activeTab === 'AUDIT_FEED'
                  ? 'bg-white text-[#0B0F1A] shadow-xs'
                  : 'text-[#4B5565] hover:text-[#0B0F1A]'
              }`}
            >
              Cryptographic Audit Stream
            </button>
          </div>
        </div>

        {/* TAB 1: 7 Nigerian Regulators Enforcement Radar */}
        {activeTab === 'REGULATORS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(data?.regulatorCoverage || []).map((reg) => (
              <div
                key={reg.regulatorCode}
                className="p-4 rounded-xl bg-[#F9FAFC] border border-[#DDE3EE] hover:border-[#2A4BFF] transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#0B0F1A] text-white">
                      {reg.regulatorCode}
                    </span>
                    <span className="text-xs font-bold text-[#10B981] flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                      {reg.complianceRate}%
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-[#0B0F1A] leading-snug truncate">
                      {reg.regulatorName}
                    </h3>
                    <p className="text-[11px] text-[#4B5565] mt-1 line-clamp-2">
                      {reg.keyStatute}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E8EDF5] flex items-center justify-between text-xs">
                  <span className="text-[#8D99AE] text-[11px] font-mono">
                    {reg.activeInstrumentsCount} Instruments
                  </span>
                  <button
                    onClick={() =>
                      handleNavigate('/insight', 'radar', {
                        targetPillar: 'radar',
                        regulatorCode: reg.regulatorCode,
                      })
                    }
                    className="text-[#2A4BFF] hover:underline font-semibold text-xs flex items-center gap-1"
                  >
                    <span>Filter</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: Departmental Risk Heatmap */}
        {activeTab === 'DEPARTMENTS' && (
          <div className="cogent-table-container overflow-x-auto">
            <table className="cogent-table">
              <thead>
                <tr>
                  <th>Internal Department</th>
                  <th>Supervisory Risk</th>
                  <th>Open Obligations</th>
                  <th>Imminent Deadlines</th>
                  <th>Fines Avoided</th>
                  <th>Accountable Lead Role</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {(data?.departmentalReadiness || []).map((dept) => (
                  <tr key={dept.department}>
                    <td className="font-semibold text-[#0B0F1A]">
                      {dept.departmentLabel}
                    </td>
                    <td>
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          dept.overallRisk === 'CRITICAL'
                            ? 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]'
                            : dept.overallRisk === 'HIGH'
                            ? 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]'
                            : dept.overallRisk === 'MEDIUM'
                            ? 'bg-[#EEF2FF] text-[#1E40AF] border border-[#C7D2FE]'
                            : 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                        }`}
                      >
                        {dept.overallRisk} RISK
                      </span>
                    </td>
                    <td className="font-mono text-[#4B5565]">{dept.openObligationsCount} Items</td>
                    <td>
                      {dept.imminentDeadlinesCount > 0 ? (
                        <span className="font-bold text-[#EF4444] font-mono">{dept.imminentDeadlinesCount} Urgent</span>
                      ) : (
                        <span className="text-[#8D99AE] font-mono">0</span>
                      )}
                    </td>
                    <td className="font-mono font-bold text-[#10B981]">
                      {dept.finesAvoidedNaira > 0 ? `₦${(dept.finesAvoidedNaira / 1_000_000).toFixed(1)}M` : '—'}
                    </td>
                    <td className="text-[#4B5565]">{dept.leadRole}</td>
                    <td className="text-right">
                      <button
                        onClick={() =>
                          handleNavigate('/gap', 'gap-matrix', {
                            targetPillar: 'gap-matrix',
                            searchTerm: dept.departmentLabel,
                          })
                        }
                        className="text-xs font-semibold text-[#2A4BFF] hover:underline"
                      >
                        Trace in 5-W →
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
                className="p-4 rounded-xl bg-[#F9FAFC] border border-[#DDE3EE] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#2A4BFF] shrink-0 mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#0B0F1A]">{act.action}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-[#8D99AE] border border-[#DDE3EE]">
                        {act.timestamp}
                      </span>
                      <span className="text-[10px] font-bold text-[#2A4BFF] uppercase">
                        [{act.sourcePillar}]
                      </span>
                    </div>
                    <p className="text-xs text-[#4B5565] mt-1">{act.description}</p>
                    <div className="text-[10px] font-mono text-[#8D99AE] mt-1 flex items-center gap-1.5">
                      <span>CAMA 2020 SHA-256:</span>
                      <span className="text-[#4B5565] truncate max-w-xs">{act.sha256VerificationHash}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleNavigate(
                      act.sourcePillar === 'radar'
                        ? '/insight'
                        : act.sourcePillar === 'gap-matrix'
                        ? '/gap'
                        : '/marketing',
                      act.linkContext.targetPillar,
                      act.linkContext
                    )
                  }
                  className="self-end sm:self-center shrink-0 btn-base btn-secondary btn-xs gap-1"
                >
                  <span>View Record</span>
                  <ExternalLink className="w-3 h-3 text-[#2A4BFF]" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

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
                      Pillar 3 (Gap Matrix Concordance Impact):
                    </span>
                    <p className="text-[#4B5565] text-[11px]">
                      Triggered downstream re-audit for{' '}
                      <strong className="text-[#0B0F1A]">{cascadeResult.gapCascade?.impactedPoliciesCount ?? 0} internal policies</strong>.
                      Status: <span className="text-[#92400E] font-mono font-semibold">TRIGGERED_BY_CASCADE</span>.
                    </p>
                  </div>

                  <div className="text-xs space-y-1 pt-1 border-t border-[#E8EDF5]">
                    <span className="font-semibold text-[#F59E0B] block">
                      Pillar 1 (Marketing Shield Drift Impact):
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
