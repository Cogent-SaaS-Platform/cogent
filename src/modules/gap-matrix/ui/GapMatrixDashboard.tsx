'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
  initialAnalysisId?: string;
  organizationId?: string;
  organizationName?: string;
}

type ViewMode = 'LIST' | 'DETAIL' | 'OBLIGATIONS' | 'EVALUATION';

export function GapMatrixDashboard({
  onSwitchPillar,
  initialContext,
  initialAnalysisId,
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
  const [viewMode, setViewMode] = useState<ViewMode>(initialAnalysisId ? 'DETAIL' : 'LIST');
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(initialAnalysisId || null);
  const [selectedObligationId, setSelectedObligationId] = useState<string | null>(null);
  const [statusFilterOverride, setStatusFilterOverride] = useState<
    'ALL' | 'ADEQUATELY_MET' | 'PARTIALLY_MET' | 'CRITICAL_GAP'
  >('ALL');

  // Data States (100% live database state — zero preset mocks)
  const [analyses, setAnalyses] = useState<GapAnalysisSummaryItem[]>([]);
  const [isLoadingAnalyses, setIsLoadingAnalyses] = useState(true);
  const [activeAnalysisDetail, setActiveAnalysisDetail] = useState<GapAnalysisSummaryItem | null>(null);
  const [activeItems, setActiveItems] = useState<GapObligationItemViewModel[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(Boolean(initialAnalysisId));
  const [detailError, setDetailError] = useState<string | null>(null);

  // Available Benchmarks & Policies for Drawer (loaded strictly from /api/library and /api/gap-matrix/policies)
  const [availableBenchmarks, setAvailableBenchmarks] = useState<StatutoryBenchmarkFramework[]>([]);
  const [tenantPolicies, setTenantPolicies] = useState<
    Array<{ id: string; title: string; department: string; versionTag: string; clausesCount?: number }>
  >([]);

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
        if (json.success && Array.isArray(json.data)) {
          setAnalyses(json.data);
        }
      }
    } catch (err) {
      console.error('Failed fetching gap evaluations:', err);
    } finally {
      setIsLoadingAnalyses(false);
    }
  }, []);

  // 2. Fetch Single Analysis Detail & Items
  const loadAnalysisDetail = useCallback(async (analysisId: string) => {
    setIsLoadingDetail(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/gap-matrix/evaluations?id=${encodeURIComponent(analysisId)}`);
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && json.data) {
        setActiveAnalysisDetail(json.data.evaluation);
        setActiveItems(json.data.items || []);
      } else {
        setDetailError(json.error || 'Gap analysis record not found.');
      }
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed fetching analysis detail.');
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  // Fetch benchmarks & policies for drawer options
  useEffect(() => {
    fetchAnalyses();

    async function loadLiveCatalogs() {
      try {
        const [libRes, pRes] = await Promise.all([
          fetch('/api/library'),
          fetch('/api/gap-matrix/policies'),
        ]);

        if (libRes.ok) {
          const libJson = await libRes.json();
          if (Array.isArray(libJson.instruments)) {
            const mapped: StatutoryBenchmarkFramework[] = libJson.instruments.map((inst: any) => ({
              documentVersionId: inst.id,
              instrumentTitle: inst.fullTitle || inst.shortTitle,
              shortName: inst.shortTitle || inst.fullTitle,
              referenceCode: inst.officialCitation || inst.shortTitle,
              regulatorCode: inst.regulator || 'CBN',
              publicationDate: inst.publicationDate || '',
              effectiveDate: inst.effectiveDate || '',
              suggestedDepartments: ['COMPLIANCE_LEGAL', 'OPERATIONS'],
              clausesCount: inst.totalObligationsCount || inst.sectionsCount || 0,
            }));
            setAvailableBenchmarks(mapped);
          }
        }

        if (pRes.ok) {
          const pJson = await pRes.json();
          const list = Array.isArray(pJson.policies) ? pJson.policies : Array.isArray(pJson.data) ? pJson.data : [];
          setTenantPolicies(list);
        }
      } catch (err) {
        console.error('Failed loading dynamic regulations and policies:', err);
      }
    }

    loadLiveCatalogs();
  }, [fetchAnalyses]);

  // Load initialAnalysisId immediately if provided via /gap/[id]
  useEffect(() => {
    if (initialAnalysisId) {
      setSelectedAnalysisId(initialAnalysisId);
      setViewMode('DETAIL');
      loadAnalysisDetail(initialAnalysisId);
    }
  }, [initialAnalysisId, loadAnalysisDetail]);

  const handleDeleteAnalysis = async (analysisId: string) => {
    try {
      const res = await fetch(`/api/gap-matrix/evaluations?id=${encodeURIComponent(analysisId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAnalyses((prev) => prev.filter((a) => a.id !== analysisId));
        if (selectedAnalysisId === analysisId) {
          setViewMode('LIST');
          setSelectedAnalysisId(null);
        }
      }
    } catch (err) {
      console.error('Failed deleting analysis:', err);
    }
  };

  const searchParams = useSearchParams();
  const urlAnalysisId = searchParams?.get('analysisId') || searchParams?.get('gate') || '';
  const urlPolicy = searchParams?.get('policy') || '';

  // Handle deep link via initialContext or URL searchParams
  useEffect(() => {
    if (initialAnalysisId) return;
    if (urlAnalysisId) {
      setSelectedAnalysisId(urlAnalysisId);
      loadAnalysisDetail(urlAnalysisId);
      setViewMode('DETAIL');
      return;
    }

    if (analyses.length > 0) {
      if (urlPolicy) {
        const pLower = urlPolicy.toLowerCase();
        const found = analyses.find(
          (a) =>
            a.analysisName.toLowerCase().includes(pLower) ||
            (a.policyTitle && a.policyTitle.toLowerCase().includes(pLower)) ||
            a.policyId === urlPolicy ||
            (Array.isArray(a.policyIds) && a.policyIds.includes(urlPolicy))
        );
        if (found) {
          setSelectedAnalysisId(found.id);
          loadAnalysisDetail(found.id);
          setViewMode('DETAIL');
          return;
        }
      }

      if (initialContext) {
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
    }
  }, [initialAnalysisId, initialContext, analyses, loadAnalysisDetail, urlAnalysisId, urlPolicy]);

  // View Navigation Handlers
  const handleSelectAnalysis = (analysisId: string) => {
    setSelectedAnalysisId(analysisId);
    loadAnalysisDetail(analysisId);
    setViewMode('DETAIL');
  };

  const handleNavigateToObligations = (
    filterStatus?: 'ALL' | 'ADEQUATELY_MET' | 'PARTIALLY_MET' | 'CRITICAL_GAP'
  ) => {
    setStatusFilterOverride(filterStatus || 'ALL');
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
    setDetailError(null);
    fetchAnalyses();
  };

  const handleBackToDetail = () => {
    setViewMode('DETAIL');
    setSelectedObligationId(null);
    if (selectedAnalysisId) {
      loadAnalysisDetail(selectedAnalysisId);
    }
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
      const pct = Math.round(((adequate * 100 + partial * 50) / total));

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
        clausesCount: result.clausesCount,
      },
      ...prev.filter((p) => p.id !== result.policyId),
    ]);
    setIsNewAnalysisOpen(true);
  };

  const activeObligation = useMemo(() => {
    if (!selectedObligationId) return activeItems[0] || null;
    return activeItems.find((i) => i.id === selectedObligationId) || activeItems[0] || null;
  }, [selectedObligationId, activeItems]);

  // Dossier Object for Audit Defense Export
  const currentDossier = useMemo(() => {
    const currentAnalysis = activeAnalysisDetail || analyses[0];
    if (!currentAnalysis) return null;

    const itemsToUse = activeItems.length > 0 ? activeItems : [];
    const penaltyClause =
      currentAnalysis.totalPenaltyNaira > 0
        ? `Explicit statutory penalty exposure identified: ₦${(currentAnalysis.totalPenaltyNaira / 1_000_000).toFixed(1)}M.`
        : 'Statutory pecuniary fine amount: Not explicitly specified in source text.';

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
          derivedInsight: it.derivedInsight || 'Grounded in uploaded policy sections and verified statutory text.',
          responsibleRole: it.responsibleRole,
          statutoryPenaltyNaira: it.statutoryPenaltyNaira,
          statutoryRemediationTimelineDays: it.statutoryRemediationTimelineDays,
          statutoryLegalCitation: it.statutoryLegalCitation,
          matchedPolicySection: it.matchedPolicySection || null,
          matchedPolicyText: it.matchedPolicyText || null,
        };
      }),
      executiveSummary: `Clause-by-clause statutory gap evaluation conducted on "${currentAnalysis.policyTitle}" against "${currentAnalysis.regulationTitle}". Evaluation identified ${currentAnalysis.gapCount} critical gap(s) and ${currentAnalysis.partialCount} partially met provision(s). ${penaltyClause}`,
      analysisRunId: null,
      auditId: currentAnalysis.id,
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
        {viewMode === 'LIST' && (
          <GapAnalysisListView
            evaluations={analyses}
            isLoading={isLoadingAnalyses}
            onSelectAnalysis={handleSelectAnalysis}
            onOpenNewAnalysisDrawer={() => setIsNewAnalysisOpen(true)}
            onOpenUploadDrawer={() => setIsUploadDrawerOpen(true)}
            onOpenDossierModal={() => setIsDossierModalOpen(true)}
            onDeleteAnalysis={handleDeleteAnalysis}
          />
        )}

        {viewMode === 'DETAIL' && (
          <>
            {isLoadingDetail ? (
              <div className="py-20 text-center text-xs text-slate-500 font-medium">
                Loading statutory evaluation breakdown...
              </div>
            ) : detailError || !activeAnalysisDetail ? (
              <div className="p-10 bg-white border border-slate-200 rounded-xl text-center space-y-3">
                <p className="text-xs text-rose-700 font-medium">
                  {detailError || 'Unable to load gap analysis record.'}
                </p>
                <div className="flex items-center justify-center gap-2">
                  {selectedAnalysisId && (
                    <button
                      type="button"
                      onClick={() => loadAnalysisDetail(selectedAnalysisId)}
                      className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleBackToAnalyses}
                    className="px-3.5 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50"
                  >
                    Back to Gap Analyses
                  </button>
                </div>
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

        {viewMode === 'EVALUATION' && activeObligation && (
          <ObligationAssessmentEvaluationView
            obligation={activeObligation}
            analysisName={activeAnalysisDetail?.analysisName || 'Regulatory Gap Analysis'}
            policyTitle={activeAnalysisDetail?.policyTitle}
            initialAuditLogs={activeAnalysisDetail?.auditLogs || []}
            initialComments={activeAnalysisDetail?.comments || []}
            onBack={handleBackToObligations}
            onNavigateToDetail={handleBackToDetail}
            onNavigateToAnalysisList={handleBackToAnalyses}
            onOpenDossierModal={() => setIsDossierModalOpen(true)}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

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

      <PolicyUploadDrawer
        isOpen={isUploadDrawerOpen}
        onClose={() => setIsUploadDrawerOpen(false)}
        organizationId={organizationId}
        onUploadSuccess={handleUploadSuccess}
      />

      {isDossierModalOpen && (
        <AuditDefenseDossierModal
          dossier={currentDossier}
          evaluationId={activeAnalysisDetail?.id}
          onClose={() => setIsDossierModalOpen(false)}
        />
      )}
    </div>
  );
}
