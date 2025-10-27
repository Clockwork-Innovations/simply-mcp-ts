# MCP UI Implementation Guide

## For Implementers Adding MCP UI Support to Their LLM/Client

This guide walks through implementing MCP UI support in an LLM client or host application that doesn't natively support it.

## Implementation Overview

Adding MCP UI support involves:

1. **Discovery**: Detect UI resources during resource listing
2. **Retrieval**: Fetch UI content via standard MCP protocol
3. **Rendering**: Display UI in sandboxed environment
4. **Communication**: Handle bidirectional messages
5. **Security**: Enforce sandboxing and tool allowlists

## Phase 1: Detection and Filtering

### Step 1.1: Filter UI Resources

When calling `resources/list`, filter for UI resources:

```typescript
async function listResources(client: MCPClient): Promise<UIResource[]> {
  const response = await client.request({
    method: "resources/list",
    params: {}
  });

  // Filter for ui:// scheme
  return response.resources.filter((resource: any) =>
    resource.uri.startsWith("ui://")
  );
}
```

### Step 1.2: Parse URI Structure

Extract category and name:

```typescript
function parseUIUri(uri: string): { category: string; name: string } {
  // uri format: ui://category/name
  const match = uri.match(/^ui:\/\/([^\/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid UI URI: ${uri}`);
  }

  return {
    category: match[1],
    name: match[2]
  };
}

// Example
parseUIUri("ui://stats/live")
// → { category: "stats", name: "live" }
```

### Step 1.3: Categorize by MIME Type

```typescript
function categorizeByMimeType(resource: UIResource): UIType {
  switch (resource.mimeType) {
    case "text/html":
      return "INLINE_HTML";
    case "text/uri-list":
      return "EXTERNAL_URL";
    case "application/vnd.mcp-ui.remote-dom":
      return "REMOTE_DOM";
    default:
      return "UNSUPPORTED";
  }
}
```

## Phase 2: Resource Retrieval

### Step 2.1: Fetch UI Content

```typescript
async function fetchUIResource(
  client: MCPClient,
  uri: string
): Promise<UIResourceContent> {
  const response = await client.request({
    method: "resources/read",
    params: { uri }
  });

  const content = response.contents[0];

  return {
    uri: content.uri,
    mimeType: content.mimeType,
    content: content.text || atob(content.blob || ""),
    metadata: extractMetadata(content)
  };
}
```

### Step 2.2: Extract Metadata

Parse tool allowlists and other metadata from the content:

```typescript
function extractMetadata(content: any): UIMetadata {
  // Look for metadata in HTML comments or script blocks
  const html = content.text || "";

  // Extract tool allowlist
  const toolsMatch = html.match(/const allowedTools = (\[.*?\])/);
  const tools = toolsMatch
    ? JSON.parse(toolsMatch[1])
    : [];

  // Extract other metadata from meta tags
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  return {
    tools,
    title: doc.querySelector('meta[name="title"]')?.getAttribute("content"),
    description: doc.querySelector('meta[name="description"]')?.getAttribute("content"),
  };
}
```

## Phase 3: Rendering Infrastructure

### Step 3.1: Create Sandbox Renderer

```typescript
class UIRenderer {
  private iframe: HTMLIFrameElement;
  private messageHandlers: Map<string, (data: any) => void>;

  constructor(container: HTMLElement) {
    this.iframe = document.createElement("iframe");
    this.iframe.sandbox.add(
      "allow-scripts",
      "allow-same-origin",
      "allow-forms"
    );

    // Add CSP
    this.iframe.setAttribute("csp",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    );

    container.appendChild(this.iframe);
    this.setupMessageListener();
  }

  private setupMessageListener() {
    window.addEventListener("message", (event) => {
      // Validate origin
      if (event.source !== this.iframe.contentWindow) {
        return;
      }

      const { type, action } = event.data;
      if (type === "MCP_UI_ACTION") {
        this.handleAction(action);
      }
    });
  }

