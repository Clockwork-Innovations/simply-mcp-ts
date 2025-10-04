# SimpleMCP Features

Comprehensive feature matrix and capabilities overview for SimpleMCP.

## CLI Commands

| Command | Description | Version | Phase |
|---------|-------------|---------|-------|
| `simplymcp run` | Run one or more MCP servers with auto-detection | v2.3.0 | Bicycle |
| `simplymcp bundle` | Bundle server for distribution | v2.1.0 | Production |
| `simplymcp list` | List running servers | v2.3.0 | Motorcycle |
| `simplymcp stop` | Stop running servers | v2.3.0 | Motorcycle |
| `simplymcp config` | Manage configuration files | v2.3.0 | Motorcycle |
| `simplymcp-class` | Explicit decorator API runner | v2.3.0 | Bicycle |
| `simplymcp-func` | Explicit functional API runner | v2.3.0 | Bicycle |

## Developer Features

### Core Development Tools

| Feature | Flag | Description | Version | Phase |
|---------|------|-------------|---------|-------|
| **Auto-detection** | - | Automatically detect API style (decorator/functional/programmatic) | v2.3.0 | Bicycle |
| **Watch mode** | `--watch` | Auto-restart server on file changes | v2.3.0 | Motorcycle |
| **Polling watch** | `--watch-poll` | Use polling for network drives | v2.3.0 | Motorcycle |
| **Watch interval** | `--watch-interval` | Custom polling interval (ms) | v2.3.0 | Motorcycle |
| **Debug support** | `--inspect` | Enable Node.js inspector | v2.3.0 | Motorcycle |
| **Debug break** | `--inspect-brk` | Break before code starts | v2.3.0 | Motorcycle |
| **Inspector port** | `--inspect-port` | Custom inspector port (default: 9229) | v2.3.0 | Motorcycle |
| **Dry-run** | `--dry-run` | Validate without starting | v2.3.0 | Motorcycle |
| **JSON output** | `--json` | Machine-readable output | v2.3.0 | Motorcycle |
| **Verbose mode** | `--verbose` | Detailed logging | v2.3.0 | Bicycle |

### Configuration & Setup

| Feature | Description | Version | Phase |
|---------|-------------|---------|-------|
| **Config files** | `simplymcp.config.ts/js/mjs/json` support | v2.3.0 | Motorcycle |
| **Named servers** | Define multiple servers with names | v2.3.0 | Motorcycle |
| **Global defaults** | Set default options for all servers | v2.3.0 | Motorcycle |
| **Config override** | CLI flags override config settings | v2.3.0 | Motorcycle |
| **Auto-detection** | Finds config automatically | v2.3.0 | Motorcycle |
| **Type safety** | Full TypeScript support in config | v2.3.0 | Motorcycle |

### Multi-Server Support

| Feature | Description | Version | Phase |
|---------|-------------|---------|-------|
| **Multiple servers** | Run multiple servers: `run s1.ts s2.ts s3.ts` | v2.3.0 | Motorcycle |
| **Auto port assignment** | Automatically assigns sequential ports | v2.3.0 | Motorcycle |
| **Aggregated logging** | Color-coded output from all servers | v2.3.0 | Motorcycle |
| **Server tracking** | Registry-based process tracking | v2.3.0 | Motorcycle |
| **List servers** | View all running servers | v2.3.0 | Motorcycle |
| **Stop servers** | Stop by PID, name, or all | v2.3.0 | Motorcycle |
| **Group management** | Servers started together tracked as group | v2.3.0 | Motorcycle |
| **Force kill** | SIGKILL for unresponsive servers | v2.3.0 | Motorcycle |
| **Cleanup** | Remove stale registry entries | v2.3.0 | Motorcycle |

### Performance

| Feature | Description | Metric | Version |
|---------|-------------|--------|---------|
| **Detection caching** | Cache API style detection results | 11.9x faster | v2.3.0 |
| **Lazy loading** | Load adapters only when needed | Reduced memory | v2.3.0 |
| **Startup optimization** | Optimized initialization | < 100ms | v2.3.0 |
| **Multi-server startup** | Parallel server initialization | < 200ms for 3 servers | v2.3.0 |
| **Watch restart** | Fast restart on changes | < 150ms | v2.3.0 |
| **Performance metrics** | Track and display timings | Built-in | v2.3.0 |

## API Styles

### Decorator API (Class-based)

| Feature | Supported | Notes |
|---------|-----------|-------|
| **@MCPServer** | ✅ | Class decorator for server definition |
| **@tool** | ✅ | Method decorator for tools |
| **@prompt** | ✅ | Method decorator for prompts |
| **@resource** | ✅ | Method decorator for resources |
| **JSDoc inference** | ✅ | Auto-infer types from JSDoc |
| **TypeScript types** | ✅ | Full type safety |
| **Optional params** | ✅ | Support for optional parameters |
| **Default values** | ✅ | Parameter default values |
| **Auto-registration** | ✅ | Public methods auto-registered |
| **Private methods** | ✅ | Methods starting with _ are private |

