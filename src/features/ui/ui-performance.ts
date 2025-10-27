/**
 * UI Performance - Performance metrics collection and tracking
 *
 * Tracks UI compilation and bundling performance metrics:
 * - Bundle sizes (original, minified, compressed)
 * - Compilation times (parsing, compilation, bundling)
 * - Cache hit rates
 * - Minification/compression savings
 *
 * Zero-weight: Only loaded when performance tracking is enabled.
 *
 * @module ui-performance
 */

/**
 * Performance metric types
 */
export type MetricType =
  | 'compilation'
  | 'bundling'
  | 'minification'
  | 'compression'
  | 'cache';

/**
 * Performance metric entry
 */
export interface PerformanceMetric {
  /**
   * Metric type
   */
  type: MetricType;

  /**
   * Resource identifier (file path or URI)
   */
  resource: string;

  /**
   * Timestamp when metric was recorded
   */
  timestamp: number;

  /**
   * Duration in milliseconds
   */
  duration?: number;

  /**
   * Size metrics (in bytes)
   */
  size?: {
    original?: number;
    processed?: number;
    savings?: number;
  };

  /**
   * Cache metrics
   */
  cache?: {
    hit: boolean;
    key: string;
  };

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Performance summary statistics
 */
export interface PerformanceSummary {
  /**
   * Total number of metrics recorded
   */
  totalMetrics: number;

  /**
   * Total compilation time (ms)
   */
  totalCompilationTime: number;

  /**
   * Total bundling time (ms)
   */
  totalBundlingTime: number;

  /**
   * Total minification time (ms)
   */
  totalMinificationTime: number;

  /**
   * Total compression time (ms)
   */
  totalCompressionTime: number;

  /**
   * Cache statistics
   */
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };

  /**
   * Size statistics (bytes)
   */
  size: {
    totalOriginal: number;
    totalProcessed: number;
    totalSavings: number;
    savingsPercent: number;
  };

  /**
   * Average metrics
   */
  averages: {
    compilationTime: number;
    bundlingTime: number;
    minificationTime: number;
    compressionTime: number;
  };
}

/**
 * Performance threshold configuration
 */
export interface PerformanceThresholds {
  /**
   * Maximum bundle size in bytes
   * @default 500000 (500 KB)
   */
  maxBundleSize?: number;

  /**
   * Maximum compilation time in milliseconds
   * @default 5000 (5 seconds)
   */
  maxCompilationTime?: number;

  /**
   * Minimum cache hit rate (0-1)
   * @default 0.7 (70%)
   */
  minCacheHitRate?: number;

  /**
   * Minimum compression savings (0-1)
   * @default 0.2 (20%)
   */
  minCompressionSavings?: number;
}

/**
 * Performance options
 */
export interface PerformanceOptions {
  /**
   * Enable performance tracking
   * @default false
   */
  track?: boolean;

  /**
   * Enable performance reporting
   * @default false
   */
  report?: boolean;

  /**
   * Performance thresholds for warnings
   */
  thresholds?: PerformanceThresholds;

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;
}

/**
 * Performance tracker singleton
 */
class PerformanceTracker {
  private metrics: PerformanceMetric[] = [];
  private enabled = false;

  /**
   * Enable performance tracking
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable performance tracking
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Check if tracking is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Record a performance metric
   */
  record(metric: PerformanceMetric): void {
    if (!this.enabled) return;
    this.metrics.push(metric);
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by type
   */
  getMetricsByType(type: MetricType): PerformanceMetric[] {
    return this.metrics.filter((m) => m.type === type);
  }

  /**
   * Get metrics by resource
   */
  getMetricsByResource(resource: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.resource === resource);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get performance summary
   */
  getSummary(): PerformanceSummary {
    const compilationMetrics = this.getMetricsByType('compilation');
    const bundlingMetrics = this.getMetricsByType('bundling');
    const minificationMetrics = this.getMetricsByType('minification');
    const compressionMetrics = this.getMetricsByType('compression');
    const cacheMetrics = this.getMetricsByType('cache');

    // Calculate totals
    const totalCompilationTime = compilationMetrics.reduce(
      (sum, m) => sum + (m.duration || 0),
      0
    );
    const totalBundlingTime = bundlingMetrics.reduce(
      (sum, m) => sum + (m.duration || 0),
      0
    );
    const totalMinificationTime = minificationMetrics.reduce(
      (sum, m) => sum + (m.duration || 0),
      0
    );
    const totalCompressionTime = compressionMetrics.reduce(
      (sum, m) => sum + (m.duration || 0),
      0
    );

    // Calculate cache stats
    const cacheHits = cacheMetrics.filter((m) => m.cache?.hit).length;
    const cacheMisses = cacheMetrics.filter((m) => !m.cache?.hit).length;
    const totalCacheAccesses = cacheHits + cacheMisses;
    const cacheHitRate = totalCacheAccesses > 0 ? cacheHits / totalCacheAccesses : 0;

    // Calculate size stats
    let totalOriginal = 0;
    let totalProcessed = 0;

    for (const metric of this.metrics) {
      if (metric.size) {
        totalOriginal += metric.size.original || 0;
        totalProcessed += metric.size.processed || 0;
      }
    }

    const totalSavings = totalOriginal - totalProcessed;
    const savingsPercent = totalOriginal > 0 ? (totalSavings / totalOriginal) * 100 : 0;

    return {
      totalMetrics: this.metrics.length,
      totalCompilationTime,
      totalBundlingTime,
      totalMinificationTime,
      totalCompressionTime,
      cache: {
        hits: cacheHits,
        misses: cacheMisses,
        hitRate: cacheHitRate,
      },
      size: {
        totalOriginal,
        totalProcessed,
        totalSavings,
        savingsPercent,
      },
      averages: {
        compilationTime:
          compilationMetrics.length > 0
            ? totalCompilationTime / compilationMetrics.length
            : 0,
        bundlingTime:
          bundlingMetrics.length > 0 ? totalBundlingTime / bundlingMetrics.length : 0,
        minificationTime:
          minificationMetrics.length > 0
            ? totalMinificationTime / minificationMetrics.length
            : 0,
        compressionTime:
          compressionMetrics.length > 0
            ? totalCompressionTime / compressionMetrics.length
            : 0,
      },
    };
  }

