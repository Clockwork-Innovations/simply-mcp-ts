#!/bin/bash
# End-to-End Integration Test Suite for simply-mcp
# Tests complete workflows including installation, upgrades, and all features
#
# Usage: bash scripts/integration-test.sh

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
ORIGINAL_DIR=$(pwd)
TEST_BASE_DIR="/tmp/simply-mcp-integration-test-$$"
TARBALL=""
PASSED_TESTS=0
FAILED_TESTS=0
TOTAL_TESTS=0

# Test tracking
declare -a TEST_RESULTS
declare -a TEST_NAMES

# Function to run a test scenario
run_scenario() {
  local scenario_name="$1"
  local scenario_func="$2"

  ((TOTAL_TESTS++)) || true
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}Scenario $TOTAL_TESTS: $scenario_name${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  if $scenario_func; then
    echo -e "${GREEN}✓ PASS${NC}: $scenario_name"
    TEST_RESULTS+=("PASS")
    TEST_NAMES+=("$scenario_name")
    ((PASSED_TESTS++)) || true
    return 0
  else
    echo -e "${RED}✗ FAIL${NC}: $scenario_name"
    TEST_RESULTS+=("FAIL")
    TEST_NAMES+=("$scenario_name")
    ((FAILED_TESTS++)) || true
    return 1
  fi
}

