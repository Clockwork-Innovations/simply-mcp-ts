# MCP UI Migration Guide

Guide for migrating to the spec-compliant MCP UI protocol in Simply-MCP v4.0.0+.

## Table of Contents

- [Overview](#overview)
- [What Changed](#what-changed)
- [Breaking Changes](#breaking-changes)
- [Migration Steps](#migration-steps)
- [Before/After Examples](#beforeafter-examples)
- [Backward Compatibility](#backward-compatibility)
- [Testing Your Migration](#testing-your-migration)
- [Troubleshooting](#troubleshooting)

---

## Overview

Simply-MCP v4.0.0 introduces **100% spec-compliant** MCP UI protocol support. This update aligns with the official [@mcp-ui](https://github.com/idosal/mcp-ui) specification and enables seamless interoperability with other MCP-UI implementations.

### What You Need to Know

- ✅ **New Protocol**: Official nested `payload` structure
- ✅ **MessageId Correlation**: Proper request/response matching
- ✅ **5 Action Types**: Complete protocol support
- ⚠️ **Legacy Support**: Old formats temporarily supported
- 📅 **Deprecation Timeline**: Legacy formats will be removed in v5.0.0

---

## What Changed

### 1. PostMessage Protocol Format

**Legacy format (pre-v4.0.0):**
```javascript
window.parent.postMessage({
  type: 'MCP_UI_ACTION',
  action: {
    type: 'CALL_TOOL',
    toolName: 'add',
    params: { a: 5, b: 3 }
  }
}, '*');
```

**New format (v4.0.0+):**
```javascript
window.parent.postMessage({
  type: 'tool',
  payload: {
    toolName: 'add',
    params: { a: 5, b: 3 }
  },
  messageId: 'msg_' + Date.now()
}, '*');
```

### 2. Action Type Names

| Legacy Type | New Type | Description |
|-------------|----------|-------------|
| `CALL_TOOL` | `tool` | Execute MCP tool |
| `SHOW_NOTIFICATION` | `notify` | Show notification |
| `SUBMIT_TO_LLM` | `prompt` | Submit to LLM |
| (none) | `intent` | Platform intent |
| `NAVIGATE` | `link` | Navigate URL |

### 3. Response Format

**Legacy response:**
```javascript
{
  type: 'MCP_UI_RESPONSE',
  callbackId: '123',
  result: { sum: 8 }
}
```

**New response:**
```javascript
// Phase 1: Acknowledgment
{
  type: 'acknowledgment',
  messageId: 'msg_123'
}

// Phase 2: Result
{
  type: 'result',
  messageId: 'msg_123',
  result: { sum: 8 }
}
```

### 4. MessageId vs CallbackId

**Legacy:**
- Used `callbackId` for correlation
- Single response per request

**New:**
- Uses `messageId` for correlation
- Two-phase response (acknowledgment + result)
- Better async handling

---

## Breaking Changes

### 1. Message Structure (Required Update)

**What changed:**
- Top-level `type` is now the action type (not 'MCP_UI_ACTION')
- Action details moved to `payload` object
- `messageId` required for request/response correlation

**Impact:**
- All postMessage calls must be updated
- Response handling logic must be updated

### 2. Action Type Names (Required Update)

**What changed:**
- Action types are lowercase and simplified
- SCREAMING_SNAKE_CASE → lowercase

**Impact:**
- String comparisons must be updated
- Switch statements must be updated

### 3. Response Handling (Required Update)

**What changed:**
- Two-phase response pattern
- Must handle both acknowledgment and result

**Impact:**
- Response listeners must be updated
- Promise-based wrappers must be updated

---

## Migration Steps

### Step 1: Identify UI Resources

Find all UI resources in your codebase:

```bash
# Search for postMessage calls
grep -r "postMessage" examples/

# Search for IUI interfaces
grep -r "extends IUI" src/
```

### Step 2: Update PostMessage Calls

Update all `window.parent.postMessage()` calls to use the new format.

**Legacy code:**
```javascript
window.parent.postMessage({
  type: 'MCP_UI_ACTION',
  action: {
    type: 'CALL_TOOL',
    toolName: 'add',
    params: { a: 5, b: 3 }
  }
}, '*');
```

**Updated code:**
```javascript
window.parent.postMessage({
  type: 'tool',
  payload: {
    toolName: 'add',
    params: { a: 5, b: 3 }
  },
  messageId: 'msg_' + Date.now()
}, '*');
```

### Step 3: Update Response Handlers

Update event listeners to handle the new response format.

**Legacy code:**
```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'MCP_UI_RESPONSE') {
    if (event.data.callbackId === myCallbackId) {
      handleResult(event.data.result);
    }
  }
});
```

**Updated code:**
```javascript
window.addEventListener('message', (event) => {
  const data = event.data;

  // Handle acknowledgment
  if (data.type === 'acknowledgment' && data.messageId === myMessageId) {
    console.log('Request acknowledged');
  }

  // Handle result
  if (data.type === 'result' && data.messageId === myMessageId) {
    if (data.error) {
      handleError(data.error);
    } else {
      handleResult(data.result);
    }
  }
});
```

### Step 4: Update Action Types

Replace legacy action type names with new ones.

**Legacy types:**
- `CALL_TOOL` → `tool`
- `SHOW_NOTIFICATION` → `notify`
- `SUBMIT_TO_LLM` → `prompt`
- `NAVIGATE` → `link`

**Example:**
```javascript
// Before
if (action.type === 'CALL_TOOL') { ... }

// After
if (action.type === 'tool') { ... }
```

### Step 5: Test Thoroughly

Run your server and test all UI interactions:

```bash
# Run server in dev mode
npx simply-mcp run server.ts --watch

# Test in browser/client
# Verify all tool calls work
# Check notifications display
# Test error handling
```

---

## Before/After Examples

### Example 1: Simple Tool Call

**Before (Legacy Format):**
```html
<script>
  async function calculate() {
    const a = parseInt(document.getElementById('a').value);
    const b = parseInt(document.getElementById('b').value);

    // Legacy format
    window.parent.postMessage({
      type: 'MCP_UI_ACTION',
      action: {
        type: 'CALL_TOOL',
        toolName: 'add',
        params: { a, b }
      }
    }, '*');
  }
</script>
```

**After (Spec-Compliant):**
```html
<script>
  async function calculate() {
    const a = parseInt(document.getElementById('a').value);
    const b = parseInt(document.getElementById('b').value);

    // New spec-compliant format
    const messageId = 'calc_' + Date.now();

    window.parent.postMessage({
      type: 'tool',
      payload: {
        toolName: 'add',
        params: { a, b }
      },
      messageId: messageId
    }, '*');

    // Listen for result
    window.addEventListener('message', function handler(event) {
      if (event.data.messageId === messageId && event.data.type === 'result') {
        if (event.data.error) {
          console.error('Error:', event.data.error);
        } else {
          console.log('Result:', event.data.result);
        }
        window.removeEventListener('message', handler);
      }
    });
  }
</script>
```

### Example 2: Show Notification

**Before (Legacy Format):**
```javascript
window.parent.postMessage({
  type: 'MCP_UI_ACTION',
  action: {
    type: 'SHOW_NOTIFICATION',
    level: 'success',
    message: 'Operation completed!'
  }
}, '*');
```

**After (Spec-Compliant):**
```javascript
window.parent.postMessage({
  type: 'notify',
  payload: {
    level: 'success',
    message: 'Operation completed!'
  }
}, '*');
```

### Example 3: Complete Calculator with Error Handling

**Before (Legacy):**
```html
<script>
  let callbackCounter = 0;
  const pendingCallbacks = new Map();

  async function callTool(toolName, params) {
    return new Promise((resolve, reject) => {
      const callbackId = 'cb_' + (callbackCounter++);
      pendingCallbacks.set(callbackId, { resolve, reject });

      window.parent.postMessage({
        type: 'MCP_UI_ACTION',
        action: {
          type: 'CALL_TOOL',
          toolName,
          params,
          callbackId
        }
      }, '*');

      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingCallbacks.has(callbackId)) {
          pendingCallbacks.delete(callbackId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  window.addEventListener('message', (event) => {
    if (event.data.type === 'MCP_UI_RESPONSE') {
      const callback = pendingCallbacks.get(event.data.callbackId);
      if (callback) {
        pendingCallbacks.delete(event.data.callbackId);
        if (event.data.error) {
          callback.reject(new Error(event.data.error));
        } else {
          callback.resolve(event.data.result);
        }
      }
    }
  });

  async function calculate() {
    try {
      const a = Number(document.getElementById('a').value);
      const b = Number(document.getElementById('b').value);

      const result = await callTool('add', { a, b });
      document.getElementById('result').textContent = 'Result: ' + result;
    } catch (error) {
      document.getElementById('result').textContent = 'Error: ' + error.message;
    }
  }
</script>
```

**After (Spec-Compliant):**
```html
<script>
  const pendingMessages = new Map();

  async function callTool(toolName, params) {
    return new Promise((resolve, reject) => {
      const messageId = 'msg_' + Date.now() + '_' + Math.random();
      pendingMessages.set(messageId, { resolve, reject });

      window.parent.postMessage({
        type: 'tool',
        payload: { toolName, params },
        messageId: messageId
      }, '*');

      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingMessages.has(messageId)) {
          pendingMessages.delete(messageId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  window.addEventListener('message', (event) => {
    const data = event.data;

    // Handle acknowledgment (optional)
    if (data.type === 'acknowledgment') {
      console.log('Message acknowledged:', data.messageId);
    }

    // Handle result
    if (data.type === 'result') {
      const pending = pendingMessages.get(data.messageId);
      if (pending) {
        pendingMessages.delete(data.messageId);
        if (data.error) {
          pending.reject(new Error(data.error.message || 'Unknown error'));
        } else {
          pending.resolve(data.result);
        }
      }
    }
  });

  async function calculate() {
    try {
      const a = Number(document.getElementById('a').value);
      const b = Number(document.getElementById('b').value);

      const result = await callTool('add', { a, b });
      document.getElementById('result').textContent = 'Result: ' + result;
    } catch (error) {
      document.getElementById('result').textContent = 'Error: ' + error.message;
    }
  }
</script>
```

### Example 4: SDK API Migration

**Before (Interface-based):**
```typescript
interface CalculatorUI extends IUI {
  uri: 'ui://calculator/v1';
  html: `<div>Calculator HTML here...</div>`;
}
```

**After (SDK API - Optional):**
```typescript
import { createUIResource } from 'simply-mcp';

// In tool implementation
showCalculator: ShowCalculatorTool = async () => {
  const resource = createUIResource({
    uri: 'ui://calculator/v1',
    content: {
      type: 'rawHtml',
      htmlString: `<div>Calculator HTML here...</div>`
    },
    metadata: {
      name: 'Calculator',
      description: 'Simple calculator interface'
    }
  });

  return { content: [resource] };
};
```

**Note:** Both approaches work in v4.0.0+. The SDK API is optional and provides compatibility with official @mcp-ui patterns.

---

## Real-World Examples

This section provides comprehensive, production-ready examples demonstrating how to build interactive UIs with Remote DOM. Each example includes complete, runnable code with explanations of key concepts and common pitfalls to avoid.

### Why Remote DOM?

Remote DOM provides several advantages over traditional HTML resources:

- **Interactive Components**: Build dynamic UIs with state management and event handling
- **Sandboxed Execution**: Scripts run in a Web Worker for security isolation
- **Component Library**: Use a whitelisted set of HTML elements and React components
- **Tool Integration**: Call MCP tools directly from UI components
- **Type Safety**: TypeScript interfaces provide compile-time validation

### Example 1: Form with Validation

A contact form with client-side validation, error display, and MCP tool integration.

**Use Case**: Collecting user input with validation before submitting to backend tools.

**Before (HTML Resource):**
```typescript
interface ContactFormUI extends IUI {
  uri: 'ui://contact/form';
  name: 'Contact Form';
  description: 'Static HTML form';

  html: `
    <form id="contact-form">
      <label>Name: <input type="text" id="name" required /></label>
      <label>Email: <input type="email" id="email" required /></label>
      <label>Message: <textarea id="message" required></textarea></label>
      <button type="submit">Submit</button>
      <div id="error" style="color: red; display: none;"></div>
    </form>

    <script>
      document.getElementById('contact-form').onsubmit = async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;
        const errorDiv = document.getElementById('error');

        // Basic validation
        if (!name || !email || !message) {
          errorDiv.textContent = 'All fields are required';
          errorDiv.style.display = 'block';
          return;
        }

        if (!email.includes('@')) {
          errorDiv.textContent = 'Invalid email address';
          errorDiv.style.display = 'block';
          return;
        }

        // Call tool using legacy format
        window.parent.postMessage({
          type: 'MCP_UI_ACTION',
          action: {
            type: 'CALL_TOOL',
            toolName: 'submit_contact',
            params: { name, email, message }
          }
        }, '*');
      };
    </script>
  `;
}
```

**After (Remote DOM):**
```typescript
interface ContactFormUI extends IUI {
  uri: 'ui://contact/form';
  name: 'Contact Form';
  description: 'Interactive form with validation using Remote DOM';

  // Remote DOM script with validation and state management
  remoteDom: `
    // Create form state
    let formData = { name: '', email: '', message: '' };
    let errors = { name: '', email: '', message: '' };
    let isSubmitting = false;

    // Validation functions
    function validateName(value) {
      if (!value || value.trim().length === 0) {
        return 'Name is required';
      }
      if (value.length < 2) {
        return 'Name must be at least 2 characters';
      }
      return '';
    }

    function validateEmail(value) {
      if (!value || value.trim().length === 0) {
        return 'Email is required';
      }
      // Simple email regex
      const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
      return '';
    }

    function validateMessage(value) {
      if (!value || value.trim().length === 0) {
        return 'Message is required';
      }
      if (value.length < 10) {
        return 'Message must be at least 10 characters';
      }
      return '';
    }

    // Render form
    function renderForm() {
      // Create container
      const container = remoteDOM.createElement('div', {
        style: {
          maxWidth: '500px',
          margin: '0 auto',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }
      });

      // Title
      const title = remoteDOM.createElement('h2');
      remoteDOM.setTextContent(title, 'Contact Us');
      remoteDOM.appendChild(container, title);

      // Form element
      const form = remoteDOM.createElement('form', {
        style: { display: 'flex', flexDirection: 'column', gap: '16px' }
      });

      // Name field
      const nameField = createFormField('name', 'Name', 'text', 'John Doe');
      remoteDOM.appendChild(form, nameField);

      // Email field
      const emailField = createFormField('email', 'Email', 'email', 'john@example.com');
      remoteDOM.appendChild(form, emailField);

      // Message field
      const messageLabel = remoteDOM.createElement('label', {
        style: { display: 'flex', flexDirection: 'column', gap: '4px' }
      });
      const messageLabelText = remoteDOM.createElement('span', {
        style: { fontWeight: '500', fontSize: '14px' }
      });
      remoteDOM.setTextContent(messageLabelText, 'Message');
      remoteDOM.appendChild(messageLabel, messageLabelText);

      const messageInput = remoteDOM.createElement('textarea', {
        id: 'message-input',
        placeholder: 'Your message here...',
        rows: 4,
        style: {
          padding: '8px',
          fontSize: '14px',
          border: errors.message ? '2px solid #dc3545' : '1px solid #ddd',
          borderRadius: '4px',
          fontFamily: 'inherit'
        }
      });
      remoteDOM.addEventListener(messageInput, 'input', (e) => {
        formData.message = e.target.value;
        errors.message = validateMessage(formData.message);
        renderForm(); // Re-render to show validation
      });
      remoteDOM.appendChild(messageLabel, messageInput);

      // Error message for message field
      if (errors.message) {
        const errorText = remoteDOM.createElement('span', {
          style: { color: '#dc3545', fontSize: '12px' }
        });
        remoteDOM.setTextContent(errorText, errors.message);
        remoteDOM.appendChild(messageLabel, errorText);
      }

      remoteDOM.appendChild(form, messageLabel);

      // Submit button
      const submitBtn = remoteDOM.createElement('button', {
        type: 'submit',
        disabled: isSubmitting,
        style: {
          padding: '12px 24px',
          backgroundColor: isSubmitting ? '#6c757d' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          fontWeight: '500',
          cursor: isSubmitting ? 'not-allowed' : 'pointer'
        }
      });
      remoteDOM.setTextContent(submitBtn, isSubmitting ? 'Submitting...' : 'Submit');
      remoteDOM.addEventListener(submitBtn, 'click', handleSubmit);
      remoteDOM.appendChild(form, submitBtn);

      remoteDOM.appendChild(container, form);
      return container;
    }

    // Helper to create form field with validation
    function createFormField(name, label, type, placeholder) {
      const fieldContainer = remoteDOM.createElement('label', {
        style: { display: 'flex', flexDirection: 'column', gap: '4px' }
      });

      const labelText = remoteDOM.createElement('span', {
        style: { fontWeight: '500', fontSize: '14px' }
      });
      remoteDOM.setTextContent(labelText, label);
      remoteDOM.appendChild(fieldContainer, labelText);

      const input = remoteDOM.createElement('input', {
        id: name + '-input',
        type: type,
        placeholder: placeholder,
        style: {
          padding: '8px',
          fontSize: '14px',
          border: errors[name] ? '2px solid #dc3545' : '1px solid #ddd',
          borderRadius: '4px'
        }
      });

      // Add input event listener
      remoteDOM.addEventListener(input, 'input', (e) => {
        formData[name] = e.target.value;
        // Validate on input
        if (name === 'name') errors.name = validateName(formData.name);
        if (name === 'email') errors.email = validateEmail(formData.email);
        renderForm(); // Re-render to show validation
      });

      remoteDOM.appendChild(fieldContainer, input);

      // Show error if present
      if (errors[name]) {
        const errorText = remoteDOM.createElement('span', {
          style: { color: '#dc3545', fontSize: '12px' }
        });
        remoteDOM.setTextContent(errorText, errors[name]);
        remoteDOM.appendChild(fieldContainer, errorText);
      }

      return fieldContainer;
    }

    // Handle form submission
    async function handleSubmit(e) {
      e.preventDefault();

      // Validate all fields
      errors.name = validateName(formData.name);
      errors.email = validateEmail(formData.email);
      errors.message = validateMessage(formData.message);

      // Check if any errors
      if (errors.name || errors.email || errors.message) {
        renderForm(); // Re-render to show errors
        return;
      }

      // Set submitting state
      isSubmitting = true;
      renderForm();

      try {
        // Call MCP tool
        remoteDOM.callHost('tool', {
          toolName: 'submit_contact',
          params: formData
        });

        // Show success notification
        remoteDOM.callHost('notify', {
          level: 'success',
          message: 'Contact form submitted successfully!'
        });

        // Reset form
        formData = { name: '', email: '', message: '' };
        errors = { name: '', email: '', message: '' };
      } catch (error) {
        // Show error notification
        remoteDOM.callHost('notify', {
          level: 'error',
          message: 'Failed to submit form: ' + error.message
        });
      } finally {
        isSubmitting = false;
        renderForm();
      }
    }

    // Initial render
    renderForm();
  `;
}
```

**Key Concepts:**

1. **State Management**: Form data and errors are tracked in variables
2. **Validation**: Client-side validation with immediate feedback
3. **Event Handlers**: Input events trigger validation and re-rendering
4. **Tool Integration**: `remoteDOM.callHost()` calls MCP tools
5. **Loading States**: Disabled button during submission
6. **Error Handling**: Try-catch for robust error handling

**Common Pitfalls:**

- **Not Re-rendering**: Forgetting to call `renderForm()` after state changes
- **Missing Validation**: Skipping client-side validation leads to poor UX
- **Event Bubbling**: Not calling `e.preventDefault()` on form submit
- **Memory Leaks**: In this approach, we re-render the entire form (simple but may not scale)

---

### Example 2: Multi-Step Wizard

A multi-step workflow with navigation, progress tracking, and data collection.

**Use Case**: Onboarding flows, surveys, or multi-page forms.

**Remote DOM Implementation:**
```typescript
interface OnboardingWizardUI extends IUI {
  uri: 'ui://onboarding/wizard';
  name: 'Onboarding Wizard';
  description: 'Multi-step wizard with progress tracking';

  remoteDom: `
    // Wizard state
    let currentStep = 0;
    let wizardData = {
      profile: { name: '', email: '' },
      preferences: { theme: 'light', notifications: true },
      complete: false
    };

    // Define wizard steps
    const steps = [
      { id: 'profile', title: 'Profile', description: 'Tell us about yourself' },
      { id: 'preferences', title: 'Preferences', description: 'Customize your experience' },
      { id: 'review', title: 'Review', description: 'Review your information' }
    ];

    // Render wizard
    function renderWizard() {
      // Main container
      const container = remoteDOM.createElement('div', {
        style: {
          maxWidth: '600px',
          margin: '0 auto',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }
      });

      // Progress bar
      const progressBar = createProgressBar();
      remoteDOM.appendChild(container, progressBar);

      // Step content
      const stepContent = createStepContent();
      remoteDOM.appendChild(container, stepContent);

      // Navigation buttons
      const navigation = createNavigation();
      remoteDOM.appendChild(container, navigation);

      return container;
    }

    // Create progress bar
    function createProgressBar() {
      const progressContainer = remoteDOM.createElement('div', {
        style: {
          marginBottom: '32px',
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }
      });

      // Progress steps
      const stepsContainer = remoteDOM.createElement('div', {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }
      });

      steps.forEach((step, index) => {
        const stepItem = remoteDOM.createElement('div', {
          style: {
            flex: 1,
            textAlign: 'center',
            position: 'relative'
          }
        });

        // Step circle
        const circle = remoteDOM.createElement('div', {
          style: {
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: index <= currentStep ? '#007bff' : '#e9ecef',
            color: index <= currentStep ? 'white' : '#6c757d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 8px',
            fontWeight: '600',
            fontSize: '14px'
          }
        });
        remoteDOM.setTextContent(circle, String(index + 1));
        remoteDOM.appendChild(stepItem, circle);

        // Step label
        const label = remoteDOM.createElement('div', {
          style: {
            fontSize: '12px',
            fontWeight: index === currentStep ? '600' : '400',
            color: index === currentStep ? '#007bff' : '#6c757d'
          }
        });
        remoteDOM.setTextContent(label, step.title);
        remoteDOM.appendChild(stepItem, label);

        remoteDOM.appendChild(stepsContainer, stepItem);
      });

      remoteDOM.appendChild(progressContainer, stepsContainer);

      // Progress bar line
      const progressLine = remoteDOM.createElement('div', {
        style: {
          height: '4px',
          backgroundColor: '#e9ecef',
          borderRadius: '2px',
          overflow: 'hidden'
        }
      });

      const progressFill = remoteDOM.createElement('div', {
        style: {
          height: '100%',
          backgroundColor: '#007bff',
          width: ((currentStep / (steps.length - 1)) * 100) + '%',
          transition: 'width 0.3s ease'
        }
      });
      remoteDOM.appendChild(progressLine, progressFill);
      remoteDOM.appendChild(progressContainer, progressLine);

      return progressContainer;
    }

    // Create step content
    function createStepContent() {
      const content = remoteDOM.createElement('div', {
        style: {
          minHeight: '300px',
          marginBottom: '24px',
          padding: '24px',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }
      });

      const step = steps[currentStep];

      // Step title
      const title = remoteDOM.createElement('h2', {
        style: { marginTop: 0, color: '#212529' }
      });
      remoteDOM.setTextContent(title, step.title);
      remoteDOM.appendChild(content, title);

      // Step description
      const description = remoteDOM.createElement('p', {
        style: { color: '#6c757d', marginBottom: '24px' }
      });
      remoteDOM.setTextContent(description, step.description);
      remoteDOM.appendChild(content, description);

      // Step-specific content
      if (step.id === 'profile') {
        const profileForm = createProfileStep();
        remoteDOM.appendChild(content, profileForm);
      } else if (step.id === 'preferences') {
        const preferencesForm = createPreferencesStep();
        remoteDOM.appendChild(content, preferencesForm);
      } else if (step.id === 'review') {
        const reviewContent = createReviewStep();
        remoteDOM.appendChild(content, reviewContent);
      }

      return content;
    }

    // Profile step
    function createProfileStep() {
      const form = remoteDOM.createElement('div', {
        style: { display: 'flex', flexDirection: 'column', gap: '16px' }
      });

      // Name input
      const nameLabel = remoteDOM.createElement('label', {
        style: { display: 'flex', flexDirection: 'column', gap: '4px' }
      });
      const nameText = remoteDOM.createElement('span', {
        style: { fontWeight: '500', fontSize: '14px' }
      });
      remoteDOM.setTextContent(nameText, 'Full Name');
      remoteDOM.appendChild(nameLabel, nameText);

      const nameInput = remoteDOM.createElement('input', {
        type: 'text',
        value: wizardData.profile.name,
        placeholder: 'Enter your full name',
        style: {
          padding: '10px',
          fontSize: '14px',
          border: '1px solid #ced4da',
          borderRadius: '4px'
        }
      });
      remoteDOM.addEventListener(nameInput, 'input', (e) => {
        wizardData.profile.name = e.target.value;
      });
      remoteDOM.appendChild(nameLabel, nameInput);
      remoteDOM.appendChild(form, nameLabel);

      // Email input
      const emailLabel = remoteDOM.createElement('label', {
        style: { display: 'flex', flexDirection: 'column', gap: '4px' }
      });
      const emailText = remoteDOM.createElement('span', {
        style: { fontWeight: '500', fontSize: '14px' }
      });
      remoteDOM.setTextContent(emailText, 'Email Address');
      remoteDOM.appendChild(emailLabel, emailText);

      const emailInput = remoteDOM.createElement('input', {
        type: 'email',
        value: wizardData.profile.email,
        placeholder: 'your.email@example.com',
        style: {
          padding: '10px',
          fontSize: '14px',
          border: '1px solid #ced4da',
          borderRadius: '4px'
        }
      });
      remoteDOM.addEventListener(emailInput, 'input', (e) => {
        wizardData.profile.email = e.target.value;
      });
      remoteDOM.appendChild(emailLabel, emailInput);
      remoteDOM.appendChild(form, emailLabel);

      return form;
    }

    // Preferences step
    function createPreferencesStep() {
      const form = remoteDOM.createElement('div', {
        style: { display: 'flex', flexDirection: 'column', gap: '20px' }
      });

      // Theme selection
      const themeSection = remoteDOM.createElement('div');
      const themeTitle = remoteDOM.createElement('h3', {
        style: { fontSize: '16px', marginBottom: '12px' }
      });
      remoteDOM.setTextContent(themeTitle, 'Choose Theme');
      remoteDOM.appendChild(themeSection, themeTitle);

      ['light', 'dark'].forEach((theme) => {
        const themeOption = remoteDOM.createElement('label', {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            marginBottom: '8px',
            cursor: 'pointer',
            backgroundColor: wizardData.preferences.theme === theme ? '#e7f3ff' : 'white'
          }
        });

        const radio = remoteDOM.createElement('input', {
          type: 'radio',
          name: 'theme',
          value: theme,
          checked: wizardData.preferences.theme === theme
        });
        remoteDOM.addEventListener(radio, 'change', () => {
          wizardData.preferences.theme = theme;
          renderWizard();
        });
        remoteDOM.appendChild(themeOption, radio);

        const themeLabel = remoteDOM.createElement('span');
        remoteDOM.setTextContent(themeLabel, theme.charAt(0).toUpperCase() + theme.slice(1));
        remoteDOM.appendChild(themeOption, themeLabel);

        remoteDOM.appendChild(themeSection, themeOption);
      });
      remoteDOM.appendChild(form, themeSection);

      // Notifications toggle
      const notifSection = remoteDOM.createElement('div');
      const notifLabel = remoteDOM.createElement('label', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer'
        }
      });

      const checkbox = remoteDOM.createElement('input', {
        type: 'checkbox',
        checked: wizardData.preferences.notifications
      });
      remoteDOM.addEventListener(checkbox, 'change', (e) => {
        wizardData.preferences.notifications = e.target.checked;
      });
      remoteDOM.appendChild(notifLabel, checkbox);

      const notifText = remoteDOM.createElement('span', {
        style: { fontSize: '14px' }
      });
      remoteDOM.setTextContent(notifText, 'Enable notifications');
      remoteDOM.appendChild(notifLabel, notifText);

      remoteDOM.appendChild(notifSection, notifLabel);
      remoteDOM.appendChild(form, notifSection);

      return form;
    }

    // Review step
    function createReviewStep() {
      const review = remoteDOM.createElement('div', {
        style: {
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px'
        }
      });

      // Profile section
      const profileSection = createReviewSection('Profile Information', [
        { label: 'Name', value: wizardData.profile.name },
        { label: 'Email', value: wizardData.profile.email }
      ]);
      remoteDOM.appendChild(review, profileSection);

      // Preferences section
      const prefsSection = createReviewSection('Preferences', [
        { label: 'Theme', value: wizardData.preferences.theme },
        { label: 'Notifications', value: wizardData.preferences.notifications ? 'Enabled' : 'Disabled' }
      ]);
      remoteDOM.appendChild(review, prefsSection);

      return review;
    }

    // Helper to create review section
    function createReviewSection(title, items) {
      const section = remoteDOM.createElement('div', {
        style: { marginBottom: '20px' }
      });

      const sectionTitle = remoteDOM.createElement('h4', {
        style: {
          fontSize: '14px',
          fontWeight: '600',
          color: '#495057',
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }
      });
      remoteDOM.setTextContent(sectionTitle, title);
      remoteDOM.appendChild(section, sectionTitle);

      items.forEach((item) => {
        const itemRow = remoteDOM.createElement('div', {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: '1px solid #dee2e6'
          }
        });

        const label = remoteDOM.createElement('span', {
          style: { fontWeight: '500', color: '#6c757d' }
        });
        remoteDOM.setTextContent(label, item.label);
        remoteDOM.appendChild(itemRow, label);

        const value = remoteDOM.createElement('span', {
          style: { color: '#212529' }
        });
        remoteDOM.setTextContent(value, item.value);
        remoteDOM.appendChild(itemRow, value);

        remoteDOM.appendChild(section, itemRow);
      });

      return section;
    }

    // Create navigation buttons
    function createNavigation() {
      const nav = remoteDOM.createElement('div', {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px'
        }
      });

      // Back button
      if (currentStep > 0) {
        const backBtn = remoteDOM.createElement('button', {
          style: {
            padding: '12px 24px',
            backgroundColor: 'white',
            color: '#007bff',
            border: '1px solid #007bff',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer',
            fontWeight: '500'
          }
        });
        remoteDOM.setTextContent(backBtn, 'Back');
        remoteDOM.addEventListener(backBtn, 'click', () => {
          currentStep--;
          renderWizard();
        });
        remoteDOM.appendChild(nav, backBtn);
      } else {
        // Spacer
        remoteDOM.appendChild(nav, remoteDOM.createElement('div'));
      }

      // Next/Finish button
      const nextBtn = remoteDOM.createElement('button', {
        style: {
          padding: '12px 24px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: 'pointer',
          fontWeight: '500'
        }
      });

      const isLastStep = currentStep === steps.length - 1;
      remoteDOM.setTextContent(nextBtn, isLastStep ? 'Finish' : 'Next');

      remoteDOM.addEventListener(nextBtn, 'click', async () => {
        if (isLastStep) {
          // Submit wizard data
          try {
            remoteDOM.callHost('tool', {
              toolName: 'complete_onboarding',
              params: wizardData
            });

            remoteDOM.callHost('notify', {
              level: 'success',
              message: 'Onboarding completed successfully!'
            });
          } catch (error) {
            remoteDOM.callHost('notify', {
              level: 'error',
              message: 'Failed to complete onboarding: ' + error.message
            });
          }
        } else {
          // Validate current step before proceeding
          if (currentStep === 0) {
            if (!wizardData.profile.name || !wizardData.profile.email) {
              remoteDOM.callHost('notify', {
                level: 'warning',
                message: 'Please fill in all required fields'
              });
              return;
            }
          }

          currentStep++;
          renderWizard();
        }
      });

      remoteDOM.appendChild(nav, nextBtn);

      return nav;
    }

    // Initial render
    renderWizard();
  `;
}
```

**Key Concepts:**

1. **Step Management**: Track current step and wizard state
2. **Progress Visualization**: Visual progress bar with step indicators
3. **Conditional Rendering**: Different content for each step
4. **Navigation**: Back/Next buttons with validation
5. **Data Collection**: Aggregate data across multiple steps
6. **Validation**: Check required fields before advancing

**Common Pitfalls:**

- **Not Validating Steps**: Allow users to skip required fields
- **Lost State**: Forgetting to preserve data when navigating between steps
- **Poor UX**: Not showing progress or current step clearly
- **Missing Back Button**: Users can't review/edit previous steps

---

### Example 3: Data Table with Operations

An interactive table with sorting, filtering, and CRUD operations.

**Use Case**: Admin panels, data management interfaces, or dashboards.

**Remote DOM Implementation:**
```typescript
interface UserTableUI extends IUI {
  uri: 'ui://users/table';
  name: 'User Management Table';
  description: 'Interactive table with sorting and filtering';

  remoteDom: `
    // Table state
    let users = [
      { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', status: 'active' },
      { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'User', status: 'active' },
      { id: 3, name: 'Carol White', email: 'carol@example.com', role: 'User', status: 'inactive' },
      { id: 4, name: 'David Brown', email: 'david@example.com', role: 'Editor', status: 'active' },
      { id: 5, name: 'Eve Davis', email: 'eve@example.com', role: 'User', status: 'active' }
    ];

    let sortColumn = 'name';
    let sortDirection = 'asc'; // 'asc' or 'desc'
    let filterText = '';
    let selectedUsers = new Set();

    // Render table
    function renderTable() {
      const container = remoteDOM.createElement('div', {
        style: {
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          maxWidth: '1200px',
          margin: '0 auto'
        }
      });

      // Header with title and actions
      const header = createHeader();
      remoteDOM.appendChild(container, header);

      // Filter and bulk actions bar
      const toolbar = createToolbar();
      remoteDOM.appendChild(container, toolbar);

      // Table
      const table = createDataTable();
      remoteDOM.appendChild(container, table);

      // Summary
      const summary = createSummary();
      remoteDOM.appendChild(container, summary);

      return container;
    }

    // Create header
    function createHeader() {
      const header = remoteDOM.createElement('div', {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }
      });

      const title = remoteDOM.createElement('h1', {
        style: { margin: 0, fontSize: '24px', color: '#212529' }
      });
      remoteDOM.setTextContent(title, 'User Management');
      remoteDOM.appendChild(header, title);

      const addBtn = remoteDOM.createElement('button', {
        style: {
          padding: '10px 20px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer'
        }
      });
      remoteDOM.setTextContent(addBtn, '+ Add User');
      remoteDOM.addEventListener(addBtn, 'click', handleAddUser);
      remoteDOM.appendChild(header, addBtn);

      return header;
    }

    // Create toolbar
    function createToolbar() {
      const toolbar = remoteDOM.createElement('div', {
        style: {
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px'
        }
      });

      // Search input
      const searchInput = remoteDOM.createElement('input', {
        type: 'text',
        placeholder: 'Search users...',
        value: filterText,
        style: {
          flex: 1,
          padding: '8px 12px',
          border: '1px solid #ced4da',
          borderRadius: '4px',
          fontSize: '14px'
        }
      });
      remoteDOM.addEventListener(searchInput, 'input', (e) => {
        filterText = e.target.value.toLowerCase();
        renderTable();
      });
      remoteDOM.appendChild(toolbar, searchInput);

      // Bulk actions
      if (selectedUsers.size > 0) {
        const deleteBtn = remoteDOM.createElement('button', {
          style: {
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: 'pointer'
          }
        });
        remoteDOM.setTextContent(deleteBtn, 'Delete (' + selectedUsers.size + ')');
        remoteDOM.addEventListener(deleteBtn, 'click', handleBulkDelete);
        remoteDOM.appendChild(toolbar, deleteBtn);
      }

      return toolbar;
    }

    // Create data table
    function createDataTable() {
      const tableWrapper = remoteDOM.createElement('div', {
        style: {
          overflowX: 'auto',
          border: '1px solid #dee2e6',
          borderRadius: '4px'
        }
      });

      const table = remoteDOM.createElement('table', {
        style: {
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: 'white'
        }
      });

      // Table header
      const thead = remoteDOM.createElement('thead', {
        style: { backgroundColor: '#f8f9fa' }
      });
      const headerRow = remoteDOM.createElement('tr');

      // Checkbox column
      const checkboxTh = remoteDOM.createElement('th', {
        style: {
          padding: '12px',
          textAlign: 'left',
          fontWeight: '600',
          fontSize: '14px',
          color: '#495057',
          borderBottom: '2px solid #dee2e6',
          width: '40px'
        }
      });
      const selectAllCheckbox = remoteDOM.createElement('input', {
        type: 'checkbox',
        checked: selectedUsers.size === getFilteredUsers().length && users.length > 0
      });
      remoteDOM.addEventListener(selectAllCheckbox, 'change', (e) => {
        if (e.target.checked) {
          getFilteredUsers().forEach(user => selectedUsers.add(user.id));
        } else {
          selectedUsers.clear();
        }
        renderTable();
      });
      remoteDOM.appendChild(checkboxTh, selectAllCheckbox);
      remoteDOM.appendChild(headerRow, checkboxTh);

      // Data columns
      const columns = [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role' },
        { key: 'status', label: 'Status' }
      ];

      columns.forEach((col) => {
        const th = remoteDOM.createElement('th', {
          style: {
            padding: '12px',
            textAlign: 'left',
            fontWeight: '600',
            fontSize: '14px',
            color: '#495057',
            borderBottom: '2px solid #dee2e6',
            cursor: 'pointer',
            userSelect: 'none'
          }
        });

        const headerContent = remoteDOM.createElement('div', {
          style: { display: 'flex', alignItems: 'center', gap: '8px' }
        });

        const label = remoteDOM.createElement('span');
        remoteDOM.setTextContent(label, col.label);
        remoteDOM.appendChild(headerContent, label);

        // Sort indicator
        if (sortColumn === col.key) {
          const sortIcon = remoteDOM.createElement('span');
          remoteDOM.setTextContent(sortIcon, sortDirection === 'asc' ? '↑' : '↓');
          remoteDOM.appendChild(headerContent, sortIcon);
        }

        remoteDOM.appendChild(th, headerContent);

        // Sort on click
        remoteDOM.addEventListener(th, 'click', () => {
          if (sortColumn === col.key) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            sortColumn = col.key;
            sortDirection = 'asc';
          }
          renderTable();
        });

        remoteDOM.appendChild(headerRow, th);
      });

      // Actions column
      const actionsTh = remoteDOM.createElement('th', {
        style: {
          padding: '12px',
          textAlign: 'right',
          fontWeight: '600',
          fontSize: '14px',
          color: '#495057',
          borderBottom: '2px solid #dee2e6',
          width: '120px'
        }
      });
      remoteDOM.setTextContent(actionsTh, 'Actions');
      remoteDOM.appendChild(headerRow, actionsTh);

      remoteDOM.appendChild(thead, headerRow);
      remoteDOM.appendChild(table, thead);

      // Table body
      const tbody = remoteDOM.createElement('tbody');
      const filteredUsers = getFilteredUsers();
      const sortedUsers = getSortedUsers(filteredUsers);

      if (sortedUsers.length === 0) {
        const emptyRow = remoteDOM.createElement('tr');
        const emptyCell = remoteDOM.createElement('td', {
          colSpan: 6,
          style: {
            padding: '40px',
            textAlign: 'center',
            color: '#6c757d'
          }
        });
        remoteDOM.setTextContent(emptyCell, filterText ? 'No users found matching your search' : 'No users to display');
        remoteDOM.appendChild(emptyRow, emptyCell);
        remoteDOM.appendChild(tbody, emptyRow);
      } else {
        sortedUsers.forEach((user) => {
          const row = createUserRow(user);
          remoteDOM.appendChild(tbody, row);
        });
      }

      remoteDOM.appendChild(table, tbody);
      remoteDOM.appendChild(tableWrapper, table);

      return tableWrapper;
    }

    // Create user row
    function createUserRow(user) {
      const row = remoteDOM.createElement('tr', {
        style: {
          borderBottom: '1px solid #dee2e6',
          backgroundColor: selectedUsers.has(user.id) ? '#e7f3ff' : 'white'
        }
      });

      // Checkbox cell
      const checkboxTd = remoteDOM.createElement('td', {
        style: { padding: '12px' }
      });
      const checkbox = remoteDOM.createElement('input', {
        type: 'checkbox',
        checked: selectedUsers.has(user.id)
      });
      remoteDOM.addEventListener(checkbox, 'change', (e) => {
        if (e.target.checked) {
          selectedUsers.add(user.id);
        } else {
          selectedUsers.delete(user.id);
        }
        renderTable();
      });
      remoteDOM.appendChild(checkboxTd, checkbox);
      remoteDOM.appendChild(row, checkboxTd);

      // Data cells
      const nameTd = remoteDOM.createElement('td', {
        style: { padding: '12px', fontWeight: '500' }
      });
      remoteDOM.setTextContent(nameTd, user.name);
      remoteDOM.appendChild(row, nameTd);

      const emailTd = remoteDOM.createElement('td', {
        style: { padding: '12px', color: '#6c757d' }
      });
      remoteDOM.setTextContent(emailTd, user.email);
      remoteDOM.appendChild(row, emailTd);

      const roleTd = remoteDOM.createElement('td', {
        style: { padding: '12px' }
      });
      const roleBadge = remoteDOM.createElement('span', {
        style: {
          padding: '4px 8px',
          backgroundColor: getRoleBadgeColor(user.role),
          color: 'white',
          borderRadius: '3px',
          fontSize: '12px',
          fontWeight: '500'
        }
      });
      remoteDOM.setTextContent(roleBadge, user.role);
      remoteDOM.appendChild(roleTd, roleBadge);
      remoteDOM.appendChild(row, roleTd);

      const statusTd = remoteDOM.createElement('td', {
        style: { padding: '12px' }
      });
      const statusBadge = remoteDOM.createElement('span', {
        style: {
          padding: '4px 8px',
          backgroundColor: user.status === 'active' ? '#28a745' : '#6c757d',
          color: 'white',
          borderRadius: '3px',
          fontSize: '12px',
          fontWeight: '500'
        }
      });
      remoteDOM.setTextContent(statusBadge, user.status);
      remoteDOM.appendChild(statusTd, statusBadge);
      remoteDOM.appendChild(row, statusTd);

      // Actions cell
      const actionsTd = remoteDOM.createElement('td', {
        style: {
          padding: '12px',
          textAlign: 'right'
        }
      });

      const actionsContainer = remoteDOM.createElement('div', {
        style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' }
      });

      const editBtn = remoteDOM.createElement('button', {
        style: {
          padding: '6px 12px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          fontSize: '12px',
          cursor: 'pointer'
        }
      });
      remoteDOM.setTextContent(editBtn, 'Edit');
      remoteDOM.addEventListener(editBtn, 'click', () => handleEditUser(user));
      remoteDOM.appendChild(actionsContainer, editBtn);

      const deleteBtn = remoteDOM.createElement('button', {
        style: {
          padding: '6px 12px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          fontSize: '12px',
          cursor: 'pointer'
        }
      });
      remoteDOM.setTextContent(deleteBtn, 'Delete');
      remoteDOM.addEventListener(deleteBtn, 'click', () => handleDeleteUser(user));
      remoteDOM.appendChild(actionsContainer, deleteBtn);

      remoteDOM.appendChild(actionsTd, actionsContainer);
      remoteDOM.appendChild(row, actionsTd);

      return row;
    }

    // Create summary
    function createSummary() {
      const summary = remoteDOM.createElement('div', {
        style: {
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#6c757d',
          textAlign: 'center'
        }
      });

      const filteredCount = getFilteredUsers().length;
      const totalCount = users.length;
      const text = filterText
        ? 'Showing ' + filteredCount + ' of ' + totalCount + ' users'
        : 'Showing ' + totalCount + ' users';

      remoteDOM.setTextContent(summary, text);
      return summary;
    }

    // Helper functions
    function getFilteredUsers() {
      if (!filterText) return users;
      return users.filter((user) =>
        user.name.toLowerCase().includes(filterText) ||
        user.email.toLowerCase().includes(filterText) ||
        user.role.toLowerCase().includes(filterText)
      );
    }

    function getSortedUsers(userList) {
      return [...userList].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        if (sortDirection === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });
    }

    function getRoleBadgeColor(role) {
      const colors = {
        'Admin': '#dc3545',
        'Editor': '#ffc107',
        'User': '#007bff'
      };
      return colors[role] || '#6c757d';
    }

    // Action handlers
    function handleAddUser() {
      remoteDOM.callHost('tool', {
        toolName: 'show_user_form',
        params: { mode: 'create' }
      });
    }

    function handleEditUser(user) {
      remoteDOM.callHost('tool', {
        toolName: 'show_user_form',
        params: { mode: 'edit', userId: user.id }
      });
    }

    async function handleDeleteUser(user) {
      try {
        remoteDOM.callHost('tool', {
          toolName: 'delete_user',
          params: { userId: user.id }
        });

        // Remove from local state
        users = users.filter((u) => u.id !== user.id);
        selectedUsers.delete(user.id);
        renderTable();

        remoteDOM.callHost('notify', {
          level: 'success',
          message: 'User deleted successfully'
        });
      } catch (error) {
        remoteDOM.callHost('notify', {
          level: 'error',
          message: 'Failed to delete user: ' + error.message
        });
      }
    }

    async function handleBulkDelete() {
      try {
        const userIds = Array.from(selectedUsers);

        remoteDOM.callHost('tool', {
          toolName: 'bulk_delete_users',
          params: { userIds }
        });

        // Remove from local state
        users = users.filter((u) => !selectedUsers.has(u.id));
        selectedUsers.clear();
        renderTable();

        remoteDOM.callHost('notify', {
          level: 'success',
          message: userIds.length + ' users deleted successfully'
        });
      } catch (error) {
        remoteDOM.callHost('notify', {
          level: 'error',
          message: 'Failed to delete users: ' + error.message
        });
      }
    }

    // Initial render
    renderTable();
  `;
}
```

