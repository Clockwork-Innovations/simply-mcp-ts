# Subscriptions Guide - Resource Update Notifications

**Implementation requirement:**
- ❌ **Static resources** (literal `data` values): No implementation needed
- ✅ **Dynamic resources** (type annotations in `data`): Implementation required

**Method naming:** URI strings (e.g., `'subscription://items'`) - Same as dynamic resources

**See also:** [Resources Guide - Static vs Dynamic](./RESOURCES.md#how-to-determine-static-vs-dynamic)

---

Learn how to enable clients to subscribe to resource updates and send notifications when resources change.

**What are Subscriptions?** A protocol feature that allows clients to subscribe to specific resources and receive notifications when those resources are updated, enabling real-time data flows and event-driven patterns.

**See working examples:**
- Foundation: [examples/interface-subscriptions-foundation.ts](../../examples/interface-subscriptions-foundation.ts)
- Advanced: [examples/interface-subscriptions.ts](../../examples/interface-subscriptions.ts)
- Comprehensive: [examples/interface-protocol-comprehensive.ts](../../examples/interface-protocol-comprehensive.ts)

---

## Overview

The subscription protocol enables real-time resource updates. This is useful when:
- **Live Data**: Provide real-time updates for changing data (logs, metrics, status)
- **Event Notifications**: Notify clients when specific events occur
- **Cache Invalidation**: Signal when cached resource data should be refreshed
- **Monitoring**: Enable clients to track resource changes over time
- **Reactive UIs**: Support user interfaces that react to server-side changes

Subscriptions work in three phases:
1. **Subscribe**: Client subscribes to a resource URI
2. **Update**: Server notifies client when resource changes
3. **Unsubscribe**: Client unsubscribes when no longer interested

---

## ISubscription Interface

The subscription interface defines subscribable resources:

```typescript
import type { ISubscription } from 'simply-mcp';

/**
 * Subscription definition
 */
interface ISubscription {
  /**
   * Resource URI pattern to subscribe to
   *
   * Foundation layer supports exact URI matching only.
   * The URI should match a resource registered with IResource.
   *
   * Examples:
   * - 'config://server'
   * - 'stats://current'
   * - 'log://events'
   */
  uri: string;

  /**
   * Human-readable description of what changes trigger updates
   */
  description: string;

  /**
   * Optional handler called when subscription is activated
   * Use this for subscriptions that need to start monitoring or polling
   * when a client subscribes.
   */
  handler?: () => void | Promise<void>;
}
```

---

## Basic Usage

### Static Subscription

Define a subscribable resource with no handler:

```typescript
import type { ISubscription, IResource, IServer } from 'simply-mcp';

// Define a dynamic resource (changes over time)
interface StatsResource extends IResource {
  uri: 'stats://current';
  name: 'Current Statistics';
  description: 'Real-time server statistics';
  mimeType: 'application/json';
  dynamic: true;
  data: {
    requestCount: number;
    uptime: number;
    lastUpdated: string;
  };
}

// Make the resource subscribable
interface StatsSubscription extends ISubscription {
  uri: 'stats://current';
  description: 'Subscribe to real-time statistics updates';
}

interface MyServer extends IServer {
  name: 'stats-server';
  version: '1.0.0';
}

export default class MyServerImpl implements MyServer {
  private stats = {
    requestCount: 0,
    uptime: 0
  };

  // Implement dynamic resource
  'stats://current': StatsResource = async () => {
    return {
      requestCount: this.stats.requestCount,
      uptime: Math.floor(process.uptime()),
      lastUpdated: new Date().toISOString()
    };
  };

  // No handler needed for static subscription
  // Clients can subscribe, server can notify when stats change
}
```

**Key points:**
- Subscription URI must match a resource URI
- Static subscriptions don't require handler implementation
- Use `context.notifyResourceUpdate()` to notify subscribers

---

## Notification Patterns

### Using notifyResourceUpdate()

Notify subscribers when a resource changes:

```typescript
interface UpdateStatsTool extends ITool {
  name: 'update_stats';
  description: 'Update server statistics';
  params: {
    /** Number of new requests */
    requests: number;
  };
  result: {
    updated: boolean;
  };
}

interface StatsSubscription extends ISubscription {
  uri: 'stats://current';
  description: 'Subscribe to statistics updates';
}

export default class StatsServer implements IServer {
  private stats = { requestCount: 0, uptime: 0 };

  updateStats: UpdateStatsTool = async (params, context) => {
    // Update statistics
    this.stats.requestCount += params.requests;

    // Notify all subscribers
    if (context.notifyResourceUpdate) {
      await context.notifyResourceUpdate('stats://current');
    }

    return { updated: true };
  };

  'stats://current': StatsResource = async () => {
    return {
      requestCount: this.stats.requestCount,
      uptime: Math.floor(process.uptime()),
      lastUpdated: new Date().toISOString()
    };
  };
}
```

### Automatic Notifications

Set up automatic notifications on data changes:

```typescript
interface LogSubscription extends ISubscription {
  uri: 'log://events';
  description: 'Subscribe to log events';
}

interface LogResource extends IResource {
  uri: 'log://events';
  name: 'Log Events';
  description: 'Recent log events';
  mimeType: 'application/json';
  dynamic: true;
  data: Array<{
    level: string;
    message: string;
    timestamp: string;
  }>;
}

export default class LogServer implements IServer {
  private logs: Array<any> = [];
  private context: any = null;

  // Store context for later use
  private setContext(context: any): void {
    this.context = context;
  }

  // Tool that generates logs
  logMessage: LogMessageTool = async (params, context) => {
    this.setContext(context);

    const logEntry = {
      level: params.level,
      message: params.message,
      timestamp: new Date().toISOString()
    };

    // Add to logs
    this.logs.push(logEntry);

    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs.shift();
    }

    // Notify subscribers automatically
    if (this.context?.notifyResourceUpdate) {
      await this.context.notifyResourceUpdate('log://events');
    }

    return { logged: true };
  };

  // Resource implementation
  'log://events': LogResource = async () => {
    return this.logs;
  };
}
```

---

## Subscription Lifecycle

### Subscribe → Update → Unsubscribe Flow

```typescript
interface MonitoredResource extends IResource {
  uri: 'data://sensor';
  name: 'Sensor Data';
  mimeType: 'application/json';
  dynamic: true;
  data: {
    temperature: number;
    humidity: number;
    timestamp: string;
  };
}

interface SensorSubscription extends ISubscription {
  uri: 'data://sensor';
  description: 'Subscribe to sensor data updates';
  handler: () => void | Promise<void>;
}

export default class SensorServer implements IServer {
  private sensorData = { temperature: 20, humidity: 50 };
  private monitoringInterval: NodeJS.Timeout | null = null;
  private context: any = null;

  // Subscription handler - called when first client subscribes
  'data://sensor': SensorSubscription = async () => {
    console.log('Client subscribed to sensor data');

    // Start monitoring if not already running
    if (!this.monitoringInterval) {
      this.startMonitoring();
    }
  };

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      // Simulate sensor reading
      this.sensorData.temperature = 20 + Math.random() * 10;
      this.sensorData.humidity = 40 + Math.random() * 20;

      // Notify all subscribers
      if (this.context?.notifyResourceUpdate) {
        await this.context.notifyResourceUpdate('data://sensor');
      }
    }, 5000);  // Update every 5 seconds
  }

  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Resource implementation
  'data://sensor': MonitoredResource = async () => {
    return {
      ...this.sensorData,
      timestamp: new Date().toISOString()
    };
  };

  // Cleanup on server shutdown
  async cleanup(): Promise<void> {
    this.stopMonitoring();
  }
}
```

---

## Multiple Subscribers

### Handling Multiple Clients

The MCP protocol automatically handles multiple subscribers:

```typescript
interface SharedDataSubscription extends ISubscription {
  uri: 'shared://data';
  description: 'Subscribe to shared data updates';
  handler: () => void;
}

export default class SharedDataServer implements IServer {
  private subscriberCount = 0;
  private sharedData = { value: 0 };

  // Handler called when a client subscribes
  'shared://data': SharedDataSubscription = () => {
    this.subscriberCount++;
    console.log(`Client subscribed (${this.subscriberCount} total subscribers)`);
  };

  // Tool to update shared data
  updateData: UpdateDataTool = async (params, context) => {
    this.sharedData.value = params.newValue;

    // Notify ALL subscribers
    if (context.notifyResourceUpdate) {
      await context.notifyResourceUpdate('shared://data');
      console.log(`Notified ${this.subscriberCount} subscriber(s)`);
    }

    return { updated: true };
  };

  'shared://data': SharedDataResource = async () => {
    return this.sharedData;
  };
}
```

**Key points:**
- MCP protocol handles subscriber tracking
- One notification reaches all subscribers
- No need to manually manage subscriber lists

---

## Best Practices

### When to Use Subscriptions

**Good Use Cases:**
- Real-time data feeds (logs, metrics, sensor data)
- Event-driven updates (status changes, notifications)
- Collaborative features (shared documents, cursors)
- Monitoring and alerting
- Cache invalidation signals

**Avoid Subscriptions For:**
- Static data that never changes
- High-frequency updates (> 10/second - consider batching)
- One-time data fetches (use regular resources)
- Data that requires polling external APIs

### Performance Tips

1. **Batch Updates**: Group multiple changes into one notification

```typescript
private pendingUpdates = new Set<string>();
private updateTimer: NodeJS.Timeout | null = null;

private scheduleUpdate(uri: string): void {
  this.pendingUpdates.add(uri);

  if (!this.updateTimer) {
    this.updateTimer = setTimeout(() => {
      this.flushUpdates();
    }, 1000);  // Batch updates every 1 second
  }
}

private async flushUpdates(): Promise<void> {
  if (!this.context?.notifyResourceUpdate) return;

  for (const uri of this.pendingUpdates) {
    await this.context.notifyResourceUpdate(uri);
  }

  this.pendingUpdates.clear();
  this.updateTimer = null;
}
```

2. **Conditional Notifications**: Only notify when data actually changes

```typescript
updateData: UpdateDataTool = async (params, context) => {
  const oldValue = this.data.value;
  this.data.value = params.newValue;

  // Only notify if value changed
  if (oldValue !== this.data.value && context.notifyResourceUpdate) {
    await context.notifyResourceUpdate('data://value');
  }

  return { updated: true };
};
```

3. **Debouncing**: Prevent notification spam

```typescript
private lastNotification = 0;
private readonly MIN_NOTIFICATION_INTERVAL = 500; // 500ms

private async notifyIfReady(uri: string): Promise<void> {
  const now = Date.now();

  if (now - this.lastNotification >= this.MIN_NOTIFICATION_INTERVAL) {
    if (this.context?.notifyResourceUpdate) {
      await this.context.notifyResourceUpdate(uri);
      this.lastNotification = now;
    }
  }
}
```

### Resource Cleanup

Clean up when subscriptions are no longer needed:

```typescript
export default class MonitorServer implements IServer {
  private monitors = new Map<string, NodeJS.Timeout>();

  'log://events': LogSubscription = () => {
    // Start monitoring on first subscription
    if (!this.monitors.has('log://events')) {
      const interval = setInterval(() => {
        this.checkForNewLogs();
      }, 1000);

      this.monitors.set('log://events', interval);
    }
  };

  // Implement cleanup lifecycle hook
  async onUnsubscribe(uri: string): Promise<void> {
    const monitor = this.monitors.get(uri);

    if (monitor) {
      clearInterval(monitor);
      this.monitors.delete(uri);
      console.log(`Stopped monitoring ${uri}`);
    }
  }
}
```

---

## Error Handling

### Missing Notification Capability

Handle cases where notification isn't available:

```typescript
updateTool: UpdateTool = async (params, context) => {
  // Update data
  this.data = params.newData;

  // Try to notify, but don't fail if unavailable
  if (context.notifyResourceUpdate) {
    try {
      await context.notifyResourceUpdate('data://resource');
    } catch (error) {
      console.warn('Failed to notify subscribers:', error.message);
      // Continue - update succeeded even if notification failed
    }
  } else {
    console.warn('Notifications not supported by client');
  }

  return { updated: true };
};
```

### Invalid URIs

Validate URIs before notifying:

```typescript
private async notifyUpdate(uri: string, context: any): Promise<void> {
  if (!uri || typeof uri !== 'string') {
    console.error('Invalid subscription URI:', uri);
    return;
  }

  if (!context.notifyResourceUpdate) {
    return;
  }

  try {
    await context.notifyResourceUpdate(uri);
  } catch (error) {
    console.error(`Failed to notify ${uri}:`, error.message);
  }
}
```

### Handler Failures

Handle errors in subscription handlers gracefully:

```typescript
'monitor://status': StatusSubscription = async () => {
  try {
    await this.startMonitoring();
    console.log('Monitoring started');
  } catch (error) {
    console.error('Failed to start monitoring:', error.message);
    // Don't throw - subscription should still be registered
  }
};
```

---

## Integration Examples

See `examples/interface-protocol-comprehensive.ts` for integration patterns combining multiple protocol features.

---

## Examples

**See working examples:**
- Foundation: [examples/interface-subscriptions-foundation.ts](../../examples/interface-subscriptions-foundation.ts)
- Advanced: [examples/interface-subscriptions.ts](../../examples/interface-subscriptions.ts)
- Comprehensive: [examples/interface-protocol-comprehensive.ts](../../examples/interface-protocol-comprehensive.ts)

---

## Next Steps

- **Request LLM completions?** See [SAMPLING.md](./SAMPLING.md)
- **Request user input?** See [ELICITATION.md](./ELICITATION.md)
- **List client roots?** See [ROOTS.md](./ROOTS.md)
- **Add completions?** See [COMPLETIONS.md](./COMPLETIONS.md)
- **Learn more about Interface API?** See [API_PROTOCOL.md](./API_PROTOCOL.md)

---

**Need help?** Check [docs/README.md](../README.md) for the full documentation index.
