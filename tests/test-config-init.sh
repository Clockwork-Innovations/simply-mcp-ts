#!/usr/bin/env bash

# Test for config init UX issue
# Tests that `simplymcp config init` generates a config file that passes validation
#
# Issue: `simplymcp config init` generates a config file that immediately fails
# validation because it references a non-existent file `./src/my-server.ts`.
#
# Expected behavior: The generated config should either:
# 1. Pass validation with warnings about missing files, OR
# 2. Generate placeholder files, OR
# 3. Use example paths that don't trigger validation errors
#
# Current behavior (RED TEST): Validation FAILS with errors about missing entry files

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
echo "Testing Config Init UX"
echo "========================================="
echo ""

# ============================================
# Test: Config init generates valid config
# ============================================

echo -e "${BLUE}Testing config init command...${NC}"
echo ""

# Create temporary test directory
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

echo "Test directory: $TEST_DIR"
echo ""

# Set up a minimal package.json and link to simply-mcp for validation to work
echo "Setting up test environment..."
cat > package.json << 'EOF'
{
  "name": "test-project",
  "version": "1.0.0",
  "type": "module"
}
EOF

# Create node_modules and link simply-mcp
mkdir -p node_modules
ln -s "$MCP_ROOT" node_modules/simply-mcp

echo ""

# Test 1: Run config init
echo "Test 1: Running 'simplymcp config init'"
if node "$CLI_PATH" config init > /tmp/config-init-output.log 2>&1; then
  print_result "Config init creates config file" "PASS"
else
  print_result "Config init creates config file" "FAIL" "Config init command failed"
  cat /tmp/config-init-output.log
  exit 1
fi

echo ""

# Test 2: Verify config file exists
echo "Test 2: Verify config file was created"
if [ -f "simplymcp.config.ts" ]; then
  print_result "Config file exists" "PASS"
  echo ""
  echo "Generated config content:"
  echo "---"
  cat simplymcp.config.ts
  echo "---"
else
  print_result "Config file exists" "FAIL" "simplymcp.config.ts not found"
  exit 1
fi

echo ""

# Test 3: Run config validate (THIS IS THE RED TEST - EXPECTED TO FAIL)
echo "Test 3: Running 'simplymcp config validate'"
echo -e "${YELLOW}NOTE: This test is EXPECTED to PASS but will FAIL (red test)${NC}"
echo ""

if node "$CLI_PATH" config validate > /tmp/config-validate-output.log 2>&1; then
  # Validation passed - this is what we WANT
  print_result "Generated config passes validation" "PASS"
  echo ""
  echo "Validation output:"
  cat /tmp/config-validate-output.log
else
  # Validation failed - this is the BUG we're testing for
  print_result "Generated config passes validation" "FAIL" "Config validation failed (THIS IS THE BUG)"
  echo ""
  echo -e "${RED}Validation errors:${NC}"
  cat /tmp/config-validate-output.log
  echo ""
  echo -e "${YELLOW}This is a RED TEST - the test fails because of the bug.${NC}"
  echo -e "${YELLOW}Fix: config init should generate a config that passes validation${NC}"
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
rm -f /tmp/config-init-output.log /tmp/config-validate-output.log

# Exit with appropriate code
if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed! (Expected for red test)${NC}"
  exit 1
fi
