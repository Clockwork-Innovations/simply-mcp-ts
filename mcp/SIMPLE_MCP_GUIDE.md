# SimpleMCP Quick Start Guide

## Overview

**SimpleMCP** is a FastMCP-inspired framework for creating MCP servers with minimal boilerplate. It provides a clean, single-file API while leveraging the robust existing MCP infrastructure.

## Installation

SimpleMCP is already part of this repository. Just import it:

```typescript
import { SimpleMCP } from './mcp/SimpleMCP.js';
import { z } from 'zod';
```

## 5-Minute Quick Start

### 1. Create Your Server (server.ts)

```typescript
#!/usr/bin/env node
import { SimpleMCP } from './mcp/SimpleMCP.js';
import { z } from 'zod';

// Create server
const server = new SimpleMCP({
  name: 'my-awesome-server',
  version: '1.0.0',
});

// Add a tool
server.addTool({
  name: 'greet',
  description: 'Greet a user by name',
  parameters: z.object({
    name: z.string().describe('The name of the person to greet'),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}! Welcome to SimpleMCP!`;
  },
});

// Start server
await server.start();
```

### 2. Run It

```bash
# Make it executable
chmod +x server.ts

# Run with stdio (default)
node server.ts

# Or run with HTTP
node server.ts --http --port 3000
```

### 3. That's It!

Your MCP server is now running with full validation, error handling, and transport support.

## Key Features

### ✅ Single File Servers
Define everything in one file - no config files needed.

### ✅ Zod Validation
Use Zod schemas for type-safe, automatic validation:

```typescript
parameters: z.object({
  email: z.string().email(),
  age: z.number().min(13).max(120),
  tags: z.array(z.string()).max(10),
})
```

### ✅ Type Inference
Full TypeScript support with automatic type inference:

```typescript
// args is automatically typed based on your schema!
execute: async (args) => {
  args.email  // TypeScript knows this is a string
  args.age    // TypeScript knows this is a number
}
```

### ✅ Multiple Return Types

Return a simple string:
```typescript
execute: async (args) => {
  return "Hello!";
}
```

Or structured data:
```typescript
execute: async (args) => {
  return {
    content: [{ type: 'text', text: 'Hello!' }],
    metadata: { timestamp: Date.now() },
  };
}
```

### ✅ Built-in Error Handling

SimpleMCP automatically handles:
- Zod validation errors
- Runtime exceptions
- Custom errors

### ✅ Both Transports

Works with both stdio and HTTP out of the box:
```typescript
// Stdio (for CLI/desktop apps)
await server.start({ transport: 'stdio' });

// HTTP (for web/remote access)
await server.start({ transport: 'http', port: 3000 });
```

## Common Patterns

### Tool with Complex Validation

```typescript
server.addTool({
  name: 'create_user',
  description: 'Create a new user',
  parameters: z.object({
    username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
    email: z.string().email(),
    profile: z.object({
      firstName: z.string(),
      lastName: z.string(),
      bio: z.string().max(500).optional(),
    }),
    settings: z.object({
      theme: z.enum(['light', 'dark', 'auto']).default('auto'),
    }).optional(),
  }),
  execute: async (args) => {
    // args is fully typed!
    return `Created user: ${args.username}`;
  },
});
```

### Tool with Context (Logging)

```typescript
server.addTool({
  name: 'process_data',
  description: 'Process some data',
  parameters: z.object({
    data: z.string(),
  }),
  execute: async (args, context) => {
    context?.logger.info('Processing started');

    // Do processing...

    context?.logger.info('Processing completed');
    return 'Done!';
  },
});
```

### Tool with Error Handling

```typescript
server.addTool({
  name: 'divide',
  description: 'Divide two numbers',
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async (args) => {
    if (args.b === 0) {
      return {
        content: [{ type: 'text', text: 'Error: Cannot divide by zero' }],
        errors: [{
          code: 'DIVISION_BY_ZERO',
          message: 'Denominator cannot be zero',
          details: { numerator: args.a, denominator: args.b },
        }],
      };
    }
    return `Result: ${args.a / args.b}`;
  },
});
```

### Adding Prompts

```typescript
server.addPrompt({
  name: 'code-review',
  description: 'Generate a code review prompt',
  arguments: [
    { name: 'language', description: 'Programming language', required: true },
    { name: 'focus', description: 'What to focus on', required: false },
  ],
  template: `Please review the following {{language}} code.
{{focus}}

Look for bugs, performance issues, and best practices.`,
});
```

### Adding Resources

```typescript
server.addResource({
  uri: 'config://app',
  name: 'App Configuration',
  description: 'Current application configuration',
  mimeType: 'application/json',
  content: {
    version: '1.0.0',
    features: ['tools', 'prompts'],
  },
});
```

### Returning Images and Binary Content

SimpleMCP supports returning images, audio, PDFs, and other binary content from tools:

```typescript
import { readFile } from 'fs/promises';

