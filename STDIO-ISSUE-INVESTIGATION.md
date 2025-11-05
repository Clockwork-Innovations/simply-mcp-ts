# Stdio Transport Timeout Analysis

**Date**: November 5, 2025
**Version**: 4.0.0
**Status**: Investigation Complete
**Severity**: Low - No critical issues identified

---

## Executive Summary

This document analyzes the timeout handling mechanisms in the Simply MCP TypeScript framework's stdio transport implementation. The investigation focused on identifying potential timeout-related issues, configuration inconsistencies, and areas for improvement.

### Key Findings

✅ **No Critical Issues**: The stdio transport implementation follows proper timeout patterns
⚠️ **Configuration Inconsistency**: Different timeout defaults across layers (5s handler, 30s UI, undefined batch)
✅ **Proper Error Handling**: Timeout errors are properly caught and wrapped with context
⚠️ **Limited Configurability**: Stdio transport timeout cannot be configured independently

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Timeout Configuration Analysis](#timeout-configuration-analysis)
3. [Code Review Findings](#code-review-findings)
4. [Potential Issues](#potential-issues)
5. [Recommendations](#recommendations)
6. [Test Coverage](#test-coverage)
7. [Related Files](#related-files)

---

## Architecture Overview

### Timeout Layers in Simply MCP

The framework implements timeouts at multiple layers:

```
┌─────────────────────────────────────────────┐
│  stdio Transport (MCP SDK)                  │
│  Timeout: Managed by SDK (no config)        │
└─────────────┬───────────────────────────────┘
              │
┌─────────────▼───────────────────────────────┐
│  stdio Server Wrapper                       │
│  Batch Timeout: 1000ms (hardcoded)          │
│  File: src/server/builder-server.ts:579     │
└─────────────┬───────────────────────────────┘
              │
┌─────────────▼───────────────────────────────┐
│  Handler Manager                            │
│  Default Timeout: 5000ms                    │
│  File: src/core/HandlerManager.ts:51        │
└─────────────┬───────────────────────────────┘
              │
┌─────────────▼───────────────────────────────┐
│  Handler Resolvers                          │
│  - InlineHandlerResolver: inherits 5000ms   │
│  - HttpHandlerResolver: inherits 5000ms     │
│  - FileHandlerResolver: no timeout          │
│  - RegistryHandlerResolver: no timeout      │
└─────────────────────────────────────────────┘
```

### stdio Server Implementation

**File**: `tests/fixtures/servers/stdioServer.ts`

The stdio server uses the MCP SDK's `StdioServerTransport` which:
- Reads JSON-RPC requests from stdin
- Writes responses to stdout
- Delegates timeout handling to the HandlerManager

```typescript
// tests/fixtures/servers/stdioServer.ts:152-156
const handlerManager = new HandlerManager({
  basePath: process.cwd(),
  defaultTimeout: 5000,  // 5 second default
});
```

---

## Timeout Configuration Analysis

### 1. Handler Manager Timeout (Primary)

**Location**: `src/core/HandlerManager.ts:51`

```typescript
this.defaultTimeout = options.defaultTimeout || 5000;
```

**Characteristics**:
- ✅ Configurable via constructor options
- ✅ Applies to all handler types (inline, http)
- ✅ Can be overridden per-execution via `HandlerExecutionOptions`
- ✅ Properly enforced using `Promise.race()`

**Enforcement** (`src/core/HandlerManager.ts:149-180`):
```typescript
private async executeWithTimeout(
  handler: ToolHandler,
  args: Record<string, unknown>,
  context: HandlerContext,
  timeout: number,
  abortSignal?: AbortSignal
): Promise<HandlerResult> {
  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        new HandlerTimeoutError(
          `Handler execution exceeded timeout of ${timeout}ms`,
          { timeout }
        )
      );
    }, timeout);

    // Clear timeout if aborted
    abortSignal?.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      reject(new HandlerTimeoutError('Execution aborted', { timeout }));
    });
  });

  // Race between handler execution and timeout
  return Promise.race([handler(args, context), timeoutPromise]);
}
```

**Error Handling**:
- ✅ Throws `HandlerTimeoutError` with context
- ✅ Not retryable (correctly identified in `isRetryableError()`)
- ✅ Properly wrapped with session context

### 2. Batch Collection Timeout (stdio Specific)

**Location**: `src/server/builder-server.ts:575-596`

```typescript
timer: setTimeout(() => {
  // Timeout: send partial responses if not all collected
  if (batchResponses.has(batchId)) {
    const partial = batchResponses.get(batchId)!;
    console.error(
      `[wrapStdioTransportForBatch] Batch ${batchId} collection timeout, ` +
      `sending partial responses`
    );

    // Filter out undefined responses
    const validResponses = partial.responses.filter(r => r !== undefined);
    if (validResponses.length > 0) {
      originalSend(validResponses).catch((err) => {
        console.error('[wrapStdioTransportForBatch] Error sending partial batch:', err);
      });
    }

    // Cleanup
    batchResponses.delete(batchId);
  }
}, 1000) // 1 second timeout - HARDCODED!
```

**Issues Identified**:
⚠️ **Hardcoded timeout**: 1000ms cannot be configured
⚠️ **Silent failure**: Logs to stderr but doesn't throw
⚠️ **Short duration**: 1s may be too short for slow handlers
⚠️ **No relationship to handler timeout**: Independent of the 5s handler timeout

### 3. UI Adapter Timeout

**Location**: `src/adapters/ui-adapter.ts:835-838`

```typescript
// Set 30 second timeout
const timeout = setTimeout(function() {
  pendingRequests.delete(requestId);
  reject(new Error('Tool call timed out after 30 seconds'));
}, 30000);
```

**Characteristics**:
- ⚠️ Hardcoded 30 second timeout
- ⚠️ Inconsistent with handler timeout (5s vs 30s)
- ✅ Properly cleans up pending requests
- ✅ Rejects promise with clear error message

### 4. Script Validation Timeout

**Location**: `scripts/validate-examples.ts:28,48`

```typescript
const TIMEOUT_MS = 30000; // 30 seconds per example

execSync(command, {
  stdio: 'pipe',
  timeout: TIMEOUT_MS,
  encoding: 'utf-8'
});
```

**Characteristics**:
- ✅ Reasonable 30s timeout for example validation
- ✅ Configurable via constant
- ✅ Appropriate for stdio subprocess execution

---

## Code Review Findings

### Positive Findings ✅

1. **Robust Timeout Enforcement**
   - Uses `Promise.race()` pattern correctly
   - Proper cleanup with `clearTimeout()`
   - AbortSignal support for cancellation

2. **Clear Error Messages**
   - Timeout errors include context (timeout value, session ID)
   - Distinct error type (`HandlerTimeoutError`)
   - Stack traces preserved

3. **Graceful Degradation**
   - Batch timeout sends partial responses instead of failing
   - UI adapter cleans up pending requests on timeout
   - No resource leaks identified

4. **Type Safety**
   - Timeout types properly defined in interfaces
   - Optional timeout fields where appropriate
   - Strong typing throughout execution chain

### Areas for Improvement ⚠️

1. **Timeout Configuration Inconsistency**
   ```
   Handler Manager:    5,000ms (configurable)
   Batch Collection:   1,000ms (hardcoded)
   UI Adapter:        30,000ms (hardcoded)
   Script Validation: 30,000ms (constant)
   ```

2. **No stdio Transport Timeout**
   - Relies entirely on MCP SDK implementation
   - No way to configure socket/stream timeouts
   - Cannot detect hung connections

3. **Batch Timeout Too Short**
   - 1s batch collection may timeout before handlers complete
   - Handler has 5s but batch only waits 1s
   - Creates inconsistent behavior

4. **Limited Observability**
   - Timeout errors logged to stderr
   - No metrics or monitoring hooks
   - Difficult to diagnose timeout patterns

---

## Potential Issues

### Issue 1: Batch Collection Timeout Race Condition

**Severity**: Medium
**Likelihood**: Low
**File**: `src/server/builder-server.ts:575`

**Problem**:
When processing batch requests over stdio, the batch response collector has a hardcoded 1-second timeout. However, individual handlers have a 5-second timeout. This creates a race condition:

```
Time 0ms:    Batch request received (3 tools)
Time 0ms:    Tool 1 starts execution (5s timeout)
Time 50ms:   Tool 2 starts execution (5s timeout)
Time 100ms:  Tool 3 starts execution (5s timeout)
Time 1000ms: ❌ Batch collector times out, sends partial response
Time 1200ms: ✅ Tool 1 completes (but response already sent)
```

**Impact**:
- Partial responses sent prematurely
- Completed handler results lost
- Confusing client-side behavior

**Reproduction**:
```typescript
// Test case that would expose this issue
const slowHandler = async () => {
  await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
  return { content: [{ type: 'text', text: 'Success' }] };
};

// Batch request with 3 slow tools
// Batch timeout (1s) < handler execution (2s)
// Result: Partial response sent before handlers complete
```

**Recommendation**:
Set batch timeout to `max(handlerTimeout * batchSize, 10000)` or make it configurable.

### Issue 2: No stdio Connection Timeout

**Severity**: Low
**Likelihood**: Low
**File**: `tests/fixtures/servers/stdioServer.ts`

**Problem**:
The stdio transport has no mechanism to detect hung or stalled connections. If a client stops reading from stdout or writing to stdin, the server may hang indefinitely.

**Scenarios**:
1. Client process crashes without closing pipes
2. Network issues in proxied stdio connections
3. Debugger breakpoints freezing the client

**Impact**:
- Server resources not released
- No automatic recovery
- Difficult to detect in production

**Recommendation**:
Implement heartbeat mechanism or connection timeout in the transport layer.

### Issue 3: Timeout Configuration Not Exposed

**Severity**: Low
**Likelihood**: High
**File**: `tests/fixtures/servers/stdioServer.ts:152-156`

**Problem**:
The stdio server hardcodes the handler timeout to 5 seconds. There's no way for users to configure this via command-line arguments or configuration files.

**Current Code**:
```typescript
const handlerManager = new HandlerManager({
  basePath: process.cwd(),
  defaultTimeout: 5000, // ❌ Hardcoded
});
```

**Desired Configuration**:
```json
{
  "name": "my-server",
  "version": "1.0.0",
  "timeout": {
    "handler": 10000,
    "batch": 5000
  },
  "tools": [...]
}
```

**Recommendation**:
Add timeout configuration to `ServerConfig` type and pass through to HandlerManager.

---

## Recommendations

### Priority 1: Fix Batch Timeout Race Condition

**Action**: Make batch collection timeout configurable and increase default

**File**: `src/server/builder-server.ts`

**Changes**:
```typescript
// Add to server configuration
interface BatchOptions {
  collectionTimeout?: number; // Default: handlerTimeout * 2
}

// Update wrapStdioTransportForBatch
function wrapStdioTransportForBatch(
  transport: StdioServerTransport,
  handlerTimeout: number,
  batchOptions: BatchOptions = {}
): StdioServerTransport {
  const collectionTimeout = batchOptions.collectionTimeout ?? (handlerTimeout * 2);

  // Use collectionTimeout instead of hardcoded 1000
  timer: setTimeout(() => {
    // ... existing logic
  }, collectionTimeout)
}
```

**Impact**: Prevents premature partial responses, improves reliability

### Priority 2: Expose Timeout Configuration

**Action**: Add timeout settings to configuration file format

**Files**:
- `src/types/config.ts`
- `src/types.ts`
- `tests/fixtures/servers/stdioServer.ts`

**Changes**:
```typescript
// src/types/config.ts
export interface ServerConfig {
  name: string;
  version: string;

  // Add timeout configuration
  timeout?: {
    handler?: number;      // Default: 5000
    batch?: number;        // Default: handler * 2
    connection?: number;   // Default: undefined (no timeout)
  };

  tools?: ToolConfig[];
  prompts?: PromptConfig[];
  resources?: ResourceConfig[];
}

// tests/fixtures/servers/stdioServer.ts
const handlerManager = new HandlerManager({
  basePath: process.cwd(),
  defaultTimeout: config.timeout?.handler || 5000,
});
```

**Impact**: Allows users to tune timeouts for their workloads

### Priority 3: Align Timeout Values

**Action**: Create consistent timeout hierarchy

**Proposed Values**:
```typescript
const TIMEOUT_DEFAULTS = {
  handler: 5000,           // Base unit
  batch: 10000,            // 2x handler (accounts for sequential execution)
  ui: 30000,               // 6x handler (accounts for user interaction)
  connection: undefined,   // No timeout (relies on OS)
  validation: 30000,       // For script validation
};
```

**Files to Update**:
- `src/core/HandlerManager.ts` (handler timeout)
- `src/server/builder-server.ts` (batch timeout)
- `src/adapters/ui-adapter.ts` (UI timeout)
- `scripts/validate-examples.ts` (already aligned)

**Impact**: Predictable behavior, easier troubleshooting

### Priority 4: Add Timeout Observability

**Action**: Add timeout metrics and events

**Files**:
- `src/core/HandlerManager.ts`
- `src/server/builder-server.ts`

**Changes**:
```typescript
// Add timeout event emitter
class TimeoutMonitor extends EventEmitter {
  recordTimeout(type: 'handler' | 'batch' | 'connection', context: any) {
    this.emit('timeout', { type, context, timestamp: Date.now() });
  }
}

// In HandlerManager
this.timeoutMonitor.recordTimeout('handler', {
  sessionId: context.sessionId,
  timeout,
  elapsedMs: Date.now() - startTime,
});
```

**Impact**: Better visibility into timeout patterns, easier debugging

---

## Test Coverage

### Existing Tests

#### Handler Timeout Tests

**File**: `tests/unit/batch-processing/foundation.test.ts`

```typescript
// Line 967: Sequential batch with timeout
await processBatch(messages, 'timeout-batch', mockHandler, {
  parallel: false,
  timeout: 30 // Timeout after 30ms
});

// Line 1058: Parallel batch with timeout
await processBatch(messages, 'parallel-timeout-batch', mockHandler, {
  parallel: true,
  timeout: 50 // Timeout after 50ms
});

// Line 1139: Batch without timeout
await processBatch(messages, 'no-timeout-batch', mockHandler, {
  parallel: false,
  timeout: undefined // No timeout
});
```

**Coverage**: ✅ Good
- Sequential timeouts tested
- Parallel timeouts tested
- No-timeout scenarios tested
- Timeout behavior validated

#### stdio Client Tests

**File**: `tests/test-stdio-client.ts`

```typescript
// Tests 13 different scenarios
// ❌ No timeout-specific tests
// ❌ No long-running handler tests
// ❌ No batch timeout tests
```

**Coverage**: ⚠️ Limited
- Basic tool calls tested
- Validation errors tested
- **Missing**: Timeout scenarios
- **Missing**: Long-running operations
- **Missing**: Batch collection timeout

### Recommended Test Additions

#### Test 1: Handler Timeout Enforcement

```typescript
// tests/unit/handler-timeout.test.ts
describe('Handler Timeout', () => {
  it('should timeout handler exceeding limit', async () => {
    const slowHandler = async () => {
      await new Promise(resolve => setTimeout(resolve, 10000));
      return { content: [{ type: 'text', text: 'Too slow' }] };
    };

    const manager = new HandlerManager({ defaultTimeout: 100 });

    await expect(
      manager.executeHandler(slowHandler, {}, { logger: mockLogger })
    ).rejects.toThrow(HandlerTimeoutError);
  });
});
```

#### Test 2: Batch Collection Timeout

```typescript
// tests/integration/stdio-batch-timeout.test.ts
describe('stdio Batch Timeout', () => {
  it('should send partial response when collection times out', async () => {
    // Create batch request with 3 tools
    // Tool 1: completes in 100ms
    // Tool 2: completes in 500ms
    // Tool 3: completes in 2000ms
    // Batch timeout: 1000ms

    // Expect: Response with tools 1 and 2, tool 3 missing
  });
});
```

#### Test 3: Timeout Configuration

```typescript
// tests/unit/timeout-config.test.ts
describe('Timeout Configuration', () => {
  it('should respect custom handler timeout from config', async () => {
    const config = {
      name: 'test',
      version: '1.0.0',
      timeout: { handler: 10000 },
      tools: [/* ... */]
    };

    // Verify handlerManager uses 10000ms timeout
  });
});
```

---

## Related Files

### Core Implementation

| File | Purpose | Timeout Role |
|------|---------|--------------|
| `src/core/HandlerManager.ts:51` | Handler execution | Primary timeout enforcement (5s) |
| `src/core/HandlerManager.ts:149-180` | Timeout enforcement | `executeWithTimeout()` implementation |
| `src/core/HandlerManager.ts:185-196` | Error handling | Identifies non-retryable timeouts |
| `src/core/errors.ts` | Error types | `HandlerTimeoutError` definition |

### stdio Transport

| File | Purpose | Timeout Role |
|------|---------|--------------|
| `tests/fixtures/servers/stdioServer.ts:152-156` | stdio server | Sets handler timeout (5s) |
| `src/server/builder-server.ts:575-596` | Batch handling | Batch collection timeout (1s) |

### Handler Resolvers

| File | Purpose | Timeout Role |
|------|---------|--------------|
| `src/handlers/InlineHandlerResolver.ts` | Inline code | Inherits default timeout |
| `src/handlers/HttpHandlerResolver.ts:26` | HTTP requests | Custom timeout per request |
| `src/handlers/FileHandlerResolver.ts` | File modules | No timeout (synchronous) |
| `src/handlers/RegistryHandlerResolver.ts` | Registry lookup | No timeout (synchronous) |

### UI and Adapters

| File | Purpose | Timeout Role |
|------|---------|--------------|
| `src/adapters/ui-adapter.ts:835-838` | UI tool calls | 30s timeout |
| `src/adapters/ui-adapter.ts:802,939` | Cleanup | Clears timeouts on events |

### Tests

| File | Purpose | Coverage |
|------|---------|----------|
| `tests/unit/batch-processing/foundation.test.ts:967` | Batch timeouts | ✅ Good |
| `tests/test-stdio-client.ts` | stdio client | ⚠️ No timeout tests |

### Configuration

| File | Purpose | Timeout Fields |
|------|---------|----------------|
| `src/types/config.ts` | Config schema | ❌ No timeout fields |
| `src/types/handler.ts:18,38,91,374` | Handler types | ✅ Timeout optional fields |

---

## Conclusion

### Summary of Findings

The Simply MCP stdio transport implementation demonstrates **solid timeout handling** with proper error management and cleanup. However, several **configuration inconsistencies** and a **batch collection race condition** could impact reliability under load.

### Risk Assessment

**Overall Risk**: 🟡 Low-Medium

- **Critical Issues**: 0
- **Medium Issues**: 1 (batch timeout race condition)
- **Low Issues**: 3 (configuration, observability)
- **No Security Implications**: Timeouts are defensive measures

### Action Items

1. ✅ **Immediate**: Document current timeout behavior (this document)
2. 🔧 **Short-term** (Sprint 1):
   - Fix batch collection timeout race condition
   - Expose timeout configuration in config files
3. 🔧 **Medium-term** (Sprint 2):
   - Align timeout values across layers
   - Add timeout metrics and monitoring
4. 🔧 **Long-term** (Backlog):
   - Add connection-level timeout support
   - Implement adaptive timeout based on historical data
   - Add timeout configuration UI in MCP interpreter

### Next Steps

1. Review this analysis with the team
2. Prioritize recommendations based on user feedback
3. Create GitHub issues for each recommendation
4. Add timeout tests to test suite
5. Update documentation with timeout configuration options

---

## Appendix

### A. Timeout Calculation Examples

#### Example 1: Sequential Batch

```
Batch size: 3 tools
Handler timeout: 5000ms each
Batch collection timeout: 1000ms ❌ TOO SHORT!

Expected max time: 5000ms * 3 = 15000ms (sequential)
Recommended batch timeout: 15000ms
```

#### Example 2: Parallel Batch

```
Batch size: 3 tools
Handler timeout: 5000ms each
Batch collection timeout: 1000ms ❌ TOO SHORT!

Expected max time: 5000ms (parallel)
Recommended batch timeout: 5000ms
```

#### Example 3: Mixed Batch

```
Batch: 2 fast (100ms) + 1 slow (4000ms)
Handler timeout: 5000ms
Batch collection timeout: 1000ms ❌ RACE CONDITION!

At 1000ms: Collector times out, sends 2 responses
At 4100ms: Slow handler completes, response lost
```

### B. Timeout Error Handling Flow

```
┌─────────────────────────────────────────┐
│  Handler Execution Starts               │
└────────────┬────────────────────────────┘
             │
             ├─ Promise.race() ─────────────┐
             │                              │
    ┌────────▼─────────┐         ┌─────────▼────────┐
    │  Handler Promise │         │  Timeout Promise │
    │  (actual work)   │         │  (setTimeout)    │
    └────────┬─────────┘         └─────────┬────────┘
             │                              │
             │                              │
      ┌──────▼──────────┐            ┌─────▼──────────────┐
      │  Success        │            │  Timeout Exceeded  │
      │  Return Result  │            │  HandlerTimeout    │
      └──────┬──────────┘            │  Error             │
             │                       └─────┬──────────────┘
             │                             │
             │                       ┌─────▼──────────────┐
             │                       │  wrapError()       │
             │                       │  Add Context       │
             │                       └─────┬──────────────┘
             │                             │
             │                       ┌─────▼──────────────┐
             │                       │  Check Retryable?  │
             │                       │  NO (timeout)      │
             │                       └─────┬──────────────┘
             │                             │
             └─────────────────────────────▼───────────────┐
                                    │  Throw Error to     │
                                    │  Client             │
                                    └─────────────────────┘
```

### C. Configuration Schema Proposal

```typescript
/**
 * Timeout configuration for MCP server
 */
export interface TimeoutConfig {
  /**
   * Handler execution timeout in milliseconds
   * Default: 5000 (5 seconds)
   * Minimum: 100
   * Maximum: 300000 (5 minutes)
   */
  handler?: number;

  /**
   * Batch response collection timeout in milliseconds
   * Default: handler * 2 for sequential, handler for parallel
   * Minimum: handler
   * Maximum: 600000 (10 minutes)
   */
  batch?: number;

  /**
   * Connection/transport timeout in milliseconds
   * Default: undefined (no timeout)
   * When set, closes idle connections
   */
  connection?: number;

  /**
   * Strategy for handling timeouts
   * - 'fail': Throw error immediately (default)
   * - 'partial': Return partial results when possible
   * - 'retry': Automatically retry once
   */
  strategy?: 'fail' | 'partial' | 'retry';
}

/**
 * Add to ServerConfig
 */
export interface ServerConfig {
  // ... existing fields

  /**
   * Timeout configuration
   */
  timeout?: TimeoutConfig;
}
```

### D. Monitoring Metrics Proposal

```typescript
/**
 * Timeout metrics to track
 */
interface TimeoutMetrics {
  // Counters
  total_handler_timeouts: number;
  total_batch_timeouts: number;
  total_connection_timeouts: number;

  // Histograms
  handler_execution_duration_ms: number[];
  batch_collection_duration_ms: number[];

  // Gauges
  active_handlers: number;
  active_batches: number;

  // Recent timeouts
  recent_timeouts: Array<{
    type: 'handler' | 'batch' | 'connection';
    timestamp: number;
    context: Record<string, unknown>;
  }>;
}
```

---

**Document Version**: 1.0
**Last Updated**: November 5, 2025
**Author**: Claude (AI Assistant)
**Review Status**: Pending Team Review
