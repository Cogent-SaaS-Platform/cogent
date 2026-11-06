import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { ComplianceStatus, RegulatorCode } from '@/shared/types';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function GET(
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
    const { dbClient, organizationId } = tenantCtx;

    if (!dbClient) {
      return NextResponse.json(
        { success: false, error: 'Database client unavailable' },
        { status: 500 }
      );
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(evaluationId);

    if (!isUuid) {
      // Mock / Dev evaluation for non-UUID test IDs (e.g. eval-seed-bofia-2020)
      return NextResponse.json({
        success: true,
        data: {
          evaluation: {
            id: evaluationId,
            organizationId,
            policyTitle: 'Institutional AML/CFT Compliance Manual',
            benchmarkTitle: 'BOFIA 2020 Statutory Benchmark',
            overallCompliancePercentage: 75.0,
            status: 'COMPLETED',
            criticalGapsCount: 1,
            partiallyMetCount: 1,
            adequatelyMetCount: 2,
            actionPlan: [],
            auditLogs: [],
            comments: [],
            createdAt: new Date().toISOString(),
          },
          summary: {
            id: evaluationId,
            overallCompliancePercentage: 75.0,
            obligationsAssessedCount: 4,
            adequateCount: 2,
            partialCount: 1,
            gapCount: 1,
          },
          items: [
            {
              id: 'item-mock-1',
              evaluationId,
              obligationId: 'obl-mock-1',
              obligationCode: 'BOFIA-SEC-57',
              obligationTitle: 'Prudential Compliance and Monetary Directives',
              obligationDescription: 'Banks must adhere strictly to CBN monetary policy directives.',
              statutoryLegalCitation: 'BOFIA 2020 §57(2)',
              complianceStatus: 'PARTIALLY_MET',
              statutoryPenaltyNaira: 10000000,
              whatHappened: 'Policy references general board review but lacks mandatory 24-hour escalation clause.',
              whatToKnow: 'CBN enforcement guidelines prescribe personal officer sanctions for non-conformance.',
              whatHasChanged: 'Direct monetary penalty escalates daily for persistent policy non-conformance.',
              whatToDo: 'Amend internal manual clause 4.2 to incorporate direct supervisory notification.',
              draftReplacementLanguage: 'The institution shall comply with all monetary directives issued by the Central Bank of Nigeria without delay.',
              statutoryQuote: 'Every bank shall comply with the monetary guidelines and directives issued by the Central Bank of Nigeria.',
              complianceCriteria: ['Board review required', '24-hour escalation protocol established'],
              criteriaEvaluations: [
                {
                  id: 'crit-mock-1',
                  criterionText: 'Board review required',
                  criterionType: 'Core Criteria',
                  status: 'MET',
                  aiReason: 'Policy manual explicitly confirms quarterly board review.',
                },
              ],
            },
          ],
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
        audit_logs,
        comments,
        created_by_name,
        created_at,
        metadata
      `)
      .eq('id', evaluationId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (evalErr) {
      logger.error({ err: evalErr.message, evaluationId }, 'Database error fetching evaluation');
      return NextResponse.json({ success: false, error: evalErr.message }, { status: 500 });
    }

    if (!evalRow) {
      return NextResponse.json(
        { success: false, error: 'Gap analysis not found' },
        { status: 404 }
      );
    }

    const { data: dbItems, error: itemsErr } = await (dbClient.from('gap_matrix_items') as any)
      .select('*')
      .eq('evaluation_id', evaluationId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (itemsErr) {
      logger.error({ err: itemsErr.message }, 'Failed fetching gap matrix items');
      return NextResponse.json({ success: false, error: itemsErr.message }, { status: 500 });
    }

    const regIds = Array.isArray(evalRow.regulation_ids) ? evalRow.regulation_ids : [];
    let regTitle = 'Statutory Regulatory Framework';
    let regShort = 'Regulations';
    let regulatorCode: RegulatorCode = 'CBN';

    if (regIds.length > 0) {
      const { data: regs } = await (dbClient.from('regulatory_instruments') as any)
        .select('id, title, short_name, regulatory_bodies(code)')
        .in('id', regIds);
      if (regs && regs.length > 0) {
        regTitle = regs.map((r: any) => r.title).join(', ');
        regShort = regs.map((r: any) => r.short_name || r.title).join(', ');
        regulatorCode = (regs[0].regulatory_bodies?.code || 'CBN') as RegulatorCode;
      }
    }

    const polIds = Array.isArray(evalRow.policy_ids) ? evalRow.policy_ids : [];
    let policyTitle = 'Internal Policy Manual';
    let policyDept = 'COMPLIANCE_LEGAL';
    let policyVersion = '1.0';

    if (polIds.length > 0) {
      const { data: pols } = await (dbClient.from('policy_documents') as any)
        .select('id, title, department, version_tag')
        .eq('organization_id', organizationId)
        .in('id', polIds);
      if (pols && pols.length > 0) {
        policyTitle = pols.map((p: any) => p.title).join(', ');
        policyDept = pols[0].department || 'COMPLIANCE_LEGAL';
        policyVersion = pols[0].version_tag || '1.0';
      }
    }

    const items = (dbItems || []).map((it: any) => ({
      id: it.id,
      evaluationId: it.evaluation_id,
      regulatoryClauseId: it.regulatory_clause_id,
      obligationId: it.obligation_id || null,
      obligationTitle: it.obligation_title || it.obligation_code || 'Statutory Compliance Directive',
      obligationCode: it.obligation_code || 'OBL',
      obligationDescription: it.obligation_description || it.what_has_changed || it.what_happened,
      regulatoryClauseReference: it.obligation_title || it.obligation_code || 'Statutory Compliance Directive',
      ruleType: it.rule_type || 'Prescriptive',
      policyApplicability: it.policy_applicability || 'Policy Applicable',
      statutoryLegalCitation: it.regulation_title || regShort,
      complianceStatus: it.compliance_status as ComplianceStatus,
      statutoryPenaltyNaira: Number(it.statutory_penalty_naira) || 0,
      matchedPolicySection: it.matched_policy_section || null,
      matchedPolicyText: it.matched_policy_text || null,
      suggestedStatus: it.compliance_status as ComplianceStatus,
      whatHappened: it.what_happened,
      whatToKnow: it.what_to_know,
      whatHasChanged: it.what_has_changed,
      whatToDo: it.what_to_do,
      draftReplacementLanguage: it.draft_remediation_clause || it.draft_replacement_language,
      draftReplacementPolicyLanguage: it.draft_remediation_clause || it.draft_replacement_language,
      statutoryQuote: it.statutory_quote || it.obligation_description || it.what_has_changed || null,
      complianceCriteria: Array.isArray(it.compliance_criteria)
        ? it.compliance_criteria
        : it.criteria_evaluations?.map((c: any) => c.criterionText || c) || [],
      criteriaEvaluations: it.criteria_evaluations || [],
      actionItems: it.action_items || [],
      suggestedActionItem: it.suggested_action_item,
      regulationTitle: it.regulation_title || regTitle,
      sourceSectionRef: it.source_section_ref || 'Not explicitly specified in source text',
      responsibleRole: it.responsible_role || 'Chief Compliance Officer',
      statutoryRemediationTimelineDays:
        typeof it.remediation_timeline_days === 'number' ? it.remediation_timeline_days : undefined,
      derivedInsight: it.derived_insight,
    }));

    const totalPenalty = items.reduce((sum: number, item: any) => sum + item.statutoryPenaltyNaira, 0);
    const adequateCount =
      evalRow.adequately_met_count ?? items.filter((i: any) => i.complianceStatus === 'ADEQUATELY_MET').length;
    const partialCount =
      evalRow.partially_met_count ?? items.filter((i: any) => i.complianceStatus === 'PARTIALLY_MET').length;
    const gapCount =
      evalRow.critical_gaps_count ?? items.filter((i: any) => i.complianceStatus === 'CRITICAL_GAP').length;

    return NextResponse.json({
      success: true,
      data: {
        evaluation: {
          id: evalRow.id,
          analysisName:
            evalRow.analysis_name || (evalRow.metadata as any)?.analysisName || `${regShort} vs ${policyTitle}`,
          regulationTitle: regTitle,
          regulationShortName: regShort,
          regulatorCode,
          benchmarkDocumentVersionId: evalRow.benchmark_document_version_id,
          policyId: evalRow.policy_id,
          policyTitle,
          department: policyDept,
          versionTag: policyVersion,
          regulationIds: regIds,
          policyIds: polIds,
          scope: evalRow.scope || (evalRow.metadata as any)?.scope || 'COMPLETE_REGULATORY_REVIEW',
          status: evalRow.status || 'IN_PROGRESS',
          overallCompliancePercentage: Number(evalRow.overall_compliance_percentage) || 0,
          obligationsAssessedCount: items.length,
          reviewPendingCount: partialCount + gapCount,
          closedCount: adequateCount,
          adequateCount,
          partialCount,
          gapCount,
          totalPenaltyNaira: totalPenalty,
          actionPlan: evalRow.action_plan || [],
          auditLogs: evalRow.audit_logs || [],
          comments: evalRow.comments || [],
          createdByName: evalRow.created_by_name || 'Authorized Compliance Officer',
          createdAt: evalRow.created_at,
          lastModifiedAt: evalRow.created_at,
        },
        items,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed retrieving single evaluation');
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}
