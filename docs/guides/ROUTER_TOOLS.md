# Router Tools Guide

Complete guide to using router tools for organizing and scaling your MCP server.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Quick Start](#quick-start)
3. [Core Concepts](#core-concepts)
4. [API Reference](#api-reference)
5. [Tool Assignment Patterns](#tool-assignment-patterns)
6. [Invocation Methods](#invocation-methods)
7. [flattenRouters Option](#flattenrouters-option)
8. [Multi-Router Tools](#multi-router-tools)
9. [Best Practices](#best-practices)
10. [Error Handling](#error-handling)
11. [Migration Guide](#migration-guide)
12. [Examples](#examples)
13. [FAQs](#faqs)

---

## Introduction

### What are Router Tools?

Router tools are special tools that **group related operations together under a single discovery endpoint**. Instead of exposing 10+ individual tools directly, you can group them under 2-3 routers based on domain or functionality.

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

### Quick Benefits

- Reduce tool count from 20+ to 3-5 routers
- Improve discoverability for AI models
- Better organization and maintenance
- Support complex multi-domain systems
- Enable progressive tool discovery

---

## Quick Start

Here's the simplest router example to get you started:

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0'
});

// 1. Define your tools
server.addTool({
  name: 'get_weather',
  description: 'Get current weather',
  parameters: z.object({
    location: z.string()
  }),
  execute: async (args) => {
    return `Weather in ${args.location}: Sunny, 72°F`;
  }
});

server.addTool({
  name: 'get_forecast',
  description: 'Get weather forecast',
  parameters: z.object({
    location: z.string(),
    days: z.number()
  }),
  execute: async (args) => {
    return `${args.days}-day forecast for ${args.location}`;
  }
});

// 2. Create a router to group them
server.addRouterTool({
  name: 'weather_router',
  description: 'Weather information tools',
  tools: ['get_weather', 'get_forecast']
});

await server.start();
```

**That's it!** Your tools are now organized under a router.

**How it works:**
1. Call `weather_router` → Returns list of weather tools
2. Call tools via namespace: `weather_router__get_weather`
3. Or call directly: `get_weather` (if `flattenRouters=true`)

---

## Core Concepts

### 1. Router Tools Group Related Operations

A router tool is a **special tool that returns a list of other tools**. When you call a router, you get back the tool definitions in MCP format.

```typescript
// This is a router - it groups tools
server.addRouterTool({
  name: 'products_router',
  description: 'Product management tools',
  tools: ['create_product', 'update_product', 'delete_product']
});

// Call the router:
products_router()
// Returns: { tools: [ { name: 'create_product', ... }, ... ] }
```

### 2. Tools Can Belong to Multiple Routers

The same tool can be assigned to different routers for different contexts:

```typescript
server.addTool({ name: 'search', ... });

// Assign to multiple routers
server.addRouterTool({
  name: 'products_router',
  tools: ['search', 'create_product']
});

server.addRouterTool({
  name: 'users_router',
  tools: ['search', 'create_user']
});

// 'search' now appears in BOTH routers
```

### 3. Namespace Calling Pattern

Tools in routers can be called using namespace syntax:

```
router_name__tool_name
```

The **double underscore (`__`)** separates the router name from the tool name.

Examples:
- `weather_router__get_weather`
- `products_router__search`
- `api_router__call_endpoint`

**Both produce the same result:**
```typescript
// Direct call (if tool is visible)
get_weather({ location: 'NYC' })

// Namespace call (always works)
weather_router__get_weather({ location: 'NYC' })
```

### 4. flattenRouters Option

Controls whether router-assigned tools appear in the main tool list:

- **`flattenRouters: false`** (default) - Production mode
  - Hides router-assigned tools from main list
  - Only routers and unassigned tools visible
  - Cleaner, more organized

- **`flattenRouters: true`** - Testing/development mode
  - Shows ALL tools including router-assigned ones
  - Useful for exploration and testing
  - Models can call any tool directly

---

## API Reference

### addRouterTool(definition)

Registers a router tool that groups related tools together.

**Parameters:**
- `definition: RouterToolDefinition`
  - `name`: string - Router name (use snake_case)
  - `description`: string - What this router provides
  - `tools?`: string[] - Initial tools to assign (optional)
  - `metadata?`: Record<string, unknown> - Custom metadata (optional)

**Returns:** `this` (for method chaining)

**Example:**
```typescript
server.addRouterTool({
  name: 'weather_router',
  description: 'Access weather information tools',
  tools: ['get_weather', 'get_forecast', 'get_alerts']
});
```

**Notes:**
- Router name must be unique
- Router name cannot conflict with existing tool names
- Tools specified in `tools` array must already exist
- Can only be called before `server.start()`

### assignTools(routerName, toolNames)

Assigns tools to an existing router. Alternative to defining tools in router definition.

**Parameters:**
- `routerName`: string - Name of the router
- `toolNames`: string[] - Array of tool names to assign

**Returns:** `this` (for method chaining)

**Example:**
```typescript
// Create router first
server.addRouterTool({
  name: 'api_router',
  description: 'API tools'
});

// Then assign tools
server.assignTools('api_router', ['call_api', 'parse_response']);
```

**Notes:**
- Router must already exist
- All tools must already exist
- Cannot assign routers to routers
- Can only be called before `server.start()`

### getStats()

Returns statistics about the server including router information.

**Returns:**
```typescript
{
  tools: number;              // Total tools (including routers)
  routers: number;            // Number of routers
  assignedTools: number;      // Tools assigned to at least one router
  unassignedTools: number;    // Tools not assigned to any router
  prompts: number;            // Number of prompts
  resources: number;          // Number of resources
  flattenRouters: boolean;    // Current flattenRouters setting
}
```

**Example:**
```typescript
const stats = server.getStats();
console.log(`Server has ${stats.routers} routers organizing ${stats.assignedTools} tools`);
// Output: Server has 3 routers organizing 12 tools
```

---

## Tool Assignment Patterns

There are two ways to assign tools to routers:

### Pattern 1: In-Definition Assignment

Assign tools when creating the router:

```typescript
server.addRouterTool({
  name: 'products_router',
  description: 'Product management',
  tools: ['search', 'create', 'update', 'delete'] // Assign here
});
```

**Pros:**
- Concise and readable
- Clear at a glance what tools belong to router
- Recommended for most cases

**Cons:**
- Tools must already exist
- Less flexible for conditional assignment

### Pattern 2: Chained Assignment

Assign tools after creating the router:

```typescript
server.addRouterTool({
  name: 'products_router',
  description: 'Product management'
}); // No tools specified

server.assignTools('products_router', ['search', 'create', 'update', 'delete']);
```

**Pros:**
- More flexible
- Useful for conditional logic
- Can split assignments across code

**Cons:**
- More verbose
- Requires two steps

### When to Use Each

**Use In-Definition Assignment when:**
- Tool assignments are static
- All tools are defined nearby
- You want concise, readable code

**Use Chained Assignment when:**
- Tool assignments are conditional
- Tools are defined dynamically
- You're building routers programmatically

---

## Invocation Methods

There are two ways to call tools in routers:

### Method 1: Direct Call (Tool Name Only)

Call the tool by its original name:

```typescript
get_weather({ location: 'NYC' })
```

**When it works:**
- Always works if `flattenRouters=true`
- Works if tool is not assigned to any router
- Fails if `flattenRouters=false` and tool is assigned to a router

**Use case:** Testing, development, or when tools aren't hidden

### Method 2: Namespaced Call (router__tool)

Call the tool through its router namespace:

```typescript
weather_router__get_weather({ location: 'NYC' })
```

**When it works:**
- Always works regardless of `flattenRouters` setting
- Explicitly indicates which router context you're using

**Use case:** Production, when tools are hidden, or when you want explicit routing

### Comparison

| Aspect | Direct Call | Namespaced Call |
|--------|-------------|-----------------|
| **Syntax** | `tool_name` | `router__tool_name` |
| **Works with flattenRouters=false** | No (if assigned) | Yes |
| **Works with flattenRouters=true** | Yes | Yes |
| **Requires router knowledge** | No | Yes |
| **Recommended for** | Testing | Production |

### Examples

```typescript
// Setup
server.addTool({ name: 'get_weather', ... });
server.addRouterTool({
  name: 'weather_router',
  tools: ['get_weather']
});

// With flattenRouters=false (default):
get_weather({ location: 'NYC' })
// ERROR: Tool not visible

weather_router__get_weather({ location: 'NYC' })
// SUCCESS: Returns weather

// With flattenRouters=true:
get_weather({ location: 'NYC' })
// SUCCESS: Tool is visible

weather_router__get_weather({ location: 'NYC' })
// SUCCESS: Also works
```

---

## flattenRouters Option

The `flattenRouters` option controls tool visibility in the main tools list.

### Default Value

```typescript
flattenRouters: false  // Default (production mode)
```

### Production Mode (flattenRouters=false)

**What happens:**
- Router-assigned tools are **HIDDEN** from main list
- Only routers and unassigned tools are visible
- Models must call router first to discover tools

**Visible in tools/list:**
- ✅ Routers (e.g., `weather_router`)
- ✅ Unassigned tools (e.g., `general_tool`)
- ❌ Router-assigned tools (e.g., `get_weather`)

**Example:**
```typescript
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  flattenRouters: false  // or omit (default)
});

server.addTool({ name: 'get_weather', ... });
server.addTool({ name: 'general_tool', ... });

server.addRouterTool({
  name: 'weather_router',
  tools: ['get_weather']
});

// tools/list shows:
// - weather_router
// - general_tool
// (get_weather is hidden)
```

**Benefits:**
- Cleaner tool list
- Better organization
- Forces progressive discovery
- Recommended for production

### Testing Mode (flattenRouters=true)

**What happens:**
- ALL tools are visible in main list
- Including router-assigned tools
- Models can call any tool directly

**Visible in tools/list:**
- ✅ Routers (e.g., `weather_router`)
- ✅ Unassigned tools (e.g., `general_tool`)
- ✅ Router-assigned tools (e.g., `get_weather`)

**Example:**
```typescript
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  flattenRouters: true  // Enable testing mode
});

server.addTool({ name: 'get_weather', ... });
server.addTool({ name: 'general_tool', ... });

server.addRouterTool({
  name: 'weather_router',
  tools: ['get_weather']
});

// tools/list shows:
// - weather_router
// - general_tool
// - get_weather
// (all tools visible)
```

**Benefits:**
- Easy testing and exploration
- No need to discover tools first
- Useful during development
- Good for debugging

### Environment-Based Configuration

Use environment variables to control the mode:

```typescript
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  flattenRouters: process.env.NODE_ENV === 'development'
});
```

Or:

```typescript
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  flattenRouters: process.env.FLATTEN_ROUTERS === 'true'
});
```

### Does flattenRouters Affect Execution?

**No!** The `flattenRouters` option **only affects visibility**. It does NOT affect:
- Tool execution
- Performance
- Functionality
- Namespace calling

All tools execute the same way regardless of the setting.

---

## Multi-Router Tools

One of the most powerful features: **a single tool can belong to multiple routers**.

### Why Use Multi-Router Tools?

**Scenario:** You have a `search` tool that's useful in multiple contexts:
- Products domain
- Users domain
- Orders domain

**Solution:** Assign the same tool to multiple routers:

```typescript
// Define the tool once
server.addTool({
  name: 'search',
  description: 'Universal search across entities',
  parameters: z.object({
    query: z.string(),
    entity_type: z.enum(['product', 'user', 'order'])
  }),
  execute: async (args) => {
    // Single implementation handles all entity types
    return `Searching ${args.entity_type}s for "${args.query}"...`;
  }
});

// Assign to multiple routers
server.addRouterTool({
  name: 'products_router',
  tools: ['search', 'create_product', 'update_product']
});

server.addRouterTool({
  name: 'users_router',
  tools: ['search', 'create_user', 'update_user']
});

server.addRouterTool({
  name: 'orders_router',
  tools: ['search', 'create_order', 'update_order']
});

// Now 'search' appears in all three routers!
```

### Namespace Equivalence

All namespace calls to the same tool execute the **same implementation**:

```typescript
// These three calls are EQUIVALENT:
products_router__search({ query: 'widget', entity_type: 'product' })
users_router__search({ query: 'widget', entity_type: 'user' })
orders_router__search({ query: 'widget', entity_type: 'order' })

// All three call the SAME execute function
// Only the namespace context differs
```

### Context Metadata

Tools can see which routers they belong to via context metadata:

```typescript
server.addTool({
  name: 'search',
  description: 'Universal search',
  parameters: z.object({ query: z.string() }),
  execute: async (args, context) => {
    // Access router information
    const routers = context?.metadata?.routers || [];
    const namespace = context?.metadata?.namespace;

    console.log(`Tool belongs to routers: ${routers.join(', ')}`);
    // Output: Tool belongs to routers: products_router, users_router, orders_router

    if (namespace) {
      console.log(`Called via namespace: ${namespace}`);
      // Output: Called via namespace: products_router
    }

    return `Search results for "${args.query}"`;
  }
});
```

**Context fields:**
- `context.metadata.routers` - Array of all routers this tool belongs to
- `context.metadata.namespace` - Router name if called via namespace
- `context.metadata.namespacedCall` - Boolean, true if called via namespace

### Use Cases

**1. Shared Operations:**
```typescript
// search, validate, format - used across multiple domains
```

**2. Cross-Domain Tools:**
```typescript
// analytics tool that works on products, users, orders
```

**3. Common Utilities:**
```typescript
// parse_json, hash_password, send_email
```

### Best Practices

- Keep shared tools **generic and flexible**
- Use parameters to differentiate behavior (`entity_type`)
- Document which routers a tool belongs to
- Consider tool naming carefully for shared tools

---

## Best Practices

### When to Use Routers

**Use routers when you have:**
- 5+ related tools in a domain
- Tools that are often used together
- Multiple logical groupings (products, users, orders)
- A need to reduce tool count for models

**Don't use routers when:**
- You have fewer than 5 tools total
- Tools are unrelated
- Extra organization layer adds no value

### How Many Sub-Tools Per Router?

**Recommended:** 3-10 tools per router

**Too few (1-2 tools):**
- Router adds unnecessary complexity
- Just expose tools directly

**Too many (15+ tools):**
- Consider splitting into multiple routers
- Group by sub-domain or operation type

**Example split:**
```typescript
// Instead of one huge 'api_router' with 20 tools:
server.addRouterTool({ name: 'api_http_router', tools: [...] });    // 6 tools
server.addRouterTool({ name: 'api_auth_router', tools: [...] });    // 4 tools
server.addRouterTool({ name: 'api_data_router', tools: [...] });    // 5 tools
```

### Naming Conventions

**Router names:**
- Use `snake_case`
- End with `_router` suffix (recommended)
- Be descriptive: `weather_router`, not `wr`
- Avoid abbreviations

**Tool names:**
- Use `snake_case`
- Be verb-based: `get_weather`, `create_product`
- Include context if needed: `parse_api_response`

**Examples:**
```typescript
// Good
weather_router
products_router
api_http_router

// Avoid
weather  // Missing _router suffix
wr       // Unclear abbreviation
WEATHER  // Use snake_case
```

### Organizing Complex Domains

**Strategy 1: By Entity Type**
```typescript
server.addRouterTool({ name: 'products_router', tools: [...] });
server.addRouterTool({ name: 'users_router', tools: [...] });
server.addRouterTool({ name: 'orders_router', tools: [...] });
```

**Strategy 2: By Operation Type**
```typescript
server.addRouterTool({ name: 'read_router', tools: ['get_product', 'get_user'] });
server.addRouterTool({ name: 'write_router', tools: ['create_product', 'update_user'] });
```

**Strategy 3: By Layer**
```typescript
server.addRouterTool({ name: 'api_router', tools: [...] });
server.addRouterTool({ name: 'database_router', tools: [...] });
server.addRouterTool({ name: 'analytics_router', tools: [...] });
```

### Testing Strategy

**Development:**
```typescript
flattenRouters: true  // Show all tools for easy testing
```

**Production:**
```typescript
flattenRouters: false  // Hide router-assigned tools
```

**Environment-based:**
```typescript
flattenRouters: process.env.NODE_ENV !== 'production'
```

---

## Error Handling

### Common Errors and Solutions

#### Error: "Router 'X' does not exist"

**Cause:** Trying to assign tools to a router that hasn't been created.

**Solution:**
```typescript
// Create router first
server.addRouterTool({ name: 'my_router', description: '...' });

// Then assign tools
server.assignTools('my_router', ['tool1', 'tool2']);
```

#### Error: "Tool 'X' does not exist"

**Cause:** Trying to assign a tool that hasn't been added yet.

**Solution:**
```typescript
// Add tool first
server.addTool({ name: 'my_tool', ... });

// Then assign to router
server.addRouterTool({ name: 'my_router', tools: ['my_tool'] });
```

#### Error: "Router 'X' is already registered"

**Cause:** Trying to create a router with a name that already exists.

**Solution:**
```typescript
// Use unique router names
server.addRouterTool({ name: 'products_router', ... });
server.addRouterTool({ name: 'users_router', ... });  // Different name
```

#### Error: "Unknown router in namespace: X"

**Cause:** Trying to call a tool via namespace with a router that doesn't exist.

**Solution:**
```typescript
// Use correct router name
weather_router__get_weather()  // Correct
weather__get_weather()         // Wrong (router is 'weather_router')
```

#### Error: "Tool 'X' not found in router 'Y'"

**Cause:** Trying to call a tool via namespace but the router doesn't have that tool.

**Solution:**
```typescript
// Call the router first to see its tools
weather_router()  // Returns list of available tools

// Then use a tool that exists in that router
weather_router__get_weather()  // Correct
weather_router__search()       // Wrong if 'search' not in router
```

#### Error: "Cannot add router tools after server has started"

**Cause:** Trying to add routers after `server.start()` has been called.

**Solution:**
```typescript
// Define all routers before starting
server.addRouterTool({ ... });
server.addRouterTool({ ... });

// Start server last
await server.start();
```

---

## Migration Guide

### Converting Flat Tools to Routers

**Before (Flat Structure):**
```typescript
const server = new BuildMCPServer({ name: 'my-server', version: '1.0.0' });

server.addTool({ name: 'get_weather', ... });
server.addTool({ name: 'get_forecast', ... });
server.addTool({ name: 'get_alerts', ... });
server.addTool({ name: 'create_product', ... });
server.addTool({ name: 'update_product', ... });
server.addTool({ name: 'delete_product', ... });
server.addTool({ name: 'search_products', ... });

await server.start();

// Result: 7 tools in tools/list
```

**After (Router Structure):**
```typescript
const server = new BuildMCPServer({ name: 'my-server', version: '1.0.0' });

// Weather tools
server.addTool({ name: 'get_weather', ... });
server.addTool({ name: 'get_forecast', ... });
server.addTool({ name: 'get_alerts', ... });

// Product tools
server.addTool({ name: 'create_product', ... });
server.addTool({ name: 'update_product', ... });
server.addTool({ name: 'delete_product', ... });
server.addTool({ name: 'search_products', ... });

// Group under routers
server.addRouterTool({
  name: 'weather_router',
  description: 'Weather information',
  tools: ['get_weather', 'get_forecast', 'get_alerts']
});

server.addRouterTool({
  name: 'products_router',
  description: 'Product management',
  tools: ['create_product', 'update_product', 'delete_product', 'search_products']
});

await server.start();

// Result: 2 tools in tools/list (both routers)
// Hidden: 7 sub-tools (if flattenRouters=false)
```

### Backward Compatibility

**Good news:** Router tools are **fully backward compatible**.

**What stays the same:**
- Existing tool definitions don't change
- Tool execute functions don't change
- Direct tool calls still work (if `flattenRouters=true`)

**What changes:**
- Add router definitions
- Optionally use namespace calling
- Optionally hide tools with `flattenRouters=false`

**Migration can be gradual:**
```typescript
// Step 1: Add routers without hiding tools
server.addRouterTool({ name: 'products_router', tools: [...] });
// Tools still visible (flattenRouters=true)

// Step 2: Test namespace calling
products_router__create_product()

// Step 3: Hide tools when ready
server.options.flattenRouters = false;
```

---

## Examples

### Example 1: Basic Weather Router

Simple router with 3 weather tools:

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'weather-server',
  version: '1.0.0'
});

server.addTool({
  name: 'get_current_weather',
  description: 'Get current weather',
  parameters: z.object({ location: z.string() }),
  execute: async (args) => `Weather: ${args.location}`
});

server.addTool({
  name: 'get_forecast',
  description: 'Get weather forecast',
  parameters: z.object({ location: z.string(), days: z.number() }),
  execute: async (args) => `Forecast: ${args.days} days`
});

server.addRouterTool({
  name: 'weather_router',
  description: 'Weather tools',
  tools: ['get_current_weather', 'get_forecast']
});

await server.start();
```

**See full example:** [examples/router-weather/server.ts](../../examples/router-weather/server.ts)

### Example 2: Multi-Router Pattern

One tool shared across multiple routers:

```typescript
const server = new BuildMCPServer({
  name: 'multi-router',
  version: '1.0.0',
  flattenRouters: true  // Testing mode
});

// Shared search tool
server.addTool({
  name: 'search',
  description: 'Universal search',
  parameters: z.object({
    query: z.string(),
    entity_type: z.enum(['product', 'user'])
  }),
  execute: async (args) => `Searching ${args.entity_type}...`
});

// Product-specific tools
server.addTool({ name: 'create_product', ... });
server.addTool({ name: 'update_product', ... });

// User-specific tools
server.addTool({ name: 'create_user', ... });
server.addTool({ name: 'update_user', ... });

// Products router (includes search)
server.addRouterTool({
  name: 'products_router',
  tools: ['search', 'create_product', 'update_product']
});

// Users router (also includes search)
server.addRouterTool({
  name: 'users_router',
  tools: ['search', 'create_user', 'update_user']
});

// 'search' now appears in BOTH routers!
```

**See full example:** [examples/router-multi/server.ts](../../examples/router-multi/server.ts)

### Example 3: Testing vs Production Mode

Environment-based configuration:

```typescript
const server = new BuildMCPServer({
  name: 'api-server',
  version: '1.0.0',
  flattenRouters: process.env.FLATTEN_ROUTERS === 'true'
});

server.addTool({ name: 'call_api', ... });
server.addTool({ name: 'parse_response', ... });
server.addTool({ name: 'general_tool', ... });

server.addRouterTool({
  name: 'api_router',
  tools: ['call_api', 'parse_response']
});

await server.start();

// Production: FLATTEN_ROUTERS not set
// tools/list shows: api_router, general_tool

// Testing: FLATTEN_ROUTERS=true
// tools/list shows: api_router, call_api, parse_response, general_tool
```

**See full example:** [examples/router-testing/server.ts](../../examples/router-testing/server.ts)

---

## API-Specific Examples

This section demonstrates how to use router tools with each of Simply MCP's 4 API styles. All styles support the same router functionality, but with different syntax patterns.

### Decorator API (Class-Based)

The Decorator API uses the `@Router` decorator to assign tools to routers. Apply `@Router` to your server class.

**Approach:**
- Use `@Router` decorator with router definition
- Specify tool names that match `@tool` decorated methods
- Multiple `@Router` decorators can be applied to the same class

**Example:**

```typescript
import { MCPServer, tool, Router } from 'simply-mcp';
import { z } from 'zod';

@MCPServer({ name: 'weather-server', version: '1.0.0' })
@Router({
  name: 'weather_router',
  description: 'Weather information tools',
  tools: ['getCurrentWeather', 'getForecast']
})
export default class WeatherServer {
  /**
   * Get current weather for a location
   */
  @tool('Get current weather conditions')
  getCurrentWeather(location: string, units?: string): string {
    return `Current weather in ${location}: Sunny, 72°F`;
  }

  /**
   * Get weather forecast
   */
  @tool('Get multi-day weather forecast')
  getForecast(location: string, days: number = 3): string {
    return `${days}-day forecast for ${location}`;
  }

  /**
   * A general tool not in the router
   */
  @tool('Echo a message')
  echo(message: string): string {
    return message;
  }
}
```

**How to add/assign routers:**
- Apply `@Router` decorator to the class (can use multiple times)
- Tool names in `tools` array must match method names exactly (camelCase)
- Unassigned tools (like `echo`) remain visible in the main tool list

**Key differences from other APIs:**
- Declarative via decorator syntax
- Tools are methods, routers are class-level decorators
- Method names automatically become tool names
- No manual registration step needed

---

### Functional API (Configuration-Based)

The Functional API uses the `routers` array in `defineMCP` configuration.

**Approach:**
- Define routers in the `routers` array
- Reference tool names from the `tools` array
- Uses kebab-case for tool and router names

**Example:**

```typescript
import { defineMCP } from 'simply-mcp';
import { z } from 'zod';

export default defineMCP({
  name: 'weather-server',
  version: '1.0.0',

  tools: [
    {
      name: 'get-current-weather',
      description: 'Get current weather conditions',
      parameters: z.object({
        location: z.string(),
        units: z.string().optional()
      }),
      execute: async (args) => {
        return `Current weather in ${args.location}: Sunny, 72°F`;
      }
    },
    {
      name: 'get-forecast',
      description: 'Get multi-day weather forecast',
      parameters: z.object({
        location: z.string(),
        days: z.number().default(3)
      }),
      execute: async (args) => {
        return `${args.days}-day forecast for ${args.location}`;
      }
    },
    {
      name: 'echo',
      description: 'Echo a message',
      parameters: z.object({
        message: z.string()
      }),
      execute: async (args) => args.message
    }
  ],

  routers: [
    {
      name: 'weather-router',
      description: 'Weather information tools',
      tools: ['get-current-weather', 'get-forecast']
    }
  ]
});
```

**How to add/assign routers:**
- Add router definitions to the `routers` array in config
- Tool names must match exactly (use kebab-case)
- Tools are automatically assigned when the config is processed

**Key differences from other APIs:**
- Pure configuration approach
- All-in-one file with tools and routers
- No separate registration step
- Uses kebab-case naming convention

---

### Interface API (Type-Driven)

The Interface API delegates to BuildMCPServer for router registration.

**Approach:**
- Implement the interface for your server
- Manually register routers using BuildMCPServer
- Provides strongest type safety

**Example:**

```typescript
import type { ITool, IServer } from 'simply-mcp';
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

// Define tool interfaces
interface GetCurrentWeatherTool extends ITool {
  name: 'get_current_weather';
  description: 'Get current weather conditions';
  params: { location: string; units?: string };
  result: string;
}

interface GetForecastTool extends ITool {
  name: 'get_forecast';
  description: 'Get multi-day weather forecast';
  params: { location: string; days?: number };
  result: string;
}

interface EchoTool extends ITool {
  name: 'echo';
  description: 'Echo a message';
  params: { message: string };
  result: string;
}

// Define server interface
interface WeatherServerInterface extends IServer {
  name: 'weather-server';
  version: '1.0.0';
}

// Implement the server
export default class WeatherServer implements WeatherServerInterface {
  readonly name = 'weather-server' as const;
  readonly version = '1.0.0' as const;

  getCurrentWeather: GetCurrentWeatherTool['execute'] = async (params) => {
    return `Current weather in ${params.location}: Sunny, 72°F`;
  };

  getForecast: GetForecastTool['execute'] = async (params) => {
    return `${params.days || 3}-day forecast for ${params.location}`;
  };

  echo: EchoTool['execute'] = async (params) => {
    return params.message;
  };
}

// Manual router registration using BuildMCPServer
export function createServer() {
  const server = new BuildMCPServer({
    name: 'weather-server',
    version: '1.0.0'
  });

  const instance = new WeatherServer();

  // Register tools
  server.addTool({
    name: 'get_current_weather',
    description: 'Get current weather conditions',
    parameters: z.object({
      location: z.string(),
      units: z.string().optional()
    }),
    execute: instance.getCurrentWeather
  });

  server.addTool({
    name: 'get_forecast',
    description: 'Get multi-day weather forecast',
    parameters: z.object({
      location: z.string(),
      days: z.number().default(3)
    }),
    execute: instance.getForecast
  });

  server.addTool({
    name: 'echo',
    description: 'Echo a message',
    parameters: z.object({ message: z.string() }),
    execute: instance.echo
  });

  // Register router
  server.addRouterTool({
    name: 'weather_router',
    description: 'Weather information tools',
    tools: ['get_current_weather', 'get_forecast']
  });

  return server;
}
```

**How to add/assign routers:**
- Create BuildMCPServer instance
- Register tools with `addTool()`
- Register routers with `addRouterTool()`
- Tool names must match between registration and router assignment

**Key differences from other APIs:**
- Requires manual server construction
- Strongest compile-time type checking
- Interface-driven design
- More boilerplate but maximum safety

---

### MCPBuilder API (Programmatic)

The MCPBuilder API is the same as the Programmatic API (BuildMCPServer).

**Approach:**
- Create BuildMCPServer instance
- Add tools with `addTool()`
- Add routers with `addRouterTool()`
- Chain method calls for builder pattern

**Example:**

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'weather-server',
  version: '1.0.0'
});

