#!/usr/bin/env bash

# Bundling Feature 4.2 - Source Map Handler Tests
# Tests the sourcemap-handler.ts implementation
# CRITICAL: All tests MUST call real implementation, NO grep-based fake tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_TEMP_DIR="/tmp/mcp-test-sourcemap-handler-$$"

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

# Create a test script that imports and runs the real implementation
run_sourcemap_test() {
  local test_name="$1"
  local test_script="$2"

  cat > "$TEST_TEMP_DIR/test-runner.mjs" <<EOFTEST
import { handleSourceMap, inlineSourceMap } from '$MCP_ROOT/../dist/src/core/formatters/sourcemap-handler.js';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';

async function runTest() {
  try {
    $test_script
  } catch (error) {
    console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    process.exit(1);
  }
}

runTest();
EOFTEST

  # Run the test
  if node "$TEST_TEMP_DIR/test-runner.mjs" > "$TEST_TEMP_DIR/test-output.json" 2>&1; then
    return 0
  else
    return 1
  fi
}

echo "========================================="
echo "Bundling - Source Map Handler Tests"
echo "========================================="
echo ""

# Test 1: Inline source map mode
echo "Test 1: Inline source map mode"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
console.log('test');
EOF

run_sourcemap_test "inline_mode" "
const result = await handleSourceMap({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  sourceMapContent: '{\"version\":3,\"sources\":[],\"mappings\":\"\"}',
  mode: 'inline'
});
console.log(JSON.stringify({ inline: result.inline, hasExternal: result.external !== null }));
"

