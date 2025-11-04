# Manual Testing Protocol for Remote DOM E2E

**Version:** 1.0
**Date:** 2025-10-31
**Status:** Active Manual Testing Protocol

---

## Purpose

This document provides a step-by-step manual testing protocol for Remote DOM features in the browser. While our 376 unit tests validate the protocol implementation with mocked workers, manual browser testing verifies real-world behavior in actual browser environments.

---

## Quick Start

**Prerequisites:**
- Chrome/Firefox browser with DevTools
- Server running on localhost:3000
- 10-15 minutes for complete test run

**Run Tests:**
1. Start server: `npx simply-mcp run examples/create-ui-resource-demo.ts`
2. Open browser to: `http://localhost:3000`
3. Follow test scenarios below
4. Document results in test log

---

## Test Scenarios

### 1. Basic Remote DOM Rendering

**Objective:** Verify Remote DOM worker initialization and rendering

**Steps:**
1. Trigger `show_counter` tool
2. Open DevTools → Console
3. Look for: "Initializing Web Worker..."
4. Verify component renders within 2 seconds

**Expected Results:**
- ✅ Web Worker initializes without errors
- ✅ Counter component displays on screen
- ✅ No console errors related to Worker

**DevTools Verification:**
```javascript
// Check worker created
performance.getEntriesByType('resource')
  .filter(e => e.name.includes('blob:'))
```

**Pass Criteria:** Component visible, no errors

---

### 2. Web Worker Communication

**Objective:** Verify postMessage protocol between worker and host

**Steps:**
1. Open DevTools → Console
2. Trigger Remote DOM UI resource
3. Monitor console for message flow
4. Check for operation sequences (createElement, appendChild, setTextContent)

**Expected Results:**
- ✅ Worker sends "ready" message
- ✅ Host sends "executeScript" message
- ✅ Worker sends DOM operations
- ✅ Operations processed sequentially

**DevTools Verification:**
```javascript
// Monitor postMessage calls
window.addEventListener('message', (e) => {
  console.log('Message received:', e.data);
});
```

**Pass Criteria:** Message exchange visible, no postMessage errors

---

### 3. DOM Operations Processing

**Objective:** Verify all DOM operations render correctly

**Steps:**
1. Trigger UI with multiple elements (buttons, inputs, text)
2. Inspect rendered DOM tree
3. Verify element hierarchy matches expected structure
4. Check element attributes and styles

**Expected Results:**
- ✅ createElement operations produce elements
- ✅ appendChild creates correct hierarchy
- ✅ setTextContent updates element text
- ✅ setAttribute applies attributes correctly

**DevTools Verification:**
```javascript
// Inspect rendered elements
document.querySelector('.remote-dom-root').childNodes
```

**Pass Criteria:** DOM structure matches script operations

---

### 4. Component Library Whitelist

**Objective:** Verify security - only allowed components render

**Steps:**
1. Modify test script to include disallowed tag (e.g., `<script>`)
2. Trigger UI resource
3. Check DevTools console for rejection message
4. Verify dangerous element does NOT appear in DOM

**Expected Results:**
- ✅ Console error: "Component not allowed: script"
- ✅ Element not rendered
- ✅ Rendering continues for valid elements

**DevTools Verification:**
```javascript
// Check no script tags rendered
document.querySelector('.remote-dom-root script') === null
```

**Pass Criteria:** Dangerous elements blocked, error logged

---

### 5. Tool Calls via postMessage

**Objective:** Verify UI can call MCP tools via callHost operation

**Steps:**
1. Trigger UI with button that calls tool
2. Click button in rendered UI
3. Monitor DevTools → Network for tool execution
4. Verify tool result displayed in UI

**Expected Results:**
- ✅ Button click triggers callHost operation
- ✅ postMessage sent to parent with tool payload
- ✅ Tool executes on server
- ✅ Result returned and displayed

**DevTools Verification:**
```javascript
// Watch for callHost messages
window.addEventListener('message', (e) => {
  if (e.data.type === 'callHost') {
    console.log('Tool call:', e.data);
  }
});
```

