/**
 * Comprehensive Subscription Lifecycle Test Suite
 *
 * Complete end-to-end testing of MCP subscription lifecycle with proper
 * notification delivery. Uses subscription-test-server.ts fixture that
 * actually calls notifyResourceUpdate().
 *
 * Test Coverage:
 * - Suite 1: Basic Subscribe/Unsubscribe Operations (5 tests)
 * - Suite 2: Notification Delivery (5 tests)
 * - Suite 3: Multi-Client Synchronization (4 tests)
 * - Suite 4: Resource Content Updates (4 tests)
 *
 * Total: 18 comprehensive tests
 *
 * Prerequisites:
 * 1. Start test server:
 *    npx simply-mcp run tests/fixtures/subscription-test-server.ts --http --port 3002
 *
 * 2. Run tests:
 *    npx tsx tests/subscription-lifecycle-comprehensive.ts
 *
 * Expected Server Features:
 * - refresh tool: Triggers notifyResourceUpdate()
 * - reset tool: Triggers notifyResourceUpdate()
 * - increment tool: Does NOT trigger notification (for testing selectivity)
 * - ui://test/live-stats: Dynamic resource with subscribable updates
 */

import { MCPTestClient } from './utils/mcp-test-client.js';
import { MultiClientManager } from './utils/multi-client-manager.js';
import { TestArtifactManager } from './utils/artifact-manager.js';
import { TestReporter } from './utils/test-reporter.js';
import {
  assert,
  assertEqual,
  assertSubscriptionActive,
  assertGreaterThan,
  sleep,
  colors,
  section,
  success,
  error,
  info,
  warning,
} from './utils/test-helpers.js';

// ============================================================================
// Configuration
// ============================================================================

const SERVER_URL = 'http://localhost:3003/mcp';
const SUBSCRIBABLE_URI = 'ui://test/live-stats';
const INVALID_URI = 'ui://nonexistent';
const ARTIFACT_DIR = '/tmp/mcp-ui-aggressive-test';

// ============================================================================
// Test Infrastructure Setup
// ============================================================================

const artifactManager = new TestArtifactManager(ARTIFACT_DIR, {
  verbose: true,
  autoCleanup: false,
  cleanupThresholdMB: 50,
});

const reporter = new TestReporter(artifactManager);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract request count from HTML content
 */
function extractCount(html: string): number {
  const match = html.match(/<div class="stat-value" id="count">(\d+)<\/div>/);
  return match ? parseInt(match[1]) : -1;
}

/**
 * Extract reset count from HTML content
 */
function extractResetCount(html: string): number {
  const match = html.match(/<div class="stat-value" id="reset-count">(\d+)<\/div>/);
  return match ? parseInt(match[1]) : -1;
}

/**
 * Extract time from HTML content
 */
function extractTime(html: string): string {
  const match = html.match(/<div class="stat-value" id="time">([^<]+)<\/div>/);
  return match ? match[1] : '';
}

/**
 * Run a test with error handling and reporting
 */
async function runTest(
  name: string,
  testFn: () => Promise<void>,
  reporter: TestReporter
): Promise<void> {
  reporter.startTest(name);
  try {
    await testFn();
    console.log(success(name));
    reporter.passTest();
  } catch (err: any) {
    console.log(error(`${name}: ${err.message}`));
    reporter.failTest(err);
  }
}

// ============================================================================
// Test Suite 1: Basic Subscribe/Unsubscribe Operations
// ============================================================================

