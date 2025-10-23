# Phase 2 Implementation Guide

**Phase**: FastMCP Parity - Phase 2
**Prerequisite**: [PHASE-2-ARCHITECTURE.md](./PHASE-2-ARCHITECTURE.md) approved

---

## Table of Contents

1. [Implementation Overview](#implementation-overview)
2. [Layer 1: Client Capabilities + Logging](#layer-1-client-capabilities--logging)
3. [Layer 2: List Changed Notifications](#layer-2-list-changed-notifications)
4. [Layer 3: Progress + Sampling](#layer-3-progress--sampling)
5. [Testing Strategy](#testing-strategy)
6. [Validation Checklist](#validation-checklist)

---

## Implementation Overview

### Three-Layer Strategy

Each layer builds on the previous, allowing incremental testing:

- **Layer 1**: Foundation (client capabilities + logging)
  - Implement capability capture
  - Implement `send_log_message()`
  - Test basic notifications

- **Layer 2**: Dynamic updates (list changed notifications)
  - Implement `send_resource_updated()`
  - Implement `send_resource_list_changed()`
  - Implement `send_tool_list_changed()`
  - Implement `send_prompt_list_changed()`

- **Layer 3**: Advanced features (progress + sampling)
  - Implement `send_progress_notification()`
  - Implement `create_message()`
  - Test with progressToken and sampling capability

### File Locations

| Component | File Path | Lines to Modify |
|-----------|-----------|-----------------|
| SessionImpl | `/mnt/Shared/cs-projects/simple-mcp/src/core/SessionImpl.ts` | 1-70 (entire file) |
| ContextBuilder | `/mnt/Shared/cs-projects/simple-mcp/src/core/ContextBuilder.ts` | 41-74 (constructor + setClientParams) |
| BuildMCPServer | `/mnt/Shared/cs-projects/simple-mcp/src/api/programmatic/BuildMCPServer.ts` | After line 676 (in start() method) |

---

## Layer 1: Client Capabilities + Logging

### Step 1.1: Update SessionImpl Constructor

**File**: `/mnt/Shared/cs-projects/simple-mcp/src/core/SessionImpl.ts`

**Location**: Lines 1-21

**Replace**:
```typescript
/**
 * Implementation of Session interface
 * Phase 1: All methods are stubbed with warnings
 */
export class SessionImpl implements Session {
  readonly client_params = undefined; // Phase 2
```

**With**:
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Implementation of Session interface
 * Phase 2: Fully functional with MCP SDK integration
 */
export class SessionImpl implements Session {
  private mcpServer: Server;
  private clientCapabilities?: import('./Context.js').ClientCapabilities;

  /**
   * Create a SessionImpl instance
   * @param server MCP Server instance (from MCP SDK)
   * @param capabilities Client capabilities from initialize request
   */
  constructor(server: Server, capabilities?: import('./Context.js').ClientCapabilities) {
    this.mcpServer = server;
    this.clientCapabilities = capabilities;
  }

  /**
   * Client capabilities from initialize request
   */
  get client_params(): import('./Context.js').ClientCapabilities | undefined {
    return this.clientCapabilities;
  }
```

### Step 1.2: Implement send_log_message()

**File**: `/mnt/Shared/cs-projects/simple-mcp/src/core/SessionImpl.ts`

**Location**: Lines 23-26

**Replace**:
```typescript
  async send_log_message(level: LogLevel, data: string, logger?: string): Promise<void> {
    // TODO: Phase 2 - Implement notifications/message
    console.warn('[Context.Session] send_log_message() not yet implemented (Phase 2)');
  }
```

**With**:
```typescript
  async send_log_message(level: LogLevel, data: string, logger?: string): Promise<void> {
    try {
      // Validate server exists
      if (!this.mcpServer) {
        console.error('[SessionImpl] send_log_message: No MCP server available');
        return;
      }

      // Send logging notification using MCP SDK
      await this.mcpServer.sendLoggingMessage({
        level,
        data,
        logger: logger || undefined
      });
    } catch (error) {
      // Don't throw - logging failures shouldn't crash tools
      console.error('[SessionImpl] Failed to send log message:', error);
    }
  }
```

### Step 1.3: Update ContextBuilder to Pass Server

**File**: `/mnt/Shared/cs-projects/simple-mcp/src/core/ContextBuilder.ts`

**Location**: Lines 41-62 (constructor)

**Current**:
```typescript
  constructor(server: Server, options: ContextBuilderOptions) {
    this.mcpServer = server;

    // Extract FastMCPInfo from options
    this.serverInfo = {
      name: options.name,
      version: options.version,
      description: options.description,
      instructions: options.instructions,
      website_url: options.website_url,
      icons: options.icons,
      settings: options.settings,
    };

    // Create session object (shared across all requests)
    this.sessionImpl = new SessionImpl();
  }
```

**Update to**:
```typescript
  private clientCapabilities?: ClientCapabilities;

  constructor(server: Server, options: ContextBuilderOptions) {
    this.mcpServer = server;

    // Extract FastMCPInfo from options
    this.serverInfo = {
      name: options.name,
      version: options.version,
      description: options.description,
      instructions: options.instructions,
      website_url: options.website_url,
      icons: options.icons,
      settings: options.settings,
    };

    // Create session object with server reference
    // Capabilities will be set later via setClientParams()
    this.sessionImpl = new SessionImpl(server, undefined);
  }
```

**Add field declaration** after line 42:
```typescript
  private clientCapabilities?: ClientCapabilities;
```

### Step 1.4: Implement setClientParams()

**File**: `/mnt/Shared/cs-projects/simple-mcp/src/core/ContextBuilder.ts`

**Location**: Lines 64-74

**Replace**:
```typescript
  /**
   * Capture client initialization data
   * Called from initialize request handler
   */
  setClientParams(params: {
    clientInfo: { name: string; version: string };
    capabilities: any;
  }): void {
    // Phase 2: Store client params in SessionImpl
    // For now, this is a no-op
  }
```

**With**:
```typescript
  /**
   * Capture client initialization data
   * Called from initialize request handler
   */
  setClientParams(params: {
    clientInfo: { name: string; version: string };
    capabilities: ClientCapabilities;
  }): void {
    // Store client capabilities
    this.clientCapabilities = params.capabilities;

    // Recreate SessionImpl with capabilities
    this.sessionImpl = new SessionImpl(this.mcpServer, this.clientCapabilities);
  }
```

### Step 1.5: Add Initialize Handler in BuildMCPServer

**File**: `/mnt/Shared/cs-projects/simple-mcp/src/api/programmatic/BuildMCPServer.ts`

**Location**: After line 684 (after ContextBuilder creation, before registerToolHandlers)

**Add import at top of file** (around line 38-49):
```typescript
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  CreateMessageRequestSchema,
  CreateMessageResult,
  ProgressNotificationSchema,
  LoggingMessageNotificationSchema,
  InitializeRequestSchema,  // ADD THIS
} from '@modelcontextprotocol/sdk/types.js';
```

**Insert after line 684**:
```typescript
    // Initialize ContextBuilder with server metadata (Phase 1 - FastMCP Parity)
    this.contextBuilder = new ContextBuilder(this.server, {
      name: this.options.name,
      version: this.options.version,
      description: this.options.description,
      // Phase 3 will add: instructions, website_url, icons, settings
    });

    // Phase 2: Capture client capabilities from initialize request
    // Note: MCP SDK Server class handles initialize automatically, but we need
    // to intercept it to capture client capabilities for SessionImpl
    const originalOnInitialize = (this.server as any)._oninitialize;
    (this.server as any)._oninitialize = async (request: any) => {
      // Call original handler first
      const result = await originalOnInitialize.call(this.server, request);

      // Capture client capabilities for ContextBuilder
      if (this.contextBuilder && request.params) {
        this.contextBuilder.setClientParams({
          clientInfo: request.params.clientInfo,
          capabilities: request.params.capabilities || {}
        });
      }

      return result;
    };

    // Register handlers
    this.registerToolHandlers();
```

**Alternative (if hooking into private method fails)**:

Check if we can use `server.getClientCapabilities()` after initialization instead. If so, modify `ContextBuilder.buildContext()` to fetch capabilities on-demand:

```typescript
// In ContextBuilder.buildContext()
buildContext(requestId?: string, requestMeta?: RequestMeta): Context {
  // Lazy-load client capabilities if not already set
  if (!this.clientCapabilities && this.mcpServer) {
    const caps = this.mcpServer.getClientCapabilities();
    if (caps) {
      this.clientCapabilities = caps;
      // Recreate session with capabilities
      this.sessionImpl = new SessionImpl(this.mcpServer, caps);
    }
  }

  // ... rest of method
}
```

### Step 1.6: Test Layer 1

**Create test file**: `/mnt/Shared/cs-projects/simple-mcp/tests/phase2-layer1.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { BuildMCPServer } from '../src/api/programmatic/BuildMCPServer.js';
import { z } from 'zod';

describe('Phase 2 Layer 1: Client Capabilities + Logging', () => {
  let server: BuildMCPServer;

  beforeEach(() => {
    server = new BuildMCPServer({
      name: 'test-server',
      version: '1.0.0'
    });
  });

  it('should create SessionImpl with server reference', async () => {
    server.addTool({
      name: 'test-logging',
      description: 'Test logging functionality',
      parameters: z.object({}),
      execute: async (args, context) => {
        // Check session exists
        expect(context.session).toBeDefined();

        // send_log_message should not throw
        await context.session.send_log_message('info', 'Test message');

        return 'success';
      }
    });

    // Execute tool directly (without starting server)
    const result = await server.executeToolDirect('test-logging', {});
    expect(result.content[0].text).toBe('success');
  });

  it('should expose client_params after initialization', async () => {
    server.addTool({
      name: 'check-capabilities',
      description: 'Check client capabilities',
      parameters: z.object({}),
      execute: async (args, context) => {
        // client_params may be undefined if not initialized
        const params = context.session.client_params;

        // Should not throw
        return {
          hasParams: params !== undefined,
          hasSampling: params?.sampling !== undefined
        };
      }
    });

    const result = await server.executeToolDirect('check-capabilities', {});
    const data = JSON.parse(result.content[0].text);

    // Before initialize, client_params will be undefined
    expect(data.hasParams).toBe(false);
  });
});
```

**Run test**:
```bash
npm test -- tests/phase2-layer1.test.ts
```

---

## Layer 2: List Changed Notifications

### Step 2.1: Implement send_resource_updated()

**File**: `/mnt/Shared/cs-projects/simple-mcp/src/core/SessionImpl.ts`

**Location**: Lines 51-54

**Replace**:
```typescript
  async send_resource_updated(uri: string): Promise<void> {
    // TODO: Phase 2 - Implement notifications/resources/updated
    console.warn('[Context.Session] send_resource_updated() not yet implemented (Phase 2)');
  }
```

**With**:
```typescript
  async send_resource_updated(uri: string): Promise<void> {
    try {
      if (!this.mcpServer) {
        console.error('[SessionImpl] send_resource_updated: No MCP server available');
        return;
      }

      // Validate URI
      if (!uri || typeof uri !== 'string') {
        throw new Error('uri must be a non-empty string');
      }

      // Send resource updated notification
      await this.mcpServer.sendResourceUpdated({ uri });
    } catch (error) {
      console.error('[SessionImpl] Failed to send resource updated notification:', error);
    }
  }
```

### Step 2.2: Implement send_resource_list_changed()

**File**: `/mnt/Shared/cs-projects/simple-mcp/src/core/SessionImpl.ts`

**Location**: Lines 56-59

**Replace**:
```typescript
  async send_resource_list_changed(): Promise<void> {
    // TODO: Phase 2 - Implement notifications/resources/list_changed
    console.warn('[Context.Session] send_resource_list_changed() not yet implemented (Phase 2)');
  }
```

**With**:
```typescript
  async send_resource_list_changed(): Promise<void> {
    try {
      if (!this.mcpServer) {
        console.error('[SessionImpl] send_resource_list_changed: No MCP server available');
        return;
      }

      await this.mcpServer.sendResourceListChanged();
    } catch (error) {
      console.error('[SessionImpl] Failed to send resource list changed notification:', error);
    }
  }
```

### Step 2.3: Implement send_tool_list_changed()

**File**: `/mnt/Shared/cs-projects/simple-mcp/src/core/SessionImpl.ts`

**Location**: Lines 61-64

**Replace**:
```typescript
  async send_tool_list_changed(): Promise<void> {
    // TODO: Phase 2 - Implement notifications/tools/list_changed
    console.warn('[Context.Session] send_tool_list_changed() not yet implemented (Phase 2)');
  }
```

**With**:
```typescript
  async send_tool_list_changed(): Promise<void> {
    try {
      if (!this.mcpServer) {
        console.error('[SessionImpl] send_tool_list_changed: No MCP server available');
        return;
      }

      await this.mcpServer.sendToolListChanged();
    } catch (error) {
      console.error('[SessionImpl] Failed to send tool list changed notification:', error);
    }
  }
```

### Step 2.4: Implement send_prompt_list_changed()

**File**: `/mnt/Shared/cs-projects/simple-mcp/src/core/SessionImpl.ts`

**Location**: Lines 66-69

**Replace**:
```typescript
  async send_prompt_list_changed(): Promise<void> {
    // TODO: Phase 2 - Implement notifications/prompts/list_changed
    console.warn('[Context.Session] send_prompt_list_changed() not yet implemented (Phase 2)');
  }
```

**With**:
```typescript
  async send_prompt_list_changed(): Promise<void> {
    try {
      if (!this.mcpServer) {
        console.error('[SessionImpl] send_prompt_list_changed: No MCP server available');
        return;
      }

      await this.mcpServer.sendPromptListChanged();
    } catch (error) {
      console.error('[SessionImpl] Failed to send prompt list changed notification:', error);
    }
  }
```

### Step 2.5: Test Layer 2

**Create test file**: `/mnt/Shared/cs-projects/simple-mcp/tests/phase2-layer2.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { BuildMCPServer } from '../src/api/programmatic/BuildMCPServer.js';
import { z } from 'zod';

describe('Phase 2 Layer 2: List Changed Notifications', () => {
  let server: BuildMCPServer;

  beforeEach(() => {
    server = new BuildMCPServer({
      name: 'test-server',
      version: '1.0.0'
    });
  });

  it('should send resource_updated notification', async () => {
    server.addTool({
      name: 'update-resource',
      description: 'Test resource updated notification',
      parameters: z.object({ uri: z.string() }),
      execute: async (args, context) => {
        await context.session.send_resource_updated(args.uri);
        return 'notification sent';
      }
    });

    const result = await server.executeToolDirect('update-resource', {
      uri: 'file:///test.txt'
    });
    expect(result.content[0].text).toBe('notification sent');
  });

  it('should send resource_list_changed notification', async () => {
    server.addTool({
      name: 'change-resources',
      description: 'Test resource list changed',
      parameters: z.object({}),
      execute: async (args, context) => {
        await context.session.send_resource_list_changed();
        return 'notification sent';
      }
    });

    const result = await server.executeToolDirect('change-resources', {});
    expect(result.content[0].text).toBe('notification sent');
  });

  it('should send tool_list_changed notification', async () => {
    server.addTool({
      name: 'change-tools',
      description: 'Test tool list changed',
      parameters: z.object({}),
      execute: async (args, context) => {
        await context.session.send_tool_list_changed();
        return 'notification sent';
      }
    });

    const result = await server.executeToolDirect('change-tools', {});
    expect(result.content[0].text).toBe('notification sent');
  });

  it('should send prompt_list_changed notification', async () => {
    server.addTool({
      name: 'change-prompts',
      description: 'Test prompt list changed',
      parameters: z.object({}),
      execute: async (args, context) => {
        await context.session.send_prompt_list_changed();
        return 'notification sent';
      }
    });

    const result = await server.executeToolDirect('change-prompts', {});
    expect(result.content[0].text).toBe('notification sent');
  });
});
```

**Run test**:
```bash
npm test -- tests/phase2-layer2.test.ts
```

---

## Layer 3: Progress + Sampling

### Step 3.1: Implement send_progress_notification()

**File**: `/mnt/Shared/cs-projects/simple-mcp/src/core/SessionImpl.ts`

**Location**: Lines 41-49

**Replace**:
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

**With**:
```typescript
  async send_progress_notification(
    progressToken: string | number,
    progress: number,
    total?: number,
    message?: string
  ): Promise<void> {
    try {
      if (!this.mcpServer) {
        console.error('[SessionImpl] send_progress_notification: No MCP server available');
        return;
      }

      // Validate inputs
      if (progressToken === undefined || progressToken === null) {
        throw new Error('progressToken is required');
      }

      if (typeof progress !== 'number' || progress < 0) {
        throw new Error('progress must be a non-negative number');
      }

      if (total !== undefined && (typeof total !== 'number' || total < progress)) {
        throw new Error('total must be a number >= progress');
      }

      // Use generic notification method with ProgressNotificationSchema
      // Note: Server class may not have sendProgressNotification(),
      // so we use the generic notification() method
      await (this.mcpServer as any).notification({
        method: 'notifications/progress',
        params: {
          progressToken,
          progress,
          ...(total !== undefined && { total }),
          ...(message && { message })
        }
      });
    } catch (error) {
      console.error('[SessionImpl] Failed to send progress notification:', error);
    }
  }
```

**Alternative (if Server has sendProgressNotification)**:
```typescript
// If MCP SDK Server has this method, use it directly:
await this.mcpServer.sendProgressNotification({
  progressToken,
  progress,
  total,
  message
});
```

### Step 3.2: Implement create_message()

**File**: `/mnt/Shared/cs-projects/simple-mcp/src/core/SessionImpl.ts`

**Location**: Lines 28-39

**Replace**:
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
      '  Wait for Phase 2 implementation or use existing sampling methods.'
    );
  }
```

**With**:
```typescript
  async create_message(
    messages: SamplingMessage[],
    options?: SamplingOptions
  ): Promise<CreateMessageResult> {
    // Validate server exists
    if (!this.mcpServer) {
      throw new Error(
        'Cannot create message: MCP server not initialized\n\n' +
        'What went wrong:\n' +
        '  SessionImpl was created without MCP server reference.\n\n' +
        'This is likely a bug in Simply-MCP. Please report it.'
      );
    }

    // Check client capability
    const caps = this.mcpServer.getClientCapabilities();
    if (!caps?.sampling) {
      throw new Error(
        'Client does not support sampling capability\n\n' +
        'What went wrong:\n' +
        '  The connected MCP client has not advertised sampling support.\n\n' +
        'To fix:\n' +
        '  1. Use an MCP client that supports sampling (e.g., Claude Desktop)\n' +
        '  2. Ensure client is configured with sampling capability enabled\n' +
        '  3. Update client to the latest version\n\n' +
        'Current client capabilities:\n' +
        JSON.stringify(caps, null, 2) + '\n\n' +
        'Documentation: https://modelcontextprotocol.io/docs/concepts/sampling'
      );
    }

    try {
      // Call MCP SDK createMessage method
      const result = await this.mcpServer.createMessage({
        messages: messages as any, // Type cast needed - formats are compatible
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
        topP: options?.topP,
        stopSequences: options?.stopSequences,
        metadata: options?.metadata
      });

      return result as CreateMessageResult;
    } catch (error) {
      // Wrap error with helpful context
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Sampling request failed: ${errorMsg}\n\n` +
        'Possible causes:\n' +
        '  - Client LLM service is unavailable\n' +
        '  - Invalid message format\n' +
        '  - Network connection issue\n' +
        '  - Client rejected the request\n\n' +
        'Original error:\n' +
        errorMsg
      );
    }
  }
```

### Step 3.3: Test Layer 3

**Create test file**: `/mnt/Shared/cs-projects/simple-mcp/tests/phase2-layer3.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BuildMCPServer } from '../src/api/programmatic/BuildMCPServer.js';
import { z } from 'zod';

describe('Phase 2 Layer 3: Progress + Sampling', () => {
  let server: BuildMCPServer;

  beforeEach(() => {
    server = new BuildMCPServer({
      name: 'test-server',
      version: '1.0.0'
    });
  });

  it('should send progress notification', async () => {
    server.addTool({
      name: 'progress-test',
      description: 'Test progress notification',
      parameters: z.object({}),
      execute: async (args, context) => {
        const token = context.request_context.meta?.progressToken;

        if (token) {
          // Send progress updates
          await context.session.send_progress_notification(token, 0, 100, 'Starting');
          await context.session.send_progress_notification(token, 50, 100, 'Halfway');
          await context.session.send_progress_notification(token, 100, 100, 'Complete');
        }

        return 'progress notifications sent';
      }
    });

    // Execute with progressToken in metadata
    const result = await server.executeToolDirect('progress-test', {});
    expect(result.content[0].text).toBe('progress notifications sent');
  });

  it('should throw error for create_message without sampling capability', async () => {
    server.addTool({
      name: 'sampling-test',
      description: 'Test sampling',
      parameters: z.object({}),
      execute: async (args, context) => {
        // This should throw because client doesn't have sampling capability
        const result = await context.session.create_message([
          {
            role: 'user',
            content: { type: 'text', text: 'Hello' }
          }
        ]);

        return result.content.text;
      }
    });

    // Should throw error about missing capability
    await expect(async () => {
      await server.executeToolDirect('sampling-test', {});
    }).rejects.toThrow('Client does not support sampling capability');
  });
});
```

**Run test**:
```bash
npm test -- tests/phase2-layer3.test.ts
```

---

## Testing Strategy

### Unit Tests

**Test Files**:
- `tests/phase2-layer1.test.ts` - Client capabilities + logging
- `tests/phase2-layer2.test.ts` - List changed notifications
- `tests/phase2-layer3.test.ts` - Progress + sampling

**Coverage Requirements**:
- All SessionImpl methods: 100%
- ContextBuilder.setClientParams(): 100%
- Error handling paths: 100%

### Integration Tests

**Test with Real MCP Client**:

1. **Setup test server**:
```typescript
// test-server.ts
import { BuildMCPServer } from './src/api/programmatic/BuildMCPServer.js';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'phase2-test-server',
  version: '1.0.0'
});

