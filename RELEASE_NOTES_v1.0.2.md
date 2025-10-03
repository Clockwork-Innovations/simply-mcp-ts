# Release Notes - v1.0.2

## 🐛 Critical Bug Fix

### TypeScript Type Export Error (Issue #2)

**Fixed**: TypeScript type re-export error that prevented proper module imports in decorator and functional APIs.

#### What Was Broken in v1.0.1

The `mcp/core/index.ts` file incorrectly attempted to re-export TypeScript type aliases (`ImageInput`, `AudioInput`, `BinaryInput`) as runtime values:

```typescript
// ❌ BROKEN in v1.0.1
export {
  createImageContent,
  createAudioContent,
  createBlobContent,
  ImageInput,      // ERROR: type-only export treated as value
  AudioInput,      // ERROR: type-only export treated as value
  BinaryInput,     // ERROR: type-only export treated as value
} from './content-helpers.js';
```

**Error Message**:
```
SyntaxError: The requested module './content-helpers.js' does not
provide an export named 'AudioInput'
```

#### What's Fixed in v1.0.2

Properly separated runtime function exports from type-only exports:

```typescript
// ✅ FIXED in v1.0.2
// Export runtime functions
export {
  createImageContent,
  createAudioContent,
  createBlobContent,
} from './content-helpers.js';

// Export types separately (type-only)
export type {
  ImageInput,
  AudioInput,
  BinaryInput,
} from './content-helpers.js';
```

#### Impact

**v1.0.1 Status**:
- ✅ Programmatic API - Working (uses compiled `dist/` files)
- ❌ Decorator API - Broken (uses source `mcp/` files)
- ❌ Functional API - Broken (uses source `mcp/` files)

**v1.0.2 Status**:
- ✅ Programmatic API - Working
- ✅ Type imports - Working
- ✅ All module exports - Working

## 📋 Testing

All existing tests continue to pass:

- **53 total tests** across 4 transport types
- **100% pass rate**
- Transport coverage:
  - ✅ Stdio Transport (13 tests)
  - ✅ Stateless HTTP Transport (10 tests)
  - ✅ Stateful HTTP Transport (18 tests)
  - ✅ SSE Transport (12 tests)

## 🔧 Technical Details

### Root Cause

TypeScript has two types of exports:
1. **Runtime exports** (`export { value }`): For functions, classes, constants
2. **Type-only exports** (`export type { Type }`): For TypeScript types that get erased during compilation

The bug occurred because `ImageInput`, `AudioInput`, and `BinaryInput` are defined as `export type` in `content-helpers.ts` but were being re-exported as runtime values in `index.ts`.

### Files Changed

- `mcp/core/index.ts` (lines 10-22)

### Migration Guide

**If you're upgrading from v1.0.1**:

No changes required! The fix is backward compatible. Type imports that worked before will continue to work:

```typescript
// Both of these still work:
import { SimpleMCP } from '@clockwork-innovations/simple-mcp';
import type { ImageInput } from '@clockwork-innovations/simple-mcp';
```

## 📦 What's Included

- Core framework (programmatic API)
- Decorator API (`@MCPServer`, `@tool`, `@prompt`, `@resource`)
- Functional API (`defineMCP`)
- 4 transport types (Stdio, HTTP, SSE)
- Full TypeScript type definitions
- Comprehensive test suite

## 🔗 Related

- **Fixed Issue**: [Issue #2 - Type Export Error](ISSUES-FOR-MAINTAINERS.md)
- **Previous Release**: [v1.0.1 - Zod Compatibility Fix](https://github.com/Clockwork-Innovations/simple-mcp/releases/tag/v1.0.1)
- **Repository**: https://github.com/Clockwork-Innovations/simple-mcp
- **npm Package**: https://www.npmjs.com/package/@clockwork-innovations/simple-mcp

## 📝 Changelog

### Fixed
- TypeScript type export error in `mcp/core/index.ts`
- Separated runtime function exports from type-only exports
- Module import errors when using source files directly

### Maintained
- All existing functionality from v1.0.1
- Zod v3 compatibility with MCP SDK
- 100% test coverage and pass rate

---

**Full Changelog**: https://github.com/Clockwork-Innovations/simple-mcp/compare/v1.0.1...v1.0.2
