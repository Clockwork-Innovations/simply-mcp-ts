/**
 * Interface-Driven API - Subscriptions (Resource Updates) Example
 *
 * Demonstrates:
 * - Resource subscriptions with ISubscription
 * - Real-time resource monitoring
 * - Event-driven updates with notifyResourceUpdate()
 * - Multiple subscription patterns
 * - Subscription lifecycle (subscribe/unsubscribe)
 * - Production-ready error handling
 *
 * The subscription capability allows clients to subscribe to resource updates
 * and receive notifications when subscribed resources change. This enables
 * real-time monitoring and event-driven workflows.
 *
 * Usage:
 *   npx simply-mcp run examples/interface-subscriptions.ts
 *
 * Test with HTTP mode:
 *   # Start server
 *   npx simply-mcp run examples/interface-subscriptions.ts --transport http --port 3000
 *
 *   # Initialize session
 *   curl -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{"subscriptions":{"listChanged":true}},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}'
 *
 *   # Subscribe to resource
 *   curl -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"resources/subscribe","params":{"uri":"stats://server"},"id":2}'
 *
 *   # Read resource
 *   curl -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"resources/read","params":{"uri":"stats://server"},"id":3}'
 *
 *   # Trigger update (call a tool that modifies state)
 *   curl -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"increment_counter","arguments":{}},"id":4}'
 *
 * Note: Subscriptions require a connected MCP client that supports subscriptions.
 */

import type { ITool, IResource, IServer } from 'simply-mcp';

// ============================================================================
// TOOL INTERFACES
// ============================================================================

/**
 * Increment server counter
 *
 * Demonstrates triggering resource updates from tools.
 * Notifies subscribers when counter changes.
 */
interface IncrementCounterTool extends ITool {
  name: 'increment_counter';
  description: 'Increment server counter and notify subscribers';
  params: {
    /** Amount to increment by */
    amount?: number;
  };
  result: {
    /** New counter value */
    counter: number;
    /** Previous value */
    previous: number;
    /** Whether subscribers were notified */
    notified: boolean;
    /** Number of active subscribers */
    subscriberCount: number;
  };
}

/**
 * Update server status
 *
 * Demonstrates manual status updates with notifications.
 */
interface UpdateStatusTool extends ITool {
  name: 'update_status';
  description: 'Update server status and notify subscribers';
  params: {
    /** New status */
    status: 'online' | 'busy' | 'maintenance' | 'offline';
    /** Optional status message */
    message?: string;
  };
  result: {
    /** Updated status */
    status: string;
    /** Status message */
    message: string;
    /** Update timestamp */
    updatedAt: string;
    /** Whether subscribers were notified */
    notified: boolean;
  };
}

/**
 * Add log entry
 *
 * Demonstrates streaming log updates to subscribers.
 */
interface AddLogEntryTool extends ITool {
  name: 'add_log_entry';
  description: 'Add log entry and notify log subscribers';
  params: {
    /** Log level */
    level: 'debug' | 'info' | 'warn' | 'error';
    /** Log message */
    message: string;
    /** Optional metadata */
    metadata?: Record<string, any>;
  };
  result: {
    /** Log entry ID */
    entryId: string;
    /** Log level */
    level: string;
    /** Timestamp */
    timestamp: string;
    /** Whether subscribers were notified */
    notified: boolean;
  };
}

/**
 * Generate activity event
 *
 * Demonstrates event-driven notifications.
 */
interface GenerateActivityTool extends ITool {
  name: 'generate_activity';
  description: 'Generate user activity event';
  params: {
    /** Activity type */
    activityType: 'login' | 'logout' | 'action' | 'error';
    /** Activity description */
    description: string;
  };
  result: {
    /** Activity ID */
    activityId: string;
    /** Activity type */
    type: string;
    /** Activity timestamp */
    timestamp: string;
    /** Whether subscribers were notified */
    notified: boolean;
  };
}

/**
 * Simulate metric update
 *
 * Demonstrates periodic metric updates with notifications.
 */
