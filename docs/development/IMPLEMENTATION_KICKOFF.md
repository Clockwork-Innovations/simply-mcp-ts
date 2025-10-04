# SimplyMCP - Implementation Kickoff Plan
## Phase 2, Feature 2: Inline Dependencies

**Date**: 2025-10-03
**Agent**: Next Developer
**Estimated Duration**: 10 days
**Priority**: HIGH (Foundation for Features 3 & 4)

---

## 🎯 Mission

Implement **PEP 723-style inline dependency declarations** for SimplyMCP servers, allowing developers to declare npm dependencies directly in their server files using special comment syntax.

**What Success Looks Like:**
```typescript
#!/usr/bin/env npx tsx
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// lodash@^4.17.21
// ///

import { SimplyMCP } from 'simply-mcp';
import axios from 'axios';
import { z } from 'zod';

// Server code here...
```

The framework will automatically parse these dependencies and make them available for auto-installation (Feature 3) and bundling (Feature 4).

---

## 📋 Complete Plan Reference

**Full Implementation Plan**: `/mnt/Shared/cs-projects/simple-mcp/mcp/PHASE2_FEATURE2_PLAN.md`

**Read this first** - It contains:
- Complete architectural design (1,800+ lines)
- All function signatures
- Test scenarios (120+ tests)
- Integration strategies
- Error handling patterns

---

## 🗺️ Implementation Roadmap

### Phase A: Core Parser (Days 1-3)
**Goal**: Parse inline dependency declarations from source code

### Phase B: Validation (Days 4-5)
**Goal**: Validate package names and version ranges

### Phase C: SimplyMCP Integration (Days 6-7)
**Goal**: Integrate with SimplyMCP class

### Phase D: Testing (Days 8-9)
**Goal**: Comprehensive test coverage

### Phase E: Documentation & Examples (Day 10)
**Goal**: User-facing docs and examples

---

## 📁 Files to Create/Modify

### ✅ CREATE THESE FILES (in order):

#### 1. **Dependency Types**
**Path**: `/mnt/Shared/cs-projects/simple-mcp/mcp/core/inline-deps/types.ts`
**Lines**: ~150
**Purpose**: TypeScript interfaces for inline dependencies

**Key Exports**:
```typescript
export interface InlineDependency {
  name: string;
  version: string;
  raw: string;
}

export interface ParseResult {
  dependencies: Record<string, string>;  // { "axios": "^1.6.0" }
  errors: ParseError[];
  warnings: string[];
  raw: string[];
}

export interface ParseError {
  line: number;
  message: string;
  raw: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}
```

**Template**: See plan section 4.1 (lines 800-950)

---

#### 2. **Dependency Parser** ⭐ CORE COMPONENT
**Path**: `/mnt/Shared/cs-projects/simple-mcp/mcp/core/inline-deps/parser.ts`
**Lines**: ~300
**Purpose**: Extract inline dependencies from source code

**Key Functions**:
```typescript
/**
 * Parse inline dependencies from source code
 *
 * @param source - TypeScript/JavaScript source code
 * @returns ParseResult with dependencies, errors, warnings
 *
 * @example
 * const source = `
 * // /// dependencies
 * // axios@^1.6.0
 * // ///
 * `;
 * const result = parseInlineDependencies(source);
 * // => { dependencies: { axios: "^1.6.0" }, errors: [], warnings: [] }
 */
export function parseInlineDependencies(source: string): ParseResult;

/**
 * Extract dependency block from source
 * Finds lines between /// dependencies and ///
 */
function extractDependencyBlock(source: string): string[];

/**
 * Parse a single dependency line
 * Format: "package-name@version-range"
 *
 * @example
 * parseDependencyLine("axios@^1.6.0")
 * // => { name: "axios", version: "^1.6.0", raw: "axios@^1.6.0" }
 */
function parseDependencyLine(line: string): InlineDependency | null;

/**
 * Clean comment syntax from dependency lines
 * Handles: //, #, /* *\/
 */
function cleanCommentSyntax(line: string): string;
```

**Implementation Strategy**:
1. Use regex to find `/// dependencies` ... `///` blocks
2. Extract lines between markers
3. Parse each line as `package@version`
4. Handle scoped packages (`@scope/package@version`)
5. Handle multiple dependency blocks (merge or error)
6. Collect errors and warnings

