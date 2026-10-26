import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { ConfigurationError } from '@/shared/errors';
import { logger } from '@/shared/logger';
import { ComplianceStatus } from '@/shared/types';
import {
  StatutoryClauseWithObligations,
  PolicyClauseMatch,
  GapClausePairPromptInput,
} from '../types';
import { StatutoryBenchmarkService } from './statutoryBenchmarkService';
import { PolicyVectorIndexService } from './policyVectorIndexService';

export interface ConcordanceEvaluationInput {
  organizationId: string;
  policyId: string;
  benchmarkDocumentVersionId: string;
  policyTitle: string;
  department: string;
  benchmarkTitle?: string;
  issuingRegulator?: string;
}

export interface ClauseConcordancePair {
  statutoryClause: StatutoryClauseWithObligations;
  matchedInternalClause: PolicyClauseMatch | null;
  hybridScore: number;
  initialClassification: ComplianceStatus;
  statutoryPenaltyNaira: number;
  statutoryLegalCitation: string;
  carriesPersonalCriminalLiability: boolean;
  carriesLicenseSuspensionRisk: boolean;
  divergenceNotes?: string;
  obligationId?: string | null;
  statutoryQuote?: string | null;
  policyEvidenceQuote?: string | null;
  characterSpanStart?: number | null;
  characterSpanEnd?: number | null;
  complianceCriteria?: string[] | null;
  assessment?: string | null;
}

export interface ConcordanceRunResult {
  pairs: ClauseConcordancePair[];
  promptPairs: GapClausePairPromptInput[];
  statutoryClausesCount: number;
  criticalGapsDetected: number;
  partiallyMetDetected: number;
  adequatelyMetDetected: number;
}

/**
 * 3-Tier Clause-by-Clause Statutory Concordance Engine (Pillar 3.3 & Phase 3 Epic 2)
 * Evaluates tenant internal policies clause-by-clause and obligation-by-obligation against verified Nigerian statutory baselines.
 * Uses hybrid vector + keyword matching to classify each obligation into the 3 statutory tiers:
 *   - ADEQUATELY_MET: Satisfies all statutory mandates, windows, and reporting thresholds.
 *   - PARTIALLY_MET: Addresses general intent but diverges on timelines, thresholds, or board approvals.
 *   - CRITICAL_GAP: Statutory requirement completely omitted; zero internal controls exist.
 *
 * Adheres to docs/PILLAR_3_5W_GAP_MATRIX.md Section 3 & 4.
 */
export class ConcordanceEngine {
  private dbClient: SupabaseClient<Database>;
  private benchmarkService: StatutoryBenchmarkService;
  private vectorIndexService: PolicyVectorIndexService;

  constructor(options: {
    dbClient: SupabaseClient<Database>;
    benchmarkService?: StatutoryBenchmarkService;
    vectorIndexService?: PolicyVectorIndexService;
  } | SupabaseClient<Database>) {
    const client = options && 'dbClient' in options ? options.dbClient : (options as SupabaseClient<Database>);
    if (!client) {
      throw new ConfigurationError('ConcordanceEngine requires an RLS-bound SupabaseClient');
    }
    this.dbClient = client;

    this.benchmarkService = (options && 'benchmarkService' in options && options.benchmarkService)
      ? options.benchmarkService
      : new StatutoryBenchmarkService({ dbClient: this.dbClient });
    this.vectorIndexService = (options && 'vectorIndexService' in options && options.vectorIndexService)
      ? options.vectorIndexService
      : new PolicyVectorIndexService({ dbClient: this.dbClient });
  }

