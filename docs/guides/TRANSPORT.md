# HTTP Transport

HTTP-based transport for MCP servers supporting both stateful and stateless modes.

## Table of Contents

- [HTTP Stateful Transport](#http-stateful-transport)
  - [What is HTTP Stateful?](#what-is-http-stateful)
  - [Session Management](#session-management)
  - [SSE Streaming](#sse-streaming)
  - [Architecture](#architecture-stateful)
  - [Configuration](#configuration-stateful)
  - [Example (Interface API)](#example-interface-api-stateful)
  - [Client Connection](#client-connection-stateful)
  - [CORS Handling](#cors-handling)
  - [Best Practices](#best-practices-stateful)
  - [Troubleshooting](#troubleshooting-stateful)
- [HTTP Stateless Transport](#http-stateless-transport)
  - [What is HTTP Stateless?](#what-is-http-stateless)
  - [Serverless Architecture](#serverless-architecture)
  - [Configuration](#configuration-stateless)
  - [Example (Interface API)](#example-interface-api-stateless)
  - [AWS Lambda Integration](#aws-lambda-integration)
  - [Cloud Functions Deployment](#cloud-functions-deployment)
  - [Cold Start Optimization](#cold-start-optimization)
  - [Best Practices](#best-practices-stateless)
  - [Troubleshooting](#troubleshooting-stateless)
- [Related Guides](#related-guides)

---

## HTTP Stateful Transport

> **Note:** This transport is also known as **Streamable HTTP Transport** in the MCP specification. Simply-MCP uses the MCP SDK's `StreamableHTTPServerTransport` to provide this functionality. Both terms refer to the same HTTP-based transport with session management and SSE streaming capabilities.

### What is HTTP Stateful?

**HTTP Stateful** (also called **Streamable HTTP**) is a session-based transport that:

- Uses HTTP for request/response communication
- Maintains sessions across multiple requests
- Streams events via Server-Sent Events (SSE)
- Supports multiple concurrent clients
- Tracks session state with unique IDs
- Implements the MCP SDK's `StreamableHTTPServerTransport` protocol

```
┌─────────────┐                    ┌──────────────┐
│  Browser/   │  1. POST /mcp      │  MCP Server  │
│   Client    │───────────────────>│   (HTTP)     │
│             │  initialize         │              │
│             │<───────────────────│              │
│             │  Session-Id: abc123 │              │
│             │                     │              │
│             │  2. POST /mcp      │              │
│             │  Session-Id: abc123│              │
│             │  tools/call        │              │
│             │───────────────────>│              │
│             │<───────────────────│              │
│             │  Response + Events  │              │
│             │                     │              │
│             │  3. GET /mcp        │              │
│             │  Session-Id: abc123│              │
│             │  (SSE stream)      │              │
│             │◀═══════════════════│              │
│             │  event: message     │              │
└─────────────┘  event: progress    └──────────────┘
```

### Session Management

**Session Lifecycle:**

1. **Initialize**: Client sends `initialize` request → Server creates session
2. **Active**: Subsequent requests include `Mcp-Session-Id` header
3. **Streaming**: Client can open SSE connection for real-time events
4. **Terminate**: Client sends DELETE request or session times out

**Session Storage:**

```typescript
// Internal session management (automatic)
private transports: Map<string, StreamableHTTPServerTransport> = new Map();

// Session created on initialize:
{
  sessionId: 'abc123-def456-...',
  transport: StreamableHTTPServerTransport,
  createdAt: Date,
  lastActivity: Date
}
```

**Session Headers:**

```http
POST /mcp HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Accept: application/json, text/event-stream
Mcp-Session-Id: abc123-def456-ghi789

{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": { ... }
}
```

### SSE Streaming

**Server-Sent Events (SSE)** enable the server to push updates to clients:

**Opening SSE Stream:**

```http
GET /mcp HTTP/1.1
Host: localhost:3000
Accept: text/event-stream
Mcp-Session-Id: abc123-def456-ghi789
```

**Server Response:**

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: message
data: {"jsonrpc":"2.0","id":1,"result":{...}}

event: progress
data: {"progress":50,"total":100,"message":"Processing..."}

event: message
data: {"jsonrpc":"2.0","method":"notifications/message","params":{...}}
```

**Client-Side (JavaScript):**

```javascript
const sessionId = 'abc123-def456-ghi789';

// Open SSE connection
const eventSource = new EventSource(
  `/mcp?sessionId=${sessionId}`,
  { withCredentials: true }
);

// Listen for events
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('Server message:', data);
});

eventSource.addEventListener('progress', (event) => {
  const progress = JSON.parse(event.data);
  console.log(`Progress: ${progress.progress}/${progress.total}`);
});

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  eventSource.close();
};
```

### HTTP Endpoints Reference

Simply-MCP's HTTP Stateful transport exposes the following endpoints:

| Method | Endpoint | Purpose | Headers Required | Response |
|--------|----------|---------|------------------|----------|
| `POST` | `/mcp` | Initialize session or send JSON-RPC request | `Content-Type: application/json` | JSON response + `Mcp-Session-Id` header (on init) |
| `GET` | `/mcp` | Open SSE stream for real-time events | `Mcp-Session-Id`, `Accept: text/event-stream` | SSE stream (text/event-stream) |
| `DELETE` | `/mcp` | Terminate session and cleanup resources | `Mcp-Session-Id` | 204 No Content |

**Request/Response Flow:**

```
1. Initialize Session
   POST /mcp
   Body: { "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {...} }
   Response: 200 OK + Header: Mcp-Session-Id: <session-id>

2. Call Tools/Read Resources
   POST /mcp
   Header: Mcp-Session-Id: <session-id>
   Body: { "jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {...} }
   Response: 200 OK + JSON-RPC result

3. Stream Events (Optional)
   GET /mcp?sessionId=<session-id>
   Header: Accept: text/event-stream
   Header: Mcp-Session-Id: <session-id>
   Response: SSE stream (keeps connection open)

4. Terminate Session
   DELETE /mcp
   Header: Mcp-Session-Id: <session-id>
   Response: 204 No Content
```

**Important Notes:**
- All requests after initialization **must** include the `Mcp-Session-Id` header
- Session IDs are UUIDs (e.g., `abc123-def456-ghi789`)
- The SSE endpoint (`GET /mcp`) streams events in real-time and keeps the connection open
- Sessions timeout after inactivity (configurable, default varies by implementation)

### Testing with cURL (Quick Start)

These examples show how to test your MCP HTTP server using cURL:

**Step 1: Start your server**
```bash
npx simply-mcp run server.ts --http --port 3000
```

**Step 2: Initialize session and capture session ID**
```bash
# Send initialize request
curl -i -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "curl-client", "version": "1.0"}
    }
  }'

# Response includes session ID in header:
# HTTP/1.1 200 OK
# Mcp-Session-Id: abc123-def456-ghi789
# Content-Type: text/event-stream
#
# event: message
# data: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05",...}}
```

**Step 3: Extract session ID and call tools**
```bash
# Set session ID (from response header above)
export SESSION_ID="abc123-def456-ghi789"

# List available tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'

# Call a specific tool
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "your_tool_name",
      "arguments": {"param1": "value1"}
    }
  }'
```

**Step 4: Read resources**
```bash
# List available resources
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "resources/list",
    "params": {}
  }'

# Read a specific resource
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "resources/read",
    "params": {"uri": "config://app"}
  }'
```

**Step 5: Terminate session**
```bash
curl -X DELETE http://localhost:3000/mcp \
  -H "Mcp-Session-Id: $SESSION_ID"

# Response: 204 No Content
```

**Complete test script:**
```bash
#!/bin/bash
# save as test-mcp-http.sh

BASE_URL="http://localhost:3000"

# Initialize and capture session ID
echo "1. Initializing session..."
RESPONSE=$(curl -s -i -X POST $BASE_URL/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}')

SESSION_ID=$(echo "$RESPONSE" | grep -i "Mcp-Session-Id:" | cut -d' ' -f2 | tr -d '\r')
echo "Session ID: $SESSION_ID"

# List tools
echo -e "\n2. Listing tools..."
curl -s -X POST $BASE_URL/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | jq

# Call a tool
echo -e "\n3. Calling tool..."
curl -s -X POST $BASE_URL/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"your_tool","arguments":{}}}' | jq

# Cleanup
echo -e "\n4. Terminating session..."
curl -s -X DELETE $BASE_URL/mcp -H "Mcp-Session-Id: $SESSION_ID"
echo "Done!"
```

### Architecture (Stateful)

```
┌─────────────────────────────────────────────────────────┐
│                      Web Client                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │         HTTP Client (fetch/axios)                  │ │
│  └────────────────────────────────────────────────────┘ │
│           │ POST /mcp                 │ GET /mcp (SSE)  │
└─────────────────────────────────────────────────────────┘
                         │                      │
                         ↓                      ↓
┌─────────────────────────────────────────────────────────┐
│                    HTTP Server (Express)                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Middleware Stack                      │ │
│  │  • CORS (origin validation)                        │ │
│  │  • JSON body parser                                │ │
│  │  • Session validation                              │ │
│  └────────────────────────────────────────────────────┘ │
│           │                              ↑              │
│           ↓                              │              │
│  ┌────────────────────────────────────────────────────┐ │
│  │          Session Manager                           │ │
│  │  Map<SessionId, Transport>                         │ │
│  │  • Create session on initialize                    │ │
│  │  • Validate session ID                             │ │
│  │  • Route requests to correct transport             │ │
│  └────────────────────────────────────────────────────┘ │
│           │                              ↑              │
│           ↓                              │              │
│  ┌────────────────────────────────────────────────────┐ │
│  │    StreamableHTTPServerTransport (per session)     │ │
│  │  • Handle JSON-RPC requests                        │ │
│  │  • Manage SSE streams                              │ │
│  │  • Send notifications/progress                     │ │
│  └────────────────────────────────────────────────────┘ │
│           │                              ↑              │
│           ↓                              │              │
│  ┌────────────────────────────────────────────────────┐ │
│  │             MCP Server Core                        │ │
│  │  ┌──────────┐  ┌────────┐  ┌──────────────┐      │ │
│  │  │  Tools   │  │Prompts │  │  Resources   │      │ │
│  │  └──────────┘  └────────┘  └──────────────┘      │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Configuration (Stateful)

**Basic Configuration:**

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'stateful-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: 3000,
    stateful: true  // Default
  }
});

server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({
    name: z.string(),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}!`;
  },
});

await server.start();
```

**With Capabilities:**

```typescript
const server = new BuildMCPServer({
  name: 'advanced-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: 8080,
    stateful: true
  },
  capabilities: {
    logging: true,     // Enable logging notifications
    sampling: false    // Disable LLM sampling (not yet implemented)
  }
});
```

**Override at Start:**

```typescript
const server = new BuildMCPServer({
  name: 'flexible-server',
  version: '1.0.0',
  // Default config
  transport: {
    type: 'stdio'
  }
});

// But start with HTTP stateful
await server.start({
  transport: 'http',
  port: 4000,
  stateful: true
});
```

### Example (Interface API - Stateful)

```typescript
import type { ITool, IServer } from 'simply-mcp';

interface SearchTool extends ITool {
  name: 'search';
  description: 'Search with progress updates';
  params: {
    query: string;
    limit?: number;
  };
  result: {
    results: Array<{ id: string; title: string }>;
  };
}

interface StatefulService extends IServer {
  name: 'http-stateful-interface';
  version: '1.0.0';
  capabilities: {
    logging: true;
  };
}

export default class StatefulServiceImpl implements StatefulService {
  search: SearchTool = async (params, context) => {
    context?.logger.info(`Searching for: ${params.query}`);

    // Report progress if available
    if (context?.reportProgress) {
      await context.reportProgress(50, 100, 'Searching...');
    }

    return { results: [] };
  };
}
```

**Run:**
```bash
npx simply-mcp run StatefulServiceImpl.ts --http --port 3000
```

**Complete Example:** See [examples/interface-http-auth.ts](../../examples/interface-http-auth.ts) for a full HTTP server with authentication.

### Client Connection (Stateful)

#### Using cURL

**1. Initialize Session:**

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test-client", "version": "1.0.0"}
    }
  }'
```

**Response:**
```
event: message
data: {"jsonrpc":"2.0","id":1,"result":{...}}
```

**Extract session ID from response headers or body.**

**2. Call Tools (with session ID):**

```bash
SESSION_ID="abc123-def456-ghi789"

curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "greet",
      "arguments": {"name": "World"}
    }
  }'
```

**3. Subscribe to SSE Events:**

```bash
curl -N -H "Accept: text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  http://localhost:3000/mcp
```

#### Using JavaScript/TypeScript

```typescript
import axios from 'axios';

class MCPClient {
  private baseURL: string;
  private sessionId?: string;
  private eventSource?: EventSource;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async initialize(): Promise<void> {
    const response = await axios.post(`${this.baseURL}/mcp`, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'js-client', version: '1.0.0' }
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      }
    });

    // Parse SSE response
    const match = response.data.match(/data: (.*)/);
    if (match) {
      const data = JSON.parse(match[1]);
      this.sessionId = data.result.sessionId;
      console.log('Session initialized:', this.sessionId);
    }
  }

  // Additional methods omitted for brevity
}
```

**Additional client examples** (JavaScript, Python) available in `/examples/` directory.

### CORS Handling

**Default CORS Configuration:**

Simply MCP enables CORS by default with origin validation:

```typescript
// Built-in CORS middleware
app.use(cors({
  origin: '*',
  exposedHeaders: ['Mcp-Session-Id'],
}));

// Origin validation (DNS rebinding protection)
app.use('/mcp', (req, res, next) => {
  const origin = req.headers.origin || req.headers.referer;

  if (origin) {
    const url = new URL(origin);
    const allowedHosts = ['localhost', '127.0.0.1', '::1'];

    if (!allowedHosts.includes(url.hostname)) {
      res.status(403).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Forbidden: Invalid origin'
        },
        id: null
      });
      return;
    }
  }
  next();
});
```

**Custom CORS (Production):**

For production, you should configure stricter CORS:

```typescript
import cors from 'cors';

