import { serve } from 'inngest/next';
import { inngest } from '@/shared/inngest';
import { circularIngestionJob } from '@/modules/radar/inngest/circularIngestionHandler';
import { policyIngestionJob } from '@/modules/gap-matrix/inngest/policyIngestionHandler';
import { scheduledRegulatoryFeedSync } from '@/modules/radar/inngest/scheduledFeedSync';

/**
 * Inngest Next.js App Router Webhook Mount Point (Task A3.2)
 *
 * Exposes GET, POST, and PUT handlers managed by the official Inngest SDK.
 * Cryptographically validates webhook signatures via INNGEST_SIGNING_KEY.
 * Rejects unauthenticated requests with HTTP 401/403.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [circularIngestionJob, policyIngestionJob, scheduledRegulatoryFeedSync],
});