interface SimulateMetricsTool extends ITool {
  name: 'simulate_metrics';
  description: 'Simulate metric changes for testing subscriptions';
  params: {
    /** Number of updates to generate */
    updateCount?: number;
    /** Delay between updates (ms) */
    delayMs?: number;
  };
  result: {
    /** Number of updates generated */
    updatesGenerated: number;
    /** Metrics updated */
    metricsUpdated: string[];
    /** Time taken (ms) */
    timeTaken: number;
  };
}

// ============================================================================
// RESOURCE INTERFACES
// ============================================================================

/**
 * Server statistics resource
 *
 * Dynamic resource that updates when server state changes.
 * Clients can subscribe to receive real-time updates.
 */
interface ServerStatsResource extends IResource {
  uri: 'stats://server';
  name: 'Server Statistics';
  description: 'Real-time server statistics';
  mimeType: 'application/json';
  dynamic: true;
  data: {
    counter: number;
    uptime: number;
    requestCount: number;
    lastUpdate: string;
  };
}

/**
 * Server status resource
 *
 * Dynamic resource tracking server operational status.
 */
interface ServerStatusResource extends IResource {
  uri: 'status://server';
  name: 'Server Status';
  description: 'Current server operational status';
  mimeType: 'application/json';
  dynamic: true;
  data: {
    status: 'online' | 'busy' | 'maintenance' | 'offline';
    message: string;
    since: string;
  };
}

/**
 * Activity log resource
 *
 * Dynamic resource streaming activity events.
 */
interface ActivityLogResource extends IResource {
  uri: 'log://activity';
  name: 'Activity Log';
  description: 'Real-time activity event stream';
  mimeType: 'application/json';
  dynamic: true;
  data: {
    entries: Array<{
      id: string;
      type: string;
      description: string;
      timestamp: string;
    }>;
    totalEntries: number;
    lastUpdate: string;
  };
}

/**
 * System logs resource
 *
 * Dynamic resource with structured log entries.
 */
interface SystemLogsResource extends IResource {
  uri: 'log://system';
  name: 'System Logs';
  description: 'System log entries with filtering';
  mimeType: 'application/json';
  dynamic: true;
  data: {
    logs: Array<{
      id: string;
      level: 'debug' | 'info' | 'warn' | 'error';
      message: string;
      timestamp: string;
      metadata?: Record<string, any>;
    }>;
    count: number;
    lastEntry: string;
  };
}

/**
 * Performance metrics resource
 *
 * Dynamic resource with system performance data.
 */
