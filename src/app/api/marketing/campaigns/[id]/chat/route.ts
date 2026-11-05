import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
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

    if (!dbClient) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 503 });
    }

    const body = await req.json();
    const userMessageContent = body.content || '';
    const productCategory = body.context?.productCategory || 'DIGITAL_NANO_LOAN';
    const channel = body.context?.channel || 'SOCIAL_MEDIA_POST';
    const scopedRegulations = body.context?.scopedRegulations || ['ALL'];
    const attachedAssetBase64 = body.attachedAssetBase64 || null;
    const attachedAssetMimeType = body.attachedAssetMimeType || null;
    const currentCanvasContent = body.canvasContent || '';

    // Copy to analyze: either explicit message content or current canvas copy
    const textToAnalyze = userMessageContent.trim() || currentCanvasContent.trim();

    // 1. Record User Message
    await dbClient.from('campaign_chat_messages').insert({
      campaign_id: id,
      role: 'USER',
      content: userMessageContent || (attachedAssetBase64 ? 'Uploaded creative flyer for regulatory review.' : 'Analyze campaign compliance.'),
      structured_findings_json: [],
    });

    // 2. Perform AI Regulatory Evaluation
    const analysis = await complianceService.analyzeCampaign(dbClient, {
      campaignId: id,
      organizationId,
      copyText: textToAnalyze,
      productCategory,
      channel,
      scopedRegulations,
      attachedAssetBase64,
      attachedAssetMimeType,
    });

    // 3. Record Assistant Message with Structured Findings Table
    await dbClient.from('campaign_chat_messages').insert({
      campaign_id: id,
      role: 'ASSISTANT',
      content: analysis.replyMessage,
      structured_findings_json: analysis.findings,
    });

    // 4. Upsert Extracted Claims into Registry
    if (analysis.extractedClaims.length > 0) {
      // Clear old claims for this campaign or insert new
      await dbClient.from('extracted_promotional_claims').delete().eq('campaign_id', id);

      const claimsToInsert: Database['public']['Tables']['extracted_promotional_claims']['Insert'][] = analysis.extractedClaims.map((c) => ({
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

      await dbClient.from('extracted_promotional_claims').insert(claimsToInsert);
    }

    // 5. Update Campaign Summary
    const updatePayload: Database['public']['Tables']['marketing_campaigns']['Update'] = {
      total_findings: analysis.findings.length,
      risk_summary: analysis.riskSummary,
      updated_at: new Date().toISOString(),
    };

    // If canvas copy is currently blank and user provided substantial text, populate canvas
    if (!currentCanvasContent && userMessageContent.length > 20) {
      updatePayload.canvas_content = userMessageContent;
    }

    if (analysis.executiveVerdict === 'BLOCKING_ISSUE') {
      updatePayload.status = 'REVISION';
    } else if (analysis.executiveVerdict === 'WARNING') {
      updatePayload.status = 'IN_REVIEW';
    }

    await dbClient
      .from('marketing_campaigns')
      .update(updatePayload)
      .eq('id', id);

    return NextResponse.json({
      success: true,
      replyMessage: analysis.replyMessage,
      findings: analysis.findings,
      extractedClaims: analysis.extractedClaims,
      executiveVerdict: analysis.executiveVerdict,
      riskSummary: analysis.riskSummary,
    });
  } catch (err) {
    logger.error({ err }, 'Unexpected error in POST /api/marketing/campaigns/[id]/chat');
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
