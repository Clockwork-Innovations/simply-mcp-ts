# E2E Testing Infrastructure

This directory contains the End-to-End (E2E) testing infrastructure for MCP UI resources.

## Overview

The E2E testing approach combines **unit tests with mocked workers** (376 tests validating the protocol) and **manual browser testing** for real-world verification. This hybrid approach provides comprehensive coverage while staying within practical resource constraints.

## Architecture

```
tests/e2e/
├── helpers/
│   └── mcp-chrome-helper.ts    # Helper utilities for MCP Chrome DevTools
├── ui-resource-e2e.test.ts     # Example E2E tests
└── README.md                   # This file
```

## Quick Start

### Running E2E Tests

```bash
# Run all E2E tests
NODE_OPTIONS="$NODE_OPTIONS --experimental-vm-modules" npx jest tests/e2e/

# Run specific E2E test file
NODE_OPTIONS="$NODE_OPTIONS --experimental-vm-modules" npx jest tests/e2e/ui-resource-e2e.test.ts

# Run with coverage
NODE_OPTIONS="$NODE_OPTIONS --experimental-vm-modules" npx jest --coverage tests/e2e/
```

### Current Status

**Unit Tests (Protocol E2E)**: ✅ COMPLETE
- 376 unit tests validate full Remote DOM protocol
- Web Workers mocked for fast, reliable testing
- All DOM operations, security, error handling covered
- See: `/tests/unit/client/` for test suite

**Manual Testing Protocol**: ✅ ACTIVE
- Step-by-step browser testing procedures
- 8 test scenarios with verification steps
- See: [MANUAL_TESTING_PROTOCOL.md](./MANUAL_TESTING_PROTOCOL.md)

