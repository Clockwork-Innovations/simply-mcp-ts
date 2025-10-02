#!/bin/bash
###############################################################################
# End-to-End Tests for Inline Dependencies
#
# Tests complete workflows from file creation to server execution.
# Real file operations, real parsing, real validation.
#
# Usage: bash mcp/tests/phase2/test-inline-deps-e2e.sh
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_DIR="/tmp/mcp-inline-deps-e2e-$$"
FIXTURES_DIR="$SCRIPT_DIR/fixtures/inline-deps"

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Inline Dependencies - E2E Tests${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Create temp directory
mkdir -p "$TEMP_DIR"

# Cleanup on exit
cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Helper function to run a test
run_test() {
  local test_num=$1
  local test_name=$2
  shift 2

  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo -ne "${YELLOW}E2E Test $test_num: $test_name${NC} ... "

  if "$@" > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    return 0
  else
    echo -e "${RED}FAIL${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
  fi
}

# ============================================================================
# E2E Test 1: Complete Workflow - Parse → Validate → Success
# ============================================================================
test_parse_validate_success() {
  local server_file="$TEMP_DIR/test1.ts"
  cat > "$server_file" << 'EOF'
// /// dependencies
// zod@^3.22.0
// ///

import { SimpleMCP } from '../../../SimpleMCP.js';
const server = new SimpleMCP({ name: 'test', version: '1.0.0' });
EOF

  npx tsx -e "
import { readFile } from 'fs/promises';
import { parseInlineDependencies } from './mcp/core/dependency-parser.js';
import { validateDependencies } from './mcp/core/dependency-validator.js';

(async () => {
  (async () => {
  const source = await readFile('$server_file', 'utf-8');
  const result = parseInlineDependencies(source);
  const validation = validateDependencies(result.dependencies);

  if (result.errors.length > 0) process.exit(1);
  if (!validation.valid) process.exit(1);
  if (!result.dependencies.zod) process.exit(1);

    process.exit(0);
})();
})();
"
}

run_test 1 "Complete workflow (parse → validate → success)" test_parse_validate_success

# ============================================================================
# E2E Test 2: Invalid Deps → Parse → Validate → Error
# ============================================================================
test_invalid_deps_error() {
  local server_file="$TEMP_DIR/test2.ts"
  cat > "$server_file" << 'EOF'
// /// dependencies
// INVALID@^1.0.0
// ///
EOF

  npx tsx -e "
import { readFile } from 'fs/promises';
import { parseInlineDependencies } from './mcp/core/dependency-parser.js';

(async () => {
  const source = await readFile('$server_file', 'utf-8');
const result = parseInlineDependencies(source);

if (result.errors.length === 0) process.exit(1);
if (result.errors.some(e => e.type === 'INVALID_NAME'))   process.exit(0);
})();

process.exit(1);
"
}

run_test 2 "Invalid deps detected with helpful error" test_invalid_deps_error

# ============================================================================
# E2E Test 3: Generate package.json from inline deps
# ============================================================================
test_generate_packagejson() {
  local server_file="$TEMP_DIR/test3.ts"
  local pkg_file="$TEMP_DIR/test3-package.json"

  cat > "$server_file" << 'EOF'
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///
EOF

  npx tsx -e "
import { readFile, writeFile } from 'fs/promises';
import { parseInlineDependencies } from './mcp/core/dependency-parser.js';
import { generatePackageJson } from './mcp/core/dependency-utils.js';

(async () => {
  const source = await readFile('$server_file', 'utf-8');
const result = parseInlineDependencies(source);
const pkg = generatePackageJson(result.dependencies, {
  name: 'test-server',
  version: '1.0.0'
});

await writeFile('$pkg_file', JSON.stringify(pkg, null, 2));

const savedPkg = JSON.parse(await readFile('$pkg_file', 'utf-8'));
if (!savedPkg.dependencies.axios) process.exit(1);
if (!savedPkg.dependencies.zod) process.exit(1);

  process.exit(0);
})();
"
}

run_test 3 "Generate package.json from inline deps" test_generate_packagejson

# ============================================================================
# E2E Test 4: Merge inline deps with existing package.json
# ============================================================================
test_merge_deps() {
  local inline_file="$TEMP_DIR/test4.ts"
  local pkg_file="$TEMP_DIR/test4-package.json"

  cat > "$inline_file" << 'EOF'
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///
EOF

  cat > "$pkg_file" << 'EOF'
{
  "name": "test",
  "version": "1.0.0",
  "dependencies": {
    "lodash": "^4.17.21"
  }
}
EOF

  npx tsx -e "
import { readFile } from 'fs/promises';
import { parseInlineDependencies } from './mcp/core/dependency-parser.js';
import { mergeDependencies } from './mcp/core/dependency-utils.js';

(async () => {
  const source = await readFile('$inline_file', 'utf-8');
const result = parseInlineDependencies(source);
const pkg = JSON.parse(await readFile('$pkg_file', 'utf-8'));

const merged = mergeDependencies(result.dependencies, pkg);

if (!merged.dependencies.axios) process.exit(1);
if (!merged.dependencies.zod) process.exit(1);
if (!merged.dependencies.lodash) process.exit(1);
if (merged.conflicts.length > 0) process.exit(1);

  process.exit(0);
})();
"
}

run_test 4 "Merge inline deps with existing package.json" test_merge_deps

# ============================================================================
# E2E Test 5: SimpleMCP.fromFile() → Dependencies accessible
# ============================================================================
test_simplemcp_fromfile() {
  local server_file="$FIXTURES_DIR/real-server.ts"

  npx tsx -e "
import { SimpleMCP } from './mcp/SimpleMCP.js';

const server = await SimpleMCP.fromFile('$server_file', {
  name: 'test',
  version: '1.0.0'
});

if (!server.hasDependency('zod')) process.exit(1);
if (server.getDependencyVersion('zod') !== '^3.22.0') process.exit(1);

const deps = server.getDependencies();
if (!deps || Object.keys(deps.map).length === 0) process.exit(1);

  process.exit(0);
})();
"
}