const allowedOrigins = [
  'https://app.example.com',
  'https://dashboard.example.com'
];

// Before starting server, modify Express app:
// Note: This requires accessing the internal Express app
// You may need to fork or extend SimplyMCP for this

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  exposedHeaders: ['Mcp-Session-Id']
}));
```

**Preflight Requests:**

CORS preflight (OPTIONS) is handled automatically by the `cors` middleware.

### Best Practices (Stateful)

**1. Always include SSE accept header:**

```http
Accept: application/json, text/event-stream
```

**2. Store session IDs securely:**

```typescript
// ✅ Good - Session ID in HTTP-only cookie
res.cookie('mcp-session-id', sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
});

// ❌ Bad - Session ID in localStorage (XSS vulnerable)
localStorage.setItem('sessionId', sessionId);
```

**3. Implement session timeouts:**

```typescript
// Track session activity
const sessionTimeouts = new Map<string, NodeJS.Timeout>();

function refreshSession(sessionId: string): void {
  // Clear existing timeout
  const existing = sessionTimeouts.get(sessionId);
  if (existing) clearTimeout(existing);

  // Set new timeout (e.g., 30 minutes)
  const timeout = setTimeout(() => {
    console.log(`Session ${sessionId} timed out`);
    const transport = transports.get(sessionId);
    if (transport) {
      transport.close();
      transports.delete(sessionId);
    }
    sessionTimeouts.delete(sessionId);
  }, 30 * 60 * 1000);

  sessionTimeouts.set(sessionId, timeout);
}
```

**4. Handle disconnections gracefully:**

```typescript
// Client-side
eventSource.onerror = (error) => {
  console.error('SSE connection lost, reconnecting...');
  eventSource.close();

  setTimeout(() => {
    reconnect();
  }, 5000);
};
```

**5. Use progress reporting for long operations:**

```typescript
server.addTool({
  name: 'bulk_process',
  parameters: z.object({
    items: z.array(z.string()),
  }),
  execute: async (args, context) => {
    if (!context?.reportProgress) {
      return 'Progress reporting not available';
    }

    const total = args.items.length;

    for (let i = 0; i < total; i++) {
      await processItem(args.items[i]);
      await context.reportProgress(i + 1, total, `Processing ${i + 1}/${total}`);
    }

    return `Processed ${total} items`;
  },
});
```

**6. Validate session IDs:**

```typescript
// Built-in validation (automatic)
if (!sessionId || !this.transports.has(sessionId)) {
  res.status(400).json({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Bad Request: No valid session ID provided'
    },
    id: null
  });
  return;
}
```

### Troubleshooting (Stateful)

#### Issue: 406 Not Acceptable

**Symptoms:**
- `406 Not Acceptable` response
- "SSE transport requires text/event-stream accept header"

**Solution:**

Always include `text/event-stream` in Accept header:

```bash
# ✅ Correct
curl -H "Accept: application/json, text/event-stream" ...