**Key Concepts:**

1. **Sorting**: Click column headers to sort (ascending/descending)
2. **Filtering**: Real-time search across multiple fields
3. **Selection**: Individual and bulk selection with checkboxes
4. **CRUD Operations**: Create, Read, Update, Delete users
5. **Responsive UI**: Handles empty states and dynamic data
6. **Bulk Actions**: Perform operations on multiple items

**Common Pitfalls:**

- **Not Preserving State**: Losing sort/filter state during re-renders
- **Performance**: Re-rendering entire table on every change (consider virtualization for large datasets)
- **Selection Logic**: Not clearing selection after bulk delete
- **Missing Feedback**: Not showing confirmation for destructive actions

---

### Example 4: File Upload Interface (Bonus)

A file upload component with drag-and-drop, progress tracking, and preview.

**Use Case**: Document management, image uploads, or attachment handling.

**Note**: This example demonstrates the UI patterns. Actual file upload would require additional backend tool implementation.

**Remote DOM Implementation:**
```typescript
interface FileUploadUI extends IUI {
  uri: 'ui://upload/files';
  name: 'File Upload Interface';
  description: 'Drag-and-drop file upload with progress tracking';

  remoteDom: `
    // Upload state
    let files = [];
    let isDragging = false;
    let uploadProgress = new Map(); // fileId -> progress percentage

    // Render upload interface
    function renderUpload() {
      const container = remoteDOM.createElement('div', {
        style: {
          maxWidth: '800px',
          margin: '0 auto',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }
      });

      const title = remoteDOM.createElement('h2', {
        style: { marginBottom: '24px' }
      });
      remoteDOM.setTextContent(title, 'Upload Files');
      remoteDOM.appendChild(container, title);

      // Drop zone
      const dropZone = createDropZone();
      remoteDOM.appendChild(container, dropZone);

      // File list
      if (files.length > 0) {
        const fileList = createFileList();
        remoteDOM.appendChild(container, fileList);

        // Upload button
        const uploadBtn = createUploadButton();
        remoteDOM.appendChild(container, uploadBtn);
      }

      return container;
    }

    // Create drop zone
    function createDropZone() {
      const dropZone = remoteDOM.createElement('div', {
        style: {
          border: isDragging ? '2px dashed #007bff' : '2px dashed #dee2e6',
          borderRadius: '8px',
          padding: '60px 20px',
          textAlign: 'center',
          backgroundColor: isDragging ? '#e7f3ff' : '#f8f9fa',
          cursor: 'pointer',
          marginBottom: '24px',
          transition: 'all 0.2s'
        }
      });

      // Icon
      const icon = remoteDOM.createElement('div', {
        style: {
          fontSize: '48px',
          marginBottom: '16px'
        }
      });
      remoteDOM.setTextContent(icon, '📁');
      remoteDOM.appendChild(dropZone, icon);

      // Text
      const text = remoteDOM.createElement('p', {
        style: {
          fontSize: '16px',
          color: '#495057',
          marginBottom: '8px'
        }
      });
      remoteDOM.setTextContent(text, 'Drag and drop files here');
      remoteDOM.appendChild(dropZone, text);

      // Subtext
      const subtext = remoteDOM.createElement('p', {
        style: {
          fontSize: '14px',
          color: '#6c757d',
          marginBottom: '16px'
        }
      });
      remoteDOM.setTextContent(subtext, 'or');
      remoteDOM.appendChild(dropZone, subtext);

      // Browse button
      const browseBtn = remoteDOM.createElement('button', {
        style: {
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer'
        }
      });
      remoteDOM.setTextContent(browseBtn, 'Browse Files');
      remoteDOM.addEventListener(browseBtn, 'click', handleBrowseClick);
      remoteDOM.appendChild(dropZone, browseBtn);

      // NOTE: In a real implementation, you would use a file input element
      // For Remote DOM, file selection would trigger a tool call to get file metadata
      remoteDOM.addEventListener(dropZone, 'click', (e) => {
        if (e.target !== browseBtn) {
          handleBrowseClick();
        }
      });

      // Drag events (visual feedback only - actual file handling via tools)
      remoteDOM.addEventListener(dropZone, 'dragover', (e) => {
        e.preventDefault();
        isDragging = true;
        renderUpload();
      });

      remoteDOM.addEventListener(dropZone, 'dragleave', () => {
        isDragging = false;
        renderUpload();
      });

      return dropZone;
    }

    // Create file list
    function createFileList() {
      const listContainer = remoteDOM.createElement('div', {
        style: {
          marginBottom: '24px'
        }
      });

      const listTitle = remoteDOM.createElement('h3', {
        style: {
          fontSize: '16px',
          marginBottom: '12px'
        }
      });
      remoteDOM.setTextContent(listTitle, 'Selected Files (' + files.length + ')');
      remoteDOM.appendChild(listContainer, listTitle);

      files.forEach((file, index) => {
        const fileItem = createFileItem(file, index);
        remoteDOM.appendChild(listContainer, fileItem);
      });

      return listContainer;
    }

    // Create file item
    function createFileItem(file, index) {
      const item = remoteDOM.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          marginBottom: '8px'
        }
      });

      // File icon
      const icon = remoteDOM.createElement('div', {
        style: {
          fontSize: '24px',
          width: '40px',
          textAlign: 'center'
        }
      });
      remoteDOM.setTextContent(icon, getFileIcon(file.type));
      remoteDOM.appendChild(item, icon);

      // File info
      const info = remoteDOM.createElement('div', {
        style: { flex: 1 }
      });

      const name = remoteDOM.createElement('div', {
        style: {
          fontWeight: '500',
          fontSize: '14px',
          marginBottom: '4px'
        }
      });
      remoteDOM.setTextContent(name, file.name);
      remoteDOM.appendChild(info, name);

      const size = remoteDOM.createElement('div', {
        style: {
          fontSize: '12px',
          color: '#6c757d'
        }
      });
      remoteDOM.setTextContent(size, formatFileSize(file.size));
      remoteDOM.appendChild(info, size);

      // Progress bar (if uploading)
      if (uploadProgress.has(file.id)) {
        const progress = uploadProgress.get(file.id);
        const progressBar = createProgressBar(progress);
        remoteDOM.appendChild(info, progressBar);
      }

      remoteDOM.appendChild(item, info);

      // Remove button
      const removeBtn = remoteDOM.createElement('button', {
        style: {
          padding: '6px 12px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          fontSize: '12px',
          cursor: 'pointer'
        }
      });
      remoteDOM.setTextContent(removeBtn, 'Remove');
      remoteDOM.addEventListener(removeBtn, 'click', () => {
        files.splice(index, 1);
        uploadProgress.delete(file.id);
        renderUpload();
      });
      remoteDOM.appendChild(item, removeBtn);

      return item;
    }

    // Create progress bar
    function createProgressBar(progress) {
      const container = remoteDOM.createElement('div', {
        style: {
          marginTop: '8px',
          backgroundColor: '#e9ecef',
          borderRadius: '4px',
          height: '4px',
          overflow: 'hidden'
        }
      });

      const bar = remoteDOM.createElement('div', {
        style: {
          height: '100%',
          backgroundColor: '#007bff',
          width: progress + '%',
          transition: 'width 0.3s ease'
        }
      });
      remoteDOM.appendChild(container, bar);

      return container;
    }

    // Create upload button
    function createUploadButton() {
      const btnContainer = remoteDOM.createElement('div', {
        style: {
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }
      });

      const clearBtn = remoteDOM.createElement('button', {
        style: {
          padding: '10px 20px',
          backgroundColor: 'white',
          color: '#6c757d',
          border: '1px solid #ced4da',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer'
        }
      });
      remoteDOM.setTextContent(clearBtn, 'Clear All');
      remoteDOM.addEventListener(clearBtn, 'click', () => {
        files = [];
        uploadProgress.clear();
        renderUpload();
      });
      remoteDOM.appendChild(btnContainer, clearBtn);

      const uploadBtn = remoteDOM.createElement('button', {
        style: {
          padding: '10px 20px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer'
        }
      });
      remoteDOM.setTextContent(uploadBtn, 'Upload ' + files.length + ' File(s)');
      remoteDOM.addEventListener(uploadBtn, 'click', handleUpload);
      remoteDOM.appendChild(btnContainer, uploadBtn);

      return btnContainer;
    }

    // Helper functions
    function getFileIcon(type) {
      if (type.startsWith('image/')) return '🖼️';
      if (type.startsWith('video/')) return '🎥';
      if (type.startsWith('audio/')) return '🎵';
      if (type.includes('pdf')) return '📄';
      if (type.includes('zip') || type.includes('rar')) return '🗜️';
      return '📎';
    }

    function formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Action handlers
    function handleBrowseClick() {
      // In a real implementation, this would open a file picker
      // For Remote DOM, we call a tool to get file selection
      remoteDOM.callHost('tool', {
        toolName: 'select_files',
        params: { multiple: true }
      });

      // Simulate file selection for demo
      const mockFile = {
        id: 'file_' + Date.now(),
        name: 'example-document.pdf',
        type: 'application/pdf',
        size: 1024 * 512 // 512 KB
      };
      files.push(mockFile);
      renderUpload();
    }

    async function handleUpload() {
      try {
        // Start upload for all files
        files.forEach((file) => {
          uploadProgress.set(file.id, 0);
        });
        renderUpload();

        // Call upload tool
        remoteDOM.callHost('tool', {
          toolName: 'upload_files',
          params: {
            files: files.map((f) => ({
              id: f.id,
              name: f.name,
              type: f.type,
              size: f.size
            }))
          }
        });

        // Simulate progress updates
        // In a real implementation, progress would come from tool responses
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          files.forEach((file) => {
            uploadProgress.set(file.id, progress);
          });
          renderUpload();

          if (progress >= 100) {
            clearInterval(interval);

            // Show success notification
            remoteDOM.callHost('notify', {
              level: 'success',
              message: files.length + ' file(s) uploaded successfully!'
            });

            // Clear files after upload
            setTimeout(() => {
              files = [];
              uploadProgress.clear();
              renderUpload();
            }, 1000);
          }
        }, 300);

      } catch (error) {
        remoteDOM.callHost('notify', {
          level: 'error',
          message: 'Failed to upload files: ' + error.message
        });
      }
    }

    // Initial render
    renderUpload();
  `;
}
```

