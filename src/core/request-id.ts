/**
 * Request ID Generation Utilities
 *
 * Provides cryptographically random UUID v4 generation for request tracking
 */

import { randomUUID } from 'node:crypto';

/**
 * Generate a unique request ID
 *
 * Uses UUID v4 (random) for cryptographically secure unique identifiers.
 * Each request gets a fresh ID for tracking and correlation.
 *
 * @returns A UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 *
 * @example
 * ```typescript
 * const requestId = generateRequestId();
 * console.log(requestId); // "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 * ```
 */
export function generateRequestId(): string {
  return randomUUID();
}
