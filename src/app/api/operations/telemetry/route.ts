import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { OperationalTelemetryService } from '@/modules/operations/services/operationalTelemetryService';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

/**
 * Institutional Supervisory Telemetry API Endpoint (Phase 5 / Epic 3)
 * Returns live operational telemetry across regulatory scrapers, cascade ledger hops,
 * model inference latency, and golden benchmark verification.
 */
export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const service = new OperationalTelemetryService(tenantCtx.dbClient);

    const report = await service.getSupervisoryTelemetryReport(tenantCtx.organizationId);

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ error: error.message }, 'Failed retrieving supervisory telemetry report');
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal error retrieving supervisory telemetry report',
      },
      { status: 500 }
    );
  }
}
