# Simply MCP v2.5.0-beta.1 Release Notes

**Release Date:** October 6, 2025
**Version:** 2.5.0-beta.1
**Status:** Beta Release - Production Ready, Seeking Feedback
**Compatibility:** 100% Backward Compatible with v2.4.x

---

## Overview

We're excited to announce **v2.5.0-beta.1**, featuring the complete **Interface API** - the cleanest, most TypeScript-native way to define MCP servers. This beta release combines three major initiatives:

1. **Interface API** - Pure TypeScript interfaces for zero-boilerplate server definitions
2. **Phase 1 UX Improvements** - Unified imports, enhanced errors, comprehensive validation
3. **Complete CLI Integration** - Auto-detection for all four API styles

All features are production-ready with 100% test coverage. We're releasing as beta to gather community feedback before the stable v2.5.0 release.

---

## Highlights

### 1. Interface API - Zero Boilerplate Server Definitions

The biggest feature in this release! Define MCP servers using pure TypeScript interfaces with automatic schema generation.

**What makes it special:**
- **Zero boilerplate** - No manual Zod schemas required
- **Pure TypeScript** - Just interfaces and types
- **Full IntelliSense** - Complete autocomplete everywhere
- **AST-powered** - Schema generation via TypeScript compiler API
- **Static + Dynamic** - Supports both static content and runtime logic

**Before (Decorator API):**
```typescript
import { MCPServer, tool } from 'simply-mcp';
import { z } from 'zod';

@MCPServer()
export default class Calculator {
  @tool('Add two numbers')
  async add(a: number, b: number) {
    return { result: a + b };
  }
}
```

**Now (Interface API):**
```typescript
import type { ITool, IServer } from 'simply-mcp';

interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: { a: number; b: number };
  result: { sum: number };
}

interface Calculator extends IServer {
  name: 'calculator';
  version: '1.0.0';
}

export default class CalculatorService implements Calculator {
  add: AddTool = async (params) => ({
    sum: params.a + params.b
  });
}
```

**Run it:**
```bash
npx simply-mcp run calculator.ts
```

That's it! The framework automatically:
- Parses your TypeScript interfaces via AST
- Generates Zod schemas from your types
- Registers all tools with the MCP server
- Provides full type safety and validation

### 2. Static Resources and Prompts

A game-changing feature: define prompts and resources without implementation!

**Static Prompt (No Code Needed):**
```typescript
interface WeatherPrompt extends IPrompt {
  name: 'weather_report';
  description: 'Generate weather report';
  args: { location: string; style?: 'casual' | 'formal' };
  template: `Generate a {style} weather report for {location}.`;
}
// That's it! Template auto-interpolated at runtime
```

**Static Resource (No Code Needed):**
```typescript
interface ConfigResource extends IResource {
  uri: 'config://server';
  name: 'Server Configuration';
  mimeType: 'application/json';
  data: {
    version: '1.0.0';
    features: ['weather', 'forecasts'];
  };
}
// That's it! Data extracted from interface
```

The framework automatically detects:
- **Static:** All values are literals (strings, numbers, booleans)
- **Dynamic:** Contains non-literal types (requires implementation)

### 3. Unified Package Imports

All exports now available from main package! No more subpath imports.

**Before:**
```typescript
import { SimplyMCP } from 'simply-mcp';
import { MCPServer, tool } from 'simply-mcp/decorators';
import type { CLIConfig } from 'simply-mcp/config';
```

**Now:**
```typescript
import { SimplyMCP, MCPServer, tool, CLIConfig } from 'simply-mcp';
```

**Backward Compatible:** Old pattern still works (with deprecation notice).

### 4. Enhanced Error Messages

Errors now include problem description, fix steps, examples, and documentation links.

**Before:**
```
Error: Class must be decorated with @MCPServer
```

