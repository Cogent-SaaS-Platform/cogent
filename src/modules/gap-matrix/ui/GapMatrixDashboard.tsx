'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Upload,
  Download,
  Filter,
  Search,
  Sparkles,
  ChevronRight,
  Printer,
  Scale,
  Building,
  RefreshCw,
  CheckCircle,
  FileCheck2,
  Clock,
  ExternalLink,
  Layers,
  ArrowRight,
  Eye,
  Radio,
  Shield,
} from 'lucide-react';
import { PlatformPillar, CrossPillarLinkContext } from '@/shared/types';
import {
  EvaluatedGapItem,
  GapEvaluationResult,
  PolicyIngestResult,
  StatutoryBenchmarkFramework,
} from '../types';
import { FiveWDecisionDrawer } from './FiveWDecisionDrawer';
import { AuditDefenseDossierModal } from './AuditDefenseDossierModal';
import { PolicyUploadDrawer } from './PolicyUploadDrawer';
import { defaultDossierExportService } from '../services/dossierExportService';

// Canonical Nigerian FinTech Policy Gap Evaluation Baseline
const PRESET_BENCHMARKS: StatutoryBenchmarkFramework[] = [
  {
    documentVersionId: 'bench-cbn-cpf-2019',
    instrumentTitle: 'Central Bank of Nigeria Consumer Protection Framework for Banks and OFIs',
    shortName: 'CBN CPF 2019',
    referenceCode: 'CBN/FPR/DIR/GEN/07/040',
    regulatorCode: 'CBN',
    publicationDate: '2019-12-20',
    effectiveDate: '2020-01-01',
    suggestedDepartments: ['COMPLIANCE_LEGAL', 'OPERATIONS'],
    clausesCount: 5,
  },
  {
    documentVersionId: 'bench-cbn-aml-2022',
    instrumentTitle: 'Central Bank of Nigeria (Anti-Money Laundering, Combating the Financing of Terrorism and Countering Proliferation Financing) Regulations',
    shortName: 'CBN AML/CFT Regulations 2022',
    referenceCode: 'CBN/FPR/DIR/PUB/CIR/001/053',
    regulatorCode: 'CBN',
    publicationDate: '2022-04-08',
    effectiveDate: '2022-05-01',
    suggestedDepartments: ['COMPLIANCE_LEGAL', 'OPERATIONS', 'TREASURY_FINANCE'],
    clausesCount: 6,
  },
  {
    documentVersionId: 'bench-fccpc-dlr-2022',
    instrumentTitle: 'Limited Interim Regulatory/Registration Framework and Guidelines for Digital Lending',
    shortName: 'FCCPC Digital Lending Guidelines 2022',
    referenceCode: 'FCCPC/DLR/2022/VOL-1',
    regulatorCode: 'FCCPC',
    publicationDate: '2022-08-18',
    effectiveDate: '2022-08-18',
    suggestedDepartments: ['COMPLIANCE_LEGAL', 'GROWTH_MARKETING'],
    clausesCount: 4,
  },
];

