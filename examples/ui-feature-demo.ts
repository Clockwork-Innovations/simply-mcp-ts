/**
 * Feature Layer Demo - Interactive UI with Callbacks
 *
 * This example demonstrates the Feature Layer (Layer 2) of MCP-UI support.
 * It shows how to create interactive UIs with postMessage callbacks and external URL embedding.
 *
 * Features demonstrated:
 * - Interactive forms with postMessage callbacks
 * - Tool execution from UI actions
 * - External URL iframe embedding
 * - Multiple action types (tool, notify, link)
 * - Form validation and submission
 *
 * To run this example:
 *   npm run build
 *   node dist/examples/ui-feature-demo.js
 */

import { BuildMCPServer } from '../src/api/programmatic/index.js';
import { createExternalURLResource } from '../src/core/ui-resource.js';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'ui-feature-demo',
  version: '1.0.0',
  description: 'Feature Layer: Interactive UI with postMessage callbacks',
});

// Track submitted data for demo purposes
const submissions: Array<{
  name: string;
  email: string;
  feedback: string;
  timestamp: Date;
}> = [];

/**
 * Example 1: Interactive Feedback Form with postMessage
 *
 * This demonstrates Layer 2's postMessage callback system.
 * The form submits data via postMessage which triggers a tool call.
 */
server.addUIResource(
  'ui://feedback-form/v1',
  'Interactive Feedback Form',
  'Feedback form with postMessage callbacks for tool execution',
  'text/html',
  `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .form-container {
          max-width: 500px;
          margin: 0 auto;
          background: white;
          padding: 32px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        h2 {
          margin-top: 0;
          margin-bottom: 8px;
          font-size: 24px;
          font-weight: 700;
          color: #333;
        }
        .subtitle {
          margin: 0 0 24px 0;
          font-size: 14px;
          color: #666;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          font-size: 14px;
          color: #333;
        }
        input[type="text"],
        input[type="email"],
        textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-family: inherit;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        input[type="text"]:focus,
        input[type="email"]:focus,
        textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        textarea {
          resize: vertical;
          min-height: 120px;
        }
        .button-group {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }
        button {
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-submit {
          background: #667eea;
          color: white;
        }
        .btn-submit:hover {
          background: #5568d3;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .btn-submit:active {
          transform: translateY(0);
        }
        .btn-reset {
          background: #f0f0f0;
          color: #666;
        }
        .btn-reset:hover {
          background: #e0e0e0;
        }
        .status {
          margin-top: 20px;
          padding: 16px;
          border-radius: 8px;
          font-size: 14px;
          display: none;
          animation: slideDown 0.3s ease-out;
        }
        .status.success {
          display: block;
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        .status.error {
          display: block;
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        .badge {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      </style>
    </head>
    <body>
      <div class="form-container">
        <span class="badge">Layer 2 - Interactive</span>
        <h2>Send Feedback</h2>
        <p class="subtitle">Share your thoughts with us via postMessage callback</p>

        <form id="feedbackForm">
          <div class="form-group">
            <label for="name">Name *</label>
            <input type="text" id="name" name="name" required placeholder="Enter your name">
          </div>

          <div class="form-group">
            <label for="email">Email *</label>
            <input type="email" id="email" name="email" required placeholder="your@email.com">
          </div>

          <div class="form-group">
            <label for="feedback">Feedback *</label>
            <textarea id="feedback" name="feedback" required placeholder="Tell us what you think..."></textarea>
          </div>

          <div class="button-group">
            <button type="submit" class="btn-submit">Submit Feedback</button>
            <button type="reset" class="btn-reset">Clear</button>
          </div>

          <div id="status" class="status"></div>
        </form>
      </div>

      <script>
        const form = document.getElementById('feedbackForm');
        const statusDiv = document.getElementById('status');

        form.addEventListener('submit', function(event) {
          event.preventDefault();

          // Get form data
          const name = document.getElementById('name').value;
          const email = document.getElementById('email').value;
          const feedback = document.getElementById('feedback').value;

          // Validate
          if (!name || !email || !feedback) {
            showStatus('Please fill in all required fields', 'error');
            return;
          }

          // Send tool call via postMessage to parent
          // This is Layer 2's key feature: UI can trigger MCP tool execution
          window.parent.postMessage({
            type: 'tool',
            payload: {
              toolName: 'submit_feedback',
              params: {
                name: name,
                email: email,
                feedback: feedback
              }
            }
          }, '*');

          // Show success message
          showStatus('✓ Feedback submitted successfully! Thank you.', 'success');

          // Reset form after short delay
          setTimeout(() => {
            form.reset();
          }, 1000);
        });

        function showStatus(message, type) {
          statusDiv.textContent = message;
          statusDiv.className = 'status ' + type;

          // Auto-hide after 5 seconds
          setTimeout(() => {
            statusDiv.className = 'status';
          }, 5000);
        }

        // Example: Send notification on page load
        window.addEventListener('load', function() {
          window.parent.postMessage({
            type: 'notify',
            payload: {
              level: 'info',
              message: 'Feedback form loaded and ready'
            }
          }, '*');
        });
      </script>
    </body>
    </html>
  `
);

