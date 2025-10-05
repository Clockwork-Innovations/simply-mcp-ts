# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
