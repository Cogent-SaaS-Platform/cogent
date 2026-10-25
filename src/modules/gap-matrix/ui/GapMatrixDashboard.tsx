'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser, useOrganization } from '@clerk/nextjs';
import { PlatformPillar, CrossPillarLinkContext, ComplianceStatus } from '@/shared/types';
import { GapAnalysisSummaryItem } from '@/app/api/gap-matrix/evaluations/route';
import { GapObligationItemViewModel } from './GapObligationsListView';
import { GapAnalysisListView } from './GapAnalysisListView';
import { GapAnalysisDetailView } from './GapAnalysisDetailView';
import { GapObligationsListView } from './GapObligationsListView';
import { ObligationAssessmentEvaluationView } from './ObligationAssessmentEvaluationView';
import { NewGapAnalysisDrawer } from './NewGapAnalysisDrawer';
import { PolicyUploadDrawer } from './PolicyUploadDrawer';
import { AuditDefenseDossierModal } from './AuditDefenseDossierModal';
import { defaultDossierExportService } from '../services/dossierExportService';
import {
  EvaluatedGapItem,
  GapEvaluationResult,
  PolicyIngestResult,
  StatutoryBenchmarkFramework,
} from '../types';

export type IdentifiedGapItem = EvaluatedGapItem & {
  id: string;
  statutoryLegalCitation: string;
};

export interface GapMatrixDashboardProps {
  onSwitchPillar?: (pillar: PlatformPillar, context?: CrossPillarLinkContext) => void;
  initialContext?: CrossPillarLinkContext | null;
  organizationId?: string;
  organizationName?: string;
}

type ViewMode = 'LIST' | 'DETAIL' | 'OBLIGATIONS' | 'EVALUATION';

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
];

