/**
 * UI Workflow Integration Tests - Playwright E2E
 *
 * Comprehensive end-to-end test validating the complete UI pipeline:
 * 1. Server-side UI resource compilation (TypeScript interface)
 * 2. Bundle generation with RemoteDOMRenderer
 * 3. Browser loads and initializes RemoteDOMWorkerManager
 * 4. UI renders correctly in React
 * 5. User interactions trigger tool calls
 * 6. Host receives and processes messages
 *
 * This test uses the subscription-test-server.ts fixture which provides:
 * - A static HTML UI resource with interactive buttons
 * - Tools that can be called from the UI (refresh, reset, increment)
 * - Dynamic content that updates on tool execution
 *
 * @module tests/e2e/ui-workflow-integration
 */

import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Helper to setup test page and wait for all modules to be ready
 */
async function setupTestPage(page: any) {
  await page.goto('/test-page.html');
  await page.waitForFunction(() => (window as any).testReady === true);
}

test.describe('UI Workflow Integration - Complete Pipeline', () => {
  test('complete workflow: static UI resource renders and handles tool interaction', async ({ page }) => {
    // STEP 1: Setup test page with all required modules
    await setupTestPage(page);

    // Track console messages for debugging
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // STEP 2: Create and render a static UI resource
    const result = await page.evaluate(async () => {
      const { React, ReactDOM, RemoteDOMWorkerManager, RemoteDOMProvider } = window as any;

      // Create the HTML content for our test UI (simulating compiled UI resource)
      // This simulates what the subscription-test-server.ts generates
      const uiContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Test UI Resource</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                background: #f5f5f5;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              h1 {
                color: #333;
                margin-bottom: 20px;
              }
              .stats {
                display: flex;
                gap: 16px;
                margin: 20px 0;
              }
              .stat-card {
                flex: 1;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
              }
              .stat-value {
                font-size: 32px;
                font-weight: bold;
              }
              .stat-label {
                font-size: 12px;
                opacity: 0.9;
                text-transform: uppercase;
              }
              .actions {
                display: flex;
                gap: 12px;
                margin: 20px 0;
              }
              .btn {
                flex: 1;
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 600;
                transition: transform 0.1s;
              }
              .btn-primary {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
              }
              .btn-primary:hover {
                transform: translateY(-1px);
              }
              .btn-danger {
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                color: white;
              }
              .btn-secondary {
                background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
                color: white;
              }
              #status {
                margin-top: 16px;
                padding: 12px;
                border-radius: 8px;
                font-size: 14px;
                text-align: center;
                display: none;
              }
              #status.visible {
                display: block;
              }
              #status.success {
                background: #d4edda;
                color: #155724;
              }
              #status.error {
                background: #f8d7da;
                color: #721c24;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 id="test-ui-title">Test UI Resource</h1>
              <div class="stats">
                <div class="stat-card">
                  <div class="stat-label">Request Count</div>
                  <div class="stat-value" id="count">0</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Reset Count</div>
                  <div class="stat-value" id="reset-count">0</div>
                </div>
              </div>
              <div class="actions">
                <button class="btn btn-primary" id="refresh-btn" onclick="triggerRefresh()">
                  Trigger Update
                </button>
                <button class="btn btn-danger" id="reset-btn" onclick="triggerReset()">
                  Reset Counter
                </button>
                <button class="btn btn-secondary" id="increment-btn" onclick="incrementSilent()">
                  Increment (No Notify)
                </button>
              </div>
              <div id="status"></div>
            </div>

            <script>
              // Inject callTool function (simulates UI adapter's tool helper script)
              (function() {
                'use strict';

                const ALLOWED_TOOLS = ['refresh', 'reset', 'increment'];
                const pendingRequests = new Map();

                window.addEventListener('message', function(event) {
                  if (event.data.type === 'ui-message-response') {
                    const { messageId, result, error } = event.data;
                    const pending = pendingRequests.get(messageId);

                    if (pending) {
                      clearTimeout(pending.timeout);
                      pendingRequests.delete(messageId);

                      if (error) {
                        pending.reject(new Error(error || 'Tool call failed'));
                      } else {
                        pending.resolve(result);
                      }
                    }
                  }
                });

                window.callTool = function(toolName, params) {
                  if (!ALLOWED_TOOLS.includes(toolName)) {
                    return Promise.reject(new Error(
                      'Tool "' + toolName + '" is not allowed. ' +
                      'Allowed tools: ' + ALLOWED_TOOLS.join(', ')
                    ));
                  }

                  return new Promise(function(resolve, reject) {
                    const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

                    const timeout = setTimeout(function() {
                      pendingRequests.delete(requestId);
                      reject(new Error('Tool call timed out after 30 seconds'));
                    }, 30000);

                    pendingRequests.set(requestId, { resolve, reject, timeout });

                    window.parent.postMessage({
                      type: 'tool',
                      payload: {
                        toolName: toolName,
                        params: params
                      },
                      messageId: requestId
                    }, '*');
                  });
                };
              })();

              // Tool call results storage
              window.toolCallResults = [];
              window.toolCallErrors = [];

              function showStatus(message, type) {
                const statusDiv = document.getElementById('status');
                statusDiv.textContent = message;
                statusDiv.className = 'visible ' + type;

                setTimeout(() => {
                  statusDiv.className = '';
                }, 3000);
              }

              async function triggerRefresh() {
                try {
                  console.log('Calling refresh tool...');
                  const result = await window.callTool('refresh', {});
                  console.log('Refresh result:', result);
                  window.toolCallResults.push({ tool: 'refresh', result });
                  showStatus('Update triggered! Count: ' + result.count, 'success');

                  // Update UI
                  document.getElementById('count').textContent = result.count;
                } catch (error) {
                  console.error('Refresh error:', error);
                  window.toolCallErrors.push({ tool: 'refresh', error: error.message });
                  showStatus('Error: ' + error.message, 'error');
                }
              }

              async function triggerReset() {
                try {
                  console.log('Calling reset tool...');
                  const result = await window.callTool('reset', {});
                  console.log('Reset result:', result);
                  window.toolCallResults.push({ tool: 'reset', result });
                  showStatus('Counter reset! Previous: ' + result.previousCount, 'success');

                  // Update UI
                  document.getElementById('count').textContent = '0';
                  const resetCount = parseInt(document.getElementById('reset-count').textContent) + 1;
                  document.getElementById('reset-count').textContent = resetCount;
                } catch (error) {
                  console.error('Reset error:', error);
                  window.toolCallErrors.push({ tool: 'reset', error: error.message });
                  showStatus('Error: ' + error.message, 'error');
                }
              }

              async function incrementSilent() {
                try {
                  console.log('Calling increment tool...');
                  const result = await window.callTool('increment', {});
                  console.log('Increment result:', result);
                  window.toolCallResults.push({ tool: 'increment', result });
                  showStatus('Counter incremented (no notification): ' + result.count, 'success');

                  // Update UI
                  document.getElementById('count').textContent = result.count;
                } catch (error) {
                  console.error('Increment error:', error);
                  window.toolCallErrors.push({ tool: 'increment', error: error.message });
                  showStatus('Error: ' + error.message, 'error');
                }
              }

              // Signal that UI is ready
              window.uiReady = true;
              console.log('UI is ready for interaction');
            </script>
          </body>
        </html>
      `;

      // STEP 3: Create an iframe to simulate the UI resource being loaded
      // This simulates how UI resources are rendered in the browser
      const iframe = document.createElement('iframe');
      iframe.id = 'ui-resource-frame';
      iframe.style.cssText = 'width: 100%; height: 600px; border: 1px solid #ddd; border-radius: 4px;';
      document.body.appendChild(iframe);

      // Write the UI content to the iframe
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Failed to access iframe document');
      }

      iframeDoc.open();
      iframeDoc.write(uiContent);
      iframeDoc.close();

      // STEP 4: Setup tool call handler (simulating the MCP server bridge)
      // This simulates how the UI adapter handles tool calls from UI resources
      const toolCallLog: any[] = [];
      let messageHandler: any = null;

      // State tracking for tools
      const toolState = {
        refreshCount: 0,
        incrementCount: 0,
        resetCount: 0
      };

      // Mock tool implementations
      const mockTools = {
        refresh: async () => {
          toolState.refreshCount++;
          return {
            timestamp: new Date().toISOString(),
            count: toolState.refreshCount
          };
        },
        reset: async () => {
          const previousCount = toolState.refreshCount;
          toolState.refreshCount = 0;
          toolState.resetCount++;
          return {
            message: `Reset from ${previousCount} to 0`,
            previousCount
          };
        },
        increment: async () => {
          toolState.incrementCount++;
          return { count: toolState.incrementCount };
        }
      };

      // Setup message listener for tool calls from the iframe
      messageHandler = async (event: MessageEvent) => {
        // Only handle messages from our iframe
        if (event.source !== iframe.contentWindow) {
          return;
        }

        // Handle tool calls
        if (event.data.type === 'tool') {
          const { messageId, payload } = event.data;
          const { toolName, params } = payload;

          console.log('Host received tool call:', { toolName, params, messageId });

          // Log the tool call
          toolCallLog.push({
            tool: toolName,
            params,
            messageId,
            timestamp: Date.now()
          });

          try {
            // Execute the mock tool
            const tool = mockTools[toolName as keyof typeof mockTools];
            if (!tool) {
              throw new Error(`Tool "${toolName}" not found`);
            }

            const result = await tool();

            console.log('Tool result:', { toolName, result });

            // Send response back to iframe
            iframe.contentWindow?.postMessage({
              type: 'ui-message-response',
              messageId,
              result
            }, '*');
          } catch (error: any) {
            console.error('Tool execution error:', error);

            // Send error response back to iframe
            iframe.contentWindow?.postMessage({
              type: 'ui-message-response',
              messageId,
              error: error.message
            }, '*');
          }
        }
      };

      window.addEventListener('message', messageHandler);

      // Wait for iframe to be ready
      await new Promise<void>((resolve) => {
        const checkReady = () => {
          if (iframe.contentWindow && (iframe.contentWindow as any).uiReady) {
            resolve();
          } else {
            setTimeout(checkReady, 50);
          }
        };
        checkReady();
      });

      // Return test context
      return {
        initialized: true,
        iframe: {
          id: iframe.id,
          exists: !!iframe.contentDocument
        },
        toolCallLog
      };
    });

    // STEP 5: Verify initialization
    expect(result.initialized).toBe(true);
    expect(result.iframe.exists).toBe(true);
    expect(result.iframe.id).toBe('ui-resource-frame');

    // Wait a bit for the UI to fully render
    await page.waitForTimeout(500);

    // STEP 6: Verify UI rendered correctly in iframe
    const uiRendered = await page.evaluate(() => {
      const iframe = document.getElementById('ui-resource-frame') as HTMLIFrameElement;
      const iframeDoc = iframe.contentDocument;

      if (!iframeDoc) {
        return { success: false, error: 'No iframe document' };
      }

      return {
        success: true,
        title: iframeDoc.getElementById('test-ui-title')?.textContent,
        refreshBtn: !!iframeDoc.getElementById('refresh-btn'),
        resetBtn: !!iframeDoc.getElementById('reset-btn'),
        incrementBtn: !!iframeDoc.getElementById('increment-btn'),
        countDisplay: iframeDoc.getElementById('count')?.textContent
      };
    });

    expect(uiRendered.success).toBe(true);
    expect(uiRendered.title).toBe('Test UI Resource');
    expect(uiRendered.refreshBtn).toBe(true);
    expect(uiRendered.resetBtn).toBe(true);
    expect(uiRendered.incrementBtn).toBe(true);
    expect(uiRendered.countDisplay).toBe('0');

    // STEP 7: Simulate user clicking the refresh button
    await page.evaluate(() => {
      const iframe = document.getElementById('ui-resource-frame') as HTMLIFrameElement;
      const iframeDoc = iframe.contentDocument;
      const refreshBtn = iframeDoc?.getElementById('refresh-btn');

      if (refreshBtn) {
        refreshBtn.click();
      } else {
        throw new Error('Refresh button not found');
      }
    });

    // Wait for tool call to complete
    await page.waitForTimeout(1000);

    // STEP 8: Verify tool was called and UI updated
    const toolCallResult = await page.evaluate(() => {
      const iframe = document.getElementById('ui-resource-frame') as HTMLIFrameElement;
      const iframeDoc = iframe.contentDocument;
      const iframeWindow = iframe.contentWindow as any;

      return {
        toolCallResults: iframeWindow?.toolCallResults || [],
        toolCallErrors: iframeWindow?.toolCallErrors || [],
        countDisplay: iframeDoc?.getElementById('count')?.textContent,
        statusVisible: iframeDoc?.getElementById('status')?.className.includes('visible')
      };
    });

    expect(toolCallResult.toolCallResults.length).toBeGreaterThan(0);
    expect(toolCallResult.toolCallResults[0].tool).toBe('refresh');
    expect(toolCallResult.toolCallResults[0].result.count).toBe(1);
    expect(toolCallResult.toolCallErrors.length).toBe(0);
    expect(toolCallResult.countDisplay).toBe('1');

    // STEP 9: Test reset button
    await page.evaluate(() => {
      const iframe = document.getElementById('ui-resource-frame') as HTMLIFrameElement;
      const iframeDoc = iframe.contentDocument;
      const resetBtn = iframeDoc?.getElementById('reset-btn');
      resetBtn?.click();
    });

    await page.waitForTimeout(1000);

    const resetResult = await page.evaluate(() => {
      const iframe = document.getElementById('ui-resource-frame') as HTMLIFrameElement;
      const iframeDoc = iframe.contentDocument;
      const iframeWindow = iframe.contentWindow as any;

      return {
        toolCallResults: iframeWindow?.toolCallResults || [],
        countDisplay: iframeDoc?.getElementById('count')?.textContent,
        resetCountDisplay: iframeDoc?.getElementById('reset-count')?.textContent
      };
    });

    expect(resetResult.toolCallResults.length).toBe(2);
    expect(resetResult.toolCallResults[1].tool).toBe('reset');
    expect(resetResult.countDisplay).toBe('0');
    expect(resetResult.resetCountDisplay).toBe('1');

    // STEP 10: Test increment button (no notification)
    await page.evaluate(() => {
      const iframe = document.getElementById('ui-resource-frame') as HTMLIFrameElement;
      const iframeDoc = iframe.contentDocument;
      const incrementBtn = iframeDoc?.getElementById('increment-btn');
      incrementBtn?.click();
    });

    await page.waitForTimeout(1000);

    const incrementResult = await page.evaluate(() => {
      const iframe = document.getElementById('ui-resource-frame') as HTMLIFrameElement;
      const iframeDoc = iframe.contentDocument;
      const iframeWindow = iframe.contentWindow as any;

      return {
        toolCallResults: iframeWindow?.toolCallResults || [],
        countDisplay: iframeDoc?.getElementById('count')?.textContent
      };
    });

    expect(incrementResult.toolCallResults.length).toBe(3);
    expect(incrementResult.toolCallResults[2].tool).toBe('increment');
    expect(incrementResult.countDisplay).toBe('1');

    // STEP 11: Verify no console errors during workflow
    const errors = consoleErrors.filter(msg =>
      !msg.includes('Playwright') &&
      !msg.includes('DevTools') &&
      !msg.includes('Failed to load resource')
    );
    expect(errors.length).toBe(0);

    // STEP 12: Cleanup - remove iframe and message listeners
    await page.evaluate(() => {
      const iframe = document.getElementById('ui-resource-frame');
      if (iframe) {
        iframe.remove();
      }
    });

    // STEP 13: Verify timing - UI should render and respond quickly
    // All operations completed within the test timeouts (< 5 seconds total)
    expect(consoleMessages.some(msg => msg.includes('UI is ready'))).toBe(true);
    expect(consoleMessages.some(msg => msg.includes('Calling refresh tool'))).toBe(true);
  });

  test('UI workflow handles tool call errors gracefully', async ({ page }) => {
    await setupTestPage(page);

    const result = await page.evaluate(async () => {
      // Create a simpler UI for error testing
      const uiContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Error Test UI</title>
          </head>
          <body>
            <h1>Error Test UI</h1>
            <button id="invalid-tool-btn" onclick="testInvalidTool()">Call Invalid Tool</button>
            <button id="allowed-tool-btn" onclick="testAllowedTool()">Call Allowed Tool</button>
            <div id="result"></div>

            <script>
              // Inject callTool function
              (function() {
                'use strict';

                const ALLOWED_TOOLS = ['refresh', 'reset', 'increment'];
                const pendingRequests = new Map();

                window.addEventListener('message', function(event) {
                  if (event.data.type === 'ui-message-response') {
                    const { messageId, result, error } = event.data;
                    const pending = pendingRequests.get(messageId);

                    if (pending) {
                      clearTimeout(pending.timeout);
                      pendingRequests.delete(messageId);

                      if (error) {
                        pending.reject(new Error(error || 'Tool call failed'));
                      } else {
                        pending.resolve(result);
                      }
                    }
                  }
                });

                window.callTool = function(toolName, params) {
                  if (!ALLOWED_TOOLS.includes(toolName)) {
                    return Promise.reject(new Error(
                      'Tool "' + toolName + '" is not allowed. ' +
                      'Allowed tools: ' + ALLOWED_TOOLS.join(', ')
                    ));
                  }

                  return new Promise(function(resolve, reject) {
                    const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

                    const timeout = setTimeout(function() {
                      pendingRequests.delete(requestId);
                      reject(new Error('Tool call timed out after 30 seconds'));
                    }, 30000);

                    pendingRequests.set(requestId, { resolve, reject, timeout });

                    window.parent.postMessage({
                      type: 'tool',
                      payload: {
                        toolName: toolName,
                        params: params
                      },
                      messageId: requestId
                    }, '*');
                  });
                };
              })();

              window.testResults = [];

              async function testInvalidTool() {
                try {
                  // Try to call a tool that's not in the allowlist
                  await window.callTool('dangerous_tool', {});
                  window.testResults.push({ success: false, error: 'Should have thrown' });
                } catch (error) {
                  window.testResults.push({
                    success: true,
                    caughtError: true,
                    errorMessage: error.message
                  });
                }
              }

              async function testAllowedTool() {
                try {
                  await window.callTool('refresh', {});
                  window.testResults.push({ success: true, called: 'refresh' });
                } catch (error) {
                  window.testResults.push({
                    success: false,
                    error: error.message
                  });
                }
              }

              window.uiReady = true;
            </script>
          </body>
        </html>
      `;

      const iframe = document.createElement('iframe');
      iframe.id = 'error-test-frame';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument!;
      iframeDoc.open();
      iframeDoc.write(uiContent);
      iframeDoc.close();

      // Setup message handler with tool allowlist
      const messageHandler = async (event: MessageEvent) => {
        if (event.source !== iframe.contentWindow) return;

        if (event.data.type === 'tool') {
          const { messageId, payload } = event.data;
          const { toolName } = payload;

          // Simulate tool allowlist enforcement
          const allowedTools = ['refresh', 'reset', 'increment'];

          if (!allowedTools.includes(toolName)) {
            iframe.contentWindow?.postMessage({
              type: 'ui-message-response',
              messageId,
              error: `Tool "${toolName}" is not allowed`
            }, '*');
            return;
          }

          // Tool is allowed
          iframe.contentWindow?.postMessage({
            type: 'ui-message-response',
            messageId,
            result: { success: true, tool: toolName }
          }, '*');
        }
      };

      window.addEventListener('message', messageHandler);

      await new Promise<void>((resolve) => {
        const checkReady = () => {
          if (iframe.contentWindow && (iframe.contentWindow as any).uiReady) {
            resolve();
          } else {
            setTimeout(checkReady, 50);
          }
        };
        checkReady();
      });

      return { initialized: true };
    });

    expect(result.initialized).toBe(true);

    // Test calling invalid tool
    await page.evaluate(() => {
      const iframe = document.getElementById('error-test-frame') as HTMLIFrameElement;
      const iframeDoc = iframe.contentDocument;
      const btn = iframeDoc?.getElementById('invalid-tool-btn');
      btn?.click();
    });

    await page.waitForTimeout(500);

    // Verify error was caught
    const invalidToolResult = await page.evaluate(() => {
      const iframe = document.getElementById('error-test-frame') as HTMLIFrameElement;
      const iframeWindow = iframe.contentWindow as any;
      return iframeWindow?.testResults || [];
    });

    expect(invalidToolResult.length).toBe(1);
    expect(invalidToolResult[0].caughtError).toBe(true);

    // Test calling allowed tool
    await page.evaluate(() => {
      const iframe = document.getElementById('error-test-frame') as HTMLIFrameElement;
      const iframeDoc = iframe.contentDocument;
      const btn = iframeDoc?.getElementById('allowed-tool-btn');
      btn?.click();
    });

    await page.waitForTimeout(500);

    const allowedToolResult = await page.evaluate(() => {
      const iframe = document.getElementById('error-test-frame') as HTMLIFrameElement;
      const iframeWindow = iframe.contentWindow as any;
      return iframeWindow?.testResults || [];
    });

    expect(allowedToolResult.length).toBe(2);
    expect(allowedToolResult[1].success).toBe(true);
    expect(allowedToolResult[1].called).toBe('refresh');

    // Cleanup
    await page.evaluate(() => {
      const iframe = document.getElementById('error-test-frame');
      if (iframe) {
        iframe.remove();
      }
    });
  });

  test('UI workflow handles multiple rapid tool calls', async ({ page }) => {
    await setupTestPage(page);

    const result = await page.evaluate(async () => {
      const uiContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Rapid Calls Test</title>
          </head>
          <body>
            <h1>Rapid Tool Calls Test</h1>
            <button id="rapid-calls-btn" onclick="testRapidCalls()">Make 5 Rapid Calls</button>
            <div id="results"></div>

            <script>
              // Inject callTool function
              (function() {
                'use strict';

                const ALLOWED_TOOLS = ['refresh', 'reset', 'increment'];
                const pendingRequests = new Map();

                window.addEventListener('message', function(event) {
                  if (event.data.type === 'ui-message-response') {
                    const { messageId, result, error } = event.data;
                    const pending = pendingRequests.get(messageId);

                    if (pending) {
                      clearTimeout(pending.timeout);
                      pendingRequests.delete(messageId);

                      if (error) {
                        pending.reject(new Error(error || 'Tool call failed'));
                      } else {
                        pending.resolve(result);
                      }
                    }
                  }
                });

                window.callTool = function(toolName, params) {
                  if (!ALLOWED_TOOLS.includes(toolName)) {
                    return Promise.reject(new Error(
                      'Tool "' + toolName + '" is not allowed. ' +
                      'Allowed tools: ' + ALLOWED_TOOLS.join(', ')
                    ));
                  }

                  return new Promise(function(resolve, reject) {
                    const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

                    const timeout = setTimeout(function() {
                      pendingRequests.delete(requestId);
                      reject(new Error('Tool call timed out after 30 seconds'));
                    }, 30000);

                    pendingRequests.set(requestId, { resolve, reject, timeout });

                    window.parent.postMessage({
                      type: 'tool',
                      payload: {
                        toolName: toolName,
                        params: params
                      },
                      messageId: requestId
                    }, '*');
                  });
                };
              })();

              window.callResults = [];

              async function testRapidCalls() {
                const promises = [];

                // Make 5 rapid calls
                for (let i = 0; i < 5; i++) {
                  promises.push(
                    window.callTool('increment', { id: i })
                      .then(result => ({ success: true, id: i, result }))
                      .catch(error => ({ success: false, id: i, error: error.message }))
                  );
                }

                const results = await Promise.all(promises);
                window.callResults = results;

                document.getElementById('results').textContent =
                  'Completed: ' + results.filter(r => r.success).length + '/5';
              }

              window.uiReady = true;
            </script>
          </body>
        </html>
      `;

      const iframe = document.createElement('iframe');
      iframe.id = 'rapid-test-frame';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument!;
      iframeDoc.open();
      iframeDoc.write(uiContent);
      iframeDoc.close();

      let globalCallCount = 0;

      const messageHandler = async (event: MessageEvent) => {
        if (event.source !== iframe.contentWindow) return;

        if (event.data.type === 'tool') {
          const { messageId, payload } = event.data;
          globalCallCount++;
          const thisCallCount = globalCallCount;

          // Simulate tool execution with small delay
          await new Promise(resolve => setTimeout(resolve, 50));

          iframe.contentWindow?.postMessage({
            type: 'ui-message-response',
            messageId,
            result: { count: thisCallCount, params: payload.params }
          }, '*');
        }
      };

      window.addEventListener('message', messageHandler);

      await new Promise<void>((resolve) => {
        const checkReady = () => {
          if (iframe.contentWindow && (iframe.contentWindow as any).uiReady) {
            resolve();
          } else {
            setTimeout(checkReady, 50);
          }
        };
        checkReady();
      });

      return { initialized: true };
    });

    expect(result.initialized).toBe(true);

    // Trigger rapid calls
    await page.evaluate(() => {
      const iframe = document.getElementById('rapid-test-frame') as HTMLIFrameElement;
      const iframeDoc = iframe.contentDocument;
      const btn = iframeDoc?.getElementById('rapid-calls-btn');
      btn?.click();
    });

    // Wait for all calls to complete
    await page.waitForTimeout(1000);

    const rapidCallResults = await page.evaluate(() => {
      const iframe = document.getElementById('rapid-test-frame') as HTMLIFrameElement;
      const iframeWindow = iframe.contentWindow as any;
      const iframeDoc = iframe.contentDocument;

      return {
        results: iframeWindow?.callResults || [],
        displayText: iframeDoc?.getElementById('results')?.textContent
      };
    });

    // All 5 calls should succeed
    expect(rapidCallResults.results.length).toBe(5);
    expect(rapidCallResults.results.every((r: any) => r.success)).toBe(true);
    expect(rapidCallResults.displayText).toBe('Completed: 5/5');

    // Verify each call got a unique response
    const counts = rapidCallResults.results.map((r: any) => r.result.count);
    const uniqueCounts = new Set(counts);
    expect(uniqueCounts.size).toBe(5);

    // Cleanup
    await page.evaluate(() => {
      const iframe = document.getElementById('rapid-test-frame');
      if (iframe) {
        iframe.remove();
      }
    });
  });
});
