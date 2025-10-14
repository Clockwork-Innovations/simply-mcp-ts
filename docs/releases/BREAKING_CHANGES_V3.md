# Breaking Changes for v3.0.0

This document lists all breaking changes introduced in Simply MCP v3.0.0.

## Overview

v3.0.0 is a major cleanup release that removes legacy code, deprecated features, and clarifies the API surface. Breaking changes are acceptable for major versions.

## Breaking Changes

### 1. Programmatic API Class Naming

**Impact**: Medium-High (affects programmatic API users)

**What changed**:
- Programmatic API now uses `BuildMCPServer` for clarity
- Clearer, self-documenting class name

**Why the change**:
- `BuildMCPServer` is more descriptive and self-documenting
- Clearer, more professional API naming
- Major version allows improvements for better long-term API

**Migration**:
Use `BuildMCPServer` for the programmatic API.

```typescript
// v3.0.0+
import { BuildMCPServer } from 'simply-mcp';

const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  description: 'My MCP server'
});

server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({ name: z.string() }),
  execute: async ({ name }) => ({
    content: [{ type: 'text', text: `Hello, ${name}!` }]
  })
});

await server.start();
```

**Backward Compatibility**:
Type aliases are preserved for smooth migration:

```typescript
// v3.0.0+ - Type alias still works
import type { SimplyMCPOptions } from 'simply-mcp';

const config: SimplyMCPOptions = {
  name: 'my-server',
  version: '1.0.0'
};

// Use BuildMCPServer with the config
const server = new BuildMCPServer(config); // ✅ Works
```

**API remains identical**:
- Same constructor signature
- Same methods (`addTool`, `addPrompt`, `addResource`, `start`)
- Same options object structure
- Same behavior and functionality

**Testing**:
All 55/55 tests passing (100% success rate).

---

### 2. SSE Transport Removed

**Impact**: Low (SSE was marked as legacy since v2.3.0)

**What was removed**:
- `src/servers/sseServer.ts` - SSE transport implementation
- SSE transport type support
- All SSE-related tests

**Migration**:
Use HTTP transport (stateful or stateless mode) instead.

```typescript
// v3.0.0+ - Use HTTP transport
import { BuildMCPServer } from 'simply-mcp';

const server = new BuildMCPServer({ name: 'my-server', version: '1.0.0' });

// Option 1: Stateful HTTP (session management)
await server.start({ transport: 'http', port: 3000, stateful: true });

// Option 2: Stateless HTTP (serverless-friendly)
await server.start({ transport: 'http', port: 3000, stateful: false });
```

**Why removed**:
- SSE is no longer part of the MCP specification
- HTTP transport provides better functionality
- Reduces maintenance burden

---

### 3. Legacy Adapter Scripts Removed

**Impact**: Low (CLI commands are recommended since v2.4.0)

**What was removed**:
- `src/adapter.ts` - Functional API adapter
- `src/class-adapter.ts` - Decorator API adapter
- `src/api/functional/adapter.ts` - Adapter utilities

**Migration**:
Use Simply MCP CLI commands instead.

```bash
# v3.0.0+ - Use CLI commands
simplymcp run examples/my-server.ts         # Auto-detect API style
simplymcp-class examples/class-server.ts    # Explicit decorator API
simplymcp-func examples/my-server.ts        # Explicit functional API

# With options
simplymcp run examples/my-server.ts --http --port 3000 --verbose
```

**Why removed**:
- CLI commands provide better auto-detection
- Better error messages and user experience
- Cleaner API surface

---

### 4. Removed Internal Adapter Utilities

**Impact**: Very Low (internal utilities)

**What was removed**:
- `loadConfig()` from `src/api/functional/index.ts`
- `createServerFromConfig()` from `src/api/functional/index.ts`

**Migration**:
Use the public builder functions instead.

```typescript
// v3.0.0+ - Use builder functions
import { defineMCP } from 'simply-mcp';

export default defineMCP({
  name: 'my-server',
  version: '1.0.0',
  tools: [/* ... */]
});
```

**Why removed**:
- These were internal adapter utilities
- Not part of the public API
- Builder functions provide better experience

---

### 5. Test Suite Changes

**Impact**: None for users, only for contributors

**What changed**:
- Removed SSE transport test suite
- Removed legacy-tests CI job
- Updated test runner script

**Test suites reduced from 8 to 7**:
1. v2.4.5 Bug Fixes
2. Stdio Transport
3. Decorator API
4. Stateless HTTP Transport
5. Stateful HTTP Transport
6. HTTP Modes (Stateful/Stateless)
7. CLI Commands
~~8. SSE Transport (Legacy)~~ ← Removed

---

## Non-Breaking Changes

### API Clarifications

These changes clarify the API but do NOT break existing code:

1. **BuildMCPServer is the standard**
   - Primary programmatic API for building MCP servers
   - Clear, self-documenting naming

2. **Type aliases preserved**
   - All type exports remain available
   - Backward compatibility maintained

3. **Subpath exports remain**
   - `simply-mcp/config` still works (backward compatibility)
   - `simply-mcp/decorators` still works (backward compatibility)
   - Unified import from `simply-mcp` is recommended but not required

---

## Upgrade Checklist

Use this checklist to upgrade from v2.x to v3.0.0:

- [ ] **Use `BuildMCPServer` for programmatic API** (if applicable)
  - [ ] Update imports: `import { BuildMCPServer } from 'simply-mcp'`
  - [ ] Use constructor: `new BuildMCPServer(...)`
- [ ] Replace SSE transport with HTTP transport (if used)
- [ ] Replace adapter script usage with CLI commands (if used)
- [ ] Update any direct imports of removed utilities (rare)
- [ ] Update test scripts if using legacy test runner (contributors only)
- [ ] Review documentation for updated examples
- [ ] Run tests to ensure no regressions

---

## Need Help?

- **Migration Guide**: See `docs/migration/v2-to-v3-migration.md`
- **Examples**: See `examples/` directory for updated examples
- **Documentation**: See `docs/` directory for guides
- **Issues**: Report issues at https://github.com/Clockwork-Innovations/simply-mcp-ts/issues

---

**Version**: v3.0.0
**Date**: 2025-10-13
**Breaking Changes**: 3 main items (programmatic API naming, SSE transport, adapters)
**Non-Breaking Changes**: API clarifications
