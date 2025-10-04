# SimplyMCP Examples

This directory contains examples demonstrating how to use SimplyMCP to create MCP servers quickly and easily.

## What is SimplyMCP?

SimplyMCP is a simplified, FastMCP-inspired API for creating Model Context Protocol (MCP) servers. It provides a clean, intuitive interface while leveraging the existing robust MCP infrastructure in this repository.

## Key Features

- **Single-file servers**: Define your entire server in one TypeScript file
- **Zod validation**: Use Zod schemas for type-safe parameter validation
- **Automatic schema conversion**: Zod schemas are automatically converted to JSON Schema
- **Inline execute functions**: No need for separate handler files for simple cases
- **Multiple transports**: Support for both stdio and HTTP transports
- **Chainable API**: Fluent interface for adding tools, prompts, and resources
- **TypeScript-first**: Full type inference and autocomplete support
- **Built on existing infrastructure**: Reuses HandlerManager, validation, and security systems

## Examples

### 1. Simple Server (`simple-server.ts`)

Demonstrates basic SimplyMCP usage with:
- Simple tools (greet, calculate)
- Structured data tools (get_user_info)
- Context usage (log_message)
- Prompts with templates
- Static resources

**Run with stdio:**
```bash
node mcp/examples/simple-server.ts
```

**Run with HTTP:**
```bash
node mcp/examples/simple-server.ts --http --port 3000
```

### 2. Advanced Server (`advanced-server.ts`)

Shows more advanced features:
- Complex nested Zod schemas
- Error handling and custom errors
- Async operations
- File system access
- Multiple output types
- Metadata in results

**Run:**
```bash
node mcp/examples/advanced-server.ts
```

### 3. Inline Dependencies Demo (`inline-deps-demo.ts`)

Demonstrates Phase 2 Feature 2: Inline Dependencies
- Declaring dependencies using PEP 723-style inline metadata
- Accessing dependencies programmatically via SimplyMCP API
- Using SimplyMCP.getDependencies(), hasDependency(), getDependencyVersion()
- Self-contained server with visible requirements
- Date/time manipulation tools showcasing dependency usage

**Features shown:**
- 5 tools demonstrating inline dependency usage
- Inline dependencies block with proper syntax
- Programmatic access to declared dependencies
- Server introspection capabilities

**Run with stdio:**
```bash
npx tsx mcp/examples/inline-deps-demo.ts
```

**Run with HTTP:**
```bash
npx tsx mcp/examples/inline-deps-demo.ts --http --port 3000
```

### 4. Binary Content Demo (`binary-content-demo.ts`)

Demonstrates Phase 2 Feature 1: Image & Binary Content Support
- Returning PNG images as Buffers (auto-detected)
- Returning images with explicit type hints
- Generating PDF reports from file paths
- Mixed content (text + image results)
- Audio content (text-to-speech demo)
- Binary data (Uint8Array encoding)
- QR code generation
- Binary resources (PDF, images, audio)

**Features shown:**
- 7 tools with different binary return types
- 4 resources (PDF, PNG, WAV, text)
- Auto-detection of MIME types
- Multiple input format support
- Base64 encoding automation

**Run with stdio:**
```bash
npx tsx mcp/examples/binary-content-demo.ts
```

**Run with HTTP:**
```bash
npx tsx mcp/examples/binary-content-demo.ts --http --port 3000
```

### 5. Auto-Installation Basic (`auto-install-basic.ts`)

Demonstrates Phase 2 Feature 3: Automatic Dependency Installation (Basic)
- Declaring dependencies using inline metadata (Feature 2)
- Enabling auto-installation with autoInstall: true
- Zero-configuration setup (no manual npm install)
- Using SimplyMCP.fromFile() with auto-install option
- Dependency status checking via checkDependencies()
- Tools that use auto-installed packages (axios, zod)

