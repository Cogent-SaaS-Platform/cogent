import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { logger } from '@/shared/logger';
import { ObligationType, SeverityLevel, RegulatorCode } from '@/shared/types';
import { ApplicabilityEngine } from './applicabilityEngine';

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
      const textClauses = this.extractFromRawText(rawText, regulatorCode, circularNumber, priority, statutoryDeadline);
      clauses.push(...textClauses);
    }

    // Strategy 3: Guaranteed statutory fallback (even for concise notices)
    if (clauses.length === 0) {
      const fallbackText = rawText.trim() || subject || 'Mandatory regulatory compliance directive issued by supervisory authority.';
      clauses.push(
        this.buildClauseRecord(
          'Section 1.0',
          subject && subject.length < 80 ? subject : 'General Statutory Mandate',
          fallbackText,
          1,
          regulatorCode,
          circularNumber,
          priority,
          statutoryDeadline
        )
      );
    }

    return clauses;
  }

  /**
   * Deterministically parses raw legal text into discrete numbered clauses
   */
  private static extractFromRawText(
    text: string,
    regulatorCode: string,
    circularNumber: string,
    priority: string,
    statutoryDeadline: string | null
  ): ParsedClause[] {
    const clauses: ParsedClause[] = [];
    const lines = text.split(/\r?\n/).map((l) => l.trimEnd());

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
        currentHeading = match[2].trim().replace(/^[:–-]\s*/, '');
        currentLines = [];
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
      const paragraphs = text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => {
          if (p.length < 35) return false;
          const lower = p.toLowerCase();
          if (lower.startsWith('yours faithfully') || lower.startsWith('enquiries') || lower.startsWith('circular to:')) {
            return false;
          }
          return true;
        });

      paragraphs.forEach((p, idx) => {
        const firstLine = p.split('\n')[0].replace(/[#*]/g, '').trim();
        const heading = firstLine.length < 80 ? firstLine : `Regulatory Mandate ${idx + 1}`;
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
    const penaltyMatch = text.match(/(?:₦|Naira|fine of)\s*([\d,]+(?:\.\d+)?)\s*(?:million|billion|thousand)?/i);
    let minPenalty = 1000000;
    let maxPenalty = 5000000;
    let dailyFine = 50000;

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
    } else if (severityFloor === 'CRITICAL') {
      minPenalty = 10000000;
      maxPenalty = 50000000;
    }

    const dailyMatch = text.match(/(?:daily|each continuous day|compounding).*?(?:₦|Naira)\s*([\d,]+)/i);
    if (dailyMatch) {
      const parsedDaily = parseFloat(dailyMatch[1].replace(/,/g, ''));
      if (!isNaN(parsedDaily)) dailyFine = parsedDaily;
    } else {
      dailyFine = Math.round(minPenalty * 0.02);
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

    return {
      sectionReference: reference,
      sectionHeading: heading,
      clauseText: text,
      pageNumber,
      paragraphReference: reference,
      obligations: [
        {
          obligationType,
          summary: heading,
          severityFloor,
          statutoryTimelineDays,
          targetRole,
          penalties: [
            {
              penaltyMinNaira: minPenalty,
              penaltyMaxNaira: maxPenalty,
              dailyFineNaira: dailyFine,
              carriesPersonalCriminalLiability,
              carriesLicenseSuspensionRisk,
              penaltyLegalCitation: `${regulatorCode} Directive ${circularNumber} / Statutory Enforcement`,
            },
          ],
        },
      ],
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

      for (const c of clauses) {
        const clauseId = crypto.randomUUID();
        const { error: cErr } = await db.from('regulatory_clauses').insert({
          id: clauseId,
          document_version_id: documentVersionId,
          section_reference: c.sectionReference,
          section_heading: c.sectionHeading,
          clause_text: c.clauseText,
          page_number: c.pageNumber || 1,
          paragraph_reference: c.paragraphReference || c.sectionReference,
        });

        if (cErr) {
          logger.warn({ clauseId, error: cErr.message }, 'Failed inserting regulatory_clause row');
          continue;
        }

        const insertedObligations: ParsedObligation[] = [];

        for (const obl of c.obligations) {
          const oblId = crypto.randomUUID();
          const { error: oErr } = await db.from('regulatory_obligations').insert({
            id: oblId,
            clause_id: clauseId,
            obligation_type: obl.obligationType,
            summary: obl.summary,
            severity_floor: obl.severityFloor,
            statutory_timeline_days: obl.statutoryTimelineDays,
            mandatory_disclosure_text: obl.obligationType === 'MANDATORY_DISCLOSURE' ? obl.summary : null,
          });

          if (!oErr) {
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

            insertedObligations.push({
              ...obl,
              id: oblId,
            });
          }
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
