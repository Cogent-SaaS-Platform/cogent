'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useUser, useOrganization } from '@clerk/nextjs';
import {
  Scale,
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
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  Copy,
  Check,
  BookOpen,
} from 'lucide-react';
import { PlatformPillar, CrossPillarLinkContext, RegulatorCode } from '@/shared/types';
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
import { MultiPaneContainer } from '@/shared/ui/inspector/MultiPaneContainer';
import { useInspectorStore } from '@/shared/ui/inspector/inspectorStore';
import { DenseDataTable, TableColumn } from '@/shared/ui/inspector/DenseDataTable';
import {
  InspectorItemData,
  StatutoryReferenceData,
  InspectorMetric,
  AssessmentCriterion,
  InspectorCustomSection,
  InspectorAction,
} from '@/shared/ui/inspector/types';

export type IdentifiedGapItem = EvaluatedGapItem & {
  id: string;
  statutoryLegalCitation: string;
};

// Canonical Nigerian FinTech Policy Gap Evaluation Baseline
const PRESET_BENCHMARKS: StatutoryBenchmarkFramework[] = [
  {
    documentVersionId: 'bench-bofia-2020',
    instrumentTitle: 'Banks and Other Financial Institutions Act (BOFIA) 2020 (Act No. 5)',
    shortName: 'BOFIA 2020 (Payments & Banking Rails)',
    referenceCode: 'FED/GAZ/2020/ACT-05',
    regulatorCode: 'CBN',
    publicationDate: '2020-11-12',
    effectiveDate: '2020-11-13',
    suggestedDepartments: ['COMPLIANCE_LEGAL', 'TREASURY_FINANCE', 'OPERATIONS'],
    clausesCount: 8,
  },
  {
    documentVersionId: 'bench-cbn-cpf-2019',
    instrumentTitle: 'Central Bank of Nigeria Consumer Protection Framework for Banks and OFIs',
    shortName: 'CBN CPF 2019 (Consumer Protection)',
    referenceCode: 'CBN/FPR/DIR/GEN/07/040',
    regulatorCode: 'CBN',
    publicationDate: '2019-12-20',
    effectiveDate: '2020-01-01',
    suggestedDepartments: ['COMPLIANCE_LEGAL', 'OPERATIONS'],
    clausesCount: 5,
  },
  {
    documentVersionId: 'bench-cbn-aml-2022',
    instrumentTitle: 'Central Bank of Nigeria (Anti-Money Laundering, Combating Terrorism Financing) Regulations',
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
  {
    documentVersionId: 'bench-cbn-open-banking-2023',
    instrumentTitle: 'Operational Guidelines for Open Banking in Nigeria (2023)',
    shortName: 'CBN Open Banking 2023 (APIs & Data)',
    referenceCode: 'BPS/DIR/GEN/CIR/09/012',
    regulatorCode: 'CBN',
    publicationDate: '2023-03-07',
    effectiveDate: '2023-04-01',
    suggestedDepartments: ['ENGINEERING_TECH', 'PRODUCT_MANAGEMENT', 'COMPLIANCE_LEGAL'],
    clausesCount: 5,
  },
  {
    documentVersionId: 'bench-ndpa-2023',
    instrumentTitle: 'Nigeria Data Protection Act 2023 (Act No. 13)',
    shortName: 'NDPA 2023 (Data Privacy & AI)',
    referenceCode: 'FED/GAZ/2023/ACT-13',
    regulatorCode: 'NDPC',
    publicationDate: '2023-06-12',
    effectiveDate: '2023-06-14',
    suggestedDepartments: ['COMPLIANCE_LEGAL', 'ENGINEERING_TECH'],
    clausesCount: 5,
  },
  {
    documentVersionId: 'bench-sec-vasp-2024',
    instrumentTitle: 'Rules on Issuance, Offering Platforms and Custody of Digital Assets & VASPs',
    shortName: 'SEC VASP Rules 2024 (Virtual Assets)',
    referenceCode: 'SEC/CIR/VASP/2024/004',
    regulatorCode: 'SEC',
    publicationDate: '2024-03-15',
    effectiveDate: '2024-04-01',
    suggestedDepartments: ['COMPLIANCE_LEGAL', 'ENGINEERING_TECH', 'TREASURY_FINANCE'],
    clausesCount: 5,
  },
  {
    documentVersionId: 'bench-bog-act-987',
    instrumentTitle: 'Bank of Ghana Payment Systems and Services Act 2019 (Act 987)',
    shortName: 'BOG Act 987 (Ghana Cross-Border Remittance)',
    referenceCode: 'GH/GAZ/2019/ACT-987',
    regulatorCode: 'CBN',
    publicationDate: '2019-05-14',
    effectiveDate: '2019-06-01',
    suggestedDepartments: ['TREASURY_FINANCE', 'OPERATIONS', 'COMPLIANCE_LEGAL'],
    clausesCount: 4,
  },
];

// Baseline Tenant Policies Inventory
interface TenantPolicySummary {
  id: string;
  title: string;
  department: string;
  versionTag: string;
  clausesCount: number;
  concordanceScore: number;
  criticalGapsCount: number;
  fineExposureNaira: number;
  lastEvaluatedAt: string;
}

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
  organizationName = 'Authorized Tenant',
}: GapMatrixDashboardProps) {
  const { user } = useUser();
  const { organization } = useOrganization();
  const effectiveOrgName = organization?.name || organizationName || 'Authorized Tenant';
  const effectiveCcoName =
    user?.fullName ||
    (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Authorized Compliance Officer');

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<'CLAUSE_MATRIX' | 'POLICIES_INVENTORY' | 'BENCHMARKS'>('CLAUSE_MATRIX');
  const [viewMode, setViewMode] = useState<'STREAM' | 'TABLE'>('STREAM');

  // Benchmark & Policy States
  const [availableBenchmarks, setAvailableBenchmarks] = useState<StatutoryBenchmarkFramework[]>(PRESET_BENCHMARKS);
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>('bench-cbn-aml-2022');
  const [tenantPolicies, setTenantPolicies] = useState<TenantPolicySummary[]>([]);
  const [activePolicyId, setActivePolicyId] = useState<string>('');
  const [activePolicyTitle, setActivePolicyTitle] = useState<string>('');

  // Evaluation Items & Filters
  const [evaluationItems, setEvaluationItems] = useState<IdentifiedGapItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL_GAP' | 'PARTIALLY_MET' | 'ADEQUATELY_MET'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [selectedDrawerItem, setSelectedDrawerItem] = useState<IdentifiedGapItem | null>(null);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationNotice, setEvaluationNotice] = useState<string | null>(null);
  const [copiedReplacementId, setCopiedReplacementId] = useState<string | null>(null);

  // Load live benchmarks & policies on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const res = await fetch('/api/gap-matrix/benchmarks');
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            setAvailableBenchmarks(json.data);
          }
        }
      } catch (err) {
        // Fall back to preset benchmarks
      }

      try {
        const res = await fetch('/api/gap-matrix/policies');
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            setTenantPolicies(json.data);
            setActivePolicyId(json.data[0].id);
            setActivePolicyTitle(json.data[0].title);
          } else {
            setTenantPolicies([]);
            setActivePolicyId('');
            setActivePolicyTitle('');
          }
        }
      } catch (err) {
        // Keep empty policies
      }
    }
    loadInitialData();
  }, []);

  // Handle cross-pillar deep link context
  useEffect(() => {
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
    const healthPercentage =
      total > 0 ? Math.round(((adequate * 100 + partial * 50) / total) * 100) / 100 : 100;

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
    return (
      availableBenchmarks.find((b) => b.documentVersionId === selectedBenchmarkId) ||
      availableBenchmarks[0]
    );
  }, [availableBenchmarks, selectedBenchmarkId]);

  // Filtered Evaluation Items
  const filteredItems = useMemo<IdentifiedGapItem[]>(() => {
    return evaluationItems.filter((item) => {
      const matchesStatus = statusFilter === 'ALL' || item.complianceStatus === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.regulatoryClauseReference.toLowerCase().includes(q) ||
        item.whatHappened.toLowerCase().includes(q) ||
        (item.responsibleRole && item.responsibleRole.toLowerCase().includes(q)) ||
        (item.matchedPolicySection && item.matchedPolicySection.toLowerCase().includes(q)) ||
        (item.statutoryLegalCitation && item.statutoryLegalCitation.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [evaluationItems, statusFilter, searchQuery]);

  // Zango Multi-Pane Engine: Item IDs for bounded pagination
  const itemIds = useMemo(() => filteredItems.map((item) => item.id), [filteredItems]);
  const inspector = useInspectorStore(itemIds);

  // Active Evaluated Item in Inspector
  const activeEvaluatedItem = useMemo<IdentifiedGapItem | null>(() => {
    if (!inspector.inspectId) return null;
    return evaluationItems.find((i) => i.id === inspector.inspectId) || null;
  }, [inspector.inspectId, evaluationItems]);

  // Transform Evaluated Gap Item to Zango Level 4 Inspector Data
  const activeInspectorItem = useMemo<InspectorItemData | null>(() => {
    if (!activeEvaluatedItem) return null;

    const isAdequate = activeEvaluatedItem.complianceStatus === 'ADEQUATELY_MET';
    const isPartial = activeEvaluatedItem.complianceStatus === 'PARTIALLY_MET';
    const isCritical = activeEvaluatedItem.complianceStatus === 'CRITICAL_GAP';

    const statusText = isAdequate
      ? 'Clean Statutory Finding'
      : isPartial
      ? 'Level 2 Deficiency'
      : 'Level 1 Material Deficiency';

    const statusVariant = isAdequate ? 'healthy' : isPartial ? 'watch' : 'critical';

    const metricsData: InspectorMetric[] = [
      {
        label: 'Compliance Status',
        value: activeEvaluatedItem.complianceStatus.replace('_', ' '),
        subtext: isAdequate ? 'Concordant' : 'Deficient',
        variant: statusVariant,
      },
      {
        label: 'Statutory Fine',
        value:
          activeEvaluatedItem.statutoryPenaltyNaira > 0
            ? `₦${(activeEvaluatedItem.statutoryPenaltyNaira / 1_000_000).toFixed(1)}M`
            : '₦0',
        subtext: 'Sanction risk',
        variant: activeEvaluatedItem.statutoryPenaltyNaira > 0 ? 'critical' : 'healthy',
      },
      {
        label: 'Action Owner',
        value: activeEvaluatedItem.responsibleRole || 'Chief Compliance Officer',
        subtext: 'Remediation Lead',
        variant: 'neutral',
      },
      {
        label: 'Timeline',
        value: `${activeEvaluatedItem.statutoryRemediationTimelineDays || 30} Days`,
        subtext: 'Statutory Window',
        variant: isCritical ? 'critical' : 'watch',
      },
    ];

    const criteriaData: AssessmentCriterion[] = [
      {
        id: `crit-${activeEvaluatedItem.id}`,
        title: activeEvaluatedItem.regulatoryClauseReference,
        description: activeEvaluatedItem.whatToKnow,
        status: isAdequate ? 'MET' : isPartial ? 'PARTIAL' : 'NOT_MET',
        type: 'STATUTORY_MANDATE',
        aiReason: activeEvaluatedItem.whatHappened,
        statutoryClauseRef: activeEvaluatedItem.statutoryLegalCitation,
      },
    ];

    // Reference data for Level 5 split screen
    const statutoryRef: StatutoryReferenceData = {
      id: `ref-${activeEvaluatedItem.id}`,
      statutoryInstrumentTitle: currentBenchmark.instrumentTitle,
      citationClause: activeEvaluatedItem.statutoryLegalCitation,
      regulatorCode: (currentBenchmark.regulatorCode as RegulatorCode) || 'CBN',
      verbatimLegalText: `${activeEvaluatedItem.statutoryLegalCitation}:\n\nMandatory Requirement: ${activeEvaluatedItem.whatToKnow}\n\nEnforcement Notice: Operating in variance with this statutory standard exposes the financial institution to formal supervisory sanctions up to ₦${activeEvaluatedItem.statutoryPenaltyNaira.toLocaleString('en-NG')} under ${activeEvaluatedItem.statutoryLegalCitation}.`,
      statutoryPenaltyNaira: activeEvaluatedItem.statutoryPenaltyNaira,
      highlightedPhrase: activeEvaluatedItem.regulatoryClauseReference,
      effectiveDate: currentBenchmark.effectiveDate,
    };

    const customSections: InspectorCustomSection[] = [];

    // 5-W Operational Decision Matrix Section
    customSections.push({
      id: '5w-operational-matrix',
      title: '5-W Operational Decision Matrix',
      icon: <Layers className="w-4 h-4 text-slate-500" />,
      defaultOpen: true,
      content: (
        <div className="space-y-3 font-sans">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
              1. What Happened? (Operational Baseline)
            </span>
            <p className="text-xs text-slate-900 leading-relaxed">{activeEvaluatedItem.whatHappened}</p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
              2. What to Know? (Regulator Severity & Risk)
            </span>
            <p className="text-xs text-slate-900 leading-relaxed">{activeEvaluatedItem.whatToKnow}</p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
              3. What Has Changed? (Statutory Revision)
            </span>
            <p className="text-xs text-slate-900 leading-relaxed">{activeEvaluatedItem.whatHasChanged}</p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                4. What to Do? (Board-Approved Remediation)
              </span>
              <button
                type="button"
                onClick={() => {
                  const txt = activeEvaluatedItem.draftReplacementLanguage || activeEvaluatedItem.whatToDo;
                  navigator.clipboard.writeText(txt);
                  setCopiedReplacementId(activeEvaluatedItem.id);
                  setTimeout(() => setCopiedReplacementId(null), 2000);
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
              >
                {copiedReplacementId === activeEvaluatedItem.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Clause</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-900 leading-relaxed font-mono">
              &ldquo;{activeEvaluatedItem.draftReplacementLanguage || activeEvaluatedItem.whatToDo}&rdquo;
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
              5. Derived Insight (Balance Sheet Protection)
            </span>
            <p className="text-xs text-slate-900 leading-relaxed">{activeEvaluatedItem.derivedInsight}</p>
          </div>
        </div>
      ),
    });

    // Matched Policy Text Comparison
    if (activeEvaluatedItem.matchedPolicySection) {
      customSections.push({
        id: 'matched-policy-comparison',
        title: 'Current Policy Wording vs. Gap',
        icon: <FileText className="w-4 h-4 text-[#4B5565]" />,
        defaultOpen: false,
        content: (
          <div className="p-3.5 rounded-xl bg-[#F9FAFC] border border-[#DDE3EE] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#0B0F1A]">
                Internal Policy: {activeEvaluatedItem.matchedPolicySection}
              </span>
              <span className="text-[10px] text-[#4B5565] font-mono">Internal Manual</span>
            </div>
            <p className="text-[#4B5565] italic leading-relaxed font-mono text-[11px] bg-white p-2.5 rounded border border-[#DDE3EE]">
              &ldquo;{activeEvaluatedItem.matchedPolicyText || 'No text extracted'}&rdquo;
            </p>
          </div>
        ),
      });
    }

    const actions: InspectorAction[] = [
      {
        id: 'inspect-statute',
        label: 'Inspect Verbatim Statute (Split View)',
        icon: <BookOpen className="w-3.5 h-3.5" />,
        variant: 'secondary',
        onClick: () => {
          inspector.openReference(`ref-${activeEvaluatedItem.id}`);
        },
      },
      {
        id: 'open-decision-brief',
        label: 'Open Full 5-W Decision Brief',
        icon: <ExternalLink className="w-3.5 h-3.5" />,
        variant: 'primary',
        onClick: () => {
          setSelectedDrawerItem(activeEvaluatedItem);
        },
      },
    ];

    return {
      id: activeEvaluatedItem.id,
      referenceCode: activeEvaluatedItem.regulatoryClauseReference,
      title: `${activeEvaluatedItem.regulatoryClauseReference} • ${activePolicyTitle}`,
      subtitle: activeEvaluatedItem.statutoryLegalCitation,
      statusText,
      statusVariant,
      strictnessType: 'Prescriptive',
      summary: activeEvaluatedItem.whatHappened,
      metrics: metricsData,
      criteria: criteriaData,
      riskAnalysis:
        activeEvaluatedItem.statutoryPenaltyNaira > 0
          ? `Operating in variance with this obligation exposes the entity to ₦${activeEvaluatedItem.statutoryPenaltyNaira.toLocaleString('en-NG')} in deterministic administrative fines under ${activeEvaluatedItem.statutoryLegalCitation}.`
          : undefined,
      statutoryPenaltyNaira: activeEvaluatedItem.statutoryPenaltyNaira,
      departmentOwners: [activeEvaluatedItem.responsibleRole || 'COMPLIANCE_LEGAL'],
      regulatorCode: (currentBenchmark.regulatorCode as RegulatorCode) || 'CBN',
      statutoryReference: statutoryRef,
      customSections,
      actions,
      tags: [
        currentBenchmark.regulatorCode,
        activeEvaluatedItem.complianceStatus,
        activeEvaluatedItem.responsibleRole || 'CCO',
      ],
    };
  }, [activeEvaluatedItem, activePolicyTitle, currentBenchmark, copiedReplacementId, inspector]);

  // Level 5 Active Statutory Reference
  const activeReference = useMemo<StatutoryReferenceData | null>(() => {
    if (!inspector.refId) return null;
    if (activeInspectorItem?.statutoryReference?.id === inspector.refId) {
      return activeInspectorItem.statutoryReference;
    }
    // Fallback: match by item ID in evaluation list
    const matched = evaluationItems.find((i) => `ref-${i.id}` === inspector.refId);
    if (!matched) return null;
    return {
      id: `ref-${matched.id}`,
      statutoryInstrumentTitle: currentBenchmark.instrumentTitle,
      citationClause: matched.statutoryLegalCitation || 'Statutory Baseline Citation',
      regulatorCode: (currentBenchmark.regulatorCode as RegulatorCode) || 'CBN',
      verbatimLegalText: `${matched.statutoryLegalCitation}:\n\nStatutory Mandate: ${matched.whatToKnow}\n\nSupervisory Action Standard: Bank examiners and supervisory inspectors require immediate verification of policy concordance. Failure to demonstrate internal enforcement warrants regulatory penalties of ₦${matched.statutoryPenaltyNaira.toLocaleString('en-NG')}.`,
      statutoryPenaltyNaira: matched.statutoryPenaltyNaira,
      highlightedPhrase: matched.regulatoryClauseReference,
      effectiveDate: currentBenchmark.effectiveDate,
    };
  }, [inspector.refId, activeInspectorItem, evaluationItems, currentBenchmark]);

  // Run Gap Evaluation via Live Server API
  const handleRunEvaluation = async (policyIdToUse?: string, titleToUse?: string) => {
    const pid = policyIdToUse || activePolicyId;
    const ptitle = titleToUse || activePolicyTitle;

    if (!pid || pid === 'policy-canonical-demo' || tenantPolicies.length === 0) {
      setIsUploadDrawerOpen(true);
      setEvaluationNotice(
        'Please upload an internal policy manual to run an automated 5-W statutory gap evaluation.'
      );
      return;
    }

    setIsEvaluating(true);
    setEvaluationNotice(null);

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
        const text = await response.text();
        let errMsg = 'Evaluation endpoint returned error';
        try {
          const errJson = JSON.parse(text);
          errMsg = errJson.error || errMsg;
        } catch {
          errMsg = text || errMsg;
        }
        throw new Error(errMsg);
      }

      const json = await response.json();
      const result: GapEvaluationResult = json.data;

      if (result && result.items && result.items.length > 0) {
        const mappedItems: IdentifiedGapItem[] = result.items.map((it, idx) => ({
          ...it,
          id: it.id || `gap_item_${idx + 1}`,
          statutoryLegalCitation: it.statutoryLegalCitation || 'Section 57 BOFIA 2020',
        }));
        setEvaluationItems(mappedItems);
        setEvaluationNotice(
          `Statutory evaluation complete. Evaluated ${result.items.length} obligations against benchmark frameworks with deterministic penalty quantification.`
        );
      } else {
        setEvaluationNotice('Evaluation completed with no gap items identified.');
      }
    } catch (err: unknown) {
      console.warn('Evaluation fallback notice:', err);
      const msg = err instanceof Error ? err.message : 'Evaluation could not be completed';
      setEvaluationNotice(`Evaluation note: ${msg}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Handle Ingest Upload Callback
  const handleUploadSuccess = (result: PolicyIngestResult) => {
    setActivePolicyId(result.policyId);
    setActivePolicyTitle(`${result.title} (v${result.versionTag})`);
    setEvaluationNotice(
      `Successfully ingested "${result.title}" with ${result.clausesCount} atomic clauses indexed.`
    );
    // Add to tenant policies list
    setTenantPolicies((prev) => [
      {
        id: result.policyId,
        title: result.title,
        department: result.department,
        versionTag: result.versionTag,
        clausesCount: result.clausesCount,
        concordanceScore: 0,
        criticalGapsCount: 0,
        fineExposureNaira: 0,
        lastEvaluatedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    // Automatically trigger evaluation for newly uploaded policy
    handleRunEvaluation(result.policyId, result.title);
  };

  // Build Dossier Object for Audit Defense Export
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
      organizationName: effectiveOrgName,
      ccoName: effectiveCcoName,
    });
  }, [
    activePolicyTitle,
    activePolicyId,
    currentBenchmark,
    metrics,
    evaluationItems,
    organizationId,
    effectiveOrgName,
    effectiveCcoName,
  ]);

  const formattedTotalFine = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(metrics.totalFine);

  // Table Columns for Level 1 Policies Inventory DenseDataTable
  const policyColumns: TableColumn<TenantPolicySummary>[] = [
    {
      key: 'title',
      header: 'Internal Policy Title',
      render: (p) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#2A4BFF] shrink-0" />
          <div className="truncate">
            <span className="font-semibold text-[#0B0F1A] block truncate">{p.title}</span>
            <span className="text-[11px] text-[#4B5565] font-mono">v{p.versionTag} • {p.department.replace('_', ' ')}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'clausesCount',
      header: 'Indexed Clauses',
      width: '120px',
      render: (p) => <span className="font-mono text-xs text-[#0B0F1A]">{p.clausesCount} clauses</span>,
    },
    {
      key: 'concordanceScore',
      header: 'Concordance %',
      width: '130px',
      render: (p) => (
        <div className="flex items-center gap-2">
          <span
            className={`font-mono font-bold text-xs ${
              p.concordanceScore >= 80
                ? 'text-[#059669]'
                : p.concordanceScore >= 60
                ? 'text-[#D97706]'
                : 'text-[#DC2626]'
            }`}
          >
            {p.concordanceScore}%
          </span>
          <div className="w-12 bg-[#DDE3EE] h-1.5 rounded-full overflow-hidden hidden sm:block">
            <div
              className={`h-full rounded-full ${
                p.concordanceScore >= 80
                  ? 'bg-[#059669]'
                  : p.concordanceScore >= 60
                  ? 'bg-[#D97706]'
                  : 'bg-[#DC2626]'
              }`}
              style={{ width: `${p.concordanceScore}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'criticalGapsCount',
      header: 'Critical Gaps',
      width: '110px',
      render: (p) =>
        p.criticalGapsCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-rose-700">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            {p.criticalGapsCount} Level 1
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            0 Gaps
          </span>
        ),
    },
    {
      key: 'fineExposureNaira',
      header: 'Fine Exposure (₦)',
      width: '140px',
      render: (p) => (
        <span className="font-mono font-semibold text-xs text-slate-900">
          {p.fineExposureNaira > 0
            ? `₦${(p.fineExposureNaira / 1_000_000).toFixed(1)}M`
            : '₦0'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '160px',
      render: (p) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActivePolicyId(p.id);
              setActivePolicyTitle(p.title);
              setActiveTab('CLAUSE_MATRIX');
              handleRunEvaluation(p.id, p.title);
            }}
            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded shadow-xs transition-colors"
          >
            Evaluate
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActivePolicyId(p.id);
              setActivePolicyTitle(p.title);
              setActiveTab('CLAUSE_MATRIX');
            }}
            className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            Clauses
          </button>
        </div>
      ),
    },
  ];

  // Table Columns for Clause Dense Table View
  const clauseColumns: TableColumn<IdentifiedGapItem>[] = [
    {
      key: 'regulatoryClauseReference',
      header: 'Statutory Obligation',
      render: (item) => (
        <div>
          <span className="font-semibold font-mono text-xs text-slate-900 block">
            {item.regulatoryClauseReference}
          </span>
          <span className="text-xs text-slate-500 line-clamp-1">{item.whatHappened}</span>
        </div>
      ),
    },
    {
      key: 'matchedPolicySection',
      header: 'Policy Section',
      width: '140px',
      render: (item) =>
        item.matchedPolicySection ? (
          <span className="text-xs font-mono text-slate-700">
            {item.matchedPolicySection}
          </span>
        ) : (
          <span className="text-xs font-mono text-rose-600">
            Omitted
          </span>
        ),
    },
    {
      key: 'complianceStatus',
      header: 'Status',
      width: '130px',
      render: (item) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              item.complianceStatus === 'ADEQUATELY_MET'
                ? 'bg-emerald-500'
                : item.complianceStatus === 'PARTIALLY_MET'
                ? 'bg-amber-500'
                : 'bg-rose-600'
            }`}
          />
          {item.complianceStatus === 'ADEQUATELY_MET'
            ? 'Adequately Met'
            : item.complianceStatus === 'PARTIALLY_MET'
            ? 'Partially Met'
            : 'Critical Gap'}
        </span>
      ),
    },
    {
      key: 'statutoryPenaltyNaira',
      header: 'Fine Liability',
      width: '120px',
      render: (item) => (
        <span className="font-mono font-medium text-xs text-slate-900">
          {item.statutoryPenaltyNaira > 0
            ? `₦${(item.statutoryPenaltyNaira / 1_000_000).toFixed(1)}M`
            : '₦0'}
        </span>
      ),
    },
    {
      key: 'responsibleRole',
      header: 'Remediation Lead',
      width: '160px',
      render: (item) => (
        <span className="text-xs text-slate-700 font-medium">
          {item.responsibleRole || 'Chief Compliance Officer'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Inspect',
      width: '90px',
      render: (item) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            inspector.openInspector(item.id);
          }}
          className="p-1 rounded border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <MultiPaneContainer
      inspector={inspector}
      activeItem={activeInspectorItem}
      activeReference={activeReference}
    >
      <div className="min-h-full bg-[#F5F6FA] text-[#0B0F1A] font-sans pb-16">
        {/* Module Sub-Header Toolbar */}
        <div className="bg-white border-b border-[#DDE3EE] sticky top-0 z-20 px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center shadow-xs text-[#2A4BFF]">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  5-W Policy Gap Matrix &amp; Audit Defense Pack
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clause-by-clause statutory gap evaluation &amp; supervisory defense dossier generator
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsUploadDrawerOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:text-slate-900 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>Upload Policy Manual</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDossierModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-all"
              >
                <ShieldCheck className="w-4 h-4 text-slate-300" />
                <span>Bank Examiner Defense Pack</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Cockpit */}
        <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          {/* Zango Level 3 Tab Bar */}
          <div className="flex items-center justify-between border-b border-[#DDE3EE] pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('CLAUSE_MATRIX')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'CLAUSE_MATRIX'
                    ? 'bg-[#2A4BFF] text-white shadow-xs'
                    : 'bg-white text-[#4B5565] hover:text-[#0B0F1A] border border-[#DDE3EE]'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Policy Clause Matrix ({evaluationItems.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('POLICIES_INVENTORY')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'POLICIES_INVENTORY'
                    ? 'bg-[#2A4BFF] text-white shadow-xs'
                    : 'bg-white text-[#4B5565] hover:text-[#0B0F1A] border border-[#DDE3EE]'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Policies Inventory ({tenantPolicies.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('BENCHMARKS')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'BENCHMARKS'
                    ? 'bg-[#2A4BFF] text-white shadow-xs'
                    : 'bg-white text-[#4B5565] hover:text-[#0B0F1A] border border-[#DDE3EE]'
                }`}
              >
                <Scale className="w-4 h-4" />
                <span>Statutory Benchmarks ({availableBenchmarks.length})</span>
              </button>
            </div>

            {/* View Switcher (Stream vs Table) for Clause Matrix */}
            {activeTab === 'CLAUSE_MATRIX' && (
              <div className="hidden sm:flex items-center bg-white border border-[#DDE3EE] rounded-xl p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('STREAM')}
                  className={`p-1.5 rounded-lg text-xs transition-colors ${
                    viewMode === 'STREAM'
                      ? 'bg-[#EEF2FF] text-[#2A4BFF]'
                      : 'text-[#4B5565] hover:text-[#0B0F1A]'
                  }`}
                  title="Card Stream View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('TABLE')}
                  className={`p-1.5 rounded-lg text-xs transition-colors ${
                    viewMode === 'TABLE'
                      ? 'bg-[#EEF2FF] text-[#2A4BFF]'
                      : 'text-[#4B5565] hover:text-[#0B0F1A]'
                  }`}
                  title="Dense Table View"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* TAB 1: CLAUSE MATRIX WORKSPACE */}
          {activeTab === 'CLAUSE_MATRIX' && (
            <div className="space-y-6">
              {/* Institutional & Benchmark Selection Bar */}
              <div className="p-4 rounded-xl bg-white border border-[#DDE3EE] shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-[#4B5565] uppercase tracking-wider block mb-1">
                      Active Internal Policy Manual
                    </span>
                    <select
                      value={activePolicyId}
                      onChange={(e) => {
                        const sel = tenantPolicies.find((p) => p.id === e.target.value);
                        if (sel) {
                          setActivePolicyId(sel.id);
                          setActivePolicyTitle(sel.title);
                        }
                      }}
                      className="bg-white border border-[#DDE3EE] rounded-lg text-xs font-semibold text-[#0B0F1A] px-3 py-1.5 focus:outline-none focus:border-[#2A4BFF] max-w-[280px] truncate"
                    >
                      {tenantPolicies.length === 0 ? (
                        <option value="">No policies uploaded yet</option>
                      ) : (
                        tenantPolicies.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} ({p.clausesCount || 0} clauses)
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="hidden sm:block w-px h-8 bg-[#DDE3EE]" />

                  <div>
                    <span className="text-[11px] font-bold text-[#4B5565] uppercase tracking-wider block mb-1">
                      Statutory Benchmark Framework
                    </span>
                    <select
                      value={selectedBenchmarkId}
                      onChange={(e) => setSelectedBenchmarkId(e.target.value)}
                      className="bg-white border border-[#DDE3EE] rounded-lg text-xs font-semibold text-[#0B0F1A] px-3 py-1.5 focus:outline-none focus:border-[#2A4BFF]"
                    >
                      {availableBenchmarks.map((b) => (
                        <option key={b.documentVersionId} value={b.documentVersionId}>
                          {b.shortName} ({b.regulatorCode})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRunEvaluation()}
                    disabled={isEvaluating}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2A4BFF] hover:bg-[#1E3BD9] disabled:opacity-50 rounded-xl shadow-xs transition-colors"
                  >
                    {isEvaluating ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>Evaluating Statutory Clauses...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Run 5-W Gap Evaluation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Evaluation Notice Banner */}
              {evaluationNotice && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 border-l-4 border-l-slate-900 flex items-center justify-between gap-3 text-xs text-slate-700 animate-in fade-in">
                  <span className="font-medium">{evaluationNotice}</span>
                  <button
                    type="button"
                    onClick={() => setEvaluationNotice(null)}
                    className="text-slate-400 hover:text-slate-800 text-xs px-2 py-0.5 rounded font-semibold"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Master Evaluation View: Clean Empty State OR Active Concordance Workspace */}
              {evaluationItems.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white border border-[#DDE3EE] shadow-xs">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto mb-4 border border-slate-200">
                    <Scale className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    No Gap Evaluation Performed Yet
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
                    Upload your organization&apos;s internal policy manual (PDF, DOCX, or TXT) to evaluate clause concordance against Nigerian statutory frameworks with instant 5-W synthesis.
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsUploadDrawerOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Policy Manual</span>
                    </button>
                    {tenantPolicies.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleRunEvaluation()}
                        disabled={isEvaluating}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors shadow-xs"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
                        <span>Run 5-W Evaluation</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Unified 5-KPI Metric Bar with 1px Vertical Dividers */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
                    {/* Metric 1: Overall Health */}
                    <div className="p-4 sm:p-5 flex flex-col justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Compliance Health
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold font-mono text-slate-900">
                          {metrics.healthPercentage.toFixed(1)}%
                        </span>
                        <span className="text-xs text-slate-400">overall</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-slate-900 transition-all duration-500"
                          style={{ width: `${metrics.healthPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Metric 2: Critical Gaps */}
                    <div className="p-4 sm:p-5 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Critical Gaps
                        </span>
                        {metrics.critical > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold font-mono text-slate-900">
                          {metrics.critical}
                        </span>
                        <span className="text-xs text-slate-400">Level 1 Material</span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-2 block">
                        {metrics.critical > 0 ? 'Immediate statutory fine risk' : 'No material breaches'}
                      </span>
                    </div>

                    {/* Metric 3: Partially Met */}
                    <div className="p-4 sm:p-5 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Partially Met
                        </span>
                        {metrics.partial > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold font-mono text-slate-900">
                          {metrics.partial}
                        </span>
                        <span className="text-xs text-slate-400">Level 2 Findings</span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-2 block">
                        30-day remediation order
                      </span>
                    </div>

                    {/* Metric 4: Adequately Met */}
                    <div className="p-4 sm:p-5 flex flex-col justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Adequately Met
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold font-mono text-slate-900">
                          {metrics.adequate}
                        </span>
                        <span className="text-xs text-slate-400">Clean Findings</span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-2 block">
                        Examiner green light
                      </span>
                    </div>

                    {/* Metric 5: Fine Avoidance */}
                    <div className="p-4 sm:p-5 flex flex-col justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Fine Avoidance (₦)
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold font-mono text-slate-900 truncate">
                          {formattedTotalFine}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-2 block truncate">
                        Statutory balance sheet liability
                      </span>
                    </div>
                  </div>

                  {/* Status Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      <button
                        type="button"
                        onClick={() => setStatusFilter('ALL')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          statusFilter === 'ALL'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                        }`}
                      >
                        All Clauses ({evaluationItems.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('CRITICAL_GAP')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                          statusFilter === 'CRITICAL_GAP'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                        <span>Critical Gaps ({metrics.critical})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('PARTIALLY_MET')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                          statusFilter === 'PARTIALLY_MET'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>Partially Met ({metrics.partial})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('ADEQUATELY_MET')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                          statusFilter === 'ADEQUATELY_MET'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Adequately Met ({metrics.adequate})</span>
                      </button>
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search clause, section, or role..."
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800"
                      />
                    </div>
                  </div>

                  {viewMode === 'STREAM' ? (
                    <div className="space-y-3">
                  {filteredItems.map((item, index) => {
                    const fineFormatted =
                      item.statutoryPenaltyNaira > 0
                        ? new Intl.NumberFormat('en-NG', {
                            style: 'currency',
                            currency: 'NGN',
                            maximumFractionDigits: 0,
                          }).format(item.statutoryPenaltyNaira)
                        : '₦0';

                    const isSelected = inspector.inspectId === item.id;

                    return (
                      <div
                        key={item.id || index}
                        onClick={() => inspector.openInspector(item.id)}
                        className={`group p-4 rounded-lg bg-white border transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isSelected
                            ? 'border-slate-900 ring-1 ring-slate-900 bg-slate-50/40'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-mono text-xs font-semibold text-slate-900">
                              {item.regulatoryClauseReference}
                            </span>

                            {item.complianceStatus === 'ADEQUATELY_MET' && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Adequately Met
                              </span>
                            )}

                            {item.complianceStatus === 'PARTIALLY_MET' && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Partially Met
                              </span>
                            )}

                            {item.complianceStatus === 'CRITICAL_GAP' && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                Critical Gap
                              </span>
                            )}

                            {item.matchedPolicySection ? (
                              <span className="text-xs text-slate-600 font-mono">
                                Matched: <span className="text-slate-800 font-medium">{item.matchedPolicySection}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-rose-600 font-mono">
                                Omitted from Policy
                              </span>
                            )}

                            {item.carriesPersonalCriminalLiability && (
                              <span className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-medium">
                                Personal Officer Liability
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {item.whatHappened}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>
                              Role: <strong className="font-medium text-slate-800">{item.responsibleRole || 'Chief Compliance Officer'}</strong>
                            </span>
                            <span>
                              Remediation: <strong className="font-medium text-slate-800 font-mono">{item.statutoryRemediationTimelineDays || 30}d</strong>
                            </span>
                            <span>
                              Citation: <strong className="font-medium text-slate-800 font-mono">{item.statutoryLegalCitation || 'BOFIA 2020'}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block uppercase font-medium tracking-wider">Fine Liability</span>
                            <span className="text-sm font-semibold font-mono text-slate-900">
                              {fineFormatted}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              inspector.openInspector(item.id);
                            }}
                            className="p-1.5 rounded border border-slate-200 text-slate-400 group-hover:text-slate-800 group-hover:border-slate-300 transition-colors"
                            title="Inspect Clause"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <div className="p-12 text-center rounded-2xl bg-white border border-[#DDE3EE] text-[#4B5565]">
                      <FileCheck2 className="w-10 h-10 text-[#94A3B8] mx-auto mb-3" />
                      <p className="text-sm font-semibold text-[#0B0F1A]">
                        No statutory clauses match the selected filter
                      </p>
                      <p className="text-xs text-[#4B5565] mt-1">
                        Try switching status filters or clearing the search query.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Dense Table View */
                <DenseDataTable<IdentifiedGapItem>
                  columns={clauseColumns}
                  data={filteredItems}
                  selectedId={inspector.inspectId}
                  onRowClick={(row) => inspector.openInspector(row.id)}
                  searchPlaceholder="Filter clause table..."
                />
              )}
            </>
          )}
        </div>
      )}

          {/* TAB 2: POLICIES INVENTORY (Level 1 Feed) */}
          {activeTab === 'POLICIES_INVENTORY' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#0B0F1A]">
                    Registered Tenant Operational Policies
                  </h2>
                  <p className="text-xs text-[#4B5565]">
                    Internal governance manuals indexed for automated vector chunking and clause matching
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUploadDrawerOpen(true)}
                  className="btn-base btn-primary btn-sm gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload New Manual</span>
                </button>
              </div>

              <DenseDataTable<TenantPolicySummary>
                columns={policyColumns}
                data={tenantPolicies}
                selectedId={activePolicyId}
                onRowClick={(p) => {
                  setActivePolicyId(p.id);
                  setActivePolicyTitle(p.title);
                  setActiveTab('CLAUSE_MATRIX');
                }}
                searchPlaceholder="Search policies by title or department..."
              />
            </div>
          )}

          {/* TAB 3: STATUTORY BENCHMARKS */}
          {activeTab === 'BENCHMARKS' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#0B0F1A]">
                  Statutory Regulatory Benchmark Baselines
                </h2>
                <p className="text-xs text-[#4B5565]">
                  Binding CBN, FCCPC, NDPC, and SEC instruments against which internal policies are measured
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {availableBenchmarks.map((b) => {
                  const isSelected = selectedBenchmarkId === b.documentVersionId;
                  return (
                    <div
                      key={b.documentVersionId}
                      className={`p-5 rounded-2xl bg-white border transition-all shadow-xs flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#2A4BFF] ring-2 ring-[#2A4BFF]/20 bg-[#F9FAFC]'
                          : 'border-[#DDE3EE] hover:border-[#2A4BFF]/50'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#2A4BFF] border border-[#C7D2FE]">
                            {b.regulatorCode}
                          </span>
                          <span className="text-xs text-[#4B5565] font-mono">
                            {b.clausesCount} Clauses
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-[#0B0F1A] line-clamp-2">
                            {b.instrumentTitle}
                          </h3>
                          <span className="text-[11px] text-[#4B5565] font-mono mt-1 block">
                            Ref: {b.referenceCode}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-[#4B5565] pt-2 border-t border-[#DDE3EE]">
                          <div>
                            Effective Date: <strong className="text-[#0B0F1A]">{b.effectiveDate}</strong>
                          </div>
                          <div>
                            Departments: <strong className="text-[#0B0F1A]">{b.suggestedDepartments.join(', ')}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBenchmarkId(b.documentVersionId);
                            setActiveTab('CLAUSE_MATRIX');
                            handleRunEvaluation();
                          }}
                          className={`w-full py-2 rounded-xl text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-[#2A4BFF] text-white shadow-xs'
                              : 'bg-white text-[#4B5565] hover:text-[#0B0F1A] border border-[#DDE3EE] hover:bg-[#F9FAFC]'
                          }`}
                        >
                          {isSelected ? 'Active Baseline' : 'Select Baseline'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        {/* 5-W Decision Drawer (Task 18.2 / Level 6) */}
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
    </MultiPaneContainer>
  );
}
