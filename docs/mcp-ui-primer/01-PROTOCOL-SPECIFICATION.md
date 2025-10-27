# MCP UI Protocol Specification

## Overview

MCP UI extends the standard Model Context Protocol (MCP) by using the existing **Resource Protocol** with specialized MIME types and metadata. This document specifies how UI resources are registered, requested, and rendered.

## Core Protocol Extension

### MCP Resource Protocol

MCP UI leverages the standard MCP resource protocol:

```
Client                                    Server
  │                                         │
  ├──── resources/list ──────────────────► │
  │                                         │
  │ ◄──── { resources: [...] } ────────────┤
  │                                         │
  ├──── resources/read ───────────────────► │
  │      { uri: "ui://stats/live" }        │
  │                                         │
  │ ◄──── { contents: [...] } ─────────────┤
  │                                         │
```

### UI Resource Registration

UI resources are registered with special URI schemes and MIME types:

```json
{
  "uri": "ui://category/name",
  "name": "Human-readable name",
  "description": "Optional description",
  "mimeType": "text/html"
}
```

## URI Scheme

### Format

```
ui://<category>/<name>
```

### Components

- **Scheme**: Always `ui://`
- **Category**: Logical grouping (e.g., "dashboard", "settings", "tools")
- **Name**: Unique identifier within category (e.g., "live", "config", "editor")

### Mapping to Methods

The URI maps to interface methods using camelCase:

```
ui://stats/live         → statsLive()
ui://user/settings      → userSettings()
ui://data/visualization → dataVisualization()
```

### Examples

```
ui://dashboard/overview
ui://stats/realtime
ui://config/advanced
ui://tools/debugger
```

## MIME Types

MCP UI defines three primary MIME types:

### 1. `text/html`

**Purpose**: Inline HTML content or complete HTML documents

**Usage**:
- Static HTML
- Simple interactive components
- Self-contained widgets

**Resource Format**:
```json
{
  "uri": "ui://example/basic",
  "mimeType": "text/html",
  "text": "<!DOCTYPE html><html>...</html>"
}
```

**Rendering**: Content rendered in sandboxed iframe

### 2. `text/uri-list`

**Purpose**: Reference to external URL

**Usage**:
- Embedded external applications
- Third-party services
- Hosted dashboards

**Resource Format**:
```json
{
  "uri": "ui://example/external",
  "mimeType": "text/uri-list",
  "text": "https://example.com/dashboard"
}
```

**Rendering**: URL loaded in iframe with appropriate sandbox restrictions

### 3. `application/vnd.mcp-ui.remote-dom`

**Purpose**: JavaScript-based Remote DOM components

**Usage**:
- Complex interactive UIs
- Components matching host aesthetics
- Advanced state management

**Resource Format**:
```json
{
  "uri": "ui://example/advanced",
  "mimeType": "application/vnd.mcp-ui.remote-dom",
  "text": "/* JavaScript using @remote-dom/core */"
}
```

**Rendering**: JavaScript executed in isolated Web Worker, UI changes communicated as JSON

## Resource Structure

### Standard Fields

```typescript
interface UIResource {
  uri: string;              // Unique identifier
  name?: string;            // Human-readable name
  description?: string;     // Optional description
  mimeType: string;         // One of the supported MIME types
  text?: string;            // Text content (for text/* MIME types)
  blob?: string;            // Base64-encoded binary (for application/* types)
}
```

### Extended Metadata (Implementation-Specific)

The `simply-mcp-ts` implementation adds metadata via interface properties:

```typescript
interface UIMetadata {
  tools?: string[];         // Allowed tool names
  css?: string[];          // Stylesheet URLs/paths
  scripts?: string[];      // JavaScript URLs/paths
  stylesheets?: string[];  // Alternative to css
  theme?: string;          // Theme name
  allowedOrigins?: string[]; // CORS origins
}
```

## Request/Response Flow

### 1. Discovery Phase

**Client Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "resources/list",
  "params": {},
  "id": 1
}
```

**Server Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "resources": [
      {
        "uri": "ui://stats/live",
        "name": "Live Statistics",
        "description": "Real-time statistics dashboard",
        "mimeType": "text/html"
      }
    ]
  },
  "id": 1
}
```

### 2. Retrieval Phase

**Client Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {
    "uri": "ui://stats/live"
  },
  "id": 2
}
```

**Server Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "contents": [
      {
        "uri": "ui://stats/live",
        "mimeType": "text/html",
        "text": "<!DOCTYPE html>\n<html>...enhanced HTML...</html>"
      }
    ]
  },
  "id": 2
}
```

## UI Actions (Client → Server)

UI components can communicate back via **postMessage** events:

### Action Types

#### 1. Tool Invocation

```typescript
{
  type: "CALL_TOOL",
  toolName: "getData",
  args: { id: 123 }
}
```

**Flow**:
1. User interaction triggers `callTool()` in iframe
2. postMessage sent to parent window
3. Client validates tool against allowlist
4. Client calls tool via MCP protocol
5. Result returned to iframe via postMessage

#### 2. Prompt Submission

```typescript
{
  type: "SUBMIT_PROMPT",
  prompt: "User input text"
}
```

**Flow**:
1. User submits text in UI
2. postMessage sent with prompt content
3. Client sends to LLM
4. Response may trigger UI update

#### 3. Notification

