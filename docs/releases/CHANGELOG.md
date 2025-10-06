# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.4.7] - 2025-10-06 - UX Improvements & Bug Fixes

This patch release addresses five major user experience issues identified through comprehensive TDD testing. Each fix improves the developer experience by addressing common pain points encountered when working with SimpleMCP.

For detailed information, see the [full release notes](./RELEASE_NOTES_v2.4.7.md).

### Fixed

#### Bug Fixes
- **Config init validation** - Generated configs now pass validation immediately after initialization
  - Example file references are commented out instead of active
  - Users can run `config validate` successfully without creating placeholder files first
  - Reduces friction in the getting-started experience

- **Bundle format defaults** - Changed default bundle format from `single-file` (CJS) to `esm`
  - Top-level await now works with default options
  - Users no longer need to explicitly specify `-f esm` flag
  - Aligns with modern JavaScript/TypeScript best practices (ESM is standard in Node.js 18+)
  - **Migration Note**: If you need CommonJS format, use the `-f single-file` flag explicitly

- **Decorator detection** - Error detection now works for both `@MCPServer()` and `@MCPServer` syntax
  - Updated regex pattern in 4 locations: class-bin.ts, dry-run.ts, run.ts (2 places)
  - Pattern now: `/@MCPServer(\s*\(\s*\))?/` (optional parentheses)
  - Consistent helpful error messages regardless of decorator syntax preference
  - Better guidance when classes aren't exported

### Added

#### Enhancements
- **Server discovery** - Running `simplymcp run` without arguments now provides helpful guidance
  - With config: Lists available servers from `simplymcp.config.ts` and suggests how to run them
  - Without config: Scans current directory for potential MCP server files (detecting `@MCPServer` or `defineMCP` patterns)
  - Easier server discovery in multi-server projects
  - Helpful guidance for newcomers exploring a codebase

- **Verbose mode consistency** - Standardized verbose output format across all three API styles
  - Decorator adapter (class-based)
  - Functional adapter (config-based)
  - Programmatic adapter (direct server)
  - Predictable debugging experience with `--verbose` flag
  - Consistent log format simplifies log parsing and troubleshooting

### Test Coverage

Added 5 new test suites providing regression protection for UX improvements:
- `tests/test-config-init.sh` - Config initialization validation
- `tests/test-bundle-format.sh` - Bundle format defaults
- `tests/test-decorator-detection.sh` - Decorator regex matching (5/5 tests)
- `tests/test-server-discovery.sh` - Server discovery scenarios
- `tests/test-verbose-consistency.sh` - Verbose mode consistency

All tests follow TDD (Test-Driven Development) with Red-Green-Refactor cycle for quality assurance.

### Backwards Compatibility
- ✅ Fully backwards compatible
- ✅ No breaking changes
- ✅ All improvements are automatic
- ⚠️ Optional: If using `-f esm` workaround for bundles, you can now omit this flag

## [2.4.0] - 2025-10-04 - HTTP Transport Modes: Stateful & Stateless

The v2.4.0 release adds support for both stateful and stateless HTTP transport modes, giving developers the flexibility to choose the right architecture for their deployment environment.

### Added

#### HTTP Transport Modes
- **Stateful Mode (Default)** - Session-based transport with SSE streaming
  - Maintains session state across requests using `mcp-session-id` header
  - Supports SSE streaming via GET endpoint for real-time updates
  - Reuses transport instance per session for efficiency
  - Ideal for web applications, multi-step workflows, and long-running conversations

- **Stateless Mode** - Request-response transport without session management
  - Creates fresh transport for each request
  - No session tracking or state persistence
  - Perfect for serverless deployments (AWS Lambda, Cloud Functions)
  - Excellent horizontal scalability
  - Simple request-response pattern

#### API Enhancements
- `HttpOptions` interface for configuring HTTP transport behavior
  - `mode?: 'stateful' | 'stateless'` - Select transport mode (default: 'stateful')
  - `enableJsonResponse?: boolean` - Enable JSON responses (default: false)
  - `dnsRebindingProtection?: boolean` - DNS rebinding protection (default: true)
- Updated `StartOptions` interface to include `http?: HttpOptions`
- Transport mode validation in `SimplyMCP.start()` method

### Changed
- HTTP transport initialization now supports mode selection via `http.mode` option
- Default HTTP mode is 'stateful' for backwards compatibility
- Improved error messages for invalid HTTP mode configuration
- Enhanced logging to display active HTTP mode on server start

