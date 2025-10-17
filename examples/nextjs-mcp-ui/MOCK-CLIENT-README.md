# Mock MCP Client - Quick Start Guide

**Version**: 1.0.0
**Layer**: 1 (Foundation)
**Status**: ✅ Production Ready
**Date**: 2025-10-16

---

## Overview

The mock MCP client provides a complete implementation for demonstrating MCP-UI Layer 1 (Foundation) capabilities with REAL UIResourceContent objects. It simulates MCP protocol responses without requiring a real server.

### What's Included

- **5 Demo Resources**: Production-quality HTML resources
- **React Hooks**: Easy integration with Next.js components
- **TypeScript**: Full type safety
- **Tests**: 31 comprehensive test cases
- **Documentation**: Complete usage guide

---

## Quick Start

### 1. Import and Use

```typescript
import { mockMcpClient } from '@/lib/mockMcpClient';
import { useResource } from '@/hooks/useResource';
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';

// Option 1: Direct client usage
async function loadResource() {
  const resource = await mockMcpClient.loadResource('product-card');
  return resource;
}

// Option 2: React hook (recommended)
function Demo() {
  const { resource, loading, error } = useResource('product-card');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!resource) return <div>Not found</div>;

  return <UIResourceRenderer resource={resource} />;
}
```

### 2. Available Resources

| ID | URI | Description |
|----|-----|-------------|
| `product-card` | `ui://product-card/layer1` | Modern product card with gradient styling |
| `info-card` | `ui://info-card/layer1` | Clean info card with icon |
| `feature-list` | `ui://feature-list/layer1` | Feature list with checkmarks |
| `statistics-display` | `ui://statistics-display/layer1` | Dashboard with metrics |
| `welcome-card` | `ui://welcome-card/layer1` | Simple welcome message |

### 3. Load Any Resource

```typescript
// By ID
const resource1 = await mockMcpClient.loadResource('product-card');

// By URI
const resource2 = await mockMcpClient.loadResource('ui://info-card/layer1');

// List all
const all = await mockMcpClient.listResources();
```

---

## File Structure

```
examples/nextjs-mcp-ui/
├── lib/
│   ├── types.ts                    # Type definitions (114 lines)
│   ├── demoResources.ts            # Resource catalog (757 lines)
│   ├── mockMcpClient.ts            # Mock client class (328 lines)
│   ├── utils.ts                    # Utility functions (329 lines)
│   ├── USAGE.md                    # Detailed usage guide (487 lines)
│   ├── IMPLEMENTATION_SUMMARY.md   # Complete implementation docs
│   └── __tests__/
│       └── mockMcpClient.test.ts   # Unit tests (352 lines)
│
├── hooks/
│   └── useResource.ts              # React hooks (283 lines)
│
└── MOCK-CLIENT-README.md           # This file
```

**Total**: 2,163 lines of production-ready code

---

## API Reference

### MockMcpClient Class

```typescript
class MockMcpClient {
  // Load a resource by URI or ID
  loadResource(uri: string): Promise<UIResourceContent>

  // List all available resources
  listResources(): Promise<UIResourceContent[]>

  // Check if resource exists
  hasResource(uri: string): boolean

  // Get resource count
  getResourceCount(): number

  // Execute a tool (Layer 2+ preparation)
  executeTool(name: string, params?: any): Promise<ToolResponse>

  // Get available tools
  getAvailableTools(): Tool[]

  // Clear cache
  clearCache(): void
}
```

### useResource Hook

```typescript
function useResource(uri: string): {
  resource: UIResourceContent | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

### useResources Hook

```typescript
function useResources(uris: string[]): {
  resources: (UIResourceContent | null)[];
  loading: boolean;
  errors: (Error | null)[];
  refetch: () => void;
}
```

### Utility Functions

```typescript
// Validation
isValidUIResource(obj: any): boolean
isHTMLResource(resource: UIResourceContent): boolean

// Resource creation
createHTMLResource(uri, name, description, html, meta?): UIResourceContent

// URI formatting
formatResourceUri(path: string): string
extractResourceId(uri: string): string | null

// Security
sanitizeHTML(html: string): string

// Utilities
getResourceSize(resource: UIResourceContent): number
formatBytes(bytes: number): string
cloneResource(resource: UIResourceContent): UIResourceContent
```

---

## Examples

### Basic Usage

```typescript
import { mockMcpClient } from '@/lib/mockMcpClient';

// Load a single resource
const resource = await mockMcpClient.loadResource('product-card');
console.log(resource.uri); // 'ui://product-card/layer1'
console.log(resource.mimeType); // 'text/html'
```

### React Component

```typescript
'use client';

import { useResource } from '@/hooks/useResource';
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';

export function ProductCardDemo() {
  const { resource, loading, error, refetch } = useResource('product-card');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} onRetry={refetch} />;
  if (!resource) return <NotFound />;

  return (
    <div className="space-y-4">
      <h2>Product Card Demo</h2>
      <UIResourceRenderer resource={resource} style={{ height: '600px' }} />
      <button onClick={refetch}>Reload</button>
    </div>
  );
}
```

### Multiple Resources

```typescript
import { useResources } from '@/hooks/useResource';

export function MultiDemo() {
  const { resources, loading } = useResources([
    'product-card',
    'info-card',
    'welcome-card',
  ]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {resources.map((resource, i) =>
        resource ? (
          <UIResourceRenderer key={i} resource={resource} />
        ) : (
          <div key={i}>Failed to load</div>
        )
      )}
    </div>
  );
}
```

### Custom Resource

```typescript
import { createHTMLResource } from '@/lib/utils';

