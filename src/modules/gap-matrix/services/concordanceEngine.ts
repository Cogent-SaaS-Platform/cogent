import { SupabaseClient } from '@supabase/supabase-js';
import { Database, createAdminClient, createClient } from '@/shared/db';
import { logger } from '@/shared/logger';
import { ComplianceStatus } from '@/shared/types';
import {
  StatutoryClauseWithObligations,
  PolicyClauseMatch,
  GapClausePairPromptInput,
} from '../types';
import {
  StatutoryBenchmarkService,
  defaultStatutoryBenchmarkService,
} from './statutoryBenchmarkService';
import {
  PolicyVectorIndexService,
  defaultPolicyVectorIndexService,
} from './policyVectorIndexService';

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
 * 3-Tier Clause-by-Clause Statutory Concordance Engine (Pillar 3.3)
 * Evaluates tenant internal policies clause-by-clause against verified Nigerian statutory baselines.
 * Uses hybrid vector + keyword matching to classify each obligation into the 3 statutory tiers:
 *   - ADEQUATELY_MET: Satisfies all statutory mandates, windows, and reporting thresholds.
 *   - PARTIALLY_MET: Addresses general intent but diverges on timelines, thresholds, or board approvals.
 *   - CRITICAL_GAP: Statutory requirement completely omitted; zero internal controls exist.
 *
 * Adheres to docs/PILLAR_3_5W_GAP_MATRIX.md Section 3 & 4.
 */
export class ConcordanceEngine {
  private dbClient: SupabaseClient<Database> | null = null;
  private benchmarkService: StatutoryBenchmarkService;
  private vectorIndexService: PolicyVectorIndexService;

  constructor(options?: {
    dbClient?: SupabaseClient<Database>;
    benchmarkService?: StatutoryBenchmarkService;
    vectorIndexService?: PolicyVectorIndexService;
  }) {
    if (options?.dbClient) {
      this.dbClient = options.dbClient;
    } else {
      try {
        this.dbClient = createAdminClient();
      } catch {
        try {
          this.dbClient = createClient();
        } catch {
          this.dbClient = null;
        }
      }
    }

    this.benchmarkService = options?.benchmarkService || defaultStatutoryBenchmarkService;
    this.vectorIndexService = options?.vectorIndexService || defaultPolicyVectorIndexService;
  }

  /**
   * Executes clause-by-clause concordance evaluation across all statutory benchmark clauses
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

    // 2. Clause-by-clause matching and statutory classification
    for (const statClause of statutoryClauses) {
      const obligation = statClause.obligations[0];
      const penalty = obligation?.penalties[0];

      // Hybrid vector search in tenant's policy_clauses
      const queryText = `${statClause.sectionHeading}: ${statClause.clauseText}`;
      const searchMatches = await this.vectorIndexService.searchSimilarClauses({
        organizationId,
        policyId,
        queryText,
        matchThreshold: 0.15,
        matchCount: 3,
      });

      const topMatch = searchMatches.length > 0 ? searchMatches[0] : null;

      // 3. Classify into the 3 strict statutory tiers
      const classification = this.classifyComplianceTier(statClause, topMatch);

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
    match: PolicyClauseMatch | null
  ): ComplianceStatus {
    if (!match || match.similarity < 0.25) {
      return 'CRITICAL_GAP';
    }

    const clauseTextLower = match.clauseText.toLowerCase();
    const statHeadingLower = statutoryClause.sectionHeading.toLowerCase();

    // Check specific statutory timelines (e.g. 72 hours vs 7 days)
    if (
      statutoryClause.sectionReference.includes('14') ||
      statHeadingLower.includes('reporting window') ||
      statHeadingLower.includes('suspicious') ||
      statHeadingLower.includes('str')
    ) {
      const hasSevenDaysOutdated = /(?:7|seven)\s*(?:\([0-9]+\)\s*)?(?:business\s*|calendar\s*|working\s*)?days/i.test(match.clauseText);
      const hasFourteenDaysOutdated = /(?:14|fourteen)\s*(?:\([0-9]+\)\s*)?(?:business\s*|calendar\s*|working\s*)?days/i.test(match.clauseText);
      const hasSeventyTwoHoursCompliant =
        /(?:72|seventy-?two)\s*(?:\([0-9]+\)\s*)?(?:business\s*|calendar\s*|working\s*)?hours/i.test(match.clauseText) ||
        /(?:3|three)\s*(?:\([0-9]+\)\s*)?(?:business\s*|calendar\s*|working\s*)?days/i.test(match.clauseText);

      if (hasSevenDaysOutdated || hasFourteenDaysOutdated) {
        return 'PARTIALLY_MET';
      }
      if (hasSeventyTwoHoursCompliant) {
        return 'ADEQUATELY_MET';
      }
    }

    // Check PEP executive governance approval controls
    if (statHeadingLower.includes('pep') || statHeadingLower.includes('politically exposed')) {
      const hasSeniorSignoff =
        clauseTextLower.includes('managing director') ||
        clauseTextLower.includes('senior management') ||
        clauseTextLower.includes('executive director') ||
        clauseTextLower.includes('board of directors') ||
        clauseTextLower.includes('chief executive');

      if (!hasSeniorSignoff) {
        return 'CRITICAL_GAP';
      }
      return 'ADEQUATELY_MET';
    }

    // Check Tiered KYC biometric verification
    if (statHeadingLower.includes('kyc') || statHeadingLower.includes('identity') || statHeadingLower.includes('due diligence')) {
      if (clauseTextLower.includes('bvn') || clauseTextLower.includes('nin') || clauseTextLower.includes('biometric')) {
        return 'ADEQUATELY_MET';
      }
    }

    // Check record retention duration
    if (statHeadingLower.includes('retention') || statHeadingLower.includes('record')) {
      if (
        clauseTextLower.includes('5 years') ||
        clauseTextLower.includes('five years') ||
        clauseTextLower.includes('five (5) years') ||
        clauseTextLower.includes('6 years') ||
        clauseTextLower.includes('six years')
      ) {
        return 'ADEQUATELY_MET';
      }
    }

    // Check Consumer Complaints / Dispute resolution
    if (statHeadingLower.includes('complaint') || statHeadingLower.includes('dispute') || statHeadingLower.includes('grievance')) {
      const hasOutdatedWindow = /(?:14|fourteen|30|thirty)\s*(?:\([0-9]+\)\s*)?(?:business\s*|calendar\s*|working\s*)?days/i.test(match.clauseText);
      if (hasOutdatedWindow && !clauseTextLower.includes('interim')) {
        return 'PARTIALLY_MET';
      }
    }

    // Fall back to similarity threshold
    if (match.similarity >= 0.65) {
      return 'ADEQUATELY_MET';
    } else if (match.similarity >= 0.35) {
      return 'PARTIALLY_MET';
    }

    return 'CRITICAL_GAP';
  }
}

export const defaultConcordanceEngine = new ConcordanceEngine();