**Template**: See plan section 4.2 (lines 950-1250)

**Edge Cases to Handle**:
- Multiple dependency blocks (error)
- Empty blocks (warning)
- Invalid package names (error)
- Invalid version syntax (error)
- Scoped packages (@types/node@^20.0.0)
- Comments within block (ignore)
- Malformed blocks (missing closing ///)

---

#### 3. **Dependency Validator**
**Path**: `/mnt/Shared/cs-projects/simple-mcp/mcp/core/inline-deps/validator.ts`
**Lines**: ~200
**Purpose**: Validate package names and version ranges

**Key Functions**:
```typescript
/**
 * Validate npm package name
 * Rules: lowercase, hyphens, no special chars, max 214 chars
 *
 * @example
 * validatePackageName("axios") // => { valid: true }
 * validatePackageName("@types/node") // => { valid: true }
 * validatePackageName("INVALID") // => { valid: false, error: "Must be lowercase" }
 */
export function validatePackageName(name: string): ValidationResult;

/**
 * Validate semver version range
 * Supports: ^, ~, >=, <=, *, x, ||
 *
 * @example
 * validateVersionRange("^1.6.0") // => { valid: true }
 * validateVersionRange(">=2.0.0") // => { valid: true }
 * validateVersionRange("invalid") // => { valid: false, error: "Invalid semver" }
 */
export function validateVersionRange(version: string): ValidationResult;

/**
 * Validate full dependency spec (name + version)
 */
export function validateDependency(name: string, version: string): ValidationResult;

/**
 * Sanitize package name (lowercase, trim)
 */
export function sanitizePackageName(name: string): string;
```

**Validation Rules**:

**Package Name**:
- Lowercase only
- Max 214 characters
- Alphanumeric + hyphens
- No leading/trailing hyphens
- Scoped packages: `@scope/package`
- No shell injection characters: `;`, `|`, `&`, `$`, `` ` ``

**Version Range**:
- Valid semver syntax
- Supports: `^1.0.0`, `~1.0.0`, `>=1.0.0`, `1.x`, `*`, `latest`
- No shell injection characters
- Use `semver` package for validation

**Template**: See plan section 4.3 (lines 1250-1450)

**Security Critical**:
- Prevent shell injection via package names
- Prevent shell injection via version ranges
- No arbitrary code execution
- Strict validation patterns

---

#### 4. **Dependency Utilities**
**Path**: `/mnt/Shared/cs-projects/simple-mcp/mcp/core/inline-deps/utils.ts`
**Lines**: ~150
**Purpose**: Helper functions for dependency management

**Key Functions**:
```typescript
/**
 * Merge inline deps with package.json deps
 * package.json takes precedence on conflicts
 */
export function mergeDependencies(
  inline: Record<string, string>,
  packageJson: Record<string, string>
): {
  merged: Record<string, string>;
  conflicts: string[];
};

/**
 * Format dependencies for display
 */
export function formatDependencies(deps: Record<string, string>): string;

/**
 * Convert ParseResult to simple dependency map
 */
export function toDependencyMap(result: ParseResult): Record<string, string>;

/**
 * Detect scoped package
 */
export function isScopedPackage(name: string): boolean;
```

**Template**: See plan section 4.4 (lines 1450-1600)

---

#### 5. **SimplyMCP Integration**
**Path**: `/mnt/Shared/cs-projects/simple-mcp/mcp/SimplyMCP.ts` (MODIFY EXISTING)
**Lines to Add**: ~100
**Purpose**: Add dependency management to SimplyMCP class

**Changes Required**:

**1. Add to SimplyMCPOptions interface**:
```typescript
export interface SimplyMCPOptions {
  name: string;
  version: string;
  // ... existing options ...

  // NEW: Inline dependencies (Feature 2)
  dependencies?: ParsedDependencies;
}
```

**2. Add ParsedDependencies type**:
```typescript
export interface ParsedDependencies {
  dependencies: InlineDependency[];
  map: Record<string, string>;
  errors: ParseError[];
  warnings: string[];
  raw: string[];
}
```

**3. Add methods to SimplyMCP class**:
```typescript
class SimplyMCP {
  private dependencies?: ParsedDependencies;

  /**
   * Get parsed dependencies
   */
  getDependencies(): ParsedDependencies | undefined {
    return this.dependencies;
  }

  /**
   * Set dependencies (used internally)
   */
  private setDependencies(deps: ParsedDependencies): void {
    this.dependencies = deps;
  }
}
```

**4. Update fromFile() static method**:
```typescript
static async fromFile(
  filePath: string,
  options?: Partial<SimplyMCPOptions>
): Promise<SimplyMCP> {
  // Read source file
  const source = await readFile(filePath, 'utf-8');

  // Parse inline dependencies (NEW)
  const parseResult = parseInlineDependencies(source);

  // Create parsed dependencies object
  const dependencies: ParsedDependencies = {
    dependencies: Object.entries(parseResult.dependencies).map(([name, version]) => ({
      name,
      version,
      raw: `${name}@${version}`
    })),
    map: parseResult.dependencies,
    errors: parseResult.errors,
    warnings: parseResult.warnings,
    raw: parseResult.raw
  };

  // Log warnings and errors
  if (dependencies.warnings.length > 0) {
    console.warn('[SimplyMCP] Dependency warnings:');
    dependencies.warnings.forEach(w => console.warn(`  - ${w}`));
  }

  if (dependencies.errors.length > 0) {
    console.error('[SimplyMCP] Dependency errors:');
    dependencies.errors.forEach(e => console.error(`  - ${e.message}`));
  }

  // Create server with dependencies
  return new SimplyMCP({
    name: options?.name || 'server-from-file',
    version: options?.version || '1.0.0',
    ...options,
    dependencies
  });
}
```

**Template**: See plan section 5.1 (lines 1600-1800)

**Location in File**: Search for `class SimplyMCP` and add after constructor

---

#### 6. **Example Files**
**Path**: `/mnt/Shared/cs-projects/simple-mcp/mcp/examples/inline-deps/`

Create these example files:

**a) basic-inline-deps.ts** (~60 lines)
```typescript
#!/usr/bin/env npx tsx
/**
 * Basic Inline Dependencies Example
 */

// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///

import { SimplyMCP } from '../../SimplyMCP.js';
import axios from 'axios';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'inline-deps-example',
  version: '1.0.0',
});

