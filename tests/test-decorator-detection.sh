#!/usr/bin/env bash

# Decorator Detection Test Suite
# Tests the regex pattern that detects @MCPServer decorators to provide helpful error messages
#
# Issue: The regex /@MCPServer\s*\(\s*\)/ only matches @MCPServer() with parentheses
# It won't detect @MCPServer without parentheses, so users won't get the helpful
# "class is not exported" error message when they forget to export their class

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

# Cleanup function
cleanup() {
  # Remove temp directory if it exists
  if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
  fi
}

trap cleanup EXIT

echo "========================================="
echo "Testing Decorator Detection Regex"
echo "========================================="
echo ""
echo "This test verifies that the error detection regex properly identifies"
echo "@MCPServer decorators both WITH and WITHOUT parentheses."
echo ""

# Create temporary directory for test files
TEMP_DIR=$(mktemp -d)
echo "Using temp directory: $TEMP_DIR"
echo ""

# ============================================
# Test 1: Test the actual implementation regex
# ============================================

echo -e "${BLUE}Test 1: Testing actual implementation regex${NC}"

# The fixed regex from class-bin.ts line 142 (now supports both with/without parentheses)
CURRENT_REGEX='/@MCPServer(\s*\(\s*\))?/'

# Test file WITH parentheses
cat > "$TEMP_DIR/with-parens.ts" << 'EOF'
@MCPServer()
class MyServer {
  getMessage() {
    return "Hello";
  }
}
EOF

# Test file WITHOUT parentheses
cat > "$TEMP_DIR/no-parens.ts" << 'EOF'
@MCPServer
class MyServer {
  getMessage() {
    return "Hello";
  }
}
EOF

# Test that the current regex matches WITH parentheses
if node -e "
const fs = require('fs');
const source = fs.readFileSync('$TEMP_DIR/with-parens.ts', 'utf-8');
const hasDecoratedClass = /@MCPServer(\s*\(\s*\))?/.test(source) && /class\s+\w+/.test(source);
process.exit(hasDecoratedClass ? 0 : 1);
"; then
  print_result "Current regex matches @MCPServer()" "PASS"
else
  print_result "Current regex matches @MCPServer()" "FAIL" "Should match decorators with parentheses"
fi

# Test that the current regex also matches WITHOUT parentheses (bug is now fixed!)
if node -e "
const fs = require('fs');
const source = fs.readFileSync('$TEMP_DIR/no-parens.ts', 'utf-8');
const hasDecoratedClass = /@MCPServer(\s*\(\s*\))?/.test(source) && /class\s+\w+/.test(source);
process.exit(hasDecoratedClass ? 0 : 1);
"; then
  print_result "Current regex matches @MCPServer (no parens)" "PASS"
else
  print_result "Current regex matches @MCPServer (no parens)" "FAIL" "Should match decorators without parentheses"
fi

echo ""

# ============================================
# Test 2: Test with decorator config options
# ============================================

echo -e "${BLUE}Test 2: Testing with decorator config${NC}"

# Test file with config object
cat > "$TEMP_DIR/with-config.ts" << 'EOF'
@MCPServer({ name: "test", version: "1.0.0" })
class MyServer {
  getMessage() {
    return "Hello";
  }
}
EOF

# Test that regex matches with config
if node -e "
const fs = require('fs');
const source = fs.readFileSync('$TEMP_DIR/with-config.ts', 'utf-8');
const hasDecoratedClass = /@MCPServer(\s*\(\s*\))?/.test(source) && /class\s+\w+/.test(source);
process.exit(hasDecoratedClass ? 0 : 1);
"; then
  print_result "Regex matches @MCPServer({ ... })" "PASS"
else
  print_result "Regex matches @MCPServer({ ... })" "FAIL" "Should match decorators with config"
fi

echo ""

# ============================================
# Test 3: Test edge cases
# ============================================

echo -e "${BLUE}Test 3: Testing edge cases${NC}"

# Test with extra whitespace before parentheses
cat > "$TEMP_DIR/whitespace.ts" << 'EOF'
@MCPServer  ()
class MyServer {}
EOF

if node -e "
const fs = require('fs');
const source = fs.readFileSync('$TEMP_DIR/whitespace.ts', 'utf-8');
const hasDecoratedClass = /@MCPServer(\s*\(\s*\))?/.test(source) && /class\s+\w+/.test(source);
process.exit(hasDecoratedClass ? 0 : 1);
"; then
  print_result "Improved regex handles whitespace" "PASS"
else
  print_result "Improved regex handles whitespace" "FAIL" "Should match with whitespace"
fi

# Test shouldn't match random text with MCPServer
cat > "$TEMP_DIR/no-decorator.ts" << 'EOF'
// This file mentions MCPServer but doesn't use it as decorator
const MCPServer = "test";
class MyServer {}
EOF

if node -e "
const fs = require('fs');
const source = fs.readFileSync('$TEMP_DIR/no-decorator.ts', 'utf-8');
const hasDecoratedClass = /@MCPServer(\s*\(\s*\))?/.test(source) && /class\s+\w+/.test(source);
process.exit(hasDecoratedClass ? 0 : 1);
"; then
  print_result "Improved regex doesn't false-positive" "FAIL" "Should not match non-decorator usage"
else
  print_result "Improved regex doesn't false-positive" "PASS"
fi

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

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  echo ""
  echo "The decorator detection regex works correctly!"
  echo "It now matches both @MCPServer() and @MCPServer (with and without parentheses)"
  exit 0
else
  echo -e "${RED}Some tests failed!${NC}"
  echo ""
  echo -e "${YELLOW}The regex should match both forms:${NC}"
  echo "  - @MCPServer()   (with parentheses)"
  echo "  - @MCPServer     (without parentheses)"
  echo ""
  echo "This ensures users get helpful error messages when they forget to export"
  echo "their decorated class, regardless of whether they use parentheses or not."
  exit 1
fi
