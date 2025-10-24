#!/usr/bin/env bash

# Server Discovery UX Test
# Tests that `simplymcp run` without arguments provides helpful output
#
# Issue: When running `simplymcp run` without arguments and no config file exists,
# there's no helpful output. It just shows usage information. Users would benefit from:
# - Seeing available servers in the current config (if exists)
# - Seeing files in the current directory that look like MCP servers
# - Getting a helpful quick-start message
#
# Expected behavior: The command should provide helpful discovery output
#
# Current behavior (RED TEST): Just shows generic usage information

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CLI_PATH="$MCP_ROOT/dist/src/cli/index.js"

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

# Cleanup function
cleanup() {
  if [ -n "$TEST_DIR" ] && [ -d "$TEST_DIR" ]; then
    rm -rf "$TEST_DIR"
  fi
}

trap cleanup EXIT

echo "========================================="
echo "Testing Server Discovery UX"
echo "========================================="
echo ""

# ============================================
# Scenario A: With config file
# ============================================

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Scenario A: With Config File${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Create temporary test directory for Scenario A
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

echo "Test directory: $TEST_DIR"
echo ""

# Create a simplymcp.config.ts with 2 servers
echo "Setting up config file with 2 servers..."
cat > simplymcp.config.ts << 'EOF'
import { defineConfig } from 'simply-mcp';

export default defineConfig({
  servers: {
    'weather-server': {
      entry: './servers/weather.ts',
      transport: 'stdio'
    },
    'database-server': {
      entry: './servers/database.ts',
      transport: { port: 3000 }
    }
  }
});
EOF

echo "Created simplymcp.config.ts"
echo ""

# Test A.1: Run `simplymcp run` with no arguments
echo "Test A.1: Running 'simplymcp run' with no arguments (config exists)"
echo -e "${YELLOW}EXPECT: Should list available servers from config${NC}"
echo -e "${YELLOW}ACTUAL: Will show generic usage (THIS IS THE BUG)${NC}"
echo ""

if node "$CLI_PATH" run > /tmp/discovery-test-a1.log 2>&1; then
  print_result "Command exits cleanly" "FAIL" "Should exit with error code when no args provided"
else
  # Command failed (expected because file arg is required)
  # Now check if output is helpful

  echo "Command output:"
  echo "---"
  cat /tmp/discovery-test-a1.log
  echo "---"
  echo ""

  # Check if output mentions available servers from config
  if grep -qi "weather-server" /tmp/discovery-test-a1.log || \
     grep -qi "database-server" /tmp/discovery-test-a1.log || \
     grep -qi "available server" /tmp/discovery-test-a1.log; then
    print_result "Output shows available servers from config" "PASS"
  else
    print_result "Output shows available servers from config" "FAIL" "No server discovery info (RED TEST)"
    echo -e "${YELLOW}Output should include available servers from config${NC}"
  fi
fi

echo ""

# ============================================
# Scenario B: Without config file
# ============================================

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Scenario B: Without Config File${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Create new temporary test directory for Scenario B
cd /tmp
rm -rf "$TEST_DIR"
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

echo "Test directory: $TEST_DIR"
echo ""

# Create some .ts/.js files that look like MCP servers
echo "Creating potential MCP server files..."

# Create a decorator-style server
cat > weather-server.ts << 'EOF'
import { MCPServer, Tool } from 'simply-mcp';

@MCPServer()
export default class WeatherServer {
  @Tool({
    description: "Get current weather"
  })
  async getWeather(city: string) {
    return { temperature: 72 };
  }
}
EOF

# Create a functional-style server
cat > database-server.ts << 'EOF'
import { defineMCP } from 'simply-mcp';

export default defineMCP({
  name: "database-server",
  version: "1.0.0",
  tools: []
});
EOF

# Create a regular TypeScript file (not a server)
cat > utils.ts << 'EOF'
export function helper() {
  return "not a server";
}
EOF

echo "Created weather-server.ts (decorator style)"
echo "Created database-server.ts (functional style)"
echo "Created utils.ts (not a server)"
echo ""

# Test B.1: Run `simplymcp run` with no arguments and no config
echo "Test B.1: Running 'simplymcp run' with no arguments (no config)"
echo -e "${YELLOW}EXPECT: Should suggest potential server files or show quick-start${NC}"
echo -e "${YELLOW}ACTUAL: Will show generic usage (THIS IS THE BUG)${NC}"
echo ""

if node "$CLI_PATH" run > /tmp/discovery-test-b1.log 2>&1; then
  print_result "Command exits cleanly" "FAIL" "Should exit with error code when no args provided"
else
  # Command failed (expected because file arg is required)
  # Now check if output is helpful

  echo "Command output:"
  echo "---"
  cat /tmp/discovery-test-b1.log
  echo "---"
  echo ""

  # Check if output mentions potential server files or provides helpful guidance
  if grep -qi "weather-server.ts" /tmp/discovery-test-b1.log || \
     grep -qi "database-server.ts" /tmp/discovery-test-b1.log || \
     grep -qi "found.*server" /tmp/discovery-test-b1.log || \
     grep -qi "quick.*start" /tmp/discovery-test-b1.log || \
     grep -qi "potential.*server" /tmp/discovery-test-b1.log; then
    print_result "Output shows server discovery or quick-start help" "PASS"
  else
    print_result "Output shows server discovery or quick-start help" "FAIL" "No helpful discovery info (RED TEST)"
    echo -e "${YELLOW}Output should suggest potential server files or provide quick-start guidance${NC}"
  fi
fi

echo ""

# Test B.2: Verify the files we created look like servers
echo "Test B.2: Sanity check - verify our test files look like MCP servers"

# Check decorator file
if grep -q "@MCPServer" weather-server.ts; then
  print_result "weather-server.ts has @MCPServer decorator" "PASS"
else
  print_result "weather-server.ts has @MCPServer decorator" "FAIL" "Test setup broken"
fi

# Check functional file
if grep -q "defineMCP" database-server.ts; then
  print_result "database-server.ts has defineMCP" "PASS"
else
  print_result "database-server.ts has defineMCP" "FAIL" "Test setup broken"
fi

# Check that utils.ts doesn't look like a server
if ! grep -q "@MCPServer\|defineMCP" utils.ts; then
  print_result "utils.ts is not a server file" "PASS"
else
  print_result "utils.ts is not a server file" "FAIL" "Test setup broken"
fi

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
rm -f /tmp/discovery-test-a1.log /tmp/discovery-test-b1.log

# Exit with appropriate code
if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  echo -e "${GREEN}The server discovery UX is working as expected!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed! (Expected for red test)${NC}"
  echo ""
  echo -e "${YELLOW}=========================================${NC}"
  echo -e "${YELLOW}RED TEST EXPLANATION${NC}"
  echo -e "${YELLOW}=========================================${NC}"
  echo ""
  echo -e "${YELLOW}This test is EXPECTED to fail because the feature doesn't exist yet.${NC}"
  echo ""
  echo -e "${YELLOW}Current behavior:${NC}"
  echo "  - 'simplymcp run' without arguments just shows usage info"
  echo ""
  echo -e "${YELLOW}Desired behavior:${NC}"
  echo "  Scenario A (with config):"
  echo "    - List available servers from simplymcp.config.ts"
  echo "    - Suggest: 'Run a specific server with: simplymcp run <server-name>'"
  echo ""
  echo "  Scenario B (without config):"
  echo "    - Scan current directory for potential MCP server files"
  echo "    - List files with @MCPServer or defineMCP patterns"
  echo "    - Provide quick-start message"
  echo ""
  exit 1
fi
