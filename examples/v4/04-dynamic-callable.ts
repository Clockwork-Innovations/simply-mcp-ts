/**
 * IUI v4.0 Example: Dynamic/Callable UI
 *
 * Generate UI content dynamically at runtime using a callable signature.
 * Perfect for personalized UIs, data-driven interfaces, or server-side rendering.
 */

import { InterfaceServer, IUI } from '../../src/index.js';

const server = new InterfaceServer({
  name: 'dynamic-ui-server',
  version: '1.0.0',
});

/**
 * Personalized Greeting UI
 *
 * Uses callable signature to generate content dynamically.
 * The function receives request context and can return:
 * - HTML string
 * - URL string
 * - Remote DOM JSON
 * - File path
 */
interface PersonalizedGreeting extends IUI {
  uri: 'ui://greeting';
  name: 'Personalized Greeting';
  description: 'Dynamic greeting based on time and user';

  // Callable signature - function that returns content
  (): string {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const emoji = hour < 12 ? '🌅' : hour < 18 ? '☀️' : '🌙';

    return `
      <div style="font-family: system-ui; padding: 2rem; text-align: center;">
        <h1 style="font-size: 3rem; margin: 0;">${emoji}</h1>
        <h2 style="color: #333;">${greeting}!</h2>
        <p style="color: #666;">Current time: ${new Date().toLocaleTimeString()}</p>
      </div>
    `;
  }
}

/**
 * Data Dashboard UI
 *
 * Async callable for fetching data from APIs
 */
interface DataDashboard extends IUI {
  uri: 'ui://data-dashboard';
  name: 'Data Dashboard';
  description: 'Dashboard with real-time data';

  // Async callable - can fetch from databases, APIs, etc.
  async (): Promise<string> {
    // Simulate fetching data
    const stats = {
      users: Math.floor(Math.random() * 10000),
      revenue: Math.floor(Math.random() * 100000),
      growth: (Math.random() * 20).toFixed(1),
    };

    return `
      <div style="font-family: system-ui; padding: 2rem;">
        <h1>Dashboard</h1>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
          <div style="padding: 1rem; background: #f0f0f0; border-radius: 8px;">
            <div style="font-size: 2rem; font-weight: bold;">${stats.users}</div>
            <div style="color: #666;">Active Users</div>
          </div>
          <div style="padding: 1rem; background: #f0f0f0; border-radius: 8px;">
            <div style="font-size: 2rem; font-weight: bold;">$${stats.revenue}</div>
            <div style="color: #666;">Revenue</div>
          </div>
          <div style="padding: 1rem; background: #f0f0f0; border-radius: 8px;">
            <div style="font-size: 2rem; font-weight: bold;">${stats.growth}%</div>
            <div style="color: #666;">Growth</div>
          </div>
        </div>
        <p style="color: #999; font-size: 0.875rem; margin-top: 1rem;">
          Generated at ${new Date().toISOString()}
        </p>
      </div>
    `;
  }
}

export default server;
