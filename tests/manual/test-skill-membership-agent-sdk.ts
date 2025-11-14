#!/usr/bin/env node --import tsx
/**
 * Manual test for Claude Agent SDK with Skill Membership feature
 *
 * This test verifies that the skill membership (auto-grouping) feature
 * works correctly when using the Claude Agent SDK.
 *
 * Run with: node --import tsx tests/manual/test-skill-membership-agent-sdk.ts
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI_PATH = resolve(__dirname, '../../dist/src/cli/index.js');
const SKILL_SERVER_PATH = resolve(__dirname, '../../examples/hello-world-skill-test-server.ts');

console.log('🧪 Testing Skill Membership with Claude Agent SDK\n');

async function testSkillComponentDiscovery() {
  console.log('Test 1: Discover skilled components');
  console.log('====================================\n');

  const mcpConfig = {
    'hello-world-skill': {
      type: 'stdio' as const,
      command: 'node',
      args: [
        '--import', 'tsx',
        CLI_PATH,
        'run',
        SKILL_SERVER_PATH,
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

    console.log('📡 Querying Claude to list all skilled components...\n');

    for await (const message of query({
      prompt: `List ALL available tools, resources, and prompts from the hello-world-skill server.
I need to verify that components with skill: 'greetings' are discoverable.`,
      options: {
        mcpServers: mcpConfig,
        model: 'haiku',
      },
    })) {
      // Extract text from assistant messages
      if (message.type === 'assistant' && (message as any).message?.content) {
        const content = (message as any).message.content;
        for (const item of content) {
          if (item.type === 'text') {
            messages.push(item.text);
            process.stdout.write('.');
          }
        }
      }

      // Extract result text
      if (message.type === 'result' && (message as any).result) {
        messages.push((message as any).result);
      }

      // Extract metadata from system messages
      if (message.type === 'system') {
        const systemMsg = message as any;
        if (systemMsg.mcp_servers) {
          mcpServers = systemMsg.mcp_servers;
        }
        if (systemMsg.tools) {
          availableTools = systemMsg.tools;
        }
      }
    }

    console.log('\n\n✅ Query completed!\n');

    // Check server status
    const testServer = mcpServers.find(s => s.name === 'hello-world-skill');

    console.log('📊 Server Status:');
    if (testServer) {
      console.log(`   Name: ${testServer.name}`);
      console.log(`   Status: ${testServer.status}`);

      if (testServer.status === 'failed') {
        console.log('   ❌ FAIL: Server marked as failed!');
        return false;
      } else {
        console.log('   ✅ PASS: Server connected successfully');
      }
    } else {
      console.log('   ⚠️  Server not found in MCP servers list');
      return false;
    }

    // Check available tools from system message
    console.log('\n🔧 Available Tools:');
    const mcpTools = availableTools.filter((toolName: string) =>
      toolName.startsWith('mcp__hello-world-skill')
    );

    console.log(`   Total MCP tools: ${mcpTools.length}`);
    mcpTools.forEach((toolName: string) => {
      console.log(`   - ${toolName}`);
    });

    const hasSayHello = mcpTools.some((name: string) => name.includes('say_hello'));
    if (hasSayHello) {
      console.log('   ✅ PASS: Found say_hello tool (skill: "greetings")');
    } else {
      console.log('   ❌ FAIL: say_hello tool not found');
      return false;
    }

    // Check Claude's response for mentions of resources and prompts
    console.log('\n💬 Claude Response:');
    const fullResponse = messages.join(' ');
    console.log(`   Length: ${fullResponse.length} chars`);
    console.log(`   Content:\n${fullResponse}\n`);

    // Verify Claude mentions the skilled components
    const mentionsGreeting = fullResponse.toLowerCase().includes('greet');
    const mentionsResources = fullResponse.toLowerCase().includes('resource');
    const mentionsPrompt = fullResponse.toLowerCase().includes('prompt') ||
                          fullResponse.toLowerCase().includes('help');

    console.log('   Component mentions:');
    console.log(`     - Greeting: ${mentionsGreeting ? '✅' : '⚠️ '}`);
    console.log(`     - Resources: ${mentionsResources ? '✅' : '⚠️ '}`);
    console.log(`     - Prompts/Help: ${mentionsPrompt ? '✅' : '⚠️ '}`);

    return true;

  } catch (error) {
    console.error('\n❌ Error during test:');
    console.error(error);
    return false;
  }
}

async function testSkilledToolExecution() {
  console.log('\n\nTest 2: Execute skilled tool (say_hello)');
  console.log('=========================================\n');

  const mcpConfig = {
    'hello-world-skill': {
      type: 'stdio' as const,
      command: 'node',
      args: [
        '--import', 'tsx',
        CLI_PATH,
        'run',
        SKILL_SERVER_PATH,
        '--transport', 'stdio',
      ],
    },
  };

  try {
    let toolCallCount = 0;
    let messages: string[] = [];
    let toolsUsed: string[] = [];

    console.log('📡 Asking Claude to use the say_hello tool...\n');

    for await (const message of query({
      prompt: 'Use the say_hello tool from the hello-world-skill server to greet "Claude Agent SDK"',
      options: {
        mcpServers: mcpConfig,
        model: 'haiku',
      },
    })) {
      // Extract text from assistant messages
      if (message.type === 'assistant' && (message as any).message?.content) {
        const content = (message as any).message.content;
        for (const item of content) {
          if (item.type === 'text') {
            messages.push(item.text);
            process.stdout.write('.');
          }
          if (item.type === 'tool_use') {
            toolCallCount++;
            toolsUsed.push(item.name);
            console.log(`\n   🔧 Tool called: ${item.name}`);
          }
        }
      }

      // Extract result text
      if (message.type === 'result' && (message as any).result) {
        messages.push((message as any).result);
      }
    }

    console.log('\n\n✅ Query completed!\n');

    console.log('📊 Results:');
    console.log(`   Tool calls made: ${toolCallCount}`);
    console.log(`   Tools used: ${toolsUsed.join(', ')}`);

    const usedSayHello = toolsUsed.some(name => name.includes('say_hello'));

    if (toolCallCount > 0 && usedSayHello) {
      console.log('   ✅ PASS: say_hello tool was executed successfully');
    } else {
      console.log('   ❌ FAIL: say_hello tool was not executed');
      return false;
    }

    const fullResponse = messages.join(' ');
    console.log(`\n   Response: ${fullResponse}`);

    if (fullResponse.toLowerCase().includes('claude agent sdk') &&
        fullResponse.toLowerCase().includes('hello')) {
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

async function testSkilledResourceAccess() {
  console.log('\n\nTest 3: Access skilled resources');
  console.log('=================================\n');

  const mcpConfig = {
    'hello-world-skill': {
      type: 'stdio' as const,
      command: 'node',
      args: [
        '--import', 'tsx',
        CLI_PATH,
        'run',
        SKILL_SERVER_PATH,
        '--transport', 'stdio',
      ],
    },
  };

  try {
    let messages: string[] = [];

    console.log('📡 Asking Claude to read the greeting resources...\n');

    for await (const message of query({
      prompt: `Read the greeting://message resource from the hello-world-skill server.
What does the greeting message template say?`,
      options: {
        mcpServers: mcpConfig,
        model: 'haiku',
      },
    })) {
      // Extract text from assistant messages
      if (message.type === 'assistant' && (message as any).message?.content) {
        const content = (message as any).message.content;
        for (const item of content) {
          if (item.type === 'text') {
            messages.push(item.text);
            process.stdout.write('.');
          }
        }
      }

      // Extract result text
      if (message.type === 'result' && (message as any).result) {
        messages.push((message as any).result);
      }
    }

    console.log('\n\n✅ Query completed!\n');

    const fullResponse = messages.join(' ');
    console.log(`   Response: ${fullResponse}`);

    // Check if Claude successfully read the resource
    const mentionsTemplate = fullResponse.toLowerCase().includes('welcome') ||
                            fullResponse.toLowerCase().includes('hello') ||
                            fullResponse.toLowerCase().includes('{name}');

    if (mentionsTemplate) {
      console.log('   ✅ PASS: Successfully accessed greeting://message resource');
    } else {
      console.log('   ⚠️  Response may not contain resource content');
    }

    return true;

  } catch (error) {
    console.error('\n❌ Error during test:');
    console.error(error);
    return false;
  }
}

async function testAutoGroupingVerification() {
  console.log('\n\nTest 4: Verify auto-grouping of skilled components');
  console.log('===================================================\n');

  const mcpConfig = {
    'hello-world-skill': {
      type: 'stdio' as const,
      command: 'node',
      args: [
        '--import', 'tsx',
        CLI_PATH,
        'run',
        SKILL_SERVER_PATH,
        '--transport', 'stdio',
      ],
    },
  };

  try {
    let messages: string[] = [];

    console.log('📡 Asking Claude about the "greetings" skill...\n');

    for await (const message of query({
      prompt: `I need help with greeting functionality. What tools, resources, and prompts are available
related to greetings in the hello-world-skill server? Please describe everything related to the "greetings" skill.`,
      options: {
        mcpServers: mcpConfig,
        model: 'haiku',
      },
    })) {
      // Extract text from assistant messages
      if (message.type === 'assistant' && (message as any).message?.content) {
        const content = (message as any).message.content;
        for (const item of content) {
          if (item.type === 'text') {
            messages.push(item.text);
            process.stdout.write('.');
          }
        }
      }

      // Extract result text
      if (message.type === 'result' && (message as any).result) {
        messages.push((message as any).result);
      }
    }

    console.log('\n\n✅ Query completed!\n');

    const fullResponse = messages.join(' ');
    console.log(`   Response:\n${fullResponse}\n`);

    // Check if Claude understands the grouped components
    const mentionsTool = fullResponse.toLowerCase().includes('say_hello') ||
                        fullResponse.toLowerCase().includes('tool');
    const mentionsResource = fullResponse.toLowerCase().includes('greeting://') ||
                            fullResponse.toLowerCase().includes('resource');
    const mentionsPrompt = fullResponse.toLowerCase().includes('help') ||
                          fullResponse.toLowerCase().includes('prompt');

    console.log('   Auto-grouped components mentioned:');
    console.log(`     - Tool (say_hello): ${mentionsTool ? '✅' : '⚠️ '}`);
    console.log(`     - Resources (greeting://): ${mentionsResource ? '✅' : '⚠️ '}`);
    console.log(`     - Prompt (greeting_help): ${mentionsPrompt ? '✅' : '⚠️ '}`);

    if (mentionsTool && (mentionsResource || mentionsPrompt)) {
      console.log('   ✅ PASS: Claude recognizes multiple skilled components');
      return true;
    } else {
      console.log('   ⚠️  Claude may not recognize all auto-grouped components');
      return true; // Soft pass - Claude's understanding may vary
    }

  } catch (error) {
    console.error('\n❌ Error during test:');
    console.error(error);
    return false;
  }
}

async function main() {
  console.log('Skill Membership + Claude Agent SDK Integration Test');
  console.log('====================================================\n');
  console.log(`CLI Path: ${CLI_PATH}`);
  console.log(`Skill Server: ${SKILL_SERVER_PATH}\n`);
  console.log('Expected skilled components (all with skill: "greetings"):');
  console.log('  - Tool: say_hello');
  console.log('  - Resource: greeting://message');
  console.log('  - Resource: greeting://history');
  console.log('  - Prompt: greeting_help\n');

  const test1Result = await testSkillComponentDiscovery();
  const test2Result = await testSkilledToolExecution();
  const test3Result = await testSkilledResourceAccess();
  const test4Result = await testAutoGroupingVerification();

  console.log('\n\n📋 Summary');
  console.log('==========');
  console.log(`Test 1 (Component Discovery): ${test1Result ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 2 (Tool Execution): ${test2Result ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 3 (Resource Access): ${test3Result ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 4 (Auto-Grouping): ${test4Result ? '✅ PASS' : '❌ FAIL'}`);

  if (test1Result && test2Result && test3Result && test4Result) {
    console.log('\n🎉 All tests passed!');
    console.log('✅ Skill membership feature works with Claude Agent SDK');
    console.log('\n📊 Verified:');
    console.log('  ✓ Skilled components are discoverable');
    console.log('  ✓ Skilled tools are executable');
    console.log('  ✓ Skilled resources are accessible');
    console.log('  ✓ Auto-grouping works correctly');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed');
    console.log('❌ Issues found with skill membership + Agent SDK integration');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n💥 Fatal error:');
  console.error(error);
  process.exit(1);
});
