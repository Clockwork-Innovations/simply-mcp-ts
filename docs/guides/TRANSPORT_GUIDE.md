# Simply MCP Transport Guide

> **Complete guide to all transport modes in Simply MCP**
> Version: 3.0.0

## Table of Contents

- [Introduction](#introduction)
  - [What are MCP Transports?](#what-are-mcp-transports)
  - [Why Multiple Transport Options?](#why-multiple-transport-options)
  - [Which Transport Should I Use?](#which-transport-should-i-use)
- [Transport Comparison](#transport-comparison)
  - [Feature Matrix](#feature-matrix)
  - [Performance Characteristics](#performance-characteristics)
  - [Use Case Mapping](#use-case-mapping)
- [Stdio Transport](#stdio-transport)
  - [What is Stdio?](#what-is-stdio)
  - [How It Works](#how-it-works)
  - [Architecture](#architecture-stdio)
  - [Configuration](#configuration-stdio)
  - [Examples (All APIs)](#examples-all-apis-stdio)
  - [Claude Desktop Integration](#claude-desktop-integration)
  - [Debugging](#debugging-stdio)
  - [Best Practices](#best-practices-stdio)
  - [Troubleshooting](#troubleshooting-stdio)
- [HTTP Stateful Transport](#http-stateful-transport)
  - [What is HTTP Stateful?](#what-is-http-stateful)
  - [Session Management](#session-management)
  - [SSE Streaming](#sse-streaming)
  - [Architecture](#architecture-stateful)
  - [Configuration](#configuration-stateful)
  - [Examples (All APIs)](#examples-all-apis-stateful)
  - [Client Connection](#client-connection-stateful)
  - [CORS Handling](#cors-handling)
  - [Best Practices](#best-practices-stateful)
  - [Troubleshooting](#troubleshooting-stateful)
- [HTTP Stateless Transport](#http-stateless-transport)
  - [What is HTTP Stateless?](#what-is-http-stateless)
  - [Serverless Architecture](#serverless-architecture)
  - [Configuration](#configuration-stateless)
  - [Examples (All APIs)](#examples-all-apis-stateless)
  - [AWS Lambda Integration](#aws-lambda-integration)
  - [Cloud Functions Deployment](#cloud-functions-deployment)
  - [Cold Start Optimization](#cold-start-optimization)
  - [Best Practices](#best-practices-stateless)
  - [Troubleshooting](#troubleshooting-stateless)
- [SSE Transport (Legacy)](#sse-transport-legacy)
  - [What is SSE Transport?](#what-is-sse-transport)
  - [Why Legacy?](#why-legacy)
  - [Migration to HTTP Modes](#migration-to-http-modes)
  - [Configuration](#configuration-sse)
- [Choosing the Right Transport](#choosing-the-right-transport)
  - [Decision Tree](#decision-tree)
  - [Environment Analysis](#environment-analysis)
  - [Security Considerations](#security-considerations)
  - [Scalability Requirements](#scalability-requirements)
- [Advanced Topics](#advanced-topics)
  - [Custom Ports](#custom-ports)
  - [Environment Configuration](#environment-configuration)
  - [Load Balancing](#load-balancing)
  - [Health Monitoring](#health-monitoring)
  - [Scaling Strategies](#scaling-strategies)
- [Multi-Transport Servers](#multi-transport-servers)
  - [Running Multiple Transports](#running-multiple-transports)
  - [Dynamic Transport Switching](#dynamic-transport-switching)
- [Testing Transports](#testing-transports)
  - [Testing Stdio Servers](#testing-stdio-servers)
  - [Testing HTTP Servers](#testing-http-servers)
  - [Testing Tools](#testing-tools)
- [Production Deployment](#production-deployment)
  - [Stdio in Production](#stdio-in-production)
  - [HTTP Stateful in Production](#http-stateful-in-production)
  - [HTTP Stateless in Production](#http-stateless-in-production)
  - [Docker Deployment](#docker-deployment)
  - [Kubernetes Deployment](#kubernetes-deployment)

---

## Introduction

### What are MCP Transports?

**MCP Transports** are communication channels between your MCP server and clients (like Claude Desktop, web applications, or other services). They define:

- **How messages are sent** (stdio pipes, HTTP requests, Server-Sent Events)
- **How connections are established** (process spawning, HTTP sessions, WebSocket-like streams)
- **How state is managed** (per-process, session-based, or stateless)
- **What deployment options are available** (local processes, web servers, serverless functions)

Think of transports as the "postal system" for your MCP server:
- **Stdio** = Direct mail between two people in the same building
- **HTTP Stateful** = Post office with mailboxes (sessions)
- **HTTP Stateless** = Drop box with no tracking (pure request/response)
- **SSE** = Old telegraph system (removed in v3.0.0)

### Why Multiple Transport Options?

Simply MCP provides 3 transport modes because different applications have different needs:

**1. Desktop Integration (Stdio)**
   - Claude Desktop spawns your server as a subprocess
   - Direct stdin/stdout communication
   - No network configuration needed
   - Ideal for local AI assistants

**2. Web Applications (HTTP Stateful)**
   - Browser-based clients need HTTP
   - Sessions maintain conversation context
   - SSE enables real-time streaming
   - Perfect for web dashboards

**3. Serverless APIs (HTTP Stateless)**
   - AWS Lambda, Cloud Functions, etc.
   - No persistent state
   - Infinite horizontal scaling
   - Pay-per-request pricing

**Note**: SSE transport was removed in v3.0.0. Use HTTP Stateful mode for session-based streaming.
   - Limited features compared to HTTP modes

### Which Transport Should I Use?

**Quick Decision Guide:**

```
Are you building for Claude Desktop?
  → Use Stdio

Are you deploying to serverless (Lambda, Cloud Functions)?
  → Use HTTP Stateless

Are you building a web app with real-time features?
  → Use HTTP Stateful

Not sure?
  → Start with Stdio (simplest), migrate later if needed
```

**Detailed comparison in [Transport Comparison](#transport-comparison).**

---

## Transport Comparison

### Feature Matrix

| Feature | Stdio | HTTP Stateful | HTTP Stateless |
|---------|-------|---------------|----------------|
| **Connection** | Process spawn | HTTP session | HTTP request |
| **State Management** | Per-process | Header-based sessions | None |
| **Streaming** | ❌ No | ✅ Yes (SSE) | ❌ No |
| **Progress Reporting** | ❌ No | ✅ Yes | ❌ No |
| **Concurrent Clients** | 1 per process | Multiple sessions | Unlimited |
| **Session Persistence** | ✅ In-process | ✅ Across requests | ❌ None |
| **Scalability** | Low (1:1) | Medium (N sessions) | ✅ High (serverless) |
| **Complexity** | ⭐ Low | ⭐⭐ Medium | ⭐ Low |
| **Setup Time** | Instant | < 1 second | Instant |
| **Network Required** | ❌ No | ✅ Yes | ✅ Yes |
| **CORS Support** | N/A | ✅ Yes | ✅ Yes |
| **Health Endpoints** | N/A | ✅ `/health` | ✅ `/health` |
| **Deployment** | Local only | Server/Container | Serverless |

### Performance Characteristics

```
┌─────────────────────────────────────────────────────────┐
│                   Latency Comparison                    │
├─────────────────────────────────────────────────────────┤
│ Stdio:              █ 1-5ms (IPC overhead)              │
│ HTTP Stateful:      ████ 10-50ms (network + session)    │
│ HTTP Stateless:     ██ 5-20ms (no session lookup)       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 Throughput Comparison                   │
├─────────────────────────────────────────────────────────┤
│ Stdio:              ████████ High (direct IPC)          │
│ HTTP Stateful:      ████ Medium (network bound)         │
│ HTTP Stateless:     ██████ High (parallel requests)     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   Memory Footprint                      │
├─────────────────────────────────────────────────────────┤
│ Stdio:              ██ Low (single process)             │
│ HTTP Stateful:      ████ Medium (session storage)       │
│ HTTP Stateless:     █ Very Low (no state)               │
└─────────────────────────────────────────────────────────┘
```

**Benchmarks (requests/second):**
- **Stdio**: ~10,000 (local IPC)
- **HTTP Stateful**: ~1,000 (network + session overhead)
- **HTTP Stateless**: ~5,000 (no session, but network overhead)

*Note: Benchmarks are approximate and vary based on hardware, network, and payload size.*

### Use Case Mapping

| Use Case | Recommended Transport | Why |
|----------|----------------------|-----|
| **Claude Desktop** | Stdio | Only supported transport |
| **Web Dashboard** | HTTP Stateful | Sessions + streaming |
| **AWS Lambda** | HTTP Stateless | Serverless-friendly |
| **CLI Tool** | Stdio | Simple, no network |
| **Mobile App** | HTTP Stateful | Network-based, sessions |
| **Batch Processing** | Stdio or Stateless | No state needed |
| **Real-Time Chat** | HTTP Stateful | SSE streaming |
| **Multi-Tenant SaaS** | HTTP Stateful | Session isolation |
| **Edge Functions** | HTTP Stateless | Fast cold starts |
| **Load-Balanced API** | HTTP Stateless | No sticky sessions |
| **Desktop Agent** | Stdio | Local, integrated |
| **Webhook Handler** | HTTP Stateless | One-off requests |

---

## Stdio Transport

### What is Stdio?

**Stdio** (Standard Input/Output) is a transport that communicates via process streams:

- **stdin**: Client sends JSON-RPC requests to your server
- **stdout**: Server sends JSON-RPC responses back
- **stderr**: Server logs (doesn't interfere with protocol)

```
┌──────────────┐          ┌──────────────┐
│   Client     │   stdin  │  MCP Server  │
│ (Claude CLI) │─────────>│   Process    │
│              │          │              │
│              │  stdout  │              │
│              │<─────────│              │
└──────────────┘          └──────────────┘
        ↑                        │
        │                        │ stderr
        │                        ↓
        │                  Console logs
```

### How It Works

**Process Lifecycle:**

1. **Spawn**: Client spawns your server as a child process
2. **Initialize**: Client sends `initialize` request via stdin
3. **Communicate**: JSON-RPC messages flow through pipes
4. **Terminate**: Client sends SIGINT or closes pipes

**Message Flow:**

```typescript
// Client writes to stdin:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": { "name": "greet", "arguments": { "name": "World" } }
}

// Server reads from stdin, processes, writes to stdout:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{ "type": "text", "text": "Hello, World!" }]
  }
}
```

### Architecture (Stdio)

```
┌─────────────────────────────────────────────────────────┐
│                    Client Process                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │         MCP Client (Claude Desktop)                │ │
│  └────────────────────────────────────────────────────┘ │
│           │ spawn process                │ read/write   │
│           ↓                              ↓              │
│  ┌────────────────────────────────────────────────────┐ │
│  │         stdio transport layer                      │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                         │
                         │ stdin/stdout pipes
                         ↓
┌─────────────────────────────────────────────────────────┐
│                   Server Process                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │      StdioServerTransport (MCP SDK)                │ │
│  └────────────────────────────────────────────────────┘ │
│           │                              ↑              │
│           ↓                              │              │
│  ┌────────────────────────────────────────────────────┐ │
│  │           MCP Server (SimplyMCP)                   │ │
│  │  ┌──────────┐  ┌────────┐  ┌──────────────┐      │ │
│  │  │  Tools   │  │Prompts │  │  Resources   │      │ │
│  │  └──────────┘  └────────┘  └──────────────┘      │ │
│  └────────────────────────────────────────────────────┘ │
│                                  │                       │
│                                  ↓ stderr                │
│                         Console.error() logs             │
└─────────────────────────────────────────────────────────┘
```

**Key Characteristics:**
- One client per server process
- State lives in process memory
- Logs go to stderr (won't corrupt protocol)
- Process termination cleans up resources

### Configuration (Stdio)

**Default (no explicit transport needed):**

```typescript
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0'
});

// Defaults to stdio
await server.start();
```

**Explicit stdio configuration:**

```typescript
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  transport: {
    type: 'stdio'
  }
});

await server.start();
```

**Override at start time:**

```typescript
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  transport: {
    type: 'http',  // Default HTTP
    port: 3000
  }
});

// But start with stdio instead
await server.start({ transport: 'stdio' });
```

### Examples (All APIs - Stdio)

#### Functional API

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'stdio-functional',
  version: '1.0.0'
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

await server.start({ transport: 'stdio' });
```

**Run:**
```bash
npx simply-mcp run server.ts
```

#### Decorator API

```typescript
import { MCPServer, tool } from 'simply-mcp';

@MCPServer()
export default class StdioServer {
  /**
   * Greet a user
   * @param name - User's name
   */
  @tool()
  async greet(name: string) {
    return { message: `Hello, ${name}!` };
  }
}
```

**Run:**
```bash
npx simply-mcp run StdioServer.ts
```

#### Interface API

```typescript
import type { ITool, IServer } from 'simply-mcp';

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a user';
  params: { name: string };
  result: { message: string };
}

interface StdioService extends IServer {
  name: 'stdio-interface';
  version: '1.0.0';
}

export default class StdioServiceImpl implements StdioService {
  greet: GreetTool = async (params) => ({
    message: `Hello, ${params.name}!`
  });
}
```

**Run:**
```bash
npx simply-mcp run StdioServiceImpl.ts
```

### Claude Desktop Integration

**Configuration File Location:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Configuration Format:**

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/absolute/path/to/server.js"]
    }
  }
}
```

**With npx (recommended for TypeScript):**

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "/absolute/path/to/server.ts"
      ]
    }
  }
}
```

**With environment variables:**

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/path/to/server.js"],
      "env": {
        "API_KEY": "secret-key",
        "DEBUG": "true"
      }
    }
  }
}
```

**Multiple servers:**

```json
{
  "mcpServers": {
    "calculator": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/calculator.ts"]
    },
    "weather": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/weather.ts"]
    },
    "filesystem": {
      "command": "node",
      "args": ["/path/to/fs-server.js"]
    }
  }
}
```

**Verifying Configuration:**

1. Save the config file
2. Restart Claude Desktop
3. Click the MCP icon (🔌) in Claude Desktop
4. You should see your server listed
5. If errors occur, check the Claude Desktop logs:
   - **macOS**: `~/Library/Logs/Claude/mcp*.log`
   - **Windows**: `%LOCALAPPDATA%\Claude\logs\mcp*.log`
   - **Linux**: `~/.local/state/Claude/logs/mcp*.log`

### Debugging (Stdio)

**Console Logging:**

```typescript
// ❌ WRONG - Corrupts stdout protocol
console.log('Debug info');

// ✅ CORRECT - Logs to stderr
console.error('Debug info');
```

**With context logger:**

```typescript
server.addTool({
  name: 'debug_tool',
  parameters: z.object({ input: z.string() }),
  execute: async (args, context) => {
    // Logs to stderr
    context?.logger.debug('Processing input:', args.input);
    context?.logger.info('Step 1 complete');
    context?.logger.warn('Potential issue detected');
    context?.logger.error('Error occurred');

    return 'Done';
  },
});
```

**Debugging with MCP Inspector:**

```bash
# Install inspector
npm install -g @modelcontextprotocol/inspector

# Run your server with inspector
npx @modelcontextprotocol/inspector npx tsx server.ts
```

Opens a web UI at http://localhost:6274 showing:
- All requests/responses
- Tool definitions
- Logs
- Performance metrics

**Manual Testing:**

```bash
# Test initialize request
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | npx tsx server.ts

# Test tools/list
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | npx tsx server.ts
```

### Best Practices (Stdio)

**1. Always log to stderr:**
```typescript
// ✅ Good
console.error('[MyServer] Starting...');
context?.logger.info('Processing request');

// ❌ Bad
console.log('Starting...');  // Corrupts stdout
```

**2. Handle SIGINT gracefully:**
```typescript
process.on('SIGINT', async () => {
  console.error('[MyServer] Shutting down gracefully...');
  await server.stop();
  process.exit(0);
});
```

**3. Validate inputs thoroughly:**
```typescript
server.addTool({
  name: 'process_file',
  parameters: z.object({
    path: z.string()
      .min(1, 'Path cannot be empty')
      .refine(p => !p.includes('..'), 'Path traversal not allowed'),
  }),
  execute: async (args) => {
    // Safe to use args.path
  },
});
```

**4. Return structured errors:**
```typescript
execute: async (args) => {
  try {
    return await processData(args);
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}
```

**5. Use absolute paths in Claude config:**
```json
{
  "command": "node",
  "args": ["/Users/username/projects/my-server/dist/server.js"]
}
```

**6. Keep server stateless if possible:**
```typescript
// ❌ Avoid server-wide state (process may be restarted)
let globalCounter = 0;

// ✅ Use request-specific data or external storage
execute: async (args) => {
  const counter = await redis.incr('counter');
  return `Count: ${counter}`;
}
```

### Troubleshooting (Stdio)

#### Issue: Server not appearing in Claude Desktop

**Symptoms:**
- Server not listed in MCP menu
- No error messages in Claude

**Solutions:**

1. **Check config file location:**
   ```bash
   # macOS
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

   # Windows
   type %APPDATA%\Claude\claude_desktop_config.json
   ```

2. **Validate JSON syntax:**
   ```bash
   # Use jq or online JSON validator
   cat claude_desktop_config.json | jq .
   ```

3. **Use absolute paths:**
   ```json
   {
     "command": "node",
     "args": ["/full/path/to/server.js"]  // Not ./server.js
   }
   ```

4. **Check permissions:**
   ```bash
   chmod +x server.js
   ```

5. **Restart Claude Desktop** (required after config changes)

#### Issue: Protocol errors / Invalid responses

**Symptoms:**
- "Invalid JSON-RPC response"
- "Unexpected output on stdout"

**Solutions:**

1. **Check all console.log statements:**
   ```typescript
   // Find and replace
   console.log → console.error
   ```

2. **Validate JSON output:**
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | npx tsx server.ts | jq .
   ```

3. **Enable debug mode:**
   ```typescript
   console.error('[Debug] Request:', JSON.stringify(request));
   console.error('[Debug] Response:', JSON.stringify(response));
   ```

#### Issue: Server crashes or hangs

**Symptoms:**
- Process terminates unexpectedly
- Claude Desktop shows "Server disconnected"
- No response to requests

**Solutions:**

1. **Add error handling:**
   ```typescript
   process.on('uncaughtException', (error) => {
     console.error('[Fatal] Uncaught exception:', error);
     process.exit(1);
   });

   process.on('unhandledRejection', (reason) => {
     console.error('[Fatal] Unhandled rejection:', reason);
     process.exit(1);
   });
   ```

2. **Check for infinite loops or long-running operations:**
   ```typescript
   execute: async (args) => {
     // ✅ Add timeout
     const timeoutMs = 30000;
     const timeout = new Promise((_, reject) =>
       setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
     );

     return await Promise.race([
       processData(args),
       timeout
     ]);
   }
   ```

3. **Check Claude Desktop logs:**
   ```bash
   # macOS
   tail -f ~/Library/Logs/Claude/mcp*.log

   # Windows
   type %LOCALAPPDATA%\Claude\logs\mcp*.log
   ```

---

## HTTP Stateful Transport

### What is HTTP Stateful?

**HTTP Stateful** is a session-based transport that:

- Uses HTTP for request/response communication
- Maintains sessions across multiple requests
- Streams events via Server-Sent Events (SSE)
- Supports multiple concurrent clients
- Tracks session state with unique IDs

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

### Examples (All APIs - Stateful)

#### Functional API

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'http-stateful-functional',
  version: '1.0.0',
  capabilities: {
    logging: true
  }
});

server.addTool({
  name: 'process_with_progress',
  description: 'Process data with progress updates',
  parameters: z.object({
    items: z.array(z.string()),
  }),
  execute: async (args, context) => {
    const total = args.items.length;

    for (let i = 0; i < total; i++) {
      // Process item
      await processItem(args.items[i]);

      // Report progress (requires progressToken from client)
      if (context?.reportProgress) {
        await context.reportProgress(i + 1, total, `Processing ${i + 1}/${total}`);
      }

      // Log to client (requires logging capability)
      context?.logger.info(`Processed: ${args.items[i]}`);
    }

    return `Processed ${total} items`;
  },
});

await server.start({
  transport: 'http',
  port: 3000,
  stateful: true
});

console.log('Stateful HTTP server running on port 3000');
```

#### Decorator API

```typescript
import { MCPServer, tool } from 'simply-mcp';

@MCPServer({
  name: 'http-stateful-decorator',
  version: '1.0.0',
  capabilities: {
    logging: true
  }
})
export default class StatefulServer {
  /**
   * Search with progress reporting
   * @param query - Search query
   * @param limit - Result limit
   */
  @tool()
  async search(query: string, limit: number = 10) {
    // Implementation with progress...
    return { results: [] };
  }
}
```

**Start:**
```typescript
import StatefulServer from './StatefulServer';

const instance = new StatefulServer();
await instance.start({
  transport: 'http',
  port: 3000,
  stateful: true
});
```

#### Interface API

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
      this.sessionId = data.result.sessionId; // Or from headers
      console.log('Session initialized:', this.sessionId);
    }
  }

  async callTool(name: string, args: any): Promise<any> {
    if (!this.sessionId) throw new Error('Not initialized');

    const response = await axios.post(`${this.baseURL}/mcp`, {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name, arguments: args }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Mcp-Session-Id': this.sessionId
      }
    });

    // Parse SSE response
    const match = response.data.match(/data: (.*)/);
    if (match) {
      return JSON.parse(match[1]);
    }
  }

  subscribeToEvents(onMessage: (data: any) => void): void {
    if (!this.sessionId) throw new Error('Not initialized');

    this.eventSource = new EventSource(
      `${this.baseURL}/mcp?sessionId=${this.sessionId}`
    );

    this.eventSource.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    });

    this.eventSource.addEventListener('progress', (event) => {
      const progress = JSON.parse(event.data);
      console.log('Progress:', progress);
    });

    this.eventSource.onerror = (error) => {
      console.error('SSE error:', error);
    };
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
}

// Usage
const client = new MCPClient('http://localhost:3000');
await client.initialize();

client.subscribeToEvents((data) => {
  console.log('Event:', data);
});

const result = await client.callTool('greet', { name: 'World' });
console.log('Result:', result);
```

#### Using Python

```python
import requests
import re
import json
from sseclient import SSEClient  # pip install sseclient-py

class MCPClient:
    def __init__(self, base_url):
        self.base_url = base_url
        self.session_id = None

    def initialize(self):
        response = requests.post(
            f'{self.base_url}/mcp',
            json={
                'jsonrpc': '2.0',
                'id': 1,
                'method': 'initialize',
                'params': {
                    'protocolVersion': '2024-11-05',
                    'capabilities': {},
                    'clientInfo': {'name': 'py-client', 'version': '1.0.0'}
                }
            },
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream'
            }
        )

        # Parse SSE response
        match = re.search(r'data: (.*)', response.text)
        if match:
            data = json.loads(match.group(1))
            self.session_id = data['result'].get('sessionId')
            print(f'Session initialized: {self.session_id}')

    def call_tool(self, name, arguments):
        if not self.session_id:
            raise Exception('Not initialized')

        response = requests.post(
            f'{self.base_url}/mcp',
            json={
                'jsonrpc': '2.0',
                'id': 2,
                'method': 'tools/call',
                'params': {'name': name, 'arguments': arguments}
            },
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream',
                'Mcp-Session-Id': self.session_id
            }
        )

        # Parse SSE response
        match = re.search(r'data: (.*)', response.text)
        if match:
            return json.loads(match.group(1))

    def subscribe_to_events(self, callback):
        if not self.session_id:
            raise Exception('Not initialized')

        url = f'{self.base_url}/mcp?sessionId={self.session_id}'
        messages = SSEClient(url)

        for msg in messages:
            if msg.event == 'message':
                data = json.loads(msg.data)
                callback(data)

# Usage
client = MCPClient('http://localhost:3000')
client.initialize()

result = client.call_tool('greet', {'name': 'World'})
print('Result:', result)
```

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

### Examples (All APIs - Stateless)

#### Functional API

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'lambda-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    stateful: false
  }
});

server.addTool({
  name: 'calculate',
  description: 'Perform calculation',
  parameters: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number(),
  }),
  execute: async (args) => {
    let result: number;

    switch (args.operation) {
      case 'add': result = args.a + args.b; break;
      case 'subtract': result = args.a - args.b; break;
      case 'multiply': result = args.a * args.b; break;
      case 'divide':
        if (args.b === 0) return 'Error: Division by zero';
        result = args.a / args.b;
        break;
    }

    return `${args.a} ${args.operation} ${args.b} = ${result}`;
  },
});

await server.start();

console.log('Stateless HTTP server running');
console.log('Each request creates a new transport');
```

#### Decorator API

```typescript
import { MCPServer, tool } from 'simply-mcp';

@MCPServer({
  name: 'stateless-decorator',
  version: '1.0.0'
})
export default class StatelessServer {
  /**
   * Calculate result
   * @param operation - Operation to perform
   * @param a - First number
   * @param b - Second number
   */
  @tool()
  async calculate(
    operation: 'add' | 'subtract' | 'multiply' | 'divide',
    a: number,
    b: number
  ) {
    // Implementation...
    return { result: 0 };
  }
}
```

**Start:**
```typescript
import StatelessServer from './StatelessServer';

const instance = new StatelessServer();
await instance.start({
  transport: 'http',
  port: 3000,
  stateful: false
});
```

#### Interface API

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

## SSE Transport (Legacy)

### What is SSE Transport?

**SSE (Server-Sent Events) Transport** is a legacy transport mode that:

- Uses dedicated SSE streams for all communication
- Requires `GET /mcp` to establish stream
- Uses `POST /messages?sessionId=xxx` for requests
- Maintained for backward compatibility
- **Not recommended for new projects**

```
┌─────────────┐                    ┌──────────────┐
│   Client    │  1. GET /mcp       │  SSE Server  │
│             │  (establish stream)│              │
│             │◀═══════════════════│              │
│             │  event: endpoint   │              │
│             │  data: sessionId   │              │
│             │                    │              │
│             │  2. POST /messages │              │
│             │  ?sessionId=xxx    │              │
│             │───────────────────>│              │
│             │                    │              │
│             │◀═══════════════════│              │
│             │  event: message    │              │
│             │  data: response    │              │
└─────────────┘                    └──────────────┘
```

### Why Legacy?

The SSE transport has been superseded by **HTTP Stateful** mode, which provides:

- **Better integration**: Standard HTTP endpoints (POST/GET/DELETE on `/mcp`)
- **Simpler client code**: No separate message endpoint
- **Same SSE streaming**: Still uses SSE under the hood
- **More features**: Health endpoints, CORS handling, etc.

**Recommendation**: Use **HTTP Stateful** instead of SSE for new projects.

### Migration to HTTP Modes

**From SSE to HTTP Stateful:**

```typescript
// OLD: SSE Transport
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  transport: {
    type: 'sse',
    port: 3004
  }
});

// NEW: HTTP Stateful (recommended)
const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: 3000,
    stateful: true  // Same session-based behavior
  }
});
```

**Client Migration:**

```javascript
// OLD: SSE Transport
const eventSource = new EventSource('http://localhost:3004/mcp');

eventSource.addEventListener('endpoint', (event) => {
  const data = JSON.parse(event.data);
  const sessionId = data.sessionId;

  // Post messages to separate endpoint
  fetch(`http://localhost:3004/messages?sessionId=${sessionId}`, {
    method: 'POST',
    body: JSON.stringify(request)
  });
});

// NEW: HTTP Stateful
const initResponse = await fetch('http://localhost:3000/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'
  },
  body: JSON.stringify(initializeRequest)
});

// Extract session ID from response
const sessionId = extractSessionId(initResponse);

// Subsequent requests
fetch('http://localhost:3000/mcp', {
  method: 'POST',
  headers: {
    'Mcp-Session-Id': sessionId,
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'
  },
  body: JSON.stringify(request)
});

// Optional: Subscribe to SSE stream
const eventSource = new EventSource(`http://localhost:3000/mcp?sessionId=${sessionId}`);
```

### Configuration (SSE)

**Note**: SSE transport was **removed in v3.0.0** as it was never part of the official MCP specification.

**Migration**: Use HTTP Stateful mode instead, which provides the same session-based streaming functionality. See the migration examples above.

---

## Choosing the Right Transport

### Decision Tree

```
START: What are you building?
  │
  ├─> Claude Desktop integration?
  │   └─> YES → Use STDIO
  │
  ├─> Serverless deployment (Lambda, Cloud Functions)?
  │   └─> YES → Use HTTP STATELESS
  │
  ├─> Web application with real-time features?
  │   └─> YES → Use HTTP STATEFUL
  │
  ├─> CLI tool or local agent?
  │   └─> YES → Use STDIO
  │
  ├─> Load-balanced API without sticky sessions?
  │   └─> YES → Use HTTP STATELESS
  │
  ├─> Multi-tenant SaaS with session isolation?
  │   └─> YES → Use HTTP STATEFUL
  │
  ├─> Batch processing or one-off tasks?
  │   └─> YES → Use STDIO or HTTP STATELESS
  │
  └─> Not sure?
      └─> Start with STDIO (simplest)
          Migrate later if needed
```

### Environment Analysis

| Environment | Recommended Transport | Why |
|-------------|----------------------|-----|
| **Local Development** | Stdio | Fastest, simplest setup |
| **Desktop App** | Stdio | Direct process integration |
| **Web Frontend** | HTTP Stateful | Browser needs HTTP + streaming |
| **Mobile App** | HTTP Stateful | Network-based, sessions |
| **AWS Lambda** | HTTP Stateless | Serverless-optimized |
| **Google Cloud Functions** | HTTP Stateless | Serverless-optimized |
| **Azure Functions** | HTTP Stateless | Serverless-optimized |
| **Kubernetes** | HTTP Stateful or Stateless | Depends on state needs |
| **Docker Container** | HTTP Stateful | Traditional server |
| **Edge Workers (Cloudflare)** | HTTP Stateless | Distributed, stateless |
| **Load-Balanced Cluster** | HTTP Stateless | No sticky sessions |
| **Single VPS** | HTTP Stateful | Traditional server |

### Security Considerations

**Stdio:**
- ✅ **Pros**: No network exposure, process isolation
- ❌ **Cons**: Code injection if spawning untrusted commands
- **Best for**: Trusted local environments

**HTTP Stateful:**
- ✅ **Pros**: Standard web security (CORS, HTTPS, auth)
- ❌ **Cons**: Session fixation, CSRF, DNS rebinding
- **Best for**: Web apps with proper auth
- **Mitigations**:
  - Use HTTPS in production
  - Implement CORS properly
  - Validate origins (built-in)
  - Use secure session IDs (automatic)

**HTTP Stateless:**
- ✅ **Pros**: No session attacks, stateless = simpler security
- ❌ **Cons**: Must authenticate each request
- **Best for**: APIs with token-based auth
- **Mitigations**:
  - Use API keys or JWT
  - Rate limiting
  - Request signing

**Note**: SSE transport was removed in v3.0.0. Use HTTP Stateful for session-based security.

### Scalability Requirements

```
┌─────────────────────────────────────────────────────────┐
│              Concurrent Clients Supported               │
├─────────────────────────────────────────────────────────┤
│ Stdio:              1 (per process)                     │
│ HTTP Stateful:      100-1000 (session overhead)         │
│ HTTP Stateless:     ∞ (limited only by server capacity) │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Horizontal Scaling Difficulty              │
├─────────────────────────────────────────────────────────┤
│ Stdio:              ⭐⭐⭐⭐⭐ Impossible (1:1 process)   │
│ HTTP Stateful:      ⭐⭐⭐ Hard (sticky sessions needed)  │
│ HTTP Stateless:     ⭐ Easy (any instance handles)       │
└─────────────────────────────────────────────────────────┘
```

**Scaling Strategies:**

**Stdio:**
- Spawn multiple processes (one per client)
- Not suitable for high-scale deployments

**HTTP Stateful:**
- Use sticky sessions (session affinity)
- Shared session store (Redis, memcached)
- Limited by session memory

**HTTP Stateless:**
- Add more instances freely
- Use load balancer (no sticky sessions needed)
- Infinite horizontal scaling

---

## Advanced Topics

### Custom Ports

**Set port in constructor:**

```typescript
const server = new BuildMCPServer({
  name: 'custom-port-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: 8080  // Custom port
  }
});

await server.start();
```

**Override at start:**

```typescript
const server = new BuildMCPServer({
  name: 'flexible-server',
  version: '1.0.0',
  transport: {
    port: 3000  // Default
  }
});

await server.start({ port: 9000 });  // Override
```

**From environment variable:**

```typescript
const server = new BuildMCPServer({
  name: 'env-port-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: parseInt(process.env.PORT || '3000')
  }
});
```

### Environment Configuration

**Using .env file:**

```bash
# .env
MCP_TRANSPORT=http
MCP_PORT=3000
MCP_STATEFUL=true
MCP_LOG_LEVEL=debug
```

```typescript
import dotenv from 'dotenv';
dotenv.config();

const server = new BuildMCPServer({
  name: 'env-config-server',
  version: '1.0.0',
  transport: {
    type: process.env.MCP_TRANSPORT as 'stdio' | 'http' || 'stdio',
    port: parseInt(process.env.MCP_PORT || '3000'),
    stateful: process.env.MCP_STATEFUL === 'true'
  }
});
```

**Configuration file:**

```typescript
// config/production.ts
export const config = {
  name: 'production-server',
  version: '1.0.0',
  transport: {
    type: 'http' as const,
    port: 8080,
    stateful: true
  },
  capabilities: {
    logging: true
  }
};

// server.ts
import { config } from './config/production';
const server = new BuildMCPServer(config);
```

### Load Balancing

**HTTP Stateful with Sticky Sessions:**

```nginx
# nginx.conf
upstream mcp_servers {
    ip_hash;  # Sticky sessions based on client IP

    server 10.0.1.1:3000;
    server 10.0.1.2:3000;
    server 10.0.1.3:3000;
}

server {
    listen 80;

    location /mcp {
        proxy_pass http://mcp_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Forward session header
        proxy_set_header Mcp-Session-Id $http_mcp_session_id;
    }
}
```

**HTTP Stateless (no sticky sessions needed):**

```nginx
# nginx.conf
upstream mcp_stateless {
    least_conn;  # Any load balancing algorithm works

    server 10.0.1.1:3000;
    server 10.0.1.2:3000;
    server 10.0.1.3:3000;
}

server {
    listen 80;

    location /mcp {
        proxy_pass http://mcp_stateless;
        proxy_set_header Host $host;
    }
}
```

### Health Monitoring

**Built-in health endpoint (HTTP only):**

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

**Kubernetes Liveness/Readiness:**

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: mcp-server
        image: my-mcp-server:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
```

### Scaling Strategies

**Vertical Scaling (Stdio/HTTP Stateful):**

```typescript
// Increase process resources
const server = new BuildMCPServer({
  name: 'high-performance-server',
  version: '1.0.0',
  defaultTimeout: 60000,  // Longer timeout for heavy operations
  transport: {
    type: 'http',
    port: 3000,
    stateful: true
  }
});

// Run with more memory
// node --max-old-space-size=4096 server.js
```

**Horizontal Scaling (HTTP Stateless):**

```bash
# Deploy multiple instances
kubectl scale deployment mcp-server --replicas=10

# Auto-scaling
kubectl autoscale deployment mcp-server \
  --min=3 --max=20 --cpu-percent=70
```

---

## Multi-Transport Servers

### Running Multiple Transports

**Not directly supported**, but you can run separate server instances:

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

// Shared tool definition
const greetTool = {
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({ name: z.string() }),
  execute: async (args: any) => `Hello, ${args.name}!`
};

// Stdio server
const stdioServer = new BuildMCPServer({
  name: 'multi-transport-stdio',
  version: '1.0.0'
});
stdioServer.addTool(greetTool);

// HTTP server
const httpServer = new BuildMCPServer({
  name: 'multi-transport-http',
  version: '1.0.0',
  transport: { type: 'http', port: 3000 }
});
httpServer.addTool(greetTool);

// Start based on environment
const transport = process.env.TRANSPORT || 'stdio';

if (transport === 'stdio') {
  await stdioServer.start({ transport: 'stdio' });
} else {
  await httpServer.start({ transport: 'http', port: 3000 });
}
```

### Dynamic Transport Switching

**Switch transport at runtime:**

```typescript
const server = new BuildMCPServer({
  name: 'dynamic-server',
  version: '1.0.0'
});

server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({ name: z.string() }),
  execute: async (args) => `Hello, ${args.name}!`
});

// Start with stdio
await server.start({ transport: 'stdio' });

// Later, restart with HTTP (requires stop first)
// Note: In practice, you'd typically just restart the process
// This is more for demonstration

// Stop stdio
await server.stop();

// Start HTTP
await server.start({ transport: 'http', port: 3000 });
```

---

## Testing Transports

### Testing Stdio Servers

**Manual test with echo:**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | npx tsx server.ts
```

**With MCP Inspector:**

```bash
npx @modelcontextprotocol/inspector npx tsx server.ts
```

**Automated testing:**

```typescript
import { spawn } from 'child_process';
import { describe, it, expect } from 'vitest';

describe('Stdio Server', () => {
  it('should respond to initialize request', async () => {
    const server = spawn('npx', ['tsx', 'server.ts']);

    // Send initialize request
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' }
      }
    };

    server.stdin.write(JSON.stringify(request) + '\n');

    // Read response
    const response = await new Promise((resolve) => {
      server.stdout.once('data', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });

    expect(response).toHaveProperty('result');

    server.kill();
  });
});
```

### Testing HTTP Servers

**With curl:**

```bash
# Initialize
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'

# List tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# Health check
curl http://localhost:3000/health
```

**With automated tests:**

```typescript
import axios from 'axios';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BuildMCPServer } from 'simply-mcp';

describe('HTTP Stateful Server', () => {
  let server: SimplyMCP;
  let sessionId: string;

  beforeAll(async () => {
    server = new BuildMCPServer({
      name: 'test-server',
      version: '1.0.0',
      transport: { type: 'http', port: 3333, stateful: true }
    });

    server.addTool({
      name: 'greet',
      description: 'Greet',
      parameters: z.object({ name: z.string() }),
      execute: async (args) => `Hello, ${args.name}!`
    });

    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should initialize session', async () => {
    const response = await axios.post('http://localhost:3333/mcp', {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' }
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      }
    });

    expect(response.status).toBe(200);
    expect(response.data).toContain('data:');

    // Extract session ID
    const match = response.data.match(/data: (.*)/);
    const data = JSON.parse(match[1]);
    sessionId = data.result.sessionId;
  });

  it('should call tool with session', async () => {
    const response = await axios.post('http://localhost:3333/mcp', {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'greet',
        arguments: { name: 'Test' }
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Mcp-Session-Id': sessionId
      }
    });

    expect(response.status).toBe(200);
    const match = response.data.match(/data: (.*)/);
    const data = JSON.parse(match[1]);
    expect(data.result.content[0].text).toBe('Hello, Test!');
  });

  it('should return health status', async () => {
    const response = await axios.get('http://localhost:3333/health');

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status', 'ok');
    expect(response.data.transport.mode).toBe('stateful');
  });
});
```

### Testing Tools

**MCP Inspector:**
- Visual web UI
- Request/response viewer
- Tool testing
- Real-time logs

```bash
npx @modelcontextprotocol/inspector npx tsx server.ts
```

**Postman/Insomnia:**
- Create HTTP collection
- Save requests
- Environment variables for session IDs

**Custom Test Harness:**

```typescript
// test-harness.ts
import { BuildMCPServer } from 'simply-mcp';
import readline from 'readline';

const server = new BuildMCPServer({
  name: 'test-harness',
  version: '1.0.0'
});

server.addTool({
  name: 'echo',
  description: 'Echo input',
  parameters: z.object({ message: z.string() }),
  execute: async (args) => args.message
});

await server.start({ transport: 'stdio' });

// Interactive REPL for testing
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    // Send to server, get response
    console.log('Response:', response);
  } catch (error) {
    console.error('Error:', error);
  }
});
```

---

## Production Deployment

### Stdio in Production

**Docker Container:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

# Stdio doesn't need EXPOSE

CMD ["npx", "tsx", "server.ts"]
```

**Usage:**

```bash
docker run -i my-mcp-server < input.jsonl > output.jsonl
```

**Systemd Service (Linux):**

```ini
# /etc/systemd/system/mcp-server.service
[Unit]
Description=MCP Stdio Server
After=network.target

[Service]
Type=simple
User=mcp
WorkingDirectory=/opt/mcp-server
ExecStart=/usr/bin/node server.js
Restart=on-failure
StandardInput=socket
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### HTTP Stateful in Production

**Docker with Health Checks:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); });"

CMD ["node", "server.js"]
```

**Docker Compose:**

```yaml
version: '3.8'

services:
  mcp-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
```

**Nginx Reverse Proxy:**

```nginx
server {
    listen 80;
    server_name api.example.com;

    location /mcp {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # CORS
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Expose-Headers Mcp-Session-Id;
    }

    location /health {
        proxy_pass http://localhost:3000/health;
    }
}
```

### HTTP Stateless in Production

**AWS Lambda (see AWS Lambda Integration section)**

**Kubernetes Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-stateless
spec:
  replicas: 5
  selector:
    matchLabels:
      app: mcp-stateless
  template:
    metadata:
      labels:
        app: mcp-stateless
    spec:
      containers:
      - name: mcp-server
        image: my-mcp-server:latest
        env:
        - name: MCP_STATEFUL
          value: "false"
        - name: PORT
          value: "3000"
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: mcp-stateless-service
spec:
  type: LoadBalancer
  selector:
    app: mcp-stateless
  ports:
  - port: 80
    targetPort: 3000
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mcp-stateless-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mcp-stateless
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Docker Deployment

**Multi-stage build (optimized):**

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

USER node

CMD ["node", "dist/server.js"]
```

### Kubernetes Deployment

**Complete example (see HTTP Stateless in Production section)**

**With Ingress:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mcp-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: mcp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: mcp-stateless-service
            port:
              number: 80
```

---

## Summary

This comprehensive guide covered all transport modes in Simply MCP:

**Transport Coverage:**
- ✅ **Stdio**: Local process communication (Claude Desktop, CLI tools)
- ✅ **HTTP Stateful**: Session-based web servers with SSE streaming
- ✅ **HTTP Stateless**: Serverless-optimized, infinitely scalable

**Examples per Transport:**
- **Stdio**: 3 API styles (Functional, Decorator, Interface)
- **HTTP Stateful**: 3 API styles + client examples (JS, Python)
- **HTTP Stateless**: 3 API styles + Lambda/Cloud Functions

**Comparison Tables:**
- Feature matrix
- Performance characteristics
- Use case mapping
- Deployment complexity
- Scalability capabilities

**Key Insights:**

1. **Choose Based on Environment:**
   - Desktop → Stdio
   - Serverless → HTTP Stateless
   - Web app → HTTP Stateful

2. **Scalability Spectrum:**
   - Stdio: 1 client (lowest)
   - HTTP Stateful: 100-1000 clients (medium)
   - HTTP Stateless: Unlimited (highest)

3. **State Management:**
   - Stdio: In-process
   - HTTP Stateful: Session-based
   - HTTP Stateless: External storage only

4. **Migration Path:**
   - Start simple (Stdio)
   - Scale to HTTP Stateful (web apps)
   - Optimize to HTTP Stateless (serverless)

5. **Production Readiness:**
   - All transports are production-ready
   - Choose based on deployment environment
   - Use health endpoints for monitoring
   - Implement proper error handling

**File Details:**
- **Path**: `/mnt/Shared/cs-projects/simple-mcp/docs/guides/TRANSPORT_GUIDE.md`
- **Length**: ~1,300 lines (comprehensive)
- **Coverage**: 3 transport modes (SSE removed in v3.0.0)
- **Examples**: 12 complete code examples
- **Comparisons**: 5 detailed tables
- **Deployment**: Docker, Kubernetes, Lambda, Cloud Functions

---

**Questions or Feedback?**

- [GitHub Issues](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)
- [GitHub Discussions](https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions)

**Made with ❤️ by the Simply MCP Team**
