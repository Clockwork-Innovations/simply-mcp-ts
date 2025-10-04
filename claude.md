# SimplyMCP - AI Assistant Guide

**Version**: 2.0.1
**Last Updated**: 2025-10-03
**Purpose**: Comprehensive guide for AI assistants (Claude Code, etc.) working with the SimplyMCP codebase

---

## 🎯 Project Overview

**SimplyMCP** is a modern, type-safe Model Context Protocol (MCP) server framework for TypeScript. It enables developers to create MCP servers using three distinct API styles, with full support for multiple transports, type safety, and advanced features.

**Core Purpose**: Simplify MCP server development by providing FastMCP-inspired (Python) patterns in TypeScript.

**Package**: `simply-mcp`
**NPM**: https://www.npmjs.com/package/simply-mcp
**Repository**: https://github.com/Clockwork-Innovations/simply-mcp

---

## 🏗️ Architecture Overview

### Three API Styles

SimplyMCP supports three distinct patterns for defining MCP servers:

#### 1. **Decorator API** (Recommended - Most Pythonic)
```typescript
import { MCPServer, tool, prompt, resource } from 'simply-mcp';

@MCPServer({ name: 'my-server', version: '1.0.0' })
export default class MyServer {
  @tool('Add two numbers')
  add(a: number, b: number): number {
    return a + b;
  }

  @prompt('Generate greeting')
  greetPrompt(name: string): string {
    return `Generate a greeting for ${name}`;
  }

  @resource('info://status', { mimeType: 'application/json' })
  statusResource(): object {
    return { status: 'running' };
  }
}
```

**Features**:
- Auto-registration of public methods as tools
- JSDoc parsing for descriptions and parameter info
- Methods starting with `_` are private (not registered)
- Stage-3 decorator compatible (TSX runtime)
- Legacy decorator compatible (`experimentalDecorators: true`)

#### 2. **Functional API** (Clean & Declarative)
```typescript
import { defineMCP } from 'simply-mcp';
import { z } from 'zod';

export default defineMCP({
  name: 'weather-service',
  version: '1.0.0',
  tools: [{
    name: 'get_weather',
    description: 'Get current weather',
    parameters: z.object({
      city: z.string().describe('City name')
    }),
    execute: async (args) => `Weather in ${args.city}: 72°F`
  }],
  prompts: [{
    name: 'weather_report',
    description: 'Generate weather report',
    arguments: [{ name: 'city', description: 'City name', required: true }],
    template: 'Generate a detailed weather report for {{city}}'
  }]
});
```

**Features**:
- Single-file definitions
- Declarative configuration
- Explicit tool/prompt/resource registration
- Supports both Zod schemas and custom Schema objects

#### 3. **Programmatic API** (Maximum Flexibility)
```typescript
import { SimplyMCP } from 'simply-mcp';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'dynamic-tools',
  version: '1.0.0'
});

// Add tools dynamically
server.addTool({
  name: 'echo',
  description: 'Echo back the input',
  parameters: z.object({ message: z.string() }),
  execute: async (args) => args.message
});

await server.start({ transport: 'http', port: 3000 });
```

**Features**:
- Dynamic tool registration
- Runtime server configuration
- Programmatic control over all aspects

---

## 📂 File Structure Map

### Core Framework Files

