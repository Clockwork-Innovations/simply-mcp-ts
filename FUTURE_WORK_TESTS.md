# Future Work Tests

**Priority**: MEDIUM
**Estimated Time**: 6-10 hours investigation + implementation
**Tests Affected**: ~25 tests across 5 suites

---

## Overview

This document identifies tests that are **failing due to API changes or unclear requirements**. These tests need investigation to determine:

1. Did the API intentionally change? (update tests)
2. Is this a regression? (fix the code)
3. Is this a future feature? (skip tests for now)

---

## Tests Requiring Investigation

### Category: Interface API Parser Changes

These tests expect properties or behaviors that the current parser may not provide.

---

## Suite 1: tests/unit/interface-api/basic.test.ts

**Status**: ⚠️ 9 passing, 11 failing
**Feature**: Interface-driven API foundation layer
**Code Exists**: Yes (src/server/parser.ts)
**Issue**: Tests expect parser output properties that don't exist

### Failing Tests (11)

The tests expect these properties on tool definitions:
- `methodName` (e.g., "addNumbers")
- `description` (e.g., "Add two numbers")
- `paramsType` (e.g., contains "a", "b", "number")
- `resultType` (e.g., "number")

**Current behavior**: These properties are `undefined`

### Example Failure

```typescript
// Test expects:
expect(addTool?.methodName).toBe('addNumbers');

// Actual:
expect(received).toBe(expected)
Expected: "addNumbers"
Received: undefined
```

### Investigation Needed

1. **Check current ParseResult type**:
   ```typescript
   // What does ParseResult actually contain?
   // File: src/server/parser.ts
   export interface ParseResult {
     // Document actual structure
   }
   ```

2. **Determine if properties were removed intentionally**:
   - Check git history: `git log --all -p -- src/server/parser.ts | grep "methodName"`
   - Look for refactoring commits
   - Check if API design changed

3. **Decide**:
   - **If intentional**: Update tests to use new API
   - **If regression**: Restore properties to parser output
   - **If unclear**: Mark as TODO and escalate

### Recommended Action

**INVESTIGATE** (2 hours) then **UPDATE TESTS** (1-2 hours)

---

## Suite 2: tests/unit/interface-api/auto-export.test.ts

**Status**: ❌ All failing
**Feature**: Named export support (`export class` vs `export default class`)
**Code Exists**: Unknown
**Issue**: Tests verify named export pattern works

### What It Tests

```typescript
// Pattern 1: default export (standard)
export default class MyServer implements IServer { ... }

// Pattern 2: named export (this is being tested)
export class MyServer implements IServer { ... }
```

### Investigation Needed

1. **Check if named exports are supported**:
   ```bash
   # Test with real server file
   echo 'export class TestServer implements IServer { ... }' > test-server.ts
   npx simply-mcp run test-server.ts
   ```

2. **Check parser code**:
   ```typescript
   // Does parser.ts handle both export styles?
   // File: src/server/parser.ts
   // Search for: "export default" and "export class"
   ```

3. **Check adapter code**:
   ```typescript
   // File: src/server/adapter.ts
   // Check loadInterfaceServer() function
   ```

### Possible Outcomes

**A. Feature works but tests are wrong**:
- Fix test setup
- Update assertions

**B. Feature was removed**:
- Remove tests
- Update documentation to only show `export default`

**C. Feature needs implementation**:
- Implement named export support in parser
- Keep tests

### Recommended Action

**INVESTIGATE** (1 hour) then **UPDATE or REMOVE** (30 min)

---

## Suite 3: tests/unit/interface-api/static-resource.test.ts

**Status**: ❌ All failing
**Feature**: Static resource pattern
**Code Exists**: Yes (resource handling exists)
**Issue**: Resource API may have changed

### What It Tests

Static resources are resources with fixed content:

```typescript
interface MyResource extends IResource {
  uri: 'resource://config';
  name: 'App Configuration';
  description: 'Application settings';
  mimeType: 'application/json';
  // Content is static, not dynamic
}
```

### Investigation Needed

