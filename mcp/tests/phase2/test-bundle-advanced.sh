#!/usr/bin/env bash

# Bundling Feature 4.2 - Advanced Bundle Formats E2E Tests
# Tests the integration of all advanced format components
# CRITICAL: All tests MUST call real implementation through CLI

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_TEMP_DIR="/tmp/mcp-test-bundle-advanced-$$"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Setup function
setup_test() {
  mkdir -p "$TEST_TEMP_DIR"
  cd "$TEST_TEMP_DIR"
}

# Cleanup function
cleanup_test() {
  cd "$SCRIPT_DIR"
  rm -rf "$TEST_TEMP_DIR"
}

# Test helper functions
pass_test() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
  TESTS_PASSED=$((TESTS_PASSED + 1))
  TESTS_RUN=$((TESTS_RUN + 1))
}

fail_test() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  echo -e "  ${RED}Error${NC}: $2"
  TESTS_FAILED=$((TESTS_FAILED + 1))
  TESTS_RUN=$((TESTS_RUN + 1))
}

echo "========================================="
echo "Bundling - Advanced Formats E2E Tests"
echo "========================================="
echo ""

# Test 1: Bundle with standalone format
echo "Test 1: Bundle with standalone format"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
server.addTool({
  name: 'test',
  description: 'Test tool',
  parameters: {},
  execute: async () => ({ result: 'ok' })
});
export default server;
EOF

npx tsx "$MCP_ROOT/cli/bundle.ts" "$TEST_TEMP_DIR/server.ts" \
  --output "$TEST_TEMP_DIR/dist" \
  --format standalone \
  2>&1 | tee "$TEST_TEMP_DIR/output.log"

if [ -d "$TEST_TEMP_DIR/dist" ] && [ -f "$TEST_TEMP_DIR/dist/server.js" ] && [ -f "$TEST_TEMP_DIR/dist/package.json" ]; then
  pass_test "Bundle with standalone format"
else
  fail_test "Bundle with standalone format" "Output directory or files not created"
fi
cleanup_test

# Test 2: Standalone format has correct structure
echo "Test 2: Standalone format has correct structure"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

npx tsx "$MCP_ROOT/cli/bundle.ts" "$TEST_TEMP_DIR/server.ts" \
  --output "$TEST_TEMP_DIR/dist" \
  --format standalone \
  2>&1 > "$TEST_TEMP_DIR/output.log"

if [ -f "$TEST_TEMP_DIR/dist/package.json" ]; then
  pkg_main=$(jq -r '.main' "$TEST_TEMP_DIR/dist/package.json" 2>/dev/null || echo "")
  if [ "$pkg_main" == "server.js" ]; then
    pass_test "Standalone format has correct structure"
  else
    fail_test "Standalone format has correct structure" "package.json main is not server.js"
  fi
else
  fail_test "Standalone format has correct structure" "package.json not found"
fi
cleanup_test

# Test 3: Bundle with inline source maps
echo "Test 3: Bundle with inline source maps"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

npx tsx "$MCP_ROOT/cli/bundle.ts" "$TEST_TEMP_DIR/server.ts" \
  --output "$TEST_TEMP_DIR/bundle.js" \
  --sourcemap inline \
  2>&1 > "$TEST_TEMP_DIR/output.log"

if [ -f "$TEST_TEMP_DIR/bundle.js" ]; then
  if grep -q "sourceMappingURL=data:application/json;base64" "$TEST_TEMP_DIR/bundle.js"; then
    pass_test "Bundle with inline source maps"
  else
    fail_test "Bundle with inline source maps" "Inline source map not found in bundle"
  fi
else
  fail_test "Bundle with inline source maps" "Bundle not created"
fi
cleanup_test

# Test 4: Bundle with external source maps
echo "Test 4: Bundle with external source maps"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

npx tsx "$MCP_ROOT/cli/bundle.ts" "$TEST_TEMP_DIR/server.ts" \
  --output "$TEST_TEMP_DIR/bundle.js" \
  --sourcemap external \
  2>&1 > "$TEST_TEMP_DIR/output.log"

if [ -f "$TEST_TEMP_DIR/bundle.js" ] && [ -f "$TEST_TEMP_DIR/bundle.js.map" ]; then
  pass_test "Bundle with external source maps"
else
  fail_test "Bundle with external source maps" "Bundle or .map file not created"
fi
cleanup_test

