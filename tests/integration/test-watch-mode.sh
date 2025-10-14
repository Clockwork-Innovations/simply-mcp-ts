#!/bin/bash

################################################################################
# Watch Mode Integration Test Suite
# Simply MCP v2.5.0-beta.3
#
# This script implements comprehensive testing for watch mode functionality
# covering all 8 scenarios from WATCH_MODE_TEST_PLAN.md
#
# Usage: ./test-watch-mode.sh [scenario_number]
#   - No arguments: Run all 8 scenarios
#   - With number: Run specific scenario (1-8)
################################################################################

set -e  # Exit on error (disabled for test failures)
set -u  # Exit on undefined variable

################################################################################
# Configuration
################################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TARBALL_PATH="$PROJECT_ROOT/simply-mcp-2.5.0-beta.3.tgz"
TEST_DIR="/tmp/watch-mode-tests-$$"
LOG_DIR="$TEST_DIR/logs"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Test tracking
TOTAL_SCENARIOS=8
SCENARIOS_PASSED=0
SCENARIOS_FAILED=0
CURRENT_SCENARIO=""
SCENARIO_START_TIME=0

# Process tracking
WATCH_PIDS=()

################################################################################
# Utility Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_test() {
    echo -e "${CYAN}[TEST]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_scenario_header() {
    local scenario_num=$1
    local scenario_name=$2
    CURRENT_SCENARIO="Scenario $scenario_num: $scenario_name"
    SCENARIO_START_TIME=$(date +%s%3N)

    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}[$scenario_num/$TOTAL_SCENARIOS] $scenario_name${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
}

################################################################################
# Assertion Functions
################################################################################

assert_equals() {
    local actual="$1"
    local expected="$2"
    local description="$3"

    if [ "$actual" = "$expected" ]; then
        echo -e "  ${GREEN}✓${NC} $description"
        return 0
    else
        echo -e "  ${RED}✗${NC} $description"
        echo -e "    ${RED}Expected: '$expected'${NC}"
        echo -e "    ${RED}Actual:   '$actual'${NC}"
        return 1
    fi
}

assert_not_equals() {
    local actual="$1"
    local expected="$2"
    local description="$3"

    if [ "$actual" != "$expected" ]; then
        echo -e "  ${GREEN}✓${NC} $description"
        return 0
    else
        echo -e "  ${RED}✗${NC} $description"
        echo -e "    ${RED}Values should not be equal: '$actual'${NC}"
        return 1
    fi
}

assert_contains() {
    local haystack="$1"
    local needle="$2"
    local description="$3"

    if echo "$haystack" | grep -q "$needle"; then
        echo -e "  ${GREEN}✓${NC} $description"
        return 0
    else
        echo -e "  ${RED}✗${NC} $description"
        echo -e "    ${RED}Could not find: '$needle'${NC}"
        return 1
    fi
}

assert_file_contains() {
    local file="$1"
    local pattern="$2"
    local description="$3"

    if [ ! -f "$file" ]; then
        echo -e "  ${RED}✗${NC} $description (file not found: $file)"
        return 1
    fi

    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} $description"
        return 0
    else
        echo -e "  ${RED}✗${NC} $description"
        echo -e "    ${RED}Pattern not found in $file: '$pattern'${NC}"
        return 1
    fi
}

assert_process_running() {
    local pid="$1"
    local description="$2"

    if kill -0 "$pid" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} $description (PID: $pid)"
        return 0
    else
        echo -e "  ${RED}✗${NC} $description (PID: $pid not running)"
        return 1
    fi
}

assert_process_not_running() {
    local pid="$1"
    local description="$2"

    if ! kill -0 "$pid" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} $description (PID: $pid)"
        return 0
    else
        echo -e "  ${RED}✗${NC} $description (PID: $pid still running)"
        return 1
    fi
}

assert_less_than() {
    local actual="$1"
    local max="$2"
    local description="$3"

    if [ "$actual" -lt "$max" ]; then
        echo -e "  ${GREEN}✓${NC} $description ($actual < $max)"
        return 0
    else
        echo -e "  ${RED}✗${NC} $description ($actual >= $max)"
        return 1
    fi
}

