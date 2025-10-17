# Import Style Guide

**Version:** 3.0.0+
**Last Updated:** 2025-10-17
**Status:** Active

## Overview

This guide documents the recommended (and required) import patterns for the simply-mcp package. As of version 3.0.0, **all exports come from the main package only** (`'simply-mcp'`). Subpath imports are no longer supported. See [CHANGELOG](../../CHANGELOG.md) for details.

---

## Required Pattern (v3.0.0+)

### All-in-One Import (Preferred)

```typescript
// Import everything you need from the main package
import {
  MCPServer,
  tool,
  prompt,
  resource,
  BuildMCPServer,
  defineMCP,
  MCPBuilder,
  type CLIConfig,
  type CLIServerConfig,
  defineConfig
} from 'simply-mcp';
```

**Benefits:**
- Single import statement - easier to read and maintain
- Better IDE autocomplete and type hints
- Consistent with modern JavaScript/TypeScript practices
- Reduces cognitive load for new users

---

## Common Scenarios

### 1. Decorator-Based Server

```typescript
// New unified pattern (v2.5.0+)
import { MCPServer, tool, prompt, resource } from 'simply-mcp';

@MCPServer({ name: 'my-server', version: '1.0.0' })
class MyServer {
  @tool('Add two numbers')
  add(a: number, b: number): number {
    return a + b;
  }

  @prompt('Generate a greeting')
  greet(name: string): string {
    return `Hello, ${name}!`;
  }

  @resource('config://app', { mimeType: 'application/json' })
  config() {
    return { version: '1.0.0' };
  }
}
```

### 2. Configuration-Based Server

```typescript
// New unified pattern (v2.5.0+)
import { defineMCP } from 'simply-mcp';

export default defineMCP({
  name: 'my-server',
  version: '1.0.0',
  tools: {
    add: {
      description: 'Add two numbers',
      parameters: {
        type: 'object',
        properties: {
          a: { type: 'number' },
          b: { type: 'number' }
        },
        required: ['a', 'b']
      },
      handler: ({ a, b }) => a + b
    }
  }
});
```

### 3. Programmatic API

```typescript
// New unified pattern (v2.5.0+)
import { SimplyMCP } from 'simply-mcp';

const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0'
});

server.tool(
  'add',
  'Add two numbers',
  {
    type: 'object',
    properties: {
      a: { type: 'number' },
      b: { type: 'number' }
    },
    required: ['a', 'b']
  },
  ({ a, b }) => a + b
);
```

### 4. Builder Pattern

```typescript
// New unified pattern (v2.5.0+)
import { MCPBuilder } from 'simply-mcp';

const server = MCPBuilder.create({ name: 'my-server', version: '1.0.0' })
  .withTool('add', 'Add two numbers', schema, handler)
  .withPrompt('greet', 'Generate a greeting', handler)
  .build();
```

### 5. CLI Configuration with Types

```typescript
// New unified pattern (v2.5.0+)
import { defineConfig, type CLIConfig } from 'simply-mcp';

export default defineConfig({
  name: 'my-server',
  version: '1.0.0',
  servers: [
    {
      command: 'node',
      args: ['dist/index.js'],
      env: {
        NODE_ENV: 'production'
      }
    }
  ],
  defaults: {
    transport: 'stdio'
  }
} satisfies CLIConfig);
```

---

## Migration from v2.x

**Subpath imports removed in v3.0.0:**
- `'simply-mcp/decorators'` - No longer works, use `'simply-mcp'`
- `'simply-mcp/config'` - No longer works, use `'simply-mcp'`

All exports are now available from the main package only. See CHANGELOG for breaking changes.

---

## Migration Guide

### Step 1: Identify Current Imports

Look for any imports from `'simply-mcp/decorators'` or `'simply-mcp/config'`:

```typescript
// Before
import { MCPServer, tool } from 'simply-mcp/decorators';
import { defineConfig } from 'simply-mcp/config';
import { SimplyMCP } from 'simply-mcp';
```

### Step 2: Combine into Single Import

Move all imports to the main package:

```typescript
// After
import {
  MCPServer,
  tool,
  defineConfig,
  SimplyMCP
} from 'simply-mcp';
```

### Step 3: Update Type Imports

If you're using type-only imports, you can keep them separate or combine them:

```typescript
// Option 1: Combined with regular imports
import {
  MCPServer,
  tool,
  type CLIConfig,
  type CLIServerConfig
} from 'simply-mcp';

// Option 2: Separate type-only import
import type { CLIConfig, CLIServerConfig } from 'simply-mcp';
import { MCPServer, tool } from 'simply-mcp';
```

### Step 4: Test Your Code

