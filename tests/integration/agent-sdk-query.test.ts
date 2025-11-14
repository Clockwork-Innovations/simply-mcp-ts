/**
 * Integration test for Claude Agent SDK query API with simply-mcp servers
 *
 * This test uses the high-level Agent SDK query() API to verify that
 * simply-mcp servers work correctly when spawned by the Agent SDK.
 *
 * This reproduces the exact issue from the user's report:
 * - Agent SDK spawns simply-mcp server via stdio
 * - Agent SDK attempts to use MCP tools
 * - Server should initialize correctly and tools should be available
 *
 * Issue: https://github.com/Clockwork-Innovations/simply-mcp-ts/issues/XXX
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { resolve } from 'path';

describe('Agent SDK query() API with simply-mcp', () => {
  const CLI_PATH = resolve(__dirname, '../../dist/src/cli/index.js');
  const TEST_SERVER_PATH = resolve(__dirname, '../fixtures/simple-stdio-server.ts');

  it('spawns simply-mcp server and lists tools', async () => {

    // This is the exact pattern from the user's issue report
    const mcpConfig = {
      'simple-stdio-test': {
        type: 'stdio' as const,
        command: 'node',
        args: [
          '--import', 'tsx',
          CLI_PATH,
          'run',
          TEST_SERVER_PATH,
          '--transport', 'stdio',
        ],
        env: {
          MCP_TIMEOUT: '30000',
          NODE_ENV: 'test',
        },
      },
    };

    const messages: string[] = [];
    let mcpServers: any[] = [];
    let availableTools: any[] = [];

    // Query the Agent SDK to list tools
    for await (const message of query({
      prompt: 'List all available MCP tools from the simple-stdio-test server. What tools are available?',
      options: {
        mcpServers: mcpConfig,
        model: 'claude-3-5-haiku-20241022', // Use Haiku for fast, cheap testing
      },
    })) {
      if (message.type === 'text') {
        messages.push(message.content);
      }

      // Capture MCP server status
      if (message.type === 'metadata' && message.mcp_servers) {
        mcpServers = message.mcp_servers;
      }

      // Capture available tools
      if (message.type === 'metadata' && message.tools) {
        availableTools = message.tools;
      }
    }

    // Verify server connected successfully
    const testServer = mcpServers.find(s => s.name === 'simple-stdio-test');
    expect(testServer).toBeDefined();

    // This is the critical test: server should NOT have status "failed"
    if (testServer) {
      expect(testServer.status).not.toBe('failed');
      // Should be either "connected" or "ready"
      expect(['connected', 'ready', 'success']).toContain(testServer.status);
    }

    // Verify MCP tools are available (prefixed with mcp__)
    const mcpTools = availableTools.filter(tool =>
      tool.name && tool.name.startsWith('mcp__simple-stdio-test')
    );

    // We should have at least 2 tools from our test server (greet, add)
    expect(mcpTools.length).toBeGreaterThanOrEqual(2);

    // Verify specific tools exist
    const toolNames = mcpTools.map(t => t.name);
    expect(toolNames.some(name => name.includes('greet'))).toBe(true);
    expect(toolNames.some(name => name.includes('add'))).toBe(true);

    // Verify we got a response about the tools
    const fullResponse = messages.join(' ');
    expect(fullResponse.length).toBeGreaterThan(0);
  }, 60000); // 60 second timeout for API call

  it('spawns server and successfully calls a tool', async () => {
    const mcpConfig = {
      'simple-stdio-test': {
        type: 'stdio' as const,
        command: 'node',
        args: [
          '--import', 'tsx',
          CLI_PATH,
          'run',
          TEST_SERVER_PATH,
          '--transport', 'stdio',
        ],
        env: {
          MCP_TIMEOUT: '30000',
          NODE_ENV: 'test',
        },
      },
    };

    const messages: string[] = [];
    let toolCallsMade = 0;
    let toolResults: any[] = [];

    // Query the Agent SDK to use the greet tool
    for await (const message of query({
      prompt: 'Use the greet tool from simple-stdio-test server to greet "Claude Agent SDK"',
      options: {
        mcpServers: mcpConfig,
        model: 'claude-3-5-haiku-20241022',
      },
    })) {
      if (message.type === 'text') {
        messages.push(message.content);
      }

      // Count tool calls
      if (message.type === 'tool_use') {
        toolCallsMade++;
      }

      // Capture tool results
      if (message.type === 'tool_result') {
        toolResults.push(message);
      }
    }

    // Verify at least one tool call was made
    expect(toolCallsMade).toBeGreaterThan(0);

    // Verify we got tool results
    expect(toolResults.length).toBeGreaterThan(0);

    // Verify the response contains the greeting
    const fullResponse = messages.join(' ');
    expect(fullResponse.toLowerCase()).toContain('claude agent sdk');
    expect(fullResponse.toLowerCase()).toContain('hello');
  }, 60000);

  it('handles server startup failure gracefully', async () => {
    // Point to a non-existent server file to trigger failure
    const mcpConfig = {
      'non-existent-server': {
        type: 'stdio' as const,
        command: 'node',
        args: [
          '--import', 'tsx',
          CLI_PATH,
          'run',
          '/tmp/non-existent-server-file.ts',
          '--transport', 'stdio',
        ],
        env: {
          MCP_TIMEOUT: '5000',
        },
      },
    };

    const messages: string[] = [];
    let mcpServers: any[] = [];

    try {
      for await (const message of query({
        prompt: 'List available tools',
        options: {
          mcpServers: mcpConfig,
          model: 'claude-3-5-haiku-20241022',
        },
      })) {
        if (message.type === 'text') {
          messages.push(message.content);
        }

        if (message.type === 'metadata' && message.mcp_servers) {
          mcpServers = message.mcp_servers;
        }
      }
    } catch (error) {
      // Failure is expected, but shouldn't crash
    }

    // Verify the failed server is marked as failed
    const failedServer = mcpServers.find(s => s.name === 'non-existent-server');
    if (failedServer) {
      expect(failedServer.status).toBe('failed');
    }
  }, 30000);
});

/**
 * Performance test: Verify server startup is fast enough for Agent SDK
 */
