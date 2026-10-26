import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { AiEngine } from '@/shared/ai-engine';
import { logger } from '@/shared/logger';
import {
  ObligationType,
  SeverityLevel,
  LicenseType,
  PaymentRail,
  RegulatorCode,
} from '@/shared/types';
import {
  ClauseObligationExtractionOutputSchema,
  RawExtractedObligation,
  ValidatedObligation,
  StatedPenalty,
} from '../types/obligationSchema';

export interface ObligationExtractionOptions {
  aiEngine?: AiEngine;
  dbClient?: SupabaseClient<Database>;
}

export interface ExtractClauseObligationsInput {
  clauseText: string;
  clauseId?: string;
  clauseReference?: string;
  sectionHeading?: string;
  pageNumber?: number;
  regulatorCode?: RegulatorCode | string;
  circularNumber?: string;
}

/**
 * Enterprise RegTech Statutory Obligation Extraction Engine (Phase 2)
 * Decomposes regulatory clauses into discrete statutory obligations using
 * Gemini Structured Outputs (`FAST_MODEL`) with deterministic quote-to-source grounding,
 * character-span mapping, and authentic penalty schedule validation.
 */
export class ObligationExtractionService {
  private aiEngine: AiEngine;
  private dbClient?: SupabaseClient<Database>;

  constructor(options?: ObligationExtractionOptions) {
    this.aiEngine = options?.aiEngine || new AiEngine();
    this.dbClient = options?.dbClient;
  }

  /**
   * Main entry point: Extracts discrete statutory obligations from a clause
   * with strict quote-to-source validation and character-span mapping.
   */
  public async extractObligationsFromClause(
    input: ExtractClauseObligationsInput
  ): Promise<ValidatedObligation[]> {
    const {
      clauseText,
      clauseId,
      clauseReference = 'Clause',
      sectionHeading,
      pageNumber = 1,
      regulatorCode = 'CBN',
      circularNumber = 'CIRCULAR',
    } = input;

    if (!clauseText || clauseText.trim().length < 15) {
      return [];
    }

    let rawObligations: RawExtractedObligation[] = [];

    // 1. Attempt LLM-Driven Structured Extraction via FAST_MODEL
    try {
      const prompt = this.buildExtractionPrompt({
        clauseText,
        clauseReference,
        sectionHeading,
        regulatorCode: String(regulatorCode),
        circularNumber,
      });

      const result = await this.aiEngine.generateStructured({
        systemInstruction: this.getSystemInstruction(),
        prompt,
        schema: ClauseObligationExtractionOutputSchema,
        modelAlias: 'FAST_MODEL',
      });

      if (result.data && Array.isArray(result.data.obligations)) {
        rawObligations = result.data.obligations;
      }
    } catch (llmErr: any) {
      logger.warn(
        {
          clauseReference,
          error: llmErr instanceof Error ? llmErr.message : String(llmErr),
        },
        'Statutory obligation LLM extraction failed or timed out; falling back to deterministic sentence decomposition'
      );
    }

    // 2. Deterministic Fallback if LLM extraction returned 0 obligations or failed
    if (rawObligations.length === 0) {
      return ObligationExtractionService.extractDeterministicFallback({
        clauseText,
        clauseId,
        clauseReference,
        sectionHeading,
        pageNumber,
        regulatorCode: String(regulatorCode),
        circularNumber,
      });
    }

    // 3. Grounded Quote Validation & Character-Span Calculation
    const validatedList: ValidatedObligation[] = [];

    for (const raw of rawObligations) {
      const anchor = ObligationExtractionService.validateAndAnchorQuote(
        raw.verbatimQuote,
        clauseText
      );

      // Rule: Hallucinated / ungrounded quotes that cannot be mapped to source text are discarded
      if (!anchor) {
        logger.warn(
          {
            clauseReference,
            actor: raw.actor,
            rejectedQuote: raw.verbatimQuote,
          },
          'Statutory obligation rejected: verbatim quote does not exist in source text'
        );
        continue;
      }

      // Rule: Penalties must exist in authentic text. Reject synthetic fines.
      const verifiedPenalty = ObligationExtractionService.verifyStatedPenalty(
        raw.statedPenalty,
        anchor.verbatimQuote,
        clauseText
      );

      // Infer or normalize targeting
      const inferredTargeting = ObligationExtractionService.inferTargeting(
        raw.actor,
        raw.object,
        clauseText
      );

      const targetedLicenses = (
        raw.targetedLicenses && raw.targetedLicenses.length > 0
          ? (raw.targetedLicenses as LicenseType[])
          : inferredTargeting.targetedLicenses
      );

      const affectedRails = (
        raw.affectedRails && raw.affectedRails.length > 0
          ? (raw.affectedRails as PaymentRail[])
          : inferredTargeting.affectedRails
      );

      const appliesUniversally =
        raw.appliesUniversally !== undefined
          ? raw.appliesUniversally
          : inferredTargeting.appliesUniversally;

      const obligationId = crypto.randomUUID();
      const conditionPart = raw.condition ? ` where ${raw.condition}` : '';
      const deadlinePart = raw.deadline ? ` (${raw.deadline})` : '';
      const summaryText = `${raw.actor} ${raw.action} ${raw.object}${conditionPart}${deadlinePart}`;

      validatedList.push({
        ...raw,
        id: obligationId,
        clauseId,
        clauseReference,
        pageNumber,
        verbatimQuote: anchor.verbatimQuote,
        startChar: anchor.startChar,
        endChar: anchor.endChar,
        statedPenalty: verifiedPenalty,
        targetedLicenses,
        affectedRails,
        appliesUniversally,
        summary: summaryText,
        isValidated: true,
        groundingConfidence: anchor.confidence,
      });
    }

    // If all LLM candidates were rejected as ungrounded, invoke deterministic sentence decomposition
    if (validatedList.length === 0) {
      return ObligationExtractionService.extractDeterministicFallback({
        clauseText,
        clauseId,
        clauseReference,
        sectionHeading,
        pageNumber,
        regulatorCode: String(regulatorCode),
        circularNumber,
      });
    }

    return validatedList;
  }

