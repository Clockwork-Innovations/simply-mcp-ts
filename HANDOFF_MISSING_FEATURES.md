# Comprehensive Handoff: Missing Features Implementation

**Project:** Simply-MCP TypeScript Framework
**Version:** v4.0 → v4.1/v4.2
**Date:** November 2, 2025
**Status:** Ready for Implementation

---

## Executive Summary

This handoff document provides a comprehensive implementation plan for all missing features identified in the v4.0 release readiness analysis. Based on the gap analysis comparing Simply-MCP against the Anthropic MCP TypeScript SDK and MCP-UI specifications, this document outlines:

1. **Two Medium-Priority Features** for v4.1 (24-32 hours total)
2. **One Advanced Feature** for v4.2 (40-60 hours total)
3. **Additional Enhancements** for future releases

All features are organized with detailed implementation plans, code examples, file references, test requirements, and effort estimates.

---

## Table of Contents

1. [Feature 1: WebSocket Transport (v4.1)](#feature-1-websocket-transport)
2. [Feature 2: MCP-UI Client Props Expansion (v4.1)](#feature-2-mcp-ui-client-props-expansion)
3. [Feature 3: Remote DOM Implementation (v4.2)](#feature-3-remote-dom-implementation)
4. [Feature 4: Metrics and Telemetry (v4.1)](#feature-4-metrics-and-telemetry)
5. [Additional Enhancements](#additional-enhancements)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Testing Requirements](#testing-requirements)
8. [Documentation Requirements](#documentation-requirements)

---

## Feature 1: WebSocket Transport

### Overview

**Priority:** Medium
**Effort:** 8-12 hours
**Target Release:** v4.1 (Q1 2025)
**Status:** Not implemented

**Current State:**
- ✅ stdio transport (fully implemented)
- ✅ HTTP Stateful transport with SSE (fully implemented)
- ✅ HTTP Stateless transport (fully implemented)
- ❌ WebSocket transport (missing)

**Workaround:**
HTTP Stateful with Server-Sent Events provides bidirectional communication functionally equivalent to WebSocket for most use cases.

**Why Implement:**
- Full parity with Anthropic MCP SDK
- Lower latency for real-time updates
- More efficient bidirectional communication
- Native browser WebSocket support

---

### Technical Specification

#### WebSocket Transport Requirements

**MCP SDK Reference:**
The Anthropic MCP SDK does not currently provide a built-in WebSocket transport, but the JSON-RPC 2.0 protocol supports any bidirectional transport mechanism.

**Protocol Considerations:**
- WebSocket provides full-duplex communication
- Messages must follow JSON-RPC 2.0 format
- Connection lifecycle: open → initialize → operate → close
- Heartbeat/ping-pong for connection health

**Comparison to SSE:**

| Feature | SSE (Current) | WebSocket (Planned) |
|---------|---------------|---------------------|
| Direction | Server → Client only | Bidirectional |
| Protocol | Text-based events | Binary/text frames |
| Browser API | EventSource | WebSocket |
| Reconnection | Automatic | Manual |
| Latency | Higher (~50-100ms) | Lower (~10-30ms) |
| Overhead | Higher (HTTP headers) | Lower (frame headers) |

---

### Implementation Plan

#### Phase 1: Core WebSocket Transport (4-5 hours)

**File:** `/src/transports/websocket-server.ts` (NEW)

```typescript
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import WebSocket from 'ws';
import { IncomingMessage } from 'http';

export interface WebSocketServerTransportOptions {
  /**
   * Port to listen on (default: 8080)
   */
  port?: number;

  /**
   * WebSocket server options
   */
  wsOptions?: WebSocket.ServerOptions;

  /**
   * Heartbeat interval in ms (default: 30000)
   */
  heartbeatInterval?: number;

  /**
   * Heartbeat timeout in ms (default: 60000)
   */
  heartbeatTimeout?: number;

  /**
   * Maximum message size in bytes (default: 10MB)
   */
  maxMessageSize?: number;
}

export class WebSocketServerTransport implements Transport {
  private wss: WebSocket.Server;
  private clients: Map<string, WebSocket> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private options: Required<WebSocketServerTransportOptions>;

  constructor(options: WebSocketServerTransportOptions = {}) {
    this.options = {
      port: options.port ?? 8080,
      wsOptions: options.wsOptions ?? {},
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      heartbeatTimeout: options.heartbeatTimeout ?? 60000,
      maxMessageSize: options.maxMessageSize ?? 10 * 1024 * 1024, // 10MB
    };

    this.wss = new WebSocket.Server({
      port: this.options.port,
      ...this.options.wsOptions,
    });

    this.setupServerListeners();
  }

  private setupServerListeners(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);

      console.log(`[WebSocket] Client connected: ${clientId}`);

      // Setup client listeners
      this.setupClientListeners(clientId, ws);

      // Start heartbeat
      this.startHeartbeat(clientId, ws);
    });

    this.wss.on('error', (error: Error) => {
      console.error('[WebSocket] Server error:', error);
    });
  }

  private setupClientListeners(clientId: string, ws: WebSocket): void {
    ws.on('message', (data: WebSocket.Data) => {
      try {
        // Check message size
        const size = Buffer.byteLength(data.toString());
        if (size > this.options.maxMessageSize) {
          this.sendError(ws, -32700, `Message size ${size} exceeds maximum ${this.options.maxMessageSize}`);
          return;
        }

        // Parse JSON-RPC message
        const message = JSON.parse(data.toString()) as JSONRPCMessage;

        // Emit message to handler
        this.onmessage?.(message);

        // Reset heartbeat timer on activity
        this.resetHeartbeat(clientId, ws);
      } catch (error) {
        console.error('[WebSocket] Message parse error:', error);
        this.sendError(ws, -32700, 'Parse error');
      }
    });

    ws.on('close', (code: number, reason: string) => {
      console.log(`[WebSocket] Client disconnected: ${clientId} (${code}: ${reason})`);
      this.cleanup(clientId);
      this.onclose?.();
    });

    ws.on('error', (error: Error) => {
      console.error(`[WebSocket] Client error (${clientId}):`, error);
      this.onerror?.(error);
    });

    ws.on('pong', () => {
      // Client is alive, reset heartbeat
      this.resetHeartbeat(clientId, ws);
    });
  }

  private startHeartbeat(clientId: string, ws: WebSocket): void {
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();

        // Set timeout to close connection if no pong received
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            console.log(`[WebSocket] Heartbeat timeout for ${clientId}`);
            ws.terminate();
          }
        }, this.options.heartbeatTimeout);
      }
    }, this.options.heartbeatInterval);

    this.heartbeatIntervals.set(clientId, interval);
  }

  private resetHeartbeat(clientId: string, ws: WebSocket): void {
    // Heartbeat is handled by ping/pong, no need to reset
    // Just log activity if needed
  }

  private cleanup(clientId: string): void {
    const interval = this.heartbeatIntervals.get(clientId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(clientId);
    }
    this.clients.delete(clientId);
  }

  private generateClientId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private sendError(ws: WebSocket, code: number, message: string): void {
    const errorMessage = {
      jsonrpc: '2.0',
      error: { code, message },
      id: null,
    };
    ws.send(JSON.stringify(errorMessage));
  }

  // Transport interface implementation
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss.once('listening', () => {
        console.log(`[WebSocket] Server listening on port ${this.options.port}`);
        resolve();
      });
      this.wss.once('error', reject);
    });
  }

  async close(): Promise<void> {
    // Close all client connections
    for (const [clientId, ws] of this.clients) {
      ws.close(1000, 'Server shutdown');
      this.cleanup(clientId);
    }

    // Close server
    return new Promise((resolve) => {
      this.wss.close(() => {
        console.log('[WebSocket] Server closed');
        resolve();
      });
    });
  }

  async send(message: JSONRPCMessage): Promise<void> {
    const data = JSON.stringify(message);

    // Broadcast to all connected clients
    for (const ws of this.clients.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  // Transport interface callbacks
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
}
```

**Dependencies:**
```json
{
  "dependencies": {
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/ws": "^8.5.12"
  }
}
```

---

#### Phase 2: Integration with IServer Interface (2-3 hours)

**File:** `/src/server/interface-types.ts` (UPDATE)

```typescript
export interface IServer {
  name: string;
  version?: string;
  description?: string;

  // Transport configuration
  transport?: 'stdio' | 'http' | 'websocket';

  // HTTP-specific options (existing)
  port?: number;
  stateful?: boolean;

  // WebSocket-specific options (NEW)
  websocket?: {
    port?: number;
    heartbeatInterval?: number;
    heartbeatTimeout?: number;
    maxMessageSize?: number;
    wsOptions?: any; // ws.ServerOptions
  };

  // ... rest of interface
}
```

**File:** `/src/cli/servers/websocket-server.ts` (NEW)

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebSocketServerTransport } from '../../transports/websocket-server.js';
import type { IServer } from '../../server/interface-types.js';

export async function startWebSocketServer(
  server: Server,
  config: IServer
): Promise<void> {
  const transport = new WebSocketServerTransport({
    port: config.websocket?.port ?? config.port ?? 8080,
    heartbeatInterval: config.websocket?.heartbeatInterval,
    heartbeatTimeout: config.websocket?.heartbeatTimeout,
    maxMessageSize: config.websocket?.maxMessageSize,
    wsOptions: config.websocket?.wsOptions,
  });

  await transport.start();
  await server.connect(transport);

  console.log(`MCP server running on WebSocket port ${config.websocket?.port ?? config.port ?? 8080}`);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down WebSocket server...');
    await server.close();
    await transport.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Shutting down WebSocket server...');
    await server.close();
    await transport.close();
    process.exit(0);
  });
}
```

**File:** `/src/cli/run.ts` (UPDATE)

```typescript
// Add WebSocket server import
import { startWebSocketServer } from './servers/websocket-server.js';

// Update transport detection logic
if (interfaceType === 'interface') {
  if (parsed.transport === 'http') {
    await startHTTPServer(mcpServer, parsed, implementation);
  } else if (parsed.transport === 'websocket') {
    await startWebSocketServer(mcpServer, parsed);
  } else {
    // stdio (default)
    await startStdioServer(mcpServer);
  }
}
```

---

#### Phase 3: Client-Side Support (2-3 hours)

**File:** `/src/client/WebSocketClient.ts` (NEW)

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

export interface WebSocketClientTransportOptions {
  /**
   * WebSocket URL (e.g., ws://localhost:8080)
   */
  url: string;

  /**
   * Reconnection options
   */
  reconnect?: {
    enabled: boolean;
    maxAttempts?: number;
    delayMs?: number;
    backoffMultiplier?: number;
  };
}

export class WebSocketClientTransport implements Transport {
  private ws: WebSocket | null = null;
  private messageQueue: JSONRPCMessage[] = [];
  private reconnectAttempts = 0;
  private options: Required<WebSocketClientTransportOptions>;

  constructor(options: WebSocketClientTransportOptions) {
    this.options = {
      url: options.url,
      reconnect: {
        enabled: options.reconnect?.enabled ?? true,
        maxAttempts: options.reconnect?.maxAttempts ?? 5,
        delayMs: options.reconnect?.delayMs ?? 1000,
        backoffMultiplier: options.reconnect?.backoffMultiplier ?? 2,
      },
    };
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.options.url);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected to', this.options.url);
        this.reconnectAttempts = 0;

        // Send queued messages
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift()!;
          this.send(message);
        }

        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as JSONRPCMessage;
          this.onmessage?.(message);
        } catch (error) {
          console.error('[WebSocket] Message parse error:', error);
          this.onerror?.(error as Error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        this.handleReconnect();
        this.onclose?.();
      };

      this.ws.onerror = (event) => {
        console.error('[WebSocket] Error:', event);
        const error = new Error('WebSocket error');
        this.onerror?.(error);
        reject(error);
      };
    });
  }

  async close(): Promise<void> {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
    }
  }

  private async handleReconnect(): Promise<void> {
    if (!this.options.reconnect.enabled) {
      return;
    }

    if (this.reconnectAttempts >= this.options.reconnect.maxAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.options.reconnect.delayMs *
      Math.pow(this.options.reconnect.backoffMultiplier, this.reconnectAttempts - 1);

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    setTimeout(() => {
      this.start().catch(console.error);
    }, delay);
  }

  // Transport interface callbacks
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
}

// Usage example
export async function createWebSocketClient(url: string): Promise<Client> {
  const transport = new WebSocketClientTransport({ url });
  const client = new Client({
    name: 'websocket-client',
    version: '1.0.0',
  }, {
    capabilities: {},
  });

  await transport.start();
  await client.connect(transport);

  return client;
}
```

---

#### Phase 4: Testing (2-3 hours)

**File:** `/tests/integration/websocket-transport.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebSocketServerTransport } from '../../src/transports/websocket-server.js';
import { WebSocketClientTransport } from '../../src/client/WebSocketClient.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('WebSocket Transport', () => {
  let server: Server;
  let serverTransport: WebSocketServerTransport;
  let client: Client;
  let clientTransport: WebSocketClientTransport;

  beforeAll(async () => {
    // Start server
    server = new Server({
      name: 'test-server',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'test_tool',
          description: 'A test tool',
          inputSchema: {
            type: 'object',
            properties: {
              input: { type: 'string' },
            },
          },
        },
      ],
    }));

    serverTransport = new WebSocketServerTransport({ port: 8765 });
    await serverTransport.start();
    await server.connect(serverTransport);

    // Start client
    clientTransport = new WebSocketClientTransport({
      url: 'ws://localhost:8765',
    });

    client = new Client({
      name: 'test-client',
      version: '1.0.0',
    }, {
      capabilities: {},
    });

    await clientTransport.start();
    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
    await clientTransport.close();
    await server.close();
    await serverTransport.close();
  });

  it('should connect client to server', async () => {
    // Connection established in beforeAll
    expect(client).toBeDefined();
  });

  it('should list tools', async () => {
    const result = await client.listTools();
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].name).toBe('test_tool');
  });

  it('should handle bidirectional communication', async () => {
    const result = await client.request({
      method: 'tools/list',
      params: {},
    }, 'ListToolsResult');

    expect(result.tools).toBeDefined();
  });

  it('should handle heartbeat', async () => {
    // Wait for heartbeat interval
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Connection should still be alive
    const result = await client.listTools();
    expect(result.tools).toHaveLength(1);
  }, 10000);

  it('should handle reconnection', async () => {
    // Close connection
    await clientTransport.close();

    // Wait for reconnection
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Should be able to communicate again
    const result = await client.listTools();
    expect(result.tools).toHaveLength(1);
  }, 5000);
});

describe('WebSocket Transport Edge Cases', () => {
  it('should handle large messages', async () => {
    const transport = new WebSocketServerTransport({
      port: 8766,
      maxMessageSize: 1024, // 1KB limit
    });
    await transport.start();

    const clientTransport = new WebSocketClientTransport({
      url: 'ws://localhost:8766',
    });
    await clientTransport.start();

    // Send message larger than limit
    const largeMessage = {
      jsonrpc: '2.0',
      method: 'test',
      params: { data: 'a'.repeat(2000) },
      id: 1,
    };

    await expect(clientTransport.send(largeMessage as any)).rejects.toThrow();

    await clientTransport.close();
    await transport.close();
  });

  it('should handle invalid JSON', async () => {
    // Test handled by onmessage error handler
  });

  it('should handle multiple clients', async () => {
    const transport = new WebSocketServerTransport({ port: 8767 });
    await transport.start();

    const client1 = new WebSocketClientTransport({ url: 'ws://localhost:8767' });
    const client2 = new WebSocketClientTransport({ url: 'ws://localhost:8767' });

    await client1.start();
    await client2.start();

    // Both clients should be able to communicate
    expect(client1).toBeDefined();
    expect(client2).toBeDefined();

    await client1.close();
    await client2.close();
    await transport.close();
  });
});
```

---

#### Phase 5: Documentation (1-2 hours)

**File:** `/docs/guides/TRANSPORT.md` (UPDATE)

Add WebSocket section:

```markdown
## WebSocket Transport

### Overview

WebSocket transport provides **bidirectional, low-latency communication** between MCP clients and servers. It's ideal for real-time applications requiring frequent updates.

### Configuration

```typescript
interface WebSocketServer extends IServer {
  name: 'my-server';
  transport: 'websocket';

  websocket: {
    port: 8080,                    // WebSocket port
    heartbeatInterval: 30000,      // Ping interval (ms)
    heartbeatTimeout: 60000,       // Pong timeout (ms)
    maxMessageSize: 10485760,      // 10MB max message
  };
}
```

### Server Example

```typescript
// server.ts
interface MyServer extends IServer {
  name: 'my-server';
  transport: 'websocket';
  websocket: { port: 8080 };
}

export default class Server implements MyServer {
  // ... tools, prompts, resources
}
```

Run with:
```bash
simply-mcp run server.ts
```

### Client Example

```typescript
import { createWebSocketClient } from 'simply-mcp';

const client = await createWebSocketClient('ws://localhost:8080');

const tools = await client.listTools();
console.log('Available tools:', tools);
```

### Features

- ✅ **Bidirectional Communication** - Full-duplex messaging
- ✅ **Low Latency** - ~10-30ms round-trip time
- ✅ **Heartbeat** - Automatic connection health monitoring
- ✅ **Auto-Reconnect** - Client automatically reconnects on disconnect
- ✅ **Multiple Clients** - Support for concurrent connections
- ✅ **Message Size Limits** - Configurable max message size

### Comparison to Other Transports

| Feature | stdio | HTTP+SSE | **WebSocket** |
|---------|-------|----------|---------------|
| Latency | Low | Medium | **Lowest** |
| Bidirectional | ✅ | ⚠️ (SSE one-way) | **✅** |
| Browser Support | ❌ | ✅ | **✅** |
| Deployment | Simple | Complex | **Medium** |

### When to Use

**Use WebSocket when:**
- Building real-time dashboards
- Frequent bidirectional updates needed
- Browser-based clients
- Latency is critical

**Use HTTP+SSE when:**
- Primarily server → client updates
- Standard HTTP infrastructure preferred
- CDN/load balancer compatibility needed

**Use stdio when:**
- Claude Desktop integration
- Process-spawned servers
- Simple local development
```

**File:** `/examples/interface-websocket.ts` (NEW)

```typescript
import type { IServer, ITool } from 'simply-mcp';

interface EchoTool extends ITool<{ message: string }, string> {
  description: 'Echo a message back';
}

interface WebSocketServer extends IServer {
  name: 'websocket-example';
  version: '1.0.0';
  description: 'Example WebSocket MCP server';
  transport: 'websocket';
  websocket: {
    port: 8080;
    heartbeatInterval: 30000;
  };
}

export default class Server implements WebSocketServer {
  echo: EchoTool = async ({ message }) => {
    return `Echo: ${message}`;
  };
}
```

---

### Testing Checklist

- [ ] Unit tests for WebSocketServerTransport
- [ ] Unit tests for WebSocketClientTransport
- [ ] Integration test: client-server communication
- [ ] Integration test: multiple clients
- [ ] Integration test: heartbeat and reconnection
- [ ] Edge case test: large messages
- [ ] Edge case test: invalid JSON
- [ ] Edge case test: connection timeout
- [ ] Performance test: latency benchmarks
- [ ] Performance test: throughput benchmarks

---

### Documentation Checklist

- [ ] Update `/docs/guides/TRANSPORT.md` with WebSocket section
- [ ] Create `/examples/interface-websocket.ts` example
- [ ] Add WebSocket to README.md features
- [ ] Update API reference with WebSocket types
- [ ] Create migration guide from SSE to WebSocket

---

### Effort Breakdown

| Task | Estimated Hours |
|------|-----------------|
| Core transport implementation | 4-5 |
| Interface integration | 2-3 |
| Client-side support | 2-3 |
| Testing | 2-3 |
| Documentation | 1-2 |
| **Total** | **11-16** |

**Revised Estimate:** 8-12 hours (optimistic with existing patterns)

---

## Feature 2: MCP-UI Client Props Expansion

### Overview

**Priority:** Low
**Effort:** 6-8 hours
**Target Release:** v4.1 (Q1 2025)
**Status:** Partially implemented

**Current State:**
- ✅ Basic `htmlProps` (style, className)
- ⚠️ `autoResize` acknowledged but not functional
- ❌ `customCSP` not implemented

**Why Implement:**
- Improved customization for UI resources
- Better developer experience
- Full MCP-UI client API compliance

---

### Technical Specification

#### Expanded htmlProps Interface

**File:** `/src/client/UIResourceRenderer.tsx` (UPDATE)

```typescript
export interface HTMLProps {
  /**
   * Inline styles for iframe
   */
  style?: React.CSSProperties;

  /**
   * CSS class name
   */
  className?: string;

  /**
   * Auto-resize iframe to content height
   * @default false
   */
  autoResize?: boolean;

  /**
   * Custom Content Security Policy
   * @default "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval';"
   */
  customCSP?: string;

  /**
   * Sandbox attributes (overrides default)
   * @default "allow-scripts"
   */
  sandbox?: string;

  /**
   * Allow fullscreen
   * @default false
   */
  allowFullscreen?: boolean;

  /**
   * Allow payment request
   * @default false
   */
  allowPaymentRequest?: boolean;

  /**
   * Referrer policy
   * @default "strict-origin-when-cross-origin"
   */
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;

  /**
   * Loading strategy
   * @default "lazy"
   */
  loading?: 'lazy' | 'eager';

  /**
   * Title for iframe
   */
  title?: string;

  /**
   * ID for iframe element
   */
  id?: string;

  /**
   * Minimum height in pixels
   */
  minHeight?: number;

  /**
   * Maximum height in pixels
   */
  maxHeight?: number;
}
```

---

### Implementation Plan

#### Phase 1: Auto-Resize Implementation (3-4 hours)

Auto-resize requires postMessage communication between iframe and parent to report content height.

**File:** `/src/client/HTMLResourceRenderer.tsx` (UPDATE)

```typescript
import React, { useRef, useEffect, useState } from 'react';

export const HTMLResourceRenderer: React.FC<HTMLResourceRendererProps> = ({
  resource,
  htmlProps = {},
  onUIAction,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number>(htmlProps.minHeight ?? 400);

  useEffect(() => {
    if (!htmlProps.autoResize) return;

    const handleResize = (event: MessageEvent) => {
      // Validate origin
      if (event.origin !== 'null' && !event.origin.startsWith('https://')) {
        return;
      }

      // Check if message is from our iframe
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      // Handle resize message
      if (event.data?.type === 'ui-resize') {
        const newHeight = event.data.height;

        // Apply min/max constraints
        let constrainedHeight = newHeight;
        if (htmlProps.minHeight && newHeight < htmlProps.minHeight) {
          constrainedHeight = htmlProps.minHeight;
        }
        if (htmlProps.maxHeight && newHeight > htmlProps.maxHeight) {
          constrainedHeight = htmlProps.maxHeight;
        }

        setHeight(constrainedHeight);
      }
    };

    window.addEventListener('message', handleResize);
    return () => window.removeEventListener('message', handleResize);
  }, [htmlProps.autoResize, htmlProps.minHeight, htmlProps.maxHeight]);

  // Inject auto-resize script into HTML content
  const processedHTML = htmlProps.autoResize
    ? injectAutoResizeScript(resource.text)
    : resource.text;

  return (
    <iframe
      ref={iframeRef}
      srcDoc={processedHTML}
      style={{
        width: '100%',
        height: htmlProps.autoResize ? `${height}px` : undefined,
        border: 'none',
        ...htmlProps.style,
      }}
      className={htmlProps.className}
      sandbox={htmlProps.sandbox ?? 'allow-scripts'}
      allow={buildAllowAttribute(htmlProps)}
      referrerPolicy={htmlProps.referrerPolicy ?? 'strict-origin-when-cross-origin'}
      loading={htmlProps.loading ?? 'lazy'}
      title={htmlProps.title ?? resource.name}
      id={htmlProps.id}
    />
  );
};

/**
 * Inject auto-resize script into HTML
 */
function injectAutoResizeScript(html: string): string {
  const script = `
    <script>
      (function() {
        let lastHeight = 0;

        function reportHeight() {
          const height = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
          );

          // Only report if height changed
          if (height !== lastHeight) {
            lastHeight = height;
            window.parent.postMessage({
              type: 'ui-resize',
              height: height
            }, '*');
          }
        }

        // Report initial height
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', reportHeight);
        } else {
          reportHeight();
        }

        // Watch for DOM changes
        const observer = new MutationObserver(reportHeight);
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true
        });

        // Watch for window resize
        window.addEventListener('resize', reportHeight);

        // Periodic check (fallback)
        setInterval(reportHeight, 500);
      })();
    </script>
  `;

  // Insert before closing </body> tag if exists, otherwise before </html>
  if (html.includes('</body>')) {
    return html.replace('</body>', `${script}</body>`);
  } else if (html.includes('</html>')) {
    return html.replace('</html>', `${script}</html>`);
  } else {
    return html + script;
  }
}

/**
 * Build iframe 'allow' attribute from props
 */
function buildAllowAttribute(props: HTMLProps): string {
  const permissions: string[] = [];

  if (props.allowFullscreen) {
    permissions.push('fullscreen');
  }

  if (props.allowPaymentRequest) {
    permissions.push('payment');
  }

  return permissions.length > 0 ? permissions.join('; ') : undefined;
}
```

