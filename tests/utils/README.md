# MCP Test Client Infrastructure

Custom MCP test client with full subscription support for testing simply-mcp UI features.

## Overview

This test infrastructure provides:

- **MCPTestClient**: Full-featured MCP client with subscription support
- **MultiClientManager**: Multi-client orchestration for parallel testing
- **Test Helpers**: Async utilities, assertions, and test formatting

## Files

### Core Components

- `mcp-test-client.ts` (531 lines) - Main MCP test client with subscription support
- `multi-client-manager.ts` (363 lines) - Multi-client orchestration
- `test-helpers.ts` (436 lines) - Utility functions for testing

### Tests

- `../foundation-smoke-test.ts` (372 lines) - Smoke test validating all functionality

## MCPTestClient

### Features

- ✅ Stateful HTTP transport with session management
- ✅ Resource operations (list, read, subscribe, unsubscribe)
- ✅ Tool execution with error handling
- ✅ SSE notification handling (when available)
- ✅ Notification queue for testing
- ✅ Connection lifecycle management
- ✅ Configurable timeouts and verbose logging

### Usage

```typescript
import { MCPTestClient } from './utils/mcp-test-client.js';

// Create client
const client = new MCPTestClient({
  timeout: 5000,    // Request timeout in ms
  verbose: false    // Debug logging
});

// Connect to server
await client.connect('http://localhost:3001/mcp');
console.log('Session ID:', client.getSessionId());

// List resources
const resources = await client.listResources();
console.log('Resources:', resources.map(r => r.uri));

// Read resource
const content = await client.readResource('ui://calculator/v1');
console.log('Content length:', content.length);

// Subscribe to updates
await client.subscribe('ui://stats/live');

// Call tool
const result = await client.callTool('add', { a: 5, b: 3 });
console.log('Tool result:', result);

// Wait for notification
try {
  const notification = await client.waitForNotification('ui://stats/live', 5000);
  console.log('Notification received:', notification);
} catch (err) {
  console.log('No notification received');
}

// Disconnect
await client.disconnect();
```

### API Reference

#### Connection Management

- `connect(serverUrl: string): Promise<void>` - Connect to MCP server
- `disconnect(): Promise<void>` - Disconnect and cleanup
- `isConnected(): boolean` - Check connection status
- `getSessionId(): string | null` - Get current session ID

#### Subscriptions

- `subscribe(uri: string): Promise<void>` - Subscribe to resource updates
- `unsubscribe(uri: string): Promise<void>` - Unsubscribe from resource
- `getSubscriptions(): string[]` - Get active subscriptions
- `waitForNotification(uri: string, timeout?: number): Promise<NotificationRecord>` - Wait for notification
- `getNotifications(uri?: string): NotificationRecord[]` - Get notification history
- `clearNotifications(): void` - Clear notification history

#### Resources

- `listResources(): Promise<Resource[]>` - List all resources
- `readResource(uri: string): Promise<string>` - Read resource content

#### Tools

- `listTools(): Promise<Tool[]>` - List all tools
- `callTool(name: string, args: any): Promise<any>` - Call tool with arguments

## MultiClientManager

### Features

- ✅ Create and manage multiple clients
- ✅ Connect/disconnect all clients in parallel or sequential
- ✅ Subscribe all clients to the same resource
- ✅ Wait for notifications across all clients
- ✅ Execute tools from multiple clients

### Usage

```typescript
import { MultiClientManager } from './utils/multi-client-manager.js';

// Create manager
const manager = new MultiClientManager({
  timeout: 10000,
  verbose: false,
  delayBetweenConnections: 200  // Delay in ms between connections
});

// Create 3 clients
const clients = await manager.createClients(3, 'http://localhost:3001/mcp');

// Connect all clients
await manager.connectAll();

// Subscribe all clients
await manager.subscribeAll('ui://stats/live');

// Call tool from specific client
await manager.callTool(0, 'refresh_stats', {});

// Wait for all clients to receive notification
const notifications = await manager.waitForAllNotifications('ui://stats/live');
console.log('All clients received notification');

// Call tool from all clients (sequential)
const results = await manager.callToolFromAllClientsSequential('add', { a: 10, b: 5 });
console.log('Results:', results);

// Disconnect all
await manager.disconnectAll();
```

### API Reference

#### Client Lifecycle

- `createClients(count: number, serverUrl: string): Promise<MCPTestClient[]>` - Create multiple clients
- `connectAll(): Promise<void>` - Connect all clients
- `disconnectAll(): Promise<void>` - Disconnect all clients
- `getClients(): MCPTestClient[]` - Get all clients
- `getClient(index: number): MCPTestClient` - Get specific client
- `getClientCount(): number` - Get number of clients

#### Subscriptions

- `subscribeAll(uri: string): Promise<void>` - Subscribe all clients
- `unsubscribeAll(uri: string): Promise<void>` - Unsubscribe all clients
- `waitForAllNotifications(uri: string, timeout?: number): Promise<Map<number, NotificationMap>>` - Wait for all
- `haveAllClientsReceivedNotification(uri: string): boolean` - Check if all received
- `clearAllNotifications(): void` - Clear all notification histories

#### Tools

- `callTool(clientIndex: number, toolName: string, args: any): Promise<any>` - Call from specific client
- `callToolFromAllClients(toolName: string, args: any): Promise<Map<number, any>>` - Call from all (parallel)
- `callToolFromAllClientsSequential(toolName: string, args: any): Promise<Map<number, any>>` - Call from all (sequential)

#### Connection Status