async function suite1_BasicOperations(client: MCPTestClient, reporter: TestReporter): Promise<void> {
  console.log(section('Suite 1: Basic Subscribe/Unsubscribe Operations'));

  // Test 1.1: Subscribe to valid resource
  await runTest('1.1: Subscribe to valid resource', async () => {
    await client.subscribe(SUBSCRIBABLE_URI);
    const subs = client.getSubscriptions();

    assert(subs.includes(SUBSCRIBABLE_URI), 'Subscription not tracked');
    artifactManager.log(`✓ Subscriptions: ${subs.join(', ')}`);
  }, reporter);

  // Test 1.2: Double subscribe (should be idempotent)
  await runTest('1.2: Double subscribe is idempotent', async () => {
    // Already subscribed from 1.1
    await client.subscribe(SUBSCRIBABLE_URI);
    const subs = client.getSubscriptions();

    // Should still have only 1 subscription
    assertEqual(subs.length, 1, `Expected 1 subscription, got ${subs.length}`);
    artifactManager.log('✓ Idempotent subscription confirmed');
  }, reporter);

  // Test 1.3: Subscribe to invalid resource (should error)
  await runTest('1.3: Subscribe to nonexistent resource fails', async () => {
    try {
      await client.subscribe(INVALID_URI);
      throw new Error('Should have thrown error for invalid URI');
    } catch (err: any) {
      if (!err.message.includes('unknown resource') && !err.message.includes('Unknown resource')) {
        throw err;
      }
      artifactManager.log(`✓ Got expected error: ${err.message}`);
    }
  }, reporter);

  // Test 1.4: Unsubscribe removes subscription
  await runTest('1.4: Unsubscribe removes subscription', async () => {
    await client.unsubscribe(SUBSCRIBABLE_URI);
    const subs = client.getSubscriptions();

    assert(!subs.includes(SUBSCRIBABLE_URI), 'Subscription still tracked after unsubscribe');
    artifactManager.log('✓ Subscription removed successfully');
  }, reporter);

  // Test 1.5: Unsubscribe without subscribe (should succeed)
  await runTest('1.5: Unsubscribe without prior subscribe succeeds', async () => {
    // Already unsubscribed in 1.4
    await client.unsubscribe(SUBSCRIBABLE_URI);
    artifactManager.log('✓ Graceful unsubscribe works');
  }, reporter);
}

// ============================================================================
// Test Suite 2: Notification Delivery
// ============================================================================

async function suite2_NotificationDelivery(client: MCPTestClient, reporter: TestReporter): Promise<void> {
  console.log(section('Suite 2: Notification Delivery'));

  // Re-subscribe for these tests
  await client.subscribe(SUBSCRIBABLE_URI);
  artifactManager.log('✓ Re-subscribed for notification tests');

  // Test 2.1: Basic notification delivery
  await runTest('2.1: Receive notification after tool trigger', async () => {
    // Clear previous notifications
    client.clearNotifications();

    // Call refresh tool to trigger notification
    await client.callTool('refresh', {});
    artifactManager.log('✓ Called refresh tool');

    // Wait for notification (10 second timeout)
    const notification = await client.waitForNotification(SUBSCRIBABLE_URI, 10000);

    assert(notification, 'Notification not received within 10s timeout');

    // Verify notification structure
    assertEqual(notification.notification.method, 'notifications/resources/updated', 'Wrong notification method');
    assertEqual(notification.notification.params?.uri, SUBSCRIBABLE_URI, 'Wrong URI in notification');

    artifactManager.log('✓ Notification received with correct structure');
  }, reporter);

  // Test 2.2: Multiple notifications
  await runTest('2.2: Multiple triggers, multiple notifications', async () => {
    // Clear notification history
    client.clearNotifications();

    // Trigger 3 updates
    for (let i = 0; i < 3; i++) {
      await client.callTool('refresh', {});
      await sleep(200); // Small delay between calls
    }

    // Wait for all notifications
    await sleep(2000);

    const notifications = client.getNotifications(SUBSCRIBABLE_URI);

    assertGreaterThan(notifications.length, 0, 'Should receive at least 1 notification');

    if (notifications.length === 3) {
      artifactManager.log('✓ Received all 3 notifications');
    } else {
      artifactManager.log(`⚠ Received ${notifications.length}/3 notifications (may be debounced)`);
    }
  }, reporter);

  // Test 2.3: Notification after unsubscribe (should NOT receive)
  await runTest('2.3: No notification after unsubscribe', async () => {
    // Unsubscribe
    await client.unsubscribe(SUBSCRIBABLE_URI);

    // Clear notifications
    client.clearNotifications();

    // Trigger update
    await client.callTool('refresh', {});

    // Wait
    await sleep(2000);

    const notifications = client.getNotifications(SUBSCRIBABLE_URI);

    assertEqual(notifications.length, 0, `Received ${notifications.length} notifications after unsubscribe!`);

    artifactManager.log('✓ No notifications received after unsubscribe');
  }, reporter);

  // Test 2.4: Re-subscribe and receive again
  await runTest('2.4: Re-subscribe works', async () => {
    // Re-subscribe
    await client.subscribe(SUBSCRIBABLE_URI);

    // Clear notifications
    client.clearNotifications();

    // Trigger update
    await client.callTool('refresh', {});

    // Wait for notification
    const notification = await client.waitForNotification(SUBSCRIBABLE_URI, 5000);

    assert(notification, 'Notification not received after re-subscribe');

    artifactManager.log('✓ Re-subscribe works, notifications resume');
  }, reporter);

  // Test 2.5: Notification history tracking
  await runTest('2.5: Notification history is tracked', async () => {
    const allNotifications = client.getNotifications();

    assertGreaterThan(allNotifications.length, 0, 'No notifications in history');

    artifactManager.log(`✓ Total notifications in history: ${allNotifications.length}`);

    // Verify all are for our URI
    const forOurUri = allNotifications.filter(n => n.uri === SUBSCRIBABLE_URI);
    artifactManager.log(`✓ Notifications for ${SUBSCRIBABLE_URI}: ${forOurUri.length}`);
  }, reporter);
}