  /**
   * Check if metrics exceed thresholds
   */
  checkThresholds(thresholds: PerformanceThresholds): string[] {
    const warnings: string[] = [];
    const summary = this.getSummary();

    // Check bundle size
    if (thresholds.maxBundleSize) {
      const oversizedBundles = this.metrics.filter(
        (m) =>
          m.type === 'bundling' &&
          m.size?.processed &&
          m.size.processed > thresholds.maxBundleSize!
      );

      for (const bundle of oversizedBundles) {
        warnings.push(
          `Bundle size exceeds threshold: ${bundle.resource} ` +
            `(${bundle.size!.processed} bytes > ${thresholds.maxBundleSize} bytes)`
        );
      }
    }

    // Check compilation time
    if (thresholds.maxCompilationTime) {
      const slowCompilations = this.metrics.filter(
        (m) =>
          (m.type === 'compilation' || m.type === 'bundling') &&
          m.duration &&
          m.duration > thresholds.maxCompilationTime!
      );

      for (const compilation of slowCompilations) {
        warnings.push(
          `Compilation time exceeds threshold: ${compilation.resource} ` +
            `(${compilation.duration}ms > ${thresholds.maxCompilationTime}ms)`
        );
      }
    }

    // Check cache hit rate
    if (thresholds.minCacheHitRate && summary.cache.hitRate < thresholds.minCacheHitRate) {
      warnings.push(
        `Cache hit rate below threshold: ${(summary.cache.hitRate * 100).toFixed(1)}% ` +
          `< ${(thresholds.minCacheHitRate * 100).toFixed(1)}%`
      );
    }

    // Check compression savings
    if (
      thresholds.minCompressionSavings &&
      summary.size.savingsPercent < thresholds.minCompressionSavings * 100
    ) {
      warnings.push(
        `Compression savings below threshold: ${summary.size.savingsPercent.toFixed(1)}% ` +
          `< ${(thresholds.minCompressionSavings * 100).toFixed(1)}%`
      );
    }

    return warnings;
  }
}

/**
 * Global performance tracker instance
 */
const performanceTracker = new PerformanceTracker();

/**
 * Get the global performance tracker
 *
 * @returns Performance tracker instance
 *
 * @example
 * ```typescript
 * const tracker = getPerformanceTracker();
 * tracker.enable();
 * tracker.record({
 *   type: 'compilation',
 *   resource: './Counter.tsx',
 *   timestamp: Date.now(),
 *   duration: 150
 * });
 * ```
 */
export function getPerformanceTracker(): PerformanceTracker {
  return performanceTracker;
}

/**
 * Start tracking a performance metric
 *
 * Returns a function to complete the metric with final measurements.
 *
 * @param type - Metric type
 * @param resource - Resource identifier
 * @returns Function to complete the metric
 *
 * @example
 * ```typescript
 * const complete = trackPerformance('compilation', './App.tsx');
 * // ... perform compilation ...
 * complete({ size: { original: 1000, processed: 800 } });
 * ```
 */
export function trackPerformance(
  type: MetricType,
  resource: string
): (data?: Partial<PerformanceMetric>) => void {
  const startTime = Date.now();

  return (data?: Partial<PerformanceMetric>) => {
    const duration = Date.now() - startTime;

    const metric: PerformanceMetric = {
      type,
      resource,
      timestamp: startTime,
      duration,
      ...data,
    };

    performanceTracker.record(metric);
  };
}

/**
 * Record a cache access metric
 *
 * @param resource - Resource identifier
 * @param hit - Whether it was a cache hit
 * @param key - Cache key
 *
 * @example
 * ```typescript
 * recordCacheAccess('./Counter.tsx', true, 'Counter.tsx');
 * recordCacheAccess('./Dashboard.tsx', false, 'Dashboard.tsx');
 * ```
 */
export function recordCacheAccess(resource: string, hit: boolean, key: string): void {
  performanceTracker.record({
    type: 'cache',
    resource,
    timestamp: Date.now(),
    cache: { hit, key },
  });
}

/**
 * Normalize performance options
 *
 * Converts boolean or object performance configuration to full PerformanceOptions.
 *
 * @param performance - Performance configuration from IUI interface
 * @returns Normalized PerformanceOptions
 *
 * @example
 * ```typescript
 * normalizePerformanceOptions(true); // { track: true, report: true }
 * normalizePerformanceOptions({ track: true }); // { track: true, report: false }
 * ```
 */
export function normalizePerformanceOptions(
  performance?: boolean | Partial<PerformanceOptions>
): PerformanceOptions {
  if (performance === true) {
    return { track: true, report: true };
  }
  if (performance === false || performance === undefined) {
    return { track: false, report: false };
  }
  return {
    track: performance.track ?? true,
    report: performance.report ?? false,
    thresholds: performance.thresholds,
    verbose: performance.verbose ?? false,
  };
}