assert_less_than_or_equal() {
    local actual="$1"
    local max="$2"
    local description="$3"

    if [ "$actual" -le "$max" ]; then
        echo -e "  ${GREEN}✓${NC} $description ($actual <= $max)"
        return 0
    else
        echo -e "  ${RED}✗${NC} $description ($actual > $max)"
        return 1
    fi
}

################################################################################
# Process Management
################################################################################

kill_process_tree() {
    local pid=$1

    # Get all child processes
    local children=$(pgrep -P "$pid" 2>/dev/null || true)

    # Recursively kill children first
    for child in $children; do
        kill_process_tree "$child"
    done

    # Kill the process
    if kill -0 "$pid" 2>/dev/null; then
        kill -TERM "$pid" 2>/dev/null || true
        sleep 0.3
        if kill -0 "$pid" 2>/dev/null; then
            kill -KILL "$pid" 2>/dev/null || true
        fi
    fi
}

cleanup_processes() {
    log_info "Cleaning up processes..."

    for pid in "${WATCH_PIDS[@]}"; do
        if [ -n "$pid" ]; then
            kill_process_tree "$pid"
        fi
    done

    # Extra safety: kill any remaining simplymcp processes
    pkill -f "simplymcp.*--watch" 2>/dev/null || true

    WATCH_PIDS=()
    sleep 0.5
}

################################################################################
# Wait Helpers
################################################################################

wait_for_log_pattern() {
    local logfile="$1"
    local pattern="$2"
    local timeout_deciseconds="$3"  # In deciseconds (10ths of a second)
    local elapsed=0

    while [ $elapsed -lt $timeout_deciseconds ]; do
        if [ -f "$logfile" ] && grep -q "$pattern" "$logfile" 2>/dev/null; then
            return 0
        fi
        sleep 0.1
        elapsed=$((elapsed + 1))
    done

    return 1
}

wait_for_process_exit() {
    local pid="$1"
    local timeout_seconds="$2"
    local elapsed=0

    while [ $elapsed -lt $timeout_seconds ]; do
        if ! kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
        sleep 0.1
        elapsed=$((elapsed + 1))
    done

    return 1
}

################################################################################
# Test Environment Setup
################################################################################

setup_test_environment() {
    print_header "Setting Up Test Environment"

    # Verify tarball exists
    if [ ! -f "$TARBALL_PATH" ]; then
        log_error "Tarball not found: $TARBALL_PATH"
        exit 1
    fi
    log_success "Found tarball: $TARBALL_PATH"

    # Create test directory
    log_info "Creating test directory: $TEST_DIR"
    rm -rf "$TEST_DIR"
    mkdir -p "$TEST_DIR"
    mkdir -p "$LOG_DIR"
    cd "$TEST_DIR"

    # Initialize Node.js project
    log_info "Initializing Node.js project..."
    npm init -y > /dev/null 2>&1

    # Install Simply MCP from tarball
    log_info "Installing Simply MCP from tarball..."
    npm install "$TARBALL_PATH" > /dev/null 2>&1

    # Verify installation
    local version=$(npx simplymcp --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+((-beta|-alpha)\.[0-9]+)?' || echo "unknown")
    if [ "$version" = "unknown" ]; then
        log_error "Failed to verify Simply MCP installation"
        exit 1
    fi
    log_success "Installed Simply MCP version: $version"

    log_success "Test environment ready"
}

################################################################################
# Test Server Files
################################################################################

create_decorator_server() {
    cat > test-server-decorator.ts << 'EOF'
import { MCPServer } from 'simply-mcp';

@MCPServer()
export default class TestServer {
  greet(name: string): string {
    return `Hello, ${name}!`;
  }
}
EOF
}

create_functional_server() {
    cat > test-server-functional.ts << 'EOF'
import { defineMCP } from 'simply-mcp';
import { z } from 'zod';

export default defineMCP({
  name: 'test-functional',
  version: '1.0.0',
  tools: [
    {
      name: 'echo',
      description: 'Echo a message',
      parameters: z.object({
        message: z.string(),
      }),
      execute: async ({ message }) => message,
    },
  ],
});
EOF
}

create_interface_server() {
    cat > test-server-interface.ts << 'EOF'
import type { ITool, IServer } from 'simply-mcp';

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a person';
  params: {
    name: string;
  };
  result: string;
}

interface TestInterfaceServer extends IServer {
  name: 'test-interface';
  version: '1.0.0';
}

export default class TestInterfaceServerImpl implements TestInterfaceServer {
  greet: GreetTool = async (params) => {
    return `Hello, ${params.name}!`;
  };
}
EOF
}

