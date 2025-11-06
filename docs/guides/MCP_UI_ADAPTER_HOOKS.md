# MCP UI Adapter Layer - React Hooks

**Use ANY React component library with MCP UI - zero boilerplate!**

The MCP UI Adapter Layer provides React hooks that make it trivial to call MCP tools from any React component, whether you're using shadcn/ui, Radix UI, Material-UI, Chakra UI, or plain HTML.

## Table of Contents

- [Quick Start](#quick-start)
- [Core Concept](#core-concept)
- [API Reference](#api-reference)
  - [useMCPTool](#usemcptool)
  - [useMCPTools](#usemcptools)
  - [MCPProvider](#mcpprovider)
- [Examples](#examples)
- [Patterns](#patterns)
- [TypeScript](#typescript)

---

## Quick Start

### 1. Define Your UI Interface

```typescript
// server.ts
import { InterfaceServer, IUI, ITool } from 'simply-mcp';

interface SearchUI extends IUI {
  uri: 'ui://search';
  name: 'Product Search';

  // ✅ Define which tools this UI can call
  tools: ['search_products', 'add_to_cart'];

  // Your UI source (React component)
  source: './SearchComponent.tsx';
}

interface SearchTool extends ITool {
  name: 'search_products';
  description: 'Search for products';
  params: { query: string };
  result: { products: Product[] };
}

export default class MyServer {
  search_products: SearchTool = async ({ query }) => {
    // Your search logic
    return { products: [...] };
  };
}
```

### 2. Use the Hook in Your React Component

```tsx
// SearchComponent.tsx
import React, { useState } from 'react';
import { useMCPTool } from 'simply-mcp/client';
import { Button } from '@/components/ui/button'; // shadcn or ANY button!

export default function SearchComponent() {
  const [query, setQuery] = useState('');

  // ✅ Just use the hook - that's it!
  const search = useMCPTool('search_products', {
    onSuccess: (data) => console.log('Found:', data.products.length),
  });

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Button
        onClick={() => search.execute({ query })}
        disabled={search.loading}
      >
        {search.loading ? 'Searching...' : 'Search'}
      </Button>

      {search.data && (
        <div>Found {search.data.products.length} products</div>
      )}
    </div>
  );
}
```

**That's it!** No specialized components, no custom wrappers - just clean, declarative code.

---

## Core Concept

### The Problem We Solved

**Before (Manual):**

```tsx
// ❌ Lots of boilerplate
function SearchUI() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (query) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.callTool('search', { query });
      const parsed = JSON.parse(result.content[0].text);
      setData(parsed);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={() => handleSearch('test')}>
      {loading ? 'Loading...' : 'Search'}
    </Button>
  );
}
```

**After (With Hook):**

```tsx
// ✅ Clean and declarative
function SearchUI() {
  const search = useMCPTool('search');

  return (
    <Button
      onClick={() => search.execute({ query: 'test' })}
      disabled={search.loading}
    >
      {search.loading ? 'Loading...' : 'Search'}
    </Button>
  );
}
```

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│ YOUR COMPONENT (Any library!)                              │
│                                                             │
│  const search = useMCPTool('search')                       │
│  <Button onClick={() => search.execute()}>Search</Button> │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ useMCPTool handles:
                         │  - Loading state
                         │  - Error handling
                         │  - Data parsing
                         │  - Request deduplication
                         │  - Optimistic updates
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ window.callTool (Auto-injected by simply-mcp)              │
│  - Security whitelist enforcement                          │
│  - PostMessage communication                               │
│  - Promise-based API                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## API Reference

### `useMCPTool`

Hook for calling a single MCP tool with automatic state management.

#### Signature

```typescript
function useMCPTool<TData = any>(
  toolName: string,
  options?: UseMCPToolOptions<TData>
): UseMCPToolResult<TData>
```

#### Options

```typescript
interface UseMCPToolOptions<TData> {
  // Called when tool execution succeeds
  onSuccess?: (data: TData, result: MCPToolResult) => void;

  // Called when tool execution fails
  onError?: (error: Error) => void;

  // Called before execution (for optimistic updates)
  onMutate?: (params: any) => void | Promise<void>;

  // Enable optimistic loading state (default: true)
  optimistic?: boolean;

  // Parse result ('json' | 'text' | 'raw', default: 'json')
  parseAs?: 'json' | 'text' | 'raw';

  // Retry failed requests (default: 0)
  retries?: number;

  // Retry delay in ms (default: 1000)
  retryDelay?: number;

  // Deduplicate simultaneous requests (default: true)
  deduplicate?: boolean;
}
```

#### Return Value

```typescript
interface UseMCPToolResult<TData> {
  // Execute the tool
  execute: (params?: any) => Promise<TData>;

  // Loading state
  loading: boolean;

  // Parsed data from last successful execution
  data: TData | null;

  // Error from last failed execution
  error: Error | null;

  // Reset to initial state
  reset: () => void;

  // Whether tool has been called at least once
  called: boolean;
}
```

#### Examples

**Basic Usage:**

```tsx
const search = useMCPTool('search');

// Execute
await search.execute({ query: 'laptop' });

// Use state
if (search.loading) return <div>Loading...</div>;
if (search.error) return <div>Error: {search.error.message}</div>;
if (search.data) return <div>Results: {search.data.length}</div>;
```

**With TypeScript:**

```tsx
interface SearchResult {
  products: Array<{ id: string; name: string; price: number }>;
  totalCount: number;
}

const search = useMCPTool<SearchResult>('search', {
  onSuccess: (data) => {
    // data is typed as SearchResult
    console.log(`Found ${data.totalCount} products`);
  }
});

// search.data is SearchResult | null
```

**With Callbacks:**

```tsx
const search = useMCPTool('search', {
  onSuccess: (data) => {
    console.log('Success!', data);
    window.notify('success', `Found ${data.length} results`);
  },
  onError: (error) => {
    console.error('Failed:', error);
    window.notify('error', error.message);
  },
  optimistic: true
});
```

**With Retries:**

```tsx
const search = useMCPTool('search', {
  retries: 3,          // Retry up to 3 times
  retryDelay: 2000,    // Wait 2 seconds between retries
});
```

**Parse as Text (not JSON):**

```tsx
const exportTool = useMCPTool('export_data', {
  parseAs: 'text', // Returns filename string, not parsed JSON
});

const filename = await exportTool.execute({ format: 'csv' });
console.log('Exported to:', filename);
```

---

### `useMCPTools`

Hook for managing multiple MCP tools simultaneously.

#### Signature

```typescript
function useMCPTools<T extends ToolDefinitions>(
  tools: T,
  globalOptions?: UseMCPToolOptions,
  toolOptions?: ToolOptionsMap<T>
): UseMCPToolsResult<T>
```

#### Types

```typescript
// Map of local names to MCP tool names
type ToolDefinitions = Record<string, string>;

// Per-tool options
type ToolOptionsMap<T> = {
  [K in keyof T]?: UseMCPToolOptions;
};

// Result - maps each tool to its hook result
type UseMCPToolsResult<T> = {
  [K in keyof T]: UseMCPToolResult;
};
```

#### Example

```tsx
const tools = useMCPTools(
  {
    // Map friendly names to MCP tool names
    search: 'search_products',
    addToCart: 'add_to_cart',
    getStats: 'get_dashboard_stats'
  },
  {
    // Global options for all tools
    optimistic: true,
    parseAs: 'json'
  },
  {
    // Per-tool options
    search: {
      onSuccess: (data) => console.log('Search:', data)
    },
    addToCart: {
      onSuccess: () => window.notify('success', 'Added to cart!')
    }
  }
);

// Use individual tools
await tools.search.execute({ query: 'laptop' });
await tools.addToCart.execute({ productId: '123' });

// Check state
if (tools.search.loading) { /* ... */ }
if (tools.addToCart.error) { /* ... */ }
```

#### Helper Functions

```typescript
import {
  isAnyLoading,
  areAllLoading,
  hasAnyError,
  getAllErrors,
  resetAllTools
} from 'simply-mcp/client';

const tools = useMCPTools({ search: 'search', add: 'add' });

// Check if any tool is loading
if (isAnyLoading(tools)) {
  return <div>Loading...</div>;
}

// Check if any tool has errors
if (hasAnyError(tools)) {
  const errors = getAllErrors(tools);
  return <div>Errors: {errors.map(e => e.message).join(', ')}</div>;
}

// Reset all tools
resetAllTools(tools);
```

---

### `MCPProvider`

Optional context provider for global configuration.

#### Signature

```typescript
function MCPProvider(props: MCPProviderProps): JSX.Element
```

#### Props

```typescript
interface MCPProviderProps {
  children: ReactNode;

  // Default options for all hooks
  defaultOptions?: Partial<UseMCPToolOptions>;

  // Global error handler
  onError?: (error: Error, toolName: string) => void;

  // Global success handler
  onSuccess?: (data: any, toolName: string) => void;

  // Default parse mode
  parseAs?: 'json' | 'text' | 'raw';

  // Default optimistic setting
  optimistic?: boolean;

  // Default retry count
  retries?: number;

  // Default retry delay
  retryDelay?: number;
}
```

#### Example

```tsx
import { MCPProvider } from 'simply-mcp/client';

function App() {
  return (
    <MCPProvider
      onError={(err, toolName) => {
        console.error(`Tool ${toolName} failed:`, err);
        toast.error(`${toolName} failed: ${err.message}`);
      }}
      onSuccess={(data, toolName) => {
        console.log(`Tool ${toolName} succeeded`);
      }}
      optimistic={true}
      retries={3}
    >
      <YourUI />
    </MCPProvider>
  );
}
```

---

## Examples

### Example 1: Search with shadcn Button

```tsx
import { useMCPTool } from 'simply-mcp/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function SearchUI() {
  const [query, setQuery] = useState('');
  const search = useMCPTool('search_products');

  return (
    <div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <Button
        onClick={() => search.execute({ query })}
        disabled={search.loading}
      >
        {search.loading ? 'Searching...' : 'Search'}
      </Button>

      {search.data?.products.map(p => (
        <div key={p.id}>{p.name}</div>
      ))}
    </div>
  );
}
```

### Example 2: Dashboard with Multiple Tools

```tsx
import { useMCPTools, isAnyLoading } from 'simply-mcp/client';
import { Button } from '@/components/ui/button';

function Dashboard() {
  const tools = useMCPTools({
    getStats: 'get_dashboard_stats',
    refresh: 'refresh_data',
    exportData: 'export_dashboard'
  });

  useEffect(() => {
    tools.getStats.execute({ timeRange: 'week' });
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>

      <Button
        onClick={() => tools.refresh.execute()}
        disabled={isAnyLoading(tools)}
      >
        Refresh
      </Button>

      {tools.getStats.data && (
        <div>
          <div>Users: {tools.getStats.data.users}</div>
          <div>Revenue: ${tools.getStats.data.revenue}</div>
        </div>
      )}
    </div>
  );
}
```

### Example 3: Optimistic Cart Updates

```tsx
import { useMCPTool } from 'simply-mcp/client';
import { Button } from '@/components/ui/button';

function ProductCard({ product }) {
  const [inCart, setInCart] = useState(false);

  const addToCart = useMCPTool('add_to_cart', {
    onMutate: () => {
      // Optimistic update - show in cart immediately
      setInCart(true);
    },
    onError: () => {
      // Rollback on error
      setInCart(false);
    }
  });

  return (
    <div>
      <h3>{product.name}</h3>
      <Button
        onClick={() => addToCart.execute({ productId: product.id })}
        disabled={inCart || addToCart.loading}
      >
        {inCart ? '✓ In Cart' : 'Add to Cart'}
      </Button>
    </div>
  );
}
```

---

## Patterns

### Pattern 1: Loading States

```tsx
const search = useMCPTool('search');

// Simple loading
if (search.loading) return <Spinner />;

// Loading with skeleton
return (
  <div>
    {search.loading ? (
      <Skeleton count={5} />
    ) : (
      search.data?.map(item => <Item key={item.id} {...item} />)
    )}
  </div>
);

// Disabled button
<Button disabled={search.loading}>
  {search.loading ? 'Loading...' : 'Search'}
</Button>
```

### Pattern 2: Error Handling

```tsx
const search = useMCPTool('search');

// Inline error
{search.error && <Alert variant="error">{search.error.message}</Alert>}

// Error boundary style
if (search.error) {
  return <ErrorDisplay error={search.error} retry={search.reset} />;
}

// Toast notification
const search = useMCPTool('search', {
  onError: (err) => toast.error(err.message)
});
```

### Pattern 3: Optimistic Updates

```tsx
const [items, setItems] = useState([]);

const addItem = useMCPTool('add_item', {
  onMutate: (params) => {
    // Add with temporary ID
    setItems([...items, { id: 'temp', ...params }]);
  },
  onSuccess: (newItem) => {
    // Replace temp with real item
    setItems(prev => [...prev.filter(i => i.id !== 'temp'), newItem]);
  },
  onError: () => {
    // Remove temp on error
    setItems(prev => prev.filter(i => i.id !== 'temp'));
  }
});
```

### Pattern 4: Dependent Queries

```tsx
const product = useMCPTool('get_product');
const reviews = useMCPTool('get_reviews');

useEffect(() => {
  // Load product first
  product.execute({ id: '123' });
}, []);

useEffect(() => {
  // Load reviews after product loads
  if (product.data) {
    reviews.execute({ productId: product.data.id });
  }
}, [product.data]);
```

---

## TypeScript

### Typed Tool Results

```typescript
interface SearchResult {
  products: Product[];
  totalCount: number;
  facets: Facet[];
}

const search = useMCPTool<SearchResult>('search');

// search.data is SearchResult | null
// search.execute() returns Promise<SearchResult>
```

### Typed Multiple Tools

```typescript
interface DashboardStats {
  users: number;
  revenue: number;
}

interface ActivityLog {
  logs: LogEntry[];
}

const tools = useMCPTools({
  getStats: 'get_dashboard_stats',
  getActivity: 'get_activity_log'
});

// tools.getStats.data is typed from inference
// Or specify explicitly:
const stats = tools.getStats.data as DashboardStats | null;
```

### Type-Safe Params

```typescript
interface SearchParams {
  query: string;
  filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
  };
}

const search = useMCPTool<SearchResult>('search');

// TypeScript checks params
await search.execute({
  query: 'laptop',
  filters: { minPrice: 100 }
} satisfies SearchParams);
```

---

## FAQ

**Q: Do I need specialized MCP components?**

A: **No!** Use ANY React component library (shadcn, Radix, MUI, Chakra, etc.)

**Q: Does this work with React Native?**

A: Not currently - MCP UI runs in web browsers with iframe sandboxing.

**Q: Can I use this with form libraries like React Hook Form?**

A: Yes! Just call `tool.execute()` in your form submit handler.

**Q: How do I handle authentication tokens?**

A: MCP handles auth automatically. Just call tools - the whitelist ensures security.

**Q: Can I call multiple tools in parallel?**

A: Yes! Use `Promise.all([tool1.execute(), tool2.execute()])` or `useMCPTools`.

**Q: What if window.callTool doesn't exist?**

A: The hook checks and throws a helpful error. This means you're not in an MCP UI context.

---

## What's Next?

- See [MCP UI Protocol Guide](./MCP_UI_PROTOCOL.md) for how UI resources work
- See [Examples](../../examples/ui-with-hooks/) for complete working examples
- See [TypeScript Types](../../src/client/hooks/) for full type definitions

---

**Built with ❤️ by the Simply-MCP team**
