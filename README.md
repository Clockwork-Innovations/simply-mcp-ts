<div align="center">
  <img src="simply-mcp-banner.png" alt="Simply MCP" width="100%">
</div>

# Simply MCP

> A powerful, type-safe TypeScript framework for building Model Context Protocol (MCP) servers with support for multiple transports and decorator-based APIs.

[![npm version](https://badge.fury.io/js/simply-mcp.svg)](https://www.npmjs.com/package/simply-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

## Features

✨ **Multiple Transport Support**
- 📡 Stdio (standard input/output)
- 🌐 HTTP with dual modes:
  - **Stateful**: Session-based with SSE streaming (default)
  - **Stateless**: Perfect for serverless/Lambda deployments

🎨 **Multiple API Styles**
- **Interface API** - Pure TypeScript interfaces (cleanest, zero boilerplate)
- **Decorator API** - Class-based with `@tool`, `@prompt`, `@resource` decorators
- **Functional API** - Programmatic server building with full control
- **MCP Builder API** - Build MCP tools using MCP itself with AI-powered validation

⚡ **Developer Experience**
- Type-safe with full TypeScript support
- Auto-detection of API styles
- Built-in validation and error handling
- Comprehensive CLI tools

🚀 **Advanced Features**
- Router tools for organizing and scaling servers
- Handler system (file, inline, HTTP, registry)
- Binary content support (images, PDFs, audio)
- Session management for stateful transports
- Security features (rate limiting, access control, audit logging)

## Quick Start

### Installation

```bash
npm install simply-mcp
```

### Create Your First Server

Simply MCP supports three API styles. Choose the one that fits your preferences:

#### Option 1: Interface API (Cleanest)

Pure TypeScript interfaces with zero boilerplate:

```typescript
// server.ts
import type { ITool, IParam, IServer } from 'simply-mcp';

// 1. Define your tool interface (extends ITool)
interface AddTool extends ITool {
  name: 'add';                           // Tool name (snake_case for MCP)
  description: 'Add two numbers';        // Tool description
  params: { a: number; b: number };      // Input parameters (simple types)
  result: { sum: number };               // Return type
}

// 2. (Optional) Use IParam for richer validation
interface AgeParam extends IParam {
  type: 'integer';                       // Explicit type
  description: 'User age in years';      // LLM-visible description
  min: 0;                                // Validation constraint
  max: 150;                              // Validation constraint
}

interface ValidateTool extends ITool {
  name: 'validateAge';                   // Tool name (camelCase or snake_case, auto-normalized)
  description: 'Validate user age';
  params: { age: AgeParam };             // Use IParam for validation
  result: { valid: boolean };
}

// 3. Define server metadata
interface Calculator extends IServer {
  name: 'calculator';                    // Server name
  version: '1.0.0';                      // Version
}

// 4. Implement the server class
export default class CalculatorService implements Calculator {
  // ✅ Method name is camelCase (add), even though tool name is snake_case
  // ✅ Type annotation provides full IntelliSense on params
  add: AddTool = async (params) => ({
    sum: params.a + params.b             // params.a and params.b are typed!
  });

  // ✅ Method name is camelCase: validateAge (tool name: validate_age)
  validateAge: ValidateTool = async (params) => ({
    valid: params.age >= 0 && params.age <= 150
  });
}
```

> **⚠️ Important Pattern Notes:**
> - Tool names can be `camelCase` or `snake_case` - both auto-normalize to `snake_case` for MCP
> - Method names use `camelCase` (e.g., `validateAge`)
> - Use `ITool` for basic tools, add `IParam` for validation/constraints
> - Type annotation (`add: AddTool =`) gives you full type safety
>
> **📚 See [Interface API Reference](https://github.com/Clockwork-Innovations/simply-mcp-ts/blob/main/docs/guides/INTERFACE_API_REFERENCE.md) for complete documentation**

#### Option 2: Decorator API (Class-Based)

Use decorators for auto-registration:

```typescript
// server.ts
import { MCPServer, tool } from 'simply-mcp';

@MCPServer()
export default class Calculator {
  /**
   * Add two numbers
   * @param a - First number
   * @param b - Second number
   */
  @tool()
  async add(a: number, b: number) {
    return { result: a + b };
  }
}
```

> **JSDoc Integration:** JSDoc comments are automatically extracted and become tool and parameter descriptions visible to AI agents. See [Decorator API Reference](./docs/guides/DECORATOR_API_REFERENCE.md) for details.


> **Important:** The class must be exported (using `export default` or named export). Non-exported classes are never evaluated by JavaScript's module system, so decorators won't run.

#### Option 3: Functional API (Programmatic)

Programmatic control with explicit registration:

```typescript
// server.ts
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'calculator',
  version: '1.0.0'
});

server.addTool({
  name: 'add',
  description: 'Add two numbers',
  parameters: z.object({
    a: z.number(),
    b: z.number()
  }),
  execute: async ({ a, b }) => ({
    content: [{ type: 'text', text: `Sum: ${a + b}` }]
  })
});

await server.start();
```

#### Option 4: MCP Builder API (AI-Powered)

Use MCP itself to build MCP tools with AI-powered validation:

```typescript
// mcp-dev.ts
import {
  defineMCPBuilder,
  ValidationToolsPreset,
  WorkflowPromptsPreset
} from 'simply-mcp';

export default defineMCPBuilder({
  name: 'mcp-dev',
  version: '1.0.0',
  toolPresets: [ValidationToolsPreset],
  promptPresets: [WorkflowPromptsPreset]
});
```

This creates an MCP server that helps you build other MCP servers! It provides:
- **Design tools** - Interactive tool design assistance
- **AI validation** - Sampling-based validation using your LLM
- **Workflow guidance** - Best practices from Anthropic
- **Schema generation** - Automatic Zod schema creation

See [MCP Builder API Guide](#mcp-builder-api-ai-powered-tool-development) for details.

**Run any style with the same command:**

```bash
npx simply-mcp run server.ts
```

**That's all you need!** No `package.json`, no `tsconfig.json`, no configuration files. The CLI auto-detects your API style.

### Which API Should I Use?

Choose the API style that matches your preferences:

```
┌─────────────────────────────────────────┐
│ Do you want zero boilerplate?          │
│ (Just TypeScript types)                 │
└────────┬───────────────┬────────────────┘
         │ YES           │ NO
         ▼               ▼
    Interface API        │
                         │
        ┌────────────────▼─────────────────┐
        │ Do you prefer decorators?        │
        │ (@tool, @prompt syntax)          │
        └────────┬───────────────┬──────────┘
                 │ YES           │ NO
                 ▼               ▼
            Decorator API    Functional API
```

**Quick Decision Guide:**

| Choose... | If you want... |
|-----------|----------------|
| **Interface API** | Zero boilerplate, pure TypeScript types, full IntelliSense |
| **Decorator API** | Class-based organization, JSDoc-driven, auto-registration |
| **Functional API** | Maximum control, runtime flexibility, programmatic configuration |

**Smart Defaults:**
- `name`: Auto-generated from class name (Calculator -> calculator)
- `version`: Auto-detected from package.json or defaults to '1.0.0'
- `transport`: stdio (override with `--http` flag)
- `capabilities`: Automatically configured based on your tools

**Same command works for all API styles!**

### Router Tools

Organize related tools under routers to reduce tool count and improve discoverability with namespace support and statistics.

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  flattenRouters: false  // Hide router-assigned tools from main list
});

// Define tools
server.addTool({
  name: 'get_weather',
  description: 'Get current weather',
  parameters: z.object({ location: z.string() }),
  execute: async (args) => `Weather in ${args.location}: Sunny, 72°F`
});

server.addTool({
  name: 'get_forecast',
  description: 'Get weather forecast',
  parameters: z.object({ location: z.string(), days: z.number() }),
  execute: async (args) => `${args.days}-day forecast for ${args.location}`
});

server.addTool({
  name: 'get_alerts',
  description: 'Get weather alerts',
  parameters: z.object({ location: z.string() }),
  execute: async (args) => `No active alerts for ${args.location}`
});

// Create router and assign tools
server.addRouterTool({
  name: 'weather_router',
  description: 'Weather information toolkit',
  tools: ['get_weather', 'get_forecast', 'get_alerts']
});

// Get enhanced statistics
console.log(server.getStats());
// {
//   tools: 4,                    // 3 tools + 1 router
//   routers: 1,                  // weather_router
//   assignedTools: 3,            // Tools in routers
//   unassignedTools: 0,
//   prompts: 0,
//   resources: 0,
//   flattenRouters: false
// }

await server.start();
```

**Key Features:**
- **Organization** - Group 10+ tools into 2-3 routers by domain
- **Multi-router support** - One tool can belong to multiple routers
- **Namespace calling** - `weather_router__get_weather` for explicit routing
- **flattenRouters option** - Toggle tool visibility for testing vs production
- **Enhanced statistics** - Track assigned vs unassigned tools
- **Production-ready** - Used in all Simply MCP example servers

**Invocation methods:**
```typescript
// Method 1: Call router to discover tools
weather_router()
// Returns: { tools: [ { name: 'get_weather', ... }, ... ] }

// Method 2: Call tool via namespace
weather_router__get_weather({ location: 'NYC' })

// Method 3: Call tool directly (if flattenRouters=true)
get_weather({ location: 'NYC' })
```

**Use cases:**
- Servers with 5+ related tools (weather, database, API operations)
- Multi-domain systems (products, users, orders)
- Progressive tool discovery for AI models
- Reducing cognitive overhead with large tool sets
- Scaling to 100+ tools across multiple domains

See [Router Tools Guide](./docs/guides/ROUTER_TOOLS.md) for complete documentation and examples.

## CLI Usage

Simply MCP's CLI automatically detects your API style and runs your server with zero configuration.

### Basic Usage

```bash
# Run any server (auto-detects decorator/programmatic/functional API)
npx simply-mcp run server.ts
```

### With Options

```bash
# HTTP transport
npx simply-mcp run server.ts --http --port 3000

# Watch mode (auto-restart on file changes)
npx simply-mcp run server.ts --watch

# Debug mode (attach Chrome DevTools)
npx simply-mcp run server.ts --inspect

# Verbose output
npx simply-mcp run server.ts --verbose

# Multiple servers
npx simply-mcp run server1.ts server2.ts server3.ts
```

### Advanced Options

```bash
# Validate without running
npx simply-mcp run server.ts --dry-run

# Force specific API style
npx simply-mcp run server.ts --style decorator

# Use configuration file
npx simply-mcp run server.ts --config simplymcp.config.json
```

### Alternative Commands (Advanced)

For users who need explicit control over the API style:

```bash
# Explicitly use decorator API
npx simplymcp-class MyServer.ts

# Explicitly use functional API
npx simplymcp-func server.ts
```

**Note:** We recommend using `simply-mcp run` for all use cases as it auto-detects the API style and provides more features.

### Transform Existing Classes into MCP Servers

Have an existing TypeScript class? Transform it into an MCP server automatically with the **Class Wrapper Wizard**:

```bash
npx simply-mcp create
```

This launches an interactive wizard that:
1. 🔍 Analyzes your existing TypeScript class
2. 🎨 Adds `@MCPServer` and `@tool` decorators
3. 💾 Generates `{YourClass}.mcp.ts` (preserves original file)
4. ✨ Maintains 100% of your implementation code

#### Example Workflow

**1. Start the wizard:**
```bash
npx simply-mcp create
```

**2. Connect from Claude Code CLI:**
```bash
claude --mcp-config '{"mcpServers":{"wizard":{"command":"npx","args":["simply-mcp","create"]}}}'
```

**3. Say:** "Transform my WeatherService class into an MCP server"

The wizard guides Claude to:
- Ask for the file path (`./WeatherService.ts`)
- Extract class structure and methods
- Suggest server metadata (name, version)
- Mark which methods should be exposed as tools
- Preview the decorated code
- Generate `WeatherService.mcp.ts`

#### Before (Original Class)

```typescript
// WeatherService.ts
export class WeatherService {
  async getCurrentWeather(location: string, units: string) {
    return { temperature: 72, conditions: 'Sunny' };
  }

  async getForecast(location: string, days: number) {
    return { forecast: [...] };
  }
}
```

#### After (Generated MCP Server)

```typescript
// WeatherService.mcp.ts
import { MCPServer, tool } from 'simply-mcp';

@MCPServer({
  name: 'weather-service',
  version: '1.0.0',
  description: 'Weather information service'
})
export class WeatherService {
  @tool('Get current weather for a location')
  async getCurrentWeather(location: string, units: string) {
    return { temperature: 72, conditions: 'Sunny' };
  }

  @tool('Get weather forecast for multiple days')
  async getForecast(location: string, days: number) {
    return { forecast: [...] };
  }
}
```

**Run your new MCP server:**
```bash
npx simply-mcp run WeatherService.mcp.ts
```

#### Key Features

- **100% Code Preservation**: Only decorators are added, never modifies implementation
- **Type Inference**: Automatically extracts parameter types from TypeScript
- **Interactive Guidance**: Wizard provides step-by-step instructions to Claude
- **Original File Safe**: Always generates `{original}.mcp.ts`, never overwrites
- **Zero Configuration**: No setup required, works out of the box

#### HTTP Mode

Run the wizard as an HTTP server for web-based workflows:

```bash
npx simply-mcp create --http --port 3000
```

## TypeScript Configuration (Optional)

### How SimpleMCP Handles TypeScript

SimpleMCP uses [tsx](https://github.com/esbuild-kit/tsx) to run TypeScript directly with **zero configuration required**. This means:

- No compilation step needed
- Decorators work automatically
- Your `tsconfig.json` is **NOT used** at runtime
- Modern ES features supported out of the box

**Bottom line:** You can write and run TypeScript servers without any configuration files!

### Running Your Server

No configuration needed:

```bash
npx simply-mcp run server.ts
```

tsx handles all TypeScript transpilation using sensible defaults, regardless of whether you have a `tsconfig.json` or what settings it contains.

### Type Checking (Optional)

If you want IDE IntelliSense and type checking with `tsc`, you can optionally create a `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true
  }
}
```

This is completely optional and only affects:
- IDE IntelliSense and autocomplete
- `tsc --noEmit` type checking
- Build-time type errors

**It does NOT affect how SimpleMCP runs your server.**

### Module Type (Not Required)

You do NOT need to set `"type": "module"` in your `package.json`. SimpleMCP handles module resolution automatically.

```json
// package.json - module type is optional
{
  "name": "my-server",
  "scripts": {
    "dev": "simply-mcp run server.ts"
  }
}
```

### Summary

**To run your server:** Just write TypeScript and run it - zero config needed!

**For type checking:** Optionally create `tsconfig.json` for IDE support.

## Interface API Deep Dive

The Interface API is the cleanest way to define MCP servers using pure TypeScript interfaces. Here's what makes it special:

### Why Use Interface API?

**Zero Boilerplate:**
- No manual schema definitions
- No decorator setup
- Just TypeScript types!

**Full Type Safety:**
- Compile-time type checking
- Complete IntelliSense support
- Auto-generated Zod schemas from TypeScript types

**Clean Code:**
- Pure interface definitions
- No runtime overhead
- Easy to read and maintain
- Loader validates your implementations automatically — annotate parameters with `MyTool['params']` if you want compile-time hints under `noImplicitAny`.

### Clean Syntax with Direct Type Assignment

Write clean implementation code with minimal boilerplate using direct type assignment:

```typescript
// Direct type assignment - clean and type-safe!
getWeather: GetWeatherTool = async (params) => {
  return { temperature: 20, conditions: 'Sunny' };
};
```

**Features:**
- Minimal boilerplate
- Full IDE autocomplete and IntelliSense
- Parameter and return types automatically inferred
- Supports destructuring: `async ({ location, units }) => { ... }`
- Works with both sync and async methods

**Note:** For TypeScript strict mode (`strict: true`), use `ToolHandler<T>` instead:
```typescript
import type { ToolHandler } from 'simply-mcp';

