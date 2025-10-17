# MCP-UI Next.js Demo - Architecture Diagrams

This document provides visual representations of the system architecture to help implementers understand component relationships and data flow.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                     MCP-UI Next.js Demo Application                      │
│                          (demos/nextjs-mcp-ui/)                          │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │                    Browser Layer (User Interface)                │   │
│  │                                                                   │   │
│  │   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │   │
│  │   ┃  Next.js 15 App Router Pages                          ┃   │   │
│  │   ┃                                                        ┃   │   │
│  │   ┃  ┌───────────┐  ┌──────────────┐  ┌──────────────┐  ┃   │   │
│  │   ┃  │   Home    │  │  Foundation  │  │   Browser    │  ┃   │   │
│  │   ┃  │   Page    │  │    Demos     │  │     Page     │  ┃   │   │
│  │   ┃  └─────┬─────┘  └──────┬───────┘  └──────┬───────┘  ┃   │   │
│  │   ┃        │                │                 │           ┃   │   │
│  │   ┗━━━━━━━━┿━━━━━━━━━━━━━━━┿━━━━━━━━━━━━━━━━┿━━━━━━━━━━━┛   │   │
│  │            │                │                 │                │   │
│  │            └────────────────┴─────────────────┘                │   │
│  │                             │                                   │   │
│  │   ┏━━━━━━━━━━━━━━━━━━━━━━━━┿━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │   │
│  │   ┃  Demo Components Layer  │                              ┃   │   │
│  │   ┃                         ▼                              ┃   │   │
│  │   ┃  ┌──────────────────────────────────────────────────┐ ┃   │   │
│  │   ┃  │         ResourceViewer (Wrapper)                 │ ┃   │   │
│  │   ┃  │  - Shows metadata                                │ ┃   │   │
│  │   ┃  │  - Toggle source view                            │ ┃   │   │
│  │   ┃  │  - Copy source button                            │ ┃   │   │
│  │   ┃  └──────────────────┬───────────────────────────────┘ ┃   │   │
│  │   ┃                     │                                  ┃   │   │
│  │   ┗━━━━━━━━━━━━━━━━━━━━┿━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │   │
│  │                         │                                      │   │
│  └─────────────────────────┼──────────────────────────────────────┘   │
│                            │                                           │
│  ┌─────────────────────────┼──────────────────────────────────────┐   │
│  │                         │                                       │   │
│  │    Application Logic Layer                                     │   │
│  │                         │                                       │   │
│  │   ┏━━━━━━━━━━━━━━━━━━━━┿━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓     │   │
│  │   ┃  React Hooks        ▼                               ┃     │   │
│  │   ┃  ┌────────────────────────────────────────────────┐ ┃     │   │
│  │   ┃  │     useResource(resourceId)                    │ ┃     │   │
│  │   ┃  │  - Manages loading state                       │ ┃     │   │
│  │   ┃  │  - Handles errors                              │ ┃     │   │
│  │   ┃  │  - Returns UIResourceContent                   │ ┃     │   │
│  │   ┃  └──────────────────┬─────────────────────────────┘ ┃     │   │
│  │   ┃                     │                                ┃     │   │
│  │   ┗━━━━━━━━━━━━━━━━━━━━┿━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛     │   │
│  │                         │                                       │   │
│  │   ┏━━━━━━━━━━━━━━━━━━━━┿━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓     │   │
│  │   ┃  Mock MCP Client    ▼                               ┃     │   │
│  │   ┃  ┌────────────────────────────────────────────────┐ ┃     │   │
│  │   ┃  │      MockMcpClient                             │ ┃     │   │
│  │   ┃  │  - getResource(id): UIResourceContent          │ ┃     │   │
│  │   ┃  │  - listResources(): UIResourceContent[]        │ ┃     │   │
│  │   ┃  │  - executeTool(name, params): any (Layer 2+)   │ ┃     │   │
│  │   ┃  └──────────────────┬─────────────────────────────┘ ┃     │   │
│  │   ┃                     │                                ┃     │   │
│  │   ┗━━━━━━━━━━━━━━━━━━━━┿━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛     │   │
│  │                         │                                       │   │
│  │   ┏━━━━━━━━━━━━━━━━━━━━┿━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓     │   │
│  │   ┃  Resource Catalog   ▼                               ┃     │   │
│  │   ┃  ┌────────────────────────────────────────────────┐ ┃     │   │
│  │   ┃  │      DEMO_RESOURCES                            │ ┃     │   │
│  │   ┃  │  - simple-product-card: UIResourceContent      │ ┃     │   │
│  │   ┃  │  - dynamic-stats: UIResourceContent            │ ┃     │   │
│  │   ┃  │  - feature-gallery: UIResourceContent          │ ┃     │   │
│  │   ┃  └────────────────────────────────────────────────┘ ┃     │   │
│  │   ┃                                                      ┃     │   │
│  │   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛     │   │
│  │                                                               │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
                            │ imports from (TypeScript path alias)
                            │
