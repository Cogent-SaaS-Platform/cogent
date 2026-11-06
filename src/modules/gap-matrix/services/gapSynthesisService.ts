import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { ConfigurationError } from '@/shared/errors';
import { AiEngine } from '@/shared/ai-engine';
import { AuditService } from '@/modules/audit/auditService';
import { logger } from '@/shared/logger';
import {
  GapEvaluationResult,
  EvaluatedGapItem,
  GapEvaluationOutputSchema,
  GapClausePairPromptInput,
} from '../types';
import { StatutoryBenchmarkService } from './statutoryBenchmarkService';
import { PolicyVectorIndexService } from './policyVectorIndexService';
import { buildGapMatrixPrompt } from '@/shared/ai-engine/prompts/gapMatrixPrompts';

export interface ExecuteGapEvaluationParams {
  organizationId: string;
  policyId: string;
  benchmarkDocumentVersionId: string;
  userId?: string | null;
  policyTitle?: string;
  department?: string;
}

/**
 * 5-W Operational Synthesis & Deterministic Penalty Engine
 * Integrates hybrid statutory clause retrieval, structured 5-W synthesis,
 * deterministic penalty attachment from statutory_penalties, and immutable audit logging.
 */
export class GapSynthesisService {
  private dbClient: SupabaseClient<Database>;
  private aiEngine: AiEngine;
  private benchmarkService: StatutoryBenchmarkService;
  private vectorIndexService: PolicyVectorIndexService;
  private auditService: AuditService;

  constructor(options: {
    dbClient: SupabaseClient<Database>;
    aiEngine?: AiEngine;
    benchmarkService?: StatutoryBenchmarkService;
    vectorIndexService?: PolicyVectorIndexService;
    auditService?: AuditService;
  } | SupabaseClient<Database>) {
    const client = options && 'dbClient' in options ? options.dbClient : (options as SupabaseClient<Database>);
    if (!client) {
      throw new ConfigurationError('GapSynthesisService requires an RLS-bound SupabaseClient');
    }
    this.dbClient = client;

    this.aiEngine = (options && 'aiEngine' in options && options.aiEngine)
      ? options.aiEngine
      : new AiEngine();
    this.benchmarkService = (options && 'benchmarkService' in options && options.benchmarkService)
      ? options.benchmarkService
      : new StatutoryBenchmarkService({ dbClient: this.dbClient });
    this.vectorIndexService = (options && 'vectorIndexService' in options && options.vectorIndexService)
      ? options.vectorIndexService
      : new PolicyVectorIndexService({ dbClient: this.dbClient });
    this.auditService = (options && 'auditService' in options && options.auditService)
      ? options.auditService
      : new AuditService(this.dbClient);
  }

