import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';

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

    let targetVersionIds: string[] = [];

    if (versionId) {
      targetVersionIds = [versionId];
    } else if (instrumentId) {
      // Find all document versions for this instrument
      const { data: versions, error: vErr } = await db
        .from('regulatory_document_versions')
        .select('id, is_active')
        .eq('instrument_id', instrumentId);

      if (vErr) {
        logger.error({ error: vErr.message }, 'Failed to fetch document versions');
        return NextResponse.json({ success: false, error: vErr.message }, { status: 500 });
      }

      if (versions && versions.length > 0) {
        targetVersionIds = versions.map((v) => v.id);
      }
    }

    if (targetVersionIds.length === 0) {
      return NextResponse.json({ success: true, clauses: [] });
    }

    // Fetch clauses for the version(s)
    const { data: clausesData, error: cErr } = await db
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

    if (cErr) {
      logger.error({ error: cErr.message }, 'Failed to fetch regulatory clauses');
      return NextResponse.json({ success: false, error: cErr.message }, { status: 500 });
    }

    const clauses = clausesData || [];
    const clauseIds = clauses.map((c) => c.id);

    // Fetch related obligations
    let obligationsMap = new Map<string, any[]>();
    if (clauseIds.length > 0) {
      const { data: obligationsData } = await db
        .from('regulatory_obligations')
        .select('*')
        .in('clause_id', clauseIds);

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
    }

    const formattedClauses = clauses.map((c) => ({
      id: c.id,
      sectionReference: c.section_reference,
      sectionHeading: c.section_heading || 'Statutory Clause',
      clauseText: c.clause_text,
      pageNumber: c.page_number,
      paragraphReference: c.paragraph_reference,
      obligations: obligationsMap.get(c.id) || [],
    }));

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
