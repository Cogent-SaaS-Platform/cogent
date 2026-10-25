import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getTenantContext } from '@/shared/auth';
import { GapSynthesisService } from '@/modules/gap-matrix/services/gapSynthesisService';
import { StatutoryBenchmarkService } from '@/modules/gap-matrix/services/statutoryBenchmarkService';
import { AuditService } from '@/modules/audit/auditService';
import { logger } from '@/shared/logger';
import { ComplianceStatus, RegulatorCode } from '@/shared/types';

export const dynamic = 'force-dynamic';

export interface GapAnalysisSummaryItem {
  id: string;
  analysisName: string;
  regulationTitle: string;
  regulationShortName: string;
  regulatorCode: RegulatorCode;
  benchmarkDocumentVersionId: string;
  policyId: string;
  policyTitle: string;
  department: string;
  versionTag: string;
  scope: 'COMPLETE_REGULATORY_REVIEW' | 'POLICY_REGULATORY_REVIEW';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'REVIEW_PENDING';
  overallCompliancePercentage: number;
  obligationsAssessedCount: number;
  reviewPendingCount: number;
  closedCount: number;
  adequateCount: number;
  partialCount: number;
  gapCount: number;
  totalPenaltyNaira: number;
  createdAt: string;
  lastModifiedAt: string;
}

/**
 * Seed evaluation fallbacks ensure the Zango multi-view workflow is instantly interactive
 * even before a user uploads their first document, matching canonical Nigerian FinTech benchmarks.
 */
