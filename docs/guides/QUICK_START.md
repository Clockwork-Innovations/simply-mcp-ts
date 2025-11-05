# Quick Start Guide

Get started with Simply MCP in 5 minutes.

## Installation

```bash
npm install simply-mcp
```

## Your First Server

Simply MCP uses pure TypeScript interfaces - the cleanest way to define MCP servers:

```typescript
// server.ts
import type { ITool, IParam, IServer } from 'simply-mcp';

// Define parameter interfaces
interface AParam extends IParam {
  type: 'number';
  description: 'First number to add';
}

interface BParam extends IParam {
  type: 'number';
  description: 'Second number to add';
}

// Define your tool interface
interface AddTool extends ITool {
  name: 'add';  // Optional - can be inferred from method name
  description: 'Add two numbers';
  params: { a: AParam; b: BParam };
  result: { sum: number };
}

// Define server metadata
const server: IServer = {
  name: 'calculator',
  version: '1.0.0',
  description: 'A simple calculator server'
};

// Implement the server
export default class CalculatorService {
  add: AddTool = async (params) => ({
    sum: params.a + params.b
  });
}
```

## Run Your Server

```bash
# Run with stdio (default)
npx simply-mcp run server.ts

# Run with HTTP
npx simply-mcp run server.ts --http --port 3000

# Watch mode (auto-restart on changes)
npx simply-mcp run server.ts --watch

# Validate without running
npx simply-mcp run server.ts --dry-run
```

## Complete Server Example

Here's a server using all MCP features together - tools, prompts, and resources:

```typescript
import type { IServer, ITool, IParam, IPrompt, IResource } from 'simply-mcp';

// Server configuration
const server: IServer = {
  name: 'my-app',
  version: '1.0.0',
  description: 'My application server'
};

// Tool parameter: Use IParam for validation
interface NameParam extends IParam {
  type: 'string';
  description: 'Person name to greet';
  minLength: 1;
  maxLength: 100;
}

// Tool: Always needs implementation
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone by name';
  params: { name: NameParam };
  result: { greeting: string };
}

// Prompt with type inference - single source of truth in arguments field
interface SummarizePrompt extends IPrompt {
  name: 'summarize';
  description: 'Summarize text';
  args: {
    text: { description: 'Text to summarize' };  // type: 'string', required: true by default
    style: {
      description: 'Summary style';
      enum: ['brief', 'detailed'];
      required: false;
    };
  };
}

// Another prompt example
interface ContextPrompt extends IPrompt {
  name: 'context';
  description: 'Context-aware prompt';
  args: {
    query: { description: 'Search query' };              // string, required
    style: { description: 'Response style'; required: false };  // string, optional
  };
}

// Static Resource: No implementation needed (has value)
interface ConfigResource extends IResource {
  uri: 'config://app';
  name: 'Config';
  mimeType: 'application/json';
  value: { version: '1.0.0' };
}

// Dynamic Resource: Needs implementation (has returns)
interface StatsResource extends IResource {
  uri: 'stats://data';
  name: 'Stats';
  mimeType: 'application/json';
  returns: { count: number };
}

// Implementation
export default class MyServer {
  // ✅ Tool - always implement
  greet: GreetTool = async (params) => ({
    greeting: `Hello ${params.name}!`
  });

  // ✅ Prompts - always implement (full type inference!)
  summarize: SummarizePrompt = (args) => {
    // args.text → string
    // args.style → 'brief' | 'detailed' | undefined
    const style = args.style || 'brief';
    return `Summarize this ${style}ly: ${args.text}`;
  };

  context: ContextPrompt = (args) => {
    // args.query → string
    // args.style → string | undefined
    const style = args.style || 'casual';
    return `Search for: ${args.query} (${style} style)`;
  };

  // ❌ Static resource - no implementation needed
  // Framework serves value field directly

  // ✅ Dynamic resource - implement with URI as property name
  'stats://data': StatsResource = async () => ({
    count: 42
  });
}
```

### Implementation Checklist

**What you need to implement:**
- ✅ **All tools** - Always required
- ✅ **All prompts** - Always required (no static prompts)
- ✅ **Dynamic resources** - With `returns` field
- ❌ **Static resources** - With `value` field (auto-handled)

### How Auto-Discovery Works

Simply MCP automatically discovers your interfaces - no manual registration needed:

**Automatic Detection:**
- All `ITool` interfaces → Registered as tools
- All `IPrompt` interfaces → Registered as prompts
- All `IResource` interfaces → Registered as resources

**No Registration Arrays Required:**
You don't need lists like `tools: [Tool1, Tool2]` - just define the interfaces and the framework finds them automatically.

**Verify with dry-run:**
```bash
npx simply-mcp run server.ts --dry-run
# Shows all detected tools, prompts, and resources
```

