# Quick Migration Cheatsheet

**One-page reference for migrating from v2.4.x to v2.5.0 and beyond**

---

## v2.4.7 → v2.5.0 (Backward Compatible)

### What Changed
- ✅ Unified imports available (subpaths still work)
- ✅ Better error messages
- ✅ Decorator parameter validation
- ⚠️ Subpath imports deprecated (removal in v4.0.0)

### Action Required
**NONE** - Everything still works!

**Recommended:** Update imports for better DX

---

## Quick Update Steps

### 1. Install v2.5.0
```bash
npm install simply-mcp@2.5.0
```

### 2. Update Imports (Recommended)

**Before (v2.4.x):**
```typescript
import { MCPServer, tool, prompt, resource } from 'simply-mcp/decorators';
import { defineConfig, type CLIConfig } from 'simply-mcp/config';
```

**After (v2.5.0):**
```typescript
import { MCPServer, tool, prompt, resource, defineConfig, type CLIConfig } from 'simply-mcp';
```

### 3. Find & Replace

**Using grep:**
```bash
grep -r "from 'simply-mcp/decorators'" src/
grep -r "from 'simply-mcp/config'" src/
```

**Find/Replace in editor:**
- Find: `from 'simply-mcp/decorators'` → Replace: `from 'simply-mcp'`
- Find: `from 'simply-mcp/config'` → Replace: `from 'simply-mcp'`

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
// v2.5.0+ (No changes needed)
import { SimplyMCP } from 'simply-mcp';
import { z } from 'zod';

const server = new SimplyMCP({ name: 'my-server' });
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
// v2.5.0+ (Everything from one place)
import {
  MCPServer,
  tool,
  prompt,
  resource,
  SimplyMCP,
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

## v2.x → v3.0.0 (Breaking Changes - Future)

### What Will Break

#### Subpath Imports (Removed in v3.0.0)

**Breaks:**
```typescript
import { tool } from 'simply-mcp/decorators'; // ❌ Error in v3.0.0
```

**Fix:**
```typescript
import { tool } from 'simply-mcp'; // ✅ Works in v3.0.0
```

**If you migrate to v2.5.0 now, you're already ready for v3.0.0!**

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

### IDE deprecation warnings
```
'simply-mcp/decorators' is deprecated
```
**Fix:** Update imports to `'simply-mcp'` and restart IDE

---

## Timeline

| Version | Date | Status | Breaking Changes |
|---------|------|--------|------------------|
| v2.4.7 | 2025-10-06 | Released | None |
| **v2.5.0** | **TBD** | **Current** | **None** |
| v2.x | Ongoing | Supported | None |
| v3.0.0-beta | TBD | Planned | Yes (beta testing) |
| v3.0.0 | TBD (3-6 months) | Planned | Yes (see below) |
| v4.0.0 | TBD | Future | Yes (removes subpaths) |

### v3.0.0 Breaking Changes (Planned)
1. ❌ Subpath imports removed
2. ✅ Object decorator syntax supported
3. ⚠️ Possible class rename (`SimplyMCP` → `MCPServer`)
4. ⚠️ Node.js 20+ required

---

## Migration Checklist

### v2.5.0 Migration (Do This Now)
- [ ] Update to v2.5.0: `npm install simply-mcp@2.5.0`
- [ ] Find old imports: `grep -r "from 'simply-mcp/" src/`
- [ ] Replace with unified imports
- [ ] Build: `npm run build`
- [ ] Test: `npm test`
- [ ] Verify: `npx simplymcp run server.ts --dry-run`

### v3.0.0 Preparation (When Available)
- [ ] Already done if you migrated to v2.5.0!
- [ ] Test with v3.0.0-beta
- [ ] Run migration tool: `npx simply-mcp migrate v2-to-v3`
- [ ] Update to v3.0.0

---

## Command Reference

### Package Management
```bash
# Update to v2.5.0
npm install simply-mcp@2.5.0

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

| What | v2.4.x (Old) | v2.5.0+ (New) |
|------|--------------|---------------|
| **Decorators** | `'simply-mcp/decorators'` | `'simply-mcp'` |
| **Config** | `'simply-mcp/config'` | `'simply-mcp'` |
| **Main** | `'simply-mcp'` | `'simply-mcp'` |

### Decorator Syntax

| Syntax | v2.x | v3.0.0 |
|--------|------|--------|
| **String** | ✅ `@tool('Description')` | ✅ `@tool('Description')` |
| **Empty** | ✅ `@tool()` | ✅ `@tool()` |
| **Object** | ❌ Error | ✅ `@tool({ ... })` |

### Migration Status

| Task | v2.5.0 | v3.0.0 |
|------|--------|--------|
| **Update imports** | ✅ Recommended | ✅ Required |
| **String decorators** | ✅ Works | ✅ Works |
| **Object decorators** | ❌ Error | ✅ Works |
| **Subpath imports** | ⚠️ Deprecated | ❌ Removed |

---

**Last Updated:** 2025-10-06
**Version:** v2.5.0
**Print this page for quick reference!**
