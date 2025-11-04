# Simply MCP Examples

Examples demonstrating the Simply MCP Interface-Driven API.

## Running Examples

```bash
# Run an example server
npx simply-mcp run interface-minimal.ts

# Validate configuration (recommended)
npx simply-mcp run interface-minimal.ts --dry-run

# Watch mode (auto-restart on changes)
npx simply-mcp run interface-minimal.ts --watch
```

## TypeScript Validation

Simply MCP uses **AST parsing** to extract metadata from TypeScript interfaces at compile-time. The framework reads your interface definitions directly from source code, not through the TypeScript type system.

### How Validation Works

**✅ Correct validation method:**
```bash
npx simply-mcp run your-server.ts --dry-run
```

The `--dry-run` flag validates:
- All tools/prompts/resources are properly defined
- Parameters use IParam interfaces correctly
- Implementation methods match interface definitions
- No naming conflicts or missing implementations

**❌ TypeScript type checking:**
```bash
tsc --noEmit examples/interface-minimal.ts
```

This will show structural type warnings because:
- Interfaces define metadata (name, description, params, result)
- Implementations are callable functions
- TypeScript sees type mismatch (expected)

These warnings are **normal and expected**. The framework works correctly at runtime because it uses AST parsing, not TypeScript's type system.

### Example: Why TypeScript Shows Warnings

TypeScript warnings occur because:
- Interfaces define metadata structure (name, description, params, result)
- Implementations are callable functions (not objects with those properties)
- This is EXPECTED - the framework reads metadata from interfaces via AST parsing

The code works correctly at runtime. Use `--dry-run` for validation, not `tsc`.

## Why This Design?

The Interface API prioritizes **developer experience**:
- ✅ Zero boilerplate - just write TypeScript interfaces
- ✅ Full IntelliSense and autocomplete
- ✅ Type-safe parameters and return values
- ✅ Automatic schema generation
- ✅ Single source of truth in interfaces

The trade-off: TypeScript structural type checking shows warnings that can be safely ignored. Use `--dry-run` for actual validation.

## Parameter Requirements

**All tool parameters MUST use IParam interfaces:**

```typescript
// ✅ CORRECT - Using IParam
interface NameParam extends IParam {
  type: 'string';
  description: 'Person name';
}

interface GreetTool extends ITool {
  params: {
    name: NameParam;
  };
  result: string;
}
```

```typescript
// ❌ INCORRECT - Inline types not supported
interface GreetTool extends ITool {
  params: {
    name: string;  // Will fail --dry-run validation
  };
  result: string;
}
```

## Questions?

See [docs/guides/QUICK_START.md](../docs/guides/QUICK_START.md) for complete documentation.
