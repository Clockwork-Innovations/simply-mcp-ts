# Remote DOM Advanced Patterns

Advanced performance optimizations and security hardening features for the Remote DOM system in Simply-MCP.

## Table of Contents

- [Overview](#overview)
- [Lazy Loading](#lazy-loading)
- [CSP Validation](#csp-validation)
- [Operation Batching](#operation-batching)
- [Resource Limits](#resource-limits)
- [Integration Guide](#integration-guide)
- [Configuration Reference](#configuration-reference)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Overview

The Remote DOM system includes four advanced patterns designed to optimize performance and enhance security:

| Pattern | Purpose | Benefit |
|---------|---------|---------|
| **Lazy Loading** | Progressive component loading | 30%+ bundle size reduction |
| **CSP Validation** | XSS/injection prevention | Blocks unsafe code patterns |
| **Operation Batching** | Efficient rendering | 50%+ render cycle reduction, 60 FPS |
| **Resource Limits** | DoS prevention | Configurable safety limits |

These patterns are **automatically enabled** in Simply-MCP with sensible defaults. This guide explains how they work and how to customize them for your use case.

---

## Lazy Loading

### What is Lazy Loading?

Lazy loading splits the component library into two tiers:
- **Tier 1 (Core)**: 21 essential components loaded immediately (div, button, input, etc.)
- **Tier 2 (Extended)**: 52 advanced components loaded on first use (video, table, canvas, etc.)

This reduces initial bundle size by deferring non-critical components until they're actually needed.

### Why It Exists

**Problem**: Loading all 73 components at once increases initial bundle size and slows down startup.

**Solution**: Load core components immediately for fast initial render, then lazy-load extended components only when used.

**Performance Target**: ≥30% bundle size reduction (from 44 KB to ≤31 KB).

### Component Tiers

#### Tier 1: Core Components (Always Loaded)

Essential components for basic UI rendering:

```typescript
// MCP-UI semantic components
Button, Input, Text, Card, Stack

// Basic HTML layout
div, span, p

// Basic form elements
button, input, label, form

// Basic text formatting
h1, h2, h3, strong, em, a

// Basic lists
ul, ol, li
```

**Total: 21 components** (~29% of library)

#### Tier 2: Extended Components (Lazy Loaded)

Advanced components loaded on first use:

```typescript
// Advanced MCP-UI
Image

// Media elements (heavy)
img, video, audio, source, track, canvas, svg, picture

// Table elements (heavy)
table, thead, tbody, tfoot, tr, td, th, caption, colgroup, col

// Advanced forms
textarea, select, option, fieldset, legend, optgroup, datalist, output, progress, meter

// Semantic HTML
section, article, header, footer, nav, main, aside, figure, figcaption, details, summary, dialog, mark, time, address

// Advanced text
code, pre, blockquote, hr, br, h4, h5, h6
```

**Total: 52 components** (~71% of library)

### How It Works

1. **Core components are always available** (no loading needed)
2. **Extended components load automatically** when first used
3. **Loading happens once** (cached for subsequent use)
4. **No developer intervention required** (transparent)

### Usage Examples

#### Check if Component is Available

```typescript
import { isComponentAllowed, getComponentTier } from 'simply-mcp/client/remote-dom/lazy-components';

// Fast check (doesn't trigger loading)
if (isComponentAllowed('video')) {
  console.log('Video is allowed');
}

// Get component tier
const tier = getComponentTier('video'); // Returns: 'extended'
const tier2 = getComponentTier('div'); // Returns: 'core'
const tier3 = getComponentTier('script'); // Returns: null (blocked)
```

#### Ensure Component is Loaded

```typescript
import { ensureComponentAvailable } from 'simply-mcp/client/remote-dom/lazy-components';

// Load component before use (automatic in Remote DOM scripts)
await ensureComponentAvailable('video');

// Now you can use it
const videoId = remoteDOM.createElement('video', { controls: true });
```

#### Preload Extended Components

```typescript
import { preloadExtendedComponents } from 'simply-mcp/client/remote-dom/lazy-components';

// Preload in background during idle time
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    preloadExtendedComponents();
  });
} else {
  setTimeout(() => {
    preloadExtendedComponents();
  }, 1000);
}
```

#### Get Loading Statistics

```typescript
import { getLoadingStats } from 'simply-mcp/client/remote-dom/lazy-components';

const stats = getLoadingStats();

console.log('Core components:', stats.core.count); // 21
console.log('Extended components:', stats.extended.count); // 52
console.log('Extended loaded:', stats.extended.loaded); // true/false
console.log('Core percentage:', stats.total.corePercentage); // 29%
console.log('Extended percentage:', stats.total.extendedPercentage); // 71%
```

### Performance Implications

#### Bundle Size Impact

| Tier | Components | Estimated Size | When Loaded |
|------|------------|----------------|-------------|
| Core | 21 (29%) | ~8-10 KB | Immediately |
| Extended | 52 (71%) | ~6-8 KB | On first use |

**Result**: Initial bundle reduced by ~30-40% (only core components loaded upfront).

#### Loading Behavior

- **First video/table/canvas use**: ~0-50ms delay (one-time load)
- **Subsequent uses**: No delay (components cached)
- **Core components**: Always instant (no loading)

#### Developer Implications

**No action required**: The Remote DOM renderer automatically:
1. Detects which components are used
2. Loads required tiers transparently
3. Caches components for reuse

**Optional optimization**: Preload extended components during idle time if you know they'll be needed.

### Common Errors

#### Error: "Component not allowed: script"

**Cause**: Attempting to use a blocked component (security restriction).

**Solution**: Use allowed alternatives. See [component whitelist](#component-tiers).

```typescript
// ❌ Blocked
remoteDOM.createElement('script', { src: 'evil.js' });

// ✅ Use allowed components
remoteDOM.createElement('div', { className: 'content' });
```

---

## CSP Validation

### What is CSP?

**Content Security Policy (CSP)** is a web standard that prevents cross-site scripting (XSS) and code injection attacks by restricting what code can execute.

Simply-MCP enforces CSP directives to validate Remote DOM scripts before execution, blocking dangerous patterns like `eval()`, `Function()` constructor, and inline event handlers.

### Why It's Important

**Problem**: Malicious scripts could use `eval()` or `Function()` to execute arbitrary code, leading to:
- XSS attacks
- Data theft
- Code injection
- Session hijacking

**Solution**: CSP validation blocks unsafe code patterns before they reach the Web Worker sandbox.

**Security Target**: Block `unsafe-inline`, `unsafe-eval`, and validate all external resources.

### Default Policy

Simply-MCP uses a conservative default policy:

```typescript
const DEFAULT_CSP_POLICY = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],              // No inline scripts, no eval
  'style-src': ["'self'", "'unsafe-inline'"], // Allow inline styles
  'img-src': ["'self'", 'data:', 'https:'],   // Images from safe sources
  'font-src': ["'self'", 'data:', 'https:'],
  'connect-src': ["'self'"],             // API calls to same origin
  'media-src': ["'self'", 'https:'],
  'object-src': ["'none'"],              // Block plugins
  'frame-src': ["'none'"],               // Block iframes
  'worker-src': ["'self'", 'blob:'],     // Allow Web Workers
  'child-src': ["'self'", 'blob:'],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],         // Prevent clickjacking
  'base-uri': ["'self'"]
};
```

### Blocked Code Patterns

#### 1. eval() Usage

**Blocked:**
```javascript
// ❌ CSP violation
const result = eval("1 + 1");
const code = eval(userInput);
```

**Allowed:**
```javascript
// ✅ Safe alternatives
const result = 1 + 1;
const parsed = JSON.parse(jsonString);
```

**Error:**
```
CSP violation: Script contains unsafe code
- eval(): eval() is blocked by CSP. Use safer alternatives or enable 'unsafe-eval' (not recommended).
```

#### 2. Function Constructor

**Blocked:**
```javascript
// ❌ CSP violation
const fn = new Function("return 42");
const fn2 = new Function("a", "b", "return a + b");
```

**Allowed:**
```javascript
// ✅ Use regular functions
function myFunction() {
  return 42;
}

const arrow = (a, b) => a + b;
```

**Error:**
```
CSP violation: Script contains unsafe code
- new Function(): Function() constructor is blocked by CSP. Use safer alternatives or enable 'unsafe-eval' (not recommended).
```

#### 3. setTimeout/setInterval with Strings

**Blocked:**
```javascript
// ❌ CSP violation
setTimeout("alert('XSS')", 1000);
setInterval("doEvil()", 1000);
```

**Allowed:**
```javascript
// ✅ Use function references
setTimeout(() => alert('Safe'), 1000);
setInterval(myFunction, 1000);

// ✅ With arguments
setTimeout((msg) => console.log(msg), 1000, 'Hello');
```

**Error:**
```
CSP violation: Script contains unsafe code
- setTimeout/setInterval with string: setTimeout/setInterval with string arguments is blocked by CSP. Use function references instead.
```

#### 4. Inline Event Handlers (Warning)

**Not recommended:**
```javascript
// ⚠️ Warning (not blocked in worker context, but discouraged)
const html = '<button onclick="doSomething()">Click</button>';
```

**Recommended:**
```javascript
// ✅ Use addEventListener
const buttonId = remoteDOM.createElement('button', { textContent: 'Click' });
remoteDOM.addEventListener(buttonId, 'click', () => {
  doSomething();
});
```

#### 5. CSS Expressions (Blocked)

**Blocked:**
```javascript
// ❌ High severity
const style = 'width: expression(alert("XSS"));';
```

**Allowed:**
```javascript
// ✅ Use standard CSS
const style = 'width: 100px;';
```

### How to Write CSP-Compliant Scripts

#### ✅ Safe Patterns

```javascript
// JSON parsing (safe)
const data = JSON.parse(jsonString);

// Regular functions
function calculate(a, b) {
  return a + b;
}

// Arrow functions
const multiply = (x, y) => x * y;

// Event listeners
remoteDOM.addEventListener(elementId, 'click', (event) => {
  console.log('Clicked!');
});

// Timers with functions
setTimeout(() => {
  console.log('Delayed action');
}, 1000);

// Template literals
const message = `Hello, ${userName}!`;
```

#### ❌ Unsafe Patterns

```javascript
// eval() - NEVER USE
eval(userInput); // XSS vulnerability

// Function constructor - NEVER USE
new Function(userCode)(); // Code injection

// String-based timers - NEVER USE
setTimeout("alert('bad')", 1000); // eval-equivalent

// Inline event handlers - AVOID
element.setAttribute('onclick', 'doSomething()'); // Not in CSP spirit
```

### Configuration Options

#### Custom CSP Policy

```typescript
import { CSPValidator } from 'simply-mcp/client/remote-dom/csp-validator';

const validator = new CSPValidator({
  policy: {
    'script-src': ["'self'", 'https://trusted-cdn.com'],
    'img-src': ["'self'", 'https:', 'data:'],
    'connect-src': ["'self'", 'https://api.example.com']
  },
  throwOnViolation: true,  // Throw error on violation (default)
  debug: false              // Enable debug logging
});

// Validate script
try {
  validator.validateScript(scriptContent);
  console.log('Script is CSP-compliant');
} catch (error) {
  console.error('CSP violation:', error.violations);
}
```

#### Non-Throwing Validation

```typescript
const validator = new CSPValidator({ throwOnViolation: false });

const result = validator.validateScript(scriptContent);

if (!result.valid) {
  console.error('Violations:', result.violations);
  result.violations.forEach(v => {
    console.error(`- ${v.blockedValue}: ${v.reason} (${v.severity})`);
  });
}

if (result.warnings.length > 0) {
  console.warn('Warnings:', result.warnings);
}
```

#### URL Validation

```typescript
// Validate external resource URLs
const result = validator.validateURL('https://example.com/api', 'connect-src');

if (result.valid) {
  console.log('URL allowed by CSP');
} else {
  console.error('URL blocked by CSP:', result.violations[0].reason);
}
```

#### Get CSP Header String

```typescript
const headerValue = validator.getPolicyString();
console.log('Content-Security-Policy:', headerValue);
// Output: "script-src 'self'; img-src 'self' data: https:; ..."
```

### Common Errors and Solutions

#### Error: "eval() is blocked by CSP"

**Problem**: Script uses `eval()` to execute dynamic code.

**Solution**: Replace `eval()` with safe alternatives:

```javascript
// ❌ Unsafe
const result = eval("Math.sqrt(16)");

// ✅ Safe
const result = Math.sqrt(16);

// ❌ Unsafe JSON parsing
const obj = eval("(" + jsonString + ")");

// ✅ Safe JSON parsing
const obj = JSON.parse(jsonString);
```

#### Error: "Function() constructor is blocked"

**Problem**: Script uses `new Function()` to create functions dynamically.

**Solution**: Define functions normally:

```javascript
// ❌ Unsafe
const fn = new Function("a", "b", "return a + b");

// ✅ Safe
const fn = (a, b) => a + b;
```

#### Error: "setTimeout/setInterval with string"

**Problem**: Using string arguments in timers (equivalent to eval).

**Solution**: Use function references:

```javascript
// ❌ Unsafe
setTimeout("doWork()", 1000);

// ✅ Safe
setTimeout(doWork, 1000);
setTimeout(() => doWork(), 1000);
```

#### Error: "URL not allowed by connect-src"

**Problem**: Attempting to connect to external API not in CSP policy.

**Solution**: Add trusted domain to CSP policy:

```typescript
const validator = new CSPValidator({
  policy: {
    'connect-src': ["'self'", 'https://trusted-api.com']
  }
});
```

### Best Practices

1. **Never use eval()**: Always use safe alternatives (JSON.parse, direct code, etc.)
2. **Avoid Function constructor**: Define functions normally with `function` or arrow syntax
3. **Use function references in timers**: Pass functions, not strings, to setTimeout/setInterval
4. **Prefer addEventListener**: Don't set inline event handlers via HTML
5. **Validate external resources**: Only load resources from trusted domains
6. **Keep CSP strict**: Only relax policies when absolutely necessary
7. **Monitor violations**: Enable debug mode during development to catch issues early

---

## Operation Batching

### What is Operation Batching?

Operation batching queues multiple DOM operations and processes them together in a single render cycle, preventing render thrashing and maintaining smooth 60 FPS performance.

### Why It's Needed

**Problem**: Remote DOM scripts may send many rapid operations (create element, set attributes, append child, etc.). Processing each operation individually causes excessive re-renders and poor performance.

**Solution**: Batch operations within a 16ms window (1 frame at 60 FPS) and process them together.

**Performance Target**: ≥50% render cycle reduction, maintain ≥60 FPS.

### How the 16ms Window Works

```
Time →
┌─────┬─────┬─────┬─────┬─────┬─────┐
│ Op1 │ Op2 │ Op3 │ ... │ Op10│FLUSH│ ← 16ms batch window (60 FPS)
└─────┴─────┴─────┴─────┴─────┴─────┘
                                   ↓
                          Single React render

Without batching:
┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
│O1│O2│O3│O4│O5│O6│O7│O8│O9│10│ ← 10 separate renders
└──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘
```

**Result**: 10 operations batched into 1 render = 90% reduction.

### Performance Benefits

| Scenario | Operations | Without Batching | With Batching | Reduction |
|----------|-----------|------------------|---------------|-----------|
| Small update | 5 | 5 renders | 1 render | 80% |
| Medium update | 20 | 20 renders | 1 render | 95% |
| Large update | 100 | 100 renders | 1-2 renders | 98% |

**Frame budget**: 16ms per frame at 60 FPS. Batching ensures operations stay within budget.

### Developer Implications

#### When Updates Become Visible

**Without batching**: Updates visible immediately after each operation (may cause flickering).

**With batching**: Updates visible after batch window (16ms delay, imperceptible to users).

```javascript
// All these operations are batched
remoteDOM.createElement('div', { id: 'container' });
remoteDOM.setAttribute('div-1', 'className', 'active');
remoteDOM.appendChild('root', 'div-1');
remoteDOM.setTextContent('div-1', 'Hello');

// ↓ 16ms later ↓
// All updates rendered together (smooth, efficient)
```

#### Immediate Flush for Critical Operations

For time-sensitive operations (alerts, navigation), you can force immediate flush:

```javascript
// This needs to happen NOW
remoteDOM.callHost('navigate', { url: '/urgent' });

// Implementation in RemoteDOMRenderer uses flushImmediate for critical operations
```

### Configuration

The batcher is configured automatically in `RemoteDOMRenderer`, but can be customized:

```typescript
import { createBatcher } from 'simply-mcp/client/remote-dom/operation-batcher';

const batcher = createBatcher(
  (operations) => {
    // Process batched operations
    operations.forEach(op => processOperation(op));
  },
  {
    batchWindow: 16,      // 60 FPS (default)
    maxBatchSize: 100,    // Auto-flush limit (default)
    debug: false          // Enable logging
  }
);

// Add operations
batcher.add({
  type: 'createElement',
  data: { id: '1', tagName: 'div' },
  timestamp: Date.now()
});

// Operations flush automatically after 16ms
// Or immediately if maxBatchSize reached
```

### Monitoring Statistics

```typescript
const stats = batcher.getStats();

console.log('Total operations:', stats.totalOperations);
console.log('Total flushes:', stats.totalFlushes);
console.log('Reduction:', stats.reductionPercent + '%');
console.log('Largest batch:', stats.largestBatch);
console.log('Average batch size:', stats.averageBatchSize);
console.log('Current queue:', stats.currentQueueSize);

// Example output:
// Total operations: 100
// Total flushes: 1
// Reduction: 99%
// Largest batch: 100
// Average batch size: 100
```

### Manual Control

```typescript
// Manual flush (process immediately)
batcher.flush();

// Clear queue without processing (discard operations)
batcher.clear();

// Add and flush immediately (bypass batching)
batcher.flushImmediate(criticalOperation);

// Get current queue size
const pending = batcher.getQueueSize();

// Cleanup
batcher.destroy(); // Flushes pending ops and cleans up
```

### Best Practices

1. **Trust the defaults**: 16ms window and 100 batch size work well for most cases
2. **Don't flush manually**: Let the batcher optimize automatically
3. **Use flushImmediate sparingly**: Only for truly time-critical operations (navigation, alerts)
4. **Monitor in development**: Enable debug mode to see batching behavior
5. **Avoid micro-optimizations**: Batching already optimizes for you

---

## Resource Limits

### What Are Resource Limits?

Resource limits enforce configurable constraints on script size, execution time, DOM nodes, event listeners, and memory usage to prevent DoS attacks and resource exhaustion.

### Why They Exist

**Problem**: Malicious or buggy scripts could:
- Load massive scripts (DoS via bandwidth/memory)
- Run infinite loops (block UI thread)
- Create excessive DOM nodes (memory exhaustion)
- Attach too many listeners (memory leaks)

**Solution**: Enforce limits with clear error messages and guidance.

**Security Target**: Prevent DoS while allowing legitimate use cases.

### Default Limits

| Resource | Default Limit | Why This Limit? |
|----------|--------------|-----------------|
| Script Size | 1 MB | Prevents oversized script DoS |
| Execution Time | 5 seconds | Prevents infinite loops |
| DOM Nodes | 10,000 | Prevents memory exhaustion |
| Event Listeners | 1,000 | Prevents memory leaks |
| Memory Warning | 50 MB | Alerts high memory usage |

**Important**: All limits are fully configurable. Defaults are conservative but can be increased for advanced use cases.

### Configuring Limits

#### Basic Configuration

```typescript
import { createResourceLimits } from 'simply-mcp/client/remote-dom/resource-limits';

const limits = createResourceLimits({
  maxScriptSize: 2 * 1024 * 1024,    // 2 MB (large libraries)
  maxExecutionTime: 10000,            // 10 seconds (data processing)
  maxDOMNodes: 20000,                 // 20,000 nodes (large tables)
  maxEventListeners: 2000,            // 2,000 listeners (complex UIs)
  memoryWarningThreshold: 100,        // 100 MB threshold
  debug: true                         // Enable logging
});
```

#### Use Case Examples

##### Data Visualization App (Large Script)

```typescript
const limits = createResourceLimits({
  maxScriptSize: 5 * 1024 * 1024,  // 5 MB for D3.js, Chart.js, etc.
  maxExecutionTime: 10000,          // 10s for data processing
  maxDOMNodes: 50000,               // Large SVG visualizations
  debug: true
});
```

##### Interactive Dashboard (Many Listeners)

```typescript
const limits = createResourceLimits({
  maxEventListeners: 5000,  // Many interactive elements
  maxDOMNodes: 15000,       // Complex UI
  debug: true
});
```

##### Data Table (Many Nodes)

```typescript
const limits = createResourceLimits({
  maxDOMNodes: 50000,      // 1000 rows × 50 cells = 50,000 nodes
  maxExecutionTime: 8000,  // Time to build table
  debug: true
});
```

### Limit Enforcement

The `RemoteDOMRenderer` automatically enforces limits at key points:

#### 1. Script Size (Before Execution)

```typescript
// Automatic validation in RemoteDOMRenderer
try {
  resourceLimits.validateScriptSize(script);
} catch (error) {
  if (error instanceof ResourceLimitError) {
    console.error(`Script too large: ${error.message}`);
    // Worker terminated, error displayed to user
  }
}
```

#### 2. Execution Time (During Execution)

```typescript
// Starts timer before script execution
resourceLimits.startExecutionTimer(() => {
  console.error('Script timeout: exceeded maximum execution time');
  worker.terminate();
  // Show timeout error to user
});

// Stops timer when script completes
resourceLimits.stopExecutionTimer();
```

#### 3. DOM Nodes (During Creation)

```typescript
// Called for every createElement operation
try {
  resourceLimits.registerDOMNode();
} catch (error) {
  if (error instanceof ResourceLimitError) {
    console.error(`Too many DOM nodes: ${error.message}`);
    worker.terminate();
  }
}

// Called when element removed
resourceLimits.unregisterDOMNode();
```

#### 4. Event Listeners (During Registration)

```typescript
// Called for every addEventListener operation
try {
  resourceLimits.registerEventListener();
} catch (error) {
  if (error instanceof ResourceLimitError) {
    console.error(`Too many listeners: ${error.message}`);
    worker.terminate();
  }
}

// Called when listener removed
resourceLimits.unregisterEventListener();
```

### Error Messages and Actions

#### Script Size Error

**Error:**
```
Script size (2.5 MB) exceeds maximum allowed (1 MB).
This limit prevents DoS attacks from oversized scripts.
If your application needs larger scripts, increase 'maxScriptSize' in ResourceLimitsConfig.
Consider code splitting or lazy loading to reduce script size.
```

**Action:**
1. Split large scripts into smaller modules
2. Remove unnecessary dependencies
3. Use code minification
4. If unavoidable, increase `maxScriptSize` in config

#### Execution Timeout Error

**Error:**
```
Script execution timeout: 6500ms exceeded limit of 5000ms.
This prevents long-running scripts from blocking the UI.
If your application needs more time (e.g., data processing), increase 'maxExecutionTime' in ResourceLimitsConfig.
```

**Action:**
1. Optimize algorithms (reduce complexity)
2. Break work into chunks (use async/await)
3. Move heavy processing to server
4. If unavoidable, increase `maxExecutionTime` in config

#### DOM Node Limit Error

**Error:**
```
DOM node limit exceeded (10001 > 10000).
This limit prevents memory exhaustion from excessive DOM trees.
If your application requires more nodes (e.g., large data tables), increase 'maxDOMNodes' in ResourceLimitsConfig.
Consider virtualization for large lists or tables.
```

**Action:**
1. Implement virtual scrolling for large lists
2. Paginate data (show 100 rows at a time)
3. Use collapsible sections (only show visible nodes)
4. If unavoidable, increase `maxDOMNodes` in config

#### Event Listener Limit Error

**Error:**
```
Event listener limit exceeded (1001 > 1000).
This limit prevents memory leaks from excessive event handlers.
If your application needs more listeners (e.g., complex interactive UI), increase 'maxEventListeners' in ResourceLimitsConfig.
Consider event delegation or cleanup strategies.
```

**Action:**
1. Use event delegation (attach listener to parent)
2. Remove unused listeners (cleanup on unmount)
3. Combine multiple listeners into one
4. If unavoidable, increase `maxEventListeners` in config

### Usage Monitoring

```typescript
const usage = limits.getUsage();

console.log('DOM Nodes:', usage.domNodes.count, '/', usage.domNodes.limit);
console.log('DOM Nodes %:', usage.domNodes.percentage + '%');

console.log('Event Listeners:', usage.eventListeners.count, '/', usage.eventListeners.limit);
console.log('Listeners %:', usage.eventListeners.percentage + '%');

console.log('Execution Time:', usage.executionTime.ms, '/', usage.executionTime.limit);
console.log('Execution %:', usage.executionTime.percentage + '%');

console.log('Memory:', usage.memory.mb, 'MB (threshold:', usage.memory.threshold, 'MB)');

// Example output:
// DOM Nodes: 250 / 10000
// DOM Nodes %: 3%
// Event Listeners: 45 / 1000
// Listeners %: 5%
// Execution Time: 120 / 5000
// Execution %: 2%
// Memory: 35.2 MB (threshold: 50 MB)
```

### Best Practices

#### 1. Start with Defaults

```typescript
// Use defaults for most applications
const limits = createResourceLimits();
```

Defaults work well for:
- Standard web UIs
- Forms and dashboards
- Basic data visualization

#### 2. Adjust Based on Use Case

```typescript
// Increase limits for data-heavy applications
const limits = createResourceLimits({
  maxDOMNodes: 50000,        // Large tables
  maxExecutionTime: 10000    // Data processing
});
```

Increase limits for:
- Data tables (1000+ rows)
- Complex visualizations
- Heavy computation
- Large component libraries

#### 3. Monitor Usage in Development

```typescript
const limits = createResourceLimits({ debug: true });

// Check usage periodically
setInterval(() => {
  const usage = limits.getUsage();
  if (usage.domNodes.percentage > 80) {
    console.warn('Approaching DOM node limit');
  }
}, 5000);
```

#### 4. Optimize Before Increasing

**Before increasing limits**:
1. Profile script size (remove unused code)
2. Optimize algorithms (reduce complexity)
3. Implement virtualization (large lists)
4. Use event delegation (reduce listeners)

**After optimization fails**:
1. Document why higher limit needed
2. Set limit to actual need (not arbitrarily high)
3. Monitor usage in production
4. Consider architectural changes long-term

#### 5. Handle Errors Gracefully

```typescript
// In your server code
try {
  // Script execution happens in RemoteDOMRenderer
  // Limits enforced automatically
} catch (error) {
  if (error instanceof ResourceLimitError) {
    // Log for monitoring
    console.error('Resource limit hit:', error.limitType, error.currentValue, '>', error.maxValue);

    // Show user-friendly message
    return {
      error: 'Resource limit exceeded',
      suggestion: 'Try simplifying your request or contact support'
    };
  }
}
```

---

## Integration Guide

### How Advanced Patterns Work Together

The four patterns integrate seamlessly in `RemoteDOMRenderer`:

```typescript
// RemoteDOMRenderer.tsx (simplified)

// 1. LAZY LOADING: Components loaded on demand
import { ensureComponentAvailable } from './remote-dom/lazy-components';

// 2. CSP VALIDATION: Scripts validated before execution
import { CSPValidator } from './remote-dom/csp-validator';
const cspValidator = useRef(new CSPValidator());

// 3. OPERATION BATCHING: Operations queued and batched
import { OperationBatcher } from './remote-dom/operation-batcher';
const batcher = useRef(new OperationBatcher(processOperations, { batchWindow: 16 }));

// 4. RESOURCE LIMITS: Limits enforced throughout
import { ResourceLimits } from './remote-dom/resource-limits';
const resourceLimits = useRef(new ResourceLimits());

// Execution flow:
useEffect(() => {
  // 1. Validate script with CSP
  cspValidator.current.validateScript(script);

  // 2. Check script size
  resourceLimits.current.validateScriptSize(script);

  // 3. Start execution timer
  resourceLimits.current.startExecutionTimer(() => {
    worker.terminate(); // Timeout
  });

  // 4. Execute script in worker
  worker.postMessage({ type: 'executeScript', script });

  // 5. Operations come back batched
  worker.onmessage = (event) => {
    const operation = event.data;

    // Check resource limits
    if (operation.type === 'createElement') {
      resourceLimits.current.registerDOMNode();
    }
    if (operation.type === 'addEventListener') {
      resourceLimits.current.registerEventListener();
    }

    // Add to batch (auto-flushes every 16ms)
    batcher.current.add(operation);
  };
}, [script]);
```

### Customizing for Your Use Case

#### Scenario 1: Data Visualization Dashboard

**Requirements:**
- Large D3.js/Chart.js library (5 MB)
- Complex SVG rendering (20,000 nodes)
- Data processing (8 seconds)

**Configuration:**
```typescript
// In your RemoteDOMRenderer wrapper
<RemoteDOMRenderer
  resource={resource}
  onUIAction={handleAction}
  resourceLimitsConfig={{
    maxScriptSize: 5 * 1024 * 1024,
    maxDOMNodes: 20000,
    maxExecutionTime: 8000,
    debug: true
  }}
  cspConfig={{
    policy: {
      'script-src': ["'self'", 'https://cdn.jsdelivr.net'], // D3.js CDN
      'img-src': ["'self'", 'data:', 'https:']
    }
  }}
/>
```

#### Scenario 2: Interactive Form Builder

**Requirements:**
- Many form elements (500)
- Many event listeners (1,000)
- Real-time validation

**Configuration:**
```typescript
<RemoteDOMRenderer
  resource={resource}
  onUIAction={handleAction}
  resourceLimitsConfig={{
    maxEventListeners: 1500,  // Lots of inputs
    maxDOMNodes: 5000,         // Form elements
    debug: true
  }}
  batcherConfig={{
    batchWindow: 8,            // Faster updates for real-time feel
    maxBatchSize: 50
  }}
/>
```

#### Scenario 3: High-Security Environment

**Requirements:**
- Strict CSP (no external resources)
- Low resource limits
- Detailed logging

**Configuration:**
```typescript
<RemoteDOMRenderer
  resource={resource}
  onUIAction={handleAction}
  cspConfig={{
    policy: {
      'default-src': ["'none'"],
      'script-src': ["'self'"],
      'style-src': ["'self'"],  // No unsafe-inline
      'img-src': ["'self'"],    // No external images
      'connect-src': ["'none'"] // No API calls
    },
    throwOnViolation: true,
    debug: true
  }}
  resourceLimitsConfig={{
    maxScriptSize: 512 * 1024,  // 512 KB max
    maxExecutionTime: 3000,      // 3 seconds max
    maxDOMNodes: 5000,
    debug: true
  }}
/>
```

### Implementation Notes

**Note**: The example configurations above show the desired API. As of the current implementation, `RemoteDOMRenderer` uses hardcoded instances of these classes. To customize limits, you would need to:

1. Fork `RemoteDOMRenderer.tsx`
2. Replace hardcoded instances with custom configs
3. Pass configs as props

**Future enhancement**: Add props for custom configurations to `RemoteDOMRenderer`.

---

## Configuration Reference

### Lazy Loading

```typescript
import {
  CORE_COMPONENTS,          // Set<string> - 21 core components
  EXTENDED_COMPONENTS,      // Set<string> - 52 extended components
  ALL_COMPONENTS,           // Set<string> - 73 total components
  getComponentTier,         // (tagName: string) => 'core' | 'extended' | null
  isComponentAllowed,       // (tagName: string) => boolean
  ensureComponentAvailable, // (tagName: string) => Promise<void>
  ensureTierLoaded,         // (tier: 'core' | 'extended') => Promise<void>
  preloadExtendedComponents,// () => Promise<void>
  getLoadingStats,          // () => LoadingStats
  resetLoaderState          // () => void (testing only)
} from 'simply-mcp/client/remote-dom/lazy-components';
```

### CSP Validation

```typescript
import {
  CSPValidator,
  createCSPValidator,
  CSPValidationError,
  DEFAULT_CSP_POLICY,
  type CSPPolicy,
  type CSPDirective,
  type CSPSource,
  type CSPValidationResult,
  type CSPViolation
} from 'simply-mcp/client/remote-dom/csp-validator';

// CSPValidatorConfig
interface CSPValidatorConfig {
  policy?: CSPPolicy;           // Custom CSP policy
  throwOnViolation?: boolean;   // Throw on violation (default: true)
  debug?: boolean;              // Enable debug logging (default: false)
}

// Methods
validator.validateScript(script: string): CSPValidationResult
validator.validateURL(url: string, directive: CSPDirective): CSPValidationResult
validator.validateInlineStyle(style: string): CSPValidationResult
validator.getPolicy(): Readonly<CSPPolicy>
validator.getPolicyString(): string
validator.hasUnsafeDirectives(): boolean
```

### Operation Batching

```typescript
import {
  OperationBatcher,
  createBatcher,
  type DOMOperation,
  type FlushCallback,
  type BatcherConfig
} from 'simply-mcp/client/remote-dom/operation-batcher';

// BatcherConfig
interface BatcherConfig {
  batchWindow?: number;      // Batch window in ms (default: 16 for 60 FPS)
  maxBatchSize?: number;     // Auto-flush threshold (default: 100)
  debug?: boolean;           // Enable logging (default: false)
}

// Methods
batcher.add(operation: DOMOperation): void
batcher.flush(): void
batcher.flushImmediate(operation: DOMOperation): void
batcher.clear(): void
batcher.getQueueSize(): number
batcher.getStats(): BatcherStats
batcher.resetStats(): void
batcher.destroy(): void
```

### Resource Limits

```typescript
import {
  ResourceLimits,
  createResourceLimits,
  ResourceLimitError,
  type ResourceLimitsConfig
} from 'simply-mcp/client/remote-dom/resource-limits';

// ResourceLimitsConfig
interface ResourceLimitsConfig {
  maxScriptSize?: number;           // Bytes (default: 1048576 = 1 MB)
  maxExecutionTime?: number;        // Milliseconds (default: 5000 = 5s)
  maxDOMNodes?: number;             // Count (default: 10000)
  maxEventListeners?: number;       // Count (default: 1000)
  memoryWarningThreshold?: number;  // MB (default: 50)
  debug?: boolean;                  // Enable logging (default: false)
}

// Methods
limits.validateScriptSize(script: string): void
limits.startExecutionTimer(onTimeout: () => void): void
limits.stopExecutionTimer(): void
limits.registerDOMNode(): void
limits.unregisterDOMNode(): void
limits.registerEventListener(): void
limits.unregisterEventListener(): void
limits.checkMemoryUsage(): number | null
limits.getUsage(): UsageStats
limits.reset(): void
limits.getConfig(): Readonly<Required<ResourceLimitsConfig>>
```

---

## Troubleshooting

### Lazy Loading Issues

#### Problem: "Component not allowed: X"

**Cause**: Component is not in whitelist.

**Solution**: Check [component tiers](#component-tiers). Use allowed alternatives.

```typescript
// Check if allowed
import { isComponentAllowed } from 'simply-mcp/client/remote-dom/lazy-components';
console.log(isComponentAllowed('video')); // true
console.log(isComponentAllowed('script')); // false
```

#### Problem: Extended components not loading

**Cause**: Network issue or loading state bug.

**Solution**: Check loading state, manually preload:

```typescript
import { getLoadingStats, preloadExtendedComponents } from 'simply-mcp/client/remote-dom/lazy-components';

const stats = getLoadingStats();
console.log('Extended loaded:', stats.extended.loaded);

// Force preload
await preloadExtendedComponents();
```

### CSP Validation Issues

#### Problem: Script blocked with eval/Function error

**Cause**: Script uses unsafe patterns.

**Solution**: Rewrite to use safe alternatives (see [CSP section](#csp-validation)).

#### Problem: External resource blocked

**Cause**: URL not in CSP policy.

**Solution**: Add trusted domain to policy:

```typescript
const validator = new CSPValidator({
  policy: {
    'connect-src': ["'self'", 'https://trusted-api.com']
  }
});
```

#### Problem: Need to disable CSP for testing

**Solution**: Use non-throwing validation:

```typescript
const validator = new CSPValidator({ throwOnViolation: false });
const result = validator.validateScript(script);
if (!result.valid) {
  console.warn('CSP violations:', result.violations);
  // Continue anyway (testing only!)
}
```

### Operation Batching Issues

#### Problem: Updates appear delayed

**Cause**: Batching introduces 16ms delay (normal behavior).

**Solution**: This is by design for performance. For critical operations, use immediate flush:

```typescript
// Critical operation (bypass batching)
batcher.flushImmediate(criticalOperation);
```

#### Problem: UI feels sluggish

**Cause**: Batch window too long or batches too large.

**Solution**: Reduce batch window or max size:

```typescript
const batcher = createBatcher(callback, {
  batchWindow: 8,     // 8ms (faster updates)
  maxBatchSize: 50    // Smaller batches
});
```

#### Problem: Too many renders (batching not working)

**Cause**: Operations not going through batcher.

**Solution**: Ensure all operations use batcher:

```typescript
// ✅ Correct
batcher.add(operation);

// ❌ Wrong (bypasses batching)
processOperation(operation);
```

### Resource Limit Issues

#### Problem: Script size limit exceeded

**Cause**: Script too large (over 1 MB default).

**Solutions:**
1. Minify code (remove comments, whitespace)
2. Split into modules (lazy load)
3. Remove unused dependencies
4. Increase limit if necessary:

```typescript
const limits = createResourceLimits({
  maxScriptSize: 2 * 1024 * 1024 // 2 MB
});
```

#### Problem: Execution timeout

**Cause**: Script takes too long (over 5s default).

**Solutions:**
1. Optimize algorithms (reduce complexity)
2. Break into chunks (async/await)
3. Move processing to server
4. Increase limit if necessary:

```typescript
const limits = createResourceLimits({
  maxExecutionTime: 10000 // 10 seconds
});
```

#### Problem: DOM node limit exceeded

**Cause**: Too many elements (over 10,000 default).

**Solutions:**
1. Implement virtual scrolling (only render visible)
2. Paginate data (show 100 items at a time)
3. Use collapsible sections (hide off-screen)
4. Increase limit if necessary:

```typescript
const limits = createResourceLimits({
  maxDOMNodes: 20000 // 20,000 nodes
});
```

#### Problem: Event listener limit exceeded

**Cause**: Too many listeners (over 1,000 default).

**Solutions:**
1. Use event delegation (attach to parent)
2. Clean up listeners (removeEventListener)
3. Combine handlers (one listener, multiple actions)
4. Increase limit if necessary:

```typescript
const limits = createResourceLimits({
  maxEventListeners: 2000 // 2,000 listeners
});
```

### Debug Mode

Enable debug logging for all patterns:

```typescript
// Lazy loading debug
// (Debug mode not available - check stats instead)
const stats = getLoadingStats();
console.log('Lazy loading:', stats);

// CSP debug
const cspValidator = new CSPValidator({ debug: true });

// Batcher debug
const batcher = createBatcher(callback, { debug: true });

// Resource limits debug
const limits = createResourceLimits({ debug: true });
```

---

## Best Practices

### General Guidelines

1. **Start with defaults**: They work well for most applications
2. **Monitor in development**: Enable debug mode to understand behavior
3. **Optimize before increasing limits**: Fix inefficiencies first
4. **Document custom configs**: Explain why limits were changed
5. **Test with realistic data**: Use production-like datasets in testing

### Performance Optimization

1. **Lazy loading**: Preload extended components during idle time
2. **CSP validation**: Write CSP-compliant code from the start
3. **Operation batching**: Let it work automatically (don't interfere)
4. **Resource limits**: Profile before increasing limits

### Security Hardening

1. **Keep CSP strict**: Only relax when absolutely necessary
2. **Validate external resources**: Only allow trusted domains
3. **Monitor resource usage**: Alert on suspicious patterns
4. **Document policy changes**: Explain security trade-offs

### Production Considerations

1. **Set appropriate limits**: Based on actual usage patterns
2. **Monitor violations**: Log CSP and limit violations
3. **Graceful degradation**: Handle errors without crashing
4. **Performance metrics**: Track batching effectiveness and resource usage

### Development Workflow

1. **Enable debug mode**: See what's happening under the hood
2. **Test edge cases**: Large scripts, many elements, slow operations
3. **Profile performance**: Measure before and after optimizations
4. **Document findings**: Share insights with team

---

## Related Documentation

- [MCP UI Protocol Guide](./MCP_UI_PROTOCOL.md) - Complete MCP UI specification
- [MCP UI Migration Guide](./MCP_UI_MIGRATION.md) - Migrating to spec-compliant protocol
- [Quick Start Guide](./QUICK_START.md) - Getting started with Simply-MCP
- [API Reference](./API_REFERENCE.md) - Complete API documentation

---

**Need help?** Check the [troubleshooting section](#troubleshooting) or open an issue on GitHub.
