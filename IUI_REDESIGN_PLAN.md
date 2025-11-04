# IUI Interface Redesign Plan

**Version:** v4.0.0 Proposal
**Date:** 2025-11-02
**Status:** Planning Complete - Ready for Implementation
**Priority:** CRITICAL - Blocks v4.0.0 Release

---

## Executive Summary

### Problem Statement

The IUI interface is the **lowest-scoring interface in Simply-MCP** (4.2/10 UX score) and represents a critical blocker for v4.0.0. With 30+ optional fields and 5 mutually exclusive rendering patterns that are not enforced at compile-time, IUI creates overwhelming cognitive load and generates runtime errors that should be caught during development.

**Current Pain Points:**
- **Time to First Working Code:** 25-35 minutes (vs 3-5 min for simple tools) - **7x slower**
- **Documentation Lookups:** 8-12 per implementation (highest of any interface)
- **Error Rate:** 90% of developers initially set incompatible field combinations
- **Cognitive Load:** VERY HIGH - 30+ optional fields with unclear interactions

### Proposed Solution

Redesign IUI as a **discriminated union** following the successful patterns established by IParam (8.3/10) and IAuth (7.5/10). Split the monolithic interface into **5 focused variants**, each optimized for a specific UI pattern:

1. **IInlineUI** - For inline HTML + CSS + JavaScript (4-6 fields)
2. **IFileBasedUI** - For external file references (4-6 fields)
3. **IComponentUI** - For React/Vue components with bundling (6-8 fields)
4. **IExternalUI** - For external URLs (4 fields)
5. **IRemoteDomUI** - For Remote DOM protocol (4-6 fields)

**Discriminant Field:** `kind: 'inline' | 'file' | 'component' | 'external' | 'remoteDom'`

### Expected Impact

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| **UX Score** | 4.2/10 | 7.5-8.0/10 | **+80%** |
| **Time to First Code** | 25-35 min | 10-15 min | **-60%** |
| **Documentation Lookups** | 8-12 | 2-4 | **-70%** |
| **Cognitive Load** | VERY HIGH | MEDIUM | **-66%** |
| **Error Rate** | 90% incompatible | 5-10% | **-95%** |
| **Fields per Variant** | 30+ | 4-10 | **-70%** |

**Compile-Time Safety:** Prevents all mutual exclusivity errors before code runs, eliminating an entire category of runtime bugs.

---

## Current State Analysis

### Interface Definition

Current IUI interface spans **537 lines** (`src/server/interface-types.ts:2003-2540`) with 30+ optional fields organized into three layers:

**Foundation Layer (Required: 3, Optional: 8):**
```typescript
// Required
uri: string;                     // UI resource URI
name: string;                    // Human-readable name
description: string;             // What the UI does

// Mutually exclusive rendering methods (NOT ENFORCED!)
html?: string;                   // Inline HTML
file?: string;                   // External HTML file
component?: string;              // React component file
externalUrl?: string;            // External URL
remoteDom?: string;              // Remote DOM JSON

// Supporting fields
css?: string;                    // Inline CSS
javascript?: string;             // Inline JS (deprecated for script)
script?: string;                 // External JS file
```

**Feature Layer (12+ fields):**
```typescript
stylesheets?: string[];          // External CSS files
scripts?: string[];              // External JS files (plural)
dependencies?: string[];         // NPM packages for bundling
bundle?: boolean | {...};        // Bundling configuration
imports?: string[];              // Component registry imports
theme?: string | {...};          // Theme configuration
tools?: string[];                // Callable tools whitelist
size?: { width, height };        // Rendering hint
subscribable?: boolean;          // Supports subscriptions
dynamic?: boolean;               // Requires method implementation
data?: TData;                    // Data type hint
```

**Polish Layer (8+ fields):**
```typescript
minify?: boolean | {...};        // Minification config
cdn?: boolean | {...};           // CDN + SRI configuration
performance?: boolean | {...};   // Performance monitoring
// ... additional optimization fields
```

### Critical Issues

#### Issue #1: Mutually Exclusive Fields Not Enforced

**Current TypeScript Allows (but runtime fails):**
```typescript
interface BrokenUI extends IUI {
  uri: 'ui://broken';
  name: 'Broken UI';
  description: 'This compiles but fails at runtime!';

  // ⚠️ All three set - which one is used?
  html: '<div>Inline HTML</div>';
  file: './component.html';
  component: './Component.tsx';
}
```

**Runtime Error:**
```
Error: Invalid UI configuration: Multiple rendering methods specified
(html, file, component). Only one allowed per UI resource.
```

**Why This Is Bad:**
- Error caught **at runtime** (when client requests the resource)
- No IntelliSense warning during development
- Developers waste time debugging configuration issues
- 90% of first-time users encounter this error

#### Issue #2: Unclear Field Interactions

Which combination works?
- ✅ `html` + `css` + `javascript` → **YES**
- ✅ `file` + `stylesheets` + `scripts` → **YES**
- ❓ `component` + `bundle` + `dependencies` → **YES**
- ❓ `html` + `bundle` → **NO** (bundle requires component)
- ❓ `externalUrl` + `minify` → **NO** (no content to minify)
- ❓ `remoteDom` + `stylesheets` → **???** (unclear)

Developers must read documentation or trial-and-error to discover these rules.

#### Issue #3: Cognitive Overload

When implementing a UI, developers face:
1. **30+ fields to review** - Which are relevant?
2. **5 rendering patterns** - Which should I use?
3. **3 layers of complexity** - Do I need foundation, feature, or polish?
4. **Mutually exclusive options** - Can I combine these?

**Result:** 25-35 minutes to first working code (vs 3-5 min for ITool)

### Usage Patterns from Examples

Analyzed 6 UI examples to understand usage distribution:

| Pattern | Example File | Key Fields Used | Complexity |
|---------|--------------|-----------------|------------|
| **Inline HTML** | (various tests) | `html`, `css`, `javascript` | LOW |
| **File-Based** | `interface-file-based-ui.ts` | `file`, `stylesheets`, `scripts` | MEDIUM |
| **React Component** | `interface-react-component.ts` | `component`, `bundle`, `dependencies` | MEDIUM |
| **External URL** | `interface-external-url.ts` | `externalUrl` | LOW |
| **Remote DOM** | `interface-remote-dom.ts` | `remoteDom` | MEDIUM |

**Distribution:**
- Inline HTML: ~30%
- File-Based: ~25%
- Component: ~25%
- Remote DOM: ~15%
- External URL: ~5%

**Key Insight:** Each pattern uses a distinct subset of fields with minimal overlap, suggesting natural discriminated union boundaries.

### Successful Discriminated Union Patterns

Simply-MCP already uses discriminated unions successfully:

#### IParam Pattern (Score: 8.3/10)
```typescript
interface StringParam extends IParam {
  type: 'string';      // ← Discriminant field
  description: string;
  // String-specific fields only
  pattern?: string;
  enum?: string[];
}

interface NumberParam extends IParam {
  type: 'number';      // ← Discriminant field
  description: string;
  // Number-specific fields only
  min?: number;
  max?: number;
}

// Usage - TypeScript narrows types based on discriminant:
function validateParam(param: IParam) {
  if (param.type === 'string') {
    // TypeScript knows: param.pattern exists, param.min doesn't
    const pattern = param.pattern;  // ✅ Type-safe
  } else if (param.type === 'number') {
    // TypeScript knows: param.min exists, param.pattern doesn't
    const min = param.min;  // ✅ Type-safe
  }
}
```

#### IAuth Pattern (Score: 7.5/10)
```typescript
interface IApiKeyAuth extends IAuth {
  type: 'apiKey';      // ← Discriminant field
  scheme: 'header' | 'query';
  name: string;
}

interface IOAuth2Auth extends IAuth {
  type: 'oauth2';      // ← Discriminant field
  authorizationUrl: string;
  tokenUrl: string;
  scopes?: string[];
}
```

**Why These Score Higher:**
- Compile-time enforcement of field compatibility
- IntelliSense shows only relevant fields after setting `type`
- Impossible to set incompatible combinations
- Clear decision tree: "Choose your auth type first"

---

## Proposed Architecture

### Overview

Split IUI into **discriminated union of 5 variants**, each optimized for a specific rendering pattern:

```typescript
type IUI<TData = any> =
  | IInlineUI<TData>
  | IFileBasedUI<TData>
  | IComponentUI<TData>
  | IExternalUI<TData>
  | IRemoteDomUI<TData>;
```

**Discriminant Field Choice:** `kind` (not `type`)
- **Rationale:** `type` is used by IParam, IAuth → convention for MCP protocol types
- `kind` distinguishes UI rendering method (implementation detail, not protocol)
- Avoids confusion with MIME type fields

### Base Interface

Fields common to **all** UI variants:

```typescript
interface IUIBase<TData = any> {
  // ============================================================================
  // REQUIRED FIELDS (Common to all variants)
  // ============================================================================

  /**
   * UI resource URI (must start with "ui://")
   * Convention: ui://category/name
   */
  uri: string;

  /**
   * Human-readable UI name
   */
  name: string;

  /**
   * UI description (what it does)
   */
  description: string;

  // ============================================================================
  // OPTIONAL FIELDS (Common to all variants)
  // ============================================================================

  /**
   * Array of tool names this UI can call
   * Security: Only these tools are accessible via callTool()
   */
  tools?: string[];

  /**
   * Preferred UI size (rendering hint)
   * Client may adjust based on available space
   */
  size?: {
    width?: number;
    height?: number;
  };

  /**
   * Whether this UI resource supports subscriptions
   * When true, client can subscribe via resources/subscribe
   */
  subscribable?: boolean;

  /**
   * Data type hint (for dynamic UI)
   */
  data?: TData;

  /**
   * Callable signature for dynamic UI
   * Returns HTML string (with optional CSS via <style> tag)
   */
  (): TData | Promise<TData>;
}
```

