/**
 * Dashboard Example - Using useMCPTools for Multiple Tools
 *
 * Demonstrates:
 * - Managing multiple MCP tools with useMCPTools
 * - Helper functions (isAnyLoading, hasAnyError, etc.)
 * - MCPProvider for global configuration
 * - Optimistic updates
 * - Real-world dashboard patterns
 */

import React, { useEffect, useState } from 'react';
import { useMCPTools, isAnyLoading, hasAnyError, MCPProvider } from '../../src/client/hooks/index.js';

// ============================================================================
// Mock UI Components
// ============================================================================

const Button = ({ children, onClick, disabled, variant = 'default' }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '0.5rem 1rem',
      background: variant === 'destructive' ? '#dc2626' : variant === 'outline' ? 'transparent' : '#0066cc',
      color: variant === 'outline' ? '#0066cc' : 'white',
      border: variant === 'outline' ? '1px solid #ddd' : 'none',
      borderRadius: '6px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontWeight: 500,
      marginRight: '0.5rem',
    }}
  >
    {children}
  </button>
);

const Card = ({ title, value, trend, loading }: any) => (
  <div
    style={{
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '1.5rem',
      flex: 1,
      minWidth: '200px',
    }}
  >
    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>{title}</div>
    {loading ? (
      <div style={{ color: '#999' }}>Loading...</div>
    ) : (
      <>
        <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{value}</div>
        {trend && (
          <div style={{ fontSize: '0.875rem', color: trend > 0 ? '#16a34a' : '#dc2626' }}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </div>
        )}
      </>
    )}
  </div>
);

// ============================================================================
// Dashboard Component with Multiple Tools
// ============================================================================

interface DashboardStats {
  users: number;
  revenue: number;
  orders: number;
  growth: number;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
}

function DashboardContent() {
  const [refreshCount, setRefreshCount] = useState(0);

  // ✅ Manage multiple tools at once with useMCPTools
  const tools = useMCPTools(
    {
      // Map local names to MCP tool names
      getStats: 'get_dashboard_stats',
      getActivity: 'get_activity_log',
      exportData: 'export_dashboard',
      clearCache: 'clear_cache',
    },
    {
      // Global options for all tools
      optimistic: true,
      parseAs: 'json',
    },
    {
      // Per-tool options
      getStats: {
        onSuccess: (data) => console.log('Stats loaded:', data),
      },
      exportData: {
        parseAs: 'text', // This tool returns a filename, not JSON
      },
    }
  );

  // Load data on mount
  useEffect(() => {
    tools.getStats.execute({ timeRange: 'week' });
    tools.getActivity.execute({ limit: 5 });
  }, [refreshCount]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshCount((c) => c + 1);
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    try {
      const filename = await tools.exportData.execute({ format });
      window.notify('success', `Exported as ${filename}`);
    } catch (err) {
      window.notify('error', 'Export failed');
    }
  };

  // Handle cache clear
  const handleClearCache = async () => {
    if (!confirm('Clear all cached data?')) return;
    await tools.clearCache.execute({});
    window.notify('success', 'Cache cleared');
    setRefreshCount((c) => c + 1);
  };

  // ✅ Use helper functions to check state across all tools
  const anyLoading = isAnyLoading(tools);
  const anyError = hasAnyError(tools);

  const stats: DashboardStats | null = tools.getStats.data;
  const activity: ActivityLog[] | null = tools.getActivity.data;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Dashboard</h1>
        <div>
          <Button onClick={handleRefresh} disabled={anyLoading}>
            {anyLoading ? 'Refreshing...' : '🔄 Refresh'}
          </Button>
          <Button onClick={() => handleExport('csv')} disabled={tools.exportData.loading} variant="outline">
            {tools.exportData.loading ? 'Exporting...' : '📊 Export CSV'}
          </Button>
          <Button onClick={handleClearCache} disabled={tools.clearCache.loading} variant="destructive">
            {tools.clearCache.loading ? 'Clearing...' : '🗑️ Clear Cache'}
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {anyError && (
        <div
          style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
          }}
        >
          <strong>Error:</strong> {tools.getStats.error?.message || tools.getActivity.error?.message}
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <Card title="Total Users" value={stats?.users.toLocaleString() || '—'} trend={stats?.growth} loading={tools.getStats.loading} />
        <Card title="Revenue" value={stats ? `$${stats.revenue.toLocaleString()}` : '—'} trend={8.2} loading={tools.getStats.loading} />
        <Card title="Orders" value={stats?.orders.toLocaleString() || '—'} trend={-2.1} loading={tools.getStats.loading} />
      </div>

      {/* Activity Log */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Recent Activity</h2>
        {tools.getActivity.loading ? (
          <div style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>Loading activity...</div>
        ) : activity && activity.length > 0 ? (
          <div>
            {activity.map((log) => (
              <div
                key={log.id}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{log.action}</div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>by {log.user}</div>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#999' }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>No recent activity</div>
        )}
      </div>

      {/* Technical Info */}
      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          background: '#f9fafb',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: '#374151',
        }}
      >
        <strong>State Management:</strong>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
          <li>getStats: {tools.getStats.loading ? 'loading' : tools.getStats.data ? 'loaded' : 'idle'}</li>
          <li>getActivity: {tools.getActivity.loading ? 'loading' : tools.getActivity.data ? 'loaded' : 'idle'}</li>
          <li>exportData: {tools.exportData.loading ? 'loading' : tools.exportData.data ? 'loaded' : 'idle'}</li>
          <li>clearCache: {tools.clearCache.loading ? 'loading' : 'idle'}</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// Wrapped with MCPProvider for global configuration
// ============================================================================

export default function DashboardExample() {
  return (
    <MCPProvider
      onError={(err, toolName) => {
        console.error(`Tool ${toolName} failed:`, err);
        window.notify('error', `${toolName} failed: ${err.message}`);
      }}
      onSuccess={(data, toolName) => {
        console.log(`Tool ${toolName} succeeded:`, data);
      }}
      optimistic={true}
    >
      <DashboardContent />
    </MCPProvider>
  );
}
