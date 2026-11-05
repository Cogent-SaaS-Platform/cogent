import crypto from 'crypto';
import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { AiEngine } from '@/shared/ai-engine';
import { logger } from '@/shared/logger';
import { DomSanitizer } from '@/modules/radar/services/domSanitizer';
import {
  RegulatoryDomainCode,
  InstrumentType,
  DocumentClassification,
} from '@/shared/types';
import {
  RegulatoryInstrumentPresentation,
  StatutorySection,
  RegulatoryObligationPresentation,
  ObligationRuleType,
  PolicyApplicabilityType,
  AssessmentCriterionItem,
} from '../types';

export const AssessmentCriterionSchema = z.object({
  type: z.enum(['Core Criteria', 'Best Practice']),
  text: z.string().min(5),
  evidenceRequired: z.string().optional(),
});

export const ExtractedObligationSchema = z.object({
  sectionNumber: z.string().default('1'),
  code: z.string().optional(),
  title: z.string().min(5),
  description: z.string().min(10),
  obligationType: z.enum(['Prescriptive', 'Risk Based', 'Conditional', 'Prohibitive']),
  policyApplicability: z.enum(['Policy Applicable', 'Operational Only']).default('Policy Applicable'),
  verbatimQuote: z.string().min(5),
  sectionOrPageRef: z.string().default('Section 1.0'),
  assessmentCriteria: z.array(AssessmentCriterionSchema).min(1).max(5),
  riskDescription: z.string().min(5),
});

export const KeyRequirementAreaSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
});

export const LogicalSectionSchema = z.object({
  sectionNumber: z.string(),
  sectionTitle: z.string().min(3),
  content: z.string().min(10),
});

export const StatutoryExtractionResultSchema = z.object({
  overview: z.string().min(20),
  scope: z.string().min(20),
  keyRequirementAreas: z.array(KeyRequirementAreaSchema).min(2),
  domain: z.string().default('FINTECH_PAYMENTS'),
  instrumentType: z.string().default('SUBSIDIARY_REGULATION'),
  publicationDate: z.string().nullable().optional(),
  entryIntoForceDate: z.string().nullable().optional(),
  sections: z.array(LogicalSectionSchema).min(1),
  obligations: z.array(ExtractedObligationSchema).min(1),
});

export type StatutoryExtractionResult = z.infer<typeof StatutoryExtractionResultSchema>;

export interface ExtractionInput {
  cleanText: string;
  title: string;
  regulatorCode: string;
  sourceUrl?: string | null;
  referenceCode?: string;
  year?: number;
}

export class RegulatoryExtractionService {
  private aiEngine: AiEngine;

  constructor(aiEngine?: AiEngine) {
    this.aiEngine = aiEngine || new AiEngine();
  }