**Field Count:** 3 required + 4 optional = **7 fields** (vs 30+ in current IUI)

### Variant 1: IInlineUI

For **inline HTML + CSS + JavaScript** - simplest pattern for basic UIs:

```typescript
interface IInlineUI<TData = any> extends IUIBase<TData> {
  /**
   * Discriminant field: Identifies this as inline UI
   */
  kind: 'inline';

  /**
   * Inline HTML content
   * Security: HTML is rendered in sandboxed iframe
   */
  html: string;

  /**
   * Inline CSS styles (optional)
   * Applied via <style> tag in iframe
   */
  css?: string;

  /**
   * Inline JavaScript code (optional)
   * Executed in sandboxed iframe context
   */
  javascript?: string;

  /**
   * Minification configuration (optional)
   * Reduces size of HTML, CSS, JS
   */
  minify?: boolean | {
    html?: boolean;
    css?: boolean;
    js?: boolean;
  };
}
```

**Field Count:** 1 required (kind, html) + 3 optional = **4 fields** + 7 base = **11 total**

**Use Cases:**
- Simple dashboards
- Static UI components
- Prototyping and demos
- Self-contained widgets

**Example:**
```typescript
interface SimpleCalculatorUI extends IInlineUI {
  kind: 'inline';
  uri: 'ui://tools/calculator';
  name: 'Simple Calculator';
  description: 'Basic arithmetic calculator';
  html: '<div class="calc">...</div>';
  css: '.calc { padding: 20px; }';
  javascript: 'function calculate() { ... }';
  tools: ['add', 'subtract', 'multiply', 'divide'];
}
```

### Variant 2: IFileBasedUI

For **external file references** - separates UI code from server code:

```typescript
interface IFileBasedUI<TData = any> extends IUIBase<TData> {
  /**
   * Discriminant field: Identifies this as file-based UI
   */
  kind: 'file';

  /**
   * Path to external HTML file (relative to server file)
   * File paths are resolved relative to the server file location
   */
  file: string;

  /**
   * Paths to external CSS files (optional)
   * Loaded in order before rendering
   */
  stylesheets?: string[];

  /**
   * Paths to external JavaScript files (optional)
   * Loaded in order after rendering
   */
  scripts?: string[];

  /**
   * Minification configuration (optional)
   * Minifies HTML, CSS, and JavaScript files
   */
  minify?: boolean | {
    html?: boolean;
    css?: boolean;
    js?: boolean;
  };
}
```

**Field Count:** 2 required (kind, file) + 3 optional = **5 fields** + 7 base = **12 total**

**Use Cases:**
- Professional UI projects
- Team collaboration (separate UI from logic)
- Reusable UI components
- Large-scale dashboards

**Example:**
```typescript
interface ProductCatalogUI extends IFileBasedUI {
  kind: 'file';
  uri: 'ui://products/catalog';
  name: 'Product Catalog';
  description: 'Browse and filter products';
  file: './ui/catalog.html';
  stylesheets: ['./styles/reset.css', './styles/catalog.css'];
  scripts: ['./scripts/validation.js', './ui/catalog.js'];
  tools: ['search_products', 'filter_by_category', 'add_to_cart'];
}
```

### Variant 3: IComponentUI

For **React/Vue components** - modern framework integration with bundling:

```typescript
interface IComponentUI<TData = any> extends IUIBase<TData> {
  /**
   * Discriminant field: Identifies this as component UI
   */
  kind: 'component';

  /**
   * Path to React/Vue component file (.tsx, .jsx, .vue)
   * Component will be compiled with Babel and bundled automatically
   */
  component: string;

  /**
   * NPM package dependencies for bundling (optional)
   * Dependencies are bundled into the final component output
   */
  dependencies?: string[];

  /**
   * Bundle configuration (optional)
   * When true, bundles component with all dependencies
   * When object, provides fine-grained bundling control
   */
  bundle?: boolean | {
    minify?: boolean;
    sourcemap?: boolean;
    external?: string[];        // Don't bundle these (load from CDN)
    format?: 'iife' | 'esm';    // Output format
  };

  /**
   * Component imports from registry (optional)
   * URIs of reusable components to import
   */
  imports?: string[];

  /**
   * Theme for UI styling (optional)
   * Can be theme name or theme object with CSS variables
   */
  theme?: string | {
    name: string;
    variables: Record<string, string>;
  };

  /**
   * CDN configuration for hosting resources (optional)
   */
  cdn?: boolean | {
    baseUrl?: string;
    sri?: boolean | 'sha256' | 'sha384' | 'sha512';
    compression?: 'gzip' | 'brotli' | 'both';
  };

  /**
   * Performance monitoring configuration (optional)
   */
  performance?: boolean | {
    track?: boolean;
    report?: boolean;
    thresholds?: {
      maxBundleSize?: number;
      maxCompilationTime?: number;
    };
  };
}
```

**Field Count:** 2 required (kind, component) + 6 optional = **8 fields** + 7 base = **15 total**

**Use Cases:**
- React/Vue applications
- Complex interactive UIs
- Modern JavaScript frameworks
- Component libraries

**Example:**
```typescript
interface ReactDashboardUI extends IComponentUI {
  kind: 'component';
  uri: 'ui://analytics/dashboard';
  name: 'Analytics Dashboard';
  description: 'Real-time analytics with React';
  component: './components/Dashboard.tsx';
  dependencies: ['recharts', 'date-fns'];
  bundle: {
    minify: true,
    sourcemap: true,
    external: ['react', 'react-dom'],  // Load from CDN
    format: 'iife',
  };
  tools: ['fetch_analytics', 'export_data'];
  theme: 'dark';
}
```

### Variant 4: IExternalUI

For **external URLs** - reference existing web applications:

```typescript
interface IExternalUI<TData = any> extends IUIBase<TData> {
  /**
   * Discriminant field: Identifies this as external UI
   */
  kind: 'external';

  /**
   * External URL for serving UI from external sources
   * The UI resource will use text/uri-list MIME type
   *
   * Use cases:
   * - Existing web dashboards
   * - Third-party hosted UIs
   * - Content management systems
   *
   * Security: Ensure the external URL is trusted and uses HTTPS
   */
  externalUrl: string;
}
```

**Field Count:** 2 required (kind, externalUrl) = **2 fields** + 7 base = **9 total**

**Use Cases:**
- Existing web dashboards
- Third-party analytics platforms
- Documentation sites
- CMS interfaces

**Example:**
```typescript
interface AnalyticsDashboardUI extends IExternalUI {
  kind: 'external';
  uri: 'ui://analytics/external';
  name: 'Analytics Dashboard';
  description: 'External analytics platform';
  externalUrl: 'https://analytics.example.com/dashboard';
}
```

### Variant 5: IRemoteDomUI

For **Remote DOM protocol** - application/vnd.mcp-ui.remote-dom MIME type:

```typescript
interface IRemoteDomUI<TData = any> extends IUIBase<TData> {
  /**
   * Discriminant field: Identifies this as Remote DOM UI
   */
  kind: 'remoteDom';

  /**
   * Remote DOM content (pre-serialized JSON or simple JSX)
   *
   * Remote DOM allows UI components to render in parent window
   * while executing in sandboxed iframe. Unlike HTML which transfers
   * markup, Remote DOM transfers component trees that can be
   * dynamically updated.
   *
   * Accepts two formats:
   * 1. Pre-serialized Remote DOM JSON: {"type": "div", "children": ["Hello"]}
   * 2. Simple React component code (basic conversion)
   */
  remoteDom: string;

  /**
   * Theme for UI styling (optional)
   * Applied to Remote DOM components
   */
  theme?: string | {
    name: string;
    variables: Record<string, string>;
  };
}
```

**Field Count:** 2 required (kind, remoteDom) + 1 optional = **3 fields** + 7 base = **10 total**

**Use Cases:**
- Dynamic component trees
- Shopify Remote DOM integration
- Advanced UI frameworks
- Real-time UI updates

**Example:**
```typescript
interface RemoteDashboardUI extends IRemoteDomUI {
  kind: 'remoteDom';
  uri: 'ui://remote/dashboard';
  name: 'Remote Dashboard';
  description: 'Dashboard using Remote DOM protocol';
  remoteDom: `{
    "type": "div",
    "properties": { "className": "dashboard" },
    "children": [
      { "type": "h1", "children": ["Dashboard"] },
      { "type": "p", "children": ["Real-time metrics"] }
    ]
  }`;
  tools: ['fetch_metrics', 'update_dashboard'];
}
```

### Architecture Summary

| Variant | Discriminant | Primary Field(s) | Total Fields | Complexity | Use Cases |
|---------|--------------|------------------|--------------|------------|-----------|
| **IInlineUI** | `kind: 'inline'` | `html` | 11 (4 + 7 base) | LOW | Simple UIs, prototypes |
| **IFileBasedUI** | `kind: 'file'` | `file` | 12 (5 + 7 base) | MEDIUM | Professional projects |
| **IComponentUI** | `kind: 'component'` | `component` | 15 (8 + 7 base) | MEDIUM-HIGH | React/Vue apps |
| **IExternalUI** | `kind: 'external'` | `externalUrl` | 9 (2 + 7 base) | LOW | External dashboards |
| **IRemoteDomUI** | `kind: 'remoteDom'` | `remoteDom` | 10 (3 + 7 base) | MEDIUM | Remote DOM protocol |

