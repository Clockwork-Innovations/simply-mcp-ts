#!/usr/bin/env bash

# Bundling Feature - Config Loader Unit Tests
# Tests the config-loader.ts implementation
# CRITICAL: All tests MUST call real implementation, NO grep-based fake tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_TEMP_DIR="/tmp/mcp-test-config-loader-$$"

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
run_config_loader_test() {
  local test_name="$1"
  local test_script="$2"

  cat > "$TEST_TEMP_DIR/test-runner.ts" <<EOFTEST
import { loadConfig, mergeConfig, validateBundleOptions, createDefaultConfig, writeConfig } from '$MCP_ROOT/core/config-loader.js';

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
  if npx tsx "$TEST_TEMP_DIR/test-runner.ts" > "$TEST_TEMP_DIR/test-output.json" 2>&1; then
    return 0
  else
    return 1
  fi
}

echo "========================================="
echo "Bundling - Config Loader Tests"
echo "========================================="
echo ""

# Test 1: Load .js config
echo "Test 1: Load .js config"
setup_test
cat > "$TEST_TEMP_DIR/simplymcp.config.js" <<'EOF'
export default {
  entry: './server.ts',
  output: {
    dir: 'dist',
    format: 'single-file'
  }
};
EOF

run_config_loader_test "load_js_config" "
const config = await loadConfig(undefined, '$TEST_TEMP_DIR');
console.log(JSON.stringify({ config }));
"

