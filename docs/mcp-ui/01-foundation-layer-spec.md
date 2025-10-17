# Foundation Layer Specification: Basic HTML UI Resources

**Layer**: 1 of 5
**Duration**: ~4 hours
**Goal**: Get inline HTML UI resources working end-to-end with security

---

## Overview

The Foundation Layer establishes core UI resource functionality:
- Server creates and returns UIResource objects
- Client renders HTML in sandboxed iframes
- Security measures in place (sandbox attribute)
- Validation: Simple static HTML card renders correctly

This layer proves the concept works before adding interactivity in Layer 2.

---

## Server-Side Implementation

### 1.1 Create UI Resource Types
**File**: `src/types/ui.ts` (NEW)

```typescript
// Basic UIResource types that will be extended in later layers
export type UIContentType = 'rawHtml' | 'externalUrl' | 'remoteDom';

export interface UIResourcePayload {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
  _meta?: Record<string, any>;
}

export interface UIResource {
  type: 'resource';
  resource: UIResourcePayload;
}

export interface UIResourceOptions {
  metadata?: {
    preferredFrameSize?: { width?: number; height?: number };
    initialRenderData?: Record<string, any>;
  };
  annotations?: Record<string, any>;
}
```

### 1.2 Create UI Resource Helpers
**File**: `src/core/ui-resource.ts` (NEW)

```typescript
import type { UIResource, UIResourceOptions } from '../types/ui.js';

/**
 * Create an inline HTML UIResource
 *
 * @param uri - Unique identifier (should start with ui://)
 * @param htmlContent - HTML string to render
 * @param options - Optional metadata and annotations
 * @returns UIResource object ready for MCP response
 *
 * @example
 * ```typescript
 * const uiResource = createInlineHTMLResource(
 *   'ui://product-selector/v1',
 *   '<div><h2>Select a product</h2><button>Click me</button></div>'
 * );
 * ```
 */
export function createInlineHTMLResource(
  uri: string,
  htmlContent: string,
  options?: UIResourceOptions
): UIResource {
  // Validate URI starts with ui://
  if (!uri.startsWith('ui://')) {
    throw new Error(
      `Invalid UI resource URI: "${uri}". UI resource URIs must start with "ui://"`
    );
  }

  // Build metadata if provided
  const metadata = buildMetadata(options);

  return {
    type: 'resource',
    resource: {
      uri,
      mimeType: 'text/html',
      text: htmlContent,
      ...(Object.keys(metadata).length > 0 && { _meta: metadata }),
    },
  };
}

/**
 * Helper function to build metadata object
 * Merges user-provided metadata with defaults
 */
function buildMetadata(options?: UIResourceOptions): Record<string, any> {
  const metadata: Record<string, any> = {};

  if (options?.metadata?.preferredFrameSize) {
    metadata['mcpui.dev/ui-preferred-frame-size'] =
      options.metadata.preferredFrameSize;
  }

  if (options?.metadata?.initialRenderData) {
    metadata['mcpui.dev/ui-initial-render-data'] =
      options.metadata.initialRenderData;
  }

  if (options?.annotations) {
    Object.assign(metadata, options.annotations);
  }

  return metadata;
}

/**
 * Type guard to check if a resource is a UI resource
 */
export function isUIResource(resource: any): resource is UIResource {
  return (
    resource &&
    typeof resource === 'object' &&
    resource.type === 'resource' &&
    resource.resource &&
    (resource.resource.mimeType === 'text/html' ||
      resource.resource.mimeType === 'text/uri-list' ||
      resource.resource.mimeType?.startsWith('application/vnd.mcp-ui.remote-dom'))
  );
}
```

### 1.3 Extend BuildMCPServer with Convenience Method
**File**: `src/api/programmatic/types.ts` (MODIFIED)

Add to existing `ResourceDefinition` interface:

