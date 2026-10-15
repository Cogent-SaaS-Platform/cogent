import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const db = tenantCtx.dbClient;
    const organizationId = tenantCtx.organizationId;

    const body = await req.json().catch(() => ({}));
    const { id, all } = body;

    if (all) {
      // Mark all as read
      const { error, count } = await db
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) {
        logger.error({ error: error.message }, 'Failed to mark all notifications as read');
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, updatedCount: count ?? 'all' });
    } else if (id) {
      // Mark single notification as read
      const { error } = await db
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) {
        logger.error({ error: error.message }, 'Failed to mark notification as read');
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, updatedId: id });
    } else {
      return NextResponse.json({ success: false, error: 'Must provide either id or all: true' }, { status: 400 });
    }
  } catch (err: any) {
    logger.error({ error: err.message }, 'Unexpected error in POST /api/notifications/read');
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
