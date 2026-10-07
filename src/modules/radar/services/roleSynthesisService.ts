import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { ConfigurationError } from '@/shared/errors';
import { AiEngine } from '@/shared/ai-engine';
import { logger } from '@/shared/logger';
import { LicenseType, PaymentRail, RegulatorCode } from '@/shared/types';
import {
  RadarRoleImpactOutput,
  RadarRoleImpactOutputSchema,
  RadarActionItemOutput,
} from '../types/schema';

export interface RoleSynthesisInput {
  circular: {
    id: string;
    circularNumber: string;
    regulatorCode: RegulatorCode;
    subject: string;
    summary: string;
    statutoryDeadline: string | null;
    rawText?: string;
    sections?: Array<{ sectionNumber: string; heading: string; content: string }>;
    schedules?: Array<{ scheduleTitle: string; headers: string[]; rows: string[][] }>;
  };
  tenant: {
    organizationId: string;
    organizationName?: string;
    matchedLicenses: LicenseType[];
    matchedRails: PaymentRail[];
    applicabilityReason: string;
  };
  userId?: string;
}

export interface RoleSynthesisResult {
  impactId?: string;
  analysisRunId: string;
  output: RadarRoleImpactOutput;
  telemetry: {
    modelIdentifier: string;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    promptHash: string;
    outputHash: string;
  };
}

/**
 * Multi-Role Impact Synthesis Service (Epic 12 / Task 12.1)
 * Generates distinct role-tailored executive briefs (COO, CCO, Product/Eng, CFO)
 * and action items with departmental ownership.
 */
export class RoleSynthesisService {
  private aiEngine: AiEngine;
  private dbClient: SupabaseClient<Database>;

  constructor(options: { dbClient: SupabaseClient<Database>; aiEngine?: AiEngine } | SupabaseClient<Database>) {
    const client = options && 'dbClient' in options ? options.dbClient : (options as SupabaseClient<Database>);
    if (!client) {
      throw new ConfigurationError('RoleSynthesisService requires an RLS-bound SupabaseClient');
    }
    this.dbClient = client;
    this.aiEngine = options && 'aiEngine' in options && options.aiEngine ? options.aiEngine : new AiEngine();
  }

  /**
   * Synthesizes role-based executive briefs and action items
   */
  public async synthesizeRoleImpacts(input: RoleSynthesisInput): Promise<RoleSynthesisResult> {
    const startTime = performance.now();
    const { circular, tenant, userId } = input;

    const sectionsSummary = (circular.sections || [])
      .map((s) => `[${s.sectionNumber} ${s.heading}]: ${s.content.slice(0, 300)}...`)
      .join('\n\n');

    const schedulesSummary = (circular.schedules || [])
      .map(
        (sch) =>
          `[Table: ${sch.scheduleTitle}]: Headers: ${sch.headers.join(' | ')}\nRows:\n` +
          sch.rows.map((r) => r.join(' | ')).join('\n')
      )
      .join('\n\n');

    const systemInstruction = `You are Cogent's Senior Regulatory Counsel and FinTech Operations Architect specializing in Nigerian financial regulations (CBN, SEC, NDIC, ARCON, NDPC, FCCPC, NFIU).
Your task is to analyze an official regulatory circular for a regulated Nigerian financial institution and synthesize 4 distinct, high-impact role briefings plus an actionable checklist.

Rules:
1. Tone must be calm, precise, authoritative, and operational (like a premier regulatory memo).
2. Avoid generic AI fluff, hype, or emotional language.
3. Every role brief must focus strictly on that executive's domain:
   - executiveBriefCco (CCO / Legal): Statutory mandates, mandatory filings, penalty exposures, board reporting, license risk.
   - financialBriefCfo (CFO / Finance): Capital reserve requirements, fiscal penalties, balance sheet liquidity, fee margin caps.
   - technicalBriefProductEng / technicalBriefCto (CTO / Engineering): System architecture, API specifications, database migrations, audit log changes, 2FA/auth limits.
   - actionBriefCoo / governanceBriefCeoCro (CEO / CRO / COO): Enterprise governance, systemic exposure, operational continuity, partner bank uptime, settlement cut-offs.
4. actionChecklist: Generate 3 to 6 concrete, actionable tasks assigned to appropriate departments (EXECUTIVE_LEADERSHIP, COMPLIANCE_LEGAL, PRODUCT_MANAGEMENT, ENGINEERING_TECH, OPERATIONS, TREASURY_FINANCE) with suggested completion dates based on the statutory deadline.
5. Zero monetary penalty hallucinations: do not invent arbitrary fine numbers. Cite statutory sections for penalties.`;

    const prompt = `
REGULATORY CIRCULAR DETAILS:
- Issuing Regulator: ${circular.regulatorCode}
- Circular Reference: ${circular.circularNumber}
- Subject: ${circular.subject}
- Statutory Deadline: ${circular.statutoryDeadline || 'None specified'}
- Summary: ${circular.summary}

TENANT INSTITUTIONAL CONTEXT:
- Organization: ${tenant.organizationName || 'Licensed Institution'}
- Matched Licenses: ${tenant.matchedLicenses.join(', ') || 'None'}
- Matched Payment Rails: ${tenant.matchedRails.join(', ') || 'None'}
- Applicability Reason: ${tenant.applicabilityReason}

DOCUMENT SECTIONS:
${sectionsSummary || circular.rawText?.slice(0, 2000) || 'None provided'}

STATUTORY SCHEDULES & TABLES:
${schedulesSummary || 'None provided'}

Generate the structured role briefings and action checklist.`;

    let output: RadarRoleImpactOutput;
    let modelIdentifier = 'gemini-3.8-flash';
    let inputTokens = 0;
    let outputTokens = 0;
    let latencyMs = 0;
    let promptHash = AiEngine.hashContent(prompt);
    let outputHash = '';

    try {
      const aiResult = await this.aiEngine.generateStructured({
        systemInstruction,
        prompt,
        schema: RadarRoleImpactOutputSchema,
        modelAlias: 'FAST_MODEL',
      });

      output = aiResult.data;
      modelIdentifier = aiResult.telemetry.modelIdentifier;
      inputTokens = aiResult.telemetry.inputTokenCount;
      outputTokens = aiResult.telemetry.outputTokenCount;
      latencyMs = aiResult.telemetry.latencyMs;
      promptHash = aiResult.telemetry.rawPromptHash;
      outputHash = aiResult.telemetry.rawOutputHash;
    } catch (aiErr) {
      logger.warn({ aiErr }, 'AI Engine call failed in RoleSynthesisService; falling back to deterministic synthesis');

      output = this.generateDeterministicFallback(input);
      latencyMs = Math.round(performance.now() - startTime);
      outputHash = AiEngine.hashContent(JSON.stringify(output));
    }

    // Record AI run in `ai_analysis_runs`
    const analysisRunId = crypto.randomUUID();
    await this.logAnalysisRun({
      analysisRunId,
      organizationId: tenant.organizationId,
      userId,
      modelIdentifier,
      promptHash,
      outputHash,
      inputTokens,
      outputTokens,
      latencyMs,
    });

    // Persist to `radar_tenant_impacts` and `radar_action_items`
    const impactId = await this.persistImpactAndActions(
      tenant.organizationId,
      circular.id,
      analysisRunId,
      output
    );

    return {
      impactId,
      analysisRunId,
      output,
      telemetry: {
        modelIdentifier,
        latencyMs,
        inputTokens,
        outputTokens,
        promptHash,
        outputHash,
      },
    };
  }

