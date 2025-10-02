#!/bin/bash
###############################################################################
# Integration Tests Wrapper
# This wrapper runs the TypeScript integration tests via tsx
###############################################################################

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Run the TypeScript integration tests
cd "$MCP_DIR" && npx tsx "$SCRIPT_DIR/test-binary-integration.ts"