interface PerformanceMetricsResource extends IResource {
  uri: 'metrics://performance';
  name: 'Performance Metrics';
  description: 'System performance metrics';
  mimeType: 'application/json';
  dynamic: true;
  data: {
    cpu: {
      usage: number;
      cores: number;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    requests: {
      total: number;
      perSecond: number;
    };
    timestamp: string;
  };
}

/**
 * Subscription guide resource
 *
 * Static documentation resource.
 */
interface SubscriptionGuideResource extends IResource {
  uri: 'docs://subscriptions';
  name: 'Subscription Guide';
  description: 'How to use resource subscriptions';
  mimeType: 'text/markdown';
  data: `# Resource Subscriptions Guide

## Overview

Resource subscriptions enable real-time updates. When a resource changes,
subscribed clients receive notifications automatically.

## Subscription Lifecycle

### 1. Subscribe
\`\`\`json
{
  "method": "resources/subscribe",
  "params": { "uri": "stats://server" }
}
\`\`\`

### 2. Receive Updates
When the resource changes, server sends notification:
\`\`\`json
{
  "method": "notifications/resources/updated",
  "params": { "uri": "stats://server" }
}
\`\`\`

### 3. Read Updated Resource
Client re-reads the resource to get new data:
\`\`\`json
{
  "method": "resources/read",
  "params": { "uri": "stats://server" }
}
\`\`\`

### 4. Unsubscribe
\`\`\`json
{
  "method": "resources/unsubscribe",
  "params": { "uri": "stats://server" }
}
\`\`\`

## Available Subscribable Resources

### stats://server
Server statistics (counter, uptime, requests)
- Updates: On counter increment or request
- Frequency: Event-driven

### status://server
Server operational status
- Updates: On status change
- Frequency: As needed

### log://activity
Activity event stream
- Updates: On new activity
- Frequency: Real-time

### log://system
System log entries
- Updates: On new log entry
- Frequency: Real-time

### metrics://performance
Performance metrics
- Updates: Periodic or on demand
- Frequency: Every 5 seconds (configurable)

## Best Practices

1. **Subscribe selectively:** Only subscribe to resources you need
2. **Unsubscribe when done:** Clean up subscriptions
3. **Handle notifications:** Implement notification handlers
4. **Rate limiting:** Be aware of high-frequency updates
5. **Reconnection:** Resubscribe after connection loss

## Example Flow

\`\`\`javascript
// 1. Subscribe to server stats
await client.subscribe('stats://server');

// 2. Call tool that modifies stats
await client.callTool('increment_counter', { amount: 5 });

// 3. Receive notification (automatic)
// notification: resources/updated -> stats://server

// 4. Read updated resource
const stats = await client.readResource('stats://server');
console.log('New counter:', stats.counter);

// 5. Unsubscribe when done
await client.unsubscribe('stats://server');
\`\`\`

## Notification Format

Server sends notifications using the MCP notification protocol:

\`\`\`json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/updated",
  "params": {
    "uri": "stats://server"
  }
}
\`\`\`

Client should then re-read the resource to get updated data.
`;
}

// ============================================================================
// SERVER INTERFACE
// ============================================================================

interface SubscriptionsDemoServer extends IServer {
  name: 'subscriptions-demo';
  version: '1.0.0';
  description: 'Production-ready subscriptions (resource updates) demonstration';
}

// ============================================================================
// SERVER IMPLEMENTATION
// ============================================================================

/**
 * Subscriptions Demo Server Implementation
 *
 * Demonstrates real-time resource updates with subscription notifications.
 * All tools that modify state trigger appropriate resource update notifications.
 */
export default class SubscriptionsDemo implements SubscriptionsDemoServer {
  // Server state
  private counter = 0;
  private requestCount = 0;
  private startTime = Date.now();

  // Status tracking
  private currentStatus: 'online' | 'busy' | 'maintenance' | 'offline' = 'online';
  private statusMessage = 'Server operational';
  private statusSince = new Date().toISOString();

  // Activity tracking
  private activities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }> = [];

  // System logs
  private logs: Array<{
    id: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }> = [];

  // Performance metrics
  private metrics = {
    cpu: { usage: 15, cores: 8 },
    memory: { used: 2048, total: 16384, percentage: 12.5 },
    requests: { total: 0, perSecond: 0 },
  };

  // Store notifyResourceUpdate function for use in tools
  private notifyUpdate: ((uri: string) => void) | null = null;

  // Helper to track notification function (called by adapter)
  setNotifyFunction(fn: (uri: string) => void) {
    this.notifyUpdate = fn;
  }

  // ========================================================================
  // TOOL IMPLEMENTATIONS
  // ========================================================================

  /**
   * Increment counter and notify subscribers
   */
  incrementCounter: IncrementCounterTool = async (params, context) => {
    const amount = params.amount || 1;
    const previous = this.counter;
    this.counter += amount;
    this.requestCount++;

    // Notify subscribers of stats://server update
    let notified = false;
    let subscriberCount = 0;

    if (context?.notifyResourceUpdate) {
      context.notifyResourceUpdate('stats://server');
      notified = true;
      // In production, track actual subscriber count
      subscriberCount = 1;
    }

    return {
      counter: this.counter,
      previous,
      notified,
      subscriberCount,
    };
  };

  /**
   * Update server status
   */
  updateStatus: UpdateStatusTool = async (params, context) => {
    this.currentStatus = params.status;
    this.statusMessage = params.message || `Server status: ${params.status}`;
    this.statusSince = new Date().toISOString();

    // Notify subscribers of status://server update
    let notified = false;
    if (context?.notifyResourceUpdate) {
      context.notifyResourceUpdate('status://server');
      notified = true;
    }

    return {
      status: this.currentStatus,
      message: this.statusMessage,
      updatedAt: this.statusSince,
      notified,
    };
  };

