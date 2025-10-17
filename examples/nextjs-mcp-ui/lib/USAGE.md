# Mock MCP Client - Usage Examples

This document provides examples of how to use the mock MCP client and related utilities in your Next.js application.

## Table of Contents

- [Basic Resource Loading](#basic-resource-loading)
- [Using the useResource Hook](#using-the-useresource-hook)
- [Loading Multiple Resources](#loading-multiple-resources)
- [Rendering Resources](#rendering-resources)
- [Creating Custom Resources](#creating-custom-resources)
- [Error Handling](#error-handling)
- [Preloading Resources](#preloading-resources)

---

## Basic Resource Loading

### Direct Client Usage

```typescript
import { mockMcpClient } from '@/lib/mockMcpClient';

async function loadResource() {
  try {
    // Load by resource ID
    const resource = await mockMcpClient.loadResource('product-card');
    console.log('Loaded resource:', resource.uri);

    // Or load by URI
    const resource2 = await mockMcpClient.loadResource('ui://info-card/layer1');
    console.log('Loaded resource:', resource2.uri);
  } catch (error) {
    console.error('Failed to load resource:', error);
  }
}
```

### List All Resources

```typescript
import { mockMcpClient } from '@/lib/mockMcpClient';

async function listAllResources() {
  const resources = await mockMcpClient.listResources();
  console.log(`Found ${resources.length} resources`);

  resources.forEach((resource) => {
    console.log(`- ${resource.uri} (${resource.mimeType})`);
  });
}
```

---

## Using the useResource Hook

### Simple Component

```typescript
'use client';

import { useResource } from '@/hooks/useResource';
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';

export function ProductCardDemo() {
  const { resource, loading, error, refetch } = useResource('product-card');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">Error Loading Resource</p>
        <p>{error.message}</p>
        <button
          onClick={refetch}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!resource) {
    return <div>No resource found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-100 px-4 py-2 rounded">
        <p className="text-sm text-gray-600">Resource: {resource.uri}</p>
      </div>

      <UIResourceRenderer
        resource={resource}
        style={{ height: '600px' }}
      />

      <button
        onClick={refetch}
        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
      >
        Reload Resource
      </button>
    </div>
  );
}
```

---

## Loading Multiple Resources

### Side-by-Side Demo

```typescript
'use client';

import { useResources } from '@/hooks/useResource';
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';

export function MultipleResourcesDemo() {
  const { resources, loading, errors, refetch } = useResources([
    'product-card',
    'info-card',
    'welcome-card',
  ]);

  if (loading) {
    return <div>Loading demos...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {resources.map((resource, index) => (
        <div key={index} className="border rounded-lg overflow-hidden">
          {resource ? (
            <UIResourceRenderer
              resource={resource}
              style={{ height: '400px' }}
            />
          ) : (
            <div className="p-4 text-red-600">
              Error: {errors[index]?.message}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Rendering Resources

### With Metadata Display

```typescript
'use client';

import { useResource } from '@/hooks/useResource';
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';
import { getPreferredFrameSize, formatBytes } from '@/lib/utils';

export function ResourceWithMetadata({ resourceId }: { resourceId: string }) {
  const { resource, loading, error } = useResource(resourceId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!resource) return <div>Resource not found</div>;

  const frameSize = getPreferredFrameSize(resource);

  return (
    <div className="space-y-4">
      {/* Metadata Panel */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2">Resource Metadata</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600">URI:</span>
            <span className="ml-2 font-mono">{resource.uri}</span>
          </div>
          <div>
            <span className="text-gray-600">MIME Type:</span>
            <span className="ml-2 font-mono">{resource.mimeType}</span>
          </div>
          <div>
            <span className="text-gray-600">Frame Size:</span>
            <span className="ml-2">{frameSize.width}×{frameSize.height}</span>
          </div>
          <div>
            <span className="text-gray-600">Size:</span>
            <span className="ml-2">{formatBytes(getResourceSize(resource))}</span>
          </div>
        </div>
      </div>

      {/* Renderer */}
      <UIResourceRenderer
        resource={resource}
        style={{
          height: `${frameSize.height}px`,
          maxWidth: `${frameSize.width}px`,
        }}
      />
    </div>
  );
}
```

### With Source Code View

```typescript
'use client';

import { useState } from 'react';
import { useResource } from '@/hooks/useResource';
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';

export function ResourceWithSourceView({ resourceId }: { resourceId: string }) {
  const { resource, loading, error } = useResource(resourceId);
  const [showSource, setShowSource] = useState(false);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!resource) return <div>Resource not found</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Resource Demo</h2>
        <button
          onClick={() => setShowSource(!showSource)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          {showSource ? 'View Preview' : 'View Source'}
        </button>
      </div>

      {showSource ? (
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-[600px]">
          <code>{resource.text}</code>
        </pre>
      ) : (
        <UIResourceRenderer
          resource={resource}
          style={{ height: '600px' }}
        />
      )}
    </div>
  );
}
```

---

## Creating Custom Resources

### Dynamic Resource Creation

```typescript
import { createHTMLResource } from '@/lib/utils';
import type { UIResourceContent } from '@mcp-ui/ui-types';

// Create a simple custom resource
const customResource: UIResourceContent = createHTMLResource(
  'custom-message',
  'Custom Message',
  'A dynamically created resource',
  `
    <div style="padding: 24px; text-align: center;">
      <h1>Hello from Custom Resource!</h1>
      <p>This was created at runtime.</p>
    </div>
  `,
  {
    'mcpui.dev/ui-preferred-frame-size': { width: 400, height: 200 }
  }
);

// Use in component
export function CustomResourceDemo() {
  return (
    <UIResourceRenderer
      resource={customResource}
      style={{ height: '200px' }}
    />
  );
}
```

### User-Provided HTML

```typescript
'use client';

import { useState } from 'react';
import { createHTMLResource, sanitizeHTML } from '@/lib/utils';
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';

export function CustomHTMLDemo() {
  const [html, setHtml] = useState('<div style="padding: 20px;">Hello World</div>');
  const [resource, setResource] = useState(null);

  const handleRender = () => {
    // Sanitize user input
    const sanitized = sanitizeHTML(html);

    // Create resource
    const newResource = createHTMLResource(
      'user-custom',
      'User Custom HTML',
      'User-provided HTML',
      sanitized
    );

    setResource(newResource);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Enter HTML:
        </label>
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          className="w-full h-32 p-2 border rounded font-mono text-sm"
        />
      </div>

      <button
        onClick={handleRender}
        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
      >
        Render HTML
      </button>

      {resource && (
        <UIResourceRenderer
          resource={resource}
          style={{ height: '300px' }}
        />
      )}
    </div>
  );
}
```

---

## Error Handling

### Comprehensive Error Handling

```typescript
'use client';

import { useResource } from '@/hooks/useResource';
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';

export function RobustResourceDemo({ resourceId }: { resourceId: string }) {
  const { resource, loading, error, refetch } = useResource(resourceId);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4" />
        <p className="text-gray-600">Loading resource...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-red-800">
              Failed to Load Resource
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error.message}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={refetch}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!resource) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">Resource not found: {resourceId}</p>
      </div>
    );
  }

  // Success state
  return (
    <UIResourceRenderer
      resource={resource}
      style={{ height: '600px' }}
    />
  );
}
```

---

## Preloading Resources

### Prefetch for Better UX

```typescript
'use client';

import { usePreloadResources } from '@/hooks/useResource';
import Link from 'next/link';

export function NavigationWithPrefetch() {
  // Preload resources that will be needed on next pages
  usePreloadResources([
    'feature-list',
    'statistics-display',
    'welcome-card',
  ]);

  return (
    <nav className="space-y-2">
      <Link href="/demos/feature-list" className="block p-2 hover:bg-gray-100">
        Feature List Demo
      </Link>
      <Link href="/demos/statistics" className="block p-2 hover:bg-gray-100">
        Statistics Dashboard
      </Link>
      <Link href="/demos/welcome" className="block p-2 hover:bg-gray-100">
        Welcome Card
      </Link>
    </nav>
  );
}
```

---

## Tool Execution (Layer 2+)

### Execute Mock Tools

```typescript
import { mockMcpClient } from '@/lib/mockMcpClient';

async function handleToolExecution() {
  try {
    // Execute a tool
    const response = await mockMcpClient.executeTool('add_to_cart', {
      productId: '123',
      quantity: 2,
    });

    if (response.success) {
      console.log('Tool executed successfully:', response.data);
    }
  } catch (error) {
    console.error('Tool execution failed:', error);
  }
}

// Get available tools
const tools = mockMcpClient.getAvailableTools();
console.log('Available tools:', tools.map(t => t.name));
```

---

## Utility Functions

### Resource Validation

```typescript
import { isValidUIResource } from '@/lib/utils';

const resource = {
  uri: 'ui://test',
  mimeType: 'text/html',
  text: '<div>Test</div>',
};

if (isValidUIResource(resource)) {
  console.log('Valid UIResourceContent');
} else {
  console.log('Invalid resource structure');
}
```

### Resource Type Detection

```typescript
import {
  isHTMLResource,
  isExternalURLResource,
  isRemoteDOMResource,
} from '@/lib/utils';

if (isHTMLResource(resource)) {
  console.log('This is an HTML resource');
}

if (isExternalURLResource(resource)) {
  console.log('This is an external URL resource');
}

if (isRemoteDOMResource(resource)) {
  console.log('This is a Remote DOM resource');
}
```

---

## Best Practices

### 1. Always Handle Loading and Error States

```typescript
const { resource, loading, error } = useResource('product-card');

if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
if (!resource) return <NotFound />;

return <UIResourceRenderer resource={resource} />;
```

### 2. Use Preferred Frame Sizes

```typescript
import { getPreferredFrameSize } from '@/lib/utils';

const frameSize = getPreferredFrameSize(resource);

<UIResourceRenderer
  resource={resource}
  style={{
    height: `${frameSize.height}px`,
    maxWidth: `${frameSize.width}px`,
  }}
/>
```

### 3. Preload Resources for Better Performance

```typescript
// In navigation or layout components
usePreloadResources(['next-page-resource-1', 'next-page-resource-2']);
```

### 4. Sanitize User Input

```typescript
import { sanitizeHTML } from '@/lib/utils';

const userHTML = getUserInput();
const sanitized = sanitizeHTML(userHTML);
const resource = createHTMLResource('user-html', 'User HTML', '', sanitized);
```

### 5. Cache Resources Locally

The `useResource` hook automatically caches loaded resources. Use `refetch()` to bypass cache when needed.

---

## Next Steps

- **Layer 2**: Add interactive callbacks with `onUIAction` prop
- **Layer 3**: Add Remote DOM resources with `application/vnd.mcp-ui.remote-dom+javascript`
- **Custom Tools**: Extend `executeTool` for real tool execution

For more information, see:
- [Layer 1 Implementation Plan](../docs/mcp-ui/NEXTJS-DEMO-LAYER1-PLAN.md)
- [MCP-UI Documentation](../docs/mcp-ui/)
