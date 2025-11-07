# MCP Client Library

Comprehensive TypeScript client library for the Model Context Protocol with support for all 9 MCP primitives.

## Overview

This library provides a type-safe, production-ready client for interacting with MCP servers built using simply-mcp.

**Location**: `/mnt/Shared/cs-projects/simply-mcp-ts/mcp-interpreter/lib/mcp/`

## Features

- ✅ **All 9 MCP Primitives** - Full protocol support
- ✅ **Type-Safe** - Comprehensive TypeScript interfaces
- ✅ **Connection Management** - Robust connect/disconnect handling
- ✅ **Message Logging** - Protocol message tracking for debugging
- ✅ **Singleton Pattern** - Global instance for app-wide state
- ✅ **Error Handling** - Graceful error propagation
- ✅ **Zero TypeScript Errors** - Strict mode compliant

## Architecture

### Files

```
lib/mcp/
├── types.ts      (203 lines, 8.0KB)  - Type definitions
├── client.ts     (717 lines, 20KB)   - Main client implementation
├── index.ts      (50 lines, 4.0KB)   - Export barrel
└── README.md                         - This file
```

**Total**: 970 lines, 32KB

## MCP Primitives Implementation

### 1. Tools ✅
Execute tools with parameters

**Methods**:
- `listTools(): Promise<Tool[]>` - List all available tools
- `executeTool(name, parameters): Promise<ToolExecutionResult>` - Execute a tool

**Example**:
```typescript
const tools = await mcpClient.listTools();
const result = await mcpClient.executeTool('calculate', { a: 5, b: 3 });
```

### 2. Resources ✅
List and read resources

**Methods**:
- `listResources(): Promise<Resource[]>` - List all resources
- `readResource(uri): Promise<ResourceContent>` - Read resource content

**Example**:
```typescript
const resources = await mcpClient.listResources();
const content = await mcpClient.readResource('file:///config.json');
```

### 3. Prompts ✅
List prompts and get prompt messages

**Methods**:
- `listPrompts(): Promise<Prompt[]>` - List all prompts
- `getPrompt(name, arguments): Promise<PromptResult>` - Get prompt messages

**Example**:
```typescript
const prompts = await mcpClient.listPrompts();
const messages = await mcpClient.getPrompt('code_review', { language: 'typescript' });
```

### 4. Roots ✅
List directory roots

**Methods**:
- `listRoots(): Promise<Root[]>` - List all directory roots

**Example**:
```typescript
const roots = await mcpClient.listRoots();
```

### 5. Elicitation ✅
Handle elicitation requests from tools (client-side)

**Methods**:
- `setElicitationHandler(handler)` - Register elicitation handler
- `handleElicitation(request): Promise<ElicitationResponse>` - Handle request

**Example**:
```typescript
mcpClient.setElicitationHandler(async (request) => {
  // Show UI form based on request.data.fields
  return { fields: { username: 'john', password: '***' } };
});
```

### 6. Completions ✅
Get argument autocomplete suggestions

**Methods**:
- `getCompletions(request): Promise<CompletionResult>` - Get autocomplete suggestions

**Example**:
```typescript
const completions = await mcpClient.getCompletions({
  ref: { type: 'ref/prompt', name: 'code_review' },
  argument: { name: 'language', value: 'type' }
});
```

### 7. Sampling ✅
Handle sampling requests (client-side LLM calls)

**Methods**:
- `setSamplingHandler(handler)` - Register sampling handler
- `handleSampling(request): Promise<SamplingResponse>` - Handle request

**Example**:
```typescript
mcpClient.setSamplingHandler(async (request) => {
  // Call LLM API with request.data.messages
  return {
    role: 'assistant',
    content: { type: 'text', text: 'Response' },
    model: 'claude-3-5-sonnet-20241022'
  };
});
```

### 8. Subscriptions ✅
Subscribe to resource updates

**Methods**:
- `subscribeToResource(uri, callback)` - Subscribe to updates
- `unsubscribeFromResource(uri)` - Unsubscribe
- `getActiveSubscriptions(): string[]` - List active subscriptions

