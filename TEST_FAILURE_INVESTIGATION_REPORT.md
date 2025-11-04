# Test Failure Investigation Report

**Date**: 2025-10-31
**Project**: Simply MCP TypeScript v4.0.0
**Investigator**: AI Assistant (Claude)
**Total Failing Tests**: 118 tests across 19 suites

---

## Executive Summary

This report analyzes **118 failing tests across 19 test suites** (9% of total 1,313 tests). Investigation reveals that failures fall into **4 primary categories**:

### Key Findings

| Category | Suites | Tests | Root Cause | Recommendation |
|----------|--------|-------|------------|----------------|
| **Missing Export/API** | 3 | ~30 | BuildMCPServer, BuildMCPServerOptions not exported from main index | **QUICK FIX** - Add exports |
| **Missing File** | 2 | ~10 | auth-adapter.js doesn't exist | **REMOVE/RELOCATE** - Tests or create file |
| **Wrong Import Paths** | 1 | 18 | interface-types.js imported from wrong location | **QUICK FIX** - Fix import paths |
| **Missing Interface Property** | 8 | ~50 | Tests missing `description` on IServer interfaces | **UPDATE TESTS** - Add description field |
| **Parser Logic Change** | 5 | ~10 | Interface API parsing logic changed | **UPDATE TESTS** - Fix to match new API |

### Recommendations Priority

1. **HIGH PRIORITY - Quick Wins (Est: 2-4 hours)**
   - Fix exports for BuildMCPServer and BuildMCPServerOptions
   - Fix interface-types.js import paths in mime-types tests

2. **MEDIUM PRIORITY - Test Updates (Est: 4-8 hours)**
   - Update all test fixtures to include `description` property on IServer interfaces
   - Update interface-api tests to match current parser behavior