# ❌ Wrong
curl -H "Accept: application/json" ...
```

#### Issue: "Bad Request: No valid session ID"

**Symptoms:**
- 400 error on subsequent requests
- "No valid session ID provided"

**Solutions:**

1. **Check session ID header:**
   ```bash
   curl -H "Mcp-Session-Id: YOUR_SESSION_ID" ...
   ```

2. **Verify session was created:**
   ```bash
   # First, initialize:
   curl -X POST http://localhost:3000/mcp \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","id":1,"method":"initialize",...}'

   # Extract session ID from response
   # Then use it in subsequent requests
   ```

3. **Check session timeout:**
   Sessions may expire after inactivity. Re-initialize if needed.

#### Issue: CORS errors in browser

**Symptoms:**
- "CORS policy blocked" in browser console
- Requests fail from web app

**Solutions:**

1. **Check origin validation:**
   ```typescript
   // Allowed origins (default)
   const allowedHosts = ['localhost', '127.0.0.1', '::1'];
   ```

2. **Use same hostname:**
   ```javascript
   // ✅ Good - Same host
   fetch('http://localhost:3000/mcp', ...)

   // ❌ Bad - Different host
   fetch('http://127.0.0.1:3000/mcp', ...)
   ```

3. **For production, configure allowed origins** (see CORS Handling section)

#### Issue: SSE stream disconnects

**Symptoms:**
- EventSource `onerror` fires
- Stream closes unexpectedly

**Solutions:**

1. **Implement reconnection logic:**
   ```javascript
   let reconnectAttempts = 0;
   const maxReconnectAttempts = 5;

   function connect() {
     const eventSource = new EventSource(url);

     eventSource.onerror = () => {
       eventSource.close();

       if (reconnectAttempts < maxReconnectAttempts) {
         reconnectAttempts++;
         const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
         console.log(`Reconnecting in ${delay}ms...`);
         setTimeout(connect, delay);
       }
     };

     eventSource.onopen = () => {
       reconnectAttempts = 0;
     };
   }
   ```

2. **Check network stability**

3. **Verify server didn't crash** (check logs)

---

## HTTP Stateless Transport

### What is HTTP Stateless?

**HTTP Stateless** is a session-free transport that:

- Creates a new transport for each request
- Does not maintain session state
- Perfect for serverless deployments
- Horizontally scalable without session affinity
- No SSE streaming (no persistent connections)

```
┌─────────────┐                    ┌──────────────┐
│   Client    │  1. POST /mcp      │  MCP Server  │
│  (Lambda    │  initialize         │  (Stateless) │
│   caller)   │───────────────────>│              │
│             │                     │  Create new  │
│             │                     │  transport   │
│             │<───────────────────│              │
│             │  Response (no ID)   │  Close       │
│             │                     │  transport   │
│             │                     │              │
│             │  2. POST /mcp      │              │
│             │  tools/call         │  Create new  │
│             │  (independent)     │  transport   │
│             │───────────────────>│              │
│             │<───────────────────│              │
│             │  Response           │  Close       │
└─────────────┘                     └──────────────┘
```

### Serverless Architecture

**Key Characteristics:**

- **Stateless**: Each request is completely independent
- **No sessions**: No `Mcp-Session-Id` header needed
- **No initialize requirement**: Can call any MCP method directly
- **Short-lived**: Transport created and destroyed per request
- **Scalable**: No session storage, infinite horizontal scaling

**Comparison:**

| Aspect | Stateful | Stateless |
|--------|----------|-----------|
| Transport lifecycle | Created once, reused | Created per request |
| Session ID | Required | Not used |
| Initialize method | Required first | Optional |
| SSE streaming | ✅ Yes | ❌ No |
| Progress reporting | ✅ Yes | ❌ No |
| State between requests | ✅ Maintained | ❌ None |
| Serverless friendly | ⭐ Poor | ✅ Excellent |
| Horizontal scaling | ⭐ Needs sticky sessions | ✅ Unlimited |

### Configuration (Stateless)

**Basic Configuration:**

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'stateless-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: 3000,
    stateful: false  // KEY: Set to false
  }
});

server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({
    name: z.string(),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}!`;
  },
});

