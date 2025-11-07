import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for MCP Interpreter E2E Tests
 *
 * Tests the Next.js application including:
 * - Connection Manager server selection
 * - File-based server launch
 * - Running server detection
 * - Tool execution
 * - Remote DOM integration
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/connection-manager-server-selection.spec.ts',
  fullyParallel: false, // Run tests sequentially for server connection tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // One worker to avoid port conflicts
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    baseURL: process.env.MCP_INTERPRETER_URL || 'http://localhost:3001',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
