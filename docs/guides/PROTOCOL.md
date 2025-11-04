# MCP Protocol Features Guide

Advanced server-to-client communication features in the MCP protocol.

---

## Table of Contents

- [Sampling](#sampling) - Request LLM completions from clients
- [Elicitation](#elicitation) - Request user input during tool execution
- [Roots](#roots) - Discover client root directories
- [Subscriptions](#subscriptions) - Notify clients of resource updates
- [Completions](#completions) - Provide autocomplete suggestions
- [Progress Messages](#progress-messages) - Send progress notifications with status messages

---

# Sampling

Request LLM completions from the MCP client for AI-assisted tools.

## Overview

Sampling allows your MCP server to request LLM completions from the client. This is useful for:
- AI-assisted code generation
- Natural language processing within tools
- Delegating complex reasoning to the client's LLM

## Usage

```typescript
import type { ITool, IParam } from 'simply-mcp';

interface CodeParam extends IParam {
  type: 'string';
  description: 'Code to explain';
}

interface ExplainCodeTool extends ITool {
  name: 'explain_code';
  description: 'Explain code using AI';
  params: { code: CodeParam };
  result: { explanation: string };
}

export default class MyServer implements IServer {
  explainCode: ExplainCodeTool = async (params, context) => {
    if (!context?.sample) {
      return { explanation: 'Sampling not available' };
    }

    const messages = [{
      role: 'user' as const,
      content: { type: 'text' as const, text: `Explain: ${params.code}` }
    }];

    const result = await context.sample(messages, {
      maxTokens: 500,
      temperature: 0.7
    });

    return { explanation: result.content.text };
  };
}
```

**See:** [examples/interface-sampling.ts](../../examples/interface-sampling.ts)

---

# Elicitation

Request structured user input during tool execution.

## Overview

Elicitation allows your server to pause tool execution and request user input via a form. Useful for:
- Collecting API keys or credentials
- Confirming destructive operations
- Getting user preferences mid-execution

## Usage

```typescript
interface ConfigureTool extends ITool {
  name: 'configure_api';
  description: 'Configure API settings';
  params: {};
  result: { success: boolean };
}

export default class MyServer implements IServer {
  configureApi: ConfigureTool = async (params, context) => {
    if (!context?.elicitInput) {
      return { success: false };
    }

    const result = await context.elicitInput(
      'Please enter your API key',
      {
        apiKey: {
          type: 'string',
          title: 'API Key',
          minLength: 10
        }
      }
    );

    if (result.action === 'accept') {
      // Store API key
      return { success: true };
    }

    return { success: false };
  };
}
```

**See:** [examples/interface-elicitation.ts](../../examples/interface-elicitation.ts)

---

# Roots

Request the client's root directories for file operation scoping.

## Overview

Roots allow your server to discover which directories the client considers "roots" (typically project directories). Useful for:
- Scoping file operations to project directories
- Validating file paths
- Building file trees

## Usage

```typescript
interface ListProjectFilesTool extends ITool {
  name: 'list_project_files';
  description: 'List files in project directories';
  params: {};
  result: { roots: Array<{ uri: string; name?: string }> };
}

export default class MyServer implements IServer {
  listProjectFiles: ListProjectFilesTool = async (params, context) => {
    if (!context?.listRoots) {
      return { roots: [] };
    }

    const roots = await context.listRoots();
    // roots = [{ uri: 'file:///path/to/project', name: 'My Project' }]

    return { roots };
  };
}
```

**See:** [examples/interface-roots.ts](../../examples/interface-roots.ts)

---

# Subscriptions

Notify clients when resource content changes.

## Overview

Subscriptions allow your server to push notifications when resources update. Clients can subscribe to specific resources and receive updates in real-time.

## Defining Subscribable Resources

Mark resources as `dynamic` to enable subscriptions:

```typescript
interface StatsResource extends IResource {
  uri: 'stats://current';
  name: 'Current Statistics';
  mimeType: 'application/json';
  returns: { activeConnections: number };
}

export default class MyServer implements IServer {
  'stats://current': StatsResource = async () => {
    return {
      activeConnections: connectionPool.size
    };
  };
}
```

## Sending Update Notifications

Use the server's notification method to push updates:

```typescript
import { InterfaceServer } from 'simply-mcp';

class MyServer implements IServer {
  private connections = 0;

  async onNewConnection(server: InterfaceServer) {
    this.connections++;

    // Notify all subscribers
    await server.notifyResourceUpdate('stats://current');
  }
}
```

**See:** [examples/interface-subscriptions.ts](../../examples/interface-subscriptions.ts)

---

# Completions

Provide autocomplete suggestions for prompt arguments.

## Overview

Completions allow your server to provide autocomplete suggestions when users are filling out prompt arguments. This improves UX for prompts with constrained argument values.

## Usage

```typescript
interface ICompletion<T = string[]> {
  name: string;
  description: string;
  ref: {
    type: 'argument';
    name: string;  // Argument name to autocomplete
  };
}

interface CityCompletion extends ICompletion<string[]> {
  name: 'city_autocomplete';
  description: 'Autocomplete city names';
  ref: { type: 'argument'; name: 'city' };
}

export default class MyServer implements IServer {
  cityAutocomplete: CityCompletion = async (value: string) => {
    const cities = ['New York', 'Los Angeles', 'London', 'Tokyo'];
    return cities.filter(c =>
      c.toLowerCase().startsWith(value.toLowerCase())
    );
  };
}
```

**See:** [examples/interface-completions.ts](../../examples/interface-completions.ts)

---

# Progress Messages

Send progress notifications with human-readable status messages during long-running operations.

## Overview

Progress notifications support an optional `message` field to provide human-readable status updates during long-running operations. This helps users understand what's happening beyond just numeric progress.

## Usage

```typescript
await reportProgress(progress: number, total?: number, message?: string): Promise<void>
```

**Parameters:**
- `progress` (number): Current progress value
- `total` (number, optional): Total value for percentage calculation
- `message` (string, optional): Human-readable status message

**Example:**

```typescript
interface ProcessFilesTool extends ITool {
  name: 'process_files';
  description: 'Process multiple files with progress';
  params: { fileCount: number };
  result: { success: boolean };
}

export default class MyServer implements IServer {
  processFiles: ProcessFilesTool = async ({ fileCount }, context) => {
    if (!context?.reportProgress) {
      throw new Error('This tool requires progress tracking');
    }

    for (let i = 0; i < fileCount; i++) {
      // Report progress with descriptive message
      await context.reportProgress(
        i + 1,
        fileCount,
        `Processing file ${i + 1} of ${fileCount}`
      );

      // Do actual work
      await processFile(i);
    }

    return { success: true };
  };
}
```

## Notification Format

When sent to the client, progress messages follow this format:

```json
{
  "method": "notifications/progress",
  "params": {
    "progressToken": "task-123",
    "progress": 5,
    "total": 20,
    "message": "Processing file 5 of 20"
  }
}
```

## Best Practices

**Keep messages concise and descriptive:**
```typescript
// Good
await reportProgress(3, 8, "Uploading chunk 3 of 8");
await reportProgress(45, 100, "Analyzing data: 45% complete");
await reportProgress(1, 1, "Connecting to database...");

// Less helpful
await reportProgress(3, 8, "Step 3");
await reportProgress(45, 100, "Working...");
```

**Use messages to explain what's happening, not just repeat the numbers:**
```typescript
// Good - adds context
await reportProgress(50, 100, "Compressing backup file...");

// Less helpful - just repeats the number
await reportProgress(50, 100, "50% complete");
```

**Messages are optional - use them when they add value:**
```typescript
// With message - useful for multi-stage operations
await reportProgress(25, 100, "Fetching schema information...");
await reportProgress(50, 100, "Exporting table data...");
await reportProgress(75, 100, "Compressing backup...");

// Without message - fine for simple progress
for (let i = 0; i < items.length; i++) {
  await reportProgress(i + 1, items.length);
  await processItem(items[i]);
}
```

## Examples of Good Messages

- **Connection/Setup**: "Connecting to database...", "Initializing environment..."
- **File Operations**: "Processing file 5 of 20", "Uploading chunk 3 of 8"
- **Data Processing**: "Analyzing data: 45% complete", "Generating insights..."
- **Multi-Stage**: "Fetching schema...", "Exporting data...", "Verifying integrity..."

## Availability

Progress reporting (including messages) is only available when the request includes a `progressToken`. Always check for availability:

```typescript
export default class MyServer implements IServer {
  myTool: MyTool = async (params, context) => {
    if (!context?.reportProgress) {
      // Progress not available - handle gracefully
      return doWorkWithoutProgress(params);
    }

    // Progress available - use it
    await context.reportProgress(0, 100, "Starting...");
    // ... do work ...
  };
}
```

**See:** [examples/interface-progress-messages.ts](../../examples/interface-progress-messages.ts)

---

## JSON-RPC 2.0 Batch Requests

Simply-MCP supports the JSON-RPC 2.0 batch request specification, allowing multiple requests to be sent in a single message for improved performance and reduced network overhead.

### Overview

Batch requests enable clients to send multiple JSON-RPC requests in a single array, receiving all responses together. This provides significant performance benefits:

- **5x throughput improvement** in parallel mode (940 vs 192 req/sec)
- **Minimal overhead**: Only 1.9% compared to individual requests
- **Reduced latency**: Single network round-trip for multiple operations
- **Order control**: Sequential or parallel processing modes

### Batch Request Format

Instead of sending a single request object, send an array of request objects:

```json
[
  {"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"tool1","arguments":{}}},
  {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"tool2","arguments":{}}},
  {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"tool3","arguments":{}}}
]
```

**JSON-RPC 2.0 Specification:**
- Each request must have `jsonrpc: "2.0"`
- Each request must have a unique `id` for response correlation
- Array must contain at least 1 request
- Maximum array size controlled by server `maxBatchSize` configuration

### Batch Response Format

The server returns an array of response objects, one for each request:

```json
[
  {"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"Result 1"}]}},
  {"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"Result 2"}]}},
  {"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"Result 3"}]}}
]
```

**Response Characteristics:**
- Response array maintains same order as request array
- Each response includes the same `id` as its corresponding request
- Individual failures don't stop other requests
- Partial results returned even if some requests fail

### Request ID Mapping

Each response contains the same `id` as its corresponding request, allowing clients to correlate responses:

```json
// Request with id:1 → Response with id:1
// Request with id:2 → Response with id:2
// Request with id:3 → Response with id:3
```

**Client-side correlation example:**

```typescript
const requests = [
  { id: 1, method: 'tools/call', params: { name: 'export_record', arguments: { id: 'A' } } },
  { id: 2, method: 'tools/call', params: { name: 'export_record', arguments: { id: 'B' } } },
  { id: 3, method: 'tools/call', params: { name: 'export_record', arguments: { id: 'C' } } }
];

const responses = await sendBatch(requests);

// Map responses back to requests
const resultMap = new Map(responses.map(r => [r.id, r.result || r.error]));
const resultA = resultMap.get(1);  // Result for request id:1
const resultB = resultMap.get(2);  // Result for request id:2
const resultC = resultMap.get(3);  // Result for request id:3
```

### Processing Modes

Simply-MCP supports two processing modes for batch requests, configured via the `batching.parallel` option.

#### Sequential Processing

Requests are processed in the order they appear in the batch array:

```json
[
  {"id":1, ...},  // Processed first
  {"id":2, ...},  // Processed second (after id:1 completes)
  {"id":3, ...}   // Processed third (after id:2 completes)
]
```

**Configuration:**
```typescript
batching: {
  enabled: true,
  parallel: false  // Sequential mode
}
```

**Use Cases:**
- Database record imports (referential integrity)
- State machine transitions
- Migration scripts
- Any operation where later requests depend on earlier ones

**Performance:** ~192 req/sec

#### Parallel Processing

Requests are processed concurrently for maximum throughput:

```json
[
  {"id":1, ...},  // Processed concurrently
  {"id":2, ...},  // Processed concurrently
  {"id":3, ...}   // Processed concurrently
]
```

**Configuration:**
```typescript
batching: {
  enabled: true,
  parallel: true  // Parallel mode (5x faster)
}
```

**Use Cases:**
- Data exports (independent records)
- Analytics queries (aggregating datasets)
- Bulk reads
- Any operation where requests don't depend on each other

**Performance:** ~940 req/sec (5x improvement)

**Note:** Responses still maintain the same order as requests in the response array, even though processing happens concurrently.

### Error Handling

Individual request failures don't affect other requests in the batch. Each response contains either a `result` or `error` field:

```json
[
  {"jsonrpc":"2.0","id":1,"result":{"content":[...]}},                    // Success
  {"jsonrpc":"2.0","id":2,"error":{"code":-32000,"message":"..."}},       // Error
  {"jsonrpc":"2.0","id":3,"result":{"content":[...]}}                     // Success
]
```

**Error Types:**

1. **Tool execution errors** - Error in individual tool logic:
   ```json
   {
     "jsonrpc": "2.0",
     "id": 2,
     "error": {
       "code": -32000,
       "message": "Validation failed for value 42"
     }
   }
   ```

2. **Timeout errors** - Batch timeout exceeded:
   ```json
   {
     "jsonrpc": "2.0",
     "id": 3,
     "error": {
       "code": -32000,
       "message": "Batch timeout exceeded"
     }
   }
   ```

3. **Batch-level errors** - Entire batch rejected (before processing):
   ```json
   {
     "jsonrpc": "2.0",
     "id": null,
     "error": {
       "code": -32600,
       "message": "Batch size exceeds maximum (100)"
     }
   }
   ```

**Client Error Handling Pattern:**

```typescript
const responses = await sendBatch(requests);

responses.forEach((response, index) => {
  if (response.error) {
    if (response.error.code === -32000 && response.error.message.includes('timeout')) {
      // Timeout error - retry entire batch with larger timeout
      console.log('Batch timeout - retrying...');
    } else {
      // Tool-level error - only retry this specific request
      console.log(`Request ${index} failed:`, response.error.message);
    }
  } else {
    // Success - process result
    console.log(`Request ${index} succeeded:`, response.result);
  }
});
```

### Batch Context Propagation

When processing batch requests, Simply-MCP injects batch context into the tool execution context:

```typescript
interface BatchContext {
  size: number;         // Total number of requests in batch
  index: number;        // Zero-based index of current request [0, size-1]
  parallel: boolean;    // Whether batch is processed in parallel
  batchId?: string;     // Unique batch identifier (Feature Layer)
  startTime?: number;   // Batch start timestamp (Feature Layer)
  elapsedMs?: number;   // Milliseconds since batch start (Feature Layer)
}
```

**Access in tool handlers:**

```typescript
server.addTool({
  name: 'process_item',
  description: 'Process an item',
  parameters: z.object({
    item_id: z.string()
  }),
  execute: async (params, context) => {
    if (context?.batch) {
      console.log(`Processing ${context.batch.index + 1}/${context.batch.size}`);
      console.log(`Mode: ${context.batch.parallel ? 'parallel' : 'sequential'}`);

      // First request - initialize batch resources
      if (context.batch.index === 0) {
        initializeBatchResources();
      }

      // Last request - cleanup batch resources
      if (context.batch.index === context.batch.size - 1) {
        cleanupBatchResources();
      }
    }

    // Tool logic
    return { content: [{ type: 'text', text: 'Processed' }] };
  }
});
```

**Benefits of batch context:**
- Detect batch vs individual requests
- Track progress (index/size)
- Optimize resource usage (initialize on first, cleanup on last)
- Report batch-aware metrics
- Implement batch-level caching

### Limitations

1. **Batch size limit:** Default 100 requests (configurable via `maxBatchSize`)
   ```typescript
   batching: {
     maxBatchSize: 100  // Reject batches larger than this
   }
   ```

2. **Transport support:** Currently only stdio transport supports batching
   - HTTP transport support planned for future release

3. **Mixed methods:** All requests in a batch should use the same method type
   - Best practice: Use `tools/call` for all requests in a batch
   - Mixing `tools/call` and `resources/read` may have unexpected behavior

4. **Timeout enforcement:** Per-batch timeout (not per-request)
   - Timeout applies to entire batch execution time
   - Individual slow requests can cause entire batch timeout
   - Use appropriate timeout values for your workload

### Implementation Details

Simply-MCP wraps the MCP SDK's stdio transport to provide batch support:

1. **Detection:** Detect incoming batch arrays before SDK validation
2. **Splitting:** Split batch into individual messages with injected context
3. **Processing:** Process messages according to configuration (sequential/parallel)
4. **Collection:** Collect responses and send as batch array
5. **Error isolation:** Individual failures don't stop batch processing

This approach works around the SDK's lack of native batch support while maintaining full JSON-RPC 2.0 compliance.

### Performance Characteristics

Based on measured benchmarks with 50ms simulated operation time:

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

### Example Usage

**Client-side example using raw JSON-RPC:**

```javascript
// Send batch request via stdio
const batchRequest = [
  {"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"export_record","arguments":{"id":"A"}}},
  {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"export_record","arguments":{"id":"B"}}},
  {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"export_record","arguments":{"id":"C"}}}
];

// Responses returned in same order
const batchResponse = [
  {"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"Record A exported"}]}},
  {"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"Record B exported"}]}},
  {"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"Record C exported"}]}}
];
```

**Server-side example:**

See [examples/interface-batch-requests.ts](../../examples/interface-batch-requests.ts) for complete server implementation including:
- Sequential and parallel processing examples
- Batch context usage patterns
- Resource management with batch awareness
- Error handling demonstrations
- Performance comparisons

**Performance benchmarks:**

See [tests/performance/batch-performance.test.ts](../../tests/performance/batch-performance.test.ts) for detailed performance measurements.

---

## HandlerContext Methods

All protocol features are accessed via the `context` parameter in tool handlers:

### context.sample()

```typescript
context.sample(
  messages: ISamplingMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<{ content: { text: string } }>
```

Request LLM completion from client.

### context.elicitInput()

```typescript
context.elicitInput(
  prompt: string,
  args: Record<string, JSONSchema>
): Promise<{
  action: 'accept' | 'decline' | 'cancel';
  content?: Record<string, any>;
}>
```

Request user input via form.

### context.listRoots()

```typescript
context.listRoots(): Promise<Array<{
  uri: string;
  name?: string;
}>>
```

Get client's root directories.

### context.reportProgress()

```typescript
context.reportProgress(
  progress: number,
  total?: number,
  message?: string
): Promise<void>
```

Send progress notification during long-running operations. The optional `message` parameter provides human-readable status updates.

**Since:** v4.0.0 (message parameter added in v4.1.0)

---

## Capability Detection

Always check if a capability is available before using:

```typescript
export default class MyServer implements IServer {
  myTool: MyTool = async (params, context) => {
    // Check if sampling is available
    if (!context?.sample) {
      return { error: 'Sampling not supported by client' };
    }

    // Safe to use
    const result = await context.sample(messages);
    return result;
  };
}
```

---

## Related Guides

- [Features Guide](./FEATURES.md) - Tools, prompts, resources
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Quick Start](./QUICK_START.md) - Get started quickly
