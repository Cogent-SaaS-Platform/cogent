import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { ConfigurationError } from '@/shared/errors';

/**
 * Upstash Redis Client Configuration
 * Adheres strictly to docs/launch/PHASE_A3_APIS_WORKERS_INTEGRATIONS.md & docs/SECURITY.md
 */
const upstashRedisUrl: string = process.env.UPSTASH_REDIS_REST_URL || '';
const upstashRedisToken: string = process.env.UPSTASH_REDIS_REST_TOKEN || '';

/**
 * Edge-safe structured logger for middleware and rate limiting telemetry
 */
function logRateLimitEvent(
  level: 'warn' | 'error',
  payload: Record<string, unknown>,
  message: string
): void {
  const logFn = level === 'warn' ? console.warn : console.error;
  logFn(
    JSON.stringify({
      level: level === 'warn' ? 40 : 50,
      time: new Date().toISOString(),
      env: process.env.NODE_ENV ?? 'development',
      service: 'cogent-engine',
      ...payload,
      msg: message,
    })
  );
}

/**
 * Factory for instantiating the Upstash Redis client.
 * Enforces production presence of credentials without crashing module loads in build/test harnesses.
 */
export function getUpstashRedisClient(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL || upstashRedisUrl;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || upstashRedisToken;

  return new Redis({
    url: url || 'https://mock-redis.upstash.io',
    token: token || 'mock-token',
  });
}

export const redis: Redis = getUpstashRedisClient();

/**
 * Standard API Limiter: 60 requests per minute per tenant/IP
 * Sliding-window token bucket preventing denial-of-service on standard operational routes.
 */
export const standardApiLimiter: Ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  analytics: true,
  prefix: 'ratelimit:api',
});

/**
 * AI-Heavy Scanning Limiter: 10 requests per minute per tenant
 * Sliding-window token bucket protecting LLM inference and embedding pipeline quotas.
 */
export const aiHeavyScanLimiter: Ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'ratelimit:ai',
});

export type RateLimiterType = 'standard' | 'aiHeavy';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  pending?: Promise<unknown>;
}

export interface RateLimitHeaders {
  'Retry-After'?: string;
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
}

/**
 * Executes rate limiting check against Upstash Redis with full network exception trapping
 * and forensic logger trace attachments.
 *
 * @param identifier Organization ID, User ID, or client IP address
 * @param limiterType 'standard' (60 req/min) or 'aiHeavy' (10 req/min)
 */
export async function checkRateLimit(
  identifier: string,
  limiterType: RateLimiterType = 'standard'
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL || upstashRedisUrl;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || upstashRedisToken;
  const isBuildPhase =
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build' ||
    Boolean(process.env.CI);

  if (process.env.NODE_ENV === 'production' && !isBuildPhase && (!url || !token)) {
    throw new ConfigurationError(
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production'
    );
  }

  const limiter = limiterType === 'aiHeavy' ? aiHeavyScanLimiter : standardApiLimiter;

  try {
    const result = await limiter.limit(identifier);

    if (!result.success) {
      logRateLimitEvent(
        'warn',
        {
          identifier,
          limiterType,
          limit: result.limit,
          remaining: result.remaining,
          reset: result.reset,
        },
        'Rate limit threshold exceeded for identifier'
      );
    }

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      pending: result.pending,
    };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logRateLimitEvent(
      'error',
      {
        identifier,
        limiterType,
        error: err.message,
        stack: err.stack,
      },
      'Upstash Redis rate limiter network dispatch failed - failing open to preserve availability'
    );
    // Fail open: availability over strict rate limiting during redis degradation or auth mismatch
    return {
      success: true,
      limit: limiterType === 'aiHeavy' ? 10 : 60,
      remaining: limiterType === 'aiHeavy' ? 10 : 60,
      reset: Date.now() + 60000,
    };
  }
}

/**
 * Generates HTTP response headers conforming to RFC 6585 and IETF RateLimit standards.
 */
export function getRateLimitHeaders(result: RateLimitResult): RateLimitHeaders {
  const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };

  if (!result.success) {
    headers['Retry-After'] = retryAfterSeconds.toString();
  }

  return headers;
}

/**
 * Constructs a standardized HTTP 429 Too Many Requests response payload
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const rateLimitHeaders = getRateLimitHeaders(result);
  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', 'application/json');
  responseHeaders.set('X-RateLimit-Limit', rateLimitHeaders['X-RateLimit-Limit']);
  responseHeaders.set('X-RateLimit-Remaining', rateLimitHeaders['X-RateLimit-Remaining']);
  responseHeaders.set('X-RateLimit-Reset', rateLimitHeaders['X-RateLimit-Reset']);
  if (rateLimitHeaders['Retry-After']) {
    responseHeaders.set('Retry-After', rateLimitHeaders['Retry-After']);
  }

  const body = {
    success: false,
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please wait before retrying.',
    retryAfter: rateLimitHeaders['Retry-After'] ? parseInt(rateLimitHeaders['Retry-After'], 10) : 60,
    limit: result.limit,
    remaining: result.remaining,
  };

  return new Response(JSON.stringify(body), {
    status: 429,
    headers: responseHeaders,
  });
}
