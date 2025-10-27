# MCP UI Primer: Overview

## What is MCP UI?

MCP UI is an **experimental extension** to the Model Context Protocol (MCP) that enables MCP servers to deliver **interactive web components** directly to clients. It bridges the gap between traditional text-based interactions and modern, rich UI experiences.

## The Problem It Solves

The standard MCP protocol focuses on:
- Tool calls (function execution)
- Resources (data retrieval)
- Prompts (text interactions)

However, many use cases benefit from **visual, interactive components**:
- Dashboard widgets
- Data visualizations
- Forms and configuration panels
- Real-time status displays
- Interactive tutorials

MCP UI standardizes how servers can provide these rich experiences while maintaining security and portability.

## Core Concepts

### 1. UI as Resources

MCP UI leverages the existing **MCP Resource Protocol** but with special MIME types:

```typescript
{
  uri: "ui://dashboard/stats",
  mimeType: "text/html",
  text: "<div>Interactive HTML content</div>"
}
```

### 2. Multiple Rendering Modes

MCP UI supports three main approaches:

| Mode | MIME Type | Use Case |
|------|-----------|----------|
| **Inline HTML** | `text/html` | Static or simple interactive HTML |
| **External URL** | `text/uri-list` | Embedded external applications |
| **Remote DOM** | `application/vnd.mcp-ui.remote-dom` | JavaScript-based components with host integration |

### 3. Bidirectional Communication

UIs can send **actions** back to the server or host:
- **Tool invocations**: Call MCP tools with parameters
- **Prompts**: Submit text to the LLM
- **Notifications**: Display messages
- **Navigation**: Open links or routes

### 4. Security by Default

All UI content runs in **sandboxed iframes** with:
- Restricted permissions
- Tool allowlists (UIs can only call tools they declare)
- Content Security Policy enforcement
- Origin isolation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      MCP Server                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Interface Definition (TypeScript)                  │     │
│  │  ─────────────────────────────────                 │     │
│  │  interface MyUI extends IUI {                      │     │
│  │    html: string;                                   │     │
│  │    tools?: string[];                               │     │
│  │  }                                                  │     │
│  │                                                     │     │
│  │  async statsLive(): Promise<MyUI> {                │     │
│  │    return {                                         │     │
│  │      html: "<div>...</div>",                       │     │
│  │      tools: ["getData"]                            │     │
│  │    };                                               │     │
│  │  }                                                  │     │
│  └────────────────────────────────────────────────────┘     │
│                         │                                    │
│                         ▼                                    │
│  ┌────────────────────────────────────────────────────┐     │
│  │  UI Adapter (Parsing & Enhancement)                │     │
│  │  • Extract metadata from interface                 │     │
│  │  • Inject tool helpers (window.callTool)           │     │
│  │  • Add CSS, scripts, themes                        │     │
│  │  • Resolve file references                         │     │
│  │  • Bundle React components                         │     │
│  └────────────────────────────────────────────────────┘     │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │
                          ▼ MCP Protocol
┌─────────────────────────────────────────────────────────────┐
│                      MCP Client/Host                         │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Resource Request                                   │     │
│  │  GET ui://stats/live                                │     │
│  └────────────────────────────────────────────────────┘     │
│                         │                                    │
│                         ▼                                    │
│  ┌────────────────────────────────────────────────────┐     │
│  │  UIResource Object                                  │     │
│  │  {                                                  │     │
│  │    uri: "ui://stats/live",                         │     │
│  │    mimeType: "text/html",                          │     │
│  │    text: "<html>...</html>"                        │     │
│  │  }                                                  │     │
│  └────────────────────────────────────────────────────┘     │
│                         │                                    │
│                         ▼                                    │
│  ┌────────────────────────────────────────────────────┐     │
│  │  UI Renderer                                        │     │
│  │  • Route by MIME type                              │     │
│  │  • Render in sandboxed iframe                      │     │
│  │  • Handle postMessage events                       │     │
│  │  • Execute tool calls via MCP                      │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Progressive Enhancement Layers

**Foundation Layer**: Basic inline HTML
```typescript
interface SimpleUI extends IUI {
  html: string;
}
```

**Feature Layer**: File-based HTML, React components, bundling
```typescript
interface AdvancedUI extends IUI {
  htmlFile: string;        // Load from file
  reactFile: string;       // React component
  css: string[];          // Stylesheets
  scripts: string[];      // JavaScript files
}
```

**Remote DOM Layer**: Secure JavaScript execution with host integration
```typescript
interface RemoteDOMUI extends IUI {
  remoteDomFile: string;
  tools: string[];
}
```

### 2. Tool Integration

UIs can call MCP tools securely:

```html
<button onclick="callTool('getData', {id: 123})">
  Load Data
</button>
```

The `callTool` helper is automatically injected and enforces the tool allowlist.

### 3. File-Based Development

Organize UI code in separate files:

```typescript
interface DashboardUI extends IUI {
  htmlFile: "./ui/dashboard.html";
  css: ["./ui/styles.css"];
  scripts: ["./ui/logic.js"];
}
```

### 4. React Component Support

Write UIs as React components:

```typescript
interface ReactUI extends IUI {
  reactFile: "./ui/MyComponent.tsx";
}
```

Components are automatically compiled and bundled.

## Official Resources

- **Official Repository**: https://github.com/idosal/mcp-ui
- **Website**: https://mcpui.dev
- **Status**: Experimental community playground (rapid iteration expected)
- **License**: Apache 2.0

## Language Support

### TypeScript/JavaScript
```bash
npm install @mcp-ui/server @mcp-ui/client
```

### Python
```bash
pip install mcp-ui-server
```

### Ruby
```bash
gem install mcp_ui_server
```

## Design Philosophy

### Security First
- All UI content runs in sandboxed environments
- Tool calls require explicit allowlisting
- Content Security Policy enforcement
- No arbitrary code execution in host context

### Host Flexibility
- Adapters for different environments (ChatGPT, Claude, etc.)
- MIME-type-based rendering allows progressive enhancement
- Fallback to text representation when UI not supported

### Developer Experience
- Pure TypeScript interfaces (type-safe)
- File-based organization
- React support for complex UIs
- Hot reloading in development

## What This Primer Covers

This primer is organized into the following sections:

1. **00-OVERVIEW.md** (this file): Introduction and concepts
2. **01-PROTOCOL-SPECIFICATION.md**: Detailed protocol spec
3. **02-IMPLEMENTATION-GUIDE.md**: How to implement MCP UI support
4. **03-MESSAGE-FORMAT.md**: Wire format and data structures
5. **04-EXAMPLES.md**: Concrete implementation examples
6. **05-SECURITY.md**: Security model and best practices

## Next Steps

For implementers adding MCP UI support to their LLM or client:

1. Start with **01-PROTOCOL-SPECIFICATION.md** to understand the protocol
2. Review **03-MESSAGE-FORMAT.md** to see what data is exchanged
3. Follow **02-IMPLEMENTATION-GUIDE.md** for step-by-step implementation
4. Study **04-EXAMPLES.md** for reference implementations
5. Review **05-SECURITY.md** to understand security requirements

---

**Note**: MCP UI is experimental and actively evolving. This documentation is based on the implementation in `simply-mcp-ts` and the official `mcp-ui` repository as of October 2025.
