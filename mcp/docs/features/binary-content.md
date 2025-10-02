# Image & Binary Content Support

## Overview

SimpleMCP's **Binary Content Support** allows tools and resources to return images, PDFs, audio files, and other binary data in addition to text. This feature makes it easy to build MCP servers that work with visual data, documents, and multimedia.

### What It Does

- Enables tools to return images (PNG, JPEG, GIF, WebP, etc.)
- Supports PDF documents and other file formats
- Handles audio files (MP3, WAV, etc.)
- Works with any binary data type
- Automatically detects MIME types and encodes to base64
- Provides multiple convenient input formats

### Why It's Useful

- **Data Visualization**: Generate charts, graphs, and diagrams
- **Image Processing**: Return processed or annotated images
- **Document Generation**: Create PDFs, reports, and presentations
- **Media Content**: Work with audio and video files
- **Mixed Content**: Combine text analysis with visual results

### When to Use It

Use binary content support when your tools need to:
- Generate or process images
- Create PDF reports or documents
- Work with audio/video files
- Return any non-text data to the client
- Provide visual results alongside text explanations

## Status

- **Phase**: 2, Feature 1
- **Status**: ✅ Implemented
- **Tested**: ✅ 74/74 tests passing (100% pass rate)
- **Available in**: SimpleMCP v1.1.0+

## Quick Start

### Simplest Example (5 lines)

```typescript
server.addTool({
  name: 'generate_chart',
  description: 'Generate a bar chart',
  parameters: z.object({ data: z.array(z.number()) }),
  execute: async (args) => {
    // Return a Buffer - SimpleMCP auto-detects it's an image!
    return generateChartPNG(args.data);
  }
});
```

That's it! SimpleMCP handles all the encoding, MIME type detection, and formatting automatically.

## Core Concepts

### Content Types

SimpleMCP supports three binary content types:

1. **Image Content** (`type: 'image'`)
   - PNG, JPEG, GIF, WebP, BMP, SVG, TIFF
   - Returned with base64-encoded data
   - MIME type auto-detected from file headers

2. **Audio Content** (`type: 'audio'`)
   - MP3, WAV, OGG, FLAC, AAC
   - Base64-encoded audio data
   - Proper MIME type for audio playback

3. **Binary Content** (`type: 'binary'`)
   - PDFs, ZIP archives, Office documents
   - Any other binary data
   - Generic blob content for downloads

### MIME Type Detection

SimpleMCP automatically detects MIME types using:

1. **Explicit Type** (if you provide it)
2. **File Extension** (e.g., `.png` → `image/png`)
3. **Magic Bytes** (inspects binary file headers)
4. **Default Fallback** (`application/octet-stream`)

### Base64 Encoding

All binary content is automatically base64-encoded for transmission:

- Handles Buffer, Uint8Array, and raw binary data
- Strips data URL prefixes if present
- Validates encoding correctness
- Approximately 33% size increase (normal for base64)

### Buffer Handling

SimpleMCP seamlessly works with:

- **Node.js Buffer** - Most common format
- **Uint8Array** - Standard JavaScript typed array
- **Base64 Strings** - Already-encoded data
- **File Paths** - Reads and converts automatically

## API Reference

### Helper Functions

#### `createImageContent(input, mimeType?, basePath?, logger?)`

Convert any input to ImageContent format.

**Parameters:**
- `input: ImageInput` - Buffer | Uint8Array | string (base64/path) | object
- `mimeType?: string` - Optional MIME type override
- `basePath?: string` - Base path for relative file paths (default: `process.cwd()`)
- `logger?: { warn: (msg: string) => void }` - Optional logger for warnings

**Returns:** `Promise<ImageContent>`

**Example:**
```typescript
import { createImageContent } from './mcp/core/content-helpers.js';

// From Buffer
const content1 = await createImageContent(pngBuffer);

// From file path
const content2 = await createImageContent('./chart.png');

// From base64 string
const content3 = await createImageContent('iVBORw0KG...');

// With explicit MIME type
const content4 = await createImageContent(buffer, 'image/webp');
```

#### `createAudioContent(input, mimeType?, basePath?, logger?)`

Convert input to AudioContent format.

**Parameters:** Same as `createImageContent`

**Returns:** `Promise<AudioContent>`

