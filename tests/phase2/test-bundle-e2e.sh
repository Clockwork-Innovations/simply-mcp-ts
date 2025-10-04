#!/usr/bin/env bash

# Bundling Feature - E2E Tests
# Tests complete bundling workflows from CLI
# CRITICAL: All tests MUST test actual bundling, not just grep for code

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_TEMP_DIR="/tmp/mcp-test-bundle-e2e-$$"

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
echo "Bundling - E2E Tests"
echo "========================================="
echo ""

# Test 1: Full bundling workflow
echo "Test 1: Full bundling workflow"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';

const server = new SimplyMCP({
  name: 'test-server',
  version: '1.0.0'
});

server.addTool({
  name: 'greet',
  description: 'Greet someone',
  parameters: {
    name: { type: 'string', description: 'Name to greet' }
  },
  execute: async (params) => ({
    greeting: `Hello, ${params.name}!`
  })
});

export default server;
EOF

cd "$MCP_ROOT"
if node "$MCP_ROOT/../dist/src/cli/index.js" bundle "$TEST_TEMP_DIR/server.ts" --output "$TEST_TEMP_DIR/dist/bundle.js" --no-minify --external simply-mcp 2>&1; then
  if [ -f "$TEST_TEMP_DIR/dist/bundle.js" ]; then
    bundle_size=$(wc -c < "$TEST_TEMP_DIR/dist/bundle.js")
    if [ "$bundle_size" -gt 100 ]; then
      pass_test "Full bundling workflow"
    else
      fail_test "Full bundling workflow" "Bundle too small: $bundle_size bytes"
    fi
  else
    fail_test "Full bundling workflow" "Bundle file not created"
  fi
else
  fail_test "Full bundling workflow" "Bundle command failed"
fi
cleanup_test

# Test 2: Bundle with dependencies
echo "Test 2: Bundle with dependencies"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///
import { SimplyMCP } from 'simply-mcp';

const server = new SimplyMCP({
  name: 'deps-server',
  version: '1.0.0'
});

export default server;
EOF

cd "$MCP_ROOT"
if node "$MCP_ROOT/../dist/src/cli/index.js" bundle "$TEST_TEMP_DIR/server.ts" --output "$TEST_TEMP_DIR/bundle.js" --no-minify --external simply-mcp 2>&1; then
  if [ -f "$TEST_TEMP_DIR/bundle.js" ]; then
    pass_test "Bundle with dependencies"
  else
    fail_test "Bundle with dependencies" "Bundle not created"
  fi
else
  fail_test "Bundle with dependencies" "Bundle command failed"
fi
cleanup_test

# Test 3: Bundle with config file
echo "Test 3: Bundle with config file"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

cat > "$TEST_TEMP_DIR/simplemcp.config.js" <<'EOF'
export default {
  entry: './server.ts',
  output: {
    dir: 'dist',
    filename: 'server.js',
    format: 'single-file'
  },
  bundle: {
    minify: false
  }
};
EOF

cd "$TEST_TEMP_DIR"
if node "$MCP_ROOT/../dist/src/cli/index.js" bundle --external simply-mcp 2>&1; then
  if [ -f "$TEST_TEMP_DIR/dist/server.js" ]; then
    pass_test "Bundle with config file"
  else
    fail_test "Bundle with config file" "Bundle not created in expected location"
  fi
else
  fail_test "Bundle with config file" "Bundle command failed"
fi
cleanup_test

# Test 4: Bundle ESM format
echo "Test 4: Bundle ESM format"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

cd "$MCP_ROOT"
if node "$MCP_ROOT/../dist/src/cli/index.js" bundle "$TEST_TEMP_DIR/server.ts" --output "$TEST_TEMP_DIR/bundle.mjs" --format esm --no-minify --external simply-mcp 2>&1; then
  if [ -f "$TEST_TEMP_DIR/bundle.mjs" ]; then
    pass_test "Bundle ESM format"
  else
    fail_test "Bundle ESM format" "ESM bundle not created"
  fi
