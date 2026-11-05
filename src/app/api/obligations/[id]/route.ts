import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/shared/db';
import { getTenantContext } from '@/shared/auth';
import { verifyEntitlement } from '@/lib/plans';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/obligations/[id]
 * Updates obligation fields: ruleType, policyApplicability, status, isRelevant, isStarred, assignee, clauseId (section change)
 * Automatically appends an immutable audit log entry.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createAdminClient();
    const tenantCtx = await getTenantContext({ allowDevFallback: true });

    // Enforce Pro entitlement for inline editing of obligations & criteria
    const entitlement = await verifyEntitlement(db, tenantCtx.organizationId, 'EDIT_OBLIGATION_CRITERIA');
    if (!entitlement.allowed) {
      return NextResponse.json(entitlement.errorPayload, { status: entitlement.statusCode });
    }

    const body = await req.json();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (!isUuid) {
      // Dev/seed fallback
      return NextResponse.json({
        success: true,
        message: 'Updated obligation in mock memory',
        obligationId: id,
        updated: body,
      });
    }

    // 1. Fetch existing obligation to find clause and instrument
    const { data: existingObl, error: fetchErr } = await (db.from('regulatory_obligations') as any)
      .select('id, clause_id, code, title, rule_type, policy_applicability, status, is_relevant, is_starred, assigned_to')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !existingObl) {
      return NextResponse.json({ success: false, error: 'Obligation not found' }, { status: 404 });
    }

    // 2. Build updates
    const updates: Record<string, any> = {};
    const auditChanges: string[] = [];

    if (body.ruleType !== undefined && body.ruleType !== existingObl.rule_type) {
      updates.rule_type = body.ruleType;
      auditChanges.push(`Rule Nature changed from "${existingObl.rule_type}" to "${body.ruleType}"`);
    }

    if (body.policyApplicability !== undefined && body.policyApplicability !== existingObl.policy_applicability) {
      updates.policy_applicability = body.policyApplicability;
      auditChanges.push(`Policy Applicability updated to "${body.policyApplicability}"`);
    }

    if (body.status !== undefined && body.status !== existingObl.status) {
      updates.status = body.status;
      auditChanges.push(`Review Status updated to "${body.status}"`);
    }

    if (body.isRelevant !== undefined && body.isRelevant !== existingObl.is_relevant) {
      updates.is_relevant = Boolean(body.isRelevant);
      auditChanges.push(`Institutional Relevance set to ${body.isRelevant ? 'TRUE' : 'FALSE'}`);
    }

    if (body.isStarred !== undefined) {
      updates.is_starred = Boolean(body.isStarred);
    }

    if (body.clauseId !== undefined && body.clauseId !== existingObl.clause_id) {
      updates.clause_id = body.clauseId;
      auditChanges.push(`Reassigned to Section ID: ${body.clauseId}`);
    }

    if (body.assignee !== undefined) {
      updates.assigned_to = body.assignee;
      auditChanges.push(`Assignee updated to ${body.assignee?.name || 'Unassigned'}`);
    }

    if (body.title !== undefined) {
      updates.title = body.title;
      auditChanges.push(`Title updated`);
    }

    if (body.description !== undefined) {
      updates.description = body.description;
      updates.summary = body.description;
      auditChanges.push(`Requirement statement updated`);
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await (db.from('regulatory_obligations') as any)
        .update(updates)
        .eq('id', id);

      if (updateErr) {
        throw updateErr;
      }
    }

    // 3. Record Audit Log in Parent Instrument
    if (auditChanges.length > 0) {
      try {
        const { data: clause } = await (db.from('regulatory_clauses') as any)
          .select('document_version_id')
          .eq('id', existingObl.clause_id)
          .maybeSingle();

        if (clause?.document_version_id) {
          const { data: ver } = await (db.from('regulatory_document_versions') as any)
            .select('instrument_id')
            .eq('id', clause.document_version_id)
            .maybeSingle();

          if (ver?.instrument_id) {
            const auditEntry = {
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              action: `Obligation ${existingObl.code || id.slice(0, 8)} updated: ${auditChanges.join(', ')}`,
              author: 'Compliance Officer',
            };

            const { data: inst } = await (db.from('regulatory_instruments') as any)
              .select('audit_logs')
              .eq('id', ver.instrument_id)
              .maybeSingle();

            const existingLogs = Array.isArray(inst?.audit_logs) ? inst.audit_logs : [];
            await (db.from('regulatory_instruments') as any)
              .update({
                audit_logs: [...existingLogs, auditEntry],
              })
              .eq('id', ver.instrument_id);
          }
        }
      } catch (logErr) {
        logger.warn({ error: String(logErr) }, 'Non-fatal audit log persistence warning');
      }
    }

    return NextResponse.json({
      success: true,
      obligationId: id,
      updated: updates,
      auditChanges,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed in PATCH /api/obligations/[id]');
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update obligation' },
      { status: 500 }
    );
  }
}
