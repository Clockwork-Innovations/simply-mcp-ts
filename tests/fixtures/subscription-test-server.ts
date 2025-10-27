/**
 * Test Server Fixture for Subscription Lifecycle Testing
 *
 * This server properly calls notifyResourceUpdate() when tools are executed,
 * enabling end-to-end subscription testing.
 *
 * Key Difference from interface-ui-foundation.ts:
 * - refresh_stats CALLS this.server.notifyResourceUpdate('ui://test/live-stats')
 * - reset CALLS this.server.notifyResourceUpdate('ui://test/live-stats')
 * - This triggers actual MCP notifications to subscribed clients
 *
 * Usage:
 *   npx simply-mcp run tests/fixtures/subscription-test-server.ts --http --port 3002
 */

import type { IServer, ITool, IUI } from '../../src/index.js';

// ============================================================================
// Server State
// ============================================================================

let requestCount = 0;
let lastRefresh = new Date().toISOString();
let resetCount = 0;

// ============================================================================
// Tool Interfaces
// ============================================================================

/**
 * Trigger a resource update notification
 * This is the KEY tool that tests subscription notifications
 */
interface RefreshTool extends ITool {
  name: 'refresh';
  description: 'Trigger a resource update notification';
  params: {};
  result: { timestamp: string; count: number };
}

/**
 * Reset the counter and trigger notification
 */
interface ResetTool extends ITool {
  name: 'reset';
  description: 'Reset counter and trigger notification';
  params: {};
  result: { message: string; previousCount: number };
}

/**
 * Increment counter without triggering notification (for comparison)
 */
interface IncrementTool extends ITool {
  name: 'increment';
  description: 'Increment counter without notification';
  params: {};
  result: { count: number };
}

// ============================================================================
// UI Interface
// ============================================================================

/**
 * Dynamic UI resource that updates when refresh/reset tools are called
 */
interface LiveStatsUI extends IUI {
  uri: 'ui://test/live-stats';
  name: 'Live Statistics';
  description: 'Dynamic UI that updates when refresh/reset tools are called';
  dynamic: true;
}

// ============================================================================
// Server Implementation
// ============================================================================

export default class SubscriptionTestServer implements IServer {
  name = 'subscription-test-server';
  version = '1.0.0';
  description = 'Test server fixture for subscription lifecycle testing';

  // This is injected by BuildMCPServer
  server?: any;

  /**
   * Refresh tool - TRIGGERS NOTIFICATION
   */
  refresh: RefreshTool = async () => {
    requestCount++;
    lastRefresh = new Date().toISOString();

    // **CRITICAL:** Call notifyResourceUpdate to push notification
    // This is what was missing in the foundation example
    if (this.server) {
      this.server.notifyResourceUpdate('ui://test/live-stats');
    }

    return { timestamp: lastRefresh, count: requestCount };
  };

  /**
   * Reset tool - TRIGGERS NOTIFICATION
   */
  reset: ResetTool = async () => {
    const previousCount = requestCount;
    requestCount = 0;
    resetCount++;
    lastRefresh = new Date().toISOString();

    // Trigger notification for reset too
    if (this.server) {
      this.server.notifyResourceUpdate('ui://test/live-stats');
    }

    return { message: `Reset from ${previousCount} to 0`, previousCount };
  };

  /**
   * Increment tool - DOES NOT TRIGGER NOTIFICATION
   * Used for testing that notifications are selective
   */
  increment: IncrementTool = async () => {
    requestCount++;
    return { count: requestCount };
  };

  /**
   * Dynamic UI resource - generates fresh HTML on each read
   */
  'ui://test/live-stats': LiveStatsUI = async () => {
    // Calculate uptime
    const uptimeMs = Date.now();
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);

    // Format timestamp
    const timestamp = new Date(lastRefresh);
    const timeStr = timestamp.toLocaleTimeString();
    const dateStr = timestamp.toLocaleDateString();

