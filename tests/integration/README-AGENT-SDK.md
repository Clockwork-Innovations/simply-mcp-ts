# Agent SDK Integration Tests

This directory contains integration tests for Claude Agent SDK compatibility with simply-mcp servers.

## Test Files

### 1. `agent-sdk-stdio.test.ts` (Low-Level MCP Protocol)
Tests direct MCP protocol communication using `@modelcontextprotocol/sdk`:
- ✅ **No API key required**
- Tests stdio transport initialization
- Tests tool listing and execution
- Tests startup performance
- **Run with**: `npx jest tests/integration/agent-sdk-stdio.test.ts`

### 2. `agent-sdk-query.test.ts` (High-Level Agent SDK)
Tests the actual Claude Agent SDK `query()` API:
- ⚠️ **Requires ANTHROPIC_API_KEY**
- Reproduces the exact user scenario from issue report
- Tests server spawning via Agent SDK
- Tests tool discovery and execution through Claude
- Tests verbose mode compatibility
- **Run with**: `ANTHROPIC_API_KEY=sk-... npx jest tests/integration/agent-sdk-query.test.ts`

## Running the Tests

### Without API Key (MCP Protocol Only)
```bash
npm run build
npx jest tests/integration/agent-sdk-stdio.test.ts
```

**Expected Result**:
- 7/8 tests pass
- 1 test fails: startup time (6.3s vs 5s target)
- This verifies MCP protocol works correctly

### With API Key (Full Agent SDK)
```bash
npm run build
export ANTHROPIC_API_KEY="sk-ant-..."
npx jest tests/integration/agent-sdk-query.test.ts
```

**Expected Result**:
- All tests should pass if stdio transport is working
- Server should be marked as "connected" not "failed"
- MCP tools should be discoverable
- Claude should be able to execute tools

### Running Both Test Suites
```bash
npm run build
export ANTHROPIC_API_KEY="sk-ant-..."  # Optional, skips some tests if not set
npx jest tests/integration/agent-sdk*.test.ts
```

## What These Tests Verify

### Critical Issues from User Report

**Issue 1: stdio transport fails with Agent SDK**
- **Tested by**: `agent-sdk-query.test.ts` - "spawns simply-mcp server and lists tools"
- **Verifies**: Server status is NOT "failed"
- **Root cause**: Debug logs on stderr interfering with initialization (now tested)

**Issue 2: Slow startup times**
- **Tested by**: `agent-sdk-stdio.test.ts` - "server starts within acceptable timeout"
- **Current status**: FAILING - 6.3s startup (target: <5s)
- **Root cause**: Module loading overhead with tsx + dynamic imports

### What Works (Verified by Tests)

✅ **stdio transport protocol is correct**
- Server initializes successfully
- Tools are discoverable
- Tool execution works
- Multiple sequential calls work

✅ **stderr debug logs don't break protocol**
- Even with `--verbose`, server works
- MCP protocol on stdout remains clean
- This was the suspected issue, but tests prove it's NOT the problem

### What Needs Fixing

❌ **Startup performance**
- Current: 6.3 seconds
- Target: < 5 seconds
- Impact: Agent SDK may timeout on slow machines
- Fix: Remove cache-busting, optimize module loading

## Reproducing User's Exact Scenario

The `agent-sdk-query.test.ts` file reproduces the EXACT code from the user's issue report:

```javascript
// From user's report:
import { query } from '@anthropic-ai/claude-agent-sdk';

const mcpConfig = {
  "site-monitor": {
    type: "stdio",
    command: "npx",
    args: ["simply-mcp", "run", "src/mcp/site-monitor-server.ts", "--transport", "stdio"],
    env: { MCP_TIMEOUT: '30000' }
  }
};

for await (const message of query({
  prompt: "List MCP tools",
  options: { mcpServers: mcpConfig }
})) {
  console.log(message);
  // User reported: "mcp_servers": [{"name": "site-monitor", "status": "failed"}]
}
```

Our test verifies this pattern works correctly with a simple test server.

## CI Integration

### Add to GitHub Actions

```yaml
# .github/workflows/test.yml
jobs:
  test-agent-sdk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build

      # Test without API key (MCP protocol only)
      - name: Test MCP Protocol
        run: npx jest tests/integration/agent-sdk-stdio.test.ts

      # Test with API key (full Agent SDK)
      - name: Test Agent SDK Query
        if: ${{ secrets.ANTHROPIC_API_KEY }}
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: npx jest tests/integration/agent-sdk-query.test.ts
```

### Local Development

```bash
# Quick test (no API key)
npm run build && npx jest tests/integration/agent-sdk-stdio.test.ts

# Full test (with API key)
npm run build && ANTHROPIC_API_KEY=sk-... npx jest tests/integration/agent-sdk*.test.ts
```

## Troubleshooting

### Test Timeout
If tests timeout (>60s), the server may be hanging:
```bash
# Check for hanging processes
ps aux | grep simply-mcp

# Kill hanging processes
pkill -f simply-mcp
```

### Server Fails to Start
Check the test output for error messages:
```bash
# Run with verbose output
npx jest tests/integration/agent-sdk-stdio.test.ts --verbose
```

### API Key Issues
If Agent SDK tests skip:
```bash
# Verify API key is set
echo $ANTHROPIC_API_KEY

# Set temporarily for testing
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

## Expected Test Results

### Before Fixes (Current)
```
agent-sdk-stdio.test.ts:
  ✓ 7 passed
  ✗ 1 failed (startup time: 6.3s > 5s)

agent-sdk-query.test.ts:
  ✓ Should pass if API key is set
  ✓ Server should NOT be marked as "failed"
```

### After Fixes (Target)
```
agent-sdk-stdio.test.ts:
  ✓ 8 passed (all tests)
  ✓ Startup time: <3s

agent-sdk-query.test.ts:
  ✓ All tests pass
  ✓ Fast startup (<5s)
```

## Related Files

- **Issue Report**: `/mnt/Shared/cs-projects/site-monitor/docs/simply-mcp-issue-report.md`
- **Debug Report**: `/tmp/simply-mcp-debug-report.md`
- **Test Fixture**: `tests/fixtures/simple-stdio-server.ts`
- **Source Code**:
  - `src/server/adapter.ts` (module loading)
  - `src/cli/run.ts` (debug logs)

## Contributing

When adding new Agent SDK compatibility features:
1. Add test cases to `agent-sdk-query.test.ts`
2. Verify with `agent-sdk-stdio.test.ts` for protocol correctness
3. Ensure startup time remains <5s
4. Test with both `--verbose` and quiet modes