create_dependency_files() {
    cat > test-server-deps.ts << 'EOF'
import { MCPServer } from 'simply-mcp';
import { greetUser } from './test-deps-helper.js';

@MCPServer()
export default class DepsTestServer {
  greet(name: string): string {
    return greetUser(name);
  }
}
EOF

    cat > test-deps-helper.ts << 'EOF'
export function greetUser(name: string): string {
  return `Hello, ${name}!`;
}
EOF
}

################################################################################
# Test Scenarios
################################################################################

scenario_1_basic_startup_shutdown() {
    print_scenario_header 1 "Basic Watch Mode Startup and Shutdown"

    local logfile="$LOG_DIR/scenario-1.log"
    local failed=0

    log_test "Creating decorator server..."
    create_decorator_server

    # Start watch mode with timeout (sends SIGTERM after 7 seconds)
    log_test "Starting watch mode (will auto-terminate in 7s)..."

    timeout --signal=TERM 7 npx simplymcp run test-server-decorator.ts --watch --verbose > "$logfile" 2>&1
    local exit_code=$?

    log_info "Watch mode terminated (exit code: $exit_code)"
    sleep 1  # Allow file buffers to flush

    # Check for startup messages
    assert_file_contains "$logfile" "Starting watch mode" "Found 'Starting watch mode' message" || failed=1
    assert_file_contains "$logfile" "Server started" "Found 'Server started' message" || failed=1
    assert_file_contains "$logfile" "API Style: decorator" "Correctly detected decorator API" || failed=1

    # Check for shutdown messages (the key fix - these should now appear)
    log_test "Validating graceful shutdown..."
    assert_file_contains "$logfile" "Received SIGTERM, shutting down" "Found 'Received SIGTERM' message" || failed=1
    assert_file_contains "$logfile" "Shutdown complete" "Found 'Shutdown complete' message" || failed=1

    # Verify timeout exit code (124 = timeout killed, 0 = normal exit)
    if [ $exit_code -eq 124 ] || [ $exit_code -eq 0 ]; then
        log_success "Process terminated cleanly (exit code: $exit_code)"
    else
        log_warning "Unexpected exit code: $exit_code (expected 0 or 124)"
    fi

    # Print summary
    echo ""
    if [ $failed -eq 0 ]; then
        SCENARIOS_PASSED=$((SCENARIOS_PASSED + 1))
        log_success "✓ SCENARIO 1 PASSED"
    else
        SCENARIOS_FAILED=$((SCENARIOS_FAILED + 1))
        log_error "✗ SCENARIO 1 FAILED"
        echo ""
        log_info "Log output for debugging:"
        cat "$logfile"
    fi

    return $failed
}