const PRESET_EVALUATION_ITEMS: EvaluatedGapItem[] = [
  {
    id: 'gap_item_1',
    evaluationId: 'eval_canonical_1',
    regulatoryClauseId: 'rc_aml_str_72h',
    obligationId: 'ob_str_72h',
    policyClauseId: 'pc_aml_sec_4_1',
    complianceStatus: 'PARTIALLY_MET',
    statutoryPenaltyNaira: 5000000,
    statutoryLegalCitation: 'Section 25(2) Money Laundering (Prevention and Prohibition) Act 2022 & Regulation 14 NFIU Regulations 2022',
    carriesPersonalCriminalLiability: true,
    carriesLicenseSuspensionRisk: true,
    regulatoryClauseReference: 'Regulation 14(2) AML/CFT',
    matchedPolicySection: 'Section 4.1',
    matchedPolicyText: 'All formal Suspicious Transaction Reports (STRs) shall be filed with the Nigerian Financial Intelligence Unit (NFIU) within seven (7) business days of detection.',
    suggestedStatus: 'PARTIALLY_MET',
    whatHappened:
      'Statutory baseline mandates that financial institutions file Suspicious Transaction Reports (STRs) within 72 hours of detection under Section 25(2) MLA 2022. Company policy Section 4.1 erroneously permits a 7-business-day reporting window.',
    whatToKnow:
      'The NFIU and Central Bank of Nigeria enforce strict sanctions on reporting delays following the FATF mutual evaluation report on Nigeria. Discrepancies between internal policy timelines and the 72-hour statutory deadline are routinely cited as Level 2 deficiencies by visiting bank examiners.',
    whatHasChanged:
      'The company policy relies on outdated 2013 AML guidelines. The 2022 Act reduced the allowable reporting window from 7 days to exactly 72 hours, introducing personal criminal liability for compliance officers.',
    whatToDo:
      'Chief Compliance Officer must sponsor immediate Board policy revision: "The Compliance Unit shall transmit all STRs to the Nigerian Financial Intelligence Unit (NFIU) via the goAML portal within seventy-two (72) hours of the transaction being flagged as suspicious."',
    derivedInsight:
      'Amending Section 4.1 eliminates up to ₦10,000,000 in administrative fines under Section 57 BOFIA 2020 and establishes a clean defense record during annual CBN on-site examinations.',
    responsibleRole: 'Chief Compliance Officer',
    statutoryRemediationTimelineDays: 14,
  },
  {
    id: 'gap_item_2',
    evaluationId: 'eval_canonical_1',
    regulatoryClauseId: 'rc_pep_senior_mgmt',
    obligationId: 'ob_pep_approval',
    policyClauseId: 'pc_pep_sec_3_2',
    complianceStatus: 'CRITICAL_GAP',
    statutoryPenaltyNaira: 10000000,
    statutoryLegalCitation: 'Regulation 19(1) CBN AML/CFT Regulations 2022 & Section 66 BOFIA 2020',
    carriesPersonalCriminalLiability: false,
    carriesLicenseSuspensionRisk: true,
    regulatoryClauseReference: 'Regulation 19(1)(b) PEP Approval',
    matchedPolicySection: null,
    matchedPolicyText: null,
    suggestedStatus: 'CRITICAL_GAP',
    whatHappened:
      'Statute mandates prior Executive Senior Management or Managing Director approval before onboarding Politically Exposed Persons (PEPs) or continuing relationships where an existing customer becomes a PEP. Internal policy mentions annual CCO file review but completely omits mandatory Senior Management sign-off prior to account opening.',
    whatToKnow:
      'CBN Banking Supervision Department classifies unapproved PEP onboarding as a Level 1 Material Deficiency with automatic sanctions and public regulatory disclosure under Section 66 BOFIA 2020.',
    whatHasChanged:
      'The company manual treats PEP approval as a routine KYC screening step without required executive escalation controls.',
    whatToDo:
      'Managing Director and Chief Compliance Officer must adopt Section 3.2.1: "No account shall be opened for any foreign or domestic Politically Exposed Person (PEP), nor transaction processed, without written prior sign-off from the Managing Director or a designated Executive Director."',
    derivedInsight:
      'Closing this critical gap avoids a ₦10M statutory penalty and prevents potential operating license suspension or payment rail disconnection.',
    responsibleRole: 'Managing Director & CCO',
    statutoryRemediationTimelineDays: 7,
  },
  {
    id: 'gap_item_3',
    evaluationId: 'eval_canonical_1',
    regulatoryClauseId: 'rc_cdd_identity_verification',
    obligationId: 'ob_cdd_bvn_nin',
    policyClauseId: 'pc_cdd_sec_2_1',
    complianceStatus: 'ADEQUATELY_MET',
    statutoryPenaltyNaira: 0,
    statutoryLegalCitation: 'Section 3.2 CBN Tiered KYC Guidelines 2023',
    carriesPersonalCriminalLiability: false,
    carriesLicenseSuspensionRisk: false,
    regulatoryClauseReference: 'Section 3.2 Tiered KYC',
    matchedPolicySection: 'Section 2.1',
    matchedPolicyText: 'The institution shall verify the identity of every customer before account creation using Bank Verification Number (BVN) or National Identity Number (NIN). Simplified due diligence is permitted for Tier-1 low-value digital accounts.',
    suggestedStatus: 'ADEQUATELY_MET',
    whatHappened:
      'Company policy Section 2.1 fully conforms to CBN Tiered KYC Circular PSM/DIR/PUB/CIR/001/053, mandating BVN or NIN verification for digital onboarding.',
    whatToKnow:
      'CBN requires biometric authentication through NIBSS BVN database or NIMC API before account activation.',
    whatHasChanged:
      'The internal procedure is fully aligned with active regulations. No operational change is required.',
    whatToDo:
      'Maintain quarterly audit trails of NIBSS verification API uptime and KYC logs for examiner inspection.',
    derivedInsight:
      'Clean audit finding. Fully eligible for Bank Examiner Green Light during annual statutory inspection.',
    responsibleRole: 'Head of Operations & KYC',
    statutoryRemediationTimelineDays: 30,
  },
  {
    id: 'gap_item_4',
    evaluationId: 'eval_canonical_1',
    regulatoryClauseId: 'rc_record_retention_5yr',
    obligationId: 'ob_retention_5yr',
    policyClauseId: 'pc_retention_sec_5_1',
    complianceStatus: 'ADEQUATELY_MET',
    statutoryPenaltyNaira: 0,
    statutoryLegalCitation: 'Section 26 MLA 2022 & Section 38 CAMA 2020',
    carriesPersonalCriminalLiability: false,
    carriesLicenseSuspensionRisk: false,
    regulatoryClauseReference: 'Section 26 MLA 2022',
    matchedPolicySection: 'Section 5.1',
    matchedPolicyText: 'All customer identification files, account ledgers, and transaction records shall be maintained securely in electronic archives for a minimum period of five (5) years following the termination of the business relationship.',
    suggestedStatus: 'ADEQUATELY_MET',
    whatHappened:
      'Company policy Section 5.1 mandates a minimum 5-year retention period for transaction records and customer identification dossiers in full compliance with Nigerian statute.',
    whatToKnow:
      'Section 26 MLA 2022 requires maintaining records for at least five years to facilitate criminal and forensic inquiries by EFCC, ICPC, and NFIU.',
    whatHasChanged:
      'Full compliance with primary statutory retention obligations.',
    whatToDo:
      'Ensure cloud backups and immutable storage buckets are audited semi-annually.',
    derivedInsight:
      'Satisfies CAMA 2020 and BOFIA record-keeping standards. Clean finding.',
    responsibleRole: 'Head of IT & Compliance',
    statutoryRemediationTimelineDays: 30,
  },
];

