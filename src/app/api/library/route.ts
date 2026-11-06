import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/shared/logger';
import { getTenantContext } from '@/shared/auth';
import { createAdminClient } from '@/shared/db';
import { REGULATORY_DOMAINS } from '@/shared/db/regulatoryCorpusData';
import {
  DocumentClassification,
  JurisdictionCode,
  RegulatoryDomainCode,
} from '@/shared/types';
import { RegulatoryInstrumentPresentation } from '@/modules/regulatory/types';

export const dynamic = 'force-dynamic';

const TOPIC_TO_DOMAIN_MAP: Record<string, RegulatoryDomainCode[]> = {
  aml_cft: ['AML_CFT'],
  data_privacy: ['DATA_PRIVACY_AI'],
  consumer_protection: ['CONSUMER_PROTECTION', 'DIGITAL_LENDING'],
  digital_lending: ['DIGITAL_LENDING', 'CONSUMER_PROTECTION'],
  payments_rails: ['FINTECH_PAYMENTS'],
  cybersecurity: ['DATA_PRIVACY_AI', 'FINTECH_PAYMENTS'],
  capital_liquidity: ['CAPITAL_MARKETS', 'FINTECH_PAYMENTS'],
  crypto_vasp: ['CRYPTO_VASP', 'CAPITAL_MARKETS'],
  corporate_governance: ['FINTECH_PAYMENTS', 'CAPITAL_MARKETS', 'AML_CFT'],
};

