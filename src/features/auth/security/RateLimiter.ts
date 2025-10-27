/**
 * Rate Limiting System
 *
 * Implements rate limiting with support for:
 * - Fixed window strategy
 * - Sliding window strategy
 * - Per-session rate limits
 * - Per-tool rate limits
 * - Clear error messages with retry-after information
 */

import { RateLimitConfig, RateLimitResult, RateLimitStrategy } from './types.js';

/**
 * Rate limit bucket for tracking requests
 */
interface RateLimitBucket {
  /** Request timestamps (for sliding window) */
  requests: number[];
  /** Window start time (for fixed window) */
  windowStart: number;
  /** Request count in current window */
  count: number;
}

/**
 * Rate limiter implementation
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private buckets: Map<string, RateLimitBucket>;
  private readonly strategy: RateLimitStrategy;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.buckets = new Map();
    this.strategy = config.strategy || 'fixed-window';

    // Clean up old buckets periodically
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Check if a request should be allowed
   */
  checkLimit(
    sessionId: string,
    toolName?: string
  ): RateLimitResult {
    if (!this.config.enabled) {
      return {
        allowed: true,
        currentRequests: 0,
        maxRequests: Infinity,
        resetTime: 0,
      };
    }

    // Get rate limit configuration (per-tool or global)
    const limit = this.getLimit(toolName);
    const key = this.getKey(sessionId, toolName);

    // Check using the configured strategy
    if (this.strategy === 'sliding-window') {
      return this.checkSlidingWindow(key, limit.window, limit.maxRequests);
    } else {
      return this.checkFixedWindow(key, limit.window, limit.maxRequests);
    }
  }

  /**
   * Record a request (call after checking limit)
   */
  recordRequest(sessionId: string, toolName?: string): void {
    if (!this.config.enabled) {
      return;
    }

    const limit = this.getLimit(toolName);
    const key = this.getKey(sessionId, toolName);

    if (this.strategy === 'sliding-window') {
      this.recordSlidingWindow(key);
    } else {
      this.recordFixedWindow(key);
    }
  }

  /**
   * Fixed window rate limiting
   */
  private checkFixedWindow(
    key: string,
    window: number,
    maxRequests: number
  ): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        requests: [],
        windowStart: now,
        count: 0,
      };
      this.buckets.set(key, bucket);
    }

    // Check if we need to reset the window
    if (now - bucket.windowStart >= window) {
      bucket.windowStart = now;
      bucket.count = 0;
    }

    const allowed = bucket.count < maxRequests;
    const resetTime = bucket.windowStart + window - now;
    const retryAfter = allowed ? undefined : Math.ceil(resetTime / 1000);

    return {
      allowed,
      currentRequests: bucket.count,
      maxRequests,
      resetTime,
      retryAfter,
    };
  }

  /**
   * Record request for fixed window
   */
  private recordFixedWindow(key: string): void {
    const bucket = this.buckets.get(key);
    if (bucket) {
      bucket.count++;
    }
  }

  /**
   * Sliding window rate limiting (more accurate but slightly more expensive)
   */
  private checkSlidingWindow(
    key: string,
    window: number,
    maxRequests: number
  ): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        requests: [],
        windowStart: now,
        count: 0,
      };
      this.buckets.set(key, bucket);
    }

    // Remove requests outside the current window
    const windowStart = now - window;
    bucket.requests = bucket.requests.filter(timestamp => timestamp > windowStart);

    const currentRequests = bucket.requests.length;
    const allowed = currentRequests < maxRequests;

    // Calculate time until oldest request expires
    const oldestRequest = bucket.requests[0];
    const resetTime = oldestRequest ? oldestRequest + window - now : window;
    const retryAfter = allowed ? undefined : Math.ceil(resetTime / 1000);

    return {
      allowed,
      currentRequests,
      maxRequests,
      resetTime: Math.max(0, resetTime),
      retryAfter,
    };
  }

  /**
   * Record request for sliding window
   */
  private recordSlidingWindow(key: string): void {
    const bucket = this.buckets.get(key);
    if (bucket) {
      bucket.requests.push(Date.now());
    }
  }

  /**
   * Get rate limit configuration for a specific tool or global
   */
  private getLimit(toolName?: string): { window: number; maxRequests: number } {
    if (toolName && this.config.perTool?.[toolName]) {
      return this.config.perTool[toolName];
    }

    return {
      window: this.config.window,
      maxRequests: this.config.maxRequests,
    };
  }

  /**
   * Generate a unique key for rate limiting
   */
  private getKey(sessionId: string, toolName?: string): string {
    return toolName ? `${sessionId}:${toolName}` : `${sessionId}:global`;
  }

  /**
   * Clean up old buckets to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = Math.max(this.config.window * 2, 300000); // At least 5 minutes

    for (const [key, bucket] of this.buckets.entries()) {
      // For fixed window, check window start
      if (this.strategy === 'fixed-window') {
        if (now - bucket.windowStart > maxAge) {
          this.buckets.delete(key);
        }
      }
      // For sliding window, check if all requests are old
      else {
        const oldestRequest = bucket.requests[0];
        if (!oldestRequest || now - oldestRequest > maxAge) {
          this.buckets.delete(key);
        }
      }
    }
  }

  /**
   * Reset rate limits for a specific session
   */
  resetSession(sessionId: string): void {
    // Remove all buckets for this session
    for (const key of this.buckets.keys()) {
      if (key.startsWith(`${sessionId}:`)) {
        this.buckets.delete(key);
      }
    }
  }

  /**
   * Get current rate limit status for a session
   */
  getStatus(sessionId: string, toolName?: string): RateLimitResult {
    const limit = this.getLimit(toolName);
    const key = this.getKey(sessionId, toolName);
    const now = Date.now();

    const bucket = this.buckets.get(key);
    if (!bucket) {
      return {
        allowed: true,
        currentRequests: 0,
        maxRequests: limit.maxRequests,
        resetTime: limit.window,
      };
    }

    if (this.strategy === 'sliding-window') {
      const windowStart = now - limit.window;
      const validRequests = bucket.requests.filter(t => t > windowStart);
      const oldestRequest = validRequests[0];
      const resetTime = oldestRequest ? oldestRequest + limit.window - now : limit.window;

      return {
        allowed: validRequests.length < limit.maxRequests,
        currentRequests: validRequests.length,
        maxRequests: limit.maxRequests,
        resetTime: Math.max(0, resetTime),
      };
    } else {
      // Fixed window
      const resetTime = bucket.windowStart + limit.window - now;
      return {
        allowed: bucket.count < limit.maxRequests,
        currentRequests: bucket.count,
        maxRequests: limit.maxRequests,
        resetTime: Math.max(0, resetTime),
      };
    }
  }

  /**
   * Get statistics about rate limiting
   */
  getStatistics(): {
    totalBuckets: number;
    strategy: RateLimitStrategy;
    enabled: boolean;
  } {
    return {
      totalBuckets: this.buckets.size,
      strategy: this.strategy,
      enabled: this.config.enabled,
    };
  }
}

/**
 * Create a rate limit error message
 */
export function createRateLimitError(result: RateLimitResult): string {
  const retryAfter = result.retryAfter || Math.ceil(result.resetTime / 1000);
  return `Rate limit exceeded. ${result.currentRequests}/${result.maxRequests} requests used. Retry after ${retryAfter} seconds.`;
}