1. **Check if pattern still supported**:
   ```bash
   # Look for static resource examples in codebase
   grep -r "extends IResource" examples/
   ```

2. **Check resource handler**:
   ```typescript
   // File: src/handlers/resource-handler.ts
   // How are resources registered?
   // How is static content handled?
   ```

3. **Test manually**:
   ```typescript
   // Create example static resource server
   // Run it and check MCP protocol output
   ```

### Recommended Action

**INVESTIGATE** (1 hour) then **UPDATE TESTS** (1 hour)

---

## Suite 4: tests/unit/interface-api/object-resource.test.ts

**Status**: ❌ All failing
**Feature**: Object resource pattern
**Code Exists**: Yes
**Issue**: API may have changed

### What It Tests

"Object-with-data" resource pattern:

```typescript
interface MyResource extends IResource {
  uri: 'resource://users/{id}';
  name: string;        // Dynamic name
  description: string; // Dynamic description
  // Content comes from object data
}

class MyServer implements IServer {
  myResource: MyResource = {
    uri: 'resource://users/123',
    name: 'User Profile',
    description: 'Profile for user 123',
    mimeType: 'application/json',
    text: JSON.stringify({ id: 123, name: 'John' })
  };
}
```

### Investigation Needed

Same as Suite 3 - check if resource patterns changed.

### Recommended Action

**INVESTIGATE** (1 hour) then **UPDATE TESTS** (1 hour)

---

## Suite 5: tests/unit/interface-api/database-resource.test.ts

**Status**: ❌ All failing
**Feature**: Database resource integration
**Code Exists**: Yes
**Issue**: SQLite integration tests

### What It Tests

Resources backed by database queries:

```typescript
interface UsersResource extends IResource {
  uri: 'resource://users';
  name: 'User List';
  description: 'All users from database';
  // Content from SELECT * FROM users
}
```

### Investigation Needed

1. **Check if database pattern is used anywhere**:
   ```bash
   grep -r "sqlite\|database" examples/
   ```

2. **Verify resource-database integration**:
   - Can resources call database?
   - Is async data fetching supported?

3. **Check if tests are integration tests**:
   - Do they need real SQLite?
   - Should they be in tests/integration/ or tests/e2e/?

### Recommended Action

**INVESTIGATE** (1 hour) then **UPDATE or MOVE** (1-2 hours)

Possibly move to `tests/integration/` or mark as E2E tests.

---

## Suite 6: tests/unit/ui-parser.test.ts

**Status**: ❌ All failing
**Feature**: UI interface parsing
**Code Exists**: Yes (parseUIInterface exists)
**Issue**: Parser behavior may have changed

### What It Tests

Parsing of IUI interface definitions:

```typescript
interface MyUI extends IUI {
  uri: 'ui://dashboard';
  title: 'Dashboard';
  description: 'Main dashboard view';
  // ... UI properties
}
```

### Investigation Needed

1. **Check parseUIInterface() function**:
   ```typescript
   // File: src/server/parser.ts
   // Function: parseUIInterface()
   // What does it return?
   ```

2. **Compare to test expectations**:
   - What properties do tests expect?
   - What does parser actually return?

3. **Check recent changes**:
   ```bash
   git log -p --all -- src/server/parser.ts | grep -A 10 "parseUIInterface"
   ```

### Recommended Action

**INVESTIGATE** (1 hour) then **UPDATE TESTS** (1 hour)

---

## Summary Table

| Suite | Tests | Investigation Time | Fix Time | Likely Action |
|-------|-------|-------------------|----------|---------------|
| basic.test.ts | 11 | 2h | 1-2h | UPDATE tests to new API |
| auto-export.test.ts | ? | 1h | 0.5h | UPDATE or REMOVE |
| static-resource.test.ts | ? | 1h | 1h | UPDATE tests |
| object-resource.test.ts | ? | 1h | 1h | UPDATE tests |
| database-resource.test.ts | ? | 1h | 1-2h | UPDATE or MOVE |
| ui-parser.test.ts | ? | 1h | 1h | UPDATE tests |
| **TOTAL** | ~25 | **7h** | **5-8h** | **12-15h total** |

---

## Investigation Protocol