**Key Concepts:**

1. **Drag-and-Drop**: Visual feedback for drag events
2. **File Management**: Add, remove, and track multiple files
3. **Progress Tracking**: Per-file upload progress
4. **File Metadata**: Display file type, size, and name
5. **Batch Operations**: Upload multiple files at once
6. **Visual Feedback**: Icons, progress bars, and notifications

**Common Pitfalls:**

- **Browser Limitations**: Remote DOM runs in Web Worker, so direct file access is limited
- **File Size**: Not validating file size before upload
- **File Types**: Not restricting allowed file types
- **Progress Tracking**: Not handling upload failures or partial uploads
- **Memory**: Not cleaning up after upload completion

**Note**: File upload in Remote DOM requires coordination between the UI and backend tools, as Web Workers don't have direct file system access. The actual file selection and upload would be handled via MCP tool calls.

---

## Summary of Examples

| Example | Use Case | Key Features | Complexity |
|---------|----------|--------------|------------|
| Form with Validation | Data collection | Client-side validation, error display, tool integration | ⭐⭐ Medium |
| Multi-Step Wizard | Onboarding, surveys | Step navigation, progress tracking, state management | ⭐⭐⭐ Advanced |
| Data Table | Admin panels | Sorting, filtering, CRUD operations, bulk actions | ⭐⭐⭐ Advanced |
| File Upload | Document management | Drag-and-drop, progress tracking, file preview | ⭐⭐⭐⭐ Expert |