**Ease of Use**: ⭐⭐⭐⭐⭐
**Type Safety**: ⭐⭐⭐⭐⭐
**Flexibility**: ⭐⭐⭐

### Functional API (declarative)

| Feature | Supported | Notes |
|---------|-----------|-------|
| **defineMCP** | ✅ | Single-file server definition |
| **Zod schemas** | ✅ | Full Zod validation support |
| **Tools** | ✅ | Define tools with schemas |
| **Prompts** | ✅ | Template-based prompts |
| **Resources** | ✅ | Static and dynamic resources |
| **Async execution** | ✅ | Full async/await support |
| **Type inference** | ✅ | Infer types from Zod schemas |
| **Clean syntax** | ✅ | Declarative configuration |

**Ease of Use**: ⭐⭐⭐⭐
**Type Safety**: ⭐⭐⭐⭐
**Flexibility**: ⭐⭐⭐⭐

### Programmatic API

| Feature | Supported | Notes |
|---------|-----------|-------|
| **SimplyMCP class** | ✅ | Full programmatic control |
| **Dynamic tools** | ✅ | Add tools at runtime |
| **Dynamic prompts** | ✅ | Add prompts at runtime |
| **Dynamic resources** | ✅ | Add resources at runtime |
| **Event hooks** | ✅ | Lifecycle event hooks |
| **State management** | ✅ | Custom state handling |
| **Middleware** | ✅ | Custom middleware support |

**Ease of Use**: ⭐⭐⭐
**Type Safety**: ⭐⭐⭐⭐
**Flexibility**: ⭐⭐⭐⭐⭐

## Transport Support

| Transport | Supported | Use Case | Notes |
|-----------|-----------|----------|-------|
| **stdio** | ✅ | CLI tools, local scripts | Default for single server |
| **HTTP** | ✅ | Web apps, APIs | Required for multi-server |
| **SSE** | ✅ | Streaming, real-time | Legacy support |

## Protocol Features

### Core MCP Protocol

| Feature | Supported | Version |
|---------|-----------|---------|
| **Tools** | ✅ | v1.0.0 |
| **Prompts** | ✅ | v1.0.0 |
| **Resources** | ✅ | v1.0.0 |
| **Sampling** | ✅ | v1.0.0 |
| **Progress** | ✅ | v1.0.0 |
| **Cancellation** | ✅ | v1.0.0 |
| **Roots** | ✅ | v1.0.0 |

### Enhanced Features

| Feature | Supported | Description |
|---------|-----------|-------------|
| **Binary content** | ✅ | Images, audio, PDFs |
| **Streaming** | ✅ | Server-Sent Events |
| **Session management** | ✅ | Stateful connections |
| **Error handling** | ✅ | Structured error responses |
| **Validation** | ✅ | Input/output validation |
| **Type safety** | ✅ | Full TypeScript support |

## Bundling & Distribution

### Bundle Formats

| Format | Description | Use Case | Version |
|--------|-------------|----------|---------|
| **single-file** | Single JavaScript file | Simple deployment | v2.1.0 |
| **standalone** | Directory with package.json | With native modules | v2.2.0 |
| **executable** | Native binary | No Node.js needed | v2.2.0 |
| **ESM** | ES modules | Modern environments | v2.1.0 |
| **CJS** | CommonJS | Legacy compatibility | v2.1.0 |

### Bundle Features

| Feature | Description | Version |
|---------|-------------|---------|
| **Minification** | Reduce bundle size | v2.1.0 |
| **Source maps** | Debug support (inline/external/both) | v2.2.0 |
| **Tree-shaking** | Remove unused code | v2.1.0 |
| **Native modules** | Auto-detect and externalize | v2.1.0 |
| **Assets** | Include static files | v2.2.0 |
| **Watch mode** | Auto-rebuild on changes | v2.2.0 |
| **Auto-restart** | Restart after rebuild | v2.2.0 |
| **Cross-platform** | Build for multiple platforms | v2.2.0 |
| **Compression** | GZip compression for executables | v2.2.0 |

### Supported Platforms (Executable)

| Platform | Binary Name | Supported |
|----------|-------------|-----------|
| **Linux** | `*-linux` | ✅ |
| **macOS (Intel)** | `*-macos` | ✅ |
| **macOS (ARM)** | `*-macos-arm` | ✅ |
| **Windows** | `*-win.exe` | ✅ |
| **Alpine** | `*-alpine` | ✅ |

## Debugging & Validation

### Debug Features

| Feature | Description | Tool |
|---------|-------------|------|
| **Node.js Inspector** | Built-in debugger | Chrome DevTools, VS Code |
| **Breakpoints** | Set breakpoints in code | All IDEs |
| **Step debugging** | Step through execution | All IDEs |
| **Variable inspection** | Inspect runtime values | All IDEs |
| **Call stack** | View execution stack | All IDEs |
| **Performance profiling** | CPU and memory profiling | Chrome DevTools |
| **Source maps** | Debug TypeScript directly | Built-in |

