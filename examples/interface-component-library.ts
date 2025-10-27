/**
 * Component Library Support Example
 *
 * Demonstrates component registry and imports for reusable UI components
 * with full MCP tool integration.
 */

import type { IServer, IUI, ITool } from '../src/index.js';
import { registry } from '../src/index.js';

// ============================================================================
// Tool Interfaces
// ============================================================================

/**
 * Get Dashboard Data Tool
 *
 * Fetches current dashboard metrics and statistics.
 */
interface GetDashboardDataTool extends ITool {
  name: 'get_dashboard_data';
  description: 'Get current dashboard metrics';
  params: {
    timeRange?: 'hour' | 'day' | 'week' | 'month';
  };
  result: {
    metrics: {
      totalUsers: number;
      activeNow: number;
      requests: number;
      errors: number;
    };
    timestamp: string;
  };
}

/**
 * Refresh Data Tool
 *
 * Triggers a data refresh from backend sources.
 */
interface RefreshDataTool extends ITool {
  name: 'refresh_data';
  description: 'Refresh dashboard data from sources';
  params: {};
  result: {
    success: boolean;
    message: string;
    recordsUpdated: number;
  };
}

/**
 * Export Data Tool
 *
 * Exports dashboard data in specified format.
 */
interface ExportDataTool extends ITool {
  name: 'export_data';
  description: 'Export dashboard data';
  params: {
    format: 'json' | 'csv' | 'pdf';
  };
  result: {
    success: boolean;
    filename?: string;
    downloadUrl?: string;
    error?: string;
  };
}

// ============================================================================
// UI Component Definitions
// ============================================================================

// Define a reusable Button component
interface ButtonComponent extends IUI {
  uri: 'ui://components/Button';
  name: 'Reusable Button';
  description: 'Shared button component';
  component: './ui/components/Button.tsx';
  dependencies: ['clsx'];
}

// Define a reusable Card component
interface CardComponent extends IUI {
  uri: 'ui://components/Card';
  name: 'Reusable Card';
  description: 'Shared card component';
  component: './ui/components/Card.tsx';
}

// Register components in the registry
registry.register({
  uri: 'ui://components/Button',
  name: 'Button',
  file: './ui/components/Button.tsx',
  version: '1.0.0',
  dependencies: ['clsx'],
});

registry.register({
  uri: 'ui://components/Card',
  name: 'Card',
  file: './ui/components/Card.tsx',
  version: '1.0.0',
});

// Use components in a UI by importing them
interface DashboardUI extends IUI {
  uri: 'ui://dashboard/main';
  name: 'Dashboard';
  description: 'Main dashboard using shared components with MCP tool integration';
  component: './ui/Dashboard.tsx';
  imports: ['ui://components/Button', 'ui://components/Card'];
  tools: ['get_dashboard_data', 'refresh_data', 'export_data'];
  dependencies: ['recharts'];
}

// ============================================================================
// Server Interface
// ============================================================================

interface MyServer extends IServer {
  name: 'component-library-demo';
  version: '1.0.0';
  description: 'Component library demo with reusable UI components and MCP tool integration';
}

// ============================================================================
// Server Implementation
// ============================================================================

export default class ComponentLibraryDemo implements MyServer {
  private lastRefreshTime = new Date();
  private refreshCount = 0;

  /**
   * Get Dashboard Data
   *
   * Returns current dashboard metrics and statistics.
   */
  getDashboardData: GetDashboardDataTool = async ({ timeRange = 'day' }) => {
    console.log(`[Dashboard] Fetching data for time range: ${timeRange}`);

    // Generate realistic-looking metrics
    const baseMetrics = {
      hour: { totalUsers: 1234, activeNow: 89, requests: 5432, errors: 12 },
      day: { totalUsers: 12340, activeNow: 234, requests: 54321, errors: 45 },
      week: { totalUsers: 45678, activeNow: 567, requests: 234567, errors: 123 },
      month: { totalUsers: 123456, activeNow: 1234, requests: 987654, errors: 456 },
    };

    return {
      metrics: baseMetrics[timeRange],
      timestamp: new Date().toISOString(),
    };
  };

  /**
   * Refresh Data
   *
   * Triggers a data refresh from backend sources.
   */
  refreshData: RefreshDataTool = async () => {
    console.log('[Dashboard] Refreshing data...');

    this.lastRefreshTime = new Date();
    this.refreshCount++;

    // Simulate refresh delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      message: 'Dashboard data refreshed successfully',
      recordsUpdated: Math.floor(Math.random() * 1000) + 500,
    };
  };

  /**
   * Export Data
   *
   * Exports dashboard data in the specified format.
   */
  exportData: ExportDataTool = async ({ format }) => {
    console.log(`[Dashboard] Exporting data as ${format}`);

    try {
      const timestamp = Date.now();
      const filename = `dashboard-export-${timestamp}.${format}`;
      const downloadUrl = `https://example.com/exports/${filename}`;

      return {
        success: true,
        filename,
        downloadUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };
}