### Best Practices Across All Examples

1. **State Management**: Keep state in variables, re-render on changes
2. **Validation**: Validate client-side before calling tools
3. **Error Handling**: Always use try-catch for tool calls
4. **User Feedback**: Show loading states, progress, and notifications
5. **Accessibility**: Use semantic HTML and ARIA attributes
6. **Performance**: Only re-render what changed (consider selective updates for large UIs)

### Next Steps

- Review the [MCP UI Protocol Reference](./MCP_UI_PROTOCOL.md) for complete protocol details
- Check [API Reference](./API_REFERENCE.md) for tool and resource definitions
- Explore [examples/](../../examples/) for more code samples
- Test your implementations with the dry-run command

---

## Backward Compatibility

### Temporary Support for Legacy Formats

Simply-MCP v4.0.0 includes **temporary backward compatibility** for legacy message formats:

**What's supported:**
- ✅ Legacy `MCP_UI_ACTION` wrapper
- ✅ Legacy action type names (CALL_TOOL, etc.)
- ✅ Legacy `callbackId` correlation
- ✅ Single-phase response format

**What happens:**
1. Server receives legacy format
2. Server internally translates to new format
3. Server processes action
4. Server sends new format response
5. Client must handle new response format

**Important:**
- Legacy support is **one-way** (server accepts legacy, responds with new format)
- Clients must be updated to handle new response format
- Legacy support will be removed in v5.0.0

