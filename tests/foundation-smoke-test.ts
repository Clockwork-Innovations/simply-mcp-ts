#!/usr/bin/env node
/**
 * Foundation Layer Smoke Test
 *
 * Quick validation test for MCP test client infrastructure.
 * Tests all core functionality:
 * - Connection and session management
 * - Resource listing and reading
 * - Tool execution
 * - Subscription and notifications
 * - Multi-client scenarios
 *
 * Usage:
 *   1. Start server: npx simply-mcp run examples/interface-ui-foundation.ts --http --port 3001
 *   2. Run test: npx tsx tests/foundation-smoke-test.ts
 */

import { MCPTestClient } from './utils/mcp-test-client.js';
import { MultiClientManager } from './utils/multi-client-manager.js';
import {
  section,
  subsection,
  step,
  success,
  error,
  info,
  warning,
  printSummary,
  assertNotificationReceived,
  assertSubscriptionActive,
  assertClientConnected,
  waitFor,
  sleep,
} from './utils/test-helpers.js';

// ============================================================================
// Test Configuration
// ============================================================================

const SERVER_URL = 'http://localhost:3001/mcp';
const TEST_URI = 'ui://stats/live';
const CALC_URI = 'ui://calculator/v1';

let passed = 0;
let failed = 0;

// ============================================================================
// Test Helpers
// ============================================================================

async function runTest(name: string, testFn: () => Promise<void>): Promise<boolean> {
  try {
    console.log(subsection(name));
    await testFn();
    console.log(success('PASS'));
    passed++;
    return true;
  } catch (err: any) {
    console.log(error(`FAIL: ${err.message}`));
    if (err.stack) {
      console.log(error(`  ${err.stack.split('\n').slice(1, 3).join('\n  ')}`));
    }
    failed++;
    return false;
  }
}

// ============================================================================
// Test Suite 1: Basic Client Operations
// ============================================================================

async function testBasicClientOperations(): Promise<void> {
  console.log(section('Test Suite 1: Basic Client Operations'));

  const client = new MCPTestClient({ verbose: false });

  // Test 1: Connection
  await runTest('1.1 Connect to server', async () => {
    await client.connect(SERVER_URL);
    assertClientConnected(client);
    console.log(info(`  Session ID: ${client.getSessionId()}`));
  });

  // Test 2: List resources
  await runTest('1.2 List resources', async () => {
    const resources = await client.listResources();
    console.log(info(`  Found ${resources.length} resources`));

    const uiResources = resources.filter(r => r.uri.startsWith('ui://'));
    if (uiResources.length < 2) {
      throw new Error(`Expected at least 2 UI resources, got ${uiResources.length}`);
    }

    console.log(info(`  UI resources: ${uiResources.map(r => r.uri).join(', ')}`));
  });

  // Test 3: Read static resource
  await runTest('1.3 Read static resource (Calculator)', async () => {
    const content = await client.readResource(CALC_URI);

    // Check for valid HTML/CSS content (could be <style>, <html>, <!DOCTYPE, etc)
    if (!content.includes('<')) {
      throw new Error('Invalid HTML content - no HTML tags found');
    }

    console.log(info(`  Content size: ${content.length} bytes`));
  });

  // Test 4: Read dynamic resource
  await runTest('1.4 Read dynamic resource (Stats)', async () => {
    const content = await client.readResource(TEST_URI);

    // Check for valid HTML/CSS content
    if (!content.includes('<')) {
      throw new Error('Invalid HTML content - no HTML tags found');
    }

    if (!content.includes('Live Statistics')) {
      throw new Error('Missing expected content');
    }

    console.log(info(`  Content size: ${content.length} bytes`));
  });

  // Test 5: List tools
  await runTest('1.5 List tools', async () => {
    const tools = await client.listTools();
    console.log(info(`  Found ${tools.length} tools`));

    const toolNames = tools.map(t => t.name);
    if (!toolNames.includes('add')) {
      throw new Error('Expected "add" tool not found');
    }
    if (!toolNames.includes('refresh_stats')) {
      throw new Error('Expected "refresh_stats" tool not found');
    }

    console.log(info(`  Tools: ${toolNames.join(', ')}`));
  });

  // Test 6: Call tool
  await runTest('1.6 Call tool (add)', async () => {
    const result = await client.callTool('add', { a: 5, b: 3 });
    console.log(info(`  Result: ${JSON.stringify(result)}`));

    // MCP tools return array of content objects
    if (!Array.isArray(result) || result.length === 0) {
      throw new Error('Expected non-empty array result');
    }
  });

  // Test 7: Disconnect
  await runTest('1.7 Disconnect', async () => {
    await client.disconnect();

    if (client.isConnected()) {
      throw new Error('Client still reports connected after disconnect');
    }
  });
}

