# Quick Start Guide

Get started with Simply MCP in 5 minutes.

## Installation

```bash
npm install simply-mcp
```

## Understanding Simply MCP's Type-Driven Approach

Simply MCP uses a **pure interface-driven API** - there's no `McpServer` class to import or instantiate. Everything is defined through TypeScript interfaces.

### What to Import

```typescript
// ✅ CORRECT - Import type interfaces only
import type { IServer, ITool, IParam, IPrompt, IResource } from 'simply-mcp';

// These are TypeScript interfaces, NOT runtime classes:
// - IServer: Server configuration interface
// - ITool: Tool definition interface
// - IParam: Parameter definition interface
// - IPrompt: Prompt definition interface
// - IResource: Resource definition interface
```

### What NOT to Import

```typescript
// ❌ INCORRECT - These don't exist!
import { McpServer } from 'simply-mcp';           // No such export
import { createServer } from 'simply-mcp';        // No such export
import { BuildMCPServer } from 'simply-mcp';      // Internal only (v4.0+)
```

### How It Works

Simply MCP uses **AST (Abstract Syntax Tree) parsing** to read your interface definitions directly from source code. When you run your server:

1. The CLI parses your TypeScript file
2. Extracts interface definitions (ITool, IPrompt, IResource)
3. Generates MCP protocol schemas automatically
4. Registers your implementations

**Key Insight:** You're not building a server object - you're declaring a server structure through interfaces, and Simply MCP builds the runtime for you.

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

Simply MCP supports multiple transport modes for different use cases.

### Transport Modes

```bash
# STDIO (default) - Standard input/output
npx simply-mcp run server.ts

# HTTP (stateful) - HTTP with session management and SSE
npx simply-mcp run server.ts --transport http --port 3000

# HTTP (stateless) - Serverless-ready (AWS Lambda, Vercel)
npx simply-mcp run server.ts --transport http-stateless --port 3000

# WebSocket - Real-time bidirectional communication
npx simply-mcp run server.ts --transport ws --port 8080

# Watch mode (auto-restart on changes)
npx simply-mcp run server.ts --watch

# Validate without running (recommended during development)
npx simply-mcp run server.ts --dry-run
```

**Legacy flags (still supported):**
```bash
# These still work but --transport is now preferred
npx simply-mcp run server.ts --http --port 3000
npx simply-mcp run server.ts --http-stateless --port 3000
```

### Testing Your Server

**Option 1: MCP Inspector (Recommended)**

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is the official testing tool for MCP servers:

```bash
# Install MCP Inspector globally
npm install -g @modelcontextprotocol/inspector

# Test your server
mcp-inspector npx simply-mcp run server.ts
```

The Inspector provides:
- Interactive UI for testing all MCP primitives
- Tool execution with parameter input
- Resource browsing
- Prompt testing
- Real-time protocol message inspection

**Option 2: Command Line Testing (HTTP/WebSocket)**

For HTTP or WebSocket transports, you can test with curl:

```bash
# Start server in HTTP mode
npx simply-mcp run server.ts --transport http --port 3000

# List available tools
curl http://localhost:3000/tools/list

# Call a tool (HTTP)
curl -X POST http://localhost:3000/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "greet",
    "arguments": {
      "name": "Alice"
    }
  }'

# List resources
curl http://localhost:3000/resources/list

# Get a resource
curl http://localhost:3000/resources/read?uri=config://app
```

**Option 3: Integration in Claude Desktop**

For production testing, configure your server in Claude Desktop:

1. Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["simply-mcp", "run", "/path/to/server.ts"]
    }
  }
}
```

2. Restart Claude Desktop
3. Your tools will appear in Claude's tool list

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

### 1. Tool Name Inference & Auto-Conversion

Tool names can be inferred from method names, and Simply MCP **automatically converts between snake_case and camelCase**:

```typescript
// Define parameter first
interface LocationParam extends IParam {
  type: 'string';
  description: 'Location to get weather for';
}

