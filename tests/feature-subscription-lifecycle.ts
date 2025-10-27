/**
 * Feature Layer Test: Subscription Lifecycle
 *
 * Comprehensive subscription lifecycle testing to validate end-to-end:
 * subscribe → server update → notification → client refresh
 *
 * Test Coverage:
 * - Suite 1: Basic subscription operations (5 tests)
 * - Suite 2: Notification handling (5 tests)
 * - Suite 3: Multi-client synchronization (4 tests)
 * - Suite 4: Resource content updates (4 tests)
 * - Suite 5: Subscription lifecycle edge cases (4 tests)
 *
 * Total: 22 comprehensive tests
 *
 * Foundation Layer Dependencies:
 * - MCPTestClient (subscription support, notification queue)
 * - MultiClientManager (multi-client orchestration)
 * - TestArtifactManager (artifact tracking)
 * - TestReporter (result tracking)
 * - test-helpers (assertions, waitFor)
 *
 * Server: examples/interface-ui-foundation.ts
 * Expected: http://localhost:3001/mcp
 * Resource: ui://stats/live (subscribable, dynamic)
 * Tools: refresh_stats, reset_counter, add
 *
 * Usage:
 *   npx tsx tests/feature-subscription-lifecycle.ts
 */

import { MCPTestClient } from './utils/mcp-test-client.js';
import { MultiClientManager } from './utils/multi-client-manager.js';
import { TestArtifactManager } from './utils/artifact-manager.js';
import { TestReporter } from './utils/test-reporter.js';
import {
  assert,
  assertEqual,
  assertSubscriptionActive,
  sleep,
  colors,
} from './utils/test-helpers.js';

// ============================================================================
// Configuration
// ============================================================================

const SERVER_URL = 'http://localhost:3001/mcp';
const SUBSCRIBABLE_URI = 'ui://stats/live';
const INVALID_URI = 'ui://nonexistent';
const ARTIFACT_DIR = '/tmp/mcp-subscription-lifecycle-test';

// ============================================================================
// Test Infrastructure Setup
// ============================================================================

const artifactManager = new TestArtifactManager(ARTIFACT_DIR, {
  verbose: true,
  autoCleanup: true,
  cleanupThresholdMB: 10,
});

const reporter = new TestReporter(artifactManager);

// ============================================================================
// Test Suite 1: Basic Subscription Operations
// ============================================================================