**Now:**
```
Error: Class must be decorated with @MCPServer

  Problem: The class 'MyServer' is not decorated with @MCPServer.

  Fix: Add @MCPServer() decorator to your class:
    @MCPServer()
    export default class MyServer {
      // ...
    }

  Example:
    import { MCPServer, tool } from 'simply-mcp';

    @MCPServer()
    export default class Calculator {
      @tool('Add two numbers')
      add(a: number, b: number) {
        return a + b;
      }
    }

  See: docs/development/DECORATOR-API.md
```

Enhanced across 18+ error sites in class adapter, SimplyMCP core, and decorators.

### 5. Comprehensive CLI Auto-Detection

The `simply-mcp run` command now auto-detects all four API styles:

```bash
# Works with any API style automatically!
npx simply-mcp run server.ts
```

**Detection Priority:**
1. Interface API - Detects `extends ITool|IPrompt|IResource|IServer`
2. Decorator API - Detects `@MCPServer` decorator
3. Functional API - Detects `export default defineMCP(`
4. Programmatic API - Default fallback

---

## Interface API Deep Dive

### Core Interfaces

The Interface API provides four core interfaces:

#### ITool - Define Tools

Tools contain dynamic logic and always require implementation.

```typescript
interface ITool<TParams = any, TResult = any> {
  name: string;           // Tool name (snake_case)
  description: string;    // Human-readable description
  params: TParams;        // Parameter types
  result: TResult;        // Return type
  (params: TParams): TResult | Promise<TResult>;  // Callable signature
}
```

**Example:**
```typescript
interface SearchTool extends ITool {
  name: 'search_documents';
  description: 'Search through documents';
  params: {
    query: string;
    type?: 'pdf' | 'markdown' | 'text';
    limit?: number;
  };
  result: {
    total: number;
    results: Array<{
      id: string;
      title: string;
      score: number;
    }>;
  };
}

class MyServer implements IServer {
  searchDocuments: SearchTool = async (params) => {
    // Full IntelliSense on params!
    const results = await database.search(params.query, params.type);
    return {
      total: results.length,
      results: results.slice(0, params.limit || 10)
    };
  };
}
```

**Note:** Tool names use `snake_case` in the interface, but implementations use `camelCase`. The framework handles conversion automatically.

#### IPrompt - Define Prompts

Prompts can be static (template-based) or dynamic (runtime logic).

```typescript
interface IPrompt<TArgs = any> {
  name: string;           // Prompt name
  description: string;    // Description
  args: TArgs;            // Template argument types
  template?: string;      // Template string (for static)
  dynamic?: boolean;      // Set true for dynamic
}
```

**Static Prompt:**
```typescript
interface CodeReviewPrompt extends IPrompt {
  name: 'code_review';
  description: 'Generate code review prompt';
  args: { language: string; focus?: string };
  template: `Review the following {language} code.
Focus on: {focus}

Provide detailed feedback on:
1. Code quality and readability
2. Potential bugs or issues
3. Performance considerations`;
}
// No implementation needed!
```

**Dynamic Prompt:**
```typescript
interface ContextualPrompt extends IPrompt {
  name: 'contextual_help';
  description: 'Context-aware help';
  args: { topic: string; level?: 'beginner' | 'expert' };
  dynamic: true;  // Requires implementation
}

class MyServer implements IServer {
  contextualHelp = (args) => {
    const isExpert = args.level === 'expert';
    return isExpert
      ? `Advanced ${args.topic} guide with technical details...`
      : `Beginner-friendly ${args.topic} introduction...`;
  };
}
```

#### IResource - Define Resources

Resources can be static (literal data) or dynamic (runtime data).

```typescript
interface IResource<TData = any> {
  uri: string;            // Resource URI
  name: string;           // Human-readable name
  description: string;    // Description
  mimeType: string;       // MIME type
  data?: TData;           // Data (for static)
  dynamic?: boolean;      // Set true for dynamic
}
```

**Static Resource:**
```typescript
interface ConfigResource extends IResource {
  uri: 'config://app';
  name: 'Application Configuration';
  description: 'App settings and metadata';
  mimeType: 'application/json';
  data: {
    version: '2.0.0';
    features: ['search', 'analytics', 'export'];
    maxPageSize: 100;
    apiUrl: 'https://api.example.com';
  };
}
// No implementation needed!
```

