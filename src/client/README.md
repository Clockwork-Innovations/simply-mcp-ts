# MCP-UI Client Components

Client-side React components for rendering MCP-UI resources.

## Overview

This directory contains React components for rendering UI resources from MCP servers. These components are designed to be used in React applications that consume MCP-UI resources.

## Peer Dependencies

These components require the following peer dependencies in your application:

```json
{
  "peerDependencies": {
    "react": ">=16.8.0",
    "react-dom": ">=16.8.0"
  }
}
```

## Installation

If you're building a React application that consumes MCP-UI resources:

```bash
npm install simply-mcp react react-dom
```

## Components

### UIResourceRenderer

Main router component that detects resource type and renders the appropriate renderer.

```typescript
import { UIResourceRenderer } from 'simply-mcp/client';

function MyApp() {
  const resource = {
    uri: 'ui://product-card',
    mimeType: 'text/html',
    text: '<div><h2>Product Card</h2></div>'
  };

  return (
    <UIResourceRenderer
      resource={resource}
      onUIAction={(action) => {
        console.log('Action received:', action);
      }}
    />
  );
}
```

### HTMLResourceRenderer

Specialized renderer for HTML content (inline and external URLs).

```typescript
import { HTMLResourceRenderer } from 'simply-mcp/client';

function MyApp() {
  const resource = {
    uri: 'ui://widget',
    mimeType: 'text/html',
    text: '<div>Hello World</div>'
  };

  return (
    <HTMLResourceRenderer
      resource={resource}
      isExternalUrl={false}
    />
  );
}
```

## Security

All UI resources are rendered in sandboxed iframes with minimal permissions:

- **Inline HTML**: `sandbox="allow-scripts"` - No same-origin access
- **External URLs**: `sandbox="allow-scripts allow-same-origin"` - Allows API calls to own domain
- **Origin Validation**: All postMessage communications validate origin

## Layer Support

### Foundation Layer (Current)
- Inline HTML rendering (`text/html`)
- Sandboxed iframe rendering
- Basic security controls

### Layer 2 (Coming Soon)
- External URL support (`text/uri-list`)
- PostMessage action handling
- Tool callback execution
- Interactive forms

### Layer 3 (Coming Soon)
- Remote DOM rendering (`application/vnd.mcp-ui.remote-dom+javascript`)
- React-like component model
- State management

## Types

All TypeScript types are exported from the client module:

```typescript
import type {
  UIResourceContent,
  UIContentType,
  UIAction,
  UIActionResult,
  ToolCallAction
} from 'simply-mcp/client';
```

## Utilities

Helper functions for working with UI resources:

```typescript
import {
  getContentType,
  isUIResource,
  getHTMLContent,
  validateOrigin,
  buildSandboxAttribute,
  getPreferredFrameSize,
  getInitialRenderData
} from 'simply-mcp/client';
```

## Examples

See `/examples` directory for complete examples:

- `examples/ui-inline-html-demo.ts` - Foundation Layer demo with static HTML
- More examples coming in Layer 2+

## Development

These components are written in TypeScript and use React hooks. They follow React best practices and include comprehensive JSDoc documentation.

## License

MIT