**Example:**
```typescript
import { createAudioContent } from './mcp/core/content-helpers.js';

// From WAV file
const audioContent = await createAudioContent('./speech.wav');

// From Buffer
const audioBuffer = generateSpeech(text);
const content = await createAudioContent(audioBuffer, 'audio/mp3');
```

#### `createBlobContent(input, mimeType?, basePath?, logger?)`

Convert input to BinaryContent format (for PDFs, archives, etc.).

**Parameters:** Same as `createImageContent`

**Returns:** `Promise<BinaryContent>`

**Example:**
```typescript
import { createBlobContent } from './mcp/core/content-helpers.js';

// From PDF file
const pdfContent = await createBlobContent('./report.pdf');

// From Buffer with explicit type
const zipContent = await createBlobContent(zipBuffer, 'application/zip');
```

#### `detectMimeType(input, filePath?, providedMimeType?)`

Detect MIME type from various inputs.

**Parameters:**
- `input: Buffer | Uint8Array | string` - Binary data or file path
- `filePath?: string` - Optional file path for extension detection
- `providedMimeType?: string` - Optional explicit MIME type

**Returns:** `string` - Detected MIME type (defaults to `application/octet-stream`)

**Example:**
```typescript
import { detectMimeType } from './mcp/core/content-helpers.js';

// From file extension
const mime1 = detectMimeType(buffer, 'chart.png');
// Returns: 'image/png'

// From magic bytes
const mime2 = detectMimeType(pngBuffer);
// Returns: 'image/png' (detected from PNG header)

// Explicit type takes precedence
const mime3 = detectMimeType(buffer, 'file.txt', 'image/png');
// Returns: 'image/png'
```

#### `detectMimeTypeFromBuffer(buffer)`

Detect MIME type by inspecting file headers (magic bytes).

**Parameters:**
- `buffer: Buffer | Uint8Array` - Binary data to inspect

**Returns:** `string | null` - MIME type or null if unknown

**Example:**
```typescript
import { detectMimeTypeFromMagicBytes } from './mcp/core/content-helpers.js';

const buffer = await readFile('image.png');
const mime = detectMimeTypeFromMagicBytes(buffer);
// Returns: 'image/png'
```

#### `bufferToBase64(buffer)`

Convert Buffer or Uint8Array to base64 string.

**Parameters:**
- `buffer: Buffer | Uint8Array` - Binary data to encode

**Returns:** `string` - Base64-encoded string

**Example:**
```typescript
import { bufferToBase64 } from './mcp/core/content-helpers.js';

const base64 = bufferToBase64(imageBuffer);
// Returns: 'iVBORw0KGgoAAAANSUhEUgA...'
```

#### `base64ToBuffer(base64)`

Convert base64 string to Buffer.

**Parameters:**
- `base64: string` - Base64-encoded string (with or without data URL prefix)

**Returns:** `Buffer` - Decoded binary data

**Example:**
```typescript
import { base64ToBuffer } from './mcp/core/content-helpers.js';

// Plain base64
const buffer1 = base64ToBuffer('iVBORw0KG...');

// Data URL (prefix stripped automatically)
const buffer2 = base64ToBuffer('data:image/png;base64,iVBORw0KG...');
```

#### `readBinaryFile(filePath, basePath?)`

Read a file and return as Buffer with security checks.

**Parameters:**
- `filePath: string` - Path to file (relative or absolute)
- `basePath?: string` - Base path for security validation (default: `process.cwd()`)

**Returns:** `Promise<Buffer>` - File contents

**Throws:**
- File not found errors
- File too large errors (>50MB)
- Path traversal errors

**Example:**
```typescript
import { readBinaryFile } from './mcp/core/content-helpers.js';

// Read file
const buffer = await readBinaryFile('./images/chart.png');

// With base path restriction
const buffer2 = await readBinaryFile('chart.png', '/safe/directory');
```

## Usage Examples

### Example 1: Return PNG Image from Buffer

```typescript
import { readFile } from 'fs/promises';

server.addTool({
  name: 'generate_chart',
  description: 'Generate a bar chart from data',
  parameters: z.object({
    data: z.array(z.number()).describe('Data points to chart'),
    title: z.string().optional().describe('Chart title'),
  }),
  execute: async (args) => {
    // Generate chart using your favorite library
    const chartBuffer = await generateChartPNG(args.data, args.title);

    // SimpleMCP auto-detects this is a PNG image
    return chartBuffer;
  }
});
```

