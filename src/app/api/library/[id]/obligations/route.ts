import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/shared/db';
import { logger } from '@/shared/logger';
import { REGULATORY_INSTRUMENTS_SEED } from '@/shared/db/regulatoryCorpusData';
import {
  StatutorySection,
  RegulatoryObligationPresentation,
  ObligationRuleType,
  PolicyApplicabilityType,
  ObligationReviewStatus,
  AssessmentCriterionItem,
} from '@/modules/regulatory/types';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createAdminClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let sections: StatutorySection[] = [];
    let allObligations: RegulatoryObligationPresentation[] = [];
    let instrumentTitle = 'Regulatory Instrument';
    let sourceDocUrl: string | null = null;

    if (isUuid) {
      // 1. Fetch instrument and document version
      const { data: inst } = await (db.from('regulatory_instruments') as any)
        .select(`
          id,
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
        `)
        .eq('id', id)
        .maybeSingle();

      if (inst) {
        instrumentTitle = inst.title;
        const versions = inst.regulatory_document_versions || [];
        const activeVer = versions.find((v: any) => v.is_active) || versions[0];
        const versionId = activeVer?.id;
        sourceDocUrl = activeVer?.source_file_url || activeVer?.canonical_source_url || inst.source_url || null;

        if (versionId) {
          // 2. Query sections from regulatory_clauses
          const { data: clauses } = await (db.from('regulatory_clauses') as any)
            .select('*')
            .eq('document_version_id', versionId)
            .order('order_index', { ascending: true })
            .order('created_at', { ascending: true });

          if (clauses && clauses.length > 0) {
            const clauseIds = clauses.map((c: any) => c.id);

            // 3. Query obligations from regulatory_obligations
            const { data: rawObligations } = await (db.from('regulatory_obligations') as any)
              .select('*')
              .in('clause_id', clauseIds)
              .order('created_at', { ascending: true });

            // 4. Query criteria from obligation_assessment_criteria
            const oblIds = (rawObligations || []).map((o: any) => o.id);
            const criteriaMap = new Map<string, AssessmentCriterionItem[]>();

            if (oblIds.length > 0) {
              const { data: rawCriteria } = await (db as any)
                .from('obligation_assessment_criteria')
                .select('*')
                .in('obligation_id', oblIds)
                .order('order_index', { ascending: true });

              if (rawCriteria) {
                for (const c of rawCriteria) {
                  const arr = criteriaMap.get(c.obligation_id) || [];
                  arr.push({
                    id: c.id,
                    type: (c.criterion_type as any) || 'Core Criteria',
                    text: c.criterion_text,
                    evidenceRequired: c.evidence_required || 'Approved institutional policy document or standard operating procedure',
                    isMandatory: c.is_mandatory ?? true,
                  });
                  criteriaMap.set(c.obligation_id, arr);
                }
              }
            }

            // Map obligations by clauseId
            const obligationsByClause = new Map<string, RegulatoryObligationPresentation[]>();

            for (const obl of rawObligations || []) {
              const clause = clauses.find((c: any) => c.id === obl.clause_id);
              let criteria = criteriaMap.get(obl.id) || [];

              // Fallback to jsonb criteria if relational empty
              if (criteria.length === 0 && Array.isArray(obl.assessment_criteria) && obl.assessment_criteria.length > 0) {
                criteria = obl.assessment_criteria.map((c: any, cIdx: number) => ({
                  id: c.id || `crit-${obl.id}-${cIdx + 1}`,
                  type: c.type || 'Core Criteria',
                  text: c.text || c.criterionText || String(c),
                  evidenceRequired: c.evidenceRequired || 'Statutory compliance verification record',
                  isMandatory: c.isMandatory ?? true,
                }));
              }

              if (criteria.length === 0) {
                criteria = [
                  {
                    id: `crit-${obl.id}-1`,
                    type: 'Core Criteria',
                    text: `Internal operational manual contains unambiguous rules implementing: ${obl.description || obl.summary || obl.title}`,
                    evidenceRequired: 'Approved institutional policy document or standard operating procedure',
                    isMandatory: true,
                  },
                ];
              }

              const cleanObl: RegulatoryObligationPresentation = {
                id: obl.id,
                clauseId: obl.clause_id,
                sectionNumber: clause?.section_reference || 'Section 1.0',
                sectionReference: clause?.section_reference || 'Section 1.0',
                sectionHeading: clause?.section_heading || 'Statutory Directive',
                code: obl.code || `OBL-${obl.id.slice(0, 8).toUpperCase()}`,
                title: obl.title || obl.summary || clause?.section_heading || 'Regulatory Obligation',
                description: obl.description || obl.summary || obl.title,
                ruleType: (obl.rule_type as ObligationRuleType) || 'Prescriptive',
                policyApplicability: (obl.policy_applicability as PolicyApplicabilityType) || 'Policy Applicable',
                verbatimQuote: obl.verbatim_quote || obl.description || obl.summary || clause?.clause_text || '',
                sectionOrPageRef: obl.section_or_page_ref || clause?.section_reference || 'Section 1.0',
                characterSpan: obl.character_span_start != null && obl.character_span_end != null
                  ? [obl.character_span_start, obl.character_span_end]
                  : null,
                assessmentCriteria: criteria,
                riskDescription: obl.risk_description || 'Statutory penalties, administrative sanctions, and supervisory enforcement risk under regulatory oversight.',
                status: (obl.status as ObligationReviewStatus) || 'Pending Review',
                isRelevant: obl.is_relevant ?? true,
                isStarred: Boolean(obl.is_starred),
                assignee: obl.assigned_to || null,
                penalties: [],
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
      }
    }

    // 2. Seed fallback
    if (sections.length === 0) {
      const cleanId = id.toLowerCase();
      const seed = REGULATORY_INSTRUMENTS_SEED.find((s) => {
        const genId = `seed-inst-${s.short_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        return genId === cleanId || s.short_name.toLowerCase() === cleanId;
      });

      if (seed && seed.versions?.[0]?.clauses) {
        instrumentTitle = seed.title;
        sourceDocUrl = seed.versions[0].canonical_source_url || null;

        sections = seed.versions[0].clauses.map((c, cIdx) => {
          const clauseId = `seed-clause-${seed.short_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${cIdx + 1}`;
          const clauseObls: RegulatoryObligationPresentation[] = c.obligations.map((o, oIdx) => {
            const oblId = `seed-obl-${seed.short_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${cIdx + 1}-${oIdx + 1}`;
            const criteria: AssessmentCriterionItem[] = [
              {
                id: `crit-${oblId}-1`,
                type: 'Core Criteria',
                text: `Institutional operating policies unambiguously establish rules enforcing ${c.section_reference}`,
                evidenceRequired: 'Approved internal policy manual or board-approved charter',
                isMandatory: true,
              },
              {
                id: `crit-${oblId}-2`,
                type: 'Best Practice',
                text: 'Automated audit logs and periodic compliance reviews are verified quarterly',
                evidenceRequired: 'Supervisory inspection pack or audit trail export',
                isMandatory: false,
              },
            ];

            const ruleType: ObligationRuleType =
              o.obligation_type === 'STRICT_PROHIBITION'
                ? 'Prohibitive'
                : o.obligation_type === 'CONDITIONAL_PERMISSION'
                ? 'Conditional'
                : 'Prescriptive';

            const oblPresentation: RegulatoryObligationPresentation = {
              id: oblId,
              clauseId,
              sectionNumber: c.section_reference,
              sectionReference: c.section_reference,
              sectionHeading: c.section_heading,
              code: `OBL-${seed.body_code}-${String(cIdx + 1).padStart(2, '0')}${String(oIdx + 1).padStart(2, '0')}`,
              title: o.summary.length > 50 ? `${o.summary.slice(0, 47)}...` : o.summary,
              description: o.summary,
              ruleType,
              policyApplicability: 'Policy Applicable',
              verbatimQuote: c.clause_text.slice(0, 200),
              sectionOrPageRef: c.section_reference,
              assessmentCriteria: criteria,
              riskDescription: `Statutory penalties, administrative fines, or personal liability under ${seed.body_code} supervision.`,
              status: 'Pending Review',
              isRelevant: true,
              isStarred: false,
              assignee: {
                name: 'Chioma Okonkwo',
                role: 'Chief Compliance Officer',
                initials: 'CO',
              },
              penalties: (o.penalties || []).map((p) => ({
                penaltyMinNaira: p.penalty_min_naira,
                penaltyMaxNaira: p.penalty_max_naira,
                dailyFineNaira: p.daily_fine_naira,
                carriesPersonalCriminalLiability: p.carries_personal_criminal_liability,
                carriesLicenseSuspensionRisk: p.carries_license_suspension_risk,
                penaltyLegalCitation: p.penalty_legal_citation,
              })),
              sourceDocumentTitle: seed.title,
              sourceDocumentUrl: seed.versions[0]?.canonical_source_url || null,
            };

            allObligations.push(oblPresentation);
            return oblPresentation;
          });

          return {
            id: clauseId,
            sectionNumber: c.section_reference,
            sectionReference: c.section_reference,
            sectionHeading: c.section_heading,
            clauseText: c.clause_text,
            pageNumber: c.page_number || cIdx + 1,
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
