/**
 * Production-Optimized MCP Server Example
 *
 * Demonstrates all production optimization features (Tasks 34-36):
 * - HTML/CSS/JS minification
 * - CDN URL generation with SRI hashes
 * - Performance tracking and reporting
 *
 * Run with:
 *   npx tsx examples/interface-production-optimized.ts
 */

import type { IServer, ITool, IUI } from '../src/interface-types.js';

/**
 * Production-optimized dashboard UI
 *
 * Features:
 * - Minification enabled for all content types
 * - CDN configuration with SRI security
 * - Performance tracking with thresholds
 */
interface ProductionDashboardUI extends IUI {
  uri: 'ui://dashboard/production';
  name: 'Production Dashboard';
  description: 'High-performance dashboard with all optimizations enabled';

  // Inline HTML (will be minified)
  html: `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Production Dashboard</title>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>Production-Optimized Dashboard</h1>
            <p class="subtitle">All optimizations enabled</p>
          </header>

          <main>
            <section class="metrics">
              <div class="metric-card">
                <h3>Bundle Size</h3>
                <p id="bundle-size" class="metric-value">Loading...</p>
              </div>

              <div class="metric-card">
                <h3>Compression</h3>
                <p id="compression" class="metric-value">Loading...</p>
              </div>

              <div class="metric-card">
                <h3>Cache Hit Rate</h3>
                <p id="cache-rate" class="metric-value">Loading...</p>
              </div>
            </section>

            <section class="actions">
              <button id="refresh-btn" class="btn btn-primary">
                Refresh Metrics
              </button>
              <button id="optimize-btn" class="btn btn-secondary">
                Run Optimization
              </button>
            </section>

            <section class="log">
              <h3>Activity Log</h3>
              <ul id="activity-log"></ul>
            </section>
          </main>

          <footer>
            <p>Powered by simply-mcp | Production Build v1.0</p>
          </footer>
        </div>
      </body>
    </html>
  `;

  // Inline CSS (will be minified)
  css: `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      padding: 20px;
      min-height: 100vh;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
    }

    header {
      text-align: center;
      margin-bottom: 40px;
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 10px;
    }

    .subtitle {
      font-size: 1.2rem;
      opacity: 0.9;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .metric-card {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .metric-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
    }

    .metric-card h3 {
      font-size: 1rem;
      margin-bottom: 12px;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .metric-value {
      font-size: 2rem;
      font-weight: 700;
    }

    .actions {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-bottom: 40px;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: #10b981;
      color: #ffffff;
    }

    .btn-primary:hover {
      background: #059669;
      transform: scale(1.05);
    }

    .btn-secondary {
      background: #3b82f6;
      color: #ffffff;
    }

    .btn-secondary:hover {
      background: #2563eb;
      transform: scale(1.05);
    }

    .log {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      padding: 24px;
    }

    .log h3 {
      margin-bottom: 16px;
    }

    #activity-log {
      list-style: none;
      max-height: 200px;
      overflow-y: auto;
    }

    #activity-log li {
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 0.9rem;
    }

    #activity-log li:last-child {
      border-bottom: none;
    }

    footer {
      text-align: center;
      margin-top: 40px;
      opacity: 0.7;
      font-size: 0.9rem;
    }

    /* Scrollbar styling */
    #activity-log::-webkit-scrollbar {
      width: 8px;
    }

    #activity-log::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }

    #activity-log::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 4px;
    }
  `;

