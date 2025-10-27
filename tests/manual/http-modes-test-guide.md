# HTTP Transport Modes - Manual Testing Guide

This guide provides step-by-step instructions for manually testing the stateful and stateless HTTP transport modes in SimplyMCP.

## Overview

SimplyMCP supports two HTTP transport modes:

1. **Stateful Mode** (default): Session-based communication with persistent connections
2. **Stateless Mode**: Request-response without session tracking

## Prerequisites

- Node.js 20.0.0 or higher
- `simply-mcp` package installed or built from source
- `curl` and `jq` for command-line testing
- Alternatively, use Postman or another HTTP client

## Setup

### 1. Create Test Servers

Create two test server files to demonstrate both modes.

#### Stateful Server (`test-stateful-server.ts`)

```typescript
import { SimplyMCP } from 'simply-mcp';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'stateful-demo',
  version: '1.0.0',
});

server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({
    name: z.string(),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}! (Stateful mode)`;
  },
});

server.addTool({
  name: 'calculate',
  description: 'Add two numbers',
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async (args) => {
    return `Result: ${args.a + args.b}`;
  },
});

await server.start({
  transport: 'http',
  port: 3100,
  http: {
    mode: 'stateful', // Explicitly set stateful mode
  },
});
```

#### Stateless Server (`test-stateless-server.ts`)

```typescript
import { SimplyMCP } from 'simply-mcp';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'stateless-demo',
  version: '1.0.0',
});

server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({
    name: z.string(),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}! (Stateless mode)`;
  },
});

server.addTool({
  name: 'calculate',
  description: 'Add two numbers',
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async (args) => {
    return `Result: ${args.a + args.b}`;
  },
});

await server.start({
  transport: 'http',
  port: 3101,
  http: {
    mode: 'stateless', // Set stateless mode
  },
});
```

### 2. Start the Servers

In separate terminal windows:

```bash
# Terminal 1: Start stateful server
npx tsx test-stateful-server.ts

# Terminal 2: Start stateless server
npx tsx test-stateless-server.ts
```

## Testing Stateful Mode

### Test 1: Initialize Connection and Get Session ID

**Request:**
```bash
curl -i -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

**Expected Response:**
- HTTP 200 OK
- Header: `Mcp-Session-Id: <uuid>`
- Body contains initialization response with server info

**Save the session ID** from the response headers for subsequent requests.

### Test 2: List Tools with Session

**Request:**
```bash
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: <your-session-id>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }' | grep '^data:' | sed 's/^data: //' | jq .
```

**Expected Response:**
- Success response with list of available tools
- Tools should include `greet` and `calculate`

### Test 3: Call Tool with Session

**Request:**
```bash
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: <your-session-id>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "greet",
      "arguments": {
        "name": "Alice"
      }
    }
  }' | grep '^data:' | sed 's/^data: //' | jq .
```

**Expected Response:**
- Success response with tool result
- Should contain: `"Hello, Alice! (Stateful mode)"`

### Test 4: Request Without Session (Should Fail)

**Request:**
```bash
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/list"
  }' | jq .
```

**Expected Response:**
- Error response
- Message about missing or invalid session ID

### Test 5: GET Endpoint (SSE Stream)

**Request:**
```bash
curl -X GET http://localhost:3100/mcp \
  -H "Mcp-Session-Id: <your-session-id>" \
  -H "Accept: text/event-stream" \
  --no-buffer
```

**Expected Response:**
- HTTP 200 OK
- Opens SSE connection (may not send immediate data)
- Press Ctrl+C to close

### Test 6: DELETE Endpoint (Terminate Session)

**Request:**
```bash
curl -i -X DELETE http://localhost:3100/mcp \
  -H "Mcp-Session-Id: <your-session-id>"
```

**Expected Response:**
- HTTP 200 or 204
- Session is terminated

### Test 7: Verify Session Termination

**Request:**
```bash
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: <your-old-session-id>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/list"
  }' | jq .
```

**Expected Response:**
- Error response
- Message about invalid session (session has been terminated)

## Testing Stateless Mode

### Test 8: Initialize Connection (No Session Tracking)

**Request:**
```bash
curl -i -X POST http://localhost:3101/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

