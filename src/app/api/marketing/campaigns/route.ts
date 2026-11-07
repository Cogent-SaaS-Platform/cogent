import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { createAdminClient } from '@/shared/db';
import { logger } from '@/shared/logger';
import { MarketingCampaign, CampaignLifecycleStatus } from '@/modules/marketing-shield/types';
import { verifyEntitlement } from '@/lib/plans';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketing/campaigns
 * Lists all campaigns for the authenticated tenant with filter & search.
 */
export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, dbClient } = tenantCtx;

    let db = dbClient;
    try {
      db = createAdminClient();
    } catch {
      db = dbClient;
    }

    if (!db) {
      return NextResponse.json({
        success: true,
        campaigns: [],
        counts: { draft: 0, review: 0, revision: 0, approved: 0 },
      });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search');

    let query = db
      .from('marketing_campaigns')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'ALL') {
      const normalized =
        statusFilter === 'Draft' || statusFilter === 'DRAFT'
          ? 'DRAFT'
          : statusFilter === 'Review' || statusFilter === 'IN_REVIEW'
          ? 'IN_REVIEW'
          : statusFilter === 'Revision' || statusFilter === 'REVISION'
          ? 'REVISION'
          : statusFilter === 'Approved' || statusFilter === 'APPROVED'
          ? 'APPROVED'
          : null;
      if (normalized) {
        query = query.eq('status', normalized);
      }
    }

    if (search && search.trim()) {
      query = query.or(`title.ilike.%${search.trim()}%,canvas_content.ilike.%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) {
      logger.error({ error }, 'Error fetching marketing campaigns');
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Also get all campaigns to compute status counts
    const { data: allData } = await db
      .from('marketing_campaigns')
      .select('status')
      .eq('organization_id', organizationId);

    const counts = {
      draft: (allData || []).filter((c) => c.status === 'DRAFT').length,
      review: (allData || []).filter((c) => c.status === 'IN_REVIEW').length,
      revision: (allData || []).filter((c) => c.status === 'REVISION').length,
      approved: (allData || []).filter((c) => c.status === 'APPROVED').length,
    };

    const campaigns: MarketingCampaign[] = (data || []).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      title: row.title,
      status: (row.status === 'DRAFT'
        ? 'Draft'
        : row.status === 'IN_REVIEW'
        ? 'Review'
        : row.status === 'REVISION'
        ? 'Revision'
        : row.status === 'APPROVED'
        ? 'Approved'
        : row.status) as CampaignLifecycleStatus,
      productCategory: row.product_category,
      channel: row.channel,
      canvasContent: row.canvas_content || '',
      attachedAssetUrl: row.attached_asset_url,
      attachedAssetType: row.attached_asset_type,
      createdBy: row.created_by || 'Authorized Marketer',
      assignedReviewer: row.assigned_reviewer || 'Chief Compliance Officer',
      riskSummary: row.risk_summary,
      totalFindings: row.total_findings || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      campaigns,
      counts,
    });
  } catch (err) {
    logger.error({ err }, 'Unexpected error in GET /api/marketing/campaigns');
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/marketing/campaigns
 * Creates a brand new campaign for the authenticated tenant.
 */
export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, dbClient, userId } = tenantCtx;

    let db = dbClient;
    try {
      db = createAdminClient();
    } catch {
      db = dbClient;
    }

    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 503 });
    }

    // Quota & Plan Entitlement Verification
    const entitlement = await verifyEntitlement(db, organizationId, 'MARKETING_CAMPAIGN_CREATE');
    if (!entitlement.allowed) {
      return NextResponse.json(entitlement.errorPayload, { status: entitlement.statusCode });
    }

    const body = await req.json();
    const title = body.title?.trim() || 'Untitled Campaign';
    const productCategory = body.productCategory || 'DIGITAL_NANO_LOAN';
    const channel = body.channel || 'SOCIAL_MEDIA_POST';
    const canvasContent = body.canvasContent || '';
    const attachedAssetUrl = body.attachedAssetUrl || null;
    const attachedAssetType = body.attachedAssetType || null;
    const createdBy = userId ? `Compliance User (${userId.slice(0, 8)})` : 'Authorized Marketer';

    const { data, error } = await db
      .from('marketing_campaigns')
      .insert({
        organization_id: organizationId,
        title,
        status: 'DRAFT',
        product_category: productCategory,
        channel,
        canvas_content: canvasContent,
        attached_asset_url: attachedAssetUrl,
        attached_asset_type: attachedAssetType,
        created_by: createdBy,
        assigned_reviewer: 'Chief Compliance Officer',
        total_findings: 0,
      })
      .select()
      .single();

    if (error || !data) {
      logger.error({ error }, 'Error creating marketing campaign');
      return NextResponse.json({ success: false, error: error?.message || 'Failed to create campaign' }, { status: 500 });
    }

    const campaign: MarketingCampaign = {
      id: data.id,
      organizationId: data.organization_id,
      title: data.title,
      status: 'Draft',
      productCategory: data.product_category,
      channel: data.channel,
      canvasContent: data.canvas_content,
      attachedAssetUrl: data.attached_asset_url,
      attachedAssetType: data.attached_asset_type,
      createdBy: data.created_by,
      assignedReviewer: data.assigned_reviewer,
      riskSummary: data.risk_summary,
      totalFindings: data.total_findings,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({
      success: true,
      campaign,
    });
  } catch (err) {
    logger.error({ err }, 'Unexpected error in POST /api/marketing/campaigns');
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