server.addTool({
  name: 'fetch_data',
  description: 'Fetch data from URL',
  parameters: z.object({
    url: z.string().url(),
  }),
  execute: async (args) => {
    const response = await axios.get(args.url);
    return response.data;
  },
});

await server.start();
```

**b) scoped-packages.ts** (~60 lines)
```typescript
#!/usr/bin/env npx tsx
/**
 * Scoped Packages Example
 */

// /// dependencies
// @types/node@^20.0.0
// @anthropic-ai/sdk@^0.20.0
// ///

import { SimplyMCP } from '../../SimplyMCP.js';
// Example using scoped packages
```

**c) error-handling.ts** (~80 lines)
```typescript
#!/usr/bin/env npx tsx
/**
 * Error Handling Example
 * Demonstrates validation errors
 */

// /// dependencies
// INVALID-PACKAGE@^1.0.0  // Error: uppercase not allowed
// valid-package@invalid   // Error: invalid semver
// ///

import { SimplyMCP } from '../../SimplyMCP.js';
// Shows how errors are reported
```

**Template**: See plan section 6 (lines 1800-2000)

---

### 📦 MODIFY THESE FILES:

#### 1. **Main Index**
**Path**: `/mnt/Shared/cs-projects/simple-mcp/mcp/index.ts`
**Changes**: Add exports for inline dependencies

```typescript
// Existing exports...

// Feature 2: Inline Dependencies (NEW)
export { parseInlineDependencies } from './core/inline-deps/parser.js';
export { validatePackageName, validateVersionRange } from './core/inline-deps/validator.js';
export { mergeDependencies, formatDependencies } from './core/inline-deps/utils.js';

// Types
export type {
  InlineDependency,
  ParseResult,
  ParseError,
  ValidationResult,
  ParsedDependencies
} from './core/inline-deps/types.js';
```

---

#### 2. **Package.json**
**Path**: `/mnt/Shared/cs-projects/simple-mcp/package.json`
**Changes**: Add `semver` dependency

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "1.0.4",
    "zod": "^3.24.1",
    "semver": "^7.6.0"  // NEW for version validation
  }
}
```

