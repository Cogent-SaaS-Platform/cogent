import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getTenantContext } from '@/shared/auth';
import { createAdminClient } from '@/shared/db';
import { logger } from '@/shared/logger';
import { RegulatoryInstrumentPresentation } from '@/modules/regulatory/types';
import {
  isFakeOrNonStatutory,
  classifyInstrumentDomainAndType,
} from '@/modules/regulatory/utils/statutoryUtils';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const db = createAdminClient();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      return NextResponse.json(
        { success: false, error: `Invalid statutory instrument identifier: ${id}` },
        { status: 400 }
      );
    }

    const { data: inst, error } = await (db.from('regulatory_instruments') as any)
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
        comments,
        audit_logs,
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
      .eq('id', id)
      .or(`organization_id.is.null,organization_id.eq.${tenantCtx.organizationId}`)
      .maybeSingle();

    if (error) {
      logger.error({ error: error.message, id }, 'Database error in GET /api/library/[id]');
      return NextResponse.json(
        { success: false, error: `Database query failed: ${error.message}` },
        { status: 500 }
      );
    }

    if (!inst) {
      return NextResponse.json(
        { success: false, error: `Regulatory instrument not found for ID: ${id}` },
        { status: 404 }
      );
    }

    const body = inst.regulatory_bodies;
    const versions = inst.regulatory_document_versions || [];
    const activeVersion = versions.find((v: any) => v.is_active) || versions[0] || null;
    const versionId = activeVersion?.id;

    const cleanTitle =
      inst.title && inst.title.length > 5
        ? inst.title
        : inst.short_name || 'Regulatory Instrument';
    const cleanShortTitle = inst.short_name || cleanTitle;
    const citation = activeVersion?.reference_code || `${cleanShortTitle}`;

    // Reject fake stubs
    if (isFakeOrNonStatutory(cleanTitle, citation) || isFakeOrNonStatutory(cleanShortTitle, citation)) {
      return NextResponse.json(
        { success: false, error: 'Target document is a non-binding notice or deprecated test stub.' },
        { status: 404 }
      );
    }

    let sectionsCount = 0;
    let totalObligationsCount = 0;
    let assembledClauseText = '';

    if (versionId) {
      const { data: clauses } = await db
        .from('regulatory_clauses')
        .select('id, section_reference, section_heading, clause_text')
        .eq('document_version_id', versionId)
        .order('created_at', { ascending: true });

      if (clauses && clauses.length > 0) {
        sectionsCount = clauses.length;
        assembledClauseText = clauses
          .map(
            (c: any) =>
              `${c.section_reference}${c.section_heading ? ` — ${c.section_heading}` : ''}\n${c.clause_text}`
          )
          .join('\n\n');

        const clauseIds = clauses.map((c) => c.id);
        const { count } = await db
          .from('regulatory_obligations')
          .select('id', { count: 'exact', head: true })
          .in('clause_id', clauseIds);
        totalObligationsCount = count || 0;
      }
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

    // Dynamic Domain and Type Classification
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

    // Professional Overview & Scope (Never repeat title or hardcoded 6 words)
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

    const rawSourceUrl =
      activeVersion?.source_file_url ||
      activeVersion?.canonical_source_url ||
      inst.source_url ||
      null;
    const publicSourceUrl =
      rawSourceUrl && /^https?:\/\//i.test(rawSourceUrl) ? rawSourceUrl : null;

    const presentation: RegulatoryInstrumentPresentation = {
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
      status: activeVersion?.is_active ? 'ACTIVE_LAW' : 'AMENDED',
      description: overview,
      overview,
      scope,
      keyRequirementAreas,
      activeVersionId: versionId || null,
      publicationDate,
      effectiveDate,
      sourceFileUrl: publicSourceUrl,
      isStarred: Boolean(inst.is_starred),
      owner: inst.owner || 'Chief Compliance Officer',
      comments: Array.isArray(inst.comments) ? inst.comments : [],
      auditLogs: Array.isArray(inst.audit_logs) && inst.audit_logs.length > 0
        ? inst.audit_logs
        : [
            {
              id: `init-${inst.id}`,
              timestamp: inst.created_at || new Date().toISOString(),
              action: 'Statutory instrument indexed in Regulation Library',
              author: inst.owner || 'Chief Compliance Officer',
            },
          ],
      capturedText: inst.captured_text || assembledClauseText || null,
    };

    return NextResponse.json({
      success: true,
      instrument: presentation,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed in GET /api/library/[id]');
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch instrument details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const db = createAdminClient();
    const body = await req.json();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      return NextResponse.json(
        { success: false, error: 'Invalid statutory instrument UUID' },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchErr } = await (db.from('regulatory_instruments') as any)
      .select('id, organization_id, owner, comments, audit_logs')
      .eq('id', id)
      .or(`organization_id.is.null,organization_id.eq.${tenantCtx.organizationId}`)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json(
        { success: false, error: 'Instrument not found or unauthorized' },
        { status: 404 }
      );
    }

    const updates: Record<string, any> = {};

    if (body.owner !== undefined) {
      updates.owner = body.owner;
      const currentLogs = Array.isArray(existing.audit_logs) ? existing.audit_logs : [];
      updates.audit_logs = [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: `Assigned Regulatory Lead updated to: ${body.owner}`,
          author: 'Chief Compliance Officer',
        },
        ...currentLogs,
      ];
    }

    if (body.isStarred !== undefined) {
      updates.is_starred = Boolean(body.isStarred);
    }

    if (body.newComment) {
      const currentComments = Array.isArray(existing.comments) ? existing.comments : [];
      const newComment = {
        id: `comm-${Date.now()}`,
        author: body.newComment.author || 'Chief Compliance Officer',
        role: body.newComment.role || 'Compliance Lead',
        text: String(body.newComment.text || '').trim(),
        createdAt: new Date().toISOString(),
      };
      updates.comments = [...currentComments, newComment];

      const currentLogs = Array.isArray(existing.audit_logs) ? existing.audit_logs : [];
      updates.audit_logs = [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'Statutory comment added',
          author: body.newComment.author || 'Chief Compliance Officer',
        },
        ...currentLogs,
      ];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true, message: 'No updates specified' });
    }

    const { error: updateErr } = await (db.from('regulatory_instruments') as any)
      .update(updates)
      .eq('id', id);

    if (updateErr) {
      logger.error({ error: updateErr.message, id }, 'Failed updating instrument in PATCH /api/library/[id]');
      return NextResponse.json(
        { success: false, error: `Failed updating instrument: ${updateErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Instrument successfully updated',
      updates,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Unexpected error in PATCH /api/library/[id]');
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
