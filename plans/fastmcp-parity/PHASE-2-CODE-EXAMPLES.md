# Phase 2 Code Examples

**Phase**: FastMCP Parity - Phase 2
**Purpose**: Production-ready code snippets and usage examples

---

## Table of Contents

1. [Complete SessionImpl Implementation](#complete-sessionimpl-implementation)
2. [Complete ContextBuilder Updates](#complete-contextbuilder-updates)
3. [BuildMCPServer Initialize Handler](#buildmcpserver-initialize-handler)
4. [Usage Examples](#usage-examples)
5. [Test Examples](#test-examples)

---

## Complete SessionImpl Implementation

**File**: `/mnt/Shared/cs-projects/simple-mcp/src/core/SessionImpl.ts`

```typescript
/**
 * SessionImpl - Implementation of Session interface
 *
 * Phase 2: Full MCP notification support using MCP SDK
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  Session,
  LogLevel,
  SamplingMessage,
  SamplingOptions,
  CreateMessageResult,
  ClientCapabilities,
} from './Context.js';

/**
 * Implementation of Session interface
 * Phase 2: Fully functional with MCP SDK integration
 */
export class SessionImpl implements Session {
  private mcpServer: Server;
  private clientCapabilities?: ClientCapabilities;

  /**
   * Create a SessionImpl instance
   *
   * @param server MCP Server instance (from @modelcontextprotocol/sdk)
   * @param capabilities Client capabilities from initialize request
   */
  constructor(server: Server, capabilities?: ClientCapabilities) {
    this.mcpServer = server;
    this.clientCapabilities = capabilities;
  }

  /**
   * Client capabilities from initialize request
   */
  get client_params(): ClientCapabilities | undefined {
    return this.clientCapabilities;
  }

  /**
   * Send a log message to the client
   *
   * Uses MCP SDK's sendLoggingMessage() method.
   * Failures are logged but don't throw (graceful degradation).
   *
   * @param level Log severity level
   * @param data Log message content
   * @param logger Optional logger name (defaults to server name)
   */
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

  /**
   * Request LLM completion from client
   *
   * Uses MCP SDK's createMessage() method.
   * Requires client to have sampling capability.
   *
   * @param messages Chat messages for LLM
   * @param options Optional sampling parameters
   * @returns LLM completion result
   * @throws Error if client doesn't support sampling or request fails
   */
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
        'This is likely a bug in Simply-MCP. Please report it at:\n' +
        'https://github.com/Clockwork-Innovations/simply-mcp-ts/issues'
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

  /**
   * Send progress notification to client
   *
   * Uses generic notification() method since Server may not have
   * sendProgressNotification() method.
   *
   * @param progressToken Token from request metadata
   * @param progress Current progress value
   * @param total Optional total value
   * @param message Optional progress message
   */
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
      // Server class may not have sendProgressNotification() method
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

  /**
   * Notify client that a resource has been updated
   *
   * @param uri URI of the updated resource
   */
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

  /**
   * Notify client that the resource list has changed
   */
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

  /**
   * Notify client that the tool list has changed
   */
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

  /**
   * Notify client that the prompt list has changed
   */
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
}
```

---

## Complete ContextBuilder Updates

**File**: `/mnt/Shared/cs-projects/simple-mcp/src/core/ContextBuilder.ts`

**Changes to make**:

1. Add import for ClientCapabilities:
```typescript
import {
  Context,
  FastMCPInfo,
  Session,
  RequestContext,
  RequestMeta,
  ClientCapabilities,  // ADD THIS
} from './Context.js';
```

2. Add private field (after line 42):
```typescript
export class ContextBuilder {
  private serverInfo: FastMCPInfo;
  private sessionImpl: SessionImpl;
  private mcpServer: Server;
  private clientCapabilities?: ClientCapabilities;  // ADD THIS
```

3. Update constructor (lines 46-62):
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

    // Create session object with server reference
    // Capabilities will be set later via setClientParams()
    this.sessionImpl = new SessionImpl(server, undefined);  // CHANGED: pass server
  }
```

4. Update setClientParams (lines 64-74):
```typescript
  /**
   * Capture client initialization data
   * Called from initialize request handler
   */
  setClientParams(params: {
    clientInfo: { name: string; version: string };
    capabilities: ClientCapabilities;  // CHANGED: typed
  }): void {
    // Store client capabilities
    this.clientCapabilities = params.capabilities;

    // Recreate SessionImpl with capabilities
    this.sessionImpl = new SessionImpl(this.mcpServer, this.clientCapabilities);
  }
```

---

## BuildMCPServer Initialize Handler

**File**: `/mnt/Shared/cs-projects/simple-mcp/src/api/programmatic/BuildMCPServer.ts`

### Option 1: Hook into MCP SDK's initialize handler

**Location**: After line 684 (in `start()` method, after creating ContextBuilder)

```typescript
    // Initialize ContextBuilder with server metadata (Phase 1 - FastMCP Parity)
    this.contextBuilder = new ContextBuilder(this.server, {
      name: this.options.name,
      version: this.options.version,
      description: this.options.description,
      // Phase 3 will add: instructions, website_url, icons, settings
    });

    // Phase 2: Capture client capabilities from initialize request
    // Hook into MCP SDK's private _oninitialize handler
    const originalOnInitialize = (this.server as any)._oninitialize;
    if (originalOnInitialize) {
      (this.server as any)._oninitialize = async (request: any) => {
        // Call original handler first
        const result = await originalOnInitialize.call(this.server, request);

        // Capture client capabilities for ContextBuilder
        if (this.contextBuilder && request.params) {
          this.contextBuilder.setClientParams({
            clientInfo: request.params.clientInfo || { name: 'unknown', version: 'unknown' },
            capabilities: request.params.capabilities || {}
          });
        }

        return result;
      };
    }

    // Register handlers
    this.registerToolHandlers();
```

### Option 2: Lazy-load capabilities (if Option 1 doesn't work)

**Location**: In `ContextBuilder.buildContext()` method

```typescript
  /**
   * Build a Context instance for a request
   *
   * Called at the start of each tool/prompt/resource handler.
   * Generates unique request ID using UUID v4.
   *
   * @param requestId Optional request ID (for testing)
   * @param requestMeta Optional request metadata
   * @returns New Context instance
   */
  buildContext(requestId?: string, requestMeta?: RequestMeta): Context {
    const request_id = requestId ?? generateRequestId();

    // Phase 2: Lazy-load client capabilities on first request
    if (!this.clientCapabilities && this.mcpServer) {
      const caps = this.mcpServer.getClientCapabilities();
      if (caps) {
        this.clientCapabilities = caps as ClientCapabilities;
        // Recreate SessionImpl with capabilities
        this.sessionImpl = new SessionImpl(this.mcpServer, this.clientCapabilities);
      }
    }

    const request_context: RequestContext = {
      request_id,
      meta: requestMeta,
      lifespan_context: undefined, // Phase 3
    };

    return {
      fastmcp: this.serverInfo,
      session: this.sessionImpl,
      request_context,
    };
  }
```

---

## Usage Examples

### Example 1: Basic Logging

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'logging-example',
  version: '1.0.0'
});

server.addTool({
  name: 'process-data',
  description: 'Process data with logging',
  parameters: z.object({
    data: z.array(z.string())
  }),
  execute: async (args, context) => {
    // Log start
    await context.session.send_log_message('info', 'Starting data processing');

    const results = [];
    for (const item of args.data) {
      try {
        // Log each item
        await context.session.send_log_message('debug', `Processing: ${item}`);

        // Process item
        const result = item.toUpperCase();
        results.push(result);

      } catch (error) {
        // Log errors
        await context.session.send_log_message(
          'error',
          `Failed to process ${item}: ${error}`
        );
      }
    }

    // Log completion
    await context.session.send_log_message(
      'info',
      `Completed processing ${results.length} items`
    );

    return results;
  }
});

await server.start();
```

### Example 2: Progress Tracking

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'progress-example',
  version: '1.0.0'
});

server.addTool({
  name: 'process-large-file',
  description: 'Process a large file with progress updates',
  parameters: z.object({
    filepath: z.string(),
    chunkSize: z.number().default(1000)
  }),
  execute: async (args, context) => {
    const progressToken = context.request_context.meta?.progressToken;

    // Read file (simulated)
    const totalChunks = 100;

    for (let i = 0; i < totalChunks; i++) {
      // Send progress update (if client provided progressToken)
      if (progressToken) {
        await context.session.send_progress_notification(
          progressToken,
          i,
          totalChunks,
          `Processing chunk ${i}/${totalChunks}`
        );
      }

      // Process chunk
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Final progress
    if (progressToken) {
      await context.session.send_progress_notification(
        progressToken,
        totalChunks,
        totalChunks,
        'Complete'
      );
    }

    return `Processed ${totalChunks} chunks from ${args.filepath}`;
  }
});

await server.start();
```

### Example 3: LLM Sampling

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'sampling-example',
  version: '1.0.0'
});

server.addTool({
  name: 'summarize-text',
  description: 'Summarize text using client LLM',
  parameters: z.object({
    text: z.string(),
    maxLength: z.number().default(100)
  }),
  execute: async (args, context) => {
    // Check if client supports sampling
    if (!context.session.client_params?.sampling) {
      return 'Error: Client does not support LLM sampling';
    }

    try {
      // Request LLM completion from client
      const result = await context.session.create_message([
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Summarize the following text in ${args.maxLength} words or less:\n\n${args.text}`
          }
        }
      ], {
        maxTokens: args.maxLength * 2, // Rough estimate
        temperature: 0.7
      });

      return {
        summary: result.content.text,
        model: result.model,
        stopReason: result.stopReason
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return `Sampling failed: ${errorMsg}`;
    }
  }
});

