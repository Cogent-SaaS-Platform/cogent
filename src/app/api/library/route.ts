import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/shared/logger';
import { getTenantContext } from '@/shared/auth';
import { createAdminClient } from '@/shared/db';
import {
  DocumentClassification,
  JurisdictionCode,
  RegulatoryDomainCode,
} from '@/shared/types';
import { RegulatoryInstrumentPresentation } from '@/modules/regulatory/types';
import {
  isFakeOrNonStatutory,
  classifyInstrumentDomainAndType,
} from '@/modules/regulatory/utils/statutoryUtils';

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

// Authoritative Nigerian Apex Regulators
export const NIGERIAN_APEX_REGULATORS = [
  { code: 'CBN', name: 'Central Bank of Nigeria', flag: '🇳🇬' },
  { code: 'SEC', name: 'Securities and Exchange Commission', flag: '🇳🇬' },
  { code: 'NDPC', name: 'Nigeria Data Protection Commission', flag: '🇳🇬' },
  { code: 'FCCPC', name: 'Federal Competition & Consumer Protection Commission', flag: '🇳🇬' },
  { code: 'ARCON', name: 'Advertising Regulatory Council of Nigeria', flag: '🇳🇬' },
  { code: 'NDIC', name: 'Nigeria Deposit Insurance Corporation', flag: '🇳🇬' },
  { code: 'NFIU', name: 'Nigerian Financial Intelligence Unit', flag: '🇳🇬' },
];

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

        // Skip instruments whose only version was explicitly deactivated
        if (allVers.length > 0 && versions.length === 0) {
          return null;
        }

        const cleanTitle =
          inst.title && inst.title.length > 5
            ? inst.title
            : inst.short_name || 'Regulatory Instrument';
        const cleanShortTitle = inst.short_name || cleanTitle;
        const citation = activeVersion?.reference_code || `${cleanShortTitle}`;

        // 1. FORENSIC PURGE: Filter out fake test stubs and non-binding PR notices
        if (isFakeOrNonStatutory(cleanTitle, citation) || isFakeOrNonStatutory(cleanShortTitle, citation)) {
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

        // 2. REAL CLASSIFICATION: Infer true Domain and Instrument Type
        const classificationResult = classifyInstrumentDomainAndType({
          title: cleanTitle,
          shortName: cleanShortTitle,
          referenceCode: citation,
          regulator: body?.code || 'CBN',
          capturedText: inst.captured_text,
          currentDomain: inst.domain,
          currentType: inst.instrument_type,
        });

        const domain = classificationResult.domain;
        const instrumentType = classificationResult.instrumentType;

        const rawSourceUrl =
          activeVersion?.source_file_url ||
          activeVersion?.canonical_source_url ||
          inst.source_url ||
          null;
        const publicSourceUrl =
          rawSourceUrl && /^https?:\/\//i.test(rawSourceUrl) ? rawSourceUrl : null;

        // 3. SYNTHESIZE PROFESSIONAL OVERVIEW & SCOPE (Never repeat title or hardcoded 6 words)
        let overview = inst.overview;
        const isOverviewRepeatedTitle =
          !overview ||
          overview.trim().toLowerCase() === cleanTitle.trim().toLowerCase() ||
          overview.trim().toLowerCase() === cleanShortTitle.trim().toLowerCase();

        if (isOverviewRepeatedTitle) {
          overview = `This statutory instrument establishes binding supervisory benchmarks, operational boundaries, and compliance mandates under the regulatory authority of the ${
            body?.name || 'Central Bank of Nigeria'
          } (${body?.code || 'CBN'}). It prescribes enforceable directives to ensure institutional soundness, transaction integrity, and statutory alignment across Nigerian financial markets.`;
        }

        let scope = inst.scope;
        const isScopeHardcodedFallback =
          !scope ||
          scope.includes('Applies to regulated financial institutions in Nigeria.') ||
          scope.includes('Not explicitly specified in source text');

        if (isScopeHardcodedFallback) {
          switch (domain) {
            case 'AML_CFT':
              scope = 'Applies to all licensed financial institutions, payment service banks, capital market operators, and designated non-financial businesses and professions (DNFBPs) operating in Nigeria.';
              break;
            case 'CAPITAL_MARKETS':
              scope = 'Applies to registered capital market operators, broker-dealers, custodians, sub-custodians, and collective investment schemes under SEC regulatory oversight.';
              break;
            case 'DATA_PRIVACY_AI':
              scope = 'Applies to data controllers and data processors of major importance processing personal data of Nigerian data subjects pursuant to the Nigeria Data Protection Act 2023.';
              break;
            case 'CONSUMER_PROTECTION':
              scope = 'Applies to all licensed deposit money banks, digital lenders, payment service providers, and advertisers marketing financial products to Nigerian consumers.';
              break;
            case 'DIGITAL_LENDING':
              scope = 'Applies to digital money lenders, microfinance institutions, consumer credit platforms, and credit bureaus under active FCCPC and CBN supervisory governance.';
              break;
            case 'CRYPTO_VASP':
              scope = 'Applies to virtual asset service providers (VASPs), digital token exchanges, and custodian wallet providers licensed or operating under SEC regulatory rules.';
              break;
            case 'FINTECH_PAYMENTS':
            default:
              scope = 'Applies to licensed commercial banks, payment solution service providers (PSSPs), mobile money operators (MMOs), and switching entities under CBN oversight.';
              break;
          }
        }

        // Requirements list
        let keyRequirementAreas = Array.isArray(inst.key_requirement_areas) && inst.key_requirement_areas.length > 0
          ? inst.key_requirement_areas
          : [
              {
                title: 'Governance & Supervisory Compliance',
                description: 'Mandatory operational governance controls and reporting structures.',
              },
              {
                title: 'Audit Readiness & Supervisory Evidence',
                description: 'Preservation of tamper-evident operational logs, transactions, and supervisory filings.',
              },
              {
                title: 'Statutory Incident Notification',
                description: 'Enforceable timelines for reporting non-compliance or systemic incidents to apex regulators.',
              },
            ];

        return {
          id: inst.id,
          shortTitle: cleanShortTitle,
          fullTitle: cleanTitle,
          officialCitation: citation,
          regulator: body?.code || 'CBN',
          regulatorName: body?.name || 'Central Bank of Nigeria',
          instrumentType,
          domain,
          jurisdiction: inst.jurisdiction || 'NG',
          classification: inst.classification || instrumentType,
          year,
          sectionsCount,
          totalObligationsCount,
          status: (activeVersion?.is_active ? 'ACTIVE_LAW' : 'AMENDED') as 'ACTIVE_LAW' | 'AMENDED',
          description: overview,
          overview,
          scope,
          keyRequirementAreas,
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

    // Real dynamic domain counts across genuine instruments
    const DOMAIN_LABELS: Record<string, string> = {
      CONSUMER_PROTECTION: 'Consumer Protection & APR',
      FINTECH_PAYMENTS: 'FinTech & Payments',
      AML_CFT: 'AML/CFT & Sanctions',
      DIGITAL_LENDING: 'Digital Lending & Credit',
      DATA_PRIVACY_AI: 'Data Privacy & AI (NDPA)',
      CAPITAL_MARKETS: 'Capital Markets & Wealth',
      CRYPTO_VASP: 'Virtual Assets & Web3',
    };

    const dynamicDomains = Object.entries(DOMAIN_LABELS).map(([code, label]) => {
      const matching = allUnfilteredItems.filter((i) => i.domain === code);
      return {
        code,
        label,
        totalInstruments: matching.length,
        totalObligations: matching.reduce((sum, i) => sum + (i.totalObligationsCount || 0), 0),
      };
    });

    // Real dynamic Nigerian regulator counts
    const dynamicRegulators = NIGERIAN_APEX_REGULATORS.map((reg) => {
      const matching = allUnfilteredItems.filter((i) => i.regulator.toUpperCase() === reg.code);
      return {
        ...reg,
        count: matching.length,
      };
    });

    let filteredItems = [...allUnfilteredItems];

    // Filter by Domain
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

    // Filter by Regulator
    if (regulator && regulator.toUpperCase() !== 'ALL') {
      filteredItems = filteredItems.filter(
        (i) => i.regulator.toUpperCase() === regulator.toUpperCase()
      );
    }

    // Filter by Jurisdiction
    if (jurisdiction && jurisdiction !== ('ALL' as any)) {
      filteredItems = filteredItems.filter((i) => i.jurisdiction === jurisdiction);
    }

    if (classification && classification !== ('ALL' as any)) {
      filteredItems = filteredItems.filter((i) => i.classification === classification);
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
          (i.description && i.description.toLowerCase().includes(search)) ||
          (i.overview && i.overview.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      success: true,
      totalCount: filteredItems.length,
      totalAllCount: allUnfilteredItems.length,
      domains: dynamicDomains,
      regulators: dynamicRegulators,
      instruments: filteredItems,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Unexpected error in GET /api/library');
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
