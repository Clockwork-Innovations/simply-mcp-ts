/**
 * Unit tests for ui-performance-reporter module
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  generatePerformanceReport,
  formatConsoleReport,
  formatJSONReport,
  formatMarkdownReport,
  type PerformanceReport,
  type ReportOptions,
} from '../../src/features/ui/ui-performance-reporter.js';
import { getPerformanceTracker, trackPerformance, recordCacheAccess } from '../../src/features/ui/ui-performance.js';

describe('UI Performance Reporter', () => {
  let tracker: ReturnType<typeof getPerformanceTracker>;

  beforeEach(() => {
    tracker = getPerformanceTracker();
    tracker.clear();
    tracker.enable();
  });

  describe('generatePerformanceReport', () => {
    it('should generate basic report', () => {
      tracker.record({
        type: 'compilation',
        resource: './App.tsx',
        timestamp: Date.now(),
        duration: 150,
        size: { original: 1000, processed: 800 },
      });

      const report: PerformanceReport = generatePerformanceReport();

      expect(report.timestamp).toBeTruthy();
      expect(report.summary).toBeDefined();
      expect(report.summary.totalMetrics).toBe(1);
      expect(report.metrics).toBeUndefined(); // Not included by default
      expect(report.warnings).toBeUndefined(); // Not included without thresholds
    });

    it('should include metrics when requested', () => {
      tracker.record({
        type: 'compilation',
        resource: './App.tsx',
        timestamp: Date.now(),
        duration: 150,
      });

      const report = generatePerformanceReport({ includeMetrics: true });

      expect(report.metrics).toBeDefined();
      expect(report.metrics).toHaveLength(1);
    });

    it('should include warnings when thresholds provided', () => {
      tracker.record({
        type: 'bundling',
        resource: './App.tsx',
        timestamp: Date.now(),
        size: { original: 1000000, processed: 600000 },
      });

      const report = generatePerformanceReport({
        includeWarnings: true,
        thresholds: { maxBundleSize: 500000 },
      });

      expect(report.warnings).toBeDefined();
      expect(report.warnings!.length).toBeGreaterThan(0);
    });

    it('should not include warnings when disabled', () => {
      tracker.record({
        type: 'bundling',
        resource: './App.tsx',
        timestamp: Date.now(),
        size: { original: 1000000, processed: 600000 },
      });

      const report = generatePerformanceReport({
        includeWarnings: false,
        thresholds: { maxBundleSize: 500000 },
      });

      expect(report.warnings).toBeUndefined();
    });
  });

  describe('formatConsoleReport', () => {
    beforeEach(() => {
      tracker.record({
        type: 'compilation',
        resource: './App.tsx',
        timestamp: Date.now(),
        duration: 150,
        size: { original: 1000, processed: 800 },
      });

      tracker.record({
        type: 'bundling',
        resource: './App.tsx',
        timestamp: Date.now(),
        duration: 200,
        size: { original: 800, processed: 600 },
      });

      recordCacheAccess('./App.tsx', true, 'App');
    });

    it('should format console report', () => {
      const report = generatePerformanceReport();
      const output = formatConsoleReport(report);

      expect(output).toContain('UI PERFORMANCE REPORT');
      expect(output).toContain('SUMMARY STATISTICS');
      expect(output).toContain('TIMING');
      expect(output).toContain('SIZE');
      expect(output).toContain('CACHE');
    });

    it('should include metrics in verbose mode', () => {
      const report = generatePerformanceReport({ includeMetrics: true });
      const output = formatConsoleReport(report, { verbose: true });

      expect(output).toContain('INDIVIDUAL METRICS');
      expect(output).toContain('COMPILATION');
      expect(output).toContain('BUNDLING');
    });

    it('should include warnings when present', () => {
      const report = generatePerformanceReport({
        thresholds: { maxBundleSize: 100 },
      });
      const output = formatConsoleReport(report);

      expect(output).toContain('WARNINGS');
    });

    it('should format durations', () => {
      const report = generatePerformanceReport();
      const output = formatConsoleReport(report);

      expect(output).toMatch(/\d+ms/); // Should contain milliseconds
    });

    it('should format sizes', () => {
      const report = generatePerformanceReport();
      const output = formatConsoleReport(report);

      expect(output).toMatch(/\d+(\.\d+)?\s+(B|KB|MB)/); // Should contain size units
    });

    it('should format percentages', () => {
      const report = generatePerformanceReport();
      const output = formatConsoleReport(report);

      expect(output).toMatch(/\d+\.\d+%/); // Should contain percentages
    });
  });

  describe('formatJSONReport', () => {
    beforeEach(() => {
      tracker.record({
        type: 'compilation',
        resource: './App.tsx',
        timestamp: Date.now(),
        duration: 150,
        size: { original: 1000, processed: 800 },
      });
    });

    it('should format JSON report', () => {
      const report = generatePerformanceReport();
      const output = formatJSONReport(report);

      expect(() => JSON.parse(output)).not.toThrow();

      const parsed = JSON.parse(output);
      expect(parsed.timestamp).toBeTruthy();
      expect(parsed.summary).toBeDefined();
    });

    it('should include metrics in verbose mode', () => {
      const report = generatePerformanceReport({ includeMetrics: true });
      const output = formatJSONReport(report, { verbose: true });

      const parsed = JSON.parse(output);
      expect(parsed.metrics).toBeDefined();
      expect(Array.isArray(parsed.metrics)).toBe(true);
    });

    it('should not include metrics in compact mode', () => {
      const report = generatePerformanceReport({ includeMetrics: true });
      const output = formatJSONReport(report, { verbose: false });

      const parsed = JSON.parse(output);
      expect(parsed.metrics).toBeUndefined();
    });

    it('should be valid JSON', () => {
      const report = generatePerformanceReport();
      const output = formatJSONReport(report);

      expect(() => JSON.parse(output)).not.toThrow();
    });
  });

  describe('formatMarkdownReport', () => {
    beforeEach(() => {
      tracker.record({
        type: 'compilation',
        resource: './App.tsx',
        timestamp: Date.now(),
        duration: 150,
        size: { original: 1000, processed: 800 },
      });

      tracker.record({
        type: 'bundling',
        resource: './App.tsx',
        timestamp: Date.now(),
        duration: 200,
        size: { original: 800, processed: 600 },
      });

      recordCacheAccess('./App.tsx', true, 'App');
    });

    it('should format Markdown report', () => {
      const report = generatePerformanceReport();
      const output = formatMarkdownReport(report);

      expect(output).toContain('# UI Performance Report');
      expect(output).toContain('## Summary Statistics');
      expect(output).toContain('### Timing');
      expect(output).toContain('### Size');
      expect(output).toContain('### Cache');
    });

    it('should include Markdown tables', () => {
      const report = generatePerformanceReport();
      const output = formatMarkdownReport(report);

      expect(output).toContain('| Metric |');
      expect(output).toContain('|--------|');
    });

    it('should include metrics in verbose mode', () => {
      const report = generatePerformanceReport({ includeMetrics: true });
      const output = formatMarkdownReport(report, { verbose: true });

      expect(output).toContain('## Individual Metrics');
      expect(output).toContain('### Compilation');
      expect(output).toContain('### Bundling');
    });

    it('should include warnings when present', () => {
      const report = generatePerformanceReport({
        thresholds: { maxBundleSize: 100 },
      });
      const output = formatMarkdownReport(report);

      expect(output).toContain('## ⚠️ Warnings');
    });

    it('should include timestamp', () => {
      const report = generatePerformanceReport();
      const output = formatMarkdownReport(report);

      expect(output).toContain('**Generated:**');
      expect(output).toMatch(/\d{4}-\d{2}-\d{2}/); // ISO date
    });
  });

  describe('Format Options', () => {
    beforeEach(() => {
      tracker.record({
        type: 'compilation',
        resource: './App.tsx',
        timestamp: Date.now(),
        duration: 150,
        size: { original: 1000, processed: 800 },
      });
    });

    it('should default to console format', () => {
      const report = generatePerformanceReport();
      const output = formatConsoleReport(report);

      expect(output).toContain('═'); // Console formatting
    });

    it('should respect format option', () => {
      const report = generatePerformanceReport();

      const jsonOutput = formatJSONReport(report);
      expect(() => JSON.parse(jsonOutput)).not.toThrow();

      const markdownOutput = formatMarkdownReport(report);
      expect(markdownOutput).toContain('#');
    });
  });

  describe('Integration', () => {
    it('should generate comprehensive report for full pipeline', () => {
      // Simulate full build pipeline
      const completeCompilation = trackPerformance('compilation', './App.tsx');
      completeCompilation({ size: { original: 2000, processed: 1800 } });

      const completeBundling = trackPerformance('bundling', './App.tsx');
      completeBundling({ size: { original: 1800, processed: 1200 } });

      const completeMinification = trackPerformance('minification', './App.tsx');
      completeMinification({ size: { original: 1200, processed: 900 } });

      const completeCompression = trackPerformance('compression', './App.tsx');
      completeCompression({ size: { original: 900, processed: 400 } });

      recordCacheAccess('./react', true, 'react');
      recordCacheAccess('./react-dom', true, 'react-dom');
      recordCacheAccess('./lodash', false, 'lodash');

      const report = generatePerformanceReport({
        includeMetrics: true,
        includeWarnings: true,
        thresholds: {
          maxBundleSize: 500000,
          maxCompilationTime: 5000,
          minCacheHitRate: 0.7,
        },
      });

      // Verify report structure
      expect(report.summary.totalMetrics).toBe(7);
      expect(report.summary.totalCompilationTime).toBeGreaterThanOrEqual(0);
      expect(report.summary.totalBundlingTime).toBeGreaterThanOrEqual(0);
      expect(report.summary.size.totalSavings).toBeGreaterThan(0);
      expect(report.summary.cache.hits).toBe(2);
      expect(report.summary.cache.misses).toBe(1);

      // Test all formats
      const consoleOutput = formatConsoleReport(report);
      expect(consoleOutput).toContain('UI PERFORMANCE REPORT');

      const jsonOutput = formatJSONReport(report);
      const parsed = JSON.parse(jsonOutput);
      expect(parsed.summary).toBeDefined();

      const markdownOutput = formatMarkdownReport(report);
      expect(markdownOutput).toContain('# UI Performance Report');
    });

    it('should handle empty metrics', () => {
      tracker.clear();

      const report = generatePerformanceReport();

      expect(report.summary.totalMetrics).toBe(0);

      const consoleOutput = formatConsoleReport(report);
      expect(consoleOutput).toContain('0'); // Should show zeros

      const jsonOutput = formatJSONReport(report);
      expect(() => JSON.parse(jsonOutput)).not.toThrow();

      const markdownOutput = formatMarkdownReport(report);
      expect(markdownOutput).toContain('0'); // Should show zeros
    });
  });

  describe('Size Formatting', () => {
    it('should format bytes correctly', () => {
      tracker.record({
        type: 'minification',
        resource: './tiny.js',
        timestamp: Date.now(),
        size: { original: 500, processed: 400 },
      });

      const report = generatePerformanceReport();
      const output = formatConsoleReport(report);

      expect(output).toMatch(/\d+\s+B/); // Bytes
    });

    it('should format kilobytes correctly', () => {
      tracker.record({
        type: 'minification',
        resource: './medium.js',
        timestamp: Date.now(),
        size: { original: 50000, processed: 30000 },
      });

      const report = generatePerformanceReport();
      const output = formatConsoleReport(report);

      expect(output).toMatch(/\d+\.\d+\s+KB/); // Kilobytes
    });

    it('should format megabytes correctly', () => {
      tracker.record({
        type: 'bundling',
        resource: './large.js',
        timestamp: Date.now(),
        size: { original: 2000000, processed: 1500000 },
      });

      const report = generatePerformanceReport();
      const output = formatConsoleReport(report);

      expect(output).toMatch(/\d+\.\d+\s+MB/); // Megabytes
    });
  });

  describe('Duration Formatting', () => {
    it('should format milliseconds correctly', () => {
      tracker.record({
        type: 'compilation',
        resource: './fast.ts',
        timestamp: Date.now(),
        duration: 150,
      });

      const report = generatePerformanceReport();
      const output = formatConsoleReport(report);

      expect(output).toMatch(/150ms/);
    });

    it('should format seconds correctly', () => {
      tracker.record({
        type: 'bundling',
        resource: './slow.ts',
        timestamp: Date.now(),
        duration: 2500,
      });

      const report = generatePerformanceReport();
      const output = formatConsoleReport(report);

      expect(output).toMatch(/2\.50s/);
    });
  });
});
