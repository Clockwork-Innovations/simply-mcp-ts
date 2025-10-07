# Dynamic Prompts and Resources - Implementation Complete

**Date:** 2025-10-06
**Status:** ✅ Fully Implemented and Tested

## Overview

Successfully implemented **dynamic prompts and resources** for the Interface-Driven API. Both features now support runtime function execution when MCP protocol requests (`prompts/get`, `resources/read`) are received from clients.

---

## Understanding MCP Protocol

### How MCP Works

**MCP is request-driven, not declarative:**

1. **Client sends request** → `prompts/get` with name and arguments
2. **Server handler executes** → Runs at that moment (runtime)
3. **Server returns response** → Generated content sent to client

This means **all prompts and resources in MCP are inherently dynamic** - they're fetched on-demand, not pre-registered.

### Previous Limitation

BuildMCPServer previously only supported **static content**:
- Prompts: Store template string, render with placeholders
- Resources: Store static data, serve as-is

### New Capability

BuildMCPServer now supports **dynamic content via functions**:
- Prompts: Function called when `prompts/get` received
- Resources: Function called when `resources/read` received

---

## Implementation Details

### 1. Type Definitions Enhanced

**File:** `src/api/programmatic/types.ts`

#### PromptDefinition
```typescript
export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{...}>;

  // NEW: Support both static and dynamic
  template: string | ((args: Record<string, any>) => string | Promise<string>);
}
```

**Before:** Only `string`
**After:** `string` (static) OR `function` (dynamic)

#### ResourceDefinition
```typescript
export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;

  // NEW: Support both static and dynamic
  content:
    | string
    | { [key: string]: any }
    | Buffer
    | Uint8Array
    | (() => string | object | Buffer | Uint8Array | Promise<...>);
}
```

**Before:** Only static data types
**After:** Static data types OR `function` (dynamic)

---

### 2. Runtime Handlers Updated

**File:** `src/api/programmatic/BuildMCPServer.ts`

#### Prompt Handler (`prompts/get`)
```typescript
this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const prompt = this.prompts.get(request.params.name);
  const args = request.params.arguments || {};

  // Check if dynamic (function) or static (string)
  let renderedText: string;
  if (typeof prompt.template === 'function') {
    // Call dynamic function
    renderedText = await Promise.resolve(prompt.template(args));
  } else {
    // Render static template
    renderedText = this.renderTemplate(prompt.template, args);
  }

  return { messages: [{ role: 'user', content: { type: 'text', text: renderedText } }] };
});
```

#### Resource Handler (`resources/read`)
```typescript
this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const resource = this.resources.get(request.params.uri);

  // Check if dynamic (function) or static (data)
  let content: string | object | Buffer | Uint8Array;
  if (typeof resource.content === 'function') {
    // Call dynamic function
    content = await Promise.resolve(resource.content());
  } else {
    // Use static content
    content = resource.content;
  }

  // Return formatted response (text or blob)
  return { contents: [{ uri, mimeType, text: formatContent(content) }] };
});
```

---

### 3. Interface API Integration

**Files:** `src/api/interface/prompt-handler.ts`, `resource-handler.ts`

#### Dynamic Prompt Registration
```typescript
export function registerDynamicPrompt(
  server: BuildMCPServer,
  serverInstance: any,
  prompt: ParsedPrompt
): void {
  const method = serverInstance[prompt.methodName];

  // Register with function that calls implementation
  server.addPrompt({
    name: prompt.name,
    description: prompt.description,
    arguments: parseArgsType(prompt.argsType),
    template: (args) => method.call(serverInstance, args),  // ← Dynamic!
  });
}
```

#### Dynamic Resource Registration
```typescript
export function registerDynamicResource(
  server: BuildMCPServer,
  serverInstance: any,
  resource: ParsedResource
): void {
  const method = serverInstance[resource.methodName];

  // Register with function that calls implementation
  server.addResource({
    uri: resource.uri,
    name: resource.name,
    description: resource.description,
    mimeType: resource.mimeType,
    content: () => method.call(serverInstance),  // ← Dynamic!
  });
}
```

---

## Test Results

**Test File:** `tests/test-dynamic-features.ts`

### ✅ Static Prompts
```
✓ Template type: string
✓ Template is static string
✓ Renders with placeholder interpolation
```

### ✅ Dynamic Prompts
```
✓ Template type: function
✓ Template is function (dynamic)
✓ Generates different content based on args

Example:
  Args: {"query":"TypeScript","userLevel":"beginner"}
  Result: "You are a friendly search assistant. Help a beginner user..."

  Args: {"query":"TypeScript","userLevel":"expert"}
  Result: "Advanced search query: TypeScript. Provide comprehensive..."
```

### ✅ Static Resources
```
✓ Content type: string (or object)
✓ Content is static data
✓ Served as-is on every request
```