**What the client receives:**
```json
{
  "content": [{
    "type": "image",
    "data": "iVBORw0KGgoAAAANSUhEUgA...",
    "mimeType": "image/png"
  }]
}
```

### Example 2: Return JPEG from File Path

```typescript
server.addTool({
  name: 'get_thumbnail',
  description: 'Get image thumbnail',
  parameters: z.object({
    imageId: z.string().describe('Image identifier'),
  }),
  execute: async (args) => {
    const thumbnailPath = `/images/thumbnails/${args.imageId}.jpg`;

    // SimpleMCP reads the file and converts to base64
    return {
      type: 'file',
      path: thumbnailPath,
    };
  }
});
```

### Example 3: Return PDF as Blob

```typescript
server.addTool({
  name: 'generate_report',
  description: 'Generate a PDF report',
  parameters: z.object({
    reportType: z.enum(['monthly', 'quarterly', 'annual']),
  }),
  execute: async (args) => {
    // Generate PDF using your PDF library
    const pdfBuffer = await generatePDF(args.reportType);

    return {
      type: 'binary',
      data: pdfBuffer,
      mimeType: 'application/pdf',
    };
  }
});
```

### Example 4: Return Audio (WAV)

```typescript
server.addTool({
  name: 'text_to_speech',
  description: 'Convert text to speech audio',
  parameters: z.object({
    text: z.string().describe('Text to synthesize'),
    voice: z.enum(['male', 'female']).optional(),
  }),
  execute: async (args) => {
    const audioBuffer = await synthesizeSpeech(args.text, args.voice);

    return {
      type: 'audio',
      data: audioBuffer,
      mimeType: 'audio/wav',
    };
  }
});
```

### Example 5: Mixed Content (Text + Image)

```typescript
server.addTool({
  name: 'analyze_image',
  description: 'Analyze image and return annotated version',
  parameters: z.object({
    imagePath: z.string().describe('Path to image'),
  }),
  execute: async (args) => {
    // Perform analysis
    const analysis = await analyzeImage(args.imagePath);

    // Create annotated image
    const annotatedBuffer = await annotateImage(args.imagePath, analysis);

    // Return both text and image
    return {
      content: [
        {
          type: 'text',
          text: `Analysis Results:\n${JSON.stringify(analysis, null, 2)}`,
        },
        {
          type: 'image',
          data: annotatedBuffer.toString('base64'),
          mimeType: 'image/png',
        },
      ],
    };
  }
});
```

### Example 6: Resource with Binary Content

```typescript
import { readFile } from 'fs/promises';

// Load logo image
const logoBuffer = await readFile('./assets/logo.png');

server.addResource({
  uri: 'img://logo',
  name: 'Company Logo',
  description: 'Company logo in PNG format',
  mimeType: 'image/png',
  content: logoBuffer,  // SimpleMCP handles Buffer automatically
});
```

### Example 7: Base64 String Input

```typescript
server.addTool({
  name: 'process_image',
  description: 'Process a base64-encoded image',
  parameters: z.object({
    imageData: z.string().describe('Base64-encoded image'),
  }),
  execute: async (args) => {
    // SimpleMCP handles base64 strings automatically
    const processedBuffer = await processImage(args.imageData);

    return {
      type: 'image',
      data: processedBuffer,
      mimeType: 'image/jpeg',
    };
  }
});
```

### Example 8: Uint8Array Input

```typescript
server.addTool({
  name: 'encode_data',
  description: 'Encode text as binary data',
  parameters: z.object({
    text: z.string().describe('Text to encode'),
  }),
  execute: async (args) => {
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(args.text);

    // SimpleMCP converts Uint8Array to base64
    return {
      type: 'binary',
      data: uint8Array,
      mimeType: 'application/octet-stream',
    };
  }
});
```

## Input Formats

SimpleMCP accepts binary content in multiple formats for maximum flexibility:

| Input Type | Auto-Detection | Example | Notes |
|------------|----------------|---------|-------|
| **Buffer** | ✅ Yes | `Buffer.from(...)` | Auto-detected as image if PNG/JPEG/etc. headers present |
| **Uint8Array** | ✅ Yes | `new Uint8Array(...)` | Automatically converted to Buffer |
| **Base64 string** | ✅ Yes | `"iVBORw0KG..."` | Validated and decoded; data URL prefixes stripped |
| **File path** | ✅ Yes | `"./image.png"` | Read from disk; MIME type from extension + magic bytes |
| **Object with type** | ❌ No | `{ type: 'image', data: ... }` | Explicit type specification |
| **File object** | ❌ No | `{ type: 'file', path: '...' }` | Explicit file reference |

### Input Format Examples

```typescript
// 1. Buffer (auto-detected)
execute: async (args) => {
  return Buffer.from(pngData);
}

// 2. Uint8Array (auto-converted)
execute: async (args) => {
  return new Uint8Array(imageData);
}

// 3. Base64 string (auto-detected)
execute: async (args) => {
  return "iVBORw0KGgoAAAANSUhEUgA...";
}

// 4. File path string (auto-detected)
execute: async (args) => {
  return "./output/chart.png";
}

// 5. Explicit image object
execute: async (args) => {
  return {
    type: 'image',
    data: buffer,
    mimeType: 'image/png'
  };
}

// 6. File reference object
execute: async (args) => {
  return {
    type: 'file',
    path: './report.pdf',
    mimeType: 'application/pdf'
  };
}
```

## MIME Types

### Supported Image Formats

| Extension | MIME Type | Magic Bytes Support |
|-----------|-----------|---------------------|
| .png | image/png | ✅ Yes |
| .jpg, .jpeg | image/jpeg | ✅ Yes |
| .gif | image/gif | ✅ Yes |
| .webp | image/webp | ✅ Yes |
| .bmp | image/bmp | ✅ Yes |
| .svg | image/svg+xml | ❌ No (text-based) |
| .tiff, .tif | image/tiff | ❌ No |
| .ico | image/x-icon | ❌ No |

### Supported Document Formats

| Extension | MIME Type | Magic Bytes Support |
|-----------|-----------|---------------------|
| .pdf | application/pdf | ✅ Yes |
| .doc | application/msword | ❌ No |
| .docx | application/vnd.openxmlformats-officedocument.wordprocessingml.document | ❌ No |
| .xls | application/vnd.ms-excel | ❌ No |
| .xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | ❌ No |

### Supported Audio Formats

| Extension | MIME Type | Magic Bytes Support |
|-----------|-----------|---------------------|
| .mp3 | audio/mpeg | ✅ Yes |
| .wav | audio/wav | ✅ Yes |
| .ogg | audio/ogg | ❌ No |
| .m4a | audio/mp4 | ❌ No |
| .flac | audio/flac | ❌ No |
| .aac | audio/aac | ❌ No |

### Supported Archive Formats

| Extension | MIME Type | Magic Bytes Support |
|-----------|-----------|---------------------|
| .zip | application/zip | ✅ Yes |
| .tar | application/x-tar | ❌ No |
| .gz | application/gzip | ❌ No |
| .7z | application/x-7z-compressed | ❌ No |
| .rar | application/vnd.rar | ❌ No |

### Default/Fallback

If MIME type cannot be detected:
- **Default**: `application/octet-stream`
- **Recommendation**: Provide explicit MIME type for obscure formats

## Security Features

SimpleMCP includes built-in security measures for binary content:

### Path Traversal Prevention

```typescript
// ❌ Blocked - path traversal attempt
await readBinaryFile('../../etc/passwd');
// Throws: "Path traversal detected: ../../etc/passwd"

// ❌ Blocked - absolute path outside base
await readBinaryFile('/etc/passwd', '/safe/dir');
// Throws: "Path traversal detected: /etc/passwd resolves outside base path"

// ✅ Allowed - relative path within base
await readBinaryFile('./images/chart.png', '/safe/dir');
// Works correctly
```

### File Size Limits

```typescript
// Size limits
MAX_FILE_SIZE = 50 * 1024 * 1024;  // 50MB hard limit
MAX_SAFE_SIZE = 10 * 1024 * 1024;  // 10MB warning threshold

// ⚠️ Warning - large but allowed (15MB)
const buffer = await readBinaryFile('large-image.png');
// Logs: "Large image file detected: 15728640 bytes. Consider optimizing..."

// ❌ Rejected - exceeds limit (60MB)
const buffer = await readBinaryFile('huge-file.bin');
// Throws: "File too large: 62914560 bytes (max: 52428800 bytes)"
```