┌───────────────────────────┼───────────────────────────────────────────┐
│                           │                                           │
│        simple-mcp/src/client/  (Real MCP-UI Components)              │
│                           │                                           │
│   ┏━━━━━━━━━━━━━━━━━━━━━┿━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│   ┃  UIResourceRenderer   ▼                                      ┃   │
│   ┃  ┌──────────────────────────────────────────────────────┐   ┃   │
│   ┃  │  UIResourceRenderer (Router Component)               │   ┃   │
│   ┃  │  - Validates UIResource structure                    │   ┃   │
│   ┃  │  - Detects MIME type                                 │   ┃   │
│   ┃  │  - Routes to appropriate renderer                    │   ┃   │
│   ┃  │  - Error handling & graceful degradation             │   ┃   │
│   ┃  └──────────────────┬──────────────┬─────────────────────┘   ┃   │
│   ┃                     │              │                          ┃   │
│   ┗━━━━━━━━━━━━━━━━━━━━┿━━━━━━━━━━━━━━┿━━━━━━━━━━━━━━━━━━━━━━━━┛   │
│                         │              │                              │
│   ┏━━━━━━━━━━━━━━━━━━━━┿━━━━━━━━━━━━━━┿━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│   ┃  Specialized        ▼              ▼                          ┃   │
│   ┃  Renderers   ┌─────────────┐  ┌──────────────┐              ┃   │
│   ┃              │   HTML      │  │  RemoteDOM   │  (Layer 3+)  ┃   │
│   ┃              │  Renderer   │  │   Renderer   │              ┃   │
│   ┃              └─────────────┘  └──────────────┘              ┃   │
│   ┃                     │                                        ┃   │
│   ┗━━━━━━━━━━━━━━━━━━━━┿━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
│                         │                                           │
│   ┏━━━━━━━━━━━━━━━━━━━━┿━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│   ┃  HTMLResourceRenderer  ▼                                    ┃   │
│   ┃  ┌──────────────────────────────────────────────────────┐  ┃   │
│   ┃  │  HTMLResourceRenderer                                │  ┃   │
│   ┃  │  - Creates sandboxed <iframe>                        │  ┃   │
│   ┃  │  - Uses srcdoc for inline HTML (Layer 1)            │  ┃   │
│   ┃  │  - Uses src for external URLs (Layer 2+)            │  ┃   │
│   ┃  │  - Handles postMessage events (Layer 2+)            │  ┃   │
│   ┃  │  - Security: sandbox="allow-scripts"                │  ┃   │
│   ┃  │  - Origin validation                                 │  ┃   │
│   ┃  │  - Loading states                                    │  ┃   │
│   ┃  └──────────────────────────────────────────────────────┘  ┃   │
│   ┃                                                             ┃   │
│   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
│                                                                     │
│   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│   ┃  Utilities & Types                                          ┃   │
│   ┃  ┌──────────────────────────────────────────────────────┐  ┃   │
│   ┃  │  ui-types.ts                                         │  ┃   │
│   ┃  │  - UIResourceContent                                 │  ┃   │
│   ┃  │  - UIActionResult                                    │  ┃   │
│   ┃  │  - ToolCallAction                                    │  ┃   │
│   ┃  │  - Other action types                                │  ┃   │
│   ┃  └──────────────────────────────────────────────────────┘  ┃   │
│   ┃  ┌──────────────────────────────────────────────────────┐  ┃   │
│   ┃  │  ui-utils.ts                                         │  ┃   │
│   ┃  │  - getContentType(mimeType)                          │  ┃   │
│   ┃  │  - isUIResource(resource)                            │  ┃   │
│   ┃  │  - validateOrigin(origin)                            │  ┃   │
│   ┃  │  - buildSandboxAttribute(...)                        │  ┃   │
│   ┃  └──────────────────────────────────────────────────────┘  ┃   │
│   ┃                                                             ┃   │
│   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### Layer 1: Rendering Flow