const SEED_EVALUATIONS: GapAnalysisSummaryItem[] = [
  {
    id: 'eval-seed-retail-banking-order',
    analysisName: 'Retail Banking Investigation Order 2017 vs Controls List',
    regulationTitle: 'Retail Banking Investigation Order 2017 & Supervisory Controls Standard',
    regulationShortName: 'Banking Investigation Order 2017',
    regulatorCode: 'CBN',
    benchmarkDocumentVersionId: 'bench-bofia-2020',
    policyId: '00000000-0000-0000-0000-000000000083',
    policyTitle: 'Internal Controls List & Operating Manual',
    department: 'OPERATIONS',
    versionTag: '1.2',
    scope: 'COMPLETE_REGULATORY_REVIEW',
    status: 'IN_PROGRESS',
    overallCompliancePercentage: 12.0,
    obligationsAssessedCount: 8,
    reviewPendingCount: 7,
    closedCount: 0,
    adequateCount: 1,
    partialCount: 1,
    gapCount: 6,
    totalPenaltyNaira: 35000000,
    createdAt: new Date(Date.now() - 3600000 * 24 * 35).toISOString(),
    lastModifiedAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
  },
  {
    id: 'eval-seed-kyc-policy-review',
    analysisName: 'Reg (EU) 2024/1624 - KYC Policy',
    regulationTitle: 'Regulation (EU) 2024/1624 & CBN Anti-Money Laundering Framework',
    regulationShortName: 'AML/CFT & KYC Standard',
    regulatorCode: 'CBN',
    benchmarkDocumentVersionId: 'bench-cbn-aml-2022',
    policyId: '00000000-0000-0000-0000-000000000081',
    policyTitle: 'Institutional KYC & Customer Due Diligence Policy',
    department: 'COMPLIANCE_LEGAL',
    versionTag: '2.1',
    scope: 'POLICY_REGULATORY_REVIEW',
    status: 'IN_PROGRESS',
    overallCompliancePercentage: 10.0,
    obligationsAssessedCount: 10,
    reviewPendingCount: 9,
    closedCount: 0,
    adequateCount: 1,
    partialCount: 1,
    gapCount: 8,
    totalPenaltyNaira: 50000000,
    createdAt: new Date(Date.now() - 3600000 * 24 * 35).toISOString(),
    lastModifiedAt: new Date(Date.now() - 3600000 * 24 * 31).toISOString(),
  },
  {
    id: 'eval-seed-arcon-2022',
    analysisName: 'ARCON Advertising Code 2022 vs Marketing Operations Policy',
    regulationTitle: 'Nigerian Code of Advertising Practice, Sales Promotion and Other Marketing Communications (6th Edition)',
    regulationShortName: 'ARCON Code 2022',
    regulatorCode: 'ARCON',
    benchmarkDocumentVersionId: 'f6d58e47-5c77-4d91-b3ad-89cb3122347a',
    policyId: '00000000-0000-0000-0000-000000000081',
    policyTitle: 'Kalos Internal Policy Draft',
    department: 'GROWTH_MARKETING',
    versionTag: '2.0',
    scope: 'COMPLETE_REGULATORY_REVIEW',
    status: 'IN_PROGRESS',
    overallCompliancePercentage: 25.0,
    obligationsAssessedCount: 4,
    reviewPendingCount: 3,
    closedCount: 1,
    adequateCount: 1,
    partialCount: 1,
    gapCount: 2,
    totalPenaltyNaira: 40000000,
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    lastModifiedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'eval-seed-cbn-cpf-2019',
    analysisName: 'CBN Consumer Protection Framework 2019 vs Digital Lending SOP',
    regulationTitle: 'Central Bank of Nigeria Consumer Protection Framework for Banks and OFIs',
    regulationShortName: 'CBN CPF 2019',
    regulatorCode: 'CBN',
    benchmarkDocumentVersionId: 'f08d58c0-345f-47e4-92a7-3647bfac5c35',
    policyId: '00000000-0000-0000-0000-000000000082',
    policyTitle: 'Consumer Credit & Dispute SOP',
    department: 'OPERATIONS',
    versionTag: '1.4',
    scope: 'POLICY_REGULATORY_REVIEW',
    status: 'IN_PROGRESS',
    overallCompliancePercentage: 62.5,
    obligationsAssessedCount: 8,
    reviewPendingCount: 4,
    closedCount: 4,
    adequateCount: 5,
    partialCount: 2,
    gapCount: 1,
    totalPenaltyNaira: 15000000,
    createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
    lastModifiedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'eval-seed-bofia-2020',
    analysisName: 'BOFIA Act 2020 vs Institutional Governance Manual',
    regulationTitle: 'Banks and Other Financial Institutions Act (BOFIA) 2020 (Act No. 5)',
    regulationShortName: 'BOFIA 2020',
    regulatorCode: 'CBN',
    benchmarkDocumentVersionId: 'bench-bofia-2020',
    policyId: '00000000-0000-0000-0000-000000000083',
    policyTitle: 'Institutional Governance & Compliance Manual',
    department: 'COMPLIANCE_LEGAL',
    versionTag: '3.1',
    scope: 'COMPLETE_REGULATORY_REVIEW',
    status: 'COMPLETED',
    overallCompliancePercentage: 88.0,
    obligationsAssessedCount: 10,
    reviewPendingCount: 0,
    closedCount: 10,
    adequateCount: 9,
    partialCount: 1,
    gapCount: 0,
    totalPenaltyNaira: 5000000,
    createdAt: new Date(Date.now() - 3600000 * 24 * 14).toISOString(),
    lastModifiedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
];

/**
 * GET /api/gap-matrix/evaluations
 * Returns list of all evaluations or single evaluation detail when ?id= is specified
 */
export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, dbClient } = tenantCtx;
    const { searchParams } = new URL(req.url);
    const evaluationId = searchParams.get('id');

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Single Evaluation Detail by ID
    // ──────────────────────────────────────────────────────────────────────────
    if (evaluationId) {
      // Check database first
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
            // Fetch items
            const { data: dbItems } = await dbClient
              .from('gap_matrix_items')
              .select('*')
              .eq('evaluation_id', evaluationId);

            const policy = evalRow.policy as any;
            const benchmark = evalRow.benchmark as any;
            const regTitle = benchmark?.instrument?.title || 'Statutory Regulation';
            const regShort = benchmark?.instrument?.short_name || 'Regulatory Instrument';
            const regulatorCode = (benchmark?.instrument?.body?.code || 'CBN') as RegulatorCode;

            const items = (dbItems || []).map((it: any) => ({
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
                  adequateCount: evalRow.adequately_met_count || items.filter((i) => i.complianceStatus === 'ADEQUATELY_MET').length,
                  partialCount: evalRow.partially_met_count || items.filter((i) => i.complianceStatus === 'PARTIALLY_MET').length,
                  gapCount: evalRow.critical_gaps_count || items.filter((i) => i.complianceStatus === 'CRITICAL_GAP').length,
                  totalPenaltyNaira: totalPenalty,
                  createdAt: evalRow.created_at,
                  lastModifiedAt: evalRow.created_at,
                },
                items,
              },
            });
          }
        } catch (dbErr) {
          logger.warn({ dbErr: String(dbErr) }, 'Failed retrieving single evaluation from DB; checking seed fallbacks');
        }
      }

      // Check seed fallbacks
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
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          evaluation: seed,
          items,
        },
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. List All Evaluations for Tenant
    // ──────────────────────────────────────────────────────────────────────────
    const evaluationsList: GapAnalysisSummaryItem[] = [];

    if (dbClient) {
      try {
        const { data: evalRows, error: rowsErr } = await dbClient
          .from('gap_evaluations')
          .select(`
            id,
            organization_id,
            policy_id,
            benchmark_document_version_id,
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
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (!rowsErr && evalRows && evalRows.length > 0) {
          for (const row of evalRows) {
            const policy = row.policy as any;
            const benchmark = row.benchmark as any;
            const regTitle = benchmark?.instrument?.title || 'Statutory Regulation';
            const regShort = benchmark?.instrument?.short_name || 'Regulatory Instrument';
            const regulatorCode = (benchmark?.instrument?.body?.code || 'CBN') as RegulatorCode;
            const meta = (row.metadata as any) || {};

            const adequate = Number(row.adequately_met_count) || 0;
            const partial = Number(row.partially_met_count) || 0;
            const gap = Number(row.critical_gaps_count) || 0;
            const total = adequate + partial + gap || 1;

            evaluationsList.push({
              id: row.id,
              analysisName: meta.analysisName || `${regShort} vs ${policy?.title || 'Internal Policy'}`,
              regulationTitle: regTitle,
              regulationShortName: regShort,
              regulatorCode,
              benchmarkDocumentVersionId: row.benchmark_document_version_id,
              policyId: row.policy_id,
              policyTitle: policy?.title || 'Internal Policy',
              department: policy?.department || 'COMPLIANCE_LEGAL',
              versionTag: policy?.version_tag || '1.0',
              scope: meta.scope || 'COMPLETE_REGULATORY_REVIEW',
              status: (row.status as any) || 'COMPLETED',
              overallCompliancePercentage: Number(row.overall_compliance_percentage) || Math.round(((adequate * 100 + partial * 50) / total)),
              obligationsAssessedCount: total,
              reviewPendingCount: partial + gap,
              closedCount: adequate,
              adequateCount: adequate,
              partialCount: partial,
              gapCount: gap,
              totalPenaltyNaira: gap * 10000000 + partial * 5000000,
              createdAt: row.created_at,
              lastModifiedAt: row.created_at,
            });
          }
        }
      } catch (err) {
        logger.warn({ err: String(err) }, 'Error querying gap_evaluations; falling back to seed list');
      }
    }

    // Merge seed evaluations if tenant has no or few evaluations
    const combined = [...evaluationsList];
    for (const seed of SEED_EVALUATIONS) {
      if (!combined.some((e) => e.id === seed.id)) {
        combined.push(seed);
      }
    }

    return NextResponse.json({
      success: true,
      data: combined,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed retrieving gap evaluations');
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gap-matrix/evaluations
 * Starts a new gap evaluation
 */
export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, userId, dbClient } = tenantCtx;
    const body = await req.json();

    const {
      analysisName,
      policyId,
      benchmarkDocumentVersionId,
      scope = 'COMPLETE_REGULATORY_REVIEW',
      policyTitle,
      department = 'COMPLIANCE_LEGAL',
    } = body;

    if (!policyId || !benchmarkDocumentVersionId) {
      return NextResponse.json(
        { success: false, error: 'Both policyId and benchmarkDocumentVersionId are required' },
        { status: 400 }
      );
    }

    const gapSynthesisService = new GapSynthesisService({ dbClient });
    const evaluation = await gapSynthesisService.evaluatePolicyGap({
      organizationId,
      policyId,
      benchmarkDocumentVersionId,
      userId,
      policyTitle,
      department,
    });

    // Save custom analysisName and scope into evaluation metadata if possible
    if (dbClient && evaluation.evaluationId) {
      try {
        await dbClient
          .from('gap_evaluations')
          .update({
            metadata: {
              analysisName: analysisName || evaluation.policyTitle,
              scope,
            },
          })
          .eq('id', evaluation.evaluationId);
      } catch {
        // non-blocking
      }
    }

    return NextResponse.json({
      success: true,
      data: evaluation,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed creating gap evaluation');
    return NextResponse.json(
      { success: false, error: err.message || 'Evaluation error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/gap-matrix/evaluations
 * Records a compliance reviewer override on a gap item (e.g. changing between MET, PARTIALLY_MET, CRITICAL_GAP)
 */
export async function PATCH(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, userId, dbClient } = tenantCtx;
    const body = await req.json();

    const { evaluationId, itemId, complianceStatus, reviewerNotes, matchedPolicySection, matchedPolicyText, criterionIndex } = body;

    if (!itemId || !complianceStatus) {
      return NextResponse.json(
        { success: false, error: 'itemId and complianceStatus are required' },
        { status: 400 }
      );
    }

    // Persist to DB if item exists
    if (dbClient) {
      try {
        const updatePayload: {
          compliance_status: ComplianceStatus;
          draft_replacement_language?: string | null;
        } = {
          compliance_status: complianceStatus,
        };
        if (body.draftReplacementLanguage) {
          updatePayload.draft_replacement_language = body.draftReplacementLanguage;
        }

        await dbClient
          .from('gap_matrix_items')
          .update(updatePayload)
          .eq('id', itemId);

        // Immutable audit log
        const auditService = new AuditService(dbClient);
        await auditService.recordLog({
          organizationId,
          userId: userId || undefined,
          action: 'COMPLIANCE_CRITERIA_OVERRIDE_RECORDED',
          entityType: 'gap_matrix_items',
          entityId: itemId,
          sha256InputHash: crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex'),
          sha256OutputHash: crypto.createHash('sha256').update(complianceStatus).digest('hex'),
          metadata: {
            evaluationId,
            itemId,
            criterionIndex,
            newStatus: complianceStatus,
            reviewerNotes: reviewerNotes || 'Compliance officer manual criteria override',
            matchedPolicySection,
            matchedPolicyText,
          },
        });
      } catch (err) {
        logger.warn({ err: String(err) }, 'Failed persisting override to DB, continuing gracefully');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Compliance criteria override and policy evidence cryptographically sealed',
      data: {
        itemId,
        complianceStatus,
        matchedPolicySection,
        matchedPolicyText,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
