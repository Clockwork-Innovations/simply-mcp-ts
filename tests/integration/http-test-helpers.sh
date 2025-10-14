#!/bin/bash

# HTTP Transport Test Helpers
# Common utilities for HTTP MCP testing

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ===============================
# HTTP Request Helpers
# ===============================

# Send MCP initialize request
# Usage: send_mcp_initialize <port> [session_id]
send_mcp_initialize() {
  local port=$1
  local session_id=${2:-""}

  if [ -n "$session_id" ]; then
    curl -s -i -X POST "http://localhost:${port}/mcp" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json, text/event-stream" \
      -H "Mcp-Session-Id: $session_id" \
      -d '{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
          "protocolVersion": "2024-11-05",
          "capabilities": {},
          "clientInfo": {
            "name": "test-client",
            "version": "1.0.0"
          }
        }
      }'
  else
    curl -s -i -X POST "http://localhost:${port}/mcp" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json, text/event-stream" \
      -d '{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
          "protocolVersion": "2024-11-05",
          "capabilities": {},
          "clientInfo": {
            "name": "test-client",
            "version": "1.0.0"
          }
        }
      }'
  fi
}

# Send MCP tools/list request
# Usage: send_mcp_tools_list <port> <session_id>
send_mcp_tools_list() {
  local port=$1
  local session_id=$2

  curl -s -X POST "http://localhost:${port}/mcp" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "Mcp-Session-Id: $session_id" \
    -d '{
      "jsonrpc": "2.0",
      "id": 2,
      "method": "tools/list",
      "params": {}
    }'
}

# Send MCP tool call request
# Usage: send_mcp_tool_call <port> <session_id> <tool_name> <params_json>
send_mcp_tool_call() {
  local port=$1
  local session_id=$2
  local tool_name=$3
  local params=$4

  curl -s -X POST "http://localhost:${port}/mcp" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "Mcp-Session-Id: $session_id" \
    -d "{
      \"jsonrpc\": \"2.0\",
      \"id\": 3,
      \"method\": \"tools/call\",
      \"params\": {
        \"name\": \"$tool_name\",
        \"arguments\": $params
      }
    }"
}

# Send DELETE request to terminate session
# Usage: send_mcp_delete <port> <session_id>
send_mcp_delete() {
  local port=$1
  local session_id=$2

  curl -s -i -X DELETE "http://localhost:${port}/mcp" \
    -H "Mcp-Session-Id: $session_id"
}

# Get health check
# Usage: get_health <port>
get_health() {
  local port=$1
  curl -s "http://localhost:${port}/health"
}

# ===============================
# Port Management Helpers
# ===============================

# Check if port is available
# Usage: check_port_available <port>
# Returns: 0 if available, 1 if in use
check_port_available() {
  local port=$1
  ! lsof -i :$port >/dev/null 2>&1
}

# Wait for server to be ready on port
# Usage: wait_for_server <port> [max_wait_seconds]
# Returns: 0 if server ready, 1 if timeout
wait_for_server() {
  local port=$1
  local max_wait=${2:-10}

  for i in $(seq 1 $max_wait); do
    if lsof -i :$port >/dev/null 2>&1; then
      sleep 0.5  # Give it a bit more time to fully initialize
      return 0
    fi
    sleep 1
  done
  return 1
}

# Kill process on port
# Usage: kill_port <port>
kill_port() {
  local port=$1
  local pid=$(lsof -ti :$port 2>/dev/null)

  if [ -n "$pid" ]; then
    kill -9 $pid 2>/dev/null || true
    sleep 1
  fi
}

# ===============================
# Response Parsing Helpers
# ===============================

# Extract session ID from response headers
# Usage: extract_session_id <response_with_headers>
extract_session_id() {
  local response=$1
  echo "$response" | grep -i "^mcp-session-id:" | head -1 | sed 's/^[^:]*: *//' | tr -d '\r\n '
}

# Extract JSON from SSE response
# Usage: extract_sse_json <sse_response>
extract_sse_json() {
  local response=$1
  # Handle both SSE format and plain JSON
  if echo "$response" | grep -q '^data:'; then
    echo "$response" | grep '^data:' | sed 's/^data: //' | head -1
  else
    # Try to extract JSON from response body (after headers)
    echo "$response" | sed -n '/^\r$/,$p' | tail -n +2 | grep '^data:' | sed 's/^data: //' | head -1 || echo "$response"
  fi
}

# Extract HTTP status code from response with headers
# Usage: extract_http_status <response_with_headers>
extract_http_status() {
  local response=$1
  echo "$response" | grep "^HTTP" | head -1 | awk '{print $2}'
}

# ===============================
# Assertion Functions
# ===============================

