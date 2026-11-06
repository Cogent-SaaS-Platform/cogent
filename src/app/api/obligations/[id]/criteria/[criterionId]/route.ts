import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/shared/db';
import { getTenantContext } from '@/shared/auth';
import { verifyEntitlement } from '@/lib/plans';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; criterionId: string }> }
) {
  try {
    const { id: obligationId, criterionId } = await params;
    const db = createAdminClient();
    const tenantCtx = await getTenantContext({
      allowDevFallback: process.env.NODE_ENV !== 'production',
    });

    const entitlement = await verifyEntitlement(
      db,
      tenantCtx.organizationId,
      'EDIT_OBLIGATION_CRITERIA'
    );
    if (!entitlement.allowed) {
      return NextResponse.json(entitlement.errorPayload, { status: entitlement.statusCode });
    }

    const body = await req.json();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(obligationId);

    if (isUuid) {
      // 1. Update relational table if exists
      const critUpdates: Record<string, any> = {};
      if (body.type !== undefined) critUpdates.criterion_type = body.type;
      if (body.text !== undefined) critUpdates.criterion_text = body.text;

      if (Object.keys(critUpdates).length > 0) {
        critUpdates.updated_at = new Date().toISOString();
        const { error: updateErr } = await ((db as any).from('obligation_assessment_criteria'))
          .update(critUpdates)
          .eq('id', criterionId);

        if (updateErr) {
          logger.error({ error: updateErr.message, criterionId }, 'Failed updating criterion row');
          return NextResponse.json(
            { success: false, error: `Database error updating criterion: ${updateErr.message}` },
            { status: 500 }
          );
        }
      }

      // 2. Sync to JSONB array on regulatory_obligations
      const { data: obl } = await (db.from('regulatory_obligations') as any)
        .select('id, code, assessment_criteria, clause_id')
        .eq('id', obligationId)
        .maybeSingle();

      if (obl) {
        const criteria = Array.isArray(obl.assessment_criteria) ? [...obl.assessment_criteria] : [];
        const updated = criteria.map((c: any) => {
          if (c.id === criterionId) {
            return {
              ...c,
              type: body.type !== undefined ? body.type : c.type,
              text: body.text !== undefined ? body.text : c.text,
            };
          }
          return c;
        });

        await (db.from('regulatory_obligations') as any)
          .update({ assessment_criteria: updated })
          .eq('id', obligationId);

        // Audit log
        try {
          const inputHash = crypto.createHash('sha256').update(JSON.stringify({ criterionId, body })).digest('hex');
          const outputHash = crypto.createHash('sha256').update(JSON.stringify(updated)).digest('hex');
          const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantCtx.userId || '');

          await (db.from('audit_logs') as any).insert({
            id: crypto.randomUUID(),
            organization_id: tenantCtx.organizationId,
            user_id: isUserUuid ? tenantCtx.userId : null,
            action: 'OBLIGATION_CRITERION_UPDATED',
            entity_type: 'regulatory_obligation',
            entity_id: obligationId,
            sha256_input_hash: inputHash,
            sha256_output_hash: outputHash,
            metadata: { criterionId, updated: body },
            created_at: new Date().toISOString(),
          });

          const { data: clause } = await (db.from('regulatory_clauses') as any)
            .select('document_version_id')
            .eq('id', obl.clause_id)
            .maybeSingle();

          if (clause?.document_version_id) {
            const { data: ver } = await (db.from('regulatory_document_versions') as any)
              .select('instrument_id')
              .eq('id', clause.document_version_id)
              .maybeSingle();

            if (ver?.instrument_id) {
              const { data: inst } = await (db.from('regulatory_instruments') as any)
                .select('audit_logs')
                .eq('id', ver.instrument_id)
                .maybeSingle();

              const logs = Array.isArray(inst?.audit_logs) ? inst.audit_logs : [];
              await (db.from('regulatory_instruments') as any)
                .update({
                  audit_logs: [
                    ...logs,
                    {
                      id: crypto.randomUUID(),
                      timestamp: new Date().toISOString(),
                      action: `Assessment criterion ${criterionId.slice(0, 8)} updated on ${obl.code || obligationId.slice(0, 8)}`,
                      author: 'Compliance Officer',
                    },
                  ],
                })
                .eq('id', ver.instrument_id);
            }
          }
        } catch (auditErr: unknown) {
          logger.warn({ err: String(auditErr), obligationId }, 'Failed recording audit log for criterion update');
        }
      }
    }

    return NextResponse.json({
      success: true,
      criterionId,
      updated: body,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed in PATCH criterion');
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; criterionId: string }> }
) {
  try {
    const { id: obligationId, criterionId } = await params;
    const db = createAdminClient();
    const tenantCtx = await getTenantContext({
      allowDevFallback: process.env.NODE_ENV !== 'production',
    });

    const entitlement = await verifyEntitlement(
      db,
      tenantCtx.organizationId,
      'EDIT_OBLIGATION_CRITERIA'
    );
    if (!entitlement.allowed) {
      return NextResponse.json(entitlement.errorPayload, { status: entitlement.statusCode });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(obligationId);

    if (isUuid) {
      // 1. Delete from relational table
      const { error: deleteErr } = await ((db as any).from('obligation_assessment_criteria'))
        .delete()
        .eq('id', criterionId);

      if (deleteErr) {
        logger.error({ error: deleteErr.message, criterionId }, 'Failed deleting criterion row');
        return NextResponse.json(
          { success: false, error: `Database error deleting criterion: ${deleteErr.message}` },
          { status: 500 }
        );
      }

      // 2. Sync to JSONB array on regulatory_obligations
      const { data: obl } = await (db.from('regulatory_obligations') as any)
        .select('id, code, assessment_criteria, clause_id')
        .eq('id', obligationId)
        .maybeSingle();

      if (obl) {
        const criteria = Array.isArray(obl.assessment_criteria) ? obl.assessment_criteria : [];
        const filtered = criteria.filter((c: any) => c.id !== criterionId);

        await (db.from('regulatory_obligations') as any)
          .update({ assessment_criteria: filtered })
          .eq('id', obligationId);

        // Audit log
        try {
          await (db.from('audit_logs') as any).insert({
            organization_id: tenantCtx.organizationId,
            actor_id: tenantCtx.userId,
            action: 'OBLIGATION_CRITERION_DELETED',
            resource_type: 'regulatory_obligation',
            resource_id: obligationId,
            metadata: { criterionId },
          });

          const { data: clause } = await (db.from('regulatory_clauses') as any)
            .select('document_version_id')
            .eq('id', obl.clause_id)
            .maybeSingle();

          if (clause?.document_version_id) {
            const { data: ver } = await (db.from('regulatory_document_versions') as any)
              .select('instrument_id')
              .eq('id', clause.document_version_id)
              .maybeSingle();

            if (ver?.instrument_id) {
              const { data: inst } = await (db.from('regulatory_instruments') as any)
                .select('audit_logs')
                .eq('id', ver.instrument_id)
                .maybeSingle();

              const logs = Array.isArray(inst?.audit_logs) ? inst.audit_logs : [];
              await (db.from('regulatory_instruments') as any)
                .update({
                  audit_logs: [
                    ...logs,
                    {
                      id: crypto.randomUUID(),
                      timestamp: new Date().toISOString(),
                      action: `Assessment criterion deleted from ${obl.code || obligationId.slice(0, 8)}`,
                      author: 'Compliance Officer',
                    },
                  ],
                })
                .eq('id', ver.instrument_id);
            }
          }
        } catch (auditErr: unknown) {
          logger.warn({ err: String(auditErr), obligationId }, 'Failed recording audit log for criterion deletion');
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Criterion deleted successfully',
      criterionId,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed in DELETE criterion');
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
