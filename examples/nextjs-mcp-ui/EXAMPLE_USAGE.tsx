/**
 * EXAMPLE USAGE - Mock MCP Client
 *
 * This file demonstrates how to use the mock MCP client and hooks
 * in a Next.js 15 application with the real MCP-UI components.
 *
 * Copy these examples into your app/ pages or components/ directory.
 */

// ============================================================================
// EXAMPLE 1: Basic Resource Loading with useResource Hook
// ============================================================================

'use client';

import { useResource } from '@/hooks/useResource';
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';

export function BasicDemo() {
  const { resource, loading, error, refetch } = useResource('product-card');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="font-bold text-red-800">Error Loading Resource</h3>
        <p className="text-red-700 mt-2">{error.message}</p>
        <button
          onClick={refetch}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!resource) {
    return <div>Resource not found</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Product Card Demo</h2>
      <UIResourceRenderer
        resource={resource}
        style={{ height: '600px' }}
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Multiple Resources Side-by-Side
// ============================================================================

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
    return <div className="text-center p-8">Loading demos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Multiple Resources Demo</h2>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Reload All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {resources.map((resource, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
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
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Resource with Metadata Display
// ============================================================================

'use client';

import { useResource } from '@/hooks/useResource';
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';
import { getPreferredFrameSize, getResourceSize, formatBytes } from '@/lib/utils';

export function ResourceWithMetadata({ resourceId }: { resourceId: string }) {
  const { resource, loading, error } = useResource(resourceId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!resource) return <div>Resource not found</div>;

  const frameSize = getPreferredFrameSize(resource);
  const size = getResourceSize(resource);

  return (
    <div className="space-y-6">
      {/* Metadata Panel */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Resource Metadata</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div>
              <span className="text-gray-600 font-medium">URI:</span>
              <span className="ml-2 font-mono text-xs">{resource.uri}</span>
            </div>
            <div>
              <span className="text-gray-600 font-medium">MIME Type:</span>
              <span className="ml-2 font-mono text-xs">{resource.mimeType}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-gray-600 font-medium">Frame Size:</span>
              <span className="ml-2">{frameSize.width} × {frameSize.height}</span>
            </div>
            <div>
              <span className="text-gray-600 font-medium">Content Size:</span>
              <span className="ml-2">{formatBytes(size)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resource Renderer */}
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

// ============================================================================
// EXAMPLE 4: Resource with Source Code View
// ============================================================================

'use client';

import { useState } from 'react';
import { useResource } from '@/hooks/useResource';
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';

export function ResourceWithSourceView({ resourceId }: { resourceId: string }) {
  const { resource, loading, error } = useResource(resourceId);
  const [showSource, setShowSource] = useState(false);
  const [copied, setCopied] = useState(false);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!resource) return <div>Resource not found</div>;

  const copyToClipboard = () => {
    if (resource.text) {
      navigator.clipboard.writeText(resource.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Resource Viewer</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSource(!showSource)}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            {showSource ? 'View Preview' : 'View Source'}
          </button>
          {showSource && (
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              {copied ? 'Copied!' : 'Copy Source'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {showSource ? (
        <pre className="bg-gray-900 text-gray-100 p-6 rounded-lg overflow-auto max-h-[600px] text-sm">
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

// ============================================================================
// EXAMPLE 5: Direct Client Usage (Server Component)
// ============================================================================

import { mockMcpClient } from '@/lib/mockMcpClient';
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';

export async function ServerResourceDemo() {
  // Load resource on server
  const resource = await mockMcpClient.loadResource('product-card');

  // Pass to client component
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Server-Loaded Resource</h2>
      <ClientRenderer resource={resource} />
    </div>
  );
}

'use client';

function ClientRenderer({ resource }: { resource: any }) {
  return (
    <UIResourceRenderer
      resource={resource}
      style={{ height: '600px' }}
    />
  );
}

// ============================================================================
// EXAMPLE 6: Custom Resource Creation
// ============================================================================

'use client';

import { useState } from 'react';
import { createHTMLResource, sanitizeHTML } from '@/lib/utils';
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';
import type { UIResourceContent } from '@mcp-ui/ui-types';

export function CustomResourceDemo() {
  const [html, setHtml] = useState(`
    <div style="padding: 24px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 200px; display: flex; align-items: center; justify-content: center; border-radius: 12px;">
      <div>
        <h1 style="margin: 0 0 12px 0; font-size: 32px;">Custom HTML</h1>
        <p style="margin: 0;">Edit the HTML on the left to see changes.</p>
      </div>
    </div>
  `.trim());

  const [resource, setResource] = useState<UIResourceContent | null>(null);

  const handleRender = () => {
    // Sanitize user input
    const sanitized = sanitizeHTML(html);

    // Create resource
    const newResource = createHTMLResource(
      'user-custom',
      'User Custom HTML',
      'User-provided HTML resource',
      sanitized,
      { 'mcpui.dev/ui-preferred-frame-size': { width: 600, height: 300 } }
    );

    setResource(newResource);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Editor */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Enter HTML (will be sanitized):
          </label>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            className="w-full h-64 p-3 border rounded font-mono text-sm"
            placeholder="Enter your HTML here..."
          />
        </div>

        <button
          onClick={handleRender}
          className="w-full px-4 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 font-semibold"
        >
          Render HTML
        </button>

        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
          <p className="font-semibold text-yellow-800">Note:</p>
          <p className="text-yellow-700">
            HTML will be sanitized (scripts removed) and rendered in a sandboxed iframe.
          </p>
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Preview</h3>
        {resource ? (
          <UIResourceRenderer
            resource={resource}
            style={{ height: '300px' }}
          />
        ) : (
          <div className="h-64 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-500">
            Click "Render HTML" to see preview
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 7: Preloading Resources for Better Performance
// ============================================================================

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
    <nav className="space-y-2 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-4">Demo Pages (with prefetch)</h3>
      <Link
        href="/demos/features"
        className="block p-3 bg-white rounded hover:bg-gray-100 transition"
      >
        Feature List Demo →
      </Link>
      <Link
        href="/demos/statistics"
        className="block p-3 bg-white rounded hover:bg-gray-100 transition"
      >
        Statistics Dashboard →
      </Link>
      <Link
        href="/demos/welcome"
        className="block p-3 bg-white rounded hover:bg-gray-100 transition"
      >
        Welcome Card →
      </Link>
    </nav>
  );
}

// ============================================================================
// EXAMPLE 8: Resource Gallery (All Demo Resources)
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { mockMcpClient } from '@/lib/mockMcpClient';
import { getAllDemoResources } from '@/lib/demoResources';
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';
import type { DemoResource } from '@/lib/types';

export function ResourceGallery() {
  const [demos, setDemos] = useState<DemoResource[]>([]);
  const [selectedId, setSelectedId] = useState<string>('product-card');

  useEffect(() => {
    setDemos(getAllDemoResources());
  }, []);

  const selectedDemo = demos.find((d) => d.id === selectedId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="lg:col-span-1">
        <h3 className="font-semibold mb-4">Available Resources</h3>
        <div className="space-y-2">
          {demos.map((demo) => (
            <button
              key={demo.id}
              onClick={() => setSelectedId(demo.id)}
              className={`w-full text-left p-3 rounded transition ${
                selectedId === demo.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <div className="font-medium">{demo.displayName}</div>
              <div className="text-xs opacity-75 mt-1">{demo.tags.join(', ')}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3 space-y-4">
        {selectedDemo && (
          <>
            <div>
              <h2 className="text-2xl font-bold">{selectedDemo.displayName}</h2>
              <p className="text-gray-600 mt-1">{selectedDemo.description}</p>
              <div className="flex gap-2 mt-2">
                {selectedDemo.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <UIResourceRenderer
              resource={selectedDemo.resource}
              style={{ height: '600px' }}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 9: Error Boundary for Resources
// ============================================================================

'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ResourceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Resource Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Resource Rendering Error
          </h3>
          <p className="text-red-700 mb-4">
            {this.state.error?.message || 'An unknown error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reset
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage:
// <ResourceErrorBoundary>
//   <BasicDemo />
// </ResourceErrorBoundary>

// ============================================================================
// EXAMPLE 10: Tool Execution (Layer 2+ Preparation)
// ============================================================================

'use client';

import { useState } from 'react';
import { mockMcpClient } from '@/lib/mockMcpClient';
import type { ToolResponse } from '@/lib/types';

export function ToolExecutionDemo() {
  const [result, setResult] = useState<ToolResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAddToCart = async () => {
    setLoading(true);
    try {
      const response = await mockMcpClient.executeTool('add_to_cart', {
        productId: 'widget-pro-x',
        quantity: 2,
      });
      setResult(response);
    } catch (error) {
      console.error('Tool execution failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const tools = mockMcpClient.getAvailableTools();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Available Tools (Layer 2+)</h3>
        <div className="space-y-2">
          {tools.map((tool) => (
            <div key={tool.name} className="p-4 bg-gray-50 rounded">
              <div className="font-medium">{tool.name}</div>
              <div className="text-sm text-gray-600 mt-1">{tool.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <button
          onClick={handleAddToCart}
          disabled={loading}
          className="px-6 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? 'Executing...' : 'Execute Tool: add_to_cart'}
        </button>
      </div>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded p-4">
          <h4 className="font-semibold text-green-800 mb-2">Tool Result:</h4>
          <pre className="text-sm text-green-700">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
