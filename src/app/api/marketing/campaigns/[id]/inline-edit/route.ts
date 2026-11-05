import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';
import { MarketingComplianceService } from '@/modules/marketing-shield/services/marketingComplianceService';

export const dynamic = 'force-dynamic';

const complianceService = new MarketingComplianceService();

/**
 * POST /api/marketing/campaigns/[id]/inline-edit
 * Aurora Live Selection Rewrite endpoint.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantCtx = await getTenantContext({ allowDevFallback: true });

    const body = await req.json();
    const selectedText = body.selectedText || '';
    const actionPrompt = body.actionPrompt || 'Make compliant with Nigerian advertising regulations';
    const productCategory = body.productCategory || 'DIGITAL_NANO_LOAN';
    const channel = body.channel || 'SOCIAL_MEDIA_POST';

    if (!selectedText.trim()) {
      return NextResponse.json({ success: false, error: 'selectedText is required' }, { status: 400 });
    }

    const suggestion = await complianceService.rewriteSelection({
      selectedText,
      actionPrompt,
      productCategory,
      channel,
    });

    return NextResponse.json({
      success: true,
      suggestion,
    });
  } catch (err) {
    logger.error({ err }, 'Unexpected error in POST /api/marketing/campaigns/[id]/inline-edit');
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
