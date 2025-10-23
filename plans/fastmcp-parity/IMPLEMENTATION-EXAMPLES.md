# Phase 1 Implementation Examples

**Version:** 1.0
**Date:** 2025-10-18
**Supplement to:** PHASE-1-ARCHITECTURE.md

---

## Table of Contents

1. [TypeScript Implementation Examples](#typescript-implementation-examples)
2. [Python Implementation Examples](#python-implementation-examples)
3. [Usage Examples](#usage-examples)
4. [Testing Examples](#testing-examples)

---

## TypeScript Implementation Examples

### Example 1: Context.ts (Type Definitions)

**File:** `src/core/Context.ts`

```typescript
/**
 * Core Context System Types
 * Phase 1: Foundation
 */

/**
 * Main context object exposed to all handlers
 */
export interface Context {
  /**
   * Server metadata (immutable)
   */
  readonly fastmcp: FastMCPInfo;

  /**
   * Session-level operations
   */
  readonly session: Session;

  /**
   * Request-specific metadata
   */
  readonly request_context: RequestContext;
}

/**
 * Server metadata from BuildMCPServerOptions
 */
export interface FastMCPInfo {
  readonly name: string;
  readonly version: string;
  readonly description?: string;

  // Phase 3+
  readonly instructions?: string;
  readonly website_url?: string;
  readonly icons?: Icons;
  readonly settings?: Record<string, any>;
}

export interface Icons {
  light?: string;
  dark?: string;
}

/**
 * Session interface for client interaction
 */
export interface Session {
  // Phase 2+
  readonly client_params?: ClientCapabilities;

  // Notification methods
  send_log_message(level: LogLevel, data: string, logger?: string): Promise<void>;
  create_message(messages: SamplingMessage[], options?: SamplingOptions): Promise<CreateMessageResult>;
  send_progress_notification(progressToken: string | number, progress: number, total?: number, message?: string): Promise<void>;
  send_resource_updated(uri: string): Promise<void>;
  send_resource_list_changed(): Promise<void>;
  send_tool_list_changed(): Promise<void>;
  send_prompt_list_changed(): Promise<void>;
}

/**
 * Request context with unique ID
 */
export interface RequestContext {
  readonly request_id: string;
  readonly meta?: RequestMeta;
  readonly lifespan_context?: any;
}

export interface RequestMeta {
  progressToken?: string | number;
}

export type LogLevel = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';

export interface ClientCapabilities {
  sampling?: object;
  experimental?: Record<string, object>;
  roots?: { listChanged?: boolean };
}

export interface SamplingMessage {
  role: 'user' | 'assistant';
  content: {
    type: string;
    text?: string;
    [key: string]: unknown;
  };
}

export interface SamplingOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  metadata?: Record<string, unknown>;
}

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

---

### Example 2: SessionImpl.ts (Stubbed Implementation)

**File:** `src/core/SessionImpl.ts`

```typescript
import { Session, LogLevel, SamplingMessage, SamplingOptions, CreateMessageResult } from './Context.js';

/**
 * Session implementation
 * Phase 1: All methods are stubbed with warnings
 */
export class SessionImpl implements Session {
  readonly client_params = undefined;  // Phase 2+

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
      '  Wait for Phase 2 implementation.'
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

---

### Example 3: request-id.ts (Request ID Generation)

**File:** `src/core/request-id.ts`

```typescript
import { randomUUID } from 'node:crypto';

/**
 * Generate a unique request ID (UUID v4)
 * Used to track requests through their lifecycle
 */
export function generateRequestId(): string {
  return randomUUID();
}
```

---

### Example 4: BuildMCPServer Integration

**File:** `src/api/programmatic/BuildMCPServer.ts` (modifications)

```typescript
import { Context, FastMCPInfo, Session, RequestContext } from '../../core/Context.js';
import { SessionImpl } from '../../core/SessionImpl.js';
import { generateRequestId } from '../../core/request-id.js';

export class BuildMCPServer {
  // ... existing fields ...

  // New Phase 1 fields
  private fastmcpInfo: FastMCPInfo;
  private sessionObject: Session;

  constructor(options: BuildMCPServerOptions) {
    // ... existing initialization ...

    // Initialize FastMCP info
    this.fastmcpInfo = {
      name: options.name,
      version: options.version,
      description: options.description,
      // Phase 3+: instructions, website_url, icons, settings
    };

    // Initialize session object (shared across requests in same session)
    this.sessionObject = new SessionImpl();
  }

  /**
   * Create a Context object for a request
   * @private
   */
  private createContext(): Context {
    return {
      fastmcp: this.fastmcpInfo,
      session: this.sessionObject,
      request_context: {
        request_id: generateRequestId(),
        meta: undefined,  // Phase 2: extract from request
        lifespan_context: undefined,  // Phase 3
      }
    };
  }

  /**
   * Register tool handlers with the MCP server
   * @private
   */
  private registerToolHandlers(): void {
    if (!this.server || this.tools.size === 0) {
      return;
    }

    // ... existing list handler ...

    // Call tool handler (MODIFIED)
    this.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      const toolName = request.params.name;
      const tool = this.tools.get(toolName);

      if (!tool) {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      const args = request.params.arguments || {};

      try {
        const validatedArgs = tool.definition.parameters.parse(args);

        // Create context for this request
        const context = this.createContext();

        // Execute the tool with context
        const result = await tool.definition.execute(validatedArgs, context);

        // Normalize result
        return await this.normalizeResult(result);
      } catch (error) {
        // ... error handling ...
      }
    });
  }

  /**
   * Register prompt handlers with the MCP server
   * @private
   */
  private registerPromptHandlers(): void {
    if (!this.server || this.prompts.size === 0) {
      return;
    }

    // ... existing list handler ...

    // Get prompt handler (MODIFIED)
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const promptName = request.params.name;
      const prompt = this.prompts.get(promptName);

      if (!prompt) {
        throw new Error(`Unknown prompt: ${promptName}`);
      }

      const args = request.params.arguments || {};

      // Create context for this request
      const context = this.createContext();

      // Check if template is a function (dynamic prompt)
      let renderedText: string;
      if (typeof prompt.template === 'function') {
        // Pass context to dynamic template function
        renderedText = await Promise.resolve(prompt.template(args, context));
      } else {
        // Static template (no context needed)
        renderedText = this.renderTemplate(prompt.template, args);
      }

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: renderedText,
            },
          },
        ],
      };
    });
  }

  /**
   * Register resource handlers with the MCP server
   * @private
   */
  private registerResourceHandlers(): void {
    if (!this.server || this.resources.size === 0) {
      return;
    }

    // ... existing list handler ...

    // Read resource handler (MODIFIED)
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const resourceUri = request.params.uri;
      const resource = this.resources.get(resourceUri);

      if (!resource) {
        throw new Error(`Unknown resource: ${resourceUri}`);
      }

      // Create context for this request
      const context = this.createContext();

      // Check if content is a function (dynamic resource)
      let content: string | object | Buffer | Uint8Array;
      if (typeof resource.content === 'function') {
        // Pass context to dynamic content function
        content = await Promise.resolve(resource.content(context));
      } else {
        // Static content (no context needed)
        content = resource.content;
      }

      // ... existing response formatting ...
    });
  }
}
```

---

### Example 5: Updated Type Signatures

**File:** `src/api/programmatic/types.ts` (modifications)

```typescript
import { Context } from '../../core/Context.js';

/**
 * Execute function type for tools
 * Now accepts optional Context parameter
 */
export type ExecuteFunction<T = any> = (
  args: T,
  context?: Context  // NEW: Optional context parameter
) => Promise<string | HandlerResult> | string | HandlerResult;

/**
 * Prompt definition interface
 * Template function can now accept optional Context
 */
export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
  /**
   * Template string or function that generates template dynamically
   * Function signature now includes optional context parameter
   */
  template: string | ((args: Record<string, any>, context?: Context) => string | Promise<string>);
}

/**
 * Resource definition interface
 * Content function can now accept optional Context
 */
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
    | ((context?: Context) => string | object | Buffer | Uint8Array | Promise<string | object | Buffer | Uint8Array>);
}
```

---

## Python Implementation Examples

### Example 1: context.py (Type Definitions)

**File:** `src/simply_mcp/core/context.py`

```python
"""
Core Context System Types
Phase 1: Foundation
"""

from dataclasses import dataclass
from typing import Optional, Any, Dict, List, Union
from abc import ABC, abstractmethod


@dataclass(frozen=True)
class FastMCPInfo:
    """
    Server metadata (immutable)
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
    Session interface for client interaction
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
        """Send a log message to the client"""
        pass

    @abstractmethod
    async def create_message(
        self,
        messages: List[Dict[str, Any]],
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Request LLM completion from client"""
        pass

    @abstractmethod
    async def send_progress_notification(
        self,
        progress_token: Union[str, int],
        progress: float,
        total: Optional[float] = None,
        message: Optional[str] = None
    ) -> None:
        """Send progress notification to client"""
        pass

    @abstractmethod
    async def send_resource_updated(self, uri: str) -> None:
        """Notify client that a resource has been updated"""
        pass

    @abstractmethod
    async def send_resource_list_changed(self) -> None:
        """Notify client that the resource list has changed"""
        pass

    @abstractmethod
    async def send_tool_list_changed(self) -> None:
        """Notify client that the tool list has changed"""
        pass

    @abstractmethod
    async def send_prompt_list_changed(self) -> None:
        """Notify client that the prompt list has changed"""
        pass


@dataclass(frozen=True)
class Context:
    """
    Main context object exposed to all handlers
    """
    fastmcp: FastMCPInfo
    session: Session
    request_context: RequestContext
```

---

### Example 2: session_impl.py (Stubbed Implementation)

**File:** `src/simply_mcp/core/session_impl.py`

```python
"""
Session implementation
Phase 1: All methods are stubbed with warnings
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
            "  Wait for Phase 2 implementation."
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

### Example 3: request_id.py (Request ID Generation)

**File:** `src/simply_mcp/core/request_id.py`

```python
"""
Request ID generation utilities
"""

import uuid


def generate_request_id() -> str:
    """
    Generate a unique request ID (UUID v4)
    Used to track requests through their lifecycle

    Returns:
        A UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440000")
    """
    return str(uuid.uuid4())
```

---

## Usage Examples

### Example 1: Tool Handler with Context (TypeScript)

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';
import { Context } from 'simply-mcp/core/Context';

const server = new BuildMCPServer({
  name: 'analytics-server',
  version: '1.0.0',
  description: 'Analytics MCP Server'
});

// Old style (still works - backward compatible)
server.addTool({
  name: 'simple-tool',
  description: 'A simple tool without context',
  parameters: z.object({
    input: z.string()
  }),
  execute: async (args) => {
    return `Processed: ${args.input}`;
  }
});

// New style (with context)
server.addTool({
  name: 'advanced-tool',
  description: 'An advanced tool with context',
  parameters: z.object({
    data: z.string()
  }),
  execute: async (args, context) => {
    // Access server metadata
    const serverName = context.fastmcp.name;
    const serverVersion = context.fastmcp.version;

    // Access request ID for logging
    const requestId = context.request_context.request_id;

    console.log(`[${requestId}] Running on ${serverName} v${serverVersion}`);

    // Use session methods (Phase 2+)
    // await context.session.send_progress_notification(token, 50, 100, 'Halfway');

    return {
      content: [
        {
          type: 'text',
          text: `Analysis of ${args.data} completed.\nRequest ID: ${requestId}`
        }
      ]
    };
  }
});

await server.start();
```

---

### Example 2: Dynamic Prompt with Context (TypeScript)

```typescript
server.addPrompt({
  name: 'analyze-request',
  description: 'Analyze a request with context tracking',
  arguments: [
    {
      name: 'topic',
      description: 'Topic to analyze',
      required: true
    }
  ],
  template: async (args, context) => {
    const requestId = context?.request_context.request_id || 'unknown';
    const serverName = context?.fastmcp.name || 'unknown';

    return `
You are analyzing a request on ${serverName}.
Request ID: ${requestId}
Topic: ${args.topic}

Provide a detailed analysis of this topic.
    `.trim();
  }
});
```

---

### Example 3: Dynamic Resource with Context (TypeScript)

```typescript
server.addResource({
  uri: 'stats://server-status',
  name: 'Server Status',
  description: 'Current server status',
  mimeType: 'application/json',
  content: (context) => {
    const requestId = context?.request_context.request_id;

    return {
      server: context?.fastmcp.name,
      version: context?.fastmcp.version,
      request_id: requestId,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }
});
```

---

### Example 4: Tool Handler with Context (Python)

```python
from simply_mcp import SimplyMCPServer
from simply_mcp.core.context import Context
from typing import Optional

server = SimplyMCPServer(
    name='analytics-server',
    version='1.0.0',
    description='Analytics MCP Server'
)

# Old style (still works - backward compatible)
async def simple_tool(args: dict) -> str:
    return f"Processed: {args['input']}"

server.add_tool(
    name='simple-tool',
    description='A simple tool without context',
    parameters={'input': {'type': 'string'}},
    handler=simple_tool
)

# New style (with context)
async def advanced_tool(args: dict, context: Optional[Context] = None) -> dict:
    if context:
        # Access server metadata
        server_name = context.fastmcp.name
        server_version = context.fastmcp.version

        # Access request ID for logging
        request_id = context.request_context.request_id

        print(f"[{request_id}] Running on {server_name} v{server_version}")

        # Use session methods (Phase 2+)
        # await context.session.send_progress_notification(token, 50, 100, 'Halfway')

        return {
            'result': f"Analysis of {args['data']} completed",
            'request_id': request_id
        }
    else:
        return {'result': f"Analysis of {args['data']} completed"}

server.add_tool(
    name='advanced-tool',
    description='An advanced tool with context',
    parameters={'data': {'type': 'string'}},
    handler=advanced_tool
)
```

---

## Testing Examples

### Example 1: Unit Tests (TypeScript)

**File:** `tests/context.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { Context, FastMCPInfo, RequestContext } from '../src/core/Context.js';
import { SessionImpl } from '../src/core/SessionImpl.js';
import { generateRequestId } from '../src/core/request-id.js';

describe('Context System', () => {
  describe('FastMCPInfo', () => {
    it('should create immutable server info', () => {
      const info: FastMCPInfo = {
        name: 'test-server',
        version: '1.0.0',
        description: 'Test server'
      };

      expect(info.name).toBe('test-server');
      expect(info.version).toBe('1.0.0');
      expect(info.description).toBe('Test server');
    });
  });

  describe('Request ID Generation', () => {
    it('should generate unique UUIDs', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 1000; i++) {
        ids.add(generateRequestId());
      }

      expect(ids.size).toBe(1000); // All unique
    });

    it('should generate valid UUID v4 format', () => {
      const id = generateRequestId();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(id).toMatch(uuidRegex);
    });
  });

  describe('Context Creation', () => {
    it('should create valid context object', () => {
      const fastmcpInfo: FastMCPInfo = {
        name: 'test-server',
        version: '1.0.0'
      };

      const session = new SessionImpl();

      const requestContext: RequestContext = {
        request_id: generateRequestId()
      };

      const context: Context = {
        fastmcp: fastmcpInfo,
        session,
        request_context: requestContext
      };

      expect(context.fastmcp.name).toBe('test-server');
      expect(context.session).toBe(session);
      expect(context.request_context.request_id).toBeDefined();
    });
  });

  describe('Session Methods', () => {
    it('should have all required methods', async () => {
      const session = new SessionImpl();

      expect(session.send_log_message).toBeDefined();
      expect(session.create_message).toBeDefined();
      expect(session.send_progress_notification).toBeDefined();
      expect(session.send_resource_updated).toBeDefined();
      expect(session.send_resource_list_changed).toBeDefined();
      expect(session.send_tool_list_changed).toBeDefined();
      expect(session.send_prompt_list_changed).toBeDefined();
    });

    it('should throw error for create_message in Phase 1', async () => {
      const session = new SessionImpl();

      await expect(
        session.create_message([{ role: 'user', content: { type: 'text', text: 'test' } }])
      ).rejects.toThrow('not yet implemented');
    });
  });
});
```

---

### Example 2: Integration Tests (TypeScript)

**File:** `tests/integration/context-injection.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { BuildMCPServer } from '../../src/api/programmatic/BuildMCPServer.js';
import { z } from 'zod';
import { Context } from '../../src/core/Context.js';

describe('Context Injection Integration', () => {
  let server: BuildMCPServer;

  beforeEach(() => {
    server = new BuildMCPServer({
      name: 'test-server',
      version: '1.0.0',
      description: 'Test server for context injection'
    });
  });

  describe('Tool Handlers', () => {
    it('should inject context into tool handler', async () => {
      let capturedContext: Context | undefined;

      server.addTool({
        name: 'test-tool',
        description: 'Test tool',
        parameters: z.object({}),
        execute: async (args, context) => {
          capturedContext = context;
          return 'OK';
        }
      });

      await server.start({ transport: 'stdio' });

      // Execute tool directly
      await server.executeToolDirect('test-tool', {});

      expect(capturedContext).toBeDefined();
      expect(capturedContext?.fastmcp.name).toBe('test-server');
      expect(capturedContext?.fastmcp.version).toBe('1.0.0');
      expect(capturedContext?.request_context.request_id).toBeDefined();

      await server.stop();
    });

    it('should support handlers without context parameter', async () => {
      server.addTool({
        name: 'old-tool',
        description: 'Old style tool',
        parameters: z.object({}),
        execute: async (args) => {
          // No context parameter
          return 'OK';
        }
      });

      await server.start({ transport: 'stdio' });

      const result = await server.executeToolDirect('old-tool', {});

      expect(result).toBeDefined();

      await server.stop();
    });
  });

  describe('Prompt Handlers', () => {
    it('should inject context into dynamic prompt', async () => {
      let capturedContext: Context | undefined;

      server.addPrompt({
        name: 'test-prompt',
        description: 'Test prompt',
        template: (args, context) => {
          capturedContext = context;
          return 'Test template';
        }
      });

      await server.start({ transport: 'stdio' });

      await server.getPromptDirect('test-prompt', {});

      expect(capturedContext).toBeDefined();
      expect(capturedContext?.request_context.request_id).toBeDefined();

      await server.stop();
    });
  });

  describe('Resource Handlers', () => {
    it('should inject context into dynamic resource', async () => {
      let capturedContext: Context | undefined;

      server.addResource({
        uri: 'test://resource',
        name: 'Test Resource',
        description: 'Test resource',
        mimeType: 'text/plain',
        content: (context) => {
          capturedContext = context;
          return 'Test content';
        }
      });

      await server.start({ transport: 'stdio' });

      await server.readResourceDirect('test://resource');

      expect(capturedContext).toBeDefined();
      expect(capturedContext?.request_context.request_id).toBeDefined();

      await server.stop();
    });
  });

  describe('Request ID Uniqueness', () => {
    it('should generate unique request IDs for concurrent requests', async () => {
      const requestIds = new Set<string>();

      server.addTool({
        name: 'id-tool',
        description: 'ID tracking tool',
        parameters: z.object({}),
        execute: async (args, context) => {
          if (context) {
            requestIds.add(context.request_context.request_id);
          }
          return 'OK';
        }
      });

      await server.start({ transport: 'stdio' });

      // Execute multiple requests concurrently
      await Promise.all([
        server.executeToolDirect('id-tool', {}),
        server.executeToolDirect('id-tool', {}),
        server.executeToolDirect('id-tool', {}),
        server.executeToolDirect('id-tool', {}),
        server.executeToolDirect('id-tool', {})
      ]);

      expect(requestIds.size).toBe(5); // All unique

      await server.stop();
    });
  });
});
```

---

### Example 3: Unit Tests (Python)

**File:** `tests/test_context.py`

```python
import pytest
import uuid
from simply_mcp.core.context import Context, FastMCPInfo, RequestContext
from simply_mcp.core.session_impl import SessionImpl
from simply_mcp.core.request_id import generate_request_id


class TestContextSystem:
    """Test suite for Context system"""

    def test_fastmcp_info_creation(self):
        """Test FastMCPInfo creation"""
        info = FastMCPInfo(
            name='test-server',
            version='1.0.0',
            description='Test server'
        )

        assert info.name == 'test-server'
        assert info.version == '1.0.0'
        assert info.description == 'Test server'

    def test_request_id_uniqueness(self):
        """Test request ID uniqueness"""
        ids = set()

        for _ in range(1000):
            ids.add(generate_request_id())

        assert len(ids) == 1000  # All unique

    def test_request_id_format(self):
        """Test request ID format (UUID v4)"""
        request_id = generate_request_id()

        # Parse as UUID to verify format
        parsed = uuid.UUID(request_id)
        assert parsed.version == 4

    def test_context_creation(self):
        """Test Context object creation"""
        fastmcp_info = FastMCPInfo(
            name='test-server',
            version='1.0.0'
        )

        session = SessionImpl()

        request_context = RequestContext(
            request_id=generate_request_id()
        )

        context = Context(
            fastmcp=fastmcp_info,
            session=session,
            request_context=request_context
        )

        assert context.fastmcp.name == 'test-server'
        assert context.session == session
        assert context.request_context.request_id is not None

    @pytest.mark.asyncio
    async def test_session_methods_exist(self):
        """Test that all session methods exist"""
        session = SessionImpl()

        assert hasattr(session, 'send_log_message')
        assert hasattr(session, 'create_message')
        assert hasattr(session, 'send_progress_notification')
        assert hasattr(session, 'send_resource_updated')
        assert hasattr(session, 'send_resource_list_changed')
        assert hasattr(session, 'send_tool_list_changed')
        assert hasattr(session, 'send_prompt_list_changed')

    @pytest.mark.asyncio
    async def test_create_message_raises_not_implemented(self):
        """Test that create_message raises NotImplementedError in Phase 1"""
        session = SessionImpl()

        with pytest.raises(NotImplementedError, match='not yet implemented'):
            await session.create_message([{'role': 'user', 'content': {'type': 'text', 'text': 'test'}}])
```

---

**End of Implementation Examples Document**
