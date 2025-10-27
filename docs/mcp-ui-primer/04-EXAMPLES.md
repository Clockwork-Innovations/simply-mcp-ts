# MCP UI Examples and Patterns

## Overview

This document provides concrete, working examples of MCP UI implementations for both servers (providing UIs) and clients (rendering UIs).

## Table of Contents

1. [Server-Side Examples](#server-side-examples)
2. [Client-Side Examples](#client-side-examples)
3. [Common Patterns](#common-patterns)
4. [Complete Working Examples](#complete-working-examples)

## Server-Side Examples

### Example 1: Simple Static HTML UI

**Interface Definition**:
```typescript
import { IUI } from "simply-mcp";

interface HelloWorldUI extends IUI {
  html: string;
}

export async function helloWorld(): Promise<HelloWorldUI> {
  return {
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Hello, MCP UI!</h1>
            <p>This is a simple static UI component.</p>
          </div>
        </body>
      </html>
    `
  };
}
```

**What gets sent over MCP**:
```json
{
  "uri": "ui://hello/world",
  "mimeType": "text/html",
  "text": "<!DOCTYPE html>..."
}
```

### Example 2: Interactive UI with Tool Call

**Server Interface**:
```typescript
interface CounterUI extends IUI {
  html: string;
  tools: string[];
}

export async function statsCounter(): Promise<CounterUI> {
  return {
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              background: #f5f5f5;
            }
            .counter {
              background: white;
              border-radius: 8px;
              padding: 30px;
              max-width: 400px;
              margin: 0 auto;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .count {
              font-size: 48px;
              font-weight: bold;
              color: #667eea;
              text-align: center;
              margin: 20px 0;
            }
            button {
              width: 100%;
              padding: 12px;
              margin: 5px 0;
              border: none;
              border-radius: 4px;
              font-size: 16px;
              cursor: pointer;
              background: #667eea;
              color: white;
            }
            button:hover {
              background: #5568d3;
            }
            button:disabled {
              background: #ccc;
              cursor: not-allowed;
            }
          </style>
        </head>
        <body>
          <div class="counter">
            <h2>Counter</h2>
            <div class="count" id="count">0</div>
            <button onclick="increment()">Increment</button>
            <button onclick="decrement()">Decrement</button>
            <button onclick="reset()">Reset</button>
            <button onclick="getCount()">Get Server Count</button>
          </div>

          <script>
            let count = 0;

            function increment() {
              count++;
              updateDisplay();
            }

            function decrement() {
              count--;
              updateDisplay();
            }

            function reset() {
              count = 0;
              updateDisplay();
            }

            async function getCount() {
              try {
                const result = await callTool("getCounter", {});
                count = result.value;
                updateDisplay();
              } catch (error) {
                alert("Failed to get count: " + error.message);
              }
            }

            function updateDisplay() {
              document.getElementById("count").textContent = count;
            }
          </script>
        </body>
      </html>
    `,
    tools: ["getCounter"]
  };
}
```

**Corresponding Tool**:
```typescript
let serverCount = 0;

export async function getCounter() {
  return { value: serverCount };
}
```

### Example 3: File-Based UI

**Interface Definition**:
```typescript
interface DashboardUI extends IUI {
  htmlFile: string;
  css: string[];
  scripts: string[];
  tools: string[];
}

export async function statsLive(): Promise<DashboardUI> {
  return {
    htmlFile: "./ui/dashboard.html",
    css: ["./ui/dashboard.css"],
    scripts: ["./ui/dashboard.js"],
    tools: ["getStats", "updateSetting"]
  };
}
```

**File: ./ui/dashboard.html**:
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Live Dashboard</title>
  </head>
  <body>
    <div class="dashboard">
      <h1>Live Statistics</h1>
      <div id="stats-container"></div>
      <button id="refresh-btn">Refresh</button>
    </div>
  </body>
</html>
```

**File: ./ui/dashboard.css**:
```css
.dashboard {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

#stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #667eea;
}

.stat-label {
  color: #666;
  margin-top: 5px;
}
```

**File: ./ui/dashboard.js**:
```javascript
async function loadStats() {
  const container = document.getElementById("stats-container");
  container.innerHTML = "Loading...";

  try {
    const stats = await callTool("getStats", {});

    container.innerHTML = "";
    for (const [key, value] of Object.entries(stats)) {
      const card = document.createElement("div");
      card.className = "stat-card";
      card.innerHTML = `
        <div class="stat-value">${value}</div>
        <div class="stat-label">${key}</div>
      `;
      container.appendChild(card);
    }
  } catch (error) {
    container.innerHTML = `Error: ${error.message}`;
  }
}

document.getElementById("refresh-btn").addEventListener("click", loadStats);

// Load on page load
loadStats();
```

### Example 4: React Component UI

**Interface Definition**:
```typescript
interface ReactDashboardUI extends IUI {
  reactFile: string;
  tools: string[];
}

export async function reactDashboard(): Promise<ReactDashboardUI> {
  return {
    reactFile: "./ui/Dashboard.tsx",
    tools: ["getData", "saveData"]
  };
}
```

**File: ./ui/Dashboard.tsx**:
```typescript
import React, { useState, useEffect } from "react";

declare global {
  interface Window {
    callTool: (name: string, args: any) => Promise<any>;
  }
}

interface DataItem {
  id: number;
  name: string;
  value: number;
}

export default function Dashboard() {
  const [data, setData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.callTool("getData", {});
      setData(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const saveItem = async (item: DataItem) => {
    try {
      await window.callTool("saveData", { item });
      await loadData(); // Reload after save
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="dashboard">
      <h1>React Dashboard</h1>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="data-grid">
          {data.map((item) => (
            <div key={item.id} className="data-card">
              <h3>{item.name}</h3>
              <p>Value: {item.value}</p>
              <button onClick={() => saveItem(item)}>
                Update
              </button>
            </div>
          ))}
        </div>
      )}

      <button onClick={loadData}>Refresh</button>
    </div>
  );
}
```

### Example 5: External URL

**Interface Definition**:
```typescript
interface ExternalUI extends IUI {
  externalUrl: string;
}

export async function grafanaDashboard(): Promise<ExternalUI> {
  return {
    externalUrl: "https://grafana.example.com/d/abc123/overview"
  };
}
```

**What gets sent**:
```json
{
  "uri": "ui://external/grafana",
  "mimeType": "text/uri-list",
  "text": "https://grafana.example.com/d/abc123/overview"
}
```

## Client-Side Examples

### Example 1: Basic HTML Renderer

```typescript
class SimpleUIRenderer {
  private iframe: HTMLIFrameElement;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.iframe = document.createElement("iframe");

    // Security settings
    this.iframe.sandbox.add("allow-scripts", "allow-same-origin", "allow-forms");
    this.iframe.style.width = "100%";
    this.iframe.style.height = "600px";
    this.iframe.style.border = "1px solid #ddd";

    this.container.appendChild(this.iframe);
  }

  render(html: string) {
    const doc = this.iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();
  }

  dispose() {
    this.iframe.remove();
  }
}

// Usage
const renderer = new SimpleUIRenderer(document.getElementById("ui-container"));
renderer.render(uiResource.text);
```

### Example 2: Full-Featured Renderer with Tool Calls

```typescript
interface MCPClient {
  callTool(name: string, args: any): Promise<any>;
}

class MCPUIRenderer {
  private iframe: HTMLIFrameElement;
  private allowedTools: string[];
  private client: MCPClient;
  private pendingCallbacks: Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>;

  constructor(
    container: HTMLElement,
    allowedTools: string[],
    client: MCPClient
  ) {
    this.allowedTools = allowedTools;
    this.client = client;
    this.pendingCallbacks = new Map();

    // Create iframe
    this.iframe = document.createElement("iframe");
    this.iframe.sandbox.add("allow-scripts", "allow-same-origin", "allow-forms");
    this.iframe.style.width = "100%";
    this.iframe.style.height = "600px";
    this.iframe.style.border = "none";

    container.appendChild(this.iframe);

    // Setup message listener
    window.addEventListener("message", (event) => this.handleMessage(event));
  }

  render(html: string) {
    const doc = this.iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();
  }

  private async handleMessage(event: MessageEvent) {
    // Validate source
    if (event.source !== this.iframe.contentWindow) {
      return;
    }

    const { type, action } = event.data;
    if (type !== "MCP_UI_ACTION") {
      return;
    }

    switch (action.type) {
      case "CALL_TOOL":
        await this.handleToolCall(action);
        break;

      case "SUBMIT_PROMPT":
        this.handlePromptSubmit(action);
        break;

      case "NOTIFY":
        this.handleNotification(action);
        break;

      case "NAVIGATE":
        this.handleNavigation(action);
        break;
    }
  }

  private async handleToolCall(action: any) {
    const { toolName, args, callbackId } = action;

    // Validate tool is allowed
    if (!this.allowedTools.includes(toolName)) {
      this.sendToIframe({
        type: "TOOL_RESULT",
        callbackId,
        error: `Tool ${toolName} not allowed`
      });
      return;
    }

    // Call tool via MCP
    try {
      const result = await this.client.callTool(toolName, args);

      this.sendToIframe({
        type: "TOOL_RESULT",
        callbackId,
        result
      });
    } catch (error) {
      this.sendToIframe({
        type: "TOOL_RESULT",
        callbackId,
        error: error instanceof Error ? error.message : "Tool call failed"
      });
    }
  }

  private handlePromptSubmit(action: any) {
    // Emit event or call callback
    const event = new CustomEvent("mcp-ui-prompt", {
      detail: { prompt: action.prompt, context: action.context }
    });
    window.dispatchEvent(event);
  }

  private handleNotification(action: any) {
    // Show notification (using browser API or custom UI)
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(action.title || "MCP UI", {
        body: action.message
      });
    } else {
      console.log(`[${action.level}] ${action.message}`);
    }
  }

  private handleNavigation(action: any) {
    const target = action.target || "_blank";
    window.open(action.url, target, "noopener,noreferrer");
  }

  private sendToIframe(message: any) {
    this.iframe.contentWindow?.postMessage(message, "*");
  }

  dispose() {
    this.iframe.remove();
    this.pendingCallbacks.clear();
  }
}

// Usage
const renderer = new MCPUIRenderer(
  document.getElementById("ui-container"),
  ["getStats", "updateSetting"],
  mcpClient
);

renderer.render(uiResource.text);
```

### Example 3: React-Based Client Renderer

```typescript
import React, { useEffect, useRef, useState } from "react";

interface UIResourceRendererProps {
  resource: {
    uri: string;
    mimeType: string;
    text: string;
  };
  allowedTools: string[];
  onToolCall: (name: string, args: any) => Promise<any>;
  onPromptSubmit?: (prompt: string) => void;
}

export function UIResourceRenderer({
  resource,
  allowedTools,
  onToolCall,
  onPromptSubmit
}: UIResourceRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      const { type, action } = event.data;
      if (type !== "MCP_UI_ACTION") return;

      try {
        switch (action.type) {
          case "CALL_TOOL":
            if (!allowedTools.includes(action.toolName)) {
              throw new Error(`Tool ${action.toolName} not allowed`);
            }

            const result = await onToolCall(action.toolName, action.args);

            iframeRef.current?.contentWindow?.postMessage({
              type: "TOOL_RESULT",
              callbackId: action.callbackId,
              result
            }, "*");
            break;

          case "SUBMIT_PROMPT":
            onPromptSubmit?.(action.prompt);
            break;

          case "NOTIFY":
            console.log(`[${action.level}] ${action.message}`);
            break;

          case "NAVIGATE":
            window.open(action.url, action.target || "_blank");
            break;
        }
      } catch (error) {
        iframeRef.current?.contentWindow?.postMessage({
          type: "TOOL_RESULT",
          callbackId: action.callbackId,
          error: error instanceof Error ? error.message : "Unknown error"
        }, "*");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [allowedTools, onToolCall, onPromptSubmit]);

  useEffect(() => {
    if (!iframeRef.current) return;

    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    try {
      doc.open();
      doc.write(resource.text);
      doc.close();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to render");
    }
  }, [resource]);

  if (error) {
    return <div className="error">Error rendering UI: {error}</div>;
  }

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-scripts allow-same-origin allow-forms"
      style={{
        width: "100%",
        height: "600px",
        border: "1px solid #ddd",
        borderRadius: "4px"
      }}
    />
  );
}

// Usage
function App() {
  const [resource, setResource] = useState(null);

  async function loadUI() {
    const res = await mcpClient.readResource("ui://stats/live");
    setResource(res.contents[0]);
  }

  async function handleToolCall(name: string, args: any) {
    const result = await mcpClient.callTool(name, args);
    return result.content;
  }

  return (
    <div>
      {resource && (
        <UIResourceRenderer
          resource={resource}
          allowedTools={["getStats", "updateSetting"]}
          onToolCall={handleToolCall}
        />
      )}
    </div>
  );
}
```

## Common Patterns

### Pattern 1: Loading State

**Server Side**:
```typescript
interface LoadingUI extends IUI {
  html: string;
  tools: string[];
}

export async function dataViewer(): Promise<LoadingUI> {
  return {
    html: `
      <div id="app">
        <div id="loading">Loading...</div>
        <div id="content" style="display: none;"></div>
        <div id="error" style="display: none;"></div>
      </div>

      <script>
        async function load() {
          try {
            const data = await callTool("getData", {});
            document.getElementById("loading").style.display = "none";
            document.getElementById("content").style.display = "block";
            document.getElementById("content").innerHTML = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById("loading").style.display = "none";
            document.getElementById("error").style.display = "block";
            document.getElementById("error").textContent = error.message;
          }
        }

        load();
      </script>
    `,
    tools: ["getData"]
  };
}
```

### Pattern 2: Form Submission

```typescript
interface FormUI extends IUI {
  html: string;
  tools: string[];
}

export async function settingsForm(): Promise<FormUI> {
  return {
    html: `
      <form id="settings-form">
        <label>
          Name:
          <input type="text" name="name" required>
        </label>
        <label>
          Email:
          <input type="email" name="email" required>
        </label>
        <button type="submit">Save</button>
      </form>

      <div id="message"></div>

      <script>
        document.getElementById("settings-form").addEventListener("submit", async (e) => {
          e.preventDefault();

          const formData = new FormData(e.target);
          const data = Object.fromEntries(formData);

          try {
            await callTool("saveSettings", data);
            document.getElementById("message").textContent = "Settings saved!";
            document.getElementById("message").style.color = "green";
          } catch (error) {
            document.getElementById("message").textContent = "Error: " + error.message;
            document.getElementById("message").style.color = "red";
          }
        });
      </script>
    `,
    tools: ["saveSettings"]
  };
}
```

### Pattern 3: Real-Time Updates

```typescript
interface LiveUI extends IUI {
  html: string;
  tools: string[];
}

export async function liveMonitor(): Promise<LiveUI> {
  return {
    html: `
      <div id="status">Connecting...</div>
      <div id="data"></div>

      <script>
        async function poll() {
          try {
            const data = await callTool("getStatus", {});
            document.getElementById("data").textContent = JSON.stringify(data, null, 2);
            document.getElementById("status").textContent = "Connected";
            document.getElementById("status").style.color = "green";
          } catch (error) {
            document.getElementById("status").textContent = "Error: " + error.message;
            document.getElementById("status").style.color = "red";
          }

          // Poll every 2 seconds
          setTimeout(poll, 2000);
        }

        poll();
      </script>
    `,
    tools: ["getStatus"]
  };
}
```

## Complete Working Examples

### Example: Task Manager

**Server Side**:
```typescript
import { IUI } from "simply-mcp";

interface Task {
  id: number;
  title: string;
  completed: boolean;
}

let tasks: Task[] = [
  { id: 1, title: "Learn MCP UI", completed: false },
  { id: 2, title: "Build something cool", completed: false }
];

export async function taskManager(): Promise<IUI> {
  return {
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial; max-width: 600px; margin: 50px auto; }
            .task { display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #ddd; }
            .task input { margin-right: 10px; }
            .task.completed { text-decoration: line-through; color: #999; }
            #new-task { width: 100%; padding: 10px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Task Manager</h1>
          <input id="new-task" placeholder="Add a new task..." />
          <div id="tasks"></div>

          <script>
            async function loadTasks() {
              const data = await callTool("getTasks", {});
              const container = document.getElementById("tasks");
              container.innerHTML = "";

              data.tasks.forEach(task => {
                const div = document.createElement("div");
                div.className = "task" + (task.completed ? " completed" : "");
                div.innerHTML = \`
                  <input type="checkbox" \${task.completed ? "checked" : ""}
                         onchange="toggleTask(\${task.id})">
                  <span>\${task.title}</span>
                \`;
                container.appendChild(div);
              });
            }

            async function toggleTask(id) {
              await callTool("toggleTask", { id });
              await loadTasks();
            }

            document.getElementById("new-task").addEventListener("keypress", async (e) => {
              if (e.key === "Enter" && e.target.value) {
                await callTool("addTask", { title: e.target.value });
                e.target.value = "";
                await loadTasks();
              }
            });

            loadTasks();
          </script>
        </body>
      </html>
    `,
    tools: ["getTasks", "addTask", "toggleTask"]
  };
}

export async function getTasks() {
  return { tasks };
}

export async function addTask({ title }: { title: string }) {
  const id = Math.max(...tasks.map(t => t.id), 0) + 1;
  tasks.push({ id, title, completed: false });
  return { success: true };
}

export async function toggleTask({ id }: { id: number }) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
  }
  return { success: true };
}
```

This complete example demonstrates:
- UI definition with inline HTML
- Tool allowlist (`getTasks`, `addTask`, `toggleTask`)
- Bidirectional communication
- State management
- Interactive user interface

All of these patterns can be used and combined to create rich, interactive MCP UI experiences!