**Example**:
```typescript
await mcpClient.subscribeToResource('file:///logs', (content) => {
  console.log('Updated:', content.text);
});
```

### 9. Logs ✅
Stream protocol messages

**Methods**:
- `onMessage(listener): () => void` - Register message listener
- `getMessages(): ProtocolMessage[]` - Get all messages
- `getMessagesByType(type)` - Filter by type
- `getMessagesByDirection(direction)` - Filter by direction
- `clearMessages()` - Clear message log

**Example**:
```typescript
const unsubscribe = mcpClient.onMessage((message) => {
  console.log(`[${message.direction}] ${message.type}`, message.content);
});
```

## Usage

### Basic Connection

```typescript
import { mcpClient } from '@/lib/mcp';

// Connect to server
const info = await mcpClient.connect('/path/to/server.ts');

if (info.status === 'connected') {
  console.log(`Connected to ${info.serverName} v${info.serverVersion}`);

  // Check capabilities
  const caps = mcpClient.getCapabilities();
  console.log('Server supports:', caps);

  // Use primitives
  const tools = await mcpClient.listTools();
  const resources = await mcpClient.listResources();

  // Disconnect when done
  await mcpClient.disconnect();
}
```

### With Next.js API Routes

```typescript
// app/api/mcp/tools/route.ts
import { mcpClient } from '@/lib/mcp';

export async function GET() {
  if (!mcpClient.isConnected()) {
    return Response.json({ error: 'Not connected' }, { status: 400 });
  }

  const tools = await mcpClient.listTools();
  return Response.json({ tools });
}

export async function POST(request: Request) {
  const { name, parameters } = await request.json();
  const result = await mcpClient.executeTool(name, parameters);
  return Response.json(result);
}
```

### Message Logging

```typescript
// Log all protocol messages
mcpClient.onMessage((message) => {
  console.log(`[${message.timestamp.toISOString()}] ${message.direction} ${message.type}`);
});

// Get all messages for debugging
const allMessages = mcpClient.getMessages();

// Filter by type
const toolCalls = mcpClient.getMessagesByType('tools/call');

// Filter by direction
const sentMessages = mcpClient.getMessagesByDirection('sent');
```

## Type Definitions

All types are exported from `lib/mcp/types.ts`:

```typescript
// Connection
ConnectionInfo, ConnectionStatus, ServerCapabilities

// Tools
Tool, ToolExecutionResult

// Resources
Resource, ResourceContent

// Prompts
Prompt, PromptMessage, PromptResult

// Roots
Root

// Completions
CompletionRequest, CompletionResult

// Elicitation
ElicitationRequest, ElicitationResponse

// Sampling
SamplingRequest, SamplingResponse

// Subscriptions
Subscription

// Logs
ProtocolMessage
```

## Integration with Simply-MCP

This library integrates with the local simply-mcp build:

```typescript
// Imports from local dist build
const { loadInterfaceServer } = await import(
  '/mnt/Shared/cs-projects/simply-mcp-ts/dist/src/server/adapter.js'
);
```

**Requirements**:
- Simply-MCP must be built (`npm run build` in parent directory)
- Server files must use interface-based API
- MCP SDK version: @modelcontextprotocol/sdk@1.20.2

## Error Handling

All methods throw errors on failure:

```typescript
try {
  const result = await mcpClient.executeTool('calculate', { a: 5 });
} catch (error) {
  console.error('Tool execution failed:', error);
}
```

Connection errors return error status:

```typescript
const info = await mcpClient.connect('/invalid/path');
if (info.status === 'error') {
  console.error('Connection failed:', info.error);
}
```

## Build Verification

```bash
# Type check
npx tsc --noEmit

# Build Next.js app
npm run build
```

**Result**: ✅ Zero TypeScript errors, build succeeds

## Next Steps

This client library will be used by the API Routes Agent to create Next.js API endpoints for the UI.

**Upcoming**:
1. API routes for each primitive (`/api/mcp/tools`, `/api/mcp/resources`, etc.)
2. React hooks for UI integration
3. WebSocket support for real-time subscriptions
4. Test suite for client methods

## License

Part of the simply-mcp-ts project.