else
  fail_test "Bundle ESM format" "Bundle command failed"
fi
cleanup_test

# Test 5: Bundle CJS format
echo "Test 5: Bundle CJS format"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

cd "$MCP_ROOT"
if node "$MCP_ROOT/../dist/src/cli/index.js" bundle "$TEST_TEMP_DIR/server.ts" --output "$TEST_TEMP_DIR/bundle.cjs" --format cjs --no-minify --external simply-mcp 2>&1; then
  if [ -f "$TEST_TEMP_DIR/bundle.cjs" ]; then
    pass_test "Bundle CJS format"
  else
    fail_test "Bundle CJS format" "CJS bundle not created"
  fi
else
  fail_test "Bundle CJS format" "Bundle command failed"
fi
cleanup_test

# Test 6: Bundle with minification
echo "Test 6: Bundle with minification"
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

cd "$MCP_ROOT"
# Bundle without minification
node "$MCP_ROOT/../dist/src/cli/index.js" bundle "$TEST_TEMP_DIR/server.ts" --output "$TEST_TEMP_DIR/unminified.js" --no-minify --external simply-mcp 2>&1
unminified_size=$(wc -c < "$TEST_TEMP_DIR/unminified.js" 2>/dev/null || echo "0")

# Bundle with minification
node "$MCP_ROOT/../dist/src/cli/index.js" bundle "$TEST_TEMP_DIR/server.ts" --output "$TEST_TEMP_DIR/minified.js" --minify --external simply-mcp 2>&1
minified_size=$(wc -c < "$TEST_TEMP_DIR/minified.js" 2>/dev/null || echo "0")

if [ "$minified_size" -gt 0 ] && [ "$minified_size" -lt "$unminified_size" ]; then
  pass_test "Bundle with minification"
else
  fail_test "Bundle with minification" "Minified size ($minified_size) not less than unminified ($unminified_size)"
fi
cleanup_test

# Test 7: Bundle with external packages
echo "Test 7: Bundle with external packages"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
// /// dependencies
// axios@^1.6.0
// lodash@^4.17.21
// ///
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

cd "$MCP_ROOT"
if node "$MCP_ROOT/../dist/src/cli/index.js" bundle "$TEST_TEMP_DIR/server.ts" --output "$TEST_TEMP_DIR/bundle.js" --external "axios,lodash,simply-mcp" --no-minify 2>&1; then
  if [ -f "$TEST_TEMP_DIR/bundle.js" ]; then
    pass_test "Bundle with external packages"
  else
    fail_test "Bundle with external packages" "Bundle not created"
  fi
else
  fail_test "Bundle with external packages" "Bundle command failed"
fi
cleanup_test

# Test 8: Error handling - missing entry
echo "Test 8: Error handling - missing entry"
setup_test

cd "$MCP_ROOT"
if node "$MCP_ROOT/../dist/src/cli/index.js" bundle "$TEST_TEMP_DIR/nonexistent.ts" --output "$TEST_TEMP_DIR/bundle.js" --no-minify --external simply-mcp 2>&1; then
  fail_test "Error handling - missing entry" "Should have failed for missing entry"
else
  pass_test "Error handling - missing entry"
fi
cleanup_test

# Test 9: Error handling - invalid config
echo "Test 9: Error handling - invalid config"
setup_test
cat > "$TEST_TEMP_DIR/simplemcp.config.json" <<'EOF'
{
  "entry": 123,
  "invalid": true
}
EOF

cd "$TEST_TEMP_DIR"
if node "$MCP_ROOT/../dist/src/cli/index.js" bundle --external simply-mcp 2>&1; then
  fail_test "Error handling - invalid config" "Should have failed for invalid config"
else
  pass_test "Error handling - invalid config"
fi
cleanup_test

# Test 10: Bundle with source maps
echo "Test 10: Bundle with source maps"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

