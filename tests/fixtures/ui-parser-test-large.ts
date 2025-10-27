import type { IUI, IServer } from 'simply-mcp';

/**
 * Large UI fixture for testing parser behavior with large HTML
 * HTML size: ~16KB
 *
 * This fixture simulates a real-world dashboard with extensive CSS and JavaScript
 * to match the size and complexity of the Clockwork test server.
 */
interface LargeTestUI extends IUI {
  uri: 'ui://test/large';
  name: 'Large Test UI Dashboard';
  description: 'Large HTML fixture (~16KB) for parser testing with realistic dashboard content';
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Large Test Dashboard - Parser Testing</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --primary-color: #3498db;
      --secondary-color: #2ecc71;
      --danger-color: #e74c3c;
      --warning-color: #f39c12;
      --dark-bg: #2c3e50;
      --light-bg: #ecf0f1;
      --text-primary: #2c3e50;
      --text-secondary: #7f8c8d;
      --border-color: #bdc3c7;
      --shadow: 0 2px 10px rgba(0,0,0,0.1);
      --shadow-lg: 0 5px 20px rgba(0,0,0,0.15);
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: var(--text-primary);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: var(--shadow-lg);
      overflow: hidden;
    }

    header {
      background: var(--dark-bg);
      color: white;
      padding: 30px 40px;
      border-bottom: 4px solid var(--primary-color);
    }

    header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      font-weight: 700;
    }

    header p {
      font-size: 1.1rem;
      opacity: 0.9;
      color: var(--light-bg);
    }

    nav {
      background: var(--light-bg);
      padding: 0;
      border-bottom: 1px solid var(--border-color);
    }

    nav ul {
      list-style: none;
      display: flex;
      flex-wrap: wrap;
    }

    nav li {
      flex: 1;
      min-width: 150px;
    }

    nav a {
      display: block;
      padding: 18px 25px;
      text-decoration: none;
      color: var(--text-primary);
      font-weight: 600;
      transition: all 0.3s ease;
      border-bottom: 3px solid transparent;
      text-align: center;
    }

    nav a:hover {
      background: white;
      border-bottom-color: var(--primary-color);
      color: var(--primary-color);
    }

    nav a.active {
      background: white;
      border-bottom-color: var(--primary-color);
      color: var(--primary-color);
    }

    main {
      padding: 40px;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 25px;
      margin-bottom: 40px;
    }

    .card {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 25px;
      box-shadow: var(--shadow);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .card:hover {
      transform: translateY(-5px);
      box-shadow: var(--shadow-lg);
    }

    .card h3 {
      font-size: 1.3rem;
      margin-bottom: 15px;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .card .icon {
      width: 40px;
      height: 40px;
      background: var(--primary-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.2rem;
    }

    .card .value {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--primary-color);
      margin: 15px 0;
    }

    .card .label {
      color: var(--text-secondary);
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .card .change {
      margin-top: 10px;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .card .change.positive {
      color: var(--secondary-color);
    }

    .card .change.negative {
      color: var(--danger-color);
    }

    .chart-container {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: var(--shadow);
    }

    .chart-container h2 {
      margin-bottom: 20px;
      color: var(--text-primary);
      font-size: 1.5rem;
    }

    .chart {
      height: 300px;
      background: var(--light-bg);
      border-radius: 6px;
      display: flex;
      align-items: flex-end;
      justify-content: space-around;
      padding: 20px;
      gap: 10px;
    }

    .chart-bar {
      flex: 1;
      background: linear-gradient(180deg, var(--primary-color), var(--secondary-color));
      border-radius: 4px 4px 0 0;
      min-height: 20px;
      position: relative;
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .chart-bar:hover {
      opacity: 0.8;
      transform: scaleY(1.05);
    }

    .chart-bar::after {
      content: attr(data-value);
      position: absolute;
      top: -30px;
      left: 50%;
      transform: translateX(-50%);
      font-weight: 600;
      color: var(--text-primary);
      font-size: 0.85rem;
    }

    .data-table {
      width: 100%;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: var(--shadow);
    }

    .data-table table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table thead {
      background: var(--dark-bg);
      color: white;
    }

    .data-table th {
      padding: 18px 20px;
      text-align: left;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.85rem;
      letter-spacing: 1px;
    }

    .data-table td {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
    }

    .data-table tbody tr:hover {
      background: var(--light-bg);
    }

    .data-table tbody tr:last-child td {
      border-bottom: none;
    }

    .status-badge {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.success {
      background: rgba(46, 204, 113, 0.1);
      color: var(--secondary-color);
    }

    .status-badge.warning {
      background: rgba(243, 156, 18, 0.1);
      color: var(--warning-color);
    }

    .status-badge.danger {
      background: rgba(231, 76, 60, 0.1);
      color: var(--danger-color);
    }

    .button-group {
      display: flex;
      gap: 15px;
      margin-top: 30px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 12px 30px;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      display: inline-block;
    }

    .btn-primary {
      background: var(--primary-color);
      color: white;
    }

    .btn-primary:hover {
      background: #2980b9;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
    }

    .btn-secondary {
      background: var(--secondary-color);
      color: white;
    }

    .btn-secondary:hover {
      background: #27ae60;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
    }

    .btn-danger {
      background: var(--danger-color);
      color: white;
    }

    .btn-danger:hover {
      background: #c0392b;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
    }

    .alert {
      padding: 18px 25px;
      border-radius: 6px;
      margin-bottom: 25px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .alert-info {
      background: rgba(52, 152, 219, 0.1);
      border-left: 4px solid var(--primary-color);
      color: var(--primary-color);
    }

    .alert-success {
      background: rgba(46, 204, 113, 0.1);
      border-left: 4px solid var(--secondary-color);
      color: var(--secondary-color);
    }

    .alert-warning {
      background: rgba(243, 156, 18, 0.1);
      border-left: 4px solid var(--warning-color);
      color: var(--warning-color);
    }

    footer {
      background: var(--dark-bg);
      color: white;
      padding: 30px 40px;
      text-align: center;
      border-top: 4px solid var(--primary-color);
    }

    footer p {
      opacity: 0.9;
      font-size: 0.95rem;
    }

    @media (max-width: 768px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }

      nav ul {
        flex-direction: column;
      }

      nav li {
        width: 100%;
      }

      .button-group {
        flex-direction: column;
      }

      .btn {
        width: 100%;
      }

      header h1 {
        font-size: 2rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Large Test Dashboard</h1>
      <p>Parser Testing Fixture - Simulating Real-World Application (~16KB HTML)</p>
    </header>

    <nav>
      <ul>
        <li><a href="#overview" class="active">Overview</a></li>
        <li><a href="#analytics">Analytics</a></li>
        <li><a href="#reports">Reports</a></li>
        <li><a href="#settings">Settings</a></li>
      </ul>
    </nav>

    <main>
      <div class="alert alert-info">
        <span>ℹ️</span>
        <span>This is a large HTML fixture designed to test parser behavior with ~16KB of inline HTML content.</span>
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <h3><span class="icon">📊</span> Total Users</h3>
          <div class="value">24,567</div>
          <div class="label">Active Users</div>
          <div class="change positive">↑ 12.5% from last month</div>
        </div>

        <div class="card">
          <h3><span class="icon">💰</span> Revenue</h3>
          <div class="value">$89,234</div>
          <div class="label">Monthly Revenue</div>
          <div class="change positive">↑ 8.3% from last month</div>
        </div>

        <div class="card">
          <h3><span class="icon">🎯</span> Conversion</h3>
          <div class="value">3.45%</div>
          <div class="label">Conversion Rate</div>
          <div class="change negative">↓ 0.5% from last month</div>
        </div>

        <div class="card">
          <h3><span class="icon">⚡</span> Performance</h3>
          <div class="value">98.2%</div>
          <div class="label">Uptime</div>
          <div class="change positive">↑ 0.3% from last month</div>
        </div>
      </div>

      <div class="chart-container">
        <h2>Monthly Performance Trends</h2>
        <div class="chart">
          <div class="chart-bar" style="height: 45%;" data-value="45"></div>
          <div class="chart-bar" style="height: 62%;" data-value="62"></div>
          <div class="chart-bar" style="height: 58%;" data-value="58"></div>
          <div class="chart-bar" style="height: 73%;" data-value="73"></div>
          <div class="chart-bar" style="height: 81%;" data-value="81"></div>
          <div class="chart-bar" style="height: 76%;" data-value="76"></div>
          <div class="chart-bar" style="height: 89%;" data-value="89"></div>
          <div class="chart-bar" style="height: 95%;" data-value="95"></div>
          <div class="chart-bar" style="height: 88%;" data-value="88"></div>
          <div class="chart-bar" style="height: 92%;" data-value="92"></div>
          <div class="chart-bar" style="height: 87%;" data-value="87"></div>
          <div class="chart-bar" style="height: 94%;" data-value="94"></div>
        </div>
      </div>

      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
              <th>Revenue</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>#001</td>
              <td>Project Alpha</td>
              <td><span class="status-badge success">Active</span></td>
              <td>$12,450</td>
              <td>2025-10-25 14:23</td>
            </tr>
            <tr>
              <td>#002</td>
              <td>Project Beta</td>
              <td><span class="status-badge warning">Pending</span></td>
              <td>$8,320</td>
              <td>2025-10-25 13:15</td>
            </tr>
            <tr>
              <td>#003</td>
              <td>Project Gamma</td>
              <td><span class="status-badge success">Active</span></td>
              <td>$15,780</td>
              <td>2025-10-25 12:45</td>
            </tr>
            <tr>
              <td>#004</td>
              <td>Project Delta</td>
              <td><span class="status-badge danger">Inactive</span></td>
              <td>$3,290</td>
              <td>2025-10-24 18:30</td>
            </tr>
            <tr>
              <td>#005</td>
              <td>Project Epsilon</td>
              <td><span class="status-badge success">Active</span></td>
              <td>$21,640</td>
              <td>2025-10-25 11:20</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="button-group">
        <button class="btn btn-primary" onclick="handlePrimaryAction()">Generate Report</button>
        <button class="btn btn-secondary" onclick="handleSecondaryAction()">Export Data</button>
        <button class="btn btn-danger" onclick="handleDangerAction()">Clear Cache</button>
      </div>
    </main>

    <footer>
      <p>&copy; 2025 Large Test Dashboard. Parser Testing Fixture for simply-mcp-ts.</p>
    </footer>
  </div>

  <script>
    // Dashboard state management
    const dashboardState = {
      currentView: 'overview',
      filters: {
        dateRange: 'last-30-days',
        status: 'all',
        sortBy: 'date',
        sortOrder: 'desc'
      },
      data: {
        users: [],
        revenue: [],
        performance: []
      },
      cache: new Map()
    };

    // Initialize dashboard
    function initializeDashboard() {
      console.log('Initializing Large Test Dashboard...');
      loadInitialData();
      setupEventListeners();
      initializeCharts();
      startPerformanceMonitoring();
    }

    // Load initial data
    function loadInitialData() {
      const mockData = {
        users: generateMockUsers(100),
        revenue: generateMockRevenue(12),
        performance: generateMockPerformance(30)
      };

      dashboardState.data = mockData;
      updateDashboardStats(mockData);
    }

    // Generate mock user data
    function generateMockUsers(count) {
      const users = [];
      for (let i = 0; i < count; i++) {
        users.push({
          id: i + 1,
          name: 'User ' + (i + 1),
          email: 'user' + (i + 1) + '@example.com',
          status: Math.random() > 0.3 ? 'active' : 'inactive',
          createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
        });
      }
      return users;
    }

    // Generate mock revenue data
    function generateMockRevenue(months) {
      const revenue = [];
      for (let i = 0; i < months; i++) {
        revenue.push({
          month: i + 1,
          amount: Math.floor(Math.random() * 50000) + 30000,
          transactions: Math.floor(Math.random() * 500) + 100
        });
      }
      return revenue;
    }

    // Generate mock performance data
    function generateMockPerformance(days) {
      const performance = [];
      for (let i = 0; i < days; i++) {
        performance.push({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          uptime: 95 + Math.random() * 5,
          responseTime: Math.floor(Math.random() * 200) + 50,
          errors: Math.floor(Math.random() * 20)
        });
      }
      return performance;
    }

    // Update dashboard statistics
    function updateDashboardStats(data) {
      const totalUsers = data.users.filter(u => u.status === 'active').length;
      const totalRevenue = data.revenue.reduce((sum, r) => sum + r.amount, 0);
      const avgUptime = data.performance.reduce((sum, p) => sum + p.uptime, 0) / data.performance.length;

      console.log('Dashboard Stats:', {
        totalUsers,
        totalRevenue,
        avgUptime
      });
    }

    // Setup event listeners
    function setupEventListeners() {
      const navLinks = document.querySelectorAll('nav a');
      navLinks.forEach(link => {
        link.addEventListener('click', handleNavigation);
      });

      const chartBars = document.querySelectorAll('.chart-bar');
      chartBars.forEach(bar => {
        bar.addEventListener('click', handleChartBarClick);
        bar.addEventListener('mouseenter', handleChartBarHover);
      });
    }

    // Handle navigation
    function handleNavigation(event) {
      event.preventDefault();
      const target = event.target.getAttribute('href').substring(1);
      dashboardState.currentView = target;

      document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('active');
      });
      event.target.classList.add('active');

      console.log('Navigated to:', target);
    }

    // Handle chart bar click
    function handleChartBarClick(event) {
      const value = event.target.getAttribute('data-value');
      console.log('Chart bar clicked:', value);
      showDetailedView(value);
    }

    // Handle chart bar hover
    function handleChartBarHover(event) {
      const value = event.target.getAttribute('data-value');
      console.log('Chart bar hovered:', value);
    }

    // Show detailed view
    function showDetailedView(value) {
      alert('Detailed view for value: ' + value);
    }

    // Initialize charts
    function initializeCharts() {
      console.log('Initializing charts with data:', dashboardState.data);
      animateChartBars();
    }

    // Animate chart bars
    function animateChartBars() {
      const bars = document.querySelectorAll('.chart-bar');
      bars.forEach((bar, index) => {
        setTimeout(() => {
          bar.style.opacity = '0';
          bar.style.transform = 'scaleY(0)';
          setTimeout(() => {
            bar.style.transition = 'all 0.6s ease';
            bar.style.opacity = '1';
            bar.style.transform = 'scaleY(1)';
          }, 50);
        }, index * 100);
      });
    }

    // Performance monitoring
    function startPerformanceMonitoring() {
      setInterval(() => {
        const performance = {
          memory: performance.memory ? performance.memory.usedJSHeapSize : 'N/A',
          timestamp: new Date().toISOString()
        };
        console.log('Performance check:', performance);
      }, 30000);
    }

    // Button handlers
    function handlePrimaryAction() {
      console.log('Generating report...');
      alert('Report generation started. This is a test fixture.');
    }

    function handleSecondaryAction() {
      console.log('Exporting data...');
      alert('Data export started. This is a test fixture.');
    }

    function handleDangerAction() {
      console.log('Clearing cache...');
      if (confirm('Are you sure you want to clear the cache?')) {
        dashboardState.cache.clear();
        alert('Cache cleared successfully.');
      }
    }

    // Utility functions
    function formatCurrency(amount) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    }

    function formatDate(date) {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    }

    function formatPercentage(value) {
      return (value * 100).toFixed(2) + '%';
    }

    // Initialize on load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeDashboard);
    } else {
      initializeDashboard();
    }
  </script>
</body>
</html>`;
  tools: ['dashboard_refresh', 'export_data', 'clear_cache'];
}

export interface LargeTestServer extends IServer {
  ui: [LargeTestUI];
  tools: {
    dashboard_refresh: {
      description: 'Refresh dashboard data';
      parameters: {
        type: 'object';
        properties: {
          force: { type: 'boolean'; description: 'Force refresh cache' };
        };
      };
    };
    export_data: {
      description: 'Export dashboard data';
      parameters: {
        type: 'object';
        properties: {
          format: { type: 'string'; enum: ['json', 'csv', 'xlsx']; description: 'Export format' };
          dateRange: { type: 'string'; description: 'Date range for export' };
        };
        required: ['format'];
      };
    };
    clear_cache: {
      description: 'Clear dashboard cache';
      parameters: {
        type: 'object';
        properties: {
          confirm: { type: 'boolean'; description: 'Confirmation flag' };
        };
        required: ['confirm'];
      };
    };
  };
}