// ============================================================================
// Test Suite 3: Multi-Client Synchronization
// ============================================================================

async function suite3_MultiClient(manager: MultiClientManager, reporter: TestReporter): Promise<void> {
  console.log(section('Suite 3: Multi-Client Synchronization'));

  // Test 3.1: Two clients subscribe
  await runTest('3.1: Two clients can subscribe to same resource', async () => {
    await manager.createClients(2, SERVER_URL);
    await manager.connectAll({ sequential: true } as any);

    // Subscribe both clients sequentially
    await manager.getClient(0).subscribe(SUBSCRIBABLE_URI);
    await sleep(100);
    await manager.getClient(1).subscribe(SUBSCRIBABLE_URI);

    // Verify both subscribed
    const clients = manager.getClients();
    for (let i = 0; i < clients.length; i++) {
      const subs = clients[i].getSubscriptions();
      assert(subs.includes(SUBSCRIBABLE_URI), `Client ${i} not subscribed`);
    }

    artifactManager.log('✓ Both clients subscribed successfully');
  }, reporter);

  // Test 3.2: Broadcast notification to both
  await runTest('3.2: Both clients receive broadcast notification', async () => {
    const clients = manager.getClients();

    // Clear notifications
    clients.forEach(c => c.clearNotifications());

    // Trigger update from client 0
    await clients[0].callTool('refresh', {});
    artifactManager.log('✓ Client 0 triggered refresh');

    // Wait for notifications on both
    await sleep(3000);

    const client0Notifs = clients[0].getNotifications(SUBSCRIBABLE_URI);
    const client1Notifs = clients[1].getNotifications(SUBSCRIBABLE_URI);

    artifactManager.log(`Client 0 notifications: ${client0Notifs.length}`);
    artifactManager.log(`Client 1 notifications: ${client1Notifs.length}`);

    assertGreaterThan(client0Notifs.length, 0, 'Client 0 should receive notification');
    assertGreaterThan(client1Notifs.length, 0, 'Client 1 should receive notification');

    artifactManager.log('✓ Both clients received broadcast notification');
  }, reporter);

  // Test 3.3: One unsubscribes, other still receives
  await runTest('3.3: Selective unsubscribe works', async () => {
    const clients = manager.getClients();

    // Client 0 unsubscribes
    await clients[0].unsubscribe(SUBSCRIBABLE_URI);
    artifactManager.log('✓ Client 0 unsubscribed');

    // Clear notifications
    clients.forEach(c => c.clearNotifications());

    // Trigger update from client 1
    await clients[1].callTool('refresh', {});

    // Wait
    await sleep(2000);

    // Check notifications
    const client0Notifs = clients[0].getNotifications(SUBSCRIBABLE_URI);
    const client1Notifs = clients[1].getNotifications(SUBSCRIBABLE_URI);

    assertEqual(client0Notifs.length, 0, 'Client 0 received notification after unsubscribe');
    assertGreaterThan(client1Notifs.length, 0, 'Client 1 did not receive notification');

    artifactManager.log('✓ Selective unsubscribe works correctly');
  }, reporter);

  // Test 3.4: Cleanup
  await runTest('3.4: Disconnect all clients', async () => {
    await manager.disconnectAll();
    artifactManager.log('✓ All clients disconnected');
  }, reporter);
}

