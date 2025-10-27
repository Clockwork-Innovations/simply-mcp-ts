#!/usr/bin/env npx tsx
/**
 * Gate 1 Validation Test
 *
 * Independent validation of Foundation Layer infrastructure
 * by Gate Validator (not the implementer).
 *
 * Tests MCP client capabilities to verify claims:
 * 1. Connection and session management
 * 2. Resource operations
 * 3. Tool execution
 * 4. Subscription support
 * 5. HTML content retrieval
 *
 * Usage:
 *   npx tsx tests/validate-gate1.ts
 */

import { MCPTestClient } from './utils/mcp-test-client.js';
import { colors } from './utils/test-helpers.js';

const SERVER_URL = 'http://localhost:3001/mcp';

async function validate() {
  console.log(`${colors.blue}╔═══════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║       Gate 1 Validation - Foundation Layer                        ║${colors.reset}`);
  console.log(`${colors.blue}╚═══════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  const client = new MCPTestClient();
  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Connection
    console.log(`${colors.cyan}Test 1: Connection${colors.reset}`);
    await client.connect(SERVER_URL);
    const sessionId = client.getSessionId();
    if (!sessionId) {
      throw new Error('No session ID returned');
    }
    console.log(`${colors.green}✓${colors.reset} Connected, session: ${sessionId}`);
    passed++;

    // Test 2: Resources
    console.log(`\n${colors.cyan}Test 2: List Resources${colors.reset}`);
    const resources = await client.listResources();
    console.log(`${colors.green}✓${colors.reset} Resources: ${resources.length}`);
    if (resources.length < 2) {
      throw new Error('Expected at least 2 resources');
    }
    passed++;

    // Test 3: Subscribe
    console.log(`\n${colors.cyan}Test 3: Subscribe to Resource${colors.reset}`);
    await client.subscribe('ui://stats/live');
    const subscriptions = client.getSubscriptions();
    if (!subscriptions.includes('ui://stats/live')) {
      throw new Error('Subscription not tracked');
    }
    console.log(`${colors.green}✓${colors.reset} Subscribed to ui://stats/live`);
    passed++;

    // Test 4: Tool call
    console.log(`\n${colors.cyan}Test 4: Call Tool${colors.reset}`);
    const result = await client.callTool('add', { a: 5, b: 3 });
    if (!Array.isArray(result) || result.length === 0) {
      throw new Error('Tool call returned invalid result');
    }
    console.log(`${colors.green}✓${colors.reset} Tool result: ${JSON.stringify(result)}`);
    passed++;

    // Test 5: Read resource
    console.log(`\n${colors.cyan}Test 5: Read Resource (HTML)${colors.reset}`);
    const html = await client.readResource('ui://calculator/v1');
    if (!html || !html.includes('<')) {
      throw new Error('Invalid HTML content');
    }
    console.log(`${colors.green}✓${colors.reset} HTML size: ${html.length} bytes`);
    passed++;

    await client.disconnect();
    console.log(`\n${colors.green}✓${colors.reset} Disconnected`);

    console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}`);
    console.log(`${colors.bright}Validation Results${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}`);
    console.log(`${colors.green}Passed:${colors.reset} ${passed}`);
    console.log(`${colors.red}Failed:${colors.reset} ${failed}`);
    console.log(`\n${colors.green}✓ All validation tests passed${colors.reset}\n`);

    process.exit(0);
  } catch (err: any) {
    failed++;
    console.log(`${colors.red}✗ FAIL: ${err.message}${colors.reset}`);
    if (err.stack) {
      console.log(`${colors.dim}${err.stack}${colors.reset}`);
    }

    console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}`);
    console.log(`${colors.bright}Validation Results${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}`);
    console.log(`${colors.green}Passed:${colors.reset} ${passed}`);
    console.log(`${colors.red}Failed:${colors.reset} ${failed}`);
    console.log(`\n${colors.red}✗ Validation failed${colors.reset}\n`);

    process.exit(1);
  }
}

validate().catch(err => {
  console.error(`${colors.red}Fatal error: ${err.message}${colors.reset}`);
  process.exit(1);
});
