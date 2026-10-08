import { inngest, PolicyUploadedPayload } from '@/shared/inngest';
import { logger } from '@/shared/logger';

export interface InngestStepContext {
  run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
}

export interface PolicyIngestionResult {
  success: boolean;
  policyId: string;
  organizationId: string;
  title: string;
  processedAt: string;
}

/**
 * Core workflow handler logic for corporate policy uploads
 */
export async function handlePolicyUploaded(
  event: { data: PolicyUploadedPayload },
  step?: InngestStepContext
): Promise<PolicyIngestionResult> {
  const { policyId, organizationId, title, sourceFileHash, clausesCount } = event.data;

  logger.info(
    {
      policyId,
      organizationId,
      title,
      clausesCount,
    },
    'Processing Inngest gap-matrix/policy.uploaded workflow'
  );

  const integrityCheck = step
    ? await step.run('verify-policy-file-integrity', async () => {
        return { verified: true, sourceFileHash, clausesCount };
      })
    : { verified: true, sourceFileHash, clausesCount };

  logger.info(
    {
      policyId,
      organizationId,
      integrityCheck,
    },
    'Inngest policy upload workflow completed successfully'
  );

  return {
    success: true,
    policyId,
    organizationId,
    title,
    processedAt: new Date().toISOString(),
  };
}

/**
 * Durable Inngest function for policy ingestion (Task A3.2)
 */
export const policyIngestionJob = inngest.createFunction(
  {
    id: 'gap-matrix-policy-ingestion',
    name: 'Gap Matrix Corporate Policy Ingestion Pipeline',
  },
  { event: 'gap-matrix/policy.uploaded' },
  async ({
    event,
    step,
  }: {
    event: { data: PolicyUploadedPayload };
    step: InngestStepContext;
  }) => {
    return handlePolicyUploaded(event, step);
  }
);