```
┌─────────────┐
│    User     │
│  navigates  │
│   to demo   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│     Next.js Page Component              │
│  (e.g., /foundation/simple-card/page)   │
│                                         │
│  useResource('simple-product-card')     │
└──────────────┬──────────────────────────┘
               │
               │ calls
               │
               ▼
┌─────────────────────────────────────────┐
│        useResource Hook                 │
│  - Sets loading state                   │
│  - Calls mockMcpClient.getResource()    │
│  - Handles errors                       │
└──────────────┬──────────────────────────┘
               │
               │ calls
               │
               ▼
┌─────────────────────────────────────────┐
│       MockMcpClient                     │
│  - Looks up resource in catalog         │
│  - Simulates network delay              │
│  - Returns UIResourceContent            │
└──────────────┬──────────────────────────┘
               │
               │ queries
               │
               ▼
┌─────────────────────────────────────────┐
│      DEMO_RESOURCES                     │
│  {                                      │
│    'simple-product-card': {             │
│      uri: 'ui://...',                   │
│      mimeType: 'text/html',             │
│      text: '<html>...</html>'           │
│    }                                    │
│  }                                      │
└──────────────┬──────────────────────────┘
               │
               │ returns
               │
               ▼
┌─────────────────────────────────────────┐
│        useResource Hook                 │
│  - Receives UIResourceContent           │
│  - Updates state with resource          │
│  - Sets loading = false                 │
└──────────────┬──────────────────────────┘
               │
               │ returns to
               │
               ▼
┌─────────────────────────────────────────┐
│     Next.js Page Component              │
│  - Receives resource                    │
│  - Passes to <ResourceViewer>           │
└──────────────┬──────────────────────────┘
               │
               │ renders
               │
               ▼
┌─────────────────────────────────────────┐
│      ResourceViewer Component           │
│  - Shows metadata bar                   │
│  - Adds source toggle button            │
│  - Passes resource to UIResourceRenderer│
└──────────────┬──────────────────────────┘
               │
               │ renders
               │
               ▼
┌─────────────────────────────────────────┐
│   UIResourceRenderer                    │
│   (from simple-mcp)                     │
│  - Validates resource structure         │
│  - Detects mimeType: 'text/html'        │
│  - Routes to HTMLResourceRenderer       │
└──────────────┬──────────────────────────┘
               │
               │ renders
               │
               ▼
┌─────────────────────────────────────────┐
│   HTMLResourceRenderer                  │
│   (from simple-mcp)                     │
│  - Creates <iframe>                     │
│  - Sets sandbox="allow-scripts"         │
│  - Sets srcdoc={resource.text}          │
│  - Manages iframe ref                   │
└──────────────┬──────────────────────────┘
               │
               │ browser renders
               │
               ▼
┌─────────────────────────────────────────┐
│  Sandboxed iframe in Browser            │
│  - HTML content displays                │
│  - CSS styles applied                   │
│  - JavaScript runs (if any)             │
│  - Isolated from parent                 │
└─────────────────────────────────────────┘
               │
               │
               ▼
┌─────────────────────────────────────────┐
│         User sees UI                    │
└─────────────────────────────────────────┘
```

### Layer 2: Interactive Flow (Future)

