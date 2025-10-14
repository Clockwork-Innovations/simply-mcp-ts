# UX/UI Improvements Roadmap for simply-mcp

**Created:** 2025-10-06
**Target Version:** v2.5.0 / v3.0.0
**Priority:** High - Critical for improved developer experience

## Overview

This document captures UX/UI issues discovered during production readiness testing and ongoing usage, along with proposed improvements to enhance the developer experience.

---

## 1. Import Ergonomics Issues

### Current Problem

The import structure is fragmented and not ergonomic:

```typescript
// Current (v2.4.7) - Multiple import paths required
import { BuildMCPServer, defineMCP, MCPBuilder } from 'simply-mcp';
import { MCPServer, tool, prompt, resource } from 'simply-mcp/decorators';
import type { CLIConfig } from 'simply-mcp/config';
```

**Issues:**
- Decorators require a separate import path (`simply-mcp/decorators`)
- Config types require yet another import path (`simply-mcp/config`)
- Not intuitive - developers expect everything under main namespace
- Increases cognitive load for new users
- Inconsistent with common patterns in popular frameworks (Next.js, Nest.js, etc.)

### Proposed Solution

**Option A: Unified Main Export (Recommended)**
```typescript
// Proposed (v3.0.0) - Everything from main package
import {
  MCPServer,     // Class for programmatic API
  defineMCP,     // Function for configuration-based API
  MCPBuilder,    // Builder pattern API
  // Decorators
  tool,
  prompt,
  resource,
  // Types
  type CLIConfig,
  type ServerConfig,
  type ToolDefinition
} from 'simply-mcp';
```

**Option B: Keep Subpaths but Add Main Exports**
```typescript
// Both work:
import { tool, prompt, resource } from 'simply-mcp';
import { tool, prompt, resource } from 'simply-mcp/decorators'; // Still available
```

**Priority:** HIGH
**Breaking Change:** Yes (v3.0.0)
**Effort:** Medium (update exports, documentation, examples)

---

## 2. Class Naming Issues

### ✅ Resolved in v3.0.0

The programmatic API now uses `BuildMCPServer` for clarity and better developer experience.

**Current (v3.0.0+):**
```typescript
const server = new BuildMCPServer({ name: 'my-server', version: '1.0.0' });
```

**Benefits:**
- Clear, self-documenting naming
- "BuildMCPServer" clearly communicates its purpose
- More professional API naming
- Better developer experience for new users

**Resolution:**
This issue has been resolved in v3.0.0 with the adoption of `BuildMCPServer` as the standard programmatic API.

---

## 3. Documentation Issues

### 3.1 Inconsistent Import Examples

**Problem:** Documentation shows different import patterns across files

Examples found:
- `import { MCPServer, tool } from 'simply-mcp/decorators'` (old subpath imports)
- `import { MCPServer, tool } from 'simply-mcp'` (unified imports)
- Various inconsistencies across documentation files

**Solution:**
- Audit ALL documentation files
- Standardize on unified import pattern
- Add migration guide for v2 → v3
- Create a style guide for code examples

**Priority:** HIGH
**Effort:** Medium

### 3.2 Missing/Incomplete Documentation

**Issues Identified:**
1. No clear migration guide from v2.x to v3.x
2. Decorator API reference incomplete
3. Missing examples for:
   - Complex tool parameter types
   - Error handling patterns
   - Resource pagination
   - Session management in HTTP mode
4. Bundle command documentation incomplete (found during testing)
5. No troubleshooting guide for common bundling issues

**Priority:** HIGH
**Effort:** High

### 3.3 CLI Help Text Improvements

**Current Issues:**
- Help text doesn't show all available options clearly
- Examples could be more comprehensive
- Missing common use cases

**Proposed Improvements:**
```bash
# Better examples in help text
simplymcp run --help

Examples:
  simplymcp run server.ts                     # Auto-detect and run
  simplymcp run server.ts --watch             # Watch for changes
  simplymcp run server.ts --http --port 3000  # HTTP mode
  simplymcp run server.ts --inspect           # Debug mode
  simplymcp run server.ts --dry-run           # Validate only
```

**Priority:** MEDIUM
**Effort:** Low

---

## 4. API Consistency Issues

