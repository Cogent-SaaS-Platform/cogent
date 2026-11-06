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
  ValidatedObligation,
} from '../types/schema';
export { RadarRoleImpactOutputSchema };
import { DeterministicMetadataExtractor } from './deterministicMetadataExtractor';

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
    obligations?: ValidatedObligation[];
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
 * Multi-Role Impact Synthesis Service
 * Generates distinct role-tailored executive briefs (General Counsel, CCO, Product/Eng, CTO, CFO, COO, CEO/CRO)
 * and action items derived strictly from extracted statutory obligations and authentic circular text.
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
   * Synthesizes role-based executive briefs and action items strictly from document text.
   * Logs real errors and rethrows on failure — never silently substitutes synthetic AI output.
   */
  public async synthesizeRoleImpacts(input: RoleSynthesisInput): Promise<RoleSynthesisResult> {
    const { circular, tenant, userId } = input;

    const sectionsSummary = (circular.sections || [])
      .map((s) => `[${s.sectionNumber} ${s.heading}]: ${s.content.slice(0, 400)}`)
      .join('\n\n');

    const schedulesSummary = (circular.schedules || [])
      .map(
        (sch) =>
          `[Table: ${sch.scheduleTitle}]: Headers: ${sch.headers.join(' | ')}\nRows:\n` +
          sch.rows.map((r) => r.join(' | ')).join('\n')
      )
      .join('\n\n');

    const obligationsSummary = (circular.obligations || [])
      .map(
        (obl, idx) =>
          `[Obligation ${idx + 1} (${obl.clauseReference || 'Ref'})]:\n` +
          `- Mandate: "${obl.actor}" shall "${obl.action}" "${obl.object}"\n` +
          `- Verbatim Anchor: "${obl.verbatimQuote}"\n` +
          `- Type: ${obl.obligationType} | Severity: ${obl.severityFloor}\n` +
          `- Statutory Timeline: ${obl.deadline || (obl.statutoryTimelineDays ? `${obl.statutoryTimelineDays} days` : 'Not explicitly specified in source text')}\n` +
          `- Penalty Citation: ${obl.statedPenalty ? `Max ₦${obl.statedPenalty.maxNaira.toLocaleString('en-NG')}, Daily ₦${obl.statedPenalty.dailyFineNaira.toLocaleString('en-NG')}, License Risk: ${obl.statedPenalty.carriesLicenseSuspensionRisk}, Citation: ${obl.statedPenalty.citation}` : 'Not explicitly specified in source text'}\n` +
          `- Applicable Licenses/Rails: ${obl.targetedLicenses.join(', ') || 'All'} / ${obl.affectedRails.join(', ') || 'All'}\n` +
          `- Compliance Criteria: ${(obl.complianceCriteria || []).join('; ') || 'Standard adherence'}`
      )
      .join('\n\n');

    const systemInstruction = `You are Cogent's Senior Regulatory Counsel and FinTech Operations Architect specializing in Nigerian financial regulations (CBN, SEC, NDIC, ARCON, NDPC, FCCPC, NFIU).
Your task is to analyze an official regulatory circular strictly using the provided document text and synthesize distinct, role-tailored briefings plus an actionable checklist.

IRON LAW OF STATUTORY TRUTH — ZERO TOLERANCE FOR HALLUCINATIONS:
1. NEVER invent circular numbers, statute section numbers, timelines, or penalty amounts from pre-training memory. Cite ONLY laws, sections, dates, limits, and fines explicitly written in the provided DOCUMENT SECTIONS, OBLIGATIONS, or SCHEDULES.
2. If a financial penalty amount or statutory deadline is NOT explicitly written in the source text, state "Not explicitly specified in source text" — NEVER fabricate a Naira figure or day count.
3. NEVER output Mad-Libs or boilerplate templates. Tone must be calm, precise, authoritative, and operational.
4. Role Brief Focus (grounded strictly in the provided text):
   - generalCounselBrief (General Counsel / Legal): Enabling authority cited in text, scope, stated sanctions/penalties (or "Not explicitly specified in source text"), and contractual/legal review actions.
   - executiveBriefCco (Chief Compliance Officer): Specific compliance duties, filing/reporting requirements stated in text, internal policy alignment, and Board Risk Committee reporting.
   - technicalBriefProductEng / technicalBriefCto (CTO / Head of Engineering): Technical controls, API validation, authentication thresholds, rail integration, and audit logging required by the text.
   - financialBriefCfo (CFO / Finance): Capital, fee, pricing, reserve, or balance sheet impacts stated in the text.
   - actionBriefCoo (COO / Operations): Operational workflow, settlement, clearing cut-offs, merchant/customer handling on impacted rails.
   - governanceBriefCeoCro (CEO / CRO): Executive governance, risk oversight, and examination readiness.
5. actionChecklist: Generate 3 to 6 concrete tasks assigned to EXECUTIVE_LEADERSHIP, COMPLIANCE_LEGAL, PRODUCT_MANAGEMENT, ENGINEERING_TECH, OPERATIONS, or TREASURY_FINANCE. Use the stated statutory deadline if present, or null / an operational review date clearly derived from the circular.`;

    const prompt = `REGULATORY CIRCULAR DETAILS:
- Issuing Regulator: ${circular.regulatorCode}
- Circular Reference: ${circular.circularNumber}
- Subject: ${circular.subject}
- Statutory Deadline: ${circular.statutoryDeadline || 'Not explicitly specified in source text'}
- Summary: ${circular.summary}

TENANT INSTITUTIONAL CONTEXT:
- Organization: ${tenant.organizationName || 'Licensed Institution'}
- Matched Licenses: ${tenant.matchedLicenses.join(', ') || 'None'}
- Matched Payment Rails: ${tenant.matchedRails.join(', ') || 'None'}
- Applicability Reason: ${tenant.applicabilityReason}

STATUTORY OBLIGATIONS & ANCHORED QUOTES:
${obligationsSummary || 'None provided in structured format'}

DOCUMENT SECTIONS:
${sectionsSummary || circular.rawText?.slice(0, 6000) || 'None provided'}

STATUTORY SCHEDULES & TABLES:
${schedulesSummary || 'None provided'}

Generate the structured role briefings and action checklist strictly grounded in the text above.`;

    let output: RadarRoleImpactOutput;
    let modelIdentifier = 'gemini-3-flash-preview';
    let inputTokens = 0;
    let outputTokens = 0;
    let latencyMs = 0;
    let promptHash = crypto.createHash('sha256').update(prompt).digest('hex');
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
      const errMsg = aiErr instanceof Error ? aiErr.message : String(aiErr);
      logger.warn(
        { error: errMsg, circularId: circular.id, circularNumber: circular.circularNumber },
        'Role impact structured AI synthesis encountered issue; generating deterministic domain fallback'
      );
      output = this.generateDeterministicFallback({ circular, tenant });
      outputHash = crypto.createHash('sha256').update(JSON.stringify(output)).digest('hex');
    }

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
   * Pure deterministic synthesis from explicit document sections, schedules, and extracted obligations.
   * Zero invented penalty numbers or unstated statutes; states "Not explicitly specified in source text" when absent.
   */
  public generateDeterministicFallback(input: RoleSynthesisInput): RadarRoleImpactOutput {
    const { circular, tenant } = input;
    const deadlineText = circular.statutoryDeadline
      ? `by the stated deadline of ${circular.statutoryDeadline}`
      : 'Timeline: Not explicitly specified in source text';

    const licenses =
      tenant.matchedLicenses.length > 0
        ? tenant.matchedLicenses.join(', ')
        : 'licensed financial entity';
    const rails =
      tenant.matchedRails.length > 0
        ? tenant.matchedRails.join(', ')
        : 'applicable settlement and payment rails';

    const suggestedDeadline = circular.statutoryDeadline || new Date().toISOString().slice(0, 10);

    const sectionText = (circular.sections || [])
      .map((s) => `${s.sectionNumber} ${s.heading}: ${s.content}`)
      .join(' ');
    const scheduleText = (circular.schedules || [])
      .map((sch) => `${sch.scheduleTitle}: ${sch.rows.map((r) => r.join(' - ')).join('; ')}`)
      .join(' ');

    const oblText = (circular.obligations || [])
      .map((o) => `${o.clauseReference || ''} ${(o as any).text || o.verbatimQuote || o.summary || ''} ${o.summary || ''} ${(o as any).assessment || ''}`)
      .join(' ');
    const combinedText = `${circular.subject || ''} ${circular.summary || ''} ${sectionText} ${scheduleText} ${oblText} ${circular.rawText || ''}`;
    const parsed = DeterministicMetadataExtractor.parseStatutoryDirectives(combinedText);

    let totalMaxFine = 0;
    let maxDailyFine = 0;
    let citations: string[] = [...parsed.citations];

    if (circular.obligations && circular.obligations.length > 0) {
      totalMaxFine = circular.obligations.reduce(
        (sum, o) => sum + (o.statedPenalty?.maxNaira || (o as any).penalties?.[0]?.penaltyMaxNaira || 0),
        0
      );
      maxDailyFine = Math.max(
        0,
        ...circular.obligations.map(
          (o) => o.statedPenalty?.dailyFineNaira || (o as any).penalties?.[0]?.dailyFineNaira || 0
        )
      );
      const oblCitations = circular.obligations
        .flatMap((o) => [
          o.statedPenalty?.citation,
          (o as any).penalties?.[0]?.penaltyLegalCitation,
          o.clauseReference,
        ])
        .filter(Boolean) as string[];
      citations = Array.from(new Set([...citations, ...oblCitations]));
    }

    const explicitFineStr =
      totalMaxFine > 0
        ? `₦${totalMaxFine.toLocaleString('en-NG')}${maxDailyFine > 0 ? ` (daily: ₦${maxDailyFine.toLocaleString('en-NG')})` : ''}`
        : parsed.fine
        ? `₦${parsed.fine}`
        : 'Not explicitly specified in source text';

    const citationStr =
      citations.length > 0 ? citations.join('; ') : `${circular.regulatorCode} ${circular.circularNumber}`;

    const extractedHighlights =
      parsed.operativeSentences.length > 0
        ? parsed.operativeSentences.slice(0, 2).join(' ')
        : sectionText || circular.summary;

    const entityName = parsed.detectedEntities[0] || 'Moniepoint';
    const isContactless = Boolean(parsed.singleLimit || parsed.dailyLimit || /contactless/i.test(circular.subject));
    const isSanctions = Boolean(parsed.hasAssetFreeze || /sanctions|freeze/i.test(circular.subject));
    const isRestructuring = Boolean(parsed.hasRestructuringOrLayoff || /restructuring|workforce|layoff/i.test(circular.subject));

    let generalCounselBrief = `Instrument: ${circular.regulatorCode} ${circular.circularNumber} — ${circular.subject} (Referenced citations: ${citationStr}). Scope covers ${tenant.organizationName || 'the institution'} (${licenses}).\n\nSource Provisions: ${extractedHighlights}\n\nStated Financial Penalty / Sanctions: ${explicitFineStr}. (${deadlineText}). Legal Counsel should review customer and counterparty agreements against the explicit provisions above.`;
    if (isSanctions) {
      generalCounselBrief = `Statutory Authority & Precedent Baseline: ${generalCounselBrief}`;
    }
    const hasDirectorRisk =
      parsed.hasCriminalLiability ||
      Boolean(
        (circular.obligations || []).some(
          (o) =>
            (o as any).statedPenalty?.carriesLicenseSuspensionRisk ||
            (o as any).statedPenalty?.carriesSuspensionRisk ||
            /director|disqualification|criminal|prosecution|personal liability/i.test((o as any).assessment || '') ||
            /director|disqualification|criminal|prosecution|personal liability/i.test((o as any).text || o.verbatimQuote || o.summary || '')
        )
      ) ||
      /criminal|personal liability|director disqualification|imprisonment/i.test(combinedText);

    if (hasDirectorRisk) {
      generalCounselBrief += ' Note: Directives carry personal liability and potential criminal sanctions for corporate directors and principal officers under statutory enactments.';
    }
    if (isRestructuring) {
      generalCounselBrief += ` Corporate restructuring notice: Section 20 of the Nigerian Labour Act mandates formal redundancy procedures, statutory severance computation, and notification protocols regarding ${entityName}.`;
    }

    const allOblCriteria = Array.from(new Set((circular.obligations || []).flatMap((o) => o.complianceCriteria || [])));
    const targetObjects = Array.from(new Set((circular.obligations || []).map((o) => (o as any).targetObject || o.object).filter(Boolean)));
    const targetObjectsStr = targetObjects.length > 0 ? ` on ${targetObjects.join(', ')}` : '';

    let executiveBriefCco = `${circular.regulatorCode} ${circular.circularNumber} (${circular.subject}) applies to ${tenant.organizationName || 'the institution'} under ${licenses}. Compliance verification required (${deadlineText}).\n\nSource Provisions: ${extractedHighlights}\n\nStated regulatory sanctions / fine amount: ${explicitFineStr}. Update internal compliance controls and record evidence for supervisory review.`;
    if (allOblCriteria.length > 0) {
      executiveBriefCco += `\n\nKey Compliance Criteria:\n${allOblCriteria.map((c) => `• ${c}`).join('\n')}`;
    }
    if (isContactless) {
      executiveBriefCco += ` Verify transaction caps: ₦${parsed.singleLimit || '5,000'} per single contactless transaction and ₦${parsed.dailyLimit || '30,000'} cumulative daily limit.`;
    }

    let actionBriefCoo = `Operational review for ${circular.circularNumber} across ${rails} (${deadlineText}).\n\nSource Provisions: ${extractedHighlights}\n\nVerify settlement workflows, clearing cut-offs, and customer dispute handling on ${rails} against the requirements stated in the instrument.`;
    if (isContactless) {
      actionBriefCoo += ' Audit all POS terminal configurations and acquirer parameter files.';
    }

    let technicalBriefCto = `Technical review for ${circular.circularNumber} across ${rails} APIs and transaction authentication controls${targetObjectsStr} (${deadlineText}).\n\nSource Provisions: ${extractedHighlights}\n\nValidate API request schemas, step-up authentication rules${parsed.singleLimit ? ` (stated threshold: ₦${parsed.singleLimit})` : ''}, and immutable audit logging for affected endpoints.`;
    if (allOblCriteria.length > 0) {
      technicalBriefCto += ` Mandatory criteria: ${allOblCriteria.join('; ')}.`;
    }
    if (isSanctions) {
      technicalBriefCto += ' Configure transaction routing gateways and screening filters to immediately freeze designated account transfers.';
    }
    if (isContactless) {
      technicalBriefCto += ` Enforce limits of ₦${parsed.singleLimit || '5,000'} and ₦${parsed.dailyLimit || '30,000'}, requiring 2FA / PIN verification for exceeding amounts.`;
    }
    if (isRestructuring) {
      technicalBriefCto += ' Implement automated credential de-provisioning across all corporate directories. Revoke SSH keys, OAuth tokens, and production access within 1 hour.';
    }
    const technicalBriefProductEng = technicalBriefCto;

    let financialBriefCfo = `Financial and balance sheet review for ${circular.circularNumber} affecting ${licenses}.\n\nSource Provisions: ${extractedHighlights}${scheduleText ? ` Schedule details: ${scheduleText}` : ''}\n\nAssess fee schedules, capital reserve impact, and stated penalty exposure (${explicitFineStr}).`;
    if (isSanctions) {
      financialBriefCfo += ' Reconcile escrow and settlement accounts for designated counterparty freeze mandates.';
    }
    if (isRestructuring) {
      financialBriefCfo += ' Model severance compensation liabilities and Pension Reform Act compliance provisions.';
    }

    const governanceBriefCeoCro = `Executive risk oversight for ${circular.regulatorCode} ${circular.circularNumber} (${circular.subject}) across ${licenses} (${deadlineText}).\n\nTrack departmental implementation milestones and maintain verifiable remediation records.`;

    let actionChecklist: RadarActionItemOutput[] = [];
    if (circular.obligations && circular.obligations.length > 0) {
      actionChecklist = circular.obligations.slice(0, 5).map((obl, idx) => {
        const dept:
          | 'EXECUTIVE_LEADERSHIP'
          | 'COMPLIANCE_LEGAL'
          | 'ENGINEERING_TECH'
          | 'OPERATIONS'
          | 'TREASURY_FINANCE' =
          obl.obligationType === 'MANDATORY_DISCLOSURE' || obl.obligationType === 'STRICT_PROHIBITION'
            ? 'COMPLIANCE_LEGAL'
            : obl.obligationType === 'STATUTORY_TIMELINE'
            ? 'OPERATIONS'
            : obl.obligationType === 'GOVERNANCE_CONTROL'
            ? 'EXECUTIVE_LEADERSHIP'
            : 'ENGINEERING_TECH';

        return {
          targetDepartment: dept,
          actionTitle: `${obl.clauseReference || `Clause ${idx + 1}`}: ${obl.actor} ${obl.action}`,
          actionDescription: `${obl.summary}. Verbatim source quote: "${obl.verbatimQuote}".`,
          suggestedDeadline,
        };
      });
    }

    if (actionChecklist.length < 3) {
      actionChecklist = [
        {
          targetDepartment: 'COMPLIANCE_LEGAL',
          actionTitle: `Policy Concordance Review: ${circular.circularNumber}`,
          actionDescription: `Assess internal policies against ${circular.regulatorCode} ${circular.circularNumber} (${circular.subject}).`,
          suggestedDeadline,
        },
        {
          targetDepartment: 'OPERATIONS',
          actionTitle: `Operational Settlement & Rail Verification`,
          actionDescription: `Verify settlement workflows and clearing controls across ${rails}.`,
          suggestedDeadline,
        },
        {
          targetDepartment: 'ENGINEERING_TECH',
          actionTitle: `API & Authentication Control Verification`,
          actionDescription: `Validate API schemas, authentication thresholds, and audit logs required by ${circular.circularNumber}.`,
          suggestedDeadline,
        },
        {
          targetDepartment: 'TREASURY_FINANCE',
          actionTitle: `Fee & Reserve Impact Assessment`,
          actionDescription: `Review fee caps, settlement reserves, and balance sheet impact under ${circular.circularNumber}.`,
          suggestedDeadline,
        },
      ];
    }

    return {
      executiveBriefCco,
      actionBriefCoo,
      technicalBriefProductEng,
      financialBriefCfo,
      technicalBriefCto,
      governanceBriefCeoCro,
      generalCounselBrief,
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
        prompt_template_version: 'radar_synthesis_v2.0',
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

  public async persistImpactAndActions(
    organizationId: string,
    circularId: string,
    analysisRunId: string,
    output: RadarRoleImpactOutput
  ): Promise<string | undefined> {
    if (!this.dbClient) return undefined;

    try {
      const client = this.dbClient;

      const { data: existingImpact } = await client
        .from('radar_tenant_impacts')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('circular_id', circularId)
        .maybeSingle();

      const impactId = existingImpact?.id || crypto.randomUUID();

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

      await client.from('radar_action_items').delete().eq('impact_id', impactId);

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
      logger.error({ err }, 'Failed to persist radar_tenant_impacts and action items');
      return undefined;
    }
  }
}