```typescript
/**
 * Extended for UI resources - supports ui:// URIs
 */
export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  /**
   * Resource content or function that generates content dynamically
   * - string/object/Buffer/Uint8Array: Static content served as-is
   * - function: Called at runtime, returns content (supports async)
   *
   * For UI resources (uri starting with ui://), mimeType should be one of:
   * - text/html: For inline HTML content
   * - text/uri-list: For external URLs
   * - application/vnd.mcp-ui.remote-dom+javascript: For Remote DOM (Layer 3)
   */
  content:
    | string
    | { [key: string]: any }
    | Buffer
    | Uint8Array
    | (() =>
        | string
        | { [key: string]: any }
        | Buffer
        | Uint8Array
        | Promise<string | { [key: string]: any } | Buffer | Uint8Array>
      );
}
```

### 1.4 Add Convenience Method to BuildMCPServer
**File**: `src/api/programmatic/BuildMCPServer.ts` (MODIFIED)

After the existing `addResource()` method, add:

```typescript
/**
 * Add a UI resource to the server (convenience method)
 *
 * This is syntactic sugar for addResource() that automatically
 * validates UI resource URIs and MIME types.
 *
 * @param uri - UI resource URI (must start with ui://)
 * @param name - Display name
 * @param description - Description
 * @param mimeType - MIME type (text/html for Foundation Layer)
 * @param content - HTML content or function
 * @returns this for chaining
 *
 * @example
 * ```typescript
 * server.addUIResource(
 *   'ui://product-card/v1',
 *   'Product Card',
 *   'Displays a product selector',
 *   'text/html',
 *   '<div><h2>Select a product</h2><button>Widget A</button></div>'
 * );
 * ```
 */
addUIResource(
  uri: string,
  name: string,
  description: string,
  mimeType: string,
  content: string | (() => string | Promise<string>)
): this {
  if (!uri.startsWith('ui://')) {
    throw new Error(`UI resource URI must start with "ui://", got: "${uri}"`);
  }

  if (!['text/html', 'text/uri-list', 'application/vnd.mcp-ui.remote-dom+javascript'].includes(mimeType)) {
    throw new Error(
      `Invalid UI resource MIME type: "${mimeType}". ` +
      `Must be one of: text/html, text/uri-list, application/vnd.mcp-ui.remote-dom+javascript`
    );
  }

  return this.addResource({
    uri,
    name,
    description,
    mimeType,
    content,
  });
}
```

---

## Client-Side Implementation

### 2.1 Create UI Types
**File**: `src/client/ui-types.ts` (NEW)

```typescript
/**
 * UI-related types for client-side rendering
 */

export type UIContentType = 'rawHtml' | 'externalUrl' | 'remoteDom';

export interface UIResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
  _meta?: Record<string, any>;
}

export interface UIAction {
  type: 'tool' | 'prompt' | 'link' | 'intent' | 'notify';
  payload: Record<string, any>;
}

export interface UIActionResult {
  type: UIAction['type'];
  payload: Record<string, any>;
}

/**
 * Tool call action result
 */
export interface ToolCallAction extends UIActionResult {
  type: 'tool';
  payload: {
    toolName: string;
    params: Record<string, any>;
  };
}

/**
 * Get preferred frame size from metadata
 */
export function getPreferredFrameSize(meta?: Record<string, any>): {
  width?: number;
  height?: number;
} | null {
  if (!meta) return null;
  return meta['mcpui.dev/ui-preferred-frame-size'] || null;
}

/**
 * Get initial render data from metadata
 */
export function getInitialRenderData(meta?: Record<string, any>): Record<string, any> | null {
  if (!meta) return null;
  return meta['mcpui.dev/ui-initial-render-data'] || null;
}
```

### 2.2 Create UI Utilities
**File**: `src/client/ui-utils.ts` (NEW)

