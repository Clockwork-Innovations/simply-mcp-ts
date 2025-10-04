#!/bin/bash
# Comprehensive test suite for watch mode functionality
# Tests auto-restart, dependency tracking, and graceful shutdown

set -e

echo "=== Testing Watch Mode ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run a test
run_test() {
  local test_name="$1"
  local test_command="$2"

  echo -e "${YELLOW}Test: ${test_name}${NC}"

  if eval "$test_command"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ FAILED${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  echo ""
}

# Test 1: Start watch mode in background
test_watch_startup() {
  timeout 5s node dist/mcp/cli/index.js run test-watch-server.ts --watch --verbose > /tmp/watch-test.log 2>&1 &
  WATCH_PID=$!
  sleep 2

  if ps -p $WATCH_PID > /dev/null; then
    kill -SIGTERM $WATCH_PID 2>/dev/null || true
    wait $WATCH_PID 2>/dev/null || true
    return 0
  else
    cat /tmp/watch-test.log
    return 1
  fi
}

# Test 2: File change triggers restart
test_file_change_restart() {
  timeout 10s node dist/mcp/cli/index.js run test-watch-server.ts --watch --verbose > /tmp/watch-restart.log 2>&1 &
  WATCH_PID=$!
  sleep 2

  # Modify the file
  echo "  // Test comment" >> test-watch-server.ts
  sleep 2

  # Check log for restart message
  local has_restart=$(grep -c "File change detected, restarting server" /tmp/watch-restart.log || echo "0")

  # Cleanup
  kill -SIGTERM $WATCH_PID 2>/dev/null || true
  wait $WATCH_PID 2>/dev/null || true
  git checkout test-watch-server.ts 2>/dev/null || true

  if [ "$has_restart" -gt "0" ]; then
    return 0
  else
    cat /tmp/watch-restart.log
    return 1
  fi
}

# Test 3: STDIO transport
test_stdio_transport() {
  timeout 3s node dist/mcp/cli/index.js run mcp/examples/class-minimal.ts --watch > /tmp/watch-stdio.log 2>&1 &
  STDIO_PID=$!
  sleep 2

  if ps -p $STDIO_PID > /dev/null; then
    kill -SIGTERM $STDIO_PID 2>/dev/null || true
    wait $STDIO_PID 2>/dev/null || true
    return 0
  else
    cat /tmp/watch-stdio.log
    return 1
  fi
}

# Test 4: HTTP transport
test_http_transport() {
  timeout 3s node dist/mcp/cli/index.js run mcp/examples/class-minimal.ts --watch --http --port 3000 > /tmp/watch-http.log 2>&1 &
  HTTP_PID=$!
  sleep 2

  if ps -p $HTTP_PID > /dev/null; then
    kill -SIGTERM $HTTP_PID 2>/dev/null || true
    wait $HTTP_PID 2>/dev/null || true
    return 0
  else
    cat /tmp/watch-http.log
    return 1
  fi
}

# Test 5: Functional API
test_functional_api() {
  timeout 3s node dist/mcp/cli/index.js run mcp/examples/single-file-basic.ts --watch > /tmp/watch-func.log 2>&1 &
  FUNC_PID=$!
  sleep 2

  if ps -p $FUNC_PID > /dev/null; then
    kill -SIGTERM $FUNC_PID 2>/dev/null || true
    wait $FUNC_PID 2>/dev/null || true
    return 0
  else
    cat /tmp/watch-func.log
    return 1
  fi
}

# Test 6: Polling mode
test_polling_mode() {
  timeout 3s node dist/mcp/cli/index.js run mcp/examples/class-minimal.ts --watch --watch-poll --watch-interval 200 > /tmp/watch-poll.log 2>&1 &
  POLL_PID=$!
  sleep 2

  local has_polling=$(grep -c "Polling mode enabled" /tmp/watch-poll.log || echo "0")

  kill -SIGTERM $POLL_PID 2>/dev/null || true
  wait $POLL_PID 2>/dev/null || true

  if [ "$has_polling" -gt "0" ]; then
    return 0
  else
    cat /tmp/watch-poll.log
    return 1
  fi
}

# Test 7: Graceful shutdown with SIGTERM
test_graceful_shutdown() {
  node dist/mcp/cli/index.js run test-watch-server.ts --watch --verbose > /tmp/watch-shutdown.log 2>&1 &
  SHUTDOWN_PID=$!
  sleep 2

  # Send SIGTERM
  kill -SIGTERM $SHUTDOWN_PID
  sleep 1

  # Check if process exited cleanly
  if ! ps -p $SHUTDOWN_PID > /dev/null 2>&1; then
    local has_shutdown=$(grep -c "Shutdown complete" /tmp/watch-shutdown.log || echo "0")
    if [ "$has_shutdown" -gt "0" ]; then
      return 0
    fi
  fi

  cat /tmp/watch-shutdown.log
  return 1
}

# Test 8: Enhanced watch patterns (watching dependencies)
test_dependency_watching() {
  timeout 5s node dist/mcp/cli/index.js run test-watch-server.ts --watch --verbose > /tmp/watch-deps.log 2>&1 &
  DEPS_PID=$!
  sleep 2

  # Check if watching patterns are logged
  local has_patterns=$(grep -c "Watching patterns:" /tmp/watch-deps.log || echo "0")

  kill -SIGTERM $DEPS_PID 2>/dev/null || true
  wait $DEPS_PID 2>/dev/null || true

  if [ "$has_patterns" -gt "0" ]; then
    return 0
  else
    cat /tmp/watch-deps.log
    return 1
  fi
}

# Test 9: Restart timing indicator
test_restart_timing() {
  timeout 10s node dist/mcp/cli/index.js run test-watch-server.ts --watch --verbose > /tmp/watch-timing.log 2>&1 &
  TIMING_PID=$!
  sleep 2

  # Modify file to trigger restart
  echo "  // Timing test" >> test-watch-server.ts
  sleep 2

  # Check for restart timing in log
  local has_timing=$(grep -c "Restart complete" /tmp/watch-timing.log || echo "0")

  kill -SIGTERM $TIMING_PID 2>/dev/null || true
  wait $TIMING_PID 2>/dev/null || true
  git checkout test-watch-server.ts 2>/dev/null || true

  if [ "$has_timing" -gt "0" ]; then
    return 0
  else
    cat /tmp/watch-timing.log
    return 1
  fi
}

# Run all tests
echo -e "${BLUE}=== Running Watch Mode Test Suite ===${NC}"
echo ""

run_test "Watch mode starts correctly" "test_watch_startup"
run_test "File changes trigger auto-restart" "test_file_change_restart"
run_test "STDIO transport" "test_stdio_transport"
run_test "HTTP transport" "test_http_transport"
run_test "Functional API support" "test_functional_api"
run_test "Polling mode" "test_polling_mode"
run_test "Graceful shutdown (SIGTERM)" "test_graceful_shutdown"
run_test "Dependency watching patterns" "test_dependency_watching"
run_test "Restart timing indicator" "test_restart_timing"

# Summary
echo -e "${BLUE}=== Test Summary ===${NC}"
echo -e "Tests passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed.${NC}"
  exit 1
fi
