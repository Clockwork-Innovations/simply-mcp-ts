# MCP Transport Types - Comparison Guide

This guide compares all supported transport types in the MCP framework and helps you choose the right one for your use case.

## Overview

The MCP framework supports four transport types:

1. **Stdio** - Standard input/output communication
2. **Stateless HTTP** - HTTP without session persistence
3. **Stateful HTTP** - HTTP with session management
4. **SSE** - Server-Sent Events (legacy)

## Quick Comparison Table

| Feature | Stdio | Stateless HTTP | Stateful HTTP | SSE (Legacy) |
|---------|-------|----------------|---------------|--------------|
| **Communication** | stdin/stdout | HTTP POST | HTTP POST/GET/DELETE | HTTP GET + POST |
| **Session Management** | Per-process | None | Yes (header-based) | Yes (query param) |
| **Bidirectional** | Yes | No (request/response) | Yes (with GET for SSE) | Yes |
| **Streaming** | Yes | No | Yes (SSE on GET) | Yes |
| **State Persistence** | In-process | None | Server-side | Server-side |
| **Transport Mode** | N/A | Stateless | Stateful | Legacy |
| **Transport Lifecycle** | Process lifetime | Created per request | Reused per session | Persistent connection |
| **Best For** | CLI tools, local | Serverless, Lambda | Web apps, persistence | Legacy systems |
| **Complexity** | Low | Low | Medium | High |
| **Performance** | Excellent | Good | Good | Moderate |
| **Network Required** | No | Yes | Yes | Yes |
| **Scalability** | Single process | Excellent (any server) | Good (session affinity) | Moderate |

## Detailed Comparison

### 1. Stdio Transport

**Description:** Uses standard input and output streams for JSON-RPC communication.

**Architecture:**
```
┌─────────┐       stdin        ┌──────────┐
│ Client  │ ──────────────────> │  Server  │
│         │ <────────────────── │          │
└─────────┘      stdout        └──────────┘
```

**Characteristics:**
- ✅ No network overhead
- ✅ Simple protocol
- ✅ Excellent for CLI tools
- ✅ Natural for subprocess communication
- ❌ Limited to single process
- ❌ Not suitable for web applications

**Configuration:**
```typescript
// Server: mcp/servers/stdioServer.ts
node mcp/servers/stdioServer.ts config.json

// Usage:
echo '{"jsonrpc":"2.0","id":1,"method":"initialize",...}' | \
  node mcp/servers/stdioServer.ts config.json
```

**Use Cases:**
- Command-line tools
- Editor integrations (VS Code, etc.)
- Local automation scripts
- Subprocess communication
- Development and testing

**Example:**
```bash
# Start stdio server
node mcp/servers/stdioServer.ts mcp/config-test.json

# Send request via pipe
echo '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}' | node mcp/servers/stdioServer.ts mcp/config-test.json
```

---

### 2. Stateless HTTP Transport

**Description:** HTTP server that creates a new transport for each request. No session tracking.

**Architecture:**
```
┌─────────┐    POST /mcp       ┌──────────┐
│ Client  │ ──────────────────> │  Server  │
│         │ <────────────────── │ (creates │
└─────────┘    JSON Response    │ new      │
                                │ transport│
                                └──────────┘
```

**Characteristics:**
- ✅ Simple stateless architecture
- ✅ Excellent for serverless/FaaS
- ✅ Easy to scale horizontally
- ✅ No session cleanup needed
- ✅ Perfect for REST APIs
- ❌ No state persistence between requests
- ❌ Higher overhead per request

**Configuration:**
```typescript
// Server: mcp/servers/statelessServer.ts
// Default port: 3003
node mcp/servers/statelessServer.ts config.json
```

**Use Cases:**
- AWS Lambda / Cloud Functions
- Stateless microservices
- Simple REST APIs
- One-off operations
- Load-balanced services

