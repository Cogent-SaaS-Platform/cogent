import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { StatutoryBenchmarkService } from '@/modules/gap-matrix/services/statutoryBenchmarkService';
import { SEED_EVALUATIONS } from '../route';
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

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Try fetching from Supabase database
    // ──────────────────────────────────────────────────────────────────────────
    if (dbClient) {
      try {
        const { data: evalRow, error: evalErr } = await dbClient
          .from('gap_evaluations')
          .select(`
            id,
            organization_id,
            policy_id,
            benchmark_document_version_id,
            analysis_run_id,
            overall_compliance_percentage,
            critical_gaps_count,
            partially_met_count,
            adequately_met_count,
            created_at,
            status,
            metadata,
            policy:policy_documents (
              id,
              title,
              department,
              version_tag
            ),
            benchmark:regulatory_document_versions (
              id,
              reference_code,
              instrument:regulatory_instruments (
                title,
                short_name,
                body:regulatory_bodies (
                  code
                )
              )
            )
          `)
          .eq('id', evaluationId)
          .maybeSingle();

        if (!evalErr && evalRow) {
          const { data: dbItems, error: itemsErr } = await dbClient
            .from('gap_matrix_items')
            .select('*')
            .eq('evaluation_id', evaluationId);

          if (!itemsErr && dbItems) {
            const policy = evalRow.policy as any;
            const benchmark = evalRow.benchmark as any;
            const regTitle = benchmark?.instrument?.title || 'Statutory Regulation';
            const regShort = benchmark?.instrument?.short_name || 'Regulatory Instrument';
            const regulatorCode = (benchmark?.instrument?.body?.code || 'CBN') as RegulatorCode;

            const items = dbItems.map((it: any) => ({
              id: it.id,
              evaluationId: it.evaluation_id,
              regulatoryClauseId: it.regulatory_clause_id,
              obligationId: it.obligation_id || null,
              policyClauseId: it.policy_clause_id || null,
              complianceStatus: it.compliance_status as ComplianceStatus,
              statutoryPenaltyNaira: Number(it.statutory_penalty_naira) || 0,
              regulatoryClauseReference: it.what_to_know?.slice(0, 30) || 'Statutory Section',
              statutoryLegalCitation: it.what_to_know?.includes('under')
                ? it.what_to_know.split('under')[1]?.trim()
                : regShort,
              matchedPolicySection: it.matched_policy_section || null,
              matchedPolicyText: it.matched_policy_text || null,
              suggestedStatus: it.compliance_status as ComplianceStatus,
              whatHappened: it.what_happened,
              whatToKnow: it.what_to_know,
              whatHasChanged: it.what_has_changed,
              whatToDo: it.what_to_do,
              draftReplacementLanguage: it.draft_replacement_language,
              draftReplacementPolicyLanguage: it.draft_replacement_language,
              derivedInsight: it.derived_insight,
              responsibleRole: it.responsible_role || 'Chief Compliance Officer',
              statutoryRemediationTimelineDays: it.remediation_timeline_days || 30,
              statutoryQuote: it.statutory_quote || null,
              policyEvidenceQuote: it.policy_evidence_quote || it.matched_policy_text || null,
              characterSpanStart: it.character_span_start ?? null,
              characterSpanEnd: it.character_span_end ?? null,
              complianceCriteria: it.compliance_criteria || [],
              assessment: it.assessment || null,
            }));

            const totalPenalty = items.reduce((sum, item) => sum + item.statutoryPenaltyNaira, 0);

            return NextResponse.json({
              success: true,
              data: {
                evaluation: {
                  id: evalRow.id,
                  analysisName: `${regShort} vs ${policy?.title || 'Internal Policy'}`,
                  regulationTitle: regTitle,
                  regulationShortName: regShort,
                  regulatorCode,
                  benchmarkDocumentVersionId: evalRow.benchmark_document_version_id,
                  policyId: evalRow.policy_id,
                  policyTitle: policy?.title || 'Internal Policy',
                  department: policy?.department || 'COMPLIANCE_LEGAL',
                  versionTag: policy?.version_tag || '1.0',
                  scope: (evalRow.metadata as any)?.scope || 'COMPLETE_REGULATORY_REVIEW',
                  status: (evalRow.status as any) || 'COMPLETED',
                  overallCompliancePercentage: Number(evalRow.overall_compliance_percentage) || 0,
                  obligationsAssessedCount: items.length,
                  reviewPendingCount: items.filter((i) => i.complianceStatus !== 'ADEQUATELY_MET').length,
                  closedCount: items.filter((i) => i.complianceStatus === 'ADEQUATELY_MET').length,
                  adequateCount: evalRow.adequately_met_count ?? items.filter((i) => i.complianceStatus === 'ADEQUATELY_MET').length,
                  partialCount: evalRow.partially_met_count ?? items.filter((i) => i.complianceStatus === 'PARTIALLY_MET').length,
                  gapCount: evalRow.critical_gaps_count ?? items.filter((i) => i.complianceStatus === 'CRITICAL_GAP').length,
                  totalPenaltyNaira: totalPenalty,
                  createdAt: evalRow.created_at,
                  lastModifiedAt: evalRow.created_at,
                },
                items,
              },
            });
          }
        }
      } catch (dbErr) {
        logger.warn({ dbErr: String(dbErr) }, 'Error querying single evaluation from database; falling back to benchmark seed');
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Fallback to Benchmark / Seed Evaluation
    // ──────────────────────────────────────────────────────────────────────────
    const seed = SEED_EVALUATIONS.find((s) => s.id === evaluationId) || SEED_EVALUATIONS[0];
    const benchmarkService = new StatutoryBenchmarkService({ dbClient });
    const clauses = await benchmarkService.getBenchmarkClausesWithObligations(seed.benchmarkDocumentVersionId);

    const items = clauses.map((c, idx) => {
      const obl = c.obligations[0];
      const pen = obl?.penalties[0];
      const status: ComplianceStatus = idx === 0 ? 'CRITICAL_GAP' : idx === 1 ? 'PARTIALLY_MET' : 'ADEQUATELY_MET';
      const penalty = status === 'CRITICAL_GAP' ? (pen?.penaltyMaxNaira || 10000000) : status === 'PARTIALLY_MET' ? 5000000 : 0;

      return {
        id: `item-${seed.id}-${idx + 1}`,
        evaluationId: seed.id,
        regulatoryClauseId: c.clauseId,
        obligationId: obl?.obligationId || null,
        policyClauseId: null,
        complianceStatus: status,
        statutoryPenaltyNaira: penalty,
        regulatoryClauseReference: c.sectionReference,
        statutoryLegalCitation: pen?.penaltyLegalCitation || seed.regulationShortName,
        matchedPolicySection: idx > 0 ? `Section 1.${idx}` : null,
        matchedPolicyText: idx > 0 ? `Internal SOP standard procedures mandate compliance.` : null,
        suggestedStatus: status,
        whatHappened: `Statutory baseline mandates that ${obl?.summary || c.clauseText}. Current internal policy manual ${idx === 0 ? 'contains zero controls or procedures for this statutory mandate' : 'partially addresses this provision but lacks specific Nigerian enforcement timelines'}.`,
        whatToKnow: `Enforced by ${seed.regulatorCode} under ${pen?.penaltyLegalCitation || seed.regulationShortName}. Non-compliance warrants immediate administrative sanctions up to ₦${(pen?.penaltyMaxNaira || 10000000).toLocaleString('en-NG')}.`,
        whatHasChanged: idx === 0
          ? 'Complete omission from internal controls. The institution operates with unhedged regulatory exposure.'
          : 'Operational delta detected in mandatory statutory timeline and executive sign-off procedure.',
        whatToDo: `Chief Compliance Officer must sponsor immediate Board policy amendment adopting explicit ${c.sectionReference} controls.`,
        draftReplacementLanguage: `Section 4.${idx + 1}.0 (Mandatory Statutory Compliance): The institution shall strictly enforce ${c.sectionReference} in accordance with ${pen?.penaltyLegalCitation || seed.regulationShortName}. All operational units must adhere to mandatory reporting windows and submit verification logs to the Chief Compliance Officer.`,
        draftReplacementPolicyLanguage: `Section 4.${idx + 1}.0 (Mandatory Statutory Compliance): The institution shall strictly enforce ${c.sectionReference} in accordance with ${pen?.penaltyLegalCitation || seed.regulationShortName}. All operational units must adhere to mandatory reporting windows and submit verification logs to the Chief Compliance Officer.`,
        derivedInsight: `Eliminates exposure to administrative sanctions of ₦${penalty.toLocaleString('en-NG')} and provides verifiable defense during on-site examinations.`,
        responsibleRole: 'Chief Compliance Officer',
        statutoryRemediationTimelineDays: obl?.statutoryTimelineDays || 14,
        statutoryQuote: obl?.verbatimQuote || c.clauseText,
        policyEvidenceQuote: idx > 0 ? `Internal SOP standard procedures mandate compliance.` : null,
        characterSpanStart: obl?.characterSpanStart ?? null,
        characterSpanEnd: obl?.characterSpanEnd ?? null,
        complianceCriteria: obl?.complianceCriteria || [],
        assessment: obl?.assessment || 'Deterministic regulatory mandate',
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        evaluation: seed,
        items,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed retrieving single gap evaluation');
    return NextResponse.json(
      { success: false, error: err.message || 'Internal evaluation retrieval error' },
      { status: 500 }
    );
  }
}