**Features shown:**
- 2 tools demonstrating auto-installed dependencies
- Inline dependencies block
- Auto-install on server load
- Dynamic imports of auto-installed packages
- Dependency status reporting

**Run with stdio:**
```bash
npx tsx mcp/examples/auto-install-basic.ts
```

### 6. Auto-Installation Advanced (`auto-install-advanced.ts`)

Demonstrates Phase 2 Feature 3: Automatic Dependency Installation (Advanced)
- Custom package manager selection (npm/yarn/pnpm)
- Progress tracking with onProgress callbacks
- Custom timeout and retry settings
- Error handling with onError callbacks
- Detailed installation status reporting
- Multiple package auto-installation
- Progress visualization

**Features shown:**
- 2 advanced tools using multiple dependencies
- Custom InstallOptions configuration
- Progress event handling
- Package manager override
- Timeout and retry configuration
- Detailed status reporting with installed/missing/outdated

**Run with stdio:**
```bash
npx tsx mcp/examples/auto-install-advanced.ts
```

### 7. Auto-Installation Error Handling (`auto-install-error-handling.ts`)

Demonstrates Phase 2 Feature 3: Error Handling & Recovery
- Handling installation failures gracefully
- Invalid package scenarios (packages that don't exist)
- Partial installation success
- Recovery strategies for failed installations
- Conditional dependency loading
- Graceful degradation when packages unavailable
- User-friendly error messages and recovery tips

**Features shown:**
- 2 resilient tools with fallback strategies
- Error callback usage
- Installation failure handling
- Dependency availability checking
- Graceful fallback to native APIs
- Recovery instructions for users

**Run with stdio:**
```bash
npx tsx mcp/examples/auto-install-error-handling.ts
```

### 8. Bundling Examples

Demonstrates Phase 2 Feature 4: Bundling Command - Package SimplyMCP servers into standalone distributions.

#### Basic Bundling (`bundling/bundle-basic.md`)

Shows fundamental bundling operations:
- Simple single-file bundle creation
- Custom output paths
- Development vs production builds
- Watch mode for development
- Docker deployment example
- systemd service configuration
- Bundle size optimization tips

**Quick start:**
```bash
# Basic bundle
simplemcp bundle server.ts

# Run the bundle
node dist/bundle.js
```

**Key commands:**
```bash
# Production bundle
simplemcp bundle server.ts --minify

# Development with watch
simplemcp bundle server.ts --watch --no-minify --sourcemap

# Docker deployment
docker build -t myserver .
docker run -p 3000:3000 myserver
```

#### Advanced Bundling (`bundling/bundle-advanced.md`)

Demonstrates advanced bundling features:
- Multiple output formats (single-file, standalone, executable, ESM, CJS)
- Platform and target configuration
- External dependencies management
- Auto-installation integration
- Multi-target builds
- CI/CD pipeline integration (GitHub Actions)
- AWS Lambda optimization
- Vercel Edge Function deployment

**Output formats:**
```bash
# Single-file (default)
simplemcp bundle server.ts --format single-file

# Standalone distribution
simplemcp bundle server.ts --format standalone --output dist/

# Executable format
simplemcp bundle server.ts --format executable --output dist/myserver

# ESM/CJS formats
simplemcp bundle server.ts --format esm
simplemcp bundle server.ts --format cjs
```

**Deployment examples:**
```bash
# AWS Lambda
simplemcp bundle server.ts \
  --output lambda/index.js \
  --minify \
  --target node20 \
  --external aws-sdk

# Docker multi-stage build
# See bundle-advanced.md for Dockerfile

# GitHub Actions CI/CD
# See bundle-advanced.md for workflow
```

#### Configuration Files (`bundling/bundle-config.md`)

Shows configuration file usage for repeatable builds:
- JavaScript, TypeScript, and JSON configs
- Environment-based configuration
- Multiple configuration files
- CLI override behavior
- Development and production configs
- Dynamic entry points
- Custom banner/footer

**Config file formats:**
```javascript
// simplemcp.config.js
export default {
  entry: './src/server.ts',
  output: {
    dir: 'dist',
    filename: 'server.bundle.js',
    format: 'single-file',
  },
  bundle: {
    minify: true,
    sourcemap: false,
    platform: 'node',
    target: 'node20',
    external: ['fsevents'],
  },
  autoInstall: true,
};
```

**Run with config:**
```bash
simplemcp bundle  # Auto-finds config
simplemcp bundle --config simplemcp.config.prod.js
```

**Environment-based:**
```bash
NODE_ENV=production simplemcp bundle
NODE_ENV=development simplemcp bundle
```

#### Integration with Features 2 & 3

Bundling seamlessly integrates with inline dependencies and auto-installation:

```typescript
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///

import { SimplyMCP } from 'simply-mcp';
import axios from 'axios';
import { z } from 'zod';

// Bundle automatically includes inline deps
```

**Auto-install before bundling:**
```bash
simplemcp bundle server.ts --auto-install
```

## Basic Usage

### 1. Import and Create Server

```typescript
import { SimplyMCP } from '../SimplyMCP.js';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'my-server',
  version: '1.0.0',
  port: 3000, // Default port for HTTP
});
```

### 2. Add Tools

```typescript
server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({
    name: z.string().describe('User name'),
    formal: z.boolean().optional(),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}!`;
  },
});
```

### 3. Add Prompts

```typescript
server.addPrompt({
  name: 'code-review',
  description: 'Generate a code review prompt',
  arguments: [
    { name: 'language', description: 'Programming language', required: true },
  ],
  template: 'Please review the following {{language}} code...',
});
```

### 4. Add Resources

```typescript
server.addResource({
  uri: 'config://server',
  name: 'Server Config',
  description: 'Server configuration',
  mimeType: 'application/json',
  content: { key: 'value' },
});
```

### 5. Start the Server

```typescript
// Start with stdio (default)
await server.start();

