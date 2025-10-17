/**
 * Interactive Resources - HTML components that use postMessage for tool execution
 *
 * These resources demonstrate the complete interaction loop:
 * Form submission → postMessage → Tool execution → Response
 *
 * @module lib/interactiveResources
 */

import type { UIResourceContent } from './types.js';

/**
 * Interactive Product Selector - allows user to select products and execute tool
 */
export const INTERACTIVE_PRODUCT_SELECTOR: UIResourceContent = {
  uri: 'ui://product-selector/interactive',
  mimeType: 'text/html',
  text: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Selector</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 24px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 25px;
      font-size: 14px;
    }
    .product-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 25px;
    }
    .product-card {
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .product-card:hover {
      border-color: #667eea;
      transform: translateY(-3px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.2);
    }
    .product-card.selected {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: #667eea;
    }
    .product-emoji {
      font-size: 30px;
      margin-bottom: 8px;
    }
    .product-name {
      font-weight: 600;
      margin-bottom: 5px;
    }
    .product-price {
      font-size: 12px;
      opacity: 0.8;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      color: #333;
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 14px;
    }
    input, textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-family: inherit;
      font-size: 14px;
      transition: border-color 0.3s;
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    textarea {
      min-height: 100px;
      resize: vertical;
    }
    .button-group {
      display: flex;
      gap: 10px;
    }
    button {
      flex: 1;
      padding: 12px 20px;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 14px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    .btn-secondary {
      background: #f0f0f0;
      color: #333;
    }
    .btn-secondary:hover {
      background: #e0e0e0;
    }
    .status {
      margin-top: 20px;
      padding: 15px;
      border-radius: 6px;
      font-size: 14px;
      display: none;
    }
    .status.show {
      display: block;
    }
    .status.success {
      background: #e8f5e9;
      color: #2e7d32;
      border: 1px solid #c8e6c9;
    }
    .status.error {
      background: #ffebee;
      color: #c62828;
      border: 1px solid #ffcdd2;
    }
    .status.loading {
      background: #e3f2fd;
      color: #1565c0;
      border: 1px solid #bbdefb;
    }
    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid currentColor;
      border-radius: 50%;
      border-top-color: transparent;
      animation: spin 0.6s linear infinite;
      margin-right: 8px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🛍️ Select Your Product</h1>
    <p class="subtitle">Choose a product and enter your details to complete your order</p>

    <form id="productForm">
      <div class="product-grid">
        <div class="product-card" data-product="widget-pro">
          <div class="product-emoji">⚙️</div>
          <div class="product-name">Widget Pro</div>
          <div class="product-price">\\$99.99</div>
        </div>
        <div class="product-card" data-product="gadget-max">
          <div class="product-emoji">🎮</div>
          <div class="product-name">Gadget Max</div>
          <div class="product-price">\\$149.99</div>
        </div>
        <div class="product-card" data-product="tool-elite">
          <div class="product-emoji">🔧</div>
          <div class="product-name">Tool Elite</div>
          <div class="product-price">\\$199.99</div>
        </div>
        <div class="product-card" data-product="device-pro">
          <div class="product-emoji">📱</div>
          <div class="product-name">Device Pro</div>
          <div class="product-price">\\$299.99</div>
        </div>
      </div>

      <input type="hidden" id="selectedProduct" name="product" value="">

      <div class="form-group">
        <label for="name">Your Name</label>
        <input type="text" id="name" name="name" required placeholder="John Doe">
      </div>

      <div class="form-group">
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" required placeholder="john@example.com">
      </div>

      <div class="form-group">
        <label for="notes">Order Notes (Optional)</label>
        <textarea id="notes" name="notes" placeholder="Add any special requests..."></textarea>
      </div>

      <div class="button-group">
        <button type="submit" class="btn-primary" id="submitBtn">Place Order</button>
        <button type="reset" class="btn-secondary">Clear</button>
      </div>

      <div class="status" id="status"></div>
    </form>
  </div>

  <script>
    // Setup product selection
    document.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', function() {
        document.querySelectorAll('.product-card').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        document.getElementById('selectedProduct').value = this.dataset.product;
      });
    });

    // Form submission with tool execution
    document.getElementById('productForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const form = e.target;
      const selectedProduct = document.getElementById('selectedProduct').value;

      if (!selectedProduct) {
        showStatus('error', 'Please select a product');
        return;
      }

      const formData = {
        product: selectedProduct,
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        notes: document.getElementById('notes').value,
      };

      showStatus('loading', 'Processing your order...');
      document.getElementById('submitBtn').disabled = true;

      try {
        // Call tool via parent (MCP server)
        if (window.UIInteractive && window.UIInteractive.executeTool) {
          const result = await window.UIInteractive.executeTool('select_product', formData);
          showStatus('success', \`Order submitted! Order ID: \${result.data?.orderId || 'pending'}\`);
          form.reset();
          document.querySelectorAll('.product-card').forEach(c => c.classList.remove('selected'));
        } else {
          throw new Error('Interactive API not available');
        }
      } catch (error) {
        showStatus('error', \`Error: \${error.message}\`);
      } finally {
        document.getElementById('submitBtn').disabled = false;
      }
    });

    function showStatus(type, message) {
      const status = document.getElementById('status');
      status.className = \`status show \${type}\`;
      if (type === 'loading') {
        status.innerHTML = \`<span class="spinner"></span>\${message}\`;
      } else {
        status.textContent = message;
      }
    }

    // Log that interactive API is ready
    console.log('[Product Selector] Waiting for UIInteractive API...');
    if (window.UIInteractive) {
      console.log('[Product Selector] UIInteractive API available!');
    } else {
      setTimeout(() => {
        if (window.UIInteractive) {
          console.log('[Product Selector] UIInteractive API loaded!');
        }
      }, 100);
    }
  </script>
</body>
</html>`,
  _meta: {
    category: 'feature',
    layer: 'layer2',
    interactive: true,
  },
};

/**
 * Interactive Feedback Form - collects feedback and executes tool
 */
export const INTERACTIVE_FEEDBACK_FORM: UIResourceContent = {
  uri: 'ui://feedback-form/interactive',
  mimeType: 'text/html',
  text: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback Form</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 22px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 25px;
      font-size: 14px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      color: #333;
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 14px;
    }
    input, select, textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-family: inherit;
      font-size: 14px;
      transition: border-color 0.3s;
    }
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #f5576c;
      box-shadow: 0 0 0 3px rgba(245, 87, 108, 0.1);
    }
    textarea {
      min-height: 120px;
      resize: vertical;
    }
    select {
      cursor: pointer;
    }
    .button-group {
      display: flex;
      gap: 10px;
      margin-top: 25px;
    }
    button {
      flex: 1;
      padding: 12px 20px;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 14px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(245, 87, 108, 0.3);
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    .btn-secondary {
      background: #f0f0f0;
      color: #333;
    }
    .btn-secondary:hover {
      background: #e0e0e0;
    }
    .status {
      margin-top: 20px;
      padding: 15px;
      border-radius: 6px;
      font-size: 14px;
      display: none;
    }
    .status.show {
      display: block;
    }
    .status.success {
      background: #e8f5e9;
      color: #2e7d32;
      border: 1px solid #c8e6c9;
    }
    .status.error {
      background: #ffebee;
      color: #c62828;
      border: 1px solid #ffcdd2;
    }
    .status.loading {
      background: #e3f2fd;
      color: #1565c0;
      border: 1px solid #bbdefb;
    }
    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid currentColor;
      border-radius: 50%;
      border-top-color: transparent;
      animation: spin 0.6s linear infinite;
      margin-right: 8px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📝 Send Your Feedback</h1>
    <p class="subtitle">We'd love to hear from you! Help us improve.</p>

    <form id="feedbackForm">
      <div class="form-group">
        <label for="name">Your Name</label>
        <input type="text" id="name" name="name" required placeholder="John Doe">
      </div>

      <div class="form-group">
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" required placeholder="john@example.com">
      </div>

      <div class="form-group">
        <label for="category">Feedback Category</label>
        <select id="category" name="category" required>
          <option value="">Select a category</option>
          <option value="bug">Bug Report</option>
          <option value="feature">Feature Request</option>
          <option value="improvement">Improvement</option>
          <option value="general">General Feedback</option>
        </select>
      </div>

      <div class="form-group">
        <label for="message">Your Message</label>
        <textarea id="message" name="message" required placeholder="Tell us what you think..."></textarea>
      </div>

      <div class="button-group">
        <button type="submit" class="btn-primary" id="submitBtn">Send Feedback</button>
        <button type="reset" class="btn-secondary">Clear</button>
      </div>

      <div class="status" id="status"></div>
    </form>
  </div>

  <script>
    document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        category: document.getElementById('category').value,
        message: document.getElementById('message').value,
      };

      showStatus('loading', 'Submitting your feedback...');
      document.getElementById('submitBtn').disabled = true;

      try {
        if (window.UIInteractive && window.UIInteractive.executeTool) {
          const result = await window.UIInteractive.executeTool('submit_feedback', formData);
          showStatus('success', \`Thank you! Feedback ID: \${result.data?.feedbackId || 'submitted'}\`);
          e.target.reset();
        } else {
          throw new Error('Interactive API not available');
        }
      } catch (error) {
        showStatus('error', \`Error: \${error.message}\`);
      } finally {
        document.getElementById('submitBtn').disabled = false;
      }
    });

    function showStatus(type, message) {
      const status = document.getElementById('status');
      status.className = \`status show \${type}\`;
      if (type === 'loading') {
        status.innerHTML = \`<span class="spinner"></span>\${message}\`;
      } else {
        status.textContent = message;
      }
    }
  </script>
</body>
</html>`,
  _meta: {
    category: 'feature',
    layer: 'layer2',
    interactive: true,
  },
};
