/**
 * Browser Test Helpers
 *
 * Utility functions for browser automation testing using Chrome DevTools MCP.
 * Provides high-level wrappers around Chrome MCP tools for common testing tasks.
 *
 * Features:
 * - Page navigation and waiting
 * - Screenshot and snapshot capture
 * - Form input and button clicks
 * - Element verification
 * - HTML content extraction
 * - UI rendering validation
 * - Interactive feature testing
 *
 * Usage:
 *   import * as browser from './browser-helpers.js';
 *
 *   await browser.navigateToUI('file:///tmp/test.html');
 *   const snapshot = await browser.takeSnapshot();
 *   const screenshot = await browser.takeScreenshot('/tmp/screenshot.png');
 *   await browser.fillInput('uid-123', 'test value');
 *   await browser.clickButton('uid-456');
 */

import type { TestArtifactManager } from './artifact-manager.js';

// ============================================================================
// Types
// ============================================================================

export interface BrowserElement {
  uid: string;
  text?: string;
  type?: string;
}

export interface Interaction {
  type: 'fill' | 'click' | 'hover' | 'wait';
  uid?: string;
  value?: string;
  text?: string;
  timeout?: number;
}

export interface NavigationOptions {
  timeout?: number; // Wait timeout in ms
  waitForText?: string; // Wait for specific text to appear
}

export interface SnapshotResult {
  content: string;
  elements: BrowserElement[];
}

export interface VerificationResult {
  success: boolean;
  found: string[];
  missing: string[];
  details?: string;
}

// ============================================================================
// NOTE: Chrome MCP Integration
// ============================================================================
//
// These functions are wrappers that DOCUMENT how to use Chrome MCP tools.
// Since we cannot directly invoke MCP tools from TypeScript, these functions:
// 1. Provide TypeScript interfaces for type safety
// 2. Document expected Chrome MCP tool usage
// 3. Throw errors with instructions for the AI assistant
//
// When Claude Code runs tests, it will invoke the actual Chrome MCP tools
// based on these function calls and error messages.
//
// ============================================================================

// ============================================================================
// Navigation Functions
// ============================================================================

/**
 * Navigate to a URL
 *
 * NOTE: This requires Chrome MCP tool invocation by the assistant.
 * The assistant should call:
 *   mcp__chrome-devtools__navigate_page({ url: <url>, timeout: <timeout> })
 *
 * @param url URL to navigate to (file:// or http(s)://)
 * @param options Navigation options
 */
export async function navigateToUI(
  url: string,
  options: NavigationOptions = {}
): Promise<void> {
  const timeout = options.timeout || 30000;

  // This is a documentation/instruction function
  // The actual Chrome MCP call must be made by the assistant
  throw new Error(
    `Chrome MCP required: mcp__chrome-devtools__navigate_page({ url: "${url}", timeout: ${timeout} })`
  );
}

/**
 * Navigate back in browser history
 */
export async function navigateBack(timeout: number = 5000): Promise<void> {
  throw new Error(
    `Chrome MCP required: mcp__chrome-devtools__navigate_page_history({ navigate: "back", timeout: ${timeout} })`
  );
}

/**
 * Navigate forward in browser history
 */
export async function navigateForward(timeout: number = 5000): Promise<void> {
  throw new Error(
    `Chrome MCP required: mcp__chrome-devtools__navigate_page_history({ navigate: "forward", timeout: ${timeout} })`
  );
}

// ============================================================================
// Snapshot and Screenshot Functions
// ============================================================================

/**
 * Take a text snapshot of the current page
 *
 * NOTE: This requires Chrome MCP tool invocation by the assistant.
 * The assistant should call:
 *   mcp__chrome-devtools__take_snapshot({ verbose: false })
 *
 * @param verbose Include detailed a11y tree information
 * @returns Snapshot content with element UIDs
 */
export async function takeSnapshot(verbose: boolean = false): Promise<string> {
  throw new Error(
    `Chrome MCP required: mcp__chrome-devtools__take_snapshot({ verbose: ${verbose} })`
  );
}

