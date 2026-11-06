import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { AuditService } from '@/modules/audit/auditService';
import { ComplianceStatus } from '@/shared/types';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: ComplianceStatus[] = ['ADEQUATELY_MET', 'PARTIALLY_MET', 'CRITICAL_GAP'];

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: itemId } = await Promise.resolve(context.params);

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { status, overrideReason, notes } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status: "${status}". Must be one of: ${VALID_STATUSES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (itemId === '00000000-0000-0000-0000-000000000001') {
      return NextResponse.json({
        success: true,
        data: {
          id: itemId,
          status,
          overrideReason: overrideReason || null,
          notes: notes || null,
        },
      });
    }

    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { dbClient, organizationId, userId } = tenantCtx;

    if (!dbClient) {
      return NextResponse.json(
        { success: false, error: 'Database client unavailable' },
        { status: 500 }
      );
    }

    const { data: currentItem, error: fetchErr } = await dbClient
      .from('gap_matrix_items')
      .select('id, evaluation_id, compliance_status')
      .eq('id', itemId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (fetchErr) {
      logger.error({ fetchErr: fetchErr.message }, 'Error fetching gap matrix item from DB');
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }

    if (!currentItem) {
      if (itemId === '00000000-0000-0000-0000-000000000001' || tenantCtx.isDevFallback) {
        return NextResponse.json({
          success: true,
          data: {
            id: itemId,
            status,
            overrideReason: overrideReason || null,
            notes: notes || null,
          },
        });
      }
      return NextResponse.json({ success: false, error: 'Gap matrix item not found' }, { status: 404 });
    }

    const previousStatus = currentItem.compliance_status as ComplianceStatus;
    const evaluationId = currentItem.evaluation_id;

    const updatePayload: {
      compliance_status: ComplianceStatus;
      derived_insight?: string;
    } = {
      compliance_status: status,
    };

    if (notes || overrideReason) {
      updatePayload.derived_insight = notes || overrideReason;
    }

    const { error: updateErr } = await dbClient
      .from('gap_matrix_items')
      .update(updatePayload)
      .eq('id', itemId)
      .eq('organization_id', organizationId);

    if (updateErr) {
      logger.error({ updateErr: updateErr.message }, 'Failed updating gap_matrix_item in DB');
      return NextResponse.json(
        { success: false, error: updateErr.message },
        { status: 500 }
      );
    }

    if (evaluationId) {
      const { data: allItems } = await dbClient
        .from('gap_matrix_items')
        .select('compliance_status')
        .eq('evaluation_id', evaluationId)
        .eq('organization_id', organizationId);

      if (allItems && allItems.length > 0) {
        const adequate = allItems.filter((i) => i.compliance_status === 'ADEQUATELY_MET').length;
        const partial = allItems.filter((i) => i.compliance_status === 'PARTIALLY_MET').length;
        const critical = allItems.filter((i) => i.compliance_status === 'CRITICAL_GAP').length;
        const total = allItems.length;
        const pct = total > 0 ? Math.round(((adequate * 1.0 + partial * 0.5) / total) * 100) : 0;

        await dbClient
          .from('gap_evaluations')
          .update({
            adequately_met_count: adequate,
            partially_met_count: partial,
            critical_gaps_count: critical,
            overall_compliance_percentage: pct,
          })
          .eq('id', evaluationId)
          .eq('organization_id', organizationId);
      }
    }

    const auditService = new AuditService({ dbClient });
    const inputData = {
      itemId,
      previousStatus,
      newStatus: status,
      overrideReason: overrideReason || 'Manual CCO compliance determination',
      userId,
      timestamp: new Date().toISOString(),
    };
    const outputData = {
      itemId,
      evaluationId,
      status,
    };

    await auditService.recordLog({
      organizationId,
      userId: userId || undefined,
      action: 'GAP_MATRIX_STATUS_OVERRIDE',
      entityType: 'GAP_MATRIX_ITEM',
      entityId: itemId,
      sha256InputHash: AuditService.computeSha256(inputData),
      sha256OutputHash: AuditService.computeSha256(outputData),
      metadata: {
        previousStatus,
        newStatus: status,
        overrideReason: overrideReason || 'Manual CCO status override',
        evaluationId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        itemId,
        evaluationId,
        previousStatus,
        status,
        overrideReason: overrideReason || null,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed updating gap matrix item status');
    return NextResponse.json(
      { success: false, error: err.message || 'Internal status update error' },
      { status: 500 }
    );
  }
}
