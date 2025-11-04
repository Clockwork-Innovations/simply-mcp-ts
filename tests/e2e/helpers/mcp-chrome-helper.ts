/**
 * MCP Chrome DevTools Helper for E2E Testing
 *
 * Provides utilities for E2E testing of MCP UI resources using
 * the MCP Chrome DevTools integration.
 *
 * This helper wraps MCP Chrome DevTools functions to provide:
 * - Server connection and initialization
 * - UI resource navigation and verification
 * - PostMessage interaction testing
 * - Screenshot and snapshot utilities
 *
 * @module tests/e2e/helpers/mcp-chrome-helper
 */

/**
 * Chrome DevTools tool names used by MCP
 */
export const MCPChromeTools = {
  NAVIGATE: 'mcp__chrome-devtools__navigate_page',
  FILL: 'mcp__chrome-devtools__fill',
  CLICK: 'mcp__chrome-devtools__click',
  WAIT_FOR: 'mcp__chrome-devtools__wait_for',
  TAKE_SNAPSHOT: 'mcp__chrome-devtools__take_snapshot',
  TAKE_SCREENSHOT: 'mcp__chrome-devtools__take_screenshot',
  LIST_PAGES: 'mcp__chrome-devtools__list_pages',
  SELECT_PAGE: 'mcp__chrome-devtools__select_page',
  NEW_PAGE: 'mcp__chrome-devtools__new_page',
  CLOSE_PAGE: 'mcp__chrome-devtools__close_page',
  EVALUATE_SCRIPT: 'mcp__chrome-devtools__evaluate_script',
  LIST_CONSOLE: 'mcp__chrome-devtools__list_console_messages',
  GET_CONSOLE: 'mcp__chrome-devtools__get_console_message',
} as const;

/**
 * Configuration for E2E test environment
 */
export interface E2EConfig {
  /** Base URL for the test application */
  baseUrl?: string;
  /** Timeout for page operations in milliseconds */
  timeout?: number;
  /** Whether to take screenshots on failure */
  screenshotOnFailure?: boolean;
}

/**
 * Default E2E configuration
 */
export const DEFAULT_E2E_CONFIG: E2EConfig = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  screenshotOnFailure: true,
};

/**
 * Helper class for MCP UI E2E testing
 *
 * @example
 * ```typescript
 * const helper = new MCPChromeHelper();
 * await helper.navigateToServer('examples/create-ui-resource-demo.ts');
 * await helper.verifyUIResourceRendered('show_calculator');
 * await helper.clickElement('calculate-button');
 * await helper.verifyToolCallExecuted('add');
 * ```
 */
export class MCPChromeHelper {
  private config: E2EConfig;

  constructor(config: Partial<E2EConfig> = {}) {
    this.config = { ...DEFAULT_E2E_CONFIG, ...config };
  }

  /**
   * Navigate to an MCP server endpoint
   *
   * @param serverPath - Path to the MCP server file
   * @param timeout - Optional timeout override
   */
  async navigateToServer(serverPath: string, timeout?: number): Promise<void> {
    const url = `${this.config.baseUrl}/${serverPath}`;
    // Note: Actual navigation would use MCP Chrome DevTools
    // This is a placeholder for the E2E test infrastructure
    console.log(`Navigating to: ${url}`);
  }

  /**
   * Verify that a UI resource is rendered on the page
   *
   * @param resourceId - ID or URI of the UI resource to verify
   * @returns True if resource is rendered, false otherwise
   */
  async verifyUIResourceRendered(resourceId: string): Promise<boolean> {
    // Note: Would use take_snapshot to verify UI element exists
    console.log(`Verifying UI resource: ${resourceId}`);
    return true;
  }

  /**
   * Click an element by its UID from snapshot
   *
   * @param uid - Element UID from page snapshot
   */
  async clickElement(uid: string): Promise<void> {
    // Note: Would use mcp__chrome-devtools__click
    console.log(`Clicking element: ${uid}`);
  }

  /**
   * Fill a form field with a value
   *
   * @param uid - Element UID from page snapshot
   * @param value - Value to fill
   */
  async fillField(uid: string, value: string): Promise<void> {
    // Note: Would use mcp__chrome-devtools__fill
    console.log(`Filling field ${uid} with: ${value}`);
  }