---

## Parameter Best Practices

### Always Use IParam Interfaces

**IMPORTANT:** All tool parameters must use `IParam` interfaces. This ensures:
- Automatic type coercion (strings → numbers, booleans)
- Proper validation and schema generation
- Better documentation for LLM tool calls

Always create separate interfaces using `extends IParam`. Do NOT use:
- Inline primitive types (e.g., `name: string`, `count: number`)
- Inline intersection types (e.g., `{...} & IParam`)

#### ✅ Correct Pattern (Always Use This)

```typescript
import type { ITool, IParam } from 'simply-mcp';

// ✅ CORRECT: Separate interface extending IParam
interface CountParam extends IParam {
  type: 'number';
  description: 'Number of items to process';
  min: 0;
  max: 1000;
}

interface ProcessTool extends ITool {
  name: 'process_items';
  description: 'Process items';
  params: {
    count: CountParam;  // Reference to separate interface
  };
  result: { processed: number };
}
```

#### ❌ Incorrect Patterns (Will Fail Validation)

**Pattern 1: Inline primitive types**
```typescript
import type { ITool } from 'simply-mcp';

interface ProcessTool extends ITool {
  name: 'process_items';
  description: 'Process items';
  params: {
    // ❌ BROKEN: Inline primitive type (no IParam)
    count: number;
  };
  result: { processed: number };
}
```

**Pattern 2: Inline intersection types**
```typescript
import type { ITool, IParam } from 'simply-mcp';

interface ProcessTool extends ITool {
  name: 'process_items';
  description: 'Process items';
  params: {
    // ❌ BROKEN: Inline intersection with IParam
    count: { type: 'number'; description: 'Item count' } & IParam;
  };
  result: { processed: number };
}
```

**Why These Fail:**
- Inline types and intersection types are NOT supported by the schema generator
- Type coercion won't be applied to number/boolean parameters
- Numbers will be received as STRINGS, breaking arithmetic operations
- Missing required description field for LLM documentation
- Dry-run validation will catch these errors and prevent running

**Validation:**
Simply MCP automatically validates parameter definitions during dry-run and will fail with a detailed error message if you use the incorrect pattern.

See [Validation Guide](./VALIDATION.md) for complete validation rules.

### TypeScript Type Checking

Simply MCP uses **AST parsing** to extract metadata from interfaces at compile-time. This means TypeScript's structural type checking will show warnings, but the code works correctly at runtime.

**Validation:**
- ✅ **Use:** `npx simply-mcp run server.ts --dry-run`
- ❌ **Don't use:** `tsc --noEmit` (shows expected structural warnings)

**Why warnings occur:**
- Interfaces define metadata (name, description, params, result)
- Implementations are callable functions
- TypeScript sees structural type mismatch (expected behavior)

These warnings are normal. The framework reads your interface definitions directly from source code via AST parsing, not through TypeScript's type system.

See [examples/README.md](../../examples/README.md) for detailed explanation of TypeScript compatibility.

### Type Coercion (v4.0.0+)

Simply MCP automatically converts parameter types from JSON-RPC strings:

```typescript
// Number parameters are automatically coerced
interface AddTool extends ITool {
  params: { a: NumberParam; b: NumberParam };
  result: { sum: number };
}

// Implementation receives actual numbers, not strings
add: AddTool = async (params) => {
  return { sum: params.a + params.b };  // 42 + 58 = 100 ✅
};
```

**Type Coercion Details:**
- Number parameters: `"42"` → `42`
- Boolean parameters: `"true"` → `true`
- String parameters: No coercion needed

