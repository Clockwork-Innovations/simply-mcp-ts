#!/usr/bin/env node
/**
 * Example: UI Watch Mode with Hot Reload
 *
 * Demonstrates how to use the UI watch manager with an MCP server
 * to enable hot reload for UI resources and React components.
 *
 * Features:
 * - File watching for UI resources
 * - Automatic cache invalidation on changes
 * - MCP resource update notifications
 * - Subscribable UI resources
 *
 * Run with: npx tsx examples/interface-watch-mode.ts
 */

import { SimplyMCP } from '../src/index.js';
import { UIWatchManager, invalidateReactCache, invalidateFileCache } from '../src/core/index.js';

/**
 * UI Server Interface with Watch Mode
 */
interface IUIServerWithWatch {
  /**
   * Get the current calculator UI
   * Subscribable: Clients can watch for updates
   */
  getCalculatorUI: {
    params: {};
    result: {
      uri: string;
      name: string;
      description: string;
      mimeType: string;
      text: string;
    };
    annotations: {
      'simplymcp.dev/subscribable': true;
    };
  };

  /**
   * Get the dashboard UI
   * Subscribable: Clients can watch for updates
   */
  getDashboardUI: {
    params: {};
    result: {
      uri: string;
      name: string;
      description: string;
      mimeType: string;
      text: string;
    };
    annotations: {
      'simplymcp.dev/subscribable': true;
    };
  };
}

/**
 * Sample HTML for calculator UI
 */
