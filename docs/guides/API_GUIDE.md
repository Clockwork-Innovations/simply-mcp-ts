# API Styles Guide

Simply MCP supports 4 API styles. Choose the one that fits your needs.

## Quick Comparison

| Aspect | Functional | Decorator | Interface | MCPBuilder |
|--------|-----------|-----------|-----------|-----------|
| **Best for** | Simple scripts | Class-based code | Type-strict teams | Complex builds |
| **Setup** | 3 lines | 2 decorators | Full types | Builder calls |
| **Example file** | `single-file-basic.ts` | `class-basic.ts` | `interface-minimal.ts` | `mcp-builder-foundation.ts` |
| **Verbosity** | ⭐ Minimal | ⭐⭐ Low | ⭐⭐⭐⭐ High | ⭐⭐ Low |
| **Type safety** | ⭐⭐⭐ Good | ⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Good |

## 1. Functional API

**Best for:** Quick prototypes, simple scripts, JavaScript developers.

```bash
# See the working example
npx tsx examples/single-file-basic.ts
cat examples/single-file-basic.ts
```

**Pros:**
- Minimal boilerplate
- Easy to learn
- Good TypeScript support

**Cons:**
- No type safety for schema

**When to use:**
- Small, single-file servers
- Learning MCP for the first time
- Prototyping features

---

## 2. Decorator API

**Best for:** OOP developers, organized code structures, class-based architecture.

```bash
# See the working example
npx tsx examples/class-basic.ts
cat examples/class-basic.ts
```

**Pros:**
- Clean, readable syntax
- Organized by class
- Good IDE support

**Cons:**
- Requires decorators (needs TypeScript)
- Slightly more boilerplate than functional

**When to use:**
- Medium to large servers
- Team projects with OOP conventions
- When you prefer organizing code by class

---

## 3. Interface API

**Best for:** Type-safety conscious teams, strict development environments.

```bash
# See the working example
npx tsx examples/interface-minimal.ts
cat examples/interface-minimal.ts
```

**Pros:**
- Strictest type checking
- Best for catching errors at compile time
- Excellent IDE autocomplete

**Cons:**
- Most verbose
- Steepest learning curve
- More configuration required

**When to use:**
- Critical applications requiring high reliability
- Teams with strict TypeScript standards
- Large enterprise projects

---

## 4. MCPBuilder

**Best for:** Dynamic server construction, programmatic builds, builder patterns.

```bash
# See the working example
npx tsx examples/mcp-builder-foundation.ts
cat examples/mcp-builder-foundation.ts
```

**Pros:**
- Fluent, readable API
- Great for programmatic generation
- Good type safety

**Cons:**
- More method calls than functional
- Slightly verbose

**When to use:**
- Dynamically generating tools
- Complex conditional logic for defining tools
- When you prefer method chaining

---

## Detailed Examples

### See All API Styles Side-by-Side

```bash
# Functional
cat examples/single-file-basic.ts

# Decorator
cat examples/class-basic.ts

# Interface
cat examples/interface-minimal.ts

# MCPBuilder
cat examples/mcp-builder-foundation.ts
```

### Adding Tools (Same Across All APIs)

- **Functional**: [examples/single-file-advanced.ts](../examples/single-file-advanced.ts)
- **Decorator**: [examples/class-advanced.ts](../examples/class-advanced.ts)
- **Interface**: [examples/interface-advanced.ts](../examples/interface-advanced.ts)
- **MCPBuilder**: [examples/mcp-builder-complete.ts](../examples/mcp-builder-complete.ts)

### Adding Prompts & Resources

All APIs support:
- **Prompts**: Dynamic templates for LLMs
- **Resources**: Shared data (files, config, etc.)

See examples directory for implementations in each style.

---

## Choosing Your API

### Decision Tree

**"I want to learn MCP quickly"**
→ Use **Functional API** (`single-file-basic.ts`)

**"I'm building a large server with many tools"**
→ Use **Decorator API** (`class-basic.ts`)

**"My team requires strict TypeScript"**
→ Use **Interface API** (`interface-minimal.ts`)

**"I'm generating tools dynamically"**
→ Use **MCPBuilder** (`mcp-builder-foundation.ts`)

---

## Common Questions

### Can I mix APIs?
Not in a single server, but you can create separate servers with different APIs.

### Can I switch APIs later?
Yes! The core logic (tools, prompts, resources) is the same. Only the wrapper changes.

### Which is fastest?
All are equally fast at runtime. Performance differences are negligible.

### Do I need TypeScript?
No, all examples work with JavaScript. TypeScript support is optional.

---

## Router Tools API

Router tools are available in all API styles for organizing related tools.

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
  description: 'Weather information tools',
  tools: ['get_weather', 'get_forecast']
});
```

### assignTools(routerName, toolNames)

Assigns tools to an existing router.

**Parameters:**
- `routerName`: string - Name of the router
- `toolNames`: string[] - Array of tool names to assign

**Returns:** `this` (for method chaining)

**Example:**
```typescript
server.assignTools('weather_router', ['get_weather', 'get_forecast']);
```

### getStats()

Returns server statistics including router information.

**Returns:**
```typescript
{
  tools: number;              // Total tools (including routers)
  routers: number;            // Number of routers
  assignedTools: number;      // Tools assigned to routers
  unassignedTools: number;    // Tools not in any router
  prompts: number;            // Number of prompts
  resources: number;          // Number of resources
  flattenRouters: boolean;    // Current flattenRouters setting
}
```

**Example:**
```typescript
const stats = server.getStats();
console.log(`${stats.routers} routers organizing ${stats.assignedTools} tools`);
```

### Router Configuration Options

Control router behavior with server options:

```typescript
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  flattenRouters: false  // Hide router-assigned tools (default)
});

// Or enable testing mode:
flattenRouters: true  // Show all tools including router-assigned ones
```

**flattenRouters Modes:**
- `false` (default) - Production mode, hides router-assigned tools
- `true` - Testing mode, shows all tools

### Invocation Patterns

Tools in routers can be called two ways:

```typescript
// Direct call (if flattenRouters=true or tool unassigned)
get_weather({ location: 'NYC' })

// Namespace call (always works)
weather_router__get_weather({ location: 'NYC' })
```

**Namespace format:** `router_name__tool_name` (double underscore)

### API-Specific Router Usage

Router tools work with all 4 API styles:

- **Decorator API**: Use `@Router` decorator on your server class
- **Functional API**: Add routers to the `routers` array in config
- **Interface API**: Use `addRouterTool()` on BuildMCPServer instance
- **MCPBuilder API**: Use `addRouterTool()` on BuildMCPServer instance

See [Router Tools Guide](./ROUTER_TOOLS.md) for complete documentation including API-specific examples, best practices, and migration guides.

---

## Next Steps

1. **Pick one API** from the comparison above
2. **Run its example**: `npx tsx examples/[api-style].ts`
3. **Read the code**: Understand the structure
4. **Modify the example**: Add your own tool
5. **Read the full API docs** when you need advanced features
6. **Organize tools?** See [Router Tools Guide](./ROUTER_TOOLS.md)

Start with [QUICK_START.md](./QUICK_START.md) if you haven't already!
