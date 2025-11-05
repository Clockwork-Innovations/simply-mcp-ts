/**
 * MCP UI Resource E2E Test Suite
 *
 * End-to-end tests for MCP UI resources using MCP Chrome DevTools.
 * These tests verify the complete user flow from server connection
 * to UI rendering to postMessage interaction.
 *
 * @module tests/e2e/ui-resource-e2e
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  MCPChromeHelper,
  createMCPChromeHelper,
  waitForCondition,
} from './helpers/mcp-chrome-helper.js';
import { describeIfHasBrowserAutomation } from '../utils/conditional-tests.js';

/**
 * E2E Test Suite for MCP UI Resources
 *
 * NOTE: These tests are currently placeholders demonstrating the
 * E2E testing infrastructure. Actual implementation requires:
 *
 * 1. Running MCP server in test mode
 * 2. Browser automation via MCP Chrome DevTools
 * 3. PostMessage message interception
 * 4. UI state verification
 *
 * When ready to implement, uncomment the tests and integrate with
 * actual MCP Chrome DevTools tools.
 */
describe('MCP UI Resource E2E Tests', () => {
  let helper: MCPChromeHelper;

  beforeAll(async () => {
    // Initialize helper with test configuration
    helper = createMCPChromeHelper({
      baseUrl: 'http://localhost:3000',
      timeout: 30000,
      screenshotOnFailure: true,
    });
  });

  afterAll(async () => {
    // Cleanup helper resources
    await helper.cleanup();
  });

  describe('Infrastructure Validation', () => {
    it('should create MCP Chrome helper successfully', () => {
      expect(helper).toBeDefined();
      expect(helper).toBeInstanceOf(MCPChromeHelper);
    });

    it('should have all required helper methods', () => {
      expect(typeof helper.navigateToServer).toBe('function');
      expect(typeof helper.verifyUIResourceRendered).toBe('function');
      expect(typeof helper.clickElement).toBe('function');
      expect(typeof helper.fillField).toBe('function');
      expect(typeof helper.waitForText).toBe('function');
      expect(typeof helper.takeSnapshot).toBe('function');
      expect(typeof helper.takeScreenshot).toBe('function');
      expect(typeof helper.verifyToolCallExecuted).toBe('function');
      expect(typeof helper.verifyPromptSubmitted).toBe('function');
      expect(typeof helper.verifyNotificationDisplayed).toBe('function');
      expect(typeof helper.verifyLinkNavigation).toBe('function');
      expect(typeof helper.getConsoleMessages).toBe('function');
      expect(typeof helper.executeScript).toBe('function');
      expect(typeof helper.cleanup).toBe('function');
    });

    it('should support waitForCondition utility', async () => {
      const result = await waitForCondition(
        () => Promise.resolve(true),
        1000,
        100
      );
      expect(result).toBe(true);
    });
  });

  /**
   * Example E2E test flow
   *
   * Automatically runs when browser automation is available (e.g., on development laptop),
   * skips when not available (e.g., in cloud IDEs like Claude Code)
   */
  describeIfHasBrowserAutomation('Calculator UI Resource (Example)', () => {
    it('should render calculator UI and handle tool calls', async () => {
      // Navigate to server with calculator UI resource
      await helper.navigateToServer('examples/create-ui-resource-demo.ts');

      // Verify calculator UI is rendered
      const isRendered = await helper.verifyUIResourceRendered('show_calculator');
      expect(isRendered).toBe(true);

      // Take snapshot to get element UIDs
      const snapshot = await helper.takeSnapshot();
      expect(snapshot).toBeDefined();

      // Fill in calculator inputs
      await helper.fillField('input-a', '5');
      await helper.fillField('input-b', '3');

      // Click calculate button
      await helper.clickElement('calculate-button');

      // Verify tool call was executed
      const toolCallExecuted = await helper.verifyToolCallExecuted('add', {
        a: 5,
        b: 3,
      });
      expect(toolCallExecuted).toBe(true);

      // Verify result is displayed
      await helper.waitForText('Result: 8');

      // Take screenshot for documentation
      await helper.takeScreenshot('tests/e2e/screenshots/calculator-result.png');
    });
  });

  describeIfHasBrowserAutomation('Notification Feature (Example)', () => {
    it('should display notifications correctly', async () => {
      await helper.navigateToServer('examples/create-ui-resource-demo.ts');

      // Click button that triggers notification
      await helper.clickElement('notify-button');

      // Verify notification appears
      const notificationDisplayed = await helper.verifyNotificationDisplayed(
        'success',
        'Operation completed'
      );
      expect(notificationDisplayed).toBe(true);

      // Verify notification in different levels
      await helper.clickElement('notify-warning-button');
      const warningDisplayed = await helper.verifyNotificationDisplayed(
        'warning',
        'Warning message'
      );
      expect(warningDisplayed).toBe(true);
    });
  });

  describeIfHasBrowserAutomation('Link Navigation Feature (Example)', () => {
    it('should navigate to external links', async () => {
      await helper.navigateToServer('examples/create-ui-resource-demo.ts');

      // Click link that opens in new tab
      await helper.clickElement('external-link');

      // Verify navigation occurred
      const navigationOccurred = await helper.verifyLinkNavigation(
        'https://example.com/docs',
        '_blank'
      );
      expect(navigationOccurred).toBe(true);
    });
  });

  describeIfHasBrowserAutomation('Prompt Submission Feature (Example)', () => {
    it('should submit prompts to LLM', async () => {
      await helper.navigateToServer('examples/create-ui-resource-demo.ts');

      // Fill prompt input
      await helper.fillField('prompt-input', 'Explain MCP-UI protocol');

      // Click submit
      await helper.clickElement('submit-prompt-button');

      // Verify prompt was submitted
      const promptSubmitted = await helper.verifyPromptSubmitted(
        'Explain MCP-UI protocol'
      );
      expect(promptSubmitted).toBe(true);

      // Wait for response
      await helper.waitForText('Response:', 10000);

      // Take screenshot of result
      await helper.takeScreenshot('tests/e2e/screenshots/prompt-response.png');
    });
  });

  describeIfHasBrowserAutomation('Console Message Verification (Example)', () => {
    it('should capture console messages', async () => {
      await helper.navigateToServer('examples/create-ui-resource-demo.ts');

      // Execute action that logs to console
      await helper.clickElement('debug-button');

      // Get console messages
      const messages = await helper.getConsoleMessages(['log', 'error']);
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describeIfHasBrowserAutomation('Script Execution (Example)', () => {
    it('should execute JavaScript in page context', async () => {
      await helper.navigateToServer('examples/create-ui-resource-demo.ts');

      // Execute script to get page state
      const result = await helper.executeScript(`
        () => {
          return {
            title: document.title,
            hasCalculator: !!document.querySelector('.calculator')
          };
        }
      `);

      expect(result).toBeDefined();
      expect(result.hasCalculator).toBe(true);
    });
  });
});

/**
 * Integration Test Utilities
 */
describe('E2E Test Utilities', () => {
  describe('waitForCondition', () => {
    it('should wait for condition to be true', async () => {
      let counter = 0;
      const result = await waitForCondition(
        () => {
          counter++;
          return counter > 3;
        },
        5000,
        100
      );

      expect(result).toBe(true);
      expect(counter).toBeGreaterThan(3);
    });

    it('should timeout when condition not met', async () => {
      const result = await waitForCondition(
        () => false,
        500,
        100
      );

      expect(result).toBe(false);
    });
  });
});
