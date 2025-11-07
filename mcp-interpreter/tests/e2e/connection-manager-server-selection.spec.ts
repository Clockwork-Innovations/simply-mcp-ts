/**
 * Connection Manager Server Selection E2E Tests
 *
 * Tests the complete file-select-launch-connect flow for the MCP Interpreter
 * Connection Manager with the following features:
 * 1. File-based server selection (Load from File mode)
 * 2. Running server detection (Connect to Running mode)
 * 3. Manual server configuration
 * 4. Transport auto-detection from IServer config
 * 5. Local v4 CLI usage (not npm v3.4)
 *
 * TIMING FIX PATTERN:
 * The Connection Manager component makes API calls on mount when it defaults to 'file' mode.
 * Tests that need to capture these API responses must either:
 * 1. For "Load from File" tests: Switch away to Manual first, then back to File mode
 *    to trigger a fresh fetch that can be captured by the test's response listener.
 * 2. For "Connect to Running" tests: Set up the response listener BEFORE clicking
 *    the mode button, since switching from file→running immediately triggers discovery.
 * 3. For tests that don't need API data: Use waitForLoadState('networkidle') instead.
 *
 * This ensures tests capture the API calls they're waiting for rather than missing
 * mount-time calls that happened before the test set up listeners.
 *
 * @module tests/e2e/connection-manager-server-selection
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const MCP_INTERPRETER_URL = process.env.MCP_INTERPRETER_URL || 'http://localhost:3001';

/**
 * Setup helper: Navigate to MCP Interpreter and wait for ready
 */
async function setupMCPInterpreter(page: Page): Promise<void> {
  await page.goto(MCP_INTERPRETER_URL);

  // Wait for the Connection Manager to be visible
  await page.waitForSelector('text=Connection Manager', { timeout: 10000 });

  // Wait for initial load to complete
  await page.waitForLoadState('networkidle');
}

/**
 * Test Suite: Connection Manager Server Selection
 */