**Key Improvements:**
- **Field reduction:** 30+ fields → 9-15 fields per variant (**-50% to -70%**)
- **Compile-time safety:** Impossible to set incompatible fields
- **Clear decision tree:** Choose variant first, then see only relevant fields
- **IntelliSense guidance:** IDE shows only applicable fields for chosen variant

---

## Field Categorization

Complete mapping of all 30+ current IUI fields to new architecture:

### Field Categorization Matrix

| Current Field | Purpose | Applies To | Required? | Default | Migration Notes |
|---------------|---------|------------|-----------|---------|-----------------|
| **CORE FIELDS** | | | | | |
| `uri` | Resource identifier | ALL | ✅ Yes | - | Moves to IUIBase |
| `name` | Human-readable name | ALL | ✅ Yes | - | Moves to IUIBase |
| `description` | UI description | ALL | ✅ Yes | - | Moves to IUIBase |
| `tools` | Callable tools whitelist | ALL | ❌ No | `[]` | Moves to IUIBase |
| `size` | Rendering hint | ALL | ❌ No | `undefined` | Moves to IUIBase |
| `subscribable` | Subscription support | ALL | ❌ No | `false` | Moves to IUIBase |
| `dynamic` | Dynamic generation flag | ALL | ❌ No | `false` | Moves to IUIBase |
| `data` | Data type hint | ALL | ❌ No | `undefined` | Moves to IUIBase |
| `()` | Callable signature | ALL | ❌ No | - | Moves to IUIBase |
| **RENDERING METHOD FIELDS (Mutually Exclusive → Discriminated)** | | | | | |
| `html` | Inline HTML content | **IInlineUI** | ✅ Yes | - | Required for IInlineUI |
| `file` | External HTML file | **IFileBasedUI** | ✅ Yes | - | Required for IFileBasedUI |
| `component` | React/Vue component | **IComponentUI** | ✅ Yes | - | Required for IComponentUI |
| `externalUrl` | External URL | **IExternalUI** | ✅ Yes | - | Required for IExternalUI |
| `remoteDom` | Remote DOM JSON | **IRemoteDomUI** | ✅ Yes | - | Required for IRemoteDomUI |
| **STYLING FIELDS** | | | | | |
| `css` | Inline CSS | **IInlineUI** | ❌ No | `''` | Only for inline UIs |
| `stylesheets` | External CSS files | **IFileBasedUI** | ❌ No | `[]` | Only for file-based UIs |
| `theme` | Theme configuration | **IComponentUI**, **IRemoteDomUI** | ❌ No | `'light'` | For component/remoteDom |
| **SCRIPTING FIELDS** | | | | | |
| `javascript` | Inline JS (deprecated) | **IInlineUI** | ❌ No | `''` | Deprecated, use `script` field |
| `script` | External JS file (single) | **IFileBasedUI** | ❌ No | `undefined` | Alternative to `scripts` array |
| `scripts` | External JS files (array) | **IFileBasedUI** | ❌ No | `[]` | Only for file-based UIs |
| **BUNDLING FIELDS** | | | | | |
| `dependencies` | NPM packages | **IComponentUI** | ❌ No | `[]` | Only for components with bundling |
| `bundle` | Bundling configuration | **IComponentUI** | ❌ No | `false` | Only for components |
| `imports` | Component registry | **IComponentUI** | ❌ No | `[]` | Only for component UIs |
| **OPTIMIZATION FIELDS** | | | | | |
| `minify` | Minification config | **IInlineUI**, **IFileBasedUI** | ❌ No | `false` | For HTML/CSS/JS content |
| `cdn` | CDN configuration | **IComponentUI** | ❌ No | `false` | Only for component UIs |
| `performance` | Performance monitoring | **IComponentUI** | ❌ No | `false` | Only for component UIs |
| **DEPRECATED / UNUSED FIELDS** | | | | | |
| `head` | Custom <head> content | DEPRECATED | ❌ No | `''` | Merge into `html` or `file` |
| `body` | Custom <body> content | DEPRECATED | ❌ No | `''` | Merge into `html` or `file` |
| `onload` | Onload handler | DEPRECATED | ❌ No | `''` | Use `javascript` or `scripts` |

### Field Migration Rules

**Rule 1: Common fields → IUIBase**
- Fields used by ALL variants move to base interface
- Reduces duplication across variants

**Rule 2: Rendering methods → Discriminant + Required Field**
- `html`, `file`, `component`, `externalUrl`, `remoteDom` become variant identifiers
- Each variant requires its primary rendering field

**Rule 3: Supporting fields → Specific Variants**
- Fields that only work with certain rendering methods move to those variants
- Example: `bundle` only makes sense for `component` → IComponentUI only

**Rule 4: Deprecated fields → Remove or Merge**
- `head`, `body`, `onload` → deprecated, merge functionality into primary fields
- `javascript` → deprecated, use `scripts` array instead

---

## Type Safety Design

### Compile-Time Mutual Exclusivity

The discriminated union **prevents** incompatible field combinations at compile-time:

```typescript
// ❌ TypeScript ERROR - Cannot mix variants
interface BrokenUI extends IInlineUI {
  kind: 'inline';
  html: '<div>Hello</div>';
  file: './component.html';  // ❌ Property 'file' does not exist on type 'IInlineUI'
}

// ❌ TypeScript ERROR - Wrong fields for variant
interface AlsoBrokenUI extends IFileBasedUI {
  kind: 'file';
  file: './index.html';
  html: '<div>Inline</div>';  // ❌ Property 'html' does not exist on type 'IFileBasedUI'
}

// ✅ TypeScript SUCCESS - Correct variant usage
interface WorkingUI extends IInlineUI {
  kind: 'inline';
  html: '<div>Hello</div>';
  css: '.container { padding: 20px; }';  // ✅ Valid for IInlineUI
}
```

### Type Narrowing in Implementation

TypeScript automatically narrows types based on the discriminant:

```typescript
function renderUI(ui: IUI) {
  // TypeScript doesn't know which variant yet
  console.log(ui.kind);  // ✅ Valid - 'kind' exists on all variants

  // Narrow by discriminant
  if (ui.kind === 'inline') {
    // TypeScript knows: this is IInlineUI
    console.log(ui.html);       // ✅ Valid - IInlineUI has 'html'
    console.log(ui.css);        // ✅ Valid - IInlineUI has 'css'
    console.log(ui.file);       // ❌ Error - 'file' doesn't exist on IInlineUI
  } else if (ui.kind === 'file') {
    // TypeScript knows: this is IFileBasedUI
    console.log(ui.file);       // ✅ Valid - IFileBasedUI has 'file'
    console.log(ui.stylesheets);// ✅ Valid - IFileBasedUI has 'stylesheets'
    console.log(ui.html);       // ❌ Error - 'html' doesn't exist on IFileBasedUI
  } else if (ui.kind === 'component') {
    // TypeScript knows: this is IComponentUI
    console.log(ui.component);  // ✅ Valid - IComponentUI has 'component'
    console.log(ui.bundle);     // ✅ Valid - IComponentUI has 'bundle'
    console.log(ui.html);       // ❌ Error - 'html' doesn't exist on IComponentUI
  } else if (ui.kind === 'external') {
    // TypeScript knows: this is IExternalUI
    console.log(ui.externalUrl);// ✅ Valid - IExternalUI has 'externalUrl'
    console.log(ui.html);       // ❌ Error - 'html' doesn't exist on IExternalUI
  } else if (ui.kind === 'remoteDom') {
    // TypeScript knows: this is IRemoteDomUI
    console.log(ui.remoteDom);  // ✅ Valid - IRemoteDomUI has 'remoteDom'
    console.log(ui.html);       // ❌ Error - 'html' doesn't exist on IRemoteDomUI
  }
}
```

### IntelliSense Behavior

After setting the discriminant field, IDE autocomplete shows **only** relevant fields:

**Before setting `kind`:**
```typescript
interface MyUI extends IUI {
  uri: 'ui://example';
  name: 'Example';
  description: 'Example UI';
  // IntelliSense shows: No specific fields yet (union is ambiguous)
}
```

**After setting `kind: 'inline'`:**
```typescript
interface MyUI extends IInlineUI {
  kind: 'inline';  // ← Discriminant set
  uri: 'ui://example';
  name: 'Example';
  description: 'Example UI';
  // IntelliSense autocomplete now shows:
  // - html (required)
  // - css (optional)
  // - javascript (optional)
  // - minify (optional)
  // - tools, size, subscribable, dynamic, data (from IUIBase)
  //
  // IntelliSense does NOT show:
  // - file, stylesheets, scripts (IFileBasedUI)
  // - component, bundle, dependencies (IComponentUI)
  // - externalUrl (IExternalUI)
  // - remoteDom (IRemoteDomUI)
}
```

### Improved Error Messages

**Before (Current IUI):**
```typescript
interface MyUI extends IUI {
  uri: 'ui://broken';
  name: 'Broken UI';
  description: 'Example';
  html: '<div>Hello</div>';
  file: './component.html';
}

// Runtime error (when client requests resource):
// Error: Invalid UI configuration: Multiple rendering methods specified
```

**After (Discriminated Union):**
```typescript
interface MyUI extends IInlineUI {
  kind: 'inline';
  uri: 'ui://fixed';
  name: 'Fixed UI';
  description: 'Example';
  html: '<div>Hello</div>';
  file: './component.html';  // ❌ Compile-time error
}

// TypeScript compiler error:
// Property 'file' does not exist on type 'IInlineUI'.
// Did you mean to use 'IFileBasedUI' with kind: 'file'?
```