```
┌─────────────┐
│    User     │
│   clicks    │
│   button    │
│  in iframe  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  JavaScript in iframe                   │
│  window.parent.postMessage({            │
│    type: 'tool',                        │
│    payload: {                           │
│      toolName: 'add_to_cart',           │
│      params: { productId: '123' }       │
│    }                                    │
│  }, '*')                                │
└──────────────┬──────────────────────────┘
               │
               │ postMessage
               │
               ▼
┌─────────────────────────────────────────┐
│  HTMLResourceRenderer                   │
│  - Listens for 'message' event          │
│  - Validates origin                     │
│  - Calls onUIAction callback            │
└──────────────┬──────────────────────────┘
               │
               │ callback
               │
               ▼
┌─────────────────────────────────────────┐
│  ResourceViewer Component               │
│  - Receives action                      │
│  - Extracts toolName and params         │
│  - Calls mockMcpClient.executeTool()    │
└──────────────┬──────────────────────────┘
               │
               │ calls
               │
               ▼
┌─────────────────────────────────────────┐
│       MockMcpClient                     │
│  - Executes tool logic                  │
│  - Returns result                       │
└──────────────┬──────────────────────────┘
               │
               │ returns
               │
               ▼
┌─────────────────────────────────────────┐
│  ResourceViewer Component               │
│  - Displays success message             │
│  - May update resource (Layer 2+)       │
└─────────────────────────────────────────┘
```

---

## Component Hierarchy

```
app/
├── layout.tsx (Root Layout)
│   ├── <Navigation />
│   ├── {children}
│   └── <Footer />
│
├── page.tsx (Home Page)
│   └── <DemoCard /> (x3)
│
└── foundation/
    ├── layout.tsx (Foundation Layout)
    │   └── <Sidebar />
    │
    └── simple-card/
        └── page.tsx (Demo Page)
            └── <DemoLayout>
                └── <ResourceViewer>
                    ├── Metadata bar
                    ├── Toggle button
                    └── Conditional render:
                        ├── <UIResourceRenderer> (preview mode)
                        │   └── <HTMLResourceRenderer>
                        │       └── <iframe sandbox srcdoc>
                        │
                        └── <CodePreview> (source mode)
                            └── Syntax highlighted HTML
```

---

## File Dependency Graph

```
app/foundation/simple-card/page.tsx
│
├─→ hooks/useResource.ts
│   └─→ lib/mockMcpClient.ts
│       └─→ lib/demoResources.ts
│
├─→ components/demo/DemoLayout.tsx
│   ├─→ components/layout/Navigation.tsx
│   └─→ components/ui/Button.tsx
│
└─→ components/demo/ResourceViewer.tsx
    ├─→ components/demo/CodePreview.tsx
    │   └─→ prismjs
    │
    └─→ @mcp-ui/UIResourceRenderer
        └─→ @mcp-ui/HTMLResourceRenderer
            ├─→ @mcp-ui/ui-types
            └─→ @mcp-ui/ui-utils
```

**Path Resolution**:
- `@mcp-ui/*` → `../../simple-mcp/src/client/*`
- `@/*` → `./` (demo app root)

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser Security Layers                 │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Layer 1: Content Security Policy (CSP)               │ │
│  │  - Configured in Next.js middleware                   │ │
│  │  - Restricts script sources                           │ │
│  │  - Controls frame sources                             │ │
│  └────────────────────────────────────────────────────────┘ │
│                             │                                │
│                             │ enforces                       │
│                             │                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Layer 2: iframe Sandbox Attribute                    │ │
│  │  - Set by HTMLResourceRenderer                        │ │
│  │  - Layer 1: sandbox="allow-scripts"                   │ │
│  │  - Blocks: forms, popups, same-origin, navigation     │ │
│  └────────────────────────────────────────────────────────┘ │
│                             │                                │
│                             │ isolates                       │
│                             │                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Layer 3: iframe Content Isolation                    │ │
│  │  - Separate DOM                                       │ │
│  │  - Separate JavaScript context                        │ │
│  │  - No access to parent window                         │ │
│  │  - Communication only via postMessage                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                             │                                │
│                             │ validates                      │
│                             │                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Layer 4: postMessage Origin Validation               │ │
│  │  - Implemented in ui-utils.ts                         │ │
│  │  - Accepts: 'null' (srcdoc), localhost, https        │ │
│  │  - Rejects: other origins                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                             │                                │
│                             │ sanitizes                      │
│                             │                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Layer 5: Input Sanitization (Custom HTML Demo)       │ │
│  │  - Removes <script> tags                              │ │
│  │  - Removes event handlers                             │ │
│  │  - Defense in depth (sandbox still enforces)          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Type System Flow

