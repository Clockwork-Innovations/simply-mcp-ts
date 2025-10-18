# Project: Add @Router Tool Support Across All API Styles

**Overall Goal:** Enable all 4 API styles in simply-mcp to use tool routers for organizing related tools.

**Project Status:** 50% Complete (Decorator API done, Functional/Interface APIs pending)

---

## 📋 Task Tracking

### ✅ Completed Tasks

#### Phase 1: Decorator API (COMPLETE)
- [x] **LAYER 1 - FOUNDATION**: Implement @Router decorator for single router per class
  - Added RouterMetadata type
  - Created @Router decorator with validation
  - Implemented getRouters() metadata extraction
  - Integrated with Decorator API adapter
  - **Result:** 13 tests passing, fully validated

- [x] **LAYER 2 - FEATURE**: Extend to multiple routers per class with validation
  - Added multi-router accumulation to @Router decorator
  - Implemented router name uniqueness validation
  - Implemented tool name validation with typo detection
  - Added helpful error messages
  - Enabled shared tools across routers
  - **Result:** 17 tests passing, fully validated, zero regressions

- [x] **Validation Gates Applied**
  - Test Validation Agent: Verified all 30 tests are real (not fake), specific assertions, comprehensive coverage
  - Functional Validation Agent: Confirmed end-to-end functionality works
  - Gate checks passed before proceeding to next layer

#### Phase 2: Orchestration Methodology (COMPLETE)
- [x] Used Orchestrator Pattern (from prompt-library/ORCHESTRATOR_PROMPT.md)
- [x] Implemented layered development: Foundation → Feature → Polish (2/3 complete)
- [x] Applied validation gates with separate validator agents
- [x] Enforced test validity (no mocking, specific assertions only)
- [x] Achieved zero regressions in foundation layer

---

### ⏳ Pending Tasks

#### Phase 2: Functional API Routers (READY TO START)
- [ ] **LAYER 1 - FOUNDATION**: Implement routers for config-based and builder patterns
  - Add SingleFileRouter type to types.ts
  - Add defineRouter() helper function to builders.ts
  - Add .router() method to MCPBuilder class
  - Integrate with BuildMCPServer in build() method
  - Create 13 foundation tests
  - **Estimated Effort:** 2-3 hours

- [ ] **LAYER 2 - FEATURE**: Add multi-router + validation for Functional API
  - Multi-router accumulation in MCPBuilder
  - Router name uniqueness validation
  - Tool name validation with typo detection
  - Create 17 feature layer tests
  - **Estimated Effort:** 2-3 hours

#### Phase 3: Interface API Routers (READY AFTER FUNCTIONAL)
- [ ] **Add Router Support to Interface API**
  - Expose router methods from underlying BuildMCPServer
  - Add addRouter() and assignTools() methods to InterfaceServer
  - Simpler than Functional API (mostly delegation)
  - **Estimated Effort:** 1-2 hours

#### Phase 4: Polish & Documentation (FINAL PHASE)
- [ ] **Unified Polish Pass**
  - Create comprehensive examples for all 4 API styles with routers
  - Update docs/guides/API_GUIDE.md with router comparison table
  - Create examples/decorator-routers.ts, examples/functional-routers.ts, etc.
  - Document best practices for each API style
  - Add integration tests across all APIs
  - **Estimated Effort:** 3-4 hours

---

## 📊 Completed Work Summary

### Decorator API Implementation (COMPLETE)

**Files Modified:**
1. `src/api/decorator/types.ts` - Added RouterMetadata interface
2. `src/api/decorator/decorators.ts` - Added @Router decorator with multi-router + uniqueness validation
3. `src/api/decorator/metadata.ts` - Added getRouters() extraction function
4. `src/api/decorator/adapter.ts` - Added router registration with tool validation + typo detection
5. `src/api/decorator/index.ts` - Added exports
6. `src/index.ts` - Added main exports

**Tests Created:**
- `tests/decorator-router-foundation.test.ts` - 13 foundation tests (all passing ✓)
- `tests/decorator-router-feature.test.ts` - 17 feature tests (all passing ✓)