// Add tools
server.addTool({
  name: 'get_current_weather',
  description: 'Get current weather conditions',
  parameters: z.object({
    location: z.string(),
    units: z.string().optional()
  }),
  execute: async (args) => {
    return `Current weather in ${args.location}: Sunny, 72°F`;
  }
});

server.addTool({
  name: 'get_forecast',
  description: 'Get multi-day weather forecast',
  parameters: z.object({
    location: z.string(),
    days: z.number().default(3)
  }),
  execute: async (args) => {
    return `${args.days}-day forecast for ${args.location}`;
  }
});

server.addTool({
  name: 'echo',
  description: 'Echo a message',
  parameters: z.object({ message: z.string() }),
  execute: async (args) => args.message
});

// Add router
server.addRouterTool({
  name: 'weather_router',
  description: 'Weather information tools',
  tools: ['get_current_weather', 'get_forecast']
});

await server.start();
```

**How to add/assign routers:**
- Call `addRouterTool()` on the server instance
- Specify tool names that match previously added tools
- Can use method chaining for fluent API

**Key differences from other APIs:**
- Imperative, step-by-step approach
- Most flexible and dynamic
- Good for programmatic generation
- Explicit control over registration order

---

### Comparison Summary

| Aspect | Decorator | Functional | Interface | MCPBuilder |
|--------|-----------|------------|-----------|-----------|
| **Router Definition** | `@Router` decorator | `routers` array in config | `addRouterTool()` call | `addRouterTool()` call |
| **Tool Naming** | camelCase (method names) | kebab-case | snake_case | snake_case |
| **Registration** | Automatic | Automatic | Manual | Manual |
| **Type Safety** | Good | Good | Excellent | Good |
| **Verbosity** | Low | Low | High | Medium |
| **Best For** | OOP developers | Quick prototypes | Type-strict teams | Dynamic builds |

---

### Example References

- **Decorator API**: [examples/router-decorator/](../../examples/router-decorator/) *(to be created)*
- **Functional API**: [examples/router-functional/](../../examples/router-functional/) *(to be created)*
- **Interface API**: [examples/router-interface/](../../examples/router-interface/) *(to be created)*
- **MCPBuilder API**: [examples/router-weather/](../../examples/router-weather/), [examples/router-multi/](../../examples/router-multi/), [examples/router-testing/](../../examples/router-testing/)

All examples demonstrate the same router functionality with different API styles. Choose the style that best fits your development preferences and project requirements.

---

## FAQs

### Can I call tools directly if they're in a router?

**Yes!** You can always call tools directly by name:

```typescript
get_weather({ location: 'NYC' })
```

**However:**
- This only works if `flattenRouters=true` OR the tool is not assigned to any router
- If `flattenRouters=false` and the tool is assigned, use namespace calling instead

### Can a tool be in multiple routers?

**Yes!** This is a key feature. One tool can belong to multiple routers:

```typescript
server.addTool({ name: 'search', ... });

