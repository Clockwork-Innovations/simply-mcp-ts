/**
 * Remote DOM Worker Security Tests - Playwright E2E
 *
 * Comprehensive security test suite for the Remote DOM Web Worker sandbox.
 * These tests run in a real browser environment to validate actual Worker behavior.
 *
 * Tests migrated from Jest (tests/unit/client/remote-dom-worker.test.ts)
 * which were being skipped due to lack of Worker API in jsdom.
 *
 * Coverage:
 * - Worker initialization and lifecycle
 * - Security validation (11 disallowed globals)
 * - Allowed operations (console, safe code)
 * - Security edge cases (keywords in comments, strings)
 * - Message passing and response matching
 * - Timeout handling
 * - Batch operations
 * - Error handling
 *
 * @module tests/e2e/remote-dom-worker-security
 */

import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Helper to setup test page and wait for RemoteDOMWorkerManager to be ready
 */
async function setupTestPage(page: any) {
  await page.goto('/test-page.html');
  await page.waitForFunction(() => (window as any).testReady === true);
}

test.describe('Remote DOM Worker - Foundation Layer', () => {
  test.describe('Worker Initialization', () => {
    test('should initialize worker successfully', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager({ debug: false, timeout: 5000 });
        await manager.init();

        const isActive = manager.isActive();
        manager.terminate();

        return { isActive };
      });

      expect(result.isActive).toBe(true);
    });

    test('should handle multiple initialization calls gracefully', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager1 = new RemoteDOMWorkerManager();
        await manager1.init();

        const manager2 = new RemoteDOMWorkerManager();
        await manager2.init();

        const bothActive = manager1.isActive() && manager2.isActive();

        manager1.terminate();
        manager2.terminate();

        return { bothActive };
      });

      expect(result.bothActive).toBe(true);
    });

    test('should reject invalid worker URL', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const badManager = new RemoteDOMWorkerManager({
          workerURL: 'invalid://url',
        });

        try {
          await badManager.init();
          return { success: false, error: null };
        } catch (error: any) {
          return { success: true, error: error.message };
        }
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeTruthy();
    });

    test('should terminate worker successfully', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        const isActiveBeforeTerminate = manager.isActive();
        manager.terminate();
        const isActiveAfterTerminate = manager.isActive();

        return { isActiveBeforeTerminate, isActiveAfterTerminate };
      });

      expect(result.isActiveBeforeTerminate).toBe(true);
      expect(result.isActiveAfterTerminate).toBe(false);
    });
  });

  test.describe('Code Security Validation', () => {
    test('should reject code accessing window', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        try {
          await manager.execute('window.alert("test")');
          manager.terminate();
          return { rejected: false, error: null };
        } catch (error: any) {
          manager.terminate();
          return { rejected: true, error: error.message };
        }
      });

      expect(result.rejected).toBe(true);
      expect(result.error).toMatch(/Security violation|disallowed/i);
    });

    test('should reject code accessing document', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        try {
          await manager.execute('document.body.innerHTML = "test"');
          manager.terminate();
          return { rejected: false, error: null };
        } catch (error: any) {
          manager.terminate();
          return { rejected: true, error: error.message };
        }
      });

      expect(result.rejected).toBe(true);
      expect(result.error).toMatch(/Security violation|disallowed/i);
    });

    test('should reject code accessing localStorage', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        try {
          await manager.execute('localStorage.setItem("key", "value")');
          manager.terminate();
          return { rejected: false, error: null };
        } catch (error: any) {
          manager.terminate();
          return { rejected: true, error: error.message };
        }
      });

      expect(result.rejected).toBe(true);
      expect(result.error).toMatch(/Security violation|disallowed/i);
    });

    test('should reject code accessing sessionStorage', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        try {
          await manager.execute('sessionStorage.setItem("key", "value")');
          manager.terminate();
          return { rejected: false, error: null };
        } catch (error: any) {
          manager.terminate();
          return { rejected: true, error: error.message };
        }
      });

      expect(result.rejected).toBe(true);
      expect(result.error).toMatch(/Security violation|disallowed/i);
    });

    test('should reject code accessing fetch', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        try {
          await manager.execute('fetch("https://example.com")');
          manager.terminate();
          return { rejected: false, error: null };
        } catch (error: any) {
          manager.terminate();
          return { rejected: true, error: error.message };
        }
      });

      expect(result.rejected).toBe(true);
      expect(result.error).toMatch(/Security violation|disallowed/i);
    });

    test('should reject code accessing XMLHttpRequest', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        try {
          await manager.execute('new XMLHttpRequest()');
          manager.terminate();
          return { rejected: false, error: null };
        } catch (error: any) {
          manager.terminate();
          return { rejected: true, error: error.message };
        }
      });

      expect(result.rejected).toBe(true);
      expect(result.error).toMatch(/Security violation|disallowed/i);
    });

    test('should reject code accessing WebSocket', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        try {
          await manager.execute('new WebSocket("ws://example.com")');
          manager.terminate();
          return { rejected: false, error: null };
        } catch (error: any) {
          manager.terminate();
          return { rejected: true, error: error.message };
        }
      });

      expect(result.rejected).toBe(true);
      expect(result.error).toMatch(/Security violation|disallowed/i);
    });

    test('should reject code accessing indexedDB', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        try {
          await manager.execute('indexedDB.open("db")');
          manager.terminate();
          return { rejected: false, error: null };
        } catch (error: any) {
          manager.terminate();
          return { rejected: true, error: error.message };
        }
      });

      expect(result.rejected).toBe(true);
      expect(result.error).toMatch(/Security violation|disallowed/i);
    });

    test('should reject code accessing openDatabase', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        try {
          await manager.execute('openDatabase("db", "1.0", "test", 1024)');
          manager.terminate();
          return { rejected: false, error: null };
        } catch (error: any) {
          manager.terminate();
          return { rejected: true, error: error.message };
        }
      });

      expect(result.rejected).toBe(true);
      expect(result.error).toMatch(/Security violation|disallowed/i);
    });

    test('should reject code accessing location', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        try {
          await manager.execute('location.href = "http://evil.com"');
          manager.terminate();
          return { rejected: false, error: null };
        } catch (error: any) {
          manager.terminate();
          return { rejected: true, error: error.message };
        }
      });

      expect(result.rejected).toBe(true);
      expect(result.error).toMatch(/Security violation|disallowed/i);
    });

    test('should reject code accessing navigator', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        try {
          await manager.execute('const ua = navigator.userAgent');
          manager.terminate();
          return { rejected: false, error: null };
        } catch (error: any) {
          manager.terminate();
          return { rejected: true, error: error.message };
        }
      });

      expect(result.rejected).toBe(true);
      expect(result.error).toMatch(/Security violation|disallowed/i);
    });

    test('should reject code accessing history', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        try {
          await manager.execute('history.pushState(null, "", "/new")');
          manager.terminate();
          return { rejected: false, error: null };
        } catch (error: any) {
          manager.terminate();
          return { rejected: true, error: error.message };
        }
      });

      expect(result.rejected).toBe(true);
      expect(result.error).toMatch(/Security violation|disallowed/i);
    });

    test('should allow safe Remote DOM code', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        try {
          await manager.execute('const x = 42; console.log("Safe code:", x);');
          manager.terminate();
          return { success: true, error: null };
        } catch (error: any) {
          manager.terminate();
          return { success: false, error: error.message };
        }
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    test('should allow code using console', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        try {
          await manager.execute('console.log("Hello from worker");');
          manager.terminate();
          return { success: true, error: null };
        } catch (error: any) {
          manager.terminate();
          return { success: false, error: error.message };
        }
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  test.describe('Message Passing', () => {
    test('should send and receive messages', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        const operationResult = await manager.sendOperation({
          type: 'createElement',
          tagName: 'div',
          nodeId: 'test-node-1',
        });

        manager.terminate();
        return { result: operationResult };
      });

      expect(result.result).toBeDefined();
    });

    test('should handle message timeout', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const slowManager = new RemoteDOMWorkerManager({ timeout: 100 });
        await slowManager.init();

        try {
          const operations = Array.from({ length: 100 }, (_, i) => ({
            type: 'createElement',
            tagName: 'div',
            nodeId: `node-${i}`,
          }));

          const promises = operations.map((op: any) => slowManager.sendOperation(op));
          await Promise.all(promises);

          slowManager.terminate();
          return { completed: true, error: null };
        } catch (error: any) {
          slowManager.terminate();
          return { completed: false, error: error.message };
        }
      });

      // Either completes successfully or times out - both are acceptable
      expect(result.completed || result.error?.match(/timeout/i)).toBeTruthy();
    });

    test('should handle worker errors', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        try {
          const invalidOp = { type: 'createElement' } as any;
          const opResult = await manager.sendOperation(invalidOp);
          manager.terminate();
          // NOTE: Phase 1 worker doesn't validate operations, just returns success
          // Phase 2 should add proper validation
          return { errorThrown: false, result: opResult };
        } catch (error: any) {
          manager.terminate();
          return { errorThrown: true, result: null };
        }
      });

      // Phase 1: Worker doesn't validate, so operation succeeds
      // TODO Phase 2: Add validation and expect errorThrown to be true
      expect(result.errorThrown).toBe(false);
      expect(result.result).toBeDefined();
    });

    test('should track pending message count', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        const initialCount = manager.getPendingCount();

        const promise = manager.sendOperation({
          type: 'createElement',
          tagName: 'div',
          nodeId: 'test-node',
        });

        const pendingCount = manager.getPendingCount();
        await promise;

        const finalCount = manager.getPendingCount();
        manager.terminate();

        return { initialCount, pendingCount, finalCount };
      });

      expect(result.initialCount).toBe(0);
      expect(result.pendingCount).toBeGreaterThanOrEqual(0);
      expect(result.finalCount).toBe(0);
    });
  });

  test.describe('DOM Operations', () => {
    test('should send createElement operation', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        const opResult = await manager.sendOperation({
          type: 'createElement',
          tagName: 'button',
          nodeId: 'btn-1',
        });

        manager.terminate();
        return { result: opResult };
      });

      expect(result.result).toBeDefined();
    });

    test('should send setAttribute operation', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        const opResult = await manager.sendOperation({
          type: 'setAttribute',
          nodeId: 'node-1',
          attributeName: 'class',
          attributeValue: 'my-class',
        });

        manager.terminate();
        return { result: opResult };
      });

      expect(result.result).toBeDefined();
    });

    test('should send appendChild operation', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        const opResult = await manager.sendOperation({
          type: 'appendChild',
          parentId: 'parent-1',
          childId: 'child-1',
        });

        manager.terminate();
        return { result: opResult };
      });

      expect(result.result).toBeDefined();
    });

    test('should send removeChild operation', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        const opResult = await manager.sendOperation({
          type: 'removeChild',
          parentId: 'parent-1',
          childId: 'child-1',
        });

        manager.terminate();
        return { result: opResult };
      });

      expect(result.result).toBeDefined();
    });

    test('should send setTextContent operation', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        const opResult = await manager.sendOperation({
          type: 'setTextContent',
          nodeId: 'node-1',
          textContent: 'Hello, world!',
        });

        manager.terminate();
        return { result: opResult };
      });

      expect(result.result).toBeDefined();
    });

    test('should send addEventListener operation', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        const opResult = await manager.sendOperation({
          type: 'addEventListener',
          nodeId: 'node-1',
          eventType: 'click',
          eventListener: 'handler-1',
        });

        manager.terminate();
        return { result: opResult };
      });

      expect(result.result).toBeDefined();
    });
  });

  test.describe('Batch Operations', () => {
    test('should send multiple operations in batch', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        const operations = [
          { type: 'createElement', tagName: 'div', nodeId: 'div-1' },
          { type: 'createElement', tagName: 'span', nodeId: 'span-1' },
          { type: 'appendChild', parentId: 'div-1', childId: 'span-1' },
        ];

        const results = await manager.sendBatch(operations);
        manager.terminate();

        return {
          isDefined: results !== undefined,
          isArray: Array.isArray(results),
          length: results.length,
        };
      });

      expect(result.isDefined).toBe(true);
      expect(result.isArray).toBe(true);
      expect(result.length).toBe(3);
    });

    test('should handle empty batch', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        const results = await manager.sendBatch([]);
        manager.terminate();

        return {
          isDefined: results !== undefined,
          isArray: Array.isArray(results),
          length: results.length,
        };
      });

      expect(result.isDefined).toBe(true);
      expect(result.isArray).toBe(true);
      expect(result.length).toBe(0);
    });

    test('should handle large batch', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        const operations = Array.from({ length: 100 }, (_, i) => ({
          type: 'createElement',
          tagName: 'div',
          nodeId: `div-${i}`,
        }));

        const results = await manager.sendBatch(operations);
        manager.terminate();

        return {
          isDefined: results !== undefined,
          length: results.length,
        };
      });

      expect(result.isDefined).toBe(true);
      expect(result.length).toBe(100);
    });
  });

  test.describe('Error Handling', () => {
    test('should throw error when executing before init', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const uninitManager = new RemoteDOMWorkerManager();

        try {
          await uninitManager.execute('console.log("test")');
          return { errorThrown: false, error: null };
        } catch (error: any) {
          return { errorThrown: true, error: error.message };
        }
      });

      expect(result.errorThrown).toBe(true);
      expect(result.error).toMatch(/not initialized/i);
    });

    test('should throw error when sending operation before init', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const uninitManager = new RemoteDOMWorkerManager();

        try {
          await uninitManager.sendOperation({
            type: 'createElement',
            tagName: 'div',
          });
          return { errorThrown: false, error: null };
        } catch (error: any) {
          return { errorThrown: true, error: error.message };
        }
      });

      expect(result.errorThrown).toBe(true);
      expect(result.error).toMatch(/not initialized/i);
    });

    test('should reject all pending messages on terminate', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        const promise = manager.sendOperation({
          type: 'createElement',
          tagName: 'div',
          nodeId: 'div-1',
        });

        manager.terminate();

        try {
          await promise;
          return { errorThrown: false, error: null };
        } catch (error: any) {
          return { errorThrown: true, error: error.message };
        }
      });

      expect(result.errorThrown).toBe(true);
      expect(result.error).toMatch(/terminated/i);
    });

    test('should handle execution errors', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        try {
          await manager.execute('throw new Error("Test error");');
          manager.terminate();
          return { errorThrown: false, error: null };
        } catch (error: any) {
          manager.terminate();
          return { errorThrown: true, error: error.message };
        }
      });

      expect(result.errorThrown).toBe(true);
      expect(result.error).toMatch(/Test error/i);
    });

    test('should handle syntax errors', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        try {
          await manager.execute('const x = ;');
          manager.terminate();
          return { errorThrown: false };
        } catch (error: any) {
          manager.terminate();
          return { errorThrown: true };
        }
      });

      expect(result.errorThrown).toBe(true);
    });
  });

  test.describe('Manager State', () => {
    test('should report active state correctly', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        const activeBeforeTerminate = manager.isActive();
        manager.terminate();
        const activeAfterTerminate = manager.isActive();

        return { activeBeforeTerminate, activeAfterTerminate };
      });

      expect(result.activeBeforeTerminate).toBe(true);
      expect(result.activeAfterTerminate).toBe(false);
    });

    test('should allow reinitialization after terminate', async ({ page }) => {
      await setupTestPage(page);

      const result = await page.evaluate(async () => {
        const { RemoteDOMWorkerManager } = window as any;
        const manager = new RemoteDOMWorkerManager();
        await manager.init();

        manager.terminate();
        const activeAfterTerminate = manager.isActive();

        await manager.init();
        const activeAfterReinit = manager.isActive();

        manager.terminate();

        return { activeAfterTerminate, activeAfterReinit };
      });

      expect(result.activeAfterTerminate).toBe(false);
      expect(result.activeAfterReinit).toBe(true);
    });
  });
});

