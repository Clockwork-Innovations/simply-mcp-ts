# Decorator API Usage Guide

## Table of Contents

- [Introduction](#introduction)
- [When to Use the Decorator API](#when-to-use-the-decorator-api)
- [Quick Start](#quick-start)
- [Core Decorators](#core-decorators)
- [Smart Defaults](#smart-defaults)
- [Type Inference](#type-inference)
- [JSDoc Documentation Support](#jsdoc-documentation-support)
- [Advanced Features](#advanced-features)
- [CLI Usage](#cli-usage)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Migration Guide](#migration-guide)
- [API Reference](#api-reference)

## Introduction

### What is the Decorator API?

The Decorator API is a class-based approach to building MCP servers using TypeScript decorators. It provides the cleanest and most intuitive way to create MCP servers - just write a class with methods, add decorators, and you're done!

**Key concept:** You write normal TypeScript classes with methods, and decorators automatically:
1. Register your methods as MCP tools, prompts, or resources
2. Extract type information from TypeScript types
3. Generate Zod validation schemas automatically
4. Parse JSDoc comments for rich documentation
5. Apply smart defaults for server configuration

```typescript
import { MCPServer, tool } from 'simply-mcp';

@MCPServer()  // Zero config needed!
export default class Calculator {
  // Public methods automatically become tools
  add(a: number, b: number): number {
    return a + b;
  }

  @tool('Multiply two numbers')  // Optional: add explicit description
  multiply(a: number, b: number): number {
    return a * b;
  }
}
```

### When to Use the Decorator API?

**Use the Decorator API when you:**
- Want class-based organization with automatic registration
- Prefer declarative code with minimal boilerplate
- Like seeing your API as a cohesive class structure
- Want TypeScript to handle all schema generation
- Need state management with class properties
- Appreciate smart defaults that "just work"

**Choose other APIs when you:**
- **Interface API**: Want the absolute cleanest code with pure interfaces
- **Functional API**: Need programmatic control and runtime flexibility
- **JSON Config**: Must define servers in configuration files

### Key Benefits

| Feature | Decorator API | Interface API | Functional API |
|---------|--------------|---------------|----------------|
| **Auto-registration** | ✅ Yes | ⭐ Manual | ❌ No |
| **Type safety** | ✅ Full | ✅ Full | ⭐ Partial |
| **Boilerplate** | ⭐ Minimal | ⭐ Minimal | ❌ Manual schemas |
| **Class-based** | ✅ Yes | ⭐ Implements | ❌ No |
| **JSDoc support** | ✅ Full | ⭐ Limited | ❌ No |
| **Smart defaults** | ✅ Yes | ⭐ Some | ❌ No |
| **State management** | ✅ Class props | ⭐ Class props | ⭐⭐ Manual |

**Bottom line:** Decorator API gives you class-based organization with automatic registration and zero schema definitions.

## Quick Start

### Installation

```bash
npm install simply-mcp
```

### Minimal Working Example (5 Minutes)

Create a file `server.ts`:

```typescript
import { MCPServer } from 'simply-mcp';

// Zero configuration - uses smart defaults!
@MCPServer()
export default class Calculator {
  // Public methods are automatically registered as tools!

  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }

  multiply(a: number, b: number): number {
    return a * b;
  }
}
```

**Smart Defaults Applied:**
- `name`: 'calculator' (kebab-case from class name)
- `version`: Auto-detected from package.json or '1.0.0'
- `transport`: stdio by default
- All public methods registered as tools

### Run It

```bash
# Using the unified CLI (auto-detects decorator API)
npx simply-mcp run server.ts

# Or using the explicit decorator command
npx simplymcp-class server.ts

# With HTTP transport
npx simply-mcp run server.ts --http --port 3000
```

That's it! Your server is running with 3 tools automatically registered.

**Important:** Classes must be exported (using `export default` or named export). Non-exported classes are never evaluated by JavaScript's module system, so decorators won't run.

## Core Decorators

### @MCPServer(config?)

Marks a class as an MCP server. All configuration is optional thanks to smart defaults.

**Basic Usage:**

```typescript
// Minimal - uses all defaults
@MCPServer()
export default class WeatherService { }
// Results in: { name: 'weather-service', version: '1.0.0' (or from package.json) }

// With custom name
@MCPServer({ name: 'custom-weather' })
export default class WeatherService { }

// With version override
@MCPServer({ version: '2.0.0' })
export default class WeatherService { }
```

**Full Configuration:**

```typescript
@MCPServer({
  name: 'my-server',           // Optional: override auto-generated name
  version: '1.0.0',            // Optional: override package.json version
  description: 'My awesome server',  // Optional: server description

  // Transport configuration (optional)
  transport: {
    type: 'http',              // 'stdio' | 'http'
    port: 3000,                // HTTP port (default: 3000)
    stateful: true             // Stateful mode (default: true)
  },

  // Capabilities (optional)
  capabilities: {
    sampling: true,            // Enable LLM sampling
    logging: true              // Enable logging notifications
  }
})
export default class MyServer { }
```

**Smart Defaults:**
- `name`: Automatically generated from class name in kebab-case
  - `WeatherService` → `weather-service`
  - `MyServer` → `my-server`
  - `APIServer` → `api-server`
- `version`: Auto-detected from package.json or defaults to '1.0.0'
- `transport`: stdio (can override with CLI flags)
- All other options optional!

### @tool(description?)

Explicitly marks a method as a tool. **Note:** This is optional - public methods are automatically registered as tools!

**When to use @tool:**
- Add a custom description (overrides JSDoc)
- Make intent explicit in code
- Document the tool inline

```typescript
// Auto-registered without decorator
add(a: number, b: number): number {
  return a + b;
}

// Explicit with custom description
@tool('Calculate the sum of two numbers')
add(a: number, b: number): number {
  return a + b;
}
```

**Auto-Registration Rules:**
- ✅ Public methods (don't start with `_`) are auto-registered
- ✅ Methods with `@tool()` are registered with custom description
- ❌ Methods starting with `_` are NOT registered (private)
- ❌ Methods decorated as `@prompt` or `@resource` are NOT registered as tools

### @prompt(description?)

Marks a method as a prompt generator.

**Usage:**

```typescript
@prompt('Generate a code review prompt')
codeReview(language: string, focus?: string): string {
  return `Review the following ${language} code.
${focus ? `Focus on: ${focus}` : 'Provide a general review.'}

Look for:
- Code quality
- Potential bugs
- Performance issues
- Best practices`;
}
```

**Prompt Features:**
- Parameters become prompt arguments
- Return type should be string
- Optional parameters supported
- Full JSDoc documentation support

### @resource(uri, options?)

Marks a method as a resource provider.

**Basic Usage:**

```typescript
@resource('config://server', { mimeType: 'application/json' })
getConfig() {
  return {
    name: 'my-server',
    version: '1.0.0',
    features: ['tools', 'prompts', 'resources']
  };
}
```

**With Options:**

```typescript
@resource('doc://readme', {
  name: 'README',
  mimeType: 'text/plain',
  description: 'Server documentation'
})
readme() {
  return `# My Server\n\nDocumentation here...`;
}
```

**Resource Options:**
- `mimeType`: MIME type (required)
- `name`: Human-readable name (optional)
- `description`: Resource description (optional)

**Common MIME Types:**
- `application/json` - JSON data
- `text/plain` - Plain text
- `text/markdown` - Markdown documentation
- `text/html` - HTML content

## Smart Defaults

The Decorator API is designed to "just work" with minimal configuration. Here's how smart defaults make your life easier:

### Auto-Generated Server Name

The decorator automatically converts your class name to kebab-case:

```typescript
@MCPServer()
class WeatherService { }
// name: 'weather-service'

@MCPServer()
class MyAPIServer { }
// name: 'my-api-server'

@MCPServer()
class SimpleCalculator { }
// name: 'simple-calculator'

@MCPServer()
class HTTPProxyServer { }
// name: 'http-proxy-server'
```

**Override when needed:**

```typescript
@MCPServer({ name: 'custom-name' })
class WeatherService { }
// name: 'custom-name'
```

### Auto-Detected Version

The decorator looks for `package.json` in:
1. Current directory
2. Parent directories (up to 10 levels)
3. Falls back to '1.0.0' if not found

```typescript
// If package.json has { "version": "2.5.1" }
@MCPServer()
class MyServer { }
// version: '2.5.1'

// No package.json found
@MCPServer()
class MyServer { }
// version: '1.0.0' (fallback)

// Override auto-detection
@MCPServer({ version: '3.0.0' })
class MyServer { }
// version: '3.0.0'
```

### Auto-Registration of Public Methods

All public methods (not starting with `_`) are automatically registered as tools:

```typescript
@MCPServer()
class MyServer {
  // ✅ Registered as tool "add"
  add(a: number, b: number) { return a + b; }

  // ✅ Registered as tool "greet" with description
  @tool('Greet a user')
  greet(name: string) { return `Hello, ${name}!`; }

  // ❌ NOT registered (private)
  _helperMethod() { }

  // ✅ Registered as prompt (not tool)
  @prompt()
  generatePrompt() { return 'Prompt text'; }
}
```

### Configuration Consolidation

The new API (v2.5.0+) consolidates configuration under logical groups:

```typescript
@MCPServer({
  // Server identity (optional - smart defaults)
  name: 'my-server',
  version: '1.0.0',
  description: 'My awesome server',

  // Transport configuration (optional - nested object)
  transport: {
    type: 'http',      // or 'stdio'
    port: 3000,        // HTTP only
    stateful: true     // HTTP only (default: true)
  },

  // Capabilities (optional - feature flags)
  capabilities: {
    sampling: true,    // Enable LLM sampling
    logging: true      // Enable logging notifications
  }
})
```

**Backwards Compatibility:**

The old flat structure still works but is deprecated:

```typescript
// Old API (deprecated but works)
@MCPServer({
  name: 'my-server',
  version: '1.0.0',
  port: 3000  // Top-level port
})

// New API (recommended)
@MCPServer({
  name: 'my-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: 3000  // Nested under transport
  }
})
```

## Type Inference

TypeScript types are automatically converted to Zod schemas for validation. No manual schema definitions needed!

### Basic Type Conversion

| TypeScript Type | Zod Schema | Notes |
|----------------|------------|-------|
| `string` | `z.string()` | Basic string |
| `number` | `z.number()` | Any number |
| `boolean` | `z.boolean()` | True/false |
| `Array<T>` | `z.array(z.T())` | Typed array |
| `Object` | `z.object({}).passthrough()` | Generic object |
| `Date` | `z.date()` | Date object |
| `any` | `z.any()` | No validation |

### Optional Parameters

Use TypeScript's `?` operator or default values:

```typescript
// Optional with ?
greet(name: string, formal?: boolean): string {
  const greeting = formal ? 'Good day' : 'Hello';
  return `${greeting}, ${name}!`;
}

// Zod schema generated:
// z.object({
//   name: z.string(),
//   formal: z.boolean().optional()
// })
```

### Default Values

```typescript
// Optional with default value
formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

// Zod schema generated:
// z.object({
//   value: z.number(),
//   decimals: z.number().default(2)
// })
```

### Complex Types

```typescript
// Arrays
processItems(items: string[], min: number): object {
  return { filtered: items.slice(min) };
}

// Zod schema:
// z.object({
//   items: z.array(z.string()),
//   min: z.number()
// })

// Union types (limited support)
setMode(mode: string): void {
  // For now, use string type
  // Future: literal union support
}
```

### Type Inference Limitations

**Current limitations (will improve in future versions):**
- Literal union types (`'a' | 'b' | 'c'`) → `z.string()`
- Complex nested objects → `z.object({}).passthrough()`
- Generic types → `z.any()`

**Workaround:** For complex validation, use the functional API with explicit Zod schemas.

## JSDoc Documentation Support

Add rich documentation with JSDoc comments - the Decorator API automatically extracts and uses them!

### Basic JSDoc

```typescript
/**
 * Add two numbers together
 *
 * @param a - First number
 * @param b - Second number
 * @returns The sum of a and b
 */
add(a: number, b: number): number {
  return a + b;
}
```

**What gets extracted:**
- ✅ Method description (main comment)
- ✅ Parameter descriptions (`@param`)
- ✅ Return value description (`@returns`)

### Advanced JSDoc

```typescript
/**
 * Calculate the area of different shapes
 *
 * This tool supports circles, rectangles, and triangles.
 * It returns the calculated area with appropriate units.
 *
 * @param shape - Type of shape ('circle', 'rectangle', 'triangle')
 * @param dimension1 - First dimension (radius/width/base)
 * @param dimension2 - Second dimension (optional for circle)
 * @returns Calculated area with unit
 *
 * @example
 * calculateArea('circle', 5)
 * // Returns: "Circle area: 78.54 sq units"
 *
 * @example
 * calculateArea('rectangle', 10, 5)
 * // Returns: "Rectangle area: 50 sq units"
 *
 * @throws {Error} Invalid shape type
 * @throws {Error} Missing required dimension
 */
@tool()
calculateArea(shape: string, dimension1: number, dimension2?: number): string {
  // implementation
}
```

**What gets extracted:**
- ✅ Full description (multiple paragraphs)
- ✅ Parameter descriptions with types
- ✅ Return value description
- ✅ Usage examples (`@example`)
- ✅ Error conditions (`@throws`)

### JSDoc Best Practices

**DO:**
- Write clear, concise descriptions
- Document all parameters
- Include examples for complex tools
- List possible errors with `@throws`

**DON'T:**
- Duplicate information in description and params
- Use JSDoc for implementation details (use inline comments)
- Over-document simple, obvious methods

### JSDoc to MCP Schema Mapping

When you use JSDoc comments with the Decorator API, Simply MCP automatically extracts documentation and maps it to the MCP tool schema that AI agents see.

#### What Gets Mapped

**Tool Description:**
- ✅ Root JSDoc comment (first paragraph) becomes `description` field
- ❌ Don't use `@description` tag (unnecessary - root comment is used)

**Parameter Descriptions:**
- ✅ `@param paramName - Description` becomes `inputSchema.properties.paramName.description`
- ✅ These descriptions are visible to AI agents when selecting tools
- ❌ Type information from `@param {type}` is NOT used (TypeScript types are used instead)

**Return Value:**
- ⚠️ `@returns Description` is extracted but **NOT included in MCP tool schema**
- ✅ Use for documentation purposes (shows up in IDE)
- ℹ️ **Why:** MCP specification (as of 2025-06) doesn't have an `outputSchema` field for tools
- 🔮 **Future:** May be used if MCP spec adds `outputSchema` support

#### Visual: JSDoc → Schema Transformation

```
┌─────────────────────────────────────────────────────────────┐
│                TypeScript Method with JSDoc                  │
│                                                              │
│  /**                                                         │
│   * Calculate tip amount and total bill    ◄────────┐       │
│   *                                                  │       │
│   * This tool helps calculate restaurant tips       │       │
│   *                                                  │       │
│   * @param billAmount - Bill before tip (dollars) ◄─┼───┐   │
│   * @param tipPercentage - Tip % (0-100)  ◄─────────┼───┼─┐ │
│   * @returns Formatted string with tip and total ◄──┼───┼─│ │
│   */                                                 │   │ │ │
│  @tool()                                             │   │ │ │
│  calculateTip(billAmount: number, tipPercentage: number) {  │
│    const tip = billAmount * (tipPercentage / 100);  │   │ │ │
│    return `Tip: $${tip.toFixed(2)}, Total: $${...}`; │   │ │ │
│  }                                                   │   │ │ │
└──────────────────────────────────────────────────────┼───┼─┼─┘
                                                       │   │ │
                      ┌────────────────────────────────┘   │ │
                      │        ┌───────────────────────────┘ │
                      │        │        ┌────────────────────┘
                      ▼        ▼        ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Tool Schema (JSON)                    │
│                                                              │
│  {                                                           │
│    "name": "calculate_tip",                                 │
│    "description": "Calculate tip amount and total bill\n\n  │
│                    This tool helps calculate restaurant tips",│
│    "inputSchema": {                                         │
│      "type": "object",                                      │
│      "properties": {                                        │
│        "billAmount": {                                      │
│          "type": "number",                                  │
│          "description": "Bill before tip (dollars)"   ◄─────┤
│        },                                                   │
│        "tipPercentage": {                                   │
│          "type": "number",                                  │
│          "description": "Tip % (0-100)"  ◄──────────────────┤
│        }                                                    │
│      },                                                     │
│      "required": ["billAmount", "tipPercentage"]            │
│    }                                                        │
│  }                                                          │
│                                                             │
│  NOTE: @returns is extracted but NOT in schema             │
│        (MCP spec doesn't support outputSchema yet)         │
└─────────────────────────────────────────────────────────────┘
```

#### Complete Example with Generated Schema

**Your TypeScript Code:**

```typescript
/**
 * Calculate tip amount and total bill
 *
 * This tool helps users calculate restaurant tips with
 * the specified tip percentage.
 *
 * @param billAmount - Bill amount before tip (in dollars)
 * @param tipPercentage - Tip percentage (0-100)
 * @returns Formatted string with tip amount and total bill
 */
@tool()
calculateTip(billAmount: number, tipPercentage: number): string {
  const tip = billAmount * (tipPercentage / 100);
  const total = billAmount + tip;
  return `Tip: $${tip.toFixed(2)}, Total: $${total.toFixed(2)}`;
}
```

**Generated MCP Schema:**

```json
{
  "name": "calculate_tip",
  "description": "Calculate tip amount and total bill\n\nThis tool helps users calculate restaurant tips with the specified tip percentage.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "billAmount": {
        "type": "number",
        "description": "Bill amount before tip (in dollars)"
      },
      "tipPercentage": {
        "type": "number",
        "description": "Tip percentage (0-100)"
      }
    },
    "required": ["billAmount", "tipPercentage"]
  }
}
```

**What Happened:**
- Root JSDoc comment → `tool.description`
- `@param billAmount` → `inputSchema.properties.billAmount.description`
- `@param tipPercentage` → `inputSchema.properties.tipPercentage.description`
- `@returns` → Extracted but NOT in schema (MCP spec limitation)
- TypeScript types (`number`) → `inputSchema.properties[].type`

#### Why This Matters

**Parameter descriptions are critical** - they're visible to AI agents when selecting tools. Well-documented parameters help AI agents:
- Choose the right tool for the task
- Provide correct argument values
- Understand constraints and valid formats
- Handle edge cases appropriately

**Example:**

```typescript
// ❌ Poor documentation - AI doesn't know constraints
/**
 * Create user
 * @param username - The username
 * @param role - The role
 */
@tool()
createUser(username: string, role: string) { }

// ✅ Good documentation - AI knows exactly what to provide
/**
 * Create a new user account
 *
 * @param username - Username (3-20 characters, alphanumeric and underscore only)
 * @param role - User role: 'admin', 'editor', or 'viewer'
 */
@tool()
createUser(username: string, role: string) { }
```

For complete JSDoc documentation including API comparisons, best practices, and troubleshooting, see the [JSDoc and Descriptions Guide](./JSDOC_AND_DESCRIPTIONS.md).

## Advanced Features

### Optional Parameters

Optional parameters work exactly as you'd expect:

```typescript
@tool()
greet(name: string, formal?: boolean, language?: string): string {
  const greeting = formal ? 'Good day' : 'Hello';
  const suffix = language === 'fr' ? '!' : '.';
  return `${greeting}, ${name}${suffix}`;
}
```

**Generated schema:**
```typescript
z.object({
  name: z.string(),
  formal: z.boolean().optional(),
  language: z.string().optional()
})
```

### Default Parameter Values

Default values are automatically included in the schema:

```typescript
@tool()
repeat(text: string, count: number = 2, separator: string = ''): string {
  return Array(count).fill(text).join(separator);
}
```

**Generated schema:**
```typescript
z.object({
  text: z.string(),
  count: z.number().default(2),
  separator: z.string().default('')
})
```

### Private Methods

Methods starting with `_` are private and won't be registered:

```typescript
@MCPServer()
class MyServer {
  @tool()
  complexCalculation(a: number, b: number): number {
    return this._helperMethod(a) + this._helperMethod(b);
  }

  // Private - won't be registered as tool
  _helperMethod(x: number): number {
    return x * 2;
  }
}
```

### State Management

Use class properties to maintain state:

```typescript
@MCPServer()
class StatefulServer {
  private counter = 0;
  private history: string[] = [];

  @tool('Increment counter')
  increment(): number {
    this.counter++;
    this.history.push(`incremented to ${this.counter}`);
    return this.counter;
  }

  @tool('Get counter value')
  getCounter(): number {
    return this.counter;
  }

  @tool('Get history')
  getHistory(): string[] {
    return [...this.history];
  }

  @tool('Reset counter')
  reset(): void {
    this.counter = 0;
    this.history = [];
  }
}
```

**Note:** State is per-server instance. For HTTP stateful mode, state is maintained across requests within the same session.

### Mixed Tool Types

Combine tools, prompts, and resources in one class:

```typescript
@MCPServer()
class ComprehensiveServer {
  // Tool
  @tool('Calculate sum')
  add(a: number, b: number): number {
    return a + b;
  }

  // Prompt
  @prompt('Generate code review prompt')
  codeReview(language: string): string {
    return `Review this ${language} code for best practices.`;
  }

  // Resource
  @resource('config://server', { mimeType: 'application/json' })
  getConfig() {
    return { version: '1.0.0' };
  }
}
```

### Async Methods

All methods can be async:

```typescript
@MCPServer()
class AsyncServer {
  @tool('Fetch user data')
  async getUser(id: string): Promise<object> {
    const response = await fetch(`https://api.example.com/users/${id}`);
    return response.json();
  }

  @tool('Save data')
  async saveData(data: object): Promise<string> {
    // Async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    return 'Data saved successfully';
  }
}
```

## CLI Usage

The Decorator API works with Simply MCP's unified CLI, which auto-detects your API style.

### Basic Commands

```bash
# Auto-detection (recommended)
npx simply-mcp run server.ts

# Explicit decorator command
npx simplymcp-class server.ts

# With HTTP transport
npx simply-mcp run server.ts --http --port 3000

# Watch mode (auto-restart on changes)
npx simply-mcp run server.ts --watch

# Validate without running
npx simply-mcp run server.ts --dry-run

# Verbose output
npx simply-mcp run server.ts --verbose
```

### CLI Options

| Option | Description | Example |
|--------|-------------|---------|
| `--http` | Use HTTP transport | `--http --port 3000` |
| `--port <n>` | HTTP port (default: 3000) | `--port 8080` |
| `--watch` | Auto-restart on file changes | `--watch` |
| `--dry-run` | Validate without starting | `--dry-run` |
| `--verbose` | Show detailed logs | `--verbose` |
| `--inspect` | Enable Node.js debugger | `--inspect` |
| `--help` | Show help | `--help` |

### Environment Variables

```bash
# Set port via environment
PORT=4000 npx simply-mcp run server.ts --http

# Debug mode
DEBUG=* npx simply-mcp run server.ts

# Node options
NODE_OPTIONS='--max-old-space-size=4096' npx simply-mcp run server.ts
```

### Multiple Servers

Run multiple servers simultaneously:

```bash
npx simply-mcp run server1.ts server2.ts server3.ts
```

Each server runs in its own process.

## Complete Examples

### Example 1: Minimal Server (Zero Config)

See: [`examples/class-minimal.ts`](/mnt/Shared/cs-projects/simple-mcp/examples/class-minimal.ts)

The absolute cleanest way - just a class with methods!

```typescript
import { MCPServer } from 'simply-mcp';

@MCPServer()  // Zero configuration!
export default class WeatherService {
  // Public methods are automatically registered as tools!

  getTemperature(city: string): string {
    return `The temperature in ${city} is 72°F`;
  }

  getForecast(city: string, days: number): string {
    return `${days}-day forecast for ${city}: Sunny with occasional clouds`;
  }

  getHumidity(city: string): number {
    return 65;
  }

  // Private method (starts with _) - NOT registered as a tool
  _calculateWindChill(temp: number, windSpeed: number): number {
    return temp - windSpeed * 0.7;
  }

  convertTemp(celsius: number): string {
    const fahrenheit = (celsius * 9/5) + 32;
    return `${celsius}°C = ${fahrenheit}°F`;
  }
}
```

**Run it:**
```bash
npx simply-mcp run examples/class-minimal.ts
```

**What you get:**
- Server name: 'weather-service' (auto-generated)
- Version: Auto-detected from package.json
- 4 tools automatically registered
- Zero configuration needed!

### Example 2: Basic Server with Explicit Decorators

See: [`examples/class-basic.ts`](/mnt/Shared/cs-projects/simple-mcp/examples/class-basic.ts)

Add explicit decorators for custom descriptions and mixed capabilities:

```typescript
import { MCPServer, tool, prompt, resource } from 'simply-mcp';

@MCPServer({ name: 'my-server', version: '1.0.0' })
export default class MyServer {
  /**
   * Greet a user by name
   */
  @tool('Greet a user with a personalized message')
  greet(name: string, formal?: boolean): string {
    const greeting = formal ? 'Good day' : 'Hello';
    return `${greeting}, ${name}! Welcome!`;
  }

  /**
   * Add two numbers together
   */
  @tool()
  add(a: number, b: number): string {
    return `${a} + ${b} = ${a + b}`;
  }

  /**
   * Code review prompt generator
   */
  @prompt('Generate a code review prompt')
  codeReview(language: string, focus?: string): string {
    return `Review the following ${language} code.
${focus ? `Focus on: ${focus}` : 'Provide a general review.'}

Look for:
- Code quality
- Potential bugs
- Performance issues
- Best practices`;
  }

  /**
   * Server configuration resource
   */
  @resource('config://server', { mimeType: 'application/json' })
  serverConfig() {
    return {
      name: 'my-server',
      version: '1.0.0',
      features: ['tools', 'prompts', 'resources'],
      style: 'class-based with decorators',
    };
  }
}
```

**Run it:**
```bash
npx simply-mcp run examples/class-basic.ts --http --port 3000
```

### Example 3: Advanced Server with JSDoc

See: [`examples/class-advanced.ts`](/mnt/Shared/cs-projects/simple-mcp/examples/class-advanced.ts)

Demonstrates all advanced features:

```typescript
import { MCPServer, tool } from 'simply-mcp';

@MCPServer({
  name: 'advanced-calculator',
  version: '2.0.0',
  description: 'Advanced calculator with shape calculations',
  transport: {
    type: 'http',
    port: 3400,
    stateful: true
  },
  capabilities: {
    logging: true,
    sampling: false
  }
})
export default class AdvancedCalculator {
  /**
   * Calculate the area of different shapes
   *
   * @param shape - Type of shape ('circle', 'rectangle', 'triangle')
   * @param dimension1 - First dimension (radius/width/base)
   * @param dimension2 - Second dimension (optional for circle)
   * @returns Calculated area with unit
   *
   * @example
   * calculateArea('circle', 5)
   * // Returns: "Circle area: 78.54 sq units"
   *
   * @example
   * calculateArea('rectangle', 10, 5)
   * // Returns: "Rectangle area: 50 sq units"
   *
   * @throws {Error} Invalid shape type
   * @throws {Error} Missing required dimension
   */
  @tool('Calculate area of different geometric shapes')
  calculateArea(shape: string, dimension1: number, dimension2?: number): string {
    switch (shape.toLowerCase()) {
      case 'circle':
        const area = Math.PI * dimension1 * dimension1;
        return `Circle area: ${area.toFixed(2)} sq units`;

      case 'rectangle':
        if (!dimension2) throw new Error('Rectangle requires both width and height');
        return `Rectangle area: ${dimension1 * dimension2} sq units`;

      case 'triangle':
        if (!dimension2) throw new Error('Triangle requires both base and height');
        return `Triangle area: ${(dimension1 * dimension2) / 2} sq units`;

      default:
        throw new Error(`Unknown shape: ${shape}`);
    }
  }

  /**
   * Format a number with custom options
   *
   * @param value - Number to format
   * @param decimals - Number of decimal places (default: 2)
   * @param prefix - Optional prefix (e.g., '$', '€')
   * @param suffix - Optional suffix (e.g., 'USD', 'kg')
   * @returns Formatted number string
   *
   * @example
   * formatNumber(1234.567, 2, '$')
   * // Returns: "$1234.57"
   */
  @tool()
  formatNumber(
    value: number,
    decimals: number = 2,
    prefix?: string,
    suffix?: string
  ): string {
    const formatted = value.toFixed(decimals);
    return `${prefix || ''}${formatted}${suffix || ''}`;
  }
}
```

**Run it:**
```bash
npx simply-mcp run examples/class-advanced.ts --http --port 3400
```

### Example 4: JSDoc-Documented Server

See: [`examples/class-jsdoc.ts`](/mnt/Shared/cs-projects/simple-mcp/examples/class-jsdoc.ts)

Shows automatic JSDoc parsing:

```typescript
import { MCPServer } from 'simply-mcp';

@MCPServer({ name: 'weather-jsdoc', version: '1.0.0' })
export default class WeatherServiceWithJSDoc {
  /**
   * Get the current temperature for a specific city
   *
   * @param city - Name of the city to get temperature for
   * @returns Temperature string in Fahrenheit
   */
  getTemperature(city: string): string {
    return `The temperature in ${city} is 72°F`;
  }

  /**
   * Get weather forecast for multiple days
   *
   * @param city - Name of the city to forecast
   * @param days - Number of days to include in forecast (1-14)
   * @returns Multi-day forecast description
   */
  getForecast(city: string, days: number): string {
    return `${days}-day forecast for ${city}: Sunny with occasional clouds`;
  }

  /**
   * Convert temperature between Celsius and Fahrenheit
   *
   * @param value - Temperature value to convert
   * @param fromUnit - Source unit ('C' or 'F')
   * @returns Converted temperature with both values
   */
  convertTemperature(value: number, fromUnit: string): string {
    if (fromUnit.toUpperCase() === 'C') {
      const fahrenheit = (value * 9 / 5) + 32;
      return `${value}°C = ${fahrenheit.toFixed(1)}°F`;
    } else {
      const celsius = (value - 32) * 5 / 9;
      return `${value}°F = ${celsius.toFixed(1)}°C`;
    }
  }
}
```

**Run it:**
```bash
npx simply-mcp run examples/class-jsdoc.ts --http --port 3011
```

### Example 5: Prompts and Resources

See: [`examples/class-prompts-resources.ts`](/mnt/Shared/cs-projects/simple-mcp/examples/class-prompts-resources.ts)

Complete example with tools, prompts, and resources:

```typescript
import { MCPServer, tool, prompt, resource } from 'simply-mcp';

@MCPServer({
  name: 'example-prompts-resources',
  version: '1.0.0',
  description: 'Example server with tools, prompts, and resources'
})
export default class ExampleServer {
  @tool('Perform basic math operations')
  calculate(
    a: number,
    b: number,
    operation: 'add' | 'subtract' | 'multiply' | 'divide'
  ): number {
    switch (operation) {
      case 'add': return a + b;
      case 'subtract': return a - b;
      case 'multiply': return a * b;
      case 'divide':
        if (b === 0) throw new Error('Division by zero');
        return a / b;
    }
  }

  @prompt('Generate a friendly greeting message')
  greetingPrompt(name: string, style?: string): string {
    const styleText = style ? ` in a ${style} style` : '';
    return `Generate a friendly greeting for ${name}${styleText}.`;
  }

  @resource('info://server/status', { mimeType: 'application/json' })
  serverStatus(): object {
    return {
      status: 'running',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
}
```

**Run it:**
```bash
npx simply-mcp run examples/class-prompts-resources.ts
```

## Best Practices

### 1. Use Smart Defaults

Let the framework do the work - don't over-configure:

```typescript
// ❌ Over-configured
@MCPServer({
  name: 'weather-service',  // Already matches class name
  version: '1.0.0',         // Already in package.json
})
class WeatherService { }

// ✅ Let smart defaults work
@MCPServer()
class WeatherService { }
```

### 2. Use Descriptive Class and Method Names

The framework generates names from your code:

```typescript
// ✅ Good - clear, descriptive names
@MCPServer()
class WeatherService {
  getCurrentTemperature(city: string) { }
  getWeeklyForecast(city: string) { }
}

// ❌ Bad - vague names
@MCPServer()
class Service {
  get(x: string) { }
  process(y: string) { }
}
```

### 3. Add JSDoc for Complex Tools

Complex tools deserve good documentation:

```typescript
// ✅ Good - comprehensive documentation
/**
 * Process an array with filtering and transformation
 *
 * @param items - Array of numbers to process
 * @param min - Minimum value to include (optional)
 * @param max - Maximum value to include (optional)
 * @param operation - Transform operation ('double', 'square', 'sqrt')
 * @returns Processed array with statistics
 *
 * @example
 * processArray([1, 2, 3, 4, 5], 2, 4, 'double')
 * // Returns: { filtered: [2, 3, 4], transformed: [4, 6, 8] }
 */
@tool()
processArray(
  items: number[],
  min?: number,
  max?: number,
  operation: string = 'double'
): object {
  // implementation
}
```

### 4. Use Private Methods for Helpers

Keep helper methods private with `_` prefix:

```typescript
// ✅ Good - clear separation
@MCPServer()
class MyServer {
  @tool()
  complexCalculation(a: number, b: number): number {
    return this._validate(a) + this._validate(b);
  }

  // Private - not exposed as tool
  _validate(x: number): number {
    if (x < 0) throw new Error('Negative numbers not allowed');
    return x;
  }
}
```

### 5. Leverage TypeScript Types

Let TypeScript types drive your validation:

```typescript
// ✅ Good - rich type information
@tool()
formatDate(
  date: Date,
  locale: string = 'en-US',
  options?: {
    dateStyle?: 'full' | 'long' | 'medium' | 'short';
    timeStyle?: 'full' | 'long' | 'medium' | 'short';
  }
): string {
  return date.toLocaleDateString(locale, options);
}

// ❌ Bad - too generic
@tool()
format(x: any, y: any): any {
  return x;
}
```

### 6. Use Optional Parameters Wisely

Optional parameters add flexibility:

```typescript
// ✅ Good - sensible defaults
@tool('Greet a user')
greet(
  name: string,
  formal: boolean = false,
  language: string = 'en',
  includeTime: boolean = false
): string {
  // implementation
}

// ❌ Bad - too many required params
@tool('Greet a user')
greet(
  name: string,
  formal: boolean,
  language: string,
  includeTime: boolean,
  prefix: string,
  suffix: string
): string {
  // implementation
}
```

### 7. Organize Complex Servers

For large servers, organize by feature:

```typescript
@MCPServer()
class ComprehensiveServer {
  // ============================================================================
  // CALCULATION TOOLS
  // ============================================================================

  @tool('Add two numbers')
  add(a: number, b: number): number { return a + b; }

  @tool('Multiply two numbers')
  multiply(a: number, b: number): number { return a * b; }

  // ============================================================================
  // FORMAT TOOLS
  // ============================================================================

  @tool('Format currency')
  formatCurrency(amount: number, currency: string = 'USD'): string { }

  @tool('Format date')
  formatDate(date: Date, format: string = 'ISO'): string { }

  // ============================================================================
  // PROMPTS
  // ============================================================================

  @prompt('Code review prompt')
  codeReview(language: string): string { }

  // ============================================================================
  // RESOURCES
  // ============================================================================

  @resource('config://server', { mimeType: 'application/json' })
  getConfig(): object { }
}
```

### 8. Handle Errors Gracefully

Throw descriptive errors:

```typescript
// ✅ Good - clear error messages
@tool()
divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero is not allowed');
  }
  return a / b;
}

// ❌ Bad - generic errors
@tool()
divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Error');
  }
  return a / b;
}
```

### 9. Test Your Tools

Write tests for your server:

```typescript
// tests/weather-service.test.ts
import WeatherService from '../server';

describe('WeatherService', () => {
  let service: WeatherService;

  beforeEach(() => {
    service = new WeatherService();
  });

  test('getTemperature returns temperature string', () => {
    const result = service.getTemperature('New York');
    expect(result).toContain('New York');
    expect(result).toContain('°F');
  });

  test('convertTemp converts correctly', () => {
    const result = service.convertTemp(0);
    expect(result).toBe('0°C = 32°F');
  });
});
```

### 10. Version Your Servers

Use semantic versioning:

```typescript
@MCPServer({
  version: '1.0.0'  // Or let it auto-detect from package.json
})
class MyServer {
  // When you add features: 1.1.0
  // When you fix bugs: 1.0.1
  // When you break compatibility: 2.0.0
}
```

## Troubleshooting

### Common Issues

#### 1. "No class found in module"

**Problem:**
```
Error: No class found in module
```

**Solution:**
Make sure you have a default export:

```typescript
// ✅ Correct
@MCPServer()
export default class MyServer { }

// ❌ Wrong - missing 'default'
@MCPServer()
export class MyServer { }
```

#### 2. "Class must be decorated with @MCPServer"

**Problem:**
```
Error: Class must be decorated with @MCPServer
```

**Solution:**
Add the `@MCPServer()` decorator:

```typescript
// ❌ Missing decorator
export default class MyServer { }

// ✅ Correct
@MCPServer()
export default class MyServer { }
```

#### 3. Decorators Not Running

**Problem:** Decorators seem to be ignored, no tools registered.

**Solution:** Make sure your class is exported:

```typescript
// ❌ Not exported - decorators never run
@MCPServer()
class MyServer { }

// ✅ Exported - decorators run
@MCPServer()
export default class MyServer { }
```

**Why?** Non-exported classes are never evaluated by JavaScript's module system, so decorators don't execute.

#### 4. Types Not Inferred Correctly

**Problem:** Parameters show as `any` instead of proper types.

**Solution:**

1. Check TypeScript configuration (optional, for IDE support):
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

2. Import `reflect-metadata` at the top of your file:
```typescript
import 'reflect-metadata';
import { MCPServer } from 'simply-mcp';
```

**Note:** Simply MCP uses `tsx` which handles TypeScript automatically. The `tsconfig.json` is only needed for IDE type checking, not for running your server.

#### 5. "Cannot find module 'simply-mcp'"

**Problem:**
```
Error: Cannot find module 'simply-mcp'
```

**Solution:**
Install the package:

```bash
npm install simply-mcp
```

#### 6. HTTP Server Won't Start

**Problem:** Server starts but doesn't respond on HTTP port.

**Solution:**

1. Check if port is already in use:
```bash
lsof -i :3000
```

2. Use a different port:
```bash
npx simply-mcp run server.ts --http --port 3001
```

3. Check firewall settings

#### 7. Private Methods Being Registered

**Problem:** Helper methods are showing up as tools.

**Solution:** Prefix private methods with underscore:

```typescript
// ❌ Will be registered as tool
helperMethod() { }

// ✅ Won't be registered (private)
_helperMethod() { }
```

#### 8. JSDoc Not Being Parsed

**Problem:** JSDoc comments are ignored.

**Solution:**

1. Use proper JSDoc syntax:
```typescript
// ✅ Correct JSDoc
/**
 * Description here
 * @param name - Parameter description
 */
myMethod(name: string) { }

// ❌ Wrong - single-line comment
// Description here
myMethod(name: string) { }
```

2. Place JSDoc directly above method:
```typescript
// ✅ Correct placement
/**
 * Description
 */
@tool()
myMethod() { }

// ❌ Wrong - separated by decorator
@tool()
/**
 * Description
 */
myMethod() { }
```

### Debug Mode

Enable verbose logging to diagnose issues:

```bash
# CLI debug
npx simply-mcp run server.ts --verbose

# With inspector (Chrome DevTools)
npx simply-mcp run server.ts --inspect
```

**Debug output shows:**
- Class detection
- Decorator application
- Tool/prompt/resource registration
- Type inference
- Schema generation

### Getting Help

If you encounter issues:

1. Check the [examples](/mnt/Shared/cs-projects/simple-mcp/examples/) directory
2. Run with `--verbose` for detailed logs
3. Use `--dry-run` to validate without starting
4. Review this [troubleshooting section](#troubleshooting)
5. Check the [main troubleshooting guide](/mnt/Shared/cs-projects/simple-mcp/src/docs/TROUBLESHOOTING.md)
6. Open an issue on [GitHub](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)

## Migration Guide

### From Old Decorator API

If you're using the old decorator API, here's how to migrate to v2.5.0+:

#### Change 1: Unified Imports

**Old:**
```typescript
import { MCPServer } from 'simply-mcp/decorators';
import { tool } from 'simply-mcp/decorators';
```

**New:**
```typescript
// All decorators from one package
import { MCPServer, tool, prompt, resource } from 'simply-mcp';
```

**Note:** The old import pattern still works but is deprecated.

#### Change 2: Transport Configuration

**Old:**
```typescript
@MCPServer({
  name: 'my-server',
  version: '1.0.0',
  port: 3000  // Top-level port
})
```

**New:**
```typescript
@MCPServer({
  name: 'my-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: 3000,       // Nested under transport
    stateful: true
  }
})
```

#### Change 3: Use Smart Defaults

**Old (Explicit):**
```typescript
@MCPServer({
  name: 'my-server',
  version: '1.0.0'
})
export default class MyServer { }
```

**New (Smart Defaults):**
```typescript
// Let the framework generate name and version
@MCPServer()
export default class MyServer { }
```

#### Change 4: CLI Commands

**Old:**
```bash
npx tsx mcp/class-adapter.ts my-server.ts --http --port 3000
```

**New:**
```bash
# Recommended
npx simply-mcp run my-server.ts --http --port 3000

# Or explicit
npx simplymcp-class my-server.ts --http --port 3000
```

### From Functional API

Migrating from functional API to decorators:

**Functional API:**
```typescript
import { SimplyMCP } from 'simply-mcp';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'calculator',
  version: '1.0.0'
});

server.addTool({
  name: 'add',
  description: 'Add two numbers',
  parameters: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number')
  }),
  execute: async (args) => {
    return {
      content: [{ type: 'text', text: `Sum: ${args.a + args.b}` }]
    };
  }
});