// Test logging
server.addTool({
  name: 'test-logging',
  description: 'Test log notifications',
  parameters: z.object({ message: z.string() }),
  execute: async (args, context) => {
    await context.session.send_log_message('debug', 'Debug: ' + args.message);
    await context.session.send_log_message('info', 'Info: ' + args.message);
    await context.session.send_log_message('warning', 'Warning: ' + args.message);
    await context.session.send_log_message('error', 'Error: ' + args.message);
    return 'Sent 4 log messages';
  }
});

// Test progress
server.addTool({
  name: 'test-progress',
  description: 'Test progress notifications',
  parameters: z.object({ items: z.number() }),
  execute: async (args, context) => {
    const token = context.request_context.meta?.progressToken;
    if (!token) {
      return 'No progress token provided';
    }

    for (let i = 0; i <= args.items; i += 10) {
      await context.session.send_progress_notification(
        token, i, args.items, `Processing item ${i}/${args.items}`
      );
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return `Processed ${args.items} items`;
  }
});

// Test sampling
server.addTool({
  name: 'test-sampling',
  description: 'Test LLM sampling',
  parameters: z.object({ prompt: z.string() }),
  execute: async (args, context) => {
    const result = await context.session.create_message([
      {
        role: 'user',
        content: { type: 'text', text: args.prompt }
      }
    ], { maxTokens: 100 });

    return `LLM response: ${result.content.text}`;
  }
});

// Test list changes
server.addTool({
  name: 'test-list-changes',
  description: 'Test list change notifications',
  parameters: z.object({ type: z.enum(['resource', 'tool', 'prompt']) }),
  execute: async (args, context) => {
    switch (args.type) {
      case 'resource':
        await context.session.send_resource_list_changed();
        break;
      case 'tool':
        await context.session.send_tool_list_changed();
        break;
      case 'prompt':
        await context.session.send_prompt_list_changed();
        break;
    }
    return `Sent ${args.type} list changed notification`;
  }
});

await server.start({ transport: 'stdio' });
```

2. **Test with MCP Inspector**:
```bash
npm run build
npx @modelcontextprotocol/inspector node dist/test-server.js
```

3. **Manual verification**:
- Call `test-logging` - verify logs appear in inspector
- Call `test-progress` with progressToken - verify progress updates
- Call `test-sampling` - verify LLM response (if client supports)
- Call `test-list-changes` - verify notification sent

### End-to-End Tests

**Test with Claude Desktop**:

1. Configure Claude Desktop with test server
2. Execute tools through Claude chat
3. Verify:
   - Logs appear in Claude Desktop logs
   - Progress notifications show in UI
   - Sampling requests work
   - List change notifications trigger re-fetches

---

## Validation Checklist

### Layer 1: Client Capabilities + Logging

- [ ] SessionImpl accepts server + capabilities in constructor
- [ ] SessionImpl.client_params returns capabilities
- [ ] send_log_message() sends notifications without errors
- [ ] Logging with different levels works (debug, info, warning, error)
- [ ] Logging with custom logger name works
- [ ] ContextBuilder.setClientParams() stores capabilities
- [ ] ContextBuilder recreates SessionImpl with capabilities
- [ ] Initialize handler captures client capabilities
- [ ] Unit tests pass for Layer 1
- [ ] Integration test with MCP Inspector shows logs

### Layer 2: List Changed Notifications

- [ ] send_resource_updated(uri) sends notification
- [ ] send_resource_list_changed() sends notification
- [ ] send_tool_list_changed() sends notification
- [ ] send_prompt_list_changed() sends notification
- [ ] Invalid URI throws error for resource_updated
- [ ] Notifications don't crash tools on error
- [ ] Unit tests pass for Layer 2
- [ ] Integration test with MCP Inspector shows notifications

### Layer 3: Progress + Sampling

- [ ] send_progress_notification() sends with progressToken
- [ ] Progress validation (progress >= 0, total >= progress)
- [ ] Progress with optional total works
- [ ] Progress with optional message works
- [ ] create_message() checks for sampling capability
- [ ] create_message() throws error if no capability
- [ ] create_message() sends request to client
- [ ] create_message() returns result correctly
- [ ] Sampling with options (maxTokens, temperature) works
- [ ] Unit tests pass for Layer 3
- [ ] Integration test with sampling-enabled client works

### General

- [ ] No breaking changes to public API
- [ ] Backward compatibility maintained
- [ ] All existing tests still pass
- [ ] No TypeScript errors
- [ ] Documentation updated (if needed)
- [ ] Examples updated (if needed)

---

## Troubleshooting

### Issue: Initialize handler not capturing capabilities

**Symptom**: `context.session.client_params` is always undefined

**Solution**: Check if MCP SDK Server exposes initialize handler hook. If not, use lazy loading:

```typescript
// In ContextBuilder.buildContext()
buildContext(requestId?: string, requestMeta?: RequestMeta): Context {
  // Lazy-load capabilities on first request
  if (!this.clientCapabilities) {
    const caps = this.mcpServer.getClientCapabilities();
    if (caps) {
      this.setClientParams({
        clientInfo: { name: 'unknown', version: 'unknown' },
        capabilities: caps
      });
    }
  }

  // ... rest of method
}
```

### Issue: Progress notification not working

**Symptom**: No errors, but progress not showing in client

**Solution**:
1. Verify progressToken is present in request metadata
2. Check client supports progress (most do)
3. Ensure notification format matches MCP spec:

```typescript
{
  method: 'notifications/progress',
  params: {
    progressToken: 'token-123',
    progress: 50,
    total: 100,
    message: 'Halfway done'
  }
}
```

### Issue: Sampling throws "method not found"

**Symptom**: `create_message()` throws error about unknown method

**Solution**: Verify MCP SDK version supports `createMessage()`. Check:

```typescript
const hasMethod = typeof this.mcpServer.createMessage === 'function';
```

If not available, may need to use generic request method:

```typescript
await (this.mcpServer as any).request({
  method: 'sampling/createMessage',
  params: { ... }
});
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-18
**Status**: Ready for Implementation