// Return a Buffer - auto-detected as image
server.addTool({
  name: 'generate_chart',
  description: 'Generate a bar chart',
  parameters: z.object({
    data: z.array(z.number()),
  }),
  execute: async (args) => {
    const chartBuffer = generateChartPNG(args.data);
    return chartBuffer;  // SimpleMCP handles it!
  },
});

// Return a file path - auto-loaded
server.addTool({
  name: 'create_report',
  description: 'Generate a PDF report',
  parameters: z.object({
    reportId: z.string(),
  }),
  execute: async (args) => {
    return {
      type: 'file',
      path: './reports/report.pdf',
      mimeType: 'application/pdf',
    };
  },
});

// Mixed content - text + image
server.addTool({
  name: 'analyze_image',
  description: 'Analyze an image',
  parameters: z.object({
    imagePath: z.string(),
  }),
  execute: async (args) => {
    const analysis = await analyzeImage(args.imagePath);
    const annotated = await annotateImage(args.imagePath);

    return {
      content: [
        { type: 'text', text: JSON.stringify(analysis) },
        { type: 'image', data: annotated, mimeType: 'image/png' },
      ],
    };
  },
});

// Binary resource (PDF, image, etc.)
const logoBuffer = await readFile('./logo.png');
server.addResource({
  uri: 'img://logo',
  name: 'Company Logo',
  description: 'Company logo in PNG format',
  mimeType: 'image/png',
  content: logoBuffer,  // Buffer automatically handled
});
```

**Supported formats:**
- **Images**: PNG, JPEG, GIF, WebP, BMP, SVG, TIFF
- **Documents**: PDF, Word, Excel, PowerPoint
- **Audio**: MP3, WAV, OGG, FLAC, AAC
- **Archives**: ZIP, TAR, GZIP, 7Z, RAR

**Input formats:**
- `Buffer` - Auto-detected and encoded
- `Uint8Array` - Converted to base64
- `string` - File path (auto-read) or base64 data
- `{ type: 'image'|'audio'|'binary', data: ... }` - Explicit format
- `{ type: 'file', path: '...' }` - File reference

**Features:**
- Automatic MIME type detection (from extension and file headers)
- Automatic base64 encoding
- File size limits (50MB max, 10MB warning)
- Path traversal prevention
- Multiple input format support

For more details, see the [Binary Content Guide](./docs/features/binary-content.md).

### Inline Dependencies (Phase 2, Feature 2)

SimpleMCP supports declaring npm dependencies directly in your server file using PEP 723-style inline metadata. This makes your servers truly self-contained and easy to share.

#### Basic Usage

```typescript
#!/usr/bin/env npx tsx
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// date-fns@^2.30.0
// ///

import { SimpleMCP } from './mcp/SimpleMCP.js';
import axios from 'axios';
import { z } from 'zod';
import { format } from 'date-fns';

const server = new SimpleMCP({
  name: 'weather-server',
  version: '1.0.0',
});

server.addTool({
  name: 'get_weather',
  description: 'Fetch weather data',
  parameters: z.object({
    city: z.string(),
  }),
  execute: async (args) => {
    const response = await axios.get(`https://api.weather.com/${args.city}`);
    const timestamp = format(new Date(), 'PPpp');
    return `Weather at ${timestamp}: ${response.data.temp}°C`;
  },
});

