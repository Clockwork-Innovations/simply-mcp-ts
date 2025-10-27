# MCP UI Compliance Review

**Project**: simply-mcp-ts
**Review Date**: October 25, 2025
**Reviewer**: Automated Analysis
**Standard**: MCP UI Protocol (github.com/idosal/mcp-ui)
**Purpose**: Assess compliance with official MCP UI specification - NO FIXES, REVIEW ONLY

---

## Executive Summary

This review compares the `simply-mcp-ts` implementation against the official MCP UI specification from github.com/idosal/mcp-ui. The analysis identifies areas of compliance, deviation, and custom extensions.

### Overall Assessment

**Status**: ⚠️ **Partially Compliant with Custom Extensions**

The implementation provides a working MCP UI system but uses **different message protocols** than the official specification. This is a significant deviation that affects interoperability with standard MCP UI clients.

### Key Findings

| Category | Status | Notes |
|----------|--------|-------|
| **URI Scheme** | ✅ Compliant | Uses `ui://category/name` format |
| **MIME Types** | ⚠️ Partial | Supports `text/html`, missing Remote DOM |
| **Resource Structure** | ✅ Compliant | Follows MCP resource protocol |
| **postMessage Protocol** | ❌ Non-Compliant | Custom message format |
| **Tool Helper API** | ❌ Non-Compliant | Different function signature |
| **Security** | ✅ Compliant | Sandbox and allowlist implemented |
| **React Support** | ✅ Extended | Custom compiler/bundler (not in spec) |

---

## Detailed Analysis

### 1. URI Scheme - ✅ COMPLIANT

**Specification Requirement**:
- URI format: `ui://component/id`
- Maps to methods for dynamic content

**Implementation**:
```typescript
// From ui-adapter.ts:733
export function uriToMethodName(uri: string): string {
  let path = uri.replace(/^ui:\/\//, '');
  const parts = path.split(/[\/\-]/);
  return parts.map((part, index) => {
    if (index === 0) {
      return part.toLowerCase();
    } else {
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }
  }).join('');
}
```

**Assessment**: ✅ **Fully Compliant**
- Correctly uses `ui://` scheme
- Proper URI-to-method mapping (e.g., `ui://stats/live` → `statsLive`)
- Supports category-based organization

---

### 2. MIME Type Support - ⚠️ PARTIAL COMPLIANCE

**Specification Requirements**:
1. `text/html` - Inline HTML in iframe
2. `text/uri-list` - External URLs
3. `application/vnd.mcp-ui.remote-dom` - Remote DOM components

**Implementation**:

```typescript
// From ui-adapter.ts:88
mimeType: 'text/html',
```

**Assessment**: ⚠️ **Partial**
- ✅ Supports `text/html` fully
- ❌ No evidence of `text/uri-list` support in adapter
- ❌ No `application/vnd.mcp-ui.remote-dom` implementation
- ℹ️ Custom React compilation as alternative to Remote DOM

**Gap**: Missing official Remote DOM and external URL support.

**Impact**:
- Cannot render standard MCP UI remote-dom components
- Cannot embed external URLs via `text/uri-list`
- React components work but are non-standard extension

---

### 3. Resource Structure - ✅ COMPLIANT

**Specification Requirement**:
```typescript
{
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
}
```

**Implementation**:
```typescript
// From ui-adapter.ts:84-110
server.addResource({
  uri,
  name: name || uri,
  description: description || `UI: ${uri}`,
  mimeType: 'text/html',
  content: async () => {
    const htmlContent = await Promise.resolve(method.call(serverInstance));
    // ... enhancement ...
    return finalHTML;
  },
});
```

**Assessment**: ✅ **Compliant**
- Correctly structures UI as MCP resources
- Proper URI, name, description fields
- Uses standard `mimeType` field
- Content can be static string or async function

---

### 4. postMessage Protocol - ❌ NON-COMPLIANT

**This is the most significant deviation from the standard.**

#### Official Specification

