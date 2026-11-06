import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getTenantContext } from '@/shared/auth';
import { createAdminClient } from '@/shared/db';
import { logger } from '@/shared/logger';
import { RegulatorCode } from '@/shared/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const queryOrgId = searchParams.get('organizationId');
    const organizationId =
      tenantCtx.isDevFallback && queryOrgId ? queryOrgId : tenantCtx.organizationId;
    const db = createAdminClient();

    const { data, error } = await (db.from('compliance_deadlines') as any)
      .select('*')
      .eq('organization_id', organizationId)
      .order('due_date', { ascending: true });

    if (error) {
      logger.error({ error: error.message, organizationId }, 'Failed fetching compliance deadlines');
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deadlines: data || [],
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed fetching deadlines');
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const organizationId = tenantCtx.organizationId;
    const db = createAdminClient();

    const body = await req.json();
    const {
      title,
      regulatorCode,
      dueDate,
      summary,
      priority = 'HIGH',
      sourceModule = 'horizon',
      sourceId = null,
      targetUrl = null,
    } = body;

    if (!title || !regulatorCode || !dueDate) {
      return NextResponse.json(
        { success: false, error: 'Title, regulatorCode, and dueDate are required.' },
        { status: 400 }
      );
    }

    const reg = (regulatorCode as string).toUpperCase() as RegulatorCode;
    const cleanDueDate = String(dueDate).slice(0, 10);
    const cleanModule = ['horizon', 'library', 'gap', 'marketing'].includes(sourceModule)
      ? sourceModule
      : 'horizon';

    const resolvedTargetUrl =
      targetUrl ||
      (cleanModule === 'library'
        ? '/library'
        : cleanModule === 'gap'
        ? '/gap'
        : cleanModule === 'marketing'
        ? '/marketing'
        : '/insight');

    const { data: inserted, error: insertError } = await (
      db.from('compliance_deadlines') as any
    )
      .insert({
        organization_id: organizationId,
        title: String(title).trim(),
        regulator_code: reg,
        source_module: cleanModule,
        source_id: sourceId,
        due_date: cleanDueDate,
        summary: summary ? String(summary).trim() : null,
        target_url: resolvedTargetUrl,
        priority: priority === 'CRITICAL' ? 'CRITICAL_EMERGENCY' : priority,
        is_completed: false,
      })
      .select('*')
      .single();

    if (insertError) {
      logger.error({ error: insertError.message, organizationId }, 'Failed to insert custom compliance deadline');
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    try {
      const inputHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
      const outputHash = crypto.createHash('sha256').update(JSON.stringify(inserted)).digest('hex');
      await (db.from('audit_logs') as any).insert({
        organization_id: organizationId,
        entity_id: inserted.id,
        entity_type: 'compliance_deadline',
        action: 'CREATE_STATUTORY_DEADLINE',
        sha256_input_hash: inputHash,
        sha256_output_hash: outputHash,
        metadata: {
          title: inserted.title,
          regulator: reg,
          dueDate: cleanDueDate,
          sourceModule: cleanModule,
        },
      });
    } catch (auditErr) {
      logger.warn({ err: String(auditErr) }, 'Failed recording audit log for compliance deadline');
    }

    const daysRemaining = Math.ceil(
      (new Date(cleanDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return NextResponse.json({
      success: true,
      deadline: {
        id: `custom_${inserted.id}`,
        sourceId: inserted.source_id || inserted.id,
        sourceModule: cleanModule,
        title: inserted.title,
        shortLabel: `${reg} • ${String(title).trim().split(/\s+/).slice(0, 2).join(' ')}`,
        regulatorCode: reg,
        dueDate: cleanDueDate,
        daysRemaining,
        priority: inserted.priority,
        summary: inserted.summary || inserted.title,
        targetUrl: resolvedTargetUrl,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed adding deadline');
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
