import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';
import { MarketingComplianceService } from '@/modules/marketing-shield/services/marketingComplianceService';
import { verifyEntitlement } from '@/lib/plans';

export const dynamic = 'force-dynamic';

const complianceService = new MarketingComplianceService();

/**
 * POST /api/marketing/campaigns/[id]/inline-edit
 * Live Canvas Selection Rewrite endpoint with server-side plan entitlement enforcement.
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

    // Verify campaign tenant ownership
    const { data: campaignRow, error: cErr } = await dbClient
      .from('marketing_campaigns')
      .select('id, organization_id, canvas_content')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (cErr || !campaignRow) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    // Enforce plan quota for inline rewrites
    const entitlement = await verifyEntitlement(dbClient, organizationId, 'MARKETING_INLINE_REWRITE');
    if (!entitlement.allowed) {
      return NextResponse.json(entitlement.errorPayload, { status: entitlement.statusCode });
    }

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
      citedVerbatimStatute: body.citedVerbatimStatute || undefined,
      fullAdContext: body.fullAdContext || campaignRow.canvas_content || undefined,
    });

    // Record inline rewrite telemetry event for Starter monthly quota tracking
    await dbClient.from('tenant_ingestion_events').insert({
      organization_id: organizationId,
      event_type: 'MARKETING_INLINE_REWRITE',
      entity_id: id,
    });

    return NextResponse.json({
      success: true,
      suggestion,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Inline statutory rewrite failed';
    logger.error({ err }, 'Error in POST /api/marketing/campaigns/[id]/inline-edit');
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
