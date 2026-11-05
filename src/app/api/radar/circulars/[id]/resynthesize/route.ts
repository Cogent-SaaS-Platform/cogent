import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';
import { HorizonSynthesisEngine } from '@/modules/radar/services/horizonSynthesisEngine';

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
    const { dbClient, organizationId } = tenantCtx;

    logger.info({ circularId }, 'Executing on-demand re-synthesis via HorizonSynthesisEngine');

    const result = await HorizonSynthesisEngine.synthesizeAlert({
      circularId,
      dbClient,
      organizationId,
      forceResynthesize: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Alert successfully re-synthesized by Horizon Engine',
      data: result,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed re-synthesizing alert');
    return NextResponse.json(
      { success: false, error: err.message || 'Internal failure during re-synthesis' },
      { status: 500 }
    );
  }
}
