import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: circularId } = await params;
    if (!circularId) {
      return NextResponse.json({ success: false, error: 'Circular ID is required' }, { status: 400 });
    }

    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { dbClient } = tenantCtx;
    const userEmail = (tenantCtx as any).userEmail || 'Compliance Officer';
    const body = await req.json();

    const text = body.text?.trim();
    if (!text) {
      return NextResponse.json({ success: false, error: 'Comment text cannot be empty' }, { status: 400 });
    }

    const author = body.author || userEmail || 'Compliance Officer';
    const authorInitials = author.slice(0, 2).toUpperCase();

    // Fetch existing comments & audit logs
    const { data: existing, error: fetchErr } = await (dbClient as any)
      .from('radar_circulars')
      .select('comments, audit_logs')
      .eq('id', circularId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ success: false, error: 'Circular not found' }, { status: 404 });
    }

    const existingComments = Array.isArray(existing.comments) ? existing.comments : [];
    const existingLogs = Array.isArray(existing.audit_logs) ? existing.audit_logs : [];

    const newComment = {
      id: crypto.randomUUID(),
      author,
      avatar: authorInitials,
      text,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' WAT',
    };

    const newLog = {
      id: crypto.randomUUID(),
      timestamp: newComment.timestamp,
      action: 'Added comment / regulatory observation',
      author,
    };

    const updatedComments = [newComment, ...existingComments];
    const updatedLogs = [newLog, ...existingLogs];

    const { error: updateErr } = await (dbClient as any)
      .from('radar_circulars')
      .update({
        comments: updatedComments,
        audit_logs: updatedLogs,
      })
      .eq('id', circularId);

    if (updateErr) {
      throw updateErr;
    }

    return NextResponse.json({
      success: true,
      comment: newComment,
      comments: updatedComments,
      auditLogs: updatedLogs,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed adding comment to radar circular');
    return NextResponse.json({ success: false, error: err.message || 'Internal failure' }, { status: 500 });
  }
}
