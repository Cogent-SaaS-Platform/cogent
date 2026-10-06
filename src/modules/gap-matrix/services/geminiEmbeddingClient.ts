import { AiEngine } from '@/shared/ai-engine';
import { AI_MODELS } from '@/shared/ai-engine/config/modelConfig';
import { logger } from '@/shared/logger';

/**
 * Dedicated Google Gemini Embedding Client for Pillar 3 (Pillar 3.2 pgvector Indexer)
 * Computes 768-dimensional multimodal vector embeddings using Google gemini-embedding-2.
 * Adheres to docs/PILLAR_3_5W_GAP_MATRIX.md Section 2 and docs/DATA_MODEL.md Section 8.
 */
export class GeminiEmbeddingClient {
  private aiEngine: AiEngine;

  constructor(aiEngine?: AiEngine) {
    this.aiEngine = aiEngine || new AiEngine();
  }

  /**
   * Generates a 768-dimensional vector embedding for a given text snippet using gemini-embedding-2
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text content');
    }

    try {
      const vector = await this.aiEngine.generateEmbedding(text);
      if (!vector || vector.length !== 768) {
        throw new Error(`Embedding model returned invalid vector dimension: expected 768, got ${vector?.length || 0}`);
      }
      return vector;
    } catch (err: unknown) {
      logger.error(
        {
          model: AI_MODELS.EMBEDDING_MODEL,
          textLength: text.length,
          err: err instanceof Error ? err.message : String(err),
        },
        'Gemini embedding client failed to compute 768d vector'
      );
      throw err;
    }
  }

  /**
   * Generates embeddings in batch with rate-limit friendly sequencing
   */
  public async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = [];
    for (const text of texts) {
      const vector = await this.generateEmbedding(text);
      vectors.push(vector);
    }
    return vectors;
  }

  /**
   * Calculates cosine similarity between two 768-dimensional vectors
   */
  public static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const defaultGeminiEmbeddingClient = new GeminiEmbeddingClient();