await server.start();
```

### Example 4: Dynamic Resource Updates

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';
import { readFile, watch } from 'fs/promises';

const server = new BuildMCPServer({
  name: 'dynamic-resources',
  version: '1.0.0'
});

// Add a dynamic resource
let fileContent = 'Initial content';

server.addResource({
  uri: 'file:///data/config.json',
  name: 'Configuration',
  description: 'Application configuration',
  mimeType: 'application/json',
  content: () => fileContent
});

// Tool to update the resource
server.addTool({
  name: 'update-config',
  description: 'Update configuration file',
  parameters: z.object({
    newContent: z.string()
  }),
  execute: async (args, context) => {
    // Update the content
    fileContent = args.newContent;

    // Notify client that specific resource changed
    await context.session.send_resource_updated('file:///data/config.json');

    return 'Configuration updated and client notified';
  }
});

// Tool to add/remove resources dynamically
server.addTool({
  name: 'refresh-resources',
  description: 'Trigger resource list refresh',
  parameters: z.object({}),
  execute: async (args, context) => {
    // This would be called after dynamically adding/removing resources
    // (Note: Simply-MCP doesn't support runtime resource changes yet,
    //  but this shows how to notify clients)

    await context.session.send_resource_list_changed();

    return 'Client notified to refresh resource list';
  }
});

await server.start();
```

