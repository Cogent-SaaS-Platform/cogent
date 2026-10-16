/**
 * Pillar 1: Marketing & Growth Pre-Vetting Shield Service
 * Orchestrates:
 * Stage 1: Deterministic Rule Evaluation (< 50ms)
 * Stage 2: Relational Tenant License Context
 * Stage 3: Hybrid Statutory Retrieval (pgvector + tsvector via RRF)
 * Stage 4: Gemini AI Candidate Extraction & Compliant Rewrite
 * Stage 5: Deterministic Post-Processing & Penalty Calculation
 * Stage 6: Persistence & Audit Traceability
 * Stage 7: Presentation Transformation into MarketingShieldViewModel (Section 7 Contract)
 *
 * Adheres strictly to:
 * - docs/PILLAR_1_MARKETING_SHIELD.md
 * - docs/AI_ENGINE.md Section 7
 * - docs/ARCHITECTURE.md Section 6
 * - docs/MVP.md AC-01 through AC-05
 */

import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { AiEngine } from '@/shared/ai-engine';
import {
  MarketingAnalysisOutput,
  MarketingAnalysisOutputSchema,
} from '@/shared/ai-engine/schemas/marketingCandidateSchema';
import {
  buildMarketingShieldPrompt,
  RetrievedClauseContext,
} from '@/shared/ai-engine/prompts/marketingShieldPrompts';
import { createClient } from '@/shared/db';
import { REGULATORY_INSTRUMENTS_SEED } from '@/shared/db/regulatoryCorpusData';
import {
  MarketingChannel,
  ProductCategoryCode,
  RegulatorCode,
  ScanVerdict,
  SeverityLevel,
} from '@/shared/types';
import {
  FindingPresentationCard,
  MarketingShieldViewModel,
  PresentationActionItem,
} from '@/shared/types/presentation';
import { logger } from '@/shared/logger';
import {
  DeterministicEvaluationResult,
  DeterministicRuleEvaluator,
  ProhibitedTermDefinition,
} from './deterministicMatcher';
import { HybridRetrievalService, RetrievedStatutoryClause } from './hybridRetrieval';
import { AuditService } from '@/modules/audit';
import { ClaimsLedgerService, ClaimsLedgerEvaluationResult } from './claimsLedgerService';

export interface ExecuteScanInput {
  organizationId: string;
  userId?: string;
  campaignName: string;
  channel: MarketingChannel;
  productCategory?: ProductCategoryCode;
  rawCopy: string;
  targetAudienceDescription?: string;
}