  // Inline JavaScript (will be minified)
  script: `
    // Dashboard state
    const state = {
      bundleSize: 0,
      compression: 0,
      cacheRate: 0,
      activities: []
    };

    // Add activity to log
    function addActivity(message) {
      const timestamp = new Date().toLocaleTimeString();
      state.activities.unshift(\`[\${timestamp}] \${message}\`);

      if (state.activities.length > 10) {
        state.activities = state.activities.slice(0, 10);
      }

      updateActivityLog();
    }

    // Update activity log display
    function updateActivityLog() {
      const logElement = document.getElementById('activity-log');
      logElement.innerHTML = state.activities
        .map(activity => \`<li>\${activity}</li>\`)
        .join('');
    }

    // Update metrics display
    function updateMetrics(data) {
      if (data.bundleSize !== undefined) {
        state.bundleSize = data.bundleSize;
        document.getElementById('bundle-size').textContent =
          formatSize(data.bundleSize);
      }

      if (data.compression !== undefined) {
        state.compression = data.compression;
        document.getElementById('compression').textContent =
          \`\${data.compression.toFixed(1)}%\`;
      }

      if (data.cacheRate !== undefined) {
        state.cacheRate = data.cacheRate;
        document.getElementById('cache-rate').textContent =
          \`\${(data.cacheRate * 100).toFixed(1)}%\`;
      }
    }

    // Format file size
    function formatSize(bytes) {
      if (bytes < 1024) return \`\${bytes} B\`;
      if (bytes < 1024 * 1024) return \`\${(bytes / 1024).toFixed(1)} KB\`;
      return \`\${(bytes / (1024 * 1024)).toFixed(2)} MB\`;
    }

    // Refresh metrics
    async function refreshMetrics() {
      addActivity('Refreshing metrics...');

      try {
        const result = await callTool('get_performance_metrics', {});

        if (result && result.metrics) {
          updateMetrics(result.metrics);
          addActivity('Metrics refreshed successfully');
        }
      } catch (error) {
        addActivity(\`Error refreshing metrics: \${error.message}\`);
      }
    }

    // Run optimization
    async function runOptimization() {
      addActivity('Running optimization...');

      try {
        const result = await callTool('run_optimization', {});

        if (result && result.success) {
          addActivity(\`Optimization complete: \${result.message}\`);
          await refreshMetrics();
        }
      } catch (error) {
        addActivity(\`Optimization error: \${error.message}\`);
      }
    }

    // Initialize dashboard
    function initDashboard() {
      document.getElementById('refresh-btn').addEventListener('click', refreshMetrics);
      document.getElementById('optimize-btn').addEventListener('click', runOptimization);

      addActivity('Dashboard initialized');

      // Load initial metrics
      refreshMetrics();
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initDashboard);
    } else {
      initDashboard();
    }
  `;

  tools: ['get_performance_metrics', 'run_optimization'];

  // Production optimizations
  minify: {
    html: true,
    css: true,
    js: true,
  };

  cdn: {
    sri: 'sha384',
    compression: 'both',
  };

  performance: {
    track: true,
    report: true,
    thresholds: {
      maxBundleSize: 500000,
      maxCompilationTime: 5000,
      minCacheHitRate: 0.7,
      minCompressionSavings: 0.2,
    },
  };
}

/**
 * Get performance metrics tool
 */
interface GetPerformanceMetricsTool extends ITool {
  name: 'get_performance_metrics';
  description: 'Get current performance metrics';
  params: {};
  result: {
    metrics: {
      bundleSize: number;
      compression: number;
      cacheRate: number;
    };
  };
}

/**
 * Run optimization tool
 */
interface RunOptimizationTool extends ITool {
  name: 'run_optimization';
  description: 'Run production optimization pipeline';
  params: {};
  result: {
    success: boolean;
    message: string;
  };
}

/**
 * Production-optimized server
 */
interface ProductionServer extends IServer {
  name: 'production-optimized-server';
  version: '1.0.0';
  description: 'MCP server with production optimizations';
}

/**
 * Server implementation
 */
export default class ProductionOptimizedServer implements ProductionServer {
  private metrics = {
    bundleSize: 125000,
    compression: 42.5,
    cacheRate: 0.85,
  };

  // Tool implementations
  getPerformanceMetrics: GetPerformanceMetricsTool = async () => {
    return {
      metrics: this.metrics,
    };
  };

  runOptimization: RunOptimizationTool = async () => {
    // Simulate optimization
    this.metrics.bundleSize = Math.floor(this.metrics.bundleSize * 0.9);
    this.metrics.compression = Math.min(this.metrics.compression + 5, 75);
    this.metrics.cacheRate = Math.min(this.metrics.cacheRate + 0.05, 1.0);

    return {
      success: true,
      message: `Optimized bundle to ${this.metrics.bundleSize} bytes`,
    };
  };
}