**Action Messages (UI → Parent)**:
```typescript
// Tool call
{ type: 'tool', payload: { toolName, params } }

// Prompt
{ type: 'prompt', payload: { prompt } }

// Notification
{ type: 'notify', payload: { message } }

// Intent
{ type: 'intent', payload: { intent, params } }

// Link
{ type: 'link', payload: { url } }
```

**Optional**: `messageId` for async responses

#### Implementation (simply-mcp-ts)

**Action Messages**:
```typescript
// From ui-adapter.ts:495-500
window.parent.postMessage({
  type: 'mcp-ui-tool-call',    // ❌ Different type
  requestId: requestId,         // ❌ Different field name
  toolName: toolName,           // ❌ Flat structure
  params: params                // ❌ No payload wrapper
}, '*');
```

**Response Messages**:
```typescript
// From ui-adapter.ts:447
if (event.data.type === 'mcp-ui-tool-response') {  // ❌ Custom type
  const { requestId, success, result, error } = event.data;  // ❌ Custom fields
  // ...
}
```

**Notification Messages**:
```typescript
// From ui-adapter.ts:510-517
window.parent.postMessage({
  type: 'mcp-ui-notification',  // ❌ Different type
  level: level,
  message: message,
  timestamp: new Date().toISOString()
}, '*');
```

### Comparison Table

| Feature | Official Spec | simply-mcp-ts | Compliant? |
|---------|---------------|---------------|------------|
| Tool call type | `'tool'` | `'mcp-ui-tool-call'` | ❌ No |
| Message structure | `{ type, payload }` | `{ type, ...flat }` | ❌ No |
| Async ID field | `messageId` (optional) | `requestId` (required) | ❌ No |
| Response type | (not specified) | `'mcp-ui-tool-response'` | ❌ No |
| Notify type | `'notify'` | `'mcp-ui-notification'` | ❌ No |
| Prompt support | `{ type: 'prompt', payload }` | ❌ Not found | ❌ No |
| Intent support | `{ type: 'intent', payload }` | ❌ Not found | ❌ No |
| Link support | `{ type: 'link', payload }` | ❌ Not found | ❌ No |

**Assessment**: ❌ **Non-Compliant**

**Impact**:
- **CRITICAL**: UIs built for standard MCP UI clients will NOT work with simply-mcp-ts
- **CRITICAL**: simply-mcp-ts UIs will NOT work with standard MCP UI renderers
- Breaks interoperability with official `@mcp-ui/client` package
- Breaks compatibility with Apps SDK Adapter

**Root Cause**: Custom protocol designed before official spec, or intentional deviation.

---

### 5. Tool Helper API - ❌ NON-COMPLIANT

#### Official Specification

Not explicitly defined in official spec - UIs directly use `postMessage`:

```javascript
window.parent.postMessage({
  type: 'tool',
  payload: { toolName: 'getData', params: { id: 123 } }
}, '*');
```

With optional `messageId` for responses.

#### Implementation (simply-mcp-ts)

**Provides Helper Function**:
```typescript
// From ui-adapter.ts:472-502
window.callTool = function(toolName, params) {
  if (!ALLOWED_TOOLS.includes(toolName)) {
    return Promise.reject(new Error(
      'Tool "' + toolName + '" is not allowed. ' +
      'Allowed tools: ' + ALLOWED_TOOLS.join(', ')
    ));
  }

  return new Promise(function(resolve, reject) {
    const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36);
    const timeout = setTimeout(function() {
      pendingRequests.delete(requestId);
      reject(new Error('Tool call timed out after 30 seconds'));
    }, 30000);

    pendingRequests.set(requestId, { resolve, reject, timeout });

    window.parent.postMessage({
      type: 'mcp-ui-tool-call',
      requestId: requestId,
      toolName: toolName,
      params: params
    }, '*');
  });
};
```

**Assessment**: ⚠️ **Custom Extension**

**Positive Aspects**:
- ✅ Provides convenient Promise-based API
- ✅ Enforces tool allowlist (security)
- ✅ Handles async responses automatically
- ✅ Includes timeout protection (30s)
- ✅ Automatic cleanup on unload