/**
 * Take a screenshot of the current page or element
 *
 * NOTE: This requires Chrome MCP tool invocation by the assistant.
 * The assistant should call:
 *   mcp__chrome-devtools__take_screenshot({ filePath: <path>, uid?: <uid>, fullPage?: true })
 *
 * @param filePath Path to save screenshot
 * @param uid Optional element UID to screenshot specific element
 * @param fullPage Capture full page (default: false)
 * @returns Path to saved screenshot
 */
export async function takeScreenshot(
  filePath: string,
  uid?: string,
  fullPage: boolean = false
): Promise<string> {
  const uidParam = uid ? `, uid: "${uid}"` : '';
  const fullPageParam = fullPage ? ', fullPage: true' : '';

  throw new Error(
    `Chrome MCP required: mcp__chrome-devtools__take_screenshot({ filePath: "${filePath}"${uidParam}${fullPageParam} })`
  );
}

// ============================================================================
// Interaction Functions
// ============================================================================

/**
 * Fill an input field or select dropdown
 *
 * NOTE: This requires Chrome MCP tool invocation by the assistant.
 * The assistant should call:
 *   mcp__chrome-devtools__fill({ uid: <uid>, value: <value> })
 *
 * @param uid Element UID from snapshot
 * @param value Value to fill
 */
export async function fillInput(uid: string, value: string): Promise<void> {
  throw new Error(
    `Chrome MCP required: mcp__chrome-devtools__fill({ uid: "${uid}", value: "${value}" })`
  );
}

/**
 * Click a button or element
 *
 * NOTE: This requires Chrome MCP tool invocation by the assistant.
 * The assistant should call:
 *   mcp__chrome-devtools__click({ uid: <uid> })
 *
 * @param uid Element UID from snapshot
 * @param dblClick Perform double-click (default: false)
 */
export async function clickButton(uid: string, dblClick: boolean = false): Promise<void> {
  throw new Error(
    `Chrome MCP required: mcp__chrome-devtools__click({ uid: "${uid}", dblClick: ${dblClick} })`
  );
}

/**
 * Hover over an element
 *
 * NOTE: This requires Chrome MCP tool invocation by the assistant.
 * The assistant should call:
 *   mcp__chrome-devtools__hover({ uid: <uid> })
 *
 * @param uid Element UID from snapshot
 */
export async function hoverElement(uid: string): Promise<void> {
  throw new Error(
    `Chrome MCP required: mcp__chrome-devtools__hover({ uid: "${uid}" })`
  );
}

/**
 * Wait for specific text to appear on page
 *
 * NOTE: This requires Chrome MCP tool invocation by the assistant.
 * The assistant should call:
 *   mcp__chrome-devtools__wait_for({ text: <text>, timeout: <timeout> })
 *
 * @param text Text to wait for
 * @param timeout Wait timeout in ms (default: 5000)
 */
export async function waitForElement(text: string, timeout: number = 5000): Promise<void> {
  throw new Error(
    `Chrome MCP required: mcp__chrome-devtools__wait_for({ text: "${text}", timeout: ${timeout} })`
  );
}

// ============================================================================
// Content Extraction Functions
// ============================================================================

/**
 * Extract HTML content from current page
 *
 * NOTE: This requires Chrome MCP tool invocation by the assistant.
 * The assistant should call:
 *   mcp__chrome-devtools__evaluate_script({ function: "() => document.documentElement.outerHTML" })
 *
 * @returns HTML content of the page
 */
export async function extractHTML(): Promise<string> {
  throw new Error(
    'Chrome MCP required: mcp__chrome-devtools__evaluate_script({ function: "() => document.documentElement.outerHTML" })'
  );
}

/**
 * Extract text content from page
 *
 * @returns Text content of the page
 */
export async function extractText(): Promise<string> {
  throw new Error(
    'Chrome MCP required: mcp__chrome-devtools__evaluate_script({ function: "() => document.body.innerText" })'
  );
}

/**
 * Evaluate custom JavaScript in page context
 *
 * @param jsFunction JavaScript function to evaluate
 * @param args Optional arguments (must be element UIDs)
 * @returns Result of evaluation
 */
