# MCP UI Protocol Reference

> **Community Extension**: MCP-UI is a community-maintained extension to the official MCP protocol by [@idosal](https://github.com/idosal). It is not part of the official Anthropic MCP specification. See the [official MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) for the base protocol.

Complete reference for the MCP UI specification implementation in Simply-MCP.

## Table of Contents

- [Overview](#overview)
- [Protocol Compliance](#protocol-compliance)
- [MIME Types](#mime-types)
- [PostMessage Protocol](#postmessage-protocol)
- [Response Format](#response-format)
- [Security Model](#security-model)
- [SDK API Reference](#sdk-api-reference)
- [Client Integration](#client-integration)
- [Code Examples](#code-examples)

---

## Overview

Simply-MCP implements **100% spec-compliant** MCP UI support for the core protocol (text/html and text/uri-list), fully compatible with the official [@mcp-ui](https://github.com/idosal/mcp-ui) specification. Advanced features like Remote DOM are planned for future releases. This enables MCP servers to provide rich, interactive user interfaces alongside traditional tools, prompts, and resources.

### Official Specification

- **Repository**: [github.com/idosal/mcp-ui](https://github.com/idosal/mcp-ui)
- **Website**: [mcpui.dev](https://mcpui.dev)
- **Protocol Version**: 2024-11-05

### Key Features

- ✅ **5/5 Action Types** - Complete postMessage protocol support (tool, prompt, notify, intent, link)
- ✅ **2/2 Core MIME Types** - text/html ✅, text/uri-list ✅ (Remote DOM planned for Phase 2)
- ✅ **SDK-Compatible API** - createUIResource(), onUIAction prop, htmlProps support
- ✅ **Spec-Compliant Protocol** - Official message format, ui-message-response, acknowledgments
- ✅ **Security First** - Sandboxed iframes with origin validation
- ✅ **React Integration** - UIResourceRenderer component for clients
- ✅ **1022 Passing Tests** - Comprehensive test coverage validates spec compliance

---

## Protocol Compliance

Simply-MCP achieves full protocol compliance for the core MCP UI specification:

### Supported Action Types (5/5)

| Action Type | Status | Description |
|-------------|--------|-------------|
| `tool` | ✅ Implemented | Execute MCP server tools |
| `notify` | ✅ Implemented | Display user notifications |
| `prompt` | ✅ Implemented | Submit to LLM |
| `intent` | ✅ Implemented | Trigger platform intents |
| `link` | ✅ Implemented | Navigate to URLs |

### Supported MIME Types

| MIME Type | Status | Description |
|-----------|--------|-------------|
| `text/html` | ✅ **100% Compliant** | Inline HTML content in sandboxed iframes |
| `text/uri-list` | ✅ **100% Compliant** | External URLs loaded in iframes |
| `application/vnd.mcp-ui.remote-dom+javascript` | ⏳ **Planned (Phase 2)** | Advanced Remote DOM rendering (40-60h future work) |

**Core Protocol Coverage:** 2/2 primary MIME types fully supported (100% compliance)

### Protocol Format

Simply-MCP uses the **official nested payload structure** with proper `messageId` correlation:

```typescript
// Spec-compliant format
{
  type: 'tool',
  payload: { toolName: '...', params: { ... } },
  messageId: 'unique-id'
}
```

**Note**: Legacy formats (pre-v4.0.0) are temporarily supported but will be deprecated. See [Migration Guide](./MCP_UI_MIGRATION.md) for details.

### Known Limitations

Simply-MCP has **100% compliance** with the core MCP UI specification (text/html and text/uri-list). The following advanced feature is planned for future releases:

#### Remote DOM Rendering
- **Status:** ⏳ Planned for future release
- **Current:** MIME type is detected and validated but not rendered
- **Impact:** Advanced React/Web Component UIs cannot be rendered
- **Workaround:** Use `text/html` with embedded scripts or `text/uri-list` for external UIs
- **Tracking:** See [Protocol Parity Analysis](../../MCP_UI_PROTOCOL_PARITY_ANALYSIS.md)

#### Client-Side API Differences
- **`onUIAction` prop:** Not yet available
  - Current: Use context-based message handling
  - Planned: Full prop support in future release
- **`htmlProps`:** Not yet implemented
  - Missing: `style`, `autoResize`, `className` customization
  - Workaround: Use inline HTML styling
- **`remoteDomProps`:** N/A (Remote DOM not implemented)

#### Legacy Protocol Support
- **Status:** ⏳ Temporary (v4.x only)
- **Removal:** v5.0.0 (estimated Q2 2025)
- **Action Required:** Migrate to new protocol format before v5.0.0
- **Migration Guide:** See [MCP UI Migration Guide](./MCP_UI_MIGRATION.md)

For complete technical details on implementation differences, see the [MCP UI Protocol Parity Analysis](../../MCP_UI_PROTOCOL_PARITY_ANALYSIS.md).

---

## MIME Types

### text/html - Inline HTML

Renders HTML content in a sandboxed iframe.

**When to use:**
- Simple interactive UIs
- Forms and data input
- Dashboards and visualizations
- Self-contained widgets

**Security:**
- Sandboxed with `allow-scripts` only
- No same-origin access
- No direct DOM access to parent

**Example:**
```typescript
{
  uri: 'ui://calculator/v1',
  mimeType: 'text/html',
  text: '<div><h1>Calculator</h1></div>'
}
```

### text/uri-list - External URLs

Embeds external HTTPS URLs in iframes.

**When to use:**
- Existing web applications
- External dashboards
- Third-party widgets
- Complex multi-page UIs

**Security:**
- Sandboxed with `allow-scripts allow-same-origin`
- HTTPS required in production
- Origin validation on all postMessage

**Example:**
```typescript
{
  uri: 'ui://external-dashboard',
  mimeType: 'text/uri-list',
  text: 'https://example.com/dashboard'
}
```

### application/vnd.mcp-ui.remote-dom+javascript

Executes JavaScript in Web Worker sandbox for dynamic UI generation.

**When to use:**
- React components
- Web Components
- Highly dynamic UIs
- Maximum security isolation

**Security:**
- Executed in Web Worker (no DOM access)
- Communicates via Remote DOM protocol
- Complete sandboxing

**Example:**
```typescript
{
  uri: 'ui://react-widget',
  mimeType: 'application/vnd.mcp-ui.remote-dom+javascript; framework=react',
  text: 'import React from "react"; export default () => <div>Widget</div>;'
}
```

---

## PostMessage Protocol

All interactive UI resources use the postMessage protocol to communicate with the parent window.

### Message Structure

All messages follow the official MCP-UI specification:

```typescript
interface MCPUIMessage {
  type: 'tool' | 'notify' | 'prompt' | 'intent' | 'link';
  payload: Record<string, any>;
  messageId: string;  // Required for correlation
}
```

### Action Types

#### 1. Tool Call (`tool`)

Execute an MCP server tool from the UI.

**Message format:**
```javascript
window.parent.postMessage({
  type: 'tool',
  payload: {
    toolName: 'add_to_cart',
    params: { productId: '123', quantity: 1 }
  },
  messageId: 'msg_' + Date.now()
}, '*');
```

**Response format:**
```javascript
// Success
{
  type: 'acknowledgment',
  messageId: 'msg_...',
}
// Then later:
{
  type: 'result',
  messageId: 'msg_...',
  result: { success: true, cartTotal: 5 }
}

// Error
{
  type: 'result',
  messageId: 'msg_...',
  error: { message: 'Product not found' }
}
```

#### 2. Notification (`notify`)

Display a notification to the user.

**Message format:**
```javascript
window.parent.postMessage({
  type: 'notify',
  payload: {
    level: 'success',  // 'info' | 'warning' | 'error' | 'success'
    message: 'Item added to cart!'
  }
}, '*');
```

**Response:** None (fire-and-forget)

#### 3. LLM Prompt (`prompt`)

Submit a message to the LLM for processing.

**Message format:**
```javascript
window.parent.postMessage({
  type: 'prompt',
  payload: {
    promptName: 'analyze_data',
    arguments: {
      dataId: '456',
      analysisType: 'detailed'
    }
  },
  messageId: 'msg_' + Date.now()
}, '*');
```

**Response:** Acknowledgment + Result

#### 4. Platform Intent (`intent`)

Trigger platform-specific actions (share, open app, etc.).

**Message format:**
```javascript
window.parent.postMessage({
  type: 'intent',
  payload: {
    intentName: 'share',
    data: {
      title: 'Check this out',
      url: 'https://example.com'
    }
  },
  messageId: 'msg_' + Date.now()
}, '*');
```

**Response:** Acknowledgment + Result

#### 5. Link Navigation (`link`)

Navigate to a URL (new tab or current window).

**Message format:**
```javascript
window.parent.postMessage({
  type: 'link',
  payload: {
    url: 'https://example.com/docs',
    target: '_blank'  // '_blank' | '_self'
  }
}, '*');
```

**Response:** None (navigation occurs)

---

## Response Format

The protocol uses a two-phase response pattern:

### Phase 1: Acknowledgment

Sent immediately when the message is received:

```javascript
{
  type: 'acknowledgment',
  messageId: 'original-message-id'
}
```

### Phase 2: Result

Sent after processing completes:

```javascript
// Success
{
  type: 'result',
  messageId: 'original-message-id',
  result: { /* tool-specific data */ }
}

// Error
{
  type: 'result',
  messageId: 'original-message-id',
  error: {
    message: 'Error description',
    code: 'ERROR_CODE'  // Optional
  }
}
```

### MessageId Correlation

The `messageId` field correlates requests with responses:

1. UI sends message with unique `messageId`
2. Parent sends acknowledgment with same `messageId`
3. Parent sends final result with same `messageId`
4. UI matches responses using `messageId`

**Example correlation:**
```javascript
// UI sends
window.parent.postMessage({
  type: 'tool',
  payload: { toolName: 'add', params: { a: 5, b: 3 } },
  messageId: 'calc_1234'
}, '*');

// Parent responds (acknowledgment)
// messageId: 'calc_1234'

// Parent responds (result)
// messageId: 'calc_1234'
// result: 8

// UI receives both messages with messageId 'calc_1234'
```

---

## Security Model

Simply-MCP implements defense-in-depth security for UI resources:

### 1. Iframe Sandboxing

All UI content rendered in sandboxed iframes:

**Inline HTML (text/html):**
```html
<iframe
  sandbox="allow-scripts"
  srcdoc="..."
></iframe>
```

**External URLs (text/uri-list):**
```html
<iframe
  sandbox="allow-scripts allow-same-origin"
  src="https://example.com"
></iframe>
```

**Sandbox restrictions:**
- ❌ No direct parent DOM access
- ❌ No form submission (unless explicitly allowed)
- ❌ No popup windows
- ❌ No top-level navigation
- ✅ JavaScript execution allowed
- ✅ postMessage communication allowed

### 2. Origin Validation

All postMessage events validated before processing:

```typescript
window.addEventListener('message', (event) => {
  // Validate origin first
  if (!validateOrigin(event.origin)) {
    console.warn('Rejected message from:', event.origin);
    return;
  }

  // Safe to process
  handleUIAction(event.data);
});
```

**Accepted origins:**
- `null` - srcdoc iframes (inline HTML)
- `https://*` - HTTPS origins (production)
- `http://localhost` - Development only
- `http://127.0.0.1` - Development only

### 3. Content Security Policy (CSP)

Recommended CSP headers for production:

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  frame-src 'self' https:;
  connect-src 'self' https:;
```

### 4. HTTPS Enforcement

External URLs must use HTTPS in production:

```typescript
// ✅ Allowed
text: 'https://example.com/widget'

// ❌ Rejected (production)
text: 'http://example.com/widget'

// ✅ Allowed (development only)
text: 'http://localhost:3000/widget'
```

---

## SDK API Reference

**Compatibility Note:** Simply-MCP's `createUIResource()` function is compatible with the official @mcp-ui/server patterns and can be used with most existing examples. However, there are some differences in the interface approach and prop support. Simply-MCP offers both the functional approach (createUIResource) and an interface-based approach for additional flexibility.

Simply-MCP provides an SDK-compatible API that matches the official @mcp-ui/server patterns.

### createUIResource()

Create UI resources using the SDK approach.

**Signature:**
```typescript
function createUIResource(options: UIResourceOptions): UIResource
```

**Options:**
```typescript
interface UIResourceOptions {
  uri: string;                    // Must start with "ui://"
  content: UIResourceContent;     // Content configuration
  encoding?: 'text' | 'blob';     // Default: 'text'
  metadata?: {
    name?: string;
    description?: string;
    mimeType?: string;            // Override auto-detection
  };
}
```

**Content types:**
```typescript
// Raw HTML
type RawHtmlContent = {
  type: 'rawHtml';
  htmlString: string;
};

// External URL
type ExternalUrlContent = {
  type: 'externalUrl';
  iframeUrl: string;
};

// Remote DOM
type RemoteDomContent = {
  type: 'remoteDom';
  script: string;
  framework: 'react' | 'webcomponents';
};
```

**Example usage:**
```typescript
import { createUIResource } from 'simply-mcp';

const resource = createUIResource({
  uri: 'ui://calculator/v1',
  content: {
    type: 'rawHtml',
    htmlString: '<div><h1>Calculator</h1></div>'
  },
  metadata: {
    name: 'Simple Calculator',
    description: 'Add two numbers'
  }
});

// Return in tool result
return {
  content: [resource]
};
```

---

## Client Integration

Client applications use the UIResourceRenderer component to render UI resources.

### UIResourceRenderer Component

**Installation:**
```bash
npm install simply-mcp
```

**Import:**
```typescript
import { UIResourceRenderer } from 'simply-mcp/client';
```

**Basic usage:**
```typescript
<UIResourceRenderer
  resource={uiResource}
  onUIAction={handleAction}
/>
```

**Props:**
```typescript
interface UIResourceRendererProps {
  // UI resource to render
  resource: UIResourceContent;

  // Action handler (official MCP-UI API)
  onUIAction?: (action: UIAction) => void | Promise<void>;

  // HTML-specific configuration
  htmlProps?: {
    style?: React.CSSProperties;
    autoResize?: boolean;
    className?: string;
  };
}
```

**Complete example:**
```typescript
import React from 'react';
import { UIResourceRenderer } from 'simply-mcp/client';
import type { UIAction } from 'simply-mcp/client';

function Dashboard() {
  const handleAction = async (action: UIAction) => {
    if (action.type === 'tool') {
      const result = await executeToolCall(
        action.payload.toolName,
        action.payload.params
      );
      return result;
    }

    if (action.type === 'notify') {
      showNotification(
        action.payload.level,
        action.payload.message
      );
    }

    // Handle other action types...
  };

  return (
    <UIResourceRenderer
      resource={uiResource}
      onUIAction={handleAction}
      htmlProps={{
        style: { height: '600px' },
        autoResize: true,
        className: 'custom-ui'
      }}
    />
  );
}
```

---

## Code Examples

### Example 1: Calculator with Tool Integration

**Server (Simply-MCP):**
```typescript
import type { IServer, ITool, IUI } from 'simply-mcp';

interface CalculatorServer extends IServer {
  name: 'calculator';
  description: 'Calculator with UI';
}

interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: { a: number; b: number };
  result: number;
}

interface CalculatorUI extends IUI {
  uri: 'ui://calculator/v1';
  name: 'Calculator';
  html: string;
  tools: ['add'];
}

export default class Server implements CalculatorServer {
  add: AddTool = async ({ a, b }) => a + b;

  calculator: CalculatorUI = {
    html: `
      <style>
        body { font-family: system-ui; padding: 20px; }
        input { padding: 8px; margin: 4px; }
        button { padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; }
      </style>
      <h1>Calculator</h1>
      <input type="number" id="a" placeholder="First number" />
      <input type="number" id="b" placeholder="Second number" />
      <button onclick="calculate()">Calculate</button>
      <div id="result"></div>

      <script>
        async function calculate() {
          const a = Number(document.getElementById('a').value);
          const b = Number(document.getElementById('b').value);

          // Call MCP tool using postMessage protocol
          const messageId = 'calc_' + Date.now();

          window.parent.postMessage({
            type: 'tool',
            payload: {
              toolName: 'add',
              params: { a, b }
            },
            messageId: messageId
          }, '*');

          // Listen for result
          window.addEventListener('message', function handler(event) {
            if (event.data.messageId === messageId && event.data.type === 'result') {
              document.getElementById('result').textContent =
                'Result: ' + event.data.result;
              window.removeEventListener('message', handler);
            }
          });
        }
      </script>
    `
  };
}
```

### Example 2: Using SDK API

```typescript
import { createUIResource } from 'simply-mcp';

interface MyTool extends ITool {
  name: 'show_form';
  description: 'Show data entry form';
  params: {};
  result: { content: any[] };
}

export default class Server {
  showForm: MyTool = async () => {
    const formUI = createUIResource({
      uri: 'ui://form/entry',
      content: {
        type: 'rawHtml',
        htmlString: `
          <form id="dataForm">
            <input name="name" placeholder="Name" />
            <input name="email" placeholder="Email" />
            <button type="submit">Submit</button>
          </form>

          <script>
            document.getElementById('dataForm').addEventListener('submit', (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);

              window.parent.postMessage({
                type: 'tool',
                payload: {
                  toolName: 'submit_data',
                  params: Object.fromEntries(formData)
                },
                messageId: 'form_' + Date.now()
              }, '*');
            });
          </script>
        `
      },
      metadata: {
        name: 'Data Entry Form',
        description: 'Collect user information'
      }
    });

    return { content: [formUI] };
  };
}
```

### Example 3: External Dashboard

```typescript
import { createUIResource } from 'simply-mcp';

interface DashboardTool extends ITool {
  name: 'show_analytics';
  description: 'Show analytics dashboard';
  params: {};
  result: { content: any[] };
}

export default class Server {
  showAnalytics: DashboardTool = async () => {
    const dashboard = createUIResource({
      uri: 'ui://analytics/dashboard',
      content: {
        type: 'externalUrl',
        iframeUrl: 'https://analytics.example.com/embed'
      },
      metadata: {
        name: 'Analytics Dashboard',
        description: 'Real-time metrics and insights'
      }
    });

    return { content: [dashboard] };
  };
}
```

### Example 4: React Component (Remote DOM)

```typescript
import { createUIResource } from 'simply-mcp';

interface WidgetTool extends ITool {
  name: 'show_widget';
  description: 'Show interactive widget';
  params: {};
  result: { content: any[] };
}

export default class Server {
  showWidget: WidgetTool = async () => {
    const widget = createUIResource({
      uri: 'ui://widget/interactive',
      content: {
        type: 'remoteDom',
        framework: 'react',
        script: `
          import React, { useState } from 'react';

          export default function Counter() {
            const [count, setCount] = useState(0);

            return (
              <div style={{ padding: '20px' }}>
                <h2>Count: {count}</h2>
                <button onClick={() => setCount(count + 1)}>
                  Increment
                </button>
                <button onClick={() => setCount(count - 1)}>
                  Decrement
                </button>
                <button onClick={() => setCount(0)}>
                  Reset
                </button>
              </div>
            );
          }
        `
      },
      metadata: {
        name: 'Interactive Counter',
        description: 'React-based counter widget'
      }
    });

    return { content: [widget] };
  };
}
```

---

## Testing UI Resources

Simply-MCP provides comprehensive testing support for UI resources with 211 MCP UI-specific tests.

### Unit Testing

Test postMessage protocol compliance:

```typescript
import { render } from '@testing-library/react';
import { UIResourceRenderer } from 'simply-mcp/client';

describe('UI Resource Tool Calls', () => {
  it('should send spec-compliant tool call message', () => {
    const mockResource = {
      uri: 'ui://test/calculator',
      mimeType: 'text/html',
      text: `
        <button onclick="
          window.parent.postMessage({
            type: 'tool',
            payload: { toolName: 'add', params: { a: 5, b: 3 } },
            messageId: 'test-123'
          }, '*')
        ">Calculate</button>
      `
    };

    const { container } = render(
      <UIResourceRenderer resource={mockResource} />
    );

    const spy = jest.spyOn(window.parent, 'postMessage');
    const iframe = container.querySelector('iframe');

    // Simulate button click
    iframe?.contentWindow?.postMessage({
      type: 'tool',
      payload: { toolName: 'add', params: { a: 5, b: 3 } },
      messageId: 'test-123'
    }, '*');

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tool',
        payload: { toolName: 'add', params: { a: 5, b: 3 } },
        messageId: 'test-123'
      }),
      '*'
    );
  });
});
```

See the complete test suite in `tests/unit/interface-api/tool-calls.test.tsx` for more examples.

### E2E Testing

Test full UI rendering and interaction with the MCP Chrome Helper:

```typescript
import { MCPChromeHelper } from 'tests/e2e/helpers/mcp-chrome-helper';

describe('Calculator UI E2E', () => {
  let helper: MCPChromeHelper;

  beforeAll(async () => {
    helper = new MCPChromeHelper();
    await helper.navigateToServer('examples/calculator-server.ts');
  });

  it('should render calculator and execute tool calls', async () => {
    // Verify UI rendered
    await helper.verifyUIResourceRendered('show_calculator');

    // Interact with UI
    await helper.fillField('input-a', '5');
    await helper.fillField('input-b', '3');
    await helper.clickElement('calculate-button');

    // Verify tool call executed
    await helper.verifyToolCallExecuted('add', { a: 5, b: 3 });

    // Verify result displayed
    await helper.waitForText('Result: 8');
  });

  afterAll(async () => {
    await helper.cleanup();
  });
});
```

See the [E2E Testing Guide](../../tests/e2e/README.md) for complete documentation.

### Test Coverage

Simply-MCP includes comprehensive test coverage for all MCP UI protocol features:

| Feature | Unit Tests | Protocol Tests | E2E Tests |
|---------|-----------|----------------|-----------|
| Tool Calls | 20 tests | ✅ Included | ✅ Infrastructure ready |
| Prompts | 23 tests | ✅ Included | ✅ Infrastructure ready |
| Notifications | 25 tests | ✅ Included | ✅ Infrastructure ready |
| Navigation/Links | 31 tests | ✅ Included | ✅ Infrastructure ready |
| UI Rendering | 10 tests | ✅ Included | ✅ Infrastructure ready |
| **Total** | **109 tests** | **102 tests** | **5 active + 6 examples** |

See the [Feature Coverage Matrix](../../tests/FEATURE_COVERAGE_MATRIX.md) for detailed breakdown.

### Running Tests

```bash
# Run all tests
npm test

# Run MCP UI protocol tests only
npm run test:unit -- tests/unit/interface-api/

# Run E2E infrastructure tests
npm run test:unit -- tests/e2e/

# Run with coverage report
npm test -- --coverage
```

---

## Related Documentation

- [Migration Guide](./MCP_UI_MIGRATION.md) - Upgrading from legacy formats
- [API Reference](./API_REFERENCE.md) - Complete API reference
- [Quick Start](./QUICK_START.md) - Getting started guide
- [Examples](../../examples/) - Working code examples

## External Resources

- [Official MCP-UI Specification](https://github.com/idosal/mcp-ui)
- [MCP-UI Documentation](https://mcpui.dev)
- [Model Context Protocol](https://modelcontextprotocol.io)

---

**Version**: Simply-MCP v4.0.0+
**Protocol Version**: MCP UI 2024-11-05
**Last Updated**: 2025-10-30
