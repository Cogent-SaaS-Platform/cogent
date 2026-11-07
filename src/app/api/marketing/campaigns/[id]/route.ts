import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { createAdminClient } from '@/shared/db';
import { logger } from '@/shared/logger';
import { Database } from '@/shared/db/types';
import {
  MarketingCampaign,
  CampaignChatMessage,
  ExtractedPromotionalClaim,
  CampaignLifecycleStatus,
} from '@/modules/marketing-shield/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketing/campaigns/[id]
 * Fetches campaign details, chat messages, and extracted claims.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, dbClient } = tenantCtx;

    let db = dbClient;
    try {
      db = createAdminClient();
    } catch {
      db = dbClient;
    }

    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 503 });
    }

    const { data: campaignRow, error: cErr } = await db
      .from('marketing_campaigns')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (cErr || !campaignRow) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    const [messagesRes, claimsRes] = await Promise.all([
      db
        .from('campaign_chat_messages')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: true }),
      db
        .from('extracted_promotional_claims')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: true }),
    ]);

    const campaign: MarketingCampaign = {
      id: campaignRow.id,
      organizationId: campaignRow.organization_id,
      title: campaignRow.title,
      status: (campaignRow.status === 'DRAFT'
        ? 'Draft'
        : campaignRow.status === 'IN_REVIEW'
        ? 'Review'
        : campaignRow.status === 'REVISION'
        ? 'Revision'
        : campaignRow.status === 'APPROVED'
        ? 'Approved'
        : campaignRow.status) as CampaignLifecycleStatus,
      productCategory: campaignRow.product_category,
      channel: campaignRow.channel,
      canvasContent: campaignRow.canvas_content || '',
      attachedAssetUrl: campaignRow.attached_asset_url,
      attachedAssetType: campaignRow.attached_asset_type,
      createdBy: campaignRow.created_by || 'Authorized Marketer',
      assignedReviewer: campaignRow.assigned_reviewer || 'Chief Compliance Officer',
      riskSummary: campaignRow.risk_summary,
      totalFindings: campaignRow.total_findings || 0,
      createdAt: campaignRow.created_at,
      updatedAt: campaignRow.updated_at,
    };

    const messages: CampaignChatMessage[] = (messagesRes.data || []).map((m) => ({
      id: m.id,
      campaignId: m.campaign_id,
      role: m.role,
      content: m.content,
      structuredFindingsJson: m.structured_findings_json || [],
      createdAt: m.created_at,
    }));

    const extractedClaims: ExtractedPromotionalClaim[] = (claimsRes.data || []).map((c) => ({
      id: c.id,
      campaignId: c.campaign_id,
      organizationId: c.organization_id,
      code: c.code,
      claimText: c.claim_text,
      verdict: c.verdict,
      regulationId: c.regulation_id,
      statutoryCitation: c.statutory_citation,
      verbatimRule: c.verbatim_rule,
      aiRationale: c.ai_rationale,
      suggestedRewrite: c.suggested_rewrite,
      reviewStatus: c.review_status,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    return NextResponse.json({
      success: true,
      campaign,
      messages,
      extractedClaims,
    });
  } catch (err) {
    logger.error({ err }, 'Unexpected error in GET /api/marketing/campaigns/[id]');
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/marketing/campaigns/[id]
 * Updates campaign metadata, status, or live canvas copy.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, dbClient } = tenantCtx;

    let db = dbClient;
    try {
      db = createAdminClient();
    } catch {
      db = dbClient;
    }

    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 503 });
    }

    const body = await req.json();
    const updatePayload: Database['public']['Tables']['marketing_campaigns']['Update'] = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) updatePayload.title = body.title;
    if (body.status !== undefined) {
      const s = body.status;
      updatePayload.status =
        s === 'Draft' || s === 'DRAFT'
          ? 'DRAFT'
          : s === 'Review' || s === 'IN_REVIEW'
          ? 'IN_REVIEW'
          : s === 'Revision' || s === 'REVISION'
          ? 'REVISION'
          : s === 'Approved' || s === 'APPROVED'
          ? 'APPROVED'
          : s;
    }
    if (body.canvasContent !== undefined) updatePayload.canvas_content = body.canvasContent;
    if (body.productCategory !== undefined) updatePayload.product_category = body.productCategory;
    if (body.channel !== undefined) updatePayload.channel = body.channel;
    if (body.attachedAssetUrl !== undefined) updatePayload.attached_asset_url = body.attachedAssetUrl;
    if (body.attachedAssetType !== undefined) updatePayload.attached_asset_type = body.attachedAssetType;
    if (body.assignedReviewer !== undefined) updatePayload.assigned_reviewer = body.assignedReviewer;
    if (body.riskSummary !== undefined) updatePayload.risk_summary = body.riskSummary;
    if (body.totalFindings !== undefined) updatePayload.total_findings = body.totalFindings;

    const { data, error } = await db
      .from('marketing_campaigns')
      .update(updatePayload)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error || !data) {
      logger.error({ error }, 'Error updating marketing campaign');
      return NextResponse.json({ success: false, error: error?.message || 'Failed to update campaign' }, { status: 500 });
    }

    const campaign: MarketingCampaign = {
      id: data.id,
      organizationId: data.organization_id,
      title: data.title,
      status: (data.status === 'DRAFT'
        ? 'Draft'
        : data.status === 'IN_REVIEW'
        ? 'Review'
        : data.status === 'REVISION'
        ? 'Revision'
        : data.status === 'APPROVED'
        ? 'Approved'
        : data.status) as CampaignLifecycleStatus,
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
    logger.error({ err }, 'Unexpected error in PUT /api/marketing/campaigns/[id]');
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/marketing/campaigns/[id]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, dbClient } = tenantCtx;

    let db = dbClient;
    try {
      db = createAdminClient();
    } catch {
      db = dbClient;
    }

    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 503 });
    }

    const { error } = await db
      .from('marketing_campaigns')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      logger.error({ error }, 'Error deleting marketing campaign');
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Unexpected error in DELETE /api/marketing/campaigns/[id]');
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