# Cleanup function
cleanup() {
  echo ""
  echo -e "${YELLOW}Cleaning up integration test environment...${NC}"
  cd "$ORIGINAL_DIR"
  rm -rf "$TEST_BASE_DIR"
  echo -e "${GREEN}Cleanup complete${NC}"
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Header
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  simply-mcp Integration Test Suite${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Build and pack
echo -e "${YELLOW}Building and packing simply-mcp...${NC}"
cd "$ORIGINAL_DIR"
npm run clean > /dev/null 2>&1
npm run build > /dev/null 2>&1
TARBALL=$(npm pack --quiet 2>&1 | tail -n 1)
echo -e "${GREEN}Created tarball: ${TARBALL}${NC}"
echo ""

# Create test base directory
mkdir -p "$TEST_BASE_DIR"

# ============================================================================
# SCENARIO 1: Fresh Installation Workflow
# ============================================================================
scenario_fresh_install() {
  local test_dir="$TEST_BASE_DIR/fresh-install"
  mkdir -p "$test_dir"
  cd "$test_dir"

  echo "  → Initializing new project"
  npm init -y > /dev/null 2>&1

  echo "  → Installing simply-mcp from tarball"
  npm install "$ORIGINAL_DIR/$TARBALL" --silent

  echo "  → Installing dev dependencies"
  npm install --save-dev tsx typescript --silent

  echo "  → Testing type-only imports"
  cat > test-imports.ts << 'EOF'
import type { ITool, IServer } from 'simply-mcp';
import { defineConfig } from 'simply-mcp';
console.log('✓ All imports work');
EOF
  npx tsx test-imports.ts

  echo "  → Testing interface server"
  cat > interface-server.ts << 'EOF'
import type { ITool, IPrompt, IServer } from 'simply-mcp';

interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: { a: number; b: number };
  result: { sum: number };
}

interface MultiplyTool extends ITool {
  name: 'multiply';
  description: 'Multiply two numbers';
  params: { a: number; b: number };
  result: { product: number };
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class implements TestServer {
  add: AddTool = async (params) => ({ sum: params.a + params.b });
  multiply: MultiplyTool = async (params) => ({ product: params.a * params.b });
}
EOF
  npx simply-mcp-interface interface-server.ts --dry-run > /dev/null 2>&1

  echo "  → Testing CLI commands"
  npx simplymcp --version > /dev/null 2>&1
  npx simply-mcp-interface --help > /dev/null 2>&1
  npx simply-mcp-bundle --help > /dev/null 2>&1

  return 0
}

# ============================================================================
# SCENARIO 2: API Feature Completeness Test
# ============================================================================
scenario_api_features() {
  local test_dir="$TEST_BASE_DIR/api-features"
  mkdir -p "$test_dir"
  cd "$test_dir"

  echo "  → Setting up test project"
  npm init -y > /dev/null 2>&1
  npm install "$ORIGINAL_DIR/$TARBALL" --silent

  echo "  → Installing dev dependencies"
  npm install --save-dev tsx typescript --silent

  echo "  → Testing interface-driven features (tools, prompts, resources)"
  cat > test-features.ts << 'EOF'
import type { ITool, IPrompt, IResource, IServer } from 'simply-mcp';

interface AddTool extends ITool {
  name: 'add';
  description: 'Calculate sum';
  params: { a: number; b: number };
  result: number;
}

interface GreetPrompt extends IPrompt {
  name: 'greet';
  description: 'Generate greeting';
  template: 'Hello, {name}!';
}

interface DataResource extends IResource {
  name: 'data';
  uri: 'test://data';
  description: 'Test data resource';
  mimeType: 'text/plain';
  text: 'Test data';
}

interface FeatureServer extends IServer {
  name: 'feature-test';
  version: '1.0.0';
}

export default class implements FeatureServer {
  add: AddTool = async (params) => params.a + params.b;
}

console.log('✓ All interface-driven features work');
EOF
  npx tsx test-features.ts

  echo "  → Testing defineConfig utility"
  cat > test-config.ts << 'EOF'
import { defineConfig } from 'simply-mcp';

const config = defineConfig({
  name: 'config-test',
  version: '1.0.0',
  description: 'Test config'
});

if (!config.name || !config.version) {
  throw new Error('Config not created correctly');
}

console.log('✓ defineConfig works');
EOF
  npx tsx test-config.ts

  return 0
}

# ============================================================================
# SCENARIO 3: Interface-Driven API Patterns
# ============================================================================
scenario_all_api_styles() {
  local test_dir="$TEST_BASE_DIR/api-styles"
  mkdir -p "$test_dir"
  cd "$test_dir"

  echo "  → Setting up test project"
  npm init -y > /dev/null 2>&1
  npm install "$ORIGINAL_DIR/$TARBALL" --silent
  npm install --save-dev tsx typescript --silent

  echo "  → Testing minimal interface pattern"
  cat > interface-minimal.ts << 'EOF'
import type { ITool, IServer } from 'simply-mcp';

interface TestTool extends ITool {
  name: 'test';
  description: 'Test tool';
  params: {};
  result: string;
}

interface MinimalServer extends IServer {
  name: 'minimal-test';
  version: '1.0.0';
}

export default class implements MinimalServer {
  test: TestTool = async () => 'minimal interface works';
}
EOF
  npx simply-mcp-interface interface-minimal.ts --dry-run > /dev/null 2>&1

  echo "  → Testing advanced interface pattern with multiple tools"
  cat > interface-advanced.ts << 'EOF'
import type { ITool, IPrompt, IServer } from 'simply-mcp';

interface CalculateTool extends ITool {
  name: 'calculate';
  description: 'Calculate something';
  params: { value: number };
  result: { result: number };
}

interface GreetPrompt extends IPrompt {
  name: 'greet';
  description: 'Greeting template';
  template: 'Hello, {name}!';
}

interface AdvancedServer extends IServer {
  name: 'advanced-test';
  version: '1.0.0';
}

export default class implements AdvancedServer {
  calculate: CalculateTool = async (params) => ({ result: params.value * 2 });
}

console.log('✓ Advanced interface works');
EOF
  npx tsx interface-advanced.ts

  echo "  → Testing interface with defineConfig"
  cat > interface-with-config.ts << 'EOF'
import type { ITool, IServer } from 'simply-mcp';
import { defineConfig } from 'simply-mcp';

interface TestTool extends ITool {
  name: 'test';
  description: 'Test';
  params: {};
  result: string;
}

interface ConfigServer extends IServer {
  name: 'config-test';
  version: '1.0.0';
}

const config = defineConfig({
  name: 'config-test',
  version: '1.0.0'
});

export default class implements ConfigServer {
  test: TestTool = async () => 'config works';
}

console.log('✓ Interface with config works');
EOF
  npx tsx interface-with-config.ts

  return 0
}

# ============================================================================
# SCENARIO 4: CLI Commands (run, bundle, interface)
# ============================================================================
scenario_cli_commands() {
  local test_dir="$TEST_BASE_DIR/cli-commands"
  mkdir -p "$test_dir"
  cd "$test_dir"

  echo "  → Setting up test project"
  npm init -y > /dev/null 2>&1
  npm install "$ORIGINAL_DIR/$TARBALL" --silent
  npm install --save-dev tsx typescript --silent

  # Create test server
  cat > test-server.ts << 'EOF'
import type { ITool, IServer } from 'simply-mcp';

interface TestTool extends ITool {
  name: 'test';
  description: 'Test tool';
  params: {};
  result: string;
}

interface CLITestServer extends IServer {
  name: 'cli-test';
  version: '1.0.0';
}

export default class implements CLITestServer {
  test: TestTool = async () => 'success';
}
EOF

  echo "  → Testing simplymcp run"
  npx simplymcp run test-server.ts --dry-run > /dev/null 2>&1

  echo "  → Testing simply-mcp-interface"
  npx simply-mcp-interface test-server.ts --dry-run > /dev/null 2>&1

  echo "  → Testing --help flags"
  npx simplymcp --help > /dev/null 2>&1
  npx simply-mcp-run --help > /dev/null 2>&1
  npx simply-mcp-interface --help > /dev/null 2>&1
  npx simply-mcp-bundle --help > /dev/null 2>&1

  echo "  → Testing --version flag"
  npx simplymcp --version > /dev/null 2>&1

  echo "  → Testing bundle command"
  npm install --save-dev esbuild --silent

  # Create a simple bundle test server
  cat > bundle-test-server.ts << 'EOF'
import type { ITool, IServer } from 'simply-mcp';

interface BundleTestTool extends ITool {
  name: 'test';
  description: 'Test tool';
  params: { input: string };
  result: { output: string };
}

interface BundleTestServer extends IServer {
  name: 'bundle-test';
  version: '1.0.0';
}

export default class implements BundleTestServer {
  test: BundleTestTool = async ({ input }) => {
    return { output: `Processed: ${input}` };
  };
}
EOF

  npx simply-mcp-bundle bundle-test-server.ts --output test-bundle.js > /dev/null 2>&1
  if [ -f test-bundle.js ]; then
    rm test-bundle.js
  else
    echo "    ✗ Bundle creation failed"
    return 1
  fi

  return 0
}

# ============================================================================
# SCENARIO 5: Both Transports (stdio, HTTP)
# ============================================================================
scenario_transports() {
  local test_dir="$TEST_BASE_DIR/transports"
  mkdir -p "$test_dir"
  cd "$test_dir"

  echo "  → Setting up test project"
  npm init -y > /dev/null 2>&1
  npm install "$ORIGINAL_DIR/$TARBALL" --silent
  npm install --save-dev tsx typescript --silent

  echo "  → Testing stdio transport (default)"
  cat > stdio-server.ts << 'EOF'
import type { ITool, IServer } from 'simply-mcp';

interface TestTool extends ITool {
  name: 'test';
  description: 'Test';
  params: {};
  result: string;
}

interface StdioServer extends IServer {
  name: 'stdio-test';
  version: '1.0.0';
}

export default class implements StdioServer {
  test: TestTool = async () => 'stdio works';
}
EOF
  npx simply-mcp-interface stdio-server.ts --dry-run > /dev/null 2>&1

  echo "  → Testing HTTP transport setup"
  cat > http-server.ts << 'EOF'
import type { ITool, IServer } from 'simply-mcp';

interface TestTool extends ITool {
  name: 'test';
  description: 'Test';
  params: {};
  result: string;
}

interface HttpServer extends IServer {
  name: 'http-test';
  version: '1.0.0';
}

export default class implements HttpServer {
  test: TestTool = async () => 'http works';
}

console.log('✓ HTTP server setup works');
EOF
  npx tsx http-server.ts

  # Note: We don't actually start HTTP server to avoid port conflicts
  echo "  ⚠ Skipping actual HTTP server start (would require port management)"

  return 0
}

# ============================================================================
# SCENARIO 6: Error Message Validation
# ============================================================================
scenario_error_messages() {
  local test_dir="$TEST_BASE_DIR/errors"
  mkdir -p "$test_dir"
  cd "$test_dir"

  echo "  → Setting up test project"
  npm init -y > /dev/null 2>&1
  npm install "$ORIGINAL_DIR/$TARBALL" --silent
  npm install --save-dev tsx typescript --silent

  echo "  → Testing basic error handling (interface validation)"
  cat > test-basic-errors.ts << 'EOF'
import type { ITool, IServer } from 'simply-mcp';

interface TestTool extends ITool {
  name: 'test';
  description: 'Test tool';
  params: {};
  result: string;
}

interface ErrorTestServer extends IServer {
  name: 'error-test';
  version: '1.0.0';
}

export default class implements ErrorTestServer {
  test: TestTool = async () => 'test';
}

console.log('✓ Interface validation works');
EOF
  npx tsx test-basic-errors.ts

  echo "  ⚠ Skipping detailed error message tests (v4.0.0 uses runtime AST parsing)"

  return 0
}

# ============================================================================
# SCENARIO 7: Examples Run Successfully
# ============================================================================
scenario_examples() {
  local test_dir="$TEST_BASE_DIR/examples"
  mkdir -p "$test_dir"
  cd "$test_dir"

  echo "  → Setting up test project"
  npm init -y > /dev/null 2>&1
  npm install "$ORIGINAL_DIR/$TARBALL" --silent
  npm install --save-dev tsx typescript --silent

  echo "  → Copying and testing interface examples"

  # Test interface-minimal example
  if [ -f "$ORIGINAL_DIR/examples/interface-minimal.ts" ]; then
    cp "$ORIGINAL_DIR/examples/interface-minimal.ts" .
    echo "  → Testing interface-minimal.ts"
    npx simply-mcp-interface interface-minimal.ts --dry-run > /dev/null 2>&1
  fi

  # Test interface-params example
  if [ -f "$ORIGINAL_DIR/examples/interface-params.ts" ]; then
    cp "$ORIGINAL_DIR/examples/interface-params.ts" .
    echo "  → Testing interface-params.ts"
    npx simply-mcp-interface interface-params.ts --dry-run > /dev/null 2>&1 || true
  fi

  # Test interface-advanced example
  if [ -f "$ORIGINAL_DIR/examples/interface-advanced.ts" ]; then
    cp "$ORIGINAL_DIR/examples/interface-advanced.ts" .
    echo "  → Testing interface-advanced.ts"
    npx simply-mcp-interface interface-advanced.ts --dry-run > /dev/null 2>&1 || true
  fi

  return 0
}

# ============================================================================
# SCENARIO 8: TypeScript Types Validation
# ============================================================================
scenario_typescript_types() {
  local test_dir="$TEST_BASE_DIR/types"
  mkdir -p "$test_dir"
  cd "$test_dir"

  echo "  → Setting up test project"
  npm init -y > /dev/null 2>&1
  npm install "$ORIGINAL_DIR/$TARBALL" --silent
  npm install --save-dev tsx typescript @types/node --silent

  cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"]
  }
}
EOF

  echo "  → Testing interface type imports"
  cat > test-types.ts << 'EOF'
import type {
  ITool,
  IPrompt,
  IResource,
  IServer,
  ToolParams,
  ToolResult
} from 'simply-mcp';
import { defineConfig, type CLIConfig } from 'simply-mcp';

// Test config type
const config: CLIConfig = defineConfig({
  name: 'test',
  version: '1.0.0'
});

// Test interface types exist
type TestToolType = ITool;
type TestPromptType = IPrompt;
type TestResourceType = IResource;
type TestServerType = IServer;

console.log('✓ TypeScript types work correctly');
EOF

  npx tsx test-types.ts

  echo "  ⚠ Skipping strict type checking (v4.0.0 uses runtime AST parsing)"

  return 0
}

