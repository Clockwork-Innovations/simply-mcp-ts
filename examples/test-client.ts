#!/usr/bin/env node
/**
 * Test Client for SimplyMCP
 *
 * This script tests the SimplyMCP server by making various tool calls.
 * Useful for verifying that the server is working correctly.
 *
 * Usage:
 *   # Start the simple-server in one terminal:
 *   node mcp/examples/simple-server.ts --http --port 3000
 *
 *   # Run this test client in another terminal:
 *   node mcp/examples/test-client.ts
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const SERVER_URL = 'http://localhost:3000/mcp';

async function testSimplyMCP() {
  console.log('Connecting to SimplyMCP server...');

  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  const transport = new StreamableHTTPClientTransport(new URL(SERVER_URL));

  try {
    await client.connect(transport);
    console.log('✓ Connected to server\n');

    // Test 1: List tools
    console.log('Test 1: Listing tools');
    const toolsResponse = await client.request(
      {
        method: 'tools/list',
      },
      { timeout: 5000 }
    );
    console.log(`✓ Found ${toolsResponse.tools.length} tools:`);
    toolsResponse.tools.forEach((tool: any) => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log();

    // Test 2: Call greet tool
    console.log('Test 2: Calling greet tool');
    const greetResponse = await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'greet',
          arguments: {
            name: 'Alice',
            formal: false,
          },
        },
      },
      { timeout: 5000 }
    );
    console.log('✓ Response:', greetResponse.content[0].text);
    console.log();

    // Test 3: Call calculate tool
    console.log('Test 3: Calling calculate tool');
    const calcResponse = await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'calculate',
          arguments: {
            operation: 'multiply',
            a: 7,
            b: 6,
          },
        },
      },
      { timeout: 5000 }
    );
    console.log('✓ Response:', calcResponse.content[0].text);
    console.log();

    // Test 4: Call get_user_info tool
    console.log('Test 4: Calling get_user_info tool');
    const userInfoResponse = await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'get_user_info',
          arguments: {
            userId: 'test-123',
          },
        },
      },
      { timeout: 5000 }
    );
    console.log('✓ Response:');
    console.log(userInfoResponse.content[0].text);
    console.log();

    // Test 5: Test validation (should fail)
    console.log('Test 5: Testing validation (invalid input - should fail gracefully)');
    try {
      const invalidResponse = await client.request(
        {
          method: 'tools/call',
          params: {
            name: 'calculate',
            arguments: {
              operation: 'multiply',
              a: 'not a number', // Invalid: should be a number
              b: 6,
            },
          },
        },
        { timeout: 5000 }
      );
      console.log('✓ Validation error handled:', invalidResponse.content[0].text);
    } catch (error) {
      console.log('✓ Validation error caught (expected)');
    }
    console.log();

    // Test 6: List prompts
    console.log('Test 6: Listing prompts');
    const promptsResponse = await client.request(
      {
        method: 'prompts/list',
      },
      { timeout: 5000 }
    );
    console.log(`✓ Found ${promptsResponse.prompts.length} prompts:`);
    promptsResponse.prompts.forEach((prompt: any) => {
      console.log(`  - ${prompt.name}: ${prompt.description}`);
    });
    console.log();

    // Test 7: Get a prompt
    console.log('Test 7: Getting code-review prompt');
    const promptResponse = await client.request(
      {
        method: 'prompts/get',
        params: {
          name: 'code-review',
          arguments: {
            language: 'TypeScript',
            focus: 'performance',
          },
        },
      },
      { timeout: 5000 }
    );
    console.log('✓ Prompt text:');
    console.log(promptResponse.messages[0].content.text.substring(0, 200) + '...');
    console.log();

    // Test 8: List resources
    console.log('Test 8: Listing resources');
    const resourcesResponse = await client.request(
      {
        method: 'resources/list',
      },
      { timeout: 5000 }
    );
    console.log(`✓ Found ${resourcesResponse.resources.length} resources:`);
    resourcesResponse.resources.forEach((resource: any) => {
      console.log(`  - ${resource.uri}: ${resource.name}`);
    });
    console.log();

    // Test 9: Read a resource
    console.log('Test 9: Reading config resource');
    const resourceResponse = await client.request(
      {
        method: 'resources/read',
        params: {
          uri: 'config://server',
        },
      },
      { timeout: 5000 }
    );
    console.log('✓ Resource content:');
    console.log(resourceResponse.contents[0].text);
    console.log();

    console.log('✅ All tests passed!');

    await client.close();
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testSimplyMCP().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
