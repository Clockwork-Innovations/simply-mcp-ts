# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.5] - 2025-10-06

### Added
- **TypeScript Type Exports**: Added missing type exports for `ToolDefinition`, `PromptDefinition`, `ResourceDefinition`, `SimplyMCPOptions`, and `ExecuteFunction`
  - TypeScript users can now properly import and use these types
  - Enables better IDE autocomplete and type checking
- **Server Property Getters**: Added `name`, `version`, and `description` getters to `SimplyMCP` class
  - Allows programmatic access to server metadata
  - Useful for logging, monitoring, and dynamic configuration
- **Health Check Endpoints**: Added `/health` and `/` endpoints to HTTP transport
  - `/health` - Returns detailed server status, resource counts, uptime, and session info
  - `/` - Returns server information and available endpoints
  - Essential for production monitoring and load balancer health checks

### Fixed
- **Documentation**: Corrected README.md basic example with proper async wrapper and correct API usage
  - Changed incorrect `await server.start('stdio')` to `await server.start()`
  - Added async IIFE wrapper for CommonJS compatibility
  - Examples now work in both ESM and CommonJS environments
- **Documentation**: Fixed port mismatches in QUICK-START.md (9 occurrences)
  - All curl examples now use correct port 3000 (was incorrectly 3002)
  - Consistent with actual server configuration

### Documentation
- **HTTP Transport Guide**: Added comprehensive `HTTP_TRANSPORT_GUIDE.md`
  - Explains MCP Streamable HTTP transport and SSE (Server-Sent Events) requirements
  - Documents correct Accept header usage: `Accept: application/json, text/event-stream`
  - Provides examples for stateful vs stateless modes
  - Includes curl, JavaScript/TypeScript, and Python client examples
  - Troubleshooting section for common issues (406 errors, session management)
  - Production deployment guide for Docker, serverless, and reverse proxy setups

### Verified
- **MCP Specification Compliance**: Verified 100% compliance with MCP spec version 2025-03-26
  - Streamable HTTP transport implementation confirmed correct
  - SSE (Server-Sent Events) is the standard MCP transport mechanism
  - Stateful mode: POST, GET, DELETE on `/mcp` endpoint (session management)
  - Stateless mode: POST on `/mcp` endpoint (no sessions, independent requests)
  - GET endpoint is for stream resumption (only needed in stateful mode)
  - All HTTP transport tests passing (9/9 = 100%)

### Notes
- The "HTTP transport hanging" issue reported in QA was not a bug
- HTTP transport requires `Accept: text/event-stream` header per MCP specification
- Returning `406 Not Acceptable` without proper headers is correct behavior
- Both stateful and stateless modes work perfectly when used correctly
- See `HTTP_TRANSPORT_GUIDE.md` for complete usage instructions

## [2.4.4] - 2025-10-05

### Fixed
- **Decorator API**: Fixed critical bug where decorators failed in mixed ESM/CommonJS environments
  - Changed `Symbol()` to `Symbol.for()` for metadata keys
  - Ensures symbols are shared across module instances
  - Fixes "Class must be decorated with @MCPServer" error
  - Works in all environments: ESM, CommonJS, and mixed projects

### Verified
- All decorator regression tests passing (13/13 = 100%)
- Zero performance impact from Symbol.for() change
- No memory leaks or cross-contamination issues

## [2.4.1] - 2025-10-04

### Fixed
- **Dependencies**: Moved `chokidar` and `typescript` from devDependencies to dependencies
  - These packages are required at runtime for bundler watch mode and decorator/class API
  - Fixes `MODULE_NOT_FOUND` errors when installing from npm
- **Security**: Removed deprecated `pkg` package (CVE-2024-24828)
  - Eliminated moderate severity local privilege escalation vulnerability
  - Package now has 0 security vulnerabilities

### Removed
- **Executable format**: Removed `--format executable` option from bundler
  - The Node.js SEA approach created ~120 MB binaries (not suitable for MCP servers)
  - Removed `executable-builder.ts` and all related code
  - Removed `--platforms` and `--compress` CLI options
  - Updated documentation to reflect available formats only

### Changed
- **Bundle formats**: Now supports 4 formats optimized for MCP server deployment:
  - `single-file`: Single bundled JavaScript file (default)
  - `standalone`: Bundle with package.json and README
  - `esm`: ES modules format
  - `cjs`: CommonJS format

### Notes
For MCP server deployments, use:
- **Containers/Docker**: `--format single-file` or `--format standalone`
- **Modern Node.js**: `--format esm`
- **Legacy environments**: `--format cjs`

## [2.4.0] - 2025-10-04

### Added
- HTTP Transport Modes (stateful and stateless)
- Comprehensive test suite improvements
- Enhanced documentation

### Fixed
- GitHub Actions workflows
- Build process improvements

## [2.3.3] - Previous Release

See git history for earlier changes.