**Expected Response:**
- HTTP 200 OK
- NO `Mcp-Session-Id` header (or if present, it's not required for subsequent requests)
- Body contains initialization response

### Test 9: Tools/List Without Prior Initialization (Should Fail)

**Request:**
```bash
curl -X POST http://localhost:3101/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }' | grep '^data:' | sed 's/^data: //' | jq .
```

**Expected Response:**
- Error response
- Message: "Server not initialized" (each request needs initialization in stateless mode)

### Test 10: Multiple Independent Requests

Make the same initialize request 3 times:

**Request 1:**
```bash
curl -X POST http://localhost:3101/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "client1", "version": "1.0.0"}
    }
  }' | grep '^data:' | sed 's/^data: //' | jq .
```

**Request 2:**
```bash
curl -X POST http://localhost:3101/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "client2", "version": "1.0.0"}
    }
  }' | grep '^data:' | sed 's/^data: //' | jq .
```

**Request 3:**
```bash
curl -X POST http://localhost:3101/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "client3", "version": "1.0.0"}
    }
  }' | grep '^data:' | sed 's/^data: //' | jq .
```

**Expected Response:**
- All 3 requests should succeed independently
- No session tracking between requests

### Test 11: GET Endpoint (Should Not Exist)

**Request:**
```bash
curl -i -X GET http://localhost:3101/mcp \
  -H "Accept: text/event-stream"
```

**Expected Response:**
- HTTP 404 Not Found or 405 Method Not Allowed
- Stateless mode doesn't support SSE streaming

### Test 12: DELETE Endpoint (Should Not Exist)

**Request:**
```bash
curl -i -X DELETE http://localhost:3101/mcp
```

**Expected Response:**
- HTTP 404 Not Found or 405 Method Not Allowed
- Stateless mode doesn't have sessions to terminate

## Backwards Compatibility Testing

### Test 13: Default Behavior

Create a server without specifying `http.mode`:

```typescript
await server.start({
  transport: 'http',
  port: 3102,
  // No http.mode specified
});
```

**Expected Behavior:**
- Should default to `stateful` mode
- Should require session management
- GET and DELETE endpoints should be available

### Test 14: Invalid Mode

Try starting a server with an invalid mode:

```typescript
await server.start({
  transport: 'http',
  port: 3103,
  http: {
    mode: 'invalid-mode', // TypeScript should catch this
  },
});
```

**Expected Behavior:**
- TypeScript compilation error (if type-checked)
- Runtime error if mode validation is implemented

## Comparison Table

| Feature | Stateful Mode | Stateless Mode |
|---------|---------------|----------------|
| Session ID Required | Yes (after initialize) | No |
| Session Management | Yes | No |
| GET Endpoint (SSE) | Available | Not available |
| DELETE Endpoint | Available | Not available |
| Request Independence | No (session-based) | Yes (fully independent) |
| Initialization | Once per session | Per logical workflow |
| Concurrent Requests | Session-based isolation | Full independence |
| Use Case | Long-lived connections, streaming | RESTful APIs, load balancing |

## Troubleshooting

### Session ID Not Found

**Problem:** Getting "Invalid or missing session ID" error in stateful mode.

**Solution:**
1. Ensure you're including the `Mcp-Session-Id` header
2. Verify the session hasn't been terminated
3. Check that the session was created with an initialize request

### Server Not Initialized

**Problem:** Getting "Server not initialized" error in stateless mode.

**Solution:**
- In stateless mode, each logical workflow needs its own initialization
- The MCP SDK may require initialization before other operations

### Port Already in Use

**Problem:** Server fails to start with "port already in use" error.

**Solution:**
1. Change the port number in your server configuration
2. Kill any processes using the port: `lsof -ti:3100 | xargs kill`

## Summary

### Key Differences

- **Stateful Mode**: Traditional session-based communication, requires session tracking
- **Stateless Mode**: RESTful approach, no session state between requests

### When to Use Each Mode

**Stateful Mode:**
- Interactive applications
- Long-running conversations
- SSE streaming support needed
- Desktop applications (like Claude Desktop)

**Stateless Mode:**
- RESTful APIs
- Load-balanced environments
- Serverless deployments
- Simple request-response patterns

## Further Testing

For automated testing, run:

```bash
# Run integration tests
cd tests
./test-http-modes.sh

# Run all tests
npm test
```

## Reporting Issues

If you encounter any issues during manual testing:

1. Check server logs for error messages
2. Verify the request format matches the examples
3. Ensure you're using the correct port and endpoint
4. Report issues with:
   - Server configuration used
   - Request/response examples
   - Error messages
   - Server logs

---

**Last Updated:** 2025-10-04
**Version:** 1.0.0
