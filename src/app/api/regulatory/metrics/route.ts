import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';
import { ObligationMetricsService } from '@/modules/regulatory/services/obligationMetricsService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regulatory/metrics
 * Returns real-time aggregate statistics for the 3 Core Metrics strip:
 * 1. The Orphan Obligation Rate (The Gaps)
 * 2. Control Concentration (The Bottlenecks)
 * 3. Redundant Controls (The Cost-Cutters)
 */
export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const organizationId = tenantCtx.organizationId;
    const dbClient = tenantCtx.dbClient;

    const { searchParams } = new URL(req.url);
    const circularId = searchParams.get('circularId') || undefined;
    const documentVersionId = searchParams.get('documentVersionId') || undefined;
    const regulator = searchParams.get('regulator') || undefined;

    const service = new ObligationMetricsService(dbClient);
    const result = await service.fetchTenantObligations(organizationId, {
      circularId,
      documentVersionId,
      regulator,
      limit: 1000, // compute across tenant corpus
    });

    return NextResponse.json({
      success: true,
      data: result.metrics,
      totalObligations: result.total,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed to compute supervisory metrics');
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to compute supervisory metrics' },
      { status: 500 }
    );
  }
}
