# HTTP Transport Guide

The HTTP transport in SimplyMCP supports both **stateful** and **stateless** modes, giving you flexibility to choose the right architecture for your use case.

---

## Quick Start

### Start HTTP Server

```typescript
import { SimplyMCP } from 'simply-mcp';

const server = new SimplyMCP({
  name: 'my-http-server',
  version: '1.0.0'
});

// Add tools, prompts, resources...
server.addTool({
  name: 'greet',
  parameters: z.object({ name: z.string() }),
  execute: async (args) => `Hello, ${args.name}!`
});

// Start with HTTP transport
await server.start({
  transport: 'http',
  port: 3000
});

console.log('Server running on http://localhost:3000');
```

### Using CLI

```bash
# Auto-detect and run with HTTP (recommended)
simplymcp run my-server.ts --http --port 3000

# Or explicit commands
simplymcp-class my-server.ts --http --port 3000
simplymcp-func my-server.ts --http --port 3000
```

---

## Transport Modes

SimplyMCP's HTTP transport supports two modes:

### Stateful Mode (Default)

Stateful mode maintains session state across requests using session IDs. This is ideal for web applications, long-running conversations, and scenarios requiring context preservation.

**How it works:**
1. Client initializes with POST to `/mcp`
2. Server returns a `mcp-session-id` header
3. Client includes session ID in subsequent requests
4. Server reuses the same transport instance for that session
5. Optional SSE stream via GET for real-time updates

**When to use:**
- Web applications with user sessions
- Multi-step workflows requiring context
- Long-running conversations
- Real-time updates via SSE

**Example:**
```typescript
// Start stateful HTTP server (default)
await server.start({
  transport: 'http',
  port: 3000,
  stateful: true  // or omit - stateful is default
});
```

### Stateless Mode

Stateless mode creates a fresh transport for each request. No session tracking or state persistence. Perfect for serverless environments and simple APIs.

**How it works:**
1. Each request is independent
2. No session ID required or returned
3. New transport created per request
4. Cleaned up after response
5. No SSE support (request-response only)

**When to use:**
- AWS Lambda / Cloud Functions
- Serverless deployments
- Stateless microservices
- Simple REST-like APIs
- Load-balanced services without sticky sessions

**Example:**
```typescript
// Start stateless HTTP server
await server.start({
  transport: 'http',
  port: 3000,
  stateful: false
});
```

### Mode Comparison

| Feature | Stateful Mode | Stateless Mode |
|---------|---------------|----------------|
| **Session Tracking** | Yes (session ID header) | No |
| **State Persistence** | Across requests | None |
| **SSE Support** | Yes (GET /mcp) | No |
| **Transport Lifecycle** | Reused per session | Created per request |
| **Overhead** | Low (after init) | Medium (per request) |
| **Scalability** | Good (with session affinity) | Excellent (any server) |
| **Use Case** | Web apps, workflows | Serverless, APIs |
| **Cleanup** | On session end | After each request |

### Quick Examples

**Stateful Client:**
```typescript
// Initialize and get session
const initResponse = await fetch('http://localhost:3000/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { /* ... */ }
  })
});

const sessionId = initResponse.headers.get('mcp-session-id');

// Use session for subsequent requests
await fetch('http://localhost:3000/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'mcp-session-id': sessionId
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  })
});
```

**Stateless Client:**
```typescript
// Each request is independent - no session ID needed
await fetch('http://localhost:3000/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { /* ... */ }
  })
});

// Another independent request
await fetch('http://localhost:3000/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  })
});
```

### Decision Guidance

**Choose Stateful Mode if:**
- You need to maintain conversation context
- You want SSE streaming for real-time updates
- You have user sessions or multi-step workflows
- Your infrastructure supports session affinity
- You want lower per-request overhead after initialization

**Choose Stateless Mode if:**
- You're deploying to serverless platforms (Lambda, Cloud Functions)
- You need maximum horizontal scalability
- Each request is independent
- You want simpler client implementation
- You're behind a load balancer without sticky sessions
- You don't need SSE or real-time updates

---

## HTTP Endpoints

SimplyMCP exposes three endpoints for MCP protocol communication:

| Method | Endpoint | Purpose | Session Required |
|--------|----------|---------|------------------|
| POST | `/mcp` | Initialize session & send JSON-RPC requests | Create or use existing |
| GET | `/mcp` | Receive SSE stream of responses | Yes |
| DELETE | `/mcp` | Terminate session | Yes |