describe('Agent SDK query() performance', () => {
  it('server starts quickly and responds within reasonable time', async () => {
    const CLI_PATH = resolve(__dirname, '../../dist/src/cli/index.js');
    const TEST_SERVER_PATH = resolve(__dirname, '../fixtures/simple-stdio-server.ts');

    const mcpConfig = {
      'simple-stdio-test': {
        type: 'stdio' as const,
        command: 'node',
        args: [
          '--import', 'tsx',
          CLI_PATH,
          'run',
          TEST_SERVER_PATH,
          '--transport', 'stdio',
        ],
      },
    };

    const startTime = Date.now();

    // Minimal query to test startup time
    for await (const message of query({
      prompt: 'Say "ready"',
      options: {
        mcpServers: mcpConfig,
        model: 'claude-3-5-haiku-20241022',
      },
    })) {
      // Just consume the messages
      if (message.type === 'text') {
        break; // Exit after first message
      }
    }

    const totalTime = Date.now() - startTime;

    // Server startup + first query should be reasonably fast
    // Note: This includes API latency, so we're more lenient
    expect(totalTime).toBeLessThan(15000); // 15 seconds total (includes API call)
  }, 30000);
});

/**
 * Test with verbose output to verify debug logs don't interfere
 */
describe('Agent SDK with verbose simply-mcp output', () => {
  it('works even with --verbose debug logs enabled', async () => {
    const CLI_PATH = resolve(__dirname, '../../dist/src/cli/index.js');
    const TEST_SERVER_PATH = resolve(__dirname, '../fixtures/simple-stdio-server.ts');

    const mcpConfig = {
      'verbose-test': {
        type: 'stdio' as const,
        command: 'node',
        args: [
          '--import', 'tsx',
          CLI_PATH,
          'run',
          TEST_SERVER_PATH,
          '--transport', 'stdio',
          '--verbose', // Enable all debug logs
        ],
      },
    };

    let mcpServers: any[] = [];
    let toolsFound = 0;

    for await (const message of query({
      prompt: 'List tools from verbose-test server',
      options: {
        mcpServers: mcpConfig,
        model: 'claude-3-5-haiku-20241022',
      },
    })) {
      if (message.type === 'metadata' && message.mcp_servers) {
        mcpServers = message.mcp_servers;
      }

      if (message.type === 'metadata' && message.tools) {
        toolsFound = message.tools.filter((t: any) =>
          t.name && t.name.includes('verbose-test')
        ).length;
      }
    }

    // Even with verbose output, server should work
    const testServer = mcpServers.find(s => s.name === 'verbose-test');
    expect(testServer).toBeDefined();

    if (testServer) {
      // Server should NOT be marked as failed
      expect(testServer.status).not.toBe('failed');
    }

    // Should still find our tools
    expect(toolsFound).toBeGreaterThan(0);
  }, 60000);
});
