import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

function getRelativeTime(dateString: string): string {
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 30) return `${Math.floor(diffDay / 30)}mo ago`;
    if (diffDay > 0) return `${diffDay}d ago`;
    if (diffHour > 0) return `${diffHour}h ago`;
    if (diffMin > 0) return `${diffMin}m ago`;
    return 'just now';
  } catch {
    return 'recently';
  }
}

function categorizeNotification(link: string | null, title: string): { category: string; target: string; isSmart: boolean } {
  const l = (link || '').toLowerCase();
  const t = title.toLowerCase();

  let category = 'Insight Hub';
  let target = 'Regulatory Directorate';
  let isSmart = true;

  if (l.includes('marketing') || t.includes('marketing') || t.includes('drift')) {
    category = 'Marketing Shield';
    target = 'Marketing Broadcast Asset';
  } else if (l.includes('gap') || t.includes('gap') || t.includes('concordance') || t.includes('manual')) {
    category = 'Gap Matrix';
    target = 'Operational Compliance Manual';
  } else if (l.includes('audit') || t.includes('cama') || t.includes('sha-256') || t.includes('ledger')) {
    category = 'Audit Ledger';
    target = 'CAMA 2020 Attestation Dossier';
    isSmart = false;
  } else if (t.includes('cbn')) {
    category = 'Insight Hub';
    target = 'Central Bank of Nigeria (CBN)';
  } else if (t.includes('sec')) {
    category = 'Insight Hub';
    target = 'Securities & Exchange Commission';
  } else if (t.includes('arcon')) {
    category = 'Insight Hub';
    target = 'ARCON Advertising Standards';
  } else if (t.includes('ndpc') || t.includes('ndpa')) {
    category = 'Insight Hub';
    target = 'Nigeria Data Protection Commission';
  } else if (t.includes('fccpc')) {
    category = 'Insight Hub';
    target = 'FCCPC Consumer Protection';
  }

  return { category, target, isSmart };
}

export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const db = tenantCtx.dbClient;
    const organizationId = tenantCtx.organizationId;

    // Fetch from notifications table
    let query = db
      .from('notifications')
      .select('id, organization_id, title, message, link, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: dbNotifs, error } = await query;

    if (error) {
      logger.error({ error: error.message }, 'Failed to fetch notifications');
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const items = (dbNotifs || []).map((n) => {
      const { category, target, isSmart } = categorizeNotification(n.link, n.title);
      const isHighPriority =
        n.title.includes('⚠️') ||
        n.title.toLowerCase().includes('drift') ||
        n.title.toLowerCase().includes('action required') ||
        n.title.toLowerCase().includes('invalidated') ||
        n.title.toLowerCase().includes('mandatory');

      return {
        id: n.id,
        title: n.title,
        message: n.message,
        target,
        time: getRelativeTime(n.created_at),
        category,
        isHighPriority,
        isSmart,
        aiContext: n.message,
        actionUrl: n.link || '/insight',
        isRead: n.is_read,
        createdAt: n.created_at,
      };
    });

    const unreadCount = items.filter((i) => !i.isRead).length;

    // Top smart insight recommendation
    const topSmartAlert =
      items.find((i) => !i.isRead && i.isHighPriority) ||
      items.find((i) => i.isHighPriority) ||
      items[0] ||
      null;

    return NextResponse.json({
      success: true,
      totalCount: items.length,
      unreadCount,
      notifications: items,
      topInsight: topSmartAlert,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Unexpected error in GET /api/notifications');
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