```
mcp/
├── index.ts                    # Main entry point (exports all APIs)
├── SimplyMCP.ts                # Programmatic API class
├── decorators.ts               # Decorator API (@MCPServer, @tool, @prompt, @resource)
├── single-file-types.ts        # Functional API (defineMCP, defineTool)
├── schema-builder.ts           # Schema utilities (schemaToZod)
├── adapter.ts                  # Adapter for integrating different APIs
├── class-adapter.ts            # CLI adapter for class-based servers
│
├── core/                       # Core framework logic
│   ├── types.ts                # TypeScript type definitions
│   ├── errors.ts               # Error classes
│   ├── HandlerManager.ts       # Handler orchestration
│   ├── logger.ts               # Logging utilities
│   ├── content-helpers.ts      # Binary content support
│   ├── bundler.ts              # Bundling logic
│   ├── config-loader.ts        # Configuration loading
│   ├── dependency-*.ts         # Dependency management (parser, resolver, installer)
│   └── ...
│
├── servers/                    # Transport implementations
│   ├── stdioServer.ts          # Stdio transport
│   ├── statelessServer.ts      # Stateless HTTP
│   └── sseServer.ts            # SSE transport
│
├── security/                   # Security features
│   ├── AccessControl.ts        # Access control
│   ├── ApiKeyAuth.ts           # API key authentication
│   ├── AuditLogger.ts          # Audit logging
│   └── RateLimiter.ts          # Rate limiting
│
├── validation/                 # Input validation
│   ├── InputValidator.ts       # Validation logic
│   ├── InputSanitizer.ts       # Input sanitization
│   ├── LLMFriendlyErrors.ts    # LLM-optimized error messages
│   └── ...
│
├── handlers/                   # Handler resolution
│   ├── FileHandlerResolver.ts  # File-based handlers
│   ├── HttpHandlerResolver.ts  # HTTP handlers
│   ├── InlineHandlerResolver.ts # Inline handlers
│   └── RegistryHandlerResolver.ts # Registry handlers
│
├── cli/                        # CLI tools
│   ├── index.ts                # Main CLI entry (simplymcp command)
│   └── bundle.ts               # Bundling command
│
├── examples/                   # Usage examples
│   ├── class-minimal.ts        # Minimal decorator example
│   ├── class-jsdoc.ts          # JSDoc decorator example
│   ├── simple-server.ts        # Simple functional example
│   ├── single-file-basic.ts    # Basic functional API
│   └── ...
│
└── tests/                      # Test suite
    ├── phase2/                 # Phase 2 tests
    └── ...
```

### Documentation Files

```
mcp/docs/
├── INDEX.md                    # Documentation index
├── QUICK-START.md              # Quick start guide
├── HTTP-TRANSPORT.md           # HTTP transport guide
├── TROUBLESHOOTING.md          # Troubleshooting guide
│
├── architecture/               # Architecture documentation
│   ├── TECHNICAL.md            # Technical architecture
│   └── OVERVIEW.md             # Architecture overview
│
├── guides/                     # Developer guides
│   ├── HANDLER-DEVELOPMENT.md  # Handler development
│   ├── INPUT-VALIDATION.md     # Validation guide
│   ├── API-INTEGRATION.md      # API integration
│   └── DEPLOYMENT.md           # Deployment guide
│
├── reference/                  # Reference docs
│   ├── TRANSPORTS.md           # Transport comparison
│   └── LLM-INTEGRATION.md      # LLM integration
│
└── testing/                    # Testing docs
    └── CLAUDE-CLI-TESTING.md   # Claude CLI testing
```

---

## 🔑 Current Paradigm (v2.0.1)

### Key Features

1. **Multi-Transport Support**
   - **stdio**: CLI tools, local scripts, subprocess communication
   - **HTTP (stateless)**: Serverless, Lambda, stateless APIs
   - **HTTP (stateful)**: Web apps, persistent sessions, streaming
   - **SSE**: Legacy support

2. **Type Safety**
   - Zod schema validation
   - TypeScript-first design
   - JSON Schema conversion
   - Automatic type inference from JSDoc

3. **Advanced Capabilities**
   - Binary content support (images, audio, PDFs)
   - LLM sampling/completions
   - Progress notifications
   - Resource management
   - Session management (stateful/stateless)

4. **Developer Experience**
   - Automatic JSDoc parsing
   - Inline dependency detection
   - Auto-installation of dependencies
   - Comprehensive error handling
   - LLM-friendly error messages

5. **Stage-3 Decorator Support** (v2.0.1 Fix)
   - All decorators work with stage-3 format (TSX runtime)
   - Backward compatible with legacy decorators
   - Fixed @prompt and @resource registration issues

---

## 🛠️ Development Guidelines

### Making Changes to the Framework

#### Adding a New Feature

