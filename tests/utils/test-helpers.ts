/**
 * Test Helpers
 *
 * Utility functions for MCP test infrastructure including:
 * - Async waiting and polling
 * - Assertion helpers for MCP testing
 * - Server process management
 * - Test formatting and reporting
 *
 * Usage:
 *   import { waitFor, assertNotificationReceived, startTestServer } from './test-helpers.js';
 *
 *   await waitFor(() => condition, { timeout: 5000, interval: 100 });
 *   assertNotificationReceived(notifications, 'ui://stats/live');
 *   const server = await startTestServer('examples/interface-ui-foundation.ts', 3001);
 */

import { spawn, type ChildProcess } from 'child_process';
import type { MCPTestClient } from './mcp-test-client.js';
import type { NotificationRecord } from './mcp-test-client.js';

// ============================================================================
// Types
// ============================================================================

export interface WaitForOptions {
  timeout?: number; // Timeout in ms (default: 5000)
  interval?: number; // Polling interval in ms (default: 100)
  message?: string; // Custom error message
}

export interface ServerOptions {
  verbose?: boolean; // Log server output
  env?: Record<string, string>; // Environment variables
}

// ============================================================================
// Async Wait Helpers
// ============================================================================

/**
 * Wait for a condition to become true
 *
 * @param condition Function that returns true when condition is met
 * @param options Wait options (timeout, interval, message)
 *
 * @example
 * await waitFor(() => client.isConnected(), { timeout: 5000, interval: 100 });
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: WaitForOptions = {}
): Promise<void> {
  const timeout = options.timeout ?? 5000;
  const interval = options.interval ?? 100;
  const message = options.message ?? 'Condition not met';

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await Promise.resolve(condition());
    if (result) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`${message} (timeout after ${timeout}ms)`);
}

/**
 * Wait for a value to equal the expected value
 *
 * @param getter Function that returns the current value
 * @param expected Expected value
 * @param timeout Timeout in ms (default: 5000)
 *
 * @example
 * await waitForValue(() => client.getNotifications().length, 3, 5000);
 */
export async function waitForValue<T>(
  getter: () => T | Promise<T>,
  expected: T,
  timeout: number = 5000
): Promise<void> {
  return waitFor(
    async () => {
      const value = await Promise.resolve(getter());
      return value === expected;
    },
    { timeout, message: `Value did not match expected: ${expected}` }
  );
}

/**
 * Wait for a predicate on a value to become true
 *
 * @param getter Function that returns the current value
 * @param predicate Function that tests the value
 * @param timeout Timeout in ms (default: 5000)
 *
 * @example
 * await waitForPredicate(() => notifications.length, count => count > 0, 5000);
 */
export async function waitForPredicate<T>(
  getter: () => T | Promise<T>,
  predicate: (value: T) => boolean,
  timeout: number = 5000
): Promise<void> {
  return waitFor(
    async () => {
      const value = await Promise.resolve(getter());
      return predicate(value);
    },
    { timeout, message: 'Predicate not satisfied' }
  );
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that a notification was received for a URI
 *
 * @param notifications Array of notification records
 * @param uri Expected resource URI
 *
 * @example
 * assertNotificationReceived(client.getNotifications(), 'ui://stats/live');
 */
export function assertNotificationReceived(
  notifications: Array<{ uri: string }>,
  uri: string
): void {
  const found = notifications.some(n => n.uri === uri);
  if (!found) {
    throw new Error(
      `Expected notification for ${uri} but not found. Received: ${notifications.map(n => n.uri).join(', ')}`
    );
  }
}

/**
 * Assert that tool result matches expected value
 *
 * @param result Tool call result
 * @param expected Expected result
 *
 * @example
 * const result = await client.callTool('add', { a: 2, b: 3 });
 * assertToolResult(result, 5);
 */
export function assertToolResult(result: any, expected: any): void {
  // Handle array results (MCP tools return array of content objects)
  if (Array.isArray(result)) {
    if (result.length === 0) {
      throw new Error('Tool returned empty result');
    }

    // Extract text or number from content array
    const content = result[0];
    if (content.type === 'text') {
      const actualValue = content.text;
      const expectedStr = String(expected);

      if (actualValue !== expectedStr && actualValue !== expected) {
        throw new Error(`Tool result mismatch. Expected: ${expectedStr}, Got: ${actualValue}`);
      }
      return;
    }
  }

  // Direct comparison
  if (result !== expected) {
    throw new Error(`Tool result mismatch. Expected: ${expected}, Got: ${result}`);
  }
}

/**
 * Assert that subscription is active on a client
 *
 * @param client MCP test client
 * @param uri Expected subscription URI
 *
 * @example
 * assertSubscriptionActive(client, 'ui://stats/live');
 */
export function assertSubscriptionActive(client: MCPTestClient, uri: string): void {
  const subscriptions = client.getSubscriptions();
  if (!subscriptions.includes(uri)) {
    throw new Error(
      `Expected subscription to ${uri} but not found. Active subscriptions: ${subscriptions.join(', ')}`
    );
  }
}

/**
 * Assert that client is connected
 *
 * @param client MCP test client
 *
 * @example
 * assertClientConnected(client);
 */
export function assertClientConnected(client: MCPTestClient): void {
  if (!client.isConnected()) {
    throw new Error('Expected client to be connected but it is not');
  }
}

/**
 * Assert that a value is truthy with custom message
 *
 * @param condition Value to test
 * @param message Error message
 */
export function assert(condition: any, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Assert that two values are equal
 *
 * @param actual Actual value
 * @param expected Expected value
 * @param message Optional error message
 */
export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    const msg = message ?? `Expected ${expected}, got ${actual}`;
    throw new Error(msg);
  }
}

