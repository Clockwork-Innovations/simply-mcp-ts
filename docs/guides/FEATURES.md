# MCP Features Guide

Complete guide to implementing tools, prompts, and resources in Simply MCP.

---

## Table of Contents

- [Tools](#tools) - Functions your server can perform
  - [Tool Annotations](#tool-annotations) - Metadata hints about tool behavior
  - [Batch Processing](#batch-processing) - Process multiple tool calls atomically with DoS protection
- [Prompts](#prompts) - Template generators for LLM interactions
- [Resources](#resources) - Static and dynamic data exposure
- [Authentication](#authentication) - Secure your MCP server
  - [API Key Authentication](#api-key-authentication) - Simple key-based auth
  - [OAuth 2.1 Authentication](#oauth-21-authentication) - Industry-standard OAuth

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

interface MyServer extends IServer {
  name: 'my-server';
  description: 'Example server';
}

export default class MyServer implements MyServer {
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

export default class MyServer implements IServer {
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

class MyServer implements IServer {
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

class MyServer implements IServer {
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

interface MyServer extends IServer {
  name: 'my-server';
  description: 'Example server';
}

export default class MyServer implements MyServer {
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

export default class MyServer implements IServer {
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

Simply MCP provides native support for audio content through the `IAudioContent` interface. Audio resources enable your server to expose audio files with rich metadata, supporting all standard audio formats.

### Overview

Audio resources can be either static (embedded base64 data) or dynamic (loaded from files at runtime). The framework provides type-safe interfaces and helper functions to make working with audio content simple and intuitive.

**Key Features:**
- Type-safe audio content with `IAudioContent` interface
- Rich metadata support via `IAudioMetadata` (duration, sample rate, channels, bitrate, codec, size)
- `createAudioContent()` helper for easy file loading
- Support for all standard audio formats (MP3, WAV, OGG, FLAC, AAC, M4A, WebM)
- Base64 encoding for binary audio data
- Automatic MIME type detection

### Supported Audio Formats

Simply MCP supports all standard audio formats with automatic MIME type detection:

| Format | MIME Type | Extension | Description |
|--------|-----------|-----------|-------------|
| MP3 | `audio/mpeg` | `.mp3` | MPEG Audio Layer 3 (compressed) |
| WAV | `audio/wav` | `.wav` | Waveform Audio (uncompressed) |
| OGG | `audio/ogg` | `.ogg` | Ogg Vorbis (compressed, open source) |
| M4A | `audio/mp4` | `.m4a` | AAC in MP4 container |
| FLAC | `audio/flac` | `.flac` | Free Lossless Audio Codec |
| AAC | `audio/aac` | `.aac` | Advanced Audio Coding |
| WebM | `audio/webm` | `.webm` | WebM audio (web optimized) |

Custom audio formats are also supported via the string fallback type.

### IAudioContent Interface

The `IAudioContent` interface represents audio data in your resources:

```typescript
interface IAudioContent {
  type: 'audio';                    // Content type discriminator
  data: string;                     // Base64-encoded audio data
  mimeType: 'audio/mpeg'            // Audio MIME type
    | 'audio/wav'
    | 'audio/ogg'
    | 'audio/webm'
    | 'audio/mp4'
    | 'audio/aac'
    | 'audio/flac'
    | string;                        // Custom types supported
  metadata?: IAudioMetadata;         // Optional metadata
}
```

### IAudioMetadata Interface

Rich metadata about your audio content (all fields optional):

```typescript
interface IAudioMetadata {
  duration?: number;        // Duration in seconds (e.g., 120.5)
  sampleRate?: number;      // Sample rate in Hz (e.g., 44100, 48000, 96000)
  channels?: number;        // Number of channels (1=mono, 2=stereo, 6=5.1, 8=7.1)
  bitrate?: number;         // Bitrate in kbps (e.g., 128, 192, 320)
  codec?: string;           // Codec identifier (e.g., 'mp3', 'aac', 'flac', 'vorbis')
  size?: number;            // File size in bytes
  originalPath?: string;    // Original file path (for debugging)
}
```

**Common Sample Rates:**
- `8000` - Telephone quality
- `22050` - Radio quality
- `44100` - CD quality (standard)
- `48000` - Professional audio
- `96000` - High-resolution audio

**Common Bitrates:**
- `128` - Standard quality (MP3/AAC)
- `192` - High quality
- `256` - Very high quality
- `320` - Maximum MP3 quality

### Static Audio Resource

Static resources contain embedded base64 audio data known at compile time:

```typescript
import type { IResource, IAudioContent } from 'simply-mcp';

interface MusicSampleResource extends IResource {
  uri: 'audio://music-sample';
  name: 'Music Sample';
  description: 'Embedded audio sample';
  mimeType: 'audio/mp3';
  value: IAudioContent;  // Static: use 'value' field
}

export default class MyServer {
  'audio://music-sample': MusicSampleResource['value'] = {
    type: 'audio',
    data: 'base64-encoded-mp3-data-here...',
    mimeType: 'audio/mpeg',
    metadata: {
      duration: 180.5,      // 3 minutes 0.5 seconds
      sampleRate: 44100,    // CD quality
      channels: 2,          // Stereo
      bitrate: 320,         // Maximum MP3 quality
      codec: 'mp3'
    }
  };
}
```

### Dynamic Audio Resource

Dynamic resources load audio from files at runtime using the `createAudioContent()` helper:

```typescript
import type { IResource, IAudioContent } from 'simply-mcp';
import { createAudioContent } from 'simply-mcp/core';

interface PodcastResource extends IResource {
  uri: 'audio://podcast';
  name: 'Latest Podcast Episode';
  description: 'Audio loaded from filesystem';
  mimeType: 'audio/mp3';
  returns: IAudioContent;  // Dynamic: use 'returns' field
}

export default class MyServer {
  'audio://podcast' = async (): Promise<IAudioContent> => {
    // createAudioContent handles file reading, encoding, and basic metadata
    const audioContent = await createAudioContent('./episodes/latest.mp3');

    // Add custom metadata
    return {
      ...audioContent,
      metadata: {
        ...audioContent._meta,  // Includes size and originalPath
        duration: 3600,         // 1 hour
        sampleRate: 48000,
        channels: 2,
        bitrate: 192,
        codec: 'mp3'
      }
    };
  };
}
```

### Using createAudioContent() Helper

The `createAudioContent()` helper simplifies audio loading:

```typescript
import { createAudioContent } from 'simply-mcp/core';

// From file path (automatic MIME type detection)
const audio1 = await createAudioContent('./audio/sample.mp3');

// From file path with explicit MIME type
const audio2 = await createAudioContent('./audio/custom.dat', 'audio/mpeg');

// From Buffer
import { readFileSync } from 'fs';
const buffer = readFileSync('./audio.wav');
const audio3 = await createAudioContent(buffer, 'audio/wav');

// From base64 string
const base64Audio = 'UklGRiQAAABXQVZF...';
const audio4 = await createAudioContent(base64Audio, 'audio/wav');
```

**What createAudioContent() does:**
1. Reads the file or processes the input
2. Detects MIME type from file extension or content
3. Converts to base64 encoding
4. Populates basic metadata (`size`, `originalPath`)

### Audio with Full Metadata

Example with all metadata fields populated:

```typescript
interface HighResAudioResource extends IResource {
  uri: 'audio://high-res';
  name: 'High-Resolution Audio';
  description: 'Professional quality FLAC audio';
  mimeType: 'audio/flac';
  returns: IAudioContent;
}

export default class MyServer {
  'audio://high-res' = async (): Promise<IAudioContent> => {
    const audioContent = await createAudioContent('./masters/track01.flac');

    return {
      ...audioContent,
      metadata: {
        duration: 245.7,        // 4 minutes 5.7 seconds
        sampleRate: 96000,      // High-resolution: 96kHz
        channels: 2,            // Stereo
        bitrate: 2304,          // 96kHz * 24-bit * 2 channels / 1000
        codec: 'flac',          // Lossless codec
        size: 56640000,         // ~54 MB
        originalPath: '/masters/track01.flac'
      }
    };
  };
}
```

### Audio Collection Resource

Return multiple audio files in a single resource:

```typescript
interface AudioLibraryResource extends IResource {
  uri: 'audio://library';
  name: 'Audio Library';
  description: 'Collection of audio files';
  mimeType: 'application/json';
  returns: {
    items: Array<IAudioContent & { name: string; description: string }>;
    total: number;
  };
}

export default class MyServer {
  'audio://library' = async () => {
    const items = [
      {
        name: 'Track 1',
        description: 'First track',
        ...(await createAudioContent('./tracks/track1.mp3')),
        metadata: { duration: 180, sampleRate: 44100, channels: 2 }
      },
      {
        name: 'Track 2',
        description: 'Second track',
        ...(await createAudioContent('./tracks/track2.mp3')),
        metadata: { duration: 210, sampleRate: 44100, channels: 2 }
      }
    ];

    return { items, total: items.length };
  };
}
```

### Integration with IResource

Audio content integrates seamlessly with the `IResource` interface:

**Static Pattern:**
- Use `value: IAudioContent` for compile-time audio data
- No implementation method needed (framework extracts from interface)

**Dynamic Pattern:**
- Use `returns: IAudioContent` for runtime-loaded audio
- Implement method matching the URI
- Method returns `Promise<IAudioContent>` or `IAudioContent`

### Best Practices

**1. Choose Appropriate Formats:**
- **MP3/AAC**: Best for speech, podcasts (good compression, universal support)
- **OGG Vorbis**: Open-source alternative to MP3
- **FLAC**: Lossless compression for archival, music masters
- **WAV**: Uncompressed, large files (avoid for web delivery)

**2. File Size Considerations:**
- Compressed formats (MP3, AAC, OGG): ~1 MB per minute at 128 kbps
- Lossless (FLAC): ~5-10 MB per minute
- Uncompressed (WAV): ~10 MB per minute (44.1kHz stereo)
- Consider streaming for large files instead of embedding

**3. Metadata Completeness:**
- Always include `duration` for player UI
- Include `sampleRate` and `channels` for quality indication
- Add `codec` for client compatibility checking
- Populate `size` to help clients manage bandwidth

**4. Error Handling:**
```typescript
'audio://dynamic' = async (): Promise<IAudioContent> => {
  try {
    return await createAudioContent('./audio/file.mp3');
  } catch (error) {
    // Fallback to default audio or throw meaningful error
    console.error('Failed to load audio:', error);
    throw new Error('Audio resource temporarily unavailable');
  }
};
```

**5. Performance Tips:**
- Use dynamic resources for large audio files (avoid bloating interface definitions)
- Consider caching loaded audio in memory for frequently accessed files
- Use appropriate bitrates (don't use 320 kbps for voice content)
- Provide progress tracking for large file operations

### Complete Example

```typescript
import type { IServer, IResource, IAudioContent } from 'simply-mcp';
import { createAudioContent } from 'simply-mcp/core';

interface AudioServer extends IServer {
  name: 'audio-server';
  description: 'Audio content server';
  version: '1.0.0';
}

// Static audio resource
interface NotificationSoundResource extends IResource {
  uri: 'audio://notification';
  name: 'Notification Sound';
  description: 'Short notification audio';
  mimeType: 'audio/wav';
  value: IAudioContent;
}

// Dynamic audio resource
interface MusicTrackResource extends IResource {
  uri: 'audio://music-track';
  name: 'Music Track';
  description: 'Music track loaded from file';
  mimeType: 'audio/mp3';
  returns: IAudioContent;
}

export default class AudioServer {
  // Static resource - no implementation needed
  'audio://notification': NotificationSoundResource['value'] = {
    type: 'audio',
    data: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgA...',
    mimeType: 'audio/wav',
    metadata: {
      duration: 0.5,
      sampleRate: 44100,
      channels: 1,
      codec: 'pcm'
    }
  };

  // Dynamic resource - requires implementation
  'audio://music-track' = async (): Promise<IAudioContent> => {
    const audioContent = await createAudioContent('./music/track.mp3');

    return {
      ...audioContent,
      metadata: {
        ...audioContent._meta,
        duration: 240,
        sampleRate: 48000,
        channels: 2,
        bitrate: 192,
        codec: 'mp3'
      }
    };
  };
}
```

### See Also

- [API Reference - IAudioContent](./API_REFERENCE.md#iaudiocontent) - Complete interface documentation
- [API Reference - IAudioMetadata](./API_REFERENCE.md#iaudiometadata) - Metadata field reference
- [Example: interface-audio-resource.ts](../../examples/interface-audio-resource.ts) - Working code examples

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
