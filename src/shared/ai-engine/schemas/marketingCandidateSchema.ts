import { z } from 'zod';

/**
 * AI Candidate Extraction Schema for Marketing Shield (Pillar 1)
 * Adheres strictly to docs/AI_ENGINE.md Section 4 & docs/PILLAR_1_MARKETING_SHIELD.md
 *
 * CRITICAL INVARIANT: Under NO circumstances does the LLM output currency numbers or fines!
 * Fines, penalties, and severity floors are strictly calculated by deterministic application code.
 */

// Normalized candidate finding schema supporting camelCase and snake_case
export const CandidateFindingSchema = z
  .object({
    candidateRuleCode: z.string().optional(),
    candidate_rule_code: z.string().optional(),
    flaggedExcerpt: z.string().optional(),
    flagged_excerpt: z.string().optional(),
    explanation: z.string(),
    recommendedFix: z.string().optional(),
    recommended_fix: z.string().optional(),
  })
  .transform((data) => ({
    candidateRuleCode: data.candidateRuleCode || data.candidate_rule_code || 'UNSPECIFIED_RULE',
    flaggedExcerpt: data.flaggedExcerpt || data.flagged_excerpt || '',
    explanation: data.explanation,
    recommendedFix: data.recommendedFix || data.recommended_fix || 'Review and align with statutory guidelines.',
  }));

export const MarketingAnalysisOutputSchema = z
  .object({
    candidateVerdict: z
      .enum(['NO_ISSUE_DETECTED', 'REVIEW_RECOMMENDED', 'ISSUE_DETECTED', 'BLOCKING_ISSUE'])
      .optional(),
    candidate_verdict: z
      .enum(['NO_ISSUE_DETECTED', 'REVIEW_RECOMMENDED', 'ISSUE_DETECTED', 'BLOCKING_ISSUE'])
      .optional(),
    candidateFindings: z.array(CandidateFindingSchema).optional(),
    candidate_findings: z.array(CandidateFindingSchema).optional(),
    findings: z.array(CandidateFindingSchema).optional(),
    violations: z.array(CandidateFindingSchema).optional(),
    issues: z.array(CandidateFindingSchema).optional(),
    compliantRewrite: z.string().optional(),
    compliant_rewrite: z.string().optional(),
    rewrite: z.string().optional(),
    arconPreclearanceSuggested: z.boolean().optional(),
    arcon_preclearance_suggested: z.boolean().optional(),
  })
  .transform((data) => {
    const verdict = data.candidateVerdict || data.candidate_verdict || 'REVIEW_RECOMMENDED';
    const findings =
      data.candidateFindings ||
      data.candidate_findings ||
      data.findings ||
      data.violations ||
      data.issues ||
      [];
    const rewrite =
      data.compliantRewrite ||
      data.compliant_rewrite ||
      data.rewrite ||
      'Compliant copy could not be automatically synthesized. Manual review required.';
    const arconPreclearance =
      data.arconPreclearanceSuggested ?? data.arcon_preclearance_suggested ?? true;

    return {
      candidateVerdict: verdict,
      candidateFindings: findings,
      compliantRewrite: rewrite,
      arconPreclearanceSuggested: arconPreclearance,
    };
  });

export type CandidateFinding = z.output<typeof CandidateFindingSchema>;
export type MarketingAnalysisOutput = z.output<typeof MarketingAnalysisOutputSchema>;
