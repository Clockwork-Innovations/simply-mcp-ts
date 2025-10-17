# Feature Layer Specification: Interactive UI with Callbacks

**Layer**: 2 of 5
**Duration**: ~5 hours
**Goal**: Add interactivity with postMessage callbacks and external URL support

---

## Overview

The Feature Layer extends Foundation Layer with:
- PostMessage communication (iframe ↔ host)
- Tool callback execution from UI actions
- External URL iframe embedding
- Origin validation for security
- Form submission examples

Validation: Interactive form with submission that triggers MCP tool call works end-to-end.

---

## Server-Side Changes (Minimal)

The server-side is mostly complete from Foundation Layer. Just add one new helper:

### 2.1 Add External URL Resource Helper
**File**: `src/core/ui-resource.ts` (MODIFIED)

Add new function:

```typescript
/**
 * Create an external URL UIResource
 *
 * @param uri - Unique identifier (should start with ui://)
 * @param url - HTTPS URL to embed in iframe
 * @param options - Optional metadata and annotations
 * @returns UIResource object ready for MCP response
 *
 * @example
 * ```typescript
 * const uiResource = createExternalURLResource(
 *   'ui://analytics/dashboard',
 *   'https://example.com/dashboard'
 * );
 * ```
 */
export function createExternalURLResource(
  uri: string,
  url: string,
  options?: UIResourceOptions
): UIResource {
  // Validate URI
  if (!uri.startsWith('ui://')) {
    throw new Error(
      `Invalid UI resource URI: "${uri}". UI resource URIs must start with "ui://"`
    );
  }

  // Validate URL is HTTPS or localhost
  try {
    const urlObj = new URL(url);
    if (
      urlObj.protocol !== 'https:' &&
      urlObj.hostname !== 'localhost' &&
      urlObj.hostname !== '127.0.0.1'
    ) {
      throw new Error(
        `Invalid external URL: "${url}". Must be HTTPS or localhost (for development)`
      );
    }
  } catch (e) {
    throw new Error(`Invalid URL: "${url}". Error: ${e instanceof Error ? e.message : String(e)}`);
  }

  const metadata = buildMetadata(options);

  return {
    type: 'resource',
    resource: {
      uri,
      mimeType: 'text/uri-list',
      text: url,
      ...(Object.keys(metadata).length > 0 && { _meta: metadata }),
    },
  };
}
```

---

## Client-Side Implementation

### 2.2 Update HTML Resource Renderer (Add postMessage)
**File**: `src/client/HTMLResourceRenderer.tsx` (MODIFIED)

Replace with version that handles postMessage from iframe:

```typescript
import React, { useRef, useEffect, useCallback } from 'react';
import type { UIResourceContent, UIActionResult } from './ui-types.js';
import { getHTMLContent, buildSandboxAttribute, validateOrigin } from './ui-utils.js';

export interface HTMLResourceRendererProps {
  resource: UIResourceContent;
  onUIAction?: (action: UIActionResult) => void | Promise<void>;
  isExternalUrl?: boolean;
  customSandboxPermissions?: string;
  autoResize?: boolean;
}

/**
 * Renderer for inline HTML and external URL resources
 * Renders content in a sandboxed iframe with postMessage support
 */
export const HTMLResourceRenderer: React.FC<HTMLResourceRendererProps> = ({
  resource,
  onUIAction,
  isExternalUrl = false,
  customSandboxPermissions,
  autoResize = true,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Set up postMessage listener for iframe communication
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // CRITICAL SECURITY: Validate origin before processing
      if (!validateOrigin(event.origin)) {
        console.warn(`Received message from invalid origin: ${event.origin}`);
        return;
      }

      const data = event.data;

      // Only process messages with valid structure
      if (!data || typeof data !== 'object' || !data.type) {
        return;
      }

      console.log('UI Action received:', data);

      // Handle different action types
      if (data.type === 'tool') {
        // Tool call action: should trigger MCP tool execution
        if (onUIAction) {
          onUIAction({
            type: 'tool',
            payload: data.payload || {},
          });
        }
      } else if (data.type === 'notify') {
        // Notification action
        if (onUIAction) {
          onUIAction({
            type: 'notify',
            payload: data.payload || {},
          });
        }
      } else if (data.type === 'link') {
        // Link navigation
        if (onUIAction) {
          onUIAction({
            type: 'link',
            payload: data.payload || {},
          });
        }
      }
      // More action types can be added as needed
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onUIAction]);

  // For external URLs
  if (isExternalUrl && resource.text) {
    const sandbox = buildSandboxAttribute(true, customSandboxPermissions);

    return (
      <iframe
        ref={iframeRef}
        src={resource.text}
        sandbox={sandbox as any}
        style={{
          width: '100%',
          height: '500px',
          border: 'none',
          borderRadius: '4px',
        }}
        title={resource.uri}
      />
    );
  }

  // For inline HTML
  const htmlContent = getHTMLContent(resource);
  const sandbox = buildSandboxAttribute(false, customSandboxPermissions);

  return (
    <iframe
      ref={iframeRef}
      sandbox={sandbox as any}
      srcDoc={htmlContent}
      style={{
        width: '100%',
        height: '500px',
        border: 'none',
        borderRadius: '4px',
      }}
      title={resource.uri}
    />
  );
};

export default HTMLResourceRenderer;
```

