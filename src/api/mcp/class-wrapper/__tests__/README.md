# MCP Class Wrapper Wizard - Test Suite

Comprehensive test suite for the MCP Class Wrapper Wizard with 80 tests and 85.96% code coverage.

## Quick Start

```bash
# Run all tests
npm run test:unit

# Run with coverage
npm run test:unit:coverage

# Run in watch mode
npm run test:unit:watch

# Run specific test file
npx jest src/api/mcp/class-wrapper/__tests__/file-parser.test.ts
```

## Test Files

| File | Tests | Purpose |
|------|-------|---------|
| `file-parser.test.ts` | 19 | Tests TypeScript class parsing and metadata extraction |
| `decorator-injector.test.ts` | 16 | Tests decorator injection while preserving original code |
| `state.test.ts` | 12 | Tests wizard state management across sessions |
| `validators.test.ts` | 23 | Tests input validation (names, versions, descriptions) |
| `tools-integration.test.ts` | 10 | Tests complete wizard workflow end-to-end |

## Test Fixtures

Located in `fixtures/`:
- `SimpleClass.ts` - Basic class with one method
- `ComplexClass.ts` - Weather service with async methods, JSDoc, optional params
- `EdgeCases.ts` - Various edge cases (any, generics, defaults, arrays, dates)

## Coverage Summary

- **Overall:** 85.96% statements, 66.38% branches, 77.46% functions, 85.71% lines
- **State Management:** 100% (perfect coverage)
- **Validators:** 100% (perfect coverage)
- **File Parser:** 93.1% statements
- **Decorator Injector:** 90.66% statements
- **Wizard Tools:** 85.41% statements

## Key Test Scenarios

### File Parser
- ✅ Parse classes with various method signatures
- ✅ Extract JSDoc comments
- ✅ Filter private/protected methods
- ✅ Handle optional parameters and defaults
- ✅ Detect exported classes
- ✅ Error handling for invalid files

### Decorator Injector
- ✅ Add imports (new or merge existing)
- ✅ Inject @MCPServer decorator
- ✅ Inject @tool decorators
- ✅ Preserve 100% of original implementation
- ✅ Maintain formatting and indentation
- ✅ Validate generated syntax

### State Management
- ✅ Session isolation (HTTP mode)
- ✅ STDIO mode (no session)
- ✅ State persistence across tool calls
- ✅ State cleanup

### Validators
- ✅ Server name validation (kebab-case)
- ✅ Version validation (semver)
- ✅ Description validation (min length)

### Integration
- ✅ Complete wizard workflow (6 steps)
- ✅ Error handling at each step
- ✅ File verification
- ✅ Custom output paths

## Adding New Tests

1. Create test file in `__tests__/` directory
2. Import from `@jest/globals`
3. Follow existing test structure
4. Run tests and ensure they pass
5. Check coverage

Example:
```typescript
import { describe, it, expect } from '@jest/globals';
import { yourFunction } from '../your-module.js';

describe('Your Module', () => {
  it('should do something', () => {
    const result = yourFunction();
    expect(result).toBe(expected);
  });
});
```

## Coverage Goals

- File Parser: 90%+ ✅
- Decorator Injector: 90%+ ✅
- Wizard Tools: 80%+ ✅
- State Management: 95%+ ✅
- Validators: 100% ✅

## See Also

- `TEST_SUMMARY.md` - Detailed test suite analysis
- `../../../../../../../jest.config.js` - Jest configuration
- `../../../../../../../package.json` - npm scripts