scenario_2_file_change_restart() {
    print_scenario_header 2 "File Change Auto-Restart"

    local logfile="$LOG_DIR/scenario-2.log"
    local failed=0

    log_test "Creating decorator server..."
    create_decorator_server

    log_test "Starting watch mode..."
    npx simplymcp run test-server-decorator.ts --watch --verbose > "$logfile" 2>&1 &
    local watch_pid=$!
    WATCH_PIDS+=("$watch_pid")

    sleep 3

    # Verify initial startup
    assert_file_contains "$logfile" "Server started" "Initial server started" || failed=1

    # Get initial PID from log
    local initial_pid=$(grep -o "Server started (PID: [0-9]*)" "$logfile" 2>/dev/null | tail -1 | grep -o "[0-9]*" || echo "0")
    log_info "Initial server PID: $initial_pid"

    # Record start time
    local start_time=$(date +%s%3N)

    # Modify the file
    log_test "Modifying test-server-decorator.ts..."
    echo "  // Auto-restart test comment" >> test-server-decorator.ts

    # Wait for change detection
    if wait_for_log_pattern "$logfile" "File change detected" 50; then
        log_success "File change detected"
    else
        log_error "File change not detected within 5 seconds"
        cleanup_processes
        SCENARIOS_FAILED=$((SCENARIOS_FAILED + 1))
        return 1
    fi

    # Wait for restart completion
    if wait_for_log_pattern "$logfile" "Restart complete" 100; then
        local end_time=$(date +%s%3N)
        local elapsed=$((end_time - start_time))
        log_success "Restart completed in ${elapsed}ms"

        assert_less_than "$elapsed" 2000 "Restart timing acceptable (< 2000ms)" || failed=1
    else
        log_error "Restart did not complete within 10 seconds"
        cleanup_processes
        SCENARIOS_FAILED=$((SCENARIOS_FAILED + 1))
        return 1
    fi

    # Get new PID
    local new_pid=$(grep -o "Server started (PID: [0-9]*)" "$logfile" 2>/dev/null | tail -1 | grep -o "[0-9]*" || echo "0")
    log_info "New server PID: $new_pid"

    # Verify PID changed
    assert_not_equals "$new_pid" "$initial_pid" "Server process restarted (new PID)" || failed=1

    # Check restart count
    local restart_count=$(grep -c "File change detected" "$logfile" 2>/dev/null || echo "0")
    assert_equals "$restart_count" "1" "Exactly one restart occurred" || failed=1

    cleanup_processes

    echo ""
    if [ $failed -eq 0 ]; then
        SCENARIOS_PASSED=$((SCENARIOS_PASSED + 1))
        log_success "✓ SCENARIO 2 PASSED"
    else
        SCENARIOS_FAILED=$((SCENARIOS_FAILED + 1))
        log_error "✗ SCENARIO 2 FAILED"
    fi

    return $failed
}

scenario_3_polling_mode() {
    print_scenario_header 3 "Polling Mode with Custom Interval"

    local logfile="$LOG_DIR/scenario-3.log"
    local failed=0

    log_test "Creating functional server..."
    create_functional_server

    log_test "Starting watch mode with polling..."
    npx simplymcp run test-server-functional.ts --watch --watch-poll --watch-interval 200 --verbose > "$logfile" 2>&1 &
    local watch_pid=$!
    WATCH_PIDS+=("$watch_pid")

    sleep 3

    # Check for polling mode
    assert_file_contains "$logfile" "Polling mode enabled" "Polling mode enabled" || failed=1
    assert_file_contains "$logfile" "interval: 200ms" "Custom interval (200ms) configured" || failed=1
    assert_file_contains "$logfile" "API Style: functional" "Correctly detected functional API" || failed=1

    # Test file change with polling
    log_test "Testing file change with polling..."
    echo "  // Polling test" >> test-server-functional.ts

    if wait_for_log_pattern "$logfile" "File change detected" 60; then
        log_success "Polling detected file change"
    else
        log_error "Polling did not detect change within 6 seconds"
        failed=1
    fi

    if wait_for_log_pattern "$logfile" "Restart complete" 60; then
        log_success "Restart completed"
    else
        log_error "Restart did not complete"
        failed=1
    fi

    cleanup_processes

    echo ""
    if [ $failed -eq 0 ]; then
        SCENARIOS_PASSED=$((SCENARIOS_PASSED + 1))
        log_success "✓ SCENARIO 3 PASSED"
    else
        SCENARIOS_FAILED=$((SCENARIOS_FAILED + 1))
        log_error "✗ SCENARIO 3 FAILED"
    fi

    return $failed
}