  /**
   * Executes full end-to-end 5-W Gap Evaluation between internal policy and statutory baseline
   */
  public async evaluatePolicyGap(
    params: ExecuteGapEvaluationParams
  ): Promise<GapEvaluationResult> {
    const startTime = performance.now();
    const evaluationId = crypto.randomUUID();
    const { organizationId, policyId, benchmarkDocumentVersionId, userId } = params;

    const { data: policyDoc, error: policyErr } = await this.dbClient
      .from('policy_documents')
      .select('title, department')
      .eq('id', policyId)
      .eq('organization_id', organizationId)
      .single();

    if (policyErr || !policyDoc) {
      logger.error({ err: policyErr?.message, policyId, organizationId }, 'Policy document not found for tenant');
      throw new Error(`Policy document not found: ${policyErr?.message || 'Invalid policyId'}`);
    }

    const policyTitle = policyDoc.title;
    const policyDepartment = policyDoc.department;

    // Fetch benchmark title & regulator
    const { data: verRow } = await (this.dbClient.from('regulatory_document_versions') as any)
      .select('id, instrument_id, regulatory_instruments(title, short_name, regulatory_bodies(code))')
      .eq('id', benchmarkDocumentVersionId)
      .maybeSingle();

    const benchmarkTitle = verRow?.regulatory_instruments?.title || 'Statutory Regulatory Framework';
    const issuingRegulator = verRow?.regulatory_instruments?.regulatory_bodies?.code || 'CBN';

    const statutoryClauses = await this.benchmarkService.getBenchmarkClausesWithObligations(
      benchmarkDocumentVersionId
    );

    if (statutoryClauses.length === 0) {
      throw new Error(`No statutory clauses found for benchmark version ${benchmarkDocumentVersionId}`);
    }

    const promptPairs: GapClausePairPromptInput[] = [];
    const matchedMetadataList: {
      sectionReference?: string;
      statutoryClauseId: string;
      obligationId: string | null;
      statutoryPenaltyNaira: number;
      statutoryLegalCitation: string;
      carriesCriminalLiability: boolean;
      carriesLicenseSuspension: boolean;
      matchedPolicyClauseId: string | null;
      matchedSectionNumber: string | null;
      statutoryQuote?: string | null;
      policyEvidenceQuote?: string | null;
      characterSpanStart?: number | null;
      characterSpanEnd?: number | null;
      complianceCriteria?: string[] | null;
      assessment?: string | null;
      statutoryTimelineDays?: number | null;
    }[] = [];

    for (const statClause of statutoryClauses) {
      const obligationsToEvaluate = statClause.obligations.length > 0
        ? statClause.obligations
        : [
            {
              obligationId: null as string | null,
              obligationType: 'GENERAL_COMPLIANCE' as const,
              summary: statClause.clauseText.slice(0, 150),
              severityFloor: 'HIGH' as const,
              statutoryTimelineDays: null as number | null,
              mandatoryDisclosureText: null as string | null,
              verbatimQuote: statClause.clauseText,
              characterSpanStart: null as number | null,
              characterSpanEnd: null as number | null,
              complianceCriteria: [] as string[],
              assessment: null as string | null,
              penalties: [],
            },
          ];

      for (const obligation of obligationsToEvaluate) {
        const penalty = obligation.penalties?.[0];
        const queryText = `${statClause.sectionHeading}: ${obligation.summary || obligation.verbatimQuote || statClause.clauseText}`;
        const matches = await this.vectorIndexService.searchSimilarClauses({
          organizationId,
          policyId,
          queryText,
          matchThreshold: 0.1,
          matchCount: 3,
        });

        const topMatch = matches.length > 0 ? matches[0] : null;
        const citation = penalty?.penaltyLegalCitation || `${benchmarkTitle} (${statClause.sectionReference})`;

        promptPairs.push({
          statutoryClause: {
            sectionReference: statClause.sectionReference,
            sectionHeading: statClause.sectionHeading,
            clauseText: statClause.clauseText,
            obligationSummary: obligation.summary || statClause.clauseText.slice(0, 150),
            severity: obligation.severityFloor || 'HIGH',
            statutoryTimelineDays: obligation.statutoryTimelineDays ?? null,
            mandatoryDisclosure: obligation.mandatoryDisclosureText || null,
            legalCitation: citation,
          },
          matchedInternalClause: topMatch
            ? {
                sectionNumber: topMatch.sectionNumber,
                clauseText: topMatch.clauseText,
                similarity: topMatch.similarity,
              }
            : null,
          policyTitle,
          department: policyDepartment,
          benchmarkTitle,
          issuingRegulator,
        });

        matchedMetadataList.push({
          sectionReference: statClause.sectionReference,
          statutoryClauseId: statClause.clauseId,
          obligationId: obligation.obligationId || null,
          statutoryPenaltyNaira: penalty ? penalty.penaltyMaxNaira : 0,
          statutoryLegalCitation: citation,
          carriesCriminalLiability: penalty?.carriesPersonalCriminalLiability || false,
          carriesLicenseSuspension: penalty?.carriesLicenseSuspensionRisk || false,
          matchedPolicyClauseId: topMatch ? topMatch.policyClauseId : null,
          matchedSectionNumber: topMatch ? topMatch.sectionNumber : null,
          statutoryQuote: obligation.verbatimQuote || statClause.clauseText,
          policyEvidenceQuote: topMatch ? topMatch.clauseText : null,
          characterSpanStart: obligation.characterSpanStart ?? null,
          characterSpanEnd: obligation.characterSpanEnd ?? null,
          complianceCriteria: obligation.complianceCriteria ?? null,
          assessment: obligation.assessment ?? null,
          statutoryTimelineDays: obligation.statutoryTimelineDays ?? null,
        });
      }
    }

    const { systemInstruction, prompt } = buildGapMatrixPrompt({
      pairs: promptPairs,
      policyTitle,
      department: policyDepartment,
      benchmarkTitle,
      issuingRegulator,
    });

    let aiResult;
    try {
      aiResult = await this.aiEngine.generateStructured({
        systemInstruction,
        prompt,
        schema: GapEvaluationOutputSchema,
        modelAlias: 'FAST_MODEL',
      });
    } catch (aiErr) {
      const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
      logger.warn({ err: msg, evaluationId }, 'AI 5-W gap synthesis unavailable; executing deterministic 5-W concordance synthesis');
      aiResult = {
        data: this.generateDeterministicGapOutput(promptPairs),
        telemetry: {
          modelIdentifier: 'deterministic-concordance-engine',
          latencyMs: 10,
          inputTokenCount: 0,
          outputTokenCount: 0,
          rawPromptHash: crypto.createHash('sha256').update(prompt).digest('hex'),
          rawOutputHash: crypto.createHash('sha256').update('deterministic-output').digest('hex'),
        },
      };
    }

    const { data: synthesisOutput, telemetry } = aiResult;

    let adequatelyMetCount = 0;
    let partiallyMetCount = 0;
    let criticalGapsCount = 0;
    let totalPotentialPenaltyNaira = 0;

    const evaluatedItems: EvaluatedGapItem[] = [];

    for (let i = 0; i < promptPairs.length; i++) {
      const meta = matchedMetadataList[i];
      const targetRef = meta.sectionReference?.toLowerCase().trim();

      const synthesized =
        synthesisOutput.items.find(
          (item) => item.regulatoryClauseReference?.toLowerCase().trim() === targetRef
        ) || synthesisOutput.items[i];

      if (!synthesized) {
        throw new Error(`Incomplete synthesis response for clause ${meta.sectionReference || i + 1}`);
      }

      const status = synthesized.suggestedStatus;
      const appliedPenalty = status === 'ADEQUATELY_MET' ? 0 : meta.statutoryPenaltyNaira;

      if (status === 'CRITICAL_GAP') {
        criticalGapsCount++;
      } else if (status === 'PARTIALLY_MET') {
        partiallyMetCount++;
      } else {
        adequatelyMetCount++;
      }

      totalPotentialPenaltyNaira += appliedPenalty;

      const draftLanguage =
        synthesized.draftReplacementPolicyLanguage ||
        (synthesized as { draftReplacementLanguage?: string }).draftReplacementLanguage ||
        synthesized.whatToDo;

      evaluatedItems.push({
        id: crypto.randomUUID(),
        evaluationId,
        regulatoryClauseId: meta.statutoryClauseId,
        obligationId: meta.obligationId,
        policyClauseId: meta.matchedPolicyClauseId,
        complianceStatus: status,
        statutoryPenaltyNaira: appliedPenalty,
        statutoryLegalCitation: meta.statutoryLegalCitation,
        carriesPersonalCriminalLiability: meta.carriesCriminalLiability,
        carriesLicenseSuspensionRisk: meta.carriesLicenseSuspension,
        regulatoryClauseReference: synthesized.regulatoryClauseReference,
        matchedPolicySection: synthesized.matchedPolicySection,
        matchedPolicyText: synthesized.matchedPolicyText,
        suggestedStatus: status,
        whatHappened: synthesized.whatHappened,
        whatToKnow: synthesized.whatToKnow,
        whatHasChanged: synthesized.whatHasChanged,
        whatToDo: synthesized.whatToDo,
        draftReplacementLanguage: draftLanguage,
        draftReplacementPolicyLanguage: draftLanguage,
        derivedInsight: synthesized.derivedInsight,
        responsibleRole: synthesized.responsibleRole,
        statutoryRemediationTimelineDays: meta.statutoryTimelineDays ?? undefined,
        statutoryQuote: meta.statutoryQuote || undefined,
        policyEvidenceQuote: meta.policyEvidenceQuote || null,
        characterSpanStart: meta.characterSpanStart ?? undefined,
        characterSpanEnd: meta.characterSpanEnd ?? undefined,
        complianceCriteria: meta.complianceCriteria || undefined,
        assessment: meta.assessment || undefined,
      });
    }

    const totalItems = evaluatedItems.length;
    const overallCompliancePercentage = totalItems > 0
      ? Math.round(((adequatelyMetCount * 100 + partiallyMetCount * 50) / totalItems) * 100) / 100
      : 100;

    const analysisRunId = crypto.randomUUID();
    const isUuid = (val: string | null | undefined): boolean =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

    if (!isUuid(benchmarkDocumentVersionId)) {
      throw new Error(`Invalid benchmarkDocumentVersionId "${benchmarkDocumentVersionId}": must be a valid UUID`);
    }

    await this.dbClient.from('ai_analysis_runs').insert({
      id: analysisRunId,
      organization_id: organizationId,
      user_id: userId || null,
      pipeline_type: 'GAP_MATRIX_EVALUATION',
      model_identifier: telemetry.modelIdentifier,
      prompt_template_version: 'v1.2-5w-matrix',
      input_token_count: telemetry.inputTokenCount,
      output_token_count: telemetry.outputTokenCount,
      latency_ms: telemetry.latencyMs,
      retrieved_clause_ids: matchedMetadataList.map((m) => m.statutoryClauseId),
      raw_prompt_hash: telemetry.rawPromptHash,
      raw_output_hash: telemetry.rawOutputHash,
    });

    const { error: evalInsertErr } = await (this.dbClient.from('gap_evaluations') as any).insert({
      id: evaluationId,
      organization_id: organizationId,
      policy_id: policyId,
      benchmark_document_version_id: benchmarkDocumentVersionId,
      analysis_run_id: analysisRunId,
      analysis_name: `${benchmarkTitle} vs ${policyTitle}`,
      regulation_ids: verRow?.instrument_id ? [verRow.instrument_id] : [],
      policy_ids: [policyId],
      overall_compliance_percentage: overallCompliancePercentage,
      critical_gaps_count: criticalGapsCount,
      partially_met_count: partiallyMetCount,
      adequately_met_count: adequatelyMetCount,
    });

    if (evalInsertErr) {
      logger.error({ err: evalInsertErr.message, evaluationId }, 'Failed persisting gap_evaluations');
      throw new Error(`Failed persisting gap evaluation: ${evalInsertErr.message}`);
    }

    const itemsToInsert = evaluatedItems.map((item) => ({
      id: item.id,
      organization_id: organizationId,
      evaluation_id: evaluationId,
      regulatory_clause_id: isUuid(item.regulatoryClauseId) ? item.regulatoryClauseId : null,
      obligation_id: isUuid(item.obligationId) ? item.obligationId : null,
      policy_clause_id: isUuid(item.policyClauseId) ? item.policyClauseId : null,
      compliance_status: item.complianceStatus,
      statutory_penalty_naira: item.statutoryPenaltyNaira,
      what_happened: item.whatHappened,
      what_to_know: item.whatToKnow,
      what_has_changed: item.whatHasChanged,
      what_to_do: item.whatToDo,
      draft_replacement_language: item.draftReplacementLanguage || item.draftReplacementPolicyLanguage,
      responsible_role: item.responsibleRole || 'Chief Compliance Officer',
      remediation_timeline_days: item.statutoryRemediationTimelineDays ?? null,
      derived_insight: item.derivedInsight,
    }));

    const { error: itemsInsertErr } = await (this.dbClient.from('gap_matrix_items') as any).insert(itemsToInsert);
    if (itemsInsertErr) {
      logger.error({ err: itemsInsertErr.message, evaluationId }, 'Failed persisting gap_matrix_items');
      throw new Error(`Failed persisting gap matrix items: ${itemsInsertErr.message}`);
    }

    const auditInputHash = AuditService.computeSha256({
      policyId,
      benchmarkDocumentVersionId,
      pairsCount: promptPairs.length,
    });

    const auditOutputHash = AuditService.computeSha256({
      evaluationId,
      overallCompliancePercentage,
      criticalGapsCount,
      partiallyMetCount,
      adequatelyMetCount,
      totalPotentialPenaltyNaira,
    });

    const auditEntry = await this.auditService.recordLog({
      organizationId,
      userId: userId || undefined,
      action: 'GAP_MATRIX_EVALUATION_COMPLETED',
      entityType: 'gap_evaluations',
      entityId: evaluationId,
      sha256InputHash: auditInputHash,
      sha256OutputHash: auditOutputHash,
      metadata: {
        policyTitle,
        benchmarkTitle,
        overallCompliancePercentage,
        criticalGapsCount,
        partiallyMetCount,
        adequatelyMetCount,
        totalPotentialPenaltyNaira,
        latencyMs: Math.round(performance.now() - startTime),
      },
    });

    return {
      evaluationId,
      policyId,
      policyTitle,
      organizationId,
      benchmarkDocumentVersionId,
      benchmarkTitle,
      overallCompliancePercentage,
      criticalGapsCount,
      partiallyMetCount,
      adequatelyMetCount,
      totalPotentialPenaltyNaira,
      items: evaluatedItems,
      executiveSummary: synthesisOutput.executiveSummary,
      analysisRunId,
      auditId: auditEntry.id,
      createdAt: new Date().toISOString(),
    };
  }

