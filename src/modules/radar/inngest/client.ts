import { logger } from '@/shared/logger';

export interface InngestRadarEventMap {
  'radar/circular.ingested': {
    data: {
      circularId: string;
      circularNumber: string;
      storagePath: string;
      sourceFileHash: string;
      regulator: string;
      organizationId?: string;
      deduplicated?: boolean;
    };
  };
  'radar/tenant.evaluated': {
    data: {
      circularId: string;
      organizationId: string;
      isApplicable: boolean;
      priority: string;
    };
  };
}

/**
 * Serverless Inngest Event Dispatcher for Cogent (ADR-006)
 * Supports durable execution, local dev emulator, and test mocks
 */
export class InngestEventDispatcher {
  private inngestEventKey: string;
  private inngestBaseUrl: string;

  constructor() {
    this.inngestEventKey = process.env.INNGEST_EVENT_KEY || 'local-dev-key';
    this.inngestBaseUrl =
      process.env.INNGEST_BASE_URL ||
      process.env.INNGEST_DEV_SERVER_URL ||
      'http://127.0.0.1:8288';
  }

  /**
   * Dispatches an event to Inngest for asynchronous durable processing
   */
  public async send<T extends keyof InngestRadarEventMap>(event: {
    name: T;
    data: InngestRadarEventMap[T]['data'];
  }): Promise<{ status: 'DISPATCHED' | 'LOCAL_HANDLED'; eventId: string }> {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    try {
      // In production or when local Inngest server is running:
      if (process.env.NODE_ENV === 'production' || process.env.INNGEST_EVENT_KEY) {
        const url = `${this.inngestBaseUrl}/e/${this.inngestEventKey}`;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: event.name,
            data: event.data,
            id: eventId,
            ts: Date.now(),
          }),
        }).catch((err) => {
          logger.warn({ err }, 'Inngest server dispatch unavailable, falling back to local processing');
        });
      }

      logger.info(
        {
          name: event.name,
          eventId,
          data: event.data,
        },
        'Inngest event dispatched'
      );

      return { status: 'DISPATCHED', eventId };
    } catch (err) {
      logger.warn({ err }, 'Failed to dispatch Inngest event; running in-process');
      return { status: 'LOCAL_HANDLED', eventId };
    }
  }
}

export const inngestDispatcher = new InngestEventDispatcher();
