/**
 * Foundation Layer Demo - Basic HTML UI Resources
 *
 * This example demonstrates the Foundation Layer (Layer 1) of MCP-UI support.
 * It shows how to create and serve inline HTML UI resources.
 *
 * To run this example:
 *   npm run build
 *   node dist/examples/ui-foundation-demo.js
 */

import { BuildMCPServer } from '../src/api/programmatic/index.js';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'ui-foundation-demo',
  version: '1.0.0',
  description: 'Foundation Layer: Inline HTML UI resources demo',
});

/**
 * Example 1: Simple Product Card UI Resource
 *
 * This demonstrates a basic static HTML card that displays product information.
 * The HTML is complete and self-contained, ready to be rendered in a sandboxed iframe.
 */
server.addUIResource(
  'ui://product-card/simple',
  'Simple Product Card',
  'Displays a product information card with styling',
  'text/html',
  `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 16px;
          background: #f5f5f5;
        }
        .card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          padding: 24px;
          max-width: 400px;
        }
        .card h2 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
          color: #333;
        }
        .card p {
          margin: 0 0 16px 0;
          color: #666;
          line-height: 1.5;
        }
        .badge {
          display: inline-block;
          background: #007bff;
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin: 16px 0;
        }
        .info-item {
          border-left: 2px solid #007bff;
          padding-left: 12px;
        }
        .info-label {
          font-size: 12px;
          color: #999;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .info-value {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">Foundation Layer Demo</div>
        <h2>Widget Pro X</h2>
        <p>A demonstration of static HTML UI resources in MCP-UI Foundation Layer.</p>

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

        <p style="font-size: 14px; color: #999;">
          This is a static HTML demo. Interactivity will be added in the Feature Layer
          with postMessage callbacks. Remote DOM support comes in Layer 3.
        </p>
      </div>
    </body>
    </html>
  `
);

/**
 * Example 2: Dynamic UI Resource with Function
 *
 * This demonstrates how to use a function to generate dynamic HTML content.
 * The function is called each time the resource is requested.
 */