Run your server to ensure everything still works:

```bash
npx simply-mcp run your-server.ts --dry-run
```

---

## Available Exports

### Core Server Classes

- `MCPServer` - Decorator for class-based servers
- `SimplyMCP` - Programmatic API class
- `MCPBuilder` - Builder pattern API
- `defineMCP` - Configuration-based server function

### Decorators

- `tool` - Mark method as a tool
- `prompt` - Mark method as a prompt
- `resource` - Mark method as a resource

### Configuration

- `defineConfig` - Type-safe CLI configuration function
- `CLIConfig` - CLI configuration type
- `CLIServerConfig` - Server configuration type (renamed from ServerConfig to avoid conflicts)
- `DefaultsConfig` - Defaults configuration type
- `RunConfig` - Run command configuration type
- `BundleConfig` - Bundle command configuration type
- `APIStyle` - API style enum type
- `TransportType` - Transport type enum

### Utilities

- `MCPError` - Base error class
- `ToolError` - Tool-specific error class
- `PromptError` - Prompt-specific error class
- `ResourceError` - Resource-specific error class

---

## Best Practices

### 1. Use Unified Imports

Always prefer importing from `'simply-mcp'`:

```typescript
// Good
import { MCPServer, tool } from 'simply-mcp';

// Avoid (deprecated)
import { MCPServer, tool } from 'simply-mcp/decorators';
```

### 2. Group Related Imports

Keep related imports together for readability:

```typescript
import {
  // Server classes
  MCPServer,
  BuildMCPServer,

  // Decorators
  tool,
  prompt,
  resource,

  // Types
  type CLIConfig,
  type CLIServerConfig
} from 'simply-mcp';
```

### 3. Use Type-Only Imports When Appropriate

For type-only imports, use the `type` keyword:

```typescript
// Good - explicit type import
import { MCPServer, type CLIConfig } from 'simply-mcp';

// Also good - separate type-only import
import type { CLIConfig } from 'simply-mcp';
import { MCPServer } from 'simply-mcp';
```

### 4. Avoid Wildcard Imports

Don't use wildcard imports - they make code harder to understand:

```typescript
// Bad
import * as MCP from 'simply-mcp';

// Good
import { MCPServer, tool, prompt } from 'simply-mcp';
```

---

## IDE Configuration

### VS Code

Enable import suggestions for the unified pattern by ensuring your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true
  }
}
```

### TypeScript

The package provides full TypeScript definitions for all exports. Your IDE should automatically provide autocomplete and type checking for unified imports.

---

## Version Timeline

- **v2.5.0:** Unified imports available, subpath imports deprecated
- **v3.0.0 (Current):** Subpath imports removed (breaking change)
- **Future:** Only main package imports supported

---

## Examples Repository

See the [examples directory](/mnt/Shared/cs-projects/simple-mcp/examples/) for complete working examples using the unified import pattern:

- `class-minimal.ts` - Minimal decorator example
- `class-basic.ts` - Basic decorator example with tools
- `class-advanced.ts` - Advanced decorator example with prompts and resources
- `simple-server.ts` - Configuration-based example
- `advanced-server.ts` - Programmatic API example

---

## FAQ

### Q: Do I need to update my existing code?

**Yes.** If you're upgrading to v3.0.0 from v2.x, you must update imports from subpaths to the main package. See the [CHANGELOG](../../CHANGELOG.md#removed-deprecated-subpath-exports) for migration details.

### Q: Will upgrading break my code?

If you use subpath imports (`'simply-mcp/decorators'` or `'simply-mcp/config'`), yes - these are removed in v3.0.0. Update all imports to use `'simply-mcp'` main package. This is a breaking change - see [BREAKING_CHANGES_V3.md](../releases/BREAKING_CHANGES_V3.md) for full details.

### Q: Why was this change made?

The unified import pattern provides a better developer experience by:
- Single import statement from main package
- Easier to discover available exports
- Aligning with modern JavaScript/TypeScript practices
- Improved IDE autocomplete and type hints

---

## Related Documentation

- [Quick Start Guide](/mnt/Shared/cs-projects/simple-mcp/src/docs/QUICK-START.md)
- [Decorator API Documentation](/mnt/Shared/cs-projects/simple-mcp/docs/development/DECORATOR-API.md)
- [Migration Guide](/mnt/Shared/cs-projects/simple-mcp/docs/migration/v2-to-v3-migration.md)
- [UX Improvements Roadmap](/mnt/Shared/cs-projects/simple-mcp/docs/development/UX_IMPROVEMENTS_ROADMAP.md)

---

**Last Updated:** 2025-10-06
**Maintained By:** simply-mcp maintainers
