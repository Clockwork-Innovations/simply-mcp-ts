# Phase 3 Layer 3: Lifecycle Hooks Implementation Plan

**Status:** Active Implementation
**Created:** 2025-10-18
**Priority:** P1 (Important)
**Estimated Effort:** 4-6 hours

---

## Overview

Phase 3 Layer 3 implements lifecycle hooks that allow developers to execute custom logic at key points in the server lifecycle. This enables proper resource initialization and cleanup patterns.

### Dependencies
- ✅ Phase 1 (all layers) - Context system foundation
- ✅ Phase 2 (all layers) - Notification system
- ✅ Phase 3 Layers 1&2 - Server metadata

---

## Requirements

### Functional Requirements

1. **Lifecycle Hooks**
   - `onStartup`: Called when server starts, before accepting requests
   - `onShutdown`: Called when server stops, for cleanup

2. **Lifespan Context**
   - Shared state container for entire server lifetime
   - Accessible in all handlers via `context.request_context.lifespan_context`
   - Type-safe through generics (optional)

3. **Hook Invocation**
   - `onStartup` called in `BuildMCPServer.start()`
   - `onShutdown` called in `BuildMCPServer.stop()`
   - Errors in hooks should be logged but not crash server

4. **Backward Compatibility**
   - Hooks are optional (undefined by default)
   - No breaking changes to existing APIs
   - Graceful degradation if hooks not provided

### Non-Functional Requirements

1. **Performance**: Hook execution should not significantly delay server startup/shutdown
2. **Error Handling**: Hooks should catch and log errors, not propagate
3. **Testing**: Comprehensive test coverage for all hook scenarios
4. **Documentation**: Clear examples of common use cases

---

## Architecture

### Type Definitions

#### 1. Lifespan Context Type (Context.ts)

```typescript
/**
 * Lifespan context - shared state for server lifetime
 * Initialized in onStartup hook, available in all handlers
 */
export interface LifespanContext {
  [key: string]: any;
}
```

#### 2. Lifecycle Hook Types (types.ts)

```typescript
/**
 * Hook called when server starts up
 * Use for resource initialization (DB connections, etc.)
 */
export type OnStartupHook = (
  lifespanContext: LifespanContext
) => Promise<void> | void;

/**
 * Hook called when server shuts down
 * Use for resource cleanup
 */
export type OnShutdownHook = (
  lifespanContext: LifespanContext
) => Promise<void> | void;
```

#### 3. BuildMCPServerOptions Extension (types.ts)

```typescript
export interface BuildMCPServerOptions {
  // ... existing fields ...

  // Phase 3 Layer 3: Lifecycle hooks
  /**
   * Called when server starts, before accepting requests
   * Use to initialize resources (databases, caches, etc.)
   */
  onStartup?: OnStartupHook;

  /**
   * Called when server stops
   * Use to cleanup resources
   */
  onShutdown?: OnShutdownHook;
}
```

#### 4. RequestContext Extension (Context.ts)

```typescript
export interface RequestContext {
  readonly request_id: string;
  readonly meta?: RequestMeta;

  /**
   * Lifespan context - shared state across server lifetime
   * Initialized in onStartup, available in all handlers
   */
  readonly lifespan_context?: LifespanContext;
}
```

### Implementation Points

#### 1. BuildMCPServer Class (BuildMCPServer.ts)

**New Fields:**
```typescript
private lifespanContext: LifespanContext = {};
private onStartupHook?: OnStartupHook;
private onShutdownHook?: OnShutdownHook;
```

**Constructor Changes:**
```typescript
constructor(options: BuildMCPServerOptions) {
  // ... existing code ...

  // Store lifecycle hooks
  this.onStartupHook = options.onStartup;
  this.onShutdownHook = options.onShutdown;
}
```