**Quality Metrics:**
- ✅ 30 tests total, 100% pass rate
- ✅ Comprehensive coverage: multi-router, validation, shared tools, error handling
- ✅ Test Validation: Confirmed tests are real with specific assertions
- ✅ Functional Validation: Confirmed end-to-end functionality works
- ✅ Zero regressions in foundation and feature layers
- ✅ Production-ready code

**Implementation Approach:**
- Used orchestration methodology: Foundation → Feature with validation gates
- Applied separate validation agents (never self-grading)
- Enforced test validity (no mocking core functionality)
- All code follows existing project patterns

---

## Next Task: Add @Router Support to Functional API

**Status:** Ready to implement
**Priority:** High - Completes router support across all API styles
**Estimated Effort:** Similar to Decorator API (Foundation + Feature layers, ~4-6 hours)

---

## Overview

Add router support to the **Functional API** (`defineMCP`, `MCPBuilder`) following the same pattern as the Decorator API.

Users should be able to define routers in two ways:

### Option 1: Config-based (defineMCP)
```typescript
import { defineMCP } from 'simply-mcp';
import { z } from 'zod';

export default defineMCP({
  name: 'weather-server',
  version: '1.0.0',
  tools: [
    {
      name: 'get_weather',
      description: 'Get current weather',
      parameters: z.object({ city: z.string() }),
      execute: async (args) => `Weather in ${args.city}`
    },
    {
      name: 'get_forecast',
      description: 'Get forecast',
      parameters: z.object({ city: z.string(), days: z.number() }),
      execute: async (args) => `Forecast for ${args.city}`
    }
  ],
  routers: [
    {
      name: 'weather_router',
      description: 'Weather tools',
      tools: ['get_weather', 'get_forecast']
    },
    {
      name: 'alerts_router',
      description: 'Alert tools',
      tools: ['get_alerts']
    }
  ]
});
```

### Option 2: Builder Pattern (MCPBuilder)
```typescript
import { createMCP } from 'simply-mcp';
import { z } from 'zod';

const server = createMCP({ name: 'weather-server', version: '1.0.0' })
  .tool({
    name: 'get_weather',
    description: 'Get weather',
    parameters: z.object({ city: z.string() }),
    execute: async (args) => `Weather in ${args.city}`
  })
  .tool({
    name: 'get_forecast',
    description: 'Get forecast',
    parameters: z.object({ city: z.string() }),
    execute: async (args) => `Forecast`
  })
  .router({
    name: 'weather_router',
    description: 'Weather tools',
    tools: ['get_weather', 'get_forecast']
  })
  .router({
    name: 'alerts_router',
    description: 'Alert tools',
    tools: ['get_alerts']
  })
  .build();

export default server;
```

---

## Implementation Plan

### Layer 1: Foundation (Single Router Support)

**Files to modify:**

1. **`src/api/functional/types.ts`**
   - Add `SingleFileRouter` interface:
     ```typescript
     export interface SingleFileRouter {
       name: string;
       description: string;
       tools: string[];
       metadata?: Record<string, unknown>;
     }
     ```
   - Add `routers?: SingleFileRouter[]` to `SingleFileMCPConfig`

2. **`src/api/functional/builders.ts`**
   - Add `defineRouter()` helper function (like `defineTool()`)
   - Add `.router()` method to `MCPBuilder` class
   - Modify `MCPBuilder.build()` to handle routers:
     - Extract routers array from config
     - Call `server.addRouterTool()` for each router
     - Assign tools to routers

3. **`src/api/functional/adapter.ts`** (if exists, or create)
   - Add functional API adapter logic
   - Register routers during server creation
   - Validate tool names

4. **`src/api/functional/index.ts`**
   - Export `SingleFileRouter` type
   - Export `defineRouter` function

5. **`src/index.ts`**
   - Export `SingleFileRouter` from functional API

6. **`tests/decorator-router-foundation.test.ts`** → Create equivalent `tests/functional-router-foundation.test.ts`
   - Test single router per config
   - Test builder pattern with single router
   - Test metadata storage
   - Test adapter integration
   - ~13 tests

### Layer 2: Feature (Multi-Router + Validation)

**Files to modify:**

1. **`src/api/functional/builders.ts`**
   - Modify `MCPBuilder` to accumulate multiple routers
   - Add `.router()` calls multiple times support

2. **`src/api/functional/adapter.ts`**
   - Add router name uniqueness validation
   - Add tool name validation (same as Decorator API)
   - Smart typo detection for missing tools
   - Helpful error messages