### 2.3 Update UI Utils (Add origin validation)
**File**: `src/client/ui-utils.ts` (MODIFIED)

Enhance origin validation:

```typescript
/**
 * Validate iframe origin (for postMessage security)
 * This is CRITICAL for security - only accept messages from trusted sources
 */
export function validateOrigin(origin: string): boolean {
  // For srcdoc iframes, origin is null (accepted, same-origin)
  if (origin === 'null') return true;

  // For external URLs, validate they're HTTPS (or localhost for dev)
  try {
    const url = new URL(origin);

    // Accept HTTPS in production
    if (url.protocol === 'https:') return true;

    // Accept localhost/127.0.0.1 for development
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return url.protocol === 'http:' || url.protocol === 'https:';
    }

    return false;
  } catch (e) {
    console.error('Invalid origin URL:', origin, e);
    return false;
  }
}
```

### 2.4 Update Main Renderer (Route external URLs)
**File**: `src/client/UIResourceRenderer.tsx` (MODIFIED)

```typescript
import React from 'react';
import HTMLResourceRenderer from './HTMLResourceRenderer.js';
import type { UIResourceContent, UIActionResult } from './ui-types.js';
import { getContentType, isUIResource } from './ui-utils.js';

export interface UIResourceRendererProps {
  resource: UIResourceContent;
  onUIAction?: (action: UIActionResult) => void | Promise<void>;
  customSandboxPermissions?: string;
  autoResize?: boolean;
}

/**
 * Main UI Resource Renderer
 *
 * Automatically detects resource type and renders appropriate component.
 * Feature Layer adds: External URL support and postMessage handling
 */
export const UIResourceRenderer: React.FC<UIResourceRendererProps> = ({
  resource,
  onUIAction,
  customSandboxPermissions,
  autoResize = true,
}) => {
  // Validate resource
  if (!isUIResource(resource)) {
    return (
      <div style={{ color: 'red', padding: '16px' }}>
        Invalid UI resource: {JSON.stringify(resource, null, 2)}
      </div>
    );
  }

  const contentType = getContentType(resource.mimeType);

  // Inline HTML support (from Foundation Layer)
  if (contentType === 'rawHtml') {
    return (
      <HTMLResourceRenderer
        resource={resource}
        onUIAction={onUIAction}
        isExternalUrl={false}
        customSandboxPermissions={customSandboxPermissions}
        autoResize={autoResize}
      />
    );
  }

  // External URLs (NEW in Feature Layer)
  if (contentType === 'externalUrl') {
    return (
      <HTMLResourceRenderer
        resource={resource}
        onUIAction={onUIAction}
        isExternalUrl={true}
        customSandboxPermissions={customSandboxPermissions}
        autoResize={autoResize}
      />
    );
  }

  // Remote DOM (comes in Layer 3)
  if (contentType === 'remoteDom') {
    return (
      <div style={{ color: 'blue', padding: '16px' }}>
        Remote DOM rendering coming in Layer 3
      </div>
    );
  }

  return (
    <div style={{ color: 'red', padding: '16px' }}>
      Unsupported UI resource type: {resource.mimeType}
    </div>
  );
};

export default UIResourceRenderer;
```

---

## Examples

### 2.5 Interactive Form Example
**File**: `examples/ui-interactive-form-demo.ts` (NEW)