**Pass Criteria:** Tool executes, result visible

---

### 6. Event Handling

**Objective:** Verify addEventListener operations wire up correctly

**Steps:**
1. Trigger UI with interactive elements (buttons, inputs)
2. Click button, type in input
3. Verify events fire and handlers execute
4. Check console for event logs

**Expected Results:**
- ✅ Click events fire on buttons
- ✅ Input events fire on text fields
- ✅ Event handlers execute without errors
- ✅ UI updates in response to events

**DevTools Verification:**
```javascript
// Check event listeners attached
getEventListeners(document.querySelector('.remote-dom-root button'))
```

**Pass Criteria:** Events fire, handlers execute

---

### 7. Error Handling

**Objective:** Verify graceful error handling for invalid operations

**Steps:**
1. Modify script to include syntax error
2. Trigger UI resource
3. Check error state displays
4. Verify no app crash, clear error message shown

**Expected Results:**
- ✅ Error state renders with message
- ✅ Error has `role="alert"` for accessibility
- ✅ Error styled clearly (red text)
- ✅ App remains functional

**DevTools Verification:**
```javascript
// Check error element
document.querySelector('[role="alert"]')
```

**Pass Criteria:** Error displayed, app stable

---

### 8. Cleanup and Memory Management

**Objective:** Verify worker terminates and resources cleaned up

**Steps:**
1. Trigger UI resource
2. Note worker blob URL in DevTools → Sources
3. Close/unmount UI component
4. Verify worker terminated
5. Check blob URL revoked

**Expected Results:**
- ✅ Worker terminates on unmount
- ✅ Blob URL revoked (404 if accessed)
- ✅ Event listeners removed
- ✅ No memory leaks (check DevTools → Memory)

**DevTools Verification:**
```javascript
// Worker count
performance.getEntriesByType('resource')
  .filter(e => e.name.includes('blob:')).length
```

**Pass Criteria:** Worker cleaned up, no leaks

---

## Test Checklist

Use this checklist to track test progress:

```
[ ] 1. Basic Remote DOM Rendering
[ ] 2. Web Worker Communication
[ ] 3. DOM Operations Processing
[ ] 4. Component Library Whitelist
[ ] 5. Tool Calls via postMessage
[ ] 6. Event Handling
[ ] 7. Error Handling
[ ] 8. Cleanup and Memory Management
```

---

## Test Log Template

**Date:** ___________
**Tester:** ___________
**Browser:** ___________ (version: ___)
**Server:** localhost:3000

| Test # | Scenario | Pass/Fail | Notes |
|--------|----------|-----------|-------|
| 1 | Basic Rendering | | |
| 2 | Worker Communication | | |
| 3 | DOM Operations | | |
| 4 | Component Whitelist | | |
| 5 | Tool Calls | | |
| 6 | Event Handling | | |
| 7 | Error Handling | | |
| 8 | Cleanup | | |

**Overall Result:** PASS / FAIL
**Issues Found:** _______________________

---

## Troubleshooting

### Worker Not Initializing
- Check Console for CSP violations
- Verify browser supports Web Workers
- Clear browser cache and retry

### DOM Not Rendering
- Check worker sends operations
- Verify no console errors
- Inspect `.remote-dom-root` element exists

### Tool Calls Not Working
- Verify postMessage listener active
- Check tool allowlist includes tool name
- Monitor Network tab for API calls

### Performance Issues
- Check worker not repeatedly spawning
- Verify operations batched efficiently
- Use DevTools → Performance profiler

---

## Next Steps

After completing manual tests:

1. **Document Results** - Fill out test log
2. **Report Issues** - Create GitHub issues for failures
3. **Update Tests** - Add unit tests for any bugs found
4. **Repeat** - Re-test after fixes

For automated E2E testing, see: [Future Enhancement Roadmap](./README.md#future-enhancements)

---

**Last Updated:** 2025-10-31
**Maintained By:** simply-mcp-ts maintainers
