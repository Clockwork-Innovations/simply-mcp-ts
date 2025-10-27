/**
 * MCP-UI Demo Website Server
 *
 * Serves the comprehensive interactive MCP-UI demo and tutorial website
 * that was used in the v3.4.0 checkpoint to demonstrate UI capabilities.
 *
 * Run with: npx simply-mcp run examples/interface-demo-website.ts --http --port 3000
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export default class DemoWebsiteServer {
  name = 'mcp-ui-demo-website';
  version = '1.0.0';
  description = 'Comprehensive MCP-UI Interactive Demo & Tutorial';

  resources = {
    /**
     * Main demo website - comprehensive interactive tutorial
     */
    'ui://demo/website': {
      name: 'MCP-UI Interactive Demo & Tutorial',
      description: 'Comprehensive interactive demo website showing all MCP-UI capabilities',
      mimeType: 'text/html',
      read: () => {
        const htmlPath = join(process.cwd(), 'examples', 'mcp-ui-demo-website.html');
        const html = readFileSync(htmlPath, 'utf-8');
        return html;
      }
    }
  };
}