**Install it**:
```bash
npm install semver
npm install --save-dev @types/semver
```

---

## 🧪 Testing Requirements

### Unit Tests (60 tests total)

**Create these test files**:

#### 1. **Parser Tests**
**Path**: `/mnt/Shared/cs-projects/simple-mcp/mcp/tests/phase2/test-inline-deps-parser.sh`
**Tests**: 25 tests

```bash
#!/usr/bin/env bash
# Test inline dependency parser

# Test 1: Parse single dependency
# Test 2: Parse multiple dependencies
# Test 3: Parse scoped package (@types/node)
# Test 4: Parse version ranges (^, ~, >=)
# Test 5: Handle empty block
# Test 6: Handle missing block
# Test 7: Handle multiple blocks (error)
# Test 8: Handle malformed block (missing ///)
# Test 9: Clean comment syntax (//, #)
# Test 10: Ignore non-dependency comments
# Test 11: Handle whitespace variations
# Test 12: Parse with inline comments
# Test 13: Parse with blank lines
# Test 14: Extract dependency block
# Test 15: Parse dependency line
# Test 16: Handle invalid format (error)
# Test 17: Handle duplicate packages (error)
# Test 18: Parse exact version (1.6.0)
# Test 19: Parse wildcard (*)
# Test 20: Parse range (1.0.0 - 2.0.0)
# Test 21: Edge case: no dependencies
# Test 22: Edge case: very long package name
# Test 23: Edge case: complex version range
# Test 24: Performance: 100 dependencies
# Test 25: Integration: real server file
```

**Template**: See plan section 7.1.A (lines 2000-2200)

---

#### 2. **Validator Tests**
**Path**: `/mnt/Shared/cs-projects/simple-mcp/mcp/tests/phase2/test-inline-deps-validator.sh`
**Tests**: 20 tests

```bash
#!/usr/bin/env bash
# Test dependency validation

# Test 1: Valid package name (lowercase)
# Test 2: Valid scoped package (@scope/name)
# Test 3: Invalid: uppercase (error)
# Test 4: Invalid: special chars (error)
# Test 5: Invalid: too long (>214 chars, error)
# Test 6: Invalid: leading hyphen (error)
# Test 7: Invalid: trailing hyphen (error)
# Test 8: Valid version: ^1.0.0
# Test 9: Valid version: ~1.0.0
# Test 10: Valid version: >=1.0.0
# Test 11: Valid version: *
# Test 12: Valid version: latest
# Test 13: Invalid version: not-semver (error)
# Test 14: Security: shell injection attempt (error)
# Test 15: Security: command injection (error)
# Test 16: Sanitize: trim whitespace
# Test 17: Sanitize: lowercase conversion
# Test 18: Validate full dependency (name + version)
# Test 19: Edge case: scoped package validation
# Test 20: Edge case: complex version range
```

**Template**: See plan section 7.1.B (lines 2200-2400)

---

#### 3. **Utility Tests**
**Path**: `/mnt/Shared/cs-projects/simple-mcp/mcp/tests/phase2/test-inline-deps-utils.sh`
**Tests**: 15 tests

```bash
#!/usr/bin/env bash
# Test dependency utilities

# Test 1: Merge inline + package.json (no conflict)
# Test 2: Merge with conflict (package.json wins)
# Test 3: Merge with multiple conflicts
# Test 4: Format dependencies for display
# Test 5: Convert ParseResult to map
# Test 6: Detect scoped package (true)
# Test 7: Detect scoped package (false)
# Test 8: Empty merge
# Test 9: Inline-only merge
# Test 10: Package.json-only merge
# Test 11: Conflict detection accuracy
# Test 12: Format empty dependencies
# Test 13: Format single dependency
# Test 14: Format multiple dependencies
# Test 15: Performance: merge 100 dependencies
```

**Template**: See plan section 7.1.C (lines 2400-2600)

---

### Integration Tests (30 tests)

**Path**: `/mnt/Shared/cs-projects/simple-mcp/mcp/tests/phase2/inline-deps-integration.test.ts`

