# Functional API Reference

Simplest API style - define your server as a plain JavaScript object.

**Quick Facts:**
- Minimal boilerplate
- No decorators or classes required
- Works with JavaScript and TypeScript
- Best for: Simple servers and prototypes

**See it in action:** [examples/single-file-basic.ts](../../examples/single-file-basic.ts)

---

## Basic Structure

```typescript
import { defineMCP } from 'simply-mcp';

export default defineMCP({
  name: 'my-server',
  version: '1.0.0',
  tools: [
    {
      name: 'my-tool',
      description: 'What it does',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'User input' }
        },
        required: ['input']
      },
      execute: async (args) => {
        return `You said: ${args.input}`;
      }
    }
  ]
});
```

---

## Core Concepts

### Server Configuration

```typescript
{
  name: string;              // Server name (required)
  version: string;           // Semantic version (required)
  description?: string;      // Optional description
  tools?: Tool[];           // Array of tools
  prompts?: Prompt[];       // Array of prompts
  resources?: Resource[];   // Array of resources
}
```

### Tools (Capabilities)

Define what the server can do:

```typescript
{
  name: 'tool-name',
  description: 'What this tool does',
  parameters: {
    type: 'object',
    properties: {
      param1: { type: 'string' },
      param2: { type: 'number' }
    },
    required: ['param1']
  },
  execute: async (args) => {
    // Your logic here
    return 'result';
  }
}
```

### Prompts (Templates)

Dynamic prompts for LLMs:

```typescript
{
  name: 'prompt-name',
  description: 'Describe the prompt',
  arguments: [
    { name: 'arg1', description: 'First argument', required: true },
    { name: 'arg2', description: 'Second argument' }
  ],
  template: 'Do something with {{arg1}} and {{arg2}}'
}
```

### Resources (Shared Data)

Expose data to LLMs:

```typescript
{
  uri: 'file://path/to/resource',
  name: 'Resource Name',
  mimeType: 'text/plain',
  content: 'Your data here'
}
```

---

## Usage with Schema Validation

Use Zod for type-safe parameters:

```typescript
import { z } from 'zod';
import { defineMCP } from 'simply-mcp';

export default defineMCP({
  name: 'my-server',
  version: '1.0.0',
  tools: [
    {
      name: 'add',
      description: 'Add two numbers',
      parameters: z.object({
        a: z.number().describe('First number'),
        b: z.number().describe('Second number')
      }),
      execute: async (args) => {
        return args.a + args.b;
      }
    }
  ]
});
```

---

## Examples

### Simple Tool
[examples/single-file-basic.ts](../../examples/single-file-basic.ts)

### Multiple Tools
[examples/single-file-advanced.ts](../../examples/single-file-advanced.ts)

### With Prompts & Resources
[examples/class-prompts-resources.ts](../../examples/class-prompts-resources.ts) (same concepts, different API)

### Error Handling
[examples/auto-install-error-handling.ts](../../examples/auto-install-error-handling.ts)

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

## Comparison with Other APIs

| Feature | Functional | Decorator | Interface | MCPBuilder |
|---------|-----------|-----------|-----------|-----------|
| Setup lines | 3 | 10 | 15 | 8 |
| Type safety | Good | Good | Excellent | Good |
| Class-based | ❌ | ✅ | ✅ | ❌ |
| OOP style | ❌ | ✅ | ✅ | ❌ |

**See all APIs:** [API_GUIDE.md](./API_GUIDE.md)

---

## When to Use This API

✅ **Use if:**
- Building a simple server
- You prefer functional programming
- You want minimal setup
- Learning MCP for the first time

❌ **Don't use if:**
- Your team requires strict TypeScript types → Use [Interface API](./INTERFACE_API_REFERENCE.md)
- You prefer class-based code → Use [Decorator API](./DECORATOR_API_REFERENCE.md)
- You're generating tools dynamically → Use [MCPBuilder](./MCCPBUILDER_API_REFERENCE.md)

---

## Common Patterns

### Error Handling

```typescript
{
  name: 'my-tool',
  execute: async (args) => {
    try {
      // Your code
      return result;
    } catch (error) {
      throw new Error(`Tool failed: ${error.message}`);
    }
  }
}
```

### Environment Variables

```typescript
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API_KEY environment variable required');
}
```

### Async Operations

```typescript
{
  name: 'my-tool',
  execute: async (args) => {
    const result = await fetch('...');
    return result;
  }
}
```

---

## Full Working Example

See [examples/single-file-basic.ts](../../examples/single-file-basic.ts)

```bash
npx tsx examples/single-file-basic.ts
```

---

## Next Steps

- **Add more tools?** See [examples/single-file-advanced.ts](../../examples/single-file-advanced.ts)
- **Need type safety?** Try [Interface API](./INTERFACE_API_REFERENCE.md)
- **Prefer classes?** Try [Decorator API](./DECORATOR_API_REFERENCE.md)
- **Need more features?** Check [TOOLS.md](./TOOLS.md)

---

**Need help?** Check [docs/README.md](../README.md) for the full documentation index.