  /**
   * Deterministic fallback when Gemini API is unavailable or offline in tests
   */
  public generateDeterministicFallback(input: RoleSynthesisInput): RadarRoleImpactOutput {
    const { circular, tenant } = input;
    const deadlineStr = circular.statutoryDeadline
      ? `by ${circular.statutoryDeadline}`
      : 'in accordance with statutory directives';

    const licenses = tenant.matchedLicenses.join(', ') || 'regulated entities';
    const rails = tenant.matchedRails.join(', ') || 'electronic payment rails';

    const executiveBriefCco = `The ${circular.regulatorCode} has issued Circular ${circular.circularNumber} concerning '${circular.subject}'. This circular directly binds the institution under its ${licenses} authorization. Full compliance must be achieved ${deadlineStr}. Non-compliance carries severe sanctions including potential exclusion from settlement rails, license review, and administrative penalties.`;

    const actionBriefCoo = `Operational workflows on active ${rails} rails must be audited for compliance with Circular ${circular.circularNumber}. Partner bank cut-offs and daily clearing parameters must remain aligned with settlement guidelines. Operations must ensure zero downtime across impacted channels.`;

    const technicalBriefProductEng = `Engineering and Product teams must review API technical specifications and payload schemas for ${rails} integrations. Any required adjustments to transaction payloads, customer authentication flows, or webhook error handlers must be deployed and validated ${deadlineStr}.`;

    const technicalBriefCto = `System Architecture & Engineering (CTO): Audit microservice APIs, payment orchestration pipelines, and database models interacting with ${rails}. Implement required transaction parameter thresholds, rate limits, and audit trail retention mechanisms to meet ${circular.regulatorCode} technical standards ${deadlineStr}.`;

    const financialBriefCfo = `Treasury and Finance must evaluate balance sheet exposure and capital adequacy impacts stemming from Circular ${circular.circularNumber}. Ensure reserve ratios and transaction fee margins comply with updated regulatory thresholds.`;

    const governanceBriefCeoCro = `Enterprise Governance & Risk (CEO / CRO): Circular ${circular.circularNumber} introduces supervisory enforcement risk for ${licenses} operations. Escalate to the Board Risk Committee. Convene ExCo compliance committee to monitor remediation SLA and verify institutional license defense.`;

    const suggestedDeadline = circular.statutoryDeadline || new Date().toISOString().slice(0, 10);

    const actionChecklist: RadarActionItemOutput[] = [
      {
        targetDepartment: 'COMPLIANCE_LEGAL',
        actionTitle: `Statutory Review: ${circular.circularNumber}`,
        actionDescription: `Conduct gap analysis on internal policies against ${circular.regulatorCode} requirements and prepare regulatory attestation.`,
        suggestedDeadline,
      },
      {
        targetDepartment: 'OPERATIONS',
        actionTitle: `Rail Settlement & Partner Bank Audit`,
        actionDescription: `Verify settlement continuity and transaction routing on ${rails} with clearing banks.`,
        suggestedDeadline,
      },
      {
        targetDepartment: 'ENGINEERING_TECH',
        actionTitle: `API & Authentication Flow Update`,
        actionDescription: `Update transaction limits and authentication rules in accordance with ${circular.subject}.`,
        suggestedDeadline,
      },
      {
        targetDepartment: 'TREASURY_FINANCE',
        actionTitle: `Capital Adequacy & Fee Structure Review`,
        actionDescription: `Assess financial exposure and ensure liquidity reserves satisfy ${circular.regulatorCode} statutory guidelines.`,
        suggestedDeadline,
      },
    ];

    return {
      executiveBriefCco,
      actionBriefCoo,
      technicalBriefProductEng,
      financialBriefCfo,
      technicalBriefCto,
      governanceBriefCeoCro,
      actionChecklist,
    };
  }

