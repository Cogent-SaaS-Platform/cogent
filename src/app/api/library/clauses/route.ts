import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';
import { REGULATORY_INSTRUMENTS_SEED } from '@/shared/db/regulatoryCorpusData';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
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

    // 1. Check if this is a seed instrument reference or if we should retrieve from seed
    const isSeedId = instrumentId && instrumentId.startsWith('seed-inst-');
    let matchedSeed = isSeedId
      ? REGULATORY_INSTRUMENTS_SEED.find(
          (s) => `seed-inst-${s.short_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}` === instrumentId
        )
      : null;

    if (!matchedSeed && instrumentId) {
      // Also check by short_name match
      matchedSeed = REGULATORY_INSTRUMENTS_SEED.find(
        (s) => s.short_name.toLowerCase() === instrumentId.toLowerCase()
      ) || null;
    }

    let targetVersionIds: string[] = [];
    let formattedClauses: any[] = [];

    // 2. Query database if not explicitly a seed-only ID
    if (!isSeedId && db) {
      try {
        if (versionId) {
          targetVersionIds = [versionId];
        } else if (instrumentId) {
          const { data: versions } = await db
            .from('regulatory_document_versions')
            .select('id, is_active')
            .eq('instrument_id', instrumentId);

          if (versions && versions.length > 0) {
            targetVersionIds = versions.map((v) => v.id);
          }
        }

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

            const obligationsMap = new Map<string, any[]>();
            if (obligationsData) {
              for (const obl of obligationsData) {
                const arr = obligationsMap.get(obl.clause_id) || [];
                arr.push({
                  id: obl.id,
                  obligationType: obl.obligation_type,
                  summary: obl.summary,
                  severityFloor: obl.severity_floor,
                  statutoryTimelineDays: obl.statutory_timeline_days,
                  mandatoryDisclosureText: obl.mandatory_disclosure_text,
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
          }
        }
      } catch (dbErr) {
        logger.warn({ dbErr }, 'DB clauses query failed; using seed corpus');
      }
    }

    // 3. Fallback to authoritative seed corpus if DB returned empty or this is a seed item
    if (formattedClauses.length === 0 && matchedSeed) {
      formattedClauses = (matchedSeed.versions[0]?.clauses || []).map((c, cIdx) => ({
        id: `seed-clause-${matchedSeed!.short_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${cIdx + 1}`,
        sectionReference: c.section_reference,
        sectionHeading: c.section_heading,
        clauseText: c.clause_text,
        pageNumber: c.page_number || null,
        paragraphReference: c.paragraph_reference || null,
        obligations: c.obligations.map((obl, oIdx) => ({
          id: `seed-obl-${matchedSeed!.short_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${cIdx + 1}-${oIdx + 1}`,
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
            {
              id: `crit-${cIdx}-${oIdx}-2`,
              criterionText: 'Audit logging and supervisory inspection controls are actively in place',
              evidenceRequired: 'Automated system event log or inspection readiness dossier',
              isMandatory: false,
              defaultChecked: false,
            },
          ],
        })),
      }));
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