**Use Vitest or Node test runner**:
```typescript
import { describe, test, expect } from 'vitest';
import { parseInlineDependencies } from '../../core/inline-deps/parser.js';
import { SimplyMCP } from '../../SimplyMCP.js';

describe('Inline Dependencies Integration', () => {
  test('Parse from real server file', async () => {
    const source = `
      // /// dependencies
      // axios@^1.6.0
      // ///

      import { SimplyMCP } from 'simply-mcp';
      const server = new SimplyMCP({ name: 'test' });
    `;

    const result = parseInlineDependencies(source);
    expect(result.dependencies).toEqual({ axios: '^1.6.0' });
    expect(result.errors).toHaveLength(0);
  });

  test('SimplyMCP.fromFile() parses dependencies', async () => {
    // Create temp file with inline deps
    // Call SimplyMCP.fromFile()
    // Verify dependencies parsed
  });

  // ... 28 more tests
});
```

**Template**: See plan section 7.2 (lines 2600-3000)

---

### Test Runner

**Path**: `/mnt/Shared/cs-projects/simple-mcp/mcp/tests/phase2/run-inline-deps-tests.sh`

```bash
#!/usr/bin/env bash
# Master test runner for Feature 2

echo "Running Phase 2, Feature 2 Tests: Inline Dependencies"
echo "========================================================"

# Unit tests
echo ""
echo "Unit Tests:"
echo "-----------"
bash ./test-inline-deps-parser.sh
bash ./test-inline-deps-validator.sh
bash ./test-inline-deps-utils.sh

# Integration tests
echo ""
echo "Integration Tests:"
echo "------------------"
npx vitest run inline-deps-integration.test.ts

# Summary
echo ""
echo "========================================================"
echo "Test Summary:"
echo "  Unit Tests: 60"
echo "  Integration Tests: 30"
echo "  Total: 90 tests"
echo "========================================================"
```

---

## 📝 Implementation Checklist

Copy this checklist and check off as you complete each item:

### Day 1-3: Core Parser
- [ ] Install dependencies: `npm install semver @types/semver`
- [ ] Create `mcp/core/inline-deps/` directory
- [ ] Create `types.ts` (150 lines)
  - [ ] Define `InlineDependency` interface
  - [ ] Define `ParseResult` interface
  - [ ] Define `ParseError` interface
  - [ ] Define `ValidationResult` interface
- [ ] Create `parser.ts` (300 lines)
  - [ ] Implement `parseInlineDependencies()` main function
  - [ ] Implement `extractDependencyBlock()`
  - [ ] Implement `parseDependencyLine()`
  - [ ] Implement `cleanCommentSyntax()`
  - [ ] Handle edge cases (empty blocks, multiple blocks, malformed)
  - [ ] Add comprehensive error messages
- [ ] Write parser tests (25 tests)
  - [ ] Create `test-inline-deps-parser.sh`
  - [ ] Test all happy paths
  - [ ] Test all error cases
  - [ ] Test edge cases
  - [ ] Run tests: `bash test-inline-deps-parser.sh`
  - [ ] Verify all 25 tests pass

### Day 4-5: Validation
- [ ] Create `validator.ts` (200 lines)
  - [ ] Implement `validatePackageName()`
  - [ ] Implement `validateVersionRange()` (use `semver` package)
  - [ ] Implement `validateDependency()`
  - [ ] Implement `sanitizePackageName()`
  - [ ] Add security checks (shell injection prevention)
  - [ ] Add regex patterns for validation
- [ ] Write validator tests (20 tests)
  - [ ] Create `test-inline-deps-validator.sh`
  - [ ] Test package name validation
  - [ ] Test version range validation
  - [ ] Test security checks
  - [ ] Run tests: `bash test-inline-deps-validator.sh`
  - [ ] Verify all 20 tests pass

### Day 6-7: Integration & Utilities
- [ ] Create `utils.ts` (150 lines)
  - [ ] Implement `mergeDependencies()`
  - [ ] Implement `formatDependencies()`
  - [ ] Implement `toDependencyMap()`
  - [ ] Implement `isScopedPackage()`
- [ ] Write utils tests (15 tests)
  - [ ] Create `test-inline-deps-utils.sh`
  - [ ] Test merge functionality
  - [ ] Test formatting
  - [ ] Run tests: `bash test-inline-deps-utils.sh`
  - [ ] Verify all 15 tests pass