  private generateDeterministicGapOutput(
    promptPairs: GapClausePairPromptInput[]
  ): z.infer<typeof GapEvaluationOutputSchema> {
    const items = promptPairs.map((p) => {
      const match = p.matchedInternalClause;
      const stat = p.statutoryClause;
      const isMet = Boolean(match && match.similarity >= 0.75);
      const isPartial = Boolean(match && !isMet);
      const status: ComplianceStatus = isMet ? 'ADEQUATELY_MET' : isPartial ? 'PARTIALLY_MET' : 'CRITICAL_GAP';

      return {
        regulatoryClauseReference: stat.sectionReference,
        matchedPolicySection: match ? match.sectionNumber : null,
        matchedPolicyText: match ? match.clauseText : null,
        suggestedStatus: status,
        whatHappened: `Statutory mandate "${stat.obligationSummary}" evaluated against policy manual "${p.policyTitle}".`,
        whatToKnow: `Supervisory mandate issued by ${p.issuingRegulator} under ${stat.legalCitation}.`,
        whatHasChanged: match
          ? `Policy section ${match.sectionNumber} addresses baseline controls with operational variance.`
          : 'Complete omission from internal policy manual.',
        whatToDo: 'Chief Compliance Officer must adopt board-cleared replacement language.',
        draftReplacementPolicyLanguage: `The institution shall adhere strictly to ${stat.sectionReference} (${stat.obligationSummary}).`,
        derivedInsight: `Eliminates supervisory exposure under ${stat.legalCitation}.`,
        responsibleRole: 'Chief Compliance Officer',
        statutoryRemediationTimelineDays: stat.statutoryTimelineDays || 30,
      };
    });

    return {
      executiveSummary: `Automated clause-by-clause statutory concordance review of policy manual "${promptPairs[0]?.policyTitle || 'Policy'}" against "${promptPairs[0]?.benchmarkTitle || 'Statutory Benchmark'}".`,
      items,
    };
  }
}