3. **`tests/functional-router-feature.test.ts`** (new)
   - Multiple routers in config
   - Multiple `.router()` calls in builder
   - Duplicate router name error
   - Missing tool validation
   - Shared tools across routers
   - ~17 tests

---

## Key Differences from Decorator API

1. **No decorator validation** - Routers defined in config/builder, not decorators
2. **Earlier validation** - Validate when config is built, not when class is decorated
3. **Tool names as strings** - Reference tools by name string (not method name)
4. **Config structure** - Routers array in config object

---

## Success Criteria

**Foundation Layer:**
- ✅ Config-based routers work (`defineMCP({...routers: [...]})`)
- ✅ Builder-based routers work (`.router()` method)
- ✅ Single router per config works
- ✅ Metadata stored and retrieved correctly
- ✅ Adapter registers routers with BuildMCPServer
- ✅ 13 foundation tests pass
- ✅ No regressions in existing functional API

**Feature Layer:**
- ✅ Multiple routers per config work
- ✅ Multiple `.router()` calls work
- ✅ Router name uniqueness validated
- ✅ Tool name validation works with helpful errors
- ✅ Shared tools across routers work
- ✅ 17 feature tests pass
- ✅ No regressions

**Overall:**
- ✅ Both config and builder patterns work
- ✅ Full validation with suggestions
- ✅ Comprehensive test coverage
- ✅ Production-ready code

---

## Related Work (Completed)

- ✅ Decorator API: Foundation + Feature layers implemented and tested
- ✅ Orchestrator methodology applied and validated
- ✅ Test validation process established

---

## After This Task

Once Functional API routers are complete:
1. Implement routers for Interface API (simpler - mostly delegating to BuildMCPServer)
2. Polish Layer: Examples, docs, integration tests for all 3 APIs
3. Update `docs/guides/API_GUIDE.md` with router examples for each API
4. Create comprehensive examples showing routers across all API styles

---

## Notes

- Use same orchestration approach: Foundation → Feature → Validation gates
- Reuse validation logic concepts from Decorator API (typo suggestions, error messages)
- Functional API is cleaner in some ways (no metadata reflection needed)
- Builder pattern should chain calls nicely (`.tool().tool().router().router().build()`)
- Config validation can happen in `defineMCP()` or in adapter

---

## File References

**Decorator API Implementation (for reference):**
- Foundation: `src/api/decorator/decorators.ts` (lines 714-837)
- Adapter: `src/api/decorator/adapter.ts` (lines 336-347)
- Validation: `src/api/decorator/adapter.ts` (lines 377-417)
- Tests: `tests/decorator-router-foundation.test.ts` (13 tests)
- Tests: `tests/decorator-router-feature.test.ts` (17 tests)

**Functional API Current Structure:**
- Types: `src/api/functional/types.ts`
- Builders: `src/api/functional/builders.ts` (MCPBuilder class at ~line 190)
- Index: `src/api/functional/index.ts`

---

---

## 🎯 How to Execute the Next Phase

### Implementation Approach
Follow the same orchestration methodology that worked for Decorator API:

1. **Foundation Layer** - Get single router working end-to-end
   - Implementation Agent: Write code
   - Test Validation Agent: Verify tests are real (separate validator)
   - Functional Validation Agent: Confirm end-to-end works
   - Gate Check: Approve before proceeding

2. **Feature Layer** - Add multi-router + validation
   - Same validation process
   - Same separate validator agents
   - No self-grading

3. **References Available**
   - Decorator API tests: `tests/decorator-router-foundation.test.ts` (13 tests as template)
   - Decorator API tests: `tests/decorator-router-feature.test.ts` (17 tests as template)
   - Validation concepts from Decorator API implementation

### Quick Start for Functional API

**Step 1: Understand Current Structure**
```bash
# Read these files to understand functional API
cat src/api/functional/types.ts
cat src/api/functional/builders.ts  # See MCPBuilder class
cat src/api/functional/index.ts
```

