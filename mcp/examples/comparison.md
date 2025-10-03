# SimplyMCP vs Traditional MCP Server Comparison

This document shows side-by-side comparisons of creating the same server using the traditional config-based approach vs SimplyMCP.

## Example: Weather Server

### Traditional Approach (Config-Based)

**File 1: config/weather-server.json**
```json
{
  "name": "weather-server",
  "version": "1.0.0",
  "port": 3000,
  "tools": [
    {
      "name": "get_weather",
      "description": "Get current weather for a city",
      "inputSchema": {
        "type": "object",
        "properties": {
          "city": {
            "type": "string",
            "description": "City name"
          },
          "units": {
            "type": "string",
            "enum": ["metric", "imperial"],
            "description": "Temperature units"
          }
        },
        "required": ["city"]
      },
      "handler": "./handlers/getWeather.js"
    },
    {
      "name": "get_forecast",
      "description": "Get weather forecast",
      "inputSchema": {
        "type": "object",
        "properties": {
          "city": {
            "type": "string",
            "description": "City name"
          },
          "days": {
            "type": "number",
            "description": "Number of days",
            "minimum": 1,
            "maximum": 7
          }
        },
        "required": ["city"]
      },
      "handler": "./handlers/getForecast.js"
    }
  ],
  "prompts": [
    {
      "name": "weather-report",
      "description": "Generate weather report",
      "arguments": [
        {
          "name": "city",
          "description": "City name",
          "required": true
        }
      ],
      "template": "Provide a detailed weather report for {{city}}."
    }
  ]
}
```

**File 2: handlers/getWeather.js**
```javascript
export default async function getWeather(args, context) {
  context.logger.info(`Fetching weather for ${args.city}`);

  // Simulated API call
  const temp = args.units === 'metric' ? 22 : 72;
  const unit = args.units === 'metric' ? '°C' : '°F';

  return {
    content: [
      {
        type: 'text',
        text: `Weather in ${args.city}: ${temp}${unit}, Partly cloudy`,
      },
    ],
  };
}
```

**File 3: handlers/getForecast.js**
```javascript
export default async function getForecast(args, context) {
  context.logger.info(`Fetching forecast for ${args.city}`);

  const days = args.days || 3;
  const forecast = [];

  for (let i = 0; i < days; i++) {
    forecast.push(`Day ${i + 1}: 20°C, Sunny`);
  }

  return {
    content: [
      {
        type: 'text',
        text: `${days}-day forecast for ${args.city}:\n${forecast.join('\n')}`,
      },
    ],
  };
}
```

**File 4: Run command**
```bash
node mcp/configurableServer.ts config/weather-server.json
```

**Total: 4 files, ~100 lines of code**

---

### SimplyMCP Approach

**File 1: weather-server.ts**
```typescript
#!/usr/bin/env node
import { SimplyMCP } from './mcp/SimplyMCP.js';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'weather-server',
  version: '1.0.0',
  port: 3000,
});

server.addTool({
  name: 'get_weather',
  description: 'Get current weather for a city',
  parameters: z.object({
    city: z.string().describe('City name'),
    units: z.enum(['metric', 'imperial']).describe('Temperature units'),
  }),
  execute: async (args, context) => {
    context?.logger.info(`Fetching weather for ${args.city}`);

    const temp = args.units === 'metric' ? 22 : 72;
    const unit = args.units === 'metric' ? '°C' : '°F';

    return `Weather in ${args.city}: ${temp}${unit}, Partly cloudy`;
  },
});

server.addTool({
  name: 'get_forecast',
  description: 'Get weather forecast',
  parameters: z.object({
    city: z.string().describe('City name'),
    days: z.number().min(1).max(7).describe('Number of days'),
  }),
  execute: async (args, context) => {
    context?.logger.info(`Fetching forecast for ${args.city}`);

    const forecast = Array.from({ length: args.days }, (_, i) =>
      `Day ${i + 1}: 20°C, Sunny`
    );

    return `${args.days}-day forecast for ${args.city}:\n${forecast.join('\n')}`;
  },
});

server.addPrompt({
  name: 'weather-report',
  description: 'Generate weather report',
  arguments: [
    { name: 'city', description: 'City name', required: true },
  ],
  template: 'Provide a detailed weather report for {{city}}.',
});

await server.start();
```

**File 2: Run command**
```bash
node weather-server.ts
```

**Total: 1 file, ~50 lines of code**

---

## Key Differences

| Aspect | Traditional | SimplyMCP |
|--------|------------|-----------|
| **Files needed** | 4+ (config + handlers) | 1 |
| **Lines of code** | ~100 | ~50 |
| **Schema format** | JSON Schema (manual) | Zod (type-safe) |
| **Type safety** | None | Full TypeScript inference |
| **Validation** | Manual setup | Automatic from Zod |
| **Code location** | Split across files | All in one place |
| **Hot reload** | Requires restart | Requires restart |
| **Maintenance** | Multiple files to update | Single file to update |
| **Learning curve** | Steeper (JSON Schema + handlers) | Simpler (Zod + inline) |
| **Refactoring** | Complex (multiple files) | Easy (single file) |