const DEFAULT_TENANT_POLICIES = [
  { id: 'pol-aml-manual-2024', title: 'Internal AML/CFT & Sanctions Compliance Policy', department: 'COMPLIANCE_LEGAL', versionTag: '2.4' },
  { id: 'pol-treasury-risk-2024', title: 'Treasury Risk & Capital Adequacy Framework', department: 'TREASURY_FINANCE', versionTag: '1.8' },
  { id: 'pol-consumer-fairness-2023', title: 'Consumer Protection & Fair Lending Governance Manual', department: 'OPERATIONS', versionTag: '1.2' },
  { id: 'pol-cyber-open-banking-2024', title: 'Cybersecurity, Open Banking & API Access Policy', department: 'ENGINEERING_TECH', versionTag: '3.1' },
];

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

  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [selectedObligationId, setSelectedObligationId] = useState<string | null>(null);
  const [statusFilterOverride, setStatusFilterOverride] = useState<
    'ALL' | 'ADEQUATELY_MET' | 'PARTIALLY_MET' | 'CRITICAL_GAP'
  >('ALL');

  // Data States
  const [analyses, setAnalyses] = useState<GapAnalysisSummaryItem[]>([]);
  const [isLoadingAnalyses, setIsLoadingAnalyses] = useState(true);
  const [activeAnalysisDetail, setActiveAnalysisDetail] = useState<GapAnalysisSummaryItem | null>(null);
  const [activeItems, setActiveItems] = useState<GapObligationItemViewModel[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Available Benchmarks & Policies for Drawer
  const [availableBenchmarks, setAvailableBenchmarks] = useState<StatutoryBenchmarkFramework[]>(PRESET_BENCHMARKS);
  const [tenantPolicies, setTenantPolicies] = useState<Array<{ id: string; title: string; department: string; versionTag: string }>>(DEFAULT_TENANT_POLICIES);

  // Modals & Drawers
  const [isNewAnalysisOpen, setIsNewAnalysisOpen] = useState(false);
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);

  // 1. Fetch Analyses List
  const fetchAnalyses = useCallback(async () => {
    setIsLoadingAnalyses(true);
    try {
      const res = await fetch('/api/gap-matrix/evaluations');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setAnalyses(json.data);
        }
      }
    } catch (err) {
      console.error('Failed fetching gap evaluations:', err);
    } finally {
      setIsLoadingAnalyses(false);
    }
  }, []);

  // Fetch benchmarks & policies for drawer options
  useEffect(() => {
    fetchAnalyses();

    async function loadPresets() {
      try {
        const bRes = await fetch('/api/gap-matrix/benchmarks');
        if (bRes.ok) {
          const bJson = await bRes.json();
          if (bJson.data && bJson.data.length > 0) {
            setAvailableBenchmarks(bJson.data);
          }
        }

        const pRes = await fetch('/api/gap-matrix/policies');
        if (pRes.ok) {
          const pJson = await pRes.json();
          if (pJson.data && pJson.data.length > 0) {
            setTenantPolicies(pJson.data);
          }
        }
      } catch (err) {
        console.warn('Could not load dynamic benchmarks/policies; using defaults:', err);
      }
    }

    loadPresets();
  }, [fetchAnalyses]);

  // 2. Fetch Single Analysis Detail & Items
  const loadAnalysisDetail = useCallback(async (analysisId: string) => {
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/gap-matrix/evaluations?id=${analysisId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setActiveAnalysisDetail(json.data.evaluation);
          setActiveItems(json.data.items || []);
        }
      }
    } catch (err) {
      console.error('Failed fetching analysis detail:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  // Handle deep link via initialContext
  useEffect(() => {
    if (initialContext && analyses.length > 0) {
      const rawContext = initialContext as unknown as Record<string, unknown>;
      const targetVer = (rawContext.benchmarkDocumentVersionId || rawContext.documentVersionId) as string | undefined;
      if (targetVer) {
        const matched = analyses.find((a) => a.benchmarkDocumentVersionId === targetVer);
        if (matched) {
          setSelectedAnalysisId(matched.id);
          loadAnalysisDetail(matched.id);
          setViewMode('DETAIL');
        }
      }
    }
  }, [initialContext, analyses, loadAnalysisDetail]);

  // View Navigation Handlers
  const handleSelectAnalysis = (analysisId: string) => {
    setSelectedAnalysisId(analysisId);
    loadAnalysisDetail(analysisId);
    setViewMode('DETAIL');
  };

  const handleNavigateToObligations = (
    filterStatus?: 'ALL' | 'ADEQUATELY_MET' | 'PARTIALLY_MET' | 'CRITICAL_GAP'
  ) => {
    if (filterStatus) {
      setStatusFilterOverride(filterStatus);
    } else {
      setStatusFilterOverride('ALL');
    }
    setViewMode('OBLIGATIONS');
  };

  const handleSelectObligation = (obligationId: string) => {
    setSelectedObligationId(obligationId);
    setViewMode('EVALUATION');
  };

  const handleBackToAnalyses = () => {
    setViewMode('LIST');
    setSelectedAnalysisId(null);
    setSelectedObligationId(null);
    fetchAnalyses();
  };

  const handleBackToDetail = () => {
    setViewMode('DETAIL');
    setSelectedObligationId(null);
  };

  const handleBackToObligations = () => {
    setViewMode('OBLIGATIONS');
    setSelectedObligationId(null);
  };

  // Status override update from child
  const handleStatusChange = (itemId: string, newStatus: ComplianceStatus) => {
    setActiveItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, complianceStatus: newStatus } : item))
    );

    setActiveAnalysisDetail((prev) => {
      if (!prev) return null;
      const updatedItems = activeItems.map((item) =>
        item.id === itemId ? { ...item, complianceStatus: newStatus } : item
      );
      const adequate = updatedItems.filter((i) => i.complianceStatus === 'ADEQUATELY_MET').length;
      const partial = updatedItems.filter((i) => i.complianceStatus === 'PARTIALLY_MET').length;
      const gap = updatedItems.filter((i) => i.complianceStatus === 'CRITICAL_GAP').length;
      const total = updatedItems.length || 1;
      const pct = Math.round((adequate / total) * 100);

      return {
        ...prev,
        adequateCount: adequate,
        partialCount: partial,
        gapCount: gap,
        overallCompliancePercentage: pct,
        reviewPendingCount: partial + gap,
        closedCount: adequate,
      };
    });
  };

  // Drawer Callbacks
  const handleAnalysisCreated = async (newId: string) => {
    setIsNewAnalysisOpen(false);
    await fetchAnalyses();
    handleSelectAnalysis(newId);
  };

  const handleUploadSuccess = (result: PolicyIngestResult) => {
    setIsUploadDrawerOpen(false);
    setTenantPolicies((prev) => [
      {
        id: result.policyId,
        title: result.title,
        department: result.department,
        versionTag: result.versionTag,
      },
      ...prev,
    ]);
    setIsNewAnalysisOpen(true);
  };

  // Active Obligation for Evaluation View
  const activeObligation = useMemo(() => {
    if (!selectedObligationId) return activeItems[0] || null;
    return activeItems.find((i) => i.id === selectedObligationId) || activeItems[0] || null;
  }, [selectedObligationId, activeItems]);

  // Dossier Object for Audit Defense Export
  const currentDossier = useMemo(() => {
    const currentAnalysis = activeAnalysisDetail || analyses[0];
    if (!currentAnalysis) return null;

    const itemsToUse = activeItems.length > 0 ? activeItems : [];

    const evalResult: GapEvaluationResult = {
      evaluationId: currentAnalysis.id,
      policyId: currentAnalysis.policyId,
      policyTitle: currentAnalysis.policyTitle,
      organizationId,
      benchmarkDocumentVersionId: currentAnalysis.benchmarkDocumentVersionId,
      benchmarkTitle: currentAnalysis.regulationTitle,
      overallCompliancePercentage: currentAnalysis.overallCompliancePercentage,
      criticalGapsCount: currentAnalysis.gapCount,
      partiallyMetCount: currentAnalysis.partialCount,
      adequatelyMetCount: currentAnalysis.adequateCount,
      totalPotentialPenaltyNaira: currentAnalysis.totalPenaltyNaira,
      items: itemsToUse.map((it, idx) => {
        const validStatus: 'ADEQUATELY_MET' | 'PARTIALLY_MET' | 'CRITICAL_GAP' =
          it.complianceStatus === 'CRITICAL_GAP'
            ? 'CRITICAL_GAP'
            : it.complianceStatus === 'PARTIALLY_MET'
            ? 'PARTIALLY_MET'
            : 'ADEQUATELY_MET';

        return {
          id: it.id,
          evaluationId: it.evaluationId || currentAnalysis.id,
          regulatoryClauseId: `rc-${it.id || idx}`,
          policyClauseId: `pc-${it.id || idx}`,
          regulatoryClauseReference: it.regulatoryClauseReference,
          complianceStatus: validStatus,
          suggestedStatus: validStatus,
          whatHappened: it.whatHappened,
          whatToKnow: it.whatToKnow,
          whatHasChanged: it.whatHasChanged,
          whatToDo: it.whatToDo,
          draftReplacementLanguage: it.draftReplacementLanguage,
          derivedInsight: it.derivedInsight || 'Insulates institution against statutory fine liability and supervisory downgrade.',
          responsibleRole: it.responsibleRole,
          statutoryPenaltyNaira: it.statutoryPenaltyNaira,
          statutoryRemediationTimelineDays: it.statutoryRemediationTimelineDays || 30,
          statutoryLegalCitation: it.statutoryLegalCitation,
          matchedPolicySection: it.matchedPolicySection || null,
          matchedPolicyText: it.matchedPolicyText || null,
        };
      }),
      executiveSummary: `Comprehensive clause-by-clause statutory gap evaluation conducted on ${currentAnalysis.policyTitle} against ${currentAnalysis.regulationTitle}. Evaluation identified ${currentAnalysis.gapCount} critical gaps (Level 1 material deficiencies) and ${currentAnalysis.partialCount} partially met provisions requiring prompt Board review and CCO remediation. Remediation avoids total statutory liability of ₦${(currentAnalysis.totalPenaltyNaira / 1_000_000).toFixed(1)}M.`,
      analysisRunId: null,
      auditId: 'audit-' + Date.now(),
      createdAt: currentAnalysis.createdAt || new Date().toISOString(),
    };

    return defaultDossierExportService.generateDossier({
      evaluationResult: evalResult,
      organizationName: effectiveOrgName,
      ccoName: effectiveCcoName,
    });
  }, [
    activeAnalysisDetail,
    analyses,
    activeItems,
    organizationId,
    effectiveOrgName,
    effectiveCcoName,
  ]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 pb-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* VIEW 1: Gap Analysis List (temp (11).png) */}
        {viewMode === 'LIST' && (
          <GapAnalysisListView
            evaluations={analyses}
            isLoading={isLoadingAnalyses}
            onSelectAnalysis={handleSelectAnalysis}
            onOpenNewAnalysisDrawer={() => setIsNewAnalysisOpen(true)}
            onOpenUploadDrawer={() => setIsUploadDrawerOpen(true)}
            onOpenDossierModal={() => setIsDossierModalOpen(true)}
          />
        )}

        {/* VIEW 2: Gap Analysis Detail (temp (13).png) */}
        {viewMode === 'DETAIL' && (
          <>
            {isLoadingDetail || !activeAnalysisDetail ? (
              <div className="py-20 text-center text-xs text-slate-500 font-medium">
                Loading statutory evaluation breakdown...
              </div>
            ) : (
              <GapAnalysisDetailView
                analysis={activeAnalysisDetail}
                items={activeItems.map((it) => ({
                  id: it.id,
                  regulatoryClauseReference: it.regulatoryClauseReference,
                  complianceStatus: it.complianceStatus,
                  whatHappened: it.whatHappened,
                  whatToDo: it.whatToDo,
                  responsibleRole: it.responsibleRole || 'Chief Compliance Officer',
                  statutoryPenaltyNaira: it.statutoryPenaltyNaira,
                  statutoryLegalCitation: it.statutoryLegalCitation,
                  matchedPolicySection: it.matchedPolicySection || null,
                }))}
                onBack={handleBackToAnalyses}
                onNavigateToObligations={handleNavigateToObligations}
                onOpenDossierModal={() => setIsDossierModalOpen(true)}
              />
            )}
          </>
        )}

        {/* VIEW 3: Gap Obligations List (temp (14).png) */}
        {viewMode === 'OBLIGATIONS' && (
          <GapObligationsListView
            analysisName={activeAnalysisDetail?.analysisName || 'Regulatory Gap Analysis'}
            items={activeItems}
            initialStatusFilter={statusFilterOverride}
            onBack={handleBackToDetail}
            onNavigateToAnalysisList={handleBackToAnalyses}
            onSelectObligation={handleSelectObligation}
          />
        )}

        {/* VIEW 4: Obligation Assessment Evaluation (temp (15-16).png + 5-W) */}
        {viewMode === 'EVALUATION' && activeObligation && (
          <ObligationAssessmentEvaluationView
            obligation={activeObligation}
            analysisName={activeAnalysisDetail?.analysisName || 'Regulatory Gap Analysis'}
            policyTitle={activeAnalysisDetail?.policyTitle}
            onBack={handleBackToObligations}
            onNavigateToDetail={handleBackToDetail}
            onNavigateToAnalysisList={handleBackToAnalyses}
            onOpenDossierModal={() => setIsDossierModalOpen(true)}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      {/* New Gap Analysis Drawer (temp (12).png) */}
      <NewGapAnalysisDrawer
        isOpen={isNewAnalysisOpen}
        onClose={() => setIsNewAnalysisOpen(false)}
        availableBenchmarks={availableBenchmarks}
        tenantPolicies={tenantPolicies}
        onAnalysisCreated={handleAnalysisCreated}
        onOpenUploadPolicy={() => {
          setIsNewAnalysisOpen(false);
          setIsUploadDrawerOpen(true);
        }}
      />

      {/* Policy Upload Drawer */}
      <PolicyUploadDrawer
        isOpen={isUploadDrawerOpen}
        onClose={() => setIsUploadDrawerOpen(false)}
        organizationId={organizationId}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Bank Examiner Audit Defense Dossier Modal */}
      {isDossierModalOpen && (
        <AuditDefenseDossierModal
          dossier={currentDossier}
          onClose={() => setIsDossierModalOpen(false)}
        />
      )}
    </div>
  );
}
