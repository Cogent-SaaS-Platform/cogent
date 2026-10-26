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

    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { dbClient, organizationId, userId } = tenantCtx;

    let previousStatus: ComplianceStatus = 'CRITICAL_GAP';
    let evaluationId: string | null = null;

    if (dbClient) {
      try {
        // 1. Fetch current item
        const { data: currentItem, error: fetchErr } = await dbClient
          .from('gap_matrix_items')
          .select('id, evaluation_id, compliance_status')
          .eq('id', itemId)
          .maybeSingle();

        if (fetchErr) {
          logger.warn({ fetchErr: fetchErr.message }, 'Error fetching gap matrix item from DB');
        }

        if (currentItem) {
          previousStatus = currentItem.compliance_status as ComplianceStatus;
          evaluationId = currentItem.evaluation_id;

          // 2. Update item status
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
            .eq('id', itemId);

          if (updateErr) {
            logger.error({ updateErr: updateErr.message }, 'Failed updating gap_matrix_item in DB');
            return NextResponse.json(
              { success: false, error: updateErr.message },
              { status: 500 }
            );
          }

          // 3. Recalculate parent evaluation counts if evaluationId exists
          if (evaluationId) {
            const { data: allItems } = await dbClient
              .from('gap_matrix_items')
              .select('compliance_status')
              .eq('evaluation_id', evaluationId);

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
                .eq('id', evaluationId);
            }
          }

          // 4. Record tamper-evident audit log
          try {
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
              userId: userId || 'CCO-SUPERVISORY-OVERRIDE',
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
          } catch (auditErr) {
            logger.warn({ auditErr: String(auditErr) }, 'Failed recording audit log for status override');
          }
        }
      } catch (dbErr) {
        logger.warn({ dbErr: String(dbErr) }, 'DB update failed; operating in memory/dev mode');
      }
    }

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
