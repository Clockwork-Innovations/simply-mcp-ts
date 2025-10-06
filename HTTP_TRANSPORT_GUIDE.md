# HTTP Transport Guide

## Overview

Simply-MCP's HTTP transport uses **Server-Sent Events (SSE)** via the MCP SDK's `StreamableHTTPServerTransport`. This guide explains how to properly use the HTTP transport.

## Important: SSE Requirement

The HTTP transport requires the `Accept: text/event-stream` header in all MCP requests.

### ✅ Correct Usage

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
      "clientInfo": {"name": "test", "version": "1.0.0"}
    }
  }'
```

### ❌ Common Mistake

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \  # ❌ Missing text/event-stream!
  -d '{"jsonrpc":"2.0",...}'
```

**Result:** `406 Not Acceptable` error

## Transport Modes

### Stateful Mode (Default)

Uses sessions to maintain state across requests.

```typescript
await server.start({
  transport: 'http',
  port: 3000,
  stateful: true,  // Default
});
```

**Requirements:**
1. First request must be `initialize` method
2. Subsequent requests must include `Mcp-Session-Id` header
3. Session ID is returned in the initialize response

**Example Flow:**

```bash
# Step 1: Initialize session
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
      "clientInfo": {"name": "test", "version": "1.0.0"}
    }
  }'

# Response includes session ID in SSE format:
# event: message
# data: {"result":{...},"jsonrpc":"2.0","id":1}

# Step 2: Use session ID in subsequent requests
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID_HERE" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

### Stateless Mode

No session management - each request is independent.

```typescript
await server.start({
  transport: 'http',
  port: 3000,
  stateful: false,
});
```

**Advantages:**
- Perfect for serverless environments (AWS Lambda, Cloud Functions)
- No session management overhead
- Horizontally scalable

**Usage:**

```bash
# No session initialization needed - just send requests
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

## Health Check Endpoint

The HTTP transport automatically provides a health check endpoint:

```bash
curl http://localhost:3000/health
```

**Response:**

```json
{
  "status": "ok",
  "server": {
    "name": "my-server",
    "version": "1.0.0",
    "description": "My MCP Server"
  },
  "transport": {
    "type": "http",
    "mode": "stateful",
    "sessions": 3,
    "port": 3000
  },
  "capabilities": {},
  "resources": {
    "tools": 5,
    "prompts": 2,
    "resources": 1
  },
  "uptime": 1234.567,
  "timestamp": "2025-10-06T01:00:00.000Z"
}
```

## Server Info Endpoint

```bash
curl http://localhost:3000/
```

**Response:**

```json
{
  "message": "my-server v1.0.0 - MCP Server",
  "description": "My MCP Server",
  "endpoints": {
    "mcp": "/mcp",
    "health": "/health"
  },
  "transport": {
    "type": "http",
    "mode": "stateful"
  },
  "documentation": "https://github.com/Clockwork-Innovations/simply-mcp-ts"
}
```

## Response Format

All MCP responses are in SSE format:

```
event: message
data: {"jsonrpc":"2.0","id":1,"result":{...}}

```

### Parsing SSE Responses

**JavaScript/TypeScript:**

```typescript
import axios from 'axios';

const response = await axios.post('http://localhost:3000/mcp', request, {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  },
});

// Response is SSE format - extract JSON from data field
const sseText = response.data;
const jsonMatch = sseText.match(/data: (.*)/);
if (jsonMatch) {
  const jsonResponse = JSON.parse(jsonMatch[1]);
  console.log(jsonResponse);
}
```

**Python:**

```python
import requests
import re
import json

response = requests.post(
    'http://localhost:3000/mcp',
    json=request_data,
    headers={
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
    }
)

# Parse SSE format
match = re.search(r'data: (.*)', response.text)
if match:
    json_response = json.loads(match.group(1))
    print(json_response)
```

## Common Issues

### Issue: 406 Not Acceptable

**Cause:** Missing `text/event-stream` in Accept header

**Solution:** Always include both content types:
```
Accept: application/json, text/event-stream
```

### Issue: "Bad Request: No valid session ID"

**Cause:** Trying to use stateful mode without session ID

**Solution:**
1. First send `initialize` request to get session ID
2. Include `Mcp-Session-Id` header in all subsequent requests
3. Or switch to stateless mode if you don't need sessions

### Issue: CORS Errors in Browser

**Cause:** CORS is enabled but may need configuration for your origin

**Solution:** The server allows `origin: '*'` by default. For production, configure CORS more strictly.

## Production Deployment

### Security Considerations

1. **CORS Configuration:**
   ```typescript
   // The server includes origin validation middleware
   // Only localhost/127.0.0.1 are allowed by default
   // Configure allowed origins for production
   ```

2. **HTTPS:**
   - Use a reverse proxy (nginx, traefik) for HTTPS
   - The MCP server runs HTTP only

3. **Rate Limiting:**
   - Add rate limiting middleware if needed
   - The health endpoint is not rate-limited

### Serverless Deployment

Use stateless mode for serverless:

```typescript
// lambda.ts
import { SimplyMCP } from 'simply-mcp';

const server = new SimplyMCP({
  name: 'lambda-server',
  version: '1.0.0',
});

// Add tools...

await server.start({
  transport: 'http',
  port: process.env.PORT || 3000,
  stateful: false,  // ✅ Stateless for serverless
});
```

### Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
services:
  mcp-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Complete Example

```typescript
import { SimplyMCP } from 'simply-mcp';
import { z } from 'zod';
import axios from 'axios';

// Create server
const server = new SimplyMCP({
  name: 'example-server',
  version: '1.0.0',
});

// Add tools
server.addTool({
  name: 'greet',
  description: 'Greet someone',
  parameters: z.object({
    name: z.string(),
  }),
  execute: async ({ name }) => ({
    content: [{ type: 'text', text: `Hello, ${name}!` }],
  }),
});

// Start HTTP server
await server.start({
  transport: 'http',
  port: 3000,
  stateful: true,
});

console.log('Server running on http://localhost:3000');
console.log('Health check: http://localhost:3000/health');

// Test the server
async function testServer() {
  // Initialize session
  const initResponse = await axios.post('http://localhost:3000/mcp', {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0.0' },
    },
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
  });

  // Extract session ID from SSE response
  const match = initResponse.data.match(/data: (.*)/);
  const initData = JSON.parse(match[1]);
  console.log('Initialized:', initData);

  // Get session ID from response or headers
  const sessionId = '...'; // Extract from response

  // Call tool
  const toolResponse = await axios.post('http://localhost:3000/mcp', {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'greet',
      arguments: { name: 'World' },
    },
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Mcp-Session-Id': sessionId,
    },
  });

  const toolMatch = toolResponse.data.match(/data: (.*)/);
  const toolData = JSON.parse(toolMatch[1]);
  console.log('Tool result:', toolData);
}
```

## Testing

### Using MCP Inspector

The official MCP Inspector works great with HTTP transport:

```bash
npx @modelcontextprotocol/inspector

# Then configure:
# Transport: HTTP
# URL: http://localhost:3000/mcp
```

### Using curl

```bash
# Health check
curl http://localhost:3000/health

# Initialize
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'

# List tools (with session ID)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

## Summary

- ✅ HTTP transport works via SSE (Server-Sent Events)
- ✅ Always include `Accept: text/event-stream` in requests
- ✅ Use stateful mode for interactive applications
- ✅ Use stateless mode for serverless deployments
- ✅ Health check endpoint at `/health`
- ✅ Server info at `/`
- ✅ CORS enabled by default with origin validation

**The HTTP transport is production-ready and working correctly - just remember to include the SSE Accept header!**
