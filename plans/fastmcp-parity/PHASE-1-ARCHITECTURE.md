# Phase 1: Context System Architecture Design

**Version:** 1.0
**Date:** 2025-10-18
**Status:** Ready for Implementation
**Repositories:** simply-mcp (TypeScript) + simply-mcp-py (Python)

---

## Executive Summary

This document defines the complete architecture for the Phase 1 context system implementation in both TypeScript and Python repositories. The context system establishes a unified object exposing three property groups (`fastmcp`, `session`, `request_context`) that provide handlers with comprehensive access to server metadata, session management, and request-specific information.

### Key Design Principles

1. **Backward Compatibility**: Handlers without context parameter continue to work
2. **Type Safety**: Full TypeScript/Python type definitions with IDE autocomplete
3. **Cross-Language Consistency**: Semantically identical APIs in both languages
4. **Incremental Implementation**: Phase 1 methods are stubbed for later phases
5. **Zero Breaking Changes**: Purely additive feature set

---

## Table of Contents

1. [Context Object Structure](#1-context-object-structure)
2. [Session Methods](#2-session-methods)
3. [Request ID System](#3-request-id-system)
4. [Handler Integration](#4-handler-integration)
5. [Cross-Language Consistency](#5-cross-language-consistency)
6. [Type Definitions](#6-type-definitions)
7. [Implementation Guidelines](#7-implementation-guidelines)
8. [Architecture Diagrams](#8-architecture-diagrams)

---

## 1. Context Object Structure

### 1.1 Overview

The Context object is the unified interface exposed to all handler types (tools, prompts, resources). It contains three distinct property groups, each serving a specific purpose:

```typescript
// TypeScript Example
interface Context {
  fastmcp: FastMCPInfo;      // Server metadata (immutable)
  session: Session;           // Session management (mutable, async methods)
  request_context: RequestContext;  // Request-specific data (immutable per request)
}
```

```python
# Python Example
class Context:
    fastmcp: FastMCPInfo
    session: Session
    request_context: RequestContext
```

### 1.2 Property Group: `fastmcp`

**Purpose:** Provides immutable server metadata available to all handlers

**Properties:**

| Property | Type | Description | Phase 1 | Example |
|----------|------|-------------|---------|---------|
| `name` | `string` | Server name | ✅ Yes | `"my-mcp-server"` |
| `version` | `string` | Server version | ✅ Yes | `"1.0.0"` |
| `description` | `string \| undefined` | Server description | ✅ Yes | `"Analytics MCP Server"` |
| `instructions` | `string \| undefined` | Server instructions for LLMs | ❌ Phase 3 | `"Use tools carefully"` |
| `website_url` | `string \| undefined` | Server website | ❌ Phase 3 | `"https://example.com"` |
| `icons` | `Icons \| undefined` | Server icon URIs | ❌ Phase 3 | `{ light: "...", dark: "..." }` |
| `settings` | `Record<string, any>` | Server-specific settings | ❌ Phase 3 | `{ theme: "dark" }` |

**Naming Convention:** Snake_case for multi-word properties (follows FastMCP)

**Implementation Notes:**
- All properties are read-only from handler perspective
- Values sourced from `BuildMCPServerOptions` (TS) or `SimplyMCPServer.__init__` (PY)
- Phase 1: Only `name`, `version`, `description` are populated
- Phase 3+: Remaining properties added without breaking changes

### 1.3 Property Group: `session`

**Purpose:** Provides session-level operations and client interaction methods

**Properties:**

| Property | Type | Description | Phase 1 |
|----------|------|-------------|---------|
| `client_params` | `ClientCapabilities \| undefined` | Client capabilities from initialize | ❌ Phase 2 |

**Methods:** (See Section 2 for detailed signatures)

| Method | Return Type | Description | Phase 1 |
|--------|-------------|-------------|---------|
| `send_log_message(level, data, logger?)` | `Promise<void>` | Send log to client | ✅ Stub |
| `create_message(messages, options?)` | `Promise<CreateMessageResult>` | Request LLM completion | ✅ Stub |
| `send_progress_notification(token, progress, total?, message?)` | `Promise<void>` | Send progress update | ✅ Stub |
| `send_resource_updated(uri)` | `Promise<void>` | Notify resource changed | ✅ Stub |
| `send_resource_list_changed()` | `Promise<void>` | Notify resource list changed | ✅ Stub |
| `send_tool_list_changed()` | `Promise<void>` | Notify tool list changed | ✅ Stub |
| `send_prompt_list_changed()` | `Promise<void>` | Notify prompt list changed | ✅ Stub |

**Implementation Notes:**
- All methods are async (return `Promise<void>` in TS, async in Python)
- Phase 1: All methods are stubbed (no-op implementations with TODO comments)
- Phase 2: Notification methods implemented
- Session object is shared across all requests in the same MCP session

### 1.4 Property Group: `request_context`

**Purpose:** Provides request-specific metadata and lifecycle information

**Properties:**

| Property | Type | Description | Phase 1 |
|----------|------|-------------|---------|
| `request_id` | `string` | Unique request identifier (UUID v4) | ✅ Yes |
| `meta` | `RequestMeta \| undefined` | Request metadata (progressToken, etc.) | ❌ Phase 2 |
| `lifespan_context` | `T \| undefined` | Typed lifespan state | ❌ Phase 3 |

**Naming Convention:**
- `request_id` (snake_case) for consistency with FastMCP
- `meta` (lowercase) for brevity
- `lifespan_context` (snake_case) for multi-word clarity

**Implementation Notes:**
- `request_id` is generated fresh for each request (see Section 3)
- `meta` will expose `progressToken` from MCP request metadata
- `lifespan_context` provides typed access to server lifecycle state
- All properties are immutable within a request scope

---

## 2. Session Methods

### 2.1 Method Specifications

All session methods are **async** in both TypeScript and Python for consistency.

#### 2.1.1 `send_log_message()`

**Purpose:** Send a log message to the client via MCP notifications/message

**TypeScript Signature:**
```typescript
async send_log_message(
  level: LogLevel,
  data: string,
  logger?: string
): Promise<void>
```

**Python Signature:**
```python
async def send_log_message(
    self,
    level: LogLevel,
    data: str,
    logger: Optional[str] = None
) -> None
```

**Parameters:**
- `level`: Log severity (`"debug"` | `"info"` | `"notice"` | `"warning"` | `"error"` | `"critical"` | `"alert"` | `"emergency"`)
- `data`: Log message content
- `logger`: Optional logger name (defaults to server name)

**Phase 1 Implementation:**
```typescript
async send_log_message(level: LogLevel, data: string, logger?: string): Promise<void> {
  // TODO: Phase 2 - Implement notifications/message
  console.warn('[Context.Session] send_log_message() not yet implemented (Phase 2)');
}
```

**Phase 2 Implementation:** Calls `server.notification()` with proper MCP format

---

#### 2.1.2 `create_message()`

**Purpose:** Request LLM completion from client (sampling capability)

**TypeScript Signature:**
```typescript
async create_message(
  messages: SamplingMessage[],
  options?: SamplingOptions
): Promise<CreateMessageResult>
```

**Python Signature:**
```python
async def create_message(
    self,
    messages: List[SamplingMessage],
    options: Optional[SamplingOptions] = None
) -> CreateMessageResult
```

**Parameters:**
- `messages`: Array of chat messages (role + content)
- `options`: Optional sampling parameters (maxTokens, temperature, etc.)

**Phase 1 Implementation:**
```typescript
async create_message(
  messages: SamplingMessage[],
  options?: SamplingOptions
): Promise<CreateMessageResult> {
  throw new Error(
    'create_message() not yet implemented (Phase 2)\n\n' +
    'What went wrong:\n' +
    '  This feature requires client sampling capability support.\n\n' +
    'To fix:\n' +
    '  Wait for Phase 2 implementation or use existing context.sample() method.'
  );
}
```

**Phase 2 Implementation:** Delegates to existing sampling capability

---

#### 2.1.3 `send_progress_notification()`

**Purpose:** Send progress updates to client during long-running operations

**TypeScript Signature:**
```typescript
async send_progress_notification(
  progressToken: string | number,
  progress: number,
  total?: number,
  message?: string
): Promise<void>
```

**Python Signature:**
```python
async def send_progress_notification(
    self,
    progress_token: Union[str, int],
    progress: float,
    total: Optional[float] = None,
    message: Optional[str] = None
) -> None
```

**Parameters:**
- `progressToken` / `progress_token`: Token from request metadata
- `progress`: Current progress value
- `total`: Optional total value for percentage calculation
- `message`: Optional progress message

**Phase 1 Implementation:**
```typescript
async send_progress_notification(
  progressToken: string | number,
  progress: number,
  total?: number,
  message?: string
): Promise<void> {
  // TODO: Phase 2 - Implement notifications/progress
  console.warn('[Context.Session] send_progress_notification() not yet implemented (Phase 2)');
}
```

**Phase 2 Implementation:** Uses existing progress notification infrastructure

---

#### 2.1.4 `send_resource_updated()`

**Purpose:** Notify client that a specific resource has changed

**TypeScript Signature:**
```typescript
async send_resource_updated(uri: string): Promise<void>
```

**Python Signature:**
```python
async def send_resource_updated(self, uri: str) -> None
```

**Parameters:**
- `uri`: URI of the updated resource

**Phase 1 Implementation:**
```typescript
async send_resource_updated(uri: string): Promise<void> {
  // TODO: Phase 2 - Implement notifications/resources/updated
  console.warn('[Context.Session] send_resource_updated() not yet implemented (Phase 2)');
}
```

---

#### 2.1.5 `send_resource_list_changed()`

**Purpose:** Notify client that the list of available resources has changed

**TypeScript Signature:**
```typescript
async send_resource_list_changed(): Promise<void>
```

**Python Signature:**
```python
async def send_resource_list_changed(self) -> None
```

**Phase 1 Implementation:**
```typescript
async send_resource_list_changed(): Promise<void> {
  // TODO: Phase 2 - Implement notifications/resources/list_changed
  console.warn('[Context.Session] send_resource_list_changed() not yet implemented (Phase 2)');
}
```

---

#### 2.1.6 `send_tool_list_changed()`

**Purpose:** Notify client that the list of available tools has changed

**TypeScript Signature:**
```typescript
async send_tool_list_changed(): Promise<void>
```

**Python Signature:**
```python
async def send_tool_list_changed(self) -> None
```

**Phase 1 Implementation:**
```typescript
async send_tool_list_changed(): Promise<void> {
  // TODO: Phase 2 - Implement notifications/tools/list_changed
  console.warn('[Context.Session] send_tool_list_changed() not yet implemented (Phase 2)');
}
```

---

#### 2.1.7 `send_prompt_list_changed()`

**Purpose:** Notify client that the list of available prompts has changed

**TypeScript Signature:**
```typescript
async send_prompt_list_changed(): Promise<void>
```

**Python Signature:**
```python
async def send_prompt_list_changed(self) -> None
```

**Phase 1 Implementation:**
```typescript
async send_prompt_list_changed(): Promise<void> {
  // TODO: Phase 2 - Implement notifications/prompts/list_changed
  console.warn('[Context.Session] send_prompt_list_changed() not yet implemented (Phase 2)');
}
```

---

## 3. Request ID System

### 3.1 Purpose

Unique request IDs enable:
- Request tracing across handler execution
- Log correlation and debugging
- Performance monitoring
- Future multi-server coordination

### 3.2 Generation Strategy

**TypeScript:**
```typescript
import { randomUUID } from 'node:crypto';

function generateRequestId(): string {
  return randomUUID(); // UUID v4: e.g., "550e8400-e29b-41d4-a716-446655440000"
}
```

**Python:**
```python
import uuid

def generate_request_id() -> str:
    return str(uuid.uuid4())
```

### 3.3 Request Lifecycle Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. MCP Request Received                                     │
│    (tools/call, prompts/get, resources/read)                │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Generate Request ID                                      │
│    request_id = generateRequestId()                         │
│    → "550e8400-e29b-41d4-a716-446655440000"                 │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Create RequestContext                                    │
│    request_context = new RequestContext({                   │
│      request_id: request_id,                                │
│      meta: undefined  // Phase 2                            │
│    })                                                        │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Create Context Object                                    │
│    context = new Context({                                  │
│      fastmcp: fastmcpInfo,                                  │
│      session: sessionObject,                                │
│      request_context: requestContext                        │
│    })                                                        │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Execute Handler                                          │
│    result = await handler.execute(args, context)            │
│                                                              │
│    Handler can access:                                      │
│    - context.request_context.request_id                     │
│    - context.fastmcp.name, version, description             │
│    - context.session.send_*() methods                       │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Return Result                                            │
│    Request ID logged in metadata (optional)                 │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Request ID Exposure

**Via Context (Primary):**
```typescript
// Tool handler
async function myTool(args: any, context: Context) {
  const requestId = context.request_context.request_id;
  console.log(`Processing request ${requestId}`);
  // ... tool logic
}
```

**Via Logger (Secondary):**
```typescript
// Logger should include request ID in metadata
context.logger.info('Processing started', {
  request_id: context.request_context.request_id
});
```

### 3.5 Thread Safety Considerations

**TypeScript:**
- Single-threaded event loop: No race conditions
- Each request gets a fresh `RequestContext` instance
- Session object shared across requests (must be stateless)

**Python:**
- Async context: Each request handled in separate coroutine
- `RequestContext` is immutable after creation
- Session object shared (uses locks for mutable state if needed in Phase 2+)

---

## 4. Handler Integration

### 4.1 Integration Overview

Context must be injected into **all three handler types**:
1. Tool handlers (`tools/call`)
2. Prompt handlers (`prompts/get`)
3. Resource handlers (`resources/read`)

### 4.2 Backward Compatibility Strategy

**Key Requirement:** Existing handlers without context parameter must continue to work

**Solution:** Optional context parameter with signature detection

**TypeScript Approach:**
```typescript
type ExecuteFunction<T = any> = (
  args: T,
  context?: Context  // Optional parameter
) => Promise<HandlerResult> | HandlerResult;

// Backward compatible:
async function oldHandler(args: any) {
  return "Hello";  // Works without context
}

// New style:
async function newHandler(args: any, context: Context) {
  console.log(`Request ID: ${context.request_context.request_id}`);
  return "Hello";
}
```

**Python Approach:**
```python
from typing import Optional, Union

async def old_handler(args: dict) -> str:
    return "Hello"  # Works without context

async def new_handler(args: dict, context: Optional[Context] = None) -> str:
    if context:
        print(f"Request ID: {context.request_context.request_id}")
    return "Hello"
```

### 4.3 Tool Handler Integration

**Current Signature (TypeScript):**
```typescript
export type ExecuteFunction<T = any> = (
  args: T,
  context?: HandlerContext  // Currently uses HandlerContext
) => Promise<string | HandlerResult> | string | HandlerResult;
```

**Phase 1 Migration Strategy:**

**Option A: Replace HandlerContext with Context**
```typescript
export type ExecuteFunction<T = any> = (
  args: T,
  context?: Context  // New unified Context
) => Promise<string | HandlerResult> | string | HandlerResult;
```

**Option B: Extend HandlerContext to Include Context Properties**
```typescript
export interface HandlerContext {
  // Existing properties
  sessionId?: string;
  logger: Logger;
  permissions?: Permissions;
  metadata?: Record<string, unknown>;

  // New Phase 1 properties
  fastmcp?: FastMCPInfo;
  session?: Session;
  request_context?: RequestContext;

  // Existing optional methods
  sample?: (messages: SamplingMessage[], options?: SamplingOptions) => Promise<any>;
  reportProgress?: (progress: number, total?: number, message?: string) => Promise<void>;
  readResource?: (uri: string) => Promise<ResourceContents>;
}
```

**Recommended:** **Option A** (cleaner separation, aligns with FastMCP)

**Implementation in BuildMCPServer:**
```typescript
// In registerToolHandlers() - CallToolRequestSchema handler
const context: Context = {
  fastmcp: this.fastmcpInfo,
  session: this.sessionObject,
  request_context: {
    request_id: generateRequestId(),
    meta: undefined,  // Phase 2
    lifespan_context: undefined,  // Phase 3
  }
};

// Execute tool with context
const result = await tool.definition.execute(validatedArgs, context);
```

### 4.4 Prompt Handler Integration

**Current State:** Prompts do not receive context parameter

**Phase 1 Change:** Add optional context parameter to dynamic templates

**Before:**
```typescript
export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{ name: string; description: string; required: boolean }>;
  template: string | ((args: Record<string, any>) => string | Promise<string>);
}
```

**After:**
```typescript
export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{ name: string; description: string; required: boolean }>;
  template: string | ((args: Record<string, any>, context?: Context) => string | Promise<string>);
}
```

**Implementation:**
```typescript
// In registerPromptHandlers() - GetPromptRequestSchema handler
const context: Context = {
  fastmcp: this.fastmcpInfo,
  session: this.sessionObject,
  request_context: {
    request_id: generateRequestId(),
    meta: undefined,
    lifespan_context: undefined,
  }
};

let renderedText: string;
if (typeof prompt.template === 'function') {
  // Pass context to dynamic template function
  renderedText = await Promise.resolve(prompt.template(args, context));
} else {
  renderedText = this.renderTemplate(prompt.template, args);
}
```

### 4.5 Resource Handler Integration

**Current State:** Resources do not receive context parameter

**Phase 1 Change:** Add optional context parameter to dynamic content functions

**Before:**
```typescript
export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  content: string | object | Buffer | Uint8Array | (() => ...);
}
```

**After:**
```typescript
export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  content:
    | string
    | object
    | Buffer
    | Uint8Array
    | ((context?: Context) => string | object | Buffer | Uint8Array | Promise<...>);
}
```

**Implementation:**
```typescript
// In registerResourceHandlers() - ReadResourceRequestSchema handler
const context: Context = {
  fastmcp: this.fastmcpInfo,
  session: this.sessionObject,
  request_context: {
    request_id: generateRequestId(),
    meta: undefined,
    lifespan_context: undefined,
  }
};

let content: string | object | Buffer | Uint8Array;
if (typeof resource.content === 'function') {
  // Pass context to dynamic content function
  content = await Promise.resolve(resource.content(context));
} else {
  content = resource.content;
}
```

### 4.6 Backward Compatibility Testing

**Test Cases Required:**

1. **Tool without context parameter works**
   ```typescript
   server.addTool({
     name: 'old-style',
     description: 'Old style tool',
     parameters: z.object({}),
     execute: async (args) => "Hello"  // No context param
   });
   ```

2. **Tool with context parameter receives valid context**
   ```typescript
   server.addTool({
     name: 'new-style',
     description: 'New style tool',
     parameters: z.object({}),
     execute: async (args, context) => {
       assert(context.request_context.request_id);
       return "Hello";
     }
   });
   ```

3. **Prompt without context parameter works**
   ```typescript
   server.addPrompt({
     name: 'old-prompt',
     description: 'Old style prompt',
     template: (args) => `Hello ${args.name}`  // No context
   });
   ```

4. **Prompt with context parameter receives valid context**
   ```typescript
   server.addPrompt({
     name: 'new-prompt',
     description: 'New style prompt',
     template: (args, context) => {
       const reqId = context?.request_context.request_id || 'unknown';
       return `Request ${reqId}: Hello ${args.name}`;
     }
   });
   ```

---

## 5. Cross-Language Consistency

### 5.1 Naming Conventions

| Concept | TypeScript | Python | Rationale |
|---------|-----------|--------|-----------|
| Class names | `Context`, `Session`, `FastMCPInfo` | `Context`, `Session`, `FastMCPInfo` | PascalCase universally |
| Property names | `request_id`, `website_url` | `request_id`, `website_url` | snake_case matches FastMCP |
| Method names | `send_log_message()` | `send_log_message()` | snake_case for consistency |
| Type parameters | `<T>` | `[T]` (TypeVar) | Language idioms |

### 5.2 Async Patterns

**TypeScript:**
- All session methods return `Promise<void>` or `Promise<T>`
- Use `async/await` syntax
- No synchronous fallbacks

**Python:**
- All session methods are `async def`
- Use `await` for invocation
- No synchronous fallbacks (forces async consistency)

**Example:**
```typescript
// TypeScript
await context.session.send_log_message('info', 'Processing...');
```

```python
# Python
await context.session.send_log_message('info', 'Processing...')
```

### 5.3 Type Safety

**TypeScript:**
```typescript
interface Context {
  readonly fastmcp: FastMCPInfo;
  readonly session: Session;
  readonly request_context: RequestContext;
}

interface FastMCPInfo {
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  // Phase 3+
  readonly instructions?: string;
  readonly website_url?: string;
  readonly icons?: Icons;
  readonly settings?: Record<string, any>;
}

interface Session {
  // Phase 2+
  readonly client_params?: ClientCapabilities;

  // Methods
  send_log_message(level: LogLevel, data: string, logger?: string): Promise<void>;
  create_message(messages: SamplingMessage[], options?: SamplingOptions): Promise<CreateMessageResult>;
  send_progress_notification(progressToken: string | number, progress: number, total?: number, message?: string): Promise<void>;
  send_resource_updated(uri: string): Promise<void>;
  send_resource_list_changed(): Promise<void>;
  send_tool_list_changed(): Promise<void>;
  send_prompt_list_changed(): Promise<void>;
}

interface RequestContext {
  readonly request_id: string;
  readonly meta?: RequestMeta;  // Phase 2+
  readonly lifespan_context?: any;  // Phase 3+ (typed via generics)
}
```

**Python:**
```python
from dataclasses import dataclass
from typing import Optional, Any, Dict, List
from abc import ABC, abstractmethod

@dataclass(frozen=True)
class FastMCPInfo:
    name: str
    version: str
    description: Optional[str] = None
    # Phase 3+
    instructions: Optional[str] = None
    website_url: Optional[str] = None
    icons: Optional[Dict[str, str]] = None
    settings: Optional[Dict[str, Any]] = None

class Session(ABC):
    # Phase 2+
    client_params: Optional[ClientCapabilities] = None

    @abstractmethod
    async def send_log_message(
        self,
        level: str,
        data: str,
        logger: Optional[str] = None
    ) -> None:
        pass

    @abstractmethod
    async def create_message(
        self,
        messages: List[SamplingMessage],
        options: Optional[SamplingOptions] = None
    ) -> CreateMessageResult:
        pass

    @abstractmethod
    async def send_progress_notification(
        self,
        progress_token: str | int,
        progress: float,
        total: Optional[float] = None,
        message: Optional[str] = None
    ) -> None:
        pass

    @abstractmethod
    async def send_resource_updated(self, uri: str) -> None:
        pass

    @abstractmethod
    async def send_resource_list_changed(self) -> None:
        pass

    @abstractmethod
    async def send_tool_list_changed(self) -> None:
        pass

    @abstractmethod
    async def send_prompt_list_changed(self) -> None:
        pass

@dataclass(frozen=True)
class RequestContext:
    request_id: str
    meta: Optional[RequestMeta] = None  # Phase 2+
    lifespan_context: Optional[Any] = None  # Phase 3+

@dataclass(frozen=True)
class Context:
    fastmcp: FastMCPInfo
    session: Session
    request_context: RequestContext
```

### 5.4 Error Handling Consistency

**Principle:** Same error messages in both languages

**Example:**
```typescript
// TypeScript
throw new Error(
  'create_message() not yet implemented (Phase 2)\n\n' +
  'What went wrong:\n' +
  '  This feature requires client sampling capability support.\n\n' +
  'To fix:\n' +
  '  Wait for Phase 2 implementation or use existing context.sample() method.'
);
```

```python
# Python
raise NotImplementedError(
    "create_message() not yet implemented (Phase 2)\n\n"
    "What went wrong:\n"
    "  This feature requires client sampling capability support.\n\n"
    "To fix:\n"
    "  Wait for Phase 2 implementation or use existing context.sample() method."
)
```

---

## 6. Type Definitions

### 6.1 TypeScript Complete Definitions

**File:** `src/core/Context.ts`

```typescript
/**
 * Context object exposed to all handlers
 * Provides access to server metadata, session management, and request information
 */
export interface Context {
  /**
   * Immutable server metadata
   */
  readonly fastmcp: FastMCPInfo;

  /**
   * Session-level operations and client interaction
   */
  readonly session: Session;

  /**
   * Request-specific metadata
   */
  readonly request_context: RequestContext;
}

/**
 * Server metadata accessible via context.fastmcp
 */
export interface FastMCPInfo {
  /** Server name */
  readonly name: string;

  /** Server version (semver) */
  readonly version: string;

  /** Server description */
  readonly description?: string;

  /** Server instructions for LLMs (Phase 3) */
  readonly instructions?: string;

  /** Server website URL (Phase 3) */
  readonly website_url?: string;

  /** Server icon URIs (Phase 3) */
  readonly icons?: Icons;

  /** Server-specific settings (Phase 3) */
  readonly settings?: Record<string, any>;
}

/**
 * Server icons for light and dark themes
 */
export interface Icons {
  /** Icon URI for light theme */
  light?: string;

  /** Icon URI for dark theme */
  dark?: string;
}

/**
 * Session object for client interaction
 */
export interface Session {
  /**
   * Client capabilities from initialize request (Phase 2)
   */
  readonly client_params?: ClientCapabilities;

  /**
   * Send a log message to the client
   * @param level Log severity level
   * @param data Log message content
   * @param logger Optional logger name (defaults to server name)
   */
  send_log_message(level: LogLevel, data: string, logger?: string): Promise<void>;

  /**
   * Request LLM completion from client
   * @param messages Chat messages for LLM
   * @param options Optional sampling parameters
   * @returns LLM completion result
   */
  create_message(
    messages: SamplingMessage[],
    options?: SamplingOptions
  ): Promise<CreateMessageResult>;

  /**
   * Send progress notification to client
   * @param progressToken Token from request metadata
   * @param progress Current progress value
   * @param total Optional total value
   * @param message Optional progress message
   */
  send_progress_notification(
    progressToken: string | number,
    progress: number,
    total?: number,
    message?: string
  ): Promise<void>;

  /**
   * Notify client that a resource has been updated
   * @param uri URI of the updated resource
   */
  send_resource_updated(uri: string): Promise<void>;

  /**
   * Notify client that the resource list has changed
   */
  send_resource_list_changed(): Promise<void>;

  /**
   * Notify client that the tool list has changed
   */
  send_tool_list_changed(): Promise<void>;

  /**
   * Notify client that the prompt list has changed
   */
  send_prompt_list_changed(): Promise<void>;
}

/**
 * Request-specific context information
 */
export interface RequestContext {
  /**
   * Unique request identifier (UUID v4)
   */
  readonly request_id: string;

  /**
   * Request metadata from MCP protocol (Phase 2)
   */
  readonly meta?: RequestMeta;

  /**
   * Typed lifespan context (Phase 3)
   */
  readonly lifespan_context?: any;
}

/**
 * Request metadata from MCP protocol
 */
export interface RequestMeta {
  /**
   * Progress token for long-running operations
   */
  progressToken?: string | number;
}

/**
 * Log severity levels (MCP protocol)
 */
export type LogLevel =
  | 'debug'
  | 'info'
  | 'notice'
  | 'warning'
  | 'error'
  | 'critical'
  | 'alert'
  | 'emergency';

/**
 * Client capabilities from initialize request
 */
export interface ClientCapabilities {
  sampling?: object;
  experimental?: Record<string, object>;
  roots?: { listChanged?: boolean };
}

/**
 * Sampling message for LLM completion
 */
export interface SamplingMessage {
  role: 'user' | 'assistant';
  content: {
    type: string;
    text?: string;
    data?: string;
    mimeType?: string;
    [key: string]: unknown;
  };
}

/**
 * Options for LLM sampling
 */
export interface SamplingOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Result from LLM completion
 */
export interface CreateMessageResult {
  model: string;
  stopReason?: string;
  role: 'assistant';
  content: {
    type: 'text';
    text: string;
  };
}
```

**File:** `src/core/SessionImpl.ts`

```typescript
import { Session, LogLevel, SamplingMessage, SamplingOptions, CreateMessageResult } from './Context.js';

/**
 * Implementation of Session interface
 * Phase 1: All methods are stubbed
 */
export class SessionImpl implements Session {
  readonly client_params = undefined;  // Phase 2

  async send_log_message(level: LogLevel, data: string, logger?: string): Promise<void> {
    // TODO: Phase 2 - Implement notifications/message
    console.warn('[Context.Session] send_log_message() not yet implemented (Phase 2)');
  }

  async create_message(
    messages: SamplingMessage[],
    options?: SamplingOptions
  ): Promise<CreateMessageResult> {
    throw new Error(
      'create_message() not yet implemented (Phase 2)\n\n' +
      'What went wrong:\n' +
      '  This feature requires client sampling capability support.\n\n' +
      'To fix:\n' +
      '  Wait for Phase 2 implementation or use existing context.sample() method.'
    );
  }

  async send_progress_notification(
    progressToken: string | number,
    progress: number,
    total?: number,
    message?: string
  ): Promise<void> {
    // TODO: Phase 2 - Implement notifications/progress
    console.warn('[Context.Session] send_progress_notification() not yet implemented (Phase 2)');
  }

  async send_resource_updated(uri: string): Promise<void> {
    // TODO: Phase 2 - Implement notifications/resources/updated
    console.warn('[Context.Session] send_resource_updated() not yet implemented (Phase 2)');
  }

  async send_resource_list_changed(): Promise<void> {
    // TODO: Phase 2 - Implement notifications/resources/list_changed
    console.warn('[Context.Session] send_resource_list_changed() not yet implemented (Phase 2)');
  }

  async send_tool_list_changed(): Promise<void> {
    // TODO: Phase 2 - Implement notifications/tools/list_changed
    console.warn('[Context.Session] send_tool_list_changed() not yet implemented (Phase 2)');
  }

  async send_prompt_list_changed(): Promise<void> {
    // TODO: Phase 2 - Implement notifications/prompts/list_changed
    console.warn('[Context.Session] send_prompt_list_changed() not yet implemented (Phase 2)');
  }
}
```

### 6.2 Python Complete Definitions

**File:** `src/simply_mcp/core/context.py`

```python
"""
Context system for Simply MCP
Provides unified access to server metadata, session management, and request information
"""

from dataclasses import dataclass
from typing import Optional, Any, Dict, List, Union
from abc import ABC, abstractmethod

@dataclass(frozen=True)
class FastMCPInfo:
    """
    Immutable server metadata accessible via context.fastmcp
    """
    name: str
    version: str
    description: Optional[str] = None

    # Phase 3+
    instructions: Optional[str] = None
    website_url: Optional[str] = None
    icons: Optional[Dict[str, str]] = None
    settings: Optional[Dict[str, Any]] = None


@dataclass(frozen=True)
class RequestMeta:
    """
    Request metadata from MCP protocol
    """
    progress_token: Optional[Union[str, int]] = None


@dataclass(frozen=True)
class RequestContext:
    """
    Request-specific context information
    """
    request_id: str
    meta: Optional[RequestMeta] = None  # Phase 2+
    lifespan_context: Optional[Any] = None  # Phase 3+


class Session(ABC):
    """
    Session object for client interaction
    All methods are async for consistency
    """

    # Phase 2+
    client_params: Optional[Dict[str, Any]] = None

    @abstractmethod
    async def send_log_message(
        self,
        level: str,
        data: str,
        logger: Optional[str] = None
    ) -> None:
        """
        Send a log message to the client

        Args:
            level: Log severity ('debug', 'info', 'warning', 'error', etc.)
            data: Log message content
            logger: Optional logger name (defaults to server name)
        """
        pass

    @abstractmethod
    async def create_message(
        self,
        messages: List[Dict[str, Any]],
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Request LLM completion from client

        Args:
            messages: Chat messages for LLM
            options: Optional sampling parameters (maxTokens, temperature, etc.)

        Returns:
            LLM completion result
        """
        pass

    @abstractmethod
    async def send_progress_notification(
        self,
        progress_token: Union[str, int],
        progress: float,
        total: Optional[float] = None,
        message: Optional[str] = None
    ) -> None:
        """
        Send progress notification to client

        Args:
            progress_token: Token from request metadata
            progress: Current progress value
            total: Optional total value
            message: Optional progress message
        """
        pass

    @abstractmethod
    async def send_resource_updated(self, uri: str) -> None:
        """
        Notify client that a resource has been updated

        Args:
            uri: URI of the updated resource
        """
        pass

    @abstractmethod
    async def send_resource_list_changed(self) -> None:
        """
        Notify client that the resource list has changed
        """
        pass

    @abstractmethod
    async def send_tool_list_changed(self) -> None:
        """
        Notify client that the tool list has changed
        """
        pass

    @abstractmethod
    async def send_prompt_list_changed(self) -> None:
        """
        Notify client that the prompt list has changed
        """
        pass


@dataclass(frozen=True)
class Context:
    """
    Context object exposed to all handlers
    Provides access to server metadata, session management, and request information
    """
    fastmcp: FastMCPInfo
    session: Session
    request_context: RequestContext
```

**File:** `src/simply_mcp/core/session_impl.py`

```python
"""
Session implementation for Simply MCP
Phase 1: All methods are stubbed
"""

import warnings
from typing import Optional, Dict, Any, List, Union
from .context import Session


class SessionImpl(Session):
    """
    Implementation of Session interface
    Phase 1: All methods are stubbed with warnings
    """

    def __init__(self):
        self.client_params = None  # Phase 2+

    async def send_log_message(
        self,
        level: str,
        data: str,
        logger: Optional[str] = None
    ) -> None:
        # TODO: Phase 2 - Implement notifications/message
        warnings.warn(
            "[Context.Session] send_log_message() not yet implemented (Phase 2)",
            stacklevel=2
        )

    async def create_message(
        self,
        messages: List[Dict[str, Any]],
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        raise NotImplementedError(
            "create_message() not yet implemented (Phase 2)\n\n"
            "What went wrong:\n"
            "  This feature requires client sampling capability support.\n\n"
            "To fix:\n"
            "  Wait for Phase 2 implementation or use existing context.sample() method."
        )

    async def send_progress_notification(
        self,
        progress_token: Union[str, int],
        progress: float,
        total: Optional[float] = None,
        message: Optional[str] = None
    ) -> None:
        # TODO: Phase 2 - Implement notifications/progress
        warnings.warn(
            "[Context.Session] send_progress_notification() not yet implemented (Phase 2)",
            stacklevel=2
        )

    async def send_resource_updated(self, uri: str) -> None:
        # TODO: Phase 2 - Implement notifications/resources/updated
        warnings.warn(
            "[Context.Session] send_resource_updated() not yet implemented (Phase 2)",
            stacklevel=2
        )

    async def send_resource_list_changed(self) -> None:
        # TODO: Phase 2 - Implement notifications/resources/list_changed
        warnings.warn(
            "[Context.Session] send_resource_list_changed() not yet implemented (Phase 2)",
            stacklevel=2
        )

    async def send_tool_list_changed(self) -> None:
        # TODO: Phase 2 - Implement notifications/tools/list_changed
        warnings.warn(
            "[Context.Session] send_tool_list_changed() not yet implemented (Phase 2)",
            stacklevel=2
        )

    async def send_prompt_list_changed(self) -> None:
        # TODO: Phase 2 - Implement notifications/prompts/list_changed
        warnings.warn(
            "[Context.Session] send_prompt_list_changed() not yet implemented (Phase 2)",
            stacklevel=2
        )
```

---

## 7. Implementation Guidelines

### 7.1 Implementation Order (TypeScript)

**Day 1: Core Classes (Task 1.2)**

1. Create `src/core/Context.ts`
   - Define all interfaces: `Context`, `FastMCPInfo`, `Session`, `RequestContext`, etc.
   - Export type definitions

2. Create `src/core/SessionImpl.ts`
   - Implement `SessionImpl` class with stubbed methods
   - Add warning logs for Phase 2 methods

3. Create `src/core/RequestContext.ts`
   - Simple factory function for creating `RequestContext` instances
   - Integrate request ID generation

**Day 2: Request ID System (Task 1.3)**

4. Create `src/core/request-id.ts`
   - Export `generateRequestId()` using `randomUUID()`
   - Add unit tests for uniqueness

5. Update `src/core/Context.ts`
   - Add helper function `createContext(options)` for building Context objects

**Day 3: BuildMCPServer Integration (Task 1.4)**

6. Modify `src/api/programmatic/BuildMCPServer.ts`
   - Add `private fastmcpInfo: FastMCPInfo` field
   - Add `private sessionObject: Session` field
   - Initialize in constructor

7. Update tool handler registration
   - Create Context object per request
   - Pass to `execute()` function

8. Update prompt handler registration
   - Create Context object per request
   - Pass to template function

9. Update resource handler registration
   - Create Context object per request
   - Pass to content function

**Day 4: Handler Signatures (Task 1.5)**

10. Update `src/api/programmatic/types.ts`
    - Change `ExecuteFunction` to use `Context` instead of `HandlerContext`
    - Update `PromptDefinition.template` signature
    - Update `ResourceDefinition.content` signature

11. Add deprecation warnings (if keeping `HandlerContext`)
    - Document migration path

**Day 5: Testing (Task 1.6)**

12. Create `tests/context.test.ts`
    - Test Context creation
    - Test property access
    - Test immutability

13. Create `tests/request-id.test.ts`
    - Test uniqueness
    - Test format (UUID v4)

14. Create `tests/integration/context-injection.test.ts`
    - Test tool handlers with/without context
    - Test prompt handlers with/without context
    - Test resource handlers with/without context

### 7.2 Implementation Order (Python)

**Day 1: Core Classes**

1. Create `src/simply_mcp/core/context.py`
   - Define all dataclasses: `FastMCPInfo`, `RequestContext`, `Context`
   - Define `Session` abstract base class

2. Create `src/simply_mcp/core/session_impl.py`
   - Implement `SessionImpl` with stubbed methods
   - Add warning logs for Phase 2 methods

3. Create `src/simply_mcp/core/request_id.py`
   - Export `generate_request_id()` using `uuid.uuid4()`

**Day 2: Server Integration**

4. Modify `src/simply_mcp/core/server.py`
   - Add `_fastmcp_info: FastMCPInfo` field
   - Add `_session: Session` field
   - Initialize in `__init__`

5. Update handler execution
   - Create Context object per request
   - Pass to handler functions

**Day 3: Handler Signatures**

6. Update handler type hints
   - Update tool handler signatures
   - Update prompt handler signatures
   - Update resource handler signatures

**Day 4: Testing**

7. Create `tests/test_context.py`
   - Test Context creation
   - Test property access
   - Test immutability

8. Create `tests/test_request_id.py`
   - Test uniqueness
   - Test format

9. Create `tests/integration/test_context_injection.py`
   - Test handlers with/without context

### 7.3 Files to Create

**TypeScript (7 new files):**
```
src/core/Context.ts               (interfaces and types)
src/core/SessionImpl.ts           (Session implementation)
src/core/RequestContext.ts        (helper functions)
src/core/request-id.ts            (request ID generation)
tests/context.test.ts             (unit tests)
tests/request-id.test.ts          (unit tests)
tests/integration/context-injection.test.ts  (integration tests)
```

**Python (7 new files):**
```
src/simply_mcp/core/context.py           (dataclasses and ABC)
src/simply_mcp/core/session_impl.py      (Session implementation)
src/simply_mcp/core/request_id.py        (request ID generation)
tests/test_context.py                    (unit tests)
tests/test_request_id.py                 (unit tests)
tests/integration/test_context_injection.py  (integration tests)
src/simply_mcp/core/__init__.py          (export updates)
```

### 7.4 Files to Modify

**TypeScript (3 files):**
```
src/api/programmatic/types.ts           (update ExecuteFunction, PromptDefinition, ResourceDefinition)
src/api/programmatic/BuildMCPServer.ts  (integrate Context creation and injection)
src/core/types.ts                       (optional: deprecate HandlerContext)
```

**Python (2 files):**
```
src/simply_mcp/core/server.py     (integrate Context creation and injection)
src/simply_mcp/core/types.py      (update handler type hints)
```

### 7.5 Key Integration Points

**BuildMCPServer Constructor (TypeScript):**
```typescript
constructor(options: BuildMCPServerOptions) {
  // ... existing code ...

  // Initialize FastMCP info
  this.fastmcpInfo = {
    name: options.name,
    version: options.version,
    description: options.description,
    // Phase 3+: instructions, website_url, icons, settings
  };

  // Initialize session object
  this.sessionObject = new SessionImpl();
}
```

**Tool Handler Execution (TypeScript):**
```typescript
// In registerToolHandlers() - CallToolRequestSchema handler
const context: Context = {
  fastmcp: this.fastmcpInfo,
  session: this.sessionObject,
  request_context: {
    request_id: generateRequestId(),
    meta: undefined,  // Phase 2: extract from request.params._meta
    lifespan_context: undefined,  // Phase 3
  }
};

const result = await tool.definition.execute(validatedArgs, context);
```

**Prompt Handler Execution (TypeScript):**
```typescript
// In registerPromptHandlers() - GetPromptRequestSchema handler
const context: Context = {
  fastmcp: this.fastmcpInfo,
  session: this.sessionObject,
  request_context: {
    request_id: generateRequestId(),
    meta: undefined,
    lifespan_context: undefined,
  }
};

if (typeof prompt.template === 'function') {
  renderedText = await Promise.resolve(prompt.template(args, context));
} else {
  renderedText = this.renderTemplate(prompt.template, args);
}
```

**Resource Handler Execution (TypeScript):**
```typescript
// In registerResourceHandlers() - ReadResourceRequestSchema handler
const context: Context = {
  fastmcp: this.fastmcpInfo,
  session: this.sessionObject,
  request_context: {
    request_id: generateRequestId(),
    meta: undefined,
    lifespan_context: undefined,
  }
};

if (typeof resource.content === 'function') {
  content = await Promise.resolve(resource.content(context));
} else {
  content = resource.content;
}
```

---

## 8. Architecture Diagrams

### 8.1 Context Class Hierarchy

```
┌───────────────────────────────────────────────────────────────┐
│                          Context                              │
│  (Unified interface exposed to handlers)                     │
├───────────────────────────────────────────────────────────────┤
│  + fastmcp: FastMCPInfo                                       │
│  + session: Session                                           │
│  + request_context: RequestContext                            │
└─────────┬──────────────────────┬─────────────────────┬────────┘
          │                      │                     │
          ▼                      ▼                     ▼
┌─────────────────┐   ┌──────────────────┐  ┌──────────────────┐
│  FastMCPInfo    │   │     Session      │  │ RequestContext   │
│  (Immutable)    │   │   (Mutable)      │  │  (Immutable)     │
├─────────────────┤   ├──────────────────┤  ├──────────────────┤
│ + name          │   │ + client_params  │  │ + request_id     │
│ + version       │   │ + send_log_*()   │  │ + meta           │
│ + description   │   │ + create_*()     │  │ + lifespan_*     │
│ + instructions  │   │ + send_*_*()     │  └──────────────────┘
│ + website_url   │   └──────────────────┘
│ + icons         │            ▲
│ + settings      │            │ implements
└─────────────────┘            │
                     ┌──────────────────┐
                     │   SessionImpl    │
                     │ (Concrete Class) │
                     ├──────────────────┤
                     │ Phase 1: Stubs   │
                     │ Phase 2: Notifs  │
                     │ Phase 3: Full    │
                     └──────────────────┘
```

### 8.2 Request Lifecycle with Context

```
┌─────────────────────────────────────────────────────────────────┐
│                     MCP Client Request                          │
│          (tools/call, prompts/get, resources/read)              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              BuildMCPServer.registerHandlers()                  │
│                   (Request Handler Entry)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
                  ┌────────────────────┐
                  │ Generate Request ID │
                  │ (UUID v4)           │
                  └────────┬────────────┘
                           │
                           ▼
                  ┌────────────────────┐
                  │ Create Context     │
                  │ Object             │
                  │                    │
                  │ context = {        │
                  │   fastmcp,         │
                  │   session,         │
                  │   request_context  │
                  │ }                  │
                  └────────┬────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    ┌─────────┐    ┌─────────────┐   ┌──────────────┐
    │  Tool   │    │   Prompt    │   │   Resource   │
    │ Handler │    │   Handler   │   │   Handler    │
    └────┬────┘    └──────┬──────┘   └───────┬──────┘
         │                │                  │
         │                │                  │
         ▼                ▼                  ▼
    execute(args,   template(args,    content(context?)
      context?)       context?)
         │                │                  │
         └────────────────┼──────────────────┘
                          │
                          ▼
                  ┌────────────────┐
                  │ Handler Logic  │
                  │ Executes       │
                  │                │
                  │ Can access:    │
                  │ - request_id   │
                  │ - fastmcp.*    │
                  │ - session.*()  │
                  └────────┬───────┘
                           │
                           ▼
                  ┌────────────────┐
                  │ Return Result  │
                  └────────────────┘
```

### 8.3 Context Property Access Patterns

```
┌───────────────────────────────────────────────────────────────┐
│                     Handler Function                          │
│   async function myTool(args: any, context: Context)          │
└───────────────────────────┬───────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
│ Read Server  │  │  Call Session    │  │ Read Request │
│  Metadata    │  │  Methods         │  │   Metadata   │
├──────────────┤  ├──────────────────┤  ├──────────────┤
│ context.     │  │ await context.   │  │ context.     │
│  fastmcp.    │  │  session.        │  │  request_    │
│   name       │  │   send_log_*()   │  │   context.   │
│   version    │  │   create_*()     │  │    request_  │
│   desc*      │  │   send_*_*()     │  │     id       │
└──────────────┘  └──────────────────┘  └──────────────┘
      │                    │                    │
      ▼                    ▼                    ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
│ Immutable    │  │ Async Methods    │  │ Immutable    │
│ Read-only    │  │ May throw errors │  │ Read-only    │
│ Always       │  │ Phase-dependent  │  │ Always       │
│ Available    │  │ implementation   │  │ Available    │
└──────────────┘  └──────────────────┘  └──────────────┘
```

### 8.4 Backward Compatibility Flow

```
┌───────────────────────────────────────────────────────────────┐
│                    Handler Registration                       │
│        server.addTool({ execute: handlerFn })                 │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         ▼
                ┌────────────────────┐
                │ Signature Detection │
                │ (Runtime Check)     │
                └────────┬────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
┌───────────────┐              ┌───────────────────┐
│ Old Signature │              │  New Signature    │
│ (args) => {}  │              │ (args, ctx) => {} │
└───────┬───────┘              └────────┬──────────┘
        │                               │
        ▼                               ▼
┌───────────────┐              ┌───────────────────┐
│ Call without  │              │ Call with Context │
│ context param │              │                   │
│               │              │ context = {       │
│ execute(args) │              │   fastmcp,        │
│               │              │   session,        │
│               │              │   request_context │
│               │              │ }                 │
│               │              │                   │
│               │              │ execute(args,ctx) │
└───────┬───────┘              └────────┬──────────┘
        │                               │
        └───────────────┬───────────────┘
                        │
                        ▼
                ┌───────────────┐
                │ Handler Result │
                └───────────────┘

Note: TypeScript optional parameter `context?: Context`
      makes this automatic - no runtime detection needed!
```

---

## Success Criteria

### Phase 1 Completion Checklist

- [ ] **Context System Implemented**
  - [ ] TypeScript: `Context`, `FastMCPInfo`, `Session`, `RequestContext` interfaces defined
  - [ ] Python: `Context`, `FastMCPInfo`, `Session`, `RequestContext` classes defined
  - [ ] All Phase 1 properties populated (`name`, `version`, `description`, `request_id`)

- [ ] **Session Object with Stubbed Methods**
  - [ ] TypeScript: `SessionImpl` class with all 7 methods stubbed
  - [ ] Python: `SessionImpl` class with all 7 methods stubbed
  - [ ] All methods log warnings or throw NotImplementedError

- [ ] **Request ID System**
  - [ ] TypeScript: `generateRequestId()` using `randomUUID()`
  - [ ] Python: `generate_request_id()` using `uuid.uuid4()`
  - [ ] Request IDs are unique across all requests
  - [ ] Request IDs exposed via `context.request_context.request_id`

- [ ] **Handler Integration**
  - [ ] Tool handlers receive Context parameter
  - [ ] Prompt handlers (dynamic) receive Context parameter
  - [ ] Resource handlers (dynamic) receive Context parameter
  - [ ] Backward compatible: handlers without context still work

- [ ] **Testing**
  - [ ] Unit tests for Context creation (> 90% coverage)
  - [ ] Unit tests for request ID uniqueness
  - [ ] Integration tests for all handler types with/without context
  - [ ] Cross-repo parity verified

- [ ] **Documentation**
  - [ ] API documentation updated
  - [ ] Examples added for new context usage
  - [ ] Migration guide drafted (if needed)

---

## Next Steps (Phase 2)

Phase 2 will implement:
1. Client capabilities tracking (`ctx.session.client_params`)
2. Request metadata exposure (`ctx.request_context.meta`)
3. Functional notification methods (remove stubs)
4. Enhanced progress reporting

**Phase 2 Dependencies:**
- Phase 1 Context system must be fully implemented
- Request ID system operational
- All Phase 1 tests passing

---

**Document Status:** Ready for Implementation
**Last Review:** 2025-10-18
**Next Review:** After Phase 1 Implementation (Week 2)
**Approved By:** [Pending - Team Sync Meeting]

---

## Appendix A: FastMCP Reference Mapping

| FastMCP Feature | Simply-MCP TS | Simply-MCP PY | Phase | Status |
|----------------|---------------|---------------|-------|--------|
| `ctx.fastmcp.name` | `context.fastmcp.name` | `context.fastmcp.name` | 1 | ✅ Implementing |
| `ctx.fastmcp.version` | `context.fastmcp.version` | `context.fastmcp.version` | 1 | ✅ Implementing |
| `ctx.fastmcp.description` | `context.fastmcp.description` | `context.fastmcp.description` | 1 | ✅ Implementing |
| `ctx.request_context.request_id` | `context.request_context.request_id` | `context.request_context.request_id` | 1 | ✅ Implementing |
| `ctx.session.send_log_message()` | `context.session.send_log_message()` | `context.session.send_log_message()` | 1 | ✅ Stub |
| `ctx.session.create_message()` | `context.session.create_message()` | `context.session.create_message()` | 1 | ✅ Stub |
| `ctx.session.send_progress_notification()` | `context.session.send_progress_notification()` | `context.session.send_progress_notification()` | 1 | ✅ Stub |
| `ctx.session.send_resource_updated()` | `context.session.send_resource_updated()` | `context.session.send_resource_updated()` | 1 | ✅ Stub |
| `ctx.session.send_resource_list_changed()` | `context.session.send_resource_list_changed()` | `context.session.send_resource_list_changed()` | 1 | ✅ Stub |
| `ctx.session.send_tool_list_changed()` | `context.session.send_tool_list_changed()` | `context.session.send_tool_list_changed()` | 1 | ✅ Stub |
| `ctx.session.send_prompt_list_changed()` | `context.session.send_prompt_list_changed()` | `context.session.send_prompt_list_changed()` | 1 | ✅ Stub |

---

## Appendix B: Example Usage

**Tool Handler with Context:**
```typescript
// TypeScript
server.addTool({
  name: 'analyze',
  description: 'Analyze data with context tracking',
  parameters: z.object({
    data: z.string()
  }),
  execute: async (args, context) => {
    // Access server metadata
    console.log(`Running on ${context.fastmcp.name} v${context.fastmcp.version}`);

    // Access request ID for logging
    console.log(`Request ID: ${context.request_context.request_id}`);

    // Use session methods (Phase 2+)
    // await context.session.send_progress_notification(token, 50, 100, 'Halfway done');

    return `Analysis complete for ${args.data}`;
  }
});
```

```python
# Python
async def analyze_handler(args: dict, context: Optional[Context] = None) -> str:
    if context:
        # Access server metadata
        print(f"Running on {context.fastmcp.name} v{context.fastmcp.version}")

        # Access request ID for logging
        print(f"Request ID: {context.request_context.request_id}")

        # Use session methods (Phase 2+)
        # await context.session.send_progress_notification(token, 50, 100, 'Halfway done')

    return f"Analysis complete for {args['data']}"

server.add_tool(
    name="analyze",
    description="Analyze data with context tracking",
    parameters={"data": {"type": "string"}},
    handler=analyze_handler
)
```

---

**End of Architecture Document**
