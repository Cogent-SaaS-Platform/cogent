import { inngest, CircularIngestedPayload, TenantEvaluatedPayload } from '@/shared/inngest';
import { logger } from '@/shared/logger';

export interface InngestRadarEventMap {
  'radar/circular.ingested': {
    data: CircularIngestedPayload;
  };
  'radar/tenant.evaluated': {
    data: TenantEvaluatedPayload;
  };
}

export interface InngestDispatchResult {
  status: 'DISPATCHED';
  eventId: string;
}

/**
 * Production Inngest Event Dispatcher for Radar Module (Task A3.2)
 * Dispatches durable workflow events through official Inngest SDK
 */
export class InngestEventDispatcher {
  /**
   * Dispatches an event to Inngest for asynchronous durable processing
   */
  public async send<T extends keyof InngestRadarEventMap>(event: {
    name: T;
    data: InngestRadarEventMap[T]['data'];
  }): Promise<InngestDispatchResult> {
    try {
      const sendResult = await inngest.send({
        name: event.name,
        data: event.data,
      });

      const eventId = sendResult?.ids?.[0] || `evt_${Date.now()}`;

      logger.info(
        {
          name: event.name,
          eventId,
          data: event.data,
        },
        'Inngest radar event dispatched via official SDK'
      );

      return { status: 'DISPATCHED', eventId };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(
        {
          name: event.name,
          error: err.message,
          stack: err.stack,
        },
        'Failed to dispatch Inngest radar event'
      );
      throw err;
    }
  }
}

export const inngestDispatcher: InngestEventDispatcher = new InngestEventDispatcher();