### Example 5: Multi-Tool Orchestration with Logging

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'orchestration-example',
  version: '1.0.0'
});

server.addTool({
  name: 'data-pipeline',
  description: 'Run a multi-step data pipeline',
  parameters: z.object({
    input: z.string()
  }),
  execute: async (args, context) => {
    const progressToken = context.request_context.meta?.progressToken;

    // Step 1: Validate
    await context.session.send_log_message('info', 'Step 1: Validating input');
    if (progressToken) {
      await context.session.send_progress_notification(progressToken, 1, 4, 'Validating');
    }

    if (!args.input) {
      await context.session.send_log_message('error', 'Validation failed: empty input');
      throw new Error('Input cannot be empty');
    }

    // Step 2: Transform
    await context.session.send_log_message('info', 'Step 2: Transforming data');
    if (progressToken) {
      await context.session.send_progress_notification(progressToken, 2, 4, 'Transforming');
    }

    const transformed = args.input.toUpperCase();

    // Step 3: Analyze (using LLM)
    await context.session.send_log_message('info', 'Step 3: Analyzing with LLM');
    if (progressToken) {
      await context.session.send_progress_notification(progressToken, 3, 4, 'Analyzing');
    }

    let analysis = 'LLM not available';
    if (context.session.client_params?.sampling) {
      try {
        const result = await context.session.create_message([
          {
            role: 'user',
            content: { type: 'text', text: `Analyze this data: ${transformed}` }
          }
        ], { maxTokens: 100 });

        analysis = result.content.text;
      } catch (error) {
        await context.session.send_log_message(
          'warning',
          `LLM analysis failed: ${error}`
        );
      }
    }

    // Step 4: Complete
    await context.session.send_log_message('info', 'Pipeline complete');
    if (progressToken) {
      await context.session.send_progress_notification(progressToken, 4, 4, 'Complete');
    }

    return {
      transformed,
      analysis,
      steps: 4
    };
  }
});

