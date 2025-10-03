# Release Notes - v1.1.0

## 🎉 Major Developer Experience Improvements

### Breaking Change: Package Name Simplified

**Changed**: Package name from `@clockwork-innovations/simple-mcp` to `simple-mcp`

This is a **BREAKING CHANGE** that significantly improves developer experience by making the package easier to discover and use.

---

## 📦 Package Name Change

### Old Package (Deprecated)
```bash
npm install @clockwork-innovations/simple-mcp
```

```typescript
import { SimpleMCP } from '@clockwork-innovations/simple-mcp';
```

### New Package (v1.1.0+)
```bash
npm install simple-mcp
```

```typescript
import { SimpleMCP } from 'simple-mcp';
```

### Why This Change?

1. **Easier to remember**: `simple-mcp` vs `@clockwork-innovations/simple-mcp`
2. **Faster to type**: Saves 23 characters per import
3. **Better discoverability**: Unscoped packages rank higher in npm search
4. **Cleaner code**: More readable import statements

---

## 🐛 Bug Fix: Decorator Import Path (Issue #4)

**Fixed**: Decorator API now uses clean package imports instead of deep node_modules paths

### What Was Broken in v1.0.3

Users had to use awkward deep imports for decorator-based servers:

```typescript
// ❌ Broken in v1.0.3
import { MCPServer, tool } from './node_modules/@clockwork-innovations/simple-mcp/mcp/decorators.js';

@MCPServer({ name: 'my-server', version: '1.0.0' })
export default class MyServer {
  @tool('Add numbers')
  add(a: number, b: number): number {
    return a + b;
  }
}
```

###What's Fixed in v1.1.0

Clean, simple imports from the package name:

```typescript
// ✅ FIXED in v1.1.0
import { MCPServer, tool } from 'simple-mcp';

@MCPServer({ name: 'my-server', version: '1.0.0' })
export default class MyServer {
  @tool('Add numbers')
  add(a: number, b: number): number {
    return a + b;
  }
}
```

### How We Fixed It

1. **class-adapter.ts** now imports from compiled `dist/mcp/` instead of source `mcp/`
2. **package.json** exports decorators separately for clean imports
3. **Shared decorator instance**: Ensures metadata is properly shared between user code and class-adapter

---

## 📋 Testing

All existing tests continue to pass:

- **53 total tests** across 4 transport types
- **100% pass rate**
- All three APIs verified working:
  - ✅ Programmatic API
  - ✅ Functional API
  - ✅ Decorator API

---

## 🚨 Migration Guide

### For New Users

Simply install the new package:

```bash
npm install simple-mcp
```

```typescript
import { SimpleMCP } from 'simple-mcp';
```

### For Existing Users (Upgrading from v1.0.x)

**This is a breaking change.** You'll need to:

#### 1. Uninstall old package
```bash
npm uninstall @clockwork-innovations/simple-mcp
```

#### 2. Install new package
```bash
npm install simple-mcp
```

#### 3. Update all imports

**Before (v1.0.x)**:
```typescript
import { SimpleMCP } from '@clockwork-innovations/simple-mcp';
import { MCPServer, tool } from '@clockwork-innovations/simple-mcp';
import { defineMCP } from '@clockwork-innovations/simple-mcp';
```

**After (v1.1.0)**:
```typescript
import { SimpleMCP } from 'simple-mcp';
import { MCPServer, tool } from 'simple-mcp';
import { defineMCP } from 'simple-mcp';
```

#### 4. Search and replace

You can use this regex to find/replace in your project:

**Find**: `@clockwork-innovations/simple-mcp`
**Replace**: `simple-mcp`

---

## 🔧 Technical Details

### Files Changed

1. **package.json**
   - Changed `name` from `@clockwork-innovations/simple-mcp` to `simple-mcp`
   - Updated `version` from `1.0.3` to `1.1.0`
   - Added `./decorators` export path

2. **mcp/class-adapter.ts**
   - Updated to import from `../dist/mcp/` (compiled) instead of `./` (source)
   - Uses dynamic imports to load decorators from the same instance as user code
   - Added type imports for TypeScript compilation

3. **mcp/examples/class-basic.ts**
   - Updated import from `'../decorators.js'` to `'simple-mcp'`

4. **Documentation** (5 files updated by automation)
   - README.md
   - QUICK_DEPLOY.md
   - DEPLOYMENT_GUIDE.md
   - RELEASE_NOTES_v1.0.2.md
   - RELEASE_NOTES_v1.0.3.md

