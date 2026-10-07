import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { ConfigurationError } from '@/shared/errors';
import { AiEngine } from '@/shared/ai-engine';
import { logger } from '@/shared/logger';
import { ExtractedPolicyClause, PolicyClauseMatch } from '../types';

export interface IndexPolicyClausesParams {
  organizationId: string;
  policyId: string;
  clauses: ExtractedPolicyClause[];
}

/**
 * Policy Clause Vector Indexing & RLS Isolation Service (Epic 15 / Tasks 15.1 & 15.2)
 * Embeds clauses using 768d gemini-embedding-2, persists with denormalized organization_id,
 * and executes tenant-isolated vector searches.
 */
export class PolicyVectorIndexService {
  private dbClient: SupabaseClient<Database>;
  private aiEngine: AiEngine;

  constructor(options: {
    dbClient: SupabaseClient<Database>;
    aiEngine?: AiEngine;
  } | SupabaseClient<Database>) {
    const client = options && 'dbClient' in options ? options.dbClient : (options as SupabaseClient<Database>);
    if (!client) {
      throw new ConfigurationError('PolicyVectorIndexService requires an RLS-bound SupabaseClient');
    }
    this.dbClient = client;
    this.aiEngine = (options && 'aiEngine' in options && options.aiEngine) ? options.aiEngine : new AiEngine();
  }

  /**
   * Generates 768d vector embeddings and indexes clauses into policy_clauses table
   */
  public async indexPolicyClauses(params: IndexPolicyClausesParams): Promise<{
    indexedCount: number;
    clauseIds: string[];
  }> {
    const { organizationId, policyId, clauses } = params;
    logger.info(
      { organizationId, policyId, clausesCount: clauses.length },
      'Starting policy clause vector indexing'
    );

    const clauseRecords: {
      organization_id: string;
      policy_id: string;
      section_number: string;
      clause_text: string;
      embedding: number[] | null;
    }[] = [];

    for (const clause of clauses) {
      let embedding: number[] | null = null;
      try {
        const textToEmbed = `${clause.sectionNumber}: ${clause.heading}\n${clause.clauseText}`;
        embedding = await this.aiEngine.generateEmbedding(textToEmbed);
      } catch (err) {
        logger.warn(
          { section: clause.sectionNumber, err: String(err) },
          'Failed to generate embedding for clause; storing without vector'
        );
      }

      clauseRecords.push({
        organization_id: organizationId,
        policy_id: policyId,
        section_number: clause.sectionNumber,
        clause_text: clause.clauseText,
        embedding,
      });
    }

    if (!this.dbClient) {
      logger.warn('No database client available, skipping database persistence of policy clauses');
      return { indexedCount: clauseRecords.length, clauseIds: [] };
    }

    // Bulk insert into policy_clauses with denormalized organization_id
    const { data, error } = await this.dbClient
      .from('policy_clauses')
      .insert(clauseRecords as any)
      .select('id');

    if (error) {
      logger.error({ error: error.message }, 'Failed to insert policy clauses into database');
      throw new Error(`Policy clauses indexing failed: ${error.message}`);
    }

    const clauseIds = (data || []).map((row: any) => row.id);
    logger.info(
      { organizationId, policyId, indexedCount: clauseIds.length },
      'Policy clauses indexed successfully'
    );

    return {
      indexedCount: clauseIds.length,
      clauseIds,
    };
  }

  /**
   * Searches tenant policy clauses for a given query embedding or text
   */
  public async searchSimilarClauses(params: {
    organizationId: string;
    policyId: string;
    queryText?: string;
    queryEmbedding?: number[];
    matchThreshold?: number;
    matchCount?: number;
  }): Promise<PolicyClauseMatch[]> {
    const {
      organizationId,
      policyId,
      queryText,
      matchThreshold = 0.1,
      matchCount = 3,
    } = params;

    let queryEmbedding = params.queryEmbedding;
    if (!queryEmbedding && queryText) {
      try {
        queryEmbedding = await this.aiEngine.generateEmbedding(queryText);
      } catch (err) {
        logger.warn({ err: String(err) }, 'Failed to generate query embedding');
      }
    }

    if (!this.dbClient || !queryEmbedding) {
      return [];
    }

    const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    if (!isUuid(organizationId) || !isUuid(policyId)) {
      return this.fallbackKeywordSearch(organizationId, policyId, queryText || '', matchCount);
    }

    try {
      const { data, error } = await (this.dbClient as any).rpc('match_policy_clauses', {
        p_organization_id: organizationId,
        p_policy_id: policyId,
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
      });

      if (error) {
        logger.warn({ error: error.message }, 'RPC match_policy_clauses failed; falling back to text query');
        return this.fallbackKeywordSearch(organizationId, policyId, queryText || '', matchCount);
      }

      return (data || []).map((row: any) => ({
        policyClauseId: row.id,
        sectionNumber: row.section_number,
        clauseText: row.clause_text,
        similarity: row.similarity,
      }));
    } catch (err) {
      logger.warn({ err: String(err) }, 'Error querying policy clauses vector index');
      return [];
    }
  }

  private async fallbackKeywordSearch(
    organizationId: string,
    policyId: string,
    queryText: string,
    limit: number
  ): Promise<PolicyClauseMatch[]> {
    if (!this.dbClient) return [];

    const { data } = await this.dbClient
      .from('policy_clauses')
      .select('id, section_number, clause_text')
      .eq('organization_id', organizationId)
      .eq('policy_id', policyId)
      .limit(limit);

    return (data || []).map((row: any) => ({
      policyClauseId: row.id,
      sectionNumber: row.section_number,
      clauseText: row.clause_text,
      similarity: 0.5,
    }));
  }
}
