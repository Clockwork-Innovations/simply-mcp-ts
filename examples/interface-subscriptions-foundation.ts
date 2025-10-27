/**
 * Foundation Layer: Subscriptions Example
 *
 * Demonstrates the basic subscribe/unsubscribe/notify flow for resource updates.
 *
 * This example shows:
 * 1. Defining a dynamic resource that can change
 * 2. Clients subscribing to resource updates
 * 3. Server notifying subscribers when resource changes
 * 4. Clients unsubscribing from updates
 *
 * To run this example:
 *   npx tsx examples/interface-subscriptions-foundation.ts
 *
 * Foundation Layer Features:
 * - Exact URI matching (no pattern matching)
 * - Basic subscription tracking
 * - Simple notify flow
 */

import type { IServer, IResource } from '../src/interface-types.js';

// ===== Server Definition =====

/**
 * Server info resource - static data
 */
interface ServerInfoResource extends IResource {
  uri: 'config://server';
  name: 'Server Configuration';
  description: 'Server metadata and settings';
  mimeType: 'application/json';
  dynamic: true;
  data: {
    version: string;
    uptime: number;
    requestCount: number;
  };
}

/**
 * Stats resource - dynamic data that changes over time
 */
interface StatsResource extends IResource {
  uri: 'stats://current';
  name: 'Current Statistics';
  description: 'Real-time server statistics';
  mimeType: 'application/json';
  dynamic: true;
  data: {
    activeConnections: number;
    lastUpdate: string;
  };
}

/**
 * Server interface
 */
interface SubscriptionDemoServer extends IServer {
  name: 'subscription-demo';
  version: '1.0.0';
  description: 'Foundation layer subscription demonstration';
}

/**
 * Server implementation with dynamic resources
 */
export default class SubscriptionDemo implements SubscriptionDemoServer {
  private requestCount = 0;
  private activeConnections = 0;
  private startTime = Date.now();

  /**
   * Server info resource - dynamic
   */
  'config://server': ServerInfoResource = async () => {
    return {
      version: '1.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      requestCount: this.requestCount,
    };
  };

  /**
   * Stats resource - dynamic
   */
  'stats://current': StatsResource = async () => {
    return {
      activeConnections: this.activeConnections,
      lastUpdate: new Date().toISOString(),
    };
  };

  /**
   * Simulate request counter increment
   */
  incrementRequests() {
    this.requestCount++;
  }

  /**
   * Simulate connection changes
   */
  updateConnections(count: number) {
    this.activeConnections = count;
  }
}

// ===== Demo Execution =====

async function runDemo() {
  // Import server loading utilities
  const { loadInterfaceServer } = await import('../src/index.js');
  const { fileURLToPath } = await import('url');

  console.log('=== Subscription Foundation Demo ===\n');

  // Load the server (silent mode to suppress internal logging)
  const server = await loadInterfaceServer({
    filePath: fileURLToPath(import.meta.url),
    silent: true,
  });

  console.log(`Server: ${server.name} v${server.version}`);
  console.log(`Description: ${server.description}\n`);

  // List available resources
  console.log('Available Resources:');
  const resources = server.listResources();
  resources.forEach((resource) => {
    console.log(`  - ${resource.uri}: ${resource.name}`);
  });
  console.log();

  // Simulate subscription flow
  console.log('=== Subscription Flow ===\n');

  // 1. Read initial resource state
  console.log('1. Reading initial stats...');
  let result = await server.readResource('stats://current');
  console.log('   Initial data:', JSON.stringify(result.contents[0].text, null, 2));
  console.log();

  // 2. Simulate client subscribing (this happens automatically via MCP protocol)
  console.log('2. Client subscribes to stats://current');
  console.log('   (In real MCP, client sends resources/subscribe request)');
  console.log();

  // 3. Simulate resource changes and notifications
  console.log('3. Simulating resource updates...');
  console.log('   NOTE: In this demo, the server is not started, so notifications');
  console.log('   are simulated but not actually sent to clients.');
  console.log('   In production, start the server with server.start() first.');
  console.log();

  // Get the implementation instance to modify state
  const serverImpl = (server as any).buildServer;

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Update the resource state (simulate connection change)
  console.log('   - Connection count changed to 5');
  // Note: In a real scenario, the server implementation would update its state
  // and then call notifyResourceUpdate

  // Notify subscribers (will show "server not initialized" since we haven't started)
  console.log('   - Calling notifyResourceUpdate()...');
  server.notifyResourceUpdate('stats://current');
  console.log('   - (Notification would be sent if server was started)');
  console.log();

  // 4. Client would re-read the resource after receiving notification
  console.log('4. Client re-reads resource after notification');
  result = await server.readResource('stats://current');
  console.log('   Updated data:', JSON.stringify(result.contents[0].text, null, 2));
  console.log();

  // 5. Simulate another update
  console.log('5. Another update...');
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('   - Connection count changed to 8');
  console.log('   - Calling notifyResourceUpdate()...');
  server.notifyResourceUpdate('stats://current');
  console.log();

  // 6. Simulate unsubscribe
  console.log('6. Client unsubscribes from stats://current');
  console.log('   (In real MCP, client sends resources/unsubscribe request)');
  console.log();

  // 7. Notification won't be sent after unsubscribe
  console.log('7. Update after unsubscribe (no notification sent)');
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('   - Connection count changed to 3');
  console.log('   - Calling notifyResourceUpdate()...');
  server.notifyResourceUpdate('stats://current');
  console.log('   - (No active subscribers after unsubscribe)');
  console.log();

  console.log('=== Demo Complete ===\n');
  console.log('Subscription Lifecycle:');
  console.log('  1. Client subscribes → resources/subscribe');
  console.log('  2. Resource changes → server updates state');
  console.log('  3. Server notifies → notifications/resources/updated');
  console.log('  4. Client re-reads → resources/read');
  console.log('  5. Client unsubscribes → resources/unsubscribe');
  console.log();
  console.log('Foundation Layer: Exact URI matching only');
  console.log('Future Layers: Pattern matching, filtering, etc.');

  // Stop the server
  await server.stop();
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}