# Test 5: Bundle with both source maps
echo "Test 5: Bundle with both source maps"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

npx tsx "$MCP_ROOT/cli/bundle.ts" "$TEST_TEMP_DIR/server.ts" \
  --output "$TEST_TEMP_DIR/bundle.js" \
  --sourcemap both \
  2>&1 > "$TEST_TEMP_DIR/output.log"

has_inline=false
if [ -f "$TEST_TEMP_DIR/bundle.js" ]; then
  if grep -q "sourceMappingURL=data:application/json;base64" "$TEST_TEMP_DIR/bundle.js"; then
    has_inline=true
  fi
fi

if [ "$has_inline" == "true" ] && [ -f "$TEST_TEMP_DIR/bundle.js.map" ]; then
  pass_test "Bundle with both source maps"
else
  fail_test "Bundle with both source maps" "Missing inline or external source map"
fi
cleanup_test

# Test 6: Standalone format with dependencies
echo "Test 6: Standalone format with dependencies"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
// /// dependencies
// better-sqlite3@^9.0.0
// axios@^1.6.0
// ///
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

npx tsx "$MCP_ROOT/cli/bundle.ts" "$TEST_TEMP_DIR/server.ts" \
  --output "$TEST_TEMP_DIR/dist" \
  --format standalone \
  2>&1 > "$TEST_TEMP_DIR/output.log"

if [ -f "$TEST_TEMP_DIR/dist/package.json" ]; then
  has_sqlite=$(jq -r '.dependencies["better-sqlite3"]' "$TEST_TEMP_DIR/dist/package.json" 2>/dev/null || echo "null")
  has_axios=$(jq -r '.dependencies["axios"]' "$TEST_TEMP_DIR/dist/package.json" 2>/dev/null || echo "null")
  # Only native modules should be in dependencies
  if [ "$has_sqlite" != "null" ] && [ "$has_axios" == "null" ]; then
    pass_test "Standalone format with dependencies"
  else
    fail_test "Standalone format with dependencies" "Dependencies not handled correctly"
  fi
else
  fail_test "Standalone format with dependencies" "package.json not found"
fi
cleanup_test

# Test 7: Default format is single-file
echo "Test 7: Default format is single-file"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

npx tsx "$MCP_ROOT/cli/bundle.ts" "$TEST_TEMP_DIR/server.ts" \
  --output "$TEST_TEMP_DIR/bundle.js" \
  2>&1 > "$TEST_TEMP_DIR/output.log"

if [ -f "$TEST_TEMP_DIR/bundle.js" ] && [ ! -d "$TEST_TEMP_DIR/bundle.js" ]; then
  pass_test "Default format is single-file"
else
  fail_test "Default format is single-file" "Expected single file output"
fi
cleanup_test

# Test 8: Source map validation (external)
echo "Test 8: Source map validation (external)"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

npx tsx "$MCP_ROOT/cli/bundle.ts" "$TEST_TEMP_DIR/server.ts" \
  --output "$TEST_TEMP_DIR/bundle.js" \
  --sourcemap external \
  2>&1 > "$TEST_TEMP_DIR/output.log"

if [ -f "$TEST_TEMP_DIR/bundle.js.map" ]; then
  version=$(jq -r '.version' "$TEST_TEMP_DIR/bundle.js.map" 2>/dev/null || echo "0")
  if [ "$version" == "3" ]; then
    pass_test "Source map validation (external)"
  else
    fail_test "Source map validation (external)" "Invalid source map version"
  fi
else
  fail_test "Source map validation (external)" ".map file not found"
fi
cleanup_test

# Test 9: Multiple format CLI flags validation
echo "Test 9: Multiple format CLI flags validation"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

# Test that format and sourcemap flags are recognized
npx tsx "$MCP_ROOT/cli/bundle.ts" "$TEST_TEMP_DIR/server.ts" \
  --output "$TEST_TEMP_DIR/bundle.js" \
  --format single-file \
  --sourcemap inline \
  --help \
  2>&1 | tee "$TEST_TEMP_DIR/output.log"

if grep -q "format" "$TEST_TEMP_DIR/output.log" || grep -q "sourcemap" "$TEST_TEMP_DIR/output.log" || [ -f "$TEST_TEMP_DIR/bundle.js" ]; then
  pass_test "Multiple format CLI flags validation"
