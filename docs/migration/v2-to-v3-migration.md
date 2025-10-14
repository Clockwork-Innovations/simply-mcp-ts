# Migration Guide: v2.x to v3.0.0

**Last Updated:** 2025-10-06
**Current Version:** v2.5.0
**Target Version:** v3.0.0 (TBD - at least 3-6 months after v2.5.0)

## Overview

This guide helps you migrate from SimpleMCP v2.x to v3.0.0. Version 3.0.0 includes breaking changes focused on improving long-term developer experience while removing deprecated patterns.

**Most Important Change:** Subpath exports (`simply-mcp/decorators` and `simply-mcp/config`) are **NO LONGER SUPPORTED** in v3.0.0. All imports must now come from the main `'simply-mcp'` package.

## Timeline & Deprecation Schedule

| Version | Status | Release Date | Changes |
|---------|--------|--------------|---------|
| v2.4.7 | Released | 2025-10-06 | UX improvements, TDD testing |
| v2.5.0 | Released | 2025-10-10 | Unified imports available, deprecations added |
| v2.x | Maintenance | Ongoing | Critical bug fixes only |
| **v3.0.0** | **Current** | **2025-10-13** | **Breaking changes, subpath imports removed** |

**Support Schedule:**
- v2.x will receive security updates for 6 months after v3.0.0 release
- v2.x will receive bug fixes for 3 months after v3.0.0 release

---

## What's Changing in v3.0.0

### Major Changes Summary

| Feature | v2.x (Old) | v3.0.0 (Current) |
|---------|------------|------------------|
| **Imports** | Subpath imports worked | Unified only (required) |
| **Decorator Params** | String only | String only |
| **Programmatic API** | `BuildMCPServer` | `BuildMCPServer` (standard) |
| **Server Name** | Required in decorator | Optional with auto-generation |
| **Version** | Required in decorator | Optional with auto-detection |
| **Node.js** | 18+ | 20+ required |

---

## Migrating to v3.0.0 (Breaking Changes)

### Breaking Changes in v3.0.0

#### 1. Subpath Imports Removed (BREAKING)

**Status:** Removed in v3.0.0

**What breaks:**
```typescript
// v2.x - Worked
import { tool } from 'simply-mcp/decorators';
import { defineConfig } from 'simply-mcp/config';

// v3.0.0 - ERROR: Module not found
import { tool } from 'simply-mcp/decorators'; // ❌ Error!
import { defineConfig } from 'simply-mcp/config'; // ❌ Error!
```

**How to fix:**
```typescript
// v3.0.0 - Required
import { tool, defineConfig } from 'simply-mcp';
```

**Migration:** You must update ALL imports to use the main package entry point before upgrading to v3.0.0.

#### 2. Decorator Syntax Unchanged

**Status:** No breaking changes for decorators in v3.0.0

**v3.0.0 (Current):**
```typescript
// String parameters work
@tool('Add two numbers')
add(a: number, b: number) {
  return a + b;
}

// Object syntax not yet supported
@tool({ description: 'Add numbers' }) // ❌ Still not supported
```

**Migration:** No action needed - your existing decorator syntax continues to work in v3.0.0.

#### 3. Node.js 20+ Required

**Status:** Implemented in v3.0.0

v3.0.0 requires Node.js 20 or higher.

**v2.x:** Node.js 18+
**v3.0.0:** Node.js 20+

**Migration:** Upgrade your Node.js version before upgrading to v3.0.0:

```bash
# Check current version
node --version

# Should be v20.0.0 or higher
```

---

## Breaking Changes

### What Will NOT Break in v3.0.0

The following will continue to work without changes:

✅ **Decorator syntax** - `@MCPServer()`, `@tool()`, `@prompt()`, `@resource()`
✅ **String decorator parameters** - `@tool('description')`
✅ **Programmatic API** - Core functionality remains the same
✅ **Configuration API** - `defineMCP()` pattern
✅ **All existing examples** - Will be updated but old patterns documented
✅ **TypeScript types** - Compatible upgrades only

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

### Example 5: Programmatic API

The programmatic API uses `BuildMCPServer` in v3.0.0+.

