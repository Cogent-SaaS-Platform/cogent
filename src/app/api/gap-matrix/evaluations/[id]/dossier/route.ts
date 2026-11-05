import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getTenantContext } from '@/shared/auth';
import { defaultDossierExportService } from '@/modules/gap-matrix/services/dossierExportService';
import { EntitlementEngine } from '@/shared/billing';
import { logger } from '@/shared/logger';
import { ComplianceStatus, RegulatorCode } from '@/shared/types';
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
    EntitlementEngine.assertEngineActive(tenantCtx.subscription, '5-W Gap Matrix Audit Defense Dossier export');

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty
    }

    const { organizationName, ccoName, notes } = body;
    const { dbClient } = tenantCtx;

    if (!dbClient) {
      return NextResponse.json(
        { success: false, error: 'Database client unavailable' },
        { status: 500 }
      );
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
      .maybeSingle();

    if (evalErr || !evalRow) {
      if (evaluationId === 'eval-seed-bofia-2020') {
        const seedEvaluationResult: GapEvaluationResult = {
          evaluationId: 'eval-seed-bofia-2020',
          organizationId: tenantCtx.organizationId || '00000000-0000-0000-0000-000000000001',
          policyId: 'pol-lending-capital-v1',
          benchmarkDocumentVersionId: 'bench-bofia-2020-v1',
          overallCompliancePercentage: 68.5,
          criticalGapsCount: 1,
          partiallyMetCount: 0,
          adequatelyMetCount: 0,
          totalPotentialPenaltyNaira: 25000000,
          items: [
            {
              id: 'item-seed-bofia-01',
              regulatoryClauseId: 'clause-bofia-64-1',
              obligationId: 'obl-bofia-64-1',
              policyClauseId: 'pol-clause-4-2',
              complianceStatus: 'CRITICAL_GAP' as const,
              statutoryPenaltyNaira: 25000000,
              regulatoryClauseReference: 'BOFIA 2020 § 64(1)',
              statutoryLegalCitation: 'BOFIA 2020',
              matchedPolicySection: 'Section 4.2 - Payment Authorizations',
              matchedPolicyText: 'High-value payments require standard dual-signoff without explicit biometric verification.',
              suggestedStatus: 'CRITICAL_GAP' as const,
              whatHappened: 'Internal payment policy permits token-only signoff exceeding statutory ₦5,000,000 threshold without biometric verification.',
              whatToKnow: 'CBN Bank Examiners treat lack of biometric gating as non-compliance under BOFIA 2020 § 64(1) with personal criminal director exposure.',
              whatHasChanged: 'Thresholds tightened from ₦10M to ₦5M, with mandatory biometric capture before settlement window closes.',
              whatToDo: 'Amend Section 4.2 of Credit & Payment Policy to mandate biometric 2FA for all transfers exceeding ₦5M.',
              draftReplacementLanguage: 'All electronic funds transfers exceeding ₦5,000,000 shall mandate dual-factor biometric verification prior to clearance and settlement.',
              derivedInsight: 'High statutory penalty exposure with potential director personal liability.',
              responsibleRole: 'Chief Technology Officer',
              statutoryRemediationTimelineDays: 30,
              statutoryQuote: 'Every licensed financial institution shall deploy dual-factor biometric verification on electronic funds transfers exceeding ₦5,000,000.',
              policyEvidenceQuote: 'High-value payments require standard dual-signoff without explicit biometric verification.',
              characterSpanStart: null,
              characterSpanEnd: null,
              complianceCriteria: [
                'Biometric verification integrated on payment switch',
                'Immutable audit logging with 6-year retention',
              ],
              assessment: 'High statutory penalty exposure with potential director personal liability.',
            },
          ],
          policyTitle: 'Institutional Credit & Capital Adequacy Policy',
          benchmarkTitle: 'Banks and Other Financial Institutions Act (BOFIA) 2020',
          executiveSummary: 'Deterministic statutory concordance review for BOFIA 2020. Total identified penalty exposure: ₦25,000,000.',
          analysisRunId: null,
          auditId: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };

        const dossier = defaultDossierExportService.generateDossier({
          evaluationResult: seedEvaluationResult,
          organizationName: organizationName || 'First Digital FinTech Ltd',
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
      }

      return NextResponse.json(
        { success: false, error: 'Evaluation not found' },
        { status: 404 }
      );
    }

    const { data: dbItems } = await (dbClient.from('gap_matrix_items') as any)
      .select('*')
      .eq('evaluation_id', evaluationId)
      .order('created_at', { ascending: true });

    // Fetch regulation title
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

    // Fetch policy title
    const polIds = Array.isArray(evalRow.policy_ids) ? evalRow.policy_ids : [];
    let policyTitle = 'Internal Policy Manual';
    let policyDept = 'COMPLIANCE_LEGAL';
    let policyVersion = '1.0';
    if (polIds.length > 0) {
      const { data: pols } = await (dbClient.from('policy_documents') as any)
        .select('title, department, version_tag')
        .in('id', polIds);
      if (pols && pols.length > 0) {
        policyTitle = pols.map((p: any) => p.title).join(', ');
        policyDept = pols[0].department || 'COMPLIANCE_LEGAL';
        policyVersion = pols[0].version_tag || '1.0';
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
      statutoryRemediationTimelineDays: it.remediation_timeline_days || 14,
      statutoryQuote: it.obligation_description || null,
      policyEvidenceQuote: it.matched_policy_text || null,
      characterSpanStart: null,
      characterSpanEnd: null,
      complianceCriteria: it.criteria_evaluations?.map((c: any) => c.criterionText) || [],
      assessment: it.derived_insight || null,
    }));

    const totalPenalty = evaluatedItems.reduce((sum: number, item: any) => sum + item.statutoryPenaltyNaira, 0);

    const evaluationResult: GapEvaluationResult = {
      evaluationId: evalRow.id,
      organizationId: evalRow.organization_id,
      policyId: evalRow.policy_id,
      benchmarkDocumentVersionId: evalRow.benchmark_document_version_id,
      overallCompliancePercentage: Number(evalRow.overall_compliance_percentage) || 0,
      criticalGapsCount: evalRow.critical_gaps_count ?? evaluatedItems.filter((i: any) => i.complianceStatus === 'CRITICAL_GAP').length,
      partiallyMetCount: evalRow.partially_met_count ?? evaluatedItems.filter((i: any) => i.complianceStatus === 'PARTIALLY_MET').length,
      adequatelyMetCount: evalRow.adequately_met_count ?? evaluatedItems.filter((i: any) => i.complianceStatus === 'ADEQUATELY_MET').length,
      totalPotentialPenaltyNaira: totalPenalty,
      items: evaluatedItems,
      policyTitle,
      benchmarkTitle: regTitle,
      executiveSummary: `Deterministic statutory concordance review for ${regTitle}. Total identified penalty exposure: ₦${totalPenalty.toLocaleString('en-NG')}.`,
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