---

#### Phase 2: Custom CSP Support (2-3 hours)

**File:** `/src/client/HTMLResourceRenderer.tsx` (UPDATE)

```typescript
/**
 * Apply custom CSP to iframe via meta tag injection
 */
function applyCustomCSP(html: string, csp?: string): string {
  if (!csp) return html;

  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;

  // Insert in <head> if exists
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>${cspMeta}`);
  } else if (html.includes('<html>')) {
    return html.replace('<html>', `<html><head>${cspMeta}</head>`);
  } else {
    return `<head>${cspMeta}</head>${html}`;
  }
}

// Update processedHTML generation
const processedHTML = (() => {
  let html = resource.text;

  // Apply auto-resize if enabled
  if (htmlProps.autoResize) {
    html = injectAutoResizeScript(html);
  }

  // Apply custom CSP if provided
  if (htmlProps.customCSP) {
    html = applyCustomCSP(html, htmlProps.customCSP);
  }

  return html;
})();
```

---

#### Phase 3: Testing (2-3 hours)

**File:** `/tests/unit/client/html-props.test.tsx` (NEW)

```typescript
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { HTMLResourceRenderer } from '../../../src/client/HTMLResourceRenderer';

describe('HTMLResourceRenderer Props', () => {
  const mockResource = {
    uri: 'ui://test/component',
    mimeType: 'text/html',
    text: '<div id="content">Hello World</div>',
    name: 'Test Component',
  };

  describe('autoResize', () => {
    it('should inject auto-resize script when enabled', () => {
      const { container } = render(
        <HTMLResourceRenderer
          resource={mockResource}
          htmlProps={{ autoResize: true }}
        />
      );

      const iframe = container.querySelector('iframe');
      expect(iframe?.getAttribute('srcDoc')).toContain('ui-resize');
    });

    it('should update height on resize message', async () => {
      const { container } = render(
        <HTMLResourceRenderer
          resource={mockResource}
          htmlProps={{ autoResize: true, minHeight: 200 }}
        />
      );

      const iframe = container.querySelector('iframe')!;

      // Simulate resize message from iframe
      window.postMessage({ type: 'ui-resize', height: 600 }, '*');

      await waitFor(() => {
        expect(iframe.style.height).toBe('600px');
      });
    });

    it('should respect minHeight constraint', async () => {
      const { container } = render(
        <HTMLResourceRenderer
          resource={mockResource}
          htmlProps={{ autoResize: true, minHeight: 400 }}
        />
      );

      const iframe = container.querySelector('iframe')!;

      // Try to resize below minimum
      window.postMessage({ type: 'ui-resize', height: 200 }, '*');

      await waitFor(() => {
        expect(iframe.style.height).toBe('400px');
      });
    });

    it('should respect maxHeight constraint', async () => {
      const { container } = render(
        <HTMLResourceRenderer
          resource={mockResource}
          htmlProps={{ autoResize: true, maxHeight: 800 }}
        />
      );

      const iframe = container.querySelector('iframe')!;

      // Try to resize above maximum
      window.postMessage({ type: 'ui-resize', height: 1200 }, '*');

      await waitFor(() => {
        expect(iframe.style.height).toBe('800px');
      });
    });
  });

  describe('customCSP', () => {
    it('should inject custom CSP meta tag', () => {
      const customCSP = "default-src 'self'; script-src 'none';";

      const { container } = render(
        <HTMLResourceRenderer
          resource={mockResource}
          htmlProps={{ customCSP }}
        />
      );

      const iframe = container.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcDoc');

      expect(srcDoc).toContain('Content-Security-Policy');
      expect(srcDoc).toContain(customCSP);
    });
  });

  describe('sandbox', () => {
    it('should use default sandbox="allow-scripts"', () => {
      const { container } = render(
        <HTMLResourceRenderer resource={mockResource} />
      );

      const iframe = container.querySelector('iframe');
      expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts');
    });

    it('should allow custom sandbox attribute', () => {
      const { container } = render(
        <HTMLResourceRenderer
          resource={mockResource}
          htmlProps={{ sandbox: 'allow-scripts allow-same-origin' }}
        />
      );

      const iframe = container.querySelector('iframe');
      expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin');
    });
  });

  describe('allow attribute', () => {
    it('should add fullscreen permission', () => {
      const { container } = render(
        <HTMLResourceRenderer
          resource={mockResource}
          htmlProps={{ allowFullscreen: true }}
        />
      );

      const iframe = container.querySelector('iframe');
      expect(iframe?.getAttribute('allow')).toContain('fullscreen');
    });

    it('should add payment permission', () => {
      const { container } = render(
        <HTMLResourceRenderer
          resource={mockResource}
          htmlProps={{ allowPaymentRequest: true }}
        />
      );

      const iframe = container.querySelector('iframe');
      expect(iframe?.getAttribute('allow')).toContain('payment');
    });
  });

  describe('other props', () => {
    it('should apply referrerPolicy', () => {
      const { container } = render(
        <HTMLResourceRenderer
          resource={mockResource}
          htmlProps={{ referrerPolicy: 'no-referrer' }}
        />
      );

      const iframe = container.querySelector('iframe');
      expect(iframe?.getAttribute('referrerpolicy')).toBe('no-referrer');
    });

    it('should apply loading strategy', () => {
      const { container } = render(
        <HTMLResourceRenderer
          resource={mockResource}
          htmlProps={{ loading: 'eager' }}
        />
      );

      const iframe = container.querySelector('iframe');
      expect(iframe?.getAttribute('loading')).toBe('eager');
    });

    it('should apply title', () => {
      const { container } = render(
        <HTMLResourceRenderer
          resource={mockResource}
          htmlProps={{ title: 'Custom Title' }}
        />
      );

      const iframe = container.querySelector('iframe');
      expect(iframe?.getAttribute('title')).toBe('Custom Title');
    });
  });
});
```

---

### Effort Breakdown

| Task | Estimated Hours |
|------|-----------------|
| Auto-resize implementation | 3-4 |
| Custom CSP support | 2-3 |
| Additional props (sandbox, allow, etc.) | 1-2 |
| Testing | 2-3 |
| Documentation | 1 |
| **Total** | **9-13** |

**Revised Estimate:** 6-8 hours (basic implementation)

---

## Feature 3: Remote DOM Implementation

### Overview

**Priority:** Medium
**Effort:** 40-60 hours
**Target Release:** v4.2 (Q2 2025)
**Status:** Not implemented (protocol skeleton exists)

**Current State:**
- ⚠️ MIME type recognized (`application/vnd.mcp-ui.remote-dom+javascript`)
- ⚠️ Framework parameter parsing implemented
- ❌ Web Worker execution not implemented
- ❌ Component library not implemented
- ❌ DOM operation protocol not implemented
- ❌ JSON reconciliation not implemented

**Workaround:**
Custom React compiler (Babel-based) works for many use cases but is not compatible with official Remote DOM ecosystem from mcp-ui.

**Why Implement:**
- Full MCP-UI advanced feature compliance
- Access to official Remote DOM component ecosystem
- Maximum security isolation (Web Worker sandbox)
- Framework-agnostic architecture

**References:**
- Official MCP-UI spec: https://mcpui.dev
- Shopify Remote DOM: https://github.com/Shopify/remote-dom
- Simply-MCP docs: `/docs/guides/MCP_UI_PROTOCOL.md`
- Simply-MCP docs: `/docs/guides/REMOTE_DOM_ADVANCED.md`

---

### Technical Specification

#### Remote DOM Architecture

```
┌─────────────────────────────────────────────┐
│           Web Worker (Sandbox)               │
│  ┌────────────────────────────────────────┐  │
│  │  User's Remote DOM Script              │  │
│  │  - import React from 'react'           │  │
│  │  - export default () => <div>...</div> │  │
│  └───────────────┬────────────────────────┘  │
│                  │ Emits DOM operations       │
│  ┌───────────────▼────────────────────────┐  │
│  │  @remote-dom/core                      │  │
│  │  - Creates virtual DOM tree            │  │
│  │  - Generates JSON operations           │  │
│  └───────────────┬────────────────────────┘  │
│                  │ postMessage                │
└──────────────────┼────────────────────────────┘
                   │ JSON Operations
