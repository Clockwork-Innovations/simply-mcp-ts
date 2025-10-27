/**
 * Unit tests for ui-performance module
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  getPerformanceTracker,
  trackPerformance,
  recordCacheAccess,
  normalizePerformanceOptions,
  type PerformanceMetric,
  type PerformanceSummary,
  type PerformanceThresholds,
  type PerformanceOptions,
} from '../../src/features/ui/ui-performance.js';

describe('UI Performance', () => {
  let tracker: ReturnType<typeof getPerformanceTracker>;

  beforeEach(() => {
    tracker = getPerformanceTracker();
    tracker.clear();
    tracker.enable();
  });

  describe('Performance Tracker', () => {
    it('should start disabled', () => {
      const newTracker = getPerformanceTracker();
      newTracker.disable();

      expect(newTracker.isEnabled()).toBe(false);
    });

    it('should enable and disable tracking', () => {
      tracker.enable();
      expect(tracker.isEnabled()).toBe(true);

      tracker.disable();
      expect(tracker.isEnabled()).toBe(false);
    });

    it('should record metrics when enabled', () => {
      tracker.enable();

      const metric: PerformanceMetric = {
        type: 'compilation',
        resource: './App.tsx',
        timestamp: Date.now(),
        duration: 150,
      };

      tracker.record(metric);

      const metrics = tracker.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(metric);
    });

    it('should not record metrics when disabled', () => {
      tracker.disable();

      const metric: PerformanceMetric = {
        type: 'compilation',
        resource: './App.tsx',
        timestamp: Date.now(),
        duration: 150,
      };

      tracker.record(metric);

      const metrics = tracker.getMetrics();
      expect(metrics).toHaveLength(0);
    });

    it('should clear metrics', () => {
      tracker.record({
        type: 'compilation',
        resource: './App.tsx',
        timestamp: Date.now(),
        duration: 150,
      });

      expect(tracker.getMetrics()).toHaveLength(1);

      tracker.clear();

      expect(tracker.getMetrics()).toHaveLength(0);
    });

    it('should get metrics by type', () => {
      tracker.record({
        type: 'compilation',
        resource: './App.tsx',
        timestamp: Date.now(),
        duration: 150,
      });

      tracker.record({
        type: 'bundling',
        resource: './App.tsx',
        timestamp: Date.now(),
        duration: 200,
      });

      tracker.record({
        type: 'compilation',
        resource: './Button.tsx',
        timestamp: Date.now(),
        duration: 100,
      });

      const compilationMetrics = tracker.getMetricsByType('compilation');
      expect(compilationMetrics).toHaveLength(2);

      const bundlingMetrics = tracker.getMetricsByType('bundling');
      expect(bundlingMetrics).toHaveLength(1);
    });

    it('should get metrics by resource', () => {
      tracker.record({
        type: 'compilation',
        resource: './App.tsx',
        timestamp: Date.now(),
        duration: 150,
      });

      tracker.record({
        type: 'bundling',
        resource: './App.tsx',
        timestamp: Date.now(),
        duration: 200,
      });

      tracker.record({
        type: 'compilation',
        resource: './Button.tsx',
        timestamp: Date.now(),
        duration: 100,
      });

      const appMetrics = tracker.getMetricsByResource('./App.tsx');
      expect(appMetrics).toHaveLength(2);

      const buttonMetrics = tracker.getMetricsByResource('./Button.tsx');
      expect(buttonMetrics).toHaveLength(1);
    });
  });

  describe('Performance Summary', () => {
    it('should calculate summary statistics', () => {
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

      const summary: PerformanceSummary = tracker.getSummary();

      expect(summary.totalMetrics).toBe(2);
      expect(summary.totalCompilationTime).toBe(150);
      expect(summary.totalBundlingTime).toBe(200);
      expect(summary.size.totalOriginal).toBe(1800);
      expect(summary.size.totalProcessed).toBe(1400);
      expect(summary.size.totalSavings).toBe(400);
    });

    it('should calculate averages', () => {
      tracker.record({
        type: 'compilation',
        resource: './App.tsx',
        timestamp: Date.now(),
        duration: 100,
      });

      tracker.record({
        type: 'compilation',
        resource: './Button.tsx',
        timestamp: Date.now(),
        duration: 200,
      });

      const summary = tracker.getSummary();

      expect(summary.averages.compilationTime).toBe(150);
    });

    it('should calculate cache hit rate', () => {
      tracker.record({
        type: 'cache',
        resource: './App.tsx',
        timestamp: Date.now(),
        cache: { hit: true, key: 'App' },
      });

      tracker.record({
        type: 'cache',
        resource: './Button.tsx',
        timestamp: Date.now(),
        cache: { hit: false, key: 'Button' },
      });

      tracker.record({
        type: 'cache',
        resource: './Card.tsx',
        timestamp: Date.now(),
        cache: { hit: true, key: 'Card' },
      });

      const summary = tracker.getSummary();

      expect(summary.cache.hits).toBe(2);
      expect(summary.cache.misses).toBe(1);
      expect(summary.cache.hitRate).toBeCloseTo(2 / 3);
    });

    it('should calculate savings percentage', () => {
      tracker.record({
        type: 'minification',
        resource: './app.js',
        timestamp: Date.now(),
        size: { original: 1000, processed: 500 },
      });

      const summary = tracker.getSummary();

      expect(summary.size.savingsPercent).toBe(50);
    });

    it('should handle empty metrics', () => {
      tracker.clear();

      const summary = tracker.getSummary();

      expect(summary.totalMetrics).toBe(0);
      expect(summary.totalCompilationTime).toBe(0);
      expect(summary.cache.hitRate).toBe(0);
      expect(summary.size.savingsPercent).toBe(0);
    });
  });

  describe('Threshold Checking', () => {
    it('should detect bundle size violations', () => {
      tracker.record({
        type: 'bundling',
        resource: './App.tsx',
        timestamp: Date.now(),
        size: { original: 1000000, processed: 600000 },
      });

      const thresholds: PerformanceThresholds = {
        maxBundleSize: 500000, // 500 KB
      };

      const warnings = tracker.checkThresholds(thresholds);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('Bundle size exceeds threshold');
      expect(warnings[0]).toContain('App.tsx');
    });

    it('should detect compilation time violations', () => {
      tracker.record({
        type: 'compilation',
        resource: './App.tsx',
        timestamp: Date.now(),
        duration: 10000, // 10 seconds
      });

      const thresholds: PerformanceThresholds = {
        maxCompilationTime: 5000, // 5 seconds
      };

      const warnings = tracker.checkThresholds(thresholds);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('Compilation time exceeds threshold');
    });

    it('should detect low cache hit rate', () => {
      // Low hit rate: 1 hit, 4 misses = 20%
      tracker.record({
        type: 'cache',
        resource: './App.tsx',
        timestamp: Date.now(),
        cache: { hit: true, key: 'App' },
      });

      for (let i = 0; i < 4; i++) {
        tracker.record({
          type: 'cache',
          resource: `./Component${i}.tsx`,
          timestamp: Date.now(),
          cache: { hit: false, key: `Component${i}` },
        });
      }

      const thresholds: PerformanceThresholds = {
        minCacheHitRate: 0.7, // 70%
      };

      const warnings = tracker.checkThresholds(thresholds);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('Cache hit rate below threshold');
    });

    it('should detect low compression savings', () => {
      tracker.record({
        type: 'compression',
        resource: './app.js',
        timestamp: Date.now(),
        size: { original: 1000, processed: 950 }, // Only 5% savings
      });

      const thresholds: PerformanceThresholds = {
        minCompressionSavings: 0.2, // 20%
      };

      const warnings = tracker.checkThresholds(thresholds);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('Compression savings below threshold');
    });

    it('should not warn when within thresholds', () => {
      tracker.record({
        type: 'bundling',
        resource: './App.tsx',
        timestamp: Date.now(),
        duration: 100,
        size: { original: 1000, processed: 400 },
      });

      const thresholds: PerformanceThresholds = {
        maxBundleSize: 500000,
        maxCompilationTime: 5000,
      };

      const warnings = tracker.checkThresholds(thresholds);

      expect(warnings).toHaveLength(0);
    });
  });

  describe('trackPerformance helper', () => {
    it('should track performance with automatic timing', () => {
      const complete = trackPerformance('compilation', './App.tsx');

      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Wait ~10ms
      }

      complete({ size: { original: 1000, processed: 800 } });

      const metrics = tracker.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].type).toBe('compilation');
      expect(metrics[0].resource).toBe('./App.tsx');
      expect(metrics[0].duration).toBeGreaterThanOrEqual(5); // At least 5ms
      expect(metrics[0].size).toEqual({ original: 1000, processed: 800 });
    });

    it('should complete without additional data', () => {
      const complete = trackPerformance('bundling', './App.tsx');
      complete();

      const metrics = tracker.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].type).toBe('bundling');
    });
  });

  describe('recordCacheAccess helper', () => {
    it('should record cache hit', () => {
      recordCacheAccess('./App.tsx', true, 'App');

      const metrics = tracker.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].type).toBe('cache');
      expect(metrics[0].cache?.hit).toBe(true);
      expect(metrics[0].cache?.key).toBe('App');
    });

    it('should record cache miss', () => {
      recordCacheAccess('./App.tsx', false, 'App');

      const metrics = tracker.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].cache?.hit).toBe(false);
    });
  });

  describe('normalizePerformanceOptions', () => {
    it('should normalize true to track and report enabled', () => {
      const options = normalizePerformanceOptions(true);

      expect(options.track).toBe(true);
      expect(options.report).toBe(true);
    });

    it('should normalize false to track and report disabled', () => {
      const options = normalizePerformanceOptions(false);

      expect(options.track).toBe(false);
      expect(options.report).toBe(false);
    });

    it('should normalize undefined to disabled', () => {
      const options = normalizePerformanceOptions(undefined);

      expect(options.track).toBe(false);
      expect(options.report).toBe(false);
    });

    it('should normalize partial options', () => {
      const options = normalizePerformanceOptions({ track: true });

      expect(options.track).toBe(true);
      expect(options.report).toBe(false); // Default
    });

    it('should preserve thresholds', () => {
      const thresholds: PerformanceThresholds = {
        maxBundleSize: 500000,
        maxCompilationTime: 5000,
      };

      const options = normalizePerformanceOptions({ thresholds });

      expect(options.thresholds).toEqual(thresholds);
    });

    it('should preserve verbose option', () => {
      const options = normalizePerformanceOptions({ verbose: true });

      expect(options.verbose).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should track complete build pipeline', () => {
      // Simulate complete build with multiple steps
      const completeCompilation = trackPerformance('compilation', './App.tsx');
      completeCompilation({ size: { original: 2000, processed: 1800 } });

      recordCacheAccess('./react', true, 'react');

      const completeBundling = trackPerformance('bundling', './App.tsx');
      completeBundling({ size: { original: 1800, processed: 1200 } });

      const completeMinification = trackPerformance('minification', './App.tsx');
      completeMinification({ size: { original: 1200, processed: 900 } });

      const completeCompression = trackPerformance('compression', './App.tsx');
      completeCompression({ size: { original: 900, processed: 400 } });

      const summary = tracker.getSummary();

      expect(summary.totalMetrics).toBe(5);
      expect(summary.size.totalOriginal).toBeGreaterThan(0);
      expect(summary.size.totalProcessed).toBeGreaterThan(0);
      expect(summary.size.totalSavings).toBeGreaterThan(0);
      expect(summary.cache.hitRate).toBe(1); // 100% hit rate
    });
  });
});
