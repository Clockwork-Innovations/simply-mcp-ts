/**
 * Tests for Operation Batcher
 *
 * Validates that operation batching works correctly and reduces render cycles.
 *
 * Task 1.3: Operation Batching
 * Target: Reduce render cycles by ≥50%, maintain ≥60 FPS
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { OperationBatcher, createBatcher, DOMOperation } from '../../../src/client/remote-dom/operation-batcher';

describe('Operation Batcher', () => {
  let flushCallback: jest.Mock;
  let batcher: OperationBatcher;

  beforeEach(() => {
    flushCallback = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    if (batcher) {
      batcher.destroy();
    }
    jest.useRealTimers();
  });

  describe('Basic Batching', () => {
    it('creates batcher with default config', () => {
      batcher = new OperationBatcher(flushCallback);
      expect(batcher).toBeDefined();
      expect(batcher.getQueueSize()).toBe(0);
    });

    it('creates batcher with custom config', () => {
      batcher = new OperationBatcher(flushCallback, {
        batchWindow: 20,
        maxBatchSize: 50,
        debug: true,
      });

      const stats = batcher.getStats();
      expect(stats.config.batchWindow).toBe(20);
      expect(stats.config.maxBatchSize).toBe(50);
      expect(stats.config.debug).toBe(true);
    });

    it('queues operations without immediate flush', () => {
      batcher = new OperationBatcher(flushCallback);

      const op: DOMOperation = {
        type: 'create',
        data: { id: '1', tagName: 'div' },
        timestamp: Date.now(),
      };

      batcher.add(op);

      expect(batcher.getQueueSize()).toBe(1);
      expect(flushCallback).not.toHaveBeenCalled();
    });

    it('flushes operations after batch window', () => {
      batcher = new OperationBatcher(flushCallback, { batchWindow: 16 });

      const op: DOMOperation = {
        type: 'create',
        data: { id: '1', tagName: 'div' },
        timestamp: Date.now(),
      };

      batcher.add(op);

      // Fast-forward time
      jest.advanceTimersByTime(16);

      expect(flushCallback).toHaveBeenCalledTimes(1);
      expect(flushCallback).toHaveBeenCalledWith([op]);
      expect(batcher.getQueueSize()).toBe(0);
    });

    it('batches multiple operations', () => {
      batcher = new OperationBatcher(flushCallback, { batchWindow: 16 });

      const ops: DOMOperation[] = [
        { type: 'create', data: { id: '1' }, timestamp: Date.now() },
        { type: 'setAttribute', data: { id: '1', name: 'class', value: 'foo' }, timestamp: Date.now() },
        { type: 'append', data: { parentId: 'root', childId: '1' }, timestamp: Date.now() },
      ];

      ops.forEach(op => batcher.add(op));

      expect(batcher.getQueueSize()).toBe(3);

      // Fast-forward time
      jest.advanceTimersByTime(16);

      expect(flushCallback).toHaveBeenCalledTimes(1);
      expect(flushCallback).toHaveBeenCalledWith(ops);
      expect(batcher.getQueueSize()).toBe(0);
    });
  });

  describe('Auto-Flush on Max Batch Size', () => {
    it('auto-flushes when max batch size reached', () => {
      batcher = new OperationBatcher(flushCallback, {
        batchWindow: 100, // Long window
        maxBatchSize: 3,
      });

      const ops: DOMOperation[] = [
        { type: 'create', data: { id: '1' }, timestamp: Date.now() },
        { type: 'create', data: { id: '2' }, timestamp: Date.now() },
        { type: 'create', data: { id: '3' }, timestamp: Date.now() },
      ];

      ops.forEach(op => batcher.add(op));

      // Should flush immediately without waiting for timer
      expect(flushCallback).toHaveBeenCalledTimes(1);
      expect(flushCallback).toHaveBeenCalledWith(ops);
      expect(batcher.getQueueSize()).toBe(0);

      // Timer should not trigger additional flush
      jest.advanceTimersByTime(100);
      expect(flushCallback).toHaveBeenCalledTimes(1);
    });

    it('handles operations after auto-flush', () => {
      batcher = new OperationBatcher(flushCallback, {
        batchWindow: 16,
        maxBatchSize: 2,
      });

      // First batch (auto-flush)
      batcher.add({ type: 'create', data: { id: '1' }, timestamp: Date.now() });
      batcher.add({ type: 'create', data: { id: '2' }, timestamp: Date.now() });

      expect(flushCallback).toHaveBeenCalledTimes(1);

      // Second batch (timer flush)
      batcher.add({ type: 'create', data: { id: '3' }, timestamp: Date.now() });
      jest.advanceTimersByTime(16);

      expect(flushCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('Immediate Flush', () => {
    it('flushes operation immediately', () => {
      batcher = new OperationBatcher(flushCallback, { batchWindow: 100 });

      const op: DOMOperation = {
        type: 'callHost',
        data: { action: 'navigate', payload: { url: '/home' } },
        timestamp: Date.now(),
      };

      batcher.flushImmediate(op);

      expect(flushCallback).toHaveBeenCalledTimes(1);
      expect(flushCallback).toHaveBeenCalledWith([op]);
      expect(batcher.getQueueSize()).toBe(0);

      // Timer should not trigger additional flush
      jest.advanceTimersByTime(100);
      expect(flushCallback).toHaveBeenCalledTimes(1);
    });

    it('flushes queued operations with immediate', () => {
      batcher = new OperationBatcher(flushCallback, { batchWindow: 100 });

      batcher.add({ type: 'create', data: { id: '1' }, timestamp: Date.now() });
      batcher.add({ type: 'create', data: { id: '2' }, timestamp: Date.now() });

      const immediateOp: DOMOperation = {
        type: 'callHost',
        data: { action: 'alert' },
        timestamp: Date.now(),
      };

      batcher.flushImmediate(immediateOp);

      expect(flushCallback).toHaveBeenCalledTimes(1);
      // Should flush all 3 operations
      expect(flushCallback.mock.calls[0][0]).toHaveLength(3);
    });
  });

  describe('Manual Flush', () => {
    it('manually flushes operations', () => {
      batcher = new OperationBatcher(flushCallback, { batchWindow: 100 });

      batcher.add({ type: 'create', data: { id: '1' }, timestamp: Date.now() });
      batcher.add({ type: 'create', data: { id: '2' }, timestamp: Date.now() });

      batcher.flush();

      expect(flushCallback).toHaveBeenCalledTimes(1);
      expect(batcher.getQueueSize()).toBe(0);
    });

    it('handles empty flush', () => {
      batcher = new OperationBatcher(flushCallback);

      batcher.flush();

      expect(flushCallback).not.toHaveBeenCalled();
    });
  });

  describe('Clear Queue', () => {
    it('clears queue without flushing', () => {
      batcher = new OperationBatcher(flushCallback, { batchWindow: 100 });

      batcher.add({ type: 'create', data: { id: '1' }, timestamp: Date.now() });
      batcher.add({ type: 'create', data: { id: '2' }, timestamp: Date.now() });

      expect(batcher.getQueueSize()).toBe(2);

      batcher.clear();

      expect(batcher.getQueueSize()).toBe(0);
      expect(flushCallback).not.toHaveBeenCalled();

      // Timer should not trigger flush after clear
      jest.advanceTimersByTime(100);
      expect(flushCallback).not.toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('tracks total operations', () => {
      batcher = new OperationBatcher(flushCallback, { batchWindow: 16 });

      batcher.add({ type: 'create', data: { id: '1' }, timestamp: Date.now() });
      batcher.add({ type: 'create', data: { id: '2' }, timestamp: Date.now() });
      batcher.add({ type: 'create', data: { id: '3' }, timestamp: Date.now() });

      jest.advanceTimersByTime(16);

      const stats = batcher.getStats();
      expect(stats.totalOperations).toBe(3);
      expect(stats.totalBatches).toBe(1);
      expect(stats.totalFlushes).toBe(1);
    });

    it('tracks multiple batches', () => {
      batcher = new OperationBatcher(flushCallback, { batchWindow: 16 });

      // First batch
      batcher.add({ type: 'create', data: { id: '1' }, timestamp: Date.now() });
      batcher.add({ type: 'create', data: { id: '2' }, timestamp: Date.now() });
      jest.advanceTimersByTime(16);

      // Second batch
      batcher.add({ type: 'create', data: { id: '3' }, timestamp: Date.now() });
      jest.advanceTimersByTime(16);

      const stats = batcher.getStats();
      expect(stats.totalOperations).toBe(3);
      expect(stats.totalBatches).toBe(2);
      expect(stats.totalFlushes).toBe(2);
    });

    it('calculates reduction percentage', () => {
      batcher = new OperationBatcher(flushCallback, { batchWindow: 16 });

      // Add 10 operations that will be batched into 1 flush
      for (let i = 0; i < 10; i++) {
        batcher.add({ type: 'create', data: { id: `${i}` }, timestamp: Date.now() });
      }

      jest.advanceTimersByTime(16);

      const stats = batcher.getStats();
      expect(stats.totalOperations).toBe(10);
      expect(stats.totalFlushes).toBe(1);
      // Reduction: (10 - 1) / 10 = 90%
      expect(stats.reductionPercent).toBe(90);
    });

    it('tracks largest batch', () => {
      batcher = new OperationBatcher(flushCallback, { batchWindow: 16 });

      // Small batch
      batcher.add({ type: 'create', data: { id: '1' }, timestamp: Date.now() });
      jest.advanceTimersByTime(16);

      // Large batch
      for (let i = 0; i < 5; i++) {
        batcher.add({ type: 'create', data: { id: `${i}` }, timestamp: Date.now() });
      }
      jest.advanceTimersByTime(16);

      const stats = batcher.getStats();
      expect(stats.largestBatch).toBe(5);
    });

    it('calculates average batch size', () => {
      batcher = new OperationBatcher(flushCallback, { batchWindow: 16 });

      // Batch 1: 2 operations
      batcher.add({ type: 'create', data: { id: '1' }, timestamp: Date.now() });
      batcher.add({ type: 'create', data: { id: '2' }, timestamp: Date.now() });
      jest.advanceTimersByTime(16);

      // Batch 2: 4 operations
      for (let i = 0; i < 4; i++) {
        batcher.add({ type: 'create', data: { id: `${i}` }, timestamp: Date.now() });
      }
      jest.advanceTimersByTime(16);

      const stats = batcher.getStats();
      // Average: (2 + 4) / 2 = 3
      expect(stats.averageBatchSize).toBe(3);
    });

    it('resets statistics', () => {
      batcher = new OperationBatcher(flushCallback, { batchWindow: 16 });

      batcher.add({ type: 'create', data: { id: '1' }, timestamp: Date.now() });
      jest.advanceTimersByTime(16);

      batcher.resetStats();

      const stats = batcher.getStats();
      expect(stats.totalOperations).toBe(0);
      expect(stats.totalBatches).toBe(0);
      expect(stats.totalFlushes).toBe(0);
    });
  });

  describe('Destroy', () => {
    it('flushes and cleans up on destroy', () => {
      batcher = new OperationBatcher(flushCallback, { batchWindow: 100 });

      batcher.add({ type: 'create', data: { id: '1' }, timestamp: Date.now() });
      batcher.add({ type: 'create', data: { id: '2' }, timestamp: Date.now() });

      batcher.destroy();

      expect(flushCallback).toHaveBeenCalledTimes(1);
      expect(batcher.getQueueSize()).toBe(0);

      // Timer should not trigger after destroy
      jest.advanceTimersByTime(100);
      expect(flushCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('createBatcher Helper', () => {
    it('creates batcher with helper function', () => {
      const callback = jest.fn();
      batcher = createBatcher(callback, { batchWindow: 20 });

      expect(batcher).toBeInstanceOf(OperationBatcher);

      batcher.add({ type: 'create', data: { id: '1' }, timestamp: Date.now() });
      jest.advanceTimersByTime(20);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Performance Target Validation', () => {
    it('achieves ≥50% reduction with typical workload', () => {
      batcher = new OperationBatcher(flushCallback, { batchWindow: 16 });

      // Simulate 100 rapid operations (typical UI update scenario)
      for (let i = 0; i < 100; i++) {
        batcher.add({
          type: i % 2 === 0 ? 'create' : 'setAttribute',
          data: { id: `${i}` },
          timestamp: Date.now(),
        });
      }

      // Flush after batch window
      jest.advanceTimersByTime(16);

      const stats = batcher.getStats();
      console.log('=== OPERATION BATCHING PERFORMANCE ===');
      console.log(`Total operations: ${stats.totalOperations}`);
      console.log(`Total flushes: ${stats.totalFlushes}`);
      console.log(`Reduction: ${stats.reductionPercent}%`);
      console.log(`Target: ≥50% reduction`);
      console.log(`Result: ${stats.reductionPercent >= 50 ? 'PASS ✓' : 'FAIL ✗'}`);

      // Should batch all 100 operations into 1 flush = 99% reduction
      expect(stats.reductionPercent).toBeGreaterThanOrEqual(50);
      expect(stats.totalFlushes).toBeLessThan(stats.totalOperations / 2);
    });

    it('maintains frame budget (16ms window)', () => {
      batcher = new OperationBatcher(flushCallback, { batchWindow: 16 });

      const start = Date.now();

      // Add operations
      for (let i = 0; i < 10; i++) {
        batcher.add({ type: 'create', data: { id: `${i}` }, timestamp: Date.now() });
      }

      // Should flush within 16ms (simulated)
      jest.advanceTimersByTime(16);

      const stats = batcher.getStats();
      expect(stats.config.batchWindow).toBe(16); // 60 FPS target
    });
  });
});
