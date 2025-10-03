# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/clockwork-innovations/simply-mcp/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/clockwork-innovations/simply-mcp/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/clockwork-innovations/simply-mcp/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/clockwork-innovations/simply-mcp/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/clockwork-innovations/simply-mcp/releases/tag/v1.0.0
