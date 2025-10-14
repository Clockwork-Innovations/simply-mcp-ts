# Video Editor MCP - Test Usage Guide

This guide shows how to test the video editor MCP server with real examples.

## Quick Start Test

### 1. Check ffmpeg Installation

```bash
ffmpeg -version
ffprobe -version
```

### 2. Get a Test Video

```bash
# Download a short test video (Big Buck Bunny - 10 seconds)
curl -L "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4" \
  -o /tmp/test_video.mp4

# Or use your own video
cp /path/to/your/video.mp4 /tmp/test_video.mp4
```

### 3. Run the Server

```bash
# From simple-mcp root
npm run build
npm run cli -- run examples/video-editor-mcp/video-editor-server.ts
```

### 4. Test with MCP Inspector

```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Run inspector with the server
npx @modelcontextprotocol/inspector node dist/cli/run.js examples/video-editor-mcp/video-editor-server.ts
```

## Manual Testing with Node

Create a test script:

```typescript
// test-video-editor.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testVideoEditor() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/cli/run.js', 'examples/video-editor-mcp/video-editor-server.ts']
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  await client.connect(transport);

  // Test 1: Get video info
  console.log('Test 1: Getting video info...');
  const infoResult = await client.callTool({
    name: 'get_video_info',
    arguments: {
      video_path: '/tmp/test_video.mp4'
    }
  });
  console.log(infoResult);

  // Test 2: Trim video
  console.log('\nTest 2: Trimming video...');
  const trimResult = await client.callTool({
    name: 'trim_video',
    arguments: {
      input_path: '/tmp/test_video.mp4',
      output_path: '/tmp/test_trimmed.mp4',
      start_time: 2.0,
      end_time: 5.0
    }
  });
  console.log(trimResult);

  // Test 3: Adjust speed
  console.log('\nTest 3: Adjusting speed...');
  const speedResult = await client.callTool({
    name: 'adjust_speed',
    arguments: {
      input_path: '/tmp/test_video.mp4',
      output_path: '/tmp/test_slow.mp4',
      speed: 0.5
    }
  });
  console.log(speedResult);

  await client.close();
}

testVideoEditor().catch(console.error);
```

Run it:
```bash
npx tsx test-video-editor.ts
```

## Testing with Claude Desktop

### 1. Configure Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "video-editor": {
      "command": "node",
      "args": [
        "/absolute/path/to/simple-mcp/dist/cli/run.js",
        "/absolute/path/to/simple-mcp/examples/video-editor-mcp/video-editor-server.ts"
      ]
    }
  }
}
```

### 2. Restart Claude Desktop

### 3. Test Prompts

Try these prompts with Claude:

```
Get information about the video at /tmp/test_video.mp4
```

```
Slow down the video at /tmp/test_video.mp4 to 60% speed and save to /tmp/slow.mp4
```

```
Trim the video /tmp/test_video.mp4 from 2 seconds to 8 seconds, save to /tmp/trimmed.mp4
```

```
Create a loop of /tmp/test_video.mp4 from 2s to 5s, repeat 3 times with 0.3s crossfade, save to /tmp/looped.mp4
```

```
Apply keyframe speed to /tmp/test_video.mp4: start at 30% speed (time 0), ramp to 100% speed (time 5), save to /tmp/keyframe.mp4
```

```
Join these videos into one: /tmp/video1.mp4, /tmp/video2.mp4, save to /tmp/combined.mp4
```

## Expected Results

### Get Video Info
```
Video Information:

{
  "duration": 10.0,
  "size": 1048576,
  "bitrate": 838860,
  "format": "mov,mp4,m4a,3gp,3g2,mj2",
  "video": {
    "codec": "h264",
    "width": 640,
    "height": 360,
    "fps": 24,
    "bitrate": 737599
  },
  "audio": {
    "codec": "aac",
    "sample_rate": 22050,
    "channels": 2,
    "bitrate": 96000
  }
}

Duration: 10.00s
Resolution: 640x360
Size: 1.00 MB
```

### Adjust Speed (50%)
```
✅ Video speed adjusted to 50%

Input: /tmp/test_video.mp4
Output: /tmp/test_slow.mp4
Speed: 0.5x
Output size: 1.85 MB
```

### Trim Video
```
✅ Video trimmed

Input: /tmp/test_video.mp4
Output: /tmp/test_trimmed.mp4
Range: 2s - 5s
Duration: 3.00s
Output size: 0.31 MB
```

### Loop with Crossfade
```
✅ Looped section created with crossfade

Input: /tmp/test_video.mp4
Output: /tmp/test_looped.mp4
Section: 2s - 5s
Loop count: 3
Crossfade: 0.3s
Output size: 1.42 MB
```

## Common Test Scenarios

### Scenario 1: Create Slow-Motion Intro

```typescript
// Slow start (30% speed for 5s), then normal speed
{
  "input_path": "/tmp/video.mp4",
  "output_path": "/tmp/slomo_intro.mp4",
  "keyframes": [
    { "time": 0, "speed": 0.3 },
    { "time": 5, "speed": 1.0 }
  ],
  "interpolation": "ease_out"
}
```

### Scenario 2: Create Highlight Loop

```typescript
// Extract best moment and loop it
// Step 1: Trim to highlight
{
  "input_path": "/tmp/original.mp4",
  "output_path": "/tmp/highlight.mp4",
  "start_time": 45.0,
  "end_time": 50.0
}

