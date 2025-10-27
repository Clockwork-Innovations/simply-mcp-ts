/**
 * Foundation Layer Example - Inline HTML UI with Tool Integration
 *
 * Demonstrates all Foundation Layer UI features:
 * - Static inline HTML UI (Calculator with inline HTML/CSS)
 * - Dynamic inline HTML UI (Live Statistics that change)
 * - Tool integration using callTool() to invoke MCP tools from UI
 * - Subscribable UI with real-time updates
 * - Inline CSS styling using css field
 *
 * Foundation Layer Constraints:
 * - Inline HTML only (no file references)
 * - Inline CSS only (no external stylesheets)
 * - Tool allowlist for security
 * - Simple subscription pattern (exact URI matching)
 *
 * Usage:
 *   npx simply-mcp run examples/interface-ui-foundation.ts
 */

import type { IServer, ITool, IUI } from 'simply-mcp';

// ============================================================================
// Tool Interfaces
// ============================================================================

/**
 * Add two numbers together
 */
interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: { a: number; b: number };
  result: number;
}

/**
 * Refresh statistics (triggers UI update)
 */
interface RefreshStatsTool extends ITool {
  name: 'refresh_stats';
  description: 'Refresh statistics and trigger UI update';
  params: {};
  result: { message: string; timestamp: string };
}

/**
 * Reset the request counter
 */
interface ResetCounterTool extends ITool {
  name: 'reset_counter';
  description: 'Reset the request counter to zero';
  params: {};
  result: { message: string; previousCount: number };
}

// ============================================================================
// UI Interfaces - Static
// ============================================================================

/**
 * Static Calculator UI
 *
 * Demonstrates:
 * - Static inline HTML (defined in interface)
 * - Inline CSS using css field
 * - Tool integration with callTool()
 * - Interactive user input
 * - Light theme using CSS variables
 */
interface CalculatorUI extends IUI {
  uri: 'ui://calculator/v1';
  name: 'Calculator';
  description: 'Simple calculator UI with tool integration';
  theme: 'light';
  html: `
    <div class="calculator">
      <h1>Simple Calculator</h1>
      <p class="subtitle">Demonstrates static UI with tool integration</p>
      <div class="inputs">
        <input type="number" id="num1" placeholder="First number" value="5" />
        <span class="operator">+</span>
        <input type="number" id="num2" placeholder="Second number" value="3" />
        <button class="btn-calculate" onclick="calculate()">Calculate</button>
      </div>
      <div id="result" class="result"></div>
      <div class="info">
        <p><strong>Features:</strong></p>
        <ul>
          <li>Static inline HTML (no server generation)</li>
          <li>Inline CSS styling</li>
          <li>Tool integration via callTool()</li>
          <li>Secure tool allowlist</li>
        </ul>
      </div>
    </div>

    <script>
      async function calculate() {
        const a = parseInt(document.getElementById('num1').value);
        const b = parseInt(document.getElementById('num2').value);
        const resultDiv = document.getElementById('result');

        if (isNaN(a) || isNaN(b)) {
          resultDiv.textContent = 'Error: Please enter valid numbers';
          resultDiv.className = 'result error';
          return;
        }

        resultDiv.textContent = 'Calculating...';
        resultDiv.className = 'result calculating';

        try {
          const result = await callTool('add', { a, b });
          resultDiv.textContent = 'Result: ' + a + ' + ' + b + ' = ' + result;
          resultDiv.className = 'result success';
          notify('info', 'Calculation completed: ' + result);
        } catch (error) {
          resultDiv.textContent = 'Error: ' + error.message;
          resultDiv.className = 'result error';
          notify('error', 'Calculation failed: ' + error.message);
        }
      }

      // Auto-calculate on load
      window.addEventListener('load', calculate);
    </script>
  `;
  css: `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
    }

    .calculator {
      padding: 30px;
      max-width: 600px;
      margin: 0 auto;
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

    .inputs {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 24px 0;
      flex-wrap: wrap;
    }

    input {
      flex: 1;
      min-width: 120px;
      padding: 12px;
      font-size: 16px;
      border: 2px solid #e1e8ed;
      border-radius: 8px;
      transition: border-color 0.2s;
    }

    input:focus {
      outline: none;
      border-color: #3498db;
    }

    .operator {
      font-size: 24px;
      font-weight: bold;
      color: #3498db;
    }

    .btn-calculate {
      padding: 12px 24px;
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      transition: transform 0.1s, box-shadow 0.2s;
      box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
    }

    .btn-calculate:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
    }

    .btn-calculate:active {
      transform: translateY(0);
    }

    .result {
      margin: 24px 0;
      padding: 16px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 500;
      text-align: center;
    }

    .result.success {
      background: #d4edda;
      color: #155724;
      border: 2px solid #c3e6cb;
    }

    .result.error {
      background: #f8d7da;
      color: #721c24;
      border: 2px solid #f5c6cb;
    }

    .result.calculating {
      background: #d1ecf1;
      color: #0c5460;
      border: 2px solid #bee5eb;
    }

    .info {
      margin-top: 32px;
      padding: 20px;
      background: #f8f9fa;
      border-left: 4px solid #3498db;
      border-radius: 4px;
    }

    .info strong {
      color: #2c3e50;
    }

    .info ul {
      margin: 12px 0 0 20px;
    }

    .info li {
      margin: 6px 0;
      color: #5a6c7d;
    }
  `;
  tools: ['add'];
}