await server.start();
```

#### Benefits

- **Self-Documenting**: Dependencies visible in the code
- **Single-File Distribution**: Share one file instead of multiple
- **Version Tracking**: Dependency versions tracked with code
- **Auto-Installation Ready**: Foundation for automatic installation (coming soon)

#### Accessing Dependencies Programmatically

```typescript
// Check if a dependency is declared
if (server.hasDependency('axios')) {
  console.log('Server uses axios');
}

// Get version specifier
const version = server.getDependencyVersion('axios');
console.log(`axios version: ${version}`);

// Get all dependencies
const deps = server.getDependencies();
if (deps) {
  deps.dependencies.forEach(dep => {
    console.log(`${dep.name}@${dep.version}`);
  });
}
```

#### Loading from File

```typescript
import { SimpleMCP } from './mcp/SimpleMCP.js';

// Load server and automatically parse inline dependencies
const server = await SimpleMCP.fromFile('./my-server.ts', {
  name: 'my-server',
  version: '1.0.0',
});

// Dependencies are automatically detected
console.log('Dependencies:', server.getDependencies()?.map);

await server.start();
```

#### Syntax Rules

**Delimiters:**
- Start: `// /// dependencies` (exactly)
- End: `// ///` (exactly)
- All lines between delimiters must start with `//`

**Package Syntax:**
```typescript
// /// dependencies
// package-name@version-spec  # optional comment
// ///
```

**Valid Examples:**
```typescript
// /// dependencies
// axios@^1.6.0              # Caret range
// lodash@~4.17.21           # Tilde range
// zod@>=3.22.0              # Greater than or equal
// @types/node@^20.0.0       # Scoped package
// date-fns                  # Latest (no version = latest)
//
// # Comments for organization
// pg@^8.11.0                # Database client
// ///
```

#### With package.json

Inline dependencies work alongside package.json:

- **Inline deps** document what the script needs
- **package.json** is used by npm/yarn for installation
- Both can coexist (package.json takes precedence for conflicts)

```typescript
// Generate package.json from inline dependencies
import { generatePackageJson } from './mcp/core/dependency-utils.js';

const deps = server.getDependencies();
const pkg = generatePackageJson(deps.map, {
  name: 'my-server',
  version: '1.0.0',
  devDeps: ['typescript', '@types/node'],
});

await writeFile('package.json', JSON.stringify(pkg, null, 2));
```

#### Security Features

SimpleMCP validates all inline dependencies:

- Package names must follow npm rules (lowercase, valid characters)
- Version specifiers must be valid semver
- Dangerous characters blocked (`;`, `|`, backticks, etc.)
- DoS prevention (limits on count and line length)
- No code execution during parsing

For complete documentation, see:
- [Inline Dependencies Feature Guide](./docs/features/inline-dependencies.md)
- [Migration Guide](./docs/guides/INLINE_DEPS_MIGRATION.md)

### Auto-Installation (Phase 2, Feature 3)

SimpleMCP can automatically install missing dependencies declared in your inline dependencies block. This eliminates manual `npm install` steps and enables true single-file server distribution.

#### Basic Usage

```typescript
#!/usr/bin/env npx tsx
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///

import { SimpleMCP } from './mcp/SimpleMCP.js';
import { z } from 'zod';

// Load server with auto-install enabled
const server = await SimpleMCP.fromFile(__filename, {
  name: 'weather-server',
  version: '1.0.0',
  autoInstall: true, // Dependencies install automatically!
});

server.addTool({
  name: 'get_weather',
  description: 'Get weather for a city',
  parameters: z.object({
    city: z.string(),
  }),
  execute: async (args) => {
    // axios is auto-installed, import it dynamically
    const axios = (await import('axios')).default;
    const response = await axios.get(`https://api.weather.com/${args.city}`);
    return `Temperature: ${response.data.temp}°C`;
  },
});

await server.start();
```

**First run:**
```bash
npx tsx weather-server.ts

# Output:
# [SimpleMCP] Auto-installing dependencies...
# [SimpleMCP] Installing 2 packages with npm...
# [SimpleMCP] Successfully installed 2 packages
# [SimpleMCP] Starting 'weather-server' v1.0.0
```

**Second run:**
```bash
npx tsx weather-server.ts