// ✅ Option A: Explicit name with snake_case (MCP convention)
interface GetWeatherTool extends ITool {
  name: 'get_weather';  // snake_case for MCP protocol
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
  // ✅ All three implementations work automatically!

  // Option 1: camelCase (JavaScript convention) - RECOMMENDED
  getWeather: GetWeatherTool = async (params) => {
    return { weather: 'sunny' };
  };

  // Option 2: snake_case (matches tool name)
  get_weather: GetWeatherTool = async (params) => {
    return { weather: 'sunny' };
  };

  // Option 3: PascalCase (also supported)
  GetWeather: GetWeatherTool = async (params) => {
    return { weather: 'sunny' };
  };
}
```

**How Auto-Conversion Works:**

- Tool name `get_weather` automatically matches methods: `get_weather`, `getWeather`, `GetWeather`
- Tool name `getWeather` automatically matches methods: `getWeather`, `get_weather`, `GetWeather`
- No more naming confusion - use the convention you prefer!
- Exact matches take precedence if multiple variations exist

**Example Error (Before Auto-Conversion):**
```
❌ Tool "get_weather" requires method "getWeather" but "get_weather" was found
```

**Now (With Auto-Conversion v4.0+):**
```
✅ Both work automatically! Use whichever naming style you prefer.
```

**See:** [Issue #20](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues/20) for implementation details.

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

const server: IServer = {
  name: 'my-server',
  version: '1.0.0',
  description: 'Server with UI support'
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

export default class Server {
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

---

## Common Commands Reference

Quick reference for frequently used Simply MCP commands.

### Development Commands

```bash
# Validate server without running
npx simply-mcp run server.ts --dry-run

# Run server with stdio (default)
npx simply-mcp run server.ts

# Run with watch mode (auto-restart on changes)
npx simply-mcp run server.ts --watch

# Run with verbose logging
npx simply-mcp run server.ts --verbose
```

### Transport Commands

```bash
# STDIO transport (default)
npx simply-mcp run server.ts --transport stdio

# HTTP transport (stateful with sessions)
npx simply-mcp run server.ts --transport http --port 3000

# HTTP transport (stateless for serverless)
npx simply-mcp run server.ts --transport http-stateless --port 3000

# WebSocket transport
npx simply-mcp run server.ts --transport ws --port 8080

# Custom host binding
npx simply-mcp run server.ts --transport http --host 0.0.0.0 --port 3000
```

### Testing Commands

```bash
# Test with MCP Inspector (STDIO)
mcp-inspector npx simply-mcp run server.ts

# Test with MCP Inspector (HTTP)
npx simply-mcp run server.ts --transport http --port 3000
# Then open Inspector at http://localhost:3000

# List available tools (HTTP)
curl http://localhost:3000/tools/list

# Call a tool (HTTP)
curl -X POST http://localhost:3000/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "my_tool", "arguments": {"param": "value"}}'

# List resources (HTTP)
curl http://localhost:3000/resources/list

# Get a resource (HTTP)
curl "http://localhost:3000/resources/read?uri=my://resource"

# List prompts (HTTP)
curl http://localhost:3000/prompts/list

# Get a prompt (HTTP)
curl -X POST http://localhost:3000/prompts/get \
  -H "Content-Type: application/json" \
  -d '{"name": "my_prompt", "arguments": {"arg": "value"}}'
```

### Debugging Commands

```bash
# Dry-run with detailed output
npx simply-mcp run server.ts --dry-run --verbose

# Run with debug logging
DEBUG=simply-mcp:* npx simply-mcp run server.ts

# Check TypeScript compilation
npx tsx --check server.ts

# Validate all examples
npm run test:examples
```

### Build & Bundle Commands

```bash
# Bundle server for distribution
npx simplymcp bundle server.ts -o dist/server.js

# Bundle with minification
npx simplymcp bundle server.ts -o dist/server.js --minify

# Bundle with source maps
npx simplymcp bundle server.ts -o dist/server.js --sourcemap

