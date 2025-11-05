/**
 * IUI v4.0 Example: UI with MCP Tools
 *
 * Create interactive UIs that can call MCP tools.
 * Perfect for action-oriented interfaces, forms with server actions, etc.
 *
 * This example demonstrates:
 * - Tool definitions using v4 ITool interface with IParam
 * - UI resources that can call tools via window.mcpTools API
 * - Proper separation of interface definitions and implementations
 */

import type { IUI, ITool, IParam, IServer } from '../../src/index.js';

// ============================================================================
// Server Configuration
// ============================================================================

const server: IServer = {
  name: 'tools-ui-server',
  version: '1.0.0',
  description: 'Interactive UI server with tool integration',
};

// ============================================================================
// Parameter Interfaces using IParam (v4 pattern)
// ============================================================================

interface MessageParam extends IParam {
  type: 'string';
  description: 'Notification message to display';
  minLength: 1;
}

interface TypeParam extends IParam {
  type: 'string';
  description: 'Notification type';
  enum: ['info', 'success', 'warning', 'error'];
}

// ============================================================================
// Tool Interfaces
// ============================================================================

/**
 * Notification Tool
 *
 * Simple tool that the UI can call to send notifications.
 * The UI accesses this via window.mcpTools.notify()
 */
interface NotifyTool extends ITool {
  name: 'notify';
  description: 'Send a notification to the user';
  params: {
    message: MessageParam;
    type: TypeParam;
  };
  result: { sent: boolean; timestamp: string };
}

// ============================================================================
// UI Interfaces
// ============================================================================

/**
 * Interactive Dashboard with Tools
 *
 * UI that can call MCP tools for actions
 */
interface InteractiveDashboard extends IUI {
  uri: 'ui://interactive';
  name: 'Interactive Dashboard';
  description: 'Dashboard with tool integration';

  source: `
    <div style="font-family: system-ui; padding: 2rem;">
      <h1>Interactive Dashboard</h1>
      <p style="color: #666; margin-bottom: 2rem;">
        This UI demonstrates calling MCP tools from the client.
      </p>

      <div style="margin: 1rem 0;">
        <button
          onclick="window.mcpTools.notify({ message: 'Hello from UI!', type: 'success' })"
          style="padding: 0.5rem 1rem; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Send Success Notification
        </button>
      </div>

      <div style="margin: 1rem 0;">
        <button
          onclick="window.mcpTools.notify({ message: 'Warning!', type: 'warning' })"
          style="padding: 0.5rem 1rem; background: #ff9900; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Send Warning
        </button>
      </div>

      <div style="margin: 1rem 0;">
        <button
          onclick="window.mcpTools.notify({ message: 'Error occurred', type: 'error' })"
          style="padding: 0.5rem 1rem; background: #cc0000; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Send Error
        </button>
      </div>

      <p style="color: #666; font-size: 0.875rem; margin-top: 2rem;">
        Click buttons to call MCP tools from the UI
      </p>
    </div>
  `;

  // Specify which tools this UI can call (security whitelist)
  tools: ['notify'];
}

/**
 * Form with Server Actions
 *
 * Form that calls tools on submit
 */
interface ActionForm extends IUI {
  uri: 'ui://form-actions';
  name: 'Action Form';
  description: 'Form with server-side actions';

  source: `
    <div style="max-width: 400px; margin: 0 auto; padding: 2rem; font-family: system-ui;">
      <h2>Contact Form</h2>
      <p style="color: #666; font-size: 0.875rem; margin-bottom: 1rem;">
        This form demonstrates calling MCP tools on form submission.
      </p>

      <form id="contactForm" style="margin-top: 1rem;">
        <div style="margin-bottom: 1rem;">
          <label for="name" style="display: block; margin-bottom: 0.25rem;">Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
        </div>

        <div style="margin-bottom: 1rem;">
          <label for="message" style="display: block; margin-bottom: 0.25rem;">Message:</label>
          <textarea
            id="message"
            name="message"
            rows="4"
            required
            style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;"></textarea>
        </div>

        <button
          type="submit"
          style="padding: 0.5rem 1rem; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Submit
        </button>
      </form>

      <script>
        document.getElementById('contactForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const name = formData.get('name');
          const message = formData.get('message');

          // Call MCP tool to send notification
          await window.mcpTools.notify({
            message: \`Message from \${name}: \${message}\`,
            type: 'info'
          });

          // Reset form
          e.target.reset();

          // Show success
          await window.mcpTools.notify({
            message: 'Form submitted successfully!',
            type: 'success'
          });
        });
      </script>
    </div>
  `;

  tools: ['notify'];
}

// ============================================================================
// Server Implementation
// ============================================================================

export default class ToolsUIServer {
  /**
   * Notify tool implementation
   *
   * Logs notification to console and returns confirmation.
   * In a real application, this could send notifications via email,
   * push notifications, or other messaging services.
   */
  notify: NotifyTool = async (params) => {
    // Log to console with appropriate styling
    const prefix = `[${params.type.toUpperCase()}]`;
    console.log(`${prefix} ${params.message}`);

    // Return confirmation with timestamp
    return {
      sent: true,
      timestamp: new Date().toISOString(),
    };
  };
}
