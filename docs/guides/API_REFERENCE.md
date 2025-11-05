# API Core

Core concepts and basic structure for building MCP servers with Simply MCP.

## Table of Contents

- [Basic Structure](#basic-structure)
- [Core Types](#core-types)
- [Transport Configuration](#transport-configuration)
- [Authentication](#authentication)
- [Running Servers](#running-servers)
- [Handler Context API](#handler-context-api)
- [UI Resources](#ui-resources)
- [Related Guides](#related-guides)

---

## Basic Structure

Simply-mcp uses TypeScript interfaces to define MCP primitives (tools, prompts, resources) and a class to implement them.

> **See:** [Quick Start Guide](./QUICK_START.md) for a complete first server example, or [Features Guide](./FEATURES.md) for detailed tool implementation patterns.

---

## Interface Discovery

Simply MCP automatically discovers and registers your interfaces - no manual registration needed.

### Automatic Registration

The framework scans your file and automatically detects:

| Interface Type | Detection | Registration |
|----------------|-----------|--------------|
| `ITool` | Automatic | All ITool interfaces become tools |
| `IPrompt` | Automatic | All IPrompt interfaces become prompts |
| `IResource` | Automatic | All IResource interfaces become resources |

### No Registration Arrays Required

You **don't need** to maintain registration lists:

```typescript
// ❌ NOT NEEDED - Don't do this
interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
  tools: [Tool1, Tool2];      // Not needed!
  prompts: [Prompt1];         // Not needed!
  resources: [Resource1];     // Not needed!
}
```

```typescript
// ✅ CORRECT - Just define interfaces
interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
}

interface Tool1 extends ITool { ... }
interface Tool2 extends ITool { ... }
interface Prompt1 extends IPrompt { ... }
interface Resource1 extends IResource { ... }

// Framework automatically discovers all interfaces
```

### Verification

Use `--dry-run` to see what the framework discovered:

```bash
npx simply-mcp run server.ts --dry-run
```

**Example output:**
```
✓ Server: my-server v1.0.0
✓ Detected 2 tools: tool1, tool2
✓ Detected 1 prompt: prompt1
✓ Detected 1 resource: resource1
✓ Ready to run
```

**How it works:**
1. Framework parses your TypeScript file
2. Finds all interfaces extending ITool, IPrompt, IResource
3. Automatically registers them with the server
4. No manual wiring required

---

## Core Types

### IServer

```typescript
interface IServer {
  name: string;              // Server name (kebab-case)
  description: string;       // Server description (required)
  version?: string;          // Semantic version (optional, defaults to '1.0.0')
}
```

### IToolRouter

Group related tools together and control their visibility. Routers reduce context clutter by hiding tools until needed.

**Interface:**
```typescript
export interface IToolRouter {
  name?: string;           // Router name (optional - inferred from property)
  description: string;      // Required description
  tools: readonly ITool[];  // Array of tool interface types
  metadata?: {              // Optional metadata
    category?: string;
    tags?: string[];
    order?: number;
    [key: string]: unknown;
  };
}
```

**Properties:**

- `name` (optional): Router name in snake_case. If omitted, inferred from property name
  - Example: `weatherRouter` → `weather_router`
- `description` (required): Human-readable description of the router's purpose
- `tools` (required): Array of ITool interface types (or string tool names for backward compatibility)
- `metadata` (optional): Custom metadata for categorization and organization

**Usage:**
```typescript
interface WeatherRouter extends IToolRouter {
  name: 'weather_router';
  description: 'Weather information tools';
  tools: [GetWeatherTool, GetForecastTool];
}

export default class Server {
  getWeather: GetWeatherTool = async (params) => ({ /* ... */ });
  getForecast: GetForecastTool = async (params) => ({ /* ... */ });

  // NO implementation needed!
  weatherRouter!: WeatherRouter;
}
```

**Behavior:**

When `flattenRouters: false` (recommended):
- Router tools are hidden from the main `tools/list`
- Only the router itself appears in the list
- Call the router to get its tool list
- Call tools via namespace: `router_name__tool_name`

When `flattenRouters: true`:
- All tools appear in the main list (router + individual tools)

**See Also:**
- [Router Tools Guide](./ROUTER_TOOLS.md)
- [Features - Tool Routers](./FEATURES.md#tool-routers)

### IToolAnnotations

**Available since:** v4.1.0

Metadata annotations for tools to provide hints about tool behavior and characteristics.

#### Type Definition

```typescript
export interface IToolAnnotations {
  /**
   * Human-readable title for display purposes
   * @example 'Delete User Account'
   */
  title?: string;

  /**
   * Hint that this tool only reads data and makes no modifications
   * @default false
   */
  readOnlyHint?: boolean;

  /**
   * Hint that this tool modifies or deletes data
   * @default false
   */
  destructiveHint?: boolean;

  /**
   * Hint that this tool can be safely called multiple times with the same result
   * @default false
   */
  idempotentHint?: boolean;

  /**
   * Hint that this tool's results may vary based on external state
   * @default false
   */
  openWorldHint?: boolean;

  /**
   * Tool requires explicit user confirmation before execution
   * Simply-MCP extension
   * @default false
   */
  requiresConfirmation?: boolean;

  /**
   * Tool category for organization and filtering
   * Simply-MCP extension
   * @example 'data', 'system', 'communication', 'analysis'
   */
  category?: string;

  /**
   * Expected execution duration hint
   * Simply-MCP extension
   */
  estimatedDuration?: 'fast' | 'medium' | 'slow';

  /**
   * Custom metadata fields
   */
  [key: string]: unknown;
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | No | Human-readable display name |
| `readOnlyHint` | `boolean` | No | Tool only reads, doesn't modify data |
| `destructiveHint` | `boolean` | No | Tool modifies or deletes data |
| `idempotentHint` | `boolean` | No | Safe to call multiple times |
| `openWorldHint` | `boolean` | No | Results may vary based on external state |
| `requiresConfirmation` | `boolean` | No | Requires user confirmation (Simply-MCP extension) |
| `category` | `string` | No | Logical category (Simply-MCP extension) |
| `estimatedDuration` | `'fast' \| 'medium' \| 'slow'` | No | Performance hint (Simply-MCP extension) |

#### Validation Rules

1. **Mutual Exclusivity**: Cannot have both `readOnlyHint: true` and `destructiveHint: true`
2. **Enum Validation**: `estimatedDuration` must be one of: `'fast'`, `'medium'`, `'slow'`
3. **Type Safety**: Boolean fields must be boolean values, string fields must be strings

#### Usage in ITool

Add annotations to any tool interface via the optional `annotations` field:

```typescript
interface MyTool extends ITool {
  name: 'my_tool';
  description: 'Tool description';
  params: { /* ... */ };
  result: string;

  // Optional annotations
  annotations?: IToolAnnotations;
}
```

#### MCP Protocol Alignment

The annotation field names use the "Hint" suffix convention from the MCP protocol specification to clearly indicate these are hints, not guarantees. Tools are encouraged to follow these hints but are not strictly bound by them.

#### See Also

- [Features Guide - Tool Annotations](./FEATURES.md#tool-annotations)
- [Example: interface-tool-annotations.ts](../../examples/interface-tool-annotations.ts)

### Type Coercion

Simply MCP automatically coerces parameter types from JSON-RPC strings to ensure type safety and correct behavior.

**Automatic Coercion:**
- **Number parameters** (`type: 'number'` or `type: 'integer'`): Strings are coerced to numbers
  - `"42"` → `42`
  - Uses Zod's `z.coerce.number()` internally
- **Boolean parameters** (`type: 'boolean'`): Strings are coerced to booleans
  - `"true"` → `true`, `"false"` → `false`
  - Uses Zod's `z.coerce.boolean()` internally
- **String parameters**: No coercion needed

**Why This Matters:**

JSON-RPC sends all parameter values as strings. Without automatic coercion:

```typescript
// Without coercion (BROKEN):
interface AddTool extends ITool {
  params: { a: number; b: number };
  result: { sum: number };
}

// Implementation receives strings from JSON-RPC
add: AddTool = async (params) => {
  return { sum: params.a + params.b };  // "42" + "58" = "4258" ❌
};
```

With automatic coercion (Simply MCP v4.0.0+):

```typescript
// With coercion (CORRECT):
interface AParam extends IParam {
  type: 'number';
  description: 'First number';
}

interface BParam extends IParam {
  type: 'number';
  description: 'Second number';
}

interface AddTool extends ITool {
  params: { a: AParam; b: BParam };
  result: { sum: number };
}

// Implementation receives actual numbers
add: AddTool = async (params) => {
  return { sum: params.a + params.b };  // 42 + 58 = 100 ✅
};
```

**IParam Requirement:**

**All tool parameters MUST use IParam interfaces.** The framework requires IParam for:
- Type coercion (string → number, boolean)
- Parameter validation and schema generation
- LLM documentation and tool calling

```typescript
// ✅ CORRECT - Using IParam interfaces
interface CountParam extends IParam {
  type: 'number';
  description: 'Item count';
}

interface MyTool extends ITool {
  params: { count: CountParam };
  result: { total: number };
}
```

```typescript
// ❌ INCORRECT - Inline types NOT supported
interface MyTool extends ITool {
  params: {
    count: number;  // ❌ Direct type (will fail dry-run validation)
  };
  result: { total: number };
}
```

```typescript
// ❌ INCORRECT - Inline intersection NOT supported
interface MyTool extends ITool {
  params: {
    count: { type: 'number'; description: '...' } & IParam;  // ❌ Caught at dry-run
  };
  result: { total: number };
}
```

**See:** [Validation Guide](./VALIDATION.md) for details on parameter validation rules.

### Validation Errors

Simply MCP validates your interface definitions during dry-run to catch errors early.

**Common Validation Errors:**

1. **Inline IParam Intersection** (CRITICAL)
   ```typescript
   // ❌ Will fail dry-run validation
   params: {
     count: { type: 'number' } & IParam;
   }
   ```
   - **Error**: "Parameter uses inline IParam intersection"
   - **Fix**: Use separate interface with `extends IParam`
   - **Why**: Schema generator doesn't support intersection types

**Running Validation:**

```bash
# Always validate before running
npx simply-mcp run server.ts --dry-run

# Output on success:
# ✓ Dry run complete
# ✓ Tools: 3, Prompts: 1, Resources: 2
# ✓ Ready to run

# Output on error:
# ✗ Dry run failed
# ❌ CRITICAL ERROR: Parameter 'count' uses inline IParam intersection.
# [Detailed fix instructions follow]
```

**See:** [Validation Guide](./VALIDATION.md) for complete validation rules and troubleshooting.

---

## Audio Content Interfaces

**Available since:** v4.2.0

Simply MCP provides native support for audio content through type-safe interfaces designed for use with the `IResource` interface.

### IAudioContent

The `IAudioContent` interface represents audio data in base64 encoding with MIME type information and optional metadata.

**Interface Definition:**

```typescript
export interface IAudioContent {
  type: 'audio';
  data: string;
  mimeType: 'audio/mpeg' | 'audio/wav' | 'audio/ogg' | 'audio/webm'
    | 'audio/mp4' | 'audio/aac' | 'audio/flac' | string;
  metadata?: IAudioMetadata;
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `'audio'` | Yes | Content type discriminator (must be 'audio') |
| `data` | `string` | Yes | Base64-encoded audio data |
| `mimeType` | `string` | Yes | Audio MIME type (see supported types below) |
| `metadata` | `IAudioMetadata` | No | Optional audio metadata |

**Supported MIME Types:**

The `mimeType` field accepts standard audio MIME types with specific literal types for common formats:

- `'audio/mpeg'` - MP3 audio (MPEG Audio Layer 3)
- `'audio/wav'` - WAV audio (uncompressed waveform)
- `'audio/ogg'` - Ogg Vorbis audio (open source compressed)
- `'audio/webm'` - WebM audio (web optimized)
- `'audio/mp4'` - M4A/AAC in MP4 container
- `'audio/aac'` - AAC audio (Advanced Audio Coding)
- `'audio/flac'` - FLAC audio (lossless compression)
- Custom string types for other audio formats

**Usage with IResource:**

Use `IAudioContent` as the type for static (`value`) or dynamic (`returns`) audio resources:

```typescript
// Static audio resource
interface StaticAudioResource extends IResource {
  uri: 'audio://static';
  name: 'Static Audio';
  mimeType: 'audio/mp3';
  value: IAudioContent;  // Static pattern
}

// Dynamic audio resource
interface DynamicAudioResource extends IResource {
  uri: 'audio://dynamic';
  name: 'Dynamic Audio';
  mimeType: 'audio/wav';
  returns: IAudioContent;  // Dynamic pattern
}
```

**Example:**

```typescript
import type { IAudioContent } from 'simply-mcp';

const audioContent: IAudioContent = {
  type: 'audio',
  data: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEA...',
  mimeType: 'audio/wav',
  metadata: {
    duration: 120.5,
    sampleRate: 44100,
    channels: 2,
    bitrate: 1411,
    codec: 'pcm'
  }
};
```

### IAudioMetadata

The `IAudioMetadata` interface provides rich metadata about audio content. All fields are optional.

**Interface Definition:**

```typescript
export interface IAudioMetadata {
  duration?: number;
  sampleRate?: number;
  channels?: number;
  bitrate?: number;
  codec?: string;
  size?: number;
  originalPath?: string;
}
```

**Fields:**

| Field | Type | Description | Example Values |
|-------|------|-------------|----------------|
| `duration` | `number` | Duration in seconds | `120.5` (2 min 0.5 sec) |
| `sampleRate` | `number` | Sample rate in Hz | `8000`, `22050`, `44100`, `48000`, `96000` |
| `channels` | `number` | Number of audio channels | `1` (mono), `2` (stereo), `6` (5.1), `8` (7.1) |
| `bitrate` | `number` | Bitrate in kbps | `128`, `192`, `256`, `320` |
| `codec` | `string` | Audio codec identifier | `'mp3'`, `'aac'`, `'opus'`, `'flac'`, `'wav'`, `'vorbis'` |
| `size` | `number` | File size in bytes | `5242880` (5 MB) |
| `originalPath` | `string` | Original file path | `'/path/to/audio.mp3'` |

**Common Sample Rates:**

- `8000` - Telephone quality
- `22050` - Radio quality
- `44100` - CD quality (standard)
- `48000` - Professional audio
- `96000` - High-resolution audio

**Common Bitrates:**

- `128` - Standard quality MP3/AAC
- `192` - High quality
- `256` - Very high quality
- `320` - Maximum MP3 quality

**Common Codecs:**

- `'mp3'` - MPEG Audio Layer 3
- `'aac'` - Advanced Audio Coding
- `'opus'` - Opus Interactive Audio Codec
- `'flac'` - Free Lossless Audio Codec
- `'wav'` - Waveform Audio (typically uncompressed PCM)
- `'vorbis'` - Ogg Vorbis

**Example:**

```typescript
import type { IAudioMetadata } from 'simply-mcp';

const metadata: IAudioMetadata = {
  duration: 180.5,        // 3 minutes 0.5 seconds
  sampleRate: 48000,      // 48kHz professional audio
  channels: 2,            // Stereo
  bitrate: 192,           // 192 kbps
  codec: 'mp3',           // MP3 codec
  size: 4194304,          // 4 MB
  originalPath: '/music/track.mp3'
};
```

### createAudioContent() Helper

The framework provides a helper function to simplify creating audio content from files or buffers.

**Import:**

```typescript
import { createAudioContent } from 'simply-mcp/core';
```

**Signature:**

```typescript
async function createAudioContent(
  input: string | Buffer | Uint8Array,
  mimeType?: string,
  basePath?: string,
  logger?: { warn: (message: string) => void }
): Promise<IAudioContent>
```

**Parameters:**

- `input` - Audio data source (file path, Buffer, Uint8Array, or base64 string)
- `mimeType` - Optional explicit MIME type (auto-detected if omitted)
- `basePath` - Optional base path for relative file paths (defaults to `process.cwd()`)
- `logger` - Optional logger for warnings

**Returns:**

`Promise<IAudioContent>` with basic metadata populated (`size`, `originalPath`)

**What it does:**

1. Reads the file or processes the input data
2. Detects MIME type from file extension or content
3. Converts to base64 encoding
4. Populates basic metadata fields

**Usage Examples:**

```typescript
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

// Add custom metadata after creation
const audioContent = await createAudioContent('./podcast.mp3');
audioContent.metadata = {
  ...audioContent.metadata,
  duration: 3600,  // 1 hour
  codec: 'mp3',
  bitrate: 192
};
```

**File Extension to MIME Type Mapping:**

| Extension | MIME Type |
|-----------|-----------|
| `.mp3` | `audio/mpeg` |
| `.wav` | `audio/wav` |
| `.ogg` | `audio/ogg` |
| `.m4a` | `audio/mp4` |
| `.flac` | `audio/flac` |
| `.aac` | `audio/aac` |

### Complete Resource Example

```typescript
import type { IServer, IResource, IAudioContent } from 'simply-mcp';
import { createAudioContent } from 'simply-mcp/core';

const server: IServer = {
  name: 'audio-server',
  version: '1.0.0',
  description: 'Server with audio resources'
}

// Static audio resource
interface NotificationResource extends IResource {
  uri: 'audio://notification';
  name: 'Notification Sound';
  mimeType: 'audio/wav';
  value: IAudioContent;
}

// Dynamic audio resource
interface PodcastResource extends IResource {
  uri: 'audio://podcast';
  name: 'Podcast Episode';
  mimeType: 'audio/mp3';
  returns: IAudioContent;
}

export default class MyServer {
  // Static - framework extracts from interface
  'audio://notification': NotificationResource['value'] = {
    type: 'audio',
    data: 'UklGRiQAAABXQVZF...',
    mimeType: 'audio/wav',
    metadata: {
      duration: 0.5,
      sampleRate: 44100,
      channels: 1
    }
  };

  // Dynamic - requires implementation
  'audio://podcast' = async (): Promise<IAudioContent> => {
    const audioContent = await createAudioContent('./episodes/latest.mp3');

    return {
      ...audioContent,
      metadata: {
        ...audioContent._meta,
        duration: 3600,
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

- [Features Guide - Audio Resources](./FEATURES.md#audio-resources) - Usage patterns and best practices
- [Example: interface-audio-resource.ts](../../examples/interface-audio-resource.ts) - Complete working examples

---

## Transport Configuration

The Interface API supports both `stdio` (for Claude Desktop) and `http` (for web clients) transports. Configure transport settings directly in your IServer interface:

```typescript
const server: IServer = {
  name: 'my-server',
  version: '1.0.0',
  description: 'My server description'
  // version: '1.0.0';            // Optional (defaults to '1.0.0')
  transport?: 'stdio' | 'http';  // Default: 'stdio'
  port?: number;                  // Required for HTTP transport
  stateful?: boolean;             // HTTP session mode (default: true)
}
```

**Transport Fields:**

- **`transport`**: Transport type
  - `'stdio'` - Standard input/output (default, for Claude Desktop)
  - `'http'` - HTTP server (for web clients and remote access)
- **`port`**: Port number for HTTP server (ignored for stdio)
  - Required when `transport: 'http'`
  - Example: `3000`, `8080`
- **`stateful`**: Enable stateful sessions for HTTP (default: `true`)
  - When `true`, uses MCP SDK's StreamableHTTPServerTransport (streamable HTTP) with session state and SSE streaming
  - When `false`, treats each request independently (stateless mode)

**Example: HTTP Server**

```typescript
import type { IServer, ITool } from 'simply-mcp';

interface GetTimeTool extends ITool {
  name: 'get_time';
  description: 'Get current server time';
  params: {};
  result: { time: string };
}

interface TimeServer extends IServer {
  name: 'time-server';
  version: '1.0.0';
  transport: 'http';
  port: 3000;
  stateful: true;
}

export default class TimeServer {
  getTime: GetTimeTool = async () => ({
    time: new Date().toISOString()
  });
}
```

**Run it:**
```bash
# stdio transport (default)
npx simply-mcp run server.ts

# HTTP transport (uses interface config)
npx simply-mcp run server.ts

# Override with CLI flags
npx simply-mcp run server.ts --http --port 8080
```

---

## Batch Processing Configuration

Simply-MCP supports JSON-RPC 2.0 batch request processing for high-throughput operations. Enable batch processing with the `batching` configuration option in your server interface.

### Configuration Options

```typescript
interface BatchingConfig {
  enabled?: boolean;        // Enable batch processing (default: true)
  parallel?: boolean;       // Process requests concurrently (default: false)
  maxBatchSize?: number;    // Maximum requests per batch (default: 100)
  timeout?: number;         // Batch timeout in ms (optional)
}
```

**Configuration Fields:**

- **`enabled`**: Enable/disable batch processing (default: `true`)
- **`parallel`**: Process requests concurrently for 5x faster throughput (default: `false`)
- **`maxBatchSize`**: Maximum number of requests per batch (default: `100`, recommended max: `1000`)
- **`timeout`**: Maximum execution time in milliseconds for entire batch (optional)

### Usage with Builder API

```typescript
import { BuildMCPServer } from 'simply-mcp';

const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  batching: {
    enabled: true,
    parallel: true,      // High throughput mode (5x faster)
    maxBatchSize: 100    // Limit batch size for DoS prevention
  }
});
```

### Batch Context

When processing batch requests, tool handlers receive batch context via the `context` parameter:

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

**Access batch context in tool handlers:**

```typescript
server.addTool({
  name: 'process_item',
  description: 'Process an item with batch context awareness',
  parameters: z.object({
    item_id: z.string()
  }),
  execute: async (params, context) => {
    // Check if this is part of a batch
    if (context?.batch) {
      const { index, size, parallel } = context.batch;
      console.log(`Processing item ${index + 1}/${size} (parallel: ${parallel})`);

      // First request in batch - initialize resources
      if (index === 0) {
        initializeResourcePool();
      }

      // Last request in batch - cleanup
      if (index === size - 1) {
        cleanupResourcePool();
      }
    }

    // Tool logic here
    return { content: [{ type: 'text', text: 'Processed' }] };
  }
});
```

### Performance Characteristics

Based on measured benchmarks with 50ms simulated operation time:

**Throughput:**
- **Sequential mode**: ~192 requests/second
- **Parallel mode**: ~940 requests/second (5x improvement)

**Batch vs Individual:**
- 10 individual requests: ~513ms total
- 1 batch of 10 (parallel): ~53ms total
- Speedup: 9.68x with batching

**Overhead:**
- Batch processing overhead: 1.9% (minimal)
- Per-request overhead: ~50ms individual, ~1ms batched

**Optimal Batch Sizes:**
- Sequential mode: 20-50 requests
- Parallel mode: 50-100 requests
- Above 100: Split into multiple batches

### Processing Modes

#### Sequential Mode (`parallel: false`)

Processes requests in order, one after another. Use when order matters:

- Database record imports (referential integrity)
- State machine transitions
- Migration scripts
- Operations where later requests depend on earlier ones

```typescript
batching: {
  enabled: true,
  parallel: false,
  maxBatchSize: 50
}
```

**Performance:** ~192 req/sec

#### Parallel Mode (`parallel: true`)

Processes requests concurrently for maximum throughput. Use for independent operations:

- Data exports
- Analytics queries
- Bulk reads
- Operations where requests don't depend on each other

```typescript
batching: {
  enabled: true,
  parallel: true,
  maxBatchSize: 100
}
```

**Performance:** ~940 req/sec (5x faster)

### DoS Prevention

Batch processing includes built-in protection against resource exhaustion:

**1. Batch Size Limiting:**

The `maxBatchSize` parameter prevents excessively large batches that could exhaust server resources:

```typescript
batching: {
  maxBatchSize: 100,  // Recommended for production
  // High-throughput systems: up to 1000
  // Resource-constrained: 50 or less
}
```

Requests beyond `maxBatchSize` are rejected immediately with a clear error message.

**2. Timeout Enforcement:**

The `timeout` parameter enforces a strict execution deadline for entire batches:

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

**Best Practices:**

1. **Set appropriate limits:**
   - Development: `maxBatchSize: 1000`, `timeout: 60000`
   - Production: `maxBatchSize: 100`, `timeout: 30000`
   - Constrained: `maxBatchSize: 25`, `timeout: 15000`

2. **Monitor batch metrics:**
   - Track timeout rates (>5% = increase timeout)
   - Monitor concurrent batches
   - Log batch sizes and durations

3. **Implement rate limiting:**
   - 10 large batches (>50 items) per minute per client
   - 30 medium batches (11-50 items) per minute
   - Unlimited small batches (1-10 items)

### Error Handling

Individual request failures don't stop the batch. Each response contains either a result or error:

```typescript
// Batch response with partial failures
[
  { jsonrpc: '2.0', id: 1, result: { /* success */ } },
  { jsonrpc: '2.0', id: 2, error: { code: -32000, message: '...' } },
  { jsonrpc: '2.0', id: 3, result: { /* success */ } }
]
```

**Timeout errors** use JSON-RPC error code `-32000`:

```typescript
{
  jsonrpc: '2.0',
  id: 2,
  error: {
    code: -32000,
    message: 'Batch timeout exceeded'
  }
}
```

### Complete Example

See [examples/interface-batch-requests.ts](../../examples/interface-batch-requests.ts) for complete examples including:
- Sequential and parallel processing
- Batch context usage
- Resource management patterns
- Error handling
- Performance demonstrations

**Performance benchmarks:** [tests/performance/batch-performance.test.ts](../../tests/performance/batch-performance.test.ts)

---

## Authentication

### IAuth Interface

The Interface API provides built-in authentication support for HTTP servers:

- **API Key Authentication** (`IApiKeyAuth`) - Simple key-based auth for internal tools
- **OAuth 2.1 Authentication** (`IOAuth2Auth`) - Industry-standard OAuth for production use

```typescript
import type { IApiKeyAuth, IServer } from 'simply-mcp';

interface MyAuth extends IApiKeyAuth {
  type: 'apiKey';
  headerName?: string;      // Default: 'x-api-key'
  keys: Array<{
    name: string;           // Key identifier (e.g., 'admin', 'readonly')
    key: string;            // The actual API key value
    permissions: string[];  // Permission list (e.g., ['*'], ['read:*'])
  }>;
  allowAnonymous?: boolean; // Allow unauthenticated requests (default: false)
}

interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
  transport: 'http';
  port: 3000;
  auth: MyAuth;             // Apply authentication
}
```

**Authentication Fields:**

- **`type`**: Authentication type (currently only `'apiKey'` is supported)
- **`headerName`**: HTTP header to check for API key (default: `'x-api-key'`)
- **`keys`**: Array of valid API keys with metadata
  - `name`: Human-readable identifier for the key
  - `key`: The actual API key string
  - `permissions`: Array of permission strings (e.g., `['*']`, `['read:*']`, `['tool:get_data']`)
- **`allowAnonymous`**: Whether to allow requests without authentication (default: `false`)

**Permission Format:**

- `['*']` - Full access to all resources
- `['read:*']` - Read-only access to all resources
- `['tool:get_data']` - Access to specific tool
- `['resource:config://app']` - Access to specific resource
- Multiple permissions can be combined: `['tool:get_data', 'tool:search', 'resource:*']`

### Complete Authentication Example

```typescript
import type { IApiKeyAuth, IServer, ITool } from 'simply-mcp';

// Define authentication configuration
interface AdminAuth extends IApiKeyAuth {
  type: 'apiKey';
  headerName: 'x-api-key';
  keys: [
    {
      name: 'admin';
      key: 'sk-admin-xxx-secure-key-here';
      permissions: ['*'];
    },
    {
      name: 'readonly';
      key: 'sk-read-yyy-secure-key-here';
      permissions: ['read:*'];
    },
    {
      name: 'limited';
      key: 'sk-limit-zzz-secure-key-here';
      permissions: ['tool:get_data'];
    }
  ];
  allowAnonymous: false;
}

// Define server with authentication
const server: IServer = {
  name: 'secure-server',
  version: '1.0.0',
  description: 'Secure server with API key authentication'
  // version: '1.0.0';  // Optional (defaults to '1.0.0')
  transport: 'http';
  port: 3000;
  stateful: true;
  auth: AdminAuth;
}

// Define parameter interfaces
interface IdParam extends IParam {
  type: 'string';
  description: 'Data identifier';
}

interface ValueParam extends IParam {
  type: 'string';
  description: 'New data value';
}

// Define tools
interface GetDataTool extends ITool {
  name: 'get_data';
  description: 'Fetch protected data';
  params: { id: IdParam };
  result: { data: any };
}

interface UpdateDataTool extends ITool {
  name: 'update_data';
  description: 'Update protected data';
  params: { id: IdParam; value: ValueParam };
  result: { success: boolean };
}

// Implementation
export default class SecureServer {
  // No duplication needed - interface is source of truth

  // Protected by API key authentication
  getData: GetDataTool = async ({ id }) => {
    // Only accessible with valid API key
    // 'admin' and 'readonly' and 'limited' keys can access
    return {
      data: {
        id,
        value: 'secret data',
        timestamp: Date.now()
      }
    };
  };

  // Only admin can access (write operation)
  updateData: UpdateDataTool = async ({ id, value }) => {
    // Only accessible with 'admin' key (needs write permission)
    return { success: true };
  };
}
```

**Testing with curl:**

```bash
# Valid admin key - full access
curl -H "x-api-key: sk-admin-xxx-secure-key-here" \
  http://localhost:3000/tools/get_data

# Valid readonly key - can read
curl -H "x-api-key: sk-read-yyy-secure-key-here" \
  http://localhost:3000/tools/get_data

# Invalid key - rejected
curl -H "x-api-key: invalid-key" \
  http://localhost:3000/tools/get_data

# No key - rejected (unless allowAnonymous: true)
curl http://localhost:3000/tools/get_data
```

**Best Practices:**

1. **Never commit API keys to version control**
   - Use environment variables: `process.env.ADMIN_API_KEY`
   - Use secret management services in production

2. **Use strong, random keys**
   - Minimum 32 characters
   - Mix of letters, numbers, special characters
   - Consider using crypto libraries: `crypto.randomBytes(32).toString('hex')`

3. **Implement least privilege**
   - Give each key only the permissions it needs
   - Use specific permissions over wildcards when possible
   - Separate admin and user keys

4. **Rotate keys regularly**
   - Update keys periodically
   - Provide key rotation mechanisms
   - Log key usage for audit trails

5. **Use HTTPS in production**
   - API keys in headers are visible over HTTP
   - Always use TLS/HTTPS for production deployments

### Environment Variable Example

```typescript
import type { IApiKeyAuth, IServer } from 'simply-mcp';

interface EnvAuth extends IApiKeyAuth {
  type: 'apiKey';
  keys: [
    {
      name: 'admin';
      key: process.env.ADMIN_API_KEY || '';
      permissions: ['*'];
    },
    {
      name: 'user';
      key: process.env.USER_API_KEY || '';
      permissions: ['read:*'];
    }
  ];
}

interface SecureServer extends IServer {
  name: 'secure-server';
  version: '1.0.0';
  transport: 'http';
  port: 3000;
  auth: EnvAuth;
}

export default class SecureServer {
  name = 'secure-server' as const;
  version = '1.0.0' as const;
  transport = 'http' as const;
  port = 3000 as const;

  // Implementation...
}
```

**Run with environment variables:**
```bash
ADMIN_API_KEY=sk-admin-xxx USER_API_KEY=sk-user-yyy npx simply-mcp run server.ts
```

### OAuth 2.1 Authentication

**Available since:** v3.4.0

OAuth 2.1 provides industry-standard authentication with scope-based access control, powered by Anthropic's MCP SDK.

**Features:**
- Authorization Code + PKCE Flow (RFC 7636)
- Scope-based permissions
- Token refresh and revocation
- Audit logging
- MCP SDK integration

#### IOAuth2Auth Interface

```typescript
export interface IOAuth2Auth extends IAuth {
  /**
   * Authentication type - must be 'oauth2'
   */
  type: 'oauth2';

  /**
   * OAuth issuer URL (e.g., 'https://auth.example.com')
   * Used in OAuth metadata and token claims
   */
  issuerUrl: string;

  /**
   * Registered OAuth clients
   * Each client represents an application that can authenticate users
   */
  clients: IOAuthClient[];

  /**
   * Optional: Access token expiration in seconds
   * @default 3600 (1 hour)
   */
  tokenExpiration?: number;

  /**
   * Optional: Refresh token expiration in seconds
   * @default 86400 (24 hours)
   */
  refreshTokenExpiration?: number;

  /**
   * Optional: Authorization code expiration in seconds
   * @default 600 (10 minutes)
   */
  codeExpiration?: number;
}
```

#### IOAuthClient Interface

```typescript
export interface IOAuthClient {
  /**
   * OAuth client ID (unique identifier)
   */
  clientId: string;

  /**
   * Client secret (hashed with bcrypt)
   * SECURITY: Load from environment variables in production
   */
  clientSecret: string;

  /**
   * Allowed redirect URIs
   * Authorization codes only sent to these URIs
   * Must match exactly (including trailing slashes)
   */
  redirectUris: string[];

  /**
   * Allowed scopes for this client
   * Client can only request these scopes
   */
  scopes: string[];

  /**
   * Optional: Human-readable client name
   */
  name?: string;
}
```

#### Standard OAuth Scopes

Simply-MCP defines standard scopes that map to permissions:

| Scope | Permission | Description |
|-------|-----------|-------------|
| `read` | `read:*` | Read-only access to all resources |
| `write` | `write:*` | Write access to all resources |
| `tools:execute` | `tools:*` | Execute any tool |
| `resources:read` | `resources:*` | Read any resource |
| `prompts:read` | `prompts:*` | Read any prompt |
| `admin` | `*` | Full access to everything |

**Custom scopes:** Any scope not in the standard list passes through as-is for custom permission checking.

#### Quick OAuth Example

```typescript
import type { IServer, IOAuth2Auth } from 'simply-mcp';

interface MyOAuth extends IOAuth2Auth {
  type: 'oauth2';
  issuerUrl: 'http://localhost:3000';
  clients: [
    {
      clientId: 'web-app';
      clientSecret: process.env.OAUTH_CLIENT_SECRET!;
      redirectUris: ['http://localhost:8080/callback'];
      scopes: ['read', 'tools:execute'];
      name: 'Web Application';
    }
  ];
  tokenExpiration: 3600;        // 1 hour
  refreshTokenExpiration: 86400; // 24 hours
  codeExpiration: 600;           // 10 minutes
}

const server: IServer = {
  name: 'oauth-server',
  version: '1.0.0',
  description: 'OAuth-protected MCP server'
  transport: 'http';
  port: 3000;
  stateful: true;  // Required for OAuth
  auth: MyOAuth;
}

export default class MyServer {
  // Tool implementations...
}
```

#### OAuth Endpoints (Automatic)

When OAuth is configured, Simply-MCP automatically creates these endpoints:

- `GET /.well-known/oauth-authorization-server` - OAuth metadata (RFC 8414)
- `GET /oauth/authorize` - Authorization endpoint (PKCE required)
- `POST /oauth/token` - Token endpoint (exchange code for token)
- `POST /oauth/revoke` - Token revocation (RFC 7009)

#### Using OAuth Tokens

Clients authenticate API requests with Bearer tokens:

```bash
curl -X POST http://localhost:3000/mcp \
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

#### SecurityContext API

OAuth authentication creates a SecurityContext accessible in handlers:

```typescript
export default class MyServer {
  myTool: MyTool = async (params, context) => {
    // Access OAuth security context
    const permissions = context?.securityContext?.permissions || [];
    const isAdmin = permissions.includes('*');

    if (!isAdmin) {
      throw new Error('Unauthorized: admin scope required');
    }

    return { status: 'ok' };
  };
}
```

#### OAuth vs API Key Comparison

| Feature | OAuth 2.1 | API Keys |
|---------|-----------|----------|
| Security | Short-lived tokens, rotating secrets | Long-lived, static |
| Permissions | Scope-based, granular | Permission-based |
| User Context | Knows which application | Key name only |
| Revocation | Immediate, no secret change | Requires key rotation |
| Setup Complexity | Higher (authorization flow) | Simple |
| Best For | Production, third-party apps | Internal tools, testing |

#### Complete OAuth Documentation

For complete OAuth 2.1 documentation including:
- Authorization flow step-by-step
- PKCE implementation
- Token lifecycle (access, refresh, revocation)
- Scope system and custom scopes
- Security best practices
- Production deployment guide
- Migration from API keys

**See:** [OAuth 2.1 Guide](./OAUTH2.md)

#### Example OAuth Server

**See:** [interface-oauth-server.ts](../../examples/interface-oauth-server.ts) - Comprehensive OAuth example with:
- Multiple clients (admin, developer, viewer, analytics)
- Scope-based access control
- Complete testing guide with curl commands
- Production deployment checklist

---

## Running Servers

**Basic run commands:**

```bash
# STDIO transport (default)
npx simply-mcp run server.ts

# HTTP transport
npx simply-mcp run server.ts --http --port 3000

# With watch mode
npx simply-mcp run server.ts --watch

# With debugging
npx simply-mcp run server.ts --inspect
```

**Transport modes:**
- **stdio**: Standard input/output (for Claude Desktop)
- **http**: HTTP server with stateful (default) or stateless modes

**Common patterns:**

```bash
# Development with auto-restart
npx simply-mcp run server.ts --watch --verbose

# HTTP server with custom port
npx simply-mcp run server.ts --http --port 8080

# Validate without running
npx simply-mcp run server.ts --dry-run
```

---

## Handler Context API

Tool and resource handlers receive a `context` object that provides access to server-to-client communication features.

### reportProgress

Send a progress notification to the client during long-running operations.

**Signature:**
```typescript
reportProgress(progress: number, total?: number, message?: string): Promise<void>
```

**Parameters:**
- `progress` (number, required): Current progress value
- `total` (number, optional): Total value for percentage calculation
- `message` (string, optional): Human-readable status message describing current progress

**Availability:** Only available when the request includes a `progressToken`

**Since:** v4.0.0 (message parameter added in v4.1.0)

**Example:**
```typescript
import type { ITool, IParam, IServer } from 'simply-mcp';

interface FileCountParam extends IParam {
  type: 'number';
  description: 'Number of files to analyze';
}

interface AnalyzeDataTool extends ITool {
  name: 'analyze_data';
  description: 'Analyze multiple data files with progress tracking';
  params: { fileCount: FileCountParam };
  result: { summary: string };
}

export default class Server {
  analyzeData: AnalyzeDataTool = async ({ fileCount }, context) => {
    if (!context?.reportProgress) {
      throw new Error('This tool requires progress tracking');
    }

    for (let i = 0; i < fileCount; i++) {
      await context.reportProgress(
        i + 1,
        fileCount,
        `Analyzing file ${i + 1} of ${fileCount}`
      );

      // Do actual analysis
      await analyzeFile(i);
    }

    return { summary: `Analyzed ${fileCount} files successfully` };
  };
}
```

**Notes:**
- The `message` field is optional and backward compatible
- Messages provide context to users about what's happening
- Clients may display messages alongside progress bars or indicators
- Messages are transmitted to clients as part of the progress notification
- Always check for `context?.reportProgress` availability before use

**Best Practices:**

1. **Use descriptive messages:**
   ```typescript
   // Good
   await context.reportProgress(5, 20, "Processing file 5 of 20");
   await context.reportProgress(50, 100, "Compressing backup file...");

   // Less helpful
   await context.reportProgress(5, 20, "Step 5");
   await context.reportProgress(50, 100, "Working...");
   ```

2. **Keep messages concise:**
   ```typescript
   // Good - clear and brief
   await context.reportProgress(3, 8, "Uploading chunk 3 of 8");

   // Too verbose
   await context.reportProgress(3, 8, "Currently uploading the third chunk out of a total of eight chunks");
   ```

3. **Messages are optional - use when they add value:**
   ```typescript
   // With messages - useful for multi-stage operations
   await context.reportProgress(25, 100, "Fetching schema information...");
   await context.reportProgress(50, 100, "Exporting table data...");
   await context.reportProgress(75, 100, "Compressing backup...");

   // Without messages - fine for simple iteration
   for (let i = 0; i < items.length; i++) {
     await context.reportProgress(i + 1, items.length);
     await processItem(items[i]);
   }
   ```

**See Also:**
- [Protocol Guide - Progress Messages](./PROTOCOL.md#progress-messages)
- [Example: interface-progress-messages.ts](../../examples/interface-progress-messages.ts)

### Other Context Methods

For other context methods (sampling, elicitation, roots, etc.), see:
- [Protocol Guide](./PROTOCOL.md) - Complete protocol features documentation
- [Features Guide](./FEATURES.md) - Tool and resource patterns

---

## UI Resources

Simply-MCP provides **100% spec-compliant** MCP UI support compatible with the official [@mcp-ui](https://github.com/idosal/mcp-ui) specification.

### Creating UI Resources (SDK API)

The SDK API provides compatibility with the official @mcp-ui/server patterns:

```typescript
import { createUIResource } from 'simply-mcp';

const resource = createUIResource({
  uri: 'ui://calculator/v1',
  content: {
    type: 'rawHtml',
    htmlString: '<div><h1>Calculator</h1></div>'
  },
  metadata: {
    name: 'Simple Calculator',
    description: 'Add two numbers together'
  }
});

// Return in tool result
return { content: [resource] };
```

### Creating UI Resources (Interface API)

Alternatively, use the interface-based approach for zero boilerplate:

```typescript
interface CalculatorUI extends IUI {
  uri: 'ui://calculator/v1';
  name: 'Calculator';
  html: string;
  tools: ['add'];  // Tool allowlist for security
}

export default class Server {
  calculator: CalculatorUI = {
    html: `
      <h1>Calculator</h1>
      <input type="number" id="a" />
      <input type="number" id="b" />
      <button onclick="calculate()">Calculate</button>
      <div id="result"></div>

      <script>
        async function calculate() {
          const a = Number(document.getElementById('a').value);
          const b = Number(document.getElementById('b').value);

          // Call MCP tool using spec-compliant postMessage
          const messageId = 'calc_' + Date.now();

          window.parent.postMessage({
            type: 'tool',
            payload: {
              toolName: 'add',
              params: { a, b }
            },
            messageId: messageId
          }, '*');
        }
      </script>
    `
  };
}
```

### Rendering UI Resources (Client)

Client applications use the UIResourceRenderer component:

```typescript
import { UIResourceRenderer } from 'simply-mcp/client';
import type { UIAction } from 'simply-mcp/client';

function Dashboard() {
  const handleAction = async (action: UIAction) => {
    if (action.type === 'tool') {
      return await executeToolCall(
        action.payload.toolName,
        action.payload.params
      );
    }

    if (action.type === 'notify') {
      showNotification(
        action.payload.level,
        action.payload.message
      );
    }

    // Handle other action types...
  };

  return (
    <UIResourceRenderer
      resource={uiResource}
      onUIAction={handleAction}
      htmlProps={{
        style: { height: '600px' },
        className: 'custom-ui'
      }}
    />
  );
}
```

### PostMessage Protocol

UI resources communicate with the parent window using the official MCP-UI postMessage protocol:

**Tool Call:**
```javascript
window.parent.postMessage({
  type: 'tool',
  payload: {
    toolName: 'add_to_cart',
    params: { productId: '123', quantity: 1 }
  },
  messageId: 'msg_' + Date.now()
}, '*');
```

**Notification:**
```javascript
window.parent.postMessage({
  type: 'notify',
  payload: {
    level: 'success',  // 'info' | 'warning' | 'error' | 'success'
    message: 'Item added to cart!'
  }
}, '*');
```

**Response Format:**
```javascript
// Phase 1: Acknowledgment
{
  type: 'acknowledgment',
  messageId: 'msg_123'
}

// Phase 2: Result
{
  type: 'result',
  messageId: 'msg_123',
  result: { success: true, cartTotal: 5 }
}
```

### Supported MIME Types

| MIME Type | Description | Use Case |
|-----------|-------------|----------|
| `text/html` | Inline HTML content | Simple widgets, forms, dashboards |
| `text/uri-list` | External HTTPS URLs | Existing web apps, third-party widgets |
| `application/vnd.mcp-ui.remote-dom+javascript` | Remote DOM scripts | React components, maximum security |

### Security Model

All UI content is rendered in sandboxed iframes:

- ✅ Sandboxed execution (no parent DOM access)
- ✅ Origin validation on all postMessage events
- ✅ Tool allowlist enforcement
- ✅ HTTPS enforcement for external URLs
- ✅ Content Security Policy support

### Complete Example

```typescript
import type { IServer, ITool, IUI } from 'simply-mcp';

const server: IServer = {
  name: 'product-catalog',
  version: '1.0.0',
  description: 'Product catalog with interactive UI'
}

interface AddToCartTool extends ITool {
  name: 'add_to_cart';
  description: 'Add product to cart';
  params: {
    productId: string;
    quantity: number;
  };
  result: {
    success: boolean;
    cartTotal: number;
  };
}

interface ProductCardUI extends IUI {
  uri: 'ui://product-card/v1';
  name: 'Product Card';
  description: 'Interactive product display';
  html: string;
  css: string;
  tools: ['add_to_cart'];  // Security: Only allow add_to_cart
}

export default class Server {
  addToCart: AddToCartTool = async ({ productId, quantity }) => {
    // Add to cart logic
    return { success: true, cartTotal: 5 };
  };

  productCard: ProductCardUI = {
    html: `
      <div id="product">
        <h2>Amazing Product</h2>
        <p>$99.99</p>
        <input type="number" id="qty" value="1" min="1" />
        <button onclick="addToCart()">Add to Cart</button>
        <div id="message"></div>
      </div>

      <script>
        async function addToCart() {
          const quantity = Number(document.getElementById('qty').value);
          const messageId = 'cart_' + Date.now();

          // Send tool call
          window.parent.postMessage({
            type: 'tool',
            payload: {
              toolName: 'add_to_cart',
              params: { productId: 'prod_123', quantity }
            },
            messageId: messageId
          }, '*');

          // Listen for result
          window.addEventListener('message', function handler(event) {
            if (event.data.messageId === messageId && event.data.type === 'result') {
              const result = event.data.result;
              document.getElementById('message').textContent =
                result.success ? 'Added to cart! Total: ' + result.cartTotal : 'Error';
              window.removeEventListener('message', handler);
            }
          });
        }
      </script>
    `,
    css: `
      #product {
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 8px;
      }
      button {
        background: #007bff;
        color: white;
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
    `
  };
}
```

### Learn More

- [MCP UI Protocol Reference](./MCP_UI_PROTOCOL.md) - Complete protocol documentation
- [MCP UI Migration Guide](./MCP_UI_MIGRATION.md) - Migrating from legacy formats
- [UI Watch Mode Guide](./UI_WATCH_MODE.md) - Hot reload for UI development
- [Examples](../../examples/) - Working code examples

---

## Related Guides

- [Features Guide](./FEATURES.md) - Tools, prompts, resources
- [Protocol Guide](./PROTOCOL.md) - Advanced protocol features
- [Quick Start](./QUICK_START.md) - Get started quickly
- [Examples Index](../../examples/EXAMPLES_INDEX.md) - Code examples

