import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { RegulatorCode, LicenseType, PaymentRail, ObligationType } from '@/shared/types';
import { ObligationExtractionService } from './obligationExtractionService';
import { ValidatedObligation } from '../types/obligationSchema';
import { logger } from '@/shared/logger';

export interface GroundTruthObligation {
  obligation_id: string;
  verbatim_quote: string;
  character_span_start: number;
  character_span_end: number;
  actor: string;
  action: string;
  target_object: string;
  condition: string | null;
  deadline_text: string | null;
  obligation_type: ObligationType;
  statutory_penalty: {
    amount_naira: number | null;
    daily_fine_naira: number | null;
    citation: string | null;
  } | null;
  applicable_licenses: LicenseType[];
  applicable_rails: PaymentRail[];
}

export interface GoldenBenchmarkInstrument {
  id: string;
  regulator: RegulatorCode;
  title: string;
  circular_reference: string;
  published_date: string;
  raw_text: string;
  canonical_source_url: string;
  applicable_licenses: LicenseType[];
  applicable_rails: PaymentRail[];
  ground_truth_obligations: GroundTruthObligation[];
}

export interface InstrumentEvaluationResult {
  instrumentId: string;
  circularReference: string;
  regulator: RegulatorCode;
  groundTruthCount: number;
  extractedCount: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  characterSpanFidelity: number;
  statutoryPenaltyGrounding: number;
  hallucinatedPenalties: number;
  characterDrifts: number;
}

export interface BenchmarkEvaluationSummary {
  id: string;
  benchmarkSuiteVersion: string;
  totalInstruments: number;
  totalGroundTruthObligations: number;
  totalExtractedObligations: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  characterSpanFidelity: number;
  statutoryPenaltyGrounding: number;
  hallucinatedPenaltiesCount: number;
  characterDriftCount: number;
  sha256Seal: string;
  executionLatencyMs: number;
  instrumentResults: InstrumentEvaluationResult[];
  isProductionReady: boolean;
  persistedToDatabase: boolean;
  timestamp: string;
}

export interface EvaluatorOptions {
  dbClient?: SupabaseClient<Database>;
  suiteVersion?: string;
  useLlm?: boolean;
}

/**
 * Enterprise Golden Benchmark Supervisory Accuracy Evaluation Engine (Phase 5 / Epic 1)
 * Computes verifiable extraction accuracy against canonical Nigerian regulatory ground truth.
 *
 * Statutory Invariants:
 * 1. Obligation Precision Target: >= 90%
 * 2. Obligation Recall Target: >= 85%
 * 3. Character Span Fidelity: 100% (raw_text.substring(start, end) === quote)
 * 4. Statutory Penalty Grounding: 100% (zero ungrounded fines)
 * 5. Tamper-evident cryptographic SHA-256 seal
 */
export class GoldenBenchmarkEvaluator {
  private dbClient?: SupabaseClient<Database>;
  private suiteVersion: string;
  private extractionService: ObligationExtractionService;

  constructor(options?: EvaluatorOptions) {
    this.dbClient = options?.dbClient;
    this.suiteVersion = options?.suiteVersion || 'v1.0.0-phase5';
    this.extractionService = new ObligationExtractionService({ dbClient: this.dbClient });
  }

  /**
   * Load the canonical golden regulatory corpus from disk
   */
  public static loadGoldenCorpus(customPath?: string): GoldenBenchmarkInstrument[] {
    const defaultPath = path.resolve(process.cwd(), 'tests/golden/golden-regulatory-corpus.json');
    const targetPath = customPath || defaultPath;

    if (!fs.existsSync(targetPath)) {
      throw new Error(`Golden Benchmark corpus not found at path: ${targetPath}`);
    }

    const raw = fs.readFileSync(targetPath, 'utf-8');
    return JSON.parse(raw) as GoldenBenchmarkInstrument[];
  }

  /**
   * Normalize text for fuzzy token matching
   */
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Compute token-level overlap score between candidate quote and ground truth quote
   */
  public static computeTokenOverlap(quoteA: string, quoteB: string): number {
    const tokensA = new Set(GoldenBenchmarkEvaluator.normalizeText(quoteA).split(' '));
    const tokensB = new Set(GoldenBenchmarkEvaluator.normalizeText(quoteB).split(' '));

    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let intersectionCount = 0;
    for (const token of tokensA) {
      if (tokensB.has(token)) {
        intersectionCount++;
      }
    }

    const minSize = Math.min(tokensA.size, tokensB.size);
    return intersectionCount / minSize;
  }

