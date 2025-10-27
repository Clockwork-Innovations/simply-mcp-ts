# Simply MCP Examples Index

All examples using the Interface API. Run any with:
```bash
npx tsx examples/[filename].ts
```

## ✅ Validation Status

**All Interface API examples are validated** in CI/CD on every push/PR:
- Examples pass dry-run validation
- Type-checking and runtime validation
- Run validation locally: `npm run test:examples`

## Getting Started

Start with these examples in order:

### 1. **`interface-minimal.ts`** - Hello World
The simplest possible MCP server. Learn the basics:
- Pure TypeScript interfaces
- Single tool definition
- Basic implementation pattern

```bash
npx tsx examples/interface-minimal.ts
```

### 2. **`interface-advanced.ts`** - Add Features
Add more capabilities:
- Multiple tools
- Parameter validation with IParam
- Complex types and enums
- Optional parameters

```bash
npx tsx examples/interface-advanced.ts
```

### 3. **`interface-comprehensive.ts`** - All Features
Complete example showing:
- Tools with nested types
- Static and dynamic prompts
- Static and dynamic resources
- Complex validation patterns
- Full type safety

```bash
npx tsx examples/interface-comprehensive.ts
```

### 4. **`interface-file-prompts.ts`** - File-Based Prompts
Learn file-based prompt templates:
- Load prompts from files
- Template interpolation
- Reusable prompt patterns

```bash
npx tsx examples/interface-file-prompts.ts
```

### 5. **`interface-http-auth.ts`** - HTTP Server with Authentication
Production-ready HTTP server with security:
- HTTP transport configuration (stateful mode)
- API key authentication
- Multiple permission levels
- Stateful session management
- Complete security setup

```bash
npx simply-mcp run examples/interface-http-auth.ts
```

### 6. **`interface-http-stateless.ts`** - Stateless HTTP Server
Serverless-ready HTTP server without session state:
- HTTP transport configuration (stateless mode)
- Independent request handling
- Perfect for AWS Lambda, Cloud Functions
- REST API pattern
- Infinite horizontal scaling

```bash
npx simply-mcp run examples/interface-http-stateless.ts
```

## Protocol Feature Examples

### Sampling (LLM Completions)
- **[interface-sampling-foundation.ts](./interface-sampling-foundation.ts)** - Basic sampling with code explanation, translation, story generation
- **[interface-sampling.ts](./interface-sampling.ts)** - Production sampling with multi-turn conversations, error handling, statistics

### Elicitation (User Input)
- **[interface-elicitation-foundation.ts](./interface-elicitation-foundation.ts)** - Basic elicitation with API key and database configuration
- **[interface-elicitation.ts](./interface-elicitation.ts)** - Production elicitation with complex forms, validation, wizards

### Roots (Directory Discovery)
- **[interface-roots-foundation.ts](./interface-roots-foundation.ts)** - Basic roots with workspace listing and file operations
- **[interface-roots.ts](./interface-roots.ts)** - Production roots with workspace analysis, file search, caching

### Subscriptions (Resource Updates)
- **[interface-subscriptions-foundation.ts](./interface-subscriptions-foundation.ts)** - Basic subscriptions with server stats monitoring
- **[interface-subscriptions.ts](./interface-subscriptions.ts)** - Production subscriptions with real-time updates, multiple resources

### Completions (Autocomplete)
- **[interface-completions-foundation.ts](./interface-completions-foundation.ts)** - Basic completions with city name autocomplete
- **[interface-completions.ts](./interface-completions.ts)** - Production completions with dynamic suggestions, multiple handlers

### UI Resources (Interactive HTML Interfaces)
- **[interface-ui-foundation.ts](./interface-ui-foundation.ts)** - Foundation layer inline HTML UI with tool integration, static/dynamic UIs, subscribable updates
- **[interface-file-based-ui.ts](./interface-file-based-ui.ts)** - Feature layer file-based UI with external HTML/CSS/JS files, product catalog with search/filter
- **[interface-react-dashboard.ts](./interface-react-dashboard.ts)** - Feature layer React dashboard with external dependencies (recharts, date-fns), interactive charts
- **[interface-sampling-ui.ts](./interface-sampling-ui.ts)** - Chat UI demonstrating MCP sampling integration pattern with message history