  /**
   * Main synthesis & obligation extraction engine using Gemini structured outputs
   */
  public async extractRegulationAndObligations(input: ExtractionInput): Promise<StatutoryExtractionResult> {
    const { cleanText, title, regulatorCode, sourceUrl, referenceCode, year } = input;

    const systemInstruction = `You are Cogent's Chief Supervisory Intelligence Officer specializing in African regulatory governance (supervised by CBN, NDPC, SEC, FCCPC, ARCON, NFIU, NDIC).
Your task is to analyze authentic regulatory legal texts and synthesize:
1. An authoritative Executive Overview (1 crisp paragraph explaining what the statutory instrument establishes, its regulatory intent, and legislative foundation. NEVER repeat or regurgitate the title!).
2. Scope of Applicability (1 crisp paragraph defining exactly WHICH regulated entities, licensed institutions, or market participants must comply, and any explicit exemptions).
3. Key Requirement Areas: 3 to 6 thematic pillars summarizing the core requirements (e.g. 1. Retail Client Protections, 2. Due Diligence & KYC, 3. Capital Adequacy & Risk Retention).
4. Logical Section Decomposition: Divide the text into its true structural or thematic sections (e.g., Section 1, Section 2... or Part I, Part II...). Do NOT chop single sentences into sections!
5. True Obligation Extraction: Extract ONLY genuine compliance mandates, duties, reporting requirements, or strict prohibitions where a regulated entity must/shall/is required to act or refrain from acting. Ignore greetings, signatures, introductory preambles, or customer thank-you testimonials.
For EACH extracted obligation:
- title: Crisp, specific title (e.g., "Retail Client Portfolio Disclosure Mandate").
- description: Plain-English operational statement of what the institution must do.
- obligationType: "Prescriptive" | "Risk Based" | "Conditional" | "Prohibitive".
- policyApplicability: "Policy Applicable" (must be in policy manuals) or "Operational Only".
- verbatimQuote: The exact verbatim sentence or clause from the text proving this obligation exists.
- sectionOrPageRef: Section or page citation (e.g. "Section 3.2" or "Clause 4").
- assessmentCriteria: 2 to 5 concrete, checkable audit criteria (labeled "Core Criteria" or "Best Practice") that an auditor tests against internal policies.
- riskDescription: Statutory sanction, financial fine, or supervisory consequence of breach.`;

    const prompt = `REGULATORY INSTRUMENT CONTEXT:
- Official Title: ${title}
- Regulatory Authority: ${regulatorCode}
- Reference Code: ${referenceCode || 'STATUTORY_DIRECTIVE'}
- Source: ${sourceUrl || 'Official Gazette / Regulatory Portal'}
- Enacted Year: ${year || new Date().getFullYear()}

AUTHENTIC CLEAN STATUTORY TEXT:
${cleanText.slice(0, 24000)}

Extract the structured regulatory instrument overview, scope, key requirements, logical sections, and genuine compliance obligations strictly according to the required JSON schema.`;

    try {
      const result = await this.aiEngine.generateStructured({
        systemInstruction,
        prompt,
        schema: StatutoryExtractionResultSchema,
        modelAlias: 'REASONING_MODEL',
        timeoutMs: 35000,
      });

      return result.data;
    } catch (aiErr: any) {
      logger.warn({ error: aiErr.message }, 'Gemini extraction failed; falling back to deterministic statutory parser');
      return this.deterministicFallbackExtraction(input);
    }
  }

  /**
   * Deterministic fallback statutory extractor (resilient offline parser)
   */
  public deterministicFallbackExtraction(input: ExtractionInput): StatutoryExtractionResult {
    const { cleanText, title, regulatorCode, referenceCode, year } = input;
    const clean = DomSanitizer.cleanTitle(title);
    const textLower = cleanText.toLowerCase();

    // 1. Resolve domain
    let domain: RegulatoryDomainCode = 'FINTECH_PAYMENTS';
    if (regulatorCode === 'NDPC' || textLower.includes('privacy') || textLower.includes('data protection')) {
      domain = 'DATA_PRIVACY_AI';
    } else if (regulatorCode === 'SEC' && (textLower.includes('vasp') || textLower.includes('crypto') || textLower.includes('virtual asset'))) {
      domain = 'CRYPTO_VASP';
    } else if (regulatorCode === 'SEC') {
      domain = 'CAPITAL_MARKETS';
    } else if (regulatorCode === 'FCCPC' || textLower.includes('consumer') || textLower.includes('lending')) {
      domain = 'CONSUMER_PROTECTION';
    } else if (regulatorCode === 'ARCON' || textLower.includes('advertis')) {
      domain = 'CONSUMER_PROTECTION';
    } else if (textLower.includes('sanction') || textLower.includes('freeze') || textLower.includes('aml') || textLower.includes('terroris')) {
      domain = 'AML_CFT';
    }

    // 2. Synthesize Overview
    const overview = `This regulatory instrument establishes binding supervisory governance under the authority of ${regulatorCode}. It mandates specific compliance baselines, operational risk safeguards, and mandatory reporting protocols for regulated entities operating within the Nigerian financial and capital markets ecosystem.`;

    // 3. Synthesize Scope
    let scope = `These directives apply to licensed Commercial Banks, Payment Service Providers (PSPs), Capital Market Operators, and regulated corporate entities under the statutory jurisdiction of ${regulatorCode}.`;
    if (domain === 'DATA_PRIVACY_AI') {
      scope = `These rules apply to Data Controllers and Data Processors of Major Importance (DCMI) in Nigeria, including digital financial institutions processing personal and financial customer data.`;
    } else if (domain === 'AML_CFT') {
      scope = `These sanctions and counter-terrorist financing directives apply universally to all financial institutions, designated non-financial businesses, and capital market operators in Nigeria.`;
    }

    // 4. Synthesize Key Requirement Areas
    const keyRequirementAreas = [
      {
        title: 'Statutory Compliance Baseline',
        description: 'Mandatory alignment of internal operational procedures with directives issued by the regulatory authority.',
      },
      {
        title: 'Supervisory Monitoring & Disclosure',
        description: 'Procedures for maintaining verifiable compliance records and furnishing periodic filings upon supervisory inspection.',
      },
      {
        title: 'Enforcement & Sanctions Preparedness',
        description: 'Institutional protocols to mitigate statutory exposure, civil liability, and administrative enforcement penalties.',
      },
    ];

    // 5. Decompose clean text into real sections
    const paragraphs = cleanText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 40 && !DomSanitizer.isJunkTitle(p));