**v3.0.0+:**
```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
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

**Note:** Use `BuildMCPServer` for the programmatic API in v3.0.0+.

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

**A:** The programmatic API uses `BuildMCPServer`. Use `import { BuildMCPServer } from 'simply-mcp'`.

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

## Automated Migration Tool

We plan to provide an automated migration tool for v3.0.0 to make upgrades as smooth as possible:

```bash
# Coming with v3.0.0
npx simply-mcp migrate v2-to-v3
```

**What the tool will do:**
- Scan your codebase for deprecated patterns
- Automatically update import statements
- Rename classes if needed (with confirmation)
- Update decorator usage
- Generate a detailed migration report
- Create backup of original files
- Provide rollback option

**Status:** Tool will be released with v3.0.0 beta.

---

## Common Migration Patterns

### Pattern 1: Simple Decorator Server

**v2.x (old - no longer works in v3):**
```typescript
import { MCPServer, tool } from 'simply-mcp/decorators';

@MCPServer({ name: 'calculator', version: '1.0.0' })
export default class Calculator {
  @tool('Add two numbers')
  add(a: number, b: number) {
    return a + b;
  }
}
```

**v3.0.0 (required):**
```typescript
import { MCPServer, tool } from 'simply-mcp';

@MCPServer({ name: 'calculator', version: '1.0.0' })
export default class Calculator {
  @tool('Add two numbers')
  add(a: number, b: number) {
    return a + b;
  }
}
```

**Changes:** Import path changed from `'simply-mcp/decorators'` to `'simply-mcp'`

---

### Pattern 2: Programmatic API

**v3.0.0+:**
```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0'
});

server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({ name: z.string() }),
  execute: async (args) => `Hello, ${args.name}!`
});
```

**Note:** Use `BuildMCPServer` in v3.0.0+.

---

### Pattern 3: Configuration with Types

**v2.x (old - no longer works in v3):**
```typescript
import type { CLIConfig } from 'simply-mcp/config';
import { defineConfig } from 'simply-mcp/config';

export default defineConfig({
  defaultServer: 'main',
  servers: {
    main: {
      entry: './server.ts',
      transport: 'http',
      port: 3000
    }
  }
});
```

**v3.0.0 (required):**
```typescript
import { defineConfig, type CLIConfig } from 'simply-mcp';