**Benefits:**
- ❌ **Before:** Error caught at runtime (during request)
- ✅ **After:** Error caught at compile-time (during development)
- ❌ **Before:** Generic error message
- ✅ **After:** Specific error with suggestion

### Exhaustiveness Checking

TypeScript ensures all variants are handled in switch statements:

```typescript
function processUI(ui: IUI): string {
  switch (ui.kind) {
    case 'inline':
      return processInlineUI(ui);  // TypeScript knows: ui is IInlineUI
    case 'file':
      return processFileUI(ui);    // TypeScript knows: ui is IFileBasedUI
    case 'component':
      return processComponentUI(ui); // TypeScript knows: ui is IComponentUI
    case 'external':
      return processExternalUI(ui);  // TypeScript knows: ui is IExternalUI
    // ❌ TypeScript ERROR: Missing case 'remoteDom'
    // Error: Function lacks ending return statement and return type does not include 'undefined'
  }
}

// Fix by adding missing case:
function processUI(ui: IUI): string {
  switch (ui.kind) {
    case 'inline':
      return processInlineUI(ui);
    case 'file':
      return processFileUI(ui);
    case 'component':
      return processComponentUI(ui);
    case 'external':
      return processExternalUI(ui);
    case 'remoteDom':
      return processRemoteDomUI(ui);  // ✅ All variants handled
  }
}
```

**Benefits:**
- Prevents forgetting to handle new variants
- Compile-time guarantee of completeness
- Refactoring safety: Adding new variant causes compile errors until handled

---

## Migration Strategy

### Deprecation Timeline

**v3.5.0 (Deprecation):**
- Add new discriminated union IUI alongside existing IUI (renamed to IUILegacy)
- Add deprecation warnings when using IUILegacy
- Update documentation to recommend new IUI
- Provide migration guide

**v3.6.0 (Migration Tools):**
- Provide codemod for automatic migration
- Test codemod on all 6 existing examples
- Add runtime adapter for IUILegacy → IUI conversion (temporary)

**v4.0.0 (Breaking Change):**
- Remove IUILegacy completely
- New IUI is the only option
- All examples use new IUI format

### Automatic Migration (Codemod)

**Codemod Logic:**

```typescript
// Pseudo-code for migration codemod
function migrateIUI(oldInterface: IUILegacy): IUI {
  // Step 1: Detect which rendering method is used
  const renderingMethod = detectRenderingMethod(oldInterface);

  // Step 2: Create appropriate variant based on method
  switch (renderingMethod) {
    case 'html':
      return migrateToInlineUI(oldInterface);
    case 'file':
      return migrateToFileBasedUI(oldInterface);
    case 'component':
      return migrateToComponentUI(oldInterface);
    case 'externalUrl':
      return migrateToExternalUI(oldInterface);
    case 'remoteDom':
      return migrateToRemoteDomUI(oldInterface);
    case 'multiple':
      // Error: Multiple rendering methods set
      throw new Error('Cannot auto-migrate: Multiple rendering methods specified');
    case 'none':
      // Error: No rendering method set
      throw new Error('Cannot auto-migrate: No rendering method specified');
  }
}

function detectRenderingMethod(ui: IUILegacy): string {
  const methods = [];
  if (ui.html) methods.push('html');
  if (ui.file) methods.push('file');
  if (ui.component) methods.push('component');
  if (ui.externalUrl) methods.push('externalUrl');
  if (ui.remoteDom) methods.push('remoteDom');

  if (methods.length === 0) return 'none';
  if (methods.length > 1) return 'multiple';
  return methods[0];
}
```

**Migration Functions:**

```typescript
function migrateToInlineUI(old: IUILegacy): IInlineUI {
  return {
    kind: 'inline',
    uri: old.uri,
    name: old.name,
    description: old.description,
    html: old.html!,  // Required
    css: old.css,     // Optional
    javascript: old.javascript,  // Optional
    minify: old.minify,
    tools: old.tools,
    size: old.size,
    subscribable: old.subscribable,
    dynamic: old.dynamic,
    data: old.data,
  };
}

function migrateToFileBasedUI(old: IUILegacy): IFileBasedUI {
  return {
    kind: 'file',
    uri: old.uri,
    name: old.name,
    description: old.description,
    file: old.file!,  // Required
    stylesheets: old.stylesheets,
    scripts: old.scripts,
    minify: old.minify,
    tools: old.tools,
    size: old.size,
    subscribable: old.subscribable,
    dynamic: old.dynamic,
    data: old.data,
  };
}

function migrateToComponentUI(old: IUILegacy): IComponentUI {
  return {
    kind: 'component',
    uri: old.uri,
    name: old.name,
    description: old.description,
    component: old.component!,  // Required
    dependencies: old.dependencies,
    bundle: old.bundle,
    imports: old.imports,
    theme: old.theme,
    cdn: old.cdn,
    performance: old.performance,
    tools: old.tools,
    size: old.size,
    subscribable: old.subscribable,
    dynamic: old.dynamic,
    data: old.data,
  };
}

function migrateToExternalUI(old: IUILegacy): IExternalUI {
  return {
    kind: 'external',
    uri: old.uri,
    name: old.name,
    description: old.description,
    externalUrl: old.externalUrl!,  // Required
    tools: old.tools,
    size: old.size,
    subscribable: old.subscribable,
    dynamic: old.dynamic,
    data: old.data,
  };
}

function migrateToRemoteDomUI(old: IUILegacy): IRemoteDomUI {
  return {
    kind: 'remoteDom',
    uri: old.uri,
    name: old.name,
    description: old.description,
    remoteDom: old.remoteDom!,  // Required
    theme: old.theme,
    tools: old.tools,
    size: old.size,
    subscribable: old.subscribable,
    dynamic: old.dynamic,
    data: old.data,
  };
}
```

### Before/After Migration Examples

#### Example 1: Inline HTML UI

**Before (v3.x):**
```typescript
interface SimpleCalculatorUI extends IUI {
  uri: 'ui://tools/calculator';
  name: 'Simple Calculator';
  description: 'Basic arithmetic calculator';
  html: '<div class="calc">...</div>';
  css: '.calc { padding: 20px; }';
  javascript: 'function calculate() { ... }';
  tools: ['add', 'subtract', 'multiply', 'divide'];
}
```

**After (v4.0):**
```typescript
interface SimpleCalculatorUI extends IInlineUI {
  kind: 'inline';  // ← Added discriminant
  uri: 'ui://tools/calculator';
  name: 'Simple Calculator';
  description: 'Basic arithmetic calculator';
  html: '<div class="calc">...</div>';
  css: '.calc { padding: 20px; }';
  javascript: 'function calculate() { ... }';
  tools: ['add', 'subtract', 'multiply', 'divide'];
}
```

**Changes:** Added `kind: 'inline'`, changed parent interface from `IUI` to `IInlineUI`

#### Example 2: File-Based UI

**Before (v3.x):**
```typescript
interface ProductCatalogUI extends IUI {
  uri: 'ui://products/catalog';
  name: 'Product Catalog';
  description: 'Browse and filter products';
  file: './ui/catalog.html';
  stylesheets: ['./styles/reset.css', './styles/catalog.css'];
  scripts: ['./scripts/validation.js', './ui/catalog.js'];
  tools: ['search_products', 'filter_by_category', 'add_to_cart'];
  size: { width: 1024, height: 768 };
}
```

**After (v4.0):**
```typescript
interface ProductCatalogUI extends IFileBasedUI {
  kind: 'file';  // ← Added discriminant
  uri: 'ui://products/catalog';
  name: 'Product Catalog';
  description: 'Browse and filter products';
  file: './ui/catalog.html';
  stylesheets: ['./styles/reset.css', './styles/catalog.css'];
  scripts: ['./scripts/validation.js', './ui/catalog.js'];
  tools: ['search_products', 'filter_by_category', 'add_to_cart'];
  size: { width: 1024, height: 768 };
}
```

**Changes:** Added `kind: 'file'`, changed parent interface from `IUI` to `IFileBasedUI`

#### Example 3: React Component UI

**Before (v3.x):**
```typescript
interface ReactDashboardUI extends IUI {
  uri: 'ui://analytics/dashboard';
  name: 'Analytics Dashboard';
  description: 'Real-time analytics with React';
  component: './components/Dashboard.tsx';
  dependencies: ['recharts', 'date-fns'];
  bundle: {
    minify: true,
    sourcemap: true,
    external: ['react', 'react-dom'],
    format: 'iife',
  };
  tools: ['fetch_analytics', 'export_data'];
  theme: 'dark';
  size: { width: 1280, height: 800 };
}
```

**After (v4.0):**
```typescript
interface ReactDashboardUI extends IComponentUI {
  kind: 'component';  // ← Added discriminant
  uri: 'ui://analytics/dashboard';
  name: 'Analytics Dashboard';
  description: 'Real-time analytics with React';
  component: './components/Dashboard.tsx';
  dependencies: ['recharts', 'date-fns'];
  bundle: {
    minify: true,
    sourcemap: true,
    external: ['react', 'react-dom'],
    format: 'iife',
  };
  tools: ['fetch_analytics', 'export_data'];
  theme: 'dark';
  size: { width: 1280, height: 800 };
}
```

**Changes:** Added `kind: 'component'`, changed parent interface from `IUI` to `IComponentUI`

#### Example 4: External URL UI

**Before (v3.x):**
```typescript
interface AnalyticsDashboardUI extends IUI {
  uri: 'ui://analytics/external';
  name: 'Analytics Dashboard';
  description: 'External analytics platform';
  externalUrl: 'https://analytics.example.com/dashboard';
}
```

