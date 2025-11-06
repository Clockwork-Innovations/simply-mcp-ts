# MCP UI with React Hooks - Examples

Examples demonstrating the MCP UI Adapter Layer with React hooks.

## What's This?

These examples show how to use **ANY React component library** (shadcn, Radix, MUI, Chakra, etc.) with MCP UI using the `useMCPTool` and `useMCPTools` hooks.

**No specialized MCP components needed!** Just use your favorite UI library as-is.

## Examples

### 1. SearchExample.tsx

Product search UI demonstrating:
- `useMCPTool` for single tool management
- Works with shadcn-style Button and Input components
- Automatic loading/error/data state management
- Optimistic cart updates
- TypeScript types

**Key Features:**
- ✅ Zero boilerplate
- ✅ Works with ANY button component
- ✅ Automatic state management
- ✅ Optimistic updates built-in

```tsx
import { useMCPTool } from 'simply-mcp/client';
import { Button } from '@/components/ui/button';

const search = useMCPTool('search_products');

<Button onClick={() => search.execute({ query: 'laptop' })}>
  {search.loading ? 'Searching...' : 'Search'}
</Button>
```

### 2. DashboardExample.tsx

Dashboard with multiple tools demonstrating:
- `useMCPTools` for managing multiple tools
- `MCPProvider` for global configuration
- Helper functions (`isAnyLoading`, `hasAnyError`)
- Real-world dashboard patterns
- Refresh/export/cache operations

**Key Features:**
- ✅ Manage multiple tools with one hook
- ✅ Global error/success handlers
- ✅ Helper functions for checking state across tools
- ✅ Production-ready patterns

```tsx
import { useMCPTools, isAnyLoading } from 'simply-mcp/client';

const tools = useMCPTools({
  getStats: 'get_dashboard_stats',
  refresh: 'refresh_data'
});

if (isAnyLoading(tools)) return <Spinner />;
```

## How to Use These Examples

### 1. Server Definition

Define your UI interface with the tools it can call:

```typescript
// server.ts
interface SearchUI extends IUI {
  uri: 'ui://search';
  name: 'Product Search';
  tools: ['search_products', 'add_to_cart']; // ✅ Whitelist
  source: './SearchExample.tsx';
}
```

### 2. Import the Hook

```tsx
// SearchExample.tsx
import { useMCPTool } from 'simply-mcp/client';
```

### 3. Use ANY Component

```tsx
// Works with shadcn
import { Button } from '@/components/ui/button';

// Works with Radix
import { Button } from '@radix-ui/themes';

// Works with MUI
import Button from '@mui/material/Button';

// Works with native HTML
<button onClick={...}>Search</button>
```

All work exactly the same way!

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ YOUR COMPONENT (Any library - shadcn, Radix, MUI, etc.)│
│  const search = useMCPTool('search')                   │
│  <Button onClick={() => search.execute()}>Search</Button>│
└─────────────────────────────────────────────────────────┘
                        │
                        │ Hook manages:
                        │  - Loading state
                        │  - Error handling
                        │  - Data parsing
                        │  - Deduplication
                        ▼
┌─────────────────────────────────────────────────────────┐
│ window.callTool (Auto-injected)                        │
│  - Security whitelist                                  │
│  - PostMessage protocol                                │
│  - Promise-based API                                   │
└─────────────────────────────────────────────────────────┘
```

## Key Benefits

✅ **Zero Boilerplate** - No manual state management
✅ **Any Component Library** - Works with all React components
✅ **Type-Safe** - Full TypeScript support
✅ **Optimistic Updates** - Built-in support
✅ **Error Handling** - Automatic error state
✅ **Loading States** - Automatic loading flags
✅ **Request Deduplication** - Prevent duplicate calls
✅ **Retries** - Built-in retry logic

## Documentation

See [MCP UI Adapter Hooks Guide](../../docs/guides/MCP_UI_ADAPTER_HOOKS.md) for complete documentation.

## What You Get

### Before (Manual):

```tsx
// ❌ 30+ lines of boilerplate
const [loading, setLoading] = useState(false);
const [data, setData] = useState(null);
const [error, setError] = useState(null);

const handleSearch = async () => {
  setLoading(true);
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
```

### After (With Hook):

```tsx
// ✅ 3 lines!
const search = useMCPTool('search');

<Button onClick={() => search.execute({ query })}>Search</Button>
```

**90% less code, 100% more maintainable!**
