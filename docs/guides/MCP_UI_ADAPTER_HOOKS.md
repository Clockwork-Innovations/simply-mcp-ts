# MCP UI Adapter Layer - React Hooks

**Use ANY React component library with MCP UI - zero boilerplate!**

The MCP UI Adapter Layer provides React hooks that make it trivial to call MCP tools from any React component, whether you're using shadcn/ui, Radix UI, Material-UI, Chakra UI, or plain HTML.

## Table of Contents

- [Quick Start](#quick-start)
- [Core Concept](#core-concept)
- [API Reference](#api-reference)
  - [useMCPTool](#usemcptool)
  - [Multiple Tools & Helper Utilities](#multiple-tools--helper-utilities)
  - [MCPProvider](#mcpprovider)
- [MCP UI Protocol Action Hooks](#mcp-ui-protocol-action-hooks)
  - [usePromptSubmit](#usepromptsubmit)
  - [useIntent](#useintent)
  - [useNotify](#usenotify)
  - [useOpenLink](#useopenlink)
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

### Multiple Tools & Helper Utilities

**Standard React Pattern:** Call `useMCPTool` multiple times (like `useState`, `useQuery`, etc.)

#### Example: Multiple Tools

```tsx
import { useMCPTool } from 'simply-mcp/client';

function Dashboard() {
  // ✅ Standard React pattern: call the hook multiple times
  const search = useMCPTool('search_products', {
    onSuccess: (data) => console.log('Search:', data)
  });

  const addToCart = useMCPTool('add_to_cart', {
    onSuccess: () => window.notify('success', 'Added to cart!')
  });

  const getStats = useMCPTool('get_dashboard_stats');

  // Use each tool independently
  return (
    <div>
      <button onClick={() => search.execute({ query: 'laptop' })}>
        {search.loading ? 'Searching...' : 'Search'}
      </button>

      <button onClick={() => addToCart.execute({ id: '123' })}>
        {addToCart.loading ? 'Adding...' : 'Add to Cart'}
      </button>

      {search.data && <div>Results: {search.data.length}</div>}
      {addToCart.error && <div>Error: {addToCart.error.message}</div>}
    </div>
  );
}
```

#### Helper Functions for Multiple Tools

Work with arrays of tool results for aggregate operations:

```typescript
import {
  useMCPTool,
  isAnyLoading,
  areAllLoading,
  hasAnyError,
  getAllErrors,
  resetAllTools
} from 'simply-mcp/client';

function Dashboard() {
  const search = useMCPTool('search');
  const add = useMCPTool('add_to_cart');
  const stats = useMCPTool('get_stats');

  // Group tools in an array for helpers
  const tools = [search, add, stats];

  // Check if any tool is loading
  if (isAnyLoading(tools)) {
    return <div>Loading...</div>;
  }

  // Check if all tools are loading
  if (areAllLoading(tools)) {
    return <div>All operations in progress...</div>;
  }

  // Check if any tool has errors
  if (hasAnyError(tools)) {
    const errors = getAllErrors(tools);
    return <div>Errors: {errors.map(e => e.message).join(', ')}</div>;
  }

  // Reset all tools at once
  const handleReset = () => resetAllTools(tools);

  return <div>...</div>;
}
```

#### Helper Function Signatures

```typescript
// Check if any tools are loading
function isAnyLoading(tools: UseMCPToolResult<any>[]): boolean

// Check if all tools are loading
function areAllLoading(tools: UseMCPToolResult<any>[]): boolean

// Check if any tools have errors
function hasAnyError(tools: UseMCPToolResult<any>[]): boolean

// Get all errors from tools
function getAllErrors(tools: UseMCPToolResult<any>[]): Error[]

// Reset all tools to initial state
function resetAllTools(tools: UseMCPToolResult<any>[]): void
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

## MCP UI Protocol Action Hooks

The following hooks provide convenient React APIs for the 5 core MCP UI protocol actions. While `window.*` functions work for simple cases, these hooks provide:

- ✅ State tracking (loading, history)
- ✅ Error handling with callbacks
- ✅ Memory leak prevention
- ✅ History tracking and management
- ✅ Additional features (debouncing, rate limiting, validation)

---

### `usePromptSubmit`

Hook for submitting prompts to the LLM.

#### Signature

```typescript
function usePromptSubmit(options?: UsePromptSubmitOptions): UsePromptSubmitResult
```

#### Options

```typescript
interface UsePromptSubmitOptions {
  // Called when prompt is submitted
  onSubmit?: (prompt: string) => void;

  // Called on submission error
  onError?: (error: Error, prompt: string) => void;

  // Prevent duplicate submissions
  preventDuplicates?: boolean; // default: false

  // Track submission history
  trackHistory?: boolean; // default: true

  // Maximum history size
  maxHistorySize?: number; // default: 50
}
```

#### Return Value

```typescript
interface UsePromptSubmitResult {
  submit: (prompt: string) => void;
  submitting: boolean;
  lastPrompt: string | null;
  history: string[];
  clearHistory: () => void;
  error: Error | null;
}
```

#### Example

```tsx
import { usePromptSubmit } from 'simply-mcp/client';

function PromptInput() {
  const [text, setText] = useState('');

  const promptSubmit = usePromptSubmit({
    onSubmit: (prompt) => console.log('Submitted:', prompt),
    onError: (err) => console.error('Failed:', err),
    preventDuplicates: true,
  });

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        onClick={() => {
          promptSubmit.submit(text);
          setText('');
        }}
        disabled={promptSubmit.submitting}
      >
        Submit to LLM
      </button>

      {/* Show history */}
      <div>
        {promptSubmit.history.map((prompt, i) => (
          <div key={i}>{prompt}</div>
        ))}
      </div>
    </div>
  );
}
```

**Simple Alternative:** For basic usage, you can use `window.submitPrompt('your prompt')` directly.

---

### `useIntent`

Hook for triggering application intents (navigation, actions, etc.).

#### Signature

```typescript
function useIntent(intentName: string, options?: UseIntentOptions): UseIntentResult
```

#### Options

```typescript
interface UseIntentOptions {
  // Called when intent is triggered
  onTrigger?: (params: any) => void;

  // Called on trigger error
  onError?: (error: Error, params: any) => void;

  // Debounce delay in ms
  debounce?: number; // default: 0

  // Track trigger history
  trackHistory?: boolean; // default: true

  // Maximum history size
  maxHistorySize?: number; // default: 50
}
```

#### Return Value

```typescript
interface UseIntentResult {
  trigger: (params?: any) => void;
  triggering: boolean;
  lastParams: any | null;
  history: IntentHistoryEntry[];
  clearHistory: () => void;
  error: Error | null;
}
```

#### Example

```tsx
import { useIntent } from 'simply-mcp/client';

function Navigation() {
  const navigate = useIntent('navigate', {
    onTrigger: (params) => console.log('Navigating to:', params.page),
    debounce: 300, // Debounce rapid clicks
  });

  return (
    <div>
      <button onClick={() => navigate.trigger({ page: 'dashboard' })}>
        Dashboard
      </button>
      <button onClick={() => navigate.trigger({ page: 'settings' })}>
        Settings
      </button>

      {/* Show where we've navigated */}
      <div>
        Last: {navigate.lastParams?.page}
      </div>
    </div>
  );
}
```

**Simple Alternative:** For basic usage, you can use `window.triggerIntent('intentName', params)` directly.

---

### `useNotify`

Hook for sending notifications to the user.

#### Signature

```typescript
function useNotify(options?: UseNotifyOptions): UseNotifyResult
```

#### Options

```typescript
interface UseNotifyOptions {
  // Called when notification is sent
  onNotify?: (level: NotificationLevel, message: string) => void;

  // Called on notification error
  onError?: (error: Error) => void;

  // Rate limiting
  rateLimit?: {
    maxPerMinute: number;
    burst?: number;
  };
}

type NotificationLevel = 'info' | 'success' | 'warning' | 'error';
```

#### Return Value

```typescript
interface UseNotifyResult {
  notify: (level: NotificationLevel, message: string) => void;

  // Convenience methods
  info: (message: string) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;

  notifying: boolean;
  lastNotification: { level: NotificationLevel; message: string } | null;
  error: Error | null;
}
```

#### Example

```tsx
import { useNotify } from 'simply-mcp/client';

function MyComponent() {
  const notifications = useNotify({
    onNotify: (level, msg) => console.log(`[${level}] ${msg}`),
    rateLimit: { maxPerMinute: 10 },
  });

  return (
    <div>
      <button onClick={() => notifications.info('Hello!')}>
        Info
      </button>
      <button onClick={() => notifications.success('Saved!')}>
        Success
      </button>
      <button onClick={() => notifications.warning('Be careful!')}>
        Warning
      </button>
      <button onClick={() => notifications.error('Something broke!')}>
        Error
      </button>
    </div>
  );
}
```

**Simple Alternative:** For basic usage, you can use `window.notify('level', 'message')` directly.

---

### `useOpenLink`

Hook for opening external URLs with validation and security.

#### Signature

```typescript
function useOpenLink(options?: UseOpenLinkOptions): UseOpenLinkResult
```

#### Options

```typescript
interface UseOpenLinkOptions {
  // Called when link is opened
  onOpen?: (url: string) => void;

  // Called on open error
  onError?: (error: Error, url: string) => void;

  // Validate URLs before opening
  validateUrl?: boolean; // default: true

  // Allow only HTTPS URLs
  httpsOnly?: boolean; // default: false

  // Track opening history
  trackHistory?: boolean; // default: true

  // Maximum history size
  maxHistorySize?: number; // default: 50

  // Allowed domains (empty = all allowed)
  allowedDomains?: string[]; // default: []
}
```

#### Return Value

```typescript
interface UseOpenLinkResult {
  open: (url: string) => void;
  opening: boolean;
  lastUrl: string | null;
  history: LinkHistoryEntry[];
  clearHistory: () => void;
  error: Error | null;
}
```

#### Example

```tsx
import { useOpenLink } from 'simply-mcp/client';

function ExternalLinks() {
  const linkOpener = useOpenLink({
    validateUrl: true,
    httpsOnly: true,
    allowedDomains: ['example.com', 'trusted-site.com'],
    onOpen: (url) => console.log('Opening:', url),
    onError: (err) => console.error('Failed:', err),
  });

  return (
    <div>
      <button onClick={() => linkOpener.open('https://example.com')}>
        Visit Example.com
      </button>

      {/* Show recently opened links */}
      <div>
        {linkOpener.history.map((entry, i) => (
          <div key={i}>{entry.url}</div>
        ))}
      </div>
    </div>
  );
}
```

**Simple Alternative:** For basic usage, you can use `window.openLink('url')` directly.

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
import { useMCPTool, isAnyLoading } from 'simply-mcp/client';
import { Button } from '@/components/ui/button';

function Dashboard() {
  // Standard React pattern: call the hook multiple times
  const getStats = useMCPTool('get_dashboard_stats');
  const refresh = useMCPTool('refresh_data');
  const exportData = useMCPTool('export_dashboard');

  useEffect(() => {
    getStats.execute({ timeRange: 'week' });
  }, []);

  // Use helper with array of tools
  const tools = [getStats, refresh, exportData];

  return (
    <div>
      <h1>Dashboard</h1>

      <Button
        onClick={() => refresh.execute()}
        disabled={isAnyLoading(tools)}
      >
        Refresh
      </Button>

      {getStats.data && (
        <div>
          <div>Users: {getStats.data.users}</div>
          <div>Revenue: ${getStats.data.revenue}</div>
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

### Pattern 3: Optimistic Updates (React Query Style)

**✅ RECOMMENDED: Use context passing for automatic rollback**

```tsx
const [items, setItems] = useState([]);

// Define context type for type safety
interface AddItemContext {
  previousItems: Item[];
  tempId: string;
}

const addItem = useMCPTool<Item, AddItemContext>('add_item', {
  onMutate: (params) => {
    // 1. Snapshot current state
    const previousItems = [...items];

    // 2. Create temp item
    const tempId = `temp-${Date.now()}`;
    const optimisticItem = { id: tempId, ...params };

    // 3. Optimistically update
    setItems([...items, optimisticItem]);

    // 4. Return context for rollback
    return { previousItems, tempId };
  },
  onSuccess: (serverItem) => {
    // Replace temp with server-confirmed item
    setItems(prev => prev.map(i =>
      i.id.startsWith('temp-') ? serverItem : i
    ));
  },
  onError: (error, params, context) => {
    // ✅ Automatic rollback using context
    if (context?.previousItems) {
      setItems(context.previousItems);
    }
    // Show error notification
    toast.error(error.message);
  }
});
```

**Key Benefits:**
- ✅ Context is type-safe with generics `<TData, TContext>`
- ✅ Automatic rollback on error
- ✅ No manual state tracking needed
- ✅ Follows React Query best practices
- ✅ Prevents memory leaks (hook checks if mounted)

**Old Pattern (Still Works):**

If you don't need context passing, the simpler pattern still works:

```tsx
const addItem = useMCPTool('add_item', {
  onMutate: (params) => {
    setItems([...items, { id: 'temp', ...params }]);
  },
  onError: () => {
    // Manual rollback
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

// Type each tool individually
const getStats = useMCPTool<DashboardStats>('get_dashboard_stats');
const getActivity = useMCPTool<ActivityLog>('get_activity_log');

// Data is now typed automatically
getStats.data?.users; // number | undefined
getActivity.data?.logs; // LogEntry[] | undefined
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

A: Yes! Use `Promise.all([tool1.execute(), tool2.execute()])` for parallel execution.

**Q: What if window.callTool doesn't exist?**

A: The hook checks and throws a helpful error. This means you're not in an MCP UI context.

---

## What's Next?

- See [MCP UI Protocol Guide](./MCP_UI_PROTOCOL.md) for how UI resources work
- See [Examples](../../examples/ui-with-hooks/) for complete working examples
- See [TypeScript Types](../../src/client/hooks/) for full type definitions

---

**Built with ❤️ by the Simply-MCP team**