  /**
   * Add log entry
   */
  addLogEntry: AddLogEntryTool = async (params, context) => {
    const entryId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    const logEntry = {
      id: entryId,
      level: params.level,
      message: params.message,
      timestamp,
      metadata: params.metadata,
    };

    this.logs.push(logEntry);

    // Keep only last 100 entries
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }

    // Notify subscribers of log://system update
    let notified = false;
    if (context?.notifyResourceUpdate) {
      context.notifyResourceUpdate('log://system');
      notified = true;
    }

    return {
      entryId,
      level: params.level,
      timestamp,
      notified,
    };
  };

  /**
   * Generate activity event
   */
  generateActivity: GenerateActivityTool = async (params, context) => {
    const activityId = `activity_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const activity = {
      id: activityId,
      type: params.activityType,
      description: params.description,
      timestamp,
    };

    this.activities.push(activity);

    // Keep only last 50 activities
    if (this.activities.length > 50) {
      this.activities = this.activities.slice(-50);
    }

    // Notify subscribers of log://activity update
    let notified = false;
    if (context?.notifyResourceUpdate) {
      context.notifyResourceUpdate('log://activity');
      notified = true;
    }

    return {
      activityId,
      type: params.activityType,
      timestamp,
      notified,
    };
  };

  /**
   * Simulate metric updates
   */
  simulateMetrics: SimulateMetricsTool = async (params, context) => {
    const updateCount = params.updateCount || 3;
    const delayMs = params.delayMs || 1000;
    const startTime = Date.now();

    const metricsUpdated: string[] = [];

    for (let i = 0; i < updateCount; i++) {
      // Update metrics with random values
      this.metrics.cpu.usage = 10 + Math.random() * 80;
      this.metrics.memory.used = 1024 + Math.random() * 8192;
      this.metrics.memory.percentage = (this.metrics.memory.used / this.metrics.memory.total) * 100;
      this.metrics.requests.perSecond = Math.floor(Math.random() * 100);

      metricsUpdated.push(`Update ${i + 1}: CPU ${this.metrics.cpu.usage.toFixed(1)}%`);

      // Notify subscribers
      if (context?.notifyResourceUpdate) {
        context.notifyResourceUpdate('metrics://performance');
      }

      // Wait before next update (except on last iteration)
      if (i < updateCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    const timeTaken = Date.now() - startTime;

    return {
      updatesGenerated: updateCount,
      metricsUpdated,
      timeTaken,
    };
  };

  // ========================================================================
  // DYNAMIC RESOURCES - Require implementation
  // ========================================================================

  /**
   * Server statistics resource
   */
  'stats://server': ServerStatsResource = async () => {
    return {
      counter: this.counter,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      requestCount: this.requestCount,
      lastUpdate: new Date().toISOString(),
    };
  };

  /**
   * Server status resource
   */
  'status://server': ServerStatusResource = async () => {
    return {
      status: this.currentStatus,
      message: this.statusMessage,
      since: this.statusSince,
    };
  };

  /**
   * Activity log resource
   */
  'log://activity': ActivityLogResource = async () => {
    return {
      entries: this.activities,
      totalEntries: this.activities.length,
      lastUpdate: this.activities.length > 0 ? this.activities[this.activities.length - 1].timestamp : new Date().toISOString(),
    };
  };

  /**
   * System logs resource
   */
  'log://system': SystemLogsResource = async () => {
    return {
      logs: this.logs,
      count: this.logs.length,
      lastEntry: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : new Date().toISOString(),
    };
  };

  /**
   * Performance metrics resource
   */
  'metrics://performance': PerformanceMetricsResource = async () => {
    this.metrics.requests.total = this.requestCount;

    return {
      cpu: this.metrics.cpu,
      memory: this.metrics.memory,
      requests: this.metrics.requests,
      timestamp: new Date().toISOString(),
    };
  };

  // ========================================================================
  // STATIC RESOURCES - No implementation needed
  // ========================================================================

  // SubscriptionGuideResource - markdown documentation served as-is
}