cd "$MCP_ROOT"
if node "$MCP_ROOT/../dist/src/cli/index.js" bundle "$TEST_TEMP_DIR/server.ts" --output "$TEST_TEMP_DIR/bundle.js" --sourcemap --no-minify --external simply-mcp 2>&1; then
  if [ -f "$TEST_TEMP_DIR/bundle.js" ] && [ -f "$TEST_TEMP_DIR/bundle.js.map" ]; then
    pass_test "Bundle with source maps"
  else
    fail_test "Bundle with source maps" "Source map not created"
  fi
else
  fail_test "Bundle with source maps" "Bundle command failed"
fi
cleanup_test

# Test 11: Bundle multiple tools
echo "Test 11: Bundle multiple tools"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';

const server = new SimplyMCP({
  name: 'multi-tool-server',
  version: '1.0.0'
});

server.addTool({
  name: 'add',
  description: 'Add two numbers',
  parameters: {
    a: { type: 'number' },
    b: { type: 'number' }
  },
  execute: async ({ a, b }) => ({ result: a + b })
});

server.addTool({
  name: 'multiply',
  description: 'Multiply two numbers',
  parameters: {
    a: { type: 'number' },
    b: { type: 'number' }
  },
  execute: async ({ a, b }) => ({ result: a * b })
});

export default server;
EOF

cd "$MCP_ROOT"
if node "$MCP_ROOT/../dist/src/cli/index.js" bundle "$TEST_TEMP_DIR/server.ts" --output "$TEST_TEMP_DIR/bundle.js" --no-minify --external simply-mcp 2>&1; then
  if [ -f "$TEST_TEMP_DIR/bundle.js" ]; then
    pass_test "Bundle multiple tools"
  else
    fail_test "Bundle multiple tools" "Bundle not created"
  fi
else
  fail_test "Bundle multiple tools" "Bundle command failed"
fi
cleanup_test

# Test 12: Bundle with verbose output
echo "Test 12: Bundle with verbose output"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

cd "$MCP_ROOT"
output=$(node "$MCP_ROOT/../dist/src/cli/index.js" bundle "$TEST_TEMP_DIR/server.ts" --output "$TEST_TEMP_DIR/bundle.js" --verbose --no-minify --external simply-mcp 2>&1)
if echo "$output" | grep -q "INFO"; then
  pass_test "Bundle with verbose output"
else
  fail_test "Bundle with verbose output" "No verbose output detected"
fi
cleanup_test

# Test 13: Bundle with custom target
echo "Test 13: Bundle with custom target"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

cd "$MCP_ROOT"
if node "$MCP_ROOT/../dist/src/cli/index.js" bundle "$TEST_TEMP_DIR/server.ts" --output "$TEST_TEMP_DIR/bundle.js" --target node18 --no-minify --external simply-mcp 2>&1; then
  if [ -f "$TEST_TEMP_DIR/bundle.js" ]; then
    pass_test "Bundle with custom target"
  else
    fail_test "Bundle with custom target" "Bundle not created"
  fi
else
  fail_test "Bundle with custom target" "Bundle command failed"
fi
cleanup_test

# Test 14: Bundle detects entry by convention
echo "Test 14: Bundle detects entry by convention"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'convention', version: '1.0.0' });
EOF

cd "$TEST_TEMP_DIR"
if node "$MCP_ROOT/../dist/src/cli/index.js" bundle --output bundle.js --no-minify --external simply-mcp 2>&1; then
  if [ -f "$TEST_TEMP_DIR/bundle.js" ]; then
    pass_test "Bundle detects entry by convention"
  else
    fail_test "Bundle detects entry by convention" "Bundle not created"
  fi
else
  fail_test "Bundle detects entry by convention" "Bundle command failed"
fi
cleanup_test

# Test 15: Bundle with package.json dependencies
echo "Test 15: Bundle with package.json dependencies"
setup_test
cat > "$TEST_TEMP_DIR/package.json" <<'EOF'
{
  "name": "test-server",
  "version": "1.0.0",
  "dependencies": {
    "lodash": "^4.17.21"
  }
}
EOF

cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