export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const db = createAdminClient();
    const { searchParams } = new URL(req.url);

    const regulator = searchParams.get('regulator');
    const rawDomainParam = searchParams.get('domain');
    const jurisdiction = searchParams.get('jurisdiction') as JurisdictionCode | null;
    const classification = searchParams.get('classification') as DocumentClassification | null;
    const search = searchParams.get('search')?.toLowerCase().trim();
    const isStarredFilter = searchParams.get('starred') === 'true';

    // Query live binding statutory instruments (global baseline + current tenant's custom ingestions)
    const { data: instruments, error: instError } = await (db.from('regulatory_instruments') as any)
      .select(`
        id,
        organization_id,
        title,
        short_name,
        instrument_type,
        overview,
        scope,
        key_requirement_areas,
        domain,
        jurisdiction,
        classification,
        is_binding,
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
          verification_notes,
          is_active
        )
      `)
      .eq('is_binding', true)
      .or(`organization_id.is.null,organization_id.eq.${tenantCtx.organizationId}`)
      .order('created_at', { ascending: false });

    if (instError) {
      logger.error({ error: instError.message }, 'Database query failed in GET /api/library');
      return NextResponse.json(
        { success: false, error: `Failed to query statutory instruments: ${instError.message}` },
        { status: 500 }
      );
    }

    const activeVersionIds: string[] = [];
    const allVersionIds: string[] = [];
    for (const inst of instruments || []) {
      for (const v of inst.regulatory_document_versions || []) {
        allVersionIds.push(v.id);
        if (v.is_active) activeVersionIds.push(v.id);
      }
    }

    const clauseCountByVersion = new Map<string, number>();
    const obligationsCountByVersion = new Map<string, number>();

    if (allVersionIds.length > 0) {
      const { data: clausesData, error: clausesErr } = await db
        .from('regulatory_clauses')
        .select('id, document_version_id')
        .in('document_version_id', allVersionIds);

      if (clausesErr) {
        logger.error({ error: clausesErr.message }, 'Failed counting clauses in GET /api/library');
        return NextResponse.json(
          { success: false, error: `Failed to query statutory clauses: ${clausesErr.message}` },
          { status: 500 }
        );
      }

      const clauseIds = (clausesData || []).map((c) => c.id);
      for (const clause of clausesData || []) {
        clauseCountByVersion.set(
          clause.document_version_id,
          (clauseCountByVersion.get(clause.document_version_id) || 0) + 1
        );
      }

      if (clauseIds.length > 0) {
        const { data: oblsData, error: oblsErr } = await db
          .from('regulatory_obligations')
          .select('id, clause_id')
          .in('clause_id', clauseIds);

        if (oblsErr) {
          logger.error({ error: oblsErr.message }, 'Failed counting obligations in GET /api/library');
          return NextResponse.json(
            { success: false, error: `Failed to query statutory obligations: ${oblsErr.message}` },
            { status: 500 }
          );
        }

        const obligationsCountByClause = new Map<string, number>();
        for (const obl of oblsData || []) {
          obligationsCountByClause.set(
            obl.clause_id,
            (obligationsCountByClause.get(obl.clause_id) || 0) + 1
          );
        }

        for (const clause of clausesData || []) {
          const oblCount = obligationsCountByClause.get(clause.id) || 0;
          obligationsCountByVersion.set(
            clause.document_version_id,
            (obligationsCountByVersion.get(clause.document_version_id) || 0) + oblCount
          );
        }
      }
    }

    const allUnfilteredItems: RegulatoryInstrumentPresentation[] = (instruments || [])
      .map((inst: any) => {
        const body = inst.regulatory_bodies;
        const versions = (inst.regulatory_document_versions || []).filter((v: any) => v.is_active);
        const allVers = inst.regulatory_document_versions || [];
        const activeVersion = versions[0] || allVers[0] || null;

        // Skip instruments whose only version was explicitly deactivated (e.g. corrupted portal HTML)
        if (allVers.length > 0 && versions.length === 0) {
          return null;
        }

        let sectionsCount = activeVersion ? clauseCountByVersion.get(activeVersion.id) || 0 : 0;
        if (sectionsCount === 0) {
          sectionsCount = versions.reduce(
            (acc: number, v: any) => acc + (clauseCountByVersion.get(v.id) || 0),
            0
          );
        }

        let totalObligationsCount = activeVersion ? obligationsCountByVersion.get(activeVersion.id) || 0 : 0;
        if (totalObligationsCount === 0) {
          totalObligationsCount = versions.reduce(
            (acc: number, v: any) => acc + (obligationsCountByVersion.get(v.id) || 0),
            0
          );
        }

        const datesOmittedInSource =
          activeVersion?.verification_notes === 'DATES_NOT_EXPLICITLY_SPECIFIED_IN_SOURCE_TEXT';

        const publicationDate =
          inst.publication_date ||
          (!datesOmittedInSource ? activeVersion?.publication_date || null : null);
        const effectiveDate =
          inst.entry_into_force_date ||
          (!datesOmittedInSource ? activeVersion?.effective_date || null : null);

        let year = new Date(inst.created_at).getFullYear();
        if (publicationDate) {
          const parsedYear = new Date(publicationDate).getFullYear();
          if (!Number.isNaN(parsedYear)) year = parsedYear;
        }

        const cleanTitle =
          inst.title && inst.title.length > 5
            ? inst.title
            : inst.short_name || 'Regulatory Instrument';
        const cleanShortTitle = inst.short_name || cleanTitle;
        const citation = activeVersion?.reference_code || `${cleanShortTitle} (${year})`;

        const rawSourceUrl =
          activeVersion?.source_file_url ||
          activeVersion?.canonical_source_url ||
          inst.source_url ||
          null;
        const publicSourceUrl =
          rawSourceUrl && /^https?:\/\//i.test(rawSourceUrl) ? rawSourceUrl : null;

        return {
          id: inst.id,
          shortTitle: cleanShortTitle,
          fullTitle: cleanTitle,
          officialCitation: citation,
          regulator: body?.code || 'CBN',
          regulatorName: body?.name || 'Central Bank of Nigeria',
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
          scope: inst.scope || 'Not explicitly specified in source text',
          keyRequirementAreas: Array.isArray(inst.key_requirement_areas)
            ? inst.key_requirement_areas
            : [],
          activeVersionId: activeVersion?.id || null,
          publicationDate,
          effectiveDate,
          sourceFileUrl: publicSourceUrl,
          isStarred: Boolean(inst.is_starred),
          owner: inst.owner || 'Chief Compliance Officer',
          capturedText: inst.captured_text || null,
        } satisfies RegulatoryInstrumentPresentation;
      })
      .filter(Boolean) as RegulatoryInstrumentPresentation[];

    // Calculate live domain statistics across the tenant's full library before filtering
    const dynamicDomains = REGULATORY_DOMAINS.map((dom) => {
      const matching = allUnfilteredItems.filter((i) => i.domain === dom.code);
      const totalObligations = matching.reduce((sum, i) => sum + (i.totalObligationsCount || 0), 0);
      return {
        ...dom,
        totalInstruments: matching.length,
        totalObligations,
      };
    });

    let filteredItems = [...allUnfilteredItems];

    // Apply Domain / Topic filter (supports both RegulatoryDomainCode and /overview topic keys)
    if (rawDomainParam && rawDomainParam.toUpperCase() !== 'ALL') {
      const mappedDomains = TOPIC_TO_DOMAIN_MAP[rawDomainParam.toLowerCase()];
      if (mappedDomains && mappedDomains.length > 0) {
        filteredItems = filteredItems.filter((i) =>
          mappedDomains.includes(i.domain as RegulatoryDomainCode)
        );
      } else {
        const upperDom = rawDomainParam.toUpperCase();
        filteredItems = filteredItems.filter((i) => i.domain.toUpperCase() === upperDom);
      }
    }

    if (jurisdiction && jurisdiction !== ('ALL' as any)) {
      filteredItems = filteredItems.filter((i) => i.jurisdiction === jurisdiction);
    }

    if (classification && classification !== ('ALL' as any)) {
      filteredItems = filteredItems.filter((i) => i.classification === classification);
    }

    if (regulator && regulator.toUpperCase() !== 'ALL') {
      filteredItems = filteredItems.filter(
        (i) => i.regulator.toUpperCase() === regulator.toUpperCase()
      );
    }

    if (isStarredFilter) {
      filteredItems = filteredItems.filter((i) => Boolean(i.isStarred));
    }

    if (search) {
      filteredItems = filteredItems.filter(
        (i) =>
          i.shortTitle.toLowerCase().includes(search) ||
          i.fullTitle.toLowerCase().includes(search) ||
          i.officialCitation.toLowerCase().includes(search) ||
          i.regulator.toLowerCase().includes(search) ||
          (i.description && i.description.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      success: true,
      totalCount: filteredItems.length,
      domains: dynamicDomains,
      instruments: filteredItems,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Unexpected error in GET /api/library');
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