// Or start with HTTP
await server.start({ transport: 'http', port: 3000 });
```

## API Reference

### Constructor Options

```typescript
interface SimplyMCPOptions {
  name: string;              // Server name
  version: string;           // Server version
  port?: number;             // Default HTTP port (default: 3000)
  basePath?: string;         // Base path for file handlers
  defaultTimeout?: number;   // Default execution timeout (default: 5000ms)
}
```

### Tool Definition

```typescript
interface ToolDefinition<T> {
  name: string;                    // Tool name
  description: string;             // Tool description
  parameters: ZodSchema<T>;        // Zod schema for parameters
  execute: (args: T, context?: HandlerContext) => Promise<string | HandlerResult> | string | HandlerResult;
}
```

### Execute Function Return Types

Your execute function can return:

1. **Simple string:**
```typescript
execute: async (args) => {
  return "Hello, world!";
}
```

2. **Structured HandlerResult:**
```typescript
execute: async (args) => {
  return {
    content: [{ type: 'text', text: 'Hello!' }],
    metadata: { timestamp: Date.now() },
  };
}
```

3. **Error result:**
```typescript
execute: async (args) => {
  return {
    content: [{ type: 'text', text: 'Error occurred' }],
    errors: [{
      code: 'MY_ERROR',
      message: 'Something went wrong',
      details: { ... },
    }],
  };
}
```

### Using HandlerContext

The optional `context` parameter provides:

```typescript
interface HandlerContext {
  sessionId?: string;           // MCP session ID
  logger: Logger;               // Logger instance
  permissions?: Permissions;    // Permission settings
  metadata?: Record<string, unknown>;  // Additional metadata
}
```

Example:
```typescript
execute: async (args, context) => {
  context?.logger.info(`Processing: ${args.name}`);
  return `Done!`;
}
```

### Server Methods

```typescript
// Add items (chainable)
server.addTool(definition)
server.addPrompt(definition)
server.addResource(definition)

