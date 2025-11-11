# Manual Tests

This directory contains manual tests that verify simply-mcp functionality using real-world scenarios with the Claude CLI. These tests are **not** run in CI/CD pipelines because they require local setup and the Claude CLI.

## Purpose

Manual tests are critical for **pre-release validation** to catch regressions that automated tests might miss. They verify end-to-end functionality with real MCP clients like Claude CLI.

## Requirements

- **Claude CLI** installed and available in PATH
  - Install: https://github.com/anthropics/claude-code
- **simply-mcp built**: Run `npm run build` first
- **Anthropic API key** configured for Claude CLI

## Available Tests

### `test-bundled-schemas-with-claude-cli.sh`

Verifies end-to-end integration with Claude CLI using bundled MCP servers across all transport modes.

**What it tests:**
- ✅ Server bundles correctly with proper schema extraction from TypeScript
- ✅ Schemas are embedded in bundles (`.schemas.json` files)
- ✅ Direct MCP protocol works via stdio and HTTP
- ✅ **STDIO transport**: Claude CLI starts server and executes tools
- ✅ **HTTP stateful transport**: Claude CLI connects to running server with session management
- ✅ **HTTP stateless transport**: Claude CLI connects to running server without sessions
- ✅ **Tool execution verification**: Uses unique test data to confirm tools are actually called (not just Claude guessing responses)
- ✅ **Cleanup**: Automatically kills servers and cleans up temp files on exit

**Usage:**
```bash
bash tests/manual/test-bundled-schemas-with-claude-cli.sh
```

**What it does:**
1. Creates a test server with `greet` and `add` tools
2. Bundles the server and verifies schemas are generated
3. Tests direct MCP protocol (stdio and HTTP) without Claude CLI
4. Tests Claude CLI integration with all three transports:
   - **STDIO**: Claude CLI starts the server automatically
   - **HTTP Stateful**: Test script starts server, Claude CLI connects with sessions
   - **HTTP Stateless**: Test script starts server, Claude CLI connects without sessions
5. Verifies tool calls by checking for unique response data
6. Automatically cleans up servers and temp files on exit

**Expected output:**
```
==========================================
Claude CLI Test: Bundled Server Integration
==========================================

Test directory: /tmp/tmp.XXXXXXXXXX

Creating test server...
Bundling server...
✓ Server bundled with schemas

Verifying schema structure...
✓ Schemas contain proper type definitions

Testing direct MCP protocol (stdio)...
✓ STDIO server responds with proper tool schemas

Testing direct MCP protocol (HTTP)...
✓ HTTP server responds with proper tool schemas

Creating MCP configs...
✓ MCP configs created

==========================================
Testing STDIO transport
==========================================

Verify Claude CLI actually calls MCP tools...

Claude CLI Output:
---
The tool returned exactly: **Hello, TestUser123!**
---

✓ Claude CLI returned tool output (but no debug messages visible)
✓ STDIO transport verified

Starting HTTP stateful server...
HTTP stateful server running (PID XXXXX)
==========================================
Testing HTTP (Stateful) transport
==========================================

Verify Claude CLI actually calls MCP tools...

Claude CLI Output:
---
The greet tool returned: **Hello, TestUser123!**
---

✓ Claude CLI successfully called MCP tool (verified via debug output)
✓ HTTP (Stateful) transport verified

Starting HTTP stateless server...
HTTP stateless server running (PID XXXXX)
==========================================
Testing HTTP (Stateless) transport
==========================================

Verify Claude CLI actually calls MCP tools...

Claude CLI Output:
---
The tool returned: **Hello, TestUser123!**
---

✓ Claude CLI returned tool output (but no debug messages visible)
✓ HTTP (Stateless) transport verified

==========================================
✓ ALL TESTS PASSED
==========================================

Summary:
  ✅ Server bundles with proper schemas
  ✅ Direct MCP protocol works correctly (stdio & HTTP)
  ✅ Claude CLI can connect and execute tools via stdio transport
  ✅ Claude CLI can connect and execute tools via HTTP stateful transport
  ✅ Claude CLI can connect and execute tools via HTTP stateless transport
  ✅ MCP tool calls verified via unique tool responses

Cleaning up...
Cleanup complete
```

## When to Run

### Required for Pre-Release

**Always run before:**
- Creating a new release/tag
- Publishing to npm
- Merging major features to main branch

**Why?**
- Catches integration issues that unit/integration tests miss
- Verifies real-world usage with Claude CLI
- Tests both stdio and HTTP transports
- Validates parameter schemas work end-to-end

### Quick Pre-Release Checklist

```bash
# 1. Build the project
npm run build

# 2. Run automated tests
npm test

# 3. Run manual tests
bash tests/manual/test-bundled-schemas-with-claude-cli.sh

# 4. If all pass, ready to release
```

## Troubleshooting

### "Claude CLI not found in PATH"

Install Claude CLI:
```bash
# See: https://github.com/anthropics/claude-code
```

### "No API key configured"

Configure your Anthropic API key:
```bash
export ANTHROPIC_API_KEY="your-key-here"
```

### Tests timeout or hang

- Check that the bundle was created correctly
- Verify the MCP config paths are correct
- Try running a simple Claude CLI command to verify it works

### HTTP transport tests fail

- Check that port 3456 is available
- Verify no firewall is blocking localhost connections
- Try a different port in the test script

## Adding New Manual Tests

When adding new manual tests:

1. **Name clearly**: `test-<feature>-with-claude-cli.sh`
2. **Document purpose**: What regression does this catch?
3. **Make executable**: `chmod +x tests/manual/your-test.sh`
4. **Update this README**: Add to "Available Tests" section
5. **Keep fast**: Aim for < 60 seconds total runtime
6. **Test both transports**: stdio and HTTP when applicable

## Why Not in CI?

These tests are excluded from CI because:
- Require Claude CLI installation (not standard in CI environments)
- Require Anthropic API key (costs money, rate limits)
- Test real LLM behavior (non-deterministic, can be slow)
- Best suited for human verification during release process

However, they're **critical** for catching regressions before release!
