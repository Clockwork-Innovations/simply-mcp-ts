# Migration Guide: v2 to v3 API

## Overview

Simply MCP v3 introduces a **decorator-first API** with smart defaults and consolidated configuration. The new API dramatically reduces boilerplate while maintaining **100% backwards compatibility** with v2.

### What Changed

| Feature | v2 (Old) | v3 (New) |
|---------|----------|----------|
| **Server Name** | Required in `@MCPServer({ name })` | Optional - auto-generated from class name |
| **Version** | Required in `@MCPServer({ version })` | Optional - auto-detected from package.json |
| **HTTP Config** | Port in two places (decorator + start) | Consolidated in `transport` object |
| **Configuration** | Scattered across decorator and start() | Grouped in logical sections |
| **Minimal Setup** | ~3 required config fields | **Zero config required** |

### Key Benefits

- **Less Boilerplate**: No more repeating `name`, `version`, and port configuration
- **Clearer Intent**: Configuration grouped by purpose (transport, capabilities)
- **Smart Defaults**: Auto-naming and auto-versioning reduce manual work
- **Type Safety**: Better TypeScript support with grouped configuration
- **Zero Config**: `@MCPServer()` with no parameters is now valid

## Breaking Changes

**None!** The v3 API is **100% backwards compatible** with v2.

All existing v2 code continues to work exactly as before. This migration guide describes **recommended best practices** for new code and how to modernize existing servers.

## Recommended Changes

While not required, we recommend updating your code to take advantage of the new smart defaults and cleaner configuration.

### 1. Use Smart Defaults

**Old v2 Style:**
```typescript
@MCPServer({
  name: 'weather-service',
  version: '1.0.0'
})
class WeatherService {
  // ...
}
```

**New v3 Style:**
```typescript
@MCPServer() // Zero config!
class WeatherService {
  // Automatically:
  // - name: 'weather-service' (from class name)
  // - version: '1.0.0' (from package.json)
}
```

### 2. Consolidate Transport Configuration

**Old v2 Style:**
```typescript
@MCPServer({
  name: 'api-server',
  version: '1.0.0',
  port: 3000  // Port in decorator
})
class ApiServer {
  // ...
}

// Later...
await server.start({
  transport: 'http',
  port: 3000  // Port repeated in start()
});
```

**New v3 Style:**
```typescript
@MCPServer({
  transport: {
    type: 'http',
    port: 3000,      // Single source of truth
    stateful: true
  }
})
class ApiServer {
  // ...
}

// Later...
await server.start(); // Uses config from decorator
```

### 3. Group Related Configuration

**Old v2 Style:**
```typescript
@MCPServer({
  name: 'my-server',
  version: '1.0.0',
  sampling: true,     // Scattered options
  logging: true,
  port: 3000
})
```

**New v3 Style:**
```typescript
@MCPServer({
  transport: {
    type: 'http',
    port: 3000,
    stateful: true
  },
  capabilities: {     // Grouped by purpose
    sampling: true,
    logging: true
  }
})
```

## Step-by-Step Migration

Follow these steps to migrate your v2 servers to the v3 API style.

### Step 1: Remove Required Name and Version

If your server name matches the class name (in kebab-case), you can remove it.

**Before:**
```typescript
@MCPServer({ name: 'calculator-service', version: '1.0.0' })
class CalculatorService {
  // ...
}
```

**After:**
```typescript
@MCPServer()  // Auto-generates 'calculator-service'
class CalculatorService {
  // ...
}
```

**Note:** Make sure your `package.json` has a `version` field, or explicitly provide version if needed.

### Step 2: Consolidate Port Configuration

Move port configuration from the decorator root to the `transport` object.

**Before:**
```typescript
@MCPServer({
  name: 'http-server',
  version: '1.0.0',
  port: 3000
})
class HttpServer { }

await server.start({ transport: 'http', port: 3000 });
```

**After:**
```typescript
@MCPServer({
  transport: {
    type: 'http',
    port: 3000,
    stateful: true  // Explicit mode (default is stateful)
  }
})
class HttpServer { }

await server.start();  // Uses decorator config
```

### Step 3: Group Capabilities

Move capability flags into the `capabilities` object.

**Before:**
```typescript
@MCPServer({
  name: 'my-server',
  version: '1.0.0',
  sampling: true,
  logging: true
})
```

**After:**
```typescript
@MCPServer({
  capabilities: {
    sampling: true,
    logging: true
  }
})
```

### Step 4: Update start() Calls

The `start()` method now respects decorator configuration as defaults.

**Before:**
```typescript
await server.start({
  transport: 'http',
  port: 3000
});
```

**After (using decorator config):**
```typescript
await server.start();  // Uses transport.port from decorator
```

**After (overriding at runtime):**
```typescript
await server.start({
  transport: 'http',
  port: 3001  // Override decorator config
});
```

## Before/After Examples

### Example 1: Simple Server

