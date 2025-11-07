#!/usr/bin/env node
/**
 * Test MCP Server for E2E Tests
 *
 * A simple MCP server that can be launched by tests to verify
 * connection functionality.
 */

import type { ITool, IServer } from 'simply-mcp';

/**
 * Simple test tool
 */
interface GetTimeTool extends ITool {
  name: 'get_time';
  description: 'Get the current server time';
  params: {};
  result: {
    timestamp: string;
    timezone: string;
  };
}

/**
 * Test MCP Server
 */
interface TestServer extends IServer {
  name: 'test-mcp-server';
  version: '1.0.0';
  description: 'Simple test server for E2E tests';
  tools: [GetTimeTool];
}

/**
 * Server implementation
 */
export default class implements TestServer {
  name = 'test-mcp-server' as const;
  version = '1.0.0' as const;
  description = 'Simple test server for E2E tests' as const;

  // Tool implementation
  getTime = async () => {
    return {
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  };
}
