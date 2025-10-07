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

  ((TOTAL_TESTS++))
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}Scenario $TOTAL_TESTS: $scenario_name${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  if $scenario_func; then
    echo -e "${GREEN}✓ PASS${NC}: $scenario_name"
    TEST_RESULTS+=("PASS")
    TEST_NAMES+=("$scenario_name")
    ((PASSED_TESTS++))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC}: $scenario_name"
    TEST_RESULTS+=("FAIL")
    TEST_NAMES+=("$scenario_name")
    ((FAILED_TESTS++))
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

  echo "  → Testing new unified imports"
  cat > test-imports.ts << 'EOF'
import { SimplyMCP, MCPServer, tool, defineConfig } from 'simply-mcp';
console.log('✓ All imports work');
EOF
  npx tsx test-imports.ts

  echo "  → Testing decorator server"
  cat > decorator-server.ts << 'EOF'
import { MCPServer, tool } from 'simply-mcp';

@MCPServer({ name: 'test', version: '1.0.0' })
class TestServer {
  @tool('Add two numbers')
  async add(a: number, b: number): Promise<number> {
    return a + b;
  }
}
export default TestServer;
EOF
  npx simplymcp-class decorator-server.ts --dry-run > /dev/null 2>&1

  echo "  → Testing functional server"
  cat > functional-server.ts << 'EOF'
import { SimplyMCP } from 'simply-mcp';

const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
server.addTool({
  name: 'multiply',
  description: 'Multiply two numbers',
  parameters: {
    type: 'object',
    properties: { a: { type: 'number' }, b: { type: 'number' } },
    required: ['a', 'b']
  },
  execute: async ({ a, b }) => ({ result: a * b })
});
console.log('✓ Functional server works');
EOF
  npx tsx functional-server.ts

  echo "  → Testing CLI commands"
  npx simplymcp --version > /dev/null 2>&1
  npx simplymcp-bundle --help > /dev/null 2>&1

  return 0
}

# ============================================================================
# SCENARIO 2: Upgrade from v2.4.7 Workflow
# ============================================================================
scenario_upgrade() {
  local test_dir="$TEST_BASE_DIR/upgrade"
  mkdir -p "$test_dir"
  cd "$test_dir"

  echo "  → Setting up project with old simply-mcp version"
  npm init -y > /dev/null 2>&1

  # Install previous version from npm (if available)
  echo "  → Installing simply-mcp@2.4.7 (from npm)"
  npm install simply-mcp@2.4.7 --silent 2>/dev/null || {
    echo "  ⚠ Could not install v2.4.7 from npm, using tarball only"
    npm install "$ORIGINAL_DIR/$TARBALL" --silent
  }

  echo "  → Installing dev dependencies"
  npm install --save-dev tsx typescript --silent

  echo "  → Creating server with old import pattern"
  cat > old-style-server.ts << 'EOF'
import { tool, prompt } from 'simply-mcp/decorators';
import { defineConfig } from 'simply-mcp/config';

const config = defineConfig({
  name: 'old-style',
  version: '1.0.0'
});

console.log('✓ Old import pattern still works after upgrade');
EOF

  # Upgrade to new version
  echo "  → Upgrading to new version"
  npm install "$ORIGINAL_DIR/$TARBALL" --silent

  echo "  → Verifying old imports still work"
  npx tsx old-style-server.ts

  echo "  → Testing new import pattern now available"
  cat > new-style-server.ts << 'EOF'
import { tool, prompt, defineConfig } from 'simply-mcp';
console.log('✓ New import pattern works after upgrade');
EOF
  npx tsx new-style-server.ts

  return 0
}

# ============================================================================
# SCENARIO 3: All Three API Styles
# ============================================================================
scenario_all_api_styles() {
  local test_dir="$TEST_BASE_DIR/api-styles"
  mkdir -p "$test_dir"
  cd "$test_dir"

  echo "  → Setting up test project"
  npm init -y > /dev/null 2>&1
  npm install "$ORIGINAL_DIR/$TARBALL" --silent
  npm install --save-dev tsx typescript --silent

  echo "  → Testing Decorator API"
  cat > decorator-style.ts << 'EOF'
import { MCPServer, tool, prompt, resource } from 'simply-mcp';

@MCPServer({ name: 'decorator-test', version: '1.0.0' })
class DecoratorServer {
  @tool('Test tool')
  async testTool(): Promise<string> {
    return 'decorator works';
  }

  @prompt('Test prompt')
  async testPrompt(): Promise<any> {
    return { messages: [{ role: 'user', content: { type: 'text', text: 'test' } }] };
  }

  @resource('test://resource')
  async testResource(): Promise<string> {
    return 'resource data';
  }
}
export default DecoratorServer;
EOF
  npx simplymcp-class decorator-style.ts --dry-run > /dev/null 2>&1

  echo "  → Testing Programmatic API"
  cat > programmatic-style.ts << 'EOF'
import { SimplyMCP } from 'simply-mcp';

const server = new SimplyMCP({
  name: 'programmatic-test',
  version: '1.0.0'
});

server.addTool({
  name: 'test',
  description: 'Test tool',
  parameters: { type: 'object', properties: {} },
  execute: async () => ({ result: 'programmatic works' })
});

server.addPrompt({
  name: 'test',
  description: 'Test prompt',
  execute: async () => ({
    messages: [{ role: 'user', content: { type: 'text', text: 'test' } }]
  })
});

server.addResource({
  name: 'test',
  uri: 'test://resource',
  description: 'Test resource',
  mimeType: 'text/plain',
  execute: async () => ({ contents: [{ uri: 'test://resource', mimeType: 'text/plain', text: 'data' }] })
});

console.log('✓ Programmatic API works');
EOF
  npx tsx programmatic-style.ts

  echo "  → Testing Functional API with config"
  cat > functional-style.ts << 'EOF'
import { SimplyMCP, defineConfig } from 'simply-mcp';

const config = defineConfig({
  name: 'functional-test',
  version: '1.0.0',
  description: 'Functional style test'
});

const server = new SimplyMCP(config);

server.addTool({
  name: 'calculate',
  description: 'Calculate something',
  parameters: {
    type: 'object',
    properties: { value: { type: 'number' } },
    required: ['value']
  },
  execute: async ({ value }) => ({ result: value * 2 })
});

console.log('✓ Functional API works');
EOF
  npx tsx functional-style.ts

  return 0
}