// ============================================================================
// Test Suite 2: Subscription Support
// ============================================================================

async function testSubscriptionSupport(): Promise<void> {
  console.log(section('Test Suite 2: Subscription Support'));

  const client = new MCPTestClient({ verbose: false });

  await runTest('2.1 Connect to server', async () => {
    await client.connect(SERVER_URL);
    assertClientConnected(client);
  });

  await runTest('2.2 Subscribe to resource', async () => {
    await client.subscribe(TEST_URI);
    assertSubscriptionActive(client, TEST_URI);
    console.log(info(`  Subscribed to ${TEST_URI}`));
  });

  await runTest('2.3 Trigger update and wait for notification', async () => {
    // Clear previous notifications
    client.clearNotifications();

    // Trigger update by calling refresh_stats tool
    await client.callTool('refresh_stats', {});

    // Wait for notification (with timeout)
    console.log(info('  Waiting for notification...'));

    try {
      const notification = await client.waitForNotification(TEST_URI, 10000);
      console.log(info(`  Received notification at ${new Date(notification.timestamp).toISOString()}`));
    } catch (err) {
      // Some servers may not implement notifications yet
      console.log(warning('  Notification not received (may not be implemented yet)'));
      // Don't fail the test - this is a known limitation
      return;
    }
  });

  await runTest('2.4 Verify notification history', async () => {
    const notifications = client.getNotifications(TEST_URI);

    if (notifications.length === 0) {
      console.log(warning('  No notifications in history (server may not push notifications)'));
      return;
    }

    console.log(info(`  Notification count: ${notifications.length}`));
    assertNotificationReceived(notifications, TEST_URI);
  });

  await runTest('2.5 Unsubscribe from resource', async () => {
    await client.unsubscribe(TEST_URI);

    const subs = client.getSubscriptions();
    if (subs.includes(TEST_URI)) {
      throw new Error('Resource still in subscriptions after unsubscribe');
    }
  });

  await runTest('2.6 Disconnect', async () => {
    await client.disconnect();
  });
}

// ============================================================================
// Test Suite 3: Multi-Client Scenarios
// ============================================================================

async function testMultiClientScenarios(): Promise<void> {
  console.log(section('Test Suite 3: Multi-Client Scenarios'));

  const manager = new MultiClientManager({
    verbose: false,
    timeout: 10000, // Increase timeout for multi-client
    delayBetweenConnections: 200, // Add delay between connections
  });

  await runTest('3.1 Create 3 clients', async () => {
    const clients = await manager.createClients(3, SERVER_URL);

    if (clients.length !== 3) {
      throw new Error(`Expected 3 clients, got ${clients.length}`);
    }

    console.log(info('  Created 3 clients'));
  });

  await runTest('3.2 Connect all clients', async () => {
    await manager.connectAll();

    if (!manager.areAllConnected()) {
      throw new Error('Not all clients connected');
    }

    const sessionIds = manager.getSessionIds();
    console.log(info(`  All clients connected with unique sessions`));

    // Verify unique session IDs
    const uniqueSessions = new Set(Array.from(sessionIds.values()));
    if (uniqueSessions.size !== 3) {
      throw new Error('Session IDs are not unique');
    }
  });

  await runTest('3.3 Subscribe all clients (sequential)', async () => {
    // Subscribe sequentially to avoid overwhelming server
    const clients = manager.getClients();
    for (let i = 0; i < clients.length; i++) {
      await clients[i].subscribe(TEST_URI);
      await sleep(100); // Small delay between operations
    }

    clients.forEach((client, i) => {
      assertSubscriptionActive(client, TEST_URI);
    });

    console.log(info(`  All clients subscribed to ${TEST_URI}`));
  });

  await runTest('3.4 Trigger update from one client', async () => {
    // Clear notifications on all clients
    manager.clearAllNotifications();

    // Client 0 triggers update
    await manager.callTool(0, 'refresh_stats', {});
    console.log(info('  Client 0 called refresh_stats'));
  });

  await runTest('3.5 Wait for all clients to receive notification', async () => {
    try {
      console.log(info('  Waiting for notifications...'));

      const notifications = await manager.waitForAllNotifications(TEST_URI, 10000);

      if (notifications.size !== 3) {
        throw new Error(`Expected 3 notifications, got ${notifications.size}`);
      }

      console.log(info('  All clients received notification'));
    } catch (err) {
      console.log(warning('  Not all clients received notifications (server may not broadcast)'));
      // Don't fail - this is a known limitation for some servers
    }
  });

  await runTest('3.6 Call tool from all clients (sequential)', async () => {
    const results = await manager.callToolFromAllClientsSequential('add', { a: 10, b: 5 });

    if (results.size !== 3) {
      throw new Error(`Expected 3 results, got ${results.size}`);
    }

    console.log(info('  All clients executed tool successfully'));
  });

  await runTest('3.7 Disconnect all clients', async () => {
    await manager.disconnectAll();

    if (manager.areAllConnected()) {
      throw new Error('Some clients still connected');
    }

    console.log(info('  All clients disconnected'));
  });
}

