# Decorator-Based MCP API Guide

## Overview

The decorator-based API provides the cleanest and most intuitive way to create MCP servers using TypeScript classes. Just write a class with methods, add decorators, and you're done!

## Quick Start

### Minimal Example (Zero Config!)

```typescript
import { MCPServer } from 'simply-mcp/decorators';

// Zero config - uses smart defaults!
@MCPServer()
export default class MyServer {
  // Public methods are automatically registered as tools!

  add(a: number, b: number): number {
    return a + b;
  }

  greet(name: string): string {
    return `Hello, ${name}!`;
  }
}
```

**Smart Defaults Applied:**
- `name`: 'my-server' (kebab-case from class name)
- `version`: Auto-detected from package.json or '1.0.0'
- `transport`: stdio by default
- `capabilities`: Empty (can be enabled as needed)

**Run it:**
```bash
# New simplified CLI (recommended)
simplymcp run my-server.ts --http --port 3000
# Or: simplymcp-class my-server.ts --http --port 3000

# Old command (still works but deprecated)
npx tsx mcp/class-adapter.ts my-server.ts --http --port 3000
```

That's it! Your server is running with 2 tools automatically registered.

## Core Decorators

### `@MCPServer(config?)`

Marks a class as an MCP server with smart defaults.

**Smart Defaults:**
- `name`: Automatically generated from class name in kebab-case
  - `WeatherService` -> `weather-service`
  - `MyServer` -> `my-server`
- `version`: Auto-detected from package.json or defaults to '1.0.0'
- All configuration is optional!

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

**Migration from Old API:**
```typescript
// Old API (still works)
@MCPServer({
  name: 'my-server',
  version: '1.0.0',
  port: 3000  // Top-level port (deprecated)
})

// New API (recommended)
@MCPServer({
  name: 'my-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: 3000,      // Nested under transport
    stateful: true
  }
})
```

### `@tool(description?)`

Explicitly marks a method as a tool (optional - public methods auto-register).

```typescript
@tool('Calculate the sum of two numbers')
add(a: number, b: number): number {
  return a + b;
}
```

### `@prompt(description?)`

Marks a method as a prompt generator.

```typescript
@prompt('Generate a code review prompt')
codeReview(language: string, focus?: string): string {
  return `Review the following ${language} code.\n${focus || ''}`;
}
```

### `@resource(uri, options?)`

Marks a method as a resource provider.

```typescript
@resource('config://server', { mimeType: 'application/json' })
getConfig() {
  return { name: 'my-server', version: '1.0.0' };
}
```

## Enhanced Features

### 1. Optional Parameters

Use TypeScript's `?` operator or default values:

```typescript
// Optional with ?
greet(name: string, formal?: boolean): string {
  return formal ? `Good day, ${name}` : `Hello, ${name}!`;
}

// Optional with default value
formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}
```

**Zod schema generated:**
```typescript
z.object({
  name: z.string(),
  formal: z.boolean().optional(),        // From ?
  decimals: z.number().default(2)        // From default value
})
```

### 2. JSDoc Documentation

Add rich documentation with JSDoc comments:

```typescript
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
@tool()
calculateArea(shape: string, dimension1: number, dimension2?: number): string {
  // ... implementation
}
```

**What gets extracted:**
- ✅ Description (main comment)
- ✅ Parameter descriptions (`@param`)
- ✅ Return value description (`@returns`)
- ✅ Usage examples (`@example`)
- ✅ Error conditions (`@throws`)

### 3. Type Inference

TypeScript types are automatically converted to Zod schemas:

| TypeScript Type | Zod Schema | Notes |
|----------------|------------|-------|
| `string` | `z.string()` | Basic string |
| `number` | `z.number()` | Any number |
| `boolean` | `z.boolean()` | True/false |
| `Array` | `z.array(z.any())` | Generic array |
| `Object` | `z.object({}).passthrough()` | Generic object |
| `Date` | `z.date()` | Date object |
| `string?` | `z.string().optional()` | Optional parameter |
| `number = 5` | `z.number().default(5)` | With default value |

