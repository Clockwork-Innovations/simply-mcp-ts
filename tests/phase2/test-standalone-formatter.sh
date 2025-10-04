#!/usr/bin/env bash

# Bundling Feature 4.2 - Standalone Formatter Tests
# Tests the standalone-formatter.ts implementation
# CRITICAL: All tests MUST call real implementation, NO grep-based fake tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_TEMP_DIR="/tmp/mcp-test-standalone-formatter-$$"

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
run_standalone_test() {
  local test_name="$1"
  local test_script="$2"

  cat > "$TEST_TEMP_DIR/test-runner.mjs" <<EOFTEST
import { createStandaloneBundle } from '$MCP_ROOT/../dist/src/core/formatters/standalone-formatter.js';
import { writeFile } from 'fs/promises';
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
echo "Bundling - Standalone Formatter Tests"
echo "========================================="
echo ""

# Test 1: Create standalone bundle directory
echo "Test 1: Create standalone bundle directory"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
export default server;
EOF

run_standalone_test "create_standalone" "
const result = await createStandaloneBundle({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  outputDir: '$TEST_TEMP_DIR/standalone'
});
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  output_dir=$(jq -r '.outputDir' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ -d "$output_dir" ]; then
    pass_test "Create standalone bundle directory"
  else
    fail_test "Create standalone bundle directory" "Output directory not created: $output_dir"
  fi
else
  fail_test "Create standalone bundle directory" "Test execution failed"
fi
cleanup_test

# Test 2: Copy bundle to server.js
echo "Test 2: Copy bundle to server.js"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
console.log('test bundle');
EOF

run_standalone_test "copy_bundle" "
const result = await createStandaloneBundle({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  outputDir: '$TEST_TEMP_DIR/standalone'
});
console.log(JSON.stringify({ serverExists: existsSync('$TEST_TEMP_DIR/standalone/server.js') }));
"

if [ $? -eq 0 ]; then
  server_exists=$(jq -r '.serverExists' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$server_exists" == "true" ]; then
    pass_test "Copy bundle to server.js"
  else
    fail_test "Copy bundle to server.js" "server.js not found in output"
  fi
else
  fail_test "Copy bundle to server.js" "Test execution failed"
fi
cleanup_test

# Test 3: Generate package.json
echo "Test 3: Generate package.json"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
console.log('test');
EOF

run_standalone_test "generate_package_json" "
await createStandaloneBundle({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  outputDir: '$TEST_TEMP_DIR/standalone'
});
console.log(JSON.stringify({ packageExists: existsSync('$TEST_TEMP_DIR/standalone/package.json') }));
"

if [ $? -eq 0 ]; then
  pkg_exists=$(jq -r '.packageExists' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$pkg_exists" == "true" ]; then
    pass_test "Generate package.json"
  else
    fail_test "Generate package.json" "package.json not found"
  fi
else
  fail_test "Generate package.json" "Test execution failed"
fi
cleanup_test

# Test 4: Package.json has correct structure
echo "Test 4: Package.json has correct structure"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
console.log('test');
EOF

run_standalone_test "package_json_structure" "
await createStandaloneBundle({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  outputDir: '$TEST_TEMP_DIR/standalone'
});
const { readFile } = await import('fs/promises');
const pkg = JSON.parse(await readFile('$TEST_TEMP_DIR/standalone/package.json', 'utf-8'));
console.log(JSON.stringify({
  hasName: !!pkg.name,
  hasMain: pkg.main === 'server.js',
  hasType: pkg.type === 'module',
  hasStartScript: !!pkg.scripts?.start
}));
"

if [ $? -eq 0 ]; then
  has_structure=$(jq -r '.hasName and .hasMain and .hasType and .hasStartScript' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$has_structure" == "true" ]; then
    pass_test "Package.json has correct structure"
  else
    fail_test "Package.json has correct structure" "Missing required fields"
  fi
else
  fail_test "Package.json has correct structure" "Test execution failed"
fi
cleanup_test

# Test 5: Include dependencies in package.json
echo "Test 5: Include dependencies in package.json"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
console.log('test');
EOF

run_standalone_test "include_dependencies" "
await createStandaloneBundle({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  outputDir: '$TEST_TEMP_DIR/standalone',
  dependencies: { 'better-sqlite3': '^9.0.0', 'axios': '^1.6.0' }
});
const { readFile } = await import('fs/promises');
const pkg = JSON.parse(await readFile('$TEST_TEMP_DIR/standalone/package.json', 'utf-8'));
console.log(JSON.stringify({
  hasSqlite: !!pkg.dependencies?.['better-sqlite3'],
  hasAxios: !pkg.dependencies?.['axios'] // axios should be excluded (not native)
}));
"

if [ $? -eq 0 ]; then
  has_sqlite=$(jq -r '.hasSqlite' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  has_axios=$(jq -r '.hasAxios' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$has_sqlite" == "true" ] && [ "$has_axios" == "true" ]; then
    pass_test "Include dependencies in package.json"
  else
    fail_test "Include dependencies in package.json" "Dependencies not handled correctly"
  fi
else
  fail_test "Include dependencies in package.json" "Test execution failed"
fi
cleanup_test

# Test 6: Return list of created files
echo "Test 6: Return list of created files"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
console.log('test');
EOF

run_standalone_test "return_files" "
const result = await createStandaloneBundle({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  outputDir: '$TEST_TEMP_DIR/standalone'
});
console.log(JSON.stringify({ fileCount: result.files.length }));
"

if [ $? -eq 0 ]; then
  file_count=$(jq -r '.fileCount' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "0")
  if [ "$file_count" -ge "2" ]; then
    pass_test "Return list of created files"
  else
    fail_test "Return list of created files" "Expected at least 2 files, got: $file_count"
  fi
else
  fail_test "Return list of created files" "Test execution failed"
fi
cleanup_test

# Test 7: Handle missing bundle file
echo "Test 7: Handle missing bundle file"
setup_test

run_standalone_test "missing_bundle" "
try {
  await createStandaloneBundle({
    bundlePath: '$TEST_TEMP_DIR/nonexistent.js',
    outputDir: '$TEST_TEMP_DIR/standalone'
  });
  console.log(JSON.stringify({ shouldFail: true }));
} catch (error) {
  console.log(JSON.stringify({ error: 'not found' }));
}
"

if [ $? -eq 0 ]; then
  error=$(jq -r '.error' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$error" == "not found" ]; then
    pass_test "Handle missing bundle file"
  else
    fail_test "Handle missing bundle file" "Expected error for missing file"
  fi
else
  fail_test "Handle missing bundle file" "Test execution failed"
fi
cleanup_test

# Test 8: Copy assets when specified
echo "Test 8: Copy assets when specified"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
console.log('test');
EOF
echo "test asset" > "$TEST_TEMP_DIR/asset.txt"

run_standalone_test "copy_assets" "
const result = await createStandaloneBundle({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  outputDir: '$TEST_TEMP_DIR/standalone',
  includeAssets: ['$TEST_TEMP_DIR/asset.txt']
});
console.log(JSON.stringify({
  assetExists: existsSync('$TEST_TEMP_DIR/standalone/assets/asset.txt'),
  fileCount: result.files.length
}));
"

if [ $? -eq 0 ]; then
  asset_exists=$(jq -r '.assetExists' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$asset_exists" == "true" ]; then
    pass_test "Copy assets when specified"
  else
    fail_test "Copy assets when specified" "Assets not copied"
  fi
else
  fail_test "Copy assets when specified" "Test execution failed"
fi
cleanup_test

# Test 9: Handle missing assets gracefully
echo "Test 9: Handle missing assets gracefully"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
console.log('test');
EOF

run_standalone_test "missing_assets" "
const result = await createStandaloneBundle({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  outputDir: '$TEST_TEMP_DIR/standalone',
  includeAssets: ['$TEST_TEMP_DIR/nonexistent.txt']
});
console.log(JSON.stringify({ success: true, fileCount: result.files.length }));
"

if [ $? -eq 0 ]; then
  success=$(jq -r '.success' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$success" == "true" ]; then
    pass_test "Handle missing assets gracefully"
  else
    fail_test "Handle missing assets gracefully" "Should continue without error"
  fi
else
  fail_test "Handle missing assets gracefully" "Test execution failed"
fi
cleanup_test

# Test 10: Create nested output directories
echo "Test 10: Create nested output directories"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
console.log('test');
EOF

run_standalone_test "nested_output" "
const result = await createStandaloneBundle({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  outputDir: '$TEST_TEMP_DIR/nested/deep/standalone'
});
console.log(JSON.stringify({ dirExists: existsSync('$TEST_TEMP_DIR/nested/deep/standalone') }));
"

if [ $? -eq 0 ]; then
  dir_exists=$(jq -r '.dirExists' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$dir_exists" == "true" ]; then
    pass_test "Create nested output directories"
  else
    fail_test "Create nested output directories" "Nested directories not created"
  fi
else
  fail_test "Create nested output directories" "Test execution failed"
fi
cleanup_test

# Test 11: Multiple assets in assets directory
echo "Test 11: Multiple assets in assets directory"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
console.log('test');
EOF
echo "asset1" > "$TEST_TEMP_DIR/asset1.txt"
echo "asset2" > "$TEST_TEMP_DIR/asset2.txt"

run_standalone_test "multiple_assets" "
const result = await createStandaloneBundle({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  outputDir: '$TEST_TEMP_DIR/standalone',
  includeAssets: ['$TEST_TEMP_DIR/asset1.txt', '$TEST_TEMP_DIR/asset2.txt']
});
console.log(JSON.stringify({
  asset1Exists: existsSync('$TEST_TEMP_DIR/standalone/assets/asset1.txt'),
  asset2Exists: existsSync('$TEST_TEMP_DIR/standalone/assets/asset2.txt')
}));
"

if [ $? -eq 0 ]; then
  asset1=$(jq -r '.asset1Exists' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  asset2=$(jq -r '.asset2Exists' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$asset1" == "true" ] && [ "$asset2" == "true" ]; then
    pass_test "Multiple assets in assets directory"
  else
    fail_test "Multiple assets in assets directory" "Not all assets copied"
  fi
else
  fail_test "Multiple assets in assets directory" "Test execution failed"
fi
cleanup_test

# Test 12: Only native modules in package.json dependencies
echo "Test 12: Only native modules in package.json dependencies"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
console.log('test');
EOF

run_standalone_test "native_only" "
await createStandaloneBundle({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  outputDir: '$TEST_TEMP_DIR/standalone',
  dependencies: {
    'better-sqlite3': '^9.0.0',
    'sharp': '^0.32.0',
    'axios': '^1.6.0',
    'lodash': '^4.17.0'
  }
});
const { readFile } = await import('fs/promises');
const pkg = JSON.parse(await readFile('$TEST_TEMP_DIR/standalone/package.json', 'utf-8'));
const deps = Object.keys(pkg.dependencies || {});
console.log(JSON.stringify({
  hasSqlite: deps.includes('better-sqlite3'),
  hasSharp: deps.includes('sharp'),
  hasAxios: !deps.includes('axios'),
  hasLodash: !deps.includes('lodash')
}));
"

if [ $? -eq 0 ]; then
  correct=$(jq -r '.hasSqlite and .hasSharp and .hasAxios and .hasLodash' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$correct" == "true" ]; then
    pass_test "Only native modules in package.json dependencies"
  else
    fail_test "Only native modules in package.json dependencies" "Wrong dependencies included"
  fi
else
  fail_test "Only native modules in package.json dependencies" "Test execution failed"
fi
cleanup_test

# Test 13: Empty dependencies object
echo "Test 13: Empty dependencies object"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
console.log('test');
EOF

run_standalone_test "empty_deps" "
await createStandaloneBundle({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  outputDir: '$TEST_TEMP_DIR/standalone',
  dependencies: {}
});
const { readFile } = await import('fs/promises');
const pkg = JSON.parse(await readFile('$TEST_TEMP_DIR/standalone/package.json', 'utf-8'));
console.log(JSON.stringify({ depsEmpty: Object.keys(pkg.dependencies || {}).length === 0 }));
"

if [ $? -eq 0 ]; then
  deps_empty=$(jq -r '.depsEmpty' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$deps_empty" == "true" ]; then
    pass_test "Empty dependencies object"
  else
    fail_test "Empty dependencies object" "Dependencies should be empty"
  fi
else
  fail_test "Empty dependencies object" "Test execution failed"
fi
cleanup_test

# Test 14: No dependencies specified
echo "Test 14: No dependencies specified"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
console.log('test');
EOF

run_standalone_test "no_deps" "
await createStandaloneBundle({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  outputDir: '$TEST_TEMP_DIR/standalone'
});
const { readFile } = await import('fs/promises');
const pkg = JSON.parse(await readFile('$TEST_TEMP_DIR/standalone/package.json', 'utf-8'));
console.log(JSON.stringify({ depsEmpty: Object.keys(pkg.dependencies || {}).length === 0 }));
"

if [ $? -eq 0 ]; then
  deps_empty=$(jq -r '.depsEmpty' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$deps_empty" == "true" ]; then
    pass_test "No dependencies specified"
  else
    fail_test "No dependencies specified" "Dependencies should be empty"
  fi
else
  fail_test "No dependencies specified" "Test execution failed"
fi
cleanup_test

# Test 15: Standalone bundle structure validation
echo "Test 15: Standalone bundle structure validation"
setup_test
cat > "$TEST_TEMP_DIR/bundle.js" <<'EOF'
console.log('test');
EOF

run_standalone_test "validate_structure" "
const result = await createStandaloneBundle({
  bundlePath: '$TEST_TEMP_DIR/bundle.js',
  outputDir: '$TEST_TEMP_DIR/standalone'
});
console.log(JSON.stringify({
  hasServer: existsSync('$TEST_TEMP_DIR/standalone/server.js'),
  hasPackage: existsSync('$TEST_TEMP_DIR/standalone/package.json'),
  outputDirCorrect: result.outputDir === '$TEST_TEMP_DIR/standalone',
  hasFiles: result.files.length >= 2
}));
"

if [ $? -eq 0 ]; then
  valid=$(jq -r '.hasServer and .hasPackage and .outputDirCorrect and .hasFiles' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$valid" == "true" ]; then
    pass_test "Standalone bundle structure validation"
  else
    fail_test "Standalone bundle structure validation" "Structure not valid"
  fi
else
  fail_test "Standalone bundle structure validation" "Test execution failed"
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
