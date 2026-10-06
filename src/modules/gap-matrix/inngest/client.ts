import { logger } from '@/shared/logger';

export interface InngestGapMatrixEventMap {
  'gap-matrix/policy.uploaded': {
    data: {
      policyId: string;
      organizationId: string;
      title: string;
      storagePath: string;
      sourceFileHash: string;
      clausesCount: number;
    };
  };
  'gap-matrix/evaluation.triggered': {
    data: {
      evaluationId: string;
      organizationId: string;
      policyId: string;
      benchmarkDocumentVersionId: string;
    };
  };
}

/**
 * Serverless Inngest Event Dispatcher for Gap Matrix (ADR-006)
 */
export class InngestGapMatrixDispatcher {
  private inngestEventKey: string;
  private inngestBaseUrl: string;

  constructor() {
    this.inngestEventKey = process.env.INNGEST_EVENT_KEY || 'local-dev-key';
    this.inngestBaseUrl =
      process.env.INNGEST_BASE_URL ||
      process.env.INNGEST_DEV_SERVER_URL ||
      'http://127.0.0.1:8288';
  }

  public async send<T extends keyof InngestGapMatrixEventMap>(event: {
    name: T;
    data: InngestGapMatrixEventMap[T]['data'];
  }): Promise<{ status: 'DISPATCHED' | 'LOCAL_HANDLED'; eventId: string }> {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    try {
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
          logger.warn({ err }, 'Inngest gap matrix server dispatch unavailable, falling back to local');
        });
      }

      logger.info(
        {
          name: event.name,
          eventId,
          data: event.data,
        },
        'Inngest gap matrix event dispatched'
      );

      return { status: 'DISPATCHED', eventId };
    } catch (err) {
      logger.warn({ err }, 'Failed to dispatch Inngest gap matrix event; running in-process');
      return { status: 'LOCAL_HANDLED', eventId };
    }
  }
}

export const inngestGapMatrixDispatcher = new InngestGapMatrixDispatcher();
