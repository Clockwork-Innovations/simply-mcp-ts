# Agent 3: Testing Guide for Phase 2, Feature 2 (Inline Dependencies)

## Quick Start

Feature 2 is complete and ready for comprehensive testing. All implementation files are in place and manually validated.

## What to Test

### Priority 1: Parser Tests (`dependency-parser.ts`)

**File:** `/mcp/tests/phase2/test-inline-deps-parser.ts`

Test scenarios (from plan Section 7.1):
1. Parse simple dependencies (axios@^1.6.0, zod@^3.22.0)
2. Parse scoped packages (@types/node, @modelcontextprotocol/sdk)
3. Parse with comments (# HTTP client, etc.)
4. Parse with empty lines
5. Parse version ranges (^, ~, >=, *, latest)
6. Parse without version (implicit latest)
7. Empty dependencies block (// /// dependencies\n// ///)
8. No metadata block (should return empty)
9. Whitespace tolerance (tabs, spaces)
10. Multiple blocks (only first should be used)

**Negative tests (Section 7.2):**
11. Invalid package name (UPPERCASE)
12. Invalid version (not-a-version)
13. Duplicate dependencies
14. Missing end delimiter
15. Missing start delimiter
16. Invalid line format (no // prefix)
17. Strict mode throws on errors
18. Package name too long (>214 chars)
19. Package name with spaces
20. Version with invalid characters

### Priority 2: Validator Tests (`dependency-validator.ts`)

**File:** `/mcp/tests/phase2/test-inline-deps-validator.ts`

Test scenarios:
1. Valid package names (axios, lodash, @types/node)
2. Invalid package names (UPPERCASE, .invalid, _invalid, !, spaces)
3. Valid version ranges (^1.0.0, ~1.2.3, >=1.0.0, 1.x, *, latest)
4. Invalid versions (not-a-version, 1.2.3.4.5, dangerous chars)
5. Security checks (injection attempts, dangerous characters)
6. Conflict detection (duplicate packages)
7. Case-insensitive duplicates
8. Length limits

### Priority 3: Integration Tests (`SimpleMCP.ts`)

**File:** `/mcp/tests/phase2/test-inline-deps-integration.ts`

Test scenarios (Section 7.3):
21. SimpleMCP.fromFile() parses dependencies
22. SimpleMCP.hasDependency() works correctly
23. SimpleMCP.getDependencyVersion() returns correct version
24. Export to package.json format
25. Detect conflicts with package.json

### Priority 4: Utility Tests (`dependency-utils.ts`)

**File:** `/mcp/tests/phase2/test-inline-deps-utils.ts`

Test scenarios:
1. generatePackageJson() creates correct structure
2. mergeDependencies() handles conflicts properly
3. formatDependencyList() outputs correctly
4. getDependencyStats() calculates correctly
5. filterDependencies() pattern matching
6. sortDependencies() alphabetical order

### Priority 5: Edge Cases

**File:** `/mcp/tests/phase2/test-inline-deps-edge-cases.ts`

Test scenarios (Section 7.4):
26. Very long dependency list (100+ packages)
27. Unicode package names (should fail)
28. Mixed line endings (CRLF and LF)
29. Tabs vs spaces
30. Nested delimiters (should ignore)

## Test Fixtures

Create test fixtures in `/mcp/tests/fixtures/inline-deps/`:

```
inline-deps/
├── valid-simple.ts         # Simple dependencies
├── valid-scoped.ts         # Scoped packages
├── valid-comments.ts       # With comments
├── valid-empty.ts          # Empty block
├── invalid-uppercase.ts    # Invalid package name
├── invalid-version.ts      # Invalid version
├── invalid-missing-end.ts  # Missing delimiter
├── no-deps.ts             # No inline deps
└── complex.ts             # Complex real-world example
```

## Quick Test Commands

```bash
# Test parser directly
npx tsx -e "
import { parseInlineDependencies } from './mcp/core/index.js';
const result = parseInlineDependencies('// /// dependencies\n// axios@^1.6.0\n// ///');
console.log(result);
"

# Test validator
npx tsx -e "
import { validatePackageName, validateSemverRange } from './mcp/core/index.js';
console.log('axios:', validatePackageName('axios'));
console.log('INVALID:', validatePackageName('INVALID'));
console.log('^1.0.0:', validateSemverRange('^1.0.0'));
"

# Test SimpleMCP.fromFile
npx tsx -e "
import { SimpleMCP } from './mcp/SimpleMCP.js';
(async () => {
  const s = await SimpleMCP.fromFile('./examples/inline-deps-demo.ts');
  console.log('Deps:', s.getDependencies()?.map);
})();
"
```

## Test Framework Setup

Use existing Vitest setup:

```typescript
import { describe, it, expect } from 'vitest';
import { parseInlineDependencies } from '../core/dependency-parser.js';

describe('Inline Dependencies Parser', () => {
  it('should parse simple dependencies', () => {
    const source = `
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///
    `;
    
    const result = parseInlineDependencies(source);
    
    expect(result.dependencies).toEqual({
      'axios': '^1.6.0',
      'zod': '^3.22.0',
    });
    expect(result.errors).toHaveLength(0);
  });
  
  it('should reject invalid package names', () => {
    const source = `
// /// dependencies
// UPPERCASE@^1.0.0
// ///
    `;
    
    const result = parseInlineDependencies(source);
    
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe('INVALID_NAME');
  });
});
```

## Success Criteria

✅ All 30+ test scenarios pass
✅ 100% pass rate required
✅ No regressions in existing tests
✅ Coverage of all public APIs
✅ Edge cases handled gracefully
✅ Error messages are helpful

## Known Issues to Watch For

1. **Pre-existing TypeScript errors:** Not related to Feature 2. Focus on runtime tests.
2. **External dependencies:** Only `zod` is available. Don't test with packages that aren't installed.
3. **File paths:** Use absolute paths in tests or resolve from test directory.

## Test Output Format

Expected test output:
```
✓ Parser: Parse simple dependencies (5ms)
✓ Parser: Parse scoped packages (3ms)
✓ Parser: Parse with comments (2ms)
✓ Validator: Valid package names (1ms)
✓ Validator: Invalid package names (1ms)
✓ Integration: SimpleMCP.fromFile() (10ms)
...

Test Files  1 passed (1)
     Tests  30 passed (30)
  Start at  10:00:00
  Duration  250ms
```

## Performance Benchmarks

Expected performance:
- Parse 10 deps: <10ms
- Parse 100 deps: <50ms
- Validate 10 deps: <5ms
- Validate 100 deps: <20ms

## Security Test Cases

**Critical security tests:**
1. Prevent code injection in package names
2. Prevent code injection in versions
3. Block dangerous characters (`;`, `|`, `&`, etc.)
4. Limit dependency list size (max 1000)
5. Limit line length (max 1000)
6. Case-insensitive duplicate detection

## Example Test File Structure

```typescript
// /mcp/tests/phase2/test-inline-deps-parser.ts
import { describe, it, expect } from 'vitest';
import { parseInlineDependencies } from '../../core/dependency-parser.js';

describe('Inline Dependencies Parser', () => {
  describe('Valid Formats', () => {
    it('should parse simple dependencies', () => { /* ... */ });
    it('should parse scoped packages', () => { /* ... */ });
    it('should parse with comments', () => { /* ... */ });
    it('should parse with empty lines', () => { /* ... */ });
    it('should parse version ranges', () => { /* ... */ });
    it('should parse without version', () => { /* ... */ });
    it('should handle empty block', () => { /* ... */ });
    it('should handle no metadata', () => { /* ... */ });
    it('should handle whitespace', () => { /* ... */ });
    it('should use only first block', () => { /* ... */ });
  });
  
  describe('Invalid Formats', () => {
    it('should reject invalid package names', () => { /* ... */ });
    it('should reject invalid versions', () => { /* ... */ });
    it('should detect duplicates', () => { /* ... */ });
    it('should handle missing delimiters', () => { /* ... */ });
    it('should handle invalid line format', () => { /* ... */ });
    it('should throw in strict mode', () => { /* ... */ });
    it('should reject long package names', () => { /* ... */ });
    it('should reject package names with spaces', () => { /* ... */ });
    it('should reject invalid version chars', () => { /* ... */ });
  });
  
  describe('Edge Cases', () => {
    it('should handle long dependency lists', () => { /* ... */ });
    it('should reject unicode package names', () => { /* ... */ });
    it('should handle mixed line endings', () => { /* ... */ });
    it('should handle tabs and spaces', () => { /* ... */ });
    it('should ignore nested delimiters', () => { /* ... */ });
  });
});
```

## Running Tests

```bash
# Run all inline deps tests
npm test -- inline-deps

# Run specific test file
npm test -- test-inline-deps-parser

# Run with coverage
npm test -- --coverage inline-deps

# Watch mode
npm test -- --watch inline-deps
```

## Reporting

After testing, create:
1. Test results summary (pass/fail counts)
2. Coverage report
3. Performance benchmark results
4. Any bugs found with reproduction steps
5. Recommendations for improvements

## Questions or Issues?

Refer to:
- `/mcp/PHASE2_FEATURE2_PLAN.md` (950+ lines, comprehensive spec)
- `/mcp/IMPLEMENTATION_SUMMARY.md` (implementation details)
- `/mcp/core/dependency-*.ts` (source code with JSDoc)

Good luck, Agent 3! All the groundwork is done. Now make it bulletproof! 🚀
