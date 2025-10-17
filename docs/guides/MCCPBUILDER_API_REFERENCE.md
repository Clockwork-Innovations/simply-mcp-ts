# MCPBuilder API Reference

Fluent builder API for programmatic server construction - best for dynamic and complex scenarios.

**Quick Facts:**
- Fluent method chaining interface
- Excellent for dynamic tool generation
- Good type safety
- Best for: Complex servers, programmatic generation

**See it in action:** [examples/mcp-builder-foundation.ts](../../examples/mcp-builder-foundation.ts)

---

## Basic Structure

```typescript
import { MCPBuilder } from 'simply-mcp';
import { z } from 'zod';

const server = MCPBuilder.create({
  name: 'my-server',
  version: '1.0.0'
})
  .withTool({
    name: 'add',
    description: 'Add two numbers',
    parameters: z.object({
      a: z.number(),
      b: z.number()
    }),
    execute: async (args) => args.a + args.b
  })
  .withPrompt({
    name: 'greet',
    description: 'Generate greeting',
    arguments: [{ name: 'name', required: true }],
    template: 'Hello {{name}}!'
  })
  .build();

server.start();
```

---

## Builder Methods

### create()

Initialize builder:

```typescript
const server = MCPBuilder.create({
  name: string;           // Server name (required)
  version: string;        // Version (required)
  description?: string;   // Optional description
});
```

### withTool()

Add a tool:

```typescript
.withTool({
  name: 'tool-name',
  description: 'What it does',
  parameters: ZodSchema | JSONSchema,
  execute: (args) => result | Promise<result>
})
```

### withPrompt()

Add a prompt:

```typescript
.withPrompt({
  name: 'prompt-name',
  description: 'What it does',
  arguments: [
    { name: 'arg1', description: '...', required: true },
    { name: 'arg2', description: '...' }
  ],
  template: 'Template with {{arg1}}'
})
```

### withResource()

Add a resource:

```typescript
.withResource({
  uri: 'resource://path',
  name: 'Resource Name',
  mimeType: 'text/plain',
  content: string | object
})
```

### build()

Finalize and return server:

```typescript
const server = MCPBuilder.create({ ... })
  .withTool({ ... })
  .build();
```

---

## Advanced Chaining

```typescript
const server = MCPBuilder.create({ name: 'calc', version: '1.0.0' })
  .withTool({
    name: 'add',
    description: 'Add numbers',
    parameters: z.object({ a: z.number(), b: z.number() }),
    execute: async (args) => args.a + args.b
  })
  .withTool({
    name: 'multiply',
    description: 'Multiply numbers',
    parameters: z.object({ a: z.number(), b: z.number() }),
    execute: async (args) => args.a * args.b
  })
  .withPrompt({
    name: 'calculate',
    description: 'Calculate using tools',
    arguments: [{ name: 'operation' }],
    template: 'Calculate: {{operation}}'
  })
  .build();
```

---

## Dynamic Tool Generation

```typescript
const server = MCPBuilder.create({ name: 'dynamic', version: '1.0.0' });

// Generate tools dynamically
const tools = ['add', 'subtract', 'multiply', 'divide'];
for (const tool of tools) {
  server.withTool({
    name: tool,
    description: `Perform ${tool}`,
    parameters: z.object({ a: z.number(), b: z.number() }),
    execute: async (args) => {
      switch (tool) {
        case 'add': return args.a + args.b;
        case 'subtract': return args.a - args.b;
        case 'multiply': return args.a * args.b;
        case 'divide': return args.b !== 0 ? args.a / args.b : null;
      }
    }
  });
}

const finalServer = server.build();
```

---

## Comparison with Other APIs

| Feature | Functional | Decorator | Interface | MCPBuilder |
|---------|-----------|-----------|-----------|-----------|
| Setup lines | 3 | 10 | 15 | 8 |
| Method chaining | ❌ | ❌ | ❌ | ✅ |
| Dynamic generation | Possible | Possible | Possible | ✅ Best |
| Type safety | Good | Good | Excellent | Good |

**See all APIs:** [API_GUIDE.md](./API_GUIDE.md)

---

## Examples

### Foundation
[examples/mcp-builder-foundation.ts](../../examples/mcp-builder-foundation.ts)

### Complete Server
[examples/mcp-builder-complete.ts](../../examples/mcp-builder-complete.ts)

### Interactive Building
[examples/mcp-builder-interactive.ts](../../examples/mcp-builder-interactive.ts)

### Layer 2 Advanced
[examples/mcp-builder-layer2.ts](../../examples/mcp-builder-layer2.ts)

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
- You need to generate tools dynamically
- You prefer fluent/builder patterns
- Building complex, modular servers
- You want conditional tool registration

❌ **Don't use if:**
- You want the simplest setup → Use [Functional API](./FUNCTIONAL_API_REFERENCE.md)
- You prefer class-based code → Use [Decorator API](./DECORATOR_API_REFERENCE.md)
- You need strict types → Use [Interface API](./INTERFACE_API_REFERENCE.md)

---

## Common Patterns

### Conditional Tools

```typescript
const server = MCPBuilder.create({ name: 'conditional', version: '1.0.0' });

if (process.env.ENABLE_ADMIN_TOOLS) {
  server.withTool({
    name: 'admin-reset',
    description: 'Reset system',
    parameters: z.object({}),
    execute: async () => 'System reset'
  });
}

const finalServer = server.build();
```

### Loading Tools from Config

```typescript
interface ToolConfig {
  name: string;
  description: string;
  handler: (args: any) => Promise<any>;
}

const toolConfigs: ToolConfig[] = [
  {
    name: 'tool1',
    description: 'First tool',
    handler: async (args) => 'result1'
  },
  {
    name: 'tool2',
    description: 'Second tool',
    handler: async (args) => 'result2'
  }
];

let server = MCPBuilder.create({ name: 'loaded', version: '1.0.0' });

for (const config of toolConfigs) {
  server = server.withTool({
    name: config.name,
    description: config.description,
    parameters: z.object({}),
    execute: config.handler
  });
}

const finalServer = server.build();
```

### Plugin Architecture

```typescript
interface Plugin {
  name: string;
  tools: Array<{ name: string; description: string }>;
}

function registerPlugin(server: MCPBuilder, plugin: Plugin) {
  for (const tool of plugin.tools) {
    server.withTool({
      name: `${plugin.name}-${tool.name}`,
      description: tool.description,
      parameters: z.object({}),
      execute: async () => `Executed: ${tool.name}`
    });
  }
  return server;
}

let server = MCPBuilder.create({ name: 'plugins', version: '1.0.0' });
server = registerPlugin(server, { name: 'plugin1', tools: [{ name: 'action', description: 'Do action' }] });
const finalServer = server.build();
```

---

## Full Working Example

See [examples/mcp-builder-foundation.ts](../../examples/mcp-builder-foundation.ts)

```bash
npx tsx examples/mcp-builder-foundation.ts
```

---

## Next Steps

- **Prefer simplicity?** Try [Functional API](./FUNCTIONAL_API_REFERENCE.md)
- **Prefer classes?** Try [Decorator API](./DECORATOR_API_REFERENCE.md)
- **Need strict types?** Try [Interface API](./INTERFACE_API_REFERENCE.md)
- **Need more features?** Check [TOOLS.md](./TOOLS.md)

---

**Need help?** Check [docs/README.md](../README.md) for the full documentation index.
