#!/bin/bash
# Test script for MCP Stdio Transport
# This script wraps the TypeScript test client for convenience

echo "========================================="
echo "Testing MCP Stdio Transport"
echo "========================================="
echo ""
echo "Running TypeScript-based stdio client tests..."
echo ""

# Execute the TypeScript test client
npx tsx mcp/tests/test-stdio-client.ts

# Exit with the same exit code as the test
exit $?