await server.start();
```

**Override at Start:**

```typescript
const server = new BuildMCPServer({
  name: 'flexible-server',
  version: '1.0.0'
});

// Start as stateless
await server.start({
  transport: 'http',
  port: 3000,
  stateful: false  // Override
});
```

### Example (Interface API - Stateless)

```typescript
import type { ITool, IServer } from 'simply-mcp';

interface CalculateTool extends ITool {
  name: 'calculate';
  description: 'Perform calculation';
  params: {
    operation: 'add' | 'subtract' | 'multiply' | 'divide';
    a: number;
    b: number;
  };
  result: {
    value: number;
  };
}

interface StatelessService extends IServer {
  name: 'stateless-interface';
  version: '1.0.0';
}

export default class StatelessServiceImpl implements StatelessService {
  calculate: CalculateTool = async (params) => {
    let value: number;

    switch (params.operation) {
      case 'add': value = params.a + params.b; break;
      case 'subtract': value = params.a - params.b; break;
      case 'multiply': value = params.a * params.b; break;
      case 'divide': value = params.a / params.b; break;
    }

    return { value };
  };
}
```

**Run:**
```bash
npx simply-mcp run StatelessServiceImpl.ts --http --port 3000 --stateless
```

**Complete Example:** See [examples/interface-http-stateless.ts](../../examples/interface-http-stateless.ts) for a full stateless HTTP deployment example.

### AWS Lambda Integration

**Lambda Handler:**

```typescript
// lambda.ts
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context
} from 'aws-lambda';

