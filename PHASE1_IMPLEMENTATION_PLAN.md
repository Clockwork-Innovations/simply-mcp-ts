# Phase 1 Implementation Plan: UX Improvements (v2.5.0)

**Created:** 2025-10-06
**Target Version:** v2.5.0
**Priority:** HIGH - Critical for improved developer experience
**Timeline:** 1-2 weeks
**Breaking Changes:** NONE (all changes are backward compatible)

## Overview

Phase 1 addresses critical UX pain points discovered during production readiness testing while maintaining 100% backward compatibility. This release will improve the developer experience without requiring users to change their existing code.

**Core Principle:** Additive changes only. All existing import paths, APIs, and patterns continue to work.

### Phase 1 Goals

1. **Unified Exports** - Add all exports to main package (keep subpaths working)
2. **Decorator Consistency** - Fix decorator parameter inconsistencies
3. **Documentation Audit** - Standardize all import examples across documentation
4. **Better Error Messages** - Add actionable guidance to error messages
5. **Migration Guide** - Document upcoming v3.0.0 changes

---

## Task 1: Unified Exports

### Current State

Users must import from multiple paths:
```typescript
import { SimplyMCP, defineMCP } from 'simply-mcp';
import { MCPServer, tool, prompt, resource } from 'simply-mcp/decorators';
import type { CLIConfig } from 'simply-mcp/config';
```

**Files Involved:**
- `/mnt/Shared/cs-projects/simple-mcp/src/index.ts` - Currently exports some items
- `/mnt/Shared/cs-projects/simple-mcp/src/decorators.ts` - Only available via subpath
- `/mnt/Shared/cs-projects/simple-mcp/src/config.ts` - Only available via subpath
- `/mnt/Shared/cs-projects/simple-mcp/package.json` - Already has correct export map

### Target State

Users can import everything from main package OR use subpaths (both work):
```typescript
// New unified approach (v2.5.0+)
import {
  SimplyMCP,
  defineMCP,
  MCPServer,
  tool,
  prompt,
  resource,
  type CLIConfig
} from 'simply-mcp';

// Old approach still works (backward compatible)
import { MCPServer, tool } from 'simply-mcp/decorators';
import type { CLIConfig } from 'simply-mcp/config';
```

### Implementation Steps

#### Step 1.1: Update src/index.ts to re-export config types
**File:** `/mnt/Shared/cs-projects/simple-mcp/src/index.ts`
**Action:** Add config exports after existing exports

```typescript
// Add after line 143 (after error exports):

// ============================================================================
// Configuration Types (re-exported for convenience)
// ============================================================================
export type {
  CLIConfig,
  ServerConfig as CLIServerConfig,
  DefaultsConfig,
  RunConfig,
  BundleConfig,
  APIStyle,
  TransportType,
} from './config.js';

export { defineConfig } from './config.js';
```

**Rationale:**
- Re-export all config types and utilities from main index
- Prefix `ServerConfig` with `CLI` to avoid conflict with decorator's `ServerConfig`
- Keep `simply-mcp/config` working via package.json exports

#### Step 1.2: Verify package.json exports remain unchanged
**File:** `/mnt/Shared/cs-projects/simple-mcp/package.json`
**Action:** NO CHANGES NEEDED - exports are already correct

The existing export map already supports both patterns:
```json
"exports": {
  ".": "./dist/src/index.js",
  "./decorators": "./dist/src/decorators.js",
  "./config": "./dist/src/config.js"
}
```

#### Step 1.3: Add deprecation warnings to subpath exports (documentation only)
**File:** `/mnt/Shared/cs-projects/simple-mcp/src/decorators.ts`
**Action:** Add JSDoc comment at top of file (line 1)

```typescript
/**
 * Decorator-based MCP Server Framework
 *
 * @deprecated Importing from 'simply-mcp/decorators' is deprecated.
 * Import from 'simply-mcp' instead:
 *
 * ```typescript
 * // New (v2.5.0+)
 * import { MCPServer, tool, prompt, resource } from 'simply-mcp';
 *
 * // Old (still works but deprecated)
 * import { MCPServer, tool, prompt, resource } from 'simply-mcp/decorators';
 * ```
 *
 * The subpath import will be removed in v3.0.0.
 *
 * Inspired by Python's FastMCP decorator pattern.
 * Define MCP servers using TypeScript classes with decorators.
 * ...
 */
```

**File:** `/mnt/Shared/cs-projects/simple-mcp/src/config.ts`
**Action:** Add JSDoc comment at top of file (line 1)

```typescript
/**
 * Configuration utilities for SimpleMCP
 * Provides type-safe config helper and type exports
 *
 * @deprecated Importing from 'simply-mcp/config' is deprecated.
 * Import from 'simply-mcp' instead:
 *
 * ```typescript
 * // New (v2.5.0+)
 * import { defineConfig, type CLIConfig } from 'simply-mcp';
 *
 * // Old (still works but deprecated)
 * import { defineConfig, type CLIConfig } from 'simply-mcp/config';
 * ```
 *
 * The subpath import will be removed in v3.0.0.
 */
```

### Validation

- [ ] Build project: `npm run build`
- [ ] Verify main package imports work:
  ```typescript
  import { MCPServer, tool, prompt, resource, defineConfig, type CLIConfig } from 'simply-mcp';
  ```
- [ ] Verify subpath imports still work (backward compatibility):
  ```typescript
  import { tool } from 'simply-mcp/decorators';
  import { defineConfig } from 'simply-mcp/config';
  ```
- [ ] Check TypeScript types are properly exported
- [ ] Run existing tests: `npm test`
- [ ] Test with example files that use old import patterns

### Dependencies
None - This is an independent task

### Risk Level: LOW
- Purely additive changes
- No existing code breaks
- Package.json exports already support both patterns

---

## Task 2: Decorator Parameter Consistency

### Current State

