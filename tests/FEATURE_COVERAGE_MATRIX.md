# MCP UI Feature Coverage Matrix

**Date:** 2025-10-30
**Audit Performed By:** Task 1.2 - Testing Infrastructure Objective
**Purpose:** Identify test coverage gaps for all 9 MCP UI features

---

## Coverage Summary

| Feature | Protocol Tests | Unit Tests | E2E Tests | Status | Priority |
|---------|---------------|------------|-----------|--------|----------|
| 1. Raw HTML rendering | ✅ Full | ⚠️ Partial | ⚠️ Manual Only | **GAP** | HIGH |
| 2. External URL rendering | ✅ Full | ⚠️ Partial | ❌ None | **GAP** | HIGH |
| 3. Remote DOM | ✅ Full | ⚠️ Partial | ❌ None | **GAP** | MEDIUM |
| 4. Tool calls (postMessage) | ✅ Full | ❌ None | ⚠️ Manual Only | **GAP** | HIGH |
| 5. Prompts (postMessage) | ✅ Full | ❌ None | ❌ None | **GAP** | HIGH |
| 6. Notifications (postMessage) | ✅ Full | ❌ None | ❌ None | **GAP** | MEDIUM |
| 7. Navigation/Links (postMessage) | ✅ Full | ❌ None | ❌ None | **GAP** | MEDIUM |
| 8. Intents (postMessage) | ✅ Full | ❌ None | ❌ None | **GAP** | LOW |
| 9. Subscriptions (live updates) | ✅ Full | ⚠️ Partial | ⚠️ Manual Only | **GAP** | MEDIUM |

**Legend:**
- ✅ Full: Comprehensive automated tests exist
- ⚠️ Partial: Some tests exist but coverage is incomplete
- ❌ None: No automated tests found
- Manual Only: Verified manually but no automated tests

---

## Detailed Feature Analysis

### 1. Raw HTML Rendering (text/html)

**Protocol Tests:** ✅ FULL
- Location: `tests/unit/protocol/postmessage-compliance.test.ts`
- Coverage: Message format validation, spec compliance
- Tests: 68/68 passing

**Unit Tests:** ⚠️ PARTIAL
- Location: `tests/unit/interface-api/ui-resource-renderer.test.tsx`
- Coverage: Basic rendering, error handling
- Tests: 10/10 passing (just created)
- **GAPS:**
  - No tests for iframe creation
  - No tests for sandbox attribute verification
  - No tests for HTML content injection
  - No tests for CSS isolation

**E2E Tests:** ⚠️ MANUAL ONLY
- Location: Manual testing documented in `MCP_UI_E2E_TEST_REPORT.md`
- Coverage: Calculator UI and Stats UI verified manually
- **GAPS:**
  - No automated browser tests
  - No Playwright/Cypress tests

**Priority:** HIGH
**Recommendation:** Add unit tests for iframe creation, sandbox attributes, and HTML injection. Add E2E tests for full browser rendering.

---

### 2. External URL Rendering (text/uri-list)

**Protocol Tests:** ✅ FULL
- Location: `tests/unit/protocol/postmessage-compliance.test.ts`
- Coverage: URI format validation
- Tests: Part of 68 passing tests

**Unit Tests:** ⚠️ PARTIAL
- Location: `tests/unit/interface-api/ui-resource-renderer.test.tsx`
- Coverage: Basic rendering detection
- Tests: 1 test (verifies iframe is rendered)
- **GAPS:**
  - No tests for URL parsing
  - No tests for external URL iframe configuration
  - No tests for sandbox differences (external URLs get `allow-same-origin`)
  - No tests for security validation

**E2E Tests:** ❌ NONE
- **GAPS:**
  - No automated browser tests for external URL loading
  - No tests for cross-origin handling
  - No tests for error cases (404, timeout, CORS)

**Priority:** HIGH
**Recommendation:** Add unit tests for URL parsing, sandbox config, and security. Add E2E tests for actual external URL loading.

---

### 3. Remote DOM (application/vnd.mcp-ui.remote-dom+javascript)

**Protocol Tests:** ✅ FULL
- Location: `tests/unit/protocol/postmessage-compliance.test.ts`
- Coverage: MIME type validation

**Unit Tests:** ⚠️ PARTIAL
- Location: `tests/unit/interface-api/ui-resource-renderer.test.tsx`
- Coverage: Basic rendering detection
- Tests: 1 test (verifies component is rendered)
- **GAPS:**
  - No tests for Remote DOM script execution
  - No tests for Remote DOM-specific postMessage protocol
  - No tests for Remote DOM component lifecycle

**E2E Tests:** ❌ NONE
- **GAPS:**
  - No automated tests for Remote DOM rendering
  - No tests for Remote DOM script loading
  - No tests for Remote DOM component interaction

**Priority:** MEDIUM (less commonly used than HTML/URL)
**Recommendation:** Add unit tests for Remote DOM rendering and script execution. E2E tests optional unless heavily used.

---