    // Return HTML string
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Live Statistics - Subscription Test</title>
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }

            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              background: #f5f5f5;
              padding: 20px;
            }

            .container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              padding: 30px;
            }

            h1 {
              color: #2c3e50;
              margin-bottom: 8px;
              font-size: 28px;
            }

            .subtitle {
              color: #7f8c8d;
              margin-bottom: 24px;
              font-size: 14px;
            }

            .stats-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 16px;
              margin: 24px 0;
            }

            .stat-card {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
              box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
            }

            .stat-label {
              font-size: 12px;
              opacity: 0.9;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }

            .stat-value {
              font-size: 32px;
              font-weight: bold;
            }

            .stat-meta {
              font-size: 11px;
              opacity: 0.8;
              margin-top: 8px;
            }

            .actions {
              display: flex;
              gap: 12px;
              margin: 24px 0;
              flex-wrap: wrap;
            }

            .btn {
              flex: 1;
              min-width: 150px;
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-size: 16px;
              font-weight: 600;
              transition: transform 0.1s, box-shadow 0.2s;
            }

            .btn-primary {
              background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
              color: white;
              box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
            }

            .btn-primary:hover {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
            }

            .btn-danger {
              background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
              color: white;
              box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
            }

            .btn-danger:hover {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
            }

            .btn-secondary {
              background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
              color: white;
              box-shadow: 0 2px 8px rgba(108, 117, 125, 0.3);
            }

            .btn-secondary:hover {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(108, 117, 125, 0.4);
            }

            .btn:active {
              transform: translateY(0);
            }

            .info {
              margin-top: 24px;
              padding: 16px;
              background: #f8f9fa;
              border-left: 4px solid #667eea;
              border-radius: 4px;
            }

            .info h3 {
              color: #2c3e50;
              margin-bottom: 8px;
              font-size: 16px;
            }

            .info ul {
              margin: 8px 0 0 20px;
              color: #5a6c7d;
            }

            .info li {
              margin: 4px 0;
              font-size: 14px;
            }

            .badge {
              display: inline-block;
              padding: 4px 8px;
              background: #667eea;
              color: white;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              margin-left: 8px;
            }

            #status {
              margin-top: 16px;
              padding: 12px;
              border-radius: 8px;
              font-size: 14px;
              text-align: center;
              display: none;
            }

            #status.visible {
              display: block;
            }

            #status.success {
              background: #d4edda;
              color: #155724;
              border: 1px solid #c3e6cb;
            }

            #status.error {
              background: #f8d7da;
              color: #721c24;
              border: 1px solid #f5c6cb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>
              Live Statistics
              <span class="badge">Subscribable</span>
              <span class="badge">Dynamic</span>
            </h1>
            <p class="subtitle">This UI updates automatically when subscribed (via MCP notifications)</p>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Request Count</div>
                <div class="stat-value" id="count">${requestCount}</div>
                <div class="stat-meta">Total API calls</div>
              </div>

              <div class="stat-card">
                <div class="stat-label">Reset Count</div>
                <div class="stat-value" id="reset-count">${resetCount}</div>
                <div class="stat-meta">Times reset</div>
              </div>

              <div class="stat-card">
                <div class="stat-label">Last Refresh</div>
                <div class="stat-value" id="time">${timeStr}</div>
                <div class="stat-meta" id="date">${dateStr}</div>
              </div>
            </div>

            <div class="actions">
              <button class="btn btn-primary" onclick="triggerRefresh()">
                Trigger Update
              </button>
              <button class="btn btn-danger" onclick="triggerReset()">
                Reset Counter
              </button>
              <button class="btn btn-secondary" onclick="incrementSilent()">
                Increment (No Notify)
              </button>
            </div>

            <div id="status"></div>

            <div class="info">
              <h3>Test Server Features:</h3>
              <ul>
                <li><strong>refresh</strong> tool: Increments counter + triggers notification</li>
                <li><strong>reset</strong> tool: Resets counter + triggers notification</li>
                <li><strong>increment</strong> tool: Increments counter WITHOUT notification</li>
                <li>Dynamic UI: HTML regenerated on each resources/read</li>
                <li>MCP notifications: Sent via notifyResourceUpdate()</li>
              </ul>
            </div>
          </div>

          <script>
            function showStatus(message, type) {
              const statusDiv = document.getElementById('status');
              statusDiv.textContent = message;
              statusDiv.className = 'visible ' + type;

              setTimeout(() => {
                statusDiv.className = '';
              }, 3000);
            }

            async function triggerRefresh() {
              try {
                const result = await callTool('refresh', {});
                showStatus('Update triggered! Notification sent.', 'success');
              } catch (error) {
                showStatus('Error: ' + error.message, 'error');
              }
            }

            async function triggerReset() {
              try {
                const result = await callTool('reset', {});
                showStatus('Counter reset! Notification sent.', 'success');
              } catch (error) {
                showStatus('Error: ' + error.message, 'error');
              }
            }

            async function incrementSilent() {
              try {
                const result = await callTool('increment', {});
                showStatus('Counter incremented (no notification)', 'success');
              } catch (error) {
                showStatus('Error: ' + error.message, 'error');
              }
            }
          </script>
        </body>
      </html>
    `;
  };
}