The decorator parameter handling is inconsistent:

**From testing (PRODUCTION_READINESS_REPORT.md):**
- `@tool('Description')` - String parameter works
- `@tool({ description: 'Description' })` - Object parameter doesn't work

**From code inspection (src/decorators.ts:193):**
```typescript
export function tool(description?: string) {
  // Only accepts string parameter
}
```

**User expectation:** Decorators should accept either string OR object for consistency with other frameworks.

### Target State

Decorators should clearly support ONE consistent pattern:
1. **Option A:** Only string (current implementation) - Update TypeScript types and docs
2. **Option B:** Support both string and object - Update implementation

**Decision:** Go with Option A for Phase 1 (no breaking changes), then Option B in v3.0.0.

### Implementation Steps

#### Step 2.1: Document current behavior in decorator functions
**File:** `/mnt/Shared/cs-projects/simple-mcp/src/decorators.ts`
**Action:** Update JSDoc for `tool`, `prompt`, and `resource` decorators

**Update `tool` decorator (lines 189-245):**
```typescript
/**
 * @tool decorator
 * Marks a method as an MCP tool
 *
 * @param description - Optional description for the tool.
 *                      If omitted, uses JSDoc comment or method name.
 *
 * @example
 * ```typescript
 * @tool('Greet a user')
 * greet(name: string) {
 *   return `Hello, ${name}!`;
 * }
 *
 * // Or use JSDoc for description:
 * @tool()
 * greet(name: string) {
 *   return `Hello, ${name}!`;
 * }
 * ```
 *
 * @note In v2.x, only string parameters are supported.
 *       Object syntax `@tool({ description: '...' })` will be added in v3.0.0.
 */
export function tool(description?: string) {
```

**Update `prompt` decorator (lines 247-299):**
```typescript
/**
 * @prompt decorator
 * Marks a method as an MCP prompt generator
 *
 * @param description - Optional description for the prompt.
 *                      If omitted, uses JSDoc comment or method name.
 *
 * @example
 * ```typescript
 * @prompt('Code review generator')
 * codeReview(language: string) {
 *   return `Review this ${language} code...`;
 * }
 * ```
 *
 * @note In v2.x, only string parameters are supported.
 */
export function prompt(description?: string) {
```

**Update `resource` decorator (lines 301-355):**
```typescript
/**
 * @resource decorator
 * Marks a method as an MCP resource provider
 *
 * @param uri - Resource URI (e.g., 'file://config', 'doc://readme')
 * @param options - Resource options
 * @param options.name - Display name (defaults to method name)
 * @param options.mimeType - MIME type (defaults to 'text/plain')
 *
 * @example
 * ```typescript
 * @resource('config://server', { mimeType: 'application/json' })
 * serverConfig() {
 *   return { name: 'my-server', version: '1.0.0' };
 * }
 * ```
 */
export function resource(uri: string, options: { name?: string; mimeType?: string } = {}) {
```

#### Step 2.2: Add validation and helpful error messages
**File:** `/mnt/Shared/cs-projects/simple-mcp/src/decorators.ts`
**Action:** Add runtime type checking at the start of each decorator