┌──────────────────▼────────────────────────────┐
│           Host Application (React)            │
│  ┌────────────────────────────────────────┐  │
│  │  RemoteDOMRenderer Component           │  │
│  │  - Receives JSON operations            │  │
│  │  - Validates operations                │  │
│  │  - Maps to component library           │  │
│  └───────────────┬────────────────────────┘  │
│  ┌───────────────▼────────────────────────┐  │
│  │  Component Library                     │  │
│  │  - Map<string, ReactComponent>         │  │
│  │  - button → <Button />                 │  │
│  │  - input → <Input />                   │  │
│  └───────────────┬────────────────────────┘  │
│  ┌───────────────▼────────────────────────┐  │
│  │  Native React Components               │  │
│  │  - Actual UI rendered in browser       │  │
│  └────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

### Implementation Plan

This is the most complex feature. Break it into 6 phases.

#### Phase 1: Web Worker Sandbox Setup (12-16 hours)

**Objective:** Create secure Web Worker environment for executing Remote DOM code.

**File:** `/src/client/remote-dom/worker/remote-dom-worker.ts` (NEW)

```typescript
/**
 * Web Worker for executing Remote DOM code in isolation
 */

import { RemoteRoot } from '@remote-dom/core';

// Worker message types
interface WorkerInitMessage {
  type: 'init';
  code: string;
  framework: 'react' | 'webcomponents';
}

interface WorkerOperationMessage {
  type: 'operation';
  operation: DOMOperation;
}

interface WorkerErrorMessage {
  type: 'error';
  error: string;
}

// DOM operation types
type DOMOperation =
  | { type: 'createElement'; id: string; tagName: string; props?: Record<string, any> }
  | { type: 'setAttribute'; elementId: string; name: string; value: any }
  | { type: 'appendChild'; parentId: string; childId: string }
  | { type: 'removeChild'; parentId: string; childId: string }
  | { type: 'setTextContent'; elementId: string; text: string }
  | { type: 'addEventListener'; elementId: string; event: string; handlerId: string }
  | { type: 'callHost'; action: string; payload: any };

/**
 * Initialize Remote DOM root and execute code
 */
async function initializeRemoteDOM(message: WorkerInitMessage): Promise<void> {
  try {
    // Create RemoteRoot from @remote-dom/core
    const root = new RemoteRoot({
      // Configure root to send operations to parent
      send(operation: DOMOperation) {
        self.postMessage({
          type: 'operation',
          operation,
        } as WorkerOperationMessage);
      },
    });

    // Import framework runtime
    if (message.framework === 'react') {
      await importReactRuntime(message.code, root);
    } else if (message.framework === 'webcomponents') {
      await importWebComponentsRuntime(message.code, root);
    } else {
      throw new Error(`Unsupported framework: ${message.framework}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    } as WorkerErrorMessage);
  }
}

