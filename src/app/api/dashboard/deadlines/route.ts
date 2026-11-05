import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getTenantContext } from '@/shared/auth';
import { createAdminClient } from '@/shared/db';
import { logger } from '@/shared/logger';
import { RegulatorCode } from '@/shared/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const organizationId = tenantCtx.organizationId;
    const db = createAdminClient();

    const body = await req.json();
    const { title, regulatorCode, dueDate, summary, priority = 'HIGH', sourceModule = 'horizon' } = body;

    if (!title || !regulatorCode || !dueDate) {
      return NextResponse.json(
        { success: false, error: 'Title, regulatorCode, and dueDate are required.' },
        { status: 400 }
      );
    }

    const reg = (regulatorCode as string).toUpperCase() as RegulatorCode;
    const cleanDueDate = dueDate.slice(0, 10);
    const circularNumber = `${reg}/DEADLINE/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

    const newAlert = {
      circular_number: circularNumber,
      subject: title.trim(),
      summary: summary?.trim() || `Statutory compliance filing deadline established under ${reg} supervisory oversight.`,
      issuance_date: new Date().toISOString().split('T')[0],
      statutory_deadline: cleanDueDate,
      priority: priority === 'CRITICAL' ? 'CRITICAL_EMERGENCY' : priority,
      enforcement_risk_level: priority === 'CRITICAL' ? 'CRITICAL_SANCTION_RISK' : 'HIGH',
      doc_type: 'Compliance Deadline',
      alert_type: 'Actionable',
      applies_universally: true,
      lineage_status: 'ACTIVE_LAW',
      executive_summary: summary?.trim() || `Mandatory filing requirement with ${reg}. Strict compliance proof required before ${cleanDueDate}.`,
      important_dates: [
        {
          id: `dt_dl_${Date.now()}`,
          label: 'Compliance Deadline',
          date: cleanDueDate,
          description: summary?.trim() || 'Mandatory filing proof due',
        },
      ],
    };

    const { data: inserted, error: insertError } = await (db
      .from('radar_circulars') as any)
      .insert(newAlert)
      .select('id, circular_number, subject, statutory_deadline')
      .single();

    if (insertError) {
      logger.error({ error: insertError.message }, 'Failed to insert custom deadline');
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    // Also record audit log for this filing milestone
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
          title,
          regulator: reg,
          dueDate: cleanDueDate,
          author: 'Compliance Officer',
        },
      });
    } catch {
      // Audit log non-blocking
    }

    return NextResponse.json({
      success: true,
      deadline: {
        id: `circ_${inserted.id}`,
        sourceId: inserted.id,
        sourceModule,
        title: inserted.subject,
        shortLabel: `${reg} • ${title.split(' ').slice(0, 2).join(' ')}`,
        regulatorCode: reg,
        dueDate: cleanDueDate,
        priority,
        summary: summary || title,
        targetUrl: `/insight?search=${encodeURIComponent(inserted.circular_number)}`,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed adding deadline');
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
