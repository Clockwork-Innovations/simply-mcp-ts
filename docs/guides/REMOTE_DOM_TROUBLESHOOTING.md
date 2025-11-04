# Remote DOM Troubleshooting Guide

Comprehensive troubleshooting guide for Remote DOM implementation in Simply-MCP.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Common Errors](#common-errors)
- [Debug Techniques](#debug-techniques)
- [Performance Issues](#performance-issues)
- [Security Errors](#security-errors)
- [Error Message Index](#error-message-index)
- [Debug Checklist](#debug-checklist)
- [FAQ](#faq)

---

## Quick Reference

### Most Common Issues

| Issue | Quick Fix |
|-------|-----------|
| "Component not allowed" | Check component whitelist (see [#1](#1-component-not-allowed)) |
| Script execution timeout | Reduce script complexity or increase limit (see [#2](#2-script-execution-timeout)) |
| CSP violation | Remove eval/Function (see [#3](#3-csp-violation-unsafe-eval)) |
| Resource limit exceeded | Increase limits or optimize DOM (see [#4](#4-dom-node-limit-exceeded)) |
| "No script content found" | Check resource has text/blob field (see [#5](#5-no-script-content-found)) |
| Worker initialization failed | Check CSP worker-src (see [#6](#6-web-worker-initialization-failed)) |

---

## Common Errors

### 1. Component Not Allowed

**Error Message:**
```
Component not allowed: script
```

**Symptom:**
- Red error box in UI showing "Invalid component: [name]"
- Console error: "Component not allowed: [name]"
- Component renders as error message instead of intended element

**Diagnosis:**
This error occurs when your Remote DOM script tries to create an HTML element that is not in the security whitelist. This is a critical security feature that prevents XSS attacks.

**Common Culprits:**
- `script` - Blocked (XSS risk)
- `iframe` - Blocked (embedding risk)
- `object`/`embed` - Blocked (plugin risk)
- `link`/`style` - Blocked (CSS injection risk)
- Case-sensitive names (e.g., `Script` instead of `script`)
- Typos in component names

**Solution:**

1. **Check the whitelist** - See allowed components:
   ```javascript
   // Allowed components include:
   // - Basic: div, span, p, h1-h6, button, input
   // - Semantic: header, footer, nav, main, section
   // - Lists: ul, ol, li
   // - Forms: form, label, textarea, select
   // - Media: img, video, audio, canvas, svg
   // - Tables: table, thead, tbody, tr, td, th
   ```

2. **Use safe alternatives:**
   ```javascript
   // Wrong - script blocked
   const elem = remoteDOM.createElement('script', {});

   // Right - use button with event handler
   const button = remoteDOM.createElement('button', {});
   remoteDOM.addEventListener(button, 'click', () => {
     // Your logic here
   });
   ```

3. **Check case sensitivity:**
   ```javascript
   // Wrong - incorrect case
   remoteDOM.createElement('Button', {});

   // Right - lowercase for HTML elements
   remoteDOM.createElement('button', {});
   ```

**Related:**
- [API Reference - Component Library](./API_REFERENCE.md#component-library)
- [Security: Component Whitelist](#security-errors)

---

### 2. Script Execution Timeout

**Error Message:**
```
Script execution timeout: exceeded maximum execution time
```

**Symptom:**
- Loading indicator stays visible for 5+ seconds
- Error message appears: "Script execution failed: Script execution timeout"
- Console error with execution time details
- Worker terminates abruptly

**Diagnosis:**
Your Remote DOM script is taking longer than the allowed execution time (default: 5 seconds). This limit prevents long-running scripts from freezing the UI.

**Common Causes:**
- Large loops without yield points
- Synchronous operations in script
- Creating thousands of DOM nodes in tight loop
- Complex calculations without batching
- Infinite loops or recursive functions

**Solution:**

1. **Optimize your script:**
   ```javascript
   // Wrong - creates 10,000 nodes synchronously
   for (let i = 0; i < 10000; i++) {
     const item = remoteDOM.createElement('div', {});
     remoteDOM.appendChild(container, item);
   }

   // Right - use virtualization or pagination
   const itemsPerPage = 100;
   for (let i = 0; i < itemsPerPage; i++) {
     const item = remoteDOM.createElement('div', {});
     remoteDOM.appendChild(container, item);
   }
   ```

2. **Increase execution time limit** (if needed):
   ```typescript
   // Server-side configuration
   const resourceLimits = new ResourceLimits({
     maxExecutionTime: 10000  // 10 seconds
   });
   ```

3. **Break up work:**
   ```javascript
   // Use event handlers to defer work
   const loadMoreBtn = remoteDOM.createElement('button', {});
   remoteDOM.setTextContent(loadMoreBtn, 'Load More');
   remoteDOM.addEventListener(loadMoreBtn, 'click', () => {
     // Load next batch
     loadNextPage();
   });
   ```

4. **Check for infinite loops:**
   ```javascript
   // Wrong - infinite loop
   while (true) {
     // Never exits
   }

   // Right - bounded loop
   let iterations = 0;
   while (iterations < maxIterations) {
     // Do work
     iterations++;
   }
   ```

**Best Practices:**
- Keep initial render under 1 second
- Use lazy loading for large datasets
- Implement pagination for lists > 100 items
- Use virtualization for tables > 1000 rows
- Profile your script to find bottlenecks

**Related:**
- [Performance Optimization](#performance-issues)
- [API Reference - Resource Limits](./API_REFERENCE.md#resource-limits)

---

### 3. CSP Violation: Unsafe-Eval

**Error Message:**
```
CSP violation: Script contains unsafe code
- eval(): eval() is blocked by CSP. Use safer alternatives or enable 'unsafe-eval' (not recommended).
```

**Symptom:**
- Script validation fails before execution
- Error details show CSP violations
- Console shows which unsafe operations were detected
- Worker never starts executing script

**Diagnosis:**
Your script contains code that violates Content Security Policy (CSP). CSP prevents XSS attacks by blocking dynamic code evaluation.

**Blocked Patterns:**
1. `eval()` - Direct code evaluation
2. `new Function()` - Function constructor
3. `setTimeout(string)` - String-based timers
4. `setInterval(string)` - String-based intervals

**Solution:**

1. **Replace eval() with JSON.parse():**
   ```javascript
   // Wrong - eval is blocked
   const data = eval('(' + jsonString + ')');

   // Right - use JSON.parse
   const data = JSON.parse(jsonString);
   ```

2. **Replace Function constructor:**
   ```javascript
   // Wrong - Function constructor blocked
   const fn = new Function('a', 'b', 'return a + b');

   // Right - use regular function
   function add(a, b) {
     return a + b;
   }
   ```

3. **Replace string-based timers:**
   ```javascript
   // Wrong - setTimeout with string
   setTimeout("alert('Hello')", 1000);

   // Right - setTimeout with function
   setTimeout(() => {
     console.log('Hello');
   }, 1000);
   ```

4. **Use safer alternatives:**
   ```javascript
   // For dynamic property access
   // Wrong
   eval('obj.' + propertyName);

   // Right
   obj[propertyName];
   ```

**Why This Matters:**
CSP violations are **high-severity security issues**. These restrictions prevent attackers from injecting and executing malicious code.

**If You Absolutely Need Eval** (not recommended):
```typescript
// Configure custom CSP policy (server-side only)
const cspValidator = new CSPValidator({
  policy: {
    'script-src': ["'self'", "'unsafe-eval'"]  // NOT RECOMMENDED
  }
});
```

**Related:**
- [API Reference - CSP Validator](./API_REFERENCE.md#csp-validator)
- [Security Best Practices](#security-errors)

---

### 4. DOM Node Limit Exceeded

**Error Message:**
```
DOM node limit exceeded (10001 > 10000). This limit prevents memory exhaustion from excessive DOM trees.
```

**Symptom:**
- Script stops creating elements mid-execution
- Error appears when creating new elements
- Worker terminates
- Partial UI renders

**Diagnosis:**
Your script has exceeded the maximum allowed DOM nodes (default: 10,000). This limit prevents memory exhaustion attacks.

**Common Causes:**
- Large data tables without virtualization
- Deep nested component trees
- Memory leaks from not removing old nodes
- Accidentally creating nodes in loops

**Solution:**

1. **Implement virtualization:**
   ```javascript
   // Wrong - render all 10,000 rows
   data.forEach(row => {
     const tr = remoteDOM.createElement('tr', {});
     // ... create cells
     remoteDOM.appendChild(table, tr);
   });

   // Right - render visible rows only (virtualization)
   const visibleRows = data.slice(startIndex, endIndex);
   visibleRows.forEach(row => {
     const tr = remoteDOM.createElement('tr', {});
     // ... create cells
     remoteDOM.appendChild(table, tr);
   });
   ```

2. **Use pagination:**
   ```javascript
   // Show 100 items per page
   const pageSize = 100;
   const currentPage = data.slice(pageSize * page, pageSize * (page + 1));

   currentPage.forEach(item => {
     const elem = remoteDOM.createElement('div', {});
     remoteDOM.appendChild(container, elem);
   });
   ```

3. **Clean up old nodes:**
   ```javascript
   // Remove old nodes before creating new ones
   oldNodes.forEach(nodeId => {
     remoteDOM.removeChild(parentId, nodeId);
   });
   ```

4. **Increase limit if necessary:**
   ```typescript
   // Configure higher limit (server-side)
   const resourceLimits = new ResourceLimits({
     maxDOMNodes: 50000  // Increase for data-heavy apps
   });
   ```

**Best Practices:**
- Use virtualization for lists > 100 items
- Implement pagination for large datasets
- Consider server-side rendering for static content
- Profile DOM node count during development
- Clean up nodes when switching views

**Related:**
- [Virtualization Patterns](./REMOTE_DOM_ADVANCED.md#virtualization)
- [Resource Limits](./API_REFERENCE.md#resource-limits)

---

### 5. No Script Content Found

**Error Message:**
```
No script content found in resource
```

**Symptom:**
- Red validation error appears immediately
- No loading indicator or worker initialization
- Resource fails to render

**Diagnosis:**
The UI resource does not contain valid Remote DOM script content. The resource must have either a `text` or `blob` field with JavaScript code.

**Common Causes:**
- Empty resource content
- Wrong field name (e.g., `content` instead of `text`)
- Resource not properly created
- Encoding issues with blob field

**Solution:**

1. **Check resource structure:**
   ```typescript
   // Wrong - missing text field
   const resource = {
     uri: 'ui://test',
     mimeType: 'application/vnd.mcp-ui.remote-dom+javascript',
     content: '// script here'  // Wrong field name
   };

   // Right - correct structure
   const resource = {
     uri: 'ui://test',
     mimeType: 'application/vnd.mcp-ui.remote-dom+javascript',
     text: '// script here'  // Correct field
   };
   ```

2. **Verify MIME type:**
   ```typescript
   // Correct MIME type for Remote DOM
   mimeType: 'application/vnd.mcp-ui.remote-dom+javascript'
   ```

3. **Check blob encoding:**
   ```typescript
   // If using blob field
   blob: btoa('// your script here')  // Base64 encoded
   ```

4. **Use server helper:**
   ```typescript
   // Server-side - use addUIResource helper
   server.addUIResource(
     'ui://dashboard',
     'Dashboard',
     'Interactive dashboard',
     'application/vnd.mcp-ui.remote-dom+javascript',
     `
       const root = remoteDOM.createElement('div', {});
       remoteDOM.setTextContent(root, 'Hello!');
     `
   );
   ```

**Related:**
- [API Reference - UI Resources](./API_REFERENCE.md#ui-resources)
- [MIME Types](./MCP_UI_PROTOCOL.md#mime-types)

---

### 6. Web Worker Initialization Failed

**Error Message:**
```
Web Worker initialization failed: [error message]
```

**Symptom:**
- Loading indicator shows briefly then errors
- Console error about Worker creation
- Browser security warning in console

**Diagnosis:**
The Remote DOM sandbox worker could not be initialized. This is usually due to browser security restrictions or CSP policies.

**Common Causes:**
- CSP policy blocks `worker-src blob:`
- Browser doesn't support Web Workers
- CORS restrictions
- Browser security settings

**Solution:**

1. **Check CSP headers:**
   ```html
   <!-- Add to your HTML or HTTP headers -->
   <meta http-equiv="Content-Security-Policy"
         content="worker-src 'self' blob:;">
   ```

2. **Verify Worker support:**
   ```javascript
   if (typeof Worker === 'undefined') {
     console.error('Web Workers not supported');
     // Show fallback UI
   }
   ```

3. **Check browser console:**
   - Look for CSP violation messages
   - Check for CORS errors
   - Verify blob: URLs are allowed

4. **Test in different browser:**
   - Try Chrome/Edge (best support)
   - Test in Firefox
   - Check Safari (may have stricter policies)

**Workarounds:**
- Host worker script as separate file (not blob:)
- Adjust CSP policy to allow workers
- Use iframe-based fallback (less secure)

**Related:**
- [CSP Configuration](#security-errors)
- [Browser Compatibility](./QUICK_START.md#browser-support)

---

### 7. Invalid Operation Rejected

**Error Message:**
```
Invalid operation rejected: [operation details]
```

**Symptom:**
- Console warning shows rejected operation
- Operation silently fails
- UI doesn't update as expected

**Diagnosis:**
The worker sent a malformed DOM operation that failed validation. This is usually a bug in the Remote DOM script.

**Common Causes:**
- Missing required fields (e.g., `id`, `elementId`)
- Wrong data types (e.g., number instead of string)
- Invalid operation structure
- Corrupted operation during transmission

**Solution:**

1. **Check operation structure:**
   ```javascript
   // Wrong - missing id field
   remoteDOM.createElement('div');

   // Right - operations are handled internally
   const id = remoteDOM.createElement('div', {});
   ```

2. **Verify element IDs exist:**
   ```javascript
   // Ensure element was created before using it
   const elemId = remoteDOM.createElement('div', {});

   // Now safe to use
   remoteDOM.setTextContent(elemId, 'Hello');
   ```

3. **Check for async issues:**
   ```javascript
   // Wrong - using ID before it's registered
   const id = asyncCreateElement();
   remoteDOM.appendChild(parent, id);  // May fail

   // Right - ensure synchronous creation
   const id = remoteDOM.createElement('div', {});
   remoteDOM.appendChild(parent, id);
   ```

**Debug Tips:**
- Check console for operation details
- Verify operation type is valid
- Ensure all required fields are present
- Look for typos in field names

**Related:**
- [Protocol Validation](./MCP_UI_PROTOCOL.md#validation)
- [API Reference - Remote DOM API](./API_REFERENCE.md#remote-dom-api)

---

### 8. Script Size Exceeds Maximum

**Error Message:**
```
Script size (2.5 MB) exceeds maximum allowed (1 MB). This limit prevents DoS attacks from oversized scripts.
```

**Symptom:**
- Validation error before script execution
- Large scripts fail immediately
- Error shows current size vs limit

**Diagnosis:**
Your Remote DOM script is too large (default limit: 1 MB). This prevents DoS attacks from maliciously large scripts.

**Common Causes:**
- Embedded large data in script
- Inline libraries or dependencies
- Unminified/uncompressed code
- Large JSON objects in code

**Solution:**

1. **Externalize data:**
   ```javascript
   // Wrong - embed large data in script
   const data = [/* 10,000 items */];

   // Right - fetch data from resource
   remoteDOM.callHost('fetchData', {
     resourceUri: 'file://data.json'
   });
   ```

2. **Minify your code:**
   ```bash
   # Use terser or similar
   npx terser script.js -o script.min.js
   ```

3. **Split into multiple resources:**
   ```typescript
   // Create separate resources for different views
   server.addUIResource('ui://dashboard/main', ...);
   server.addUIResource('ui://dashboard/settings', ...);
   ```

4. **Increase limit if needed:**
   ```typescript
   const resourceLimits = new ResourceLimits({
     maxScriptSize: 5 * 1024 * 1024  // 5 MB
   });
   ```

**Best Practices:**
- Keep scripts under 100 KB when possible
- Use code splitting for large applications
- Minify and compress production code
- Load data dynamically, not inline

**Related:**
- [Performance Optimization](#performance-issues)
- [API Reference - Resource Limits](./API_REFERENCE.md#resource-limits)

---

### 9. Event Listener Limit Exceeded

**Error Message:**
```
Event listener limit exceeded (1001 > 1000). This limit prevents memory leaks from excessive event handlers.
```

**Symptom:**
- New event listeners fail to register
- Interactive elements stop working
- Worker terminates

**Diagnosis:**
Your script has registered too many event listeners (default limit: 1,000). This prevents memory leaks.

**Common Causes:**
- Event listeners in loops without cleanup
- Duplicate listeners on same element
- Not using event delegation
- Memory leaks from old listeners

**Solution:**

1. **Use event delegation:**
   ```javascript
   // Wrong - listener per item (1000 listeners for 1000 items)
   items.forEach(item => {
     const elem = remoteDOM.createElement('div', {});
     remoteDOM.addEventListener(elem, 'click', () => handleClick(item));
   });

   // Right - single listener on container
   const container = remoteDOM.createElement('div', {});
   remoteDOM.addEventListener(container, 'click', (event) => {
     // Handle clicks for all children
     const itemId = event.target.dataset.itemId;
     handleClick(itemId);
   });
   ```

2. **Clean up old listeners:**
   ```javascript
   // Track listeners to clean up
   const listenerIds = [];

   // Register listener
   const listenerId = remoteDOM.addEventListener(elem, 'click', handler);
   listenerIds.push(listenerId);

   // Clean up when done
   listenerIds.forEach(id => {
     remoteDOM.removeEventListener(id);
   });
   ```

3. **Increase limit if needed:**
   ```typescript
   const resourceLimits = new ResourceLimits({
     maxEventListeners: 5000  // For complex interactive UIs
   });
   ```

**Best Practices:**
- Use event delegation for lists
- Clean up listeners when removing elements
- Avoid creating listeners in loops
- Profile listener count during development

**Related:**
- [Event Handling Patterns](./REMOTE_DOM_ADVANCED.md#event-delegation)
- [Memory Management](#performance-issues)

---

### 10. Props Sanitization: Dangerous URL

**Error Message (Console):**
```
Blocked dangerous URL protocol: javascript: [url]
```

**Symptom:**
- Link or image doesn't render
- Console warning about blocked URL
- Attribute silently removed from element

**Diagnosis:**
Your script tried to set an href or src attribute with a dangerous URL protocol (javascript:, data:, etc.). This is blocked to prevent XSS attacks.

**Blocked Protocols:**
- `javascript:` - Executes JavaScript
- `data:` - Can embed HTML/scripts
- `vbscript:` - VBScript execution
- `file:` - Local file access
- `blob:` - Binary data (unless specifically allowed)

**Solution:**

1. **Use safe protocols:**
   ```javascript
   // Wrong - javascript protocol blocked
   remoteDOM.setAttribute(link, 'href', 'javascript:alert(1)');

   // Right - use event handler
   remoteDOM.addEventListener(link, 'click', () => {
     // Handle click safely
     handleLinkClick();
   });
   ```

2. **Use https:// for external links:**
   ```javascript
   // Safe protocols
   remoteDOM.setAttribute(link, 'href', 'https://example.com');
   remoteDOM.setAttribute(link, 'href', 'mailto:user@example.com');
   remoteDOM.setAttribute(link, 'href', 'tel:+1234567890');
   ```

3. **Use relative URLs:**
   ```javascript
   // Relative URLs are safe
   remoteDOM.setAttribute(link, 'href', '/path/to/page');
   remoteDOM.setAttribute(link, 'href', '../other/page');
   remoteDOM.setAttribute(img, 'src', '/images/photo.jpg');
   ```

4. **For data URLs (use with caution):**
   ```javascript
   // Only safe for images, not HTML
   const imageDataUrl = 'data:image/png;base64,iVBORw0KGgo...';
   remoteDOM.setAttribute(img, 'src', imageDataUrl);
   ```

**Related:**
- [URL Sanitization](#security-errors)
- [XSS Prevention](./REMOTE_DOM_ADVANCED.md#xss-prevention)

---

## Debug Techniques

### Enable Debug Logging

**Resource Limits:**
```typescript
const resourceLimits = new ResourceLimits({
  debug: true  // Enables detailed logging
});

// Logs:
// - Script size validation
// - DOM node counts (every 100 nodes)
// - Event listener counts
// - Execution time
// - Memory usage
```

**CSP Validator:**
```typescript
const cspValidator = new CSPValidator({
  debug: true  // Enables CSP logging
});

// Logs:
// - Script validation results
// - URL validation results
// - Violations and warnings
```

### Inspect DOM Operations

Add logging to your Remote DOM script:

```javascript
// Log each operation
const originalCreateElement = remoteDOM.createElement;
remoteDOM.createElement = function(tagName, props) {
  console.log('[RemoteDOM] createElement:', tagName, props);
  return originalCreateElement.call(this, tagName, props);
};
```

### Monitor Resource Usage

```typescript
// Get current usage statistics
const usage = resourceLimits.getUsage();

console.log('Resource Usage:', {
  domNodes: `${usage.domNodes.count} / ${usage.domNodes.limit} (${usage.domNodes.percentage}%)`,
  eventListeners: `${usage.eventListeners.count} / ${usage.eventListeners.limit} (${usage.eventListeners.percentage}%)`,
  executionTime: `${usage.executionTime.ms}ms / ${usage.executionTime.limit}ms (${usage.executionTime.percentage}%)`,
  memory: usage.memory.mb ? `${usage.memory.mb.toFixed(2)} MB` : 'N/A'
});
```

### Browser DevTools Tips

1. **Check Worker Threads:**
   - Chrome DevTools → Sources → Threads
   - Look for your Web Worker
   - Set breakpoints in worker code

2. **Monitor Memory:**
   - Chrome DevTools → Memory
   - Take heap snapshots
   - Look for memory leaks

3. **Profile Performance:**
   - Chrome DevTools → Performance
   - Record while rendering
   - Identify bottlenecks

4. **Check Console:**
   - Look for CSP violation warnings
   - Check for operation validation errors
   - Review resource limit warnings

### Test Scripts in Isolation

Create a test harness:

```typescript
// test-remote-dom.ts
import { ResourceLimits } from './resource-limits';
import { CSPValidator } from './csp-validator';

const script = `
  const root = remoteDOM.createElement('div', {});
  remoteDOM.setTextContent(root, 'Test');
`;

// Test resource limits
const limits = new ResourceLimits({ debug: true });
try {
  limits.validateScriptSize(script);
  console.log('✓ Script size OK');
} catch (error) {
  console.error('✗ Script size failed:', error);
}

// Test CSP
const validator = new CSPValidator({ debug: true });
try {
  validator.validateScript(script);
  console.log('✓ CSP validation OK');
} catch (error) {
  console.error('✗ CSP validation failed:', error);
}
```

### Common Debug Patterns

**Check Element Creation:**
```javascript
// Add validation
function createElementSafely(tagName, props) {
  if (!isAllowedComponent(tagName)) {
    throw new Error(`Component not allowed: ${tagName}`);
  }
  return remoteDOM.createElement(tagName, props);
}
```

**Track Element Lifecycle:**
```javascript
const elements = new Map();

function trackElement(id, tagName) {
  elements.set(id, { tagName, created: Date.now() });
  console.log(`Created ${tagName} (${id}), total: ${elements.size}`);
}

function untrackElement(id) {
  const elem = elements.get(id);
  if (elem) {
    console.log(`Removed ${elem.tagName} (${id}), lived ${Date.now() - elem.created}ms`);
    elements.delete(id);
  }
}
```

---

## Performance Issues

### Slow Rendering

**Symptom:**
- UI takes seconds to appear
- Browser becomes unresponsive
- High CPU usage

**Diagnosis:**
Script is creating too many elements or doing expensive operations.

**Solutions:**

1. **Batch DOM operations:**
   ```javascript
   // Create all elements first, then append
   const elements = [];
   for (let i = 0; i < 100; i++) {
     elements.push(remoteDOM.createElement('div', {}));
   }

   // Append in single pass
   elements.forEach(elem => {
     remoteDOM.appendChild(container, elem);
   });
   ```

2. **Use virtualization:**
   - Only render visible items
   - Implement windowing for long lists
   - Use libraries like react-window

3. **Defer non-critical rendering:**
   ```javascript
   // Render critical content first
   renderHeader();
   renderMainContent();

   // Defer secondary content
   setTimeout(() => {
     renderSidebar();
     renderFooter();
   }, 0);
   ```

### High Memory Usage

**Symptom:**
- Browser tab uses > 500 MB RAM
- Memory warning in resource limits
- Browser becomes sluggish

**Diagnosis:**
Memory leaks or excessive DOM nodes.

**Solutions:**

1. **Check for leaks:**
   ```javascript
   // Take heap snapshot before and after operations
   // Look for detached DOM nodes
   ```

2. **Clean up old nodes:**
   ```javascript
   // Remove nodes when switching views
   function clearView() {
     oldNodes.forEach(nodeId => {
       remoteDOM.removeChild(parent, nodeId);
     });
     oldNodes.clear();
   }
   ```

3. **Limit retained data:**
   ```javascript
   // Don't store all data in memory
   // Use pagination or virtual scrolling
   ```

### Janky Interactions

**Symptom:**
- Clicks feel delayed
- Scrolling is choppy
- Animations stutter

**Diagnosis:**
Too much JavaScript execution blocking the main thread.

**Solutions:**

1. **Debounce expensive operations:**
   ```javascript
   let timeout;
   remoteDOM.addEventListener(input, 'input', () => {
     clearTimeout(timeout);
     timeout = setTimeout(() => {
       handleSearch(input.value);
     }, 300);  // Wait 300ms after typing stops
   });
   ```

2. **Use requestAnimationFrame:**
   ```javascript
   function smoothUpdate() {
     requestAnimationFrame(() => {
       updateUI();
     });
   }
   ```

3. **Reduce event listener overhead:**
   - Use event delegation
   - Remove unused listeners
   - Throttle high-frequency events

---

## Security Errors

### CSP Violations

See [#3: CSP Violation: Unsafe-Eval](#3-csp-violation-unsafe-eval) above.

**Additional Patterns:**

**Inline Event Handlers:**
```javascript
// Wrong - inline handler (warning)
<button onclick="handleClick()">Click</button>

// Right - use addEventListener
remoteDOM.addEventListener(button, 'click', handleClick);
```

**CSS Expressions (IE):**
```javascript
// Blocked - CSS expression
style: 'width: expression(document.body.clientWidth)'

// Right - use JavaScript
remoteDOM.setAttribute(elem, 'style', `width: ${width}px`);
```

### Component Whitelist

See [#1: Component Not Allowed](#1-component-not-allowed) above.

**Extended Whitelist:**

The complete whitelist includes:
- **Basic**: div, span, p, h1-h6, br, hr
- **Forms**: button, input, textarea, select, option, form, label, fieldset, legend
- **Lists**: ul, ol, li
- **Semantic**: header, footer, nav, main, section, article, aside
- **Media**: img, video, audio, canvas, svg, picture, source, track
- **Tables**: table, thead, tbody, tfoot, tr, td, th, caption
- **Text**: a, strong, em, code, pre, blockquote, mark, time
- **Interactive**: details, summary, dialog, progress, meter

**Not Included (Blocked):**
- script, iframe, object, embed, applet (XSS/embedding risks)
- link, style (CSS injection)
- base (URL manipulation)
- meta (metadata injection)
- title (document manipulation)

### Props Sanitization

See [#10: Props Sanitization: Dangerous URL](#10-props-sanitization-dangerous-url) above.

**Additional Sanitization:**

**Blocked Props:**
- `dangerouslySetInnerHTML` - Direct HTML injection
- `ref` - React internal reference
- `on*` attributes - Event handlers (use addEventListener)

**Safe Attributes:**
```javascript
// Safe to use
const safeProps = {
  id: 'my-element',
  className: 'button primary',
  style: { color: 'blue', padding: '8px' },
  'aria-label': 'Submit button',
  'data-id': '123',
  disabled: true,
  required: true
};
```

---

## Error Message Index

Quick lookup of all error messages and their solutions:

| Error Message | Section |
|---------------|---------|
| "Component not allowed" | [#1](#1-component-not-allowed) |
| "Script execution timeout" | [#2](#2-script-execution-timeout) |
| "CSP violation: Script contains unsafe code" | [#3](#3-csp-violation-unsafe-eval) |
| "DOM node limit exceeded" | [#4](#4-dom-node-limit-exceeded) |
| "No script content found" | [#5](#5-no-script-content-found) |
| "Web Worker initialization failed" | [#6](#6-web-worker-initialization-failed) |
| "Invalid operation rejected" | [#7](#invalid-operation-rejected) |
| "Script size exceeds maximum" | [#8](#8-script-size-exceeds-maximum) |
| "Event listener limit exceeded" | [#9](#9-event-listener-limit-exceeded) |
| "Blocked dangerous URL protocol" | [#10](#10-props-sanitization-dangerous-url) |
| "Memory usage high" | [Performance: High Memory](#high-memory-usage) |
| "Resource limit exceeded" | [#4](#4-dom-node-limit-exceeded) |

---

## Debug Checklist

Use this checklist when troubleshooting Remote DOM issues:

### Initial Checks
- [ ] Resource has `text` or `blob` field with content
- [ ] MIME type is `application/vnd.mcp-ui.remote-dom+javascript`
- [ ] Browser supports Web Workers
- [ ] CSP allows `worker-src blob:`
- [ ] No browser console errors

### Script Validation
- [ ] Script size under limit (default 1 MB)
- [ ] No `eval()` or `new Function()` calls
- [ ] No string-based setTimeout/setInterval
- [ ] All component names in whitelist
- [ ] No dangerous URL protocols

### Runtime Checks
- [ ] DOM node count under limit (default 10,000)
- [ ] Event listener count under limit (default 1,000)
- [ ] Execution time under limit (default 5 seconds)
- [ ] No memory leaks
- [ ] Operations properly structured

### Performance
- [ ] Initial render under 1 second
- [ ] Smooth interactions (no jank)
- [ ] Memory usage reasonable (< 100 MB)
- [ ] No infinite loops or recursion
- [ ] Proper cleanup of old elements

### Error Handling
- [ ] Graceful degradation on errors
- [ ] Helpful error messages
- [ ] No silent failures
- [ ] Proper logging for debugging

---

## FAQ

### Q: Can I increase resource limits for my application?

**A:** Yes! All resource limits are fully configurable:

```typescript
const resourceLimits = new ResourceLimits({
  maxScriptSize: 5 * 1024 * 1024,  // 5 MB
  maxExecutionTime: 10000,          // 10 seconds
  maxDOMNodes: 50000,                // 50,000 nodes
  maxEventListeners: 5000,           // 5,000 listeners
  memoryWarningThreshold: 200,       // 200 MB
  debug: true
});
```

However, consider performance implications before raising limits significantly.

### Q: Why can't I use `eval()` in my Remote DOM script?

**A:** `eval()` is blocked by Content Security Policy (CSP) to prevent XSS attacks. It allows arbitrary code execution, which is a security risk. Use safer alternatives like:
- `JSON.parse()` for parsing JSON
- Regular functions instead of Function constructor
- Object property access instead of dynamic evaluation

### Q: How do I debug my Remote DOM script?

**A:** Several approaches:
1. Enable debug logging in ResourceLimits and CSPValidator
2. Add console.log statements to your script
3. Check browser DevTools → Sources → Threads for worker
4. Monitor resource usage with `getUsage()`
5. Use test harness to validate script before deployment

### Q: What's the best way to handle large datasets?

**A:** For large datasets:
1. **Virtualization** - Only render visible items
2. **Pagination** - Show 50-100 items per page
3. **Lazy loading** - Load data on demand
4. **External data** - Fetch data dynamically, don't embed

Example:
```javascript
// Only render visible rows in viewport
const visibleRows = allRows.slice(scrollTop, scrollTop + viewportHeight);
visibleRows.forEach(row => renderRow(row));
```

### Q: Can I use external libraries in Remote DOM?

**A:** Yes, but with caveats:
- Library must be CSP-compliant (no eval/Function)
- Must fit within script size limit
- Consider minification and tree-shaking
- Test thoroughly for compatibility

Better approach: Keep Remote DOM scripts minimal and use MCP tools for complex logic.

### Q: How do I handle async operations?

**A:** Use `remoteDOM.callHost()` for async operations:

```javascript
// Call back to host for async work
remoteDOM.callHost('fetchData', { url: '/api/data' });

// Host handles async operation and updates UI
// via a new resource or state update
```

Remote DOM scripts execute synchronously in a worker, so async operations should be coordinated with the host.

### Q: Why is my UI flickering or updating multiple times?

**A:** Common causes:
1. **Multiple renders** - Batch operations instead of individual updates
2. **State management** - Avoid recreating entire UI on small changes
3. **Event loops** - Ensure event handlers don't trigger cascading updates

Solution: Batch operations and minimize re-renders.

### Q: Can I use React/Vue components in Remote DOM?

**A:** No. Remote DOM creates virtual DOM representations that are rendered as React components by the host. You cannot use React/Vue directly in your script.

However, the host (RemoteDOMRenderer) uses React to render the virtual DOM.

### Q: How do I style my Remote DOM UI?

**A:** Use inline styles or className:

```javascript
// Inline styles
const elem = remoteDOM.createElement('div', {
  style: {
    color: 'blue',
    padding: '16px',
    backgroundColor: '#f5f5f5'
  }
});

// CSS class (requires host to provide styles)
const elem = remoteDOM.createElement('div', {
  className: 'card primary'
});
```

Host application should provide global CSS for classNames.

### Q: What happens if I exceed a resource limit?

**A:** The worker is immediately terminated to prevent further damage:
1. Error message shown to user
2. Worker thread stopped
3. Partial UI may remain visible
4. No further operations processed

Always design for graceful degradation.

### Q: Can I access DOM directly from my script?

**A:** No. Remote DOM scripts run in a Web Worker, which has no DOM access. This is a security feature. All DOM operations must go through the `remoteDOM` API.

### Q: How do I implement navigation between views?

**A:** Use `remoteDOM.callHost()` with 'link' action:

```javascript
remoteDOM.callHost('link', {
  url: 'ui://app/settings',
  newWindow: false
});
```

Or implement view switching within your script by showing/hiding elements.

### Q: Can I use TypeScript for Remote DOM scripts?

**A:** Yes! Write in TypeScript and compile to JavaScript:

```typescript
// remote-dom-script.ts
interface Item {
  id: string;
  name: string;
}

const items: Item[] = [/* ... */];

items.forEach(item => {
  const elem = remoteDOM.createElement('div', {});
  remoteDOM.setTextContent(elem, item.name);
});
```

Compile with:
```bash
tsc remote-dom-script.ts --target ES2020 --module ESNext
```

---

## See Also

- **[Remote DOM Advanced Patterns](./REMOTE_DOM_ADVANCED.md)** - Performance optimizations, lazy loading, operation batching
- **[MCP UI Protocol Guide](./MCP_UI_PROTOCOL.md)** - Complete protocol specification
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- **[Migration Guide](./MCP_UI_MIGRATION.md)** - Migrating to MCP UI protocol

---

**Last Updated**: 2025-10-31
**Version**: Simply-MCP v4.0.0+