/**
 * Import and execute React-based Remote DOM code
 */
async function importReactRuntime(code: string, root: RemoteRoot): Promise<void> {
  // Import React from CDN
  const React = await import('https://esm.sh/react@18');
  const ReactDOM = await import('https://esm.sh/react-dom@18/client');
  const RemoteDOMReact = await import('https://esm.sh/@remote-dom/react');

  // Create module scope with React globals
  const moduleScope = {
    React,
    ReactDOM,
    RemoteDOMReact,
    exports: {},
  };

  // Execute user code in module scope
  const moduleFunction = new Function(
    'React',
    'ReactDOM',
    'RemoteDOMReact',
    'exports',
    `
      ${code}
      return exports.default || exports;
    `
  );

  const Component = moduleFunction(
    React,
    ReactDOM,
    RemoteDOMReact,
    moduleScope.exports
  );

  // Render component to RemoteRoot
  const container = RemoteDOMReact.createRoot(root);
  container.render(React.createElement(Component));
}

/**
 * Import and execute Web Components-based Remote DOM code
 */
async function importWebComponentsRuntime(code: string, root: RemoteRoot): Promise<void> {
  // Import @remote-dom/core
  const RemoteDOMCore = await import('https://esm.sh/@remote-dom/core');

  // Execute user code
  const moduleFunction = new Function(
    'RemoteDOMCore',
    'root',
    `
      ${code}
      return exports.default || exports;
    `
  );

  moduleFunction(RemoteDOMCore, root);
}

