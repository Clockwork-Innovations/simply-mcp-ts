#!/bin/bash
# Quick test script for video editor MCP server

set -e

echo "=== Video Editor MCP Quick Test ==="
echo ""

# Check if test video exists from the original app
TEST_VIDEO="/mnt/Shared/cs-projects/video-editor/test_output.mp4"

if [ ! -f "$TEST_VIDEO" ]; then
  echo "Test video not found at $TEST_VIDEO"
  echo "Downloading a test video..."

  TEST_VIDEO="/tmp/test_video.mp4"
  curl -L "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4" \
    -o "$TEST_VIDEO" || {
      echo "Failed to download test video. Please provide a video file manually."
      exit 1
    }
fi

echo "Using test video: $TEST_VIDEO"
echo ""

# Test that server can start
echo "Testing server startup..."
timeout 5 node dist/src/cli/run.js examples/video-editor-mcp/video-editor-server.ts --stdio 2>&1 | head -20 &
SERVER_PID=$!

sleep 2

if ps -p $SERVER_PID > /dev/null 2>&1; then
  echo "✅ Server started successfully"
  kill $SERVER_PID 2>/dev/null || true
else
  echo "❌ Server failed to start"
  exit 1
fi

echo ""
echo "=== Basic Tests Passed ==="
echo ""
echo "Server is ready to use!"
echo ""
echo "Next steps:"
echo "1. Test with Claude Desktop (see README.md for configuration)"
echo "2. Use the test video at: $TEST_VIDEO"
echo "3. Try these example prompts:"
echo "   - 'Get information about $TEST_VIDEO'"
echo "   - 'Slow down $TEST_VIDEO to 60% speed and save to /tmp/slow.mp4'"
echo "   - 'Trim $TEST_VIDEO from 2s to 8s and save to /tmp/trimmed.mp4'"
echo ""
echo "For more examples, see test-usage.md"
