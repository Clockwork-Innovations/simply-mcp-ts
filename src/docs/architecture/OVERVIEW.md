# Configurable MCP Framework: Comprehensive Implementation Plan

**Document Version:** 1.0
**Date:** 2025-09-29
**Status:** Planning Phase

> **Note:** This implementation plan references the type system and interfaces defined in [DESIGN.md](./DESIGN.md). For complete type definitions, see that document.

---

## Executive Summary

### Overview
This plan synthesizes findings from the MCP Tool System Design specification, the existing ConfigurableServer implementation, and the Resume Automation System architecture to create a production-ready, configurable MCP framework.

### Related Documentation
- **[DESIGN.md](./DESIGN.md)** - Complete TypeScript interfaces and type system
- **[README.md](../../README.md)** - Framework documentation index
- **[TECHNICAL.md](./TECHNICAL.md)** - Visual architecture documentation

### Key Findings Synthesis

#### From Tool System Design (Report 3)
- **Comprehensive type system** with 15+ interfaces covering tool definitions, handlers, lifecycle, security
- **Five handler types** defined: inline, file, builtin, package, composite
- **Plugin architecture** for extensibility with middleware and transformers
- **Security framework** including sandboxing, secrets management, audit logging
- **Performance features**: caching, retry, circuit breakers, rate limiting

#### From ConfigurableServer Analysis (Current Implementation)
- **Critical Limitation**: Tool handlers only echo arguments; no real execution logic
- **Missing Components**:
  - Handler resolution mechanism
  - Input validation beyond schema
  - Security features (sandboxing, sanitization)
  - Plugin system
  - Performance optimization (caching, retry)
  - Lifecycle management
- **Strengths**:
  - Clean session management
  - Proper MCP transport implementation
  - Configuration-driven architecture foundation
  - TypeScript type safety

#### From Architecture Context
- **Real-world use case**: Browser automation for resume submission
- **Production requirements**: Native messaging, Chrome extension integration
- **Performance constraints**: 1MB message limit, <50MB memory target
- **Security requirements**: API key validation, origin validation, process isolation

### Critical Gaps Identified

1. **Handler Execution**: No mechanism to actually execute tool logic
2. **Type System Mismatch**: Design spec has rich types; implementation is minimal
3. **Security**: No sandboxing, input sanitization, or threat detection
4. **Performance**: No caching, retry logic, or circuit breakers
5. **Plugin System**: Complete plugin architecture designed but not implemented
6. **Lifecycle Management**: No state tracking, versioning, or hot reload
7. **Validation**: Only basic schema validation; missing custom validators
8. **Error Handling**: Minimal error recovery and retry strategies

### Recommended Approach

**Phased implementation focusing on:**
1. **Phase 1 (Core Foundation)**: Handler execution, validation, basic security
2. **Phase 2 (Essential Features)**: Caching, lifecycle management, error handling
3. **Phase 3 (Advanced)**: Plugin system, hot reload, comprehensive monitoring

**Architecture Decision:**
- **Keep existing** session management and transport layer (working well)
- **Extend** configuration schema to support design spec features
- **Implement** handler resolution and execution framework
- **Add** security layer as cross-cutting concern
- **Build** plugin system as opt-in enhancement

---

## Architecture Decisions

### 1. Patterns to Adopt from MCP SDK Examples

Based on typical MCP SDK patterns:

#### Session Management (Keep Current)
- ✅ UUID-based session IDs
- ✅ Transport lifecycle handling
- ✅ Graceful shutdown support
- **Enhancement**: Add session timeout and cleanup

#### Tool Registration Pattern
```typescript
// Current: Static loading at startup
// Adopt: Dynamic registration with validation pipeline
const registry = new ToolRegistry();
await registry.register(toolDefinition); // Validates, compiles, initializes
```

#### Error Handling Pattern
```typescript
// Adopt structured error responses
interface MCPError {
  code: number;      // -32000 to -32099 for custom errors
  message: string;
  data?: {
    type: string;    // 'ValidationError', 'ExecutionError', etc.
    details: any;
  }
}
```

#### Resource Caching Pattern
```typescript
// Adopt in-memory cache with TTL
interface CacheEntry {
  value: any;
  expiresAt: number;
  hits: number;
}
```

### 2. Addressing ConfigurableServer Limitations

#### Current Handler Implementation
```typescript
// CURRENT: Echo only
const createToolHandler = (tool: ToolConfig) => {
  return async (args: Record<string, any>) => {
    const result = `Tool '${tool.name}' called with arguments: ${JSON.stringify(args)}`;
    return { content: [{ type: 'text', text: result }] };
  };
};
```

#### Proposed Handler Resolution
```typescript
// NEW: Resolve and execute based on handler type
const createToolHandler = (tool: ToolDefinition) => {
  const handler = resolveHandler(tool.handler);

  return async (args: Record<string, any>, context: ExecutionContext) => {
    // Pre-execution: validation, hooks, access control
    await validateInput(args, tool.inputSchema);
    await checkPermissions(context.caller, tool.access);
    await tool.hooks?.preExecute?.(context);

    // Execution: with timeout, retry, caching
    const result = await executeWithPerformanceFeatures(
      handler,
      args,
      context,
      tool.performance
    );

    // Post-execution: hooks, caching
    await tool.hooks?.postExecute?.(context);
    return formatResult(result);
  };
};
```

### 3. Tool System Design Implementation Strategy

#### Type System Integration
- **Adopt full type system** from design spec
- **Create migration path** from current simplified types
- **Maintain backward compatibility** with existing config.json format

#### Handler Type Implementation Priority
1. **Inline handlers** (Phase 1) - Most common, needs sandboxing
2. **File handlers** (Phase 1) - Essential for code organization
3. **Builtin handlers** (Phase 2) - Common operations like fetch, file ops
4. **Package handlers** (Phase 2) - For npm package integration
5. **Composite handlers** (Phase 3) - Advanced orchestration

#### Security Implementation
- **Phase 1**: Input sanitization, basic validation
- **Phase 2**: Code sandboxing (vm2 or isolated-vm)
- **Phase 3**: Threat detection, anomaly analysis

### 4. Trade-offs and Rationale

#### Monolithic vs. Modular
**Decision**: Start monolithic, design for modularity
- **Rationale**: Easier to develop and debug; can extract modules later
- **Trade-off**: Initial coupling vs. faster development

#### Synchronous vs. Asynchronous Handler Execution
**Decision**: Always async with timeout
- **Rationale**: Consistency, better error handling, prevents blocking
- **Trade-off**: Slight overhead vs. safety and predictability

#### Memory vs. Redis Caching
**Decision**: Start with memory, design for pluggable backends
- **Rationale**: Simpler deployment, most use cases fit in memory
- **Trade-off**: Limited scalability vs. operational simplicity

#### Sandboxing Approach
**Decision**: Use vm2 for Phase 1, evaluate isolated-vm for Phase 3
- **Rationale**: vm2 is simpler, good enough for most cases
- **Trade-off**: Some security edge cases vs. development speed

