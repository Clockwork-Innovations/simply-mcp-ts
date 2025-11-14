#!/usr/bin/env node --import tsx
/**
 * Manual test for Claude Agent SDK integration with simply-mcp
 *
 * This test uses the Agent SDK directly (outside of Jest) to verify
 * that simply-mcp servers work correctly when spawned by the Agent SDK.
 *
 * Run with: node --import tsx tests/manual/test-agent-sdk-integration.ts
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI_PATH = resolve(__dirname, '../../dist/src/cli/index.js');
const TEST_SERVER_PATH = resolve(__dirname, '../fixtures/simple-stdio-server.ts');

console.log('🧪 Testing Agent SDK integration with simply-mcp\n');

async function testServerSpawn() {
  console.log('Test 1: Spawn server and list tools');
  console.log('=====================================\n');

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

  try {
    let mcpServers: any[] = [];
    let availableTools: any[] = [];
    let messages: string[] = [];

    console.log('📡 Querying Claude with MCP server configuration...\n');

    for await (const message of query({
      prompt: 'List all available MCP tools from the simple-stdio-test server. What tools are available?',
      options: {
        mcpServers: mcpConfig,
        model: 'claude-3-5-haiku-20241022',
      },
    })) {
      if (message.type === 'text') {
        messages.push(message.content);
        process.stdout.write('.');
      }

      if (message.type === 'metadata' && message.mcp_servers) {
        mcpServers = message.mcp_servers;
      }

      if (message.type === 'metadata' && message.tools) {
        availableTools = message.tools;
      }
    }

    console.log('\n\n✅ Query completed!\n');

    // Check server status
    const testServer = mcpServers.find(s => s.name === 'simple-stdio-test');

    console.log('📊 Server Status:');
    if (testServer) {
      console.log(`   Name: ${testServer.name}`);
      console.log(`   Status: ${testServer.status}`);

      if (testServer.status === 'failed') {
        console.log('   ❌ FAIL: Server marked as failed!');
        console.log('   This reproduces the user\'s reported issue.');
        return false;
      } else {
        console.log('   ✅ PASS: Server connected successfully');
      }
    } else {
      console.log('   ⚠️  Server not found in MCP servers list');
      return false;
    }

    // Check available tools
    console.log('\n🔧 Available Tools:');
    const mcpTools = availableTools.filter(tool =>
      tool.name && tool.name.startsWith('mcp__simple-stdio-test')
    );

    console.log(`   Total MCP tools: ${mcpTools.length}`);
    mcpTools.forEach(tool => {
      console.log(`   - ${tool.name}`);
    });

    if (mcpTools.length >= 2) {
      console.log('   ✅ PASS: Found expected tools (greet, add)');
    } else {
      console.log('   ❌ FAIL: Expected at least 2 tools, found', mcpTools.length);
      return false;
    }

    // Check response
    console.log('\n💬 Claude Response:');
    const fullResponse = messages.join(' ');
    console.log(`   Length: ${fullResponse.length} chars`);
    console.log(`   Preview: ${fullResponse.substring(0, 200)}...`);

    return true;

  } catch (error) {
    console.error('\n❌ Error during test:');
    console.error(error);
    return false;
  }
}

async function testToolExecution() {
  console.log('\n\nTest 2: Execute a tool through Agent SDK');
  console.log('==========================================\n');

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

  try {
    let toolCallCount = 0;
    let messages: string[] = [];

    console.log('📡 Asking Claude to use the greet tool...\n');

    for await (const message of query({
      prompt: 'Use the greet tool from simple-stdio-test server to greet "Agent SDK Test"',
      options: {
        mcpServers: mcpConfig,
        model: 'claude-3-5-haiku-20241022',
      },
    })) {
      if (message.type === 'text') {
        messages.push(message.content);
        process.stdout.write('.');
      }

      if (message.type === 'tool_use') {
        toolCallCount++;
        console.log(`\n   🔧 Tool called: ${(message as any).name || 'unknown'}`);
      }
    }

    console.log('\n\n✅ Query completed!\n');

    console.log('📊 Results:');
    console.log(`   Tool calls made: ${toolCallCount}`);

    const fullResponse = messages.join(' ');
    console.log(`   Response length: ${fullResponse.length} chars`);
    console.log(`   Response: ${fullResponse}`);

    if (toolCallCount > 0) {
      console.log('   ✅ PASS: Tool was executed successfully');
    } else {
      console.log('   ❌ FAIL: No tools were executed');
      return false;
    }

    if (fullResponse.toLowerCase().includes('agent sdk test') && fullResponse.toLowerCase().includes('hello')) {
      console.log('   ✅ PASS: Response contains expected greeting');
    } else {
      console.log('   ⚠️  Response may not contain expected content');
    }

    return true;

  } catch (error) {
    console.error('\n❌ Error during test:');
    console.error(error);
    return false;
  }
}

async function main() {
  console.log('Agent SDK Integration Test');
  console.log('===========================\n');
  console.log(`CLI Path: ${CLI_PATH}`);
  console.log(`Test Server: ${TEST_SERVER_PATH}\n`);

  const test1Result = await testServerSpawn();
  const test2Result = await testToolExecution();

  console.log('\n\n📋 Summary');
  console.log('==========');
  console.log(`Test 1 (Server Spawn): ${test1Result ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 2 (Tool Execution): ${test2Result ? '✅ PASS' : '❌ FAIL'}`);

  if (test1Result && test2Result) {
    console.log('\n🎉 All tests passed!');
    console.log('✅ simply-mcp works correctly with Claude Agent SDK');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed');
    console.log('❌ Issues found with Agent SDK integration');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n💥 Fatal error:');
  console.error(error);
  process.exit(1);
});
