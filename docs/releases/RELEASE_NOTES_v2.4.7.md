# Release Notes - v2.4.7

**Release Date:** 2025-10-06
**Type:** Patch Release (UX Improvements & Bug Fixes)

## Overview

This release addresses five major user experience issues identified through comprehensive TDD testing (Red-Green-Refactor approach). Each fix improves the developer experience by addressing common pain points encountered when working with SimpleMCP.

All improvements include dedicated test suites to prevent regressions and ensure consistent behavior across different workflows.

## UX Improvements

### 1. Config Init Now Generates Valid Examples

**Problem**: Running `simplymcp config init` generated a configuration file that immediately failed validation with errors about missing entry files (e.g., `./src/my-server.ts` not found).

**What We Fixed**:
- Config init now generates commented example configurations that pass validation
- Example file references are clearly marked as templates
- Users can uncomment and modify examples without encountering validation errors

**Impact on Users**:
- New users can now successfully initialize and validate their config without creating placeholder files first
- Reduces friction in the getting-started experience
- Validation passes immediately after `config init`, providing a better first impression

**Before**:
```bash
$ simplymcp config init
$ simplymcp config validate
Error: Entry file not found: ./src/my-server.ts
```

**After**:
```bash
$ simplymcp config init
$ simplymcp config validate
✓ Configuration is valid
```

**Test Coverage**: `tests/test-config-init.sh`

### 2. Bundle Format Defaults to ESM for Top-Level Await

**Problem**: The default bundle format was `single-file` (CommonJS), which doesn't support top-level await. Modern MCP servers commonly use `await server.start()` at the top level, causing bundle operations to fail with:
```
ERROR: Top-level await is currently not supported with the "cjs" output format
```

**What We Fixed**:
- Changed default bundle format from `single-file` (CJS) to `esm`
- Top-level await now works with default options
- Users no longer need to explicitly specify `-f esm` flag

**Impact on Users**:
- Bundling works out-of-the-box for servers using top-level await
- Reduces confusion for users following modern JavaScript/TypeScript patterns
- Aligns defaults with current best practices (ESM is the standard in Node.js 18+)

**Before**:
```bash
$ simplymcp bundle my-server.ts -o dist/bundle.js
ERROR: Top-level await is currently not supported with the "cjs" output format

# Workaround required:
$ simplymcp bundle my-server.ts -o dist/bundle.js -f esm
```

**After**:
```bash
$ simplymcp bundle my-server.ts -o dist/bundle.js
✓ Bundle created successfully
```

**Migration Notes**: If you specifically need CommonJS format, use the `-f single-file` flag explicitly.

**Test Coverage**: `tests/test-bundle-format.sh`

### 3. Decorator Detection Works With and Without Parentheses

**Problem**: Error detection regex only matched `@MCPServer()` with parentheses. When users wrote `@MCPServer` (without parentheses) and forgot to export their class, they received a generic "No class found in module" error instead of the helpful "class is not exported" message.

**What We Fixed**:
- Updated regex pattern in 4 locations to match both decorator syntaxes
- Pattern now: `/@MCPServer(\s*\(\s*\))?/` (optional parentheses)
- Helpful error messages now appear for both decorator formats

**Impact on Users**:
- Consistent helpful error messages regardless of decorator syntax preference
- Better guidance when classes aren't exported
- Reduced debugging time for common mistakes

**Locations Updated**:
1. `src/cli/class-bin.ts` (line 142) - Error detection
2. `src/cli/dry-run.ts` (line 175) - Dry-run validation
3. `src/cli/run.ts` (line 221) - Runtime error detection
4. `src/cli/run.ts` (line 71) - API style detection

**Before**:
```typescript
@MCPServer
class MyServer { }  // Forgot to export

// Error shown:
// Error: No class found in module
```

**After**:
```typescript
@MCPServer
class MyServer { }  // Forgot to export

// Error shown:
// Error: Found @MCPServer decorated class but it is not exported
//
// Fix: Add "export default" to your class:
//
//   @MCPServer
//   export default class MyServer {
//     // ...
//   }
```

**Test Coverage**: `tests/test-decorator-detection.sh`

### 4. Server Discovery When No Arguments Provided

**Problem**: Running `simplymcp run` without arguments just showed generic usage information. Users had no way to discover available servers from their config or see potential server files in their directory.

**What We Fixed**:
- **With Config**: Lists available servers from `simplymcp.config.ts` and suggests how to run them
- **Without Config**: Scans current directory for potential MCP server files (detecting `@MCPServer` or `defineMCP` patterns)
- Provides helpful quick-start guidance instead of just showing usage

**Impact on Users**:
- Easier server discovery in multi-server projects
- Helpful guidance for newcomers exploring a codebase
- Reduced need to manually inspect config files or grep for server definitions