#### Plugin System Timing
**Decision**: Defer to Phase 3
- **Rationale**: Core functionality more important; plugin architecture is complex
- **Trade-off**: Delayed extensibility vs. solid foundation

---

## Phased Implementation Plan

### Phase 1: Core Foundation (Weeks 1-3)
**Goal**: Make handlers actually work with basic security

#### 1.1 Handler Execution Framework
- Implement handler resolution logic
- Add inline handler execution with basic sandboxing
- Add file handler loading and caching
- Implement timeout mechanism

**Files to Create:**
- `/mcp/core/HandlerResolver.ts` - Resolves handler configuration to executable function
- `/mcp/core/HandlerExecutor.ts` - Executes handlers with timeout and error handling
- `/mcp/core/Sandbox.ts` - Basic sandboxing for inline handlers
- `/mcp/core/ExecutionContext.ts` - Context object passed to handlers

**Files to Modify:**
- `/mcp/configurableServer.ts` - Replace echo handler with real execution
- `/mcp/types.ts` - Add handler type definitions

#### 1.2 Input Validation
- Implement JSON Schema validation with AJV
- Add input sanitization (XSS, path traversal, etc.)
- Add custom validator support

**Files to Create:**
- `/mcp/validation/InputValidator.ts`
- `/mcp/validation/Sanitizer.ts`
- `/mcp/validation/CustomValidators.ts`

#### 1.3 Basic Security
- Add input sanitization
- Implement basic access control
- Add security event logging

**Files to Create:**
- `/mcp/security/AccessControl.ts`
- `/mcp/security/SecurityLogger.ts`

#### 1.4 Enhanced Configuration Schema
- Extend config.json schema to support handler types
- Add validation for configuration file
- Create configuration examples

**Files to Create:**
- `/mcp/config/ConfigSchema.ts` - JSON Schema for config validation
- `/mcp/config/ConfigLoader.ts` - Load and validate configuration
- `/mcp/examples/` - Example configurations

**Deliverables:**
- ✅ Tools can execute real logic (inline and file handlers)
- ✅ Input validation prevents basic attacks
- ✅ Configuration validation prevents errors
- ✅ Basic audit logging for security events

### Phase 2: Essential Features (Weeks 4-6)
**Goal**: Production-ready with performance and reliability features

#### 2.1 Caching System
- Implement in-memory cache with TTL
- Add cache key generation
- Add cache invalidation hooks

**Files to Create:**
- `/mcp/cache/MemoryCache.ts`
- `/mcp/cache/CacheInterface.ts`
- `/mcp/cache/CacheKeyGenerator.ts`

#### 2.2 Lifecycle Management
- Implement tool lifecycle states
- Add state transition tracking
- Add execution statistics

**Files to Create:**
- `/mcp/lifecycle/ToolLifecycle.ts`
- `/mcp/lifecycle/StateManager.ts`
- `/mcp/lifecycle/StatsCollector.ts`

#### 2.3 Error Handling & Retry
- Implement retry logic with backoff
- Add circuit breaker pattern
- Enhanced error messages

**Files to Create:**
- `/mcp/resilience/RetryHandler.ts`
- `/mcp/resilience/CircuitBreaker.ts`
- `/mcp/errors/ErrorFormatter.ts`

#### 2.4 Built-in Handlers
- Implement common built-in handlers:
  - `fetch` - HTTP requests
  - `file-read` - Read files
  - `file-write` - Write files
  - `template` - Template rendering
  - `transform` - Data transformation

**Files to Create:**
- `/mcp/handlers/builtin/FetchHandler.ts`
- `/mcp/handlers/builtin/FileHandlers.ts`
- `/mcp/handlers/builtin/TemplateHandler.ts`
- `/mcp/handlers/builtin/TransformHandler.ts`
- `/mcp/handlers/builtin/index.ts` - Registry

#### 2.5 Rate Limiting
- Implement rate limiter
- Add per-caller limits
- Add queue strategy

**Files to Create:**
- `/mcp/ratelimit/RateLimiter.ts`
- `/mcp/ratelimit/RateLimitStore.ts`

**Deliverables:**
- ✅ Caching improves performance for repeated queries
- ✅ Retry and circuit breaker improve reliability
- ✅ Lifecycle tracking provides observability
- ✅ Built-in handlers reduce custom code needs
- ✅ Rate limiting prevents abuse

### Phase 3: Advanced Capabilities (Weeks 7-10)
**Goal**: Full feature parity with design spec

#### 3.1 Plugin System
- Implement plugin loading
- Add plugin lifecycle management
- Add middleware chain
- Add plugin discovery

**Files to Create:**
- `/mcp/plugins/PluginManager.ts`
- `/mcp/plugins/PluginLoader.ts`
- `/mcp/plugins/MiddlewareChain.ts`
- `/mcp/plugins/PluginRegistry.ts`

#### 3.2 Package Handlers
- Implement NPM package loading
- Add version management
- Add auto-install capability

**Files to Create:**
- `/mcp/handlers/PackageHandler.ts`
- `/mcp/handlers/PackageResolver.ts`

#### 3.3 Composite Handlers
- Implement pipeline strategy
- Implement parallel strategy
- Implement fallback strategy
- Implement conditional strategy

**Files to Create:**
- `/mcp/handlers/composite/CompositeHandler.ts`
- `/mcp/handlers/composite/Strategies.ts`

#### 3.4 Hot Reload
- Implement file watchers
- Add reload mechanism
- Add dependency tracking

**Files to Create:**
- `/mcp/hotreload/FileWatcher.ts`
- `/mcp/hotreload/ReloadManager.ts`
- `/mcp/hotreload/DependencyGraph.ts`

#### 3.5 Advanced Security
- Implement enhanced sandboxing (isolated-vm)
- Add threat detection
- Add secrets management integration

**Files to Create:**
- `/mcp/security/EnhancedSandbox.ts`
- `/mcp/security/ThreatDetector.ts`
- `/mcp/security/SecretsManager.ts`

#### 3.6 Monitoring & Observability
- Add Prometheus metrics
- Add health check endpoint
- Add distributed tracing support

**Files to Create:**
- `/mcp/monitoring/MetricsCollector.ts`
- `/mcp/monitoring/HealthCheck.ts`
- `/mcp/monitoring/Tracing.ts`

**Deliverables:**
- ✅ Plugin system enables extensibility
- ✅ Composite handlers enable complex workflows
- ✅ Hot reload enables rapid development
- ✅ Enhanced security for production use
- ✅ Comprehensive monitoring and observability

---

## File Structure

### Recommended Directory Layout