### Documentation
- **Updated Guides:**
  - `HTTP-TRANSPORT.md` - Added comprehensive "Transport Modes" section
    - Mode comparison table
    - Quick examples for both modes
    - Decision guidance for mode selection
    - Updated all examples to clarify mode usage
  - `README.md` - Updated with stateful/stateless mode examples
    - Fixed incorrect syntax in HTTP server example (lines 191-194)
    - Added feature bullets for dual HTTP modes
    - Added "When to use each mode" decision guide
    - Updated transport comparison table
  - `TRANSPORTS.md` - Enhanced with mode-specific information
    - Updated comparison table with mode information
    - Expanded decision tree for mode selection
    - Added mode selection summary
    - Updated configuration examples

### Migration Guide

**No Breaking Changes** - Existing code continues to work without modifications. Stateful mode is the default.

**Migrating to Stateless Mode:**

```typescript
// Before (default stateful mode)
await server.start({
  transport: 'http',
  port: 3000
});

// After (explicit stateless mode for serverless)
await server.start({
  transport: 'http',
  port: 3000,
  http: { mode: 'stateless' }
});
```

**Use Cases:**

Stateful Mode (default):
- Web applications with user sessions
- Multi-step workflows requiring context
- Real-time updates via SSE
- Long-running conversations

Stateless Mode:
- AWS Lambda / Cloud Functions
- Serverless deployments
- Stateless microservices
- Simple REST-like APIs
- Load-balanced services without sticky sessions

### Fixed
- **HTTP Modes Test Suite** - Updated test expectations to match stateless mode implementation
  - Stateless mode correctly allows independent requests without session tracking
  - Test suite now passing 14/14 tests
- **CLI Commands Test Suite** - Fixed timing issues causing intermittent failures
  - Added `wait_for_log()` helper function for reliable log polling
  - Increased timeouts from 5-6s to 10s for stability under load
  - Added port cleanup to prevent conflicts
  - Test suite now passing 17/17 tests consistently
- **Bundle Integration Tests** - Enabled config loader tests
  - Uncommented config loader imports in bundle-integration.test.ts
  - Fixed import paths (../../core/ → ../../src/core/)
  - All 48 bundle integration tests now passing
  - Config loader functionality fully tested

### Test Suite
- **100% Pass Rate Achieved** - All 7 test suites passing (was 71% with 2 failing)
- **Total Tests**: 147 tests across all suites
- **Duration**: ~80-85 seconds
- **Reliability**: CLI tests now stable in full suite execution (was flaky)

### Documentation
- Added `CLI_TESTING.md` - Comprehensive CLI test analysis and fixes (610 lines)
- Added `TEST_STATUS_REVIEW.md` - Review of test status and resolutions
- Updated `FINAL_POLISH_REPORT.md` - Accurate test results and bug fix documentation

### Backwards Compatibility
- ✅ Fully backwards compatible
- ✅ Existing code works without changes
- ✅ Stateful mode is default (maintains current behavior)
- ✅ No changes required to client code
- ✅ Session-based applications continue to work as before

## [2.3.0] - 2025-10-03 - Motorcycle Phase: Developer Experience & Multi-Server

The Motorcycle Phase brings powerful developer tools and multi-server capabilities to SimpleMCP.

### Added

#### Watch Mode
- **Auto-restart on file changes** - Monitor server and dependencies for changes
- **Debouncing** - Prevent restart storms with intelligent debouncing (100ms default)
- **Polling mode** (`--watch-poll`) - Support for network drives and special filesystems
- **Custom intervals** (`--watch-interval`) - Configurable polling intervals
- Graceful restart with cleanup and state preservation

#### Debug Support
- **Node.js Inspector integration** - Full debugging support with `--inspect` flag
- **Chrome DevTools** - Debug with Chrome's DevTools interface
- **VS Code debugging** - Attach VS Code debugger to running servers
- **Break on start** (`--inspect-brk`) - Pause execution before code runs
- **Custom inspector port** (`--inspect-port`) - Configure inspector port (default: 9229)
- **TypeScript debugging** - Full source map support with tsx loader
- Comprehensive debugging documentation

#### Dry-Run Mode
- **Configuration validation** (`--dry-run`) - Validate without starting server
- **JSON output** (`--json`) - Machine-readable validation results
- **CI/CD integration** - Perfect for pre-deployment validation
- Comprehensive validation checks:
  - File existence and readability
  - API style detection
  - Configuration structure
  - Tool/prompt/resource definitions
  - Import resolution

#### Configuration File Support
- **`simplymcp.config.ts`** - TypeScript configuration with full type safety
- **Multiple formats** - Support for `.ts`, `.js`, `.mjs`, `.json`
- **Named server configs** - Define multiple servers with names
- **Global defaults** - Set default options for all servers
- **Config management** - `simplymcp config` command for setup
- **Auto-detection** - Finds config automatically if present
- **Override support** - CLI flags override config settings

