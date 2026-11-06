/**
 * Hybrid Statutory Retrieval Service (Pillar 1: Marketing Shield)
 * Combines pgvector cosine similarity (768d via gemini-embedding-2) and PostgreSQL full-text search (tsvector)
 * using Reciprocal Rank Fusion (RRF) for high-recall regulatory clause discovery.
 *
 * Strictly queries live relational database records (zero static seed fallbacks).
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
   * Performs hybrid retrieval over verified Nigerian regulatory clauses in the live database.
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

    // 1. Generate 768d vector embedding
    let embedding: number[] = [];
    try {
      embedding = await this.aiEngine.generateEmbedding(copyText);
    } catch (embErr) {
      logger.warn({ err: String(embErr) }, 'Embedding generation unavailable, relying on FTS and relational clause lookup');
    }
    const embeddingHash =
      embedding.length > 0
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
      logger.warn({ err }, 'Vector match RPC reported issue, relying on FTS and relational lookup');
    }

    if (ftsResult.status === 'rejected' || (ftsResult.status === 'fulfilled' && ftsResult.value.error)) {
      const err = ftsResult.status === 'rejected' ? ftsResult.reason : ftsResult.value.error;
      logger.warn({ err }, 'FTS match RPC reported issue, relying on vector and relational lookup');
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

    const sortedFused = Array.from(fusedMap.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, limit);

    let clauses: RetrievedStatutoryClause[] = sortedFused.map((item) => {
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

    // 4. Direct live relational lookup if RPC functions returned empty (e.g., strict regulator filter or sparse keywords)
    if (clauses.length === 0) {
      clauses = await this.retrieveLiveRelationalClauses(copyText, limit, options.filterRegulator);
    }

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

  /**
   * Queries live `regulatory_clauses` joined to binding `regulatory_instruments` in PostgreSQL.
   * Never uses static seed arrays.
   */
  private async retrieveLiveRelationalClauses(
    copyText: string,
    limit: number,
    filterRegulator?: RegulatorCode
  ): Promise<RetrievedStatutoryClause[]> {
    try {
      const { data: rows, error } = await this.dbClient
        .from('regulatory_clauses')
        .select(`
          id,
          section_reference,
          section_heading,
          clause_text,
          regulatory_document_versions!inner (
            regulatory_instruments!inner (
              title,
              short_name,
              is_binding,
              regulatory_bodies!inner (
                code
              )
            )
          )
        `)
        .eq('regulatory_document_versions.regulatory_instruments.is_binding', true)
        .limit(120);

      if (error || !rows || rows.length === 0) {
        if (error) {
          logger.error({ error }, 'Failed querying live regulatory_clauses in retrieveLiveRelationalClauses');
        }
        return [];
      }

      const keywords = copyText
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3);

      interface JoinedClauseRow {
        id: string;
        section_reference: string;
        section_heading: string | null;
        clause_text: string;
        regulatory_document_versions?: {
          regulatory_instruments?: {
            title?: string;
            short_name?: string;
            is_binding?: boolean;
            regulatory_bodies?: {
              code?: string;
            } | null;
          } | null;
        } | null;
      }

      const scored: Array<{ clause: RetrievedStatutoryClause; score: number }> = [];

      for (const rawRow of rows as unknown as JoinedClauseRow[]) {
        const inst = rawRow.regulatory_document_versions?.regulatory_instruments;
        const regCode = (inst?.regulatory_bodies?.code || 'CBN') as RegulatorCode;
        if (filterRegulator && regCode !== filterRegulator) continue;

        const corpus = `${rawRow.section_heading || ''} ${rawRow.clause_text || ''}`.toLowerCase();
        let score = 1;
        for (const kw of keywords) {
          if (corpus.includes(kw)) score += 2;
        }

        scored.push({
          score,
          clause: {
            clauseId: rawRow.id,
            sectionReference: rawRow.section_reference,
            sectionHeading: rawRow.section_heading || rawRow.section_reference,
            clauseText: rawRow.clause_text,
            similarity: 0,
            ftsRank: score,
            rrfScore: Number((score / (60 + score)).toFixed(6)),
            regulatorCode: regCode,
            instrumentTitle: inst?.title || regCode,
            instrumentShortName: inst?.short_name || regCode,
            retrievalSource: 'FTS_ONLY',
          },
        });
      }

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, limit).map((s) => s.clause);
    } catch (err) {
      logger.error({ err }, 'Unexpected error in retrieveLiveRelationalClauses');
      return [];
    }
  }
}
