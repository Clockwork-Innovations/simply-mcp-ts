/**
 * Demo Resources Catalog for MCP-UI Layer 1 Demo
 *
 * This file contains REAL UIResourceContent objects (not mocks) that demonstrate
 * Layer 1 (Foundation) capabilities: static HTML resources rendered in sandboxed iframes.
 *
 * All resources follow the MCP-UI specification exactly:
 * - MIME type: 'text/html'
 * - Self-contained HTML (no external scripts)
 * - CSS in <style> tags
 * - Sandboxed iframe rendering
 *
 * @module lib/demoResources
 */

import type { UIResourceContent } from '../../../src/client/ui-types.js';
import type { ResourceId, DemoResource } from './types.js';

/**
 * Product Card Demo Resource
 *
 * Demonstrates a modern product card with gradient styling, grid layout,
 * and formatted information display.
 */
const PRODUCT_CARD_RESOURCE: UIResourceContent = {
  uri: 'ui://product-card/layer1',
  mimeType: 'text/html',
  text: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Card</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 24px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      padding: 32px;
      max-width: 400px;
      width: 100%;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .badge {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .card h2 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 800;
      color: #1a202c;
      line-height: 1.2;
    }

    .card p {
      margin: 0 0 24px 0;
      color: #718096;
      line-height: 1.6;
      font-size: 15px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 24px 0;
    }

    .info-item {
      border-left: 3px solid #667eea;
      padding-left: 12px;
    }

    .info-label {
      font-size: 11px;
      color: #a0aec0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      font-weight: 600;
    }

    .info-value {
      font-size: 24px;
      font-weight: 800;
      color: #2d3748;
    }

    .footer {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
    }

    .footer p {
      font-size: 12px;
      color: #a0aec0;
      margin: 0;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Layer 1: Foundation</div>
    <h2>Widget Pro X</h2>
    <p>High-performance widget with advanced features and modern design. Perfect for production applications.</p>

    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Price</div>
        <div class="info-value">$299</div>
      </div>
      <div class="info-item">
        <div class="info-label">In Stock</div>
        <div class="info-value">✓ Yes</div>
      </div>
      <div class="info-item">
        <div class="info-label">Rating</div>
        <div class="info-value">4.8★</div>
      </div>
      <div class="info-item">
        <div class="info-label">Reviews</div>
        <div class="info-value">1,247</div>
      </div>
    </div>

    <div class="footer">
      <p>
        This is a static HTML demo rendered in a sandboxed iframe using MCP-UI Layer 1.
        Interactivity will be added in Layer 2 with postMessage callbacks.
      </p>
    </div>
  </div>
</body>
</html>`,
  _meta: {
    'mcpui.dev/ui-preferred-frame-size': { width: 500, height: 600 },
  },
};

/**
 * Info Card Demo Resource
 *
 * Demonstrates a clean information card with icon, title, and description.
 */
const INFO_CARD_RESOURCE: UIResourceContent = {
  uri: 'ui://info-card/layer1',
  mimeType: 'text/html',
  text: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Info Card</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f7fafc;
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }

    .info-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
      padding: 28px;
      max-width: 380px;
      width: 100%;
      border: 1px solid #e2e8f0;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .info-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
    }

    .icon {
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      margin-bottom: 20px;
    }

    h3 {
      font-size: 22px;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 12px;
    }

    p {
      font-size: 15px;
      line-height: 1.6;
      color: #4a5568;
      margin-bottom: 16px;
    }

    .status {
      display: inline-block;
      background: #c6f6d5;
      color: #22543d;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="info-card">
    <div class="icon">🚀</div>
    <h3>MCP-UI Renderer</h3>
    <p>
      Secure, sandboxed HTML rendering for Model Context Protocol UI resources.
      Built with React and designed for modern applications.
    </p>
    <span class="status">Active</span>
  </div>
</body>
</html>`,
  _meta: {
    'mcpui.dev/ui-preferred-frame-size': { width: 450, height: 400 },
  },
};

/**
 * Feature List Demo Resource
 *
 * Demonstrates a feature list with checkmarks and descriptions.
 */
const FEATURE_LIST_RESOURCE: UIResourceContent = {
  uri: 'ui://feature-list/layer1',
  mimeType: 'text/html',
  text: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feature List</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(to bottom, #4c51bf, #667eea);
      padding: 32px;
      min-height: 100vh;
      color: white;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
    }

    h1 {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 8px;
      text-align: center;
    }

    .subtitle {
      text-align: center;
      opacity: 0.9;
      margin-bottom: 32px;
      font-size: 16px;
    }

    .features {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 24px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .feature-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .feature-item:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }

    .checkmark {
      width: 24px;
      height: 24px;
      background: #48bb78;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
      flex-shrink: 0;
      font-weight: bold;
    }

    .feature-content h3 {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .feature-content p {
      font-size: 14px;
      opacity: 0.9;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>MCP-UI Features</h1>
    <p class="subtitle">Layer 1: Foundation capabilities</p>

    <div class="features">
      <div class="feature-item">
        <div class="checkmark">✓</div>
        <div class="feature-content">
          <h3>Sandboxed Rendering</h3>
          <p>Secure iframe-based rendering with configurable sandbox permissions</p>
        </div>
      </div>

      <div class="feature-item">
        <div class="checkmark">✓</div>
        <div class="feature-content">
          <h3>HTML Support</h3>
          <p>Full HTML5 and CSS3 support for rich, styled content</p>
        </div>
      </div>

      <div class="feature-item">
        <div class="checkmark">✓</div>
        <div class="feature-content">
          <h3>Auto-Resizing</h3>
          <p>Automatic iframe height adjustment based on content</p>
        </div>
      </div>

      <div class="feature-item">
        <div class="checkmark">✓</div>
        <div class="feature-content">
          <h3>Type Safety</h3>
          <p>Full TypeScript support with comprehensive type definitions</p>
        </div>
      </div>

      <div class="feature-item">
        <div class="checkmark">✓</div>
        <div class="feature-content">
          <h3>React Integration</h3>
          <p>Drop-in React components for seamless integration</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`,
  _meta: {
    'mcpui.dev/ui-preferred-frame-size': { width: 700, height: 600 },
  },
};

/**
 * Statistics Display Demo Resource
 *
 * Demonstrates a dashboard with live statistics and metrics.
 */
const STATISTICS_DISPLAY_RESOURCE: UIResourceContent = {
  uri: 'ui://statistics-display/layer1',
  mimeType: 'text/html',
  text: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Statistics Display</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 32px;
      min-height: 100vh;
      color: white;
    }

    .dashboard {
      max-width: 900px;
      margin: 0 auto;
    }

    h1 {
      font-size: 36px;
      font-weight: 800;
      margin-bottom: 8px;
      text-align: center;
    }

    .subtitle {
      text-align: center;
      opacity: 0.9;
      margin-bottom: 32px;
      font-size: 16px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 24px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: transform 0.2s, background 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      background: rgba(255, 255, 255, 0.2);
    }

    .stat-label {
      font-size: 13px;
      opacity: 0.9;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }

    .stat-value {
      font-size: 42px;
      font-weight: 800;
      margin-bottom: 6px;
      line-height: 1;
    }

    .stat-change {
      font-size: 14px;
      opacity: 0.85;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .arrow-up {
      color: #68d391;
    }

    .arrow-down {
      color: #fc8181;
    }

    .timestamp {
      text-align: center;
      opacity: 0.7;
      font-size: 14px;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="dashboard">
    <h1>Server Dashboard</h1>
    <p class="subtitle">Real-time metrics and statistics</p>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Active Users</div>
        <div class="stat-value">2,847</div>
        <div class="stat-change arrow-up">
          ↑ 12.5% from yesterday
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Requests/Min</div>
        <div class="stat-value">438</div>
        <div class="stat-change arrow-up">
          ↑ 8.3% from yesterday
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Response Time</div>
        <div class="stat-value">142ms</div>
        <div class="stat-change arrow-down">
          ↓ 15.2% from yesterday
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Uptime</div>
        <div class="stat-value">99.9%</div>
        <div class="stat-change">
          Last 30 days
        </div>
      </div>
    </div>

    <div class="timestamp">
      Last updated: ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>`,
  _meta: {
    'mcpui.dev/ui-preferred-frame-size': { width: 900, height: 500 },
  },
};

/**
 * Welcome Card Demo Resource
 *
 * Demonstrates a simple welcome message with branding.
 */
const WELCOME_CARD_RESOURCE: UIResourceContent = {
  uri: 'ui://welcome-card/layer1',
  mimeType: 'text/html',
  text: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 24px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .welcome {
      text-align: center;
      color: white;
      max-width: 500px;
    }

    .logo {
      width: 80px;
      height: 80px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      margin: 0 auto 24px;
      border: 3px solid rgba(255, 255, 255, 0.3);
    }

    h1 {
      font-size: 42px;
      font-weight: 800;
      margin-bottom: 16px;
      letter-spacing: -0.5px;
    }

    p {
      font-size: 18px;
      line-height: 1.6;
      opacity: 0.95;
      margin-bottom: 12px;
    }

    .version {
      font-size: 14px;
      opacity: 0.7;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="welcome">
    <div class="logo">🎯</div>
    <h1>Welcome to MCP-UI</h1>
    <p>
      Secure, flexible UI rendering for the Model Context Protocol.
    </p>
    <p>
      This demo showcases Layer 1 (Foundation) capabilities with static HTML resources.
    </p>
    <div class="version">Layer 1: Foundation • Next.js 15 • React 19</div>
  </div>
</body>
</html>`,
  _meta: {
    'mcpui.dev/ui-preferred-frame-size': { width: 600, height: 500 },
  },
};

/**
 * Feedback Form Demo Resource - Layer 2: Feature
 *
 * Demonstrates an interactive form that uses postMessage to submit feedback
 * and execute the 'submit_feedback' tool on the server.
 */
const FEEDBACK_FORM_RESOURCE: UIResourceContent = {
  uri: 'ui://feedback-form/layer2',
  mimeType: 'text/html',
  text: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback Form</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 24px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .form-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      padding: 32px;
      max-width: 450px;
      width: 100%;
    }

    h2 {
      font-size: 24px;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 8px;
    }

    .subtitle {
      color: #718096;
      font-size: 14px;
      margin-bottom: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 8px;
    }

    input[type="text"],
    select,
    textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      transition: border-color 0.2s;
    }

    input[type="text"]:focus,
    select:focus,
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
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .submit-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .submit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .reset-btn {
      background: #f7fafc;
      color: #2d3748;
      border: 1px solid #e2e8f0;
    }

    .reset-btn:hover {
      background: #edf2f7;
    }

    .status {
      margin-top: 16px;
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      display: none;
    }

    .status.show {
      display: block;
    }

    .status.success {
      background: #c6f6d5;
      color: #22543d;
      border: 1px solid #9ae6b4;
    }

    .status.error {
      background: #fed7d7;
      color: #742a2a;
      border: 1px solid #fc8181;
    }

    .status.loading {
      background: #bee3f8;
      color: #2c5282;
      border: 1px solid #90cdf4;
    }
  </style>
</head>
<body>
  <div class="form-container">
    <h2>Send Feedback</h2>
    <p class="subtitle">Layer 2: Interactive Form with Tool Execution</p>

    <form id="feedbackForm">
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" name="name" placeholder="Your name" required>
      </div>

      <div class="form-group">
        <label for="email">Email</label>
        <input type="text" id="email" name="email" placeholder="your@email.com" required>
      </div>

      <div class="form-group">
        <label for="category">Category</label>
        <select id="category" name="category" required>
          <option value="">Select a category</option>
          <option value="bug">Bug Report</option>
          <option value="feature">Feature Request</option>
          <option value="general">General Feedback</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div class="form-group">
        <label for="message">Message</label>
        <textarea id="message" name="message" placeholder="Your feedback..." required></textarea>
      </div>

      <div class="button-group">
        <button type="submit" class="submit-btn">Submit Feedback</button>
        <button type="reset" class="reset-btn">Clear</button>
      </div>

      <div id="status" class="status"></div>
    </form>
  </div>

  <script>
    const form = document.getElementById('feedbackForm');
    const statusDiv = document.getElementById('status');
    const requestMap = new Map();
    let requestId = 0;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        category: document.getElementById('category').value,
        message: document.getElementById('message').value,
        timestamp: new Date().toISOString()
      };

      // Show loading state
      statusDiv.className = 'status show loading';
      statusDiv.textContent = 'Submitting feedback...';
      form.querySelector('.submit-btn').disabled = true;

      const reqId = String(++requestId);

      // Send message to parent with new format
      window.parent.postMessage({
        type: 'tool',
        toolName: 'submit_feedback',
        args: formData,
        requestId: reqId
      }, '*');

      // Setup response handler
      const handleResponse = (event) => {
        if (!event.data || event.data.type !== 'response' || event.data.requestId !== reqId) return;

        const { success, data, error } = event.data;

        if (success) {
          statusDiv.className = 'status show success';
          statusDiv.textContent = '✓ Feedback submitted successfully!';
          form.reset();
          setTimeout(() => {
            statusDiv.classList.remove('show');
          }, 5000);
        } else {
          statusDiv.className = 'status show error';
          statusDiv.textContent = '✗ ' + (error || 'Failed to submit feedback');
        }

        form.querySelector('.submit-btn').disabled = false;
        window.removeEventListener('message', handleResponse);
      };

      window.addEventListener('message', handleResponse);
    });
  </script>
</body>
</html>`,
  _meta: {
    'mcpui.dev/ui-preferred-frame-size': { width: 500, height: 650 },
  },
};

/**
 * Contact Form Demo Resource - Layer 2: Feature
 *
 * Demonstrates a form with multiple fields and validation that executes
 * the 'send_contact_message' tool via postMessage.
 */
const CONTACT_FORM_RESOURCE: UIResourceContent = {
  uri: 'ui://contact-form/layer2',
  mimeType: 'text/html',
  text: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact Form</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #4c51bf 0%, #667eea 100%);
      padding: 24px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .form-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      padding: 32px;
      max-width: 500px;
      width: 100%;
    }

    h2 {
      font-size: 24px;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 8px;
    }

    .subtitle {
      color: #718096;
      font-size: 14px;
      margin-bottom: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-row .form-group {
      margin-bottom: 0;
    }

    label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 8px;
    }

    input[type="text"],
    input[type="email"],
    input[type="tel"],
    textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      transition: border-color 0.2s;
    }

    input:focus,
    textarea:focus {
      outline: none;
      border-color: #4c51bf;
      box-shadow: 0 0 0 3px rgba(76, 81, 191, 0.1);
    }

    textarea {
      resize: vertical;
      min-height: 140px;
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
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .submit-btn {
      background: linear-gradient(135deg, #4c51bf 0%, #667eea 100%);
      color: white;
    }

    .submit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(76, 81, 191, 0.4);
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .reset-btn {
      background: #f7fafc;
      color: #2d3748;
      border: 1px solid #e2e8f0;
    }

    .reset-btn:hover {
      background: #edf2f7;
    }

    .status {
      margin-top: 16px;
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      display: none;
    }

    .status.show {
      display: block;
    }

    .status.success {
      background: #c6f6d5;
      color: #22543d;
      border: 1px solid #9ae6b4;
    }

    .status.error {
      background: #fed7d7;
      color: #742a2a;
      border: 1px solid #fc8181;
    }

    .status.loading {
      background: #bee3f8;
      color: #2c5282;
      border: 1px solid #90cdf4;
    }
  </style>
</head>
<body>
  <div class="form-container">
    <h2>Get in Touch</h2>
    <p class="subtitle">Layer 2: Contact Form with Tool Integration</p>

    <form id="contactForm">
      <div class="form-row">
        <div class="form-group">
          <label for="firstName">First Name</label>
          <input type="text" id="firstName" name="firstName" placeholder="John" required>
        </div>
        <div class="form-group">
          <label for="lastName">Last Name</label>
          <input type="text" id="lastName" name="lastName" placeholder="Doe" required>
        </div>
      </div>

      <div class="form-group">
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" placeholder="john@example.com" required>
      </div>

      <div class="form-group">
        <label for="phone">Phone (Optional)</label>
        <input type="tel" id="phone" name="phone" placeholder="+1 (555) 000-0000">
      </div>

      <div class="form-group">
        <label for="subject">Subject</label>
        <input type="text" id="subject" name="subject" placeholder="How can we help?" required>
      </div>

      <div class="form-group">
        <label for="message">Message</label>
        <textarea id="message" name="message" placeholder="Tell us more..." required></textarea>
      </div>

      <div class="button-group">
        <button type="submit" class="submit-btn">Send Message</button>
        <button type="reset" class="reset-btn">Clear</button>
      </div>

      <div id="status" class="status"></div>
    </form>
  </div>

  <script>
    const form = document.getElementById('contactForm');
    const statusDiv = document.getElementById('status');
    let requestId = 0;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const messageData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value || null,
        subject: document.getElementById('subject').value,
        message: document.getElementById('message').value,
        timestamp: new Date().toISOString()
      };

      // Show loading state
      statusDiv.className = 'status show loading';
      statusDiv.textContent = 'Sending message...';
      form.querySelector('.submit-btn').disabled = true;

      const reqId = String(++requestId);

      // Send message to parent with new format
      window.parent.postMessage({
        type: 'tool',
        toolName: 'send_contact_message',
        args: messageData,
        requestId: reqId
      }, '*');

      // Listen for response
      const handleResponse = (event) => {
        if (!event.data || event.data.type !== 'response' || event.data.requestId !== reqId) return;

        const { success, error } = event.data;

        if (success) {
          statusDiv.className = 'status show success';
          statusDiv.textContent = '✓ Message sent successfully! We\'ll get back to you soon.';
          form.reset();
          setTimeout(() => {
            statusDiv.classList.remove('show');
          }, 5000);
        } else {
          statusDiv.className = 'status show error';
          statusDiv.textContent = '✗ ' + (error || 'Failed to send message');
        }

        form.querySelector('.submit-btn').disabled = false;
        window.removeEventListener('message', handleResponse);
      };

      window.addEventListener('message', handleResponse);
    });
  </script>
</body>
</html>`,
  _meta: {
    'mcpui.dev/ui-preferred-frame-size': { width: 550, height: 750 },
  },
};

/**
 * Product Selector Demo Resource - Layer 2: Feature
 *
 * Demonstrates an interactive product selector that uses postMessage
 * to execute the 'select_product' tool when a product is chosen.
 */
const PRODUCT_SELECTOR_RESOURCE: UIResourceContent = {
  uri: 'ui://product-selector/layer2',
  mimeType: 'text/html',
  text: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Selector</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 24px;
      min-height: 100vh;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
    }

    h2 {
      color: white;
      font-size: 24px;
      margin-bottom: 8px;
    }

    .subtitle {
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
      margin-bottom: 24px;
    }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .product-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .product-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    }

    .product-card.selected {
      border-color: #667eea;
      background: linear-gradient(135deg, #f0f4ff 0%, #f9f5ff 100%);
    }

    .product-icon {
      font-size: 32px;
      margin-bottom: 12px;
      display: block;
    }

    .product-name {
      font-size: 16px;
      font-weight: 700;
      color: #2d3748;
      margin-bottom: 8px;
    }

    .product-price {
      font-size: 18px;
      font-weight: 800;
      color: #667eea;
      margin-bottom: 8px;
    }

    .product-desc {
      font-size: 13px;
      color: #718096;
      line-height: 1.4;
      margin-bottom: 12px;
    }

    .product-badge {
      display: inline-block;
      background: #edf2f7;
      color: #2d3748;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .product-badge.popular {
      background: #fef5e7;
      color: #7d6608;
    }

    .selection-info {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      padding: 20px;
      margin-top: 24px;
      color: white;
      display: none;
    }

    .selection-info.show {
      display: block;
    }

    .selection-info h3 {
      font-size: 16px;
      margin-bottom: 12px;
    }

    .selection-info p {
      font-size: 14px;
      opacity: 0.9;
      line-height: 1.5;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      margin-top: 16px;
    }

    button {
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .confirm-btn {
      background: white;
      color: #667eea;
    }

    .confirm-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    }

    .confirm-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .clear-btn {
      background: transparent;
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .clear-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .response-info {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      padding: 16px;
      margin-top: 16px;
      color: white;
      display: none;
      font-size: 12px;
      font-family: 'Monaco', 'Courier New', monospace;
      line-height: 1.5;
      max-height: 200px;
      overflow-y: auto;
    }

    .response-info.show {
      display: block;
    }

    .response-info .label {
      font-weight: 600;
      color: #ffd700;
      margin-top: 8px;
    }

    .response-info .label:first-child {
      margin-top: 0;
    }

    .response-info .data {
      color: #90ee90;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Choose Your Product</h2>
    <p class="subtitle">Layer 2: Product Selection with Tool Callback</p>

    <div class="products-grid" id="productsGrid"></div>

    <div class="selection-info" id="selectionInfo">
      <h3>Selected Product</h3>
      <p id="selectedDetails"></p>
      <div class="action-buttons">
        <button class="confirm-btn" id="confirmBtn">Confirm Selection</button>
        <button class="clear-btn" id="clearBtn">Clear Selection</button>
      </div>

      <div class="response-info" id="responseInfo">
        <div><span class="label">📤 Request Sent:</span></div>
        <div id="requestData" class="data"></div>
        <div><span class="label">📥 Response Received:</span></div>
        <div id="responseData" class="data"></div>
      </div>
    </div>
  </div>

  <script>
    const products = [
      {
        id: 'pro-basic',
        name: 'Basic',
        price: '\$29/mo',
        icon: '📦',
        desc: 'Perfect for getting started',
        badge: 'Popular'
      },
      {
        id: 'pro-pro',
        name: 'Professional',
        price: '\$99/mo',
        icon: '⭐',
        desc: 'For professionals',
        badge: 'Popular'
      },
      {
        id: 'pro-enterprise',
        name: 'Enterprise',
        price: 'Custom',
        icon: '🏢',
        desc: 'For large organizations',
        badge: 'Custom'
      }
    ];

    let selectedProduct = null;
    const productsGrid = document.getElementById('productsGrid');
    const selectionInfo = document.getElementById('selectionInfo');
    const selectedDetails = document.getElementById('selectedDetails');
    const confirmBtn = document.getElementById('confirmBtn');
    const clearBtn = document.getElementById('clearBtn');
    const responseInfo = document.getElementById('responseInfo');
    const requestData = document.getElementById('requestData');
    const responseData = document.getElementById('responseData');

    // Render products
    productsGrid.innerHTML = products.map(product => \`
      <div class="product-card" data-id="\${product.id}">
        <span class="product-icon">\${product.icon}</span>
        <div class="product-name">\${product.name}</div>
        <div class="product-price">\${product.price}</div>
        <div class="product-desc">\${product.desc}</div>
        <span class="product-badge \${product.badge === 'Popular' ? 'popular' : ''}">\${product.badge}</span>
      </div>
    \`).join('');

    // Handle product selection
    productsGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.product-card');
      if (!card) return;

      // Remove previous selection
      document.querySelectorAll('.product-card').forEach(c => c.classList.remove('selected'));

      // Mark new selection
      card.classList.add('selected');
      selectedProduct = products.find(p => p.id === card.dataset.id);

      // Show selection info
      selectedDetails.innerHTML = \`
        <strong>\${selectedProduct.name}</strong> - \${selectedProduct.price}<br>
        \${selectedProduct.desc}
      \`;
      selectionInfo.classList.add('show');
    });

    // Handle confirmation
    let confirmRequestId = 0;
    confirmBtn.addEventListener('click', () => {
      if (!selectedProduct) return;

      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Confirming...';

      const reqId = String(++confirmRequestId);

      // Build request object
      const requestPayload = {
        type: 'tool',
        toolName: 'select_product',
        args: {
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          timestamp: new Date().toISOString()
        },
        requestId: reqId
      };

      // Display request being sent
      requestData.innerHTML = JSON.stringify(requestPayload, null, 2);
      responseInfo.classList.add('show');

      // Send selection to parent with new format
      window.parent.postMessage(requestPayload, '*');

      // Listen for response
      const handleResponse = (event) => {
        if (!event.data || event.data.type !== 'response' || event.data.requestId !== reqId) return;

        const { success, data, error } = event.data;

        // Display response received with all data
        const responsePayload = {
          type: 'response',
          requestId: reqId,
          success,
          data,
          error
        };
        responseData.innerHTML = JSON.stringify(responsePayload, null, 2);

        if (success) {
          confirmBtn.textContent = '✓ Selected!';
          setTimeout(() => {
            selectedProduct = null;
            document.querySelectorAll('.product-card').forEach(c => c.classList.remove('selected'));
            responseInfo.classList.remove('show');
            selectionInfo.classList.remove('show');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm Selection';
          }, 3000);
        } else {
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Try Again';
        }

        window.removeEventListener('message', handleResponse);
      };

      window.addEventListener('message', handleResponse);
    });

    // Handle clear selection
    clearBtn.addEventListener('click', () => {
      selectedProduct = null;
      document.querySelectorAll('.product-card').forEach(c => c.classList.remove('selected'));
      selectionInfo.classList.remove('show');
    });
  </script>
</body>
</html>`,
  _meta: {
    'mcpui.dev/ui-preferred-frame-size': { width: 650, height: 500 },
  },
};

/**
 * External Demo Interactive Resource - Layer 2: Feature
 *
 * Demonstrates an interactive analytics dashboard that executes
 * the 'export_report' tool via postMessage for external data handling.
 */
const EXTERNAL_DEMO_RESOURCE: UIResourceContent = {
  uri: 'ui://external-demo/layer2',
  mimeType: 'text/html',
  text: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analytics Dashboard</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      padding: 24px;
      min-height: 100vh;
      color: white;
    }

    .container {
      max-width: 700px;
      margin: 0 auto;
    }

    h1 {
      font-size: 28px;
      margin-bottom: 8px;
      text-align: center;
    }

    .subtitle {
      text-align: center;
      opacity: 0.9;
      font-size: 14px;
      margin-bottom: 32px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .metric-card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 20px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      text-align: center;
    }

    .metric-value {
      font-size: 32px;
      font-weight: 800;
      margin: 8px 0;
    }

    .metric-label {
      font-size: 12px;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .export-section {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
    }

    .export-section h2 {
      font-size: 18px;
      margin-bottom: 16px;
    }

    .format-buttons {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
      justify-content: center;
    }

    button {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      background: white;
      color: #1e3c72;
    }

    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .response-status {
      margin-top: 16px;
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      display: none;
    }

    .response-status.show {
      display: block;
    }

    .response-status.success {
      background: rgba(72, 187, 120, 0.2);
      border: 1px solid #48bb78;
      color: #68d391;
    }

    .response-status.loading {
      background: rgba(66, 153, 225, 0.2);
      border: 1px solid #4299e1;
      color: #63b3ed;
    }

    .response-status.error {
      background: rgba(245, 101, 101, 0.2);
      border: 1px solid #f56565;
      color: #fc8181;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Analytics Dashboard</h1>
    <p class="subtitle">Layer 2: Interactive Dashboard with Export Tool</p>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Total Events</div>
        <div class="metric-value">24,582</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Active Users</div>
        <div class="metric-value">3,847</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Conversion Rate</div>
        <div class="metric-value">12.4%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Avg Session</div>
        <div class="metric-value">4m 32s</div>
      </div>
    </div>

    <div class="export-section">
      <h2>Export Report</h2>
      <div class="format-buttons">
        <button class="export-btn" data-format="csv">📄 CSV</button>
        <button class="export-btn" data-format="json">📋 JSON</button>
        <button class="export-btn" data-format="pdf">📑 PDF</button>
      </div>
      <div class="response-status" id="status"></div>
    </div>
  </div>

  <script>
    const exportButtons = document.querySelectorAll('.export-btn');
    const statusDiv = document.getElementById('status');
    let requestId = 0;

    exportButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const format = btn.dataset.format;
        exportReport(format);
      });
    });

    function exportReport(format) {
      const reqId = String(++requestId);
      const exportButtons = document.querySelectorAll('.export-btn');

      // Disable buttons and show loading
      exportButtons.forEach(btn => btn.disabled = true);
      statusDiv.className = 'response-status show loading';
      statusDiv.textContent = \`⏳ Exporting as \${format.toUpperCase()}...\`;

      const payload = {
        type: 'tool',
        toolName: 'export_report',
        args: {
          format: format,
          includeMetrics: true,
          dateRange: 'last-30-days',
          timestamp: new Date().toISOString()
        },
        requestId: reqId
      };

      window.parent.postMessage(payload, '*');

      // Listen for response
      const handleResponse = (event) => {
        if (!event.data || event.data.type !== 'response' || event.data.requestId !== reqId) return;

        const { success, error } = event.data;

        if (success) {
          statusDiv.className = 'response-status show success';
          statusDiv.textContent = \`✓ Report exported successfully as \${format.toUpperCase()}!\`;
        } else {
          statusDiv.className = 'response-status show error';
          statusDiv.textContent = \`✗ Export failed: \${error || 'Unknown error'}\`;
        }

        exportButtons.forEach(btn => btn.disabled = false);
        window.removeEventListener('message', handleResponse);
      };

      window.addEventListener('message', handleResponse);
    }
  </script>
</body>
</html>`,
  _meta: {
    'mcpui.dev/ui-preferred-frame-size': { width: 750, height: 550 },
  },
};