**Before (v2):**
```typescript
import { MCPServer, tool } from 'simply-mcp';

@MCPServer({ name: 'greeter', version: '1.0.0' })
class Greeter {
  @tool()
  greet(name: string): string {
    return `Hello, ${name}!`;
  }
}
```

**After (v3):**
```typescript
import { MCPServer, tool } from 'simply-mcp';

@MCPServer()  // Zero config!
class Greeter {
  @tool()
  greet(name: string): string {
    return `Hello, ${name}!`;
  }
}
```

**Benefits:**
- 2 fewer required fields
- Cleaner, more concise code
- Still fully type-safe

### Example 2: HTTP Server

**Before (v2):**
```typescript
@MCPServer({
  name: 'api-server',
  version: '2.0.0',
  port: 3000
})
class ApiServer {
  @tool()
  getData(): object {
    return { status: 'ok' };
  }
}

// Start with port repeated
await server.start({ transport: 'http', port: 3000 });
```

**After (v3):**
```typescript
@MCPServer({
  version: '2.0.0',  // Keep explicit version if different from package.json
  transport: {
    type: 'http',
    port: 3000,
    stateful: true
  }
})
class ApiServer {
  @tool()
  getData(): object {
    return { status: 'ok' };
  }
}

// Start uses decorator config
await server.start();
```

**Benefits:**
- Port configured once (single source of truth)
- Explicit stateful/stateless mode
- Name auto-generated as 'api-server'

### Example 3: Full Configuration

**Before (v2):**
```typescript
@MCPServer({
  name: 'advanced-server',
  version: '1.5.0',
  description: 'Advanced MCP server',
  sampling: true,
  logging: true,
  port: 8080
})
class AdvancedServer {
  @tool('Fetch data from API')
  async fetchData(url: string): Promise<object> {
    // Implementation
  }
}

await server.start({
  transport: 'http',
  port: 8080
});
```

**After (v3):**
```typescript
@MCPServer({
  version: '1.5.0',
  description: 'Advanced MCP server',
  transport: {
    type: 'http',
    port: 8080,
    stateful: true
  },
  capabilities: {
    sampling: true,
    logging: true
  }
})
class AdvancedServer {
  @tool('Fetch data from API')
  async fetchData(url: string): Promise<object> {
    // Implementation
  }
}

await server.start();
```

**Benefits:**
- Logical grouping of configuration
- Clear separation of concerns
- Auto-generated name 'advanced-server'

### Example 4: Stateless HTTP for Serverless

**Before (v2):**
```typescript
@MCPServer({
  name: 'lambda-function',
  version: '1.0.0',
  port: 3000
})
class LambdaFunction {
  @tool()
  process(data: string): string {
    return data.toUpperCase();
  }
}

await server.start({
  transport: 'http',
  port: 3000,
  stateful: false  // Added in v2.4.0
});
```

**After (v3):**
```typescript
@MCPServer({
  transport: {
    type: 'http',
    port: 3000,
    stateful: false  // Consolidated config
  }
})
class LambdaFunction {
  @tool()
  process(data: string): string {
    return data.toUpperCase();
  }
}

await server.start();
```

**Benefits:**
- All transport config in one place
- Clearer intent (stateless for serverless)
- Name auto-generated as 'lambda-function'

### Example 5: Programmatic API (Still Supported!)

The programmatic API (using `SimplyMCP` class directly) continues to work exactly as before.

**Before and After (No Changes Required):**
```typescript
import { SimplyMCP } from 'simply-mcp';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'programmatic-server',
  version: '1.0.0'
});

server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({
    name: z.string()
  }),
  execute: async (args) => {
    return `Hello, ${args.name}!`;
  }
});

await server.start({ transport: 'stdio' });
```

**Note:** The programmatic API is unchanged and fully supported. The v3 improvements primarily affect the decorator-based API.

## Migration Checklist

Use this checklist to ensure a smooth migration:

- [ ] **Check package.json** - Ensure it has a valid `version` field
- [ ] **Review class names** - Verify kebab-case conversion matches desired server names
- [ ] **Remove redundant config** - Delete `name` and `version` if using defaults
- [ ] **Consolidate port config** - Move port to `transport` object
- [ ] **Group capabilities** - Move capability flags to `capabilities` object
- [ ] **Update start() calls** - Remove redundant options that match decorator config
- [ ] **Test server startup** - Verify server starts with expected configuration
- [ ] **Check server info** - Use `server.getInfo()` to verify name/version are correct
- [ ] **Update documentation** - Update any internal docs or examples
- [ ] **Review custom names** - Keep explicit `name` if you need a specific name

## Frequently Asked Questions

### Q: Do I have to migrate?

**A:** No! The v2 API is fully supported. Migration is optional and recommended only for new projects or when refactoring existing code.

### Q: What if my class name doesn't match my desired server name?

**A:** You can still provide an explicit `name` in the decorator:

```typescript
@MCPServer({ name: 'custom-name' })
class SomeOtherClassName {
  // ...
}
```

### Q: How does auto-versioning work?

**A:** The decorator looks for `package.json` in your project and reads the `version` field. If not found, it defaults to `'1.0.0'`. You can always provide an explicit version:

