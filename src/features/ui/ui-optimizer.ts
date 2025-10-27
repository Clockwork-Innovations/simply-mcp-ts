/**
 * UI Optimizer - Apply production optimizations to UI resources
 *
 * Orchestrates minification, CDN preparation, and performance tracking
 * for UI resources before they are served to clients.
 *
 * This module coordinates:
 * - Minification (HTML/CSS/JS)
 * - CDN resource preparation (SRI, compression)
 * - Performance metrics collection
 *
 * Zero-weight: Only loaded when optimizations are explicitly enabled.
 *
 * @module ui-optimizer
 */

import type { ParsedUI } from '../../server/parser.js';

/**
 * Optimization result
 */
export interface OptimizationResult {
  /**
   * Optimized HTML content
   */
  html: string;

  /**
   * Performance metrics (if tracking enabled)
   */
  metrics?: {
    originalSize: number;
    optimizedSize: number;
    savings: number;
    savingsPercent: number;
    duration: number;
  };
}

/**
 * Apply all optimizations to HTML content
 *
 * Coordinates the optimization pipeline:
 * 1. Minification (if enabled)
 * 2. Performance tracking (if enabled)
 *
 * @param html - HTML content to optimize
 * @param ui - Parsed UI configuration
 * @returns Optimization result with metrics
 *
 * @example
 * ```typescript
 * const result = await optimizeHTML(htmlContent, {
 *   minify: true,
 *   performance: { track: true }
 * });
 * console.log(`Saved ${result.metrics.savingsPercent}%`);
 * ```
 */
export async function optimizeHTML(
  html: string,
  ui: ParsedUI
): Promise<OptimizationResult> {
  const startTime = Date.now();
  const originalSize = Buffer.byteLength(html, 'utf8');

  let optimizedHTML = html;
  let minificationSavings = 0;

  // Step 1: Minification (if enabled)
  if (ui.minify) {
    const { normalizeMinifyOptions, minifyDocument } = await import('./ui-minifier.js');
    const minifyOptions = normalizeMinifyOptions(ui.minify);

    if (minifyOptions.html || minifyOptions.css || minifyOptions.js) {
      const minified = await minifyDocument(optimizedHTML, minifyOptions);
      optimizedHTML = minified.code;
      minificationSavings = minified.savings;
    }
  }

  // Step 2: Performance tracking (if enabled)
  if (ui.performance) {
    const { normalizePerformanceOptions, getPerformanceTracker, trackPerformance } = await import(
      './ui-performance.js'
    );
    const perfOptions = normalizePerformanceOptions(ui.performance);

    if (perfOptions.track) {
      const tracker = getPerformanceTracker();
      if (!tracker.isEnabled()) {
        tracker.enable();
      }

      // Track minification performance
      if (ui.minify && minificationSavings > 0) {
        tracker.record({
          type: 'minification',
          resource: ui.uri,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
          size: {
            original: originalSize,
            processed: Buffer.byteLength(optimizedHTML, 'utf8'),
            savings: minificationSavings,
          },
        });
      }
    }
  }

  const optimizedSize = Buffer.byteLength(optimizedHTML, 'utf8');
  const totalSavings = originalSize - optimizedSize;
  const savingsPercent = originalSize > 0 ? (totalSavings / originalSize) * 100 : 0;

  return {
    html: optimizedHTML,
    metrics: {
      originalSize,
      optimizedSize,
      savings: totalSavings,
      savingsPercent,
      duration: Date.now() - startTime,
    },
  };
}

/**
 * Check if any optimization is enabled
 *
 * @param ui - Parsed UI configuration
 * @returns True if any optimization is enabled
 */
export function hasOptimizations(
  ui: Pick<ParsedUI, 'minify' | 'cdn' | 'performance'>
): boolean {
  return !!(ui.minify || ui.cdn || ui.performance);
}