**start() Method Changes:**
```typescript
async start(options?: StartOptions): Promise<void> {
  // ... existing initialization ...

  // Call onStartup hook if provided
  if (this.onStartupHook) {
    try {
      await Promise.resolve(this.onStartupHook(this.lifespanContext));
      console.log('[BuildMCPServer] onStartup hook completed');
    } catch (error) {
      console.error('[BuildMCPServer] onStartup hook failed:', error);
      // Don't throw - allow server to start even if hook fails
    }
  }

  // ... continue with transport setup ...
}
```

**stop() Method Changes:**
```typescript
async stop(): Promise<void> {
  // Call onShutdown hook if provided
  if (this.onShutdownHook) {
    try {
      await Promise.resolve(this.onShutdownHook(this.lifespanContext));
      console.log('[BuildMCPServer] onShutdown hook completed');
    } catch (error) {
      console.error('[BuildMCPServer] onShutdown hook failed:', error);
      // Continue with shutdown even if hook fails
    }
  }

  // ... existing cleanup code ...
}
```

#### 2. ContextBuilder Class (ContextBuilder.ts)

**New Field:**
```typescript
private lifespanContext?: LifespanContext;
```

**Constructor Changes:**
```typescript
constructor(server: Server, options: ContextBuilderOptions, lifespanContext?: LifespanContext) {
  // ... existing code ...
  this.lifespanContext = lifespanContext;
}
```

**buildContext() Changes:**
```typescript
buildContext(requestId?: string, requestMeta?: RequestMeta): Context {
  const request_id = requestId ?? generateRequestId();

  const request_context: RequestContext = {
    request_id,
    meta: requestMeta,
    lifespan_context: this.lifespanContext,  // Add lifespan context
  };

  return {
    fastmcp: this.serverInfo,
    session: this.sessionImpl,
    request_context,
  };
}
```

#### 3. BuildMCPServer ContextBuilder Integration (BuildMCPServer.ts)

**Update ContextBuilder Creation:**
```typescript
// In setupMCPHandlers() or wherever ContextBuilder is created
this.contextBuilder = new ContextBuilder(
  this.server,
  {
    name: this.options.name,
    version: this.options.version,
    description: this.options.description,
    instructions: this.options.instructions,
    website_url: this.options.website_url,
    icons: this.options.icons,
    settings: this.options.settings,
  },
  this.lifespanContext  // Pass lifespan context
);
```

---

## Test Plan

### Unit Tests (tests/phase3-layer3.test.ts)

1. **Lifecycle Hook Invocation**
   - ✓ onStartup called when server starts
   - ✓ onShutdown called when server stops
   - ✓ Hooks receive lifespan context parameter
   - ✓ Hooks can be async or sync

2. **Lifespan Context Access**
   - ✓ Tool handlers can access lifespan_context
   - ✓ Prompt handlers can access lifespan_context
   - ✓ Resource handlers can access lifespan_context
   - ✓ Context is shared across all handlers

3. **Resource Lifecycle Pattern**
   - ✓ Initialize resource in onStartup
   - ✓ Access resource in handlers
   - ✓ Cleanup resource in onShutdown

4. **Error Handling**
   - ✓ Server starts even if onStartup fails
   - ✓ Server stops even if onShutdown fails
   - ✓ Errors are logged appropriately

5. **Backward Compatibility**
   - ✓ Server works without hooks
   - ✓ Hooks are optional
   - ✓ No breaking changes to existing code

### Integration Tests

1. **Database Connection Pattern**
   ```typescript
   const server = new BuildMCPServer({
     name: 'db-server',
     version: '1.0.0',
     onStartup: async (ctx) => {
       ctx.db = await connectDatabase();
     },
     onShutdown: async (ctx) => {
       await ctx.db.close();
     }
   });
   ```

2. **Cache Initialization Pattern**
   ```typescript
   const server = new BuildMCPServer({
     name: 'cache-server',
     version: '1.0.0',
     onStartup: async (ctx) => {
       ctx.cache = new Map();
       ctx.startTime = Date.now();
     }
   });
   ```

---

## Example Usage

### Basic Resource Management

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