    const logicalSections: Array<{ sectionNumber: string; sectionTitle: string; content: string }> = [];
    const extractedObligations: z.infer<typeof ExtractedObligationSchema>[] = [];

    // Group paragraphs into 2-5 thematic sections
    const sectionSize = Math.max(1, Math.ceil(paragraphs.length / 4));
    let secIdx = 1;

    for (let i = 0; i < paragraphs.length; i += sectionSize) {
      const slice = paragraphs.slice(i, i + sectionSize);
      const combinedText = slice.join('\n\n');
      const firstLine = slice[0].split('\n')[0].replace(/^[#\d\.\-\s]+/, '').trim();
      const secTitle = firstLine.length > 5 && firstLine.length < 70 ? firstLine : `Statutory Operational Directives Part ${secIdx}`;

      logicalSections.push({
        sectionNumber: `Section ${secIdx}.0`,
        sectionTitle: secTitle,
        content: combinedText,
      });

      // Find operative sentence for obligation
      const sentences = combinedText
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 30 && !s.includes('http') && !s.includes('search'));

      const operativeSentences = sentences.filter((s) =>
        /\b(shall|must|mandat|prohibit|requir|ensure|submit|maintain|freeze|sanction|comply|furnish|file|disclose)\b/i.test(s)
      );

      const chosenSentence = operativeSentences[0] || sentences[0] || combinedText.slice(0, 180);
      const hash = crypto.createHash('md5').update(chosenSentence).digest('hex').slice(0, 4).toUpperCase();
      const oblCode = `OBL-${regulatorCode}-${hash}-${String(secIdx).padStart(2, '0')}`;

      let ruleType: ObligationRuleType = 'Prescriptive';
      if (/prohibit|shall not|must not|forbidden/i.test(chosenSentence)) {
        ruleType = 'Prohibitive';
      } else if (/risk|assess|adequate/i.test(chosenSentence)) {
        ruleType = 'Risk Based';
      } else if (/condition|approval|subject to/i.test(chosenSentence)) {
        ruleType = 'Conditional';
      }

      extractedObligations.push({
        sectionNumber: `Section ${secIdx}.0`,
        code: oblCode,
        title: secTitle.length > 60 ? `${secTitle.slice(0, 57)}...` : secTitle,
        description: chosenSentence.length > 240 ? `${chosenSentence.slice(0, 237)}...` : chosenSentence,
        obligationType: ruleType,
        policyApplicability: 'Policy Applicable',
        verbatimQuote: chosenSentence,
        sectionOrPageRef: `Section ${secIdx}.0`,
        assessmentCriteria: [
          {
            type: 'Core Criteria',
            text: `Internal operating manuals explicitly incorporate the requirement to: ${chosenSentence.slice(0, 140)}...`,
            evidenceRequired: 'Approved board policy document or standard operating procedure (SOP)',
          },
          {
            type: 'Best Practice',
            text: `Supervisory audit trails and periodic review checkpoints are maintained for inspection readiness.`,
            evidenceRequired: 'Inspection audit log or system event log record',
          },
        ],
        riskDescription: `Statutory penalties, administrative fines, or supervisory remediation sanctions pursuant to ${regulatorCode} regulatory oversight.`,
      });

      secIdx++;
    }

    if (logicalSections.length === 0) {
      logicalSections.push({
        sectionNumber: 'Section 1.0',
        sectionTitle: 'Statutory Compliance Directives',
        content: cleanText,
      });
      extractedObligations.push({
        sectionNumber: 'Section 1.0',
        code: `OBL-${regulatorCode}-001`,
        title: 'Statutory Compliance Directive',
        description: cleanText.slice(0, 200),
        obligationType: 'Prescriptive',
        policyApplicability: 'Policy Applicable',
        verbatimQuote: cleanText.slice(0, 150),
        sectionOrPageRef: 'Section 1.0',
        assessmentCriteria: [
          {
            type: 'Core Criteria',
            text: 'Institutional internal policy aligns with statutory requirements.',
            evidenceRequired: 'Approved internal policy document',
          },
        ],
        riskDescription: `Regulatory enforcement risk under ${regulatorCode} powers.`,
      });
    }

    return {
      overview,
      scope,
      keyRequirementAreas,
      domain,
      instrumentType: 'SUBSIDIARY_REGULATION',
      publicationDate: year ? `${year}-01-15` : new Date().toISOString().slice(0, 10),
      entryIntoForceDate: year ? `${year}-01-15` : new Date().toISOString().slice(0, 10),
      sections: logicalSections,
      obligations: extractedObligations,
    };
  }