For each suite, follow this process:

### Phase 1: Understand Current API (1 hour per suite)

1. **Read the source code**:
   ```typescript
   // Example for basic.test.ts
   // Read: src/server/parser.ts
   // Find: parseInterfaceFile() function
   // Document: What it returns
   ```

2. **Create API documentation**:
   ```markdown
   ## parseInterfaceFile() Return Value

   Returns: ParseResult

   Structure:
   - server: {...}
   - tools: Array<{...}>
   - resources: Array<{...}>
   - prompts: Array<{...}>

   Each tool contains:
   - name: string
   - [DOCUMENT ACTUAL PROPERTIES]
   ```

3. **Run a manual test**:
   ```bash
   # Create minimal test server
   # Run parser on it
   # Log output structure
   # Compare to test expectations
   ```

### Phase 2: Compare to Tests (30 min per suite)

1. **Document what tests expect**:
   ```markdown
   ## basic.test.ts Expectations

   Tests expect each tool to have:
   - methodName: string (camelCase version of name)
   - description: string (from JSDoc)
   - paramsType: string (type representation)
   - resultType: string (return type)
   ```

2. **Create diff**:
   ```markdown
   ## API vs Expectations

   | Property | Test Expects | API Provides | Match? |
   |----------|-------------|--------------|--------|
   | methodName | "addNumbers" | undefined | ❌ |
   | description | "Add two numbers" | undefined | ❌ |
   | ...
   ```

### Phase 3: Decide Action (10 min per suite)

Use decision tree:

```
Are expected properties available in API? ─YES→ UPDATE test to access them correctly
  │
  NO
  │
  ↓
Were they removed intentionally? ─YES→ UPDATE tests to use new API
  │
  NO
  │
  ↓
Should they be in API? ─YES→ FIX code to provide them (or ESCALATE)
  │
  NO
  │
  ↓
REMOVE tests or MARK as future work
```

### Phase 4: Execute (1-2 hours per suite)

**If updating tests**:
- Update assertions to match current API
- Add new test cases if API expanded
- Remove obsolete test cases
- Verify tests pass

**If fixing code**:
- Add missing properties to API output
- Ensure backwards compatibility
- Update documentation
- Verify tests pass

**If removing**:
- Move to tests/deprecated/ or tests/future-work/
- Update jest.config.js
- Document why removed
- Update test count expectations

---

## Prioritization

### High Priority (Do First)

1. **basic.test.ts** - Foundation layer, most important
2. **ui-parser.test.ts** - UI is core feature

### Medium Priority (Do Second)

3. **auto-export.test.ts** - Affects developer experience
4. **static-resource.test.ts** - Common pattern
5. **object-resource.test.ts** - Common pattern

### Low Priority (Do Last or Defer)

6. **database-resource.test.ts** - Niche use case, might be integration test

---

## Success Criteria

Investigation is complete when:
- [ ] All 6 suites analyzed
- [ ] Current API behavior documented
- [ ] Test expectations documented
- [ ] Decision made for each suite (update/fix/remove)
- [ ] Actions executed
- [ ] Tests passing or properly excluded
- [ ] Documentation updated

---

## Escalation Points

Escalate to product/engineering team if:

1. **Breaking changes found**: API removed features that were documented/used
2. **Unclear intent**: Can't determine if behavior is intentional
3. **Resource constraints**: Fixes would take >16 hours
4. **Architecture questions**: Changes would affect API design

---

## Deliverables

After investigation, create:

1. **API_CHANGES_SUMMARY.md**:
   - Document all API changes found
   - Migration guide for tests
   - Impact on users (if any)

2. **Updated tests**:
   - All tests passing or properly excluded
   - Test documentation updated

3. **Git commits**:
   - Separate commit per suite
   - Clear commit messages explaining changes

---

**Total Estimated Effort**: 12-15 hours
**Tests Affected**: ~25 tests
**Impact on Pass Rate**: +1.9% (25 of 1,313 tests)
**Risk**: MEDIUM (requires understanding API changes)

**Recommendation**: Start with basic.test.ts (highest impact), then prioritize based on findings.