getWeather: ToolHandler<GetWeatherTool> = async (params) => {
  return { temperature: 20, conditions: 'Sunny' };
};
```

[Learn more →](https://github.com/Clockwork-Innovations/simply-mcp-ts/blob/main/docs/guides/INTERFACE_API_REFERENCE.md)

### Complete Example

```typescript
import type { ITool, IParam, IPrompt, IResource, IServer } from 'simply-mcp';

// Define structured parameters with IParam (optional but recommended)
interface LocationParam extends IParam {
  type: 'string';
  description: 'City or location name';
  minLength: 1;
  maxLength: 100;
}

interface DaysParam extends IParam {
  type: 'integer';
  description: 'Number of forecast days';
  min: 1;
  max: 14;
}

// Define a tool with simple params
interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get current weather for a location';
  params: {
    location: string;                              // Simple type
    units?: 'celsius' | 'fahrenheit';             // Optional param
  };
  result: {
    temperature: number;
    conditions: string;
  };
}

// Or use IParam for richer documentation and validation
interface GetForecastTool extends ITool {
  name: 'get_forecast';
  description: 'Get weather forecast';
  params: {
    location: LocationParam;                       // IParam with validation
    days?: DaysParam;                              // IParam (optional)
  };
  result: Array<{ date: string; temp: number }>;
}

