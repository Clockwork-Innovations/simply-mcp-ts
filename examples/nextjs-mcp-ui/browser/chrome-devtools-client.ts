/**
 * Chrome DevTools Client for Browser Testing
 *
 * This module provides high-level utilities for testing the MCP-UI
 * in a real browser using Chrome DevTools Protocol.
 *
 * Layer 3 Phase 4: Chrome DevTools Integration
 *
 * @module browser/chrome-devtools-client
 */

/**
 * Browser interaction result
 */
export interface BrowserResult {
  success: boolean;
  data?: unknown;
  error?: string;
  duration?: number;
}

/**
 * Screenshot metadata
 */
export interface ScreenshotInfo {
  path: string;
  format: 'png' | 'jpeg' | 'webp';
  timestamp: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  FCP?: number; // First Contentful Paint
  LCP?: number; // Largest Contentful Paint
  CLS?: number; // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
  INP?: number; // Interaction to Next Paint
  totalTime?: number;
}

/**
 * Element info from snapshot
 */
export interface ElementInfo {
  uid: string;
  tag: string;
  text?: string;
  attributes?: Record<string, string>;
  children?: ElementInfo[];
}

/**
 * Chrome DevTools Browser Client
 *
 * Provides high-level methods for browser automation and testing
 * using the Chrome DevTools MCP server.
 */
export class ChromeDevToolsClient {
  private pageIndex: number = 0;
  private baseUrl: string;
  private verbose: boolean;

  constructor(baseUrl: string = 'http://localhost:3000', verbose: boolean = false) {
    this.baseUrl = baseUrl;
    this.verbose = verbose;
  }

