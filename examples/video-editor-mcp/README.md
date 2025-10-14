# Video Editor MCP Server

An MCP server that provides professional video editing capabilities using ffmpeg. This recreates the functionality of the video-editor app at `/mnt/Shared/cs-projects/video-editor` and makes it accessible through MCP tools.

## Features

### 🎬 Available Tools

1. **get_video_info** - Get detailed information about video files
   - Duration, resolution, codec, bitrate
   - Video and audio stream details

2. **adjust_speed** - Adjust video playback speed (20%-100%)
   - Smooth speed changes with audio pitch preservation
   - High-quality output using libx264

3. **loop_with_crossfade** - Create looped sections with smooth transitions
   - Seamless crossfade between loops
   - Configurable loop count and crossfade duration

4. **keyframe_speed** - Variable speed control with keyframes
   - Multiple keyframes with interpolation
   - Linear, ease-in, ease-out, ease-in-out interpolation

5. **trim_video** - Fast video trimming
   - Extract specific time ranges
   - Stream copy for fast processing

6. **concatenate_videos** - Join multiple videos
   - Automatic codec handling
   - Re-encoding fallback for incompatible videos

## Prerequisites

- **Node.js** 16+
- **ffmpeg** - Must be installed and available in PATH
- **ffprobe** - Usually comes with ffmpeg

### Install ffmpeg

```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# Verify installation
ffmpeg -version
ffprobe -version
```

## Installation

```bash
# From the simple-mcp project root
cd examples/video-editor-mcp

# Make executable (optional)
chmod +x video-editor-server.ts
```

## Usage

### Running the Server

#### Option 1: Using simply-mcp CLI

```bash
# From simple-mcp project root
npm run cli -- run examples/video-editor-mcp/video-editor-server.ts
```

#### Option 2: Direct execution

```bash
# Make sure you have built the project first
npm run build

# Run the server
./video-editor-server.ts
```

### Using with Claude Desktop

Add to your Claude Desktop MCP configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "video-editor": {
      "command": "node",
      "args": [
        "/path/to/simple-mcp/dist/cli/run.js",
        "/path/to/simple-mcp/examples/video-editor-mcp/video-editor-server.ts"
      ]
    }
  }
}
```

Or using the bundled version (after bundling):

```json
{
  "mcpServers": {
    "video-editor": {
      "command": "node",
      "args": [
        "/path/to/simple-mcp/examples/video-editor-mcp/video-editor-server.bundle.js"
      ]
    }
  }
}
```

## Tool Examples

### Get Video Information

```typescript
// Request
{
  "video_path": "/path/to/video.mp4"
}

// Response
{
  "duration": 120.5,
  "size": 52428800,
  "bitrate": 3470000,
  "video": {
    "codec": "h264",
    "width": 1920,
    "height": 1080,
    "fps": 30
  }
}
```

### Adjust Video Speed

```typescript
// Slow down to 50%
{
  "input_path": "/path/to/input.mp4",
  "output_path": "/path/to/output.mp4",
  "speed": 0.5
}
```

### Loop with Crossfade

```typescript
// Loop 5s-10s section 3 times with 0.5s crossfade
{
  "input_path": "/path/to/input.mp4",
  "output_path": "/path/to/output.mp4",
  "start_time": 5.0,
  "end_time": 10.0,
  "loop_count": 3,
  "crossfade_duration": 0.5
}
```

### Keyframe Speed Control

```typescript
// Start slow, speed up, then slow down
{
  "input_path": "/path/to/input.mp4",
  "output_path": "/path/to/output.mp4",
  "keyframes": [
    { "time": 0, "speed": 0.3 },
    { "time": 30, "speed": 1.0 },
    { "time": 60, "speed": 0.3 }
  ],
  "interpolation": "ease_in_out"
}
```

### Trim Video

```typescript
// Extract 10s-30s section
{
  "input_path": "/path/to/input.mp4",
  "output_path": "/path/to/output.mp4",
  "start_time": 10.0,
  "end_time": 30.0
}
```

### Concatenate Videos

```typescript
// Join multiple videos
{
  "input_paths": [
    "/path/to/video1.mp4",
    "/path/to/video2.mp4",
    "/path/to/video3.mp4"
  ],
  "output_path": "/path/to/combined.mp4"
}
```

## Use Cases with Claude

Ask Claude to:

- "Get information about my video at /path/to/video.mp4"
- "Slow down the video to 60% speed"
- "Create a loop of the 5-10 second section, repeat 4 times with smooth transitions"
- "Create a slow-motion intro that speeds up to normal by 30 seconds"
- "Trim my video to just the 1:30 to 3:45 section"
- "Join these three video files into one"

## Technical Details

### Video Processing

- **Codec**: libx264 (H.264) for video, AAC for audio
- **Quality**: Medium preset for balance of speed/quality
- **Speed Range**: 0.2x to 1.0x for simple speed, 0.1x to 2.0x for keyframe mode
- **Audio**: Automatic pitch preservation using atempo filter

### Performance

- **Trim/Concatenate**: Use stream copy for fast processing (no re-encoding)
- **Speed/Loop**: Require re-encoding for quality
- **Temp Files**: Automatically cleaned up after processing
- **Large Files**: Handle videos up to system memory limits

### Error Handling

- Input file validation
- Duration boundary checks
- Automatic codec detection
- Fallback to re-encoding when needed

## Limitations

- Crossfade quality depends on video codec compatibility
- Very long videos may require significant processing time
- Keyframe interpolation uses segment-based approximation
- Some complex speed changes may have audio artifacts

## Architecture

Based on the video-editor app architecture:

```
video-editor-server.ts
├── Schemas (Zod validation)
│   ├── GetVideoInfoSchema
│   ├── AdjustSpeedSchema
│   ├── LoopWithCrossfadeSchema
│   ├── KeyframeSpeedSchema
│   ├── TrimVideoSchema
│   └── ConcatenateVideosSchema
├── Tools (MCP tool handlers)
│   ├── get_video_info
│   ├── adjust_speed
│   ├── loop_with_crossfade
│   ├── keyframe_speed
│   ├── trim_video
│   └── concatenate_videos
└── Helpers
    ├── runCommand (ffmpeg/ffprobe execution)
    └── getVideoDuration (duration extraction)
```

## Troubleshooting

### "ffmpeg not found"

```bash
# Verify ffmpeg is installed
which ffmpeg
ffmpeg -version

# Add to PATH if needed
export PATH=$PATH:/usr/local/bin
```

### "Permission denied"

```bash
# Make script executable
chmod +x video-editor-server.ts

# Check file permissions
ls -la video-editor-server.ts
```

### "Module not found"

```bash
# Build the project
npm run build

# Check imports
npm list
```

## License

Part of the simply-mcp project. See main project LICENSE.

## Related

- Original video-editor app: `/mnt/Shared/cs-projects/video-editor`
- simply-mcp documentation: `../../docs/`
- ffmpeg documentation: https://ffmpeg.org/documentation.html