// Worker message handler
self.addEventListener('message', async (event: MessageEvent) => {
  const message = event.data;

  switch (message.type) {
    case 'init':
      await initializeRemoteDOM(message as WorkerInitMessage);
      break;
    default:
      console.error('Unknown message type:', message.type);
  }
});
```

**File:** `/src/client/remote-dom/RemoteDOMWorkerManager.ts` (NEW)

```typescript
import type { DOMOperation } from './types';

export interface RemoteDOMWorkerManagerOptions {
  /**
   * Callback for DOM operations
   */
  onOperation: (operation: DOMOperation) => void;

  /**
   * Callback for errors
   */
  onError: (error: string) => void;
}

export class RemoteDOMWorkerManager {
  private worker: Worker | null = null;
  private options: RemoteDOMWorkerManagerOptions;

  constructor(options: RemoteDOMWorkerManagerOptions) {
    this.options = options;
  }

  /**
   * Initialize worker and execute Remote DOM code
   */
  async initialize(code: string, framework: 'react' | 'webcomponents'): Promise<void> {
    // Create worker
    this.worker = new Worker(
      new URL('./worker/remote-dom-worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Setup message handler
    this.worker.onmessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case 'operation':
          this.options.onOperation(message.operation);
          break;
        case 'error':
          this.options.onError(message.error);
          break;
      }
    };

    // Setup error handler
    this.worker.onerror = (event: ErrorEvent) => {
      this.options.onError(event.message);
    };

    // Send init message
    this.worker.postMessage({
      type: 'init',
      code,
      framework,
    });
  }

