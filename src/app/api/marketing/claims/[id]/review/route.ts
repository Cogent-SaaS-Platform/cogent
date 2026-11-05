import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/marketing/claims/[id]/review
 * Approves or rejects an extracted promotional claim.
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
    const reviewStatus = body.reviewStatus; // 'APPROVED' | 'REJECTED'

    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(reviewStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid reviewStatus' }, { status: 400 });
    }

    const { data, error } = await dbClient
      .from('extracted_promotional_claims')
      .update({
        review_status: reviewStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error || !data) {
      logger.error({ error }, 'Error updating claim review status');
      return NextResponse.json({ success: false, error: error?.message || 'Failed to update claim' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      claim: data,
    });
  } catch (err) {
    logger.error({ err }, 'Unexpected error in POST /api/marketing/claims/[id]/review');
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
