import {
  ExtractedPolicyClause,
  ExtractedPolicyStructure,
} from '../types';
import { OrgDepartment } from '@/shared/types';
import { logger } from '@/shared/logger';
import {
  PolicyStructureExtractor,
  defaultPolicyStructureExtractor,
  PolicyExtractionInput,
} from './policyStructureExtractor';
import {
  GeminiEmbeddingClient,
  defaultGeminiEmbeddingClient,
} from './geminiEmbeddingClient';
import { PolicyVectorIndexService } from './policyVectorIndexService';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { ConfigurationError } from '@/shared/errors';

export interface AtomicChunkingResult {
  title: string;
  department: OrgDepartment;
  versionTag: string;
  rawText: string;
  clauses: ExtractedPolicyClause[];
  indexedCount?: number;
  clauseIds?: string[];
}

export interface ParseAndIndexPolicyParams {
  organizationId: string;
  policyId: string;
  rawText?: string;
  fileBuffer?: Buffer | Uint8Array;
  fileName?: string;
  department?: OrgDepartment;
  versionTag?: string;
  title?: string;
}

/**
 * Atomic Policy Chunking & pgvector Indexer Service (Pillar 3.2)
 * Hierarchically parses uploaded policies (preserving section numbers, headings, and sub-clauses),
 * computes real 768-dimensional vector embeddings via gemini-embedding-2,
 * and indexes chunks in tenant-isolated policy_clauses.
 *
 * Adheres to docs/PILLAR_3_5W_GAP_MATRIX.md Section 2 and docs/DATA_MODEL.md Section 8.
 */
export class PolicyChunkerService {
  private extractor: PolicyStructureExtractor;
  private embeddingClient: GeminiEmbeddingClient;
  private vectorIndexService?: PolicyVectorIndexService;

  constructor(options?: {
    extractor?: PolicyStructureExtractor;
    embeddingClient?: GeminiEmbeddingClient;
    vectorIndexService?: PolicyVectorIndexService;
    dbClient?: SupabaseClient<Database>;
  }) {
    this.extractor = options?.extractor || defaultPolicyStructureExtractor;
    this.embeddingClient = options?.embeddingClient || defaultGeminiEmbeddingClient;
    if (options?.vectorIndexService) {
      this.vectorIndexService = options.vectorIndexService;
    } else if (options?.dbClient) {
      this.vectorIndexService = new PolicyVectorIndexService({ dbClient: options.dbClient });
    }
  }

  /**
   * Hierarchically parses an uploaded policy manual preserving section hierarchy
   */
  public async parsePolicy(input: PolicyExtractionInput): Promise<ExtractedPolicyStructure> {
    return this.extractor.extractStructure(input);
  }

  /**
   * Chunks policy text into atomic clauses preserving section numbers and headings
   */
  public chunkText(text: string): ExtractedPolicyClause[] {
    return this.extractor.chunkPolicyText(text);
  }

  /**
   * Parses policy text and executes pgvector indexing into policy_clauses
   */
  public async parseAndIndexPolicy(params: ParseAndIndexPolicyParams): Promise<AtomicChunkingResult> {
    const { organizationId, policyId, ...input } = params;

    logger.info(
      { organizationId, policyId, title: params.title || params.fileName },
      'Executing atomic policy chunking and pgvector indexing'
    );

    const structure = await this.extractor.extractStructure(input);

    if (!this.vectorIndexService) {
      throw new ConfigurationError('PolicyChunkerService requires an injected PolicyVectorIndexService or dbClient');
    }

    const indexResult = await this.vectorIndexService.indexPolicyClauses({
      organizationId,
      policyId,
      clauses: structure.clauses,
    });

    return {
      title: structure.title,
      department: structure.department,
      versionTag: structure.versionTag,
      rawText: structure.rawText,
      clauses: structure.clauses,
      indexedCount: indexResult.indexedCount,
      clauseIds: indexResult.clauseIds,
    };
  }
}
