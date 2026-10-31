import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';
import { TeamService } from '@/modules/organization/services/teamService';
import { AlertAssignmentPayload } from '@/modules/organization/types';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/radar/circulars/[id]/assign
 * Assigns a circular / radar alert to either a specific tenant user or institutional functional role.
 * Persists to radar_tenant_impacts and records an immutable cryptographic audit log.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, dbClient, userId } = tenantCtx;

    const { id: circularId } = await params;
    if (!circularId) {
      return NextResponse.json(
        { success: false, error: 'Circular ID is required' },
        { status: 400 }
      );
    }

    const body = (await req.json()) as AlertAssignmentPayload;

    const teamService = new TeamService(dbClient);
    const updated = await teamService.assignRadarAlert(
      organizationId,
      circularId,
      body,
      userId
    );

    // Emit live notification to tenant enclave
    if (organizationId) {
      try {
        const assigneeLabel = body.assignedRole || 'Team Member';
        await dbClient.from('notifications').insert({
          organization_id: organizationId,
          title: `👤 Directive Assigned: ${assigneeLabel}`,
          message: `Statutory directive review assigned to ${assigneeLabel}. Check your action brief for workflow deadlines.`,
          link: `/radar`,
          is_read: false,
        });
      } catch (notifErr) {
        logger.warn({ notifErr }, 'Failed to record assignment notification');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Radar alert assignment successfully updated',
      data: updated,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed to assign radar alert');
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to assign radar alert' },
      { status: 500 }
    );
  }
}