```
/mcp
├── README.md                          # Updated documentation
├── package.json                       # Dependencies
├── tsconfig.json                      # TypeScript config
│
├── server.ts                          # Main entry point (renamed from configurableServer.ts)
├── types.ts                           # Core type definitions (extended)
│
├── /core                              # Core framework components
│   ├── HandlerResolver.ts            # Resolves handler configs to functions
│   ├── HandlerExecutor.ts            # Executes handlers with context
│   ├── ExecutionContext.ts           # Context passed to handlers
│   ├── ToolRegistry.ts               # Central tool registry
│   └── Sandbox.ts                    # Code sandboxing
│
├── /config                            # Configuration management
│   ├── ConfigSchema.ts               # JSON Schema for validation
│   ├── ConfigLoader.ts               # Load and validate config
│   └── ConfigMerger.ts               # Merge environment configs
│
├── /handlers                          # Handler implementations
│   ├── /builtin                       # Built-in handlers
│   │   ├── FetchHandler.ts
│   │   ├── FileHandlers.ts
│   │   ├── TemplateHandler.ts
│   │   ├── TransformHandler.ts
│   │   └── index.ts
│   ├── /composite                     # Composite handler strategies
│   │   ├── CompositeHandler.ts
│   │   └── Strategies.ts
│   ├── InlineHandler.ts              # Inline code execution
│   ├── FileHandler.ts                # External file handlers
│   └── PackageHandler.ts             # NPM package handlers
│
├── /validation                        # Input validation
│   ├── InputValidator.ts             # JSON Schema validation
│   ├── Sanitizer.ts                  # Input sanitization
│   └── CustomValidators.ts           # Custom validation rules
│
├── /security                          # Security features
│   ├── AccessControl.ts              # Permission checking
│   ├── SecurityLogger.ts             # Audit logging
│   ├── EnhancedSandbox.ts            # Advanced sandboxing
│   ├── ThreatDetector.ts             # Threat detection
│   └── SecretsManager.ts             # Secrets management
│
├── /cache                             # Caching system
│   ├── CacheInterface.ts             # Cache interface
│   ├── MemoryCache.ts                # In-memory cache
│   ├── CacheKeyGenerator.ts          # Cache key generation
│   └── CacheInvalidator.ts           # Cache invalidation
│
├── /resilience                        # Resilience patterns
│   ├── RetryHandler.ts               # Retry logic
│   ├── CircuitBreaker.ts             # Circuit breaker
│   └── TimeoutHandler.ts             # Timeout handling
│
├── /ratelimit                         # Rate limiting
│   ├── RateLimiter.ts                # Rate limiter
│   ├── RateLimitStore.ts             # Rate limit storage
│   └── Strategies.ts                 # Rate limit strategies
│
├── /lifecycle                         # Lifecycle management
│   ├── ToolLifecycle.ts              # Tool lifecycle states
│   ├── StateManager.ts               # State transitions
│   └── StatsCollector.ts             # Execution statistics
│
├── /plugins                           # Plugin system
│   ├── PluginManager.ts              # Plugin management
│   ├── PluginLoader.ts               # Plugin loading
│   ├── PluginRegistry.ts             # Plugin registry
│   └── MiddlewareChain.ts            # Middleware execution
│
├── /hotreload                         # Hot reload system
│   ├── FileWatcher.ts                # File watching
│   ├── ReloadManager.ts              # Reload orchestration
│   └── DependencyGraph.ts            # Dependency tracking
│
├── /monitoring                        # Monitoring & observability
│   ├── MetricsCollector.ts           # Metrics collection
│   ├── HealthCheck.ts                # Health endpoints
│   └── Tracing.ts                    # Distributed tracing
│
├── /errors                            # Error handling
│   ├── ErrorTypes.ts                 # Custom error classes
│   ├── ErrorFormatter.ts             # Error formatting
│   └── ErrorHandler.ts               # Global error handler
│
├── /utils                             # Utility functions
│   ├── Logger.ts                     # Logging utilities
│   ├── Templates.ts                  # Template rendering
│   └── Crypto.ts                     # Cryptography utilities
│
├── /examples                          # Example configurations
│   ├── basic.config.json             # Basic example
│   ├── advanced.config.json          # Advanced features
│   ├── security.config.json          # Security-focused
│   └── handlers/                     # Example handler files
│
└── /tests                             # Test suite
    ├── /unit                          # Unit tests
    ├── /integration                   # Integration tests
    └── /e2e                           # End-to-end tests
```

### Files to Copy from SDK Examples

Based on typical MCP SDK patterns:

1. **Session management patterns** - Already implemented well
2. **Transport layer** - Keep existing StreamableHTTPServerTransport usage
3. **Error codes** - Adopt standard MCP error code ranges

### New Files to Create (Priority Order)

**Phase 1 (Critical):**
1. `/mcp/core/HandlerResolver.ts`
2. `/mcp/core/HandlerExecutor.ts`
3. `/mcp/handlers/InlineHandler.ts`
4. `/mcp/handlers/FileHandler.ts`
5. `/mcp/validation/InputValidator.ts`
6. `/mcp/security/AccessControl.ts`

**Phase 2 (Important):**
7. `/mcp/cache/MemoryCache.ts`
8. `/mcp/resilience/RetryHandler.ts`
9. `/mcp/handlers/builtin/` (all built-in handlers)
10. `/mcp/lifecycle/ToolLifecycle.ts`

**Phase 3 (Enhancement):**
11. `/mcp/plugins/PluginManager.ts`
12. `/mcp/handlers/composite/CompositeHandler.ts`
13. `/mcp/hotreload/FileWatcher.ts`
14. `/mcp/monitoring/MetricsCollector.ts`

---

## Priority Matrix

### Must-Have Features (Launch Blockers)

| Feature | Priority | Phase | Effort | Risk | Impact |
|---------|----------|-------|--------|------|--------|
| Handler Execution | P0 | 1 | High | Medium | Critical |
| Input Validation | P0 | 1 | Medium | Low | Critical |
| File Handlers | P0 | 1 | Medium | Low | High |
| Error Handling | P0 | 2 | Medium | Low | High |
| Basic Security | P0 | 1 | High | High | Critical |

**Justification:**
- Without handler execution, the system is non-functional
- Input validation prevents security vulnerabilities
- File handlers are essential for code organization
- Error handling ensures reliability
- Basic security is non-negotiable for production

### Nice-to-Have Features (Value-Add)

| Feature | Priority | Phase | Effort | Risk | Impact |
|---------|----------|-------|--------|------|--------|
| Caching | P1 | 2 | Medium | Low | High |
| Built-in Handlers | P1 | 2 | High | Low | Medium |
| Rate Limiting | P1 | 2 | Medium | Low | Medium |
| Lifecycle Tracking | P2 | 2 | Medium | Low | Medium |
| Circuit Breaker | P2 | 2 | Medium | Medium | Medium |

**Justification:**
- Caching provides immediate performance benefits
- Built-in handlers reduce development friction
- Rate limiting prevents abuse
- Lifecycle tracking improves observability
- Circuit breaker improves resilience

### Future Features (Long-term Investment)