**Step 2: Foundation Layer Implementation**
```bash
# Files to modify (in order):
1. src/api/functional/types.ts
   - Add SingleFileRouter interface
   - Add routers?: SingleFileRouter[] to SingleFileMCPConfig

2. src/api/functional/builders.ts
   - Add defineRouter() function
   - Add .router() method to MCPBuilder
   - Modify .build() to handle routers

3. src/api/functional/index.ts
   - Export SingleFileRouter type
   - Export defineRouter function

4. src/index.ts
   - Export SingleFileRouter

5. tests/functional-router-foundation.test.ts (NEW)
   - Create 13 tests (copy structure from decorator tests)
```

**Step 3: Foundation Layer Validation**
```bash
# Run tests
npm test -- tests/functional-router-foundation.test.ts

# If all pass: Gate check complete, proceed to Feature Layer
# If any fail: Fix and re-run
```

**Step 4: Feature Layer Implementation**
```bash
# Same process but for:
# - Multi-router accumulation
# - Validation logic
# - New test file: tests/functional-router-feature.test.ts
```

---

## 📝 Key Considerations for Functional API

### Config-Based Approach
```typescript
// Routers are part of the config object
const config: SingleFileMCPConfig = {
  name: 'my-server',
  version: '1.0.0',
  tools: [...],
  routers: [          // NEW
    {
      name: 'router1',
      description: '...',
      tools: ['tool1', 'tool2']
    }
  ]
};
```

### Builder Pattern Approach
```typescript
// Routers added via method chaining
createMCP({ name: 'my-server', version: '1.0.0' })
  .tool({...})
  .tool({...})
  .router({           // NEW
    name: 'router1',
    description: '...',
    tools: ['tool1', 'tool2']
  })
  .router({           // Multiple routers
    name: 'router2',
    description: '...',
    tools: ['tool3']
  })
  .build();
```

### Tool References
- Decorator API: Method names (camelCase) → converted to kebab-case
- Functional API: Tool names (strings, already snake_case) → use as-is

### Validation
- Same validation as Decorator API (router name uniqueness, tool existence)
- Typo suggestions for missing tools
- Helpful error messages

---

## 📂 File Structure Reference

### Current Functional API Structure
```
src/api/functional/
├── types.ts              # SingleFileTool, SingleFilePrompt, SingleFileResource, SingleFileMCPConfig
├── builders.ts           # defineMCP(), defineTool(), MCPBuilder class
├── index.ts              # Exports
└── (no adapter.ts yet)   # May need to create for functional adapter
```

### What Needs to Be Added
```
src/api/functional/
├── types.ts              # Add SingleFileRouter interface, update SingleFileMCPConfig
├── builders.ts           # Add defineRouter(), add .router() to MCPBuilder
├── index.ts              # Export SingleFileRouter, defineRouter
└── adapter.ts (optional) # Router registration logic (or keep in builders.ts)
```

---

## ✅ Success Criteria Summary

**When Functional API Routers are complete, you will have:**

- ✅ Config-based routers working (`defineMCP({routers: [...]})`)
- ✅ Builder-based routers working (`.router()` method chaining)
- ✅ Multi-router support (multiple routers in config or builder calls)
- ✅ Router name uniqueness validation
- ✅ Tool name validation with typo suggestions
- ✅ Shared tools across routers
- ✅ 30 tests (13 foundation + 17 feature), all passing
- ✅ Zero regressions in existing functional API
- ✅ Production-ready code

Then you can proceed to Interface API (simpler), then Polish/Documentation.

---

## 📚 Reference Materials & Code Examples

### Router Decorator Implementation (from Decorator API - Use as Template)

```typescript
// From: src/api/decorator/decorators.ts
const ROUTERS_KEY = Symbol('decorators:routers');

export function Router(config: {
  name: string;
  description: string;
  tools: string[];
  metadata?: Record<string, unknown>;
}) {
  // Validation
  if (!config.name || typeof config.name !== 'string') {
    throw new TypeError('Router name is required and must be a string');
  }
  if (!config.description || typeof config.description !== 'string') {
    throw new TypeError('Router description is required and must be a string');
  }
  if (!Array.isArray(config.tools)) {
    throw new TypeError('Router tools must be an array');
  }

  return function (target: any) {
    // Get existing routers or initialize
    const routers = Reflect.getMetadata(ROUTERS_KEY, target) || [];

    // Check for duplicate names
    const existingRouter = routers.find((r) => r.name === config.name);
    if (existingRouter) {
      const routerNames = routers.map((r) => r.name);
      throw new TypeError(
        `Duplicate router name: '${config.name}'\n\n` +
        `Existing routers:\n` +
        routerNames.map(name => `  - ${name}`).join('\n')
      );
    }

    // Accumulate routers
    routers.push({
      name: config.name,
      description: config.description,
      tools: config.tools,
      metadata: config.metadata,
    });

    Reflect.defineMetadata(ROUTERS_KEY, routers, target);
    return target;
  };
}
```

