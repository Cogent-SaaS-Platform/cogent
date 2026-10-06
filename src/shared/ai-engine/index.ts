/**
 * Core AI Engine Abstraction for Cogent
 * Coordinates model routing, schema validation, exponential retry, and audit hashing
 * Adheres to docs/AI_ENGINE.md and docs/ENGINEERING.md Section 6
 */

import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import { z } from 'zod';
import { AI_MODELS, AI_RESILIENCE_CONFIG } from './config/modelConfig';
import { AiProviderError, AiTimeoutError, ValidationError } from '@/shared/errors';
import { logger } from '@/shared/logger';

export interface AiExecutionTelemetry {
  modelIdentifier: string;
  inputTokenCount: number;
  outputTokenCount: number;
  latencyMs: number;
  rawPromptHash: string;
  rawOutputHash: string;
  retryAttempts: number;
}

export interface AiExecutionResult<T> {
  data: T;
  telemetry: AiExecutionTelemetry;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripMarkdownCodeBlocks(raw: string): string {
  let clean = raw.trim();
  if (clean.startsWith('```json')) {
    clean = clean.slice(7);
  } else if (clean.startsWith('```')) {
    clean = clean.slice(3);
  }
  if (clean.endsWith('```')) {
    clean = clean.slice(0, -3);
  }
  return clean.trim();
}

function isTransientError(err: unknown): boolean {
  if (!err) return false;
  const str = String(err);
  return (
    str.includes('503') ||
    str.includes('429') ||
    str.includes('UNAVAILABLE') ||
    str.includes('high demand') ||
    str.includes('RESOURCE_EXHAUSTED') ||
    str.includes('fetch failed') ||
    str.includes('Connect Timeout') ||
    str.includes('UND_ERR_CONNECT_TIMEOUT') ||
    str.includes('ECONNRESET') ||
    str.includes('ETIMEDOUT')
  );
}

export class AiEngine {
  private ai: GoogleGenAI;
  private defaultApiKey: string;

  constructor(apiKey?: string) {
    this.defaultApiKey = apiKey || process.env.GEMINI_API_KEY || '';
    if (!this.defaultApiKey) {
      logger.warn('AiEngine initialized without GEMINI_API_KEY. Calls will fail unless provided per request.');
    }
    this.ai = new GoogleGenAI({ apiKey: this.defaultApiKey });
  }

