import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/shared/logger';
import { createAdminClient } from '@/shared/db';
import {
  REGULATORY_INSTRUMENTS_SEED,
  REGULATORY_DOMAINS,
} from '@/shared/db/regulatoryCorpusData';
import {
  DocumentClassification,
  JurisdictionCode,
  RegulatoryDomainCode,
} from '@/shared/types';
import { RegulatoryInstrumentPresentation } from '@/modules/regulatory/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = createAdminClient();
    const { searchParams } = new URL(req.url);

    const regulator = searchParams.get('regulator');
    const domain = searchParams.get('domain') as RegulatoryDomainCode | null;
    const jurisdiction = searchParams.get('jurisdiction') as JurisdictionCode | null;
    const classification = searchParams.get('classification') as DocumentClassification | null;
    const search = searchParams.get('search')?.toLowerCase().trim();
    const isStarredFilter = searchParams.get('starred') === 'true';

    // 1. Query database instruments with joined regulatory bodies and versions
    let dbItems: RegulatoryInstrumentPresentation[] = [];
    try {
      const { data: instruments, error: instError } = await (db.from('regulatory_instruments') as any)
        .select(`
          id,
          title,
          short_name,
          instrument_type,
          overview,
          scope,
          key_requirement_areas,
          domain,
          jurisdiction,
          classification,
          is_starred,
          owner,
          captured_text,
          source_url,
          publication_date,
          entry_into_force_date,
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
            is_active
          )
        `)
        .order('created_at', { ascending: false });

      if (instruments && !instError) {
        // Query clauses count & obligations count
        const { data: clausesData } = await db
          .from('regulatory_clauses')
          .select('id, document_version_id');

        const clauseCountByVersion = new Map<string, number>();
        const clauseIds: string[] = [];
        if (clausesData) {
          for (const clause of clausesData) {
            clauseIds.push(clause.id);
            const count = clauseCountByVersion.get(clause.document_version_id) || 0;
            clauseCountByVersion.set(clause.document_version_id, count + 1);
          }
        }

        // Count obligations per clause
        const { data: oblsData } = await db
          .from('regulatory_obligations')
          .select('id, clause_id');

        const obligationsCountByClause = new Map<string, number>();
        if (oblsData) {
          for (const obl of oblsData) {
            const count = obligationsCountByClause.get(obl.clause_id) || 0;
            obligationsCountByClause.set(obl.clause_id, count + 1);
          }
        }

        // Map version to obligations count
        const obligationsCountByVersion = new Map<string, number>();
        if (clausesData) {
          for (const c of clausesData) {
            const oblCount = obligationsCountByClause.get(c.id) || 0;
            const existing = obligationsCountByVersion.get(c.document_version_id) || 0;
            obligationsCountByVersion.set(c.document_version_id, existing + oblCount);
          }
        }

        dbItems = instruments.map((inst: any) => {
          const body = inst.regulatory_bodies;
          const versions = inst.regulatory_document_versions || [];
          const activeVersion = versions.find((v: any) => v.is_active) || versions[0] || null;

          let sectionsCount = activeVersion ? clauseCountByVersion.get(activeVersion.id) || 0 : 0;
          if (sectionsCount === 0) {
            sectionsCount = versions.reduce((acc: number, v: any) => acc + (clauseCountByVersion.get(v.id) || 0), 0);
          }

          let totalObligationsCount = activeVersion ? obligationsCountByVersion.get(activeVersion.id) || 0 : 0;
          if (totalObligationsCount === 0) {
            totalObligationsCount = versions.reduce((acc: number, v: any) => acc + (obligationsCountByVersion.get(v.id) || 0), 0);
          }

          let year = new Date(inst.created_at).getFullYear();
          if (inst.publication_date) {
            const parsedYear = new Date(inst.publication_date).getFullYear();
            if (!isNaN(parsedYear)) year = parsedYear;
          } else if (activeVersion?.publication_date) {
            const parsedYear = new Date(activeVersion.publication_date).getFullYear();
            if (!isNaN(parsedYear)) year = parsedYear;
          }

          const cleanTitle = inst.title && inst.title.length > 5 ? inst.title : (inst.short_name || 'Regulatory Directive');
          const cleanShortTitle = inst.short_name || cleanTitle;
          const citation = activeVersion?.reference_code || `${cleanShortTitle} (${year})`;

          return {
            id: inst.id,
            shortTitle: cleanShortTitle,
            fullTitle: cleanTitle,
            officialCitation: citation,
            regulator: body?.code || 'CBN',
            regulatorName: body?.name || 'Regulatory Authority',
            instrumentType: inst.instrument_type || 'SUBSIDIARY_REGULATION',
            domain: inst.domain || 'FINTECH_PAYMENTS',
            jurisdiction: inst.jurisdiction || 'NG',
            classification: inst.classification || 'SUBSIDIARY_REGULATION',
            year,
            sectionsCount,
            totalObligationsCount,
            status: (activeVersion?.is_active ? 'ACTIVE_LAW' : 'AMENDED') as 'ACTIVE_LAW' | 'AMENDED',
            description: inst.overview || cleanTitle,
            overview: inst.overview || cleanTitle,
            scope: inst.scope || 'Applies to regulated financial institutions in Nigeria.',
            keyRequirementAreas: Array.isArray(inst.key_requirement_areas) ? inst.key_requirement_areas : [],
            activeVersionId: activeVersion?.id || null,
            publicationDate: inst.publication_date || activeVersion?.publication_date || null,
            effectiveDate: inst.entry_into_force_date || activeVersion?.effective_date || null,
            sourceFileUrl: activeVersion?.source_file_url || activeVersion?.canonical_source_url || inst.source_url || null,
            isStarred: Boolean(inst.is_starred),
            owner: inst.owner || 'Chief Compliance Officer',
            capturedText: inst.captured_text || null,
          };
        });
      }
    } catch (dbErr) {
      logger.warn({ dbErr }, 'Database instruments query fallback to authoritative seeds');
    }

    // 2. Map all authentic seed instruments
    const seedItems: RegulatoryInstrumentPresentation[] = REGULATORY_INSTRUMENTS_SEED.map((seed, idx) => {
      const activeVersion = seed.versions[0];
      const sectionsCount = seed.versions.reduce((acc, v) => acc + (v.clauses?.length || 0), 0);
      const totalObligationsCount = (activeVersion?.clauses || []).reduce((acc, c) => acc + (c.obligations?.length || 0), 0);

      let year = seed.enacted_year || 2023;
      if (activeVersion?.publication_date) {
        const parsedYear = new Date(activeVersion.publication_date).getFullYear();
        if (!isNaN(parsedYear)) year = parsedYear;
      }

      return {
        id: `seed-inst-${seed.short_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        shortTitle: seed.short_name,
        fullTitle: seed.title,
        officialCitation: activeVersion?.reference_code || `${seed.short_name} (${year})`,
        regulator: seed.body_code,
        regulatorName: seed.body_code === 'CBN'
          ? 'Central Bank of Nigeria'
          : seed.body_code === 'SEC'
          ? 'Securities and Exchange Commission'
          : seed.body_code === 'NDPC'
          ? 'Nigeria Data Protection Commission'
          : seed.body_code === 'ARCON'
          ? 'Advertising Regulatory Council of Nigeria'
          : seed.body_code === 'FCCPC'
          ? 'Federal Competition & Consumer Protection Commission'
          : 'Apex Regulatory Body',
        instrumentType: seed.instrument_type,
        domain: seed.domain || 'FINTECH_PAYMENTS',
        jurisdiction: seed.jurisdiction || 'NG',
        classification: seed.classification || 'SUBSIDIARY_REGULATION',
        year,
        sectionsCount,
        totalObligationsCount,
        status: 'ACTIVE_LAW',
        description: seed.description || seed.title,
        overview: seed.description || `Operative statutory instrument establishing legal frameworks under ${seed.body_code}.`,
        scope: `Applies to all licensed entities and corporate institutions operating within the Nigerian financial and capital markets.`,
        keyRequirementAreas: [
          {
            title: 'Statutory Compliance Baseline',
            description: 'Institutional policies and operating procedures must maintain continuous concordance with this legislation.',
          },
          {
            title: 'Audit & Examination Readiness',
            description: 'Maintains evidentiary compliance records for statutory inspections and supervisory inquiries.',
          },
        ],
        activeVersionId: `seed-ver-${idx}`,
        publicationDate: activeVersion?.publication_date || `${year}-01-01`,
        effectiveDate: activeVersion?.effective_date || `${year}-01-01`,
        sourceFileUrl: activeVersion?.canonical_source_url || null,
        isStarred: false,
        owner: 'Chief Compliance Officer',
      };
    });

    // 3. Merge: prefer DB item if present, append non-existing seed items
    const mergedMap = new Map<string, RegulatoryInstrumentPresentation>();
    for (const item of dbItems) {
      mergedMap.set(item.fullTitle.toLowerCase(), item);
      mergedMap.set(item.shortTitle.toLowerCase(), item);
    }
    for (const item of seedItems) {
      if (!mergedMap.has(item.fullTitle.toLowerCase()) && !mergedMap.has(item.shortTitle.toLowerCase())) {
        mergedMap.set(item.shortTitle.toLowerCase(), item);
      }
    }

    let allItems = Array.from(new Set(mergedMap.values()));

    // Sort: newest created/published first
    allItems.sort((a, b) => (b.year || 0) - (a.year || 0));

    // 4. Apply Filters
    if (domain && domain !== ('ALL' as any)) {
      allItems = allItems.filter((i) => i.domain === domain);
    }

    if (jurisdiction && jurisdiction !== ('ALL' as any)) {
      allItems = allItems.filter((i) => i.jurisdiction === jurisdiction);
    }

    if (classification && classification !== ('ALL' as any)) {
      allItems = allItems.filter((i) => i.classification === classification);
    }

    if (regulator && regulator !== 'ALL') {
      allItems = allItems.filter((i) => i.regulator.toUpperCase() === regulator.toUpperCase());
    }

    if (isStarredFilter) {
      allItems = allItems.filter((i) => Boolean(i.isStarred));
    }

    if (search) {
      allItems = allItems.filter(
        (i) =>
          i.shortTitle.toLowerCase().includes(search) ||
          i.fullTitle.toLowerCase().includes(search) ||
          i.officialCitation.toLowerCase().includes(search) ||
          i.regulator.toLowerCase().includes(search) ||
          (i.description && i.description.toLowerCase().includes(search))
      );
    }

    // 5. Calculate live domain statistics
    const dynamicDomains = REGULATORY_DOMAINS.map((dom) => {
      const matching = allItems.filter((i) => i.domain === dom.code);
      return {
        ...dom,
        totalInstruments: matching.length,
      };
    });

    return NextResponse.json({
      success: true,
      totalCount: allItems.length,
      domains: dynamicDomains,
      instruments: allItems,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Unexpected error in GET /api/library');
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