| Feature | Priority | Phase | Effort | Risk | Impact |
|---------|----------|-------|--------|------|--------|
| Plugin System | P2 | 3 | Very High | High | High |
| Package Handlers | P2 | 3 | High | Medium | Medium |
| Composite Handlers | P3 | 3 | High | Medium | Medium |
| Hot Reload | P3 | 3 | High | High | Medium |
| Advanced Security | P2 | 3 | Very High | High | High |

**Justification:**
- Plugin system enables extensibility but complex
- Package handlers add flexibility
- Composite handlers enable advanced workflows
- Hot reload improves DX but risky
- Advanced security is important but can iterate

### Quick Wins vs. Long-term Investments

#### Quick Wins (High Impact, Low Effort)
1. **Input sanitization** - Prevents common attacks, ~1 day
2. **Inline handler execution** - Core functionality, ~2 days
3. **File handler loading** - Essential feature, ~2 days
4. **Memory caching** - Performance boost, ~1 day
5. **JSON Schema validation** - Already have schema, ~1 day

#### Long-term Investments (High Impact, High Effort)
1. **Plugin system** - Extensibility foundation, ~2 weeks
2. **Enhanced sandboxing** - Security hardening, ~1 week
3. **Hot reload** - DX improvement, ~1 week
4. **Composite handlers** - Advanced orchestration, ~1 week
5. **Monitoring system** - Observability, ~1 week

### Security vs. Features Trade-offs

#### Security-First Approach (Recommended)
- **Phase 1**: Basic security (sanitization, validation, basic sandboxing)
- **Phase 2**: Enhanced features with security in mind (rate limiting, access control)
- **Phase 3**: Advanced security (threat detection, secrets management)

**Rationale**: Security is easier to build in than retrofit

#### Feature-First Approach (Not Recommended)
- Get features working first, add security later
- **Risk**: Security vulnerabilities in production
- **Debt**: Harder to add security after architecture is set

#### Balanced Approach (Alternative)
- Core security in Phase 1
- Features and security together in Phase 2
- Advanced security in Phase 3

**Decision**: Adopt Security-First Approach
- Security incidents are costly
- Users expect security by default
- Easier to add features to secure foundation

---

## Implementation Specifications

### Top 3 Priority Items: Detailed Specifications

### 1. Handler Execution Framework

#### Specification

**Purpose**: Enable tools to execute actual logic instead of echoing arguments.

**Components**:
1. **HandlerResolver**: Maps handler configuration to executable functions
2. **HandlerExecutor**: Executes handlers with context, timeout, error handling
3. **ExecutionContext**: Rich context object passed to handlers

#### Interface Definitions

```typescript
// Handler resolution
interface HandlerResolver {
  resolve(config: ToolHandler): ResolvedHandler;
  validateHandler(handler: ResolvedHandler): ValidationResult;
}

interface ResolvedHandler {
  type: ToolHandlerType;
  execute: HandlerFunction;
  metadata: {
    source: string;      // File path, inline code, etc.
    compiled: boolean;   // Is handler pre-compiled?
    cached: boolean;     // Is handler cached?
  };
}

type HandlerFunction = (
  input: Record<string, any>,
  context: ExecutionContext
) => Promise<any>;

// Execution context
interface ExecutionContext {
  // Tool information
  tool: string;
  toolVersion?: string;

  // Input
  input: Record<string, any>;

  // Caller information
  caller: CallerInfo;

  // Execution metadata
  executionId: string;
  startTime: number;
  timeout?: number;

  // Utilities
  logger: Logger;
  cache: CacheInterface;
  callTool: (name: string, input: any) => Promise<any>;

  // Custom data
  custom: Map<string, any>;

  // Request/response (for hooks to modify)
  result?: any;
  error?: Error;
}

interface CallerInfo {
  id: string;
  type: 'user' | 'system' | 'service';
  permissions: string[];
  sessionId?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

// Execution
interface HandlerExecutor {
  execute(
    handler: ResolvedHandler,
    input: Record<string, any>,
    context: Partial<ExecutionContext>
  ): Promise<any>;

  executeWithTimeout(
    handler: ResolvedHandler,
    input: Record<string, any>,
    context: ExecutionContext,
    timeoutMs: number
  ): Promise<any>;
}

// Configuration extensions
interface ToolDefinition {
  // ... existing fields
  handler: ToolHandler;
}

type ToolHandler = InlineHandler | FileHandler | BuiltInHandler | PackageHandler | CompositeHandler;

interface InlineHandler {
  type: 'inline';
  code: string;              // JavaScript/TypeScript code
  language?: 'js' | 'ts';    // Default: 'js'
  sandbox?: boolean;         // Default: true
  cache?: boolean;           // Default: true
}

interface FileHandler {
  type: 'file';
  path: string;              // Relative or absolute path
  exportName?: string;       // Default: 'default'
  watch?: boolean;           // Watch for changes? Default: false
}

interface BuiltInHandler {
  type: 'builtin';
  handler: BuiltInHandlerType;
  config: Record<string, any>;
}

type BuiltInHandlerType = 'echo' | 'fetch' | 'file-read' | 'file-write' | 'template' | 'transform';
```

#### Integration Points

**With ConfigurableServer.ts:**
```typescript
// Replace createToolHandler function
const createToolHandler = (tool: ToolDefinition) => {
  // Resolve handler
  const resolved = handlerResolver.resolve(tool.handler);

  // Validate
  const validation = handlerResolver.validateHandler(resolved);
  if (!validation.valid) {
    throw new Error(`Invalid handler: ${validation.errors.join(', ')}`);
  }

  // Return executor wrapper
  return async (args: Record<string, any>, sessionId: string) => {
    const context: ExecutionContext = {
      tool: tool.name,
      input: args,
      caller: { id: sessionId, type: 'user', permissions: [] },
      executionId: randomUUID(),
      startTime: Date.now(),
      logger: createLogger(tool.name),
      cache: memoryCache,
      callTool: async (name, input) => {
        // Recursive tool calling
        const targetTool = toolRegistry.get(name);
        if (!targetTool) throw new Error(`Tool not found: ${name}`);
        return await targetTool.handler(input, sessionId);
      },
      custom: new Map(),
    };

    try {
      const result = await handlerExecutor.execute(resolved, args, context);
      return formatResult(result);
    } catch (error) {
      throw formatError(error);
    }
  };
};
```

**With MCP Request Handler:**
```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const tool = toolRegistry.get(toolName);

  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  const sessionId = getSessionId(request);
  return await tool.handler(request.params.arguments || {}, sessionId);
});
```

#### Testing Approach

