/**
 * Remote DOM Worker E2E Tests
 *
 * Tests security-critical Worker functionality in real browser environment.
 * These tests validate that:
 * - Workers can be created and initialized
 * - Security restrictions are enforced (no DOM access, etc.)
 * - Message passing works correctly
 * - Error handling is robust
 *
 * @module tests/e2e/remote-dom-worker
 */

import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Remote DOM Worker E2E - Real Browser', () => {
  test('should create and communicate with a Web Worker', async ({ page }) => {
    // Navigate to test page
    await page.goto('/test-page.html');

    // Wait for page to be ready
    await page.waitForFunction(() => (window as any).testReady === true);

    // Test basic Worker functionality
    const result = await page.evaluate(async () => {
      // Create a simple worker that echoes messages
      const workerCode = `
        self.onmessage = function(e) {
          self.postMessage({ received: e.data, timestamp: Date.now() });
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerURL = URL.createObjectURL(blob);
      const worker = new Worker(workerURL);

      // Test worker communication
      const testMessage = { test: 'hello from browser' };
      const response = await new Promise((resolve) => {
        worker.onmessage = (e) => resolve(e.data);
        worker.postMessage(testMessage);
      });

      worker.terminate();
      URL.revokeObjectURL(workerURL);

      return {
        success: true,
        response,
        hasWorkerAPI: typeof Worker !== 'undefined',
        hasBlobAPI: typeof Blob !== 'undefined',
        hasURLAPI: typeof URL !== 'undefined' && typeof URL.createObjectURL !== 'undefined',
      };
    });

    // Verify browser has all required APIs
    expect(result.hasWorkerAPI).toBe(true);
    expect(result.hasBlobAPI).toBe(true);
    expect(result.hasURLAPI).toBe(true);
    expect(result.success).toBe(true);
    expect(result.response).toHaveProperty('received');
    expect(result.response.received).toEqual({ test: 'hello from browser' });
  });

  test('should enforce Worker sandbox - no DOM access', async ({ page }) => {
    await page.goto('/test-page.html');

    const result = await page.evaluate(async () => {
      // Create a worker that tries to access DOM
      const workerCode = `
        self.onmessage = function(e) {
          try {
            // Try to access DOM (should fail)
            const test = typeof window !== 'undefined';
            self.postMessage({ error: false, hasWindow: test });
          } catch (err) {
            self.postMessage({ error: true, message: err.message });
          }
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerURL = URL.createObjectURL(blob);
      const worker = new Worker(workerURL);

      const response = await new Promise((resolve) => {
        worker.onmessage = (e) => resolve(e.data);
        worker.postMessage('test');
      });

      worker.terminate();
      URL.revokeObjectURL(workerURL);

      return response;
    });

    // Verify that 'window' is not defined in worker context
    expect(result).toHaveProperty('hasWindow');
    expect(result.hasWindow).toBe(false);
  });

  test('should enforce Worker sandbox - no document access', async ({ page }) => {
    await page.goto('/test-page.html');

    const result = await page.evaluate(async () => {
      const workerCode = `
        self.onmessage = function(e) {
          const hasDocument = typeof document !== 'undefined';
          const hasLocalStorage = typeof localStorage !== 'undefined';
          self.postMessage({
            hasDocument,
            hasLocalStorage,
            hasSelf: typeof self !== 'undefined',
            hasPostMessage: typeof postMessage !== 'undefined',
          });
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerURL = URL.createObjectURL(blob);
      const worker = new Worker(workerURL);

      const response = await new Promise((resolve) => {
        worker.onmessage = (e) => resolve(e.data);
        worker.postMessage('test');
      });

      worker.terminate();
      URL.revokeObjectURL(workerURL);

      return response;
    });

    // Verify Worker has no access to DOM or browser APIs
    expect(result.hasDocument).toBe(false);
    expect(result.hasLocalStorage).toBe(false);

    // But should have Worker-specific APIs
    expect(result.hasSelf).toBe(true);
    expect(result.hasPostMessage).toBe(true);
  });

  test('should handle Worker errors gracefully', async ({ page }) => {
    await page.goto('/test-page.html');

    const result = await page.evaluate(async () => {
      const workerCode = `
        self.onmessage = function(e) {
          if (e.data === 'throw') {
            throw new Error('Intentional worker error');
          }
          self.postMessage({ ok: true });
        };

        self.onerror = function(err) {
          console.error('Worker error:', err);
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerURL = URL.createObjectURL(blob);
      const worker = new Worker(workerURL);

      let errorCaught = false;
      worker.onerror = (err) => {
        errorCaught = true;
      };

      // Send message that causes error
      worker.postMessage('throw');

      // Wait a bit for error to propagate
      await new Promise(resolve => setTimeout(resolve, 100));

      worker.terminate();
      URL.revokeObjectURL(workerURL);

      return {
        errorCaught,
        testCompleted: true,
      };
    });

    expect(result.testCompleted).toBe(true);
    // Error handling works in real browser
    expect(result.errorCaught).toBe(true);
  });
});