// Create server with lifecycle hooks
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',

  // Initialize resources on startup
  onStartup: async (ctx) => {
    console.log('Server starting...');
    ctx.database = await connectToDatabase();
    ctx.cache = new Map();
    ctx.startTime = Date.now();
  },

  // Cleanup on shutdown
  onShutdown: async (ctx) => {
    console.log('Server stopping...');
    await ctx.database?.close();
    ctx.cache?.clear();
  }
});

// Tools can access lifespan context
server.addTool({
  name: 'get_user',
  description: 'Get user from database',
  parameters: z.object({
    userId: z.string()
  }),
  execute: async (args, context) => {
    // Access database from lifespan context
    const db = context?.mcp?.request_context?.lifespan_context?.database;
    if (!db) throw new Error('Database not initialized');

    const user = await db.users.findById(args.userId);
    return JSON.stringify(user);
  }
});

await server.start();
```

### Cache Pattern

```typescript
const server = new BuildMCPServer({
  name: 'cache-server',
  version: '1.0.0',

  onStartup: async (ctx) => {
    // Initialize cache
    ctx.cache = new Map();

    // Preload data
    ctx.cache.set('startup_time', new Date().toISOString());
    ctx.cache.set('config', await loadConfig());
  },

  onShutdown: async (ctx) => {
    // Persist cache if needed
    if (ctx.cache) {
      await saveCacheToFile(ctx.cache);
      ctx.cache.clear();
    }
  }
});

server.addTool({
  name: 'get_config',
  description: 'Get cached configuration',
  parameters: z.object({}),
  execute: async (args, context) => {
    const cache = context?.mcp?.request_context?.lifespan_context?.cache;
    return cache?.get('config') ?? 'No config';
  }
});
```

---

## Implementation Checklist

### Phase 1: Type Definitions
- [ ] Add `LifespanContext` interface to Context.ts
- [ ] Add `OnStartupHook` type to types.ts
- [ ] Add `OnShutdownHook` type to types.ts
- [ ] Add `onStartup` field to BuildMCPServerOptions
- [ ] Add `onShutdown` field to BuildMCPServerOptions
- [ ] Add `lifespan_context` to RequestContext

### Phase 2: Implementation
- [ ] Add `lifespanContext` field to BuildMCPServer
- [ ] Store hooks from options in constructor
- [ ] Call onStartup in start() method
- [ ] Call onShutdown in stop() method
- [ ] Pass lifespanContext to ContextBuilder
- [ ] Update ContextBuilder to include lifespan_context in built contexts

### Phase 3: Testing
- [ ] Create tests/phase3-layer3.test.ts
- [ ] Test hook invocation (startup/shutdown)
- [ ] Test lifespan context access in handlers
- [ ] Test error handling in hooks
- [ ] Test backward compatibility
- [ ] Test resource lifecycle patterns

### Phase 4: Validation
- [ ] All tests pass (100%)
- [ ] No breaking changes
- [ ] Performance acceptable (< 100ms hook overhead)
- [ ] Documentation complete
- [ ] Examples validated

---

## Success Criteria

- ✅ onStartup and onShutdown hooks are called at correct times
- ✅ Lifespan context is accessible in all handler types
- ✅ Resource lifecycle pattern works (init → use → cleanup)
- ✅ Error handling is graceful (server continues despite hook errors)
- ✅ Backward compatible (no breaking changes)
- ✅ All tests pass (100% coverage for new code)
- ✅ Performance impact < 100ms on server start/stop

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Hook errors crash server | High | Wrap hooks in try-catch, log errors |
| Memory leaks in lifespan context | Medium | Clear documentation on cleanup patterns |
| Type safety issues | Low | Use TypeScript generics for type safety |
| Breaking changes | High | Make all fields optional, maintain backward compatibility |

---

## Next Steps

1. Implement type definitions (Context.ts, types.ts)
2. Implement BuildMCPServer changes (store hooks, call hooks)
3. Implement ContextBuilder changes (pass lifespan context)
4. Create comprehensive tests
5. Validate with integration tests
6. Update documentation and examples

---

**Document Status:** Ready for Implementation
**Assigned To:** Implementation Agent
**Review Required:** Yes (before merge)