### 4. Auto-Registration

**Methods are automatically registered as tools if:**
- ✅ They are public (don't start with `_`)
- ✅ They aren't already decorated as `@prompt` or `@resource`

**Methods are NOT registered if:**
- ❌ They start with underscore (`_helper()`)
- ❌ They are explicitly decorated as prompts/resources

```typescript
@MCPServer()
class MyServer {
  // ✅ Registered as tool
  publicMethod() { }

  // ✅ Registered as tool with description
  @tool('Custom description')
  decoratedMethod() { }

  // ❌ NOT registered (private)
  _privateHelper() { }

  // ✅ Registered as prompt (not tool)
  @prompt()
  generatePrompt() { }
}
```

## Smart Defaults in Detail

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

### Configuration Consolidation

The new API consolidates configuration under logical groups:

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

## Examples

### Example 1: Minimal Server (Zero Config)

```typescript
import { MCPServer } from 'simply-mcp/decorators';

@MCPServer()  // All defaults!
export default class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }
}
```

**What you get:**
- `name`: 'calculator'
- `version`: Auto-detected from package.json or '1.0.0'
- `transport`: stdio (can override with CLI flags)
- No configuration needed!

### Example 2: With Explicit Decorators

```typescript
import { MCPServer, tool, prompt, resource } from 'simply-mcp';

@MCPServer({ name: 'advanced-calc', version: '2.0.0' })
export default class AdvancedCalculator {
  @tool('Add two numbers')
  add(a: number, b: number): number {
    return a + b;
  }

  @prompt('Math problem solver')
  mathPrompt(problem: string): string {
    return `Solve this math problem: ${problem}`;
  }

  @resource('config://calc', { mimeType: 'application/json' })
  getConfig() {
    return { precision: 10, mode: 'scientific' };
  }

  // Private helper - not registered
  _round(value: number, decimals: number): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
}
```

### Example 3: With JSDoc

```typescript
import { MCPServer } from 'simply-mcp';

@MCPServer()
export default class StringUtils {
  /**
   * Repeat a string multiple times
   *
   * @param text - The text to repeat
   * @param count - Number of repetitions (default: 2)
   * @param separator - String to insert between repetitions (default: '')
   * @returns The repeated string
   *
   * @example
   * repeat('hello', 3, '-')
   * // Returns: "hello-hello-hello"
   */
  repeat(text: string, count: number = 2, separator: string = ''): string {
    return Array(count).fill(text).join(separator);
  }
}
```

## Running Your Server

### Stdio Transport (Default)

```bash
# New simplified CLI (recommended)
simplymcp run my-server.ts
# Or: simplymcp-class my-server.ts

# Old command (still works but deprecated)
npx tsx mcp/class-adapter.ts my-server.ts
```

### HTTP Transport

```bash
# New simplified CLI (recommended)
simplymcp run my-server.ts --http --port 3000
# Or: simplymcp-class my-server.ts --http --port 3000

# Old command (still works but deprecated)
npx tsx mcp/class-adapter.ts my-server.ts --http --port 3000
```

### With Environment Variables

```bash
# New simplified CLI
PORT=4000 simplymcp run my-server.ts --http

# Old command (still works but deprecated)
PORT=4000 npx tsx mcp/class-adapter.ts my-server.ts --http
```

## Best Practices

### 1. Use Descriptive Names

```typescript
// ❌ Bad
@tool()
calc(x: number, y: number): number { }

// ✅ Good
@tool('Calculate the sum of two numbers')
calculateSum(first: number, second: number): number { }
```

### 2. Add JSDoc for Complex Tools

```typescript
// ✅ Good - clear documentation
/**
 * Process an array with filtering and transformation
 *
 * @param items - Array of numbers to process
 * @param min - Minimum value to include (optional)
 * @param max - Maximum value to include (optional)
 * @param operation - Transform operation ('double', 'square', 'sqrt')
 * @returns Processed array
 */
@tool()
processArray(items: number[], min?: number, max?: number, operation: string = 'double') {
  // implementation
}
```

### 3. Use Private Methods for Helpers

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

### 4. Leverage TypeScript Types

```typescript
// TypeScript types automatically become Zod validation
@tool()
formatDate(date: Date, locale: string = 'en-US'): string {
  return date.toLocaleDateString(locale);
}
// Generates: z.object({ date: z.date(), locale: z.string().default('en-US') })
```

## Comparison with Other Approaches

| Feature | Decorator API | Single-File | JSON Config |
|---------|--------------|-------------|-------------|
| Setup complexity | ⭐ Minimal | ⭐⭐ Low | ⭐⭐⭐ Medium |
| Type safety | ✅ Full | ✅ Full | ❌ Manual |
| Auto-registration | ✅ Yes | ❌ No | ❌ No |
| JSDoc support | ✅ Yes | ❌ No | ❌ No |
| Boilerplate | ⭐ Minimal | ⭐⭐ Low | ⭐⭐⭐ High |
| Hot reload | ❌ No | ❌ No | ❌ No |

## Troubleshooting

### "No class found in module"

Make sure you have a default export:

```typescript
// ✅ Correct
@MCPServer()
export default class MyServer { }

// ❌ Wrong
@MCPServer()
export class MyServer { }  // Missing 'default'
```

### "Class must be decorated with @MCPServer"

Add the decorator to your class:

```typescript
// ❌ Missing decorator
export default class MyServer { }

// ✅ Correct
@MCPServer()
export default class MyServer { }
```

### Types Not Inferred Correctly

Make sure you have:
1. `"experimentalDecorators": true` in tsconfig.json
2. `"emitDecoratorMetadata": true` in tsconfig.json
3. `reflect-metadata` imported at the top of your file

## Advanced Topics

### Custom Parameter Validation

For now, use Zod schemas in single-file approach for custom validation. Future versions will support `@validate()` decorator.

### Middleware

Future feature - not yet implemented.

### State Management

Use class properties for state:

```typescript
@MCPServer()
class StatefulServer {
  private counter = 0;

  @tool()
  increment(): number {
    return ++this.counter;
  }
}
```

## Migration Guide

### From Old Decorator API

If you're using the old API, here's how to migrate:

**Old API:**
```typescript
@MCPServer({
  name: 'my-server',
  version: '1.0.0',
  port: 3000  // Top-level port
})
export default class MyServer {
  @tool()
  myTool() { }
}
```

**New API (Option 1 - Minimal):**
```typescript
// Let smart defaults handle it!
@MCPServer()
export default class MyServer {
  @tool()
  myTool() { }
}
```

**New API (Option 2 - Explicit):**
```typescript
@MCPServer({
  name: 'my-server',  // Optional - defaults to 'my-server' from class name
  version: '1.0.0',   // Optional - auto-detected from package.json
  transport: {
    type: 'http',
    port: 3000,       // Nested under transport
    stateful: true
  }
})
export default class MyServer {
  @tool()
  myTool() { }
}
```

### From Functional API

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
    a: z.number(),
    b: z.number()
  }),
  execute: async (args) => {
    return args.a + args.b;
  }
});

await server.start({ transport: 'http', port: 3000 });
```

**Decorator API:**
```typescript
import { MCPServer } from 'simply-mcp/decorators';

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

// Run with: simplymcp run calculator.ts --http --port 3000
```

**Benefits:**
- Less boilerplate (no manual schema definition)
- Type safety from TypeScript types
- Auto-generated descriptions from JSDoc
- Smart defaults reduce configuration

## See Also

- [Functional API Guide (README.md)](../../README.md#basic-example)
- [Quick Start Guide](../../src/docs/QUICK-START.md)
- [Examples](../../examples/)
  - [simple-server.ts](../../examples/simple-server.ts) - Functional API example
  - [class-examples/](../../examples/) - Decorator API examples