scenario_4_http_transport() {
    print_scenario_header 4 "HTTP Transport with Watch Mode"

    local logfile="$LOG_DIR/scenario-4.log"
    local failed=0

    log_test "Creating decorator server..."
    create_decorator_server

    log_test "Starting watch mode with HTTP..."
    npx simplymcp run test-server-decorator.ts --watch --http --port 9999 --verbose > "$logfile" 2>&1 &
    local watch_pid=$!
    WATCH_PIDS+=("$watch_pid")

    sleep 4

    # Check for HTTP transport
    assert_file_contains "$logfile" "Transport: HTTP" "HTTP transport configured" || failed=1
    assert_file_contains "$logfile" "port 9999" "Port 9999 configured" || failed=1

    # Modify file
    log_test "Modifying server file..."
    echo "  // HTTP test" >> test-server-decorator.ts

    if wait_for_log_pattern "$logfile" "File change detected" 50; then
        log_success "File change detected"
    else
        log_error "File change not detected"
        failed=1
    fi

    if wait_for_log_pattern "$logfile" "Restart complete" 80; then
        log_success "Restart completed"
    else
        log_error "Restart did not complete"
        failed=1
    fi

    # Verify port consistency
    local port_count=$(grep -c "port 9999" "$logfile" 2>/dev/null || echo "0")
    if [ "$port_count" -ge 2 ]; then
        log_success "Port remained consistent after restart"
    else
        log_warning "Could not verify port consistency"
    fi

    cleanup_processes

    echo ""
    if [ $failed -eq 0 ]; then
        SCENARIOS_PASSED=$((SCENARIOS_PASSED + 1))
        log_success "✓ SCENARIO 4 PASSED"
    else
        SCENARIOS_FAILED=$((SCENARIOS_FAILED + 1))
        log_error "✗ SCENARIO 4 FAILED"
    fi

    return $failed
}

scenario_5_interface_api() {
    print_scenario_header 5 "Interface API Support"

    local logfile="$LOG_DIR/scenario-5.log"
    local failed=0

    log_test "Creating interface server..."
    create_interface_server

    log_test "Starting watch mode..."
    npx simplymcp run test-server-interface.ts --watch --verbose > "$logfile" 2>&1 &
    local watch_pid=$!
    WATCH_PIDS+=("$watch_pid")

    sleep 3

    # Check API style detection
    assert_file_contains "$logfile" "API Style: interface" "Correctly detected interface API" || failed=1
    assert_file_contains "$logfile" "Server started" "Interface server started" || failed=1

    # Test file change
    log_test "Modifying interface file..."
    echo "  // Interface test" >> test-server-interface.ts

    if wait_for_log_pattern "$logfile" "File change detected" 50; then
        log_success "File change detected"
    else
        log_error "File change not detected"
        failed=1
    fi

    if wait_for_log_pattern "$logfile" "Restart complete" 80; then
        log_success "Restart completed"
    else
        log_error "Restart did not complete"
        failed=1
    fi

    cleanup_processes

    echo ""
    if [ $failed -eq 0 ]; then
        SCENARIOS_PASSED=$((SCENARIOS_PASSED + 1))
        log_success "✓ SCENARIO 5 PASSED"
    else
        SCENARIOS_FAILED=$((SCENARIOS_FAILED + 1))
        log_error "✗ SCENARIO 5 FAILED"
    fi

    return $failed
}