**Dynamic Resource:**
```typescript
interface StatsResource extends IResource {
  uri: 'stats://current';
  name: 'Current Statistics';
  description: 'Real-time server statistics';
  mimeType: 'application/json';
  data: {
    totalRequests: number;  // Non-literal type = dynamic
    activeUsers: number;
    uptime: number;
  };
}

class MyServer implements IServer {
  // Property name is the URI
  'stats://current' = async () => ({
    totalRequests: await redis.get('request_count'),
    activeUsers: await redis.scard('active_users'),
    uptime: process.uptime()
  });
}
```

#### IServer - Define Server Metadata

```typescript
interface IServer {
  name: string;           // Server name (kebab-case recommended)
  version: string;        // Semantic version
  description?: string;   // Optional description
}
```

### TypeScript to Zod Schema Generation

The Interface API automatically converts TypeScript types to Zod schemas:

| TypeScript Type | Zod Schema | Notes |
|----------------|------------|-------|
| `string` | `z.string()` | Basic string |
| `number` | `z.number()` | Any number |
| `boolean` | `z.boolean()` | True/false |
| `string?` | `z.string().optional()` | Optional field |
| `'a' \| 'b'` | `z.enum(['a', 'b'])` | Literal union |
| `string[]` | `z.array(z.string())` | Array type |
| `{ a: string }` | `z.object({ a: z.string() })` | Nested object |

**Advanced Example with Validation:**
```typescript
interface CreateUserTool extends ITool {
  name: 'create_user';
  description: 'Create a new user account';
  params: {
    /**
     * Username (alphanumeric, 3-20 chars)
     * @minLength 3
     * @maxLength 20
     * @pattern ^[a-zA-Z0-9_]+$
     */
    username: string;

    /**
     * Email address
     * @format email
     */
    email: string;

    /**
     * User age (must be 18+)
     * @min 18
     * @max 120
     * @int
     */
    age: number;

    /**
     * Optional tags
     */
    tags?: string[];
  };
  result: {
    id: string;
    username: string;
    createdAt: string;
  };
}
```

**Generated Zod Schema:**
```typescript
z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  age: z.number().int().min(18).max(120),
  tags: z.array(z.string()).optional()
})
```

**Supported JSDoc Tags:**
- `@minLength` / `@maxLength` - String length constraints
- `@pattern` - RegEx pattern validation
- `@format` - Format validation (email, url, uuid)
- `@min` / `@max` - Number range constraints
- `@int` - Integer-only numbers

### Static vs Dynamic Detection

The framework automatically detects whether prompts/resources are static or dynamic:

**Static Detection:**
- **Prompts:** Have a `template` string
- **Resources:** All `data` values are literals (strings, numbers, booleans, literal arrays/objects)

**Dynamic Detection:**
- **Prompts:** Have `dynamic: true` OR missing `template`
- **Resources:** Have `dynamic: true` OR contain non-literal types in `data`

**Examples:**
```typescript
// STATIC - all literal values
interface ConfigResource extends IResource {
  uri: 'config://app';
  data: {
    name: 'my-app';      // literal string
    port: 3000;          // literal number
    debug: false;        // literal boolean
    tags: ['api', 'v1']; // literal array
  };
}

// DYNAMIC - contains non-literal type
interface StatsResource extends IResource {
  uri: 'stats://app';
  data: {
    count: number;       // NON-literal (could be any number)
  };
}
```

---

## Upgrade Guide

### From v2.4.x to v2.5.0-beta.1

Upgrading is completely optional and requires zero code changes!

#### Step 1: Update Package

```bash
npm install simply-mcp@2.5.0-beta.1
```

#### Step 2: (Optional) Update Imports

Old pattern still works, but new pattern is recommended:

```typescript
// Old (still works)
import { MCPServer, tool } from 'simply-mcp/decorators';
import type { CLIConfig } from 'simply-mcp/config';

// New (recommended)
import { MCPServer, tool, CLIConfig } from 'simply-mcp';
```

