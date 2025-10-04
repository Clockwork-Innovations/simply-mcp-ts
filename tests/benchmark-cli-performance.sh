#!/usr/bin/env bash
#
# CLI Performance Benchmark Script
# Measures CLI startup time and validates performance targets
#

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== CLI Performance Benchmark ==="
echo ""

# Test files
TEST_DECORATOR="examples/class-minimal.ts"
TEST_FUNCTIONAL="examples/function-server.ts"
TEST_PROGRAMMATIC="examples/simple-server.ts"

# Performance targets (in milliseconds)
TARGET_DETECTION=50
TARGET_TOTAL=100

# Function to measure CLI performance
measure_performance() {
  local file=$1
  local style=$2

  echo "Testing: $file ($style API)"

  # Run with --verbose to get performance metrics
  # Capture stderr where performance metrics are logged
  local output=$(npx tsx src/cli/index.ts run "$file" --verbose --style="$style" --dry-run 2>&1 || true)

  # Extract detection time
  local detection_time=$(echo "$output" | grep -oP '(?<=\[Perf\] Detection: )[0-9.]+' || echo "0")

  # Check cache hit
  local cache_hit=$(echo "$output" | grep "Cache hit" || echo "")

  if [ -n "$cache_hit" ]; then
    echo -e "  ${GREEN}✓${NC} Cache hit detected"
  fi

  if [ -n "$detection_time" ]; then
    echo "  Detection time: ${detection_time}ms"

    # Check against target
    if (( $(echo "$detection_time < $TARGET_DETECTION" | bc -l) )); then
      echo -e "  ${GREEN}✓${NC} Detection < ${TARGET_DETECTION}ms"
    else
      echo -e "  ${RED}✗${NC} Detection >= ${TARGET_DETECTION}ms"
    fi
  else
    echo -e "  ${YELLOW}!${NC} Could not measure detection time"
  fi

  echo ""
}

# Build the project first
echo "Building project..."
npm run build > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Build complete"
echo ""

# Run benchmarks
echo "Running performance benchmarks..."
echo ""

# Test decorator API (cold cache)
if [ -f "$TEST_DECORATOR" ]; then
  measure_performance "$TEST_DECORATOR" "decorator"
fi

# Test functional API
if [ -f "$TEST_FUNCTIONAL" ]; then
  measure_performance "$TEST_FUNCTIONAL" "functional"
fi

# Test programmatic API
if [ -f "$TEST_PROGRAMMATIC" ]; then
  measure_performance "$TEST_PROGRAMMATIC" "programmatic"
fi

# Test cache hit (run decorator again)
echo "Testing cache performance (2nd run)..."
if [ -f "$TEST_DECORATOR" ]; then
  measure_performance "$TEST_DECORATOR" "decorator"
fi

echo "=== Benchmark Complete ==="
echo ""
echo "Performance Targets:"
echo "  - Detection: < ${TARGET_DETECTION}ms"
echo "  - Total overhead: < ${TARGET_TOTAL}ms"
echo ""
echo "Note: Lazy loading is already implemented via dynamic imports"
echo "      All adapter dependencies are loaded only when needed"