// Create server (outside handler for warm starts)
const server = new BuildMCPServer({
  name: 'lambda-mcp-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    stateful: false
  }
});

server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({
    name: z.string(),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}!`;
  },
});

// Lambda handler
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');

    // Start server if not running (warm start optimization)
    if (!server.getInfo().isRunning) {
      await server.start({
        transport: 'http',
        stateful: false
      });
    }

    // Create mock request/response for SimplyMCP
    // (SimplyMCP internally uses Express, so we adapt Lambda events)
    const mockReq = {
      method: 'POST',
      headers: event.headers,
      body: body
    };

    const mockRes = {
      statusCode: 200,
      headers: {},
      body: '',

      status(code: number) {
        this.statusCode = code;
        return this;
      },

      json(data: any) {
        this.body = JSON.stringify(data);
        return this;
      },

      send(data: any) {
        this.body = typeof data === 'string' ? data : JSON.stringify(data);
        return this;
      }
    };

    // Process request through SimplyMCP
    // Note: This is a simplified example. For production, you may need
    // to create a Lambda-specific adapter or use API Gateway HTTP integration.

    // For now, return a success response
    // In a real implementation, you'd route through the MCP server
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'MCP Server ready',
        server: server.getInfo()
      })
    };
  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
```

**Serverless Framework Configuration:**

```yaml
# serverless.yml
service: mcp-lambda-server

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  memorySize: 512
  timeout: 30

functions:
  mcp:
    handler: lambda.handler
    events:
      - http:
          path: /mcp
          method: post
          cors: true

plugins:
  - serverless-plugin-typescript
  - serverless-offline

package:
  exclude:
    - node_modules/**
    - .git/**
```

**Deploy:**

```bash
# Install dependencies
npm install --save-dev serverless serverless-plugin-typescript serverless-offline

# Deploy
serverless deploy

# Test
curl -X POST https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Cloud Functions Deployment

**Google Cloud Functions:**

```typescript
// index.ts
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';
import { Request, Response } from '@google-cloud/functions-framework';

const server = new BuildMCPServer({
  name: 'gcf-mcp-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    stateful: false
  }
});