#### Multi-Server Support
- **Run multiple servers** - `simplymcp run server1.ts server2.ts server3.ts`
- **Auto port assignment** - Automatically assigns sequential ports
- **Aggregated logging** - Color-coded output from all servers
- **Process tracking** - Registry-based server tracking
- **`list` command** - View all running servers with status
  - Verbose mode (`--verbose`) - Detailed server information
  - JSON output (`--json`) - Machine-readable format
  - Cleanup mode (`--cleanup`) - Remove stale entries
- **`stop` command** - Stop servers by name, PID, or all
  - Stop all servers (`simplymcp stop all`)
  - Stop by PID (`simplymcp stop 12345`)
  - Stop by name (`simplymcp stop weather`)
  - Force kill (`--force`) - SIGKILL for unresponsive servers
- **Group management** - Servers started together tracked as a group
- **HTTP transport required** - Multi-server mode uses HTTP (stdio is single-server only)

#### Performance Optimizations
- **Detection caching** - 11.9x faster API style detection
  - Cache detection results in `/tmp/simplymcp/cache/`
  - Invalidation on file changes
  - Reduced startup time from ~600ms to ~50ms
- **Lazy loading** - Adapter modules loaded only when needed
- **Performance metrics** - Track and display startup timings
- **Startup optimizations** - Target < 100ms startup time
- **Memory efficiency** - Optimized memory usage for multi-server scenarios

#### CLI Enhancements
- **CLI Simplification (Bicycle Phase)**
  - `simplymcp run` command with automatic API style detection
  - `simplymcp-run` bin alias for direct execution
  - `simplymcp-class` bin alias for decorator API servers
  - `simplymcp-func` bin alias for functional API servers
  - Auto-detection of decorator, functional, and programmatic API styles
  - `--style` flag to override auto-detection
  - `--verbose` flag to show detection details

### Changed
- `simplymcp run` now accepts multiple server files as arguments
- HTTP transport auto-enabled for multi-server mode (with port auto-assignment)
- Improved error messages with actionable suggestions
- Enhanced developer feedback with color-coded status messages
- Better process management with graceful shutdown handling
- Improved CLI user experience with shorter, cleaner commands
- Updated all documentation examples to use new CLI commands

### Fixed
- **CRITICAL: TypeScript loading for npm users** - Fixed blocking issue where `.ts` files couldn't be loaded
  - Moved `tsx` from devDependencies to dependencies
  - Added auto-reexec with `--import tsx` loader for decorator support
  - Fixed moduleResolution in tsconfig.json
  - All CLI binaries now properly handle TypeScript files
- **Example file imports** - Fixed 15+ examples using source imports instead of package imports
- **Decorator without config** - `@MCPServer()` now works without arguments (auto-derives name from class)
- **Test suite timing** - Fixed test timing issues for tsx re-exec overhead
- Process cleanup on server termination
- File watching on network drives with polling mode
- Inspector connection stability
- Multi-server port conflict resolution
- Config file loading edge cases

### Documentation
- **New Guides:**
  - `DEBUGGING.md` - Complete debugging guide
  - `MULTI_SERVER_QUICKSTART.md` - Multi-server getting started
  - `MULTI_SERVER_IMPLEMENTATION.md` - Implementation details
- **Updated Guides:**
  - `README.md` - Added Developer Features section
  - `QUICK-START.md` - Added watch/debug examples
  - Example files - Updated with new CLI usage patterns

### Deprecated
- Old adapter commands (`npx tsx mcp/adapter.ts` and `npx tsx mcp/class-adapter.ts`) still work but are deprecated

### Performance Metrics
- API style detection: 11.9x faster with caching
- Startup time: < 100ms (from ~600ms)
- Multi-server startup: < 200ms for 3 servers
- Watch mode restart: < 150ms

## [2.2.0] - 2025-10-03

### Added
- **Advanced Bundle Formats (Feature 4.2)**
  - Standalone format: Directory bundles with package.json, native modules, and assets
  - Executable format: Native binaries for Linux, macOS, Windows, and Alpine (no Node.js required)
  - Enhanced source map support with inline, external, and both modes
  - Watch mode for development with auto-rebuild on file changes
  - Cross-platform builds: Generate executables for multiple platforms simultaneously
  - New CLI flags: `--format`, `--platforms`, `--compress`, `--assets`, `--watch-poll`, `--watch-interval`, `--watch-restart`

### Changed
- Updated chokidar dependency from 3.6.0 to 4.0.3 (improved file watching)
- Enhanced bundler with format routing and advanced output options

