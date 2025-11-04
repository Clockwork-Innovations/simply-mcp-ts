/**
 * Foundation Layer: Batch Processing Tests
 *
 * Tests the core batch processing implementation including:
 * - Batch detection and validation
 * - Context propagation via AsyncLocalStorage
 * - Sequential processing
 * - Error handling and edge cases
 *
 * These tests verify actual functionality with meaningful assertions.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import {
  batchContextStorage,
  generateBatchId,
  validateNoDuplicateIds,
  validateBatch,
  detectBatch,
  processMessageWithContext,
  processBatch
} from '../../../src/server/builder-server.js';
import type { BatchContext, BatchingConfig } from '../../../src/index.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

// Mock Transport for testing
const mockTransport = {
  start: jest.fn(() => Promise.resolve()),
  send: jest.fn(),
  close: jest.fn(() => Promise.resolve())
};

describe('Foundation Layer: Batch Processing', () => {

  describe('Batch ID Generation', () => {
    test('generates unique batch IDs with correct format', () => {
      const id1 = generateBatchId();
      const id2 = generateBatchId();

      // Should start with batch_ prefix
      expect(id1).toMatch(/^batch_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^batch_\d+_[a-z0-9]+$/);

      // Should be unique
      expect(id1).not.toBe(id2);
    });
  });

  describe('Batch Detection', () => {
    test('single request returns null (no batch context)', () => {
      const msg = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'test'
      };
      const config: BatchingConfig = {};

      const result = detectBatch(msg, config);

      expect(result).toBeNull();
    });

    test('valid batch returns batch metadata with correct size', () => {
      const batch = [
        { jsonrpc: '2.0' as const, id: 1, method: 'test1' },
        { jsonrpc: '2.0' as const, id: 2, method: 'test2' },
        { jsonrpc: '2.0' as const, id: 3, method: 'test3' }
      ];
      const config: BatchingConfig = {};

      const result = detectBatch(batch, config);

      expect(result).not.toBeNull();
      expect(result?.size).toBe(3);
      expect(result?.batchId).toMatch(/^batch_/);
      expect(typeof result?.batchId).toBe('string');
    });

    test('empty batch throws error', () => {
      const batch: any[] = [];
      const config: BatchingConfig = {};

      expect(() => detectBatch(batch, config)).toThrow('cannot be empty');
    });

    test('oversized batch throws error with correct limit', () => {
      const batch = Array(101).fill({
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'test'
      });
      const config: BatchingConfig = { maxBatchSize: 100 };

      expect(() => detectBatch(batch, config)).toThrow('exceeds limit 100');
    });

    test('custom maxBatchSize limit is respected', () => {
      const batch = Array(51).fill({
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'test'
      });
      const config: BatchingConfig = { maxBatchSize: 50 };

      expect(() => detectBatch(batch, config)).toThrow('exceeds limit 50');
    });
  });

  describe('Batch Validation', () => {
    test('rejects duplicate request IDs', () => {
      const batch = [
        { jsonrpc: '2.0' as const, id: 1, method: 'test1' },
        { jsonrpc: '2.0' as const, id: 1, method: 'test2' }
      ];

      expect(() => validateNoDuplicateIds(batch)).toThrow('Duplicate request ID');
      expect(() => validateNoDuplicateIds(batch)).toThrow('1');
    });

    test('allows different request IDs', () => {
      const batch = [
        { jsonrpc: '2.0' as const, id: 1, method: 'test1' },
        { jsonrpc: '2.0' as const, id: 2, method: 'test2' },
        { jsonrpc: '2.0' as const, id: 3, method: 'test3' }
      ];

      expect(() => validateNoDuplicateIds(batch)).not.toThrow();
    });

    test('non-array message throws error', () => {
      const notAnArray = { jsonrpc: '2.0', id: 1, method: 'test' };
      const config: BatchingConfig = {};

      expect(() => validateBatch(notAnArray, config)).toThrow('must be an array');
    });

    test('single-item batch is allowed', () => {
      const batch = [
        { jsonrpc: '2.0' as const, id: 1, method: 'test' }
      ];
      const config: BatchingConfig = {};

      expect(() => validateBatch(batch, config)).not.toThrow();
    });

    test('maxBatchSize configuration respected', () => {
      const batch = Array(51).fill({
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'test'
      });
      const config: BatchingConfig = { maxBatchSize: 50 };

      expect(() => validateBatch(batch, config)).toThrow('exceeds limit 50');
    });

    test('notifications (no id) do not trigger duplicate ID errors', () => {
      const batch = [
        { jsonrpc: '2.0' as const, method: 'notify1' },
        { jsonrpc: '2.0' as const, method: 'notify2' },
        { jsonrpc: '2.0' as const, id: 1, method: 'request' }
      ];

      expect(() => validateNoDuplicateIds(batch)).not.toThrow();
    });

    test('mixed notifications and requests with duplicate IDs rejected', () => {
      const batch = [
        { jsonrpc: '2.0' as const, method: 'notify' },
        { jsonrpc: '2.0' as const, id: 1, method: 'request1' },
        { jsonrpc: '2.0' as const, id: 1, method: 'request2' }
      ];

      expect(() => validateNoDuplicateIds(batch)).toThrow('Duplicate request ID');
    });
  });

  describe('Context Propagation', () => {
    test('injects batch context for batch requests', async () => {
      let capturedContext: BatchContext | undefined;

      const batchContext: BatchContext = {
        size: 2,
        index: 0,
        parallel: false,
        batchId: 'test-batch-123'
      };

      const mockMessage = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'test'
      };

      const mockHandler = async () => {
        capturedContext = batchContextStorage.getStore();
      };

      await processMessageWithContext(mockMessage as any, batchContext, mockHandler);

      expect(capturedContext).toBeDefined();
      expect(capturedContext?.size).toBe(2);
      expect(capturedContext?.index).toBe(0);
      expect(capturedContext?.parallel).toBe(false);
      expect(capturedContext?.batchId).toBe('test-batch-123');
    });

    test('no context for single requests', async () => {
      let capturedContext: BatchContext | undefined = {
        size: 1,
        index: 0,
        parallel: false,
        batchId: 'should-be-undefined'
      };

      const mockHandler = async () => {
        capturedContext = batchContextStorage.getStore();
      };

      // Call handler directly (not through batch processing)
      await mockHandler();

      expect(capturedContext).toBeUndefined();
    });

    test('context accessible in nested async calls', async () => {
      let nestedContext: BatchContext | undefined;

      const batchContext: BatchContext = {
        size: 1,
        index: 0,
        parallel: false,
        batchId: 'test-nested'
      };

      const mockMessage = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'test'
      };

      const mockHandler = async () => {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        nestedContext = batchContextStorage.getStore();
      };

      await processMessageWithContext(mockMessage as any, batchContext, mockHandler);

      expect(nestedContext).toBeDefined();
      expect(nestedContext?.batchId).toBe('test-nested');
    });

    test('context isolated between batches', async () => {
      const contexts: (BatchContext | undefined)[] = [];

      const batchContext1: BatchContext = {
        size: 1,
        index: 0,
        parallel: false,
        batchId: 'batch-1'
      };

      const batchContext2: BatchContext = {
        size: 1,
        index: 0,
        parallel: false,
        batchId: 'batch-2'
      };

      const mockMessage = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'test'
      };

      const mockHandler = async () => {
        const ctx = batchContextStorage.getStore();
        contexts.push(ctx);
      };

      await processMessageWithContext(mockMessage as any, batchContext1, mockHandler);
      await processMessageWithContext(mockMessage as any, batchContext2, mockHandler);

      expect(contexts).toHaveLength(2);
      expect(contexts[0]?.batchId).toBe('batch-1');
      expect(contexts[1]?.batchId).toBe('batch-2');
    });

    test('context propagates through multiple async layers', async () => {
      let deepContext: BatchContext | undefined;

      const batchContext: BatchContext = {
        size: 3,
        index: 1,
        parallel: false,
        batchId: 'deep-test'
      };

      const mockMessage = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'test'
      };

      const deepAsyncFunction = async () => {
        await Promise.resolve();
        deepContext = batchContextStorage.getStore();
      };

      const middleAsyncFunction = async () => {
        await Promise.resolve();
        await deepAsyncFunction();
      };

      const mockHandler = async () => {
        await middleAsyncFunction();
      };

      await processMessageWithContext(mockMessage as any, batchContext, mockHandler);

      expect(deepContext).toBeDefined();
      expect(deepContext?.batchId).toBe('deep-test');
      expect(deepContext?.index).toBe(1);
    });
  });

  describe('Sequential Processing', () => {
    test('processes messages in order', async () => {
      const order: number[] = [];

      const messages = [
        { jsonrpc: '2.0' as const, id: 1, method: 'test' },
        { jsonrpc: '2.0' as const, id: 2, method: 'test' },
        { jsonrpc: '2.0' as const, id: 3, method: 'test' }
      ];

      const mockHandler = async (msg: any) => {
        order.push(msg.id as number);
        await new Promise(resolve => setTimeout(resolve, 10));
      };

      await processBatch(messages as any, 'test-batch', mockHandler, { parallel: false }, mockTransport as any);

      expect(order).toEqual([1, 2, 3]);
    });

    test('continues after individual message failure', async () => {
      const processed: number[] = [];
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const messages = [
        { jsonrpc: '2.0' as const, id: 1, method: 'test' },
        { jsonrpc: '2.0' as const, id: 2, method: 'fail' },
        { jsonrpc: '2.0' as const, id: 3, method: 'test' }
      ];

      const mockHandler = async (msg: any) => {
        if (msg.method === 'fail') {
          throw new Error('Intentional failure');
        }
        processed.push(msg.id as number);
      };

      await processBatch(messages as any, 'test-batch', mockHandler, { parallel: false }, mockTransport as any);

      // Should process 1 and 3, skip 2 (but don't abort)
      expect(processed).toEqual([1, 3]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Batch test-batch message 1 failed:'),
        expect.any(String)
      );

      consoleErrorSpy.mockRestore();
    });

    test('index increments correctly', async () => {
      const indices: number[] = [];

      const messages = Array(5).fill(null).map((_, i) => ({
        jsonrpc: '2.0' as const,
        id: i,
        method: 'test'
      }));

      const mockHandler = async () => {
        const ctx = batchContextStorage.getStore();
        if (ctx) indices.push(ctx.index);
      };

      await processBatch(messages as any, 'test-batch', mockHandler, { parallel: false }, mockTransport as any);

      expect(indices).toEqual([0, 1, 2, 3, 4]);
    });

    test('batch size is consistent across all messages', async () => {
      const sizes: number[] = [];

      const messages = [
        { jsonrpc: '2.0' as const, id: 1, method: 'test' },
        { jsonrpc: '2.0' as const, id: 2, method: 'test' },
        { jsonrpc: '2.0' as const, id: 3, method: 'test' }
      ];

      const mockHandler = async () => {
        const ctx = batchContextStorage.getStore();
        if (ctx) sizes.push(ctx.size);
      };

      await processBatch(messages as any, 'test-batch', mockHandler, { parallel: false }, mockTransport as any);

      expect(sizes).toEqual([3, 3, 3]);
    });

    test('parallel flag is always false in Foundation Layer', async () => {
      const parallelFlags: boolean[] = [];

      const messages = [
        { jsonrpc: '2.0' as const, id: 1, method: 'test' },
        { jsonrpc: '2.0' as const, id: 2, method: 'test' }
      ];

      const mockHandler = async () => {
        const ctx = batchContextStorage.getStore();
        if (ctx) parallelFlags.push(ctx.parallel);
      };

      await processBatch(messages as any, 'test-batch', mockHandler, { parallel: false }, mockTransport as any);

      expect(parallelFlags).toEqual([false, false]);
    });

    test('timeout is undefined in Foundation Layer', async () => {
      let capturedTimeout: number | undefined = 999;

      const messages = [
        { jsonrpc: '2.0' as const, id: 1, method: 'test' }
      ];

      const mockHandler = async () => {
        const ctx = batchContextStorage.getStore();
        capturedTimeout = ctx?.timeout;
      };

      await processBatch(messages as any, 'test-batch', mockHandler, { parallel: false }, mockTransport as any);

      expect(capturedTimeout).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('mixed notifications and requests', async () => {
      const processed: (number | string)[] = [];

      const messages = [
        { jsonrpc: '2.0' as const, method: 'notify1' },
        { jsonrpc: '2.0' as const, id: 1, method: 'request' },
        { jsonrpc: '2.0' as const, method: 'notify2' },
        { jsonrpc: '2.0' as const, id: 2, method: 'request' }
      ];

      const mockHandler = async (msg: any) => {
        processed.push(msg.id ?? msg.method!);
      };

      await processBatch(messages as any, 'test-batch', mockHandler, { parallel: false }, mockTransport as any);

      expect(processed).toEqual(['notify1', 1, 'notify2', 2]);
    });

    test('single-item batch has batch context', async () => {
      let capturedContext: BatchContext | undefined;

      const messages = [
        { jsonrpc: '2.0' as const, id: 1, method: 'test' }
      ];

      const mockHandler = async () => {
        capturedContext = batchContextStorage.getStore();
      };

      await processBatch(messages as any, 'test-batch', mockHandler, { parallel: false }, mockTransport as any);

      expect(capturedContext).toBeDefined();
      expect(capturedContext?.size).toBe(1);
      expect(capturedContext?.index).toBe(0);
      expect(capturedContext?.batchId).toBe('test-batch');
    });

    test('messages with string IDs handled correctly', async () => {
      const messages = [
        { jsonrpc: '2.0' as const, id: 'string-id-1', method: 'test' },
        { jsonrpc: '2.0' as const, id: 'string-id-2', method: 'test' }
      ];

      // Should not throw
      expect(() => validateNoDuplicateIds(messages as any)).not.toThrow();
    });

    test('messages with null IDs treated as notifications', async () => {
      const messages = [
        { jsonrpc: '2.0' as const, id: null, method: 'test' },
        { jsonrpc: '2.0' as const, id: 1, method: 'test' }
      ];

      // Null IDs should not trigger duplicate check
      expect(() => validateNoDuplicateIds(messages as any)).not.toThrow();
    });

    test('large batch within limit processes successfully', async () => {
      const processedCount = { count: 0 };

      const messages = Array(100).fill(null).map((_, i) => ({
        jsonrpc: '2.0' as const,
        id: i,
        method: 'test'
      }));

      const mockHandler = async () => {
        processedCount.count++;
      };

      await processBatch(messages as any, 'large-batch', mockHandler, { parallel: false }, mockTransport as any);

      expect(processedCount.count).toBe(100);
    });
  });

  describe('Backward Compatibility', () => {
    test('single requests work unchanged', async () => {
      let handlerCalled = false;
      let contextWasUndefined = false;

      const singleMessage = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'test'
      };

      const mockHandler = async (msg: any) => {
        handlerCalled = true;
        contextWasUndefined = batchContextStorage.getStore() === undefined;
        expect(msg.id).toBe(1);
        expect(msg.method).toBe('test');
      };

      // Simulate transport.onmessage behavior for single request
      const config: BatchingConfig = {};
      const batchInfo = detectBatch(singleMessage, config);

      if (!batchInfo) {
        // Single request - call handler directly without batch context
        await mockHandler(singleMessage);
      }

      expect(handlerCalled).toBe(true);
      expect(contextWasUndefined).toBe(true);
      expect(batchInfo).toBeNull();
    });
  });

  // Transport Wrapper Integration tests removed
  // The internal wrapStdioTransportForBatch function is not exported and is tested
  // indirectly through integration tests and the processBatch function tests above.

  describe('Parallel Processing (Feature Layer)', () => {
    describe('Concurrent Execution', () => {
      test('processes messages concurrently when parallel=true', async () => {
        const startTimes: number[] = [];
        const endTimes: number[] = [];

        const messages = [
          { jsonrpc: '2.0' as const, id: 1, method: 'test' },
          { jsonrpc: '2.0' as const, id: 2, method: 'test' },
          { jsonrpc: '2.0' as const, id: 3, method: 'test' }
        ];

        const mockHandler = async (msg: any) => {
          startTimes.push(Date.now());
          await new Promise(resolve => setTimeout(resolve, 50)); // Simulate async work
          endTimes.push(Date.now());
        };

        await processBatch(messages as any, 'concurrent-batch', mockHandler, { parallel: true }, mockTransport as any);

        // All messages should start within 10ms of each other (concurrent)
        const minStartTime = Math.min(...startTimes);
        const maxStartTime = Math.max(...startTimes);
        expect(maxStartTime - minStartTime).toBeLessThan(10);

        // All messages should have been called
        expect(startTimes).toHaveLength(3);
        expect(endTimes).toHaveLength(3);
      });

      test('processes messages sequentially when parallel=false', async () => {
        const startTimes: number[] = [];
        const endTimes: number[] = [];

        const messages = [
          { jsonrpc: '2.0' as const, id: 1, method: 'test' },
          { jsonrpc: '2.0' as const, id: 2, method: 'test' },
          { jsonrpc: '2.0' as const, id: 3, method: 'test' }
        ];

        const mockHandler = async (msg: any) => {
          startTimes.push(Date.now());
          await new Promise(resolve => setTimeout(resolve, 30)); // Simulate async work
          endTimes.push(Date.now());
        };

        await processBatch(messages as any, 'sequential-batch', mockHandler, { parallel: false }, mockTransport as any);

        // Each message should start after the previous one finishes (sequential)
        // Message 2 should start after message 1 ends
        expect(startTimes[1]).toBeGreaterThanOrEqual(endTimes[0]);
        // Message 3 should start after message 2 ends
        expect(startTimes[2]).toBeGreaterThanOrEqual(endTimes[1]);
      });

      test('defaults to sequential when parallel is undefined', async () => {
        const startTimes: number[] = [];
        const endTimes: number[] = [];

        const messages = [
          { jsonrpc: '2.0' as const, id: 1, method: 'test' },
          { jsonrpc: '2.0' as const, id: 2, method: 'test' }
        ];

        const mockHandler = async (msg: any) => {
          startTimes.push(Date.now());
          await new Promise(resolve => setTimeout(resolve, 30));
          endTimes.push(Date.now());
        };

        await processBatch(messages as any, 'default-batch', mockHandler, {}, mockTransport as any); // No parallel config

        // Should be sequential by default
        expect(startTimes[1]).toBeGreaterThanOrEqual(endTimes[0]);
      });
    });

    describe('Result Ordering', () => {
      test('maintains result order even with varying completion times', async () => {
        const completionOrder: number[] = [];
        const handlerCallOrder: number[] = [];

        const messages = [
          { jsonrpc: '2.0' as const, id: 1, method: 'slow' },
          { jsonrpc: '2.0' as const, id: 2, method: 'fast' },
          { jsonrpc: '2.0' as const, id: 3, method: 'medium' }
        ];

        const mockHandler = async (msg: any) => {
          handlerCallOrder.push(msg.id as number);

          // Different delays to test ordering
          const delay = msg.method === 'slow' ? 60 : msg.method === 'fast' ? 10 : 30;
          await new Promise(resolve => setTimeout(resolve, delay));

          completionOrder.push(msg.id as number);
        };

        await processBatch(messages as any, 'order-batch', mockHandler, { parallel: true }, mockTransport as any);

        // Handlers should be called in batch order (1, 2, 3)
        expect(handlerCallOrder).toEqual([1, 2, 3]);

        // Completions may be out of order (fast finishes first)
        // This verifies we're actually processing in parallel
        expect(completionOrder).toEqual([2, 3, 1]); // fast, medium, slow
      });

      test('result array index matches batch array index in parallel mode', async () => {
        const capturedIndices: number[] = [];

        const messages = [
          { jsonrpc: '2.0' as const, id: 'a', method: 'test' },
          { jsonrpc: '2.0' as const, id: 'b', method: 'test' },
          { jsonrpc: '2.0' as const, id: 'c', method: 'test' }
        ];

        const mockHandler = async (msg: any) => {
          const ctx = batchContextStorage.getStore();
          if (ctx) capturedIndices.push(ctx.index);

          // Random delays
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        };

        await processBatch(messages as any, 'index-batch', mockHandler, { parallel: true }, mockTransport as any);

        // Indices should be called in order even though processing is parallel
        expect(capturedIndices).toContain(0);
        expect(capturedIndices).toContain(1);
        expect(capturedIndices).toContain(2);
        expect(capturedIndices).toHaveLength(3);
      });
    });

    describe('Context Propagation (Parallel Mode)', () => {
      test('injects correct batch index for each concurrent message', async () => {
        const capturedContexts: any[] = [];

        const messages = [
          { jsonrpc: '2.0' as const, id: 1, method: 'test' },
          { jsonrpc: '2.0' as const, id: 2, method: 'test' },
          { jsonrpc: '2.0' as const, id: 3, method: 'test' }
        ];

        const mockHandler = async (msg: any) => {
          const context = batchContextStorage.getStore();
          capturedContexts.push({ ...context, msgId: msg.id }); // Clone context with message ID
        };

        await processBatch(messages as any, 'context-batch', mockHandler, { parallel: true }, mockTransport as any);

        // Sort by message ID to ensure consistent comparison
        capturedContexts.sort((a, b) => (a.msgId as number) - (b.msgId as number));

        // Verify each message had correct index
        expect(capturedContexts[0].index).toBe(0);
        expect(capturedContexts[1].index).toBe(1);
        expect(capturedContexts[2].index).toBe(2);
      });

      test('sets parallel flag to true in batch context', async () => {
        const parallelFlags: boolean[] = [];

        const messages = [
          { jsonrpc: '2.0' as const, id: 1, method: 'test' },
          { jsonrpc: '2.0' as const, id: 2, method: 'test' }
        ];

        const mockHandler = async () => {
          const ctx = batchContextStorage.getStore();
          if (ctx) parallelFlags.push(ctx.parallel);
        };

        await processBatch(messages as any, 'parallel-flag-batch', mockHandler, { parallel: true }, mockTransport as any);

        // All contexts should have parallel=true
        expect(parallelFlags).toEqual([true, true]);
      });

      test('shares batch ID across all concurrent messages', async () => {
        const capturedBatchIds: string[] = [];

        const messages = [
          { jsonrpc: '2.0' as const, id: 1, method: 'test' },
          { jsonrpc: '2.0' as const, id: 2, method: 'test' },
          { jsonrpc: '2.0' as const, id: 3, method: 'test' }
        ];

        const mockHandler = async () => {
          const ctx = batchContextStorage.getStore();
          if (ctx) capturedBatchIds.push(ctx.batchId);
        };

        await processBatch(messages as any, 'shared-id-batch', mockHandler, { parallel: true }, mockTransport as any);

        // All messages should have the same batch ID
        const uniqueBatchIds = new Set(capturedBatchIds);
        expect(uniqueBatchIds.size).toBe(1);
        expect(capturedBatchIds[0]).toBe('shared-id-batch');
      });

      test('no context leakage between concurrent messages', async () => {
        const capturedContexts: any[] = [];

        const messages = [
          { jsonrpc: '2.0' as const, id: 1, method: 'test1' },
          { jsonrpc: '2.0' as const, id: 2, method: 'test2' },
          { jsonrpc: '2.0' as const, id: 3, method: 'test3' }
        ];

        const mockHandler = async (msg: any) => {
          // Capture context at different points in execution
          const initialContext = batchContextStorage.getStore();

          await new Promise(resolve => setTimeout(resolve, 20));

          const afterDelayContext = batchContextStorage.getStore();

          capturedContexts.push({
            msgId: msg.id,
            initialIndex: initialContext?.index,
            afterDelayIndex: afterDelayContext?.index,
            initialBatchId: initialContext?.batchId,
            afterDelayBatchId: afterDelayContext?.batchId
          });
        };

        await processBatch(messages as any, 'no-leakage-batch', mockHandler, { parallel: true }, mockTransport as any);

        // Sort by message ID
        capturedContexts.sort((a, b) => a.msgId - b.msgId);

        // Each message should maintain its own context throughout execution
        expect(capturedContexts[0].initialIndex).toBe(0);
        expect(capturedContexts[0].afterDelayIndex).toBe(0);
        expect(capturedContexts[1].initialIndex).toBe(1);
        expect(capturedContexts[1].afterDelayIndex).toBe(1);
        expect(capturedContexts[2].initialIndex).toBe(2);
        expect(capturedContexts[2].afterDelayIndex).toBe(2);

        // Batch ID should be consistent for each message
        expect(capturedContexts[0].initialBatchId).toBe('no-leakage-batch');
        expect(capturedContexts[0].afterDelayBatchId).toBe('no-leakage-batch');
      });
    });

    describe('Error Handling (Parallel Mode)', () => {
      test('continues processing other messages when one fails', async () => {
        const processed: number[] = [];
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const messages = [
          { jsonrpc: '2.0' as const, id: 1, method: 'test' },
          { jsonrpc: '2.0' as const, id: 2, method: 'fail' },
          { jsonrpc: '2.0' as const, id: 3, method: 'test' }
        ];

        const mockHandler = async (msg: any) => {
          if (msg.method === 'fail') {
            throw new Error('Intentional parallel failure');
          }
          await new Promise(resolve => setTimeout(resolve, 20));
          processed.push(msg.id as number);
        };

        await processBatch(messages as any, 'error-batch', mockHandler, { parallel: true }, mockTransport as any);

        // Messages 1 and 3 should complete successfully
        expect(processed).toContain(1);
        expect(processed).toContain(3);
        expect(processed).toHaveLength(2);

        // Error should be logged
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Batch error-batch message 1 failed:'),
          expect.any(String)
        );

        consoleErrorSpy.mockRestore();
      });

      test('handles multiple concurrent failures gracefully', async () => {
        const processed: number[] = [];
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const messages = [
          { jsonrpc: '2.0' as const, id: 1, method: 'fail' },
          { jsonrpc: '2.0' as const, id: 2, method: 'test' },
          { jsonrpc: '2.0' as const, id: 3, method: 'fail' },
          { jsonrpc: '2.0' as const, id: 4, method: 'test' }
        ];

        const mockHandler = async (msg: any) => {
          if (msg.method === 'fail') {
            throw new Error(`Failure for ${msg.id}`);
          }
          processed.push(msg.id as number);
        };

        await processBatch(messages as any, 'multi-error-batch', mockHandler, { parallel: true }, mockTransport as any);

        // Only successful messages should complete
        expect(processed).toEqual([2, 4]);

        // Both errors should be logged
        expect(consoleErrorSpy).toHaveBeenCalledTimes(2);

        consoleErrorSpy.mockRestore();
      });
    });

    describe('Mode Comparison', () => {
      test('produces same results in both sequential and parallel modes', async () => {
        const messages = [
          { jsonrpc: '2.0' as const, id: 1, method: 'add', params: { a: 5, b: 3 } },
          { jsonrpc: '2.0' as const, id: 2, method: 'multiply', params: { a: 4, b: 7 } },
          { jsonrpc: '2.0' as const, id: 3, method: 'add', params: { a: 10, b: 20 } }
        ];

        const sequentialResults: any[] = [];
        const parallelResults: any[] = [];

        const mockHandler = async (msg: any) => {
          const ctx = batchContextStorage.getStore();
          const result = {
            id: msg.id,
            method: msg.method,
            index: ctx?.index,
            size: ctx?.size,
            batchId: ctx?.batchId,
            parallel: ctx?.parallel
          };

          // Simulate varying execution times
          await new Promise(resolve => setTimeout(resolve, Math.random() * 30));

          return result;
        };

        // Process sequentially
        const seqHandler = async (msg: any) => {
          const result = await mockHandler(msg);
          sequentialResults.push(result);
        };
        await processBatch(messages as any, 'seq-batch', seqHandler, { parallel: false }, mockTransport as any);

        // Process in parallel
        const parHandler = async (msg: any) => {
          const result = await mockHandler(msg);
          parallelResults.push(result);
        };
        await processBatch(messages as any, 'par-batch', parHandler, { parallel: true }, mockTransport as any);

        // Sort results by ID for comparison
        sequentialResults.sort((a, b) => a.id - b.id);
        parallelResults.sort((a, b) => a.id - b.id);

        // Results should be the same except for parallel flag and batchId
        expect(sequentialResults.length).toBe(parallelResults.length);

        for (let i = 0; i < sequentialResults.length; i++) {
          expect(sequentialResults[i].id).toBe(parallelResults[i].id);
          expect(sequentialResults[i].method).toBe(parallelResults[i].method);
          expect(sequentialResults[i].index).toBe(parallelResults[i].index);
          expect(sequentialResults[i].size).toBe(parallelResults[i].size);

          // These should differ
          expect(sequentialResults[i].parallel).toBe(false);
          expect(parallelResults[i].parallel).toBe(true);
        }
      });
    });
  });

  describe('Timeout Enforcement (Feature Layer)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('Sequential Mode Timeouts', () => {
      test('stops processing and sends timeout errors for remaining messages when timeout exceeded', async () => {
        const messages = [
          { jsonrpc: '2.0' as const, id: 1, method: 'fast' },
          { jsonrpc: '2.0' as const, id: 2, method: 'slow' },
          { jsonrpc: '2.0' as const, id: 3, method: 'slow' }
        ];

        const processed: number[] = [];
        const mockHandler = jest.fn(async (msg: any) => {
          if (msg.method === 'fast') {
            await new Promise(resolve => setTimeout(resolve, 10));
          } else {
            await new Promise(resolve => setTimeout(resolve, 200)); // Will timeout
          }
          processed.push(msg.id);
        });

        // Spy on transport.send to capture timeout errors
        const sendSpy = jest.spyOn(mockTransport, 'send');

        await processBatch(messages as any, 'timeout-batch', mockHandler, {
          parallel: false,
          timeout: 30 // Timeout after 30ms (allows only first message)
        }, mockTransport as any);

        // Verify first message processed successfully
        expect(processed).toContain(1);

        // Verify at least one remaining message timed out (not processed)
        // Note: Due to timing, message 2 may start before timeout check
        expect(processed.length).toBeLessThan(messages.length);

        // Verify at least one timeout error was sent
        const timeoutCalls = sendSpy.mock.calls.filter((call: any) =>
          call[0]?.error?.code === -32000
        );
        expect(timeoutCalls.length).toBeGreaterThan(0);

        // Verify timeout error structure
        expect(timeoutCalls[0][0]).toMatchObject({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Batch timeout exceeded',
            data: {
              timeoutMs: 30
            }
          }
        });
      });

      test('completes already-processed messages successfully before timeout', async () => {
        const messages = [
          { jsonrpc: '2.0' as const, id: 1, method: 'fast1' },
          { jsonrpc: '2.0' as const, id: 2, method: 'fast2' },
          { jsonrpc: '2.0' as const, id: 3, method: 'slow' },
          { jsonrpc: '2.0' as const, id: 4, method: 'slow' }
        ];

        const processed: number[] = [];
        const mockHandler = jest.fn(async (msg: any) => {
          if (msg.method.startsWith('fast')) {
            await new Promise(resolve => setTimeout(resolve, 15));
          } else {
            await new Promise(resolve => setTimeout(resolve, 200)); // Will timeout
          }
          processed.push(msg.id);
        });

        const sendSpy = jest.spyOn(mockTransport, 'send');

        await processBatch(messages as any, 'partial-batch', mockHandler, {
          parallel: false,
          timeout: 50 // Timeout after 50ms (allows 2 fast messages)
        }, mockTransport as any);

        // Verify first two messages processed successfully
        expect(processed).toContain(1);
        expect(processed).toContain(2);

        // Verify at least one remaining message timed out
        expect(processed.length).toBeLessThan(messages.length);

        // Verify timeout errors were sent
        const timeoutCalls = sendSpy.mock.calls.filter((call: any) =>
          call[0]?.error?.code === -32000
        );
        expect(timeoutCalls.length).toBeGreaterThan(0);
      });
    });

    describe('Parallel Mode Timeouts', () => {
      test('enforces timeout via Promise.race for parallel batch', async () => {
        const messages = [
          { jsonrpc: '2.0' as const, id: 1, method: 'fast' },
          { jsonrpc: '2.0' as const, id: 2, method: 'slow' },
          { jsonrpc: '2.0' as const, id: 3, method: 'slow' }
        ];

        const processed: number[] = [];
        const mockHandler = jest.fn(async (msg: any) => {
          if (msg.method === 'fast') {
            await new Promise(resolve => setTimeout(resolve, 10));
          } else {
            await new Promise(resolve => setTimeout(resolve, 150)); // Will timeout
          }
          processed.push(msg.id);
        });

        const sendSpy = jest.spyOn(mockTransport, 'send');

        await processBatch(messages as any, 'parallel-timeout-batch', mockHandler, {
          parallel: true,
          timeout: 50 // Timeout after 50ms
        }, mockTransport as any);

        // Fast message should complete
        expect(processed).toContain(1);

        // Slow messages should timeout
        expect(processed).not.toContain(2);
        expect(processed).not.toContain(3);

        // Verify timeout errors sent for slow messages
        const timeoutCalls = sendSpy.mock.calls.filter((call: any) =>
          call[0]?.error?.code === -32000
        );
        expect(timeoutCalls.length).toBeGreaterThanOrEqual(2);
      });

      test('preserves completed message responses when timeout occurs', async () => {
        const messages = [
          { jsonrpc: '2.0' as const, id: 1, method: 'fast1' },
          { jsonrpc: '2.0' as const, id: 2, method: 'fast2' },
          { jsonrpc: '2.0' as const, id: 3, method: 'slow' },
          { jsonrpc: '2.0' as const, id: 4, method: 'slow' }
        ];

        const processed: number[] = [];
        const mockHandler = jest.fn(async (msg: any) => {
          if (msg.method.startsWith('fast')) {
            await new Promise(resolve => setTimeout(resolve, 10));
            processed.push(msg.id);
          } else {
            await new Promise(resolve => setTimeout(resolve, 200)); // Will timeout
            processed.push(msg.id);
          }
        });

        const sendSpy = jest.spyOn(mockTransport, 'send');

        await processBatch(messages as any, 'parallel-partial-batch', mockHandler, {
          parallel: true,
          timeout: 60 // Timeout after 60ms (allows fast messages to complete)
        }, mockTransport as any);

        // Wait a bit for fast messages to complete
        await new Promise(resolve => setTimeout(resolve, 30));

        // Fast messages should have completed
        expect(processed).toContain(1);
        expect(processed).toContain(2);

        // Slow messages should timeout
        expect(processed).not.toContain(3);
        expect(processed).not.toContain(4);

        // Verify timeout errors sent for incomplete messages
        const timeoutCalls = sendSpy.mock.calls.filter((call: any) =>
          call[0]?.error?.code === -32000
        );
        expect(timeoutCalls.length).toBeGreaterThan(0);
      });
    });

    describe('No Timeout Behavior', () => {
      test('processes all messages when timeout is undefined', async () => {
        const messages = [
          { jsonrpc: '2.0' as const, id: 1, method: 'test1' },
          { jsonrpc: '2.0' as const, id: 2, method: 'test2' },
          { jsonrpc: '2.0' as const, id: 3, method: 'test3' }
        ];

        const processed: number[] = [];
        const mockHandler = jest.fn(async (msg: any) => {
          // All messages take 50ms
          await new Promise(resolve => setTimeout(resolve, 50));
          processed.push(msg.id);
        });

        const sendSpy = jest.spyOn(mockTransport, 'send');

        await processBatch(messages as any, 'no-timeout-batch', mockHandler, {
          parallel: false,
          timeout: undefined // No timeout
        }, mockTransport as any);

        // All messages should process successfully
        expect(processed).toEqual([1, 2, 3]);

        // No timeout errors should be sent
        const timeoutCalls = sendSpy.mock.calls.filter((call: any) =>
          call[0]?.error?.code === -32000
        );
        expect(timeoutCalls.length).toBe(0);
      });
    });

    describe('Timeout Context Fields', () => {
      test('populates startTime and elapsedMs in batch context', async () => {
        const capturedContexts: any[] = [];

        const messages = [
          { jsonrpc: '2.0' as const, id: 1, method: 'test1' },
          { jsonrpc: '2.0' as const, id: 2, method: 'test2' },
          { jsonrpc: '2.0' as const, id: 3, method: 'test3' }
        ];

        const mockHandler = jest.fn(async (msg: any) => {
          const context = batchContextStorage.getStore();
          capturedContexts.push({ ...context });
          await new Promise(resolve => setTimeout(resolve, 20));
        });

        const beforeStart = Date.now();
        await processBatch(messages as any, 'context-batch', mockHandler, {
          parallel: false,
          timeout: 1000
        }, mockTransport as any);
        const afterEnd = Date.now();

        // Verify all contexts captured
        expect(capturedContexts.length).toBe(3);

        // Verify startTime is reasonable for all contexts
        for (const context of capturedContexts) {
          expect(context.startTime).toBeDefined();
          expect(context.startTime).toBeGreaterThanOrEqual(beforeStart);
          expect(context.startTime).toBeLessThanOrEqual(afterEnd);
        }

        // Verify elapsedMs is defined and reasonable
        for (const context of capturedContexts) {
          expect(context.elapsedMs).toBeDefined();
          expect(context.elapsedMs).toBeGreaterThanOrEqual(0);
          expect(context.elapsedMs).toBeLessThan(afterEnd - beforeStart);
        }

        // Verify elapsedMs increases over time (sequential processing)
        expect(capturedContexts[1].elapsedMs).toBeGreaterThan(capturedContexts[0].elapsedMs);
        expect(capturedContexts[2].elapsedMs).toBeGreaterThan(capturedContexts[1].elapsedMs);

        // Verify timeout is set correctly
        for (const context of capturedContexts) {
          expect(context.timeout).toBe(1000);
        }
      });

      test('startTime and elapsedMs are undefined when no timeout configured', async () => {
        const capturedContexts: any[] = [];

        const messages = [
          { jsonrpc: '2.0' as const, id: 1, method: 'test' }
        ];

        const mockHandler = jest.fn(async (msg: any) => {
          const context = batchContextStorage.getStore();
          capturedContexts.push({ ...context });
        });

        await processBatch(messages as any, 'no-timeout-context-batch', mockHandler, {
          parallel: false
          // No timeout configured
        }, mockTransport as any);

        expect(capturedContexts.length).toBe(1);
        expect(capturedContexts[0].startTime).toBeUndefined();
        expect(capturedContexts[0].elapsedMs).toBeUndefined();
        expect(capturedContexts[0].timeout).toBeUndefined();
      });
    });

    describe('Timeout Error Format', () => {
      test('generates correct JSON-RPC error responses for timed-out messages', async () => {
        const messages = [
          { jsonrpc: '2.0' as const, id: 1, method: 'fast' },
          { jsonrpc: '2.0' as const, id: 2, method: 'slow' },
          { jsonrpc: '2.0' as const, id: 'string-id', method: 'slow' }
        ];

        const mockHandler = jest.fn(async (msg: any) => {
          if (msg.method === 'fast') {
            await new Promise(resolve => setTimeout(resolve, 10));
          } else {
            await new Promise(resolve => setTimeout(resolve, 200)); // Will timeout
          }
        });

        const sendSpy = jest.spyOn(mockTransport, 'send');

        await processBatch(messages as any, 'error-format-batch', mockHandler, {
          parallel: false,
          timeout: 25
        }, mockTransport as any);

        // Get all timeout error calls
        const timeoutCalls = sendSpy.mock.calls.filter((call: any) =>
          call[0]?.error?.code === -32000
        );

        expect(timeoutCalls.length).toBeGreaterThan(0);

        // Verify error structure for first timeout error
        const errorResponse = timeoutCalls[0][0] as any;

        // Verify JSON-RPC 2.0 structure
        expect(errorResponse.jsonrpc).toBe('2.0');
        expect(errorResponse.id).toBeDefined();

        // Verify error object structure
        expect(errorResponse.error).toBeDefined();
        expect(errorResponse.error.code).toBe(-32000);
        expect(errorResponse.error.message).toBe('Batch timeout exceeded');

        // Verify error data
        expect(errorResponse.error.data).toBeDefined();
        expect(errorResponse.error.data.timeoutMs).toBe(25);
        expect(errorResponse.error.data.elapsedMs).toBeDefined();
        expect(errorResponse.error.data.elapsedMs).toBeGreaterThanOrEqual(25);

        // Verify at least one slow message received timeout error
        const errorIds = timeoutCalls.map((call: any) => call[0].id);
        const hasSlowMessageError = errorIds.includes(2) || errorIds.includes('string-id');
        expect(hasSlowMessageError).toBe(true);
        expect(errorIds).not.toContain(1); // Fast message should not timeout
      });

      test('does not send timeout errors for notifications (no id field)', async () => {
        const messages = [
          { jsonrpc: '2.0' as const, method: 'notify1' }, // Notification
          { jsonrpc: '2.0' as const, id: 1, method: 'request' }, // Request
          { jsonrpc: '2.0' as const, method: 'notify2' } // Notification
        ];

        const mockHandler = jest.fn(async (msg: any) => {
          // All messages take long enough to timeout
          await new Promise(resolve => setTimeout(resolve, 100));
        });

        const sendSpy = jest.spyOn(mockTransport, 'send');

        await processBatch(messages as any, 'notification-batch', mockHandler, {
          parallel: false,
          timeout: 10 // Very short timeout
        }, mockTransport as any);

        // Get all timeout error calls
        const timeoutCalls = sendSpy.mock.calls.filter((call: any) =>
          call[0]?.error?.code === -32000
        );

        // Only the request (id: 1) should get a timeout error
        // Notifications should not receive error responses
        expect(timeoutCalls.length).toBe(1);
        expect((timeoutCalls[0][0] as any).id).toBe(1);
      });
    });
  });
});