**Unit Tests:**
```typescript
describe('HandlerResolver', () => {
  it('should resolve inline handler', () => {
    const config: InlineHandler = {
      type: 'inline',
      code: 'async (input) => ({ result: input.x * 2 })'
    };
    const resolved = resolver.resolve(config);
    expect(resolved.type).toBe('inline');
    expect(resolved.execute).toBeInstanceOf(Function);
  });

  it('should resolve file handler', () => {
    const config: FileHandler = {
      type: 'file',
      path: './handlers/test.js'
    };
    const resolved = resolver.resolve(config);
    expect(resolved.type).toBe('file');
    expect(resolved.metadata.source).toContain('test.js');
  });

  it('should cache compiled inline handlers', async () => {
    const config: InlineHandler = {
      type: 'inline',
      code: 'async (input) => ({ count: ++global.counter })',
      cache: true
    };
    const resolved1 = resolver.resolve(config);
    const resolved2 = resolver.resolve(config);
    expect(resolved1).toBe(resolved2); // Same instance
  });
});

describe('HandlerExecutor', () => {
  it('should execute handler with context', async () => {
    const handler: ResolvedHandler = {
      type: 'inline',
      execute: async (input, ctx) => ({ doubled: input.value * 2 }),
      metadata: { source: 'inline', compiled: true, cached: false }
    };

    const result = await executor.execute(handler, { value: 5 }, {});
    expect(result.doubled).toBe(10);
  });

  it('should enforce timeout', async () => {
    const handler: ResolvedHandler = {
      type: 'inline',
      execute: async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { done: true };
      },
      metadata: { source: 'inline', compiled: true, cached: false }
    };

    await expect(
      executor.executeWithTimeout(handler, {}, {}, 100)
    ).rejects.toThrow('Execution timeout');
  });
});
```

**Integration Tests:**
```typescript
describe('Tool Execution E2E', () => {
  it('should execute inline tool', async () => {
    const config: ServerConfig = {
      name: 'test-server',
      version: '1.0.0',
      tools: [{
        name: 'multiply',
        description: 'Multiply two numbers',
        inputSchema: {
          type: 'object',
          properties: {
            a: { type: 'number' },
            b: { type: 'number' }
          },
          required: ['a', 'b']
        },
        handler: {
          type: 'inline',
          code: 'async ({a, b}) => ({ result: a * b })'
        }
      }]
    };

    const server = createServerFromConfig(config);
    const transport = new TestTransport();
    await server.connect(transport);

    const response = await transport.request({
      method: 'tools/call',
      params: {
        name: 'multiply',
        arguments: { a: 6, b: 7 }
      }
    });

    expect(response.result.content[0].text).toContain('42');
  });
});
```

---

### 2. Input Validation & Sanitization

#### Specification

**Purpose**: Validate inputs against schema and sanitize to prevent security vulnerabilities.

**Components**:
1. **InputValidator**: JSON Schema validation with AJV
2. **Sanitizer**: Input sanitization (XSS, path traversal, injection)
3. **CustomValidators**: Extensible validation rules

#### Interface Definitions

```typescript
interface InputValidator {
  validate(
    input: any,
    schema: JSONSchema,
    options?: ValidationOptions
  ): ValidationResult;

  addCustomValidator(
    name: string,
    validator: CustomValidatorFunction
  ): void;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  sanitized?: any;  // Sanitized version of input
}

interface ValidationError {
  path: string;          // JSON path to error (e.g., '/user/email')
  message: string;       // Human-readable message
  code: string;          // Error code (e.g., 'type_mismatch')
  expected?: any;        // Expected value/type
  actual?: any;          // Actual value/type
}

interface ValidationOptions {
  strict?: boolean;              // Fail on unknown properties
  coerceTypes?: boolean;         // Coerce types (e.g., "5" -> 5)
  removeAdditional?: boolean;    // Remove unknown properties
  sanitize?: boolean;            // Apply sanitization
  customValidators?: string[];   // Custom validators to apply
}

type CustomValidatorFunction = (
  value: any,
  schema: JSONSchema,
  path: string
) => ValidationResult;

// Sanitizer
interface Sanitizer {
  sanitizeInput(
    input: any,
    schema: JSONSchema
  ): any;

  sanitizeString(value: string, options?: SanitizeOptions): string;
  sanitizeURL(url: string): string;
  sanitizePath(path: string): string;
  sanitizeHTML(html: string): string;
}

interface SanitizeOptions {
  allowedTags?: string[];        // HTML tags to allow
  allowedAttributes?: string[];  // HTML attributes to allow
  maxLength?: number;            // Max string length
  pattern?: RegExp;              // Must match pattern
}

// Extended tool definition
interface ToolDefinition {
  // ... existing fields
  inputSchema: JSONSchema;
  validation?: ValidationConfig;
}

interface ValidationConfig {
  strict?: boolean;
  coerceTypes?: boolean;
  removeAdditional?: boolean;
  sanitize?: boolean;
  customValidators?: string[];

  // Sanitization rules per field
  sanitizationRules?: Record<string, SanitizeOptions>;
}
```

#### Integration Points

**Pre-execution validation:**
```typescript
const executeToolWithValidation = async (
  tool: ToolDefinition,
  input: any,
  context: ExecutionContext
) => {
  // Validate input
  const validation = inputValidator.validate(
    input,
    tool.inputSchema,
    tool.validation || {}
  );

  if (!validation.valid) {
    throw new ValidationError(
      `Invalid input for tool ${tool.name}`,
      validation.errors
    );
  }

  // Use sanitized input
  const sanitizedInput = validation.sanitized || input;

  // Execute handler
  return await handlerExecutor.execute(
    tool.handler,
    sanitizedInput,
    context
  );
};
```

**Sanitization examples:**
```typescript
// XSS prevention
sanitizer.sanitizeString('<script>alert("xss")</script>', {
  allowedTags: []
}); // Returns: ''

// Path traversal prevention
sanitizer.sanitizePath('../../../etc/passwd'); // Returns: 'etc/passwd'

// URL validation
sanitizer.sanitizeURL('javascript:alert(1)'); // Throws error

// SQL injection prevention (for template handler)
sanitizer.sanitizeString("'; DROP TABLE users--", {
  pattern: /^[a-zA-Z0-9_\s]+$/
}); // Throws error
```

#### Testing Approach

**Unit Tests:**
```typescript
describe('InputValidator', () => {
  it('should validate correct input', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number', minimum: 0 }
      },
      required: ['name']
    };

    const result = validator.validate(
      { name: 'Alice', age: 30 },
      schema
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid input', () => {
    const schema = {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' }
      },
      required: ['email']
    };

    const result = validator.validate(
      { email: 'not-an-email' },
      schema
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('format');
  });

  it('should coerce types when enabled', () => {
    const schema = {
      type: 'object',
      properties: {
        age: { type: 'number' }
      }
    };

    const result = validator.validate(
      { age: '25' },
      schema,
      { coerceTypes: true }
    );

    expect(result.valid).toBe(true);
    expect(result.sanitized.age).toBe(25);
  });
});

describe('Sanitizer', () => {
  it('should prevent XSS', () => {
    const malicious = '<script>alert("xss")</script><p>Hello</p>';
    const clean = sanitizer.sanitizeHTML(malicious);
    expect(clean).toBe('<p>Hello</p>');
  });

  it('should prevent path traversal', () => {
    const malicious = '../../etc/passwd';
    const clean = sanitizer.sanitizePath(malicious);
    expect(clean).not.toContain('..');
  });

  it('should validate URLs', () => {
    expect(() => sanitizer.sanitizeURL('javascript:alert(1)'))
      .toThrow();
    expect(() => sanitizer.sanitizeURL('https://example.com'))
      .not.toThrow();
  });
});
```

