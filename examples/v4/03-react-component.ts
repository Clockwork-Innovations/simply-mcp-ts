/**
 * IUI v4.0 Example: React Component
 *
 * Use a React component as your UI source.
 * Dependencies are auto-extracted from imports.
 * Build config is loaded from simply-mcp.config.ts (or uses smart defaults).
 */

import { InterfaceServer, IUI } from '../../src/index.js';

const server = new InterfaceServer({
  name: 'react-component-server',
  version: '1.0.0',
});

/**
 * React Dashboard Component
 *
 * Points to a .tsx file - the framework will:
 * 1. Auto-detect it's a React component (.tsx extension)
 * 2. Extract dependencies from imports (react, recharts, etc.)
 * 3. Compile with Babel
 * 4. Inject CDN scripts for dependencies
 * 5. Generate self-contained HTML
 */
interface DashboardUI extends IUI {
  uri: 'ui://dashboard';
  name: 'Dashboard';
  description: 'React-based analytics dashboard';

  // Points to React component - auto-detected and compiled
  source: './components/Dashboard.tsx';

  // That's it! No need to specify:
  // - dependencies (auto-extracted from imports)
  // - bundle config (loaded from config file or defaults)
  // - stylesheets (imported in component)
  // - scripts (auto-injected)
}

/**
 * Simple Button Component
 *
 * Minimal React example
 */
interface ButtonUI extends IUI {
  uri: 'ui://button';
  name: 'Interactive Button';
  description: 'Simple interactive button component';

  source: './components/SimpleButton.tsx';

  // Optional: Specify tools this UI can call
  tools: ['notify', 'log'];
}

export default server;
