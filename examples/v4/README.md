# IUI v4.0 Examples

Welcome to the IUI v4.0 examples! These examples showcase the new minimal API and auto-detection capabilities.

## 🎯 What's New in v4.0?

**From 30+ fields to just 4 required + 1 source field!**

### Before (v3.x):
```typescript
interface OldUI extends IUI {
  uri: 'ui://example';
  name: 'Example';
  description: 'Example UI';
  component: './Dashboard.tsx';          // Separate field
  dependencies: ['react', 'recharts'];   // Manual list
  bundle: { minify: true };              // Inline config
  stylesheets: ['./styles.css'];         // Manual list
  // ... 20+ more fields
}
```

### After (v4.0):
```typescript
interface NewUI extends IUI {
  uri: 'ui://example';
  name: 'Example';
  description: 'Example UI';
  source: './Dashboard.tsx';  // That's it!
  // Dependencies auto-extracted from imports
  // Build config loaded from simply-mcp.config.ts
  // Everything else is automatic!
}
```

## 📚 Examples Overview

### Basic Examples

1. **[01-minimal.ts](./01-minimal.ts)** - Simplest possible IUI with inline HTML
2. **[02-external-url.ts](./02-external-url.ts)** - Link to external dashboards
3. **[03-react-component.ts](./03-react-component.ts)** - React components with auto-detection
4. **[04-dynamic-callable.ts](./04-dynamic-callable.ts)** - Server-side generated UIs
5. **[05-folder-based.ts](./05-folder-based.ts)** - Complete apps from folders
6. **[06-remote-dom.ts](./06-remote-dom.ts)** - Declarative JSON-based UIs

### Advanced Examples

7. **[07-with-tools.ts](./07-with-tools.ts)** - Interactive UIs calling MCP tools
8. **[08-with-config.ts](./08-with-config.ts)** - Custom build configuration

## 🚀 Quick Start

### 1. Minimal Example (Fastest)

```bash
npm start examples/v4/01-minimal.ts
```

### 2. React Component Example

```bash
npm start examples/v4/03-react-component.ts
```

### 3. Dynamic UI Example

```bash
npm start examples/v4/04-dynamic-callable.ts
```

## 🎨 Source Types

The `source` field auto-detects 6 different types:

| Type | Example | Detection |
|------|---------|-----------|
| **External URL** | `https://example.com` | Starts with `http://` or `https://` |
| **Inline HTML** | `<div>Hello</div>` | Starts with `<` or contains HTML tags |
| **Inline Remote DOM** | `{"type":"div",...}` | Valid JSON with `type` field |
| **HTML File** | `./page.html` | `.html` or `.htm` extension |
| **React Component** | `./Dashboard.tsx` | `.tsx` or `.jsx` extension |
| **Folder** | `./ui/dashboard/` | Ends with `/` or contains `index.html` |

## ⚙️ Build Configuration

### Zero-Config (Default)

No config file needed! Smart defaults based on `NODE_ENV`:

```typescript
{
  build: {
    bundle: true,
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV !== 'production',
    external: ['react', 'react-dom'],
    format: 'iife',
  }
}
```

### Custom Config (Optional)

Create `simply-mcp.config.ts` in project root:

```typescript
export default {
  build: {
    minify: true,
    sourcemap: false,
    external: ['react', 'react-dom', 'recharts'],
  },
  cdn: {
    baseUrl: 'https://cdn.jsdelivr.net/npm',
    sri: true,
    compression: 'gzip',
  },
  performance: {
    track: true,
    report: true,
  }
};
```

## 🧩 Auto-Detection Features

### Dependency Extraction

Dependencies are **automatically extracted** from your imports:

```typescript
// In your component:
import React from 'react';
import { LineChart } from 'recharts';
import { formatDate } from 'date-fns';
import { Button } from './components/Button';  // Local import

// Framework extracts:
// - NPM packages: ['react', 'recharts', 'date-fns']
// - Local files: ['./components/Button']
// - Filters out externals from config
// - Injects CDN scripts automatically
```

### File Watching

All relevant files are **automatically tracked** for hot reloading:

- Component files (`.tsx`, `.jsx`)
- Local imports
- Stylesheets (`.css`)
- Scripts (`.js`)
- HTML files

## 📖 Migration from v3.x

### Field Mapping

| v3.x Field | v4.0 Equivalent |
|------------|-----------------|
| `html` | `source` (auto-detected as inline HTML) |
| `file` | `source` (auto-detected by `.html` extension) |
| `component` | `source` (auto-detected by `.tsx`/`.jsx`) |
| `externalUrl` | `source` (auto-detected by `https://`) |
| `remoteDom` | `source` (auto-detected by JSON structure) |
| `dependencies` | Auto-extracted from imports ✨ |
| `stylesheets` | Auto-extracted from imports ✨ |
| `scripts` | Auto-extracted from imports ✨ |
| `bundle` | `simply-mcp.config.ts` |
| `minify` | `simply-mcp.config.ts` |
| `cdn` | `simply-mcp.config.ts` |
| `performance` | `simply-mcp.config.ts` |

### Example Migration

**Before:**
```typescript
interface OldDashboard extends IUI {
  uri: 'ui://dashboard';
  name: 'Dashboard';
  description: 'Analytics dashboard';
  component: './Dashboard.tsx';
  dependencies: ['react', 'recharts', 'date-fns'];
  bundle: { minify: true, sourcemap: false };
  size: { width: 1280, height: 800 };
}
```

**After:**
```typescript
interface NewDashboard extends IUI {
  uri: 'ui://dashboard';
  name: 'Dashboard';
  description: 'Analytics dashboard';
  source: './Dashboard.tsx';  // Everything else is automatic!
  size: { width: 1280, height: 800 };  // Optional fields stay
}
```

## 🔧 Troubleshooting

### Source Type Not Detected

If source type detection fails, check:

1. **File exists:** Relative paths must be resolvable
2. **Extension is correct:** `.tsx` for components, `.html` for HTML
3. **Trailing slash for folders:** `./ui/dashboard/` (not `./ui/dashboard`)

### Dependencies Not Loading

If dependencies aren't injected:

1. **Check imports:** Must be standard ES6 imports
2. **Check externals:** Config might be excluding the package
3. **Check console:** Look for extraction errors

### Build Config Not Applied

If config isn't working:

1. **File location:** Must be in project root as `simply-mcp.config.ts`
2. **Export format:** Must use `export default { ... }`
3. **TypeScript:** Config file should be TypeScript (`.ts`)

## 💡 Tips & Best Practices

1. **Start Simple:** Use inline HTML for prototypes, upgrade to components later
2. **Use Zero-Config:** Only create config file when you need customization
3. **Leverage Auto-Detection:** Let the framework handle dependencies
4. **Watch Mode:** Enable watch mode for live reloading during development
5. **Production Builds:** Use `NODE_ENV=production` for optimized builds

## 📚 Further Reading

- [API Reference](../../docs/guides/API_REFERENCE.md)
- [Config Reference](../../docs/guides/CONFIG_REFERENCE.md)
- [Design Philosophy](../../docs/guides/IUI_DESIGN_PHILOSOPHY.md)

## 🆘 Need Help?

- [GitHub Issues](https://github.com/anthropics/simply-mcp-ts/issues)
- [Documentation](../../docs/guides/)
- [CHANGELOG](../../CHANGELOG.md)

---

**IUI v4.0** - Minimal API, Maximum Power ✨