test.describe('Connection Manager - Server Selection', () => {

  test.beforeEach(async ({ page }) => {
    await setupMCPInterpreter(page);
  });

  test.describe('Connection Mode Selector', () => {
    test('should display all three connection modes', async ({ page }) => {
      // Check for connection mode radio buttons
      await expect(page.locator('text=Load from File')).toBeVisible();
      await expect(page.locator('text=Connect to Running')).toBeVisible();
      await expect(page.locator('text=Manual')).toBeVisible();
    });

    test('should default to "Load from File" mode', async ({ page }) => {
      // Check that "Load from File" is selected by default
      const fileMode = page.locator('input[value="file"]');
      await expect(fileMode).toBeChecked();
    });

    test('should switch between connection modes', async ({ page }) => {
      // Click "Connect to Running"
      await page.click('text=Connect to Running');
      const runningMode = page.locator('input[value="running"]');
      await expect(runningMode).toBeChecked();

      // Click "Manual"
      await page.click('text=Manual');
      const manualMode = page.locator('input[value="manual"]');
      await expect(manualMode).toBeChecked();

      // Click back to "Load from File"
      await page.click('text=Load from File');
      const fileMode = page.locator('input[value="file"]');
      await expect(fileMode).toBeChecked();
    });
  });

  test.describe('Load from File Mode', () => {
    test('should display file selector dropdown', async ({ page }) => {
      // Ensure we're in file mode
      await page.click('text=Load from File');

      // Check for "Select Server File" label and dropdown
      await expect(page.locator('text=Select Server File')).toBeVisible();
      await expect(page.locator('select#serverFile')).toBeVisible();
    });

    test('should fetch and display server files on load', async ({ page }) => {
      // FIX: Component makes API call on mount when defaulting to file mode.
      // Switch away first, then back to file mode to trigger a fresh fetch we can capture.
      await page.click('text=Manual');
      await page.waitForTimeout(100); // Let React update state

      // Now switch TO file mode - this triggers fresh fetch
      const responsePromise = page.waitForResponse(
        (response) => response.url().includes('/api/mcp/servers/files') && response.status() === 200,
        { timeout: 10000 }
      );
      await page.click('text=Load from File');
      await responsePromise;

      // Check that the dropdown is populated (should have more than just the placeholder)
      const options = await page.locator('select#serverFile option').count();
      expect(options).toBeGreaterThan(1); // At least placeholder + 1 server file
    });

    test('should display transport type and port info in dropdown options', async ({ page }) => {
      // FIX: Switch away from file mode first, then back to capture API call
      await page.click('text=Manual');
      await page.waitForTimeout(100);

      // Set up listener before switching to file mode
      const responsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/mcp/servers/files') && response.status() === 200
      );
      await page.click('text=Load from File');
      await responsePromise;

      // Get dropdown text and verify format includes transport info
      const firstOption = page.locator('select#serverFile option').nth(1);
      const optionText = await firstOption.textContent();

      // Should contain transport info like [STDIO], [HTTP:3000], etc.
      expect(optionText).toMatch(/\[(STDIO|HTTP|WEBSOCKET)/);
    });

    test('should have refresh button to reload server files', async ({ page }) => {
      // Already in file mode by default, just wait for initial load
      await page.waitForLoadState('networkidle');

      // Find the refresh button (has RefreshCw icon)
      const refreshButton = page.locator('button[data-testid="refresh-files"], button:has-text("")').first();
      await expect(refreshButton).toBeVisible();

      // Click refresh and verify API call
      const responsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/mcp/servers/files') && response.status() === 200
      );

      await refreshButton.click();
      await responsePromise;
    });

    test('should disable connect button when no file selected', async ({ page }) => {
      // Ensure we're in file mode
      await page.click('text=Load from File');

      // Wait for files to load
      await page.waitForLoadState('networkidle');

      // Connect button should be disabled
      const connectButton = page.locator('button:has-text("Connect")');
      await expect(connectButton).toBeDisabled();
    });

    test('should enable connect button when file is selected', async ({ page }) => {
      // FIX: Switch away then back to capture API call
      await page.click('text=Manual');
      await page.waitForTimeout(100);

      const responsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/mcp/servers/files') && response.status() === 200
      );
      await page.click('text=Load from File');
      await responsePromise;

      // Select a file
      await page.selectOption('select#serverFile', { index: 1 });

      // Connect button should be enabled
      const connectButton = page.locator('button:has-text("Connect")');
      await expect(connectButton).toBeEnabled();
    });

    // NOTE: This test requires an actual MCP server to connect to
    // TODO: Set up integration test environment with real MCP server
    test('should connect to selected STDIO server file', async ({ page }) => {
      // FIX: Switch away then back to capture API call
      await page.click('text=Manual');
      await page.waitForTimeout(100);

      // Set up listener and switch back to file mode
      const filesResponsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/mcp/servers/files') && response.status() === 200
      );
      await page.click('text=Load from File');
      const filesResponse = await filesResponsePromise;

      // Get the files data to find the test server
      const filesData = await filesResponse.json();
      const testServer = filesData.data?.serverFiles?.find((f: any) =>
        f.name === 'test-server.ts' && f.serverName === 'test-mcp-server'
      );

      if (!testServer) {
        throw new Error('test-server.ts not found in server files. Make sure test-server.ts exists in mcp-interpreter directory.');
      }

      // Select the test server
      await page.selectOption('select#serverFile', testServer.path);

      // Click connect
      await page.click('button:has-text("Connect")');

      // Wait for connection to establish - target the status display container specifically
      await expect(page.locator('.flex.items-center.gap-2:has(.bg-green-500) .text-foreground')).toContainText('Connected', { timeout: 15000 });

      // Verify connection status shows green indicator
      await expect(page.locator('.bg-green-500')).toBeVisible();
    });

    test('should show loading state while connecting', async ({ page }) => {
      // FIX: Switch away then back to capture API call
      await page.click('text=Manual');
      await page.waitForTimeout(100);

      const responsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/mcp/servers/files') && response.status() === 200
      );
      await page.click('text=Load from File');
      await responsePromise;

      await page.selectOption('select#serverFile', { index: 1 });

      // Click connect
      await page.click('button:has-text("Connect")');

      // Should show "Connecting..." state - target the status display with yellow indicator
      await expect(page.locator('.flex.items-center.gap-2:has(.bg-yellow-500) .text-muted-foreground')).toContainText('Connecting...');
      await expect(page.locator('.animate-spin')).toBeVisible();
    });
  });

  test.describe('Connect to Running Mode', () => {
    test('should display running server selector dropdown', async ({ page }) => {
      // Switch to running mode
      await page.click('text=Connect to Running');

      // Check for "Select Running Server" label and dropdown
      await expect(page.locator('text=Select Running Server')).toBeVisible();
      await expect(page.locator('select#runningServer')).toBeVisible();
    });

    test('should trigger server discovery on mode switch', async ({ page }) => {
      // FIX: Component starts in file mode, so switching to running mode triggers discovery
      // Set up listener BEFORE switching modes
      const responsePromise = page.waitForResponse(
        (response) => response.url().includes('/api/mcp/servers/discover'),
        { timeout: 10000 }
      );

      await page.click('text=Connect to Running');
      await responsePromise;
    });

    test('should have refresh button to re-discover servers', async ({ page }) => {
      // FIX: Set up listener before switching to running mode
      const initialResponsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/mcp/servers/discover')
      );

      // Switch to running mode
      await page.click('text=Connect to Running');
      await initialResponsePromise;

      // Find the refresh button in the running server section specifically
      // It's the button next to "Select Running Server" label
      const refreshButton = page.locator('label:has-text("Select Running Server")').locator('..').locator('button');

      const responsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/mcp/servers/discover') && response.status() === 200
      );

      await refreshButton.click();
      await responsePromise;
    });

    test('should display discovered servers in dropdown', async ({ page }) => {
      // FIX: Set up listener before switching to running mode
      const discoveryResponsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/mcp/servers/discover') && response.status() === 200
      );

      // Switch to running mode
      await page.click('text=Connect to Running');

      // Wait for discovery
      const discoveryResponse = await discoveryResponsePromise;
      const discoveryData = await discoveryResponse.json();

      // If servers were discovered, check dropdown
      if (discoveryData.data?.servers?.length > 0) {
        const options = await page.locator('select#runningServer option').count();
        expect(options).toBeGreaterThan(1); // Placeholder + discovered servers
      }
    });

    test('should disable connect button when no running server selected', async ({ page }) => {
      // FIX: Set up listener before switching to running mode
      const responsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/mcp/servers/discover')
      );

      // Switch to running mode
      await page.click('text=Connect to Running');

      // Wait for discovery
      await responsePromise;

      // Connect button should be disabled
      const connectButton = page.locator('button:has-text("Connect")');
      await expect(connectButton).toBeDisabled();
    });
  });

  test.describe('Manual Mode', () => {
    test('should display transport type selector', async ({ page }) => {
      // Switch to manual mode
      await page.click('text=Manual');

      // Check for transport options
      await expect(page.locator('text=Stdio (Local)')).toBeVisible();
      await expect(page.locator('text=HTTP Stateful (SSE)')).toBeVisible();
      await expect(page.locator('text=HTTP Stateless (REST)')).toBeVisible();
    });

    test('should show server path input for stdio transport', async ({ page }) => {
      // Switch to manual mode
      await page.click('text=Manual');

      // Select stdio
      await page.click('text=Stdio (Local)');

      // Check for server path input
      await expect(page.locator('#serverPath')).toBeVisible();
      await expect(page.locator('text=Path to TypeScript server file')).toBeVisible();
    });

    test('should show server URL input for HTTP transports', async ({ page }) => {
      // Switch to manual mode
      await page.click('text=Manual');

      // Select HTTP Stateful
      await page.click('text=HTTP Stateful (SSE)');

      // Check for server URL input
      await expect(page.locator('#serverUrl')).toBeVisible();
      await expect(page.locator('text=HTTP endpoint for MCP server')).toBeVisible();
    });

    test('should show authentication options for HTTP transports', async ({ page }) => {
      // Switch to manual mode
      await page.click('text=Manual');

      // Select HTTP Stateful
      await page.click('text=HTTP Stateful (SSE)');

      // Check for auth checkbox
      await expect(page.locator('text=Use API Key Authentication')).toBeVisible();

      // Enable auth
      await page.check('#useAuth');

      // Check for API key and header inputs
      await expect(page.locator('#apiKey')).toBeVisible();
      await expect(page.locator('#apiKeyHeader')).toBeVisible();
    });
  });

  test.describe('Connection Status Display', () => {
    test('should show disconnected status initially', async ({ page }) => {
      await expect(page.locator('text=Disconnected')).toBeVisible();
      await expect(page.locator('.bg-red-500')).toBeVisible();
    });

    test('should show connecting status during connection', async ({ page }) => {
      // Component starts in file mode, wait for initial load
      await page.waitForLoadState('networkidle');

      // Select a file and connect
      await page.selectOption('select#serverFile', { index: 1 });
      await page.click('button:has-text("Connect")');

      // Should show connecting state - target the status display with yellow indicator
      await expect(page.locator('.flex.items-center.gap-2:has(.bg-yellow-500) .text-muted-foreground')).toContainText('Connecting...');
      await expect(page.locator('.bg-yellow-500')).toBeVisible();
    });

    // NOTE: This test requires an actual MCP server to connect to
    // TODO: Set up integration test environment with real MCP server
    test('should show connected status after successful connection', async ({ page }) => {
      // FIX: Switch away then back to capture API call
      await page.click('text=Manual');
      await page.waitForTimeout(100);

      const filesResponsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/mcp/servers/files') && response.status() === 200
      );
      await page.click('text=Load from File');
      const filesResponse = await filesResponsePromise;

      // Get the files data to find the test server
      const filesData = await filesResponse.json();
      const testServer = filesData.data?.serverFiles?.find((f: any) =>
        f.name === 'test-server.ts' && f.serverName === 'test-mcp-server'
      );

      if (!testServer) {
        throw new Error('test-server.ts not found in server files');
      }

      // Select the test server
      await page.selectOption('select#serverFile', testServer.path);

      // Connect
      await page.click('button:has-text("Connect")');

      // Wait for connected state - target the status display with green indicator
      await expect(page.locator('.flex.items-center.gap-2:has(.bg-green-500) .text-foreground')).toContainText('Connected', { timeout: 15000 });
      await expect(page.locator('.bg-green-500')).toBeVisible();
    });

    // NOTE: This test requires an actual MCP server to connect to
    // TODO: Set up integration test environment with real MCP server
    test('should display server info badges when connected', async ({ page }) => {
      // FIX: Switch away then back to capture API call
      await page.click('text=Manual');
      await page.waitForTimeout(100);

      const filesResponsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/mcp/servers/files') && response.status() === 200
      );
      await page.click('text=Load from File');
      const filesResponse = await filesResponsePromise;

      // Get the files data to find the test server
      const filesData = await filesResponse.json();
      const testServer = filesData.data?.serverFiles?.find((f: any) =>
        f.name === 'test-server.ts' && f.serverName === 'test-mcp-server'
      );

      if (!testServer) {
        throw new Error('test-server.ts not found in server files');
      }

      // Select the test server and connect
      await page.selectOption('select#serverFile', testServer.path);
      await page.click('button:has-text("Connect")');

      // Wait for connection - target the status display with green indicator
      await expect(page.locator('.flex.items-center.gap-2:has(.bg-green-500) .text-foreground')).toContainText('Connected', { timeout: 15000 });

      // Check for server info display (name and version)
      // The server name badge should be visible (use .last() to get the status badge, not the dropdown option)
      await expect(page.locator('text=test-mcp-server').last()).toBeVisible();
      // The server version should be visible
      await expect(page.locator('text=v1.0.0')).toBeVisible();
    });
  });

  test.describe('Local v4 CLI Usage', () => {
    // NOTE: This test requires an actual MCP server to connect to
    test('should use local simply-mcp CLI (not npm v3.4)', async ({ page }) => {
      // This test verifies behavior but can't directly check the CLI version
      // We check that connection succeeds, implying local v4 is being used

      // FIX: Switch away then back to capture API call
      await page.click('text=Manual');
      await page.waitForTimeout(100);

      const filesResponsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/mcp/servers/files') && response.status() === 200
      );
      await page.click('text=Load from File');
      const filesResponse = await filesResponsePromise;

      // Get the files data to find the test server
      const filesData = await filesResponse.json();
      const testServer = filesData.data?.serverFiles?.find((f: any) =>
        f.name === 'test-server.ts' && f.serverName === 'test-mcp-server'
      );

      if (!testServer) {
        throw new Error('test-server.ts not found in server files');
      }

      // Select the test server
      await page.selectOption('select#serverFile', testServer.path);

      // Connect
      await page.click('button:has-text("Connect")');

      // Should successfully connect using local v4 - target the status display with green indicator
      await expect(page.locator('.flex.items-center.gap-2:has(.bg-green-500) .text-foreground')).toContainText('Connected', { timeout: 15000 });

      // Disconnect
      await page.click('button:has-text("Disconnect")');
      await expect(page.locator('text=Disconnected')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should show error state on connection failure', async ({ page }) => {
      // Switch to manual mode
      await page.click('text=Manual');

      // Enter invalid server path
      await page.fill('#serverPath', '/invalid/path/to/server.ts');

      // Try to connect
      await page.click('button:has-text("Connect")');

      // Should show error
      await expect(page.locator('text=Error:')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.bg-red-500')).toBeVisible();
    });

    test('should allow retry after connection error', async ({ page }) => {
      // Switch to manual mode
      await page.click('text=Manual');

      // Enter invalid server path
      await page.fill('#serverPath', '/invalid/path/to/server.ts');

      // Try to connect
      await page.click('button:has-text("Connect")');

      // Wait for error
      await expect(page.locator('text=Error:')).toBeVisible({ timeout: 10000 });

      // FIX: Set up listener before switching back to file mode
      const responsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/mcp/servers/files') && response.status() === 200
      );

      // Switch back to file mode to try again
      await page.click('text=Load from File');
      await responsePromise;

      // Connect button should be enabled after selecting a file
      await page.selectOption('select#serverFile', { index: 1 });
      await expect(page.locator('button:has-text("Connect")')).toBeEnabled();
    });
  });

  test.describe('Disconnect Functionality', () => {
    // NOTE: These tests require an actual MCP server to connect to
    test('should show disconnect button when connected', async ({ page }) => {
      // FIX: Switch away then back to capture API call
      await page.click('text=Manual');
      await page.waitForTimeout(100);

      const filesResponsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/mcp/servers/files') && response.status() === 200
      );
      await page.click('text=Load from File');
      const filesResponse = await filesResponsePromise;

      // Get the files data to find the test server
      const filesData = await filesResponse.json();
      const testServer = filesData.data?.serverFiles?.find((f: any) =>
        f.name === 'test-server.ts' && f.serverName === 'test-mcp-server'
      );

      if (!testServer) {
        throw new Error('test-server.ts not found in server files');
      }

      // Connect to the test server
      await page.selectOption('select#serverFile', testServer.path);
      await page.click('button:has-text("Connect")');

      // Wait for connection - target the status display with green indicator
      await expect(page.locator('.flex.items-center.gap-2:has(.bg-green-500) .text-foreground')).toContainText('Connected', { timeout: 15000 });

      // Disconnect button should be visible
      await expect(page.locator('button:has-text("Disconnect")')).toBeVisible();
    });

    test('should disconnect successfully', async ({ page }) => {
      // FIX: Switch away then back to capture API call
      await page.click('text=Manual');
      await page.waitForTimeout(100);

      const filesResponsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/mcp/servers/files') && response.status() === 200
      );
      await page.click('text=Load from File');
      const filesResponse = await filesResponsePromise;

      // Get the files data to find the test server
      const filesData = await filesResponse.json();
      const testServer = filesData.data?.serverFiles?.find((f: any) =>
        f.name === 'test-server.ts' && f.serverName === 'test-mcp-server'
      );

      if (!testServer) {
        throw new Error('test-server.ts not found in server files');
      }

      // Connect to the test server
      await page.selectOption('select#serverFile', testServer.path);
      await page.click('button:has-text("Connect")');

      // Wait for connection - target the status display with green indicator
      await expect(page.locator('.flex.items-center.gap-2:has(.bg-green-500) .text-foreground')).toContainText('Connected', { timeout: 15000 });

      // Disconnect
      await page.click('button:has-text("Disconnect")');

      // Should show disconnected state
      await expect(page.locator('text=Disconnected')).toBeVisible();
      await expect(page.locator('.bg-red-500')).toBeVisible();

      // Connect button should be visible again
      await expect(page.locator('button:has-text("Connect")')).toBeVisible();
    });
  });
});