# Output:
# [SimpleMCP] Starting 'weather-server' v1.0.0
# (no installation - already installed)
```

#### Advanced Auto-Installation

Custom installation options with progress tracking:

```typescript
const server = await SimpleMCP.fromFile(__filename, {
  name: 'my-server',
  version: '1.0.0',
  autoInstall: {
    packageManager: 'pnpm', // Use pnpm instead of npm
    timeout: 10 * 60 * 1000, // 10 minute timeout
    retries: 5, // Retry up to 5 times

    // Progress callback
    onProgress: (event) => {
      console.log(`${event.type}: ${event.message}`);
    },

    // Error callback
    onError: (error) => {
      console.error(`Failed to install ${error.packageName}: ${error.message}`);
    }
  }
});
```

#### Manual Installation

Check and install dependencies programmatically:

```typescript
const server = await SimpleMCP.fromFile('./server.ts');

// Check dependency status
const status = await server.checkDependencies();
console.log('Missing:', status.missing);
console.log('Installed:', status.installed);
console.log('Outdated:', status.outdated);

// Install missing dependencies manually
if (status.missing.length > 0) {
  const result = await server.installDependencies({
    onProgress: (event) => console.log(event.message)
  });

  if (result.success) {
    console.log(`Installed ${result.installed.length} packages`);
  } else {
    console.error('Installation failed:', result.errors);
  }
}

await server.start();
```

#### Package Manager Support

Auto-installation supports npm, yarn, pnpm, and bun with automatic detection from lock files:

```typescript
// Auto-detects from package-lock.json → npm
// Auto-detects from yarn.lock → yarn
// Auto-detects from pnpm-lock.yaml → pnpm
// Auto-detects from bun.lockb → bun

const server = await SimpleMCP.fromFile('./server.ts', {
  autoInstall: true // Uses detected package manager
});

// Or explicitly specify
const server = await SimpleMCP.fromFile('./server.ts', {
  autoInstall: {
    packageManager: 'yarn' // Force yarn
  }
});
```

#### Security Features

- **Package validation**: Names and versions validated (no shell injection)
- **--ignore-scripts**: Install scripts disabled by default (security)
- **Timeout limits**: Prevents hanging installations
- **Disk space checks**: Verifies space before installing
- **Safe command building**: No shell execution vulnerabilities

#### Production Best Practice

Enable auto-install in development, verify in production:

```typescript
const isProduction = process.env.NODE_ENV === 'production';

const server = await SimpleMCP.fromFile(__filename, {
  name: 'my-server',
  version: '1.0.0',
  autoInstall: !isProduction // Only auto-install in development
});

// In production, verify dependencies are installed
if (isProduction) {
  const status = await server.checkDependencies();
  if (status.missing.length > 0) {
    throw new Error('Missing dependencies in production. Run npm install first.');
  }
}

await server.start();
```

#### Benefits

- **Zero Configuration**: No manual npm install needed
- **Single-File Distribution**: Share servers that "just work"
- **Developer Experience**: Similar to Python's uv package manager
- **CI/CD Ready**: Automated setup in deployment pipelines
- **Version Control**: Lock files ensure reproducible builds

For complete documentation, see:
- [Auto-Installation Feature Guide](./docs/features/auto-installation.md)
- [Auto-Installation Migration Guide](./docs/guides/AUTO_INSTALL_MIGRATION.md)
- [Example: auto-install-basic.ts](./examples/auto-install-basic.ts)
- [Example: auto-install-advanced.ts](./examples/auto-install-advanced.ts)
- [Example: auto-install-error-handling.ts](./examples/auto-install-error-handling.ts)

## Bundling & Deployment

SimpleMCP servers can be bundled into standalone, production-ready distributions for easy deployment.

### Quick Bundle

Bundle your server into a single JavaScript file:

```bash
simplemcp bundle server.ts
```

**Output:**
```
SimpleMCP Bundler
=================

Entry:    /path/to/server.ts
Output:   /path/to/dist/bundle.js
Format:   single-file
Minify:   Yes
Platform: node
Target:   node20

✓ Bundle created successfully!