### Migration Timeline

| Version | Legacy Support | Recommendation |
|---------|----------------|----------------|
| v3.x | Native | Stable, no migration needed |
| v4.0-v4.x | Temporary | Migrate as soon as possible |
| v5.0+ | Removed | Must use new format |

**Recommended migration path:**
1. Update to v4.0.0
2. Test with legacy format (should still work)
3. Migrate to new format incrementally
4. Test thoroughly
5. Complete migration before v5.0.0

---

## Testing Your Migration

### 1. Unit Tests

Test individual postMessage calls:

```typescript
describe('UI postMessage migration', () => {
  it('sends spec-compliant tool call', (done) => {
    // Mock parent window
    const mockParent = {
      postMessage: jest.fn()
    };

    // Send message
    mockParent.postMessage({
      type: 'tool',
      payload: {
        toolName: 'add',
        params: { a: 5, b: 3 }
      },
      messageId: 'test_123'
    }, '*');

    // Verify format
    expect(mockParent.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tool',
        payload: expect.objectContaining({
          toolName: 'add',
          params: { a: 5, b: 3 }
        }),
        messageId: expect.stringMatching(/test_123/)
      }),
      '*'
    );

    done();
  });
});
```

### 2. Integration Tests

Test end-to-end UI interactions:

```bash
# Start server
npx simply-mcp run server.ts

# In browser console:
# 1. Open UI resource
# 2. Trigger tool call
# 3. Verify response format
# 4. Check error handling
```