**Issues**:
- ❌ Uses non-standard message format
- ❌ Won't work with official MCP UI clients
- ℹ️ Nicer API than manual postMessage

**Note**: This is a **developer experience improvement** but sacrifices **compatibility**.

---

### 6. Security Model - ✅ COMPLIANT

**Specification Requirements**:
- Sandbox iframes
- Restrict cross-origin access
- Tool allowlist enforcement
- Content Security Policy

**Implementation**:

```typescript
// From ui-adapter.ts:440
const ALLOWED_TOOLS = ["getData", "updateSetting"];  // ✅ Tool allowlist

// From ui-adapter.ts:474-478
if (!ALLOWED_TOOLS.includes(toolName)) {  // ✅ Enforced
  return Promise.reject(new Error(
    'Tool "' + toolName + '" is not allowed. ' +
    'Allowed tools: ' + ALLOWED_TOOLS.join(', ')
  ));
}
```

**Parser Metadata**:
```typescript
// From parser.ts:184
/** Array of tool names this UI can call */
tools?: string[];
```

**Assessment**: ✅ **Compliant and Enhanced**
- ✅ Tool allowlist properly enforced
- ✅ Clear security boundary
- ✅ Error messages for blocked tools
- ✅ Metadata in interface definitions
- ✅ Timeout protection (30s)
- ✅ Cleanup on unload

**Note**: Security implementation is **stronger** than minimum spec requirements.

---

### 7. Content Enhancement - ℹ️ CUSTOM EXTENSION

**Not in Official Spec**: Content enhancement pipeline

**Implementation Features**:

```typescript
// From ui-adapter.ts:366-418
async function injectHelpers(
  html: string,
  tools?: string[],
  css?: string,
  theme?: string | { name: string; variables: Record<string, string> }
): Promise<string>
```

**Custom Features**:
1. **Theme Injection** - CSS variables system
2. **Inline CSS Injection** - Style embedding
3. **Tool Helper Injection** - `callTool()` function
4. **File Resolution** - Load external HTML/CSS/JS
5. **React Compilation** - JSX → JS transformation
6. **Bundling** - esbuild integration
7. **Optimization** - Minification, CDN

**Assessment**: ℹ️ **Not in Spec (Extension)**

**Analysis**:
- These are **server-side conveniences** for developers
- Don't affect wire protocol (except postMessage format)
- Enhance developer experience significantly
- Make simply-mcp-ts more feature-rich
- But add complexity

**Compatibility Impact**: Neutral - these happen server-side before sending HTML

---

### 8. React Component Support - ℹ️ CUSTOM EXTENSION

**Official Spec**: Remote DOM with react/webcomponents framework option

**Implementation**: Custom React compiler and bundler

```typescript
// From ui-adapter.ts:171-255
if (component) {
  const { resolveUIFile } = await import('../features/ui/ui-file-resolver.js');
  const componentFile = await resolveUIFile(component, { serverFilePath, cache: true });

  if (ui.bundle) {
    const { bundleComponent } = await import('../features/ui/ui-bundler.js');
    // ... esbuild bundling ...
  } else {
    const { compileReactComponent } = await import('../features/ui/ui-react-compiler.js');
    // ... Babel compilation + CDN ...
  }
}
```

**Features**:
- TSX/JSX compilation
- esbuild bundling
- CDN mode (unpkg)
- Source maps
- Minification

**Assessment**: ℹ️ **Different Approach**

**Comparison**:

| Aspect | Official Remote DOM | simply-mcp-ts |
|--------|---------------------|---------------|
| Technology | `@remote-dom/core` | React + Babel/esbuild |
| MIME type | `application/vnd.mcp-ui.remote-dom` | `text/html` |
| Framework | Specified in metadata | Hardcoded to React |
| Dependencies | Host provides | CDN or bundled |
| Security | Web Worker sandbox | iframe (less isolated) |