  /**
   * Executes clause-by-clause concordance evaluation across all statutory benchmark clauses and obligations
   */
  public async evaluateConcordance(input: ConcordanceEvaluationInput): Promise<ConcordanceRunResult> {
    const {
      organizationId,
      policyId,
      benchmarkDocumentVersionId,
      policyTitle,
      department,
      benchmarkTitle = 'Statutory Regulatory Framework',
      issuingRegulator = 'CBN',
    } = input;

    logger.info(
      { organizationId, policyId, benchmarkDocumentVersionId },
      'Starting 3-tier clause-by-clause concordance evaluation'
    );

    // 1. Retrieve verified statutory benchmark clauses
    const statutoryClauses = await this.benchmarkService.getBenchmarkClausesWithObligations(
      benchmarkDocumentVersionId
    );

    if (statutoryClauses.length === 0) {
      throw new Error(`No statutory benchmark clauses found for version ${benchmarkDocumentVersionId}`);
    }

    const pairs: ClauseConcordancePair[] = [];
    const promptPairs: GapClausePairPromptInput[] = [];

    let criticalGapsDetected = 0;
    let partiallyMetDetected = 0;
    let adequatelyMetDetected = 0;

    // 2. Obligation-level matching and statutory classification
    for (const statClause of statutoryClauses) {
      const obligationsToEvaluate = statClause.obligations.length > 0
        ? statClause.obligations
        : [
            {
              obligationId: 'ob-default',
              obligationType: 'GENERAL_COMPLIANCE',
              summary: statClause.clauseText.slice(0, 150),
              severityFloor: 'HIGH' as const,
              statutoryTimelineDays: null,
              mandatoryDisclosureText: null,
              verbatimQuote: statClause.clauseText,
              penalties: [],
            },
          ];

      for (const obligation of obligationsToEvaluate) {
        const penalty = obligation.penalties?.[0];

        // Hybrid vector search in tenant's policy_clauses
        const queryText = `${statClause.sectionHeading}: ${obligation.summary || obligation.verbatimQuote || statClause.clauseText}`;
        const searchMatches = await this.vectorIndexService.searchSimilarClauses({
          organizationId,
          policyId,
          queryText,
          matchThreshold: 0.15,
          matchCount: 3,
        });

        const topMatch = searchMatches.length > 0 ? searchMatches[0] : null;

        // 3. Classify into the 3 strict statutory tiers
        const classification = this.classifyComplianceTier(statClause, topMatch, obligation);

        if (classification === 'CRITICAL_GAP') {
          criticalGapsDetected++;
        } else if (classification === 'PARTIALLY_MET') {
          partiallyMetDetected++;
        } else {
          adequatelyMetDetected++;
        }

        const statutoryPenaltyNaira = penalty ? penalty.penaltyMaxNaira : 0;
        const statutoryLegalCitation = penalty?.penaltyLegalCitation || 'BOFIA 2020';
        const carriesPersonalCriminalLiability = penalty?.carriesPersonalCriminalLiability || false;
        const carriesLicenseSuspensionRisk = penalty?.carriesLicenseSuspensionRisk || false;

        pairs.push({
          statutoryClause: statClause,
          matchedInternalClause: topMatch,
          hybridScore: topMatch ? topMatch.similarity : 0,
          initialClassification: classification,
          statutoryPenaltyNaira,
          statutoryLegalCitation,
          carriesPersonalCriminalLiability,
          carriesLicenseSuspensionRisk,
          obligationId: obligation.obligationId || null,
          statutoryQuote: obligation.verbatimQuote || statClause.clauseText,
          policyEvidenceQuote: topMatch ? topMatch.clauseText : null,
          characterSpanStart: obligation.characterSpanStart ?? null,
          characterSpanEnd: obligation.characterSpanEnd ?? null,
          complianceCriteria: obligation.complianceCriteria ?? null,
          assessment: obligation.assessment ?? null,
        });

        promptPairs.push({
          statutoryClause: {
            sectionReference: statClause.sectionReference,
            sectionHeading: statClause.sectionHeading,
            clauseText: statClause.clauseText,
            obligationSummary: obligation ? obligation.summary : 'Statutory compliance obligation',
            severity: obligation ? obligation.severityFloor : 'HIGH',
            statutoryTimelineDays: obligation?.statutoryTimelineDays || null,
            mandatoryDisclosure: obligation?.mandatoryDisclosureText || null,
            legalCitation: statutoryLegalCitation,
          },
          matchedInternalClause: topMatch
            ? {
                sectionNumber: topMatch.sectionNumber,
                clauseText: topMatch.clauseText,
                similarity: topMatch.similarity,
              }
            : null,
          policyTitle,
          department,
          benchmarkTitle,
          issuingRegulator,
        });
      }
    }

    logger.info(
      {
        totalClauses: statutoryClauses.length,
        criticalGapsDetected,
        partiallyMetDetected,
        adequatelyMetDetected,
      },
      'Clause concordance evaluation complete'
    );

    return {
      pairs,
      promptPairs,
      statutoryClausesCount: statutoryClauses.length,
      criticalGapsDetected,
      partiallyMetDetected,
      adequatelyMetDetected,
    };
  }

  /**
   * Deterministically classifies clause into ADEQUATELY_MET, PARTIALLY_MET, or CRITICAL_GAP
   */
  public classifyComplianceTier(
    statutoryClause: StatutoryClauseWithObligations,
    match: PolicyClauseMatch | null,
    obligationContext?: any
  ): ComplianceStatus {
    if (!match || match.similarity < 0.25) {
      return 'CRITICAL_GAP';
    }

    // Generalized statutory timeline compliance check
    const obligation = obligationContext || statutoryClause.obligations[0];
    const statutoryDays = obligation?.statutoryTimelineDays;
    if (statutoryDays && statutoryDays > 0) {
      const policyDaysMatch = match.clauseText.match(/(\d+)\s*(?:business\s*|calendar\s*|working\s*)?days/i);
      if (policyDaysMatch) {
        const policyDays = parseInt(policyDaysMatch[1], 10);
        if (policyDays > statutoryDays) {
          return 'PARTIALLY_MET';
        }
      }
    }

    // Senior governance control evaluation (e.g. PEP approval, board ratification)
    const statHeadingLower = statutoryClause.sectionHeading.toLowerCase();
    const statTextLower = statutoryClause.clauseText.toLowerCase();
    const clauseTextLower = match.clauseText.toLowerCase();

    if (
      statHeadingLower.includes('pep') ||
      statHeadingLower.includes('politically exposed') ||
      statTextLower.includes('senior management approval') ||
      statTextLower.includes('board approval')
    ) {
      const hasSeniorSignoff =
        clauseTextLower.includes('managing director') ||
        clauseTextLower.includes('senior management') ||
        clauseTextLower.includes('executive director') ||
        clauseTextLower.includes('board of directors') ||
        clauseTextLower.includes('chief executive');

      if (!hasSeniorSignoff) {
        return 'CRITICAL_GAP';
      }
    }

    // Generalized semantic concordance tiers
    if (match.similarity >= 0.65) {
      return 'ADEQUATELY_MET';
    } else if (match.similarity >= 0.35) {
      return 'PARTIALLY_MET';
    }

    return 'CRITICAL_GAP';
  }
}