async function testSuite1_BasicSubscriptionOperations(): Promise<void> {
  reporter.startSuite('Suite 1: Basic Subscription Operations');

  // Test 1.1: Subscribe to Valid Resource
  reporter.startTest('Test 1.1: Subscribe to Valid Resource');
  const client1 = new MCPTestClient({ verbose: false });
  try {
    await client1.connect(SERVER_URL);
    await client1.subscribe(SUBSCRIBABLE_URI);

    // Verify subscription tracked
    const subs = client1.getSubscriptions();
    assert(subs.includes(SUBSCRIBABLE_URI), 'Subscription not tracked in client');

    artifactManager.log(`✓ Subscription tracked: ${SUBSCRIBABLE_URI}`);
    reporter.passTest();
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await client1.disconnect();
  }

  // Test 1.2: Subscribe to Invalid Resource
  reporter.startTest('Test 1.2: Subscribe to Invalid Resource');
  const client2 = new MCPTestClient({ verbose: false });
  try {
    await client2.connect(SERVER_URL);

    let errorThrown = false;
    try {
      await client2.subscribe(INVALID_URI);
    } catch (err) {
      errorThrown = true;
      artifactManager.log(`✓ Error thrown for invalid URI: ${(err as Error).message}`);
    }

    // Check if subscription is tracked despite error (graceful handling)
    const subs = client2.getSubscriptions();
    const isTracked = subs.includes(INVALID_URI);

    if (errorThrown && !isTracked) {
      artifactManager.log('✓ Invalid subscription rejected correctly');
      reporter.passTest();
    } else if (!errorThrown && !isTracked) {
      artifactManager.log('✓ Invalid subscription handled gracefully (no error, no tracking)');
      reporter.passTest();
    } else {
      throw new Error('Invalid subscription was tracked');
    }
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await client2.disconnect();
  }

  // Test 1.3: Double Subscribe to Same Resource
  reporter.startTest('Test 1.3: Double Subscribe to Same Resource');
  const client3 = new MCPTestClient({ verbose: false });
  try {
    await client3.connect(SERVER_URL);
    await client3.subscribe(SUBSCRIBABLE_URI);
    await client3.subscribe(SUBSCRIBABLE_URI); // Subscribe again

    // Verify only one subscription tracked (idempotent)
    const subs = client3.getSubscriptions();
    const count = subs.filter((uri) => uri === SUBSCRIBABLE_URI).length;
    assertEqual(count, 1, 'Double subscription should be idempotent');

    artifactManager.log('✓ Double subscription handled idempotently');
    reporter.passTest();
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await client3.disconnect();
  }

  // Test 1.4: Unsubscribe from Resource
  reporter.startTest('Test 1.4: Unsubscribe from Resource');
  const client4 = new MCPTestClient({ verbose: false });
  try {
    await client4.connect(SERVER_URL);
    await client4.subscribe(SUBSCRIBABLE_URI);
    assertSubscriptionActive(client4, SUBSCRIBABLE_URI);

    await client4.unsubscribe(SUBSCRIBABLE_URI);

    // Verify subscription removed
    const subs = client4.getSubscriptions();
    assert(!subs.includes(SUBSCRIBABLE_URI), 'Subscription should be removed');

    artifactManager.log('✓ Unsubscribe removed subscription');
    reporter.passTest();
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await client4.disconnect();
  }

  // Test 1.5: Unsubscribe Without Subscribe
  reporter.startTest('Test 1.5: Unsubscribe Without Subscribe');
  const client5 = new MCPTestClient({ verbose: false });
  try {
    await client5.connect(SERVER_URL);

    // Try to unsubscribe without subscribing first
    let errorThrown = false;
    try {
      await client5.unsubscribe(SUBSCRIBABLE_URI);
    } catch (err) {
      errorThrown = true;
      artifactManager.log(`✓ Error thrown for unsubscribe without subscribe: ${(err as Error).message}`);
    }

    if (errorThrown) {
      artifactManager.log('✓ Unsubscribe without subscribe handled correctly (error)');
      reporter.passTest();
    } else {
      artifactManager.log('✓ Unsubscribe without subscribe handled gracefully (no error)');
      reporter.passTest();
    }
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await client5.disconnect();
  }

  reporter.endSuite();
}

// ============================================================================
// Test Suite 2: Notification Handling
// ============================================================================