// ============================================================================
// UI Interfaces - Dynamic + Subscribable
// ============================================================================

/**
 * Dynamic Statistics UI with Live Updates
 *
 * Demonstrates:
 * - Dynamic UI (server-generated HTML)
 * - Subscribable updates (real-time changes)
 * - Multiple tool integration
 * - Server-side state management
 */
interface StatsUI extends IUI {
  uri: 'ui://stats/live';
  name: 'Live Statistics';
  description: 'Real-time server statistics with subscribable updates';
  dynamic: true;
  subscribable: true;
  tools: ['refresh_stats', 'reset_counter'];
  data: string; // Returns HTML string
}

// ============================================================================
// Server Interface
// ============================================================================

interface FoundationServer extends IServer {
  name: 'foundation-ui-example';
  version: '1.0.0';
  description: 'Foundation layer UI example with inline HTML and tool integration';
}

// ============================================================================
// Server Implementation
// ============================================================================

export default class FoundationServerImpl implements FoundationServer {
  private stats = {
    requests: 0,
    uptime: Date.now(),
    lastRefresh: new Date().toISOString(),
  };

  /**
   * Add tool implementation
   */
  add: AddTool = async ({ a, b }) => {
    this.stats.requests++;
    return a + b;
  };

  /**
   * Refresh stats tool - triggers UI update via subscription
   */
  refreshStats: RefreshStatsTool = async () => {
    this.stats.requests++;
    this.stats.lastRefresh = new Date().toISOString();

    // Note: In production with server.start(), this would trigger
    // notifyResourceUpdate('ui://stats/live') to push updates to clients

    return {
      message: 'Stats refreshed successfully',
      timestamp: this.stats.lastRefresh,
    };
  };

  /**
   * Reset counter tool
   */
  resetCounter: ResetCounterTool = async () => {
    const previousCount = this.stats.requests;
    this.stats.requests = 0;
    this.stats.lastRefresh = new Date().toISOString();

    return {
      message: 'Counter reset successfully',
      previousCount,
    };
  };

