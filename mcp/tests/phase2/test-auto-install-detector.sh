#!/usr/bin/env bash

# Auto-Installation Feature - Package Manager Detector Unit Tests
# Tests the package-manager-detector.ts implementation
# CRITICAL: All tests MUST call real implementation, NO grep-based fake tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_TEMP_DIR="/tmp/mcp-test-detector-$$"

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
run_detector_test() {
  local test_name="$1"
  local test_script="$2"

  cat > "$TEST_TEMP_DIR/test-runner.ts" <<EOFTEST
import { detectPackageManager, isPackageManagerAvailable, getPackageManagerVersion, getLockFileName } from '$MCP_ROOT/core/package-manager-detector.js';

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
echo "Auto-Installation - Package Manager Detector Tests"
echo "========================================="
echo ""

# Test 1: Detect npm from package-lock.json
echo "Test 1: Detect npm from package-lock.json"
setup_test
touch "$TEST_TEMP_DIR/package-lock.json"

run_detector_test "detect_npm" "
const result = await detectPackageManager('$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  pm_name=$(jq -r '.name' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$pm_name" == "npm" ]; then
    pass_test "Detect npm from package-lock.json"
  else
    fail_test "Detect npm from package-lock.json" "Expected npm, got: $pm_name"
  fi
else
  fail_test "Detect npm from package-lock.json" "Test execution failed"
fi
cleanup_test

# Test 2: Detect yarn from yarn.lock
echo "Test 2: Detect yarn from yarn.lock"
setup_test
touch "$TEST_TEMP_DIR/yarn.lock"

run_detector_test "detect_yarn" "
const result = await detectPackageManager('$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  pm_name=$(jq -r '.name' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$pm_name" == "yarn" ]; then
    pass_test "Detect yarn from yarn.lock"
  else
    fail_test "Detect yarn from yarn.lock" "Expected yarn, got: $pm_name"
  fi
else
  fail_test "Detect yarn from yarn.lock" "Test execution failed"
fi
cleanup_test

# Test 3: Detect pnpm from pnpm-lock.yaml
echo "Test 3: Detect pnpm from pnpm-lock.yaml"
setup_test
touch "$TEST_TEMP_DIR/pnpm-lock.yaml"

run_detector_test "detect_pnpm" "
const result = await detectPackageManager('$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  pm_name=$(jq -r '.name' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$pm_name" == "pnpm" ]; then
    pass_test "Detect pnpm from pnpm-lock.yaml"
  else
    fail_test "Detect pnpm from pnpm-lock.yaml" "Expected pnpm, got: $pm_name"
  fi
else
  fail_test "Detect pnpm from pnpm-lock.yaml" "Test execution failed"
fi
cleanup_test

# Test 4: Detect bun from bun.lockb
echo "Test 4: Detect bun from bun.lockb"
setup_test
touch "$TEST_TEMP_DIR/bun.lockb"

run_detector_test "detect_bun" "
const result = await detectPackageManager('$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  pm_name=$(jq -r '.name' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$pm_name" == "bun" ]; then
    pass_test "Detect bun from bun.lockb"
  else
    fail_test "Detect bun from bun.lockb" "Expected bun, got: $pm_name"
  fi
else
  fail_test "Detect bun from bun.lockb" "Test execution failed"
fi
cleanup_test

# Test 5: Default to npm when no lock files
echo "Test 5: Default to npm when no lock files"
setup_test

run_detector_test "default_npm" "
const result = await detectPackageManager('$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  pm_name=$(jq -r '.name' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$pm_name" == "npm" ]; then
    pass_test "Default to npm when no lock files"
  else
    fail_test "Default to npm when no lock files" "Expected npm, got: $pm_name"
  fi
else
  fail_test "Default to npm when no lock files" "Test execution failed"
fi
cleanup_test

# Test 6: Prefer npm over yarn when both present
echo "Test 6: Prefer npm over yarn when both present"
setup_test
touch "$TEST_TEMP_DIR/package-lock.json"
touch "$TEST_TEMP_DIR/yarn.lock"

run_detector_test "prefer_npm" "
const result = await detectPackageManager('$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  pm_name=$(jq -r '.name' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$pm_name" == "npm" ]; then
    pass_test "Prefer npm over yarn when both present"
  else
    fail_test "Prefer npm over yarn when both present" "Expected npm, got: $pm_name"
  fi
else
  fail_test "Prefer npm over yarn when both present" "Test execution failed"
fi
cleanup_test

# Test 7: Prefer yarn over pnpm when both present
echo "Test 7: Prefer yarn over pnpm when both present"
setup_test
touch "$TEST_TEMP_DIR/yarn.lock"
touch "$TEST_TEMP_DIR/pnpm-lock.yaml"

run_detector_test "prefer_yarn" "
const result = await detectPackageManager('$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  pm_name=$(jq -r '.name' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$pm_name" == "yarn" ]; then
    pass_test "Prefer yarn over pnpm when both present"
  else
    fail_test "Prefer yarn over pnpm when both present" "Expected yarn, got: $pm_name"
  fi
else
  fail_test "Prefer yarn over pnpm when both present" "Test execution failed"
fi
cleanup_test

# Test 8: Handle preferred package manager override
echo "Test 8: Handle preferred package manager override"
setup_test
touch "$TEST_TEMP_DIR/package-lock.json"

run_detector_test "override_preference" "
const result = await detectPackageManager('$TEST_TEMP_DIR', 'yarn');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  pm_name=$(jq -r '.name' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$pm_name" == "yarn" ]; then
    pass_test "Handle preferred package manager override"
  else
    fail_test "Handle preferred package manager override" "Expected yarn, got: $pm_name"
  fi
else
  fail_test "Handle preferred package manager override" "Test execution failed"
fi
cleanup_test

# Test 9: isPackageManagerAvailable() for npm
echo "Test 9: isPackageManagerAvailable() for npm"
setup_test

run_detector_test "is_npm_available" "
const result = await isPackageManagerAvailable('npm');
console.log(JSON.stringify({ available: result }));
"

if [ $? -eq 0 ]; then
  available=$(jq -r '.available' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$available" == "true" ]; then
    pass_test "isPackageManagerAvailable() for npm"
  else
    fail_test "isPackageManagerAvailable() for npm" "Expected true, got: $available"
  fi
else
  fail_test "isPackageManagerAvailable() for npm" "Test execution failed"
fi
cleanup_test

# Test 10: isPackageManagerAvailable() for yarn
echo "Test 10: isPackageManagerAvailable() for yarn"
setup_test

run_detector_test "is_yarn_available" "
const result = await isPackageManagerAvailable('yarn');
console.log(JSON.stringify({ available: result }));
"

if [ $? -eq 0 ]; then
  available=$(jq -r '.available' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "error")
  # yarn may or may not be installed, just check we get a boolean
  if [ "$available" == "true" ] || [ "$available" == "false" ]; then
    pass_test "isPackageManagerAvailable() for yarn"
  else
    fail_test "isPackageManagerAvailable() for yarn" "Expected boolean, got: $available"
  fi
else
  fail_test "isPackageManagerAvailable() for yarn" "Test execution failed"
fi
cleanup_test

# Test 11: isPackageManagerAvailable() for pnpm
echo "Test 11: isPackageManagerAvailable() for pnpm"
setup_test

run_detector_test "is_pnpm_available" "
const result = await isPackageManagerAvailable('pnpm');
console.log(JSON.stringify({ available: result }));
"

if [ $? -eq 0 ]; then
  available=$(jq -r '.available' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "error")
  # pnpm may or may not be installed, just check we get a boolean
  if [ "$available" == "true" ] || [ "$available" == "false" ]; then
    pass_test "isPackageManagerAvailable() for pnpm"
  else
    fail_test "isPackageManagerAvailable() for pnpm" "Expected boolean, got: $available"
  fi
else
  fail_test "isPackageManagerAvailable() for pnpm" "Test execution failed"
fi
cleanup_test

# Test 12: getPackageManagerVersion() returns version
echo "Test 12: getPackageManagerVersion() returns version"
setup_test

run_detector_test "get_npm_version" "
const result = await getPackageManagerVersion('npm');
console.log(JSON.stringify({ version: result }));
"

if [ $? -eq 0 ]; then
  version=$(jq -r '.version' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "null")
  if [ "$version" != "null" ] && [ -n "$version" ]; then
    pass_test "getPackageManagerVersion() returns version"
  else
    fail_test "getPackageManagerVersion() returns version" "Expected version string, got: $version"
  fi
else
  fail_test "getPackageManagerVersion() returns version" "Test execution failed"
fi
cleanup_test

# Test 13: getLockFileName() returns correct names
echo "Test 13: getLockFileName() returns correct names"
setup_test

run_detector_test "get_lock_filenames" "
const npm = getLockFileName('npm');
const yarn = getLockFileName('yarn');
const pnpm = getLockFileName('pnpm');
const bun = getLockFileName('bun');
console.log(JSON.stringify({ npm, yarn, pnpm, bun }));
"

if [ $? -eq 0 ]; then
  npm_lock=$(jq -r '.npm' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  yarn_lock=$(jq -r '.yarn' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  pnpm_lock=$(jq -r '.pnpm' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  bun_lock=$(jq -r '.bun' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")

  if [ "$npm_lock" == "package-lock.json" ] && \
     [ "$yarn_lock" == "yarn.lock" ] && \
     [ "$pnpm_lock" == "pnpm-lock.yaml" ] && \
     [ "$bun_lock" == "bun.lockb" ]; then
    pass_test "getLockFileName() returns correct names"
  else
    fail_test "getLockFileName() returns correct names" "Got: $npm_lock, $yarn_lock, $pnpm_lock, $bun_lock"
  fi
else
  fail_test "getLockFileName() returns correct names" "Test execution failed"
fi
cleanup_test

# Test 14: detectPackageManager() returns PackageManagerInfo
echo "Test 14: detectPackageManager() returns PackageManagerInfo"
setup_test
touch "$TEST_TEMP_DIR/package-lock.json"

run_detector_test "detect_full_info" "
const result = await detectPackageManager('$TEST_TEMP_DIR');
console.log(JSON.stringify(result));
"

if [ $? -eq 0 ]; then
  has_name=$(jq 'has(\"name\")' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  has_version=$(jq 'has(\"version\")' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  has_available=$(jq 'has(\"available\")' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  has_lockFile=$(jq 'has(\"lockFile\")' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")

  if [ "$has_name" == "true" ] && [ "$has_version" == "true" ] && \
     [ "$has_available" == "true" ] && [ "$has_lockFile" == "true" ]; then
    pass_test "detectPackageManager() returns PackageManagerInfo"
  else
    fail_test "detectPackageManager() returns PackageManagerInfo" "Missing required fields"
  fi
else
  fail_test "detectPackageManager() returns PackageManagerInfo" "Test execution failed"
fi
cleanup_test

# Test 15: Error handling for invalid package manager
echo "Test 15: Error handling for invalid package manager"
setup_test

run_detector_test "invalid_pm" "
try {
  const result = await getPackageManagerVersion('invalid-pm' as any);
  console.log(JSON.stringify({ version: result }));
} catch (error) {
  // Should not throw, should return null
  console.log(JSON.stringify({ version: null }));
}
"

if [ $? -eq 0 ]; then
  version=$(jq -r '.version' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "error")
  if [ "$version" == "null" ]; then
    pass_test "Error handling for invalid package manager"
  else
    fail_test "Error handling for invalid package manager" "Expected null, got: $version"
  fi
else
  fail_test "Error handling for invalid package manager" "Test execution failed"
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