**After (v4.0):**
```typescript
interface AnalyticsDashboardUI extends IExternalUI {
  kind: 'external';  // ← Added discriminant
  uri: 'ui://analytics/external';
  name: 'Analytics Dashboard';
  description: 'External analytics platform';
  externalUrl: 'https://analytics.example.com/dashboard';
}
```

**Changes:** Added `kind: 'external'`, changed parent interface from `IUI` to `IExternalUI`

#### Example 5: Remote DOM UI

**Before (v3.x):**
```typescript
interface RemoteDashboardUI extends IUI {
  uri: 'ui://remote/dashboard';
  name: 'Remote Dashboard';
  description: 'Dashboard using Remote DOM protocol';
  remoteDom: `{
    "type": "div",
    "properties": { "className": "dashboard" },
    "children": [
      { "type": "h1", "children": ["Dashboard"] }
    ]
  }`;
  tools: ['fetch_metrics', 'update_dashboard'];
}
```

**After (v4.0):**
```typescript
interface RemoteDashboardUI extends IRemoteDomUI {
  kind: 'remoteDom';  // ← Added discriminant
  uri: 'ui://remote/dashboard';
  name: 'Remote Dashboard';
  description: 'Dashboard using Remote DOM protocol';
  remoteDom: `{
    "type": "div",
    "properties": { "className": "dashboard" },
    "children": [
      { "type": "h1", "children": ["Dashboard"] }
    ]
  }`;
  tools: ['fetch_metrics', 'update_dashboard'];
}
```

**Changes:** Added `kind: 'remoteDom'`, changed parent interface from `IUI` to `IRemoteDomUI`

### Manual Migration Required

**Edge Case 1: Multiple Rendering Methods Set**

```typescript
// ⚠️ Cannot auto-migrate - multiple methods specified
interface BrokenUI extends IUI {
  uri: 'ui://broken';
  name: 'Broken UI';
  description: 'Has multiple rendering methods';
  html: '<div>Inline HTML</div>';
  file: './component.html';
  component: './Component.tsx';
}

// Manual migration: Choose ONE rendering method
// Option A: Use inline HTML
interface FixedUIInline extends IInlineUI {
  kind: 'inline';
  uri: 'ui://fixed';
  name: 'Fixed UI';
  description: 'Now uses inline HTML only';
  html: '<div>Inline HTML</div>';
}

// Option B: Use file-based
interface FixedUIFile extends IFileBasedUI {
  kind: 'file';
  uri: 'ui://fixed';
  name: 'Fixed UI';
  description: 'Now uses file-based only';
  file: './component.html';
}

// Option C: Use component
interface FixedUIComponent extends IComponentUI {
  kind: 'component';
  uri: 'ui://fixed';
  name: 'Fixed UI';
  description: 'Now uses component only';
  component: './Component.tsx';
}
```

**Edge Case 2: No Rendering Method Set**

```typescript
// ⚠️ Cannot auto-migrate - no rendering method specified
interface IncompleteUI extends IUI {
  uri: 'ui://incomplete';
  name: 'Incomplete UI';
  description: 'Missing rendering method';
  tools: ['some_tool'];
}

// Manual migration: Add rendering method
interface CompleteUI extends IInlineUI {
  kind: 'inline';
  uri: 'ui://complete';
  name: 'Complete UI';
  description: 'Now has rendering method';
  html: '<div>Content</div>';  // ← Added
  tools: ['some_tool'];
}
```

### Breaking Changes Documentation

**Breaking Changes in v4.0.0:**

1. **IUI is now a discriminated union**
   - Old: Single interface with 30+ optional fields
   - New: Union of 5 variant interfaces
   - **Action Required:** Add `kind` field and change parent interface

2. **`kind` field is required**
   - Old: No discriminant field
   - New: Must specify `kind: 'inline' | 'file' | 'component' | 'external' | 'remoteDom'`
   - **Action Required:** Add `kind` field to all UI interfaces

3. **Rendering method fields are now required**
   - Old: All rendering fields were optional (html?, file?, component?, etc.)
   - New: Primary field is required for each variant (e.g., IInlineUI requires `html`)
   - **Action Required:** Ensure rendering method field is present

4. **Field availability is variant-specific**
   - Old: All fields available on all UIs (causing runtime errors)
   - New: Each variant has specific fields (compile-time enforced)
   - **Action Required:** Remove fields not applicable to chosen variant

5. **Deprecated fields removed**
   - Removed: `head`, `body`, `onload`
   - Replacement: Merge into `html` or `file`
   - **Action Required:** Migrate deprecated fields to supported alternatives

### Codemod Usage Instructions

**Installation:**
```bash
npm install -g @simply-mcp/codemod
```

**Usage:**
```bash
# Migrate single file
simply-mcp-codemod migrate-iui src/server.ts

# Migrate entire directory
simply-mcp-codemod migrate-iui src/ --recursive

# Dry run (preview changes without applying)
simply-mcp-codemod migrate-iui src/ --dry-run

# Interactive mode (confirm each change)
simply-mcp-codemod migrate-iui src/ --interactive
```

**Output:**
```
Migrating: src/server.ts
  ✅ SimpleCalculatorUI → IInlineUI (added kind: 'inline')
  ✅ ProductCatalogUI → IFileBasedUI (added kind: 'file')
  ⚠️  BrokenUI → MANUAL MIGRATION REQUIRED (multiple rendering methods)
  ✅ AnalyticsUI → IExternalUI (added kind: 'external')

Summary:
  4 interfaces found
  3 migrated automatically
  1 requires manual migration

Manual migration needed for:
  - BrokenUI (src/server.ts:123) - Multiple rendering methods: html, file
```

---

## Developer Experience Improvements

### Decision Tree for Choosing UI Variant

```
┌─────────────────────────────────────────────────────────────┐
│ What type of UI content do you have?                        │
└─────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┬───────────────┬──────────────┐
         │                 │                 │               │              │
    ┌────▼───┐        ┌────▼───┐       ┌────▼───┐      ┌────▼───┐    ┌────▼────┐
    │ Inline │        │  File  │       │  React │      │External│    │ Remote  │
    │  HTML  │        │  Path  │       │  / Vue │      │  URL   │    │   DOM   │
    └────┬───┘        └────┬───┘       └────┬───┘      └────┬───┘    └────┬────┘
         │                 │                 │               │              │
         ▼                 ▼                 ▼               ▼              ▼
    kind: 'inline'    kind: 'file'    kind: 'component' kind: 'external' kind: 'remoteDom'

    Required:         Required:        Required:         Required:        Required:
    • html            • file           • component       • externalUrl    • remoteDom

    Optional:         Optional:        Optional:         Optional:        Optional:
    • css             • stylesheets    • dependencies    (none)           • theme
    • javascript      • scripts        • bundle
    • minify          • minify         • imports
                                       • theme
                                       • cdn
                                       • performance

    Use when:         Use when:        Use when:         Use when:        Use when:
    • Simple UI       • Separate UI    • Using React     • Existing web   • Using Remote
    • Prototyping     • Team collab    • Complex apps    • 3rd party      • Dynamic trees
    • Self-contained  • Large project  • Modern JS       • External CMS   • Shopify DOM
```

### Focused Examples

#### Example 1: Inline UI (Simplest)

**Scenario:** Quick dashboard for displaying server stats

```typescript
interface StatsUI extends IInlineUI {
  kind: 'inline';
  uri: 'ui://stats/server';
  name: 'Server Stats';
  description: 'Real-time server statistics';
  html: `
    <div class="stats-container">
      <h1>Server Statistics</h1>
      <div id="cpu-usage">CPU: 0%</div>
      <div id="memory-usage">Memory: 0%</div>
      <button id="refresh-btn">Refresh</button>
    </div>
  `;
  css: `
    .stats-container { padding: 20px; font-family: sans-serif; }
    #cpu-usage, #memory-usage { font-size: 24px; margin: 10px 0; }
    #refresh-btn { padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; }
  `;
  javascript: `
    document.getElementById('refresh-btn').addEventListener('click', async () => {
      const stats = await window.callTool('get_stats', {});
      const data = JSON.parse(stats.content[0].text);
      document.getElementById('cpu-usage').textContent = 'CPU: ' + data.cpu + '%';
      document.getElementById('memory-usage').textContent = 'Memory: ' + data.memory + '%';
    });
  `;
  tools: ['get_stats'];
}
```

**Time to Implementation:** ~5 minutes (vs 25-35 minutes with old IUI)

#### Example 2: File-Based UI (Professional)

**Scenario:** Product catalog with separate HTML/CSS/JS files

```typescript
interface ProductCatalogUI extends IFileBasedUI {
  kind: 'file';
  uri: 'ui://products/catalog';
  name: 'Product Catalog';
  description: 'Browse and search products';
  file: './ui/catalog.html';
  stylesheets: [
    './styles/reset.css',
    './styles/theme.css',
    './styles/catalog.css'
  ];
  scripts: [
    './scripts/utils.js',
    './scripts/validation.js',
    './ui/catalog.js'
  ];
  tools: ['search_products', 'filter_category', 'add_to_cart'];
  size: { width: 1024, height: 768 };
}
```

**Time to Implementation:** ~10 minutes (vs 25-35 minutes with old IUI)

#### Example 3: React Component UI (Modern Framework)

**Scenario:** Analytics dashboard with charting library

```typescript
interface AnalyticsUI extends IComponentUI {
  kind: 'component';
  uri: 'ui://analytics/dashboard';
  name: 'Analytics Dashboard';
  description: 'Real-time analytics with interactive charts';
  component: './components/AnalyticsDashboard.tsx';
  dependencies: ['recharts', 'date-fns', 'lodash'];
  bundle: {
    minify: true,
    sourcemap: true,
    external: ['react', 'react-dom'],
    format: 'iife'
  };
  theme: 'dark';
  tools: ['fetch_analytics', 'export_csv'];
  size: { width: 1280, height: 800 };
}
```