- [ ] Modify `SimplyMCP.ts` (~100 lines added)
  - [ ] Add `dependencies` field to `SimplyMCPOptions`
  - [ ] Add `ParsedDependencies` type
  - [ ] Add `getDependencies()` method
  - [ ] Update `fromFile()` to parse inline deps
  - [ ] Add warning/error logging
- [ ] Update `mcp/index.ts`
  - [ ] Export parser functions
  - [ ] Export validator functions
  - [ ] Export utility functions
  - [ ] Export types

### Day 8-9: Testing
- [ ] Create integration tests (30 tests)
  - [ ] Create `inline-deps-integration.test.ts`
  - [ ] Test `parseInlineDependencies()` with real files
  - [ ] Test `SimplyMCP.fromFile()` integration
  - [ ] Test merge with package.json
  - [ ] Test error propagation
  - [ ] Test all three API styles (Decorator, Functional, Programmatic)
  - [ ] Run tests: `npx vitest run inline-deps-integration.test.ts`
  - [ ] Verify all 30 tests pass
- [ ] Create test runner
  - [ ] Create `run-inline-deps-tests.sh`
  - [ ] Integrate all test suites
  - [ ] Add summary reporting
  - [ ] Run full suite: `bash run-inline-deps-tests.sh`
  - [ ] Verify all 90 tests pass (60 unit + 30 integration)
- [ ] Manual testing
  - [ ] Test with real server files
  - [ ] Test all example files
  - [ ] Verify warnings display correctly
  - [ ] Verify errors display correctly

### Day 10: Documentation & Examples
- [ ] Create example files
  - [ ] Create `mcp/examples/inline-deps/` directory
  - [ ] Create `basic-inline-deps.ts`
  - [ ] Create `scoped-packages.ts`
  - [ ] Create `error-handling.ts`
  - [ ] Test all examples: `npx tsx examples/inline-deps/*.ts`
- [ ] Update documentation
  - [ ] Update main README.md with Feature 2 section
  - [ ] Add inline dependencies guide to `mcp/docs/`
  - [ ] Document syntax and rules
  - [ ] Add troubleshooting section
- [ ] Code review
  - [ ] Review all code for consistency
  - [ ] Check error messages are helpful
  - [ ] Verify TypeScript types are correct
  - [ ] Ensure no console.log() left in code (use logger)
  - [ ] Run linter: `npm run lint`
  - [ ] Fix any linting errors
- [ ] Final verification
  - [ ] Run all tests: `bash run-inline-deps-tests.sh`
  - [ ] Verify 100% pass rate (90/90 tests)
  - [ ] Run build: `npm run build`
  - [ ] Verify no TypeScript errors
  - [ ] Test examples work
  - [ ] Update CHANGELOG.md

---

## ✅ Success Criteria

Feature 2 is complete when:

- [ ] All 90 tests pass (60 unit + 30 integration)
- [ ] TypeScript compiles without errors
- [ ] Code follows existing patterns in codebase
- [ ] Examples work and demonstrate all features
- [ ] Documentation is complete and accurate
- [ ] `SimplyMCP.fromFile()` successfully parses inline dependencies
- [ ] Dependencies can be retrieved via `server.getDependencies()`
- [ ] Warnings and errors are logged appropriately
- [ ] Security validation prevents shell injection
- [ ] Scoped packages (@scope/package) work correctly
- [ ] Merge with package.json works (package.json wins conflicts)

**Acceptance Test**:
```typescript
// Create this file and run it
// File: acceptance-test.ts

// /// dependencies
// axios@^1.6.0
// @types/node@^20.0.0
// ///

import { SimplyMCP } from './mcp/SimplyMCP.js';

const server = await SimplyMCP.fromFile('./acceptance-test.ts');
const deps = server.getDependencies();

console.log('Parsed dependencies:', deps?.map);
// Expected: { axios: '^1.6.0', '@types/node': '^20.0.0' }

console.log('Errors:', deps?.errors);
// Expected: []

console.log('Warnings:', deps?.warnings);
// Expected: []

console.log('✅ Feature 2 working!');
```

Run: `npx tsx acceptance-test.ts`

Expected output:
```
Parsed dependencies: { axios: '^1.6.0', '@types/node': '^20.0.0' }
Errors: []
Warnings: []
✅ Feature 2 working!
```

