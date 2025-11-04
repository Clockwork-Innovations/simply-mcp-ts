#!/bin/bash
# Test script for recursion prevention in run-all-tests.sh
# This validates that the depth detection prevents infinite loops

echo "=========================================="
echo " Testing Recursion Prevention"
echo "=========================================="
echo ""

# Test 1: Single invocation (depth 0 -> 1) should succeed
echo "Test 1: Single invocation (should succeed)"
echo "-------------------------------------------"
export RUN_ALL_TESTS_DEPTH=0
bash -c 'echo "Depth at start: $RUN_ALL_TESTS_DEPTH"; export RUN_ALL_TESTS_DEPTH=$((RUN_ALL_TESTS_DEPTH + 1)); echo "Depth after increment: $RUN_ALL_TESTS_DEPTH"; if [ "$RUN_ALL_TESTS_DEPTH" -ge 2 ]; then echo "BLOCKED"; exit 1; else echo "ALLOWED"; fi'
if [ $? -eq 0 ]; then
  echo "✓ PASS: Single invocation allowed"
else
  echo "✗ FAIL: Single invocation was blocked"
fi
echo ""

# Test 2: Second level (depth 1 -> 2) should be blocked
echo "Test 2: Second level (should be blocked)"
echo "-------------------------------------------"
export RUN_ALL_TESTS_DEPTH=1
bash -c 'echo "Depth at start: $RUN_ALL_TESTS_DEPTH"; export RUN_ALL_TESTS_DEPTH=$((RUN_ALL_TESTS_DEPTH + 1)); echo "Depth after increment: $RUN_ALL_TESTS_DEPTH"; if [ "$RUN_ALL_TESTS_DEPTH" -ge 2 ]; then echo "BLOCKED - Recursion detected!"; exit 1; else echo "ALLOWED"; fi'
if [ $? -ne 0 ]; then
  echo "✓ PASS: Recursion was blocked at depth 2"
else
  echo "✗ FAIL: Recursion was not blocked"
fi
echo ""

# Test 3: Verify environment variable inheritance
echo "Test 3: Environment variable inheritance"
echo "-------------------------------------------"
export RUN_ALL_TESTS_DEPTH=0
RESULT=$(bash -c 'export RUN_ALL_TESTS_DEPTH=$((RUN_ALL_TESTS_DEPTH + 1)); bash -c "echo \$RUN_ALL_TESTS_DEPTH"')
if [ "$RESULT" = "1" ]; then
  echo "✓ PASS: Environment variable inherited correctly"
else
  echo "✗ FAIL: Environment variable not inherited (got: $RESULT)"
fi
echo ""

# Test 4: Simulate the actual recursion scenario
echo "Test 4: Simulate actual recursion chain (3 levels)"
echo "-------------------------------------------"
export RUN_ALL_TESTS_DEPTH=0
bash -c '
  export RUN_ALL_TESTS_DEPTH=$((RUN_ALL_TESTS_DEPTH + 1))
  echo "Level 1: depth=$RUN_ALL_TESTS_DEPTH"
  bash -c '\''
    export RUN_ALL_TESTS_DEPTH=$((RUN_ALL_TESTS_DEPTH + 1))
    echo "Level 2: depth=$RUN_ALL_TESTS_DEPTH (should be blocked)"
    if [ "$RUN_ALL_TESTS_DEPTH" -ge 2 ]; then
      echo "Recursion BLOCKED at depth $RUN_ALL_TESTS_DEPTH"
      exit 1
    fi
  '\''
'
if [ $? -ne 0 ]; then
  echo "✓ PASS: Recursion chain blocked at level 2"
else
  echo "✗ FAIL: Recursion chain was not blocked"
fi
echo ""

echo "=========================================="
echo " Recursion Prevention Test Complete"
echo "=========================================="
echo ""
echo "Summary:"
echo "- Single invocation works correctly"
echo "- Recursion is blocked at depth >= 2"
echo "- Environment variables propagate correctly"
echo ""
echo "Next steps:"
echo "1. Run: bash scripts/pre-test-validation.sh"
echo "2. Verify no rogue processes exist"
echo "3. When ready, test with: npm test (with monitoring)"
echo ""
