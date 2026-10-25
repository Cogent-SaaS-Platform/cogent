import { inngest } from '@/shared/inngest';
import { LiveFeedCollector } from '../services/liveFeedCollector';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { logger } from '@/shared/logger';

/**
 * Inngest Scheduled Job: Always-On Multi-Source Regulatory Horizon Scanning
 * 
 * Runs every 2 hours to scan CBN, SEC, NDPC, FCCPC, NFIU, NDIC, and top legal/intelligence feeds.
 * Ensures real-time detection of new regulatory enactments with zero manual intervention.
 */
export const scheduledRegulatoryFeedSync = inngest.createFunction(
  {
    id: 'scheduled-regulatory-feed-sync',
    name: 'Scheduled Regulatory Feeds Synchronizer',
  },
  { cron: '0 */2 * * *' }, // Triggers every 2 hours
  async ({ step }) => {
    logger.info('Triggering automated horizon scanning sync across Nigerian regulatory feeds');

    const result = await step.run('sync-live-regulatory-feeds', async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase service credentials for scheduled feed synchronizer');
      }

      const db = createClient<Database>(supabaseUrl, serviceRoleKey);
      const collector = new LiveFeedCollector({ dbClient: db });

      return await collector.syncAllLiveSources();
    });

    logger.info(
      {
        totalNewIngested: result.totalNewIngested,
        totalDeduplicated: result.totalDeduplicated,
        sourcesCount: result.totalSourcesPolled,
      },
      'Automated horizon scanning sync cycle completed'
    );

    return result;
  }
);