/**
 * Assert that array includes a value
 *
 * @param array Array to check
 * @param value Value to find
 * @param message Optional error message
 */
export function assertIncludes<T>(array: T[], value: T, message?: string): void {
  if (!array.includes(value)) {
    const msg = message ?? `Expected array to include ${value}`;
    throw new Error(msg);
  }
}

/**
 * Assert that a number is greater than another
 *
 * @param actual Actual value
 * @param min Minimum expected value
 * @param message Optional error message
 */
export function assertGreaterThan(actual: number, min: number, message?: string): void {
  if (actual <= min) {
    const msg = message ?? `Expected ${actual} to be greater than ${min}`;
    throw new Error(msg);
  }
}

// ============================================================================
// Server Management
// ============================================================================

/**
 * Start a test MCP server
 *
 * @param examplePath Path to example server file (relative to project root)
 * @param port HTTP port to run on
 * @param options Server options
 * @returns Child process handle
 *
 * @example
 * const server = await startTestServer('examples/interface-ui-foundation.ts', 3001);
 * // ... run tests ...
 * await stopTestServer(server);
 */
export async function startTestServer(
  examplePath: string,
  port: number,
  options: ServerOptions = {}
): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const args = ['run', examplePath, '--http', '--port', String(port)];

    const env = {
      ...process.env,
      ...options.env,
    };

    const serverProcess = spawn('npx', ['simply-mcp', ...args], {
      env,
      stdio: options.verbose ? 'inherit' : 'pipe',
    });

    // Wait for server to be ready
    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        serverProcess.kill();
        reject(new Error('Server startup timeout'));
      }
    }, 10000);

    if (serverProcess.stdout) {
      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (options.verbose) {
          console.log('[Server]', output);
        }

        // Server is ready when it starts listening
        if (output.includes('listening') || output.includes('started')) {
          if (!started) {
            started = true;
            clearTimeout(timeout);
            resolve(serverProcess);
          }
        }
      });
    }

    if (serverProcess.stderr) {
      serverProcess.stderr.on('data', (data) => {
        if (options.verbose) {
          console.error('[Server Error]', data.toString());
        }
      });
    }

    serverProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    serverProcess.on('exit', (code) => {
      if (!started && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    // If no stdout/stderr, assume server started after a delay
    if (!serverProcess.stdout && !serverProcess.stderr) {
      setTimeout(() => {
        started = true;
        clearTimeout(timeout);
        resolve(serverProcess);
      }, 2000);
    }
  });
}

/**
 * Stop a test MCP server
 *
 * @param serverProcess Child process handle
 * @param timeout Kill timeout in ms (default: 5000)
 *
 * @example
 * await stopTestServer(server);
 */
export async function stopTestServer(
  serverProcess: ChildProcess,
  timeout: number = 5000
): Promise<void> {
  return new Promise((resolve) => {
    if (!serverProcess.pid) {
      resolve();
      return;
    }

    const killTimeout = setTimeout(() => {
      serverProcess.kill('SIGKILL');
    }, timeout);

    serverProcess.on('exit', () => {
      clearTimeout(killTimeout);
      resolve();
    });

    serverProcess.kill('SIGTERM');
  });
}

// ============================================================================
// Test Output Formatting
// ============================================================================

// ANSI color codes
export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Format test section header
 */
export function section(title: string): string {
  return `\n${colors.blue}${'='.repeat(60)}${colors.reset}\n${colors.bright}${title}${colors.reset}\n${colors.blue}${'='.repeat(60)}${colors.reset}`;
}

/**
 * Format test subsection
 */
export function subsection(title: string): string {
  return `\n${colors.cyan}${title}${colors.reset}`;
}

/**
 * Format success message
 */
export function success(message: string): string {
  return `${colors.green}✓${colors.reset} ${message}`;
}

/**
 * Format error message
 */
export function error(message: string): string {
  return `${colors.red}✗${colors.reset} ${message}`;
}

/**
 * Format info message
 */
export function info(message: string): string {
  return `${colors.blue}ℹ${colors.reset} ${message}`;
}

/**
 * Format warning message
 */
export function warning(message: string): string {
  return `${colors.yellow}⚠${colors.reset} ${message}`;
}

/**
 * Format step message
 */
export function step(num: number, message: string): string {
  return `${colors.cyan}${num}.${colors.reset} ${message}`;
}

/**
 * Print test summary
 */
export function printSummary(passed: number, failed: number, skipped: number = 0): void {
  console.log(section('Test Summary'));
  console.log(`${colors.green}Passed:${colors.reset}  ${passed}`);
  if (failed > 0) {
    console.log(`${colors.red}Failed:${colors.reset}  ${failed}`);
  }
  if (skipped > 0) {
    console.log(`${colors.yellow}Skipped:${colors.reset} ${skipped}`);
  }
  console.log(`${colors.blue}Total:${colors.reset}   ${passed + failed + skipped}`);
}

/**
 * Measure execution time
 */
export async function measureTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; timeMs: number }> {
  const start = Date.now();
  const result = await fn();
  const timeMs = Date.now() - start;
  return { result, timeMs };
}