cd "$MCP_ROOT"
if node "$MCP_ROOT/../dist/src/cli/index.js" bundle "$TEST_TEMP_DIR/server.ts" --output "$TEST_TEMP_DIR/bundle.js" --no-minify --external simply-mcp 2>&1; then
  if [ -f "$TEST_TEMP_DIR/bundle.js" ]; then
    pass_test "Bundle with package.json dependencies"
  else
    fail_test "Bundle with package.json dependencies" "Bundle not created"
  fi
else
  fail_test "Bundle with package.json dependencies" "Bundle command failed"
fi
cleanup_test

# Test 16: Bundle output shows metadata
echo "Test 16: Bundle output shows metadata"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

cd "$MCP_ROOT"
output=$(node "$MCP_ROOT/../dist/src/cli/index.js" bundle "$TEST_TEMP_DIR/server.ts" --output "$TEST_TEMP_DIR/bundle.js" --no-minify --external simply-mcp 2>&1)
if echo "$output" | grep -q "Output:" && echo "$output" | grep -q "Size:"; then
  pass_test "Bundle output shows metadata"
else
  fail_test "Bundle output shows metadata" "Missing expected output metadata"
fi
cleanup_test

# Test 17: Bundle creates nested directories
echo "Test 17: Bundle creates nested directories"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

cd "$MCP_ROOT"
if node "$MCP_ROOT/../dist/src/cli/index.js" bundle "$TEST_TEMP_DIR/server.ts" --output "$TEST_TEMP_DIR/deep/nested/dir/bundle.js" --no-minify --external simply-mcp 2>&1; then
  if [ -f "$TEST_TEMP_DIR/deep/nested/dir/bundle.js" ]; then
    pass_test "Bundle creates nested directories"
  else
    fail_test "Bundle creates nested directories" "Bundle not created in nested dir"
  fi
else
  fail_test "Bundle creates nested directories" "Bundle command failed"
fi
cleanup_test

# Test 18: Bundle handles relative paths
echo "Test 18: Bundle handles relative paths"
setup_test
mkdir -p "$TEST_TEMP_DIR/src"
cat > "$TEST_TEMP_DIR/src/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

cd "$TEST_TEMP_DIR"
if node "$MCP_ROOT/../dist/src/cli/index.js" bundle src/server.ts --output dist/bundle.js --no-minify --external simply-mcp 2>&1; then
  if [ -f "$TEST_TEMP_DIR/dist/bundle.js" ]; then
    pass_test "Bundle handles relative paths"
  else
    fail_test "Bundle handles relative paths" "Bundle not created"
  fi
else
  fail_test "Bundle handles relative paths" "Bundle command failed"
fi
cleanup_test

# Test 19: Bundle with TypeScript project
echo "Test 19: Bundle with TypeScript project"
setup_test
cat > "$TEST_TEMP_DIR/tsconfig.json" <<'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true
  }
}
EOF

cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server: any = new SimplyMCP({ name: 'test', version: '1.0.0' });
export default server;
EOF

cd "$MCP_ROOT"
if node "$MCP_ROOT/../dist/src/cli/index.js" bundle "$TEST_TEMP_DIR/server.ts" --output "$TEST_TEMP_DIR/bundle.js" --no-minify --external simply-mcp 2>&1; then
  if [ -f "$TEST_TEMP_DIR/bundle.js" ]; then
    pass_test "Bundle with TypeScript project"
  else
    fail_test "Bundle with TypeScript project" "Bundle not created"
  fi
else
  fail_test "Bundle with TypeScript project" "Bundle command failed"
fi
cleanup_test

# Test 20: Bundle success indicator
echo "Test 20: Bundle success indicator"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

cd "$MCP_ROOT"
output=$(node "$MCP_ROOT/../dist/src/cli/index.js" bundle "$TEST_TEMP_DIR/server.ts" --output "$TEST_TEMP_DIR/bundle.js" --no-minify --external simply-mcp 2>&1)
if echo "$output" | grep -q "success"; then
  pass_test "Bundle success indicator"
else
  fail_test "Bundle success indicator" "No success indicator in output"
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