---

## 🚨 Common Pitfalls to Avoid

1. **Don't forget `.js` extensions in imports**
   ```typescript
   // ✅ Correct
   import { parseInlineDependencies } from './parser.js';

   // ❌ Wrong
   import { parseInlineDependencies } from './parser';
   ```

2. **Always validate user input (security!)**
   - Package names can contain injection attacks
   - Version ranges can contain shell commands
   - Use strict validation patterns

3. **Handle scoped packages correctly**
   ```typescript
   // Valid scoped package
   "@types/node@^20.0.0"

   // Parse as: name="@types/node", version="^20.0.0"
   ```

4. **Package.json always wins on conflicts**
   ```typescript
   // Inline: axios@^1.6.0
   // package.json: axios@^1.5.0
   // Result: axios@^1.5.0 (package.json wins)
   ```

5. **Use semver package for version validation**
   ```typescript
   import semver from 'semver';

   // Validate version range
   const valid = semver.validRange(version);
   if (!valid) {
     // Error: invalid semver
   }
   ```

6. **Test edge cases**
   - Empty dependency blocks
   - Multiple dependency blocks
   - Malformed blocks
   - Very long package names
   - Complex version ranges

---

## 🔗 Resources

### Read These First
1. **Feature 2 Plan**: `/mnt/Shared/cs-projects/simple-mcp/mcp/PHASE2_FEATURE2_PLAN.md`
   - Complete implementation guide (1,800 lines)
   - All function signatures and examples
   - Comprehensive test scenarios

2. **Existing Codebase Patterns**:
   - `/mnt/Shared/cs-projects/simple-mcp/mcp/SimplyMCP.ts` - Main class
   - `/mnt/Shared/cs-projects/simple-mcp/mcp/core/types.ts` - Type patterns
   - `/mnt/Shared/cs-projects/simple-mcp/mcp/examples/` - Example patterns

3. **PEP 723 Reference** (Python inspiration):
   - https://peps.python.org/pep-0723/
   - Our implementation adapts this for TypeScript/npm

### NPM Packages
- **semver**: Version validation
  - Docs: https://github.com/npm/node-semver
  - Use: `semver.validRange(version)`

### Testing
- **Vitest**: Integration tests
  - Existing setup in project
  - Run: `npx vitest run`

- **Bash Scripts**: Unit tests
  - Follow existing pattern in `mcp/tests/phase2/`

---

## 📞 Questions & Support

If you get stuck or have questions:

1. **Check the plan first**: `/mnt/Shared/cs-projects/simple-mcp/mcp/PHASE2_FEATURE2_PLAN.md`
   - Contains detailed examples for every function
   - Has edge cases documented
   - Includes error handling patterns

2. **Look at existing code**:
   - Similar patterns exist in the codebase
   - Follow TypeScript conventions used in `SimplyMCP.ts`
   - Match test patterns from `mcp/tests/`

3. **Key Decision Points**:
   - **Multiple dependency blocks**: Error (only allow one)
   - **Conflict resolution**: package.json always wins
   - **Validation strictness**: Fail fast with clear errors
   - **Security**: No shell injection allowed

---

## 🎯 Start Here

**First Task**: Create the directory structure and types

```bash
cd /mnt/Shared/cs-projects/simple-mcp/mcp

# Create directory
mkdir -p core/inline-deps

# Create types file
touch core/inline-deps/types.ts

# Open in editor and start with the interface definitions
# Follow the plan section 4.1 for exact code
```

**Then**: Proceed through the checklist in order (Days 1-10)

---

## 📊 Progress Tracking

As you complete each day, update this section:

- [ ] **Day 1-3**: Core Parser (parser.ts, 25 tests)
- [ ] **Day 4-5**: Validation (validator.ts, 20 tests)
- [ ] **Day 6-7**: Integration (SimplyMCP.ts, utils.ts, 15 tests)
- [ ] **Day 8-9**: Testing (integration tests, 30 tests)
- [ ] **Day 10**: Documentation & Examples

**Current Status**: Not started
**Blocked By**: N/A
**Notes**: Ready to begin implementation

---

**Good luck! This is a well-defined feature with clear success criteria. Follow the plan, write tests as you go, and you'll have Feature 2 complete in 10 days! 🚀**
