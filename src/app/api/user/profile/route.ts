import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { createAdminClient } from '@/shared/db';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tenantCtx = await getTenantContext();
    const adminClient = createAdminClient();

    // 1. Fetch User Record
    const { data: user, error: userError } = await (adminClient.from('users') as any)
      .select('id, email, full_name, job_title, department, avatar_url, created_at')
      .eq('id', tenantCtx.userId)
      .maybeSingle();

    if (userError) {
      logger.error({ error: userError.message }, 'Failed to fetch user record');
      return NextResponse.json({ error: 'Failed to fetch user record' }, { status: 500 });
    }

    // 2. Fetch Organization Details
    const { data: org } = await adminClient
      .from('organizations')
      .select('id, name, rc_number, fccpc_registration_number, cbn_approval_ref')
      .eq('id', tenantCtx.organizationId)
      .maybeSingle();

    // 3. Fetch Organization Membership
    const { data: membership } = await (adminClient.from('organization_memberships') as any)
      .select('role, department, job_title')
      .eq('organization_id', tenantCtx.organizationId)
      .eq('user_id', tenantCtx.userId)
      .maybeSingle();

    const effectiveJobTitle = user?.job_title || membership?.job_title || 'CSO';
    const effectiveDepartment = user?.department || membership?.department || 'EXECUTIVE_LEADERSHIP';

    return NextResponse.json({
      success: true,
      user: {
        id: tenantCtx.userId,
        email: user?.email || '',
        fullName: user?.full_name || '',
        jobTitle: effectiveJobTitle,
        department: effectiveDepartment,
        avatarUrl: user?.avatar_url || null,
        role: membership?.role || 'OWNER',
      },
      organization: {
        id: tenantCtx.organizationId,
        name: org?.name || '',
        rcNumber: org?.rc_number || '',
        cbnApprovalRef: org?.cbn_approval_ref || '',
        fccpcRegistrationNumber: org?.fccpc_registration_number || '',
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Error retrieving user profile');
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve profile' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const adminClient = createAdminClient();
    const body = await req.json();

    const { fullName, jobTitle, department, email } = body;

    logger.info(
      { userId: tenantCtx.userId, jobTitle, department },
      'Updating user institutional profile'
    );

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (fullName !== undefined) updatePayload.full_name = fullName;
    if (jobTitle !== undefined) updatePayload.job_title = jobTitle;
    if (department !== undefined) updatePayload.department = department;
    if (email !== undefined) updatePayload.email = email;

    // 1. Update public.users
    const { data: updatedUser, error: updateError } = await (adminClient.from('users') as any)
      .update(updatePayload)
      .eq('id', tenantCtx.userId)
      .select('id, email, full_name, job_title, department, avatar_url')
      .single();

    if (updateError) {
      logger.error({ error: updateError.message }, 'Failed to update users table');
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 2. Synchronize organization_memberships
    const membershipUpdate: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (jobTitle !== undefined) membershipUpdate.job_title = jobTitle;
    if (department !== undefined) membershipUpdate.department = department;

    await (adminClient.from('organization_memberships') as any)
      .update(membershipUpdate)
      .eq('organization_id', tenantCtx.organizationId)
      .eq('user_id', tenantCtx.userId);

    return NextResponse.json({
      success: true,
      message: 'User profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.full_name,
        jobTitle: updatedUser.job_title,
        department: updatedUser.department,
        avatarUrl: updatedUser.avatar_url,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed to update user profile');
    return NextResponse.json(
      { error: err.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