// Define a static prompt (no implementation needed!)
interface WeatherPrompt extends IPrompt {
  name: 'weather_report';
  description: 'Generate weather report';
  args: { location: string; style?: 'casual' | 'formal' };
  template: `Generate a {style} weather report for {location}.`;
}

// Define a static resource (no implementation needed!)
interface ConfigResource extends IResource {
  uri: 'config://server';
  name: 'Server Configuration';
  mimeType: 'application/json';
  data: {
    version: '1.0.0';
    features: ['weather', 'forecasts'];
  };
}

// Define a dynamic prompt (requires implementation)
interface DynamicPrompt extends IPrompt {
  name: 'context_aware';
  description: 'Context-aware weather prompt';
  args: { location: string; timeOfDay?: string };
  dynamic: true;
}

// Define a dynamic resource (requires implementation)
interface StatsResource extends IResource {
  uri: 'stats://requests';
  name: 'Request Statistics';
  mimeType: 'application/json';
  data: { count: number; lastRequest: string };
}

// Define server metadata
interface WeatherServer extends IServer {
  name: 'weather-service';
  version: '1.0.0';
  description: 'Weather information service';
}

// Implement the server
export class WeatherService {

  // Tool implementation using typed pattern - full IntelliSense on params!
  getWeather: GetWeatherTool = async (params) => {
    const temp = 72;
    return {
      temperature: params.units === 'fahrenheit' ? temp : (temp - 32) * 5/9,
      conditions: 'Sunny'
    };
  };