3. **LOW PRIORITY - Cleanup (Est: 1-2 hours)**
   - Remove auth-adapter tests (file doesn't exist) or create the adapter
   - Document which tests are for future features vs bugs

### Projected Test Health After Fixes

- **Current**: 90.2% passing (1,184/1,313 tests)
- **After Quick Wins**: ~93.5% passing (+40 tests fixed)
- **After All Fixes**: **98-100% passing** (+118 tests fixed)

---

## Detailed Analysis by Category

## Category 1: Missing Exports from Main Index (3 suites, ~30 tests)

### Root Cause
`BuildMCPServer` and `BuildMCPServerOptions` are defined in `src/server/builder-server.ts` and `src/server/builder-types.ts` but **NOT exported** from `src/index.ts`.

### Affected Suites

#### 1.1 `tests/unit/ui-adapter.test.ts` - COMPILATION ERROR
- **Status**: Test suite fails to run
- **Import**: `import { BuildMCPServer } from '../../src/api/programmatic/BuildMCPServer.js';`
- **Issue**: Path `src/api/programmatic/` doesn't exist; BuildMCPServer not exported from main index
- **Tests Affected**: All 10+ tests in suite
- **Error**:
  ```
  Cannot find module '../../src/api/programmatic/BuildMCPServer.js'
  ```

#### 1.2 `tests/test-http-modes.test.ts` - COMPILATION ERROR
- **Status**: Test suite fails to run
- **Import**:
  ```typescript
  import { BuildMCPServer } from '../src/index.js';
  import type { BuildMCPServerOptions } from '../src/index.js';
  ```
- **Issue**: `BuildMCPServerOptions` type not exported from index
- **Tests Affected**: ~10 tests

#### 1.3 `tests/integration/context-injection.test.ts` - COMPILATION ERROR
- **Status**: Test suite fails to run
- **Import**: `import { BuildMCPServer } from '../../src/api/programmatic/BuildMCPServer.js';`
- **Issue**: Wrong path + not exported
- **Tests Affected**: ~5 tests

### Recommendation: **FIX - Add Exports**

**Complexity**: EASY (15 minutes)

**Action**: Add to `src/index.ts`:

```typescript
// Programmatic API
export { BuildMCPServer } from './server/builder-server.js';
export type { BuildMCPServerOptions } from './server/builder-types.js';
```

**Also update test imports** to use:
```typescript
import { BuildMCPServer, type BuildMCPServerOptions } from 'simply-mcp';
// or for tests:
import { BuildMCPServer } from '../../src/index.js';
```

---

## Category 2: Missing File (2 suites, ~10 tests)

### Root Cause
Tests import `src/auth-adapter.js` which **does not exist** in the codebase.

### Affected Suites

#### 2.1 `tests/unit/auth-adapter.test.ts` - COMPILATION ERROR
- **Status**: Test suite fails to run
- **Import**: `import { authConfigFromParsed } from '../../src/auth-adapter.js';`
- **Issue**: File `src/auth-adapter.js` does not exist
- **Tests Affected**: All ~10 tests
- **Error**:
  ```
  Cannot find module '../../src/auth-adapter.js'
  ```

### Investigation
- Searched codebase: `find src -name "*auth-adapter*"` → No results
- Auth handling exists in `src/adapters/` but no `auth-adapter.ts` file

### Recommendation: **REMOVE or CREATE**

**Option A: Remove Tests** (EASY - 5 minutes)
- If auth-adapter was deprecated/removed, delete test file
- Update jest.config.js to exclude if needed

**Option B: Create Adapter** (HARD - 4-8 hours)
- Implement `src/adapters/auth-adapter.ts` with `authConfigFromParsed()` function
- Requires understanding auth conversion logic from ParsedAuth to SecurityConfig

**Decision Needed**: Check git history to see if this was intentionally removed or never implemented.

```bash
git log --all --grep="auth-adapter" --oneline
git log --all -- "**/auth-adapter*" --oneline
```

---

## Category 3: Wrong Import Paths (1 suite, 18 tests)

### Root Cause
Tests generate fixture files with incorrect import paths for type definitions.

### Affected Suites

#### 3.1 `tests/unit/mime-types-uri-list.test.ts` - 18/20 FAILING
- **Status**: 2 passing, 18 failing
- **Issue**: Dynamic fixture generation uses wrong import path
- **Tests Affected**: 18 tests
- **Error**:
  ```
  Cannot find module '../../src/server/interface-types.js'
  ```

### Details

The test dynamically creates fixture files like:

```typescript
writeFileSync(testFile, `
import type { IUI, IServer } from '../../src/server/interface-types.js';
// ❌ WRONG: interface-types.js doesn't exist at this path
// ✅ CORRECT: Should be '../../src/index.js' or '../../../src/index.js'
`);
```

**Correct path depends on fixture location**:
- If fixture in `tests/fixtures/`: `../../src/index.js`
- If generated in temp dir: Full path or different relative

### Failing Tests
1. "should return text/uri-list when externalUrl is present"
2. "should return text/html when externalUrl is absent"
3. "should accept valid HTTP URLs"
4. "should accept valid HTTPS URLs"
5. "should handle URLs with query parameters"
6. "should handle URLs with fragments"
7. "should handle URLs with special characters (encoded)"
8. "should handle file:// URLs"
9. "should have correct resource format"
10. "should contain only the URL in text field (no HTML wrapper)"
11. "should not inject tool helpers for external URLs"
12. "should use name from interface if provided"
13. "externalUrl takes precedence over html content"
14. "should reject conflicting fields (externalUrl + html)"
15. "should handle international domain names"
16. "should handle URLs with port numbers"
17. "should handle URLs with authentication info"
18. "should reject invalid URL format" (different error - expects validation)

### Recommendation: **FIX - Update Import Paths**

**Complexity**: EASY (30 minutes)

**Action**: Update test file `tests/unit/mime-types-uri-list.test.ts`:

Find all instances of:
```typescript
import type { IUI, IServer } from '../../src/server/interface-types.js';
```

Replace with:
```typescript
import type { IUI, IServer } from '../../src/index.js';
```

**Note**: The handoff mentions this was already attempted but tests still fail. Need to verify:
1. Are ALL fixture generation calls updated?
2. Is the import path calculation correct based on fixture location?

---

## Category 4: Missing Interface Property (8 suites, ~50 tests)

### Root Cause
Tests create IServer interface instances **without** the `description` property, which is now **required** by the parser.

### Parser Behavior (src/server/parser.ts:2067)
```typescript
if (!description) {
  console.warn(`Server interface ${interfaceName} missing required 'description' property`);
  return null; // ❌ Parsing fails
}
```

### Affected Suites

#### 4.1 `tests/phase2/bundle-integration.test.ts` - MANY FAILURES
- **Tests Affected**: ~8-10 tests
- **Issue**: Test fixtures missing `description` on IServer
- **Example**:
  ```typescript
  interface TestServer extends IServer {
    name: 'test';
    version: '1.0.0';
    // ❌ Missing: description: string;
  }
  ```
- **Fix**: Add `description: 'Test server';` to all IServer interfaces

#### 4.2 `tests/phase2/bundle-advanced-integration.test.ts` - MANY FAILURES
- **Tests Affected**: ~6-8 tests
- **Same Issue**: Missing `description` property

#### 4.3 `tests/phase2/cross-feature-integration.test.ts` - FAILURES
- **Tests Affected**: ~5 tests
- **Same Issue**: Missing `description` property

#### 4.4 `tests/phase2/auto-install-integration.test.ts` - FAILURES
- **Tests Affected**: ~5 tests
- **Same Issue**: Missing `description` property

#### 4.5 `tests/phase2/inline-deps-integration.test.ts` - FAILURES
- **Tests Affected**: ~4 tests
- **Same Issue**: Missing `description` property

#### 4.6 `tests/unit/entry-detector.test.ts` - MANY FAILURES
- **Tests Affected**: ~10 tests
- **Issue**: Missing `description` on test server interfaces
- **Error Pattern**:
  ```
  No interface-driven server entry point found.
  ```
  (Because parser returns null when description missing)

#### 4.7 `tests/e2e/simple-message.test.ts` - FAILURES
- **Tests Affected**: ~3 tests
- **Same Issue**: Missing `description` property

#### 4.8 `tests/integration/ui-workflow.test.ts` - FAILURES
- **Tests Affected**: ~3 tests
- **Same Issue**: Missing `description` property

### Recommendation: **UPDATE TESTS - Add Description Property**

**Complexity**: MEDIUM (4-6 hours to update all test fixtures)

**Action**: Systematically update all test fixtures in phase2/ and integration/ tests:

**Pattern to find**:
```bash
grep -r "extends IServer" tests/ | grep -v "description:"
```

**Fix pattern**:
```typescript
// Before (❌ FAILS)
interface TestServer extends IServer {
  name: 'test';
  version: '1.0.0';
}

// After (✅ PASSES)
interface TestServer extends IServer {
  name: 'test';
  version: '1.0.0';
  description: 'Test server for integration testing';
}
```

**Estimated Changes**:
- ~8 test files affected
- ~30-50 interface definitions to update
- Can be partially automated with find/replace

---

## Category 5: Parser Logic Changes (5 suites, ~10 tests)

### Root Cause
Interface-driven API parser logic has changed, but tests still expect old behavior.

### Affected Suites

#### 5.1 `tests/unit/interface-api/basic.test.ts` - 11/20 FAILING
- **Status**: 9 passing, 11 failing
- **Issue**: Tests expect `methodName`, `description`, `paramsType`, `resultType` properties that parser no longer provides
- **Failing Assertions**:
  ```typescript
  expect(addTool?.methodName).toBe('addNumbers'); // methodName is undefined
  expect(addTool?.description).toBe('Add two numbers'); // description is undefined
  expect(paramsType).toContain('a'); // paramsType is ""
  expect(addTool?.resultType).toBe('number'); // resultType is undefined
  ```

**Analysis**: Parser output structure changed. Need to check current ParseResult type.

#### 5.2 `tests/unit/interface-api/auto-export.test.ts` - FAILURES
- **Issue**: Tests for named export support (`export class` vs `export default class`)
- **Need to verify**: Is this feature still supported?

#### 5.3 `tests/unit/interface-api/static-resource.test.ts` - FAILURES
- **Issue**: Static resource pattern tests failing
- **Need to investigate**: Has resource API changed?

#### 5.4 `tests/unit/interface-api/object-resource.test.ts` - FAILURES
- **Issue**: Object resource pattern tests failing
- **Need to investigate**: Has resource API changed?

#### 5.5 `tests/unit/interface-api/database-resource.test.ts` - FAILURES
- **Issue**: Database resource tests failing
- **Need to investigate**: SQLite integration tests

#### 5.6 `tests/unit/ui-parser.test.ts` - FAILURES
- **Issue**: UI parsing tests failing
- **Need to investigate**: Has parseUIInterface() behavior changed?

### Recommendation: **INVESTIGATE THEN UPDATE**

**Complexity**: MEDIUM-HARD (6-10 hours)

**Action Plan**:

1. **Understand Current Parser API** (1 hour)
   - Read `src/server/parser.ts` to understand current ParseResult structure
   - Check what properties are actually returned for tools/resources
   - Compare to test expectations

2. **Update Tests to Match Reality** (4-8 hours)
   - Update `basic.test.ts` to check correct properties
   - Fix static-resource, object-resource, database-resource tests
   - Update ui-parser tests for current behavior

3. **Verify Feature Support** (1 hour)
   - Check if named exports still supported (auto-export.test.ts)
   - Verify all resource patterns still work

---

## Categorization Matrix

| Suite | Pass | Fail | Category | Root Cause | Priority | Effort | Recommendation |
|-------|------|------|----------|------------|----------|--------|----------------|
| mime-types-uri-list.test.ts | 2 | 18 | Cat 3 | Wrong import paths | HIGH | 0.5h | FIX imports |
| ui-adapter.test.ts | 0 | 10+ | Cat 1 | Missing export | HIGH | 0.25h | Add exports |
| test-http-modes.test.ts | 0 | 10 | Cat 1 | Missing export | HIGH | 0.25h | Add exports |
| context-injection.test.ts | 0 | 5 | Cat 1 | Missing export | HIGH | 0.25h | Add exports |
| auth-adapter.test.ts | 0 | 10 | Cat 2 | Missing file | LOW | 0.1h or 8h | Remove or create |
| bundle-integration.test.ts | 0 | 10 | Cat 4 | No description | MED | 1h | Add description |
| bundle-advanced-integration.test.ts | 0 | 8 | Cat 4 | No description | MED | 1h | Add description |
| cross-feature-integration.test.ts | 0 | 5 | Cat 4 | No description | MED | 0.5h | Add description |
| auto-install-integration.test.ts | 0 | 5 | Cat 4 | No description | MED | 0.5h | Add description |
| inline-deps-integration.test.ts | 0 | 4 | Cat 4 | No description | MED | 0.5h | Add description |
| entry-detector.test.ts | 0 | 10 | Cat 4 | No description | MED | 1h | Add description |
| simple-message.test.ts | 0 | 3 | Cat 4 | No description | MED | 0.5h | Add description |
| ui-workflow.test.ts | 0 | 3 | Cat 4 | No description | MED | 0.5h | Add description |
| basic.test.ts | 9 | 11 | Cat 5 | Parser API change | MED | 2h | Update tests |
| auto-export.test.ts | 0 | ? | Cat 5 | Feature check needed | MED | 1h | Investigate |
| static-resource.test.ts | 0 | ? | Cat 5 | API change | MED | 1h | Investigate |
| object-resource.test.ts | 0 | ? | Cat 5 | API change | MED | 1h | Investigate |
| database-resource.test.ts | 0 | ? | Cat 5 | API change | MED | 1h | Investigate |
| ui-parser.test.ts | 0 | ? | Cat 5 | API change | MED | 1h | Investigate |

---

## Prioritized Action Plan

### Phase 1: Quick Wins (Est: 2-3 hours) ✅ HIGH PRIORITY

These fixes will resolve **~48 tests** with minimal effort.

#### Task 1.1: Add Missing Exports (15 minutes)
```typescript
// File: src/index.ts
// Add after existing exports:

export { BuildMCPServer } from './server/builder-server.js';
export type { BuildMCPServerOptions } from './server/builder-types.js';
```

**Tests Fixed**:
- ui-adapter.test.ts (~10 tests)
- test-http-modes.test.ts (~10 tests)
- context-injection.test.ts (~5 tests)

**Also Update Test Imports** to use correct path:
```typescript
// Change from:
import { BuildMCPServer } from '../../src/api/programmatic/BuildMCPServer.js';

// To:
import { BuildMCPServer } from '../../src/index.js';
```

#### Task 1.2: Fix MIME Types Import Paths (30 minutes)
```bash
# File: tests/unit/mime-types-uri-list.test.ts
# Find all dynamic fixture generation
# Update import statements from:
import type { IUI, IServer } from '../../src/server/interface-types.js';

# To:
import type { IUI, IServer } from '../../src/index.js';
```

**Tests Fixed**: mime-types-uri-list.test.ts (18 tests)

#### Task 1.3: Run Tests to Verify (5 minutes)
```bash
npx jest tests/unit/ui-adapter.test.ts --no-coverage
npx jest tests/test-http-modes.test.ts --no-coverage
npx jest tests/unit/mime-types-uri-list.test.ts --no-coverage
```

**Expected Result**: ~33 tests now passing

---

### Phase 2: Test Fixture Updates (Est: 4-6 hours) ⚠️ MEDIUM PRIORITY

These fixes will resolve **~50 tests** by updating test fixtures.

#### Task 2.1: Update Phase2 Integration Tests (3 hours)

**Script to help find all instances**:
```bash
#!/bin/bash
# Find all IServer interface definitions missing description

grep -rn "extends IServer" tests/phase2/ tests/integration/ tests/e2e/ | \
  while read line; do
    file=$(echo $line | cut -d: -f1)
    linenum=$(echo $line | cut -d: -f2)

    # Check if description exists in next 5 lines
    if ! sed -n "${linenum},$((linenum+5))p" "$file" | grep -q "description:"; then
      echo "Missing description: $file:$linenum"
    fi
  done
```

**Manual fixes needed in**:
- `tests/phase2/bundle-integration.test.ts` (~8 interfaces)
- `tests/phase2/bundle-advanced-integration.test.ts` (~6 interfaces)
- `tests/phase2/cross-feature-integration.test.ts` (~5 interfaces)
- `tests/phase2/auto-install-integration.test.ts` (~5 interfaces)
- `tests/phase2/inline-deps-integration.test.ts` (~4 interfaces)
- `tests/unit/entry-detector.test.ts` (~10 interfaces)
- `tests/e2e/simple-message.test.ts` (~3 interfaces)
- `tests/integration/ui-workflow.test.ts` (~3 interfaces)

**Example Fix**:
```typescript
// Before
interface TestServer extends IServer {
  name: 'test';
  version: '1.0.0';
}

// After
interface TestServer extends IServer {
  name: 'test';
  version: '1.0.0';
  description: 'Test server for integration testing';
}
```

#### Task 2.2: Run Tests to Verify (30 minutes)
```bash
npx jest tests/phase2/ --no-coverage
npx jest tests/integration/ --no-coverage
npx jest tests/e2e/ --no-coverage
npx jest tests/unit/entry-detector.test.ts --no-coverage
```

**Expected Result**: ~50 more tests passing

---

### Phase 3: Parser API Investigation (Est: 6-10 hours) ⚠️ MEDIUM PRIORITY

These fixes require understanding parser changes first.

#### Task 3.1: Document Current Parser API (2 hours)

1. Read `src/server/parser.ts` thoroughly
2. Document actual ParseResult structure
3. Identify what changed from tests' expectations
4. Create migration guide for tests

#### Task 3.2: Update Interface API Tests (3-6 hours)

- Fix `basic.test.ts` (11 failing tests)
- Investigate and fix `auto-export.test.ts`
- Investigate and fix `static-resource.test.ts`
- Investigate and fix `object-resource.test.ts`
- Investigate and fix `database-resource.test.ts`
- Investigate and fix `ui-parser.test.ts`

#### Task 3.3: Verify All Patterns Still Supported (1 hour)

Ensure these patterns still work:
- Named exports (`export class` vs `export default class`)
- Static resources
- Object resources
- Database resources
- UI parsing

---

### Phase 4: Cleanup (Est: 1-2 hours) 🔧 LOW PRIORITY

#### Task 4.1: Resolve Auth Adapter Tests (1 hour)

**Option A: Remove Tests** (if feature deprecated)
```bash
rm tests/unit/auth-adapter.test.ts
# Update test documentation
```

**Option B: Implement Adapter** (8+ hours - DEFER)
- Create `src/adapters/auth-adapter.ts`
- Implement `authConfigFromParsed()` function
- Requires full auth conversion logic

**Recommendation**: Check git history first:
```bash
git log --all --grep="auth-adapter" --oneline
git log --all -- "**/auth-adapter*" --oneline
```

If no history, likely was never implemented → **Remove tests**

---

## Expected Outcomes by Phase

| Phase | Effort | Tests Fixed | Cumulative Passing | Pass Rate |
|-------|--------|-------------|--------------------|-----------|
| **Baseline** | - | - | 1,184 | 90.2% |
| **After Phase 1** | 2-3h | 33 tests | 1,217 | 92.7% |
| **After Phase 2** | 4-6h | 50 tests | 1,267 | 96.5% |
| **After Phase 3** | 6-10h | 25 tests | 1,292 | 98.4% |
| **After Phase 4** | 1-2h | 10 tests | 1,302 | 99.2% |

---

## Risk Assessment

### Low Risk Fixes (Phase 1)
- ✅ Adding exports: Safe, non-breaking change
- ✅ Fixing import paths: Isolated to tests

### Medium Risk Fixes (Phase 2)
- ⚠️ Adding description property: Verify this is the intended API
- ⚠️ Ensure description is actually required in production code

### High Risk Areas (Phase 3)
- 🔴 Parser API changes: Need to understand if intentional or regression
- 🔴 Resource patterns: May indicate breaking API changes
- 🔴 Named export support: Feature may have been removed

### Recommended Validation
After each phase, run:
```bash
# Full test suite
npx jest --passWithNoTests --no-coverage

# Verify no regressions in passing tests
npx jest tests/unit/client/ --no-coverage

# Check build still works
npm run build
```

---

## Conclusion

### Summary

- **118 failing tests** analyzed across **19 suites**
- **4 root cause categories** identified
- **Clear action plan** with effort estimates
- **Quick wins available**: ~33 tests fixable in 2-3 hours
- **Full resolution**: All 118 tests fixable in 13-21 hours total

### Recommendations

1. **Start with Phase 1** (Quick Wins) - High impact, low effort
2. **Verify Phase 2 changes** align with intended API design
3. **Escalate Phase 3** if parser changes were unintentional
4. **Defer Phase 4** until decision on auth-adapter made

### Questions for Product Owner

1. **Is `description` property intended to be required on IServer?**
   - If yes, update documentation
   - If no, make parser more lenient

2. **Was auth-adapter feature removed intentionally?**
   - Should we delete those tests?
   - Or implement the feature?

3. **Did parser API intentionally change?**
   - Are methodName, description, paramsType, resultType properties deprecated?
   - Should tests be updated or is this a regression?

---

**Report Generated**: 2025-10-31
**Next Action**: Review with team, prioritize phases, begin Phase 1 implementation