server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({
    name: z.string(),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}!`;
  },
});

export const mcp = async (req: Request, res: Response) => {
  // Start server if not running
  if (!server.getInfo().isRunning) {
    await server.start({
      transport: 'http',
      stateful: false
    });
  }

  // Handle MCP request
  // Similar to Lambda handler, you'd route through the server

  res.status(200).json({
    message: 'MCP Server ready',
    server: server.getInfo()
  });
};
```

**Deploy:**

```bash
gcloud functions deploy mcp \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point mcp \
  --region us-central1
```

### Cold Start Optimization

**1. Keep server instance warm:**

```typescript
// Global instance (outside handler)
const server = new BuildMCPServer({ ... });

// Initialize tools once
server.addTool({ ... });

// In handler, just start if needed
export const handler = async (event) => {
  if (!server.getInfo().isRunning) {
    await server.start({ stateful: false });
  }

  // Process request...
};
```

**2. Use provisioned concurrency (AWS Lambda):**

```yaml
# serverless.yml
functions:
  mcp:
    handler: lambda.handler
    provisionedConcurrency: 2  # Keep 2 instances warm
```

**3. Minimize dependencies:**

```typescript
// ✅ Good - Only import what you need
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

// ❌ Bad - Heavy imports increase cold start time
import * as _ from 'lodash';
import * as moment from 'moment';
```

**4. Use Lambda layers for dependencies:**

```yaml
# serverless.yml
functions:
  mcp:
    handler: lambda.handler
    layers:
      - arn:aws:lambda:us-east-1:123456789:layer:node-modules:1
```

**5. Lazy-load heavy resources:**

```typescript
server.addTool({
  name: 'ml_inference',
  parameters: z.object({ input: z.string() }),
  execute: async (args) => {
    // ✅ Load model only when needed
    const { loadModel } = await import('./ml-model');
    const model = await loadModel();
    return model.predict(args.input);
  },
});
```

### Best Practices (Stateless)

**1. Design for statelessness:**

```typescript
// ❌ Bad - Relies on server state
let requestCount = 0;

server.addTool({
  name: 'get_count',
  execute: async () => {
    return `Count: ${++requestCount}`;
  },
});

// ✅ Good - Use external state (Redis, DynamoDB, etc.)
import { redis } from './redis-client';

server.addTool({
  name: 'get_count',
  execute: async () => {
    const count = await redis.incr('request_count');
    return `Count: ${count}`;
  },
});
```

**2. Handle each request independently:**

```typescript
server.addTool({
  name: 'process_data',
  parameters: z.object({
    data: z.string(),
    userId: z.string()  // Include all context in request
  }),
  execute: async (args) => {
    // Don't assume previous requests
    // Fetch any needed data fresh
    const user = await fetchUser(args.userId);
    return processData(args.data, user);
  },
});
```

**3. Use idempotency:**

```typescript
server.addTool({
  name: 'create_order',
  parameters: z.object({
    orderId: z.string(),  // Unique ID from client
    items: z.array(z.any())
  }),
  execute: async (args) => {
    // Check if order already exists
    const existing = await db.findOrder(args.orderId);
    if (existing) {
      return existing;  // Idempotent
    }

    // Create order
    return await db.createOrder(args.orderId, args.items);
  },
});
```

**4. Set appropriate timeouts:**

```typescript
const server = new BuildMCPServer({
  name: 'lambda-server',
  version: '1.0.0',
  defaultTimeout: 25000,  // Lambda max is 30s, leave buffer
  transport: {
    type: 'http',
    stateful: false
  }
});
```

**5. Return errors properly:**

```typescript
server.addTool({
  name: 'risky_operation',
  parameters: z.object({ input: z.string() }),
  execute: async (args) => {
    try {
      return await performOperation(args.input);
    } catch (error) {
      // Return error in MCP format
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  },
});
```

**6. Monitor and log:**

```typescript
server.addTool({
  name: 'monitored_tool',
  parameters: z.object({ input: z.string() }),
  execute: async (args, context) => {
    const start = Date.now();

    try {
      context?.logger.info('Tool started', { input: args.input });

      const result = await performWork(args.input);

      const duration = Date.now() - start;
      context?.logger.info('Tool completed', { duration });

      return result;
    } catch (error) {
      context?.logger.error('Tool failed', { error: error.message });
      throw error;
    }
  },
});
```

### Troubleshooting (Stateless)

#### Issue: Requests fail without session ID

**Symptoms:**
- "No valid session ID" errors
- Requests expecting stateful behavior

**Solution:**

Stateless mode doesn't use session IDs. Remove `Mcp-Session-Id` header:

```bash
# ✅ Correct (stateless)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",...}'

# ❌ Wrong (trying to use sessions in stateless mode)
curl -H "Mcp-Session-Id: abc123" ...
```

#### Issue: Lambda timeout

**Symptoms:**
- Lambda function times out
- No response from server

**Solutions:**

1. **Increase Lambda timeout:**
   ```yaml
   # serverless.yml
   provider:
     timeout: 30  # Maximum for Lambda
   ```

2. **Optimize cold start:**
   - Use provisioned concurrency
   - Minimize dependencies
   - Lazy-load heavy resources

3. **Add timeout to tools:**
   ```typescript
   const server = new BuildMCPServer({
     defaultTimeout: 25000  // Leave 5s buffer for Lambda overhead
   });
   ```

#### Issue: State not persisting between requests

**Symptoms:**
- Data lost between requests
- Counters reset

**Solution:**

This is expected behavior in stateless mode. Use external state:

```typescript
// ✅ Use external storage
import { DynamoDB } from 'aws-sdk';
const dynamo = new DynamoDB.DocumentClient();

server.addTool({
  name: 'update_counter',
  execute: async () => {
    await dynamo.update({
      TableName: 'Counters',
      Key: { id: 'global' },
      UpdateExpression: 'ADD #count :inc',
      ExpressionAttributeNames: { '#count': 'count' },
      ExpressionAttributeValues: { ':inc': 1 }
    }).promise();

    return 'Counter updated';
  },
});
```

---

## Related Guides

- [Configuration Guide](./CONFIGURATION.md) - Transport configuration options
- [FEATURES.md](./FEATURES.md) - Core server features
- [DEBUGGING.md](./DEBUGGING.md) - Debugging HTTP and STDIO transports
- [BUNDLING.md](./BUNDLING.md) - Deployment packaging