  // Dynamic prompt implementation - typed pattern with IntelliSense on args!
  contextAware: DynamicPrompt = (args) => {
    const time = args.timeOfDay || 'day';
    return `Generate a ${time}-time weather report for ${args.location}`;
  };

  // Dynamic resource implementation - typed pattern with return type checking!
  'stats://requests': StatsResource = () => ({
    count: 42,
    lastRequest: new Date().toISOString()
  });

  // Static prompt - no implementation needed!
  // Static resource - no implementation needed!
}
```

### Key Features

**Tools:**
- Define with `ITool` interface
- **Optional:** Use `IParam` for structured parameters with descriptions, validation, and nested objects
- TypeScript types auto-convert to Zod schemas
- Full IntelliSense on parameters and return types
- Programmatic calls to `executeTool()` now return the raw handler value by default; use `executeToolEnvelope()` when you need the MCP transport payload.

**Prompts:**
- **Static**: Define template with `{variable}` syntax
- **Dynamic**: Set `dynamic: true` and implement as method

**Resources:**
- **Static**: Define literal data directly in interface
- **Dynamic**: Implement as method using URI as property name

**Automatic Detection:**
- Framework automatically detects static vs dynamic
- No manual configuration needed

### Run It

```bash
# Auto-detection (recommended)
npx simply-mcp run weather-service.ts

