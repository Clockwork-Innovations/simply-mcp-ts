/**
 * PostMessage Actions Demo
 *
 * Demonstrates the postMessage protocol in action with live message logging
 * and action response display. Shows all supported action types.
 *
 * Layer 2 Phase 1: Interactive demo for postMessage communication.
 */

'use client';

import { useState } from 'react';

interface LogEntry {
  timestamp: string;
  type: string;
  data: any;
  direction: 'sent' | 'received';
}

export default function ActionsDemo() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [lastResponse, setLastResponse] = useState<any>(null);

  const addLogEntry = (type: string, data: any, direction: 'sent' | 'received') => {
    setLog((prev) => [
      ...prev,
      {
        timestamp: new Date().toISOString(),
        type,
        data,
        direction,
      },
    ]);
  };

  const clearLog = () => {
    setLog([]);
    setLastResponse(null);
  };

  // Demo resource with interactive buttons for each action type
  const demoResource = {
    uri: 'ui://demo/actions',
    mimeType: 'text/html',
    text: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PostMessage Actions Demo</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      padding: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #1a202c;
    }

    .subtitle {
      font-size: 14px;
      color: #718096;
      margin-bottom: 24px;
    }

    .action-section {
      margin-bottom: 24px;
    }

    .action-title {
      font-size: 16px;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      border-radius: 4px;
      background: #edf2f7;
      color: #4a5568;
    }

    .action-description {
      font-size: 14px;
      color: #718096;
      margin-bottom: 12px;
    }

    button {
      width: 100%;
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      color: white;
    }

    button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    button:active {
      transform: translateY(0);
    }

    .btn-tool {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .btn-notify {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .btn-link {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }

    .btn-prompt {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    }

    .btn-intent {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
    }

    .code-example {
      margin-top: 12px;
      padding: 12px;
      background: #f7fafc;
      border-radius: 6px;
      border-left: 3px solid #667eea;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #2d3748;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>PostMessage Actions</h1>
    <p class="subtitle">Click buttons to send different action types to the host application</p>

    <div class="action-section">
      <div class="action-title">
        <span>Tool Call</span>
        <span class="badge">Tool</span>
      </div>
      <p class="action-description">Execute an MCP tool with parameters</p>
      <button class="btn-tool" onclick="sendToolAction()">
        Execute Tool: submit_feedback
      </button>
      <div class="code-example">
        window.parent.postMessage({
          type: 'tool',
          payload: { toolName: 'submit_feedback', params: {...} }
        }, '*');
      </div>
    </div>

    <div class="action-section">
      <div class="action-title">
        <span>Notification</span>
        <span class="badge">Notify</span>
      </div>
      <p class="action-description">Display a notification with severity level</p>
      <button class="btn-notify" onclick="sendNotifyAction()">
        Show Success Notification
      </button>
      <div class="code-example">
        window.parent.postMessage({
          type: 'notify',
          payload: { level: 'success', message: '...' }
        }, '*');
      </div>
    </div>

    <div class="action-section">
      <div class="action-title">
        <span>Link Navigation</span>
        <span class="badge">Link</span>
      </div>
      <p class="action-description">Navigate to a URL in new tab or current window</p>
      <button class="btn-link" onclick="sendLinkAction()">
        Open Documentation
      </button>
      <div class="code-example">
        window.parent.postMessage({
          type: 'link',
          payload: { url: '...', target: '_blank' }
        }, '*');
      </div>
    </div>

    <div class="action-section">
      <div class="action-title">
        <span>Prompt Dialog</span>
        <span class="badge">Prompt</span>
      </div>
      <p class="action-description">Show a prompt dialog to collect user input</p>
      <button class="btn-prompt" onclick="sendPromptAction()">
        Ask for User Input
      </button>
      <div class="code-example">
        window.parent.postMessage({
          type: 'prompt',
          payload: { text: '...', defaultValue: '...' }
        }, '*');
      </div>
    </div>

    <div class="action-section">
      <div class="action-title">
        <span>Platform Intent</span>
        <span class="badge">Intent</span>
      </div>
      <p class="action-description">Trigger platform-specific intent with data</p>
      <button class="btn-intent" onclick="sendIntentAction()">
        Share Content
      </button>
      <div class="code-example">
        window.parent.postMessage({
          type: 'intent',
          payload: { intent: 'share', data: {...} }
        }, '*');
      </div>
    </div>
  </div>

  <script>
    function sendToolAction() {
      window.parent.postMessage({
        type: 'tool',
        payload: {
          toolName: 'submit_feedback',
          params: {
            name: 'Demo User',
            email: 'demo@example.com',
            feedback: 'This postMessage demo is awesome!',
            rating: 5
          }
        }
      }, '*');
    }

    function sendNotifyAction() {
      window.parent.postMessage({
        type: 'notify',
        payload: {
          level: 'success',
          message: 'PostMessage communication is working perfectly!'
        }
      }, '*');
    }

    function sendLinkAction() {
      window.parent.postMessage({
        type: 'link',
        payload: {
          url: 'https://github.com/modelcontextprotocol',
          target: '_blank'
        }
      }, '*');
    }

    function sendPromptAction() {
      window.parent.postMessage({
        type: 'prompt',
        payload: {
          text: 'What is your favorite feature?',
          defaultValue: 'PostMessage protocol'
        }
      }, '*');
    }

    function sendIntentAction() {
      window.parent.postMessage({
        type: 'intent',
        payload: {
          intent: 'share',
          data: {
            title: 'MCP-UI PostMessage Demo',
            url: 'https://github.com/modelcontextprotocol/mcp-ui',
            text: 'Check out this amazing postMessage demo!'
          }
        }
      }, '*');
    }
  </script>
</body>
</html>
    `,
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
          PostMessage Actions Demo
        </h1>
        <p style={{ fontSize: '16px', color: '#718096' }}>
          Layer 2 Phase 1: Interactive demonstration of the postMessage protocol with live action logging and response display.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Demo Resource Display */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Interactive Demo</h2>
            <button
              onClick={clearLog}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '600',
                borderRadius: '6px',
                border: 'none',
                background: '#e53e3e',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Clear Log
            </button>
          </div>

          <iframe
            sandbox="allow-scripts"
            srcDoc={demoResource.text}
            style={{
              width: '100%',
              height: '700px',
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
            title="PostMessage Actions Demo"
            onLoad={() => {
              // Set up message listener
              const handleMessage = (event: MessageEvent) => {
                if (event.origin !== 'null') return;

                addLogEntry(event.data.type, event.data, 'received');

                // Simulate action processing
                setTimeout(() => {
                  const response = {
                    success: true,
                    type: event.data.type,
                    data: {
                      ...event.data.payload,
                      processedAt: new Date().toISOString(),
                    },
                  };
                  setLastResponse(response);
                  addLogEntry('response', response, 'sent');
                }, 300);
              };

              window.addEventListener('message', handleMessage);
              return () => window.removeEventListener('message', handleMessage);
            }}
          />
        </div>

        {/* Action Log */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
            Action Log ({log.length} messages)
          </h2>
          <div
            style={{
              background: '#1a202c',
              borderRadius: '8px',
              padding: '16px',
              maxHeight: '400px',
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '13px',
            }}
          >
            {log.length === 0 ? (
              <div style={{ color: '#718096', textAlign: 'center', padding: '24px' }}>
                No messages yet. Click a button in the demo above to send an action.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {log.map((entry, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px',
                      background: entry.direction === 'received' ? '#2d3748' : '#4a5568',
                      borderRadius: '6px',
                      borderLeft: `3px solid ${
                        entry.direction === 'received' ? '#48bb78' : '#4299e1'
                      }`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                      }}
                    >
                      <span
                        style={{
                          color: entry.direction === 'received' ? '#48bb78' : '#4299e1',
                          fontWeight: '600',
                        }}
                      >
                        {entry.direction === 'received' ? '← RECEIVED' : '→ SENT'}
                      </span>
                      <span style={{ color: '#a0aec0', fontSize: '11px' }}>
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ color: '#e2e8f0' }}>
                      <div style={{ marginBottom: '4px' }}>
                        <span style={{ color: '#90cdf4' }}>Type:</span> {entry.type}
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <details>
                          <summary style={{ cursor: 'pointer', color: '#90cdf4' }}>
                            View Data
                          </summary>
                          <pre
                            style={{
                              marginTop: '8px',
                              padding: '8px',
                              background: '#1a202c',
                              borderRadius: '4px',
                              overflow: 'auto',
                              fontSize: '11px',
                            }}
                          >
                            {JSON.stringify(entry.data, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Last Response */}
        {lastResponse && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
              Last Response
            </h2>
            <div
              style={{
                background: '#f7fafc',
                borderRadius: '8px',
                padding: '16px',
                border: '2px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: lastResponse.success ? '#48bb78' : '#f56565',
                  }}
                />
                <span style={{ fontWeight: '600' }}>
                  {lastResponse.success ? 'Success' : 'Error'}
                </span>
              </div>
              <pre
                style={{
                  background: 'white',
                  padding: '12px',
                  borderRadius: '6px',
                  overflow: 'auto',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                }}
              >
                {JSON.stringify(lastResponse, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Documentation */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
            PostMessage Protocol
          </h2>
          <div
            style={{
              background: '#edf2f7',
              borderRadius: '8px',
              padding: '20px',
              fontSize: '14px',
              lineHeight: '1.6',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              Message Format
            </h3>
            <p style={{ marginBottom: '16px', color: '#4a5568' }}>
              All postMessage actions follow this structure:
            </p>
            <pre
              style={{
                background: 'white',
                padding: '12px',
                borderRadius: '6px',
                overflow: 'auto',
                fontSize: '13px',
                fontFamily: 'monospace',
              }}
            >
{`{
  type: 'tool' | 'notify' | 'link' | 'prompt' | 'intent',
  payload: {
    // Type-specific fields
  }
}`}
            </pre>

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginTop: '20px', marginBottom: '12px' }}>
              Security
            </h3>
            <ul style={{ marginLeft: '20px', color: '#4a5568' }}>
              <li>Origin validation: HTTPS, localhost, or null (srcdoc)</li>
              <li>Message structure validation before processing</li>
              <li>Parameter sanitization (primitives only)</li>
              <li>Sandboxed iframe execution</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