if [ $? -eq 0 ]; then
  inline=$(jq -r '.inline' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  has_external=$(jq -r '.hasExternal' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "true")
  if [ "$inline" == "true" ] && [ "$has_external" == "false" ]; then
    pass_test "Inline source map mode"
  else
    fail_test "Inline source map mode" "Expected inline=true, external=null"
  fi
else
  fail_test "Inline source map mode" "Test execution failed"
fi
cleanup_test

# Test 2: External source map mode
echo "Test 2: External source map mode"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
console.log('test');
EOF

run_sourcemap_test "external_mode" "
const result = await handleSourceMap({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  sourceMapContent: '{\"version\":3,\"sources\":[],\"mappings\":\"\"}',
  mode: 'external'
});
console.log(JSON.stringify({ inline: result.inline, hasExternal: result.external !== null }));
"

if [ $? -eq 0 ]; then
  inline=$(jq -r '.inline' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "true")
  has_external=$(jq -r '.hasExternal' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$inline" == "false" ] && [ "$has_external" == "true" ]; then
    pass_test "External source map mode"
  else
    fail_test "External source map mode" "Expected inline=false, external!=null"
  fi
else
  fail_test "External source map mode" "Test execution failed"
fi
cleanup_test

# Test 3: Both mode (inline + external)
echo "Test 3: Both mode (inline + external)"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
console.log('test');
EOF

run_sourcemap_test "both_mode" "
const result = await handleSourceMap({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  sourceMapContent: '{\"version\":3,\"sources\":[],\"mappings\":\"\"}',
  mode: 'both'
});
console.log(JSON.stringify({ inline: result.inline, hasExternal: result.external !== null }));
"

if [ $? -eq 0 ]; then
  inline=$(jq -r '.inline' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  has_external=$(jq -r '.hasExternal' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$inline" == "true" ] && [ "$has_external" == "true" ]; then
    pass_test "Both mode (inline + external)"
  else
    fail_test "Both mode (inline + external)" "Expected both inline and external"
  fi
else
  fail_test "Both mode (inline + external)" "Test execution failed"
fi
cleanup_test

# Test 4: External source map file created
echo "Test 4: External source map file created"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
console.log('test');
EOF

run_sourcemap_test "external_file" "
const result = await handleSourceMap({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  sourceMapContent: '{\"version\":3,\"sources\":[],\"mappings\":\"\"}',
  mode: 'external'
});
console.log(JSON.stringify({
  externalPath: result.external,
  fileExists: existsSync('$TEST_TEMP_DIR/bundle.js.map')
}));
"

if [ $? -eq 0 ]; then
  file_exists=$(jq -r '.fileExists' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$file_exists" == "true" ]; then
    pass_test "External source map file created"
  else
    fail_test "External source map file created" "Expected .map file"
  fi
else
  fail_test "External source map file created" "Test execution failed"
fi
cleanup_test

# Test 5: External source map path is bundle.js.map
echo "Test 5: External source map path is bundle.js.map"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
console.log('test');
EOF

run_sourcemap_test "external_path" "
const result = await handleSourceMap({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  sourceMapContent: '{\"version\":3,\"sources\":[],\"mappings\":\"\"}',
  mode: 'external'
});
console.log(JSON.stringify({
  externalPath: result.external,
  endsWithMap: result.external?.endsWith('.map') || false
}));
"

if [ $? -eq 0 ]; then
  ends_with_map=$(jq -r '.endsWithMap' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$ends_with_map" == "true" ]; then
    pass_test "External source map path is bundle.js.map"
  else
    fail_test "External source map path is bundle.js.map" "Expected .map extension"
  fi
else
  fail_test "External source map path is bundle.js.map" "Test execution failed"
fi
cleanup_test

# Test 6: Inline source map base64 encoding
echo "Test 6: Inline source map base64 encoding"
setup_test

run_sourcemap_test "inline_base64" "
const bundleCode = 'console.log(\"test\");';
const sourceMapContent = '{\"version\":3,\"sources\":[],\"mappings\":\"\"}';
const inlined = inlineSourceMap(bundleCode, sourceMapContent);
console.log(JSON.stringify({
  hasBase64: inlined.includes('base64'),
  hasSourceMappingURL: inlined.includes('sourceMappingURL'),
  hasData: inlined.includes('data:application/json')
}));
"

if [ $? -eq 0 ]; then
  correct=$(jq -r '.hasBase64 and .hasSourceMappingURL and .hasData' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$correct" == "true" ]; then
    pass_test "Inline source map base64 encoding"
  else
    fail_test "Inline source map base64 encoding" "Expected base64 data URL"
  fi
else
  fail_test "Inline source map base64 encoding" "Test execution failed"
fi
cleanup_test

# Test 7: Inline source map comment format
echo "Test 7: Inline source map comment format"
setup_test

run_sourcemap_test "inline_comment" "
const bundleCode = 'console.log(\"test\");';
const sourceMapContent = '{\"version\":3}';
const inlined = inlineSourceMap(bundleCode, sourceMapContent);
console.log(JSON.stringify({
  hasComment: inlined.includes('//#'),
  endsWithComment: inlined.trim().split('\\n').pop()?.startsWith('//#') || false
}));
"

if [ $? -eq 0 ]; then
  correct=$(jq -r '.hasComment and .endsWithComment' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$correct" == "true" ]; then
    pass_test "Inline source map comment format"
  else
    fail_test "Inline source map comment format" "Expected //# comment"
  fi
else
  fail_test "Inline source map comment format" "Test execution failed"
fi
cleanup_test

# Test 8: Both mode creates file and inline
echo "Test 8: Both mode creates file and inline"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
console.log('test');
EOF

run_sourcemap_test "both_creates_file" "
const result = await handleSourceMap({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  sourceMapContent: '{\"version\":3,\"sources\":[],\"mappings\":\"\"}',
  mode: 'both'
});
console.log(JSON.stringify({
  inline: result.inline,
  externalPath: result.external,
  fileExists: existsSync('$TEST_TEMP_DIR/bundle.js.map')
}));
"

if [ $? -eq 0 ]; then
  inline=$(jq -r '.inline' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  file_exists=$(jq -r '.fileExists' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$inline" == "true" ] && [ "$file_exists" == "true" ]; then
    pass_test "Both mode creates file and inline"
  else
    fail_test "Both mode creates file and inline" "Expected both inline and file"
  fi
else
  fail_test "Both mode creates file and inline" "Test execution failed"
fi
cleanup_test

# Test 9: External source map contains valid JSON
echo "Test 9: External source map contains valid JSON"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
console.log('test');
EOF

run_sourcemap_test "external_valid_json" "
const sourceMapContent = '{\"version\":3,\"sources\":[\"test.ts\"],\"mappings\":\"AAAA\"}';
const result = await handleSourceMap({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  sourceMapContent,
  mode: 'external'
});
const mapContent = await readFile('$TEST_TEMP_DIR/bundle.js.map', 'utf-8');
const parsed = JSON.parse(mapContent);
console.log(JSON.stringify({
  isValid: parsed.version === 3,
  hasSources: Array.isArray(parsed.sources)
}));
"

if [ $? -eq 0 ]; then
  correct=$(jq -r '.isValid and .hasSources' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$correct" == "true" ]; then
    pass_test "External source map contains valid JSON"
  else
    fail_test "External source map contains valid JSON" "Invalid JSON in .map file"
  fi
else
  fail_test "External source map contains valid JSON" "Test execution failed"
fi
cleanup_test

# Test 10: Inline preserves original code
echo "Test 10: Inline preserves original code"
setup_test

run_sourcemap_test "inline_preserves_code" "
const originalCode = 'const x = 42;\\nconsole.log(x);';
const sourceMapContent = '{\"version\":3}';
const inlined = inlineSourceMap(originalCode, sourceMapContent);
const hasOriginalCode = inlined.startsWith(originalCode);
console.log(JSON.stringify({ hasOriginalCode }));
"

if [ $? -eq 0 ]; then
  has_original=$(jq -r '.hasOriginalCode' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$has_original" == "true" ]; then
    pass_test "Inline preserves original code"
  else
    fail_test "Inline preserves original code" "Original code not preserved"
  fi
else
  fail_test "Inline preserves original code" "Test execution failed"
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
