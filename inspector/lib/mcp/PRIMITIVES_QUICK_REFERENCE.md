# MCP Primitives Quick Reference

Quick reference for all 9 MCP primitives implemented in the client library.

## Import

```typescript
import { mcpClient } from '@/lib/mcp';
```

## 1. Tools - Execute operations

```typescript
// List all tools
const tools: Tool[] = await mcpClient.listTools();
// Returns: [{ name: "calculate", description: "...", inputSchema: {...} }]

// Execute a tool
const result = await mcpClient.executeTool('calculate', { a: 5, b: 3 });
// Returns: { content: [{ type: "text", text: "Result: 8" }], isError: false }
```

## 2. Resources - Access data

```typescript
// List all resources
const resources: Resource[] = await mcpClient.listResources();
// Returns: [{ uri: "file:///config.json", name: "Config", mimeType: "application/json" }]

// Read resource content
const content = await mcpClient.readResource('file:///config.json');
// Returns: { uri: "...", text: "{...}", mimeType: "application/json" }
```

## 3. Prompts - Get LLM templates

```typescript
// List all prompts
const prompts: Prompt[] = await mcpClient.listPrompts();
// Returns: [{ name: "code_review", description: "...", arguments: [...] }]

// Get prompt messages
const result = await mcpClient.getPrompt('code_review', { language: 'typescript' });
// Returns: { messages: [{ role: "user", content: {...} }], description: "..." }
```

## 4. Roots - List directories

```typescript
// List all roots
const roots: Root[] = await mcpClient.listRoots();
// Returns: [{ uri: "file:///home/user/projects", name: "Projects" }]
```

## 5. Elicitation - Handle user input requests

```typescript
// Register handler (once at app startup)
mcpClient.setElicitationHandler(async (request) => {
  // request.data.prompt = "Enter credentials"
  // request.data.fields = [{ name: "username", type: "text", required: true }, ...]

  // Show UI form and collect input
  return { fields: { username: 'john', password: '***' } };
});

// Handler automatically called when tools request input
```

## 6. Completions - Get autocomplete

```typescript
// Get autocomplete suggestions
const result = await mcpClient.getCompletions({
  ref: { type: 'ref/prompt', name: 'code_review' },
  argument: { name: 'language', value: 'type' }
});
// Returns: { completion: { values: ["typescript", "typst"], total: 2, hasMore: false } }
```

## 7. Sampling - Handle LLM requests

```typescript
// Register handler (once at app startup)
mcpClient.setSamplingHandler(async (request) => {
  // request.data.messages = [{ role: "user", content: "..." }]
  // request.data.temperature = 0.7
  // request.data.maxTokens = 1000

  // Call your LLM API
  const response = await callLLMAPI(request.data.messages);

  return {
    role: 'assistant',
    content: { type: 'text', text: response },
    model: 'claude-3-5-sonnet-20241022',
    stopReason: 'endTurn'
  };
});

// Handler automatically called when tools need LLM completions
```

## 8. Subscriptions - Watch for updates

```typescript
// Subscribe to resource
await mcpClient.subscribeToResource('file:///logs', (content) => {
  console.log('Log updated:', content.text);
  // Update UI with new content
});

// Unsubscribe
await mcpClient.unsubscribeFromResource('file:///logs');

// List active subscriptions
const active = mcpClient.getActiveSubscriptions();
// Returns: ["file:///logs", "file:///status"]
```

## 9. Logs - Monitor protocol

```typescript
// Listen to all messages
const unsubscribe = mcpClient.onMessage((message) => {
  console.log(`[${message.timestamp.toISOString()}]`);
  console.log(`  Direction: ${message.direction}`); // "sent" | "received"
  console.log(`  Type: ${message.type}`);           // "tools/call", etc.
  console.log(`  Content:`, message.content);
});

// Get all messages
const allMessages = mcpClient.getMessages();

// Filter by type
const toolCalls = mcpClient.getMessagesByType('tools/call');

// Filter by direction
const sentMessages = mcpClient.getMessagesByDirection('sent');

// Clear message log
mcpClient.clearMessages();

// Unsubscribe from listener
unsubscribe();
```

