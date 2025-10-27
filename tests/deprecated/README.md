# Deprecated Tests

This directory contains tests for deprecated APIs that have been removed from simply-mcp-ts.

## Removed Features

### Decorator API (v1.x - v3.x)
**Location:** `decorator-api/`

The decorator-based API using `@MCPTool`, `@MCPServer`, `@MCPPrompt`, and `@MCPResource` decorators has been removed. This API required TypeScript metadata reflection and added complexity to the codebase.

**Deprecated files:**
- `bundle-test-decorator.ts` - Bundle tests for decorator API
- `http-decorator-server.ts` - HTTP transport tests for decorator API
- `README-DECORATORS.md` - Decorator API documentation
- `QA-REPORT-ROUTER-DECORATOR.md` - QA report for decorator routing
- `test-decorators.sh` - Decorator API test runner

### Functional API (v2.x - v3.x)
**Location:** `functional-api/`

The functional builder API using `createTool()`, `createPrompt()`, and `createResource()` has been removed in favor of the Interface API, which provides better type safety and simpler usage patterns.

**Deprecated files:**
- `bundle-test-functional.ts` - Bundle tests for functional API
- `http-functional-server.ts` - HTTP transport tests for functional API
- `functional-router-foundation.test.ts` - Router foundation tests
- `functional-router-feature.manual.ts` - Router feature manual tests

### Auto-detect (v3.x)
**Location:** `auto-detect/`

Automatic API style detection has been removed. All servers now use the Interface API exclusively, eliminating the need for runtime detection and reducing complexity.

**Deprecated files:**
- `interface-auto-detect.test.ts` - Auto-detection unit tests
- `test-auto-detection-reliability.sh` - Auto-detection reliability tests
- `test-server-discovery.sh` - Server discovery tests

### Old Versions (v2.4.5 and earlier)
**Location:** `old-versions/`

Tests for bug fixes and features from older versions that are no longer relevant to the current codebase.

**Deprecated files:**
- `test-bug-fixes-v2.4.5.ts` - Bug fix tests for v2.4.5
- `test-bug-fixes.sh` - General bug fix test runner
- `verify-bug-fixes.ts` - Bug fix verification script

## Migration

All deprecated functionality has been replaced by the **Interface API**.

### Interface API Usage

The Interface API is the only supported API as of v4.0.0+:

```typescript
import { InterfaceServer } from 'simply-mcp';

interface MyServer {
  tools: {
    myTool(params: { input: string }): Promise<string>;
  };
}

const server: MyServer = {
  tools: {
    async myTool({ input }) {
      return `Processed: ${input}`;
    }
  }
};

const mcpServer = new InterfaceServer(server, {
  name: 'my-server',
  version: '1.0.0'
});
```

### Resources and Prompts

```typescript
interface MyServer {
  tools: {
    // ...
  };
  resources: {
    config: { uri: string };
  };
  prompts: {
    'analyze-data': {
      description: string;
      arguments?: Array<{ name: string; description?: string; required?: boolean }>;
    };
  };
}
```

### Documentation

For current usage examples and documentation, see:
- `docs/guides/QUICK_START.md` - Getting started with Interface API
- `docs/guides/INTERFACE_API_REFERENCE.md` - Complete API reference
- `examples/interface-comprehensive.ts` - Comprehensive example

## Why These Were Removed

1. **Simplification:** Consolidating to a single API reduces maintenance burden and user confusion
2. **Type Safety:** Interface API provides superior TypeScript inference without runtime magic
3. **Performance:** No runtime reflection or API detection overhead
4. **Maintainability:** Single code path is easier to test, debug, and evolve
5. **User Experience:** One clear way to build MCP servers reduces learning curve

## Archived Date

2025-10-24

## Notes

These files have been moved (not deleted) to preserve git history. They remain available for reference but are no longer maintained or tested.