1. **Identify the layer**: Core, Transport, Security, Validation, Handler
2. **Update types**: Add TypeScript interfaces in `core/types.ts`
3. **Implement logic**: Create implementation in appropriate directory
4. **Export publicly**: Add exports to `index.ts` if public API
5. **Add tests**: Create test file in `tests/`
6. **Update docs**: Add documentation in `mcp/docs/`
7. **Add example**: Create example in `examples/`

#### Modifying API Styles

- **Decorator API**: Modify `mcp/decorators.ts`
- **Functional API**: Modify `mcp/single-file-types.ts`
- **Programmatic API**: Modify `mcp/SimplyMCP.ts`
- **Always maintain backward compatibility**

#### Working with Decorators

**IMPORTANT**: The codebase supports BOTH stage-3 and legacy decorators.

**Stage-3 Decorator Pattern** (TSX runtime):
```typescript
export function tool(description?: string) {
  return function (target: any, context: any) {
    // Detect if stage-3
    const isStage3 = typeof context === 'object' && 'kind' in context;

    if (isStage3) {
      // Use context.addInitializer for deferred registration
      context.addInitializer(function(this: any) {
        const metadata = { /* ... */ };
        Reflect.defineMetadata(TOOLS_KEY, metadata, this.constructor);
      });
    } else {
      // Legacy: immediate registration
      Reflect.defineMetadata(TOOLS_KEY, metadata, target.constructor);
    }
  };
}
```

**Key Points**:
- Stage-3: `context.addInitializer()` defers metadata registration
- Legacy: Immediate `Reflect.defineMetadata()`
- Always register on `constructor`, not instance

### Testing

```bash
# Run all tests
npm test

# Run specific tests
npm run test:stdio
npm run test:http

# Run examples
npm run dev              # stdio transport
npm run dev:http         # HTTP transport (port 3000)
npm run dev:class        # Decorator API example
```

### Building

```bash
# Clean build
npm run clean

# Build TypeScript
npm run build

# Prepare for publishing
npm run prepublishOnly
```

### Release Process

```bash
# Patch release (bug fixes)
npm run release:patch

# Minor release (new features)
npm run release:minor

# Major release (breaking changes)
npm run release:major
```

---

## 📋 Important Conventions

### Naming Conventions

- **Class names**: PascalCase (e.g., `SimplyMCP`, `HandlerManager`)
- **File names**: kebab-case for multi-word (e.g., `content-helpers.ts`)
- **Exports**: Named exports preferred, default export for main server definitions
- **Private methods**: Start with `_` (not registered as tools in Decorator API)

### Export Patterns

**Main entry (`mcp/index.ts`)**:
```typescript
// Programmatic API
export { SimplyMCP } from './SimplyMCP.js';

// Decorator API
export { MCPServer, tool, prompt, resource } from './decorators.js';

// Functional API
export { defineMCP, defineTool, definePrompt, defineResource } from './single-file-types.js';

// Types
export type { HandlerContext, HandlerResult, ToolHandler } from './core/types.js';
```

**Always use `.js` extensions in imports** (ESM requirement):
```typescript
import { SimplyMCP } from './SimplyMCP.js';  // ✅ Correct
import { SimplyMCP } from './SimplyMCP';     // ❌ Wrong
```

### TypeScript Configuration

**tsconfig.json key settings**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "esModuleInterop": true
  },
  "exclude": [
    "node_modules",
    "dist",
    "mcp/tests/**/*",
    "mcp/examples/**/*"
  ]
}
```

**CLI files ARE compiled** (changed in v2.0.0):
- Removed `mcp/cli/**/*` from exclude list
- CLI output: `dist/mcp/cli/index.js`

### Package.json Key Fields

```json
{
  "name": "simply-mcp",
  "main": "./dist/mcp/index.js",
  "types": "./dist/mcp/index.d.ts",
  "type": "module",
  "bin": {
    "simplymcp": "./dist/mcp/cli/index.js"
  },
  "exports": {
    ".": {
      "types": "./dist/mcp/index.d.ts",
      "import": "./dist/mcp/index.js"
    },
    "./decorators": {
      "types": "./dist/mcp/decorators.d.ts",
      "import": "./dist/mcp/decorators.js"
    }
  }
}
```

---

## 🚨 Breaking Changes & Migration

### v2.0.0 → v2.0.1 (Current)

**What Changed**:
- **Fixed**: @prompt and @resource decorators now work correctly
- **Root Cause**: Stage-3 decorator compatibility issue
- **Impact**: Users can now use all three decorators (@tool, @prompt, @resource)

**No migration needed** - just update the package.

### v1.x.x → v2.0.0

**Breaking Change**: Class renamed `SimpleMCP` → `SimplyMCP`

**Migration**:
```bash
# Find and replace
find . -type f \( -name "*.ts" -o -name "*.js" \) -exec sed -i 's/SimpleMCP/SimplyMCP/g' {} \;
```

**Imports Update**:
```typescript
// Before (v1.x.x)
import { SimpleMCP } from 'simply-mcp';