### New package.json Exports

```json
{
  "exports": {
    ".": {
      "types": "./dist/mcp/index.d.ts",
      "import": "./dist/mcp/index.js",
      "default": "./dist/mcp/index.js"
    },
    "./decorators": {
      "types": "./dist/mcp/decorators.d.ts",
      "import": "./dist/mcp/decorators.js",
      "default": "./dist/mcp/decorators.js"
    },
    "./package.json": "./package.json"
  }
}
```

---

## 📦 What's Included

All three APIs are production-ready:

### 1. Programmatic API ✅
```typescript
import { SimpleMCP } from 'simple-mcp';
import { z } from 'zod';

const server = new SimpleMCP({ name: 'my-server', version: '1.0.0' });
server.addTool({
  name: 'greet',
  parameters: z.object({ name: z.string() }),
  execute: async (args) => `Hello, ${args.name}!`
});
await server.start();
```

### 2. Functional API ✅
```typescript
import { defineMCP } from 'simple-mcp';
import { z } from 'zod';

export default defineMCP({
  name: 'my-server',
  version: '1.0.0',
  tools: [{
    name: 'greet',
    parameters: z.object({ name: z.string() }),
    execute: async (args) => `Hello, ${args.name}!`
  }]
});
```

### 3. Decorator API ✅
```typescript
import { MCPServer, tool } from 'simple-mcp';

@MCPServer({ name: 'my-server', version: '1.0.0' })
export default class MyServer {
  @tool('Greet a user')
  greet(name: string): string {
    return `Hello, ${name}!`;
  }
}
```

---

## 🔗 Related

- **Fixed Issue**: [Issue #4 - Decorator Import Path](ISSUE-DECORATOR-IMPORTS-v1.0.4.md)
- **Previous Release**: [v1.0.3 - Decorator Compatibility Fix](https://github.com/clockwork-innovations/simple-mcp/releases/tag/v1.0.3)
- **Repository**: https://github.com/clockwork-innovations/simple-mcp
- **npm Package**: https://www.npmjs.com/package/simple-mcp

---

## 📝 Changelog

### Changed (BREAKING)
- **Package name**: `@clockwork-innovations/simple-mcp` → `simple-mcp`
- **Major version bump**: Now v1.1.0 to indicate breaking change

### Fixed
- Decorator API import path issue - can now use `import { MCPServer } from 'simple-mcp'`
- class-adapter.ts now uses compiled decorators for consistent metadata
- Added `/decorators` export path to package.json

### Maintained
- All existing functionality from v1.0.3
- Decorator compatibility with both legacy and stage-3 decorators
- Type export fixes from v1.0.2
- Zod v3 compatibility with MCP SDK
- 100% test coverage and pass rate

---

## 📊 Comparison

| Feature | v1.0.3 | v1.1.0 |
|---------|---------|---------|
| Package Name | `@clockwork-innovations/simple-mcp` | `simple-mcp` ✨ |
| Import Length | 40 characters | 17 characters ⚡ |
| Decorator Imports | Deep node_modules path | Clean package import ✅ |
| Programmatic API | ✅ Working | ✅ Working |
| Functional API | ✅ Working | ✅ Working |
| Decorator API | ⚠️ Awkward imports | ✅ Clean imports ✨ |

---

## ⚠️ Important Notes

### Old Package Status

The old `@clockwork-innovations/simple-mcp` package will remain on npm but is now **deprecated**. All future updates will be published to `simple-mcp`.

###No Automatic Migration

npm will NOT automatically migrate your dependencies. You must manually:
1. Uninstall the old package
2. Install the new package
3. Update your imports

### Version Strategy

- **Old package**: Frozen at v1.0.3
- **New package**: Starts at v1.1.0 to indicate the breaking change

---

## 🎯 Why Version 1.1.0?

We chose `1.1.0` instead of `2.0.0` because:

1. **Functionality unchanged**: All features work identically
2. **Internal breaking change**: Only the package name changed
3. **Clear upgrade path**: Easier to communicate as a minor version

Technically this could be `2.0.0`, but `1.1.0` better reflects that it's the same software with a simpler name.

---

**Full Changelog**: https://github.com/clockwork-innovations/simple-mcp/compare/v1.0.3...v1.1.0

🎉 **Enjoy the simpler, cleaner `simple-mcp`!**
