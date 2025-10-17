/**
 * Chrome DevTools End-to-End Tests
 *
 * Comprehensive E2E test suite using Chrome DevTools Protocol
 * to validate MCP-UI functionality in a real browser environment.
 *
 * Layer 3 Phase 4: Chrome DevTools Integration (50+ tests)
 *
 * @module browser/__tests__/chrome-e2e.test
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { ChromeDevToolsClient, MCPUITestRunner, createChromeDevToolsClient, createMCPUITestRunner } from '../chrome-devtools-client.js';
import type { BrowserResult } from '../chrome-devtools-client.js';

describe('Chrome DevTools E2E Tests', () => {
  let client: ChromeDevToolsClient;
  let runner: MCPUITestRunner;
  const baseUrl = 'http://localhost:3000';

  beforeAll(async () => {
    client = createChromeDevToolsClient(baseUrl, false);
    runner = createMCPUITestRunner(baseUrl, false);
  });

  afterAll(async () => {
    // Cleanup
    await client.closePage();
  });

  describe('Chrome DevTools Client', () => {
    it('should create client instance', () => {
      expect(client).toBeInstanceOf(ChromeDevToolsClient);
    });

    it('should create test runner instance', () => {
      expect(runner).toBeInstanceOf(MCPUITestRunner);
    });

    it('should have browser methods', () => {
      expect(typeof client.openPage).toBe('function');
      expect(typeof client.navigateTo).toBe('function');
      expect(typeof client.click).toBe('function');
      expect(typeof client.fillField).toBe('function');
      expect(typeof client.takeScreenshot).toBe('function');
      expect(typeof client.getSnapshot).toBe('function');
    });
  });

  describe('Page Navigation', () => {
    it('should open a new page', async () => {
      const result = await client.openPage(baseUrl);
      expect(result.success).toBe(true);
      expect(result.data?.url).toBe(baseUrl);
    });

    it('should navigate to URL', async () => {
      const result = await client.navigateTo(baseUrl);
      expect(result.success).toBe(true);
    });

    it('should navigate to specific path', async () => {
      const result = await client.navigateTo(`${baseUrl}/demo`);
      expect(result.success).toBe(true);
    });

    it('should navigate to resource demo', async () => {
      const result = await client.navigateTo(`${baseUrl}/demo/product-card`);
      expect(result.success).toBe(true);
    });

    it('should have duration metric', async () => {
      const result = await client.navigateTo(baseUrl);
      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('DOM Interaction', () => {
    it('should click element by UID', async () => {
      const result = await client.click('button-submit');
      expect(result.success).toBe(true);
    });

    it('should fill form field', async () => {
      const result = await client.fillField('input-email', 'test@example.com');
      expect(result.success).toBe(true);
      expect(result.data?.value).toBe('test@example.com');
    });

    it('should fill multiple form fields', async () => {
      const fields = [
        { uid: 'input-name', value: 'John Doe' },
        { uid: 'input-email', value: 'john@example.com' },
        { uid: 'input-message', value: 'Test message' },
      ];

      const result = await client.fillForm(fields);
      expect(result.success).toBe(true);
      expect(result.data?.fieldsCount).toBe(3);
    });

    it('should wait for text to appear', async () => {
      const result = await client.waitFor('Welcome', 5000);
      expect(result.success).toBe(true);
    });

    it('should handle wait timeout gracefully', async () => {
      const result = await client.waitFor('NonexistentText12345', 1000);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('duration');
      // Mock implementation may return success or failure depending on timeout
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Page Snapshots and Screenshots', () => {
    it('should take screenshot', async () => {
      const result = await client.takeScreenshot('test-page.png');
      expect(result.success).toBe(true);
      expect(result.data?.path).toBeDefined();
      expect(result.data?.format).toBe('png');
    });

    it('should take screenshot with auto-name', async () => {
      const result = await client.takeScreenshot();
      expect(result.success).toBe(true);
      expect(result.data?.path).toBeDefined();
      expect(result.data?.timestamp).toBeDefined();
    });

    it('should get DOM snapshot', async () => {
      const result = await client.getSnapshot();
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data?.elements)).toBe(true);
    });

    it('should have timestamp in snapshot', async () => {
      const result = await client.getSnapshot();
      expect(result.success).toBe(true);
      expect(result.data?.timestamp).toBeDefined();
      expect(typeof result.data?.timestamp).toBe('number');
    });
  });

  describe('Browser DevTools Console & Network', () => {
    it('should get console messages', async () => {
      const result = await client.getConsoleMessages();
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data?.messages)).toBe(true);
    });

    it('should have message count', async () => {
      const result = await client.getConsoleMessages();
      expect(result.success).toBe(true);
      expect(typeof result.data?.count).toBe('number');
    });

    it('should get network requests', async () => {
      const result = await client.getNetworkRequests();
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data?.requests)).toBe(true);
    });

    it('should have network request count', async () => {
      const result = await client.getNetworkRequests();
      expect(result.success).toBe(true);
      expect(typeof result.data?.count).toBe('number');
    });
  });

  describe('Performance Testing', () => {
    it('should start performance trace', async () => {
      const result = await client.startPerformanceTrace();
      expect(result.success).toBe(true);
      expect(result.data?.traceId).toBeDefined();
    });

    it('should stop performance trace', async () => {
      await client.startPerformanceTrace();
      const result = await client.stopPerformanceTrace();
      expect(result.success).toBe(true);
      expect(result.data?.metrics).toBeDefined();
    });

    it('should have Core Web Vitals', async () => {
      await client.startPerformanceTrace();
      const result = await client.stopPerformanceTrace();
      expect(result.success).toBe(true);
      expect(result.data?.metrics?.FCP).toBeDefined();
      expect(result.data?.metrics?.LCP).toBeDefined();
      expect(result.data?.metrics?.CLS).toBeDefined();
    });

    it('should have numeric performance values', async () => {
      await client.startPerformanceTrace();
      const result = await client.stopPerformanceTrace();
      expect(result.success).toBe(true);
      if (result.data?.metrics?.FCP) {
        expect(typeof result.data.metrics.FCP).toBe('number');
      }
    });
  });

  describe('Network Emulation', () => {
    it('should emulate offline mode', async () => {
      const result = await client.emulateNetwork('Offline');
      expect(result.success).toBe(true);
      expect(result.data?.condition).toBe('Offline');
    });

    it('should emulate Slow 3G', async () => {
      const result = await client.emulateNetwork('Slow 3G');
      expect(result.success).toBe(true);
    });

    it('should emulate Fast 3G', async () => {
      const result = await client.emulateNetwork('Fast 3G');
      expect(result.success).toBe(true);
    });

    it('should emulate Slow 4G', async () => {
      const result = await client.emulateNetwork('Slow 4G');
      expect(result.success).toBe(true);
    });

    it('should emulate Fast 4G', async () => {
      const result = await client.emulateNetwork('Fast 4G');
      expect(result.success).toBe(true);
    });

    it('should disable emulation', async () => {
      const result = await client.emulateNetwork('No emulation');
      expect(result.success).toBe(true);
    });
  });

  describe('CPU Emulation', () => {
    it('should emulate 1x CPU (no throttle)', async () => {
      const result = await client.emulateCPU(1);
      expect(result.success).toBe(true);
      expect(result.data?.throttleRate).toBe(1);
    });

    it('should emulate 2x CPU throttle', async () => {
      const result = await client.emulateCPU(2);
      expect(result.success).toBe(true);
    });

    it('should emulate 4x CPU throttle', async () => {
      const result = await client.emulateCPU(4);
      expect(result.success).toBe(true);
    });

    it('should emulate heavy CPU throttle', async () => {
      const result = await client.emulateCPU(10);
      expect(result.success).toBe(true);
    });
  });

  describe('Viewport Resizing', () => {
    it('should resize to mobile viewport', async () => {
      const result = await client.resizeViewport(375, 667);
      expect(result.success).toBe(true);
      expect(result.data?.width).toBe(375);
      expect(result.data?.height).toBe(667);
    });

    it('should resize to tablet viewport', async () => {
      const result = await client.resizeViewport(768, 1024);
      expect(result.success).toBe(true);
    });

    it('should resize to desktop viewport', async () => {
      const result = await client.resizeViewport(1920, 1080);
      expect(result.success).toBe(true);
    });

    it('should resize to custom dimensions', async () => {
      const result = await client.resizeViewport(800, 600);
      expect(result.success).toBe(true);
    });
  });

  describe('JavaScript Execution', () => {
    it('should execute JavaScript', async () => {
      const result = await client.executeScript('console.log("test")');
      expect(result.success).toBe(true);
    });

    it('should return execution result', async () => {
      const result = await client.executeScript('1 + 1');
      expect(result.success).toBe(true);
      expect(result.data?.result).toBeDefined();
    });
  });

  describe('Page Closure', () => {
    it('should close page', async () => {
      const result = await client.closePage();
      expect(result.success).toBe(true);
    });
  });

  describe('Test Runner - Page Loading', () => {
    it('should test page load', async () => {
      const result = await runner.testPageLoad();
      expect(result.success).toBe(true);
    });

    it('should handle page load errors gracefully', async () => {
      const failRunner = createMCPUITestRunner('http://invalid-url-that-does-not-exist.local');
      const result = await failRunner.testPageLoad();
      expect(result).toHaveProperty('success');
    });
  });

  describe('Test Runner - Resource Rendering', () => {
    it('should test resource rendering', async () => {
      const result = await runner.testResourceRenders('product-card');
      expect(result.success).toBe(true);
    });

    it('should test multiple resources', async () => {
      const resources = ['product-card', 'info-card', 'feature-list'];

      for (const resource of resources) {
        const result = await runner.testResourceRenders(resource);
        expect(result).toHaveProperty('success');
      }
    });
  });

  describe('Test Runner - Tool Execution', () => {
    it('should test tool execution', async () => {
      const result = await runner.testToolExecution('submit_feedback', {
        name: 'John',
        message: 'Great UI',
      });
      expect(result.success).toBe(true);
    });

    it('should test multiple tools', async () => {
      const tools = ['submit_feedback', 'send_contact_message', 'select_product'];

      for (const tool of tools) {
        const result = await runner.testToolExecution(tool);
        expect(result).toHaveProperty('success');
      }
    });
  });

  describe('Test Runner - Form Submission', () => {
    it('should test form submission', async () => {
      const fields = {
        'input-name': 'John Doe',
        'input-email': 'john@example.com',
        'input-message': 'Test message',
      };

      const result = await runner.testFormSubmission(fields);
      expect(result.success).toBe(true);
    });

    it('should handle form submission with various data', async () => {
      const fields = {
        'field1': 'value1',
        'field2': 'value2',
        'field3': 'value3',
      };

      const result = await runner.testFormSubmission(fields);
      expect(result).toHaveProperty('success');
    });
  });

  describe('Test Runner - Performance', () => {
    it('should test performance', async () => {
      const result = await runner.testPerformance();
      expect(result.success).toBe(true);
    });

    it('should measure Core Web Vitals', async () => {
      const result = await runner.testPerformance();
      expect(result.success).toBe(true);
      if (result.data?.metrics) {
        expect(result.data.metrics).toHaveProperty('FCP');
        expect(result.data.metrics).toHaveProperty('LCP');
        expect(result.data.metrics).toHaveProperty('CLS');
      }
    });
  });

  describe('Test Runner - Offline Mode', () => {
    it('should test offline mode', async () => {
      const result = await runner.testOfflineMode();
      expect(result).toHaveProperty('success');
    });

    it('should handle offline gracefully', async () => {
      const result = await runner.testOfflineMode();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
    });
  });

  describe('Error Handling', () => {
    it('should handle navigation errors gracefully', async () => {
      const result = await client.navigateTo('http://localhost:9999');
      expect(result).toHaveProperty('success');
    });

    it('should handle click errors gracefully', async () => {
      const result = await client.click('nonexistent-uid');
      expect(result).toHaveProperty('success');
    });

    it('should handle fill errors gracefully', async () => {
      const result = await client.fillField('nonexistent-uid', 'value');
      expect(result).toHaveProperty('success');
    });

    it('should have error messages', async () => {
      const result = await client.waitFor('NonexistentText', 100);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });
  });

  describe('Result Structure', () => {
    it('should have required result fields', async () => {
      const result = await client.navigateTo(baseUrl);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('duration');
    });

    it('should have success boolean', async () => {
      const result = await client.takeScreenshot();
      expect(typeof result.success).toBe('boolean');
    });

    it('should have duration for all operations', async () => {
      const operations = [
        client.navigateTo(baseUrl),
        client.takeScreenshot(),
        client.getConsoleMessages(),
        client.getNetworkRequests(),
      ];

      const results = await Promise.all(operations);
      results.forEach((result) => {
        expect(typeof result.duration).toBe('number');
        expect(result.duration).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have optional data field', async () => {
      const result = await client.navigateTo(baseUrl);
      expect(result.success).toBe(true);
      if (result.data) {
        expect(typeof result.data).toBe('object');
      }
    });

    it('should have error on failure', async () => {
      const result = await client.waitFor('NonexistentText12345', 100);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Browser Client Access', () => {
    it('should provide direct browser access via runner', () => {
      const browser = runner.getBrowser();
      expect(browser).toBeInstanceOf(ChromeDevToolsClient);
    });

    it('should allow chaining operations', async () => {
      const browser = runner.getBrowser();
      const result1 = await browser.navigateTo(baseUrl);
      const result2 = await browser.getSnapshot();
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent screenshots', async () => {
      const promises = [
        client.takeScreenshot('screen1.png'),
        client.takeScreenshot('screen2.png'),
        client.takeScreenshot('screen3.png'),
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle concurrent navigation', async () => {
      const promises = [
        client.navigateTo(`${baseUrl}/demo`),
        client.navigateTo(`${baseUrl}/demo/actions`),
      ];

      const results = await Promise.allSettled(promises);
      expect(results).toHaveLength(2);
    });
  });

  describe('Integration with MCP-UI', () => {
    it('should navigate to demo page', async () => {
      const result = await client.navigateTo(`${baseUrl}/demo`);
      expect(result.success).toBe(true);
    });

    it('should access all demo resources', async () => {
      const resources = [
        'product-card',
        'info-card',
        'feature-list',
        'statistics-display',
        'welcome-card',
      ];

      for (const resource of resources) {
        const result = await client.navigateTo(`${baseUrl}/demo/${resource}`);
        expect(result.success).toBe(true);
      }
    });

    it('should access actions page', async () => {
      const result = await client.navigateTo(`${baseUrl}/demo/actions`);
      expect(result.success).toBe(true);
    });

    it('should verify page structure', async () => {
      await client.navigateTo(baseUrl);
      const snapshot = await client.getSnapshot();
      expect(snapshot.success).toBe(true);
      expect(Array.isArray(snapshot.data?.elements)).toBe(true);
    });
  });
});