# Check bundle size
ls -lh dist/server.js
```

### UI Development Commands

```bash
# Run with UI watch mode
npx simply-mcp run server.ts --ui-watch

# Run with custom watch debounce (milliseconds)
npx simply-mcp run server.ts --ui-watch --ui-watch-debounce 500

# Run with verbose UI logging
npx simply-mcp run server.ts --ui-watch --ui-watch-verbose
```

### Package Management

```bash
# Install Simply MCP
npm install simply-mcp

# Install with optional dependencies
npm install simply-mcp express cors chokidar esbuild

# Update to latest version
npm install simply-mcp@latest

# Check installed version
npm list simply-mcp

# View package info
npm info simply-mcp
```

### Common Flag Combinations

```bash
# Development: Watch + Verbose + HTTP
npx simply-mcp run server.ts --watch --verbose --transport http --port 3000

# Production: HTTP with custom binding
npx simply-mcp run server.ts --transport http --host 0.0.0.0 --port 8080

# UI Development: Watch + UI Watch + Verbose
npx simply-mcp run server.ts --watch --ui-watch --ui-watch-verbose --transport http

# Testing: Dry-run + Verbose
npx simply-mcp run server.ts --dry-run --verbose
```

### Environment Variables

```bash
# Set environment variables
export API_KEY=your-key-here
export PORT=3000
npx simply-mcp run server.ts

# Or inline
API_KEY=your-key PORT=3000 npx simply-mcp run server.ts

# Use .env files
npm install dotenv
# Add require('dotenv').config() to your server
```

### Quick Tips

- Use `--dry-run` frequently during development to catch errors early
- Use `--watch` for faster iteration during development
- Use `--transport http` for easier testing with curl/Postman
- Use `--verbose` when debugging issues
- The `--transport` flag is preferred over `--http` and `--http-stateless` (legacy)
- All transport flags are mutually exclusive - use only one

## Need Help?

- **[CLI Basics](./CLI_BASICS.md)** - All CLI commands and options
- **[Examples Index](../../examples/EXAMPLES_INDEX.md)** - Browse all examples
- **[Configuration Guide](./CONFIGURATION.md)** - Environment and runtime options
- **[GitHub Issues](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)** - Report bugs or ask questions

## Troubleshooting

This section covers common issues and their solutions. For more help, see [GitHub Issues](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues).

### Installation Issues

**"Cannot find module 'simply-mcp'"**

Solution:
```bash
npm install simply-mcp
```

**"Cannot find module 'typescript'"**

Simply MCP uses lazy-loading for TypeScript. If you see this warning but your server works, it's likely a false positive (see Issue #22).

Solution:
```bash
# Install TypeScript as dev dependency
npm install --save-dev typescript

# Verify installation
npm list typescript
```

If TypeScript is installed but warnings persist, this is a known false positive that can be safely ignored. The framework will work correctly.

**See:** [Issue #22](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues/22) for details.

### Import Errors

**"McpServer is not exported from 'simply-mcp'"**

Simply MCP uses a pure interface-driven API. There is no `McpServer` class.

Solution:
```typescript
// ❌ INCORRECT
import { McpServer } from 'simply-mcp';

// ✅ CORRECT
import type { IServer, ITool, IParam } from 'simply-mcp';
```

**See:** [Understanding Simply MCP's Type-Driven Approach](#understanding-simply-mcps-type-driven-approach) section above.

### CLI Flag Issues

**"Unknown argument: transport"**

The `--transport` flag was added in v4.0. Make sure you're using the latest version.

Solution:
```bash
# Update to latest version
npm install simply-mcp@latest

# Use --transport flag (v4.0+)
npx simply-mcp run server.ts --transport http

