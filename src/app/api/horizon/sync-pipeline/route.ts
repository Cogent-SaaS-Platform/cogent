import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { LiveFeedCollector } from '@/modules/radar/services/liveFeedCollector';
import { HorizonSynthesisEngine } from '@/modules/radar/services/horizonSynthesisEngine';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Allow sufficient window for multi-source ingestion and synthesis

export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { dbClient, organizationId } = tenantCtx;

    logger.info({ organizationId }, 'Starting Horizon automated pipeline sync & synthesis queue');

    // 1. Poll and ingest newly issued items across all active regulators, news media, and law firm feeds
    const collector = new LiveFeedCollector({ dbClient });
    const liveSyncSummary = await collector.syncAllLiveSources(organizationId);

    // 2. Run automated pipeline deduplication, junk purge, and synthesis worker
    const queueSummary = await HorizonSynthesisEngine.runAutomatedPipelineQueue(dbClient, {
      organizationId,
      concurrency: 4,
    });

    return NextResponse.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        liveFeeds: liveSyncSummary,
        pipelineQueue: queueSummary,
      },
    });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ error: msg }, 'Failed executing Horizon sync-pipeline');
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