## Connection Management

```typescript
// Connect to server
const info = await mcpClient.connect('/path/to/server.ts');
if (info.status === 'connected') {
  console.log(`Connected to ${info.serverName} v${info.serverVersion}`);
}

// Check connection status
const status = mcpClient.getConnectionStatus();
// Returns: { status: "connected", serverName: "My Server", serverVersion: "1.0.0" }

// Check if connected
if (mcpClient.isConnected()) {
  // Safe to make requests
}

// Get server capabilities
const caps = mcpClient.getCapabilities();
// Returns: { tools: true, resources: true, prompts: true, ... }

// Disconnect
await mcpClient.disconnect();
```

## Error Handling

```typescript
// All methods throw on error
try {
  const result = await mcpClient.executeTool('invalid', {});
} catch (error) {
  console.error('Tool execution failed:', error);
}

// Connection errors use status field
const info = await mcpClient.connect('/invalid/path');
if (info.status === 'error') {
  console.error('Connection failed:', info.error);
}
```

## Type Imports

```typescript
import type {
  // Connection
  ConnectionInfo,
  ConnectionStatus,
  ServerCapabilities,

  // Tools
  Tool,
  ToolExecutionResult,

  // Resources
  Resource,
  ResourceContent,

  // Prompts
  Prompt,
  PromptMessage,
  PromptResult,

  // Roots
  Root,

  // Completions
  CompletionRequest,
  CompletionResult,

  // Elicitation
  ElicitationRequest,
  ElicitationResponse,

  // Sampling
  SamplingRequest,
  SamplingResponse,

  // Subscriptions
  Subscription,

  // Logs
  ProtocolMessage,
} from '@/lib/mcp';
```

## Common Patterns

### Check capability before use

```typescript
const caps = mcpClient.getCapabilities();

if (caps.tools) {
  const tools = await mcpClient.listTools();
}

if (caps.subscriptions) {
  await mcpClient.subscribeToResource('file:///data', onUpdate);
}
```

### Handle client-side requests

```typescript
// Set handlers at app startup
mcpClient.setElicitationHandler(showElicitationDialog);
mcpClient.setSamplingHandler(callLLMAPI);

// Then tools can request these services seamlessly
const result = await mcpClient.executeTool('interactive_tool', {});
```

### Monitor all activity

```typescript
mcpClient.onMessage((msg) => {
  if (msg.direction === 'sent') {
    console.log('Request:', msg.type, msg.content);
  } else {
    console.log('Response:', msg.type, msg.content);
  }
});
```

## Full Example

```typescript
import { mcpClient } from '@/lib/mcp';

async function demo() {
  // 1. Connect
  const info = await mcpClient.connect('/path/to/server.ts');
  if (info.status !== 'connected') {
    console.error('Connection failed:', info.error);
    return;
  }

  // 2. Set up logging
  mcpClient.onMessage((msg) => console.log(msg.type));

  // 3. Set up handlers
  mcpClient.setElicitationHandler(async (req) => ({
    fields: { input: 'user response' }
  }));

  // 4. Use primitives
  const tools = await mcpClient.listTools();
  const resources = await mcpClient.listResources();
  const prompts = await mcpClient.listPrompts();
  const roots = await mcpClient.listRoots();

  // 5. Execute tool
  const result = await mcpClient.executeTool(tools[0].name, {});

  // 6. Subscribe to updates
  await mcpClient.subscribeToResource(resources[0].uri, (content) => {
    console.log('Updated:', content);
  });

  // 7. Get completions
  const completions = await mcpClient.getCompletions({
    ref: { type: 'ref/prompt', name: prompts[0].name },
    argument: { name: 'arg1', value: 'partial' }
  });

  // 8. Clean up
  await mcpClient.disconnect();
}
```