**Pros of simply-mcp-ts approach**:
- ✅ Familiar React API
- ✅ Full npm ecosystem
- ✅ Bundling support
- ✅ Type safety (TypeScript)

**Cons**:
- ❌ Not using official Remote DOM spec
- ❌ Less secure (iframe vs Web Worker)
- ❌ Incompatible with official clients
- ❌ Larger payload size

---

### 9. Interface-Driven API - ℹ️ CUSTOM EXTENSION

**Not in Official Spec**: TypeScript interface parsing

**Implementation**:

```typescript
// From parser.ts:169-254
export interface ParsedUI {
  interfaceName: string;
  uri: string;
  name: string;
  description: string;
  html?: string;
  css?: string;
  tools?: string[];
  size?: { width?: number; height?: number };
  subscribable?: boolean;
  dynamic: boolean;
  methodName?: string;
  file?: string;
  component?: string;
  // ... many more fields
}
```

**Example Usage**:
```typescript
interface StatsUI extends IUI {
  uri: "ui://stats/live";
  name: "Live Statistics";
  html: "<div>Stats</div>";
  tools: ["getData"];
}
```

**Assessment**: ℹ️ **Unique Feature**

**Analysis**:
- **Not part of MCP UI spec** - this is simply-mcp-ts innovation
- Provides **type-safe UI definitions**
- Enables **compile-time validation**
- Makes code more maintainable
- Requires TypeScript

**Compatibility Impact**: None - this is a development-time feature

---

## Interoperability Analysis

### Can simply-mcp-ts UIs work with standard MCP UI clients?

**Answer**: ❌ **NO**

**Reasons**:
1. Different postMessage protocol (`'mcp-ui-tool-call'` vs `'tool'`)
2. Different message structure (flat vs `payload` wrapper)
3. No support for official Remote DOM MIME type
4. Missing `intent`, `prompt`, `link` actions

**Example Failure**:

```javascript
// simply-mcp-ts UI code
await callTool("getData", {id: 123});
// Sends: { type: 'mcp-ui-tool-call', requestId: '...', toolName: 'getData', params: {id: 123} }

// Official MCP UI client expects:
// { type: 'tool', payload: { toolName: 'getData', params: {id: 123} } }
// With optional messageId for responses

// Result: Client ignores message, tool never called
```

### Can standard MCP UI resources work with simply-mcp-ts?

**Answer**: ⚠️ **PARTIAL**

**HTML Resources**:
- ✅ Basic HTML will render
- ❌ Tool calls will fail (different postMessage format)
- ❌ Prompts, intents, links won't work

**Remote DOM Resources**:
- ❌ Won't render at all (unsupported MIME type)

**External URLs**:
- ❌ Won't render (no `text/uri-list` support)

---

## Standards Compliance Score

### Category Breakdown

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| URI Scheme | 10% | 100% | 10% |
| MIME Types | 15% | 33% | 5% |
| Resource Structure | 10% | 100% | 10% |
| postMessage Protocol | 35% | 0% | 0% |
| Tool Helper API | 10% | 30% | 3% |
| Security Model | 15% | 100% | 15% |
| Platform Adapters | 5% | 0% | 0% |

**Total Compliance Score**: **43%** (Failing)

---

## Risk Assessment

### High Risk Issues

#### 1. Protocol Incompatibility (CRITICAL)
**Issue**: Custom postMessage protocol prevents interoperability

**Impact**:
- Cannot use official `@mcp-ui/client` package
- Cannot use Apps SDK Adapter for ChatGPT integration
- UIs won't work in standard MCP UI hosts
- Creates ecosystem fragmentation

**Affected Code**:
- `src/adapters/ui-adapter.ts:495-500` (message sending)
- `src/adapters/ui-adapter.ts:447` (message receiving)
- `src/adapters/ui-adapter.ts:510-517` (notifications)

**Recommendation**: Consider migrating to official protocol

#### 2. Missing Remote DOM Support (HIGH)
**Issue**: No support for official Remote DOM components

**Impact**:
- Cannot render standard Remote DOM UIs
- More secure sandboxing not available
- Limited to HTML-only approach

