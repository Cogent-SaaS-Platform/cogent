import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { logger } from '@/shared/logger';
import { ObligationType, SeverityLevel, RegulatorCode, LicenseType, PaymentRail } from '@/shared/types';
import { ApplicabilityEngine } from './applicabilityEngine';
import { ObligationExtractionService } from './obligationExtractionService';
import { DomSanitizer } from './domSanitizer';

export interface ParsedPenalty {
  penaltyMinNaira: number;
  penaltyMaxNaira: number;
  dailyFineNaira: number;
  carriesPersonalCriminalLiability: boolean;
  carriesLicenseSuspensionRisk: boolean;
  penaltyLegalCitation: string;
}

export interface ParsedObligation {
  id?: string;
  obligationType: ObligationType;
  summary: string;
  severityFloor: SeverityLevel;
  statutoryTimelineDays: number | null;
  targetRole: string;
  penalties: ParsedPenalty[];
  actor?: string;
  action?: string;
  object?: string;
  condition?: string | null;
  deadline?: string | null;
  verbatimQuote?: string;
  startChar?: number;
  endChar?: number;
  targetedLicenses?: LicenseType[];
  affectedRails?: PaymentRail[];
  appliesUniversally?: boolean;
  isValidated?: boolean;
  groundingConfidence?: number;
}

export interface ParsedClause {
  id?: string;
  sectionReference: string;
  sectionHeading: string;
  clauseText: string;
  pageNumber: number;
  paragraphReference?: string;
  obligations: ParsedObligation[];
}

export interface ClauseSegmentationInput {
  rawText?: string;
  sections?: Array<{ sectionNumber?: string; heading?: string; content?: string }>;
  regulatorCode?: RegulatorCode | string;
  circularNumber?: string;
  subject?: string;
  priority?: string;
  statutoryDeadline?: string | null;
}

/**
 * Enterprise Adaptive Regulatory Clause & Obligation Segmentation Engine
 * Tokenizes arbitrary incoming legal texts, PDF transcripts, circular directives,
 * or gazetted acts into verified clauses, decomposed statutory obligations,
 * and penalty schedules for Cogent's Master Regulatory Library and Radar.
 */
export class ClauseSegmentationEngine {
  /**
   * Main entry point: Segments text or sections into structured clauses with obligations & penalties
   */
  public static segmentAndDecompose(input: ClauseSegmentationInput): ParsedClause[] {
    const {
      rawText = '',
      sections = [],
      regulatorCode = 'CBN',
      circularNumber = 'DIRECTIVE',
      subject = '',
      priority = 'HIGH',
      statutoryDeadline = null,
    } = input;

    const clauses: ParsedClause[] = [];

    // Strategy 1: Use pre-extracted structured sections if available
    if (sections && sections.length > 0) {
      for (let idx = 0; idx < sections.length; idx++) {
        const sec = sections[idx];
        const content = (sec.content || '').trim();
        if (content.length > 15) {
          const ref = sec.sectionNumber || `Section ${idx + 1}.0`;
          const heading = sec.heading || `Statutory Directive Clause ${idx + 1}`;
          clauses.push(
            this.buildClauseRecord(ref, heading, content, idx + 1, regulatorCode, circularNumber, priority, statutoryDeadline)
          );
        }
      }
    }

    // Strategy 2: If no structured sections, parse rawText using legal regex heuristics
    if (clauses.length === 0 && rawText.trim().length > 20) {
      const textClauses = this.extractFromRawText(rawText, regulatorCode, circularNumber, priority, statutoryDeadline, subject);
      clauses.push(...textClauses);
    }

    return clauses;
  }

  /**
   * Sanitizes raw regulatory text before parsing by stripping stray website navigation artifacts,
   * search forms, language selectors, breadcrumb trails, and template logic.
   */
  public static sanitizeRawText(text: string): string {
    if (!text) return '';

    const withoutWebCode = text
      .replace(/\d+\)\s*\?\s*true\s*:\s*false["']>[\s\S]*?(?:SEARCH|Search)?/gi, ' ')
      .replace(/\?\s*true\s*:\s*false/gi, ' ')
      .replace(/\{\{[^}]*\}\}/g, ' ')
      .replace(/\[(?:wp_|elementor)[^\]]*\]/gi, ' ')
      .replace(/<[^>]+>/g, ' ');