export default defineConfig({
  defaultServer: 'main',
  servers: {
    main: {
      entry: './server.ts',
      transport: 'http',
      port: 3000
    }
  }
});
```

**Changes:** Import path changed from `'simply-mcp/config'` to `'simply-mcp'`

---

## Troubleshooting Migration Issues

### Issue: Import errors after updating

**Symptom:**
```
Module '"simply-mcp"' has no exported member 'tool'
```

**Solutions:**
1. Ensure you're on v2.5.0 or later: `npm list simply-mcp`
2. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
3. Check your package.json has correct version: `"simply-mcp": "^2.5.0"`
4. Rebuild the project: `npm run build`

### Issue: TypeScript errors with unified imports

**Symptom:**
```
Cannot find module 'simply-mcp' or its corresponding type declarations
```

**Solutions:**
1. Update TypeScript to latest: `npm install -D typescript@latest`
2. Check tsconfig.json has correct module resolution:
   ```json
   {
     "compilerOptions": {
       "moduleResolution": "node16"
     }
   }
   ```
3. Clear TypeScript cache: `rm -rf dist && npx tsc --build --clean`

### Issue: Decorator errors after migration

**Symptom:**
```
TypeError: @tool decorator expects a string description, got object
```

**Solution:** You're using object syntax which isn't supported yet in v2.x:

**Wrong (v2.x):**
```typescript
@tool({ description: 'Add numbers' })
```

**Correct (v2.x):**
```typescript
@tool('Add numbers')
```

**Or wait for v3.0.0** which will support both syntaxes.

### Issue: IDE still showing deprecation warnings

**Symptom:** Even after updating imports, IDE shows deprecation warnings

**Solutions:**
1. Restart your IDE/editor
2. Clear editor cache (VSCode: Cmd+Shift+P → "Clear Editor History")
3. Ensure all imports are updated (check all files, not just recent changes)
4. Check if any dependencies are using old imports

---

## Migration Checklist

### v3.0.0 Migration

- [ ] Backup your project (`git commit` or create a branch)
- [ ] Upgrade Node.js to 20+: `node --version` (must be >= v20.0.0)
- [ ] Find all old imports: `grep -r "from 'simply-mcp/" src/`
- [ ] Replace decorator imports: `'simply-mcp/decorators'` → `'simply-mcp'`
- [ ] Replace config imports: `'simply-mcp/config'` → `'simply-mcp'`
- [ ] Update to v3.0.0: `npm install simply-mcp@3.0.0`
- [ ] Build project: `npm run build`
- [ ] Run tests: `npm test`
- [ ] Test server startup: `npx simplymcp run server.ts --dry-run`
- [ ] Address any SSE transport usage (migrate to HTTP stateful)
- [ ] Review and test all changes
- [ ] Update internal documentation
- [ ] Test in staging environment
- [ ] Deploy to production
- [ ] Commit changes: `git commit -m "Migrate to v3.0.0"`

---

## Getting Help

**Before Migrating:**
- Read this migration guide thoroughly
- Review the [v2.5.0 Release Notes](../releases/RELEASE_NOTES_v2.5.0.md)
- Check the [Quick Migration Cheatsheet](./QUICK_MIGRATION.md)
- Browse [examples](../../examples/) for updated patterns

**During Migration:**
- Use `--dry-run` flag to validate changes
- Test incrementally (file by file or feature by feature)
- Keep old code in git history for reference
- Run tests after each change

**After Migration:**
- Monitor for runtime issues
- Review IDE warnings
- Update documentation
- Share feedback with the community

**Support Channels:**
- [GitHub Issues](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues) - Report bugs or migration problems
- [GitHub Discussions](https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions) - Ask questions or share experiences
- [Release Notes](../releases/) - Detailed information about each version
- [Examples](../../examples/) - Working code samples

---

## Feedback on v3.0.0 Plans

We want your input on the v3.0.0 breaking changes! Share your thoughts on:

**Questions for the community:**
1. What other improvements would you like to see in future versions?
2. Is the migration timeline reasonable?
3. Would you use automated migration tools?
4. Are there any features we should improve?

**How to provide feedback:**
- Open a [GitHub Discussion](https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions)
- Comment on the v3.0.0 planning issue (link TBD)
- Join our community chat (link TBD)
- Email the maintainers (link TBD)

Your feedback will directly influence v3.0.0 design decisions!

---

## Additional Resources

- **[Quick Migration Cheatsheet](./QUICK_MIGRATION.md)** - One-page quick reference
- **[v2.5.0 Release Notes](../releases/RELEASE_NOTES_v2.5.0.md)** - Detailed v2.5.0 changes
- **[Import Style Guide](../development/IMPORT_STYLE_GUIDE.md)** - Import pattern best practices
- **[Quick Start Guide](../../src/docs/QUICK-START.md)** - Get started with Simply MCP
- **[Decorator API Documentation](../development/DECORATOR-API.md)** - Complete decorator API reference
- **[Examples](../../examples/)** - See complete working examples
- **[Changelog](../releases/CHANGELOG.md)** - Full list of changes

## Summary

Migrating from v2.x to v3.0.0 is a two-phase process designed to minimize risk:

**Phase 1: v2.5.0 (Backward Compatible)**
- ✅ Update imports to unified pattern
- ✅ Test thoroughly with existing functionality
- ✅ Get familiar with new patterns
- ✅ Receive deprecation warnings
- ✅ Zero breaking changes

**Phase 2: v3.0.0 (Breaking Changes)**
- ✅ Remove subpath imports (already done if you completed Phase 1)
- ✅ Support for decorator object syntax (new feature)
- ✅ Possible class renaming (automated migration provided)
- ✅ Node.js 20+ requirement
- ✅ Cleaner, more modern API

**Key Takeaways:**
1. **Migrate to v2.5.0 first** - Safe, backward compatible, prepares you for v3.0.0
2. **Test incrementally** - Use `--dry-run` and comprehensive testing
3. **Automated tooling** - Migration tools will be provided for v3.0.0
4. **Plenty of time** - At least 3-6 months between v2.5.0 and v3.0.0
5. **Community support** - Help available through multiple channels

Start your migration today by updating to v2.5.0 and enjoy the improved developer experience!

---

**Questions or Issues?**
- [GitHub Issues](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)
- [GitHub Discussions](https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions)
- [Quick Migration Cheatsheet](./QUICK_MIGRATION.md)
- [v2.5.0 Release Notes](../releases/RELEASE_NOTES_v2.5.0.md)

---

**Document Status:** Updated for v2.5.0
**Last Updated:** 2025-10-06
**Maintained By:** SimpleMCP Core Team
