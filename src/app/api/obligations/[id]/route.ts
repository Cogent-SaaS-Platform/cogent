import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/shared/db';
import { getTenantContext } from '@/shared/auth';
import { verifyEntitlement } from '@/lib/plans';
import { logger } from '@/shared/logger';
import { ObligationType } from '@/shared/types';

export const dynamic = 'force-dynamic';

function mapRuleTypeToObligationEnum(ruleType: string): ObligationType {
  switch (ruleType) {
    case 'Prohibitive':
      return 'STRICT_PROHIBITION';
    case 'Conditional':
      return 'CONDITIONAL_PERMISSION';
    case 'Prescriptive':
      return 'MANDATORY_DISCLOSURE';
    case 'Risk Based':
    default:
      return 'GOVERNANCE_CONTROL';
  }
}

/**
 * PATCH /api/obligations/[id]
 * Updates obligation fields (ruleType, policyApplicability, status, isRelevant, isStarred, assignee, clauseId, title, description)
 * AND synchronizes edited/added/deleted assessment criteria in obligation_assessment_criteria + regulatory_obligations.assessment_criteria.
 * Appends immutable audit log entries to both regulatory_instruments.audit_logs and global audit_logs.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createAdminClient();
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const body = await req.json();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      return NextResponse.json({
        success: true,
        id,
        updated: body,
      });
    }

    // Only structural inline edits (ruleType, policyApplicability, clauseId, title, description, criteria)
    // require EDIT_OBLIGATION_CRITERIA; row-level workflow toggles (status, isRelevant, isStarred, assignee)
    // are allowed on all active plans.
    const isStructuralEdit =
      body.ruleType !== undefined ||
      body.policyApplicability !== undefined ||
      body.clauseId !== undefined ||
      body.title !== undefined ||
      body.description !== undefined ||
      Array.isArray(body.criteria);

    if (isStructuralEdit) {
      const entitlement = await verifyEntitlement(
        db,
        tenantCtx.organizationId,
        'EDIT_OBLIGATION_CRITERIA'
      );
      if (!entitlement.allowed) {
        return NextResponse.json(entitlement.errorPayload, { status: entitlement.statusCode });
      }
    }

    // 1. Fetch existing obligation
    const { data: existingObl, error: fetchErr } = await (db.from('regulatory_obligations') as any)
      .select(
        'id, clause_id, code, title, description, rule_type, policy_applicability, status, is_relevant, is_starred, assigned_to, assessment_criteria'
      )
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
      updates.obligation_type = mapRuleTypeToObligationEnum(body.ruleType);
      auditChanges.push(`Rule Nature changed from "${existingObl.rule_type}" to "${body.ruleType}"`);
    }

    if (
      body.policyApplicability !== undefined &&
      body.policyApplicability !== existingObl.policy_applicability
    ) {
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

    if (body.isStarred !== undefined && body.isStarred !== existingObl.is_starred) {
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

    if (body.title !== undefined && body.title !== existingObl.title) {
      updates.title = body.title;
      auditChanges.push(`Title updated to "${body.title}"`);
    }

    if (body.description !== undefined && body.description !== existingObl.description) {
      updates.description = body.description;
      updates.summary = body.description;
      auditChanges.push('Requirement statement updated');
    }

    // 3. Synchronize Assessment Criteria when provided from Inline Edit Mode (✎)
    let persistedCriteria: any[] | undefined;
    if (Array.isArray(body.criteria)) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const nowIso = new Date().toISOString();

      const sanitizedCriteria = body.criteria
        .filter((c: any) => c && String(c.text || '').trim().length > 0)
        .map((c: any, idx: number) => {
          const validId = c.id && uuidRegex.test(String(c.id)) ? String(c.id) : crypto.randomUUID();
          const cType = c.type === 'Best Practice' ? 'Best Practice' : 'Core Criteria';
          return {
            id: validId,
            type: cType,
            text: String(c.text).trim(),
            evidenceRequired:
              c.evidenceRequired ||
              'Approved institutional policy document or standard operating procedure',
            isMandatory: cType === 'Core Criteria',
            orderIndex: idx + 1,
          };
        });

      // Replace relational rows cleanly for this obligation
      const { error: delErr } = await (db as any)
        .from('obligation_assessment_criteria')
        .delete()
        .eq('obligation_id', id);

      if (delErr) {
        throw delErr;
      }

      if (sanitizedCriteria.length > 0) {
        const relationalRows = sanitizedCriteria.map((c: any) => ({
          id: c.id,
          obligation_id: id,
          criterion_type: c.type,
          criterion_text: c.text,
          evidence_required: c.evidenceRequired,
          is_mandatory: c.isMandatory,
          order_index: c.orderIndex,
          created_at: nowIso,
        }));

        const { error: insCritErr } = await (db as any)
          .from('obligation_assessment_criteria')
          .insert(relationalRows);

        if (insCritErr) {
          throw insCritErr;
        }
      }

      persistedCriteria = sanitizedCriteria.map(({ orderIndex: _oi, ...rest }: any) => rest);
      updates.assessment_criteria = persistedCriteria;
      auditChanges.push(`Assessment Criteria synchronized (${sanitizedCriteria.length} criteria)`);
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await (db.from('regulatory_obligations') as any)
        .update(updates)
        .eq('id', id);

      if (updateErr) {
        throw updateErr;
      }
    }

    // 4. Record Audit Log in Parent Instrument + Global audit_logs
    if (auditChanges.length > 0) {
      const targetClauseId = updates.clause_id || existingObl.clause_id;
      const nowIso = new Date().toISOString();

      const { data: clause } = await (db.from('regulatory_clauses') as any)
        .select('document_version_id')
        .eq('id', targetClauseId)
        .maybeSingle();

      let parentInstrumentId: string | null = null;

      if (clause?.document_version_id) {
        const { data: ver } = await (db.from('regulatory_document_versions') as any)
          .select('instrument_id')
          .eq('id', clause.document_version_id)
          .maybeSingle();

        if (ver?.instrument_id) {
          parentInstrumentId = ver.instrument_id;
          const auditEntry = {
            id: crypto.randomUUID(),
            timestamp: nowIso,
            action: `Obligation ${existingObl.code || id.slice(0, 8)} updated: ${auditChanges.join('; ')}`,
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

      await db.from('audit_logs').insert({
        organization_id: tenantCtx.organizationId,
        user_id: tenantCtx.userId || null,
        action: 'OBLIGATION_UPDATED',
        entity_type: 'regulatory_obligation',
        entity_id: id,
        sha256_input_hash: crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex'),
        sha256_output_hash: crypto.createHash('sha256').update(JSON.stringify(updates)).digest('hex'),
        metadata: {
          obligationCode: existingObl.code,
          instrumentId: parentInstrumentId,
          auditChanges,
        },
      });
    }

    return NextResponse.json({
      success: true,
      obligationId: id,
      updated: updates,
      criteria: persistedCriteria,
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
