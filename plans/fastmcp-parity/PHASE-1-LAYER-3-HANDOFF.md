# Phase 1 Layer 3 Implementation Handoff

**Task**: Integrate Context injection into BuildMCPServer
**Status**: Ready for Implementation
**Completed**: Type integration (HandlerContext.mcp added)
**Remaining**: BuildMCPServer integration

---

## ✅ Completed Work

### 1. Type Integration
- ✅ Added `import type { Context } from './Context.js'` to `src/core/types.ts`
- ✅ Added `mcp?: Context` property to `HandlerContext` interface
- ✅ Maintains backward compatibility (optional property)

**Location**: `/mnt/Shared/cs-projects/simple-mcp/src/core/types.ts` line 105

```typescript
export interface HandlerContext {
  // ... existing properties ...

  /**
   * FastMCP-style context (Phase 1 - FastMCP Parity)
   * Provides unified access to server metadata, session operations, and request context
   * @since 0.2.0
   */
  mcp?: Context;
}
```

---

## 🚧 Remaining Work

### Task 1: Update BuildMCPServer Constructor

**File**: `src/api/programmatic/BuildMCPServer.ts`

**Changes Needed**:
1. Import ContextBuilder
2. Add private contextBuilder field
3. Initialize ContextBuilder in constructor after MCP Server creation

**Implementation**:
```typescript
// At top of file, add import
import { ContextBuilder } from '../../core/ContextBuilder.js';

// In class, add private field (around line 98)
private contextBuilder?: ContextBuilder;

// In constructor, after creating this.handlerManager (around line 135)
// Note: Cannot create ContextBuilder yet because MCP Server not created
// Will create it in start() method when Server is instantiated
```

### Task 2: Initialize ContextBuilder in start() Method

**File**: `src/api/programmatic/BuildMCPServer.ts`

**Find**: The `start()` method where MCP Server is created

**Changes Needed**:
After `this.server = new Server(...)`, add:

```typescript
// Create ContextBuilder with server metadata
this.contextBuilder = new ContextBuilder(this.server, {
  name: this.options.name,
  version: this.options.version,
  description: this.options.description,
  // Phase 3 will add: instructions, website_url, icons, settings
});
```

### Task 3: Inject Context into Tool Handlers

**File**: `src/api/programmatic/BuildMCPServer.ts`

**Find**: Tool handler execution code (search for `CallToolRequestSchema`)

**Current Pattern** (approximate):
```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = this.tools.get(request.params.name);

  // Build HandlerContext
  const context: HandlerContext = {
    sessionId: sessionId,
    logger: createDefaultLogger(...),
    // ... other properties
  };

  // Execute tool
  const result = await tool.execute(request.params.arguments, context);
  //...
});
```

**Add** (after building context, before execute):
```typescript
// Add MCP context if ContextBuilder available
if (this.contextBuilder) {
  // Extract request metadata from MCP request
  const requestMeta = request.params._meta ? {
    progressToken: request.params._meta.progressToken
  } : undefined;

  context.mcp = this.contextBuilder.buildContext(undefined, requestMeta);
}
```

### Task 4: Inject Context into Prompt Handlers

**File**: `src/api/programmatic/BuildMCPServer.ts`

**Find**: Prompt handler execution code (search for `GetPromptRequestSchema`)

**Apply same pattern as Task 3**:
1. Build HandlerContext as usual
2. Add `context.mcp = this.contextBuilder.buildContext(...)` before execution
3. Extract `_meta` from request if available

### Task 5: Inject Context into Resource Handlers

**File**: `src/api/programmatic/BuildMCPServer.ts`

**Find**: Resource handler execution code (search for `ReadResourceRequestSchema`)

**Apply same pattern as Task 3 & 4**:
1. Build HandlerContext as usual
2. Add `context.mcp = this.contextBuilder.buildContext(...)` before execution
3. Extract `_meta` from request if available

---

## 📝 Implementation Notes

### Backward Compatibility

**Critical**: `context.mcp` is optional, so:
- ✅ Old handlers without `context` parameter still work
- ✅ Old handlers using `context.logger` etc. still work
- ✅ New handlers can use `context.mcp.fastmcp.name` etc.

### Request Metadata

MCP protocol requests may include `_meta` field with:
- `progressToken`: For progress notifications
- Other metadata (future)

Extract this and pass to `buildContext()`:
```typescript
const requestMeta = request.params._meta ? {
  progressToken: request.params._meta.progressToken
} : undefined;
```

### Error Handling