**Before**:
```bash
$ simplymcp run
Usage: simplymcp run <file> [options]
```

**After (with config)**:
```bash
$ simplymcp run
Available servers in simplymcp.config.ts:
  - weather-server (./servers/weather.ts)
  - database-server (./servers/database.ts)

Run a server: simplymcp run <server-name>
```

**After (without config)**:
```bash
$ simplymcp run
No config file found. Scanning for potential MCP servers...

Found potential servers:
  - weather-server.ts (@MCPServer decorator)
  - database-server.ts (defineMCP function)

Run a server: simplymcp run <file>
Quick start: simplymcp config init
```

**Test Coverage**: `tests/test-server-discovery.sh`

### 5. Consistent Verbose Output Across All Adapters

**Problem**: The `--verbose` flag showed inconsistent output depending on which API style was detected. Different adapters used different prefixes (`[RunCommand]`, `[Adapter]`) and varying levels of detail, making it hard to debug issues consistently.

**What We Fixed**:
- Standardized verbose output format across all three API styles:
  - Decorator adapter (class-based)
  - Functional adapter (config-based)
  - Programmatic adapter (direct server)
- Consistent prefix usage throughout
- Same information shown regardless of code path

**Impact on Users**:
- Predictable debugging experience with `--verbose` flag
- Easier to compare behavior across different API styles
- Consistent log format simplifies log parsing and troubleshooting

**Adapters Standardized**:
- Class adapter (`@MCPServer` decorated classes)
- Functional adapter (`defineMCP` configuration)
- Programmatic adapter (direct `SimplyMCP` instantiation)

**Before**:
```bash
# Decorator style
$ simplymcp run my-class-server.ts --verbose
[RunCommand] Starting...
Loading module...

# Functional style
$ simplymcp run my-func-server.ts --verbose
[Adapter] Detected API style: functional
[Adapter] Starting server...

# Different prefixes and detail levels
```

**After**:
```bash
# All styles show consistent output
$ simplymcp run any-server.ts --verbose
[RunCommand] Detected API style: decorator
[RunCommand] Loading class from: /path/to/any-server.ts
[RunCommand] Transport: stdio
[RunCommand] Starting server...
```

**Test Coverage**: `tests/test-verbose-consistency.sh`

## Test Results

All new tests pass successfully, providing regression protection for these UX improvements:

| Test Suite | Status | Purpose |
|------------|--------|---------|
| Config Init | PASS | Validates generated configs |
| Bundle Format | PASS | Verifies ESM default works with top-level await |
| Decorator Detection | PASS (5/5) | Confirms both decorator syntaxes detected |
| Server Discovery | PASS | Tests discovery with/without config |
| Verbose Consistency | PASS | Ensures consistent verbose output |

**Test Files**:
- `tests/test-config-init.sh` - Config initialization validation
- `tests/test-bundle-format.sh` - Bundle format defaults
- `tests/test-decorator-detection.sh` - Decorator regex matching
- `tests/test-server-discovery.sh` - Server discovery scenarios
- `tests/test-verbose-consistency.sh` - Verbose mode consistency

## Breaking Changes

None. All changes are backward compatible.

## Migration Guide

No migration required for existing projects. All improvements are automatic.

**Optional Updates**:
- If you were working around the bundle format issue with `-f esm`, you can now omit this flag
- If you have custom scripts checking for specific verbose output formats, review the new consistent format

## Technical Details

### Files Modified

**Core CLI Files**:
- `src/cli/class-bin.ts` - Decorator detection improvements
- `src/cli/dry-run.ts` - Enhanced validation with better regex
- `src/cli/run.ts` - Server discovery and decorator detection
- `src/cli/bundle-bin.ts` - Changed default format to ESM
- `src/cli/config-bin.ts` - Improved config init template

**Adapters**:
- `src/class-adapter.ts` - Standardized verbose output
- `src/adapter.ts` - Consistent logging format
- `src/cli/func-bin.ts` - Unified verbose messaging

### Development Approach

All improvements followed TDD (Test-Driven Development) with the Red-Green-Refactor cycle:

1. **RED**: Created failing tests documenting the UX issues
2. **GREEN**: Implemented fixes to make tests pass
3. **REFACTOR**: Cleaned up code while maintaining test success

This approach ensures:
- Clear documentation of expected behavior
- Regression protection through automated tests
- Confidence in making future changes

## Known Issues

None

## Contributors

- Claude Code (AI Assistant)
- Nicholas Marinkovich, MD

---

**Full Changelog:** [v2.4.6...v2.4.7](https://github.com/Clockwork-Innovations/simply-mcp-ts/compare/v2.4.6...v2.4.7)