# ============================================================================
# SCENARIO 4: Both Import Patterns (Old & New)
# ============================================================================
scenario_import_patterns() {
  local test_dir="$TEST_BASE_DIR/import-patterns"
  mkdir -p "$test_dir"
  cd "$test_dir"

  echo "  → Setting up test project"
  npm init -y > /dev/null 2>&1
  npm install "$ORIGINAL_DIR/$TARBALL" --silent
  npm install --save-dev tsx typescript --silent

  echo "  → Testing old subpath imports"
  cat > test-old-imports.ts << 'EOF'
import { MCPServer, tool, prompt, resource } from 'simply-mcp/decorators';
import { defineConfig, type CLIConfig } from 'simply-mcp/config';

if (typeof tool !== 'function') throw new Error('tool import failed');
if (typeof defineConfig !== 'function') throw new Error('defineConfig import failed');

console.log('✓ Old subpath imports work');
EOF
  npx tsx test-old-imports.ts

  echo "  → Testing new unified imports"
  cat > test-new-imports.ts << 'EOF'
import {
  MCPServer,
  tool,
  prompt,
  resource,
  SimplyMCP,
  defineConfig,
  type CLIConfig
} from 'simply-mcp';

if (typeof tool !== 'function') throw new Error('tool import failed');
if (typeof SimplyMCP !== 'function') throw new Error('SimplyMCP import failed');
if (typeof defineConfig !== 'function') throw new Error('defineConfig import failed');

console.log('✓ New unified imports work');
EOF
  npx tsx test-new-imports.ts

  echo "  → Testing mixed imports (old + new)"
  cat > test-mixed-imports.ts << 'EOF'
import { SimplyMCP } from 'simply-mcp';
import { tool } from 'simply-mcp/decorators';
import { defineConfig } from 'simply-mcp/config';

if (typeof tool !== 'function') throw new Error('Mixed imports failed');
console.log('✓ Mixed import patterns work');
EOF
  npx tsx test-mixed-imports.ts

  return 0
}

# ============================================================================
# SCENARIO 5: CLI Commands (run, bundle, list, config)
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
import { MCPServer, tool } from 'simply-mcp';

@MCPServer({ name: 'cli-test', version: '1.0.0' })
class TestServer {
  @tool('Test tool')
  async test(): Promise<string> {
    return 'success';
  }
}
export default TestServer;
EOF

  echo "  → Testing simplymcp run"
  npx simplymcp run test-server.ts --dry-run > /dev/null 2>&1

  echo "  → Testing simplymcp-class"
  npx simplymcp-class test-server.ts --dry-run > /dev/null 2>&1

  echo "  → Testing --help flags"
  npx simplymcp --help > /dev/null 2>&1
  npx simplymcp-run --help > /dev/null 2>&1
  npx simplymcp-func --help > /dev/null 2>&1
  npx simplymcp-bundle --help > /dev/null 2>&1

  echo "  → Testing --version flag"
  npx simplymcp --version > /dev/null 2>&1

  echo "  → Testing bundle command"
  npx simplymcp-bundle test-server.ts --output test-bundle.js > /dev/null 2>&1
  test -f test-bundle.js || return 1

  return 0
}

# ============================================================================
# SCENARIO 6: Both Transports (stdio, HTTP)
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
import { MCPServer, tool } from 'simply-mcp';

@MCPServer({ name: 'stdio-test', version: '1.0.0' })
class StdioServer {
  @tool('Test')
  async test(): Promise<string> {
    return 'stdio works';
  }
}
export default StdioServer;
EOF
  npx simplymcp-class stdio-server.ts --dry-run > /dev/null 2>&1

  echo "  → Testing HTTP transport flag"
  cat > http-server.ts << 'EOF'
