/**
 * Analytics Dashboard Component
 *
 * Comprehensive React dashboard demonstrating:
 * - React hooks (useState, useEffect, useCallback)
 * - External dependencies (recharts, date-fns)
 * - Tool integration via window.callTool()
 * - Loading and error states
 * - Interactive charts
 * - Export functionality
 * - Professional dashboard design
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';

// TypeScript declarations for MCP tool helpers
declare global {
  interface Window {
    callTool: (toolName: string, params: any) => Promise<any>;
    notify: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  }
}

// Type definitions for analytics data
interface DataPoint {
  date: string;
  value: number;
  sessions: number;
  pageViews: number;
}

interface Summary {
  total: number;
  average: number;
  peak: number;
  trend: 'up' | 'down' | 'stable';
}

interface AnalyticsData {
  data: DataPoint[];
  summary: Summary;
}

type TimeRange = 'day' | 'week' | 'month' | 'year';
type ExportFormat = 'csv' | 'json' | 'pdf';

/**
 * Main Dashboard Component
 */
export default function Dashboard() {
  // State management
  const [data, setData] = useState<DataPoint[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Fetch analytics data
   * Memoized with useCallback to prevent unnecessary re-renders
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.callTool('fetch_analytics', { timeRange });
      const analyticsData: AnalyticsData = JSON.parse(result.content[0].text);

      setData(analyticsData.data);
      setSummary(analyticsData.summary);
      window.notify('success', `Data loaded for ${timeRange}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(errorMessage);
      window.notify('error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  /**
   * Fetch data on mount and when time range changes
   */
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Handle time range change
   */
  const handleTimeRangeChange = (newTimeRange: TimeRange) => {
    setTimeRange(newTimeRange);
  };

  /**
   * Handle export
   */
  const handleExport = async (format: ExportFormat) => {
    setExporting(true);

    try {
      const result = await window.callTool('export_report', { format, timeRange });
      const exportData = JSON.parse(result.content[0].text);

      if (exportData.success) {
        window.notify('success', `Report exported: ${exportData.filename}`);
        // In a real app, this would trigger a download
        // window.open(exportData.downloadUrl, '_blank');
      } else {
        window.notify('error', exportData.error || 'Export failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      window.notify('error', errorMessage);
    } finally {
      setExporting(false);
    }
  };

  /**
   * Handle refresh
   */
  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      const result = await window.callTool('refresh_data', {});
      const refreshData = JSON.parse(result.content[0].text);

      if (refreshData.success) {
        window.notify('success', refreshData.message);
        // Re-fetch data after refresh
        await fetchData();
      } else {
        window.notify('error', 'Refresh failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Refresh failed';
      window.notify('error', errorMessage);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Format date for chart display
   */
  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (timeRange === 'day') {
        return format(date, 'HH:mm');
      } else if (timeRange === 'week') {
        return format(date, 'EEE');
      } else if (timeRange === 'month') {
        return format(date, 'MMM dd');
      } else {
        return format(date, 'MMM yyyy');
      }
    } catch {
      return dateString;
    }
  };

  /**
   * Format number with commas
   */
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  /**
   * Get trend icon
   */
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      case 'stable':
        return '➡️';
      default:
        return '';
    }
  };

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h2>❌ Error</h2>
          <p>{error}</p>
          <button style={styles.button} onClick={fetchData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  /**
   * Main render
   */
  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>Analytics Dashboard</h1>
        <p style={styles.subtitle}>Real-time metrics and insights</p>
      </header>

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.timeRangeButtons}>
          {(['day', 'week', 'month', 'year'] as TimeRange[]).map((range) => (
            <button
              key={range}
              style={{
                ...styles.timeButton,
                ...(timeRange === range ? styles.timeButtonActive : {}),
              }}
              onClick={() => handleTimeRangeChange(range)}
              disabled={loading}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>

        <div style={styles.actionButtons}>
          <button
            style={styles.button}
            onClick={handleRefresh}
            disabled={refreshing || loading}
          >
            {refreshing ? '⏳ Refreshing...' : '🔄 Refresh'}
          </button>
          <button
            style={styles.button}
            onClick={() => handleExport('csv')}
            disabled={exporting || loading}
          >
            {exporting ? '⏳ Exporting...' : '📥 Export CSV'}
          </button>
          <button
            style={styles.button}
            onClick={() => handleExport('json')}
            disabled={exporting || loading}
          >
            📄 JSON
          </button>
          <button
            style={styles.button}
            onClick={() => handleExport('pdf')}
            disabled={exporting || loading}
          >
            📑 PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <div style={styles.cardLabel}>Total</div>
            <div style={styles.cardValue}>{formatNumber(summary.total)}</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.cardLabel}>Average</div>
            <div style={styles.cardValue}>{formatNumber(summary.average)}</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.cardLabel}>Peak</div>
            <div style={styles.cardValue}>{formatNumber(summary.peak)}</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.cardLabel}>Trend</div>
            <div style={styles.cardValue}>
              {getTrendIcon(summary.trend)} {summary.trend.toUpperCase()}
            </div>
          </div>
        </div>
      )}

      {/* Line Chart */}
      <div style={styles.chartContainer}>
        <h2 style={styles.chartTitle}>Value Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              style={{ fontSize: '12px' }}
            />
            <YAxis style={{ fontSize: '12px' }} />
            <Tooltip
              labelFormatter={(label) => format(parseISO(label as string), 'PPP')}
              formatter={(value: number) => formatNumber(value)}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3498db"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Area Chart */}
      <div style={styles.chartContainer}>
        <h2 style={styles.chartTitle}>Sessions & Page Views</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#27ae60" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#27ae60" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPageViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9b59b6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#9b59b6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              style={{ fontSize: '12px' }}
            />
            <YAxis style={{ fontSize: '12px' }} />
            <Tooltip
              labelFormatter={(label) => format(parseISO(label as string), 'PPP')}
              formatter={(value: number) => formatNumber(value)}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="sessions"
              stroke="#27ae60"
              fillOpacity={1}
              fill="url(#colorSessions)"
            />
            <Area
              type="monotone"
              dataKey="pageViews"
              stroke="#9b59b6"
              fillOpacity={1}
              fill="url(#colorPageViews)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>
          <strong>Features Demonstrated:</strong> React hooks • External dependencies
          (recharts, date-fns) • Tool integration • Interactive charts • Export
          functionality • Subscribable UI
        </p>
      </footer>
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
  },

  loading: {
    textAlign: 'center',
    padding: '60px 20px',
  },

  spinner: {
    width: '50px',
    height: '50px',
    margin: '0 auto 20px',
    border: '4px solid #e1e8ed',
    borderTopColor: '#3498db',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },

  error: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#e74c3c',
  },

  header: {
    marginBottom: '24px',
  },

  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#2c3e50',
    marginBottom: '8px',
  },

  subtitle: {
    fontSize: '16px',
    color: '#7f8c8d',
  },

  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },

  timeRangeButtons: {
    display: 'flex',
    gap: '8px',
  },

  timeButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    border: '2px solid #e1e8ed',
    borderRadius: '8px',
    background: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  timeButtonActive: {
    background: '#3498db',
    color: 'white',
    borderColor: '#3498db',
  },

  actionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },

  button: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    background: '#3498db',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },

  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },

  summaryCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },

  cardLabel: {
    fontSize: '14px',
    color: '#7f8c8d',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },

  cardValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#2c3e50',
  },

  chartContainer: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },

  chartTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#2c3e50',
    marginBottom: '16px',
  },

  footer: {
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '2px solid #e1e8ed',
    textAlign: 'center',
    color: '#7f8c8d',
    fontSize: '14px',
  },
};
