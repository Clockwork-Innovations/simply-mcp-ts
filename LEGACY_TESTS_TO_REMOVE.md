# Legacy Tests to Remove

**Priority**: LOW
**Estimated Time**: 10 minutes (decision) or 8+ hours (implementation)
**Tests Affected**: 10 tests in 1 suite

---

## Overview

This document identifies test files that **test code that doesn't exist** in the codebase. These are likely legacy tests from features that were removed, refactored, or never implemented.

---

## Suite to Remove or Relocate

### tests/unit/auth-adapter.test.ts

**Status**: ❌ Test suite fails to compile
**Reason**: Imports file that doesn't exist
**Tests Affected**: ~10 tests

#### Problem

The test file imports from `src/auth-adapter.js`:

```typescript
import { authConfigFromParsed } from '../../src/auth-adapter.js';
import type { ParsedAuth } from '../../src/server/parser.js';
```

**However**: `src/auth-adapter.js` (or `.ts`) **does not exist** in the codebase.

```bash
$ find src -name "*auth-adapter*"
# No results
```

#### Investigation Needed

Before removing, investigate the history:

```bash
# Check git history for this file
git log --all --grep="auth-adapter" --oneline
git log --all -- "**/auth-adapter*" --oneline
git log --all -- "tests/unit/auth-adapter.test.ts" --oneline

# Check if it was ever in the codebase
git log --all --full-history -- "src/auth-adapter.ts" --oneline
git log --all --full-history -- "src/adapters/auth-adapter.ts" --oneline
```

#### Possible Scenarios

**Scenario A: Feature Was Removed**
- Auth adapter was implemented, then removed in refactoring
- Tests were orphaned
- **Action**: Remove test file

**Scenario B: Feature Was Never Implemented**
- Tests were written for planned feature
- Feature never got implemented
- **Action**: Remove tests OR move to future work

**Scenario C: Feature Exists Elsewhere**
- Auth adapter functionality exists but in different file
- Tests just have wrong import path
- **Action**: Update import path

**Scenario D: Feature Is Needed**
- Auth adapter should exist but doesn't
- This is a missing feature
- **Action**: Implement feature (see below)

---

## Recommendation Decision Tree

```
Does auth adapter exist elsewhere? ────YES──→ Update import path (QUICK FIX)
  │
  NO
  │
  ↓
Was it in git history? ────YES──→ Was it intentionally removed? ────YES──→ REMOVE TESTS
  │                                   │
  │                                   NO → Restore or REMOVE
  NO                                  │
  │                                   ↓
  ↓                              Consult team
Is the feature needed? ────NO───→ REMOVE TESTS
  │
  YES
  │
  ↓
IMPLEMENT FEATURE (8+ hours)
```

---

## Option 1: Remove Tests (RECOMMENDED if not needed)

**Estimated Time**: 5 minutes

### Steps

1. **Verify the file isn't used**:
   ```bash
   grep -r "auth-adapter.test" . --exclude-dir=node_modules
   ```

2. **Remove the test file**:
   ```bash
   git rm tests/unit/auth-adapter.test.ts
   ```

3. **Update test documentation** if needed:
   ```bash
   # If there's a test manifest or documentation, update it
   ```

4. **Commit**:
   ```bash
   git commit -m "chore: Remove orphaned auth-adapter tests

   The auth-adapter.ts file doesn't exist in the codebase.
   These tests were likely orphaned during a refactoring.

   Removes 10 failing tests from test suite."
   ```

5. **Verify**:
   ```bash
   npx jest --passWithNoTests --no-coverage 2>&1 | grep "Test Suites:"
   # Should show 1 fewer failing suite
   ```

---

## Option 2: Implement Auth Adapter (if feature is needed)

**Estimated Time**: 8-16 hours
**Priority**: DEFER until product decision made

### What the Tests Expect

Based on the test file, the auth adapter should:

1. **Export a function**: `authConfigFromParsed`
2. **Input**: `ParsedAuth` type (from parser.ts)
3. **Output**: `SecurityConfig` type (likely for MCP protocol)
4. **Purpose**: Convert parsed auth configuration to security config

### Implementation Steps (High-Level)

#### Step 1: Review Test Requirements (1 hour)
```bash
# Read the test file to understand expected behavior
cat tests/unit/auth-adapter.test.ts

# Document:
# - What ParsedAuth structure is
# - What SecurityConfig should be
# - What conversion logic is needed
```