### 4. Tool Calls (type: 'tool' postMessage)

**Protocol Tests:** ✅ FULL
- Location: `tests/unit/protocol/postmessage-compliance.test.ts`
- Coverage: 10 tests for tool call message format
- Validation: Spec-compliant format, payload structure, messageId tracking
- Tests: All passing

**Unit Tests:** ❌ NONE
- **GAPS:**
  - No tests for iframe → parent postMessage
  - No tests for tool call helper function (`callTool()`)
  - No tests for tool allowlist enforcement
  - No tests for tool result handling
  - No tests for timeout behavior (30s)
  - No tests for error propagation

**E2E Tests:** ⚠️ MANUAL ONLY
- Location: Manual testing documented in `MCP_UI_E2E_TEST_REPORT.md`
- Coverage: Tool execution verified via API calls
- **GAPS:**
  - No automated browser tests for tool calls from iframe
  - No tests for postMessage flow end-to-end
  - No tests for tool allowlist enforcement in browser

**Priority:** HIGH (core feature)
**Recommendation:** Add comprehensive unit tests for postMessage tool call flow, helper functions, and error handling. Add E2E tests with browser automation.

---

### 5. Prompts (type: 'prompt' postMessage)

**Protocol Tests:** ✅ FULL
- Location: `tests/unit/protocol/postmessage-compliance.test.ts`
- Coverage: Prompt message format validation
- Tests: All passing

**Unit Tests:** ❌ NONE
- **GAPS:**
  - No tests for prompt helper function (`submitPrompt()`)
  - No tests for prompt postMessage format
  - No tests for prompt response handling
  - No tests for LLM integration

**E2E Tests:** ❌ NONE
- **GAPS:**
  - No automated tests for prompt submission from iframe
  - No tests for prompt response display

**Priority:** HIGH (important for LLM interaction)
**Recommendation:** Add unit tests for prompt helper, message format, and response handling. Add E2E tests for full prompt flow.

---

### 6. Notifications (type: 'notify' postMessage)

**Protocol Tests:** ✅ FULL
- Location: `tests/unit/protocol/postmessage-compliance.test.ts`
- Coverage: Notification message format validation
- Tests: All passing

**Unit Tests:** ❌ NONE
- **GAPS:**
  - No tests for notification helper function (`notify()`)
  - No tests for notification levels (info, warning, error, success)
  - No tests for notification display
  - No tests for notification dismissal

**E2E Tests:** ❌ NONE
- **GAPS:**
  - No automated tests for notification display in browser
  - No tests for notification UI/UX

**Priority:** MEDIUM (nice-to-have feature)
**Recommendation:** Add unit tests for notification helper and message format. E2E tests optional unless critical to UX.

---

### 7. Navigation/Links (type: 'link' postMessage)

**Protocol Tests:** ✅ FULL
- Location: `tests/unit/protocol/postmessage-compliance.test.ts`
- Coverage: Link message format validation
- Tests: All passing

**Unit Tests:** ❌ NONE
- **GAPS:**
  - No tests for link helper function (`openLink()`)
  - No tests for link navigation behavior
  - No tests for target specification (_blank, _self, etc.)
  - No tests for link security validation

**E2E Tests:** ❌ NONE
- **GAPS:**
  - No automated tests for link navigation in browser
  - No tests for link security (e.g., javascript: URLs blocked)

**Priority:** MEDIUM
**Recommendation:** Add unit tests for link helper and navigation behavior. Add E2E tests for link security.

---

### 8. Intents (type: 'intent' postMessage)

**Protocol Tests:** ✅ FULL
- Location: `tests/unit/protocol/postmessage-compliance.test.ts`
- Coverage: Intent message format validation
- Tests: All passing

**Unit Tests:** ❌ NONE
- **GAPS:**
  - No tests for intent helper function (`triggerIntent()`)
  - No tests for intent types (share, open, etc.)
  - No tests for intent parameter passing
  - No tests for intent handler registration

**E2E Tests:** ❌ NONE
- **GAPS:**
  - No automated tests for intent triggering
  - No tests for intent handling

**Priority:** LOW (advanced feature, less commonly used)
**Recommendation:** Add unit tests if intents become more widely used. E2E tests optional.

---

### 9. Subscriptions (live updates)

**Protocol Tests:** ✅ FULL
- Location: `tests/unit/protocol/postmessage-compliance.test.ts`
- Coverage: Subscription message format
- Tests: Part of protocol tests

**Unit Tests:** ⚠️ PARTIAL
- Location: `tests/unit/interface-api/subscriptions.test.ts`
- Coverage: Subscription lifecycle, update handling
- Tests: Exists but marked as custom runner (not in Jest)
- **GAPS:**
  - No tests for UI resource subscription updates
  - No tests for automatic re-rendering on update
  - No tests for subscription error handling

**E2E Tests:** ⚠️ MANUAL ONLY
- Location: Manual testing documented in `MCP_UI_E2E_TEST_REPORT.md`
- Coverage: Stats UI subscription verified manually
- **GAPS:**
  - No automated tests for subscription updates in browser
  - No tests for real-time UI updates