scenario_6_debouncing() {
    print_scenario_header 6 "Rapid File Changes (Debouncing)"

    local logfile="$LOG_DIR/scenario-6.log"
    local failed=0

    log_test "Creating decorator server..."
    create_decorator_server

    log_test "Starting watch mode..."
    npx simplymcp run test-server-decorator.ts --watch --verbose > "$logfile" 2>&1 &
    local watch_pid=$!
    WATCH_PIDS+=("$watch_pid")

    sleep 3

    # Verify initial startup
    assert_file_contains "$logfile" "Server started" "Initial server started" || failed=1

    # Make multiple rapid changes
    log_test "Making 5 rapid file changes..."
    for i in {1..5}; do
        echo "  // Rapid change $i" >> test-server-decorator.ts
        sleep 0.05
    done

    log_test "Waiting for debouncing to settle (5 seconds)..."
    sleep 5

    # Count restart messages
    local restart_count=$(grep -c "File change detected" "$logfile" 2>/dev/null || echo "0")
    log_info "Number of restarts: $restart_count"

    assert_less_than_or_equal "$restart_count" 2 "Debouncing effective (≤2 restarts for 5 changes)" || failed=1
    assert_process_running "$watch_pid" "Server still running after rapid changes" || failed=1

    cleanup_processes

    echo ""
    if [ $failed -eq 0 ]; then
        SCENARIOS_PASSED=$((SCENARIOS_PASSED + 1))
        log_success "✓ SCENARIO 6 PASSED"
    else
        SCENARIOS_FAILED=$((SCENARIOS_FAILED + 1))
        log_error "✗ SCENARIO 6 FAILED"
    fi

    return $failed
}

