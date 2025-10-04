# Decorator-Based MCP API Guide

## Overview

The decorator-based API provides the cleanest and most intuitive way to create MCP servers using TypeScript classes. Just write a class with methods, add decorators, and you're done!

## Quick Start

### Minimal Example (Zero Config!)

```typescript
import { MCPServer } from 'simply-mcp';

@MCPServer()  // Uses class name as server name
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

Marks a class as an MCP server.

```typescript
@MCPServer({
  name: 'my-server',      // Optional: defaults to kebab-case class name
  version: '1.0.0',       // Optional: defaults to '1.0.0'
  port: 3000,             // Optional: default HTTP port
  description: 'My awesome server'  // Optional
})
export default class MyServer { }
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

## Examples

### Example 1: Minimal Server

```typescript
import { MCPServer } from 'simply-mcp';

@MCPServer()
export default class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }
}
```

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

## See Also

- [Single-File API Guide](./SIMPLE_MCP_GUIDE.md)
- [Examples](./examples/)
  - [class-minimal.ts](./examples/class-minimal.ts) - Minimal example
  - [class-basic.ts](./examples/class-basic.ts) - With decorators
  - [class-jsdoc.ts](./examples/class-jsdoc.ts) - JSDoc examples
  - [class-advanced.ts](./examples/class-advanced.ts) - Advanced features