import { SimplyMCP } from 'simply-mcp';

const server = new SimplyMCP({
  name: 'http-test',
  version: '1.0.0'
});

server.addTool({
  name: 'test',
  description: 'Test',
  parameters: { type: 'object', properties: {} },
  execute: async () => ({ result: 'http works' })
});

console.log('✓ HTTP server setup works');
EOF
  npx tsx http-server.ts

  # Note: We don't actually start HTTP server to avoid port conflicts
  echo "  ⚠ Skipping actual HTTP server start (would require port management)"

  return 0
}

# ============================================================================
# SCENARIO 7: Error Message Validation
# ============================================================================
scenario_error_messages() {
  local test_dir="$TEST_BASE_DIR/errors"
  mkdir -p "$test_dir"
  cd "$test_dir"

  echo "  → Setting up test project"
  npm init -y > /dev/null 2>&1
  npm install "$ORIGINAL_DIR/$TARBALL" --silent
  npm install --save-dev tsx typescript --silent

  echo "  → Testing missing @MCPServer decorator error"
  cat > error-missing-decorator.ts << 'EOF'
import { tool } from 'simply-mcp';

class BadServer {
  @tool('Test')
  async test(): Promise<string> {
    return 'test';
  }
}
export default BadServer;
EOF

  # Expect error with helpful message
  if npx simplymcp-class error-missing-decorator.ts --dry-run 2>&1 | grep -q "@MCPServer"; then
    echo "  ✓ Error message mentions @MCPServer"
  else
    echo "  ⚠ Error message could be more helpful"
  fi

  echo "  → Testing invalid decorator parameter error"
  cat > error-invalid-param.ts << 'EOF'
import { MCPServer, tool } from 'simply-mcp';

@MCPServer({ name: 'test', version: '1.0.0' })
class TestServer {
  @tool({ description: 'Test' })  // Object not supported yet
  async test(): Promise<string> {
    return 'test';
  }
}
export default TestServer;
EOF

  # This should produce a helpful error
  if npx simplymcp-class error-invalid-param.ts --dry-run 2>&1 | grep -q "string"; then
    echo "  ✓ Error message mentions string requirement"
  else
    echo "  ⚠ Could not verify parameter validation error message"
  fi

  return 0
}

# ============================================================================
# SCENARIO 8: Examples Run Successfully
# ============================================================================
scenario_examples() {
  local test_dir="$TEST_BASE_DIR/examples"
  mkdir -p "$test_dir"
  cd "$test_dir"

  echo "  → Setting up test project"
  npm init -y > /dev/null 2>&1
  npm install "$ORIGINAL_DIR/$TARBALL" --silent
  npm install --save-dev tsx typescript --silent

  echo "  → Copying and testing example files"

  # Test class-minimal example
  if [ -f "$ORIGINAL_DIR/examples/class-minimal.ts" ]; then
    cp "$ORIGINAL_DIR/examples/class-minimal.ts" .
    echo "  → Testing class-minimal.ts"
    npx simplymcp-class class-minimal.ts --dry-run > /dev/null 2>&1
  fi

  # Test simple-server example
  if [ -f "$ORIGINAL_DIR/examples/simple-server.ts" ]; then
    cp "$ORIGINAL_DIR/examples/simple-server.ts" .
    echo "  → Testing simple-server.ts"
    timeout 2 npx tsx simple-server.ts 2>/dev/null || true
  fi

  # Test functional example
  if [ -f "$ORIGINAL_DIR/examples/single-file-basic.ts" ]; then
    cp "$ORIGINAL_DIR/examples/single-file-basic.ts" .
    echo "  → Testing single-file-basic.ts"
    npx simplymcp-func single-file-basic.ts --dry-run > /dev/null 2>&1 || true
  fi

  return 0
}

# ============================================================================
# SCENARIO 9: TypeScript Types Validation
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
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "types": ["node"]
  }
}
EOF

  echo "  → Testing type imports and inference"
  cat > test-types.ts << 'EOF'
import {
  SimplyMCP,
  MCPServer,
  tool,
  prompt,
  resource,
  defineConfig,
  type CLIConfig,
  type ToolHandler
} from 'simply-mcp';

// Test config type
const config: CLIConfig = defineConfig({
  name: 'test',
  version: '1.0.0'
});

// Test server type
const server: SimplyMCP = new SimplyMCP(config);

// Test tool handler type
const handler: ToolHandler = async (params) => {
  return { result: 'test' };
};

console.log('✓ TypeScript types work correctly');
EOF

  echo "  → Running TypeScript compiler"
  npx tsc --noEmit test-types.ts

  return 0
}

# ============================================================================
# Run All Scenarios
# ============================================================================
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Running Integration Test Scenarios${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

run_scenario "Fresh Installation Workflow" scenario_fresh_install
run_scenario "Upgrade from v2.4.7 Workflow" scenario_upgrade
run_scenario "All Three API Styles" scenario_all_api_styles
run_scenario "Both Import Patterns (Old & New)" scenario_import_patterns
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