### 3. Manual Testing Checklist

- [ ] Tool calls work correctly
- [ ] Notifications display properly
- [ ] Error messages show correctly
- [ ] MessageId correlation works
- [ ] Two-phase responses handled
- [ ] Timeout handling works
- [ ] Multiple concurrent calls work
- [ ] No console errors

### 4. Validation

Use the dry-run command to validate server configuration:

```bash
npx simply-mcp run server.ts --dry-run

# Should show:
# ✓ Server: my-server v1.0.0
# ✓ Tools: 3
# ✓ UI Resources: 2
# ✓ Protocol: MCP UI 2024-11-05 (spec-compliant)
```

---

## Troubleshooting

### Issue 1: "No response received"

**Symptom:** Tool call sent, but no response

**Cause:** Client waiting for legacy response format

**Solution:** Update client to handle new response format with `messageId`

```javascript
// Wrong - waiting for legacy format
if (event.data.type === 'MCP_UI_RESPONSE') { ... }

// Correct - waiting for new format
if (event.data.type === 'result' && event.data.messageId === myMessageId) { ... }
```

### Issue 2: "MessageId undefined"

**Symptom:** Error: "Cannot read property 'messageId' of undefined"

**Cause:** Not sending `messageId` in request

**Solution:** Always include unique `messageId`

