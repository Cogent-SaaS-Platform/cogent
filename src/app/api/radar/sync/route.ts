import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { LiveFeedCollector } from '@/modules/radar/services/liveFeedCollector';
import { logger } from '@/shared/logger';

/**
 * On-Demand Live Regulatory Source Synchronization Endpoint (Phase 5 / Pillar 2)
 * Triggers live scrapers and pollers for CBN, SEC, NDPC, ARCON, and FCCPC.
 * Deduplicates with SHA-256 and indexes into radar_circulars.
 */
export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const collector = new LiveFeedCollector({ dbClient: tenantCtx.dbClient });

    logger.info({ organizationId: tenantCtx.organizationId }, 'Live regulatory sync requested by tenant');

    const summary = await collector.syncAllLiveSources();

    return NextResponse.json({
      success: true,
      message: `Live regulatory scan completed: ${summary.totalNewIngested} new circulars indexed, ${summary.totalDeduplicated} verified existing.`,
      data: summary,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed executing live regulatory feed sync');
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal failure during live regulatory feed sync',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const db = tenantCtx.dbClient;

    const { count: totalActiveCirculars } = await db
      .from('radar_circulars')
      .select('id', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      data: {
        activeMonitoredCirculars: totalActiveCirculars || 0,
        registeredRegulators: ['CBN', 'SEC', 'NDPC', 'ARCON', 'FCCPC'],
        pollFrequency: 'Continuous / Daily 06:00 WAT',
        status: 'OPERATIONAL',
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
