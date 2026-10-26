import { z } from 'zod';
import {
  ExtractedPolicyClauseSchema,
  ExtractedPolicyStructureSchema,
  PolicyIngestInputSchema,
  PolicyIngestResultSchema,
  GapItemSynthesisSchema,
  GapEvaluationOutputSchema,
  EvaluatedGapItemSchema,
  GapEvaluationResultSchema,
  AuditDefenseDossierSchema,
} from './schema';
import {
  ComplianceStatus,
  OrgDepartment,
  RegulatorCode,
  SeverityLevel,
} from '@/shared/types';

export * from './schema';
export type { GapClausePairPromptInput } from '@/shared/ai-engine/prompts/gapMatrixPrompts';

export type ExtractedPolicyClause = z.infer<typeof ExtractedPolicyClauseSchema>;
export type ExtractedPolicyStructure = z.infer<typeof ExtractedPolicyStructureSchema>;
export type PolicyIngestInput = z.infer<typeof PolicyIngestInputSchema>;
export type PolicyIngestResult = z.infer<typeof PolicyIngestResultSchema>;
export type GapItemSynthesis = z.infer<typeof GapItemSynthesisSchema>;
export type GapEvaluationOutput = z.infer<typeof GapEvaluationOutputSchema>;
export type EvaluatedGapItem = z.infer<typeof EvaluatedGapItemSchema>;
export type GapEvaluationResult = z.infer<typeof GapEvaluationResultSchema>;
export type AuditDefenseDossier = z.infer<typeof AuditDefenseDossierSchema>;

export interface StatutoryBenchmarkFramework {
  documentVersionId: string;
  instrumentTitle: string;
  shortName: string;
  referenceCode: string;
  regulatorCode: RegulatorCode;
  publicationDate: string;
  effectiveDate: string;
  suggestedDepartments: OrgDepartment[];
  clausesCount: number;
}

export interface StatutoryClauseWithObligations {
  clauseId: string;
  documentVersionId: string;
  sectionReference: string;
  sectionHeading: string;
  clauseText: string;
  pageNumber?: number | null;
  obligations: {
    obligationId: string;
    obligationType: string;
    summary: string;
    severityFloor: SeverityLevel;
    statutoryTimelineDays: number | null;
    mandatoryDisclosureText: string | null;
    verbatimQuote?: string | null;
    characterSpanStart?: number | null;
    characterSpanEnd?: number | null;
    actor?: string | null;
    action?: string | null;
    targetObject?: string | null;
    condition?: string | null;
    deadlineText?: string | null;
    complianceCriteria?: string[] | null;
    assessment?: string | null;
    penalties: {
      penaltyMinNaira: number;
      penaltyMaxNaira: number;
      dailyFineNaira: number;
      carriesPersonalCriminalLiability: boolean;
      carriesLicenseSuspensionRisk: boolean;
      penaltyLegalCitation: string;
    }[];
  }[];
}

export interface PolicyClauseMatch {
  policyClauseId: string;
  sectionNumber: string;
  clauseText: string;
  similarity: number;
}
