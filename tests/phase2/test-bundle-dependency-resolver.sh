#!/usr/bin/env bash

# Bundling Feature - Dependency Resolver Unit Tests
# Tests the dependency-resolver.ts implementation
# CRITICAL: All tests MUST call real implementation, NO grep-based fake tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_TEMP_DIR="/tmp/mcp-test-dep-resolver-$$"

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
run_dep_resolver_test() {
  local test_name="$1"
  local test_script="$2"

  cat > "$TEST_TEMP_DIR/test-runner.ts" <<EOFTEST
import { resolveDependencies, detectNativeModules, isNativeModule, mergeDependencies, filterDependencies, detectPeerDependencies, getBuiltinModules } from '$MCP_ROOT/../dist/src/core/dependency-resolver.js';

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
echo "Bundling - Dependency Resolver Tests"
echo "========================================="
echo ""

# Test 1: Resolve inline dependencies
echo "Test 1: Resolve inline dependencies"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
export default server;
EOF

run_dep_resolver_test "resolve_inline" "
const deps = await resolveDependencies({ entryPoint: '$TEST_TEMP_DIR/server.ts' });
console.log(JSON.stringify({ deps }));
"

if [ $? -eq 0 ]; then
  axios=$(jq -r '.deps.dependencies.axios' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  zod=$(jq -r '.deps.dependencies.zod' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$axios" == "^1.6.0" ] && [ "$zod" == "^3.22.0" ]; then
    pass_test "Resolve inline dependencies"
  else
    fail_test "Resolve inline dependencies" "Expected axios and zod, got axios=$axios, zod=$zod"
  fi
else
  fail_test "Resolve inline dependencies" "Test execution failed"
fi
cleanup_test

# Test 2: Resolve from package.json
echo "Test 2: Resolve from package.json"
setup_test
cat > "$TEST_TEMP_DIR/package.json" <<'EOF'
{
  "dependencies": {
    "express": "^4.18.0",
    "lodash": "^4.17.21"
  }
}
EOF
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

run_dep_resolver_test "resolve_pkg_json" "
const deps = await resolveDependencies({ entryPoint: '$TEST_TEMP_DIR/server.ts', basePath: '$TEST_TEMP_DIR' });
console.log(JSON.stringify({ deps }));
"

if [ $? -eq 0 ]; then
  express=$(jq -r '.deps.dependencies.express' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$express" == "^4.18.0" ]; then
    pass_test "Resolve from package.json"
  else
    fail_test "Resolve from package.json" "Expected express, got: $express"
  fi
else
  fail_test "Resolve from package.json" "Test execution failed"
fi
cleanup_test

# Test 3: Inline takes precedence over package.json
echo "Test 3: Inline takes precedence over package.json"
setup_test
cat > "$TEST_TEMP_DIR/package.json" <<'EOF'
{
  "dependencies": {
    "axios": "^1.5.0"
  }
}
EOF
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
// /// dependencies
// axios@^1.6.0
// ///
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

run_dep_resolver_test "inline_precedence" "
const deps = await resolveDependencies({ entryPoint: '$TEST_TEMP_DIR/server.ts', basePath: '$TEST_TEMP_DIR' });
console.log(JSON.stringify({ deps }));
"

if [ $? -eq 0 ]; then
  axios=$(jq -r '.deps.dependencies.axios' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$axios" == "^1.6.0" ]; then
    pass_test "Inline takes precedence over package.json"
  else
    fail_test "Inline takes precedence over package.json" "Expected ^1.6.0, got: $axios"
  fi
else
  fail_test "Inline takes precedence over package.json" "Test execution failed"
fi
cleanup_test

# Test 4: Detect native modules
echo "Test 4: Detect native modules"
setup_test

run_dep_resolver_test "detect_native" "
const nativeModules = detectNativeModules(['axios', 'fsevents', 'better-sqlite3', 'express']);
console.log(JSON.stringify({ nativeModules }));
"

if [ $? -eq 0 ]; then
  count=$(jq -r '.nativeModules | length' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "0")
  if [ "$count" -ge 2 ]; then
    pass_test "Detect native modules"
  else
    fail_test "Detect native modules" "Expected at least 2 native modules, got: $count"
  fi
else
  fail_test "Detect native modules" "Test execution failed"
fi
cleanup_test

# Test 5: isNativeModule function
echo "Test 5: isNativeModule function"
setup_test

run_dep_resolver_test "is_native_module" "
const isFsevents = isNativeModule('fsevents');
const isAxios = isNativeModule('axios');
console.log(JSON.stringify({ isFsevents, isAxios }));
"

if [ $? -eq 0 ]; then
  is_fsevents=$(jq -r '.isFsevents' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  is_axios=$(jq -r '.isAxios' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "true")
  if [ "$is_fsevents" == "true" ] && [ "$is_axios" == "false" ]; then
    pass_test "isNativeModule function"
  else
    fail_test "isNativeModule function" "Expected fsevents=true, axios=false, got: fsevents=$is_fsevents, axios=$is_axios"
  fi
else
  fail_test "isNativeModule function" "Test execution failed"
fi
cleanup_test

# Test 6: Merge dependencies
echo "Test 6: Merge dependencies"
setup_test

run_dep_resolver_test "merge_deps" "
const merged = mergeDependencies(
  { axios: '^1.5.0', lodash: '^4.17.0' },
  { axios: '^1.6.0', express: '^4.18.0' }
);
console.log(JSON.stringify({ merged }));
"

if [ $? -eq 0 ]; then
  axios=$(jq -r '.merged.axios' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  express=$(jq -r '.merged.express' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$axios" == "^1.6.0" ] && [ "$express" == "^4.18.0" ]; then
    pass_test "Merge dependencies"
  else
    fail_test "Merge dependencies" "Expected merged deps, got axios=$axios, express=$express"
  fi
else
  fail_test "Merge dependencies" "Test execution failed"
fi
cleanup_test

# Test 7: Filter dependencies - include pattern
echo "Test 7: Filter dependencies - include pattern"
setup_test

run_dep_resolver_test "filter_include" "
const deps = { 'axios': '^1.0.0', '@types/node': '^20.0.0', '@types/react': '^18.0.0' };
const filtered = filterDependencies(deps, [/^@types\\//], true);
console.log(JSON.stringify({ filtered }));
"

if [ $? -eq 0 ]; then
  count=$(jq -r '.filtered | keys | length' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "0")
  has_types=$(jq -r '.filtered["@types/node"]' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "null")
  if [ "$count" == "2" ] && [ "$has_types" != "null" ]; then
    pass_test "Filter dependencies - include pattern"
  else
    fail_test "Filter dependencies - include pattern" "Expected 2 @types packages, got count=$count"
  fi
else
  fail_test "Filter dependencies - include pattern" "Test execution failed"
fi
cleanup_test

# Test 8: Filter dependencies - exclude pattern
echo "Test 8: Filter dependencies - exclude pattern"
setup_test

run_dep_resolver_test "filter_exclude" "
const deps = { 'axios': '^1.0.0', '@types/node': '^20.0.0', 'zod': '^3.0.0' };
const filtered = filterDependencies(deps, [/^@types\\//], false);
console.log(JSON.stringify({ filtered }));
"

if [ $? -eq 0 ]; then
  count=$(jq -r '.filtered | keys | length' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "0")
  has_axios=$(jq -r '.filtered.axios' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "null")
  if [ "$count" == "2" ] && [ "$has_axios" != "null" ]; then
    pass_test "Filter dependencies - exclude pattern"
  else
    fail_test "Filter dependencies - exclude pattern" "Expected 2 non-@types packages, got count=$count"
  fi
else
  fail_test "Filter dependencies - exclude pattern" "Test execution failed"
fi
cleanup_test

# Test 9: Detect peer dependencies
echo "Test 9: Detect peer dependencies"
setup_test
cat > "$TEST_TEMP_DIR/package.json" <<'EOF'
{
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
EOF

run_dep_resolver_test "detect_peer_deps" "
const peerDeps = await detectPeerDependencies('$TEST_TEMP_DIR');
console.log(JSON.stringify({ peerDeps }));
"

if [ $? -eq 0 ]; then
  count=$(jq -r '.peerDeps | length' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "0")
  if [ "$count" == "2" ]; then
    pass_test "Detect peer dependencies"
  else
    fail_test "Detect peer dependencies" "Expected 2 peer dependencies, got: $count"
  fi
else
  fail_test "Detect peer dependencies" "Test execution failed"
fi
cleanup_test

# Test 10: Get builtin modules
echo "Test 10: Get builtin modules"
setup_test

run_dep_resolver_test "builtin_modules" "
const builtins = getBuiltinModules();
console.log(JSON.stringify({ builtins, count: builtins.length }));
"

if [ $? -eq 0 ]; then
  count=$(jq -r '.count' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "0")
  has_fs=$(jq -r '.builtins | any(. == "fs")' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  has_path=$(jq -r '.builtins | any(. == "path")' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$count" -gt 10 ] && [ "$has_fs" = "true" ] && [ "$has_path" = "true" ]; then
    pass_test "Get builtin modules"
  else
    fail_test "Get builtin modules" "Expected builtin modules list, got count=$count, has_fs=$has_fs, has_path=$has_path"
  fi
else
  fail_test "Get builtin modules" "Test execution failed"
fi
cleanup_test

# Test 11: Native module patterns
echo "Test 11: Native module patterns"
setup_test

run_dep_resolver_test "native_patterns" "
const modules = ['node-gyp', 'my-native', '@node-rs/bcrypt', '@napi-rs/canvas'];
const native = detectNativeModules(modules);
console.log(JSON.stringify({ native, count: native.length }));
"

if [ $? -eq 0 ]; then
  count=$(jq -r '.count' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "0")
  if [ "$count" -ge 3 ]; then
    pass_test "Native module patterns"
  else
    fail_test "Native module patterns" "Expected at least 3 native modules, got: $count"
  fi
else
  fail_test "Native module patterns" "Test execution failed"
fi
cleanup_test

# Test 12: Empty dependencies
echo "Test 12: Empty dependencies"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

run_dep_resolver_test "empty_deps" "
const deps = await resolveDependencies({ entryPoint: '$TEST_TEMP_DIR/server.ts' });
console.log(JSON.stringify({ deps, count: Object.keys(deps.dependencies).length }));
"

if [ $? -eq 0 ]; then
  count=$(jq -r '.count' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "-1")
  if [ "$count" -ge 0 ]; then
    pass_test "Empty dependencies"
  else
    fail_test "Empty dependencies" "Expected valid count, got: $count"
  fi
else
  fail_test "Empty dependencies" "Test execution failed"
fi
cleanup_test

# Test 13: devDependencies included
echo "Test 13: devDependencies included"
setup_test
cat > "$TEST_TEMP_DIR/package.json" <<'EOF'
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "typescript": "^5.3.0"
  }
}
EOF
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

run_dep_resolver_test "dev_deps" "
const deps = await resolveDependencies({ entryPoint: '$TEST_TEMP_DIR/server.ts', basePath: '$TEST_TEMP_DIR' });
console.log(JSON.stringify({ deps }));
"

if [ $? -eq 0 ]; then
  vitest=$(jq -r '.deps.dependencies.vitest' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")
  if [ "$vitest" == "^1.0.0" ]; then
    pass_test "devDependencies included"
  else
    fail_test "devDependencies included" "Expected vitest, got: $vitest"
  fi
else
  fail_test "devDependencies included" "Test execution failed"
fi
cleanup_test

# Test 14: Inline dependency errors captured
echo "Test 14: Inline dependency errors captured"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
// /// dependencies
// package!invalid
// ///
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

run_dep_resolver_test "inline_errors" "
const deps = await resolveDependencies({ entryPoint: '$TEST_TEMP_DIR/server.ts' });
console.log(JSON.stringify({ errors: deps.inlineDependencies.errors, errorCount: deps.inlineDependencies.errors.length }));
"

if [ $? -eq 0 ]; then
  error_count=$(jq -r '.errorCount' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "0")
  if [ "$error_count" -gt 0 ]; then
    pass_test "Inline dependency errors captured"
  else
    fail_test "Inline dependency errors captured" "Expected errors, got: $error_count"
  fi
else
  fail_test "Inline dependency errors captured" "Test execution failed"
fi
cleanup_test

# Test 15: Native modules marked for external
echo "Test 15: Native modules marked for external"
setup_test
cat > "$TEST_TEMP_DIR/server.ts" <<'EOF'
// /// dependencies
// fsevents@^2.3.0
// axios@^1.6.0
// ///
import { SimplyMCP } from 'simply-mcp';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
EOF

run_dep_resolver_test "native_external" "
const deps = await resolveDependencies({ entryPoint: '$TEST_TEMP_DIR/server.ts' });
console.log(JSON.stringify({ nativeModules: deps.nativeModules }));
"

if [ $? -eq 0 ]; then
  has_fsevents=$(jq -r '.nativeModules | any(. == "fsevents")' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  if [ "$has_fsevents" == "true" ]; then
    pass_test "Native modules marked for external"
  else
    fail_test "Native modules marked for external" "Expected fsevents in nativeModules"
  fi
else
  fail_test "Native modules marked for external" "Test execution failed"
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