  /**
   * Terminate worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
```

---

#### Phase 2: Component Library System (10-14 hours)

**Objective:** Create mapping from Remote DOM element names to React components.

**File:** `/src/client/remote-dom/component-library.ts` (UPDATE - expand existing)

```typescript
import React from 'react';

/**
 * Component library maps element names to React components
 */
export type ComponentLibrary = Map<string, React.ComponentType<any>>;

/**
 * Basic HTML component library
 */
export const basicComponentLibrary: ComponentLibrary = new Map([
  // Layout
  ['div', (props) => React.createElement('div', props)],
  ['span', (props) => React.createElement('span', props)],
  ['section', (props) => React.createElement('section', props)],
  ['article', (props) => React.createElement('article', props)],
  ['header', (props) => React.createElement('header', props)],
  ['footer', (props) => React.createElement('footer', props)],
  ['main', (props) => React.createElement('main', props)],
  ['aside', (props) => React.createElement('aside', props)],

  // Typography
  ['h1', (props) => React.createElement('h1', props)],
  ['h2', (props) => React.createElement('h2', props)],
  ['h3', (props) => React.createElement('h3', props)],
  ['h4', (props) => React.createElement('h4', props)],
  ['h5', (props) => React.createElement('h5', props)],
  ['h6', (props) => React.createElement('h6', props)],
  ['p', (props) => React.createElement('p', props)],
  ['strong', (props) => React.createElement('strong', props)],
  ['em', (props) => React.createElement('em', props)],
  ['code', (props) => React.createElement('code', props)],
  ['pre', (props) => React.createElement('pre', props)],

  // Lists
  ['ul', (props) => React.createElement('ul', props)],
  ['ol', (props) => React.createElement('ol', props)],
  ['li', (props) => React.createElement('li', props)],
  ['dl', (props) => React.createElement('dl', props)],
  ['dt', (props) => React.createElement('dt', props)],
  ['dd', (props) => React.createElement('dd', props)],

  // Forms
  ['form', (props) => React.createElement('form', props)],
  ['input', (props) => React.createElement('input', props)],
  ['textarea', (props) => React.createElement('textarea', props)],
  ['select', (props) => React.createElement('select', props)],
  ['option', (props) => React.createElement('option', props)],
  ['button', (props) => React.createElement('button', props)],
  ['label', (props) => React.createElement('label', props)],
  ['fieldset', (props) => React.createElement('fieldset', props)],
  ['legend', (props) => React.createElement('legend', props)],

  // Media
  ['img', (props) => React.createElement('img', props)],
  ['video', (props) => React.createElement('video', props)],
  ['audio', (props) => React.createElement('audio', props)],
  ['canvas', (props) => React.createElement('canvas', props)],
  ['svg', (props) => React.createElement('svg', props)],

  // Tables
  ['table', (props) => React.createElement('table', props)],
  ['thead', (props) => React.createElement('thead', props)],
  ['tbody', (props) => React.createElement('tbody', props)],
  ['tfoot', (props) => React.createElement('tfoot', props)],
  ['tr', (props) => React.createElement('tr', props)],
  ['th', (props) => React.createElement('th', props)],
  ['td', (props) => React.createElement('td', props)],

  // Links
  ['a', (props) => React.createElement('a', props)],

  // Other
  ['br', (props) => React.createElement('br', props)],
  ['hr', (props) => React.createElement('hr', props)],
]);

/**
 * UI component library (shadcn/ui style)
 */
export const uiComponentLibrary: ComponentLibrary = new Map([
  // Re-export basic components
  ...basicComponentLibrary,

  // Custom UI components
  ['ui-button', ButtonComponent],
  ['ui-input', InputComponent],
  ['ui-card', CardComponent],
  ['ui-dialog', DialogComponent],
  ['ui-tabs', TabsComponent],
  ['ui-select', SelectComponent],
  ['ui-checkbox', CheckboxComponent],
  ['ui-radio', RadioComponent],
  ['ui-switch', SwitchComponent],
  ['ui-slider', SliderComponent],
  ['ui-progress', ProgressComponent],
  ['ui-alert', AlertComponent],
  ['ui-badge', BadgeComponent],
  ['ui-avatar', AvatarComponent],
  ['ui-tooltip', TooltipComponent],
]);

// Example custom component
function ButtonComponent(props: {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      className={`ui-button variant-${props.variant ?? 'default'} size-${props.size ?? 'md'}`}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

// ... (define other components)

/**
 * Merge multiple component libraries
 */
export function mergeComponentLibraries(...libraries: ComponentLibrary[]): ComponentLibrary {
  const merged = new Map();
  for (const library of libraries) {
    for (const [name, component] of library) {
      merged.set(name, component);
    }
  }
  return merged;
}

/**
 * Create custom component library
 */
export function createComponentLibrary(
  components: Record<string, React.ComponentType<any>>
): ComponentLibrary {
  return new Map(Object.entries(components));
}
```

---

#### Phase 3: DOM Operation Protocol (8-12 hours)

**Objective:** Implement protocol for handling DOM operations from Web Worker.

**File:** `/src/client/remote-dom/types.ts` (UPDATE)

```typescript
export type DOMOperation =
  | CreateElementOperation
  | SetAttributeOperation
  | AppendChildOperation
  | RemoveChildOperation
  | SetTextContentOperation
  | AddEventListenerOperation
  | CallHostOperation;

export interface CreateElementOperation {
  type: 'createElement';
  id: string;
  tagName: string;
  props?: Record<string, any>;
}

export interface SetAttributeOperation {
  type: 'setAttribute';
  elementId: string;
  name: string;
  value: any;
}

export interface AppendChildOperation {
  type: 'appendChild';
  parentId: string;
  childId: string;
}

export interface RemoveChildOperation {
  type: 'removeChild';
  parentId: string;
  childId: string;
}

export interface SetTextContentOperation {
  type: 'setTextContent';
  elementId: string;
  text: string;
}

export interface AddEventListenerOperation {
  type: 'addEventListener';
  elementId: string;
  event: string;
  handlerId: string;
}

export interface CallHostOperation {
  type: 'callHost';
  action: 'tool' | 'link' | 'notify' | 'prompt' | 'intent';
  payload: any;
}

/**
 * Validate DOM operation structure
 */
export function validateDOMOperation(operation: any): operation is DOMOperation {
  if (!operation || typeof operation !== 'object') {
    return false;
  }

  switch (operation.type) {
    case 'createElement':
      return (
        typeof operation.id === 'string' &&
        typeof operation.tagName === 'string'
      );
    case 'setAttribute':
      return (
        typeof operation.elementId === 'string' &&
        typeof operation.name === 'string'
      );
    case 'appendChild':
    case 'removeChild':
      return (
        typeof operation.parentId === 'string' &&
        typeof operation.childId === 'string'
      );
    case 'setTextContent':
      return (
        typeof operation.elementId === 'string' &&
        typeof operation.text === 'string'
      );
    case 'addEventListener':
      return (
        typeof operation.elementId === 'string' &&
        typeof operation.event === 'string' &&
        typeof operation.handlerId === 'string'
      );
    case 'callHost':
      return (
        typeof operation.action === 'string' &&
        ['tool', 'link', 'notify', 'prompt', 'intent'].includes(operation.action)
      );
    default:
      return false;
  }
}
```

**File:** `/src/client/remote-dom/OperationProcessor.ts` (NEW)

```typescript
import type { DOMOperation } from './types';
import { validateDOMOperation } from './types';

export interface VirtualElement {
  id: string;
  tagName: string;
  props: Record<string, any>;
  children: string[]; // Child element IDs
  textContent?: string;
  eventHandlers: Map<string, string>; // event -> handlerId
}

export class OperationProcessor {
  private elements: Map<string, VirtualElement> = new Map();
  private rootId: string | null = null;

  /**
   * Process a single DOM operation
   */
  processOperation(operation: DOMOperation): void {
    // Validate operation
    if (!validateDOMOperation(operation)) {
      throw new Error('Invalid DOM operation');
    }

    switch (operation.type) {
      case 'createElement':
        this.createElement(operation.id, operation.tagName, operation.props);
        break;
      case 'setAttribute':
        this.setAttribute(operation.elementId, operation.name, operation.value);
        break;
      case 'appendChild':
        this.appendChild(operation.parentId, operation.childId);
        break;
      case 'removeChild':
        this.removeChild(operation.parentId, operation.childId);
        break;
      case 'setTextContent':
        this.setTextContent(operation.elementId, operation.text);
        break;
      case 'addEventListener':
        this.addEventListener(operation.elementId, operation.event, operation.handlerId);
        break;
      case 'callHost':
        // Handled separately by renderer
        break;
    }
  }

  private createElement(id: string, tagName: string, props: Record<string, any> = {}): void {
    if (this.elements.has(id)) {
      throw new Error(`Element with id ${id} already exists`);
    }

    const element: VirtualElement = {
      id,
      tagName,
      props,
      children: [],
      eventHandlers: new Map(),
    };

    this.elements.set(id, element);

    // First element is root
    if (this.rootId === null) {
      this.rootId = id;
    }
  }

  private setAttribute(elementId: string, name: string, value: any): void {
    const element = this.elements.get(elementId);
    if (!element) {
      throw new Error(`Element ${elementId} not found`);
    }

    element.props[name] = value;
  }

  private appendChild(parentId: string, childId: string): void {
    const parent = this.elements.get(parentId);
    const child = this.elements.get(childId);

    if (!parent) {
      throw new Error(`Parent element ${parentId} not found`);
    }
    if (!child) {
      throw new Error(`Child element ${childId} not found`);
    }

    if (!parent.children.includes(childId)) {
      parent.children.push(childId);
    }
  }

  private removeChild(parentId: string, childId: string): void {
    const parent = this.elements.get(parentId);

    if (!parent) {
      throw new Error(`Parent element ${parentId} not found`);
    }

    parent.children = parent.children.filter(id => id !== childId);
  }

  private setTextContent(elementId: string, text: string): void {
    const element = this.elements.get(elementId);

    if (!element) {
      throw new Error(`Element ${elementId} not found`);
    }

    element.textContent = text;
  }

  private addEventListener(elementId: string, event: string, handlerId: string): void {
    const element = this.elements.get(elementId);

    if (!element) {
      throw new Error(`Element ${elementId} not found`);
    }

    element.eventHandlers.set(event, handlerId);
  }

  /**
   * Get virtual element tree
   */
  getElement(id: string): VirtualElement | undefined {
    return this.elements.get(id);
  }

  /**
   * Get root element
   */
  getRootElement(): VirtualElement | undefined {
    if (this.rootId === null) {
      return undefined;
    }
    return this.elements.get(this.rootId);
  }

  /**
   * Clear all elements
   */
  clear(): void {
    this.elements.clear();
    this.rootId = null;
  }
}
```

---

#### Phase 4: JSON Reconciliation and React Rendering (6-8 hours)

**Objective:** Convert virtual element tree to React components.

**File:** `/src/client/remote-dom/RemoteDOMRenderer.tsx` (UPDATE - major rewrite)

```typescript
import React, { useEffect, useState, useCallback } from 'react';
import { RemoteDOMWorkerManager } from './RemoteDOMWorkerManager';
import { OperationProcessor } from './OperationProcessor';
import type { ComponentLibrary } from './component-library';
import { basicComponentLibrary } from './component-library';
import type { DOMOperation, VirtualElement } from './types';

export interface RemoteDOMRendererProps {
  /**
   * Remote DOM resource
   */
  resource: {
    uri: string;
    mimeType: string;
    text: string;
    name?: string;
  };

  /**
   * Component library for element mapping
   */
  library?: ComponentLibrary;

  /**
   * Framework ('react' or 'webcomponents')
   */
  framework?: 'react' | 'webcomponents';

  /**
   * UI action callback
   */
  onUIAction?: (action: any) => Promise<any>;

  /**
   * Error callback
   */
  onError?: (error: string) => void;
}

export const RemoteDOMRenderer: React.FC<RemoteDOMRendererProps> = ({
  resource,
  library = basicComponentLibrary,
  framework = 'react',
  onUIAction,
  onError,
}) => {
  const [processor] = useState(() => new OperationProcessor());
  const [workerManager] = useState(() => new RemoteDOMWorkerManager({
    onOperation: (operation: DOMOperation) => {
      if (operation.type === 'callHost') {
        // Handle host action
        onUIAction?.(operation.payload);
      } else {
        // Process DOM operation
        processor.processOperation(operation);
        // Trigger re-render
        setUpdateCounter(c => c + 1);
      }
    },
    onError: (error: string) => {
      console.error('[RemoteDOM] Error:', error);
      onError?.(error);
    },
  }));

  const [updateCounter, setUpdateCounter] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize worker
  useEffect(() => {
    const init = async () => {
      try {
        await workerManager.initialize(resource.text, framework);
        setIsInitialized(true);
      } catch (error) {
        console.error('[RemoteDOM] Initialization error:', error);
        onError?.(error instanceof Error ? error.message : String(error));
      }
    };

    init();

    return () => {
      workerManager.terminate();
    };
  }, [resource.text, framework]);

  // Render virtual element tree to React
  const renderElement = useCallback((elementId: string): React.ReactNode => {
    const element = processor.getElement(elementId);
    if (!element) {
      return null;
    }

    // Get component from library
    const Component = library.get(element.tagName);
    if (!Component) {
      console.warn(`Component not found for tag: ${element.tagName}`);
      return null;
    }

    // Render children
    const children = element.children.map(childId => (
      <React.Fragment key={childId}>
        {renderElement(childId)}
      </React.Fragment>
    ));

    // Add text content if present
    if (element.textContent && children.length === 0) {
      children.push(element.textContent);
    }

    // Create event handlers from eventHandlers map
    const eventProps: Record<string, () => void> = {};
    for (const [event, handlerId] of element.eventHandlers) {
      eventProps[`on${event.charAt(0).toUpperCase()}${event.slice(1)}`] = () => {
        // Trigger event in worker
        // This would require additional postMessage implementation
        console.log('Event triggered:', event, handlerId);
      };
    }

    // Merge props with event handlers
    const props = {
      ...element.props,
      ...eventProps,
      key: element.id,
    };

    return React.createElement(Component, props, ...children);
  }, [processor, library, updateCounter]);

  if (!isInitialized) {
    return <div>Loading Remote DOM...</div>;
  }

  const rootElement = processor.getRootElement();
  if (!rootElement) {
    return <div>No root element</div>;
  }

  return <>{renderElement(rootElement.id)}</>;
};
```

---

#### Phase 5: Framework Detection and Error Handling (4-6 hours)

**File:** `/src/features/ui/ui-resource.ts` (UPDATE)

```typescript
/**
 * Detect framework from MIME type
 */
export function detectFramework(mimeType: string): 'react' | 'webcomponents' | null {
  const match = mimeType.match(/framework=(\w+)/);
  if (!match) return null;

  const framework = match[1].toLowerCase();
  if (framework === 'react' || framework === 'webcomponents') {
    return framework;
  }

  return null;
}

/**
 * Validate Remote DOM code before execution
 */
export function validateRemoteDOMCode(code: string, framework: 'react' | 'webcomponents'): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for disallowed globals
  const disallowedGlobals = [
    'window',
    'document',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'fetch', // Could allow with restrictions
    'XMLHttpRequest',
    'eval',
    'Function',
  ];

  for (const global of disallowedGlobals) {
    if (new RegExp(`\\b${global}\\b`).test(code)) {
      errors.push(`Disallowed global: ${global}`);
    }
  }

  // Check for framework-specific requirements
  if (framework === 'react') {
    if (!code.includes('React')) {
      errors.push('React not imported');
    }
    if (!code.includes('export default') && !code.includes('exports.default')) {
      errors.push('No default export found');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

#### Phase 6: Testing and Documentation (8-12 hours)

**File:** `/tests/unit/client/remote-dom-renderer.test.tsx` (UPDATE - expand)

```typescript
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { RemoteDOMRenderer } from '../../../src/client/remote-dom/RemoteDOMRenderer';

describe('RemoteDOMRenderer', () => {
  const mockResource = {
    uri: 'ui://test/remote-dom',
    mimeType: 'application/vnd.mcp-ui.remote-dom+javascript; framework=react',
    text: `
      import React from 'react';
      export default () => <div>Hello from Remote DOM</div>;
    `,
    name: 'Remote DOM Test',
  };

  it('should render Remote DOM component', async () => {
    const { container } = render(
      <RemoteDOMRenderer resource={mockResource} />
    );

    await waitFor(() => {
      expect(container.textContent).toContain('Hello from Remote DOM');
    });
  });

  it('should handle DOM operations', async () => {
    // Test createElement, appendChild, etc.
  });

  it('should handle event listeners', async () => {
    // Test addEventListener and event triggering
  });

  it('should validate code before execution', async () => {
    const invalidResource = {
      ...mockResource,
      text: `
        import React from 'react';
        window.alert('XSS');
        export default () => <div>Malicious</div>;
      `,
    };

    const onError = jest.fn();

    render(
      <RemoteDOMRenderer
        resource={invalidResource}
        onError={onError}
      />
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.stringContaining('Disallowed global: window'));
    });
  });

  it('should use custom component library', async () => {
    // Test with custom components
  });
});
```

**File:** `/docs/guides/REMOTE_DOM_ADVANCED.md` (UPDATE)

Add comprehensive Remote DOM documentation:
- Architecture overview
- Security model
- Component library guide
- Framework support (React vs Web Components)
- Event handling
- Best practices
- Examples

---

### Dependencies

```json
{
  "dependencies": {
    "@remote-dom/core": "^2.0.0",
    "@remote-dom/react": "^2.0.0"
  }
}
```

---

### Effort Breakdown

| Phase | Task | Estimated Hours |
|-------|------|-----------------|
| 1 | Web Worker sandbox setup | 12-16 |
| 2 | Component library system | 10-14 |
| 3 | DOM operation protocol | 8-12 |
| 4 | JSON reconciliation and React rendering | 6-8 |
| 5 | Framework detection and error handling | 4-6 |
| 6 | Testing and documentation | 8-12 |
| **Total** | | **48-68** |

**Revised Estimate:** 40-60 hours (with some task overlap)

---

## Feature 4: Metrics and Telemetry

### Overview

**Priority:** Low-Medium
**Effort:** 8-12 hours
**Target Release:** v4.1 (Q1 2025)
**Status:** Not implemented

**Why Implement:**
- Production monitoring and observability
- Performance tracking
- Error tracking and debugging
- Usage analytics

---

### Implementation Plan (Brief)

**Phase 1: Metrics Collection (4-5 hours)**

Track:
- Request counts (by method)
- Response times
- Error rates
- Batch processing metrics
- Transport-specific metrics

**Phase 2: Metrics Reporting (2-3 hours)**

Export to:
- Prometheus
- StatsD
- CloudWatch
- Custom endpoints

**Phase 3: Testing and Documentation (2-4 hours)**

---

## Additional Enhancements

### 5.1 Theme System for UI Components

**Effort:** 8-12 hours
**Target:** v4.2

- Dark/light mode support
- Custom color schemes
- CSS variable-based theming
- Theme propagation to iframes

### 5.2 Performance Monitoring

**Effort:** 6-8 hours
**Target:** v4.1

- Request timing
- Memory usage
- CPU profiling
- Bottleneck detection

### 5.3 Advanced OAuth Features

**Effort:** 12-16 hours
**Target:** v4.3

- Multi-provider support
- Token rotation
- Advanced scope management
- OIDC support

---

## Implementation Roadmap

### v4.1 Release (Q1 2025)

**Timeline:** 4-6 weeks after v4.0
**Total Effort:** 24-32 hours

**Features:**
1. WebSocket Transport (8-12 hours) - **PRIORITY 1**
2. MCP-UI Client Props (6-8 hours) - **PRIORITY 2**
3. Metrics and Telemetry (8-12 hours) - **PRIORITY 3**

**Dependencies:**
- WebSocket: ws package
- Client Props: None
- Metrics: prometheus-client or statsd-client

**Success Criteria:**
- All tests passing
- Documentation complete
- Examples working
- Performance benchmarks meet targets

---

### v4.2 Release (Q2 2025)

**Timeline:** 8-12 weeks after v4.1
**Total Effort:** 60-80 hours

**Features:**
1. Remote DOM Implementation (40-60 hours) - **MAJOR FEATURE**
2. Component Library Expansion (12-16 hours)
3. Theme System (8-12 hours)

**Dependencies:**
- @remote-dom/core
- @remote-dom/react
- Component library (shadcn/ui or custom)

**Success Criteria:**
- Full mcp-ui ecosystem compatibility
- All Remote DOM tests passing
- Component library with 20+ components
- Theme system functional

---

## Testing Requirements

### Unit Tests Required

**WebSocket Transport:**
- [ ] WebSocketServerTransport creation
- [ ] WebSocketClientTransport creation
- [ ] Message sending/receiving
- [ ] Heartbeat mechanism
- [ ] Reconnection logic
- [ ] Error handling
- [ ] Connection lifecycle

**MCP-UI Client Props:**
- [ ] Auto-resize functionality
- [ ] Height constraints (min/max)
- [ ] Custom CSP injection
- [ ] Sandbox attribute handling
- [ ] Allow attribute (fullscreen, payment)
- [ ] Loading strategies
- [ ] Referrer policy

**Remote DOM:**
- [ ] Worker initialization
- [ ] DOM operation processing
- [ ] Component library mapping
- [ ] React reconciliation
- [ ] Event handling
- [ ] Error handling
- [ ] Security validation
- [ ] Framework detection

---

### Integration Tests Required

**WebSocket Transport:**
- [ ] Full client-server communication
- [ ] Multiple concurrent clients
- [ ] Connection recovery
- [ ] Large message handling
- [ ] Performance benchmarks

**Remote DOM:**
- [ ] End-to-end Remote DOM rendering
- [ ] React components
- [ ] Web Components
- [ ] Event propagation
- [ ] Host action calls
- [ ] Error scenarios

---

### E2E Tests Required

- [ ] WebSocket server with MCP Inspector
- [ ] Remote DOM with official mcp-ui client
- [ ] Complete UI workflow with all features

---

## Documentation Requirements

### New Guides Required

**WebSocket Transport:**
- [ ] `/docs/guides/TRANSPORT.md` - Add WebSocket section
- [ ] `/examples/interface-websocket.ts` - Working example
- [ ] Migration guide from SSE to WebSocket

**MCP-UI Client Props:**
- [ ] Update `/docs/guides/MCP_UI_PROTOCOL.md`
- [ ] Add examples for each prop
- [ ] Auto-resize best practices

**Remote DOM:**
- [ ] `/docs/guides/REMOTE_DOM_IMPLEMENTATION.md` - Full guide
- [ ] Component library reference
- [ ] Security guidelines
- [ ] Framework comparison (React vs Web Components)
- [ ] Troubleshooting guide

---

### API Reference Updates

- [ ] Update type definitions documentation
- [ ] Add WebSocket types
- [ ] Add Remote DOM types
- [ ] Update htmlProps interface docs

---

## Success Criteria

### v4.1 Success Criteria

- ✅ WebSocket transport functional
- ✅ All existing tests still passing
- ✅ New tests for WebSocket (>90% coverage)
- ✅ Documentation complete
- ✅ Examples working
- ✅ Performance: WebSocket latency <30ms
- ✅ Client props expansion complete
- ✅ Metrics collection functional

### v4.2 Success Criteria

- ✅ Remote DOM fully functional
- ✅ Compatible with official mcp-ui ecosystem
- ✅ Component library with 20+ components
- ✅ All Remote DOM tests passing (>90% coverage)
- ✅ Security validation passing
- ✅ Documentation comprehensive
- ✅ Theme system functional

---

## Risk Mitigation

### WebSocket Transport Risks

**Risk:** WebSocket library compatibility issues
**Mitigation:** Use well-established `ws` package with 50M+ downloads/week

**Risk:** Connection instability in production
**Mitigation:** Implement robust reconnection logic with exponential backoff

---

### Remote DOM Risks

**Risk:** Shopify @remote-dom dependency changes
**Mitigation:** Pin versions, monitor updates, maintain fork if necessary

**Risk:** Security vulnerabilities in user code execution
**Mitigation:** Multi-layer security (Web Worker isolation, CSP, code validation)

**Risk:** Performance issues with complex UIs
**Mitigation:** Operation batching, lazy loading, performance testing

---

## File References

### Existing Files to Update

- `/src/server/interface-types.ts` - Add WebSocket config to IServer
- `/src/cli/run.ts` - Add WebSocket server startup
- `/src/client/UIResourceRenderer.tsx` - Expand htmlProps
- `/src/client/RemoteDOMRenderer.tsx` - Complete implementation
- `/docs/guides/TRANSPORT.md` - Add WebSocket section
- `/docs/guides/MCP_UI_PROTOCOL.md` - Add Remote DOM section
- `/docs/guides/REMOTE_DOM_ADVANCED.md` - Expand with implementation details

### New Files to Create

- `/src/transports/websocket-server.ts` - WebSocket server transport
- `/src/client/WebSocketClient.ts` - WebSocket client transport
- `/src/cli/servers/websocket-server.ts` - WebSocket server runner
- `/src/client/remote-dom/worker/remote-dom-worker.ts` - Web Worker
- `/src/client/remote-dom/RemoteDOMWorkerManager.ts` - Worker manager
- `/src/client/remote-dom/OperationProcessor.ts` - Operation processor
- `/tests/integration/websocket-transport.test.ts` - WebSocket tests
- `/tests/unit/client/html-props.test.tsx` - Client props tests
- `/tests/unit/client/remote-dom-renderer.test.tsx` - Remote DOM tests (expand)
- `/examples/interface-websocket.ts` - WebSocket example

---

## Conclusion

This handoff provides a comprehensive, step-by-step implementation plan for all missing features identified in the v4.0 gap analysis. Each feature includes:

- ✅ Technical specifications
- ✅ Detailed implementation plans with code examples
- ✅ File paths and references
- ✅ Dependencies and requirements
- ✅ Testing requirements
- ✅ Documentation requirements
- ✅ Effort estimates
- ✅ Risk mitigation strategies

**Next Steps:**
1. Review and approve roadmap
2. Prioritize features (recommend v4.1 → v4.2 order)
3. Begin implementation with WebSocket transport (highest ROI)
4. Use this document as implementation guide

**Total Estimated Effort:**
- v4.1: 24-32 hours (2-4 weeks)
- v4.2: 60-80 hours (6-10 weeks)
- **Grand Total:** 84-112 hours (8-14 weeks)

---

**Document Version:** 1.0
**Last Updated:** November 2, 2025
**Status:** Ready for Implementation