### Validation

| Feature | Description | Version |
|---------|-------------|---------|
| **Dry-run mode** | Validate without running | v2.3.0 |
| **Syntax checking** | Check code syntax | v2.3.0 |
| **Import resolution** | Verify imports | v2.3.0 |
| **Config validation** | Validate configuration | v2.3.0 |
| **Schema validation** | Validate tool schemas | v1.0.0 |
| **Type checking** | Full TypeScript checking | v1.0.0 |

## Integration

### Claude Integration

| Feature | Supported | Notes |
|---------|-----------|-------|
| **Claude Code CLI** | ✅ | Full support |
| **Claude Desktop** | ✅ | Full support |
| **.mcp.json** | ✅ | Configuration file |
| **Environment vars** | ✅ | Support for secrets |
| **Auto-detection** | ✅ | Detects API style |

### Development Tools

| Tool | Integration | Version |
|------|-------------|---------|
| **VS Code** | ✅ Debugging | v2.3.0 |
| **Chrome DevTools** | ✅ Debugging | v2.3.0 |
| **TypeScript** | ✅ Full support | v1.0.0 |
| **esbuild** | ✅ Bundling | v2.1.0 |
| **Zod** | ✅ Validation | v1.0.0 |
| **npm/yarn/pnpm** | ✅ Package managers | v1.0.0 |

### CI/CD

| Feature | Supported | Use Case |
|---------|-----------|----------|
| **Dry-run validation** | ✅ | Pre-deployment checks |
| **JSON output** | ✅ | Parse results |
| **Exit codes** | ✅ | Success/failure detection |
| **Bundle verification** | ✅ | Verify build output |
| **Cross-platform builds** | ✅ | Multi-platform deployment |

## Documentation

| Document | Description | Phase |
|----------|-------------|-------|
| **README.md** | Overview and quick start | All |
| **CHANGELOG.md** | Version history | All |
| **FEATURES.md** | This document | Motorcycle |
| **DEBUGGING.md** | Debug guide | Motorcycle |
| **QUICK-START.md** | 5-minute tutorial | Base |
| **INDEX.md** | Documentation index | Base |
| **HTTP-TRANSPORT.md** | HTTP transport guide | Base |
| **DECORATOR-API.md** | Decorator API reference | Base |
| **MULTI_SERVER_QUICKSTART.md** | Multi-server guide | Motorcycle |
| **MULTI_SERVER_IMPLEMENTATION.md** | Implementation details | Motorcycle |

## Version History

### Release Phases

| Phase | Version | Name | Key Features |
|-------|---------|------|-------------|
| **Base** | v1.0.0 | Foundation | Core MCP, 3 API styles |
| **Production** | v2.0.0-2.2.0 | Bundling | Production bundling, executables |
| **Bicycle** | v2.3.0 | CLI Simplification | Auto-detection, simplified commands |
| **Motorcycle** | v2.3.0 | Dev Tools | Watch, debug, multi-server, config |

### Feature Timeline

```
v1.0.0 (Base)
├── Decorator API
├── Functional API
├── Programmatic API
├── stdio/HTTP/SSE transports
└── Core MCP protocol

v2.0.0-2.2.0 (Production)
├── Bundle command
├── Standalone format
├── Executable format
├── Cross-platform builds
└── Advanced source maps

v2.3.0 (Bicycle + Motorcycle)
├── Auto-detection
├── Simplified CLI
├── Watch mode
├── Debug support
├── Dry-run validation
├── Config files
├── Multi-server
├── Performance optimizations
└── list/stop commands
```

## Quick Reference

### Most Used Commands

```bash
# Development
simplymcp run server.ts --watch --inspect

# Validation
simplymcp run server.ts --dry-run --json

# Multi-server
simplymcp run s1.ts s2.ts s3.ts --http --port 3000

# Production build
simplemcp bundle server.ts --format executable --platforms linux,macos,windows

# Server management
simplymcp list --verbose
simplymcp stop all
```

### Feature Status Legend

- ✅ **Fully Supported** - Production ready
- 🚧 **In Development** - Coming soon
- ❌ **Not Supported** - Not planned
- 📋 **Planned** - On roadmap

## Future Roadmap

### Planned Features

| Feature | Target Version | Phase |
|---------|---------------|-------|
| **Plugin system** | v2.4.0 | Extension |
| **Hot reload** | v2.4.0 | Dev Tools |
| **Test framework** | v2.5.0 | Testing |
| **Monitoring** | v2.5.0 | Production |
| **Load balancing** | v2.6.0 | Scale |
| **Clustering** | v2.6.0 | Scale |

---

**Last Updated**: October 3, 2025
**Current Version**: v2.3.0 (Motorcycle Phase)
**License**: MIT
