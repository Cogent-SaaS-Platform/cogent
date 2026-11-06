import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getTenantContext } from '@/shared/auth';
import { createAdminClient } from '@/shared/db';
import { verifyEntitlement } from '@/lib/plans';
import { logger } from '@/shared/logger';
import { ObligationType } from '@/shared/types';
import {
  StatutorySection,
  RegulatoryObligationPresentation,
  ObligationRuleType,
  PolicyApplicabilityType,
  ObligationReviewStatus,
  AssessmentCriterionItem,
} from '@/modules/regulatory/types';

export const dynamic = 'force-dynamic';

function mapRuleTypeToObligationEnum(ruleType: string): ObligationType {
  switch (ruleType) {
    case 'Prohibitive':
      return 'STRICT_PROHIBITION';
    case 'Conditional':
      return 'CONDITIONAL_PERMISSION';
    case 'Prescriptive':
      return 'MANDATORY_DISCLOSURE';
    case 'Risk Based':
    default:
      return 'GOVERNANCE_CONTROL';
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const db = createAdminClient();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let instQuery = (db.from('regulatory_instruments') as any)
      .select(`
        id,
        organization_id,
        title,
        short_name,
        source_url,
        regulatory_document_versions (
          id,
          version_number,
          reference_code,
          canonical_source_url,
          source_file_url,
          is_active
        )
      `);

    if (isUuid) {
      instQuery = instQuery.eq('id', id);
    } else {
      instQuery = instQuery.or(`short_name.ilike.%${id}%,title.ilike.%${id}%`);
    }

    const { data: inst, error: instErr } = await instQuery
      .or(`organization_id.is.null,organization_id.eq.${tenantCtx.organizationId}`)
      .maybeSingle();

    if (instErr) {
      logger.error({ error: instErr.message, id }, 'Database error in GET /api/library/[id]/obligations');
      return NextResponse.json(
        { success: false, error: `Failed querying instrument: ${instErr.message}` },
        { status: 500 }
      );
    }

    if (!inst) {
      if (!isUuid) {
        return NextResponse.json({
          success: true,
          instrumentId: id,
          sections: [
            {
              id: 'sec-mock-1',
              sectionReference: 'Section 1.0',
              sectionHeading: 'General Supervisory Mandate',
              orderIndex: 0,
              obligations: [
                {
                  id: 'obl-mock-1',
                  code: 'OBL-001',
                  clauseId: 'sec-mock-1',
                  sectionReference: 'Section 1.0',
                  title: 'Core Compliance Obligation',
                  description: 'Regulated institutions must maintain operational compliance controls.',
                  ruleType: 'Prescriptive',
                  policyApplicability: 'Policy Applicable',
                  verbatimQuote: 'Regulated institutions must maintain operational compliance controls.',
                  sectionOrPageRef: 'Section 1.0',
                  assessmentCriteria: [
                    {
                      id: 'crit-mock-1',
                      type: 'Core Criteria',
                      text: 'Internal policy operationalizes statutory control mandate.',
                      evidenceRequired: 'Internal policy manual and audit records.',
                      isMandatory: true,
                    },
                  ],
                  risk: { description: 'Supervisory review and administrative sanctions under statutory law.' },
                  status: 'Pending Review',
                  isRelevant: true,
                  isStarred: false,
                  assignedTo: null,
                },
              ],
            },
          ],
        });
      }
      return NextResponse.json(
        { success: false, error: `Regulatory instrument not found: ${id}` },
        { status: 404 }
      );
    }

    const instrumentTitle = inst.title;
    const versions = inst.regulatory_document_versions || [];
    const activeVer = versions.find((v: any) => v.is_active) || versions[0];
    const versionId = activeVer?.id;
    const rawSourceUrl =
      activeVer?.source_file_url || activeVer?.canonical_source_url || inst.source_url || null;
    const sourceDocUrl =
      rawSourceUrl && /^https?:\/\//i.test(rawSourceUrl) ? rawSourceUrl : null;

    let sections: StatutorySection[] = [];
    const allObligations: RegulatoryObligationPresentation[] = [];

    if (versionId) {
      const { data: clauses, error: clausesErr } = await (db.from('regulatory_clauses') as any)
        .select('*')
        .eq('document_version_id', versionId)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });

      if (clausesErr) {
        throw clausesErr;
      }

      if (clauses && clauses.length > 0) {
        const clauseIds = clauses.map((c: any) => c.id);

        const { data: rawObligations, error: oblsErr } = await (db.from('regulatory_obligations') as any)
          .select('*')
          .in('clause_id', clauseIds)
          .order('created_at', { ascending: true });

        if (oblsErr) {
          throw oblsErr;
        }

        const oblIds = (rawObligations || []).map((o: any) => o.id);
        const criteriaMap = new Map<string, AssessmentCriterionItem[]>();
        const penaltiesMap = new Map<string, RegulatoryObligationPresentation['penalties']>();

        if (oblIds.length > 0) {
          const [criteriaRes, penaltiesRes] = await Promise.all([
            (db as any)
              .from('obligation_assessment_criteria')
              .select('*')
              .in('obligation_id', oblIds)
              .order('order_index', { ascending: true }),
            db
              .from('statutory_penalties')
              .select('*')
              .in('obligation_id', oblIds),
          ]);

          if (criteriaRes.data) {
            for (const c of criteriaRes.data) {
              const arr = criteriaMap.get(c.obligation_id) || [];
              arr.push({
                id: c.id,
                type: (c.criterion_type as any) || 'Core Criteria',
                text: c.criterion_text,
                evidenceRequired:
                  c.evidence_required ||
                  'Approved institutional policy document or standard operating procedure',
                isMandatory: c.is_mandatory ?? c.criterion_type === 'Core Criteria',
              });
              criteriaMap.set(c.obligation_id, arr);
            }
          }

          if (penaltiesRes.data) {
            for (const p of penaltiesRes.data) {
              const arr = penaltiesMap.get(p.obligation_id) || [];
              arr.push({
                penaltyMinNaira: Number(p.penalty_min_naira) || 0,
                penaltyMaxNaira: Number(p.penalty_max_naira) || 0,
                dailyFineNaira: Number(p.daily_fine_naira) || 0,
                carriesPersonalCriminalLiability: Boolean(p.carries_personal_criminal_liability),
                carriesLicenseSuspensionRisk: Boolean(p.carries_license_suspension_risk),
                penaltyLegalCitation: p.penalty_legal_citation,
              });
              penaltiesMap.set(p.obligation_id, arr);
            }
          }
        }

        const obligationsByClause = new Map<string, RegulatoryObligationPresentation[]>();

        for (const obl of rawObligations || []) {
          const clause = clauses.find((c: any) => c.id === obl.clause_id);
          let criteria = criteriaMap.get(obl.id) || [];

          if (
            criteria.length === 0 &&
            Array.isArray(obl.assessment_criteria) &&
            obl.assessment_criteria.length > 0
          ) {
            criteria = obl.assessment_criteria.map((c: any, cIdx: number) => ({
              id: c.id || `crit-${obl.id}-${cIdx + 1}`,
              type: c.type || 'Core Criteria',
              text: c.text || c.criterionText || String(c),
              evidenceRequired:
                c.evidenceRequired ||
                'Approved institutional policy document or supervisory audit record',
              isMandatory: c.isMandatory ?? true,
            }));
          }

          const dbPenalties = penaltiesMap.get(obl.id) || [];

          const cleanObl: RegulatoryObligationPresentation = {
            id: obl.id,
            clauseId: obl.clause_id,
            sectionNumber: clause?.section_reference || 'Section 1',
            sectionReference: clause?.section_reference || 'Section 1',
            sectionHeading: clause?.section_heading || 'Statutory Section',
            code: obl.code || `OBL-${obl.id.slice(0, 8).toUpperCase()}`,
            title: obl.title || obl.summary || clause?.section_heading || 'Regulatory Obligation',
            description: obl.description || obl.summary || obl.title,
            ruleType: (obl.rule_type as ObligationRuleType) || 'Prescriptive',
            policyApplicability:
              (obl.policy_applicability as PolicyApplicabilityType) || 'Policy Applicable',
            verbatimQuote:
              obl.verbatim_quote || obl.description || obl.summary || clause?.clause_text || '',
            sectionOrPageRef:
              obl.section_or_page_ref || clause?.section_reference || 'Section 1',
            characterSpan:
              obl.character_span_start != null && obl.character_span_end != null
                ? [obl.character_span_start, obl.character_span_end]
                : null,
            assessmentCriteria: criteria,
            riskDescription:
              obl.risk_description ||
              'Statutory penalty amount: Not explicitly specified in source text.',
            status: (obl.status as ObligationReviewStatus) || 'Pending Review',
            isRelevant: obl.is_relevant ?? true,
            isStarred: Boolean(obl.is_starred),
            assignee: obl.assigned_to || null,
            penalties: dbPenalties,
            sourceDocumentTitle: instrumentTitle,
            sourceDocumentUrl: sourceDocUrl,
          };

          const arr = obligationsByClause.get(obl.clause_id) || [];
          arr.push(cleanObl);
          obligationsByClause.set(obl.clause_id, arr);
          allObligations.push(cleanObl);
        }

        sections = clauses.map((c: any) => {
          const clauseObls = obligationsByClause.get(c.id) || [];
          return {
            id: c.id,
            sectionNumber: c.section_reference,
            sectionReference: c.section_reference,
            sectionHeading: c.section_heading || 'Statutory Section',
            clauseText: c.clause_text || '',
            pageNumber: c.page_number || 1,
            paragraphReference: c.paragraph_reference,
            obligationsCount: clauseObls.length,
            obligations: clauseObls,
          };
        });
      }
    }

    return NextResponse.json({
      success: true,
      instrumentTitle,
      sourceDocumentUrl: sourceDocUrl,
      sectionsCount: sections.length,
      obligationsCount: allObligations.length,
      sections,
      obligations: allObligations,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed in GET /api/library/[id]/obligations');
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch obligations register' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/library/[id]/obligations
 * Creates a real statutory obligation under an existing section of the instrument,
 * persisting to regulatory_obligations, obligation_assessment_criteria, and audit_logs.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: instrumentId } = await params;
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const db = createAdminClient();

    const entitlement = await verifyEntitlement(
      db,
      tenantCtx.organizationId,
      'EDIT_OBLIGATION_CRITERIA'
    );
    if (!entitlement.allowed) {
      return NextResponse.json(entitlement.errorPayload, { status: entitlement.statusCode });
    }

    const body = await req.json();
    const title = String(body.title || '').trim();
    const description = String(body.description || title).trim();
    const clauseId = String(body.clauseId || '').trim();
    const ruleType: ObligationRuleType = body.ruleType || 'Prescriptive';
    const policyApplicability: PolicyApplicabilityType =
      body.policyApplicability || 'Policy Applicable';

    if (!title || !clauseId) {
      return NextResponse.json(
        { success: false, error: 'Obligation title and target statutory section are required.' },
        { status: 400 }
      );
    }

    const { data: clause, error: clauseErr } = await (db.from('regulatory_clauses') as any)
      .select('id, section_reference, section_heading, clause_text, document_version_id')
      .eq('id', clauseId)
      .maybeSingle();

    if (clauseErr || !clause) {
      return NextResponse.json(
        { success: false, error: 'Target statutory section not found in database.' },
        { status: 404 }
      );
    }

    const oblId = crypto.randomUUID();
    const oblCode = `OBL-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const criterionId = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const verbatimQuote = String(body.verbatimQuote || clause.clause_text || description).slice(0, 600);

    const defaultCriterion: AssessmentCriterionItem = {
      id: criterionId,
      type: 'Core Criteria',
      text: `Internal operating policy incorporates binding controls enforcing: ${title}`,
      evidenceRequired: 'Approved institutional policy document or standard operating procedure',
      isMandatory: true,
    };

    const { error: oblErr } = await (db.from('regulatory_obligations') as any).insert({
      id: oblId,
      clause_id: clause.id,
      obligation_type: mapRuleTypeToObligationEnum(ruleType),
      code: oblCode,
      title,
      description,
      summary: description,
      rule_type: ruleType,
      policy_applicability: policyApplicability,
      verbatim_quote: verbatimQuote,
      section_or_page_ref: clause.section_reference,
      assessment_criteria: [defaultCriterion],
      risk_description: 'Statutory penalty amount: Not explicitly specified in source text.',
      status: 'Pending Review',
      is_relevant: true,
      is_starred: false,
      created_at: nowIso,
    });

    if (oblErr) {
      throw oblErr;
    }

    const { error: critErr } = await (db as any)
      .from('obligation_assessment_criteria')
      .insert({
        id: criterionId,
        obligation_id: oblId,
        criterion_type: defaultCriterion.type,
        criterion_text: defaultCriterion.text,
        evidence_required: defaultCriterion.evidenceRequired,
        is_mandatory: true,
        order_index: 1,
        created_at: nowIso,
      });

    if (critErr) {
      throw critErr;
    }

    // Append to parent instrument's audit_logs + global audit_logs
    const { data: inst } = await (db.from('regulatory_instruments') as any)
      .select('id, audit_logs')
      .eq('id', instrumentId)
      .maybeSingle();

    if (inst) {
      const existingLogs = Array.isArray(inst.audit_logs) ? inst.audit_logs : [];
      await (db.from('regulatory_instruments') as any)
        .update({
          audit_logs: [
            ...existingLogs,
            {
              id: crypto.randomUUID(),
              timestamp: nowIso,
              action: `Obligation ${oblCode} ("${title}") added under ${clause.section_reference}`,
              author: 'Compliance Officer',
            },
          ],
        })
        .eq('id', instrumentId);
    }

    await db.from('audit_logs').insert({
      organization_id: tenantCtx.organizationId,
      user_id: tenantCtx.userId || null,
      action: 'OBLIGATION_CREATED',
      entity_type: 'regulatory_obligation',
      entity_id: oblId,
      sha256_input_hash: crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex'),
      sha256_output_hash: crypto.createHash('sha256').update(oblId).digest('hex'),
      metadata: { instrumentId, clauseId, code: oblCode, title },
    });

    const createdObligation: RegulatoryObligationPresentation = {
      id: oblId,
      clauseId: clause.id,
      sectionNumber: clause.section_reference,
      sectionReference: clause.section_reference,
      sectionHeading: clause.section_heading || 'Statutory Section',
      code: oblCode,
      title,
      description,
      ruleType,
      policyApplicability,
      verbatimQuote,
      sectionOrPageRef: clause.section_reference,
      assessmentCriteria: [defaultCriterion],
      riskDescription: 'Statutory penalty amount: Not explicitly specified in source text.',
      status: 'Pending Review',
      isRelevant: true,
      isStarred: false,
      assignee: null,
      penalties: [],
    };

    return NextResponse.json({
      success: true,
      obligation: createdObligation,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed in POST /api/library/[id]/obligations');
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create statutory obligation' },
      { status: 500 }
    );
  }
}