**Affected Code**:
- `src/adapters/ui-adapter.ts` (no Remote DOM handling)

**Recommendation**: Implement `application/vnd.mcp-ui.remote-dom` support

#### 3. Missing External URL Support (MEDIUM)
**Issue**: No `text/uri-list` MIME type support

**Impact**:
- Cannot embed external dashboards (Grafana, etc.)
- Limited use cases

**Recommendation**: Add external URL rendering

### Medium Risk Issues

#### 4. Missing Action Types (MEDIUM)
**Issue**: No support for `prompt`, `intent`, `link` actions

**Impact**:
- UIs cannot submit prompts to LLM
- No intent system
- Links must be handled manually

**Affected Code**:
- `src/adapters/ui-adapter.ts:510-517` (only notifications)

**Recommendation**: Implement all five official action types

#### 5. Custom React Approach (MEDIUM)
**Issue**: Non-standard React compilation instead of Remote DOM

**Impact**:
- Different from official approach
- Larger bundle sizes
- Less secure (iframe vs Web Worker)

**Trade-off**: Better DX but less compatible

### Low Risk Issues

#### 6. Interface-Driven API (LOW)
**Issue**: Custom TypeScript interface system

**Impact**:
- Development-time only
- No compatibility issues
- Actually beneficial for TypeScript users

**Assessment**: Acceptable extension

---

## Recommendations

### For Developers Using simply-mcp-ts

1. **Be Aware**: Your UIs will NOT work with standard MCP UI clients
2. **Document**: Clearly mark UIs as "simply-mcp-ts only"
3. **Consider Migration Path**: Plan for future protocol updates
4. **Test Thoroughly**: Cannot use official testing tools

### For Maintainers of simply-mcp-ts

#### Short-term (Maintain Current Approach)

1. **Document Deviations**: Create compatibility matrix
2. **Add Warning**: Document protocol differences prominently
3. **Consider Deprecation**: Mark custom protocol as legacy

#### Long-term (Migrate to Standard)

1. **Implement Official Protocol**:
   ```typescript
   // New format
   window.parent.postMessage({
     type: 'tool',
     payload: { toolName, params },
     messageId: 'optional-id'
   }, '*');
   ```

2. **Add MIME Type Support**:
   - Implement `text/uri-list` rendering
   - Implement `application/vnd.mcp-ui.remote-dom` support

3. **Add Missing Actions**:
   - `prompt` - Submit to LLM
   - `intent` - Intent system
   - `link` - Navigation

4. **Backward Compatibility**:
   - Support both protocols during transition
   - Provide migration tool for existing UIs

5. **Testing**:
   - Validate against official `@mcp-ui/client`
   - Test Apps SDK Adapter integration

---

## Positive Aspects

Despite non-compliance, simply-mcp-ts has notable strengths:

### 1. Developer Experience
- ✅ Type-safe interface definitions
- ✅ Excellent TypeScript integration
- ✅ Promise-based tool helper API
- ✅ File-based organization
- ✅ Hot reloading support

### 2. Feature Richness
- ✅ Theme system
- ✅ Component bundling
- ✅ Optimization pipeline
- ✅ CDN support
- ✅ Performance monitoring

### 3. Security
- ✅ Strong tool allowlist enforcement
- ✅ Timeout protection
- ✅ Proper cleanup
- ✅ Clear security boundaries

### 4. React Integration
- ✅ Full React/JSX support
- ✅ TypeScript component compilation
- ✅ npm ecosystem access
- ✅ Modern tooling (esbuild, Babel)

### 5. Documentation
- ✅ Comprehensive examples
- ✅ Clear error messages
- ✅ Good code comments
- ✅ Architecture documentation

---

## Technical Debt Assessment

### Current Protocol
**Estimated Effort to Migrate**: 🔴 **HIGH**

**Affected Areas**:
1. `src/adapters/ui-adapter.ts` - Tool helper generation
2. Client-side renderer (if exists)
3. All example UIs
4. Documentation
5. Tests

