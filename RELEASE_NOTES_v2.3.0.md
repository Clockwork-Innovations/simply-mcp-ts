# Release Notes - v2.3.0 - Motorcycle Phase

**Release Date:** 2025-10-03
**Type:** Minor Release (Features + Critical Fixes)
**Codename:** Motorcycle Phase - Developer Experience & Multi-Server

## 🎯 Overview

The Motorcycle Phase brings powerful developer tools, multi-server capabilities, and critical TypeScript fixes to SimpleMCP. This release focuses on developer experience with watch mode, debugging support, dry-run validation, and the ability to run multiple servers simultaneously.

**⚠️ CRITICAL FIX**: This release fixes a blocking issue in v2.3.0-rc where TypeScript files couldn't be loaded by npm users.

## 🚨 Critical Fixes

### TypeScript Loading for NPM Users (BLOCKING ISSUE)

**Problem**: In earlier builds, TypeScript files couldn't be loaded when the package was installed from npm. The CLI would fail with "Invalid or unexpected token" errors when trying to run `.ts` files, despite the README showing TypeScript examples.

**Root Cause**:
- `tsx` was in devDependencies instead of dependencies
- Users installing from npm didn't have tsx available
- TypeScript decorators weren't working due to improper module loading

**Fix Applied**:
- Moved `tsx` from devDependencies to dependencies (~10MB added to package)
- Added auto-reexec with `--import tsx` loader for proper decorator support
- Fixed `tsconfig.json` moduleResolution to "bundler"
- Updated all CLI binaries (`run`, `class-bin`, `func-bin`) to handle TypeScript properly

**Impact**: All documented TypeScript examples now work correctly:
```bash
simplymcp run my-server.ts           # ✅ Works
simplymcp-class my-server.ts         # ✅ Works
simplymcp-func my-server.ts          # ✅ Works
```

### Example File Imports

**Problem**: 15+ example files were using source imports (`../decorators.js`) instead of package imports (`'simply-mcp'`), causing them to fail when users tried to run them.

**Fix**: Updated all examples to use proper package imports.

### Decorator Without Config

**Enhancement**: `@MCPServer()` now works without arguments, automatically deriving the server name from the class name in kebab-case and defaulting version to "1.0.0".

```typescript
@MCPServer()  // No config needed! Auto-derives "weather-service"
export default class WeatherService {
  // ...
}
```

## ✨ New Features

### 🔄 Watch Mode

Automatically restart your server when files change during development:

```bash
# Monitor and auto-restart on changes
simplymcp run my-server.ts --watch

# Polling mode for network drives
simplymcp run my-server.ts --watch --watch-poll

# Custom polling interval
simplymcp run my-server.ts --watch --watch-interval 500
```

**Features**:
- Intelligent debouncing (100ms default) prevents restart storms
- Monitors server file and all its dependencies
- Graceful restart with cleanup and state preservation
- Supports network drives and special filesystems with polling mode

### 🐛 Debug Support

Full Node.js Inspector integration for debugging with Chrome DevTools or VS Code:

```bash
# Debug with Chrome DevTools
simplymcp run my-server.ts --inspect

# Pause before execution
simplymcp run my-server.ts --inspect-brk

# Custom inspector port
simplymcp run my-server.ts --inspect --inspect-port 9230
```

**Features**:
- Full TypeScript source map support with tsx loader
- Breakpoint debugging in original TypeScript source
- Step through execution, inspect variables
- Works with Chrome DevTools and VS Code debugger

### ✅ Dry-Run Mode

Validate your server configuration without starting it:

```bash
# Validate configuration
simplymcp run my-server.ts --dry-run

# JSON output for CI/CD
simplymcp run my-server.ts --dry-run --json
```

**Validates**:
- File existence and readability
- API style detection
- Configuration structure
- Tool/prompt/resource definitions
- Import resolution
- TypeScript compilation

### ⚙️ Configuration File Support

Create a `simplymcp.config.ts` file for persistent settings:

```typescript
export default {
  // Global defaults
  defaults: {
    http: true,
    port: 3000,
    verbose: true
  },

  // Named server configurations
  servers: {
    'weather': {
      file: './servers/weather.ts',
      port: 3001
    },
    'calculator': {
      file: './servers/calc.ts',
      port: 3002
    }
  }
};
```

**Features**:
- TypeScript with full type safety
- Multiple format support (`.ts`, `.js`, `.mjs`, `.json`)
- Auto-detection if present
- CLI flags override config settings
- `simplymcp config` command for setup

### 🔀 Multi-Server Support

Run multiple MCP servers simultaneously:

```bash
# Run multiple servers at once
simplymcp run weather.ts calculator.ts translator.ts

# Each gets its own port automatically (3000, 3001, 3002...)
# Color-coded aggregated logging
# All tracked as a group
```

**Management Commands**:

```bash
# List all running servers
simplymcp list
simplymcp list --verbose
simplymcp list --json

# Stop servers
simplymcp stop all              # Stop all servers
simplymcp stop weather          # Stop by name
simplymcp stop 12345            # Stop by PID
simplymcp stop --force          # Force kill unresponsive servers
```

**Features**:
- Automatic port assignment
- Process tracking with registry
- Group management for servers started together
- HTTP transport auto-enabled (multi-server requires HTTP)
- Color-coded output from all servers

### ⚡ Performance Optimizations

**API Style Detection Caching**:
- 11.9x faster API style detection (600ms → 50ms startup)
- Cache stored in `/tmp/simplymcp/cache/`
- Automatic cache invalidation on file changes
- Lazy loading of adapter modules

**Startup Optimizations**:
- Target < 100ms startup time
- Memory efficiency for multi-server scenarios
- Performance metrics tracking

### 🚴 CLI Simplification (Bicycle Phase)

Simplified command structure with auto-detection:

```bash
# Old way (still works)
npx tsx mcp/class-adapter.ts my-server.ts

# New way - auto-detects API style
simplymcp run my-server.ts

# Explicit API style
simplymcp-class my-server.ts    # Force decorator API
simplymcp-func my-server.ts     # Force functional API

# Override auto-detection
simplymcp run my-server.ts --style decorator
```

**Auto-Detection**:
- Detects decorator API (classes with `@MCPServer`)
- Detects functional API (files with `defineMCP`)
- Falls back to programmatic API
- `--verbose` flag shows detection details

## 📊 Test Results

**100% Test Success Rate**:
- ✅ Stdio Transport (1s)
- ✅ Decorator API (3s)
- ✅ Stateless HTTP Transport (8s)
- ✅ Stateful HTTP Transport (5s)
- ✅ SSE Transport (13s)
- ✅ CLI Commands - 17/17 tests (29s)

**Total Duration**: 69s

## 🔄 Changed

- `simplymcp run` now accepts multiple server files
- HTTP transport auto-enabled for multi-server mode
- Improved error messages with actionable suggestions
- Enhanced developer feedback with color-coded status
- Better process management with graceful shutdown
- Updated all documentation examples to new CLI commands

## 📦 Package Changes

**Dependencies Added**:
- `tsx: ^4.20.6` (moved from devDependencies) - Enables TypeScript loading

**Package Size**: ~10MB increase due to tsx being added to dependencies

## 🔧 Breaking Changes

None. This release is fully backward compatible with v2.2.0.

## 📚 Documentation

- All README examples updated
- New debugging guide
- Configuration file documentation
- Multi-server orchestration guide
- Watch mode best practices

## 🙏 Acknowledgments

Thanks to all users who reported the TypeScript loading issue!

## 🚀 Upgrade Instructions

```bash
npm install simply-mcp@2.3.0
```

That's it! All your existing code will continue to work, and you can now use TypeScript files directly without any additional setup.

## 📝 Full Changelog

See [CHANGELOG.md](./CHANGELOG.md) for detailed changes.

---

**Questions or Issues?** Please report at https://github.com/clockwork-innovations/simply-mcp/issues
