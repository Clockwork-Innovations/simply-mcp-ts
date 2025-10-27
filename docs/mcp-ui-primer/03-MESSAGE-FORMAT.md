# MCP UI Message Format Reference

## Overview

This document provides detailed specifications of all message formats used in MCP UI communication. All messages follow the JSON-RPC 2.0 specification used by MCP.

## Table of Contents

1. [Resource Discovery Messages](#resource-discovery-messages)
2. [Resource Retrieval Messages](#resource-retrieval-messages)
3. [UI Action Messages (postMessage)](#ui-action-messages-postmessage)
4. [Update Notification Messages](#update-notification-messages)
5. [Type Definitions](#type-definitions)

## Resource Discovery Messages

### resources/list Request

**Direction**: Client → Server

**Purpose**: Discover all available resources, including UI resources

```json
{
  "jsonrpc": "2.0",
  "method": "resources/list",
  "params": {},
  "id": 1
}
```

**Parameters**: None (empty object)

### resources/list Response

**Direction**: Server → Client

**Purpose**: Return list of all resources

```json
{
  "jsonrpc": "2.0",
  "result": {
    "resources": [
      {
        "uri": "ui://dashboard/stats",
        "name": "Statistics Dashboard",
        "description": "Real-time statistics and metrics",
        "mimeType": "text/html"
      },
      {
        "uri": "ui://settings/config",
        "name": "Configuration",
        "description": "Server configuration panel",
        "mimeType": "text/html"
      }
    ]
  },
  "id": 1
}
```

**Resource Object**:
```typescript
{
  uri: string;              // Required: "ui://category/name"
  name?: string;            // Optional: Human-readable name
  description?: string;     // Optional: Description
  mimeType: string;         // Required: MIME type for rendering
}
```

## Resource Retrieval Messages

### resources/read Request

**Direction**: Client → Server

**Purpose**: Retrieve content of a specific UI resource

```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {
    "uri": "ui://dashboard/stats"
  },
  "id": 2
}
```

**Parameters**:
```typescript
{
  uri: string;  // URI of resource to read
}
```

### resources/read Response (HTML)

**Direction**: Server → Client

**Purpose**: Return HTML content

```json
{
  "jsonrpc": "2.0",
  "result": {
    "contents": [
      {
        "uri": "ui://dashboard/stats",
        "mimeType": "text/html",
        "text": "<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"UTF-8\">\n  <style>\n    body { font-family: sans-serif; }\n  </style>\n</head>\n<body>\n  <div id=\"stats\">\n    <h1>Statistics</h1>\n    <button onclick=\"refresh()\">Refresh</button>\n    <div id=\"data\"></div>\n  </div>\n\n  <script>\n  const allowedTools = [\"getStats\"];\n\n  window.callTool = async function(toolName, args) {\n    if (!allowedTools.includes(toolName)) {\n      throw new Error(`Tool ${toolName} not allowed`);\n    }\n\n    return new Promise((resolve, reject) => {\n      const id = Math.random().toString(36);\n      window.__callbacks = window.__callbacks || {};\n      window.__callbacks[id] = { resolve, reject };\n\n      window.parent.postMessage({\n        type: \"MCP_UI_ACTION\",\n        action: {\n          type: \"CALL_TOOL\",\n          toolName: toolName,\n          args: args,\n          callbackId: id\n        }\n      }, \"*\");\n    });\n  };\n\n  window.addEventListener(\"message\", function(event) {\n    if (event.data.type === \"TOOL_RESULT\") {\n      const cb = window.__callbacks[event.data.callbackId];\n      if (cb) {\n        if (event.data.error) {\n          cb.reject(new Error(event.data.error));\n        } else {\n          cb.resolve(event.data.result);\n        }\n        delete window.__callbacks[event.data.callbackId];\n      }\n    }\n  });\n\n  async function refresh() {\n    try {\n      const stats = await callTool(\"getStats\", {});\n      document.getElementById(\"data\").textContent = JSON.stringify(stats, null, 2);\n    } catch (error) {\n      console.error(\"Failed to load stats:\", error);\n    }\n  }\n\n  // Auto-refresh on load\n  refresh();\n  </script>\n</body>\n</html>"
      }
    ]
  },
  "id": 2
}
```

### resources/read Response (External URL)

**Direction**: Server → Client

**Purpose**: Return external URL to embed

```json
{
  "jsonrpc": "2.0",
  "result": {
    "contents": [
      {
        "uri": "ui://external/grafana",
        "mimeType": "text/uri-list",
        "text": "https://grafana.example.com/dashboard/123"
      }
    ]
  },
  "id": 2
}
```

### resources/read Response (Remote DOM)

**Direction**: Server → Client

**Purpose**: Return Remote DOM component code

```json
{
  "jsonrpc": "2.0",
  "result": {
    "contents": [
      {
        "uri": "ui://advanced/component",
        "mimeType": "application/vnd.mcp-ui.remote-dom",
        "text": "import { h, createRoot } from '@remote-dom/core';\n\nconst root = createRoot((root) => {\n  root.appendChild(\n    h('div', null, [\n      h('h1', null, 'Advanced Component'),\n      h('button', {\n        onclick: () => {\n          // Call MCP tool\n          window.parent.postMessage({\n            type: 'MCP_UI_ACTION',\n            action: {\n              type: 'CALL_TOOL',\n              toolName: 'getData',\n              args: {}\n            }\n          }, '*');\n        }\n      }, 'Load Data')\n    ])\n  );\n});\n\nexport default root;"
      }
    ]
  },
  "id": 2
}
```

### resources/read Response (Binary Content)

**Direction**: Server → Client

**Purpose**: Return base64-encoded binary content

```json
{
  "jsonrpc": "2.0",
  "result": {
    "contents": [
      {
        "uri": "ui://images/chart",
        "mimeType": "image/png",
        "blob": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      }
    ]
  },
  "id": 2
}
```

**Content Object**:
```typescript
{
  uri: string;              // Same as requested
  mimeType: string;         // MIME type
  text?: string;           // Text content (for text/* types)
  blob?: string;           // Base64-encoded binary (for binary types)
}
```

## UI Action Messages (postMessage)

These messages are sent via `window.postMessage()` from iframe to parent.

### Action Envelope

All actions use this envelope structure:

```typescript
{
  type: "MCP_UI_ACTION",
  action: {
    type: "CALL_TOOL" | "SUBMIT_PROMPT" | "NOTIFY" | "NAVIGATE",
    // ... action-specific fields
  }
}
```

### CALL_TOOL Action

**Direction**: UI (iframe) → Client (parent)

**Purpose**: Request tool invocation

```json
{
  "type": "MCP_UI_ACTION",
  "action": {
    "type": "CALL_TOOL",
    "toolName": "getData",
    "args": {
      "id": 123,
      "format": "json"
    },
    "callbackId": "abc123"
  }
}
```

**Fields**:
```typescript
{
  type: "CALL_TOOL";
  toolName: string;         // Name of tool to call
  args: Record<string, any>; // Tool arguments
  callbackId?: string;      // Optional callback ID for result
}
```

### CALL_TOOL Result

**Direction**: Client (parent) → UI (iframe)

**Purpose**: Return tool call result

```json
{
  "type": "TOOL_RESULT",
  "callbackId": "abc123",
  "result": {
    "data": [1, 2, 3],
    "status": "success"
  }
}
```

**On Success**:
```typescript
{
  type: "TOOL_RESULT";
  callbackId: string;
  result: any;              // Tool result
}
```

**On Error**:
```typescript
{
  type: "TOOL_RESULT";
  callbackId: string;
  error: string;            // Error message
}
```

### SUBMIT_PROMPT Action

**Direction**: UI (iframe) → Client (parent)

**Purpose**: Submit text to LLM

```json
{
  "type": "MCP_UI_ACTION",
  "action": {
    "type": "SUBMIT_PROMPT",
    "prompt": "What is the status of task 123?",
    "context": {
      "taskId": 123
    }
  }
}
```

**Fields**:
```typescript
{
  type: "SUBMIT_PROMPT";
  prompt: string;           // Text to send to LLM
  context?: any;            // Optional context data
}
```

### NOTIFY Action

**Direction**: UI (iframe) → Client (parent)

**Purpose**: Display notification to user

```json
{
  "type": "MCP_UI_ACTION",
  "action": {
    "type": "NOTIFY",
    "level": "info",
    "message": "Data loaded successfully",
    "title": "Success"
  }
}
```

**Fields**:
```typescript
{
  type: "NOTIFY";
  level: "info" | "warning" | "error" | "success";
  message: string;
  title?: string;
}
```

### NAVIGATE Action

**Direction**: UI (iframe) → Client (parent)

**Purpose**: Request navigation to URL

```json
{
  "type": "MCP_UI_ACTION",
  "action": {
    "type": "NAVIGATE",
    "url": "https://example.com/docs",
    "target": "_blank"
  }
}
```

**Fields**:
```typescript
{
  type: "NAVIGATE";
  url: string;              // URL to navigate to
  target?: "_blank" | "_self"; // Optional target
}
```

## Update Notification Messages

### notifications/resources/updated

**Direction**: Server → Client

**Purpose**: Notify client that a UI resource has changed

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/updated",
  "params": {
    "uri": "ui://dashboard/stats"
  }
}
```

**Parameters**:
```typescript
{
  uri: string;  // URI of updated resource
}
```

**Client Response**:
Client should re-fetch the resource and update rendered UI.

## Type Definitions

### Complete TypeScript Definitions

```typescript
// ============================================================================
// MCP Protocol Messages
// ============================================================================

interface MCPRequest {
  jsonrpc: "2.0";
  method: string;
  params?: any;
  id: number | string;
}

interface MCPResponse {
  jsonrpc: "2.0";
  result?: any;
  error?: MCPError;
  id: number | string;
}

interface MCPError {
  code: number;
  message: string;
  data?: any;
}

interface MCPNotification {
  jsonrpc: "2.0";
  method: string;
  params?: any;
}

// ============================================================================
// Resource Types
// ============================================================================

interface ResourceListRequest extends MCPRequest {
  method: "resources/list";
  params: {};
}

interface ResourceListResponse extends MCPResponse {
  result: {
    resources: ResourceDescriptor[];
  };
}

interface ResourceDescriptor {
  uri: string;
  name?: string;
  description?: string;
  mimeType: string;
}

interface ResourceReadRequest extends MCPRequest {
  method: "resources/read";
  params: {
    uri: string;
  };
}

interface ResourceReadResponse extends MCPResponse {
  result: {
    contents: ResourceContent[];
  };
}

interface ResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;  // Base64-encoded
}

interface ResourceUpdatedNotification extends MCPNotification {
  method: "notifications/resources/updated";
  params: {
    uri: string;
  };
}

// ============================================================================
// UI Action Types
// ============================================================================

interface UIActionMessage {
  type: "MCP_UI_ACTION";
  action: UIAction;
}

type UIAction =
  | CallToolAction
  | SubmitPromptAction
  | NotifyAction
  | NavigateAction;

interface CallToolAction {
  type: "CALL_TOOL";
  toolName: string;
  args: Record<string, any>;
  callbackId?: string;
}

interface SubmitPromptAction {
  type: "SUBMIT_PROMPT";
  prompt: string;
  context?: any;
}

interface NotifyAction {
  type: "NOTIFY";
  level: "info" | "warning" | "error" | "success";
  message: string;
  title?: string;
}

interface NavigateAction {
  type: "NAVIGATE";
  url: string;
  target?: "_blank" | "_self";
}

// ============================================================================
// Result Types
// ============================================================================

interface ToolResultMessage {
  type: "TOOL_RESULT";
  callbackId: string;
  result?: any;
  error?: string;
}

// ============================================================================
// Metadata Types (Implementation-Specific)
// ============================================================================

interface UIMetadata {
  tools?: string[];          // Allowed tool names
  css?: string[];           // Stylesheet URLs
  scripts?: string[];       // Script URLs
  stylesheets?: string[];   // Alternative to css
  theme?: string;           // Theme name
  allowedOrigins?: string[]; // CORS origins
}
```

## Message Examples by Scenario

### Scenario 1: Simple Static HTML

**1. Client lists resources**:
```json
{"jsonrpc": "2.0", "method": "resources/list", "id": 1}
```

**2. Server responds**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "resources": [
      {
        "uri": "ui://hello/world",
        "name": "Hello World",
        "mimeType": "text/html"
      }
    ]
  },
  "id": 1
}
```

**3. Client reads resource**:
```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {"uri": "ui://hello/world"},
  "id": 2
}
```

**4. Server responds with HTML**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "contents": [
      {
        "uri": "ui://hello/world",
        "mimeType": "text/html",
        "text": "<html><body><h1>Hello World</h1></body></html>"
      }
    ]
  },
  "id": 2
}
```

### Scenario 2: Interactive UI with Tool Call

**1-4. Same as Scenario 1** (discovery and retrieval)

**5. User clicks button in UI, calls tool**:
```json
{
  "type": "MCP_UI_ACTION",
  "action": {
    "type": "CALL_TOOL",
    "toolName": "echo",
    "args": {"message": "hello"},
    "callbackId": "xyz789"
  }
}
```

**6. Client calls tool via MCP**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "echo",
    "arguments": {"message": "hello"}
  },
  "id": 3
}
```

**7. Server responds with tool result**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {"type": "text", "text": "Echo: hello"}
    ]
  },
  "id": 3
}
```

**8. Client sends result back to UI**:
```json
{
  "type": "TOOL_RESULT",
  "callbackId": "xyz789",
  "result": "Echo: hello"
}
```

### Scenario 3: Live Updates

**1-4. Same as Scenario 1** (discovery and retrieval, UI rendered)

**5. Server detects data change, sends notification**:
```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/updated",
  "params": {
    "uri": "ui://dashboard/stats"
  }
}
```

**6. Client re-fetches resource**:
```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {"uri": "ui://dashboard/stats"},
  "id": 5
}
```

**7. Server responds with updated HTML**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "contents": [
      {
        "uri": "ui://dashboard/stats",
        "mimeType": "text/html",
        "text": "<html>...updated content...</html>"
      }
    ]
  },
  "id": 5
}
```

