/**
 * UI Performance Reporter - Performance report generation and formatting
 *
 * Generates human-readable performance reports from collected metrics.
 * Supports multiple output formats (console, JSON, markdown).
 *
 * @module ui-performance-reporter
 */

import type {
  PerformanceMetric,
  PerformanceSummary,
  PerformanceThresholds,
} from './ui-performance.js';
import { getPerformanceTracker } from './ui-performance.js';

/**
 * Report output format
 */
export type ReportFormat = 'console' | 'json' | 'markdown';

/**
 * Report options
 */
export interface ReportOptions {
  /**
   * Output format
   * @default 'console'
   */
  format?: ReportFormat;

  /**
   * Include individual metrics (not just summary)
   * @default false
   */
  includeMetrics?: boolean;

  /**
   * Include threshold warnings
   * @default true
   */
  includeWarnings?: boolean;

  /**
   * Performance thresholds for warnings
   */
  thresholds?: PerformanceThresholds;

  /**
   * Enable verbose output
   * @default false
   */
  verbose?: boolean;
}

/**
 * Performance report data structure
 */
export interface PerformanceReport {
  /**
   * Report timestamp
   */
  timestamp: number;

  /**
   * Performance summary
   */
  summary: PerformanceSummary;

  /**
   * Individual metrics (if included)
   */
  metrics?: PerformanceMetric[];

  /**
   * Threshold warnings (if any)
   */
  warnings?: string[];
}

/**
 * Format file size in human-readable format
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 KB", "2.3 MB")
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Format duration in human-readable format
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "150ms", "2.5s")
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Generate performance report
 *
 * Collects metrics from the performance tracker and generates a report.
 *
 * @param options - Report options
 * @returns Performance report data
 *
 * @example
 * ```typescript
 * const report = generatePerformanceReport({
 *   format: 'console',
 *   includeMetrics: true,
 *   thresholds: { maxBundleSize: 500000 }
 * });
 * ```
 */
export function generatePerformanceReport(
  options: ReportOptions = {}
): PerformanceReport {
  const {
    includeMetrics = false,
    includeWarnings = true,
    thresholds,
  } = options;

  const tracker = getPerformanceTracker();
  const summary = tracker.getSummary();

  const report: PerformanceReport = {
    timestamp: Date.now(),
    summary,
  };

  if (includeMetrics) {
    report.metrics = tracker.getMetrics();
  }

  if (includeWarnings && thresholds) {
    report.warnings = tracker.checkThresholds(thresholds);
  }

  return report;
}

/**
 * Format performance report as console output
 *
 * Generates a colorful, formatted console report with tables and metrics.
 *
 * @param report - Performance report data
 * @param options - Report options
 * @returns Formatted console output string
 */
