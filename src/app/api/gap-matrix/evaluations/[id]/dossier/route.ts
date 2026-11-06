import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getTenantContext } from '@/shared/auth';
import { defaultDossierExportService } from '@/modules/gap-matrix/services/dossierExportService';
import { EntitlementEngine } from '@/shared/billing';
import { logger } from '@/shared/logger';
import { ComplianceStatus } from '@/shared/types';
import { GapEvaluationResult } from '@/modules/gap-matrix/types';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: evaluationId } = await Promise.resolve(context.params);

    if (!evaluationId) {
      return NextResponse.json(
        { success: false, error: 'Evaluation ID is required' },
        { status: 400 }
      );
    }

    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    if (!tenantCtx.isDevFallback && process.env.NODE_ENV === 'production') {
      EntitlementEngine.assertEngineActive(tenantCtx.subscription, '5-W Gap Matrix Audit Defense Dossier export');
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Request body may be omitted when using stored evaluation defaults
    }

    const { organizationName, ccoName, notes } = body;
    const { dbClient, organizationId } = tenantCtx;

    if (!dbClient) {
      return NextResponse.json(
        { success: false, error: 'Database client unavailable' },
        { status: 500 }
      );
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(evaluationId);

    if (!isUuid) {
      const mockResult: GapEvaluationResult = {
        evaluationId,
        organizationId: tenantCtx.organizationId,
        policyId: 'pol-mock-1',
        benchmarkDocumentVersionId: 'ver-mock-1',
        policyTitle: 'Institutional AML/CFT Compliance Manual',
        benchmarkTitle: 'BOFIA 2020 Statutory Benchmark',
        overallCompliancePercentage: 75.0,
        criticalGapsCount: 1,
        partiallyMetCount: 1,
        adequatelyMetCount: 2,
        totalPotentialPenaltyNaira: 15000000,
        executiveSummary: 'Statutory concordance review against BOFIA 2020 benchmark.',
        analysisRunId: null,
        auditId: 'aud-mock-1',
        createdAt: new Date().toISOString(),
        items: [
          {
            id: 'item-1',
            regulatoryClauseId: 'cl-1',
            obligationId: 'obl-1',
            regulatoryClauseReference: 'Section 57(2)',
            statutoryLegalCitation: 'BOFIA 2020 §57(2)',
            complianceStatus: 'PARTIALLY_MET',
            statutoryPenaltyNaira: 10000000,
            matchedPolicySection: 'Clause 4.2',
            matchedPolicyText: 'Internal review of CBN directives is conducted quarterly.',
            suggestedStatus: 'PARTIALLY_MET',
            whatHappened: 'Policy lacks mandatory 24-hour escalation clause.',
            whatToKnow: 'CBN enforcement guidelines prescribe personal officer sanctions for non-conformance.',
            whatHasChanged: 'Direct monetary penalty escalates daily for persistent policy non-conformance.',
            whatToDo: 'Amend internal manual clause 4.2 to incorporate direct supervisory notification.',
            draftReplacementLanguage: 'The institution shall comply with all monetary directives issued by the Central Bank of Nigeria without delay.',
            draftReplacementPolicyLanguage: 'The institution shall comply with all monetary directives issued by the Central Bank of Nigeria without delay.',
            derivedInsight: 'Mitigates ₦10,000,000 fine under Section 57(2).',
            statutoryQuote: 'Every bank shall comply with the monetary guidelines and directives issued by the Central Bank of Nigeria.',
            complianceCriteria: ['Board review required'],
          },
        ],
      };

      const dossier = await defaultDossierExportService.generateBankExaminerDossier({
        evaluationResult: mockResult,
        organizationName: organizationName || 'First Digital FinTech Ltd',
        ccoName: ccoName || 'Chief Compliance Officer',
        notes,
      });

      const markdown = defaultDossierExportService.exportDossierToMarkdown(dossier);
      const html = defaultDossierExportService.exportDossierToHtml(dossier);

      return NextResponse.json({
        success: true,
        data: {
          dossier,
          markdown,
          html,
          exportedAt: new Date().toISOString(),
        },
      });
    }

    const { data: evalRow, error: evalErr } = await (dbClient.from('gap_evaluations') as any)
      .select(`
        id,
        organization_id,
        policy_id,
        benchmark_document_version_id,
        analysis_name,
        regulation_ids,
        policy_ids,
        scope,
        status,
        overall_compliance_percentage,
        critical_gaps_count,
        partially_met_count,
        adequately_met_count,
        action_plan,
        created_at
      `)
      .eq('id', evaluationId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (evalErr) {
      logger.error({ err: evalErr.message, evaluationId }, 'Database error fetching evaluation for dossier');
      return NextResponse.json({ success: false, error: evalErr.message }, { status: 500 });
    }

    if (!evalRow) {
      return NextResponse.json(
        { success: false, error: 'Evaluation not found' },
        { status: 404 }
      );
    }

    const { data: dbItems, error: itemsErr } = await (dbClient.from('gap_matrix_items') as any)
      .select('*')
      .eq('evaluation_id', evaluationId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (itemsErr) {
      logger.error({ err: itemsErr.message, evaluationId }, 'Database error fetching items for dossier');
      return NextResponse.json({ success: false, error: itemsErr.message }, { status: 500 });
    }

    const regIds = Array.isArray(evalRow.regulation_ids) ? evalRow.regulation_ids : [];
    let regTitle = 'Statutory Regulatory Framework';
    let regShort = 'Regulations';
    if (regIds.length > 0) {
      const { data: regs } = await (dbClient.from('regulatory_instruments') as any)
        .select('title, short_name')
        .in('id', regIds);
      if (regs && regs.length > 0) {
        regTitle = regs.map((r: any) => r.title).join(', ');
        regShort = regs.map((r: any) => r.short_name || r.title).join(', ');
      }
    }

    const polIds = Array.isArray(evalRow.policy_ids) ? evalRow.policy_ids : [];
    let policyTitle = 'Internal Policy Manual';
    if (polIds.length > 0) {
      const { data: pols } = await (dbClient.from('policy_documents') as any)
        .select('title')
        .eq('organization_id', organizationId)
        .in('id', polIds);
      if (pols && pols.length > 0) {
        policyTitle = pols.map((p: any) => p.title).join(', ');
      }
    }

    const evaluatedItems = (dbItems || []).map((it: any) => ({
      id: it.id,
      regulatoryClauseId: it.regulatory_clause_id,
      obligationId: it.obligation_id || null,
      policyClauseId: it.policy_clause_id || null,
      complianceStatus: it.compliance_status as ComplianceStatus,
      statutoryPenaltyNaira: Number(it.statutory_penalty_naira) || 0,
      regulatoryClauseReference: it.obligation_title || it.obligation_code || 'Statutory Directive',
      statutoryLegalCitation: it.regulation_title || regShort,
      matchedPolicySection: it.matched_policy_section || null,
      matchedPolicyText: it.matched_policy_text || null,
      suggestedStatus: it.compliance_status as ComplianceStatus,
      whatHappened: it.what_happened,
      whatToKnow: it.what_to_know,
      whatHasChanged: it.what_has_changed,
      whatToDo: it.what_to_do,
      draftReplacementLanguage: it.draft_remediation_clause || it.draft_replacement_language,
      derivedInsight: it.derived_insight,
      responsibleRole: it.responsible_role || 'Chief Compliance Officer',
      statutoryRemediationTimelineDays:
        typeof it.remediation_timeline_days === 'number' ? it.remediation_timeline_days : undefined,
      statutoryQuote: it.obligation_description || null,
      policyEvidenceQuote: it.matched_policy_text || null,
      characterSpanStart: null,
      characterSpanEnd: null,
      complianceCriteria: it.criteria_evaluations?.map((c: any) => c.criterionText) || [],
      assessment: it.derived_insight || null,
    }));

    const totalPenalty = evaluatedItems.reduce((sum: number, item: any) => sum + item.statutoryPenaltyNaira, 0);
    const penaltyStatement =
      totalPenalty > 0
        ? `Total explicit statutory penalty exposure: ₦${totalPenalty.toLocaleString('en-NG')}.`
        : 'Statutory pecuniary fine amount: Not explicitly specified in source text.';

    const evaluationResult: GapEvaluationResult = {
      evaluationId: evalRow.id,
      organizationId: evalRow.organization_id,
      policyId: evalRow.policy_id,
      benchmarkDocumentVersionId: evalRow.benchmark_document_version_id,
      overallCompliancePercentage: Number(evalRow.overall_compliance_percentage) || 0,
      criticalGapsCount:
        evalRow.critical_gaps_count ?? evaluatedItems.filter((i: any) => i.complianceStatus === 'CRITICAL_GAP').length,
      partiallyMetCount:
        evalRow.partially_met_count ?? evaluatedItems.filter((i: any) => i.complianceStatus === 'PARTIALLY_MET').length,
      adequatelyMetCount:
        evalRow.adequately_met_count ?? evaluatedItems.filter((i: any) => i.complianceStatus === 'ADEQUATELY_MET').length,
      totalPotentialPenaltyNaira: totalPenalty,
      items: evaluatedItems,
      policyTitle,
      benchmarkTitle: regTitle,
      executiveSummary: `Clause-by-clause statutory concordance review of "${policyTitle}" against "${regTitle}". ${penaltyStatement}`,
      analysisRunId: null,
      auditId: crypto.randomUUID(),
      createdAt: evalRow.created_at,
    };

    const dossier = defaultDossierExportService.generateDossier({
      evaluationResult,
      organizationName: organizationName || 'Regulated Financial Institution',
      ccoName: ccoName || 'Chief Compliance Officer',
      notes,
    });

    const markdownReport = defaultDossierExportService.generateMarkdownDossier(dossier);
    const htmlReport = defaultDossierExportService.generateHtmlDossier(dossier);

    return NextResponse.json({
      success: true,
      data: {
        dossier,
        markdown: markdownReport,
        html: htmlReport,
        markdownReport,
        htmlReport,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed generating Bank Examiner Audit Defense Dossier');
    return NextResponse.json(
      { success: false, error: err.message || 'Dossier generation error' },
      { status: 500 }
    );
  }
}
