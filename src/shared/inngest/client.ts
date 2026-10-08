import { Inngest, EventSchemas } from 'inngest';

/**
 * Event Data Payloads for Cogent Durable Workflows (ADR-006 & Phase A3)
 */
export interface CircularIngestedPayload {
  circularId: string;
  circularNumber: string;
  storagePath: string;
  sourceFileHash: string;
  regulator: string;
  organizationId?: string;
  deduplicated?: boolean;
}

export interface TenantEvaluatedPayload {
  circularId: string;
  organizationId: string;
  isApplicable: boolean;
  priority: string;
}

export interface PolicyUploadedPayload {
  policyId: string;
  organizationId: string;
  title: string;
  storagePath: string;
  sourceFileHash: string;
  clausesCount: number;
}

export interface EvaluationTriggeredPayload {
  evaluationId: string;
  organizationId: string;
  policyId: string;
  benchmarkDocumentVersionId: string;
}

export type CogentEventMap = {
  'radar/circular.ingested': { data: CircularIngestedPayload };
  'radar/tenant.evaluated': { data: TenantEvaluatedPayload };
  'gap-matrix/policy.uploaded': { data: PolicyUploadedPayload };
  'gap-matrix/evaluation.triggered': { data: EvaluationTriggeredPayload };
};

/**
 * Official Inngest Client Instance (Durable Execution Engine)
 * Strictly verifies cryptographic signatures via INNGEST_SIGNING_KEY in production.
 */
export const inngest: Inngest = new Inngest({
  id: 'cogent-engine',
  signingKey: process.env.INNGEST_SIGNING_KEY,
  eventKey: process.env.INNGEST_EVENT_KEY,
  schemas: new EventSchemas().fromRecord<CogentEventMap>(),
});