**For `tool` decorator (add after line 193):**
```typescript
export function tool(description?: string) {
  // Runtime validation
  if (description !== undefined && typeof description !== 'string') {
    throw new TypeError(
      `@tool decorator expects a string description, got ${typeof description}.\n\n` +
      `Usage:\n` +
      `  @tool('Description here')\n` +
      `  @tool()  // Uses JSDoc or method name\n\n` +
      `Note: Object syntax @tool({ description: '...' }) is not yet supported in v2.x.\n` +
      `It will be added in v3.0.0.`
    );
  }

  return function (
    // ... rest of implementation
```

**For `prompt` decorator (add after line 251):**
```typescript
export function prompt(description?: string) {
  // Runtime validation
  if (description !== undefined && typeof description !== 'string') {
    throw new TypeError(
      `@prompt decorator expects a string description, got ${typeof description}.\n\n` +
      `Usage:\n` +
      `  @prompt('Description here')\n` +
      `  @prompt()  // Uses JSDoc or method name\n\n` +
      `Note: Object syntax is not yet supported in v2.x.`
    );
  }

  return function (
    // ... rest of implementation
```

#### Step 2.3: Add tests for parameter validation
**File:** Create `/mnt/Shared/cs-projects/simple-mcp/tests/unit/decorator-params.test.ts`
**Action:** Create new test file

```typescript
import { describe, it, expect } from '@jest/globals';
import { tool, prompt, resource } from '../../src/decorators.js';

describe('Decorator Parameter Validation', () => {
  describe('@tool', () => {
    it('should accept string description', () => {
      expect(() => {
        class TestClass {
          @tool('Test description')
          testMethod() {}
        }
      }).not.toThrow();
    });

    it('should accept no description', () => {
      expect(() => {
        class TestClass {
          @tool()
          testMethod() {}
        }
      }).not.toThrow();
    });

    it('should throw TypeError for object description', () => {
      expect(() => {
        class TestClass {
          @tool({ description: 'Test' } as any)
          testMethod() {}
        }
      }).toThrow(TypeError);

      expect(() => {
        class TestClass {
          @tool({ description: 'Test' } as any)
          testMethod() {}
        }
      }).toThrow(/Object syntax.*not yet supported/);
    });
  });

  describe('@prompt', () => {
    it('should accept string description', () => {
      expect(() => {
        class TestClass {
          @prompt('Test prompt')
          testMethod() {}
        }
      }).not.toThrow();
    });
  });

  describe('@resource', () => {
    it('should accept uri and options', () => {
      expect(() => {
        class TestClass {
          @resource('test://uri', { mimeType: 'text/plain' })
          testMethod() {}
        }
      }).not.toThrow();
    });
  });
});
```

### Validation

- [ ] Build project: `npm run build`
- [ ] Verify string parameters work: `@tool('description')`
- [ ] Verify empty decorators work: `@tool()`
- [ ] Verify object parameters throw helpful error: `@tool({ description: 'test' })`
- [ ] Run decorator tests
- [ ] Check error messages are clear and actionable
- [ ] Test with all example files

### Dependencies
None - Independent task

### Risk Level: LOW
- Only adds validation and documentation
- No changes to working behavior
- Improves error messages for incorrect usage

---

## Task 3: Documentation Import Examples Audit

### Current State

Documentation shows inconsistent import patterns across 32+ files:
- Some use `import from 'simply-mcp'`
- Some use `import from 'simply-mcp/decorators'`
- Old imports from `@clockwork-innovations/simply-mcp` may still exist
- No standard pattern documented

**Files to audit (from Grep results):**
- 32 documentation files (.md)
- 18 example files (.ts)
- Total: ~50 files

### Target State

All documentation uses the new unified import pattern consistently:
```typescript
// Standard pattern for all docs (v2.5.0+)
import { MCPServer, tool, prompt, resource } from 'simply-mcp';
import { SimplyMCP, defineMCP } from 'simply-mcp';
import { type CLIConfig, defineConfig } from 'simply-mcp';
```

Each code example should include a comment showing the import is compatible with v2.5.0+.

### Implementation Steps

#### Step 3.1: Create import pattern style guide
**File:** Create `/mnt/Shared/cs-projects/simple-mcp/docs/development/IMPORT_STYLE_GUIDE.md`
**Action:** Document standard import patterns

```markdown
# Import Style Guide

**Version:** v2.5.0+
**Status:** Standard for all documentation and examples

## Standard Import Patterns

### Decorator API

```typescript
import { MCPServer, tool, prompt, resource } from 'simply-mcp';
```

### Programmatic API

```typescript
import { SimplyMCP } from 'simply-mcp';
import { z } from 'zod';
```

### Functional API

```typescript
import { defineMCP, defineTool, definePrompt } from 'simply-mcp';
import { z } from 'zod';
```

### Configuration

```typescript
import { defineConfig, type CLIConfig } from 'simply-mcp';
```

### Combined Imports

```typescript
import {
  MCPServer,
  tool,
  prompt,
  resource,
  SimplyMCP,
  defineMCP,
  type CLIConfig
} from 'simply-mcp';
```

## Deprecated Patterns

These still work but should NOT be used in new documentation:

```typescript
// DEPRECATED: Subpath imports
import { tool } from 'simply-mcp/decorators';
import { defineConfig } from 'simply-mcp/config';
```

## Migration Notes

- Subpath imports (`simply-mcp/decorators`, `simply-mcp/config`) still work in v2.x
- They will be removed in v3.0.0
- All examples should use unified imports from main package
```

#### Step 3.2: Update README.md
**File:** `/mnt/Shared/cs-projects/simple-mcp/README.md`
**Action:** Update all import examples to use unified pattern

**Changes needed:**
- Line 50: Change `import { MCPServer, tool } from 'simply-mcp/decorators';` to `import { MCPServer, tool } from 'simply-mcp';`
- Review all other import statements in examples
- Add note about import patterns in Quick Start section

**Add after line 43 (after "Installation" section):**
```markdown
### Import Pattern (v2.5.0+)

All simply-mcp exports are available from the main package:

```typescript
// Everything from one import
import { MCPServer, tool, prompt, resource, SimplyMCP, defineMCP } from 'simply-mcp';
```

Subpath imports (`simply-mcp/decorators`, `simply-mcp/config`) still work but are deprecated.
```

#### Step 3.3: Update example files
**Files:** All 18 example files in `/mnt/Shared/cs-projects/simple-mcp/examples/`
**Action:** Update import statements to use unified pattern

**Priority files to update:**
1. `examples/class-minimal.ts` - Line 29: Change import
2. `examples/class-basic.ts` - Line 26: Change import
3. `examples/simple-server.ts` - Line 16: Already correct, verify
4. `examples/class-advanced.ts` - Update imports
5. `examples/class-prompts-resources.ts` - Update imports

**Standard replacement:**
```typescript
// OLD
import { MCPServer, tool, prompt, resource } from 'simply-mcp/decorators';

// NEW
import { MCPServer, tool, prompt, resource } from 'simply-mcp';
```

#### Step 3.4: Update documentation files
**Files:** All 32 documentation files with import examples
**Action:** Use find/replace with review

**Key documentation files (high priority):**
1. `/mnt/Shared/cs-projects/simple-mcp/src/docs/QUICK-START.md`
2. `/mnt/Shared/cs-projects/simple-mcp/docs/development/DECORATOR-API.md`
3. `/mnt/Shared/cs-projects/simple-mcp/docs/development/SIMPLE_MCP_GUIDE.md`
4. `/mnt/Shared/cs-projects/simple-mcp/src/docs/HTTP-TRANSPORT.md`
5. `/mnt/Shared/cs-projects/simple-mcp/examples/README.md`

**Process for each file:**
1. Search for `from 'simply-mcp/decorators'`
2. Replace with `from 'simply-mcp'`
3. Search for `from 'simply-mcp/config'`
4. Replace with `from 'simply-mcp'`
5. Search for old package names
6. Review context to ensure change is correct
7. Add version note if in migration guide

#### Step 3.5: Update migration guides
**File:** `/mnt/Shared/cs-projects/simple-mcp/docs/migration/v2-to-v3-migration.md`
**Action:** Add import pattern changes to migration guide

**Add section:**
```markdown
## Import Pattern Changes

### v2.5.0: Unified Imports (Backward Compatible)

v2.5.0 adds all exports to the main package:

```typescript
// New unified pattern (v2.5.0+)
import { MCPServer, tool, prompt, resource } from 'simply-mcp';
import { defineConfig, type CLIConfig } from 'simply-mcp';

// Old pattern still works (deprecated)
import { tool } from 'simply-mcp/decorators';
import { defineConfig } from 'simply-mcp/config';
```

### v3.0.0: Subpaths Removed (Breaking Change)

v3.0.0 will remove subpath exports. You MUST use unified imports:

```typescript
// v3.0.0+ (required)
import { MCPServer, tool } from 'simply-mcp';

// v3.0.0+ (error - removed)
import { tool } from 'simply-mcp/decorators'; // Error!
```

**Migration:** Use find/replace:
- Find: `from 'simply-mcp/decorators'`
- Replace: `from 'simply-mcp'`
- Find: `from 'simply-mcp/config'`
- Replace: `from 'simply-mcp'`
```

### Validation

- [ ] Build project after all changes
- [ ] Run all tests
- [ ] Manually verify key example files work:
  - `npx simply-mcp run examples/class-basic.ts --dry-run`
  - `npx simply-mcp run examples/simple-server.ts --dry-run`
- [ ] Check documentation renders correctly
- [ ] Search for remaining old import patterns:
  - `grep -r "from 'simply-mcp/decorators'" docs/ examples/`
  - `grep -r "from 'simply-mcp/config'" docs/ examples/`
  - `grep -r "@clockwork-innovations" docs/ examples/`
- [ ] Verify all import statements are consistent

### Dependencies
- Depends on: Task 1 (Unified Exports) - Must be completed first

### Risk Level: LOW
- Documentation-only changes
- No code functionality changes
- Examples should be tested to ensure they work

---

## Task 4: Improve Error Messages

### Current State

Error messages lack actionable guidance:
```
Error loading config file: (0 , import_simply_mcp.createServer) is not a function
```

**Issues:**
- Too terse
- No explanation of what went wrong
- No suggestion for how to fix
- No link to documentation

### Target State

Error messages should be:
- Clear and descriptive
- Include what went wrong
- Suggest how to fix it
- Link to relevant documentation

```
Error: Invalid MCP Server Configuration

The exported value from 'server.ts' is not a valid MCP server configuration.

Expected one of:
  - A class decorated with @MCPServer
  - A configuration object from defineMCP()
  - A SimplyMCP instance

Example:
  @MCPServer()
  export default class MyServer { }

See: https://github.com/Clockwork-Innovations/simply-mcp-ts#quick-start
```

### Implementation Steps

#### Step 4.1: Enhance error messages in class-adapter.ts
**File:** `/mnt/Shared/cs-projects/simple-mcp/src/class-adapter.ts`
**Action:** Improve error messages in loadClass and setup functions

**Update loadClass error (around line 102-116):**
```typescript
export async function loadClass(classFile: string): Promise<any> {
  const absolutePath = resolve(process.cwd(), classFile);
  const fileUrl = pathToFileURL(absolutePath).href;

  let module;
  try {
    module = await import(fileUrl);
  } catch (error: any) {
    throw new Error(
      `Failed to load file: ${classFile}\n\n` +
      `Error: ${error.message}\n\n` +
      `Troubleshooting:\n` +
      `  - Check the file path is correct\n` +
      `  - Ensure the file has no syntax errors\n` +
      `  - Verify all imports are valid\n\n` +
      `File path (resolved): ${absolutePath}`
    );
  }

  const ServerClass = module.default || Object.values(module).find(
    (exp: any) => typeof exp === 'function' && exp.prototype
  );

  if (!ServerClass) {
    throw new Error(
      `No MCP server class found in: ${classFile}\n\n` +
      `Expected:\n` +
      `  - A class decorated with @MCPServer\n` +
      `  - Exported as default: export default class MyServer { }\n` +
      `  - Or as named export: export class MyServer { }\n\n` +
      `Example:\n` +
      `  import { MCPServer } from 'simply-mcp';\n\n` +
      `  @MCPServer()\n` +
      `  export default class MyServer { }\n\n` +
      `See: https://github.com/Clockwork-Innovations/simply-mcp-ts#decorator-api`
    );
  }

  return ServerClass;
}
```

#### Step 4.2: Enhance error messages in SimplyMCP.ts
**File:** `/mnt/Shared/cs-projects/simple-mcp/src/SimplyMCP.ts`
**Action:** Search for error throws and enhance messages

**Common patterns to improve:**
1. Validation errors → Add what's expected
2. Configuration errors → Show example config
3. Runtime errors → Add troubleshooting steps

**Example enhancement (find similar patterns):**
```typescript
// OLD
throw new Error('Invalid tool configuration');

// NEW
throw new Error(
  `Invalid tool configuration\n\n` +
  `Expected:\n` +
  `  - name: string (required)\n` +
  `  - description: string (required)\n` +
  `  - parameters: ZodObject (required)\n` +
  `  - execute: async function (required)\n\n` +
  `Example:\n` +
  `  server.addTool({\n` +
  `    name: 'greet',\n` +
  `    description: 'Greet a user',\n` +
  `    parameters: z.object({ name: z.string() }),\n` +
  `    execute: async (args) => \`Hello, \${args.name}!\`\n` +
  `  });\n\n` +
  `Received: ${JSON.stringify(config, null, 2)}`
);
```

#### Step 4.3: Enhance validation errors in decorators.ts
**File:** `/mnt/Shared/cs-projects/simple-mcp/src/decorators.ts`
**Action:** Already done in Task 2 - Verify error messages are helpful

Verify these errors have good messages:
- Missing required decorator parameters
- Invalid parameter types
- Missing metadata

#### Step 4.4: Add error helper utility
**File:** Create `/mnt/Shared/cs-projects/simple-mcp/src/core/error-messages.ts`
**Action:** Create reusable error message templates

```typescript
/**
 * Error message templates for common errors
 * Provides consistent, helpful error messages across the codebase
 */

export const ErrorMessages = {
  INVALID_SERVER_CLASS: (file: string) =>
    `No MCP server class found in: ${file}\n\n` +
    `Expected:\n` +
    `  - A class decorated with @MCPServer\n` +
    `  - Exported as default: export default class MyServer { }\n` +
    `  - Or as named export: export class MyServer { }\n\n` +
    `Example:\n` +
    `  import { MCPServer } from 'simply-mcp';\n\n` +
    `  @MCPServer()\n` +
    `  export default class MyServer { }\n\n` +
    `Documentation: https://github.com/Clockwork-Innovations/simply-mcp-ts#decorator-api`,

  FILE_LOAD_ERROR: (file: string, error: string) =>
    `Failed to load file: ${file}\n\n` +
    `Error: ${error}\n\n` +
    `Troubleshooting:\n` +
    `  - Check the file path is correct\n` +
    `  - Ensure the file has no syntax errors\n` +
    `  - Verify all imports are valid\n` +
    `  - Try running: npx tsx ${file}`,

  INVALID_TOOL_CONFIG: (received: any) =>
    `Invalid tool configuration\n\n` +
    `Required fields:\n` +
    `  - name: string\n` +
    `  - description: string\n` +
    `  - parameters: ZodObject\n` +
    `  - execute: async function\n\n` +
    `Example:\n` +
    `  server.addTool({\n` +
    `    name: 'greet',\n` +
    `    description: 'Greet a user',\n` +
    `    parameters: z.object({ name: z.string() }),\n` +
    `    execute: async (args) => \`Hello, \${args.name}!\`\n` +
    `  });\n\n` +
    `Received: ${JSON.stringify(received, null, 2).substring(0, 500)}`,

  DECORATOR_WRONG_TYPE: (decoratorName: string, expectedType: string, receivedType: string) =>
    `@${decoratorName} decorator parameter error\n\n` +
    `Expected: ${expectedType}\n` +
    `Received: ${receivedType}\n\n` +
    `Usage:\n` +
    `  @${decoratorName}('Description here')\n` +
    `  @${decoratorName}()  // Uses JSDoc or method name\n\n` +
    `Documentation: https://github.com/Clockwork-Innovations/simply-mcp-ts#decorators`,

  TRANSPORT_ERROR: (transport: string, error: string) =>
    `Failed to start ${transport} transport\n\n` +
    `Error: ${error}\n\n` +
    `Troubleshooting:\n` +
    `  - For HTTP: Check if port is already in use\n` +
    `  - For stdio: Ensure stdin/stdout are not being used by other code\n` +
    `  - Try a different transport: --http or --stdio\n\n` +
    `Documentation: https://github.com/Clockwork-Innovations/simply-mcp-ts#transport-comparison`,
};

/**
 * Format an error with context
 */
export function formatError(message: string, context?: Record<string, any>): string {
  let formatted = message;

  if (context) {
    formatted += '\n\nContext:\n';
    for (const [key, value] of Object.entries(context)) {
      formatted += `  ${key}: ${JSON.stringify(value)}\n`;
    }
  }

  return formatted;
}
```

#### Step 4.5: Update error throwing code to use error helper
**Files:** Various files that throw errors
**Action:** Update to use ErrorMessages templates where applicable

This is optional for Phase 1 - focus on the most common errors first:
1. class-adapter.ts - loadClass errors
2. SimplyMCP.ts - configuration validation errors
3. decorators.ts - decorator parameter errors

### Validation

- [ ] Build project
- [ ] Trigger each error condition manually and verify message quality:
  - Load invalid class file
  - Use wrong decorator parameter type
  - Invalid tool configuration
  - Transport start failure (port in use)
- [ ] Check error messages include:
  - Clear description of what went wrong
  - Expected vs received (where applicable)
  - Example of correct usage
  - Troubleshooting steps
  - Link to documentation
- [ ] Verify error messages are not too verbose (keep under 20 lines)
- [ ] Test user workflow: Can user fix error from message alone?

### Dependencies
None - Independent task

### Risk Level: LOW
- Only improves error messages
- No changes to successful code paths
- May increase error message length slightly

---

## Task 5: Add Migration Guide

### Current State

No migration guide exists for:
- v2.4.7 → v2.5.0 (current release)
- v2.x → v3.0.0 (upcoming major version)
- Import pattern changes
- Deprecated features

### Target State

Comprehensive migration guide that covers:
1. What's new in v2.5.0
2. What's deprecated in v2.5.0
3. What will break in v3.0.0
4. How to migrate code
5. Automated migration tools (if applicable)

### Implementation Steps

#### Step 5.1: Create v2.5.0 release notes
**File:** Create `/mnt/Shared/cs-projects/simple-mcp/docs/releases/RELEASE_NOTES_v2.5.0.md`
**Action:** Document all Phase 1 changes

```markdown
# Release Notes - v2.5.0

**Release Date:** TBD
**Type:** Minor release (backward compatible)
**Focus:** UX Improvements - Developer Experience

## Overview

Version 2.5.0 improves the developer experience with unified imports, better error messages, and comprehensive documentation updates. All changes are backward compatible.

## New Features

### 1. Unified Package Imports

All exports are now available from the main package:

```typescript
// NEW: Everything from main package
import {
  MCPServer,
  tool,
  prompt,
  resource,
  SimplyMCP,
  defineMCP,
  type CLIConfig,
  defineConfig
} from 'simply-mcp';

// OLD: Still works but deprecated
import { tool } from 'simply-mcp/decorators';
import { defineConfig } from 'simply-mcp/config';
```

**Benefits:**
- Simpler imports
- Better IDE autocomplete
- Consistent with popular frameworks
- Fewer imports needed

**Migration:** Optional - old imports still work. Update at your convenience.

### 2. Enhanced Error Messages

Error messages now include:
- Clear description of the problem
- Expected vs received values
- Examples of correct usage
- Troubleshooting steps
- Links to documentation

**Before:**
```
Error loading config file
```

**After:**
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

### 3. Decorator Parameter Validation

Decorators now validate parameters at runtime with helpful messages:

```typescript
// This will now show a clear error
@tool({ description: 'Test' })  // TypeError with helpful message
greet(name: string) { }

// Correct usage
@tool('Test description')
greet(name: string) { }
```

### 4. Documentation Standardization

All documentation and examples updated to:
- Use unified import pattern
- Show consistent code style
- Include version compatibility notes
- Link to relevant resources

## Deprecations

### Subpath Imports (Removal in v3.0.0)

These import paths are now deprecated:
- `simply-mcp/decorators`
- `simply-mcp/config`

**What to do:** Update imports to use main package:
```typescript
// Replace
import { tool } from 'simply-mcp/decorators';
// With
import { tool } from 'simply-mcp';
```

**Timeline:** These will be removed in v3.0.0 (breaking change).

## Breaking Changes

None - This is a fully backward compatible release.

## Upgrade Guide

### From v2.4.7 to v2.5.0

**Step 1:** Update package
```bash
npm install simply-mcp@2.5.0
```

**Step 2:** (Optional) Update imports
```bash
# Find old imports
grep -r "from 'simply-mcp/decorators'" src/

# Replace with unified imports
# Use your editor's find/replace
```

**Step 3:** Rebuild
```bash
npm run build
```

**Step 4:** Test
```bash
npm test
```

That's it! Your code should work without any changes.

## Migration Checklist

- [ ] Update simply-mcp to v2.5.0
- [ ] Build succeeds
- [ ] Tests pass
- [ ] (Optional) Update import statements
- [ ] (Optional) Update documentation

## Next Version Preview: v3.0.0

Version 3.0.0 will include breaking changes:

**Planned Changes:**
1. Remove subpath imports (`simply-mcp/decorators`, `simply-mcp/config`)
2. Rename `SimplyMCP` class to `MCPServer` or `createMCPServer`
3. Remove deprecated APIs
4. Require Node.js 20+

**Timeline:** TBD (at least 3-6 months after v2.5.0)

**Preparation:** Start using unified imports now to prepare for v3.0.0.

## Documentation

- [Migration Guide](../migration/v2-to-v3-migration.md)
- [Import Style Guide](../development/IMPORT_STYLE_GUIDE.md)
- [Full Changelog](./CHANGELOG.md)

## Acknowledgments

These improvements were identified through comprehensive production readiness testing. Thank you to all users who provided feedback!

---

**Need Help?**
- [GitHub Issues](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)
- [Documentation](https://github.com/Clockwork-Innovations/simply-mcp-ts#readme)
- [Examples](../../examples/)
```

#### Step 5.2: Update v2-to-v3 migration guide
**File:** `/mnt/Shared/cs-projects/simple-mcp/docs/migration/v2-to-v3-migration.md`
**Action:** Enhance existing migration guide or create if missing

```markdown
# Migration Guide: v2.x to v3.0.0

**Status:** DRAFT - v3.0.0 not yet released
**Estimated Release:** TBD (at least 3-6 months after v2.5.0)
**Breaking Changes:** YES

## Overview

This guide helps you migrate from simply-mcp v2.x to v3.0.0.

**Important:** v3.0.0 is a major version with breaking changes. We recommend:
1. Migrate to v2.5.0 first
2. Update your code to use v2.5.0 patterns
3. Test thoroughly
4. Then upgrade to v3.0.0 when released

## Breaking Changes

### 1. Subpath Imports Removed

**Status:** Deprecated in v2.5.0, Removed in v3.0.0

Subpath imports are no longer supported:

```typescript
// v2.x (deprecated)
import { tool } from 'simply-mcp/decorators';
import { defineConfig } from 'simply-mcp/config';

// v3.0.0 (required)
import { tool, defineConfig } from 'simply-mcp';
```

**Migration Steps:**

1. Find all subpath imports:
```bash
grep -r "from 'simply-mcp/" src/
```

2. Replace with unified imports:
```typescript
// Find:    from 'simply-mcp/decorators'
// Replace: from 'simply-mcp'

// Find:    from 'simply-mcp/config'
// Replace: from 'simply-mcp'
```

3. Verify all imports work:
```bash
npm run build
npm test
```

**Automation:**
```bash
# Use sed for batch replacement (review changes first!)
find src -name "*.ts" -exec sed -i "s/from 'simply-mcp\/decorators'/from 'simply-mcp'/g" {} +
find src -name "*.ts" -exec sed -i "s/from 'simply-mcp\/config'/from 'simply-mcp'/g" {} +
```

### 2. SimplyMCP Class Renamed (Proposed)

**Status:** PROPOSED - Not yet confirmed for v3.0.0

The main class may be renamed for clarity:

```typescript
// v2.x
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'my-server' });

// v3.0.0 (proposed)
import { MCPServer } from 'simply-mcp';
const server = new MCPServer({ name: 'my-server' });

// OR functional approach
import { createMCPServer } from 'simply-mcp';
const server = createMCPServer({ name: 'my-server' });
```

**Status:** This change is not yet confirmed. We'll provide more details closer to v3.0.0 release.

### 3. Node.js 20+ Required

**Status:** PROPOSED

v3.0.0 may require Node.js 20 or higher.

**Current:** Node.js 20+ (v2.x already requires this)

### 4. Decorator Object Syntax Support

**Status:** PLANNED

v3.0.0 will support object syntax for decorators:

```typescript
// v2.x - Only string supported
@tool('Description')
greet(name: string) { }

// v3.0.0 - Both supported
@tool('Description')
@tool({ description: 'Description', timeout: 5000 })
greet(name: string) { }
```

This is an additive change - existing code will continue to work.

## Migration Checklist

### Phase 1: Prepare on v2.5.0

- [ ] Update to v2.5.0: `npm install simply-mcp@2.5.0`
- [ ] Update all imports to use unified pattern
- [ ] Remove subpath imports (`simply-mcp/decorators`, etc.)
- [ ] Test thoroughly
- [ ] Update documentation
- [ ] Commit changes

### Phase 2: When v3.0.0 is Released

- [ ] Review v3.0.0 changelog for final breaking changes
- [ ] Update to v3.0.0: `npm install simply-mcp@3.0.0`
- [ ] Address any new breaking changes
- [ ] Run tests
- [ ] Deploy

## Automated Migration Tool

We plan to provide an automated migration tool for v3.0.0:

```bash
npx simply-mcp migrate v2-to-v3
```

This tool will:
- Scan your codebase for deprecated patterns
- Automatically update import statements
- Rename classes (if needed)
- Generate a migration report

**Status:** Tool not yet available. Will be released with v3.0.0 beta.

## Timeline

- **v2.5.0:** UX improvements (backward compatible)
- **v2.5.x:** Bug fixes, polish
- **v3.0.0-beta:** Beta release with breaking changes
- **v3.0.0:** Stable release

**Support Schedule:**
- v2.x will receive security updates for 6 months after v3.0.0 release
- v2.x will receive bug fixes for 3 months after v3.0.0 release

## Getting Help

- [GitHub Issues](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)
- [Discussions](https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions)
- [Release Notes](../releases/)

## Feedback

We want your input on v3.0.0 breaking changes:
- What would you like to see changed?
- What should remain the same?
- What new features would you like?

Open a discussion: https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions
```

#### Step 5.3: Update main README with migration guide link
**File:** `/mnt/Shared/cs-projects/simple-mcp/README.md`
**Action:** Add link to migration guide

**Add after line 435 (in "Links" section):**
```markdown
- [Migration Guide v2→v3](./docs/migration/v2-to-v3-migration.md)
```

#### Step 5.4: Create quick migration cheatsheet
**File:** Create `/mnt/Shared/cs-projects/simple-mcp/docs/migration/QUICK_MIGRATION.md`
**Action:** Create one-page quick reference

```markdown
# Quick Migration Cheatsheet

## v2.4.7 → v2.5.0 (Backward Compatible)

### What Changed
- ✅ Unified imports available (subpaths still work)
- ✅ Better error messages
- ✅ Decorator parameter validation
- ⚠️ Subpath imports deprecated

### Action Required
**None** - Everything still works!

**Recommended:** Update imports

```bash
# Before (v2.4.7)
import { tool } from 'simply-mcp/decorators';

# After (v2.5.0)
import { tool } from 'simply-mcp';
```

## v2.x → v3.0.0 (Breaking Changes)

### What Will Break
- ❌ Subpath imports removed
- ❌ Possible class renames
- ❌ Deprecated APIs removed

### Action Required
**Before v3.0.0 release:**

1. Update to v2.5.0
2. Change imports:
   ```bash
   # Find/replace in your code editor
   Find:    'simply-mcp/decorators'
   Replace: 'simply-mcp'

   Find:    'simply-mcp/config'
   Replace: 'simply-mcp'
   ```
3. Test: `npm test`
4. Done!

## Common Patterns

### Decorator API
```typescript
// v2.5.0+
import { MCPServer, tool, prompt, resource } from 'simply-mcp';

@MCPServer({ name: 'my-server' })
export default class MyServer {
  @tool('Greet user')
  greet(name: string) {
    return `Hello, ${name}!`;
  }
}
```

### Programmatic API
```typescript
// v2.5.0+
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

### Configuration
```typescript
// v2.5.0+
import { defineConfig } from 'simply-mcp';

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

## Need Help?

- Full guide: [v2-to-v3-migration.md](./v2-to-v3-migration.md)
- Issues: https://github.com/Clockwork-Innovations/simply-mcp-ts/issues
```

### Validation

- [ ] Review all migration documents for accuracy
- [ ] Verify code examples work
- [ ] Check all links are valid
- [ ] Ensure timeline is realistic
- [ ] Test migration steps yourself:
  - Create v2.4.7 project
  - Upgrade to v2.5.0
  - Follow migration guide
  - Verify everything works
- [ ] Get feedback from team/users on migration approach

### Dependencies
- Depends on: Tasks 1-4 (all other Phase 1 tasks must be complete)

### Risk Level: LOW
- Documentation only
- No code changes
- Helps users prepare for v3.0.0

---

## Implementation Sequence

Tasks ordered by dependencies and risk:

### Week 1: Foundation

1. **Task 1: Unified Exports** (2-3 days)
   - Independent
   - Low risk
   - Enables all other tasks
   - Start here

2. **Task 2: Decorator Consistency** (1-2 days)
   - Independent
   - Low risk
   - Can run parallel with Task 1

### Week 2: Content Updates

3. **Task 3: Documentation Audit** (3-4 days)
   - Depends on Task 1
   - Low risk
   - Most time-consuming
   - Can start after Task 1 completes

4. **Task 4: Error Messages** (2-3 days)
   - Independent
   - Low risk
   - Can run parallel with Task 3

5. **Task 5: Migration Guide** (1-2 days)
   - Depends on Tasks 1-4
   - Low risk
   - Final task

**Total Estimated Time:** 9-14 days (1.5-2 weeks)

---

## Validation Matrix

| Task | Validation Method | Success Criteria | Estimated Time |
|------|------------------|------------------|----------------|
| 1. Unified Exports | Build + Import tests | Both unified and subpath imports work | 30 min |
| 2. Decorator Consistency | Unit tests + Manual testing | Clear error for wrong types, string works | 30 min |
| 3. Documentation Audit | Manual review + Grep search | No old import patterns remain | 2 hours |
| 4. Error Messages | Trigger each error manually | Messages clear, actionable, helpful | 1 hour |
| 5. Migration Guide | Manual walkthrough | Guide is complete and accurate | 1 hour |

**Total Validation Time:** ~5 hours

---

## Backward Compatibility Checklist

### Must Not Break

- [ ] All existing import patterns work
  - [ ] `import { SimplyMCP } from 'simply-mcp'`
  - [ ] `import { tool } from 'simply-mcp/decorators'`
  - [ ] `import { defineConfig } from 'simply-mcp/config'`

- [ ] All existing decorators work
  - [ ] `@MCPServer({ name: 'test' })`
  - [ ] `@MCPServer()` (no params)
  - [ ] `@tool('description')`
  - [ ] `@tool()` (no params)
  - [ ] `@prompt('description')`
  - [ ] `@resource('uri', { options })`

- [ ] All existing APIs work
  - [ ] `new SimplyMCP({ config })`
  - [ ] `defineMCP({ config })`
  - [ ] `server.addTool()`
  - [ ] `server.addPrompt()`
  - [ ] `server.addResource()`
  - [ ] `server.start()`

- [ ] All examples work
  - [ ] `examples/class-basic.ts`
  - [ ] `examples/class-minimal.ts`
  - [ ] `examples/simple-server.ts`
  - [ ] All other examples

- [ ] All CLI commands work
  - [ ] `simplymcp run`
  - [ ] `simplymcp-class`
  - [ ] `simplymcp-func`
  - [ ] `simplymcp-bundle`

### Should Add (Non-Breaking)

- [ ] Unified imports from main package
- [ ] Better error messages
- [ ] Runtime parameter validation
- [ ] Deprecation warnings (in JSDoc only)
- [ ] Migration documentation

---

## Risk Mitigation

### Risk: Breaking Existing User Code

**Mitigation:**
- Comprehensive backward compatibility testing
- Keep all existing exports working
- Only add new exports, never remove
- Document changes clearly
- Provide migration path before removing anything

**Validation:**
- Run full test suite
- Test with real user code samples
- Test all examples
- Beta test with community

### Risk: Confusing Users with Multiple Import Patterns

**Mitigation:**
- Clear documentation of preferred pattern
- Deprecation notices in JSDoc
- Migration guide with examples
- Gradual transition (v2.5.0 → v3.0.0)

**Validation:**
- User feedback on documentation
- Clear examples in README
- Style guide for contributors

### Risk: Documentation Drift

**Mitigation:**
- Single source of truth (import style guide)
- Automated checks for import patterns
- Review all docs before release
- Keep examples up to date

**Validation:**
- Grep for old patterns
- Manual review of key docs
- Test all example code

### Risk: Regression in Error Handling

**Mitigation:**
- Only enhance error messages, don't change error conditions
- Test error paths manually
- Keep error classes unchanged
- Add tests for error messages

**Validation:**
- Trigger each error manually
- Verify error is still caught correctly
- Check error message quality

---

## Post-Implementation Checklist

### Before Committing
- [ ] All tasks completed
- [ ] All validation criteria met
- [ ] Backward compatibility verified
- [ ] Documentation updated
- [ ] Examples tested
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] No console errors or warnings

### Before Release
- [ ] Version bumped to v2.5.0
- [ ] CHANGELOG.md updated
- [ ] Release notes complete
- [ ] Migration guide reviewed
- [ ] Examples verified working
- [ ] Documentation reviewed
- [ ] Beta testing complete (if applicable)
- [ ] Community notified of upcoming release

### After Release
- [ ] NPM package published
- [ ] GitHub release created
- [ ] Documentation site updated
- [ ] Community announcement
- [ ] Monitor for issues
- [ ] Respond to user feedback
- [ ] Plan v2.5.1 if needed

---

## Success Criteria

Phase 1 is successful when:

1. **Imports are unified** ✓
   - All exports available from main package
   - Subpath imports still work (deprecated)
   - Documentation shows unified pattern

2. **Decorators are consistent** ✓
   - Clear error messages for wrong usage
   - Documented behavior
   - Runtime validation

3. **Documentation is standardized** ✓
   - All examples use unified imports
   - No old patterns remain
   - Style guide established

4. **Error messages are helpful** ✓
   - Clear description
   - Actionable guidance
   - Examples included
   - Documentation links

5. **Migration path is clear** ✓
   - Release notes complete
   - Migration guide detailed
   - Quick reference available
   - Timeline communicated

6. **No breaking changes** ✓
   - All existing code works
   - Tests pass
   - Examples run
   - Users can upgrade without changes

---

## Questions for Implementation Team

1. **Naming conflicts:** Should we prefix CLI's `ServerConfig` with `CLI` when re-exporting from main index?
   - **Recommendation:** Yes - use `CLIServerConfig` to avoid conflict with decorator's `ServerConfig`

2. **Error message length:** What's the maximum acceptable length for error messages?
   - **Recommendation:** 15-20 lines max, focus on clarity over brevity

3. **Deprecation strategy:** Should we add runtime warnings for deprecated imports?
   - **Recommendation:** No - only JSDoc warnings in v2.5.0, runtime warnings in v2.6.0, removal in v3.0.0

4. **Migration tool:** Should we build the automated migration CLI tool for Phase 1?
   - **Recommendation:** No - save for v3.0.0 release. Phase 1 changes are simple enough for manual migration

5. **Beta release:** Should we do a v2.5.0-beta release first?
   - **Recommendation:** Optional - if community beta testing is desired, release as v2.5.0-beta.1 first

---

## Next Steps

1. **Review this plan** with core team
2. **Assign tasks** to implementation agents
3. **Create branch** `feature/phase1-ux-improvements`
4. **Implement tasks** in sequence
5. **Test thoroughly** at each step
6. **Merge to main** when all validation passes
7. **Release v2.5.0** with comprehensive release notes

---

**Document Status:** Ready for Implementation
**Last Updated:** 2025-10-06
**Author:** Planning Agent
**Review Required:** Core Team