export async function evaluateScript(
  jsFunction: string,
  args?: Array<{ uid: string }>
): Promise<any> {
  const argsParam = args ? `, args: ${JSON.stringify(args)}` : '';
  throw new Error(
    `Chrome MCP required: mcp__chrome-devtools__evaluate_script({ function: "${jsFunction}"${argsParam} })`
  );
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Verify UI rendered correctly by checking for expected elements
 *
 * This is a higher-level function that uses snapshot and checks for expected text.
 * The assistant should:
 * 1. Take snapshot using mcp__chrome-devtools__take_snapshot()
 * 2. Check if all expected elements are present in the snapshot
 * 3. Return verification result
 *
 * @param expectedElements Array of text strings that should be present
 * @returns Verification result with found/missing elements
 */
export async function verifyUIRendered(
  expectedElements: string[]
): Promise<VerificationResult> {
  throw new Error(
    `Verification required:\n` +
      `1. Take snapshot: mcp__chrome-devtools__take_snapshot()\n` +
      `2. Check snapshot contains: ${expectedElements.join(', ')}\n` +
      `3. Return result with found/missing elements`
  );
}

/**
 * Verify interactive features work correctly
 *
 * This is a higher-level function that performs a sequence of interactions.
 * The assistant should:
 * 1. Take initial snapshot
 * 2. Perform each interaction in sequence
 * 3. Take final snapshot
 * 4. Verify expected changes occurred
 *
 * @param interactions Array of interactions to perform
 * @returns Verification result
 */
export async function verifyInteractivity(
  interactions: Interaction[]
): Promise<VerificationResult> {
  const steps = interactions
    .map((interaction, i) => {
      let step = `${i + 1}. `;
      switch (interaction.type) {
        case 'fill':
          step += `Fill input ${interaction.uid} with "${interaction.value}"`;
          break;
        case 'click':
          step += `Click element ${interaction.uid}`;
          break;
        case 'hover':
          step += `Hover over element ${interaction.uid}`;
          break;
        case 'wait':
          step += `Wait for text "${interaction.text}"`;
          break;
      }
      return step;
    })
    .join('\n');

  throw new Error(
    `Interactivity test required:\n` +
      `1. Take initial snapshot\n` +
      `${steps}\n` +
      `${interactions.length + 2}. Take final snapshot\n` +
      `${interactions.length + 3}. Verify changes occurred`
  );
}

// ============================================================================
// Helper Functions for Test Automation
// ============================================================================

/**
 * Helper: Create a test workflow for UI validation
 *
 * This documents a complete test workflow for the assistant to execute.
 */
export interface UITestWorkflow {
  url: string;
  steps: Array<{
    action: 'navigate' | 'snapshot' | 'screenshot' | 'fill' | 'click' | 'wait' | 'verify';
    params?: any;
    description: string;
  }>;
}

/**
 * Generate test workflow instructions for assistant
 */
export function generateWorkflowInstructions(workflow: UITestWorkflow): string {
  let instructions = `UI Test Workflow for: ${workflow.url}\n\n`;

  workflow.steps.forEach((step, i) => {
    instructions += `${i + 1}. ${step.description}\n`;

    switch (step.action) {
      case 'navigate':
        instructions += `   mcp__chrome-devtools__navigate_page({ url: "${step.params?.url || workflow.url}" })\n`;
        break;
      case 'snapshot':
        instructions += `   mcp__chrome-devtools__take_snapshot()\n`;
        break;
      case 'screenshot':
        instructions += `   mcp__chrome-devtools__take_screenshot({ filePath: "${step.params?.filePath}" })\n`;
        break;
      case 'fill':
        instructions += `   mcp__chrome-devtools__fill({ uid: "${step.params?.uid}", value: "${step.params?.value}" })\n`;
        break;
      case 'click':
        instructions += `   mcp__chrome-devtools__click({ uid: "${step.params?.uid}" })\n`;
        break;
      case 'wait':
        instructions += `   mcp__chrome-devtools__wait_for({ text: "${step.params?.text}", timeout: ${step.params?.timeout || 5000} })\n`;
        break;
      case 'verify':
        instructions += `   Verify: ${step.params?.description || 'Check results'}\n`;
        break;
    }

    instructions += '\n';
  });

  return instructions;
}

/**
 * Helper: Parse snapshot content to extract elements
 *
 * This is a utility that can run in Node.js to parse snapshot text
 * and extract element information.
 *
 * @param snapshotText Raw snapshot text from Chrome MCP
 * @returns Parsed elements with UIDs
 */
export function parseSnapshot(snapshotText: string): SnapshotResult {
  const elements: BrowserElement[] = [];
  const lines = snapshotText.split('\n');

  // Simple regex to extract elements with UIDs
  // Format typically: "[uid=123] Button: Click Me"
  const uidRegex = /\[uid=([^\]]+)\]\s*([^:]+):\s*(.+)/;

  for (const line of lines) {
    const match = line.match(uidRegex);
    if (match) {
      elements.push({
        uid: match[1],
        type: match[2].trim(),
        text: match[3].trim(),
      });
    }
  }

  return {
    content: snapshotText,
    elements,
  };
}

