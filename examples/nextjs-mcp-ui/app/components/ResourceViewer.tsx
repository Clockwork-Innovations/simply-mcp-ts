/**
 * Resource Viewer Component
 *
 * Core component for displaying UIResourceContent using UIResourceRenderer.
 * Handles loading states, errors, and resource metadata display.
 *
 * Features:
 * - Renders UI resources using UIResourceRenderer from simply-mcp
 * - Displays resource metadata (URI, MIME type, size)
 * - Shows HTML source code with CodePreview
 * - Loading and error states
 * - Copy-to-clipboard for code
 * - Responsive layout
 *
 * @module app/components/ResourceViewer
 */

'use client';

import React, { useState } from 'react';
import { UIResourceRenderer } from 'simply-mcp/client';
import type { UIResourceContent } from 'simply-mcp/client';
import { CodePreview } from './CodePreview';

/**
 * Props for ResourceViewer component
 */
export interface ResourceViewerProps {
  /** UI resource to display */
  resource: UIResourceContent | null;

  /** Whether to show the code preview by default */
  showCode?: boolean;

  /** Loading state */
  loading?: boolean;

  /** Error message */
  error?: string | null;

  /** Custom class name */
  className?: string;

  /** Resource title/name */
  title?: string;

  /** Resource description */
  description?: string;

  /** Whether to render the preview section */
  renderPreview?: boolean;

  /** Whether to render the resource information section */
  renderResourceInfo?: boolean;
}

/**
 * Format byte size to human-readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Resource Viewer Component
 *
 * Displays a UI resource with metadata and optional code preview.
 *
 * @example
 * ```tsx
 * <ResourceViewer
 *   resource={resource}
 *   title="Product Card"
 *   description="A modern product card"
 *   showCode
 * />
 * ```
 */
export function ResourceViewer({
  resource,
  showCode = false,
  loading = false,
  error = null,
  className = '',
  title,
  description,
  renderPreview = true,
  renderResourceInfo = true,
}: ResourceViewerProps) {
  const [isCodeVisible, setIsCodeVisible] = useState(showCode);

  // Loading state
  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="card animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${className}`}>
        <div className="card border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-2xl">⚠️</div>
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Error Loading Resource
              </h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!resource) {
    return (
      <div className={`${className}`}>
        <div className="card border-gray-200 bg-gray-50 text-center py-12">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Resource Loaded
          </h3>
          <p className="text-gray-600">Select a resource to view it here.</p>
        </div>
      </div>
    );
  }

  // Calculate resource size
  const htmlContent = resource.text || '';
  const resourceSize = new Blob([htmlContent]).size;

  return (
    <div className={`${className}`}>
      {/* Header */}
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>
          )}
          {description && <p className="text-gray-600">{description}</p>}
        </div>
      )}

      {/* Resource Renderer - MOVED TO TOP */}
      {renderPreview && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
            <span className="badge badge-primary">Live Render</span>
          </div>

          <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
            <UIResourceRenderer
              resource={resource}
              style={{
                width: '100%',
                minHeight: '400px',
                border: 'none',
              }}
            />
          </div>
        </div>
      )}

      {/* Resource Metadata - MOVED DOWN */}
      {renderResourceInfo && (
        <div className="card mb-6 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
            Resource Information
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">URI</div>
              <div className="font-mono text-sm text-gray-900 break-all">
                {resource.uri}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">MIME Type</div>
              <div className="font-mono text-sm text-gray-900">
                {resource.mimeType}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Size</div>
              <div className="font-mono text-sm text-gray-900">
                {formatBytes(resourceSize)}
              </div>
            </div>
          </div>

          {/* Preferred Frame Size (if available) */}
          {resource._meta?.['mcpui.dev/ui-preferred-frame-size'] && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-500 mb-1">
                Preferred Frame Size
              </div>
              <div className="font-mono text-sm text-gray-900">
                {resource._meta['mcpui.dev/ui-preferred-frame-size'].width} x{' '}
                {resource._meta['mcpui.dev/ui-preferred-frame-size'].height} px
              </div>
            </div>
          )}
        </div>
      )}

      {/* Code Toggle */}
      <div className="mb-6">
        <button
          onClick={() => setIsCodeVisible(!isCodeVisible)}
          className="btn-secondary flex items-center gap-2"
        >
          <span>{isCodeVisible ? '▼' : '▶'}</span>
          <span>{isCodeVisible ? 'Hide' : 'Show'} HTML Source</span>
        </button>
      </div>

      {/* Code Preview */}
      {isCodeVisible && (
        <div className="mb-6">
          <CodePreview
            code={htmlContent}
            language="html"
            title="HTML Source Code"
            showLineNumbers
            maxHeight="600px"
          />
        </div>
      )}

      {/* Integration Example */}
      {isCodeVisible && (
        <div>
          <CodePreview
            code={`import { UIResourceRenderer } from 'simply-mcp/client';
import { mockMcpClient } from '@/lib/mockMcpClient';

async function MyComponent() {
  // Load the resource
  const resource = await mockMcpClient.loadResource('${resource.uri.replace('ui://', '').replace('/layer1', '')}');

  // Render it
  return (
    <UIResourceRenderer
      resource={resource}
      style={{ width: '100%', minHeight: '400px' }}
    />
  );
}`}
            language="typescript"
            title="Integration Example"
            showLineNumbers
            defaultCollapsed
          />
        </div>
      )}
    </div>
  );
}

export default ResourceViewer;