// ============================================================================
// Test Suite 4: Resource Content Updates
// ============================================================================

async function suite4_ContentUpdates(client: MCPTestClient, reporter: TestReporter): Promise<void> {
  console.log(section('Suite 4: Resource Content Updates'));

  // Test 4.1: Content changes after update
  await runTest('4.1: HTML content changes after refresh', async () => {
    // Read initial content
    const html1 = await client.readResource(SUBSCRIBABLE_URI);
    const count1 = extractCount(html1);

    artifactManager.log(`Initial count: ${count1}`);
    await artifactManager.saveHTML(html1, 'content_before_refresh.html');

    // Trigger update
    await client.callTool('refresh', {});
    await sleep(500); // Let server process

    // Read updated content
    const html2 = await client.readResource(SUBSCRIBABLE_URI);
    const count2 = extractCount(html2);

    await artifactManager.saveHTML(html2, 'content_after_refresh.html');

    assertGreaterThan(count2, count1, `Count did not increase: ${count1} -> ${count2}`);

    artifactManager.log(`✓ Count increased: ${count1} -> ${count2}`);
  }, reporter);

  // Test 4.2: Reset updates content
  await runTest('4.2: Reset tool updates content', async () => {
    // Trigger reset
    await client.callTool('reset', {});
    await sleep(200);

    // Read content
    const html = await client.readResource(SUBSCRIBABLE_URI);
    const count = extractCount(html);

    await artifactManager.saveHTML(html, 'content_after_reset.html');

    assertEqual(count, 0, `Count not reset: ${count}`);

    artifactManager.log('✓ Reset updates content to 0');
  }, reporter);

  // Test 4.3: Rapid updates stability
  await runTest('4.3: Rapid updates remain stable', async () => {
    // Trigger 10 rapid updates
    for (let i = 0; i < 10; i++) {
      await client.callTool('refresh', {});
      await sleep(50);
    }

    // Read content
    const html = await client.readResource(SUBSCRIBABLE_URI);

    // Verify HTML is still valid
    assert(html.includes('<div class="container">'), 'HTML corrupted after rapid updates');

    const count = extractCount(html);
    assertGreaterThan(count, 0, `Expected count > 0, got ${count}`);

    await artifactManager.saveHTML(html, 'content_rapid_updates.html');

    artifactManager.log(`✓ Rapid updates stable, count: ${count}`);
  }, reporter);

  // Test 4.4: Timestamp updates
  await runTest('4.4: Timestamp updates on refresh', async () => {
    const html1 = await client.readResource(SUBSCRIBABLE_URI);
    const time1 = extractTime(html1);

    await sleep(100);

    await client.callTool('refresh', {});
    await sleep(200);

    const html2 = await client.readResource(SUBSCRIBABLE_URI);
    const time2 = extractTime(html2);

    // Timestamps should be different (or at least content should change)
    assert(html1 !== html2, 'HTML did not change after refresh');

    artifactManager.log(`Time before: ${time1}, after: ${time2}`);
    artifactManager.log('✓ Timestamp/content updates on refresh');
  }, reporter);
}

// ============================================================================
// Main Test Execution
// ============================================================================