**Breaking Change**: YES - All existing UIs need updates

### Migration Strategy

#### Phase 1: Dual Protocol Support
- Support both old and new formats
- Auto-detect message type
- Deprecation warnings

#### Phase 2: Transition Period
- Update examples to new protocol
- Provide migration guide
- Update documentation

#### Phase 3: Remove Legacy
- Drop custom protocol support
- Clean up codebase
- Publish major version

---

## Compliance Gaps Summary

### Critical Gaps
1. ❌ Non-standard postMessage protocol
2. ❌ No Remote DOM support
3. ❌ Missing `prompt`, `intent`, `link` actions

### Medium Gaps
1. ⚠️ No `text/uri-list` support
2. ⚠️ Custom React approach vs Remote DOM

### Minor Gaps
1. ℹ️ No Apps SDK Adapter
2. ℹ️ Custom message field names

---

## Conclusion

### Summary

`simply-mcp-ts` implements a **functional MCP UI system** with many **excellent features** but uses a **custom protocol** that is **incompatible** with the official MCP UI specification.

### Compliance Status
**43% Compliant** - The implementation works well as a standalone system but cannot interoperate with standard MCP UI ecosystem.

### Key Strengths
- Excellent developer experience
- Strong security model
- Rich feature set
- Well-documented

### Key Weaknesses
- **Non-standard postMessage protocol**
- **Missing official MIME types**
- **Breaks interoperability**
- **Ecosystem fragmentation**

### Final Recommendation

**For Current Users**: Continue using but be aware of limitations

**For New Projects**: Consider if interoperability with official MCP UI clients is required:
- If YES: Use official `@mcp-ui/server` package
- If NO: simply-mcp-ts provides excellent DX

**For Maintainers**: Consider migration path to official protocol in future major version

---

## Appendix: Official vs Implementation Comparison

### Message Protocol Side-by-Side

#### Tool Call

**Official**:
```javascript
window.parent.postMessage({
  type: 'tool',
  payload: {
    toolName: 'getData',
    params: { id: 123 }
  },
  messageId: 'msg_123' // optional
}, '*');
```

**simply-mcp-ts**:
```javascript
window.parent.postMessage({
  type: 'mcp-ui-tool-call',
  requestId: 'req_456',
  toolName: 'getData',
  params: { id: 123 }
}, '*');
```

#### Notification

**Official**:
```javascript
window.parent.postMessage({
  type: 'notify',
  payload: {
    message: 'Success'
  }
}, '*');
```

**simply-mcp-ts**:
```javascript
window.parent.postMessage({
  type: 'mcp-ui-notification',
  level: 'info',
  message: 'Success',
  timestamp: '2025-10-25T07:00:00Z'
}, '*');
```

### Feature Matrix

| Feature | Official | simply-mcp-ts | Compatible? |
|---------|----------|---------------|-------------|
| URI Scheme | `ui://` | `ui://` | ✅ Yes |
| HTML MIME | ✅ | ✅ | ✅ Yes |
| URI-list MIME | ✅ | ❌ | ❌ No |
| Remote DOM MIME | ✅ | ❌ | ❌ No |
| Tool Action | `'tool'` | `'mcp-ui-tool-call'` | ❌ No |
| Prompt Action | `'prompt'` | ❌ | ❌ No |
| Notify Action | `'notify'` | `'mcp-ui-notification'` | ❌ No |
| Intent Action | `'intent'` | ❌ | ❌ No |
| Link Action | `'link'` | ❌ | ❌ No |
| Message Structure | `{type, payload}` | `{type, ...flat}` | ❌ No |
| Async ID | `messageId` | `requestId` | ❌ No |
| Tool Helper | Manual postMessage | `window.callTool()` | ⚠️ Different |
| Apps SDK Adapter | ✅ | ❌ | ❌ No |
| React Support | Via Remote DOM | Custom compiler | ⚠️ Different |

---

**End of Review**

This review is provided for informational purposes. No code fixes are included per request.