scenario_7_error_recovery() {
    print_scenario_header 7 "Error Recovery"

    local logfile="$LOG_DIR/scenario-7.log"
    local failed=0

    log_test "Creating valid server..."
    cat > test-server-error.ts << 'EOF'
import { MCPServer } from 'simply-mcp';

@MCPServer()
export default class ErrorTestServer {
  greet(name: string): string {
    return `Hello, ${name}!`;
  }
}
EOF

    log_test "Starting watch mode..."
    npx simplymcp run test-server-error.ts --watch --verbose > "$logfile" 2>&1 &
    local watch_pid=$!
    WATCH_PIDS+=("$watch_pid")

    sleep 3

    # Verify initial startup
    assert_file_contains "$logfile" "Server started" "Initial server started" || failed=1

    # Introduce syntax error
    log_test "Introducing syntax error..."
    cat > test-server-error.ts << 'EOF'
import { MCPServer } from 'simply-mcp';

@MCPServer()
export default class ErrorTestServer {
  greet(name: string): string {
    return `Hello, ${name}!  // SYNTAX ERROR - missing closing brace
  }
}
EOF

    sleep 3

    # Watch mode should detect change
    assert_file_contains "$logfile" "File change detected" "Change detected" || failed=1

    # Check that watch mode parent is still running
    assert_process_running "$watch_pid" "Watch mode survives syntax error" || failed=1

    # Fix the syntax error
    log_test "Fixing syntax error..."
    cat > test-server-error.ts << 'EOF'
import { MCPServer } from 'simply-mcp';

@MCPServer()
export default class ErrorTestServer {
  greet(name: string): string {
    return `Hello, ${name}!`;
  }
}
EOF

    sleep 3

    # Wait for recovery
    if wait_for_log_pattern "$logfile" "Server started" 80; then
        local start_count=$(grep -c "Server started" "$logfile" 2>/dev/null || echo "0")
        if [ "$start_count" -ge 2 ]; then
            log_success "Server recovered after syntax fix"
        else
            log_error "Server did not restart after fix"
            failed=1
        fi
    else
        log_error "Server did not recover"
        failed=1
    fi

    cleanup_processes

    echo ""
    if [ $failed -eq 0 ]; then
        SCENARIOS_PASSED=$((SCENARIOS_PASSED + 1))
        log_success "✓ SCENARIO 7 PASSED"
    else
        SCENARIOS_FAILED=$((SCENARIOS_FAILED + 1))
        log_error "✗ SCENARIO 7 FAILED"
    fi

    return $failed
}

scenario_8_dependency_watching() {
    print_scenario_header 8 "Dependency File Watching"

    local logfile="$LOG_DIR/scenario-8.log"
    local failed=0

    log_test "Creating server with dependencies..."
    create_dependency_files

    log_test "Starting watch mode..."
    npx simplymcp run test-server-deps.ts --watch --verbose > "$logfile" 2>&1 &
    local watch_pid=$!
    WATCH_PIDS+=("$watch_pid")

    sleep 3

    # Verify initial startup
    assert_file_contains "$logfile" "Server started" "Initial server started" || failed=1

    # Check watch patterns
    if grep -q "Watching patterns:" "$logfile" 2>/dev/null; then
        if grep -A5 "Watching patterns:" "$logfile" | grep -q "\.ts"; then
            log_success "TS files being watched"
        else
            log_warning "TS files not in watch patterns"
        fi
    fi

    # Modify dependency file (NOT main server file)
    log_test "Modifying dependency file (test-deps-helper.ts)..."
    cat > test-deps-helper.ts << 'EOF'
export function greetUser(name: string): string {
  return `Hi there, ${name}!`;  // Changed greeting
}
EOF

    # Wait for change detection
    if wait_for_log_pattern "$logfile" "File change detected" 60; then
        log_success "Dependency file change detected"
    else
        log_error "Dependency file change NOT detected"
        failed=1
    fi

    # Wait for restart
    if wait_for_log_pattern "$logfile" "Restart complete" 80; then
        log_success "Restart completed after dependency change"
    else
        log_error "Restart did not complete"
        failed=1
    fi

    cleanup_processes

    echo ""
    if [ $failed -eq 0 ]; then
        SCENARIOS_PASSED=$((SCENARIOS_PASSED + 1))
        log_success "✓ SCENARIO 8 PASSED"
    else
        SCENARIOS_FAILED=$((SCENARIOS_FAILED + 1))
        log_error "✗ SCENARIO 8 FAILED"
    fi

    return $failed
}

################################################################################
# Final Cleanup
################################################################################

cleanup_and_exit() {
    local exit_code=$1

    log_info "Final cleanup..."
    cleanup_processes

    # Remove test directory
    if [ -d "$TEST_DIR" ]; then
        cd /tmp
        rm -rf "$TEST_DIR"
    fi

    exit $exit_code
}

trap 'cleanup_and_exit 1' INT TERM

################################################################################
# Main Execution
################################################################################

print_summary() {
    local total=$TOTAL_SCENARIOS
    local passed=$SCENARIOS_PASSED
    local failed=$SCENARIOS_FAILED
    local success_rate=0

    if [ $total -gt 0 ]; then
        success_rate=$((passed * 100 / total))
    fi

    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}Test Summary${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "Total scenarios:  ${BOLD}$total${NC}"
    echo -e "Passed:           ${GREEN}${BOLD}$passed${NC}"
    echo -e "Failed:           ${RED}${BOLD}$failed${NC}"
    echo -e "Success rate:     ${BOLD}$success_rate%${NC}"
    echo ""

    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}${BOLD}✓ ALL TESTS PASSED${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}${BOLD}✗ SOME TESTS FAILED${NC}"
        echo ""
        return 1
    fi
}

main() {
    print_header "Watch Mode Integration Test Suite - Simply MCP v2.5.0-beta.3"

    setup_test_environment

    local specific_scenario="${1:-}"

    if [ -n "$specific_scenario" ]; then
        # Run specific scenario
        case "$specific_scenario" in
            1) scenario_1_basic_startup_shutdown ;;
            2) scenario_2_file_change_restart ;;
            3) scenario_3_polling_mode ;;
            4) scenario_4_http_transport ;;
            5) scenario_5_interface_api ;;
            6) scenario_6_debouncing ;;
            7) scenario_7_error_recovery ;;
            8) scenario_8_dependency_watching ;;
            *)
                log_error "Invalid scenario number: $specific_scenario (must be 1-8)"
                cleanup_and_exit 1
                ;;
        esac
    else
        # Run all scenarios
        scenario_1_basic_startup_shutdown || true
        scenario_2_file_change_restart || true
        scenario_3_polling_mode || true
        scenario_4_http_transport || true
        scenario_5_interface_api || true
        scenario_6_debouncing || true
        scenario_7_error_recovery || true
        scenario_8_dependency_watching || true
    fi

    print_summary
    local result=$?

    cleanup_and_exit $result
}

# Run main function
main "$@"