/**
 * External Documentation Resource - Layer 2: Interactive Documentation
 *
 * Demonstrates an interactive documentation page with features and guides.
 * Shows how MCP-UI can serve as a complete UI framework for complex applications.
 */
const EXTERNAL_DOCS_RESOURCE: UIResourceContent = {
  uri: 'ui://external-docs/layer2',
  mimeType: 'text/html',
  text: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP-UI Documentation</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 24px;
      min-height: 100vh;
      color: #333;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 32px;
      text-align: center;
    }

    .header h1 {
      font-size: 36px;
      font-weight: 800;
      margin-bottom: 12px;
    }

    .header p {
      font-size: 16px;
      opacity: 0.95;
    }

    .content {
      padding: 40px 32px;
      max-height: 600px;
      overflow-y: auto;
    }

    .section {
      margin-bottom: 32px;
    }

    .section:last-child {
      margin-bottom: 0;
    }

    h2 {
      font-size: 22px;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #667eea;
    }

    p {
      font-size: 14px;
      line-height: 1.6;
      color: #4a5568;
      margin-bottom: 12px;
    }

    .features {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-top: 16px;
    }

    .feature-box {
      background: #f7fafc;
      border-left: 4px solid #667eea;
      border-radius: 8px;
      padding: 16px;
    }

    .feature-box h3 {
      font-size: 14px;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 8px;
    }

    .feature-box p {
      font-size: 13px;
      color: #718096;
      margin: 0;
    }

    .code-block {
      background: #1a202c;
      color: #68d391;
      padding: 12px;
      border-radius: 8px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 12px;
      overflow-x: auto;
      margin: 12px 0;
      line-height: 1.5;
    }

    .tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .tag {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    .footer {
      background: #f7fafc;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 13px;
      color: #718096;
    }

    @media (max-width: 768px) {
      .features {
        grid-template-columns: 1fr;
      }

      .header h1 {
        font-size: 28px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📚 MCP-UI Documentation</h1>
      <p>Secure, flexible UI rendering for the Model Context Protocol</p>
    </div>

    <div class="content">
      <div class="section">
        <h2>What is MCP-UI?</h2>
        <p>
          MCP-UI is a complete UI framework for the Model Context Protocol (MCP), enabling secure rendering
          of interactive components within sandboxed iframes. It provides a standardized way to deliver rich,
          dynamic user interfaces through MCP resources.
        </p>
        <p>
          The framework is built on modern web standards and provides comprehensive TypeScript support for
          seamless integration with React, Vue, and other JavaScript frameworks.
        </p>
      </div>

      <div class="section">
        <h2>Core Features</h2>
        <div class="features">
          <div class="feature-box">
            <h3>🔒 Secure Rendering</h3>
            <p>Sandboxed iframe execution with configurable permissions</p>
          </div>
          <div class="feature-box">
            <h3>📱 Responsive Design</h3>
            <p>Auto-resizing iframes and mobile-optimized layouts</p>
          </div>
          <div class="feature-box">
            <h3>🎨 Full HTML5/CSS3</h3>
            <p>Complete support for modern web standards</p>
          </div>
          <div class="feature-box">
            <h3>⚡ Interactive Tools</h3>
            <p>postMessage-based tool execution and callbacks</p>
          </div>
          <div class="feature-box">
            <h3>📦 Type Safe</h3>
            <p>Full TypeScript definitions and type checking</p>
          </div>
          <div class="feature-box">
            <h3>🚀 Framework Agnostic</h3>
            <p>Works with React, Vue, Svelte, and vanilla JS</p>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Architecture Layers</h2>
        <p>
          <strong>Layer 1 - Foundation:</strong> Static HTML resources rendered in secure iframes. Perfect for
          displaying content, cards, lists, and dashboards.
        </p>
        <p style="margin-bottom: 16px;">
          <strong>Layer 2 - Features:</strong> Interactive components that execute tools via postMessage. Enables
          forms, selectors, and real-time interactions with server-side execution.
        </p>
        <div class="tag-list">
          <span class="tag">Static Rendering</span>
          <span class="tag">Interactive Forms</span>
          <span class="tag">Real-time Updates</span>
          <span class="tag">Tool Callbacks</span>
        </div>
      </div>

      <div class="section">
        <h2>Quick Start</h2>
        <p>Using UIResourceRenderer in React:</p>
        <div class="code-block">import { UIResourceRenderer } from 'simply-mcp/client';<br><br>&lt;UIResourceRenderer<br>&nbsp;&nbsp;resource={resource}<br>&nbsp;&nbsp;style={{ width: '100%', minHeight: '400px' }}<br>/&gt;</div>
      </div>

      <div class="section">
        <h2>Learn More</h2>
        <p>
          This demo showcases both Layer 1 and Layer 2 capabilities with real, working examples including
          product cards, forms, dashboards, and interactive tools. Each demo is a fully functional MCP-UI resource.
        </p>
      </div>
    </div>

    <div class="footer">
      MCP-UI Layer 2 • Built with React 19 • Next.js 15 • simply-mcp
    </div>
  </div>
</body>
</html>`,
  _meta: {
    'mcpui.dev/ui-preferred-frame-size': { width: 900, height: 700 },
  },
};

/**
 * Demo resources catalog
 *
 * Maps resource IDs to DemoResource objects containing both the resource
 * and demo-specific metadata.
 */
export const DEMO_RESOURCES: Record<ResourceId, DemoResource> = {
  'product-card': {
    id: 'product-card',
    displayName: 'Product Card',
    description: 'Modern product card with gradient styling and grid layout',
    category: 'foundation',
    tags: ['card', 'product', 'gradient', 'grid'],
    resource: PRODUCT_CARD_RESOURCE,
  },
  'info-card': {
    id: 'info-card',
    displayName: 'Info Card',
    description: 'Clean information card with icon and hover effects',
    category: 'foundation',
    tags: ['card', 'info', 'icon', 'hover'],
    resource: INFO_CARD_RESOURCE,
  },
  'feature-list': {
    id: 'feature-list',
    displayName: 'Feature List',
    description: 'Feature list with checkmarks and descriptions',
    category: 'foundation',
    tags: ['list', 'features', 'checkmarks'],
    resource: FEATURE_LIST_RESOURCE,
  },
  'statistics-display': {
    id: 'statistics-display',
    displayName: 'Statistics Display',
    description: 'Dashboard with live statistics and metrics',
    category: 'foundation',
    tags: ['dashboard', 'statistics', 'metrics', 'grid'],
    resource: STATISTICS_DISPLAY_RESOURCE,
  },
  'welcome-card': {
    id: 'welcome-card',
    displayName: 'Welcome Card',
    description: 'Simple welcome message with branding',
    category: 'foundation',
    tags: ['welcome', 'simple', 'branding'],
    resource: WELCOME_CARD_RESOURCE,
  },
  'feedback-form': {
    id: 'feedback-form',
    displayName: 'Feedback Form',
    description: 'Interactive form with postMessage tool execution',
    category: 'feature',
    tags: ['form', 'interactive', 'feedback', 'tool', 'postmessage'],
    resource: FEEDBACK_FORM_RESOURCE,
  },
  'contact-form': {
    id: 'contact-form',
    displayName: 'Contact Form',
    description: 'Multi-field contact form with tool integration',
    category: 'feature',
    tags: ['form', 'interactive', 'contact', 'tool', 'postmessage'],
    resource: CONTACT_FORM_RESOURCE,
  },
  'product-selector': {
    id: 'product-selector',
    displayName: 'Product Selector',
    description: 'Interactive product selection with callbacks',
    category: 'feature',
    tags: ['selector', 'interactive', 'product', 'tool', 'postmessage'],
    resource: PRODUCT_SELECTOR_RESOURCE,
  },
  'external-demo': {
    id: 'external-demo',
    displayName: 'External Demo',
    description: 'External website embedded via text/uri-list',
    category: 'feature',
    tags: ['external', 'url', 'embedded', 'demo'],
    resource: EXTERNAL_DEMO_RESOURCE,
  },
  'external-docs': {
    id: 'external-docs',
    displayName: 'External Documentation',
    description: 'External documentation site embedded in MCP-UI',
    category: 'feature',
    tags: ['external', 'url', 'documentation', 'embedded'],
    resource: EXTERNAL_DOCS_RESOURCE,
  },
};

/**
 * Get all demo resources as an array
 */
export function getAllDemoResources(): DemoResource[] {
  return Object.values(DEMO_RESOURCES);
}

/**
 * Get demo resource by ID
 */
export function getDemoResource(id: ResourceId): DemoResource | undefined {
  return DEMO_RESOURCES[id];
}

/**
 * Get demo resources by category
 */
export function getDemoResourcesByCategory(
  category: DemoResource['category']
): DemoResource[] {
  return getAllDemoResources().filter((demo) => demo.category === category);
}

/**
 * Get demo resources by tag
 */
export function getDemoResourcesByTag(tag: string): DemoResource[] {
  return getAllDemoResources().filter((demo) => demo.tags.includes(tag));
}