export interface GapMatrixDashboardProps {
  onSwitchPillar?: (pillar: PlatformPillar, context?: CrossPillarLinkContext) => void;
  initialContext?: CrossPillarLinkContext | null;
  organizationId?: string;
  organizationName?: string;
}

export function GapMatrixDashboard({
  onSwitchPillar,
  initialContext,
  organizationId = '00000000-0000-0000-0000-000000000001',
  organizationName = 'Apex Paystack FinTech Ltd',
}: GapMatrixDashboardProps) {
  // State
  const [availableBenchmarks, setAvailableBenchmarks] = useState<StatutoryBenchmarkFramework[]>(PRESET_BENCHMARKS);
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>('bench-cbn-aml-2022');
  const [activePolicyId, setActivePolicyId] = useState<string>('policy-canonical-demo');
  const [activePolicyTitle, setActivePolicyTitle] = useState<string>('AML/CFT & KYC Operational Compliance Manual v2.4');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL_GAP' | 'PARTIALLY_MET' | 'ADEQUATELY_MET'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [evaluationItems, setEvaluationItems] = useState<EvaluatedGapItem[]>(PRESET_EVALUATION_ITEMS);
  const [selectedDrawerItem, setSelectedDrawerItem] = useState<EvaluatedGapItem | null>(null);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationNotice, setEvaluationNotice] = useState<string | null>(null);
  const [tenantPolicies, setTenantPolicies] = useState<any[]>([]);

  const loadTenantPolicies = async () => {
    try {
      const res = await fetch('/api/gap-matrix/policies');
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setTenantPolicies(json.data);
          setActivePolicyId(json.data[0].id);
          setActivePolicyTitle(json.data[0].title);
        }
      }
    } catch (err) {
      console.warn('Could not load tenant policies from API');
    }
  };

  // Fetch live benchmarks and tenant policies from database
  React.useEffect(() => {
    async function loadBenchmarks() {
      try {
        const res = await fetch('/api/gap-matrix/benchmarks');
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            setAvailableBenchmarks(json.data);
          }
        }
      } catch (err) {
        console.warn('Could not load benchmarks from API, using default benchmarks');
      }
    }
    loadBenchmarks();
    loadTenantPolicies();
  }, []);

  // Handle incoming cross-pillar deep link context
  React.useEffect(() => {
    if (initialContext) {
      if (initialContext.benchmarkId) {
        setSelectedBenchmarkId(initialContext.benchmarkId);
      }
      if (initialContext.searchTerm) {
        setSearchQuery(initialContext.searchTerm);
      }
    }
  }, [initialContext]);

  // Derived Metrics
  const metrics = useMemo(() => {
    let critical = 0;
    let partial = 0;
    let adequate = 0;
    let totalFine = 0;

    for (const item of evaluationItems) {
      if (item.complianceStatus === 'CRITICAL_GAP') {
        critical++;
        totalFine += item.statutoryPenaltyNaira;
      } else if (item.complianceStatus === 'PARTIALLY_MET') {
        partial++;
        totalFine += item.statutoryPenaltyNaira;
      } else if (item.complianceStatus === 'ADEQUATELY_MET') {
        adequate++;
      }
    }

    const total = evaluationItems.length;
    const healthPercentage = total > 0
      ? Math.round(((adequate * 100 + partial * 50) / total) * 100) / 100
      : 100;

    return {
      critical,
      partial,
      adequate,
      totalFine,
      healthPercentage,
      totalCount: total,
    };
  }, [evaluationItems]);

  const currentBenchmark = useMemo(() => {
    return availableBenchmarks.find((b) => b.documentVersionId === selectedBenchmarkId) || availableBenchmarks[0];
  }, [availableBenchmarks, selectedBenchmarkId]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return evaluationItems.filter((item) => {
      const matchesStatus = statusFilter === 'ALL' || item.complianceStatus === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.regulatoryClauseReference.toLowerCase().includes(q) ||
        item.whatHappened.toLowerCase().includes(q) ||
        (item.responsibleRole && item.responsibleRole.toLowerCase().includes(q)) ||
        (item.matchedPolicySection && item.matchedPolicySection.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [evaluationItems, statusFilter, searchQuery]);

  // Handle Ingest Upload Callback
  const handleUploadSuccess = (result: PolicyIngestResult) => {
    setActivePolicyId(result.policyId);
    setActivePolicyTitle(`${result.title} (v${result.versionTag})`);
    setEvaluationNotice(`Successfully ingested "${result.title}" with ${result.clausesCount} atomic clauses indexed.`);
    loadTenantPolicies();
    // Automatically trigger evaluation for newly uploaded policy
    handleRunEvaluation(result.policyId, result.title);
  };

  // Run Gap Evaluation via Live Server API
  const handleRunEvaluation = async (policyIdToUse?: string, titleToUse?: string) => {
    setIsEvaluating(true);
    setEvaluationNotice(null);
    const pid = policyIdToUse || activePolicyId;
    const ptitle = titleToUse || activePolicyTitle;

    try {
      const response = await fetch('/api/gap-matrix/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          policyId: pid,
          benchmarkDocumentVersionId: selectedBenchmarkId,
          policyTitle: ptitle,
          department: 'COMPLIANCE_LEGAL',
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Evaluation endpoint returned error');
      }

      const json = await response.json();
      const result: GapEvaluationResult = json.data;

      if (result && result.items && result.items.length > 0) {
        setEvaluationItems(result.items);
        setEvaluationNotice(`Live 5-W synthesis completed via Gemini AI. Evaluated ${result.items.length} statutory obligations with deterministic penalty calculation.`);
      }
    } catch (err: any) {
      console.warn('Evaluation failed via live endpoint:', err);
      setEvaluationNotice(`Evaluation note: ${err?.message || 'Synthesis completed with local benchmark matching'}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Build Dossier Object
  const currentDossier = useMemo(() => {
    const evalResult: GapEvaluationResult = {
      evaluationId: 'eval-live-' + Date.now(),
      policyId: activePolicyId,
      policyTitle: activePolicyTitle,
      organizationId,
      benchmarkDocumentVersionId: currentBenchmark.documentVersionId,
      benchmarkTitle: currentBenchmark.instrumentTitle,
      overallCompliancePercentage: metrics.healthPercentage,
      criticalGapsCount: metrics.critical,
      partiallyMetCount: metrics.partial,
      adequatelyMetCount: metrics.adequate,
      totalPotentialPenaltyNaira: metrics.totalFine,
      items: evaluationItems,
      executiveSummary: `Comprehensive clause-by-clause statutory gap evaluation conducted on ${activePolicyTitle} against ${currentBenchmark.instrumentTitle}. Evaluation identified ${metrics.critical} critical gaps (Level 1 material deficiencies) and ${metrics.partial} partially met provisions requiring prompt Board review and CCO remediation. Remediation avoids total statutory liability of ₦${(metrics.totalFine / 1_000_000).toFixed(1)}M.`,
      analysisRunId: null,
      auditId: 'audit-' + Date.now(),
      createdAt: new Date().toISOString(),
    };

    return defaultDossierExportService.generateDossier({
      evaluationResult: evalResult,
      organizationName,
      ccoName: 'Folake Adeyemi, Esq. (CCO)',
    });
  }, [activePolicyTitle, activePolicyId, currentBenchmark, metrics, evaluationItems, organizationId, organizationName]);

  const formattedTotalFine = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(metrics.totalFine);

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col">
      {/* Top Header / Pillar Navigation */}
      <header className="border-b border-slate-800 bg-[#0F1422]/90 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-sky-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  COGENT <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Pillar 3</span>
                </span>
                <span className="text-[11px] text-slate-400 block -mt-0.5">
                  5-W Decision Gap Matrix & Audit Defense Pack
                </span>
              </div>
            </div>

            {/* Seamless Pillar Switcher */}
            {onSwitchPillar && (
              <div className="hidden lg:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 ml-4">
                <button
                  onClick={() => onSwitchPillar('executive')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Unified Executive
                </button>
                <button
                  onClick={() => onSwitchPillar('marketing')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Pillar 1: Marketing Shield
                </button>
                <button
                  onClick={() => onSwitchPillar('radar')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Pillar 2: Regulatory Radar
                </button>
                <button
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 text-white shadow-sm"
                >
                  Pillar 3: 5-W Gap Matrix
                </button>
              </div>
            )}
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsUploadDrawerOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              Upload Internal Policy
            </button>
            <button
              onClick={() => setIsDossierModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              Bank Examiner Defense Pack
            </button>
          </div>
        </div>
      </header>

      {/* Main Cockpit Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 space-y-6">
        {/* Institutional & Benchmark Control Strip */}
        <div className="p-5 rounded-2xl bg-[#0F1422] border border-slate-800/80 shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Active Internal Policy Manual
              </span>
              {tenantPolicies.length > 0 ? (
                <select
                  value={activePolicyId}
                  onChange={(e) => {
                    const sel = tenantPolicies.find((p) => p.id === e.target.value);
                    if (sel) {
                      setActivePolicyId(sel.id);
                      setActivePolicyTitle(sel.title);
                    }
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 px-3 py-1.5 focus:outline-none focus:border-cyan-500 max-w-[280px] truncate"
                >
                  {tenantPolicies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.clausesCount || 0} clauses)
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-bold text-white">{activePolicyTitle}</span>
                </div>
              )}
            </div>

            <div className="hidden sm:block w-px h-8 bg-slate-800" />

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Statutory Benchmark Framework
              </span>
              <select
                value={selectedBenchmarkId}
                onChange={(e) => setSelectedBenchmarkId(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 px-3 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                {availableBenchmarks.map((b) => (
                  <option key={b.documentVersionId} value={b.documentVersionId}>
                    {b.shortName} ({b.regulatorCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleRunEvaluation()}
              disabled={isEvaluating}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl shadow-lg shadow-indigo-600/20 transition-colors"
            >
              {isEvaluating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Evaluating Statutory Clauses...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Run 5-W Gap Evaluation
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Evaluation Notice Banner */}
        {evaluationNotice && (
          <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-3 text-xs text-indigo-200 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{evaluationNotice}</span>
            </div>
            <button
              onClick={() => setEvaluationNotice(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Executive Health Metric Cards (Epic 18 / Task 18.1) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Overall Health */}
          <div className="p-5 rounded-2xl bg-[#0F1422] border border-slate-800 shadow-lg relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Compliance Health
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black font-mono ${metrics.healthPercentage >= 80 ? 'text-emerald-400' : metrics.healthPercentage >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                {metrics.healthPercentage.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-500">overall</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${metrics.healthPercentage >= 80 ? 'bg-emerald-500' : metrics.healthPercentage >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${metrics.healthPercentage}%` }}
              />
            </div>
          </div>

          {/* Card 2: Critical Gaps */}
          <div className="p-5 rounded-2xl bg-[#0F1422] border border-slate-800 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Critical Gaps
              </span>
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-red-400">
                {metrics.critical}
              </span>
              <span className="text-xs text-slate-500">Level 1 Material</span>
            </div>
            <span className="text-[11px] text-red-400/80 mt-2 block">
              Immediate statutory fine risk
            </span>
          </div>

          {/* Card 3: Partially Met */}
          <div className="p-5 rounded-2xl bg-[#0F1422] border border-slate-800 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Partially Met
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-amber-400">
                {metrics.partial}
              </span>
              <span className="text-xs text-slate-500">Level 2 Findings</span>
            </div>
            <span className="text-[11px] text-amber-400/80 mt-2 block">
              30-day remediation order
            </span>
          </div>

          {/* Card 4: Adequately Met */}
          <div className="p-5 rounded-2xl bg-[#0F1422] border border-slate-800 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Adequately Met
              </span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-emerald-400">
                {metrics.adequate}
              </span>
              <span className="text-xs text-slate-500">Clean Findings</span>
            </div>
            <span className="text-[11px] text-emerald-400/80 mt-2 block">
              Examiner Green Light
            </span>
          </div>

          {/* Card 5: Fine Exposure */}
          <div className="p-5 rounded-2xl bg-[#0F1422] border border-slate-800 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Fine Avoidance (₦)
              </span>
              <Scale className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-emerald-400 truncate">
                {formattedTotalFine}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-2 block truncate">
              Statutory balance sheet liability
            </span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#0F1422] border border-slate-800">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Clauses ({evaluationItems.length})
            </button>
            <button
              onClick={() => setStatusFilter('CRITICAL_GAP')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'CRITICAL_GAP'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-900 text-red-400 hover:text-red-300 border border-slate-800'
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              Critical Gaps ({metrics.critical})
            </button>
            <button
              onClick={() => setStatusFilter('PARTIALLY_MET')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'PARTIALLY_MET'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-900 text-amber-400 hover:text-amber-300 border border-slate-800'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Partially Met ({metrics.partial})
            </button>
            <button
              onClick={() => setStatusFilter('ADEQUATELY_MET')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'ADEQUATELY_MET'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-emerald-400 hover:text-emerald-300 border border-slate-800'
              }`}
            >
              <CheckCircle className="w-3 h-3" />
              Adequately Met ({metrics.adequate})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clause, section, or role..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Master List of Clause-by-Clause Evaluations */}
        <div className="space-y-3">
          {filteredItems.map((item, index) => {
            const fineFormatted = item.statutoryPenaltyNaira > 0
              ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(item.statutoryPenaltyNaira)
              : '₦0';

            return (
              <div
                key={item.id || index}
                onClick={() => setSelectedDrawerItem(item)}
                className="group p-5 rounded-xl bg-[#0F1422] hover:bg-[#141A2B] border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-sky-400">
                      {item.regulatoryClauseReference}
                    </span>

                    {item.complianceStatus === 'ADEQUATELY_MET' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Adequately Met
                      </span>
                    )}

                    {item.complianceStatus === 'PARTIALLY_MET' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Partially Met
                      </span>
                    )}

                    {item.complianceStatus === 'CRITICAL_GAP' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        Critical Gap
                      </span>
                    )}

                    {item.matchedPolicySection ? (
                      <span className="text-[11px] text-indigo-300 font-mono bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-800/40">
                        Matched: {item.matchedPolicySection}
                      </span>
                    ) : (
                      <span className="text-[11px] text-red-400/80 font-mono bg-red-950/40 px-2 py-0.5 rounded border border-red-800/40">
                        Omitted from Policy
                      </span>
                    )}

                    {item.carriesPersonalCriminalLiability && (
                      <span className="text-[10px] text-red-300 bg-red-900/30 px-2 py-0.5 rounded font-semibold">
                        Personal Officer Liability
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2">
                    {item.whatHappened}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span>Role: <strong className="text-slate-200">{item.responsibleRole || 'Chief Compliance Officer'}</strong></span>
                    <span>Remediation: <strong className="text-amber-400">{item.statutoryRemediationTimelineDays || 30} Days</strong></span>
                    <span>Citation: <strong className="text-slate-300 font-mono">{item.statutoryLegalCitation || 'BOFIA 2020'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Fine Liability</span>
                    <span className={`text-sm font-bold font-mono ${item.statutoryPenaltyNaira > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {fineFormatted}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDrawerItem(item);
                    }}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="p-12 text-center rounded-2xl bg-[#0F1422] border border-slate-800 text-slate-400">
              <FileCheck2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-300">No statutory clauses match the selected filter</p>
              <p className="text-xs text-slate-500 mt-1">Try switching status filters or clearing the search query.</p>
            </div>
          )}
        </div>
      </main>

      {/* 5-W Decision Drawer (Task 18.2) */}
      <FiveWDecisionDrawer
        item={selectedDrawerItem}
        onClose={() => setSelectedDrawerItem(null)}
        policyTitle={activePolicyTitle}
        benchmarkTitle={currentBenchmark.instrumentTitle}
        onSwitchPillar={onSwitchPillar}
      />

      {/* Bank Examiner Audit Defense Dossier Modal (Task 18.3) */}
      {isDossierModalOpen && (
        <AuditDefenseDossierModal
          dossier={currentDossier}
          onClose={() => setIsDossierModalOpen(false)}
        />
      )}

      {/* Policy Upload Drawer (Task 14.1) */}
      <PolicyUploadDrawer
        isOpen={isUploadDrawerOpen}
        onClose={() => setIsUploadDrawerOpen(false)}
        organizationId={organizationId}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
