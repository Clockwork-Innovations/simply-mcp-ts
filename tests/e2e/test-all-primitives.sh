#!/bin/bash

# Comprehensive E2E Validation of All MCP Primitives
# Tests all 9 MCP primitives through the API

# Don't exit on error - we want to run all tests
# set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:3004"
SERVER_PATH="/mnt/Shared/cs-projects/simply-mcp-ts/examples/interface-test-harness-demo.ts"
TEST_RESULTS_FILE="/tmp/mcp-test-results.txt"

# Initialize results file
echo "MCP Primitives E2E Test Results" > "$TEST_RESULTS_FILE"
echo "================================" >> "$TEST_RESULTS_FILE"
echo "Timestamp: $(date)" >> "$TEST_RESULTS_FILE"
echo "" >> "$TEST_RESULTS_FILE"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Function to print section header
print_section() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# Function to print test result
print_test() {
    local test_name=$1
    local status=$2
    local message=$3

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        [ -n "$message" ] && echo "  → $message"
        echo "✓ PASS: $test_name" >> "$TEST_RESULTS_FILE"
        [ -n "$message" ] && echo "  $message" >> "$TEST_RESULTS_FILE"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        [ -n "$message" ] && echo "  → $message"
        echo "✗ FAIL: $test_name" >> "$TEST_RESULTS_FILE"
        [ -n "$message" ] && echo "  $message" >> "$TEST_RESULTS_FILE"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    echo "" >> "$TEST_RESULTS_FILE"
}

# Function to make API call and check response
test_api_call() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_field=$5

    echo -e "${YELLOW}Testing:${NC} $test_name"

    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BACKEND_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    # Split response and status code
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    echo "Response: $body" | head -c 200
    echo ""

    # Check HTTP status
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        # Check for expected field if provided
        if [ -n "$expected_field" ]; then
            if echo "$body" | jq -e "$expected_field" > /dev/null 2>&1; then
                print_test "$test_name" "PASS" "HTTP $http_code, field '$expected_field' found"
                echo "$body" | jq '.' 2>/dev/null || echo "$body"
                return 0
            else
                print_test "$test_name" "FAIL" "HTTP $http_code, field '$expected_field' not found"
                echo "$body" | jq '.' 2>/dev/null || echo "$body"
                return 1
            fi
        else
            print_test "$test_name" "PASS" "HTTP $http_code"
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
            return 0
        fi
    else
        print_test "$test_name" "FAIL" "HTTP $http_code"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
}

# Start testing
print_section "MCP PRIMITIVES E2E VALIDATION"

echo -e "${YELLOW}Backend URL:${NC} $BACKEND_URL"
echo -e "${YELLOW}Test Server:${NC} $SERVER_PATH"
echo ""

# Check backend health
print_section "0. Backend Health Check"
if curl -s "$BACKEND_URL/api/mcp/status" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is responding${NC}"
else
    echo -e "${RED}✗ Backend is not responding. Please start the backend:${NC}"
    echo "  cd mcp-interpreter && npm run dev -- --webpack --port 3004"
    exit 1
fi

# Step 1: Connect to server
print_section "1. Connection Test"

echo -e "${YELLOW}Disconnecting existing connection...${NC}"
curl -s -X POST "$BACKEND_URL/api/mcp/disconnect" > /dev/null 2>&1 || true
sleep 1

test_api_call "Connect to test harness server via stdio" "POST" "/api/mcp/connect" \
    "{\"type\":\"stdio\",\"serverPath\":\"$SERVER_PATH\"}" \
    ".data.status"

sleep 2

# Step 2: Test Status
print_section "2. Status Check"
test_api_call "Get connection status" "GET" "/api/mcp/status" "" ".data.status"

# Step 3: Test Tools Primitive
print_section "3. Tools Primitive"

test_api_call "List all tools" "GET" "/api/mcp/tools" "" ".data"

test_api_call "Execute configure_service tool" "POST" "/api/mcp/tools/execute" \
    "{\"name\":\"configure_service\",\"parameters\":{\"serviceName\":\"test-service\",\"priority\":\"high\"}}" \
    ".data.content"

test_api_call "Execute process_items tool" "POST" "/api/mcp/tools/execute" \
    "{\"name\":\"process_items\",\"parameters\":{\"count\":5,\"message\":\"Test processing\"}}" \
    ".data.content"

test_api_call "Execute perform_operation tool" "POST" "/api/mcp/tools/execute" \
    "{\"name\":\"perform_operation\",\"parameters\":{\"operation\":\"read\",\"path\":\"/test/path\"}}" \
    ".data.content"

# Step 4: Test Resources Primitive
print_section "4. Resources Primitive"

test_api_call "List all resources" "GET" "/api/mcp/resources" "" ".data"

test_api_call "Read static resource" "POST" "/api/mcp/resources/read" \
    "{\"uri\":\"info://static/about\"}" \
    ".data.contents"

test_api_call "Read dynamic resource" "POST" "/api/mcp/resources/read" \
    "{\"uri\":\"stats://dynamic/current\"}" \
    ".data.contents"

test_api_call "Read live events resource" "POST" "/api/mcp/resources/read" \
    "{\"uri\":\"events://live/stream\"}" \
    ".data.contents"