```javascript
// Wrong - no messageId
window.parent.postMessage({
  type: 'tool',
  payload: { ... }
}, '*');

// Correct - includes messageId
window.parent.postMessage({
  type: 'tool',
  payload: { ... },
  messageId: 'msg_' + Date.now()
}, '*');
```

### Issue 3: "Multiple responses received"

**Symptom:** Handler called multiple times for same request

**Cause:** Not removing event listener after response

**Solution:** Remove listener after handling result

```javascript
window.addEventListener('message', function handler(event) {
  if (event.data.messageId === myMessageId && event.data.type === 'result') {
    handleResult(event.data.result);
    // IMPORTANT: Remove listener
    window.removeEventListener('message', handler);
  }
});
```

### Issue 4: "Action type not recognized"

**Symptom:** Server logs "Unknown action type: CALL_TOOL"

**Cause:** Using legacy action type name

**Solution:** Use lowercase action types

```javascript
// Wrong - legacy type
type: 'CALL_TOOL'

// Correct - new type
type: 'tool'
```

### Issue 5: "Payload is undefined"

**Symptom:** Error: "Cannot read property 'toolName' of undefined"

**Cause:** Using legacy nested action structure

**Solution:** Move action details to payload

```javascript
// Wrong - legacy structure
{
  type: 'MCP_UI_ACTION',
  action: {
    type: 'CALL_TOOL',
    toolName: 'add',
    params: { ... }
  }
}

// Correct - new structure
{
  type: 'tool',
  payload: {
    toolName: 'add',
    params: { ... }
  },
  messageId: '...'
}
```

