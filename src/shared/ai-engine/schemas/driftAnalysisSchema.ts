import { z } from 'zod';

/**
 * Zod schema for AI Drift Analysis output.
 * Invariant: Never outputs statutory fines or penalties.
 */
export const DriftCandidateFindingSchema = z.object({
  findingType: z.enum([
    'OMITTED_MANDATORY_DISCLOSURE',
    'ALTERED_CLAIM',
    'UNAPPROVED_PROMISE',
    'YIELD_RATE_DISCREPANCY',
  ]),
  description: z.string(),
  liveExcerpt: z.string().default(''),
  originalExcerpt: z.string().default(''),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
});

export const DriftAnalysisOutputSchema = z.object({
  isDrifted: z.boolean().default(false),
  omittedDisclosures: z.array(z.string()).default([]),
  modifiedClaims: z.array(z.string()).default([]),
  unapprovedPromises: z.array(z.string()).default([]),
  findings: z.array(DriftCandidateFindingSchema).default([]),
  summary: z.string().default(''),
});

export type DriftAnalysisOutput = z.infer<typeof DriftAnalysisOutputSchema>;