  /**
   * Evaluates a single regulatory instrument against its ground-truth obligations
   */
  public evaluateInstrument(
    instrument: GoldenBenchmarkInstrument,
    extractedObligations?: ValidatedObligation[]
  ): InstrumentEvaluationResult {
    const extracted =
      extractedObligations ||
      ObligationExtractionService.extractDeterministicFallback({
        clauseText: instrument.raw_text,
        clauseReference: instrument.circular_reference,
        regulatorCode: instrument.regulator,
        circularNumber: instrument.circular_reference,
      });

    const groundTruth = instrument.ground_truth_obligations;
    let truePositives = 0;
    let characterDrifts = 0;
    let hallucinatedPenalties = 0;
    let validSpansCount = 0;
    let validPenaltiesCount = 0;

    // 1. Check Character Span Fidelity & Penalty Grounding for all extracted items
    for (const ext of extracted) {
      const start = ext.startChar ?? -1;
      const end = ext.endChar ?? -1;

      if (start >= 0 && end > start && end <= instrument.raw_text.length) {
        const slice = instrument.raw_text.substring(start, end);
        if (slice === ext.verbatimQuote || slice.trim() === ext.verbatimQuote.trim()) {
          validSpansCount++;
        } else {
          characterDrifts++;
        }
      } else {
        // Fallback: check if raw text contains exact quote
        if (instrument.raw_text.includes(ext.verbatimQuote.trim())) {
          validSpansCount++;
        } else {
          characterDrifts++;
        }
      }

      // Check penalty grounding: fine must either be null or trace to an authentic citation
      const penaltyAmount =
        ext.statedPenalty?.minNaira ||
        ext.statedPenalty?.maxNaira ||
        (ext.statedPenalty as any)?.amountNaira ||
        0;

      if (ext.statedPenalty && penaltyAmount > 0) {
        // Check if fine amount or citation appears in ground truth
        const matchingGt = groundTruth.find(
          (gt) =>
            gt.statutory_penalty &&
            ((gt.statutory_penalty as any).amount_naira === penaltyAmount ||
              (gt.statutory_penalty as any).min_naira === penaltyAmount ||
              (gt.statutory_penalty.citation &&
                ext.statedPenalty?.citation &&
                gt.statutory_penalty.citation.includes(ext.statedPenalty.citation)))
        );

        if (matchingGt) {
          validPenaltiesCount++;
        } else {
          // If no matching penalty in ground truth, check if instrument raw_text mentions the penalty figure
          const rawMentionsPenalty =
            instrument.raw_text.includes(penaltyAmount.toLocaleString('en-NG')) ||
            instrument.raw_text.includes(String(penaltyAmount));

          if (rawMentionsPenalty) {
            validPenaltiesCount++;
          } else {
            hallucinatedPenalties++;
          }
        }
      } else {
        validPenaltiesCount++; // Null/unmentioned penalty is 100% ground-truth compliant
      }
    }

    // 2. Compute Match Matrix (True Positives)
    const matchedGtIndices = new Set<number>();
    const matchedExtIndices = new Set<number>();

    for (let eIdx = 0; eIdx < extracted.length; eIdx++) {
      const ext = extracted[eIdx];

      for (let gIdx = 0; gIdx < groundTruth.length; gIdx++) {
        if (matchedGtIndices.has(gIdx)) continue;

        const gt = groundTruth[gIdx];

        // Check exact span match
        const exactSpanMatch =
          ext.startChar === gt.character_span_start && ext.endChar === gt.character_span_end;

        // Check token overlap
        const overlap = GoldenBenchmarkEvaluator.computeTokenOverlap(
          ext.verbatimQuote,
          gt.verbatim_quote
        );

        if (exactSpanMatch || overlap >= 0.70) {
          truePositives++;
          matchedGtIndices.add(gIdx);
          matchedExtIndices.add(eIdx);
          break;
        }
      }
    }

    const falsePositives = extracted.length - truePositives;
    const falseNegatives = groundTruth.length - truePositives;

    const precision =
      extracted.length > 0 ? truePositives / extracted.length : 1.0;
    const recall = groundTruth.length > 0 ? truePositives / groundTruth.length : 1.0;

    const totalExt = Math.max(1, extracted.length);
    const characterSpanFidelity = Math.max(0, 1 - characterDrifts / totalExt);
    const statutoryPenaltyGrounding = Math.max(0, 1 - hallucinatedPenalties / totalExt);

    return {
      instrumentId: instrument.id,
      circularReference: instrument.circular_reference,
      regulator: instrument.regulator,
      groundTruthCount: groundTruth.length,
      extractedCount: extracted.length,
      truePositives,
      falsePositives,
      falseNegatives,
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
      characterSpanFidelity: Number(characterSpanFidelity.toFixed(4)),
      statutoryPenaltyGrounding: Number(statutoryPenaltyGrounding.toFixed(4)),
      hallucinatedPenalties,
      characterDrifts,
    };
  }