  render(content: string) {
    // Write content to iframe
    this.iframe.contentDocument?.open();
    this.iframe.contentDocument?.write(content);
    this.iframe.contentDocument?.close();
  }
}
```

### Step 3.2: Route by MIME Type

```typescript
function renderUIResource(
  resource: UIResourceContent,
  container: HTMLElement
) {
  switch (resource.mimeType) {
    case "text/html":
      return renderHTMLUI(resource, container);

    case "text/uri-list":
      return renderExternalURL(resource, container);

    case "application/vnd.mcp-ui.remote-dom":
      return renderRemoteDOMUI(resource, container);

    default:
      throw new Error(`Unsupported MIME type: ${resource.mimeType}`);
  }
}

function renderHTMLUI(
  resource: UIResourceContent,
  container: HTMLElement
): UIRenderer {
  const renderer = new UIRenderer(container);
  renderer.render(resource.content);
  return renderer;
}

function renderExternalURL(
  resource: UIResourceContent,
  container: HTMLElement
): UIRenderer {
  const url = resource.content.trim();
  const renderer = new UIRenderer(container);
  renderer.iframe.src = url;
  return renderer;
}
```

### Step 3.3: Handle Remote DOM (Advanced)

For Remote DOM components, use a Web Worker:

```typescript
function renderRemoteDOMUI(
  resource: UIResourceContent,
  container: HTMLElement
): UIRenderer {
  const worker = new Worker("remote-dom-worker.js");

  // Send component code to worker
  worker.postMessage({
    type: "INIT",
    code: resource.content
  });

  // Receive UI updates from worker
  worker.addEventListener("message", (event) => {
    if (event.data.type === "UI_UPDATE") {
      applyRemoteDOMUpdate(container, event.data.update);
    }
  });

  return {
    iframe: null,
    worker,
    dispose: () => worker.terminate()
  };
}

// In remote-dom-worker.js
self.addEventListener("message", (event) => {
  if (event.data.type === "INIT") {
    // Execute component in isolated context
    const fn = new Function(event.data.code);
    fn(); // Sets up Remote DOM component

    // Send UI updates back to main thread
    remoteDom.onUpdate((update) => {
      self.postMessage({ type: "UI_UPDATE", update });
    });
  }
});
```

## Phase 4: Bidirectional Communication

### Step 4.1: Handle Tool Calls

```typescript
class UIRenderer {
  private allowedTools: string[];
  private mcpClient: MCPClient;

  async handleAction(action: UIAction) {
    switch (action.type) {
      case "CALL_TOOL":
        return this.handleToolCall(action);

      case "SUBMIT_PROMPT":
        return this.handlePromptSubmission(action);

      case "NOTIFY":
        return this.handleNotification(action);

      case "NAVIGATE":
        return this.handleNavigation(action);
    }
  }

  async handleToolCall(action: ToolCallAction) {
    // 1. Validate against allowlist
    if (!this.allowedTools.includes(action.toolName)) {
      const error = `Tool ${action.toolName} not allowed`;
      this.sendToIframe({
        type: "TOOL_RESULT",
        callbackId: action.callbackId,
        error
      });
      return;
    }

    // 2. Call tool via MCP
    try {
      const result = await this.mcpClient.request({
        method: "tools/call",
        params: {
          name: action.toolName,
          arguments: action.args
        }
      });

      // 3. Send result back to iframe
      this.sendToIframe({
        type: "TOOL_RESULT",
        callbackId: action.callbackId,
        result: result.content
      });
    } catch (error) {
      this.sendToIframe({
        type: "TOOL_RESULT",
        callbackId: action.callbackId,
        error: error.message
      });
    }
  }

  private sendToIframe(message: any) {
    this.iframe.contentWindow?.postMessage(message, "*");
  }
}
```

### Step 4.2: Handle Prompts

```typescript
async handlePromptSubmission(action: PromptSubmitAction) {
  // Send prompt to LLM
  const response = await this.llm.sendMessage(action.prompt);

  // Optionally update UI based on response
  this.sendToIframe({
    type: "PROMPT_RESPONSE",
    response
  });

  // Or trigger UI refresh
  const updatedContent = await fetchUIResource(
    this.mcpClient,
    this.currentUri
  );
  this.render(updatedContent.content);
}
```

### Step 4.3: Handle Notifications

```typescript
handleNotification(action: NotifyAction) {
  // Display in host's notification system
  this.notificationService.show({
    level: action.level,
    message: action.message,
    source: "MCP UI"
  });
}
```

### Step 4.4: Handle Navigation

```typescript
handleNavigation(action: NavigateAction) {
  // Open in new tab or handle as appropriate
  window.open(action.url, "_blank", "noopener,noreferrer");
}
```

## Phase 5: Security Implementation

### Step 5.1: Tool Allowlist Enforcement

```typescript
class SecurityManager {
  validateToolCall(
    toolName: string,
    allowedTools: string[]
  ): boolean {
    return allowedTools.includes(toolName);
  }

