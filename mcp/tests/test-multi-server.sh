#!/bin/bash
# Test script for multi-server functionality
# Tests: run multiple servers, list, stop

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test result tracking
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# CLI command
CLI="node $PROJECT_ROOT/dist/mcp/cli/index.js"

# Test servers
SERVER1="$PROJECT_ROOT/mcp/examples/class-minimal.ts"
SERVER2="$PROJECT_ROOT/mcp/examples/class-basic.ts"
SERVER3="$PROJECT_ROOT/mcp/examples/single-file-basic.ts"

# Cleanup function
cleanup() {
  echo -e "${YELLOW}Cleaning up test servers...${NC}"

  # Stop all servers
  $CLI stop all 2>/dev/null || true

  # Wait a bit
  sleep 1

  # Force cleanup any remaining processes
  pkill -f "simplymcp run" 2>/dev/null || true

  echo -e "${GREEN}Cleanup complete${NC}"
}

# Set trap for cleanup on exit
trap cleanup EXIT

# Helper functions
pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
  ((TESTS_PASSED++))
  ((TESTS_RUN++))
}

fail() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  ((TESTS_FAILED++))
  ((TESTS_RUN++))
}

info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

section() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

# Start of tests
section "Multi-Server Test Suite"

# Initial cleanup
cleanup

# Test 1: List with no servers
section "Test 1: List command with no servers"
OUTPUT=$($CLI list 2>&1)
if echo "$OUTPUT" | grep -q "No MCP servers currently running"; then
  pass "List shows no servers when none running"
else
  fail "List should show 'no servers' message"
  echo "$OUTPUT"
fi

# Test 2: Run single server in HTTP mode
section "Test 2: Run single server"
info "Starting single server on port 3000..."

# Start server in background
$CLI run "$SERVER1" --http --port 3000 > /tmp/server1.log 2>&1 &
SERVER1_PID=$!

# Wait for server to start
sleep 2

# Check if server is in the list
OUTPUT=$($CLI list 2>&1)
if echo "$OUTPUT" | grep -q "HTTP.*3000"; then
  pass "Single server appears in list with HTTP transport"
else
  fail "Single server should appear in list"
  echo "$OUTPUT"
fi

# Stop the server
info "Stopping server..."
$CLI stop all 2>&1 > /dev/null
sleep 1

# Verify server stopped
OUTPUT=$($CLI list 2>&1)
if echo "$OUTPUT" | grep -q "No MCP servers currently running"; then
  pass "Server successfully stopped"
else
  fail "Server should be stopped"
  echo "$OUTPUT"
fi

# Test 3: Multi-server run (3 servers)
section "Test 3: Run multiple servers simultaneously"
info "Starting 3 servers on ports 3000, 3001, 3002..."

# Start multi-server in background
$CLI run "$SERVER1" "$SERVER2" "$SERVER3" --http --port 3000 > /tmp/multi-server.log 2>&1 &
MULTI_PID=$!

# Wait for servers to start
sleep 3

# Check if all servers are in the list
OUTPUT=$($CLI list 2>&1)

if echo "$OUTPUT" | grep -q "Total: 3 running"; then
  pass "All 3 servers running"
else
  fail "Should have 3 servers running"
  echo "$OUTPUT"
fi

# Check ports
if echo "$OUTPUT" | grep -q ":3000" && echo "$OUTPUT" | grep -q ":3001" && echo "$OUTPUT" | grep -q ":3002"; then
  pass "Servers running on correct ports (3000, 3001, 3002)"
else
  fail "Servers should be on ports 3000, 3001, 3002"
  echo "$OUTPUT"
fi

# Test 4: List with verbose flag
section "Test 4: List with verbose output"
OUTPUT=$($CLI list --verbose 2>&1)

if echo "$OUTPUT" | grep -q "Path:"; then
  pass "Verbose list shows additional details"
else
  fail "Verbose list should show file paths"
  echo "$OUTPUT"
fi

# Test 5: JSON output
section "Test 5: List with JSON output"
OUTPUT=$($CLI list --json 2>&1)

if echo "$OUTPUT" | grep -q '"pid"' && echo "$OUTPUT" | grep -q '"transport"'; then
  pass "JSON output contains expected fields"
else
  fail "JSON output should contain pid and transport fields"
  echo "$OUTPUT"
fi

# Test 6: Stop by name pattern
section "Test 6: Stop server by name"
info "Stopping servers matching 'class-minimal'..."

$CLI stop class-minimal 2>&1 > /dev/null
sleep 1

OUTPUT=$($CLI list 2>&1)
if echo "$OUTPUT" | grep -q "Total: 2 running"; then
  pass "Successfully stopped 1 server by name"
else
  fail "Should have 2 servers remaining"
  echo "$OUTPUT"
fi

# Test 7: Stop all remaining servers
section "Test 7: Stop all servers"
info "Stopping all remaining servers..."

SIMPLYMCP_AUTO_CONFIRM=true $CLI stop all 2>&1 > /dev/null
sleep 1

OUTPUT=$($CLI list 2>&1)
if echo "$OUTPUT" | grep -q "No MCP servers currently running"; then
  pass "All servers stopped successfully"
else
  fail "All servers should be stopped"
  echo "$OUTPUT"
fi

# Test 8: Error handling - stdio conflict
section "Test 8: Error handling - multiple servers with stdio"
info "Attempting to run multiple servers with stdio transport (should fail)..."

OUTPUT=$($CLI run "$SERVER1" "$SERVER2" 2>&1 || true)
if echo "$OUTPUT" | grep -q "Cannot run multiple servers with stdio transport"; then
  pass "Correctly prevents multiple stdio servers"
else
  fail "Should show error for multiple stdio servers"
  echo "$OUTPUT"
fi

# Test 9: Cleanup dead servers
section "Test 9: Cleanup dead servers"
info "Starting server and killing process directly..."

$CLI run "$SERVER1" --http --port 3000 > /tmp/cleanup-test.log 2>&1 &
sleep 2

# Get the actual server PID from the list
SERVER_PID=$(node -e "
const fs = require('fs');
const path = require('path');
const os = require('os');
const registryPath = path.join(os.tmpdir(), 'simplymcp', 'servers.json');
if (fs.existsSync(registryPath)) {
  const data = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  if (data.servers && data.servers.length > 0) {
    console.log(data.servers[0].pid);
  }
}
")

if [ -n "$SERVER_PID" ]; then
  info "Found server PID: $SERVER_PID"
  kill -9 "$SERVER_PID" 2>/dev/null || true
  sleep 1

  # List should show dead server
  OUTPUT=$($CLI list 2>&1)
  if echo "$OUTPUT" | grep -q "dead server"; then
    info "Dead server detected in registry"

    # Cleanup
    $CLI list --cleanup 2>&1 > /dev/null

    OUTPUT=$($CLI list 2>&1)
    if echo "$OUTPUT" | grep -q "No MCP servers currently running"; then
      pass "Dead servers cleaned up successfully"
    else
      fail "Cleanup should remove dead servers"
      echo "$OUTPUT"
    fi
  else
    fail "Should detect dead server in registry"
    echo "$OUTPUT"
  fi
else
  fail "Could not find server PID for cleanup test"
fi

# Final cleanup
cleanup

# Summary
section "Test Summary"
echo -e "Tests run:    ${TESTS_RUN}"
echo -e "Tests passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