**Security Tests:**
```typescript
describe('Security - Input Validation', () => {
  const securityTestCases = [
    {
      name: 'XSS in string field',
      input: { name: '<script>alert(1)</script>' },
      shouldFail: false,  // Should sanitize, not fail
      sanitized: { name: '' }
    },
    {
      name: 'SQL injection in string',
      input: { query: "'; DROP TABLE users--" },
      shouldFail: true   // Should fail validation
    },
    {
      name: 'Path traversal',
      input: { file: '../../etc/passwd' },
      shouldFail: true
    },
    {
      name: 'Command injection',
      input: { cmd: 'ls; rm -rf /' },
      shouldFail: true
    },
    {
      name: 'Extremely long string',
      input: { text: 'a'.repeat(1000000) },
      shouldFail: true
    }
  ];

  securityTestCases.forEach(testCase => {
    it(`should handle: ${testCase.name}`, () => {
      const schema = {
        type: 'object',
        properties: {
          [Object.keys(testCase.input)[0]]: {
            type: 'string',
            maxLength: 1000
          }
        }
      };

      const result = validator.validate(testCase.input, schema, {
        sanitize: true,
        strict: true
      });

      if (testCase.shouldFail) {
        expect(result.valid).toBe(false);
      } else {
        expect(result.valid).toBe(true);
        if (testCase.sanitized) {
          expect(result.sanitized).toEqual(testCase.sanitized);
        }
      }
    });
  });
});
```

---

### 3. Basic Security & Access Control

#### Specification

**Purpose**: Implement foundational security features including access control, audit logging, and basic sandboxing.

**Components**:
1. **AccessControl**: Permission checking and enforcement
2. **SecurityLogger**: Audit log for security events
3. **BasicSandbox**: Sandboxed execution for inline handlers

#### Interface Definitions

```typescript
interface AccessControl {
  checkPermissions(
    caller: CallerInfo,
    tool: ToolDefinition
  ): PermissionCheckResult;

  checkRateLimit(
    caller: CallerInfo,
    tool: ToolDefinition
  ): RateLimitCheckResult;

  checkIPRestrictions(
    ipAddress: string,
    tool: ToolDefinition
  ): boolean;

  checkTimeRestrictions(
    tool: ToolDefinition
  ): boolean;
}

interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions: string[];
  missingPermissions: string[];
}

interface RateLimitCheckResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

// Security logger
interface SecurityLogger {
  logSecurityEvent(event: SecurityEvent): Promise<void>;
  logAccessDenied(caller: CallerInfo, tool: string, reason: string): Promise<void>;
  logToolExecution(context: ExecutionContext): Promise<void>;
  logSuspiciousActivity(details: SuspiciousActivity): Promise<void>;

  queryEvents(criteria: SecurityQueryCriteria): Promise<SecurityEvent[]>;
}

interface SecurityEvent {
  id: string;
  timestamp: number;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  caller: CallerInfo;
  tool?: string;
  action: string;
  outcome: 'success' | 'failure' | 'blocked';
  reason?: string;
  metadata: Record<string, any>;
}

enum SecurityEventType {
  TOOL_EXECUTION = 'tool_execution',
  ACCESS_DENIED = 'access_denied',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  VALIDATION_FAILED = 'validation_failed',
  HANDLER_ERROR = 'handler_error'
}

interface SuspiciousActivity {
  caller: CallerInfo;
  pattern: string;  // What pattern was detected
  confidence: number;  // 0-1
  indicators: string[];  // What made it suspicious
}

// Sandbox
interface BasicSandbox {
  execute(
    code: string,
    input: Record<string, any>,
    context: ExecutionContext,
    options?: SandboxOptions
  ): Promise<any>;
}

interface SandboxOptions {
  timeout?: number;
  memoryLimit?: number;
  allowedModules?: string[];
  allowNetwork?: boolean;
  allowFilesystem?: boolean;
}

// Extended tool definition
interface ToolDefinition {
  // ... existing fields
  access?: AccessControl Config;
}

interface AccessControlConfig {
  enabled?: boolean;
  permissions?: string[];
  rateLimiting?: RateLimitConfig;
  ipRestrictions?: IPRestrictions;
  timeRestrictions?: TimeRestrictions;
}

interface RateLimitConfig {
  maxCalls: number;
  windowMs: number;
  strategy: 'reject' | 'queue' | 'throttle';
}

interface IPRestrictions {
  allow?: string[];  // CIDR notation
  deny?: string[];
}

interface TimeRestrictions {
  allow?: string[];  // Cron expressions
  deny?: string[];
  timezone?: string;
}
```

#### Integration Points

**Pre-execution security checks:**
```typescript
const executeToolWithSecurity = async (
  tool: ToolDefinition,
  input: any,
  context: ExecutionContext
) => {
  // Check permissions
  const permCheck = accessControl.checkPermissions(context.caller, tool);
  if (!permCheck.allowed) {
    await securityLogger.logAccessDenied(
      context.caller,
      tool.name,
      permCheck.reason || 'Insufficient permissions'
    );
    throw new PermissionError(permCheck.reason);
  }

  // Check rate limit
  const rateCheck = accessControl.checkRateLimit(context.caller, tool);
  if (!rateCheck.allowed) {
    await securityLogger.logSecurityEvent({
      id: randomUUID(),
      timestamp: Date.now(),
      type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      severity: 'medium',
      caller: context.caller,
      tool: tool.name,
      action: 'execute',
      outcome: 'blocked',
      metadata: { limit: rateCheck.limit, resetAt: rateCheck.resetAt }
    });
    throw new RateLimitError(rateCheck);
  }

  // Check IP restrictions
  if (context.caller.ipAddress) {
    const ipAllowed = accessControl.checkIPRestrictions(
      context.caller.ipAddress,
      tool
    );
    if (!ipAllowed) {
      await securityLogger.logAccessDenied(
        context.caller,
        tool.name,
        'IP address not allowed'
      );
      throw new PermissionError('IP address not allowed');
    }
  }

  // Log execution
  await securityLogger.logToolExecution(context);

  // Execute with sandbox if inline handler
  if (tool.handler.type === 'inline') {
    return await sandbox.execute(
      tool.handler.code,
      input,
      context,
      {
        timeout: tool.performance?.timeout || 30000,
        allowedModules: ['crypto', 'buffer'],
        allowNetwork: false,
        allowFilesystem: false
      }
    );
  }

  // Regular execution for other handlers
  return await handlerExecutor.execute(tool.handler, input, context);
};
```

