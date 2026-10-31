import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';
import { TeamService } from '@/modules/organization/services/teamService';
import { ObligationAssignmentPayload } from '@/modules/organization/types';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/regulatory/obligations/[id]/assign
 * Seamlessly links dynamic assignee to the 4-Phase Obligation Register (custodian_role, department).
 * Commits an immutable audit record.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, dbClient, userId } = tenantCtx;

    const { id: obligationId } = await params;
    if (!obligationId) {
      return NextResponse.json(
        { success: false, error: 'Obligation ID is required' },
        { status: 400 }
      );
    }

    const body = (await req.json()) as ObligationAssignmentPayload;

    const teamService = new TeamService(dbClient);
    const updated = await teamService.assignObligation(
      organizationId,
      obligationId,
      body,
      userId
    );

    return NextResponse.json({
      success: true,
      message: 'Obligation successfully delegated',
      data: updated,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed to delegate obligation');
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delegate obligation' },
      { status: 500 }
    );
  }
}