### 4.1 Decorator Parameter Inconsistency

**Current Issue:**
```typescript
// tool decorator takes string OR object
@tool('Description')              // String form
@tool({ description: 'Desc' })   // Object form

// But based on source code inspection, only string works?
```

**Found During Testing:**
```typescript
// This failed:
@tool({ description: 'Test tool' })

// This worked:
@tool('Test tool description')
```

**Solution:**
- Clarify which form is supported
- If only string is supported, update TypeScript types to reflect this
- Or implement object form consistently across all decorators

**Priority:** HIGH
**Effort:** Medium

### 4.2 API Style Naming

**Current:**
- Class-based with decorators: "Decorator API"
- Function-based with defineMCP: "Programmatic API" / "Functional API"
- Builder pattern: Inconsistently named

**Proposed Standardization:**
1. **Decorator API** - Class-based with decorators
2. **Configuration API** - Function-based with `defineMCP()`
3. **Builder API** - Fluent builder pattern with `MCPBuilder`
4. **Programmatic API** - Direct instantiation with `new Server()`

Update all documentation to use consistent terminology.

**Priority:** MEDIUM
**Effort:** Low (documentation only)

---

## 5. Bundle Command Issues

### Problems Found During Testing

1. **Bundled output has dynamic require issues**
   - ESM bundles fail with "Dynamic require of 'node:events' is not supported"
   - CJS bundles also have issues
   - External flags don't fully resolve the problem

2. **Unclear when to use bundling vs direct execution**
   - Documentation doesn't explain tradeoffs
   - No guidance on deployment scenarios

3. **Bundle warnings not explained**
   ```
   ▲ [WARNING] "esbuild" should be marked as external for use with "require.resolve"
   ```

**Solutions:**
- Fix dynamic require issues in bundler
- Add comprehensive bundling guide
- Document when bundling is/isn't recommended
- Add troubleshooting section for common bundle errors
- Consider making bundle command "experimental" until issues are resolved

**Priority:** MEDIUM
**Effort:** High

---

## 6. Error Messages & Developer Feedback

### 6.1 Error Message Quality

**Issues:**
- Some errors are too terse: "Error loading config file"
- Stack traces are verbose
- Not clear what action to take

**Improvements:**
```typescript
// Current:
// Error loading config file: (0 , import_simply_mcp.createServer) is not a function

// Proposed:
// Error: Invalid configuration
//
// The exported value from 'server.ts' is not a valid MCP server configuration.
//
// Expected one of:
//   - A class decorated with @MCPServer
//   - A configuration object from defineMCP()
//   - A BuildMCPServer instance
//
// See: https://docs.simply-mcp.dev/config
```

**Priority:** MEDIUM
**Effort:** Medium

### 6.2 Validation Feedback

Currently if a tool fails validation, the error doesn't always clearly indicate:
- Which tool failed
- Which parameter is invalid
- What the expected type was

**Priority:** MEDIUM
**Effort:** Medium

---

## 7. TypeScript Types & Intellisense

### Issues

1. **Tool handler return types are too loose**
   - Should enforce proper MCP response format
   - Intellisense could be better

2. **Generic type inference could be improved**
   ```typescript
   // Current: Type inference doesn't always work
   @tool()
   async myTool(args: { foo: string }) {
     return args.foo; // Should this be valid?
   }
   ```

3. **Config type exports incomplete**
   - Some internal types would be useful for extensions
   - No exported types for handler development

**Priority:** MEDIUM
**Effort:** Medium-High

---

## 8. CLI Command Structure

### Potential Improvements

**Current:**
```bash
simplymcp run server.ts
simplymcp-class server.ts
simplymcp-func config.ts
simplymcp-bundle entry.ts
```

**Consider:**
```bash
# More consistent subcommand structure?
simplymcp run server.ts
simplymcp run --class server.ts
simplymcp run --func config.ts
simplymcp bundle entry.ts
```

This would reduce the number of bin entries and make the CLI more cohesive.

**Priority:** LOW
**Effort:** Medium (breaking change)

---

## 9. Default Behavior Questions

### Issues Discovered

1. **Server naming defaults**
   - Class name → lowercase is good
   - But what about multi-word classes? `MyWeatherServer` → `myweatherserver`?
   - Should it be `my-weather-server` (kebab-case)?

