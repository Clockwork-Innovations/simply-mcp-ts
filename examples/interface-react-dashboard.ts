/**
 * Task 23: React Dashboard Example
 *
 * Demonstrates comprehensive React component UI with external dependencies.
 * This example shows:
 * - React component with hooks (useState, useEffect, useCallback)
 * - External NPM dependencies (recharts for charts, date-fns for dates)
 * - Tool integration with window.callTool()
 * - Loading and error states
 * - Real-time data visualization
 * - Subscribable UI with live updates
 * - Professional dashboard design
 *
 * File Structure:
 * - examples/interface-react-dashboard.ts (this file)
 * - examples/components/Dashboard.tsx (React component)
 *
 * Usage:
 *   npx simply-mcp run examples/interface-react-dashboard.ts
 *
 * To view the UI:
 *   1. Start the server with the command above
 *   2. Access via MCP client (Claude Desktop, etc.)
 *   3. Look for resource: ui://analytics/dashboard
 */

import type { IServer, IUI, ITool } from '../src/index.js';

// ============================================================================
// Tool Interfaces
// ============================================================================

/**
 * Fetch Analytics Tool
 *
 * Fetches analytics data for display in the dashboard.
 * Returns time-series data with date and value pairs.
 */
interface FetchAnalyticsTool extends ITool {
  name: 'fetch_analytics';
  description: 'Fetch analytics data for dashboard';
  params: {
    /** Time range to fetch (optional, defaults to 'week') */
    timeRange?: 'day' | 'week' | 'month' | 'year';
  };
  result: {
    /** Time-series data points */
    data: Array<{
      date: string; // ISO date string
      value: number;
      sessions: number;
      pageViews: number;
    }>;
    /** Summary statistics */
    summary: {
      total: number;
      average: number;
      peak: number;
      trend: 'up' | 'down' | 'stable';
    };
  };
}

/**
 * Export Report Tool
 *
 * Generates a downloadable report in the specified format.
 * Returns a download URL for the generated report.
 */
interface ExportReportTool extends ITool {
  name: 'export_report';
  description: 'Export analytics report';
  params: {
    /** Export format */
    format: 'csv' | 'json' | 'pdf';
    /** Time range for the report */
    timeRange?: 'day' | 'week' | 'month' | 'year';
  };
  result: {
    /** Whether export succeeded */
    success: boolean;
    /** Download URL for the report */
    downloadUrl?: string;
    /** Filename of the generated report */
    filename?: string;
    /** Error message if failed */
    error?: string;
  };
}

/**
 * Refresh Data Tool
 *
 * Triggers a data refresh from analytics sources.
 * Used to manually update dashboard data.
 */
interface RefreshDataTool extends ITool {
  name: 'refresh_data';
  description: 'Refresh analytics data from sources';
  params: {};
  result: {
    /** Whether refresh succeeded */
    success: boolean;
    /** User-friendly message */
    message: string;
    /** Timestamp of refresh */
    timestamp: string;
    /** Number of records updated */
    recordsUpdated: number;
  };
}

// ============================================================================
// UI Interface - React Component
// ============================================================================

/**
 * Analytics Dashboard UI
 *
 * Comprehensive React dashboard demonstrating:
 * - React component with hooks (useState, useEffect, useCallback)
 * - External NPM dependencies (recharts, date-fns)
 * - Tool integration for data fetching
 * - Interactive charts and visualizations
 * - Loading and error states
 * - Export functionality
 * - Subscribable for live updates
 * - Professional dashboard design
 *
 * Dependencies:
 * - recharts@^2.5.0: Chart library for data visualization
 * - date-fns@^2.30.0: Date formatting and manipulation
 *
 * Component File:
 * - ./components/Dashboard.tsx
 */
interface AnalyticsDashboardUI extends IUI {
  uri: 'ui://analytics/dashboard';
  name: 'Analytics Dashboard';
  description: 'Real-time analytics with interactive charts';

