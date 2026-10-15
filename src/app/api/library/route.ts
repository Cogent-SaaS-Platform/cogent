import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const db = tenantCtx.dbClient;
    const { searchParams } = new URL(req.url);
    const regulator = searchParams.get('regulator');
    const search = searchParams.get('search')?.toLowerCase().trim();

    // Query instruments with joined regulatory bodies and document versions
    const { data: instruments, error: instError } = await db
      .from('regulatory_instruments')
      .select(`
        id,
        title,
        short_name,
        instrument_type,
        created_at,
        regulatory_bodies (
          id,
          code,
          name,
          official_portal_url
        ),
        regulatory_document_versions (
          id,
          version_number,
          reference_code,
          publication_date,
          effective_date,
          canonical_source_url,
          source_file_url,
          is_active,
          verification_status
        )
      `)
      .order('created_at', { ascending: false });

    if (instError) {
      logger.error({ error: instError.message }, 'Failed to fetch regulatory instruments');
      return NextResponse.json({ success: false, error: instError.message }, { status: 500 });
    }

    // Get count of clauses per document version
    const { data: clausesData } = await db
      .from('regulatory_clauses')
      .select('id, document_version_id');

    const clauseCountByVersion = new Map<string, number>();
    if (clausesData) {
      for (const clause of clausesData) {
        const count = clauseCountByVersion.get(clause.document_version_id) || 0;
        clauseCountByVersion.set(clause.document_version_id, count + 1);
      }
    }

    const items = (instruments || []).map((inst: any) => {
      const body = inst.regulatory_bodies;
      const versions = inst.regulatory_document_versions || [];
      const activeVersion = versions.find((v: any) => v.is_active) || versions[0] || null;

      // Calculate total sections from active version or sum across all versions
      let sectionsCount = 0;
      if (activeVersion) {
        sectionsCount = clauseCountByVersion.get(activeVersion.id) || 0;
      }
      if (sectionsCount === 0) {
        // Fallback to sum of clauses across versions
        sectionsCount = versions.reduce((acc: number, v: any) => acc + (clauseCountByVersion.get(v.id) || 0), 0);
      }

      // Determine year
      let year = new Date(inst.created_at).getFullYear();
      if (activeVersion?.publication_date) {
        const parsedYear = new Date(activeVersion.publication_date).getFullYear();
        if (!isNaN(parsedYear)) year = parsedYear;
      }

      // Check year in title if 4 digits
      const yearMatch = inst.title.match(/\b(19\d\d|20\d\d)\b/);
      if (yearMatch) {
        year = parseInt(yearMatch[1], 10);
      }

      const citation = activeVersion?.reference_code || `${inst.short_name} (${year})`;

      return {
        id: inst.id,
        shortTitle: inst.short_name,
        fullTitle: inst.title,
        officialCitation: citation,
        regulator: body?.code || 'FEDERAL',
        regulatorName: body?.name || 'Federal Government of Nigeria',
        instrumentType: inst.instrument_type,
        year,
        sectionsCount,
        status: (activeVersion?.is_active ? 'ACTIVE_LAW' : 'AMENDED') as 'ACTIVE_LAW' | 'AMENDED',
        description: inst.title,
        activeVersionId: activeVersion?.id || null,
        publicationDate: activeVersion?.publication_date || null,
        effectiveDate: activeVersion?.effective_date || null,
        sourceFileUrl: activeVersion?.source_file_url || activeVersion?.canonical_source_url || body?.official_portal_url || null,
      };
    });

    // Apply filtering
    let filtered = items;
    if (regulator && regulator !== 'ALL') {
      filtered = filtered.filter((i) => i.regulator.toUpperCase() === regulator.toUpperCase());
    }

    if (search) {
      filtered = filtered.filter(
        (i) =>
          i.shortTitle.toLowerCase().includes(search) ||
          i.fullTitle.toLowerCase().includes(search) ||
          i.officialCitation.toLowerCase().includes(search) ||
          i.regulator.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      totalCount: filtered.length,
      instruments: filtered,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Unexpected error in GET /api/library');
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