### Base64 Validation

```typescript
// ✅ Valid base64
const buffer1 = base64ToBuffer('iVBORw0KG...');

// ❌ Invalid characters
const buffer2 = base64ToBuffer('This is not base64!!!');
// Throws: "Failed to decode base64: Invalid base64 string"

// ✅ Data URL prefix stripped
const buffer3 = base64ToBuffer('data:image/png;base64,iVBORw0KG...');
// Works correctly
```

### Input Sanitization

All file paths are sanitized before use:
- Resolved to absolute paths
- Checked against base path
- Path traversal attempts blocked
- Symbolic link attacks prevented

## Error Handling

### Common Errors and Solutions

#### 1. File Not Found

**Error:**
```
Failed to read file 'chart.png': File not found or permission denied
```

**Causes:**
- File doesn't exist at the specified path
- Incorrect file path
- Permission denied

**Solutions:**
```typescript
// ✅ Check file exists first
import { access } from 'fs/promises';

try {
  await access(filePath);
  return { type: 'file', path: filePath };
} catch (error) {
  return `Error: File '${filePath}' not found`;
}
```

#### 2. Invalid Base64

**Error:**
```
Failed to decode base64: Invalid base64 string
```

**Causes:**
- String contains invalid characters
- Not actually base64 data
- Corrupted data

**Solutions:**
```typescript
import { validateBase64 } from './mcp/core/content-helpers.js';

// Validate before using
if (!validateBase64(data)) {
  return 'Error: Invalid base64 data provided';
}
```

#### 3. File Too Large

**Error:**
```
File too large: 62914560 bytes (max: 52428800 bytes). Consider reducing file size.
```

**Causes:**
- File exceeds 50MB limit
- Attempting to load very large files

**Solutions:**
```typescript
// Compress/resize before returning
const compressed = await compressImage(largeImage, { maxSize: 10485760 });
return compressed;

// Or provide download link instead
return `File too large. Download: ${downloadUrl}`;
```

#### 4. MIME Type Not Detected

**Error:**
- Not an error, but MIME type defaults to `application/octet-stream`

**Causes:**
- Uncommon file format
- Missing magic bytes
- Unknown extension

**Solutions:**
```typescript
// Provide explicit MIME type
return {
  type: 'binary',
  data: buffer,
  mimeType: 'application/x-custom-format'  // Explicit type
};
```

#### 5. Empty Buffer

**Error:**
```
Cannot convert empty buffer to image content
```

**Causes:**
- Generated buffer is empty
- File read returned 0 bytes

**Solutions:**
```typescript
// Check buffer before returning
if (buffer.length === 0) {
  return 'Error: Generated image is empty';
}
return buffer;
```

#### 6. Permission Denied

**Error:**
```
Failed to read file: Permission denied
```

**Causes:**
- Insufficient file permissions
- File owned by different user

**Solutions:**
```typescript
// Use accessible directory
const safeDir = process.env.HOME + '/mcp-temp';
await writeFile(path.join(safeDir, 'output.png'), buffer);
```

## Best Practices

### 1. Choose the Right Input Format

**Use Buffer for generated data:**
```typescript
// ✅ Good - direct Buffer return
execute: async (args) => {
  const chartBuffer = generateChart(args.data);
  return chartBuffer;
}
```

**Use file paths for existing files:**
```typescript
// ✅ Good - let SimpleMCP read the file
execute: async (args) => {
  const outputPath = generateReport(args.id);
  return { type: 'file', path: outputPath };
}
```

### 2. Optimize File Sizes

```typescript
// ⚠️ Avoid - very large images
const hugeImage = generateImage(10000, 10000);  // 100MP!

// ✅ Better - reasonable size
const optimizedImage = generateImage(1920, 1080, {
  quality: 85,
  format: 'jpeg'
});
```

### 3. Provide MIME Types for Clarity

```typescript
// ⚠️ Works but ambiguous
return buffer;

// ✅ Better - explicit MIME type
return {
  type: 'image',
  data: buffer,
  mimeType: 'image/webp'  // Clear format
};
```

### 4. Handle Errors Gracefully

