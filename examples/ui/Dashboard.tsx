/**
 * Dashboard Component
 *
 * Demonstrates importing and using registered components (Button and Card)
 * with full MCP tool integration via window.callTool().
 */

import React, { useState, useEffect } from 'react';
import Button from './components/Button';
import Card from './components/Card';

// Extend window interface for TypeScript
declare global {
  interface Window {
    callTool: (toolName: string, params: any) => Promise<any>;
  }
}

interface DashboardMetrics {
  totalUsers: number;
  activeNow: number;
  requests: number;
  errors: number;
}

/**
 * Main Dashboard Component
 *
 * Uses reusable Button and Card components from the component registry.
 * Integrates with MCP tools via window.callTool() for real data fetching.
 */
export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  // Load dashboard data on mount and when timeRange changes
  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setStatus('loading');
      const result = await window.callTool('get_dashboard_data', { timeRange });
      setMetrics(result.metrics);
      setStatus('success');
      setMessage('');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to load data');
    }
  };

  const handleRefresh = async () => {
    try {
      setStatus('loading');
      const result = await window.callTool('refresh_data', {});
      setMessage(`✓ ${result.message} (${result.recordsUpdated} records)`);
      setStatus('success');
      // Reload data after refresh
      await loadDashboardData();
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Refresh failed');
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    try {
      setStatus('loading');
      const result = await window.callTool('export_data', { format });
      if (result.success) {
        setMessage(`✓ Exported as ${result.filename}`);
        setStatus('success');
      } else {
        setMessage(`✗ Export failed: ${result.error}`);
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Export failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Component Library + MCP Tools</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            status === 'idle' ? 'bg-gray-100 text-gray-800' :
            status === 'loading' ? 'bg-blue-100 text-blue-800' :
            status === 'success' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          }`}>
            {status.toUpperCase()}
          </span>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            status === 'success' ? 'bg-green-50 border border-green-200' :
            'bg-red-50 border border-red-200'
          }`}>
            <p className={`text-sm ${
              status === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {message}
            </p>
          </div>
        )}

        {/* Time Range Selector */}
        <div className="mb-6 flex gap-2">
          <Button
            onClick={() => setTimeRange('hour')}
            variant={timeRange === 'hour' ? 'primary' : 'secondary'}
            disabled={status === 'loading'}
          >
            Hour
          </Button>
          <Button
            onClick={() => setTimeRange('day')}
            variant={timeRange === 'day' ? 'primary' : 'secondary'}
            disabled={status === 'loading'}
          >
            Day
          </Button>
          <Button
            onClick={() => setTimeRange('week')}
            variant={timeRange === 'week' ? 'primary' : 'secondary'}
            disabled={status === 'loading'}
          >
            Week
          </Button>
          <Button
            onClick={() => setTimeRange('month')}
            variant={timeRange === 'month' ? 'primary' : 'secondary'}
            disabled={status === 'loading'}
          >
            Month
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Metrics Cards */}
          <Card title="Total Users">
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-900">
                {metrics ? metrics.totalUsers.toLocaleString() : '---'}
              </p>
            </div>
          </Card>

          <Card title="Active Now">
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">
                {metrics ? metrics.activeNow.toLocaleString() : '---'}
              </p>
            </div>
          </Card>

          <Card title="Requests">
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">
                {metrics ? metrics.requests.toLocaleString() : '---'}
              </p>
            </div>
          </Card>

          <Card title="Errors">
            <div className="text-center">
              <p className="text-4xl font-bold text-red-600">
                {metrics ? metrics.errors.toLocaleString() : '---'}
              </p>
            </div>
          </Card>
        </div>

        {/* Actions Card */}
        <Card title="Dashboard Actions" className="mb-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Data Operations</h4>
              <div className="flex gap-2">
                <Button
                  onClick={handleRefresh}
                  disabled={status === 'loading'}
                >
                  Refresh Data
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Export Data</h4>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleExport('json')}
                  variant="secondary"
                  disabled={status === 'loading'}
                >
                  Export JSON
                </Button>
                <Button
                  onClick={() => handleExport('csv')}
                  variant="secondary"
                  disabled={status === 'loading'}
                >
                  Export CSV
                </Button>
                <Button
                  onClick={() => handleExport('pdf')}
                  variant="secondary"
                  disabled={status === 'loading'}
                >
                  Export PDF
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Info Card */}
        <Card title="MCP Integration Demo">
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong className="text-gray-900">✓ Component Registry:</strong> Button and Card components
              imported from the component registry
            </p>
            <p>
              <strong className="text-gray-900">✓ Tool Integration:</strong> Using window.callTool() to
              call get_dashboard_data, refresh_data, and export_data
            </p>
            <p>
              <strong className="text-gray-900">✓ Real Data:</strong> All metrics are fetched from MCP
              tools, not mocked
            </p>
            <p>
              <strong className="text-gray-900">✓ Full E2E:</strong> Tests component imports, tool calls,
              and UI rendering
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