// Start server
await server.start(options)

// Stop server
await server.stop()

// Get info
server.getInfo()   // { name, version, isRunning }
server.getStats()  // { tools, prompts, resources }
```

## Validation with Zod

SimplyMCP uses Zod for parameter validation. Here are some common patterns:

### Basic Types

```typescript
z.string()
z.number()
z.boolean()
z.array(z.string())
z.object({ key: z.string() })
```

### Descriptions

```typescript
z.string().describe('User name')
z.number().min(1).max(100).describe('Age (1-100)')
```

### Optional Fields

```typescript
z.string().optional()
z.number().default(42)
```

### Complex Validation

```typescript
z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  age: z.number().int().min(13),
  tags: z.array(z.string()).max(10),
})
```

### Enums

```typescript
z.enum(['option1', 'option2', 'option3'])
```

## Error Handling

SimplyMCP automatically handles:
- Zod validation errors (returns user-friendly messages)
- HandlerExecutionErrors
- Generic JavaScript errors

You can also return custom errors:

```typescript
execute: async (args) => {
  if (args.value < 0) {
    return {
      content: [{ type: 'text', text: 'Error: Value must be positive' }],
      errors: [{
        code: 'INVALID_VALUE',
        message: 'Value must be positive',
        details: { value: args.value },
      }],
    };
  }
  return "Success!";
}
```

## Transport Types

### Stdio Transport (Default)

Best for:
- CLI tools
- Desktop applications
- Direct integration with MCP clients

```typescript
await server.start({ transport: 'stdio' });
```

### HTTP Transport

Best for:
- Web applications
- Remote access
- Multiple clients

```typescript
await server.start({ transport: 'http', port: 3000 });
```

## Best Practices

1. **Use descriptive names and descriptions**: Help LLMs understand your tools
2. **Add descriptions to schema fields**: Use `.describe()` on Zod schemas
3. **Validate thoroughly**: Use Zod's built-in validators (min, max, email, etc.)
4. **Return structured errors**: Use the error field in HandlerResult
5. **Use context.logger**: Log important events for debugging
6. **Handle edge cases**: Check for invalid inputs before processing
7. **Keep tools focused**: Each tool should do one thing well
8. **Use TypeScript**: Get full type safety and autocomplete

## Differences from Raw MCP SDK

| Feature | SimplyMCP | Raw MCP SDK |
|---------|-----------|-------------|
| Setup | Single file | Multiple files + config |
| Validation | Automatic (Zod) | Manual |
| Schema | Zod → JSON Schema | Write JSON Schema |
| Handlers | Inline functions | Separate files/resolvers |
| Type safety | Full inference | Manual types |
| Transport | Auto-configured | Manual setup |

## Integration with Existing Infrastructure

SimplyMCP wraps and reuses:
- **HandlerManager**: For handler execution
- **Validation system**: For input validation and sanitization
- **Logger**: For structured logging
- **Error system**: For LLM-friendly errors
- **Transports**: Stdio and HTTP/SSE

This means you get all the benefits of the existing infrastructure (security, validation, etc.) with a simpler API.

## Next Steps

1. Try the examples:
   ```bash
   node mcp/examples/simple-server.ts
   node mcp/examples/advanced-server.ts
   ```

2. Create your own server based on these examples

3. Explore the Zod documentation for advanced validation patterns

4. Check out the MCP SDK documentation for understanding the protocol

## Troubleshooting

### "Cannot add tools after server has started"
You must add all tools, prompts, and resources before calling `start()`.

### "Tool 'X' is already registered"
Each tool must have a unique name. Check for duplicates.

### Validation errors
Check your Zod schema matches the arguments you're passing. Use `.describe()` to help users understand requirements.

### TypeScript errors
Make sure you're using the correct types. The `execute` function is fully typed based on your Zod schema.

## License

Same as parent project.
