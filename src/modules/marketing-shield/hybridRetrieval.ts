/**
 * Hybrid Statutory Retrieval Service (Pillar 1: Marketing Shield)
 * Combines pgvector cosine similarity (768d via gemini-embedding-2) and PostgreSQL full-text search (tsvector)
 * using Reciprocal Rank Fusion (RRF) for high-recall regulatory clause discovery.
 *
 * Adheres to:
 * - docs/PILLAR_1_MARKETING_SHIELD.md Stage 3
 * - docs/AI_ENGINE.md Section 2
 * - docs/BACKLOG.md Task 5.2
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { AiEngine } from '@/shared/ai-engine';
import { createClient } from '@/shared/db';
import { RegulatorCode } from '@/shared/types';
import { logger } from '@/shared/logger';

export interface RetrievedStatutoryClause {
  clauseId: string;
  sectionReference: string;
  sectionHeading: string;
  clauseText: string;
  similarity: number;
  ftsRank: number;
  rrfScore: number;
  regulatorCode: RegulatorCode;
  instrumentTitle: string;
  instrumentShortName: string;
  retrievalSource: 'HYBRID' | 'VECTOR_ONLY' | 'FTS_ONLY';
}

export interface HybridRetrievalOptions {
  limit?: number;
  minSimilarity?: number;
  filterRegulator?: RegulatorCode;
  denseWeight?: number;
  sparseWeight?: number;
  rrfK?: number;
}

export interface HybridRetrievalResult {
  clauses: RetrievedStatutoryClause[];
  denseCount: number;
  sparseCount: number;
  latencyMs: number;
  embeddingHash: string;
}

interface RawVectorMatch {
  id: string;
  section_reference: string;
  section_heading: string;
  clause_text: string;
  similarity: number;
  regulator_code: RegulatorCode;
  instrument_title: string;
  instrument_short_name: string;
}

interface RawFtsMatch {
  id: string;
  section_reference: string;
  section_heading: string;
  clause_text: string;
  fts_rank: number;
  regulator_code: RegulatorCode;
  instrument_title: string;
  instrument_short_name: string;
}

export class HybridRetrievalService {
  private aiEngine: AiEngine;
  private dbClient: SupabaseClient;

  constructor(aiEngine?: AiEngine, dbClient?: SupabaseClient) {
    this.aiEngine = aiEngine || new AiEngine();
    this.dbClient = dbClient || createClient();
  }

  /**
   * Performs hybrid retrieval over verified Nigerian regulatory clauses
   */
  public async retrieveRelevantClauses(
    copyText: string,
    options: HybridRetrievalOptions = {}
  ): Promise<HybridRetrievalResult> {
    const startTime = performance.now();
    const limit = options.limit ?? 5;
    const minSimilarity = options.minSimilarity ?? 0.2;
    const denseWeight = options.denseWeight ?? 0.65;
    const sparseWeight = options.sparseWeight ?? 0.35;
    const rrfK = options.rrfK ?? 60;

    // 1. Generate 768d vector embedding using gemini-embedding-2
    let embedding: number[] = [];
    try {
      embedding = await this.aiEngine.generateEmbedding(copyText);
    } catch (embErr) {
      logger.warn({ err: String(embErr) }, 'Embedding generation failed or timed out, relying on FTS keyword search');
    }
    const embeddingHash = embedding.length > 0
      ? AiEngine.hashContent(JSON.stringify(embedding.slice(0, 10)))
      : AiEngine.hashContent(copyText);

    // 2. Query vector cosine similarity and full-text search in parallel
    const [vectorResult, ftsResult] = await Promise.allSettled([
      embedding.length > 0
        ? this.dbClient.rpc('match_regulatory_clauses', {
            query_embedding: embedding,
            match_threshold: minSimilarity,
            match_count: limit * 2,
            filter_regulator: options.filterRegulator || null,
          })
        : Promise.resolve({ data: [] as RawVectorMatch[], error: null }),
      this.dbClient.rpc('search_regulatory_clauses_fts', {
        query_text: copyText,
        match_count: limit * 2,
        filter_regulator: options.filterRegulator || null,
      }),
    ]);

    const vectorMatches: RawVectorMatch[] =
      vectorResult.status === 'fulfilled' && !vectorResult.value.error && vectorResult.value.data
        ? (vectorResult.value.data as RawVectorMatch[])
        : [];

    const ftsMatches: RawFtsMatch[] =
      ftsResult.status === 'fulfilled' && !ftsResult.value.error && ftsResult.value.data
        ? (ftsResult.value.data as RawFtsMatch[])
        : [];

    if (vectorResult.status === 'rejected' || (vectorResult.status === 'fulfilled' && vectorResult.value.error)) {
      const err = vectorResult.status === 'rejected' ? vectorResult.reason : vectorResult.value.error;
      logger.warn({ err }, 'Vector match RPC reported issue, relying on FTS fallback');
    }

    if (ftsResult.status === 'rejected' || (ftsResult.status === 'fulfilled' && ftsResult.value.error)) {
      const err = ftsResult.status === 'rejected' ? ftsResult.reason : ftsResult.value.error;
      logger.warn({ err }, 'FTS match RPC reported issue, relying on vector fallback');
    }

    // 3. Reciprocal Rank Fusion (RRF)
    const fusedMap = new Map<
      string,
      {
        clause: RawVectorMatch | RawFtsMatch;
        vectorRank?: number;
        similarity?: number;
        ftsRankPosition?: number;
        ftsRankScore?: number;
        rrfScore: number;
      }
    >();

    // Process Dense Vector Rankings
    vectorMatches.forEach((match, index) => {
      const rank = index + 1;
      const score = denseWeight * (1 / (rrfK + rank));
      fusedMap.set(match.id, {
        clause: match,
        vectorRank: rank,
        similarity: match.similarity,
        rrfScore: score,
      });
    });

    // Process Sparse FTS Rankings
    ftsMatches.forEach((match, index) => {
      const rank = index + 1;
      const ftsScore = sparseWeight * (1 / (rrfK + rank));
      const existing = fusedMap.get(match.id);

      if (existing) {
        existing.ftsRankPosition = rank;
        existing.ftsRankScore = match.fts_rank;
        existing.rrfScore += ftsScore;
      } else {
        fusedMap.set(match.id, {
          clause: match,
          ftsRankPosition: rank,
          ftsRankScore: match.fts_rank,
          rrfScore: ftsScore,
        });
      }
    });

    // 4. Sort by RRF score descending and take top limit
    const sortedFused = Array.from(fusedMap.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, limit);

    const clauses: RetrievedStatutoryClause[] = sortedFused.map((item) => {
      let source: 'HYBRID' | 'VECTOR_ONLY' | 'FTS_ONLY' = 'HYBRID';
      if (item.vectorRank !== undefined && item.ftsRankPosition === undefined) {
        source = 'VECTOR_ONLY';
      } else if (item.vectorRank === undefined && item.ftsRankPosition !== undefined) {
        source = 'FTS_ONLY';
      }

      return {
        clauseId: item.clause.id,
        sectionReference: item.clause.section_reference,
        sectionHeading: item.clause.section_heading,
        clauseText: item.clause.clause_text,
        similarity: item.similarity ?? 0,
        ftsRank: item.ftsRankScore ?? 0,
        rrfScore: Number(item.rrfScore.toFixed(6)),
        regulatorCode: item.clause.regulator_code,
        instrumentTitle: item.clause.instrument_title,
        instrumentShortName: item.clause.instrument_short_name,
        retrievalSource: source,
      };
    });

    const latencyMs = Math.round(performance.now() - startTime);

    logger.info(
      {
        clausesCount: clauses.length,
        denseCount: vectorMatches.length,
        sparseCount: ftsMatches.length,
        latencyMs,
        topClause: clauses[0]?.sectionReference,
      },
      'Hybrid retrieval executed successfully'
    );

    return {
      clauses,
      denseCount: vectorMatches.length,
      sparseCount: ftsMatches.length,
      latencyMs,
      embeddingHash,
    };
  }
}