#### Step 2: Create Adapter File (2-4 hours)
```typescript
// File: src/adapters/auth-adapter.ts

import type { ParsedAuth } from '../server/parser.js';

// TODO: Import or define SecurityConfig type

/**
 * Converts ParsedAuth from interface parsing to SecurityConfig for MCP protocol
 */
export function authConfigFromParsed(parsed: ParsedAuth): SecurityConfig {
  // Implementation based on test expectations
  // ...
}
```

#### Step 3: Implement Conversion Logic (3-6 hours)
- Understand ParsedAuth structure
- Understand SecurityConfig requirements
- Implement conversion
- Handle edge cases
- Add error handling

#### Step 4: Run Tests (1 hour)
```bash
npx jest tests/unit/auth-adapter.test.ts --no-coverage
# Fix issues until tests pass
```

#### Step 5: Integration (2-4 hours)
- Integrate auth adapter into main flow
- Update parser or server to use it
- Test end-to-end auth scenarios
- Document usage

### Recommendation

**DEFER** implementation until:
1. Product team confirms auth adapter is needed
2. Requirements are clarified
3. Auth strategy is defined

For now, **REMOVE TESTS** if feature isn't actively being used.

---

## Option 3: Relocate Tests (if feature exists elsewhere)

**Estimated Time**: 30 minutes

If auth adapter functionality exists in another file:

### Steps

1. **Find the actual implementation**:
   ```bash
   grep -r "authConfigFromParsed" src/
   # or
   grep -r "ParsedAuth.*SecurityConfig" src/
   ```

2. **Update test import**:
   ```typescript
   // Change from:
   import { authConfigFromParsed } from '../../src/auth-adapter.js';

   // To (example):
   import { authConfigFromParsed } from '../../src/adapters/security-adapter.js';
   ```

3. **Verify tests pass**:
   ```bash
   npx jest tests/unit/auth-adapter.test.ts --no-coverage
   ```

4. **Consider renaming test file** to match actual file:
   ```bash
   git mv tests/unit/auth-adapter.test.ts tests/unit/security-adapter.test.ts
   ```

---

## Impact Analysis

### If Tests Are Removed

**Positive**:
- ✅ Reduces failing test count by 10
- ✅ Improves test suite health score
- ✅ Removes confusion about missing file
- ✅ Clean up technical debt

**Negative**:
- ⚠️ Lose test coverage for auth adapter (if feature is ever implemented)
- ⚠️ May need to rewrite tests later

**Mitigation**: Save test file to `tests/deprecated/` or `docs/future-tests/` for future reference

### If Feature Is Implemented

**Positive**:
- ✅ Gain auth adapter functionality
- ✅ Tests will pass
- ✅ Feature is properly tested

**Negative**:
- ⏱️ Significant time investment (8-16 hours)
- 🔴 May not be needed for current requirements
- 🔴 May duplicate existing auth functionality

---

## Recommended Action

### Immediate Action (LOW PRIORITY)

1. **Check git history** (10 minutes):
   ```bash
   git log --all --grep="auth-adapter"
   git log --all --full-history -- "src/auth-adapter.ts"
   git log --all --full-history -- "src/adapters/auth-adapter.ts"
   ```

2. **Based on findings**:

   **If found in history**:
   - Check when and why it was removed
   - Consult commit messages
   - Decide: restore or remove tests

   **If never existed**:
   - Assume tests are premature
   - Remove tests or move to future work
   - Document as future feature if needed

3. **Execute decision** (5-30 minutes)

---

## Checklist

- [ ] Run git history check
- [ ] Determine which scenario applies (A, B, C, or D)
- [ ] Make decision: Remove, Implement, or Relocate
- [ ] Execute chosen option
- [ ] Verify test suite impact
- [ ] Document decision in commit message

---

## Future Work Consideration

If auth adapter is a future feature:

1. **Move tests to future work directory**:
   ```bash
   mkdir -p tests/future-work
   git mv tests/unit/auth-adapter.test.ts tests/future-work/
   ```

2. **Add to backlog**:
   - Create issue: "Implement auth-adapter feature"
   - Link to test file for requirements
   - Prioritize based on product needs

3. **Update jest.config.js** to exclude future work:
   ```javascript
   testPathIgnorePatterns: [
     '/node_modules/',
     '/tests/future-work/',
   ],
   ```

---

**Estimated Impact**:
- **Time**: 10 minutes (decision) + 5 minutes (removal) = 15 minutes total
- **Tests Affected**: 10 tests
- **Pass Rate Change**: +0.76% (10 of 1,313 tests)
- **Risk**: VERY LOW (removing tests that don't compile anyway)

**Recommendation**: Remove tests unless git history shows they should be restored.
