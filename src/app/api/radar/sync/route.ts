import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { LiveFeedCollector } from '@/modules/radar/services/liveFeedCollector';
import { logger } from '@/shared/logger';
import { EntitlementEngine } from '@/shared/billing';
import { SubscriptionRequiredError } from '@/shared/errors';

/**
 * On-Demand Live Regulatory Source Synchronization Endpoint (Phase 5 / Pillar 2)
 * Triggers live scrapers and pollers for CBN, SEC, NDPC, ARCON, and FCCPC.
 * Deduplicates with SHA-256 and indexes into radar_circulars.
 */
export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();

    // Feature gate: ensure active subscription (expired trial / read-only blocks live sync)
    EntitlementEngine.assertEngineActive(tenantCtx.subscription, 'Live regulatory circular feed sync');

    const collector = new LiveFeedCollector({ dbClient: tenantCtx.dbClient });

    logger.info({ organizationId: tenantCtx.organizationId }, 'Live regulatory sync requested by tenant');

    const summary = await collector.syncAllLiveSources(tenantCtx.organizationId);

    // Emit live notification to tenant enclave
    if (tenantCtx.organizationId) {
      try {
        const title = summary.totalNewIngested > 0
          ? `📡 Live Regulatory Sync: ${summary.totalNewIngested} New Directives Indexed`
          : `📡 Live Regulatory Scan Completed`;
        const message = summary.totalNewIngested > 0
          ? `Synchronized live portals (CBN, SEC, NDPC, ARCON, FCCPC). Ingested ${summary.totalNewIngested} new directives, verified ${summary.totalDeduplicated} existing statutory publications.`
          : `Synchronized live portals (CBN, SEC, NDPC, ARCON, FCCPC). All statutory circulars and regulatory directives verified current and active.`;

        await tenantCtx.dbClient.from('notifications').insert({
          organization_id: tenantCtx.organizationId,
          title,
          message,
          link: '/radar',
          is_read: false,
        });
      } catch (notifErr) {
        logger.warn({ notifErr }, 'Failed to record sync notification');
      }
    }

    return NextResponse.json({
      success: true,
      message: `Live regulatory scan completed: ${summary.totalNewIngested} new circulars indexed, ${summary.totalDeduplicated} verified existing.`,
      data: summary,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    if (error instanceof SubscriptionRequiredError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
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

    // Fetch the most recent run for each registered source
    const { data: recentRuns } = await db
      .from('source_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);

    const latestBySource = new Map<string, any>();
    if (recentRuns) {
      for (const run of recentRuns) {
        if (!latestBySource.has(run.source_code)) {
          latestBySource.set(run.source_code, run);
        }
      }
    }

    const sourceHealth = Array.from(latestBySource.values()).map((run) => {
      const msAgo = Date.now() - new Date(run.started_at).getTime();
      const minsAgo = Math.floor(msAgo / 60000);
      const hoursAgo = Math.floor(minsAgo / 60);

      const timeAgoDisplay = minsAgo < 1
        ? 'just now'
        : minsAgo < 60
        ? `${minsAgo}m ago`
        : hoursAgo < 24
        ? `${hoursAgo}h ago`
        : `${Math.floor(hoursAgo / 24)}d ago`;

      return {
        sourceCode: run.source_code,
        sourceName: run.source_name,
        status: run.status,
        lastPolledAt: run.started_at,
        timeAgoDisplay,
        itemsFound: run.items_seen,
        itemsIngested: run.items_ingested,
        itemsDeduplicated: run.items_deduplicated,
        errorMessage: run.error_message,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        activeMonitoredCirculars: totalActiveCirculars || 0,
        registeredRegulators: ['CBN', 'SEC', 'NDPC', 'ARCON', 'FCCPC', 'NFIU', 'NDIC'],
        pollFrequency: 'Continuous / Every 2 hours',
        status: 'OPERATIONAL',
        sources: sourceHealth,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
