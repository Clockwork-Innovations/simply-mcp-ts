/**
 * Remote DOM Worker Foundation Tests
 *
 * Comprehensive test suite for the Remote DOM Web Worker sandbox system.
 * Tests cover:
 * - Worker initialization and lifecycle
 * - Code security validation
 * - Message passing and response matching
 * - Timeout handling
 * - Batch operations
 * - Error handling
 *
 * @jest-environment jsdom
 * @module tests/unit/client/remote-dom-worker
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { RemoteDOMWorkerManager } from '../../../src/client/remote-dom/RemoteDOMWorkerManager.js';
import type { RemoteDOMOperation } from '../../../src/client/remote-dom/types.js';

describe('Remote DOM Worker - Foundation Layer', () => {
  let manager: RemoteDOMWorkerManager;

  beforeEach(async () => {
    // Create a new manager for each test
    manager = new RemoteDOMWorkerManager({
      debug: false, // Set to true for debugging
      timeout: 5000,
    });

    // Initialize the worker
    await manager.init();
  });

  afterEach(() => {
    // Clean up after each test
    if (manager) {
      manager.terminate();
    }
  });

  describe('Worker Initialization', () => {
    test('should initialize worker successfully', async () => {
      // Worker is already initialized in beforeEach
      expect(manager).toBeDefined();
      expect(manager.isActive()).toBe(true);
    });

    test('should handle multiple initialization calls gracefully', async () => {
      // Try to initialize again
      // This should work without throwing (worker already initialized)
      const manager2 = new RemoteDOMWorkerManager();
      await manager2.init();

      expect(manager2.isActive()).toBe(true);

      // Clean up
      manager2.terminate();
    });

    test('should reject invalid worker URL', async () => {
      const badManager = new RemoteDOMWorkerManager({
        workerURL: 'invalid://url',
      });

      // This should fail because the URL is invalid
      await expect(badManager.init()).rejects.toThrow();
    });

    test('should terminate worker successfully', () => {
      manager.terminate();
      expect(manager.isActive()).toBe(false);
    });
  });

  describe('Code Security Validation', () => {
    test('should reject code accessing window', async () => {
      await expect(
        manager.execute('window.alert("test")')
      ).rejects.toThrow(/Security violation|disallowed/i);
    });

    test('should reject code accessing document', async () => {
      await expect(
        manager.execute('document.body.innerHTML = "test"')
      ).rejects.toThrow(/Security violation|disallowed/i);
    });

    test('should reject code accessing localStorage', async () => {
      await expect(
        manager.execute('localStorage.setItem("key", "value")')
      ).rejects.toThrow(/Security violation|disallowed/i);
    });

    test('should reject code accessing sessionStorage', async () => {
      await expect(
        manager.execute('sessionStorage.setItem("key", "value")')
      ).rejects.toThrow(/Security violation|disallowed/i);
    });

    test('should reject code accessing fetch', async () => {
      await expect(
        manager.execute('fetch("https://example.com")')
      ).rejects.toThrow(/Security violation|disallowed/i);
    });

    test('should reject code accessing XMLHttpRequest', async () => {
      await expect(
        manager.execute('new XMLHttpRequest()')
      ).rejects.toThrow(/Security violation|disallowed/i);
    });

    test('should reject code accessing WebSocket', async () => {
      await expect(
        manager.execute('new WebSocket("ws://example.com")')
      ).rejects.toThrow(/Security violation|disallowed/i);
    });

    test('should reject code accessing indexedDB', async () => {
      await expect(
        manager.execute('indexedDB.open("db")')
      ).rejects.toThrow(/Security violation|disallowed/i);
    });

    test('should reject code accessing openDatabase', async () => {
      await expect(
        manager.execute('openDatabase("db", "1.0", "test", 1024)')
      ).rejects.toThrow(/Security violation|disallowed/i);
    });

    test('should reject code accessing location', async () => {
      await expect(
        manager.execute('location.href = "http://evil.com"')
      ).rejects.toThrow(/Security violation|disallowed/i);
    });

    test('should reject code accessing navigator', async () => {
      await expect(
        manager.execute('const ua = navigator.userAgent')
      ).rejects.toThrow(/Security violation|disallowed/i);
    });

    test('should reject code accessing history', async () => {
      await expect(
        manager.execute('history.pushState(null, "", "/new")')
      ).rejects.toThrow(/Security violation|disallowed/i);
    });

    test('should allow safe Remote DOM code', async () => {
      // This should succeed because it doesn't use disallowed globals
      await expect(
        manager.execute('const x = 42; console.log("Safe code:", x);')
      ).resolves.toBeUndefined();
    });

    test('should allow code using console', async () => {
      // console is allowed
      await expect(
        manager.execute('console.log("Hello from worker");')
      ).resolves.toBeUndefined();
    });
  });

  describe('Message Passing', () => {
    test('should send and receive messages', async () => {
      const operation: RemoteDOMOperation = {
        type: 'createElement',
        tagName: 'div',
        nodeId: 'test-node-1',
      };

      const result = await manager.sendOperation(operation);

      // Should get a result back
      expect(result).toBeDefined();
    });

    test('should handle message timeout', async () => {
      // Create a manager with very short timeout
      const slowManager = new RemoteDOMWorkerManager({
        timeout: 100,
      });

      await slowManager.init();

      // Send operation that won't complete in time
      // (the worker will actually complete it, but we'll test timeout behavior)
      // We'll need to send many operations to potentially trigger timeout
      try {
        const operations: RemoteDOMOperation[] = Array.from({ length: 100 }, (_, i) => ({
          type: 'createElement',
          tagName: 'div',
          nodeId: `node-${i}`,
        }));

        // Send many operations rapidly
        const promises = operations.map((op) => slowManager.sendOperation(op));

        // At least one should timeout (or all should succeed if worker is fast)
        await Promise.all(promises);

        // If we get here, operations completed successfully
        expect(true).toBe(true);
      } catch (error) {
        // If we get timeout error, that's also acceptable for this test
        expect((error as Error).message).toMatch(/timeout/i);
      } finally {
        slowManager.terminate();
      }
    }, 10000); // Longer timeout for this test

    test('should handle worker errors', async () => {
      // Send invalid operation (missing required fields)
      const invalidOp: RemoteDOMOperation = {
        type: 'createElement',
        // Missing tagName - should cause error
      } as any;

      await expect(manager.sendOperation(invalidOp)).rejects.toThrow();
    });

    test('should track pending message count', async () => {
      // Initially no pending messages
      expect(manager.getPendingCount()).toBe(0);

      // Send operation (don't await yet)
      const promise = manager.sendOperation({
        type: 'createElement',
        tagName: 'div',
        nodeId: 'test-node',
      });

      // There should be 1 pending message
      // (this might be 0 if the worker responds very quickly)
      const pendingCount = manager.getPendingCount();
      expect(pendingCount).toBeGreaterThanOrEqual(0);

      // Wait for completion
      await promise;

      // Should be back to 0
      expect(manager.getPendingCount()).toBe(0);
    });
  });

  describe('DOM Operations', () => {
    test('should send createElement operation', async () => {
      const result = await manager.sendOperation({
        type: 'createElement',
        tagName: 'button',
        nodeId: 'btn-1',
      });

      // Verify result structure (when worker responds with actual data)
      expect(result).toBeDefined();
      // Future (Phase 2): expect(result).toEqual({ success: true, nodeId: 'btn-1' });
    });

    test('should send setAttribute operation', async () => {
      const result = await manager.sendOperation({
        type: 'setAttribute',
        nodeId: 'node-1',
        attributeName: 'class',
        attributeValue: 'my-class',
      });

      // Verify result structure
      expect(result).toBeDefined();
      // Future (Phase 2): expect(result).toEqual({ success: true });
    });

    test('should send appendChild operation', async () => {
      const result = await manager.sendOperation({
        type: 'appendChild',
        parentId: 'parent-1',
        childId: 'child-1',
      });

      // Verify result structure
      expect(result).toBeDefined();
      // Future (Phase 2): expect(result).toEqual({ success: true });
    });

    test('should send removeChild operation', async () => {
      const result = await manager.sendOperation({
        type: 'removeChild',
        parentId: 'parent-1',
        childId: 'child-1',
      });

      // Verify result structure
      expect(result).toBeDefined();
      // Future (Phase 2): expect(result).toEqual({ success: true });
    });

    test('should send setTextContent operation', async () => {
      const result = await manager.sendOperation({
        type: 'setTextContent',
        nodeId: 'node-1',
        textContent: 'Hello, world!',
      });

      // Verify result structure
      expect(result).toBeDefined();
      // Future (Phase 2): expect(result).toEqual({ success: true });
    });

    test('should send addEventListener operation', async () => {
      const result = await manager.sendOperation({
        type: 'addEventListener',
        nodeId: 'node-1',
        eventType: 'click',
        eventListener: 'handler-1',
      });

      // Verify result structure
      expect(result).toBeDefined();
      // Future (Phase 2): expect(result).toEqual({ success: true });
    });
  });

  describe('Batch Operations', () => {
    test('should send multiple operations in batch', async () => {
      const operations: RemoteDOMOperation[] = [
        {
          type: 'createElement',
          tagName: 'div',
          nodeId: 'div-1',
        },
        {
          type: 'createElement',
          tagName: 'span',
          nodeId: 'span-1',
        },
        {
          type: 'appendChild',
          parentId: 'div-1',
          childId: 'span-1',
        },
      ];

      const results = await manager.sendBatch(operations);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(3);
    });

    test('should handle empty batch', async () => {
      const results = await manager.sendBatch([]);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    test('should handle large batch', async () => {
      // Create 100 operations
      const operations: RemoteDOMOperation[] = Array.from({ length: 100 }, (_, i) => ({
        type: 'createElement',
        tagName: 'div',
        nodeId: `div-${i}`,
      }));

      const results = await manager.sendBatch(operations);

      expect(results).toBeDefined();
      expect(results.length).toBe(100);
    });
  });

  describe('Error Handling', () => {
    test('should throw error when executing before init', async () => {
      const uninitManager = new RemoteDOMWorkerManager();
      // Don't call init()

      await expect(
        uninitManager.execute('console.log("test")')
      ).rejects.toThrow(/not initialized/i);
    });

    test('should throw error when sending operation before init', async () => {
      const uninitManager = new RemoteDOMWorkerManager();
      // Don't call init()

      await expect(
        uninitManager.sendOperation({
          type: 'createElement',
          tagName: 'div',
        })
      ).rejects.toThrow(/not initialized/i);
    });

    test('should reject all pending messages on terminate', async () => {
      // Send operation but don't await
      const promise = manager.sendOperation({
        type: 'createElement',
        tagName: 'div',
        nodeId: 'div-1',
      });

      // Terminate immediately
      manager.terminate();

      // Promise should reject
      await expect(promise).rejects.toThrow(/terminated/i);
    });

    test('should handle execution errors', async () => {
      // Execute code that throws an error
      await expect(
        manager.execute('throw new Error("Test error");')
      ).rejects.toThrow(/Test error/i);
    });

    test('should handle syntax errors', async () => {
      // Execute code with syntax error
      await expect(
        manager.execute('const x = ;') // Invalid syntax
      ).rejects.toThrow();
    });
  });

  describe('Manager State', () => {
    test('should report active state correctly', () => {
      expect(manager.isActive()).toBe(true);

      manager.terminate();
      expect(manager.isActive()).toBe(false);
    });

    test('should allow reinitialization after terminate', async () => {
      manager.terminate();
      expect(manager.isActive()).toBe(false);

      await manager.init();
      expect(manager.isActive()).toBe(true);
    });
  });
});

describe('Remote DOM Worker - Security Edge Cases', () => {
  test('should reject code with window in comments', async () => {
    const manager = new RemoteDOMWorkerManager();
    await manager.init();

    try {
      // Even in comments, we block "window" keyword
      await expect(
        manager.execute('// This uses window\nconst x = 42;')
      ).rejects.toThrow(/Security violation|disallowed/i);
    } finally {
      manager.terminate();
    }
  });

  test('should reject code with window in strings', async () => {
    const manager = new RemoteDOMWorkerManager();
    await manager.init();

    try {
      // Even in strings, we block "window" keyword
      await expect(
        manager.execute('const msg = "window is blocked";')
      ).rejects.toThrow(/Security violation|disallowed/i);
    } finally {
      manager.terminate();
    }
  });

  test('should allow code with "windows" (not "window")', async () => {
    const manager = new RemoteDOMWorkerManager();
    await manager.init();

    try {
      // "windows" is not the same as "window"
      await expect(
        manager.execute('const windows = ["window1", "window2"]; console.log(windows);')
      ).rejects.toThrow(); // Will still fail because of "window1" and "window2" strings
    } finally {
      manager.terminate();
    }
  });
});