Output:   /path/to/dist/bundle.js
Size:     847.2 KB
Duration: 1234ms
```

**Deploy and run:**
```bash
node dist/bundle.js
```

That's it! Your server is bundled and ready for production.

### Output Formats

SimpleMCP supports multiple bundle formats:

#### 1. Single-File (Default)
Everything in one JavaScript file:
```bash
simplemcp bundle server.ts --format single-file
```

Best for: Serverless functions (Lambda, Vercel), simple deployments

#### 2. Standalone Distribution
Complete directory with bundle + metadata:
```bash
simplemcp bundle server.ts --format standalone --output dist/
```

Creates:
- `dist/bundle.js` - Bundled code
- `dist/package.json` - Runtime metadata
- `dist/README.md` - Deployment instructions

Best for: Traditional servers, Docker containers

#### 3. Executable Format
Direct execution without `node` prefix:
```bash
simplemcp bundle server.ts --format executable --output dist/myserver
```

Run with:
```bash
./dist/myserver
```

Best for: CLI tools, system services

#### 4. ESM/CJS Formats
```bash
simplemcp bundle server.ts --format esm   # Modern modules
simplemcp bundle server.ts --format cjs   # CommonJS
```

### Common Options

```bash
# Production build (minified, optimized)
simplemcp bundle server.ts \
  --output dist/server.js \
  --minify \
  --target node20

# Development build (source maps, readable)
simplemcp bundle server.ts \
  --no-minify \
  --sourcemap \
  --watch

# Auto-install dependencies before bundling
simplemcp bundle server.ts --auto-install

# Externalize native modules
simplemcp bundle server.ts --external fsevents,better-sqlite3
```

### Deployment Examples

#### Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:20 AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npx simplemcp bundle server.ts --output dist/bundle.js

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/bundle.js .
CMD ["node", "bundle.js"]
```

**Build and run:**
```bash
docker build -t myserver .
docker run -p 3000:3000 myserver
```

#### AWS Lambda

```bash
# Bundle for Lambda
simplemcp bundle server.ts \
  --output lambda/index.js \
  --minify \
  --target node20 \
  --external aws-sdk
```

#### Traditional Server

```bash
# Bundle
simplemcp bundle server.ts --output dist/server.js

# Copy to server
scp dist/server.js user@server:/app/

# Run on server
ssh user@server "node /app/server.js"
```

#### CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
- run: npm install
- run: npx simplemcp bundle server.ts --auto-install
- run: scp dist/bundle.js user@server:/app/
```

### Integration with Inline Dependencies

Bundling automatically includes inline dependencies:

```typescript
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///

// Bundle includes both packages automatically
```

### Configuration File

For complex setups, use a config file:

**simplemcp.config.js:**
```javascript
const isProd = process.env.NODE_ENV === 'production';

export default {
  entry: './src/server.ts',
  output: {
    dir: 'dist',
    filename: 'server.bundle.js',
    format: 'single-file',
  },
  bundle: {
    minify: isProd,
    sourcemap: !isProd,
    target: 'node20',
    external: ['fsevents', 'better-sqlite3'],
  },
  autoInstall: true,
};
```

**Run:**
```bash
simplemcp bundle  # Automatically finds config
```

### Benefits

- **Zero-Dependency Deployment**: One file, no npm install
- **Production Optimization**: 30-50% size reduction with minification
- **Easy Distribution**: Share a single file instead of entire project
- **Fast Cold Starts**: Optimized for serverless environments
- **Cross-Platform**: Bundle for any Node.js version
- **Secure**: Auto-externalize native modules, validate dependencies

For complete documentation, see:
- [Bundling Feature Guide](./docs/features/bundling.md)
- [Deployment Guide](./docs/guides/BUNDLING_DEPLOYMENT.md)
- [Example: bundle-basic.md](./examples/bundling/bundle-basic.md)
- [Example: bundle-advanced.md](./examples/bundling/bundle-advanced.md)
- [Example: bundle-config.md](./examples/bundling/bundle-config.md)

## Comparison with Config-Based Approach

### Old Way (Config File + Handler Files)

**config.json:**
```json
{
  "name": "my-server",
  "tools": [{
    "name": "greet",
    "inputSchema": { "type": "object", "properties": {...} },
    "handler": "./handlers/greet.js"
  }]
}
```

**handlers/greet.js:**
```javascript
export default async function(args, context) {
  // handler code
}
```

**Run:**
```bash
node configurableServer.ts config.json
```

### New Way (SimpleMCP)

**server.ts:**
```typescript
import { SimpleMCP } from './mcp/SimpleMCP.js';
import { z } from 'zod';