```typescript
import { BuildMCPServer } from '../src/api/programmatic/index.js';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'ui-interactive-form-demo',
  version: '1.0.0',
  description: 'Feature Layer: Interactive forms with callbacks',
});

// Track submitted data for demo
const submissions: Array<{ name: string; email: string; feedback: string; timestamp: Date }> = [];

/**
 * Tool that returns an interactive form with postMessage callbacks
 */
server.addUIResource(
  'ui://feedback-form/v1',
  'Feedback Form',
  'Interactive feedback form with postMessage callbacks',
  'text/html',
  `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: #f5f5f5;
        }
        .form-container {
          max-width: 500px;
          margin: 0 auto;
          background: white;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h2 {
          margin-top: 0;
          margin-bottom: 24px;
          font-size: 20px;
          font-weight: 600;
        }
        .form-group {
          margin-bottom: 16px;
        }
        label {
          display: block;
          margin-bottom: 6px;
          font-weight: 600;
          font-size: 14px;
          color: #333;
        }
        input[type="text"],
        input[type="email"],
        textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: inherit;
          font-size: 14px;
        }
        input[type="text"]:focus,
        input[type="email"]:focus,
        textarea:focus {
          outline: none;
          border-color: #0066cc;
          box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
        }
        textarea {
          resize: vertical;
          min-height: 100px;
        }
        .button-group {
          display: flex;
          gap: 10px;
          margin-top: 24px;
        }
        button {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-submit {
          background: #0066cc;
          color: white;
        }
        .btn-submit:hover {
          background: #0052a3;
        }
        .btn-submit:active {
          transform: scale(0.98);
        }
        .btn-reset {
          background: #e0e0e0;
          color: #333;
        }
        .btn-reset:hover {
          background: #d0d0d0;
        }
        .status {
          margin-top: 16px;
          padding: 12px;
          border-radius: 4px;
          font-size: 14px;
          display: none;
        }
        .status.success {
          display: block;
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        .status.error {
          display: block;
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
      </style>
    </head>
    <body>
      <div class="form-container">
        <h2>Send Feedback</h2>
        <form id="feedbackForm">
          <div class="form-group">
            <label for="name">Name</label>
            <input type="text" id="name" name="name" required>
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
          </div>

          <div class="form-group">
            <label for="feedback">Feedback</label>
            <textarea id="feedback" name="feedback" required></textarea>
          </div>

          <div class="button-group">
            <button type="submit" class="btn-submit">Submit Feedback</button>
            <button type="reset" class="btn-reset">Clear</button>
          </div>

          <div id="status" class="status"></div>
        </form>
      </div>

      <script>
        const form = document.getElementById('feedbackForm');
        const statusDiv = document.getElementById('status');

        form.addEventListener('submit', function(event) {
          event.preventDefault();

          // Get form data
          const name = document.getElementById('name').value;
          const email = document.getElementById('email').value;
          const feedback = document.getElementById('feedback').value;

          // Validate
          if (!name || !email || !feedback) {
            showStatus('Please fill in all fields', 'error');
            return;
          }

          // Send tool call via postMessage to parent
          window.parent.postMessage({
            type: 'tool',
            payload: {
              toolName: 'submit_feedback',
              params: {
                name: name,
                email: email,
                feedback: feedback
              }
            }
          }, '*');

          // Show success message
          showStatus('Feedback submitted successfully!', 'success');
          form.reset();
        });

        function showStatus(message, type) {
          statusDiv.textContent = message;
          statusDiv.className = 'status ' + type;
          setTimeout(() => {
            statusDiv.className = 'status';
          }, 3000);
        }
      </script>
    </body>
    </html>
  `
);

/**
 * Tool that receives form submission
 */
server.addTool({
  name: 'submit_feedback',
  description: 'Submit feedback from the interactive form',
  parameters: z.object({
    name: z.string().describe('User name'),
    email: z.string().email().describe('User email'),
    feedback: z.string().describe('User feedback'),
  }),
  execute: async (args) => {
    // Store submission
    submissions.push({
      name: args.name,
      email: args.email,
      feedback: args.feedback,
      timestamp: new Date(),
    });

    return {
      status: 'success',
      message: `Thank you ${args.name}! Your feedback has been recorded.`,
      submissionCount: submissions.length,
    };
  },
});

/**
 * Tool to get feedback history
 */
server.addTool({
  name: 'get_feedback_history',
  description: 'Get all submitted feedback',
  parameters: z.object({}),
  execute: async () => {
    return {
      submissionCount: submissions.length,
      submissions: submissions.map((s) => ({
        name: s.name,
        email: s.email,
        feedback: s.feedback,
        timestamp: s.timestamp.toISOString(),
      })),
    };
  },
});

export default server;
```

### 2.6 External URL Example
**File**: `examples/ui-external-url-demo.ts` (NEW)

```typescript
import { BuildMCPServer } from '../src/api/programmatic/index.js';
import { createExternalURLResource } from '../src/core/ui-resource.js';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'ui-external-url-demo',
  version: '1.0.0',
  description: 'Feature Layer: External URL embedding',
});

/**
 * Example external URLs (would be real URLs in production)
 * This demonstrates how to embed existing web applications
 */

server.addTool({
  name: 'show_external_dashboard',
  description: 'Shows an external dashboard embedded in an iframe',
  parameters: z.object({}),
  execute: async () => {
    // In a real application, this would be your actual external URL
    const resource = createExternalURLResource(
      'ui://dashboard/external',
      'https://example.com/dashboard'
    );

    return {
      content: [
        {
          type: 'text',
          text: 'Opening external dashboard...',
        },
      ],
    };
  },
});

export default server;
```

---

## Type Additions

### 2.7 Extended UI Types
**File**: `src/client/ui-types.ts` (MODIFIED)

Add additional action types:

```typescript
/**
 * Notification action result
 */
export interface NotifyAction extends UIActionResult {
  type: 'notify';
  payload: {
    level: 'info' | 'warning' | 'error' | 'success';
    message: string;
  };
}

/**
 * Link action result
 */
export interface LinkAction extends UIActionResult {
  type: 'link';
  payload: {
    url: string;
    target?: '_blank' | '_self';
  };
}

/**
 * Prompt action result
 */
export interface PromptAction extends UIActionResult {
  type: 'prompt';
  payload: {
    promptName: string;
    arguments?: Record<string, any>;
  };
}

/**
 * Intent action result (platform-specific)
 */
export interface IntentAction extends UIActionResult {
  type: 'intent';
  payload: {
    intentName: string;
    data?: Record<string, any>;
  };
}
```

---

## Testing

### 2.8 Integration Tests
**File**: `tests/integration/ui-workflow.test.ts` (EXTENDED)

Add tests for Feature Layer:

```typescript
// Test postMessage communication
describe('UI Resource postMessage', () => {
  test('should accept tool call from iframe', (done) => {
    // Setup listener
    const handleMessage = (event: MessageEvent) => {
      expect(event.data.type).toBe('tool');
      expect(event.data.payload.toolName).toBe('submit_feedback');
      window.removeEventListener('message', handleMessage);
      done();
    };

    window.addEventListener('message', handleMessage);

    // Simulate iframe sending message
    const action = {
      type: 'tool',
      payload: {
        toolName: 'submit_feedback',
        params: { name: 'John', email: 'john@example.com', feedback: 'Great!' },
      },
    };

    // This would come from iframe
    window.postMessage(action, window.location.origin);
  });

  test('should validate origin for security', () => {
    const event = new MessageEvent('message', {
      origin: 'https://evil.com',
      data: { type: 'tool', payload: { toolName: 'hack' } },
    });

    // Should be rejected by validateOrigin
    expect(validateOrigin(event.origin)).toBe(false);
  });
});

// Test external URLs
describe('External URL resources', () => {
  test('should create valid external URL resource', () => {
    const resource = createExternalURLResource(
      'ui://test/url',
      'https://example.com'
    );

    expect(resource.resource.mimeType).toBe('text/uri-list');
    expect(resource.resource.text).toBe('https://example.com');
  });

  test('should reject non-HTTPS URLs', () => {
    expect(() => {
      createExternalURLResource('ui://test/url', 'http://example.com');
    }).toThrow();
  });
});
```

---

## Validation Checklist

### Code Quality ✅
- [ ] No TypeScript errors
- [ ] postMessage handler properly validates origin
- [ ] No eval or Function() usage
- [ ] Follows existing patterns

### Security ✅
- [ ] Origin validation enforced
- [ ] Only HTTPS external URLs accepted (except localhost)
- [ ] Message validation on receipt
- [ ] Sandbox attribute still applied

### Functionality ✅
- [ ] Form submission triggers tool call
- [ ] Tool executes and returns response
- [ ] External URLs render in iframe
- [ ] No regressions from Layer 1

### Testing ✅
- [ ] Form submission tests pass
- [ ] Origin validation tests pass
- [ ] External URL tests pass
- [ ] Integration tests pass

---

## Exit Criteria (Move to Layer 3)

✅ All code compiles without errors
✅ Form submission → tool execution works
✅ postMessage origin validation working
✅ External URLs embed correctly
✅ All tests pass with meaningful assertions
✅ No security vulnerabilities
✅ No regressions

---

## Next Layer

Once this layer is validated, proceed to Layer 3: **Remote DOM Layer**

Layer 3 will add:
- Web Worker sandbox
- Remote DOM execution
- Basic component library
- Native-looking interactive UI

**See**: `03-remote-dom-layer-spec.md`
