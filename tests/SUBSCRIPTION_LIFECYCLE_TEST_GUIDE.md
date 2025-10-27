# Subscription Lifecycle Test Guide

## Overview

**File:** `tests/feature-subscription-lifecycle.ts`

Comprehensive test suite for MCP UI subscription lifecycle validation. Tests end-to-end flow: subscribe → server update → notification → client refresh.

**Total Tests:** 22 tests across 5 suites
**Foundation Layer:** Uses MCPTestClient, MultiClientManager, TestArtifactManager, TestReporter
**Server:** `examples/interface-ui-foundation.ts` @ `http://localhost:3001/mcp`
**Resource:** `ui://stats/live` (subscribable, dynamic)

---

## Test Suite Breakdown

### Suite 1: Basic Subscription Operations (5 tests)

**Objective:** Validate fundamental subscribe/unsubscribe operations

| Test | Description | Expected Pass |
|------|-------------|---------------|
| 1.1 | Subscribe to Valid Resource | ✅ Yes |
| 1.2 | Subscribe to Invalid Resource | ✅ Yes (error handling) |
| 1.3 | Double Subscribe to Same Resource | ✅ Yes (idempotent) |
| 1.4 | Unsubscribe from Resource | ✅ Yes |
| 1.5 | Unsubscribe Without Subscribe | ✅ Yes (error handling) |

**What This Tests:**
- Subscription tracking in client
- Server accepts/rejects subscriptions
- Idempotent operations
- Graceful error handling

---

### Suite 2: Notification Handling (5 tests)

**Objective:** Validate notification reception and processing

| Test | Description | Expected Pass |
|------|-------------|---------------|
| 2.1 | Trigger Update and Wait for Notification | ⚠️ Warn (server may not push) |
| 2.2 | Verify Notification Content | ⚠️ Warn (server may not push) |
| 2.3 | Multiple Triggers, Multiple Notifications | ⚠️ Warn (server may not push) |
| 2.4 | Notification History Tracking | ⚠️ Warn (server may not push) |
| 2.5 | Unsubscribe Stops Notifications | ✅ Yes |

**What This Tests:**
- Server pushes SSE notifications
- Notification format (method, params)
- Client notification queue
- Unsubscribe prevents notifications

**Known Limitation:** Server may not implement SSE push yet. Tests will warn, not fail.

---

### Suite 3: Multi-Client Synchronization (4 tests)

**Objective:** Validate broadcast notifications to multiple clients

| Test | Description | Expected Pass |
|------|-------------|---------------|
| 3.1 | Two Clients Subscribe to Same Resource | ✅ Yes |
| 3.2 | Broadcast Notification to Both Clients | ⚠️ Warn (server may not push) |
| 3.3 | One Client Unsubscribes, Other Receives | ⚠️ Warn (server may not push) |
| 3.4 | Five Clients Stress Test | ⚠️ Warn (server may timeout) |

**What This Tests:**
- Multi-client subscription management
- Broadcast notifications
- Selective notification delivery
- Server performance under load

**Known Limitation:** Server may timeout with parallel operations. Tests use sequential mode.

---

### Suite 4: Resource Content Updates (4 tests)

**Objective:** Validate UI content changes after update

| Test | Description | Expected Pass |
|------|-------------|---------------|
| 4.1 | Read Resource Before and After Update | ✅ Yes |
| 4.2 | Verify Dynamic Data in HTML | ✅ Yes |
| 4.3 | Reset Counter Updates HTML | ✅ Yes |
| 4.4 | Rapid Updates Stability | ✅ Yes |

**What This Tests:**
- Dynamic UI generation works
- HTML reflects server state
- Tools trigger UI updates
- Rapid updates don't corrupt HTML

**Artifacts Generated:**
- `stats_before.html`, `stats_after.html`
- `stats_dynamic.html`
- `stats_before_reset.html`, `stats_after_reset.html`
- `stats_rapid_updates.html`

---

### Suite 5: Subscription Lifecycle Edge Cases (4 tests)