**Example:**
```bash
# Start server
node mcp/servers/statelessServer.ts mcp/config-test.json

# Make request (no session ID needed)
curl -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "client", "version": "1.0.0"}
    }
  }'

# Each request is independent
curl -X POST http://localhost:3003/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

---

### 3. Stateful HTTP Transport

**Description:** HTTP server with session management. Sessions are tracked via `Mcp-Session-Id` header.

**Architecture:**
```
┌─────────┐  POST /mcp          ┌──────────┐
│ Client  │ ─────────────────> │  Server  │
│         │ (initialize)        │          │
│         │ <───────────────── │ Returns  │
│         │  Mcp-Session-Id     │ Session  │
│         │                     │ ID       │
│         │  POST /mcp          │          │
│         │ ─────────────────> │          │
│         │ (with session ID)   │ (reuses  │
│         │ <───────────────── │ existing │
│         │                     │ transport│
│         │  GET /mcp           │          │
│         │ ─────────────────> │          │
│         │ (SSE stream)        │ (streams │
│         │ <───────────────── │ events)  │
└─────────┘                     └──────────┘
```

**Characteristics:**
- ✅ Maintains state across requests
- ✅ Supports SSE streaming via GET
- ✅ Session isolation between clients
- ✅ Graceful session termination
- ✅ Best for web applications
- ❌ Requires session management
- ❌ More complex than stateless

**Configuration:**
```typescript
// Server: mcp/configurableServer.ts
// Default port: 3002
node mcp/configurableServer.ts config.json
```

**Endpoints:**
- `POST /mcp` - Send JSON-RPC requests (with session ID header)
- `GET /mcp` - Establish SSE stream (with session ID header)
- `DELETE /mcp` - Terminate session (with session ID header)

**Use Cases:**
- Web applications
- Long-running connections
- Applications requiring state
- Multi-step workflows
- Real-time updates via SSE

**Example:**
```bash
# Start server
node mcp/configurableServer.ts mcp/config-test.json

# Initialize and get session ID
response=$(curl -s -i -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "client", "version": "1.0.0"}
    }
  }')

# Extract session ID from Mcp-Session-Id header
SESSION_ID=$(echo "$response" | grep -i "mcp-session-id:" | sed 's/.*: *//' | tr -d '\r\n')

# Use session for subsequent requests
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# Establish SSE stream
curl -N -X GET http://localhost:3002/mcp \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -H "Accept: text/event-stream"

# Terminate session
curl -X DELETE http://localhost:3002/mcp \
  -H "Mcp-Session-Id: $SESSION_ID"
```

---

### 4. SSE Transport (Legacy)

**Description:** Server-Sent Events transport. Legacy protocol maintained for backwards compatibility.

**Architecture:**
```
┌─────────┐  GET /mcp           ┌──────────┐
│ Client  │ ─────────────────> │  Server  │
│         │                     │          │
│         │ <───────────────── │ SSE:     │
│         │  event: endpoint    │ endpoint │
│         │  data: /messages?   │          │
│         │        sessionId=X  │          │
│         │                     │          │
│         │  POST /messages?    │          │
│         │       sessionId=X   │          │
│         │ ─────────────────> │          │
│         │                     │ (process │
│         │ <───────────────── │ via SSE) │
│         │  (SSE events)       │          │
└─────────┘                     └──────────┘
```

**Characteristics:**
- ✅ True server push capability
- ✅ Standard SSE protocol
- ✅ Good browser support
- ❌ Legacy transport (being phased out)
- ❌ More complex protocol
- ❌ Session via query parameters

**Configuration:**
```typescript
// Server: mcp/servers/sseServer.ts
// Default port: 3004
node mcp/servers/sseServer.ts config.json
```

**Endpoints:**
- `GET /mcp` - Establish SSE connection (returns session ID in endpoint event)
- `POST /messages?sessionId=xxx` - Send JSON-RPC messages

**Use Cases:**
- Legacy system integration
- Systems requiring SSE specifically
- Migration from older MCP versions
- Real-time server push

**Example:**
```bash
# Start server
node mcp/servers/sseServer.ts mcp/config-test.json

