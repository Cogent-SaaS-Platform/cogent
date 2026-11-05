import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/shared/db';
import { getTenantContext } from '@/shared/auth';
import { verifyEntitlement } from '@/lib/plans';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/obligations/[id]/criteria
 * Adds a new checkable assessment criterion to an obligation
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: obligationId } = await params;
    const db = createAdminClient();
    const tenantCtx = await getTenantContext({ allowDevFallback: true });

    // Enforce Pro entitlement for adding criteria
    const entitlement = await verifyEntitlement(db, tenantCtx.organizationId, 'EDIT_OBLIGATION_CRITERIA');
    if (!entitlement.allowed) {
      return NextResponse.json(entitlement.errorPayload, { status: entitlement.statusCode });
    }

    const body = await req.json();

    const criterionText = body.text?.trim();
    const criterionType = body.type === 'Best Practice' ? 'Best Practice' : 'Core Criteria';
    const evidenceRequired = body.evidenceRequired || 'Internal policy document or audit inspection record';

    if (!criterionText) {
      return NextResponse.json({ success: false, error: 'Criterion text is required' }, { status: 400 });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(obligationId);
    const newCriterionId = crypto.randomUUID();

    if (isUuid) {
      // 1. Insert into relational table
      await ((db as any).from('obligation_assessment_criteria')).insert({
        id: newCriterionId,
        obligation_id: obligationId,
        criterion_type: criterionType,
        criterion_text: criterionText,
        evidence_required: evidenceRequired,
        is_mandatory: criterionType === 'Core Criteria',
        order_index: 99,
      });

      // 2. Also sync to JSONB on regulatory_obligations
      const { data: obl } = await (db.from('regulatory_obligations') as any)
        .select('id, code, assessment_criteria, clause_id')
        .eq('id', obligationId)
        .maybeSingle();

      if (obl) {
        const existingCriteria = Array.isArray(obl.assessment_criteria) ? obl.assessment_criteria : [];
        const updatedCriteria = [
          ...existingCriteria,
          {
            id: newCriterionId,
            type: criterionType,
            text: criterionText,
            evidenceRequired,
            isMandatory: criterionType === 'Core Criteria',
          },
        ];

        await (db.from('regulatory_obligations') as any)
          .update({ assessment_criteria: updatedCriteria })
          .eq('id', obligationId);

        // Record audit log
        try {
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
                      action: `New ${criterionType} added to ${obl.code || obligationId.slice(0, 8)}: "${criterionText.slice(0, 60)}..."`,
                      author: 'Compliance Officer',
                    },
                  ],
                })
                .eq('id', ver.instrument_id);
            }
          }
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      criterion: {
        id: newCriterionId,
        type: criterionType,
        text: criterionText,
        evidenceRequired,
        isMandatory: criterionType === 'Core Criteria',
      },
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed in POST /api/obligations/[id]/criteria');
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to add criterion' },
      { status: 500 }
    );
  }
}