run_test 5 "SimpleMCP.fromFile() parses and exposes deps" test_simplemcp_fromfile

# ============================================================================
# E2E Test 6: Missing dependency → Error detected
# ============================================================================
test_missing_dep_error() {
  local server_file="$TEMP_DIR/test6.ts"

  cat > "$server_file" << 'EOF'
// /// dependencies
// non-existent-package-xyz@^1.0.0
// ///
EOF

  npx tsx -e "
import { readFile } from 'fs/promises';
import { parseInlineDependencies } from './mcp/core/dependency-parser.js';
import { validateDependencies } from './mcp/core/dependency-validator.js';

(async () => {
  const source = await readFile('$server_file', 'utf-8');
const result = parseInlineDependencies(source);
const validation = validateDependencies(result.dependencies);

// Package name is valid, so no errors expected from parsing
// This test verifies the parser doesn't reject valid but non-existent packages
if (Object.keys(result.dependencies).length === 0) process.exit(1);

  process.exit(0);
})();
"
}

run_test 6 "Valid but non-existent package names accepted" test_missing_dep_error

# ============================================================================
# E2E Test 7: Conflicting versions → Detected
# ============================================================================
test_conflicting_versions() {
  local inline_file="$TEMP_DIR/test7.ts"
  local pkg_file="$TEMP_DIR/test7-package.json"

  cat > "$inline_file" << 'EOF'
// /// dependencies
// axios@^1.6.0
// ///
EOF

  cat > "$pkg_file" << 'EOF'
{
  "name": "test",
  "version": "1.0.0",
  "dependencies": {
    "axios": "^1.5.0"
  }
}
EOF

  npx tsx -e "
import { readFile } from 'fs/promises';
import { parseInlineDependencies } from './mcp/core/dependency-parser.js';
import { mergeDependencies } from './mcp/core/dependency-utils.js';

(async () => {
  const source = await readFile('$inline_file', 'utf-8');
const result = parseInlineDependencies(source);
const pkg = JSON.parse(await readFile('$pkg_file', 'utf-8'));

const merged = mergeDependencies(result.dependencies, pkg);

if (merged.conflicts.length === 0) process.exit(1);
if (!merged.conflicts.includes('axios')) process.exit(1);
if (merged.warnings.length === 0) process.exit(1);

// package.json version should win
if (merged.dependencies.axios !== '^1.5.0') process.exit(1);

  process.exit(0);
})();
"
}

