# Interface API Usage Guide

## Table of Contents

- [Introduction](#introduction)
- [When to Use the Interface API](#when-to-use-the-interface-api)
- [Quick Start](#quick-start)
- [Complete Guide](#complete-guide)
- [Advanced Features](#advanced-features)
- [Examples](#examples)
- [CLI Reference](#cli-reference)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Introduction

### What is the Interface API?

The Interface API is the cleanest, most TypeScript-native way to define MCP servers. It uses pure TypeScript interfaces to define your server's capabilities - no decorators, no manual schema definitions, just TypeScript types!

**Key concept:** You define TypeScript interfaces that extend base types (`ITool`, `IPrompt`, `IResource`, `IServer`), and the framework automatically:
1. Parses your interfaces via AST (Abstract Syntax Tree)
2. Generates JSON Schema and Zod validation from TypeScript types
3. Registers all capabilities with the MCP server
4. Provides full IntelliSense and type safety

```typescript
// Define what your tool looks like
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a person by name';
  params: { name: string; formal?: boolean };
  result: string;
}

// Implement it with full type safety
export default class MyServer implements IServer {
  name = 'my-server';
  version = '1.0.0';

  greet: GreetTool = async (params) => {
    // Full IntelliSense on params.name and params.formal
    const greeting = params.formal ? 'Good day' : 'Hello';
    return `${greeting}, ${params.name}!`;
  };
}
```

### When to Use the Interface API?

**Use the Interface API when you:**
- Want the cleanest possible TypeScript code
- Prefer pure interfaces over decorators
- Want compile-time type safety without runtime overhead
- Need full IntelliSense on parameters and return types
- Like seeing your API shape defined upfront

**Choose other APIs when you:**
- **Decorator API**: Need class-based organization with auto-registration
- **Functional API**: Want programmatic control and runtime flexibility
- **JSON Config**: Need to define servers in configuration files

### Key Benefits

| Feature | Interface API | Decorator API | Functional API |
|---------|--------------|---------------|----------------|
| **Zero boilerplate** | ✅ No schemas | ⭐ Some schemas | ❌ Manual schemas |
| **Type safety** | ✅ Compile-time | ✅ Compile-time | ⭐ Runtime only |
| **IntelliSense** | ✅ Full | ✅ Full | ⭐ Partial |
| **Learning curve** | ⭐ Easy | ⭐ Easy | ⭐⭐ Medium |
| **Code style** | Interface-first | Class-based | Procedural |
| **Runtime overhead** | ⭐ Minimal | ⭐⭐ Decorators | ⭐ Minimal |

**Bottom line:** Interface API gives you the best developer experience with minimal boilerplate.

## Quick Start

### Installation

```bash
npm install simply-mcp
```

### Minimal Working Example

Create a file `server.ts`:

```typescript
import type { ITool, IServer } from 'simply-mcp';

// Define your tool
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a person by name';
  params: {
    name: string;
  };
  result: string;
}

// Define your server
interface MyServer extends IServer {
  name: 'greeter';
  version: '1.0.0';
}

// Implement it
export default class GreeterService implements MyServer {
  greet: GreetTool = async (params) => {
    return `Hello, ${params.name}!`;
  };
}
```

### Run It

```bash
# Using the unified CLI (auto-detects API style)
npx simply-mcp run server.ts

# Or using the explicit interface command
npx simplymcp-interface server.ts

# With HTTP transport
npx simply-mcp run server.ts --http --port 3000
```

That's it! Your server is running with full type safety and zero schema boilerplate.

## Complete Guide

### Interface Definitions

The Interface API provides four core interfaces to extend:

#### 1. ITool - Define Tools

Tools contain dynamic logic and always require implementation.

```typescript
interface ITool<TParams = any, TResult = any> {
  name: string;           // Tool name in snake_case
  description: string;    // Human-readable description
  params: TParams;        // Parameter types
  result: TResult;        // Return type
  (params: TParams): TResult | Promise<TResult>;  // Callable signature
}
```

**Example:**

```typescript
interface AddTool extends ITool {
  name: 'add_numbers';
  description: 'Add two numbers together';
  params: {
    a: number;
    b: number;
  };
  result: {
    sum: number;
    equation: string;
  };
}

class Calculator implements IServer {
  // Method name is camelCase: addNumbers
  addNumbers: AddTool = async (params) => {
    return {
      sum: params.a + params.b,
      equation: `${params.a} + ${params.b} = ${params.a + params.b}`
    };
  };
}
```

> **⚠️ Method Naming Convention - IMPORTANT**
>
> Interface names use `snake_case` (MCP convention)
> Implementation methods use `camelCase` (TypeScript convention)
>
> The framework automatically converts between them:
>
> | Interface (snake_case) | Method (camelCase) |
> |------------------------|-------------------|
> | `get_weather`          | `getWeather`      |
> | `create_user`          | `createUser`      |
> | `process_data`         | `processData`     |
> | `add_numbers`          | `addNumbers`      |
>
> **Common Error:**
> ```
> Error: Tool "get_weather" requires method "getWeather" but it was not found on server class
> ```
>
> **Fix:** Ensure your method name matches the camelCase conversion of your tool name:
> ```typescript
> // ✅ Correct
> interface GetWeatherTool extends ITool {
>   name: 'get_weather';  // snake_case in interface
> }
>
> class MyServer {
>   getWeather: GetWeatherTool = async (params) => { ... };  // camelCase method
> }
>
> // ❌ Wrong
> class MyServer {
>   get_weather: GetWeatherTool = async (params) => { ... };  // Don't use snake_case here!
> }
> ```

#### 2. IPrompt - Define Prompts

Prompts can be **static** (template-based) or **dynamic** (runtime logic).

```typescript
interface IPrompt<TArgs = any> {
  name: string;           // Prompt name
  description: string;    // Description
  args: TArgs;            // Template argument types
  template?: string;      // Template string (for static prompts)
  dynamic?: boolean;      // Set true for dynamic prompts
}
```

**Static Prompt Example:**

```typescript
interface WeatherPrompt extends IPrompt {
  name: 'weather_report';
  description: 'Generate a weather report';
  args: {
    location: string;
    style?: 'casual' | 'formal';
  };
  template: `Generate a {style} weather report for {location}.
Include current conditions and 3-day forecast.`;
}

// No implementation needed! Template is auto-interpolated.
```

**Dynamic Prompt Example:**

```typescript
interface ContextualPrompt extends IPrompt {
  name: 'contextual_help';
  description: 'Context-aware help prompt';
  args: {
    topic: string;
    userLevel?: 'beginner' | 'expert';
  };
  dynamic: true;  // Requires implementation
}

class MyServer implements IServer {
  contextualHelp = (args) => {
    const level = args.userLevel || 'beginner';
    return level === 'beginner'
      ? `Simple help for ${args.topic}...`
      : `Advanced help for ${args.topic}...`;
  };
}
```

#### 3. IResource - Define Resources

Resources can be **static** (literal data) or **dynamic** (runtime data).

```typescript
interface IResource<TData = any> {
  uri: string;            // Resource URI
  name: string;           // Human-readable name
  description: string;    // Description
  mimeType: string;       // MIME type
  data?: TData;           // Data (for static resources)
  dynamic?: boolean;      // Set true for dynamic resources
}
```

**Static Resource Example:**

```typescript
interface ConfigResource extends IResource {
  uri: 'config://server';
  name: 'Server Configuration';
  description: 'Server settings';
  mimeType: 'application/json';
  data: {
    version: '1.0.0';
    features: ['tools', 'prompts', 'resources'];
    maxConnections: 100;
  };
}

// No implementation needed! Data is extracted from interface.
```

**Dynamic Resource Example:**

```typescript
interface StatsResource extends IResource {
  uri: 'stats://current';
  name: 'Current Statistics';
  description: 'Real-time statistics';
  mimeType: 'application/json';
  data: {
    requestCount: number;
    uptime: number;
  };
}

class MyServer implements IServer {
  // Property name is the URI
  'stats://current' = async () => ({
    requestCount: await getRequestCount(),
    uptime: process.uptime()
  });
}
```

**Note:** Static vs dynamic is automatically detected:
- Static: All data values are literals
- Dynamic: Contains non-literal types (number, arrays without values)

#### 4. IServer - Define Server Metadata

```typescript
interface IServer {
  name: string;           // Server name (kebab-case recommended)
  version: string;        // Semantic version
  description?: string;   // Optional description
}
```

**Example:**

```typescript
interface WeatherServer extends IServer {
  name: 'weather-service';
  version: '2.0.0';
  description: 'Advanced weather information service';
}

export default class WeatherService implements WeatherServer {
  // Tools, prompts, and resources are auto-discovered
}
```

### TypeScript Type Inference

The Interface API automatically converts TypeScript types to JSON Schema/Zod:

| TypeScript Type | Zod Schema | Notes |
|----------------|------------|-------|
| `string` | `z.string()` | Basic string |
| `number` | `z.number()` | Any number |
| `boolean` | `z.boolean()` | True/false |
| `string?` | `z.string().optional()` | Optional field |
| `'a' \| 'b'` | `z.enum(['a', 'b'])` | Literal union |
| `string[]` | `z.array(z.string())` | Array type |
| `{ a: string }` | `z.object({ a: z.string() })` | Nested object |
| `Date` | `z.string()` | ISO date string |

**Complex Example:**

```typescript
interface SearchTool extends ITool {
  name: 'search';
  description: 'Search documents';
  params: {
    query: string;
    type?: 'pdf' | 'markdown' | 'text';
    tags?: string[];
    filters?: {
      dateFrom?: string;
      dateTo?: string;
    };
  };
  result: {
    total: number;
    results: Array<{
      id: string;
      title: string;
      score: number;
    }>;
  };
}
```

This generates a complete Zod schema with:
- Required `query` field
- Optional enum `type`
- Optional array `tags`
- Nested optional `filters` object
- Complex nested array in result

### Static vs Dynamic Detection

The framework automatically detects whether prompts/resources are static or dynamic:

**Static Detection:**
- **Prompts:** Have a `template` string OR no `dynamic: true` flag
- **Resources:** All `data` values are literals (strings, numbers, booleans, arrays/objects of literals)

**Dynamic Detection:**
- **Prompts:** Have `dynamic: true` OR missing `template`
- **Resources:** Have `dynamic: true` OR contain non-literal types in `data`

**Examples:**

```typescript
// STATIC - all literal values
interface ConfigResource extends IResource {
  uri: 'config://app';
  data: {
    name: 'my-app';      // literal string
    port: 3000;          // literal number
    debug: false;        // literal boolean
  };
}

// DYNAMIC - contains non-literal type
interface StatsResource extends IResource {
  uri: 'stats://app';
  data: {
    count: number;       // NON-literal (could be any number)
  };
}

// STATIC - explicit template
interface GreetPrompt extends IPrompt {
  name: 'greet';
  args: { name: string };
  template: `Hello, {name}!`;
}

// DYNAMIC - no template
interface CustomPrompt extends IPrompt {
  name: 'custom';
  args: { context: string };
  dynamic: true;
}
```

### CLI Usage

The Interface API works with Simply MCP's unified CLI:

#### Basic Commands

```bash
# Auto-detection (recommended)
npx simply-mcp run server.ts

# Explicit interface command
npx simplymcp-interface server.ts

# With HTTP transport
npx simply-mcp run server.ts --http --port 3000

# Watch mode (auto-restart on changes)
npx simply-mcp run server.ts --watch

# Validate without running
npx simply-mcp run server.ts --dry-run

# Verbose output
npx simply-mcp run server.ts --verbose
```

#### CLI Options

| Option | Description | Example |
|--------|-------------|---------|
| `--http` | Use HTTP transport | `--http --port 3000` |
| `--port <n>` | HTTP port (default: 3000) | `--port 8080` |
| `--watch` | Auto-restart on file changes | `--watch` |
| `--dry-run` | Validate without starting | `--dry-run` |
| `--verbose` | Show detailed logs | `--verbose` |
| `--help` | Show help | `--help` |

### Programmatic Usage

You can also load interface servers programmatically:

```typescript
import { loadInterfaceServer } from 'simply-mcp';

const server = await loadInterfaceServer({
  filePath: './server.ts',
  verbose: true
});

// Start the server
await server.start();

// Or with custom transport
await server.start({ transport: 'http', port: 3000 });
```

**Options:**

```typescript
interface InterfaceAdapterOptions {
  filePath: string;        // Path to interface file
  serverName?: string;     // Override server name
  serverVersion?: string;  // Override version
  verbose?: boolean;       // Enable logging
}
```

## Advanced Features

### Schema Generation from TypeScript Types

The Interface API uses TypeScript's AST to generate schemas:

```typescript
interface ComplexTool extends ITool {
  name: 'process_data';
  description: 'Process complex data';
  params: {
    // JSDoc validation tags
    /**
     * Username
     * @minLength 3
     * @maxLength 20
     * @pattern ^[a-zA-Z0-9_]+$
     */
    username: string;

    /**
     * Age
     * @min 18
     * @max 120
     * @int
     */
    age: number;

    /**
     * Email
     * @format email
     */
    email: string;

    // Complex nested types
    metadata?: {
      tags: string[];
      priority: 'low' | 'medium' | 'high';
    };
  };
  result: any;
}
```

**Supported JSDoc Tags:**

| Tag | Type | Description | Example |
|-----|------|-------------|---------|
| `@minLength` | string | Minimum string length | `@minLength 3` |
| `@maxLength` | string | Maximum string length | `@maxLength 100` |
| `@pattern` | string | RegEx pattern | `@pattern ^[A-Z]` |
| `@format` | string | Format (email, url, uuid) | `@format email` |
| `@min` | number | Minimum value | `@min 0` |
| `@max` | number | Maximum value | `@max 100` |
| `@int` | number | Integer only | `@int` |

### Template Variables in Prompts

Static prompts support template interpolation with `{variable}` syntax:

```typescript
interface ReportPrompt extends IPrompt {
  name: 'generate_report';
  description: 'Generate a report';
  args: {
    topic: string;
    format?: 'brief' | 'detailed';
    audience?: string;
  };
  template: `Generate a {format} report on {topic}.

Target audience: {audience}

Please structure the report with:
1. Executive summary
2. Key findings
3. Recommendations`;
}
```

**How it works:**
1. Template is extracted from interface at parse time
2. Framework finds all `{variable}` placeholders
3. On `prompts/get` request, placeholders are replaced with argument values
4. Missing optional arguments use empty string or default

**Conditional templates:**

```typescript
template: `Report for {location}.

{includeDetails ? 'Include detailed analysis.' : 'Brief summary only.'}`;
```

### Working with File-Based Prompts

A common pattern is loading prompts from external markdown or text files. This keeps long prompts maintainable and allows non-developers to edit them.

#### Pattern 1: Static Prompts from Files (Recommended)

Load file content at compile time using a constant, then use string concatenation:

```typescript
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Load file content into a constant
const __dirname = dirname(fileURLToPath(import.meta.url));
const orchestratorContent = readFileSync(
  join(__dirname, 'prompts/orchestrator.md'),
  'utf-8'
);

// Pattern A: Use constant directly in template field
interface OrchestratorPrompt extends IPrompt {
  name: 'orchestrator';
  description: 'Agentic coding loop guide';
  args: { context?: string };
  // Use constant (not template literal with ${})
  template: orchestratorContent + '\n\n## Context\n{context}';
}

// No implementation needed! Static prompt auto-registered.
```

**Why this works:**
- `orchestratorContent` is a compile-time constant
- String concatenation (`+`) produces a static string
- Template uses `{context}` for runtime argument interpolation

#### Pattern 2: Dynamic Prompts from Files

For prompts that need runtime logic beyond simple interpolation:

```typescript
const basePrompt = readFileSync(join(__dirname, 'prompts/base.md'), 'utf-8');

interface DynamicFilePrompt extends IPrompt {
  name: 'dynamic_prompt';
  description: 'Loaded from file with conditional logic';
  args: {
    context?: string;
    includeExamples?: boolean;
  };
  dynamic: true;  // Requires implementation
}

export default class MyServer implements IServer {
  name = 'my-server';
  version = '1.0.0';

  // Implement as method
  dynamicPrompt = (args: { context?: string; includeExamples?: boolean }) => {
    let result = basePrompt;

    if (args.context) {
      result += `\n\n## Context\n${args.context}`;
    }

    if (args.includeExamples) {
      const examples = readFileSync(
        join(__dirname, 'prompts/examples.md'),
        'utf-8'
      );
      result += `\n\n${examples}`;
    }

    return result;
  };
}
```

#### Pattern 3: Hybrid Approach (Mix of Files)

Combine multiple file sources:

```typescript
const header = readFileSync(join(__dirname, 'prompts/header.md'), 'utf-8');
const footer = readFileSync(join(__dirname, 'prompts/footer.md'), 'utf-8');

interface HybridPrompt extends IPrompt {
  name: 'hybrid_prompt';
  description: 'Combined from multiple files';
  args: { task: string };
  // Concatenate multiple files
  template: header + '\n\n## Task\n{task}\n\n' + footer;
}
```

#### ⚠️ Important: Template Literal Limitation

**This will NOT work as expected:**

```typescript
// ❌ WRONG - Template literal with ${} triggers dynamic detection
const fileContent = readFileSync('prompt.md', 'utf-8');

interface BrokenPrompt extends IPrompt {
  name: 'broken';
  args: {};
  template: `${fileContent}`;  // Parser sees ${} and marks as dynamic!
}
```

**Why:** The AST parser sees `${}` syntax and assumes runtime evaluation is needed, even if the variable is a constant.

**Solutions:**

1. **Use string concatenation (recommended):**
   ```typescript
   template: fileContent + '\n\nAdditional text: {arg}'
   ```

2. **Mark as dynamic explicitly:**
   ```typescript
   interface MyPrompt extends IPrompt {
     name: 'my_prompt';
     args: { arg: string };
     dynamic: true;
   }

   // Then implement as method
   myPrompt = (args) => fileContent + `\n\nAdditional: ${args.arg}`;
   ```

3. **Use template literal for constants only:**
   ```typescript
   const PREFIX = 'System: ';
   template: `${PREFIX}Instructions here`  // OK if PREFIX is literal string
   ```

#### Best Practices

**✅ Do:**
- Load files into constants at module level
- Use string concatenation to combine content
- Use `{variable}` syntax for runtime argument interpolation
- Keep prompt files in a `prompts/` directory
- Use meaningful file names (e.g., `orchestrator.md`, `admin-guide.md`)

**❌ Don't:**
- Use template literals with `${}` for file content
- Load files inside interface definitions
- Mix compile-time and runtime string interpolation without understanding the difference
- Forget to handle file read errors in dynamic prompts

**Example File Structure:**
```
src/
  ├── server.ts              # Your interface server
  └── prompts/
      ├── orchestrator.md    # Long prompt content
      ├── admin-guide.md     # Another prompt
      └── examples.md        # Reusable examples
```

### Resource URI Patterns

Resources use URIs to identify data sources:

**Common URI schemes:**

```typescript
// Configuration
uri: 'config://server'
uri: 'config://database'

// Documentation
uri: 'doc://readme'
uri: 'doc://api-reference'

// Statistics
uri: 'stats://current'
uri: 'stats://historical'

// Data
uri: 'data://users'
uri: 'data://products'

// Files
uri: 'file://data/config.json'
uri: 'file://logs/latest.log'
```

**Dynamic resource implementation:**

```typescript
interface FileResource extends IResource {
  uri: 'file://config.json';
  name: 'Configuration File';
  description: 'Server configuration';
  mimeType: 'application/json';
  dynamic: true;
  data: any;
}

class MyServer implements IServer {
  // Property name is the URI
  'file://config.json' = async () => {
    const fs = await import('fs/promises');
    const data = await fs.readFile('config.json', 'utf-8');
    return JSON.parse(data);
  };
}
```

### Error Handling

The Interface API provides clear error messages:

**Common Errors:**

1. **Missing Implementation:**
```
Error: Tool "greet_user" requires method "greetUser" but it was not found on server class.
Expected: class implements { greetUser: GreetUserTool }
```

2. **Invalid Method Type:**
```
Error: Tool "greet" method "greet" is not a function (found: string)
```

3. **No Default Export:**
```
Error: No default export found in server.ts
```

**Best Practice:**

```typescript
// Always export default
export default class MyServer implements IServer {
  // Implement all tools
  greet: GreetTool = async (params) => { ... };

  // Implement dynamic prompts
  customPrompt = (args) => { ... };

  // Implement dynamic resources
  'stats://current' = async () => { ... };
}
```

## Examples

### Example 1: Minimal Server

See [`examples/interface-minimal.ts`](/mnt/Shared/cs-projects/simple-mcp/examples/interface-minimal.ts)

Basic server with tools only:

```typescript
import type { ITool, IServer } from 'simply-mcp';

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a person';
  params: { name: string; formal?: boolean };
  result: string;
}

interface MinimalServer extends IServer {
  name: 'interface-minimal';
  version: '1.0.0';
}

export default class MinimalServerImpl implements MinimalServer {
  greet: GreetTool = async (params) => {
    const greeting = params.formal ? 'Good day' : 'Hello';
    return `${greeting}, ${params.name}!`;
  };
}
```

### Example 2: Advanced Server

See [`examples/interface-advanced.ts`](/mnt/Shared/cs-projects/simple-mcp/examples/interface-advanced.ts)

Server with tools, prompts, and resources:

```typescript
import type { ITool, IPrompt, IResource, IServer } from 'simply-mcp';

// Tool with validation
interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get current weather';
  params: {
    location: string;
    units?: 'celsius' | 'fahrenheit';
  };
  result: {
    temperature: number;
    conditions: string;
  };
}

// Static prompt
interface WeatherPrompt extends IPrompt {
  name: 'weather_report';
  description: 'Weather report prompt';
  args: { location: string; style?: 'casual' | 'formal' };
  template: `Generate a weather report for {location} in {style} style.`;
}

// Static resource
interface ConfigResource extends IResource {
  uri: 'config://server';
  name: 'Server Configuration';
  mimeType: 'application/json';
  data: {
    version: '1.0.0';
    features: ['weather', 'forecasts'];
  };
}

// Dynamic resource
interface StatsResource extends IResource {
  uri: 'stats://users';
  name: 'User Statistics';
  mimeType: 'application/json';
  data: {
    totalUsers: number;
    activeUsers: number;
  };
}

interface WeatherServer extends IServer {
  name: 'weather-advanced';
  version: '2.0.0';
}

export default class WeatherService implements WeatherServer {
  getWeather: GetWeatherTool = async (params) => {
    const temp = Math.round(Math.random() * 30);
    return {
      temperature: params.units === 'fahrenheit' ? (temp * 9/5) + 32 : temp,
      conditions: 'Partly cloudy'
    };
  };

  // Static prompt - no implementation needed
  // Static resource - no implementation needed

  // Dynamic resource - implement with URI as property name
  'stats://users' = async () => ({
    totalUsers: 42,
    activeUsers: 15
  });
}
```

### Example 3: Comprehensive Server

See [`examples/interface-comprehensive.ts`](/mnt/Shared/cs-projects/simple-mcp/examples/interface-comprehensive.ts)

Complete example with all features:
- Complex tools with nested types
- JSDoc validation tags
- Static and dynamic prompts
- Static and dynamic resources
- Enum types and optional fields

## CLI Reference

### simplymcp-interface Command

The explicit interface API command:

```bash
simplymcp-interface <file.ts> [options]
```

**Aliases:**
- `simplymcp-interface`
- `simply-mcp-interface`

**Options:**

```bash
--http              Use HTTP transport
--port <number>     HTTP port (default: 3000)
--dry-run           Validate without starting
--verbose, -v       Show detailed logs
--help, -h          Show help
```

**Examples:**

```bash
# Run with stdio
simplymcp-interface server.ts

# Run with HTTP
simplymcp-interface server.ts --http --port 3000

# Validate only
simplymcp-interface server.ts --dry-run

# Verbose mode
simplymcp-interface server.ts --verbose
```

### simply-mcp run Command (Recommended)

The unified command that auto-detects API style:

```bash
simply-mcp run <file.ts> [options]
```

**Why use `run`?**
- Auto-detects decorator/interface/functional APIs
- More features (watch mode, multi-server)
- Consistent across all API styles

**Examples:**

```bash
# Auto-detect and run
simply-mcp run server.ts

# With watch mode
simply-mcp run server.ts --watch

# With HTTP
simply-mcp run server.ts --http --port 3000

# Multiple files
simply-mcp run server1.ts server2.ts server3.ts
```

## Best Practices

### 1. Use Descriptive Interface Names

```typescript
// ✅ Good - clear purpose
interface GetWeatherTool extends ITool { ... }
interface CreateUserTool extends ITool { ... }

// ❌ Bad - vague names
interface Tool1 extends ITool { ... }
interface MyTool extends ITool { ... }
```

### 2. Leverage TypeScript Types

```typescript
// ✅ Good - rich type information
interface SearchTool extends ITool {
  params: {
    query: string;
    type?: 'pdf' | 'markdown' | 'text';
    limit?: number;
  };
  result: {
    results: Array<{
      id: string;
      title: string;
      score: number;
    }>;
  };
}

// ❌ Bad - too generic
interface SearchTool extends ITool {
  params: any;
  result: any;
}
```

### 3. Document with JSDoc

```typescript
interface ProcessDataTool extends ITool {
  name: 'process_data';
  description: 'Process user data with validation';
  params: {
    /**
     * Username (alphanumeric, 3-20 chars)
     * @minLength 3
     * @maxLength 20
     * @pattern ^[a-zA-Z0-9_]+$
     */
    username: string;

    /**
     * User age (must be 18+)
     * @min 18
     * @max 120
     */
    age: number;
  };
  result: any;
}
```

### 4. Group Related Interfaces

```typescript
// ============================================================================
// TOOL INTERFACES
// ============================================================================

interface GetWeatherTool extends ITool { ... }
interface GetForecastTool extends ITool { ... }

// ============================================================================
// PROMPT INTERFACES
// ============================================================================

interface WeatherPrompt extends IPrompt { ... }
interface ForecastPrompt extends IPrompt { ... }

// ============================================================================
// RESOURCE INTERFACES
// ============================================================================

interface ConfigResource extends IResource { ... }
interface StatsResource extends IResource { ... }
```

### 5. Use Static Resources for Config

```typescript
// ✅ Good - static data
interface ConfigResource extends IResource {
  uri: 'config://app';
  mimeType: 'application/json';
  data: {
    version: '1.0.0';
    apiUrl: 'https://api.example.com';
    timeout: 5000;
  };
}

// Only use dynamic when data changes at runtime
interface StatsResource extends IResource {
  uri: 'stats://current';
  mimeType: 'application/json';
  data: {
    requests: number;  // Changes at runtime
    uptime: number;
  };
}
```

### 6. Export Default Class

```typescript
// ✅ Good - default export
export default class MyServer implements IServer { ... }

// ❌ Bad - named export
export class MyServer implements IServer { ... }
```

### 7. Implement All Required Methods

```typescript
interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
}

// ✅ Good - all tools implemented
export default class MyServerImpl implements MyServer {
  greet: GreetTool = async (params) => { ... };
  add: AddTool = async (params) => { ... };
}

// ❌ Bad - missing implementations
export default class MyServerImpl implements MyServer {
  greet: GreetTool = async (params) => { ... };
  // Missing add() implementation
}
```

## Troubleshooting

### Common Issues

#### 1. "No default export found"

**Problem:**
```
Error: No default export found in server.ts
```

**Solution:**
```typescript
// ✅ Use default export
export default class MyServer implements IServer { ... }

// ❌ Not this
export class MyServer implements IServer { ... }
```

#### 2. "Tool requires method but not found"

**Problem:**
```
Error: Tool "greet_user" requires method "greetUser" but it was not found
```

**Solution:**
```typescript
// Tool name in interface
interface GreetUserTool extends ITool {
  name: 'greet_user';  // snake_case
  ...
}

// Implementation uses camelCase
export default class MyServer {
  greetUser: GreetUserTool = async (params) => { ... };  // camelCase
}
```

#### 3. "Method is not a function"

**Problem:**
```
Error: Tool "greet" method "greet" is not a function (found: object)
```

**Solution:**
```typescript
// ✅ Correct - function/arrow function
greet: GreetTool = async (params) => { ... };

// ❌ Wrong - object
greet: GreetTool = { ... };
```

#### 4. Schema Generation Fails

**Problem:** Schema contains `any` instead of proper types

**Solution:**
```typescript
// ✅ Use explicit TypeScript types
params: {
  count: number;
  name: string;
  items: string[];
}

// ❌ Avoid generic types
params: any;
```

#### 5. Dynamic Resource Not Called

**Problem:** Dynamic resource returns static data

**Solution:**
```typescript
// ✅ Use URI as property name
'stats://current' = async () => {
  return { count: await getCount() };
};

// ❌ Wrong property name
stats = async () => { ... };
```

### Debug Mode

Enable verbose logging to diagnose issues:

```bash
# CLI debug
simply-mcp run server.ts --verbose

# Programmatic debug
const server = await loadInterfaceServer({
  filePath: './server.ts',
  verbose: true
});
```

**Debug output shows:**
- Parsed interface count
- Tool/prompt/resource registration
- Schema generation
- Method binding

### Getting Help

If you encounter issues:

1. Check the [examples](/mnt/Shared/cs-projects/simple-mcp/examples/) directory
2. Run with `--verbose` for detailed logs
3. Use `--dry-run` to validate without starting
4. Review the [troubleshooting section](../../src/docs/TROUBLESHOOTING.md)
5. Open an issue on [GitHub](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)

## See Also

- **Examples:**
  - [Minimal Example](/mnt/Shared/cs-projects/simple-mcp/examples/interface-minimal.ts)
  - [Advanced Example](/mnt/Shared/cs-projects/simple-mcp/examples/interface-advanced.ts)
  - [Comprehensive Example](/mnt/Shared/cs-projects/simple-mcp/examples/interface-comprehensive.ts)

- **API Comparison:**
  - [Decorator API Guide](../development/DECORATOR-API.md)
  - [Main README](../../README.md)

- **Migration:**
  - [Decorator to Interface Migration](../migration/DECORATOR_TO_INTERFACE.md)

- **Advanced Topics:**
  - [Watch Mode Guide](./WATCH_MODE_GUIDE.md)
  - [Deployment Guide](./DEPLOYMENT_GUIDE.md)

---

**Questions or feedback?** Open an issue or discussion on [GitHub](https://github.com/Clockwork-Innovations/simply-mcp-ts)!