export function formatConsoleReport(
  report: PerformanceReport,
  options: ReportOptions = {}
): string {
  const { verbose = false } = options;
  const { summary, warnings, metrics } = report;

  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push('═'.repeat(80));
  lines.push('  UI PERFORMANCE REPORT');
  lines.push('═'.repeat(80));
  lines.push('');

  // Summary Statistics
  lines.push('📊 SUMMARY STATISTICS');
  lines.push('─'.repeat(80));
  lines.push(`  Total Metrics:           ${summary.totalMetrics}`);
  lines.push('');

  // Timing
  lines.push('⏱️  TIMING');
  lines.push('─'.repeat(80));
  lines.push(`  Total Compilation:       ${formatDuration(summary.totalCompilationTime)}`);
  lines.push(`  Total Bundling:          ${formatDuration(summary.totalBundlingTime)}`);
  lines.push(`  Total Minification:      ${formatDuration(summary.totalMinificationTime)}`);
  lines.push(`  Total Compression:       ${formatDuration(summary.totalCompressionTime)}`);
  lines.push('');
  lines.push('  Averages:');
  lines.push(`    Compilation:           ${formatDuration(summary.averages.compilationTime)}`);
  lines.push(`    Bundling:              ${formatDuration(summary.averages.bundlingTime)}`);
  lines.push(`    Minification:          ${formatDuration(summary.averages.minificationTime)}`);
  lines.push(`    Compression:           ${formatDuration(summary.averages.compressionTime)}`);
  lines.push('');

  // Size
  lines.push('💾 SIZE');
  lines.push('─'.repeat(80));
  lines.push(`  Original Size:           ${formatSize(summary.size.totalOriginal)}`);
  lines.push(`  Processed Size:          ${formatSize(summary.size.totalProcessed)}`);
  lines.push(`  Total Savings:           ${formatSize(summary.size.totalSavings)} (${summary.size.savingsPercent.toFixed(1)}%)`);
  lines.push('');

  // Cache
  lines.push('🗄️  CACHE');
  lines.push('─'.repeat(80));
  lines.push(`  Hits:                    ${summary.cache.hits}`);
  lines.push(`  Misses:                  ${summary.cache.misses}`);
  lines.push(`  Hit Rate:                ${(summary.cache.hitRate * 100).toFixed(1)}%`);
  lines.push('');

  // Warnings
  if (warnings && warnings.length > 0) {
    lines.push('⚠️  WARNINGS');
    lines.push('─'.repeat(80));
    for (const warning of warnings) {
      lines.push(`  • ${warning}`);
    }
    lines.push('');
  }

  // Individual Metrics (verbose)
  if (verbose && metrics && metrics.length > 0) {
    lines.push('📋 INDIVIDUAL METRICS');
    lines.push('─'.repeat(80));

    const metricsByType = new Map<string, PerformanceMetric[]>();
    for (const metric of metrics) {
      if (!metricsByType.has(metric.type)) {
        metricsByType.set(metric.type, []);
      }
      metricsByType.get(metric.type)!.push(metric);
    }

    for (const [type, typeMetrics] of metricsByType) {
      lines.push(`  ${type.toUpperCase()}:`);
      for (const metric of typeMetrics) {
        const parts: string[] = [`    ${metric.resource}`];
        if (metric.duration) {
          parts.push(`[${formatDuration(metric.duration)}]`);
        }
        if (metric.size) {
          parts.push(
            `[${formatSize(metric.size.original || 0)} → ${formatSize(metric.size.processed || 0)}]`
          );
        }
        lines.push(parts.join(' '));
      }
      lines.push('');
    }
  }

  // Footer
  lines.push('═'.repeat(80));
  lines.push('');

  return lines.join('\n');
}

/**
 * Format performance report as JSON
 *
 * Generates a JSON representation of the performance report.
 *
 * @param report - Performance report data
 * @param options - Report options
 * @returns JSON string
 */
export function formatJSONReport(
  report: PerformanceReport,
  options: ReportOptions = {}
): string {
  const { verbose = false } = options;

  if (verbose) {
    return JSON.stringify(report, null, 2);
  }

  // Compact format (summary only)
  return JSON.stringify(
    {
      timestamp: report.timestamp,
      summary: report.summary,
      warnings: report.warnings,
    },
    null,
    2
  );
}

/**
 * Format performance report as Markdown
 *
 * Generates a Markdown document with performance metrics and charts.
 *
 * @param report - Performance report data
 * @param options - Report options
 * @returns Markdown string
 */