---

## Migration Checklist

Use this checklist to track your migration progress:

### Code Updates
- [ ] Updated all postMessage calls to new format
- [ ] Added messageId to all requests
- [ ] Updated action type names (CALL_TOOL → tool, etc.)
- [ ] Updated response handlers to use messageId
- [ ] Implemented two-phase response handling (acknowledgment + result)
- [ ] Updated error handling for new format
- [ ] Removed legacy callbackId references

### Testing
- [ ] All UI resources render correctly
- [ ] Tool calls execute successfully
- [ ] Notifications display properly
- [ ] Error messages work
- [ ] MessageId correlation verified
- [ ] Timeout handling tested
- [ ] Concurrent requests tested
- [ ] No console errors

### Documentation
- [ ] Updated code comments
- [ ] Updated README if needed
- [ ] Updated examples
- [ ] Documented any custom postMessage wrappers

### Deployment
- [ ] Tested in development
- [ ] Tested in staging
- [ ] Ready for production
- [ ] Monitoring in place

---

## Getting Help

### Resources

- [MCP UI Protocol Reference](./MCP_UI_PROTOCOL.md) - Complete protocol documentation
- [API Reference](./API_REFERENCE.md) - Complete API reference
- [Examples](../../examples/) - Working code examples
- [Official MCP-UI Spec](https://github.com/idosal/mcp-ui) - Specification

### Support

- **GitHub Issues**: [github.com/Clockwork-Innovations/simply-mcp-ts/issues](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)
- **Discussions**: [github.com/Clockwork-Innovations/simply-mcp-ts/discussions](https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions)

---

## Summary

### Key Changes

1. **Message Structure**: Flat structure with `type`, `payload`, `messageId`
2. **Action Types**: Lowercase names (`tool`, `notify`, `prompt`, `intent`, `link`)
3. **Responses**: Two-phase pattern (acknowledgment + result)
4. **Correlation**: `messageId` replaces `callbackId`

### Migration Path

1. Update postMessage calls
2. Update response handlers
3. Update action type comparisons
4. Test thoroughly
5. Deploy

### Timeline

- **Now**: Legacy format temporarily supported
- **v5.0.0**: Legacy format removed
- **Recommendation**: Migrate as soon as possible

---

## See Also

- **[Remote DOM Troubleshooting](./REMOTE_DOM_TROUBLESHOOTING.md)** - Comprehensive troubleshooting guide for Remote DOM issues (10+ common errors, debug techniques, performance optimization)
- **[Remote DOM Advanced Patterns](./REMOTE_DOM_ADVANCED.md)** - Performance optimizations and security hardening (lazy loading, CSP validation, operation batching, resource limits)
- **[MCP UI Protocol Guide](./MCP_UI_PROTOCOL.md)** - Complete protocol specification
- **[Quick Start Guide](./QUICK_START.md)** - Getting started with Simply-MCP
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation

---

**Version**: Simply-MCP v4.0.0+
**Last Updated**: 2025-10-30
