# Quick Migration Cheatsheet

**One-page reference for migrating from v2.4.x to v2.5.0 and beyond**

---

## v2.x → v3.0.0 (Breaking Changes)

### What Changed
- ✅ Unified imports now required
- ✅ Better error messages
- ✅ Decorator parameter validation
- ❌ Subpath imports removed (breaking change)

### Action Required
**YES** - Update all imports to use the main package entry point

---

## Quick Update Steps

### 1. Install v3.0.0
```bash
npm install simply-mcp@3.0.0
```

### 2. Update Imports (Required)

**Before (v2.x - no longer supported):**
```typescript
import { MCPServer, tool, prompt, resource } from 'simply-mcp/decorators';
import { defineConfig, type CLIConfig } from 'simply-mcp/config';
```

**After (v3.0.0 - required):**
```typescript
import { MCPServer, tool, prompt, resource, defineConfig, type CLIConfig } from 'simply-mcp';
```

### 3. Find & Replace (Critical)

**Using grep to find old imports:**
```bash
grep -r "from 'simply-mcp/decorators'" src/
grep -r "from 'simply-mcp/config'" src/
```

**Find/Replace in editor (required):**
- Find: `from 'simply-mcp/decorators'` → Replace: `from 'simply-mcp'`
- Find: `from 'simply-mcp/config'` → Replace: `from 'simply-mcp'`

**Note:** These old import patterns will cause errors in v3.0.0. All imports must come from the main package.

### 4. Verify
```bash
npm run build
npm test
npx simplymcp run server.ts --dry-run
```

---

## Common Patterns

### Pattern 1: Decorator Server

```typescript
// v2.5.0+ (Recommended)
import { MCPServer, tool } from 'simply-mcp';

@MCPServer({ name: 'my-server', version: '1.0.0' })
export default class MyServer {
  @tool('Greet user')
  greet(name: string) {
    return `Hello, ${name}!`;
  }
}
```

### Pattern 2: Programmatic API

```typescript
// v3.0.0+
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({ name: 'my-server' });
server.addTool({
  name: 'greet',
  description: 'Greet user',
  parameters: z.object({ name: z.string() }),
  execute: async (args) => `Hello, ${args.name}!`
});
```

### Pattern 3: Configuration

```typescript
// v2.5.0+ (Single import)
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

### Pattern 4: Mixed Imports

```typescript
// v3.0.0+ (Everything from one place)
import {
  MCPServer,
  tool,
  prompt,
  resource,
  BuildMCPServer,
  defineMCP,
  defineConfig,
  type CLIConfig,
  type ServerConfig
} from 'simply-mcp';
```

---

## Decorator Usage (Current vs Future)

### v2.5.0 (Current)

**String parameters only:**
```typescript
@tool('Add two numbers')
add(a: number, b: number) { return a + b; }

// Or use JSDoc
/**
 * Add two numbers
 */
@tool()
add(a: number, b: number) { return a + b; }
```

**Object syntax throws error:**
```typescript
@tool({ description: 'Add numbers' }) // ❌ TypeError in v2.x
```

### v3.0.0 (Future)

**Both will work:**
```typescript
// String (still works)
@tool('Add two numbers')
add(a: number, b: number) { return a + b; }

// Object (new in v3.0.0)
@tool({
  description: 'Add two numbers',
  timeout: 5000,
  retries: 3
})
add(a: number, b: number) { return a + b; }
```

---

## Subpath Imports Removed (Breaking Change in v3.0.0)

### What Breaks

#### Subpath Imports No Longer Supported

**Breaks (causes import errors):**
```typescript
import { tool } from 'simply-mcp/decorators'; // ❌ Error in v3.0.0
import { defineConfig } from 'simply-mcp/config'; // ❌ Error in v3.0.0
```

**Fix (required):**
```typescript
import { tool, defineConfig } from 'simply-mcp'; // ✅ Required in v3.0.0
```

**Migration Impact:** All code using old subpath imports must be updated before upgrading to v3.0.0.

---

## Error Messages (Improved in v2.5.0)

### Before (v2.4.x)
```
Error loading config file
```

### After (v2.5.0)
```
Error: No MCP server class found in: server.ts

Expected:
  - A class decorated with @MCPServer
  - Exported as default: export default class MyServer { }

Example:
  import { MCPServer } from 'simply-mcp';

  @MCPServer()
  export default class MyServer { }