See [API Reference - Type Coercion](./API_REFERENCE.md#type-coercion) for details.

---

## Reduce Boilerplate Further (Optional)

Simply MCP supports optional patterns to reduce boilerplate even more:

### 1. Tool Name Inference

Tool names can be inferred from method names - no explicit `name` needed:

```typescript
// Define parameter first
interface LocationParam extends IParam {
  type: 'string';
  description: 'Location to get weather for';
}

// ✅ Option A: Explicit name (traditional)
interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get weather data';
  params: { location: LocationParam };
  result: { weather: string };
}

// ✅ Option B: Inferred name (less boilerplate)
interface GetWeatherTool extends ITool {
  // name omitted - inferred from method name
  description: 'Get weather data';
  params: { location: LocationParam };
  result: { weather: string };
}

export default class WeatherServer {
  getWeather: GetWeatherTool = async (params) => {
    // Method name 'getWeather' → tool name 'get_weather' automatically
    return { weather: 'sunny' };
  };
}
```

### 2. Semantic Resource Names

Use clean method names instead of URI strings for resources:

```typescript
interface UserStatsResource extends IResource {
  uri: 'stats://users';
  name: 'User Stats';
  mimeType: 'application/json';
  returns: { count: number };
}

export default class Server {
  // ✅ Option A: Semantic method name (cleaner)
  userStats: UserStatsResource = async () => ({
    count: 42
  });

  // ✅ Option B: URI as property (also works)
  'stats://users': UserStatsResource = async () => ({
    count: 42
  });
}
```

### 3. All Prompts Require Implementation

All prompts are implemented as methods that return content:

```typescript
// Define prompt interface with type inference
interface GreetPrompt extends IPrompt {
  name: 'greet';
  description: 'Greet someone';
  args: {
    name: { description: 'Person name' };                    // string, required by default
    formal: { type: 'boolean'; required: false };            // boolean, optional
  };
}

// Implement prompt method - types automatically inferred!
export default class Server {
  // All prompts need implementation
  greet: GreetPrompt = (args) => {
    // args.name → string
    // args.formal → boolean | undefined
    const greeting = args.formal ? 'Good day' : 'Hello';
    return `${greeting}, ${args.name}!`;
  };
}
```

**Benefits:**
- **Flexibility**: Generate prompts with any logic you need
- **Consistency**: Same pattern for all prompts (no special cases)
- **Power**: Load from files, call APIs, use runtime data
```

**Backward Compatibility:** All traditional patterns still work! These are optional shortcuts.

---

## Creating UI Resources

Simply-MCP provides **100% spec-compliant** MCP UI support for building interactive user interfaces.

### Basic UI Example (Interface API)

```typescript
import type { IServer, ITool, IUI } from 'simply-mcp';

interface MyServer extends IServer {
  name: 'my-server';
  description: 'Server with UI support';
}

interface ShowDashboardTool extends ITool {
  name: 'show_dashboard';
  description: 'Display interactive dashboard';
  params: {};
  result: { content: any[] };
}

interface DashboardUI extends IUI {
  uri: 'ui://dashboard/main';
  name: 'Dashboard';
  description: 'Interactive dashboard';
  html: string;
  css: string;
  tools: ['refresh_data'];  // Tool allowlist for security
}

export default class Server implements MyServer {
  dashboard: DashboardUI = {
    html: `
      <div id="app">
        <h1>My Dashboard</h1>
        <button onclick="refreshData()">Refresh</button>
        <div id="data"></div>
      </div>

      <script>
        async function refreshData() {
          // Call MCP tool using spec-compliant postMessage
          const messageId = 'refresh_' + Date.now();

          window.parent.postMessage({
            type: 'tool',
            payload: {
              toolName: 'refresh_data',
              params: {}
            },
            messageId: messageId
          }, '*');

          // Listen for result
          window.addEventListener('message', function handler(event) {
            if (event.data.messageId === messageId && event.data.type === 'result') {
              document.getElementById('data').textContent =
                JSON.stringify(event.data.result);
              window.removeEventListener('message', handler);
            }
          });
        }
      </script>
    `,
    css: `
      #app {
        font-family: system-ui;
        padding: 20px;
      }
      button {
        background: #007bff;
        color: white;
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
    `
  };
}
```

### SDK API Example

```typescript
import { createUIResource } from 'simply-mcp';

interface ShowCalculatorTool extends ITool {
  name: 'show_calculator';
  description: 'Show calculator UI';
  params: {};
  result: { content: any[] };
}

export default class Server {
  showCalculator: ShowCalculatorTool = async () => {
    const resource = createUIResource({
      uri: 'ui://calculator/v1',
      content: {
        type: 'rawHtml',
        htmlString: `
          <div style="padding: 20px;">
            <h1>Calculator</h1>
            <input type="number" id="a" placeholder="First number" />
            <input type="number" id="b" placeholder="Second number" />
            <button onclick="calculate()">Calculate</button>
            <div id="result"></div>
          </div>

          <script>
            async function calculate() {
              const a = Number(document.getElementById('a').value);
              const b = Number(document.getElementById('b').value);
              const messageId = 'calc_' + Date.now();

              window.parent.postMessage({
                type: 'tool',
                payload: {
                  toolName: 'add',
                  params: { a, b }
                },
                messageId: messageId
              }, '*');
            }
          </script>
        `
      },
      metadata: {
        name: 'Simple Calculator',
        description: 'Add two numbers'
      }
    });

    return { content: [resource] };
  };
}
```

### PostMessage Protocol

UI resources use the official MCP-UI postMessage protocol:

**Send tool call:**
```javascript
window.parent.postMessage({
  type: 'tool',
  payload: {
    toolName: 'my_tool',
    params: { key: 'value' }
  },
  messageId: 'msg_' + Date.now()
}, '*');
```

**Receive response:**
```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'result' && event.data.messageId === myMessageId) {
    console.log('Result:', event.data.result);
  }
});
```

See [MCP UI Protocol Guide](./MCP_UI_PROTOCOL.md) for complete documentation.

---

### Learn More

- **[MCP UI Protocol](./MCP_UI_PROTOCOL.md)** - Complete UI protocol reference
- **[MCP UI Migration](./MCP_UI_MIGRATION.md)** - Upgrading from legacy formats
- **[Features Guide - Tools](./FEATURES.md#tools)** - Detailed tool patterns and examples
- **[Features Guide - Prompts](./FEATURES.md#prompts)** - Static vs dynamic prompts
- **[Features Guide - Resources](./FEATURES.md#resources)** - Resource patterns and URIs
- **[API Reference](./API_REFERENCE.md)** - Complete API reference

---

## Validate During Development

Use `--dry-run` mode frequently while developing to catch configuration errors early:

```bash
npx simply-mcp run server.ts --dry-run
```

This validates your server configuration **without starting the server**, catching:
- ❌ Missing implementation methods
- ❌ Incorrect method names (e.g., `get_weather` instead of `getWeather`)
- ❌ Property naming errors (e.g., wrong resource URI property)
- ❌ Invalid interface configurations
- ❌ Type mismatches

### Development Workflow

**Recommended workflow:**

1. **Write interface definitions**
   ```typescript
   interface GetWeatherTool extends ITool { ... }
   ```

2. **Validate immediately**
   ```bash
   npx simply-mcp run server.ts --dry-run
   ```

3. **Fix any warnings/errors**
   ```
   Warning: Tool 'get_weather' requires implementation as method 'getWeather'
   ```

4. **Implement methods**
   ```typescript
   getWeather: GetWeatherTool = async (params) => { ... }
   ```

5. **Validate again**
   ```bash
   npx simply-mcp run server.ts --dry-run
   ```

6. **Run server when validation passes**
   ```bash
   npx simply-mcp run server.ts
   ```

### Why Dry-Run?

**Without dry-run:** Errors discovered when running server or testing with client
**With dry-run:** Errors caught immediately during development

**Example - Catches Method Name Errors:**

```typescript
// Wrong method name
interface GetWeatherTool extends ITool {
  name: 'get_weather';
}

