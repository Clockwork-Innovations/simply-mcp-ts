# MCP Transport Test Suites

This directory contains comprehensive test suites for all MCP transport types.

## Test Suites

### Individual Transport Tests

Each transport type has its own dedicated test suite:

1. **test-stdio.sh** - Stdio Transport Tests
   - Tests standard input/output communication
   - 13 test cases covering initialization, tools, prompts, resources, validation
   - Run: `bash tests/test-stdio.sh`

2. **test-stateless-http.sh** - Stateless HTTP Transport Tests
   - Tests HTTP without session persistence
   - 10 test cases covering independent requests, concurrent execution
   - Run: `bash tests/test-stateless-http.sh`

3. **test-stateful-http.sh** - Stateful HTTP Transport Tests (Enhanced)
   - Tests HTTP with session management
   - 18 test cases covering sessions, isolation, persistence, SSE streaming
   - Run: `bash tests/test-stateful-http.sh`

4. **test-sse.sh** - SSE Transport Tests (Legacy)
   - Tests Server-Sent Events transport
   - 12 test cases covering SSE connection, messaging, validation
   - Run: `bash tests/test-sse.sh`

### Master Test Runner

**run-all-tests.sh** - Runs all transport tests and generates report
- Executes all 4 test suites sequentially
- Tracks pass/fail for each suite
- Generates comprehensive TEST-REPORT.md
- Run: `bash tests/run-all-tests.sh`

## Quick Start

### Run All Tests
```bash
# From project root
bash tests/run-all-tests.sh
```

### Run Individual Transport Tests
```bash
# Stdio
bash tests/test-stdio.sh

# Stateless HTTP
bash tests/test-stateless-http.sh

# Stateful HTTP
bash tests/test-stateful-http.sh

# SSE (Legacy)
bash tests/test-sse.sh
```

### Run via Main Test Framework
```bash
# Run stateful HTTP tests (default)
bash ../src/test-framework.sh

# Run all transports
bash ../src/test-framework.sh --all
```

## Test Coverage

### Stdio Transport (13 tests)
- [x] Initialize connection
- [x] List tools
- [x] List prompts
- [x] List resources
- [x] Call greet tool (file handler)
- [x] Call calculate tool (addition, multiplication)
- [x] Call echo tool (inline handler)
- [x] Validation errors (missing field, wrong type)
- [x] Get prompt
- [x] Read resource
- [x] Division by zero error handling

### Stateless HTTP Transport (10 tests)
- [x] Initialize connection (independent)
- [x] List tools (no session)
- [x] Call tool without prior session
- [x] Verify no session persistence
- [x] Multiple concurrent requests
- [x] Calculate tool
- [x] Echo tool (inline handler)
- [x] Validation error handling
- [x] Prompts work without session
- [x] Resources work without session

### Stateful HTTP Transport (18 tests)
- [x] Initialize and extract session ID
- [x] Reuse session for list tools
- [x] Call tool with existing session
- [x] Multiple operations in same session
- [x] Create second concurrent session
- [x] Session isolation (verify independence)
- [x] Request without session ID (rejected)
- [x] Invalid session ID (rejected)
- [x] GET endpoint (SSE streaming)
- [x] Prompts with session
- [x] Resources with session
- [x] Validation errors in session
- [x] DELETE endpoint (session termination)
- [x] Verify terminated session cannot be reused
- [x] Inline handler in session
- [x] Complex operations in session
- [x] Error handling in session
- [x] Session persistence across multiple calls

### SSE Transport (12 tests)
- [x] Establish SSE connection
- [x] Extract session ID from endpoint event
- [x] Send initialize message
- [x] List tools via SSE
- [x] Call greet tool
- [x] Call calculate tool
- [x] Call echo tool (inline)
- [x] Invalid session ID rejected
- [x] Missing session ID rejected
- [x] SSE stream persistence
- [x] Get prompt via SSE
- [x] Read resource via SSE

## Prerequisites

- Node.js and npm installed
- `jq` for JSON parsing (install: `sudo apt-get install jq` or `brew install jq`)
- `curl` for HTTP requests
- `npx` and `tsx` for TypeScript execution

## Test Output

Each test suite produces:
- Colored output (green for pass, red for fail)
- Test-by-test results
- Summary statistics (passed/failed/total)
- Duration timing

The master runner additionally generates:
- **TEST-REPORT.md** - Markdown report with full results

## Troubleshooting

### "jq not found"
```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq
```

### "Server failed to start"
- Check if port is already in use
- Review server logs in /tmp/mcp-*-server.log
- Ensure config file exists: tests/fixtures/config/config-test.json

### "Connection refused"
- Server may not have started fully
- Increase wait time in test script
- Check firewall settings

### Tests hang or timeout
- Some tests require network access
- Stdio tests may hang if stdin is not properly closed
- Use Ctrl+C to interrupt and check logs

## File Structure

```
src/
├── tests/
│   ├── README.md              # This file
│   ├── run-all-tests.sh       # Master test runner
│   ├── test-stdio.sh          # Stdio tests
│   ├── test-stateless-http.sh # Stateless HTTP tests
│   ├── test-stateful-http.sh  # Stateful HTTP tests
│   └── test-sse.sh            # SSE tests
├── servers/
│   ├── stdioServer.ts         # Stdio transport server
│   ├── statelessServer.ts     # Stateless HTTP server
│   └── sseServer.ts           # SSE transport server
├── cli/servers/
│   └── configurable-server.ts  # Stateful HTTP server (main)
└── test-framework.sh          # Original test script (stateful HTTP)
```

## Related Documentation

- [TRANSPORTS.md](../TRANSPORTS.md) - Comprehensive transport comparison guide
- [ARCHITECTURE.md](../ARCHITECTURE.md) - MCP framework architecture
- [HANDLER-GUIDE.md](../HANDLER-GUIDE.md) - Handler development guide
- [API-EXAMPLES.md](../API-EXAMPLES.md) - API usage examples

## Contributing

When adding new tests:
1. Follow the existing test structure
2. Use colored output for results
3. Include summary statistics
4. Update this README
5. Test on both Linux and macOS if possible

## License

Part of the MCP Framework project.