const server = new SimpleMCP({ name: 'my-server', version: '1.0.0' });

server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({ name: z.string() }),
  execute: async (args) => `Hello, ${args.name}!`,
});

await server.start();
```

**Run:**
```bash
node server.ts
```

### Benefits

| Feature | Config-Based | SimpleMCP |
|---------|-------------|-----------|
| Files needed | 3+ (config + handlers) | 1 |
| Schema format | JSON Schema (manual) | Zod (type-safe) |
| Type safety | Manual | Automatic |
| Validation | Manual setup | Automatic |
| Hot reload | No | No (same) |
| Complexity | High | Low |

## Advanced Features

### Chainable API

```typescript
server
  .addTool({ name: 'tool1', ... })
  .addTool({ name: 'tool2', ... })
  .addPrompt({ name: 'prompt1', ... })
  .addResource({ uri: 'resource1', ... });
```

### Server Info and Stats

```typescript
const info = server.getInfo();
// { name: 'my-server', version: '1.0.0', isRunning: true }

const stats = server.getStats();
// { tools: 3, prompts: 1, resources: 2 }
```

### Graceful Shutdown

```typescript
// Automatically handles SIGINT
// Or manually:
await server.stop();
```

## Integration with Existing Infrastructure

SimpleMCP wraps and reuses:

- **HandlerManager**: Tool execution
- **Validation System**: Input validation & sanitization
- **Security System**: Rate limiting, access control (available)
- **Logger System**: Structured logging
- **Error System**: LLM-friendly errors

This means you get all the production-ready features of the existing infrastructure with a simpler API.

## Migration Guide

### From Config-Based to SimpleMCP

1. **Create a new TypeScript file**
2. **Import SimpleMCP and Zod**
3. **Convert your config.json tools to addTool calls**
4. **Convert JSON Schema to Zod schemas**
5. **Inline your handler functions**
6. **Replace server start command**

### Example Migration

**Before (config.json):**
```json
{
  "tools": [{
    "name": "calculate",
    "description": "Calculate something",
    "inputSchema": {
      "type": "object",
      "properties": {
        "a": { "type": "number" },
        "b": { "type": "number" }
      },
      "required": ["a", "b"]
    },
    "handler": "./handlers/calculate.js"
  }]
}
```

**After (server.ts):**
```typescript
server.addTool({
  name: 'calculate',
  description: 'Calculate something',
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async (args) => {
    // Handler code inline
    return args.a + args.b;
  },
});
```

## Examples

Check out the examples directory:

- `mcp/examples/simple-server.ts` - Basic examples
- `mcp/examples/advanced-server.ts` - Advanced patterns
- `mcp/examples/test-client.ts` - Test client
- `mcp/examples/README.md` - Detailed documentation

## Troubleshooting

### "Cannot add tools after server has started"
Add all tools before calling `start()`.

### "Tool 'X' is already registered"
Tool names must be unique. Check for duplicates.

### Zod validation errors
Make sure your schema matches your arguments. Use `.describe()` for clarity.

### TypeScript compilation errors
Ensure you're using compatible TypeScript settings (ESM, etc.).

## Next Steps

1. **Try the examples:**
   ```bash
   node mcp/examples/simple-server.ts
   ```

2. **Create your own server** based on the patterns

3. **Explore Zod docs** for advanced validation

4. **Check MCP SDK docs** for protocol details

## Support

- Examples: `mcp/examples/`
- Documentation: `mcp/examples/README.md`
- Core types: `mcp/core/types.ts`
- Existing infrastructure: `mcp/core/`, `mcp/validation/`, `mcp/security/`

## Summary

SimpleMCP gives you:
- ✅ Single-file servers
- ✅ Type-safe Zod validation
- ✅ Automatic schema conversion
- ✅ Clean, chainable API
- ✅ Full TypeScript support
- ✅ Built on production infrastructure
- ✅ Both stdio and HTTP transports
- ✅ Minimal boilerplate

Start building MCP servers in minutes, not hours!