export default class MyServer {
  get_weather: GetWeatherTool = async () => { }; // Wrong!
}
```

Dry-run output:
```
Warning: Tool 'get_weather' requires implementation as method 'getWeather'
```

Fix:
```typescript
getWeather: GetWeatherTool = async () => { }; // Correct!
```

---

## What's Next?

### Learn More
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- **[Features Guide - Tools](./FEATURES.md#tools)** - Add capabilities to your server
- **[Features Guide - Prompts](./FEATURES.md#prompts)** - Create reusable templates
- **[Features Guide - Resources](./FEATURES.md#resources)** - Serve static or dynamic data

### Examples
- **`examples/interface-minimal.ts`** - Minimal server (start here)
- **`examples/interface-advanced.ts`** - Advanced features
- **`examples/interface-protocol-comprehensive.ts`** - All features
- **`examples/interface-file-prompts.ts`** - File-based prompts
- **`examples/interface-strict-mode.ts`** - TypeScript strict mode
- **`examples/interface-ui-foundation.ts`** - UI basics

Run any example:
```bash
npx tsx examples/interface-minimal.ts
```

### Common Tasks

**Bundle for distribution:**
```bash
npx simplymcp bundle server.ts -o my-server.js
```

**Deploy to production:**
See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

**Add environment configuration:**
```typescript
const apiKey = process.env.API_KEY;
```

## Need Help?

- **[CLI Basics](./CLI_BASICS.md)** - All CLI commands and options
- **[Examples Index](../../examples/EXAMPLES_INDEX.md)** - Browse all examples
- **[Configuration Guide](./CONFIGURATION.md)** - Environment and runtime options
- **[GitHub Issues](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)** - Report bugs or ask questions

## Troubleshooting

**"Cannot find module 'simply-mcp'"**
```bash
npm install simply-mcp
```

**Example doesn't run**
```bash
# Install dependencies
npm install

# Run with tsx (TypeScript execution)
npx tsx examples/interface-minimal.ts
```

**"Parameter uses inline IParam intersection" error**

This means you're using `& IParam` inline instead of a separate interface:

```typescript
// ❌ BROKEN - Causes validation error
params: {
  count: { type: 'number'; description: '...' } & IParam;
}

// ✅ FIXED - Use separate interface
interface CountParam extends IParam {
  type: 'number';
  description: '...';
}

params: {
  count: CountParam;
}
```

See [Parameter Best Practices](#parameter-best-practices) above for details.

**Want to see how X works?**

Check the `examples/` directory or search the documentation!

---

**Next Step**: Run `npx tsx examples/interface-minimal.ts` to see your first server in action!
