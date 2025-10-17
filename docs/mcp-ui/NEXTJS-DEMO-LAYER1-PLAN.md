# Layer 1: Foundation - Next.js Demo Implementation Plan

**Version**: 1.0.0
**Date**: 2025-10-16
**Status**: Planning Phase
**Estimated Duration**: 8-12 hours for complete implementation

---

## Executive Summary

This document provides a comprehensive, step-by-step implementation plan for building Layer 1 (Foundation) of the MCP-UI Next.js demo system. The goal is to create a working Next.js 15 application that demonstrates basic HTML resource rendering using the real React components from `simple-mcp/src/client`.

**Key Principle**: We are **NOT rebuilding MCP-UI**. The complete MCP-UI implementation already exists in `simple-mcp` (all 5 layers, 2,453 lines of code, 113 passing tests). This demo will **USE** those existing components with a mock MCP client to create an interactive showcase.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Architecture Overview](#2-architecture-overview)
3. [Detailed File Structure](#3-detailed-file-structure)
4. [Dependency Analysis](#4-dependency-analysis)
5. [Component Breakdown](#5-component-breakdown)
6. [Mock Client Specification](#6-mock-client-specification)
7. [Integration Points](#7-integration-points)
8. [Security Considerations](#8-security-considerations)
9. [Testing Strategy](#9-testing-strategy)
10. [Implementation Sequence](#10-implementation-sequence)
11. [Validation Checkpoints](#11-validation-checkpoints)
12. [Success Criteria](#12-success-criteria)
13. [Risk Analysis & Mitigation](#13-risk-analysis--mitigation)
14. [Future Expansion (Layers 2 & 3)](#14-future-expansion-layers-2--3)

---

## 1. Current State Analysis

### 1.1 What Already Exists

The `simple-mcp` repository at `/mnt/Shared/cs-projects/simple-mcp` contains:

**Complete MCP-UI Implementation**:
- ✅ `UIResourceRenderer.tsx` - Main router component (284 lines)
- ✅ `HTMLResourceRenderer.tsx` - HTML iframe renderer (445 lines)
- ✅ `RemoteDOMRenderer.tsx` - Remote DOM renderer (Layer 3)
- ✅ `ui-types.ts` - Complete type definitions (357 lines)
- ✅ `ui-utils.ts` - Utility functions (security, validation)
- ✅ `index.ts` - Public API exports

**Server-Side Implementation**:
- ✅ Complete server-side API in `src/` (BuildMCPServer, decorators, etc.)
- ✅ UI resource creation helpers
- ✅ Examples in `examples/ui-foundation-demo.ts`

**Documentation**:
- ✅ 2,300+ lines of comprehensive documentation
- ✅ `docs/mcp-ui/` with all layer specs
- ✅ Security guide, API reference, implementation summaries
- ✅ Interactive demo HTML file (though not Next.js)

**Tests**:
- ✅ 113 passing tests
- ✅ Unit, component, and integration tests
- ✅ 100% test success rate

### 1.2 What's Currently Commented Out

In `/mnt/Shared/cs-projects/simple-mcp/src/client/index.ts`:

```typescript
// Components (Note: React components require React as a peer dependency)
// export { HTMLResourceRenderer } from './HTMLResourceRenderer.js';
// export type { HTMLResourceRendererProps } from './HTMLResourceRenderer.js';

// export { UIResourceRenderer } from './UIResourceRenderer.js';
// export type { UIResourceRendererProps } from './UIResourceRenderer.js';
```

**Why**: These are commented out because the main `simple-mcp` package is a Node.js library, and including React components would require React as a peer dependency for all users.

**Implication for Demo**: We'll need to import these components directly from the source files, not from the package exports.

### 1.3 What We Need to Build

**New Next.js Demo Application** (`demos/nextjs-mcp-ui/`):
1. Next.js 15 App Router structure
2. Mock MCP client that simulates server responses
3. Demo pages showcasing different HTML UI resources
4. Integration with real `UIResourceRenderer` components
5. Interactive examples with multiple resource types
6. Navigation between different demos

**Key Design Decision**: This is a **demo/showcase application**, not a production MCP client. The mock client will simulate MCP protocol responses to demonstrate UI rendering capabilities.

---

## 2. Architecture Overview

### 2.1 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                   Next.js 15 Application                     │
│                  (demos/nextjs-mcp-ui/)                      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │          App Router Pages (app/)                    │    │
│  │  - Home page with navigation                        │    │
│  │  - Foundation demos (simple card, gallery, etc.)    │    │
│  │  - Resource browser                                 │    │
│  └─────────────┬──────────────────────────────────────┘    │
│                │                                             │
│  ┌─────────────▼──────────────────────────────────────┐    │
│  │      Mock MCP Client (lib/mockMcpClient.ts)        │    │
│  │  - Simulates MCP protocol responses                │    │
│  │  - Returns UIResource objects                      │    │
│  │  - Manages demo resource catalog                   │    │
│  └─────────────┬──────────────────────────────────────┘    │
│                │                                             │
│  ┌─────────────▼──────────────────────────────────────┐    │
│  │    Demo Components (components/)                    │    │
│  │  - ResourceViewer wrapper                          │    │
│  │  - Navigation components                           │    │
│  │  - Demo layouts                                    │    │
│  └─────────────┬──────────────────────────────────────┘    │
│                │                                             │
└────────────────┼─────────────────────────────────────────────┘
                 │
                 │ imports from
                 │
┌────────────────▼─────────────────────────────────────────────┐
│           simple-mcp/src/client/                             │
│        (Real MCP-UI Components - Already Built)              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  UIResourceRenderer.tsx                              │  │
│  │  - Main router component                             │  │
│  │  - Detects resource type                             │  │
│  │  - Error handling                                    │  │
│  └────────────┬─────────────────────────────────────────┘  │
│               │                                              │
│  ┌────────────▼─────────────────────────────────────────┐  │
│  │  HTMLResourceRenderer.tsx                            │  │
│  │  - Renders HTML in sandboxed iframes                │  │
│  │  - Handles postMessage (Layer 2)                    │  │
│  │  - Security: sandbox attributes                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ui-types.ts & ui-utils.ts                          │  │
│  │  - Type definitions                                 │  │
│  │  - Utility functions                                │  │
│  │  - Validation helpers                               │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

**Rendering Flow** (Foundation Layer):
1. User navigates to demo page
2. Page component calls mock MCP client
3. Mock client returns UIResource object
4. Page passes resource to `UIResourceRenderer`
5. `UIResourceRenderer` detects MIME type (`text/html`)
6. Routes to `HTMLResourceRenderer`
7. `HTMLResourceRenderer` creates sandboxed iframe
8. HTML renders in iframe with security constraints

**Future Flow** (Layer 2+):
- iframe postMessage → parent handler → mock tool execution
- Mock client triggers → new resource → re-render

### 2.3 Technology Stack

**Next.js Application**:
- **Framework**: Next.js 15.1.0 (latest stable with App Router)
- **React**: 19.x (required by Next.js 15)
- **TypeScript**: 5.x
- **Styling**: Tailwind CSS 4.x (modern, utility-first)
- **Rendering**: Server Components + Client Components

**MCP-UI Components** (from simple-mcp):
- **React**: 18.x compatible (works with React 19)
- **TypeScript**: Already typed
- **No external dependencies**: Pure React components

**Compatibility Note**: React 19 is backward compatible with React 18 patterns used in MCP-UI components.

---

## 3. Detailed File Structure

### 3.1 Complete Directory Layout

```
demos/nextjs-mcp-ui/
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── next.config.ts                  # Next.js configuration
├── tailwind.config.ts              # Tailwind CSS config
├── postcss.config.js               # PostCSS config (for Tailwind)
├── .env.local.example              # Environment variables template
├── .gitignore                      # Git ignore rules
├── README.md                       # Demo documentation
│
├── public/                         # Static assets
│   ├── mcp-ui-logo.svg
│   └── favicon.ico
│
├── app/                            # Next.js App Router
│   ├── layout.tsx                  # Root layout (nav, providers)
│   ├── page.tsx                    # Home page (overview + links)
│   ├── globals.css                 # Global styles (Tailwind)
│   │
│   ├── foundation/                 # Layer 1 demos
│   │   ├── layout.tsx              # Foundation section layout
│   │   ├── page.tsx                # Foundation overview
│   │   ├── simple-card/
│   │   │   └── page.tsx            # Demo: Simple product card
│   │   ├── dynamic-stats/
│   │   │   └── page.tsx            # Demo: Dynamic stats dashboard
│   │   ├── feature-gallery/
│   │   │   └── page.tsx            # Demo: Complex styled gallery
│   │   └── custom-html/
│   │       └── page.tsx            # Demo: User-provided HTML (sandbox)
│   │
│   ├── browser/                    # Resource browser
│   │   └── page.tsx                # Browse all demo resources
│   │
│   └── api/                        # API routes (optional, for future)
│       └── health/
│           └── route.ts            # Health check endpoint
│
├── components/                     # Demo-specific components
│   ├── layout/
│   │   ├── Navigation.tsx          # Main navigation bar
│   │   ├── Sidebar.tsx             # Sidebar with demo links
│   │   └── Footer.tsx              # Footer with info
│   │
│   ├── demo/
│   │   ├── ResourceViewer.tsx      # Wrapper for UIResourceRenderer
│   │   ├── CodePreview.tsx         # Shows HTML source code
│   │   ├── DemoCard.tsx            # Card for demo previews
│   │   └── DemoLayout.tsx          # Standard layout for demos
│   │
│   └── ui/                         # Reusable UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       └── Badge.tsx
│
├── lib/                            # Library code
│   ├── mockMcpClient.ts            # Mock MCP client implementation
│   ├── demoResources.ts            # Catalog of demo resources
│   ├── types.ts                    # Demo-specific types
│   └── utils.ts                    # Utility functions
│
├── hooks/                          # React hooks
│   ├── useResource.ts              # Hook for fetching resources
│   └── useDemo.ts                  # Hook for demo state management
│
└── styles/                         # Additional styles
    └── iframe-sandbox.css          # iframe-specific styling
```

### 3.2 File Responsibilities

| File | Purpose | Key Features |
|------|---------|--------------|
| `mockMcpClient.ts` | Simulates MCP server | Returns UIResource objects, manages catalog |
| `demoResources.ts` | Resource definitions | HTML content for all demos |
| `ResourceViewer.tsx` | Wraps UIResourceRenderer | Adds demo-specific UI (source view, controls) |
| `useResource.ts` | Resource loading hook | Simulates async resource fetching |
| `app/foundation/*/page.tsx` | Individual demos | Showcases specific features |

---

## 4. Dependency Analysis

### 4.1 Required npm Packages

**Next.js Core**:
```json
{
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

**Styling**:
```json
{
  "dependencies": {
    "tailwindcss": "^4.0.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
```

**TypeScript**:
```json
{
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/node": "^20.10.0"
  }
}
```

**Code Display** (for showing source):
```json
{
  "dependencies": {
    "prismjs": "^1.29.0",
    "@types/prismjs": "^1.26.3"
  }
}
```

### 4.2 Internal Dependencies

**From simple-mcp** (imported directly, not as npm package):
- `UIResourceRenderer` from `../../simple-mcp/src/client/UIResourceRenderer.tsx`
- `HTMLResourceRenderer` from `../../simple-mcp/src/client/HTMLResourceRenderer.tsx`
- Types from `../../simple-mcp/src/client/ui-types.ts`
- Utils from `../../simple-mcp/src/client/ui-utils.ts`

**TypeScript Path Mapping** (in `tsconfig.json`):
```json
{
  "compilerOptions": {
    "paths": {
      "@mcp-ui/*": ["../../simple-mcp/src/client/*"],
      "@/*": ["./src/*"]
    }
  }
}
```

### 4.3 Peer Dependencies

None required - all MCP-UI components are self-contained.

### 4.4 Dependency Installation

```bash
cd demos/nextjs-mcp-ui
npm install next@latest react@latest react-dom@latest
npm install -D typescript @types/react @types/react-dom @types/node
npm install -D tailwindcss autoprefixer postcss
npm install prismjs @types/prismjs
```

---

## 5. Component Breakdown

### 5.1 Real Components (From simple-mcp)

These already exist and work perfectly. We import them directly.

#### `UIResourceRenderer`
**Location**: `simple-mcp/src/client/UIResourceRenderer.tsx`
**Status**: ✅ Complete (284 lines)

**Props**:
```typescript
interface UIResourceRendererProps {
  resource: UIResourceContent;
  onUIAction?: (action: UIActionResult) => void | Promise<void>;
  customSandboxPermissions?: string;
  autoResize?: boolean;
  style?: React.CSSProperties;
}
```

**Responsibilities**:
- Validates UIResource structure
- Detects MIME type (`text/html`, `text/uri-list`, `application/vnd.mcp-ui.remote-dom+javascript`)
- Routes to appropriate renderer
- Error handling with user-friendly messages
- Graceful degradation

**Layer 1 Support**: ✅ Full `text/html` support

#### `HTMLResourceRenderer`
**Location**: `simple-mcp/src/client/HTMLResourceRenderer.tsx`
**Status**: ✅ Complete (445 lines)

**Props**:
```typescript
interface HTMLResourceRendererProps {
  resource: UIResourceContent;
  onUIAction?: (action: UIActionResult) => void | Promise<void>;
  isExternalUrl?: boolean;
  customSandboxPermissions?: string;
  autoResize?: boolean;
  style?: React.CSSProperties;
}
```

**Responsibilities**:
- Renders HTML in sandboxed iframe
- Manages iframe refs
- Handles postMessage events (Layer 2+)
- Loading states for external URLs
- Security: sandbox attributes
- Origin validation

**Layer 1 Usage**:
- Pass `isExternalUrl={false}`
- Use `srcdoc` attribute for inline HTML
- Sandbox: `"allow-scripts"` only

### 5.2 Demo Components (New - To Build)

#### `ResourceViewer` (Wrapper Component)
**Location**: `components/demo/ResourceViewer.tsx`

**Purpose**: Wraps `UIResourceRenderer` with demo-specific UI

**Features**:
- Shows resource metadata (URI, MIME type, size)
- Toggle to view HTML source code
- Copy source button
- Loading states
- Error display
- Responsive container

**Props**:
```typescript
interface ResourceViewerProps {
  resource: UIResourceContent;
  showSource?: boolean;
  showMetadata?: boolean;
  onAction?: (action: UIActionResult) => void;
}
```

**Implementation**:
```typescript
'use client';

import { useState } from 'react';
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';
import { CodePreview } from './CodePreview';
import type { UIResourceContent, UIActionResult } from '@mcp-ui/ui-types';

export function ResourceViewer({
  resource,
  showSource = true,
  showMetadata = true,
  onAction
}: ResourceViewerProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');

  return (
    <div className="resource-viewer">
      {showMetadata && (
        <div className="metadata-bar">
          <span>URI: {resource.uri}</span>
          <span>Type: {resource.mimeType}</span>
          {showSource && (
            <button onClick={() => setViewMode(
              viewMode === 'preview' ? 'source' : 'preview'
            )}>
              {viewMode === 'preview' ? 'View Source' : 'View Preview'}
            </button>
          )}
        </div>
      )}

      {viewMode === 'preview' ? (
        <UIResourceRenderer
          resource={resource}
          onUIAction={onAction}
          style={{ height: '600px' }}
        />
      ) : (
        <CodePreview
          code={resource.text || ''}
          language="html"
        />
      )}
    </div>
  );
}
```

#### `CodePreview` (Source Display)
**Location**: `components/demo/CodePreview.tsx`

**Purpose**: Displays HTML source with syntax highlighting

**Features**:
- Syntax highlighting (via Prism.js)
- Copy to clipboard
- Line numbers
- Scrollable container

#### `DemoLayout` (Standard Layout)
**Location**: `components/demo/DemoLayout.tsx`

**Purpose**: Consistent layout for all demo pages

**Features**:
- Title and description
- Breadcrumb navigation
- Back to overview button
- Responsive grid for multiple demos
- Consistent spacing

#### `Navigation` (Main Nav)
**Location**: `components/layout/Navigation.tsx`

**Purpose**: Top navigation bar

**Features**:
- Logo and title
- Links to demo sections
- Active state highlighting
- Mobile responsive (hamburger menu)

---

## 6. Mock Client Specification

### 6.1 MockMcpClient Architecture

**File**: `lib/mockMcpClient.ts`

**Design Philosophy**: The mock client simulates the behavior of a real MCP client without any network calls. It provides immediate responses with pre-defined UIResource objects.

### 6.2 Implementation

```typescript
import type { UIResourceContent } from '@mcp-ui/ui-types';
import { DEMO_RESOURCES } from './demoResources';

export type ResourceId =
  | 'simple-product-card'
  | 'dynamic-stats'
  | 'feature-gallery'
  | 'custom-form';

export interface MockMcpResponse {
  success: boolean;
  resource?: UIResourceContent;
  error?: string;
}

export class MockMcpClient {
  private resources: Map<ResourceId, UIResourceContent>;

  constructor() {
    this.resources = new Map();
    this.loadResources();
  }

  /**
   * Load all demo resources into the client
   */
  private loadResources(): void {
    Object.entries(DEMO_RESOURCES).forEach(([id, resource]) => {
      this.resources.set(id as ResourceId, resource);
    });
  }

  /**
   * Get a resource by ID (simulates MCP resource read)
   *
   * @param resourceId - The resource identifier
   * @returns Promise resolving to the resource
   */
  async getResource(resourceId: ResourceId): Promise<MockMcpResponse> {
    // Simulate network delay
    await this.simulateDelay();

    const resource = this.resources.get(resourceId);

    if (!resource) {
      return {
        success: false,
        error: `Resource not found: ${resourceId}`
      };
    }

    return {
      success: true,
      resource
    };
  }

  /**
   * List all available resources (simulates MCP list_resources)
   */
  async listResources(): Promise<UIResourceContent[]> {
    await this.simulateDelay();
    return Array.from(this.resources.values());
  }

  /**
   * Simulate network delay for realism
   */
  private async simulateDelay(): Promise<void> {
    const delay = Math.random() * 200 + 100; // 100-300ms
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Execute a tool (for Layer 2+)
   * Currently returns a mock success response
   */
  async executeTool(
    toolName: string,
    params: Record<string, any>
  ): Promise<any> {
    await this.simulateDelay();

    console.log(`[MockMCP] Tool executed: ${toolName}`, params);

    return {
      success: true,
      message: `Tool ${toolName} executed successfully`,
      data: params
    };
  }
}

// Export singleton instance
export const mockMcpClient = new MockMcpClient();
```

### 6.3 Demo Resources Catalog

**File**: `lib/demoResources.ts`

```typescript
import type { UIResourceContent } from '@mcp-ui/ui-types';

export const DEMO_RESOURCES: Record<string, UIResourceContent> = {
  'simple-product-card': {
    uri: 'ui://demo/simple-product-card',
    mimeType: 'text/html',
    text: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .card {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 32px;
            max-width: 400px;
            width: 100%;
          }
          .card h2 {
            margin: 0 0 8px 0;
            font-size: 28px;
            font-weight: 700;
            color: #1a202c;
          }
          .card p {
            margin: 0 0 20px 0;
            color: #718096;
            line-height: 1.6;
          }
          .badge {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 16px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 24px 0;
          }
          .info-item {
            border-left: 3px solid #667eea;
            padding-left: 12px;
          }
          .info-label {
            font-size: 11px;
            color: #a0aec0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .info-value {
            font-size: 20px;
            font-weight: 700;
            color: #2d3748;
          }
          .footer {
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
          }
          .footer p {
            font-size: 13px;
            color: #a0aec0;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Layer 1: Foundation</div>
          <h2>Widget Pro X</h2>
          <p>High-performance widget with advanced features. Perfect for modern applications.</p>

          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Price</div>
              <div class="info-value">$299</div>
            </div>
            <div class="info-item">
              <div class="info-label">In Stock</div>
              <div class="info-value">✓ Yes</div>
            </div>
            <div class="info-item">
              <div class="info-label">Rating</div>
              <div class="info-value">4.8★</div>
            </div>
            <div class="info-item">
              <div class="info-label">Reviews</div>
              <div class="info-value">1.2K</div>
            </div>
          </div>

          <div class="footer">
            <p>
              This is a static HTML demo rendered in a sandboxed iframe.
              Interactivity will be added in Layer 2 with postMessage callbacks.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    _meta: {
      'mcpui.dev/ui-preferred-frame-size': { width: 500, height: 600 }
    }
  },

  'dynamic-stats': {
    uri: 'ui://demo/dynamic-stats',
    mimeType: 'text/html',
    text: generateDynamicStats(),
    _meta: {
      'mcpui.dev/ui-preferred-frame-size': { width: 700, height: 500 }
    }
  },

  'feature-gallery': {
    uri: 'ui://demo/feature-gallery',
    mimeType: 'text/html',
    text: generateFeatureGallery()
  }
};

function generateDynamicStats(): string {
  const stats = {
    activeUsers: Math.floor(Math.random() * 1000),
    requestsPerMin: Math.floor(Math.random() * 500),
    timestamp: new Date().toLocaleString()
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          min-height: 100vh;
        }
        .dashboard {
          max-width: 800px;
          margin: 0 auto;
        }
        h1 {
          margin: 0 0 32px 0;
          font-size: 32px;
          font-weight: 800;
          text-align: center;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }
        .stat-card {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
        }
        .stat-label {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .stat-value {
          font-size: 40px;
          font-weight: 800;
          margin-bottom: 4px;
        }
        .stat-change {
          font-size: 14px;
          opacity: 0.8;
        }
        .timestamp {
          margin-top: 32px;
          text-align: center;
          opacity: 0.7;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="dashboard">
        <h1>Server Statistics</h1>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Active Users</div>
            <div class="stat-value">${stats.activeUsers}</div>
            <div class="stat-change">↑ 12% from yesterday</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Requests/Min</div>
            <div class="stat-value">${stats.requestsPerMin}</div>
            <div class="stat-change">↑ 8% from yesterday</div>
          </div>
        </div>
        <div class="timestamp">
          Generated at: ${stats.timestamp}
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateFeatureGallery(): string {
  // Similar to the example from ui-foundation-demo.ts
  // ... implementation
}
```

### 6.4 React Hook for Resource Loading

**File**: `hooks/useResource.ts`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { mockMcpClient, type ResourceId } from '@/lib/mockMcpClient';
import type { UIResourceContent } from '@mcp-ui/ui-types';

export interface UseResourceResult {
  resource: UIResourceContent | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useResource(resourceId: ResourceId): UseResourceResult {
  const [resource, setResource] = useState<UIResourceContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadResource = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await mockMcpClient.getResource(resourceId);

      if (response.success && response.resource) {
        setResource(response.resource);
      } else {
        setError(response.error || 'Failed to load resource');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResource();
  }, [resourceId]);

  return {
    resource,
    loading,
    error,
    refetch: loadResource
  };
}
```

---

## 7. Integration Points

### 7.1 Importing Real Components

**Path Resolution** (tsconfig.json):
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@mcp-ui/*": ["../../simple-mcp/src/client/*"],
      "@/*": ["./*"]
    }
  }
}
```

**Usage in Demo Component**:
```typescript
// Import real MCP-UI components
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';
import { HTMLResourceRenderer } from '@mcp-ui/HTMLResourceRenderer';
import type { UIResourceContent, UIActionResult } from '@mcp-ui/ui-types';

// Use in component
export function MyDemo() {
  const { resource, loading } = useResource('simple-product-card');

  if (loading) return <div>Loading...</div>;
  if (!resource) return <div>Resource not found</div>;

  return (
    <UIResourceRenderer
      resource={resource}
      style={{ height: '600px' }}
    />
  );
}
```

### 7.2 Type Compatibility

**Challenge**: Ensuring type definitions match between simple-mcp and demo app.

**Solution**: Import types directly from simple-mcp, don't redefine:

```typescript
// ✅ Correct
import type { UIResourceContent } from '@mcp-ui/ui-types';

// ❌ Wrong
interface UIResourceContent {  // Don't redefine!
  // ...
}
```

### 7.3 React Version Compatibility

**simple-mcp components**: Built with React 18 patterns
**Next.js 15**: Uses React 19

**Compatibility**: ✅ React 19 is backward compatible

**Testing**: Verify hooks (useEffect, useState, useRef) work correctly.

---

## 8. Security Considerations

### 8.1 iframe Sandbox Attributes

**Foundation Layer**: Only `allow-scripts`

```html
<iframe
  sandbox="allow-scripts"
  srcdoc="<html>...</html>"
/>
```

**Restrictions** (automatically enforced):
- ✅ No form submissions
- ✅ No popups
- ✅ No top-level navigation
- ✅ No same-origin access
- ✅ No pointer lock
- ✅ No downloads

**Layer 2+**: Will add `allow-same-origin` for external URLs only.

### 8.2 Content Security Policy

**Next.js middleware** (app/middleware.ts):
```typescript
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",  // For Next.js
      "style-src 'self' 'unsafe-inline'",   // For Tailwind
      "frame-src 'self' data: blob:",       // For iframes
      "img-src 'self' data: https:",
      "connect-src 'self'",
    ].join('; ')
  );

  return response;
}
```

### 8.3 Input Validation

**For custom HTML demo** (where users can paste HTML):

```typescript
function sanitizeHTML(html: string): string {
  // Remove <script> tags
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*"[^"]*"/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*'[^']*'/gi, '');

  return sanitized;
}
```

**Note**: Even with sanitization, the iframe sandbox provides defense in depth.

### 8.4 Origin Validation

Already handled by `ui-utils.ts`:
```typescript
export function validateOrigin(origin: string): boolean {
  if (origin === 'null') return true;  // srcdoc iframes

  try {
    const url = new URL(origin);
    return url.protocol === 'https:' ||
           url.hostname === 'localhost' ||
           url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}
```

### 8.5 Security Checklist

- [ ] All iframes have sandbox attribute
- [ ] No `allow-same-origin` for inline HTML
- [ ] CSP headers set correctly
- [ ] User-provided HTML sanitized
- [ ] postMessage origins validated
- [ ] No eval() or Function() constructor
- [ ] External URLs limited to HTTPS (Layer 2+)

---

## 9. Testing Strategy

### 9.1 Manual Testing (Primary for Demo)

**Why Manual**: This is a demo/showcase app, not production software. Manual testing is appropriate for validating UI behavior.

**Test Cases**:

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Simple Card Renders | Navigate to /foundation/simple-card | Card displays with styling |
| iframe Sandbox | Inspect iframe element | Has `sandbox="allow-scripts"` |
| Source View | Click "View Source" | Shows HTML code with syntax highlighting |
| Multiple Demos | Navigate between demos | Each demo loads and displays correctly |
| Loading State | Refresh page | Shows loading indicator briefly |
| Error Handling | Mock error in client | Shows error message |
| Responsive Layout | Resize browser | Layout adapts to screen size |
| Copy Source | Click copy button | HTML copied to clipboard |

### 9.2 Automated Tests (Optional)

**If implementing automated tests** (using Jest + React Testing Library):

**Test File**: `__tests__/ResourceViewer.test.tsx`
```typescript
import { render, screen } from '@testing-library/react';
import { ResourceViewer } from '@/components/demo/ResourceViewer';

describe('ResourceViewer', () => {
  const mockResource = {
    uri: 'ui://test',
    mimeType: 'text/html',
    text: '<div>Test</div>'
  };

  it('renders UIResourceRenderer', () => {
    render(<ResourceViewer resource={mockResource} />);
    expect(screen.getByText(/Test/)).toBeInTheDocument();
  });

  it('shows metadata bar', () => {
    render(<ResourceViewer resource={mockResource} showMetadata />);
    expect(screen.getByText(/URI: ui:\/\/test/)).toBeInTheDocument();
  });
});
```

**Test File**: `__tests__/mockMcpClient.test.ts`
```typescript
import { mockMcpClient } from '@/lib/mockMcpClient';

describe('MockMcpClient', () => {
  it('returns resource by ID', async () => {
    const response = await mockMcpClient.getResource('simple-product-card');
    expect(response.success).toBe(true);
    expect(response.resource).toBeDefined();
    expect(response.resource?.uri).toBe('ui://demo/simple-product-card');
  });

  it('handles missing resources', async () => {
    const response = await mockMcpClient.getResource('nonexistent' as any);
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
  });
});
```

### 9.3 Browser Compatibility Testing

**Target Browsers**:
- Chrome 120+ (primary)
- Firefox 120+
- Safari 17+
- Edge 120+

**iframe Features to Verify**:
- ✅ srcdoc attribute works
- ✅ sandbox attribute enforced
- ✅ postMessage communication (Layer 2+)
- ✅ Responsive sizing

### 9.4 Security Testing

**Manual Security Audit**:
1. Inspect iframe sandbox attributes in DevTools
2. Try XSS payloads in custom HTML demo
3. Verify CSP headers in Network tab
4. Test postMessage origin validation (Layer 2+)
5. Check for console errors/warnings

**Test XSS Payloads**:
```html
<!-- These should be blocked by sandbox -->
<script>alert('XSS')</script>
<img src=x onerror="alert('XSS')">
<iframe src="javascript:alert('XSS')"></iframe>
```

Expected: No alerts trigger, content sanitized or blocked by sandbox.

---

## 10. Implementation Sequence

### Phase 1: Project Setup (2 hours)

**Step 1.1: Create Next.js Project**
```bash
cd demos/
npx create-next-app@latest nextjs-mcp-ui --typescript --tailwind --app --no-src-dir
cd nextjs-mcp-ui
```

**Step 1.2: Install Dependencies**
```bash
npm install prismjs @types/prismjs
```

**Step 1.3: Configure TypeScript**
Edit `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@mcp-ui/*": ["../../simple-mcp/src/client/*"],
      "@/*": ["./*"]
    },
    "jsx": "preserve",
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

**Step 1.4: Configure Next.js**
Edit `next.config.ts`:
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  webpack: (config) => {
    // Allow importing from simple-mcp
    config.resolve.alias['@mcp-ui'] = require('path').resolve(__dirname, '../../simple-mcp/src/client');
    return config;
  },
};

export default nextConfig;
```

**Checkpoint**: `npm run dev` starts successfully

### Phase 2: Mock Client & Resources (2 hours)

**Step 2.1: Create Mock MCP Client**
Create `lib/mockMcpClient.ts` (see section 6.2)

**Step 2.2: Create Demo Resources**
Create `lib/demoResources.ts` (see section 6.3)

**Step 2.3: Create Resource Hook**
Create `hooks/useResource.ts` (see section 6.4)

**Step 2.4: Create Types**
Create `lib/types.ts`:
```typescript
export type { ResourceId } from './mockMcpClient';
export type { UIResourceContent, UIActionResult } from '@mcp-ui/ui-types';
```

**Checkpoint**: Import and log resources in a test page

### Phase 3: Demo Components (2 hours)

**Step 3.1: Create ResourceViewer**
Create `components/demo/ResourceViewer.tsx` (see section 5.2)

**Step 3.2: Create CodePreview**
Create `components/demo/CodePreview.tsx`:
```typescript
'use client';

import { useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/themes/prism-tomorrow.css';

export function CodePreview({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const highlighted = Prism.highlight(
    code,
    Prism.languages[language],
    language
  );

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-preview">
      <div className="code-header">
        <span>HTML Source</span>
        <button onClick={copyToClipboard}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="code-content">
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}
```

**Step 3.3: Create DemoLayout**
Create `components/demo/DemoLayout.tsx`

**Step 3.4: Create Navigation**
Create `components/layout/Navigation.tsx`

**Checkpoint**: Components render without errors

### Phase 4: App Pages (2-3 hours)

**Step 4.1: Create Root Layout**
Edit `app/layout.tsx`:
```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MCP-UI Demo - Next.js',
  description: 'Interactive demo of MCP-UI components with Next.js 15',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navigation />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
```

**Step 4.2: Create Home Page**
Edit `app/page.tsx`:
```typescript
import Link from 'next/link';
import { DemoCard } from '@/components/demo/DemoCard';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">MCP-UI Demo</h1>
        <p className="text-xl text-gray-600">
          Interactive demonstration of MCP-UI components with Next.js 15
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DemoCard
          title="Simple Product Card"
          description="Basic HTML card with styling"
          href="/foundation/simple-card"
          badge="Layer 1"
        />
        <DemoCard
          title="Dynamic Stats"
          description="Generated content with live data"
          href="/foundation/dynamic-stats"
          badge="Layer 1"
        />
        <DemoCard
          title="Feature Gallery"
          description="Complex styled layout"
          href="/foundation/feature-gallery"
          badge="Layer 1"
        />
      </div>
    </div>
  );
}
```

**Step 4.3: Create Foundation Demo Pages**
Create `app/foundation/simple-card/page.tsx`:
```typescript
'use client';

import { DemoLayout } from '@/components/demo/DemoLayout';
import { ResourceViewer } from '@/components/demo/ResourceViewer';
import { useResource } from '@/hooks/useResource';

export default function SimpleCardPage() {
  const { resource, loading, error } = useResource('simple-product-card');

  return (
    <DemoLayout
      title="Simple Product Card"
      description="A basic HTML card demonstrating Foundation Layer (Layer 1) rendering."
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Foundation', href: '/foundation' },
        { label: 'Simple Card', href: '/foundation/simple-card' }
      ]}
    >
      {loading && <div>Loading resource...</div>}
      {error && <div>Error: {error}</div>}
      {resource && (
        <ResourceViewer
          resource={resource}
          showSource
          showMetadata
        />
      )}
    </DemoLayout>
  );
}
```

Repeat for other demos.

**Step 4.4: Create Foundation Overview**
Create `app/foundation/page.tsx`

**Checkpoint**: All pages navigate correctly and display resources

### Phase 5: Styling & Polish (1-2 hours)

**Step 5.1: Tailwind Configuration**
Edit `tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'mcp-purple': '#764ba2',
        'mcp-blue': '#667eea',
      },
    },
  },
  plugins: [],
};

export default config;
```

**Step 5.2: Global Styles**
Edit `app/globals.css` with custom CSS for iframe containers, code previews, etc.

**Step 5.3: Responsive Design**
Test and adjust layouts for mobile, tablet, desktop.

**Step 5.4: Loading States**
Add skeleton loaders for better UX during resource loading.

**Checkpoint**: Demo looks professional and polished

### Phase 6: Documentation & README (1 hour)

**Step 6.1: Create README**
Create `README.md`:
```markdown
# MCP-UI Next.js Demo

Interactive demonstration of MCP-UI components using Next.js 15.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

This demo uses real MCP-UI components from `simple-mcp/src/client` with a mock MCP client to simulate server responses.

## Layers

- **Layer 1 (Foundation)**: Basic HTML resources in sandboxed iframes
- **Layer 2 (Feature)**: Coming soon - Interactive callbacks
- **Layer 3 (Remote DOM)**: Coming soon - Advanced components

## Structure

- `app/` - Next.js App Router pages
- `components/` - Demo UI components
- `lib/` - Mock MCP client and resources
- `hooks/` - React hooks for resource loading
```

**Step 6.2: Add Code Comments**
Ensure all components have JSDoc comments.

**Step 6.3: Create .env.example**
```
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_MOCK_DELAY=150
```

**Checkpoint**: Documentation is clear and complete

### Phase 7: Final Testing & Validation (1 hour)

**Step 7.1: Run Through All Demos**
- Test each page
- Verify resources render
- Check source view
- Test navigation

**Step 7.2: Browser Testing**
Test in Chrome, Firefox, Safari

**Step 7.3: Security Verification**
- Inspect sandbox attributes
- Check CSP headers
- Verify no console errors

**Step 7.4: Performance Check**
- Check page load times
- Verify no memory leaks
- Test with throttled network

**Checkpoint**: All validation criteria met

---

## 11. Validation Checkpoints

### Checkpoint 1: Project Setup ✓
- [ ] Next.js project created
- [ ] Dependencies installed
- [ ] TypeScript paths configured
- [ ] `npm run dev` starts without errors
- [ ] Can import from `@mcp-ui/*`

**Validation**: Run `npm run dev`, verify no errors in console.

### Checkpoint 2: Mock Client ✓
- [ ] Mock client returns resources
- [ ] Resource hook works
- [ ] Can log resources in test page
- [ ] Simulated delay works

**Validation**: Create test page, log `useResource('simple-product-card')`.

### Checkpoint 3: Components Render ✓
- [ ] UIResourceRenderer imports successfully
- [ ] HTMLResourceRenderer renders iframe
- [ ] ResourceViewer displays correctly
- [ ] No TypeScript errors

**Validation**: Render ResourceViewer with mock resource, inspect in DevTools.

### Checkpoint 4: Sandbox Security ✓
- [ ] iframe has `sandbox="allow-scripts"`
- [ ] srcdoc attribute used for inline HTML
- [ ] HTML content renders inside iframe
- [ ] No XSS vulnerabilities

**Validation**: Inspect iframe element in DevTools, verify sandbox attribute.

### Checkpoint 5: Navigation Works ✓
- [ ] Home page displays
- [ ] Can navigate to demo pages
- [ ] Breadcrumbs work
- [ ] Active states correct

**Validation**: Click through all navigation links, verify routing.

### Checkpoint 6: All Demos Render ✓
- [ ] Simple card displays
- [ ] Dynamic stats show data
- [ ] Feature gallery renders
- [ ] Source view works for each

**Validation**: Visit each demo page, toggle source view.

### Checkpoint 7: Responsive & Styled ✓
- [ ] Works on mobile (320px+)
- [ ] Works on tablet (768px+)
- [ ] Works on desktop (1024px+)
- [ ] Tailwind styles applied

**Validation**: Use DevTools responsive mode, test various sizes.

### Checkpoint 8: Final Validation ✓
- [ ] All features work end-to-end
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] No accessibility violations
- [ ] README is complete

**Validation**: Complete manual test suite, run TypeScript compiler.

---

## 12. Success Criteria

### Functional Requirements ✅
- [ ] **FR1**: At least 3 different HTML resources render correctly
- [ ] **FR2**: Resources display in sandboxed iframes
- [ ] **FR3**: Navigation between demos works seamlessly
- [ ] **FR4**: Source view shows HTML code with syntax highlighting
- [ ] **FR5**: Loading states appear during resource fetch
- [ ] **FR6**: Error states display when resources fail to load
- [ ] **FR7**: Copy source button copies HTML to clipboard
- [ ] **FR8**: Responsive layout works on mobile, tablet, desktop

### Technical Requirements ✅
- [ ] **TR1**: Uses real UIResourceRenderer from simple-mcp
- [ ] **TR2**: TypeScript compiles without errors
- [ ] **TR3**: No React warnings in console
- [ ] **TR4**: Mock client simulates MCP protocol correctly
- [ ] **TR5**: All imports use proper path aliases
- [ ] **TR6**: Next.js 15 App Router used throughout
- [ ] **TR7**: Server Components and Client Components used appropriately

### Security Requirements ✅
- [ ] **SR1**: All iframes have `sandbox="allow-scripts"` attribute
- [ ] **SR2**: No XSS vulnerabilities in demo resources
- [ ] **SR3**: CSP headers configured correctly
- [ ] **SR4**: Origin validation for postMessage (Layer 2+)
- [ ] **SR5**: User-provided HTML sanitized (custom demo)
- [ ] **SR6**: No inline event handlers in demo HTML
- [ ] **SR7**: No eval() or Function() constructor usage

### User Experience Requirements ✅
- [ ] **UX1**: Demo loads in < 2 seconds on fast connection
- [ ] **UX2**: Resources appear within 500ms of page load
- [ ] **UX3**: Smooth transitions between pages
- [ ] **UX4**: Clear visual feedback for interactions
- [ ] **UX5**: Accessible keyboard navigation
- [ ] **UX6**: Mobile-friendly touch targets
- [ ] **UX7**: Helpful error messages

### Documentation Requirements ✅
- [ ] **DR1**: README explains how to run demo
- [ ] **DR2**: Code comments explain key components
- [ ] **DR3**: This plan document exists and is comprehensive
- [ ] **DR4**: Architecture diagram included in docs
- [ ] **DR5**: Instructions for adding new demos

### Expansion Readiness ✅
- [ ] **ER1**: Architecture supports adding Layer 2 features
- [ ] **ER2**: Mock client can be extended for tool calls
- [ ] **ER3**: Component structure allows Layer 3 additions
- [ ] **ER4**: No hardcoded assumptions about layer count
- [ ] **ER5**: Clear separation between mock and real components

---

## 13. Risk Analysis & Mitigation

### Risk 1: Type Compatibility Issues

**Risk**: TypeScript types from simple-mcp don't match demo expectations.

**Probability**: Medium
**Impact**: Medium (compilation errors)

**Mitigation**:
- Import all types directly from simple-mcp
- Don't redefine any MCP-UI types in demo
- Use `type` imports, not `import type { ... }`
- Test compilation early and often

**Contingency**: If types don't work, copy type definitions into demo temporarily.

### Risk 2: React Version Incompatibility

**Risk**: React 19 (Next.js 15) breaks React 18 patterns (simple-mcp).

**Probability**: Low
**Impact**: High (components don't work)

**Mitigation**:
- React 19 is designed for backward compatibility
- Test UIResourceRenderer early in Phase 3
- Verify hooks (useEffect, useState, useRef) work
- Check React docs for breaking changes

**Contingency**: Downgrade Next.js to 14.x (uses React 18).

### Risk 3: iframe Behavior Differences

**Risk**: iframe sandbox behaves differently across browsers.

**Probability**: Medium
**Impact**: Medium (demos work in some browsers, not others)

**Mitigation**:
- Test in Chrome, Firefox, Safari early
- Use standard sandbox attributes only
- Avoid browser-specific features
- Check MDN compatibility tables

**Contingency**: Document browser requirements, suggest Chrome.

### Risk 4: Next.js Path Resolution Issues

**Risk**: Next.js can't resolve `@mcp-ui/*` paths to simple-mcp.

**Probability**: Medium
**Impact**: High (can't import components)

**Mitigation**:
- Configure both tsconfig.json and next.config.ts
- Test imports in Phase 1
- Use absolute paths as fallback
- Check Next.js webpack config

**Contingency**: Copy components into demo (not ideal, but works).

### Risk 5: Mock Client Too Simple

**Risk**: Mock client doesn't accurately represent real MCP protocol.

**Probability**: Low
**Impact**: Low (demo works but isn't realistic)

**Mitigation**:
- Model mock client on real MCP responses
- Include proper UIResource structure
- Simulate network delays
- Support all Layer 1 features

**Contingency**: Document limitations in README, clarify "demo only".

### Risk 6: Performance Issues with Multiple iframes

**Risk**: Rendering multiple iframes causes lag or memory issues.

**Probability**: Low
**Impact**: Medium (poor UX)

**Mitigation**:
- Limit demos per page to 1-2
- Use lazy loading for off-screen iframes
- Monitor memory usage in DevTools
- Optimize HTML content size

**Contingency**: Simplify demos, reduce iframe count.

### Risk 7: Security Vulnerabilities

**Risk**: Sandbox misconfiguration allows XSS or other attacks.

**Probability**: Low
**Impact**: High (security issues)

**Mitigation**:
- Follow MCP-UI security guidelines exactly
- Test with known XSS payloads
- Verify sandbox attributes in DevTools
- Review SECURITY-GUIDE.md

**Contingency**: Add additional sanitization, tighten CSP.

### Risk 8: Scope Creep

**Risk**: Adding too many features beyond Layer 1.

**Probability**: Medium
**Impact**: Medium (delayed completion)

**Mitigation**:
- Stick to implementation plan
- Only implement Layer 1 features
- Document future work for Layers 2-3
- Use checkpoints to stay on track

**Contingency**: Cut optional features, ship minimal viable demo.

---

## 14. Future Expansion (Layers 2 & 3)

### Layer 2: Feature Layer (Future Work)

**When**: After Layer 1 is complete and validated.

**What to Add**:
1. **Interactive Callbacks**:
   - Enhance mock client to handle tool calls
   - Update ResourceViewer with action handler
   - Add demo with button that triggers tool

2. **External URLs**:
   - Add resources with `text/uri-list` MIME type
   - Update HTMLResourceRenderer to use `src` attribute
   - Demo: Embed external widget

3. **postMessage Communication**:
   - Test HTMLResourceRenderer's postMessage handler
   - Add interactive form demo
   - Show tool execution feedback

**New Files Needed**:
- `app/feature/interactive-form/page.tsx`
- `app/feature/external-widget/page.tsx`
- `lib/demoResources-layer2.ts`

**Estimated Time**: 4-6 hours

### Layer 3: Remote DOM (Future Work)

**When**: After Layer 2 is complete.

**What to Add**:
1. **Remote DOM Renderer**:
   - Import RemoteDOMRenderer from simple-mcp
   - Add resources with `application/vnd.mcp-ui.remote-dom+javascript`
   - Demo: Interactive counter, form, chart

2. **Advanced Demos**:
   - Shopping cart with Remote DOM
   - Data visualization
   - Multi-step wizard

**New Files Needed**:
- `app/remote-dom/counter/page.tsx`
- `app/remote-dom/shopping-cart/page.tsx`
- `lib/demoResources-layer3.ts`

**Estimated Time**: 6-8 hours

### Integration with Chrome DevTools (Future)

**When**: After all 5 layers are complete in simple-mcp.

**What to Add**:
1. DevTools panel in demo
2. Live inspection of Remote DOM operations
3. Performance monitoring
4. Security audit tool

**Estimated Time**: 12+ hours

---

## Appendix A: Quick Reference Commands

### Development
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

### Testing
```bash
# Manual testing checklist
open http://localhost:3000
# Click through all demos
# Toggle source view
# Test on mobile
# Check console for errors

# Security testing
# Inspect iframe in DevTools
# Verify sandbox attribute
# Test XSS payloads in custom demo
```

### Debugging
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check TypeScript paths
npx tsc --showConfig

# Verify imports
npx tsx --eval "import('@mcp-ui/UIResourceRenderer')"
```

---

## Appendix B: File Templates

### Demo Page Template
```typescript
'use client';

import { DemoLayout } from '@/components/demo/DemoLayout';
import { ResourceViewer } from '@/components/demo/ResourceViewer';
import { useResource } from '@/hooks/useResource';

export default function DemoPage() {
  const { resource, loading, error } = useResource('YOUR_RESOURCE_ID');

  return (
    <DemoLayout
      title="Your Demo Title"
      description="Description of what this demo shows."
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Foundation', href: '/foundation' },
        { label: 'Your Demo', href: '/foundation/your-demo' }
      ]}
    >
      {loading && <div>Loading resource...</div>}
      {error && <div>Error: {error}</div>}
      {resource && (
        <ResourceViewer
          resource={resource}
          showSource
          showMetadata
        />
      )}
    </DemoLayout>
  );
}
```

### Resource Definition Template
```typescript
'YOUR_RESOURCE_ID': {
  uri: 'ui://demo/YOUR_RESOURCE_ID',
  mimeType: 'text/html',
  text: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        /* Your styles here */
      </style>
    </head>
    <body>
      <!-- Your HTML here -->
    </body>
    </html>
  `,
  _meta: {
    'mcpui.dev/ui-preferred-frame-size': { width: 600, height: 400 }
  }
}
```

---

## Appendix C: Troubleshooting Guide

### Problem: TypeScript can't find `@mcp-ui/*`

**Solution**:
1. Check `tsconfig.json` has correct paths
2. Restart TypeScript server in IDE
3. Run `npx tsc --showConfig` to verify
4. Check `next.config.ts` webpack config

### Problem: Components don't render

**Solution**:
1. Check browser console for errors
2. Verify resource structure matches UIResourceContent
3. Check React DevTools component tree
4. Add console.log in component render

### Problem: iframe is blank

**Solution**:
1. Check HTML content is not empty
2. Verify sandbox attribute is correct
3. Check CSP headers in Network tab
4. Look for errors in iframe's console

### Problem: Source view doesn't work

**Solution**:
1. Verify Prism.js is installed
2. Check CSS import for Prism theme
3. Test with simple HTML first
4. Check browser console for errors

### Problem: Navigation broken

**Solution**:
1. Verify Link components use correct href
2. Check file structure matches routes
3. Restart dev server
4. Clear Next.js cache (.next folder)

---

## Conclusion

This comprehensive plan provides everything needed to implement Layer 1 (Foundation) of the MCP-UI Next.js demo. By following the sequence, checkpoints, and validation criteria, implementation agents can build a robust, secure, and extensible demo that showcases the real MCP-UI components.

**Key Takeaways**:
1. Use real components from simple-mcp, don't rebuild
2. Mock client simulates MCP protocol accurately
3. Security is paramount (sandbox attributes, CSP, validation)
4. Structure for easy expansion to Layers 2 & 3
5. Comprehensive testing and validation at each phase

**Estimated Total Time**: 8-12 hours for complete Layer 1 implementation.

**Next Steps**: Begin with Phase 1 (Project Setup) and proceed through each phase in sequence, validating at each checkpoint.