# Establish SSE connection (in background)
curl -N -X GET http://localhost:3004/mcp \
  -H "Accept: text/event-stream" > sse-stream.log &

# Wait for session ID
sleep 1

# Extract session ID from endpoint event
SESSION_ID=$(grep -A1 "event: endpoint" sse-stream.log | \
  grep "data:" | sed 's/.*sessionId=//')

# Send messages
curl -X POST "http://localhost:3004/messages?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

---

## Decision Tree: Which Transport Should I Use?

```
Is this a CLI tool or local process?
├─ Yes → Use Stdio Transport
└─ No ↓

Is this a web/network application?
├─ No → Re-evaluate: Stdio might be appropriate
└─ Yes ↓

Are you deploying to serverless (Lambda, Cloud Functions)?
├─ Yes → Use HTTP with Stateless Mode
│         • No session management overhead
│         • Perfect for FaaS environments
│         • Horizontal scaling
└─ No ↓

Does your application need to maintain state across requests?
├─ No → Use HTTP with Stateless Mode
│         • Simple request-response
│         • Easier load balancing
│         • Lower complexity
└─ Yes ↓

Do you need SSE streaming or real-time updates?
├─ Yes → Use HTTP with Stateful Mode
│         • Session-based state
│         • SSE streaming support
│         • Multi-step workflows
└─ No, but need state → Use HTTP with Stateful Mode

Are you integrating with legacy systems?
├─ Yes, requires SSE → Use SSE Transport (Legacy)
│                      (consider migrating to Stateful HTTP)
└─ No → You've made your choice above
```

### Mode Selection Summary

**Use HTTP Stateless Mode if:**
- Deploying to AWS Lambda, Google Cloud Functions, Azure Functions
- Each request is fully independent
- You need maximum horizontal scalability
- You're behind a load balancer without sticky sessions
- You want simplest possible implementation
- You don't need SSE or real-time updates

**Use HTTP Stateful Mode if:**
- Building a web application with user sessions
- Multi-step workflows requiring context
- Need SSE streaming for real-time updates
- Want to maintain conversation state
- Have infrastructure supporting session affinity
- Need lower per-request overhead after initialization

**Use Stdio if:**
- Building CLI tools
- Editor integrations (VS Code, etc.)
- Local automation scripts
- Subprocess communication
- Development and testing

## Performance Characteristics

### Latency Comparison

```
Stdio:           < 1ms   (no network overhead)
Stateless HTTP:  10-50ms (network + transport creation)
Stateful HTTP:   5-20ms  (network only, reuses transport)
SSE:             5-30ms  (network + SSE overhead)
```

### Throughput

```
Stdio:           10,000+ req/s (limited by process)
Stateless HTTP:  1,000+ req/s  (limited by server capacity)
Stateful HTTP:   2,000+ req/s  (limited by concurrent sessions)
SSE:             500+ req/s    (limited by connection overhead)
```

### Resource Usage

```
Stdio:           Minimal (single process)
Stateless HTTP:  Low (no state)
Stateful HTTP:   Medium (session tracking)
SSE:             Medium-High (persistent connections)
```

## Migration Guide

### From SSE to Stateful HTTP

**Why migrate?**
- Simpler protocol
- Better scalability
- Modern standard
- Easier debugging

**Migration steps:**

1. **Update endpoint URLs:**
   ```typescript
   // Old (SSE)
   GET  /mcp              → establish connection
   POST /messages?sessionId=xxx → send messages

   // New (Stateful HTTP)
   POST /mcp              → initialize + subsequent requests
   GET  /mcp              → SSE stream (optional)
   ```