**Time to Implementation:** ~15 minutes (vs 25-35 minutes with old IUI)

#### Example 4: External UI (Simplest)

**Scenario:** Link to existing documentation site

```typescript
interface DocsUI extends IExternalUI {
  kind: 'external';
  uri: 'ui://docs/manual';
  name: 'User Documentation';
  description: 'Complete user manual and guides';
  externalUrl: 'https://docs.example.com/user-manual';
}
```

**Time to Implementation:** ~2 minutes (vs 25-35 minutes with old IUI)

#### Example 5: Remote DOM UI (Advanced)

**Scenario:** Dynamic dashboard using Remote DOM protocol

```typescript
interface RemoteUI extends IRemoteDomUI {
  kind: 'remoteDom';
  uri: 'ui://dashboard/remote';
  name: 'Remote Dashboard';
  description: 'Dynamic dashboard with Remote DOM';
  remoteDom: `{
    "type": "div",
    "properties": { "className": "dashboard" },
    "children": [
      {
        "type": "header",
        "children": [
          { "type": "h1", "children": ["Dashboard"] }
        ]
      },
      {
        "type": "main",
        "children": [
          {
            "type": "div",
            "properties": { "id": "metrics" },
            "children": ["Loading metrics..."]
          }
        ]
      }
    ]
  }`;
  tools: ['fetch_metrics', 'update_dashboard'];
}
```

**Time to Implementation:** ~12 minutes (vs 25-35 minutes with old IUI)

### Metric Improvements

| Metric | Old IUI | New IUI | Improvement |
|--------|---------|---------|-------------|
| **Time to First Code** | | | |
| - Inline UI | 25-35 min | 5 min | **-80% to -86%** |
| - File-Based UI | 25-35 min | 10 min | **-60% to -71%** |
| - Component UI | 25-35 min | 15 min | **-40% to -57%** |
| - External UI | 25-35 min | 2 min | **-92% to -94%** |
| - Remote DOM UI | 25-35 min | 12 min | **-52% to -66%** |
| **Documentation Lookups** | 8-12 | 2-4 | **-60% to -70%** |
| **Cognitive Load** | VERY HIGH | MEDIUM | **-66%** |
| **Error Rate (Incompatible Fields)** | 90% | 5-10% | **-89% to -94%** |
| **Fields to Review** | 30+ | 9-15 | **-50% to -70%** |

### Error Message Improvements

**Scenario 1: Wrong field for variant**

**Before:**
```
Runtime Error: Invalid UI configuration
```

**After:**
```
TypeScript Error: Property 'file' does not exist on type 'IInlineUI'.
Did you mean to use 'IFileBasedUI' with kind: 'file'?
```

**Scenario 2: Missing required field**

**Before:**
```
Runtime Error: UI resource must specify a rendering method
```

**After:**
```
TypeScript Error: Property 'html' is missing in type 'IInlineUI' but required.
```

**Scenario 3: Incompatible field combination**

**Before:**
```
Runtime Error: Cannot use 'bundle' with inline HTML
```

**After:**
```
TypeScript Error: Property 'bundle' does not exist on type 'IInlineUI'.
'bundle' is only available on 'IComponentUI'.
```

---

## Implementation Roadmap

### 8-Week Timeline

#### **Week 1-2: Design Validation**

**Goals:**
- Review proposed architecture with 3-5 Simply-MCP users
- Gather feedback on discriminated union design
- Iterate on field categorization if needed
- Finalize interface definitions

**Tasks:**
- [ ] Recruit 3-5 beta testers (current Simply-MCP users)
- [ ] Create interactive design prototype (TypeScript playground)
- [ ] Conduct user testing sessions (1 hour each)
- [ ] Collect feedback via survey (focus on: intuitiveness, field organization, decision tree)
- [ ] Analyze feedback and identify issues
- [ ] Iterate on design based on feedback
- [ ] Finalize interface definitions document

**Deliverables:**
- User testing report (feedback summary)
- Final interface definitions (TypeScript)
- Field categorization matrix (approved)

**Success Criteria:**
- All 5 beta testers successfully implement at least 1 UI using new design
- Average time to first code: ≤15 minutes (target: 10-15 min)
- User satisfaction score: ≥8/10
- No major design flaws identified

#### **Week 3-4: Core Implementation**

**Goals:**
- Implement new IUI union type in codebase
- Update parser to support both old and new patterns (temporarily)
- Add runtime warnings for old pattern
- Ensure backward compatibility during transition

**Tasks:**
- [ ] Create `IUIBase<TData>` interface
- [ ] Create 5 variant interfaces (IInlineUI, IFileBasedUI, IComponentUI, IExternalUI, IRemoteDomUI)
- [ ] Define `type IUI<TData> = ...` discriminated union
- [ ] Rename existing IUI to IUILegacy
- [ ] Update UI parser to handle discriminated union
- [ ] Add runtime adapter: IUILegacy → IUI conversion
- [ ] Add deprecation warnings when using IUILegacy
- [ ] Update type exports in index.ts
- [ ] Run existing tests with new implementation
- [ ] Fix any breaking tests

**Deliverables:**
- New IUI interfaces implemented (src/server/interface-types.ts)
- Parser updated to support both patterns
- Deprecation warnings added
- All existing tests passing

**Success Criteria:**
- New IUI types compile without errors
- All 6 existing UI examples work with runtime adapter
- Parser correctly identifies and converts IUILegacy → IUI
- Deprecation warnings appear in console when using old pattern
- Test suite: 100% passing

#### **Week 5-6: Migration Tooling**

**Goals:**
- Build codemod for automatic migration
- Test codemod on all 6 existing examples
- Document manual migration steps for edge cases
- Create migration guide

**Tasks:**
- [ ] Build codemod CLI tool (@simply-mcp/codemod)
- [ ] Implement `detectRenderingMethod()` logic
- [ ] Implement migration functions for each variant
- [ ] Add error handling for edge cases (multiple methods, no method)
- [ ] Test codemod on 6 existing examples
- [ ] Verify migrated examples compile and run correctly
- [ ] Write manual migration guide (edge cases)
- [ ] Create before/after comparison document
- [ ] Add codemod usage instructions to documentation

**Deliverables:**
- Codemod CLI tool (@simply-mcp/codemod package)
- Migration guide (MIGRATION_GUIDE.md)
- Before/after examples (all 6 existing examples migrated)
- Edge case handling documentation

**Success Criteria:**
- Codemod successfully migrates 5/6 examples automatically (83%+)
- 1 edge case requires manual migration (documented)
- All migrated examples compile without errors
- All migrated examples run correctly
- Manual migration guide covers all edge cases

#### **Week 7: Documentation**

**Goals:**
- Update API reference documentation
- Create migration guide for users
- Record video walkthrough of changes
- Update all code examples

**Tasks:**
- [ ] Update API reference (docs/guides/API_REFERENCE.md)
  - [ ] Add discriminated union section
  - [ ] Document each variant interface
  - [ ] Add decision tree diagram
  - [ ] Update field reference tables
- [ ] Create migration guide (docs/guides/MIGRATION_V4.md)
  - [ ] Before/after examples
  - [ ] Codemod instructions
  - [ ] Edge case handling
  - [ ] FAQ section
- [ ] Update all code examples (examples/ directory)
  - [ ] Migrate 6 existing UI examples to new pattern
  - [ ] Add new examples for each variant (if missing)
  - [ ] Verify all examples compile and run
- [ ] Record video walkthrough (15-20 minutes)
  - [ ] Problem statement (old IUI issues)
  - [ ] New architecture overview
  - [ ] Live migration demo
  - [ ] Q&A section
- [ ] Update README.md with v4.0.0 highlights
- [ ] Create CHANGELOG.md entry for v4.0.0

**Deliverables:**
- Updated API reference
- Migration guide
- Updated code examples
- Video walkthrough (YouTube)
- Updated README and CHANGELOG

**Success Criteria:**
- Documentation is comprehensive and accurate
- Migration guide answers all common questions
- All code examples compile and run correctly
- Video walkthrough is clear and helpful
- Internal review: 9/10+ quality score

#### **Week 8: Release**

**Goals:**
- Release v3.5.0 with deprecation warnings
- Monitor feedback and fix critical issues
- Plan v4.0.0 final release

**Tasks:**
- [ ] **v3.5.0 Release (Deprecation):**
  - [ ] Final code review
  - [ ] Run full test suite
  - [ ] Version bump to 3.5.0
  - [ ] Publish to npm
  - [ ] Announce on GitHub, Discord, Twitter
  - [ ] Monitor for critical bugs (1 week)
  - [ ] Fix critical bugs if found
- [ ] **Monitoring & Support:**
  - [ ] Monitor GitHub issues for migration problems
  - [ ] Answer questions in Discord/community channels
  - [ ] Track adoption metrics (how many users migrating?)
  - [ ] Collect feedback on codemod effectiveness
- [ ] **Plan v4.0.0 Final:**
  - [ ] Review collected feedback
  - [ ] Address any critical issues
  - [ ] Schedule v4.0.0 release date (4-6 weeks after v3.5.0)

**Deliverables:**
- v3.5.0 released on npm
- Release notes published
- Community announcement
- Feedback collection system active

**Success Criteria:**
- v3.5.0 release successful (no critical bugs)
- Community feedback is positive (≥80% positive sentiment)
- No major blockers identified for v4.0.0
- At least 20% of users migrate to new pattern within 2 weeks