```typescript
{
  type: "NOTIFY",
  level: "info" | "warning" | "error",
  message: "Something happened"
}
```

**Flow**:
1. UI wants to show notification
2. postMessage sent to client
3. Client displays in native notification system

#### 4. Navigation

```typescript
{
  type: "NAVIGATE",
  url: "https://example.com"
}
```

**Flow**:
1. User clicks link or triggers navigation
2. postMessage sent to client
3. Client handles navigation (new tab, etc.)

### postMessage Protocol

All actions use this envelope:

```typescript
window.parent.postMessage(
  {
    type: "MCP_UI_ACTION",
    action: {
      type: "CALL_TOOL" | "SUBMIT_PROMPT" | "NOTIFY" | "NAVIGATE",
      // ... action-specific fields
    }
  },
  "*" // Or specific origin
);
```

## Tool Helper API

### Automatic Injection

The server automatically injects a `window.callTool()` helper:

```javascript
window.callTool = async function(toolName, args) {
  // Validate against allowlist
  if (!allowedTools.includes(toolName)) {
    throw new Error(`Tool ${toolName} not allowed`);
  }

  // Send to parent via postMessage
  return new Promise((resolve, reject) => {
    const id = generateId();
    callbacks[id] = { resolve, reject };

    window.parent.postMessage({
      type: "MCP_UI_ACTION",
      action: {
        type: "CALL_TOOL",
        toolName,
        args,
        callbackId: id
      }
    }, "*");
  });
};
```

### Usage in UI

```html
<button onclick="loadData()">Load</button>

<script>
async function loadData() {
  try {
    const result = await callTool("getData", { id: 123 });
    document.getElementById("result").textContent = JSON.stringify(result);
  } catch (error) {
    console.error("Tool call failed:", error);
  }
}
</script>
```

## Content Enhancement

### Enhancement Pipeline

When a UI resource is requested, the server enhances it:

```
1. Load base content (HTML/React/file)
2. Inject tool helpers (callTool)
3. Add theme CSS
4. Add custom stylesheets
5. Add custom scripts
6. Apply security policies
7. Return enhanced HTML
```

### Enhancement Example

**Input** (Interface Definition):
```typescript
interface MyUI extends IUI {
  html: "<div>Hello</div>";
  tools: ["getData"];
  css: ["./styles.css"];
  scripts: ["./logic.js"];
}
```

**Output** (Enhanced HTML):
```html
<!DOCTYPE html>
<html>
<head>
  <style>/* Theme CSS */</style>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <div>Hello</div>

  <script>
  // Tool helper injection
  const allowedTools = ["getData"];
  window.callTool = async function(toolName, args) { /* ... */ };
  </script>

  <script src="./logic.js"></script>
</body>
</html>
```

## Lifecycle Hooks

### Resource Updates

MCP supports resource updates via `resources/updated` notification:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/updated",
  "params": {
    "uri": "ui://stats/live"
  }
}
```

**Flow**:
1. Server detects UI should update
2. Sends notification
3. Client re-fetches resource
4. Updates rendered UI

### Watch Mode

Implementation-specific: `simply-mcp-ts` supports file watching:

```typescript
interface WatchableUI extends IUI {
  htmlFile: "./ui/dashboard.html";
}
```

When `dashboard.html` changes:
1. File change detected
2. Resource re-parsed and enhanced
3. `resources/updated` notification sent
4. Clients refresh UI

## Content Security Policy

### Default Policy

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' 'unsafe-inline';
               style-src 'self' 'unsafe-inline';">
```

### Iframe Sandbox

```html
<iframe sandbox="allow-scripts allow-same-origin allow-forms"
        src="...">
</iframe>
```

**Restrictions**:
- No top-level navigation
- No popups
- No plugin execution
- Limited origin access

## Error Handling

### Invalid URI

**Request**:
```json
{
  "method": "resources/read",
  "params": { "uri": "ui://invalid/missing" }
}
```

**Response**:
```json
{
  "error": {
    "code": -32002,
    "message": "Resource not found: ui://invalid/missing"
  }
}
```

### Tool Not Allowed

**Action**:
```javascript
callTool("forbiddenTool", {})
```

**Result**:
```javascript
Error: Tool forbiddenTool not allowed for this UI
```

### Rendering Error

If MIME type unsupported:
1. Client logs error
2. Falls back to text representation
3. Displays error message to user

## Compatibility

### Fallback Behavior

Clients that don't support MCP UI:
- Ignore `ui://` resources
- Request standard resources
- Text-based interaction only

Servers can provide both:
```typescript
// UI-capable clients
async statsLive(): Promise<IUI> {
  return { html: "<div>Interactive dashboard</div>" };
}

// Fallback for text-only clients
async stats(): Promise<string> {
  return "Current stats: ...";
}
```

### Version Detection

Clients can advertise UI support via capabilities:

```json
{
  "capabilities": {
    "experimental": {
      "ui": {
        "supported": true,
        "mimeTypes": ["text/html", "application/vnd.mcp-ui.remote-dom"]
      }
    }
  }
}
```

## Official Specification

This document describes the implementation in `simply-mcp-ts` and aligns with the community specification at:

- **Repository**: https://github.com/idosal/mcp-ui
- **Specification**: Check repository for formal protocol specification

**Note**: MCP UI is experimental and the protocol may evolve. Always check the official repository for the latest specification.