See: https://github.com/Clockwork-Innovations/simply-mcp-ts#decorator-api
```

---

## Troubleshooting

### Import errors
```
Module '"simply-mcp"' has no exported member 'tool'
```
**Fix:** Ensure v2.5.0+ installed: `npm list simply-mcp`

### Decorator object syntax error
```
TypeError: @tool decorator expects a string description, got object
```
**Fix:** Use string syntax in v2.x:
```typescript
@tool('Description') // ✅ Works
@tool({ description: 'Description' }) // ❌ Not until v3.0.0
```

### Module not found errors
```
Cannot find module 'simply-mcp/decorators'
Cannot find module 'simply-mcp/config'
```
**Fix:** These subpath exports are removed in v3. Update all imports to `'simply-mcp'` and restart IDE

---

## Timeline

| Version | Date | Status | Breaking Changes |
|---------|------|--------|------------------|
| v2.4.7 | 2025-10-06 | Released | None |
| v2.5.0 | 2025-10-10 | Released | None |
| v2.x | Ongoing | Maintenance | None |
| **v3.0.0** | **2025-10-13** | **Current** | **Yes (see below)** |

### v3.0.0 Breaking Changes
1. ❌ Subpath imports removed (`simply-mcp/decorators` and `simply-mcp/config` no longer work)
2. ❌ SSE transport removed (use HTTP stateful mode)
3. ❌ Legacy adapter files removed

---

## Migration Checklist

### v3.0.0 Migration (Required)
- [ ] Backup your project (`git commit` or create a branch)
- [ ] Update to v3.0.0: `npm install simply-mcp@3.0.0`
- [ ] Find all old imports: `grep -r "from 'simply-mcp/" src/`
- [ ] Replace decorator imports: `'simply-mcp/decorators'` → `'simply-mcp'`
- [ ] Replace config imports: `'simply-mcp/config'` → `'simply-mcp'`
- [ ] Build: `npm run build`
- [ ] Test: `npm test`
- [ ] Verify: `npx simplymcp run server.ts --dry-run`
- [ ] Update documentation

---

## Command Reference

### Package Management
```bash
# Update to v3.0.0
npm install simply-mcp@3.0.0

# Check installed version
npm list simply-mcp

# Clean install
rm -rf node_modules && npm install
```

### Finding Old Patterns
```bash
# Find decorator imports
grep -r "from 'simply-mcp/decorators'" src/

# Find config imports
grep -r "from 'simply-mcp/config'" src/

# Find all subpath imports
grep -r "from 'simply-mcp/" src/
```

### Validation
```bash
# Build project
npm run build

# Run tests
npm test

# Dry-run server
npx simplymcp run server.ts --dry-run

# List config servers
npx simplymcp config list
```

---

## Benefits of Migrating

### Better IDE Experience
- ✅ Improved autocomplete
- ✅ Better type hints
- ✅ Clearer deprecation warnings
- ✅ Faster IntelliSense

### Simpler Imports
- ✅ Everything from one place
- ✅ Fewer import statements
- ✅ Easier to remember
- ✅ Aligned with modern frameworks

### Better Errors
- ✅ Clear error messages
- ✅ Actionable guidance
- ✅ Examples included
- ✅ Links to documentation

### Future-Proof
- ✅ Ready for v3.0.0
- ✅ Using latest patterns
- ✅ Community best practices
- ✅ Long-term support

---

## Need More Information?

### Documentation
- [Full Migration Guide](./v2-to-v3-migration.md) - Detailed step-by-step guide
- [v2.5.0 Release Notes](../releases/RELEASE_NOTES_v2.5.0.md) - Complete changelog
- [Import Style Guide](../development/IMPORT_STYLE_GUIDE.md) - Import pattern reference

### Examples
- [/examples](../../examples/) - Updated working examples
- [Quick Start](../../src/docs/QUICK-START.md) - Get started fast
- [Decorator API](../development/DECORATOR-API.md) - Full API reference

### Support
- [GitHub Issues](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues) - Report problems
- [Discussions](https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions) - Ask questions
- [Changelog](../releases/CHANGELOG.md) - All changes

---

## Quick Reference Card

### Import Patterns

| What | v2.x (Old - Removed) | v3.0.0 (Current - Required) |
|------|---------------------|----------------------------|
| **Decorators** | `'simply-mcp/decorators'` ❌ | `'simply-mcp'` ✅ |
| **Config** | `'simply-mcp/config'` ❌ | `'simply-mcp'` ✅ |
| **Main** | `'simply-mcp'` ✅ | `'simply-mcp'` ✅ |

### Decorator Syntax

| Syntax | v2.x | v3.0.0 |
|--------|------|--------|
| **String** | ✅ `@tool('Description')` | ✅ `@tool('Description')` |
| **Empty** | ✅ `@tool()` | ✅ `@tool()` |
| **Object** | ❌ Error | ✅ `@tool({ ... })` |

### Migration Status

| Task | v2.x | v3.0.0 |
|------|------|--------|
| **Update imports** | ⚠️ Optional | ✅ Required |
| **String decorators** | ✅ Works | ✅ Works |
| **Subpath imports** | ✅ Works | ❌ Removed |

---

**Last Updated:** 2025-10-06
**Version:** v2.5.0
**Print this page for quick reference!**