server.addUIResource(
  'ui://stats-dashboard/current',
  'Current Stats Dashboard',
  'Displays real-time statistics',
  'text/html',
  () => {
    // In a real app, this would fetch actual data
    const stats = {
      activeUsers: Math.floor(Math.random() * 1000),
      requestsPerMin: Math.floor(Math.random() * 500),
      timestamp: new Date().toLocaleString(),
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
            padding: 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .dashboard {
            max-width: 600px;
            margin: 0 auto;
          }
          h1 {
            margin: 0 0 24px 0;
            font-size: 24px;
            font-weight: 700;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .stat-card {
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 20px;
            border: 1px solid rgba(255, 255, 255, 0.3);
          }
          .stat-label {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 8px;
          }
          .stat-value {
            font-size: 32px;
            font-weight: 700;
          }
          .timestamp {
            margin-top: 24px;
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
            </div>
            <div class="stat-card">
              <div class="stat-label">Requests/Min</div>
              <div class="stat-value">${stats.requestsPerMin}</div>
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
);

/**
 * Example 3: Complex Styled HTML with Multiple Components
 *
 * This demonstrates a more sophisticated UI with multiple sections and rich styling.
 * Shows how Foundation Layer can render complex layouts with CSS Grid and animations.
 */
server.addUIResource(
  'ui://feature-gallery/demo',
  'Feature Gallery',
  'Showcases multiple features in a styled gallery layout',
  'text/html',
  `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%);
          padding: 32px;
          min-height: 100vh;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
          animation: fadeIn 0.6s ease-in;
        }
        .header h1 {
          font-size: 36px;
          color: white;
          text-shadow: 0 2px 4px rgba(0,0,0,0.2);
          margin-bottom: 8px;
        }
        .header p {
          font-size: 18px;
          color: rgba(255,255,255,0.9);
        }
        .gallery {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
          animation: slideUp 0.8s ease-out;
        }
        .feature-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .feature-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 15px 40px rgba(0,0,0,0.2);
        }
        .feature-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-bottom: 16px;
        }
        .feature-title {
          font-size: 20px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }
        .feature-description {
          font-size: 14px;
          color: #666;
          line-height: 1.6;
        }
        .status-badge {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          margin-top: 12px;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .footer {
          text-align: center;
          margin-top: 32px;
          padding: 24px;
          background: rgba(255,255,255,0.2);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          animation: fadeIn 1s ease-in;
        }
        .footer p {
          color: white;
          font-size: 14px;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎨 Feature Gallery</h1>
          <p>Foundation Layer - Static HTML Demo</p>
        </div>

        <div class="gallery">
          <div class="feature-card">
            <div class="feature-icon">🔒</div>
            <div class="feature-title">Sandboxed Rendering</div>
            <div class="feature-description">
              All UI resources render in sandboxed iframes with restricted permissions for security.
            </div>
            <span class="status-badge">Layer 1</span>
          </div>

          <div class="feature-card">
            <div class="feature-icon">🎨</div>
            <div class="feature-title">Custom Styling</div>
            <div class="feature-description">
              Full CSS support including animations, gradients, and modern layout techniques.
            </div>
            <span class="status-badge">Layer 1</span>
          </div>

          <div class="feature-card">
            <div class="feature-icon">⚡</div>
            <div class="feature-title">Dynamic Content</div>
            <div class="feature-description">
              Use functions to generate HTML dynamically based on server state or real-time data.
            </div>
            <span class="status-badge">Layer 1</span>
          </div>

          <div class="feature-card">
            <div class="feature-icon">📱</div>
            <div class="feature-title">Responsive Design</div>
            <div class="feature-description">
              CSS Grid and Flexbox enable responsive layouts that adapt to any screen size.
            </div>
            <span class="status-badge">Layer 1</span>
          </div>

          <div class="feature-card">
            <div class="feature-icon">🔗</div>
            <div class="feature-title">MCP Integration</div>
            <div class="feature-description">
              Seamless integration with MCP protocol for tools, prompts, and resources.
            </div>
            <span class="status-badge">Layer 1</span>
          </div>

          <div class="feature-card">
            <div class="feature-icon">🚀</div>
            <div class="feature-title">Coming Soon</div>
            <div class="feature-description">
              Interactive callbacks, tool execution, and Remote DOM rendering in future layers.
            </div>
            <span class="status-badge">Layer 2+</span>
          </div>
        </div>

        <div class="footer">
          <p>
            This is the <strong>Foundation Layer</strong> demonstrating static HTML rendering.
            <br>
            Layer 2 will add interactive callbacks via postMessage for tool execution.
            <br>
            Layer 3 will introduce Remote DOM for advanced React-like components.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
);

/**
 * Tool that provides information about the Foundation Layer
 */
server.addTool({
  name: 'get_foundation_info',
  description: 'Returns information about the Foundation Layer demo',
  parameters: z.object({}),
  execute: async () => {
    return {
      layer: 'Foundation (Layer 1)',
      features: [
        'Static HTML UI resources',
        'Dynamic HTML generation with functions',
        'Sandboxed iframe rendering',
        'Security: sandbox attribute',
        'Complex CSS styling and animations',
        'Responsive layouts with CSS Grid',
      ],
      availableResources: [
        'ui://product-card/simple - Simple product information card',
        'ui://stats-dashboard/current - Dynamic statistics dashboard',
        'ui://feature-gallery/demo - Complex styled feature gallery',
      ],
      nextLayer: 'Feature Layer (Layer 2) - Interactive callbacks with postMessage',
    };
  },
});

/**
 * Tool that demonstrates resource interaction
 */
server.addTool({
  name: 'get_ui_resource',
  description: 'Get a UI resource by URI',
  parameters: z.object({
    uri: z.string().describe('URI of the UI resource to retrieve'),
  }),
  execute: async (args, context) => {
    // In a real implementation, this would read the resource
    // For demo purposes, we just return info
    return {
      message: `Resource ${args.uri} would be fetched and returned as a UI resource`,
      hint: 'Use context.readResource() in Layer 2+ to read resources from tools',
    };
  },
});

// Start the server
await server.start();
