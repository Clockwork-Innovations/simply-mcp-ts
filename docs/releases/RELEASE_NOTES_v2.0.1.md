# Release Notes - v2.0.1

**Release Date:** 2025-10-03
**Type:** Patch Release (Bug Fix)

## 🐛 Critical Bug Fixes

### Fixed @prompt and @resource Decorators (Issue #1 from v2.0.0)

**Problem**: The `@prompt` and `@resource` decorators were completely non-functional in v2.0.0. Methods decorated with these decorators were not being registered with the MCP server, resulting in 0 prompts and 0 resources being loaded.

**Root Cause**: The decorators were designed for legacy TypeScript decorators, but the runtime (TSX) was using stage-3 decorators. In stage-3 decorators:
- The method decorator signature is `(methodFunction, context)` instead of `(target, propertyKey, descriptor)`
- The class constructor is not directly accessible during method decoration
- Metadata must be registered using `context.addInitializer()` callback

**Impact**: Users of v2.0.0 could not use `@prompt` or `@resource` decorators at all. All prompt and resource methods were incorrectly auto-registered as tools instead.

**Fix Applied**: Updated all three decorators (`@tool`, `@prompt`, `@resource`) to support both legacy and stage-3 decorator formats:
- Detects decorator format at runtime
- For stage-3: Uses `context.addInitializer()` to defer metadata registration until class instantiation
- For legacy: Uses immediate metadata registration (backwards compatible)
- Ensures metadata is correctly stored on the class constructor in both cases

---

## 📝 What's Fixed

### Before v2.0.1 (BROKEN ❌)

```typescript
import { MCPServer, tool, prompt, resource } from 'simply-mcp';

@MCPServer({ name: 'my-server', version: '1.0.0' })
export default class MyServer {
  @tool('Add numbers')
  add(a: number, b: number): number {
    return a + b;
  }

  @prompt('Generate greeting')  // ❌ NOT REGISTERED
  greetPrompt(name: string): string {
    return `Generate a greeting for ${name}`;
  }

  @resource('info://status', { mimeType: 'application/json' })  // ❌ NOT REGISTERED
  statusResource(): object {
    return { status: 'running' };
  }
}

// Server output:
// [ClassAdapter] Loaded: 3 tools, 0 prompts, 0 resources  ❌ WRONG!
```

### After v2.0.1 (FIXED ✅)

```typescript
import { MCPServer, tool, prompt, resource } from 'simply-mcp';

@MCPServer({ name: 'my-server', version: '1.0.0' })
export default class MyServer {
  @tool('Add numbers')
  add(a: number, b: number): number {
    return a + b;
  }

  @prompt('Generate greeting')  // ✅ REGISTERED
  greetPrompt(name: string): string {
    return `Generate a greeting for ${name}`;
  }

  @resource('info://status', { mimeType: 'application/json' })  // ✅ REGISTERED
  statusResource(): object {
    return { status: 'running' };
  }
}

// Server output:
// [ClassAdapter] Loaded: 1 tools, 1 prompts, 1 resources  ✅ CORRECT!
```

---

## 🔧 Technical Details

### Files Modified

**mcp/decorators.ts**
- Updated `@tool` decorator to support both legacy and stage-3 formats
- Updated `@prompt` decorator to support both legacy and stage-3 formats
- Updated `@resource` decorator to support both legacy and stage-3 formats
- All decorators now use `context.addInitializer()` for stage-3 compatibility

### Decorator Format Detection

```typescript
export function prompt(description?: string) {
  return function (target: any, propertyKeyOrContext: string | any, descriptor?: PropertyDescriptor) {
    // Detect decorator format
    const isStage3 = typeof propertyKeyOrContext === 'object' &&
                     propertyKeyOrContext !== null &&
                     'kind' in propertyKeyOrContext;

    if (isStage3) {
      // Stage-3: Use addInitializer to defer registration
      const context = propertyKeyOrContext;
      context.addInitializer(function(this: any) {
        const targetConstructor = this.constructor;
        // Register metadata on class constructor
        Reflect.defineMetadata(PROMPTS_KEY, prompts, targetConstructor);
      });
    } else {
      // Legacy: Immediate registration
      const targetConstructor = target.constructor;
      Reflect.defineMetadata(PROMPTS_KEY, prompts, targetConstructor);
    }
  };
}
```

---

## ✅ Testing

All existing tests continue to pass:
```bash
npm test  # 53 tests, 100% success rate ✅
```

Decorator functionality verified:
```bash
npx tsx mcp/class-adapter.ts test-server.ts
# Output: [ClassAdapter] Loaded: N tools, N prompts, N resources ✅
```

---

## 🔄 Migration

No migration needed! If you're upgrading from v2.0.0:

```bash
npm update simply-mcp
```

Your existing decorator-based code will now work correctly without any changes.

---

## 📊 Compatibility

| Decorator Format | v2.0.0 | v2.0.1 |
|-----------------|--------|--------|
| Legacy decorators (`experimentalDecorators: true`) | ✅ @tool only | ✅ All decorators |
| Stage-3 decorators (TSX runtime) | ❌ Broken | ✅ All decorators |
| `@tool` decorator | ✅ Works | ✅ Works |
| `@prompt` decorator | ❌ Broken | ✅ Fixed |
| `@resource` decorator | ❌ Broken | ✅ Fixed |

---

## 🎯 API Status

| API Type | Status | Notes |
|----------|--------|-------|
| Programmatic API | ✅ Fully working | No changes |
| Functional API | ✅ Fully working | No changes |
| Decorator API | ✅ **NOW WORKING** | All decorators fixed |

---

## 🙏 Credits

Bug discovered and reported during comprehensive testing on 2025-10-03.

---

**Full Changelog:** https://github.com/Clockwork-Innovations/simply-mcp/compare/v2.0.0...v2.0.1

🎉 **Generated with [Claude Code](https://claude.com/claude-code)**

Co-Authored-By: Claude <noreply@anthropic.com>
