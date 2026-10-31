import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';
import { ObligationMetricsService } from '@/modules/regulatory/services/obligationMetricsService';
import { ControlEffectivenessStatus } from '@/modules/regulatory/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regulatory/obligations
 * Returns paginated, searchable obligations enriched with the 4-phase mapping fields,
 * formatted human IDs (OBL-REG-YEAR-XXX), linked circular references, and internal control mappings.
 */
export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const organizationId = tenantCtx.organizationId;
    const dbClient = tenantCtx.dbClient;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const circularId = searchParams.get('circularId') || undefined;
    const documentVersionId = searchParams.get('documentVersionId') || undefined;
    const regulator = searchParams.get('regulator') || undefined;
    const status = (searchParams.get('status') as ControlEffectivenessStatus | 'ALL') || 'ALL';
    const isOrphanOnly = searchParams.get('isOrphanOnly') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const service = new ObligationMetricsService(dbClient);
    const result = await service.fetchTenantObligations(organizationId, {
      search,
      circularId,
      documentVersionId,
      regulator,
      status,
      isOrphanOnly,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result.obligations,
      total: result.total,
      page: result.page,
      limit: result.limit,
      metrics: result.metrics,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed to fetch 4-phase obligations');
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to retrieve obligations register' },
      { status: 500 }
    );
  }
}
