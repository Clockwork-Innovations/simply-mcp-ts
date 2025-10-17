# MCP-UI Complete API Reference

**Version**: 1.0.0 (Layer 5 - Production Ready)
**Status**: Complete Implementation
**Last Updated**: 2025-10-16

---

## Table of Contents

1. [Overview](#overview)
2. [Server-Side API](#server-side-api)
   - [Core Functions](#core-functions)
   - [API Styles](#api-styles)
3. [Client-Side API](#client-side-api)
   - [React Components](#react-components)
   - [TypeScript Types](#typescript-types)
4. [Resource Types](#resource-types)
5. [Error Handling](#error-handling)
6. [Performance Optimization](#performance-optimization)
7. [Troubleshooting](#troubleshooting)

---

## Overview

MCP-UI provides a secure, flexible system for creating interactive UI resources in MCP servers. This reference documents all public APIs, including server-side resource creation functions and client-side rendering components.

### Supported UI Types

1. **Inline HTML** (`text/html`) - Static or dynamic HTML rendered in sandboxed iframes
2. **External URLs** (`text/uri-list`) - External web pages embedded in iframes
3. **Remote DOM** (`application/vnd.mcp-ui.remote-dom+javascript`) - Native React components created from sandboxed scripts

---

## Server-Side API

### Core Functions

#### `createInlineHTMLResource()`

Creates a UI resource with inline HTML content.

**Signature:**
```typescript
function createInlineHTMLResource(
  uri: string,
  htmlContent: string,
  options?: UIResourceOptions
): UIResource
```

**Parameters:**
- `uri` (string, required): Unique identifier starting with `"ui://"`
- `htmlContent` (string, required): Complete HTML content to render
- `options` (UIResourceOptions, optional): Metadata and annotations

**Returns:** `UIResource` object ready for MCP response

**Throws:**
- `Error` if URI doesn't start with `"ui://"`

**Example - Static HTML:**
```typescript
import { createInlineHTMLResource } from 'simple-mcp';

const productCard = createInlineHTMLResource(
  'ui://product/card',
  `
    <div style="padding: 20px; border: 1px solid #ccc; border-radius: 8px;">
      <h2>Premium Widget</h2>
      <p>The best widget on the market!</p>
      <button onclick="alert('Added to cart!')">Add to Cart</button>
    </div>
  `
);
```

**Example - Dynamic HTML:**
```typescript
const server = new BuildMCPServer({ name: 'my-server', version: '1.0.0' });

server.addUIResource(
  'ui://stats/dashboard',
  'Stats Dashboard',
  'Live server statistics',
  'text/html',
  () => {
    const stats = {
      users: 42,
      uptime: Math.floor(process.uptime())
    };
    return `
      <div style="padding: 20px; font-family: sans-serif;">
        <h1>Server Stats</h1>
        <p>Active Users: ${stats.users}</p>
        <p>Uptime: ${stats.uptime}s</p>
      </div>
    `;
  }
);
```

**Example - With Metadata:**
```typescript
const chart = createInlineHTMLResource(
  'ui://analytics/chart',
  '<canvas id="chart"></canvas>',
  {
    metadata: {
      preferredFrameSize: { width: 800, height: 600 },
      initialRenderData: { period: 'Q4-2024' }
    },
    annotations: {
      'myapp.com/chart-type': 'line-chart'
    }
  }
);
```

---

#### `createExternalURLResource()`

Creates a UI resource pointing to an external URL.

**Signature:**
```typescript
function createExternalURLResource(
  uri: string,
  url: string,
  options?: UIResourceOptions
): UIResource
```

**Parameters:**
- `uri` (string, required): Unique identifier starting with `"ui://"`
- `url` (string, required): HTTPS URL or localhost URL
- `options` (UIResourceOptions, optional): Metadata and annotations

**Returns:** `UIResource` object ready for MCP response

**Throws:**
- `Error` if URI doesn't start with `"ui://"`
- `Error` if URL is not HTTPS or localhost

**Example - Production URL:**
```typescript
const dashboard = createExternalURLResource(
  'ui://analytics/dashboard',
  'https://analytics.example.com/dashboard'
);
```

**Example - Development URL:**
```typescript
const devWidget = createExternalURLResource(
  'ui://dev/widget',
  'http://localhost:3000/widget'
);
```

**Security Notes:**
- Only HTTPS URLs are allowed in production
- `localhost` and `127.0.0.1` are allowed for development
- External URLs render with `allow-scripts allow-same-origin` sandbox

---

#### `createRemoteDOMResource()`

Creates a UI resource with Remote DOM script for native-looking React components.

**Signature:**
```typescript
function createRemoteDOMResource(
  uri: string,
  script: string,
  framework?: RemoteDOMFramework,
  options?: UIResourceOptions
): RemoteDOMResource
```

**Parameters:**
- `uri` (string, required): Unique identifier starting with `"ui://"`
- `script` (string, required): JavaScript code using remoteDOM API
- `framework` (RemoteDOMFramework, optional): Default is `'javascript'`
- `options` (UIResourceOptions, optional): Metadata and annotations

**Returns:** `RemoteDOMResource` object ready for MCP response

**Throws:**
- `Error` if URI doesn't start with `"ui://"`

**Example - Counter Component:**
```typescript
const counter = createRemoteDOMResource(
  'ui://counter/v1',
  `
    // Create container
    const card = remoteDOM.createElement('div', {
      style: {
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        maxWidth: '300px'
      }
    });

    // Add title
    const title = remoteDOM.createElement('h2');
    remoteDOM.setTextContent(title, 'Counter');
    remoteDOM.appendChild(card, title);

    // Add counter display
    let count = 0;
    const display = remoteDOM.createElement('div', {
      id: 'count',
      style: { fontSize: '24px', margin: '10px 0' }
    });
    remoteDOM.setTextContent(display, String(count));
    remoteDOM.appendChild(card, display);

    // Add button with click handler
    const button = remoteDOM.createElement('button');
    remoteDOM.setTextContent(button, 'Increment');
    remoteDOM.addEventListener(button, 'click', () => {
      count++;
      remoteDOM.setTextContent(display, String(count));
      remoteDOM.callHost('notify', {
        level: 'info',
        message: 'Count: ' + count
      });
    });
    remoteDOM.appendChild(card, button);
  `
);
```

**Remote DOM API Reference:**

The `remoteDOM` object is available in the sandbox and provides these methods:

- `createElement(tagName, props?)` - Create an element
- `setAttribute(elementId, name, value)` - Set attribute value
- `appendChild(parentId, childId)` - Append child to parent
- `removeChild(parentId, childId)` - Remove child from parent
- `setTextContent(elementId, text)` - Set text content
- `addEventListener(elementId, event, handler)` - Attach event handler
- `callHost(action, payload)` - Call parent application

**Allowed Components:**
- Basic: `div`, `span`, `p`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`
- Forms: `button`, `input`, `textarea`, `select`, `option`, `label`, `form`
- Lists: `ul`, `ol`, `li`
- Misc: `a`, `img`, `code`, `pre`, `br`, `hr`

---

#### `isUIResource()`

Type guard to check if an object is a valid UI resource.

**Signature:**
```typescript
function isUIResource(resource: any): resource is UIResource
```

**Parameters:**
- `resource` (any): Object to check

**Returns:** `boolean` - True if valid UI resource

**Example:**
```typescript
const resource = createInlineHTMLResource('ui://test', '<div>Hello</div>');

if (isUIResource(resource)) {
  console.log('Valid UI resource:', resource.resource.uri);
} else {
  console.error('Invalid resource');
}
```

---

### API Styles

MCP-UI supports four API styles for creating UI resources. All styles produce identical resources.

#### Style 1: Programmatic API

Direct method calls for maximum flexibility.

```typescript
import { BuildMCPServer } from 'simple-mcp';

const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0'
});

server.addUIResource(
  'ui://form/feedback',
  'Feedback Form',
  'User feedback form',
  'text/html',
  '<form><h2>Feedback</h2><textarea></textarea><button>Submit</button></form>'
);

// Dynamic content
server.addUIResource(
  'ui://stats',
  'Stats',
  'Server statistics',
  'text/html',
  () => `<div>Stats: ${Date.now()}</div>`
);

// External URL
server.addUIResource(
  'ui://external',
  'External Widget',
  'External dashboard',
  'text/uri-list',
  'https://example.com/widget'
);

// Remote DOM
server.addUIResource(
  'ui://counter',
  'Counter',
  'Interactive counter',
  'application/vnd.mcp-ui.remote-dom+javascript',
  'const btn = remoteDOM.createElement("button"); ...'
);
```

**Best For:** Dynamic configuration, programmatic control

---

#### Style 2: Decorator API

Class-based with decorators for declarative definitions.

```typescript
import { MCPServer, uiResource } from 'simple-mcp';

@MCPServer({
  name: 'decorator-server',
  version: '1.0.0'
})
class MyServer {
  @uiResource('ui://form/feedback', 'text/html', {
    name: 'Feedback Form',
    description: 'User feedback form'
  })
  getFeedbackForm() {
    return '<form><h2>Feedback</h2><textarea></textarea></form>';
  }

  @uiResource('ui://stats', 'text/html', {
    name: 'Stats Dashboard'
  })
  async getStats() {
    const data = await this.fetchStats();
    return `<div>Users: ${data.users}</div>`;
  }

  @uiResource('ui://external', 'text/uri-list', {
    name: 'External Widget'
  })
  getExternalWidget() {
    return 'https://example.com/widget';
  }

  private async fetchStats() {
    return { users: 42 };
  }
}
```

**Best For:** Object-oriented codebases, TypeScript projects

---

#### Style 3: Functional API

Configuration-based with builder functions.

```typescript
import { defineMCP, defineUIResource } from 'simple-mcp';

const server = defineMCP({
  name: 'functional-server',
  version: '1.0.0',
  uiResources: [
    defineUIResource({
      uri: 'ui://form/feedback',
      name: 'Feedback Form',
      description: 'User feedback form',
      mimeType: 'text/html',
      content: '<form><h2>Feedback</h2><textarea></textarea></form>'
    }),

    defineUIResource({
      uri: 'ui://stats',
      name: 'Stats Dashboard',
      mimeType: 'text/html',
      content: async () => {
        const stats = await getStats();
        return `<div>Users: ${stats.users}</div>`;
      }
    }),

    defineUIResource({
      uri: 'ui://external',
      name: 'External Widget',
      mimeType: 'text/uri-list',
      content: 'https://example.com/widget'
    })
  ]
});
```

**Best For:** Single-file servers, configuration-driven setups

---

#### Style 4: Interface API

Pure TypeScript interfaces for type-safe implementations.

```typescript
import type { IServer, IUIResourceProvider, UIResourceDefinition } from 'simple-mcp';

class MyServer implements IServer, IUIResourceProvider {
  name = 'interface-server' as const;
  version = '1.0.0' as const;
  description = 'Interface-based server' as const;

  getUIResources(): UIResourceDefinition[] {
    return [
      {
        uri: 'ui://form/feedback',
        name: 'Feedback Form',
        description: 'User feedback form',
        mimeType: 'text/html',
        content: '<form><h2>Feedback</h2><textarea></textarea></form>'
      },

      {
        uri: 'ui://stats',
        name: 'Stats Dashboard',
        mimeType: 'text/html',
        content: async () => {
          const stats = await this.getStats();
          return `<div>Users: ${stats.users}</div>`;
        }
      },

      {
        uri: 'ui://external',
        name: 'External Widget',
        mimeType: 'text/uri-list',
        content: 'https://example.com/widget'
      }
    ];
  }

  private async getStats() {
    return { users: 42 };
  }
}
```

**Best For:** Type safety, contract-first design, large teams

---

## Client-Side API

### React Components

#### `<UIResourceRenderer />`

Main component for rendering any type of UI resource.

**Props:**

```typescript
interface UIResourceRendererProps {
  resource: UIResourceContent;           // UI resource to render (required)
  onUIAction?: (action: UIActionResult) => void | Promise<void>; // Action handler
  customSandboxPermissions?: string;     // Override sandbox attribute
  autoResize?: boolean;                  // Enable auto-resize (default: true)
  style?: React.CSSProperties;           // Custom iframe styles
}
```

**Example - Basic Usage:**
```tsx
import { UIResourceRenderer } from 'simple-mcp/client';

function App() {
  const resource = {
    uri: 'ui://product-card',
    mimeType: 'text/html',
    text: '<div><h2>Product Card</h2></div>'
  };

  return <UIResourceRenderer resource={resource} />;
}
```

**Example - With Action Handler:**
```tsx
import { UIResourceRenderer } from 'simple-mcp/client';

function App() {
  const handleAction = async (action) => {
    console.log('Action received:', action);

    if (action.type === 'tool') {
      // Execute MCP tool
      const result = await executeTool(action.payload);
      return result;
    }

    if (action.type === 'notify') {
      // Show notification
      showNotification(action.payload.message);
    }
  };

  return (
    <UIResourceRenderer
      resource={resource}
      onUIAction={handleAction}
    />
  );
}
```

**Example - Custom Styling:**
```tsx
<UIResourceRenderer
  resource={resource}
  style={{
    height: '600px',
    maxWidth: '800px',
    border: '2px solid #ccc'
  }}
/>
```

**Error Handling:**

UIResourceRenderer includes comprehensive error boundaries:
- Invalid resource structure errors
- Unsupported MIME type errors
- Rendering errors with stack traces
- All errors logged to console for debugging

---

#### `<HTMLResourceRenderer />`

Specialized component for HTML resources (inline or external URLs).

**Props:**

```typescript
interface HTMLResourceRendererProps {
  resource: UIResourceContent;           // UI resource
  onUIAction?: (action: UIActionResult) => void | Promise<void>;
  isExternalUrl?: boolean;               // Whether resource is external URL
  customSandboxPermissions?: string;     // Override sandbox
  autoResize?: boolean;                  // Enable auto-resize
  style?: React.CSSProperties;           // Custom styles
}
```

**Example:**
```tsx
import { HTMLResourceRenderer } from 'simple-mcp/client';

<HTMLResourceRenderer
  resource={htmlResource}
  isExternalUrl={false}
  onUIAction={handleAction}
/>
```

**Loading States:**
- Shows loading spinner for external URLs
- Displays error message if URL fails to load
- Smooth transition to loaded content

---

#### `<RemoteDOMRenderer />`

Specialized component for Remote DOM resources.

**Props:**

```typescript
interface RemoteDOMRendererProps {
  resource: UIResourceContent;           // Remote DOM resource
  onUIAction?: (action: UIActionResult) => void | Promise<void>;
}
```

**Example:**
```tsx
import { RemoteDOMRenderer } from 'simple-mcp/client';

<RemoteDOMRenderer
  resource={remoteDOMResource}
  onUIAction={handleAction}
/>
```

**Loading States:**
- "Initializing Web Worker..." - Creating sandbox
- "Executing Remote DOM script..." - Running script
- Loading spinner with stage indicator
- Error display with detailed information

---

### TypeScript Types

#### `UIResource`

Complete UI resource object with MCP envelope.

```typescript
interface UIResource {
  type: 'resource';
  resource: UIResourcePayload;
}
```

---

#### `UIResourcePayload`

The actual resource data.

```typescript
interface UIResourcePayload {
  uri: string;              // Must start with "ui://"
  mimeType: string;         // text/html, text/uri-list, or Remote DOM MIME
  text?: string;            // Text content
  blob?: string;            // Base64-encoded content
  _meta?: Record<string, any>; // Metadata annotations
}
```

---

#### `UIResourceOptions`

Optional configuration for creating resources.

```typescript
interface UIResourceOptions {
  metadata?: {
    preferredFrameSize?: {
      width?: number;
      height?: number;
    };
    initialRenderData?: Record<string, any>;
  };
  annotations?: Record<string, any>;
}
```

---

#### `UIActionResult`

Action triggered from UI resource.

```typescript
interface UIActionResult {
  type: 'tool' | 'notify' | 'link' | 'prompt' | 'intent';
  payload: Record<string, any>;
}
```

**Action Types:**
- `tool` - Execute MCP tool
- `notify` - Show notification
- `link` - Navigate to URL
- `prompt` - Trigger MCP prompt
- `intent` - Platform-specific action

---

#### `UIContentType`

Content type classification.

```typescript
type UIContentType = 'rawHtml' | 'externalUrl' | 'remoteDom';
```

---

## Resource Types

### Inline HTML (`text/html`)

**Use Cases:**
- Forms and input UIs
- Data visualizations
- Product cards and catalogs
- Static content with styling

**Sandbox Permissions:** `allow-scripts`

**Example:**
```typescript
createInlineHTMLResource(
  'ui://form/contact',
  `
    <form style="padding: 20px; font-family: sans-serif;">
      <h2>Contact Us</h2>
      <label>Name: <input type="text" name="name" /></label><br/>
      <label>Email: <input type="email" name="email" /></label><br/>
      <button type="submit">Send</button>
    </form>
  `
);
```

---

### External URL (`text/uri-list`)

**Use Cases:**
- Embedding third-party dashboards
- Integration with external services
- Pre-built web applications
- Development/testing with localhost

**Sandbox Permissions:** `allow-scripts allow-same-origin`

**Security:** HTTPS required (except localhost)

**Example:**
```typescript
createExternalURLResource(
  'ui://analytics/dashboard',
  'https://analytics.example.com/embed/dashboard?theme=light'
);
```

---

### Remote DOM (`application/vnd.mcp-ui.remote-dom+javascript`)

**Use Cases:**
- Interactive components with state
- Native-looking UI elements
- Complex user interactions
- When security is paramount

**Security:** Script runs in Web Worker with no DOM access

**Example:**
```typescript
createRemoteDOMResource(
  'ui://todo/list',
  `
    const container = remoteDOM.createElement('div', {
      style: { padding: '20px' }
    });

    const title = remoteDOM.createElement('h2');
    remoteDOM.setTextContent(title, 'Todo List');
    remoteDOM.appendChild(container, title);

    const input = remoteDOM.createElement('input', {
      type: 'text',
      placeholder: 'Add todo...'
    });
    remoteDOM.appendChild(container, input);

    const addBtn = remoteDOM.createElement('button');
    remoteDOM.setTextContent(addBtn, 'Add');
    remoteDOM.addEventListener(addBtn, 'click', () => {
      // Get input value and add to list
      remoteDOM.callHost('notify', {
        message: 'Todo added!'
      });
    });
    remoteDOM.appendChild(container, addBtn);
  `
);
```

---

## Error Handling

### Server-Side Errors

**URI Validation:**
```typescript
try {
  createInlineHTMLResource('invalid-uri', '<div>Hello</div>');
} catch (error) {
  // Error: Invalid UI resource URI: "invalid-uri".
  // UI resource URIs must start with "ui://"
}
```

**URL Validation:**
```typescript
try {
  createExternalURLResource('ui://test', 'http://insecure.com');
} catch (error) {
  // Error: Invalid external URL: "http://insecure.com".
  // Must be HTTPS or localhost (for development)
}
```

---

### Client-Side Errors

**Invalid Resource:**
```tsx
<UIResourceRenderer resource={invalidResource} />
// Displays: "Invalid UI Resource" with resource details
```

**Unsupported MIME Type:**
```tsx
<UIResourceRenderer resource={{
  uri: 'ui://test',
  mimeType: 'application/json',
  text: '{}'
}} />
// Displays: "Unsupported UI Resource Type" with supported types list
```

**Rendering Errors:**
```tsx
// If any error occurs during rendering:
// Displays: "UI Rendering Error" with:
// - User-friendly message
// - Resource URI
// - Error message
// - Stack trace (collapsible)
// - Console logs for debugging
```

---

### Best Practices

1. **Always Handle Errors:**
```typescript
const server = new BuildMCPServer({ name: 'my-server', version: '1.0.0' });

server.addUIResource(
  'ui://data',
  'Data View',
  'Display data',
  'text/html',
  async () => {
    try {
      const data = await fetchData();
      return `<div>${formatData(data)}</div>`;
    } catch (error) {
      // Return error UI instead of throwing
      return `
        <div style="color: red; padding: 20px;">
          <h3>Error Loading Data</h3>
          <p>${error.message}</p>
        </div>
      `;
    }
  }
);
```

2. **Validate Dynamic Content:**
```typescript
server.addUIResource(
  'ui://user-profile',
  'User Profile',
  'User profile card',
  'text/html',
  (userId: string) => {
    // Validate input
    if (!userId || typeof userId !== 'string') {
      return '<div>Error: Invalid user ID</div>';
    }

    const user = getUserById(userId);
    if (!user) {
      return '<div>Error: User not found</div>';
    }

    return `<div><h2>${escapeHtml(user.name)}</h2></div>`;
  }
);
```

3. **Client-Side Error Handling:**
```tsx
function App() {
  const handleAction = async (action: UIActionResult) => {
    try {
      if (action.type === 'tool') {
        const result = await executeTool(action.payload);
        return result;
      }
    } catch (error) {
      console.error('Action failed:', error);
      showErrorNotification('Action failed. Please try again.');
    }
  };

  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <UIResourceRenderer
        resource={resource}
        onUIAction={handleAction}
      />
    </ErrorBoundary>
  );
}
```

---

## Performance Optimization

### Server-Side

**1. Cache Static Resources:**
```typescript
const cachedHTML = generateComplexHTML(); // Generate once

server.addUIResource(
  'ui://static',
  'Static Content',
  'Pre-generated content',
  'text/html',
  cachedHTML // Return cached value
);
```

**2. Use Dynamic Resources Wisely:**
```typescript
// Good: Fast dynamic content
server.addUIResource('ui://time', 'Time', 'Current time', 'text/html',
  () => `<div>Time: ${Date.now()}</div>`
);

// Bad: Slow synchronous operation
server.addUIResource('ui://slow', 'Slow', 'Slow content', 'text/html',
  () => {
    const data = expensiveSync Operation(); // Blocks!
    return `<div>${data}</div>`;
  }
);

// Good: Async operation
server.addUIResource('ui://fast', 'Fast', 'Fast content', 'text/html',
  async () => {
    const data = await fastAsyncOperation(); // Non-blocking
    return `<div>${data}</div>`;
  }
);
```

**3. Minimize HTML Size:**
```typescript
// Bad: Large inline CSS/JS
createInlineHTMLResource('ui://big', `
  <style>
    /* Hundreds of lines of CSS... */
  </style>
  <div>Content</div>
`);

// Good: Minimal inline, use external URL
createExternalURLResource(
  'ui://optimized',
  'https://cdn.example.com/widget.html'
);
```

---

### Client-Side

**1. Lazy Load Resources:**
```tsx
import { lazy, Suspense } from 'react';

const UIResourceRenderer = lazy(() =>
  import('simple-mcp/client').then(m => ({ default: m.UIResourceRenderer }))
);

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UIResourceRenderer resource={resource} />
    </Suspense>
  );
}
```

**2. Memoize Expensive Operations:**
```tsx
import { useMemo } from 'react';

function App() {
  const resource = useMemo(() => ({
    uri: 'ui://data',
    mimeType: 'text/html',
    text: generateExpensiveHTML()
  }), [dependencies]);

  return <UIResourceRenderer resource={resource} />;
}
```

**3. Debounce Action Handlers:**
```tsx
import { useCallback } from 'react';
import { debounce } from 'lodash';

function App() {
  const handleAction = useCallback(
    debounce(async (action) => {
      await processAction(action);
    }, 300),
    []
  );

  return (
    <UIResourceRenderer
      resource={resource}
      onUIAction={handleAction}
    />
  );
}
```

---

## Troubleshooting

### Problem: UI Resource Not Rendering

**Symptom:** Blank screen or "Invalid UI Resource" error

**Solution:**
1. Check resource structure:
```typescript
console.log(JSON.stringify(resource, null, 2));
// Should have: { type: 'resource', resource: { uri, mimeType, text } }
```

2. Validate MIME type:
```typescript
// Must be one of:
// - text/html
// - text/uri-list
// - application/vnd.mcp-ui.remote-dom+javascript
```

3. Check URI format:
```typescript
// URI must start with "ui://"
const resource = createInlineHTMLResource(
  'ui://my-resource', // ✅ Correct
  // 'my-resource', // ❌ Wrong
  '<div>Content</div>'
);
```

---

### Problem: External URL Not Loading

**Symptom:** Loading spinner never completes, or error message

**Solution:**
1. Check URL is HTTPS:
```typescript
// ✅ Correct
createExternalURLResource('ui://widget', 'https://example.com/widget');

// ❌ Wrong (unless localhost)
createExternalURLResource('ui://widget', 'http://example.com/widget');
```

2. Check CORS headers on external server
3. Verify URL is accessible from client
4. Check browser console for security errors

---

### Problem: Remote DOM Script Errors

**Symptom:** "Remote DOM Error" or script not executing

**Solution:**
1. Check script syntax:
```typescript
// Use console.log for debugging
const script = `
  console.log('Script started');
  const div = remoteDOM.createElement('div');
  console.log('Created div:', div);
`;
```

2. Verify component names are allowed:
```typescript
// ✅ Allowed
remoteDOM.createElement('div');
remoteDOM.createElement('button');

// ❌ Not allowed
remoteDOM.createElement('custom-element');
remoteDOM.createElement('script');
```

3. Check event handler registration:
```typescript
// Correct
remoteDOM.addEventListener(buttonId, 'click', () => {
  console.log('Clicked!');
});

// Wrong - handler must be function
remoteDOM.addEventListener(buttonId, 'click', 'not-a-function');
```

---

### Problem: Actions Not Working

**Symptom:** Button clicks or actions have no effect

**Solution:**
1. Check `onUIAction` is provided:
```tsx
<UIResourceRenderer
  resource={resource}
  onUIAction={(action) => {
    console.log('Action received:', action);
  }}
/>
```

2. Verify postMessage format (for HTML resources):
```javascript
// In iframe
window.parent.postMessage({
  type: 'tool',
  payload: { name: 'my-tool', args: {} }
}, '*');
```

3. Check Remote DOM callHost syntax:
```javascript
// Correct
remoteDOM.callHost('notify', { message: 'Hello' });

// Wrong - missing payload
remoteDOM.callHost('notify');
```

---

### Problem: Styling Issues

**Symptom:** UI looks incorrect or overflows container

**Solution:**
1. Set explicit iframe dimensions:
```tsx
<UIResourceRenderer
  resource={resource}
  style={{
    width: '100%',
    height: '600px', // Set explicit height
    border: 'none'
  }}
/>
```

2. Use responsive HTML:
```typescript
createInlineHTMLResource('ui://responsive', `
  <div style="
    width: 100%;
    max-width: 800px;
    box-sizing: border-box;
    padding: 20px;
  ">
    Content
  </div>
`);
```

3. Check for conflicting CSS in iframe

---

### Problem: Performance Issues

**Symptom:** Slow rendering or laggy interactions

**Solution:**
1. Profile resource generation:
```typescript
server.addUIResource('ui://test', 'Test', 'Test', 'text/html', () => {
  console.time('generate');
  const html = generateHTML();
  console.timeEnd('generate');
  return html;
});
```

2. Reduce resource size:
```typescript
// Minimize HTML
// Remove unnecessary whitespace
// Extract CSS to external file
```

3. Use lazy loading:
```tsx
// Only load UIResourceRenderer when needed
const renderer = useMemo(() => (
  <UIResourceRenderer resource={resource} />
), [resource]);
```

---

## Additional Resources

- **Security Guide**: See `SECURITY-GUIDE.md` for comprehensive security documentation
- **Examples**: Check `/examples` directory for working examples
- **Specifications**: See layer specification docs for architecture details
- **Support**: Open an issue on GitHub for help

---

## Version History

- **1.0.0** (Layer 5) - Production ready with error handling and documentation
- **0.3.0** (Layer 3) - Added Remote DOM support
- **0.2.0** (Layer 2) - Added external URLs and interactive features
- **0.1.0** (Layer 1) - Foundation layer with inline HTML

---

**End of API Reference**
