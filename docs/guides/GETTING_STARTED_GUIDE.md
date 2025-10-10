# Getting Started with Simply MCP

Welcome! This guide will take you from complete beginner to confidently building MCP servers in just a few minutes. No prior MCP knowledge required.

## Table of Contents

1. [What is MCP?](#what-is-mcp)
2. [What is Simply MCP?](#what-is-simply-mcp)
3. [Why Use Simply MCP?](#why-use-simply-mcp)
4. [Prerequisites](#prerequisites)
5. [Installation](#installation)
6. [Your First Server (5-Minute Tutorial)](#your-first-server-5-minute-tutorial)
7. [Understanding API Styles](#understanding-api-styles)
8. [Adding More Capabilities](#adding-more-capabilities)
9. [CLI Basics](#cli-basics)
10. [Next Steps](#next-steps)
11. [Common Beginner Questions](#common-beginner-questions)
12. [Troubleshooting](#troubleshooting)
13. [Resources](#resources)

---

## What is MCP?

**MCP (Model Context Protocol)** is a protocol created by Anthropic that lets AI assistants (like Claude) interact with external tools, data, and systems.

Think of it like this:
- **Without MCP**: Claude can only answer based on its training data
- **With MCP**: Claude can use tools you provide (read files, call APIs, access databases, etc.)

MCP servers expose **capabilities** that AI assistants can use:
- **Tools**: Functions the AI can call (like "get weather" or "search database")
- **Prompts**: Pre-built prompt templates for common tasks
- **Resources**: Data the AI can access (like configuration files or documentation)

**Real-world example:**
```
You: "What's the weather in San Francisco?"
Claude: (calls your weather MCP server's "get_weather" tool)
Claude: "The current temperature in San Francisco is 65°F with partly cloudy skies."
```

## What is Simply MCP?

**Simply MCP** is a TypeScript framework that makes building MCP servers incredibly easy. It handles all the complex protocol details, so you can focus on building your tools.

**What makes it "simple":**
- Zero configuration required to get started
- TypeScript works out of the box (no compilation needed)
- Multiple API styles to match your preferences
- Automatic schema generation from TypeScript types
- Built-in CLI that just works

## Why Use Simply MCP?

### For Complete Beginners

**No MCP experience?** Perfect! Simply MCP abstracts away the protocol complexity:
- You don't need to understand JSON-RPC
- You don't need to handle transport layers
- You don't need to write schema definitions
- Just write TypeScript functions, and Simply MCP does the rest

### For Experienced Developers

**Know what you're doing?** Simply MCP gets out of your way:
- Full TypeScript type safety
- Multiple API styles for different needs
- Programmatic control when you need it
- Production-ready features (HTTP transport, validation, error handling)

### Key Benefits

✅ **Zero Config**: No `tsconfig.json`, no `package.json` required
✅ **TypeScript Native**: Run `.ts` files directly with no build step
✅ **Type Safe**: Full IntelliSense and compile-time checking
✅ **Flexible**: Three API styles (choose what you like best)
✅ **Fast**: Get from idea to running server in under 5 minutes
✅ **Production Ready**: HTTP transport, validation, error handling built-in

---

## Prerequisites

### Required

**Node.js 20 or higher**
```bash
# Check your Node.js version
node --version

# Should output: v20.0.0 or higher
```

Don't have Node.js 20+? Download it from [nodejs.org](https://nodejs.org/)

### Recommended Skills

**TypeScript basics:**
- Understanding types (`string`, `number`, `boolean`)
- Defining interfaces
- Using classes (for decorator/interface APIs)
- Basic async/await

**Don't know TypeScript?** No problem! The examples are simple enough to follow along.

### Optional (NOT Required!)

The following are **completely optional**:
- ❌ No `package.json` needed (but you can add one if you want)
- ❌ No `tsconfig.json` needed (but it helps with IDE IntelliSense)
- ❌ No build tools needed (TypeScript runs directly)
- ❌ No configuration files needed (zero config by default)

---

## Installation

Simply MCP is distributed as an npm package. Install it once, and you're ready to go.

```bash
# Install globally (run from anywhere)
npm install -g simply-mcp

# OR install locally (project-specific)
npm install simply-mcp
```

**Verify installation:**
```bash
# Check version
npx simply-mcp --version

# Should output: 2.5.0 (or higher)
```

**That's it!** You're ready to build your first MCP server.

---

## Your First Server (5-Minute Tutorial)

Let's build a working MCP server in 5 minutes. We'll show you all three API styles, and you can pick your favorite.

### Step 1: Choose Your API Style

Simply MCP offers three ways to build servers:

1. **Interface API** - Pure TypeScript interfaces (cleanest, zero boilerplate)
2. **Decorator API** - Class-based with `@tool` decorators (auto-registration)
3. **Functional API** - Programmatic control (maximum flexibility)

**Which should you choose?**
- **Beginner?** Try Interface API (cleanest) or Decorator API (most intuitive)
- **Prefer interfaces?** Interface API
- **Prefer classes?** Decorator API
- **Need runtime control?** Functional API

Don't worry - you can change styles later! Let's see all three.

### Step 2A: Interface API (Recommended)

Create a file called `hello-server.ts`:

```typescript
import type { ITool, IServer } from 'simply-mcp';

// Define a tool interface
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a person by name';
  params: {
    name: string;
    formal?: boolean;
  };
  result: string;
}

// Define server interface
interface HelloServer extends IServer {
  name: 'hello-server';
  version: '1.0.0';
}

// Implement the server
export default class HelloServerImpl implements HelloServer {
  greet: GreetTool = async (params) => {
    const greeting = params.formal ? 'Good day' : 'Hello';
    return `${greeting}, ${params.name}!`;
  };
}
```

**What's happening here?**
1. `ITool` interface defines what a tool looks like (name, params, result)
2. `IServer` interface defines server metadata (name, version)
3. Implementation class provides the actual logic
4. TypeScript types automatically become validation schemas!

### Step 2B: Decorator API (Alternative)

Prefer decorators? Create `hello-server.ts`:

```typescript
import { MCPServer } from 'simply-mcp';

@MCPServer()  // Zero config!
export default class HelloServer {
  /**
   * Greet a person by name
   * @param name - Person's name
   * @param formal - Use formal greeting
   */
  greet(name: string, formal?: boolean): string {
    const greeting = formal ? 'Good day' : 'Hello';
    return `${greeting}, ${name}!`;
  }
}
```

**What's happening here?**
1. `@MCPServer()` decorator marks this as an MCP server
2. Public methods automatically become tools
3. JSDoc comments become tool descriptions
4. Server name auto-generated from class name: 'hello-server'

### Step 2C: Functional API (Alternative)

Prefer programmatic control? Create `hello-server.ts`:

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'hello-server',
  version: '1.0.0'
});

server.addTool({
  name: 'greet',
  description: 'Greet a person by name',
  parameters: z.object({
    name: z.string(),
    formal: z.boolean().optional()
  }),
  execute: async (args) => {
    const greeting = args.formal ? 'Good day' : 'Hello';
    return `${greeting}, ${args.name}!`;
  }
});

await server.start();
```

**What's happening here?**
1. Create a `SimplyMCP` instance with configuration
2. Explicitly add tools with Zod schemas
3. Full programmatic control over everything
4. Call `start()` to run the server

### Step 3: Run Your Server

**All three API styles use the same command!**

```bash
# Run your server
npx simply-mcp run hello-server.ts

# Output:
# [SimplyMCP] Server "hello-server" v1.0.0 is running
# [SimplyMCP] Transport: stdio
# [SimplyMCP] 1 tool registered: greet
```

**That's it!** Your MCP server is now running.

### Step 4: Test Your Server

To test your server, you need an MCP client. The easiest way is to use the Claude Desktop app or Claude Code CLI.

**Example test (using Claude):**
```
You: "Call the greet tool with name 'Alice' and formal=false"
Claude: (calls your MCP server)
Claude: "The greet tool returned: 'Hello, Alice!'"
```

### Step 5: Understand What Happened

Let's break down what just happened:

1. **You wrote TypeScript** - Just normal TypeScript code, nothing fancy
2. **CLI auto-detected the API style** - No need to specify interface/decorator/functional
3. **TypeScript ran directly** - No compilation, no build step
4. **Schemas generated automatically** - From TypeScript types (interface/decorator) or Zod (functional)
5. **Server started** - Ready to accept MCP requests via stdio

**Key insight:** Simply MCP handles all the MCP protocol complexity. You just write functions!

---

## Understanding API Styles

Now that you've seen all three styles, let's understand when to use each.

### Interface API

**Best for:** Clean, type-first development

**Pros:**
- Zero boilerplate (no manual schemas)
- Pure TypeScript interfaces
- Full IntelliSense on parameters and return types
- Automatic schema generation from types

**Cons:**
- Requires understanding of TypeScript interfaces
- Less runtime flexibility

**Example:**
```typescript
interface AddTool extends ITool {
  name: 'add';
  params: { a: number; b: number };
  result: number;
}

export default class Calculator implements IServer {
  name = 'calculator';
  add: AddTool = async (params) => params.a + params.b;
}
```

### Decorator API

**Best for:** Class-based organization with auto-registration

**Pros:**
- Public methods automatically become tools
- JSDoc comments become descriptions
- Familiar class-based structure
- Smart defaults (name from class, version from package.json)

**Cons:**
- Requires decorators (TypeScript feature)
- Slightly more boilerplate than interface API

**Example:**
```typescript
@MCPServer()
export default class Calculator {
  /** Add two numbers */
  add(a: number, b: number): number {
    return a + b;
  }
}
```

### Functional API

**Best for:** Maximum control and runtime flexibility

**Pros:**
- Full programmatic control
- Runtime tool registration
- Easy to conditionally add tools
- Great for dynamic servers

**Cons:**
- More boilerplate (manual schemas)
- Less type inference
- Requires Zod knowledge

**Example:**
```typescript
const server = new BuildMCPServer({ name: 'calculator', version: '1.0.0' });

server.addTool({
  name: 'add',
  description: 'Add two numbers',
  parameters: z.object({ a: z.number(), b: z.number() }),
  execute: async (args) => args.a + args.b
});

await server.start();
```

### Comparison Table

| Feature | Interface API | Decorator API | Functional API |
|---------|--------------|---------------|----------------|
| **Boilerplate** | Minimal | Minimal | Medium |
| **Type safety** | Excellent | Excellent | Good |
| **IntelliSense** | Full | Full | Partial |
| **Learning curve** | Easy | Easy | Medium |
| **Runtime flexibility** | Low | Low | High |
| **Auto-registration** | Yes (via interfaces) | Yes (public methods) | No |
| **Schema generation** | Automatic | Automatic | Manual (Zod) |
| **Best for** | Type-first devs | Class-based devs | Programmatic control |

### When to Use Which?

**Choose Interface API if:**
- ✅ You love TypeScript interfaces
- ✅ You want zero boilerplate
- ✅ You prefer defining APIs upfront
- ✅ You want the cleanest possible code

**Choose Decorator API if:**
- ✅ You prefer class-based organization
- ✅ You want methods to auto-register as tools
- ✅ You like using JSDoc comments
- ✅ You're familiar with decorators

**Choose Functional API if:**
- ✅ You need runtime control
- ✅ You want to conditionally add tools
- ✅ You're building dynamic servers
- ✅ You prefer explicit over implicit

**Can I mix styles?**
No - each server uses one API style. But you can run multiple servers with different styles!

---

## Adding More Capabilities

Let's expand our server with more tools, prompts, and resources.

### Adding More Tools

#### Interface API

```typescript
interface AddTool extends ITool {
  name: 'add';
  params: { a: number; b: number };
  result: number;
}

interface SubtractTool extends ITool {
  name: 'subtract';
  params: { a: number; b: number };
  result: number;
}

export default class Calculator implements IServer {
  name = 'calculator';

  add: AddTool = async (params) => params.a + params.b;
  subtract: SubtractTool = async (params) => params.a - params.b;
}
```

#### Decorator API

```typescript
@MCPServer()
export default class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }
}
```

#### Functional API

```typescript
const server = new BuildMCPServer({ name: 'calculator', version: '1.0.0' });

server.addTool({
  name: 'add',
  parameters: z.object({ a: z.number(), b: z.number() }),
  execute: async (args) => args.a + args.b
});

server.addTool({
  name: 'subtract',
  parameters: z.object({ a: z.number(), b: z.number() }),
  execute: async (args) => args.a - args.b
});
```

### Adding Prompts

Prompts are pre-built templates that AI assistants can use.

#### Interface API

```typescript
interface CodeReviewPrompt extends IPrompt {
  name: 'code_review';
  description: 'Generate a code review prompt';
  args: {
    language: string;
    focus?: string;
  };
  template: `Please review this {language} code.
{focus ? 'Focus on: ' + focus : 'Provide a general review.'}`;
}

export default class MyServer implements IServer {
  name = 'my-server';

  // Prompts with templates don't need implementation!
}
```

#### Decorator API

```typescript
@MCPServer()
export default class MyServer {
  @prompt('Generate a code review prompt')
  codeReview(language: string, focus?: string): string {
    return `Please review this ${language} code.
${focus ? `Focus on: ${focus}` : 'Provide a general review.'}`;
  }
}
```

#### Functional API

```typescript
server.addPrompt({
  name: 'code_review',
  description: 'Generate a code review prompt',
  arguments: [
    { name: 'language', required: true },
    { name: 'focus', required: false }
  ],
  template: (args) => `Please review this ${args.language} code.
${args.focus ? `Focus on: ${args.focus}` : 'Provide a general review.'}`
});
```

### Adding Resources

Resources provide static or dynamic data to AI assistants.

#### Interface API (Static Resource)

```typescript
interface ConfigResource extends IResource {
  uri: 'config://server';
  name: 'Server Configuration';
  mimeType: 'application/json';
  data: {
    version: '1.0.0';
    features: ['tools', 'prompts'];
  };
}

// No implementation needed for static resources!
```

#### Decorator API

```typescript
@MCPServer()
export default class MyServer {
  @resource('config://server', { mimeType: 'application/json' })
  getConfig() {
    return {
      version: '1.0.0',
      features: ['tools', 'prompts']
    };
  }
}
```

#### Functional API

```typescript
server.addResource({
  uri: 'config://server',
  name: 'Server Configuration',
  mimeType: 'application/json',
  content: {
    version: '1.0.0',
    features: ['tools', 'prompts']
  }
});
```

---

## CLI Basics

Simply MCP includes a powerful CLI for running your servers.

### Basic Command

```bash
# Run any server (auto-detects API style)
npx simply-mcp run server.ts
```

**The CLI automatically:**
- Detects your API style (interface/decorator/functional)
- Runs TypeScript directly (no compilation)
- Starts the server with the default transport (stdio)

### Common Options

```bash
# HTTP transport
npx simply-mcp run server.ts --http --port 3000

# Watch mode (auto-restart on file changes)
npx simply-mcp run server.ts --watch

# Verbose output (helpful for debugging)
npx simply-mcp run server.ts --verbose

# Validate without running
npx simply-mcp run server.ts --dry-run

# Multiple servers at once
npx simply-mcp run server1.ts server2.ts server3.ts
```

### Understanding Output

**Stdio transport (default):**
```
[SimplyMCP] Server "my-server" v1.0.0 is running
[SimplyMCP] Transport: stdio
[SimplyMCP] 3 tools registered: greet, add, subtract
[SimplyMCP] Ready for MCP requests
```

**HTTP transport:**
```
[SimplyMCP] Server "my-server" v1.0.0 is running
[SimplyMCP] Transport: http (stateful)
[SimplyMCP] Listening on: http://localhost:3000
[SimplyMCP] 3 tools registered: greet, add, subtract
[SimplyMCP] Ready for MCP requests
```

### CLI Options Reference

| Option | Description | Example |
|--------|-------------|---------|
| `--http` | Use HTTP transport | `--http` |
| `--port <n>` | HTTP port (default: 3000) | `--port 8080` |
| `--watch` | Auto-restart on changes | `--watch` |
| `--dry-run` | Validate without running | `--dry-run` |
| `--verbose` | Show detailed logs | `--verbose` |
| `--inspect` | Enable Chrome DevTools | `--inspect` |
| `--help` | Show help | `--help` |

### Alternative Commands (Advanced)

If you need explicit control over the API style:

```bash
# Explicitly use decorator API
npx simplymcp-class server.ts

# Explicitly use interface API
npx simplymcp-interface server.ts

# Explicitly use functional API
npx simplymcp-func server.ts
```

**Note:** We recommend using `simply-mcp run` as it auto-detects the style.

---

## Next Steps

Congratulations! You've built your first MCP server. Here's what to learn next:

### 1. HTTP Transport

Learn how to expose your server over HTTP for web applications:

```bash
# Run with HTTP
npx simply-mcp run server.ts --http --port 3000
```

**Learn more:** [HTTP Transport Guide](../../src/docs/HTTP-TRANSPORT.md)

### 2. JSDoc Documentation

Add rich documentation to your tools:

```typescript
/**
 * Calculate the area of a rectangle
 *
 * @param width - Rectangle width in meters
 * @param height - Rectangle height in meters
 * @returns Area in square meters
 *
 * @example
 * calculateArea(10, 5)
 * // Returns: 50
 */
@tool()
calculateArea(width: number, height: number): number {
  return width * height;
}
```

Simply MCP automatically extracts JSDoc documentation and includes it in the tool schema that AI agents see. The main comment becomes the tool description, and `@param` descriptions become parameter descriptions. These descriptions help AI agents understand what each parameter expects and how to use your tools effectively.

For complete JSDoc documentation including best practices and schema mapping details, see the [JSDoc and Descriptions Guide](./JSDOC_AND_DESCRIPTIONS.md).

### 3. Validation and Error Handling

Add custom validation to your tools:

**Interface API:**
```typescript
interface CreateUserTool extends ITool {
  name: 'create_user';
  params: {
    /**
     * Username
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
  };
  result: { id: string };
}
```

**Functional API:**
```typescript
server.addTool({
  name: 'create_user',
  parameters: z.object({
    username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
    email: z.string().email()
  }),
  execute: async (args) => {
    // Handle errors gracefully
    try {
      const id = await createUser(args.username, args.email);
      return { id };
    } catch (error) {
      return { error: error.message };
    }
  }
});
```

**Learn more:** [Input Validation Guide](../../src/docs/guides/INPUT-VALIDATION.md)

### 4. Working with Binary Content

Return images, PDFs, or other binary data:

```typescript
server.addTool({
  name: 'generate_chart',
  parameters: z.object({ data: z.array(z.number()) }),
  execute: async (args) => {
    const imageBuffer = await generateChart(args.data);
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

**Learn more:** [Binary Content Guide](../../src/docs/features/binary-content.md)

### 5. Advanced Features

Explore more advanced capabilities:
- **Watch Mode**: Auto-restart on file changes ([Watch Mode Guide](./WATCH_MODE_GUIDE.md))
- **Multiple Servers**: Run multiple servers simultaneously ([Multi-Server Guide](./MULTI_SERVER_QUICKSTART.md))
- **Deployment**: Deploy to production ([Deployment Guide](./DEPLOYMENT_GUIDE.md))
- **Bundling**: Bundle your server into a single file ([Bundling Guide](./BUNDLING.md))

---

## Common Beginner Questions

### Do I need a `tsconfig.json`?

**No!** Simply MCP uses [tsx](https://github.com/esbuild-kit/tsx) to run TypeScript directly with sensible defaults.

**However**, a `tsconfig.json` is helpful for:
- IDE IntelliSense and autocomplete
- Type checking with `tsc --noEmit`
- Catching type errors at development time

**Minimal `tsconfig.json` (optional):**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

**Key insight:** This file only affects IDE and `tsc`, not how Simply MCP runs your server.

### Do I need a `package.json`?

**No!** You can run servers without any `package.json`.

**However**, a `package.json` is useful for:
- Managing dependencies (if you use external packages)
- Setting the version (decorator API auto-detects it)
- Adding npm scripts for convenience

**Minimal `package.json` (optional):**
```json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "simply-mcp run server.ts --watch",
    "start": "simply-mcp run server.ts"
  },
  "dependencies": {
    "simply-mcp": "^2.5.0"
  }
}
```

### How do I choose which API style to use?

Use this decision tree:

**Do you prefer TypeScript interfaces?**
→ Yes: **Interface API**
→ No: Continue...

**Do you like class-based code?**
→ Yes: **Decorator API**
→ No: **Functional API**

**Do you need runtime flexibility?**
→ Yes: **Functional API**
→ No: **Interface or Decorator API**

**Still unsure?**
Start with **Decorator API** - it's the most intuitive for beginners.

### Can I mix API styles in one server?

**No.** Each server uses one API style. However:
- You can run multiple servers with different styles
- You can migrate from one style to another
- All styles are equally capable

**Example: Running multiple servers:**
```bash
# Run decorator and functional servers together
npx simply-mcp run decorator-server.ts functional-server.ts
```

### How do I debug my server?

**Option 1: Verbose logging**
```bash
npx simply-mcp run server.ts --verbose
```

**Option 2: Chrome DevTools**
```bash
npx simply-mcp run server.ts --inspect
# Opens Chrome DevTools for debugging
```

**Option 3: Console logging**
```typescript
@tool()
myTool(value: number): number {
  console.error('[DEBUG] Input:', value);  // Use stderr
  const result = value * 2;
  console.error('[DEBUG] Output:', result);
  return result;
}
```

**Important:** Use `console.error()` instead of `console.log()` to avoid interfering with stdio transport.

### What's the difference between stdio and HTTP transport?

**Stdio (default):**
- Communication via standard input/output
- Used by CLI tools and desktop apps (like Claude Desktop)
- Single client per process
- Automatically selected by default

**HTTP:**
- Communication via HTTP/HTTPS
- Used by web applications
- Multiple clients via sessions
- Requires `--http` flag

**When to use each:**
- **Stdio**: Desktop apps, CLI tools, testing
- **HTTP**: Web apps, APIs, serverless deployments

### How do I test my server?

**Option 1: Claude Desktop**
Configure Claude Desktop to use your MCP server.

**Option 2: Claude Code CLI**
If you have the Claude Code CLI, connect it to your server.

**Option 3: Dry run**
Validate your server configuration without running it:
```bash
npx simply-mcp run server.ts --dry-run
```

**Option 4: Manual testing (HTTP)**
Run with HTTP and test with curl:
```bash
# Start server
npx simply-mcp run server.ts --http --port 3000

# Test tool call (in another terminal)
curl -X POST http://localhost:3000/mcp/v1/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "greet", "arguments": {"name": "Alice"}}'
```

---

## Troubleshooting

### Installation Issues

**Problem:** `npm install simply-mcp` fails

**Solution 1:** Update npm
```bash
npm install -g npm@latest
```

**Solution 2:** Clear npm cache
```bash
npm cache clean --force
npm install simply-mcp
```

**Solution 3:** Use different registry
```bash
npm install simply-mcp --registry https://registry.npmjs.org/
```

### Import Errors

**Problem:** `Cannot find module 'simply-mcp'`

**Solution:** Make sure simply-mcp is installed
```bash
# Check if installed
npm list simply-mcp

# If not installed
npm install simply-mcp
```

**Problem:** `Module not found: 'simply-mcp/decorators'`

**Solution:** Update imports (v2.5.0+)
```typescript
// ❌ Old (deprecated)
import { MCPServer } from 'simply-mcp/decorators';

// ✅ New (recommended)
import { MCPServer } from 'simply-mcp';
```

### Server Won't Start

**Problem:** `No default export found in server.ts`

**Solution:** Add default export
```typescript
// ❌ Wrong
export class MyServer { }

// ✅ Correct
export default class MyServer { }
```

**Problem:** `Class must be decorated with @MCPServer`

**Solution:** Add the decorator
```typescript
// ❌ Missing decorator
export default class MyServer { }

// ✅ Correct
@MCPServer()
export default class MyServer { }
```

**Problem:** `Tool "my_tool" requires method "myTool" but it was not found`

**Solution:** Check method naming (snake_case → camelCase)
```typescript
interface MyTool extends ITool {
  name: 'my_tool';  // snake_case
}

export default class MyServer {
  // Method name must be camelCase version: myTool
  myTool: MyTool = async (params) => { ... };
}
```

### Can't Connect to Server

**Problem:** Client can't connect to HTTP server

**Solution 1:** Check if server is running
```bash
# Check if port is in use
lsof -i :3000
```

**Solution 2:** Try a different port
```bash
npx simply-mcp run server.ts --http --port 8080
```

**Solution 3:** Check firewall settings
```bash
# Allow port through firewall (Linux)
sudo ufw allow 3000
```

### TypeScript Errors

**Problem:** `Experimental support for decorators is not enabled`

**Solution:** Create `tsconfig.json` (for IDE only)
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

**Note:** This doesn't affect runtime (tsx handles decorators automatically).

### Performance Issues

**Problem:** Server is slow to start

**Solution 1:** Use watch mode for development
```bash
npx simply-mcp run server.ts --watch
```

**Solution 2:** Bundle for production
```bash
# See bundling guide
npm run bundle
```

---

## Resources

### Official Documentation

**Core Guides:**
- [Interface API Guide](./INTERFACE_API_GUIDE.md) - Complete Interface API documentation
- [Decorator API Guide](../development/DECORATOR-API.md) - Decorator-based API reference
- [HTTP Transport Guide](../../src/docs/HTTP-TRANSPORT.md) - Setting up HTTP servers
- [Input Validation Guide](../../src/docs/guides/INPUT-VALIDATION.md) - Validating tool inputs

**Feature Guides:**
- [Watch Mode Guide](./WATCH_MODE_GUIDE.md) - Auto-restart on file changes
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment
- [Bundling Guide](./BUNDLING.md) - Bundle servers for distribution
- [Binary Content Guide](../../src/docs/features/binary-content.md) - Working with images/files

**Advanced Topics:**
- [Handler Development](../../src/docs/guides/HANDLER-DEVELOPMENT.md) - Creating custom handlers
- [Security](../../src/security/index.ts) - Rate limiting, access control
- [Multi-Server Guide](./MULTI_SERVER_QUICKSTART.md) - Running multiple servers

### Example Servers

Browse real working examples:
- [Interface Minimal](../../examples/interface-minimal.ts) - Basic interface API example
- [Class Minimal](../../examples/class-minimal.ts) - Basic decorator API example
- [Simple Server](../../examples/simple-server.ts) - Functional API example with all features
- [More Examples](../../examples/) - Full examples directory

### API Reference

- [Complete API Documentation](../../src/docs/INDEX.md)
- [Transport Comparison](../../src/docs/reference/TRANSPORTS.md)
- [Troubleshooting](../../src/docs/TROUBLESHOOTING.md)

### External Resources

- [Model Context Protocol (MCP) Specification](https://spec.modelcontextprotocol.io/) - Official MCP docs
- [Anthropic MCP SDK](https://github.com/modelcontextprotocol/sdk) - MCP SDK by Anthropic
- [Simply MCP GitHub](https://github.com/Clockwork-Innovations/simply-mcp-ts) - Source code and issues
- [Simply MCP npm Package](https://www.npmjs.com/package/simply-mcp) - npm page

### Community & Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)
- **GitHub Discussions**: [Ask questions and share ideas](https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions)
- **Changelog**: [See what's new](../../docs/releases/CHANGELOG.md)

---

## What's Next?

You now have everything you need to start building MCP servers with Simply MCP!

**Beginner path:**
1. ✅ Complete the 5-minute tutorial (you're done!)
2. 📖 Read the [Interface API Guide](./INTERFACE_API_GUIDE.md) or [Decorator API Guide](../development/DECORATOR-API.md)
3. 🔨 Build a simple weather server or calculator
4. 🌐 Try [HTTP Transport](../../src/docs/HTTP-TRANSPORT.md)
5. 🚀 Deploy with the [Deployment Guide](./DEPLOYMENT_GUIDE.md)

**Advanced path:**
1. ✅ Master all three API styles
2. 📦 Learn [Bundling](./BUNDLING.md) for distribution
3. 🔒 Implement [Security features](../../src/security/index.ts)
4. 🎨 Create custom [Handlers](../../src/docs/guides/HANDLER-DEVELOPMENT.md)
5. 🏗️ Build production MCP servers

**Get started now:**
```bash
# Create your first server
echo 'import { MCPServer } from "simply-mcp";

@MCPServer()
export default class MyServer {
  greet(name: string): string {
    return `Hello, ${name}!`;
  }
}' > my-server.ts

# Run it!
npx simply-mcp run my-server.ts
```

**Happy coding!** 🎉

---

**Need help?** Open an issue on [GitHub](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues) or start a discussion!