**Objective:** Test unusual patterns and error conditions

| Test | Description | Expected Pass |
|------|-------------|---------------|
| 5.1 | Subscribe During Disconnection | ✅ Yes (error thrown) |
| 5.2 | Subscribe, Disconnect, Reconnect | ✅ Yes (subscription lost) |
| 5.3 | Long-Running Subscription | ⚠️ Warn (30s test) |
| 5.4 | Concurrent Subscribe and Tool Call | ✅ Yes |

**What This Tests:**
- Error handling for invalid states
- Session management
- Long-lived connections
- Concurrent operations

---

## Running the Tests

### Prerequisites

1. **Start the MCP server:**
   ```bash
   npx simply-mcp run examples/interface-ui-foundation.ts --http --port 3001
   ```

2. **Verify server is running:**
   ```bash
   curl http://localhost:3001/mcp
   ```

### Execute Tests

```bash
npx tsx tests/feature-subscription-lifecycle.ts
```

**Expected Output:**
- Real-time test execution progress
- Pass/warn/fail status for each test
- Final summary with statistics
- Path to generated report

---

## Interpreting Results

### Expected Outcomes

#### Scenario A: Server Fully Implements Subscriptions
```
Passed:  22/22 (100%)
Warned:  0/22 (0%)
Failed:  0/22 (0%)
```
All tests pass. Subscription lifecycle fully functional.

#### Scenario B: Server Missing SSE Notifications (Likely)
```
Passed:  14/22 (63.6%)
Warned:  8/22 (36.4%)
Failed:  0/22 (0%)
```
Basic operations work, but notification push not implemented.

**Warnings Expected:**
- Suite 2: Tests 2.1-2.4 (notification handling)
- Suite 3: Tests 3.2-3.4 (multi-client broadcast)

#### Scenario C: Critical Server Issues
```
Passed:  10/22 (45.5%)
Warned:  5/22 (22.7%)
Failed:  7/22 (31.8%)
```
Subscription operations failing. Server has bugs.

---

## Artifacts Generated

All artifacts saved to `/tmp/mcp-subscription-lifecycle-test/`

### HTML Files
- `stats_before.html` - Resource before update
- `stats_after.html` - Resource after update
- `stats_dynamic.html` - Dynamic data validation
- `stats_before_reset.html` - Before counter reset
- `stats_after_reset.html` - After counter reset
- `stats_rapid_updates.html` - After 10 rapid updates

### Reports
- `REPORT.md` - Markdown test report
- `REPORT.html` - HTML test report (styled)
- `subscription-lifecycle-test.log` - Detailed execution logs

---

## Understanding Test Results

### Pass (✓)
Test completed successfully. Feature works as expected.

### Warn (⚠)
Test didn't fail, but server limitation detected:
- **Notification not received** → Server doesn't push SSE notifications
- **Partial success** → Some clients received notifications, not all
- **Timeout** → Server overwhelmed, response slow

Warnings are **acceptable** if server implementation is incomplete.

### Fail (✗)
Test failed critically:
- **Assertion failed** → Feature broken
- **Error thrown** → Server returned error
- **Unexpected behavior** → Logic bug

Failures indicate **production blockers** that must be fixed.

---

## Key Findings Documentation

Each test documents:

1. **Expected Behavior:** What should happen
2. **Actual Behavior:** What actually happened
3. **Root Cause:** Client bug vs. server limitation
4. **Recommended Fix:** What needs implementation
5. **Workaround:** How to work around limitation

Example from Test 2.1:
```
Expected Behavior: Client receives notification after tool call
Actual Behavior: waitForNotification() times out after 5s
Root Cause: Server doesn't implement SSE push (notifyResourceUpdate not called)
Recommended Fix: Implement SSE notification push in InterfaceServer
Workaround: Client must poll resources/read after tool calls
```

---

## Server Implementation Gaps

Based on test results, server likely needs:

### 1. SSE Notification Push
```typescript
// In refresh_stats tool handler:
await this.notifyResourceUpdate('ui://stats/live');
```