**Sandbox implementation (using vm2):**
```typescript
import { VM, VMScript } from 'vm2';

class VM2Sandbox implements BasicSandbox {
  async execute(
    code: string,
    input: Record<string, any>,
    context: ExecutionContext,
    options: SandboxOptions = {}
  ): Promise<any> {
    const vm = new VM({
      timeout: options.timeout || 30000,
      sandbox: {
        input,
        context: {
          tool: context.tool,
          executionId: context.executionId,
          logger: context.logger,
          // Don't expose full context - only safe parts
        },
        require: (module: string) => {
          if (!options.allowedModules?.includes(module)) {
            throw new Error(`Module not allowed: ${module}`);
          }
          return require(module);
        }
      },
      eval: false,
      wasm: false,
      fixAsync Await: true
    });

    try {
      const script = new VMScript(`
        (async () => {
          const handler = ${code};
          return await handler(input, context);
        })()
      `);

      const result = await vm.run(script);
      return result;
    } catch (error) {
      // Log sandbox violation if applicable
      if (error.message.includes('not allowed')) {
        await context.logger.error('Sandbox violation', {
          code: code.substring(0, 100),
          error: error.message
        });
      }
      throw error;
    }
  }
}
```

#### Testing Approach

**Unit Tests:**
```typescript
describe('AccessControl', () => {
  it('should allow with correct permissions', () => {
    const caller: CallerInfo = {
      id: 'user1',
      type: 'user',
      permissions: ['tool:execute', 'data:read']
    };

    const tool: ToolDefinition = {
      name: 'test-tool',
      access: {
        permissions: ['tool:execute']
      }
    };

    const result = accessControl.checkPermissions(caller, tool);
    expect(result.allowed).toBe(true);
  });

  it('should deny without permissions', () => {
    const caller: CallerInfo = {
      id: 'user1',
      type: 'user',
      permissions: ['data:read']
    };

    const tool: ToolDefinition = {
      name: 'test-tool',
      access: {
        permissions: ['tool:execute', 'admin:access']
      }
    };

    const result = accessControl.checkPermissions(caller, tool);
    expect(result.allowed).toBe(false);
    expect(result.missingPermissions).toContain('tool:execute');
  });

  it('should enforce rate limits', async () => {
    const caller: CallerInfo = { id: 'user1', type: 'user', permissions: [] };
    const tool: ToolDefinition = {
      name: 'test-tool',
      access: {
        rateLimiting: {
          maxCalls: 2,
          windowMs: 1000,
          strategy: 'reject'
        }
      }
    };

    // First two calls should succeed
    expect(accessControl.checkRateLimit(caller, tool).allowed).toBe(true);
    expect(accessControl.checkRateLimit(caller, tool).allowed).toBe(true);

    // Third call should fail
    expect(accessControl.checkRateLimit(caller, tool).allowed).toBe(false);

    // Wait for window to reset
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Should succeed again
    expect(accessControl.checkRateLimit(caller, tool).allowed).toBe(true);
  });
});

describe('BasicSandbox', () => {
  it('should execute safe code', async () => {
    const code = 'async ({a, b}) => ({ sum: a + b })';
    const result = await sandbox.execute(code, { a: 2, b: 3 }, context);
    expect(result.sum).toBe(5);
  });

  it('should block disallowed modules', async () => {
    const code = 'async () => { const fs = require("fs"); return fs.readFileSync("/etc/passwd"); }';
    await expect(
      sandbox.execute(code, {}, context, { allowedModules: [] })
    ).rejects.toThrow('Module not allowed: fs');
  });

  it('should enforce timeout', async () => {
    const code = 'async () => { while(true) {} }';
    await expect(
      sandbox.execute(code, {}, context, { timeout: 100 })
    ).rejects.toThrow('timeout');
  });

  it('should prevent dangerous patterns', async () => {
    const dangerousCodes = [
      'async () => { process.exit(1); }',
      'async () => { eval("malicious code"); }',
      'async () => { Function("malicious")(); }'
    ];

    for (const code of dangerousCodes) {
      await expect(
        sandbox.execute(code, {}, context)
      ).rejects.toThrow();
    }
  });
});

describe('SecurityLogger', () => {
  it('should log security events', async () => {
    const event: SecurityEvent = {
      id: randomUUID(),
      timestamp: Date.now(),
      type: SecurityEventType.ACCESS_DENIED,
      severity: 'high',
      caller: { id: 'user1', type: 'user', permissions: [] },
      tool: 'admin-tool',
      action: 'execute',
      outcome: 'blocked',
      metadata: {}
    };

    await securityLogger.logSecurityEvent(event);

    const events = await securityLogger.queryEvents({
      type: SecurityEventType.ACCESS_DENIED
    });

    expect(events).toContainEqual(expect.objectContaining({
      id: event.id,
      type: SecurityEventType.ACCESS_DENIED
    }));
  });
});
```

**Security Penetration Tests:**
```typescript
describe('Security - Penetration Tests', () => {
  it('should prevent code injection via input', async () => {
    const tool: ToolDefinition = {
      name: 'echo',
      handler: {
        type: 'inline',
        code: 'async ({message}) => ({ echo: message })'
      }
    };

    const maliciousInputs = [
      { message: '"; process.exit(1); //' },
      { message: '${require("child_process").exec("rm -rf /")}' },
      { message: '`${global.process.exit(1)}`' }
    ];

    for (const input of maliciousInputs) {
      // Should not crash the server
      const result = await executeToolWithSecurity(tool, input, context);
      expect(result).toBeDefined();
      expect(process.pid).toBeDefined(); // Process still alive
    }
  });

  it('should prevent privilege escalation', async () => {
    const lowPrivCaller: CallerInfo = {
      id: 'user1',
      type: 'user',
      permissions: ['tool:basic']
    };

    const adminTool: ToolDefinition = {
      name: 'admin-action',
      access: {
        permissions: ['admin:access']
      }
    };

    await expect(
      executeToolWithSecurity(adminTool, {}, { ...context, caller: lowPrivCaller })
    ).rejects.toThrow(PermissionError);
  });
});
```

---

## Risk Assessment

### Security Risks

#### 1. Sandboxing Escape (Critical)
**Risk**: Attacker escapes sandbox and executes arbitrary code on host
**Likelihood**: Medium
**Impact**: Critical
**Mitigation**:
- Use battle-tested sandboxing (vm2 initially, isolated-vm later)
- Static code analysis before execution
- Strict allowlist for modules and APIs
- Regular security audits
- Fuzz testing with malicious code
- Consider running handlers in separate processes (Phase 3)

#### 2. Code Injection (High)
**Risk**: User input injected into handler code or templates
**Likelihood**: High
**Impact**: Critical
**Mitigation**:
- Strict input validation and sanitization
- Parameterized queries/templates (no string concatenation)
- Template engines with auto-escaping
- Content Security Policy for any UI
- Regular penetration testing

#### 3. Secrets Exposure (High)
**Risk**: Secrets (API keys, passwords) leaked in logs or errors
**Likelihood**: Medium
**Impact**: High
**Mitigation**:
- Secret redaction in logs and error messages
- Use environment variables or secret vaults
- Audit all error messages for sensitive data
- Implement secret scanning in CI/CD
- Encrypt secrets at rest

