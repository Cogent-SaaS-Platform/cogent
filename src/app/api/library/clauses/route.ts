import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';
import { REGULATORY_INSTRUMENTS_SEED } from '@/shared/db/regulatoryCorpusData';
import { ClauseSegmentationEngine } from '@/modules/radar/services/clauseSegmentationEngine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const db = tenantCtx.dbClient;
    const { searchParams } = new URL(req.url);
    const instrumentId = searchParams.get('instrumentId');
    const versionId = searchParams.get('versionId');

    if (!instrumentId && !versionId) {
      return NextResponse.json(
        { success: false, error: 'Either instrumentId or versionId is required' },
        { status: 400 }
      );
    }

    let targetVersionIds: string[] = [];
    let formattedClauses: any[] = [];
    let dbInstrument: any = null;
    let matchedCircular: any = null;

    const isUuid = (val: string | null): boolean =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

    // 1. Resolve target document version IDs from database
    if (db) {
      try {
        if (versionId && isUuid(versionId)) {
          targetVersionIds = [versionId];
        } else if (instrumentId) {
          if (isUuid(instrumentId)) {
            // Check regulatory_instruments
            const { data: inst } = await db
              .from('regulatory_instruments')
              .select('id, short_name, title, instrument_type')
              .eq('id', instrumentId)
              .maybeSingle();

            if (inst) {
              dbInstrument = inst;
              const { data: versions } = await db
                .from('regulatory_document_versions')
                .select('id, is_active')
                .eq('instrument_id', inst.id);

              if (versions && versions.length > 0) {
                targetVersionIds = versions.map((v) => v.id);
              }
            } else {
              // Check if instrumentId is directly a document_version_id
              const { data: docVer } = await db
                .from('regulatory_document_versions')
                .select('id, instrument_id')
                .eq('id', instrumentId)
                .maybeSingle();

              if (docVer) {
                targetVersionIds = [docVer.id];
              } else {
                // Check if instrumentId is a radar_circulars id
                const { data: circ } = await db
                  .from('radar_circulars')
                  .select('id, document_version_id, subject, summary, raw_text, circular_number')
                  .eq('id', instrumentId)
                  .maybeSingle();

                if (circ) {
                  matchedCircular = circ;
                  if (circ.document_version_id) {
                    targetVersionIds = [circ.document_version_id];
                  }
                }
              }
            }
          } else {
            // Text search by short_name or title
            const { data: inst } = await db
              .from('regulatory_instruments')
              .select('id, short_name, title, instrument_type')
              .or(`short_name.ilike.%${instrumentId}%,title.ilike.%${instrumentId}%`)
              .limit(1)
              .maybeSingle();

            if (inst) {
              dbInstrument = inst;
              const { data: versions } = await db
                .from('regulatory_document_versions')
                .select('id, is_active')
                .eq('instrument_id', inst.id);

              if (versions && versions.length > 0) {
                targetVersionIds = versions.map((v) => v.id);
              }
            } else {
              // Check radar circulars by circular_number
              const { data: circ } = await db
                .from('radar_circulars')
                .select('id, document_version_id, subject, summary, raw_text, circular_number')
                .ilike('circular_number', `%${instrumentId}%`)
                .limit(1)
                .maybeSingle();

              if (circ) {
                matchedCircular = circ;
                if (circ.document_version_id) {
                  targetVersionIds = [circ.document_version_id];
                }
              }
            }
          }
        }

        // 2. Query indexed clauses from regulatory_clauses
        if (targetVersionIds.length > 0) {
          const { data: clausesData } = await db
            .from('regulatory_clauses')
            .select(`
              id,
              document_version_id,
              section_reference,
              section_heading,
              clause_text,
              page_number,
              paragraph_reference,
              created_at
            `)
            .in('document_version_id', targetVersionIds)
            .order('created_at', { ascending: true });

          if (clausesData && clausesData.length > 0) {
            const clauseIds = clausesData.map((c) => c.id);
            const { data: obligationsData } = await db
              .from('regulatory_obligations')
              .select('*')
              .in('clause_id', clauseIds);

            // Fetch penalties for obligations
            const obligationIds = (obligationsData || []).map((o) => o.id);
            const penaltiesMap = new Map<string, any[]>();
            if (obligationIds.length > 0) {
              const { data: penaltiesData } = await db
                .from('statutory_penalties')
                .select('*')
                .in('obligation_id', obligationIds);

              if (penaltiesData) {
                for (const p of penaltiesData) {
                  const arr = penaltiesMap.get(p.obligation_id) || [];
                  arr.push({
                    penaltyMinNaira: p.penalty_min_naira,
                    penaltyMaxNaira: p.penalty_max_naira,
                    dailyFineNaira: p.daily_fine_naira,
                    carriesPersonalCriminalLiability: p.carries_personal_criminal_liability,
                    carriesLicenseSuspensionRisk: p.carries_license_suspension_risk,
                    penaltyLegalCitation: p.penalty_legal_citation,
                  });
                  penaltiesMap.set(p.obligation_id, arr);
                }
              }
            }

            const obligationsMap = new Map<string, any[]>();
            if (obligationsData) {
              for (const obl of obligationsData) {
                const arr = obligationsMap.get(obl.clause_id) || [];
                const penalties = penaltiesMap.get(obl.id) || [];
                const meta = (obl.metadata || {}) as Record<string, any>;
                const rawCriteria = meta.complianceCriteria;

                const assessmentCriteria = Array.isArray(rawCriteria) && rawCriteria.length > 0
                  ? rawCriteria.map((crit: any, cIdx: number) => ({
                      id: crit.id || `crit-${obl.id}-${cIdx + 1}`,
                      criterionText: crit.criterionText || crit.title || String(crit),
                      evidenceRequired: crit.evidenceRequired || 'Statutory compliance verification record',
                      isMandatory: crit.isMandatory ?? true,
                      defaultChecked: crit.defaultChecked ?? false,
                    }))
                  : [
                      {
                        id: `crit-${obl.id}-1`,
                        criterionText: `Internal operational manual contains unambiguous rules implementing ${obl.summary}`,
                        evidenceRequired: 'Approved institutional policy document or standard operating procedure',
                        isMandatory: true,
                        defaultChecked: true,
                      },
                      {
                        id: `crit-${obl.id}-2`,
                        criterionText: 'Audit logging and supervisory inspection controls are actively in place',
                        evidenceRequired: 'Automated system event log or inspection readiness dossier',
                        isMandatory: false,
                        defaultChecked: false,
                      },
                    ];

                arr.push({
                  id: obl.id,
                  obligationType: obl.obligation_type,
                  summary: obl.summary,
                  severityFloor: obl.severity_floor,
                  statutoryTimelineDays: obl.statutory_timeline_days,
                  mandatoryDisclosureText: obl.mandatory_disclosure_text,
                  targetRole: (obl as any).target_role || 'Chief Compliance Officer',
                  verbatimQuote: obl.verbatim_quote || null,
                  characterSpan: obl.character_span_start != null && obl.character_span_end != null
                    ? [obl.character_span_start, obl.character_span_end]
                    : null,
                  actor: obl.actor || null,
                  action: obl.action || null,
                  targetObject: obl.target_object || null,
                  assessment: meta.assessment || null,
                  penalties,
                  assessmentCriteria,
                });
                obligationsMap.set(obl.clause_id, arr);
              }
            }

            formattedClauses = clausesData.map((c) => ({
              id: c.id,
              sectionReference: c.section_reference,
              sectionHeading: c.section_heading || 'Statutory Clause',
              clauseText: c.clause_text,
              pageNumber: c.page_number,
              paragraphReference: c.paragraph_reference,
              obligations: obligationsMap.get(c.id) || [],
            }));
          } else {
            // 3. Adaptive Dynamic Clause Extraction for newly uploaded or untokenized documents
            if (!matchedCircular && targetVersionIds.length > 0) {
              const { data: circ } = await db
                .from('radar_circulars')
                .select('id, document_version_id, subject, summary, raw_text, circular_number')
                .in('document_version_id', targetVersionIds)
                .limit(1)
                .maybeSingle();
              if (circ) matchedCircular = circ;
            }

            if (matchedCircular && matchedCircular.raw_text && targetVersionIds[0]) {
              const parsedClauses = ClauseSegmentationEngine.segmentAndDecompose({
                rawText: matchedCircular.raw_text,
                circularNumber: matchedCircular.circular_number,
                subject: matchedCircular.subject,
              });

              const persisted = await ClauseSegmentationEngine.persistDocumentClauses(
                db,
                targetVersionIds[0],
                parsedClauses
              );

              formattedClauses = persisted.map((c) => ({
                id: c.id || crypto.randomUUID(),
                sectionReference: c.sectionReference,
                sectionHeading: c.sectionHeading,
                clauseText: c.clauseText,
                pageNumber: c.pageNumber,
                paragraphReference: c.paragraphReference,
                obligations: c.obligations.map((obl) => {
                  const rawCriteria = (obl as any).complianceCriteria;
                  const assessmentCriteria = Array.isArray(rawCriteria) && rawCriteria.length > 0
                    ? rawCriteria.map((crit: any, cIdx: number) => ({
                        id: crit.id || `crit-${obl.id || cIdx}-${cIdx + 1}`,
                        criterionText: crit.criterionText || crit.title || String(crit),
                        evidenceRequired: crit.evidenceRequired || 'Statutory compliance verification record',
                        isMandatory: crit.isMandatory ?? true,
                        defaultChecked: crit.defaultChecked ?? false,
                      }))
                    : [
                        {
                          id: `crit-${obl.summary}-1`,
                          criterionText: `Internal operational manual contains unambiguous rules implementing ${obl.summary}`,
                          evidenceRequired: 'Approved institutional policy document or standard operating procedure',
                          isMandatory: true,
                          defaultChecked: true,
                        },
                      ];

                  return {
                    id: obl.id || crypto.randomUUID(),
                    obligationType: obl.obligationType,
                    summary: obl.summary,
                    severityFloor: obl.severityFloor,
                    statutoryTimelineDays: obl.statutoryTimelineDays,
                    mandatoryDisclosureText: obl.obligationType === 'MANDATORY_DISCLOSURE' ? obl.summary : null,
                    targetRole: obl.targetRole,
                    verbatimQuote: obl.verbatimQuote || null,
                    characterSpan: (obl.startChar != null && obl.endChar != null) ? [obl.startChar, obl.endChar] : null,
                    actor: obl.actor || null,
                    action: obl.action || null,
                    targetObject: obl.object || null,
                    assessment: (obl as any).assessment || null,
                    penalties: obl.penalties || [],
                    assessmentCriteria,
                  };
                }),
              }));
            }
          }
        }
      } catch (dbErr: any) {
        logger.warn({ error: dbErr.message }, 'Database query in /api/library/clauses failed; checking seed fallback');
      }
    }

    // 4. Seed Corpus Fallback if no database clauses found
    if (formattedClauses.length === 0 && instrumentId) {
      const matchedSeed = REGULATORY_INSTRUMENTS_SEED.find((inst) => {
        if (inst.short_name.toLowerCase() === instrumentId.toLowerCase()) return true;
        if (dbInstrument && inst.short_name.toLowerCase() === dbInstrument.short_name.toLowerCase()) return true;
        return false;
      });

      if (matchedSeed && matchedSeed.versions?.[0]?.clauses) {
        formattedClauses = (matchedSeed.versions[0].clauses || []).map((c, cIdx) => ({
          id: `seed-clause-${matchedSeed.short_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${cIdx + 1}`,
          sectionReference: c.section_reference,
          sectionHeading: c.section_heading,
          clauseText: c.clause_text,
          pageNumber: c.page_number || null,
          paragraphReference: c.paragraph_reference || null,
          obligations: c.obligations.map((obl, oIdx) => ({
            id: `seed-obl-${matchedSeed.short_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${cIdx + 1}-${oIdx + 1}`,
            obligationType: obl.obligation_type,
            summary: obl.summary,
            severityFloor: obl.severity_floor,
            statutoryTimelineDays: obl.statutory_timeline_days,
            mandatoryDisclosureText: obl.mandatory_disclosure_text,
            targetRole: obl.target_role || 'Chief Compliance Officer',
            penalties: (obl.penalties || []).map((p) => ({
              penaltyMinNaira: p.penalty_min_naira,
              penaltyMaxNaira: p.penalty_max_naira,
              dailyFineNaira: p.daily_fine_naira,
              carriesPersonalCriminalLiability: p.carries_personal_criminal_liability,
              carriesLicenseSuspensionRisk: p.carries_license_suspension_risk,
              penaltyLegalCitation: p.penalty_legal_citation,
            })),
            assessmentCriteria: obl.assessment_criteria || [
              {
                id: `crit-${cIdx}-${oIdx}-1`,
                criterionText: `Internal operational manual contains unambiguous rules implementing ${c.section_reference}`,
                evidenceRequired: 'Approved institutional policy document or standard operating procedure',
                isMandatory: true,
                defaultChecked: true,
              },
            ],
          })),
        }));
      }
    }

    return NextResponse.json({
      success: true,
      count: formattedClauses.length,
      clauses: formattedClauses,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Unexpected error in GET /api/library/clauses');
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
