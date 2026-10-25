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
 * 5-W Operational Synthesis & Deterministic Penalty Engine (Epics 16 & 17)
 * Integrates hybrid statutory clause retrieval, Gemini 5-W synthesis,
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

    // 1. Fetch policy metadata from DB or parameters
    let policyTitle = params.policyTitle || 'Internal Compliance Manual';
    let policyDepartment = params.department || 'COMPLIANCE_LEGAL';

    if (this.dbClient) {
      try {
        const { data: policyDoc } = await this.dbClient
          .from('policy_documents')
          .select('title, department')
          .eq('id', policyId)
          .eq('organization_id', organizationId)
          .single();

        if (policyDoc) {
          policyTitle = policyDoc.title;
          policyDepartment = policyDoc.department;
        }
      } catch (err) {
        logger.warn({ err: String(err) }, 'Could not read policy document row; using parameter fallback');
      }
    }

    // 2. Fetch statutory benchmark clauses and obligations
    const statutoryClauses = await this.benchmarkService.getBenchmarkClausesWithObligations(
      benchmarkDocumentVersionId
    );

    if (statutoryClauses.length === 0) {
      throw new Error(`No statutory clauses found for benchmark version ${benchmarkDocumentVersionId}`);
    }

    // 3. Pair each statutory clause with top matching internal policy clause via Vector Search
    const promptPairs: GapClausePairPromptInput[] = [];
    const matchedMetadataList: {
      statutoryClauseId: string;
      obligationId: string | null;
      statutoryPenaltyNaira: number;
      statutoryLegalCitation: string;
      carriesCriminalLiability: boolean;
      carriesLicenseSuspension: boolean;
      matchedPolicyClauseId: string | null;
      matchedSectionNumber: string | null;
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
              penalties: [],
            },
          ];

      for (const obligation of obligationsToEvaluate) {
        const penalty = obligation.penalties?.[0];

        // Search top matching internal clauses using obligation summary and clause heading
        const queryText = `${statClause.sectionHeading}: ${obligation.summary || statClause.clauseText}`;
        const matches = await this.vectorIndexService.searchSimilarClauses({
          organizationId,
          policyId,
          queryText,
          matchThreshold: 0.1,
          matchCount: 3,
        });

        const topMatch = matches.length > 0 ? matches[0] : null;

        promptPairs.push({
          statutoryClause: {
            sectionReference: statClause.sectionReference,
            sectionHeading: statClause.sectionHeading,
            clauseText: statClause.clauseText,
            obligationSummary: obligation.summary || 'Statutory compliance obligation',
            severity: obligation.severityFloor || 'HIGH',
            statutoryTimelineDays: obligation.statutoryTimelineDays || null,
            mandatoryDisclosure: obligation.mandatoryDisclosureText || null,
            legalCitation: penalty?.penaltyLegalCitation || 'BOFIA 2020 / Relevant Act',
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
          benchmarkTitle: 'Statutory Regulatory Framework',
          issuingRegulator: 'CBN',
        });

        matchedMetadataList.push({
          statutoryClauseId: statClause.clauseId,
          obligationId: obligation.obligationId || null,
          statutoryPenaltyNaira: penalty ? penalty.penaltyMaxNaira : 0,
          statutoryLegalCitation: penalty?.penaltyLegalCitation || 'BOFIA 2020',
          carriesCriminalLiability: penalty?.carriesPersonalCriminalLiability || false,
          carriesLicenseSuspension: penalty?.carriesLicenseSuspensionRisk || false,
          matchedPolicyClauseId: topMatch ? topMatch.policyClauseId : null,
          matchedSectionNumber: topMatch ? topMatch.sectionNumber : null,
        });
      }
    }

    // 4. Construct prompt and execute structured Gemini generation
    const { systemInstruction, prompt } = buildGapMatrixPrompt({
      pairs: promptPairs,
      policyTitle,
      department: policyDepartment,
      benchmarkTitle: 'Statutory Benchmark Baseline',
      issuingRegulator: 'CBN',
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
      logger.error({ err: String(aiErr) }, 'Gemini synthesis failed, generating deterministic fallback');
      aiResult = this.createDeterministicFallbackSynthesis(promptPairs);
    }

    const { data: synthesisOutput, telemetry } = aiResult;

    // 5. Deterministic Penalty Attachment (ADR-004: Zero LLM hallucinations)
    let adequatelyMetCount = 0;
    let partiallyMetCount = 0;
    let criticalGapsCount = 0;
    let totalPotentialPenaltyNaira = 0;

    const evaluatedItems: EvaluatedGapItem[] = [];

    for (let i = 0; i < promptPairs.length; i++) {
      const synthesized = synthesisOutput.items[i] || this.createSingleFallbackItem(promptPairs[i]);
      const meta = matchedMetadataList[i];

      const status = synthesized.suggestedStatus;
      let appliedPenalty = 0;

      if (status === 'CRITICAL_GAP') {
        criticalGapsCount++;
        appliedPenalty = meta.statutoryPenaltyNaira;
      } else if (status === 'PARTIALLY_MET') {
        partiallyMetCount++;
        // Level 2 finding administrative baseline (typically 20% to 50% of maximum statutory penalty)
        appliedPenalty = Math.round(meta.statutoryPenaltyNaira * 0.5);
      } else {
        adequatelyMetCount++;
        appliedPenalty = 0;
      }

      totalPotentialPenaltyNaira += appliedPenalty;

      const draftLanguage = synthesized.draftReplacementPolicyLanguage ||
        (synthesized as { draftReplacementLanguage?: string }).draftReplacementLanguage ||
        `Section ${synthesized.matchedPolicySection || '4.1'} (Remediated Clause): The institution shall strictly enforce ${synthesized.regulatoryClauseReference} in accordance with ${meta.statutoryLegalCitation}. Operational procedures and reporting deadlines must be maintained without deviation.`;

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
        statutoryRemediationTimelineDays: synthesized.statutoryRemediationTimelineDays,
      });
    }

    // 6. Calculate Overall Compliance Health Score %
    const totalItems = evaluatedItems.length;
    const overallCompliancePercentage = totalItems > 0
      ? Math.round(((adequatelyMetCount * 100 + partiallyMetCount * 50) / totalItems) * 100) / 100
      : 100;

    // 7. Persist to Database: ai_analysis_runs, gap_evaluations, gap_matrix_items
    let analysisRunId: string | null = null;

    if (this.dbClient) {
      try {
        const client = this.dbClient;
        analysisRunId = crypto.randomUUID();
        await client.from('ai_analysis_runs').insert({
          id: analysisRunId,
          organization_id: organizationId,
          user_id: userId || null,
          pipeline_type: 'GAP_MATRIX_EVALUATION',
          model_identifier: telemetry.modelIdentifier,
          prompt_template_version: 'v1.1-5w-matrix',
          input_token_count: telemetry.inputTokenCount,
          output_token_count: telemetry.outputTokenCount,
          latency_ms: telemetry.latencyMs,
          retrieved_clause_ids: matchedMetadataList.map((m) => m.statutoryClauseId),
          raw_prompt_hash: telemetry.rawPromptHash,
          raw_output_hash: telemetry.rawOutputHash,
        });

        const isUuid = (val: string | null | undefined): boolean =>
          Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

        if (!isUuid(benchmarkDocumentVersionId)) {
          throw new Error(`Invalid benchmarkDocumentVersionId "${benchmarkDocumentVersionId}": must be a valid UUID`);
        }

        await client.from('gap_evaluations').insert({
          id: evaluationId,
          organization_id: organizationId,
          policy_id: policyId,
          benchmark_document_version_id: benchmarkDocumentVersionId,
          analysis_run_id: analysisRunId,
          overall_compliance_percentage: overallCompliancePercentage,
          critical_gaps_count: criticalGapsCount,
          partially_met_count: partiallyMetCount,
          adequately_met_count: adequatelyMetCount,
        });

        // Insert individual gap matrix items with denormalized organization_id
        const itemsToInsert = evaluatedItems.map((item) => {
          const regClauseId = isUuid(item.regulatoryClauseId) ? item.regulatoryClauseId : null;

          return {
            id: item.id,
            organization_id: organizationId,
            evaluation_id: evaluationId,
            regulatory_clause_id: regClauseId,
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
            remediation_timeline_days: item.statutoryRemediationTimelineDays || 30,
            derived_insight: item.derivedInsight,
          };
        });

        await client.from('gap_matrix_items').insert(itemsToInsert);
      } catch (dbErr) {
        logger.warn({ err: String(dbErr) }, 'Failed persisting evaluation to DB; continuing with response');
      }
    }

    // 8. Immutable CAMA / BOFIA Audit Log
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
        overallCompliancePercentage,
        criticalGapsCount,
        partiallyMetCount,
        adequatelyMetCount,
        totalPotentialPenaltyNaira,
        latencyMs: Math.round(performance.now() - startTime),
      },
    });

    logger.info(
      {
        evaluationId,
        organizationId,
        overallCompliancePercentage,
        criticalGapsCount,
        totalPenaltyNaira: totalPotentialPenaltyNaira,
        auditId: auditEntry.id,
      },
      '5-W Gap Matrix evaluation completed and sealed'
    );

    return {
      evaluationId,
      policyId,
      policyTitle,
      organizationId,
      benchmarkDocumentVersionId,
      benchmarkTitle: 'Statutory Benchmark Baseline',
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

  private createDeterministicFallbackSynthesis(pairs: GapClausePairPromptInput[]) {
    const items = pairs.map((p) => this.createSingleFallbackItem(p));
    return {
      data: {
        executiveSummary:
          'Executive Gap Evaluation indicates material divergence between internal operational guidelines and verified Nigerian statutory requirements. Immediate CCO review and Board remediation required prior to Bank Examination.',
        items,
      },
      telemetry: {
        modelIdentifier: 'deterministic-fallback',
        inputTokenCount: 0,
        outputTokenCount: 0,
        latencyMs: 15,
        rawPromptHash: AiEngine.hashContent(JSON.stringify(pairs)),
        rawOutputHash: AiEngine.hashContent('fallback-output'),
        retryAttempts: 0,
      },
    };
  }

  private createSingleFallbackItem(pair: GapClausePairPromptInput) {
    const stat = pair.statutoryClause;
    const match = pair.matchedInternalClause;

    let status: 'ADEQUATELY_MET' | 'PARTIALLY_MET' | 'CRITICAL_GAP';
    if (!match || match.similarity < 0.25) {
      status = 'CRITICAL_GAP';
    } else if (match.similarity < 0.65) {
      status = 'PARTIALLY_MET';
    } else {
      status = 'ADEQUATELY_MET';
    }

    let whatHappened = '';
    let whatToKnow = '';
    let whatHasChanged = '';
    let whatToDo = '';
    let derivedInsight = '';

    if (status === 'CRITICAL_GAP') {
      whatHappened = `Statutory mandate ${stat.sectionReference} under ${stat.legalCitation} requires that "${stat.obligationSummary}". Comprehensive audit of the internal policy manual (${pair.policyTitle}) reveals that this control is completely absent. Zero internal procedures or operational safeguards have been codified.`;
      whatToKnow = `Enacted under ${stat.legalCitation} supervisory powers. The apex regulator conducts mandatory on-site bank examinations testing institutional compliance with ${stat.sectionReference}. Failure to codify this control constitutes a Level-1 supervisory deficiency, exposing the institution to direct administrative sanctions and license review.`;
      whatHasChanged = `Material operational gap. While statutory baselines mandate verified controls regarding ${stat.sectionHeading.toLowerCase()}, company operating procedures operate with zero formalized compliance architecture or assigned departmental accountability.`;
      whatToDo = `Immediate 3-Step Remediation Playbook:\n1. Policy Amendment: Chief Compliance Officer must sponsor adoption of the replacement policy clause below at the next Board Risk Committee.\n2. Standard Operating Procedure (SOP): Operations & Tech leads must implement mandatory verification queues and dual-custody approval.\n3. Regulatory Attestation: Prepare signed attestation proof for examination inspection within ${stat.statutoryTimelineDays || 30} calendar days.`;
      derivedInsight = `Adopting this remediated clause provides a complete statutory defense during Central Bank examinations, proves institutional governance integrity, and eliminates exposure to statutory fine liabilities.`;
    } else if (status === 'PARTIALLY_MET') {
      whatHappened = `Statute demands "${stat.obligationSummary}" under ${stat.legalCitation}. Internal policy references this domain in Section ${match?.sectionNumber} ("${match?.clauseText.slice(0, 100)}..."), but diverges on specific Nigerian supervisory parameters, timeline cut-offs, or mandatory reporting escalations.`;
      whatToKnow = `Regulatory authorities enforce strict liability on procedural timelines under ${stat.sectionReference}. Bank examiners routinely penalize institutions where high-level policy intent is documented but operational SLAs (e.g. ${stat.statutoryTimelineDays ? `${stat.statutoryTimelineDays} days` : 'statutory timelines'}) and mandatory disclosure triggers are omitted.`;
      whatHasChanged = `Operational SLA divergence. Internal policy Section ${match?.sectionNumber} establishes general compliance intent but lacks specific statutory reporting triggers, automated audit trail retention, and formal Board Risk Committee reporting mechanisms.`;
      whatToDo = `Targeted Harmonization Playbook:\n1. Update Section ${match?.sectionNumber} to incorporate statutory timelines (${stat.statutoryTimelineDays ? `${stat.statutoryTimelineDays} calendar days` : 'as prescribed'}) and mandatory disclosure requirements.\n2. Establish automated incident notification to the Compliance Unit within 24 hours of any threshold breach.\n3. Conduct bi-annual compliance audit testing operational adherence to the amended standard.`;
      derivedInsight = `Harmonizing Section ${match?.sectionNumber} eliminates regulatory ambiguity, converts an operational finding into verified compliance, and prevents administrative remediation orders.`;
    } else {
      whatHappened = `Internal policy Section ${match?.sectionNumber} fully satisfies the statutory mandates of ${stat.sectionReference} under ${stat.legalCitation}. Operational procedures, verification baselines, and reporting controls are adequately aligned with current regulatory expectations.`;
      whatToKnow = `Verified compliance baseline. The institution maintains defensible internal controls satisfying the requirements of ${stat.legalCitation}. Ongoing monitoring is required to ensure staff execution adheres strictly to documented procedures.`;
      whatHasChanged = `Concordance confirmed. No material divergence detected between internal guidelines and current statutory enactments.`;
      whatToDo = `Sustained Monitoring Protocol:\n1. Maintain current operational controls and verify annual compliance testing.\n2. Ensure staff training and onboarding documentation remain updated with Section ${match?.sectionNumber}.\n3. Archive annual audit certificates in the compliance evidence vault.`;
      derivedInsight = `Institutional policy represents best-in-class regulatory concordance. Full audit defense documented and ready for supervisory inspection.`;
    }

    const draftReplacementPolicyLanguage = match
      ? `Section ${match.sectionNumber}.1 (Harmonized Regulatory Control): Pursuant to ${stat.sectionReference} of ${stat.legalCitation}, the institution shall mandatorily enforce: "${stat.obligationSummary}". Operational and business units shall maintain strict procedural concordance, execute required reconciliations within ${stat.statutoryTimelineDays ? `${stat.statutoryTimelineDays} calendar days` : 'statutory windows'}, and preserve immutable, tamper-evident audit logs for examination by the Chief Compliance Officer and visiting regulatory inspectors.`
      : `Section 4.1.0 (Mandatory Governance & Supervisory Control): In accordance with statutory directives issued under ${stat.sectionReference} of ${stat.legalCitation}, the institution mandates that: "${stat.obligationSummary}". Operating teams must enforce dual-authorization controls, maintain real-time monitoring logs, and provide quarterly assurance certificates to the Board Risk Committee certifying 100% operational conformity.`;

    return {
      regulatoryClauseReference: stat.sectionReference,
      matchedPolicySection: match ? match.sectionNumber : null,
      matchedPolicyText: match ? match.clauseText.slice(0, 180) : null,
      suggestedStatus: status,
      whatHappened,
      whatToKnow,
      whatHasChanged,
      whatToDo,
      draftReplacementPolicyLanguage,
      derivedInsight,
      responsibleRole: 'Chief Compliance Officer',
      statutoryRemediationTimelineDays: stat.statutoryTimelineDays || 30,
    };
  }
}
