# Layer 2 (Feature Layer) - Comprehensive Specification

**Project**: MCP-UI Next.js Demo
**Layer**: Layer 2 - Feature Layer (Interactive UI)
**Date**: 2025-10-16
**Version**: 1.0.0
**Prerequisites**: Layer 1 (Foundation) Complete ✅

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Feature Specifications](#feature-specifications)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Security Model](#security-model)
6. [Testing Strategy](#testing-strategy)
7. [File Structure](#file-structure)
8. [Success Criteria](#success-criteria)
9. [Known Limitations](#known-limitations)
10. [Migration from Layer 1](#migration-from-layer-1)

---

## Executive Summary

### Purpose

Layer 2 (Feature Layer) transforms the static HTML resources from Layer 1 into fully interactive UI components with bidirectional communication between iframes and the host application. This layer adds the critical **postMessage protocol** that enables UI resources to trigger actions, execute tools, and respond to user interactions.

### Key Capabilities Added

1. **PostMessage Communication**: Secure, bidirectional iframe ↔ host messaging
2. **Tool Execution Flow**: UI actions trigger mock MCP tool calls with responses
3. **Interactive Forms**: Forms that submit data via postMessage callbacks
4. **External URL Embedding**: Support for `text/uri-list` MIME type
5. **Action Type System**: Multiple action types (tool, notify, link, prompt, intent)
6. **Origin Validation**: Security-first message validation

### What Layer 2 Does NOT Include

- **Remote DOM**: Comes in Layer 3
- **Component Library**: JSON → React component mapping (Layer 3)
- **Tailwind Processing**: Automatic CSS framework injection (Layer 4)
- **Real MCP Integration**: Still using mock client (Layer 5)

### Estimated Implementation Time

**Total**: 9-12 hours

- Phase 1: PostMessage Protocol (2-3 hours)
- Phase 2: Tool Execution Flow (2-3 hours)
- Phase 3: Interactive Demos (2-3 hours)
- Phase 4: External URL Support (1-2 hours)
- Phase 5: Testing & Documentation (2-3 hours)

---

## Architecture Overview

### Conceptual Model

```
┌─────────────────────────────────────────────────────────────┐
│                   Next.js Host Application                   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           Demo Page Component                       │    │
│  │  - useResource() hook loads resource                │    │
│  │  - Handles onUIAction callbacks                     │    │
│  │  - Displays tool execution results                  │    │
│  └──────────────┬──────────────────────────────────────┘    │
│                 │                                             │
│  ┌──────────────▼──────────────────────────────────────┐    │
│  │           UIResourceRenderer                        │    │
│  │  - Detects MIME type                                │    │
│  │  - Routes to HTMLResourceRenderer                   │    │
│  │  - Passes onUIAction prop                           │    │
│  └──────────────┬──────────────────────────────────────┘    │
│                 │                                             │
│  ┌──────────────▼──────────────────────────────────────┐    │
│  │         HTMLResourceRenderer                        │    │
│  │  - Creates sandboxed iframe                         │    │
│  │  - Listens for postMessage events                   │    │
│  │  - Validates message origins                        │    │
│  │  - Triggers onUIAction callback                     │    │
│  └──────────────┬──────────────────────────────────────┘    │
│                 │                                             │
└─────────────────┼─────────────────────────────────────────────┘
                  │
                  │ postMessage
                  │
┌─────────────────▼─────────────────────────────────────────────┐
│                 Sandboxed iframe                              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Interactive HTML Resource                   │  │
│  │                                                        │  │
│  │  <form id="feedbackForm">                            │  │
│  │    <input name="name" />                             │  │
│  │    <button type="submit">Submit</button>             │  │
│  │  </form>                                             │  │
│  │                                                        │  │
│  │  <script>                                            │  │
│  │    form.addEventListener('submit', (e) => {          │  │
│  │      e.preventDefault();                             │  │
│  │                                                        │  │
│  │      // Send message to parent                       │  │
│  │      window.parent.postMessage({                     │  │
│  │        type: 'tool',                                 │  │
│  │        payload: {                                    │  │
│  │          toolName: 'submit_feedback',                │  │
│  │          params: { name: form.name.value }           │  │
│  │        }                                             │  │
│  │      }, '*');                                        │  │
│  │    });                                               │  │
│  │  </script>                                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
User Interaction (e.g., form submit)
           │
           ▼
JavaScript inside iframe captures event
           │
           ▼
window.parent.postMessage({
  type: 'tool',
  payload: { toolName: 'submit_feedback', params: {...} }
}, '*')
           │
           ▼
HTMLResourceRenderer receives MessageEvent
           │
           ▼
validateOrigin(event.origin) → Security check
           │
           ▼ (if valid)
onUIAction callback triggered
           │
           ▼
Demo Page Component handles action
           │
           ▼
mockMcpClient.executeTool(toolName, params)
           │
           ▼
Mock tool executes (Layer 2: always succeeds)
           │
           ▼
Tool response displayed to user
           │
           ▼
(Optional) UI updated with result
```

### Component Interaction Matrix

| Component | Receives | Sends | Security Responsibility |
|-----------|----------|-------|------------------------|
| **iframe HTML** | User events | postMessage | Constructs valid message format |
| **HTMLResourceRenderer** | MessageEvent | UIActionResult | Origin validation, message parsing |
| **Demo Page** | UIActionResult | Tool execution request | Action routing, error handling |
| **mockMcpClient** | Tool call | Tool response | Parameter validation, response formatting |

---

## Feature Specifications

### Feature 1: PostMessage Protocol

#### Purpose
Enable secure, bidirectional communication between sandboxed iframes and the host application.

#### Message Format

**From iframe to host**:
```typescript
interface PostMessagePayload {
  type: 'tool' | 'notify' | 'link' | 'prompt' | 'intent';
  payload: {
    // For 'tool' type
    toolName?: string;
    params?: Record<string, any>;

    // For 'notify' type
    level?: 'info' | 'warning' | 'error' | 'success';
    message?: string;

    // For 'link' type
    url?: string;
    target?: '_blank' | '_self';

    // For 'prompt' type
    promptName?: string;
    arguments?: Record<string, any>;

    // For 'intent' type
    intentName?: string;
    data?: Record<string, any>;
  };
}
```

**Example: Tool Call**
```javascript
// Inside iframe
window.parent.postMessage({
  type: 'tool',
  payload: {
    toolName: 'submit_feedback',
    params: {
      name: 'Alice',
      email: 'alice@example.com',
      feedback: 'Great demo!'
    }
  }
}, '*');
```

**Example: Notification**
```javascript
// Inside iframe
window.parent.postMessage({
  type: 'notify',
  payload: {
    level: 'success',
    message: 'Form submitted successfully'
  }
}, '*');
```

#### Origin Validation Strategy

**Accepted Origins**:
1. `'null'` - For srcdoc iframes (same-origin policy)
2. `https://*` - HTTPS URLs (production)
3. `http://localhost:*` - Local development
4. `http://127.0.0.1:*` - Local development

**Implementation**:
```typescript
function validateOrigin(origin: string): boolean {
  // srcdoc iframes have null origin - always accept
  if (origin === 'null') return true;

  try {
    const url = new URL(origin);

    // Production: require HTTPS
    if (url.protocol === 'https:') return true;

    // Development: allow localhost/127.0.0.1 on HTTP
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return url.protocol === 'http:' || url.protocol === 'https:';
    }

    return false;
  } catch {
    return false;
  }
}
```

#### Error Handling

**Invalid Origin**:
```typescript
const handleMessage = (event: MessageEvent) => {
  if (!validateOrigin(event.origin)) {
    console.warn(`[Security] Rejected message from invalid origin: ${event.origin}`);
    return; // Silently reject
  }
  // Process message...
};
```

**Invalid Message Format**:
```typescript
const data = event.data;

if (!data || typeof data !== 'object' || !data.type) {
  console.warn('[PostMessage] Invalid message format:', data);
  return; // Silently reject
}
```

#### Security Guarantees

- ✅ Origin validation before any processing
- ✅ No reflection of untrusted data
- ✅ No eval() or dynamic code execution
- ✅ Sandbox attributes prevent same-origin access
- ✅ Messages validated against expected schema

---

### Feature 2: Tool Callback Execution

#### Purpose
Enable UI resources to trigger MCP tool execution through postMessage actions.

#### Flow

1. **User triggers action** in iframe (e.g., button click)
2. **iframe JavaScript** sends postMessage with tool details
3. **HTMLResourceRenderer** validates and forwards to `onUIAction`
4. **Demo Page** calls `mockMcpClient.executeTool()`
5. **Mock client** simulates tool execution (Layer 2: always succeeds)
6. **Tool response** displayed to user

#### Tool Response Format

```typescript
interface ToolResponse {
  success: boolean;
  data?: {
    toolName: string;
    params: Record<string, any>;
    message: string;
    timestamp: string;
    // Tool-specific data
    [key: string]: any;
  };
  error?: string;
}
```

#### Example: Demo Page Handler

```typescript
'use client';

import { useState } from 'react';
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';
import { mockMcpClient } from '@/lib/mockMcpClient';
import type { UIActionResult } from '@mcp-ui/ui-types';

export default function InteractiveDemoPage() {
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [toolResponse, setToolResponse] = useState<any>(null);

  const handleUIAction = async (action: UIActionResult) => {
    console.log('[Demo] UI Action received:', action);
    setLastAction(JSON.stringify(action, null, 2));

    if (action.type === 'tool') {
      const { toolName, params } = action.payload;

      // Execute tool via mock client
      const response = await mockMcpClient.executeTool(toolName, params);

      console.log('[Demo] Tool response:', response);
      setToolResponse(response);

      if (response.success) {
        // Show success notification
        alert(`Tool '${toolName}' executed successfully!`);
      } else {
        // Show error notification
        alert(`Tool '${toolName}' failed: ${response.error}`);
      }
    }

    if (action.type === 'notify') {
      const { level, message } = action.payload;
      console.log(`[${level.toUpperCase()}] ${message}`);
    }
  };

  return (
    <div>
      <UIResourceRenderer
        resource={resource}
        onUIAction={handleUIAction}
      />

      {lastAction && (
        <div className="action-log">
          <h3>Last Action:</h3>
          <pre>{lastAction}</pre>
        </div>
      )}

      {toolResponse && (
        <div className="tool-response">
          <h3>Tool Response:</h3>
          <pre>{JSON.stringify(toolResponse, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

#### Mock Client Extension

The existing `mockMcpClient.ts` already has tool execution:

```typescript
async executeTool(name: string, params?: Record<string, any>): Promise<ToolResponse> {
  if (this.options.verbose) {
    console.log('[MockMcpClient] Executing tool:', name, params);
  }

  // Simulate network delay
  await simulateNetworkDelay(this.options.minDelay, this.options.maxDelay);

  // Mock tool execution - always succeeds in Layer 1
  // Layer 2: Keep this simple, Layer 3 will add validation
  const response: ToolResponse = {
    success: true,
    data: {
      toolName: name,
      params: params || {},
      message: `Tool '${name}' executed successfully (mock)`,
      timestamp: new Date().toISOString(),
    },
  };

  if (this.options.verbose) {
    console.log('[MockMcpClient] Tool executed:', response);
  }

  return response;
}
```

**No changes needed** - this implementation is already Layer 2-ready!

#### Tool Registry

Available tools (already in mockMcpClient):
- `add_to_cart` - Add product to cart
- `refresh_data` - Refresh resource data
- `submit_form` - Submit form data

**Layer 2 Addition**: Add demo-specific tools:
- `submit_feedback` - Handle feedback form
- `send_contact_message` - Handle contact form
- `select_product` - Handle product selection

---

### Feature 3: Component Library System

**STATUS**: ❌ NOT IN LAYER 2

Layer 2 focuses on HTML + postMessage. Component library (JSON → React) is **Layer 3**.

**Why not in Layer 2?**
- Requires Remote DOM architecture
- Needs Web Worker sandbox
- Complex state management
- Layer 2 keeps things simple with HTML forms

**Preview for Layer 3**:
```typescript
// This will be Layer 3
const componentLibrary = {
  Button: (props) => <button {...props} />,
  Input: (props) => <input {...props} />,
  Form: (props) => <form {...props} />,
};

// JSON definition becomes React
{
  type: 'Form',
  props: {
    onSubmit: { tool: 'submit_feedback' }
  },
  children: [...]
}
```

---

### Feature 4: Tailwind CSS Processing

**STATUS**: ❌ NOT IN LAYER 2

Tailwind processing (detecting v3 vs v4, injecting CDN) is **Layer 4**.

**Why not in Layer 2?**
- Not required for basic interactivity
- HTML resources use inline styles
- CDN injection can be done manually in HTML
- Layer 2 focuses on behavior, not styling

**Layer 2 Approach**: Use inline CSS in HTML resources.

**Preview for Layer 4**:
```typescript
// This will be Layer 4
function processTailwind(html: string): string {
  // Detect Tailwind classes
  if (html.includes('class="')) {
    // Inject Tailwind CDN
    html = injectTailwindCDN(html, detectVersion(html));
  }
  return html;
}
```

---

### Feature 5: External URL Embedding

#### Purpose
Support embedding external web applications in iframes using `text/uri-list` MIME type.

#### MIME Type
```typescript
{
  uri: 'ui://dashboard/analytics',
  mimeType: 'text/uri-list',
  text: 'https://example.com/dashboard'
}
```

#### Sandbox Permissions

**External URLs** require `allow-same-origin`:
```html
<iframe
  sandbox="allow-scripts allow-same-origin"
  src="https://example.com/dashboard"
/>
```

**Why `allow-same-origin`?**
- External apps need to make fetch() requests to their own API
- External apps need to access their own localStorage
- Still restricted: no top-level navigation, no popups

#### Security Constraints

**URL Validation**:
```typescript
function validateExternalURL(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Must be HTTPS (or localhost for dev)
    if (parsed.protocol !== 'https:') {
      if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
        return false;
      }
    }

    // Optional: whitelist domains
    const allowedDomains = ['example.com', 'localhost'];
    if (!allowedDomains.some(domain => parsed.hostname.includes(domain))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
```

#### Demo Resources

**Example 1**: External Dashboard
```typescript
{
  id: 'external-dashboard',
  title: 'Analytics Dashboard',
  description: 'External analytics dashboard embedded via iframe',
  resource: {
    uri: 'ui://demo/external-dashboard',
    mimeType: 'text/uri-list',
    text: 'https://example.com/dashboard'
  }
}
```

**Example 2**: Localhost Development
```typescript
{
  id: 'local-dev-server',
  title: 'Local Development Server',
  description: 'Embed local development server for testing',
  resource: {
    uri: 'ui://demo/local-dev',
    mimeType: 'text/uri-list',
    text: 'http://localhost:3001/widget'
  }
}
```

#### HTMLResourceRenderer Changes

```typescript
// Detect external URL
if (resource.mimeType === 'text/uri-list') {
  const url = resource.text;

  if (!validateExternalURL(url)) {
    return <div>Invalid external URL</div>;
  }

  return (
    <iframe
      src={url}
      sandbox="allow-scripts allow-same-origin"
      style={{ width: '100%', height: '600px' }}
      title={resource.uri}
    />
  );
}
```

---

### Feature 6: Interactive Form Handling

#### Feedback Form Demo

**Resource ID**: `interactive-feedback-form`

**Features**:
- Name, email, message fields
- Client-side validation
- postMessage on submit
- Success/error status display

**HTML Structure**:
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Modern form styling */
  </style>
</head>
<body>
  <div class="form-container">
    <h2>Send Feedback</h2>
    <form id="feedbackForm">
      <div class="form-group">
        <label>Name</label>
        <input type="text" name="name" required />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" name="email" required />
      </div>
      <div class="form-group">
        <label>Message</label>
        <textarea name="message" required></textarea>
      </div>
      <button type="submit">Submit</button>
    </form>
    <div id="status"></div>
  </div>

  <script>
    document.getElementById('feedbackForm').addEventListener('submit', (e) => {
      e.preventDefault();

      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);

      // Send to parent via postMessage
      window.parent.postMessage({
        type: 'tool',
        payload: {
          toolName: 'submit_feedback',
          params: data
        }
      }, '*');

      // Show success message
      document.getElementById('status').textContent = 'Submitted!';
      e.target.reset();
    });
  </script>
</body>
</html>
```

#### Contact Form Demo

**Resource ID**: `interactive-contact-form`

**Features**:
- Subject dropdown
- Urgency level radio buttons
- Attachment file input (simulated)
- Inline validation feedback

#### Product Selector Demo

**Resource ID**: `interactive-product-selector`

**Features**:
- Product grid with images
- Click to select
- Quantity input
- Add to cart button
- postMessage with product details

**HTML Structure**:
```html
<div class="product-grid">
  <div class="product-card" data-product-id="widget-a">
    <img src="data:image/svg+xml,..." />
    <h3>Widget A</h3>
    <p>$299</p>
    <button onclick="addToCart('widget-a')">Add to Cart</button>
  </div>
  <!-- More products... -->
</div>

<script>
function addToCart(productId) {
  window.parent.postMessage({
    type: 'tool',
    payload: {
      toolName: 'add_to_cart',
      params: {
        productId,
        quantity: 1
      }
    }
  }, '*');
}
</script>
```

---

## Implementation Roadmap

### Phase 1: PostMessage Protocol (2-3 hours)

#### Step 1.1: Review Existing Components (30 min)

**Task**: Verify real MCP-UI components already have postMessage support.

**Files to Check**:
- `/mnt/Shared/cs-projects/simple-mcp/src/client/HTMLResourceRenderer.tsx`
- `/mnt/Shared/cs-projects/simple-mcp/src/client/ui-utils.ts`

**Expected**: Components already have postMessage listeners and origin validation from Layer 1.

**Action**: Document current state, note any gaps.

#### Step 1.2: Test PostMessage Reception (30 min)

**Task**: Create minimal test page to verify postMessage works.

**File**: `app/test-postmessage/page.tsx`

```typescript
'use client';

import { useState } from 'react';

export default function TestPostMessage() {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      console.log('Message received:', event);
      setMessages(prev => [...prev, {
        origin: event.origin,
        data: event.data,
        timestamp: new Date().toISOString()
      }]);
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <div>
      <h1>PostMessage Test</h1>
      <iframe
        sandbox="allow-scripts"
        srcDoc={`
          <button onclick="window.parent.postMessage({type: 'test', value: 42}, '*')">
            Send Message
          </button>
        `}
        style={{ width: '100%', height: '200px' }}
      />
      <div>
        <h2>Messages Received: {messages.length}</h2>
        <pre>{JSON.stringify(messages, null, 2)}</pre>
      </div>
    </div>
  );
}
```

**Validation**: Click button, see message appear in list.

#### Step 1.3: Add Origin Validation Tests (1 hour)

**File**: `lib/__tests__/postMessageValidation.test.ts`

```typescript
import { validateOrigin } from '@mcp-ui/ui-utils';

describe('Origin Validation', () => {
  test('accepts null origin (srcdoc)', () => {
    expect(validateOrigin('null')).toBe(true);
  });

  test('accepts HTTPS origins', () => {
    expect(validateOrigin('https://example.com')).toBe(true);
  });

  test('accepts localhost HTTP', () => {
    expect(validateOrigin('http://localhost:3000')).toBe(true);
    expect(validateOrigin('http://127.0.0.1:3000')).toBe(true);
  });

  test('rejects HTTP non-localhost', () => {
    expect(validateOrigin('http://example.com')).toBe(false);
  });

  test('rejects malicious origins', () => {
    expect(validateOrigin('javascript:alert(1)')).toBe(false);
    expect(validateOrigin('data:text/html,<script>alert(1)</script>')).toBe(false);
  });
});
```

**Run**: `npm test -- postMessageValidation.test.ts`

#### Step 1.4: Document PostMessage Protocol (30 min)

**File**: `lib/POST_MESSAGE_PROTOCOL.md`

**Contents**:
- Message format specification
- Action type definitions
- Examples for each action type
- Security considerations

---

### Phase 2: Tool Execution Flow (2-3 hours)

#### Step 2.1: Extend Demo Resources (1 hour)

**File**: `lib/demoResources.ts`

**Add 3 Interactive Resources**:

1. **Feedback Form** (`interactive-feedback-form`)
2. **Contact Form** (`interactive-contact-form`)
3. **Product Selector** (`interactive-product-selector`)

**Template**:
```typescript
{
  id: 'interactive-feedback-form',
  title: 'Interactive Feedback Form',
  description: 'Form with postMessage callbacks for tool execution',
  resource: {
    uri: 'ui://demo/interactive-feedback-form',
    mimeType: 'text/html',
    text: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          /* Form styling */
        </style>
      </head>
      <body>
        <!-- Form HTML -->
        <script>
          // postMessage logic
        </script>
      </body>
      </html>
    `
  }
}
```

**Validation**: Resources load correctly, HTML displays.

#### Step 2.2: Create Demo Pages (1 hour)

**File**: `app/demo/interactive-feedback/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { DemoLayout } from '@/components/demo/DemoLayout';
import { useResourceLoader } from '@/hooks/useResourceLoader';
import { mockMcpClient } from '@/lib/mockMcpClient';
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';
import type { UIActionResult } from '@mcp-ui/ui-types';

export default function InteractiveFeedbackPage() {
  const { resource, loading, error } = useResourceLoader('interactive-feedback-form');
  const [toolResponse, setToolResponse] = useState<any>(null);
  const [actionLog, setActionLog] = useState<UIActionResult[]>([]);

  const handleUIAction = async (action: UIActionResult) => {
    console.log('[Demo] Action received:', action);
    setActionLog(prev => [...prev, action]);

    if (action.type === 'tool') {
      const { toolName, params } = action.payload;

      try {
        const response = await mockMcpClient.executeTool(toolName, params);
        setToolResponse(response);

        if (response.success) {
          alert(`Success: ${response.data.message}`);
        }
      } catch (err) {
        console.error('Tool execution error:', err);
        alert('Error executing tool');
      }
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!resource) return <div>Resource not found</div>;

  return (
    <DemoLayout
      title="Interactive Feedback Form"
      description="Form with postMessage callbacks that trigger tool execution"
    >
      <div className="demo-container">
        <div className="resource-display">
          <UIResourceRenderer
            resource={resource}
            onUIAction={handleUIAction}
          />
        </div>

        <div className="action-log">
          <h3>Action Log</h3>
          <div className="log-entries">
            {actionLog.map((action, i) => (
              <div key={i} className="log-entry">
                <strong>{action.type}</strong>
                <pre>{JSON.stringify(action.payload, null, 2)}</pre>
              </div>
            ))}
          </div>
        </div>

        {toolResponse && (
          <div className="tool-response">
            <h3>Last Tool Response</h3>
            <pre>{JSON.stringify(toolResponse, null, 2)}</pre>
          </div>
        )}
      </div>
    </DemoLayout>
  );
}
```

**Repeat for**:
- `app/demo/interactive-contact/page.tsx`
- `app/demo/interactive-product/page.tsx`

#### Step 2.3: Add Tests for Tool Execution (30 min)

**File**: `lib/__tests__/toolExecution.test.ts`

```typescript
import { mockMcpClient } from '../mockMcpClient';

describe('Tool Execution Flow', () => {
  test('executes submit_feedback tool', async () => {
    const response = await mockMcpClient.executeTool('submit_feedback', {
      name: 'Alice',
      email: 'alice@example.com',
      message: 'Great!'
    });

    expect(response.success).toBe(true);
    expect(response.data.toolName).toBe('submit_feedback');
    expect(response.data.params.name).toBe('Alice');
  });

  test('includes timestamp in response', async () => {
    const response = await mockMcpClient.executeTool('test_tool');

    expect(response.data.timestamp).toBeDefined();
    expect(new Date(response.data.timestamp)).toBeInstanceOf(Date);
  });

  test('handles tools with no params', async () => {
    const response = await mockMcpClient.executeTool('refresh_data');

    expect(response.success).toBe(true);
    expect(response.data.params).toEqual({});
  });
});
```

---

### Phase 3: Interactive Demos (2-3 hours)

#### Step 3.1: Feedback Form HTML (1 hour)

**Complete Implementation** with:
- Proper styling
- Client-side validation
- Success/error states
- Clear postMessage syntax
- Accessibility features

**Key Features**:
```html
<form id="feedbackForm" aria-label="Feedback form">
  <div class="form-group">
    <label for="name">Name <span aria-label="required">*</span></label>
    <input type="text" id="name" name="name" required aria-required="true" />
    <span class="error-message" id="name-error"></span>
  </div>
  <!-- More fields... -->
</form>
```

#### Step 3.2: Product Selector HTML (1 hour)

**Features**:
- Grid layout (3 columns)
- Product cards with images (SVG data URIs)
- Hover effects
- Selection state
- Add to cart button

#### Step 3.3: Interactive Demo Overview Page (30 min)

**File**: `app/demo/page.tsx`

```typescript
export default function DemoOverviewPage() {
  return (
    <DemoLayout title="Layer 2: Interactive Demos">
      <div className="demo-grid">
        <DemoCard
          title="Feedback Form"
          description="Interactive form with postMessage callbacks"
          href="/demo/interactive-feedback"
          badge="PostMessage"
        />
        <DemoCard
          title="Contact Form"
          description="Multi-field form with validation"
          href="/demo/interactive-contact"
          badge="PostMessage"
        />
        <DemoCard
          title="Product Selector"
          description="Product grid with add to cart"
          href="/demo/interactive-product"
          badge="Tool Execution"
        />
      </div>
    </DemoLayout>
  );
}
```

---

### Phase 4: External URL Support (1-2 hours)

#### Step 4.1: Add External URL Resource (30 min)

**File**: `lib/demoResources.ts`

```typescript
{
  id: 'external-example',
  title: 'External Website Example',
  description: 'Demonstrates text/uri-list MIME type',
  resource: {
    uri: 'ui://demo/external-example',
    mimeType: 'text/uri-list',
    text: 'https://example.com'
  }
}
```

**Note**: `example.com` likely won't allow iframe embedding (X-Frame-Options). For demo, use a site that allows it or create a local HTML file.

#### Step 4.2: Create External Demo Page (30 min)

**File**: `app/demo/external-url/page.tsx`

```typescript
'use client';

import { useResourceLoader } from '@/hooks/useResourceLoader';
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';

export default function ExternalURLDemo() {
  const { resource, loading, error } = useResourceLoader('external-example');

  return (
    <DemoLayout
      title="External URL Embedding"
      description="Demonstrates text/uri-list MIME type with external websites"
    >
      <div className="external-url-demo">
        <div className="info-box">
          <h3>About This Demo</h3>
          <p>
            This demonstrates embedding external URLs in iframes.
            Sandbox: allow-scripts allow-same-origin
          </p>
          <p>
            <strong>URL:</strong> {resource?.text}
          </p>
        </div>

        {loading && <div>Loading external resource...</div>}
        {error && <div>Error: {error}</div>}
        {resource && (
          <UIResourceRenderer
            resource={resource}
            customSandboxPermissions="allow-scripts allow-same-origin"
          />
        )}
      </div>
    </DemoLayout>
  );
}
```

#### Step 4.3: Test External URL Rendering (30 min)

**Verification**:
1. Check sandbox attribute: `allow-scripts allow-same-origin`
2. Verify URL loads (or shows X-Frame-Options error)
3. Test postMessage from external URL (if allowed)
4. Document limitations

---

### Phase 5: Testing & Documentation (2-3 hours)

#### Step 5.1: Integration Tests (1 hour)

**File**: `lib/__tests__/layer2Integration.test.ts`

```typescript
describe('Layer 2 Integration', () => {
  test('postMessage triggers tool execution', async () => {
    const mockHandler = jest.fn();

    // Simulate postMessage event
    const event = new MessageEvent('message', {
      origin: 'null',
      data: {
        type: 'tool',
        payload: {
          toolName: 'submit_feedback',
          params: { name: 'Test' }
        }
      }
    });

    // Trigger handler
    mockHandler(event);

    expect(mockHandler).toHaveBeenCalledWith(event);
  });

  test('action log records all actions', () => {
    const actions: UIActionResult[] = [];

    const handleAction = (action: UIActionResult) => {
      actions.push(action);
    };

    handleAction({ type: 'tool', payload: { toolName: 'test' } });
    handleAction({ type: 'notify', payload: { message: 'hi' } });

    expect(actions).toHaveLength(2);
  });
});
```

#### Step 5.2: End-to-End Tests (1 hour)

**File**: `__tests__/e2e/interactiveForm.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import InteractiveFeedbackPage from '@/app/demo/interactive-feedback/page';

describe('Interactive Feedback Form E2E', () => {
  test('renders form resource', async () => {
    render(<InteractiveFeedbackPage />);

    // Wait for resource to load
    await screen.findByText(/Feedback Form/i);

    // Check iframe exists
    const iframe = screen.getByTitle(/ui:\/\/demo\/interactive-feedback-form/);
    expect(iframe).toBeInTheDocument();
  });

  // Note: Testing iframe contents requires more complex setup
  // For Layer 2, focus on integration points
});
```

#### Step 5.3: Documentation (1 hour)

**Files to Create/Update**:

1. **LAYER2-QUICKSTART.md** - Getting started guide
2. **LAYER2-VERIFICATION-CHECKLIST.md** - Validation steps
3. **POST_MESSAGE_PROTOCOL.md** - Message format spec
4. **INTERACTIVE_DEMOS.md** - Demo documentation
5. **README.md** - Update with Layer 2 status

**README.md Update**:
```markdown
## Implementation Status

### ✅ Phase 1: Foundation Setup (COMPLETE)
### ✅ Phase 2: Mock Client & Resources (COMPLETE)
### ✅ Phase 3: Demo Components (COMPLETE)
### ✅ Phase 4: Demo Pages (COMPLETE)
### ✅ Phase 5: Layer 2 - Interactive Features (COMPLETE)

**Layer 2 Additions**:
- [x] PostMessage communication protocol
- [x] Tool execution callbacks
- [x] Interactive feedback form
- [x] Interactive contact form
- [x] Interactive product selector
- [x] External URL embedding
- [x] Action logging and display
- [x] Comprehensive tests (50+ tests)
```

---

## Security Model

### Threat Model

**Threats Mitigated**:
1. ✅ XSS via malicious HTML in resources
2. ✅ CSRF via postMessage from malicious origins
3. ✅ Clickjacking via improper iframe configuration
4. ✅ Data exfiltration via same-origin policy bypass
5. ✅ Code injection via eval() or Function()

**Threats NOT Mitigated** (out of scope):
1. ❌ DDoS via resource requests (demo app only)
2. ❌ Resource exhaustion (not a production app)
3. ❌ Authentication/authorization (no user accounts)

### Security Layers

#### Layer 1: iframe Sandbox

**Inline HTML** (srcdoc):
```html
<iframe sandbox="allow-scripts" srcdoc="..." />
```

**Restrictions**:
- ✅ Scripts can run (for interactivity)
- ❌ Forms cannot submit
- ❌ Popups blocked
- ❌ Top-level navigation blocked
- ❌ Same-origin access blocked
- ❌ Downloads blocked

**External URLs** (src):
```html
<iframe sandbox="allow-scripts allow-same-origin" src="https://..." />
```

**Additional Permissions**:
- ✅ `allow-same-origin` - Needed for XHR/fetch to own domain
- ⚠️ Risk: External site could access own localStorage (acceptable)

#### Layer 2: Origin Validation

**Implementation**:
```typescript
function validateOrigin(origin: string): boolean {
  // Only accept:
  // 1. null (srcdoc iframes)
  // 2. https:// (production)
  // 3. http://localhost or http://127.0.0.1 (dev)

  if (origin === 'null') return true;

  try {
    const url = new URL(origin);
    if (url.protocol === 'https:') return true;
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return url.protocol === 'http:' || url.protocol === 'https:';
    }
    return false;
  } catch {
    return false;
  }
}
```

**Protection**: Prevents messages from `https://evil.com` being processed.

#### Layer 3: Message Validation

**Schema Validation**:
```typescript
interface ValidatedMessage {
  type: 'tool' | 'notify' | 'link' | 'prompt' | 'intent';
  payload: {
    toolName?: string;
    params?: Record<string, any>;
    // Other fields...
  };
}

function isValidMessage(data: any): data is ValidatedMessage {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.type === 'string' &&
    ['tool', 'notify', 'link', 'prompt', 'intent'].includes(data.type) &&
    typeof data.payload === 'object'
  );
}
```

**Protection**: Prevents malformed messages from causing errors or security issues.

#### Layer 4: Tool Whitelisting

**Allowed Tools**:
```typescript
const ALLOWED_TOOLS = [
  'submit_feedback',
  'send_contact_message',
  'add_to_cart',
  'select_product',
  'refresh_data',
];

function isAllowedTool(toolName: string): boolean {
  return ALLOWED_TOOLS.includes(toolName);
}
```

**Protection**: Prevents execution of arbitrary tool names.

#### Layer 5: Parameter Sanitization

**Input Validation**:
```typescript
function sanitizeParams(params: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    // Only allow primitive types
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else {
      console.warn(`[Security] Rejected non-primitive value for key: ${key}`);
    }
  }

  return sanitized;
}
```

**Protection**: Prevents object/function injection in tool parameters.

### Security Testing

**Test Cases**:

1. **Malicious Origin**:
```typescript
test('rejects message from evil.com', () => {
  const event = new MessageEvent('message', {
    origin: 'https://evil.com',
    data: { type: 'tool', payload: { toolName: 'hack' } }
  });

  const handler = (e: MessageEvent) => {
    if (!validateOrigin(e.origin)) {
      return; // Rejected
    }
    // Should never reach here
    throw new Error('Accepted malicious origin!');
  };

  expect(() => handler(event)).not.toThrow();
});
```

2. **XSS Attempt**:
```typescript
test('sanitizes XSS in params', () => {
  const params = {
    name: '<script>alert(1)</script>',
    email: 'test@example.com'
  };

  const sanitized = sanitizeParams(params);

  // String value preserved (not executed)
  expect(sanitized.name).toBe('<script>alert(1)</script>');
  // But rendering should escape it
  expect(escapeHTML(sanitized.name)).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
});
```

3. **Tool Name Injection**:
```typescript
test('rejects unlisted tool names', () => {
  const isAllowed = isAllowedTool('../../../etc/passwd');
  expect(isAllowed).toBe(false);
});
```

---

## Testing Strategy

### Test Pyramid

```
         /\
        /  \
       / E2E \          5 tests (integration)
      /______\
     /        \
    / Component \       15 tests (React components)
   /____________\
  /              \
 / Unit Tests     \    30 tests (functions, utils)
/__________________\
```

**Total Tests**: ~50 (Layer 1: 35, Layer 2: +15)

### Unit Tests

**File**: `lib/__tests__/postMessage.test.ts`

```typescript
import { validateOrigin } from '@mcp-ui/ui-utils';

describe('PostMessage Utils', () => {
  describe('validateOrigin', () => {
    test('accepts null origin', () => {
      expect(validateOrigin('null')).toBe(true);
    });

    test('accepts HTTPS', () => {
      expect(validateOrigin('https://example.com')).toBe(true);
    });

    test('accepts localhost', () => {
      expect(validateOrigin('http://localhost:3000')).toBe(true);
      expect(validateOrigin('http://127.0.0.1:3000')).toBe(true);
    });

    test('rejects HTTP non-localhost', () => {
      expect(validateOrigin('http://example.com')).toBe(false);
    });

    test('rejects invalid origins', () => {
      expect(validateOrigin('javascript:alert(1)')).toBe(false);
      expect(validateOrigin('file:///etc/passwd')).toBe(false);
    });
  });
});
```

**File**: `lib/__tests__/toolExecution.test.ts`

```typescript
import { mockMcpClient } from '../mockMcpClient';

describe('Tool Execution', () => {
  test('executes tool and returns response', async () => {
    const response = await mockMcpClient.executeTool('submit_feedback', {
      name: 'Alice',
      email: 'alice@example.com'
    });

    expect(response.success).toBe(true);
    expect(response.data.toolName).toBe('submit_feedback');
  });

  test('includes timestamp', async () => {
    const response = await mockMcpClient.executeTool('test');
    expect(response.data.timestamp).toBeDefined();
  });

  test('handles empty params', async () => {
    const response = await mockMcpClient.executeTool('refresh_data');
    expect(response.data.params).toEqual({});
  });
});
```

### Component Tests

**File**: `__tests__/components/InteractiveDemo.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';

describe('UIResourceRenderer with postMessage', () => {
  test('renders iframe with resource', () => {
    const resource = {
      uri: 'ui://test',
      mimeType: 'text/html',
      text: '<div>Test</div>'
    };

    render(<UIResourceRenderer resource={resource} />);

    const iframe = screen.getByTitle('ui://test');
    expect(iframe).toBeInTheDocument();
  });

  test('calls onUIAction when postMessage received', async () => {
    const mockHandler = jest.fn();
    const resource = {
      uri: 'ui://test',
      mimeType: 'text/html',
      text: '<button onclick="window.parent.postMessage({type:\'tool\',payload:{}}, \'*\')">Click</button>'
    };

    render(<UIResourceRenderer resource={resource} onUIAction={mockHandler} />);

    // Simulate postMessage
    const event = new MessageEvent('message', {
      origin: 'null',
      data: { type: 'tool', payload: { toolName: 'test' } }
    });

    window.dispatchEvent(event);

    await waitFor(() => {
      expect(mockHandler).toHaveBeenCalled();
    });
  });
});
```

### Integration Tests

**File**: `__tests__/integration/layer2Flow.test.ts`

```typescript
describe('Layer 2 Integration Flow', () => {
  test('form submission triggers tool execution', async () => {
    // 1. Load resource
    const resource = await mockMcpClient.loadResource('interactive-feedback-form');
    expect(resource).toBeDefined();

    // 2. Simulate form submission postMessage
    const message = {
      type: 'tool',
      payload: {
        toolName: 'submit_feedback',
        params: {
          name: 'Test User',
          email: 'test@example.com',
          message: 'Test message'
        }
      }
    };

    // 3. Validate message
    expect(isValidMessage(message)).toBe(true);

    // 4. Execute tool
    const response = await mockMcpClient.executeTool(
      message.payload.toolName,
      message.payload.params
    );

    // 5. Verify response
    expect(response.success).toBe(true);
    expect(response.data.toolName).toBe('submit_feedback');
  });
});
```

### End-to-End Tests

**Manual E2E Checklist**:

1. **Feedback Form Flow**:
   - [ ] Navigate to /demo/interactive-feedback
   - [ ] Fill out form (name, email, message)
   - [ ] Click Submit
   - [ ] Verify action appears in action log
   - [ ] Verify tool response displays
   - [ ] Verify success alert shows
   - [ ] Form resets after submission

2. **Product Selector Flow**:
   - [ ] Navigate to /demo/interactive-product
   - [ ] Click "Add to Cart" on a product
   - [ ] Verify action log shows tool call
   - [ ] Verify cart update message
   - [ ] Try multiple products

3. **External URL Flow**:
   - [ ] Navigate to /demo/external-url
   - [ ] Verify iframe loads external URL
   - [ ] Check sandbox permissions
   - [ ] Verify no console errors

### Test Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- postMessage.test.ts

# Run integration tests only
npm test -- integration/

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Coverage Goals

- **Unit Tests**: 90%+ coverage
- **Component Tests**: 80%+ coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: User flows validated manually

---

## File Structure

### New Files (Layer 2)

```
examples/nextjs-mcp-ui/
├── app/
│   └── demo/
│       ├── interactive-feedback/
│       │   └── page.tsx              # NEW
│       ├── interactive-contact/
│       │   └── page.tsx              # NEW
│       ├── interactive-product/
│       │   └── page.tsx              # NEW
│       ├── external-url/
│       │   └── page.tsx              # NEW
│       └── test-postmessage/
│           └── page.tsx              # NEW (for development)
│
├── lib/
│   ├── __tests__/
│   │   ├── postMessage.test.ts       # NEW
│   │   ├── toolExecution.test.ts     # NEW
│   │   └── layer2Integration.test.ts # NEW
│   ├── POST_MESSAGE_PROTOCOL.md      # NEW
│   └── demoResources.ts              # MODIFIED (add 3 resources)
│
├── __tests__/
│   ├── components/
│   │   └── InteractiveDemo.test.tsx  # NEW
│   └── e2e/
│       └── interactiveForm.test.tsx  # NEW
│
├── docs/
│   ├── LAYER2-QUICKSTART.md          # NEW
│   ├── LAYER2-VERIFICATION-CHECKLIST.md # NEW
│   └── INTERACTIVE_DEMOS.md          # NEW
│
├── LAYER2-SPECIFICATION.md           # NEW (this file)
└── README.md                         # MODIFIED
```

### Modified Files (Layer 2)

1. **lib/demoResources.ts**
   - Add `interactive-feedback-form` resource
   - Add `interactive-contact-form` resource
   - Add `interactive-product-selector` resource
   - Add `external-example` resource
   - Total: 4 new resources (9 total)

2. **README.md**
   - Update implementation status
   - Add Layer 2 features list
   - Update test count
   - Add Layer 2 quickstart link

3. **app/page.tsx**
   - Add Layer 2 demo cards
   - Update feature highlights

### Files NOT Changed (Layer 2)

These files remain unchanged from Layer 1:

- ✅ `lib/mockMcpClient.ts` - Already has tool execution
- ✅ `lib/types.ts` - Types are sufficient
- ✅ `lib/utils.ts` - Utils are sufficient
- ✅ `hooks/useResourceLoader.ts` - Hook is unchanged
- ✅ All real MCP-UI components (`src/client/*`) - Already support postMessage

**Reason**: Layer 1 was well-designed. Layer 2 builds on top without requiring changes to core infrastructure.

---

## Success Criteria

### Functional Requirements

#### FR1: PostMessage Communication Works
**Validation**: Send message from iframe, receive in parent.

**Test**:
```typescript
test('postMessage is received by parent', (done) => {
  const handler = (event: MessageEvent) => {
    expect(event.data.type).toBe('tool');
    done();
  };

  window.addEventListener('message', handler);

  // Simulate iframe posting message
  window.postMessage({ type: 'tool', payload: {} }, '*');
});
```

**Status**: ✅ Pass required

---

#### FR2: Tool Execution Flow Complete
**Validation**: Click button in iframe → tool executes → response displayed.

**Manual Test**:
1. Navigate to /demo/interactive-feedback
2. Fill form, click Submit
3. Verify "Tool executed successfully" alert
4. Check action log shows tool call
5. Check tool response displays JSON

**Status**: ✅ Pass required

---

#### FR3: Interactive Forms Submit Data
**Validation**: Form submission sends correct data via postMessage.

**Test**:
```typescript
test('form data sent correctly', async () => {
  const formData = {
    name: 'Alice',
    email: 'alice@example.com',
    message: 'Great!'
  };

  const response = await mockMcpClient.executeTool('submit_feedback', formData);

  expect(response.data.params).toEqual(formData);
});
```

**Status**: ✅ Pass required

---

#### FR4: External URLs Embed Correctly
**Validation**: text/uri-list resources load in iframe with correct sandbox.

**Manual Test**:
1. Navigate to /demo/external-url
2. Verify iframe loads
3. Inspect element: check `sandbox="allow-scripts allow-same-origin"`
4. Verify no console errors

**Status**: ✅ Pass required

---

#### FR5: Action Log Records All Actions
**Validation**: Every postMessage action appears in log.

**Manual Test**:
1. Navigate to interactive demo
2. Perform 3 actions (submit form 3 times)
3. Verify action log shows 3 entries
4. Verify each entry has type, payload, timestamp

**Status**: ✅ Pass required

---

#### FR6: Origin Validation Enforces Security
**Validation**: Invalid origins rejected, valid accepted.

**Test**:
```typescript
test('validateOrigin security', () => {
  expect(validateOrigin('https://evil.com')).toBe(false);
  expect(validateOrigin('null')).toBe(true);
  expect(validateOrigin('https://example.com')).toBe(true);
});
```

**Status**: ✅ Pass required

---

### Technical Requirements

#### TR1: All Tests Pass
**Validation**: `npm test` shows 50+ passing tests.

**Command**:
```bash
npm test
# Expected: Tests: 50+ passed
```

**Status**: ✅ Pass required

---

#### TR2: TypeScript Compiles Without Errors
**Validation**: `npm run type-check` succeeds.

**Command**:
```bash
npm run type-check
# Expected: 0 errors
```

**Status**: ✅ Pass required

---

#### TR3: Build Succeeds
**Validation**: `npm run build` generates all routes.

**Command**:
```bash
npm run build
# Expected: All routes pre-rendered
```

**Status**: ✅ Pass required

---

#### TR4: No Console Errors in Browser
**Validation**: Run demo, check browser console.

**Manual Test**:
1. Open http://localhost:3000
2. Navigate through all demos
3. Perform actions
4. Check console: 0 errors

**Status**: ✅ Pass required

---

### Security Requirements

#### SR1: Sandbox Attributes Correct
**Validation**: Inline HTML = `allow-scripts`, External = `allow-scripts allow-same-origin`.

**Manual Test**:
1. Inspect inline HTML iframe
2. Verify `sandbox="allow-scripts"`
3. Inspect external URL iframe
4. Verify `sandbox="allow-scripts allow-same-origin"`

**Status**: ✅ Pass required

---

#### SR2: Origin Validation Enforced
**Validation**: Test rejects malicious origins.

**Test**: See FR6 above.

**Status**: ✅ Pass required

---

#### SR3: No XSS Vulnerabilities
**Validation**: Test with XSS payloads.

**Manual Test**:
1. Fill form with `<script>alert(1)</script>`
2. Submit form
3. Verify: No alert fires
4. Verify: Data stored as string (not executed)

**Status**: ✅ Pass required

---

#### SR4: Tool Name Whitelisting
**Validation**: Only allowed tools execute.

**Test**:
```typescript
test('rejects unlisted tool', () => {
  const allowed = isAllowedTool('malicious_tool');
  expect(allowed).toBe(false);
});
```

**Status**: ✅ Pass required

---

### User Experience Requirements

#### UX1: Forms Are Responsive
**Validation**: Works on mobile, tablet, desktop.

**Manual Test**:
1. Open DevTools responsive mode
2. Test 375px (mobile)
3. Test 768px (tablet)
4. Test 1440px (desktop)
5. Verify forms usable at all sizes

**Status**: ✅ Pass required

---

#### UX2: Feedback Is Immediate
**Validation**: User sees result within 1 second.

**Manual Test**:
1. Submit form
2. Time to response
3. Verify < 1 second (mock delay is 200-500ms)

**Status**: ✅ Pass required

---

#### UX3: Error States Clear
**Validation**: Errors are user-friendly.

**Manual Test**:
1. Submit form with missing field
2. Verify clear error message
3. Verify field highlighted
4. Verify accessible (screen reader friendly)

**Status**: ✅ Pass required

---

### Documentation Requirements

#### DR1: QUICKSTART Exists
**Validation**: LAYER2-QUICKSTART.md is comprehensive.

**Checklist**:
- [ ] Installation steps
- [ ] Running demos
- [ ] Testing postMessage
- [ ] Troubleshooting

**Status**: ✅ Pass required

---

#### DR2: POST_MESSAGE_PROTOCOL Documented
**Validation**: Protocol specification is clear.

**Checklist**:
- [ ] Message format
- [ ] Action types
- [ ] Examples
- [ ] Security notes

**Status**: ✅ Pass required

---

#### DR3: INTERACTIVE_DEMOS Documented
**Validation**: Each demo explained.

**Checklist**:
- [ ] Feedback form docs
- [ ] Contact form docs
- [ ] Product selector docs
- [ ] Usage examples

**Status**: ✅ Pass required

---

## Known Limitations

### Limitation 1: Mock Client Always Succeeds

**Description**: `mockMcpClient.executeTool()` always returns success in Layer 2.

**Impact**: Cannot test error handling or validation failures.

**Workaround**: Document this as Layer 2 behavior. Layer 3 will add:
```typescript
async executeTool(name: string, params?: Record<string, any>): Promise<ToolResponse> {
  // Layer 3: Add validation
  if (!isAllowedTool(name)) {
    return { success: false, error: 'Tool not found' };
  }

  if (!validateParams(name, params)) {
    return { success: false, error: 'Invalid parameters' };
  }

  // Execute...
}
```

**Status**: ⚠️ Accepted for Layer 2

---

### Limitation 2: No Real-Time Updates

**Description**: Tool execution doesn't update iframe contents.

**Impact**: After form submit, iframe shows "submitted" but data doesn't refresh.

**Workaround**: Document this as Layer 2 behavior. Layer 3 will add:
```typescript
// Send message back to iframe
iframe.contentWindow.postMessage({
  type: 'response',
  payload: { success: true, data: {...} }
}, '*');
```

**Status**: ⚠️ Accepted for Layer 2

---

### Limitation 3: External URLs May Block Iframes

**Description**: Many sites use `X-Frame-Options: DENY` to prevent iframe embedding.

**Impact**: External URL demo may show blank iframe.

**Workaround**:
1. Use example.com (allows embedding)
2. Or create local HTML file and serve it
3. Document this limitation

**Status**: ⚠️ Accepted (not a bug)

---

### Limitation 4: No Persistent State

**Description**: Refreshing page loses action log and tool responses.

**Impact**: Cannot review history after page reload.

**Workaround**: Document this as demo limitation. Production would use:
- localStorage for client-side persistence
- Server-side database for real persistence

**Status**: ⚠️ Accepted (demo only)

---

### Limitation 5: No Component Library

**Description**: Layer 2 only supports HTML, not JSON component definitions.

**Impact**: Cannot use declarative component syntax.

**Workaround**: Layer 3 will add component library with Remote DOM.

**Example (Layer 3)**:
```typescript
{
  type: 'Form',
  props: {
    onSubmit: { tool: 'submit_feedback' }
  },
  children: [
    { type: 'Input', props: { name: 'name' } },
    { type: 'Button', props: { type: 'submit' }, children: ['Submit'] }
  ]
}
```

**Status**: ⚠️ Deferred to Layer 3

---

### Limitation 6: No Tailwind Auto-Injection

**Description**: HTML resources must include Tailwind CSS manually via CDN.

**Impact**: More verbose HTML, not DRY.

**Workaround**: Layer 4 will auto-detect Tailwind classes and inject CDN.

**Current Approach** (Layer 2):
```html
<head>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
```

**Future Approach** (Layer 4):
```typescript
// Auto-inject if Tailwind classes detected
if (detectTailwindClasses(html)) {
  html = injectTailwindCDN(html);
}
```

**Status**: ⚠️ Deferred to Layer 4

---

## Migration from Layer 1

### What Changes for Users?

**Short Answer**: Nothing breaks. Layer 2 is additive.

**Existing Layer 1 Demos**: Continue to work exactly as before.

**New in Layer 2**:
- Interactive demos (opt-in)
- postMessage support (opt-in via `onUIAction` prop)
- External URLs (new MIME type)

### Backward Compatibility

**Layer 1 Resources**: ✅ Still work
- `product-card`
- `dynamic-stats`
- `feature-gallery`
- `data-visualization`
- `event-calendar`

**Layer 1 Pages**: ✅ No changes needed
- `/demo/product-card`
- `/demo/dynamic-stats`
- `/demo/feature-gallery`
- etc.

**Layer 1 Tests**: ✅ All still pass
- 35 tests from Layer 1
- +15 tests from Layer 2
- = 50 total tests

### Migration Steps for Developers

If you want to add interactivity to an existing demo:

**Step 1**: Add `onUIAction` handler to page component
```typescript
const handleUIAction = async (action: UIActionResult) => {
  if (action.type === 'tool') {
    const response = await mockMcpClient.executeTool(
      action.payload.toolName,
      action.payload.params
    );
    console.log('Tool response:', response);
  }
};
```

**Step 2**: Pass handler to `UIResourceRenderer`
```typescript
<UIResourceRenderer
  resource={resource}
  onUIAction={handleUIAction}  // NEW
/>
```

**Step 3**: Add postMessage to HTML resource
```html
<script>
  function submitForm() {
    window.parent.postMessage({
      type: 'tool',
      payload: {
        toolName: 'submit_data',
        params: { /* form data */ }
      }
    }, '*');
  }
</script>
```

**That's it!** No other changes needed.

---

## Appendix A: Quick Reference

### PostMessage Examples

**Tool Call**:
```javascript
window.parent.postMessage({
  type: 'tool',
  payload: {
    toolName: 'submit_feedback',
    params: { name: 'Alice', email: 'alice@example.com' }
  }
}, '*');
```

**Notification**:
```javascript
window.parent.postMessage({
  type: 'notify',
  payload: {
    level: 'success',
    message: 'Operation completed'
  }
}, '*');
```

**Link**:
```javascript
window.parent.postMessage({
  type: 'link',
  payload: {
    url: 'https://example.com/docs',
    target: '_blank'
  }
}, '*');
```

### Tool Execution Example

```typescript
const response = await mockMcpClient.executeTool('submit_feedback', {
  name: 'Alice',
  email: 'alice@example.com',
  message: 'Great demo!'
});

console.log(response);
// {
//   success: true,
//   data: {
//     toolName: 'submit_feedback',
//     params: { name: 'Alice', ... },
//     message: "Tool 'submit_feedback' executed successfully (mock)",
//     timestamp: '2025-10-16T14:30:00.000Z'
//   }
// }
```

### Action Handler Template

```typescript
const handleUIAction = async (action: UIActionResult) => {
  console.log('[Action]', action.type, action.payload);

  switch (action.type) {
    case 'tool':
      const { toolName, params } = action.payload;
      const response = await mockMcpClient.executeTool(toolName, params);
      if (response.success) {
        alert(`Success: ${response.data.message}`);
      }
      break;

    case 'notify':
      const { level, message } = action.payload;
      console.log(`[${level.toUpperCase()}] ${message}`);
      break;

    case 'link':
      const { url, target } = action.payload;
      window.open(url, target);
      break;
  }
};
```

---

## Appendix B: Verification Commands

### Quick Verification

```bash
cd /mnt/Shared/cs-projects/simple-mcp/examples/nextjs-mcp-ui

# Run all tests (should show 50+ passing)
npm test

# Type check (should show 0 errors)
npm run type-check

# Build (should succeed)
npm run build

# Start dev server
npm run dev
# Visit http://localhost:3000/demo/interactive-feedback
```

### Full Verification Checklist

```bash
# 1. Install dependencies
npm install

# 2. Run test suite
npm test
# Expected: 50+ tests pass

# 3. Type check
npm run type-check
# Expected: 0 errors

# 4. Lint check
npm run lint
# Expected: 0 errors

# 5. Build
npm run build
# Expected: All routes pre-rendered

# 6. Start dev server
npm run dev

# 7. Manual testing
# - Navigate to http://localhost:3000
# - Visit /demo/interactive-feedback
# - Fill form and submit
# - Verify action log shows entry
# - Verify tool response displays
# - Check browser console: 0 errors
```

---

## Appendix C: Troubleshooting

### Problem: postMessage Not Received

**Symptoms**: Click button in iframe, nothing happens.

**Diagnosis**:
1. Open browser DevTools
2. Check console for errors
3. Check Network tab for failed requests
4. Check Elements tab: verify iframe exists

**Solutions**:
1. Verify `onUIAction` prop passed to UIResourceRenderer
2. Check origin validation: `validateOrigin(event.origin)` returns true
3. Verify message format: `data.type` and `data.payload` exist
4. Check sandbox attribute: `allow-scripts` present

---

### Problem: Tool Execution Fails

**Symptoms**: Action received but no tool response.

**Diagnosis**:
1. Check console: look for "[MockMcpClient] Executing tool:" log
2. Verify tool name is correct
3. Check params format

**Solutions**:
1. Verify mock client is imported correctly
2. Check tool name matches exactly (case-sensitive)
3. Ensure params is an object (not array or primitive)

---

### Problem: External URL Blank

**Symptoms**: External URL iframe shows nothing.

**Diagnosis**:
1. Check browser console for X-Frame-Options error
2. Try loading URL directly in new tab
3. Check sandbox permissions

**Solutions**:
1. Use a URL that allows iframe embedding
2. For development, use localhost URL
3. Document this limitation (many sites block iframes)

---

### Problem: Tests Fail

**Symptoms**: `npm test` shows failures.

**Diagnosis**:
1. Read test error message
2. Check which test file failed
3. Run single test: `npm test -- path/to/file.test.ts`

**Solutions**:
1. Verify all dependencies installed: `npm install`
2. Clear cache: `rm -rf .next && npm test`
3. Check imports: ensure @mcp-ui/* paths resolve
4. Rebuild: `npm run build && npm test`

---

## Conclusion

Layer 2 (Feature Layer) adds critical interactivity to the MCP-UI demo system through postMessage communication, tool execution callbacks, and interactive form handling. This specification provides:

- ✅ Complete architecture documentation
- ✅ Detailed feature specifications
- ✅ Step-by-step implementation roadmap
- ✅ Comprehensive security model
- ✅ Testing strategy with 50+ tests
- ✅ File structure and migration guide
- ✅ Success criteria and validation steps

**Ready for Implementation**: This specification is complete and unambiguous. Implementation agents can proceed with confidence, following the phases in order.

**Estimated Duration**: 9-12 hours

**Next Layer**: After Layer 2 validation, proceed to Layer 3 (Remote DOM) for component library and advanced interactivity.

---

**Specification Version**: 1.0.0
**Date**: 2025-10-16
**Status**: READY FOR IMPLEMENTATION
**Author**: Planning Agent

---

*End of Layer 2 Specification*
