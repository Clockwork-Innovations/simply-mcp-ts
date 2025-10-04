#!/usr/bin/env node
/**
 * Test client for MCP Stdio Transport Server
 * Uses the MCP SDK client to properly test the stdio server
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// ANSI colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const NC = '\x1b[0m';

let testsPassed = 0;
let testsFailed = 0;

function printResult(passed: boolean, testName: string) {
  if (passed) {
    console.log(`${GREEN}✓ PASS${NC}: ${testName}`);
    testsPassed++;
  } else {
    console.log(`${RED}✗ FAIL${NC}: ${testName}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('=========================================');
  console.log('Testing MCP Stdio Transport');
  console.log('=========================================');
  console.log('');

  // Create client transport
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', 'src/servers/stdioServer.ts', 'src/config-test.json'],
  });

  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  try {
    // Test 1: Initialize connection
    console.log(`${YELLOW}Test: Initialize connection${NC}`);
    await client.connect(transport);
    printResult(true, 'Initialize connection');
    console.log('');

    // Test 2: List tools
    console.log(`${YELLOW}Test: List available tools${NC}`);
    const toolsResult = await client.listTools();
    printResult(toolsResult.tools && toolsResult.tools.length > 0, 'List tools');
    console.log('');

    // Test 3: List prompts
    console.log(`${YELLOW}Test: List available prompts${NC}`);
    const promptsResult = await client.listPrompts();
    printResult(promptsResult.prompts && promptsResult.prompts.length > 0, 'List prompts');
    console.log('');

    // Test 4: List resources
    console.log(`${YELLOW}Test: List available resources${NC}`);
    const resourcesResult = await client.listResources();
    printResult(resourcesResult.resources && resourcesResult.resources.length > 0, 'List resources');
    console.log('');

    // Test 5: Call greet tool
    console.log(`${YELLOW}Test: Call greet tool${NC}`);
    const greetResult = await client.callTool({
      name: 'greet',
      arguments: { name: 'Stdio' },
    });
    const greetText = greetResult.content[0]?.type === 'text' ? greetResult.content[0].text : '';
    printResult(greetText.includes('Stdio'), 'Greet tool execution');
    console.log('');

    // Test 6: Calculate tool - addition
    console.log(`${YELLOW}Test: Calculate tool - addition${NC}`);
    const addResult = await client.callTool({
      name: 'calculate',
      arguments: { operation: 'add', a: 15, b: 27 },
    });
    const addText = addResult.content[0]?.type === 'text' ? addResult.content[0].text : '';
    printResult(addText.includes('42'), 'Calculate tool - addition');
    console.log('');

    // Test 7: Calculate tool - multiplication
    console.log(`${YELLOW}Test: Calculate tool - multiplication${NC}`);
    const mulResult = await client.callTool({
      name: 'calculate',
      arguments: { operation: 'multiply', a: 6, b: 7 },
    });
    const mulText = mulResult.content[0]?.type === 'text' ? mulResult.content[0].text : '';
    printResult(mulText.includes('42'), 'Calculate tool - multiplication');
    console.log('');

    // Test 8: Echo tool (inline handler)
    console.log(`${YELLOW}Test: Call echo tool (inline handler)${NC}`);
    const echoResult = await client.callTool({
      name: 'echo',
      arguments: { message: 'Hello from stdio!' },
    });
    const echoText = echoResult.content[0]?.type === 'text' ? echoResult.content[0].text : '';
    printResult(echoText.includes('Hello from stdio!'), 'Echo tool execution');
    console.log('');

    // Test 9: Validation error - missing required field
    console.log(`${YELLOW}Test: Validation error - missing required field${NC}`);
    const missingFieldResult = await client.callTool({
      name: 'greet',
      arguments: {},
    });
    const missingFieldText = missingFieldResult.content[0]?.type === 'text' ? missingFieldResult.content[0].text : '';
    printResult(missingFieldText.includes('Validation Error'), 'Validation error handling');
    console.log('');

    // Test 10: Validation error - wrong type
    console.log(`${YELLOW}Test: Validation error - wrong type${NC}`);
    const wrongTypeResult = await client.callTool({
      name: 'calculate',
      arguments: { operation: 'add', a: 'not-a-number', b: 3 },
    });
    const wrongTypeText = wrongTypeResult.content[0]?.type === 'text' ? wrongTypeResult.content[0].text : '';
    printResult(wrongTypeText.includes('Validation Error'), 'Type validation error handling');
    console.log('');

    // Test 11: Get prompt
    console.log(`${YELLOW}Test: Get prompt template${NC}`);
    const promptResult = await client.getPrompt({
      name: 'test-greeting',
      arguments: { name: 'StdioUser' },
    });
    const promptText = promptResult.messages[0]?.content?.type === 'text' ? promptResult.messages[0].content.text : '';
    printResult(promptText.includes('StdioUser'), 'Get prompt');
    console.log('');

    // Test 12: Read resource
    console.log(`${YELLOW}Test: Read resource${NC}`);
    const resourceResult = await client.readResource({
      uri: 'test://resource/info',
    });
    const resourceText = resourceResult.contents[0]?.text || '';
    printResult(resourceText.includes('test resource'), 'Read resource');
    console.log('');

    // Test 13: Division by zero error handling
    console.log(`${YELLOW}Test: Division by zero error handling${NC}`);
    const divZeroResult = await client.callTool({
      name: 'calculate',
      arguments: { operation: 'divide', a: 10, b: 0 },
    });
    const divZeroText = divZeroResult.content[0]?.type === 'text' ? divZeroResult.content[0].text : '';
    printResult(divZeroText.toLowerCase().includes('zero'), 'Division by zero error handling');
    console.log('');
  } catch (error) {
    console.error('Error during tests:', error);
    testsFailed++;
  } finally {
    // Close client connection
    await client.close();
  }

  // Print summary
  console.log('=========================================');
  console.log('Test Summary');
  console.log('=========================================');
  console.log(`Tests Passed: ${GREEN}${testsPassed}${NC}`);
  console.log(`Tests Failed: ${RED}${testsFailed}${NC}`);
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log('');

  if (testsFailed === 0) {
    console.log(`${GREEN}All tests passed!${NC}`);
    process.exit(0);
  } else {
    console.log(`${RED}Some tests failed. Check the output above.${NC}`);
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});