# Quick Wins - Test Failure Fixes

**Priority**: HIGH
**Estimated Time**: 2-3 hours
**Tests Fixed**: ~33 tests (28% of all failing tests)
**Impact**: Improves test pass rate from 90.2% → 92.7%

---

## Overview

This document contains **quick, high-impact fixes** that can resolve **33 failing tests** with minimal effort and risk. These fixes address **missing exports** and **incorrect import paths**.

---

## Quick Win #1: Add Missing Exports (15 minutes)

### Problem
`BuildMCPServer` and `BuildMCPServerOptions` are defined in the codebase but not exported from the main `src/index.ts` file.

### Impact
- **Tests Fixed**: 25 tests across 3 suites
- **Suites Fixed**:
  - `tests/unit/ui-adapter.test.ts` (~10 tests)
  - `tests/test-http-modes.test.ts` (~10 tests)
  - `tests/integration/context-injection.test.ts` (~5 tests)

### Solution

#### Step 1: Add Exports to src/index.ts

**File**: `src/index.ts`

**Add these lines** after the existing exports (around line 150):

```typescript
// ============================================================================
// Programmatic API
// ============================================================================
export { BuildMCPServer } from './server/builder-server.js';
export type { BuildMCPServerOptions } from './server/builder-types.js';
```

#### Step 2: Update Test Imports

**File**: `tests/unit/ui-adapter.test.ts`

**Change line 7** from:
```typescript
import { BuildMCPServer } from '../../src/api/programmatic/BuildMCPServer.js';
```

**To**:
```typescript
import { BuildMCPServer } from '../../src/index.js';
```

**File**: `tests/integration/context-injection.test.ts`

**Change import** from:
```typescript
import { BuildMCPServer } from '../../src/api/programmatic/BuildMCPServer.js';
```

**To**:
```typescript
import { BuildMCPServer } from '../../src/index.js';
```

**File**: `tests/test-http-modes.test.ts`

**Verify imports are**:
```typescript
import { BuildMCPServer } from '../src/index.js';
import type { BuildMCPServerOptions } from '../src/index.js';
```
(These are already correct, just need the export added)

#### Step 3: Verify Fix

```bash
# Test each suite individually
npx jest tests/unit/ui-adapter.test.ts --no-coverage
npx jest tests/test-http-modes.test.ts --no-coverage
npx jest tests/integration/context-injection.test.ts --no-coverage
```

**Expected Result**: All tests should now pass (or at least compile without import errors)

---

## Quick Win #2: Fix MIME Types Import Paths (30 minutes)

### Problem
The `mime-types-uri-list.test.ts` file dynamically generates test fixtures with incorrect import paths.

### Impact
- **Tests Fixed**: 18 tests in 1 suite
- **Suite Fixed**: `tests/unit/mime-types-uri-list.test.ts`

### Solution

#### Step 1: Identify Fixture Generation Code

**File**: `tests/unit/mime-types-uri-list.test.ts`

Look for lines like:
```typescript
import type { IUI, IServer } from '../../src/server/interface-types.js';
```

These appear in dynamically generated fixture code using `writeFileSync()`.

#### Step 2: Replace Import Paths

**Find all occurrences** of:
```typescript
'../../src/server/interface-types.js'
```

**Replace with**:
```typescript
'../../src/index.js'
```

**Example locations** (search the file for these patterns):

```typescript
// Pattern 1: In template literals
writeFileSync(testFile, `
import type { IUI, IServer } from '../../src/server/interface-types.js';
// Change to:
import type { IUI, IServer } from '../../src/index.js';
`);

// Pattern 2: In direct string concatenation
const fixture = "import type { IUI, IServer } from '../../src/server/interface-types.js';";
// Change to:
const fixture = "import type { IUI, IServer } from '../../src/index.js';";
```

#### Step 3: Alternative - Use Absolute Imports

If relative paths continue to cause issues, consider using the actual import path:

```typescript
import type { IUI, IServer } from 'simply-mcp';
```

But this requires the package to be linked or installed.

#### Step 4: Verify Fix

```bash
npx jest tests/unit/mime-types-uri-list.test.ts --no-coverage
```

**Expected Result**: 18 tests should now pass (up from 2 passing)

