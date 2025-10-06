#!/usr/bin/env bash

# Test for bundle format UX issue
# Tests that bundling MCP servers with top-level await works with default options
#
# Issue: Default bundle format is 'single-file' which uses CJS, but modern MCP servers
# use top-level await (like `await server.start()`) which requires ESM.
# Users get this error:
#   ERROR: Top-level await is currently not supported with the "cjs" output format
#
# Expected behavior: The bundle command should succeed with default options when
# the server uses top-level await (either by defaulting to ESM or auto-detecting).
#
# Current behavior (RED TEST): Bundle FAILS with top-level await error because
# default format uses CJS

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
echo "Testing Bundle Format UX"
echo "========================================="
echo ""

# ============================================
# Test: Bundle with top-level await
# ============================================

echo -e "${BLUE}Testing bundle command with top-level await...${NC}"
echo ""

# Create temporary test directory
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

echo "Test directory: $TEST_DIR"
echo ""

# Set up a minimal package.json
echo "Setting up test environment..."
cat > package.json << 'EOF'
{
  "name": "test-bundle-format",
  "version": "1.0.0",
  "type": "module"
}
EOF

# Create node_modules and link simply-mcp
mkdir -p node_modules
ln -s "$MCP_ROOT" node_modules/simply-mcp

# Link zod as it's a peer dependency
if [ -d "$MCP_ROOT/node_modules/zod" ]; then
  ln -s "$MCP_ROOT/node_modules/zod" node_modules/zod
fi

echo ""

# Test 1: Create a simple MCP server with top-level await
echo "Test 1: Creating MCP server with top-level await"
cat > server.ts << 'EOF'
import { SimplyMCP } from 'simply-mcp';
import { z } from 'zod';

// Create a simple MCP server
const server = new SimplyMCP({
  name: 'test-server',
  version: '1.0.0',
});

// Add a simple tool
server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({
    name: z.string().describe('Name to greet'),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}!`;
  },
});

// Use top-level await (requires ESM)
await server.start({ transport: 'stdio' });

console.error('Server started successfully');
EOF

echo "Created server.ts with top-level await"
echo ""
echo "Server content:"
echo "---"
cat server.ts
echo "---"
echo ""

# Test 2: Run bundle command with DEFAULT options (no -f flag)
echo "Test 2: Bundling server.ts with DEFAULT options (no -f flag)"
echo -e "${YELLOW}NOTE: This test is EXPECTED to PASS but will FAIL (red test)${NC}"
echo ""

# Run bundle command and capture output
if node "$CLI_PATH" bundle server.ts -o dist/bundle.js > /tmp/bundle-format-output.log 2>&1; then
  # Bundle succeeded - this is what we WANT
  print_result "Bundle with top-level await succeeds (default options)" "PASS"
  echo ""
  echo "Bundle output:"
  cat /tmp/bundle-format-output.log
  echo ""

  # Verify the bundled file exists
  if [ -f "dist/bundle.js" ]; then
    echo "Bundled file created: dist/bundle.js"
    echo "File size: $(wc -c < dist/bundle.js) bytes"
  fi
else
  # Bundle failed - this is the BUG we're testing for
  print_result "Bundle with top-level await succeeds (default options)" "FAIL" "Bundle failed with default options (THIS IS THE BUG)"
  echo ""
  echo -e "${RED}Bundle errors:${NC}"
  cat /tmp/bundle-format-output.log
  echo ""
  echo -e "${YELLOW}This is a RED TEST - the test fails because of the bug.${NC}"
  echo -e "${YELLOW}The issue: Default format 'single-file' uses CJS, but top-level await requires ESM${NC}"
  echo ""
  echo -e "${BLUE}Workaround: Use '-f esm' flag to explicitly specify ESM format${NC}"

  # Show that the workaround works
  echo ""
  echo "Demonstrating workaround with '-f esm' flag..."
  if node "$CLI_PATH" bundle server.ts -o dist/bundle-esm.js -f esm > /tmp/bundle-format-esm.log 2>&1; then
    echo -e "${GREEN}✓ Bundle succeeds with '-f esm' flag (workaround works)${NC}"
    echo ""
    cat /tmp/bundle-format-esm.log
  else
    echo -e "${RED}✗ Bundle fails even with '-f esm' flag${NC}"
    cat /tmp/bundle-format-esm.log
  fi
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
rm -f /tmp/bundle-format-output.log /tmp/bundle-format-esm.log

# Exit with appropriate code
if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed! (Expected for red test)${NC}"
  echo ""
  echo -e "${YELLOW}Fix suggestion:${NC}"
  echo "- Change default bundle format from 'single-file' (CJS) to 'esm'"
  echo "- OR auto-detect ESM when top-level await is present"
  echo "- OR default to ESM for modern Node.js versions (18+)"
  exit 1
fi