  private async logAnalysisRun(params: {
    analysisRunId: string;
    organizationId: string;
    userId?: string;
    modelIdentifier: string;
    promptHash: string;
    outputHash: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
  }): Promise<void> {
    if (!this.dbClient) return;

    try {
      const client = this.dbClient as any;
      await client.from('ai_analysis_runs').insert({
        id: params.analysisRunId,
        organization_id: params.organizationId,
        user_id: params.userId || null,
        pipeline_type: 'RADAR_IMPACT_SYNTHESIS',
        model_identifier: params.modelIdentifier,
        model_config: { temperature: 0.1 },
        prompt_template_version: 'radar_synthesis_v1.1',
        input_token_count: params.inputTokens,
        output_token_count: params.outputTokens,
        latency_ms: params.latencyMs,
        raw_prompt_hash: params.promptHash,
        raw_output_hash: params.outputHash,
        human_approval_status: 'PENDING_REVIEW',
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to insert into ai_analysis_runs');
    }
  }

  private async persistImpactAndActions(
    organizationId: string,
    circularId: string,
    analysisRunId: string,
    output: RadarRoleImpactOutput
  ): Promise<string | undefined> {
    if (!this.dbClient) return undefined;

    try {
      const client = this.dbClient as any;

      // Check if impact record already exists for this tenant & circular to preserve ID and foreign keys
      const { data: existingImpact } = await client
        .from('radar_tenant_impacts')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('circular_id', circularId)
        .maybeSingle();

      const impactId = existingImpact?.id || crypto.randomUUID();

      // Upsert radar_tenant_impacts with 4-way ExCo briefs
      await client.from('radar_tenant_impacts').upsert(
        {
          id: impactId,
          organization_id: organizationId,
          circular_id: circularId,
          analysis_run_id: analysisRunId,
          is_applicable: true,
          applicability_reason: 'Confirmed institutional applicability',
          executive_brief_cco: output.executiveBriefCco,
          action_brief_coo: output.actionBriefCoo,
          technical_brief_product_eng: output.technicalBriefProductEng,
          financial_brief_cfo: output.financialBriefCfo,
          role_briefs: output,
          brief_cco: { brief: output.executiveBriefCco },
          brief_cfo: { brief: output.financialBriefCfo },
          brief_cto: { brief: output.technicalBriefCto || output.technicalBriefProductEng },
          brief_ceo_cro: { brief: output.governanceBriefCeoCro || output.actionBriefCoo },
          status: 'SYNTHESIZED',
        },
        { onConflict: 'organization_id,circular_id' }
      );

      // Clean up previous action items for this impact to avoid orphaned or duplicate records
      await client.from('radar_action_items').delete().eq('impact_id', impactId);

      // Insert action items
      if (output.actionChecklist.length > 0) {
        const actionRows = output.actionChecklist.map((item) => ({
          id: crypto.randomUUID(),
          organization_id: organizationId,
          impact_id: impactId,
          target_department: item.targetDepartment,
          action_title: item.actionTitle,
          action_description: item.actionDescription,
          suggested_deadline: item.suggestedDeadline,
          is_completed: false,
        }));

        await client.from('radar_action_items').insert(actionRows);
      }

      return impactId;
    } catch (err) {
      logger.warn({ err }, 'Failed to persist radar_tenant_impacts and action items');
      return undefined;
    }
  }
}