  /**
   * Path to React component file (relative to server file)
   * Component will be compiled with Babel and bundled automatically
   */
  component: './components/Dashboard.tsx';

  /**
   * External NPM dependencies
   * These will be bundled into the component output
   * Format: 'package@version' or just 'package' for latest
   */
  dependencies: ['recharts@^2.5.0', 'date-fns@^2.30.0'];

  /**
   * Tools this UI can call
   * Security: Only these tools are accessible via callTool()
   */
  tools: ['fetch_analytics', 'export_report', 'refresh_data'];

  /**
   * Enable subscriptions for live updates
   * Server can push updates to clients via notifyResourceUpdate()
   */
  subscribable: true;

  /**
   * Preferred UI size (rendering hint)
   * Dashboard needs more space for charts
   */
  size: {
    width: 1440;
    height: 900;
  };
}

// ============================================================================
// Server Interface
// ============================================================================

interface ReactDashboardServer extends IServer {
  name: 'react-dashboard-example';
  version: '1.0.0';
  description: 'React dashboard example with external dependencies and interactive charts';
}

// ============================================================================
// Server Implementation
// ============================================================================

/**
 * Generate mock analytics data
 * In a real application, this would fetch from a database or analytics API
 */
function generateAnalyticsData(timeRange: 'day' | 'week' | 'month' | 'year' = 'week') {
  const now = new Date();
  const data: Array<{ date: string; value: number; sessions: number; pageViews: number }> = [];

  let days: number;
  switch (timeRange) {
    case 'day':
      days = 24; // Hourly data for 1 day
      break;
    case 'week':
      days = 7;
      break;
    case 'month':
      days = 30;
      break;
    case 'year':
      days = 365;
      break;
    default:
      days = 7;
  }

  // Generate data points
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Generate random but realistic-looking data
    const baseValue = 1000 + Math.random() * 500;
    const trend = (days - i) * 10; // Upward trend
    const variance = Math.random() * 200 - 100; // Random variance

    data.push({
      date: date.toISOString(),
      value: Math.round(baseValue + trend + variance),
      sessions: Math.round((baseValue + trend + variance) * 0.7),
      pageViews: Math.round((baseValue + trend + variance) * 1.5),
    });
  }

  return data;
}

export default class ReactDashboardServerImpl implements ReactDashboardServer {
  private lastRefresh: Date = new Date();
  private refreshCount: number = 0;

  /**
   * Fetch analytics data
   *
   * Returns time-series data for visualization in the dashboard.
   * Includes summary statistics for quick insights.
   */
  fetchAnalytics: FetchAnalyticsTool = async ({ timeRange = 'week' }) => {
    console.log(`[Analytics] Fetching data for time range: ${timeRange}`);

    // Generate mock data
    const data = generateAnalyticsData(timeRange);

    // Calculate summary statistics
    const values = data.map((d) => d.value);
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = Math.round(total / values.length);
    const peak = Math.max(...values);

    // Determine trend (compare first half to second half)
    const halfPoint = Math.floor(values.length / 2);
    const firstHalfAvg = values.slice(0, halfPoint).reduce((sum, val) => sum + val, 0) / halfPoint;
    const secondHalfAvg = values.slice(halfPoint).reduce((sum, val) => sum + val, 0) / (values.length - halfPoint);
    const trendDiff = secondHalfAvg - firstHalfAvg;
    let trend: 'up' | 'down' | 'stable';
    if (trendDiff > average * 0.1) {
      trend = 'up';
    } else if (trendDiff < -average * 0.1) {
      trend = 'down';
    } else {
      trend = 'stable';
    }

    return {
      data,
      summary: {
        total,
        average,
        peak,
        trend,
      },
    };
  };