# Assert HTTP status code
# Usage: assert_http_status <actual> <expected> <message>
# Returns: 0 on pass, 1 on fail
assert_http_status() {
  local actual=$1
  local expected=$2
  local message=$3

  if [ "$actual" -eq "$expected" ] 2>/dev/null; then
    echo -e "  ${GREEN}✅ PASS${NC}: $message (HTTP $actual)"
    return 0
  else
    echo -e "  ${RED}❌ FAIL${NC}: $message (expected HTTP $expected, got $actual)"
    return 1
  fi
}

# Assert header is present
# Usage: assert_header_present <headers> <header_name> <message>
# Returns: 0 on pass, 1 on fail
assert_header_present() {
  local headers=$1
  local header_name=$2
  local message=$3

  if echo "$headers" | grep -i "^${header_name}:" >/dev/null; then
    echo -e "  ${GREEN}✅ PASS${NC}: $message"
    return 0
  else
    echo -e "  ${RED}❌ FAIL${NC}: $message (header $header_name not found)"
    return 1
  fi
}

# Assert JSON field contains value
# Usage: assert_json_contains <json> <jq_filter> <expected> <message>
# Returns: 0 on pass, 1 on fail
assert_json_contains() {
  local json=$1
  local jq_filter=$2
  local expected=$3
  local message=$4

  local actual=$(echo "$json" | jq -r "$jq_filter" 2>/dev/null || echo "")

  if [ "$actual" = "$expected" ]; then
    echo -e "  ${GREEN}✅ PASS${NC}: $message"
    return 0
  else
    echo -e "  ${RED}❌ FAIL${NC}: $message (expected '$expected', got '$actual')"
    return 1
  fi
}

# Assert JSON field exists
# Usage: assert_json_field_exists <json> <jq_filter> <message>
# Returns: 0 on pass, 1 on fail
assert_json_field_exists() {
  local json=$1
  local jq_filter=$2
  local message=$3

  if echo "$json" | jq -e "$jq_filter" >/dev/null 2>&1; then
    echo -e "  ${GREEN}✅ PASS${NC}: $message"
    return 0
  else
    echo -e "  ${RED}❌ FAIL${NC}: $message (field not found: $jq_filter)"
    return 1
  fi
}

# Assert string contains substring
# Usage: assert_contains <string> <substring> <message>
# Returns: 0 on pass, 1 on fail
assert_contains() {
  local string=$1
  local substring=$2
  local message=$3

  if echo "$string" | grep -q "$substring"; then
    echo -e "  ${GREEN}✅ PASS${NC}: $message"
    return 0
  else
    echo -e "  ${RED}❌ FAIL${NC}: $message (substring '$substring' not found)"
    return 1
  fi
}

# Assert process is running
# Usage: assert_process_running <pid> <message>
# Returns: 0 on pass, 1 on fail
assert_process_running() {
  local pid=$1
  local message=$2

  if ps -p $pid >/dev/null 2>&1; then
    echo -e "  ${GREEN}✅ PASS${NC}: $message (PID $pid)"
    return 0
  else
    echo -e "  ${RED}❌ FAIL${NC}: $message (PID $pid not running)"
    return 1
  fi
}

# Assert port is bound
# Usage: assert_port_bound <port> <message>
# Returns: 0 on pass, 1 on fail
assert_port_bound() {
  local port=$1
  local message=$2

  if lsof -i :$port >/dev/null 2>&1; then
    echo -e "  ${GREEN}✅ PASS${NC}: $message (port $port)"
    return 0
  else
    echo -e "  ${RED}❌ FAIL${NC}: $message (port $port not bound)"
    return 1
  fi
}

# ===============================
# Cleanup Helpers
# ===============================

# Kill all test servers
# Usage: cleanup_all_servers
cleanup_all_servers() {
  pkill -f "simply-mcp run" 2>/dev/null || true
  pkill -f "tsx.*server" 2>/dev/null || true
  pkill -f "node.*server" 2>/dev/null || true
  sleep 1
}

# ===============================
# Print Helpers
# ===============================

# Print section header
# Usage: print_section <title>
print_section() {
  local title=$1
  echo ""
  echo -e "${BLUE}=========================================${NC}"
  echo -e "${BLUE}$title${NC}"
  echo -e "${BLUE}=========================================${NC}"
  echo ""
}

# Print test scenario header
# Usage: print_test_header <number> <total> <title>
print_test_header() {
  local number=$1
  local total=$2
  local title=$3
  echo ""
  echo -e "${YELLOW}[$number/$total] $title${NC}"
}

# Print summary
# Usage: print_summary <passed> <failed> <duration>
print_summary() {
  local passed=$1
  local failed=$2
  local duration=$3
  local total=$((passed + failed))

  echo ""
  echo -e "${BLUE}=========================================${NC}"
  echo -e "${BLUE}Test Summary${NC}"
  echo -e "${BLUE}=========================================${NC}"
  echo "Total: $total scenarios"
  echo -e "Passed: ${GREEN}$passed${NC}"
  echo -e "Failed: ${RED}$failed${NC}"
  echo "Duration: ${duration}s"

  if [ $failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
  else
    echo ""
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
  fi
}