#### 4. Denial of Service (Medium)
**Risk**: Malicious or buggy handlers consume excessive resources
**Likelihood**: High
**Impact**: Medium
**Mitigation**:
- Strict timeouts on all operations
- Memory limits per handler
- Rate limiting per caller
- Circuit breakers for failing tools
- Resource monitoring and alerting

#### 5. Authentication Bypass (High)
**Risk**: Attacker bypasses authentication or session management
**Likelihood**: Low
**Impact**: Critical
**Mitigation**:
- Secure session management (HTTP-only, secure cookies)
- API key validation on every request
- Session timeout and rotation
- IP allowlisting for sensitive operations
- Multi-factor authentication (Phase 3)

### Performance Risks

#### 1. Memory Leaks (High)
**Risk**: Long-running server accumulates memory, eventually crashes
**Likelihood**: Medium
**Impact**: High
**Mitigation**:
- Regular garbage collection monitoring
- Cache size limits with LRU eviction
- Handler cleanup after execution
- Memory profiling in development
- Automated memory leak detection
- Process restart on memory threshold

#### 2. Blocking Operations (Medium)
**Risk**: Synchronous operations block event loop
**Likelihood**: Medium
**Impact**: Medium
**Mitigation**:
- Always use async/await
- Timeout all operations
- Worker threads for CPU-intensive tasks
- Event loop lag monitoring
- Identify and refactor blocking code

#### 3. Cache Stampede (Medium)
**Risk**: Many requests for expired cache item overwhelm backend
**Likelihood**: Low
**Impact**: Medium
**Mitigation**:
- Request coalescing (deduplicate concurrent requests)
- Stale-while-revalidate pattern
- Probabilistic early expiration
- Circuit breaker for backend failures

#### 4. N+1 Query Problem (Low)
**Risk**: Tools calling other tools create cascading requests
**Likelihood**: Low
**Impact**: Low
**Mitigation**:
- Tool call depth limit
- Execution graph analysis
- Batch tool calling API (Phase 3)
- Caching intermediate results

### Complexity Risks

#### 1. Over-Engineering (High)
**Risk**: Framework becomes too complex, hard to maintain
**Likelihood**: High
**Impact**: Medium
**Mitigation**:
- Stick to phased implementation plan
- YAGNI principle (You Aren't Gonna Need It)
- Code reviews focusing on simplicity
- Refactor to simplify before adding features
- Comprehensive documentation

#### 2. Breaking Changes (Medium)
**Risk**: Updates break existing tool configurations
**Likelihood**: Medium
**Impact**: High
**Mitigation**:
- Semantic versioning
- Deprecation warnings before removal
- Migration guides for breaking changes
- Backward compatibility layer (Phase 2)
- Automated migration tools

#### 3. Plugin System Complexity (High)
**Risk**: Plugin system too complex, no one uses it
**Likelihood**: Medium
**Impact**: Medium
**Mitigation**:
- Start simple, iterate based on feedback
- Extensive examples and documentation
- Plugin generator/scaffolding tool
- Active community support

#### 4. Configuration Explosion (Medium)
**Risk**: Too many config options, users overwhelmed
**Likelihood**: High
**Impact**: Low
**Mitigation**:
- Sensible defaults for everything
- Progressive disclosure (simple → advanced)
- Configuration validation with helpful errors
- Configuration presets for common scenarios
- Interactive configuration wizard

### Mitigation Strategy Summary

#### Defense in Depth
1. **Layer 1**: Input validation and sanitization
2. **Layer 2**: Access control and rate limiting
3. **Layer 3**: Sandboxed execution
4. **Layer 4**: Resource limits and timeouts
5. **Layer 5**: Monitoring and alerting
6. **Layer 6**: Audit logging and forensics

#### Continuous Improvement
- **Weekly**: Security review of new code
- **Monthly**: Dependency vulnerability scans
- **Quarterly**: Penetration testing
- **Yearly**: Third-party security audit

#### Incident Response Plan
1. **Detection**: Monitoring alerts trigger
2. **Containment**: Suspend affected tools/sessions
3. **Investigation**: Analyze audit logs
4. **Remediation**: Fix vulnerability
5. **Communication**: Notify affected users
6. **Post-mortem**: Document lessons learned

---

## Success Metrics

### Phase 1 Success Criteria
- [ ] All tools execute real logic (not echo)
- [ ] Input validation prevents 100% of test injection attacks
- [ ] Security audit log captures all execution events
- [ ] Configuration validation prevents 100% of invalid configs
- [ ] Unit test coverage >80%

### Phase 2 Success Criteria
- [ ] Cache hit rate >60% for common queries
- [ ] 95th percentile latency <200ms
- [ ] Tool execution success rate >99%
- [ ] Zero downtime deployments
- [ ] Integration test coverage >70%

### Phase 3 Success Criteria
- [ ] Plugin system has >3 community plugins
- [ ] Hot reload works without dropped requests
- [ ] Advanced security passes penetration test
- [ ] Monitoring dashboard operational
- [ ] E2E test coverage >60%

---

## Next Steps

### Immediate Actions (This Week)
1. **Review and approve this plan** with stakeholders
2. **Set up development environment** with all dependencies
3. **Create project board** with Phase 1 tasks
4. **Begin Phase 1.1**: Implement HandlerResolver

### Week 1 Tasks
- Implement `/mcp/core/HandlerResolver.ts`
- Implement `/mcp/core/HandlerExecutor.ts`
- Implement `/mcp/handlers/InlineHandler.ts`
- Write unit tests for above
- Update `/mcp/configurableServer.ts` to use new system

### Week 2 Tasks
- Implement `/mcp/validation/InputValidator.ts`
- Implement `/mcp/validation/Sanitizer.ts`
- Implement `/mcp/security/AccessControl.ts`
- Write security tests

### Week 3 Tasks
- Implement `/mcp/handlers/FileHandler.ts`
- Implement `/mcp/config/ConfigSchema.ts`
- Create example configurations
- Integration testing
- Phase 1 demo and review

### Communication Plan
- **Weekly**: Team standup on progress
- **Bi-weekly**: Demo to stakeholders
- **Monthly**: Architecture review
- **Ad-hoc**: Slack updates for blockers

---

## Appendix

### Glossary
- **Handler**: Function that executes tool logic
- **Sandbox**: Isolated execution environment
- **Lifecycle**: States a tool goes through (loading, active, etc.)
- **Plugin**: External code that extends framework
- **Transport**: Communication layer (HTTP/SSE)

### References
- MCP Specification: https://spec.modelcontextprotocol.io/
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- vm2 Documentation: https://github.com/patriksimek/vm2
- AJV JSON Schema: https://ajv.js.org/

### Change Log
- **2025-09-29**: Initial version 1.0

---

**End of Implementation Plan**