# Explicit interface command
npx simplymcp-interface weather-service.ts

# With HTTP transport
npx simply-mcp run weather-service.ts --http --port 3000
```

### Learn More

See the [Interface API Reference](https://github.com/Clockwork-Innovations/simply-mcp-ts/blob/main/docs/guides/INTERFACE_API_REFERENCE.md) for complete documentation including:
- TypeScript to Zod schema conversion
- JSDoc validation tags
- Template interpolation
- Dynamic prompts and resources
- CLI reference
- Best practices

## MCP Builder API: AI-Powered Tool Development

The MCP Builder API is a unique approach: **use MCP itself to build MCP tools**. It provides an MCP server that helps you design, validate, and implement high-quality MCP tools following Anthropic's best practices.

### Why MCP Builder?

**Intelligent Validation:**
- Uses **MCP sampling** to leverage your LLM for expert feedback
- Validates against Anthropic's tool-building principles
- Provides actionable, specific suggestions

**Guided Workflow:**
- Interactive design assistance
- Automatic Zod schema generation
- Built-in best practices prompts
- Step-by-step workflow guidance

**Quality Assurance:**
- AI-powered design review (scoring 0-100)
- Schema completeness validation
- Test coverage analysis
- Iterative refinement until quality scores >= 80

### Architecture: Layered Development

The MCP Builder follows a layered architecture:

**Layer 1 (Foundation):**
- `design_tool` - Interactive tool conceptualization
- `create_zod_schema` - Generate Zod schemas from type definitions
- `validate_schema` - Basic schema validation

**Layer 2 (Feature - Sampling):**
- `analyze_tool_design` - AI reviews your design against Anthropic principles
- `validate_schema_quality` - AI validates Zod schemas for completeness
- `review_test_coverage` - AI evaluates test scenario coverage
- Workflow guidance prompts with best practices

### How It Works: MCP Sampling

Traditional validation uses hard-coded rules. MCP Builder uses **sampling** - the server requests your LLM to perform analysis:

```
┌──────────┐  1. Call tool       ┌────────────┐
│   You    │ ──────────────────> │ MCP Server │
│  (LLM)   │                     │  (Builder) │
└──────────┘                     └────────────┘
     ↑                                 │
     │                                 │ 2. Request sampling
     │ 4. Return analysis              │
     │                                 ↓
     │                           ┌──────────┐
     └─────────────────────────  │   Your   │
       3. AI analyzes            │   LLM    │
                                 └──────────┘