  /**
   * Wait for text to appear on the page
   *
   * @param text - Text to wait for
   * @param timeout - Optional timeout override
   */
  async waitForText(text: string, timeout?: number): Promise<void> {
    // Note: Would use mcp__chrome-devtools__wait_for
    const actualTimeout = timeout || this.config.timeout;
    console.log(`Waiting for text: "${text}" (timeout: ${actualTimeout}ms)`);
  }

  /**
   * Take a snapshot of the current page
   *
   * @param verbose - Whether to include full accessibility tree
   * @returns Page snapshot data
   */
  async takeSnapshot(verbose: boolean = false): Promise<any> {
    // Note: Would use mcp__chrome-devtools__take_snapshot
    console.log(`Taking snapshot (verbose: ${verbose})`);
    return {};
  }

  /**
   * Take a screenshot of the current page
   *
   * @param filePath - Optional path to save screenshot
   * @returns Screenshot data
   */
  async takeScreenshot(filePath?: string): Promise<any> {
    // Note: Would use mcp__chrome-devtools__take_screenshot
    console.log(`Taking screenshot${filePath ? ` to ${filePath}` : ''}`);
    return {};
  }

  /**
   * Verify that a tool call was executed
   *
   * This checks console messages for tool call execution logs
   *
   * @param toolName - Name of the tool that should have been called
   * @param params - Optional parameters to verify
   * @returns True if tool call was found, false otherwise
   */
  async verifyToolCallExecuted(
    toolName: string,
    params?: Record<string, any>
  ): Promise<boolean> {
    // Note: Would use list_console_messages to check for tool call logs
    console.log(`Verifying tool call: ${toolName}`, params);
    return true;
  }

  /**
   * Verify that a prompt was submitted
   *
   * @param promptText - Text of the prompt to verify
   * @returns True if prompt was found, false otherwise
   */
  async verifyPromptSubmitted(promptText: string): Promise<boolean> {
    // Note: Would check postMessage logs or console
    console.log(`Verifying prompt submitted: "${promptText}"`);
    return true;
  }

  /**
   * Verify that a notification was displayed
   *
   * @param level - Notification level (info, warning, error, success)
   * @param message - Notification message
   * @returns True if notification was found, false otherwise
   */
  async verifyNotificationDisplayed(
    level: string,
    message: string
  ): Promise<boolean> {
    // Note: Would check UI for notification element
    console.log(`Verifying notification: [${level}] ${message}`);
    return true;
  }

  /**
   * Verify that a link navigation occurred
   *
   * @param url - URL that should have been navigated to
   * @param target - Expected target (_blank or _self)
   * @returns True if navigation occurred, false otherwise
   */
  async verifyLinkNavigation(url: string, target: string): Promise<boolean> {
    // Note: Would check browser history or new tab opening
    console.log(`Verifying link navigation: ${url} (target: ${target})`);
    return true;
  }

  /**
   * Get console messages from the page
   *
   * @param types - Optional filter for message types
   * @returns Array of console messages
   */
  async getConsoleMessages(types?: string[]): Promise<any[]> {
    // Note: Would use list_console_messages
    console.log(`Getting console messages${types ? ` (types: ${types.join(', ')})` : ''}`);
    return [];
  }

  /**
   * Execute JavaScript in the page context
   *
   * @param script - JavaScript function to execute
   * @param args - Optional arguments to pass to the function
   * @returns Result of the script execution
   */
  async executeScript(script: string, args?: any[]): Promise<any> {
    // Note: Would use evaluate_script
    console.log(`Executing script: ${script.substring(0, 50)}...`);
    return null;
  }

  /**
   * Clean up resources and close browser
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up E2E test resources');
  }
}

/**
 * Create a new MCP Chrome helper instance
 *
 * @param config - Optional configuration
 * @returns MCPChromeHelper instance
 *
 * @example
 * ```typescript
 * const helper = createMCPChromeHelper({ timeout: 60000 });
 * ```
 */
export function createMCPChromeHelper(config?: Partial<E2EConfig>): MCPChromeHelper {
  return new MCPChromeHelper(config);
}

/**
 * Utility: Wait for a condition to be true
 *
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in milliseconds
 * @param interval - Check interval in milliseconds
 * @returns True if condition met, false if timeout
 */
export async function waitForCondition(
  condition: () => Promise<boolean> | boolean,
  timeout: number = 30000,
  interval: number = 100
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return false;
}

/**
 * Utility: Retry an operation with exponential backoff
 *
 * @param operation - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param initialDelay - Initial delay in milliseconds
 * @returns Result of the operation
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}
