# Router Tools Guide

Router tools allow you to group related tools together and control their visibility in the tools list. This feature is fully supported in the Interface API (v4.0.0+) with zero-boilerplate, type-safe router definitions.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Interface API](#interface-api)
3. [Builder API (Legacy)](#builder-api-legacy)
4. [Advanced Patterns](#advanced-patterns)

---

## Introduction

### What are Router Tools?

Router tools are special tools that **group related operations together under a single discovery endpoint**. Instead of exposing many individual tools directly, you can group them under a few routers based on domain or functionality.

Think of routers as **table of contents** for your tools. When a model calls a router, it gets back a list of available operations in that domain.

### Why Use Router Tools?

**Problem:** As your MCP server grows, managing dozens of tools becomes overwhelming:
- Models see a huge list of tools
- Hard to discover related functionality
- Tool names can conflict
- Cognitive overhead increases

**Solution:** Router tools provide:
- **Organization** - Group related tools by domain
- **Discovery** - Progressive disclosure of functionality
- **Scalability** - 50 tools become 5-6 routers
- **Flexibility** - One tool can belong to multiple routers

---

## Interface API

The Interface API provides a declarative, type-safe way to define routers using TypeScript interfaces.

### Basic Router

```typescript
import type { IServer, ITool, IToolRouter } from 'simply-mcp';

// Define tool interfaces
interface Tool1 extends ITool {
  name: 'tool1';
  description: 'First tool';
  params: { /* ... */ };
  result: { /* ... */ };
}

interface Tool2 extends ITool {
  name: 'tool2';
  description: 'Second tool';
  params: { /* ... */ };
  result: { /* ... */ };
}

// Define router interface
interface MyRouter extends IToolRouter {
  name: 'my_router';           // Optional - inferred from property name
  description: 'My tools';      // Required
  tools: [Tool1, Tool2];        // Reference tool interfaces
}

// Server interface
interface MyServer extends IServer {
  name: 'my-server';
  flattenRouters: false;        // Hide router tools from main list
}

// Implementation
export default class MyServer {
  tool1: Tool1 = async (params) => ({ /* ... */ });
  tool2: Tool2 = async (params) => ({ /* ... */ });

  // Router - NO implementation needed!
  myRouter!: MyRouter;
}
```

### Syntax Options

**1. Interface References (Recommended)**
```typescript
interface MyRouter extends IToolRouter {
  tools: [GetWeatherTool, GetForecastTool];
}
```

**2. String Literals (Backward Compatible)**
```typescript
interface MyRouter extends IToolRouter {
  tools: ['get_weather', 'get_forecast'];
}
```

**3. Mixed Syntax**
```typescript
interface MyRouter extends IToolRouter {
  tools: [GetWeatherTool, 'other_tool'];
}
```

### Router Metadata

```typescript
interface MyRouter extends IToolRouter {
  name: 'my_router';
  description: 'My tools';
  tools: [Tool1, Tool2];
  metadata: {
    category: 'api';
    tags: ['external', 'data'];
    order: 1;
    version: '2.0';
  };
}
```

### flattenRouters Behavior

**Option 1: `flattenRouters: false` (Recommended)**

```typescript
interface MyServer extends IServer {
  flattenRouters: false;  // Hide router-assigned tools
}
```

**Result:**
- `tools/list` returns: `['my_router']`
- Individual tools are hidden
- Call router to discover tools: `my_router` → returns tool list
- Call tools via namespace: `my_router__tool1`

**Option 2: `flattenRouters: true` (Development)**

```typescript
interface MyServer extends IServer {
  flattenRouters: true;  // Show all tools
}
```

**Result:**
- `tools/list` returns: `['my_router', 'tool1', 'tool2']`
- All tools visible in main list
- Useful for testing and development

### Complete Example

```typescript
import type { IServer, ITool, IToolRouter, IParam } from 'simply-mcp';

// Parameter interfaces
interface LocationParam extends IParam {
  type: 'string';
  description: 'Location name';
}

interface DaysParam extends IParam {
  type: 'number';
  description: 'Number of days';
  min: 1;
  max: 7;
}

// Tool interfaces
interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get current weather for a location';
  params: { location: LocationParam };
  result: { temperature: number; conditions: string };
}

interface GetForecastTool extends ITool {
  name: 'get_forecast';
  description: 'Get weather forecast';
  params: { location: LocationParam; days: DaysParam };
  result: { forecast: Array<{ day: string; temperature: number; conditions: string }> };
}

// Router interface
interface WeatherRouter extends IToolRouter {
  name: 'weather_router';
  description: 'Weather information tools including current conditions and forecasts';
  tools: [GetWeatherTool, GetForecastTool];
  metadata: {
    category: 'weather';
    tags: ['forecast', 'conditions'];
  };
}

// Server interface
const server: IServer = {
  name: 'weather-service',
  version: '1.0.0',
  description: 'Weather information service'
  flattenRouters: false;
}

// Implementation
export default class WeatherService {
  // Tool implementations
  getWeather: GetWeatherTool = async (params) => {
    return {
      temperature: 72,
      conditions: 'Sunny'
    };
  };

  getForecast: GetForecastTool = async (params) => {
    const forecast = [];
    for (let i = 0; i < params.days; i++) {
      forecast.push({
        day: `Day ${i + 1}`,
        temperature: 70 + i,
        conditions: i % 2 === 0 ? 'Sunny' : 'Cloudy'
      });
    }
    return { forecast };
  };

  // Router - NO implementation needed!
  weatherRouter!: WeatherRouter;
}
```

### Multiple Routers

Tools can be assigned to multiple routers:

```typescript
interface AdminRouter extends IToolRouter {
  tools: [CreateUserTool, DeleteUserTool, AuditLogTool];
}

interface UserRouter extends IToolRouter {
  tools: [AuditLogTool];  // Same tool in both routers
}

export default class Server {
  createUser: CreateUserTool = async (params) => ({ /* ... */ });
  deleteUser: DeleteUserTool = async (params) => ({ /* ... */ });
  auditLog: AuditLogTool = async (params) => ({ /* ... */ });

  adminRouter!: AdminRouter;
  userRouter!: UserRouter;
}
```

### TypeScript Compatibility

The Interface API uses AST parsing, not TypeScript's type system. This means:

1. **Validation:** Use `--dry-run` instead of `tsc --noEmit`
   ```bash
   npx simply-mcp run server.ts --dry-run
   ```

2. **Type Warnings:** TypeScript may show structural type warnings - these are expected and can be ignored

3. **Testing:** Add `// @ts-nocheck` at the top of test files if needed

See [Quick Start Guide](./QUICK_START.md#typescript-validation) for details.

---

## Builder API (Legacy)

This section describes how router tools worked in previous API versions, for reference purposes.

### Core Concepts

#### 1. Router Tools Group Related Operations

A router tool was a **special tool that returns a list of other tools**. When you called a router, you got back the tool definitions in MCP format.

#### 2. Tools Could Belong to Multiple Routers

The same tool could be assigned to different routers for different contexts, enabling cross-domain functionality discovery.

#### 3. Namespace Calling Pattern

Tools in routers could be called using namespace syntax:

```
router_name__tool_name
```

The **double underscore (`__`)** separated the router name from the tool name.

Examples:
- `weather_router__get_weather`
- `products_router__search`
- `api_router__call_endpoint`

#### 4. flattenRouters Option

Controlled whether router-assigned tools appeared in the main tool list:

- **`flattenRouters: false`** (default) - Production mode
  - Hides router-assigned tools from main list
  - Only routers and unassigned tools visible

- **`flattenRouters: true`** - Testing/development mode
  - Shows ALL tools including router-assigned ones
  - Useful for exploration and testing

### Example from Previous APIs

This example shows how routers worked with BuildMCPServer (no longer the primary API):

```typescript
// LEGACY EXAMPLE - Not compatible with current v4.0.0 Interface API
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
  execute: async (args) => `Weather in ${args.location}: Sunny, 72°F`
});

server.addTool({
  name: 'get_forecast',
  description: 'Get weather forecast',
  parameters: z.object({
    location: z.string(),
    days: z.number()
  }),
  execute: async (args) => `${args.days}-day forecast for ${args.location}`
});

// Create a router to group them
server.addRouterTool({
  name: 'weather_router',
  description: 'Weather information tools',
  tools: ['get_weather', 'get_forecast']
});

await server.start();
```

**How it worked:**
1. Call `weather_router` → Returns list of weather tools
2. Call tools via namespace: `weather_router__get_weather`
3. Or call directly: `get_weather` (if `flattenRouters=true`)

---

## Future Considerations

If router tools are reimplemented for the Interface API, they might look like:

### Possible Interface API Implementation

```typescript
interface IRouterDefinition {
  name: string;
  description: string;
  tools: string[]; // Tool names to include
}

interface IServerWithRouters extends IServer {
  name: 'my-server';
  version: '1.0.0';

  // Regular tools
  tools: {
    get_weather: IToolDefinition;
    get_forecast: IToolDefinition;
    create_product: IToolDefinition;
    update_product: IToolDefinition;
  };

  // Router definitions
  routers?: {
    weather_router: IRouterDefinition;
    products_router: IRouterDefinition;
  };
}
```

### Design Considerations

For future implementation, consider:

1. **Type Safety**: Router tool references should be type-checked against available tools
2. **Discovery**: How models progressively discover tools through routers
3. **Namespace Handling**: Automatic registration of namespaced tool variants
4. **Visibility Control**: Whether to show/hide router-assigned tools
5. **Multi-Router Assignment**: Whether tools can belong to multiple routers
6. **Metadata**: Router context available in tool execution

---

## Related Documentation

- [Features Guide](./FEATURES.md) - Current primary API for v4.0.0
- [Features Guide - Tools](./FEATURES.md#tools) - Tool creation and usage
- [Migration Guide](../MIGRATION-v4.md) - Migrating from previous versions

---

## Summary

**Current State:**
- Router tools are NOT available in Interface API v4.0.0
- Use naming conventions, multiple servers, or descriptive documentation for organization
- Legacy examples reference BuildMCPServer and other deprecated APIs

**Future State:**
- Router tools may be reimplemented for Interface API
- Would need to fit type-safe, interface-driven design
- Community feedback welcome for design considerations

---

**Need help?** Check the [main documentation index](../README.md) or open an issue on GitHub for questions or feature requests.