```typescript
execute: async (args) => {
  try {
    const buffer = await generateImage(args);
    return buffer;
  } catch (error) {
    // Return helpful error message
    return `Failed to generate image: ${error.message}. Please try different parameters.`;
  }
}
```

### 5. Use Appropriate Formats

```typescript
// Charts/diagrams - PNG (lossless, good for graphics)
const chartBuffer = generateChartPNG();

// Photos - JPEG (smaller file size)
const photoBuffer = compressJPEG(photo, 85);

// Icons/logos - SVG or PNG with transparency
const logoBuffer = generateSVG();

// Documents - PDF
const reportBuffer = generatePDF();
```

### 6. Leverage Auto-Detection

```typescript
// ✅ Simple - let SimpleMCP figure it out
execute: async (args) => {
  return Buffer.from(pngData);  // Auto-detected as PNG
}

// ⚠️ Unnecessary - extra code
execute: async (args) => {
  return {
    type: 'image',
    data: Buffer.from(pngData),
    mimeType: 'image/png'  // Redundant if PNG headers present
  };
}
```

### 7. Clean Up Temporary Files

```typescript
import { unlink } from 'fs/promises';

execute: async (args) => {
  const tempPath = '/tmp/chart.png';

  try {
    await generateChartToFile(args.data, tempPath);
    const result = { type: 'file', path: tempPath };

    // Clean up after returning
    setTimeout(() => unlink(tempPath).catch(() => {}), 5000);

    return result;
  } catch (error) {
    await unlink(tempPath).catch(() => {});
    throw error;
  }
}
```

### 8. Document Binary Outputs

```typescript
server.addTool({
  name: 'generate_chart',
  description: 'Generate a bar chart as PNG image from numeric data',
  //            ^^^^^^^^^^^^^^^^^^^^^^^^^^ Clear output format
  parameters: z.object({
    data: z.array(z.number()).describe('Data points to chart'),
  }),
  execute: async (args) => generateChart(args.data)
});
```

## Performance Considerations

### Base64 Encoding Overhead

- Base64 increases size by ~33%
- 10MB binary → ~13.3MB base64
- Consider for network bandwidth planning

### File Size Guidelines

| Use Case | Recommended Size | Max Size |
|----------|------------------|----------|
| Icons/thumbnails | < 100KB | 500KB |
| Charts/graphs | < 500KB | 2MB |
| Full images | < 2MB | 10MB |
| PDFs | < 5MB | 25MB |
| Audio (short) | < 1MB | 10MB |

### Optimization Tips

```typescript
// ✅ Compress images
import sharp from 'sharp';

const optimized = await sharp(inputBuffer)
  .resize(1920, 1080, { fit: 'inside' })
  .jpeg({ quality: 85 })
  .toBuffer();

// ✅ Use progressive/streaming for large files
// (Future feature - see Phase 3 roadmap)

// ⚠️ Avoid multiple large files in one response
// Instead: Return URLs or create separate tools
```

### Memory Management

```typescript
// ⚠️ Problematic - loads entire 50MB file
const hugeBuffer = await readFile('huge-video.mp4');
return hugeBuffer;

// ✅ Better - provide download link for large files
if (fileSize > 10 * 1024 * 1024) {
  const url = await uploadToStorage(filePath);
  return `File too large for direct transfer. Download: ${url}`;
}
```

## Limitations

### Known Limitations

1. **File Size Cap**: 50MB hard limit (configurable in code)
2. **No Streaming**: Files loaded entirely into memory (Phase 3 feature)
3. **MIME Detection**: Some obscure formats may not auto-detect
4. **Synchronous Encoding**: Base64 encoding blocks for large files
5. **No Image Processing**: Use external libraries (sharp, jimp, etc.)

### Workarounds

**Large Files:**
```typescript
// Instead of returning directly, upload to cloud storage
const url = await uploadToS3(largeFile);
return `Download link: ${url}`;
```

**Streaming (Future):**
```typescript
// Phase 3 feature (not yet implemented)
return {
  type: 'stream',
  stream: fs.createReadStream('large-file.mp4')
};
```

**Custom MIME Types:**
```typescript
// Explicitly specify for unusual formats
return {
  type: 'binary',
  data: buffer,
  mimeType: 'application/x-my-custom-format'
};
```

## Troubleshooting

### Issue: "File not found" errors

