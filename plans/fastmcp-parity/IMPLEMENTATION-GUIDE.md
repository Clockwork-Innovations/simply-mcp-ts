# Phase 1 Implementation Guide: Context System

**Status:** Ready for Implementation
**Date:** 2025-10-18
**Duration:** 5 days (parallel TypeScript + Python)
**Target:** TypeScript (simply-mcp) + Python (simply-mcp-py)

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Task Breakdown](#task-breakdown)
4. [Daily Schedule](#daily-schedule)
5. [Testing Strategy](#testing-strategy)
6. [Validation Checklist](#validation-checklist)
7. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides step-by-step instructions for implementing the Phase 1 Context system in both Simply-MCP repositories. The implementation is designed to be completed in **5 business days** with parallel work across both codebases.

### Goals

- Implement Context system with three property groups (fastmcp, session, request_context)
- Create ContextBuilder class for generating Context instances
- Integrate context injection into all handler types
- Maintain 100% backward compatibility
- Achieve >90% test coverage
- Ensure API parity between TypeScript and Python

### Non-Goals (Deferred to Later Phases)

- Implementing notification methods (Phase 2)
- Implementing LLM sampling (Phase 2)
- Implementing lifespan context (Phase 3)
- Advanced session management (Phase 3)

---

## Prerequisites

### TypeScript Repository

- Node.js 18+ installed
- TypeScript 5.0+ configured
- Vitest or Jest for testing
- MCP SDK (`@modelcontextprotocol/sdk`) installed
- Existing `BuildMCPServer` implementation working

### Python Repository

- Python 3.10+ installed
- Poetry or pip for dependency management
- pytest for testing
- MCP SDK (`mcp`) installed
- Existing `SimplyMCPServer` implementation working
- FastAPI for HTTP transport

### Knowledge Requirements

- Understanding of MCP protocol basics
- Familiarity with async/await patterns
- Function signature inspection techniques
- Dataclasses (Python) and interfaces (TypeScript)

---

## Task Breakdown

### Task 1: Create Context Type Definitions

**Duration:** 4 hours (2h TypeScript + 2h Python)
**Outcome:** Type-safe Context, FastMCPInfo, Session, RequestContext definitions

#### TypeScript Steps

1. **Create `src/core/FastMCPInfo.ts`**
   ```typescript
   /**
    * FastMCP server information
    * Extracted from MCP ServerInfo
    */
   export interface FastMCPInfo {
     readonly name: string;
     readonly version: string;
     readonly instructions?: string;
     readonly website_url?: string;
     readonly capabilities: {
       readonly sampling?: boolean;
       readonly logging?: boolean;
       readonly prompts?: boolean;
       readonly resources?: boolean;
       readonly tools?: boolean;
     };
   }
   ```

2. **Create `src/core/Session.ts`**
   ```typescript
   /**
    * Session object for MCP interactions
    * Phase 1: Most methods stubbed
    */
   export interface Session {
     readonly session_id?: string;
     readonly client_params?: {
       readonly client_info: {
         readonly name: string;
         readonly version: string;
       };
       readonly capabilities: any;
     };

     // Methods (stubbed for Phase 1)
     send_resource_list_changed(): Promise<void>;
     send_tool_list_changed(): Promise<void>;
     send_prompt_list_changed(): Promise<void>;
     send_progress_notification(progress: number, total?: number, message?: string): Promise<void>;
     create_message(messages: any[], options?: any): Promise<any>;
     read_resource(uri: string): Promise<any>;
   }
   ```

3. **Create `src/core/RequestContext.ts`**
   ```typescript
   /**
    * Request-specific context data
    */
   export interface RequestContext {
     readonly request_id: string;
     readonly lifespan_context?: any;
     readonly meta?: {
       readonly progressToken?: string | number;
       [key: string]: any;
     };
   }
   ```

4. **Create `src/core/Context.ts`**
   ```typescript
   import type { FastMCPInfo } from './FastMCPInfo.js';
   import type { Session } from './Session.js';
   import type { RequestContext } from './RequestContext.js';

   /**
    * Main Context object injected into handlers
    */
   export interface Context {
     readonly fastmcp: FastMCPInfo;
     readonly session: Session;
     readonly request_context: RequestContext;
   }
   ```

5. **Update `src/core/types.ts`**
   - Export Context types
   - Update `ExecuteFunction` to accept optional context parameter

#### Python Steps

1. **Create `src/simply_mcp/core/fastmcp_info.py`**
   ```python
   from dataclasses import dataclass, field
   from typing import Optional

   @dataclass(frozen=True)
   class FastMCPInfo:
       """FastMCP server information.

       Extracted from MCP Server instance.
       All fields are read-only to prevent modification.
       """
       name: str
       version: str
       instructions: Optional[str] = None
       website_url: Optional[str] = None
       capabilities: dict[str, bool] = field(default_factory=dict)
   ```

2. **Create `src/simply_mcp/core/session.py`**
   ```python
   from dataclasses import dataclass, field
   from typing import Any, Optional

   @dataclass
   class Session:
       """Session object for MCP interactions.

       Phase 1: Most methods stubbed for future implementation.
       """
       session_id: Optional[str] = None
       client_params: Optional[dict[str, Any]] = None
       _mcp_server: Any = field(default=None, repr=False)

       async def send_resource_list_changed(self) -> None:
           """Send notification that resource list changed (Phase 2)."""
           pass  # Stubbed

       async def send_tool_list_changed(self) -> None:
           """Send notification that tool list changed (Phase 2)."""
           pass  # Stubbed

       async def send_prompt_list_changed(self) -> None:
           """Send notification that prompt list changed (Phase 2)."""
           pass  # Stubbed

       async def send_progress_notification(
           self,
           progress: int,
           total: Optional[int] = None,
           message: Optional[str] = None
       ) -> None:
           """Send progress notification (Phase 2)."""
           pass  # Stubbed

       async def create_message(
           self,
           messages: list[Any],
           options: Optional[dict] = None
       ) -> Any:
           """Request LLM completion (Phase 2)."""
           pass  # Stubbed

       async def read_resource(self, uri: str) -> Any:
           """Read resource by URI (Phase 3)."""
           pass  # Stubbed
   ```

3. **Create `src/simply_mcp/core/request_context.py`**
   ```python
   from dataclasses import dataclass
   from typing import Any, Optional

   @dataclass(frozen=True)
   class RequestContext:
       """Request-specific context data."""
       request_id: str
       lifespan_context: Optional[Any] = None
       meta: Optional[dict[str, Any]] = None
   ```

4. **Create `src/simply_mcp/core/context.py`**
   ```python
   from dataclasses import dataclass
   from .fastmcp_info import FastMCPInfo
   from .session import Session
   from .request_context import RequestContext

   @dataclass(frozen=True)
   class Context:
       """Main Context object injected into handlers.

       Immutable to prevent handlers from modifying shared state.
       """
       fastmcp: FastMCPInfo
       session: Session
       request_context: RequestContext
   ```

5. **Update `src/simply_mcp/core/types.py`**
   - Import and export Context types
   - Update handler signatures to accept optional context

### Task 2: Implement ContextBuilder Class

**Duration:** 4 hours (2h TypeScript + 2h Python)
**Outcome:** Working ContextBuilder that creates Context instances

#### TypeScript Implementation

**Create `src/core/ContextBuilder.ts`**

```typescript
import { randomUUID } from 'node:crypto';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { BuildMCPServerOptions } from '../api/programmatic/types.js';
import type { Context, FastMCPInfo, Session, RequestContext } from './Context.js';

/**
 * Builds Context instances for MCP requests
 *
 * Stores server-level information and session data,
 * creates new Context instances per request.
 */
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
        prompts: true,
        resources: true,
        tools: true,
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
   * Generates unique request ID using UUID v4
   */
  buildContext(requestMeta?: {
    progressToken?: string | number;
    [key: string]: any;
  }): Context {
    const request_id = randomUUID();

    const session: Session = {
      session_id: this.sessionData.session_id,
      client_params: this.sessionData.client_params,

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
      lifespan_context: undefined,
    };

    return {
      fastmcp: this.serverInfo,
      session,
      request_context,
    };
  }
}
```

#### Python Implementation

**Update `src/simply_mcp/core/context.py`**

```python
import uuid
from typing import Any, Optional
from mcp.server.lowlevel.server import Server as MCPServer
from .fastmcp_info import FastMCPInfo
from .session import Session
from .request_context import RequestContext

class ContextBuilder:
    """Builds Context instances for MCP requests.

    Stores server-level information and session data,
    creates new Context instances per request.
    """

    def __init__(self, mcp_server: MCPServer, config: 'SimplyMCPConfig'):
        """Initialize context builder with MCP server and config."""
        from simply_mcp.core.config import SimplyMCPConfig

        self.mcp_server = mcp_server

        # Extract FastMCPInfo from MCP Server
        self.server_info = FastMCPInfo(
            name=config.server.name,
            version=config.server.version,
            instructions=config.server.description,
            website_url=config.server.homepage,
            capabilities={
                "sampling": getattr(config.capabilities, "sampling", False) if hasattr(config, "capabilities") else False,
                "logging": getattr(config.capabilities, "logging", False) if hasattr(config, "capabilities") else False,
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

    def build_context(
        self,
        request_meta: Optional[dict[str, Any]] = None
    ) -> 'Context':
        """Build a Context instance for a request.

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
            lifespan_context=None,
        )

        return Context(
            fastmcp=self.server_info,
            session=session,
            request_context=request_context,
        )
```

### Task 3: Implement Request ID Generation

**Duration:** 3 hours (1.5h TypeScript + 1.5h Python)
**Outcome:** UUID v4 generation, uniqueness tests, performance validation

#### TypeScript

1. **Already implemented in ContextBuilder** (uses `randomUUID()` from Node.js)
2. **Add utility function for testing** (optional)
   ```typescript
   // src/core/utils/uuid.ts
   import { randomUUID } from 'node:crypto';

   export function generateRequestId(): string {
     return randomUUID();
   }

   export function isValidUUID(uuid: string): boolean {
     const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
     return uuidRegex.test(uuid);
   }
   ```

#### Python

1. **Already implemented in ContextBuilder** (uses `uuid.uuid4()`)
2. **Add utility function for testing** (optional)
   ```python
   # src/simply_mcp/core/utils/uuid.py
   import uuid
   import re

   def generate_request_id() -> str:
       """Generate a unique request ID using UUID v4."""
       return str(uuid.uuid4())

   def is_valid_uuid(uuid_str: str) -> bool:
       """Check if string is a valid UUID v4."""
       uuid_regex = re.compile(
           r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
           re.IGNORECASE
       )
       return bool(uuid_regex.match(uuid_str))
   ```

### Task 4: Integrate with BuildMCPServer / SimplyMCPServer

**Duration:** 4 hours (2h TypeScript + 2h Python)
**Outcome:** Context injection working in all handler types

#### TypeScript Integration

**Modify `src/api/programmatic/BuildMCPServer.ts`**

```typescript
import { ContextBuilder } from '../../core/ContextBuilder.js';
import type { Context } from '../../core/Context.js';

export class BuildMCPServer {
  // Add context builder
  private contextBuilder?: ContextBuilder;

  // In start() method, after creating MCP server
  async start(options?: StartOptions): Promise<void> {
    // ... existing server creation code ...

    // Create context builder
    this.contextBuilder = new ContextBuilder(this.server, this.options);

    // Register initialize handler
    this.registerInitializeHandler();

    // Register tool/prompt/resource handlers
    this.registerToolHandlers();
    this.registerPromptHandlers();
    this.registerResourceHandlers();

    // ... rest of start logic ...
  }

  /**
   * Register initialize handler to capture client params
   */
  private registerInitializeHandler(): void {
    this.server!.setRequestHandler(InitializeRequestSchema, async (request) => {
      // Capture client parameters
      if (this.contextBuilder) {
        this.contextBuilder.setClientParams({
          clientInfo: request.params.clientInfo,
          capabilities: request.params.capabilities,
        });
      }

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
          logging: this.options.capabilities?.logging ? {} : undefined,
          sampling: this.options.capabilities?.sampling ? {} : undefined,
        },
      };
    });
  }

  /**
   * Modified tool handler to inject context
   */
  private registerToolHandlers(): void {
    this.server!.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const tool = this.tools.get(toolName);

      if (!tool) {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      const args = request.params.arguments || {};
      const requestMeta = request.params._meta;

      // Build context
      const context = this.contextBuilder?.buildContext(requestMeta);

      try {
        const validatedArgs = tool.definition.parameters.parse(args);

        // Check if handler needs context
        const result = this.needsContext(tool.definition.execute)
          ? await tool.definition.execute(validatedArgs, context)
          : await tool.definition.execute(validatedArgs);

        return await this.normalizeResult(result);
      } catch (error) {
        // ... error handling ...
      }
    });
  }

  /**
   * Check if function needs context parameter
   */
  private needsContext(fn: Function): boolean {
    // Simple check: does function have 2+ parameters?
    // More sophisticated: parse function signature
    return fn.length >= 2;
  }
}
```

#### Python Integration

**Modify `src/simply_mcp/core/server.py`**

```python
from simply_mcp.core.context import ContextBuilder, Context
import inspect

class SimplyMCPServer:
    def __init__(self, config: SimplyMCPConfig | None = None):
        # ... existing init code ...

        # Create context builder
        self.context_builder = ContextBuilder(self.mcp_server, self.config)

    async def initialize(self):
        """Initialize server and register handlers."""
        # Register initialize handler
        @self.mcp_server.request_handler(types.InitializeRequest)
        async def handle_initialize(request: types.InitializeRequest):
            # Capture client parameters
            self.context_builder.set_client_params({
                "clientInfo": request.params.clientInfo,
                "capabilities": request.params.capabilities,
            })

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

        # Register tool handler
        @self.mcp_server.request_handler(types.CallToolRequest)
        async def handle_call_tool(request: types.CallToolRequest):
            tool_name = request.params.name
            tool_config = self.registry.get_tool(tool_name)

            if not tool_config:
                raise HandlerNotFoundError(f"Tool not found: {tool_name}")

            # Build context
            request_meta = getattr(request.params, '_meta', {})
            context = self.context_builder.build_context(request_meta)

            # Execute handler with context if it accepts it
            handler = tool_config.handler
            args = request.params.arguments or {}

            if self._needs_context(handler):
                result = await handler(**args, context=context)
            else:
                result = await handler(**args)

            return self._normalize_result(result)

    def _needs_context(self, fn: Callable) -> bool:
        """Check if handler function accepts a context parameter."""
        sig = inspect.signature(fn)
        for param_name, param in sig.parameters.items():
            if param_name in ('context', 'ctx'):
                return True
            if param.annotation == Context:
                return True
        return False
```

### Task 5: Update Handler Signatures

**Duration:** 3 hours (1.5h TypeScript + 1.5h Python)
**Outcome:** All handler types support optional context parameter

#### TypeScript

**Update `src/api/programmatic/types.ts`**

```typescript
import type { Context } from '../../core/Context.js';

/**
 * Execute function type for tools
 * Context parameter is optional for backward compatibility
 */
export type ExecuteFunction<T = any> = (
  args: T,
  context?: Context  // <-- Add optional context parameter
) =>
  | Promise<string | HandlerResult | ImageInput | BinaryInput | AudioInput>
  | string
  | HandlerResult
  | ImageInput
  | BinaryInput
  | AudioInput;

/**
 * Prompt template function with optional context
 */
export type PromptTemplateFunction = (
  args: Record<string, any>,
  context?: Context  // <-- Add optional context parameter
) => string | Promise<string>;

/**
 * Resource content function with optional context
 */
export type ResourceContentFunction = (
  context?: Context  // <-- Add optional context parameter
) => string | object | Buffer | Uint8Array | Promise<string | object | Buffer | Uint8Array>;
```

#### Python

**Update handler type hints in `src/simply_mcp/core/types.py`**

```python
from typing import Callable, Optional, Any
from .context import Context

# Handler function type with optional context
HandlerFunction = Callable[..., Any]  # Can accept context as keyword arg

# More specific type hints for different handler types
ToolHandler = Callable[..., Any]  # Tool handler (context optional)
PromptHandler = Callable[..., str]  # Prompt handler (context optional)
ResourceHandler = Callable[..., Any]  # Resource handler (context optional)
```

### Task 6: Write Unit Tests

**Duration:** 4 hours (2h TypeScript + 2h Python)
**Outcome:** >90% test coverage, all edge cases validated

#### TypeScript Tests

**Create `tests/context.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ContextBuilder } from '../src/core/ContextBuilder';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

describe('ContextBuilder', () => {
  let server: Server;
  let builder: ContextBuilder;

  beforeEach(() => {
    server = new Server({
      name: 'test-server',
      version: '1.0.0',
    }, {
      capabilities: {},
    });

    builder = new ContextBuilder(server, {
      name: 'test-server',
      version: '1.0.0',
      description: 'Test server',
      capabilities: { sampling: true, logging: true },
    });
  });

  it('should create context with server info', () => {
    const context = builder.buildContext();

    expect(context.fastmcp.name).toBe('test-server');
    expect(context.fastmcp.version).toBe('1.0.0');
    expect(context.fastmcp.instructions).toBe('Test server');
    expect(context.fastmcp.capabilities.sampling).toBe(true);
  });

  it('should generate unique request IDs', () => {
    const ctx1 = builder.buildContext();
    const ctx2 = builder.buildContext();

    expect(ctx1.request_context.request_id).not.toBe(ctx2.request_context.request_id);
  });

  it('should include client params after initialization', () => {
    builder.setClientParams({
      clientInfo: { name: 'test-client', version: '2.0.0' },
      capabilities: { sampling: {} },
    });

    const context = builder.buildContext();

    expect(context.session.client_params?.client_info.name).toBe('test-client');
  });

  it('should include request metadata', () => {
    const context = builder.buildContext({ progressToken: 'xyz' });

    expect(context.request_context.meta?.progressToken).toBe('xyz');
  });

  it('should support session ID for HTTP transport', () => {
    builder.setSessionId('session-123');
    const context = builder.buildContext();

    expect(context.session.session_id).toBe('session-123');
  });
});
```

**Create `tests/request-id.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { isValidUUID } from '../src/core/utils/uuid';
import { ContextBuilder } from '../src/core/ContextBuilder';

describe('Request ID Generation', () => {
  it('should generate valid UUID v4 format', () => {
    const builder = new ContextBuilder(mockServer, mockOptions);
    const context = builder.buildContext();

    expect(isValidUUID(context.request_context.request_id)).toBe(true);
  });

  it('should generate unique IDs across multiple requests', () => {
    const builder = new ContextBuilder(mockServer, mockOptions);
    const ids = new Set<string>();

    for (let i = 0; i < 1000; i++) {
      const context = builder.buildContext();
      ids.add(context.request_context.request_id);
    }

    expect(ids.size).toBe(1000);
  });
});
```

#### Python Tests

**Create `tests/test_context.py`**

```python
import pytest
from simply_mcp.core.context import ContextBuilder, Context
from simply_mcp.core.config import SimplyMCPConfig, ServerMetadataModel

@pytest.fixture
def config():
    return SimplyMCPConfig(
        server=ServerMetadataModel(
            name="test-server",
            version="1.0.0",
            description="Test server",
        )
    )

@pytest.fixture
def context_builder(mock_mcp_server, config):
    return ContextBuilder(mock_mcp_server, config)

def test_creates_context_with_server_info(context_builder):
    """Test context contains correct server info."""
    context = context_builder.build_context()

    assert context.fastmcp.name == "test-server"
    assert context.fastmcp.version == "1.0.0"
    assert context.fastmcp.instructions == "Test server"

def test_generates_unique_request_ids(context_builder):
    """Test each context has a unique request ID."""
    ctx1 = context_builder.build_context()
    ctx2 = context_builder.build_context()

    assert ctx1.request_context.request_id != ctx2.request_context.request_id

def test_includes_client_params_after_init(context_builder):
    """Test client params are included after initialization."""
    context_builder.set_client_params({
        "clientInfo": {"name": "test-client", "version": "2.0.0"},
        "capabilities": {"sampling": {}},
    })

    context = context_builder.build_context()

    assert context.session.client_params["client_info"]["name"] == "test-client"

def test_includes_request_metadata(context_builder):
    """Test request metadata is included in context."""
    context = context_builder.build_context({"progressToken": "xyz"})

    assert context.request_context.meta["progressToken"] == "xyz"

def test_supports_session_id(context_builder):
    """Test session ID is set for HTTP transport."""
    context_builder.set_session_id("session-123")
    context = context_builder.build_context()

    assert context.session.session_id == "session-123"
```

**Create `tests/test_request_id.py`**

```python
import pytest
import re
from simply_mcp.core.context import ContextBuilder

def test_generates_valid_uuid_format(context_builder):
    """Test request ID is a valid UUID v4."""
    context = context_builder.build_context()
    request_id = context.request_context.request_id

    uuid_regex = re.compile(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
        re.IGNORECASE
    )
    assert uuid_regex.match(request_id) is not None

def test_generates_unique_ids(context_builder):
    """Test multiple contexts have unique request IDs."""
    ids = set()

    for _ in range(1000):
        context = context_builder.build_context()
        ids.add(context.request_context.request_id)

    assert len(ids) == 1000
```

**Create `tests/integration/test_context_injection.py`**

```python
import pytest
from simply_mcp import BuildMCPServer, Context

@pytest.mark.asyncio
async def test_tool_handler_without_context():
    """Test tool handler works without context parameter."""
    server = BuildMCPServer(name="test", version="1.0.0")

    @server.tool()
    def add(a: int, b: int) -> int:
        """Add two numbers."""
        return a + b

    # Simulate tool call
    result = await server._execute_tool("add", {"a": 1, "b": 2})
    assert result == 3

@pytest.mark.asyncio
async def test_tool_handler_with_context():
    """Test tool handler receives context when requested."""
    server = BuildMCPServer(name="test", version="1.0.0")

    received_context = None

    @server.tool()
    def get_server_name(context: Context) -> str:
        """Get server name from context."""
        nonlocal received_context
        received_context = context
        return context.fastmcp.name

    # Simulate tool call
    result = await server._execute_tool("get_server_name", {})

    assert result == "test"
    assert received_context is not None
    assert received_context.fastmcp.name == "test"
```

---

## Daily Schedule

### Day 1: Type Definitions & Context Structure

**TypeScript Team:**
- Morning: Create Context, FastMCPInfo, Session, RequestContext interfaces
- Afternoon: Update types.ts, write basic type tests

**Python Team:**
- Morning: Create Context, FastMCPInfo, Session, RequestContext dataclasses
- Afternoon: Update types.py, write basic type tests

**End of Day:**
- Sync meeting to review type definitions
- Ensure API parity between TS and Python

### Day 2: ContextBuilder Implementation

**TypeScript Team:**
- Morning: Implement ContextBuilder class
- Afternoon: Add UUID generation, write ContextBuilder tests

**Python Team:**
- Morning: Implement ContextBuilder class
- Afternoon: Add UUID generation, write ContextBuilder tests

**End of Day:**
- Code review of ContextBuilder implementations
- Run initial test suites

### Day 3: Server Integration

**TypeScript Team:**
- Morning: Integrate ContextBuilder into BuildMCPServer
- Afternoon: Update initialize handler, add context to tool handlers

**Python Team:**
- Morning: Integrate ContextBuilder into SimplyMCPServer
- Afternoon: Update initialize handler, add context to tool handlers

**End of Day:**
- Integration testing
- Fix any issues with context injection

### Day 4: Handler Updates & Testing

**TypeScript Team:**
- Morning: Update prompt and resource handlers with context
- Afternoon: Write integration tests for all handler types

**Python Team:**
- Morning: Update prompt and resource handlers with context
- Afternoon: Write integration tests for all handler types

**End of Day:**
- Full test suite run
- Coverage analysis (target >90%)

### Day 5: Testing, Documentation & Validation

**Both Teams:**
- Morning: Fix any failing tests, improve coverage
- Afternoon: Update documentation, create examples

**End of Day:**
- Final validation checklist
- Prepare for Phase 2 kickoff

---

## Testing Strategy

### Unit Tests

**Coverage Target:** >95%

1. **Context Type Tests**
   - Interface/dataclass structure
   - Immutability (Python frozen dataclasses)
   - Type safety

2. **ContextBuilder Tests**
   - Server info extraction
   - Client params capture
   - Session ID setting
   - Request ID generation
   - Context building

3. **Request ID Tests**
   - UUID v4 format validation
   - Uniqueness guarantees
   - Performance (1000+ IDs in <100ms)

### Integration Tests

**Coverage Target:** All handler types

1. **Tool Handler Tests**
   - Without context (backward compat)
   - With context (new feature)
   - Context data accuracy

2. **Prompt Handler Tests**
   - Static templates (no context)
   - Dynamic templates (with context)

3. **Resource Handler Tests**
   - Static content (no context)
   - Dynamic content (with context)

4. **Initialize Handler Tests**
   - Client params captured
   - Context updated correctly

### Performance Tests

1. **Context Creation Speed**
   - Should create 1000 contexts in <100ms
   - No memory leaks

2. **UUID Generation Speed**
   - Should generate 10000 UUIDs in <1s
   - All unique

### Cross-Repository Tests

1. **API Parity Tests**
   - Same Context structure in TS and Python
   - Same handler signatures
   - Same behavior

2. **Example Compatibility**
   - Same examples work in both repos
   - Same output

---

## Validation Checklist

### Phase 1 Completion Criteria

- [ ] **Context Structure**
  - [ ] Context interface/dataclass created
  - [ ] FastMCPInfo interface/dataclass created
  - [ ] Session interface/dataclass created
  - [ ] RequestContext interface/dataclass created
  - [ ] All fields properly typed
  - [ ] Immutability enforced (Python frozen dataclasses)

- [ ] **ContextBuilder**
  - [ ] ContextBuilder class implemented
  - [ ] Server info extraction working
  - [ ] Client params capture working
  - [ ] Session ID support working
  - [ ] UUID v4 request ID generation
  - [ ] Context building working

- [ ] **Server Integration**
  - [ ] ContextBuilder integrated into server
  - [ ] Initialize handler captures client params
  - [ ] Tool handlers inject context
  - [ ] Prompt handlers inject context
  - [ ] Resource handlers inject context

- [ ] **Backward Compatibility**
  - [ ] Handlers without context still work
  - [ ] No breaking changes to existing APIs
  - [ ] Function signature inspection working

- [ ] **Testing**
  - [ ] Unit tests >90% coverage
  - [ ] Integration tests pass
  - [ ] Performance tests pass
  - [ ] Cross-repo parity validated

- [ ] **Documentation**
  - [ ] ARCHITECTURE.md complete
  - [ ] IMPLEMENTATION-GUIDE.md complete
  - [ ] CODE-EXAMPLES.md complete
  - [ ] API docs updated

- [ ] **Cross-Language Parity**
  - [ ] Identical Context structure
  - [ ] Identical handler signatures
  - [ ] Identical behavior
  - [ ] Examples work in both repos

### Pre-Merge Checklist

- [ ] All tests passing in TypeScript
- [ ] All tests passing in Python
- [ ] Coverage >90% in both repos
- [ ] No linter errors
- [ ] Documentation updated
- [ ] Examples added
- [ ] Code review completed
- [ ] API parity validated

---

## Troubleshooting

### Common Issues

#### Issue: "Context is undefined in handler"

**Cause:** ContextBuilder not initialized or not passed to handler

**Solution:**
```typescript
// Ensure ContextBuilder is created in start()
this.contextBuilder = new ContextBuilder(this.server, this.options);

// Ensure context is built and passed
const context = this.contextBuilder?.buildContext(requestMeta);
```

#### Issue: "Handler signature inspection not working"

**Cause:** Function parameter names not detected correctly

**Solution (TypeScript):**
```typescript
// Use explicit parameter count check
private needsContext(fn: Function): boolean {
  return fn.length >= 2;  // Has at least 2 parameters
}
```

**Solution (Python):**
```python
import inspect

def needs_context(fn: Callable) -> bool:
    sig = inspect.signature(fn)
    # Check for 'context' or 'ctx' parameter name
    return any(p in ('context', 'ctx') for p in sig.parameters)
```

#### Issue: "Request IDs not unique"

**Cause:** Using timestamp instead of UUID, or UUID generation issue

**Solution:**
```typescript
// Always use randomUUID from crypto
import { randomUUID } from 'node:crypto';
const request_id = randomUUID();
```

```python
# Always use uuid.uuid4()
import uuid
request_id = str(uuid.uuid4())
```

#### Issue: "Client params not captured"

**Cause:** Initialize handler not registered or not calling setClientParams

**Solution:**
```typescript
// Register initialize handler before other handlers
this.server.setRequestHandler(InitializeRequestSchema, async (request) => {
  this.contextBuilder.setClientParams({
    clientInfo: request.params.clientInfo,
    capabilities: request.params.capabilities,
  });
  return { /* ... */ };
});
```

#### Issue: "Tests failing with 'context is not defined'"

**Cause:** Mock server not providing context in tests

**Solution:**
```typescript
// Create mock context in tests
const mockContext: Context = {
  fastmcp: { name: 'test', version: '1.0.0', capabilities: {} },
  session: { /* ... */ },
  request_context: { request_id: 'test-id' },
};
```

### Performance Issues

#### Issue: "Context creation is slow"

**Diagnosis:** Profile context building

**Solution:**
- Avoid deep copying large objects
- Use object references where possible
- Cache FastMCPInfo (server info doesn't change)

#### Issue: "Memory leak in context objects"

**Diagnosis:** Use memory profiler

**Solution:**
- Ensure contexts are not stored globally
- Don't add circular references
- Use WeakMap for internal references

---

## Next Steps After Phase 1

Once Phase 1 is complete:

1. **Phase 2: Notifications & Metadata**
   - Implement notification methods on Session
   - Add request metadata exposure
   - Client capabilities tracking

2. **Phase 3: Transport & Lifecycle**
   - Implement lifespan context
   - Add lifecycle hooks
   - Advanced session management

3. **Phase 4: Developer Tools**
   - MCP Inspector integration
   - Enhanced CLI features
   - Direct execution support

---

## Summary

This implementation guide provides:

- **Clear task breakdown** with time estimates
- **Step-by-step instructions** for each component
- **Code examples** for TypeScript and Python
- **Testing strategy** with coverage targets
- **Daily schedule** for 5-day completion
- **Validation checklist** for quality assurance
- **Troubleshooting guide** for common issues

Follow this guide to implement Phase 1 Context system successfully in both repositories with full API parity and backward compatibility.

**Status:** Ready for Implementation
**Next:** Begin Day 1 tasks
