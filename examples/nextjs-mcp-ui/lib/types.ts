/**
 * Type definitions for MCP-UI Layer 1 Demo
 *
 * This file extends and re-exports types from the simple-mcp client library
 * with demo-specific additions. All UIResourceContent objects come from the
 * real MCP-UI implementation.
 *
 * @module lib/types
 */

// Re-export core types from simple-mcp client
export type {
  UIResourceContent,
  UIAction,
  UIActionResult,
  ToolCallAction,
  NotifyAction,
  LinkAction,
  PromptAction,
  IntentAction,
} from '../../../src/client/ui-types.js';

export type { getPreferredFrameSize, getInitialRenderData } from '../../../src/client/ui-types.js';

/**
 * Resource identifier for demo resources
 * These map to keys in the DEMO_RESOURCES catalog
 */
export type ResourceId =
  | 'product-card'
  | 'info-card'
  | 'feature-list'
  | 'statistics-display'
  | 'welcome-card'
  | 'feedback-form'
  | 'contact-form'
  | 'product-selector'
  | 'external-demo'
  | 'external-docs';

/**
 * Demo-specific resource extension
 * Extends UIResourceContent with demo metadata
 */
export interface DemoResource {
  /** Resource ID for easy lookup */
  id: ResourceId;

  /** Display name for the demo */
  displayName: string;

  /** Description shown in the demo UI */
  description: string;

  /** Demo category */
  category: 'foundation' | 'feature' | 'remote-dom';

  /** Tags for filtering */
  tags: string[];

  /** The actual UIResourceContent */
  resource: import('../../../src/client/ui-types.js').UIResourceContent;
}

/**
 * Mock MCP Client options
 */
export interface MockMcpClientOptions {
  /** Minimum network delay in milliseconds (default: 200) */
  minDelay?: number;

  /** Maximum network delay in milliseconds (default: 500) */
  maxDelay?: number;

  /** Whether to log operations to console (default: false) */
  verbose?: boolean;
}

/**
 * Tool definition for mock client
 */
export interface Tool {
  /** Tool name */
  name: string;

  /** Tool description */
  description: string;

  /** Input schema (JSON Schema) */
  inputSchema: Record<string, any>;
}

/**
 * Tool execution response
 */
export interface ToolResponse {
  /** Whether the tool execution succeeded */
  success: boolean;

  /** Result data (if successful) */
  data?: any;

  /** Error message (if failed) */
  error?: string;
}

/**
 * Resource loading state
 */
export interface ResourceLoadingState {
  /** Whether the resource is currently loading */
  loading: boolean;

  /** Loaded resource (if successful) */
  resource: import('../../../src/client/ui-types.js').UIResourceContent | null;

  /** Error message (if failed) */
  error: string | null;
}

/**
 * Layer 3: Remote DOM Component Types
 */

/** MIME type for Remote DOM components */
export type RemoteDomMimeType = 'application/vnd.mcp-ui.remote-dom+javascript';

/** Frame size configuration */
export interface FrameSize {
  width: number;
  height: number;
}

/** Remote DOM component definition */
export interface RemoteDomComponent {
  /** Unique component identifier */
  id: string;

  /** Component type (e.g., 'div', 'button', 'custom-dashboard') */
  type: string;

  /** Component properties */
  props: Record<string, unknown>;

  /** Child components or text content */
  children: RemoteDomComponent[] | string;

  /** Optional metadata */
  meta?: {
    'mcpui.dev/ui-preferred-frame-size'?: FrameSize;
    'mcpui.dev/remote-dom'?: true;
    [key: string]: unknown;
  };
}

/** Streaming UI response format */
export interface StreamingUIResponse {
  /** Response ID for tracking */
  id: string;

  /** Array of streamed components */
  components: RemoteDomComponent[];

  /** Status of the stream */
  status: 'streaming' | 'complete' | 'error';

  /** Response timestamp */
  timestamp: string;

  /** Error message if status is 'error' */
  error?: string;
}

/** Component definition request */
export interface ComponentDefinition {
  /** Component type to stream */
  type: string;

  /** Parameters for component generation */
  params?: Record<string, unknown>;

  /** Optional metadata */
  meta?: Record<string, unknown>;
}

/** DOM reconciliation diff */
export interface DomDiff {
  /** Type of change: insert, update, or remove */
  type: 'insert' | 'update' | 'remove';

  /** Component ID being changed */
  componentId: string;

  /** New component data (for insert/update) */
  component?: RemoteDomComponent;

  /** Path in tree */
  path: string[];
}