await server.start();
```

---

## Test Examples

### Unit Test: SessionImpl Methods

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionImpl } from '../src/core/SessionImpl.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

describe('SessionImpl', () => {
  let mockServer: any;
  let session: SessionImpl;

  beforeEach(() => {
    // Create mock server
    mockServer = {
      sendLoggingMessage: vi.fn().mockResolvedValue(undefined),
      sendResourceUpdated: vi.fn().mockResolvedValue(undefined),
      sendResourceListChanged: vi.fn().mockResolvedValue(undefined),
      sendToolListChanged: vi.fn().mockResolvedValue(undefined),
      sendPromptListChanged: vi.fn().mockResolvedValue(undefined),
      notification: vi.fn().mockResolvedValue(undefined),
      createMessage: vi.fn().mockResolvedValue({
        model: 'test-model',
        role: 'assistant',
        content: { type: 'text', text: 'Test response' },
        stopReason: 'endTurn'
      }),
      getClientCapabilities: vi.fn().mockReturnValue({
        sampling: {}
      })
    };

    session = new SessionImpl(mockServer as any, { sampling: {} });
  });

  describe('send_log_message', () => {
    it('should send logging notification', async () => {
      await session.send_log_message('info', 'Test message');

      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        data: 'Test message',
        logger: undefined
      });
    });

    it('should send logging notification with custom logger', async () => {
      await session.send_log_message('error', 'Error message', 'my-logger');

      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'error',
        data: 'Error message',
        logger: 'my-logger'
      });
    });

    it('should not throw on error', async () => {
      mockServer.sendLoggingMessage.mockRejectedValue(new Error('Network error'));

      await expect(async () => {
        await session.send_log_message('info', 'Test');
      }).not.toThrow();
    });
  });

  describe('send_progress_notification', () => {
    it('should send progress notification', async () => {
      await session.send_progress_notification('token-123', 50, 100, 'Halfway');

      expect(mockServer.notification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: 'token-123',
          progress: 50,
          total: 100,
          message: 'Halfway'
        }
      });
    });

    it('should validate progress >= 0', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await session.send_progress_notification('token', -1, 100);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should validate total >= progress', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await session.send_progress_notification('token', 100, 50);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('create_message', () => {
    it('should create message with sampling capability', async () => {
      const result = await session.create_message([
        { role: 'user', content: { type: 'text', text: 'Hello' } }
      ], { maxTokens: 100 });

      expect(result.content.text).toBe('Test response');
      expect(mockServer.createMessage).toHaveBeenCalled();
    });

    it('should throw error without sampling capability', async () => {
      mockServer.getClientCapabilities.mockReturnValue({});

      await expect(async () => {
        await session.create_message([
          { role: 'user', content: { type: 'text', text: 'Hello' } }
        ]);
      }).rejects.toThrow('Client does not support sampling capability');
    });
  });

  describe('send_resource_updated', () => {
    it('should send resource updated notification', async () => {
      await session.send_resource_updated('file:///test.txt');

      expect(mockServer.sendResourceUpdated).toHaveBeenCalledWith({
        uri: 'file:///test.txt'
      });
    });
  });

  describe('send_resource_list_changed', () => {
    it('should send resource list changed notification', async () => {
      await session.send_resource_list_changed();

      expect(mockServer.sendResourceListChanged).toHaveBeenCalled();
    });
  });

  describe('client_params', () => {
    it('should return client capabilities', () => {
      expect(session.client_params).toEqual({ sampling: {} });
    });

    it('should return undefined if no capabilities', () => {
      const sessionWithoutCaps = new SessionImpl(mockServer as any);
      expect(sessionWithoutCaps.client_params).toBeUndefined();
    });
  });
});
```

### Integration Test: Full Server

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { BuildMCPServer } from '../src/api/programmatic/BuildMCPServer.js';
import { z } from 'zod';

describe('Phase 2 Integration', () => {
  let server: BuildMCPServer;

  beforeEach(() => {
    server = new BuildMCPServer({
      name: 'integration-test',
      version: '1.0.0'
    });
  });

  it('should execute tool with logging', async () => {
    server.addTool({
      name: 'test-tool',
      description: 'Test tool with logging',
      parameters: z.object({ message: z.string() }),
      execute: async (args, context) => {
        await context.session.send_log_message('info', `Processing: ${args.message}`);
        await context.session.send_log_message('debug', 'Debug info');
        return `Processed: ${args.message}`;
      }
    });

    const result = await server.executeToolDirect('test-tool', {
      message: 'Hello'
    });

    expect(result.content[0].text).toBe('Processed: Hello');
  });

  it('should execute tool with progress', async () => {
    server.addTool({
      name: 'progress-tool',
      description: 'Tool with progress',
      parameters: z.object({}),
      execute: async (args, context) => {
        const token = context.request_context.meta?.progressToken;

        if (token) {
          await context.session.send_progress_notification(token, 0, 10);
          await context.session.send_progress_notification(token, 5, 10);
          await context.session.send_progress_notification(token, 10, 10);
        }

        return 'Done';
      }
    });

    const result = await server.executeToolDirect('progress-tool', {});
    expect(result.content[0].text).toBe('Done');
  });

  it('should handle list change notifications', async () => {
    server.addTool({
      name: 'notify-changes',
      description: 'Send all list change notifications',
      parameters: z.object({}),
      execute: async (args, context) => {
        await context.session.send_resource_list_changed();
        await context.session.send_tool_list_changed();
        await context.session.send_prompt_list_changed();
        await context.session.send_resource_updated('file:///test.txt');
        return 'Notifications sent';
      }
    });

    const result = await server.executeToolDirect('notify-changes', {});
    expect(result.content[0].text).toBe('Notifications sent');
  });
});
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-18
**Status**: Ready for Use
