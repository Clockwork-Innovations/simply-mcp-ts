# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/clockwork-innovations/simply-mcp/compare/v2.3.0...HEAD
[2.3.0]: https://github.com/clockwork-innovations/simply-mcp/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/clockwork-innovations/simply-mcp/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/clockwork-innovations/simply-mcp/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/clockwork-innovations/simply-mcp/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/clockwork-innovations/simply-mcp/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/clockwork-innovations/simply-mcp/releases/tag/v1.0.0