```typescript
@MCPServer({ version: '2.5.1' })
class MyServer { }
```

### Q: Can I override decorator config at runtime?

**A:** Yes! Options passed to `start()` override decorator configuration:

```typescript
@MCPServer({
  transport: { type: 'http', port: 3000 }
})
class MyServer { }

// Override at runtime
await server.start({
  transport: 'http',
  port: 8080  // Uses 8080, not 3000
});
```

### Q: What about the programmatic API?

**A:** The programmatic API (`SimplyMCP` class) remains unchanged and fully supported. All v3 improvements are in the decorator API.

### Q: How do I know if my configuration is correct?

**A:** Use the CLI's `--dry-run` flag to validate without starting:

```bash
npx simplymcp run server.ts --dry-run
```

This shows the resolved configuration without actually starting the server.

### Q: What's the recommended migration strategy?

**A:** We recommend:

1. **New projects**: Use v3 style from the start
2. **Existing projects**: Migrate gradually as you refactor
3. **Production code**: Test thoroughly before deploying
4. **Use --dry-run**: Validate configuration changes

### Q: Will v2 be deprecated?

**A:** No! v2 style is fully supported and will not be deprecated. Choose the style that works best for your project.

## Troubleshooting

### Issue: Wrong server name after removing explicit name

**Symptom:** Server name doesn't match expected value

**Solution:** Check the kebab-case conversion of your class name:

```typescript
// Class: WeatherService -> name: 'weather-service'
// Class: APIServer -> name: 'apiserver'
// Class: My_Custom_Server -> name: 'my-custom-server'
```

If needed, provide explicit name:

```typescript
@MCPServer({ name: 'api-server' })
class APIServer { }
```

### Issue: Version shows as '1.0.0' instead of project version

**Symptom:** Auto-detected version is wrong

**Solution:** Ensure `package.json` exists with a valid `version` field:

```json
{
  "name": "my-project",
  "version": "2.3.1"
}
```

Or provide explicit version:

```typescript
@MCPServer({ version: '2.3.1' })
class MyServer { }
```

### Issue: Port configuration conflict

**Symptom:** Server starts on wrong port or shows conflict warnings

**Solution:** Remove duplicate port configuration. Choose **one** location:

**Option 1: Decorator (Recommended)**
```typescript
@MCPServer({
  transport: { type: 'http', port: 3000 }
})
class MyServer { }

await server.start();  // Uses 3000
```

**Option 2: Runtime**
```typescript
@MCPServer()
class MyServer { }

await server.start({
  transport: 'http',
  port: 3000
});
```

### Issue: Capabilities not recognized

**Symptom:** Logging or sampling features don't work

**Solution:** Ensure capabilities are grouped in `capabilities` object:

**Wrong:**
```typescript
@MCPServer({
  logging: true,
  sampling: true
})
```

**Correct:**
```typescript
@MCPServer({
  capabilities: {
    logging: true,
    sampling: true
  }
})
```

### Issue: TypeScript errors after migration

**Symptom:** Type errors with new configuration structure

**Solution:** Ensure you're using the latest type definitions:

```bash
npm install simply-mcp@latest
```

If using explicit types, update imports:

```typescript
import { ServerConfig } from 'simply-mcp';

const config: ServerConfig = {
  transport: {
    type: 'http',
    port: 3000
  }
};
```

### Issue: HTTP mode not working as expected

**Symptom:** Stateful/stateless behavior is wrong

**Solution:** Explicitly set the `stateful` flag in transport config:

```typescript
// For stateful (sessions, SSE)
@MCPServer({
  transport: {
    type: 'http',
    port: 3000,
    stateful: true  // Explicit
  }
})

// For stateless (serverless, Lambda)
@MCPServer({
  transport: {
    type: 'http',
    port: 3000,
    stateful: false  // Explicit
  }
})
```

## Additional Resources

- **[Quick Start Guide](../src/docs/QUICK-START.md)** - Get started with Simply MCP
- **[Decorator API Documentation](../development/DECORATOR-API.md)** - Complete decorator API reference
- **[HTTP Transport Guide](../src/docs/HTTP-TRANSPORT.md)** - HTTP transport modes and configuration
- **[Examples](../../examples/)** - See complete working examples
- **[Changelog](../releases/CHANGELOG.md)** - Full list of changes

## Summary

The v3 API brings smart defaults and consolidated configuration to Simply MCP's decorator-based servers. Key takeaways:

1. **100% Backwards Compatible** - All v2 code continues to work
2. **Zero Config Possible** - `@MCPServer()` with no parameters is valid
3. **Smart Defaults** - Auto-naming and auto-versioning reduce boilerplate
4. **Consolidated Config** - Transport and capabilities grouped logically
5. **Migration Optional** - Update at your own pace

Start new projects with v3 style, migrate existing projects gradually, and enjoy cleaner, more maintainable MCP servers!

---

**Questions or Issues?**
- [GitHub Issues](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)
- [Discussions](https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions)