---

## Session Management (Stateful Mode Only)

Sessions are only used in stateful mode. In stateless mode, each request is independent with no session tracking.

### Session Flow

1. **Initialize**: Send POST request to `/mcp` with `initialize` method
2. **Session ID**: Server responds with session ID in `mcp-session-id` header
3. **Communicate**: Send requests via POST with session ID header
4. **Receive**: Listen to GET endpoint (SSE) for responses
5. **Terminate**: Send DELETE request when done

### Session Headers

All requests after initialization must include:

```http
mcp-session-id: <session-uuid>
```

---

## Example Client Implementation

This example demonstrates stateful mode with session management. For stateless mode examples, see the "Transport Modes" section above.

### Node.js Client (Stateful Mode)

```typescript
import fetch from 'node-fetch';
import { EventSource } from 'eventsource';

const BASE_URL = 'http://localhost:3000';
let sessionId: string;

// 1. Initialize session
async function initialize() {
  const response = await fetch(`${BASE_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'my-client',
          version: '1.0.0'
        }
      }
    })
  });

  sessionId = response.headers.get('mcp-session-id')!;
  const result = await response.json();
  console.log('Initialized:', result);
  return sessionId;
}

// 2. Set up SSE stream for receiving responses
function connectSSE() {
  const es = new EventSource(`${BASE_URL}/mcp`, {
    headers: {
      'mcp-session-id': sessionId
    }
  });

  es.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('Received:', message);
  };

  es.onerror = (error) => {
    console.error('SSE Error:', error);
  };

  return es;
}

// 3. Send JSON-RPC requests
async function sendRequest(method: string, params: any, id: number) {
  const response = await fetch(`${BASE_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'mcp-session-id': sessionId
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params
    })
  });

  return await response.json();
}

// 4. Terminate session
async function terminate() {
  await fetch(`${BASE_URL}/mcp`, {
    method: 'DELETE',
    headers: {
      'mcp-session-id': sessionId
    }
  });
  console.log('Session terminated');
}

// Usage
async function main() {
  // Initialize
  await initialize();

  // Connect SSE
  const eventSource = connectSSE();

  // List tools
  const tools = await sendRequest('tools/list', {}, 2);
  console.log('Tools:', tools);

  // Call a tool
  const result = await sendRequest('tools/call', {
    name: 'greet',
    arguments: { name: 'Alice' }
  }, 3);
  console.log('Result:', result);

  // Cleanup
  setTimeout(async () => {
    await terminate();
    eventSource.close();
  }, 5000);
}

main();
```

---

## JSON-RPC Protocol

### Initialize Session

```http
POST /mcp
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "my-client",
      "version": "1.0.0"
    }
  }
}
```

**Response:**

```http
HTTP/1.1 200 OK
mcp-session-id: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "prompts": {},
      "resources": {}
    },
    "serverInfo": {
      "name": "my-http-server",
      "version": "1.0.0"
    }
  }
}
```

### List Tools

```http
POST /mcp
Content-Type: application/json
mcp-session-id: 550e8400-e29b-41d4-a716-446655440000

{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

### Call Tool

```http
POST /mcp
Content-Type: application/json
mcp-session-id: 550e8400-e29b-41d4-a716-446655440000

{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "greet",
    "arguments": {
      "name": "Alice"
    }
  }
}
```

### Get Prompt

```http
POST /mcp
Content-Type: application/json
mcp-session-id: 550e8400-e29b-41d4-a716-446655440000

{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "prompts/get",
  "params": {
    "name": "greeting-prompt",
    "arguments": {
      "name": "Bob"
    }
  }
}
```

### Read Resource

```http
POST /mcp
Content-Type: application/json
mcp-session-id: 550e8400-e29b-41d4-a716-446655440000

{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "resources/read",
  "params": {
    "uri": "info://server/status"
  }
}
```

---

## Server-Sent Events (SSE)

### Connect to SSE Stream

```http
GET /mcp
mcp-session-id: 550e8400-e29b-41d4-a716-446655440000
```

**Response (continuous stream):**

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"jsonrpc":"2.0","id":2,"result":{...}}

data: {"jsonrpc":"2.0","id":3,"result":{...}}
```

### SSE Event Format

Each event is a JSON-RPC message:

```javascript
// Browser example
const es = new EventSource('http://localhost:3000/mcp', {
  headers: {
    'mcp-session-id': sessionId
  }
});

es.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);

  if (message.result) {
    console.log('Success:', message.result);
  } else if (message.error) {
    console.error('Error:', message.error);
  }
});
```

---

## Error Handling

### Common HTTP Errors

| Status | Meaning | Solution |
|--------|---------|----------|
| 400 | Invalid or missing session ID | Include valid `mcp-session-id` header |
| 500 | Internal server error | Check server logs |
| 404 | Endpoint not found | Use `/mcp` endpoint |

### JSON-RPC Errors

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "Bad Request: Server not initialized"
  },
  "id": null
}
```

**Common error codes:**
- `-32000`: Bad Request (session issues)
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error

---

## Session Termination

### Graceful Shutdown

```http
DELETE /mcp
mcp-session-id: 550e8400-e29b-41d4-a716-446655440000
```

**Response:**

```http
HTTP/1.1 200 OK

