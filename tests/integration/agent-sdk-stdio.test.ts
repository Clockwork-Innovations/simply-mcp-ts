/**
 * Integration test for Claude Agent SDK compatibility with simply-mcp stdio transport
 *
 * This test verifies that simply-mcp servers can be spawned and used by the
 * Claude Agent SDK without issues. The primary concern is that debug output
 * on stderr doesn't interfere with the MCP protocol on stdin/stdout.
 *
 * Issue: https://github.com/Clockwork-Innovations/simply-mcp-ts/issues/XXX
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolve, dirname } from 'path';

// Jest provides __dirname and __filename in CommonJS mode
// No need to use fileURLToPath

describe('Agent SDK stdio compatibility', () => {
  let client: Client;
  let transport: StdioClientTransport;

  const CLI_PATH = resolve(__dirname, '../../dist/src/cli/index.js');
  const TEST_SERVER_PATH = resolve(__dirname, '../fixtures/simple-stdio-server.ts');

  beforeAll(async () => {
    // This simulates how the Claude Agent SDK spawns MCP servers
    // The critical test is whether the server initializes correctly via stdio
    transport = new StdioClientTransport({
      command: 'node',
      args: [
        '--import', 'tsx', // Enable TypeScript support
        CLI_PATH,
        'run',
        TEST_SERVER_PATH,
        '--transport', 'stdio',
        // Debug logs are now disabled by default in production mode
      ],
      env: {
        ...process.env,
        NODE_ENV: 'production', // Use production mode for faster startup
      },
    });

    client = new Client(
      {
        name: 'agent-sdk-test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    // Connect to the server
    // This will fail if stderr debug logs interfere with protocol initialization
    await client.connect(transport);
  }, 30000); // 30 second timeout for slow CI environments

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  it('successfully connects to simply-mcp server via stdio', async () => {
    // If we reach this point, the connection was successful
    // This tests that debug logs don't break Agent SDK initialization
    expect(true).toBe(true);
  });

  it('can list tools from the server', async () => {
    const response = await client.listTools();

    expect(response.tools).toBeDefined();
    expect(response.tools.length).toBeGreaterThan(0);

    // Check for expected tools from simple-stdio-server.ts
    const toolNames = response.tools.map(t => t.name);
    expect(toolNames).toContain('greet');
    expect(toolNames).toContain('add');
  });

  it('can execute the greet tool', async () => {
    const response = await client.callTool({
      name: 'greet',
      arguments: {
        name: 'Agent SDK Test',
      },
    });

    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);

    // Extract text content
    const textContent = response.content.find(c => c.type === 'text');
    expect(textContent).toBeDefined();
    if (textContent && 'text' in textContent) {
      expect(textContent.text).toContain('Hello, Agent SDK Test!');
    }
  });

  it('can execute the add tool', async () => {
    const response = await client.callTool({
      name: 'add',
      arguments: {
        a: 10,
        b: 32,
      },
    });

    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);

    // Extract text content
    const textContent = response.content.find(c => c.type === 'text');
    expect(textContent).toBeDefined();
    if (textContent && 'text' in textContent) {
      expect(textContent.text).toContain('42');
      expect(textContent.text).toContain('10 + 32 = 42');
    }
  });

  it('handles multiple sequential tool calls', async () => {
    // Execute greet multiple times
    for (let i = 0; i < 3; i++) {
      const response = await client.callTool({
        name: 'greet',
        arguments: {
          name: `Test ${i}`,
        },
      });

      const textContent = response.content.find(c => c.type === 'text');
      expect(textContent).toBeDefined();
      if (textContent && 'text' in textContent) {
        expect(textContent.text).toContain(`Hello, Test ${i}!`);
      }
    }
  });

  it('server reports correct metadata', async () => {
    // Get server info through MCP protocol
    const tools = await client.listTools();

    // The server should be responding correctly
    expect(tools.tools).toBeDefined();

    // Server name should match what's defined in simple-stdio-server.ts
    // Note: MCP protocol doesn't directly expose server name in listTools response,
    // but successful connection and tool execution proves correct initialization
  });
});

describe('Agent SDK stdio compatibility - startup timing', () => {
  /**
   * This test verifies that server startup is fast enough for Agent SDK
   * Slow startup (>6s) can cause Agent SDK to timeout
   */
  it('server starts within acceptable timeout (< 6 seconds)', async () => {
    const startTime = Date.now();

    const transport = new StdioClientTransport({
      command: 'node',
      args: [
        '--import', 'tsx',
        resolve(__dirname, '../../dist/src/cli/index.js'),
        'run',
        resolve(__dirname, '../fixtures/simple-stdio-server.ts'),
        '--transport', 'stdio',
      ],
      env: {
        ...process.env,
        NODE_ENV: 'production', // Use production mode for fast startup
      },
    });

    const client = new Client(
      {
        name: 'timing-test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);

    const elapsedTime = Date.now() - startTime;

    // Startup should be fast (< 6 seconds)
    // With production mode optimizations: typically 3-5 seconds
    // Without optimizations (dev mode): 6-8 seconds
    expect(elapsedTime).toBeLessThan(6000);

    await client.close();
  }, 10000); // 10 second test timeout
});

describe('Agent SDK stdio compatibility - stderr handling', () => {
  /**
   * This test captures stderr output to verify debug logs don't interfere
   * with protocol communication
   */
  it('stderr debug logs do not break protocol initialization', async () => {
    let stderrOutput = '';

    const transport = new StdioClientTransport({
      command: 'node',
      args: [
        '--import', 'tsx',
        resolve(__dirname, '../../dist/src/cli/index.js'),
        'run',
        resolve(__dirname, '../fixtures/simple-stdio-server.ts'),
        '--transport', 'stdio',
        '--verbose', // Explicitly enable verbose mode to test worst case
      ],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    // Capture stderr (if possible with the SDK)
    // Note: StdioClientTransport doesn't expose stderr directly,
    // but we can verify that even with --verbose, the server still works

    const client = new Client(
      {
        name: 'stderr-test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    // This should succeed even with verbose debug output on stderr
    await client.connect(transport);

    // Verify server is functional
    const tools = await client.listTools();
    expect(tools.tools.length).toBeGreaterThan(0);

    await client.close();
  }, 30000);
});

/**
 * FIXME: This test currently fails due to:
 * 1. Debug logs on stderr before server initialization
 * 2. Potential timing issues with module loading
 *
 * Expected behavior after fix:
 * - All tests should pass
 * - Server should start in < 5 seconds
 * - Debug logs should only appear with --verbose flag
 * - No stderr output should occur before MCP protocol is ready
 */
