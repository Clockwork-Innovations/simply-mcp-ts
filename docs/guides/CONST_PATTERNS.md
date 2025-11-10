# Const-Based API Patterns

Complete guide to using const-based patterns in Simply MCP servers.

## Table of Contents

- [Overview](#overview)
- [Benefits](#benefits)
- [Quick Comparison](#quick-comparison)
- [Server Configuration](#server-configuration)
- [Tools](#tools)
- [Prompts](#prompts)
- [Resources](#resources)
- [UIs](#uis)
- [Routers](#routers)
- [Authentication](#authentication)
- [Completions](#completions)
- [Roots](#roots)
- [Subscriptions](#subscriptions)
- [Export Patterns](#export-patterns)
- [Migration Guide](#migration-guide)
- [Best Practices](#best-practices)
- [When to Use Each Pattern](#when-to-use-each-pattern)

---

## Overview

Simply MCP supports two API patterns for defining MCP servers:

1. **Class-based pattern** (traditional) - Uses classes with properties
2. **Const-based pattern** (v4.0+) - Uses const declarations with type helpers

Both patterns are fully supported and can be mixed in the same server. Const patterns provide a simpler, more functional approach with less boilerplate.

### Key Differences

| Aspect | Class Pattern | Const Pattern |
|--------|--------------|---------------|
| **Declaration** | `export default class Server { }` | `const server: IServer = { }` |
| **State** | Instance properties (`this.x`) | Closures or external state |
| **Boilerplate** | More (class declaration) | Less (direct const) |
| **Style** | Object-oriented | Functional |
| **Type Safety** | Property inference | Helper type inference |

---

## Benefits

### Why Use Const Patterns?

1. **Less Boilerplate**
   ```typescript
   // Class pattern - more code
   export default class Server {
     greet: GreetTool = async (params) => { ... }
   }

   // Const pattern - less code
   const greet: ToolHelper<GreetTool> = async (params) => { ... }
   export { greet };
   ```

2. **Simpler Syntax**
   - No class declaration needed
   - Direct const assignments
   - Clear, explicit intent

3. **No Interface Extension Needed**
   ```typescript
   // Can use base interfaces directly
   const ui: IUI = { source: '...' };

   // Or extend for extra type safety
   interface MyUI extends IUI { ... }
   const ui: MyUI = { source: '...' };
   ```

4. **Better TypeScript Inference**
   ```typescript
   // Helper types provide full inference
   const add: ToolHelper<AddTool> = async (params) => {
     // params is fully typed (params.a, params.b)
     // return type is inferred from AddTool
   };
   ```

5. **More Functional Programming Style**
   - Each primitive is a pure function
   - Easier to test in isolation
   - Composable patterns
   - Better for stateless operations

6. **Clearer Intent**
   ```typescript
   const server: IServer = { ... }        // "This is a server config"
   const add: ToolHelper<AddTool> = ...   // "This implements AddTool"
   const ui: IUI = { ... }                 // "This is a UI"
   ```

---

## Quick Comparison

### Class Pattern vs Const Pattern

**Class Pattern (Traditional):**
```typescript
import type { IServer, ITool, IParam } from 'simply-mcp';

interface NameParam extends IParam {
  type: 'string';
  description: 'Name to greet';
}

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone';
  params: { name: NameParam };
  result: { greeting: string };
}

const server: IServer = {
  name: 'my-server',
  version: '1.0.0'
};

export default class Server {
  greet: GreetTool = async (params) => {
    return { greeting: `Hello, ${params.name}!` };
  };
}
```

**Const Pattern (v4.0+):**
```typescript
import type { IServer, ITool, IParam, ToolHelper } from 'simply-mcp';

interface NameParam extends IParam {
  type: 'string';
  description: 'Name to greet';
}

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone';
  params: { name: NameParam };
  result: { greeting: string };
}

const server: IServer = {
  name: 'my-server',
  version: '1.0.0'
};

const greet: ToolHelper<GreetTool> = async (params) => {
  return { greeting: `Hello, ${params.name}!` };
};

export { server, greet };
```

**Differences:**
- No class declaration
- Uses `ToolHelper<T>` type
- Named exports instead of class export
- Same interface definitions (compatible!)

---

## Server Configuration

### Const Pattern (Recommended for All Servers)

Server configuration should always use const pattern, even in class-based servers.

```typescript
import type { IServer } from 'simply-mcp';

const server: IServer = {
  name: 'my-server',
  version: '1.0.0',
  description: 'My MCP server',
  flattenRouters: false  // Optional
};

export { server };
```

### With Inline Authentication

```typescript
const server: IServer = {
  name: 'my-server',
  version: '1.0.0',

  // Inline API Key authentication
  auth: {
    type: 'apiKey',
    headerName: 'X-API-Key',
    keys: [
      {
        name: 'admin',
        key: 'admin-secret-key',
        permissions: ['read', 'write', 'admin']
      }
    ]
  }
};
```

See [Authentication](#authentication) section for all auth types.

---

## Tools

### Helper Pattern (Recommended)

**Pattern:**
```typescript
const toolName: ToolHelper<ToolInterface> = async (params) => {
  // Implementation
  return result;
};
```

**Full Example:**
```typescript
import type { ITool, IParam, ToolHelper } from 'simply-mcp';

// 1. Define parameters
interface NumberParam extends IParam {
  type: 'number';
  description: 'A number';
}

// 2. Define tool interface
interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: {
    a: NumberParam;
    b: NumberParam;
  };
  result: {
    sum: number;
  };
}

// 3. Implement with const
const add: ToolHelper<AddTool> = async (params) => {
  // params.a and params.b are typed as numbers
  return {
    sum: params.a + params.b
  };
};

export { add };
```

**Benefits:**
- Full type inference for `params` and return type
- No class needed
- Clean, functional style
- Easy to test

### Alternative: Bare Interface Pattern

You can also assign directly to the interface type:

```typescript
const add: AddTool = async (params) => {
  return { sum: params.a + params.b };
};
```

**Note:** `ToolHelper<T>` is preferred for better type inference.

---

## Prompts

### Helper Pattern

**Pattern:**
```typescript
const promptName: PromptHelper<PromptInterface> = (args) => {
  // Generate prompt text
  return promptText;
};
```

**Full Example:**
```typescript
import type { IPrompt, PromptHelper } from 'simply-mcp';

interface SummarizePrompt extends IPrompt {
  name: 'summarize';
  description: 'Summarize text';
  args: {
    text: { description: 'Text to summarize' };
    style: {
      description: 'Summary style';
      enum: ['brief', 'detailed'];
      required: false;
    };
  };
}

const summarize: PromptHelper<SummarizePrompt> = (args) => {
  // args.text is typed as string
  // args.style is typed as 'brief' | 'detailed' | undefined
  const style = args.style || 'brief';

  return `Summarize this ${style}ly: ${args.text}`;
};

export { summarize };
```

**Benefits:**
- Full type inference for args
- Simple function implementation
- No class needed

---

## Resources

### Static Resources (No Implementation Needed)

For compile-time literal data:

```typescript
import type { IResource } from 'simply-mcp';

interface ConfigResource extends IResource {
  uri: 'config://app';
  name: 'App Config';
  mimeType: 'application/json';
  value: {
    version: '1.0.0';
    features: ['auth', 'caching'];
  };
}

// No implementation needed - framework serves it automatically
```

**Use when:**
- Data is small (< 20 lines)
- Data never changes
- You want compile-time validation

### Dynamic Resources (Const Implementation)

For runtime data:

```typescript
import type { IResource, ResourceHelper } from 'simply-mcp';

interface StatsResource extends IResource {
  uri: 'stats://server';
  name: 'Server Stats';
  mimeType: 'application/json';
  returns: {
    uptime: number;
    requests: number;
  };
}

const stats: ResourceHelper<StatsResource> = async () => {
  return {
    uptime: process.uptime(),
    requests: getRequestCount()  // Can access variables, call functions
  };
};

export { stats };
```

**Use when:**
- Data comes from variables/constants
- Data needs computation
- Data changes at runtime
- Data is large or complex

---

## UIs

### Base IUI Pattern (Simplest)

```typescript
import type { IUI } from 'simply-mcp';

const dashboard: IUI = {
  source: `
    <div style="padding: 2rem;">
      <h1>Dashboard</h1>
      <p>Simple UI example</p>
    </div>
  `
};

export { dashboard };
```

### Extended Interface Pattern (More Type Safety)

```typescript
import type { IUI } from 'simply-mcp';

interface DashboardUI extends IUI {
  uri: 'ui://dashboard';
  name: 'Dashboard';
  description: 'Main dashboard';
  source: string;
  tools: ['refresh'];
}

const dashboard: DashboardUI = {
  source: `
    <div style="padding: 2rem;">
      <h1>Dashboard</h1>
      <button onclick="window.mcpTools?.refresh()">Refresh</button>
    </div>
  `
};

export { dashboard };
```

**Benefits:**
- Simple object literal
- No class needed
- Direct source assignment

---

## Routers

### Const Router Pattern

**Pattern:**
```typescript
const routerName: RouterInterface = {
  name: 'router_name',
  description: 'Router description',
  tools: ['tool1', 'tool2']
};
```

**Full Example:**
```typescript
import type { IToolRouter, ITool, ToolHelper } from 'simply-mcp';

// 1. Define router tools
interface GetWeatherTool extends ITool {
  name: 'get_weather';
  // ...
}

interface GetForecastTool extends ITool {
  name: 'get_forecast';
  // ...
}

// 2. Define router interface
interface WeatherRouter extends IToolRouter {
  name: 'weather';
  description: 'Weather tools';
  tools: ['get_weather', 'get_forecast'];
}

// 3. Implement router (simple object literal)
const weatherRouter: WeatherRouter = {
  name: 'weather',
  description: 'Weather tools',
  tools: ['get_weather', 'get_forecast']
};

// 4. Implement router tools
const getWeather: ToolHelper<GetWeatherTool> = async (params) => {
  // Implementation
};

const getForecast: ToolHelper<GetForecastTool> = async (params) => {
  // Implementation
};

export { weatherRouter, getWeather, getForecast };
```

**Benefits:**
- Clean router definition
- Clear tool grouping
- No class needed

---

## Authentication

### Inline API Key Auth

```typescript
const server: IServer = {
  name: 'my-server',
  version: '1.0.0',

  auth: {
    type: 'apiKey',
    headerName: 'X-API-Key',
    allowAnonymous: false,
    keys: [
      {
        name: 'admin',
        key: 'admin-secret-key',
        permissions: ['read', 'write', 'admin']
      },
      {
        name: 'readonly',
        key: 'readonly-key',
        permissions: ['read']
      }
    ]
  }
};
```

### Inline OAuth2 Auth

```typescript
const server: IServer = {
  name: 'my-server',
  version: '1.0.0',

  auth: {
    type: 'oauth2',
    issuerUrl: 'https://auth.example.com',
    clients: [
      {
        clientId: 'web-client',
        clientSecret: 'web-secret',
        redirectUris: ['http://localhost:3000/callback'],
        scopes: ['read', 'write'],
        name: 'Web Application'
      }
    ],
    tokenExpiration: 3600,
    refreshTokenExpiration: 86400,
    codeExpiration: 300
  }
};
```

**Benefits:**
- No separate auth interface needed
- All auth config in one place
- Supports all auth types (apiKey, oauth2, database, custom)

---

## Completions

### Helper Pattern

```typescript
import type { ICompletion, IParam, CompletionHelper } from 'simply-mcp';

interface PartialParam extends IParam {
  type: 'string';
  description: 'Partial text to complete';
}

interface CityCompletion extends ICompletion {
  name: 'city_completion';
  description: 'Autocomplete city names';
  args: {
    partial: PartialParam;
  };
}

const cityComplete: CompletionHelper<CityCompletion> = async (args) => {
  const cities = ['New York', 'Los Angeles', 'Chicago'];
  const matches = cities.filter(city =>
    city.toLowerCase().startsWith(args.partial.toLowerCase())
  );

  return {
    values: matches,
    total: matches.length,
    hasMore: false
  };
};

export { cityComplete };
```

**Benefits:**
- Type inference for args
- Simple const assignment
- Clean function implementation

---

## Roots

### Const Pattern

```typescript
import type { IRoots } from 'simply-mcp';

interface ProjectRoots extends IRoots {
  name: 'project_roots';
  description: 'Project directory roots';
}

const projectRoots: ProjectRoots = async () => {
  return {
    roots: [
      {
        uri: 'file:///home/user/projects',
        name: 'Projects'
      },
      {
        uri: 'file:///home/user/documents',
        name: 'Documents'
      }
    ]
  };
};

export { projectRoots };
```

**Benefits:**
- Simple const assignment
- Direct function implementation

---

## Subscriptions

### Const Pattern

```typescript
import type { ISubscription } from 'simply-mcp';

interface ConfigSubscription extends ISubscription {
  uri: 'config://server';
  description: 'Server config updates';
}

const configSub: ConfigSubscription = async () => {
  return {
    uri: 'config://server',
    mimeType: 'application/json',
    text: JSON.stringify({
      version: '1.0.0',
      timestamp: new Date().toISOString()
    })
  };
};

export { configSub };
```

**Benefits:**
- Simple const assignment
- Direct function implementation

---

## Export Patterns

### Named Exports (Recommended)

```typescript
// Define implementations
const server: IServer = { ... };
const greet: ToolHelper<GreetTool> = async (params) => { ... };

// Export by name
export { server, greet };
```

**Benefits:**
- Explicit and clear
- Fully supported by compiler
- Tree-shakeable
- IDE-friendly

### Export Default Class (Traditional)

```typescript
export default class Server {
  greet: GreetTool = async (params) => { ... };
}
```

**Use when:**
- You need shared state
- You prefer class-based style

### Mixed Exports (Supported)

```typescript
// Const server config
const server: IServer = { ... };
export { server };

// Class for stateful tools
export default class Server {
  greet: GreetTool = async (params) => { ... };
}
```

### Export Default Object (NOT Supported)

```typescript
// ❌ NOT SUPPORTED - Don't use this
export default {
  server,
  greet
};
```

**Workaround:** Use named exports instead.

See [examples/const-patterns/export-patterns.ts](../../examples/const-patterns/export-patterns.ts) for detailed examples.

---

## Migration Guide

### From Class to Const

If you have an existing class-based server and want to migrate:

#### Step 1: Start with Server Config

**Before:**
```typescript
const server: IServer = { ... };

export default class Server {
  // tools here
}
```

**After:**
```typescript
const server: IServer = { ... };

// Server config stays the same!
export { server };
```

#### Step 2: Extract Stateless Tools

**Before (in class):**
```typescript
export default class Server {
  echo: EchoTool = async (params) => {
    return { message: params.message };
  };
}
```

**After (const):**
```typescript
const echo: ToolHelper<EchoTool> = async (params) => {
  return { message: params.message };
};

export { echo };
```

#### Step 3: Keep Stateful Tools in Class

If tools need shared state, keep them in a class:

```typescript
// Keep stateful tools in class
export default class Server {
  private counter = 0;

  increment: IncrementTool = async () => {
    this.counter++;
    return { count: this.counter };
  };
}
```

#### Step 4: Gradually Migrate

- One tool at a time
- Test after each change
- No rush - both patterns work together!

#### Step 5: Final State

```typescript
const server: IServer = { ... };

// Const for stateless tools
const echo: ToolHelper<EchoTool> = async (params) => { ... };
const greet: ToolHelper<GreetTool> = async (params) => { ... };

// Class only for stateful operations
export default class Server {
  private counter = 0;

  increment: IncrementTool = async () => {
    this.counter++;
    return { count: this.counter };
  };
}

export { server, echo, greet };
```

See [examples/const-patterns/mixed-patterns.ts](../../examples/const-patterns/mixed-patterns.ts) for complete example.

---

## Troubleshooting TypeScript Errors

### Problem 1: "Type 'X' is not assignable to type 'Y'"

**Symptom:**
```typescript
interface AddTool extends ITool {
  params: { a: NumberParam; b: NumberParam };
  result: number;
}

const add: AddTool = async (params) => {  // ❌ Type error!
  return params.a + params.b;
};
```

**Error Message:**
```
error TS2322: Type '(params: any) => Promise<number>' is not assignable to type 'AddTool'
```

**Solution:** Use `ToolHelper` for automatic type inference:
```typescript
const add: ToolHelper<AddTool> = async (params) => {  // ✅ Works!
  return params.a + params.b;  // params.a and params.b are typed as number
};
```

**Why?** `ToolHelper` automatically:
1. Infers `params` type from `AddTool['params']`
2. Handles optional parameters (`required: false`)
3. Maps IParam types to TypeScript types (NumberParam → number)
4. Validates return type matches `AddTool['result']`

---

### Problem 2: "Property 'x' does not exist on type 'Y'"

**Symptom:**
```typescript
const greet: GreetTool = async (params) => {
  return `Hello, ${params.name}!`;  // ❌ Property 'name' does not exist
};
```

**Solution:** Use `ToolHelper` wrapper:
```typescript
const greet: ToolHelper<GreetTool> = async (params) => {
  return `Hello, ${params.name}!`;  // ✅ Works! 'name' is inferred from GreetTool
};
```

---

### Problem 3: Implicit 'any' errors in strict mode

**Symptom:**
```typescript
const process: ProcessTool = async (params) => {  // ❌ Parameter 'params' implicitly has an 'any' type
  return { status: 'ok' };
};
```

**Solution:** Use helper types that provide full type inference:
```typescript
const process: ToolHelper<ProcessTool> = async (params) => {  // ✅ No implicit any!
  return { status: 'ok' };
};
```

---

### Problem 4: Complex nested parameter types

**Symptom:**
```typescript
interface ComplexTool extends ITool {
  params: {
    user: ObjectParam<{
      name: StringParam;
      tags: ArrayParam<StringParam>;
    }>;
  };
  result: string;
}

// Hard to type manually
const complex: ComplexTool = async (params) => {
  // What's the type of params.user? params.user.tags?
};
```

**Solution:** `ToolHelper` handles nested types automatically:
```typescript
const complex: ToolHelper<ComplexTool> = async (params) => {
  // params.user is typed as { name: string; tags: string[] }
  console.log(params.user.name);     // ✅ string
  console.log(params.user.tags[0]);  // ✅ string
  return 'processed';
};
```

---

### Pattern Comparison: When to use each?

| Pattern | Best For | Type Safety | Strictness |
|---------|----------|-------------|------------|
| **ToolHelper** | Max type safety, complex params | Full inference | Works with `strict: true` |
| **Bare Interface** | Simple tools, quick prototypes | Manual typing | Requires `strict: false` |

**Recommendation:** Use `ToolHelper`, `PromptHelper`, and `ResourceHelper` for all new code unless you're:
- Building quick prototypes
- Using simple parameter types (string, number, boolean)
- Working in a codebase with `strict: false`

See [examples/troubleshooting/](../../examples/troubleshooting/) for complete working examples.

---

## Best Practices

### 1. Use Named Exports

```typescript
// ✅ Good - named exports
export { server, greet, welcome };

// ❌ Avoid - export default object (not supported)
export default { server, greet, welcome };
```

### 2. Server Config as Const

```typescript
// ✅ Always use const for server config
const server: IServer = {
  name: 'my-server',
  version: '1.0.0'
};
```

### 3. Choose Pattern Based on State Needs

```typescript
// ✅ Const for stateless
const echo: ToolHelper<EchoTool> = async (params) => { ... };

// ✅ Class for stateful
export default class Server {
  private cache = new Map();

  getData: GetDataTool = async () => {
    return this.cache.get('data');
  };
}
```

### 4. Organize File Structure

```typescript
// Recommended order:
// 1. Imports
import type { ... } from 'simply-mcp';

// 2. Server configuration
const server: IServer = { ... };

// 3. Parameter interfaces
interface NameParam extends IParam { ... }

// 4. Tool/Prompt/Resource interfaces
interface GreetTool extends ITool { ... }

// 5. Const implementations
const greet: ToolHelper<GreetTool> = async (params) => { ... };

// 6. Exports
export { server, greet };
```

### 5. Use Helper Types

```typescript
// ✅ Preferred - better inference
const greet: ToolHelper<GreetTool> = async (params) => { ... };

// ⚠️ Also works - but less type help
const greet: GreetTool = async (params) => { ... };
```

---

## When to Use Each Pattern

### Use Const Pattern When:

✅ **Tools are stateless**
```typescript
const echo: ToolHelper<EchoTool> = async (params) => {
  return { message: params.message };
};
```

✅ **Simple, pure functions**
```typescript
const add: ToolHelper<AddTool> = async (params) => {
  return { sum: params.a + params.b };
};
```

✅ **No shared state needed**
```typescript
const greet: ToolHelper<GreetTool> = async (params) => {
  return { greeting: `Hello, ${params.name}!` };
};
```

✅ **Prefer functional style**
```typescript
// Clean, composable functions
const validate = (data) => { ... };
const process: ToolHelper<ProcessTool> = async (params) => {
  const valid = validate(params.data);
  return { valid };
};
```

### Use Class Pattern When:

✅ **Need shared state**
```typescript
export default class Server {
  private counter = 0;

  increment: IncrementTool = async () => {
    this.counter++;
    return { count: this.counter };
  };
}
```

✅ **Complex initialization**
```typescript
export default class Server {
  private db: Database;

  constructor() {
    this.db = new Database();
    this.db.connect();
  }

  query: QueryTool = async (params) => {
    return this.db.query(params.sql);
  };
}
```

✅ **Multiple tools share data**
```typescript
export default class Server {
  private cache = new Map();

  set: SetTool = async (params) => {
    this.cache.set(params.key, params.value);
    return { success: true };
  };

  get: GetTool = async (params) => {
    return { value: this.cache.get(params.key) };
  };
}
```

### Decision Tree

```
Need shared state? (this.something)
  YES → Use class
  NO  → Use const

Need initialization logic? (constructor)
  YES → Use class
  NO  → Use const

Do multiple tools share data?
  YES → Use class
  NO  → Use const

Is it a pure function?
  YES → Use const
  NO  → Use class

Are you unsure?
  → Start with const, refactor to class if needed
```

### Mixed Approach (Best of Both Worlds)

```typescript
const server: IServer = { ... };

// Const for stateless tools
const echo: ToolHelper<EchoTool> = async (params) => { ... };

// Class for stateful tools
export default class Server {
  private cache = new Map();

  getData: GetDataTool = async () => {
    return this.cache.get('data');
  };
}

export { server, echo };
```

**Remember:** You can always mix both patterns!

---

## Examples

Complete working examples:

1. **[minimal-server.ts](../../examples/const-patterns/minimal-server.ts)**
   - Fully const-based server (no classes)
   - All primitives demonstrated
   - Inline authentication

2. **[all-primitives.ts](../../examples/const-patterns/all-primitives.ts)**
   - Reference for all const patterns
   - Detailed comments explaining each pattern
   - Benefits and use cases

3. **[mixed-patterns.ts](../../examples/const-patterns/mixed-patterns.ts)**
   - Mix const and class patterns
   - Migration guide
   - When to use each pattern

4. **[export-patterns.ts](../../examples/const-patterns/export-patterns.ts)**
   - Export pattern reference
   - What's supported vs not supported
   - Best practices

---

## See Also

- [Quick Start Guide](./QUICK_START.md) - Getting started
- [API Reference](./API_REFERENCE.md) - Complete API docs
- [Features Guide](./FEATURES.md) - All framework features
- [Examples](../../examples/) - Working code examples