# Or use legacy flags (still supported)
npx simply-mcp run server.ts --http
```

**Available transport options:**
- `--transport stdio` (default)
- `--transport http` (stateful)
- `--transport http-stateless` (serverless)
- `--transport ws` (WebSocket)

**See:** [Issue #22](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues/22) for implementation details.

### Tool Implementation Issues

**"Tool 'get_weather' requires method 'getWeather' but 'get_weather' was found"**

This error occurred in versions before v4.0. Auto-naming conversion now handles this automatically.

Solution (v4.0+):
```typescript
// ✅ Both work automatically!
interface GetWeatherTool extends ITool {
  name: 'get_weather';
  // ...
}

export default class Server {
  // Option 1: camelCase (recommended)
  getWeather: GetWeatherTool = async () => { ... };

  // Option 2: snake_case (also works)
  get_weather: GetWeatherTool = async () => { ... };
}
```

If you're still on v3.x, update to v4.0 or use camelCase method names.

**See:** [Issue #20](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues/20) for auto-conversion feature.

### Parameter Definition Issues

**"Parameter uses inline IParam intersection"**

This means you're using `& IParam` inline instead of a separate interface:

Solution:
```typescript
// ❌ BROKEN - Causes validation error
interface MyTool extends ITool {
  params: {
    count: { type: 'number'; description: '...' } & IParam;
  };
}

// ✅ FIXED - Use separate interface extending IParam
interface CountParam extends IParam {
  type: 'number';
  description: '...';
}

interface MyTool extends ITool {
  params: {
    count: CountParam;
  };
}
```

**Why this matters:**
- Inline types bypass AST parsing
- Type coercion won't work (numbers received as strings)
- Missing validation

**See:** [Parameter Best Practices](#parameter-best-practices) section above.

### TypeScript Warnings

**TypeScript shows structural type errors but server works**

Simply MCP uses AST parsing to read interfaces directly. TypeScript's structural type checking will show warnings, but these are expected.

Solution:
```bash
# ✅ Use dry-run for validation
npx simply-mcp run server.ts --dry-run

# ❌ Don't use tsc (shows expected structural warnings)
tsc --noEmit
```

**Why warnings occur:**
- Interfaces define metadata (name, description, params, result)
- Implementations are callable functions
- TypeScript sees structural mismatch (expected behavior)

These warnings are **normal and can be safely ignored**. The framework reads your interface definitions via AST, not TypeScript's type system.

**See:** [TypeScript Type Checking](#typescript-type-checking) section above.

### Runtime Issues

**Tool receives string instead of number for parameters**

This happens when parameters don't extend `IParam` or use inline types.

Solution:
```typescript
// ❌ BROKEN - No type coercion
interface MyTool extends ITool {
  params: {
    count: number;  // Inline primitive type
  };
}

// ✅ FIXED - Proper IParam interface
interface CountParam extends IParam {
  type: 'number';
  description: 'Item count';
}

interface MyTool extends ITool {
  params: {
    count: CountParam;
  };
}
```

Simply MCP automatically coerces types when using IParam interfaces:
- `"42"` → `42` (number)
- `"true"` → `true` (boolean)

### Testing Issues

**MCP Inspector can't connect to server**

Make sure the server is running and you're using the correct transport:

Solution:
```bash
# For STDIO (default)
mcp-inspector npx simply-mcp run server.ts

# For HTTP
npx simply-mcp run server.ts --transport http --port 3000
# Then connect Inspector to http://localhost:3000
```

**curl returns "Cannot GET /tools/list"**

HTTP endpoints are different in stateful vs stateless mode:

Solution:
```bash
# Stateful HTTP (v4.0+)
curl http://localhost:3000/tools/list

# Stateless HTTP (v4.0+)
curl http://localhost:3000/v1/tools
```

### Still Having Issues?

1. **Check examples:** Browse `/examples` for working code
2. **Run dry-run:** `npx simply-mcp run server.ts --dry-run`
3. **Check version:** `npm list simply-mcp`
4. **Search issues:** [GitHub Issues](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)
5. **Ask for help:** [GitHub Discussions](https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions)

---

**Next Step**: Run `npx tsx examples/interface-minimal.ts` to see your first server in action!
