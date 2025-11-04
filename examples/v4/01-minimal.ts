/**
 * IUI v4.0 Example: Minimal UI
 *
 * The simplest possible IUI interface using inline HTML.
 * Perfect starting point for understanding the v4.0 API.
 */

import { InterfaceServer, IUI } from '../../src/index.js';

const server = new InterfaceServer({
  name: 'minimal-ui-server',
  version: '1.0.0',
});

/**
 * Minimal UI with inline HTML
 *
 * Just 4 required fields + source!
 */
interface MinimalUI extends IUI {
  uri: 'ui://minimal';
  name: 'Minimal UI';
  description: 'The simplest IUI v4.0 example';

  // NEW v4.0: Unified source field - auto-detected as inline HTML
  source: '<div><h1>Hello, IUI v4.0!</h1><p>Minimal API, maximum power.</p></div>';

  // Optional: Add some styling
  css: 'h1 { color: #0066cc; } p { color: #666; }';
}

// That's it! No dependencies, no bundle config, no complexity.
// The framework handles everything automatically.

export default server;