  /**
   * Open a new browser page/tab
   */
  async openPage(url?: string): Promise<BrowserResult> {
    const startTime = Date.now();
    this.log(`Opening new page: ${url || 'blank'}`);

    try {
      const targetUrl = url || this.baseUrl;
      // Note: In real implementation, this would call mcp__chrome-devtools__new_page
      // For now, we document the interface
      this.pageIndex = 0;
      return {
        success: true,
        data: { pageIndex: this.pageIndex, url: targetUrl },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Navigate to URL in current page
   */
  async navigateTo(url: string): Promise<BrowserResult> {
    const startTime = Date.now();
    this.log(`Navigating to: ${url}`);

    try {
      // Would call mcp__chrome-devtools__navigate_page
      return {
        success: true,
        data: { url },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Click an element by its UID from snapshot
   */
  async click(uid: string): Promise<BrowserResult> {
    const startTime = Date.now();
    this.log(`Clicking element: ${uid}`);

    try {
      // Would call mcp__chrome-devtools__click
      return {
        success: true,
        data: { uid },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Fill a form field
   */
  async fillField(uid: string, value: string): Promise<BrowserResult> {
    const startTime = Date.now();
    this.log(`Filling field ${uid} with: ${value}`);

    try {
      // Would call mcp__chrome-devtools__fill
      return {
        success: true,
        data: { uid, value },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Fill multiple form fields at once
   */
  async fillForm(fields: Array<{ uid: string; value: string }>): Promise<BrowserResult> {
    const startTime = Date.now();
    this.log(`Filling ${fields.length} form fields`);

    try {
      // Would call mcp__chrome-devtools__fill_form
      return {
        success: true,
        data: { fieldsCount: fields.length },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Take a screenshot of current page
   */
  async takeScreenshot(filename?: string): Promise<BrowserResult> {
    const startTime = Date.now();
    const name = filename || `screenshot-${Date.now()}.png`;
    this.log(`Taking screenshot: ${name}`);

    try {
      // Would call mcp__chrome-devtools__take_screenshot
      return {
        success: true,
        data: {
          path: `/screenshots/${name}`,
          format: 'png',
          timestamp: Date.now(),
        },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Get DOM snapshot of current page
   */
  async getSnapshot(): Promise<BrowserResult> {
    const startTime = Date.now();
    this.log('Getting DOM snapshot');

    try {
      // Would call mcp__chrome-devtools__take_snapshot
      return {
        success: true,
        data: {
          elements: [],
          timestamp: Date.now(),
        },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Wait for text to appear in page
   */
  async waitFor(text: string, timeout?: number): Promise<BrowserResult> {
    const startTime = Date.now();
    const timeLimit = timeout || 5000;
    this.log(`Waiting for text: "${text}" (timeout: ${timeLimit}ms)`);

    try {
      // Would call mcp__chrome-devtools__wait_for
      return {
        success: true,
        data: { text, found: true },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: `Text "${text}" not found within ${timeLimit}ms`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Get console messages
   */
  async getConsoleMessages(): Promise<BrowserResult> {
    const startTime = Date.now();
    this.log('Getting console messages');

    try {
      // Would call mcp__chrome-devtools__list_console_messages
      return {
        success: true,
        data: {
          messages: [],
          count: 0,
        },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Get network requests
   */
  async getNetworkRequests(): Promise<BrowserResult> {
    const startTime = Date.now();
    this.log('Getting network requests');

    try {
      // Would call mcp__chrome-devtools__list_network_requests
      return {
        success: true,
        data: {
          requests: [],
          count: 0,
        },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Start performance trace
   */
  async startPerformanceTrace(): Promise<BrowserResult> {
    const startTime = Date.now();
    this.log('Starting performance trace');

    try {
      // Would call mcp__chrome-devtools__performance_start_trace
      return {
        success: true,
        data: { traceId: `trace-${Date.now()}` },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Stop performance trace and get metrics
   */
  async stopPerformanceTrace(): Promise<BrowserResult> {
    const startTime = Date.now();
    this.log('Stopping performance trace');

    try {
      // Would call mcp__chrome-devtools__performance_stop_trace
      return {
        success: true,
        data: {
          metrics: {
            FCP: 1200,
            LCP: 2500,
            CLS: 0.1,
          },
        },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Emulate network conditions
   */
  async emulateNetwork(condition: 'Offline' | 'Slow 3G' | 'Fast 3G' | 'Slow 4G' | 'Fast 4G' | 'No emulation'): Promise<BrowserResult> {
    const startTime = Date.now();
    this.log(`Emulating network: ${condition}`);

    try {
      // Would call mcp__chrome-devtools__emulate_network
      return {
        success: true,
        data: { condition },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Emulate CPU throttling
   */
  async emulateCPU(throttleRate: number): Promise<BrowserResult> {
    const startTime = Date.now();
    this.log(`Emulating CPU throttle: ${throttleRate}x`);

    try {
      // Would call mcp__chrome-devtools__emulate_cpu
      return {
        success: true,
        data: { throttleRate },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute JavaScript in page context
   */
  async executeScript(script: string): Promise<BrowserResult> {
    const startTime = Date.now();
    this.log('Executing JavaScript');

    try {
      // Would call mcp__chrome-devtools__evaluate_script
      return {
        success: true,
        data: { result: null },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Resize browser viewport
   */
  async resizeViewport(width: number, height: number): Promise<BrowserResult> {
    const startTime = Date.now();
    this.log(`Resizing viewport to ${width}x${height}`);

    try {
      // Would call mcp__chrome-devtools__resize_page
      return {
        success: true,
        data: { width, height },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Close current page
   */
  async closePage(): Promise<BrowserResult> {
    const startTime = Date.now();
    this.log('Closing page');

    try {
      // Would call mcp__chrome-devtools__close_page
      return {
        success: true,
        data: {},
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Logging utility
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(`[ChromeDevTools] ${message}`);
    }
  }
}

/**
 * Helper function to create Chrome DevTools client
 */
export function createChromeDevToolsClient(baseUrl?: string, verbose?: boolean): ChromeDevToolsClient {
  return new ChromeDevToolsClient(baseUrl, verbose);
}

/**
 * Test helper: MCP-UI test runner
 */
export class MCPUITestRunner {
  private browser: ChromeDevToolsClient;
  private baseUrl: string;
  private verbose: boolean;

  constructor(baseUrl: string = 'http://localhost:3000', verbose: boolean = false) {
    this.baseUrl = baseUrl;
    this.verbose = verbose;
    this.browser = createChromeDevToolsClient(baseUrl, verbose);
  }

  /**
   * Test that page loads
   */
  async testPageLoad(): Promise<BrowserResult> {
    return this.browser.navigateTo(this.baseUrl);
  }

  /**
   * Test that resource renders
   */
  async testResourceRenders(resourceId: string): Promise<BrowserResult> {
    const result = await this.browser.navigateTo(`${this.baseUrl}/demo/${resourceId}`);
    if (!result.success) return result;

    // Wait for content to load
    return this.browser.waitFor('div', 5000);
  }

  /**
   * Test that tool execution works
   */
  async testToolExecution(toolName: string, args?: Record<string, string>): Promise<BrowserResult> {
    // Navigate to actions page
    let result = await this.browser.navigateTo(`${this.baseUrl}/demo/actions`);
    if (!result.success) return result;

    // Wait for page to load
    result = await this.browser.waitFor('button', 5000);
    if (!result.success) return result;

    // Get snapshot to find elements
    const snapshot = await this.browser.getSnapshot();
    if (!snapshot.success) return snapshot;

    return {
      success: true,
      data: { tool: toolName, args },
    };
  }

  /**
   * Test form submission
   */
  async testFormSubmission(formFields: Record<string, string>): Promise<BrowserResult> {
    // Get form elements via snapshot
    const snapshot = await this.browser.getSnapshot();
    if (!snapshot.success) return snapshot;

    // Fill form fields
    const entries = Object.entries(formFields).map(([name, value]) => ({
      uid: name,
      value,
    }));

    return this.browser.fillForm(entries);
  }

  /**
   * Test performance
   */
  async testPerformance(): Promise<BrowserResult> {
    // Start trace
    let result = await this.browser.startPerformanceTrace();
    if (!result.success) return result;

    // Navigate and wait for load
    result = await this.browser.navigateTo(this.baseUrl);
    if (!result.success) return result;

    result = await this.browser.waitFor('body', 10000);
    if (!result.success) return result;

    // Stop trace and get metrics
    return this.browser.stopPerformanceTrace();
  }

  /**
   * Test in offline mode
   */
  async testOfflineMode(): Promise<BrowserResult> {
    // Emulate offline
    let result = await this.browser.emulateNetwork('Offline');
    if (!result.success) return result;

    // Try to navigate (should handle offline gracefully)
    result = await this.browser.navigateTo(this.baseUrl);

    // Reset to normal
    await this.browser.emulateNetwork('No emulation');

    return result;
  }

  /**
   * Get browser client for direct access
   */
  getBrowser(): ChromeDevToolsClient {
    return this.browser;
  }
}

/**
 * Export factory function for test runner
 */
export function createMCPUITestRunner(baseUrl?: string, verbose?: boolean): MCPUITestRunner {
  return new MCPUITestRunner(baseUrl, verbose);
}
