#!/usr/bin/env bash

# Auto-Installation Feature - Dependency Checker Unit Tests
# Tests the dependency-checker.ts implementation
# CRITICAL: All tests MUST call real implementation, NO grep-based fake tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_TEMP_DIR="/tmp/mcp-test-checker-$$"

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
run_checker_test() {
  local test_name="$1"
  local test_script="$2"

  cat > "$TEST_TEMP_DIR/test-runner.ts" <<EOFTEST
import { checkDependencies, isPackageInstalled, getInstalledVersion, verifyVersion } from '$MCP_ROOT/core/dependency-checker.js';

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
echo "Auto-Installation - Dependency Checker Tests"
echo "========================================="
echo ""

# Test 1: Check single installed package
echo "Test 1: Check single installed package"
setup_test
mkdir -p "$TEST_TEMP_DIR/node_modules/axios"
cat > "$TEST_TEMP_DIR/node_modules/axios/package.json" <<'EOF'
{"name": "axios", "version": "1.6.0"}
EOF

run_checker_test "check_single_installed" "
const result = await checkDependencies({ 'axios': '^1.6.0' }, '$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  installed=$(jq -r '.installed[]' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$installed" == "axios" ]; then
    pass_test "Check single installed package"
  else
    fail_test "Check single installed package" "Expected axios in installed, got: $installed"
  fi
else
  fail_test "Check single installed package" "Test execution failed"
fi
cleanup_test

# Test 2: Check missing package
echo "Test 2: Check missing package"
setup_test

run_checker_test "check_missing" "
const result = await checkDependencies({ 'axios': '^1.6.0' }, '$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  missing=$(jq -r '.missing[]' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$missing" == "axios" ]; then
    pass_test "Check missing package"
  else
    fail_test "Check missing package" "Expected axios in missing, got: $missing"
  fi
else
  fail_test "Check missing package" "Test execution failed"
fi
cleanup_test

# Test 3: Check outdated package
echo "Test 3: Check outdated package"
setup_test
mkdir -p "$TEST_TEMP_DIR/node_modules/axios"
cat > "$TEST_TEMP_DIR/node_modules/axios/package.json" <<'EOF'
{"name": "axios", "version": "1.0.0"}
EOF

run_checker_test "check_outdated" "
const result = await checkDependencies({ 'axios': '^1.5.0' }, '$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  outdated_count=$(jq '.outdated | length' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "0")
  if [ "$outdated_count" -gt 0 ]; then
    pass_test "Check outdated package"
  else
    fail_test "Check outdated package" "Expected outdated package, got: $outdated_count"
  fi
else
  fail_test "Check outdated package" "Test execution failed"
fi
cleanup_test

# Test 4: Check scoped package (@types/node)
echo "Test 4: Check scoped package"
setup_test
mkdir -p "$TEST_TEMP_DIR/node_modules/@types/node"
cat > "$TEST_TEMP_DIR/node_modules/@types/node/package.json" <<'EOF'
{"name": "@types/node", "version": "20.0.0"}
EOF

run_checker_test "check_scoped" "
const result = await checkDependencies({ '@types/node': '^20.0.0' }, '$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  installed=$(jq -r '.installed[]' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$installed" == "@types/node" ]; then
    pass_test "Check scoped package"
  else
    fail_test "Check scoped package" "Expected @types/node in installed, got: $installed"
  fi
else
  fail_test "Check scoped package" "Test execution failed"
fi
cleanup_test

# Test 5: Check multiple packages
echo "Test 5: Check multiple packages"
setup_test
mkdir -p "$TEST_TEMP_DIR/node_modules/axios"
mkdir -p "$TEST_TEMP_DIR/node_modules/zod"
cat > "$TEST_TEMP_DIR/node_modules/axios/package.json" <<'EOF'
{"name": "axios", "version": "1.6.0"}
EOF
cat > "$TEST_TEMP_DIR/node_modules/zod/package.json" <<'EOF'
{"name": "zod", "version": "3.22.0"}
EOF

run_checker_test "check_multiple" "
const result = await checkDependencies({ 'axios': '^1.6.0', 'zod': '^3.22.0' }, '$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  installed_count=$(jq '.installed | length' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "0")
  if [ "$installed_count" -eq 2 ]; then
    pass_test "Check multiple packages"
  else
    fail_test "Check multiple packages" "Expected 2 installed, got: $installed_count"
  fi
else
  fail_test "Check multiple packages" "Test execution failed"
fi
cleanup_test

# Test 6: Check wildcard version (*)
echo "Test 6: Check wildcard version"
setup_test
mkdir -p "$TEST_TEMP_DIR/node_modules/axios"
cat > "$TEST_TEMP_DIR/node_modules/axios/package.json" <<'EOF'
{"name": "axios", "version": "1.6.0"}
EOF

run_checker_test "check_wildcard" "
const result = await checkDependencies({ 'axios': '*' }, '$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  installed=$(jq -r '.installed[]' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$installed" == "axios" ]; then
    pass_test "Check wildcard version"
  else
    fail_test "Check wildcard version" "Expected axios in installed, got: $installed"
  fi
else
  fail_test "Check wildcard version" "Test execution failed"
fi
cleanup_test

# Test 7: Check latest version
echo "Test 7: Check latest version"
setup_test
mkdir -p "$TEST_TEMP_DIR/node_modules/axios"
cat > "$TEST_TEMP_DIR/node_modules/axios/package.json" <<'EOF'
{"name": "axios", "version": "1.6.0"}
EOF

run_checker_test "check_latest" "
const result = await checkDependencies({ 'axios': 'latest' }, '$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  installed=$(jq -r '.installed[]' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$installed" == "axios" ]; then
    pass_test "Check latest version"
  else
    fail_test "Check latest version" "Expected axios in installed, got: $installed"
  fi
else
  fail_test "Check latest version" "Test execution failed"
fi
cleanup_test

# Test 8: Check caret range (^1.0.0)
echo "Test 8: Check caret range"
setup_test
mkdir -p "$TEST_TEMP_DIR/node_modules/axios"
cat > "$TEST_TEMP_DIR/node_modules/axios/package.json" <<'EOF'
{"name": "axios", "version": "1.6.5"}
EOF

run_checker_test "check_caret" "
const result = await checkDependencies({ 'axios': '^1.6.0' }, '$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  installed=$(jq -r '.installed[]' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$installed" == "axios" ]; then
    pass_test "Check caret range"
  else
    fail_test "Check caret range" "Expected axios in installed, got: $installed"
  fi
else
  fail_test "Check caret range" "Test execution failed"
fi
cleanup_test

# Test 9: Check tilde range (~1.0.0)
echo "Test 9: Check tilde range"
setup_test
mkdir -p "$TEST_TEMP_DIR/node_modules/axios"
cat > "$TEST_TEMP_DIR/node_modules/axios/package.json" <<'EOF'
{"name": "axios", "version": "1.6.5"}
EOF

run_checker_test "check_tilde" "
const result = await checkDependencies({ 'axios': '~1.6.0' }, '$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  installed=$(jq -r '.installed[]' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$installed" == "axios" ]; then
    pass_test "Check tilde range"
  else
    fail_test "Check tilde range" "Expected axios in installed, got: $installed"
  fi
else
  fail_test "Check tilde range" "Test execution failed"
fi
cleanup_test

# Test 10: Check exact version (1.0.0)
echo "Test 10: Check exact version"
setup_test
mkdir -p "$TEST_TEMP_DIR/node_modules/axios"
cat > "$TEST_TEMP_DIR/node_modules/axios/package.json" <<'EOF'
{"name": "axios", "version": "1.6.0"}
EOF

run_checker_test "check_exact" "
const result = await checkDependencies({ 'axios': '1.6.0' }, '$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  installed=$(jq -r '.installed[]' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$installed" == "axios" ]; then
    pass_test "Check exact version"
  else
    fail_test "Check exact version" "Expected axios in installed, got: $installed"
  fi
else
  fail_test "Check exact version" "Test execution failed"
fi
cleanup_test

# Test 11: Check comparison operators (>=1.0.0)
echo "Test 11: Check comparison operators"
setup_test
mkdir -p "$TEST_TEMP_DIR/node_modules/axios"
cat > "$TEST_TEMP_DIR/node_modules/axios/package.json" <<'EOF'
{"name": "axios", "version": "1.6.0"}
EOF

run_checker_test "check_comparison" "
const result = await checkDependencies({ 'axios': '>=1.0.0' }, '$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  installed=$(jq -r '.installed[]' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$installed" == "axios" ]; then
    pass_test "Check comparison operators"
  else
    fail_test "Check comparison operators" "Expected axios in installed, got: $installed"
  fi
else
  fail_test "Check comparison operators" "Test execution failed"
fi
cleanup_test

# Test 12: Check invalid version format
echo "Test 12: Check invalid version format"
setup_test
mkdir -p "$TEST_TEMP_DIR/node_modules/axios"
cat > "$TEST_TEMP_DIR/node_modules/axios/package.json" <<'EOF'
{"name": "axios", "version": "invalid"}
EOF

run_checker_test "check_invalid_version" "
const result = await checkDependencies({ 'axios': '^1.6.0' }, '$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  # With invalid version, package should be treated as compatible (conservative approach)
  installed=$(jq -r '.installed[]' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$installed" == "axios" ]; then
    pass_test "Check invalid version format"
  else
    fail_test "Check invalid version format" "Expected axios in installed (conservative), got: $installed"
  fi
else
  fail_test "Check invalid version format" "Test execution failed"
fi
cleanup_test

# Test 13: Check corrupted package.json
echo "Test 13: Check corrupted package.json"
setup_test
mkdir -p "$TEST_TEMP_DIR/node_modules/axios"
echo "{ invalid json" > "$TEST_TEMP_DIR/node_modules/axios/package.json"

run_checker_test "check_corrupted" "
const result = await checkDependencies({ 'axios': '^1.6.0' }, '$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  missing=$(jq -r '.missing[]' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$missing" == "axios" ]; then
    pass_test "Check corrupted package.json"
  else
    fail_test "Check corrupted package.json" "Expected axios in missing, got: $missing"
  fi
else
  fail_test "Check corrupted package.json" "Test execution failed"
fi
cleanup_test

# Test 14: Check missing package.json
echo "Test 14: Check missing package.json"
setup_test
mkdir -p "$TEST_TEMP_DIR/node_modules/axios"
# No package.json created

run_checker_test "check_no_package_json" "
const result = await checkDependencies({ 'axios': '^1.6.0' }, '$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  missing=$(jq -r '.missing[]' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$missing" == "axios" ]; then
    pass_test "Check missing package.json"
  else
    fail_test "Check missing package.json" "Expected axios in missing, got: $missing"
  fi
else
  fail_test "Check missing package.json" "Test execution failed"
fi
cleanup_test

# Test 15: isPackageInstalled() with existing package
echo "Test 15: isPackageInstalled() with existing package"
setup_test
mkdir -p "$TEST_TEMP_DIR/node_modules/axios"
cat > "$TEST_TEMP_DIR/node_modules/axios/package.json" <<'EOF'
{"name": "axios", "version": "1.6.0"}
EOF

run_checker_test "is_installed_true" "
const result = await isPackageInstalled('axios', '$TEST_TEMP_DIR');
console.log(JSON.stringify({ installed: result }));
"

if [ $? -eq 0 ]; then
  installed=$(jq -r '.installed' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$installed" == "true" ]; then
    pass_test "isPackageInstalled() with existing package"
  else
    fail_test "isPackageInstalled() with existing package" "Expected true, got: $installed"
  fi
else
  fail_test "isPackageInstalled() with existing package" "Test execution failed"
fi
cleanup_test

# Test 16: isPackageInstalled() with missing package
echo "Test 16: isPackageInstalled() with missing package"
setup_test

run_checker_test "is_installed_false" "
const result = await isPackageInstalled('axios', '$TEST_TEMP_DIR');
console.log(JSON.stringify({ installed: result }));
"

if [ $? -eq 0 ]; then
  installed=$(jq -r '.installed' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "true")
  if [ "$installed" == "false" ]; then
    pass_test "isPackageInstalled() with missing package"
  else
    fail_test "isPackageInstalled() with missing package" "Expected false, got: $installed"
  fi
else
  fail_test "isPackageInstalled() with missing package" "Test execution failed"
fi
cleanup_test

# Test 17: getInstalledVersion() returns correct version
echo "Test 17: getInstalledVersion() returns correct version"
setup_test
mkdir -p "$TEST_TEMP_DIR/node_modules/axios"
cat > "$TEST_TEMP_DIR/node_modules/axios/package.json" <<'EOF'
{"name": "axios", "version": "1.6.0"}
EOF

run_checker_test "get_version" "
const result = await getInstalledVersion('axios', '$TEST_TEMP_DIR');
console.log(JSON.stringify({ version: result }));
"

if [ $? -eq 0 ]; then
  version=$(jq -r '.version' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "null")
  if [ "$version" == "1.6.0" ]; then
    pass_test "getInstalledVersion() returns correct version"
  else
    fail_test "getInstalledVersion() returns correct version" "Expected 1.6.0, got: $version"
  fi
else
  fail_test "getInstalledVersion() returns correct version" "Test execution failed"
fi
cleanup_test

# Test 18: getInstalledVersion() returns null for missing
echo "Test 18: getInstalledVersion() returns null for missing"
setup_test

run_checker_test "get_version_null" "
const result = await getInstalledVersion('axios', '$TEST_TEMP_DIR');
console.log(JSON.stringify({ version: result }));
"

if [ $? -eq 0 ]; then
  version=$(jq -r '.version' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "error")
  if [ "$version" == "null" ]; then
    pass_test "getInstalledVersion() returns null for missing"
  else
    fail_test "getInstalledVersion() returns null for missing" "Expected null, got: $version"
  fi
else
  fail_test "getInstalledVersion() returns null for missing" "Test execution failed"
fi
cleanup_test

# Test 19: verifyVersion() with caret range
echo "Test 19: verifyVersion() with caret range"
setup_test

run_checker_test "verify_version_caret" "
const result1 = verifyVersion('1.6.5', '^1.6.0');
const result2 = verifyVersion('1.5.0', '^1.6.0');
const result3 = verifyVersion('2.0.0', '^1.6.0');
console.log(JSON.stringify({
  within_range: result1,
  below_range: result2,
  above_range: result3
}));
"

if [ $? -eq 0 ]; then
  within=$(jq -r '.within_range' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  below=$(jq -r '.below_range' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "true")
  above=$(jq -r '.above_range' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "true")

  if [ "$within" == "true" ] && [ "$below" == "false" ] && [ "$above" == "false" ]; then
    pass_test "verifyVersion() with caret range"
  else
    fail_test "verifyVersion() with caret range" "Expected true/false/false, got: $within/$below/$above"
  fi
else
  fail_test "verifyVersion() with caret range" "Test execution failed"
fi
cleanup_test

# Test 20: verifyVersion() with various semver ranges
echo "Test 20: verifyVersion() with various semver ranges"
setup_test

run_checker_test "verify_version_ranges" "
const exact = verifyVersion('1.6.0', '1.6.0');
const tilde = verifyVersion('1.6.5', '~1.6.0');
const gte = verifyVersion('2.0.0', '>=1.6.0');
const lt = verifyVersion('1.5.0', '<1.6.0');
console.log(JSON.stringify({
  exact,
  tilde,
  gte,
  lt
}));
"

if [ $? -eq 0 ]; then
  exact=$(jq -r '.exact' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  tilde=$(jq -r '.tilde' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  gte=$(jq -r '.gte' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  lt=$(jq -r '.lt' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")

  if [ "$exact" == "true" ] && [ "$tilde" == "true" ] && [ "$gte" == "true" ] && [ "$lt" == "true" ]; then
    pass_test "verifyVersion() with various semver ranges"
  else
    fail_test "verifyVersion() with various semver ranges" "Expected all true, got: $exact/$tilde/$gte/$lt"
  fi
else
  fail_test "verifyVersion() with various semver ranges" "Test execution failed"
fi
cleanup_test

# Summary
echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Tests run:    $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
  exit 0
else
  echo -e "${RED}✗ SOME TESTS FAILED${NC}"
  exit 1
fi
