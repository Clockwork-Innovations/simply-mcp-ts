/**
 * External URL UI Example
 *
 * Demonstrates text/uri-list MIME type support for serving external UIs.
 * This allows MCP servers to reference existing web dashboards, documentation,
 * or third-party UIs without embedding HTML content.
 *
 * Phase 3A: text/uri-list MIME type support
 */

import type { IUI, IServer } from '../src/interface-types.js';

/**
 * Analytics Dashboard - External
 *
 * Points to an external analytics platform.
 * The MCP client loads this URL (typically in an iframe).
 */
interface AnalyticsDashboard extends IUI {
  uri: 'ui://analytics/dashboard';
  name: 'Analytics Dashboard';
  description: 'External analytics dashboard with real-time metrics';
  externalUrl: 'https://analytics.example.com/dashboard';
}

/**
 * User Documentation - External
 *
 * Links to hosted documentation site.
 */
interface Documentation extends IUI {
  uri: 'ui://docs/manual';
  name: 'User Manual';
  description: 'Online user documentation and guides';
  externalUrl: 'https://docs.example.com/user-manual';
}

/**
 * Admin Panel - External
 *
 * External admin interface with authentication.
 * Note: The external URL can include credentials if needed,
 * but it's recommended to use session-based auth instead.
 */
interface AdminPanel extends IUI {
  uri: 'ui://admin/panel';
  name: 'Admin Panel';
  description: 'Server administration interface';
  externalUrl: 'https://admin.example.com/panel';
}

/**
 * API Explorer - External with Query Parameters
 *
 * External API documentation with pre-configured filters.
 */
interface APIExplorer extends IUI {
  uri: 'ui://api/explorer';
  name: 'API Explorer';
  description: 'Interactive API documentation and testing tool';
  externalUrl: 'https://api.example.com/docs?version=v2&theme=dark';
}

/**
 * Monitoring Dashboard - External with Fragment
 *
 * Links to specific section of monitoring dashboard.
 */
interface MonitoringDashboard extends IUI {
  uri: 'ui://monitoring/dashboard';
  name: 'System Monitoring';
  description: 'Real-time system health and performance metrics';
  externalUrl: 'https://monitoring.example.com/dashboard#overview';
}

/**
 * Local Development UI - File URL
 *
 * Points to a local HTML file (useful for development).
 */
interface LocalDevUI extends IUI {
  uri: 'ui://dev/local';
  name: 'Local Dev UI';
  description: 'Local development interface';
  externalUrl: 'file:///Users/developer/projects/dashboard/index.html';
}

/**
 * Custom Port Dashboard
 *
 * External service running on non-standard port.
 */
interface CustomPortDashboard extends IUI {
  uri: 'ui://custom/dashboard';
  name: 'Custom Dashboard';
  description: 'Internal dashboard on custom port';
  externalUrl: 'https://internal.example.com:8443/dashboard';
}

/**
 * Server Interface
 */
interface ExternalUIServer extends IServer {
  name: 'external-ui-server';
  version: '1.0.0';
  description: 'Example server demonstrating text/uri-list MIME type support';
}

/**
 * Server Implementation
 *
 * No implementation needed - all UIs are static external URLs.
 * The framework automatically serves them with text/uri-list MIME type.
 */
export default class ExternalUIServerImpl implements ExternalUIServer {
  name = 'external-ui-server' as const;
  version = '1.0.0' as const;
  description = 'Example server demonstrating text/uri-list MIME type support' as const;
}

/**
 * USAGE NOTES:
 *
 * 1. MIME Type:
 *    When externalUrl is present, the resource is automatically served with
 *    MIME type 'text/uri-list' instead of 'text/html'.
 *
 * 2. Content Format:
 *    The resource content is the plain URL string (no HTML wrapper).
 *    Example: "https://analytics.example.com/dashboard"
 *
 * 3. Client Rendering:
 *    The MCP client is responsible for loading the external URL.
 *    Typically rendered in an iframe or opened in a browser tab.
 *
 * 4. Security Considerations:
 *    - Ensure external URLs are trusted sources
 *    - Use HTTPS for secure connections
 *    - Be aware of CORS restrictions
 *    - Consider iframe sandbox attributes on client side
 *
 * 5. Mutual Exclusivity:
 *    The following fields are mutually exclusive:
 *    - externalUrl
 *    - html (inline HTML)
 *    - file (external HTML file)
 *    - component (React component)
 *
 *    Only one can be used per UI resource.
 *
 * 6. URL Schemes Supported:
 *    - http:// and https:// (most common)
 *    - file:// (local files)
 *    - Any valid URL scheme recognized by URL constructor
 *
 * 7. Query Parameters & Fragments:
 *    URLs can include query parameters and fragments:
 *    - https://example.com/page?param=value
 *    - https://example.com/page#section
 *
 * 8. Testing:
 *    To test this example:
 *
 *    # Compile TypeScript
 *    npx tsc examples/interface-external-url.ts
 *
 *    # Run with simply-mcp CLI
 *    npx simply-mcp run examples/interface-external-url.ts
 *
 *    # List resources to verify MIME types
 *    # (Using MCP inspector or client)
 *    # Expected: mimeType = 'text/uri-list'
 *    # Expected: text = 'https://analytics.example.com/dashboard'
 *
 * 9. MCP Protocol Format:
 *    When read via resources/read, the response is:
 *    {
 *      "uri": "ui://analytics/dashboard",
 *      "name": "Analytics Dashboard",
 *      "description": "External analytics dashboard with real-time metrics",
 *      "mimeType": "text/plain",
 *      "contents": [
 *        {
 *          "mimeType": "text/uri-list",
 *          "text": "https://analytics.example.com/dashboard"
 *        }
 *      ]
 *    }
 *
 * 10. Comparison with text/html:
 *
 *     text/html (inline HTML):
 *     - Server provides HTML content directly
 *     - Content is self-contained
 *     - Example: { mimeType: 'text/html', text: '<div>Hello</div>' }
 *
 *     text/uri-list (external URL):
 *     - Server provides URL to external resource
 *     - Client loads the resource
 *     - Example: { mimeType: 'text/uri-list', text: 'https://example.com' }
 */