**8. Client re-renders UI with new content**

## Wire Format Notes

### Character Encoding

All text content uses UTF-8 encoding.

### Binary Content

Binary content (images, etc.) is base64-encoded in the `blob` field.

### Size Limits

- **Maximum URI length**: 2048 characters (recommended)
- **Maximum content size**: Implementation-dependent (typically 10MB)
- **Maximum tool arguments size**: 1MB (recommended)

### Compression

Content compression is not specified by MCP UI but may be supported at the transport layer (e.g., HTTP gzip).

### Escaping

JSON strings follow standard JSON escaping rules. HTML content in `text` field should have special characters properly escaped:

```json
{
  "text": "<div>Quote: \"Hello\"</div>"
}
```

## Validation

### URI Validation

```typescript
function validateUIUri(uri: string): boolean {
  return /^ui:\/\/[a-z0-9\-]+\/[a-z0-9\-\/]+$/i.test(uri);
}
```

### MIME Type Validation

```typescript
function isValidMimeType(mimeType: string): boolean {
  const valid = [
    "text/html",
    "text/uri-list",
    "application/vnd.mcp-ui.remote-dom"
  ];
  return valid.includes(mimeType);
}
```

## Error Codes

Standard MCP error codes apply:

| Code | Meaning |
|------|---------|
| -32002 | Resource not found |
| -32600 | Invalid request |
| -32601 | Method not found |
| -32602 | Invalid params |
| -32603 | Internal error |

Example error response:

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32002,
    "message": "Resource not found: ui://invalid/uri"
  },
  "id": 2
}
```

## Reference

For the complete MCP specification, see:
- https://spec.modelcontextprotocol.io/

For MCP UI extensions, see:
- https://github.com/idosal/mcp-ui
