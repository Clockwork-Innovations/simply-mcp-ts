# Decorator API Reference

Class-based API style using TypeScript decorators - best for organized, object-oriented code.

**Quick Facts:**
- Uses `@MCPServer`, `@tool`, `@prompt`, `@resource` decorators
- Class-based organization
- Great for medium to large servers
- Best for: Teams with OOP conventions, organized code

**See it in action:** [examples/class-basic.ts](../../examples/class-basic.ts)

---

## Basic Structure

```typescript
import { MCPServer, tool, prompt, resource } from 'simply-mcp';

@MCPServer({ name: 'my-server', version: '1.0.0' })
class MyServer {
  @tool('Add two numbers')
  add(a: number, b: number): number {
    return a + b;
  }

  @prompt('Generate greeting')
  greet(name: string): string {
    return `Hello, ${name}!`;
  }

  @resource('file://config', { mimeType: 'application/json' })
  config() {
    return { version: '1.0.0' };
  }
}
```

---

## Core Decorators

### @MCPServer

```typescript
@MCPServer({
  name: string;           // Server name (required)
  version: string;        // Version (required)
  description?: string;   // Optional description
})
class MyServer { }
```

### @tool

```typescript
@tool(description: string)
methodName(param1: Type, param2: Type): ReturnType {
  // Implementation
}
```

**Features:**
- Auto-detects parameters from method signature
- Auto-generates parameter schema from TypeScript types
- Supports `async` methods
- Uses JSDoc comments for descriptions

### @prompt

```typescript
@prompt(description: string)
templateName(arg1: string, arg2?: string): string {
  return `Template with {{arg1}} and {{arg2}}`;
}
```

### @resource

```typescript
@resource(uri: string, options?: ResourceOptions)
resourceName(): Content {
  return { /* your data */ };
}
```

---

## Parameter Documentation

Use JSDoc comments for detailed parameter info:

```typescript
@tool('Calculate total price')
calculatePrice(
  /** Price per unit */
  unitPrice: number,
  /** Number of units */
  quantity: number
): number {
  return unitPrice * quantity;
}
```

---

## Advanced Features

### Async Methods

```typescript
@tool('Fetch data from API')
async fetchData(url: string): Promise<string> {
  const response = await fetch(url);
  return response.text();
}
```

### Error Handling

```typescript
@tool('Process data')
process(data: string): string {
  if (!data || data.length === 0) {
    throw new Error('Data cannot be empty');
  }
  return data.toUpperCase();
}
```

### Complex Types

```typescript
@tool('Add items to list')
addItems(
  /** Items to add */
  items: Array<{ name: string; value: number }>
): number {
  return items.length;
}
```

---

## Comparison with Other APIs

| Feature | Functional | Decorator | Interface | MCPBuilder |
|---------|-----------|-----------|-----------|-----------|
| Setup lines | 3 | 10 | 15 | 8 |
| Class-based | ❌ | ✅ | ✅ | ❌ |
| Decorators | ❌ | ✅ | ❌ | ❌ |
| Type safety | Good | Good | Excellent | Good |

**See all APIs:** [API_GUIDE.md](./API_GUIDE.md)

---

## Examples

### Simple Server
[examples/class-basic.ts](../../examples/class-basic.ts)

### Multiple Tools
[examples/class-advanced.ts](../../examples/class-advanced.ts)

### With Prompts & Resources
[examples/class-prompts-resources.ts](../../examples/class-prompts-resources.ts)

---

## Running

```bash
# Basic run
npx tsx server.ts

# With CLI wrapper
npx simply-mcp run server.ts

# HTTP transport
npx simply-mcp run server.ts --http --port 3000

# Watch mode
npx simply-mcp run server.ts --watch
```

---

## When to Use This API

✅ **Use if:**
- Building a medium to large server
- Your team uses OOP patterns
- You prefer class-based organization
- You have many related tools/prompts

❌ **Don't use if:**
- Building a simple one-off script → Use [Functional API](./FUNCTIONAL_API_REFERENCE.md)
- Your team requires strict TypeScript types → Use [Interface API](./INTERFACE_API_REFERENCE.md)
- You're generating tools dynamically → Use [MCPBuilder](./MCCPBUILDER_API_REFERENCE.md)

---

## Common Patterns

### Method Organization

```typescript
@MCPServer({ name: 'my-server', version: '1.0.0' })
class MyServer {
  // Helper methods (private)
  private validateEmail(email: string): boolean {
    return email.includes('@');
  }

  // Tools
  @tool('Send email')
  sendEmail(to: string, subject: string, body: string): string {
    if (!this.validateEmail(to)) throw new Error('Invalid email');
    return `Email sent to ${to}`;
  }

  // Prompts
  @prompt('Draft email')
  draftEmail(recipient: string): string {
    return `Draft email to {{recipient}}`;
  }
}
```

### Constructor Configuration

```typescript
@MCPServer({ name: 'my-server', version: '1.0.0' })
class MyServer {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.API_KEY || '';
    if (!this.apiKey) {
      throw new Error('API_KEY required');
    }
  }

  @tool('Call API')
  async callApi(endpoint: string): Promise<string> {
    const response = await fetch(
      `https://api.example.com${endpoint}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    );
    return response.text();
  }
}
```

---

## Full Working Example

See [examples/class-basic.ts](../../examples/class-basic.ts)

```bash
npx tsx examples/class-basic.ts
```

---

## Next Steps

- **Add more tools?** See [examples/class-advanced.ts](../../examples/class-advanced.ts)
- **Prefer functional?** Try [Functional API](./FUNCTIONAL_API_REFERENCE.md)
- **Need type safety?** Try [Interface API](./INTERFACE_API_REFERENCE.md)
- **Need more features?** Check [TOOLS.md](./TOOLS.md)

---

**Need help?** Check [docs/README.md](../README.md) for the full documentation index.
