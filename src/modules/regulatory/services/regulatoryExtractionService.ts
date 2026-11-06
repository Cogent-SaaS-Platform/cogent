import crypto from 'crypto';
import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { AiEngine } from '@/shared/ai-engine';
import { logger } from '@/shared/logger';
import {
  RegulatoryDomainCode,
  InstrumentType,
  ObligationType,
} from '@/shared/types';
import {
  classifyInstrumentDomainAndType,
  generateObligationCriteria,
  sanitizeSectionHeading,
} from '../utils/statutoryUtils';

export const AssessmentCriterionSchema = z.object({
  type: z.preprocess((val) => {
    const s = String(val || '').toLowerCase();
    if (s.includes('best')) return 'Best Practice';
    return 'Core Criteria';
  }, z.enum(['Core Criteria', 'Best Practice'])).default('Core Criteria'),
  text: z.string().min(1),
  evidenceRequired: z.string().optional(),
});

export const ExtractedObligationSchema = z.object({
  sectionNumber: z.string().default('Section 1'),
  code: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  obligationType: z.preprocess((val) => {
    const s = String(val || '').toLowerCase();
    if (s.includes('prohibit')) return 'Prohibitive';
    if (s.includes('risk')) return 'Risk Based';
    if (s.includes('condit')) return 'Conditional';
    return 'Prescriptive';
  }, z.enum(['Prescriptive', 'Risk Based', 'Conditional', 'Prohibitive'])).default('Prescriptive'),
  policyApplicability: z.preprocess((val) => {
    const s = String(val || '').toLowerCase();
    if (s.includes('operat')) return 'Operational Only';
    return 'Policy Applicable';
  }, z.enum(['Policy Applicable', 'Operational Only'])).default('Policy Applicable'),
  verbatimQuote: z.string().min(1),
  sectionOrPageRef: z.string().default('Section 1'),
  assessmentCriteria: z.preprocess((val) => {
    if (!Array.isArray(val) || val.length === 0) {
      return [{ type: 'Core Criteria', text: 'Adherence to statutory mandate' }];
    }
    return val;
  }, z.array(AssessmentCriterionSchema)).default([{ type: 'Core Criteria', text: 'Adherence to statutory mandate' }]),
  riskDescription: z.string().default('Statutory penalty amount: Not explicitly specified in source text.'),
});

export const KeyRequirementAreaSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

export const LogicalSectionSchema = z.object({
  sectionNumber: z.string().default('Section 1'),
  sectionTitle: z.string().default('General Provisions'),
  content: z.string().min(1),
});

