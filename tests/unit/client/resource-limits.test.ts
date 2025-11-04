/**
 * Tests for Resource Limits
 *
 * Validates that resource limits prevent DoS attacks and resource exhaustion.
 *
 * Task 2.1: Resource Limits Implementation
 * Target: Enforce configurable limits for script size, execution time, DOM nodes, event listeners
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  ResourceLimits,
  createResourceLimits,
  ResourceLimitError,
  ResourceLimitsConfig,
} from '../../../src/client/remote-dom/resource-limits';

describe('Resource Limits', () => {
  let limits: ResourceLimits;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    if (limits) {
      limits.reset();
    }
    jest.useRealTimers();
  });

  describe('Configuration', () => {
    it('creates with default config', () => {
      limits = new ResourceLimits();
      const config = limits.getConfig();

      expect(config.maxScriptSize).toBe(1024 * 1024); // 1 MB
      expect(config.maxExecutionTime).toBe(5000); // 5 seconds
      expect(config.maxDOMNodes).toBe(10000);
      expect(config.maxEventListeners).toBe(1000);
      expect(config.memoryWarningThreshold).toBe(50); // MB
      expect(config.debug).toBe(false);
    });

    it('creates with custom config', () => {
      limits = new ResourceLimits({
        maxScriptSize: 512 * 1024, // 512 KB
        maxExecutionTime: 3000, // 3 seconds
        maxDOMNodes: 5000,
        maxEventListeners: 500,
        memoryWarningThreshold: 100,
        debug: true,
      });

      const config = limits.getConfig();
      expect(config.maxScriptSize).toBe(512 * 1024);
      expect(config.maxExecutionTime).toBe(3000);
      expect(config.maxDOMNodes).toBe(5000);
      expect(config.maxEventListeners).toBe(500);
      expect(config.memoryWarningThreshold).toBe(100);
      expect(config.debug).toBe(true);
    });

    it('uses helper function to create limits', () => {
      limits = createResourceLimits({ maxDOMNodes: 2000 });
      expect(limits).toBeInstanceOf(ResourceLimits);
      expect(limits.getConfig().maxDOMNodes).toBe(2000);
    });
  });

  describe('Script Size Validation', () => {
    beforeEach(() => {
      limits = new ResourceLimits({ maxScriptSize: 1024 }); // 1 KB limit for testing
    });

    it('allows small scripts', () => {
      const smallScript = 'console.log("hello");';
      expect(() => limits.validateScriptSize(smallScript)).not.toThrow();
    });

    it('blocks oversized scripts', () => {
      // Create script larger than 1 KB
      const largeScript = 'x'.repeat(1025);

      expect(() => limits.validateScriptSize(largeScript)).toThrow(ResourceLimitError);
    });

    it('throws ResourceLimitError with correct details', () => {
      const largeScript = 'x'.repeat(2000);

      try {
        limits.validateScriptSize(largeScript);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ResourceLimitError);
        const err = error as ResourceLimitError;
        expect(err.limitType).toBe('scriptSize');
        expect(err.currentValue).toBeGreaterThan(1024);
        expect(err.maxValue).toBe(1024);
        expect(err.message).toContain('Script size');
        expect(err.message).toContain('exceeds maximum');
      }
    });

    it('validates script at exact limit', () => {
      // Create script at exactly 1 KB
      const exactScript = 'x'.repeat(1024);
      expect(() => limits.validateScriptSize(exactScript)).not.toThrow();
    });
  });

  describe('Execution Timer', () => {
    beforeEach(() => {
      limits = new ResourceLimits({ maxExecutionTime: 1000 }); // 1 second for testing
    });

    it('starts execution timer', () => {
      const onTimeout = jest.fn();
      limits.startExecutionTimer(onTimeout);

      // Timer should not fire immediately
      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('calls timeout callback after limit', () => {
      const onTimeout = jest.fn();
      limits.startExecutionTimer(onTimeout);

      // Fast-forward past limit
      jest.advanceTimersByTime(1000);

      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it('does not call timeout if stopped early', () => {
      const onTimeout = jest.fn();
      limits.startExecutionTimer(onTimeout);

      // Stop before timeout
      jest.advanceTimersByTime(500);
      limits.stopExecutionTimer();

      // Advance rest of time
      jest.advanceTimersByTime(500);

      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('can restart timer', () => {
      const onTimeout1 = jest.fn();
      const onTimeout2 = jest.fn();

      limits.startExecutionTimer(onTimeout1);
      limits.startExecutionTimer(onTimeout2); // Should cancel first timer

      jest.advanceTimersByTime(1000);

      expect(onTimeout1).not.toHaveBeenCalled();
      expect(onTimeout2).toHaveBeenCalledTimes(1);
    });
  });

  describe('DOM Node Counting', () => {
    beforeEach(() => {
      limits = new ResourceLimits({ maxDOMNodes: 5 }); // Small limit for testing
    });

    it('allows nodes under limit', () => {
      expect(() => limits.registerDOMNode()).not.toThrow();
      expect(() => limits.registerDOMNode()).not.toThrow();
      expect(() => limits.registerDOMNode()).not.toThrow();
    });

    it('throws when limit exceeded', () => {
      // Add 5 nodes (at limit)
      for (let i = 0; i < 5; i++) {
        limits.registerDOMNode();
      }

      // 6th node should throw
      expect(() => limits.registerDOMNode()).toThrow(ResourceLimitError);
    });

    it('throws ResourceLimitError with correct details', () => {
      for (let i = 0; i < 5; i++) {
        limits.registerDOMNode();
      }

      try {
        limits.registerDOMNode();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ResourceLimitError);
        const err = error as ResourceLimitError;
        expect(err.limitType).toBe('domNodes');
        expect(err.currentValue).toBe(6);
        expect(err.maxValue).toBe(5);
        expect(err.message).toContain('DOM node limit exceeded');
      }
    });

    it('decrements count when unregistering', () => {
      limits.registerDOMNode();
      limits.registerDOMNode();
      limits.unregisterDOMNode();

      const usage = limits.getUsage();
      expect(usage.domNodes.count).toBe(1);
    });

    it('does not go below zero when unregistering', () => {
      limits.unregisterDOMNode();
      limits.unregisterDOMNode();

      const usage = limits.getUsage();
      expect(usage.domNodes.count).toBe(0);
    });
  });

  describe('Event Listener Counting', () => {
    beforeEach(() => {
      limits = new ResourceLimits({ maxEventListeners: 3 }); // Small limit for testing
    });

    it('allows listeners under limit', () => {
      expect(() => limits.registerEventListener()).not.toThrow();
      expect(() => limits.registerEventListener()).not.toThrow();
    });

    it('throws when limit exceeded', () => {
      limits.registerEventListener();
      limits.registerEventListener();
      limits.registerEventListener();

      // 4th listener should throw
      expect(() => limits.registerEventListener()).toThrow(ResourceLimitError);
    });

    it('throws ResourceLimitError with correct details', () => {
      limits.registerEventListener();
      limits.registerEventListener();
      limits.registerEventListener();

      try {
        limits.registerEventListener();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ResourceLimitError);
        const err = error as ResourceLimitError;
        expect(err.limitType).toBe('eventListeners');
        expect(err.currentValue).toBe(4);
        expect(err.maxValue).toBe(3);
        expect(err.message).toContain('Event listener limit exceeded');
      }
    });

    it('decrements count when unregistering', () => {
      limits.registerEventListener();
      limits.registerEventListener();
      limits.unregisterEventListener();

      const usage = limits.getUsage();
      expect(usage.eventListeners.count).toBe(1);
    });

    it('does not go below zero when unregistering', () => {
      limits.unregisterEventListener();
      limits.unregisterEventListener();

      const usage = limits.getUsage();
      expect(usage.eventListeners.count).toBe(0);
    });
  });

  describe('Memory Monitoring', () => {
    beforeEach(() => {
      limits = new ResourceLimits({ memoryWarningThreshold: 50 });
    });

    it('returns null when memory API unavailable', () => {
      const memoryUsage = limits.checkMemoryUsage();
      // In Node.js test environment, performance.memory is usually unavailable
      expect(memoryUsage).toBeNull();
    });

    it('returns memory usage when available', () => {
      // Mock performance.memory
      const mockMemory = {
        usedJSHeapSize: 30 * 1024 * 1024, // 30 MB
        jsHeapSizeLimit: 100 * 1024 * 1024, // 100 MB
      };

      (global as any).performance = {
        memory: mockMemory,
      };

      const memoryUsage = limits.checkMemoryUsage();
      expect(memoryUsage).toBeCloseTo(30, 1); // ~30 MB

      // Clean up
      delete (global as any).performance;
    });

    it('warns when threshold exceeded', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock high memory usage
      (global as any).performance = {
        memory: {
          usedJSHeapSize: 60 * 1024 * 1024, // 60 MB (over 50 MB threshold)
          jsHeapSizeLimit: 100 * 1024 * 1024,
        },
      };

      limits.checkMemoryUsage();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Memory usage high')
      );

      consoleWarnSpy.mockRestore();
      delete (global as any).performance;
    });
  });

  describe('Usage Statistics', () => {
    beforeEach(() => {
      limits = new ResourceLimits({
        maxDOMNodes: 100,
        maxEventListeners: 50,
        maxExecutionTime: 5000,
      });
    });

    it('reports DOM node usage', () => {
      limits.registerDOMNode();
      limits.registerDOMNode();
      limits.registerDOMNode();

      const usage = limits.getUsage();
      expect(usage.domNodes.count).toBe(3);
      expect(usage.domNodes.limit).toBe(100);
      expect(usage.domNodes.percentage).toBe(3); // 3/100 = 3%
    });

    it('reports event listener usage', () => {
      limits.registerEventListener();
      limits.registerEventListener();

      const usage = limits.getUsage();
      expect(usage.eventListeners.count).toBe(2);
      expect(usage.eventListeners.limit).toBe(50);
      expect(usage.eventListeners.percentage).toBe(4); // 2/50 = 4%
    });

    it('reports execution time', () => {
      const onTimeout = jest.fn();
      limits.startExecutionTimer(onTimeout);

      jest.advanceTimersByTime(2000);

      const usage = limits.getUsage();
      expect(usage.executionTime.ms).toBe(2000);
      expect(usage.executionTime.limit).toBe(5000);
      expect(usage.executionTime.percentage).toBe(40); // 2000/5000 = 40%
    });

    it('reports memory usage', () => {
      const usage = limits.getUsage();
      expect(usage.memory.threshold).toBe(50); // Default threshold
      expect(usage.memory.mb).toBeNull(); // No memory API in Node.js
    });

    it('calculates percentages correctly', () => {
      // Fill to 50%
      for (let i = 0; i < 50; i++) {
        limits.registerDOMNode();
      }

      const usage = limits.getUsage();
      expect(usage.domNodes.percentage).toBe(50);
    });
  });

  describe('Reset Functionality', () => {
    beforeEach(() => {
      limits = new ResourceLimits();
    });

    it('resets all counters', () => {
      limits.registerDOMNode();
      limits.registerDOMNode();
      limits.registerEventListener();
      limits.startExecutionTimer(jest.fn());

      limits.reset();

      const usage = limits.getUsage();
      expect(usage.domNodes.count).toBe(0);
      expect(usage.eventListeners.count).toBe(0);
      expect(usage.executionTime.ms).toBe(0);
    });

    it('stops execution timer', () => {
      const onTimeout = jest.fn();
      limits.startExecutionTimer(onTimeout);

      limits.reset();

      jest.advanceTimersByTime(10000);
      expect(onTimeout).not.toHaveBeenCalled();
    });
  });

  describe('ResourceLimitError', () => {
    it('creates error with all details', () => {
      const error = new ResourceLimitError('testLimit', 100, 50, 'Custom message');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ResourceLimitError');
      expect(error.limitType).toBe('testLimit');
      expect(error.currentValue).toBe(100);
      expect(error.maxValue).toBe(50);
      expect(error.message).toBe('Custom message');
    });

    it('creates error with default message', () => {
      const error = new ResourceLimitError('testLimit', 100, 50);

      expect(error.message).toBe('Resource limit exceeded: testLimit (100 > 50)');
    });
  });

  describe('Security Target Validation', () => {
    it('prevents script injection via size limit', () => {
      limits = new ResourceLimits({ maxScriptSize: 1024 * 1024 }); // 1 MB

      // Malicious script larger than 1 MB
      const maliciousScript = '/*' + 'x'.repeat(1024 * 1024 + 1) + '*/';

      expect(() => limits.validateScriptSize(maliciousScript)).toThrow(ResourceLimitError);
    });

    it('prevents long-running scripts via timeout', () => {
      limits = new ResourceLimits({ maxExecutionTime: 5000 }); // 5 seconds

      const onTimeout = jest.fn();
      limits.startExecutionTimer(onTimeout);

      // Simulate long-running script
      jest.advanceTimersByTime(5000);

      expect(onTimeout).toHaveBeenCalled();
    });

    it('prevents DOM flooding via node limit', () => {
      limits = new ResourceLimits({ maxDOMNodes: 10000 });

      // Try to create 10,001 nodes
      for (let i = 0; i < 10000; i++) {
        limits.registerDOMNode();
      }

      expect(() => limits.registerDOMNode()).toThrow(ResourceLimitError);
    });

    it('prevents event listener flooding', () => {
      limits = new ResourceLimits({ maxEventListeners: 1000 });

      // Try to create 1,001 listeners
      for (let i = 0; i < 1000; i++) {
        limits.registerEventListener();
      }

      expect(() => limits.registerEventListener()).toThrow(ResourceLimitError);
    });
  });

  describe('Real-World Scenarios', () => {
    it('handles typical UI with 100 elements', () => {
      limits = new ResourceLimits();

      // Typical UI: 100 DOM nodes, 20 event listeners
      for (let i = 0; i < 100; i++) {
        limits.registerDOMNode();
      }
      for (let i = 0; i < 20; i++) {
        limits.registerEventListener();
      }

      const usage = limits.getUsage();
      expect(usage.domNodes.percentage).toBe(1); // 100/10000 = 1%
      expect(usage.eventListeners.percentage).toBe(2); // 20/1000 = 2%
    });

    it('handles data-heavy table with 1000 rows', () => {
      limits = new ResourceLimits();

      // Table: 1000 rows × 5 cells = 5000 nodes
      for (let i = 0; i < 5000; i++) {
        limits.registerDOMNode();
      }

      const usage = limits.getUsage();
      expect(usage.domNodes.percentage).toBe(50); // 5000/10000 = 50%
      expect(() => limits.registerDOMNode()).not.toThrow(); // Still within limit
    });

    it('enforces limits on complex interactive dashboard', () => {
      limits = new ResourceLimits();

      // Complex dashboard: 200 components, 100 listeners, script execution
      for (let i = 0; i < 200; i++) {
        limits.registerDOMNode();
      }
      for (let i = 0; i < 100; i++) {
        limits.registerEventListener();
      }

      const smallScript = 'console.log("dashboard");';
      expect(() => limits.validateScriptSize(smallScript)).not.toThrow();

      const onTimeout = jest.fn();
      limits.startExecutionTimer(onTimeout);
      jest.advanceTimersByTime(100); // 100ms execution
      limits.stopExecutionTimer();

      expect(onTimeout).not.toHaveBeenCalled();
    });
  });

  describe('Performance Impact', () => {
    it('has minimal overhead for node registration', () => {
      limits = new ResourceLimits();

      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        limits.registerDOMNode();
      }
      const duration = Date.now() - start;

      // Should be very fast (< 10ms for 1000 operations)
      expect(duration).toBeLessThan(10);
    });

    it('has minimal overhead for listener registration', () => {
      limits = new ResourceLimits();

      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        limits.registerEventListener();
      }
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10);
    });
  });
});