```

### Quick Start

**1. Create an MCP Builder server:**

```typescript
import {
  defineMCPBuilder,
  DesignToolsPreset,
  ValidationToolsPreset,
  WorkflowPromptsPreset
} from 'simply-mcp';

export default defineMCPBuilder({
  name: 'mcp-dev-complete',
  version: '1.0.0',
  toolPresets: [
    DesignToolsPreset,         // Layer 1: Design tools
    ValidationToolsPreset       // Layer 2: AI validation
  ],
  promptPresets: [
    WorkflowPromptsPreset      // Layer 2: Guidance
  ]
});
```

**2. Run it:**

```bash
npx simply-mcp run mcp-dev.ts
```

**3. Connect from Claude Code CLI and ask:**

```
"Help me create a weather tool"
```

The MCP Builder will:
1. Guide you through design (`design_tool`)
2. Generate Zod schemas (`create_zod_schema`)
3. Validate with basic checks (`validate_schema`)
4. Request AI analysis via sampling (`analyze_tool_design`)
5. Provide expert feedback: score, issues, improvements
6. Help you iterate until quality score >= 80

### Available Tools

**Design Tools (Layer 1):**
- `design_tool` - Interactive tool design with structured output
- `create_zod_schema` - Generate Zod code from type definitions
- `validate_schema` - Basic validation checks

**Validation Tools (Layer 2 - Sampling):**
- `analyze_tool_design` - AI reviews against Anthropic principles
  - Checks: Strategic selection, naming, parameter design, descriptions
  - Returns: Score (0-100), issues, improvements, readiness
- `validate_schema_quality` - AI validates Zod schemas
  - Checks: Field descriptions, validation rules, type safety, strictness
  - Returns: Score, missing elements, violations, suggestions
- `review_test_coverage` - AI evaluates test scenarios
  - Checks: Happy paths, edge cases, error conditions
  - Returns: Coverage score, gaps, suggested additional tests

### Available Prompts

- `mcp_builder_workflow` - Complete workflow explanation (2540 chars)
- `anthropic_best_practices` - Strategic selection, implementation, efficiency
- `how_to_use_sampling_tools` - Understanding sampling capability
- `zod_schema_patterns` - Common Zod patterns and best practices

### Example Workflow

```bash
# 1. Start MCP Builder server
npx simply-mcp run mcp-dev.ts

# 2. In Claude Code CLI, ask:
"Help me create a weather tool"