/**
 * Helper: Find element UID by text content
 *
 * @param snapshotResult Parsed snapshot result
 * @param searchText Text to search for (case-insensitive, partial match)
 * @returns Element UID or null if not found
 */
export function findElementByText(
  snapshotResult: SnapshotResult,
  searchText: string
): string | null {
  const normalized = searchText.toLowerCase();

  for (const element of snapshotResult.elements) {
    if (element.text?.toLowerCase().includes(normalized)) {
      return element.uid;
    }
  }

  return null;
}

/**
 * Helper: Check if all expected elements are present in snapshot
 *
 * @param snapshotResult Parsed snapshot result
 * @param expectedTexts Array of text strings to find
 * @returns Verification result
 */
export function verifyElementsPresent(
  snapshotResult: SnapshotResult,
  expectedTexts: string[]
): VerificationResult {
  const found: string[] = [];
  const missing: string[] = [];

  for (const expectedText of expectedTexts) {
    const uid = findElementByText(snapshotResult, expectedText);
    if (uid) {
      found.push(expectedText);
    } else {
      missing.push(expectedText);
    }
  }

  return {
    success: missing.length === 0,
    found,
    missing,
    details: missing.length > 0 ? `Missing elements: ${missing.join(', ')}` : 'All elements found',
  };
}

// ============================================================================
// Page Management
// ============================================================================

/**
 * List all open pages
 */
export async function listPages(): Promise<any[]> {
  throw new Error('Chrome MCP required: mcp__chrome-devtools__list_pages()');
}

/**
 * Select a page by index
 */
export async function selectPage(pageIdx: number): Promise<void> {
  throw new Error(
    `Chrome MCP required: mcp__chrome-devtools__select_page({ pageIdx: ${pageIdx} })`
  );
}

/**
 * Create a new page
 */
export async function newPage(url: string, timeout: number = 30000): Promise<void> {
  throw new Error(
    `Chrome MCP required: mcp__chrome-devtools__new_page({ url: "${url}", timeout: ${timeout} })`
  );
}

/**
 * Close a page by index
 */
export async function closePage(pageIdx: number): Promise<void> {
  throw new Error(
    `Chrome MCP required: mcp__chrome-devtools__close_page({ pageIdx: ${pageIdx} })`
  );
}

/**
 * Resize page viewport
 */
export async function resizePage(width: number, height: number): Promise<void> {
  throw new Error(
    `Chrome MCP required: mcp__chrome-devtools__resize_page({ width: ${width}, height: ${height} })`
  );
}

// ============================================================================
// Export all functions
// ============================================================================

export default {
  // Navigation
  navigateToUI,
  navigateBack,
  navigateForward,

  // Capture
  takeSnapshot,
  takeScreenshot,

  // Interaction
  fillInput,
  clickButton,
  hoverElement,
  waitForElement,

  // Content
  extractHTML,
  extractText,
  evaluateScript,

  // Validation
  verifyUIRendered,
  verifyInteractivity,

  // Utilities
  generateWorkflowInstructions,
  parseSnapshot,
  findElementByText,
  verifyElementsPresent,

  // Page management
  listPages,
  selectPage,
  newPage,
  closePage,
  resizePage,
};
