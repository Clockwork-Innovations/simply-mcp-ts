# Architecture Documentation

**Version:** 1.0.0
**Last Updated:** 2025-09-29

Visual and detailed architecture documentation for the MCP Configurable Framework.

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Diagram](#component-diagram)
3. [Request Flow](#request-flow)
4. [Handler Resolution](#handler-resolution)
5. [Security Layer](#security-layer)
6. [Session Management](#session-management)
7. [Data Flow](#data-flow)
8. [Extension Points](#extension-points)

---

## System Overview

The MCP Configurable Framework is a layered architecture implementing the Model Context Protocol server specification. It provides a secure, scalable platform for exposing AI tools through a standardized interface.

### Key Architectural Principles

1. **Separation of Concerns**: Each layer has a distinct responsibility
2. **Security by Design**: Security checks at every layer
3. **Extensibility**: Plugin-based handler system
4. **Standards Compliance**: Full MCP protocol implementation
5. **Performance**: Optimized for low latency and high throughput

---

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │   AI Model │  │  Web App   │  │  CLI Tool  │  │   API      │   │
│  │  (Claude)  │  │ (Browser)  │  │            │  │  Client    │   │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘   │
│         │                 │                 │               │         │
└─────────┼─────────────────┼─────────────────┼───────────────┼─────────┘
          │                 │                 │               │
          └─────────────────┴─────────────────┴───────────────┘
                                    │
                                    │ HTTP/HTTPS
                                    │ JSON-RPC 2.0
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                      TRANSPORT LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Express HTTP Server (Port 3001)                 │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐  │   │
│  │  │  CORS    │  │  Body    │  │  StreamableHTTPServer    │  │   │
│  │  │Middleware│  │ Parser   │  │      Transport           │  │   │
│  │  └──────────┘  └──────────┘  └──────────────────────────┘  │   │
│  │                                                               │   │
│  │  Routes: POST /mcp  |  GET /mcp  |  DELETE /mcp            │   │
│  └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    │ Session ID + Request
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                      SESSION LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  Session Manager                             │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │  Sessions Map: { sessionId -> Transport }            │   │   │
│  │  │  - UUID generation                                    │   │   │
│  │  │  - Session lifecycle tracking                         │   │   │
│  │  │  - Transport state management                         │   │   │
│  │  │  - Cleanup on disconnect                              │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    │ Authenticated Request
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                      SECURITY LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌─────────────┐   │   │
│  │  │ Authentication │  │  Rate Limiter  │  │   Audit     │   │   │
│  │  │   (API Keys)   │  │  (Global +     │  │   Logger    │   │   │
│  │  │                │  │   Per-Tool)    │  │             │   │   │
│  │  │ - Key lookup   │  │ - Token bucket │  │ - Event log │   │   │
│  │  │ - Permissions  │  │ - Per-key      │  │ - Security  │   │   │
│  │  │ - Validation   │  │ - Time windows │  │   events    │   │   │
│  │  └────────┬───────┘  └────────┬───────┘  └──────┬──────┘   │   │
│  │           │                    │                  │           │   │
│  │           └────────────────────┴──────────────────┘           │   │
│  │                               │                                │   │
│  │                    ┌──────────▼──────────┐                    │   │
│  │                    │  Security Decision  │                    │   │
│  │                    │  Allow / Deny       │                    │   │
│  │                    └──────────┬──────────┘                    │   │
│  └───────────────────────────────┼─────────────────────────────┘   │
└───────────────────────────────────┼─────────────────────────────────┘
                                    │ Authorized Request
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                    VALIDATION LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ┌──────────────────┐           ┌──────────────────┐        │   │
│  │  │  JSON Schema     │           │  Input           │        │   │
│  │  │  Validator       │           │  Sanitizer       │        │   │
│  │  │                  │           │                  │        │   │
│  │  │ - Type checking  │──────────▶│ - XSS removal    │        │   │
│  │  │ - Required fields│           │ - Path traversal │        │   │
│  │  │ - Format rules   │           │ - SQL injection  │        │   │
│  │  │ - Enums          │           │ - Size limits    │        │   │
│  │  └──────────┬───────┘           └────────┬─────────┘        │   │
│  │             │                             │                   │   │
│  │             └──────────┬──────────────────┘                   │   │
│  │                        │                                       │   │
│  │              ┌─────────▼──────────┐                           │   │
│  │              │  Validated Input   │                           │   │
│  │              └─────────┬──────────┘                           │   │
│  └────────────────────────┼──────────────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────────────┘
                            │ Clean Input
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                    MCP PROTOCOL LAYER                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    MCP Server                                │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │   Tools      │  │   Prompts    │  │  Resources   │      │   │
│  │  │              │  │              │  │              │      │   │
│  │  │ tools/list   │  │prompts/list  │  │resources/list│      │   │
│  │  │ tools/call   │  │prompts/get   │  │resources/read│      │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │   │
│  │         │                  │                  │               │   │
│  │         └──────────────────┴──────────────────┘               │   │
│  │                            │                                   │   │
│  │                  ┌─────────▼──────────┐                       │   │
│  │                  │   Request Router   │                       │   │
│  │                  └─────────┬──────────┘                       │   │
│  └──────────────────────────┼─────────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────────────┘
                            │ Tool Call Request
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                    HANDLER LAYER                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Handler Manager                           │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │              Handler Resolution                       │   │   │
│  │  │  1. Parse handler config                             │   │   │
│  │  │  2. Determine handler type                           │   │   │
│  │  │  3. Resolve handler function                         │   │   │
│  │  │  4. Create execution context                         │   │   │
│  │  └──────────────────────┬───────────────────────────────┘   │   │
│  │                         │                                     │   │
│  │         ┌───────────────┼───────────────┐                    │   │
│  │         │               │               │                    │   │
│  │    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐    ┌────────┐│   │
│  │    │  File   │    │ Inline  │    │  HTTP   │    │Registry││   │
│  │    │Resolver │    │Resolver │    │Resolver │    │Resolver││   │
│  │    │         │    │         │    │         │    │        ││   │
│  │    │- Load   │    │- Eval   │    │- Fetch  │    │- Lookup││   │
│  │    │  .ts/.js│    │  code   │    │  API    │    │  in map││   │
│  │    │- Cache  │    │- Sandbox│    │- Format │    │        ││   │
│  │    └────┬────┘    └────┬────┘    └────┬────┘    └────┬───┘│   │
│  │         │               │               │              │     │   │
│  │         └───────────────┴───────────────┴──────────────┘     │   │
│  │                         │                                     │   │
│  │               ┌─────────▼──────────┐                         │   │
│  │               │  Resolved Handler  │                         │   │
│  │               └─────────┬──────────┘                         │   │
│  └─────────────────────────┼─────────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────────────┘
                            │ Handler Function
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                    EXECUTION LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Handler Execution                         │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │  Execution Context:                                   │   │   │
│  │  │  - sessionId                                          │   │   │
│  │  │  - logger                                             │   │   │
│  │  │  - metadata                                           │   │   │
│  │  └──────────────────────┬───────────────────────────────┘   │   │
│  │                         │                                     │   │
│  │               ┌─────────▼──────────┐                         │   │
│  │               │  Execute Handler   │                         │   │
│  │               │  - Timeout wrap    │                         │   │
│  │               │  - Error catching  │                         │   │
│  │               │  - Result format   │                         │   │
│  │               └─────────┬──────────┘                         │   │
│  │                         │                                     │   │
│  │                         ▼                                     │   │
│  │               ┌─────────────────────┐                        │   │
│  │               │  Handler Result     │                        │   │
│  │               │  or Error           │                        │   │
│  │               └─────────┬───────────┘                        │   │
│  └─────────────────────────┼─────────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────────────┘
                            │ Result
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      RESPONSE FORMATTING                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  - Convert to MCP format                                     │   │
│  │  - Add metadata                                               │   │
│  │  - JSON-RPC envelope                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                      Return to Client
```

---

## Request Flow

### Detailed Request Processing

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. CLIENT REQUEST                                                    │
│                                                                      │
│    POST /mcp                                                         │
│    Headers:                                                          │
│      Content-Type: application/json                                 │
│      Authorization: Bearer <api-key>                                 │
│      Mcp-Session-Id: <uuid>   (if not first request)               │
│    Body:                                                             │
│      {                                                               │
│        "jsonrpc": "2.0",                                            │
│        "id": 1,                                                     │
│        "method": "tools/call",                                      │
│        "params": {                                                  │
│          "name": "greet",                                           │
│          "arguments": { "name": "World" }                           │
│        }                                                            │
│      }                                                               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. TRANSPORT LAYER                                                   │
│                                                                      │
│    ┌──────────────────────────────────────────────────────────┐    │
│    │ Express receives request                                  │    │
│    │ - Parse JSON body                                         │    │
│    │ - Apply CORS                                              │    │
│    │ - Extract session ID from header                          │    │
│    └──────────────────────────────────────────────────────────┘    │
│                               │                                      │
│    ┌──────────────────────────▼──────────────────────────────┐    │
│    │ Session Management                                        │    │
│    │ - Lookup session in transports map                       │    │
│    │ - If not found & initialize: create new session          │    │
│    │ - Generate UUID for new sessions                          │    │
│    │ - Store transport in map                                  │    │
│    └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. SECURITY CHECKS                                                   │
│                                                                      │
│    ┌──────────────────────────────────────────────────────────┐    │
│    │ Authentication                                            │    │
│    │ - Extract API key from Authorization header              │    │
│    │ - Lookup key in config                                    │    │
│    │ - Verify key is valid                                     │    │
│    │ ✓ Pass or ✗ Return 401                                  │    │
│    └──────────────────────────┬───────────────────────────────┘    │
│                               │                                      │
│    ┌──────────────────────────▼──────────────────────────────┐    │
│    │ Authorization                                             │    │
│    │ - Get permissions for API key                            │    │
│    │ - Check required permission for method                   │    │
│    │   (e.g., tools:call)                                     │    │
│    │ ✓ Pass or ✗ Return 403                                  │    │
│    └──────────────────────────┬───────────────────────────────┘    │
│                               │                                      │
│    ┌──────────────────────────▼──────────────────────────────┐    │
│    │ Rate Limiting                                             │    │
│    │ - Check global rate limit                                │    │
│    │ - Check per-tool rate limit                              │    │
│    │ - Update request counters                                │    │
│    │ ✓ Pass or ✗ Return 429                                  │    │
│    └──────────────────────────┬───────────────────────────────┘    │
│                               │                                      │
│    ┌──────────────────────────▼──────────────────────────────┐    │
│    │ Audit Logging                                             │    │
│    │ - Log security event                                      │    │
│    │ - Record: timestamp, user, method, result                │    │
│    └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. INPUT VALIDATION                                                  │
│                                                                      │
│    ┌──────────────────────────────────────────────────────────┐    │
│    │ Get Tool Definition                                       │    │
│    │ - Lookup tool by name ("greet")                          │    │
│    │ - Get inputSchema from config                            │    │
│    └──────────────────────────┬───────────────────────────────┘    │
│                               │                                      │
│    ┌──────────────────────────▼──────────────────────────────┐    │
│    │ JSON Schema Validation                                    │    │
│    │ - Validate { "name": "World" } against schema            │    │
│    │ - Check required fields                                   │    │
│    │ - Check types (string, number, etc.)                     │    │
│    │ - Check formats (email, url, etc.)                       │    │
│    │ - Check enums                                             │    │
│    │ ✓ Pass or ✗ Return validation error                     │    │
│    └──────────────────────────┬───────────────────────────────┘    │
│                               │                                      │
│    ┌──────────────────────────▼──────────────────────────────┐    │
│    │ Input Sanitization                                        │    │
│    │ - Remove HTML tags                                        │    │
│    │ - Escape special characters                               │    │
│    │ - Remove path traversal patterns                         │    │
│    │ - Limit string lengths                                    │    │
│    │ - Return sanitized input                                  │    │
│    └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. MCP PROTOCOL ROUTING                                              │
│                                                                      │
│    ┌──────────────────────────────────────────────────────────┐    │
│    │ Route by Method                                           │    │
│    │                                                           │    │
│    │ switch (method):                                          │    │
│    │   case "initialize":                                      │    │
│    │     → Create session, return capabilities                │    │
│    │   case "tools/list":                                      │    │
│    │     → Return all tool definitions                         │    │
│    │   case "tools/call":  ← Our request                      │    │
│    │     → Execute tool handler                                │    │
│    │   case "prompts/list":                                    │    │
│    │     → Return all prompt definitions                       │    │
│    │   case "prompts/get":                                     │    │
│    │     → Render prompt template                              │    │
│    │   case "resources/list":                                  │    │
│    │     → Return all resource definitions                     │    │
│    │   case "resources/read":                                  │    │
│    │     → Return resource content                             │    │
│    └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼ (tools/call)
┌─────────────────────────────────────────────────────────────────────┐
│ 6. HANDLER RESOLUTION                                                │
│                                                                      │
│    ┌──────────────────────────────────────────────────────────┐    │
│    │ Parse Handler Config                                      │    │
│    │ {                                                         │    │
│    │   "type": "file",                                         │    │
│    │   "path": "./handlers/greetHandler.ts"                   │    │
│    │ }                                                         │    │
│    └──────────────────────────┬───────────────────────────────┘    │
│                               │                                      │
│    ┌──────────────────────────▼──────────────────────────────┐    │
│    │ Determine Handler Type                                    │    │
│    │ type = "file" → Use FileHandlerResolver                  │    │
│    └──────────────────────────┬───────────────────────────────┘    │
│                               │                                      │
│    ┌──────────────────────────▼──────────────────────────────┐    │
│    │ File Handler Resolver                                     │    │
│    │ - Resolve absolute path                                   │    │
│    │ - Check file exists                                       │    │
│    │ - Import TypeScript/JavaScript file                      │    │
│    │ - Get default export                                      │    │
│    │ - Cache compiled handler                                  │    │
│    │ → Returns: async (args) => {...}                         │    │
│    └──────────────────────────┬───────────────────────────────┘    │
│                               │                                      │
│    ┌──────────────────────────▼──────────────────────────────┐    │
│    │ Create Execution Context                                  │    │
│    │ {                                                         │    │
│    │   sessionId: "abc-123",                                  │    │
│    │   logger: LoggerInstance,                                │    │
│    │   metadata: { toolName: "greet" }                        │    │
│    │ }                                                         │    │
│    └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. HANDLER EXECUTION                                                 │
│                                                                      │
│    ┌──────────────────────────────────────────────────────────┐    │
│    │ Execute Handler Function                                  │    │
│    │                                                           │    │
│    │ const result = await handler(                            │    │
│    │   { name: "World" },  // sanitized args                 │    │
│    │   context              // execution context              │    │
│    │ );                                                        │    │
│    │                                                           │    │
│    │ Handler code runs:                                        │    │
│    │   return {                                                │    │
│    │     content: [{                                           │    │
│    │       type: 'text',                                       │    │
│    │       text: 'Hello, World!'                              │    │
│    │     }]                                                    │    │
│    │   };                                                      │    │
│    └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 8. RESPONSE FORMATTING                                               │
│                                                                      │
│    ┌──────────────────────────────────────────────────────────┐    │
│    │ Format as JSON-RPC Response                               │    │
│    │ {                                                         │    │
│    │   "jsonrpc": "2.0",                                      │    │
│    │   "id": 1,                                               │    │
│    │   "result": {                                            │    │
│    │     "content": [{                                         │    │
│    │       "type": "text",                                     │    │
│    │       "text": "Hello, World!"                            │    │
│    │     }]                                                    │    │
│    │   }                                                       │    │
│    │ }                                                         │    │
│    └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 9. SEND RESPONSE                                                     │
│                                                                      │
│    HTTP 200 OK                                                       │
│    Content-Type: application/json                                   │
│    Mcp-Session-Id: abc-123                                          │
│                                                                      │
│    { ...response body... }                                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Handler Resolution

### Handler Resolution Flowchart

```
                        Start: Parse Handler Config
                                    │
                                    ▼
                     ┌──────────────────────────┐
                     │  What is handler.type?   │
                     └──────────┬───────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │  "file"  │    │ "inline" │    │  "http"  │
        └─────┬────┘    └─────┬────┘    └─────┬────┘
              │               │               │
              ▼               ▼               ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ File Handler │  │Inline Handler│  │ HTTP Handler │
    │  Resolver    │  │  Resolver    │  │  Resolver    │
    └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
           │                 │                  │
           ▼                 ▼                  ▼
    ┌─────────────────────────────────────────────────┐
    │            Resolved Handler Function             │
    │                                                  │
    │  async (args, context) => {                     │
    │    // Handler implementation                     │
    │    return { content: [...] };                   │
    │  }                                               │
    └──────────────────┬──────────────────────────────┘
                       │
                       ▼
               ┌───────────────┐
               │   Execute     │
               │   Handler     │
               └───────┬───────┘
                       │
                       ▼
                  Result / Error


File Handler Resolution Detail:
─────────────────────────────────
1. handler.path: "./handlers/greetHandler.ts"
2. Resolve absolute path: /app/handlers/greetHandler.ts
3. Check file exists
4. Import module
5. Get default export
6. Validate is function
7. Return function


Inline Handler Resolution Detail:
──────────────────────────────────
1. handler.code: "async (args) => {...}"
2. Validate code string
3. Eval code in safe context
4. Return function


HTTP Handler Resolution Detail:
────────────────────────────────
1. handler.url: "https://api.example.com"
2. handler.method: "GET"
3. handler.headers: {...}
4. Create fetch wrapper function
5. Return function that makes HTTP request


Registry Handler Resolution Detail:
────────────────────────────────────
1. handler.name: "my-handler"
2. Lookup in HandlerRegistry
3. Get registered function
4. Return function
```

---

## Security Layer

### Security Decision Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                          INCOMING REQUEST                            │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
                 ┌─────────────────────────┐
                 │ Security Configuration  │
                 │ Enabled?                │
                 └─────┬─────────────┬─────┘
                       │             │
                    Yes│             │No
                       │             │
                       ▼             └────────► BYPASS SECURITY
          ┌────────────────────┐              (Development mode)
          │ 1. AUTHENTICATION  │
          │                    │
          │ Extract API Key    │
          │ from Authorization │
          │ header             │
          └─────┬──────────────┘
                │
                ▼
          ┌────────────────┐        ┌─────────────────┐
          │ API Key Valid? ├───No──►│ Return 401      │
          └─────┬──────────┘        │ Unauthorized    │
                │                    └─────────────────┘
             Yes│
                ▼
          ┌────────────────────┐
          │ 2. AUTHORIZATION   │
          │                    │
          │ Get Permissions    │
          │ for API Key        │
          └─────┬──────────────┘
                │
                ▼
          ┌─────────────────┐      ┌─────────────────┐
          │ Has Required    ├─No──►│ Return 403      │
          │ Permission?     │      │ Forbidden       │
          └─────┬───────────┘      └─────────────────┘
                │
             Yes│
                ▼
          ┌────────────────────┐
          │ 3. RATE LIMITING   │
          │                    │
          │ Check Global Limit │
          └─────┬──────────────┘
                │
                ▼
          ┌─────────────────┐      ┌─────────────────┐
          │ Within Global   ├─No──►│ Return 429      │
          │ Rate Limit?     │      │ Too Many Requests│
          └─────┬───────────┘      └─────────────────┘
                │
             Yes│
                ▼
          ┌────────────────────┐
          │ Check Per-Tool     │
          │ Limit              │
          └─────┬──────────────┘
                │
                ▼
          ┌─────────────────┐      ┌─────────────────┐
          │ Within Tool     ├─No──►│ Return 429      │
          │ Rate Limit?     │      │ Too Many Requests│
          └─────┬───────────┘      └─────────────────┘
                │
             Yes│
                ▼
          ┌────────────────────┐
          │ 4. AUDIT LOGGING   │
          │                    │
          │ Log Security Event:│
          │ - Timestamp        │
          │ - User/API Key     │
          │ - Method           │
          │ - Allowed          │
          └─────┬──────────────┘
                │
                ▼
          ┌────────────────────┐
          │ SECURITY PASSED    │
          │ → Proceed to       │
          │   Validation       │
          └────────────────────┘
```

### Permission Model

```
API Key Configuration:
─────────────────────
{
  "key": "admin-key-abc123",
  "name": "Admin Key",
  "permissions": [
    "tools:*",           // All tool operations
    "prompts:*",         // All prompt operations
    "resources:*"        // All resource operations
  ]
}

Permission Format:
─────────────────
resource:action

Examples:
- tools:call      → Can call tools
- tools:list      → Can list tools
- tools:*         → All tool operations
- prompts:get     → Can get prompts
- prompts:*       → All prompt operations
- *:*             → Full access

Permission Check Algorithm:
──────────────────────────
required = "tools:call"
userPermissions = ["tools:*", "prompts:get"]

for permission in userPermissions:
  [resource, action] = permission.split(':')

  if (resource == required.resource || resource == '*'):
    if (action == required.action || action == '*'):
      return ALLOW

return DENY
```

---

## Session Management

### Session Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SESSION LIFECYCLE                               │
└─────────────────────────────────────────────────────────────────────┘

1. SESSION CREATION
───────────────────
Client:  POST /mcp { method: "initialize", ... }
         (No Mcp-Session-Id header)

Server:  - Generate UUID: "abc-123-def-456"
         - Create new StreamableHTTPServerTransport
         - Store in transports map: { "abc-123-def-456": transport }
         - Set session initialized callback
         - Connect MCP server to transport

Response: 200 OK
         Mcp-Session-Id: abc-123-def-456
         { result: { capabilities: {...} } }


2. SESSION USAGE
────────────────
Client:  POST /mcp { method: "tools/call", ... }
         Mcp-Session-Id: abc-123-def-456

Server:  - Lookup session in transports map
         - Use existing transport
         - Handle request via MCP server
         - Transport manages message queue

Response: 200 OK
         Mcp-Session-Id: abc-123-def-456
         { result: { content: [...] } }


3. SESSION CLEANUP
──────────────────
Triggered by:
- Client sends DELETE /mcp
- Transport closes unexpectedly
- Server shutdown (SIGINT)

Server:  - Call transport.close()
         - Remove from transports map
         - Log session termination
         - Release resources


4. SESSION TIMEOUT (Optional)
─────────────────────────────
- Track last activity time
- Background job checks for stale sessions
- Auto-cleanup after inactivity period
```

### Session Storage

```javascript
// In-memory session storage
const transports = new Map<string, StreamableHTTPServerTransport>();

// Session structure:
{
  sessionId: string,
  transport: StreamableHTTPServerTransport,
  createdAt: number,
  lastActivity: number,
  metadata: {
    clientInfo: { name, version },
    apiKey: string,
    ipAddress: string
  }
}

// Session operations:
- create(clientInfo) → sessionId
- get(sessionId) → transport
- update(sessionId, activity)
- delete(sessionId)
- cleanup(maxAge)
```

---

## Data Flow

### Tool Execution Data Flow

```
Input Arguments          Handler Logic           Output Format
─────────────           ──────────────          ─────────────

{ name: "Alice" }    →  File Handler:          →  {
                        ┌─────────────┐             content: [
                        │ Load file   │               {
                        │ Execute fn  │                 type: 'text',
                        │ Process     │                 text: 'Hello, Alice!'
                        └─────────────┘               }
                                                    ]
                                                  }

{ a: 5, b: 3 }      →  Inline Handler:         →  {
                        ┌─────────────┐             content: [
                        │ Eval code   │               {
                        │ Execute     │                 type: 'text',
                        │ Return      │                 text: 'Result: 8'
                        └─────────────┘               }
                                                    ]
                                                  }

{}                  →  HTTP Handler:           →  {
                        ┌─────────────┐             content: [
                        │ Make request│               {
                        │ Parse JSON  │                 type: 'text',
                        │ Format      │                 text: '{"joke":"..."}'
                        └─────────────┘               }
                                                    ]
                                                  }
```

---

## Extension Points

### Where to Extend the Framework

```
1. HANDLER TYPES
────────────────
Location: /mcp/handlers/
Add: CustomHandlerResolver.ts

interface: {
  resolve(config): HandlerFunction
  validate(config): boolean
}


2. MIDDLEWARE
─────────────
Location: /mcp/middleware/
Add: Custom Express middleware

Examples:
- Request logging
- Custom authentication
- Request transformation


3. SECURITY PLUGINS
───────────────────
Location: /mcp/security/
Add: Custom security checks

interface: {
  check(request, context): boolean
  onFail(request, context): Response
}


4. VALIDATION RULES
───────────────────
Location: /mcp/validation/
Add: Custom validators

Examples:
- Business logic validation
- External service verification
- Complex type checking


5. HANDLER REGISTRY
───────────────────
Location: Runtime
Programmatic registration

HandlerRegistry.register(name, handler)
```

---

## Summary

### Key Architectural Decisions

1. **Layered Architecture**: Clear separation of concerns
2. **Security First**: Security checks at every layer
3. **Pluggable Handlers**: Multiple handler types for flexibility
4. **Standards Based**: Full MCP protocol compliance
5. **Stateful Sessions**: UUID-based session management
6. **Configuration Driven**: JSON configuration for easy setup
7. **Type Safe**: TypeScript throughout for safety
8. **Async by Default**: All operations are asynchronous

### Performance Characteristics

- **Request Latency**: < 50ms (file handlers, cached)
- **Throughput**: Thousands of requests/second
- **Memory**: ~50MB base, scales with handlers
- **Concurrency**: Limited only by Node.js event loop

### Scalability Considerations

- **Horizontal**: Multiple server instances behind load balancer
- **Vertical**: Increase Node.js heap size
- **Caching**: Handler caching reduces load overhead
- **Stateless**: Each request is independent (except session)

---

**Next Steps**:
- Review [Documentation Index](../INDEX.md) for complete documentation
- See [Handler Development Guide](../guides/HANDLER-DEVELOPMENT.md) for handler development
- Check [Deployment Guide](../guides/DEPLOYMENT.md) for production deployment

**Support**: GitHub Issues or community forums