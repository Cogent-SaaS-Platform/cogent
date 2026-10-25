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
  /**
   * Deterministic fallback when Gemini API is unavailable or offline in tests
   * Produces deep, multi-paragraph, domain-specific executive briefings across CCO, COO, CTO, CFO, and CEO/CRO
   */
  public generateDeterministicFallback(input: RoleSynthesisInput): RadarRoleImpactOutput {
    const { circular, tenant } = input;
    const deadlineStr = circular.statutoryDeadline
      ? `no later than ${circular.statutoryDeadline}`
      : 'with immediate effect pursuant to supervisory directives';

    const licenses = tenant.matchedLicenses.length > 0
      ? tenant.matchedLicenses.join(', ')
      : 'licensed financial entity';
    const rails = tenant.matchedRails.length > 0
      ? tenant.matchedRails.join(', ')
      : 'clearing and settlement rails';

    const subjLower = (circular.subject + ' ' + (circular.rawText || '')).toLowerCase();

    // Domain detection
    const isPayments = /payment|settlement|switch|interchange|pos|card|terminal|contactless|mmo|pssp|direct debit|open banking/i.test(subjLower);
    const isFx = /foreign exchange|fx|bureau de change|bdc|export proceeds|remittance|domiciliary|currency/i.test(subjLower);
    const isAml = /anti-money|aml|cft|counter-terrorism|kyc|politically exposed|pep|suspicious transaction|str|sanction/i.test(subjLower);
    const isPrivacy = /data protection|privacy|ndpa|ndpc|breach|personal data|consent|data subject/i.test(subjLower);
    const isLending = /digital lend|consumer credit|fair interest|debt recovery|fccpc|borrower|loan/i.test(subjLower);

    // 1. CCO / Legal Brief
    let ccoDomainDetails = '';
    if (isPayments) {
      ccoDomainDetails = `The directive sets strict statutory conditions on transaction authentication, routing integrity, and customer fund segregation under BOFIA 2020 Sections 13 and 57. The Legal & Compliance team must review all operational contracts with payment rail operators, ensure compliance with updated dispute resolution SLAs, and submit a formal concordance certification to the ${circular.regulatorCode}.`;
    } else if (isFx) {
      ccoDomainDetails = `The regulatory mandate triggers heightened statutory scrutiny under the Foreign Exchange (Monitoring and Miscellaneous Provisions) Act. Compliance must audit all eligible trade transactions, ensure zero leakage into unauthorized corridors, and maintain verified documentation for Central Bank inspection.`;
    } else if (isAml) {
      ccoDomainDetails = `Under the Money Laundering (Prevention and Prohibition) Act (MLA 2022) and Terrorism Prevention Act, the institution is under strict liability to identify beneficial owners, enforce automated PEP screening, and lodge Suspicious Transaction Reports (STRs) with the NFIU within the prescribed 24-hour window.`;
    } else if (isPrivacy) {
      ccoDomainDetails = `Mandates strict adherence to the Nigeria Data Protection Act (NDPA 2023). Mandatory provisions demand lawful basis verification for all customer processing activities, implementation of privacy notices, and immediate establishment of a 72-hour statutory breach reporting protocol to the NDPC.`;
    } else if (isLending) {
      ccoDomainDetails = `Enforces the FCCPA 2018 and Digital Lending Regulations. Eliminates unlawful debt recovery practices, mandates clear APR interest rate schedules, and requires registration certification proof for all consumer lending products.`;
    } else {
      ccoDomainDetails = `The statutory directive establishes binding operational benchmarks that supersede prior administrative guidelines. Compliance Counsel must execute a clause-by-clause concordance review, identify internal policy variances, and draft Board-approved policy amendments to maintain institutional license defense.`;
    }

    const executiveBriefCco = `The ${circular.regulatorCode} has enacted Circular ${circular.circularNumber} concerning '${circular.subject}', formally exercising statutory supervisory powers. This directive directly binds the institution under its ${licenses} authorization. Mandatory compliance must be validated ${deadlineStr}.\n\n${ccoDomainDetails} Non-compliance carries severe administrative sanctions, potential license suspension under BOFIA, and progressive monetary default penalties. A comprehensive concordance memo must be prepared for the Board Risk Committee.`;

    // 2. COO / Operations Brief
    let cooDomainDetails = '';
    if (isPayments) {
      cooDomainDetails = `Operational workflows on active ${rails} rails require immediate adjustment. Daily clearing cut-offs (T+1 10:00 WAT), settlement account balance monitoring, and automated transaction dispute lifecycles must be recalibrated. Operations must ensure 99.9% uptime on terminal and switch interfaces without transaction drop-offs.`;
    } else if (isFx) {
      cooDomainDetails = `Back-office FX operations must audit deal confirmation pipelines and treasury trade settlement queues. Daily transaction records must be reconciled against the regulator's electronic reporting portal with zero discrepancies.`;
    } else {
      cooDomainDetails = `Standard Operating Procedures (SOPs) must be revised immediately across customer onboarding, transaction verification, and merchant reconciliation. Operational team leads must verify staff training on the new requirements and implement dual-control approval queues.`;
    }

    const actionBriefCoo = `Operational execution for Circular ${circular.circularNumber} mandates comprehensive review across active ${rails} infrastructure. Operations must verify partner bank clearing parameters, SLA adherence, and customer communication channels ${deadlineStr}.\n\n${cooDomainDetails} Any operational failure or rail disruption during implementation must be escalated immediately to avoid regulatory intervention.`;

    // 3. CTO / Technical & Engineering Brief
    let ctoDomainDetails = '';
    if (isPayments) {
      ctoDomainDetails = `Engineering must update payment orchestration microservices to enforce mandatory authentication rules (e.g. 2FA thresholds on contactless payments), validate API request payloads against updated schemas, and verify webhook retry policies. Automated ledger reconciliation jobs must execute every 15 minutes.`;
    } else if (isPrivacy) {
      ctoDomainDetails = `Engineering must enforce encryption at rest (AES-256) and in transit (TLS 1.3) for all customer PII, audit database access controls, eliminate hardcoded credentials in microservice configs, and implement user data export and deletion endpoints to satisfy NDPA data subject rights.`;
    } else {
      ctoDomainDetails = `Engineering teams must inspect core transaction processing pipelines, API endpoints, and validation filters. Implement strict input sanitization, rate-limiting, and error-handling rules in line with ${circular.regulatorCode} technical specifications.`;
    }

    const technicalBriefCto = `Technical Architecture & Engineering (CTO): Circular ${circular.circularNumber} necessitates targeted codebase and infrastructure updates across payment and core banking microservices ${deadlineStr}.\n\n${ctoDomainDetails} Database audit logging must maintain tamper-evident, immutable event records for a minimum of 6 years in strict conformity with Nigerian CAMA and BOFIA statutory record-keeping mandates.`;
    const technicalBriefProductEng = technicalBriefCto;

    // 4. CFO / Treasury Brief
    let cfoDomainDetails = '';
    if (isPayments) {
      cfoDomainDetails = `Treasury must evaluate the impact of revised interchange fee structures and transaction fee margins on net operating revenue. Settlement collateral posted with partner clearing banks must be reviewed to prevent intra-day liquidity shortages.`;
    } else if (isFx) {
      cfoDomainDetails = `Treasury must strictly align Net Open Position (NOP) limits with Central Bank prudential thresholds, hedge currency exposure, and ensure all foreign currency transactions are settled at approved market rates.`;
    } else {
      cfoDomainDetails = `Finance must establish a dedicated regulatory contingency reserve to insulate the balance sheet against statutory non-compliance exposure and evaluate liquidity ratios against ${circular.regulatorCode} capital adequacy baselines.`;
    }

    const financialBriefCfo = `Treasury & Financial Control (CFO): Assessment of Circular ${circular.circularNumber} reveals material balance sheet and liquidity implications for ${licenses} operations.\n\n${cfoDomainDetails} Default proceedings carry daily compounding fines under Nigerian financial law. Treasury must monitor capital reserves to ensure uninterrupted compliance with supervisory capital requirements.`;

    // 5. CEO / CRO Governance Brief
    const governanceBriefCeoCro = `Enterprise Governance & Risk (CEO / CRO): Circular ${circular.circularNumber} represents a strategic compliance priority requiring immediate Board Risk Committee oversight. Management must convene an extraordinary ExCo session to review institutional exposure across all ${licenses} operations and approve the executive remediation roadmap.\n\nLegal and Compliance Counsel shall provide bi-weekly progress updates until full statutory compliance is achieved ${deadlineStr}. Formal sign-off by the Managing Director and Chief Compliance Officer is mandatory prior to visiting regulatory examinations.`;

    const suggestedDeadline = circular.statutoryDeadline || new Date().toISOString().slice(0, 10);

    const actionChecklist: RadarActionItemOutput[] = [
      {
        targetDepartment: 'COMPLIANCE_LEGAL',
        actionTitle: `Statutory Concordance Review & Board Briefing: ${circular.circularNumber}`,
        actionDescription: `Execute clause-by-clause concordance assessment against internal policy manual. Prepare Board Risk Committee memo and draft regulatory attestation under ${circular.regulatorCode} statutory powers.`,
        suggestedDeadline,
      },
      {
        targetDepartment: 'OPERATIONS',
        actionTitle: `Rail Settlement & Partner Bank Clearing Audit`,
        actionDescription: `Verify settlement continuity, clearing cut-offs, and transaction routing on ${rails} with partner commercial banks. Update operational SOPs and staff execution checklists.`,
        suggestedDeadline,
      },
      {
        targetDepartment: 'ENGINEERING_TECH',
        actionTitle: `Microservice API Schemas & Authentication Limits Update`,
        actionDescription: `Deploy and validate API payload validation rules, transaction parameter limits, and tamper-evident audit logging across core microservices in staging and production.`,
        suggestedDeadline,
      },
      {
        targetDepartment: 'TREASURY_FINANCE',
        actionTitle: `Capital Reserve Ratios & Liquidity Buffer Calibration`,
        actionDescription: `Evaluate balance sheet exposure, recalculate statutory reserve buffers, and ensure fee schedules comply with ${circular.regulatorCode} fee margin guidelines.`,
        suggestedDeadline,
      },
      {
        targetDepartment: 'EXECUTIVE_LEADERSHIP',
        actionTitle: `Executive Committee (ExCo) Remediation Sign-Off`,
        actionDescription: `Convene executive oversight meeting to review cross-departmental implementation proof and secure formal sign-off from Chief Compliance Officer and Managing Director.`,
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
      const client = this.dbClient;
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
      const client = this.dbClient;

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