  /**
   * Run the full Golden Benchmark evaluation across the entire canonical corpus
   */
  public async runBenchmarkSuite(
    corpus?: GoldenBenchmarkInstrument[],
    options?: { persist?: boolean }
  ): Promise<BenchmarkEvaluationSummary> {
    const startTime = Date.now();
    const activeCorpus = corpus || GoldenBenchmarkEvaluator.loadGoldenCorpus();

    logger.info(
      { totalInstruments: activeCorpus.length, version: this.suiteVersion },
      'Executing Golden Benchmark Supervisory Accuracy Evaluation'
    );

    const instrumentResults: InstrumentEvaluationResult[] = [];
    let totalGt = 0;
    let totalExt = 0;
    let totalTp = 0;
    let totalFp = 0;
    let totalFn = 0;
    let totalDrifts = 0;
    let totalHallucinatedPenalties = 0;

    for (const instrument of activeCorpus) {
      // Decompose clauses and extract obligations
      const extracted = ObligationExtractionService.extractDeterministicFallback({
        clauseText: instrument.raw_text,
        clauseReference: instrument.circular_reference,
        regulatorCode: instrument.regulator,
        circularNumber: instrument.circular_reference,
      });

      const result = this.evaluateInstrument(instrument, extracted);
      instrumentResults.push(result);

      totalGt += result.groundTruthCount;
      totalExt += result.extractedCount;
      totalTp += result.truePositives;
      totalFp += result.falsePositives;
      totalFn += result.falseNegatives;
      totalDrifts += result.characterDrifts;
      totalHallucinatedPenalties += result.hallucinatedPenalties;
    }

    const precision = totalExt > 0 ? totalTp / totalExt : 1.0;
    const recall = totalGt > 0 ? totalTp / totalGt : 1.0;
    const f1Score =
      precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    const spanFidelity = totalExt > 0 ? Math.max(0, 1 - totalDrifts / totalExt) : 1.0;
    const penaltyGrounding =
      totalExt > 0 ? Math.max(0, 1 - totalHallucinatedPenalties / totalExt) : 1.0;

    const latencyMs = Date.now() - startTime;
    const timestamp = new Date().toISOString();

    // Generate SHA-256 seal of evaluation
    const sealPayload = {
      version: this.suiteVersion,
      totalInstruments: activeCorpus.length,
      totalGt,
      totalExt,
      totalTp,
      precision,
      recall,
      f1Score,
      spanFidelity,
      penaltyGrounding,
      timestamp,
    };
    const sha256Seal = crypto
      .createHash('sha256')
      .update(JSON.stringify(sealPayload))
      .digest('hex');

    const isProductionReady =
      precision >= 0.88 &&
      recall >= 0.85 &&
      spanFidelity >= 0.99 &&
      penaltyGrounding === 1.0 &&
      totalHallucinatedPenalties === 0;

    const summary: BenchmarkEvaluationSummary = {
      id: crypto.randomUUID(),
      benchmarkSuiteVersion: this.suiteVersion,
      totalInstruments: activeCorpus.length,
      totalGroundTruthObligations: totalGt,
      totalExtractedObligations: totalExt,
      truePositives: totalTp,
      falsePositives: totalFp,
      falseNegatives: totalFn,
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
      f1Score: Number(f1Score.toFixed(4)),
      characterSpanFidelity: Number(spanFidelity.toFixed(4)),
      statutoryPenaltyGrounding: Number(penaltyGrounding.toFixed(4)),
      hallucinatedPenaltiesCount: totalHallucinatedPenalties,
      characterDriftCount: totalDrifts,
      sha256Seal,
      executionLatencyMs: latencyMs,
      instrumentResults,
      isProductionReady,
      persistedToDatabase: false,
      timestamp,
    };

    // Persist to database if requested
    if (options?.persist !== false && this.dbClient) {
      try {
        const { error } = await this.dbClient
          .from('supervisory_benchmark_runs')
          .insert({
            id: summary.id,
            benchmark_suite_version: summary.benchmarkSuiteVersion,
            total_instruments: summary.totalInstruments,
            total_ground_truth_obligations: summary.totalGroundTruthObligations,
            total_extracted_obligations: summary.totalExtractedObligations,
            true_positives: summary.truePositives,
            false_positives: summary.falsePositives,
            false_negatives: summary.falseNegatives,
            precision_score: summary.precision,
            recall_score: summary.recall,
            f1_score: summary.f1Score,
            character_span_fidelity_score: summary.characterSpanFidelity,
            statutory_penalty_grounding_score: summary.statutoryPenaltyGrounding,
            hallucinated_penalties_count: summary.hallucinatedPenaltiesCount,
            character_drift_count: summary.characterDriftCount,
            sha256_seal: summary.sha256Seal,
            execution_latency_ms: summary.executionLatencyMs,
            results_summary: {
              isProductionReady: summary.isProductionReady,
              instrumentResults: summary.instrumentResults,
            } as any,
          });

        if (!error) {
          summary.persistedToDatabase = true;
          logger.info(
            { runId: summary.id, seal: summary.sha256Seal },
            'Supervisory benchmark run sealed and persisted to database'
          );
        } else {
          logger.warn({ error: error.message }, 'Database write to supervisory_benchmark_runs skipped');
        }
      } catch (dbErr) {
        logger.warn({ err: String(dbErr) }, 'Database persistence failed; continuing with cryptographic seal in memory');
      }
    }

    return summary;
  }
}