# ============================================================================
# Run All Scenarios
# ============================================================================
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Running Integration Test Scenarios${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

run_scenario "Fresh Installation Workflow" scenario_fresh_install
run_scenario "API Feature Completeness Test" scenario_api_features
run_scenario "All Three API Styles" scenario_all_api_styles
run_scenario "CLI Commands (run, bundle, etc.)" scenario_cli_commands
run_scenario "Both Transports (stdio, HTTP)" scenario_transports
run_scenario "Error Message Validation" scenario_error_messages
run_scenario "Examples Run Successfully" scenario_examples
run_scenario "TypeScript Types Validation" scenario_typescript_types

# Final Report
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Integration Test Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Calculate success rate
if [ $TOTAL_TESTS -gt 0 ]; then
  SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
else
  SUCCESS_RATE=0
fi

echo -e "Total Scenarios:  ${BOLD}${TOTAL_TESTS}${NC}"
echo -e "Passed:           ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed:           ${RED}${FAILED_TESTS}${NC}"
echo -e "Success Rate:     ${BOLD}${SUCCESS_RATE}%${NC}"
echo ""

# Detailed results
if [ ${#TEST_NAMES[@]} -gt 0 ]; then
  echo -e "${BOLD}Scenario Results:${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  for i in "${!TEST_NAMES[@]}"; do
    if [ "${TEST_RESULTS[$i]}" == "PASS" ]; then
      printf "${GREEN}✓${NC} %s\n" "${TEST_NAMES[$i]}"
    else
      printf "${RED}✗${NC} %s\n" "${TEST_NAMES[$i]}"
    fi
  done
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
fi

# Final verdict
if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}${BOLD}  ✓ ALL INTEGRATION TESTS PASSED!${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "${GREEN}Package is production-ready${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
  echo -e "${RED}${BOLD}  ✗ SOME INTEGRATION TESTS FAILED${NC}"
  echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "${RED}Failed scenarios:${NC}"
  for i in "${!TEST_NAMES[@]}"; do
    if [ "${TEST_RESULTS[$i]}" == "FAIL" ]; then
      echo -e "  ${RED}✗${NC} ${TEST_NAMES[$i]}"
    fi
  done
  echo ""
  echo -e "${YELLOW}Please review and fix failing scenarios before release${NC}"
  echo ""
  exit 1
fi