  /**
   * Export analytics report
   *
   * Generates a downloadable report in the specified format.
   * In a real application, this would generate an actual file.
   */
  exportReport: ExportReportTool = async ({ format, timeRange = 'week' }) => {
    console.log(`[Analytics] Exporting report: ${format} for ${timeRange}`);

    try {
      // Generate mock download URL
      // In production, this would upload to S3 or generate a real download link
      const timestamp = Date.now();
      const filename = `analytics-report-${timeRange}-${timestamp}.${format}`;
      const downloadUrl = `https://example.com/reports/${filename}`;

      return {
        success: true,
        downloadUrl,
        filename,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  /**
   * Refresh analytics data
   *
   * Triggers a data refresh from analytics sources.
   * In production, this might sync with Google Analytics, database, etc.
   */
  refreshData: RefreshDataTool = async () => {
    console.log('[Analytics] Refreshing data...');

    this.lastRefresh = new Date();
    this.refreshCount++;

    // Simulate refresh delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // In production, this would trigger:
    // - notifyResourceUpdate('ui://analytics/dashboard') to push updates to clients
    // - Actual data sync from analytics sources

    return {
      success: true,
      message: 'Analytics data refreshed successfully',
      timestamp: this.lastRefresh.toISOString(),
      recordsUpdated: Math.floor(Math.random() * 1000) + 500,
    };
  };
}

// ============================================================================
// Demo Runner (for standalone execution)
// ============================================================================

/**
 * Demo execution when file is run directly
 */
async function runDemo() {
  const { loadInterfaceServer } = await import('../src/index.js');
  const { fileURLToPath } = await import('url');

  console.log('=== React Dashboard Example (Task 23) ===\n');

  // Load the server
  const server = await loadInterfaceServer({
    filePath: fileURLToPath(import.meta.url),
    verbose: false,
  });

  console.log(`Server: ${server.name} v${server.version}`);
  console.log(`Description: ${server.description}\n`);

  // List UI resources
  console.log('UI Resources:');
  const resources = server.listResources();
  const uiResources = resources.filter((r) => r.uri.startsWith('ui://'));
  uiResources.forEach((resource) => {
    console.log(`  - ${resource.uri}: ${resource.name}`);
    console.log(`    ${resource.description}`);
  });
  console.log();

  // List tools
  console.log('Available Tools:');
  const tools = server.listTools();
  tools.forEach((tool) => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });
  console.log();

  // Test tools
  console.log('=== Testing Tool Integration ===');

  // Test fetch analytics
  const analyticsResult = await server.executeTool('fetch_analytics', { timeRange: 'week' });
  const analyticsData = JSON.parse(analyticsResult.content[0].text);
  console.log('✓ fetch_analytics()');
  console.log(`  Data points: ${analyticsData.data.length}`);
  console.log(`  Average: ${analyticsData.summary.average}`);
  console.log(`  Trend: ${analyticsData.summary.trend}`);

  // Test export
  const exportResult = await server.executeTool('export_report', { format: 'csv' });
  const exportData = JSON.parse(exportResult.content[0].text);
  console.log('✓ export_report("csv")');
  console.log(`  Success: ${exportData.success}`);
  console.log(`  Filename: ${exportData.filename}`);

  // Test refresh
  const refreshResult = await server.executeTool('refresh_data', {});
  const refreshData = JSON.parse(refreshResult.content[0].text);
  console.log('✓ refresh_data()');
  console.log(`  ${refreshData.message}`);
  console.log(`  Records updated: ${refreshData.recordsUpdated}`);

  console.log();
  console.log('=== Demo Complete ===\n');
  console.log('React Dashboard Features Demonstrated:');
  console.log('  ✓ React component with hooks');
  console.log('  ✓ External dependencies (recharts, date-fns)');
  console.log('  ✓ Interactive charts');
  console.log('  ✓ Tool integration');
  console.log('  ✓ Loading and error states');
  console.log('  ✓ Export functionality');
  console.log('  ✓ Subscribable UI');
  console.log('\nTo run the MCP server:');
  console.log('  npx simply-mcp run examples/interface-react-dashboard.ts');

  await server.stop();
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}