if [ $? -eq 0 ]; then
  entry=$(jq -r '.config.entry' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$entry" == "./server.ts" ]; then
    pass_test "Load .js config"
  else
    fail_test "Load .js config" "Expected entry='./server.ts', got: $entry"
  fi
else
  fail_test "Load .js config" "Test execution failed"
fi
cleanup_test

# Test 2: Load .json config
echo "Test 2: Load .json config"
setup_test
cat > "$TEST_TEMP_DIR/simplymcp.config.json" <<'EOF'
{
  "entry": "./server.ts",
  "output": {
    "dir": "dist",
    "format": "single-file"
  }
}
EOF

run_config_loader_test "load_json_config" "
const config = await loadConfig(undefined, '$TEST_TEMP_DIR');
console.log(JSON.stringify({ config }));
"

if [ $? -eq 0 ]; then
  entry=$(jq -r '.config.entry' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$entry" == "./server.ts" ]; then
    pass_test "Load .json config"
  else
    fail_test "Load .json config" "Expected entry='./server.ts', got: $entry"
  fi
else
  fail_test "Load .json config" "Test execution failed"
fi
cleanup_test

# Test 3: Default config file detection
echo "Test 3: Default config file detection"
setup_test
cat > "$TEST_TEMP_DIR/simplymcp.config.js" <<'EOF'
export default {
  entry: './auto-detected.ts'
};
EOF

run_config_loader_test "default_detection" "
const config = await loadConfig(undefined, '$TEST_TEMP_DIR');
console.log(JSON.stringify({ config }));
"

if [ $? -eq 0 ]; then
  entry=$(jq -r '.config.entry' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$entry" == "./auto-detected.ts" ]; then
    pass_test "Default config file detection"
  else
    fail_test "Default config file detection" "Expected auto-detected.ts, got: $entry"
  fi
else
  fail_test "Default config file detection" "Test execution failed"
fi
cleanup_test

# Test 4: Explicit config path
echo "Test 4: Explicit config path"
setup_test
cat > "$TEST_TEMP_DIR/my-config.js" <<'EOF'
export default {
  entry: './explicit-config.ts'
};
EOF

run_config_loader_test "explicit_config" "
const config = await loadConfig('my-config.js', '$TEST_TEMP_DIR');
console.log(JSON.stringify({ config }));
"

if [ $? -eq 0 ]; then
  entry=$(jq -r '.config.entry' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$entry" == "./explicit-config.ts" ]; then
    pass_test "Explicit config path"
  else
    fail_test "Explicit config path" "Expected explicit-config.ts, got: $entry"
  fi
else
  fail_test "Explicit config path" "Test execution failed"
fi
cleanup_test

# Test 5: Config file not found
echo "Test 5: Config file not found"
setup_test

run_config_loader_test "config_not_found" "
const config = await loadConfig(undefined, '$TEST_TEMP_DIR');
console.log(JSON.stringify({ config }));
"

if [ $? -eq 0 ]; then
  config=$(jq -r '.config' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$config" == "null" ]; then
    pass_test "Config file not found"
  else
    fail_test "Config file not found" "Expected null, got: $config"
  fi
else
  fail_test "Config file not found" "Test execution failed"
fi
cleanup_test

# Test 6: Invalid JSON
echo "Test 6: Invalid JSON"
setup_test
cat > "$TEST_TEMP_DIR/simplymcp.config.json" <<'EOF'
{
  "entry": "./server.ts",
  invalid json here
}
EOF

run_config_loader_test "invalid_json" "
try {
  await loadConfig(undefined, '$TEST_TEMP_DIR');
  console.log(JSON.stringify({ shouldFail: true }));
} catch (error) {
  console.log(JSON.stringify({ error: 'invalid' }));
}
"

if [ $? -eq 0 ]; then
  error=$(jq -r '.error' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$error" == "invalid" ]; then
    pass_test "Invalid JSON"
  else
    fail_test "Invalid JSON" "Expected error for invalid JSON"
  fi
else
  fail_test "Invalid JSON" "Test execution failed"
fi
cleanup_test

# Test 7: Config validation - invalid entry type
echo "Test 7: Config validation - invalid entry type"
setup_test
cat > "$TEST_TEMP_DIR/simplymcp.config.json" <<'EOF'
{
  "entry": 123
}
EOF

run_config_loader_test "invalid_entry_type" "
try {
  await loadConfig(undefined, '$TEST_TEMP_DIR');
  console.log(JSON.stringify({ shouldFail: true }));
} catch (error) {
  console.log(JSON.stringify({ error: 'validation' }));
}
"

if [ $? -eq 0 ]; then
  error=$(jq -r '.error' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$error" == "validation" ]; then
    pass_test "Config validation - invalid entry type"
  else
    fail_test "Config validation - invalid entry type" "Expected validation error"
  fi
else
  fail_test "Config validation - invalid entry type" "Test execution failed"
fi
cleanup_test

# Test 8: Config validation - invalid format
echo "Test 8: Config validation - invalid format"
setup_test
cat > "$TEST_TEMP_DIR/simplymcp.config.json" <<'EOF'
{
  "output": {
    "format": "invalid-format"
  }
}
EOF

run_config_loader_test "invalid_format" "
try {
  await loadConfig(undefined, '$TEST_TEMP_DIR');
  console.log(JSON.stringify({ shouldFail: true }));
} catch (error) {
  console.log(JSON.stringify({ error: 'validation' }));
}
"

if [ $? -eq 0 ]; then
  error=$(jq -r '.error' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$error" == "validation" ]; then
    pass_test "Config validation - invalid format"
  else
    fail_test "Config validation - invalid format" "Expected validation error"
  fi
else
  fail_test "Config validation - invalid format" "Test execution failed"
fi
cleanup_test

# Test 9: Merge CLI options with config
echo "Test 9: Merge CLI options with config"
setup_test
cat > "$TEST_TEMP_DIR/simplymcp.config.js" <<'EOF'
export default {
  entry: './server.ts',
  output: {
    dir: 'dist',
    format: 'single-file'
  },
  bundle: {
    minify: true
  }
};
EOF

run_config_loader_test "merge_config" "
const config = await loadConfig(undefined, '$TEST_TEMP_DIR');
const merged = mergeConfig(config, {
  output: 'custom/output.js',
  minify: false
});
console.log(JSON.stringify({ merged }));
"

if [ $? -eq 0 ]; then
  output=$(jq -r '.merged.output' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  minify=$(jq -r '.merged.minify' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$output" == "custom/output.js" ] && [ "$minify" == "false" ]; then
    pass_test "Merge CLI options with config"
  else
    fail_test "Merge CLI options with config" "Expected CLI options to override, got output=$output, minify=$minify"
  fi
else
  fail_test "Merge CLI options with config" "Test execution failed"
fi
cleanup_test

# Test 10: CLI options take precedence over config
echo "Test 10: CLI options take precedence over config"
setup_test
cat > "$TEST_TEMP_DIR/simplymcp.config.js" <<'EOF'
export default {
  entry: './config-entry.ts',
  output: {
    dir: 'config-dist'
  }
};
EOF

run_config_loader_test "cli_precedence" "
const config = await loadConfig(undefined, '$TEST_TEMP_DIR');
const merged = mergeConfig(config, {
  entry: './cli-entry.ts'
});
console.log(JSON.stringify({ entry: merged.entry }));
"

if [ $? -eq 0 ]; then
  entry=$(jq -r '.entry' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$entry" == "./cli-entry.ts" ]; then
    pass_test "CLI options take precedence over config"
  else
    fail_test "CLI options take precedence over config" "Expected CLI entry, got: $entry"
  fi
else
  fail_test "CLI options take precedence over config" "Test execution failed"
fi
cleanup_test

# Test 11: Create default config
echo "Test 11: Create default config"
setup_test

run_config_loader_test "default_config" "
const config = createDefaultConfig();
console.log(JSON.stringify({ config }));
"

if [ $? -eq 0 ]; then
  dir=$(jq -r '.config.output.dir' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  format=$(jq -r '.config.output.format' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$dir" == "dist" ] && [ "$format" == "single-file" ]; then
    pass_test "Create default config"
  else
    fail_test "Create default config" "Expected default values, got dir=$dir, format=$format"
  fi
else
  fail_test "Create default config" "Test execution failed"
fi
cleanup_test

# Test 12: Write config to file
echo "Test 12: Write config to file"
setup_test

run_config_loader_test "write_config" "
const config = createDefaultConfig();
await writeConfig(config, '$TEST_TEMP_DIR/test-config.js', 'js');
console.log(JSON.stringify({ written: true }));
"

if [ $? -eq 0 ]; then
  if [ -f "$TEST_TEMP_DIR/test-config.js" ]; then
    pass_test "Write config to file"
  else
    fail_test "Write config to file" "Config file not created"
  fi
else
  fail_test "Write config to file" "Test execution failed"
fi
cleanup_test

# Test 13: Validate bundle options - missing entry
echo "Test 13: Validate bundle options - missing entry"
setup_test

run_config_loader_test "validate_missing_entry" "
try {
  validateBundleOptions({ entry: '', output: 'dist/bundle.js' });
  console.log(JSON.stringify({ shouldFail: true }));
} catch (error) {
  console.log(JSON.stringify({ error: 'validation' }));
}
"

if [ $? -eq 0 ]; then
  error=$(jq -r '.error' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$error" == "validation" ]; then
    pass_test "Validate bundle options - missing entry"
  else
    fail_test "Validate bundle options - missing entry" "Expected validation error"
  fi
else
  fail_test "Validate bundle options - missing entry" "Test execution failed"
fi
cleanup_test

# Test 14: Validate bundle options - missing output
echo "Test 14: Validate bundle options - missing output"
setup_test

run_config_loader_test "validate_missing_output" "
try {
  validateBundleOptions({ entry: 'server.ts', output: '' });
  console.log(JSON.stringify({ shouldFail: true }));
} catch (error) {
  console.log(JSON.stringify({ error: 'validation' }));
}
"

if [ $? -eq 0 ]; then
  error=$(jq -r '.error' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$error" == "validation" ]; then
    pass_test "Validate bundle options - missing output"
  else
    fail_test "Validate bundle options - missing output" "Expected validation error"
  fi
else
  fail_test "Validate bundle options - missing output" "Test execution failed"
fi
cleanup_test

# Test 15: Validate bundle options - invalid format
echo "Test 15: Validate bundle options - invalid format"
setup_test

run_config_loader_test "validate_invalid_format" "
try {
  validateBundleOptions({ entry: 'server.ts', output: 'dist.js', format: 'invalid' as any });
  console.log(JSON.stringify({ shouldFail: true }));
} catch (error) {
  console.log(JSON.stringify({ error: 'validation' }));
}
"

if [ $? -eq 0 ]; then
  error=$(jq -r '.error' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$error" == "validation" ]; then
    pass_test "Validate bundle options - invalid format"
  else
    fail_test "Validate bundle options - invalid format" "Expected validation error"
  fi
else
  fail_test "Validate bundle options - invalid format" "Test execution failed"
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