  validateToolArguments(
    args: any,
    schema?: ToolSchema
  ): boolean {
    if (!schema) return true;

    // Validate against JSON Schema
    return validateJsonSchema(args, schema);
  }
}
```

### Step 5.2: Content Security Policy

```typescript
function createSecureIframe(): HTMLIFrameElement {
  const iframe = document.createElement("iframe");

  // Sandbox attributes
  iframe.sandbox.add(
    "allow-scripts",      // Allow JavaScript
    "allow-same-origin",  // Allow same-origin access (for postMessage)
    "allow-forms"         // Allow form submission
  );

  // DO NOT add:
  // - allow-top-navigation
  // - allow-popups
  // - allow-pointer-lock

  // CSP header
  iframe.setAttribute("csp",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self';"
  );

  return iframe;
}
```

### Step 5.3: Origin Validation

```typescript
class UIRenderer {
  private allowedOrigins: string[];

  setupMessageListener() {
    window.addEventListener("message", (event) => {
      // 1. Validate source
      if (event.source !== this.iframe.contentWindow) {
        console.warn("Message from unexpected source");
        return;
      }

      // 2. Validate origin (if using external URLs)
      if (this.allowedOrigins.length > 0) {
        if (!this.allowedOrigins.includes(event.origin)) {
          console.warn(`Message from disallowed origin: ${event.origin}`);
          return;
        }
      }

      // 3. Process message
      this.handleMessage(event.data);
    });
  }
}
```

### Step 5.4: Input Sanitization

```typescript
function sanitizeToolArguments(args: any): any {
  // Remove dangerous properties
  const sanitized = JSON.parse(JSON.stringify(args));

  // Remove __proto__, constructor, etc.
  const dangerous = ["__proto__", "constructor", "prototype"];
  function clean(obj: any) {
    if (typeof obj !== "object" || obj === null) return;

    for (const key of dangerous) {
      delete obj[key];
    }

    for (const value of Object.values(obj)) {
      clean(value);
    }
  }

  clean(sanitized);
  return sanitized;
}
```

## Phase 6: Resource Updates

### Step 6.1: Subscribe to Updates

```typescript
class UIManager {
  private renderers: Map<string, UIRenderer>;

  async initialize(client: MCPClient) {
    // Subscribe to resource updates
    client.onNotification(
      "notifications/resources/updated",
      (params) => this.handleResourceUpdate(params)
    );
  }

  async handleResourceUpdate(params: { uri: string }) {
    const renderer = this.renderers.get(params.uri);
    if (!renderer) return;

    // Re-fetch and re-render
    const content = await fetchUIResource(this.client, params.uri);
    renderer.render(content.content);
  }
}
```

### Step 6.2: Implement Polling (Fallback)

If subscriptions not supported:

```typescript
class UIRefreshManager {
  private intervals: Map<string, number>;

  startPolling(uri: string, intervalMs: number = 5000) {
    const id = setInterval(async () => {
      await this.refreshUI(uri);
    }, intervalMs);

    this.intervals.set(uri, id);
  }

  stopPolling(uri: string) {
    const id = this.intervals.get(uri);
    if (id) {
      clearInterval(id);
      this.intervals.delete(uri);
    }
  }

  async refreshUI(uri: string) {
    const content = await fetchUIResource(this.client, uri);
    this.renderer.render(content.content);
  }
}
```

## Complete Example Implementation

### Main UIManager Class

```typescript
class MCPUIManager {
  private client: MCPClient;
  private renderers: Map<string, UIRenderer>;
  private securityManager: SecurityManager;