#### Step 3: (Optional) Try Interface API

The Interface API is completely new - no migration needed from existing code!

**Create a new file:**
```typescript
// calculator.ts
import type { ITool, IServer } from 'simply-mcp';

interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: { a: number; b: number };
  result: { sum: number };
}

interface Calculator extends IServer {
  name: 'calculator';
  version: '1.0.0';
}

export default class CalculatorService implements Calculator {
  add: AddTool = async (params) => ({
    sum: params.a + params.b
  });
}
```

**Run it:**
```bash
npx simply-mcp run calculator.ts
```

#### Step 4: Test Your Servers

Validate everything works:

```bash
# Dry-run mode (validates without starting)
npx simply-mcp run your-server.ts --dry-run

# Run normally
npx simply-mcp run your-server.ts

# With HTTP transport
npx simply-mcp run your-server.ts --http --port 3000
```

**That's it!** No breaking changes, no required updates.

### Migration from Decorator to Interface API

If you want to migrate existing decorator-based servers to the Interface API:

See the complete guide: [docs/migration/DECORATOR_TO_INTERFACE.md](./docs/migration/DECORATOR_TO_INTERFACE.md)

**Quick comparison:**

**Decorator API:**
```typescript
import { MCPServer, tool } from 'simply-mcp';

@MCPServer()
export default class Weather {
  @tool('Get weather')
  getWeather(location: string, units?: 'C' | 'F') {
    return { temp: 72, conditions: 'Sunny' };
  }
}
```

**Interface API:**
```typescript
import type { ITool, IServer } from 'simply-mcp';

interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get weather';
  params: { location: string; units?: 'C' | 'F' };
  result: { temp: number; conditions: string };
}

interface Weather extends IServer {
  name: 'weather';
  version: '1.0.0';
}

export default class WeatherService implements Weather {
  getWeather: GetWeatherTool = async (params) => ({
    temp: 72,
    conditions: 'Sunny'
  });
}
```

**Key differences:**
1. Interface definitions are explicit and upfront
2. Type safety enforced at compile-time
3. Full IntelliSense on all parameters
4. No decorators needed

---

## Breaking Changes

**None!** This is a 100% backward compatible release.

- All existing code continues to work
- Old import patterns supported (with deprecation notices)
- All API signatures unchanged
- No removed exports or features

---

## Known Issues and Limitations

### Interface API Limitations

