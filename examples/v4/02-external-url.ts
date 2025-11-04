/**
 * IUI v4.0 Example: External URL
 *
 * Link to an external dashboard or web application.
 * The source field auto-detects URLs and returns text/uri-list MIME type.
 */

import { InterfaceServer, IUI } from '../../src/index.js';

const server = new InterfaceServer({
  name: 'external-url-server',
  version: '1.0.0',
});

/**
 * External Analytics Dashboard
 *
 * Points to an external URL - could be:
 * - Internal corporate dashboard
 * - Third-party analytics tool
 * - Custom web application
 */
interface AnalyticsDashboard extends IUI {
  uri: 'ui://analytics';
  name: 'Analytics Dashboard';
  description: 'External analytics dashboard';

  // External URL - auto-detected by https:// prefix
  source: 'https://analytics.example.com/dashboard';

  // Optional: Specify preferred display size
  size: {
    width: 1280,
    height: 800,
  };
}

/**
 * Development Dashboard
 *
 * Example of localhost URL for development
 */
interface DevDashboard extends IUI {
  uri: 'ui://dev';
  name: 'Dev Dashboard';
  description: 'Local development dashboard';

  // Localhost URL also works
  source: 'http://localhost:3000/dashboard';
}

export default server;
