#!/usr/bin/env bash

# Bundling Feature - Entry Detector Unit Tests
# Tests the entry-detector.ts implementation
# CRITICAL: All tests MUST call real implementation, NO grep-based fake tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_TEMP_DIR="/tmp/mcp-test-entry-detector-$$"

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
run_entry_detector_test() {
  local test_name="$1"
  local test_script="$2"

  cat > "$TEST_TEMP_DIR/test-runner.mjs" <<EOFTEST
import * as entryDetectorModule from '$MCP_ROOT/../dist/src/core/entry-detector.js';

// Workaround for null prototype issue in ES modules - extract functions by property name
const props = Object.getOwnPropertyNames(entryDetectorModule);
const detectEntryPoint = Object.getOwnPropertyDescriptor(entryDetectorModule, props[0])?.value;
const extractServerName = Object.getOwnPropertyDescriptor(entryDetectorModule, props[1])?.value;
const isESMEntry = Object.getOwnPropertyDescriptor(entryDetectorModule, props[2])?.value;
const isSimplyMCPFile = Object.getOwnPropertyDescriptor(entryDetectorModule, props[3])?.value;
const isTypeScriptEntry = Object.getOwnPropertyDescriptor(entryDetectorModule, props[4])?.value;
const resolveEntryPath = Object.getOwnPropertyDescriptor(entryDetectorModule, props[5])?.value;
const validateSimplyMCPEntry = Object.getOwnPropertyDescriptor(entryDetectorModule, props[6])?.value;

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
echo "Bundling - Entry Detector Tests"
echo "========================================="
echo ""

# Test 1: Detect explicit entry point
echo "Test 1: Detect explicit entry point"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
export default server;
EOF

run_entry_detector_test "detect_explicit" "
const entry = await detectEntryPoint('server.ts', '$TEST_TEMP_DIR');
console.log(JSON.stringify({ entry }));
"

if [ $? -eq 0 ]; then
  entry_path=$(jq -r '.entry' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [[ "$entry_path" == *"server.ts" ]]; then
    pass_test "Detect explicit entry point"
  else
    fail_test "Detect explicit entry point" "Expected path with server.ts, got: $entry_path"
  fi
else
  fail_test "Detect explicit entry point" "Test execution failed"
fi
cleanup_test

# Test 2: Detect from package.json main field
echo "Test 2: Detect from package.json main field"
setup_test
cat > "$TEST_TEMP_DIR/package.json" <<'EOF'
{
  "name": "test",
  "main": "src/index.ts"
}
EOF
mkdir -p "$TEST_TEMP_DIR/src"
cat > "$TEST_TEMP_DIR/src/index.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
export default new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

run_entry_detector_test "detect_from_pkg_main" "
const entry = await detectEntryPoint(undefined, '$TEST_TEMP_DIR');
console.log(JSON.stringify({ entry }));
"

if [ $? -eq 0 ]; then
  entry_path=$(jq -r '.entry' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [[ "$entry_path" == *"src/index.ts" ]]; then
    pass_test "Detect from package.json main field"
  else
    fail_test "Detect from package.json main field" "Expected path with src/index.ts, got: $entry_path"
  fi
else
  fail_test "Detect from package.json main field" "Test execution failed"
fi
cleanup_test

# Test 3: Detect from convention (server.ts)
echo "Test 3: Detect from convention (server.ts)"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
export default server;
EOF

run_entry_detector_test "detect_convention_server_ts" "
const entry = await detectEntryPoint(undefined, '$TEST_TEMP_DIR');
console.log(JSON.stringify({ entry }));
"

if [ $? -eq 0 ]; then
  entry_path=$(jq -r '.entry' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [[ "$entry_path" == *"server.ts" ]]; then
    pass_test "Detect from convention (server.ts)"
  else
    fail_test "Detect from convention (server.ts)" "Expected path with server.ts, got: $entry_path"
  fi
else
  fail_test "Detect from convention (server.ts)" "Test execution failed"
fi
cleanup_test

# Test 4: Detect from convention (index.ts)
echo "Test 4: Detect from convention (index.ts)"
setup_test
cat > "$TEST_TEMP_DIR/index.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
export default server;
EOF

run_entry_detector_test "detect_convention_index_ts" "
const entry = await detectEntryPoint(undefined, '$TEST_TEMP_DIR');
console.log(JSON.stringify({ entry }));
"

if [ $? -eq 0 ]; then
  entry_path=$(jq -r '.entry' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [[ "$entry_path" == *"index.ts" ]]; then
    pass_test "Detect from convention (index.ts)"
  else
    fail_test "Detect from convention (index.ts)" "Expected path with index.ts, got: $entry_path"
  fi
else
  fail_test "Detect from convention (index.ts)" "Test execution failed"
fi
cleanup_test

# Test 5: Validate SimplyMCP import exists
echo "Test 5: Validate SimplyMCP import exists"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

run_entry_detector_test "validate_import" "
await validateSimplyMCPEntry('$TEST_TEMP_DIR/server.ts');
console.log(JSON.stringify({ success: true }));
"

if [ $? -eq 0 ]; then
  success=$(jq -r '.success' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$success" == "true" ]; then
    pass_test "Validate SimplyMCP import exists"
  else
    fail_test "Validate SimplyMCP import exists" "Expected validation to pass"
  fi
else
  fail_test "Validate SimplyMCP import exists" "Test execution failed"
fi
cleanup_test

# Test 6: Reject non-SimplyMCP files
echo "Test 6: Reject non-SimplyMCP files"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
console.log('Just a regular file');
EOF

run_entry_detector_test "reject_non_mcp" "
try {
  await validateSimplyMCPEntry('$TEST_TEMP_DIR/server.ts');
  console.log(JSON.stringify({ shouldFail: true }));
} catch (error) {
  console.log(JSON.stringify({ rejected: true }));
}
"

if [ $? -eq 0 ]; then
  rejected=$(jq -r '.rejected' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$rejected" == "true" ]; then
    pass_test "Reject non-SimplyMCP files"
  else
    fail_test "Reject non-SimplyMCP files" "Expected validation to reject file"
  fi
else
  fail_test "Reject non-SimplyMCP files" "Test execution failed"
fi
cleanup_test

# Test 7: Handle missing entry point
echo "Test 7: Handle missing entry point"
setup_test

run_entry_detector_test "missing_entry" "
try {
  await detectEntryPoint(undefined, '$TEST_TEMP_DIR');
  console.log(JSON.stringify({ shouldFail: true }));
} catch (error) {
  console.log(JSON.stringify({ error: 'not found' }));
}
"

if [ $? -eq 0 ]; then
  error=$(jq -r '.error' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$error" == "not found" ]; then
    pass_test "Handle missing entry point"
  else
    fail_test "Handle missing entry point" "Expected error for missing entry"
  fi
else
  fail_test "Handle missing entry point" "Test execution failed"
fi
cleanup_test

# Test 8: Handle TypeScript files
echo "Test 8: Handle TypeScript files"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
export default server;
EOF

run_entry_detector_test "typescript_file" "
const isTS = isTypeScriptEntry('$TEST_TEMP_DIR/server.ts');
console.log(JSON.stringify({ isTS }));
"

if [ $? -eq 0 ]; then
  is_ts=$(jq -r '.isTS' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$is_ts" == "true" ]; then
    pass_test "Handle TypeScript files"
  else
    fail_test "Handle TypeScript files" "Expected isTypeScriptEntry to return true"
  fi
else
  fail_test "Handle TypeScript files" "Test execution failed"
fi
cleanup_test

# Test 9: Handle JavaScript files
echo "Test 9: Handle JavaScript files"
setup_test
cat > "$TEST_TEMP_DIR/server.js" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
export default server;
EOF

run_entry_detector_test "javascript_file" "
await validateSimplyMCPEntry('$TEST_TEMP_DIR/server.js');
const isTS = isTypeScriptEntry('$TEST_TEMP_DIR/server.js');
console.log(JSON.stringify({ isTS }));
"

if [ $? -eq 0 ]; then
  is_ts=$(jq -r '.isTS' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "true")
  if [ "$is_ts" == "false" ]; then
    pass_test "Handle JavaScript files"
  else
    fail_test "Handle JavaScript files" "Expected isTypeScriptEntry to return false for .js"
  fi
else
  fail_test "Handle JavaScript files" "Test execution failed"
fi
cleanup_test

# Test 10: Handle .mjs files
echo "Test 10: Handle .mjs files"
setup_test
cat > "$TEST_TEMP_DIR/server.mjs" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
export default server;
EOF

run_entry_detector_test "mjs_file" "
const isESM = await isESMEntry('$TEST_TEMP_DIR/server.mjs', '$TEST_TEMP_DIR');
console.log(JSON.stringify({ isESM }));
"

if [ $? -eq 0 ]; then
  is_esm=$(jq -r '.isESM' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$is_esm" == "true" ]; then
    pass_test "Handle .mjs files"
  else
    fail_test "Handle .mjs files" "Expected isESMEntry to return true for .mjs"
  fi
else
  fail_test "Handle .mjs files" "Test execution failed"
fi
cleanup_test

# Test 11: Multiple SimplyMCP instances
echo "Test 11: Multiple SimplyMCP instances"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server1 = new SimplyMCP({ name: 'test1', version: '1.0.0' });
const server2 = new SimplyMCP({ name: 'test2', version: '1.0.0' });
export default server1;
EOF

run_entry_detector_test "multiple_instances" "
await validateSimplyMCPEntry('$TEST_TEMP_DIR/server.ts');
console.log(JSON.stringify({ success: true }));
"

if [ $? -eq 0 ]; then
  success=$(jq -r '.success' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$success" == "true" ]; then
    pass_test "Multiple SimplyMCP instances"
  else
    fail_test "Multiple SimplyMCP instances" "Expected validation to pass"
  fi
else
  fail_test "Multiple SimplyMCP instances" "Test execution failed"
fi
cleanup_test

# Test 12: Scoped package imports
echo "Test 12: Scoped package imports"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from '@simplesrc/core';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
export default server;
EOF

run_entry_detector_test "scoped_package" "
await validateSimplyMCPEntry('$TEST_TEMP_DIR/server.ts');
console.log(JSON.stringify({ success: true }));
"

if [ $? -eq 0 ]; then
  success=$(jq -r '.success' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$success" == "true" ]; then
    pass_test "Scoped package imports"
  else
    fail_test "Scoped package imports" "Expected validation to pass"
  fi
else
  fail_test "Scoped package imports" "Test execution failed"
fi
cleanup_test

# Test 13: Invalid file paths
echo "Test 13: Invalid file paths"
setup_test

run_entry_detector_test "invalid_path" "
try {
  await validateSimplyMCPEntry('$TEST_TEMP_DIR/nonexistent.ts');
  console.log(JSON.stringify({ shouldFail: true }));
} catch (error) {
  console.log(JSON.stringify({ error: 'file not found' }));
}
"

if [ $? -eq 0 ]; then
  error=$(jq -r '.error' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$error" == "file not found" ]; then
    pass_test "Invalid file paths"
  else
    fail_test "Invalid file paths" "Expected error for invalid path"
  fi
else
  fail_test "Invalid file paths" "Test execution failed"
fi
cleanup_test

# Test 14: Relative vs absolute paths
echo "Test 14: Relative vs absolute paths"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

run_entry_detector_test "path_resolution" "
const relativePath = resolveEntryPath('server.ts', '$TEST_TEMP_DIR');
const absolutePath = resolveEntryPath('$TEST_TEMP_DIR/server.ts', '$TEST_TEMP_DIR');
console.log(JSON.stringify({
  relative: relativePath,
  absolute: absolutePath,
  bothAbsolute: relativePath.startsWith('/') && absolutePath.startsWith('/')
}));
"

if [ $? -eq 0 ]; then
  both_absolute=$(jq -r '.bothAbsolute' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$both_absolute" == "true" ]; then
    pass_test "Relative vs absolute paths"
  else
    fail_test "Relative vs absolute paths" "Expected both paths to be absolute"
  fi
else
  fail_test "Relative vs absolute paths" "Test execution failed"
fi
cleanup_test

# Test 15: basePath option handling
echo "Test 15: basePath option handling"
setup_test
mkdir -p "$TEST_TEMP_DIR/subdir"
cat > "$TEST_TEMP_DIR/subdir/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
export default server;
EOF

run_entry_detector_test "basepath_option" "
const entry = await detectEntryPoint('server.ts', '$TEST_TEMP_DIR/subdir');
console.log(JSON.stringify({ entry }));
"

if [ $? -eq 0 ]; then
  entry_path=$(jq -r '.entry' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [[ "$entry_path" == *"subdir/server.ts" ]]; then
    pass_test "basePath option handling"
  else
    fail_test "basePath option handling" "Expected path with subdir/server.ts, got: $entry_path"
  fi
else
  fail_test "basePath option handling" "Test execution failed"
fi
cleanup_test

# Test 16: Extract server name from constructor
echo "Test 16: Extract server name from constructor"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'my-cool-server', version: '1.0.0' });
export default server;
EOF

run_entry_detector_test "extract_name" "
const name = await extractServerName('$TEST_TEMP_DIR/server.ts');
console.log(JSON.stringify({ name }));
"

if [ $? -eq 0 ]; then
  name=$(jq -r '.name' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$name" == "my-cool-server" ]; then
    pass_test "Extract server name from constructor"
  else
    fail_test "Extract server name from constructor" "Expected 'my-cool-server', got: $name"
  fi
else
  fail_test "Extract server name from constructor" "Test execution failed"
fi
cleanup_test

# Test 17: Extract server name fallback to filename
echo "Test 17: Extract server name fallback to filename"
setup_test
cat > "$TEST_TEMP_DIR/my-server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ version: '1.0.0' });
export default server;
EOF

run_entry_detector_test "extract_name_fallback" "
const name = await extractServerName('$TEST_TEMP_DIR/my-server.ts');
console.log(JSON.stringify({ name }));
"

if [ $? -eq 0 ]; then
  name=$(jq -r '.name' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$name" == "my-server" ]; then
    pass_test "Extract server name fallback to filename"
  else
    fail_test "Extract server name fallback to filename" "Expected 'my-server', got: $name"
  fi
else
  fail_test "Extract server name fallback to filename" "Test execution failed"
fi
cleanup_test

# Test 18: isSimplyMCPFile returns true for valid file
echo "Test 18: isSimplyMCPFile returns true for valid file"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

run_entry_detector_test "is_mcp_file_true" "
const isMCP = await isSimplyMCPFile('$TEST_TEMP_DIR/server.ts');
console.log(JSON.stringify({ isMCP }));
"

if [ $? -eq 0 ]; then
  is_mcp=$(jq -r '.isMCP' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$is_mcp" == "true" ]; then
    pass_test "isSimplyMCPFile returns true for valid file"
  else
    fail_test "isSimplyMCPFile returns true for valid file" "Expected true"
  fi
else
  fail_test "isSimplyMCPFile returns true for valid file" "Test execution failed"
fi
cleanup_test

# Test 19: isSimplyMCPFile returns false for invalid file
echo "Test 19: isSimplyMCPFile returns false for invalid file"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
console.log('Not a SimplyMCP file');
EOF

run_entry_detector_test "is_mcp_file_false" "
const isMCP = await isSimplyMCPFile('$TEST_TEMP_DIR/server.ts');
console.log(JSON.stringify({ isMCP }));
"

if [ $? -eq 0 ]; then
  is_mcp=$(jq -r '.isMCP' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "true")
  if [ "$is_mcp" == "false" ]; then
    pass_test "isSimplyMCPFile returns false for invalid file"
  else
    fail_test "isSimplyMCPFile returns false for invalid file" "Expected false"
  fi
else
  fail_test "isSimplyMCPFile returns false for invalid file" "Test execution failed"
fi
cleanup_test

# Test 20: ESM detection from package.json type field
echo "Test 20: ESM detection from package.json type field"
setup_test
cat > "$TEST_TEMP_DIR/package.json" <<'EOF'
{
  "type": "module"
}
EOF
cat > "$TEST_TEMP_DIR/server.js" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

run_entry_detector_test "esm_detection_pkg" "
const isESM = await isESMEntry('$TEST_TEMP_DIR/server.js', '$TEST_TEMP_DIR');
console.log(JSON.stringify({ isESM }));
"

if [ $? -eq 0 ]; then
  is_esm=$(jq -r '.isESM' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$is_esm" == "true" ]; then
    pass_test "ESM detection from package.json type field"
  else
    fail_test "ESM detection from package.json type field" "Expected true for type=module"
  fi
else
  fail_test "ESM detection from package.json type field" "Test execution failed"
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
