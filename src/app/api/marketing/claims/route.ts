import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';
import { ExtractedPromotionalClaim } from '@/modules/marketing-shield/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketing/claims
 * Returns live feed of promotional claims extracted across campaigns for the tenant.
 */
export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, dbClient } = tenantCtx;

    if (!dbClient) {
      return NextResponse.json({ success: true, claims: [] });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query = dbClient
      .from('extracted_promotional_claims')
      .select('*, marketing_campaigns(title)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (status && status !== 'ALL' && ['PENDING', 'APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
      query = query.eq('review_status', status.toUpperCase() as 'PENDING' | 'APPROVED' | 'REJECTED');
    }

    const { data, error } = await query;
    if (error) {
      logger.error({ error }, 'Error fetching extracted claims');
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const claims: ExtractedPromotionalClaim[] = (data || []).map((c: any) => ({
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
      campaignTitle: c.marketing_campaigns?.title || 'Untitled Campaign',
    }));

    return NextResponse.json({
      success: true,
      claims,
    });
  } catch (err) {
    logger.error({ err }, 'Unexpected error in GET /api/marketing/claims');
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
