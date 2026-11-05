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
    const { dbClient } = tenantCtx;

    if (!dbClient) {
      return NextResponse.json(
        { success: false, error: 'Database client unavailable' },
        { status: 500 }
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Fetch evaluation from Supabase database
    // ──────────────────────────────────────────────────────────────────────────
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
      .maybeSingle();

    if (evalErr || !evalRow) {
      if (evaluationId === 'eval-seed-bofia-2020') {
        const seedItem = {
          id: 'item-seed-bofia-01',
          evaluationId: 'eval-seed-bofia-2020',
          regulatoryClauseId: 'clause-bofia-64-1',
          obligationId: 'obl-bofia-64-1',
          obligationTitle: 'Biometric 2FA on High-Value Electronic Funds Settlement',
          obligationCode: 'BOFIA 2020 § 64(1)',
          obligationDescription: 'Mandatory dual-factor biometric authorization on transfers above ₦5,000,000.',
          regulatoryClauseReference: 'BOFIA 2020 § 64(1)',
          ruleType: 'Mandatory Control',
          policyApplicability: 'Directly Applicable',
          statutoryLegalCitation: 'BOFIA 2020 § 64(1)',
          complianceStatus: 'CRITICAL_GAP' as const,
          statutoryPenaltyNaira: 25000000,
          matchedPolicySection: 'Section 4.2 - Payment Authorizations',
          matchedPolicyText: 'High-value payments require standard dual-signoff without explicit biometric verification.',
          suggestedStatus: 'CRITICAL_GAP' as const,
          whatHappened: 'Internal payment policy permits token-only signoff exceeding statutory ₦5,000,000 threshold without biometric verification.',
          whatToKnow: 'CBN Bank Examiners treat lack of biometric gating as non-compliance under BOFIA 2020 § 64(1) with personal criminal director exposure.',
          whatHasChanged: 'Thresholds tightened from ₦10M to ₦5M, with mandatory biometric capture before settlement window closes.',
          whatToDo: 'Amend Section 4.2 of Credit & Payment Policy to mandate biometric 2FA for all transfers exceeding ₦5M.',
          draftReplacementLanguage: 'All electronic funds transfers exceeding ₦5,000,000 shall mandate dual-factor biometric verification prior to clearance and settlement.',
          draftReplacementPolicyLanguage: 'All electronic funds transfers exceeding ₦5,000,000 shall mandate dual-factor biometric verification prior to clearance and settlement.',
          statutoryQuote: 'Every licensed financial institution shall deploy dual-factor biometric verification on electronic funds transfers exceeding ₦5,000,000.',
          complianceCriteria: [
            'Biometric verification integrated on payment switch',
            'Immutable audit logging with 6-year retention',
          ],
          criteriaEvaluations: [
            { criterionText: 'Biometric verification integrated on payment switch', isMet: false },
            { criterionText: 'Immutable audit logging with 6-year retention', isMet: true },
          ],
          actionItems: [
            { text: 'Upgrade payment gateway for biometric capture', role: 'CTO', deadline: '2026-11-30' },
          ],
          suggestedActionItem: 'Incorporate biometric secondary authorization module.',
          regulationTitle: 'BOFIA 2020',
          sourceSectionRef: 'Section 64(1)',
          responsibleRole: 'Chief Technology Officer',
          statutoryRemediationTimelineDays: 30,
          derivedInsight: 'High statutory penalty exposure with potential director personal liability.',
        };

        return NextResponse.json({
          success: true,
          data: {
            evaluation: {
              id: 'eval-seed-bofia-2020',
              analysisName: 'BOFIA 2020 vs Institutional Lending & Capital Policy',
              regulationTitle: 'Banks and Other Financial Institutions Act (BOFIA) 2020',
              regulationShortName: 'BOFIA 2020',
              regulatorCode: 'CBN' as RegulatorCode,
              benchmarkDocumentVersionId: 'bench-bofia-2020-v1',
              policyId: 'pol-lending-capital-v1',
              policyTitle: 'Institutional Credit & Capital Adequacy Policy',
              policyDepartment: 'CREDIT_RISK',
              policyVersion: '2.4',
              scope: 'SECTION_BY_SECTION',
              status: 'COMPLETED',
              overallCompliancePercentage: 68.5,
              criticalGapsCount: 1,
              partiallyMetCount: 0,
              adequatelyMetCount: 0,
              totalPotentialPenaltyNaira: 25000000,
              actionPlan: 'Board policy amendment and operational risk provisioning required within 30 days.',
              auditLogs: [],
              comments: [],
              createdByName: 'Chief Compliance Officer',
              createdAt: '2026-10-01T08:00:00Z',
              metadata: {
                analysisName: 'BOFIA 2020 vs Institutional Lending & Capital Policy',
              },
            },
            items: [seedItem],
          },
        });
      }

      return NextResponse.json(
        { success: false, error: 'Gap analysis not found' },
        { status: 404 }
      );
    }

    // Fetch items
    const { data: dbItems, error: itemsErr } = await (dbClient.from('gap_matrix_items') as any)
      .select('*')
      .eq('evaluation_id', evaluationId)
      .order('created_at', { ascending: true });

    if (itemsErr) {
      logger.error({ err: itemsErr.message }, 'Failed fetching gap matrix items');
    }

    // Resolve regulation titles
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

    // Resolve policy titles
    const polIds = Array.isArray(evalRow.policy_ids) ? evalRow.policy_ids : [];
    let policyTitle = 'Internal Policy Manual';
    let policyDept = 'COMPLIANCE_LEGAL';
    let policyVersion = '1.0';

    if (polIds.length > 0) {
      const { data: pols } = await (dbClient.from('policy_documents') as any)
        .select('id, title, department, version_tag')
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
      obligationCode: it.obligation_code || 'OBL-CBN-001',
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
      statutoryQuote: it.statutory_quote || it.statutory_verbatim_quote || it.obligation_description || it.matched_policy_text || 'Statutory requirement quote',
      complianceCriteria: Array.isArray(it.compliance_criteria) ? it.compliance_criteria : (it.criteria_evaluations?.map((c: any) => c.criterionText || c) || []),
      criteriaEvaluations: it.criteria_evaluations || [],
      actionItems: it.action_items || [],
      suggestedActionItem: it.suggested_action_item,
      regulationTitle: it.regulation_title || regTitle,
      sourceSectionRef: it.source_section_ref || 'Section 1.0',
      responsibleRole: it.responsible_role || 'Chief Compliance Officer',
      statutoryRemediationTimelineDays: it.remediation_timeline_days || 14,
      derivedInsight: it.derived_insight,
    }));

    const totalPenalty = items.reduce((sum: number, item: any) => sum + item.statutoryPenaltyNaira, 0);
    const adequateCount = evalRow.adequately_met_count ?? items.filter((i: any) => i.complianceStatus === 'ADEQUATELY_MET').length;
    const partialCount = evalRow.partially_met_count ?? items.filter((i: any) => i.complianceStatus === 'PARTIALLY_MET').length;
    const gapCount = evalRow.critical_gaps_count ?? items.filter((i: any) => i.complianceStatus === 'CRITICAL_GAP').length;

    return NextResponse.json({
      success: true,
      data: {
        evaluation: {
          id: evalRow.id,
          analysisName: evalRow.analysis_name || (evalRow.metadata as any)?.analysisName || `${regShort} vs ${policyTitle}`,
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
