# Tools Guide

Learn how to add capabilities (tools) to your MCP server.

**What are tools?** Functions that your server can perform - what the LLM can ask it to do.

**See working examples:** [examples/single-file-advanced.ts](../../examples/single-file-advanced.ts), [examples/class-advanced.ts](../../examples/class-advanced.ts)

---

## Basic Tool

A tool needs:
- **name** - Unique identifier
- **description** - What the tool does
- **parameters** - Input schema (what arguments it takes)
- **execute** - The function to run

```typescript
{
  name: 'greet',
  description: 'Say hello to someone',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Person to greet' }
    },
    required: ['name']
  },
  execute: async (args) => {
    return `Hello, ${args.name}!`;
  }
}
```

---

## Parameter Validation

### Using Zod (Recommended)

```typescript
import { z } from 'zod';

{
  name: 'calculate',
  description: 'Do math',
  parameters: z.object({
    operation: z.enum(['add', 'subtract', 'multiply']),
    a: z.number().describe('First number'),
    b: z.number().describe('Second number')
  }),
  execute: async (args) => {
    switch (args.operation) {
      case 'add': return args.a + args.b;
      case 'subtract': return args.a - args.b;
      case 'multiply': return args.a * args.b;
    }
  }
}
```

### Using JSON Schema

```typescript
{
  name: 'email',
  description: 'Send email',
  parameters: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        format: 'email',
        description: 'Recipient email'
      },
      subject: {
        type: 'string',
        description: 'Email subject'
      }
    },
    required: ['to', 'subject']
  },
  execute: async (args) => {
    return `Email sent to ${args.to}`;
  }
}
```

---

## Return Values

### Simple Values

```typescript
execute: async (args) => {
  return 42;              // Number
  return 'success';       // String
  return true;            // Boolean
}
```

### Complex Objects

```typescript
execute: async (args) => {
  return {
    status: 'ok',
    data: { id: 1, name: 'Item' },
    timestamp: new Date().toISOString()
  };
}
```

### Arrays

```typescript
execute: async (args) => {
  return [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' }
  ];
}
```

---

## Async Tools

All tools can be async:

```typescript
execute: async (args) => {
  // Fetch data
  const response = await fetch(`https://api.example.com/data?q=${args.query}`);
  const data = await response.json();
  return data;
}
```

---

## Error Handling

Throw errors for failures:

```typescript
execute: async (args) => {
  if (!args.email || !args.email.includes('@')) {
    throw new Error('Invalid email format');
  }

  try {
    const result = await sendEmail(args);
    return result;
  } catch (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
```

---

## Common Patterns

### API Integration

```typescript
{
  name: 'fetch-weather',
  description: 'Get weather for a city',
  parameters: z.object({
    city: z.string().describe('City name')
  }),
  execute: async (args) => {
    const response = await fetch(
      `https://api.weather.example.com?city=${encodeURIComponent(args.city)}`,
      { headers: { 'Authorization': `Bearer ${process.env.WEATHER_API_KEY}` } }
    );
    if (!response.ok) throw new Error('API error');
    return response.json();
  }
}
```

### Database Query

```typescript
{
  name: 'find-user',
  description: 'Find user by email',
  parameters: z.object({
    email: z.string().email()
  }),
  execute: async (args) => {
    const user = await db.users.findOne({ email: args.email });
    if (!user) throw new Error('User not found');
    return user;
  }
}
```

### File Processing

```typescript
{
  name: 'read-config',
  description: 'Read configuration file',
  parameters: z.object({
    filename: z.string()
  }),
  execute: async (args) => {
    const fs = await import('fs/promises');
    const content = await fs.readFile(args.filename, 'utf-8');
    return JSON.parse(content);
  }
}
```

### Data Transformation

```typescript
{
  name: 'format-data',
  description: 'Format CSV to JSON',
  parameters: z.object({
    csv: z.string().describe('CSV data')
  }),
  execute: async (args) => {
    const lines = args.csv.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    });
  }
}
```

---

## Multiple Tools

### Functional API

```typescript
export default defineMCP({
  name: 'multi-tool-server',
  version: '1.0.0',
  tools: [
    {
      name: 'tool-1',
      description: 'First tool',
      parameters: z.object({ input: z.string() }),
      execute: async (args) => `Tool 1: ${args.input}`
    },
    {
      name: 'tool-2',
      description: 'Second tool',
      parameters: z.object({ input: z.string() }),
      execute: async (args) => `Tool 2: ${args.input}`
    }
  ]
});
```

### Decorator API

```typescript
@MCPServer({ name: 'multi-tool-server', version: '1.0.0' })
class MyServer {
  @tool('First tool')
  tool1(input: string): string {
    return `Tool 1: ${input}`;
  }