## Line-by-Line Breakdown

### Traditional Approach
- Config JSON: ~60 lines
- Handler 1: ~20 lines
- Handler 2: ~25 lines
- **Total: ~105 lines across 3 files**

### SimplyMCP
- Server file: ~50 lines (everything)
- **Total: ~50 lines in 1 file**

**52% less code, 67% fewer files**

## Real-World Example: Calculator Server

### Traditional (3 files, 80 lines)

**config.json:**
```json
{
  "name": "calculator",
  "tools": [
    {
      "name": "add",
      "inputSchema": {
        "type": "object",
        "properties": {
          "a": { "type": "number" },
          "b": { "type": "number" }
        },
        "required": ["a", "b"]
      },
      "handler": "./handlers/add.js"
    },
    {
      "name": "multiply",
      "inputSchema": {
        "type": "object",
        "properties": {
          "a": { "type": "number" },
          "b": { "type": "number" }
        },
        "required": ["a", "b"]
      },
      "handler": "./handlers/multiply.js"
    }
  ]
}
```

**handlers/add.js:**
```javascript
export default async function add(args) {
  return {
    content: [{ type: 'text', text: `${args.a + args.b}` }]
  };
}
```

**handlers/multiply.js:**
```javascript
export default async function multiply(args) {
  return {
    content: [{ type: 'text', text: `${args.a * args.b}` }]
  };
}
```

### SimplyMCP (1 file, 30 lines)

```typescript
import { SimplyMCP } from './mcp/SimplyMCP.js';
import { z } from 'zod';

const server = new SimplyMCP({ name: 'calculator', version: '1.0.0' });

const numberPair = z.object({
  a: z.number(),
  b: z.number(),
});

server
  .addTool({
    name: 'add',
    description: 'Add two numbers',
    parameters: numberPair,
    execute: async (args) => `${args.a + args.b}`,
  })
  .addTool({
    name: 'multiply',
    description: 'Multiply two numbers',
    parameters: numberPair,
    execute: async (args) => `${args.a * args.b}`,
  });

await server.start();
```

**Result: 62% less code, 67% fewer files**

## When to Use Each Approach

### Use Traditional Config-Based When:
- ✅ You need to load handlers dynamically from different locations
- ✅ You want to reuse handlers across multiple servers
- ✅ You prefer configuration over code
- ✅ You need to hot-reload individual handlers without restart
- ✅ Your organization requires separation of config and code

### Use SimplyMCP When:
- ✅ You want rapid development
- ✅ You prefer type safety and autocomplete
- ✅ You're building a single-purpose server
- ✅ You value simplicity over flexibility
- ✅ You're prototyping or building MVPs
- ✅ You want everything in one place
- ✅ You're familiar with Zod and TypeScript

## Migration Path

### From Traditional to SimplyMCP

1. **Create new TypeScript file**
2. **Copy tool definitions from config.json**
3. **Convert JSON Schema to Zod:**
   ```
   JSON Schema                    Zod
   -----------                    ---
   { "type": "string" }          z.string()
   { "type": "number" }          z.number()
   { "type": "boolean" }         z.boolean()
   { "type": "array" }           z.array(z.string())
   { "enum": [...] }             z.enum([...])
   { "minimum": 1 }              z.number().min(1)
   { "maximum": 10 }             z.number().max(10)
   { "minLength": 3 }            z.string().min(3)
   { "pattern": "^[a-z]+$" }     z.string().regex(/^[a-z]+$/)
   ```
4. **Inline handler functions**
5. **Test and deploy**

### From SimplyMCP to Traditional

1. **Extract execute functions to separate files**
2. **Convert Zod schemas to JSON Schema** (use zod-to-json-schema)
3. **Create config.json**
4. **Update server startup**

## Performance

Both approaches have identical runtime performance since SimplyMCP uses the same underlying infrastructure (HandlerManager, validation, etc.).

| Metric | Traditional | SimplyMCP |
|--------|------------|-----------|
| Startup time | Same | Same |
| Request handling | Same | Same |
| Memory usage | Same | Same |
| Validation speed | Same | Same |

The only difference is development experience and code organization.

## Summary

**SimplyMCP** offers:
- 50-60% less code
- 67% fewer files
- Full type safety
- Easier maintenance
- Faster development
- Same runtime performance

**Traditional** offers:
- More flexibility
- Handler reusability
- Config/code separation
- Dynamic loading
- Organizational preferences

Choose based on your project needs and team preferences. Both are fully supported and production-ready.
