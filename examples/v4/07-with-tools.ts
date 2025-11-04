/**
 * IUI v4.0 Example: UI with MCP Tools
 *
 * Create interactive UIs that can call MCP tools.
 * Perfect for action-oriented interfaces, forms with server actions, etc.
 */

import { InterfaceServer, IUI, ITool } from '../../src/index.js';

const server = new InterfaceServer({
  name: 'tools-ui-server',
  version: '1.0.0',
});

/**
 * Notification Tool
 *
 * Simple tool that the UI can call
 */
interface NotifyTool extends ITool {
  name: 'notify';
  description: 'Send a notification to the user';
  parameters: {
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  };

  (params: { message: string; type: 'info' | 'success' | 'warning' | 'error' }): { sent: boolean } {
    console.log(`[${params.type.toUpperCase()}] ${params.message}`);
    return { sent: true };
  }
}

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

  // Specify which tools this UI can call
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

export default server;