1. **TypeScript Required:** Interface API requires TypeScript source files (can't use plain JavaScript)
2. **Type Complexity:** Very complex generic types may not convert perfectly to Zod schemas
3. **Build Step:** AST parsing happens at server startup (not compile-time)

### Workarounds

1. **Complex Types:** Use explicit type definitions or split into smaller types
2. **Build Performance:** Parse time is minimal (~10-50ms per file), negligible for most use cases

### Future Enhancements

We're actively working on:
- Watch mode optimization for Interface API
- Support for more complex TypeScript patterns
- Enhanced validation tag support
- Performance optimizations for large files

---

## Testing the Beta

### How to Test

1. **Install the beta:**
   ```bash
   npm install simply-mcp@2.5.0-beta.1
   ```

2. **Try the Interface API:**
   - Create a simple interface-based server
   - Test auto-detection: `npx simply-mcp run server.ts`
   - Test explicit command: `npx simplymcp-interface server.ts`
   - Try static prompts and resources

3. **Test UX improvements:**
   - Use unified imports: `import { MCPServer, tool } from 'simply-mcp'`
   - Trigger decorator validation errors (pass object instead of string)
   - Check enhanced error messages

4. **Run comprehensive tests:**
   ```bash
   # Validate without starting
   npx simply-mcp run examples/interface-comprehensive.ts --dry-run

   # Run with verbose output
   npx simply-mcp run examples/interface-comprehensive.ts --verbose

   # Test HTTP transport
   npx simply-mcp run examples/interface-advanced.ts --http --port 3000
   ```

### What to Test

**Interface API:**
- [ ] Create a server with tools only
- [ ] Add static prompts (template-based)
- [ ] Add dynamic prompts (runtime logic)
- [ ] Add static resources (literal data)
- [ ] Add dynamic resources (runtime data)
- [ ] Test JSDoc validation tags
- [ ] Verify auto-detection works
- [ ] Check IntelliSense in your IDE

**UX Improvements:**
- [ ] Try unified imports
- [ ] Verify old imports still work
- [ ] Check error message quality
- [ ] Test decorator validation

**CLI:**
- [ ] Test auto-detection with different API styles
- [ ] Try `--style interface` flag
- [ ] Test HTTP and stdio transports
- [ ] Verify verbose output

---

## Feedback and Reporting Issues

### We Want Your Feedback!

This beta release is about gathering feedback from the community. We especially want to hear about:

1. **Interface API usability**
   - Is the API intuitive?
   - Are the examples clear?
   - What features are missing?

2. **Documentation clarity**
   - Is the guide easy to follow?
   - What needs more explanation?
   - Are there gaps in coverage?

3. **Developer experience**
   - How's the IntelliSense?
   - Are error messages helpful?
   - Any pain points?

4. **Feature requests**
   - What would make Interface API better?
   - What validation tags would help?
   - What's missing?

### How to Provide Feedback

**GitHub Discussions (Preferred):**
- General feedback: https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions
- Feature requests: Use "Ideas" category
- Questions: Use "Q&A" category

**GitHub Issues:**
- Bug reports: https://github.com/Clockwork-Innovations/simply-mcp-ts/issues
- Use template provided
- Include minimal reproduction

**What to Include:**
- Simply MCP version: `2.5.0-beta.1`
- Node.js version: `node --version`
- TypeScript version: `tsc --version`
- Code sample (minimal reproduction)
- Expected vs actual behavior

**Example Bug Report:**
```markdown
**Version:** simply-mcp@2.5.0-beta.1
**Node:** v20.10.0
**TypeScript:** 5.3.3

**Description:**
Interface API doesn't handle circular type references.

**Code:**
[paste minimal code]

**Expected:**
Should parse successfully.

**Actual:**
Error: Maximum call stack size exceeded
```

---

## Documentation

### New Documentation

- **[Interface API Guide](./docs/guides/INTERFACE_API_GUIDE.md)** - Complete 1,100+ line guide
  - Introduction and benefits
  - Quick start examples
  - TypeScript type inference
  - Static vs dynamic detection
  - CLI reference
  - Best practices and troubleshooting

- **[Decorator to Interface Migration](./docs/migration/DECORATOR_TO_INTERFACE.md)** - 700+ line guide
  - Step-by-step migration
  - Side-by-side comparisons
  - Feature parity table
  - Common patterns and FAQ

- **[Import Style Guide](./docs/development/IMPORT_STYLE_GUIDE.md)** - Import patterns
  - Unified import patterns
  - Backward compatibility
  - Migration timeline

- **[Quick Migration Cheatsheet](./docs/migration/QUICK_MIGRATION.md)** - Fast reference
  - Quick examples
  - Upgrade checklist

### Updated Documentation

- **README.md** - Added Interface API section, updated import examples
- **docs/development/DECORATOR-API.md** - Updated with new import patterns
- **docs/guides/WATCH_MODE_GUIDE.md** - Updated examples
- All example files enhanced with clarifying comments

### Examples

Three comprehensive examples for Interface API:

- **[examples/interface-minimal.ts](./examples/interface-minimal.ts)** - Basic tools (~50 LOC)
- **[examples/interface-advanced.ts](./examples/interface-advanced.ts)** - Tools, prompts, resources (~150 LOC)
- **[examples/interface-comprehensive.ts](./examples/interface-comprehensive.ts)** - Full-featured (~300 LOC)

---

## What's Next

### v2.5.0 Stable Release

After gathering beta feedback, we'll release v2.5.0 stable with:
- Community feedback integration
- Documentation improvements based on user questions
- Additional examples if requested
- Bug fixes (if any found)

**Timeline:** 2-4 weeks depending on feedback volume

### v3.0.0 Planning

Future major version will include:
- Object syntax for decorators: `@tool({ description: '...', category: 'math' })`
- Remove deprecated subpath imports
- Enhanced BuildMCPServer features
- Additional Interface API features based on v2.5.0 feedback

**Timeline:** Q1 2026

---

## Test Coverage

### Interface API Tests

**61 tests, 100% passing:**
- AST parsing and interface extraction
- TypeScript to Zod schema generation
- Static vs dynamic detection
- Template interpolation for prompts
- Runtime validation and execution
- CLI integration and auto-detection

### Overall Test Suite

**8 test suites, 100% success rate:**
- v2.4.5 Bug Fixes - 16s
- Stdio Transport - 2s
- Decorator API - 4s (24 tests)
- Stateless HTTP Transport - 8s
- Stateful HTTP Transport - 7s
- HTTP Modes - 5s
- SSE Transport - 13s
- CLI Commands - 33s (auto-detection, explicit commands, flags)

**Total test duration:** ~102s

---

## Performance

### Interface API

- **Small file (3 tools):** ~10-20ms parse time
- **Medium file (10 tools):** ~30-50ms parse time
- **Large file (50 tools):** ~100-200ms parse time
- **Memory overhead:** ~1-2MB per file
- **Runtime performance:** No difference vs manual BuildMCPServer

### General

- Zero performance regression from v2.4.x
- All existing optimizations maintained
- HTTP transport modes unchanged

---

## Deprecation Notices

### Subpath Imports (Deprecated)

The following import patterns are deprecated but still functional:

```typescript
// Deprecated (will be removed in v3.0.0)
import { MCPServer } from 'simply-mcp/decorators';
import type { CLIConfig } from 'simply-mcp/config';

// Use instead
import { MCPServer, CLIConfig } from 'simply-mcp';
```

**Timeline:**
- v2.5.0 (current): Both patterns work, JSDoc deprecation notices added
- v3.0.0 (future): Subpath imports removed, unified imports only

**Action Required:** None immediately, but we recommend updating to the new pattern.

---

## Contributors

Thanks to everyone who contributed to this release!

- Core development team
- Beta testers
- Documentation contributors
- Issue reporters

Special thanks to the community for feedback and suggestions that shaped the Interface API design.

---

## Links

### Documentation
- **Interface API Guide:** [docs/guides/INTERFACE_API_GUIDE.md](./docs/guides/INTERFACE_API_GUIDE.md)
- **Migration Guide:** [docs/migration/DECORATOR_TO_INTERFACE.md](./docs/migration/DECORATOR_TO_INTERFACE.md)
- **Quick Cheatsheet:** [docs/migration/QUICK_MIGRATION.md](./docs/migration/QUICK_MIGRATION.md)
- **Complete Changelog:** [CHANGELOG.md](./CHANGELOG.md)

### Examples
- **Minimal:** [examples/interface-minimal.ts](./examples/interface-minimal.ts)
- **Advanced:** [examples/interface-advanced.ts](./examples/interface-advanced.ts)
- **Comprehensive:** [examples/interface-comprehensive.ts](./examples/interface-comprehensive.ts)

### Community
- **GitHub Repository:** https://github.com/Clockwork-Innovations/simply-mcp-ts
- **Issue Tracker:** https://github.com/Clockwork-Innovations/simply-mcp-ts/issues
- **Discussions:** https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions
- **NPM Package:** https://www.npmjs.com/package/simply-mcp

### Support
- **Documentation:** [src/docs/INDEX.md](./src/docs/INDEX.md)
- **Troubleshooting:** [src/docs/TROUBLESHOOTING.md](./src/docs/TROUBLESHOOTING.md)
- **Q&A Discussions:** https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions/categories/q-a

---

## Thank You!

Thank you for trying Simply MCP v2.5.0-beta.1! We're excited to hear your feedback and continue improving the framework.

**Happy building!**

*The Simply MCP Team*