await server.start({ transport: 'http', port: 3000 });
```

**Decorator API:**
```typescript
import { MCPServer } from 'simply-mcp';

@MCPServer()  // Zero config!
export default class Calculator {
  /**
   * Add two numbers
   * @param a - First number
   * @param b - Second number
   */
  add(a: number, b: number): number {
    return a + b;
  }
}

// Run with: npx simply-mcp run calculator.ts --http --port 3000
```

**Benefits of migration:**
- No manual Zod schemas
- No manual registration
- TypeScript types drive validation
- JSDoc for descriptions
- Cleaner, more maintainable code

### From Interface API

Both APIs are excellent - choose based on preference:

**Interface API:**
```typescript
import type { ITool, IServer } from 'simply-mcp';

interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: { a: number; b: number };
  result: number;
}

interface Calculator extends IServer {
  name: 'calculator';
  version: '1.0.0';
}

export default class CalculatorService implements Calculator {
  add: AddTool = async (params) => params.a + params.b;
}
```

**Decorator API:**
```typescript
import { MCPServer } from 'simply-mcp';

@MCPServer()
export default class Calculator {
  /**
   * Add two numbers
   */
  add(a: number, b: number): number {
    return a + b;
  }
}
```

**Comparison:**
- **Interface API**: Pure interfaces, explicit types, no decorators
- **Decorator API**: Class-based, auto-registration, JSDoc support

Both offer zero boilerplate and full type safety. Choose based on coding style preference.

## API Reference

### @MCPServer(config?)

Decorator that marks a class as an MCP server.

**Type:**
```typescript
function MCPServer(config?: MCPServerConfig): ClassDecorator
```

**Config Interface:**
```typescript
interface MCPServerConfig {
  // Server identity
  name?: string;              // Auto-generated from class name if not provided
  version?: string;           // Auto-detected from package.json or '1.0.0'
  description?: string;       // Optional server description