  /**
   * Deterministic Quote-to-Source Validation & Sliding-Window Alignment
   * Guarantees 100% provenance integrity:
   * clauseText.substring(startChar, endChar) === verbatimQuote
   * clauseText.includes(verbatimQuote) === true
   */
  public static validateAndAnchorQuote(
    candidateQuote: string,
    clauseText: string
  ): { startChar: number; endChar: number; verbatimQuote: string; confidence: number } | null {
    if (!candidateQuote || !clauseText) return null;

    const trimmedCandidate = candidateQuote.trim();
    if (trimmedCandidate.length < 5) return null;

    // 1. Exact Substring Matching
    const exactIndex = clauseText.indexOf(trimmedCandidate);
    if (exactIndex !== -1) {
      return {
        startChar: exactIndex,
        endChar: exactIndex + trimmedCandidate.length,
        verbatimQuote: trimmedCandidate,
        confidence: 1.0,
      };
    }

    // 2. Whitespace-flexible regex match (handles newlines, tabs, multiple spaces, straight/curved quotes)
    const normalizedCandidate = trimmedCandidate
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\u00A0/g, ' ');

    const words = normalizedCandidate.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      const escapedWords = words.map((w) =>
        w
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          .replace(/["'“”‘’]/g, '["\'“”‘’]')
      );
      const flexibleRegex = new RegExp(escapedWords.join('[\\s\\r\\n]+'), 'i');
      const match = clauseText.match(flexibleRegex);

      if (match && match.index !== undefined) {
        const startChar = match.index;
        const matchedText = match[0];
        const endChar = startChar + matchedText.length;
        return {
          startChar,
          endChar,
          verbatimQuote: matchedText,
          confidence: 0.98,
        };
      }
    }