// After (v2.0.0+)
import { SimplyMCP } from 'simply-mcp';
```

---

## 🤖 AI Assistant Instructions

### When Adding New Tools

**Decorator API** (auto-registration):
```typescript
@MCPServer({ name: 'my-server', version: '1.0.0' })
export default class MyServer {
  /**
   * Tool description (auto-parsed from JSDoc)
   * @param arg1 - First argument description
   * @param arg2 - Second argument description
   */
  myTool(arg1: string, arg2: number): string {
    return `Result: ${arg1}, ${arg2}`;
  }
}
```

**Functional API** (explicit definition):
```typescript
export default defineMCP({
  name: 'my-server',
  version: '1.0.0',
  tools: [{
    name: 'my_tool',
    description: 'Tool description',
    parameters: z.object({
      arg1: z.string().describe('First argument'),
      arg2: z.number().describe('Second argument')
    }),
    execute: async (args) => `Result: ${args.arg1}, ${args.arg2}`
  }]
});
```

### When Adding Binary Content Support

```typescript
import { createImageContent, bufferToBase64 } from 'simply-mcp';

server.addTool({
  name: 'generate_chart',
  description: 'Generate a chart image',
  parameters: z.object({ data: z.array(z.number()) }),
  execute: async (args) => {
    const imageBuffer = generateChart(args.data);
    return {
      content: [{
        type: 'image',
        data: imageBuffer.toString('base64'),
        mimeType: 'image/png'
      }]
    };
  }
});
```

### When Adding LLM Sampling

```typescript
server.addTool({
  name: 'analyze_sentiment',
  description: 'Analyze sentiment using LLM',
  parameters: z.object({ text: z.string() }),
  execute: async (args, context) => {
    const result = await context.sample([
      {
        role: 'user',
        content: { type: 'text', text: `Analyze: ${args.text}` }
      }
    ]);
    return result.content.text;
  }
});
```

### When Adding Progress Reporting

```typescript
server.addTool({
  name: 'process_file',
  description: 'Process large file',
  parameters: z.object({ filepath: z.string() }),
  execute: async (args, context) => {
    const chunks = getChunks(args.filepath);
    for (let i = 0; i < chunks.length; i++) {
      await processChunk(chunks[i]);
      await context.reportProgress?.(i + 1, chunks.length);
    }
    return 'Complete!';
  }
});
```

### When Modifying Core Types

**Always update these files in order**:
1. `mcp/core/types.ts` - Add TypeScript interfaces
2. Implementation file - Implement the feature
3. `mcp/index.ts` - Export publicly (if needed)
4. Documentation - Update relevant docs
5. Examples - Add usage example
6. Tests - Add test coverage

### When Working with Transports

**Stdio** (`mcp/servers/stdioServer.ts`):
- Default transport
- Used for CLI tools
- Process communication via stdin/stdout

**HTTP Stateless** (`mcp/servers/statelessServer.ts`):
- No session persistence
- Serverless/Lambda friendly
- Stateless request/response

**HTTP Stateful** (`mcp/simpleStreamableHttp.ts`):
- Session-based
- SSE streaming support
- Persistent connections

**Decision Matrix**:
- CLI tools → stdio
- Serverless → HTTP stateless
- Web apps → HTTP stateful
- Legacy systems → SSE

---

## 🔍 Common Patterns

### Error Handling

```typescript
import { HandlerExecutionError } from 'simply-mcp';