  // Transport configuration
  transport?: {
    type?: 'stdio' | 'http';  // Default: 'stdio'
    port?: number;            // Default: 3000 (HTTP only)
    stateful?: boolean;       // Default: true (HTTP only)
  };

  // Capabilities
  capabilities?: {
    sampling?: boolean;       // Enable LLM sampling
    logging?: boolean;        // Enable logging notifications
  };
}
```

**Examples:**
```typescript
// Minimal
@MCPServer()
class MyServer { }

// With name and version
@MCPServer({ name: 'custom-server', version: '2.0.0' })
class MyServer { }

// Full configuration
@MCPServer({
  name: 'api-server',
  version: '1.0.0',
  description: 'My API server',
  transport: {
    type: 'http',
    port: 8080,
    stateful: true
  },
  capabilities: {
    sampling: true,
    logging: true
  }
})
class MyServer { }
```

### @tool(description?)

Decorator that explicitly marks a method as a tool.

**Type:**
```typescript
function tool(description?: string): MethodDecorator
```

**Parameters:**
- `description` (optional): Tool description (overrides JSDoc)

**Usage:**
```typescript
// Without description (uses JSDoc)
@tool()
add(a: number, b: number): number { return a + b; }

// With description
@tool('Add two numbers together')
add(a: number, b: number): number { return a + b; }
```

**Notes:**
- Optional - public methods auto-register as tools
- Use when you want custom description
- Overrides JSDoc if both present

### @prompt(description?)

Decorator that marks a method as a prompt generator.

**Type:**
```typescript
function prompt(description?: string): MethodDecorator
```

**Parameters:**
- `description` (optional): Prompt description

**Usage:**
```typescript
@prompt('Generate a code review prompt')
codeReview(language: string, focus?: string): string {
  return `Review this ${language} code. Focus: ${focus || 'general'}`;
}
```

**Return Type:** Should return string (prompt text)

### @resource(uri, options?)

Decorator that marks a method as a resource provider.

**Type:**
```typescript
function resource(uri: string, options?: ResourceOptions): MethodDecorator
```

**Parameters:**
- `uri` (required): Resource URI
- `options` (optional): Resource options

**Options Interface:**
```typescript
interface ResourceOptions {
  mimeType: string;       // MIME type (required)
  name?: string;          // Human-readable name
  description?: string;   // Resource description
}
```

**Usage:**
```typescript
// Basic
@resource('config://server', { mimeType: 'application/json' })
getConfig() { return { version: '1.0.0' }; }

