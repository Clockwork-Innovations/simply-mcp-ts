# Conditional Test Execution Utilities

This directory contains utilities for programmatic test skipping based on environment capabilities. Tests automatically skip when the environment doesn't support required features, and run when capabilities are available.

## Overview

The conditional test system ensures that:
- ✅ Tests run on capable systems (like development laptops)
- ⏭️  Tests skip automatically in limited environments (like cloud IDEs)
- 📊 Clear reporting of why tests were skipped
- 🎯 No manual configuration needed

## Quick Start

### 1. Check Your Environment Capabilities

Run the capability detection script to see what your environment supports:

```bash
npx tsx tests/utils/check-capabilities.ts
```

This will show a detailed report like:

```
╔════════════════════════════════════════════════════════════╗
║        Environment Capabilities Detection Report          ║
╚════════════════════════════════════════════════════════════╝

📊 Capability Summary:
────────────────────────────────────────────────────────────
  🚀  Spawn Servers (stdio)     ✅ Yes
  🌐  Bind HTTP Server          ✅ Yes
  👷  Worker API                ❌ No
  📦  import.meta.url           ✅ Yes
  🤖  Browser Automation        ❌ No
  ☁️  Cloud IDE Environment     ❌ No
```

### 2. Use Conditional Tests in Your Test Files

Import the conditional test helpers and use them instead of regular \`describe()\` or \`test()\`:

```typescript
import { describeIfCanRunIntegration, testIfCanSpawnServers } from '../utils/conditional-tests.js';

// This entire test suite will skip if integration tests aren't supported
describeIfCanRunIntegration('My Integration Tests', () => {
  // Tests here will only run when environment supports it

  it('should do something', async () => {
    // Test implementation
  });
});

// Individual tests can also be conditional
testIfCanSpawnServers('should spawn a server', async () => {
  // This test only runs if server spawning is supported
});
```

## Available Conditional Test Functions

### Describe Blocks (Test Suites)

Use these to conditionally run entire test suites:

| Function | When to Use | Example |
|----------|-------------|---------|
| \`describeIfCanSpawnServers()\` | Tests that spawn child processes | stdio transport tests |
| \`describeIfCanBindHttp()\` | Tests that start HTTP servers | HTTP transport tests |
| \`describeIfHasWorkerAPI()\` | Tests requiring Web Workers | Browser worker tests |
| \`describeIfHasBrowserAutomation()\` | Tests requiring Puppeteer/Playwright | E2E UI tests |
| \`describeIfCanRunIntegration()\` | Full integration tests | Tests needing server + HTTP |
| \`describeIfCanRunE2E()\` | End-to-end tests | Tests with real servers |

### Individual Tests

Use these for individual test cases:

| Function | When to Use |
|----------|-------------|
| \`testIfCanSpawnServers()\` | Test spawns a server process |
| \`testIfCanBindHttp()\` | Test binds to HTTP port |
| \`testIfHasWorkerAPI()\` | Test uses Web Workers |
| \`testIfHasBrowserAutomation()\` | Test needs browser automation |
| \`testIfCanRunIntegration()\` | Test is an integration test |
| \`testIfCanRunE2E()\` | Test is an E2E test |

### Generic Conditionals

For custom conditions:

```typescript
import { testIf, describeIf } from '../utils/conditional-tests.js';

// Boolean condition
testIf(process.env.FEATURE_FLAG === 'true', 'feature test', () => {
  // Test runs only if condition is true
});

// Function condition
testIf(
  () => canRunCustomCheck(),
  'custom test',
  async () => {
    // Test implementation
  }
);
```

## Real-World Examples

### Example 1: E2E Test with Browser Automation

```typescript
// tests/e2e/ui-resource-e2e.test.ts
import { describeIfHasBrowserAutomation } from '../utils/conditional-tests.js';

describe('MCP UI Resource E2E Tests', () => {
  // Infrastructure tests run always
  it('should create helper successfully', () => {
    expect(helper).toBeDefined();
  });

  // Browser-dependent tests skip automatically
  describeIfHasBrowserAutomation('Calculator UI Resource', () => {
    it('should render calculator UI', async () => {
      // Browser automation code here
      // Only runs if Puppeteer/Playwright installed
    });
  });
});
```

### Example 2: Integration Test with HTTP Server

```typescript
// tests/integration/streamable-http-transport.test.ts
import { describeIfCanRunIntegration } from '../utils/conditional-tests.js';

describeIfCanRunIntegration('HTTP Transport Integration', () => {
  let serverProcess: ChildProcess;

  beforeAll(async () => {
    // Spawn HTTP server
    serverProcess = spawn('node', ['server.js']);
    // Wait for ready
  });

  it('should handle HTTP requests', async () => {
    const response = await fetch('http://localhost:3000');
    expect(response.ok).toBe(true);
  });

  afterAll(() => {
    serverProcess.kill();
  });
});
```

## See Also

- Jest documentation on [conditional tests](https://jestjs.io/docs/api#testskipname-fn)
- Project test configuration in \`jest.config.js\`
- Individual test examples in \`tests/e2e/\`, \`tests/integration/\`, and \`tests/unit/\`