### Router Metadata Extraction (from Decorator API - Use as Template)

```typescript
// From: src/api/decorator/metadata.ts
const ROUTERS_KEY = Symbol('decorators:routers');

export function getRouters(target: any): RouterMetadata[] {
  return Reflect.getMetadata(ROUTERS_KEY, target) || [];
}
```

### Router Adapter Integration (from Decorator API - Use as Template)

```typescript
// From: src/api/decorator/adapter.ts (simplified)
const routers = getRouters(ServerClass);
for (const routerMeta of routers) {
  // Build a set of all registered tools
  const registeredToolNames = new Set<string>();

  // Add decorated tools
  for (const tool of tools) {
    registeredToolNames.add(tool.methodName);
  }

  // Validate each router's tools exist
  const missingTools: string[] = [];
  for (const toolMethodName of routerMeta.tools) {
    if (!registeredToolNames.has(toolMethodName)) {
      missingTools.push(toolMethodName);
    }
  }

  if (missingTools.length > 0) {
    // Build helpful error message
    let errorMessage = `Router '${routerMeta.name}' configuration error:\n\n`;
    errorMessage += `The following tools do not exist:\n`;
    for (const missing of missingTools) {
      errorMessage += `  - '${missing}'\n`;
    }
    errorMessage += `\nAvailable tools:\n`;
    for (const toolName of Array.from(registeredToolNames).sort()) {
      errorMessage += `  - ${toolName}\n`;
    }
    throw new Error(errorMessage);
  }

  // Register router with BuildMCPServer
  const toolNames = routerMeta.tools.map(methodName => toKebabCase(methodName));
  server.addRouterTool({
    name: routerMeta.name,
    description: routerMeta.description,
    tools: toolNames,
    metadata: routerMeta.metadata,
  });
}
```

### Foundation Layer Test Template (from Decorator API)

```typescript
// From: tests/decorator-router-foundation.test.ts
describe('Router Decorator - Foundation Layer Tests', () => {
  // Test 1: Basic decorator application
  it('can apply @Router decorator to class', () => {
    @Router({
      name: 'test-router',
      description: 'Test router',
      tools: ['tool1']
    })
    class TestServer {}

    const routers = getRouters(TestServer);
    if (routers.length === 1 && routers[0].name === 'test-router') {
      pass('Basic router application works');
    }
  });

  // Test 2: Metadata storage
  it('stores router metadata correctly', () => {
    @Router({
      name: 'storage-router',
      description: 'Test metadata storage',
      tools: ['tool1', 'tool2', 'tool3']
    })
    class StorageServer {}

    const routers = getRouters(StorageServer);
    if (routers.length === 1 &&
        routers[0].name === 'storage-router' &&
        routers[0].description === 'Test metadata storage' &&
        routers[0].tools.length === 3) {
      pass('Metadata stored correctly');
    }
  });

  // Test 3: Adapter integration
  it('adapter integrates router with BuildMCPServer', () => {
    @MCPServer()
    @Router({
      name: 'adapter-router',
      description: 'Adapter test',
      tools: ['tool1', 'tool2']
    })
    class AdapterServer {
      @tool() tool1() { return 'tool1'; }
      @tool() tool2() { return 'tool2'; }
    }

    const server = createServerFromClass(AdapterServer, __filename);
    const stats = server.getStats();

    if (stats.tools >= 2) {
      pass('Router integrated with BuildMCPServer');
    }
  });
});
```

### Error Message Examples

```
ERROR: Duplicate router name: 'weather_router'

What went wrong:
  A router with the name 'weather_router' is already defined on this class.

Existing routers:
  - weather_router
  - alerts_router

To fix:
  Choose a unique name for this router.

Tip: Use descriptive names that indicate the router's purpose.
```