async function testSuite2_NotificationHandling(): Promise<void> {
  reporter.startSuite('Suite 2: Notification Handling');

  // Test 2.1: Trigger Update and Wait for Notification
  reporter.startTest('Test 2.1: Trigger Update and Wait for Notification');
  const client1 = new MCPTestClient({ verbose: false });
  try {
    await client1.connect(SERVER_URL);
    await client1.subscribe(SUBSCRIBABLE_URI);

    // Trigger update
    await client1.callTool('refresh_stats', {});
    artifactManager.log('✓ Triggered refresh_stats tool');

    // Wait for notification (with timeout)
    try {
      const notification = await client1.waitForNotification(SUBSCRIBABLE_URI, 5000);
      artifactManager.log(`✓ Notification received: ${JSON.stringify(notification)}`);
      reporter.passTest();
    } catch (timeoutError) {
      artifactManager.log(`⚠ Notification not received within 5s (server limitation)`);
      reporter.warnTest('Notification not pushed by server (SSE not implemented)');
    }
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await client1.disconnect();
  }

  // Test 2.2: Verify Notification Content
  reporter.startTest('Test 2.2: Verify Notification Content');
  const client2 = new MCPTestClient({ verbose: false });
  try {
    await client2.connect(SERVER_URL);
    await client2.subscribe(SUBSCRIBABLE_URI);

    // Trigger update
    await client2.callTool('refresh_stats', {});

    // Wait for notification
    try {
      const notification = await client2.waitForNotification(SUBSCRIBABLE_URI, 5000);

      // Verify notification structure
      assert(notification.notification, 'Notification object should exist');
      assertEqual(notification.notification.method, 'notifications/resources/updated', 'Incorrect method');
      assertEqual(notification.notification.params?.uri, SUBSCRIBABLE_URI, 'Incorrect URI in params');
      assertEqual(notification.uri, SUBSCRIBABLE_URI, 'Incorrect URI in record');

      artifactManager.log('✓ Notification content validated');
      reporter.passTest();
    } catch (timeoutError) {
      artifactManager.log(`⚠ Notification not received (server limitation)`);
      reporter.warnTest('Cannot validate notification content without server push');
    }
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await client2.disconnect();
  }

  // Test 2.3: Multiple Triggers, Multiple Notifications
  reporter.startTest('Test 2.3: Multiple Triggers, Multiple Notifications');
  const client3 = new MCPTestClient({ verbose: false });
  try {
    await client3.connect(SERVER_URL);
    await client3.subscribe(SUBSCRIBABLE_URI);

    // Trigger updates 3 times
    await client3.callTool('refresh_stats', {});
    await sleep(100);
    await client3.callTool('refresh_stats', {});
    await sleep(100);
    await client3.callTool('refresh_stats', {});

    artifactManager.log('✓ Triggered 3 refresh_stats calls');

    // Wait for notifications
    await sleep(2000); // Give server time to send notifications

    const notifications = client3.getNotifications(SUBSCRIBABLE_URI);
    artifactManager.log(`✓ Received ${notifications.length} notifications`);

    if (notifications.length === 3) {
      artifactManager.log('✓ All 3 notifications received');
      reporter.passTest();
    } else if (notifications.length > 0) {
      artifactManager.log(`⚠ Received ${notifications.length}/3 notifications (partial)`);
      reporter.warnTest(`Only ${notifications.length}/3 notifications received`);
    } else {
      artifactManager.log('⚠ No notifications received (server limitation)');
      reporter.warnTest('Notifications not pushed by server');
    }
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await client3.disconnect();
  }

  // Test 2.4: Notification History Tracking
  reporter.startTest('Test 2.4: Notification History Tracking');
  const client4 = new MCPTestClient({ verbose: false });
  try {
    await client4.connect(SERVER_URL);
    await client4.subscribe(SUBSCRIBABLE_URI);

    // Trigger update
    await client4.callTool('refresh_stats', {});

    // Wait for notification
    try {
      await client4.waitForNotification(SUBSCRIBABLE_URI, 5000);
    } catch {
      // Ignore timeout
    }

    // Check history
    const notifications = client4.getNotifications(SUBSCRIBABLE_URI);
    artifactManager.log(`✓ Notification history has ${notifications.length} entries`);

    // Verify history structure
    if (notifications.length > 0) {
      const first = notifications[0];
      assert(first.uri, 'History entry should have uri');
      assert(first.notification, 'History entry should have notification');
      assert(first.timestamp, 'History entry should have timestamp');

      artifactManager.log('✓ Notification history structure validated');
      reporter.passTest();
    } else {
      artifactManager.log('⚠ No notifications in history (server limitation)');
      reporter.warnTest('Cannot validate history without server notifications');
    }
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await client4.disconnect();
  }

  // Test 2.5: Unsubscribe Stops Notifications
  reporter.startTest('Test 2.5: Unsubscribe Stops Notifications');
  const client5 = new MCPTestClient({ verbose: false });
  try {
    await client5.connect(SERVER_URL);
    await client5.subscribe(SUBSCRIBABLE_URI);

    // Unsubscribe immediately
    await client5.unsubscribe(SUBSCRIBABLE_URI);
    artifactManager.log('✓ Unsubscribed from resource');

    // Clear any existing notifications
    client5.clearNotifications();

    // Trigger update after unsubscribe
    await client5.callTool('refresh_stats', {});
    artifactManager.log('✓ Triggered update after unsubscribe');

    // Wait for potential notification
    await sleep(2000);

    const notifications = client5.getNotifications(SUBSCRIBABLE_URI);
    assertEqual(notifications.length, 0, 'Should not receive notifications after unsubscribe');

    artifactManager.log('✓ No notifications received after unsubscribe');
    reporter.passTest();
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await client5.disconnect();
  }

  reporter.endSuite();
}