# Step 5: Test Prompts Primitive
print_section "5. Prompts Primitive"

test_api_call "List all prompts" "GET" "/api/mcp/prompts" "" ".data"

test_api_call "Get code_review prompt" "POST" "/api/mcp/prompts/get" \
    "{\"name\":\"code_review\",\"arguments\":{\"file\":\"test.ts\",\"focus\":\"security\"}}" \
    ".data.messages"

test_api_call "Get analyze_data prompt" "POST" "/api/mcp/prompts/get" \
    "{\"name\":\"analyze_data\",\"arguments\":{\"data\":\"sample data\",\"analysisType\":\"summary\"}}" \
    ".data.messages"

# Step 6: Test Roots Primitive
print_section "6. Roots Primitive"

test_api_call "List roots" "GET" "/api/mcp/roots" "" "."

# Step 7: Test Completions Primitive
print_section "7. Completions Primitive"

test_api_call "Get service name completions" "POST" "/api/mcp/completions" \
    "{\"ref\":{\"type\":\"ref/prompt\",\"name\":\"code_review\"},\"argument\":{\"name\":\"serviceName\",\"value\":\"auth\"}}" \
    ".values"

test_api_call "Get priority completions" "POST" "/api/mcp/completions" \
    "{\"ref\":{\"type\":\"ref/prompt\",\"name\":\"code_review\"},\"argument\":{\"name\":\"priority\",\"value\":\"h\"}}" \
    ".values"

# Step 8: Test Subscriptions Primitive
print_section "8. Subscriptions Primitive"

test_api_call "Subscribe to live events resource" "POST" "/api/mcp/subscriptions/subscribe" \
    "{\"uri\":\"events://live/stream\"}" \
    "."

test_api_call "List active subscriptions" "GET" "/api/mcp/subscriptions" "" "."

test_api_call "Unsubscribe from live events resource" "POST" "/api/mcp/subscriptions/unsubscribe" \
    "{\"uri\":\"events://live/stream\"}" \
    "."

# Step 9: Test Logging Primitive
print_section "9. Logging Primitive"

test_api_call "Get protocol logs" "GET" "/api/mcp/logs" "" "."

# Step 10: Test Error Scenarios
print_section "10. Error Handling Tests"

test_api_call "Execute non-existent tool (should fail gracefully)" "POST" "/api/mcp/tools/execute" \
    "{\"name\":\"nonexistent_tool\",\"parameters\":{}}" \
    "" && print_test "Error handling for non-existent tool" "FAIL" "Should have returned error" || print_test "Error handling for non-existent tool" "PASS" "Correctly returned error"

test_api_call "Read non-existent resource (should fail gracefully)" "POST" "/api/mcp/resources/read" \
    "{\"uri\":\"nonexistent://resource\"}" \
    "" && print_test "Error handling for non-existent resource" "FAIL" "Should have returned error" || print_test "Error handling for non-existent resource" "PASS" "Correctly returned error"

test_api_call "Get non-existent prompt (should fail gracefully)" "POST" "/api/mcp/prompts/get" \
    "{\"name\":\"nonexistent_prompt\",\"arguments\":{}}" \
    "" && print_test "Error handling for non-existent prompt" "FAIL" "Should have returned error" || print_test "Error handling for non-existent prompt" "PASS" "Correctly returned error"

# Step 11: Test Disconnected State
print_section "11. Disconnected State Tests"

echo -e "${YELLOW}Disconnecting from server...${NC}"
curl -s -X POST "$BACKEND_URL/api/mcp/disconnect" > /dev/null 2>&1
sleep 1

test_api_call "List tools while disconnected (should fail)" "GET" "/api/mcp/tools" "" "" && \
    print_test "Disconnected state handling" "FAIL" "Should have returned error" || \
    print_test "Disconnected state handling" "PASS" "Correctly returned error"

# Reconnect for final status check
echo -e "${YELLOW}Reconnecting for final status check...${NC}"
curl -s -X POST "$BACKEND_URL/api/mcp/connect" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"stdio\",\"serverPath\":\"$SERVER_PATH\"}" > /dev/null 2>&1
sleep 2

# Final Summary
print_section "TEST SUMMARY"

echo "" >> "$TEST_RESULTS_FILE"
echo "================================" >> "$TEST_RESULTS_FILE"
echo "TEST SUMMARY" >> "$TEST_RESULTS_FILE"
echo "================================" >> "$TEST_RESULTS_FILE"
echo "Total Tests:  $TOTAL_TESTS" >> "$TEST_RESULTS_FILE"
echo "Passed:       $TESTS_PASSED" >> "$TEST_RESULTS_FILE"
echo "Failed:       $TESTS_FAILED" >> "$TEST_RESULTS_FILE"
echo "" >> "$TEST_RESULTS_FILE"

echo -e "Total Tests:  ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed:       ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed:       ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo "✓ All tests passed!" >> "$TEST_RESULTS_FILE"
    echo ""
    echo -e "Results saved to: ${BLUE}$TEST_RESULTS_FILE${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo "✗ Some tests failed" >> "$TEST_RESULTS_FILE"
    echo ""
    echo -e "Results saved to: ${BLUE}$TEST_RESULTS_FILE${NC}"
    exit 1
fi
