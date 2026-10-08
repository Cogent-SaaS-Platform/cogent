import {
  inngest,
  PolicyUploadedPayload,
  EvaluationTriggeredPayload,
} from '@/shared/inngest';
import { logger } from '@/shared/logger';

export interface InngestGapMatrixEventMap {
  'gap-matrix/policy.uploaded': {
    data: PolicyUploadedPayload;
  };
  'gap-matrix/evaluation.triggered': {
    data: EvaluationTriggeredPayload;
  };
}

export interface InngestGapMatrixDispatchResult {
  status: 'DISPATCHED';
  eventId: string;
}

/**
 * Production Inngest Event Dispatcher for Gap Matrix Module (Task A3.2)
 * Dispatches durable workflow events through official Inngest SDK
 */
export class InngestGapMatrixDispatcher {
  public async send<T extends keyof InngestGapMatrixEventMap>(event: {
    name: T;
    data: InngestGapMatrixEventMap[T]['data'];
  }): Promise<InngestGapMatrixDispatchResult> {
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
        'Inngest gap matrix event dispatched via official SDK'
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
        'Failed to dispatch Inngest gap matrix event'
      );
      throw err;
    }
  }
}

export const inngestGapMatrixDispatcher: InngestGapMatrixDispatcher = new InngestGapMatrixDispatcher();
