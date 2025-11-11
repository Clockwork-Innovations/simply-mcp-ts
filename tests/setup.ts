/**
 * Jest Test Setup
 *
 * This file is loaded before each test suite to configure the test environment.
 * It sets up Testing Library, mocks browser APIs, and provides utilities for UI testing.
 */

import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

/**
 * Mock window.postMessage for UI tests
 *
 * MCP UI protocol uses postMessage for communication between iframe and parent.
 * This mock allows us to spy on and verify postMessage calls in tests.
 *
 * Note: Only set up in jsdom environment (when window is available)
 */
if (typeof window !== 'undefined') {
  (global as any).postMessage = jest.fn();

  /**
   * Mock window.parent for iframe communication
   *
   * UI resources render in iframes and communicate with parent via postMessage.
   */
  Object.defineProperty(window, 'parent', {
    writable: true,
    value: {
      postMessage: jest.fn(),
    },
  });

  /**
   * Mock MessageEvent for testing message handlers
   */
  (global as any).MessageEvent = class MessageEvent extends Event {
    data: any;
    origin: string;
    source: any;

    constructor(type: string, eventInitDict?: MessageEventInit) {
      super(type, eventInitDict);
      this.data = eventInitDict?.data;
      this.origin = eventInitDict?.origin || '';
      this.source = eventInitDict?.source;
    }
  };
}

/**
 * Suppress console.error in tests unless explicitly needed
 * This prevents test output clutter from expected errors
 */
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    // Suppress React testing warnings we don't care about
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Warning: useLayoutEffect'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

/**
 * Reset mocks between tests
 */
afterEach(() => {
  jest.clearAllMocks();

  // Clear TypeScript program cache to prevent memory leaks
  // The program cache accumulates AST objects from all parsed files,
  // which can cause OOM errors when running many tests sequentially
  try {
    const { programBuilder } = require('../src/server/compiler/program-builder.js');
    programBuilder.clearCache();
  } catch (error) {
    // Silently ignore if programBuilder is not available (non-TypeScript tests)
  }

  // Force garbage collection if available (requires --expose-gc flag)
  if (global.gc) {
    global.gc();
  }
});