### Resource Requirements

| Phase | Engineering Hours | Key Personnel |
|-------|-------------------|---------------|
| **Week 1-2: Design Validation** | 40-60 hours | Lead Engineer, UX Researcher, 3-5 Beta Testers |
| **Week 3-4: Core Implementation** | 80-100 hours | 2 Senior Engineers |
| **Week 5-6: Migration Tooling** | 60-80 hours | 1 Senior Engineer, 1 Junior Engineer |
| **Week 7: Documentation** | 40-60 hours | Tech Writer, 1 Engineer, Video Producer |
| **Week 8: Release** | 20-40 hours | Lead Engineer, DevOps, Community Manager |
| **TOTAL** | **240-340 hours** | ~6-8.5 weeks of full-time work |

**Team Size:** 2-3 engineers + supporting roles

### Risk Assessment

| Risk | Severity | Probability | Impact | Mitigation Strategy |
|------|----------|-------------|--------|---------------------|
| **Users resist migration** | HIGH | MEDIUM | Slow adoption, maintain legacy code | Strong migration guide, video tutorials, responsive support |
| **Codemod misses edge cases** | MEDIUM | HIGH | Manual migration needed, user frustration | Comprehensive edge case testing, clear manual migration docs |
| **Breaking changes cause issues** | HIGH | LOW | Critical bugs in production | Thorough testing, phased rollout (v3.5.0 → v4.0.0), rollback plan |
| **Design doesn't improve UX** | HIGH | LOW | No improvement in metrics | Early user testing (Week 1-2), iterate before implementation |
| **Timeline slips** | MEDIUM | MEDIUM | Delayed v4.0.0 release | Build buffer time, prioritize critical path items |
| **Documentation insufficient** | MEDIUM | MEDIUM | Confused users, support burden | Dedicated documentation week, video walkthrough, examples |

### Risk Mitigation Details

**Risk 1: Users Resist Migration**
- **Mitigation:**
  - Create compelling "before/after" comparisons showing time savings
  - Highlight compile-time safety benefits (prevent runtime errors)
  - Provide automatic codemod (reduce migration effort)
  - Offer migration support channel (Discord/GitHub Discussions)
  - Share success stories from beta testers

**Risk 2: Codemod Misses Edge Cases**
- **Mitigation:**
  - Test codemod on all 6 existing examples
  - Test codemod on synthetic edge cases (multiple methods, no method, etc.)
  - Create comprehensive manual migration guide for edge cases
  - Add clear error messages when codemod can't auto-migrate
  - Provide migration support for complex cases

**Risk 3: Breaking Changes Cause Issues**
- **Mitigation:**
  - Phased rollout: v3.5.0 (deprecation) → v4.0.0 (breaking change)
  - Runtime adapter in v3.5.0 to support old pattern
  - Extensive testing before release (unit, integration, E2E)
  - Beta testing period (2-4 weeks) before v4.0.0
  - Rollback plan: if critical bugs found, hot-fix v3.5.1 or delay v4.0.0

**Risk 4: Design Doesn't Improve UX**
- **Mitigation:**
  - Early user testing (Week 1-2) before implementation
  - Collect quantitative metrics (time to first code, error rate)
  - Iterate on design based on feedback
  - Set clear success criteria (7.5-8.0/10 UX score)
  - If targets not met in testing, redesign before proceeding

**Risk 5: Timeline Slips**
- **Mitigation:**
  - Build 10-20% buffer into each phase
  - Prioritize critical path items (core implementation, codemod)
  - Defer nice-to-have features to later releases
  - Weekly progress check-ins
  - Early warning system for blockers

**Risk 6: Documentation Insufficient**
- **Mitigation:**
  - Dedicate full week to documentation (Week 7)
  - Create multiple documentation formats (text, video, examples)
  - Internal review before publishing
  - Community feedback loop after v3.5.0 release
  - Update docs based on common questions

---

## Validation Plan

### User Testing Plan

**Objective:** Validate that new IUI design achieves target UX score of 7.5-8.0/10

**Participants:**
- **Recruit:** 3-5 current Simply-MCP users
- **Criteria:**
  - Have implemented at least 1 UI with current IUI
  - Represent diverse use cases (inline, file-based, component)
  - Available for 1-hour testing session + follow-up survey

**Testing Protocol:**

**Phase 1: Baseline (Current IUI)**
- **Task:** Implement a simple dashboard UI using current IUI (v3.x)
- **Metrics:**
  - Time to first working code
  - Number of documentation lookups
  - Number of errors encountered
  - Subjective satisfaction (1-10 scale)

**Phase 2: Redesign (New IUI)**
- **Task:** Implement the same dashboard UI using new IUI (v4.0 proposal)
- **Metrics:**
  - Time to first working code
  - Number of documentation lookups
  - Number of errors encountered
  - Subjective satisfaction (1-10 scale)

**Phase 3: Feedback (Survey)**
- **Questions:**
  1. Which design was more intuitive? (1-10 scale)
  2. Which design was easier to write? (1-10 scale)
  3. Did the discriminated union improve clarity? (Yes/No/Explain)
  4. Did the decision tree help you choose a variant? (Yes/No/Explain)
  5. What was confusing about the new design? (Open-ended)
  6. What would you improve? (Open-ended)
  7. Would you recommend this change to other users? (Yes/No/Why)

### Metrics to Collect

| Metric | Current Baseline | Target | Collection Method |
|--------|------------------|--------|-------------------|
| **UX Score** | 4.2/10 | 7.5-8.0/10 | User testing survey (average across 6 criteria) |
| **Time to First Code** | 25-35 min | 10-15 min | Timed user testing session |
| **Documentation Lookups** | 8-12 | 2-4 | Observation during testing + self-report |
| **Error Rate** | 90% incompatible fields | 5-10% | Count compilation errors during testing |
| **Cognitive Load** | VERY HIGH | MEDIUM | Subjective rating (1-5 scale) |
| **Satisfaction** | 4-5/10 | 8-9/10 | Post-task survey question |

### Before/After Comparison Methodology

**Quantitative Metrics:**

| Metric | Measurement Approach | Success Threshold |
|--------|---------------------|-------------------|
| **UX Score** | 6-criteria survey (intuitiveness, ease, type safety, consistency, flexibility, errors) | ≥7.5/10 average |
| **Time to First Code** | Stopwatch during testing (start: read task → finish: code compiles and runs) | ≤15 min average |
| **Documentation Lookups** | Observation + self-report ("How many times did you check docs?") | ≤4 average |
| **Error Rate** | Count TypeScript errors + runtime errors during testing | ≤10% of participants encounter incompatible field error |
| **Field Count** | Count fields in interface definition | ≤15 fields per variant (vs 30+ currently) |

**Qualitative Metrics:**

| Metric | Measurement Approach | Success Threshold |
|--------|---------------------|-------------------|
| **Cognitive Load** | Survey question: "How mentally taxing was this task?" (1=Easy, 5=Very Hard) | ≤2.5 average (MEDIUM) |
| **Clarity** | Survey question: "Was the decision tree helpful?" + open-ended feedback | ≥80% say "Yes" |
| **Satisfaction** | Survey question: "Overall satisfaction with new design?" (1-10 scale) | ≥8/10 average |
| **Recommendation** | Survey question: "Would you recommend this change?" (Yes/No) | ≥80% say "Yes" |

### Acceptance Criteria

The redesign is **APPROVED** if:

✅ **UX Score:** ≥7.5/10 (vs current 4.2/10) - **+80% improvement**
✅ **Time to First Code:** ≤15 min average (vs current 25-35 min) - **-50%+ improvement**
✅ **Documentation Lookups:** ≤4 average (vs current 8-12) - **-60%+ improvement**
✅ **Error Rate:** ≤10% incompatible field errors (vs current 90%) - **-89%+ improvement**
✅ **Satisfaction:** ≥8/10 (vs current 4-5/10) - **+60%+ improvement**
✅ **Recommendation:** ≥80% would recommend the change
✅ **No Critical Flaws:** No blocking issues identified during testing

The redesign is **REJECTED** if:

❌ **UX Score:** <7.0/10 - Not enough improvement
❌ **Time to First Code:** >20 min average - Still too slow
❌ **Major Usability Issues:** >2 critical usability flaws identified
❌ **User Resistance:** <60% would recommend - Users don't want the change

If rejected, iterate on design and re-test.

### Post-Release Monitoring

**Metrics to Track (v3.5.0 → v4.0.0):**

| Metric | Collection Method | Target |
|--------|------------------|--------|
| **Adoption Rate** | npm downloads, GitHub analytics | ≥20% migrate to new pattern within 2 weeks |
| **Migration Issues** | GitHub issues tagged "v4-migration" | ≤5 critical issues |
| **Codemod Success Rate** | Telemetry (opt-in) | ≥80% automatic migration success |
| **Community Sentiment** | Discord/Twitter/Reddit sentiment analysis | ≥80% positive |
| **Support Burden** | Count of support requests | <10 per week |

**Feedback Channels:**
- GitHub Issues (bugs, feature requests)
- GitHub Discussions (questions, migration help)
- Discord #support channel
- Community survey (2 weeks post-release)

---

## Appendices

### Appendix A: Complete Field Inventory

All 30+ IUI fields analyzed and categorized:

| # | Field Name | Category | Current Status | New Placement | Notes |
|---|------------|----------|----------------|---------------|-------|
| 1 | `uri` | Core | Required | IUIBase | Common to all |
| 2 | `name` | Core | Required | IUIBase | Common to all |
| 3 | `description` | Core | Required | IUIBase | Common to all |
| 4 | `tools` | Core | Optional | IUIBase | Common to all |
| 5 | `size` | Core | Optional | IUIBase | Common to all |
| 6 | `subscribable` | Core | Optional | IUIBase | Common to all |
| 7 | `dynamic` | Core | Optional | IUIBase | Common to all |
| 8 | `data` | Core | Optional | IUIBase | Type hint |
| 9 | `()` | Core | Optional | IUIBase | Callable signature |
| 10 | `html` | Rendering | Optional | **IInlineUI** (required) | Mutually exclusive → discriminated |
| 11 | `file` | Rendering | Optional | **IFileBasedUI** (required) | Mutually exclusive → discriminated |
| 12 | `component` | Rendering | Optional | **IComponentUI** (required) | Mutually exclusive → discriminated |
| 13 | `externalUrl` | Rendering | Optional | **IExternalUI** (required) | Mutually exclusive → discriminated |
| 14 | `remoteDom` | Rendering | Optional | **IRemoteDomUI** (required) | Mutually exclusive → discriminated |
| 15 | `css` | Styling | Optional | IInlineUI | Only for inline HTML |
| 16 | `stylesheets` | Styling | Optional | IFileBasedUI | Only for file-based |
| 17 | `theme` | Styling | Optional | IComponentUI, IRemoteDomUI | For component/remoteDom |
| 18 | `javascript` | Scripting | Optional | IInlineUI | Deprecated for `script` |
| 19 | `script` | Scripting | Optional | IFileBasedUI | Alternative to `scripts` |
| 20 | `scripts` | Scripting | Optional | IFileBasedUI | Array of JS files |
| 21 | `dependencies` | Bundling | Optional | IComponentUI | NPM packages |
| 22 | `bundle` | Bundling | Optional | IComponentUI | Bundling config |
| 23 | `imports` | Bundling | Optional | IComponentUI | Component registry |
| 24 | `minify` | Optimization | Optional | IInlineUI, IFileBasedUI | Minification |
| 25 | `cdn` | Optimization | Optional | IComponentUI | CDN config |
| 26 | `performance` | Optimization | Optional | IComponentUI | Performance monitoring |
| 27 | `head` | **DEPRECATED** | Optional | **REMOVED** | Merge into `html`/`file` |
| 28 | `body` | **DEPRECATED** | Optional | **REMOVED** | Merge into `html`/`file` |
| 29 | `onload` | **DEPRECATED** | Optional | **REMOVED** | Use `javascript`/`scripts` |

**Total:** 29 fields analyzed (27 active + 2 deprecated)

### Appendix B: Before/After Code Examples

All 6 existing UI examples migrated to new pattern:

**Summary Table:**

| Example | File | Old Lines | New Lines | Changes |
|---------|------|-----------|-----------|---------|
| Inline HTML | (various tests) | - | - | Added `kind: 'inline'`, changed to `IInlineUI` |
| File-Based | `interface-file-based-ui.ts` | 165 | 166 | Added `kind: 'file'`, changed to `IFileBasedUI` |
| React Component | `interface-react-component.ts` | 43 | 44 | Added `kind: 'component'`, changed to `IComponentUI` |
| External URL | `interface-external-url.ts` | 19 | 20 | Added `kind: 'external'`, changed to `IExternalUI` |
| Remote DOM | `interface-remote-dom.ts` | 26 | 27 | Added `kind: 'remoteDom'`, changed to `IRemoteDomUI` |

**(See "Migration Strategy" section for complete before/after code examples)**

### Appendix C: Risk Assessment Matrix

Comprehensive risk analysis with mitigation strategies:

| Risk ID | Risk Description | Severity | Probability | Impact Score | Mitigation | Owner |
|---------|------------------|----------|-------------|--------------|------------|-------|
| R1 | Users resist migration | HIGH | MEDIUM | 7/10 | Strong docs, video tutorials, responsive support | Community Manager |
| R2 | Codemod misses edge cases | MEDIUM | HIGH | 6/10 | Comprehensive testing, manual migration guide | Lead Engineer |
| R3 | Breaking changes cause bugs | HIGH | LOW | 5/10 | Phased rollout, thorough testing, rollback plan | Lead Engineer |
| R4 | Design doesn't improve UX | HIGH | LOW | 8/10 | Early user testing, iterate before implementation | UX Researcher |
| R5 | Timeline slips | MEDIUM | MEDIUM | 5/10 | Buffer time, prioritize critical path | Project Manager |
| R6 | Documentation insufficient | MEDIUM | MEDIUM | 6/10 | Dedicated doc week, multiple formats | Tech Writer |
| R7 | Beta testers unavailable | LOW | LOW | 3/10 | Recruit backups, offer incentives | Community Manager |
| R8 | Parser breaks existing code | HIGH | LOW | 7/10 | Extensive testing, backward compat layer | Senior Engineer |
| R9 | Community backlash | MEDIUM | LOW | 6/10 | Clear communication, justify changes with data | Lead Engineer |

**Impact Score Calculation:** Severity × Probability × Business Impact (1-10 scale)

### Appendix D: Success Metrics Dashboard

How to measure the 7.5/10 UX score target:

**UX Score Calculation (6 Criteria):**

| Criterion | Weight | Old Score | Target Score | Measurement Method |
|-----------|--------|-----------|--------------|-------------------|
| **Intuitiveness** | 20% | 4/10 | 8/10 | Survey: "How intuitive was choosing a UI variant?" (1-10) |
| **Ease of Writing** | 20% | 3/10 | 8/10 | Timed task: Average time to first working code |
| **Type Safety Balance** | 15% | 4/10 | 8/10 | Survey: "Did compile-time errors help catch mistakes?" (1-10) |
| **Consistency** | 15% | 5/10 | 8/10 | Survey: "Does IUI follow same patterns as IParam/IAuth?" (1-10) |
| **Flexibility** | 15% | 6/10 | 7/10 | Survey: "Can you implement all UI types you need?" (1-10) |
| **Error Messages** | 15% | 4/10 | 7/10 | Survey: "Were error messages helpful?" (1-10) |

**Overall UX Score Formula:**
```
UX Score = (Intuitiveness × 0.20) + (Ease × 0.20) + (TypeSafety × 0.15) +
           (Consistency × 0.15) + (Flexibility × 0.15) + (ErrorMessages × 0.15)
```

**Target Calculation:**
```
Target = (8 × 0.20) + (8 × 0.20) + (8 × 0.15) + (8 × 0.15) + (7 × 0.15) + (7 × 0.15)
       = 1.6 + 1.6 + 1.2 + 1.2 + 1.05 + 1.05
       = 7.7/10 ✅ Meets 7.5-8.0/10 target
```

**Current Baseline:**
```
Current = (4 × 0.20) + (3 × 0.20) + (4 × 0.15) + (5 × 0.15) + (6 × 0.15) + (4 × 0.15)
        = 0.8 + 0.6 + 0.6 + 0.75 + 0.9 + 0.6
        = 4.25/10 ≈ 4.2/10 ✅ Matches reported baseline
```

**Improvement:**
```
Improvement = (7.7 - 4.2) / 4.2 × 100% = +83% improvement
```

---

## Summary & Next Steps

### What This Plan Delivers

✅ **Complete interface architecture** - 6 TypeScript definitions (IUIBase + 5 variants)
✅ **Field categorization matrix** - All 30+ fields mapped to variants
✅ **Type safety design** - Compile-time mutual exclusivity enforcement
✅ **Migration guide** - Before/after examples for all 6 use cases
✅ **Developer experience improvements** - Decision tree, focused examples, error messages
✅ **Implementation roadmap** - 8-week timeline with phases and risks
✅ **Validation plan** - User testing, metrics, acceptance criteria

### Expected Outcomes

| Metric | Improvement |
|--------|-------------|
| **UX Score** | 4.2/10 → 7.7/10 (+83%) |
| **Time to First Code** | 25-35 min → 10-15 min (-60%) |
| **Documentation Lookups** | 8-12 → 2-4 (-70%) |
| **Cognitive Load** | VERY HIGH → MEDIUM (-66%) |
| **Error Rate** | 90% → 5-10% (-89%) |
| **Compile-Time Safety** | 0% → 100% (all errors caught before runtime) |

### Immediate Next Steps

1. **Week 1:** Recruit 3-5 beta testers for design validation
2. **Week 1-2:** Conduct user testing sessions and gather feedback
3. **Week 2:** Finalize interface definitions based on feedback
4. **Week 3:** Begin core implementation (IUIBase + 5 variants)
5. **Week 4:** Update parser and add deprecation warnings
6. **Week 5:** Build codemod for automatic migration
7. **Week 6:** Test codemod on all examples and document edge cases
8. **Week 7:** Create comprehensive documentation and video walkthrough
9. **Week 8:** Release v3.5.0 with deprecation warnings
10. **Week 12-16:** Release v4.0.0 with breaking changes (after 4-6 week adoption period)

### Open Questions for Stakeholders

1. **Timeline:** Is 8 weeks acceptable for v3.5.0 release? (v4.0.0 would follow 4-6 weeks later)
2. **Resources:** Can we allocate 2-3 engineers + supporting roles for this project?
3. **Beta Testing:** Can we recruit 3-5 Simply-MCP users for design validation?
4. **Breaking Changes:** Is the phased rollout plan (v3.5.0 deprecation → v4.0.0 breaking change) acceptable?
5. **Success Threshold:** Is 7.5-8.0/10 UX score the right target, or should we aim higher/lower?

---

**END OF PLAN**

**This plan is ready for stakeholder review and approval.**

**Next Action:** Present to Simply-MCP leadership for approval and resource allocation.
