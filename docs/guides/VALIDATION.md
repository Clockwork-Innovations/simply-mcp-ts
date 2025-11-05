# Validation Guide

Simply MCP performs validation checks during dry-run to catch common mistakes before runtime. This guide explains the validation rules, error messages, and how to fix validation errors.

## Overview

Validation happens automatically when you run `simply-mcp run <file> --dry-run`. The dry-run process:

1. Parses your TypeScript interface definitions
2. Validates parameter definitions follow supported patterns
3. Generates JSON-RPC schemas
4. Reports any errors with actionable fix instructions

**If validation fails, the dry-run exits with error code 1 and displays detailed error messages.**

## Validation Behavior: Dry-Run vs Run Mode

Simply MCP validation behaves differently depending on how you run the server:

### Dry-Run Mode (`--dry-run`)
**Strict validation** - Validation errors cause immediate failure:
- Parses and validates all interface definitions
- Exits with error code 1 if any validation errors are found
- **Does NOT start the server** if validation fails
- Use this in CI/CD pipelines to catch errors early

```bash
npx simply-mcp run server.ts --dry-run
# Exit code 1 if validation fails
# Exit code 0 if validation passes
```

### Run Mode (default)
**Lenient validation** - Validation errors are logged as warnings:
- Parses and validates all interface definitions
- **Logs errors to console** but continues server startup
- Invalid tools/prompts/resources are **skipped** (not registered)
- Valid tools/prompts/resources still work normally
- Server continues running with partial functionality

```bash
npx simply-mcp run server.ts
# Server starts even with validation errors
# Invalid tools are skipped but logged
```

**Why the difference?**
- **Development workflow**: You can iteratively fix errors while the server runs
- **Graceful degradation**: One broken tool doesn't break the entire server
- **Clear errors**: Console logs make it obvious what needs fixing
- **CI/CD enforcement**: Use `--dry-run` in CI to enforce validation

**Best Practice:**
1. Develop with `run` mode for fast iteration
2. Fix validation errors as they appear in console
3. Use `--dry-run` in CI/CD to enforce clean validation

## Why Validation Matters

Simply MCP promises full type safety and automatic type coercion. To deliver on this promise, the framework needs to:

- **Parse TypeScript types accurately** - Only certain patterns are supported by the schema generator
- **Apply type coercion correctly** - JSON-RPC sends everything as strings; numbers/booleans must be coerced
- **Catch errors early** - Better to fail at dry-run than silently fail at runtime

Without validation, you might write code that compiles but doesn't work at runtime.

## Type Coercion Behavior

Simply MCP automatically coerces parameter types from JSON-RPC strings:

- **Number parameters**: `"42"` → `42` (using Zod's `z.coerce.number()`)
- **Boolean parameters**: `"true"` → `true` (using Zod's `z.coerce.boolean()`)
- **String parameters**: No coercion needed

This ensures arithmetic and boolean operations work correctly:

```typescript
// Without coercion (BROKEN):
const result = params.a + params.b;  // "42" + "58" = "4258" (string concatenation)

// With coercion (CORRECT):
const result = params.a + params.b;  // 42 + 58 = 100 (arithmetic)
```

## Validation Rules

### Rule 1: No Inline IParam Intersections

**Status:** CRITICAL ERROR - Dry-run will fail

The most important validation rule: **Do NOT use inline intersection types with `& IParam`**.

#### ❌ Incorrect Pattern (Will Fail Validation)

```typescript
import type { ITool, IParam } from 'simply-mcp';

interface MyTool extends ITool {
  name: 'my_tool';
  description: 'Example tool';
  params: {
    // ❌ BROKEN: Inline intersection with IParam
    count: { type: 'number'; description: 'Item count' } & IParam;
  };
  result: { total: number };
}
```

**Why this fails:**
- The schema generator does NOT support TypeScript intersection types (`& IParam`)
- Type coercion will not be applied
- Number/boolean parameters will be received as STRINGS
- Arithmetic operations will fail silently (e.g., `42 + 58 = "4258"`)
- This is a known framework limitation

#### ✅ Correct Pattern (Passes Validation)

```typescript
import type { ITool, IParam } from 'simply-mcp';

// ✅ CORRECT: Separate interface extending IParam
interface CountParam extends IParam {
  type: 'number';
  description: 'Item count';
  min: 0;
  max: 1000;
}

interface MyTool extends ITool {
  name: 'my_tool';
  description: 'Example tool';
  params: {
    count: CountParam;  // Reference to separate interface
  };
  result: { total: number };
}
```

**Why this works:**
- Separate interface is properly parsed by the schema generator
- Type coercion is correctly applied
- Number/boolean parameters work as expected
- Full IDE support with autocomplete and type checking

### Rule 2: Use IParam for Validated Parameters

While not enforced by validation, it's a **best practice** to use `IParam` for all parameters that need:
- Descriptions for LLM context
- Validation constraints (min, max, pattern, etc.)
- Required/optional specification

You can still mix simple TypeScript types with `IParam` parameters:

```typescript
interface MyTool extends ITool {
  name: 'my_tool';
  params: {
    name: NameParam;      // IParam with validation
    verbose?: boolean;    // Simple TypeScript type
  };
  result: string;
}
```

## Error Messages

### Inline IParam Intersection Error

When you use the inline `& IParam` pattern, you'll see:

```
❌ CRITICAL ERROR: Parameter 'count' in MyTool uses inline IParam intersection.

  Current (BROKEN - type coercion fails):
    params: { count: { type: 'number'; description: '...' } & IParam }

  Why this fails:
    • The schema generator does NOT support intersection types (& IParam)
    • Number/boolean parameters will be received as STRINGS
    • Arithmetic operations will fail silently (e.g., 42 + 58 = "4258")
    • This is a known framework limitation

  ✅ REQUIRED FIX - Use separate interface:
    interface CountParam extends IParam {
      type: 'number';  // or 'string', 'boolean', etc.
      description: 'Description of count';
      // Add any validation constraints here
    }

    params: { count: CountParam }

  📚 See examples/interface-params.ts for correct patterns.
```

The error message includes:
- **What's wrong**: Which parameter has the issue
- **Current code**: Shows your broken pattern
- **Why it fails**: Explains the technical reason
- **Required fix**: Shows the correct code
- **Reference**: Points to working examples

## Troubleshooting

### "Parameter uses inline IParam intersection"

**Cause:** You used `& IParam` inline instead of a separate interface.

**Fix:**
1. Create a separate interface for each parameter
2. Use `extends IParam` instead of `& IParam`
3. Reference the interface in your `params` object

**Example:**
```typescript
// Before (broken):
params: {
  count: { type: 'number'; description: 'Count' } & IParam;
}

// After (fixed):
interface CountParam extends IParam {
  type: 'number';
  description: 'Count';
}

params: {
  count: CountParam;
}
```

### Dry-run succeeds but numbers aren't working

**Cause:** Likely not using `IParam` properly, or using an old version.

**Fix:**
1. Verify you're on Simply MCP v4.0.0 or later
2. Ensure parameter interfaces extend `IParam`
3. Check that number types use `type: 'number'` or `type: 'integer'`
4. Run `npx simply-mcp run <file> --dry-run` to validate

### Type coercion not working

**Cause:** May be using incompatible parameter definition.

**Fix:**
1. Use separate `IParam` interfaces (not inline)
2. Ensure parameter type is `'number'`, `'integer'`, or `'boolean'`
3. Check schema generator output (enable debug logging)

## Validation Workflow

### During Development

```bash
# Always validate before testing
npx simply-mcp run my-server.ts --dry-run

# Look for:
# ✓ Dry run complete            <- Success
# ✗ Dry run failed              <- Fix errors
```

### In CI/CD

Add validation to your CI pipeline:

```bash
# In package.json scripts:
{
  "scripts": {
    "validate": "simply-mcp run src/server.ts --dry-run",
    "test": "npm run validate && jest"
  }
}
```

This ensures validation errors are caught before deployment.

## Complete Example

Here's a complete example showing all best practices:

```typescript
import type { ITool, IParam, IServer } from 'simply-mcp';

// ✅ Separate parameter interfaces extending IParam
interface CountParam extends IParam {
  type: 'number';
  description: 'Number of items to process';
  required: true;
  min: 0;
  max: 1000;
}

interface MessageParam extends IParam {
  type: 'string';
  description: 'Message to include';
  required: false;
  maxLength: 200;
}

// Tool definition referencing parameter interfaces
interface ProcessTool extends ITool {
  name: 'process_items';
  description: 'Process a specific number of items';
  params: {
    count: CountParam;        // Validated number
    message: MessageParam;    // Optional string
    verbose?: boolean;        // Simple type (no validation)
  };
  result: {
    processed: number;
    message: string;
  };
}

// Server metadata
const server: IServer = {
  name: 'my-server',
  version: '1.0.0',
  description: 'Example server with validated parameters'
}

// Implementation
export default class MyServerImpl {
  processItems: ProcessTool = async (params) => {
    // All parameter types are correct:
    // - params.count is a number (not a string!)
    // - Arithmetic works: params.count * 2
    // - Boolean works: if (params.verbose) { ... }

    const processed = params.count * 2;  // Correct arithmetic
    const msg = params.message || 'No message';

    return {
      processed,
      message: `Processed ${processed} items. ${msg}`,
    };
  };
}
```

## References

- [examples/interface-params.ts](../../examples/interface-params.ts) - Parameter validation examples
- [examples/interface-advanced.ts](../../examples/interface-advanced.ts) - Advanced patterns
- [API Reference](./API_REFERENCE.md) - Core types and type coercion details
- [QUICK_START.md](./QUICK_START.md) - Getting started guide

## Technical Details

### How Validation Works

1. **Parser** (`src/server/parser.ts`):
   - Scans TypeScript AST for interface definitions
   - Checks parameter types for unsupported patterns
   - Collects validation errors

2. **Dry-run** (`src/cli/dry-run.ts`):
   - Runs parser validation
   - Displays errors to console
   - Exits with code 1 if validation fails

3. **Schema Generator** (`src/core/schema-generator.ts`):
   - Generates Zod schemas from valid interfaces
   - Applies `z.coerce.number()` and `z.coerce.boolean()`
   - Ensures type safety at runtime

### Supported Patterns

| Pattern | Supported | Notes |
|---------|-----------|-------|
| `interface XParam extends IParam { ... }` | ✅ Yes | Recommended pattern |
| `params: { x: XParam }` | ✅ Yes | Reference to interface |
| `params: { x?: boolean }` | ✅ Yes | Simple TypeScript types |
| `params: { x: {...} & IParam }` | ❌ No | Inline intersection not supported |
| `params: { x: number }` | ⚠️ Discouraged | No validation or description |

### Future Enhancements

The framework may add support for:
- Intersection types in schema generator (removes current limitation)
- Additional validation rules (missing constraints, etc.)
- Custom validation error messages
- Validation rule configuration

Check the [CHANGELOG](../../CHANGELOG.md) for updates.

## Getting Help

If you encounter validation errors not covered in this guide:

1. Check [examples/](../../examples/) directory for working patterns
2. Review error message for fix instructions
3. Run with `--dry-run` to see detailed validation output
4. Open an issue on GitHub with error details

---

**Last Updated:** v4.0.0 - Type coercion and inline IParam validation