  /**
   * Persists extracted regulatory instrument, sections, and obligations into the database
   */
  public async persistExtractedInstrument(
    db: SupabaseClient<Database>,
    params: {
      instrumentId?: string;
      title: string;
      regulatorCode: string;
      sourceUrl?: string | null;
      sourceFileUrl?: string | null;
      sourceFileHash?: string | null;
      extracted: StatutoryExtractionResult;
      capturedText: string;
      owner?: string;
      organizationId?: string;
    }
  ): Promise<{ instrumentId: string; versionId: string; sectionsCount: number; obligationsCount: number }> {
    const {
      title,
      regulatorCode,
      sourceUrl,
      sourceFileUrl,
      sourceFileHash,
      extracted,
      capturedText,
      owner = 'Chief Compliance Officer',
      organizationId,
    } = params;

    const instrumentId = params.instrumentId || crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // 1. Resolve Regulatory Body ID
    const { data: bodyData } = await db
      .from('regulatory_bodies')
      .select('id')
      .eq('code', regulatorCode as any)
      .maybeSingle();

    const bodyId = bodyData?.id;

    // 2. Insert or Update regulatory_instruments
    const shortName = title.length > 50 ? `${title.slice(0, 47)}...` : title;
    const initialAuditLogs = [
      {
        id: crypto.randomUUID(),
        timestamp: nowIso,
        action: 'Instrument Ingested & Synthesized by Cogent RegTech Engine',
        author: 'System / Compliance Officer',
      },
    ];

    const instrumentPayload = {
      id: instrumentId,
      organization_id: organizationId || null,
      body_id: bodyId || null,
      title,
      short_name: shortName,
      instrument_type: extracted.instrumentType as any,
      overview: extracted.overview,
      scope: extracted.scope,
      key_requirement_areas: extracted.keyRequirementAreas,
      domain: extracted.domain,
      jurisdiction: 'NG',
      classification: 'SUBSIDIARY_REGULATION',
      is_binding: true,
      owner,
      captured_text: capturedText,
      source_url: sourceUrl || sourceFileUrl || null,
      publication_date: extracted.publicationDate || nowIso.slice(0, 10),
      entry_into_force_date: extracted.entryIntoForceDate || nowIso.slice(0, 10),
      audit_logs: initialAuditLogs,
      created_at: nowIso,
    };

    const { error: instErr } = await (db.from('regulatory_instruments') as any).upsert(instrumentPayload);
    if (instErr) {
      logger.error({ error: instErr.message }, 'Failed inserting regulatory_instruments record');
    }

    // 3. Insert regulatory_document_versions
    const referenceCode = `${regulatorCode}/${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    await (db.from('regulatory_document_versions') as any).insert({
      id: versionId,
      instrument_id: instrumentId,
      version_number: '1.0',
      reference_code: referenceCode,
      publication_date: extracted.publicationDate || nowIso.slice(0, 10),
      effective_date: extracted.entryIntoForceDate || nowIso.slice(0, 10),
      canonical_source_url: sourceUrl || sourceFileUrl || null,
      source_file_url: sourceFileUrl || sourceUrl || null,
      source_file_hash: sourceFileHash || crypto.createHash('sha256').update(capturedText).digest('hex'),
      verification_status: 'VERIFIED',
      is_active: true,
      created_at: nowIso,
    });

    // 4. Insert Sections (regulatory_clauses)
    const sectionMap = new Map<string, string>(); // sectionNumber -> clauseId

    for (let idx = 0; idx < extracted.sections.length; idx++) {
      const sec = extracted.sections[idx];
      const clauseId = crypto.randomUUID();
      sectionMap.set(sec.sectionNumber, clauseId);

      await (db.from('regulatory_clauses') as any).insert({
        id: clauseId,
        document_version_id: versionId,
        section_reference: sec.sectionNumber,
        section_heading: sec.sectionTitle,
        clause_text: sec.content,
        page_number: idx + 1,
        paragraph_reference: sec.sectionNumber,
        order_index: idx + 1,
        created_at: nowIso,
      });
    }

    // 5. Insert Obligations & Criteria
    let insertedOblCount = 0;
    const defaultClauseId = sectionMap.values().next().value || crypto.randomUUID();

    for (const obl of extracted.obligations) {
      const oblId = crypto.randomUUID();
      const targetClauseId = sectionMap.get(obl.sectionNumber) || defaultClauseId;

      await (db.from('regulatory_obligations') as any).insert({
        id: oblId,
        clause_id: targetClauseId,
        code: obl.code || `OBL-${regulatorCode}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
        title: obl.title,
        description: obl.description,
        summary: obl.description,
        rule_type: obl.obligationType,
        policy_applicability: obl.policyApplicability,
        verbatim_quote: obl.verbatimQuote,
        section_or_page_ref: obl.sectionOrPageRef,
        assessment_criteria: obl.assessmentCriteria,
        risk_description: obl.riskDescription,
        status: 'Pending Review',
        is_relevant: true,
        is_starred: false,
        created_at: nowIso,
      });

      // Insert relational criteria into obligation_assessment_criteria
      if (obl.assessmentCriteria && obl.assessmentCriteria.length > 0) {
        for (let cIdx = 0; cIdx < obl.assessmentCriteria.length; cIdx++) {
          const crit = obl.assessmentCriteria[cIdx];
          await ((db as any).from('obligation_assessment_criteria')).insert({
            id: crypto.randomUUID(),
            obligation_id: oblId,
            criterion_type: crit.type,
            criterion_text: crit.text,
            evidence_required: crit.evidenceRequired || 'Internal policy document or audit inspection record',
            order_index: cIdx + 1,
            created_at: nowIso,
          });
        }
      }

      insertedOblCount++;
    }

    return {
      instrumentId,
      versionId,
      sectionsCount: extracted.sections.length,
      obligationsCount: insertedOblCount,
    };
  }
}
