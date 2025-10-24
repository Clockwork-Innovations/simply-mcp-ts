# Decorator API Test Suite

Comprehensive test suite for the MCP Decorator API (`@tool`, `@prompt`, `@resource`).

## Overview

This test suite validates the functionality of the decorator-based API for creating MCP servers using TypeScript classes. It tests all three decorators and their edge cases.

## Files

- **test-decorators.sh** - Main test runner script
- **test-decorators-client.ts** - TypeScript test client using MCP SDK
- **fixtures/test-decorator-class.ts** - Test fixture class with all decorator types

## Test Coverage

### @tool Decorator Tests (10 tests)
- Tool registration and listing
- JSDoc parameter extraction
- Operation parameter validation (add, subtract, multiply, divide)
- Error handling (division by zero)
- Optional parameters
- Complex parameter types (objects, nested properties)
- Missing required parameter validation
- Wrong parameter type validation

### @prompt Decorator Tests (3 tests)
- Prompt registration and listing
- Metadata extraction (arguments, descriptions)
- Argument definition validation

**Note:** Dynamic prompt execution is registered but not yet fully implemented in class-adapter. The prompts are registered with correct metadata but return template placeholders.

### @resource Decorator Tests (5 tests)
- Resource registration and listing
- JSON content resources (application/json)
- Text content resources (text/plain)
- Dynamic content (process.uptime(), etc.)
- MIME type verification

### Integration Tests (6 tests)
- Multiple decorators on same class
- JSDoc description extraction
- Decorator description parsing
- End-to-end workflow (tool → resource)
- TypeScript type inference for parameters

## Running the Tests

### Run decorator tests only:
```bash
bash tests/test-decorators.sh
```

### Run all tests including decorators:
```bash
bash tests/run-all-tests.sh
```

## Test Results

Expected output:
- **24 tests** in total
- **24 pass** when all decorators work correctly
- **0 failures** when implementation is complete

### Sample Output
```
=========================================
Testing MCP Decorator API
=========================================

Connection Tests
  ✓ PASS: Initialize connection

@tool Decorator Tests
  ✓ PASS: List tools - expected 4 tools with decorators
  ✓ PASS: @tool with JSDoc parameters
  ✓ PASS: @tool operation: multiply
  ✓ PASS: @tool division by zero error
  ✓ PASS: @tool with optional parameter (formal=true)
  ✓ PASS: @tool with optional parameter omitted
  ✓ PASS: @tool with complex parameters
  ✓ PASS: @tool validation - missing required
  ✓ PASS: @tool validation - wrong type

@prompt Decorator Tests
  ✓ PASS: List prompts - expected 3 prompts with decorators
  ✓ PASS: @prompt metadata includes arguments
  ✓ PASS: @prompt has correct argument definitions

@resource Decorator Tests
  ✓ PASS: List resources - expected 3 resources with decorators
  ✓ PASS: @resource with JSON content (application/json)
  ✓ PASS: @resource with text content (text/plain)
  ✓ PASS: @resource with dynamic content
  ✓ PASS: @resource mime types correct

Integration Tests
  ✓ PASS: Multiple decorators (@tool, @prompt, @resource) on same class
  ✓ PASS: JSDoc description extracted for @tool
  ✓ PASS: Description from @prompt decorator
  ✓ PASS: Name and description from @resource decorator

End-to-End Workflow
  ✓ PASS: End-to-end workflow: tool -> resource
  ✓ PASS: Parameter types inferred from TypeScript

Tests Passed: 24
Tests Failed: 0
Total Tests: 24

All tests passed!
```

## Test Fixture

The test fixture (`fixtures/test-decorator-class.ts`) includes:

### Tools
- `calculate` - Math operations with JSDoc parameters
- `greetUser` - Greeting with optional formality parameter
- `echoMessage` - Simple echo function
- `complexParams` - Complex nested parameter types

### Prompts
- `greetingPrompt` - Personalized greeting generation
- `codeReviewPrompt` - Code review prompt with focus areas
- `summarizePrompt` - Summary prompt with word limit

### Resources
- `info://server/status` - JSON server status with uptime
- `info://server/config` - JSON server configuration
- `help://usage` - Text help documentation

## Edge Cases Tested

1. **Parameter Types**
   - Primitive types (string, number, boolean)
   - Optional parameters
   - Union types (operation: 'add' | 'subtract' | ...)
   - Complex objects with nested properties

2. **Validation**
   - Missing required parameters
   - Wrong parameter types
   - Invalid enum values

3. **Error Handling**
   - Runtime errors (division by zero)
   - Validation errors
   - Type conversion errors

4. **Metadata Extraction**
   - JSDoc comments parsing
   - Decorator description strings
   - Parameter inference from TypeScript types

## Known Limitations

- Dynamic prompt execution is not yet fully supported in class-adapter
- Prompts are registered with correct metadata but return template placeholders
- This will be implemented in a future update

## Dependencies

- Node.js and npm
- TypeScript (tsx)
- @modelcontextprotocol/sdk (for MCP client)
- simply-mcp package

## Contributing

When adding new decorator features:

1. Add test cases to `test-decorators-client.ts`
2. Update the test fixture in `fixtures/test-decorator-class.ts`
3. Update this README with new test coverage
4. Ensure all tests pass before submitting PR

## References

- [MCP Decorator Documentation](../../README.md#decorator-api)
- [class-adapter.ts](../../class-adapter.ts) - Decorator implementation
- [decorators.ts](../../decorators.ts) - Decorator definitions
