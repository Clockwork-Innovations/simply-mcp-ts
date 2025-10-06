#!/usr/bin/env bash

# Verbose Mode Consistency Test
# Tests that --verbose flag shows consistent output format across all API styles
#
# Issue: The --verbose flag shows different levels of detail depending on which
# code path executes. Some outputs show [RunCommand] prefixes, others show
# [Adapter] prefixes, and formatting is inconsistent across different adapters:
#   - Decorator adapter (class-based)
#   - Functional adapter (config-based)
#   - Programmatic adapter (direct server)
#
# This test creates temporary server files for each style, runs them with
# --verbose flag, and verifies that all show consistent verbose output format.
#
# Expected: All adapters should use consistent prefixes and formatting
# Current: This test FAILS (red) because verbose output is inconsistent

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

# Cleanup function
cleanup() {
  # Kill any background processes
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi

  # Clean up temporary directory
  if [ -d "$TEST_DIR" ]; then
    rm -rf "$TEST_DIR"
  fi
}

trap cleanup EXIT

# Print test result
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

echo "========================================="
echo "Testing Verbose Mode Consistency"
echo "========================================="
echo ""

# Create temporary directory for test files
TEST_DIR=$(mktemp -d)
echo "Test directory: $TEST_DIR"
echo ""

# ============================================
# Use Existing Example Files
# ============================================

echo -e "${BLUE}Using existing example server files...${NC}"
echo ""

# Use existing example files from the repository
DECORATOR_SERVER="$MCP_ROOT/examples/class-minimal.ts"
FUNCTIONAL_SERVER="$MCP_ROOT/examples/single-file-basic.ts"
PROGRAMMATIC_SERVER="$MCP_ROOT/examples/simple-server.ts"

echo "Decorator server: $DECORATOR_SERVER"
echo "Functional server: $FUNCTIONAL_SERVER"
echo "Programmatic server: $PROGRAMMATIC_SERVER"
echo ""