  @tool('Second tool')
  tool2(input: string): string {
    return `Tool 2: ${input}`;
  }
}
```

### MCPBuilder

```typescript
MCPBuilder.create({ name: 'multi-tool-server', version: '1.0.0' })
  .withTool({
    name: 'tool-1',
    description: 'First tool',
    parameters: z.object({ input: z.string() }),
    execute: async (args) => `Tool 1: ${args.input}`
  })
  .withTool({
    name: 'tool-2',
    description: 'Second tool',
    parameters: z.object({ input: z.string() }),
    execute: async (args) => `Tool 2: ${args.input}`
  })
  .build();
```

---

## Best Practices

✅ **DO:**
- Write clear descriptions (LLM uses these to decide when to call)
- Validate input parameters
- Throw meaningful errors
- Test tools locally first
- Document what the tool does

❌ **DON'T:**
- Make tools too broad (one responsibility each)
- Skip error handling
- Silently fail
- Return unclear data structures
- Create tools for everything (keep list focused)

---

## Advanced Features

### Input Constraints

```typescript
parameters: z.object({
  count: z.number().min(0).max(100).describe('Items to fetch'),
  tags: z.array(z.string()).describe('Filter tags'),
  language: z.enum(['en', 'es', 'fr']).describe('Language code')
})
```

### Complex Nested Parameters

```typescript
parameters: z.object({
  config: z.object({
    timeout: z.number().optional(),
    retries: z.number().default(3)
  }),
  items: z.array(z.object({
    id: z.string(),
    metadata: z.record(z.string(), z.any()).optional()
  }))
})
```

### Binary Data

See [examples/binary-content-demo.ts](../../examples/binary-content-demo.ts)

---

## Debugging Tools

### Verbose Output

```bash
npx simply-mcp run server.ts --verbose
```

### Test Tool Locally

```bash
# Dry-run validates server starts correctly
npx simply-mcp run server.ts --dry-run

# Watch mode auto-reloads on changes
npx simply-mcp run server.ts --watch
```

---

## Examples

**See working examples:**
- Simple tools: [examples/single-file-basic.ts](../../examples/single-file-basic.ts)
- Multiple tools: [examples/single-file-advanced.ts](../../examples/single-file-advanced.ts)
- With error handling: [examples/auto-install-error-handling.ts](../../examples/auto-install-error-handling.ts)
- Binary content: [examples/binary-content-demo.ts](../../examples/binary-content-demo.ts)

---

## Router Tools and Sub-Tools

Router tools organize related operations under a single discovery endpoint. Instead of exposing many individual tools, you can group them under routers.

### When to Use Router Tools

Use routers when you have:
- 5+ related tools in a domain (weather, database, API, etc.)
- Tools that are often used together
- A need to reduce tool count in the main list

### Quick Example

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0'
});

// Define tools
server.addTool({
  name: 'get_weather',
  description: 'Get current weather',
  parameters: z.object({ location: z.string() }),
  execute: async (args) => `Weather: ${args.location}`
});

server.addTool({
  name: 'get_forecast',
  description: 'Get forecast',
  parameters: z.object({ location: z.string() }),
  execute: async (args) => `Forecast: ${args.location}`
});

// Group under router
server.addRouterTool({
  name: 'weather_router',
  description: 'Weather tools',
  tools: ['get_weather', 'get_forecast']
});
```

### How It Works

1. Call the router to discover tools: `weather_router()`
2. Call tools via namespace: `weather_router__get_weather`
3. Or call directly (if `flattenRouters=true`): `get_weather`

### Benefits

- **Organization** - Group related tools by domain
- **Scalability** - 20 tools become 3-4 routers
- **Discovery** - Progressive disclosure of functionality
- **Flexibility** - One tool can belong to multiple routers

For complete documentation, see [Router Tools Guide](./ROUTER_TOOLS.md).

---

## Next Steps

- **Organize tools?** See [ROUTER_TOOLS.md](./ROUTER_TOOLS.md)
- **Add prompts?** See [PROMPTS.md](./PROMPTS.md)
- **Add resources?** See [RESOURCES.md](./RESOURCES.md)
- **Deploy tools?** See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

**Need help?** Check [docs/README.md](../README.md) for the full documentation index.