```
TypeScript Type Definitions
│
├─→ simple-mcp/src/client/ui-types.ts
│   ├─→ UIResourceContent
│   ├─→ UIActionResult
│   ├─→ ToolCallAction
│   ├─→ NotifyAction
│   ├─→ LinkAction
│   ├─→ PromptAction
│   └─→ IntentAction
│
└─→ Used by:
    │
    ├─→ demos/nextjs-mcp-ui/lib/mockMcpClient.ts
    │   └─→ MockMcpResponse uses UIResourceContent
    │
    ├─→ demos/nextjs-mcp-ui/lib/demoResources.ts
    │   └─→ DEMO_RESOURCES: Record<string, UIResourceContent>
    │
    ├─→ demos/nextjs-mcp-ui/hooks/useResource.ts
    │   └─→ UseResourceResult.resource: UIResourceContent | null
    │
    └─→ demos/nextjs-mcp-ui/components/demo/ResourceViewer.tsx
        └─→ Props.resource: UIResourceContent
```

**Key Principle**: All type definitions come from `simple-mcp`. The demo app never redefines MCP-UI types.

---

## Build & Runtime Process

```
Development (npm run dev)
│
├─→ Next.js 15 Dev Server starts
│   ├─→ Compiles TypeScript
│   ├─→ Resolves path aliases (@mcp-ui/*, @/*)
│   ├─→ Hot Module Replacement (HMR) enabled
│   └─→ Server Components run on server
│
├─→ User navigates to page
│   ├─→ Next.js renders Server Component
│   ├─→ Streams HTML to browser
│   └─→ Hydrates Client Components
│
├─→ Client Component executes
│   ├─→ useResource hook runs
│   ├─→ mockMcpClient.getResource() called
│   └─→ UIResourceRenderer renders
│
└─→ Browser displays UI
    └─→ iframe with sandboxed content

Production (npm run build)
│
├─→ Next.js build process
│   ├─→ TypeScript compiled to JavaScript
│   ├─→ Server Components optimized
│   ├─→ Client Components bundled
│   ├─→ Static pages pre-rendered
│   └─→ Output in .next/ directory
│
└─→ npm start
    ├─→ Next.js production server
    ├─→ Serves optimized bundles
    └─→ Server-side rendering on demand
```

---

## State Management

```
Application State
│
├─→ Page Level (Demo Pages)
│   ├─→ resource: UIResourceContent | null
│   ├─→ loading: boolean
│   └─→ error: string | null
│
├─→ Component Level (ResourceViewer)
│   └─→ viewMode: 'preview' | 'source'
│
└─→ No Global State
    └─→ Each page manages its own state independently
```

**Philosophy**: Simple, local state only. No Redux, Zustand, or other state libraries needed for Layer 1.

---

## Error Handling Flow

```
Error occurs at any level
│
├─→ useResource hook
│   ├─→ Catches async errors
│   ├─→ Sets error state
│   └─→ Returns { error: string }
│
├─→ Page component
│   ├─→ Checks if error exists
│   └─→ Renders error message
│
├─→ UIResourceRenderer
│   ├─→ Validates resource structure
│   ├─→ Catches rendering errors (try-catch)
│   └─→ Displays error UI with details
│
└─→ HTMLResourceRenderer
    ├─→ Handles iframe load errors
    ├─→ Shows loading error state
    └─→ Logs to console for debugging
```

**Error Display Principles**:
- User-friendly messages in UI
- Technical details in expandable sections
- Full errors logged to console
- Graceful degradation (never crash)

---

## Responsive Design Breakpoints