Session terminated
```

### Auto-Cleanup

Sessions are automatically cleaned up when:
- SSE connection is closed
- Client sends DELETE request
- Server shuts down

---

## Testing HTTP Transport

### Using cURL

```bash
# Initialize
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "curl-client", "version": "1.0.0"}
    }
  }' -v

# Extract session ID from response header
SESSION_ID="<session-id-from-header>"

# List tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

### Using Postman

1. **Initialize**:
   - POST `http://localhost:3000/mcp`
   - Body: Raw JSON (initialization request)
   - Copy `mcp-session-id` from response headers

2. **Send Requests**:
   - POST `http://localhost:3000/mcp`
   - Add header: `mcp-session-id: <session-id>`
   - Body: JSON-RPC request

3. **SSE (requires Postman v9+)**:
   - GET `http://localhost:3000/mcp`
   - Add header: `mcp-session-id: <session-id>`
   - View real-time events

---

## CORS Configuration

By default, CORS is enabled for all origins:

```typescript
// In SimplyMCP.ts
app.use(cors());
```

For production, configure CORS to specific origins:

```typescript
import cors from 'cors';
import express from 'express';

const app = express();
app.use(cors({
  origin: ['https://your-frontend.com'],
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'mcp-session-id']
}));
```

---

## Security Considerations

### Production Checklist

- [ ] Enable HTTPS/TLS
- [ ] Configure CORS for specific origins
- [ ] Implement authentication (API keys, OAuth, etc.)
- [ ] Add rate limiting
- [ ] Validate all inputs
- [ ] Use secure session IDs (UUID v4)
- [ ] Implement session timeouts
- [ ] Log all requests for audit

### Example: API Key Authentication

```typescript
app.use('/mcp', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Unauthorized: Invalid API key'
      },
      id: null
    });
  }

  next();
});
```

---

## Troubleshooting

### Session Not Found

**Problem**: `400 Bad Request: Invalid or missing session ID`

**Solutions**:
1. Ensure you initialized a session first
2. Check `mcp-session-id` header is set correctly
3. Verify session hasn't expired/terminated

### SSE Connection Fails

**Problem**: SSE stream doesn't connect

**Solutions**:
1. Check browser/client supports EventSource
2. Verify session ID is valid
3. Check CORS settings
4. Use GET method (not POST)

### No Response

**Problem**: Requests sent but no response received

**Solutions**:
1. Check SSE stream is connected
2. Verify JSON-RPC format is correct
3. Check server logs for errors
4. Ensure request ID is unique

---

## Comparison: HTTP vs stdio

| Feature | HTTP Stateful | HTTP Stateless | stdio Transport |
|---------|---------------|----------------|-----------------|
| Use Case | Web apps, workflows | Serverless, APIs | CLI tools, local |
| Session | Yes (session ID) | No | Per-process |
| Network | TCP/IP | TCP/IP | stdin/stdout pipes |
| Scalability | Good (session affinity) | Excellent | Single client only |
| SSE Support | Yes | No | No |
| Debugging | Browser DevTools, Postman | Browser DevTools, Postman | Terminal logs |
| Complexity | Medium (sessions, SSE) | Low (request-response) | Low (pipe I/O) |

---

## Additional Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io/docs/specification)
- [Server-Sent Events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [SimplyMCP Examples](../examples/)

---

**Last Updated:** 2025-10-03