  /**
   * Dynamic stats UI - generates fresh HTML on each request
   *
   * This method is called:
   * 1. When client reads the resource (resources/read)
   * 2. After subscription notification (client refetches)
   *
   * Demonstrates:
   * - Server-generated HTML with dynamic data
   * - Inline CSS via <style> tag
   * - Multiple tool buttons
   * - Real-time data display
   */
  'ui://stats/live': StatsUI = async () => {
    const uptimeSeconds = Math.floor((Date.now() - this.stats.uptime) / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);

    const displayUptime = uptimeHours > 0
      ? `${uptimeHours}h ${uptimeMinutes % 60}m`
      : `${uptimeMinutes}m ${uptimeSeconds % 60}s`;

    // Return HTML string (CSS embedded inline)
    return `
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
        }

        .stats-container {
          padding: 30px;
          max-width: 800px;
          margin: 0 auto;
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

        .stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin: 24px 0;
        }

        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .stat-label {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 500;
        }

        .stat-value {
          font-size: 36px;
          font-weight: bold;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .stat-meta {
          font-size: 12px;
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

        .btn:active {
          transform: translateY(0);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
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

        .features {
          margin-top: 32px;
          padding: 20px;
          background: #f8f9fa;
          border-left: 4px solid #667eea;
          border-radius: 4px;
        }

        .features h3 {
          color: #2c3e50;
          margin-bottom: 12px;
        }

        .features ul {
          margin: 0 0 0 20px;
        }

        .features li {
          margin: 6px 0;
          color: #5a6c7d;
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
          letter-spacing: 0.5px;
          margin-left: 8px;
        }
      </style>

      <div class="stats-container">
        <h1>
          Live Statistics
          <span class="badge">Subscribable</span>
          <span class="badge">Dynamic</span>
        </h1>
        <p class="subtitle">Real-time server statistics with automatic updates</p>

        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-label">Total Requests</div>
            <div class="stat-value">${this.stats.requests}</div>
            <div class="stat-meta">API calls processed</div>
          </div>

          <div class="stat-card">
            <div class="stat-label">Uptime</div>
            <div class="stat-value">${displayUptime}</div>
            <div class="stat-meta">Server running time</div>
          </div>

          <div class="stat-card">
            <div class="stat-label">Last Refresh</div>
            <div class="stat-value">${new Date(this.stats.lastRefresh).toLocaleTimeString()}</div>
            <div class="stat-meta">${new Date(this.stats.lastRefresh).toLocaleDateString()}</div>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-primary" onclick="refreshStats()">
            🔄 Refresh Stats
          </button>
          <button class="btn btn-danger" onclick="resetCounter()">
            🔁 Reset Counter
          </button>
        </div>

        <div id="status"></div>

        <div class="features">
          <h3>Foundation Layer Features Demonstrated:</h3>
          <ul>
            <li><strong>Dynamic UI:</strong> Server-generated HTML with real-time data</li>
            <li><strong>Subscribable:</strong> Clients can subscribe for automatic updates</li>
            <li><strong>Tool Integration:</strong> Multiple tools callable from UI</li>
            <li><strong>Inline CSS:</strong> Styles embedded via &lt;style&gt; tag</li>
            <li><strong>Security:</strong> Tool allowlist enforced (only refresh_stats, reset_counter)</li>
            <li><strong>Notifications:</strong> User feedback via notify() helper</li>
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

        async function refreshStats() {
          const btn = event.target;
          btn.disabled = true;
          btn.textContent = '⏳ Refreshing...';

          try {
            const result = await callTool('refresh_stats', {});
            showStatus(result.message, 'success');
            notify('info', 'Stats refreshed: ' + result.timestamp);

            // In production, the subscription mechanism would automatically
            // trigger a UI refresh here via notifyResourceUpdate()
            setTimeout(() => {
              window.location.reload();
            }, 500);
          } catch (error) {
            showStatus('Error: ' + error.message, 'error');
            notify('error', 'Refresh failed: ' + error.message);
          } finally {
            btn.disabled = false;
            btn.textContent = '🔄 Refresh Stats';
          }
        }

        async function resetCounter() {
          if (!confirm('Are you sure you want to reset the counter?')) {
            return;
          }

          const btn = event.target;
          btn.disabled = true;
          btn.textContent = '⏳ Resetting...';

          try {
            const result = await callTool('reset_counter', {});
            showStatus(result.message + ' (was: ' + result.previousCount + ')', 'success');
            notify('info', 'Counter reset from ' + result.previousCount + ' to 0');

            // Trigger UI refresh
            setTimeout(() => {
              window.location.reload();
            }, 500);
          } catch (error) {
            showStatus('Error: ' + error.message, 'error');
            notify('error', 'Reset failed: ' + error.message);
          } finally {
            btn.disabled = false;
            btn.textContent = '🔁 Reset Counter';
          }
        }

        // Auto-update timestamp every second
        setInterval(() => {
          const timeElements = document.querySelectorAll('.stat-value');
          // Could update relative timestamps here
        }, 1000);
      </script>
    `;
  };
}