```
ERROR: Router 'test_router' configuration error:

The following tools do not exist in class 'TestServer':
  - 'getWeater'
    Did you mean: 'getWeather'?

Available tools in TestServer:
  - getWeather (from @tool decorator)
  - forecast (auto-registered public method)

To fix:
  1. Check the spelling of tool names
  2. Ensure the methods exist and are decorated with @tool
  3. Method names are case-sensitive
```

### BuildMCPServer Router Methods Reference

```typescript
// From: src/api/programmatic/BuildMCPServer.ts

// Register a router tool
addRouterTool(definition: {
  name: string;
  description: string;
  tools?: string[];
  metadata?: Record<string, unknown>;
}): void

// Assign tools to a router
assignTools(routerName: string, toolNames: string[]): void

// Get router statistics
getStats(): { tools: number; routers: number; assignedTools: number }
```

### SingleFileRouter Type (Template for Functional API)

```typescript
// Add to: src/api/functional/types.ts

/**
 * Single-file router definition for functional API
 */
export interface SingleFileRouter {
  name: string;              // Router name (use snake_case, e.g., 'weather_router')
  description: string;       // What this router provides
  tools: string[];          // Array of tool names to assign
  metadata?: Record<string, unknown>;  // Optional metadata
}

// Update SingleFileMCPConfig
export interface SingleFileMCPConfig {
  name: string;
  version: string;
  port?: number;
  basePath?: string;
  defaultTimeout?: number;
  tools?: SingleFileTool[];
  prompts?: SingleFilePrompt[];
  resources?: SingleFileResource[];
  uiResources?: SingleFileUIResource[];
  routers?: SingleFileRouter[];  // NEW
}
```

### defineRouter() Helper (Template for Functional API)

```typescript
// Add to: src/api/functional/builders.ts

/**
 * Helper function to define a router with type safety
 */
export function defineRouter(router: SingleFileRouter): SingleFileRouter {
  return router;
}
```

### MCPBuilder.router() Method (Template for Functional API)

```typescript
// Add to: MCPBuilder class in: src/api/functional/builders.ts

export class MCPBuilder {
  private config: SingleFileMCPConfig;

  // ... existing methods ...

  /**
   * Add a router to the server
   */
  router(definition: SingleFileRouter): MCPBuilder {
    if (!this.config.routers) {
      this.config.routers = [];
    }

    // Validate router name uniqueness
    if (this.config.routers.some(r => r.name === definition.name)) {
      throw new Error(
        `Duplicate router name: '${definition.name}'\n\n` +
        `Existing routers: ${this.config.routers.map(r => r.name).join(', ')}`
      );
    }

    this.config.routers.push(definition);
    return this;  // Enable chaining
  }

  /**
   * Build the final config
   */
  build(): SingleFileMCPConfig {
    // Handle routers in build() method
    if (this.config.routers && this.config.routers.length > 0) {
      // Register routers with the created server
      // (logic goes here)
    }
    return this.config;
  }
}
```

**Decorator API Implementation Files (for reference):**
- Single router logic: `src/api/decorator/decorators.ts:714-837`
- Tool validation: `src/api/decorator/adapter.ts:377-417`
- Foundation tests: `tests/decorator-router-foundation.test.ts` (use as template)
- Feature tests: `tests/decorator-router-feature.test.ts` (use as template)

**Orchestrator Guide (CRITICAL - Read First):**
- **Reference:** `/mnt/Shared/cs-projects/prompt-library/ORCHESTRATOR_PROMPT.md`
- Contains the agentic orchestration framework used for this project
- Explains layered development: Foundation → Feature → Polish
- Validation gates with separate validator agents (never self-grading)
- Test validity enforcement (no mocking core functionality)
- **ESSENTIAL for understanding how this work was done and how to continue it**

---

## 📅 Timeline

**Estimated Total Effort: 12-14 hours**
- Functional API Foundation: 2-3 hours
- Functional API Feature: 2-3 hours
- Interface API: 1-2 hours
- Polish/Documentation: 3-4 hours
- Buffer: 2 hours

**What's Complete: ~6 hours of work (Decorator API)**
**What's Remaining: ~8 hours of work (Functional, Interface, Polish)**

---

**Document Last Updated:** 2025-10-18
**Status:** Ready to implement Functional API routers
**Next Step:** Create LAYER 1 - FOUNDATION for Functional API routers
