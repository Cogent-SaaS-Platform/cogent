/**
 * AI Engine Model Configuration & Resilience Parameters
 * Adheres to docs/AI_ENGINE.md Section 2 and docs/adr/ADR-004-gemini-ai-routing.md
 */

export const AI_MODELS = {
  // High-throughput, sub-second latency for classification & candidate triage
  FAST_MODEL: process.env.AI_FAST_MODEL || 'gemini-3.8-flash',

  // High-reasoning engine for clause tension analysis, 5-W synthesis & rewrites
  REASONING_MODEL: process.env.AI_REASONING_MODEL || 'gemini-3.1-pro-preview',

  // Fallback model for resilience against regional 503 high-demand spikes and 429 quota limits
  FALLBACK_MODEL: process.env.AI_FALLBACK_MODEL || 'gemini-3.8-flash',

  // 768-dimensional multimodal vector embeddings (gemini-embedding-2)
  EMBEDDING_MODEL: process.env.AI_EMBEDDING_MODEL || 'gemini-embedding-2',
} as const;

export const AI_RESILIENCE_CONFIG = {
  // Hard timeouts per model tier (docs/ENGINEERING.md Section 6)
  TIMEOUTS: {
    FAST_MODEL_MS: 8000,
    REASONING_MODEL_MS: 15000,
    EMBEDDING_MODEL_MS: 8000,
  },

  // Exponential backoff configuration for HTTP 429 / 503
  RETRY: {
    MAX_RETRIES: 2,
    INITIAL_DELAY_MS: 500,
    MAX_DELAY_MS: 2000,
  },

  // Circuit breaker threshold
  CIRCUIT_BREAKER: {
    FAILURE_THRESHOLD_PERCENT: 15,
    ROLLING_WINDOW_MS: 120000, // 2 minutes
  },
} as const;