// ============================================================================
// Demo Runner (for standalone execution)
// ============================================================================

/**
 * Demo execution when file is run directly
 * This demonstrates how to load and interact with the server
 */
async function runDemo() {
  const { loadInterfaceServer } = await import('../src/index.js');
  const { fileURLToPath } = await import('url');

  console.log('=== Foundation Layer UI Demo ===\n');

  // Load the server
  const server = await loadInterfaceServer({
    filePath: fileURLToPath(import.meta.url),
    verbose: false,
  });

  console.log(`Server: ${server.name} v${server.version}`);
  console.log(`Description: ${server.description}\n`);

  // List available resources
  console.log('Available UI Resources:');
  const resources = server.listResources();
  const uiResources = resources.filter((r) => r.uri.startsWith('ui://'));
  uiResources.forEach((resource) => {
    console.log(`  - ${resource.uri}: ${resource.name}`);
    console.log(`    ${resource.description}`);
  });
  console.log();

  // List available tools
  console.log('Available Tools:');
  const tools = server.listTools();
  tools.forEach((tool) => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });
  console.log();

  // Test calculator UI (static)
  console.log('=== Testing Static Calculator UI ===');
  const calcResult = await server.readResource('ui://calculator/v1');
  console.log('✓ Calculator UI loaded');
  console.log(`  Content length: ${calcResult.contents[0].text.length} bytes`);
  console.log(`  MIME type: ${calcResult.contents[0].mimeType}`);
  console.log();

  // Test stats UI (dynamic)
  console.log('=== Testing Dynamic Stats UI ===');
  const statsResult = await server.readResource('ui://stats/live');
  console.log('✓ Stats UI generated');
  console.log(`  Content length: ${statsResult.contents[0].text.length} bytes`);
  console.log(`  Includes current stats from server`);
  console.log();

  // Test tools
  console.log('=== Testing Tool Integration ===');
  const addResult = await server.executeTool('add', { a: 5, b: 3 });
  console.log(`✓ add(5, 3) = ${JSON.stringify(addResult)}`);

  const refreshResult = await server.executeTool('refresh_stats', {});
  console.log(`✓ refresh_stats() = ${JSON.stringify(refreshResult)}`);
  console.log();

  // Show that dynamic UI reflects updated data
  console.log('=== Verifying Dynamic Updates ===');
  const updatedStats = await server.readResource('ui://stats/live');
  console.log('✓ Stats UI regenerated with fresh data');
  console.log('  (In production, clients would be notified via subscription)');
  console.log();

  console.log('=== Demo Complete ===\n');
  console.log('Foundation Layer Features Demonstrated:');
  console.log('  ✓ Static inline HTML UI (Calculator)');
  console.log('  ✓ Dynamic inline HTML UI (Live Stats)');
  console.log('  ✓ Tool integration via callTool()');
  console.log('  ✓ Subscribable UI pattern');
  console.log('  ✓ Inline CSS styling');
  console.log('  ✓ Security (tool allowlist)');
  console.log('  ✓ User notifications');
  console.log('\nTo run the MCP server:');
  console.log('  npx simply-mcp run examples/interface-ui-foundation.ts');
  console.log('\nTo test in Claude Desktop:');
  console.log('  Add to claude_desktop_config.json and restart Claude');

  await server.stop();
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}