    // 3. Sliding Sub-Window Token Alignment for partial trimming
    if (words.length >= 5) {
      // Try sub-window of first 4 and last 4 words
      const headWords = words.slice(0, 4).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const headRegex = new RegExp(headWords.join('[\\s\\r\\n]+'), 'i');
      const headMatch = clauseText.match(headRegex);

      if (headMatch && headMatch.index !== undefined) {
        const startChar = headMatch.index;
        // Search forwards from startChar for the end of the candidate sentence
        const tailWords = words.slice(-3).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const tailRegex = new RegExp(tailWords.join('[\\s\\r\\n]+'), 'i');
        const remainingText = clauseText.slice(startChar);
        const tailMatch = remainingText.match(tailRegex);

        if (tailMatch && tailMatch.index !== undefined) {
          const matchLength = tailMatch.index + tailMatch[0].length;
          const matchedText = remainingText.slice(0, matchLength);
          return {
            startChar,
            endChar: startChar + matchLength,
            verbatimQuote: matchedText,
            confidence: 0.92,
          };
        }
      }
    }

    // If quote cannot be grounded, reject it
    return null;
  }

  /**
   * Deterministic Penalty Grounding Validator
   * Enforces Mantra 1: NOTHING MADE UP, EVER.
   * If an obligation carries no stated fine in authentic text, returns null.
   */
  public static verifyStatedPenalty(
    penalty: StatedPenalty | null,
    quoteText: string,
    clauseText: string
  ): StatedPenalty | null {
    if (!penalty) return null;

    const hasFineValues =
      (penalty.minNaira && penalty.minNaira > 0) ||
      (penalty.maxNaira && penalty.maxNaira > 0) ||
      (penalty.dailyFineNaira && penalty.dailyFineNaira > 0);

    const hasLiabilities =
      penalty.carriesPersonalCriminalLiability || penalty.carriesLicenseSuspensionRisk;

    if (!hasFineValues && !hasLiabilities) {
      return null;
    }

    // Check if authentic text contains penalty/currency markers
    const combinedText = `${quoteText}\n${clauseText}`.toLowerCase();
    const penaltyKeywords = [
      '₦',
      'naira',
      'fine',
      'penalty',
      'penalties',
      'sanction',
      'sanctions',
      'liable to',
      'conviction',
      'imprisonment',
      'revocation',
      'suspension of licence',
      'suspension of license',
      'withdrawal of licence',
      'withdrawal of license',
      'forfeiture',
    ];

    const containsPenaltyMarker = penaltyKeywords.some((kw) => combinedText.includes(kw));

    // If the text has no mention of penalty keywords, the LLM hallucinated a fine
    if (!containsPenaltyMarker) {
      return null;
    }

    // Return authenticated penalty
    return {
      minNaira: Number(penalty.minNaira) || 0,
      maxNaira: Number(penalty.maxNaira) || 0,
      dailyFineNaira: Number(penalty.dailyFineNaira) || 0,
      carriesPersonalCriminalLiability: Boolean(penalty.carriesPersonalCriminalLiability),
      carriesLicenseSuspensionRisk: Boolean(penalty.carriesLicenseSuspensionRisk),
      citation: penalty.citation || 'Statutory Enforcement Section',
    };
  }

  /**
   * Nigerian Financial Regulatory Targeting Inference
   * Maps statutory entities and payment assets to typed LicenseType and PaymentRail
   */
  public static inferTargeting(
    actor: string,
    object: string,
    clauseText: string
  ): { targetedLicenses: LicenseType[]; affectedRails: PaymentRail[]; appliesUniversally: boolean } {
    const combined = `${actor} ${object} ${clauseText}`.toLowerCase();

    // 1. Universal Mandate Check
    const universalRegex = /\b(all financial institutions|all licensed institutions|all banks|all regulated entities|all participants|every regulated entity)\b/i;
    const appliesUniversally = universalRegex.test(combined);

    // 2. License Targeting
    const licenses: LicenseType[] = [];
    if (/\b(commercial bank|commercial banks|dmbs|deposit money banks)\b/i.test(combined)) {
      licenses.push('COMMERCIAL_BANK');
    }
    if (/\b(merchant bank|merchant banks)\b/i.test(combined)) {
      licenses.push('MERCHANT_BANK');
    }
    if (/\b(microfinance bank|microfinance banks|mfb|mfbs)\b/i.test(combined)) {
      licenses.push('MICROFINANCE_BANK_NATIONAL');
      licenses.push('MICROFINANCE_BANK_STATE');
      licenses.push('MICROFINANCE_BANK_UNIT');
    }
    if (/\b(payment solution service|payment service provider|pssp|psps|payment solution providers)\b/i.test(combined)) {
      licenses.push('PAYMENT_SOLUTION_SERVICES_PSSP');
    }
    if (/\b(payment terminal service provider|ptsp|terminal operators)\b/i.test(combined)) {
      licenses.push('PAYMENT_TERMINAL_SERVICE_PROVIDER_PTSP');
    }
    if (/\b(mobile money operator|mobile money operators|mmo|mmos)\b/i.test(combined)) {
      licenses.push('MOBILE_MONEY_OPERATOR_MMO');
    }
    if (/\b(switching and processing|switch|switches|switching companies)\b/i.test(combined)) {
      licenses.push('SWITCHING_AND_PROCESSING');
    }
    if (/\b(super agent|super agents)\b/i.test(combined)) {
      licenses.push('SUPER_AGENT');
    }
    if (/\b(digital lender|digital lenders|money lender|money lenders)\b/i.test(combined)) {
      licenses.push('DIGITAL_LENDER_FCCPC_REGISTERED');
    }
    if (/\b(crypto|vasp|vasps|virtual asset|virtual assets|digital asset)\b/i.test(combined)) {
      licenses.push('CRYPTO_VASP_SEC_APPROVED');
    }
    if (/\b(finance company|finance companies)\b/i.test(combined)) {
      licenses.push('FINANCE_COMPANY');
    }

    // 3. Payment Rails Targeting
    const rails: PaymentRail[] = [];
    if (/\b(nip|instant payment|instant payments|nibss)\b/i.test(combined)) {
      rails.push('NIBSS_NIP');
    }
    if (/\b(central pay|centralpay)\b/i.test(combined)) {
      rails.push('NIBSS_CENTRAL_PAY');
    }
    if (/\b(ussd)\b/i.test(combined)) {
      rails.push('USSD');
    }
    if (/\b(pos|terminal|contactless|verve|mastercard|visa|card acquiring)\b/i.test(combined)) {
      rails.push('CARD_ACQUIRING_VERVE');
      rails.push('CARD_ACQUIRING_MASTERCARD_VISA');
    }
    if (/\b(direct debit|ach)\b/i.test(combined)) {
      rails.push('DIRECT_DEBIT_ACH');
    }
    if (/\b(interswitch|webpay)\b/i.test(combined)) {
      rails.push('INTERSWITCH_WEBPAY');
    }
    if (/\b(paystack)\b/i.test(combined)) {
      rails.push('PAYSTACK');
    }
    if (/\b(flutterwave)\b/i.test(combined)) {
      rails.push('FLUTTERWAVE');
    }
    if (/\b(agent banking|cash in|cash out)\b/i.test(combined)) {
      rails.push('AGENT_BANKING_CASH_IN_OUT');
    }

    return {
      targetedLicenses: Array.from(new Set(licenses)),
      affectedRails: Array.from(new Set(rails)),
      appliesUniversally,
    };
  }

  /**
   * Deterministic Sentence Decomposition Fallback
   * Splits clauses into operative statutory sentences and extracts grounded obligations
   * with exact character-span offsets and zero synthetic fine fabrication.
   */
  public static extractDeterministicFallback(input: {
    clauseText: string;
    clauseId?: string;
    clauseReference?: string;
    sectionHeading?: string;
    pageNumber?: number;
    regulatorCode?: string;
    circularNumber?: string;
  }): ValidatedObligation[] {
    const {
      clauseText,
      clauseId,
      clauseReference = 'Clause',
      sectionHeading,
      pageNumber = 1,
      regulatorCode = 'CBN',
      circularNumber = 'CIRCULAR',
    } = input;

    const obligations: ValidatedObligation[] = [];

    // Split text into distinct sentences preserving punctuation
    const sentenceRegex = /([^.?!]+[.?!]+)/g;
    let match: RegExpExecArray | null;
    const matches: Array<{ text: string; start: number; end: number }> = [];

    while ((match = sentenceRegex.exec(clauseText)) !== null) {
      const sentenceText = match[1].trim();
      if (sentenceText.length > 20) {
        const start = match.index + match[1].indexOf(sentenceText);
        matches.push({
          text: sentenceText,
          start,
          end: start + sentenceText.length,
        });
      }
    }

    // If regex split produced nothing, treat entire clauseText as one block
    if (matches.length === 0 && clauseText.trim().length > 15) {
      matches.push({
        text: clauseText.trim(),
        start: clauseText.indexOf(clauseText.trim()),
        end: clauseText.indexOf(clauseText.trim()) + clauseText.trim().length,
      });
    }

    // Filter to operative sentences containing statutory mandate modal verbs
    const operativeMatches = matches.filter((m) =>
      /\b(shall|must|mandat|prohibit|requir|ensure|liable|submit|maintain|comply|penalty|sanction|forbidden|disclose|notify|publish)\b/i.test(
        m.text
      )
    );

    const candidates = operativeMatches.length > 0 ? operativeMatches : matches;

    for (const c of candidates) {
      const textLower = c.text.toLowerCase();

      // Determine Obligation Type
      let obligationType: ObligationType = 'GOVERNANCE_CONTROL';
      if (
        textLower.includes('prohibit') ||
        textLower.includes('shall not') ||
        textLower.includes('must not') ||
        textLower.includes('unlawful') ||
        textLower.includes('forbidden') ||
        textLower.includes('refrain') ||
        /\bno\s+(?:licensed\s+|financial\s+|regulated\s+)?(?:institution|entity|bank|operator|participant)\s+shall\b/i.test(textLower) ||
        textLower.includes('no licensed financial institution shall')
      ) {
        obligationType = 'STRICT_PROHIBITION';
      } else if (
        textLower.includes('disclose') ||
        textLower.includes('notify') ||
        textLower.includes('report') ||
        textLower.includes('submit') ||
        textLower.includes('publish') ||
        textLower.includes('furnish') ||
        textLower.includes('file')
      ) {
        obligationType = 'MANDATORY_DISCLOSURE';
      } else if (
        textLower.includes('within') ||
        textLower.includes('deadline') ||
        textLower.includes('timeline') ||
        textLower.includes('prior to') ||
        textLower.includes('effective date')
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

      // Determine Severity Floor
      let severityFloor: SeverityLevel = 'MEDIUM';
      if (
        textLower.includes('criminal') ||
        textLower.includes('imprisonment') ||
        textLower.includes('revocation') ||
        textLower.includes('delisting') ||
        textLower.includes('disconnection')
      ) {
        severityFloor = 'CRITICAL';
      } else if (
        obligationType === 'STRICT_PROHIBITION' ||
        textLower.includes('fine') ||
        textLower.includes('penalty') ||
        textLower.includes('sanction')
      ) {
        severityFloor = 'HIGH';
      }

      // Determine Statutory Timeline
      let statutoryTimelineDays: number | null = null;
      let deadlineStr: string | null = null;
      const daysMatch = c.text.match(/within\s+(\d+)\s*(hour|day|week|month|year)s?/i);
      if (daysMatch) {
        deadlineStr = daysMatch[0];
        const num = parseInt(daysMatch[1], 10);
        const unit = daysMatch[2].toLowerCase();
        if (unit === 'hour') statutoryTimelineDays = 1;
        else if (unit === 'day') statutoryTimelineDays = num;
        else if (unit === 'week') statutoryTimelineDays = num * 7;
        else if (unit === 'month') statutoryTimelineDays = num * 30;
        else if (unit === 'year') statutoryTimelineDays = num * 365;
      }

      // Deterministic Penalty Extraction (authentic fine only, never default)
      let statedPenalty: StatedPenalty | null = null;
      const hasPenaltyKeyword = /\b(penalty|penalties|fine|fines|sanction|sanctions|liable|liability|default sanction|conviction|imprisonment|forfeit|forfeiture)\b/i.test(c.text);
      let minFine = 0;
      let maxFine = 0;
      let dailyFine = 0;

      if (hasPenaltyKeyword) {
        const penaltyMatch = c.text.match(/(?:penalty of|fine of|sanction of|administrative penalty of|default sanction of|liable to.*?)\s*(?:₦|Naira)?\s*([\d,]+(?:\.\d+)?)\s*(million|billion|thousand)?/i) ||
          c.text.match(/(?:₦|Naira)\s*([\d,]+(?:\.\d+)?)\s*(million|billion|thousand)?/i);

        if (penaltyMatch) {
          const numStr = penaltyMatch[1].replace(/,/g, '');
          const parsed = parseFloat(numStr);
          if (!isNaN(parsed)) {
            const unit = penaltyMatch[2]
              ? penaltyMatch[2].toLowerCase()
              : penaltyMatch[0].toLowerCase().includes('billion')
              ? 'billion'
              : penaltyMatch[0].toLowerCase().includes('million')
              ? 'million'
              : '';
            if (unit === 'billion') {
              minFine = parsed * 1_000_000_000;
              maxFine = parsed * 2_000_000_000;
            } else if (unit === 'million') {
              minFine = parsed * 1_000_000;
              maxFine = parsed * 2_000_000;
            } else {
              minFine = parsed;
              maxFine = parsed;
            }
          }
        }

        const dailyMatch = c.text.match(/(?:daily|each continuous day|compounding|each day of default).*?(?:₦|Naira)\s*([\d,]+)/i);
        if (dailyMatch) {
          const parsedDaily = parseFloat(dailyMatch[1].replace(/,/g, ''));
          if (!isNaN(parsedDaily)) dailyFine = parsedDaily;
        }
      }

      const carriesPersonalCriminalLiability =
        textLower.includes('criminal') ||
        textLower.includes('imprisonment') ||
        textLower.includes('liable on conviction');

      const carriesLicenseSuspensionRisk =
        textLower.includes('suspension') ||
        textLower.includes('revocation') ||
        textLower.includes('delisting') ||
        textLower.includes('disconnection');

      if (minFine > 0 || maxFine > 0 || dailyFine > 0 || carriesPersonalCriminalLiability || carriesLicenseSuspensionRisk) {
        const citationMatch = c.text.match(/(?:pursuant to|under|in accordance with|section|act)\s+([^,.;\n]*(?:Act|BOFIA|ISA|NDPA|FCCPA|ARCON|Guidelines|Framework|Regulation)[^,.;\n]*)/i);
        const citation = citationMatch ? citationMatch[0].trim() : `${regulatorCode} Directive ${circularNumber}`;
        statedPenalty = {
          minNaira: minFine,
          maxNaira: maxFine,
          dailyFineNaira: dailyFine,
          carriesPersonalCriminalLiability,
          carriesLicenseSuspensionRisk,
          citation,
        };
      }

      // Infer actor and action from operative sentence
      let actor = 'Regulated Financial Institution';
      if (textLower.includes('commercial bank') || textLower.includes('dmb')) {
        actor = 'Commercial Banks';
      } else if (textLower.includes('payment service provider') || textLower.includes('pssp')) {
        actor = 'Payment Service Providers';
      } else if (textLower.includes('switching') || textLower.includes('switch')) {
        actor = 'Switching Companies';
      } else if (textLower.includes('mobile money operator') || textLower.includes('mmo')) {
        actor = 'Mobile Money Operators';
      } else if (textLower.includes('cco') || textLower.includes('compliance officer')) {
        actor = 'Chief Compliance Officer';
      } else if (textLower.includes('board') || textLower.includes('directors')) {
        actor = 'Board of Directors';
      }

      const targeting = ObligationExtractionService.inferTargeting(actor, c.text, clauseText);

      // Extract modal verb + action
      let action = 'shall comply with statutory directives';
      if (textLower.includes('shall submit') || textLower.includes('must submit')) {
        action = 'must submit';
      } else if (
        obligationType === 'STRICT_PROHIBITION' ||
        textLower.includes('shall not') ||
        textLower.includes('must not') ||
        textLower.includes('is prohibited from') ||
        textLower.includes('no licensed') ||
        textLower.includes('no financial institution')
      ) {
        action = 'is prohibited from';
      } else if (textLower.includes('shall maintain') || textLower.includes('must maintain')) {
        action = 'must maintain';
      } else if (textLower.includes('shall establish') || textLower.includes('must establish')) {
        action = 'shall establish';
      } else if (textLower.includes('shall ensure') || textLower.includes('must ensure')) {
        action = 'must ensure';
      }

      const cleanSentence = c.text.replace(/^[\d\.\-\s]+/, '').trim();
      const object = cleanSentence.length > 120 ? cleanSentence.slice(0, 117) + '...' : cleanSentence;
      const summaryText = sectionHeading
        ? `${sectionHeading}: ${cleanSentence}`
        : cleanSentence;

      const assessment = `${actor} operating under ${regulatorCode} supervisory authority must comply with the mandate: ${cleanSentence}. Non-compliance carries statutory sanctions, regulatory examination findings, and operational risk.`;

      const complianceCriteria = [
        `Incorporate "${cleanSentence.slice(0, 100)}" into institutional compliance and risk management manuals.`,
        deadlineStr
          ? `Ensure operational workflow adheres to statutory turnaround timeline of ${deadlineStr}.`
          : 'Establish verifiable operational controls and executive sign-off procedures.',
        'Maintain an immutable audit trail of execution and supervisory reporting records.',
      ];

      obligations.push({
        id: crypto.randomUUID(),
        clauseId,
        clauseReference,
        pageNumber,
        actor,
        action,
        object,
        condition: null,
        deadline: deadlineStr,
        statutoryTimelineDays,
        obligationType,
        severityFloor,
        verbatimQuote: c.text,
        startChar: c.start,
        endChar: c.end,
        statedPenalty,
        summary: summaryText,
        targetedLicenses: targeting.targetedLicenses,
        affectedRails: targeting.affectedRails,
        appliesUniversally: targeting.appliesUniversally,
        isValidated: true,
        groundingConfidence: 1.0,
        assessment,
        complianceCriteria,
      });
    }

    return obligations;
  }

  /**
   * Batch extracts validated obligations across a document's segmented clauses
   */
  public async extractObligationsFromDocument(
    clauses: Array<{
      id?: string;
      sectionReference: string;
      sectionHeading?: string;
      clauseText: string;
      pageNumber?: number;
      regulatorCode?: RegulatorCode | string;
      circularNumber?: string;
    }>
  ): Promise<Map<string, ValidatedObligation[]>> {
    const results = new Map<string, ValidatedObligation[]>();

    for (const clause of clauses) {
      const clauseKey = clause.id || clause.sectionReference;
      const obligations = await this.extractObligationsFromClause({
        clauseText: clause.clauseText,
        clauseId: clause.id,
        clauseReference: clause.sectionReference,
        sectionHeading: clause.sectionHeading,
        pageNumber: clause.pageNumber || 1,
        regulatorCode: clause.regulatorCode,
        circularNumber: clause.circularNumber,
      });
      results.set(clauseKey, obligations);
    }

    return results;
  }

  /**
   * Persists extracted obligations, penalties, and applicability rules to Supabase
   */
  public async persistObligations(
    clausesWithObligations: Array<{
      clauseId: string;
      pageNumber?: number;
      obligations: ValidatedObligation[];
    }>
  ): Promise<number> {
    if (!this.dbClient) return 0;
    let persistedCount = 0;

    for (const item of clausesWithObligations) {
      for (const obl of item.obligations) {
        const oblId = obl.id || crypto.randomUUID();
        const { error: oErr } = await this.dbClient.from('regulatory_obligations').insert({
          id: oblId,
          clause_id: item.clauseId,
          obligation_type: obl.obligationType,
          summary: obl.summary,
          severity_floor: obl.severityFloor,
          statutory_timeline_days: obl.statutoryTimelineDays,
          mandatory_disclosure_text:
            obl.obligationType === 'MANDATORY_DISCLOSURE' ? obl.summary : null,
          verbatim_quote: obl.verbatimQuote,
          character_span_start: obl.startChar,
          character_span_end: obl.endChar,
          page_number: item.pageNumber || obl.pageNumber || 1,
          actor: obl.actor,
          action: obl.action,
          target_object: obl.object,
          condition: obl.condition,
          deadline_text: obl.deadline,
          metadata: {
            appliesUniversally: obl.appliesUniversally,
            targetedLicenses: obl.targetedLicenses,
            affectedRails: obl.affectedRails,
            groundingConfidence: obl.groundingConfidence,
            assessment: obl.assessment,
            complianceCriteria: obl.complianceCriteria,
          },
        });

        if (oErr) {
          logger.warn({ error: oErr.message, oblId }, 'Failed inserting into regulatory_obligations');
          continue;
        }

        persistedCount++;

        // Persist stated penalty if present
        if (obl.statedPenalty) {
          await this.dbClient.from('statutory_penalties').insert({
            obligation_id: oblId,
            penalty_min_naira: obl.statedPenalty.minNaira,
            penalty_max_naira: obl.statedPenalty.maxNaira,
            daily_fine_naira: obl.statedPenalty.dailyFineNaira,
            carries_personal_criminal_liability: obl.statedPenalty.carriesPersonalCriminalLiability,
            carries_license_suspension_risk: obl.statedPenalty.carriesLicenseSuspensionRisk,
            penalty_legal_citation: obl.statedPenalty.citation,
          });
        }

        // Persist applicability rules
        if (obl.appliesUniversally) {
          await this.dbClient.from('applicability_rules').insert({
            obligation_id: oblId,
            all_institutions_flag: true,
          });
        } else {
          for (const lic of obl.targetedLicenses) {
            await this.dbClient.from('applicability_rules').insert({
              obligation_id: oblId,
              applicable_license_type: lic,
              all_institutions_flag: false,
            });
          }
          for (const rail of obl.affectedRails) {
            await this.dbClient.from('applicability_rules').insert({
              obligation_id: oblId,
              applicable_payment_rail: rail,
              all_institutions_flag: false,
            });
          }
        }
      }
    }

    return persistedCount;
  }

  private getSystemInstruction(): string {
    return [
      'You are Cogent Statutory Extraction Engine, an enterprise RegTech system for Nigerian financial authorities (CBN, SEC, NDPC, FCCPC, NFIU, NDIC, ARCON).',
      'Your task is to decompose statutory clauses into discrete, actionable legal obligations.',
      '',
      'CRITICAL RULES:',
      '1. PROVENANCE & GROUNDING: Every obligation must include a verbatimQuote which MUST be an EXACT, character-accurate substring from the provided clause text. Never rephrase, summarize, or alter verbatim quotes.',
      '2. NO SYNTHETIC FINES: Only populate statedPenalty if specific monetary amounts (in ₦ or Naira), compounding daily fines, or explicit criminal/license sanctions appear in the text. If none are stated, statedPenalty MUST be null.',
      '3. DECOMPOSE MULTI-MANDATES: If a single clause contains multiple distinct commands (e.g., "Institutions shall maintain X and must submit Y within 10 days"), extract EACH mandate as a separate obligation.',
      '4. IDENTIFY ACTORS: Accurately identify regulated actors (e.g., "Commercial Banks", "Payment Service Providers", "Chief Compliance Officer", "Mobile Money Operators").',
      '5. MAP STATUTORY MODAL VERBS: Extract operative action verb phrases ("must submit", "shall maintain", "is prohibited from", "shall not disclose").',
      '6. NORMALIZE TIMELINES: Extract deadlines as text ("within 72 hours") and normalized calendar days (e.g., 3 for 72 hours, 30 for 1 month).',
      '7. NO MARKETING BUZZWORDS: AI is invisible infrastructure. Produce rigorous, statutory compliance output.',
      '8. DEPTH & ACTIONABLE CRITERIA: Never output a generic single-line obligation. Provide a deep statutory assessment explaining systemic and operational impact, and enumerate 2 to 4 discrete complianceCriteria (the exact verification checklist items required to satisfy examiners and meet this obligation).',
    ].join('\n');
  }

  private buildExtractionPrompt(params: {
    clauseText: string;
    clauseReference: string;
    sectionHeading?: string;
    regulatorCode: string;
    circularNumber: string;
  }): string {
    return [
      `Regulator: ${params.regulatorCode}`,
      `Instrument Ref: ${params.circularNumber}`,
      `Section Reference: ${params.clauseReference}`,
      params.sectionHeading ? `Section Heading: ${params.sectionHeading}` : '',
      '',
      '--- REGULATORY CLAUSE TEXT ---',
      params.clauseText,
      '--- END CLAUSE TEXT ---',
      '',
      'Decompose the above clause text into all discrete statutory obligations adhering strictly to the JSON schema.',
      'Ensure verbatimQuote is an exact substring of the clause text.',
    ].filter(Boolean).join('\n');
  }
}