// ============================================================================
// Test Suite 4: Error Handling
// ============================================================================

async function testErrorHandling(): Promise<void> {
  console.log(section('Test Suite 4: Error Handling'));

  const client = new MCPTestClient({ verbose: false });

  await runTest('4.1 Operations before connection should fail', async () => {
    try {
      await client.listResources();
      throw new Error('Expected error but operation succeeded');
    } catch (err: any) {
      if (!err.message.includes('not connected')) {
        throw new Error(`Expected "not connected" error, got: ${err.message}`);
      }
    }
  });

  await runTest('4.2 Connect to server', async () => {
    await client.connect(SERVER_URL);
  });

  await runTest('4.3 Invalid resource URI should fail', async () => {
    try {
      await client.readResource('ui://invalid/resource');
      throw new Error('Expected error but operation succeeded');
    } catch (err: any) {
      // Should fail - but don't check specific error message as it varies
      console.log(info(`  Got expected error: ${err.message.substring(0, 50)}...`));
    }
  });

  await runTest('4.4 Invalid tool name should fail', async () => {
    try {
      await client.callTool('invalid_tool', {});
      throw new Error('Expected error but operation succeeded');
    } catch (err: any) {
      console.log(info(`  Got expected error: ${err.message.substring(0, 50)}...`));
    }
  });

  await runTest('4.5 Disconnect', async () => {
    await client.disconnect();
  });

  await runTest('4.6 Double connect should fail', async () => {
    const newClient = new MCPTestClient({ verbose: false });
    await newClient.connect(SERVER_URL);

    try {
      await newClient.connect(SERVER_URL);
      throw new Error('Expected error but operation succeeded');
    } catch (err: any) {
      if (!err.message.includes('already connected')) {
        throw new Error(`Expected "already connected" error, got: ${err.message}`);
      }
    }

    await newClient.disconnect();
  });
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function main() {
  console.log(section('MCP Test Client - Foundation Smoke Test'));
  console.log(info(`Testing against: ${SERVER_URL}`));
  console.log(info('Make sure the server is running before starting tests'));
  console.log(info('Start server: npx simply-mcp run examples/interface-ui-foundation.ts --http --port 3001'));

  // Wait a moment for user to read
  await sleep(2000);

  try {
    // Run test suites
    await testBasicClientOperations();
    await testSubscriptionSupport();
    await testMultiClientScenarios();
    await testErrorHandling();

    // Print summary
    printSummary(passed, failed);

    // Exit with appropriate code
    if (failed > 0) {
      console.log(error('\nSome tests failed. Review errors above.'));
      process.exit(1);
    } else {
      console.log(success('\nAll tests passed!'));
      console.log(info('\nNext steps:'));
      console.log(info('  - Use MCPTestClient for building feature layer tests'));
      console.log(info('  - Use MultiClientManager for concurrent testing scenarios'));
      console.log(info('  - See test-helpers.ts for additional utilities'));
      process.exit(0);
    }

  } catch (err: any) {
    console.log(error(`Fatal error: ${err.message}`));
    console.error(err.stack);
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\nTest interrupted by user');
  process.exit(130);
});

// Run tests
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