**Priority:** MEDIUM (important for dynamic UIs)
**Recommendation:** Add unit tests for UI subscription updates and re-rendering. Add E2E tests for real-time updates.

---

## Priority Test Development Plan

Based on gap analysis, prioritized test development:

### Phase 1: HIGH Priority (Complete for Task 1.3)

1. **Tool Calls Unit Tests** (~45 min)
   - Test `callTool()` helper function
   - Test tool allowlist enforcement
   - Test postMessage format
   - Test error handling and timeouts
   - Test tool result handling

2. **Prompts Unit Tests** (~30 min)
   - Test `submitPrompt()` helper function
   - Test prompt postMessage format
   - Test prompt response handling

3. **Raw HTML Rendering Unit Tests** (~30 min)
   - Test iframe creation and attributes
   - Test sandbox configuration
   - Test HTML content injection
   - Test CSS isolation

4. **External URL Rendering Unit Tests** (~30 min)
   - Test URL parsing and validation
   - Test iframe configuration for external URLs
   - Test sandbox differences (allow-same-origin)
   - Test security validation

### Phase 2: MEDIUM Priority

5. **Notifications Unit Tests** (~20 min)
   - Test `notify()` helper function
   - Test notification levels
   - Test notification message format

6. **Navigation/Links Unit Tests** (~20 min)
   - Test `openLink()` helper function
   - Test link security validation
   - Test target specification

7. **Subscriptions Unit Tests** (~30 min)
   - Test UI resource subscription updates
   - Test automatic re-rendering
   - Test error handling

8. **Remote DOM Unit Tests** (~30 min)
   - Test Remote DOM script execution
   - Test Remote DOM component lifecycle

### Phase 3: E2E Tests (Task 1.4)

9. **E2E Test Infrastructure** (~1.5 hours)
   - Set up Chrome DevTools MCP automation helpers
   - Create test utilities for UI interaction
   - Document E2E testing approach

---

## Testing Recommendations

### Unit Test Strategy

**Framework:** Jest + Testing Library (already set up in Task 1.1)
**Environment:** jsdom (for browser APIs)
**Focus:** PostMessage communication, helper functions, spec compliance

**Test Pattern:**
```typescript
it('should send spec-compliant tool call message', async () => {
  const { container } = render(<UIResourceRenderer resource={mockResource} />);
  const iframe = container.querySelector('iframe');

  // Spy on postMessage
  const spy = jest.spyOn(window.parent, 'postMessage');

  // Trigger tool call from iframe
  iframe.contentWindow.postMessage({
    type: 'tool',
    payload: { toolName: 'test', params: { a: 1 } },
    messageId: 'test-123'
  }, '*');

  // Assert spec-compliant format
  expect(spy).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'tool',
      payload: expect.objectContaining({
        toolName: 'test',
        params: { a: 1 }
      }),
      messageId: 'test-123'
    }),
    '*'
  );
});
```

### E2E Test Strategy

**Framework:** MCP Chrome DevTools (already verified working in Phase 0)
**Location:** `tests/e2e/`
**Focus:** Full browser rendering, user interaction, visual verification

**Test Pattern:**
```typescript
it('should render calculator UI and handle tool calls', async () => {
  await connectToServer('examples/create-ui-resource-demo.ts');
  await verifyUIResource('show_calculator');
  await clickButton('calculate');
  await verifyToolCallExecuted('add', { a: 5, b: 3 });
  await verifyResultDisplayed('8');
});
```

---

## Coverage Goals

**Target Test Coverage:**
- **Protocol Tests:** ✅ 100% (already achieved)
- **Unit Tests:** 🎯 >85% coverage for all 9 features
- **E2E Tests:** 🎯 At least 1 test per major feature (4-5 tests minimum)

**Success Criteria:**
- All 9 features have automated unit tests
- All HIGH priority gaps filled
- At least 4 E2E tests cover critical user flows
- Test suite runs in <30 seconds (unit tests)
- E2E tests run in <5 minutes

---

## Conclusion

**Current State:**
- ✅ Protocol layer: Excellent (102/102 tests passing)
- ⚠️ Unit layer: Partial (only basic rendering tested)
- ⚠️ E2E layer: Manual only (no automation)

**Next Steps:**
- **Task 1.3:** Implement HIGH priority unit tests (tool calls, prompts, rendering)
- **Task 1.4:** Set up E2E test infrastructure with Chrome DevTools
- **Validation:** Ensure >85% coverage before completing Objective 1

**Estimated Time:**
- Phase 1 (HIGH): ~2 hours (matches Task 1.3 estimate)
- Phase 2 (MEDIUM): ~1.5 hours (future work)
- Phase 3 (E2E): ~1.5 hours (Task 1.4)

---

**Audit Complete**
**Next Action:** Proceed to Task 1.3 (Create automated feature tests)