  public static hashContent(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Executes structured generation with exponential backoff for transient 503/429 errors
   */
  public async generateStructured<T>(params: {
    systemInstruction?: string;
    prompt: string;
    schema: z.ZodSchema<T>;
    modelAlias?: keyof typeof AI_MODELS;
    timeoutMs?: number;
  }): Promise<AiExecutionResult<T>> {
    const modelKey = params.modelAlias || 'FAST_MODEL';
    let modelName: string = AI_MODELS[modelKey];
    const timeout =
      params.timeoutMs ||
      (modelKey === 'FAST_MODEL'
        ? AI_RESILIENCE_CONFIG.TIMEOUTS.FAST_MODEL_MS
        : AI_RESILIENCE_CONFIG.TIMEOUTS.REASONING_MODEL_MS);

    const promptHash = AiEngine.hashContent(params.prompt);
    let lastError: unknown;
    let attemptsUsed = 0;

    for (let attempt = 1; attempt <= AI_RESILIENCE_CONFIG.RETRY.MAX_RETRIES; attempt++) {
      attemptsUsed = attempt;
      const startTime = performance.now();

      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new AiTimeoutError(modelName, timeout));
        }, timeout);
      });

      try {
        const apiCallPromise = this.ai.models.generateContent({
          model: modelName,
          contents: params.prompt,
          config: {
            systemInstruction: params.systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const response = await Promise.race([apiCallPromise, timeoutPromise]);
        clearTimeout(timeoutId);
        const latencyMs = Math.round(performance.now() - startTime);

        const rawText = response.text || '{}';
        const outputHash = AiEngine.hashContent(rawText);
        const cleanJson = stripMarkdownCodeBlocks(rawText);

        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(cleanJson);
        } catch (jsonErr) {
          throw new ValidationError('Failed to parse AI output as valid JSON', {
            rawOutput: rawText,
            error: String(jsonErr),
          });
        }

        const parseResult = params.schema.safeParse(parsedJson);
        if (!parseResult.success) {
          throw new ValidationError('AI response failed schema validation', {
            issues: parseResult.error.issues,
            rawOutput: rawText,
          });
        }

        const usage = response.usageMetadata;
        const telemetry: AiExecutionTelemetry = {
          modelIdentifier: modelName,
          inputTokenCount: usage?.promptTokenCount || 0,
          outputTokenCount: usage?.candidatesTokenCount || 0,
          latencyMs,
          rawPromptHash: promptHash,
          rawOutputHash: outputHash,
          retryAttempts: attempt - 1,
        };

        return {
          data: parseResult.data,
          telemetry,
        };
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        lastError = err;

        if (err instanceof ValidationError) {
          throw err;
        }

        const isTimeout = err instanceof AiTimeoutError;
        const errStr = String(err);
        if (
          (isTimeout ||
            errStr.includes('RESOURCE_EXHAUSTED') ||
            errStr.includes('429') ||
            errStr.includes('Quota exceeded') ||
            errStr.includes('503') ||
            errStr.includes('UNAVAILABLE') ||
            errStr.includes('high demand')) &&
          modelName !== AI_MODELS.FALLBACK_MODEL
        ) {
          logger.warn(
            { originalModel: modelName, fallbackModel: AI_MODELS.FALLBACK_MODEL, reason: isTimeout ? 'timeout' : 'rate-limit/error' },
            'Model quota exceeded, timeout, or rate-limited; failing over to fallback model'
          );
          modelName = AI_MODELS.FALLBACK_MODEL;
          await sleep(500);
          continue;
        }

        if (isTransientError(err) && attempt < AI_RESILIENCE_CONFIG.RETRY.MAX_RETRIES) {
          const delay = AI_RESILIENCE_CONFIG.RETRY.INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
          logger.warn(
            `Transient error on model ${modelName} (attempt ${attempt}/${AI_RESILIENCE_CONFIG.RETRY.MAX_RETRIES}). Retrying in ${delay}ms...`
          );
          await sleep(delay);
          continue;
        }

        if (err instanceof AiTimeoutError) {
          if (attempt < AI_RESILIENCE_CONFIG.RETRY.MAX_RETRIES) {
            const delay = AI_RESILIENCE_CONFIG.RETRY.INITIAL_DELAY_MS * attempt;
            logger.warn(
              `AI timeout on model ${modelName} (attempt ${attempt}/${AI_RESILIENCE_CONFIG.RETRY.MAX_RETRIES}). Retrying in ${delay}ms...`
            );
            await sleep(delay);
            continue;
          }
          throw err;
        }

        break;
      }
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError);
    throw new AiProviderError(
      `Google Gemini generation failed after ${attemptsUsed} attempt(s): ${message}`,
      { model: modelName, attemptsUsed },
      lastError
    );
  }

  /**
   * Generates a 768-dimensional vector embedding for a piece of text with retry resilience
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= AI_RESILIENCE_CONFIG.RETRY.MAX_RETRIES; attempt++) {
      try {
        const response = await this.ai.models.embedContent({
          model: AI_MODELS.EMBEDDING_MODEL,
          contents: text,
          config: {
            outputDimensionality: 768,
          },
        });

        const values = response.embeddings?.[0]?.values;
        if (!values || values.length !== 768) {
          throw new Error(`Expected 768d embedding vector, received ${values?.length || 0} dimensions`);
        }

        return values;
      } catch (err: unknown) {
        lastError = err;
        if (attempt < AI_RESILIENCE_CONFIG.RETRY.MAX_RETRIES) {
          await sleep(AI_RESILIENCE_CONFIG.RETRY.INITIAL_DELAY_MS * attempt);
          continue;
        }
      }
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError);
    throw new AiProviderError(`Gemini embedding generation failed: ${message}`, undefined, lastError);
  }
}

export * from './config/modelConfig';
export * from './schemas/marketingCandidateSchema';
export * from './prompts/marketingShieldPrompts';