  constructor(client: MCPClient) {
    this.client = client;
    this.renderers = new Map();
    this.securityManager = new SecurityManager();
  }

  async listUIResources(): Promise<UIResource[]> {
    const response = await this.client.request({
      method: "resources/list",
      params: {}
    });

    return response.resources.filter((r: any) =>
      r.uri.startsWith("ui://")
    );
  }

  async renderUI(uri: string, container: HTMLElement): Promise<void> {
    // 1. Fetch resource
    const content = await this.fetchUIResource(uri);

    // 2. Create renderer
    const renderer = new UIRenderer(
      container,
      content.metadata.tools || [],
      this.client,
      this.securityManager
    );

    // 3. Render content
    renderer.render(content.content);

    // 4. Store for updates
    this.renderers.set(uri, renderer);

    // 5. Subscribe to updates
    this.subscribeToUpdates(uri);
  }

  private async fetchUIResource(uri: string): Promise<UIResourceContent> {
    const response = await this.client.request({
      method: "resources/read",
      params: { uri }
    });

    const content = response.contents[0];
    return {
      uri: content.uri,
      mimeType: content.mimeType,
      content: content.text || atob(content.blob || ""),
      metadata: this.extractMetadata(content)
    };
  }

  private extractMetadata(content: any): UIMetadata {
    const html = content.text || "";
    const toolsMatch = html.match(/const allowedTools = (\[.*?\])/);

    return {
      tools: toolsMatch ? JSON.parse(toolsMatch[1]) : []
    };
  }

  private subscribeToUpdates(uri: string) {
    this.client.onNotification(
      "notifications/resources/updated",
      async (params) => {
        if (params.uri === uri) {
          const renderer = this.renderers.get(uri);
          if (renderer) {
            const content = await this.fetchUIResource(uri);
            renderer.render(content.content);
          }
        }
      }
    );
  }

  dispose() {
    for (const renderer of this.renderers.values()) {
      renderer.dispose();
    }
    this.renderers.clear();
  }
}
```

## Testing Your Implementation

### Test 1: Basic HTML Rendering

```typescript
// Simple HTML UI
const htmlResource = {
  uri: "ui://test/simple",
  mimeType: "text/html",
  text: "<div>Hello MCP UI</div>"
};

await manager.renderUI("ui://test/simple", container);
// Should render "Hello MCP UI" in iframe
```

### Test 2: Tool Call

```typescript
// HTML with tool call
const toolResource = {
  uri: "ui://test/tool",
  mimeType: "text/html",
  text: `
    <button onclick="test()">Test Tool</button>
    <script>
      const allowedTools = ["echo"];
      async function test() {
        const result = await callTool("echo", { message: "hello" });
        alert(result);
      }
    </script>
  `
};

// Click button → should call "echo" tool → show result
```

### Test 3: Security Validation

```typescript
// Attempt to call disallowed tool
const result = await renderer.handleAction({
  type: "CALL_TOOL",
  toolName: "forbiddenTool",
  args: {}
});

// Should reject with error
```

## Common Pitfalls

### 1. Not Validating Tool Allowlist

**Problem**: UI can call any tool

**Solution**: Always check `allowedTools` before executing

### 2. Insecure iframe Sandbox

**Problem**: iframe can navigate top window

**Solution**: Never add `allow-top-navigation` to sandbox

### 3. Missing Origin Validation

**Problem**: Any window can send postMessage

**Solution**: Validate `event.source` and optionally `event.origin`

### 4. Not Handling Errors

**Problem**: Failed tool calls crash UI

**Solution**: Always catch and return errors to iframe

## Next Steps

1. Implement basic HTML rendering (Phase 3)
2. Add tool call support (Phase 4.1)
3. Implement security measures (Phase 5)
4. Test with real MCP servers
5. Add Remote DOM support (advanced)

## Reference Implementation

The `simply-mcp-ts` project provides a complete reference implementation:

- **UI Adapter**: `/src/adapters/ui-adapter.ts`
- **Client Renderer**: `/src/client/UIResourceRenderer.tsx`
- **Security**: `/src/client/remote-dom/sandbox-worker.ts`

Study these files for production-ready patterns.
