#!/usr/bin/env bash

# CLI Commands Test Suite
# Tests the new simplified CLI commands: simplymcp run, simplymcp-class, simplymcp-func
# Tests auto-detection, explicit commands, flags, and error handling

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CLI_ROOT="$MCP_ROOT/dist/src/cli"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Test helper functions
print_result() {
  local test_name="$1"
  local result="$2"
  local message="$3"

  if [ "$result" == "PASS" ]; then
    echo -e "${GREEN}✓ PASS${NC}: $test_name"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC}: $test_name"
    if [ -n "$message" ]; then
      echo -e "  ${RED}Error${NC}: $message"
    fi
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

# Kill any background processes on exit
cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null;
 then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi

  # Kill any stray node processes from tests
  pkill -f "simplymcp" 2>/dev/null || true
  pkill -f "tsx.*examples" 2>/dev/null || true
}

trap cleanup EXIT

echo "========================================="
echo "Testing CLI Commands"
echo "========================================="
echo ""

# ============================================ 
# Part 1: Auto-Detection Tests
# ============================================ 

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Part 1: Auto-Detection Tests${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Test 1.1: Auto-detect decorator API
echo "Test 1.1: Auto-detect decorator API from class file"
# Run command with timeout and capture output
(timeout 2 node "$CLI_ROOT/run-bin.js" run "examples/class-minimal.ts" --verbose 2>&1 || true) | tee /tmp/cli-test-decorator.log | head -5 > /dev/null &
sleep 1.5

# Check if server started and detected decorator style
if grep -q "Detected API style: decorator" /tmp/cli-test-decorator.log 2>/dev/null;
 then
  print_result "Auto-detect decorator API" "PASS"
else
  print_result "Auto-detect decorator API" "FAIL" "Did not detect decorator style"
fi

# Test 1.2: Auto-detect functional API
echo ""
echo "Test 1.2: Auto-detect functional API from config file"
timeout 5 node "$CLI_ROOT/run-bin.js" run "examples/single-file-basic.ts" --verbose > /tmp/cli-test-functional.log 2>&1 &
SERVER_PID=$!
sleep 2

# Check if server started and detected functional style
if grep -q "Detected API style: functional" /tmp/cli-test-functional.log 2>/dev/null;
 then
  print_result "Auto-detect functional API" "PASS"
else
  print_result "Auto-detect functional API" "FAIL" "Did not detect functional style"
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

# Test 1.3: Auto-detect programmatic API
echo ""
echo "Test 1.3: Auto-detect programmatic API from direct server file"
timeout 5 node "$CLI_ROOT/run-bin.js" run "examples/simple-server.ts" --verbose > /tmp/cli-test-programmatic.log 2>&1 &
SERVER_PID=$!
sleep 2

# Check if server started and detected programmatic style
if grep -q "Detected API style: programmatic" /tmp/cli-test-programmatic.log 2>/dev/null;
 then
  print_result "Auto-detect programmatic API" "PASS"
else
  print_result "Auto-detect programmatic API" "FAIL" "Did not detect programmatic style"
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

# Test 1.4: Verify decorator server actually starts and registers tools
echo ""
echo "Test 1.4: Verify decorator server starts and registers tools"
timeout 5 node "$CLI_ROOT/run-bin.js" run "examples/class-minimal.ts" > /tmp/cli-test-decorator-tools.log 2>&1 &
SERVER_PID=$!
sleep 3

# Check if tools were registered
if grep -q "Loading class from" /tmp/cli-test-decorator-tools.log 2>/dev/null;
 then
  print_result "Decorator server starts and loads class" "PASS"
else
  print_result "Decorator server starts and loads class" "FAIL" "Server did not load class"
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

# ============================================ 
# Part 2: Explicit Command Tests
# ============================================ 

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Part 2: Explicit Command Tests${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Test 2.1: simplymcp-class command
echo "Test 2.1: simplymcp-class command runs decorator adapter"
timeout 5 node "$CLI_ROOT/class-bin.js" "examples/class-minimal.ts" > /tmp/cli-test-class-cmd.log 2>&1 &
SERVER_PID=$!
sleep 3

# Check if class adapter started
if grep -q "Loading class from" /tmp/cli-test-class-cmd.log 2>/dev/null;
 then
  print_result "simplymcp-class command" "PASS"
else
  print_result "simplymcp-class command" "FAIL" "Class adapter did not start"
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

# Test 2.2: simplymcp-func command
echo ""
echo "Test 2.2: simplymcp-func command runs functional adapter"
timeout 5 node "$CLI_ROOT/func-bin.js" "examples/single-file-basic.ts" > /tmp/cli-test-func-cmd.log 2>&1 &
SERVER_PID=$!
sleep 3

# Check if functional adapter started
if grep -q "Loading config from" /tmp/cli-test-func-cmd.log 2>/dev/null;
 then
  print_result "simplymcp-func command" "PASS"
else
  print_result "simplymcp-func command" "FAIL" "Functional adapter did not start"
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

# Test 2.3: Verify class command with decorator file
echo ""
echo "Test 2.3: Class command works with @MCPServer decorator"
timeout 5 node "$CLI_ROOT/class-bin.js" "examples/class-minimal.ts" > /tmp/cli-test-class-decorator.log 2>&1 &
SERVER_PID=$!
sleep 3

# Check for both class loading and server creation
if grep -q "Loading class from" /tmp/cli-test-class-decorator.log 2>/dev/null && \
   grep -q "Creating server" /tmp/cli-test-class-decorator.log 2>/dev/null;
 then
  print_result "Class command with @MCPServer" "PASS"
else
  print_result "Class command with @MCPServer" "FAIL" "Did not properly load decorated class"
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

# ============================================ 
# Part 3: Flag Tests
# ============================================ 

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Part 3: Flag Tests${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Test 3.1: --style flag forces decorator
echo "Test 3.1: --style decorator flag forces decorator adapter"
timeout 5 node "$CLI_ROOT/run-bin.js" run "examples/simple-server.ts" --style decorator --verbose > /tmp/cli-test-force-decorator.log 2>&1 &
SERVER_PID=$!
sleep 2

# Should show forced style message
if grep -q "Style was forced via --style flag" /tmp/cli-test-force-decorator.log 2>/dev/null;
 then
  print_result "--style decorator flag" "PASS"
else
  print_result "--style decorator flag" "FAIL" "Did not force decorator style"
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

# Test 3.2: --style flag forces functional
echo ""
echo "Test 3.2: --style functional flag forces functional adapter"
timeout 5 node "$CLI_ROOT/run-bin.js" run "examples/single-file-basic.ts" --style functional --verbose > /tmp/cli-test-force-functional.log 2>&1 &
SERVER_PID=$!
sleep 2

# Should show forced style message
if grep -q "Style was forced via --style flag" /tmp/cli-test-force-functional.log 2>/dev/null;
 then
  print_result "--style functional flag" "PASS"
else
  print_result "--style functional flag" "FAIL" "Did not force functional style"
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

# Test 3.3: --verbose flag shows detection info
echo ""
echo "Test 3.3: --verbose flag shows detection details"
timeout 5 node "$CLI_ROOT/run-bin.js" run "examples/class-minimal.ts" --verbose > /tmp/cli-test-verbose.log 2>&1 &
SERVER_PID=$!
sleep 3

# Should show detection message
if grep -q "Detected API style" /tmp/cli-test-verbose.log 2>/dev/null;
 then
  print_result "--verbose flag shows detection" "PASS"
else
  print_result "--verbose flag shows detection" "FAIL" "Verbose output missing"
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

# Test 3.4: --help flag shows documentation
echo ""
echo "Test 3.4: --help flag shows documentation"
if node "$CLI_ROOT/run-bin.js" --help > /tmp/cli-test-help.log 2>&1;
 then
  # Should show usage information
  if grep -q "Auto-detect and run" /tmp/cli-test-help.log 2>/dev/null || \
     grep -q "Commands:" /tmp/cli-test-help.log 2>/dev/null;
   then
    print_result "--help flag shows documentation" "PASS"
  else
    print_result "--help flag shows documentation" "FAIL" "Help text incomplete"
  fi
else
  print_result "--help flag shows documentation" "FAIL" "Help command failed"
fi

# Test 3.5: HTTP transport flag works
echo ""
echo "Test 3.5: --http flag enables HTTP transport"
timeout 5 node "$CLI_ROOT/run-bin.js" run "examples/class-minimal.ts" --http --port 3333 > /tmp/cli-test-http.log 2>&1 &
SERVER_PID=$!
sleep 3

# Check if HTTP server started on correct port
if curl -s http://localhost:3333 > /dev/null 2>&1 || \
   curl -s http://localhost:3333/sse > /dev/null 2>&1;
 then
  print_result "--http flag enables HTTP transport" "PASS"
else
  # Might be running but not responding to basic curl, check logs for HTTP mention
  if grep -qi "http" /tmp/cli-test-http.log 2>/dev/null || \
     grep -qi "port.*3333" /tmp/cli-test-http.log 2>/dev/null;
   then
    print_result "--http flag enables HTTP transport" "PASS"
  else
    print_result "--http flag enables HTTP transport" "FAIL" "HTTP server did not start"
  fi
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

# ============================================ 
# Part 4: Error Handling Tests
# ============================================ 

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Part 4: Error Handling Tests${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Test 4.1: File not found error
echo "Test 4.1: Handle missing file error"
if node "$CLI_ROOT/run-bin.js" run "/tmp/nonexistent-file-12345.ts" > /tmp/cli-test-notfound.log 2>&1;
 then
  print_result "File not found error" "FAIL" "Should have failed for missing file"
else
  # Check if proper error message was shown
  if grep -q "not found" /tmp/cli-test-notfound.log 2>/dev/null || \
     grep -q "ENOENT" /tmp/cli-test-notfound.log 2>/dev/null;
   then
    print_result "File not found error" "PASS"
  else
    print_result "File not found error" "FAIL" "Error message unclear"
  fi
fi

# Test 4.2: Invalid file type error (not a .ts file)
echo ""
echo "Test 4.2: Handle invalid file type"
echo "console.log('test')" > /tmp/cli-test-invalid.js
if node "$CLI_ROOT/run-bin.js" run "/tmp/cli-test-invalid.js" --verbose > /tmp/cli-test-invalid-type.log 2>&1;
 then
  # If it runs, at least verify it tried to detect the style
  if grep -q "Detected API style" /tmp/cli-test-invalid-type.log 2>/dev/null;
   then
    print_result "Handle non-TypeScript file" "PASS"
  else
    print_result "Handle non-TypeScript file" "FAIL" "Should detect API style"
  fi
else
  print_result "Handle non-TypeScript file" "PASS"
fi
rm -f /tmp/cli-test-invalid.js

# Test 4.3: Detect programmatic as fallback for ambiguous file
echo ""
echo "Test 4.3: Fallback to programmatic for undetectable style"
cat > /tmp/cli-test-ambiguous.ts << 'EOF'
# File with no clear API style indicators
const someVar = 123;
export default someVar;
EOF

timeout 5 node "$CLI_ROOT/run-bin.js" run "/tmp/cli-test-ambiguous.ts" --verbose > /tmp/cli-test-ambiguous.log 2>&1 &
SERVER_PID=$!
sleep 2

# Should default to programmatic
if grep -q "Detected API style: programmatic" /tmp/cli-test-ambiguous.log 2>/dev/null;
 then
  print_result "Fallback to programmatic style" "PASS"
else
  print_result "Fallback to programmatic style" "FAIL" "Did not fallback to programmatic"
fi

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""
rm -f /tmp/cli-test-ambiguous.ts

# Test 4.4: Class command with non-class file shows error
echo ""
echo "Test 4.4: Class command with non-class file shows error"
if timeout 5 node "$CLI_ROOT/class-bin.js" "examples/single-file-basic.ts" > /tmp/cli-test-class-error.log 2>&1;
 then
  print_result "Class command error handling" "FAIL" "Should fail for non-class file"
else
  # Check for appropriate error message
  if grep -qi "error" /tmp/cli-test-class-error.log 2>/dev/null || \
     grep -qi "class" /tmp/cli-test-class-error.log 2>/dev/null;
   then
    print_result "Class command error handling" "PASS"
  else
    print_result "Class command error handling" "FAIL" "Missing error message"
  fi
fi

# Test 4.5: Func command with non-config file shows error
echo ""
echo "Test 4.5: Func command with non-config file shows error"
if timeout 5 node "$CLI_ROOT/func-bin.js" "examples/class-minimal.ts" > /tmp/cli-test-func-error.log 2>&1;
 then
  print_result "Func command error handling" "FAIL" "Should fail for non-config file"
else
  # Check for appropriate error message
  if grep -qi "error" /tmp/cli-test-func-error.log 2>/dev/null || \
     grep -qi "config" /tmp/cli-test-func-error.log 2>/dev/null;
   then
    print_result "Func command error handling" "PASS"
  else
    print_result "Func command error handling" "FAIL" "Missing error message"
  fi
fi

# ============================================ 
# Test Summary
# ============================================ 

echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

# Cleanup temp files
rm -f /tmp/cli-test-*.log

# Exit with appropriate code
if [ $TESTS_FAILED -eq 0 ];
 then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
fi