run_test 7 "Conflicting versions detected and reported" test_conflicting_versions

# ============================================================================
# E2E Test 8: Large project (20+ deps) → Parse → Validate
# ============================================================================
test_large_project() {
  local server_file="$FIXTURES_DIR/large-list.txt"

  npx tsx -e "
import { readFile } from 'fs/promises';
import { parseInlineDependencies } from './mcp/core/dependency-parser.js';
import { validateDependencies } from './mcp/core/dependency-validator.js';

(async () => {
  const source = await readFile('$server_file', 'utf-8');
const result = parseInlineDependencies(source);
const validation = validateDependencies(result.dependencies);

if (Object.keys(result.dependencies).length < 20) process.exit(1);
if (!validation.valid) process.exit(1);

  process.exit(0);
})();
"
}

run_test 8 "Large project (20+ deps) parses successfully" test_large_project

# ============================================================================
# E2E Test 9: Security injection → Blocked
# ============================================================================
test_security_injection() {
  local server_file="$FIXTURES_DIR/security-injection.txt"

  npx tsx -e "
import { readFile } from 'fs/promises';
import { parseInlineDependencies } from './mcp/core/dependency-parser.js';

(async () => {
  const source = await readFile('$server_file', 'utf-8');
const result = parseInlineDependencies(source);

// All malicious entries should have errors
if (result.errors.length === 0) process.exit(1);

// No dependencies should be successfully parsed
if (Object.keys(result.dependencies).length > 0) process.exit(1);

  process.exit(0);
})();
"
}

run_test 9 "Security injection attempts blocked" test_security_injection

# ============================================================================
# E2E Test 10: Real-world example → Full workflow
# ============================================================================
test_real_world() {
  local server_file="$FIXTURES_DIR/valid-comments.txt"

  npx tsx -e "
import { readFile } from 'fs/promises';
import { parseInlineDependencies } from './mcp/core/dependency-parser.js';
import { validateDependencies } from './mcp/core/dependency-validator.js';
import { generatePackageJson } from './mcp/core/dependency-utils.js';
import { getDependencyStats } from './mcp/core/dependency-utils.js';

// Parse
(async () => {
  const source = await readFile('$server_file', 'utf-8');
const result = parseInlineDependencies(source);

if (result.errors.length > 0) {
  console.error('Parse errors:', result.errors);
  process.exit(1);
}

// Validate
const validation = validateDependencies(result.dependencies);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  process.exit(1);
}

// Get stats
const stats = getDependencyStats(result.dependencies);
if (stats.total === 0) process.exit(1);

// Generate package.json
const pkg = generatePackageJson(result.dependencies, {
  name: 'real-server',
  version: '1.0.0'
});

if (!pkg.dependencies) process.exit(1);

  process.exit(0);
})();
"
}

run_test 10 "Real-world example complete workflow" test_real_world

# Summary
echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}E2E Test Summary${NC}"
echo -e "${BLUE}==========================================${NC}"
echo -e "Total tests:  $TOTAL_TESTS"
echo -e "${GREEN}Passed:       $PASSED_TESTS${NC}"
if [ $FAILED_TESTS -gt 0 ]; then
  echo -e "${RED}Failed:       $FAILED_TESTS${NC}"
else
  echo -e "Failed:       $FAILED_TESTS"
fi
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}All E2E tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some E2E tests failed.${NC}"
  exit 1
fi