/**
 * Example 2: Multi-Action Interactive UI
 *
 * This demonstrates multiple action types:
 * - tool: Execute MCP tools
 * - notify: Show notifications
 * - link: Navigate to URLs
 */
server.addUIResource(
  'ui://action-demo/v1',
  'Action Demo',
  'Demonstrates multiple postMessage action types',
  'text/html',
  `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 24px;
          background: linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%);
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          padding: 32px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        }
        h2 {
          margin-top: 0;
          margin-bottom: 8px;
          font-size: 24px;
          font-weight: 700;
          color: #333;
        }
        .subtitle {
          margin: 0 0 24px 0;
          font-size: 14px;
          color: #666;
        }
        .action-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }
        .action-btn {
          padding: 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }
        .action-btn:hover {
          border-color: #667eea;
          background: #f8f9ff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .action-btn:active {
          transform: translateY(0);
        }
        .action-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }
        .action-label {
          font-weight: 600;
          font-size: 14px;
          color: #333;
        }
        .action-desc {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }
        .badge {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 16px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <span class="badge">Layer 2 - Interactive</span>
        <h2>Action Type Demo</h2>
        <p class="subtitle">Click buttons to trigger different postMessage action types</p>

        <div class="action-grid">
          <div class="action-btn" onclick="triggerToolCall()">
            <div class="action-icon">🔧</div>
            <div class="action-label">Tool Call</div>
            <div class="action-desc">Execute MCP tool</div>
          </div>

          <div class="action-btn" onclick="triggerNotify()">
            <div class="action-icon">🔔</div>
            <div class="action-label">Notify</div>
            <div class="action-desc">Show notification</div>
          </div>

          <div class="action-btn" onclick="triggerLink()">
            <div class="action-icon">🔗</div>
            <div class="action-label">Link</div>
            <div class="action-desc">Navigate to URL</div>
          </div>

          <div class="action-btn" onclick="triggerData()">
            <div class="action-icon">📊</div>
            <div class="action-label">Get Data</div>
            <div class="action-desc">Fetch statistics</div>
          </div>
        </div>
      </div>

      <script>
        function triggerToolCall() {
          window.parent.postMessage({
            type: 'tool',
            payload: {
              toolName: 'get_server_time',
              params: {}
            }
          }, '*');
        }

        function triggerNotify() {
          window.parent.postMessage({
            type: 'notify',
            payload: {
              level: 'success',
              message: 'This is a notification from the UI!'
            }
          }, '*');
        }

        function triggerLink() {
          window.parent.postMessage({
            type: 'link',
            payload: {
              url: 'https://github.com/modelcontextprotocol',
              target: '_blank'
            }
          }, '*');
        }

        function triggerData() {
          window.parent.postMessage({
            type: 'tool',
            payload: {
              toolName: 'get_feedback_history',
              params: {}
            }
          }, '*');
        }
      </script>
    </body>
    </html>
  `
);

/**
 * Tool that receives form submissions
 */
