# MCP UI Testing Guide

**Version:** 1.0
**Last Updated:** 2025-10-30
**Target Audience:** Developers testing MCP UI servers and client implementations

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Testing MCP UI Servers](#testing-mcp-ui-servers)
4. [What to Look For](#what-to-look-for)
5. [Testing Checklist](#testing-checklist)
6. [Troubleshooting](#troubleshooting)
7. [Automated Browser Testing](#automated-browser-testing)
8. [Security Testing](#security-testing)
9. [API Testing](#api-testing)
10. [References](#references)

---

## Overview

### What is MCP UI?

**MCP UI** is an experimental extension to the Model Context Protocol (MCP) that enables servers to deliver **interactive web components** to clients. It transforms MCP from a text-based protocol into a rich, visual experience platform.

Key capabilities:
- **Interactive HTML components** rendered in sandboxed iframes
- **Tool integration** for bidirectional communication between UI and server
- **Security-first design** with iframe sandboxing and tool allowlists
- **Multiple rendering modes** (inline HTML, external URLs, React components, Remote DOM)
- **Real-time updates** via resource subscriptions

### Why is UI Rendering Important?

MCP UI enables:
- **Rich visualizations** - Dashboards, charts, and complex data displays
- **Interactive forms** - Configuration panels, data entry, and user interactions
- **Real-time monitoring** - Live status displays with automatic updates
- **Better UX** - Moving beyond text-based interfaces to visual experiences

### What This Guide Covers

This guide provides comprehensive instructions for:
- Testing MCP UI servers with example implementations
- Verifying UI rendering in the MCP Interpreter
- Validating security implementations
- Using automated testing tools
- Troubleshooting common issues

### Prerequisites

Before testing MCP UI servers, ensure you have:

- **Node.js** (v18 or later) installed
- **MCP Interpreter** running (http://localhost:3003 or :3005)
- **Example MCP UI servers** (available in `examples/` directory)
- **Chrome DevTools MCP** (optional, for automated testing)
- **Basic understanding** of MCP protocol and resources

---

## Quick Start

### Starting the MCP Interpreter

The MCP Interpreter provides a web-based interface for connecting to and testing MCP servers.

```bash
# Navigate to the interpreter directory
cd /mnt/Shared/cs-projects/simply-mcp-ts/mcp-interpreter

# Install dependencies (first time only)
npm install

# Start the interpreter
npm run dev
```

The interpreter will be available at:
- **Primary:** http://localhost:3003
- **Fallback:** http://localhost:3005

### Connecting to a UI Server

1. **Open the MCP Interpreter** in your browser
2. **Enter server configuration:**
   - **Type:** `stdio` (for local servers)
   - **Server Path:** Absolute path to your server file
   - Example: `/mnt/Shared/cs-projects/simply-mcp-ts/examples/interface-ui-foundation.ts`
3. **Click "Connect"**
4. **Wait for connection** (~30 seconds for stdio connections)
5. **Navigate to "Resources" tab** to view UI resources

### Viewing UI Resources

Once connected:
1. Click the **"Resources"** tab in the navigation
2. Look for resources with **`ui://...`** URIs
3. Click on a UI resource to view it
4. The UI will render in a **sandboxed iframe**

### Expected Behavior

**Correct behavior:**
- UI renders in an iframe (NOT as plain text)
- Styles are applied correctly
- Interactive elements (buttons, inputs) are visible and functional
- Console shows connection and activity logs

**Incorrect behavior (issues):**
- UI displays as raw HTML text
- Blank iframe or "about:blank" page
- Security errors in browser console
- Buttons/inputs not working

---

## Testing MCP UI Servers

### Available Test Servers

The `simply-mcp-ts` repository includes several example servers demonstrating different UI capabilities:

#### 1. `interface-ui-foundation.ts` - Foundation Layer UI

**Location:** `/mnt/Shared/cs-projects/simply-mcp-ts/examples/interface-ui-foundation.ts`

**Features:**
- Static inline HTML UI (Calculator)
- Dynamic inline HTML UI (Live Statistics)
- Tool integration (`add`, `refresh_stats`, `reset_counter`)
- Subscribable UI with real-time updates
- Inline CSS styling

**Test focus:** Basic UI rendering, tool calls, dynamic updates

#### 2. `interface-component-library.ts` - Component Library

**Location:** `/mnt/Shared/cs-projects/simply-mcp-ts/examples/interface-component-library.ts`

**Features:**
- Reusable UI components
- Component registry system
- Dashboard with multiple components
- Tool integration (`get_dashboard_data`, `refresh_data`, `export_data`)

**Test focus:** Component reuse, complex layouts

#### 3. `interface-react-component.ts` - React Components

**Location:** `/mnt/Shared/cs-projects/simply-mcp-ts/examples/interface-react-component.ts`

**Features:**
- React-based UI components
- Modern React patterns (hooks, state management)
- Interactive forms with validation

**Test focus:** React rendering, stateful components

#### 4. `interface-react-dashboard.ts` - Complex Dashboard

**Location:** `/mnt/Shared/cs-projects/simply-mcp-ts/examples/interface-react-dashboard.ts`

**Features:**
- Complex multi-panel dashboard
- Data visualization
- Real-time metrics
- Multiple tool integrations

**Test focus:** Complex UIs, performance, multiple tools

#### 5. `interface-remote-dom.ts` - Remote DOM Examples

**Location:** `/mnt/Shared/cs-projects/simply-mcp-ts/examples/interface-remote-dom.ts`

**Features:**
- Remote DOM component tree format
- JSON-based component structure
- Forms, lists, nested components
- Alternative to HTML rendering

**Test focus:** Remote DOM MIME type, JSON structure

### Starting a Test Server

#### Method 1: Using simply-mcp CLI (Recommended)

```bash
# Navigate to project root
cd /mnt/Shared/cs-projects/simply-mcp-ts

# Run a UI example server
npx simply-mcp run examples/interface-ui-foundation.ts --stdio

# Or with verbose logging
npx simply-mcp run examples/interface-ui-foundation.ts --stdio --verbose
```

#### Method 2: Direct Node Execution

```bash
# Build the project
npm run build

# Run the built example
node dist/examples/interface-ui-foundation.js
```

#### Method 3: HTTP Transport

For testing HTTP-based servers:

```bash
# Run with HTTP stateful transport
npx simply-mcp run examples/interface-ui-foundation.ts --http --port 8080

# Connect using http://localhost:8080 in the interpreter
```

### Connection Steps (Detailed)

1. **Open MCP Interpreter**
   - Navigate to http://localhost:3003 in your browser
   - Ensure the server is running (green status indicator)

2. **Configure Connection**
   - **Connection Type:** Select `stdio` for local servers
   - **Server Path:** Enter absolute path to server file
     ```
     /mnt/Shared/cs-projects/simply-mcp-ts/examples/interface-ui-foundation.ts
     ```
   - Leave **Arguments** blank (optional: add `--verbose` for logging)

3. **Initiate Connection**
   - Click the **"Connect"** button
   - Watch the console log for connection progress
   - Wait for "Connected" status (stdio takes ~30s)

4. **Verify Connection**
   - Status should show **"Connected"**
   - Server name and version should display
   - Capabilities should be listed

5. **Navigate to Resources**
   - Click the **"Resources"** tab
   - You should see a list of available resources
   - UI resources will have URIs starting with `ui://`

6. **Open a UI Resource**
   - Click on a UI resource (e.g., "Calculator")
   - The UI should render in the main content area
   - Interactive elements should be visible

---

## What to Look For

### UI Resource Detection

When you list resources, UI resources should have:

**Correct characteristics:**
- **URI Format:** `ui://category/name`
  - Example: `ui://calculator/v1`
  - Example: `ui://stats/live`
- **MIME Type:** `text/html` or `application/vnd.mcp-ui.remote-dom`
- **Name:** Clear, descriptive name
- **Description:** Explains what the UI does

**Example resource listing:**
```json
{
  "uri": "ui://calculator/v1",
  "name": "Calculator",
  "description": "Simple calculator UI with tool integration",
  "mimeType": "text/html"
}
```

### UI Rendering

When a UI resource is opened, verify:

#### Visual Rendering
- **Renders in iframe:** Content appears in a sandboxed iframe element
- **NOT plain text:** Should not display raw HTML source code
- **Styles applied:** CSS styling is visible and correct
- **Layout correct:** Elements positioned properly
- **Responsive:** Adjusts to viewport size appropriately

#### Security Attributes
- **Sandbox attribute present:** Inspect iframe to verify sandbox attribute
- **Allowed permissions:** Only `allow-scripts` should be present
- **No same-origin:** `allow-same-origin` should NOT be present
- **Isolated origin:** Origin should be `null` or sandboxed

**Inspect the iframe:**
```html
<iframe
  sandbox="allow-scripts"
  src="data:text/html;charset=utf-8,..."
  style="width: 100%; height: 100%; border: none;"
></iframe>
```

### Interactive Elements

Test that UI elements work correctly:

#### Buttons
- **Clickable:** Buttons respond to clicks
- **Visual feedback:** Hover states, active states work
- **Tool calls triggered:** Console shows tool execution logs
- **Loading states:** Buttons show loading state during tool execution
- **Error handling:** Errors display appropriate messages

#### Inputs
- **Accept text:** Text inputs allow typing
- **Number validation:** Number inputs validate correctly
- **Form submission:** Forms can be submitted
- **Value binding:** Input values are read correctly by JavaScript

#### Forms
- **Submit events:** Form submission triggers JavaScript handlers
- **Validation:** Client-side validation works
- **Error messages:** Invalid inputs show error messages
- **Success feedback:** Successful operations show confirmation

### Tool Integration

UI elements can trigger MCP tool calls. Verify:

#### Tool Call Execution
- **Tool calls initiated:** Clicking buttons calls tools
- **Console logging:** Console shows tool call details:
  ```
  [Tool Call] add({ a: 5, b: 3 })
  [Tool Result] 8
  ```
- **Results returned:** Tool results are returned to UI
- **UI updates:** UI displays tool results correctly

#### Tool Allowlist
- **Allowed tools work:** Tools in allowlist execute successfully
- **Disallowed tools blocked:** Tools not in allowlist are rejected
- **Clear error messages:** Blocked tools show security error

#### Error Handling
- **Network errors:** UI handles connection failures gracefully
- **Invalid parameters:** Shows error for invalid tool arguments
- **Timeout handling:** Long-running tools show timeout messages
- **Recovery:** UI remains functional after errors

### Notifications

UIs can send notifications to users. Check:

- **Info notifications:** `notify('info', 'message')` shows info notification
- **Success notifications:** `notify('success', 'message')` shows success
- **Error notifications:** `notify('error', 'message')` shows error
- **Warning notifications:** `notify('warning', 'message')` shows warning

---

## Testing Checklist

Use this comprehensive checklist to verify MCP UI implementations:

### Connection

- [ ] Server connects successfully via stdio
- [ ] Server connects successfully via HTTP (if supported)
- [ ] Server info displays (name, version)
- [ ] Capabilities are shown correctly
- [ ] Status shows "Connected" accurately
- [ ] Connection timeout handled gracefully (if server unavailable)
- [ ] Reconnection works after disconnect

### Resource Discovery

- [ ] Resources tab shows all available resources
- [ ] UI resources are listed (URIs starting with `ui://`)
- [ ] MIME type is correct (`text/html` or `application/vnd.mcp-ui.remote-dom`)
- [ ] Resource names are descriptive
- [ ] Resource descriptions explain functionality
- [ ] Non-UI resources are also listed correctly
- [ ] Empty resource list handled gracefully (if no resources)

### UI Rendering

- [ ] UI renders in iframe (not as plain text)
- [ ] Iframe has correct sandbox attribute
- [ ] Only `allow-scripts` permission is granted
- [ ] NO `allow-same-origin` permission present
- [ ] CSS styles are applied correctly
- [ ] Layout appears as intended
- [ ] Responsive design works (try different window sizes)
- [ ] No broken images or missing resources
- [ ] Fonts load correctly
- [ ] Colors and themes applied properly

### Security Validation

- [ ] Iframe has sandbox attribute
- [ ] Only `allow-scripts` permission granted
- [ ] Cannot access parent window/DOM
- [ ] Origin is `null` or sandboxed
- [ ] postMessage origin validation works
- [ ] Tool allowlist is enforced
- [ ] Disallowed tools are blocked
- [ ] XSS attempts are blocked
- [ ] No console security warnings

### Interactivity

- [ ] Buttons are clickable
- [ ] Hover effects work
- [ ] Active/focus states work
- [ ] Text inputs accept text
- [ ] Number inputs validate correctly
- [ ] Checkboxes toggle
- [ ] Radio buttons select
- [ ] Dropdowns show options
- [ ] Forms can be submitted

### Tool Integration

- [ ] Tool calls are triggered from UI
- [ ] Console logs show tool execution
- [ ] Tool parameters passed correctly
- [ ] Tool results returned to UI
- [ ] UI displays results correctly
- [ ] Loading states shown during execution
- [ ] Errors are caught and displayed
- [ ] Tool allowlist enforced
- [ ] Multiple tool calls work
- [ ] Concurrent tool calls handled

### Error Handling

- [ ] Invalid tool calls show errors
- [ ] Network errors handled gracefully
- [ ] Timeout messages are clear
- [ ] UI remains functional after errors
- [ ] Error messages are user-friendly
- [ ] Console shows detailed error info
- [ ] Recovery mechanisms work
- [ ] No JavaScript errors in console

### Real-Time Updates (if supported)

- [ ] Subscribable UIs can be subscribed to
- [ ] Resource update notifications received
- [ ] UI refreshes on notification
- [ ] Dynamic data updates correctly
- [ ] No flashing or jarring updates
- [ ] Subscription cleanup on disconnect

### Performance

- [ ] UI loads quickly (< 2 seconds)
- [ ] No lag when interacting
- [ ] Smooth animations
- [ ] No memory leaks (check DevTools)
- [ ] No excessive CPU usage
- [ ] Multiple UIs can be opened simultaneously

---

## Troubleshooting

### UI Shows as Text Instead of Iframe

**Symptoms:**
- Raw HTML code displayed instead of rendered UI
- No iframe element in DOM
- Looks like source code

**Possible causes:**
1. MIME type not recognized
2. Resource not identified as UI resource
3. Renderer not handling UI resources

**Solutions:**
```bash
# Check resource MIME type
curl -X POST http://localhost:3003/api/mcp/resources/read \
  -H "Content-Type: application/json" \
  -d '{"uri":"ui://calculator/v1"}'

# Look for: "mimeType": "text/html"
```

- Verify URI starts with `ui://`
- Check MIME type is `text/html` or `application/vnd.mcp-ui.remote-dom`
- Ensure resource handler recognizes UI resources
- Check browser console for renderer errors

### Connection Timeout

**Symptoms:**
- "Connecting..." message persists
- Never reaches "Connected" state
- No error message displayed

**Possible causes:**
1. Server file path incorrect
2. Server fails to start
3. Network timeout
4. Server not responding to initialize

**Solutions:**
```bash
# Test server manually
npx simply-mcp run examples/interface-ui-foundation.ts --stdio

# Check if server starts without errors
# Look for "Server started" or similar message
```

- Verify absolute path to server file
- Check server file has no syntax errors
- Try increasing timeout (if configurable)
- Check server logs for errors
- Verify Node.js and dependencies installed

### Resources Not Loading

**Symptoms:**
- Resources tab is empty
- "No resources available" message
- Connected but no resources listed

**Possible causes:**
1. Server has no resources defined
2. resources/list request failing
3. Response not parsed correctly

**Solutions:**
```bash
# Check resources via API
curl http://localhost:3003/api/mcp/resources

# Should return list of resources
```

- Verify server defines UI resources
- Check server implements resource listing
- Verify MCP protocol resource format
- Check browser console for API errors

### Tools Not Executing

**Symptoms:**
- Clicking buttons does nothing
- No console logs from tool calls
- Error: "Tool not allowed"

**Possible causes:**
1. Tool not in allowlist
2. postMessage not working
3. Tool name mismatch
4. JavaScript errors in UI

**Solutions:**
```javascript
// Check tool allowlist in resource
// Should see: tools: ['add', 'refresh_stats']

// Check console for errors
// Look for: "Tool 'xyz' not allowed"
```

- Verify tool name in allowlist
- Check tool name spelling (case-sensitive)
- Inspect postMessage communication in DevTools
- Check JavaScript console for errors
- Verify `callTool()` function is defined in UI

### Console Errors

**Common errors and solutions:**

#### "Failed to execute 'postMessage'"
```
Error: Failed to execute 'postMessage' on 'Window'
```
**Cause:** Invalid message structure or target origin issue
**Solution:** Check postMessage format, ensure target window exists

#### "Blocked by CSP"
```
Refused to load script from ... because it violates CSP
```
**Cause:** Content Security Policy blocking resource
**Solution:** Check CSP headers, ensure inline scripts allowed in sandbox

#### "Cross-origin error"
```
Blocked a frame with origin "null" from accessing a cross-origin frame
```
**Cause:** Sandbox isolation working correctly (expected)
**Solution:** No action needed - this is correct security behavior

#### "Uncaught ReferenceError: callTool is not defined"
```
Uncaught ReferenceError: callTool is not defined
```
**Cause:** Helper functions not injected into UI
**Solution:** Ensure content enhancement script is included

### Iframe Security Errors

**Symptoms:**
- Browser console shows security warnings
- iframe cannot communicate with parent
- Features blocked by browser

**Verification:**
```javascript
// Open browser DevTools Console
// Inspect iframe element
$0.sandbox // Should show: allow-scripts

// Check for disallowed attributes
// Should NOT include: allow-same-origin, allow-top-navigation
```

**Solutions:**
- Verify sandbox attribute only includes `allow-scripts`
- Remove any `allow-same-origin` attribute
- Ensure CSP headers are not too restrictive
- Check browser security settings

---

## Automated Browser Testing

### Using Chrome DevTools MCP

The MCP Interpreter includes Chrome DevTools MCP integration for automated UI testing. This enables programmatic browser control for comprehensive testing.

### Available Tools

The following MCP tools are available for automated testing:

#### Navigation
- `mcp__chrome-devtools__navigate_page` - Navigate to URL
- `mcp__chrome-devtools__navigate_page_history` - Navigate back/forward
- `mcp__chrome-devtools__new_page` - Create new tab
- `mcp__chrome-devtools__close_page` - Close tab
- `mcp__chrome-devtools__select_page` - Switch active tab

#### Inspection
- `mcp__chrome-devtools__take_snapshot` - Capture accessibility tree
- `mcp__chrome-devtools__take_screenshot` - Capture screenshot
- `mcp__chrome-devtools__list_pages` - List open tabs

#### Interaction
- `mcp__chrome-devtools__click` - Click element by UID
- `mcp__chrome-devtools__fill` - Fill input field
- `mcp__chrome-devtools__fill_form` - Fill multiple fields
- `mcp__chrome-devtools__hover` - Hover over element
- `mcp__chrome-devtools__drag` - Drag and drop

#### JavaScript Execution
- `mcp__chrome-devtools__evaluate_script` - Run JavaScript in page context

#### Network & Console
- `mcp__chrome-devtools__list_network_requests` - View network requests
- `mcp__chrome-devtools__get_network_request` - Get request details
- `mcp__chrome-devtools__list_console_messages` - View console logs
- `mcp__chrome-devtools__get_console_message` - Get message details

### Example: Testing Calculator UI

```typescript
// Test script using Chrome DevTools MCP
async function testCalculatorUI() {
  // 1. Navigate to MCP Interpreter
  await callTool('mcp__chrome-devtools__navigate_page', {
    url: 'http://localhost:3003'
  });

  // 2. Wait for page load
  await callTool('mcp__chrome-devtools__wait_for', {
    text: 'MCP Interpreter'
  });

  // 3. Take snapshot to find connection form
  const snapshot = await callTool('mcp__chrome-devtools__take_snapshot', {});

  // 4. Fill connection form
  await callTool('mcp__chrome-devtools__fill_form', {
    elements: [
      {
        uid: 'server-path-input',
        value: '/mnt/Shared/cs-projects/simply-mcp-ts/examples/interface-ui-foundation.ts'
      },
      {
        uid: 'transport-type',
        value: 'stdio'
      }
    ]
  });

  // 5. Click connect button
  await callTool('mcp__chrome-devtools__click', {
    uid: 'connect-button'
  });

  // 6. Wait for connection
  await callTool('mcp__chrome-devtools__wait_for', {
    text: 'Connected',
    timeout: 60000
  });

  // 7. Navigate to Resources tab
  await callTool('mcp__chrome-devtools__click', {
    uid: 'resources-tab'
  });

  // 8. Click on Calculator UI resource
  await callTool('mcp__chrome-devtools__click', {
    uid: 'resource-ui-calculator-v1'
  });

  // 9. Wait for UI to render
  await callTool('mcp__chrome-devtools__wait_for', {
    text: 'Simple Calculator'
  });

  // 10. Verify iframe exists
  const hasIframe = await callTool('mcp__chrome-devtools__evaluate_script', {
    function: `() => {
      const iframe = document.querySelector('iframe[sandbox="allow-scripts"]');
      return iframe !== null;
    }`
  });

  // 11. Test calculator interaction
  // Note: Interacting with iframe content requires switching context
  await callTool('mcp__chrome-devtools__evaluate_script', {
    function: `() => {
      const iframe = document.querySelector('iframe[sandbox="allow-scripts"]');
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      const button = iframeDoc.querySelector('.btn-calculate');
      button.click();
      return true;
    }`
  });

  // 12. Take screenshot
  await callTool('mcp__chrome-devtools__take_screenshot', {
    filePath: '/tmp/calculator-ui-test.png'
  });

  // 13. Check console for errors
  const consoleMessages = await callTool('mcp__chrome-devtools__list_console_messages', {});
  const errors = consoleMessages.filter(msg => msg.level === 'error');

  return {
    success: errors.length === 0,
    hasIframe,
    errors
  };
}
```

### Example: Testing Tool Integration

```typescript
async function testToolIntegration() {
  // Assume we're already connected and viewing a UI

  // 1. Get snapshot of UI
  const snapshot = await callTool('mcp__chrome-devtools__take_snapshot', {});

  // 2. Find and click action button
  await callTool('mcp__chrome-devtools__click', {
    uid: 'refresh-button' // From snapshot
  });

  // 3. Wait for loading state
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 4. Check network requests for tool call
  const requests = await callTool('mcp__chrome-devtools__list_network_requests', {
    resourceTypes: ['xhr', 'fetch']
  });

  // 5. Find tool execution request
  const toolRequest = requests.find(req =>
    req.url.includes('/api/mcp/tools/execute')
  );

  // 6. Get request details
  const details = await callTool('mcp__chrome-devtools__get_network_request', {
    reqid: toolRequest.reqid
  });

  // 7. Verify request body
  const requestBody = JSON.parse(details.requestBody);
  console.log('Tool call:', requestBody.toolName);
  console.log('Arguments:', requestBody.arguments);

  // 8. Check console for tool logs
  const consoleLogs = await callTool('mcp__chrome-devtools__list_console_messages', {
    types: ['log', 'info']
  });

  const toolLogs = consoleLogs.filter(log =>
    log.text.includes('Tool Call') || log.text.includes('Tool Result')
  );

  return {
    toolCalled: toolRequest !== undefined,
    requestBody,
    toolLogs
  };
}
```

### Running Automated Tests

```bash
# Create a test script file
cat > test-ui-automation.ts << 'EOF'
// Your test script here
EOF

# Run the test script
npx simply-mcp run test-ui-automation.ts
```

---

## Security Testing

### Verifying Iframe Sandbox

#### Manual Inspection

Open browser DevTools (F12) and inspect the iframe element:

```javascript
// In browser console
const iframe = document.querySelector('iframe');
console.log('Sandbox:', iframe.sandbox.value);
// Should output: "allow-scripts"

console.log('Has allow-scripts:', iframe.sandbox.contains('allow-scripts'));
// Should output: true

console.log('Has allow-same-origin:', iframe.sandbox.contains('allow-same-origin'));
// Should output: false
```

#### Expected Sandbox Attributes

**Correct configuration:**
```html
<iframe sandbox="allow-scripts"></iframe>
```

**Incorrect configurations (security issues):**
```html
<!-- TOO PERMISSIVE -->
<iframe sandbox="allow-scripts allow-same-origin"></iframe>

<!-- NO SANDBOX -->
<iframe></iframe>

<!-- NO RESTRICTIONS -->
<iframe sandbox=""></iframe>
```

### Testing Cross-Origin Isolation

Verify that iframe cannot access parent window:

```javascript
// Inside iframe context (run in iframe console)
try {
  window.parent.document;
  console.error('SECURITY ISSUE: Can access parent document!');
} catch (e) {
  console.log('✓ Correctly blocked from accessing parent');
}

try {
  window.top.location;
  console.error('SECURITY ISSUE: Can access top location!');
} catch (e) {
  console.log('✓ Correctly blocked from accessing top location');
}
```

### Testing postMessage Origin Validation

Verify that postMessage validates source:

```javascript
// In parent window context
window.addEventListener('message', (event) => {
  console.log('Message origin:', event.origin);
  // Should be 'null' or sandboxed origin

  console.log('Event source:', event.source);
  // Should be the iframe window reference

  // Validation should occur before processing message
  if (event.source !== iframe.contentWindow) {
    console.error('SECURITY ISSUE: Message from unexpected source!');
  }
});
```

### Testing Tool Allowlist Enforcement

Test that disallowed tools are rejected:

```javascript
// Inside UI iframe
async function testDisallowedTool() {
  try {
    // Attempt to call tool not in allowlist
    const result = await callTool('system_execute', {
      command: 'ls -la'
    });
    console.error('SECURITY ISSUE: Disallowed tool executed!');
  } catch (error) {
    console.log('✓ Correctly blocked disallowed tool');
    console.log('Error:', error.message);
    // Should see: "Tool 'system_execute' not allowed"
  }
}
```

### Testing XSS Prevention

Attempt common XSS attacks (should all be blocked):

```javascript
// Test script injection in tool parameters
await callTool('example_tool', {
  message: '<script>alert("XSS")</script>'
});
// Script should not execute

// Test event handler injection
await callTool('example_tool', {
  html: '<img src=x onerror="alert(1)">'
});
// Event should not execute

// Test javascript: protocol
await callTool('example_tool', {
  url: 'javascript:alert("XSS")'
});
// Should be blocked or sanitized
```

### Security Checklist

Use this checklist to verify security implementation:

- [ ] Iframe has `sandbox` attribute
- [ ] Only `allow-scripts` permission granted
- [ ] NO `allow-same-origin` permission
- [ ] NO `allow-top-navigation` permission
- [ ] iframe origin is `null` or sandboxed
- [ ] postMessage validates event.source
- [ ] postMessage validates event.origin
- [ ] Tool allowlist is enforced
- [ ] Disallowed tools return error
- [ ] Script injection attempts blocked
- [ ] Event handler injection blocked
- [ ] javascript: URLs blocked
- [ ] data: URLs for srcdoc only
- [ ] No access to parent window
- [ ] No access to cookies
- [ ] No access to localStorage (parent)
- [ ] CSP headers present (if applicable)

---

## API Testing

### Testing Resources API

#### List All Resources

```bash
# List all resources from connected server
curl http://localhost:3003/api/mcp/resources

# Expected response:
{
  "success": true,
  "data": [
    {
      "uri": "ui://calculator/v1",
      "name": "Calculator",
      "description": "Simple calculator UI with tool integration",
      "mimeType": "text/html"
    },
    {
      "uri": "ui://stats/live",
      "name": "Live Statistics",
      "description": "Real-time server statistics with subscribable updates",
      "mimeType": "text/html"
    }
  ]
}
```

#### Read UI Resource

```bash
# Read a specific UI resource
curl -X POST http://localhost:3003/api/mcp/resources/read \
  -H "Content-Type: application/json" \
  -d '{"uri":"ui://calculator/v1"}'

# Expected response:
{
  "success": true,
  "data": {
    "contents": [
      {
        "uri": "ui://calculator/v1",
        "mimeType": "text/html",
        "text": "<!DOCTYPE html><html>...</html>"
      }
    ]
  }
}
```

### Testing Tools API

#### List Available Tools

```bash
# List all tools
curl http://localhost:3003/api/mcp/tools

# Expected response:
{
  "success": true,
  "data": [
    {
      "name": "add",
      "description": "Add two numbers",
      "inputSchema": {
        "type": "object",
        "properties": {
          "a": { "type": "number" },
          "b": { "type": "number" }
        },
        "required": ["a", "b"]
      }
    }
  ]
}
```

#### Execute Tool

```bash
# Execute a tool
curl -X POST http://localhost:3003/api/mcp/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "add",
    "arguments": {
      "a": 5,
      "b": 3
    }
  }'

# Expected response:
{
  "success": true,
  "data": {
    "content": [
      {
        "type": "text",
        "text": "8"
      }
    ]
  }
}
```

### Testing Connection API

#### Connect to Server

```bash
# Connect to stdio server
curl -X POST http://localhost:3003/api/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{
    "type": "stdio",
    "serverPath": "/mnt/Shared/cs-projects/simply-mcp-ts/examples/interface-ui-foundation.ts"
  }'

# Expected response:
{
  "success": true,
  "data": {
    "serverName": "foundation-ui-example",
    "serverVersion": "1.0.0",
    "capabilities": {
      "resources": { "subscribe": true },
      "tools": {}
    },
    "transport": "stdio"
  }
}
```

#### Check Connection Status

```bash
# Check current connection status
curl http://localhost:3003/api/mcp/status

# Expected response (when connected):
{
  "success": true,
  "data": {
    "status": "connected",
    "serverName": "foundation-ui-example",
    "serverVersion": "1.0.0"
  }
}

# Expected response (when disconnected):
{
  "success": true,
  "data": {
    "status": "disconnected"
  }
}
```

#### Disconnect from Server

```bash
# Disconnect from current server
curl -X POST http://localhost:3003/api/mcp/disconnect

# Expected response:
{
  "success": true,
  "data": {
    "message": "Disconnected successfully"
  }
}
```

### API Error Testing

Test error handling:

```bash
# Test invalid resource URI
curl -X POST http://localhost:3003/api/mcp/resources/read \
  -H "Content-Type: application/json" \
  -d '{"uri":"ui://nonexistent/resource"}'

# Expected response:
{
  "success": false,
  "error": "Resource not found: ui://nonexistent/resource"
}

# Test invalid tool name
curl -X POST http://localhost:3003/api/mcp/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "nonexistent_tool",
    "arguments": {}
  }'

# Expected response:
{
  "success": false,
  "error": "Tool not found: nonexistent_tool"
}

# Test disconnected state
curl http://localhost:3003/api/mcp/resources

# Expected response (when not connected):
{
  "success": false,
  "error": "Not connected to MCP server"
}
```

---

## References

### Documentation

- **MCP UI Primer**: `/mnt/Shared/cs-projects/simply-mcp-ts/docs/mcp-ui-primer/`
  - [00-OVERVIEW.md](../docs/mcp-ui-primer/00-OVERVIEW.md) - Concepts and architecture
  - [01-PROTOCOL-SPECIFICATION.md](../docs/mcp-ui-primer/01-PROTOCOL-SPECIFICATION.md) - Protocol details
  - [02-IMPLEMENTATION-GUIDE.md](../docs/mcp-ui-primer/02-IMPLEMENTATION-GUIDE.md) - Implementation steps
  - [03-MESSAGE-FORMAT.md](../docs/mcp-ui-primer/03-MESSAGE-FORMAT.md) - Message formats
  - [04-EXAMPLES.md](../docs/mcp-ui-primer/04-EXAMPLES.md) - Code examples
  - [05-SECURITY.md](../docs/mcp-ui-primer/05-SECURITY.md) - Security guide

### Example Servers

- **Foundation Layer**: `/mnt/Shared/cs-projects/simply-mcp-ts/examples/interface-ui-foundation.ts`
- **Component Library**: `/mnt/Shared/cs-projects/simply-mcp-ts/examples/interface-component-library.ts`
- **React Component**: `/mnt/Shared/cs-projects/simply-mcp-ts/examples/interface-react-component.ts`
- **React Dashboard**: `/mnt/Shared/cs-projects/simply-mcp-ts/examples/interface-react-dashboard.ts`
- **Remote DOM**: `/mnt/Shared/cs-projects/simply-mcp-ts/examples/interface-remote-dom.ts`

### Test Reports

- **Error Scenarios Report**: `/mnt/Shared/cs-projects/simply-mcp-ts/mcp-interpreter/ERROR-SCENARIOS-TEST-REPORT.md`
- **Test Commands Reference**: `/mnt/Shared/cs-projects/simply-mcp-ts/mcp-interpreter/TEST-COMMANDS-REFERENCE.md`

### External Resources

- **MCP UI GitHub**: https://github.com/idosal/mcp-ui
- **MCP UI Website**: https://mcpui.dev
- **MCP Specification**: https://spec.modelcontextprotocol.io/
- **simply-mcp-ts Repository**: https://github.com/cyanheads/simply-mcp-ts

### Getting Help

If you encounter issues or have questions:

1. **Check Troubleshooting**: Review the [Troubleshooting](#troubleshooting) section
2. **Review Test Reports**: Check existing test reports for known issues
3. **Inspect Browser Console**: Look for error messages and warnings
4. **Check Server Logs**: Review server output for errors
5. **Open an Issue**: Report bugs or ask questions on GitHub

---

## Summary

This guide covered:

- ✅ **Overview** of MCP UI and why testing is important
- ✅ **Quick Start** instructions for testing
- ✅ **Available test servers** and their features
- ✅ **What to verify** when testing UI rendering
- ✅ **Comprehensive checklist** for thorough testing
- ✅ **Troubleshooting** common issues
- ✅ **Automated testing** using Chrome DevTools MCP
- ✅ **Security testing** procedures and verification
- ✅ **API testing** with curl commands

### Next Steps

1. **Start the MCP Interpreter**: `npm run dev` in `mcp-interpreter/`
2. **Run an example server**: `npx simply-mcp run examples/interface-ui-foundation.ts`
3. **Connect and test**: Follow the Quick Start guide
4. **Use the checklist**: Verify all items
5. **Report issues**: Document and report any problems found

### Production Readiness

Based on comprehensive testing (see ERROR-SCENARIOS-TEST-REPORT.md), the MCP Interpreter demonstrates:

- **Excellent stability** - No crashes under any tested condition
- **Robust error handling** - Clear, consistent error messages
- **Strong security** - Proper sandboxing and validation
- **Good performance** - No memory leaks or resource issues

**Overall Assessment**: Production-ready with excellent quality

---

**Happy Testing!** 🧪

For questions or improvements to this guide, please open an issue or submit a pull request.

**Version:** 1.0
**Last Updated:** 2025-10-30
