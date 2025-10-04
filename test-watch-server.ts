/**
 * Test server for watch mode
 * Simple decorator-based server that we can modify to test auto-restart
 */

import { MCPServer } from './mcp/decorators.js';

@MCPServer()
export default class TestWatchServer {
  greet(name: string): string {
    return `Hello, ${name}!`;
  }

  getTime(): string {
    return `Current time: ${new Date().toISOString()}`;
  }
}