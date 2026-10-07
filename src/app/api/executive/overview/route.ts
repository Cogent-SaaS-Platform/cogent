import { NextRequest, NextResponse } from 'next/server';
import { ExecutiveOverviewService } from '@/modules/executive/services/executiveOverviewService';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantCtx = await getTenantContext();
    const organizationId = tenantCtx.organizationId;
    const organizationName = searchParams.get('organizationName') || 'Apex Paystack FinTech Ltd';
    const executiveOverviewService = new ExecutiveOverviewService({ dbClient: tenantCtx.dbClient });

    const data = await executiveOverviewService.getExecutiveOverview(
      organizationId,
      organizationName
    );

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to generate executive overview data');
    return NextResponse.json(
      { error: error.message || 'Failed fetching executive overview' },
      { status: 500 }
    );
  }
}