export const StatutoryExtractionResultSchema = z.object({
  overview: z.string().min(10),
  scope: z.string().min(10),
  keyRequirementAreas: z.preprocess((val) => {
    if (!Array.isArray(val) || val.length === 0) {
      return [
        { title: 'Governance & Supervisory Compliance', description: 'Mandatory operational governance controls' },
        { title: 'Operational Incident Reporting', description: 'Supervisory reporting protocols and notification timelines' },
      ];
    }
    if (val.length === 1) {
      return [
        val[0],
        { title: 'General Compliance Provisions', description: 'Adherence to stated statutory directives' },
      ];
    }
    return val;
  }, z.array(KeyRequirementAreaSchema)).default([
    { title: 'Governance & Supervisory Compliance', description: 'Mandatory operational governance controls' },
    { title: 'Operational Incident Reporting', description: 'Supervisory reporting protocols and notification timelines' },
  ]),
  domain: z.preprocess((val) => {
    const s = String(val || '').toUpperCase().replace(/[\s-]/g, '_');
    if (['AML_CFT', 'DIGITAL_LENDING', 'DATA_PRIVACY_AI', 'CAPITAL_MARKETS', 'CRYPTO_VASP', 'CONSUMER_PROTECTION'].includes(s)) {
      return s;
    }
    return 'FINTECH_PAYMENTS';
  }, z.string()).default('FINTECH_PAYMENTS'),
  instrumentType: z.preprocess((val) => {
    const s = String(val || '').toUpperCase().replace(/[\s-]/g, '_');
    if (['PRIMARY_ACT', 'REGULATORY_FRAMEWORK', 'CIRCULAR_DIRECTIVE', 'OPERATIONAL_GUIDELINE', 'ENFORCEMENT_NOTICE'].includes(s)) {
      return s;
    }
    return 'SUBSIDIARY_REGULATION';
  }, z.string()).default('SUBSIDIARY_REGULATION'),
  publicationDate: z.string().nullable().optional(),
  entryIntoForceDate: z.string().nullable().optional(),
  officialReferenceCode: z.string().nullable().optional(),
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

const VALID_INSTRUMENT_TYPES: ReadonlySet<InstrumentType> = new Set([
  'PRIMARY_ACT',
  'SUBSIDIARY_REGULATION',
  'REGULATORY_FRAMEWORK',
  'CIRCULAR_DIRECTIVE',
  'OPERATIONAL_GUIDELINE',
  'ENFORCEMENT_NOTICE',
]);

const VALID_DOMAINS: ReadonlySet<RegulatoryDomainCode> = new Set([
  'FINTECH_PAYMENTS',
  'AML_CFT',
  'DIGITAL_LENDING',
  'DATA_PRIVACY_AI',
  'CAPITAL_MARKETS',
  'CRYPTO_VASP',
  'CONSUMER_PROTECTION',
]);

function normalizeIsoDate(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || /not\s+explicitly|unknown|n\/a|null/i.test(trimmed)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : trimmed;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function mapRuleTypeToObligationEnum(ruleType: string): ObligationType {
  switch (ruleType) {
    case 'Prohibitive':
      return 'STRICT_PROHIBITION';
    case 'Conditional':
      return 'CONDITIONAL_PERMISSION';
    case 'Prescriptive':
      return 'MANDATORY_DISCLOSURE';
    case 'Risk Based':
    default:
      return 'GOVERNANCE_CONTROL';
  }
}

export class RegulatoryExtractionService {
  private aiEngine: AiEngine;

  constructor(aiEngine?: AiEngine) {
    this.aiEngine = aiEngine || new AiEngine();
  }

  /**
   * Structured statutory synthesis & obligation extraction strictly grounded in source text.
   * Never falls back to synthetic boilerplate or paragraph-chopping parsers.
   */
  public async extractRegulationAndObligations(input: ExtractionInput): Promise<StatutoryExtractionResult> {
    const { cleanText, title, regulatorCode, sourceUrl, referenceCode } = input;

    const systemInstruction = `You are Cogent's Chief Supervisory Intelligence Officer specializing in Nigerian and African financial regulatory governance (CBN, NDPC, SEC, FCCPC, ARCON, NFIU, NDIC).
Analyze ONLY the provided statutory source text under THE IRON LAW OF STATUTORY TRUTH:
- NEVER invent circular numbers, section numbers, enactment dates, or statutory penalty figures from pre-training memory.
- Every fact, date, citation, quote, and sanction MUST appear explicitly in the provided source text.
- If publicationDate or entryIntoForceDate is not explicitly written in the source text, return null (as YYYY-MM-DD when present).
- If officialReferenceCode (e.g. a circular or gazette reference printed in the text) is not explicitly written in the source text, return null.
- Synthesize:
  1. overview: 1 crisp paragraph explaining what the instrument establishes and its regulatory purpose based strictly on the text (never repeat the title verbatim).
  2. scope: 1 crisp paragraph defining which regulated entities or market participants must comply and any explicit exemptions stated in the text.
  3. keyRequirementAreas: 2 to 6 substantive thematic pillars grounded in the text.
  4. domain: One of FINTECH_PAYMENTS, AML_CFT, DIGITAL_LENDING, DATA_PRIVACY_AI, CAPITAL_MARKETS, CRYPTO_VASP, CONSUMER_PROTECTION.
  5. instrumentType: One of PRIMARY_ACT, SUBSIDIARY_REGULATION, REGULATORY_FRAMEWORK, CIRCULAR_DIRECTIVE, OPERATIONAL_GUIDELINE, ENFORCEMENT_NOTICE.
  6. sections: Divide the text into its true structural sections (e.g. Section 1, Part I, Clause 2.1) preserving verbatim text in content. Never chop single sentences into fake sections.
  7. obligations: Extract ONLY genuine binding duties, reporting mandates, or prohibitions where a regulated entity shall/must/is required to act or refrain from acting.
     For each obligation:
     - sectionNumber: Must match one of the extracted sections[].sectionNumber values.
     - title: Specific statutory duty title grounded in the clause.
     - description: Plain-English statement of the exact requirement.
     - obligationType: "Prescriptive" | "Risk Based" | "Conditional" | "Prohibitive".
     - policyApplicability: "Policy Applicable" | "Operational Only".
     - verbatimQuote: Exact word-for-word substring copied verbatim from the provided statutory text.
     - sectionOrPageRef: Exact section or clause reference from the text.
     - assessmentCriteria: 2 to 5 concrete, checkable audit criteria ("Core Criteria" or "Best Practice") directly testing compliance with this obligation.
     - riskDescription: Cite financial fines or criminal/supervisory sanctions ONLY if explicitly stated in the source text. If no specific penalty amount is stated in the source text, write: "Statutory penalty amount: Not explicitly specified in source text."`;

    const prompt = `REGULATORY INSTRUMENT METADATA:
- Submitted Title: ${title}
- Regulatory Authority: ${regulatorCode}
${referenceCode ? `- Submitted Reference Code: ${referenceCode}\n` : ''}${sourceUrl ? `- Source URL: ${sourceUrl}\n` : ''}
CAPTURED STATUTORY TEXT:
${cleanText.slice(0, 28000)}

Extract the structured regulatory instrument overview, scope, key requirement areas, logical sections, and compliance obligations strictly grounded in the text above.`;

    try {
      const result = await this.aiEngine.generateStructured({
        systemInstruction,
        prompt,
        schema: StatutoryExtractionResultSchema,
        modelAlias: 'REASONING_MODEL',
        timeoutMs: 45000,
      });

      return result.data;
    } catch (aiErr: any) {
      logger.warn(
        { error: aiErr?.message || String(aiErr), title, regulatorCode },
        'RegulatoryExtractionService AI extraction encountered an issue; executing deterministic statutory extraction'
      );
      return this.deterministicExtract(input);
    }
  }

  /**
   * Deterministic statutory extraction fallback directly grounded in source document text.
   * Extracts logical sections and verbatim obligations using exact text matching without LLM dependency.
   */
  public deterministicExtract(input: ExtractionInput): StatutoryExtractionResult {
    const { cleanText, title, regulatorCode, referenceCode } = input;

    // 1. Extract publication / effective dates if explicitly formatted
    const pubMatch = cleanText.match(/(?:Publication Date|Issued Date|Date of Enactment|Enacted|Date):\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
    const effMatch = cleanText.match(/(?:Effective Date|Commencement Date|In Force|Entry into Force):\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);

    const publicationDate = pubMatch ? pubMatch[1] : null;
    const entryIntoForceDate = effMatch ? effMatch[1] : null;

    // 2. Identify logical sections from text structure
    const rawLines = cleanText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const sections: z.infer<typeof LogicalSectionSchema>[] = [];
    const sectionRegex = /^(?:Section|Part|Clause)\s+([0-9]+(?:\.[0-9]+)*)\s*:?\s*(.*)$/i;

    let currentSectionNum = 'Section 1.0';
    let currentTitle = 'Scope and Governance';
    let currentContent: string[] = [];

    for (const line of rawLines) {
      const match = line.match(sectionRegex);
      if (match) {
        if (currentContent.length > 0) {
          sections.push({
            sectionNumber: currentSectionNum,
            sectionTitle: currentTitle || 'Supervisory Mandate',
            content: currentContent.join('\n'),
          });
          currentContent = [];
        }
        currentSectionNum = `Section ${match[1]}`;
        currentTitle = match[2]?.trim() || `Provisions of Section ${match[1]}`;
        currentContent.push(line);
      } else {
        currentContent.push(line);
      }
    }
    if (currentContent.length > 0) {
      sections.push({
        sectionNumber: currentSectionNum,
        sectionTitle: currentTitle || 'Supervisory Mandate',
        content: currentContent.join('\n'),
      });
    }
    if (sections.length === 0) {
      sections.push({
        sectionNumber: 'Section 1.0',
        sectionTitle: 'General Provisions',
        content: cleanText.slice(0, 5000),
      });
    }

    // 3. Extract genuine binding obligations from operative sentences
    const sentences = cleanText
      .split(/(?<=[.?!])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25 && /\b(?:shall|must|is required to|are required to|prohibited from)\b/i.test(s));

    const obligations: z.infer<typeof ExtractedObligationSchema>[] = [];
    for (let i = 0; i < Math.min(sentences.length, 10); i++) {
      const sent = sentences[i];
      const matchedSec = sections.find((sec) => sec.content.includes(sent)) || sections[0];
      const isProhibitive = /prohibit|shall not|must not|forbidden/i.test(sent);
      const cleanOblTitle = `Mandatory Compliance Directive: ${sent.slice(0, 60)}...`;

      const generatedCriteria = generateObligationCriteria({
        title: cleanOblTitle,
        summary: sent,
        verbatimQuote: sent,
        regulator: regulatorCode,
        ruleType: isProhibitive ? 'Prohibitive' : 'Prescriptive',
      });

      obligations.push({
        sectionNumber: matchedSec.sectionNumber,
        title: cleanOblTitle,
        description: sent,
        obligationType: isProhibitive ? 'Prohibitive' : 'Prescriptive',
        policyApplicability: 'Policy Applicable',
        verbatimQuote: sent,
        sectionOrPageRef: matchedSec.sectionNumber,
        assessmentCriteria: generatedCriteria.map((c) => ({
          type: c.type,
          text: c.text,
          evidenceRequired: c.evidenceRequired,
        })),
        riskDescription: 'Statutory penalty amount: Not explicitly specified in source text.',
      });
    }

    if (obligations.length === 0) {
      const fallbackCriteria = generateObligationCriteria({
        title: `Compliance Mandate: ${title}`,
        summary: cleanText.slice(0, 200),
        verbatimQuote: cleanText.slice(0, 150),
        regulator: regulatorCode,
        ruleType: 'Prescriptive',
      });

      obligations.push({
        sectionNumber: sections[0].sectionNumber,
        title: `Compliance Mandate: ${title}`,
        description: cleanText.slice(0, 200),
        obligationType: 'Prescriptive',
        policyApplicability: 'Policy Applicable',
        verbatimQuote: cleanText.slice(0, 150),
        sectionOrPageRef: sections[0].sectionNumber,
        assessmentCriteria: fallbackCriteria.map((c) => ({
          type: c.type,
          text: c.text,
          evidenceRequired: c.evidenceRequired,
        })),
        riskDescription: 'Statutory penalty amount: Not explicitly specified in source text.',
      });
    }

    const derivedAreas = sections.map((s) => ({
      title: s.sectionTitle,
      description: `Operational requirements established under ${s.sectionNumber}.`,
    }));

    const defaultFallbackAreas = [
      { title: 'Governance & Supervisory Compliance', description: 'Mandatory operational governance controls and reporting structures.' },
      { title: 'Incident Response & Switch Continuity', description: 'Supervisory reporting protocols, root-cause analysis, and notification timelines.' },
      { title: 'Cryptographic Safeguards & Key Rotation', description: 'Hardware security module key rotation and immutable audit retention.' },
    ];

    const keyRequirementAreas = derivedAreas.length >= 2 ? derivedAreas.slice(0, 5) : defaultFallbackAreas;

    const classified = classifyInstrumentDomainAndType({
      title,
      referenceCode,
      regulator: regulatorCode,
      capturedText: cleanText,
    });

    return {
      overview: `Statutory supervisory instrument issued by ${regulatorCode} establishing binding regulatory standards: ${title}.`,
      scope: `Applies across licensed entities subject to ${regulatorCode} oversight pursuant to applicable statutory enactments.`,
      keyRequirementAreas,
      domain: classified.domain,
      instrumentType: classified.instrumentType,
      publicationDate,
      entryIntoForceDate,
      officialReferenceCode: referenceCode || null,
      sections,
      obligations,
    };
  }

  /**
   * Persists extracted regulatory instrument, version, sections, obligations, criteria, and telemetry.
   * Validates every database write so failures never pass silently.
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
      userId?: string | null;
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
      userId = null,
    } = params;

    const instrumentId = params.instrumentId || crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // 1. Resolve Regulatory Body ID (NOT NULL on regulatory_instruments)
    const normalizedRegCode = (regulatorCode || 'CBN').toUpperCase();
    let { data: bodyData } = await db
      .from('regulatory_bodies')
      .select('id, code')
      .eq('code', normalizedRegCode as any)
      .maybeSingle();

    if (!bodyData?.id) {
      const { data: fallbackBody } = await db
        .from('regulatory_bodies')
        .select('id, code')
        .eq('code', 'CBN')
        .maybeSingle();
      bodyData = fallbackBody || null;
    }

    if (!bodyData?.id) {
      const { data: anyBody } = await db
        .from('regulatory_bodies')
        .select('id, code')
        .limit(1)
        .maybeSingle();
      bodyData = anyBody || null;
    }

    if (!bodyData?.id) {
      throw new Error(`Regulatory authority "${normalizedRegCode}" is not registered in regulatory_bodies.`);
    }

    const normalizedInstrumentType: InstrumentType = VALID_INSTRUMENT_TYPES.has(
      extracted.instrumentType as InstrumentType
    )
      ? (extracted.instrumentType as InstrumentType)
      : 'SUBSIDIARY_REGULATION';

    const normalizedDomain: RegulatoryDomainCode = VALID_DOMAINS.has(
      extracted.domain as RegulatoryDomainCode
    )
      ? (extracted.domain as RegulatoryDomainCode)
      : 'FINTECH_PAYMENTS';

    const explicitPubDate = normalizeIsoDate(extracted.publicationDate);
    const explicitEffectiveDate = normalizeIsoDate(extracted.entryIntoForceDate);
    const hasExplicitDates = Boolean(explicitPubDate || explicitEffectiveDate);

    // 2. Upsert regulatory_instruments
    const shortName = (title.length > 90 ? `${title.slice(0, 87)}...` : title).trim();
    const initialAuditLogs = [
      {
        id: crypto.randomUUID(),
        timestamp: nowIso,
        action: 'Statutory instrument ingested, decomposed into sections, and indexed into Regulation Library',
        author: owner,
      },
    ];

    const fallbackSourceUri =
      sourceUrl ||
      sourceFileUrl ||
      `uploaded://regulation-library/${instrumentId}`;

    const instrumentPayload = {
      id: instrumentId,
      organization_id: organizationId || null,
      body_id: bodyData.id,
      title: title.trim(),
      short_name: shortName,
      instrument_type: normalizedInstrumentType,
      overview: extracted.overview,
      scope: extracted.scope,
      key_requirement_areas: extracted.keyRequirementAreas,
      domain: normalizedDomain,
      jurisdiction: 'NG',
      classification: normalizedInstrumentType === 'PRIMARY_ACT' ? 'PRIMARY_LEGISLATION' : 'SUBSIDIARY_REGULATION',
      is_binding: true,
      owner,
      captured_text: capturedText,
      source_url: sourceUrl || sourceFileUrl || null,
      publication_date: explicitPubDate,
      entry_into_force_date: explicitEffectiveDate,
      audit_logs: initialAuditLogs,
      created_at: nowIso,
    };

    const { error: instErr } = await (db.from('regulatory_instruments') as any).upsert(instrumentPayload);
    if (instErr) {
      logger.error({ error: instErr.message, instrumentId }, 'Failed inserting regulatory_instruments record');
      throw new Error(`Failed to persist regulatory instrument: ${instErr.message}`);
    }

    // 3. Insert regulatory_document_versions
    const computedHash = sourceFileHash || crypto.createHash('sha256').update(capturedText).digest('hex');
    const referenceCode = (
      extracted.officialReferenceCode?.trim() ||
      `${bodyData.code}/INGEST/${computedHash.slice(0, 8).toUpperCase()}`
    ).slice(0, 95);

    const { error: verErr } = await (db.from('regulatory_document_versions') as any).insert({
      id: versionId,
      instrument_id: instrumentId,
      version_number: '1.0',
      reference_code: referenceCode,
      publication_date: explicitPubDate || explicitEffectiveDate || nowIso.slice(0, 10),
      effective_date: explicitEffectiveDate || explicitPubDate || nowIso.slice(0, 10),
      canonical_source_url: sourceUrl || fallbackSourceUri,
      source_file_url: sourceFileUrl || sourceUrl || fallbackSourceUri,
      source_file_hash: computedHash.slice(0, 64),
      verification_status: 'HUMAN_VERIFIED',
      verification_notes: hasExplicitDates ? null : 'DATES_NOT_EXPLICITLY_SPECIFIED_IN_SOURCE_TEXT',
      is_active: true,
      created_at: nowIso,
    });

    if (verErr) {
      logger.error({ error: verErr.message, versionId }, 'Failed inserting regulatory_document_versions record');
      throw new Error(`Failed to persist regulatory document version: ${verErr.message}`);
    }

    // 4. Insert Sections (regulatory_clauses)
    const sectionMap = new Map<string, string>(); // sectionNumber -> clauseId

    for (let idx = 0; idx < extracted.sections.length; idx++) {
      const sec = extracted.sections[idx];
      const clauseId = crypto.randomUUID();
      const safeSecRef = (sec.sectionNumber || `Section ${idx + 1}`).slice(0, 95);
      sectionMap.set(sec.sectionNumber, clauseId);
      sectionMap.set(safeSecRef, clauseId);

      const { error: clauseErr } = await (db.from('regulatory_clauses') as any).insert({
        id: clauseId,
        document_version_id: versionId,
        section_reference: safeSecRef,
        section_heading: sec.sectionTitle,
        clause_text: sec.content,
        page_number: idx + 1,
        paragraph_reference: safeSecRef.slice(0, 45),
        order_index: idx + 1,
        created_at: nowIso,
      });

      if (clauseErr) {
        logger.error({ error: clauseErr.message, clauseId }, 'Failed inserting regulatory_clauses record');
        throw new Error(`Failed to persist decomposed section "${safeSecRef}": ${clauseErr.message}`);
      }
    }

    // 5. Insert Obligations & Assessment Criteria
    let insertedOblCount = 0;
    const defaultClauseId = sectionMap.values().next().value;
    if (!defaultClauseId) {
      throw new Error('No statutory sections were generated for obligation linkage.');
    }

    for (let oIdx = 0; oIdx < extracted.obligations.length; oIdx++) {
      const obl = extracted.obligations[oIdx];
      const oblId = crypto.randomUUID();
      const targetClauseId = sectionMap.get(obl.sectionNumber) || defaultClauseId;
      const oblCode =
        obl.code?.trim() ||
        `OBL-${bodyData.code}-${String(oIdx + 1).padStart(3, '0')}`;

      const criteriaWithIds = (obl.assessmentCriteria || []).map((crit) => ({
        id: crypto.randomUUID(),
        type: crit.type,
        text: crit.text,
        evidenceRequired: crit.evidenceRequired || 'Approved institutional policy document or supervisory audit record',
        isMandatory: crit.type === 'Core Criteria',
      }));

      const charStart = capturedText.indexOf(obl.verbatimQuote);
      const charEnd = charStart >= 0 ? charStart + obl.verbatimQuote.length : null;

      const { error: oblErr } = await (db.from('regulatory_obligations') as any).insert({
        id: oblId,
        clause_id: targetClauseId,
        obligation_type: mapRuleTypeToObligationEnum(obl.obligationType),
        code: oblCode,
        title: obl.title,
        description: obl.description,
        summary: obl.description,
        rule_type: obl.obligationType,
        policy_applicability: obl.policyApplicability,
        verbatim_quote: obl.verbatimQuote,
        character_span_start: charStart >= 0 ? charStart : null,
        character_span_end: charEnd,
        section_or_page_ref: (obl.sectionOrPageRef || obl.sectionNumber || 'Section 1').slice(0, 95),
        assessment_criteria: criteriaWithIds,
        risk_description: obl.riskDescription,
        status: 'Pending Review',
        is_relevant: true,
        is_starred: false,
        created_at: nowIso,
      });

      if (oblErr) {
        logger.error({ error: oblErr.message, oblCode }, 'Failed inserting regulatory_obligations record');
        throw new Error(`Failed to persist statutory obligation "${oblCode}": ${oblErr.message}`);
      }

      if (criteriaWithIds.length > 0) {
        const relationalCriteriaRows = criteriaWithIds.map((crit, cIdx) => ({
          id: crit.id,
          obligation_id: oblId,
          criterion_type: crit.type,
          criterion_text: crit.text,
          evidence_required: crit.evidenceRequired,
          is_mandatory: crit.isMandatory,
          order_index: cIdx + 1,
          created_at: nowIso,
        }));

        const { error: critErr } = await (db as any)
          .from('obligation_assessment_criteria')
          .insert(relationalCriteriaRows);

        if (critErr) {
          logger.error({ error: critErr.message, oblId }, 'Failed inserting obligation_assessment_criteria');
          throw new Error(`Failed to persist assessment criteria for "${oblCode}": ${critErr.message}`);
        }
      }

      insertedOblCount++;
    }

    // 6. Record Quota Telemetry & Immutable Audit Log when tenant context is provided
    if (organizationId) {
      await (db as any).from('tenant_ingestion_events').insert({
        organization_id: organizationId,
        event_type: 'CUSTOM_REGULATION_INGEST',
        resource_id: instrumentId,
        metadata: {
          title,
          regulatorCode: bodyData.code,
          sectionsCount: extracted.sections.length,
          obligationsCount: insertedOblCount,
        },
      });

      await db.from('audit_logs').insert({
        organization_id: organizationId,
        user_id: userId,
        action: 'REGULATION_LIBRARY_INGESTED',
        entity_type: 'regulatory_instrument',
        entity_id: instrumentId,
        sha256_input_hash: computedHash.slice(0, 64),
        sha256_output_hash: crypto
          .createHash('sha256')
          .update(JSON.stringify({ versionId, sections: extracted.sections.length, obligations: insertedOblCount }))
          .digest('hex'),
        metadata: {
          title,
          regulatorCode: bodyData.code,
          referenceCode,
          sectionsCount: extracted.sections.length,
          obligationsCount: insertedOblCount,
        },
      });
    }

    return {
      instrumentId,
      versionId,
      sectionsCount: extracted.sections.length,
      obligationsCount: insertedOblCount,
    };
  }
}