export function formatMarkdownReport(
  report: PerformanceReport,
  options: ReportOptions = {}
): string {
  const { verbose = false } = options;
  const { summary, warnings, metrics } = report;

  const lines: string[] = [];

  // Header
  lines.push('# UI Performance Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date(report.timestamp).toISOString()}`);
  lines.push('');

  // Summary
  lines.push('## Summary Statistics');
  lines.push('');
  lines.push(`- **Total Metrics:** ${summary.totalMetrics}`);
  lines.push('');

  // Timing
  lines.push('### Timing');
  lines.push('');
  lines.push('| Metric | Total | Average |');
  lines.push('|--------|-------|---------|');
  lines.push(
    `| Compilation | ${formatDuration(summary.totalCompilationTime)} | ${formatDuration(summary.averages.compilationTime)} |`
  );
  lines.push(
    `| Bundling | ${formatDuration(summary.totalBundlingTime)} | ${formatDuration(summary.averages.bundlingTime)} |`
  );
  lines.push(
    `| Minification | ${formatDuration(summary.totalMinificationTime)} | ${formatDuration(summary.averages.minificationTime)} |`
  );
  lines.push(
    `| Compression | ${formatDuration(summary.totalCompressionTime)} | ${formatDuration(summary.averages.compressionTime)} |`
  );
  lines.push('');

  // Size
  lines.push('### Size');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Original Size | ${formatSize(summary.size.totalOriginal)} |`);
  lines.push(`| Processed Size | ${formatSize(summary.size.totalProcessed)} |`);
  lines.push(
    `| Total Savings | ${formatSize(summary.size.totalSavings)} (${summary.size.savingsPercent.toFixed(1)}%) |`
  );
  lines.push('');

  // Cache
  lines.push('### Cache');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Hits | ${summary.cache.hits} |`);
  lines.push(`| Misses | ${summary.cache.misses} |`);
  lines.push(`| Hit Rate | ${(summary.cache.hitRate * 100).toFixed(1)}% |`);
  lines.push('');

  // Warnings
  if (warnings && warnings.length > 0) {
    lines.push('## ⚠️ Warnings');
    lines.push('');
    for (const warning of warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push('');
  }

  // Individual Metrics (verbose)
  if (verbose && metrics && metrics.length > 0) {
    lines.push('## Individual Metrics');
    lines.push('');

    const metricsByType = new Map<string, PerformanceMetric[]>();
    for (const metric of metrics) {
      if (!metricsByType.has(metric.type)) {
        metricsByType.set(metric.type, []);
      }
      metricsByType.get(metric.type)!.push(metric);
    }

    for (const [type, typeMetrics] of metricsByType) {
      lines.push(`### ${type.charAt(0).toUpperCase() + type.slice(1)}`);
      lines.push('');
      lines.push('| Resource | Duration | Size |');
      lines.push('|----------|----------|------|');

      for (const metric of typeMetrics) {
        const duration = metric.duration ? formatDuration(metric.duration) : '-';
        const size = metric.size
          ? `${formatSize(metric.size.original || 0)} → ${formatSize(metric.size.processed || 0)}`
          : '-';
        lines.push(`| ${metric.resource} | ${duration} | ${size} |`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Print performance report to console
 *
 * Generates and prints a formatted performance report.
 *
 * @param options - Report options
 *
 * @example
 * ```typescript
 * printPerformanceReport({
 *   format: 'console',
 *   includeWarnings: true,
 *   thresholds: { maxBundleSize: 500000 }
 * });
 * ```
 */
export function printPerformanceReport(options: ReportOptions = {}): void {
  const { format = 'console' } = options;

  const report = generatePerformanceReport(options);

  let output: string;

  switch (format) {
    case 'json':
      output = formatJSONReport(report, options);
      break;
    case 'markdown':
      output = formatMarkdownReport(report, options);
      break;
    case 'console':
    default:
      output = formatConsoleReport(report, options);
      break;
  }

  console.log(output);
}

/**
 * Write performance report to file
 *
 * Generates and writes a performance report to a file.
 *
 * @param filePath - Output file path
 * @param options - Report options
 *
 * @example
 * ```typescript
 * await writePerformanceReport('./performance-report.md', {
 *   format: 'markdown',
 *   includeMetrics: true
 * });
 * ```
 */
export async function writePerformanceReport(
  filePath: string,
  options: ReportOptions = {}
): Promise<void> {
  const { writeFile } = await import('node:fs/promises');

  const report = generatePerformanceReport(options);

  let output: string;
  const format = options.format || inferFormatFromPath(filePath);

  switch (format) {
    case 'json':
      output = formatJSONReport(report, options);
      break;
    case 'markdown':
      output = formatMarkdownReport(report, options);
      break;
    case 'console':
    default:
      output = formatConsoleReport(report, options);
      break;
  }

  await writeFile(filePath, output, 'utf8');
}

/**
 * Infer report format from file path
 *
 * @param filePath - File path
 * @returns Inferred format
 */
function inferFormatFromPath(filePath: string): ReportFormat {
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.md') || filePath.endsWith('.markdown')) return 'markdown';
  return 'console';
}
