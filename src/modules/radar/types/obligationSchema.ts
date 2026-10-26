import { z } from 'zod';
import {
  ObligationType,
  SeverityLevel,
  LicenseType,
  PaymentRail,
  RegulatorCode,
} from '@/shared/types';

/**
 * Zod validation schemas for statutory obligation extraction & grounded quote provenance
 * Conforms to Cogent Core Pipeline Audit & Remediation Plan (Phase 2)
 */

export const StatedPenaltySchema = z.object({
  minNaira: z.number().nonnegative().describe('Minimum stated statutory fine in Naira (0 if none)'),
  maxNaira: z.number().nonnegative().describe('Maximum stated statutory fine in Naira (0 if none)'),
  dailyFineNaira: z.number().nonnegative().describe('Daily default fine in Naira (0 if none)'),
  carriesPersonalCriminalLiability: z.boolean().describe('True if text specifies imprisonment or personal liability for officers/directors'),
  carriesLicenseSuspensionRisk: z.boolean().describe('True if text specifies license revocation, suspension, or withdrawal'),
  citation: z.string().describe('Exact statutory section or legal citation referenced in text'),
});

export type StatedPenalty = z.infer<typeof StatedPenaltySchema>;

export const RawExtractedObligationSchema = z.object({
  actor: z.string().describe('Regulated institution, officer, or department (e.g., "Commercial Banks", "Payment Service Providers", "Chief Compliance Officer")'),
  action: z.string().describe('Statutory modal verb + action (e.g., "must submit", "shall establish", "is prohibited from")'),
  object: z.string().describe('Target data asset, reserve, or operational flow (e.g., "Suspicious Transaction Reports", "Statutory Liquidity Ratio", "Customer Biometric Data")'),
  condition: z.string().nullable().describe('Prerequisite conditions, triggers, or thresholds, or null'),
  deadline: z.string().nullable().describe('Explicit temporal deadline string from text (e.g., "within 72 hours", "on or before March 31, 2026") or null'),
  statutoryTimelineDays: z.number().int().positive().nullable().describe('Normalized integer number of calendar days or null'),
  obligationType: z.enum([
    'STRICT_PROHIBITION',
    'MANDATORY_DISCLOSURE',
    'STATUTORY_TIMELINE',
    'CONDITIONAL_PERMISSION',
    'GOVERNANCE_CONTROL',
  ]),
  severityFloor: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  verbatimQuote: z.string().describe('Exact verbatim substring from the clause text, without alterations'),
  statedPenalty: StatedPenaltySchema.nullable().describe('Statutory penalty stated explicitly in text, or null if none stated in text'),
  targetedLicenses: z.array(z.string()).optional().describe('Applicable license types inferred from actor/mandate'),
  affectedRails: z.array(z.string()).optional().describe('Applicable payment rails inferred from object/mandate'),
  appliesUniversally: z.boolean().optional().describe('True if applies universally to all financial institutions in Nigeria'),
  assessment: z.string().optional().describe('Deep statutory and operational assessment explaining the systemic impact and compliance exposure'),
  complianceCriteria: z.array(z.string()).optional().describe('Specific, actionable verification criteria or checklist required to satisfy this obligation'),
});

export type RawExtractedObligation = z.infer<typeof RawExtractedObligationSchema>;

export const ClauseObligationExtractionOutputSchema = z.object({
  obligations: z.array(RawExtractedObligationSchema),
});

export type ClauseObligationExtractionOutput = z.infer<typeof ClauseObligationExtractionOutputSchema>;

/**
 * Validated obligation with character span offsets anchored strictly to the clause text
 */
export interface ValidatedObligation extends RawExtractedObligation {
  id: string;
  clauseId?: string;
  clauseReference?: string;
  pageNumber?: number;
  startChar: number;
  endChar: number;
  summary: string;
  targetedLicenses: LicenseType[];
  affectedRails: PaymentRail[];
  appliesUniversally: boolean;
  isValidated: boolean;
  groundingConfidence: number; // 1.0 for exact substring match
  assessment?: string;
  complianceCriteria?: string[];
}

/**
 * Context for evaluating applicability of a single obligation against a tenant profile
 */
export interface ObligationTargetingContext {
  obligationId?: string;
  actor?: string;
  targetedLicenses?: LicenseType[];
  affectedRails?: PaymentRail[];
  appliesUniversally?: boolean;
  statutoryCitation?: string;
  clauseReference?: string;
  summary?: string;
  verbatimQuote?: string;
  obligationType?: ObligationType;
}

/**
 * Result of evaluating applicability for a single obligation
 */
export interface ObligationApplicabilityResult {
  obligationId?: string;
  isApplicable: boolean;
  reason: string;
  matchedLicenses: LicenseType[];
  matchedRails: PaymentRail[];
  statutoryCitation?: string;
}
