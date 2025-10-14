# Watch Mode Integration Test Plan
**Simply MCP v2.5.0-beta.3**

## Executive Summary

This document provides a comprehensive, executable test plan for Watch Mode functionality in Simply MCP v2.5.0-beta.3. Watch mode is a critical development workflow feature with HIGH risk if broken, as developers rely on it for rapid iteration during server development.

**Test Package:** `simply-mcp-2.5.0-beta.3.tgz`
**Test Environment:** Isolated test directory using installed tarball
**Test Duration:** ~15-20 minutes for full suite
**Risk Level:** HIGH (affects development workflow)

---

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Test Scenarios](#test-scenarios)
3. [Pass/Fail Criteria](#passfail-criteria)
4. [Cleanup Procedures](#cleanup-procedures)
5. [Troubleshooting](#troubleshooting)

---

## Test Environment Setup

### Prerequisites

- Node.js ≥ 20.0.0
- Bash shell (Linux/macOS/WSL)
- `timeout` command available
- `ps` command available
- Write access to `/tmp` directory

### Setup Steps

```bash
# 1. Create isolated test directory
mkdir -p /tmp/watch-mode-tests
cd /tmp/watch-mode-tests

# 2. Initialize new Node.js project
npm init -y

# 3. Install Simply MCP from tarball
npm install /mnt/Shared/cs-projects/simple-mcp/simply-mcp-2.5.0-beta.3.tgz

# 4. Verify installation
npx simplymcp --version
# Expected: 2.5.0-beta.3

# 5. Create test helper script
cat > test-helpers.sh << 'EOF'
#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test result tracking
TESTS_PASSED=0
TESTS_FAILED=0
TEST_RESULTS=()

# Helper: Print test header
test_start() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}TEST: $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Helper: Print test result
test_result() {
  local test_name="$1"
  local status="$2"
  local message="$3"

  if [ "$status" = "PASS" ]; then
    echo -e "${GREEN}✓ PASS${NC}: $test_name"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TEST_RESULTS+=("PASS: $test_name")
  else
    echo -e "${RED}✗ FAIL${NC}: $test_name"
    echo -e "${RED}  Reason: $message${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TEST_RESULTS+=("FAIL: $test_name - $message")
  fi
}

# Helper: Kill process tree
kill_tree() {
  local pid=$1
  local children=$(pgrep -P $pid 2>/dev/null)
  for child in $children; do
    kill_tree $child
  done
  kill -TERM $pid 2>/dev/null || true
  sleep 0.2
  kill -KILL $pid 2>/dev/null || true
}

# Helper: Wait for log pattern
wait_for_log() {
  local logfile="$1"
  local pattern="$2"
  local timeout="$3"
  local elapsed=0

  while [ $elapsed -lt $timeout ]; do
    if grep -q "$pattern" "$logfile" 2>/dev/null; then
      return 0
    fi
    sleep 0.1
    elapsed=$((elapsed + 1))
  done
  return 1
}

# Helper: Print summary
print_summary() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}TEST SUMMARY${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "Tests passed: ${GREEN}${TESTS_PASSED}${NC}"
  echo -e "Tests failed: ${RED}${TESTS_FAILED}${NC}"
  echo ""

  if [ ${#TEST_RESULTS[@]} -gt 0 ]; then
    echo "Results:"
    for result in "${TEST_RESULTS[@]}"; do
      if [[ $result == PASS* ]]; then
        echo -e "  ${GREEN}${result}${NC}"
      else
        echo -e "  ${RED}${result}${NC}"
      fi
    done
  fi

  echo ""
  if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
  else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
  fi
}

EOF

chmod +x test-helpers.sh
```

---

## Test Scenarios

### Scenario 1: Basic Watch Mode Startup and Shutdown

**Objective:** Verify watch mode starts correctly and responds to SIGTERM.

**API Style:** Decorator
**Transport:** STDIO
**Flags:** `--watch --verbose`

#### Setup

```bash
# Create test server
cat > test-server-decorator.ts << 'EOF'
import { MCPServer } from 'simply-mcp';

@MCPServer()
export default class TestServer {
  greet(name: string): string {
    return `Hello, ${name}!`;
  }
}
EOF
```

#### Execution

```bash
cat > scenario-1.sh << 'EOF'
#!/bin/bash
source ./test-helpers.sh

test_start "Scenario 1: Basic Watch Mode Startup and Shutdown"

# Start watch mode in background
npx simplymcp run test-server-decorator.ts --watch --verbose > /tmp/scenario-1.log 2>&1 &
WATCH_PID=$!

echo "Started watch mode (PID: $WATCH_PID)"
sleep 3

# Check if process is running
if ps -p $WATCH_PID > /dev/null; then
  echo "Watch mode process is running ✓"
else
  echo "Watch mode process died prematurely ✗"
  cat /tmp/scenario-1.log
  test_result "Watch mode startup" "FAIL" "Process died immediately"
  exit 1
fi

# Check for startup messages
if grep -q "Starting watch mode" /tmp/scenario-1.log; then
  echo "Found 'Starting watch mode' message ✓"
else
  echo "Missing 'Starting watch mode' message ✗"
  cat /tmp/scenario-1.log
  test_result "Watch mode startup" "FAIL" "Missing startup message"
  kill_tree $WATCH_PID
  exit 1
fi

if grep -q "Server started" /tmp/scenario-1.log; then
  echo "Found 'Server started' message ✓"
else
  echo "Missing 'Server started' message ✗"
  test_result "Watch mode startup" "FAIL" "Server did not start"
  kill_tree $WATCH_PID
  exit 1
fi

# Check API style detection
if grep -q "API Style: decorator" /tmp/scenario-1.log; then
  echo "Correctly detected decorator API ✓"
else
  echo "Failed to detect decorator API ✗"
  test_result "API style detection" "FAIL" "Wrong or missing API style"
  kill_tree $WATCH_PID
  exit 1
fi

test_result "Watch mode startup" "PASS" ""

# Test graceful shutdown
echo ""
echo "Testing graceful shutdown..."
kill -TERM $WATCH_PID
sleep 2

# Check if process exited
if ! ps -p $WATCH_PID > /dev/null 2>&1; then
  echo "Process exited cleanly ✓"
  test_result "Graceful shutdown" "PASS" ""
else
  echo "Process did not exit ✗"
  kill -KILL $WATCH_PID 2>/dev/null
  test_result "Graceful shutdown" "FAIL" "Process hung on SIGTERM"
fi

# Check for shutdown message
if grep -q "Shutdown complete" /tmp/scenario-1.log; then
  echo "Found 'Shutdown complete' message ✓"
  test_result "Shutdown message" "PASS" ""
else
  echo "Missing 'Shutdown complete' message ✗"
  test_result "Shutdown message" "FAIL" "No shutdown confirmation"
fi

EOF

chmod +x scenario-1.sh
./scenario-1.sh
```

#### Expected Behavior

1. Watch mode starts within 3 seconds
2. Log contains "Starting watch mode..." message
3. Log contains "Server started (PID: XXXXX)" message
4. Log shows "API Style: decorator"
5. Process responds to SIGTERM within 2 seconds
6. Log contains "Shutdown complete" message

#### Pass Criteria

- ✅ All startup messages present
- ✅ Process runs for at least 3 seconds
- ✅ SIGTERM causes clean shutdown within 2 seconds
- ✅ Shutdown message logged

#### Fail Criteria

- ❌ Process dies within 3 seconds
- ❌ Missing startup messages
- ❌ Process doesn't respond to SIGTERM
- ❌ No shutdown confirmation

---

### Scenario 2: File Change Auto-Restart

**Objective:** Verify file changes trigger automatic server restart within acceptable timeframe.

**API Style:** Decorator
**Transport:** STDIO
**Flags:** `--watch --verbose`

#### Setup

```bash
# Use test-server-decorator.ts from Scenario 1
```

#### Execution

```bash
cat > scenario-2.sh << 'EOF'
#!/bin/bash
source ./test-helpers.sh

test_start "Scenario 2: File Change Auto-Restart"

# Start watch mode
npx simplymcp run test-server-decorator.ts --watch --verbose > /tmp/scenario-2.log 2>&1 &
WATCH_PID=$!

echo "Started watch mode (PID: $WATCH_PID)"
sleep 3

# Verify initial startup
if ! grep -q "Server started" /tmp/scenario-2.log; then
  echo "Initial startup failed ✗"
  cat /tmp/scenario-2.log
  kill_tree $WATCH_PID
  test_result "Initial startup" "FAIL" "Server did not start"
  exit 1
fi

echo "Initial startup successful ✓"
test_result "Initial startup" "PASS" ""

# Get initial PID from log
INITIAL_PID=$(grep -o "Server started (PID: [0-9]*)" /tmp/scenario-2.log | tail -1 | grep -o "[0-9]*")
echo "Initial server PID: $INITIAL_PID"

# Record start time
START_TIME=$(date +%s%3N)

# Modify the file
echo ""
echo "Modifying test-server-decorator.ts..."
echo "  // Auto-restart test comment" >> test-server-decorator.ts

# Wait for restart message (max 5 seconds)
if wait_for_log /tmp/scenario-2.log "File change detected, restarting server" 50; then
  echo "Detected file change message ✓"
  test_result "Change detection" "PASS" ""
else
  echo "No file change detection ✗"
  cat /tmp/scenario-2.log
  kill_tree $WATCH_PID
  test_result "Change detection" "FAIL" "Did not detect file change"
  exit 1
fi

# Wait for restart completion (max 10 seconds total)
if wait_for_log /tmp/scenario-2.log "Restart complete" 100; then
  RESTART_TIME=$(date +%s%3N)
  ELAPSED=$((RESTART_TIME - START_TIME))
  echo "Restart completed in ${ELAPSED}ms ✓"

  # Check restart timing (should be under 2000ms)
  if [ $ELAPSED -lt 2000 ]; then
    echo "Restart timing acceptable (< 2000ms) ✓"
    test_result "Restart timing" "PASS" ""
  else
    echo "Restart timing slow (${ELAPSED}ms) ⚠"
    test_result "Restart timing" "FAIL" "Restart took ${ELAPSED}ms (> 2000ms)"
  fi
else
  echo "Restart did not complete ✗"
  cat /tmp/scenario-2.log
  kill_tree $WATCH_PID
  test_result "Restart completion" "FAIL" "Restart hung or failed"
  exit 1
fi

# Get new PID
NEW_PID=$(grep -o "Server started (PID: [0-9]*)" /tmp/scenario-2.log | tail -1 | grep -o "[0-9]*")
echo "New server PID: $NEW_PID"

# Verify PID changed
if [ "$INITIAL_PID" != "$NEW_PID" ]; then
  echo "Server process was restarted (new PID) ✓"
  test_result "Process restart" "PASS" ""
else
  echo "Server process was not restarted (same PID) ✗"
  test_result "Process restart" "FAIL" "PID did not change"
fi

# Check that restart count is exactly 1
RESTART_COUNT=$(grep -c "File change detected, restarting server" /tmp/scenario-2.log)
if [ "$RESTART_COUNT" -eq 1 ]; then
  echo "Exactly one restart occurred ✓"
  test_result "Single restart" "PASS" ""
else
  echo "Multiple restarts occurred: $RESTART_COUNT ✗"
  test_result "Single restart" "FAIL" "Expected 1 restart, got $RESTART_COUNT"
fi

# Cleanup
kill_tree $WATCH_PID
git checkout test-server-decorator.ts 2>/dev/null || sed -i '$ d' test-server-decorator.ts

EOF

chmod +x scenario-2.sh
./scenario-2.sh
```

#### Expected Behavior

1. Initial server starts successfully
2. File modification detected within 500ms
3. "File change detected, restarting server" message appears
4. Server restarts within 2000ms total
5. New PID different from original PID
6. Exactly one restart triggered (debouncing works)
7. "Restart complete (XXXms)" message shows timing

#### Pass Criteria

- ✅ File change detected within 5 seconds
- ✅ Restart completes within 2000ms from file change
- ✅ Server PID changes
- ✅ Exactly one restart occurs
- ✅ Restart timing logged

#### Fail Criteria

- ❌ No change detection after file modification
- ❌ Restart takes > 2000ms
- ❌ PID doesn't change
- ❌ Multiple restarts for single change

---

### Scenario 3: Polling Mode

**Objective:** Verify polling mode works with custom interval.

**API Style:** Functional
**Transport:** STDIO
**Flags:** `--watch --watch-poll --watch-interval 200`

#### Setup

```bash
# Create functional API test server
cat > test-server-functional.ts << 'EOF'
import { defineMCP } from 'simply-mcp';
import { z } from 'zod';

export default defineMCP({
  name: 'test-functional',
  version: '1.0.0',
  tools: [
    {
      name: 'echo',
      description: 'Echo a message',
      parameters: z.object({
        message: z.string(),
      }),
      execute: async ({ message }) => message,
    },
  ],
});
EOF
```

#### Execution

```bash
cat > scenario-3.sh << 'EOF'
#!/bin/bash
source ./test-helpers.sh

test_start "Scenario 3: Polling Mode with Custom Interval"

# Start watch mode with polling
npx simplymcp run test-server-functional.ts --watch --watch-poll --watch-interval 200 > /tmp/scenario-3.log 2>&1 &
WATCH_PID=$!

echo "Started watch mode with polling (PID: $WATCH_PID)"
sleep 3

# Check for polling mode message
if grep -q "Polling mode enabled" /tmp/scenario-3.log; then
  echo "Polling mode enabled ✓"
  test_result "Polling mode enabled" "PASS" ""
else
  echo "Polling mode not enabled ✗"
  cat /tmp/scenario-3.log
  kill_tree $WATCH_PID
  test_result "Polling mode enabled" "FAIL" "No polling mode message"
  exit 1
fi

# Check interval in log
if grep -q "interval: 200ms" /tmp/scenario-3.log; then
  echo "Custom interval (200ms) configured ✓"
  test_result "Custom interval" "PASS" ""
else
  echo "Custom interval not found ✗"
  test_result "Custom interval" "FAIL" "Interval not set to 200ms"
fi

# Verify functional API detection
if grep -q "API Style: functional" /tmp/scenario-3.log; then
  echo "Correctly detected functional API ✓"
  test_result "API detection" "PASS" ""
else
  echo "Failed to detect functional API ✗"
  test_result "API detection" "FAIL" "Wrong API style"
fi

# Test file change with polling
echo ""
echo "Testing file change with polling..."
echo "  // Polling test" >> test-server-functional.ts

# Wait for change detection (polling may be slower)
if wait_for_log /tmp/scenario-3.log "File change detected" 60; then
  echo "Polling detected file change ✓"
  test_result "Polling change detection" "PASS" ""
else
  echo "Polling did not detect change ✗"
  cat /tmp/scenario-3.log
  kill_tree $WATCH_PID
  test_result "Polling change detection" "FAIL" "No change detected in 6 seconds"
  exit 1
fi

# Wait for restart completion
if wait_for_log /tmp/scenario-3.log "Restart complete" 60; then
  echo "Restart completed ✓"
  test_result "Polling restart" "PASS" ""
else
  echo "Restart did not complete ✗"
  test_result "Polling restart" "FAIL" "Restart hung"
fi

# Cleanup
kill_tree $WATCH_PID
git checkout test-server-functional.ts 2>/dev/null || sed -i '$ d' test-server-functional.ts

EOF

chmod +x scenario-3.sh
./scenario-3.sh
```

#### Expected Behavior

1. "Polling mode enabled (interval: 200ms)" in log
2. Functional API correctly detected
3. File changes detected via polling
4. Restart completes successfully

#### Pass Criteria

- ✅ Polling mode message present
- ✅ Interval shows 200ms
- ✅ File changes detected
- ✅ Restart successful

#### Fail Criteria

- ❌ No polling mode message
- ❌ Wrong interval
- ❌ File changes not detected
- ❌ Restart fails

---

### Scenario 4: HTTP Transport with Watch Mode

**Objective:** Verify watch mode works with HTTP transport and port remains consistent.

**API Style:** Decorator
**Transport:** HTTP
**Flags:** `--watch --http --port 9999 --verbose`

#### Setup

```bash
# Use test-server-decorator.ts from Scenario 1
```

#### Execution

```bash
cat > scenario-4.sh << 'EOF'
#!/bin/bash
source ./test-helpers.sh

test_start "Scenario 4: HTTP Transport with Watch Mode"

# Start watch mode with HTTP
npx simplymcp run test-server-decorator.ts --watch --http --port 9999 --verbose > /tmp/scenario-4.log 2>&1 &
WATCH_PID=$!

echo "Started watch mode with HTTP (PID: $WATCH_PID)"
sleep 4

# Check for HTTP transport message
if grep -q "Transport: HTTP (port 9999)" /tmp/scenario-4.log; then
  echo "HTTP transport configured ✓"
  test_result "HTTP transport config" "PASS" ""
else
  echo "HTTP transport not configured ✗"
  cat /tmp/scenario-4.log
  kill_tree $WATCH_PID
  test_result "HTTP transport config" "FAIL" "No HTTP transport message"
  exit 1
fi

# Test HTTP endpoint (optional - may not work with pure STDIO servers)
echo "Testing HTTP endpoint availability..."
if curl -s --max-time 2 http://localhost:9999/health > /dev/null 2>&1; then
  echo "HTTP endpoint responding ✓"
  test_result "HTTP endpoint available" "PASS" ""
else
  echo "HTTP endpoint not responding (may be normal for STDIO-only servers) ⚠"
  # Don't fail - some servers may not implement HTTP health endpoint
fi

# Modify file
echo ""
echo "Modifying server file..."
echo "  // HTTP test" >> test-server-decorator.ts

# Wait for restart
if wait_for_log /tmp/scenario-4.log "File change detected" 50; then
  echo "File change detected ✓"
  test_result "HTTP watch - change detection" "PASS" ""
else
  echo "File change not detected ✗"
  kill_tree $WATCH_PID
  test_result "HTTP watch - change detection" "FAIL" "No change detected"
  exit 1
fi

# Wait for restart completion
if wait_for_log /tmp/scenario-4.log "Restart complete" 80; then
  echo "Restart completed ✓"
  test_result "HTTP watch - restart" "PASS" ""
else
  echo "Restart did not complete ✗"
  kill_tree $WATCH_PID
  test_result "HTTP watch - restart" "FAIL" "Restart hung"
  exit 1
fi

# Verify port stayed the same
if grep -c "Transport: HTTP (port 9999)" /tmp/scenario-4.log | grep -q "2"; then
  echo "Port remained consistent after restart ✓"
  test_result "Port consistency" "PASS" ""
else
  echo "Port may have changed or not logged ⚠"
  test_result "Port consistency" "FAIL" "Port inconsistent"
fi

# Cleanup
kill_tree $WATCH_PID
git checkout test-server-decorator.ts 2>/dev/null || sed -i '$ d' test-server-decorator.ts

EOF

chmod +x scenario-4.sh
./scenario-4.sh
```

#### Expected Behavior

1. HTTP transport message shows "port 9999"
2. File changes trigger restart
3. Port remains 9999 after restart
4. HTTP endpoint available (if implemented)

#### Pass Criteria

- ✅ HTTP transport configured correctly
- ✅ File changes detected
- ✅ Restart successful
- ✅ Port consistent across restarts

#### Fail Criteria

- ❌ HTTP transport not configured
- ❌ File changes not detected
- ❌ Restart fails
- ❌ Port changes after restart

---

### Scenario 5: Interface API Support

**Objective:** Verify watch mode works with Interface-driven API.

**API Style:** Interface
**Transport:** STDIO
**Flags:** `--watch --verbose`

#### Setup

```bash
# Create interface API test server
cat > test-server-interface.ts << 'EOF'
import type { ITool, IServer } from 'simply-mcp';

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a person';
  params: {
    name: string;
  };
  result: string;
}

interface TestInterfaceServer extends IServer {
  name: 'test-interface';
  version: '1.0.0';
}

export default class TestInterfaceServerImpl implements TestInterfaceServer {
  greet: GreetTool = async (params) => {
    return `Hello, ${params.name}!`;
  };
}
EOF
```

#### Execution

```bash
cat > scenario-5.sh << 'EOF'
#!/bin/bash
source ./test-helpers.sh

test_start "Scenario 5: Interface API Support"

# Start watch mode
npx simplymcp run test-server-interface.ts --watch --verbose > /tmp/scenario-5.log 2>&1 &
WATCH_PID=$!

echo "Started watch mode (PID: $WATCH_PID)"
sleep 3

# Check API style detection
if grep -q "API Style: interface" /tmp/scenario-5.log; then
  echo "Correctly detected interface API ✓"
  test_result "Interface API detection" "PASS" ""
else
  echo "Failed to detect interface API ✗"
  cat /tmp/scenario-5.log
  kill_tree $WATCH_PID
  test_result "Interface API detection" "FAIL" "Wrong API style"
  exit 1
fi

# Verify server started
if grep -q "Server started" /tmp/scenario-5.log; then
  echo "Interface server started ✓"
  test_result "Interface server start" "PASS" ""
else
  echo "Interface server did not start ✗"
  kill_tree $WATCH_PID
  test_result "Interface server start" "FAIL" "No startup message"
  exit 1
fi

# Test file change
echo ""
echo "Modifying interface file..."
echo "  // Interface test" >> test-server-interface.ts

# Wait for restart
if wait_for_log /tmp/scenario-5.log "File change detected" 50; then
  echo "File change detected ✓"
  test_result "Interface watch - detection" "PASS" ""
else
  echo "File change not detected ✗"
  kill_tree $WATCH_PID
  test_result "Interface watch - detection" "FAIL" "No change detected"
  exit 1
fi

if wait_for_log /tmp/scenario-5.log "Restart complete" 80; then
  echo "Restart completed ✓"
  test_result "Interface watch - restart" "PASS" ""
else
  echo "Restart did not complete ✗"
  kill_tree $WATCH_PID
  test_result "Interface watch - restart" "FAIL" "Restart hung"
  exit 1
fi

# Cleanup
kill_tree $WATCH_PID
git checkout test-server-interface.ts 2>/dev/null || sed -i '$ d' test-server-interface.ts

EOF

chmod +x scenario-5.sh
./scenario-5.sh
```

#### Expected Behavior

1. Interface API correctly detected
2. Server starts successfully
3. File changes trigger restart
4. Restart completes successfully

#### Pass Criteria

- ✅ API style shows "interface"
- ✅ Server starts
- ✅ Changes detected
- ✅ Restart successful

#### Fail Criteria

- ❌ Wrong API style detected
- ❌ Server doesn't start
- ❌ Changes not detected
- ❌ Restart fails

---

### Scenario 6: Rapid File Changes (Debouncing)

**Objective:** Verify debouncing prevents multiple rapid restarts.

**API Style:** Decorator
**Transport:** STDIO
**Flags:** `--watch --verbose`

#### Setup

```bash
# Use test-server-decorator.ts from Scenario 1
```

#### Execution

```bash
cat > scenario-6.sh << 'EOF'
#!/bin/bash
source ./test-helpers.sh

test_start "Scenario 6: Rapid File Changes (Debouncing)"

# Start watch mode
npx simplymcp run test-server-decorator.ts --watch --verbose > /tmp/scenario-6.log 2>&1 &
WATCH_PID=$!

echo "Started watch mode (PID: $WATCH_PID)"
sleep 3

# Verify initial startup
if ! grep -q "Server started" /tmp/scenario-6.log; then
  echo "Initial startup failed ✗"
  kill_tree $WATCH_PID
  test_result "Initial startup" "FAIL" "Server did not start"
  exit 1
fi

echo "Initial startup successful ✓"

# Make multiple rapid changes
echo ""
echo "Making 5 rapid file changes..."
for i in {1..5}; do
  echo "  // Rapid change $i" >> test-server-decorator.ts
  sleep 0.05  # 50ms between changes
done

echo "Waiting for debouncing to settle (5 seconds)..."
sleep 5

# Count restart messages
RESTART_COUNT=$(grep -c "File change detected, restarting server" /tmp/scenario-6.log)

echo "Number of restarts: $RESTART_COUNT"

# Should be 1-2 restarts max due to debouncing (300ms debounce)
if [ "$RESTART_COUNT" -le 2 ]; then
  echo "Debouncing working correctly (≤2 restarts for 5 changes) ✓"
  test_result "Debouncing effectiveness" "PASS" ""
else
  echo "Too many restarts: $RESTART_COUNT (debouncing may not be working) ✗"
  test_result "Debouncing effectiveness" "FAIL" "Expected ≤2 restarts, got $RESTART_COUNT"
fi

# Verify server is still running
if ps -p $WATCH_PID > /dev/null; then
  echo "Server still running after rapid changes ✓"
  test_result "Server stability" "PASS" ""
else
  echo "Server crashed after rapid changes ✗"
  test_result "Server stability" "FAIL" "Process died"
fi

# Cleanup
kill_tree $WATCH_PID
git checkout test-server-decorator.ts 2>/dev/null || head -n -5 test-server-decorator.ts > /tmp/tmp-server.ts && mv /tmp/tmp-server.ts test-server-decorator.ts

EOF

chmod +x scenario-6.sh
./scenario-6.sh
```

#### Expected Behavior

1. Server starts normally
2. 5 rapid file changes within 250ms
3. Only 1-2 restarts occur (debouncing works)
4. Server remains stable
5. Debounce window is ~300ms

#### Pass Criteria

- ✅ ≤2 restarts for 5 rapid changes
- ✅ Server remains running
- ✅ Final restart completes successfully

#### Fail Criteria

- ❌ >2 restarts (debouncing broken)
- ❌ Server crashes
- ❌ Restart loop

---

### Scenario 7: Error Recovery

**Objective:** Verify watch mode handles server crashes and syntax errors gracefully.

**API Style:** Decorator
**Transport:** STDIO
**Flags:** `--watch --verbose`

#### Setup

```bash
# Create a valid server first
cat > test-server-error.ts << 'EOF'
import { MCPServer } from 'simply-mcp';

@MCPServer()
export default class ErrorTestServer {
  greet(name: string): string {
    return `Hello, ${name}!`;
  }
}
EOF
```

#### Execution

```bash
cat > scenario-7.sh << 'EOF'
#!/bin/bash
source ./test-helpers.sh

test_start "Scenario 7: Error Recovery"

# Start watch mode
npx simplymcp run test-server-error.ts --watch --verbose > /tmp/scenario-7.log 2>&1 &
WATCH_PID=$!

echo "Started watch mode (PID: $WATCH_PID)"
sleep 3

# Verify initial startup
if ! grep -q "Server started" /tmp/scenario-7.log; then
  echo "Initial startup failed ✗"
  kill_tree $WATCH_PID
  test_result "Initial startup" "FAIL" "Server did not start"
  exit 1
fi

echo "Initial startup successful ✓"
test_result "Initial startup" "PASS" ""

# Introduce syntax error
echo ""
echo "Introducing syntax error..."
cat > test-server-error.ts << 'EOF_INNER'
import { MCPServer } from 'simply-mcp';

@MCPServer()
export default class ErrorTestServer {
  greet(name: string): string {
    return `Hello, ${name}!  // SYNTAX ERROR - missing closing brace
  }
}
EOF_INNER

sleep 2

# Wait for change detection
if wait_for_log /tmp/scenario-7.log "File change detected" 50; then
  echo "Change detected ✓"
  test_result "Error - change detection" "PASS" ""
else
  echo "Change not detected ✗"
  kill_tree $WATCH_PID
  test_result "Error - change detection" "FAIL" "No detection"
  exit 1
fi

# Watch mode should attempt restart
# The child process will fail, but watch mode should stay running
sleep 3

# Check that watch mode parent is still running
if ps -p $WATCH_PID > /dev/null; then
  echo "Watch mode still running after syntax error ✓"
  test_result "Error resilience" "PASS" ""
else
  echo "Watch mode crashed on syntax error ✗"
  test_result "Error resilience" "FAIL" "Watch mode died"
  exit 1
fi

# Fix the syntax error
echo ""
echo "Fixing syntax error..."
cat > test-server-error.ts << 'EOF_INNER'
import { MCPServer } from 'simply-mcp';

@MCPServer()
export default class ErrorTestServer {
  greet(name: string): string {
    return `Hello, ${name}!`;
  }
}
EOF_INNER

sleep 2

# Wait for recovery
if wait_for_log /tmp/scenario-7.log "Server started" 80; then
  # Count total "Server started" messages - should be at least 2
  START_COUNT=$(grep -c "Server started" /tmp/scenario-7.log)
  if [ "$START_COUNT" -ge 2 ]; then
    echo "Server recovered after syntax fix ✓"
    test_result "Error recovery" "PASS" ""
  else
    echo "Server did not restart after fix ✗"
    test_result "Error recovery" "FAIL" "No restart after fix"
  fi
else
  echo "Server did not recover ✗"
  test_result "Error recovery" "FAIL" "Recovery timeout"
fi

# Cleanup
kill_tree $WATCH_PID

EOF

chmod +x scenario-7.sh
./scenario-7.sh
```

#### Expected Behavior

1. Server starts normally
2. Syntax error introduced
3. Watch mode detects change
4. Child server fails to start
5. Watch mode parent remains running
6. Syntax error fixed
7. Server recovers and starts successfully

#### Pass Criteria

- ✅ Watch mode survives child process errors
- ✅ Change detection works after error
- ✅ Server recovers when error is fixed
- ✅ Watch mode logs errors appropriately

#### Fail Criteria

- ❌ Watch mode crashes on child error
- ❌ No change detection after error
- ❌ Server doesn't recover
- ❌ Watch mode enters bad state

---

### Scenario 8: Dependency File Watching

**Objective:** Verify watch mode detects changes in dependency files in same directory.

**API Style:** Decorator
**Transport:** STDIO
**Flags:** `--watch --verbose`

#### Setup

```bash
# Create main server
cat > test-server-deps.ts << 'EOF'
import { MCPServer } from 'simply-mcp';
import { greetUser } from './test-deps-helper.js';

@MCPServer()
export default class DepsTestServer {
  greet(name: string): string {
    return greetUser(name);
  }
}
EOF

# Create dependency file
cat > test-deps-helper.ts << 'EOF'
export function greetUser(name: string): string {
  return `Hello, ${name}!`;
}
EOF
```

#### Execution

```bash
cat > scenario-8.sh << 'EOF'
#!/bin/bash
source ./test-helpers.sh

test_start "Scenario 8: Dependency File Watching"

# Start watch mode
npx simplymcp run test-server-deps.ts --watch --verbose > /tmp/scenario-8.log 2>&1 &
WATCH_PID=$!

echo "Started watch mode (PID: $WATCH_PID)"
sleep 3

# Verify initial startup
if ! grep -q "Server started" /tmp/scenario-8.log; then
  echo "Initial startup failed ✗"
  cat /tmp/scenario-8.log
  kill_tree $WATCH_PID
  test_result "Initial startup" "FAIL" "Server did not start"
  exit 1
fi

echo "Initial startup successful ✓"

# Check that watch patterns include TS files
if grep -q "Watching patterns:" /tmp/scenario-8.log; then
  echo "Watch patterns logged ✓"
  if grep -A5 "Watching patterns:" /tmp/scenario-8.log | grep -q "\.ts"; then
    echo "TS files being watched ✓"
    test_result "Dependency watching setup" "PASS" ""
  else
    echo "TS files not in watch patterns ✗"
    test_result "Dependency watching setup" "FAIL" "No TS pattern"
  fi
else
  echo "No watch patterns in verbose output ⚠"
fi

# Modify dependency file (NOT main server file)
echo ""
echo "Modifying dependency file (test-deps-helper.ts)..."
cat > test-deps-helper.ts << 'EOF_INNER'
export function greetUser(name: string): string {
  return `Hi there, ${name}!`;  // Changed greeting
}
EOF_INNER

# Wait for change detection
if wait_for_log /tmp/scenario-8.log "File change detected" 60; then
  echo "Dependency file change detected ✓"
  test_result "Dependency change detection" "PASS" ""
else
  echo "Dependency file change NOT detected ✗"
  cat /tmp/scenario-8.log
  kill_tree $WATCH_PID
  test_result "Dependency change detection" "FAIL" "No detection"
  exit 1
fi

# Wait for restart
if wait_for_log /tmp/scenario-8.log "Restart complete" 80; then
  echo "Restart after dependency change ✓"
  test_result "Dependency restart" "PASS" ""
else
  echo "Restart did not complete ✗"
  test_result "Dependency restart" "FAIL" "Restart hung"
fi

# Cleanup
kill_tree $WATCH_PID
rm -f test-server-deps.ts test-deps-helper.ts

EOF

chmod +x scenario-8.sh
./scenario-8.sh
```

#### Expected Behavior

1. Server starts normally
2. Verbose output shows watch patterns including `**/*.ts`
3. Modifying dependency file triggers change detection
4. Server restarts successfully
5. New code loaded

#### Pass Criteria

- ✅ Watch patterns include TS files
- ✅ Dependency file changes detected
- ✅ Restart triggered
- ✅ Restart completes successfully

#### Fail Criteria

- ❌ Dependency changes not detected
- ❌ No restart on dependency change
- ❌ Only main file watched

---

## Pass/Fail Criteria

### Overall Test Suite Success Criteria

The watch mode test suite **PASSES** if:

1. **Core Functionality (Scenarios 1-2)**
   - ✅ Watch mode starts and stops cleanly
   - ✅ File changes trigger restarts within 2000ms
   - ✅ Restart timing is logged accurately

2. **API Style Coverage (Scenarios 1, 3, 5)**
   - ✅ Decorator API works with watch mode
   - ✅ Functional API works with watch mode
   - ✅ Interface API works with watch mode

3. **Transport Support (Scenario 4)**
   - ✅ HTTP transport works with watch mode
   - ✅ Port remains consistent across restarts

4. **Advanced Features (Scenarios 6-8)**
   - ✅ Debouncing prevents rapid restart loops
   - ✅ Watch mode survives child process errors
   - ✅ Dependency files are watched and trigger restarts

5. **Reliability Metrics**
   - ✅ No memory leaks (process memory stable)
   - ✅ No zombie processes (all children cleaned up)
   - ✅ Graceful shutdown on SIGTERM/SIGINT

### Critical Failures

The test suite **FAILS CRITICALLY** if:

- ❌ Watch mode crashes immediately on startup (Scenario 1)
- ❌ File changes never trigger restarts (Scenario 2)
- ❌ Any API style completely broken (Scenarios 1, 3, 5)
- ❌ Watch mode hangs on SIGTERM (Scenario 1)

### Warning Level Failures

Non-critical issues that should be investigated:

- ⚠️ Restart timing > 2000ms but < 5000ms
- ⚠️ Debouncing allows 3 restarts for 5 changes (still acceptable)
- ⚠️ Verbose mode missing some expected log messages
- ⚠️ Polling mode slower than native FS events

---

## Cleanup Procedures

### After Each Scenario

```bash
# Kill any remaining watch processes
pkill -f "simplymcp run.*--watch" || true

# Remove test artifacts
rm -f /tmp/scenario-*.log

# Restore modified files
git checkout test-server-*.ts 2>/dev/null || true
```

### Complete Cleanup

```bash
# Navigate to test directory
cd /tmp/watch-mode-tests

# Kill all related processes
pkill -f "simplymcp" || true
pkill -f "node.*watch" || true

# Remove test directory
cd /tmp
rm -rf watch-mode-tests

# Verify no zombie processes
ps aux | grep simplymcp
```

---

## Master Test Runner

```bash
cat > run-all-tests.sh << 'EOF'
#!/bin/bash
source ./test-helpers.sh

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Watch Mode Integration Test Suite                     ║${NC}"
echo -e "${BLUE}║     Simply MCP v2.5.0-beta.3                               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Run all scenarios
./scenario-1.sh
./scenario-2.sh
./scenario-3.sh
./scenario-4.sh
./scenario-5.sh
./scenario-6.sh
./scenario-7.sh
./scenario-8.sh

# Print final summary
print_summary
EOF

chmod +x run-all-tests.sh
```

**Execute all tests:**

```bash
cd /tmp/watch-mode-tests
./run-all-tests.sh
```

---

## Troubleshooting

### Process Won't Start

**Symptom:** Watch mode exits immediately

**Diagnosis:**
```bash
# Check for TypeScript errors
npx tsc --noEmit test-server-decorator.ts

# Check for missing dependencies
npm list simply-mcp

# Run without watch to see errors
npx simplymcp run test-server-decorator.ts --verbose
```

### Change Detection Not Working

**Symptom:** File changes don't trigger restarts

**Diagnosis:**
```bash
# Verify chokidar is installed
npm list chokidar

# Check filesystem events
npx chokidar "test-*.ts" --verbose

# Try polling mode
npx simplymcp run test-server.ts --watch --watch-poll
```

### Restart Loop

**Symptom:** Server restarts continuously

**Diagnosis:**
```bash
# Check for files being modified during startup
ls -la --time-style=full-iso test-*.ts

# Look for build processes modifying files
ps aux | grep -E "(tsc|esbuild|webpack)"

# Increase debounce (requires code change)
# Edit: src/cli/watch-mode.ts
# Change: RESTART_DEBOUNCE_MS = 300 → 1000
```

### Zombie Processes

**Symptom:** Processes don't clean up

**Diagnosis:**
```bash
# Find zombie processes
ps aux | grep -E "(simply|watch)" | grep -v grep

# Force cleanup
pkill -9 -f "simplymcp"

# Check for orphaned Node processes
ps aux | grep node | grep -v grep
```

---

## Test Report Template

```markdown
# Watch Mode Test Report

**Test Date:** YYYY-MM-DD
**Package Version:** simply-mcp-2.5.0-beta.3
**Node Version:** vX.X.X
**Platform:** Linux/macOS/Windows

## Test Results

| Scenario | Status | Duration | Notes |
|----------|--------|----------|-------|
| 1. Basic Startup | PASS/FAIL | XXms | |
| 2. File Change | PASS/FAIL | XXms | |
| 3. Polling Mode | PASS/FAIL | XXms | |
| 4. HTTP Transport | PASS/FAIL | XXms | |
| 5. Interface API | PASS/FAIL | XXms | |
| 6. Debouncing | PASS/FAIL | XXms | |
| 7. Error Recovery | PASS/FAIL | XXms | |
| 8. Dependencies | PASS/FAIL | XXms | |

**Total Passed:** X/8
**Total Failed:** X/8

## Critical Issues

- Issue 1: Description
- Issue 2: Description

## Recommendations

- Recommendation 1
- Recommendation 2

## Approval

- [ ] All critical tests passed
- [ ] No regression from previous version
- [ ] Ready for release
```

---

## Appendix: Expected Log Samples

### Successful Startup
```
[Watch] Starting watch mode...
[Watch] File: /tmp/watch-mode-tests/test-server-decorator.ts
[Watch] API Style: decorator
[Watch] Transport: STDIO
[Watch] Press Ctrl+C to stop

[Watch] [14:32:10] Starting server process...
[Watch] [14:32:10] Server started (PID: 12345)
[SimplyMCP] Server running on stdio
```

### Successful Restart
```
[Watch] [14:35:42] Changed: /tmp/watch-mode-tests/test-server-decorator.ts

[Watch] [14:35:42] File change detected, restarting server...
[Watch] [14:35:42] Stopping server process...
[Watch] [14:35:42] Server process exited with code: 0
[Watch] [14:35:43] Starting server process...
[Watch] [14:35:43] Server started (PID: 12456)
[Watch] [14:35:43] ✓ Restart complete (234ms)
```

### Graceful Shutdown
```
[Watch] [14:40:15] Received SIGINT, shutting down...
[Watch] [14:40:15] Server process exited with code: 0
[Watch] [14:40:15] Shutdown complete
```

---

**END OF TEST PLAN**