// Step 2: Loop with crossfade
{
  "input_path": "/tmp/highlight.mp4",
  "output_path": "/tmp/highlight_loop.mp4",
  "start_time": 0,
  "end_time": 5.0,
  "loop_count": 5,
  "crossfade_duration": 0.5
}
```

### Scenario 3: Create Multi-Part Video

```typescript
// Combine intro, main content, and outro
{
  "input_paths": [
    "/tmp/intro.mp4",
    "/tmp/main_content.mp4",
    "/tmp/outro.mp4"
  ],
  "output_path": "/tmp/final_video.mp4"
}
```

### Scenario 4: Variable Speed Throughout

```typescript
// Complex speed ramping
{
  "input_path": "/tmp/video.mp4",
  "output_path": "/tmp/variable_speed.mp4",
  "keyframes": [
    { "time": 0, "speed": 0.5 },    // Slow start
    { "time": 10, "speed": 1.5 },   // Speed up
    { "time": 20, "speed": 0.8 },   // Slow down a bit
    { "time": 30, "speed": 1.0 }    // Normal ending
  ],
  "interpolation": "ease_in_out"
}
```

## Verification

After processing, verify outputs:

```bash
# Check file exists and has content
ls -lh /tmp/test_*.mp4

# Get info about processed video
ffprobe -v error -show_format -show_streams /tmp/test_slow.mp4

# Play video (if you have a player)
ffplay /tmp/test_slow.mp4

# Or convert first frame to image for visual check
ffmpeg -i /tmp/test_slow.mp4 -vframes 1 /tmp/test_slow_frame.jpg
```

## Performance Benchmarks

Expected processing times (on average hardware):

| Operation | 10s video (1080p) | 60s video (1080p) | 10s video (4K) |
|-----------|-------------------|-------------------|----------------|
| Get Info | < 1s | < 1s | < 1s |
| Trim (copy) | 1-2s | 3-5s | 2-3s |
| Adjust Speed | 5-10s | 30-60s | 20-40s |
| Loop (2x) | 8-15s | 50-90s | 30-60s |
| Keyframe | 10-20s | 60-120s | 40-80s |
| Concatenate (3x) | 2-4s | 10-15s | 5-8s |

## Troubleshooting Tests

### Test fails with "ffmpeg not found"
```bash
# Verify ffmpeg in PATH
which ffmpeg
export PATH=$PATH:/usr/local/bin

# Or install ffmpeg
sudo apt-get install ffmpeg  # Linux
brew install ffmpeg          # macOS
```

### Test fails with "Input video not found"
```bash
# Check file exists
ls -la /tmp/test_video.mp4

# Use absolute paths
realpath /tmp/test_video.mp4
```

### Output video is corrupted
```bash
# Check input video is valid
ffprobe /tmp/test_video.mp4

# Try with different codec
# (modify server to use different preset/codec)
```

### Server doesn't start
```bash
# Check if project is built
npm run build

# Check for TypeScript errors
npx tsc --noEmit examples/video-editor-mcp/video-editor-server.ts

# Check dependencies
npm list
```

## Automated Test Suite

Create comprehensive test script:

```bash
#!/bin/bash
# test-all.sh

set -e

echo "=== Video Editor MCP Test Suite ==="

# Setup
TEST_DIR="/tmp/video-editor-tests"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Download test video
echo "Downloading test video..."
curl -L "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4" \
  -o input.mp4

echo "Test 1: Get video info"
# (Use MCP client to call get_video_info)

echo "Test 2: Trim video"
# (Use MCP client to call trim_video)

echo "Test 3: Adjust speed"
# (Use MCP client to call adjust_speed)

echo "Test 4: Loop with crossfade"
# (Use MCP client to call loop_with_crossfade)

echo "Test 5: Concatenate"
# (Use MCP client to call concatenate_videos)

echo "=== All tests passed! ==="
```

## Next Steps

1. Test each tool individually
2. Test error cases (invalid inputs, missing files)
3. Test with various video formats (MP4, AVI, MOV, MKV)
4. Test with different resolutions (480p, 720p, 1080p, 4K)
5. Test with long videos (> 10 minutes)
6. Benchmark performance on your hardware
7. Create automated test suite
8. Document any issues or limitations found

## Support

If you encounter issues:

1. Check ffmpeg is installed: `ffmpeg -version`
2. Verify input video is valid: `ffprobe input.mp4`
3. Check server logs for errors
4. Verify file paths are absolute
5. Check file permissions
6. Try with a different input video
7. Check available disk space

For bugs or feature requests, open an issue in the simply-mcp repository.
