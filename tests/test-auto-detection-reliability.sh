#!/usr/bin/env bash

# Auto-Detection Reliability Test Suite
# Tests that auto-detection messages appear reliably BEFORE or AFTER respawn
# This is a critical test to ensure users see what's happening during auto-detection

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CLI_ROOT="$MCP_ROOT/dist/src/cli"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Test helper functions
print_result() {
  local test_name="$1"
  local result="$2"
  local message="$3"

  if [ "$result" == "PASS" ]; then
    echo -e "${GREEN}✓ PASS${NC}: $test_name"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC}: $test_name"
    if [ -n "$message" ]; then
      echo -e "  ${RED}Error${NC}: $message"
    fi
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

# Wait for log file to contain pattern or timeout (timeout in seconds)
wait_for_log() {
  local logfile="$1"
  local pattern="$2"
  local timeout="${3:-10}"
  local iterations=$((timeout * 2))  # 0.5s per iteration
  local count=0

  while [ $count -lt $iterations ]; do
    if [ -f "$logfile" ] && grep -q "$pattern" "$logfile" 2>/dev/null; then
      return 0
    fi
    sleep 0.5
    count=$((count + 1))
  done
  return 1
}

# Kill any background processes on exit
cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi

  # Kill any stray node processes from tests
  pkill -f "simplymcp" 2>/dev/null || true
  pkill -f "tsx.*examples" 2>/dev/null || true
}

trap cleanup EXIT

echo "========================================="
echo "Auto-Detection Reliability Test Suite"
echo "========================================="
echo ""
echo "Purpose: Ensure auto-detection messages appear reliably"
echo "         even when process respawn happens for tsx loading"
echo ""