// With full options
@resource('doc://readme', {
  name: 'README',
  mimeType: 'text/plain',
  description: 'Server documentation'
})
readme() { return 'Documentation text...'; }
```

**Common MIME Types:**
- `application/json` - JSON data
- `text/plain` - Plain text
- `text/markdown` - Markdown
- `text/html` - HTML
- `application/xml` - XML

### Type Inference

The framework automatically infers types from TypeScript:

**Supported Types:**
- `string` → `z.string()`
- `number` → `z.number()`
- `boolean` → `z.boolean()`
- `Date` → `z.date()`
- `Array<T>` → `z.array(z.T())`
- `T?` → `z.T().optional()`
- `T = value` → `z.T().default(value)`

**Limitations:**
- Literal unions (`'a' | 'b'`) → `z.string()` (currently)
- Complex nested objects → `z.object({}).passthrough()`
- Generic types → `z.any()`

### Auto-Registration

**Rules:**
1. Public methods (not starting with `_`) are registered as tools
2. Methods with `@prompt()` are registered as prompts (not tools)
3. Methods with `@resource()` are registered as resources (not tools)
4. Methods with `_` prefix are private (not registered)

**Example:**
```typescript
@MCPServer()
class MyServer {
  // ✅ Tool (public)
  add(a: number, b: number) { }