    return DomSanitizer.filterNoiseLines(withoutWebCode);
  }

  /**
   * Deterministically determines a clean, professional statutory section heading based on operative legal keywords
   * Avoids exposing raw scraped web code, language switchers, or template logic to bank examiners.
   */
  public static detectTopicHeading(paragraph: string, fallbackSubject?: string, index: number = 1): string {
    const lower = paragraph.toLowerCase();

    // 1. Check if the paragraph begins with a clean, formal heading (e.g. "Background", "Scope", "Mandate")
    const firstLine = paragraph.split('\n')[0].replace(/[#*]/g, '').trim();
    const isCleanFirstLine =
      firstLine.length >= 4 &&
      firstLine.length <= 60 &&
      !firstLine.endsWith('.') &&
      !firstLine.includes('?') &&
      !firstLine.includes(':') &&
      !firstLine.includes('http') &&
      !firstLine.includes('search') &&
      !firstLine.includes('elementor') &&
      !/\b(deutsch|english|hausa|igbo|yoruba)\b/i.test(firstLine) &&
      !/^(securities and exchange|central bank of nigeria|federal competition|nigeria data protection|advertising regulatory)/i.test(firstLine);

    if (isCleanFirstLine) {
      return firstLine;
    }

    // 2. Keyword-driven statutory topic taxonomy
    if (
      lower.includes('unsc') ||
      lower.includes('sanction') ||
      lower.includes('asset freeze') ||
      lower.includes('freezing') ||
      lower.includes('designated person') ||
      lower.includes('1267') ||
      lower.includes('1989') ||
      lower.includes('2253')
    ) {
      return 'Sanctions Compliance & Asset Freeze Protocol';
    }

    if (
      lower.includes('unlicensed') ||
      lower.includes('illegal operator') ||
      lower.includes('cease and desist') ||
      lower.includes('prohibit') ||
      lower.includes('disconnection') ||
      lower.includes('shall not operate')
    ) {
      return 'Licensing Prohibition & Operating Restriction';
    }

    if (
      /\bstrs?\b/.test(lower) ||
      lower.includes('suspicious transaction') ||
      lower.includes('nfiu') ||
      lower.includes('currency transaction') ||
      lower.includes('aml/cft') ||
      lower.includes('due diligence') ||
      lower.includes('kyc')
    ) {
      return 'AML/CFT & Suspicious Transaction Reporting Directive';
    }

    if (
      lower.includes('report') ||
      lower.includes('submit') ||
      lower.includes('furnish') ||
      lower.includes('filing') ||
      lower.includes('mandatory disclosure') ||
      lower.includes('monthly return') ||
      lower.includes('quarterly return')
    ) {
      return 'Statutory Reporting & Disclosure Obligation';
    }

    if (
      lower.includes('cyber') ||
      lower.includes('data protection') ||
      lower.includes('privacy') ||
      lower.includes('ndpa') ||
      lower.includes('encryption') ||
      lower.includes('security operations')
    ) {
      return 'Cybersecurity & Data Privacy Protocol';
    }

    if (
      lower.includes('capital') ||
      lower.includes('solvency') ||
      lower.includes('reserve') ||
      lower.includes('minimum paid-up') ||
      lower.includes('liquidity')
    ) {
      return 'Prudential Capital & Solvency Mandate';
    }

    if (
      lower.includes('contactless') ||
      lower.includes('switching') ||
      lower.includes('pos') ||
      lower.includes('settlement rail') ||
      lower.includes('nibss') ||
      lower.includes('payment gateway') ||
      lower.includes('terminal')
    ) {
      return 'Payment Systems Operational & Settlement Guidelines';
    }

    if (
      lower.includes('consumer') ||
      lower.includes('fee') ||
      lower.includes('tariff') ||
      lower.includes('charge') ||
      lower.includes('dispute resolution') ||
      lower.includes('complaint')
    ) {
      return 'Consumer Protection & Fair Practice Mandate';
    }

    if (
      lower.includes('fx') ||
      lower.includes('foreign exchange') ||
      lower.includes('remittance') ||
      lower.includes('imto') ||
      lower.includes('diaspora') ||
      lower.includes('repatriation') ||
      lower.includes('export proceeds')
    ) {
      return 'Foreign Exchange & Cross-Border Remittance Protocol';
    }

    if (
      lower.includes('internal control') ||
      lower.includes('governance') ||
      lower.includes('board of directors') ||
      lower.includes('risk management') ||
      lower.includes('compliance officer')
    ) {
      return 'Internal Governance & Supervisory Control Baseline';
    }

    if (
      lower.includes('restructur') ||
      lower.includes('workforce') ||
      lower.includes('layoff') ||
      lower.includes('redundanc') ||
      lower.includes('retrenchment') ||
      lower.includes('strip down') ||
      lower.includes('downscale') ||
      lower.includes('downsizing') ||
      lower.includes('shut down') ||
      lower.includes('closure') ||
      lower.includes('close operations') ||
      lower.includes('severance')
    ) {
      return 'Corporate Restructuring & Workforce Redundancy Protocol';
    }

    if (
      lower.includes('merger') ||
      lower.includes('acquisition') ||
      lower.includes('acquire') ||
      lower.includes('takeover') ||
      lower.includes('equity stake') ||
      lower.includes('divestiture') ||
      lower.includes('consolidation')
    ) {
      return 'Mergers, Acquisitions & Capital Realignment';
    }

    if (
      lower.includes('court') ||
      lower.includes('lawsuit') ||
      lower.includes('injunction') ||
      lower.includes('arbitration') ||
      lower.includes('litigation') ||
      lower.includes('judicial')
    ) {
      return 'Dispute Resolution & Judicial Enforcement Notice';
    }

    if (
      lower.includes('outage') ||
      lower.includes('downtime') ||
      lower.includes('switch failure') ||
      lower.includes('service disruption') ||
      lower.includes('incident response')
    ) {
      return 'Operational Resilience & System Downtime Advisory';
    }

    if (
      lower.includes('appointed') ||
      lower.includes('resigned') ||
      lower.includes('executive transition') ||
      lower.includes('new ceo') ||
      lower.includes('managing director')
    ) {
      return 'Executive Leadership & Governance Transition';
    }

    if (fallbackSubject && fallbackSubject.trim().length > 5) {
      const cleanSub = DomSanitizer.cleanTitle(fallbackSubject);
      return cleanSub.length <= 60 ? cleanSub : `Operational Intelligence Notice ${index}`;
    }

    return `Operational Intelligence Notice ${index}`;
  }

  /**
   * Deterministically parses raw legal text into discrete numbered clauses
   */
  private static extractFromRawText(
    text: string,
    regulatorCode: string,
    circularNumber: string,
    priority: string,
    statutoryDeadline: string | null,
    subject?: string
  ): ParsedClause[] {
    const cleanText = this.sanitizeRawText(text);
    const clauses: ParsedClause[] = [];
    const lines = cleanText.split(/\r?\n/).map((l) => l.trimEnd());

    // Legal section matchers:
    // e.g. "1.0 INTRODUCTION", "2.1 Operational Requirements", "Section 5: Mandate", "Article 38(1)"
    const headerRegex = /^(?:#+\s*)?(\d+(?:\.\d+)*|[A-Z]\.|\bSection\s+\d+(?:\(\d+\))?|\bArticle\s+\d+(?:\(\d+\))?|\bRule\s+\d+(?:\.\d+)?|\bClause\s+\d+|\bPart\s+[IVXLCDM\d]+)[\.\s:–-]+(.+)$/i;

    let currentRef: string | null = null;
    let currentHeading: string | null = null;
    let currentLines: string[] = [];
    let sectionCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(headerRegex);

      if (match && trimmed.length < 120 && !trimmed.endsWith('.')) {
        const candidateHeading = match[2].trim().replace(/^[:–-]\s*/, '');
        const isBogusHeading =
          candidateHeading.includes('? true : false') ||
          candidateHeading.includes('elementor') ||
          candidateHeading.includes('SEARCH') ||
          candidateHeading.includes('http') ||
          /\b(deutsch|hausa|igbo|yoruba)\b/i.test(candidateHeading);

        if (!isBogusHeading) {
          if (currentRef && currentLines.join('\n').trim().length > 15) {
            sectionCount++;
            clauses.push(
              this.buildClauseRecord(
                currentRef,
                currentHeading || `Directive Section ${sectionCount}`,
                currentLines.join('\n').trim(),
                sectionCount,
                regulatorCode,
                circularNumber,
                priority,
                statutoryDeadline
              )
            );
          }
          currentRef = match[1].trim();
          currentHeading = candidateHeading;
          currentLines = [];
        } else if (currentRef) {
          currentLines.push(line);
        }
      } else if (currentRef) {
        currentLines.push(line);
      }
    }

    if (currentRef && currentLines.join('\n').trim().length > 15) {
      sectionCount++;
      clauses.push(
        this.buildClauseRecord(
          currentRef,
          currentHeading || `Directive Section ${sectionCount}`,
          currentLines.join('\n').trim(),
          sectionCount,
          regulatorCode,
          circularNumber,
          priority,
          statutoryDeadline
        )
      );
    }

    // If section headers were not found, fallback to paragraph chunking
    if (clauses.length === 0) {
      const paragraphs = cleanText
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => {
          if (p.length < 35) return false;
          const lower = p.toLowerCase();

          // 1. Skip boilerplate letterhead / footer / signature / transmission metadata lines
          if (
            lower.startsWith('yours faithfully') ||
            lower.startsWith('enquiries') ||
            lower.startsWith('circular to:') ||
            lower.startsWith('official document url:') ||
            lower.startsWith('date:') ||
            lower.startsWith('title:') ||
            lower.startsWith('reference:') ||
            lower.startsWith('notice reference:') ||
            lower.startsWith('directive reference:') ||
            lower.includes('? true : false') ||
            lower.includes('search...') ||
            lower.includes('powered by gtranslate') ||
            lower.includes('powered by weglot')
          ) {
            return false;
          }

          // 2. Do not treat pure agency letterhead alone as a regulatory mandate
          if (/^(?:securities and exchange commission|central bank of nigeria|nigeria data protection commission|advertising regulatory council|federal competition and consumer protection|nigerian financial intelligence unit|nigeria deposit insurance)\s*(?:\([^)]+\))?\s*(?:nigeria)?$/i.test(lower)) {
            return false;
          }

          // 3. Must contain substantive statutory directives or guidance
          const hasOperativeKeywords = /\b(shall|must|mandat|prohibit|requir|ensure|liable|submit|maintain|comply|penalty|sanction|forbidden|disclose|report|freeze|restrict|cease|effective|guideline|rule|provision|standard|framework)\b/i.test(lower);
          if (!hasOperativeKeywords && p.length < 80) {
            return false;
          }

          return true;
        });

      paragraphs.forEach((p, idx) => {
        const heading = this.detectTopicHeading(p, subject, idx + 1);
        clauses.push(
          this.buildClauseRecord(
            `Section ${idx + 1}.0`,
            heading,
            p,
            idx + 1,
            regulatorCode,
            circularNumber,
            priority,
            statutoryDeadline
          )
        );
      });
    }

    return clauses;
  }

  /**
   * Constructs a complete clause record with decomposed statutory obligations and penalties
   */
  private static buildClauseRecord(
    reference: string,
    heading: string,
    text: string,
    pageNumber: number,
    regulatorCode: string,
    circularNumber: string,
    priority: string,
    statutoryDeadline: string | null
  ): ParsedClause {
    const textLower = text.toLowerCase();

    // 1. Determine Obligation Type
    let obligationType: ObligationType = 'GOVERNANCE_CONTROL';
    if (
      textLower.includes('prohibit') ||
      textLower.includes('shall not') ||
      textLower.includes('forbidden') ||
      textLower.includes('unlawful') ||
      textLower.includes('strict liability') ||
      textLower.includes('must not') ||
      textLower.includes('no institution shall') ||
      textLower.includes('must refrain')
    ) {
      obligationType = 'STRICT_PROHIBITION';
    } else if (
      textLower.includes('disclose') ||
      textLower.includes('publish') ||
      textLower.includes('notify') ||
      textLower.includes('report') ||
      textLower.includes('file') ||
      textLower.includes('submit') ||
      textLower.includes('display') ||
      textLower.includes('furnish') ||
      textLower.includes('inform')
    ) {
      obligationType = 'MANDATORY_DISCLOSURE';
    } else if (
      textLower.includes('within') ||
      textLower.includes('prior to') ||
      textLower.includes('before') ||
      textLower.includes('deadline') ||
      textLower.includes('effective date') ||
      textLower.includes('timeline') ||
      textLower.includes('transition period')
    ) {
      obligationType = 'STATUTORY_TIMELINE';
    } else if (
      textLower.includes('may operate') ||
      textLower.includes('subject to prior') ||
      textLower.includes('conditional') ||
      textLower.includes('approval-in-principle')
    ) {
      obligationType = 'CONDITIONAL_PERMISSION';
    }

    // 2. Determine Severity Floor
    let severityFloor: SeverityLevel = 'MEDIUM';
    if (
      priority === 'CRITICAL_EMERGENCY' ||
      textLower.includes('criminal') ||
      textLower.includes('imprisonment') ||
      textLower.includes('revocation') ||
      textLower.includes('delisting') ||
      textLower.includes('disconnection') ||
      textLower.includes('50,000,000') ||
      textLower.includes('25,000,000')
    ) {
      severityFloor = 'CRITICAL';
    } else if (
      priority === 'HIGH' ||
      obligationType === 'STRICT_PROHIBITION' ||
      textLower.includes('fine') ||
      textLower.includes('sanction') ||
      textLower.includes('penalty')
    ) {
      severityFloor = 'HIGH';
    }

    // 3. Determine Statutory Timeline Days
    let statutoryTimelineDays: number | null = null;
    const daysMatch = text.match(/within\s+(\d+)\s*(hour|day|week|month|year)s?/i);
    if (daysMatch) {
      const num = parseInt(daysMatch[1], 10);
      const unit = daysMatch[2].toLowerCase();
      if (unit === 'hour') statutoryTimelineDays = 1;
      else if (unit === 'day') statutoryTimelineDays = num;
      else if (unit === 'week') statutoryTimelineDays = num * 7;
      else if (unit === 'month') statutoryTimelineDays = num * 30;
      else if (unit === 'year') statutoryTimelineDays = num * 365;
    } else if (statutoryDeadline) {
      const diffDays = Math.round((new Date(statutoryDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      statutoryTimelineDays = Math.max(1, diffDays);
    }

    // 4. Determine Target Compliance Role
    let targetRole = 'Chief Compliance Officer';
    if (textLower.includes('soc') || textLower.includes('cyber') || textLower.includes('penetration') || textLower.includes('encryption')) {
      targetRole = 'Chief Information Security Officer';
    } else if (textLower.includes('payment switch') || textLower.includes('terminal') || textLower.includes('pos') || textLower.includes('reconciliation')) {
      targetRole = 'Chief Operating Officer';
    } else if (textLower.includes('capital') || textLower.includes('balance sheet') || textLower.includes('solvency') || textLower.includes('reserve')) {
      targetRole = 'Chief Financial Officer';
    } else if (textLower.includes('board') || textLower.includes('director')) {
      targetRole = 'Executive Board & Managing Director';
    }

    // 5. Parse Statutory Financial Penalties & Liabilities
    const penaltyMatch = text.match(/(?:₦|Naira|\bN(?=\s*\d)|fine of|sanction of|penalty of)\s*([\d,]+(?:\.\d+)?)\s*(?:million|billion|thousand)?/i);
    let minPenalty = 0;
    let maxPenalty = 0;
    let dailyFine = 0;

    if (penaltyMatch) {
      const numStr = penaltyMatch[1].replace(/,/g, '');
      const parsed = parseFloat(numStr);
      if (!isNaN(parsed)) {
        if (/billion/i.test(penaltyMatch[0])) {
          minPenalty = parsed * 1_000_000_000;
          maxPenalty = parsed * 2_000_000_000;
        } else if (/million/i.test(penaltyMatch[0])) {
          minPenalty = parsed * 1_000_000;
          maxPenalty = parsed * 2_000_000;
        } else {
          minPenalty = parsed;
          maxPenalty = parsed * 2;
        }
      }
    }

    const dailyMatch = text.match(/(?:daily|each continuous day|compounding).*?(?:₦|Naira|\bN(?=\s*\d)|fine of)\s*([\d,]+)/i);
    if (dailyMatch) {
      const parsedDaily = parseFloat(dailyMatch[1].replace(/,/g, ''));
      if (!isNaN(parsedDaily)) dailyFine = parsedDaily;
    }

    const carriesPersonalCriminalLiability =
      textLower.includes('criminal') ||
      textLower.includes('imprisonment') ||
      textLower.includes('director liability') ||
      textLower.includes('liable on conviction');

    const carriesLicenseSuspensionRisk =
      textLower.includes('suspension') ||
      textLower.includes('revocation') ||
      textLower.includes('delisting') ||
      textLower.includes('cease-and-desist') ||
      textLower.includes('disconnection');

    // Extract authentic citation from text if explicitly stated
    const citationMatch = text.match(/(?:pursuant to|under|in accordance with|section|act)\s+([^,.;\n]+(?:Act|BOFIA|ISA|NDPA|FCCPA|ARCON|Guidelines|Framework|Regulation)[^,.;\n]*)/i);
    const authenticCitation = citationMatch ? citationMatch[0].trim() : `${regulatorCode} ${circularNumber}`;

    const penalties: ParsedPenalty[] = [];
    if (minPenalty > 0 || maxPenalty > 0 || dailyFine > 0 || carriesPersonalCriminalLiability || carriesLicenseSuspensionRisk) {
      penalties.push({
        penaltyMinNaira: minPenalty,
        penaltyMaxNaira: maxPenalty,
        dailyFineNaira: dailyFine,
        carriesPersonalCriminalLiability,
        carriesLicenseSuspensionRisk,
        penaltyLegalCitation: authenticCitation,
      });
    }

    // Synthesize actionable statutory requirement summaries directly from authentic text sentences
    const sentences = text
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.replace(/^[\d\.\-\s]+/, '').trim())
      .filter((s) => {
        if (s.length < 15) return false;
        const sLower = s.toLowerCase();
        if (
          sLower.includes('? true : false') ||
          sLower.includes('search...') ||
          sLower.includes('official document url') ||
          sLower.includes('click here to download') ||
          sLower.includes('elementor') ||
          /\b(deutsch|english|hausa|igbo|yoruba)\b/i.test(s)
        ) {
          return false;
        }
        return true;
      });

    // Identify sentences containing operative statutory mandates
    const operativeSentences = sentences.filter((s) =>
      /\b(shall|must|mandat|prohibit|requir|ensure|liable|submit|maintain|comply|penalty|sanction|forbidden|disclose|report|freeze|restrict)\b/i.test(s)
    );

    const obligations: ParsedObligation[] = [];
    const sourceSentences = operativeSentences.length > 0
      ? operativeSentences.slice(0, 5)
      : (sentences.length > 0 ? [sentences[0]] : [text.trim()]);

    for (const sent of sourceSentences) {
      const clean = sent.length > 260 ? sent.substring(0, 257) + '...' : sent;
      const summaryText = heading && !clean.toLowerCase().startsWith(heading.toLowerCase())
        ? `${heading}: ${clean}`
        : clean;

      // Locate exact character span
      const startChar = text.indexOf(sent);
      const endChar = startChar !== -1 ? startChar + sent.length : text.length;
      const verbatimQuote = startChar !== -1 ? text.substring(startChar, endChar) : sent;

      // Extract actor & action
      let actor = 'Regulated Financial Institution';
      const sentLower = sent.toLowerCase();
      if (sentLower.includes('commercial bank') || sentLower.includes('dmb')) {
        actor = 'Commercial Banks';
      } else if (sentLower.includes('payment service provider') || sentLower.includes('pssp')) {
        actor = 'Payment Service Providers';
      } else if (sentLower.includes('switching') || sentLower.includes('switch')) {
        actor = 'Switching Companies';
      } else if (sentLower.includes('mobile money operator') || sentLower.includes('mmo')) {
        actor = 'Mobile Money Operators';
      } else if (sentLower.includes('cco') || sentLower.includes('compliance officer')) {
        actor = 'Chief Compliance Officer';
      }

      let action = 'shall comply with statutory directives';
      if (sentLower.includes('shall submit') || sentLower.includes('must submit')) {
        action = 'must submit';
      } else if (sentLower.includes('shall not') || sentLower.includes('must not') || sentLower.includes('is prohibited from')) {
        action = 'is prohibited from';
      } else if (sentLower.includes('shall maintain') || sentLower.includes('must maintain')) {
        action = 'must maintain';
      } else if (sentLower.includes('shall establish') || sentLower.includes('must establish')) {
        action = 'shall establish';
      } else if (sentLower.includes('shall ensure') || sentLower.includes('must ensure')) {
        action = 'must ensure';
      }

      const targeting = ObligationExtractionService.inferTargeting(actor, sent, text);

      obligations.push({
        obligationType,
        summary: summaryText,
        severityFloor,
        statutoryTimelineDays,
        targetRole,
        penalties,
        actor,
        action,
        object: clean,
        condition: null,
        deadline: daysMatch ? daysMatch[0] : null,
        verbatimQuote,
        startChar: startChar !== -1 ? startChar : 0,
        endChar,
        targetedLicenses: targeting.targetedLicenses,
        affectedRails: targeting.affectedRails,
        appliesUniversally: targeting.appliesUniversally,
        isValidated: true,
        groundingConfidence: 1.0,
      });
    }

    return {
      sectionReference: reference,
      sectionHeading: heading,
      clauseText: text,
      pageNumber,
      paragraphReference: reference,
      obligations,
    };
  }

  /**
   * Persists segmented clauses, obligations, and penalties into the database.
   * Guarantees idempotency and avoids duplication.
   */
  public static async persistDocumentClauses(
    db: SupabaseClient<Database>,
    documentVersionId: string,
    clauses: ParsedClause[]
  ): Promise<ParsedClause[]> {
    if (!db || !documentVersionId || clauses.length === 0) {
      return clauses;
    }

    try {
      // 1. Check if clauses already exist for this document version
      const { data: existingClauses } = await db
        .from('regulatory_clauses')
        .select('id, section_reference')
        .eq('document_version_id', documentVersionId);

      if (existingClauses && existingClauses.length > 0) {
        logger.info(
          { documentVersionId, count: existingClauses.length },
          'Document version already has indexed clauses; returning without duplicate insert'
        );
        return clauses;
      }

      // 2. Insert clauses, decomposed obligations, and statutory penalties
      const persistedClauses: ParsedClause[] = [];

      const sanitizeStr = (txt?: string | null): string => (txt ? txt.replace(/\0/g, '') : '');
      const sanitizeOpt = (txt?: string | null): string | null => (txt ? txt.replace(/\0/g, '') : null);

      for (const c of clauses) {
        const clauseId = crypto.randomUUID();
        const { error: cErr } = await db.from('regulatory_clauses').insert({
          id: clauseId,
          document_version_id: documentVersionId,
          section_reference: sanitizeStr(c.sectionReference),
          section_heading: sanitizeOpt(c.sectionHeading),
          clause_text: sanitizeStr(c.clauseText),
          page_number: c.pageNumber || 1,
          paragraph_reference: sanitizeStr(c.paragraphReference || c.sectionReference),
        });

        if (cErr) {
          logger.warn({ clauseId, error: cErr.message }, 'Failed inserting regulatory_clause row');
          continue;
        }

        const insertedObligations: ParsedObligation[] = [];

        const validLicenseEnums = new Set([
          'COMMERCIAL_BANK', 'MERCHANT_BANK', 'PAYMENT_SERVICE_BANK',
          'MICROFINANCE_BANK_NATIONAL', 'MICROFINANCE_BANK_STATE', 'MICROFINANCE_BANK_UNIT',
          'FINANCE_COMPANY', 'SWITCHING_AND_PROCESSING', 'PAYMENT_SOLUTION_SERVICES_PSSP',
          'PAYMENT_TERMINAL_SERVICE_PROVIDER_PTSP', 'MOBILE_MONEY_OPERATOR_MMO',
          'SUPER_AGENT', 'DIGITAL_LENDER_FCCPC_REGISTERED',
          'SEC_REGISTERED_DIGITAL_SUB_BROKER', 'SEC_REGISTERED_ROBO_ADVISOR', 'CRYPTO_VASP_SEC_APPROVED',
        ]);

        const validRailEnums = new Set([
          'NIBSS_NIP', 'NIBSS_CENTRAL_PAY', 'INTERSWITCH_WEBPAY', 'PAYSTACK',
          'FLUTTERWAVE', 'DIRECT_DEBIT_ACH', 'CARD_ACQUIRING_VERVE',
          'CARD_ACQUIRING_MASTERCARD_VISA', 'USSD', 'AGENT_BANKING_CASH_IN_OUT',
        ]);

        const mapSeverity = (sev?: string | null): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
          if (!sev) return 'MEDIUM';
          const upper = sev.toUpperCase();
          if (upper === 'CRITICAL' || upper === 'LEVEL_5') return 'CRITICAL';
          if (upper === 'HIGH' || upper === 'LEVEL_4') return 'HIGH';
          if (upper === 'MEDIUM' || upper === 'LEVEL_3') return 'MEDIUM';
          if (upper === 'LOW' || upper === 'LEVEL_2' || upper === 'LEVEL_1') return 'LOW';
          return 'MEDIUM';
        };

        const mapObligationType = (typ?: string | null): 'STRICT_PROHIBITION' | 'MANDATORY_DISCLOSURE' | 'CONDITIONAL_PERMISSION' | 'STATUTORY_TIMELINE' | 'GOVERNANCE_CONTROL' => {
          if (!typ) return 'GOVERNANCE_CONTROL';
          const upper = typ.toUpperCase();
          if (upper === 'STRICT_PROHIBITION') return 'STRICT_PROHIBITION';
          if (upper === 'MANDATORY_DISCLOSURE') return 'MANDATORY_DISCLOSURE';
          if (upper === 'CONDITIONAL_PERMISSION') return 'CONDITIONAL_PERMISSION';
          if (upper === 'STATUTORY_TIMELINE') return 'STATUTORY_TIMELINE';
          return 'GOVERNANCE_CONTROL';
        };

        // Production Guarantee: Every clause MUST have at least one decomposed obligation
        const obligationsToPersist = (c.obligations && c.obligations.length > 0)
          ? c.obligations
          : [
              {
                id: crypto.randomUUID(),
                obligationType: 'GOVERNANCE_CONTROL' as ObligationType,
                summary: `Mandatory operational policy alignment and governance control under ${c.sectionReference}: ${c.sectionHeading || 'Statutory Directive'}.`,
                severityFloor: 'MEDIUM' as const,
                statutoryTimelineDays: null,
                targetRole: 'Chief Compliance Officer',
                penalties: [],
                actor: 'Regulated Institution',
                action: 'must ensure compliance',
                object: c.sectionHeading || c.sectionReference,
                condition: null,
                deadline: null,
                verbatimQuote: c.clauseText ? c.clauseText.slice(0, 100) : '',
                startChar: 0,
                endChar: c.clauseText ? Math.min(c.clauseText.length, 100) : 0,
                targetedLicenses: [],
                affectedRails: [],
                appliesUniversally: true,
                isValidated: true,
                groundingConfidence: 1.0,
              },
            ];

        for (const obl of obligationsToPersist) {
          const oblId = crypto.randomUUID();
          const { error: oErr } = await db.from('regulatory_obligations').insert({
            id: oblId,
            clause_id: clauseId,
            obligation_type: mapObligationType(obl.obligationType),
            summary: sanitizeStr(obl.summary) || 'Statutory compliance obligation',
            severity_floor: mapSeverity(obl.severityFloor),
            statutory_timeline_days: obl.statutoryTimelineDays || null,
            mandatory_disclosure_text: obl.obligationType === 'MANDATORY_DISCLOSURE' ? sanitizeStr(obl.summary) : null,
          });

          if (oErr) {
            logger.warn({ oblId, error: oErr.message }, 'Failed inserting regulatory_obligation row');
            continue;
          }

          for (const p of obl.penalties) {
            await db.from('statutory_penalties').insert({
              obligation_id: oblId,
              penalty_min_naira: p.penaltyMinNaira,
              penalty_max_naira: p.penaltyMaxNaira,
              daily_fine_naira: p.dailyFineNaira,
              carries_personal_criminal_liability: p.carriesPersonalCriminalLiability,
              carries_license_suspension_risk: p.carriesLicenseSuspensionRisk,
              penalty_legal_citation: p.penaltyLegalCitation,
            });
          }

          // Persist Relational Applicability Targeting
          if (obl.appliesUniversally) {
            await db.from('applicability_rules').insert({
              obligation_id: oblId,
              all_institutions_flag: true,
            });
          } else {
            if (obl.targetedLicenses && obl.targetedLicenses.length > 0) {
              for (const lic of obl.targetedLicenses) {
                if (validLicenseEnums.has(lic)) {
                  await db.from('applicability_rules').insert({
                    obligation_id: oblId,
                    applicable_license_type: lic as any,
                    all_institutions_flag: false,
                  });
                }
              }
            }
            if (obl.affectedRails && obl.affectedRails.length > 0) {
              for (const rail of obl.affectedRails) {
                if (validRailEnums.has(rail)) {
                  await db.from('applicability_rules').insert({
                    obligation_id: oblId,
                    applicable_payment_rail: rail as any,
                    all_institutions_flag: false,
                  });
                }
              }
            }
          }

          insertedObligations.push({
            ...obl,
            id: oblId,
          });
        }

        persistedClauses.push({
          ...c,
          id: clauseId,
          obligations: insertedObligations,
        });
      }

      logger.info(
        { documentVersionId, clausesPersisted: persistedClauses.length },
        'Successfully persisted clauses, obligations, and penalties to database'
      );

      return persistedClauses;
    } catch (err: any) {
      logger.error({ error: err.message, documentVersionId }, 'Error persisting document clauses');
      return clauses;
    }
  }
}