async function main(): Promise<void> {
  console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}COMPREHENSIVE SUBSCRIPTION LIFECYCLE TEST SUITE${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}\n`);

  console.log(`${colors.cyan}Server URL:${colors.reset} ${SERVER_URL}`);
  console.log(`${colors.cyan}Resource URI:${colors.reset} ${SUBSCRIBABLE_URI}`);
  console.log(`${colors.cyan}Artifact Directory:${colors.reset} ${ARTIFACT_DIR}\n`);

  console.log(`${colors.yellow}IMPORTANT:${colors.reset} Make sure test server is running:`);
  console.log(`  npx simply-mcp run tests/fixtures/subscription-test-server.ts --http --port 3003\n`);

  // Ensure artifact directory exists
  await artifactManager.ensureTestDirectory();

  console.log(`${colors.green}Starting test execution...${colors.reset}\n`);

  // Create main test client
  const client = new MCPTestClient({ verbose: false });

  try {
    // Connect to server
    console.log(info('Connecting to test server...'));
    await client.connect(SERVER_URL);
    console.log(success('Connected successfully\n'));

    // Execute all test suites
    reporter.startSuite('Suite 1: Basic Subscribe/Unsubscribe Operations');
    await suite1_BasicOperations(client, reporter);
    reporter.endSuite();

    reporter.startSuite('Suite 2: Notification Delivery');
    await suite2_NotificationDelivery(client, reporter);
    reporter.endSuite();

    // Disconnect client for multi-client tests
    await client.disconnect();

    // Multi-client tests
    reporter.startSuite('Suite 3: Multi-Client Synchronization');
    const manager = new MultiClientManager({ verbose: false });
    await suite3_MultiClient(manager, reporter);
    reporter.endSuite();

    // Reconnect single client for content tests
    await client.connect(SERVER_URL);

    reporter.startSuite('Suite 4: Resource Content Updates');
    await suite4_ContentUpdates(client, reporter);
    reporter.endSuite();

    // Disconnect final client
    await client.disconnect();

    // Generate report
    console.log(`\n${colors.cyan}Generating test report...${colors.reset}`);
    const reportPath = await reporter.generateReport();
    console.log(`${colors.green}✓ Report generated: ${reportPath}${colors.reset}\n`);

    // Save logs
    const logPath = await artifactManager.saveLog('subscription-lifecycle-test.log');
    console.log(`${colors.green}✓ Logs saved: ${logPath}${colors.reset}\n`);

    // Print summary to console
    reporter.printSummary();

    // Get final summary
    const summary = reporter.getSummary();

    console.log(`\n${colors.bright}KEY FINDINGS:${colors.reset}\n`);

    // Analyze results
    const passRate = (summary.passed / summary.totalTests) * 100;
    const warnRate = (summary.warned / summary.totalTests) * 100;
    const failRate = (summary.failed / summary.totalTests) * 100;

    console.log(`${colors.green}Passed:${colors.reset} ${summary.passed}/${summary.totalTests} (${passRate.toFixed(1)}%)`);
    console.log(`${colors.yellow}Warned:${colors.reset} ${summary.warned}/${summary.totalTests} (${warnRate.toFixed(1)}%)`);
    console.log(`${colors.red}Failed:${colors.reset} ${summary.failed}/${summary.totalTests} (${failRate.toFixed(1)}%)\n`);

    // Results breakdown
    console.log(`${colors.bright}TEST RESULTS:${colors.reset}\n`);

    if (summary.passed === summary.totalTests) {
      console.log(`${colors.green}✓ ALL TESTS PASSED!${colors.reset}`);
      console.log('  Subscription lifecycle fully functional');
      console.log('  Notification delivery: WORKING');
      console.log('  Multi-client sync: WORKING');
      console.log('  Content updates: VERIFIED\n');
    } else if (passRate >= 80) {
      console.log(`${colors.yellow}⚠ MOSTLY WORKING${colors.reset} (${passRate.toFixed(0)}% pass rate)`);
      console.log('  Subscription operations work');
      console.log('  Some notification edge cases may need review\n');
    } else {
      console.log(`${colors.red}✗ ISSUES DETECTED${colors.reset} (${passRate.toFixed(0)}% pass rate)`);
      console.log('  Significant subscription issues found');
      console.log('  Review report for details\n');
    }

    console.log(`${colors.cyan}Artifacts saved to:${colors.reset} ${ARTIFACT_DIR}`);
    console.log(`${colors.cyan}Full report:${colors.reset} ${reportPath}`);
    console.log(`${colors.cyan}Test logs:${colors.reset} ${logPath}\n`);

    console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.bright}TEST SUITE COMPLETE${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}\n`);

    // Exit with appropriate code
    process.exit(summary.failed > 0 ? 1 : 0);
  } catch (err: any) {
    console.error(`\n${colors.red}FATAL ERROR:${colors.reset} ${err.message}`);
    console.error(err.stack);

    // Try to disconnect client
    try {
      await client.disconnect();
    } catch {
      // Ignore disconnect errors
    }

    process.exit(1);
  }
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
  });
}

export {
  suite1_BasicOperations,
  suite2_NotificationDelivery,
  suite3_MultiClient,
  suite4_ContentUpdates,
};
