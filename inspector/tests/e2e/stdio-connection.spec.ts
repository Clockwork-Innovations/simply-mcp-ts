// Test file: tests/e2e/stdio-connection.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Stdio Connection Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to inspector
    await page.goto('http://localhost:3007');

    // Select stdio transport
    await page.click('input[value="stdio"]');
  });

  test('should show error when server file does not exist', async ({ page }) => {
    // Enter non-existent path
    const serverPathInput = page.locator('input#serverPath');
    await serverPathInput.clear();
    await serverPathInput.fill('/path/to/nonexistent/server.ts');

    // Click connect
    await page.click('button:has-text("Connect")');

    // Wait for error message
    await page.waitForTimeout(1000);

    // Should show file not found error message
    const errorText = await page.textContent('body');
    expect(errorText).toContain('Server file not found');
    expect(errorText).toContain('Please check that the file path');

    // Should NOT show generic "Connection closed" error
    expect(errorText).not.toContain('MCP error -32000');
  });

  test('should connect successfully to valid server file', async ({ page }) => {
    // Enter valid path
    const serverPathInput = page.locator('input#serverPath');
    await serverPathInput.clear();
    await serverPathInput.fill('/mnt/Shared/cs-projects/simply-mcp-ts/examples/bundle-test-server.ts');

    // Click connect
    await page.click('button:has-text("Connect")');

    // Should show connected status (wait up to 10 seconds)
    await expect(page.locator('text="Connected"')).toBeVisible({ timeout: 10000 });

    // Should show server transport badge
    await expect(page.locator('text="📡 Stdio"')).toBeVisible();
  });

  test('should validate file extension', async ({ page }) => {
    // Enter path with invalid extension
    const serverPathInput = page.locator('input#serverPath');
    await serverPathInput.clear();
    await serverPathInput.fill('/mnt/Shared/cs-projects/simply-mcp-ts/README.md');

    // Click connect
    await page.click('button:has-text("Connect")');

    // Wait for error
    await page.waitForTimeout(1000);

    // Should show extension error
    const errorText = await page.textContent('body');
    expect(errorText).toContain('Invalid server file');
    expect(errorText).toContain('must be a .ts, .js');
  });

  test('should handle file path with spaces correctly', async ({ page }) => {
    // Enter path with spaces (non-existent to test validation, not actual connection)
    const serverPathInput = page.locator('input#serverPath');
    await serverPathInput.clear();
    await serverPathInput.fill('/path/with spaces/server.ts');

    // Click connect
    await page.click('button:has-text("Connect")');

    // Wait for error
    await page.waitForTimeout(1000);

    // Should show file not found error (validation working correctly)
    const errorText = await page.textContent('body');
    expect(errorText).toContain('Server file not found');
    expect(errorText).toContain('/path/with spaces/server.ts');
  });

  test('should show clear error for empty server path', async ({ page }) => {
    // Clear server path
    const serverPathInput = page.locator('input#serverPath');
    await serverPathInput.clear();

    // Connect button should be disabled when path is empty
    const connectButton = page.locator('button:has-text("Connect")');
    await expect(connectButton).toBeDisabled();
  });
});

test.describe('Stdio Connection Error Messages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3007');
    await page.click('input[value="stdio"]');
  });

  test('should display error in status section', async ({ page }) => {
    // Enter invalid path
    const serverPathInput = page.locator('input#serverPath');
    await serverPathInput.clear();
    await serverPathInput.fill('/invalid/path.ts');

    // Click connect
    await page.click('button:has-text("Connect")');

    // Wait for error state
    await page.waitForTimeout(1000);

    // Check that status section shows error
    const statusSection = page.locator('text="Status:"').locator('..');
    await expect(statusSection).toContainText('Error');
  });

  test('should allow retry after error', async ({ page }) => {
    // Enter invalid path
    const serverPathInput = page.locator('input#serverPath');
    await serverPathInput.clear();
    await serverPathInput.fill('/invalid/path.ts');

    // Click connect - should fail
    await page.click('button:has-text("Connect")');
    await page.waitForTimeout(1000);

    // Now enter valid path
    await serverPathInput.clear();
    await serverPathInput.fill('/mnt/Shared/cs-projects/simply-mcp-ts/examples/bundle-test-server.ts');

    // Click connect again - should succeed
    await page.click('button:has-text("Connect")');

    // Should show connected status
    await expect(page.locator('text="Connected"')).toBeVisible({ timeout: 10000 });
  });
});