export class MarketingShieldService {
  private aiEngine: AiEngine;
  private hybridRetrieval: HybridRetrievalService;
  private dbClient: SupabaseClient;
  private auditService: AuditService;
  private claimsLedgerService: ClaimsLedgerService;
  private evaluator: DeterministicRuleEvaluator | null = null;
  private cachedTerms: ProhibitedTermDefinition[] | null = null;
  private lastTermsLoadedAt = 0;
  private readonly TERMS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    aiEngine?: AiEngine,
    hybridRetrieval?: HybridRetrievalService,
    dbClient?: SupabaseClient,
    auditService?: AuditService,
    claimsLedgerService?: ClaimsLedgerService
  ) {
    this.aiEngine = aiEngine || new AiEngine();
    this.dbClient = dbClient || createClient();
    this.hybridRetrieval = hybridRetrieval || new HybridRetrievalService(this.aiEngine, this.dbClient);
    this.auditService = auditService || new AuditService(this.dbClient);
    this.claimsLedgerService = claimsLedgerService || new ClaimsLedgerService(this.dbClient);
  }

  /**
   * Loads prohibited terms from database or falls back to seed corpus
   */
  public async getProhibitedTerms(): Promise<ProhibitedTermDefinition[]> {
    const now = Date.now();
    if (this.cachedTerms && now - this.lastTermsLoadedAt < this.TERMS_CACHE_TTL_MS) {
      return this.cachedTerms;
    }

    try {
      const { data: dbTerms, error } = await this.dbClient
        .from('prohibited_terms')
        .select(`
          id,
          obligation_id,
          exact_pattern,
          is_regex,
          severity,
          statutory_rationale,
          mandatory_disclosure_required,
          regulatory_obligations (
            clause_id,
            regulatory_clauses (
              section_reference,
              regulatory_document_versions (
                regulatory_instruments (
                  regulatory_bodies (
                    code
                  )
                )
              )
            ),
            statutory_penalties (
              penalty_legal_citation,
              penalty_min_naira
            )
          )
        `);

      if (!error && dbTerms && dbTerms.length > 0) {
        interface JoinedDbTerm {
          id: string;
          obligation_id: string;
          exact_pattern: string;
          is_regex: boolean;
          severity: string;
          statutory_rationale: string;
          mandatory_disclosure_required: string | null;
          regulatory_obligations?: {
            clause_id?: string;
            regulatory_clauses?: {
              section_reference?: string;
              regulatory_document_versions?: {
                regulatory_instruments?: {
                  regulatory_bodies?: {
                    code?: string;
                  } | null;
                } | null;
              } | null;
            } | null;
            statutory_penalties?: Array<{
              penalty_legal_citation?: string;
              penalty_min_naira?: number | string | null;
            }> | null;
          } | null;
        }

        const terms: ProhibitedTermDefinition[] = (dbTerms as unknown as JoinedDbTerm[]).map((t) => {
          const obl = t.regulatory_obligations;
          const clause = obl?.regulatory_clauses;
          const regBodyCode = clause?.regulatory_document_versions?.regulatory_instruments?.regulatory_bodies?.code as RegulatorCode;
          const penalty = obl?.statutory_penalties?.[0];

          return {
            id: t.id,
            obligationId: t.obligation_id,
            clauseId: obl?.clause_id || '',
            regulatorCode: regBodyCode || 'CBN',
            exactPattern: t.exact_pattern,
            isRegex: t.is_regex,
            severity: t.severity as SeverityLevel,
            statutoryRationale: t.statutory_rationale,
            mandatoryDisclosureRequired: t.mandatory_disclosure_required,
            statutoryCitation: penalty?.penalty_legal_citation || 'Statutory Code',
            statutoryPenaltyNaira: penalty?.penalty_min_naira ? Number(penalty.penalty_min_naira) : 0,
          };
        });

        this.cachedTerms = terms;
        this.lastTermsLoadedAt = now;
        return terms;
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to load prohibited terms from database, falling back to seed catalog');
    }

    // Fallback to static seed catalog
    const fallbackTerms: ProhibitedTermDefinition[] = [];
    for (const inst of REGULATORY_INSTRUMENTS_SEED) {
      for (const ver of inst.versions) {
        for (const clause of ver.clauses) {
          for (const obl of clause.obligations) {
            const penalty = obl.penalties[0];
            for (const term of obl.prohibited_terms) {
              fallbackTerms.push({
                id: `term_${fallbackTerms.length + 1}`,
                obligationId: `obl_${fallbackTerms.length + 1}`,
                clauseId: `clause_${clause.section_reference}`,
                regulatorCode: inst.body_code,
                exactPattern: term.exact_pattern,
                isRegex: term.is_regex,
                severity: term.severity,
                statutoryRationale: term.statutory_rationale,
                mandatoryDisclosureRequired: term.mandatory_disclosure_required,
                statutoryCitation: penalty?.penalty_legal_citation,
                statutoryPenaltyNaira: penalty?.penalty_min_naira,
              });
            }
          }
        }
      }
    }

    this.cachedTerms = fallbackTerms;
    this.lastTermsLoadedAt = now;
    return fallbackTerms;
  }

  /**
   * Executes the 7-stage Marketing Shield pre-vetting pipeline
   */
  public async executeScan(input: ExecuteScanInput): Promise<MarketingShieldViewModel> {
    const overallStartTime = performance.now();
    logger.info({ campaignName: input.campaignName, channel: input.channel }, 'Starting Marketing Shield pre-vetting scan');

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 1: Deterministic Rule Evaluation (< 50ms)
    // ──────────────────────────────────────────────────────────────────────────
    const terms = await this.getProhibitedTerms();
    this.evaluator = new DeterministicRuleEvaluator(terms);
    const deterministicResult: DeterministicEvaluationResult = this.evaluator.evaluate(input.rawCopy);

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 1b: Institutional Claims Ledger Evaluation (< 20ms)
    // ──────────────────────────────────────────────────────────────────────────
    const claimsLedgerResult = await this.claimsLedgerService.matchClaims(
      input.rawCopy,
      input.organizationId,
      input.productCategory
    );

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 2: Relational Tenant License Context (< 30ms)
    // ──────────────────────────────────────────────────────────────────────────
    let activeLicenses: string[] = [];
    try {
      const { data: licenseRows } = await this.dbClient
        .from('tenant_licenses')
        .select('license_type, issuing_regulator')
        .eq('organization_id', input.organizationId)
        .eq('is_active', true);

      if (licenseRows && licenseRows.length > 0) {
        activeLicenses = licenseRows.map((r) => `${r.issuing_regulator}:${r.license_type}`);
      }
    } catch {
      // In standalone or test mode, proceed with default profile
    }

    if (activeLicenses.length === 0) {
      activeLicenses = ['CBN:COMMERCIAL_BANK', 'ARCON:ADVERTISER'];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 3: Hybrid Statutory Retrieval (PostgreSQL pgvector + tsvector via RRF)
    // ──────────────────────────────────────────────────────────────────────────
    const retrievalResult = await this.hybridRetrieval.retrieveRelevantClauses(input.rawCopy, {
      limit: 5,
    });
    const retrievedClauses: RetrievedStatutoryClause[] = retrievalResult.clauses;

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 4: Gemini AI Candidate Extraction & Compliant Rewrite (< 2.5s)
    // ──────────────────────────────────────────────────────────────────────────
    const clauseContexts: RetrievedClauseContext[] = retrievedClauses.map((c) => ({
      sectionReference: `${c.instrumentShortName} ${c.sectionReference}`,
      sectionHeading: c.sectionHeading,
      clauseText: c.clauseText,
      regulatorCode: c.regulatorCode,
    }));

    const { systemInstruction, prompt } = buildMarketingShieldPrompt({
      rawCopy: input.rawCopy,
      channel: input.channel,
      productCategory: input.productCategory,
      targetAudience: input.targetAudienceDescription,
      retrievedClauses: clauseContexts,
      tenantContext: {
        organizationName: 'Tenant Institution',
        activeLicenses,
        activePaymentRails: ['NIBSS_NIP', 'INTERSWITCH'],
      },
    });

    let aiOutput: MarketingAnalysisOutput;
    let aiTelemetry: {
      modelIdentifier: string;
      inputTokenCount: number;
      outputTokenCount: number;
      latencyMs: number;
      rawPromptHash: string;
      rawOutputHash: string;
      retryAttempts: number;
    };

    try {
      const aiResult = await this.aiEngine.generateStructured<MarketingAnalysisOutput>({
        systemInstruction,
        prompt,
        schema: MarketingAnalysisOutputSchema,
        modelAlias: 'FAST_MODEL',
      });
      aiOutput = aiResult.data;
      aiTelemetry = aiResult.telemetry;
    } catch (aiErr) {
      logger.warn({ err: String(aiErr) }, 'AI candidate generation unavailable; executing deterministic fallback synthesis');
      aiOutput = this.generateDeterministicFallbackAiOutput(input.rawCopy, deterministicResult, retrievedClauses);
      aiTelemetry = {
        modelIdentifier: 'gemini-3.8-flash:deterministic-fallback',
        inputTokenCount: 0,
        outputTokenCount: 0,
        latencyMs: Math.round(performance.now() - startTime),
        rawPromptHash: AiEngine.hashContent(prompt),
        rawOutputHash: AiEngine.hashContent(JSON.stringify(aiOutput)),
        retryAttempts: 0,
      };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 5: Deterministic Post-Processing & Penalty Calculation
    // ──────────────────────────────────────────────────────────────────────────
    const presentationCards: FindingPresentationCard[] = [];
    const triggeredRuleCodes = new Set<string>();
    let totalDeterministicPenaltyNaira = 0;

    // 5.1 Integrate Claims Ledger Matches (Institutional Memory)
    for (const cCard of claimsLedgerResult.presentationCards) {
      triggeredRuleCodes.add(cCard.ruleCode);
      presentationCards.push(cCard);
    }

    // 5.2 Convert Deterministic Matches to Presentation Cards
    for (const dMatch of deterministicResult.findings) {
      const alreadyCoveredByClaims = presentationCards.some(
        (c) =>
          c.flaggedExcerpt.toLowerCase().includes(dMatch.flaggedExcerpt.toLowerCase()) ||
          dMatch.flaggedExcerpt.toLowerCase().includes(c.flaggedExcerpt.toLowerCase())
      );
      if (alreadyCoveredByClaims) continue;

      triggeredRuleCodes.add(dMatch.matchedPattern);
      const penalty = dMatch.statutoryPenaltyNaira ?? 0;
      totalDeterministicPenaltyNaira += penalty;

      presentationCards.push({
        id: `finding_det_${presentationCards.length + 1}`,
        ruleCode: dMatch.matchedPattern.toUpperCase().replace(/\s+/g, '_'),
        regulatorCode: dMatch.regulatorCode,
        severity: dMatch.severity,
        findingType: 'DETERMINISTIC_MATCH',
        flaggedExcerpt: dMatch.flaggedExcerpt,
        startIndex: dMatch.startIndex,
        endIndex: dMatch.endIndex,
        whyItMatters: dMatch.statutoryRationale,
        statutoryCitation: dMatch.statutoryCitation || `${dMatch.regulatorCode} Regulatory Code`,
        statutoryPenaltyNaira: penalty,
        recommendedAction: `Remove or rephrase prohibited phrase "${dMatch.flaggedExcerpt}".`,
        mandatoryDisclosureRequired: dMatch.mandatoryDisclosureRequired,
      });
    }

    // 5.3 Integrate and Deduplicate AI Candidate Findings
    for (const candidate of aiOutput.candidateFindings) {
      const alreadyCovered = presentationCards.some(
        (c) =>
          c.flaggedExcerpt.toLowerCase().includes(candidate.flaggedExcerpt.toLowerCase()) ||
          candidate.flaggedExcerpt.toLowerCase().includes(c.flaggedExcerpt.toLowerCase())
      );

      if (!alreadyCovered) {
        triggeredRuleCodes.add(candidate.candidateRuleCode);

        // Find best matching retrieved statutory clause for citation and penalty lookup
        const matchingClause = retrievedClauses.find(
          (c) =>
            candidate.candidateRuleCode.toLowerCase().includes(c.regulatorCode.toLowerCase()) ||
            candidate.explanation.toLowerCase().includes(c.sectionReference.toLowerCase())
        ) || retrievedClauses[0];

        const regulator: RegulatorCode = matchingClause?.regulatorCode || 'CBN';
        const statutoryCitation = matchingClause
          ? `${matchingClause.instrumentShortName} ${matchingClause.sectionReference}`
          : 'Nigerian Financial Regulatory Code';

        // Deterministic penalty mapping (never calculated by LLM)
        let statutoryPenaltyNaira = 0;
        let severity: SeverityLevel = 'MEDIUM';

        if (
          aiOutput.candidateVerdict === 'BLOCKING_ISSUE' ||
          candidate.candidateRuleCode.includes('GUARANTEE') ||
          candidate.candidateRuleCode.includes('RISK_FREE')
        ) {
          severity = 'CRITICAL';
          statutoryPenaltyNaira = regulator === 'ARCON' ? 1000000 : 2000000;
        } else if (aiOutput.candidateVerdict === 'ISSUE_DETECTED') {
          severity = 'HIGH';
          statutoryPenaltyNaira = 500000;
        }

        totalDeterministicPenaltyNaira += statutoryPenaltyNaira;

        const startIndex = input.rawCopy.toLowerCase().indexOf(candidate.flaggedExcerpt.toLowerCase());
        const endIndex = startIndex !== -1 ? startIndex + candidate.flaggedExcerpt.length : undefined;

        presentationCards.push({
          id: `finding_ai_${presentationCards.length + 1}`,
          ruleCode: candidate.candidateRuleCode,
          regulatorCode: regulator,
          severity,
          findingType: 'AI_CANDIDATE_MATCH',
          flaggedExcerpt: candidate.flaggedExcerpt,
          startIndex: startIndex !== -1 ? startIndex : undefined,
          endIndex,
          whyItMatters: candidate.explanation,
          statutoryCitation,
          statutoryPenaltyNaira,
          recommendedAction: candidate.recommendedFix,
          mandatoryDisclosureRequired: null,
        });
      }
    }

    // 5.3 Enforce Severity Floors and Final Verdict
    let finalVerdict: ScanVerdict = 'NO_ISSUE_DETECTED';

    if (
      deterministicResult.suggestedVerdict === 'BLOCKING_ISSUE' ||
      presentationCards.some((f) => f.severity === 'CRITICAL')
    ) {
      finalVerdict = 'BLOCKING_ISSUE';
    } else if (
      deterministicResult.suggestedVerdict === 'ISSUE_DETECTED' ||
      aiOutput.candidateVerdict === 'ISSUE_DETECTED' ||
      presentationCards.some((f) => f.severity === 'HIGH')
    ) {
      finalVerdict = 'ISSUE_DETECTED';
    } else if (
      aiOutput.candidateVerdict === 'REVIEW_RECOMMENDED' ||
      presentationCards.some((f) => f.severity === 'MEDIUM')
    ) {
      finalVerdict = 'REVIEW_RECOMMENDED';
    }

    // Calculate Overall Risk Score (0-100)
    let overallRiskScore = 0;
    if (finalVerdict === 'BLOCKING_ISSUE') {
      overallRiskScore = Math.min(100, 85 + presentationCards.length * 3);
    } else if (finalVerdict === 'ISSUE_DETECTED') {
      overallRiskScore = Math.min(84, 60 + presentationCards.length * 4);
    } else if (finalVerdict === 'REVIEW_RECOMMENDED') {
      overallRiskScore = Math.min(59, 30 + presentationCards.length * 5);
    } else {
      overallRiskScore = 5;
    }

    // 5.4 Build Progressive Disclosure Actions & Checklists
    const actionItems: PresentationActionItem[] = [];

    if (presentationCards.length > 0) {
      actionItems.push({
        id: 'act_1',
        title: 'Apply Compliant Copy Rewrite',
        description: 'Replace non-compliant claims in marketing draft with verified compliant copy.',
        priority: finalVerdict === 'BLOCKING_ISSUE' ? 'CRITICAL' : 'HIGH',
        ownerDepartment: 'Marketing',
        suggestedDeadlineDays: 1,
        completed: false,
      });
    }

    if (aiOutput.arconPreclearanceSuggested || finalVerdict === 'BLOCKING_ISSUE') {
      actionItems.push({
        id: 'act_2',
        title: 'Submit ARCON ASP Pre-Vetting Application',
        description: 'Prepare statutory submission dossier for ARCON Advertising Standards Panel approval.',
        priority: 'HIGH',
        ownerDepartment: 'Compliance',
        suggestedDeadlineDays: 3,
        completed: false,
      });
    }

    actionItems.push({
      id: 'act_3',
      title: 'CCO Sign-Off & Attestation',
      description: 'Review reconciled scan findings and execute formal compliance clearance.',
      priority: finalVerdict === 'BLOCKING_ISSUE' ? 'CRITICAL' : 'MEDIUM',
      ownerDepartment: 'Legal',
      suggestedDeadlineDays: 2,
      completed: false,
    });

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 6: Persistence & Audit Traceability (Task 7.1)
    // ──────────────────────────────────────────────────────────────────────────
    const totalLatencyMs = Math.round(performance.now() - overallStartTime);
    const scanId = crypto.randomUUID();
    const analysisRunId = crypto.randomUUID();
    const inputHash = AuditService.computeSha256(input.rawCopy);
    const effectiveCompliantRewrite =
      aiOutput.compliantRewrite || claimsLedgerResult.suggestedRewrite || null;
    const outputHash = AuditService.computeSha256(effectiveCompliantRewrite || '');
    const auditPayload = JSON.stringify({
      campaignName: input.campaignName,
      channel: input.channel,
      verdict: finalVerdict,
      riskScore: overallRiskScore,
      penaltiesNaira: totalDeterministicPenaltyNaira,
      findingsCount: presentationCards.length,
      inputHash,
      outputHash,
    });
    const auditHash = crypto.createHash('sha256').update(auditPayload).digest('hex');

    try {
      // 1. Record execution run in ai_analysis_runs
      await this.dbClient.from('ai_analysis_runs').insert({
        id: analysisRunId,
        organization_id: input.organizationId,
        user_id: input.userId || null,
        pipeline_type: 'MARKETING_PREVET',
        model_identifier: aiTelemetry.modelIdentifier,
        model_config: {
          fastModel: aiTelemetry.modelIdentifier,
          temperature: 0.1,
        },
        prompt_template_version: 'v1.1-hardened',
        input_token_count: aiTelemetry.inputTokenCount,
        output_token_count: aiTelemetry.outputTokenCount,
        latency_ms: totalLatencyMs,
        retrieved_clause_ids: retrievedClauses.map((c) => c.clauseId),
        triggered_rule_ids: [],
        raw_prompt_hash: aiTelemetry.rawPromptHash,
        raw_output_hash: aiTelemetry.rawOutputHash,
        human_approval_status: 'PENDING_REVIEW',
      });

      // 2. Persist scan record to marketing_scans
      await this.dbClient.from('marketing_scans').insert({
        id: scanId,
        organization_id: input.organizationId,
        user_id: input.userId || '00000000-0000-0000-0000-000000000011',
        analysis_run_id: analysisRunId,
        campaign_name: input.campaignName,
        channel: input.channel,
        product_category: input.productCategory || 'SAVINGS_DEPOSIT',
        target_audience: input.targetAudienceDescription || null,
        raw_copy: input.rawCopy,
        verdict: finalVerdict,
        overall_risk_score: overallRiskScore,
        deterministic_penalty_naira: totalDeterministicPenaltyNaira,
        compliant_rewrite_full: effectiveCompliantRewrite,
        arcon_preclearance_required: aiOutput.arconPreclearanceSuggested || finalVerdict === 'BLOCKING_ISSUE',
        approval_status: 'PENDING_REVIEW',
      });

      // 3. Persist individual findings to marketing_findings (with denormalized organization_id)
      if (presentationCards.length > 0) {
        await this.dbClient.from('marketing_findings').insert(
          presentationCards.map((card) => ({
            organization_id: input.organizationId,
            scan_id: scanId,
            rule_code: card.ruleCode,
            flagged_text: card.flaggedExcerpt,
            severity: card.severity,
            finding_type: card.findingType,
            explanation: card.whyItMatters,
            recommended_fix: card.recommendedAction,
            statutory_citation: card.statutoryCitation,
            statutory_penalty_naira: card.statutoryPenaltyNaira,
          }))
        );
      }

      // 4. Commit immutable, zero-knowledge record to audit_logs (CAMA/BOFIA 6-year retention)
      await this.auditService.recordLog({
        organizationId: input.organizationId,
        userId: input.userId || null,
        action: 'MARKETING_PREVET_EXECUTED',
        entityType: 'marketing_scans',
        entityId: scanId,
        sha256InputHash: inputHash,
        sha256OutputHash: outputHash,
        metadata: {
          analysisRunId,
          campaignName: input.campaignName,
          channel: input.channel,
          productCategory: input.productCategory || 'SAVINGS_DEPOSIT',
          verdict: finalVerdict,
          riskScore: overallRiskScore,
          deterministicPenaltyNaira: totalDeterministicPenaltyNaira,
          findingsCount: presentationCards.length,
          arconPreclearanceRequired: aiOutput.arconPreclearanceSuggested || finalVerdict === 'BLOCKING_ISSUE',
          modelIdentifier: aiTelemetry.modelIdentifier,
          latencyMs: totalLatencyMs,
        },
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to persist execution or audit record, continuing presentation flow');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 7: Presentation Transformation (MarketingShieldViewModel)
    // ──────────────────────────────────────────────────────────────────────────
    let executiveSummary = '';
    if (finalVerdict === 'BLOCKING_ISSUE') {
      executiveSummary = `The submitted copy for "${input.campaignName}" contains critical statutory violations under Nigerian advertising and consumer protection regulations. Direct prohibited promises and missing mandatory risk disclosures generate an aggregate deterministic fine exposure of ₦${totalDeterministicPenaltyNaira.toLocaleString()}. Immediate copy revision is mandatory prior to dissemination across ${input.channel}.`;
    } else if (finalVerdict === 'ISSUE_DETECTED') {
      executiveSummary = `The campaign copy for "${input.campaignName}" contains non-compliant regulatory representations under Nigerian financial rules. Remediation of flagged claims is required to prevent statutory sanctions and ARCON enforcement action.`;
    } else if (finalVerdict === 'REVIEW_RECOMMENDED') {
      executiveSummary = `No blatant statutory prohibitions were detected, but subtle promotional wording requires compliance review to ensure full alignment with regulatory guidance.`;
    } else {
      executiveSummary = `No statutory violations were detected in "${input.campaignName}" against verified retrieved regulatory statutes. The copy adheres to transparency guidelines. Final clearance remains subject to human CCO sign-off.`;
    }

    const viewModel: MarketingShieldViewModel = {
      scanId,
      productCategory: input.productCategory || 'SAVINGS_DEPOSIT',
      title: `${input.campaignName} Pre-Vetting Report`,
      verdict: finalVerdict,
      overallRiskScore,
      deterministicPenaltyTotalNaira: totalDeterministicPenaltyNaira,
      executiveSummary,
      findings: presentationCards,
      actions: actionItems,
      humanReviewState: {
        status: 'PENDING_REVIEW',
        canApprove: true,
      },
      telemetry: {
        latencyMs: totalLatencyMs,
        modelIdentifier: aiTelemetry.modelIdentifier,
        verifiedAt: new Date().toISOString(),
        auditHash,
      },
      channel: input.channel,
      originalCopy: input.rawCopy,
      compliantRewrite: effectiveCompliantRewrite || input.rawCopy,
      arconPreclearanceRequired: aiOutput.arconPreclearanceSuggested || finalVerdict === 'BLOCKING_ISSUE',
      activeLicenseProfiles: activeLicenses,
    };

    logger.info(
      {
        campaignName: input.campaignName,
        verdict: finalVerdict,
        findingsCount: presentationCards.length,
        penaltyNaira: totalDeterministicPenaltyNaira,
        latencyMs: totalLatencyMs,
      },
      'Marketing Shield pre-vetting scan completed successfully'
    );

    return viewModel;
  }

  /**
   * Deterministic AI fallback synthesis when Google Gemini is offline, unreachable, or in CI
   */
  private generateDeterministicFallbackAiOutput(
    rawCopy: string,
    deterministicResult: DeterministicEvaluationResult,
    _retrievedClauses: RetrievedStatutoryClause[]
  ): MarketingAnalysisOutput {
    let rewrite = rawCopy;

    for (const finding of deterministicResult.findings) {
      const pattern = finding.matchedPattern.toLowerCase();
      if (pattern.includes('zero interest')) {
        rewrite = rewrite.replace(new RegExp(finding.flaggedExcerpt, 'gi'), 'competitive interest rates');
      } else if (pattern.includes('guaranteed approval') || pattern.includes('100%')) {
        rewrite = rewrite.replace(new RegExp(finding.flaggedExcerpt, 'gi'), 'subject to credit evaluation and approval');
      } else if (pattern.includes('risk-free')) {
        rewrite = rewrite.replace(new RegExp(finding.flaggedExcerpt, 'gi'), 'market-reflective variable return');
      } else {
        rewrite = rewrite.replace(new RegExp(finding.flaggedExcerpt, 'gi'), '[Terms apply]');
      }
    }

    if (!rewrite.toLowerCase().includes('regulated') && !rewrite.toLowerCase().includes('licensed')) {
      rewrite += ' Terms and conditions apply. Regulated by Nigerian financial authorities.';
    }

    const candidateFindings: MarketingAnalysisOutput['candidateFindings'] = [];
    for (const match of deterministicResult.findings) {
      candidateFindings.push({
        candidateRuleCode: match.matchedPattern.toUpperCase().replace(/\s+/g, '_'),
        flaggedExcerpt: match.flaggedExcerpt,
        explanation: match.statutoryRationale,
        recommendedFix: `Excise prohibited phrase "${match.flaggedExcerpt}".`,
      });
    }

    return {
      candidateVerdict:
        deterministicResult.suggestedVerdict === 'BLOCKING_ISSUE'
          ? 'BLOCKING_ISSUE'
          : deterministicResult.suggestedVerdict === 'ISSUE_DETECTED'
          ? 'ISSUE_DETECTED'
          : 'NO_ISSUE_DETECTED',
      candidateFindings,
      compliantRewrite: rewrite,
      arconPreclearanceSuggested: deterministicResult.suggestedVerdict === 'BLOCKING_ISSUE',
    };
  }
}