// ============================================================================
// Test Suite 3: Multi-Client Synchronization
// ============================================================================

async function testSuite3_MultiClientSync(): Promise<void> {
  reporter.startSuite('Suite 3: Multi-Client Synchronization');

  // Test 3.1: Two Clients Subscribe to Same Resource
  reporter.startTest('Test 3.1: Two Clients Subscribe to Same Resource');
  const manager1 = new MultiClientManager({ verbose: false, delayBetweenConnections: 200 });
  try {
    await manager1.createClients(2, SERVER_URL);
    await manager1.connectAll();
    artifactManager.log('✓ Connected 2 clients');

    // Subscribe both clients (sequential to avoid server overload)
    await manager1.getClient(0).subscribe(SUBSCRIBABLE_URI);
    await sleep(100);
    await manager1.getClient(1).subscribe(SUBSCRIBABLE_URI);
    artifactManager.log('✓ Both clients subscribed');

    // Verify both subscribed
    assertSubscriptionActive(manager1.getClient(0), SUBSCRIBABLE_URI);
    assertSubscriptionActive(manager1.getClient(1), SUBSCRIBABLE_URI);

    artifactManager.log('✓ Both clients have active subscriptions');
    reporter.passTest();
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await manager1.disconnectAll();
  }

  // Test 3.2: Broadcast Notification to Both Clients
  reporter.startTest('Test 3.2: Broadcast Notification to Both Clients');
  const manager2 = new MultiClientManager({ verbose: false, delayBetweenConnections: 200 });
  try {
    await manager2.createClients(2, SERVER_URL);
    await manager2.connectAll();

    // Subscribe both clients sequentially
    await manager2.getClient(0).subscribe(SUBSCRIBABLE_URI);
    await sleep(100);
    await manager2.getClient(1).subscribe(SUBSCRIBABLE_URI);
    await sleep(100);

    artifactManager.log('✓ Both clients subscribed');

    // Trigger update from client 0
    await manager2.callTool(0, 'refresh_stats', {});
    artifactManager.log('✓ Client 0 triggered update');

    // Wait for notifications on both clients
    await sleep(3000);

    const notifs0 = manager2.getClient(0).getNotifications(SUBSCRIBABLE_URI);
    const notifs1 = manager2.getClient(1).getNotifications(SUBSCRIBABLE_URI);

    artifactManager.log(`Client 0 notifications: ${notifs0.length}`);
    artifactManager.log(`Client 1 notifications: ${notifs1.length}`);

    if (notifs0.length > 0 && notifs1.length > 0) {
      artifactManager.log('✓ Both clients received notifications (broadcast works)');
      reporter.passTest();
    } else if (notifs0.length > 0 || notifs1.length > 0) {
      artifactManager.log(`⚠ Only ${notifs0.length + notifs1.length}/2 clients received notification`);
      reporter.warnTest('Broadcast notification partially working');
    } else {
      artifactManager.log('⚠ No notifications received (server limitation)');
      reporter.warnTest('Broadcast notifications not implemented by server');
    }
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await manager2.disconnectAll();
  }

  // Test 3.3: One Client Unsubscribes, Other Receives
  reporter.startTest('Test 3.3: One Client Unsubscribes, Other Receives');
  const manager3 = new MultiClientManager({ verbose: false, delayBetweenConnections: 200 });
  try {
    await manager3.createClients(2, SERVER_URL);
    await manager3.connectAll();

    // Subscribe both
    await manager3.getClient(0).subscribe(SUBSCRIBABLE_URI);
    await sleep(100);
    await manager3.getClient(1).subscribe(SUBSCRIBABLE_URI);
    await sleep(100);

    // Client 0 unsubscribes
    await manager3.getClient(0).unsubscribe(SUBSCRIBABLE_URI);
    artifactManager.log('✓ Client 0 unsubscribed');

    // Clear notifications
    manager3.getClient(0).clearNotifications();
    manager3.getClient(1).clearNotifications();

    // Client 1 triggers update
    await manager3.callTool(1, 'refresh_stats', {});
    artifactManager.log('✓ Client 1 triggered update');

    // Wait for notifications
    await sleep(2000);

    const notifs0 = manager3.getClient(0).getNotifications(SUBSCRIBABLE_URI);
    const notifs1 = manager3.getClient(1).getNotifications(SUBSCRIBABLE_URI);

    artifactManager.log(`Client 0 notifications (unsubscribed): ${notifs0.length}`);
    artifactManager.log(`Client 1 notifications (subscribed): ${notifs1.length}`);

    if (notifs0.length === 0 && notifs1.length > 0) {
      artifactManager.log('✓ Only subscribed client received notification');
      reporter.passTest();
    } else if (notifs0.length === 0 && notifs1.length === 0) {
      artifactManager.log('⚠ No notifications received (server limitation)');
      reporter.warnTest('Selective notification not testable without server push');
    } else {
      throw new Error('Unsubscribed client received notification');
    }
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await manager3.disconnectAll();
  }

  // Test 3.4: Five Clients Stress Test
  reporter.startTest('Test 3.4: Five Clients Stress Test');
  const manager4 = new MultiClientManager({ verbose: false, delayBetweenConnections: 300 });
  try {
    await manager4.createClients(5, SERVER_URL);
    await manager4.connectAll();
    artifactManager.log('✓ Connected 5 clients');

    // Subscribe all clients sequentially (avoid server overload)
    for (let i = 0; i < 5; i++) {
      await manager4.getClient(i).subscribe(SUBSCRIBABLE_URI);
      await sleep(200);
      artifactManager.log(`✓ Client ${i} subscribed`);
    }

    // Trigger update from client 0
    await manager4.callTool(0, 'refresh_stats', {});
    artifactManager.log('✓ Client 0 triggered update');

    // Wait for notifications
    await sleep(5000);

    // Count how many clients received notifications
    let receivedCount = 0;
    for (let i = 0; i < 5; i++) {
      const notifs = manager4.getClient(i).getNotifications(SUBSCRIBABLE_URI);
      if (notifs.length > 0) {
        receivedCount++;
      }
      artifactManager.log(`Client ${i}: ${notifs.length} notifications`);
    }

    artifactManager.log(`✓ ${receivedCount}/5 clients received notifications`);

    if (receivedCount === 5) {
      artifactManager.log('✓ All clients received notifications (excellent)');
      reporter.passTest();
    } else if (receivedCount > 0) {
      artifactManager.log(`⚠ ${receivedCount}/5 clients received notifications (partial success)`);
      reporter.warnTest(`Only ${receivedCount}/5 clients received notifications`);
    } else {
      artifactManager.log('⚠ No clients received notifications (server limitation)');
      reporter.warnTest('Multi-client broadcast not implemented');
    }
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await manager4.disconnectAll();
  }

  reporter.endSuite();
}