```
Mobile First Approach

┌─────────────────────────────────────────┐
│  Mobile (320px - 767px)                 │
│  - Single column layout                 │
│  - Full width iframes                   │
│  - Hamburger menu                       │
│  - Stacked cards                        │
└─────────────────────────────────────────┘
                  │
                  │ @media (min-width: 768px)
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Tablet (768px - 1023px)                │
│  - Two column layout                    │
│  - Expanded navigation                  │
│  - Side-by-side cards                   │
└─────────────────────────────────────────┘
                  │
                  │ @media (min-width: 1024px)
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Desktop (1024px+)                      │
│  - Three column layout                  │
│  - Full navigation                      │
│  - Sidebar visible                      │
│  - Optimal iframe sizing                │
└─────────────────────────────────────────┘
```

---

## Performance Considerations

```
Performance Optimizations
│
├─→ Server Components (Default)
│   ├─→ Navigation, Footer, DemoLayout
│   └─→ Zero JavaScript sent to client
│
├─→ Client Components (Only when needed)
│   ├─→ ResourceViewer (needs interactivity)
│   ├─→ useResource (needs state)
│   └─→ UIResourceRenderer (uses hooks)
│
├─→ Code Splitting
│   ├─→ Each page is separate chunk
│   ├─→ Dynamic imports for heavy components
│   └─→ Next.js automatic chunking
│
├─→ Static Generation
│   ├─→ Home page pre-rendered
│   └─→ Demo pages generated on-demand
│
└─→ Asset Optimization
    ├─→ Tailwind CSS purged (unused removed)
    ├─→ Images optimized (Next.js Image)
    └─→ Fonts optimized (next/font)
```

---

## Testing Architecture

```
Testing Strategy
│
├─→ Manual Testing (Primary)
│   ├─→ Visual inspection in browser
│   ├─→ Cross-browser testing
│   ├─→ Responsive design testing
│   └─→ Security testing (DevTools)
│
├─→ Automated Tests (Optional)
│   ├─→ Unit Tests (Jest)
│   │   ├─→ mockMcpClient.test.ts
│   │   └─→ demoResources.test.ts
│   │
│   └─→ Component Tests (React Testing Library)
│       ├─→ ResourceViewer.test.tsx
│       └─→ DemoLayout.test.tsx
│
└─→ End-to-End Tests (Optional)
    └─→ Playwright or Cypress
        └─→ User flow testing
```

---

## Deployment Architecture (Future)

```
Deployment Options
│
├─→ Vercel (Recommended)
│   ├─→ Automatic deployments from Git
│   ├─→ Preview deployments for PRs
│   ├─→ Edge functions support
│   └─→ Built-in analytics
│
├─→ Netlify
│   ├─→ Similar to Vercel
│   ├─→ Good Next.js support
│   └─→ Automatic SSL
│
├─→ Docker
│   ├─→ Container with Node.js
│   ├─→ Run npm run build
│   ├─→ Run npm start
│   └─→ Deploy anywhere
│
└─→ Static Export (Limited)
    ├─→ Next.js static HTML export
    ├─→ No server-side features
    └─→ Can host on any static host
```

**Note**: Deployment is not in scope for Layer 1. This is for future reference.

---

## Extension Points for Layers 2 & 3

```
Layer 1 Foundation
│
├─→ MockMcpClient.executeTool() ← Add tool logic here (Layer 2)
│
├─→ HTMLResourceRenderer.onUIAction ← Already handles postMessage (Layer 2)
│
├─→ ResourceViewer.onAction ← Add action handler here (Layer 2)
│
├─→ UIResourceRenderer ← Already routes to RemoteDOMRenderer (Layer 3)
│
└─→ demoResources.ts ← Add new MIME types here (Layer 2 & 3)
```

**Design Principle**: Layer 1 architecture is intentionally designed to be extended without refactoring.

---

## Conclusion

These diagrams provide a comprehensive visual reference for understanding the MCP-UI Next.js demo architecture. Use them to:

1. **Understand component relationships**: See how pieces fit together
2. **Follow data flow**: Track how resources move through the system
3. **Verify security**: Understand multiple layers of protection
4. **Plan extensions**: Know where to add Layer 2 & 3 features
5. **Debug issues**: Identify where problems might occur

**Key Takeaway**: The demo uses real MCP-UI components with a mock client to create a realistic, secure, and extensible demonstration system.

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-16