```typescript
import type { UIResourceContent, UIContentType } from './ui-types.js';

/**
 * Determine content type from MIME type
 */
export function getContentType(mimeType: string): UIContentType | null {
  if (mimeType === 'text/html') return 'rawHtml';
  if (mimeType === 'text/uri-list') return 'externalUrl';
  if (mimeType.startsWith('application/vnd.mcp-ui.remote-dom')) return 'remoteDom';
  return null;
}

/**
 * Type guard for UI resources
 */
export function isUIResource(resource: any): boolean {
  return (
    resource &&
    typeof resource === 'object' &&
    resource.uri &&
    resource.mimeType &&
    (getContentType(resource.mimeType) !== null)
  );
}

/**
 * Extract HTML content for iframe
 */
export function getHTMLContent(resource: UIResourceContent): string {
  if (resource.text) {
    return resource.text;
  }

  if (resource.blob) {
    // Decode base64 blob if present
    try {
      return atob(resource.blob);
    } catch (e) {
      console.error('Failed to decode UI resource blob:', e);
      return '';
    }
  }

  return '';
}

/**
 * Validate iframe origin (for postMessage security)
 */
export function validateOrigin(origin: string): boolean {
  // For srcdoc iframes, origin is null (accepted)
  if (origin === 'null') return true;

  // For external URLs, validate they're HTTPS in production
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * Build iframe sandbox attribute
 */
export function buildSandboxAttribute(
  isExternalUrl: boolean,
  customPermissions?: string
): string {
  if (customPermissions) {
    return customPermissions;
  }

  // For inline HTML: minimal permissions
  if (!isExternalUrl) {
    return 'allow-scripts';
  }

  // For external URLs: need same-origin for XHR/fetch to own domain
  return 'allow-scripts allow-same-origin';
}
```

### 2.3 Create HTML Resource Renderer
**File**: `src/client/HTMLResourceRenderer.tsx` (NEW)

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
 * Renders content in a sandboxed iframe
 */
