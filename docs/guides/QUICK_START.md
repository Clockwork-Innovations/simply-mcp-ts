# Quick Start Guide

Get started with Simply MCP in 5 minutes.

## Installation

```bash
npm install simply-mcp
```

## Your First Server

Simply MCP uses pure TypeScript interfaces - the cleanest way to define MCP servers:

```typescript
// server.ts
import type { ITool, IServer } from 'simply-mcp';

// Define your tool interface
interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: { a: number; b: number };
  result: { sum: number };
}

// Define server metadata
interface Calculator extends IServer {
  name: 'calculator';
  version: '1.0.0';
}

// Implement the server
export default class CalculatorService implements Calculator {
  add: AddTool = async (params) => ({
    sum: params.a + params.b
  });
}
```

## Run Your Server

```bash
# Run with stdio (default)
npx simply-mcp run server.ts

# Run with HTTP
npx simply-mcp run server.ts --http --port 3000

# Watch mode (auto-restart on changes)
npx simply-mcp run server.ts --watch

# Validate without running
npx simply-mcp run server.ts --dry-run
```

---

## Validate During Development

Use `--dry-run` mode frequently while developing to catch configuration errors early:

```bash
npx simply-mcp run server.ts --dry-run
```

This validates your server configuration **without starting the server**, catching:
- ❌ Missing implementation methods
- ❌ Incorrect method names (e.g., `get_weather` instead of `getWeather`)
- ❌ Property naming errors (e.g., wrong resource URI property)
- ❌ Invalid interface configurations
- ❌ Type mismatches

### Development Workflow

**Recommended workflow:**

1. **Write interface definitions**
   ```typescript
   interface GetWeatherTool extends ITool { ... }
   ```

2. **Validate immediately**
   ```bash
   npx simply-mcp run server.ts --dry-run
   ```

3. **Fix any warnings/errors**
   ```
   Warning: Tool 'get_weather' requires implementation as method 'getWeather'
   ```

4. **Implement methods**
   ```typescript
   getWeather: GetWeatherTool = async (params) => { ... }
   ```

5. **Validate again**
   ```bash
   npx simply-mcp run server.ts --dry-run
   ```

6. **Run server when validation passes**
   ```bash
   npx simply-mcp run server.ts
   ```

### Why Dry-Run?

**Without dry-run:** Errors discovered when running server or testing with client
**With dry-run:** Errors caught immediately during development

**Example - Catches Method Name Errors:**

```typescript
// Wrong method name
interface GetWeatherTool extends ITool {
  name: 'get_weather';
}

export default class MyServer {
  get_weather: GetWeatherTool = async () => { }; // Wrong!
}
```

Dry-run output:
```
Warning: Tool 'get_weather' requires implementation as method 'getWeather'
```

Fix:
```typescript
getWeather: GetWeatherTool = async () => { }; // Correct!
```

---

## What's Next?

### Learn More
- **[API Core Reference](./API_CORE.md)** - Complete API documentation
- **[Tools Guide](./TOOLS.md)** - Add capabilities to your server
- **[Prompts Guide](./PROMPTS.md)** - Create reusable templates
- **[Resources Guide](./RESOURCES.md)** - Serve static or dynamic data

### Examples
- **`examples/interface-minimal.ts`** - Minimal server (start here)
- **`examples/interface-advanced.ts`** - Advanced features
- **`examples/interface-protocol-comprehensive.ts`** - All features
- **`examples/interface-file-prompts.ts`** - File-based prompts
- **`examples/interface-strict-mode.ts`** - TypeScript strict mode
- **`examples/interface-ui-foundation.ts`** - UI basics

Run any example:
```bash
npx tsx examples/interface-minimal.ts
```

### Common Tasks

**Bundle for distribution:**
```bash
npx simplymcp bundle server.ts -o my-server.js
```

**Deploy to production:**
See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

**Add environment configuration:**
```typescript
const apiKey = process.env.API_KEY;
```

## Need Help?

- **[CLI Basics](./CLI_BASICS.md)** - All CLI commands and options
- **[Examples Index](../../examples/EXAMPLES_INDEX.md)** - Browse all examples
- **[Configuration Guide](./CONFIGURATION.md)** - Environment and runtime options
- **[GitHub Issues](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)** - Report bugs or ask questions

## Troubleshooting

**"Cannot find module 'simply-mcp'"**
```bash
npm install simply-mcp
```

**Example doesn't run**
```bash
# Install dependencies
npm install

# Run with tsx (TypeScript execution)
npx tsx examples/interface-minimal.ts
```

**Want to see how X works?**

Check the `examples/` directory or search the documentation!

---

**Next Step**: Run `npx tsx examples/interface-minimal.ts` to see your first server in action!