const CALCULATOR_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calculator</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .calculator {
      background: white;
      padding: 30px;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 300px;
    }
    h2 {
      margin: 0 0 20px 0;
      color: #333;
      text-align: center;
    }
    .display {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 24px;
      text-align: right;
      min-height: 40px;
      color: #333;
    }
    .buttons {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    button {
      padding: 15px;
      font-size: 18px;
      border: none;
      border-radius: 8px;
      background: #667eea;
      color: white;
      cursor: pointer;
      transition: all 0.2s;
    }
    button:hover {
      background: #764ba2;
      transform: scale(1.05);
    }
    .updated-badge {
      position: fixed;
      top: 10px;
      right: 10px;
      background: #10b981;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      animation: fadeIn 0.3s;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div class="calculator">
    <h2>Calculator</h2>
    <div class="display" id="display">0</div>
    <div class="buttons">
      <button onclick="appendNumber('7')">7</button>
      <button onclick="appendNumber('8')">8</button>
      <button onclick="appendNumber('9')">9</button>
      <button onclick="setOperator('/')">/</button>
      <button onclick="appendNumber('4')">4</button>
      <button onclick="appendNumber('5')">5</button>
      <button onclick="appendNumber('6')">6</button>
      <button onclick="setOperator('*')">*</button>
      <button onclick="appendNumber('1')">1</button>
      <button onclick="appendNumber('2')">2</button>
      <button onclick="appendNumber('3')">3</button>
      <button onclick="setOperator('-')">-</button>
      <button onclick="appendNumber('0')">0</button>
      <button onclick="clear()">C</button>
      <button onclick="calculate()">=</button>
      <button onclick="setOperator('+')">+</button>
    </div>
  </div>
  <div class="updated-badge">Hot Reload Enabled ✓</div>

  <script>
    let currentValue = '0';
    let previousValue = '';
    let operator = '';

    function appendNumber(num) {
      if (currentValue === '0') currentValue = num;
      else currentValue += num;
      updateDisplay();
    }

    function setOperator(op) {
      operator = op;
      previousValue = currentValue;
      currentValue = '0';
    }

    function calculate() {
      const prev = parseFloat(previousValue);
      const curr = parseFloat(currentValue);
      let result = 0;

      switch(operator) {
        case '+': result = prev + curr; break;
        case '-': result = prev - curr; break;
        case '*': result = prev * curr; break;
        case '/': result = prev / curr; break;
      }

      currentValue = result.toString();
      operator = '';
      previousValue = '';
      updateDisplay();
    }

    function clear() {
      currentValue = '0';
      previousValue = '';
      operator = '';
      updateDisplay();
    }

    function updateDisplay() {
      document.getElementById('display').textContent = currentValue;
    }
  </script>
</body>
</html>
`.trim();

/**
 * Sample HTML for dashboard UI
 */
const DASHBOARD_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .dashboard {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: #333;
      margin-bottom: 30px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    .card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .card h3 {
      margin: 0 0 10px 0;
      color: #667eea;
    }
    .card p {
      margin: 0;
      color: #666;
    }
    .metric {
      font-size: 32px;
      font-weight: bold;
      color: #333;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <div class="grid">
      <div class="card">
        <h3>Total Users</h3>
        <div class="metric">1,234</div>
        <p>+12% from last month</p>
      </div>
      <div class="card">
        <h3>Revenue</h3>
        <div class="metric">$45,678</div>
        <p>+8% from last month</p>
      </div>
      <div class="card">
        <h3>Active Sessions</h3>
        <div class="metric">89</div>
        <p>Currently online</p>
      </div>
    </div>
  </div>
</body>
</html>
`.trim();

// Create MCP server with watch mode
const serverFilePath = new URL(import.meta.url).pathname;

// Create UI watch manager
const watchManager = new UIWatchManager({
  serverFilePath,
  enabled: true,
  debounceMs: 300,
  verbose: true,
  patterns: ['**/*.{html,css,js,jsx,ts,tsx}'],
});

// Create server implementation
const server = SimplyMCP.ServerBuilder<IUIServerWithWatch>({
  serverInfo: {
    name: 'ui-watch-server',
    version: '1.0.0',
  },
  verbose: true,
})
  .addResource(
    'getCalculatorUI',
    async () => {
      return {
        uri: 'ui://calculator/v1',
        name: 'Calculator',
        description: 'Interactive calculator with hot reload support',
        mimeType: 'text/html',
        text: CALCULATOR_HTML,
      };
    }
  )
  .addResource(
    'getDashboardUI',
    async () => {
      return {
        uri: 'ui://dashboard/v1',
        name: 'Dashboard',
        description: 'Analytics dashboard with hot reload support',
        mimeType: 'text/html',
        text: DASHBOARD_HTML,
      };
    }
  )
  .build();

// Set up watch manager event handlers
watchManager.on('ready', () => {
  console.log('[Watch] File watcher ready');
});

watchManager.on('fileChange', (event) => {
  console.log(`[Watch] File ${event.type}: ${event.filePath}`);
});

watchManager.on('componentChange', async (event) => {
  console.log(`[Watch] Component changed: ${event.filePath}`);

  // Invalidate React cache
  invalidateReactCache(event.absolutePath);

  // Notify subscribers about resource update
  // In a real implementation, you would:
  // 1. Recompile the component
  // 2. Identify which resource(s) use this component
  // 3. Notify subscribers of those resource URIs
  console.log('[Watch] Notifying subscribers of component update...');
});

watchManager.on('htmlChange', async (event) => {
  console.log(`[Watch] HTML changed: ${event.filePath}`);

  // Invalidate file cache
  invalidateFileCache(event.absolutePath);

  // Notify subscribers about resource update
  console.log('[Watch] Notifying subscribers of HTML update...');
});

watchManager.on('cssChange', (event) => {
  console.log(`[Watch] CSS changed: ${event.filePath}`);
  invalidateFileCache(event.absolutePath);
});

watchManager.on('scriptChange', (event) => {
  console.log(`[Watch] Script changed: ${event.filePath}`);
  invalidateFileCache(event.absolutePath);
});

watchManager.on('error', (error) => {
  console.error('[Watch] Error:', error.message);
});

// Start watch manager
await watchManager.start();

console.log('\n=== UI Watch Mode Server ===');
console.log('✓ Watch manager active');
console.log('✓ Watching for UI file changes');
console.log('✓ Hot reload enabled');
console.log('\nAvailable resources:');
console.log('  - ui://calculator/v1 (subscribable)');
console.log('  - ui://dashboard/v1 (subscribable)');
console.log('\nModify UI files to see hot reload in action!');
console.log('Press Ctrl+C to stop\n');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down...');
  await watchManager.stop();
  console.log('✓ Watch manager stopped');
  process.exit(0);
});

// Start server
server.listen().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
