# Hooks Directory

This directory will contain custom React hooks for the MCP-UI Next.js demo.

## Planned Structure (Phase 2)

```
hooks/
├── useResource.ts            # Hook for fetching and managing UI resources
└── useDemo.ts                # Hook for demo state management (optional)
```

## Hook Descriptions

### useResource.ts
React hook for loading UI resources from the mock MCP client.

**Features**:
- Async resource loading with loading state
- Error handling
- Refetch capability
- TypeScript typed with ResourceId

**Usage**:
```typescript
import { useResource } from '@/hooks/useResource';

function MyComponent() {
  const { resource, loading, error, refetch } = useResource('simple-product-card');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!resource) return null;

  return <UIResourceRenderer resource={resource} />;
}
```

**Return Type**:
```typescript
interface UseResourceResult {
  resource: UIResourceContent | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}
```

### useDemo.ts (Optional)
Hook for managing demo-specific state (e.g., view mode, source visibility).

**Features**:
- View mode state (preview/source)
- Metadata visibility toggle
- Demo-specific settings

## Implementation Status

- **Phase 1** (Complete): Directory structure created
- **Phase 2** (Pending): Hook implementation
- **Phase 3** (Pending): Component integration

## Best Practices

1. **Client Components Only**: These hooks use `useState` and `useEffect`, so components using them must be client components (`'use client'`).

2. **Error Handling**: All hooks should include proper error handling and return error states.

3. **TypeScript**: All hooks should be fully typed with explicit return types.

4. **Dependencies**: Use proper dependency arrays in `useEffect` to avoid infinite loops.

## Notes

These are **demo-specific hooks** that wrap the mock MCP client. In a real application, these would interact with an actual MCP client over stdio, HTTP, or WebSocket transport.