export const HTMLResourceRenderer: React.FC<HTMLResourceRendererProps> = ({
  resource,
  onUIAction,
  isExternalUrl = false,
  customSandboxPermissions,
  autoResize = true,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Set up postMessage listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin for security
      if (!validateOrigin(event.origin)) {
        console.warn(`Received message from invalid origin: ${event.origin}`);
        return;
      }

      const data = event.data;
      if (data && typeof data === 'object' && data.type) {
        // In Foundation Layer, we just accept the message
        // Layer 2 will handle tool calls and other actions
        onUIAction?.(data);
      }
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

### 2.4 Create Main UI Resource Renderer
**File**: `src/client/UIResourceRenderer.tsx` (NEW)

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
 * In Foundation Layer, only handles inline HTML.
 * Will support Remote DOM and external URLs in later layers.
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

  // Foundation Layer: Only HTML support
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

  // External URLs supported in Layer 2
  if (contentType === 'externalUrl') {
    return (
      <div style={{ color: 'orange', padding: '16px' }}>
        External URL rendering coming in Feature Layer
      </div>
    );
  }

  // Remote DOM supported in Layer 3
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

## Example: Foundation Layer Demo
**File**: `examples/ui-inline-html-demo.ts` (NEW)

```typescript
import { BuildMCPServer } from '../src/api/programmatic/index.js';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'ui-inline-html-demo',
  version: '1.0.0',
  description: 'Foundation Layer: Inline HTML UI resources',
});

/**
 * Tool that returns a static HTML card UI
 * This demonstrates the Foundation Layer: static HTML resources
 */
server.addUIResource(
  'ui://product-card/demo',
  'Product Card',
  'Displays a product information card',
  'text/html',
  `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 16px;
          background: #f5f5f5;
        }
        .card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          padding: 24px;
          max-width: 400px;
        }
        .card h2 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
        }
        .card p {
          margin: 0 0 16px 0;
          color: #666;
          line-height: 1.5;
        }
        .badge {
          display: inline-block;
          background: #007bff;
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin: 16px 0;
        }
        .info-item {
          border-left: 2px solid #007bff;
          padding-left: 12px;
        }
        .info-label {
          font-size: 12px;
          color: #999;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .info-value {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">Foundation Layer Demo</div>
        <h2>Widget Pro X</h2>
        <p>A demonstration of static HTML UI resources in MCP-UI Foundation Layer.</p>

        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Price</div>
            <div class="info-value">$299</div>
          </div>
          <div class="info-item">
            <div class="info-label">In Stock</div>
            <div class="info-value">✓ Yes</div>
          </div>
          <div class="info-item">
            <div class="info-label">Rating</div>
            <div class="info-value">4.8★</div>
          </div>
          <div class="info-item">
            <div class="info-label">Reviews</div>
            <div class="info-value">1.2K</div>
          </div>
        </div>

        <p style="font-size: 14px; color: #999;">
          This is a static HTML demo. Interactivity will be added in the Feature Layer
          with postMessage callbacks. Remote DOM support comes in Layer 3.
        </p>
      </div>
    </body>
    </html>
  `
);

/**
 * Tool that returns HTML info
 */
server.addTool({
  name: 'get_demo_info',
  description: 'Returns information about the Foundation Layer demo',
  parameters: z.object({}),
  execute: async () => {
    return {
      layer: 'Foundation',
      features: [
        'Static HTML UI resources',
        'Sandboxed iframe rendering',
        'Security: sandbox attribute',
      ],
      nextLayer: 'Interactive callbacks (Feature Layer)',
    };
  },
});

export default server;
```

---

## Testing Strategy

### Unit Tests
**File**: `tests/ui-resource.test.ts`

- ✅ createInlineHTMLResource validates URI format
- ✅ createInlineHTMLResource includes metadata
- ✅ isUIResource type guard works
- ✅ getContentType identifies MIME types
- ✅ validateOrigin checks origins correctly

### Component Tests
**File**: `tests/ui-renderer.test.tsx`

- ✅ HTMLResourceRenderer renders iframe with srcdoc
- ✅ UIResourceRenderer routes to correct component
- ✅ Sandbox attribute applied correctly
- ✅ Error boundary displays invalid resources

### Integration Tests
**File**: `tests/integration/ui-workflow.test.ts`

- ✅ Server creates UIResource successfully
- ✅ UIResource has correct structure
- ✅ Client can render returned UIResource
- ✅ Static content displays in browser

---

## Validation Checklist

### Code Quality ✅
- [ ] No TypeScript errors
- [ ] Follows existing code patterns
- [ ] JSDoc comments on public functions
- [ ] No console warnings/errors

### Security ✅
- [ ] iframe has sandbox attribute
- [ ] Only allow-scripts permission for inline HTML
- [ ] URI format validation (ui://)
- [ ] MIME type validation

### Functionality ✅
- [ ] Server creates UIResource objects
- [ ] Client renders HTML in iframe
- [ ] Static demo displays correctly
- [ ] No regressions in existing features

### Testing ✅
- [ ] Unit tests pass
- [ ] Component tests pass
- [ ] Integration tests pass
- [ ] Tests are meaningful (not just mocks)

---

## Files to Create/Modify

### New Files
- [ ] `src/types/ui.ts` - UI type definitions
- [ ] `src/core/ui-resource.ts` - Server helpers
- [ ] `src/client/ui-types.ts` - Client types
- [ ] `src/client/ui-utils.ts` - Client utilities
- [ ] `src/client/HTMLResourceRenderer.tsx` - HTML renderer
- [ ] `src/client/UIResourceRenderer.tsx` - Main router
- [ ] `examples/ui-inline-html-demo.ts` - Demo
- [ ] `tests/ui-resource.test.ts` - Server tests
- [ ] `tests/ui-renderer.test.tsx` - Client tests
- [ ] `tests/integration/ui-workflow.test.ts` - Integration tests

### Modified Files
- [ ] `src/api/programmatic/types.ts` - Add UI types
- [ ] `src/api/programmatic/BuildMCPServer.ts` - Add addUIResource()

---

## Exit Criteria (Move to Layer 2)

✅ All code compiles without errors
✅ All tests pass with meaningful assertions
✅ No TypeScript errors
✅ Security measures validated (sandbox attribute)
✅ Static HTML demo works end-to-end
✅ No regressions in existing MCP features
✅ Code follows project conventions

---

## Next Layer

Once this layer is validated, proceed to Layer 2: **Feature Layer**

Layer 2 will add:
- PostMessage communication
- Tool callback execution
- External URL support
- Interactive forms

**See**: `02-feature-layer-spec.md`