execute: async (args) => {
  try {
    return await performOperation(args);
  } catch (error) {
    throw new HandlerExecutionError(
      `Operation failed: ${error.message}`,
      { cause: error }
    );
  }
}
```

### Validation Schemas

```typescript
import { z } from 'zod';

// String validation
z.string().min(1).max(100).describe('Username')

// Number validation
z.number().int().positive().describe('Count')

// Enum validation
z.enum(['option1', 'option2']).describe('Choice')

// Object validation
z.object({
  name: z.string(),
  age: z.number().optional(),
  tags: z.array(z.string())
})

// Custom validation
z.string().refine(
  (val) => val.startsWith('prefix_'),
  { message: 'Must start with prefix_' }
)
```

### Handler Context Usage

```typescript
execute: async (args, context) => {
  // Progress reporting
  await context.reportProgress?.(current, total, 'Processing...');

  // LLM sampling
  const result = await context.sample(messages, options);

  // Logging
  context.logger?.info('Operation started');

  return result;
}
```

---

## 📊 Architecture Flow

```
User Request
    ↓
Transport Layer (stdio/HTTP/SSE)
    ↓
Session Management
    ↓
Security Layer (Auth, Rate Limit, Access Control)
    ↓
Handler Resolution (File/Inline/HTTP/Registry)
    ↓
Input Validation (Zod schemas)
    ↓
Handler Execution
    ↓
Response Formatting
    ↓
Transport Response
```

---

## 🎯 Key Architectural Decisions

1. **Three API Styles**: Support different developer preferences (Decorator, Functional, Programmatic)
2. **Transport Abstraction**: Single server logic, multiple transport implementations
3. **Zod for Validation**: Type-safe validation with JSON Schema compatibility
4. **Stage-3 Decorators**: Modern decorator support with legacy compatibility
5. **Binary Content**: Base64 encoding for images, audio, PDFs
6. **LLM Integration**: Built-in sampling/completion support
7. **Error Handling**: LLM-friendly error messages for better AI interaction

---

## ✅ Quality Checklist

When making changes, ensure:

- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] Examples are provided
- [ ] Export added to `index.ts` (if public API)
- [ ] Backward compatibility maintained
- [ ] Error handling implemented
- [ ] JSDoc comments added (for Decorator API)
- [ ] Zod schemas validated (for Functional/Programmatic API)

---

## 📚 Resources

### Documentation
- [README.md](./README.md) - Main documentation
- [MODULE_USAGE.md](./MODULE_USAGE.md) - Using as a module
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deployment instructions
- [mcp/docs/INDEX.md](./mcp/docs/INDEX.md) - Complete docs index

### Examples
- [mcp/examples/](./mcp/examples/) - All usage examples
- [mcp/tests/](./mcp/tests/) - Test examples

### External
- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [FastMCP (Python inspiration)](https://github.com/jlowin/fastmcp)

---

## 🚀 Quick Reference

### Run Examples
```bash
npx tsx mcp/examples/simple-server.ts                              # Functional API (stdio)
npx tsx mcp/examples/simple-server.ts --http --port 3000          # Functional API (HTTP)
npx tsx mcp/class-adapter.ts mcp/examples/class-minimal.ts        # Decorator API (stdio)
npx tsx mcp/class-adapter.ts mcp/examples/class-minimal.ts --http # Decorator API (HTTP)
```

### Create New Server
```bash
# Using decorator API
npx tsx server.ts

# Using functional API
npx tsx server.ts

# Using CLI
npx simplymcp bundle server.ts
```

### Test & Build
```bash
npm test           # All tests
npm run build      # TypeScript compilation
npm run clean      # Clean dist/
```

---

**Remember**: This is a TypeScript-first, type-safe framework. Always leverage TypeScript's type system, Zod validation, and maintain the three-API-style paradigm. When in doubt, check the examples in `mcp/examples/` for patterns.