# 3. Claude calls design_tool:
{
  "purpose": "Get weather for a city",
  "expected_inputs": "city name, temperature units",
  "expected_outputs": "temperature, conditions"
}

# 4. Claude calls analyze_tool_design (with sampling):
# Your LLM analyzes the design and returns:
{
  "score": 85,
  "issues": [],
  "improvements": [
    "Consider adding country parameter for disambiguation",
    "Add humidity and wind speed to outputs"
  ],
  "ready": true
}

# 5. Claude refines based on feedback
# 6. Claude generates final implementation
```

### Builder Pattern API

For advanced usage, use the builder pattern:

```typescript
import { createMCPBuilder } from 'simply-mcp';

export default createMCPBuilder({
  name: 'mcp-dev-custom',
  version: '1.0.0'
})
  .useToolPreset(DesignToolsPreset)
  .useToolPreset(ValidationToolsPreset)
  .usePromptPreset(WorkflowPromptsPreset)
  .addTool({
    name: 'custom_validator',
    description: 'My custom validation tool',
    parameters: z.object({ code: z.string() }),
    execute: async (args) => 'Custom validation result'
  })
  .withPort(3000)
  .build();
```

### Anthropic Principles Built-In

The validation tools check against Anthropic's research on building tools for AI agents:

1. **Strategic Selection** - Is this tool necessary?
2. **Clear Naming** - Use snake_case, descriptive names
3. **Thoughtful Implementation** - Clear descriptions, proper types
4. **Token Efficiency** - Focused scope, relevant information
5. **Flexible Formats** - Support multiple output formats

### Testing

See the complete test suite:

```bash
npx tsx test-mcp-builder.ts
```

Tests verify:
- ✅ Tool registration (6 tools)
- ✅ Prompt registration (4 prompts)
- ✅ Design tools functionality
- ✅ Validation tools (basic + sampling)
- ✅ Complete workflow simulation
- ✅ Error handling

### Learn More

- [MCP Builder API Reference](./docs/guides/MCCPBUILDER_API_REFERENCE.md) - Complete guide
- [Example Servers](./examples/) - Working examples

## Documentation

### Core Guides
- [Quick Start](./docs/guides/QUICK_START.md) - Get started in 5 minutes
- [Interface API Reference](https://github.com/Clockwork-Innovations/simply-mcp-ts/blob/main/docs/guides/INTERFACE_API_REFERENCE.md) - Complete Interface API documentation
- [Decorator API Reference](./docs/guides/DECORATOR_API_REFERENCE.md) - Using decorators
- [Import Style Guide](./docs/development/IMPORT_STYLE_GUIDE.md) - Import patterns and best practices
- [Configuration Guide](./docs/guides/CONFIGURATION.md) - Environment and runtime options
- [Documentation Index](./docs/README.md) - Complete documentation map with all guides organized by topic

### Advanced Topics
- [Context System](./src/docs/guides/CONTEXT-SYSTEM.md) - Access server metadata, session methods, and request context
- [Lifecycle Management](./src/docs/guides/LIFECYCLE-MANAGEMENT.md) - Resource initialization and cleanup with lifecycle hooks
- [Bundling Guide](./docs/guides/BUNDLING.md) - Production bundling and deployment
- [Performance Guide](./docs/guides/PERFORMANCE_GUIDE.md) - Optimization techniques
- [Deployment Guide](./docs/guides/DEPLOYMENT_GUIDE.md) - Deploy MCP servers
- [Error Handling](./docs/guides/ERROR_HANDLING.md) - Comprehensive error handling
- [Testing Guide](./docs/guides/TESTING.md) - Testing MCP servers
- [Transport Guide](./docs/guides/TRANSPORT_GUIDE.md) - Transport options (Stdio, HTTP)

### Additional Resources
- [CLI Reference](./docs/guides/CLI_REFERENCE.md) - All CLI commands and options
- [Watch Mode Guide](./docs/guides/WATCH_MODE_GUIDE.md) - Auto-reload during development
- [Dry-Run Guide](./docs/guides/DRY_RUN_GUIDE.md) - Validate without running
- [Class Wrapper Guide](./docs/guides/CLASS_WRAPPER_GUIDE.md) - Transform classes to MCP servers

## Architecture

```
simply-mcp/
├── src/
│   ├── api/
│   │   ├── programmatic/      # BuildMCPServer (core API)
│   │   ├── mcp/               # MCP Builder & Class Wrapper
│   │   ├── interface/         # Interface API
│   │   └── functional/        # Functional API
│   ├── decorators.ts          # Decorator API
│   ├── cli/                   # CLI tools
│   ├── core/                  # Core utilities (bundler, etc.)
│   ├── handlers/              # Handler resolvers
│   ├── servers/               # Transport implementations
│   ├── security/              # Security features
│   └── validation/            # Input validation
├── examples/                  # Example servers
├── tests/                     # Test suite
└── docs/                      # Documentation
```

## Transport Comparison

| Feature | Stdio | HTTP Stateful | HTTP Stateless |
|---------|-------|---------------|----------------|
| Session | Per-process | Header-based | None |
| Use Case | CLI tools | Web apps, workflows | Serverless, APIs |
| Streaming | No | Yes (SSE) | No |
| State | In-process | Across requests | None |
| Complexity | Low | Medium | Low |

## Examples

**All 27 production examples are validated automatically on every push/PR:**
- See [Examples Index](./examples/EXAMPLES_INDEX.md) for complete list
- Run validation: `npm run test:examples`
- View report: `examples-validation-report.md`

### Configuration-Based Server

```typescript
import { BuildMCPServer } from 'simply-mcp';
import config from './config.json';