const customResource = createHTMLResource(
  'my-custom',
  'My Custom Resource',
  'A dynamically created resource',
  `
    <div style="padding: 24px; text-align: center;">
      <h1>Hello World!</h1>
      <p>This resource was created at runtime.</p>
    </div>
  `
);

// Use it like any other resource
<UIResourceRenderer resource={customResource} />
```

---

## Testing

### Run Tests

```bash
npm test lib/__tests__/mockMcpClient.test.ts
```

### Test Coverage

- ✅ 31 test cases
- ✅ Resource loading
- ✅ Error handling
- ✅ Async behavior
- ✅ Cache management
- ✅ Resource validation
- ✅ Security checks

### Example Test

```typescript
import { createMockMcpClient } from '@/lib/mockMcpClient';

test('loads resource by ID', async () => {
  const client = createMockMcpClient({ minDelay: 10, maxDelay: 20 });
  const resource = await client.loadResource('product-card');

  expect(resource.uri).toBe('ui://product-card/layer1');
  expect(resource.mimeType).toBe('text/html');
});
```

---

## TypeScript

### Import Types

```typescript
import type {
  UIResourceContent,
  UIAction,
  UIActionResult,
} from '@mcp-ui/ui-types';

import type {
  ResourceId,
  DemoResource,
  MockMcpClientOptions,
  Tool,
  ToolResponse,
} from '@/lib/types';
```

### Type Safety

All functions are fully typed with TypeScript strict mode:

```typescript
// Resource loading is type-safe
const resource: UIResourceContent = await mockMcpClient.loadResource('product-card');

// Hook returns are typed
const { resource, loading, error }: UseResourceResult = useResource('info-card');

// Validation returns type guard
if (isValidUIResource(obj)) {
  // obj is UIResourceContent
  console.log(obj.uri, obj.mimeType);
}
```

---

## Configuration

### Client Options

```typescript
import { createMockMcpClient } from '@/lib/mockMcpClient';

const client = createMockMcpClient({
  minDelay: 100,      // Min network delay (ms)
  maxDelay: 300,      // Max network delay (ms)
  verbose: true,      // Enable console logging
});
```

### Default Instance

```typescript
import { mockMcpClient } from '@/lib/mockMcpClient';

// Pre-configured with:
// - minDelay: 200ms
// - maxDelay: 500ms
// - verbose: false
```

---

## Security

### Sandboxed Rendering

All HTML resources are designed for sandboxed iframe rendering:

```typescript
<UIResourceRenderer
  resource={resource}
  customSandboxPermissions="allow-scripts"
/>
```

### HTML Sanitization

User-provided HTML should be sanitized:

```typescript
import { sanitizeHTML, createHTMLResource } from '@/lib/utils';

const userHTML = getUserInput();
const safe = sanitizeHTML(userHTML);
const resource = createHTMLResource('user-html', 'User HTML', '', safe);
```

### Security Features

- ✅ No external scripts in demo resources
- ✅ No eval() or Function constructor
- ✅ No dangerous event handlers
- ✅ Sanitization utility available
- ✅ Compatible with CSP
- ✅ Iframe sandbox compatible

---

## Best Practices

### 1. Always Handle States

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

const size = getPreferredFrameSize(resource);

<UIResourceRenderer
  resource={resource}
  style={{ height: `${size.height}px`, maxWidth: `${size.width}px` }}
/>
```

### 3. Preload for Performance

```typescript
import { usePreloadResources } from '@/hooks/useResource';

function Navigation() {
  // Preload resources for next page
  usePreloadResources(['next-page-resource-1', 'next-page-resource-2']);

  return <nav>...</nav>;
}
```

### 4. Validate Resources

```typescript
import { isValidUIResource } from '@/lib/utils';

if (isValidUIResource(resource)) {
  // Safe to render
  return <UIResourceRenderer resource={resource} />;
}
```

---

## Troubleshooting

### Resource Not Found

```typescript
// Check if resource exists
if (mockMcpClient.hasResource('product-card')) {
  const resource = await mockMcpClient.loadResource('product-card');
}

// List available resources
const all = await mockMcpClient.listResources();
console.log('Available:', all.map(r => r.uri));
```

### TypeScript Errors

```typescript
// Ensure path alias is configured in tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@mcp-ui/*": ["../../simple-mcp/src/client/*"],
      "@/*": ["./*"]
    }
  }
}
```

### Network Delay Too Long

```typescript
// Create client with shorter delays
const fastClient = createMockMcpClient({
  minDelay: 50,
  maxDelay: 100,
});
```

---

## Next Steps

### Integration
1. Install Next.js dependencies
2. Create demo pages
3. Import and use hooks
4. Test with UIResourceRenderer

### Layer 2 Expansion
1. Implement interactive callbacks
2. Add external URL resources
3. Test postMessage communication

### Layer 3 Expansion
1. Add Remote DOM resources
2. Integrate RemoteDOMRenderer
3. Create advanced demos

---

## Documentation

- **Detailed Usage**: See `lib/USAGE.md`
- **Implementation Details**: See `lib/IMPLEMENTATION_SUMMARY.md`
- **Layer 1 Plan**: See `docs/mcp-ui/NEXTJS-DEMO-LAYER1-PLAN.md`

---

## Support

For questions or issues:
1. Check `lib/USAGE.md` for detailed examples
2. Review test cases in `lib/__tests__/mockMcpClient.test.ts`
3. Consult implementation summary

---

## License

Part of the simple-mcp project. See main project LICENSE.

---

**Ready to use!** Import, load resources, and start building your MCP-UI demo. 🚀
