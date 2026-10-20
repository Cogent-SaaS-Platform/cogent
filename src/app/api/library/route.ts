import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';
import {
  REGULATORY_INSTRUMENTS_SEED,
  REGULATORY_DOMAINS,
  RegulatoryInstrumentSeed,
} from '@/shared/db/regulatoryCorpusData';
import {
  DocumentClassification,
  JurisdictionCode,
  RegulatoryDomainCode,
} from '@/shared/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const db = tenantCtx.dbClient;
    const { searchParams } = new URL(req.url);

    const regulator = searchParams.get('regulator');
    const domain = searchParams.get('domain') as RegulatoryDomainCode | null;
    const jurisdiction = searchParams.get('jurisdiction') as JurisdictionCode | null;
    const classification = searchParams.get('classification') as DocumentClassification | null;
    const search = searchParams.get('search')?.toLowerCase().trim();

    // 1. Query database instruments with joined regulatory bodies and versions
    let dbItems: any[] = [];
    try {
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

      if (instruments && !instError) {
        // Query clauses count
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

        dbItems = instruments.map((inst: any) => {
          const body = inst.regulatory_bodies;
          const versions = inst.regulatory_document_versions || [];
          const activeVersion = versions.find((v: any) => v.is_active) || versions[0] || null;

          let sectionsCount = activeVersion ? clauseCountByVersion.get(activeVersion.id) || 0 : 0;
          if (sectionsCount === 0) {
            sectionsCount = versions.reduce((acc: number, v: any) => acc + (clauseCountByVersion.get(v.id) || 0), 0);
          }

          let year = new Date(inst.created_at).getFullYear();
          if (activeVersion?.publication_date) {
            const parsedYear = new Date(activeVersion.publication_date).getFullYear();
            if (!isNaN(parsedYear)) year = parsedYear;
          }
          const yearMatch = inst.title.match(/\b(19\d\d|20\d\d)\b/);
          if (yearMatch) {
            year = parseInt(yearMatch[1], 10);
          }

          // Match seed item to preserve enriched domain and classification
          const instShort = (inst.short_name || '').toLowerCase();
          const instTitle = (inst.title || '').toLowerCase();
          const matchedSeed = REGULATORY_INSTRUMENTS_SEED.find((s) => {
            const seedShort = s.short_name.toLowerCase();
            const seedTitle = s.title.toLowerCase();
            return (
              seedShort === instShort ||
              seedTitle === instTitle ||
              instShort.includes(seedShort) ||
              seedShort.includes(instShort) ||
              instTitle.includes(seedShort)
            );
          });

          // Resolve sensible default domain if not matched
          let defaultDomain = 'FINTECH_PAYMENTS';
          const regCode = (body?.code || '').toUpperCase();
          if (regCode === 'FCCPC' || instTitle.includes('lending') || instTitle.includes('consumer')) defaultDomain = 'DIGITAL_LENDING';
          else if (regCode === 'ARCON' || instTitle.includes('advertising') || instTitle.includes('vetting')) defaultDomain = 'CONSUMER_PROTECTION';
          else if (regCode === 'NDPC' || instTitle.includes('privacy') || instTitle.includes('data')) defaultDomain = 'DATA_PRIVACY_AI';
          else if (regCode === 'SEC' && (instTitle.includes('vasp') || instTitle.includes('virtual') || instTitle.includes('crypto'))) defaultDomain = 'CRYPTO_VASP';
          else if (regCode === 'SEC') defaultDomain = 'CAPITAL_MARKETS';
          else if (instTitle.includes('aml') || instTitle.includes('laundering') || regCode === 'NFIU') defaultDomain = 'AML_CFT';

          const citation = activeVersion?.reference_code || `${inst.short_name} (${year})`;

          return {
            id: inst.id,
            shortTitle: inst.short_name,
            fullTitle: inst.title,
            officialCitation: citation,
            regulator: body?.code || matchedSeed?.body_code || 'CBN',
            regulatorName: body?.name || 'Regulatory Authority',
            instrumentType: inst.instrument_type,
            domain: matchedSeed?.domain || (defaultDomain as RegulatoryDomainCode),
            jurisdiction: matchedSeed?.jurisdiction || 'NG',
            classification: matchedSeed?.classification || 'SUBSIDIARY_REGULATION',
            year,
            sectionsCount: sectionsCount > 0 ? sectionsCount : (matchedSeed ? matchedSeed.versions[0]?.clauses?.length || 0 : 0),
            status: (activeVersion?.is_active ? 'ACTIVE_LAW' : 'AMENDED') as 'ACTIVE_LAW' | 'AMENDED',
            description: matchedSeed?.description || inst.title,
            activeVersionId: activeVersion?.id || null,
            publicationDate: activeVersion?.publication_date || null,
            effectiveDate: activeVersion?.effective_date || null,
            sourceFileUrl: activeVersion?.source_file_url || activeVersion?.canonical_source_url || body?.official_portal_url || null,
          };
        });
      }
    } catch (dbErr) {
      logger.warn({ dbErr }, 'Database instruments query fallback to authoritative seeds');
    }

    // 2. Map all authentic seed instruments
    const seedItems = REGULATORY_INSTRUMENTS_SEED.map((seed, idx) => {
      const activeVersion = seed.versions[0];
      const sectionsCount = seed.versions.reduce((acc, v) => acc + (v.clauses?.length || 0), 0);
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
        status: 'ACTIVE_LAW' as const,
        description: seed.description || seed.title,
        activeVersionId: `seed-ver-${idx}`,
        publicationDate: activeVersion?.publication_date || null,
        effectiveDate: activeVersion?.effective_date || null,
        sourceFileUrl: activeVersion?.canonical_source_url || null,
      };
    });

    // 3. Merge: prefer DB item if present, append non-existing seed items
    const mergedMap = new Map<string, any>();
    for (const item of dbItems) {
      mergedMap.set(item.shortTitle.toLowerCase(), item);
    }
    for (const item of seedItems) {
      if (!mergedMap.has(item.shortTitle.toLowerCase())) {
        mergedMap.set(item.shortTitle.toLowerCase(), item);
      }
    }

    let allItems = Array.from(mergedMap.values());

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
        totalInstruments: matching.length > 0 ? matching.length : dom.totalInstruments,
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