server.addRouterTool({ name: 'products_router', tools: ['search', ...] });
server.addRouterTool({ name: 'users_router', tools: ['search', ...] });

// 'search' appears in both routers
```

### Does flattenRouters affect execution?

**No!** It only affects visibility in the tools list. All tools execute the same way regardless of the setting.

```typescript
// These are equivalent regardless of flattenRouters:
get_weather({ location: 'NYC' })
weather_router__get_weather({ location: 'NYC' })
```

### What's the namespace separator?

**Double underscore (`__`)** separates router name from tool name:

```
router_name__tool_name
```

Examples:
- `weather_router__get_weather`
- `products_router__search`
- `api_router__call_endpoint`

**Not:** `router_name:tool_name` or `router_name.tool_name` or `router_name/tool_name`

### Can I nest routers (router inside router)?

**No.** Routers cannot be assigned to other routers. Only regular tools can be assigned to routers.

```typescript
// This will error:
server.addRouterTool({ name: 'router1', ... });
server.addRouterTool({ name: 'router2', ... });
server.assignTools('router1', ['router2']);  // ERROR!
```

### How do I see which tools are in a router?

Call the router like a tool:

```typescript
weather_router()
// Returns: {
//   tools: [
//     { name: 'get_weather', description: '...', inputSchema: {...} },
//     { name: 'get_forecast', description: '...', inputSchema: {...} }
//   ]
// }
```

### Should I use routers in production?

**Yes!** Routers are production-ready and recommended for servers with 5+ tools. They provide better organization and scalability.

**Recommended production settings:**
```typescript
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  flattenRouters: false  // Hide router-assigned tools
});
```

### Can I change router assignments after server starts?

**No.** Router and tool definitions must be complete before calling `server.start()`.

```typescript
// This will error:
await server.start();
server.addRouterTool({ ... });  // ERROR: Server already started
```

Define everything first, then start:

```typescript
// Define all tools and routers
server.addTool({ ... });
server.addRouterTool({ ... });

// Start last
await server.start();
```

---

## Related Documentation

- [Tools Guide](./TOOLS.md) - Basic tool creation
- [API Guide](./API_GUIDE.md) - Complete API reference
- [Configuration Guide](./CONFIGURATION.md) - Server configuration options
- [Examples Index](../../examples/EXAMPLES_INDEX.md) - All working examples

---

**Need help?** Check the [main documentation index](../README.md) or open an issue on GitHub.