  // ✅ Tool with description
  @tool('Multiply')
  multiply(a: number, b: number) { }

  // ✅ Prompt (not tool)
  @prompt()
  generatePrompt() { }

  // ✅ Resource (not tool)
  @resource('config://app', { mimeType: 'application/json' })
  getConfig() { }

  // ❌ Private (not registered)
  _helper() { }
}
```

---

## Summary

The Decorator API provides the cleanest class-based approach to building MCP servers:

**Key Features:**
- Zero configuration with smart defaults
- Automatic method registration
- TypeScript types → Zod schemas
- JSDoc documentation support
- Optional and default parameters
- State management with class properties
- Mixed tools, prompts, and resources

**Get started now:**
```bash
# Create server.ts
echo '@MCPServer()
export default class MyServer {
  greet(name: string) { return `Hello, ${name}!`; }
}' > server.ts

# Run it
npx simply-mcp run server.ts
```

For more information, see:
- [Interface API Guide](./INTERFACE_API_GUIDE.md) - Alternative pure interface approach
- [Bundling Guide](./BUNDLING.md) - Package for distribution
- [Main README](../../README.md) - Framework overview
- [Examples Directory](/mnt/Shared/cs-projects/simple-mcp/examples/) - Working examples

---

**Questions or feedback?** Open an issue or discussion on [GitHub](https://github.com/Clockwork-Innovations/simply-mcp-ts)!