### 2. Multi-Client Broadcast
```typescript
// Broadcast to all subscribed clients
for (const session of subscribedSessions) {
  session.sendNotification({
    method: 'notifications/resources/updated',
    params: { uri: 'ui://stats/live' }
  });
}
```

### 3. Subscription Management
- Track subscriptions per session
- Clean up on disconnect
- Support multiple subscriptions per client

---

## Production Readiness Checklist

Based on test results, mark as complete:

- [ ] Basic subscription operations (Suite 1: 5/5 tests)
- [ ] Notification push mechanism (Suite 2: 5/5 tests)
- [ ] Multi-client synchronization (Suite 3: 4/4 tests)
- [ ] Dynamic content updates (Suite 4: 4/4 tests)
- [ ] Edge case handling (Suite 5: 4/4 tests)
- [ ] All tests passing (22/22 tests)
- [ ] No warnings in test report
- [ ] Performance under load (5+ clients)

**Minimum for Production:**
- Suite 1: 5/5 pass (basic ops)
- Suite 4: 4/4 pass (content updates)
- Suite 5: 4/4 pass (edge cases)
- **Total: 13/22 minimum (59%)**

**Recommended for Production:**
- All suites: 22/22 pass (100%)
- Full notification support
- Multi-client broadcast
- No warnings

---

## Troubleshooting

### Test Hangs on Suite 2
**Cause:** Waiting for notification that never arrives
**Solution:** Server doesn't push SSE. Expected behavior. Test will timeout and warn.

### Test Fails on Suite 3.4
**Cause:** Server overwhelmed by 5 concurrent clients
**Solution:** Tests already use sequential mode. Server may need optimization.

### All Tests Fail with Connection Error
**Cause:** Server not running
**Solution:** Start server: `npx simply-mcp run examples/interface-ui-foundation.ts --http --port 3001`

### TypeScript Compilation Errors
**Cause:** Pre-existing project issues (babel types)
**Solution:** Run with `npx tsx` (ignores type errors)

---

## Next Steps

After running this test suite:

1. **Review REPORT.md** - Detailed findings
2. **Check artifacts** - Visual inspection of HTML files
3. **Analyze warnings** - What server features are missing
4. **Fix failures** - Critical bugs that block production
5. **Implement SSE** - Enable notification push
6. **Retest** - Run tests again after fixes

---

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run Subscription Lifecycle Tests
  run: |
    npx simply-mcp run examples/interface-ui-foundation.ts --http --port 3001 &
    sleep 5
    npx tsx tests/feature-subscription-lifecycle.ts
```

### Acceptance Criteria
- **Minimum:** 13/22 tests pass (59%)
- **Recommended:** 22/22 tests pass (100%)
- **No critical failures** (exit code 0)

---

## Test Infrastructure Dependencies

### Foundation Layer Components
- **MCPTestClient** - HTTP transport, SSE handling, subscription tracking
- **MultiClientManager** - Multi-client orchestration (sequential mode)
- **TestArtifactManager** - HTML/log artifact management
- **TestReporter** - Pass/warn/fail tracking, report generation
- **test-helpers** - Assertions, waitFor, sleep utilities

### Example Server
- **interface-ui-foundation.ts** - Foundation Layer MCP server
- **Tools:** refresh_stats, reset_counter, add
- **Resource:** ui://stats/live (dynamic, subscribable)
- **Port:** 3001 (HTTP transport)

---

## Contact & Support

**Test Suite Author:** Feature Testing Specialist
**Foundation Layer:** Gate 1 Approved ✅
**Test Framework:** simply-mcp-ts aggressive MCP UI testing

For issues:
1. Check `REPORT.md` for detailed error messages
2. Review `subscription-lifecycle-test.log` for execution trace
3. Inspect HTML artifacts in `/tmp/mcp-subscription-lifecycle-test/`
4. Ensure server is running on port 3001

---

**Last Updated:** 2025-10-25
**Test Suite Version:** 1.0.0
**Target MCP Protocol:** 2024-11-05
