import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { AiEngine } from '@/shared/ai-engine';
import { logger } from '@/shared/logger';
import { RegulatorCode } from '@/shared/types';
import {
  HorizonSynthesisOutput,
  HorizonSynthesisOutputSchema,
} from '../types/schema';

export interface HorizonSynthesisInput {
  circularId: string;
  organizationId?: string;
  userId?: string;
  forceResynthesize?: boolean;
}

export class HorizonSynthesisEngine {
  private dbClient: SupabaseClient<Database>;
  private aiEngine: AiEngine;

  constructor(options: { dbClient: SupabaseClient<Database>; aiEngine?: AiEngine }) {
    this.dbClient = options.dbClient;
    this.aiEngine = options.aiEngine || new AiEngine();
  }

  /**
   * Static convenience entry point
   */
  public static async synthesizeAlert(
    input: HorizonSynthesisInput & { dbClient: SupabaseClient<Database> }
  ): Promise<HorizonSynthesisOutput> {
    const engine = new HorizonSynthesisEngine({ dbClient: input.dbClient });
    return engine.synthesizeAlert(input);
  }

  /**
   * Synthesize an authentic, document-grounded horizon insight for a regulatory alert.
   * Enforces ZERO Mad-Libs templates, true document taxonomy, actionability triage,
   * empirical severity scoring, and departmental briefs grounded strictly in text.
   */
  public async synthesizeAlert(input: HorizonSynthesisInput): Promise<HorizonSynthesisOutput> {
    const { circularId, organizationId, forceResynthesize } = input;

    // 1. Fetch circular record with document version context
    const { data: circular, error: circErr } = await this.dbClient
      .from('radar_circulars')
      .select('*, regulatory_document_versions(id, canonical_source_url, source_file_url)')
      .eq('id', circularId)
      .maybeSingle();

    if (circErr || !circular) {
      throw new Error(`Regulatory alert not found for ID: ${circularId}. ${circErr?.message || ''}`);
    }

    // Return existing synthesis if already generated and resynthesis not forced
    if (
      !forceResynthesize &&
      (circular as any).synthesis_status === 'SYNTHESIZED' &&
      (circular as any).executive_summary &&
      (circular as any).executive_summary.length > 50 &&
      (circular as any).severity_matrix
    ) {
      return {
        docType: (circular as any).doc_type || 'Circular / Directive',
        alertType: (circular as any).alert_type || 'Informative',
        isRelevant: Boolean((circular as any).is_relevant),
        executiveSummary: (circular as any).executive_summary,
        keyPoints: Array.isArray((circular as any).key_points) ? (circular as any).key_points : [],
        impactedDepartments: Array.isArray((circular as any).impacted_departments)
          ? (circular as any).impacted_departments
          : [],
        departmentalBriefs: {},
        importantDates: Array.isArray((circular as any).important_dates) ? (circular as any).important_dates : [],
        otherDates: Array.isArray((circular as any).other_dates) ? (circular as any).other_dates : [],
        severityMatrix: (circular as any).severity_matrix,
        topics: Array.isArray((circular as any).topics) ? (circular as any).topics : [],
        impactedAreas: Array.isArray((circular as any).impacted_areas) ? (circular as any).impacted_areas : [],
      };
    }

    // 2. Extract best available raw document text
    const docVer = Array.isArray(circular.regulatory_document_versions)
      ? circular.regulatory_document_versions[0]
      : circular.regulatory_document_versions;

    const sourceText =
      circular.raw_text?.trim() ||
      (docVer as any)?.raw_text?.trim() ||
      `${circular.subject}. Official regulatory document published on ${circular.issuance_date || circular.created_at?.slice(0, 10)}.`;

    const regulatorCode = (circular.circular_number || '').split('/')[0]?.toUpperCase() || 'CBN';

    // 3. Construct structured synthesis prompt for Gemini
    const systemInstruction = `You are Cogent's Principal Supervisory Horizon Intelligence Officer specializing in African financial regulations and statutory governance (under oversight by CBN, NDPC, FCCPC, SEC, ARCON, NFIU, NDIC).
Your mission is to perform an uncompromising, authentic document-grounded regulatory synthesis of an ingested alert.

ZERO-TOLERANCE RULES — NEVER COMPROMISE:
1. ZERO STRING TEMPLATES & ZERO MAD-LIBS BOILERPLATE:
   - Absolutely NEVER output strings like "The [Regulator] issued Circular Directive [CODE] concerning..." or "Default statutory enforcement penalties apply pursuant to..." or "Statutory Baseline under [Regulator]...".
   - Every single sentence must be uniquely synthesized from the facts, dates, entities, and clauses present in the document.
2. ACCURATE DOCUMENT TAXONOMY (docType):
   - "Circular / Directive": Formal circulars or administrative directives with binding regulatory rules.
   - "Regulations & Guidelines": Comprehensive regulatory frameworks, rulebooks, codes of practice.
   - "Exposure Draft": Consultative papers or draft regulations released for industry review.
   - "Enforcement & Sanctions": Public sanction notices, blacklists, penalty orders, license revocations.
   - "Reports & Research": Statistical bulletins, market studies, annual financial stability reports.
   - "News & Events": Press releases, courtesy visits, bilateral study tours (e.g. NDPC hosting Sri Lankan delegation), conference announcements, executive appointments.
3. ACTIONABILITY TRIAGE (alertType):
   - "Actionable": ONLY if the document creates new obligations, amends operational rules, mandates filings, or sets deadlines that financial institutions must act on.
   - "Informative": For news, PR events, study tours, general market awareness, where NO immediate operational change or compliance action is mandated.
4. EXECUTIVE SUMMARY:
   - 1 to 2 crisp, natural paragraphs explaining exactly what happened, what the paper or announcement actually says, who was involved, and its practical significance.
   - If it is a 2-day study tour between NDPC and Sri Lanka, state clearly that NDPC hosted a study tour with Sri Lanka's Data Protection Authority to exchange knowledge on institutional frameworks—do NOT claim it creates mandatory breach reporting duties!
5. KEY POINTS:
   - 3 to 5 concrete takeaways directly quoting or citing specific facts, numbers, dates, or announcements from the text.
6. IMPACTED DEPARTMENTS:
   - Map ONLY departments with genuine, demonstrable operational exposure or statutory duties (from: COMPLIANCE, LEGAL, OPERATIONS, TECH_INFRA, TREASURY, GROWTH_MKT).
   - If it is an Informative News/PR event with no statutory duties, return an empty array [] or ["COMPLIANCE"] for general awareness only.
7. DEPARTMENTAL SUPERVISORY BRIEFS:
   - If alertType is "Informative", do NOT invent fake obligations! Leave departmentalBriefs empty.
   - If alertType is "Actionable", each impacted department must receive a tailored memo citing the exact clauses/facts and specific operational steps.
8. IMPORTANT DATES:
   - Extract only dates explicitly mentioned in the text (Publication Date, Effective Date, Compliance Deadline, Event Date).
9. SEVERITY MATRIX:
   - tier: "G1" (low/routine or informative), "G2" (medium/operational), or "G3" (high/critical penalty/license risk).
   - score: 0 to 100 percentage reflecting statutory gravity (e.g., routine PR/study tour is G1 | 15%-25%, operational guideline is G2 | 45%-70%, criminal/emergency sanction is G3 | 75%-95%).
   - natureOfDocument: Short descriptor (e.g. "Directive", "Bilateral Study Tour", "Guideline", "Sanctions Order").
   - associatedReports: List any referenced circulars or laws.
   - externalEntities: Any named institutions or third parties.
   - complexity: Brief description of the theme.
   - implementationDate: Date if applicable.
10. RELEVANCY (isRelevant):
   - Evaluate whether this alert is relevant to Nigerian regulated financial institutions, fintechs, banks, or payment operators.`;

    const prompt = `
REGULATORY ALERT CONTEXT:
- Document Title: ${circular.subject}
- Issuing Regulator: ${regulatorCode}
- Reference Code: ${(circular as any).circularNumber || circular.circular_number || 'N/A'}
- Publication Date: ${circular.issuance_date || circular.created_at?.slice(0, 10)}
- Source URL: ${(circular as any).canonical_source_url || (circular as any).regulatory_document_versions?.canonical_source_url || 'Official Regulatory Portal'}

AUTHENTIC SCRAPED DOCUMENT TEXT:
${sourceText.slice(0, 12000)}

INSTRUCTIONS FOR JSON GENERATION:
1. docType: Accurate taxonomy classification ("Circular / Directive", "Regulations & Guidelines", "Exposure Draft", "Enforcement & Sanctions", "Reports & Research", or "News & Events").
2. alertType: "Actionable" if creating operational or compliance duties; "Informative" if general news, speeches, or bilateral events.
3. executiveSummary: 1-2 rich, natural paragraphs summarizing what the document actually states without boilerplate templates or generic filler.
4. keyPoints: 3 to 6 concrete, verifiable takeaways citing facts, sections, or announcements in text.
5. departmentalBriefs:
   - If alertType is "Informative": return {} (empty object).
   - If alertType is "Actionable": provide customized memos citing specific clauses/facts for impacted departments:
     {
       "generalCounsel": "Statutory baseline, exact clauses, enabling powers, and penalty exposure...",
       "chiefCompliance": "Reporting timelines, mandatory filings, and regulatory submission rules...",
       "operations": "Operational rail impact, settlement clearing, and counterparty workflows...",
       "technicalCto": "Architecture modifications, payload schemas, 2FA/auth rules, and audit logs...",
       "financialCfo": "Capital adequacy, liquidity buffers, levies, or balance sheet impact...",
       "governanceCeoCro": "Board risk committee reporting, supervisory examination readiness..."
     }
6. importantDates: Array of dates explicitly mentioned in text (Publication Date, Effective Date, Compliance Deadline, Event Date).
7. severityMatrix: tier ("G1", "G2", "G3"), score (0-100), natureOfDocument, associatedReports, externalEntities, complexity, implementationDate.

Respond ONLY with valid JSON conforming to the HorizonSynthesisOutput schema.`;

    // 4. Generate structured result via AI Engine
    const aiResult = await this.aiEngine.generateStructured({
      systemInstruction,
      prompt,
      schema: HorizonSynthesisOutputSchema,
      modelAlias: 'FAST_MODEL',
    });

    const synth = aiResult.data;

    // Attach departmental briefs inside severity matrix for permanent master circular accessibility
    const enrichedSeverityMatrix = {
      ...synth.severityMatrix,
      departmentalBriefs: synth.departmentalBriefs || {},
    };

    // 5. Build Audit Log Entry
    const nowIso = new Date().toISOString();
    const existingAuditLogs = Array.isArray((circular as any).audit_logs) ? (circular as any).audit_logs : [];
    const updatedAuditLogs = [
      ...existingAuditLogs,
      {
        id: crypto.randomUUID(),
        timestamp: nowIso,
        action: forceResynthesize ? 'Document Re-synthesized by Horizon Engine' : 'Initial Horizon Synthesis Completed',
        author: 'Cogent Horizon Engine',
      },
    ];

    // 6. Update radar_circulars in database
    const updatePayload: Record<string, any> = {
      doc_type: synth.docType,
      alert_type: synth.alertType,
      severity_tier: synth.severityMatrix.tier,
      severity_score: synth.severityMatrix.score,
      executive_summary: synth.executiveSummary,
      key_points: synth.keyPoints,
      impacted_departments: synth.impactedDepartments,
      important_dates: synth.importantDates,
      other_dates: synth.otherDates || [],
      severity_matrix: enrichedSeverityMatrix,
      topics: synth.topics,
      impacted_areas: synth.impactedAreas,
      synthesis_status: 'SYNTHESIZED',
      is_relevant: synth.isRelevant,
      audit_logs: updatedAuditLogs,
    };

    if (synth.importantDates.length > 0) {
      const deadlineDate = synth.importantDates.find((d) => /deadline|compliance/i.test(d.label))?.date;
      if (deadlineDate && !circular.statutory_deadline) {
        updatePayload.statutory_deadline = deadlineDate;
      }
      const effDate = synth.importantDates.find((d) => /effective|commencement/i.test(d.label))?.date;
      if (effDate && !circular.effective_date) {
        updatePayload.effective_date = effDate;
      }
    }

    const { error: updateErr } = await (this.dbClient as any)
      .from('radar_circulars')
      .update(updatePayload)
      .eq('id', circularId);

    if (updateErr) {
      logger.error({ error: updateErr.message, circularId }, 'Failed updating synthesized circular record');
    }

    // Enforce Statutory Eligibility Gate on linked regulatory_instruments:
    // Non-binding News & Events, Reports & Research, or Informative notices must NOT appear in /library.
    if (circular.document_version_id) {
      const isBindingInstrument =
        synth.alertType === 'Actionable' &&
        synth.docType !== 'News & Events' &&
        synth.docType !== 'Reports & Research';
      const { data: verRow } = await this.dbClient
        .from('regulatory_document_versions')
        .select('instrument_id')
        .eq('id', circular.document_version_id)
        .maybeSingle();
      if (verRow?.instrument_id) {
        await (this.dbClient as any)
          .from('regulatory_instruments')
          .update({
            is_binding: isBindingInstrument,
            overview: synth.executiveSummary,
          })
          .eq('id', verRow.instrument_id);
      }
    }

    // 7. Sync departmental briefs to radar_tenant_impacts for target org or all active orgs
    try {
      let targetOrgIds: string[] = [];
      if (organizationId) {
        targetOrgIds = [organizationId];
      } else {
        const { data: orgs } = await this.dbClient.from('organizations').select('id');
        if (orgs && orgs.length > 0) {
          targetOrgIds = orgs.map((o) => o.id);
        }
      }

      for (const orgId of targetOrgIds) {
        const { data: existingImpact } = await this.dbClient
          .from('radar_tenant_impacts')
          .select('id')
          .eq('organization_id', orgId)
          .eq('circular_id', circularId)
          .maybeSingle();

        const impactPayload: Record<string, any> = {
          organization_id: orgId,
          circular_id: circularId,
          is_applicable: synth.isRelevant,
          applicability_reason: synth.alertType === 'Informative'
            ? 'Informative supervisory intelligence alert — no direct operational change triggered.'
            : 'Actionable regulatory issuance binding covered institutional operations.',
          executive_brief_cco: synth.departmentalBriefs.chiefCompliance || null,
          action_brief_coo: synth.departmentalBriefs.operations || null,
          technical_brief_product_eng: synth.departmentalBriefs.technicalCto || null,
          financial_brief_cfo: synth.departmentalBriefs.financialCfo || null,
          role_briefs: synth.departmentalBriefs,
          brief_legal: synth.departmentalBriefs.generalCounsel ? { summary: synth.departmentalBriefs.generalCounsel } : null,
          brief_cco: synth.departmentalBriefs.chiefCompliance ? { summary: synth.departmentalBriefs.chiefCompliance } : null,
          brief_cto: synth.departmentalBriefs.technicalCto ? { summary: synth.departmentalBriefs.technicalCto } : null,
          brief_cfo: synth.departmentalBriefs.financialCfo ? { summary: synth.departmentalBriefs.financialCfo } : null,
          brief_ceo_cro: synth.departmentalBriefs.governanceCeoCro ? { summary: synth.departmentalBriefs.governanceCeoCro } : null,
        };

        if (existingImpact) {
          await (this.dbClient as any)
            .from('radar_tenant_impacts')
            .update(impactPayload)
            .eq('id', (existingImpact as any).id);
        } else {
          await (this.dbClient as any)
            .from('radar_tenant_impacts')
            .insert(impactPayload);
        }
      }
    } catch (impactSyncErr) {
      logger.warn({ error: String(impactSyncErr), circularId }, 'Error syncing tenant impact briefs');
    }

    logger.info(
      { circularId, docType: synth.docType, alertType: synth.alertType, score: synth.severityMatrix.score },
      'Successfully synthesized authentic regulatory horizon insight'
    );

    return synth;
  }
}
