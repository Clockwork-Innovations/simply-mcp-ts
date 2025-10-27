# Router Tools Guide

> **Note for v4.0.0**: Router tools are a legacy feature from previous API versions (BuildMCPServer, Decorator API, Functional API). The current Interface API does not currently support router tools. This guide is maintained for reference and potential future implementation.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Current Status](#current-status)
3. [Router Tools Concept](#router-tools-concept)
4. [Future Considerations](#future-considerations)

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

## Current Status

**Router tools are not currently implemented in the Interface API (v4.0.0).**

The Interface API focuses on type-safe, interface-driven tool definitions without the imperative registration methods (`addTool()`, `addRouterTool()`) used in previous versions.

### Alternative Approaches

If you need to organize many tools in v4.0.0, consider these alternatives:

#### 1. Tool Naming Conventions

Use prefixes to group related tools:

```typescript
interface WeatherTools {
  weather_get_current: IToolDefinition;
  weather_get_forecast: IToolDefinition;
  weather_get_alerts: IToolDefinition;

  product_create: IToolDefinition;
  product_update: IToolDefinition;
  product_delete: IToolDefinition;
}
```

#### 2. Multiple Server Instances

Create separate MCP servers for different domains:

```typescript
// weather-server.ts
export default class WeatherServer implements IServer {
  name = 'weather-server';
  tools = {
    get_current: { /* ... */ },
    get_forecast: { /* ... */ },
    get_alerts: { /* ... */ }
  };
}

// product-server.ts
export default class ProductServer implements IServer {
  name = 'product-server';
  tools = {
    create: { /* ... */ },
    update: { /* ... */ },
    delete: { /* ... */ }
  };
}
```

#### 3. Documentation-Based Organization

Use comprehensive tool descriptions to guide discovery:

```typescript
interface OrganizedServer extends IServer {
  tools: {
    // Weather Tools
    get_weather: {
      description: '[WEATHER] Get current weather conditions';
      // ...
    };
    get_forecast: {
      description: '[WEATHER] Get multi-day weather forecast';
      // ...
    };

    // Product Tools
    create_product: {
      description: '[PRODUCTS] Create a new product';
      // ...
    };
    update_product: {
      description: '[PRODUCTS] Update existing product';
      // ...
    };
  };
}
```

---

## Router Tools Concept

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

- [API Features Reference](./API_FEATURES.md) - Current primary API for v4.0.0
- [Tools Guide](./TOOLS.md) - Tool creation and usage
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