### Fixed
- Path resolution for absolute and relative asset paths in standalone format
- Directory-based output path handling for standalone bundles
- TypeScript error handling in watch mode for stricter type safety

### Developer Experience
- 65 new comprehensive tests for advanced bundling features
- Full integration testing for all formatter components
- Complete documentation for new bundling formats

## [2.1.0] - 2025-10-03

### Added
- **CLI Infrastructure & Core Bundling (Feature 4.1)**
  - New `simplemcp bundle` command for bundling MCP servers into single-file executables
  - Entry point auto-detection (server.ts, index.ts, main.ts, src/server.ts, etc.)
  - Configuration file support (simplemcp.config.js, simplemcp.config.mjs, simplemcp.config.json)
  - Single-file bundling with esbuild for optimized deployment
  - Minification and tree-shaking for reduced bundle sizes
  - Native module detection and external handling (fsevents, etc.)
  - Source map support (inline, external, or disabled)
  - ESM/CJS format support with proper module resolution
  - Verbose output mode for debugging bundle process
  - Comprehensive test suite (116/116 tests passing)

### Fixed
- CLI flag conflicts between verbose (-v) and version (-V) flags
- Config loader integration with CLI commands
- Dependency resolution edge cases for native modules

## [2.0.1] - 2025-10-03

### Fixed
- @prompt and @resource decorators now work correctly with stage-3 decorators
- Decorator metadata handling improved for prompt and resource definitions

## [2.0.0] - 2025-10-03

### Added
- Decorator API improvements with full stage-3 decorator support
- Enhanced type inference for decorators

### Changed
- Updated to stage-3 decorator implementation
- Improved decorator metadata system

## [1.0.0] - 2025-10-02

### Added

#### Core Features
- Three API styles for creating MCP servers:
  - **Decorator API**: Class-based with automatic type inference from JSDoc
  - **Functional API**: Single-file declarative configuration
  - **Programmatic API**: Dynamic server generation with full control
- Multiple transport support:
  - stdio (standard input/output)
  - HTTP (stateful and stateless)
  - SSE (Server-Sent Events)
- Full TypeScript support with Zod schema validation
- Session management for stateful connections

#### Enhanced Protocol Features
- LLM sampling/completions via client
- Progress notifications for long-running operations
- Resource management (read/list)
- Binary content support:
  - Images (PNG, JPEG, etc.)
  - Audio (MP3, WAV, etc.)
  - Generic binary data
  - PDF support

#### Developer Experience
- Automatic type inference from JSDoc comments in Decorator API
- Schema builder for clean parameter definitions
- Comprehensive error handling with custom error classes
- Built-in logging with multiple levels
- Content helper functions for creating responses

#### Advanced Features (Phase 2)
- Inline dependency declarations
- Automatic dependency installation
- Handler bundling for deployment
- Dependency validation and resolution
- Package manager detection (npm, yarn, pnpm)

#### Documentation
- Quick start guide
- Complete API documentation
- Architecture documentation
- Deployment guide
- Handler development guide
- API integration examples
- Module usage guide

#### Testing
- Comprehensive test suite (53/53 tests passing)
- Tests for all transport types
- Integration tests
- Example implementations

### Module System
- Properly configured as npm module
- TypeScript declaration files
- ESM and CommonJS support
- Clean exports for public API

### Documentation for Open Source
- README with features, examples, and quick start
- LICENSE (MIT)
- CONTRIBUTING guidelines
- CHANGELOG
- Open source release checklist

### Dependencies
- `@modelcontextprotocol/sdk` ^1.18.2
- `express` ^5.1.0
- `cors` ^2.8.5
- `zod` ^4.1.11
- `reflect-metadata` ^0.2.2
- `zod-to-json-schema` ^3.24.6

## Version History

### Version Numbering

We use [Semantic Versioning](https://semver.org/):
- MAJOR version for incompatible API changes
- MINOR version for backwards-compatible functionality additions
- PATCH version for backwards-compatible bug fixes

### Types of Changes

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

---

[Unreleased]: https://github.com/clockwork-innovations/simply-mcp-ts/compare/v2.4.7...HEAD
[2.4.7]: https://github.com/clockwork-innovations/simply-mcp-ts/compare/v2.4.6...v2.4.7
[2.4.0]: https://github.com/clockwork-innovations/simply-mcp-ts/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/clockwork-innovations/simply-mcp-ts/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/clockwork-innovations/simply-mcp-ts/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/clockwork-innovations/simply-mcp-ts/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/clockwork-innovations/simply-mcp-ts/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/clockwork-innovations/simply-mcp-ts/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/clockwork-innovations/simply-mcp-ts/releases/tag/v1.0.0