2. **Port defaults for HTTP**
   - Currently defaults to 3000
   - Consider making it random/auto-assign to avoid conflicts?

3. **Verbose logging**
   - Lots of `[ClassAdapter]`, `[HandlerManager]` logs
   - Should these be behind `--verbose` flag?

**Priority:** LOW
**Effort:** Low-Medium

---

## 10. Examples & Templates

### Missing Examples

Based on testing, these examples would be valuable:

1. **Real-world tool examples:**
   - File system operations
   - API integrations
   - Database queries
   - Authentication patterns

2. **Deployment examples:**
   - Docker deployment
   - Serverless (Lambda, Cloud Functions)
   - Kubernetes manifests
   - PM2 configuration

3. **Integration examples:**
   - Claude Desktop integration
   - Continue.dev integration
   - Custom MCP client examples

4. **Testing examples:**
   - Unit testing MCP tools
   - Integration testing
   - Mocking strategies

**Priority:** MEDIUM
**Effort:** High

---

## Implementation Priorities

### Phase 1: Critical UX Fixes (v2.5.0)

**Goal:** Fix immediate pain points without breaking changes

1. ✅ Add unified exports to main package (keep subpaths working)
2. ✅ Fix decorator parameter inconsistencies
3. ✅ Audit and fix all documentation import examples
4. ✅ Improve error messages with actionable guidance
5. ✅ Add migration guide for upcoming v3.0.0

**Timeline:** 1-2 weeks
**Breaking Changes:** None

### Phase 2: Major Improvements (v3.0.0)

**Goal:** Implement breaking changes for long-term ergonomics

1. ✅ Implement unified import structure (remove need for subpaths)
2. ✅ Adopt `BuildMCPServer` as standard programmatic API
3. ✅ Standardize API terminology across docs
4. ✅ Fix bundling issues or mark as experimental
5. ✅ Complete documentation overhaul
6. ✅ Add comprehensive examples library

**Timeline:** 4-6 weeks
**Breaking Changes:** Yes (major version bump)

### Phase 3: Polish & Advanced Features (v3.1.0+)

1. Enhanced TypeScript types
2. CLI structure improvements
3. Advanced examples and templates
4. Performance optimizations
5. Plugin system (if needed)

---

## Success Metrics

How we'll measure success:

1. **Reduced confusion in issues/discussions**
   - Track "how do I import X" questions
   - Monitor import-related errors

2. **Faster onboarding**
   - Time to first working server
   - Reduction in documentation lookups needed

3. **Better IDE experience**
   - Intellisense completeness
   - Type safety (fewer `any` casts needed)

4. **Community feedback**
   - Developer satisfaction surveys
   - GitHub stars/forks growth
   - NPM download trends

---

## Migration Strategy

For v3.0.0 breaking changes:

1. **Deprecation warnings in v2.5.0**
   ```typescript
   // v2.5.0: Warnings guided users to updated patterns
   // v3.0.0: Clean API with BuildMCPServer as standard
   ```

2. **Codemod tool**
   - Automated migration script
   - Handles import rewriting
   - Updates class instantiations

3. **Dual package approach**
   - Publish v2.x as `simply-mcp@2`
   - Publish v3.x as `simply-mcp@3`
   - Maintain v2 for 6 months with security patches

---

## Questions for Discussion

1. ✅ Keep backward compatibility helpers in v3.0.0? **YES** - Type aliases preserved
2. ✅ Best name for main server class? **BuildMCPServer** - Adopted in v3.0.0
3. Should we consolidate CLI commands or keep them separate?
4. ✅ How aggressive with breaking changes? **Measured** - Clear migration path provided
5. Should bundling be marked experimental until fully stable?

---

## Related Documents

- [Production Readiness Report](/tmp/simply-mcp-test/PRODUCTION_READINESS_REPORT.md)
- [CLI Simplification Design](./CLI_SIMPLIFICATION_DESIGN.md)
- [Decorator API Documentation](./DECORATOR-API.md)
- [Release Notes v2.4.7](../releases/RELEASE_NOTES_v2.4.7.md)

---

**Status:** DRAFT
**Next Review:** Before v2.5.0 planning
**Owner:** Core Team
