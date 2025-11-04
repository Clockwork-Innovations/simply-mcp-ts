#!/bin/bash
# Test script to verify prompt bug fix

echo "Testing prompt fix for interface-test-harness-demo.ts"
echo "======================================================"
echo ""

# Start the server in the background
echo "Starting server..."
cd /mnt/Shared/cs-projects/simply-mcp-ts
npx simply-mcp run examples/interface-test-harness-demo.ts --http --port 8080 > /tmp/server-output.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start (PID: $SERVER_PID)..."
sleep 5

# Test code_review prompt
echo ""
echo "Testing code_review prompt..."
echo "==============================="
RESPONSE=$(curl -s -X POST http://localhost:8080/api/prompts/code_review \
  -H "Content-Type: application/json" \
  -d '{"args":{"file":"test.ts","focus":"security"}}')

echo "Response:"
echo "$RESPONSE" | jq '.'

# Check if response contains proper text (not "[object Object]")
if echo "$RESPONSE" | jq -e '.messages[0].content.text | contains("Please review the file: test.ts")' > /dev/null; then
  echo "✅ code_review prompt returns proper text"
else
  echo "❌ code_review prompt still returns '[object Object]'"
  echo "Full response: $RESPONSE"
fi

echo ""
echo "Testing analyze_data prompt..."
echo "==============================="
RESPONSE2=$(curl -s -X POST http://localhost:8080/api/prompts/analyze_data \
  -H "Content-Type: application/json" \
  -d '{"args":{"data":"sample data","analysisType":"sentiment"}}')

echo "Response:"
echo "$RESPONSE2" | jq '.'

# Check if response contains proper text (not "[object Object]")
if echo "$RESPONSE2" | jq -e '.messages[0].content.text | contains("Perform sentiment analysis")' > /dev/null; then
  echo "✅ analyze_data prompt returns proper text"
else
  echo "❌ analyze_data prompt still returns '[object Object]'"
  echo "Full response: $RESPONSE2"
fi

# Cleanup
echo ""
echo "Stopping server..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo ""
echo "Test complete!"