**If tests still fail**, check:
1. Are fixtures being generated in the correct location?
2. Is the relative path calculation correct for the temp directory?
3. Try adding debug output to see the actual file paths being generated

---

## Quick Win #3: Verify No Regressions (5 minutes)

After applying Quick Wins #1 and #2, verify that no existing passing tests broke.

### Verification Steps

```bash
# Run all tests to get updated counts
npx jest --passWithNoTests --no-coverage 2>&1 | tee /tmp/test-results-after-quick-wins.txt

# Check the summary
tail -20 /tmp/test-results-after-quick-wins.txt

# Should see:
# Test Suites: ~17 failed (down from 20), 38 passed, 55 total
# Tests: ~85 failed (down from 118), 11 skipped, 1217 passed (up from 1184), 1313 total
```

### Expected Outcome

| Metric | Before | After Quick Wins | Change |
|--------|--------|------------------|--------|
| Failing Suites | 20 | 17 | -3 ✅ |
| Failing Tests | 118 | 85 | -33 ✅ |
| Passing Tests | 1,184 | 1,217 | +33 ✅ |
| Pass Rate | 90.2% | 92.7% | +2.5% ✅ |

---

## Troubleshooting

### Issue: BuildMCPServer export causes type errors

**Solution**: Make sure to export both the class and the type:
```typescript
export { BuildMCPServer } from './server/builder-server.js';
export type { BuildMCPServerOptions } from './server/builder-types.js';
```

### Issue: MIME types tests still failing after import path fix

**Debug steps**:
1. Check where fixtures are being created:
   ```typescript
   console.log('Fixture path:', testFile);
   ```
2. Verify the import path is correct for that location
3. Check if `interface-types.js` actually exists (it shouldn't)
4. Verify `IUI` and `IServer` are exported from `src/index.ts`

### Issue: Circular dependency warnings

**Solution**: This is unlikely, but if it occurs:
- Check import order in index.ts
- Ensure builder-server.ts doesn't import from index.ts

---

## Next Steps After Quick Wins

Once Quick Wins are complete and verified:

1. **Proceed to Phase 2**: Update test fixtures to add `description` property
   - See main report for details
   - Will fix ~50 more tests
   - Estimated effort: 4-6 hours

2. **Create PR for Quick Wins**:
   ```bash
   git checkout -b fix/test-failures-quick-wins
   git add src/index.ts tests/unit/ui-adapter.test.ts tests/integration/context-injection.test.ts tests/unit/mime-types-uri-list.test.ts
   git commit -m "fix: Add missing exports and fix test import paths

   - Export BuildMCPServer and BuildMCPServerOptions from main index
   - Fix import paths in ui-adapter and context-injection tests
   - Fix interface-types.js import path in mime-types-uri-list tests

   Fixes 33 failing tests across 3 test suites
   Improves test pass rate from 90.2% to 92.7%"

   git push origin fix/test-failures-quick-wins
   ```

3. **Validate Build Still Works**:
   ```bash
   npm run build
   ```

---

## Checklist

Use this checklist to track progress:

### Quick Win #1: Missing Exports
- [ ] Add `export { BuildMCPServer }` to src/index.ts
- [ ] Add `export type { BuildMCPServerOptions }` to src/index.ts
- [ ] Update import in tests/unit/ui-adapter.test.ts
- [ ] Update import in tests/integration/context-injection.test.ts
- [ ] Verify tests/test-http-modes.test.ts imports are correct
- [ ] Run tests to verify fixes

### Quick Win #2: MIME Types Import Paths
- [ ] Find all occurrences of `'../../src/server/interface-types.js'` in tests/unit/mime-types-uri-list.test.ts
- [ ] Replace with `'../../src/index.js'`
- [ ] Run test to verify 18 tests now pass

### Quick Win #3: Verification
- [ ] Run full test suite
- [ ] Verify ~33 more tests passing
- [ ] Verify no regressions in existing passing tests
- [ ] Verify build still works

### Optional: Create PR
- [ ] Create feature branch
- [ ] Commit changes with descriptive message
- [ ] Push to remote
- [ ] Create pull request

---

**Total Time**: 2-3 hours
**Total Tests Fixed**: 33 tests
**Pass Rate Improvement**: 90.2% → 92.7% (+2.5%)
**Risk Level**: LOW (non-breaking changes)

**Ready to start?** Begin with Quick Win #1!
