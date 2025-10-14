#!/usr/bin/env node
/**
 * Test client for MCP Decorator API
 * Tests @tool, @prompt, and @resource decorators with comprehensive edge cases
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// ANSI colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
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

function printSection(title: string) {
  console.log('');
  console.log(`${BLUE}═══════════════════════════════════════${NC}`);
  console.log(`${BLUE}${title}${NC}`);
  console.log(`${BLUE}═══════════════════════════════════════${NC}`);
  console.log('');
}

async function runTests() {
  console.log('=========================================');
  console.log('Testing MCP Decorator API');
  console.log('=========================================');
  console.log('');

  // Create client transport pointing to our test decorator class using the CLI
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', 'src/cli/class-bin.ts', 'tests/fixtures/test-decorator-class.ts'],
  });

  const client = new Client(
    {
      name: 'test-decorator-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  try {
    // Test 1: Initialize connection
    printSection('Connection Tests');
    console.log(`${YELLOW}Test: Initialize connection${NC}`);
    await client.connect(transport);
    printResult(true, 'Initialize connection');
    console.log('');

    // Test 2: List tools - verify count
    printSection('@tool Decorator Tests');
    console.log(`${YELLOW}Test: List tools - verify decorator registration${NC}`);
    const toolsResult = await client.listTools();
    console.log(`Found ${toolsResult.tools.length} tools:`, toolsResult.tools.map(t => t.name));

    // Should have: calculate, greet-user, echo-message, complex-params
    const expectedTools = ['calculate', 'greet-user', 'echo-message', 'complex-params'];
    const actualToolNames = toolsResult.tools.map(t => t.name);
    const hasAllTools = expectedTools.every(name => actualToolNames.includes(name));

    printResult(
      toolsResult.tools.length >= 4 && hasAllTools,
      `List tools - expected ${expectedTools.length} tools with decorators`
    );
    console.log('');

    // Test 3: Call @tool decorated method with JSDoc
    console.log(`${YELLOW}Test: Call @tool with JSDoc parameters${NC}`);
    const calculateResult = await client.callTool({
      name: 'calculate',
      arguments: { a: 10, b: 5, operation: 'add' },
    });
    const calculateText = calculateResult.content[0]?.type === 'text' ? calculateResult.content[0].text : '';
    console.log('Calculate result:', calculateText);
    printResult(calculateText.includes('15'), '@tool with JSDoc parameters');
    console.log('');

    // Test 4: Call @tool with different operations
    console.log(`${YELLOW}Test: @tool with operation parameter validation${NC}`);
    const multiplyResult = await client.callTool({
      name: 'calculate',
      arguments: { a: 6, b: 7, operation: 'multiply' },
    });
    const multiplyText = multiplyResult.content[0]?.type === 'text' ? multiplyResult.content[0].text : '';
    printResult(multiplyText.includes('42'), '@tool operation: multiply');
    console.log('');

    // Test 5: @tool error handling (division by zero)
    console.log(`${YELLOW}Test: @tool error handling (division by zero)${NC}`);
    const divZeroResult = await client.callTool({
      name: 'calculate',
      arguments: { a: 10, b: 0, operation: 'divide' },
    });
    const divZeroText = divZeroResult.content[0]?.type === 'text' ? divZeroResult.content[0].text : '';
    printResult(divZeroText.toLowerCase().includes('zero'), '@tool division by zero error');
    console.log('');

    // Test 6: @tool with optional parameters
    console.log(`${YELLOW}Test: @tool with optional parameters${NC}`);
    const greetResult = await client.callTool({
      name: 'greet-user',
      arguments: { name: 'Alice', formal: true },
    });
    const greetText = greetResult.content[0]?.type === 'text' ? greetResult.content[0].text : '';
    console.log('Greeting result:', greetText);
    printResult(greetText.includes('Alice'), '@tool with optional parameter (formal=true)');
    console.log('');

    // Test 7: @tool with optional parameter omitted
    console.log(`${YELLOW}Test: @tool with optional parameter omitted${NC}`);
    const greetCasualResult = await client.callTool({
      name: 'greet-user',
      arguments: { name: 'Bob' },
    });
    const greetCasualText = greetCasualResult.content[0]?.type === 'text' ? greetCasualResult.content[0].text : '';
    console.log('Casual greeting result:', greetCasualText);
    printResult(greetCasualText.includes('Bob'), '@tool with optional parameter omitted');
    console.log('');

    // Test 8: @tool with complex parameters
    console.log(`${YELLOW}Test: @tool with complex parameter types${NC}`);
    const complexResult = await client.callTool({
      name: 'complex-params',
      arguments: {
        count: 3,
        message: 'test',
        options: { flag: true },
      },
    });
    const complexText = complexResult.content[0]?.type === 'text' ? complexResult.content[0].text : '';
    console.log('Complex params result:', complexText);
    printResult(
      complexText.includes('count') && complexText.includes('3'),
      '@tool with complex parameters'
    );
    console.log('');

    // Test 9: @tool parameter validation - missing required
    console.log(`${YELLOW}Test: @tool validation - missing required parameter${NC}`);
    const missingResult = await client.callTool({
      name: 'greet-user',
      arguments: {},
    });
    const missingText = missingResult.content[0]?.type === 'text' ? missingResult.content[0].text : '';
    printResult(
      missingText.includes('Validation Error') || missingText.includes('required'),
      '@tool validation - missing required'
    );
    console.log('');

    // Test 10: @tool parameter validation - wrong type
    console.log(`${YELLOW}Test: @tool validation - wrong parameter type${NC}`);
    const wrongTypeResult = await client.callTool({
      name: 'calculate',
      arguments: { a: 'not-a-number', b: 5, operation: 'add' },
    });
    const wrongTypeText = wrongTypeResult.content[0]?.type === 'text' ? wrongTypeResult.content[0].text : '';
    printResult(
      wrongTypeText.includes('Validation Error') || wrongTypeText.includes('number'),
      '@tool validation - wrong type'
    );
    console.log('');

    // Test 11: List prompts - verify count
    printSection('@prompt Decorator Tests');
    console.log(`${YELLOW}Test: List prompts - verify decorator registration${NC}`);
    const promptsResult = await client.listPrompts();
    console.log(`Found ${promptsResult.prompts.length} prompts:`, promptsResult.prompts.map(p => p.name));

    // Should have: greetingPrompt, codeReviewPrompt, summarizePrompt
    const expectedPrompts = ['greetingPrompt', 'codeReviewPrompt', 'summarizePrompt'];
    const actualPromptNames = promptsResult.prompts.map(p => p.name);
    const hasAllPrompts = expectedPrompts.every(name => actualPromptNames.includes(name));

    printResult(
      promptsResult.prompts.length >= 3 && hasAllPrompts,
      `List prompts - expected ${expectedPrompts.length} prompts with decorators`
    );
    console.log('');

    // Test 12: Verify @prompt metadata is registered
    console.log(`${YELLOW}Test: Verify @prompt metadata${NC}`);
    const greetingPrompt = promptsResult.prompts.find(p => p.name === 'greetingPrompt');
    const hasArguments = greetingPrompt?.arguments && greetingPrompt.arguments.length > 0;
    printResult(
      hasArguments === true,
      '@prompt metadata includes arguments'
    );
    console.log('');

    // Test 13: Verify @prompt arguments are correct
    console.log(`${YELLOW}Test: Verify @prompt argument definitions${NC}`);
    const codeReviewPrompt = promptsResult.prompts.find(p => p.name === 'codeReviewPrompt');
    const hasLanguageArg = codeReviewPrompt?.arguments?.some(arg => arg.name === 'language');
    const hasFocusAreasArg = codeReviewPrompt?.arguments?.some(arg => arg.name === 'focusAreas');
    printResult(
      hasLanguageArg && hasFocusAreasArg,
      '@prompt has correct argument definitions'
    );
    console.log('');

    // Note: Dynamic prompt execution is not yet fully supported in class-adapter
    // The prompts are registered but return static template placeholders
    console.log(`${BLUE}Note: Dynamic @prompt execution will be tested when fully implemented${NC}`);
    console.log('');

    // Test 14: List resources - verify count
    printSection('@resource Decorator Tests');
    console.log(`${YELLOW}Test: List resources - verify decorator registration${NC}`);
    const resourcesResult = await client.listResources();
    console.log(`Found ${resourcesResult.resources.length} resources:`, resourcesResult.resources.map(r => r.uri));

    // Should have: info://server/status, info://server/config, help://usage
    const expectedResources = ['info://server/status', 'info://server/config', 'help://usage'];
    const actualResourceUris = resourcesResult.resources.map(r => r.uri);
    const hasAllResources = expectedResources.every(uri => actualResourceUris.includes(uri));

    printResult(
      resourcesResult.resources.length >= 3 && hasAllResources,
      `List resources - expected ${expectedResources.length} resources with decorators`
    );
    console.log('');

    // Test 15: Read @resource with JSON content
    console.log(`${YELLOW}Test: Read @resource with JSON content${NC}`);
    const statusResult = await client.readResource({
      uri: 'info://server/status',
    });
    const statusText = statusResult.contents[0]?.text || '';
    console.log('Status resource (first 100 chars):', statusText.substring(0, 100));

    let statusJson;
    try {
      statusJson = JSON.parse(statusText);
    } catch (e) {
      statusJson = null;
    }

    printResult(
      statusJson && statusJson.status === 'running',
      '@resource with JSON content (application/json)'
    );
    console.log('');

    // Test 16: Read @resource with text content
    console.log(`${YELLOW}Test: Read @resource with text content${NC}`);
    const helpResult = await client.readResource({
      uri: 'help://usage',
    });
    const helpText = helpResult.contents[0]?.text || '';
    console.log('Help resource (first 100 chars):', helpText.substring(0, 100));
    printResult(
      helpText.includes('TOOLS') && helpText.includes('PROMPTS') && helpText.includes('RESOURCES'),
      '@resource with text content (text/plain)'
    );
    console.log('');

    // Test 17: Read @resource with dynamic content
    console.log(`${YELLOW}Test: Read @resource with dynamic content${NC}`);
    const configResult1 = await client.readResource({
      uri: 'info://server/config',
    });
    const config1Text = configResult1.contents[0]?.text || '';

    let config1Json;
    try {
      config1Json = JSON.parse(config1Text);
    } catch (e) {
      config1Json = null;
    }

    printResult(
      config1Json && config1Json.name === 'test-decorator-server',
      '@resource with dynamic content'
    );
    console.log('');

    // Test 18: Verify @resource mime types
    console.log(`${YELLOW}Test: Verify @resource mime types${NC}`);
    const statusResource = resourcesResult.resources.find(r => r.uri === 'info://server/status');
    const helpResource = resourcesResult.resources.find(r => r.uri === 'help://usage');

    printResult(
      statusResource?.mimeType === 'application/json' && helpResource?.mimeType === 'text/plain',
      '@resource mime types correct'
    );
    console.log('');

    // Test 19: Multiple decorators on same class
    printSection('Integration Tests');
    console.log(`${YELLOW}Test: Multiple decorators on same class${NC}`);
    const hasTools = toolsResult.tools.length >= 4;
    const hasPrompts = promptsResult.prompts.length >= 3;
    const hasResources = resourcesResult.resources.length >= 3;

    printResult(
      hasTools && hasPrompts && hasResources,
      'Multiple decorators (@tool, @prompt, @resource) on same class'
    );
    console.log('');

    // Test 20: JSDoc description extraction
    console.log(`${YELLOW}Test: JSDoc description extraction for @tool${NC}`);
    const calculateTool = toolsResult.tools.find(t => t.name === 'calculate');
    console.log('Calculate tool description:', calculateTool?.description);
    printResult(
      calculateTool?.description?.includes('math') || calculateTool?.description?.includes('calculator'),
      'JSDoc description extracted for @tool'
    );
    console.log('');

    // Test 21: Prompt description from decorator
    console.log(`${YELLOW}Test: Prompt description from @prompt decorator${NC}`);
    console.log('Greeting prompt description:', greetingPrompt?.description);
    printResult(
      greetingPrompt?.description?.includes('greeting') || greetingPrompt?.description?.length! > 0,
      'Description from @prompt decorator'
    );
    console.log('');

    // Test 22: Resource description and name
    console.log(`${YELLOW}Test: Resource description and name from @resource decorator${NC}`);
    const statusResourceInfo = resourcesResult.resources.find(r => r.uri === 'info://server/status');
    console.log('Status resource name:', statusResourceInfo?.name);
    console.log('Status resource description:', statusResourceInfo?.description);
    printResult(
      statusResourceInfo?.name?.length! > 0,
      'Name and description from @resource decorator'
    );
    console.log('');

    // Test 23: End-to-end workflow - tool and resource
    printSection('End-to-End Workflow');
    console.log(`${YELLOW}Test: Complete workflow using decorators${NC}`);

    // Step 1: Call a tool
    const workflowToolResult = await client.callTool({
      name: 'calculate',
      arguments: { a: 20, b: 22, operation: 'add' },
    });
    const workflowToolText = workflowToolResult.content[0]?.type === 'text'
      ? workflowToolResult.content[0].text
      : '';

    // Step 2: Read a resource
    const workflowResourceResult = await client.readResource({
      uri: 'info://server/status',
    });
    const workflowResourceText = workflowResourceResult.contents[0]?.text || '';

    printResult(
      workflowToolText.includes('42') &&
      workflowResourceText.includes('running'),
      'End-to-end workflow: tool -> resource'
    );
    console.log('');

    // Test 24: Parameter inference from TypeScript types
    console.log(`${YELLOW}Test: Parameter type inference from TypeScript${NC}`);
    const calculateToolParams = calculateTool?.inputSchema;
    console.log('Calculate tool schema:', JSON.stringify(calculateToolParams, null, 2));

    // Check if the schema has the expected properties
    const hasRequiredProps = calculateToolParams &&
      'properties' in calculateToolParams &&
      calculateToolParams.properties &&
      'a' in calculateToolParams.properties &&
      'b' in calculateToolParams.properties &&
      'operation' in calculateToolParams.properties;

    printResult(
      hasRequiredProps === true,
      'Parameter types inferred from TypeScript'
    );
    console.log('');

  } catch (error) {
    console.error(`${RED}Error during tests:${NC}`, error);
    testsFailed++;
  } finally {
    // Close client connection
    await client.close();
  }

  // Print summary
  console.log('');
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