**Automated Browser E2E**: ⏳ FUTURE ENHANCEMENT
- Real browser automation (Puppeteer/Playwright)
- Estimated 6-11 hours implementation effort
- See: [Future Enhancement Roadmap](#future-enhancements)

## MCP Chrome Helper API

The `MCPChromeHelper` class provides a high-level API for E2E testing:

### Basic Usage

```typescript
import { createMCPChromeHelper } from './helpers/mcp-chrome-helper.js';

const helper = createMCPChromeHelper({
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  screenshotOnFailure: true,
});

// Navigate to server
await helper.navigateToServer('examples/create-ui-resource-demo.ts');

// Verify UI rendered
await helper.verifyUIResourceRendered('show_calculator');

// Interact with UI
await helper.fillField('input-a', '5');
await helper.clickElement('calculate-button');

// Verify results
await helper.verifyToolCallExecuted('add', { a: 5, b: 3 });
await helper.waitForText('Result: 8');
```

### Available Methods

#### Navigation & Page Control

- `navigateToServer(serverPath: string, timeout?: number)` - Navigate to MCP server
- `takeSnapshot(verbose?: boolean)` - Take accessibility tree snapshot
- `takeScreenshot(filePath?: string)` - Take screenshot

#### Element Interaction

- `clickElement(uid: string)` - Click element by UID from snapshot
- `fillField(uid: string, value: string)` - Fill form field
- `waitForText(text: string, timeout?: number)` - Wait for text to appear

#### Verification Methods

- `verifyUIResourceRendered(resourceId: string)` - Verify UI resource rendered
- `verifyToolCallExecuted(toolName: string, params?)` - Verify tool call
- `verifyPromptSubmitted(promptText: string)` - Verify prompt submission
- `verifyNotificationDisplayed(level: string, message: string)` - Verify notification
- `verifyLinkNavigation(url: string, target: string)` - Verify link navigation

#### Console & Script Execution

- `getConsoleMessages(types?: string[])` - Get console messages
- `executeScript(script: string, args?: any[])` - Execute JavaScript in page

#### Cleanup

- `cleanup()` - Clean up resources and close browser

### Utility Functions

```typescript
import { waitForCondition, retryWithBackoff } from './helpers/mcp-chrome-helper.js';

// Wait for condition with timeout
const result = await waitForCondition(
  () => element.isVisible(),
  30000,  // timeout
  100     // interval
);

// Retry with exponential backoff
const data = await retryWithBackoff(
  () => fetchData(),
  3,     // max retries
  1000   // initial delay
);
```

## MCP Chrome DevTools Tools

The helper uses these MCP Chrome DevTools tools:

| Tool | Purpose |
|------|---------|
| `mcp__chrome-devtools__navigate_page` | Navigate to URL |
| `mcp__chrome-devtools__fill` | Fill form fields |
| `mcp__chrome-devtools__click` | Click elements |
| `mcp__chrome-devtools__wait_for` | Wait for text to appear |
| `mcp__chrome-devtools__take_snapshot` | Take accessibility tree snapshot |
| `mcp__chrome-devtools__take_screenshot` | Take screenshot |
| `mcp__chrome-devtools__list_pages` | List open pages |
| `mcp__chrome-devtools__select_page` | Select active page |
| `mcp__chrome-devtools__new_page` | Open new page |
| `mcp__chrome-devtools__close_page` | Close page |
| `mcp__chrome-devtools__evaluate_script` | Execute JavaScript |
| `mcp__chrome-devtools__list_console_messages` | Get console messages |
| `mcp__chrome-devtools__get_console_message` | Get specific console message |

## Example Test Patterns

### Pattern 1: Basic UI Rendering

```typescript
it('should render calculator UI', async () => {
  await helper.navigateToServer('examples/create-ui-resource-demo.ts');

  const isRendered = await helper.verifyUIResourceRendered('show_calculator');
  expect(isRendered).toBe(true);

  const snapshot = await helper.takeSnapshot();
  expect(snapshot).toContain('calculator');
});
```

### Pattern 2: Tool Call Verification

```typescript
it('should execute tool calls', async () => {
  await helper.navigateToServer('examples/create-ui-resource-demo.ts');

  await helper.fillField('input-a', '5');
  await helper.fillField('input-b', '3');
  await helper.clickElement('calculate-button');

  const executed = await helper.verifyToolCallExecuted('add', { a: 5, b: 3 });
  expect(executed).toBe(true);

  await helper.waitForText('Result: 8');
});
```

### Pattern 3: PostMessage Interaction

```typescript
it('should handle notifications', async () => {
  await helper.navigateToServer('examples/create-ui-resource-demo.ts');

  await helper.clickElement('notify-button');

  const displayed = await helper.verifyNotificationDisplayed(
    'success',
    'Operation completed'
  );
  expect(displayed).toBe(true);
});
```

### Pattern 4: Console Verification

```typescript
it('should log expected messages', async () => {
  await helper.navigateToServer('examples/create-ui-resource-demo.ts');

  await helper.clickElement('debug-button');

  const messages = await helper.getConsoleMessages(['log', 'error']);
  expect(messages).toHaveLength(1);
  expect(messages[0]).toContain('Debug info');
});
```

## Implementation Guide

### Step 1: Uncomment Example Tests

The example tests in `ui-resource-e2e.test.ts` are currently `.skip`'d. When ready to implement:

1. Remove `.skip` from test descriptions
2. Update test selectors/UIDs to match actual UI
3. Adjust timeouts as needed

### Step 2: Integrate MCP Chrome DevTools

Update `MCPChromeHelper` methods to actually call MCP Chrome DevTools:

```typescript
async clickElement(uid: string): Promise<void> {
  // Replace placeholder with actual MCP tool call
  await callMCPTool('mcp__chrome-devtools__click', { uid });
}
```

### Step 3: Add Server Startup

Add test setup to start MCP server before tests:

```typescript
beforeAll(async () => {
  // Start MCP server
  server = await startTestServer('examples/create-ui-resource-demo.ts');

  // Initialize helper
  helper = createMCPChromeHelper();
});
```

### Step 4: Add Screenshot Capture

Configure screenshot capture on test failure:

```typescript
afterEach(async () => {
  if (testFailed) {
    await helper.takeScreenshot(`tests/e2e/screenshots/failure-${Date.now()}.png`);
  }
});
```

## Configuration

E2E tests can be configured via the `E2EConfig` interface:

```typescript
interface E2EConfig {
  baseUrl?: string;           // Default: 'http://localhost:3000'
  timeout?: number;           // Default: 30000ms
  screenshotOnFailure?: boolean;  // Default: true
}
```

Pass config when creating helper:

```typescript
const helper = createMCPChromeHelper({
  baseUrl: process.env.TEST_URL || 'http://localhost:3000',
  timeout: 60000,
  screenshotOnFailure: true,
});
```

## Best Practices

### 1. Use Descriptive Test Names

```typescript
// Good
it('should calculate sum when user clicks calculate button', async () => {});

// Bad
it('test 1', async () => {});
```

### 2. Wait for Async Operations

```typescript
// Always wait for UI updates
await helper.clickElement('submit');
await helper.waitForText('Success');  // Don't skip this!
```

### 3. Take Screenshots for Documentation

```typescript
await helper.takeScreenshot('tests/e2e/screenshots/calculator-result.png');
```

### 4. Clean Up After Tests

```typescript
afterAll(async () => {
  await helper.cleanup();
  await stopTestServer();
});
```

### 5. Use Snapshots for Element Selection

```typescript
// Get fresh snapshot with element UIDs
const snapshot = await helper.takeSnapshot();

// Use UIDs from snapshot for interaction
await helper.clickElement('button-uid-from-snapshot');
```

## Troubleshooting

### Tests Timeout

- Increase timeout in config: `timeout: 60000`
- Check server is running: `curl http://localhost:3000`
- Verify browser automation is working

### Elements Not Found

- Take snapshot to verify element UIDs
- Check UI has finished rendering
- Use `waitForText` before interaction

### PostMessage Not Working

- Verify iframe sandbox attributes
- Check console for CORS errors
- Ensure postMessage target is correct

## Testing Philosophy

### Why Unit Tests Are Sufficient for Protocol Validation

Our 376 unit tests with mocked Web Workers effectively test the **entire Remote DOM protocol**:

1. **Protocol Compliance** - All 7 operation types validated
2. **Security** - Component whitelist, XSS prevention, operation validation
3. **Error Handling** - Worker errors, invalid operations, edge cases
4. **Lifecycle** - Initialization, cleanup, memory management
5. **Communication** - postMessage flow, message structure, sequencing

**What Unit Tests Cover:**
- ✅ Protocol message format and structure
- ✅ Operation processing (createElement, appendChild, etc.)
- ✅ Security validation and component whitelist
- ✅ Error states and graceful degradation
- ✅ Worker lifecycle and cleanup
- ✅ Event handling and tool calls

**What Unit Tests Don't Cover:**
- ❌ Real browser Web Worker behavior
- ❌ Cross-browser compatibility
- ❌ Visual rendering verification
- ❌ Real-world performance characteristics
- ❌ Browser-specific security policies

**Solution:** Manual testing fills these gaps efficiently. See [MANUAL_TESTING_PROTOCOL.md](./MANUAL_TESTING_PROTOCOL.md).

---

## Manual Testing

For comprehensive browser verification, follow the manual testing protocol:

**Quick Start:**
```bash
# 1. Start server
npx simply-mcp run examples/create-ui-resource-demo.ts

# 2. Open browser to localhost:3000

# 3. Follow test scenarios in MANUAL_TESTING_PROTOCOL.md
```

**Test Scenarios (8 total):**
1. Basic Remote DOM rendering
2. Web Worker communication
3. DOM operations processing
4. Component library whitelist
5. Tool calls via postMessage
6. Event handling
7. Error handling
8. Cleanup and memory management

**Time Required:** 10-15 minutes for complete test run

**Documentation:** See [MANUAL_TESTING_PROTOCOL.md](./MANUAL_TESTING_PROTOCOL.md) for detailed steps.

---

## Future Enhancements

### Automated Browser E2E Testing

**What It Would Add:**
- Automated cross-browser testing (Chrome, Firefox, Safari)
- Visual regression testing with screenshots
- Performance profiling and metrics
- CI/CD integration for every commit
- Parallel test execution for speed

**Tools Required:**
- Puppeteer or Playwright for browser automation
- Percy/Chromatic for visual regression
- GitHub Actions workflow configuration
- Test report generation and dashboards

**Estimated Effort:**
- Infrastructure setup: 2-3 hours
- Test implementation: 4-6 hours
- CI/CD integration: 1-2 hours
- **Total: 6-11 hours**

**When to Prioritize:**
- Cross-browser bugs discovered in production
- Remote DOM becomes heavily used feature
- Team has bandwidth for test maintenance
- Visual regressions become common issue

**Implementation Checklist:**
- [ ] Install Puppeteer/Playwright
- [ ] Configure test environment (headless, viewports)
- [ ] Implement 4-5 critical path E2E tests
- [ ] Add screenshot comparison for visual testing
- [ ] Set up CI/CD pipeline integration
- [ ] Add test report generation
- [ ] Document test maintenance procedures

---

## Additional Future Enhancements

- [ ] Visual regression testing with Percy/Chromatic
- [ ] Performance profiling and budgets
- [ ] Network request mocking for offline testing
- [ ] Parallel test execution
- [ ] Enhanced CI/CD reporting
- [ ] Test flake detection and auto-retry

## Resources

- [Manual Testing Protocol](./MANUAL_TESTING_PROTOCOL.md) - Step-by-step browser testing guide
- [Unit Test Suite](../unit/client/) - 376 tests validating Remote DOM protocol
- [MCP UI Protocol Spec](../../docs/guides/MCP_UI_PROTOCOL.md) - Official protocol documentation
- [Test Coverage Matrix](../FEATURE_COVERAGE_MATRIX.md) - Complete feature coverage analysis

---

## Summary

**Current Testing Approach:**
- ✅ **376 unit tests** validate entire Remote DOM protocol with mocked workers
- ✅ **Manual testing protocol** provides real browser verification (10-15 min)
- ✅ **Comprehensive coverage** of all protocol features and security

**Future Enhancements:**
- ⏳ Automated browser E2E (6-11 hours effort)
- ⏳ Visual regression testing
- ⏳ CI/CD integration

**Polish Layer Readiness:** ✅ **READY**
- Testing approach documented and validated
- Unit tests provide robust protocol coverage
- Manual testing fills real-world verification gap
- Future automation path clearly defined

---

**Status**: ✅ Unit Tests Complete | ✅ Manual Protocol Active | ⏳ Browser Automation (Future)

**Last Updated**: 2025-10-31