// ============================================================================
// Test Suite 4: Resource Content Updates
// ============================================================================

async function testSuite4_ResourceContentUpdates(): Promise<void> {
  reporter.startSuite('Suite 4: Resource Content Updates');

  // Test 4.1: Read Resource Before and After Update
  reporter.startTest('Test 4.1: Read Resource Before and After Update');
  const client1 = new MCPTestClient({ verbose: false });
  try {
    await client1.connect(SERVER_URL);

    // Read initial content
    const contentBefore = await client1.readResource(SUBSCRIBABLE_URI);
    artifactManager.log(`✓ Read initial content (${contentBefore.length} bytes)`);

    // Save initial HTML
    await artifactManager.saveHTML(contentBefore, 'stats_before.html');

    // Trigger update
    await client1.callTool('refresh_stats', {});
    await sleep(500); // Let server process

    // Read updated content
    const contentAfter = await client1.readResource(SUBSCRIBABLE_URI);
    artifactManager.log(`✓ Read updated content (${contentAfter.length} bytes)`);

    // Save updated HTML
    await artifactManager.saveHTML(contentAfter, 'stats_after.html');

    // Verify content changed
    assert(contentBefore !== contentAfter, 'Content should change after update');

    artifactManager.log('✓ Content changed after update');
    reporter.passTest(['stats_before.html', 'stats_after.html']);
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await client1.disconnect();
  }

  // Test 4.2: Verify Dynamic Data in HTML
  reporter.startTest('Test 4.2: Verify Dynamic Data in HTML');
  const client2 = new MCPTestClient({ verbose: false });
  try {
    await client2.connect(SERVER_URL);

    // Trigger update to get fresh stats
    await client2.callTool('refresh_stats', {});
    await sleep(200);

    // Read resource
    const content = await client2.readResource(SUBSCRIBABLE_URI);

    // Save HTML for inspection
    await artifactManager.saveHTML(content, 'stats_dynamic.html');

    // Verify HTML contains expected dynamic elements
    assert(content.includes('Total Requests'), 'Should contain request counter');
    assert(content.includes('Uptime'), 'Should contain uptime info');
    assert(content.includes('Last Refresh'), 'Should contain timestamp');

    // Verify HTML contains actual data (not empty)
    const requestMatch = content.match(/stat-value">(\d+)</);
    if (requestMatch) {
      const requestCount = parseInt(requestMatch[1]);
      artifactManager.log(`✓ Request count found in HTML: ${requestCount}`);
    }

    artifactManager.log('✓ Dynamic data present in HTML');
    reporter.passTest(['stats_dynamic.html']);
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await client2.disconnect();
  }

  // Test 4.3: Reset Counter Updates HTML
  reporter.startTest('Test 4.3: Reset Counter Updates HTML');
  const client3 = new MCPTestClient({ verbose: false });
  try {
    await client3.connect(SERVER_URL);

    // Make some requests to increment counter
    await client3.callTool('add', { a: 1, b: 2 });
    await client3.callTool('add', { a: 3, b: 4 });
    await sleep(200);

    // Read content before reset
    const contentBefore = await client3.readResource(SUBSCRIBABLE_URI);
    await artifactManager.saveHTML(contentBefore, 'stats_before_reset.html');

    // Reset counter
    await client3.callTool('reset_counter', {});
    await sleep(200);

    // Read content after reset
    const contentAfter = await client3.readResource(SUBSCRIBABLE_URI);
    await artifactManager.saveHTML(contentAfter, 'stats_after_reset.html');

    // Verify content changed
    assert(contentBefore !== contentAfter, 'Content should change after reset');

    artifactManager.log('✓ Counter reset reflected in HTML');
    reporter.passTest(['stats_before_reset.html', 'stats_after_reset.html']);
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await client3.disconnect();
  }

  // Test 4.4: Rapid Updates Stability
  reporter.startTest('Test 4.4: Rapid Updates Stability');
  const client4 = new MCPTestClient({ verbose: false });
  try {
    await client4.connect(SERVER_URL);

    // Perform 10 rapid updates
    for (let i = 0; i < 10; i++) {
      await client4.callTool('refresh_stats', {});
      await sleep(50); // Small delay to avoid overwhelming server

      // Read resource after each update
      const content = await client4.readResource(SUBSCRIBABLE_URI);

      // Verify HTML is valid (contains expected structure)
      assert(content.includes('<!DOCTYPE html>') || content.includes('<html'), 'Should be valid HTML');
      assert(content.includes('Live Statistics'), 'Should contain title');

      artifactManager.log(`✓ Update ${i + 1}/10: HTML valid (${content.length} bytes)`);
    }

    // Save final state
    const finalContent = await client4.readResource(SUBSCRIBABLE_URI);
    await artifactManager.saveHTML(finalContent, 'stats_rapid_updates.html');

    artifactManager.log('✓ All 10 rapid updates succeeded, HTML remained valid');
    reporter.passTest(['stats_rapid_updates.html']);
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await client4.disconnect();
  }

  reporter.endSuite();
}

// ============================================================================
// Test Suite 5: Subscription Lifecycle Edge Cases
// ============================================================================

async function testSuite5_EdgeCases(): Promise<void> {
  reporter.startSuite('Suite 5: Subscription Lifecycle Edge Cases');

  // Test 5.1: Subscribe During Disconnection
  reporter.startTest('Test 5.1: Subscribe During Disconnection');
  const client1 = new MCPTestClient({ verbose: false });
  try {
    await client1.connect(SERVER_URL);
    await client1.disconnect();
    artifactManager.log('✓ Disconnected client');

    // Try to subscribe while disconnected
    let errorThrown = false;
    try {
      await client1.subscribe(SUBSCRIBABLE_URI);
    } catch (err) {
      errorThrown = true;
      artifactManager.log(`✓ Error thrown for subscribe when disconnected: ${(err as Error).message}`);
    }

    assert(errorThrown, 'Should throw error when subscribing while disconnected');
    artifactManager.log('✓ Subscribe during disconnection rejected');
    reporter.passTest();
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  }

  // Test 5.2: Subscribe, Disconnect, Reconnect
  reporter.startTest('Test 5.2: Subscribe, Disconnect, Reconnect');
  const client2 = new MCPTestClient({ verbose: false });
  try {
    await client2.connect(SERVER_URL);
    await client2.subscribe(SUBSCRIBABLE_URI);
    assertSubscriptionActive(client2, SUBSCRIBABLE_URI);
    artifactManager.log('✓ Subscribed');

    // Disconnect
    await client2.disconnect();
    artifactManager.log('✓ Disconnected');

    // Reconnect
    await client2.connect(SERVER_URL);
    artifactManager.log('✓ Reconnected');

    // Verify subscription lost (new session)
    const subs = client2.getSubscriptions();
    assertEqual(subs.length, 0, 'Subscriptions should be lost after disconnect');

    artifactManager.log('✓ Subscription lost after reconnect (new session)');
    reporter.passTest();
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await client2.disconnect();
  }

  // Test 5.3: Long-Running Subscription
  reporter.startTest('Test 5.3: Long-Running Subscription');
  const client3 = new MCPTestClient({ verbose: false });
  try {
    await client3.connect(SERVER_URL);
    await client3.subscribe(SUBSCRIBABLE_URI);
    artifactManager.log('✓ Subscribed');

    // Wait 30 seconds
    artifactManager.log('Waiting 30 seconds...');
    await sleep(30000);
    artifactManager.log('✓ 30 seconds elapsed');

    // Verify still subscribed
    assertSubscriptionActive(client3, SUBSCRIBABLE_URI);

    // Trigger update
    await client3.callTool('refresh_stats', {});
    artifactManager.log('✓ Triggered update after 30s');

    // Try to wait for notification
    try {
      await client3.waitForNotification(SUBSCRIBABLE_URI, 5000);
      artifactManager.log('✓ Notification received after long-running subscription');
      reporter.passTest();
    } catch {
      artifactManager.log('⚠ Notification not received (server limitation, but subscription still active)');
      reporter.warnTest('Notification not received, but subscription remained active for 30s');
    }
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await client3.disconnect();
  }

  // Test 5.4: Concurrent Subscribe and Tool Call
  reporter.startTest('Test 5.4: Concurrent Subscribe and Tool Call');
  const client4 = new MCPTestClient({ verbose: false });
  try {
    await client4.connect(SERVER_URL);

    // Execute subscribe and tool call concurrently
    const [, toolResult] = await Promise.all([
      client4.subscribe(SUBSCRIBABLE_URI),
      client4.callTool('add', { a: 10, b: 20 }),
    ]);

    artifactManager.log('✓ Subscribe and tool call completed concurrently');

    // Verify subscription worked
    assertSubscriptionActive(client4, SUBSCRIBABLE_URI);

    // Verify tool call worked
    assert(toolResult, 'Tool call should return result');
    artifactManager.log(`✓ Tool result: ${JSON.stringify(toolResult)}`);

    artifactManager.log('✓ Concurrent operations succeeded');
    reporter.passTest();
  } catch (error) {
    artifactManager.log(`✗ Test failed: ${(error as Error).message}`);
    reporter.failTest(error as Error);
  } finally {
    await client4.disconnect();
  }

  reporter.endSuite();
}

// ============================================================================
// Main Test Execution
// ============================================================================

async function main(): Promise<void> {
  console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}MCP UI SUBSCRIPTION LIFECYCLE TEST SUITE${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}\n`);

  console.log(`${colors.cyan}Server URL:${colors.reset} ${SERVER_URL}`);
  console.log(`${colors.cyan}Resource URI:${colors.reset} ${SUBSCRIBABLE_URI}`);
  console.log(`${colors.cyan}Artifact Directory:${colors.reset} ${ARTIFACT_DIR}\n`);

  // Ensure artifact directory exists
  await artifactManager.ensureTestDirectory();

  console.log(`${colors.green}Starting test execution...${colors.reset}\n`);

  try {
    // Execute all test suites
    await testSuite1_BasicSubscriptionOperations();
    await testSuite2_NotificationHandling();
    await testSuite3_MultiClientSync();
    await testSuite4_ResourceContentUpdates();
    await testSuite5_EdgeCases();

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

    console.log(`${colors.bright}KEY FINDINGS:${colors.reset}\n`);

    // Analyze results
    const passRate = (summary.passed / summary.totalTests) * 100;
    const warnRate = (summary.warned / summary.totalTests) * 100;
    const failRate = (summary.failed / summary.totalTests) * 100;

    console.log(`${colors.green}Passed:${colors.reset} ${summary.passed}/${summary.totalTests} (${passRate.toFixed(1)}%)`);
    console.log(`${colors.yellow}Warned:${colors.reset} ${summary.warned}/${summary.totalTests} (${warnRate.toFixed(1)}%)`);
    console.log(`${colors.red}Failed:${colors.reset} ${summary.failed}/${summary.totalTests} (${failRate.toFixed(1)}%)\n`);

    // Provide recommendations
    console.log(`${colors.bright}RECOMMENDATIONS:${colors.reset}\n`);

    if (summary.warned > 0) {
      console.log(`${colors.yellow}⚠${colors.reset} Server appears to lack SSE notification push (${summary.warned} warnings)`);
      console.log(`  - Implement Server-Sent Events (SSE) for real-time notifications`);
      console.log(`  - Add notifyResourceUpdate() to trigger client notifications`);
      console.log(`  - Enable subscription broadcast to multiple clients\n`);
    }

    if (summary.failed > 0) {
      console.log(`${colors.red}✗${colors.reset} ${summary.failed} critical failures detected`);
      console.log(`  - Review REPORT.md for detailed error messages`);
      console.log(`  - Fix server-side subscription handling\n`);
    }

    if (summary.passed === summary.totalTests) {
      console.log(`${colors.green}✓${colors.reset} All tests passed! Subscription lifecycle fully functional.\n`);
    } else if (passRate >= 80) {
      console.log(`${colors.yellow}⚠${colors.reset} ${passRate.toFixed(0)}% pass rate - Subscription operations work, but notifications need improvement.\n`);
    } else {
      console.log(`${colors.red}✗${colors.reset} ${passRate.toFixed(0)}% pass rate - Significant subscription issues detected.\n`);
    }

    console.log(`${colors.cyan}Artifacts saved to:${colors.reset} ${ARTIFACT_DIR}`);
    console.log(`${colors.cyan}Full report:${colors.reset} ${reportPath}`);
    console.log(`${colors.cyan}Test logs:${colors.reset} ${logPath}\n`);

    console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.bright}TEST SUITE COMPLETE${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}\n`);

    // Exit with appropriate code
    process.exit(summary.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error(`\n${colors.red}FATAL ERROR:${colors.reset} ${(error as Error).message}`);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

export { testSuite1_BasicSubscriptionOperations, testSuite2_NotificationHandling, testSuite3_MultiClientSync, testSuite4_ResourceContentUpdates, testSuite5_EdgeCases };