server.addTool({
  name: 'submit_feedback',
  description: 'Submit feedback from the interactive form',
  parameters: z.object({
    name: z.string().describe('User name'),
    email: z.string().email().describe('User email address'),
    feedback: z.string().describe('User feedback text'),
  }),
  execute: async (args) => {
    // Store submission
    submissions.push({
      name: args.name,
      email: args.email,
      feedback: args.feedback,
      timestamp: new Date(),
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'success',
            message: `Thank you ${args.name}! Your feedback has been recorded.`,
            submissionId: submissions.length,
            totalSubmissions: submissions.length,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  },
});

/**
 * Tool to get feedback history
 */
server.addTool({
  name: 'get_feedback_history',
  description: 'Get all submitted feedback entries',
  parameters: z.object({}),
  execute: async () => {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            totalSubmissions: submissions.length,
            submissions: submissions.map((s, index) => ({
              id: index + 1,
              name: s.name,
              email: s.email,
              feedback: s.feedback,
              timestamp: s.timestamp.toISOString(),
            })),
            message:
              submissions.length === 0
                ? 'No feedback submitted yet'
                : `Retrieved ${submissions.length} feedback ${submissions.length === 1 ? 'entry' : 'entries'}`,
          }, null, 2),
        },
      ],
    };
  },
});

/**
 * Tool that returns current server time (for demo)
 */
server.addTool({
  name: 'get_server_time',
  description: 'Get current server timestamp',
  parameters: z.object({}),
  execute: async () => {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            timestamp: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            message: 'Current server time retrieved successfully',
          }, null, 2),
        },
      ],
    };
  },
});

/**
 * Tool that demonstrates external URL resource creation
 */
server.addTool({
  name: 'show_external_dashboard',
  description: 'Display an external URL in an iframe (Layer 2 feature)',
  parameters: z.object({
    url: z
      .string()
      .url()
      .optional()
      .describe('External HTTPS URL to display (defaults to example.com)'),
  }),
  execute: async (args) => {
    // In production, this would use a real dashboard URL
    // For demo purposes, we use example.com
    const url = args.url || 'https://example.com';

    try {
      const resource = createExternalURLResource(
        'ui://dashboard/external',
        url
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: `External URL resource created: ${url}`,
              resource: resource.resource,
              note: 'External URLs must be HTTPS or localhost for security',
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to create external URL resource',
              message: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  },
});

/**
 * Tool that provides information about Layer 2 features
 */
server.addTool({
  name: 'get_feature_layer_info',
  description: 'Get information about Feature Layer (Layer 2) capabilities',
  parameters: z.object({}),
  execute: async () => {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            layer: 'Feature Layer (Layer 2)',
            features: [
              'Interactive forms with postMessage callbacks',
              'Tool execution from UI actions',
              'External URL iframe embedding',
              'Multiple action types (tool, notify, link, prompt, intent)',
              'Origin validation for security',
              'Form validation and submission',
            ],
            actionTypes: [
              {
                type: 'tool',
                description: 'Execute an MCP tool',
                example: "{ type: 'tool', payload: { toolName: 'submit_feedback', params: {...} } }",
              },
              {
                type: 'notify',
                description: 'Show a notification',
                example:
                  "{ type: 'notify', payload: { level: 'success', message: 'Done!' } }",
              },
              {
                type: 'link',
                description: 'Navigate to a URL',
                example:
                  "{ type: 'link', payload: { url: 'https://example.com', target: '_blank' } }",
              },
              {
                type: 'prompt',
                description: 'Trigger an MCP prompt',
                example: "{ type: 'prompt', payload: { promptName: 'create_task', arguments: {...} } }",
              },
              {
                type: 'intent',
                description: 'Platform-specific intent',
                example: "{ type: 'intent', payload: { intentName: 'share', data: {...} } }",
              },
            ],
            availableResources: [
              'ui://feedback-form/v1 - Interactive feedback form',
              'ui://action-demo/v1 - Multi-action demo',
            ],
            security: [
              'Origin validation on all postMessage events',
              'HTTPS required for external URLs (except localhost)',
              'Sandboxed iframes with restricted permissions',
              'No eval or dynamic code execution',
            ],
            nextLayer: 'Remote DOM Layer (Layer 3) - Web Worker sandbox and React-like components',
          }, null, 2),
        },
      ],
    };
  },
});

// Start the server
await server.start();
