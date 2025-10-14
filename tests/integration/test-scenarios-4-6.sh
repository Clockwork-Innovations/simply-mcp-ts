#!/bin/bash

#############################################################################
# Quick Test for Scenarios #4 and #6
# Tests the fixed scenarios for missing session and session termination
#############################################################################

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source helper functions
source "$SCRIPT_DIR/http-test-helpers.sh"

# Configuration
PACKAGE_PATH="/mnt/Shared/cs-projects/simple-mcp/simply-mcp-2.5.0-beta.3.tgz"
TEST_DIR="/tmp/http-test-quick-$$"
SERVER_PID=""

# Test tracking
TESTS_PASSED=0
TESTS_FAILED=0

#############################################################################
# Setup and Cleanup
#############################################################################

setup() {
  echo "Setting up test environment..."

  # Clean any existing test directory
  rm -rf "$TEST_DIR" 2>/dev/null || true

  # Create test workspace
  mkdir -p "$TEST_DIR/servers"
  cd "$TEST_DIR"

  # Install package
  npm install "$PACKAGE_PATH" --silent 2>/dev/null || {
    echo -e "${RED}Failed to install package${NC}"
    exit 1
  }

  # Copy test server
  cp "$SCRIPT_DIR"/http-decorator-server.ts servers/

  echo -e "${GREEN}Setup complete${NC}"
  echo ""
}

cleanup() {
  echo ""
  echo "Cleaning up..."

  # Kill server if running
  if [ -n "$SERVER_PID" ] && ps -p $SERVER_PID >/dev/null 2>&1; then
    kill $SERVER_PID 2>/dev/null || true
  fi

  # Kill any other test servers
  pkill -f "simply-mcp run" 2>/dev/null || true
  sleep 1

  # Clean up test directory
  cd /tmp
  rm -rf "$TEST_DIR" 2>/dev/null || true

  echo "Cleanup complete"
}

trap cleanup EXIT

#############################################################################
# Test Scenario #4 - Request Without Session ID
#############################################################################

test_scenario_4() {
  echo ""
  echo -e "${YELLOW}[1/2] Scenario #4: HTTP Stateful - Request Without Session ID${NC}"
  echo ""

  # Start server
  npx simply-mcp run servers/http-decorator-server.ts --http --port 3100 > /tmp/server-test.log 2>&1 &
  SERVER_PID=$!

  # Wait for server
  if ! wait_for_server 3100 10; then
    echo -e "  ${RED}❌ FAIL${NC}: Server failed to start"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return
  fi

  echo -e "  ${BLUE}ℹ${NC}  Server started (PID: $SERVER_PID)"

  # Send tools/list WITHOUT session ID (should fail with 401)
  local response=$(curl -s -i --max-time 10 -X POST http://localhost:3100/mcp \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":4,"method":"tools/list","params":{}}')

  # Extract HTTP status and body
  local http_status=$(extract_http_status "$response")
  local body=$(echo "$response" | sed -n '/^\r$/,$p' | tail -n +2)

  echo -e "  ${BLUE}ℹ${NC}  HTTP Status: $http_status"
  echo -e "  ${BLUE}ℹ${NC}  Response Body: $body"

  # Check HTTP status code (should be 401 Unauthorized)
  if [ "$http_status" = "401" ]; then
    echo -e "  ${GREEN}✅ PASS${NC}: Returns HTTP 401 Unauthorized for missing session ID"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "  ${RED}❌ FAIL${NC}: Expected HTTP 401, got $http_status"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi

  # Check error message in response body
  if echo "$body" | grep -qi "mcp-session-id.*required\|session.*required"; then
    echo -e "  ${GREEN}✅ PASS${NC}: Error message mentions session ID requirement"
  else
    echo -e "  ${YELLOW}⚠ INFO${NC}: Response format differs (but HTTP 401 is correct)"
  fi

  echo ""
  echo -e "[1/2] ${GREEN}Scenario #4 Complete${NC}"
}

#############################################################################
# Test Scenario #6 - Session Termination
#############################################################################

test_scenario_6() {
  echo ""
  echo -e "${YELLOW}[2/2] Scenario #6: HTTP Stateful - Session Termination${NC}"
  echo ""

  # Initialize a new session
  echo -e "  ${BLUE}ℹ${NC}  Initializing new session..."
  local init_response=$(send_mcp_initialize 3100)
  local session_id=$(extract_session_id "$init_response")

  if [ -z "$session_id" ]; then
    echo -e "  ${RED}❌ FAIL${NC}: Could not initialize session"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return
  fi

  echo -e "  ${BLUE}ℹ${NC}  Session ID: $session_id"

  # Send DELETE request to terminate session
  local delete_response=$(send_mcp_delete 3100 "$session_id")
  local http_status=$(extract_http_status "$delete_response")

  echo -e "  ${BLUE}ℹ${NC}  DELETE HTTP Status: $http_status"

  # Should return 200 or 204
  if [ "$http_status" -eq 200 ] || [ "$http_status" -eq 204 ]; then
    echo -e "  ${GREEN}✅ PASS${NC}: DELETE returns HTTP $http_status"
  else
    echo -e "  ${RED}❌ FAIL${NC}: Expected HTTP 200 or 204, got $http_status"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi

  # Brief pause to ensure session cleanup completes
  sleep 1

  # Try to use terminated session (should fail with 400 or 401)
  echo -e "  ${BLUE}ℹ${NC}  Attempting to reuse terminated session..."
  local reuse_response=$(curl -s -i --max-time 10 -X POST http://localhost:3100/mcp \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "Mcp-Session-Id: $session_id" \
    -d '{"jsonrpc":"2.0","id":5,"method":"tools/list","params":{}}')

  local reuse_status=$(extract_http_status "$reuse_response")
  local reuse_body=$(echo "$reuse_response" | sed -n '/^\r$/,$p' | tail -n +2)

  echo -e "  ${BLUE}ℹ${NC}  Reuse HTTP Status: $reuse_status"
  echo -e "  ${BLUE}ℹ${NC}  Reuse Response: $reuse_body"

  # Check if terminated session is properly rejected (400 or 401)
  if [ "$reuse_status" = "400" ] || [ "$reuse_status" = "401" ]; then
    echo -e "  ${GREEN}✅ PASS${NC}: Terminated session properly rejected with HTTP $reuse_status"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "  ${RED}❌ FAIL${NC}: Expected HTTP 400 or 401 for terminated session, got $reuse_status"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi

  echo ""
  echo -e "[2/2] ${GREEN}Scenario #6 Complete${NC}"
}

#############################################################################
# Main Execution
#############################################################################

main() {
  print_section "Quick Test: Scenarios #4 and #6"
  echo "Package: simply-mcp-2.5.0-beta.3"
  echo "Date: $(date)"
  echo ""

  setup

  test_scenario_4
  test_scenario_6

  # Print summary
  echo ""
  echo -e "${BLUE}=========================================${NC}"
  echo -e "${BLUE}Test Summary${NC}"
  echo -e "${BLUE}=========================================${NC}"
  echo "Total: 2 scenarios"
  echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
  echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

  if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
    exit 0
  else
    echo ""
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    exit 1
  fi
}

# Run main
main "$@"
