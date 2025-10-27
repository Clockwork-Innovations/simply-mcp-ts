/**
 * Performance optimization module for CLI
 * Provides caching and performance tracking for API style detection
 */

import { stat } from 'node:fs/promises';
import type { APIStyle } from './run.js';
import { detectAPIStyle as detectAPIStyleBase } from './run.js';

/**
 * Performance metrics for CLI operations
 */
export interface PerformanceMetrics {
  detection: number;
  load: number;
  total: number;
}

/**
 * Detection cache entry
 */
interface CacheEntry {
  style: APIStyle;
  mtime: number;
}

/**
 * In-memory cache for API style detection
 * Maps file path -> { style, mtime }
 */
const detectionCache = new Map<string, CacheEntry>();

/**
 * Performance tracking state
 */
let perfMetrics: PerformanceMetrics = {
  detection: 0,
  load: 0,
  total: 0,
};

/**
 * Detect the API style from a server file with caching
 * @param filePath Path to the server file
 * @param verbose Enable verbose logging
 * @returns Detected API style
 */
export async function detectAPIStyleCached(
  filePath: string,
  verbose = false
): Promise<APIStyle> {
  const startTime = performance.now();

  try {
    // Get file stats for cache validation
    const fileStats = await stat(filePath);
    const cached = detectionCache.get(filePath);

    // Check cache validity
    if (cached && cached.mtime === fileStats.mtimeMs) {
      const duration = performance.now() - startTime;
      perfMetrics.detection = duration;

      if (verbose) {
        console.error(`[Perf] Cache hit for ${filePath}: ${duration.toFixed(2)}ms`);
      }
      return cached.style;
    }

    // Cache miss - read and detect
    if (verbose && cached) {
      console.error(`[Perf] Cache invalidated (file modified): ${filePath}`);
    }

    const style = await detectAPIStyleBase(filePath);

    // Update cache
    detectionCache.set(filePath, {
      style,
      mtime: fileStats.mtimeMs,
    });

    const duration = performance.now() - startTime;
    perfMetrics.detection = duration;

    if (verbose) {
      console.error(`[Perf] Detection: ${duration.toFixed(2)}ms`);
    }

    return style;
  } catch (error) {
    throw error;
  }
}

/**
 * Get performance metrics
 * @returns Current performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  return { ...perfMetrics };
}

/**
 * Reset performance metrics
 */
export function resetPerformanceMetrics(): void {
  perfMetrics = {
    detection: 0,
    load: 0,
    total: 0,
  };
}

/**
 * Update performance metrics
 * @param metrics Partial metrics to update
 */
export function updatePerformanceMetrics(metrics: Partial<PerformanceMetrics>): void {
  perfMetrics = { ...perfMetrics, ...metrics };
}

/**
 * Clear detection cache
 */
export function clearDetectionCache(): void {
  detectionCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  entries: Array<{ file: string; style: APIStyle; mtime: number }>;
} {
  return {
    size: detectionCache.size,
    entries: Array.from(detectionCache.entries()).map(([file, { style, mtime }]) => ({
      file,
      style,
      mtime,
    })),
  };
}
