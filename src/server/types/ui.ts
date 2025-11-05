/**
 * UI resource types for interactive components
 */

/**
 * UI Resource Definition
 *
 * Defines a UI resource that can be rendered as an interactive UI element.
 * Used with IUIResourceProvider interface for class-based UI resource definitions.
 */
export interface UIResourceDefinition {
  /**
   * UI resource URI (must start with "ui://")
   */
  uri: string;

  /**
   * Display name for the UI resource
   */
  name: string;

  /**
   * Description of what this UI resource does
   */
  description: string;

  /**
   * MIME type indicating rendering method:
   * - text/html: Inline HTML content
   * - text/uri-list: External URL
   * - application/vnd.mcp-ui.remote-dom+javascript: Remote DOM
   */
  mimeType: 'text/html' | 'text/uri-list' | 'application/vnd.mcp-ui.remote-dom+javascript';

  /**
   * Content - can be static string or dynamic function
   */
  content: string | (() => string | Promise<string>);
}

/**
 * UI Resource Provider Interface
 *
 * Implement this interface in your server class to provide UI resources
 * that can be rendered as interactive UI elements in MCP clients.
 *
 * The getUIResources() method is called during server initialization to
 * register all UI resources automatically.
 *
 * @example
 * ```typescript
 * import type { IServer, IUIResourceProvider, UIResourceDefinition } from 'simply-mcp';
 *
 * interface MyServer extends IServer {
 *   name: 'my-server';
 *   version: '1.0.0';
 * }
 *
 * export default class MyServerImpl implements MyServer, IUIResourceProvider {
 *   // Static HTML UI resource
 *   getUIResources(): UIResourceDefinition[] {
 *     return [
 *       {
 *         uri: 'ui://form/feedback',
 *         name: 'Feedback Form',
 *         description: 'User feedback form',
 *         mimeType: 'text/html',
 *         content: '<form><h2>Feedback</h2><textarea></textarea></form>'
 *       },
 *       {
 *         uri: 'ui://dashboard/stats',
 *         name: 'Stats Dashboard',
 *         description: 'Live statistics',
 *         mimeType: 'text/html',
 *         content: async () => {
 *           const stats = await this.getStats();
 *           return `<div><h1>Users: ${stats.users}</h1></div>`;
 *         }
 *       },
 *       {
 *         uri: 'ui://analytics/dashboard',
 *         name: 'Analytics Dashboard',
 *         description: 'External analytics',
 *         mimeType: 'text/uri-list',
 *         content: 'https://analytics.example.com/dashboard'
 *       },
 *       {
 *         uri: 'ui://counter/v1',
 *         name: 'Interactive Counter',
 *         description: 'Counter component',
 *         mimeType: 'application/vnd.mcp-ui.remote-dom+javascript',
 *         content: `
 *           const card = remoteDOM.createElement('div', { style: { padding: '20px' } });
 *           const title = remoteDOM.createElement('h2');
 *           remoteDOM.setTextContent(title, 'Counter');
 *           remoteDOM.appendChild(card, title);
 *         `
 *       }
 *     ];
 *   }
 *
 *   private async getStats() {
 *     return { users: 42 };
 *   }
 * }
 * ```
 *
 * @note The server implementation automatically validates UI resource URIs
 *       and MIME types during registration.
 */
export interface IUIResourceProvider {
  /**
   * Return array of UI resource definitions
   *
   * This method is called during server initialization to register
   * all UI resources. Each definition is validated to ensure:
   * - URI starts with "ui://"
   * - MIME type is one of the valid UI resource types
   * - Content is provided (static or dynamic)
   */
  getUIResources(): UIResourceDefinition[];
}

/**
 * Base UI interface for declarative UI resources
 *
 * UI resources can render interactive interfaces in MCP clients.
 * Supports inline HTML, external URLs, file references, and React components.
 *
 * @template TData - Data type returned by dynamic UI
 *
 * @example Inline HTML
 * ```typescript
 * interface FormUI extends IUI {
 *   uri: 'ui://form/feedback';
 *   name: 'Feedback Form';
 *   description: 'User feedback form';
 *   source: '<form><h2>Feedback</h2><textarea></textarea></form>';
 *   tools: ['submit_feedback'];
 * }
 * ```
 *
 * @example External URL
 * ```typescript
 * interface DashboardUI extends IUI {
 *   uri: 'ui://dashboard/main';
 *   name: 'Dashboard';
 *   description: 'Analytics dashboard';
 *   source: 'https://analytics.example.com/dashboard';
 * }
 * ```
 *
 * @example React Component UI (Feature Layer)
 * ```typescript
 * interface Dashboard extends IUI {
 *   uri: 'ui://dashboard/v1';
 *   name: 'Analytics Dashboard';
 *   description: 'Real-time analytics with interactive charts';
 *   source: './components/Dashboard.tsx';
 *   tools: ['fetch_analytics', 'export_report', 'filter_data'];
 *   subscribable: true;
 *   size: { width: 1280, height: 900 };
 * }
 * ```
 *
 * Field Validation Rules:
 * - `source` is the primary field for all UI content
 * - Auto-detects type: URL, inline HTML, file path, or React component
 * - All file paths must be relative (no absolute paths)
 * - File paths are resolved relative to the server file location
 */
export interface IUI<TData = any> {
  /**
   * UI resource URI (must start with "ui://")
   *
   * Convention: ui://category/name
   * Examples: ui://dashboard/main, ui://forms/feedback
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

  /**
   * UI source - auto-detected type based on content
   *
   * Can be:
   * - External URL: 'https://example.com/dashboard'
   * - Inline HTML: '<div>Hello World</div>'
   * - Inline Remote DOM JSON: '{"type":"div","children":["Hello"]}'
   * - HTML file: './pages/dashboard.html'
   * - React component: './components/Dashboard.tsx'
   * - Folder: './ui/dashboard/' (looks for index.html)
   *
   * The compiler auto-detects the type and handles accordingly.
   * Dependencies, stylesheets, scripts are auto-inferred from imports.
   *
   * @example External URL
   * ```typescript
   * source: 'https://analytics.example.com/dashboard'
   * ```
   *
   * @example Inline HTML
   * ```typescript
   * source: '<div><h1>Hello</h1><button>Click</button></div>'
   * ```
   *
   * @example React Component
   * ```typescript
   * source: './components/Dashboard.tsx'
   * // Dependencies auto-inferred from imports in Dashboard.tsx
   * ```
   *
   * @example Folder
   * ```typescript
   * source: './ui/dashboard/'
   * // Loads index.html and bundles all assets
   * ```
   */
  source?: string;

  /**
   * Inline CSS styles (only for inline HTML)
   * Optional - applied via <style> tag in iframe
   *
   * For file-based sources, use CSS imports in the file instead.
   */
  css?: string;

  /**
   * Array of tool names this UI can call
   *
   * Security: Only these tools are accessible via callTool()
   * Tool names must match registered ITool names exactly
   *
   * @example ['get_weather', 'set_location', 'refresh_data']
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
   * When true, client can subscribe to updates via resources/subscribe
   *
   * Server triggers updates by calling notifyResourceUpdate(uri)
   * Client automatically refetches UI content on notification
   */
  subscribable?: boolean;

  /**
   * Callable signature - implementation for dynamic UI
   * Returns content string (HTML, URL, Remote DOM JSON, or file path)
   */
  (): TData | Promise<TData>;
}
