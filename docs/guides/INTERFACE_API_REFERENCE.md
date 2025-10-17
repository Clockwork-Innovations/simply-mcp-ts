# Interface API Reference

Type-safe API with strict TypeScript interfaces - best for critical applications.

**Quick Facts:**
- Full type safety with interfaces
- Strictest validation at compile time
- Excellent IDE support
- Best for: Enterprise teams, type-safe requirements

**See it in action:** [examples/interface-minimal.ts](../../examples/interface-minimal.ts)

---

## Basic Structure

```typescript
import type {
  MCPServerConfig,
  Tool,
  Prompt,
  Resource
} from 'simply-mcp';

const config: MCPServerConfig = {
  name: 'my-server',
  version: '1.0.0',
  tools: [
    {
      name: 'add',
      description: 'Add two numbers',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number' },
          b: { type: 'number' }
        },
        required: ['a', 'b']
      },
      execute: async (args: { a: number; b: number }) => {
        return args.a + args.b;
      }
    }
  ]
};

export default config;
```

---

## Core Types

### MCPServerConfig

```typescript
interface MCPServerConfig {
  name: string;              // Server name
  version: string;           // Semantic version
  description?: string;      // Optional description
  tools?: Tool[];           // Array of tools
  prompts?: Prompt[];       // Array of prompts
  resources?: Resource[];   // Array of resources
}
```

### Tool Interface

```typescript
interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  execute: (args: Record<string, unknown>) => unknown | Promise<unknown>;
}
```

### Prompt Interface

```typescript
interface Prompt {
  name: string;
  description: string;
  arguments: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
  template: string;
}
```

### Resource Interface

```typescript
interface Resource {
  uri: string;
  name: string;
  mimeType: string;
  content: string | Record<string, unknown>;
}
```

---

## Type-Safe Tools

```typescript
interface AddArgs {
  a: number;
  b: number;
}

const addTool: Tool = {
  name: 'add',
  description: 'Add two numbers',
  inputSchema: {
    type: 'object',
    properties: {
      a: { type: 'number', description: 'First number' },
      b: { type: 'number', description: 'Second number' }
    },
    required: ['a', 'b']
  },
  execute: async (args) => {
    const typed = args as AddArgs;
    return typed.a + typed.b;
  }
};
```

---

## JSON Schema Integration

```typescript
import { JSONSchema7 } from 'json-schema';

const emailSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    email: {
      type: 'string',
      format: 'email',
      description: 'Email address'
    },
    subject: {
      type: 'string',
      description: 'Email subject'
    },
    body: {
      type: 'string',
      description: 'Email body'
    }
  },
  required: ['email', 'subject', 'body']
};

const emailTool: Tool = {
  name: 'send-email',
  description: 'Send an email',
  inputSchema: emailSchema,
  execute: async (args) => {
    // Type-checked at compile time
    return `Email sent to ${(args as any).email}`;
  }
};
```

---

## Type-Safe Configuration

```typescript
import type { MCPServerConfig } from 'simply-mcp';

const config: MCPServerConfig = {
  name: 'my-server',
  version: '1.0.0',
  tools: [
    {
      name: 'example',
      description: 'Example tool',
      inputSchema: {
        type: 'object',
        properties: {
          input: { type: 'string' }
        },
        required: ['input']
      },
      execute: async (args) => {
        return `Processed: ${args.input}`;
      }
    }
  ]
};

export default config;
```

---

## Comparison with Other APIs

| Feature | Functional | Decorator | Interface | MCPBuilder |
|---------|-----------|-----------|-----------|-----------|
| Setup lines | 3 | 10 | 15 | 8 |
| Type safety | Good | Good | Excellent | Good |
| Verbosity | Low | Low | High | Medium |
| Compile-time validation | ✅ | ✅ | ✅ | ✅ |

**See all APIs:** [API_GUIDE.md](./API_GUIDE.md)

---

## Examples

### Minimal Server
[examples/interface-minimal.ts](../../examples/interface-minimal.ts)

### Advanced Features
[examples/interface-advanced.ts](../../examples/interface-advanced.ts)

### Comprehensive Setup
[examples/interface-comprehensive.ts](../../examples/interface-comprehensive.ts)

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
- You need strict type safety
- Your team has TypeScript standards
- Building critical applications
- You want compile-time validation

❌ **Don't use if:**
- Learning MCP for the first time → Use [Functional API](./FUNCTIONAL_API_REFERENCE.md)
- You prefer class-based code → Use [Decorator API](./DECORATOR_API_REFERENCE.md)
- You need simpler setup → Use [Functional API](./FUNCTIONAL_API_REFERENCE.md)

---

## Common Patterns

### Error Types

```typescript
interface ValidationError {
  error: true;
  message: string;
}

interface SuccessResult {
  error: false;
  data: string;
}

type ExecuteResult = ValidationError | SuccessResult;

const tool: Tool = {
  name: 'safe-tool',
  description: 'Returns typed result',
  inputSchema: {
    type: 'object',
    properties: { input: { type: 'string' } },
    required: ['input']
  },
  execute: async (args): Promise<ExecuteResult> => {
    if (!args.input) {
      return { error: true, message: 'Input required' };
    }
    return { error: false, data: args.input };
  }
};
```

### Enum-Based Schema

```typescript
type Priority = 'low' | 'medium' | 'high';

const prioritySchema: JSONSchema7 = {
  type: 'string',
  enum: ['low', 'medium', 'high'],
  description: 'Task priority'
};

interface TaskArgs {
  title: string;
  priority: Priority;
}

const createTaskTool: Tool = {
  name: 'create-task',
  description: 'Create a task',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      priority: prioritySchema
    },
    required: ['title', 'priority']
  },
  execute: async (args) => {
    const task = args as TaskArgs;
    return `Created task: ${task.title} (${task.priority})`;
  }
};
```

---

## Full Working Example

See [examples/interface-minimal.ts](../../examples/interface-minimal.ts)

```bash
npx tsx examples/interface-minimal.ts
```

---

## Next Steps

- **Need simplicity?** Try [Functional API](./FUNCTIONAL_API_REFERENCE.md)
- **Prefer classes?** Try [Decorator API](./DECORATOR_API_REFERENCE.md)
- **Need more features?** Check [TOOLS.md](./TOOLS.md)

---

**Need help?** Check [docs/README.md](../README.md) for the full documentation index.
