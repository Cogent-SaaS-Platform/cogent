import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getTenantContext } from '@/shared/auth';
import { createAdminClient } from '@/shared/db';
import { logger } from '@/shared/logger';
import { RegulatoryInstrumentPresentation } from '@/modules/regulatory/types';

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

    const rawSourceUrl =
      activeVersion?.source_file_url ||
      activeVersion?.canonical_source_url ||
      inst.source_url ||
      null;
    const publicSourceUrl =
      rawSourceUrl && /^https?:\/\//i.test(rawSourceUrl) ? rawSourceUrl : null;

    const presentation: RegulatoryInstrumentPresentation = {
      id: inst.id,
      shortTitle: inst.short_name || inst.title,
      fullTitle: inst.title,
      officialCitation:
        activeVersion?.reference_code || `${inst.short_name || inst.title} (${year})`,
      regulator: body?.code || 'CBN',
      regulatorName: body?.name || 'Central Bank of Nigeria',
      instrumentType: inst.instrument_type || 'SUBSIDIARY_REGULATION',
      domain: inst.domain || 'FINTECH_PAYMENTS',
      jurisdiction: inst.jurisdiction || 'NG',
      classification: inst.classification || 'SUBSIDIARY_REGULATION',
      year,
      sectionsCount,
      totalObligationsCount,
      status: activeVersion?.is_active ? 'ACTIVE_LAW' : 'AMENDED',
      description: inst.overview || inst.title,
      overview: inst.overview || inst.title,
      scope: inst.scope || 'Not explicitly specified in source text',
      keyRequirementAreas: Array.isArray(inst.key_requirement_areas)
        ? inst.key_requirement_areas
        : [],
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

    if (fetchErr) {
      throw fetchErr;
    }

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Instrument not found' }, { status: 404 });
    }

    const updates: Record<string, any> = {};
    const auditLogs = Array.isArray(existing.audit_logs) ? [...existing.audit_logs] : [];
    const nowIso = new Date().toISOString();

    if (body.owner !== undefined) {
      updates.owner = body.owner;
      auditLogs.push({
        id: crypto.randomUUID(),
        timestamp: nowIso,
        action: `Assigned Regulatory Lead updated to: ${body.owner}`,
        author: 'Compliance Officer',
      });
    }

    if (body.isStarred !== undefined) {
      updates.is_starred = Boolean(body.isStarred);
    }

    if (body.newComment) {
      const existingComments = Array.isArray(existing.comments) ? existing.comments : [];
      updates.comments = [
        ...existingComments,
        {
          id: crypto.randomUUID(),
          author: body.newComment.author || 'Compliance Officer',
          role: body.newComment.role || 'Chief Compliance Officer',
          text: body.newComment.text,
          createdAt: nowIso,
        },
      ];
      auditLogs.push({
        id: crypto.randomUUID(),
        timestamp: nowIso,
        action: 'Operational comment added to statutory instrument',
        author: body.newComment.author || 'Compliance Officer',
      });
    }

    updates.audit_logs = auditLogs;

    const { error: updateErr } = await (db.from('regulatory_instruments') as any)
      .update(updates)
      .eq('id', id);

    if (updateErr) {
      throw updateErr;
    }

    await db.from('audit_logs').insert({
      organization_id: tenantCtx.organizationId,
      user_id: tenantCtx.userId || null,
      action: 'REGULATION_INSTRUMENT_UPDATED',
      entity_type: 'regulatory_instrument',
      entity_id: id,
      sha256_input_hash: crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex'),
      sha256_output_hash: crypto.createHash('sha256').update(JSON.stringify(updates)).digest('hex'),
      metadata: { updatedFields: Object.keys(updates) },
    });

    return NextResponse.json({
      success: true,
      updated: updates,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed in PATCH /api/library/[id]');
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