2. **Update session handling:**
   ```typescript
   // Old (SSE)
   sessionId in query parameter

   // New (Stateful HTTP)
   sessionId in Mcp-Session-Id header
   ```

3. **Update client code:**
   ```typescript
   // Old
   const sse = new EventSource('/mcp');
   sse.addEventListener('endpoint', (event) => {
     const endpoint = event.data;
     // Extract sessionId from endpoint
   });

   // New
   const response = await fetch('/mcp', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ /* initialize */ })
   });
   const sessionId = response.headers.get('Mcp-Session-Id');
   ```

### From Stateless to Stateful

**When to migrate:**
- Need to maintain conversation context
- Multi-step workflows
- Real-time updates via SSE

**Migration steps:**

1. **Add session management:**
   ```typescript
   // Store session ID after initialization
   const sessionId = response.headers.get('Mcp-Session-Id');
   ```

2. **Include session in requests:**
   ```typescript
   fetch('/mcp', {
     headers: { 'Mcp-Session-Id': sessionId }
   });
   ```

3. **Add session cleanup:**
   ```typescript
   // On disconnect or logout
   fetch('/mcp', {
     method: 'DELETE',
     headers: { 'Mcp-Session-Id': sessionId }
   });
   ```

## Testing

Each transport type has a comprehensive test suite:

```bash
# Test individual transports
bash mcp/tests/test-stdio.sh
bash mcp/tests/test-stateless-http.sh
bash mcp/tests/test-stateful-http.sh
bash mcp/tests/test-sse.sh

# Run all tests
bash mcp/tests/run-all-tests.sh
```

## Best Practices

### Stdio
- Use for CLI tools and local processes
- Log to stderr, use stdout only for JSON-RPC
- Handle process signals (SIGINT, SIGTERM) gracefully
- Keep responses synchronous

### Stateless HTTP
- Design handlers to be truly stateless
- Use for serverless deployments
- Optimize cold starts
- Cache configuration loading

### Stateful HTTP
- Implement session expiration
- Clean up sessions on disconnect
- Use session isolation for security
- Monitor active session count

### SSE (Legacy)
- Migrate to Stateful HTTP when possible
- Implement reconnection logic
- Handle connection drops gracefully
- Use keepalive events

## Configuration Examples

### Common Configuration (works with all transports)

```json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "port": 3000,
  "tools": [
    {
      "name": "example-tool",
      "description": "An example tool",
      "inputSchema": {
        "type": "object",
        "properties": {
          "input": {
            "type": "string",
            "description": "Input parameter"
          }
        },
        "required": ["input"]
      },
      "handler": {
        "type": "file",
        "path": "./handlers/exampleHandler.ts"
      }
    }
  ]
}
```

### Transport-Specific Settings

```typescript
// Stdio - No additional config needed
// Uses config.json, port ignored
await server.start({ transport: 'stdio' });

// Stateless HTTP
await server.start({
  transport: 'http',
  port: 3003,
  http: { mode: 'stateless' }
});

// Stateful HTTP (default mode)
await server.start({
  transport: 'http',
  port: 3002,
  http: {
    mode: 'stateful',  // default, can be omitted
    enableJsonResponse: false,  // default
    dnsRebindingProtection: true  // default
  }
});

// SSE (Legacy) - Not directly supported via SimplyMCP
// Use custom implementation or migrate to Stateful HTTP
```

## Troubleshooting

### Common Issues

**Stdio: "Broken pipe" errors**
- Client disconnected prematurely
- Check client error handling

**Stateless HTTP: High latency**
- Transport creation overhead
- Consider migrating to stateful

**Stateful HTTP: Session not found**
- Session expired or invalid
- Implement session validation

**SSE: Connection drops**
- Network timeout
- Implement reconnection logic
- Use keepalive events

## Further Reading

- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [Server-Sent Events Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [MCP Framework Architecture](./ARCHITECTURE.md)

---

**Last Updated:** 2025-09-30
**MCP Framework Version:** 1.0.0