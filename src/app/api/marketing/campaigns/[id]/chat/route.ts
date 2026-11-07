import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { createAdminClient } from '@/shared/db';
import { logger } from '@/shared/logger';
import { Database } from '@/shared/db/types';
import { MarketingComplianceService } from '@/modules/marketing-shield/services/marketingComplianceService';

export const dynamic = 'force-dynamic';

const complianceService = new MarketingComplianceService();

/**
 * POST /api/marketing/campaigns/[id]/chat
 * Multi-modal Compliance Copilot Chat endpoint with real Knowledge Base grounding.
 */
export async function POST(
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

    // Verify campaign belongs to the authenticated organization
    const { data: campaignRow, error: cErr } = await db
      .from('marketing_campaigns')
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (cErr || !campaignRow) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    const body = await req.json();
    const userMessageContent = body.content || '';
    const productCategory = body.context?.productCategory || 'DIGITAL_NANO_LOAN';
    const channel = body.context?.channel || 'SOCIAL_MEDIA_POST';
    const scopedRegulations = body.context?.scopedRegulations || ['ALL'];
    const attachedAssetBase64 = body.attachedAssetBase64 || null;
    const attachedAssetMimeType = body.attachedAssetMimeType || null;
    const attachedAssetUrl = body.attachedAssetUrl || null;
    const currentCanvasContent = body.canvasContent || '';

    const textToAnalyze = currentCanvasContent.trim() || userMessageContent.trim();

    // Fetch recent chat history (last 6 messages) for multi-turn conversation memory
    const { data: previousChatMessages } = await db
      .from('campaign_chat_messages')
      .select('role, content')
      .eq('campaign_id', id)
      .order('created_at', { ascending: false })
      .limit(6);

    const conversationHistory = (previousChatMessages || [])
      .reverse()
      .map((m) => ({
        role: m.role as 'USER' | 'ASSISTANT',
        content: m.content,
      }));

    // 1. Record User Message
    await db.from('campaign_chat_messages').insert({
      campaign_id: id,
      role: 'USER',
      content:
        userMessageContent ||
        (attachedAssetBase64
          ? 'Uploaded creative asset for statutory compliance review.'
          : attachedAssetUrl
          ? `Attached promotional URL for statutory compliance review: ${attachedAssetUrl}`
          : 'Analyze campaign compliance against active statutory rules.'),
      structured_findings_json: [],
    });

    // 2. Perform Intelligent Supervisory Concordance Evaluation
    const analysis = await complianceService.analyzeCampaign(db, {
      campaignId: id,
      organizationId,
      copyText: textToAnalyze,
      userMessage: userMessageContent,
      canvasContent: currentCanvasContent,
      conversationHistory,
      productCategory,
      channel,
      scopedRegulations,
      attachedAssetBase64,
      attachedAssetMimeType,
      attachedAssetUrl,
    });

    // 3. Record Assistant Message with Structured Findings Table
    await db.from('campaign_chat_messages').insert({
      campaign_id: id,
      role: 'ASSISTANT',
      content: analysis.replyMessage,
      structured_findings_json: analysis.findings,
    });

    // 4. Upsert Extracted Claims into Registry
    if (analysis.extractedClaims.length > 0) {
      await db.from('extracted_promotional_claims').delete().eq('campaign_id', id);

      const claimsToInsert: Database['public']['Tables']['extracted_promotional_claims']['Insert'][] =
        analysis.extractedClaims.map((c) => ({
          campaign_id: id,
          organization_id: organizationId,
          code: c.code,
          claim_text: c.claimText,
          verdict: c.verdict,
          regulation_id: c.regulationId,
          statutory_citation: c.statutoryCitation,
          verbatim_rule: c.verbatimRule,
          ai_rationale: c.aiRationale,
          suggested_rewrite: c.suggestedRewrite,
          review_status: 'PENDING' as const,
        }));

      await db.from('extracted_promotional_claims').insert(claimsToInsert);
    }

    // 5. Update Campaign Summary
    const updatePayload: Database['public']['Tables']['marketing_campaigns']['Update'] = {
      total_findings: analysis.findings.length,
      risk_summary: analysis.riskSummary,
      updated_at: new Date().toISOString(),
    };

    if (attachedAssetUrl) {
      updatePayload.attached_asset_url = attachedAssetUrl;
      updatePayload.attached_asset_type = 'URL';
    }

    if (!currentCanvasContent && userMessageContent.length > 20) {
      updatePayload.canvas_content = userMessageContent;
    }

    if (analysis.executiveVerdict === 'BLOCKING_ISSUE') {
      updatePayload.status = 'REVISION';
    } else if (analysis.executiveVerdict === 'WARNING') {
      updatePayload.status = 'IN_REVIEW';
    }

    await db
      .from('marketing_campaigns')
      .update(updatePayload)
      .eq('id', id)
      .eq('organization_id', organizationId);

    return NextResponse.json({
      success: true,
      replyMessage: analysis.replyMessage,
      findings: analysis.findings,
      extractedClaims: analysis.extractedClaims,
      executiveVerdict: analysis.executiveVerdict,
      riskSummary: analysis.riskSummary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Statutory compliance analysis failed';
    logger.error({ err }, 'Error in POST /api/marketing/campaigns/[id]/chat');
    return NextResponse.json(
      {
        success: false,
        error: message,
        retryable: true,
      },
      { status: 502 }
    );
  }
}