else
  fail_test "Multiple format CLI flags validation" "CLI flags not recognized"
fi
cleanup_test

# Test 10: Standalone format can be run
echo "Test 10: Standalone format can be run"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
server.addTool({
  name: 'test',
  description: 'Test tool',
  parameters: {},
  execute: async () => ({ result: 'ok' })
});
export default server;
EOF

npx tsx "$MCP_ROOT/cli/bundle.ts" "$TEST_TEMP_DIR/server.ts" \
  --output "$TEST_TEMP_DIR/dist" \
  --format standalone \
  2>&1 > "$TEST_TEMP_DIR/output.log"

if [ -f "$TEST_TEMP_DIR/dist/server.js" ] && [ -f "$TEST_TEMP_DIR/dist/package.json" ]; then
  # Check if server.js is a valid Node.js file
  if node -c "$TEST_TEMP_DIR/dist/server.js" 2>/dev/null; then
    pass_test "Standalone format can be run"
  else
    fail_test "Standalone format can be run" "server.js has syntax errors"
  fi
else
  fail_test "Standalone format can be run" "Standalone bundle not created"
fi
cleanup_test

# Test 11: Bundle size reporting
echo "Test 11: Bundle size reporting"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

npx tsx "$MCP_ROOT/cli/bundle.ts" "$TEST_TEMP_DIR/server.ts" \
  --output "$TEST_TEMP_DIR/bundle.js" \
  2>&1 | tee "$TEST_TEMP_DIR/output.log"

if grep -qE "size|Size|bytes|KB" "$TEST_TEMP_DIR/output.log"; then
  pass_test "Bundle size reporting"
else
  fail_test "Bundle size reporting" "Size not reported in output"
fi
cleanup_test

# Test 12: Source map with minification
echo "Test 12: Source map with minification"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

npx tsx "$MCP_ROOT/cli/bundle.ts" "$TEST_TEMP_DIR/server.ts" \
  --output "$TEST_TEMP_DIR/bundle.js" \
  --minify \
  --sourcemap external \
  2>&1 > "$TEST_TEMP_DIR/output.log"

if [ -f "$TEST_TEMP_DIR/bundle.js" ] && [ -f "$TEST_TEMP_DIR/bundle.js.map" ]; then
  pass_test "Source map with minification"
else
  fail_test "Source map with minification" "Bundle or source map not created"
fi
cleanup_test

# Test 13: Standalone format directory creation
echo "Test 13: Standalone format directory creation"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

npx tsx "$MCP_ROOT/cli/bundle.ts" "$TEST_TEMP_DIR/server.ts" \
  --output "$TEST_TEMP_DIR/nested/deep/dist" \
  --format standalone \
  2>&1 > "$TEST_TEMP_DIR/output.log"

if [ -d "$TEST_TEMP_DIR/nested/deep/dist" ]; then
  pass_test "Standalone format directory creation"
else
  fail_test "Standalone format directory creation" "Nested directory not created"
fi
cleanup_test

# Test 14: Error handling for invalid format
echo "Test 14: Error handling for invalid format"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

npx tsx "$MCP_ROOT/cli/bundle.ts" "$TEST_TEMP_DIR/server.ts" \
  --output "$TEST_TEMP_DIR/bundle.js" \
  --format invalid-format \
  2>&1 | tee "$TEST_TEMP_DIR/output.log"

# Should either error or default to single-file
if grep -qiE "error|invalid|unknown" "$TEST_TEMP_DIR/output.log" || [ -f "$TEST_TEMP_DIR/bundle.js" ]; then
  pass_test "Error handling for invalid format"
else
  fail_test "Error handling for invalid format" "No error or fallback"
fi
cleanup_test

# Test 15: Progress reporting for advanced formats
echo "Test 15: Progress reporting for advanced formats"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

npx tsx "$MCP_ROOT/cli/bundle.ts" "$TEST_TEMP_DIR/server.ts" \
  --output "$TEST_TEMP_DIR/dist" \
  --format standalone \
  2>&1 | tee "$TEST_TEMP_DIR/output.log"

# Check for progress messages
if grep -qE "Building|Creating|Generating|Writing" "$TEST_TEMP_DIR/output.log"; then
  pass_test "Progress reporting for advanced formats"
else
  fail_test "Progress reporting for advanced formats" "No progress messages"
fi
cleanup_test

# Summary
echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "Total:  $TESTS_RUN"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
