# Testing Guide

Quick reference for running tests in Simply MCP.

**Test Examples:**
- Basic: [examples/interface-minimal.ts](../../examples/interface-minimal.ts)
- Comprehensive: [examples/interface-protocol-comprehensive.ts](../../examples/interface-protocol-comprehensive.ts)

## Quick Start

```bash
# Install dependencies
npm ci

# Build the project
npm run build

# Run all tests
npm run test:ci
```

## Test Commands

### Unit Tests
```bash
npm run test:unit              # Run Jest tests once
npm run test:unit:watch        # Watch mode
npm run test:unit:coverage     # With coverage report
npm run test:perf              # Run performance tests (separate suite)
```

### Integration Tests

#### Shell-based Tests
```bash
npm run test:integration:watch    # Watch mode (8 scenarios, ~15 min)
npm run test:integration:http     # HTTP transport (21 scenarios, ~20 min)
npm run test:integration:bundle   # Bundle command (6 tests, ~25 min)
npm run test:integration:all      # All shell tests
```

#### TypeScript Runtime Tests
```bash
npm run test:integration:mcp-builder   # MCP Builder (11 tools, ~10 min)
npm run test:integration:interface     # Interface API (~5 min)
npm run test:integration:functional    # Functional API (~5 min)
```

#### Legacy Tests
```bash
npm test                       # Run legacy test suite
npm run test:stdio             # Stdio transport only
npm run test:http              # HTTP transport only
```

## CI/CD

Tests run automatically on:
- Push to `main`
- Pull requests to `main`
- Manual workflow dispatch

**Status Badge**:
```markdown
[![Tests](https://github.com/Clockwork-Innovations/simply-mcp-ts/actions/workflows/test.yml/badge.svg)](https://github.com/Clockwork-Innovations/simply-mcp-ts/actions/workflows/test.yml)
```

## Test Structure

```
tests/
├── integration/              # Integration test scripts
│   ├── test-watch-mode.sh
│   ├── test-http-transport.sh
│   ├── test-bundle-smoke.sh
│   └── ...
├── run-all-tests.sh          # Legacy test runner
└── TEST-REPORT.md            # Legacy test report

Root directory:
├── test-mcp-builder-integration.ts
├── test-interface-runtime.ts
├── test-functional-api-runtime.ts
└── ...
```

## Prerequisites

### System Dependencies
```bash
# Ubuntu/Debian
sudo apt-get install -y jq lsof curl

# macOS
brew install jq
```

### Node Version
- Minimum: Node.js 20.0.0
- Tested on: 20.x, 22.x, latest

## Before Pushing

### Minimum Checks (5 minutes)
```bash
npm run build && npm run test:unit
```

### Recommended Checks (30 minutes)
```bash
npm pack  # Create test tarball
npm run test:ci
```

## Troubleshooting

### Port Already in Use
```bash
pkill -f "simply-mcp"
lsof -i :3000
```

### Test Timeouts
- Check system resources
- Kill background processes
- See [DEBUGGING.md](./DEBUGGING.md) for debugging tools

### Tarball Issues
Integration tests expect a tarball. Create one with:
```bash
npm pack
```

## More Information

For additional testing guidance:
- [DEBUGGING.md](./DEBUGGING.md) - Debugging and development tools
- [QUICK_START.md](./QUICK_START.md) - Getting started examples
- [Examples Index](../../examples/EXAMPLES_INDEX.md) - Working code examples