**Check:**
- File path is correct (absolute or relative to basePath)
- File exists and is readable
- No typos in file name

**Debug:**
```typescript
import { access } from 'fs/promises';

const filePath = './images/chart.png';
try {
  await access(filePath);
  console.log('File exists and is readable');
} catch (error) {
  console.error('File not accessible:', error);
}
```

### Issue: "Invalid base64" errors

**Check:**
- String is actually base64 encoded
- No extra characters or whitespace
- Data URL prefix is correct format

**Debug:**
```typescript
import { validateBase64 } from './mcp/core/content-helpers.js';

console.log('Is valid base64?', validateBase64(data));
console.log('First 50 chars:', data.substring(0, 50));
```

### Issue: Large file warnings

**Solutions:**
- Compress/resize images before returning
- Use lower quality settings for photos
- Convert to more efficient formats (PNG → JPEG, WAV → MP3)

**Example:**
```typescript
import sharp from 'sharp';

// Compress large image
if (buffer.length > 10 * 1024 * 1024) {
  buffer = await sharp(buffer)
    .resize(2000, 2000, { fit: 'inside' })
    .jpeg({ quality: 80 })
    .toBuffer();
}
```

### Issue: MIME type not detected correctly

**Solutions:**
- Provide explicit MIME type
- Check file has proper magic bytes
- Verify file isn't corrupted

**Example:**
```typescript
// Always specify MIME type for rare formats
return {
  type: 'binary',
  data: buffer,
  mimeType: 'application/x-my-format'  // Explicit
};
```

### Issue: Path traversal errors

**Solutions:**
- Use relative paths within basePath
- Don't use `../` in paths
- Use absolute paths within allowed directory

**Example:**
```typescript
// ❌ Will be blocked
return { type: 'file', path: '../../etc/passwd' };

// ✅ Use relative to basePath
return { type: 'file', path: './images/chart.png' };
```

## Comparison with FastMCP

| Feature | SimpleMCP | FastMCP (Python) |
|---------|-----------|------------------|
| **Buffer Support** | ✅ Buffer, Uint8Array | ✅ bytes |
| **Auto MIME Detection** | ✅ Extension + Magic bytes | ✅ Extension |
| **File Path Input** | ✅ Automatic read | ❌ Manual read |
| **Base64 Handling** | ✅ Automatic | ✅ Automatic |
| **Image Class** | ❌ Uses native Buffer | ✅ Custom Image class |
| **Mixed Content** | ✅ Text + Binary in one result | ✅ Supported |
| **Size Limits** | ✅ 50MB (configurable) | ⚠️ No built-in limit |
| **Security** | ✅ Path traversal prevention | ⚠️ Manual security |
| **Multiple Formats** | ✅ 6 input formats | ⚠️ Fewer options |

### SimpleMCP Advantages

1. **More flexible input types** - 6 different input formats
2. **Native Node.js types** - No custom classes needed
3. **Better security** - Built-in path traversal prevention
4. **Automatic file reading** - Just provide path
5. **TypeScript native** - Full type safety

### FastMCP Advantages

1. **Image helpers** - Built-in PIL/Pillow integration
2. **Format conversion** - Easy image format changes
3. **Python ecosystem** - Leverage Python imaging libraries

### Migration from FastMCP

See [Binary Content Migration Guide](../guides/BINARY_CONTENT_MIGRATION.md) for details.

## Related Features

- [Progress Notifications](./progress.md) - Show progress while generating images
- [Sampling](./sampling.md) - Request LLM completions for image analysis
- [SimpleMCP Guide](../../SIMPLE_MCP_GUIDE.md) - Complete SimpleMCP documentation
- [Examples](../../examples/) - Working code examples

## Examples

See the complete working example server:
- [binary-content-demo.ts](../../examples/binary-content-demo.ts) - 7 tools + 4 resources demonstrating all features

## References

- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Phase 2 Feature 1 Implementation Plan](../../PHASE2_FEATURE1_PLAN.md)
- [Test Documentation](../../tests/phase2/BINARY_CONTENT_TESTS.md)
- [SimpleMCP Guide](../../SIMPLE_MCP_GUIDE.md)

---

**Last Updated:** October 2, 2025
**Version:** 1.1.0
**Status:** ✅ Fully Implemented and Tested
