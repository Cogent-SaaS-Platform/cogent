import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';
import { TeamService } from '@/modules/organization/services/teamService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/organization/members
 * Resolves all active team members belonging strictly to the authenticated tenant
 * along with the sovereign functional statutory roles.
 */
export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, dbClient, isDevFallback, userId } = tenantCtx;

    const teamService = new TeamService(dbClient);
    let members = await teamService.getTeamMembers(organizationId);

    // If tenant has no members yet (e.g. dev fallback or fresh organization), provide baseline active member
    if (members.length === 0 && (isDevFallback || process.env.NODE_ENV === 'test')) {
      members = [
        {
          id: 'mem_dev_admin',
          userId: userId,
          fullName: 'Alex Marco',
          email: 'alex.marco@stem-cogent.com',
          orgRole: 'OWNER',
          department: 'COMPLIANCE_LEGAL',
          jobTitle: 'General Counsel & CCO',
          initials: 'AM',
          avatarUrl: null,
          joinedAt: new Date().toISOString(),
        },
        {
          id: 'mem_dev_compliance',
          userId: '00000000-0000-0000-0000-000000000020',
          fullName: 'Chioma Okonkwo',
          email: 'chioma.o@stem-cogent.com',
          orgRole: 'ADMIN',
          department: 'COMPLIANCE_LEGAL',
          jobTitle: 'Chief Compliance Officer',
          initials: 'CO',
          avatarUrl: null,
          joinedAt: new Date().toISOString(),
        },
      ];
    }

    const functionalRoles = teamService.getAssignableRoles();

    return NextResponse.json({
      success: true,
      organizationId,
      members,
      functionalRoles,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed to resolve organization members');
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to resolve organization members' },
      { status: 500 }
    );
  }
}