(async () => {
  const server = new BuildMCPServer(config);
  await server.start();
})().catch(console.error);
```

### HTTP Server with Sessions

```typescript
const server = new BuildMCPServer({
  name: 'api-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: 3000,
    stateful: true  // Default
  }
});

// Add tools...

// Start the server (uses configuration from constructor)
await server.start();

// Or override port at start time
// await server.start({ port: 3001 });
```

### Stateless HTTP for Serverless

```typescript
const server = new BuildMCPServer({
  name: 'lambda-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: 3000,
    stateful: false  // Stateless for serverless
  }
});

// Add tools...

// Start stateless HTTP server (perfect for AWS Lambda, Cloud Functions)
await server.start();
```

**When to use each mode:**

**Stateful Mode** (default):
- Web applications with user sessions
- Multi-step workflows requiring context
- Real-time updates via SSE
- Long-running conversations

**Stateless Mode**:
- AWS Lambda / Cloud Functions
- Serverless deployments
- Stateless microservices
- Simple REST-like APIs
- Load-balanced services without sticky sessions

### Resource Handler

```typescript
const config = { key: 'value' };

server.addResource({
  uri: 'file://data/config',
  name: 'config',
  description: 'Server configuration',
  mimeType: 'application/json',
  content: JSON.stringify(config, null, 2)
});
```

## Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run example validation (validates all 27 production examples)
npm run test:examples

# Run specific test suite
bash tests/test-stdio.sh
bash tests/test-decorators.sh

# Run with coverage
npm run test:unit:coverage
```

**CI/CD Pipeline:**
- ✅ Unit tests + Examples validation: **Required** (blocks PRs on failure)
- ⚠️ Integration tests: Informational (non-blocking)

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run examples
npx simply-mcp run examples/simple-server.ts

# Test your changes
npm run test:unit          # Run unit tests
npm run test:examples      # Validate all examples
npm run test:unit:watch    # Watch mode for tests
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./.github/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/simply-mcp-ts.git`
3. Create a branch: `git checkout -b feature/amazing-feature`
4. Make your changes
5. Run tests: `npm test`
6. Commit: `git commit -m 'Add amazing feature'`
7. Push: `git push origin feature/amazing-feature`
8. Open a Pull Request

## License

MIT © [Nicholas Marinkovich, MD](https://cwinnov.com)

## Links

- [NPM Package](https://www.npmjs.com/package/simply-mcp)
- [GitHub Repository](https://github.com/Clockwork-Innovations/simply-mcp-ts)
- [Issue Tracker](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)
- [Changelog](./CHANGELOG.md)

## Support

- 📖 [Documentation](./src/docs/INDEX.md)
- 💬 [Discussions](https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions)
- 🐛 [Issue Tracker](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)

## Acknowledgments

Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk) by Anthropic.

---

**Made with ❤️ by the Simply MCP Team**
