# MCP Features Guide

Complete guide to implementing tools, prompts, and resources in Simply MCP.

---

## Table of Contents

- [Transports](#transports) - Communication protocols for your server
  - [WebSocket Transport](#websocket-transport) - Real-time bidirectional communication
  - [HTTP Transport](#http-transport) - RESTful server with SSE streaming
  - [Stdio Transport](#stdio-transport) - Standard input/output communication
- [Tools](#tools) - Functions your server can perform
  - [Tool Annotations](#tool-annotations) - Metadata hints about tool behavior
  - [Batch Processing](#batch-processing) - Process multiple tool calls atomically with DoS protection
- [Prompts](#prompts) - Template generators for LLM interactions
- [Resources](#resources) - Static and dynamic data exposure
  - [Audio Resources](#audio-resources) - Native audio content support
- [MCP Protocol Features](#mcp-protocol-features) - Advanced server-client capabilities
  - [Sampling](#sampling) - LLM integration for servers
  - [Elicitation](#elicitation) - User input collection
  - [Roots](#roots) - Filesystem discovery
  - [Completions](#completions) - Argument autocomplete
  - [Progress](#progress) - Long-running operation tracking
- [React Hooks Adapter](#react-hooks-adapter) - Client-side integration
- [UI Resources](#ui-resources) - Interactive UI components
- [Authentication](#authentication) - Secure your MCP server
  - [API Key Authentication](#api-key-authentication) - Simple key-based auth
  - [OAuth 2.1 Authentication](#oauth-21-authentication) - Industry-standard OAuth

---

# Transports

Simply-MCP supports multiple communication protocols to connect your server with clients.

## WebSocket Transport

**Available since:** v4.0.0

Real-time, bidirectional communication with automatic reconnection and low latency.

### Overview

WebSocket transport provides persistent connections for interactive applications requiring real-time updates. It's ideal for chat applications, live dashboards, collaborative tools, and any scenario requiring push notifications.

**Key Benefits:**
- **Low latency**: ~10-30ms vs ~50-100ms for SSE
- **Bidirectional**: Server can push updates without polling
- **Automatic reconnection**: Exponential backoff retry logic
- **Heartbeat mechanism**: Built-in ping/pong for connection health
- **Multiple clients**: Handle many concurrent connections efficiently

### Configuration

```typescript
import type { IServer } from 'simply-mcp';

interface MyServer extends IServer {
  name: 'websocket-server';
  version: '1.0.0';
  transport: 'websocket';
  websocket: {
    port: 8080;
    heartbeatInterval?: 30000;      // Ping interval (default: 30s)
    heartbeatTimeout?: 5000;        // Pong timeout (default: 5s)
    maxMessageSize?: 10485760;      // Max message size (default: 10MB)
  };
}
```

### Client Connection

```typescript
import { WebSocketClient } from 'simply-mcp/client';

const client = new WebSocketClient('ws://localhost:8080');

// Connect with automatic reconnection
await client.connect();

// Call tools
const result = await client.callTool('greet', { name: 'World' });

// Subscribe to resource updates
client.on('resourceUpdated', (uri) => {
  console.log(`Resource ${uri} was updated`);
});

// Cleanup
await client.disconnect();
```

### Features

**Connection Management:**
- Automatic reconnection with exponential backoff (1s, 2s, 4s, 8s, 16s max)
- Graceful degradation on network failures
- Connection state tracking (connecting, connected, disconnected, reconnecting)

**Heartbeat Monitoring:**
- Configurable ping/pong intervals
- Automatic connection recovery on timeout
- Prevents zombie connections

**Message Size Limits:**
- Configurable maximum message size
- Prevents memory exhaustion attacks
- Default: 10MB per message

**See working examples:** [examples/interface-websocket.ts](../../examples/interface-websocket.ts)

---

## HTTP Transport

**Available since:** v1.0.0

RESTful HTTP server with Server-Sent Events (SSE) for streaming responses.

### Stateful HTTP (Default)

Session-based communication with cookie management:

```typescript
interface MyServer extends IServer {
  name: 'http-server';
  transport: 'http';
  http: {
    port: 3000;
  };
  stateful: true;  // Default: enables sessions
}
```

**Features:**
- Session management with cookies
- Server-Sent Events (SSE) for streaming
- Built-in middleware support
- OAuth and API key authentication

**Best For:** Web applications, traditional APIs, OAuth flows

### Stateless HTTP

Serverless-optimized transport without session state:

```typescript
interface MyServer extends IServer {
  name: 'serverless-api';
  transport: 'http-stateless';
  http: { port: 3000 };
}
```

**Best For:** AWS Lambda, Vercel, serverless deployments

---

## Stdio Transport

**Available since:** v1.0.0

Standard input/output communication for CLI integration.

```typescript
interface MyServer extends IServer {
  name: 'stdio-server';
  transport: 'stdio';  // Default
}
```

**Features:**
- Zero configuration required
- No network dependencies
- Direct process communication
- JSON-RPC over stdio streams

**Best For:** CLI tools, desktop integrations, development

---

# Tools

Functions that your server can perform - what the LLM can ask it to do.

**Implementation requirement:** ✅ **ALL TOOLS REQUIRE IMPLEMENTATION**

Every tool you define must have a corresponding implementation method in your server class.

**See working examples:** [examples/interface-advanced.ts](../../examples/interface-advanced.ts)

## Basic Tool

A tool is defined using a TypeScript interface that extends `ITool`:

```typescript
import type { ITool, IServer, IParam } from 'simply-mcp';

interface NameParam extends IParam {
  type: 'string';
  description: 'Person to greet';
}

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Say hello to someone';
  params: {
    name: NameParam;
  };
  result: {
    greeting: string;
  };
}

const server: IServer = {
  name: 'my-server',
  version: '1.0.0',
  description: 'Example server'
}

export default class MyServer {
  greet: GreetTool = async (params) => {
    return {
      greeting: `Hello, ${params.name}!`
    };
  };
}
```

**Key Benefits:**
- Full type safety with IntelliSense
- Auto-generated schemas from TypeScript types
- Compile-time validation
- No schema boilerplate

## Method Naming Conventions

Tool names in snake_case are converted to camelCase for methods:

| Interface Name | Implementation Method |
|----------------|----------------------|
| `get_weather` | `getWeather` |
| `search_documents` | `searchDocuments` |
| `greet` | `greet` |

**Example:**

```typescript
interface GetWeatherTool extends ITool {
  name: 'get_weather';  // snake_case
  description: 'Get current weather';
  params: { location: LocationParam };
  result: { temperature: number };
}

export default class MyServer {
  // Implementation method MUST be camelCase
  getWeather: GetWeatherTool = async (params) => {
    return { temperature: 22 };
  };
}
```

---

## Tool Routers

Organize tools into logical groups and reduce context clutter by hiding tools until needed.

### Quick Example

```typescript
interface WeatherRouter extends IToolRouter {
  description: 'Weather tools';
  tools: [GetWeatherTool, GetForecastTool];
}

interface MyServer extends IServer {
  flattenRouters: false;  // Hide router tools from main list
}
```

**Result:**
- Main tools list shows only `weather_router`
- Call `weather_router` to discover available tools
- Call tools via `weather_router__get_weather`

### Use Cases

**1. Large Tool Sets**
```typescript
// Group 20+ API endpoints into logical routers
interface UsersRouter extends IToolRouter {
  tools: [CreateUser, GetUser, UpdateUser, DeleteUser, ListUsers, /* ... */];
}

interface ProductsRouter extends IToolRouter {
  tools: [CreateProduct, GetProduct, UpdateProduct, DeleteProduct, /* ... */];
}
```

**2. Context Management**
```typescript
// Hide advanced tools until needed
interface BasicToolsRouter extends IToolRouter {
  tools: [GetData, SaveData];
}

interface AdvancedToolsRouter extends IToolRouter {
  tools: [AnalyzeData, TransformData, ExportData, ImportData];
}
```

**3. Permission Boundaries**
```typescript
// Separate admin tools from user tools
interface AdminRouter extends IToolRouter {
  tools: [CreateUser, DeleteUser, ViewAuditLog];
}

interface UserRouter extends IToolRouter {
  tools: [ViewProfile, UpdateProfile];
}
```

### How It Works

**Step 1: Client calls `tools/list`**
```json
{
  "tools": [
    {
      "name": "weather_router",
      "description": "Weather information tools",
      "inputSchema": { "type": "object", "properties": {} }
    }
  ]
}
```

**Step 2: Client calls the router**
```
Request: weather_router()

Response:
{
  "tools": [
    {
      "name": "get_weather",
      "description": "Get current weather",
      "inputSchema": { /* ... */ }
    },
    {
      "name": "get_forecast",
      "description": "Get weather forecast",
      "inputSchema": { /* ... */ }
    }
  ]
}
```

**Step 3: Client calls individual tool**
```
Request: weather_router__get_weather({ location: "Seattle" })

Response: { temperature: 72, conditions: "Sunny" }
```

### Configuration

**flattenRouters: false (Recommended)**
- Hides router-assigned tools from main list
- Cleaner context, better for production

**flattenRouters: true**
- Shows all tools in main list
- Better for development and testing

```typescript
interface MyServer extends IServer {
  flattenRouters: false;  // or true
}
```

### Complete Documentation

- [Router Tools Guide](./ROUTER_TOOLS.md) - Complete guide
- [API Reference - IToolRouter](./API_REFERENCE.md#itoolrouter) - Interface documentation

---

## Tool Annotations

**Available since:** v4.1.0

Tool annotations provide metadata hints about tool behavior to help MCP clients make informed decisions about tool usage.

### Overview

Annotations are optional metadata fields you can add to tool interfaces to indicate:
- **Safety characteristics** - Whether a tool is read-only, destructive, or idempotent
- **User interaction** - Whether confirmation is required before execution
- **Categorization** - Logical grouping of tools by domain
- **Performance hints** - Expected execution duration

### MCP Standard Annotations

These annotations align with the MCP protocol specification:

- `readOnlyHint` - Tool only reads data, makes no modifications
- `destructiveHint` - Tool modifies or deletes data
- `idempotentHint` - Tool can be safely called multiple times with same result
- `openWorldHint` - Tool may return different results based on external state
- `title` - Human-readable display name for the tool

### Simply-MCP Extensions

Additional annotations specific to Simply-MCP:

- `requiresConfirmation` - Tool requires explicit user confirmation before execution
- `category` - Logical category for tool organization (e.g., 'data', 'system', 'communication')
- `estimatedDuration` - Expected execution time: `'fast'`, `'medium'`, or `'slow'`

### Usage Example

```typescript
import type { ITool, IParam } from 'simply-mcp';

interface UserIdParam extends IParam {
  type: 'string';
  description: 'User ID';
}

interface DeleteUserTool extends ITool {
  name: 'delete_user';
  description: 'Permanently delete a user account';
  params: { userId: UserIdParam };
  result: boolean;

  // Annotations provide metadata about tool behavior
  annotations: {
    title: 'Delete User Account';
    destructiveHint: true;           // Modifies/deletes data
    requiresConfirmation: true;      // Requires user confirmation
    category: 'system';              // Logical grouping
    estimatedDuration: 'medium';     // Performance hint
  };
}

export default class MyServer {
  deleteUser: DeleteUserTool = async ({ userId }) => {
    // Implementation
    return true;
  };
}
```

### Custom Metadata

You can add custom metadata fields using the index signature:

```typescript
annotations: {
  readOnlyHint: true;
  category: 'data';

  // Custom fields for your application
  version: '2.0',
  experimental: true,
  author: 'Team Name'
}
```

### Validation Rules

Annotations are validated at parse time (dry-run):

1. **Mutual Exclusivity** - A tool cannot be both `readOnlyHint: true` and `destructiveHint: true`
2. **Enum Values** - `estimatedDuration` must be `'fast'`, `'medium'`, or `'slow'`
3. **Type Safety** - Boolean fields must be booleans, string fields must be strings

Invalid annotations will produce clear error messages during dry-run.

### Backward Compatibility

Annotations are completely optional. Tools without annotations work exactly as before with no warnings or errors.

### See Also

- [API Reference - IToolAnnotations](./API_REFERENCE.md#itoolannotations)
- [Example: interface-tool-annotations.ts](../../examples/interface-tool-annotations.ts)

---

## Batch Processing

Simply-MCP supports JSON-RPC 2.0 batch requests for high-throughput operations with sequential and parallel processing modes.

### Overview

Batch processing allows clients to send multiple requests in a single JSON-RPC message, receiving all responses together. This significantly reduces network overhead and improves throughput.

**Key Benefits:**
- **5x throughput improvement** in parallel mode (940 vs 192 req/sec)
- **Minimal overhead**: Only 1.9% compared to individual requests
- **Order preservation**: Sequential mode maintains request order
- **Concurrent execution**: Parallel mode processes independent requests simultaneously
- **Batch context awareness**: Tools can access batch metadata for resource optimization

**Availability:** ✅ Built-in transport feature (requires explicit enablement)

**See working examples:**
- [interface-batch-requests.ts](../../examples/interface-batch-requests.ts) - Complete sequential and parallel examples
- [batch-performance.test.ts](../../tests/performance/batch-performance.test.ts) - Performance benchmarks

### Modes

#### Sequential Mode

Processes requests in order, one after another. Use when order matters:

- Database record imports (referential integrity)
- State machine transitions
- Migration scripts
- Any operation where later requests depend on earlier ones

**Configuration:**
```typescript
import { BuildMCPServer } from 'simply-mcp';

const server = new BuildMCPServer({
  name: 'my-server',
  batching: {
    enabled: true,
    parallel: false,     // Sequential processing
    maxBatchSize: 50     // Optimal for sequential
  }
});
```

**Performance:** ~192 req/sec

#### Parallel Mode

Processes requests concurrently for maximum throughput. Use for independent operations:

- Data exports
- Analytics queries
- Bulk reads
- Any operation where requests don't depend on each other

**Configuration:**
```typescript
import { BuildMCPServer } from 'simply-mcp';

const server = new BuildMCPServer({
  name: 'my-server',
  batching: {
    enabled: true,
    parallel: true,      // Parallel processing (5x faster)
    maxBatchSize: 100    // Optimal for parallel
  }
});
```

**Performance:** ~940 req/sec (5x faster)

### Use Cases

#### Bulk Data Import (Sequential)

```javascript
// Client sends batch of import requests
const batchRequest = [
  {"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"import_record","arguments":{"record":1}}},
  {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"import_record","arguments":{"record":2}}},
  // ... more records
];

// Server processes in order, maintaining data integrity
```

#### Bulk Data Export (Parallel)

```javascript
// Client sends batch of export requests
const batchRequest = [
  {"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"export_record","arguments":{"id":"A"}}},
  {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"export_record","arguments":{"id":"B"}}},
  // ... more records
];

// Server processes concurrently for 5x faster completion
```

### Batch Context

Tools can access batch metadata to optimize behavior:

```typescript
server.addTool({
  name: 'process_with_resources',
  description: 'Process item with batch-aware resource management',
  parameters: z.object({
    item_id: z.string()
  }),
  execute: async (params, context) => {
    if (context?.batch) {
      const { index, size, parallel } = context.batch;

      // First request in batch - initialize resources
      if (index === 0) {
        console.log('Initializing batch resources...');
        initializeResourcePool();
      }

      // Track progress
      console.log(`Processing ${index + 1}/${size} (${parallel ? 'parallel' : 'sequential'})`);

      // Last request in batch - cleanup
      if (index === size - 1) {
        console.log('Cleaning up batch resources...');
        cleanupResourcePool();
      }
    }

    // Tool logic here
    return { content: [{ type: 'text', text: 'Processed' }] };
  }
});
```

**Batch Context Interface:**

```typescript
interface BatchContext {
  size: number;         // Total requests in batch
  index: number;        // Position in batch (0-based)
  parallel: boolean;    // Processing mode
  batchId?: string;     // Unique batch identifier (Feature Layer)
  startTime?: number;   // Batch start timestamp (Feature Layer)
  elapsedMs?: number;   // Time elapsed since start (Feature Layer)
}
```

### Best Practices

1. **Choose the right mode:**
   - Sequential: Order-dependent operations
   - Parallel: Independent operations (5x faster)

2. **Optimal batch sizes:**
   - Sequential: 20-50 requests
   - Parallel: 50-100 requests
   - Beyond 100: Split into multiple batches

3. **Error handling:**
   - Individual request failures don't stop the batch
   - Check each response for errors
   - Failed requests return JSON-RPC error objects

4. **DoS prevention:**
   - Set `maxBatchSize` (recommended: 100)
   - Implement rate limiting on client side
   - Monitor batch processing latency

5. **Resource management:**
   - Use batch context to initialize/cleanup resources
   - First request: allocate resources
   - Last request: cleanup resources
   - Avoid per-request resource allocation

### Performance

Measured on test hardware with 50ms simulated operation time:

| Batch Size | Sequential | Parallel | Speedup |
|-----------|-----------|----------|---------|
| 10        | ~52ms     | ~53ms    | 10x     |
| 50        | ~57ms     | ~55ms    | 45x     |
| 100       | ~61ms     | ~60ms    | 83x     |

**Throughput:**
- Sequential: 192 requests/second
- Parallel: 940 requests/second (5x improvement)

**Overhead:** 1.9% (minimal impact)

**Batch vs Individual:**
- 10 individual requests: ~513ms total
- 1 batch of 10 (parallel): ~53ms total
- Speedup: 9.68x with batching

### Configuration Reference

```typescript
interface BatchingConfig {
  enabled?: boolean;        // Enable batch processing (default: true)
  parallel?: boolean;       // Process concurrently (default: false)
  maxBatchSize?: number;    // Maximum requests per batch (default: 100)
  timeout?: number;         // Batch timeout in ms (optional)
}
```

**Configuration Fields:**

- **`enabled`**: Enable/disable batch processing (default: `true`)
- **`parallel`**: Process requests concurrently for 5x faster throughput (default: `false`)
- **`maxBatchSize`**: Maximum number of requests per batch (default: `100`, recommended max: `1000`)
- **`timeout`**: Maximum execution time in milliseconds for entire batch (optional)

### DoS Prevention

Batch processing includes built-in protection against resource exhaustion:

**1. Batch Size Limiting:**

The `maxBatchSize` parameter prevents excessively large batches:

```typescript
batching: {
  maxBatchSize: 100,  // Recommended for production
  // High-throughput systems: up to 1000
  // Resource-constrained: 50 or less
}
```

Prevents:
- Memory exhaustion from thousands of concurrent requests
- Stack overflow from deeply nested batch structures
- CPU exhaustion from queuing excessive batches

**2. Timeout Enforcement:**

The `timeout` parameter enforces a strict execution deadline:

```typescript
batching: {
  timeout: 60000,  // 60 seconds
  // API-heavy operations: 120000 (120s)
  // Compute-intensive: 30000 (30s)
}
```

Prevents:
- Infinite loops or stuck processes
- Slow algorithmic attacks
- Resource starvation
- Cascading timeouts

**Environment-Specific Configurations:**

```typescript
// Development server - permissive settings
batching: {
  enabled: true,
  parallel: true,
  maxBatchSize: 1000,
  timeout: 60000,
}

// Production server - conservative settings
batching: {
  enabled: true,
  parallel: true,
  maxBatchSize: 100,
  timeout: 30000,
}

// Resource-constrained server - restrictive settings
batching: {
  enabled: true,
  parallel: false,  // Sequential to reduce peak memory
  maxBatchSize: 25,
  timeout: 15000,
}
```

### Error Handling

Individual request failures don't affect other requests in the batch:

```typescript
// Batch response with partial failures
[
  { jsonrpc: '2.0', id: 1, result: { /* success */ } },
  { jsonrpc: '2.0', id: 2, error: { code: -32000, message: 'Timeout' } },
  { jsonrpc: '2.0', id: 3, result: { /* success */ } }
]
```

Clients should check each response individually for errors.

**See Also:**
- [API Reference - Batch Processing](./API_REFERENCE.md#batch-processing-configuration) - Complete configuration reference
- [Protocol Guide - JSON-RPC Batch](./PROTOCOL.md#json-rpc-20-batch-requests) - Protocol details

---

# Prompts

Pre-defined templates that help structure LLM interactions.

**Implementation requirement:** ✅ **All prompts require implementation** - they are functions that generate content

**See working examples:** [examples/interface-advanced.ts](../../examples/interface-advanced.ts)

## IPrompt Interface with Type Inference

All prompts extend `IPrompt` with automatic type inference:

```typescript
interface IPrompt<TArguments = Record<string, IPromptArgument>> {
  name: string;          // Prompt name (snake_case)
  description: string;   // What the prompt does
  args: TArguments;      // Single source of truth for argument types
}

interface IPromptArgument {
  description?: string;
  type?: 'string' | 'number' | 'boolean';  // Defaults to 'string'
  required?: boolean;                       // Defaults to true
  enum?: readonly string[];
}
```

**Return types:**
- `string` - Simple text response
- `SimpleMessage[]` - Multi-turn conversation (recommended)
- `PromptMessage[]` - Advanced message format

## Basic Prompt with Type Inference

```typescript
interface GreetPrompt extends IPrompt {
  name: 'greet';
  description: 'Greet someone';
  args: {
    name: { description: 'Person name' };  // string, required (defaults)
    formal: {
      type: 'boolean';
      required: false;
    };
  };
}

class MyServer {
  greet: GreetPrompt = (args) => {
    // args.name → string
    // args.formal → boolean | undefined
    const greeting = args.formal ? 'Good day' : 'Hello';
    return `${greeting}, ${args.name}!`;
  };
}
```

## Multi-Turn Conversations

Use `SimpleMessage[]` for interactive conversations:

```typescript
interface ConversationPrompt extends IPrompt {
  name: 'discuss_topic';
  description: 'Have a conversation about a topic';
  args: {
    topic: { description: 'Topic to discuss' };
  };
}

class MyServer {
  discussTopic: ConversationPrompt = (args): SimpleMessage[] => [
    { user: `Let's discuss ${args.topic}` },
    { assistant: `I'd be happy to discuss ${args.topic}. What would you like to know?` },
    { user: 'Tell me the key concepts' }
  ];
}
```

---

# Resources

Data that your server exposes to clients (config, logs, files, etc.)

**Implementation requirement:**
- ❌ **Static resources** (literal `value` field): No implementation needed
- ✅ **Dynamic resources** (type definitions in `returns` field): Implementation required

**See working examples:** [examples/interface-advanced.ts](../../examples/interface-advanced.ts)

## IResource Interface

```typescript
interface IResource {
  uri: string;                    // Unique identifier (e.g., 'config://app')
  name: string;                   // Human-readable name
  description?: string;           // Optional context
  mimeType: string;               // Content type
  value?: any;                    // Static: literal data
  returns?: any;                  // Dynamic: type definition
}
```

## Quick Decision: Static or Dynamic?

```
Is your data known at compile-time?
├─ YES → Use `value` field (STATIC - no implementation)
└─ NO  → Use `returns` field (DYNAMIC - needs implementation)
```

## Static Resources

Literal data known at compile-time - framework serves it directly:

```typescript
interface ConfigResource extends IResource {
  uri: 'config://app';
  name: 'Application Configuration';
  mimeType: 'application/json';
  value: {
    version: '1.0.0';
    features: ['auth', 'logging'];
  };
}

// No implementation needed - data extracted from interface
```

## Dynamic Resources

Runtime-generated data that needs implementation:

```typescript
interface StatsResource extends IResource {
  uri: 'stats://server';
  name: 'Server Statistics';
  mimeType: 'application/json';
  returns: {
    uptime: number;
    requests: number;
  };
}

const server: IServer = {
  name: 'my-server',
  version: '1.0.0',
  description: 'Example server'
}

export default class MyServer {
  // Method name matches URI
  'stats://server': StatsResource = async () => {
    return {
      uptime: Math.floor(process.uptime()),
      requests: requestCounter.get()
    };
  };
}
```

## Binary Content

Resources support binary data (images, PDFs, audio):

```typescript
import fs from 'fs/promises';

interface LogoResource extends IResource {
  uri: 'image://logo';
  name: 'Company Logo';
  mimeType: 'image/png';
  returns: { blob: string };  // Base64-encoded
}

export default class MyServer {
  'image://logo': LogoResource = async () => {
    const data = await fs.readFile('./logo.png');
    return {
      blob: data.toString('base64')
    };
  };
}
```

---

## Audio Resources

**Available since:** v4.2.0

Native support for audio content with rich metadata through `IAudioContent` interface.

### Key Features

- Type-safe audio with `IAudioContent` and `IAudioMetadata` interfaces
- `createAudioContent()` helper for file loading
- Standard formats: MP3, WAV, OGG, FLAC, AAC, M4A, WebM
- Base64 encoding with automatic MIME type detection
- Static (embedded) or dynamic (runtime-loaded) resources

### Quick Example

```typescript
import { createAudioContent } from 'simply-mcp/core';
import type { IResource, IAudioContent } from 'simply-mcp';

interface PodcastResource extends IResource {
  uri: 'audio://podcast';
  name: 'Podcast Episode';
  mimeType: 'audio/mp3';
  returns: IAudioContent;
}

export default class MyServer {
  'audio://podcast' = async (): Promise<IAudioContent> => {
    const audio = await createAudioContent('./episode.mp3');

    return {
      ...audio,
      metadata: {
        duration: 3600,       // 1 hour
        sampleRate: 48000,    // 48kHz
        channels: 2,          // Stereo
        bitrate: 192,         // 192 kbps
        codec: 'mp3'
      }
    };
  };
}
```

### Interfaces

```typescript
interface IAudioContent {
  type: 'audio';
  data: string;              // Base64-encoded
  mimeType: string;          // e.g., 'audio/mpeg', 'audio/wav'
  metadata?: IAudioMetadata;
}

interface IAudioMetadata {
  duration?: number;         // Seconds
  sampleRate?: number;       // Hz (44100, 48000, etc.)
  channels?: number;         // 1=mono, 2=stereo
  bitrate?: number;          // kbps
  codec?: string;            // 'mp3', 'aac', 'flac', etc.
  size?: number;             // Bytes
}
```

### See Also

- [API Reference - IAudioContent](./API_REFERENCE.md#iaudiocontent) - Complete interface documentation
- [API Reference - IAudioMetadata](./API_REFERENCE.md#iaudiometadata) - Metadata field reference
- [Example: interface-audio-resource.ts](../../examples/interface-audio-resource.ts) - Working code examples

---

# MCP Protocol Features

Advanced server-client communication capabilities beyond basic tools, prompts, and resources.

## Sampling

**Available since:** v3.0.0

Enable your MCP server to call the client's LLM for generation, allowing servers to leverage AI capabilities.

### Overview

Sampling allows your server to send prompts to the client's LLM and receive generated responses. This enables powerful patterns like:
- Servers that use AI to process data
- Multi-step reasoning workflows
- Code generation within tools
- Interactive dialogue management

### Usage

```typescript
import type { ITool, IParam } from 'simply-mcp';

interface QueryParam extends IParam {
  type: 'string';
  description: 'User query to analyze';
}

interface AnalyzeTool extends ITool {
  name: 'analyze_with_ai';
  description: 'Analyze user query using LLM';
  params: { query: QueryParam };
  result: { analysis: string };
}

export default class MyServer {
  analyzeWithAi: AnalyzeTool = async (params, context) => {
    // Request LLM sampling from client
    const result = await context.sample({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze this query: ${params.query}`
          }
        }
      ],
      maxTokens: 500
    });

    return {
      analysis: result.content.text
    };
  };
}
```

### Configuration

Enable sampling in your server interface:

```typescript
interface MyServer extends IServer {
  name: 'ai-server';
  sampling: {
    enabled: true;
  };
}
```

---

## Elicitation

**Available since:** v3.0.0

Request user input during tool execution for interactive workflows.

### Overview

Elicitation allows your tools to pause execution and request additional information from the user. Perfect for:
- Multi-step wizards
- Confirmation dialogs
- Dynamic form collection
- Interactive CLI tools

### Usage

```typescript
interface DeployTool extends ITool {
  name: 'deploy_app';
  description: 'Deploy application with confirmation';
  params: { appName: AppNameParam };
  result: { status: string };
}

export default class MyServer {
  deployApp: DeployTool = async (params, context) => {
    // Request user confirmation
    const confirmation = await context.elicitInput({
      prompt: `Deploy ${params.appName} to production?`,
      fields: [
        {
          name: 'confirm',
          type: 'boolean',
          description: 'Confirm deployment',
          required: true
        }
      ]
    });

    if (!confirmation.confirm) {
      return { status: 'Deployment cancelled' };
    }

    // Proceed with deployment
    return { status: 'Deployed successfully' };
  };
}
```

---

## Roots

**Available since:** v3.0.0

Discover accessible filesystem roots from the client.

### Overview

Roots allow your server to discover which directories the client has access to. Useful for:
- File operation tools
- Project-based tools
- Workspace management
- Path validation

### Usage

```typescript
interface ListProjectsTool extends ITool {
  name: 'list_projects';
  description: 'List available projects';
  params: {};
  result: { projects: string[] };
}

export default class MyServer {
  listProjects: ListProjectsTool = async (params, context) => {
    // Get accessible roots from client
    const roots = await context.listRoots();

    const projects = roots
      .filter(root => root.name.includes('project'))
      .map(root => root.uri);

    return { projects };
  };
}
```

---

## Completions

**Available since:** v3.0.0

Provide autocomplete suggestions for tool arguments.

### Overview

Completions enhance the user experience by providing intelligent suggestions as users type tool arguments.

### Usage

```typescript
import type { ICompletion } from 'simply-mcp';

interface FileCompletion extends ICompletion {
  argument: {
    name: 'read_file';
    argumentName: 'path';
  };
  completions: (partial: string) => Promise<string[]>;
}

export default class MyServer {
  'completion/read_file/path': FileCompletion = async (partial) => {
    // Return file paths matching partial input
    const files = await searchFiles(partial);
    return files.map(f => f.path);
  };
}
```

---

## Progress

**Available since:** v3.0.0

Report progress for long-running operations.

### Overview

Progress tracking provides feedback to users during time-consuming operations, improving perceived performance.

### Usage

```typescript
interface ProcessTool extends ITool {
  name: 'process_large_file';
  description: 'Process a large file with progress tracking';
  params: { filePath: FilePathParam };
  result: { processed: number };
}

export default class MyServer {
  processLargeFile: ProcessTool = async (params, context) => {
    const totalLines = await countLines(params.filePath);
    let processed = 0;

    for await (const line of readLines(params.filePath)) {
      // Process line...
      processed++;

      // Report progress every 100 lines
      if (processed % 100 === 0) {
        await context.reportProgress({
          progress: processed,
          total: totalLines
        });
      }
    }

    return { processed };
  };
}
```

---

# React Hooks Adapter

**Available since:** v4.0.0

Client-side React integration for seamless MCP tool interaction with minimal boilerplate.

## Overview

The React Hooks Adapter provides type-safe, declarative hooks for calling MCP tools from React applications. Works with **any** UI component library - no MCP-specific components required.

**Key Benefits:**
- **90% less boilerplate** - No manual state management
- **Type-safe** - Full TypeScript inference
- **Framework agnostic** - Use with Material-UI, Chakra, Ant Design, etc.
- **Automatic state** - Loading, error, and data states handled
- **Optimistic updates** - Instant UI feedback
- **Request deduplication** - Avoid duplicate calls
- **Built-in retry** - Configurable retry logic

**Location:** `simply-mcp/client/hooks`

## useMCPTool Hook

Execute MCP tools with automatic state management:

```typescript
import { useMCPTool } from 'simply-mcp/client';

function GreetingComponent() {
  const { execute, loading, error, data } = useMCPTool('greet', {
    onSuccess: (result) => {
      console.log('Greeting received:', result);
    },
    onError: (error) => {
      console.error('Failed to greet:', error);
    }
  });

  return (
    <div>
      <button
        onClick={() => execute({ name: 'Alice' })}
        disabled={loading}
      >
        {loading ? 'Greeting...' : 'Say Hello'}
      </button>
      {error && <p>Error: {error.message}</p>}
      {data && <p>{data.greeting}</p>}
    </div>
  );
}
```

### Hook Options

```typescript
interface UseMCPToolOptions<TResult> {
  onSuccess?: (result: TResult) => void;
  onError?: (error: Error) => void;
  onMutate?: (params: any) => void;
  retry?: number;                    // Retry attempts (default: 0)
  retryDelay?: number;               // Delay between retries (ms)
  deduplicate?: boolean;             // Prevent duplicate calls (default: true)
  optimisticUpdate?: (params: any) => TResult;  // Optimistic result
}
```

### Return Value

```typescript
interface UseMCPToolResult<TResult> {
  execute: (params: any) => Promise<TResult>;
  loading: boolean;
  error: Error | null;
  data: TResult | null;
  reset: () => void;
}
```

## usePromptSubmit Hook

Submit prompts to MCP servers:

```typescript
import { usePromptSubmit } from 'simply-mcp/client';

function ChatComponent() {
  const { submit, loading, response } = usePromptSubmit('chat_template');

  const handleSubmit = () => {
    submit({
      topic: 'TypeScript',
      depth: 'advanced'
    });
  };

  return (
    <div>
      <button onClick={handleSubmit} disabled={loading}>
        Start Chat
      </button>
      {response && <ChatDisplay messages={response} />}
    </div>
  );
}
```

## MCPProvider Context

Global configuration for all hooks:

```typescript
import { MCPProvider } from 'simply-mcp/client';

function App() {
  return (
    <MCPProvider
      config={{
        serverUrl: 'http://localhost:3000',
        retry: 3,
        retryDelay: 1000,
        onError: (error) => {
          // Global error handling
          console.error('MCP Error:', error);
        }
      }}
    >
      <YourApp />
    </MCPProvider>
  );
}
```

## Integration with UI Libraries

Works seamlessly with popular UI libraries:

### Material-UI Example

```typescript
import { useMCPTool } from 'simply-mcp/client';
import { Button, CircularProgress, Alert } from '@mui/material';

function MaterialUIExample() {
  const { execute, loading, error, data } = useMCPTool('fetch_data');

  return (
    <>
      <Button
        variant="contained"
        onClick={() => execute({})}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : 'Load Data'}
      </Button>
      {error && <Alert severity="error">{error.message}</Alert>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </>
  );
}
```

### Chakra UI Example

```typescript
import { useMCPTool } from 'simply-mcp/client';
import { Button, Spinner, Alert } from '@chakra-ui/react';

function ChakraExample() {
  const { execute, loading, error } = useMCPTool('save_data');

  return (
    <Button
      colorScheme="blue"
      onClick={() => execute({ value: 42 })}
      isLoading={loading}
      spinner={<Spinner />}
    >
      Save
    </Button>
  );
}
```

## See Also

- [Example: react-hooks-demo.ts](../../examples/react-hooks-demo.ts) - Complete examples
- [API Reference - React Hooks](./API_REFERENCE.md#react-hooks) - Full API documentation

---

# UI Resources

**Available since:** v4.0.0 (Ultra-Minimal Redesign)

Interactive UI components for rich server experiences.

## Overview

UI Resources enable your MCP server to provide interactive interfaces that render in MCP clients. The v4.0 redesign dramatically simplifies UI creation through intelligent auto-detection and zero-config builds.

**v4.0 Ultra-Minimal Changes:**
- **6 fields instead of 30+** - Reduced configuration by 80%
- **Single `source` field** - Auto-detects URL, file, inline HTML, React, or Remote DOM
- **Auto-dependency extraction** - No manual dependency arrays
- **Zero-config build** - Smart defaults with optional overrides
- **Watch mode** - Auto-tracks all relevant files

## IUI Interface (v4.0)

```typescript
interface IUI extends IResource {
  uri: string;              // Unique identifier (e.g., 'ui://dashboard')
  name: string;             // Display name
  description?: string;     // Optional description
  mimeType: 'text/html'     // UI content type
    | 'application/javascript'
    | 'application/vnd.mcp-ui.remote-dom+javascript';

  source: string;           // AUTO-DETECTED SOURCE TYPE
  // Can be:
  // 1. External URL: 'https://example.com/ui.html'
  // 2. Inline HTML: '<div>Hello</div>'
  // 3. File path: './ui/dashboard.html'
  // 4. React component: './components/Dashboard.tsx'
  // 5. Remote DOM: './remote-dom/app.js'
  // 6. Folder: './ui-folder/'

  theme?: 'light' | 'dark' | 'auto';  // Optional theme preference
}
```

## Source Auto-Detection

The framework automatically detects your source type:

### 1. External URL

```typescript
interface DashboardUI extends IUI {
  uri: 'ui://dashboard';
  name: 'Dashboard';
  mimeType: 'text/html';
  source: 'https://example.com/dashboard.html';  // ✅ Auto-detected as URL
}
```

### 2. Inline HTML

```typescript
interface SimpleUI extends IUI {
  uri: 'ui://simple';
  name: 'Simple UI';
  mimeType: 'text/html';
  source: '<div><h1>Hello World</h1></div>';  // ✅ Auto-detected as inline HTML
}
```

### 3. React Component (TSX/JSX)

```typescript
interface ReactUI extends IUI {
  uri: 'ui://react-app';
  name: 'React App';
  mimeType: 'text/html';
  source: './src/components/App.tsx';  // ✅ Auto-detected as React
  // Dependencies auto-extracted from imports!
}
```

### 4. HTML File

```typescript
interface FileUI extends IUI {
  uri: 'ui://file';
  name: 'File UI';
  mimeType: 'text/html';
  source: './public/index.html';  // ✅ Auto-detected as HTML file
}
```

### 5. Remote DOM (JavaScript)

```typescript
interface RemoteDOMUI extends IUI {
  uri: 'ui://remote';
  name: 'Remote DOM UI';
  mimeType: 'application/vnd.mcp-ui.remote-dom+javascript';
  source: './remote/app.js';  // ✅ Auto-detected as Remote DOM
}
```

### 6. Folder-Based UI

```typescript
interface FolderUI extends IUI {
  uri: 'ui://folder';
  name: 'Folder UI';
  mimeType: 'text/html';
  source: './ui-folder/';  // ✅ Auto-detected as folder
  // Serves index.html from folder
}
```

## Auto-Dependency Extraction

**Before v4.0 (Manual):**
```typescript
dependencies: [
  'react@18.2.0',
  'react-dom@18.2.0',
  'lucide-react@0.263.1',
  '@mui/material@5.14.0'
]
```

**After v4.0 (Automatic):**
```typescript
// NO DEPENDENCIES FIELD NEEDED!
// Framework extracts from imports automatically:
import React from 'react';              // ✅ Auto-detected
import { Button } from '@mui/material'; // ✅ Auto-detected
import { Download } from 'lucide-react'; // ✅ Auto-detected
```

## Build Configuration (Optional)

Override defaults with `simply-mcp.config.ts`:

```typescript
export default {
  ui: {
    build: {
      bundle: true,        // Bundle all dependencies (default: true)
      minify: true,        // Minify output (default: true)
      sourcemap: false,    // Generate sourcemaps (default: false)
      target: 'es2020',    // JS target (default: es2020)
      cdn: 'esm.sh'        // CDN for dependencies (default: esm.sh)
    },
    performance: {
      lazy: true,          // Lazy load components (default: true)
      optimizeSize: true   // Optimize bundle size (default: true)
    }
  }
};
```

## Theme Support

Built-in CSS variable theming:

```typescript
interface ThemedUI extends IUI {
  uri: 'ui://themed';
  name: 'Themed UI';
  mimeType: 'text/html';
  source: './ui/themed.html';
  theme: 'auto';  // Respects user's system preference
}
```

Access theme variables in CSS:

```css
.container {
  background: var(--mcp-background);
  color: var(--mcp-foreground);
  border: 1px solid var(--mcp-border);
}
```

## Complete Example

```typescript
import type { IServer, IUI, ITool, IParam } from 'simply-mcp';

// UI Resource - Auto-detects React, extracts deps, builds, serves
interface CalculatorUI extends IUI {
  uri: 'ui://calculator';
  name: 'Calculator';
  description: 'Interactive calculator UI';
  mimeType: 'text/html';
  source: './src/Calculator.tsx';  // That's it!
  theme: 'auto';
}

// Tool that UI can call
interface AddTool extends ITool {
  name: 'add';
  params: { a: NumberParam; b: NumberParam };
  result: { sum: number };
}

interface MyServer extends IServer {
  name: 'calculator-server';
  version: '1.0.0';
  transport: 'http';
  http: { port: 3000 };
}

export default class CalculatorServer {
  add: AddTool = async (params) => ({
    sum: params.a + params.b
  });
}
```

## Watch Mode

Auto-reloads on file changes:

```bash
simply-mcp run server.ts --watch
```

Tracks:
- Main server file
- UI source files
- Imported dependencies
- Theme files
- Configuration

## See Also

- [UI Resources Guide](./UI_RESOURCES.md) - Comprehensive UI documentation
- [Remote DOM Guide](./REMOTE_DOM.md) - Sandboxed UI execution
- [Example: interface-ui-resource.ts](../../examples/interface-ui-resource.ts) - Working examples
- [Example: v4/07-with-tools.ts](../../examples/v4/07-with-tools.ts) - Complete server with UI

---

# Authentication

Simply-MCP provides built-in authentication for HTTP servers with two methods: API keys and OAuth 2.1.

## API Key Authentication

Simple key-based authentication for internal tools and development.

### Quick Example

```typescript
import type { IServer, IApiKeyAuth } from 'simply-mcp';

interface MyAuth extends IApiKeyAuth {
  type: 'apiKey';
  keys: [
    {
      name: 'admin';
      key: process.env.ADMIN_API_KEY!;
      permissions: ['*'];
    },
    {
      name: 'readonly';
      key: process.env.READONLY_API_KEY!;
      permissions: ['read:*'];
    }
  ];
}

interface MyServer extends IServer {
  name: 'secure-server';
  transport: 'http';
  port: 3000;
  auth: MyAuth;
}
```

### Features

- **Simple Setup**: Just add keys to your server configuration
- **Permission-Based**: Control access with permission strings
- **Wildcards**: Use `*` and `read:*` for broad permissions
- **Header-Based**: Send API key in `x-api-key` header (configurable)

**Best For:** Internal tools, development, server-to-server communication

**See:** [API Reference - IApiKeyAuth](./API_REFERENCE.md#authentication)

---

## OAuth 2.1 Authentication

**Available since:** v3.4.0

Industry-standard OAuth 2.1 authentication with scope-based access control, powered by Anthropic's MCP SDK.

### Quick Example

```typescript
import type { IServer, IOAuth2Auth } from 'simply-mcp';

interface MyOAuth extends IOAuth2Auth {
  type: 'oauth2';
  issuerUrl: 'https://auth.example.com';
  clients: [
    {
      clientId: 'web-app';
      clientSecret: process.env.OAUTH_CLIENT_SECRET!;
      redirectUris: ['https://app.example.com/callback'];
      scopes: ['read', 'tools:execute'];
      name: 'Web Application';
    },
    {
      clientId: 'mobile-app';
      clientSecret: process.env.MOBILE_CLIENT_SECRET!;
      redirectUris: ['myapp://oauth/callback'];
      scopes: ['read'];
      name: 'Mobile App';
    }
  ];
}

interface MyServer extends IServer {
  name: 'oauth-server';
  transport: 'http';
  port: 3000;
  stateful: true;  // Required for OAuth
  auth: MyOAuth;
}
```

### Features

**Security:**
- Authorization Code + PKCE Flow (RFC 7636)
- Short-lived access tokens (default: 1 hour)
- Refresh token rotation
- Token revocation
- bcrypt-hashed client secrets

**Access Control:**
- Scope-based permissions (read, write, tools:execute, admin)
- Custom scopes for application-specific features
- Automatic scope-to-permission mapping
- SecurityContext in handlers

**MCP SDK Integration:**
- Powered by Anthropic's MCP SDK
- RFC 8414 (Authorization Server Metadata)
- RFC 7009 (Token Revocation)
- Well-known endpoints

**Audit Logging:**
- All OAuth events logged
- Authorization grants/denials
- Token issuance/refresh/revocation
- Permission validation results

### Standard Scopes

Simply-MCP defines standard scopes that map to permissions:

| Scope | Permission | Description |
|-------|-----------|-------------|
| `read` | `read:*` | Read-only access to all resources |
| `write` | `write:*` | Write access to all resources |
| `tools:execute` | `tools:*` | Execute any tool |
| `resources:read` | `resources:*` | Read any resource |
| `prompts:read` | `prompts:*` | Read any prompt |
| `admin` | `*` | Full access to everything |

**Custom Scopes:** Any scope not in the standard list passes through as-is for custom permission checking.

### OAuth Endpoints (Automatic)

When OAuth is configured, Simply-MCP automatically creates:

- `GET /.well-known/oauth-authorization-server` - OAuth metadata
- `GET /oauth/authorize` - Authorization endpoint (PKCE required)
- `POST /oauth/token` - Token endpoint
- `POST /oauth/revoke` - Token revocation

### Using OAuth Tokens

Clients authenticate with Bearer tokens:

```bash
curl -X POST https://api.example.com/mcp \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "greet",
      "arguments": {"name": "World"}
    },
    "id": 1
  }'
```

### SecurityContext API

OAuth creates a SecurityContext accessible in handlers:

```typescript
export default class MyServer {
  myTool: MyTool = async (params, context) => {
    // Access OAuth permissions
    const permissions = context?.securityContext?.permissions || [];
    const isAdmin = permissions.includes('*');

    if (!isAdmin) {
      throw new Error('Unauthorized: admin scope required');
    }

    return { status: 'ok' };
  };
}
```

### OAuth vs API Key Comparison

| Feature | OAuth 2.1 | API Keys |
|---------|-----------|----------|
| **Security** | Short-lived tokens, rotating secrets | Long-lived, static |
| **Permissions** | Scope-based, granular | Permission strings |
| **User Context** | Knows which application (clientId) | Key name only |
| **Revocation** | Immediate, no secret change | Requires key rotation |
| **Setup Complexity** | Higher (authorization flow) | Simple |
| **Token Lifetime** | 15 min - 1 hour (configurable) | No expiration |
| **Best For** | Production, third-party apps | Internal tools, testing |

### Complete OAuth Documentation

**See:**
- [OAuth 2.1 Guide](./OAUTH2.md) - Complete OAuth documentation
  - Authorization flow step-by-step
  - PKCE implementation
  - Token lifecycle
  - Security best practices
  - Production deployment
- [OAuth Migration Guide](./OAUTH_MIGRATION.md) - Migrate from API keys
- [Example: interface-oauth-server.ts](../../examples/interface-oauth-server.ts) - Comprehensive example

**Best For:** Production deployments, third-party applications, mobile/web apps

---

## Related Guides

- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Protocol Features](./PROTOCOL.md) - Advanced server-client communication
- [Quick Start](./QUICK_START.md) - Get started quickly