### ✅ Dynamic Resources
```
✓ Content type: function
✓ Content is function (dynamic)
✓ Generates different data on each call

Example (stats://search):
  Call 1: {"totalSearches": 5193, "averageResponseTime": 58.64, ...}
  Call 2: {"totalSearches": 2350, "averageResponseTime": 37.43, ...}
  ✓ Values changed between calls (Math.random working)
```

---

## Example Usage

### Interface Definition (TypeScript)

```typescript
// Dynamic Prompt
interface ContextualPrompt extends IPrompt {
  name: 'contextual_search';
  description: 'Context-aware search prompt';
  args: { query: string; userLevel?: 'beginner' | 'intermediate' | 'expert' };
  dynamic: true;  // Marks as dynamic (or inferred by missing template)
}

// Dynamic Resource
interface StatsResource extends IResource {
  uri: 'stats://search';
  name: 'Search Statistics';
  mimeType: 'application/json';
  data: {
    totalSearches: number;      // Non-literal types
    averageResponseTime: number; // → Automatically detected as dynamic
  };
}
```

### Implementation

```typescript
export default class SearchService implements SearchServer {
  // Dynamic prompt implementation
  contextualSearch = (args: { query: string; userLevel?: string }) => {
    const level = args.userLevel || 'intermediate';
    const prompts = {
      beginner: `Friendly help for: ${args.query}...`,
      expert: `Advanced query: ${args.query}...`,
    };
    return prompts[level];
  };

  // Dynamic resource implementation (URI as property name)
  'stats://search' = async () => ({
    totalSearches: await getCount(),
    averageResponseTime: calculateAvg(),
    topQueries: await getTop(),
    lastUpdated: new Date().toISOString(),
  });
}
```

### Runtime Behavior

When client requests `prompts/get(name="contextual_search", args={query:"TS", userLevel:"expert"})`:

1. MCP server receives request
2. Handler checks: `typeof template === 'function'` → TRUE
3. Calls: `contextualSearch({query:"TS", userLevel:"expert"})`
4. Returns: Generated prompt text

When client requests `resources/read(uri="stats://search")`:

1. MCP server receives request
2. Handler checks: `typeof content === 'function'` → TRUE
3. Calls: `'stats://search'()` method
4. Returns: Fresh statistics data

---

## Feature Comparison

| Feature | Static | Dynamic |
|---------|--------|---------|
| **Prompts** | Template string with `{placeholders}` | Function: `(args) => string` |
| **Resources** | Literal data (string, object, Buffer) | Function: `() => data` |
| **When Evaluated** | Once (at registration) | Every request (runtime) |
| **Use Case** | Fixed content, simple interpolation | Logic, external data, real-time values |
| **Example** | `"Hello {name}"` | `(args) => fetchUserGreeting(args.name)` |

---

## Files Modified

### Core Types
- ✅ `src/api/programmatic/types.ts` - Enhanced definitions

### Runtime Handlers
- ✅ `src/api/programmatic/BuildMCPServer.ts` - Dynamic execution logic

### Interface API Integration
- ✅ `src/api/interface/prompt-handler.ts` - Pass functions for dynamic prompts
- ✅ `src/api/interface/resource-handler.ts` - Pass functions for dynamic resources

### Tests & Examples
- ✅ `examples/interface-comprehensive.ts` - Full demonstration
- ✅ `tests/test-dynamic-features.ts` - Runtime behavior verification

---

## Benefits

### 1. **True MCP Protocol Alignment**
The implementation now matches how MCP actually works - request-driven, runtime execution.

### 2. **Real-Time Data**
Resources can fetch live data:
- Database queries
- API calls
- File system reads
- System metrics

### 3. **Context-Aware Prompts**
Prompts can adapt to:
- User preferences
- Time of day
- System state
- Request history

### 4. **Zero Boilerplate**
Interface API users get dynamic features automatically:
```typescript
// Just implement the method - framework handles MCP protocol
'stats://users' = async () => await db.query('SELECT COUNT(*) ...');
```

### 5. **Type Safety**
Full IntelliSense on method signatures:
```typescript
contextualSearch = (args: { query: string; userLevel?: 'beginner' | ... }) => {
  // args is fully typed!
}
```

---

## Next Steps

With dynamic features complete, the Interface API is now **feature-complete** for the foundation layer.

**Remaining work:**
1. ☐ E2E testing with actual MCP client
2. ☐ CLI command (`interface-bin.ts`)
3. ☐ Auto-detection in `run-bin.ts`
4. ☐ Comprehensive JSDoc documentation
5. ☐ User guide and examples

---

## Conclusion

Dynamic prompts and resources are **fully implemented and tested**. The Interface-Driven API now provides:

✅ **Complete MCP protocol support**
✅ **Static content** (simple, fast)
✅ **Dynamic content** (powerful, flexible)
✅ **Automatic detection** (no manual flags needed in most cases)
✅ **Type safety** (full IntelliSense)
✅ **Zero schema boilerplate** (AST → Zod)

**Status:** Ready for integration testing and CLI development.
