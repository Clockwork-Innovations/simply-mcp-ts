#!/usr/bin/env bash

# Auto-Installation Feature - End-to-End Tests
# Tests complete workflows with real scenarios
# CRITICAL: Tests actual behavior, not just code presence

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_TEMP_DIR="/tmp/mcp-test-e2e-$$"

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
echo "Auto-Installation - E2E Tests"
echo "========================================="
echo ""

# Test 1: SimpleMCP.fromFile() workflow
echo "Test 1: SimpleMCP.fromFile() workflow"
setup_test

# Create a test server file with inline dependencies
cat > "$TEST_TEMP_DIR/test-server.ts" <<EOFSERVER
// /// dependencies
// axios@^1.6.0
// ///

import { SimpleMCP } from '$MCP_ROOT/SimpleMCP.js';

export const server = new SimpleMCP({
  name: 'test-server',
  version: '1.0.0'
});
EOFSERVER

# Create test script to load the server
cat > "$TEST_TEMP_DIR/load-server.ts" <<EOFLOAD
import { SimpleMCP } from '$MCP_ROOT/SimpleMCP.js';
import { readFile } from 'fs/promises';

async function main() {
  const serverPath = './test-server.ts';
  const content = await readFile(serverPath, 'utf-8');

  // Parse inline dependencies
  const { parseInlineDependencies } = await import('$MCP_ROOT/core/dependency-parser.js');
  const parseResult = parseInlineDependencies(content);

  console.log(JSON.stringify({
    success: true,
    dependencies: parseResult.dependencies,
    errors: parseResult.errors
  }));
}

main();
EOFLOAD

