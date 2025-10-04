# Release Notes - v2.3.2

**Release Date:** 2025-10-04
**Type:** Patch Release (Bug Fixes)

## Overview

This patch release fixes critical path references and test failures introduced during the repository restructuring from `mcp/` to `src/`. All test suites now pass successfully (100% pass rate).

## Bug Fixes

### Configuration Files
- Fixed handler paths in JSON configuration files (7 files)
  - Updated `./mcp/handlers/` → `./src/handlers/`
  - Affected files:
    - `src/config-test.json`
    - `src/config-test-sse.json`
    - `src/config-test-stateful.json`
    - `src/config.json`
    - `examples/production-config.json`
    - `examples/development-config.json`
    - `examples/secure-config.json`

### Shell Scripts
- Fixed CLI path references in shell scripts (5 files)
  - Updated `dist/mcp/cli/` → `dist/src/cli/`
  - Updated `mcp/` → `src/` for source files
  - Updated `mcp/examples/` → `examples/`
  - Affected files:
    - `scripts/demo-multi-server.sh`
    - `scripts/test-watch-mode.sh`
    - `scripts/run-mcp.sh`
    - `src/test-framework.sh`
    - `src/test-llm-errors.sh`

### TypeScript Files
- **Critical Fix:** Updated runtime path in `src/class-adapter.ts` (Line 45)
  - Changed `dist/mcp` → `dist/src`
  - This was causing module loading failures in decorator API
- Fixed import paths in example files (2 files)
  - `examples/performance-demo.ts`: Updated `../cli/` → `../src/cli/`
  - `examples/auto-install-advanced.ts`: Updated `../core/` → `../src/core/`
- Updated documentation paths in adapter files
  - `src/class-adapter.ts`
  - `src/adapter.ts`
  - `src/cli/func-bin.ts`
- Fixed config import path in `config/simplymcp.config.test.ts`

### Test Scripts
- Fixed path calculation in `tests/test-cli-run.sh`
  - Corrected directory traversal (was going up 2 levels instead of 1)
  - This fix resolved 10+ CLI test failures
- Fixed grep patterns in `tests/test-sse.sh`
  - Corrected regex alternation patterns (lowercase 'l' → pipe '|')
- Fixed curl format string in `tests/test-stateful-http.sh`
  - Removed space in format string: `% {http_code}` → `%{http_code}`
- Adjusted timing for Node.js output buffering
  - Increased sleep duration from 2 to 3 seconds in 6 test cases

## Test Results

All test suites now pass successfully:

| Test Suite | Status | Tests Passed |
|------------|--------|--------------|
| Stdio Transport | ✅ PASS | 13/13 |
| Decorator API | ✅ PASS | 24/24 |
| Stateless HTTP Transport | ✅ PASS | 10/10 |
| Stateful HTTP Transport | ✅ PASS | 18/18 |
| SSE Transport (Legacy) | ✅ PASS | 12/12 |
| CLI Commands | ✅ PASS | 17/17 |

**Total:** 94/94 tests passing (100% success rate)

## Breaking Changes

None

## Migration Guide

No migration required. This is a bug fix release that corrects internal path references.

## Known Issues

None

## Contributors

- Claude Code (AI Assistant)
- Nicholas Marinkovich, MD

---

**Full Changelog:** [v2.3.1...v2.3.2](https://github.com/Clockwork-Innovations/simply-mcp-ts/compare/v2.3.1...v2.3.2)
