# Phase 2 Architecture: Notifications & Session Enhancement

**Status**: Planning
**Phase**: FastMCP Parity - Phase 2
**Dependencies**: Phase 1 (Context System) - COMPLETE

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Component Design](#component-design)
4. [MCP SDK Integration Points](#mcp-sdk-integration-points)
5. [Data Flow](#data-flow)
6. [Client Capability Detection](#client-capability-detection)
7. [Error Handling Strategy](#error-handling-strategy)
8. [Backward Compatibility](#backward-compatibility)
9. [Security Considerations](#security-considerations)

---

## Executive Summary

Phase 2 implements MCP notification capabilities and session enhancements to achieve parity with FastMCP's session features. This phase focuses on enabling bidirectional communication between server and client through:

- **Client capability detection** during initialization
- **Logging notifications** for server-to-client log messages
- **List change notifications** for dynamic resource/tool/prompt updates
- **Progress notifications** for long-running operations
- **LLM sampling requests** for server-initiated AI completions

**Key Principle**: Use ONLY MCP SDK primitives (NOT FastMCP library dependencies)

**Implementation Strategy**: Three-layer progressive enhancement
- Layer 1: Client capabilities + logging (foundation)
- Layer 2: List changed notifications (dynamic updates)
- Layer 3: Progress + sampling (advanced features)

---

## Architecture Overview

### System Architecture Diagram (Text-Based)

```
┌─────────────────────────────────────────────────────────────────┐
│                         MCP Client                               │
│  (Claude Desktop, CLI, Custom Client)                           │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ MCP Protocol (JSON-RPC)
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│                    BuildMCPServer                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              MCP Server Instance                          │  │
│  │  (from @modelcontextprotocol/sdk)                        │  │
│  │                                                           │  │
│  │  Methods Used:                                           │  │
│  │  - getClientCapabilities() → ClientCapabilities          │  │
│  │  - sendLoggingMessage(params)                           │  │
│  │  - sendResourceUpdated(params)                          │  │
│  │  - sendResourceListChanged()                            │  │
│  │  - sendToolListChanged()                                │  │
│  │  - sendPromptListChanged()                              │  │
│  │  - notification(ProgressNotificationSchema, params)     │  │
│  │  - createMessage(params) → CreateMessageResult          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                       │
│                          │ passed to                             │
│                          ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              ContextBuilder                               │  │
│  │                                                           │  │
│  │  - Stores: Server (MCP SDK instance)                     │  │
│  │  - Stores: ClientCapabilities (from initialize)          │  │
│  │  - Creates: SessionImpl instances                        │  │
│  │  - Method: setClientParams(initializeRequest)            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                       │
│                          │ creates per-request                   │
│                          ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Context                                  │  │
│  │                                                           │  │
│  │  - fastmcp: FastMCPInfo (server metadata)               │  │
│  │  - session: SessionImpl (notification methods)           │  │
│  │  - request_context: RequestContext (request ID, meta)    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                       │
│                          │ injected into                         │
│                          ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          Tool/Prompt/Resource Handlers                    │  │
│  │                                                           │  │
│  │  async (args, context) => {                              │  │
│  │    // Access notifications via context.session           │  │
│  │    await context.session.send_log_message(...)           │  │
│  │    await context.session.send_progress_notification(...) │  │
│  │    const result = await context.session.create_message() │  │
│  │  }                                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

1. **BuildMCPServer** (`src/api/programmatic/BuildMCPServer.ts`)
   - Entry point for MCP server lifecycle
   - Owns MCP Server instance (`this.server`)
   - Manages initialize handler to capture client capabilities
   - Passes server instance to ContextBuilder

2. **ContextBuilder** (`src/core/ContextBuilder.ts`)
   - Stores MCP Server reference
   - Stores ClientCapabilities from initialize request
   - Creates SessionImpl instances with server + capabilities
   - Builds Context objects per request

3. **SessionImpl** (`src/core/SessionImpl.ts`)
   - Implements Session interface methods
   - Holds references to MCP Server and ClientCapabilities
   - Translates high-level API calls to MCP SDK calls
   - Handles errors gracefully (missing capabilities)

4. **Context Interface** (`src/core/Context.ts`)
   - Exposes session via `context.session`
   - No changes needed (interface already defined)

---

## Component Design

### 1. SessionImpl Enhancement

**Current State** (Phase 1):
```typescript
export class SessionImpl implements Session {
  readonly client_params = undefined; // Phase 2

  async send_log_message(...) {
    console.warn('not yet implemented');
  }
  // ... all methods are stubs
}
```

**Phase 2 Design**:
```typescript
export class SessionImpl implements Session {
  private mcpServer: Server;
  private clientCapabilities?: ClientCapabilities;

  constructor(server: Server, capabilities?: ClientCapabilities) {
    this.mcpServer = server;
    this.clientCapabilities = capabilities;
  }

  get client_params(): ClientCapabilities | undefined {
    return this.clientCapabilities;
  }

  // Real implementations using MCP SDK...
}
```

**Key Changes**:
- Add private `mcpServer` field
- Add private `clientCapabilities` field
- Add constructor to accept both
- Implement all notification methods using MCP SDK
- Make `client_params` a getter returning capabilities

### 2. ContextBuilder Enhancement

**Current State** (Phase 1):
```typescript
export class ContextBuilder {
  private mcpServer: Server;
  private sessionImpl: SessionImpl;

  constructor(server: Server, options: ContextBuilderOptions) {
    this.mcpServer = server;
    this.sessionImpl = new SessionImpl(); // No args
  }

  setClientParams(params: {...}): void {
    // No-op stub
  }
}
```

**Phase 2 Design**:
```typescript
export class ContextBuilder {
  private mcpServer: Server;
  private sessionImpl: SessionImpl;
  private clientCapabilities?: ClientCapabilities;

  constructor(server: Server, options: ContextBuilderOptions) {
    this.mcpServer = server;
    // SessionImpl created AFTER setClientParams() called
    this.sessionImpl = new SessionImpl(server, undefined);
  }

  setClientParams(params: {
    clientInfo: { name: string; version: string };
    capabilities: ClientCapabilities;
  }): void {
    // Store capabilities
    this.clientCapabilities = params.capabilities;

    // Recreate SessionImpl with capabilities
    this.sessionImpl = new SessionImpl(
      this.mcpServer,
      this.clientCapabilities
    );
  }
}
```

**Key Changes**:
- Add `clientCapabilities` field
- Pass server + capabilities to SessionImpl constructor
- Implement `setClientParams()` to store capabilities and recreate session

### 3. BuildMCPServer Initialize Handler

**Location**: `BuildMCPServer.start()` method

**Current State**: Initialize handler not explicitly set

**Phase 2 Design**: Add initialize handler registration

```typescript
private async start(options: StartOptions = {}): Promise<void> {
  // ... existing code ...

  this.server = new Server(
    { name: this.options.name, version: this.options.version },
    { capabilities: {...} }
  );

  this.contextBuilder = new ContextBuilder(this.server, {...});

  // NEW: Register initialize handler to capture client capabilities
  this.server.setRequestHandler(InitializeRequestSchema, async (request) => {
    const clientInfo = request.params.clientInfo;
    const capabilities = request.params.capabilities;

    // Pass to ContextBuilder
    this.contextBuilder?.setClientParams({
      clientInfo,
      capabilities
    });

    // MCP SDK will auto-respond with server capabilities
    // We just need to capture the client's capabilities
  });

  // ... rest of handlers ...
}
```

**Note**: MCP SDK Server class has built-in initialize handling. We need to check if we can hook into it or if we need to override it.

---

## MCP SDK Integration Points

### Available MCP Server Methods

From `@modelcontextprotocol/sdk/server/index.d.ts`:

```typescript
class Server {
  // Capability queries
  getClientCapabilities(): ClientCapabilities | undefined;
  getClientVersion(): Implementation | undefined;

  // Notification methods (ready to use!)
  sendLoggingMessage(
    params: LoggingMessageNotification['params'],
    sessionId?: string
  ): Promise<void>;

  sendResourceUpdated(
    params: ResourceUpdatedNotification['params']
  ): Promise<void>;

  sendResourceListChanged(): Promise<void>;
  sendToolListChanged(): Promise<void>;
  sendPromptListChanged(): Promise<void>;

  // Request methods
  createMessage(
    params: CreateMessageRequest['params'],
    options?: RequestOptions
  ): Promise<CreateMessageResult>;

  // Generic notification method
  notification(
    notification: Notification,
    options?: NotificationOptions
  ): Promise<void>;
}
```

### Notification Schemas

From `@modelcontextprotocol/sdk/types.js`:

```typescript
// Logging notification
LoggingMessageNotificationSchema
// Method: "notifications/message"
// Params: { level, logger?, data }

// Progress notification
ProgressNotificationSchema
// Method: "notifications/progress"
// Params: { progressToken, progress, total?, message? }

// Resource notifications
ResourceUpdatedNotificationSchema
// Method: "notifications/resources/updated"
// Params: { uri }

ResourceListChangedNotificationSchema
// Method: "notifications/resources/list_changed"
// Params: {}

// Tool notification
ToolListChangedNotificationSchema
// Method: "notifications/tools/list_changed"
// Params: {}

// Prompt notification
PromptListChangedNotificationSchema
// Method: "notifications/prompts/list_changed"
// Params: {}

// Sampling request
CreateMessageRequestSchema
// Method: "sampling/createMessage"
// Params: { messages, maxTokens?, temperature?, ... }
```

### Integration Strategy

**Use High-Level Methods Where Available**:
- `server.sendLoggingMessage()` ✅ (exists)
- `server.sendResourceUpdated()` ✅ (exists)
- `server.sendResourceListChanged()` ✅ (exists)
- `server.sendToolListChanged()` ✅ (exists)
- `server.sendPromptListChanged()` ✅ (exists)
- `server.createMessage()` ✅ (exists)

**For Progress Notification**:
```typescript
// Server class doesn't have sendProgressNotification()
// We need to use generic notification() method

await server.notification({
  method: 'notifications/progress',
  params: {
    progressToken,
    progress,
    total,
    message
  }
});
```

---

## Data Flow

### Flow 1: Initialize & Capability Capture

```
1. Client connects to server
   ↓
2. Client sends initialize request
   {
     "method": "initialize",
     "params": {
       "protocolVersion": "2025-03-26",
       "clientInfo": { "name": "Claude Desktop", "version": "1.0" },
       "capabilities": {
         "sampling": {},
         "roots": { "listChanged": true }
       }
     }
   }
   ↓
3. BuildMCPServer initialize handler receives request
   ↓
4. Handler calls contextBuilder.setClientParams()
   ↓
5. ContextBuilder stores capabilities
   ↓
6. ContextBuilder recreates SessionImpl with capabilities
   ↓
7. Server responds with server capabilities
   {
     "result": {
       "protocolVersion": "2025-03-26",
       "serverInfo": { "name": "my-server", "version": "1.0.0" },
       "capabilities": { "tools": {}, "resources": {} }
     }
   }
```

### Flow 2: Tool Execution with Logging

```
1. Client calls tool
   {
     "method": "tools/call",
     "params": { "name": "greet", "arguments": { "name": "Alice" } }
   }
   ↓
2. BuildMCPServer CallToolRequestSchema handler invoked
   ↓
3. Handler builds Context using contextBuilder.buildContext()
   ↓
4. Context includes SessionImpl with MCP Server reference
   ↓
5. Tool execute function called with context
   async (args, context) => {
     await context.session.send_log_message('info', 'Processing...');
     return `Hello, ${args.name}!`;
   }
   ↓
6. SessionImpl.send_log_message() called
   ↓
7. SessionImpl uses mcpServer.sendLoggingMessage()
   ↓
8. MCP SDK sends notification to client
   {
     "method": "notifications/message",
     "params": { "level": "info", "data": "Processing..." }
   }
   ↓
9. Tool execution completes, result returned to client
```

### Flow 3: Progress Notification

```
1. Client calls long-running tool with progressToken
   {
     "method": "tools/call",
     "params": {
       "name": "processLargeFile",
       "arguments": { "file": "data.csv" },
       "_meta": { "progressToken": "token-123" }
     }
   }
   ↓
2. Tool handler extracts progressToken from context.request_context.meta
   ↓
3. Tool sends progress updates
   async (args, context) => {
     const token = context.request_context.meta?.progressToken;
     if (token) {
       for (let i = 0; i < 100; i += 10) {
         await context.session.send_progress_notification(
           token, i, 100, `Processing row ${i}`
         );
         // ... do work ...
       }
     }
     return result;
   }
   ↓
4. SessionImpl.send_progress_notification() validates token exists
   ↓
5. SessionImpl uses mcpServer.notification() with ProgressNotificationSchema
   ↓
6. Client receives progress notifications
   {
     "method": "notifications/progress",
     "params": {
       "progressToken": "token-123",
       "progress": 10,
       "total": 100,
       "message": "Processing row 10"
     }
   }
```

### Flow 4: LLM Sampling (create_message)

```
1. Tool needs LLM assistance
   async (args, context) => {
     const response = await context.session.create_message([
       { role: 'user', content: { type: 'text', text: 'Summarize this' } }
     ], { maxTokens: 100 });

     return response.content.text;
   }
   ↓
2. SessionImpl.create_message() checks client capabilities
   if (!this.clientCapabilities?.sampling) {
     throw new Error('Client does not support sampling');
   }
   ↓
3. SessionImpl uses mcpServer.createMessage()
   ↓
4. MCP SDK sends sampling request to client
   {
     "method": "sampling/createMessage",
     "params": {
       "messages": [...],
       "maxTokens": 100
     }
   }
   ↓
5. Client invokes LLM and responds
   {
     "result": {
       "model": "claude-3-5-sonnet-20250131",
       "role": "assistant",
       "content": { "type": "text", "text": "Summary here..." },
       "stopReason": "endTurn"
     }
   }
   ↓
6. Promise resolves in tool handler with result
```

---

## Client Capability Detection

### Capabilities Structure

From MCP initialize request:
```typescript
interface ClientCapabilities {
  // Experimental capabilities
  experimental?: Record<string, object>;

  // Root directory change notifications
  roots?: {
    listChanged?: boolean;
  };

  // LLM sampling capability
  sampling?: object;
}
```

### Detection Strategy

**During Initialize**:
```typescript
// BuildMCPServer initialize handler
this.server.setRequestHandler(InitializeRequestSchema, async (request) => {
  const capabilities = request.params.capabilities;

  // Pass to ContextBuilder
  this.contextBuilder?.setClientParams({
    clientInfo: request.params.clientInfo,
    capabilities: capabilities
  });
});
```

**Alternative: Use Built-in Method** (if available):
```typescript
// In SessionImpl methods, check capabilities
async create_message(...): Promise<CreateMessageResult> {
  // Use MCP SDK's built-in capability check
  const caps = this.mcpServer.getClientCapabilities();

  if (!caps?.sampling) {
    throw new Error(
      'Client does not support sampling capability.\n\n' +
      'What went wrong:\n' +
      '  The connected client has not advertised sampling support.\n\n' +
      'To fix:\n' +
      '  1. Use a client that supports MCP sampling (e.g., Claude Desktop)\n' +
      '  2. Check client configuration for sampling capability\n' +
      '  3. Update client to latest version\n\n' +
      'Documentation: https://modelcontextprotocol.io/docs/concepts/sampling'
    );
  }

  return await this.mcpServer.createMessage(params);
}
```

### Capability-Based Feature Gating

| Feature | Required Capability | Behavior if Missing |
|---------|-------------------|---------------------|
| `send_log_message()` | None (always available) | Always works |
| `send_progress_notification()` | None (client should handle) | Send anyway, client ignores if not supported |
| `send_resource_updated()` | None | Always works |
| `send_resource_list_changed()` | None | Always works |
| `send_tool_list_changed()` | None | Always works |
| `send_prompt_list_changed()` | None | Always works |
| `create_message()` | `capabilities.sampling` | **Throw error** if missing |

**Rationale**:
- Notifications are "fire-and-forget" - clients can ignore unsupported ones
- Sampling is a request-response - MUST fail fast if unsupported

---

## Error Handling Strategy

### Principle: Graceful Degradation

**Notifications Should Never Crash Tools**:
```typescript
async send_log_message(level: LogLevel, data: string, logger?: string): Promise<void> {
  try {
    if (!this.mcpServer) {
      // No server - silent failure (tool handler continues)
      return;
    }

    await this.mcpServer.sendLoggingMessage({
      level,
      data,
      logger: logger || undefined
    });
  } catch (error) {
    // Log to stderr, don't throw
    console.error('[SessionImpl] Failed to send log message:', error);
  }
}
```

**Sampling Requests Should Fail Fast**:
```typescript
async create_message(
  messages: SamplingMessage[],
  options?: SamplingOptions
): Promise<CreateMessageResult> {
  // Check server exists
  if (!this.mcpServer) {
    throw new Error(
      'Cannot create message: MCP server not initialized\n\n' +
      'What went wrong:\n' +
      '  SessionImpl was created without MCP server reference.\n\n' +
      'This is likely a bug. Please report it.'
    );
  }

  // Check capability
  const caps = this.mcpServer.getClientCapabilities();
  if (!caps?.sampling) {
    throw new Error(
      'Client does not support sampling capability.\n\n' +
      'What went wrong:\n' +
      '  The connected client has not advertised sampling support.\n\n' +
      'To fix:\n' +
      '  1. Use a client that supports MCP sampling\n' +
      '  2. Check client configuration\n' +
      '  3. Update client to latest version'
    );
  }

  try {
    return await this.mcpServer.createMessage({
      messages: messages as any,
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
      topP: options?.topP,
      stopSequences: options?.stopSequences,
      metadata: options?.metadata
    });
  } catch (error) {
    // Wrap error with helpful context
    throw new Error(
      `Sampling request failed: ${error instanceof Error ? error.message : String(error)}\n\n` +
      'Possible causes:\n' +
      '  - Client LLM service unavailable\n' +
      '  - Invalid message format\n' +
      '  - Network connection issue'
    );
  }
}
```

### Error Categories

1. **Missing Server** (programming error)
   - Should never happen in production
   - Throw error immediately

2. **Missing Capability** (configuration error)
   - For sampling: throw clear error
   - For notifications: warn and continue

3. **Network/Transport Errors** (runtime error)
   - For sampling: wrap and re-throw with context
   - For notifications: log to stderr, continue

4. **Invalid Parameters** (programmer error)
   - Throw immediately with validation message

---

## Backward Compatibility

### Compatibility Matrix

| Component | Phase 1 Behavior | Phase 2 Behavior | Breaking? |
|-----------|------------------|------------------|-----------|
| `SessionImpl` constructor | No args | Requires `(server, capabilities?)` | **YES** - internal only |
| `Context.session` | Stub methods | Real implementations | **NO** - same interface |
| `ContextBuilder` | Creates stubbed session | Creates functional session | **NO** - transparent |
| Tool handlers | Stubs log warnings | Notifications work | **NO** - enhanced |

### Migration Path

**For Simply-MCP Users**:
- **No changes required** to existing code
- Tools that call `context.session.send_log_message()` will now work
- Old tools continue to work exactly as before

**For Simply-MCP Library**:
- ContextBuilder changes are internal
- SessionImpl is internal implementation
- Public API (Context interface) unchanged

**Example - Before and After**:

```typescript
// BEFORE (Phase 1): This would log a warning
server.addTool({
  name: 'example',
  description: 'Example tool',
  parameters: z.object({}),
  execute: async (args, context) => {
    await context.session.send_log_message('info', 'Hello');
    // Console: "[Context.Session] send_log_message() not yet implemented"
    return 'Done';
  }
});

// AFTER (Phase 2): This works!
server.addTool({
  name: 'example',
  description: 'Example tool',
  parameters: z.object({}),
  execute: async (args, context) => {
    await context.session.send_log_message('info', 'Hello');
    // Client receives: { method: "notifications/message", params: { ... } }
    return 'Done';
  }
});

// Code is IDENTICAL - seamless upgrade!
```

### Versioning Strategy

- **Library version**: Bump minor version (3.1.x → 3.2.0)
  - Reason: New features, no breaking changes to public API

- **Changelog entry**:
  ```
  ## [3.2.0] - 2025-10-XX

  ### Added
  - Phase 2: MCP Notifications & Session Enhancement
  - Client capability detection during initialization
  - Functional session.send_log_message() using MCP SDK
  - Functional session.send_progress_notification()
  - Functional session.send_resource_updated()
  - Functional session.send_resource_list_changed()
  - Functional session.send_tool_list_changed()
  - Functional session.send_prompt_list_changed()
  - Functional session.create_message() for LLM sampling
  - Session.client_params property exposing client capabilities

  ### Changed
  - SessionImpl now receives MCP Server and ClientCapabilities
  - ContextBuilder.setClientParams() now functional (was no-op)

  ### Fixed
  - Session methods no longer log "not yet implemented" warnings
  ```

---

## Security Considerations

### Trust Model

**Server → Client Notifications**:
- Server can send notifications at any time
- Client decides whether to display/handle them
- No security risk (client controls UI)

**Client → Server Sampling**:
- Server requests LLM completion from client
- Client controls which LLM is used
- Client can refuse/limit sampling requests
- No security risk (client maintains control)

### Rate Limiting

**Progress Notifications**:
```typescript
// Tool developers should rate-limit progress updates
async (args, context) => {
  const token = context.request_context.meta?.progressToken;
  let lastUpdate = 0;

  for (let i = 0; i < items.length; i++) {
    // Rate limit: only send update every 100ms
    const now = Date.now();
    if (token && now - lastUpdate > 100) {
      await context.session.send_progress_notification(
        token, i, items.length
      );
      lastUpdate = now;
    }

    // Process item...
  }
}
```

**Logging**:
```typescript
// Avoid excessive logging in tight loops
async (args, context) => {
  // BAD: Don't do this
  for (let i = 0; i < 1000000; i++) {
    await context.session.send_log_message('debug', `Processing ${i}`);
  }

  // GOOD: Log at meaningful intervals
  for (let i = 0; i < 1000000; i++) {
    if (i % 10000 === 0) {
      await context.session.send_log_message('info', `Processed ${i} items`);
    }
  }
}
```

### Input Validation

**Progress Token Validation**:
```typescript
async send_progress_notification(
  progressToken: string | number,
  progress: number,
  total?: number,
  message?: string
): Promise<void> {
  // Validate progress token format
  if (typeof progressToken !== 'string' && typeof progressToken !== 'number') {
    throw new Error('progressToken must be string or number');
  }

  // Validate progress value
  if (typeof progress !== 'number' || progress < 0) {
    throw new Error('progress must be non-negative number');
  }

  if (total !== undefined && (typeof total !== 'number' || total < progress)) {
    throw new Error('total must be number >= progress');
  }

  // Send notification...
}
```

### Privacy Considerations

**Logging Data**:
- Never log sensitive data (passwords, API keys, PII)
- Tool developers responsible for sanitizing log messages
- Library provides mechanism, developers control content

**Sampling Messages**:
- Messages sent to client LLM may be logged/stored by client
- Tool developers should avoid including sensitive data in sampling requests
- Document privacy implications in tool descriptions

---

## Next Steps

After architecture approval:

1. Review architecture with team
2. Proceed to [PHASE-2-IMPLEMENTATION-GUIDE.md](./PHASE-2-IMPLEMENTATION-GUIDE.md)
3. Implement Layer 1 (Client Capabilities + Logging)
4. Test thoroughly before proceeding to Layer 2
5. Implement Layer 2 (List Changed Notifications)
6. Implement Layer 3 (Progress + Sampling)
7. Update documentation and examples

---

**Document Version**: 1.0
**Last Updated**: 2025-10-18
**Status**: Ready for Review