# ============================================
# Part 1: Run Each Server with --verbose
# ============================================

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Part 1: Capture Verbose Output${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Test 1.1: Decorator adapter verbose output
echo "Test 1.1: Running decorator server with --verbose"
timeout 3 node "$CLI_ROOT/run-bin.js" run "$DECORATOR_SERVER" --verbose > "$TEST_DIR/decorator-verbose.log" 2>&1 &
SERVER_PID=$!
sleep 2
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true
SERVER_PID=""

echo "Captured decorator verbose output"
echo ""

# Test 1.2: Functional adapter verbose output
echo "Test 1.2: Running functional server with --verbose"
timeout 3 node "$CLI_ROOT/run-bin.js" run "$FUNCTIONAL_SERVER" --verbose > "$TEST_DIR/functional-verbose.log" 2>&1 &
SERVER_PID=$!
sleep 2
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true
SERVER_PID=""

echo "Captured functional verbose output"
echo ""

# Test 1.3: Programmatic adapter verbose output
echo "Test 1.3: Running programmatic server with --verbose"
timeout 3 node "$CLI_ROOT/run-bin.js" run "$PROGRAMMATIC_SERVER" --verbose > "$TEST_DIR/programmatic-verbose.log" 2>&1 &
SERVER_PID=$!
sleep 2
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true
SERVER_PID=""

echo "Captured programmatic verbose output"
echo ""

# ============================================
# Part 2: Verify Consistent Prefix Usage
# ============================================

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Part 2: Verify Consistent Prefixes${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Test 2.1: Check that all adapters use consistent prefixes
echo "Test 2.1: Check for consistent [RunCommand] prefix usage"

DECORATOR_HAS_RUNCOMMAND=false
FUNCTIONAL_HAS_RUNCOMMAND=false
PROGRAMMATIC_HAS_RUNCOMMAND=false

if grep -q "\[RunCommand\]" "$TEST_DIR/decorator-verbose.log" 2>/dev/null; then
  DECORATOR_HAS_RUNCOMMAND=true
fi

if grep -q "\[RunCommand\]" "$TEST_DIR/functional-verbose.log" 2>/dev/null; then
  FUNCTIONAL_HAS_RUNCOMMAND=true
fi

if grep -q "\[RunCommand\]" "$TEST_DIR/programmatic-verbose.log" 2>/dev/null; then
  PROGRAMMATIC_HAS_RUNCOMMAND=true
fi

# All should have [RunCommand] prefix OR none should (consistency is key)
if [ "$DECORATOR_HAS_RUNCOMMAND" = "$FUNCTIONAL_HAS_RUNCOMMAND" ] && \
   [ "$FUNCTIONAL_HAS_RUNCOMMAND" = "$PROGRAMMATIC_HAS_RUNCOMMAND" ]; then
  print_result "Consistent [RunCommand] prefix usage" "PASS"
else
  print_result "Consistent [RunCommand] prefix usage" "FAIL" \
    "Decorator=$DECORATOR_HAS_RUNCOMMAND, Functional=$FUNCTIONAL_HAS_RUNCOMMAND, Programmatic=$PROGRAMMATIC_HAS_RUNCOMMAND"
fi

# Test 2.2: Check that all adapters use consistent [Adapter] prefix
echo ""
echo "Test 2.2: Check for consistent [Adapter] prefix usage"

DECORATOR_HAS_ADAPTER=false
FUNCTIONAL_HAS_ADAPTER=false
PROGRAMMATIC_HAS_ADAPTER=false

if grep -q "\[Adapter\]" "$TEST_DIR/decorator-verbose.log" 2>/dev/null; then
  DECORATOR_HAS_ADAPTER=true
fi

if grep -q "\[Adapter\]" "$TEST_DIR/functional-verbose.log" 2>/dev/null; then
  FUNCTIONAL_HAS_ADAPTER=true
fi

if grep -q "\[Adapter\]" "$TEST_DIR/programmatic-verbose.log" 2>/dev/null; then
  PROGRAMMATIC_HAS_ADAPTER=true
fi

# All should have [Adapter] prefix OR none should (consistency is key)
if [ "$DECORATOR_HAS_ADAPTER" = "$FUNCTIONAL_HAS_ADAPTER" ] && \
   [ "$FUNCTIONAL_HAS_ADAPTER" = "$PROGRAMMATIC_HAS_ADAPTER" ]; then
  print_result "Consistent [Adapter] prefix usage" "PASS"
else
  print_result "Consistent [Adapter] prefix usage" "FAIL" \
    "Decorator=$DECORATOR_HAS_ADAPTER, Functional=$FUNCTIONAL_HAS_ADAPTER, Programmatic=$PROGRAMMATIC_HAS_ADAPTER"
fi

# ============================================
# Part 3: Verify Information Completeness
# ============================================

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Part 3: Verify Information Completeness${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Test 3.1: Check that all adapters show API style detection
echo "Test 3.1: All adapters show API style detection in verbose mode"

DECORATOR_SHOWS_DETECTION=false
FUNCTIONAL_SHOWS_DETECTION=false
PROGRAMMATIC_SHOWS_DETECTION=false

if grep -q "Detected API style" "$TEST_DIR/decorator-verbose.log" 2>/dev/null; then
  DECORATOR_SHOWS_DETECTION=true
fi

if grep -q "Detected API style" "$TEST_DIR/functional-verbose.log" 2>/dev/null; then
  FUNCTIONAL_SHOWS_DETECTION=true
fi

if grep -q "Detected API style" "$TEST_DIR/programmatic-verbose.log" 2>/dev/null; then
  PROGRAMMATIC_SHOWS_DETECTION=true
fi

# All should show detection information in verbose mode
if [ "$DECORATOR_SHOWS_DETECTION" = "true" ] && \
   [ "$FUNCTIONAL_SHOWS_DETECTION" = "true" ] && \
   [ "$PROGRAMMATIC_SHOWS_DETECTION" = "true" ]; then
  print_result "All adapters show API style detection" "PASS"
else
  print_result "All adapters show API style detection" "FAIL" \
    "Decorator=$DECORATOR_SHOWS_DETECTION, Functional=$FUNCTIONAL_SHOWS_DETECTION, Programmatic=$PROGRAMMATIC_SHOWS_DETECTION"
fi

# Test 3.2: Check that all adapters show loading information
echo ""
echo "Test 3.2: All adapters show loading information in verbose mode"

DECORATOR_SHOWS_LOADING=false
FUNCTIONAL_SHOWS_LOADING=false
PROGRAMMATIC_SHOWS_LOADING=false

if grep -q "Loading class from" "$TEST_DIR/decorator-verbose.log" 2>/dev/null; then
  DECORATOR_SHOWS_LOADING=true
fi

if grep -q "Loading config from" "$TEST_DIR/functional-verbose.log" 2>/dev/null; then
  FUNCTIONAL_SHOWS_LOADING=true
fi

# Programmatic might show different loading message or none - check for any loading indicator
if grep -qi "loading\|creating server" "$TEST_DIR/programmatic-verbose.log" 2>/dev/null; then
  PROGRAMMATIC_SHOWS_LOADING=true
fi

# All should show some form of loading information
if [ "$DECORATOR_SHOWS_LOADING" = "true" ] && \
   [ "$FUNCTIONAL_SHOWS_LOADING" = "true" ] && \
   [ "$PROGRAMMATIC_SHOWS_LOADING" = "true" ]; then
  print_result "All adapters show loading information" "PASS"
else
  print_result "All adapters show loading information" "FAIL" \
    "Decorator=$DECORATOR_SHOWS_LOADING, Functional=$FUNCTIONAL_SHOWS_LOADING, Programmatic=$PROGRAMMATIC_SHOWS_LOADING"
fi

# Test 3.3: Check that all adapters show transport information
echo ""
echo "Test 3.3: All adapters show transport information in verbose mode"

DECORATOR_SHOWS_TRANSPORT=false
FUNCTIONAL_SHOWS_TRANSPORT=false
PROGRAMMATIC_SHOWS_TRANSPORT=false

if grep -q "Transport:" "$TEST_DIR/decorator-verbose.log" 2>/dev/null; then
  DECORATOR_SHOWS_TRANSPORT=true
fi

if grep -q "Transport:" "$TEST_DIR/functional-verbose.log" 2>/dev/null; then
  FUNCTIONAL_SHOWS_TRANSPORT=true
fi

if grep -q "Transport:" "$TEST_DIR/programmatic-verbose.log" 2>/dev/null; then
  PROGRAMMATIC_SHOWS_TRANSPORT=true
fi

# All should show transport information in verbose mode
if [ "$DECORATOR_SHOWS_TRANSPORT" = "true" ] && \
   [ "$FUNCTIONAL_SHOWS_TRANSPORT" = "true" ] && \
   [ "$PROGRAMMATIC_SHOWS_TRANSPORT" = "true" ]; then
  print_result "All adapters show transport information" "PASS"
else
  print_result "All adapters show transport information" "FAIL" \
    "Decorator=$DECORATOR_SHOWS_TRANSPORT, Functional=$FUNCTIONAL_SHOWS_TRANSPORT, Programmatic=$PROGRAMMATIC_SHOWS_TRANSPORT"
fi

# ============================================
# Part 4: Display Sample Outputs for Review
# ============================================

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Part 4: Sample Verbose Outputs${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

echo -e "${YELLOW}Decorator Server Verbose Output:${NC}"
cat "$TEST_DIR/decorator-verbose.log" || echo "(empty or missing)"
echo ""

echo -e "${YELLOW}Functional Server Verbose Output:${NC}"
cat "$TEST_DIR/functional-verbose.log" || echo "(empty or missing)"
echo ""

echo -e "${YELLOW}Programmatic Server Verbose Output:${NC}"
cat "$TEST_DIR/programmatic-verbose.log" || echo "(empty or missing)"
echo ""

# ============================================
# Test Summary
# ============================================

echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

# Exit with appropriate code
if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  echo ""
  echo "This means verbose output is now CONSISTENT across all adapters."
  exit 0
else
  echo -e "${RED}Some tests failed!${NC}"
  echo ""
  echo "This is EXPECTED (red test) because verbose output is currently"
  echo "inconsistent across different adapter code paths."
  echo ""
  echo "The verbose flag should show the same level of detail and use"
  echo "consistent prefixes ([RunCommand], [Adapter], etc.) regardless"
  echo "of which API style is detected."
  exit 1
fi
