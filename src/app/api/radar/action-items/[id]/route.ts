import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';
import { TeamService } from '@/modules/organization/services/teamService';
import { ActionItemAssignmentPayload } from '@/modules/organization/types';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/radar/action-items/[id]
 * Updates action item assignment (assigned_to_user_id, assigned_role, target_department, suggested_deadline, is_completed).
 * Commits an immutable audit record.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, dbClient, userId } = tenantCtx;

    const { id: actionItemId } = await params;
    if (!actionItemId) {
      return NextResponse.json(
        { success: false, error: 'Action Item ID is required' },
        { status: 400 }
      );
    }

    const body = (await req.json()) as ActionItemAssignmentPayload;

    const teamService = new TeamService(dbClient);
    const updated = await teamService.assignActionItem(
      organizationId,
      actionItemId,
      body,
      userId
    );

    return NextResponse.json({
      success: true,
      message: 'Action item assignment successfully updated',
      data: updated,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed to update action item assignment');
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update action item assignment' },
      { status: 500 }
    );
  }
}