- `areAllConnected(): boolean` - Check if all connected
- `getConnectionStatus(): Map<number, boolean>` - Get status for each
- `getSessionIds(): Map<number, string | null>` - Get session IDs for each

## Test Helpers

### Async Wait Functions

```typescript
import { waitFor, waitForValue, sleep } from './utils/test-helpers.js';

// Wait for condition
await waitFor(() => client.isConnected(), { timeout: 5000, interval: 100 });

// Wait for value
await waitForValue(() => notifications.length, 3, 5000);

// Sleep
await sleep(1000);
```

### Assertion Helpers

```typescript
import {
  assertNotificationReceived,
  assertToolResult,
  assertSubscriptionActive,
  assertClientConnected,
  assert,
  assertEqual,
} from './utils/test-helpers.js';

// Assert notification received
assertNotificationReceived(client.getNotifications(), 'ui://stats/live');

// Assert tool result
assertToolResult(result, 8);

// Assert subscription active
assertSubscriptionActive(client, 'ui://stats/live');

// Assert client connected
assertClientConnected(client);

// Generic assertions
assert(condition, 'Custom error message');
assertEqual(actual, expected);
```

### Test Formatting

```typescript
import {
  section,
  subsection,
  step,
  success,
  error,
  info,
  warning,
  printSummary,
} from './utils/test-helpers.js';

console.log(section('Test Suite 1'));
console.log(subsection('Connection Tests'));
console.log(step(1, 'Connect to server'));
console.log(success('Connection successful'));
console.log(info('Session ID: abc123'));
console.log(warning('SSE not available'));
console.log(error('Connection failed'));

printSummary(passed, failed, skipped);
```

### Server Management

```typescript
import { startTestServer, stopTestServer } from './utils/test-helpers.js';

// Start server
const server = await startTestServer(
  'examples/interface-ui-foundation.ts',
  3001,
  { verbose: false }
);

// Run tests...

// Stop server
await stopTestServer(server);
```

## Running Tests

### Prerequisites

Start the test server:

```bash
npx simply-mcp run examples/interface-ui-foundation.ts --http --port 3001
```

### Run Smoke Test

```bash
npx tsx tests/foundation-smoke-test.ts
```

### Expected Results

The smoke test validates:

✅ **Basic Client Operations** (7 tests)
- Connection and session management
- Resource listing and reading
- Tool listing and execution
- Disconnection

✅ **Subscription Support** (6 tests)
- Subscribe/unsubscribe operations
- Notification waiting (graceful handling when not available)
- Notification history

⚠️ **Multi-Client Scenarios** (7 tests)
- Client creation and connection
- Subscription management
- Notification broadcast (known limitation)
- Tool execution (may timeout with multiple clients)

✅ **Error Handling** (6 tests)
- Operations before connection
- Invalid resources and tools
- Double connection prevention

**Success Rate**: 23/26 tests pass (88%)

### Known Limitations

1. **SSE Notifications**: The current server implementation does not support persistent SSE connections for notifications. The client handles this gracefully.

2. **Multi-Client Performance**: Some servers may experience timeouts when handling multiple simultaneous clients. The test client includes:
   - Configurable timeouts
   - Sequential operation mode
   - Delays between connections

3. **Notification Broadcasting**: Real-time notification broadcasting to multiple subscribed clients may not be fully implemented in all servers.

## Design Decisions

### 1. Custom HTTP Client vs SDK Client

We built a custom HTTP client instead of using the MCP SDK's built-in client because:
- Need full control over session management
- Testing requires access to notification queue
- Subscription testing needs programmatic notification access
- Simpler for testing scenarios

### 2. Notification Queue

All notifications are stored in an array for testing:
- Enables notification history inspection
- Supports `waitForNotification()` helper
- Allows verification of notification order
- Can clear between tests

### 3. Graceful Degradation

The client gracefully handles:
- Servers without SSE support
- Missing notifications
- Timeout scenarios
- Multiple concurrent clients

### 4. Sequential Multi-Client Operations

When testing multiple clients:
- Connect with delays between clients
- Subscribe/unsubscribe sequentially
- Add configurable delays
- Increase timeouts

This prevents overwhelming the server and improves reliability.

## Future Enhancements

### For Feature Layer Tests

Build on this foundation to test:
- File-based UI resources
- React component integration
- Theme system
- Production optimizations
- Component library
- CDN integration

### Potential Improvements

1. **Retry Logic**: Add automatic retry for transient failures
2. **Request Queuing**: Queue requests when server is busy
3. **Connection Pool**: Reuse connections across tests
4. **Snapshot Testing**: Capture and compare UI snapshots
5. **Performance Metrics**: Track request/response times
6. **WebSocket Support**: Add WebSocket transport option

## Troubleshooting

### "Request timeout after Xms"

**Cause**: Server is slow or unresponsive
**Solution**:
- Increase timeout in client options
- Use sequential operations instead of parallel
- Add delays between operations
- Check server logs for errors

### "SSE connection failed"

**Cause**: Server doesn't support persistent SSE
**Solution**: This is graceful - client continues without SSE

### "Invalid HTML content"

**Cause**: Resource doesn't return expected HTML
**Solution**: Check resource URI and server implementation

### "Not all clients received notifications"

**Cause**: Server may not broadcast to all clients
**Solution**: This is a known limitation - test marked as optional

## Contributing

When adding tests:

1. Use the provided helpers for consistency
2. Handle graceful failures for optional features
3. Add clear error messages
4. Document known limitations
5. Keep tests isolated and independent

## License

MIT License - Part of simply-mcp-ts project