ContextBuilder creation should not fail, but if it does:
- Log warning
- Continue without MCP context (graceful degradation)
- `context.mcp` will be undefined (which is fine - it's optional)

---

## 🧪 Testing Requirements

### Unit Tests Needed

Create: `tests/integration/context-injection.test.ts`

**Test Cases**:
1. ✅ Tool handler receives context with mcp property
2. ✅ Tool handler can access `context.mcp.fastmcp.name`
3. ✅ Tool handler can access `context.mcp.request_context.request_id`
4. ✅ Tool handler WITHOUT context parameter still works (backward compat)
5. ✅ Prompt handler receives context with mcp property
6. ✅ Resource handler receives context with mcp property
7. ✅ Each request gets unique request_id
8. ✅ Request metadata (progressToken) passed through
9. ✅ Old handler using `context.logger` still works

### Integration Test Example

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { BuildMCPServer } from '../src/api/programmatic/BuildMCPServer.js';
import { z } from 'zod';

describe('Context Injection', () => {
  let server: BuildMCPServer;

  beforeEach(() => {
    server = new BuildMCPServer({
      name: 'test-context-server',
      version: '1.0.0',
      description: 'Test server for context injection'
    });
  });

  it('injects MCP context into tool handlers', async () => {
    let receivedContext: any;

    server.addTool({
      name: 'test-tool',
      description: 'Test tool',
      parameters: z.object({ input: z.string() }),
      execute: async (args, context) => {
        receivedContext = context;
        return 'success';
      }
    });

    await server.start();

    // Simulate tool call (requires MCP Server integration)
    // ... call the tool via MCP protocol ...

    // Verify context
    expect(receivedContext).toBeDefined();
    expect(receivedContext.mcp).toBeDefined();
    expect(receivedContext.mcp.fastmcp.name).toBe('test-context-server');
    expect(receivedContext.mcp.fastmcp.version).toBe('1.0.0');
    expect(receivedContext.mcp.request_context.request_id).toBeDefined();
    expect(receivedContext.mcp.request_context.request_id).toMatch(/^[0-9a-f-]+$/);
  });

  it('backward compatibility: handler without context still works', async () => {
    server.addTool({
      name: 'old-tool',
      description: 'Old style tool',
      parameters: z.object({ input: z.string() }),
      execute: async (args) => {  // No context parameter
        return `Processed: ${args.input}`;
      }
    });

    await server.start();

    // ... call the tool ...
    // Should work without errors
  });

  it('generates unique request IDs per request', async () => {
    const requestIds: string[] = [];

    server.addTool({
      name: 'capture-id',
      description: 'Captures request ID',
      parameters: z.object({}),
      execute: async (args, context) => {
        if (context?.mcp) {
          requestIds.push(context.mcp.request_context.request_id);
        }
        return 'ok';
      }
    });

    await server.start();

    // ... call the tool 3 times ...

    expect(requestIds).toHaveLength(3);
    expect(new Set(requestIds).size).toBe(3); // All unique
  });
});
```

---

## 🎯 Success Criteria

### Implementation Complete When:

1. ✅ ContextBuilder initialized in BuildMCPServer.start()
2. ✅ Context injected into tool handlers via `context.mcp`
3. ✅ Context injected into prompt handlers via `context.mcp`
4. ✅ Context injected into resource handlers via `context.mcp`
5. ✅ Backward compatibility maintained (old handlers still work)
6. ✅ Integration tests passing (6+ test cases)
7. ✅ Build compiles without errors
8. ✅ Existing tests still passing

### Validation Requirements:

- **Test Validator**: Verify tests are comprehensive and actually test context injection
- **Functional Validator**: Verify context is correctly built and injected
- **Gate Check**: All criteria met before proceeding to Phase 2

---

## 📚 Reference Files

**Existing Implementation**:
- `src/core/Context.ts` - Context interface definitions
- `src/core/SessionImpl.ts` - Session implementation
- `src/core/ContextBuilder.ts` - Context factory
- `src/core/request-id.ts` - UUID generation
- `src/core/types.ts` - HandlerContext with mcp property (updated)

**To Modify**:
- `src/api/programmatic/BuildMCPServer.ts` - Main integration point

**To Create**:
- `tests/integration/context-injection.test.ts` - Integration tests

**For Guidance**:
- `/plans/fastmcp-parity/ARCHITECTURE.md` - Full architecture design
- `/plans/fastmcp-parity/CODE-EXAMPLES.md` - Example code
- `/plans/fastmcp-parity/PHASE-1-PROGRESS.md` - Progress tracking

---

## 🚀 Ready to Implement

All prerequisite work complete:
- ✅ Context classes implemented and tested
- ✅ Type integration complete
- ✅ Clear implementation plan documented
- ✅ Test requirements defined
- ✅ Success criteria established

**Next Step**: Implement Tasks 1-5 in BuildMCPServer.ts

---

**Handoff Date**: 2025-10-18
**Phase**: 1 Layer 3
**Estimated Time**: 2-3 hours
**Risk Level**: Low (backward compatible changes)
