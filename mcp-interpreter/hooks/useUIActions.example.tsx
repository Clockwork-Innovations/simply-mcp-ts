/**
 * Example: Using useUIActions Hook
 *
 * This example demonstrates how to integrate useUIActions hook
 * in a React component that renders MCP UI resources.
 */

import { useEffect } from 'react';
import { useUIActions } from './useUIActions';

/**
 * Example component that renders an MCP UI resource in an iframe
 * and handles postMessage actions from the iframe.
 */
export function UIResourceViewer() {
  const { handleUIAction, isProcessing, lastError } = useUIActions();

  useEffect(() => {
    /**
     * Listen for postMessage events from iframe UI resources
     */
    const handleMessage = async (event: MessageEvent) => {
      // Verify message is a UI action
      if (!event.data || event.data.type !== 'MCP_UI_ACTION') {
        return;
      }

      console.log('[UIResourceViewer] Received UI action:', event.data);

      // Process the action
      const result = await handleUIAction(event.data);

      console.log('[UIResourceViewer] Action result:', result);

      // If action has a callback ID, send result back to iframe
      if (event.data.action?.callbackId && event.source) {
        const responseMessage = {
          type: 'TOOL_RESULT',
          callbackId: event.data.action.callbackId,
          result: result.success ? result.data : undefined,
          error: result.success ? undefined : result.error,
        };

        console.log('[UIResourceViewer] Sending result to iframe:', responseMessage);

        // Send response back to iframe
        (event.source as Window).postMessage(responseMessage, '*');
      }

      // Handle errors (could show toast notification)
      if (!result.success) {
        console.error('[UIResourceViewer] Action failed:', result.error);
        // TODO: Show error toast notification
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleUIAction]);

  return (
    <div className="ui-resource-viewer">
      <div className="ui-resource-viewer__header">
        <h2>MCP UI Resource</h2>
        {isProcessing && (
          <div className="ui-resource-viewer__status">
            <span className="spinner" />
            <span>Processing action...</span>
          </div>
        )}
        {lastError && (
          <div className="ui-resource-viewer__error">
            <span className="error-icon">⚠️</span>
            <span>{lastError}</span>
          </div>
        )}
      </div>

      <div className="ui-resource-viewer__content">
        {/*
          Iframe that renders the UI resource.
          The iframe will send MCP_UI_ACTION messages via postMessage.
        */}
        <iframe
          title="MCP UI Resource"
          sandbox="allow-scripts allow-same-origin"
          style={{
            width: '100%',
            height: '600px',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
          // In real usage, this would be the UI resource URL or srcdoc
          srcDoc={`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body {
                  font-family: sans-serif;
                  padding: 20px;
                  background: #f5f5f5;
                }
                button {
                  padding: 10px 20px;
                  margin: 5px;
                  cursor: pointer;
                  border: none;
                  border-radius: 4px;
                  background: #0070f3;
                  color: white;
                  font-size: 14px;
                }
                button:hover {
                  background: #0051cc;
                }
                #result {
                  margin-top: 20px;
                  padding: 15px;
                  background: white;
                  border-radius: 4px;
                  white-space: pre-wrap;
                }
              </style>
            </head>
            <body>
              <h1>Interactive MCP UI Demo</h1>
              <p>This UI can interact with MCP tools via postMessage:</p>

              <button onclick="callTool()">Call Tool</button>
              <button onclick="submitPrompt()">Submit Prompt</button>
              <button onclick="showNotification()">Show Notification</button>
              <button onclick="navigate()">Navigate</button>

              <div id="result"></div>

              <script>
                // Helper to call MCP tools
                async function callMCPTool(toolName, args) {
                  const callbackId = 'call_' + Date.now();

                  return new Promise((resolve, reject) => {
                    // Store callback
                    window.__callbacks = window.__callbacks || {};
                    window.__callbacks[callbackId] = { resolve, reject };

                    // Send action to parent
                    window.parent.postMessage({
                      type: 'MCP_UI_ACTION',
                      action: {
                        type: 'CALL_TOOL',
                        toolName: toolName,
                        args: args,
                        callbackId: callbackId
                      }
                    }, '*');

                    // Timeout after 30 seconds
                    setTimeout(() => {
                      if (window.__callbacks[callbackId]) {
                        delete window.__callbacks[callbackId];
                        reject(new Error('Tool call timeout'));
                      }
                    }, 30000);
                  });
                }

                // Listen for responses
                window.addEventListener('message', (event) => {
                  if (event.data.type === 'TOOL_RESULT') {
                    const cb = window.__callbacks[event.data.callbackId];
                    if (cb) {
                      if (event.data.error) {
                        cb.reject(new Error(event.data.error));
                      } else {
                        cb.resolve(event.data.result);
                      }
                      delete window.__callbacks[event.data.callbackId];
                    }
                  }
                });

                // Example actions
                async function callTool() {
                  const result = document.getElementById('result');
                  result.textContent = 'Calling tool...';

                  try {
                    const data = await callMCPTool('echo', { message: 'Hello from UI!' });
                    result.textContent = 'Tool Result:\\n' + JSON.stringify(data, null, 2);
                  } catch (error) {
                    result.textContent = 'Error: ' + error.message;
                  }
                }

                function submitPrompt() {
                  window.parent.postMessage({
                    type: 'MCP_UI_ACTION',
                    action: {
                      type: 'SUBMIT_PROMPT',
                      prompt: 'What is the weather today?',
                      context: { source: 'demo-ui' }
                    }
                  }, '*');
                  document.getElementById('result').textContent = 'Prompt submitted!';
                }

                function showNotification() {
                  window.parent.postMessage({
                    type: 'MCP_UI_ACTION',
                    action: {
                      type: 'NOTIFY',
                      level: 'info',
                      message: 'This is a notification from the UI',
                      title: 'Demo Notification'
                    }
                  }, '*');
                  document.getElementById('result').textContent = 'Notification sent!';
                }

                function navigate() {
                  window.parent.postMessage({
                    type: 'MCP_UI_ACTION',
                    action: {
                      type: 'NAVIGATE',
                      url: 'https://example.com',
                      target: '_blank'
                    }
                  }, '*');
                  document.getElementById('result').textContent = 'Navigation requested!';
                }
              </script>
            </body>
            </html>
          `}
        />
      </div>
    </div>
  );
}

/**
 * Example: Minimal integration in a component
 */
export function MinimalExample() {
  const { handleUIAction } = useUIActions();

  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.data?.type === 'MCP_UI_ACTION') {
        const result = await handleUIAction(event.data);

        // Send result back if needed
        if (event.data.action?.callbackId && event.source) {
          (event.source as Window).postMessage({
            type: 'TOOL_RESULT',
            callbackId: event.data.action.callbackId,
            result: result.data,
            error: result.error,
          }, '*');
        }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [handleUIAction]);

  return <div>UI Resource Container</div>;
}