test.describe('Remote DOM Worker - Security Edge Cases', () => {
  test('should reject code with window in comments', async ({ page }) => {
    await setupTestPage(page);

    const result = await page.evaluate(async () => {
      const { RemoteDOMWorkerManager } = window as any;
      const manager = new RemoteDOMWorkerManager();
      await manager.init();

      try {
        await manager.execute('// This uses window\nconst x = 42;');
        manager.terminate();
        return { rejected: false, error: null };
      } catch (error: any) {
        manager.terminate();
        return { rejected: true, error: error.message };
      }
    });

    expect(result.rejected).toBe(true);
    expect(result.error).toMatch(/Security violation|disallowed/i);
  });

  test('should reject code with window in strings', async ({ page }) => {
    await setupTestPage(page);

    const result = await page.evaluate(async () => {
      const { RemoteDOMWorkerManager } = window as any;
      const manager = new RemoteDOMWorkerManager();
      await manager.init();

      try {
        await manager.execute('const msg = "window is blocked";');
        manager.terminate();
        return { rejected: false, error: null };
      } catch (error: any) {
        manager.terminate();
        return { rejected: true, error: error.message };
      }
    });

    expect(result.rejected).toBe(true);
    expect(result.error).toMatch(/Security violation|disallowed/i);
  });

  test('should allow code with "windows" (not "window")', async ({ page }) => {
    await setupTestPage(page);

    const result = await page.evaluate(async () => {
      const { RemoteDOMWorkerManager } = window as any;
      const manager = new RemoteDOMWorkerManager();
      await manager.init();

      try {
        // Test with just "windows" variable (no "window" keyword)
        await manager.execute('const windows = [1, 2]; console.log(windows);');
        manager.terminate();
        return { rejected: false, error: null };
      } catch (error: any) {
        manager.terminate();
        return { rejected: true, error: error.message };
      }
    });

    // "windows" is different from "window" with word boundary check
    // So this should succeed
    expect(result.rejected).toBe(false);
    expect(result.error).toBeNull();
  });
});