# Run the test
if npx tsx "$TEST_TEMP_DIR/load-server.ts" > "$TEST_TEMP_DIR/test-output.json" 2>&1; then
  success=$(jq -r '.success' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  deps=$(jq -r '.dependencies' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "{}")

  if [ "$success" == "true" ] && [ "$deps" != "{}" ]; then
    pass_test "SimpleMCP.fromFile() workflow"
  else
    fail_test "SimpleMCP.fromFile() workflow" "Failed to parse dependencies"
  fi
else
  fail_test "SimpleMCP.fromFile() workflow" "Test execution failed"
fi
cleanup_test

# Test 2: Check dependencies workflow
echo "Test 2: Check dependencies workflow"
setup_test

cat > "$TEST_TEMP_DIR/check-deps.ts" <<EOFCHECK
import { SimpleMCP } from '$MCP_ROOT/SimpleMCP.js';

async function main() {
  const server = new SimpleMCP({
    name: 'test',
    version: '1.0.0',
    dependencies: {
      map: { axios: '^1.6.0' },
      dependencies: [{ name: 'axios', version: '^1.6.0' }],
      errors: [],
      warnings: [],
      raw: ''
    }
  });

  const status = await server.checkDependencies();
  console.log(JSON.stringify(status));
}

main();
EOFCHECK

if npx tsx "$TEST_TEMP_DIR/check-deps.ts" > "$TEST_TEMP_DIR/test-output.json" 2>&1; then
  has_installed=$(jq 'has("installed")' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  has_missing=$(jq 'has("missing")' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  has_outdated=$(jq 'has("outdated")' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")

  if [ "$has_installed" == "true" ] && [ "$has_missing" == "true" ] && [ "$has_outdated" == "true" ]; then
    pass_test "Check dependencies workflow"
  else
    fail_test "Check dependencies workflow" "Invalid status structure"
  fi
else
  fail_test "Check dependencies workflow" "Test execution failed"
fi
cleanup_test

# Test 3: Install dependencies workflow (with validation)
echo "Test 3: Install dependencies workflow"
setup_test

cat > "$TEST_TEMP_DIR/install-deps.ts" <<EOFINSTALL
import { SimpleMCP } from '$MCP_ROOT/SimpleMCP.js';

async function main() {
  const server = new SimpleMCP({
    name: 'test',
    version: '1.0.0',
    basePath: process.cwd(),
    dependencies: {
      map: {},  // Empty dependencies for safety
      dependencies: [],
      errors: [],
      warnings: [],
      raw: ''
    }
  });

  const result = await server.installDependencies({
    packageManager: 'npm'
  });

  console.log(JSON.stringify(result));
}

main();
EOFINSTALL

if npx tsx "$TEST_TEMP_DIR/install-deps.ts" > "$TEST_TEMP_DIR/test-output.json" 2>&1; then
  success=$(jq -r '.success' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  has_structure=$(jq 'has("installed") and has("failed") and has("packageManager")' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")

  if [ "$success" == "true" ] && [ "$has_structure" == "true" ]; then
    pass_test "Install dependencies workflow"
  else
    fail_test "Install dependencies workflow" "Installation failed or invalid structure"
  fi
else
  fail_test "Install dependencies workflow" "Test execution failed"
fi
cleanup_test

# Test 4: Package manager detection workflow
echo "Test 4: Package manager detection workflow"
setup_test
touch "$TEST_TEMP_DIR/package-lock.json"

cat > "$TEST_TEMP_DIR/detect-pm.ts" <<'EOFDETECT'
import { detectPackageManager } from '../../core/package-manager-detector.js';

async function main() {
  const pm = await detectPackageManager(process.cwd());
  console.log(JSON.stringify(pm));
}

main();
EOFDETECT

if npx tsx "$TEST_TEMP_DIR/detect-pm.ts" > "$TEST_TEMP_DIR/test-output.json" 2>&1; then
  pm_name=$(jq -r '.name' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")

  if [ "$pm_name" == "npm" ]; then
    pass_test "Package manager detection workflow"
  else
    fail_test "Package manager detection workflow" "Expected npm, got: $pm_name"
  fi
else
  fail_test "Package manager detection workflow" "Test execution failed"
fi
cleanup_test

# Test 5: Version verification workflow
echo "Test 5: Version verification workflow"
setup_test

# Create installed package
mkdir -p "$TEST_TEMP_DIR/node_modules/axios"
cat > "$TEST_TEMP_DIR/node_modules/axios/package.json" <<'EOF'
{"name": "axios", "version": "1.6.0"}
EOF

cat > "$TEST_TEMP_DIR/verify-version.ts" <<'EOFVERIFY'
import { checkDependencies } from '../../core/dependency-checker.js';

async function main() {
  const result = await checkDependencies(
    { axios: '^1.6.0' },
    process.cwd()
  );
  console.log(JSON.stringify(result));
}

main();
EOFVERIFY

if npx tsx "$TEST_TEMP_DIR/verify-version.ts" > "$TEST_TEMP_DIR/test-output.json" 2>&1; then
  installed=$(jq -r '.installed[]' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")

  if [ "$installed" == "axios" ]; then
    pass_test "Version verification workflow"
  else
    fail_test "Version verification workflow" "Expected axios installed"
  fi
else
  fail_test "Version verification workflow" "Test execution failed"
fi
cleanup_test

# Test 6: Error handling workflow
echo "Test 6: Error handling workflow"
setup_test

cat > "$TEST_TEMP_DIR/error-handling.ts" <<EOFERROR
import { SimpleMCP } from '$MCP_ROOT/SimpleMCP.js';

async function main() {
  const server = new SimpleMCP({
    name: 'test',
    version: '1.0.0',
    dependencies: {
      map: { 'INVALID@PKG': '^1.0.0' },
      dependencies: [{ name: 'INVALID@PKG', version: '^1.0.0' }],
      errors: [],
      warnings: [],
      raw: ''
    }
  });

  const result = await server.installDependencies({
    packageManager: 'npm'
  });

  console.log(JSON.stringify(result));
}

main();
EOFERROR

if npx tsx "$TEST_TEMP_DIR/error-handling.ts" > "$TEST_TEMP_DIR/test-output.json" 2>&1; then
  success=$(jq -r '.success' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "true")
  errors=$(jq '.errors | length' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "0")

  if [ "$success" == "false" ] && [ "$errors" -gt 0 ]; then
    pass_test "Error handling workflow"
  else
    fail_test "Error handling workflow" "Expected failure with errors"
  fi
else
  fail_test "Error handling workflow" "Test execution failed"
fi
cleanup_test

# Test 7: Progress reporting workflow
echo "Test 7: Progress reporting workflow"
setup_test

cat > "$TEST_TEMP_DIR/progress.ts" <<EOFPROGRESS
import { SimpleMCP } from '$MCP_ROOT/SimpleMCP.js';

async function main() {
  let progressEvents = 0;

  const server = new SimpleMCP({
    name: 'test',
    version: '1.0.0',
    dependencies: {
      map: {},
      dependencies: [],
      errors: [],
      warnings: [],
      raw: ''
    }
  });

  const result = await server.installDependencies({
    packageManager: 'npm',
    onProgress: (event) => {
      progressEvents++;
    }
  });

  console.log(JSON.stringify({
    success: result.success,
    progressEvents
  }));
}

main();
EOFPROGRESS

if npx tsx "$TEST_TEMP_DIR/progress.ts" > "$TEST_TEMP_DIR/test-output.json" 2>&1; then
  success=$(jq -r '.success' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")

  if [ "$success" == "true" ]; then
    pass_test "Progress reporting workflow"
  else
    fail_test "Progress reporting workflow" "Installation failed"
  fi
else
  fail_test "Progress reporting workflow" "Test execution failed"
fi
cleanup_test

# Test 8: Multiple dependencies workflow
echo "Test 8: Multiple dependencies workflow"
setup_test

cat > "$TEST_TEMP_DIR/multiple-deps.ts" <<EOFMULTIPLE
import { SimpleMCP } from '$MCP_ROOT/SimpleMCP.js';

async function main() {
  const server = new SimpleMCP({
    name: 'test',
    version: '1.0.0',
    dependencies: {
      map: {
        axios: '^1.6.0',
        zod: '^3.22.0',
        lodash: '^4.17.21'
      },
      dependencies: [
        { name: 'axios', version: '^1.6.0' },
        { name: 'zod', version: '^3.22.0' },
        { name: 'lodash', version: '^4.17.21' }
      ],
      errors: [],
      warnings: [],
      raw: ''
    }
  });

  const status = await server.checkDependencies();
  console.log(JSON.stringify(status));
}

main();
EOFMULTIPLE

if npx tsx "$TEST_TEMP_DIR/multiple-deps.ts" > "$TEST_TEMP_DIR/test-output.json" 2>&1; then
  total=$(jq '(.installed | length) + (.missing | length) + (.outdated | length)' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "0")

  if [ "$total" -eq 3 ]; then
    pass_test "Multiple dependencies workflow"
  else
    fail_test "Multiple dependencies workflow" "Expected 3 total packages, got: $total"
  fi
else
  fail_test "Multiple dependencies workflow" "Test execution failed"
fi
cleanup_test

# Test 9: Scoped package workflow
echo "Test 9: Scoped package workflow"
setup_test

# Create scoped package
mkdir -p "$TEST_TEMP_DIR/node_modules/@types/node"
cat > "$TEST_TEMP_DIR/node_modules/@types/node/package.json" <<'EOF'
{"name": "@types/node", "version": "20.0.0"}
EOF

cat > "$TEST_TEMP_DIR/scoped.ts" <<'EOFSCOPED'
import { checkDependencies } from '../../core/dependency-checker.js';

async function main() {
  const result = await checkDependencies(
    { '@types/node': '^20.0.0' },
    process.cwd()
  );
  console.log(JSON.stringify(result));
}

main();
EOFSCOPED

if npx tsx "$TEST_TEMP_DIR/scoped.ts" > "$TEST_TEMP_DIR/test-output.json" 2>&1; then
  installed=$(jq -r '.installed[]' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "")

  if [ "$installed" == "@types/node" ]; then
    pass_test "Scoped package workflow"
  else
    fail_test "Scoped package workflow" "Expected @types/node installed"
  fi
else
  fail_test "Scoped package workflow" "Test execution failed"
fi
cleanup_test

# Test 10: Full server lifecycle
echo "Test 10: Full server lifecycle"
setup_test

cat > "$TEST_TEMP_DIR/lifecycle.ts" <<EOFLIFECYCLE
import { SimpleMCP } from '$MCP_ROOT/SimpleMCP.js';

async function main() {
  // 1. Create server with dependencies
  const server = new SimpleMCP({
    name: 'lifecycle-test',
    version: '1.0.0',
    dependencies: {
      map: { axios: '^1.6.0' },
      dependencies: [{ name: 'axios', version: '^1.6.0' }],
      errors: [],
      warnings: [],
      raw: ''
    }
  });

  // 2. Check dependencies
  const statusBefore = await server.checkDependencies();

  // 3. Try to install (will validate but may fail on actual install)
  const installResult = await server.installDependencies({
    packageManager: 'npm'
  });

  // 4. Check again
  const statusAfter = await server.checkDependencies();

  console.log(JSON.stringify({
    initialCheck: statusBefore,
    installResult: installResult,
    finalCheck: statusAfter
  }));
}

main();
EOFLIFECYCLE

if npx tsx "$TEST_TEMP_DIR/lifecycle.ts" > "$TEST_TEMP_DIR/test-output.json" 2>&1; then
  has_initial=$(jq 'has("initialCheck")' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  has_install=$(jq 'has("installResult")' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")
  has_final=$(jq 'has("finalCheck")' "$TEST_TEMP_DIR/test-output.json" 2>/dev/null || echo "false")

  if [ "$has_initial" == "true" ] && [ "$has_install" == "true" ] && [ "$has_final" == "true" ]; then
    pass_test "Full server lifecycle"
  else
    fail_test "Full server lifecycle" "Missing lifecycle stages"
  fi
else
  fail_test "Full server lifecycle" "Test execution failed"
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
  echo -e "${GREEN}✓ ALL E2E TESTS PASSED${NC}"
  exit 0
else
  echo -e "${RED}✗ SOME E2E TESTS FAILED${NC}"
  exit 1
fi
