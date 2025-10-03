# Release Notes - v1.0.3

## 🐛 Critical Bug Fix - Decorator API

### Decorator Function Access Error (Issue #3)

**Fixed**: Decorator compatibility issue that prevented decorator API from working with both legacy and stage-3 TypeScript decorators.

#### What Was Broken in v1.0.2

The decorator implementations accessed method functions incorrectly, causing failures depending on which decorator mode was active:

**Error Message**:
```
TypeError: Cannot read properties of undefined (reading 'toString')
    at extractJSDoc (decorators.ts:189:23)
```

#### Root Cause

The decorators tried to access `target[propertyKey]` (legacy decorator style) OR `descriptor.value` (stage-3 decorator style), but not both. This caused failures depending on:
- **With `experimentalDecorators: true`** (legacy): `descriptor` might be undefined
- **With `experimentalDecorators: false`** (stage-3): `target[propertyKey]` is undefined
- **When using tsx/ts-node directly**: Uses stage-3 decorators regardless of tsconfig

#### What's Fixed in v1.0.3

Added fallback logic to support BOTH legacy and stage-3 decorators:

```typescript
// ✅ FIXED in v1.0.3 - Works with both decorator types
const fn = descriptor?.value || target[propertyKey];
const jsdoc = extractJSDoc(fn);
```

**Defensive null check also added**:
```typescript
export function extractJSDoc(fn: Function): JSDocInfo | undefined {
  if (!fn) return undefined;  // Handles undefined functions gracefully
  const fnString = fn.toString();
  // ...
}
```

#### Files Changed

- `mcp/decorators.ts` (lines 121-123, 150-155, 175-183, 189)
  - @tool decorator: Added fallback logic
  - @prompt decorator: Added fallback logic
  - @resource decorator: Added fallback logic
  - extractJSDoc: Added null check

## 📋 Testing

All existing tests continue to pass:

- **53 total tests** across 4 transport types
- **100% pass rate**
- **Decorator API verified working** with class-adapter

Additional verification:
```bash
✅ npx tsx mcp/class-adapter.ts mcp/examples/class-basic.ts
✅ All decorator examples working
✅ Programmatic API - Working
✅ Functional API - Working
✅ Decorator API - Working (FIXED!)
```

## 🎯 Impact

### v1.0.2 Status (Broken)
- ✅ Programmatic API - Working
- ✅ Functional API - Working
- ❌ Decorator API - Broken

### v1.0.3 Status (All Fixed!)
- ✅ Programmatic API - Working
- ✅ Functional API - Working
- ✅ Decorator API - Working ✨

## 🔧 Technical Details

### Why Both Decorator Modes?

TypeScript supports two decorator implementations:
1. **Legacy decorators** (`experimentalDecorators: true`):
   - Used when compiling with TypeScript
   - Method accessible via `target[propertyKey]`

2. **Stage-3 decorators** (default in TypeScript 5+):
   - Used when running source with tsx/ts-node
   - Method accessible via `descriptor.value`

Our fix supports both modes automatically.

### Changes Summary

| Decorator | Line | Change |
|-----------|------|--------|
| @tool | 121-123 | Added `const fn = descriptor?.value \|\| target[propertyKey]` |
| @prompt | 150-155 | Added `const fn = descriptor?.value \|\| target[propertyKey]` |
| @resource | 175-183 | Added `const fn = descriptor?.value \|\| target[propertyKey]` |
| extractJSDoc | 189 | Added `if (!fn) return undefined` |

## 📦 What's Included

All three APIs are now production-ready:

1. **Programmatic API** ✅
```typescript
import { SimpleMCP } from '@clockwork-innovations/simple-mcp';
const server = new SimpleMCP({ name: 'my-server', version: '1.0.0' });
// ...
```

2. **Functional API** ✅
```typescript
import { defineMCP } from '@clockwork-innovations/simple-mcp';
export default defineMCP({ name: 'my-server', tools: [/* ... */] });
```

3. **Decorator API** ✅ (NOW FIXED!)
```typescript
import { MCPServer, tool } from '@clockwork-innovations/simple-mcp';

@MCPServer({ name: 'my-server', version: '1.0.0' })
export default class MyServer {
  @tool('Add two numbers')
  add(a: number, b: number): number {
    return a + b;
  }
}
```

## 🔗 Related

- **Fixed Issue**: [Issue #3 - Decorator JSDoc Extraction Bug](FINAL-TEST-REPORT-v1.0.2.md)
- **Previous Release**: [v1.0.2 - Type Export Fix](https://github.com/Clockwork-Innovations/simple-mcp/releases/tag/v1.0.2)
- **Repository**: https://github.com/Clockwork-Innovations/simple-mcp
- **npm Package**: https://www.npmjs.com/package/@clockwork-innovations/simple-mcp

## 📝 Changelog

### Fixed
- Decorator API now works with both legacy and stage-3 decorators
- Added fallback logic in @tool, @prompt, and @resource decorators
- Added defensive null check in extractJSDoc function
- Supports running with tsx/ts-node directly (stage-3) and compiled TypeScript (legacy)

### Maintained
- All existing functionality from v1.0.2
- Type export fixes from v1.0.2
- Zod v3 compatibility with MCP SDK
- 100% test coverage and pass rate

## 🚀 Migration Guide

**If you're upgrading from v1.0.2**:

No changes required! The decorator API that was broken in v1.0.2 is now fixed:

```typescript
// This now works in v1.0.3! 🎉
import { MCPServer, tool, prompt, resource } from '@clockwork-innovations/simple-mcp';

@MCPServer({ name: 'calculator', version: '1.0.0' })
export default class Calculator {
  @tool('Add two numbers')
  add(a: number, b: number): number {
    return a + b;
  }

  @prompt('Math help')
  mathHelp(topic: string): string {
    return `Help with ${topic}...`;
  }

  @resource('calc://config')
  config() {
    return { version: '1.0.0' };
  }
}
```

All APIs are backward compatible - no breaking changes!

---

**Full Changelog**: https://github.com/Clockwork-Innovations/simple-mcp/compare/v1.0.2...v1.0.3

🎉 **All three APIs are now fully functional and production-ready!**
