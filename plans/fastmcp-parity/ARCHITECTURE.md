# Phase 1 Context System Architecture

**Status:** Design Complete
**Date:** 2025-10-18
**Version:** 1.0
**Target:** TypeScript (simply-mcp) + Python (simply-mcp-py)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Context Object Structure](#context-object-structure)
3. [Building Context from MCP Primitives](#building-context-from-mcp-primitives)
4. [Handler Integration Strategy](#handler-integration-strategy)
5. [FastAPI Integration (Python)](#fastapi-integration-python)
6. [MCP SDK Primitives Used](#mcp-sdk-primitives-used)
7. [Cross-Language Parity](#cross-language-parity)
8. [File Structure](#file-structure)
9. [Data Flow Diagrams](#data-flow-diagrams)

---

## Executive Summary

This document defines the Phase 1 architecture for implementing a FastMCP-compatible Context system in both Simply-MCP TypeScript and Python repositories. The design:

- Builds exclusively on **Anthropic MCP SDK primitives** (no FastMCP library dependency)
- Provides **identical API semantics** across TypeScript and Python
- Maintains **100% backward compatibility** (handlers work with or without context)
- Enables context injection into **all handler types** (tools, prompts, resources)
- Uses **FastAPI** for Python HTTP/SSE transport layer integration

### Key Principles

1. **MCP SDK Native**: All data comes from MCP SDK Server, ServerInfo, and request objects
2. **Optional Parameter**: Context is injected only when handler signature requests it
3. **Type Safety**: Strong typing in both languages (TypeScript interfaces, Python dataclasses)
4. **Request Scoped**: New context instance per request, no shared state
5. **Progressive Enhancement**: Phase 1 provides foundation, future phases add features

---

## Context Object Structure

The Context object exposes three property groups: `fastmcp`, `session`, and `request_context`.

### TypeScript Interfaces

```typescript
// src/core/Context.ts

/**
 * Main Context object injected into handlers
 * Provides access to server info, session, and request metadata
 */
export interface Context {
  /**
   * FastMCP server information (read-only)
   * Exposes MCP ServerInfo properties
   */
  readonly fastmcp: FastMCPInfo;

  /**
   * Session management and notifications
   * Methods for interacting with the current MCP session
   */
  readonly session: Session;

  /**
   * Request-specific context data
   * Unique ID, metadata, and lifespan context
   */
  readonly request_context: RequestContext;
}

/**
 * FastMCP server information (Phase 1)
 * Extracted from MCP Server instance
 */
export interface FastMCPInfo {
  /** Server name from MCP ServerInfo */
  readonly name: string;

  /** Server version from MCP ServerInfo */
  readonly version: string;

  /** Server instructions/description from MCP ServerInfo */
  readonly instructions?: string;

  /** Server website URL from MCP ServerInfo */
  readonly website_url?: string;

  /** Server capabilities exposed to clients */
  readonly capabilities: {
    /** Whether sampling/LLM requests are enabled */
    readonly sampling?: boolean;
    /** Whether logging notifications are enabled */
    readonly logging?: boolean;
    /** Whether prompts are supported */
    readonly prompts?: boolean;
    /** Whether resources are supported */
    readonly resources?: boolean;
    /** Whether tools are supported */
    readonly tools?: boolean;
  };
}

/**
 * Session object for MCP session interactions (Phase 1)
 * Most methods stubbed for future implementation
 */
export interface Session {
  /**
   * Session ID (if available)
   * Only present in stateful HTTP/SSE transports
   */
  readonly session_id?: string;

  /**
   * Client parameters from initialize request
   * Available after client initialization
   */
  readonly client_params?: {
    /** Client name and version */
    readonly client_info: {
      readonly name: string;
      readonly version: string;
    };
    /** Client capabilities */
    readonly capabilities: {
      readonly sampling?: object;
      readonly experimental?: object;
      readonly roots?: object;
    };
  };

  // Phase 2: Notification methods (stubbed in Phase 1)
  /** Send notification that resource list has changed */
  send_resource_list_changed(): Promise<void>;
  /** Send notification that tool list has changed */
  send_tool_list_changed(): Promise<void>;
  /** Send notification that prompt list has changed */
  send_prompt_list_changed(): Promise<void>;
  /** Send progress notification */
  send_progress_notification(progress: number, total?: number, message?: string): Promise<void>;

  // Phase 2: LLM sampling (stubbed in Phase 1)
  /** Request LLM completion from client */
  create_message(messages: any[], options?: any): Promise<any>;

  // Phase 3: Resource operations (stubbed in Phase 1)
  /** Read a resource by URI */
  read_resource(uri: string): Promise<any>;
}

/**
 * Request-specific context (Phase 1)
 */
export interface RequestContext {
  /** Unique request ID (UUID v4) */
  readonly request_id: string;

  /**
   * Lifespan context data (Phase 3)
   * Typed context shared across server lifetime
   */
  readonly lifespan_context?: any;

  /**
   * Request metadata (Phase 2)
   * Includes progressToken and other MCP metadata
   */
  readonly meta?: {
    /** Progress token from request (if present) */
    readonly progressToken?: string | number;
    /** Additional request metadata */
    [key: string]: any;
  };
}
```

### Python Dataclasses

```python
# src/simply_mcp/core/context.py

from dataclasses import dataclass, field
from typing import Any, Optional
from uuid import UUID

@dataclass(frozen=True)
class FastMCPInfo:
    """FastMCP server information (Phase 1).

    Extracted from MCP Server instance created via MCP SDK.
    All fields are read-only to prevent modification.
    """
    name: str
    version: str
    instructions: Optional[str] = None
    website_url: Optional[str] = None
    capabilities: dict[str, bool] = field(default_factory=dict)


@dataclass
class Session:
    """Session object for MCP session interactions (Phase 1).

    Provides methods for sending notifications and interacting
    with the MCP client. Most methods are stubbed for Phase 1.
    """
    session_id: Optional[str] = None
    client_params: Optional[dict[str, Any]] = None

    # Internal reference to MCP server for notifications
    _mcp_server: Any = field(default=None, repr=False)

    async def send_resource_list_changed(self) -> None:
        """Send notification that resource list has changed (Phase 2)."""
        # Stubbed for Phase 1
        pass

    async def send_tool_list_changed(self) -> None:
        """Send notification that tool list has changed (Phase 2)."""
        # Stubbed for Phase 1
        pass

    async def send_prompt_list_changed(self) -> None:
        """Send notification that prompt list has changed (Phase 2)."""
        # Stubbed for Phase 1
        pass

    async def send_progress_notification(
        self,
        progress: int,
        total: Optional[int] = None,
        message: Optional[str] = None
    ) -> None:
        """Send progress notification (Phase 2)."""
        # Stubbed for Phase 1
        pass

    async def create_message(self, messages: list[Any], options: Optional[dict] = None) -> Any:
        """Request LLM completion from client (Phase 2)."""
        # Stubbed for Phase 1
        pass

    async def read_resource(self, uri: str) -> Any:
        """Read a resource by URI (Phase 3)."""
        # Stubbed for Phase 1
        pass


@dataclass(frozen=True)
class RequestContext:
    """Request-specific context (Phase 1)."""
    request_id: str
    lifespan_context: Optional[Any] = None
    meta: Optional[dict[str, Any]] = None


@dataclass(frozen=True)
class Context:
    """Main Context object injected into handlers.

    Provides access to server info, session, and request metadata.
    Immutable to prevent handlers from modifying shared state.
    """
    fastmcp: FastMCPInfo
    session: Session
    request_context: RequestContext
```

---

## Building Context from MCP Primitives

### Data Sources from MCP SDK

All Context data comes from MCP SDK primitives:

1. **MCP Server Instance** (`Server` class from SDK)
   - Server name, version, instructions, website_url
   - Server capabilities configuration
   - Notification sending methods

2. **Initialize Request** (captured during client initialization)
   - Client name and version
   - Client capabilities
   - Session ID (for HTTP/SSE transports)

3. **Per-Request Data** (from MCP request handlers)
   - Request metadata (`_meta` field)
   - Progress token (if present)
   - Request-specific parameters

### TypeScript Implementation

```typescript
// src/core/Context.ts

import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

export class ContextBuilder {
  private serverInfo: FastMCPInfo;
  private sessionData: {
    session_id?: string;
    client_params?: any;
  } = {};
  private mcpServer: Server;

  constructor(server: Server, options: BuildMCPServerOptions) {
    this.mcpServer = server;

    // Extract FastMCPInfo from MCP Server and options
    this.serverInfo = {
      name: options.name,
      version: options.version,
      instructions: options.description,
      website_url: options.website_url,
      capabilities: {
        sampling: options.capabilities?.sampling ?? false,
        logging: options.capabilities?.logging ?? false,
        prompts: true,  // Always available
        resources: true, // Always available
        tools: true,    // Always available
      },
    };
  }

  /**
   * Capture client initialization data
   * Called from initialize request handler
   */
  setClientParams(params: {
    clientInfo: { name: string; version: string };
    capabilities: any;
  }): void {
    this.sessionData.client_params = {
      client_info: params.clientInfo,
      capabilities: params.capabilities,
    };
  }

  /**
   * Set session ID (for HTTP/SSE transports)
   */
  setSessionId(sessionId: string): void {
    this.sessionData.session_id = sessionId;
  }

  /**
   * Build a Context instance for a request
   * Called at the start of each tool/prompt/resource handler
   */
  buildContext(requestMeta?: { progressToken?: string | number; [key: string]: any }): Context {
    const request_id = randomUUID();

    const session: Session = {
      session_id: this.sessionData.session_id,
      client_params: this.sessionData.client_params,
      _mcp_server: this.mcpServer,

      // Stubbed methods (Phase 1)
      async send_resource_list_changed() {},
      async send_tool_list_changed() {},
      async send_prompt_list_changed() {},
      async send_progress_notification() {},
      async create_message() { return null; },
      async read_resource() { return null; },
    };

    const request_context: RequestContext = {
      request_id,
      meta: requestMeta,
      lifespan_context: undefined, // Phase 3
    };

    return {
      fastmcp: this.serverInfo,
      session,
      request_context,
    };
  }
}
```

### Python Implementation

```python
# src/simply_mcp/core/context.py

import uuid
from typing import Any, Optional
from mcp.server.lowlevel.server import Server as MCPServer

class ContextBuilder:
    """Builds Context instances for MCP requests.

    Stores server-level information and session data,
    creates new Context instances per request.
    """

    def __init__(self, mcp_server: MCPServer, config: SimplyMCPConfig):
        """Initialize context builder with MCP server and config."""
        self.mcp_server = mcp_server

        # Extract FastMCPInfo from MCP Server
        self.server_info = FastMCPInfo(
            name=config.server.name,
            version=config.server.version,
            instructions=config.server.description,
            website_url=config.server.homepage,
            capabilities={
                "sampling": getattr(config.capabilities, "sampling", False),
                "logging": getattr(config.capabilities, "logging", False),
                "prompts": True,
                "resources": True,
                "tools": True,
            }
        )

        # Session data (captured during initialize)
        self.session_data: dict[str, Any] = {}

    def set_client_params(self, params: dict[str, Any]) -> None:
        """Capture client initialization data.

        Called from initialize request handler.
        """
        self.session_data["client_params"] = {
            "client_info": params.get("clientInfo", {}),
            "capabilities": params.get("capabilities", {}),
        }

    def set_session_id(self, session_id: str) -> None:
        """Set session ID (for HTTP/SSE transports)."""
        self.session_data["session_id"] = session_id

    def build_context(self, request_meta: Optional[dict[str, Any]] = None) -> Context:
        """Build a Context instance for a request.

        Called at the start of each tool/prompt/resource handler.
        Generates unique request ID using UUID v4.
        """
        request_id = str(uuid.uuid4())

        session = Session(
            session_id=self.session_data.get("session_id"),
            client_params=self.session_data.get("client_params"),
            _mcp_server=self.mcp_server,
        )

        request_context = RequestContext(
            request_id=request_id,
            meta=request_meta,
            lifespan_context=None,  # Phase 3
        )

        return Context(
            fastmcp=self.server_info,
            session=session,
            request_context=request_context,
        )
```

### Request ID Generation

- **Algorithm**: UUID v4 (random)
- **Uniqueness**: Cryptographically random, collision probability negligible
- **Format**: String representation of UUID (e.g., `"f47ac10b-58cc-4372-a567-0e02b2c3d479"`)
- **Generation Point**: At the start of each request handler invocation
- **Scope**: Request-scoped (new ID per tool/prompt/resource call)

---

## Handler Integration Strategy

### Backward Compatibility Mechanism

The key design principle is **optional parameter injection**:

1. **Handler without context**: Works as before, no breaking changes
2. **Handler with context**: Receives Context instance automatically

This is achieved through **function signature inspection**:

```typescript
// TypeScript - Inspect function signature
function needsContext(fn: Function): boolean {
  // Check if function has a parameter named 'context' or 'ctx'
  const params = getFunctionParameters(fn);
  return params.some(p => p.name === 'context' || p.name === 'ctx');
}

// Call handler with or without context
if (needsContext(handler)) {
  result = await handler(args, context);
} else {
  result = await handler(args);
}
```

```python
# Python - Inspect function signature
import inspect

def needs_context(fn: Callable) -> bool:
    """Check if handler function accepts a context parameter."""
    sig = inspect.signature(fn)
    # Check for parameter with Context type hint or name 'context'/'ctx'
    for param_name, param in sig.parameters.items():
        if param_name in ('context', 'ctx'):
            return True
        if param.annotation == Context:
            return True
    return False

# Call handler with or without context
if needs_context(handler):
    result = await handler(args, context=context)
else:
    result = await handler(args)
```

### Tool Handler Integration

#### TypeScript - Decorator Style

```typescript
import { BuildMCPServer, Context } from 'simply-mcp';

const server = new BuildMCPServer({ name: 'my-server', version: '1.0.0' });

// WITHOUT context (backward compatible)
server.addTool({
  name: 'old-tool',
  description: 'Tool without context',
  parameters: z.object({ value: z.string() }),
  execute: async (args) => {
    return `Result: ${args.value}`;
  },
});

// WITH context (new feature)
server.addTool({
  name: 'new-tool',
  description: 'Tool with context access',
  parameters: z.object({ value: z.string() }),
  execute: async (args, context: Context) => {
    console.log(`Request ID: ${context.request_context.request_id}`);
    console.log(`Server: ${context.fastmcp.name} v${context.fastmcp.version}`);
    return `Result: ${args.value}`;
  },
});
```

#### TypeScript - Functional Style

```typescript
import { buildTool, Context } from 'simply-mcp';

// WITHOUT context
const oldTool = buildTool({
  name: 'old-tool',
  description: 'Tool without context',
  parameters: z.object({ value: z.string() }),
  execute: async (args) => {
    return `Result: ${args.value}`;
  },
});

// WITH context
const newTool = buildTool({
  name: 'new-tool',
  description: 'Tool with context',
  parameters: z.object({ value: z.string() }),
  execute: async (args, context: Context) => {
    return `Server: ${context.fastmcp.name}, Request: ${context.request_context.request_id}`;
  },
});
```

#### Python - Decorator Style

```python
from simply_mcp import BuildMCPServer, Context

server = BuildMCPServer(name="my-server", version="1.0.0")

# WITHOUT context (backward compatible)
@server.tool()
def old_tool(value: str) -> str:
    """Tool without context."""
    return f"Result: {value}"

# WITH context (new feature)
@server.tool()
def new_tool(value: str, context: Context) -> str:
    """Tool with context access."""
    print(f"Request ID: {context.request_context.request_id}")
    print(f"Server: {context.fastmcp.name} v{context.fastmcp.version}")
    return f"Result: {value}"
```

#### Python - Functional Style

```python
from simply_mcp import build_tool, Context

# WITHOUT context
def old_handler(value: str) -> str:
    return f"Result: {value}"

old_tool = build_tool("old-tool", old_handler, description="Tool without context")

# WITH context
def new_handler(value: str, context: Context) -> str:
    return f"Server: {context.fastmcp.name}, Request: {context.request_context.request_id}"

new_tool = build_tool("new-tool", new_handler, description="Tool with context")
```

### Prompt Handler Integration

#### TypeScript

```typescript
// WITHOUT context
server.addPrompt({
  name: 'greet',
  description: 'Greeting prompt',
  template: 'Hello {name}!',
});

// WITH context (dynamic template)
server.addPrompt({
  name: 'greet-advanced',
  description: 'Advanced greeting',
  template: async (args, context: Context) => {
    const serverName = context.fastmcp.name;
    return `Hello ${args.name}! You're using ${serverName}.`;
  },
});
```

#### Python

```python
# WITHOUT context
@server.prompt()
def greet(name: str) -> str:
    """Greeting prompt."""
    return f"Hello {name}!"

# WITH context
@server.prompt()
def greet_advanced(name: str, context: Context) -> str:
    """Advanced greeting with server info."""
    return f"Hello {name}! You're using {context.fastmcp.name}."
```

### Resource Handler Integration

#### TypeScript

```typescript
// WITHOUT context
server.addResource({
  uri: 'config://settings',
  name: 'Settings',
  description: 'App settings',
  mimeType: 'application/json',
  content: () => ({ theme: 'dark' }),
});

// WITH context
server.addResource({
  uri: 'config://server-info',
  name: 'Server Info',
  description: 'Server metadata',
  mimeType: 'application/json',
  content: (context: Context) => ({
    server: context.fastmcp.name,
    version: context.fastmcp.version,
    request_id: context.request_context.request_id,
  }),
});
```

#### Python

```python
# WITHOUT context
@server.resource("config://settings")
def settings() -> dict:
    """App settings resource."""
    return {"theme": "dark"}

# WITH context
@server.resource("config://server-info")
def server_info(context: Context) -> dict:
    """Server metadata resource."""
    return {
        "server": context.fastmcp.name,
        "version": context.fastmcp.version,
        "request_id": context.request_context.request_id,
    }
```

---

## FastAPI Integration (Python)

### Why FastAPI?

FastAPI is used for Python HTTP/SSE transport layer because:
1. Already a dependency of simply-mcp-py
2. Provides async request/response lifecycle
3. Supports middleware for context injection
4. Compatible with MCP SDK's StreamableHTTPServerTransport

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Application                     │
├─────────────────────────────────────────────────────────────┤
│  Middleware: Request Context Setup                          │
│  - Generate request ID                                       │
│  - Attach to request.state.context                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│            MCP StreamableHTTPServerTransport                 │
│  - Handles MCP protocol over HTTP/SSE                       │
│  - Passes requests to MCP Server                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server (from SDK)                     │
│  - Request handlers (tools, prompts, resources)             │
│  - Extract context from FastAPI request.state               │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```python
# src/simply_mcp/transports/http.py

from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware
from simply_mcp.core.context import ContextBuilder

class ContextMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware to inject Context into request state."""

    def __init__(self, app, context_builder: ContextBuilder):
        super().__init__(app)
        self.context_builder = context_builder

    async def dispatch(self, request: Request, call_next):
        # Build context for this request
        # (request_meta will be populated later from MCP message)
        request.state.context_builder = self.context_builder

        # Extract session ID from headers (if present)
        session_id = request.headers.get("X-Session-ID")
        if session_id:
            self.context_builder.set_session_id(session_id)

        response = await call_next(request)
        return response


# In SimplyMCPServer.run_http()
app = FastAPI()

# Add context middleware
context_middleware = ContextMiddleware(app, self.context_builder)
app.add_middleware(BaseHTTPMiddleware, dispatch=context_middleware.dispatch)

# Mount MCP transport
transport = StreamableHTTPServerTransport(app=app, path="/mcp")
await self.mcp_server.run(transport)
```

### Extracting Context in Handlers

```python
# In tool/prompt/resource request handler
async def handle_tool_call(request, extra):
    """MCP tool call handler with context injection."""

    # Get context builder from FastAPI request state
    # (extra contains FastAPI Request object for HTTP transport)
    context_builder = getattr(extra.request.state, 'context_builder', None)

    # Build context for this request
    request_meta = request.params.get('_meta', {})
    context = context_builder.build_context(request_meta) if context_builder else None

    # Get handler function
    handler = self.tools[request.params.name].handler

    # Inspect and call with or without context
    if needs_context(handler):
        result = await handler(**args, context=context)
    else:
        result = await handler(**args)

    return result
```

---

## MCP SDK Primitives Used

### TypeScript MCP SDK

```typescript
// From @modelcontextprotocol/sdk

// Core Server
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Transports
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// Request/Response Schemas
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ReadResourceRequestSchema,
  ListResourcesRequestSchema,
  InitializeRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Notification Schemas
import {
  ProgressNotificationSchema,
  LoggingMessageNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js';
```

### Python MCP SDK

```python
# From mcp package

# Core Server
from mcp.server.lowlevel.server import Server as MCPServer
from mcp.server.lowlevel.server import NotificationOptions

# Transports
from mcp.server.stdio import stdio_server
from mcp.server.sse import sse_server  # For SSE transport

# Types
import mcp.types as types

# Message handling
from mcp.shared.message import SessionMessage

# Context (from MCP SDK, not FastMCP)
from mcp.shared.context import RequestContext
```

### How We Hook Into MCP Lifecycle

#### 1. Initialize Request (Capture Client Info)

```typescript
// TypeScript
this.server.setRequestHandler(InitializeRequestSchema, async (request) => {
  // Capture client parameters for Context
  this.contextBuilder.setClientParams({
    clientInfo: request.params.clientInfo,
    capabilities: request.params.capabilities,
  });

  // Return server capabilities
  return {
    protocolVersion: '2024-11-05',
    serverInfo: {
      name: this.options.name,
      version: this.options.version,
    },
    capabilities: {
      tools: {},
      prompts: {},
      resources: {},
    },
  };
});
```

```python
# Python
@self.mcp_server.request_handler(types.InitializeRequest)
async def handle_initialize(request: types.InitializeRequest):
    # Capture client parameters for Context
    self.context_builder.set_client_params({
        "clientInfo": request.params.clientInfo,
        "capabilities": request.params.capabilities,
    })

    # Return server capabilities
    return types.InitializeResult(
        protocolVersion="2024-11-05",
        serverInfo=types.Implementation(
            name=self.config.server.name,
            version=self.config.server.version,
        ),
        capabilities=types.ServerCapabilities(
            tools=types.ToolsCapability(),
            prompts=types.PromptsCapability(),
            resources=types.ResourcesCapability(),
        ),
    )
```

#### 2. Request Handlers (Build Context Per Request)

```typescript
// TypeScript - Tool call handler
this.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  // Extract request metadata
  const requestMeta = request.params._meta;

  // Build context for this request
  const context = this.contextBuilder.buildContext(requestMeta);

  // Execute handler with context (if it accepts it)
  const handler = this.tools.get(request.params.name);
  return await this.executeHandler(handler, args, context);
});
```

```python
# Python - Tool call handler
@self.mcp_server.request_handler(types.CallToolRequest)
async def handle_call_tool(request: types.CallToolRequest):
    # Extract request metadata
    request_meta = getattr(request.params, '_meta', {})

    # Build context for this request
    context = self.context_builder.build_context(request_meta)

    # Execute handler with context (if it accepts it)
    handler = self.tools[request.params.name]
    return await self.execute_handler(handler, args, context)
```

#### 3. Notifications (Phase 2 - Stubbed in Phase 1)

```typescript
// TypeScript - Send notification
async sendProgressNotification(
  progressToken: string | number,
  progress: number,
  total?: number
): Promise<void> {
  await this.server.sendNotification({
    method: 'notifications/progress',
    params: {
      progressToken,
      progress,
      total,
    },
  });
}
```

```python
# Python - Send notification
async def send_progress_notification(
    self,
    progress_token: str | int,
    progress: int,
    total: int | None = None,
) -> None:
    await self.mcp_server.send_notification(
        NotificationOptions(
            method="notifications/progress",
            params={
                "progressToken": progress_token,
                "progress": progress,
                "total": total,
            },
        )
    )
```

---

## Cross-Language Parity

### Type System Mapping

| Concept | TypeScript | Python |
|---------|-----------|--------|
| Context Object | `interface Context` | `@dataclass(frozen=True) class Context` |
| FastMCPInfo | `interface FastMCPInfo` | `@dataclass(frozen=True) class FastMCPInfo` |
| Session | `interface Session` | `@dataclass class Session` |
| RequestContext | `interface RequestContext` | `@dataclass(frozen=True) class RequestContext` |
| Request ID | `string` (UUID) | `str` (UUID) |
| Optional Fields | `field?: Type` | `field: Optional[Type] = None` |

### Async Patterns

#### TypeScript
```typescript
// Promise-based async/await
async function handler(args: Args, context: Context): Promise<string> {
  const result = await someAsyncOperation();
  return `Result: ${result}`;
}
```

#### Python
```python
# Coroutine-based async/await
async def handler(args: Args, context: Context) -> str:
    result = await some_async_operation()
    return f"Result: {result}"
```

### Error Handling

#### TypeScript
```typescript
try {
  const context = this.contextBuilder.buildContext(meta);
  return await handler(args, context);
} catch (error) {
  if (error instanceof HandlerExecutionError) {
    return { isError: true, content: [{ type: 'text', text: error.message }] };
  }
  throw error;
}
```

#### Python
```python
try:
    context = self.context_builder.build_context(meta)
    return await handler(args, context=context)
except HandlerExecutionError as e:
    return types.CallToolResult(
        isError=True,
        content=[types.TextContent(type="text", text=str(e))]
    )
```

### Testing Patterns

#### TypeScript (Vitest/Jest)
```typescript
import { describe, it, expect } from 'vitest';
import { ContextBuilder } from './Context';

describe('ContextBuilder', () => {
  it('generates unique request IDs', () => {
    const builder = new ContextBuilder(server, options);
    const ctx1 = builder.buildContext();
    const ctx2 = builder.buildContext();

    expect(ctx1.request_context.request_id).not.toBe(ctx2.request_context.request_id);
  });
});
```

#### Python (pytest)
```python
import pytest
from simply_mcp.core.context import ContextBuilder

def test_generates_unique_request_ids():
    """Test that each context has a unique request ID."""
    builder = ContextBuilder(mcp_server, config)
    ctx1 = builder.build_context()
    ctx2 = builder.build_context()

    assert ctx1.request_context.request_id != ctx2.request_context.request_id
```

---

## File Structure

### TypeScript Repository (simply-mcp)

```
src/
├── core/
│   ├── Context.ts              # NEW: Context interfaces and ContextBuilder
│   ├── FastMCPInfo.ts          # NEW: FastMCPInfo interface
│   ├── Session.ts              # NEW: Session interface
│   ├── RequestContext.ts       # NEW: RequestContext interface
│   └── types.ts                # MODIFIED: Add Context types
│
├── api/
│   └── programmatic/
│       ├── BuildMCPServer.ts   # MODIFIED: Integrate ContextBuilder
│       └── types.ts            # MODIFIED: Update handler signatures
│
tests/
├── context.test.ts             # NEW: Context unit tests
├── request-id.test.ts          # NEW: Request ID generation tests
└── integration/
    └── context-injection.test.ts # NEW: Handler integration tests
```

### Python Repository (simply-mcp-py)

```
src/simply_mcp/
├── core/
│   ├── context.py              # NEW: Context classes and ContextBuilder
│   ├── fastmcp_info.py         # NEW: FastMCPInfo dataclass
│   ├── session.py              # NEW: Session dataclass
│   ├── request_context.py      # NEW: RequestContext dataclass
│   ├── server.py               # MODIFIED: Integrate ContextBuilder
│   └── types.py                # MODIFIED: Add Context types
│
├── api/
│   └── programmatic.py         # MODIFIED: Update handler signatures
│
tests/
├── test_context.py             # NEW: Context unit tests
├── test_request_id.py          # NEW: Request ID generation tests
└── integration/
    └── test_context_injection.py # NEW: Handler integration tests
```

---

## Data Flow Diagrams

### Context Creation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Server Initialization                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. Create MCP Server instance                                      │
│     - Server(name, version, instructions, website_url)              │
│                                                                       │
│  2. Create ContextBuilder                                           │
│     - Store MCP Server reference                                    │
│     - Extract FastMCPInfo from config                               │
│                                                                       │
│  3. Register initialize handler                                     │
│     - Capture client_params                                         │
│     - Store in ContextBuilder                                       │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Client Initialize Request                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  MCP Client sends initialize request                                │
│     ├─ clientInfo: { name, version }                               │
│     └─ capabilities: { sampling, experimental, roots }             │
│                                                                       │
│  Initialize handler:                                                │
│     └─ contextBuilder.setClientParams(request.params)              │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Tool/Prompt/Resource Call                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. MCP Client sends request (e.g., call_tool)                      │
│     ├─ name: "tool-name"                                           │
│     ├─ arguments: { ... }                                          │
│     └─ _meta: { progressToken: "xyz" }                            │
│                                                                       │
│  2. Request handler extracts metadata                               │
│     └─ requestMeta = request.params._meta                          │
│                                                                       │
│  3. Build Context for this request                                  │
│     context = contextBuilder.buildContext(requestMeta)              │
│     ├─ Generate UUID v4 request_id                                 │
│     ├─ Copy fastmcp (server info)                                  │
│     ├─ Create session (with client_params)                         │
│     └─ Create request_context (request_id, meta)                   │
│                                                                       │
│  4. Inspect handler signature                                       │
│     if (needsContext(handler)):                                     │
│         result = handler(args, context)                             │
│     else:                                                            │
│         result = handler(args)                                      │
│                                                                       │
│  5. Return result to MCP Client                                     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Context Object Structure Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                         Context                                │
├───────────────────────────────────────────────────────────────┤
│                                                                 │
│  fastmcp: FastMCPInfo ────────────┐                           │
│  session: Session ────────────────┼──┐                        │
│  request_context: RequestContext ─┼──┼──┐                     │
│                                    │  │  │                     │
└────────────────────────────────────┼──┼──┼─────────────────────┘
                                     │  │  │
                 ┌───────────────────┘  │  │
                 │                      │  │
                 ▼                      │  │
┌──────────────────────────────────┐   │  │
│       FastMCPInfo                │   │  │
├──────────────────────────────────┤   │  │
│ name: string                     │   │  │
│ version: string                  │   │  │
│ instructions?: string            │   │  │
│ website_url?: string             │   │  │
│ capabilities: {                  │   │  │
│   sampling?: boolean             │   │  │
│   logging?: boolean              │   │  │
│   prompts?: boolean              │   │  │
│   resources?: boolean            │   │  │
│   tools?: boolean                │   │  │
│ }                                │   │  │
└──────────────────────────────────┘   │  │
                                       │  │
                  ┌────────────────────┘  │
                  │                       │
                  ▼                       │
┌──────────────────────────────────┐     │
│          Session                 │     │
├──────────────────────────────────┤     │
│ session_id?: string              │     │
│ client_params?: {                │     │
│   client_info: {                 │     │
│     name: string                 │     │
│     version: string              │     │
│   }                              │     │
│   capabilities: object           │     │
│ }                                │     │
│                                  │     │
│ Methods (Phase 2 stubbed):       │     │
│ - send_resource_list_changed()  │     │
│ - send_tool_list_changed()      │     │
│ - send_prompt_list_changed()    │     │
│ - send_progress_notification()  │     │
│ - create_message()               │     │
│ - read_resource()                │     │
└──────────────────────────────────┘     │
                                         │
                    ┌────────────────────┘
                    │
                    ▼
┌──────────────────────────────────┐
│      RequestContext              │
├──────────────────────────────────┤
│ request_id: string               │
│ lifespan_context?: any           │
│ meta?: {                         │
│   progressToken?: string|number  │
│   [key: string]: any             │
│ }                                │
└──────────────────────────────────┘
```

---

## Summary

This architecture provides:

1. **MCP SDK Native**: All data sourced from MCP Server, ServerInfo, and request objects
2. **Backward Compatible**: Optional context parameter, existing handlers unchanged
3. **Type Safe**: Strong typing in both TypeScript (interfaces) and Python (dataclasses)
4. **Request Scoped**: New Context per request, unique UUIDs
5. **Cross-Language Identical**: Same API semantics, equivalent implementations
6. **FastAPI Integrated**: Python uses FastAPI middleware for HTTP/SSE context injection
7. **Extensible**: Phase 1 foundation supports Phase 2 (notifications) and Phase 3 (lifespan)

**Next Steps**: See IMPLEMENTATION-GUIDE.md for step-by-step implementation plan.