## Additional Examples

### **`interface-params.ts`** - IParam Structured Validation
Demonstrates structured parameter definitions:
- IParam interface with rich metadata
- Required/optional field handling
- Reusable parameter definitions
- Mix IParam with simple types

### **`interface-strict-mode.ts`** - TypeScript Strict Mode
Shows ToolHandler<T> for strict mode compatibility:
- TypeScript strict mode compliance
- ToolHandler<T> utility type
- Full type safety without structural issues
- Recommended for strict TypeScript projects

### **`interface-named-export-demo.ts`** - Named Exports
Demonstrates alternative export pattern:
- Use `export class` instead of `export default class`
- Less boilerplate
- Same functionality
- Auto-detected by framework

## Bundle Examples

### **Calculator Bundle** (`calculator-bundle/`)
Minimal bundle example with basic arithmetic:
- Add, subtract, multiply, divide
- Error handling (division by zero)
- Interface API pattern
- Ready to deploy

```bash
cd examples/calculator-bundle
npx simply-mcp run .
```

### **Weather Bundle** (`weather-bundle/`)
Comprehensive bundle with weather services:
- Current weather conditions
- Multi-day forecasts (1-7 days)
- Weather alerts
- Unit conversion (F/C)
- Mock data for demonstration

```bash
cd examples/weather-bundle
npx simply-mcp run .
```

## Running Examples

### Basic Run
```bash
npx tsx examples/interface-minimal.ts
```

### With Options
```bash
# HTTP transport
npx simply-mcp run examples/interface-minimal.ts --http --port 3000

# Watch mode (auto-restart on changes)
npx simply-mcp run examples/interface-minimal.ts --watch

# Verbose output
npx simply-mcp run examples/interface-minimal.ts --verbose

# Dry-run (validate without executing)
npx simply-mcp run examples/interface-minimal.ts --dry-run
```

### Building Bundles
```bash
# Create single executable
npx simplymcp bundle examples/interface-minimal.ts -o my-server.js

# Create package bundle
npx simplymcp bundle examples/interface-minimal.ts -f package -o ./my-bundle
```

## Learning Path

**New to MCP?** Follow this path:

1. **Read the basics** → [QUICK_START.md](../docs/guides/QUICK_START.md)
2. **Run interface-minimal.ts** → See a working server
3. **Read the code** → Understand the interface pattern
4. **Run interface-advanced.ts** → See more features
5. **Modify an example** → Add your own tool
6. **Read the guides** → [Interface API Reference](../docs/guides/INTERFACE_API_REFERENCE.md)

## Key Features by Example

### Tools (Capabilities)
- **`interface-minimal.ts`** - Basic tool with simple params
- **`interface-advanced.ts`** - Multiple tools with validation
- **`interface-comprehensive.ts`** - Complex tools with nested types

### Prompts
- **`interface-advanced.ts`** - Static prompts with templates
- **`interface-comprehensive.ts`** - Dynamic prompts with runtime logic
- **`interface-file-prompts.ts`** - File-based prompt templates

### Resources
- **`interface-advanced.ts`** - Static resources with literal data
- **`interface-comprehensive.ts`** - Dynamic resources with runtime data

### Validation
- **`interface-advanced.ts`** - IParam validation with min/max/pattern
- **`interface-comprehensive.ts`** - JSDoc validation tags

### Transport Options
All examples work with both stdio and HTTP:
```bash
npx simply-mcp run examples/[file].ts --http --port 3000
```

See [TRANSPORT_GUIDE.md](../docs/guides/TRANSPORT_GUIDE.md) for details.

### Security & Authentication
- **`interface-http-auth.ts`** - Complete HTTP server with API key authentication
  - Multiple API keys with different permission levels
  - Stateful session management
  - Rate limiting and audit logging
  - Production-ready security configuration

## Need Help?

- **Can't find what you need?** Check [Interface API Reference](../docs/guides/INTERFACE_API_REFERENCE.md)
- **Want to understand something?** Read the comments in each example file
- **Need more documentation?** See `docs/guides/`
- **Having issues?** Create an issue on GitHub

---

**Quick Start**: Run `npx tsx examples/interface-minimal.ts` and start building!