# ============================================
# Test 1: Decorator API Auto-Detection Messages
# ============================================

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Test 1: Decorator API Auto-Detection${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

echo "Test 1.1: Auto-detection outputs 'Detected API style: decorator' message"
timeout 10 node "$CLI_ROOT/run-bin.js" run "examples/class-minimal.ts" --verbose > /tmp/auto-detect-decorator.log 2>&1 &
SERVER_PID=$!

if wait_for_log "/tmp/auto-detect-decorator.log" "Detected API style: decorator" 10; then
  print_result "Decorator auto-detection message appears" "PASS"
else
  echo -e "${RED}Log contents:${NC}"
  cat /tmp/auto-detect-decorator.log 2>/dev/null || echo "No log file"
  print_result "Decorator auto-detection message appears" "FAIL" "Message did not appear within 10 seconds"
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

echo ""
echo "Test 1.2: Auto-detection outputs 'Loading class from' message"
timeout 10 node "$CLI_ROOT/run-bin.js" run "examples/class-minimal.ts" --verbose > /tmp/auto-detect-decorator-loading.log 2>&1 &
SERVER_PID=$!

if wait_for_log "/tmp/auto-detect-decorator-loading.log" "Loading class from" 10; then
  print_result "Decorator loading message appears" "PASS"
else
  echo -e "${RED}Log contents:${NC}"
  cat /tmp/auto-detect-decorator-loading.log 2>/dev/null || echo "No log file"
  print_result "Decorator loading message appears" "FAIL" "Message did not appear within 10 seconds"
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

echo ""
echo "Test 1.3: Both detection and loading messages appear in sequence"
timeout 10 node "$CLI_ROOT/run-bin.js" run "examples/class-minimal.ts" --verbose > /tmp/auto-detect-decorator-both.log 2>&1 &
SERVER_PID=$!
sleep 8

# Check for both messages
has_detection=0
has_loading=0

if grep -q "Detected API style: decorator" /tmp/auto-detect-decorator-both.log 2>/dev/null; then
  has_detection=1
fi

if grep -q "Loading class from" /tmp/auto-detect-decorator-both.log 2>/dev/null; then
  has_loading=1
fi

if [ $has_detection -eq 1 ] && [ $has_loading -eq 1 ]; then
  print_result "Both decorator messages appear in sequence" "PASS"
else
  echo -e "${RED}Log contents:${NC}"
  cat /tmp/auto-detect-decorator-both.log 2>/dev/null || echo "No log file"
  if [ $has_detection -eq 0 ]; then
    echo -e "${RED}Missing: Detected API style message${NC}"
  fi
  if [ $has_loading -eq 0 ]; then
    echo -e "${RED}Missing: Loading class from message${NC}"
  fi
  print_result "Both decorator messages appear in sequence" "FAIL" "One or more messages missing"
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

# ============================================
# Test 2: Functional API Auto-Detection Messages
# ============================================

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Test 2: Functional API Auto-Detection${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

echo "Test 2.1: Auto-detection outputs 'Detected API style: functional' message"
timeout 10 node "$CLI_ROOT/run-bin.js" run "examples/single-file-basic.ts" --verbose > /tmp/auto-detect-functional.log 2>&1 &
SERVER_PID=$!

if wait_for_log "/tmp/auto-detect-functional.log" "Detected API style: functional" 10; then
  print_result "Functional auto-detection message appears" "PASS"
else
  echo -e "${RED}Log contents:${NC}"
  cat /tmp/auto-detect-functional.log 2>/dev/null || echo "No log file"
  print_result "Functional auto-detection message appears" "FAIL" "Message did not appear within 10 seconds"
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

echo ""
echo "Test 2.2: Auto-detection outputs 'Loading config from' message"
timeout 10 node "$CLI_ROOT/run-bin.js" run "examples/single-file-basic.ts" --verbose > /tmp/auto-detect-functional-loading.log 2>&1 &
SERVER_PID=$!

if wait_for_log "/tmp/auto-detect-functional-loading.log" "Loading config from" 10; then
  print_result "Functional loading message appears" "PASS"
else
  echo -e "${RED}Log contents:${NC}"
  cat /tmp/auto-detect-functional-loading.log 2>/dev/null || echo "No log file"
  print_result "Functional loading message appears" "FAIL" "Message did not appear within 10 seconds"
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

# ============================================
# Test 3: Programmatic API Auto-Detection Messages
# ============================================

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Test 3: Programmatic API Auto-Detection${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

echo "Test 3.1: Auto-detection outputs 'Detected API style: programmatic' message"
timeout 10 node "$CLI_ROOT/run-bin.js" run "examples/simple-server.ts" --verbose > /tmp/auto-detect-programmatic.log 2>&1 &
SERVER_PID=$!

if wait_for_log "/tmp/auto-detect-programmatic.log" "Detected API style: programmatic" 10; then
  print_result "Programmatic auto-detection message appears" "PASS"
else
  echo -e "${RED}Log contents:${NC}"
  cat /tmp/auto-detect-programmatic.log 2>/dev/null || echo "No log file"
  print_result "Programmatic auto-detection message appears" "FAIL" "Message did not appear within 10 seconds"
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

echo ""
echo "Test 3.2: Auto-detection outputs 'Loading server from' message"
timeout 10 node "$CLI_ROOT/run-bin.js" run "examples/simple-server.ts" --verbose > /tmp/auto-detect-programmatic-loading.log 2>&1 &
SERVER_PID=$!

if wait_for_log "/tmp/auto-detect-programmatic-loading.log" "Loading server from" 10; then
  print_result "Programmatic loading message appears" "PASS"
else
  echo -e "${RED}Log contents:${NC}"
  cat /tmp/auto-detect-programmatic-loading.log 2>/dev/null || echo "No log file"
  print_result "Programmatic loading message appears" "FAIL" "Message did not appear within 10 seconds"
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

# ============================================
# Test 4: Messages Appear Even With Respawn
# ============================================

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Test 4: Messages Survive Respawn${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

echo "Test 4.1: Detection messages appear before respawn OR are preserved after"
# This test runs without tsx pre-loaded, forcing a respawn
# The messages MUST appear either before respawn or be re-outputted after

# Clear any tsx from environment
unset NODE_OPTIONS

timeout 10 node "$CLI_ROOT/run-bin.js" run "examples/class-minimal.ts" --verbose > /tmp/auto-detect-respawn.log 2>&1 &
SERVER_PID=$!

# Give it time for both initial run and respawn
sleep 8

# Check if detection message appears AT ALL
if grep -q "Detected API style: decorator" /tmp/auto-detect-respawn.log 2>/dev/null; then
  print_result "Detection message survives respawn" "PASS"
else
  echo -e "${RED}Log contents:${NC}"
  cat /tmp/auto-detect-respawn.log 2>/dev/null || echo "No log file"
  print_result "Detection message survives respawn" "FAIL" "Message lost during respawn"
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

# ============================================
# Test 5: Timing Tests (Reasonable Response Time)
# ============================================

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Test 5: Response Time Tests${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

echo "Test 5.1: Detection message appears within 5 seconds"
START_TIME=$(date +%s)
timeout 10 node "$CLI_ROOT/run-bin.js" run "examples/class-minimal.ts" --verbose > /tmp/auto-detect-timing.log 2>&1 &
SERVER_PID=$!

if wait_for_log "/tmp/auto-detect-timing.log" "Detected API style" 5; then
  END_TIME=$(date +%s)
  ELAPSED=$((END_TIME - START_TIME))
  print_result "Detection message within 5 seconds (${ELAPSED}s)" "PASS"
else
  echo -e "${RED}Log contents:${NC}"
  cat /tmp/auto-detect-timing.log 2>/dev/null || echo "No log file"
  print_result "Detection message within 5 seconds" "FAIL" "Took longer than 5 seconds"
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

echo ""
echo "Test 5.2: Loading message appears within 10 seconds"
START_TIME=$(date +%s)
timeout 15 node "$CLI_ROOT/run-bin.js" run "examples/class-minimal.ts" --verbose > /tmp/auto-detect-loading-timing.log 2>&1 &
SERVER_PID=$!

if wait_for_log "/tmp/auto-detect-loading-timing.log" "Loading class from" 10; then
  END_TIME=$(date +%s)
  ELAPSED=$((END_TIME - START_TIME))
  print_result "Loading message within 10 seconds (${ELAPSED}s)" "PASS"
else
  echo -e "${RED}Log contents:${NC}"
  cat /tmp/auto-detect-loading-timing.log 2>/dev/null || echo "No log file"
  print_result "Loading message within 10 seconds" "FAIL" "Took longer than 10 seconds"
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

# ============================================
# Test Summary
# ============================================

echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

# Cleanup temp files
rm -f /tmp/auto-detect-*.log

# Exit with appropriate code
if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All auto-detection reliability tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some auto-detection reliability tests failed!${NC}"
  echo ""
  echo "This indicates that auto-detection messages are not appearing reliably."
  echo "Users may not understand what's happening when they run 'simplymcp run'."
  exit 1
fi
