# Binary Content Migration Guide

This guide helps you migrate existing MCP servers to use SimplyMCP's Binary Content Support (Phase 2, Feature 1).

## Overview

SimplyMCP now supports returning images, PDFs, audio files, and other binary content from tools and resources with automatic base64 encoding, MIME type detection, and multiple input format support.

## Migration Scenarios

### From Text-Only SimplyMCP Servers

If you already have a SimplyMCP server that only returns text, adding binary support is straightforward.

#### Before (Text Only)

```typescript
import { SimplyMCP } from './mcp/SimplyMCP.js';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'my-server',
  version: '1.0.0',
});

server.addTool({
  name: 'generate_report',
  description: 'Generate a report',
  parameters: z.object({
    reportId: z.string(),
  }),
  execute: async (args) => {
    // Only text content before
    return `Report #${args.reportId}: Data here...`;
  },
});

await server.start();
```

#### After (With Binary Support)

```typescript
import { SimplyMCP } from './mcp/SimplyMCP.js';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'my-server',
  version: '1.0.0',
});

server.addTool({
  name: 'generate_report',
  description: 'Generate a PDF report',
  parameters: z.object({
    reportId: z.string(),
  }),
  execute: async (args) => {
    // Return PDF instead of text
    const pdfBuffer = await generatePDF(args.reportId);
    return pdfBuffer;  // SimplyMCP handles it automatically!
  },
});

await server.start();
```

**Changes:**
- No configuration needed
- Just return a `Buffer` instead of a string
- SimplyMCP auto-detects file type and encodes to base64

### From FastMCP (Python)

Migrating from FastMCP's Python implementation to SimplyMCP's TypeScript binary content support.

#### FastMCP (Python)

```python
from fastmcp import FastMCP
from fastmcp.resources import Image
from PIL import Image as PILImage

mcp = FastMCP("my-server")

@mcp.tool()
def generate_chart(data: list[float]) -> Image:
    # Use PIL to generate image
    img = PILImage.new('RGB', (800, 600))
    # ... draw chart ...
    return Image.from_pil(img, format="PNG")
```

#### SimplyMCP (TypeScript)

```typescript
import { SimplyMCP } from './mcp/SimplyMCP.js';
import { z } from 'zod';
import sharp from 'sharp';  // Or your preferred image library

const server = new SimplyMCP({
  name: 'my-server',
  version: '1.0.0',
});

server.addTool({
  name: 'generate_chart',
  description: 'Generate a chart',
  parameters: z.object({
    data: z.array(z.number()),
  }),
  execute: async (args) => {
    // Use sharp or another library to generate image
    const chartBuffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .png()
    .toBuffer();

    return chartBuffer;  // Auto-detected as PNG
  },
});

await server.start();
```

**Key Differences:**
- FastMCP uses custom `Image` class; SimplyMCP uses native `Buffer`
- FastMCP requires `Image.from_pil()`; SimplyMCP auto-converts
- SimplyMCP has more flexible input formats
- Both support automatic base64 encoding

### From Raw MCP SDK

Migrating from the official MCP SDK's lower-level API.

#### Raw MCP SDK

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readFile } from 'fs/promises';

const server = new Server({
  name: 'my-server',
  version: '1.0.0',
}, {
  capabilities: { tools: {} }
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'get_logo') {
    // Manual file reading
    const logoPath = './logo.png';
    const logoBuffer = await readFile(logoPath);

    // Manual base64 encoding
    const logoBase64 = logoBuffer.toString('base64');

    // Manual MIME type
    return {
      content: [{
        type: 'image',
        data: logoBase64,
        mimeType: 'image/png',
      }],
    };
  }
  throw new Error('Unknown tool');
});
```

#### SimplyMCP

```typescript
import { SimplyMCP } from './mcp/SimplyMCP.js';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'my-server',
  version: '1.0.0',
});

server.addTool({
  name: 'get_logo',
  description: 'Get company logo',
  parameters: z.object({}),
  execute: async (args) => {
    // Just return the file path - SimplyMCP handles everything!
    return {
      type: 'file',
      path: './logo.png',
    };
  },
});

await server.start();
```

**Benefits of SimplyMCP:**
- ✅ Automatic file reading
- ✅ Automatic base64 encoding
- ✅ Automatic MIME type detection
- ✅ Less boilerplate code
- ✅ Type-safe with Zod
- ✅ Multiple input format support

## Common Migration Patterns

### Pattern 1: Returning Generated Images

**Before (Manual handling):**
```typescript
execute: async (args) => {
  const buffer = generateImage();
  const base64 = buffer.toString('base64');
  return {
    content: [{
      type: 'image',
      data: base64,
      mimeType: 'image/png',
    }],
  };
}
```

**After (SimplyMCP):**
```typescript
execute: async (args) => {
  return generateImage();  // That's it!
}
```

### Pattern 2: Reading Files

**Before (Manual):**
```typescript
import { readFile } from 'fs/promises';

execute: async (args) => {
  const buffer = await readFile(args.filePath);
  const base64 = buffer.toString('base64');
  const mimeType = getMimeType(args.filePath);  // Custom function

  return {
    content: [{
      type: 'image',
      data: base64,
      mimeType,
    }],
  };
}
```

**After (SimplyMCP):**
```typescript
execute: async (args) => {
  return {
    type: 'file',
    path: args.filePath,
  };
}
```

### Pattern 3: Mixed Content (Text + Image)

**Before (Manual):**
```typescript
execute: async (args) => {
  const analysis = analyzeImage(args.imagePath);
  const annotatedBuffer = await annotateImage(args.imagePath);
  const annotatedBase64 = annotatedBuffer.toString('base64');

  return {
    content: [
      { type: 'text', text: JSON.stringify(analysis) },
      { type: 'image', data: annotatedBase64, mimeType: 'image/png' },
    ],
  };
}
```

**After (SimplyMCP - same structure, easier image handling):**
```typescript
execute: async (args) => {
  const analysis = analyzeImage(args.imagePath);
  const annotatedBuffer = await annotateImage(args.imagePath);

  return {
    content: [
      { type: 'text', text: JSON.stringify(analysis) },
      { type: 'image', data: annotatedBuffer, mimeType: 'image/png' },
    ],
  };
}
// SimplyMCP auto-converts Buffer to base64!
```

### Pattern 4: Binary Resources

**Before (Manual):**
```typescript
import { readFile } from 'fs/promises';

const pdfBuffer = await readFile('./manual.pdf');
const pdfBase64 = pdfBuffer.toString('base64');

server.addResource({
  uri: 'doc://manual',
  name: 'User Manual',
  mimeType: 'application/pdf',
  content: pdfBase64,
});
```

**After (SimplyMCP):**
```typescript
import { readFile } from 'fs/promises';

const pdfBuffer = await readFile('./manual.pdf');

server.addResource({
  uri: 'doc://manual',
  name: 'User Manual',
  mimeType: 'application/pdf',
  content: pdfBuffer,  // SimplyMCP handles Buffer!
});
```

## Migration Checklist

### Step 1: Update Dependencies

Ensure you have the latest SimplyMCP version:

```bash
cd mcp
npm install
```

### Step 2: Review Your Tools

Identify tools that could benefit from binary content:

- ✅ Tools that generate charts/graphs
- ✅ Tools that process images
- ✅ Tools that create PDFs/documents
- ✅ Tools that work with audio/video
- ✅ Tools that return file content

### Step 3: Simplify Return Values

Replace manual base64 encoding with direct Buffer returns:

```typescript
// Before
const base64 = buffer.toString('base64');
return { content: [{ type: 'image', data: base64, mimeType: 'image/png' }] };

// After
return buffer;
```

### Step 4: Use File Paths Where Appropriate

If you're reading files, let SimplyMCP handle it:

```typescript
// Before
const buffer = await readFile(path);
const base64 = buffer.toString('base64');
return { content: [{ type: 'image', data: base64, mimeType: '...' }] };

// After
return { type: 'file', path: path };
```

### Step 5: Test Thoroughly

Verify that:

- ✅ Images display correctly in clients
- ✅ MIME types are detected correctly
- ✅ File sizes are within limits (< 50MB)
- ✅ Error handling works as expected
- ✅ Backward compatibility maintained (text tools still work)

## Troubleshooting Migration Issues

### Issue: "Cannot convert empty buffer"

**Cause:** Your image generation is producing empty buffers.

**Solution:**
```typescript
execute: async (args) => {
  const buffer = generateImage();

  if (buffer.length === 0) {
    return 'Error: Failed to generate image';
  }

  return buffer;
}
```

### Issue: MIME type incorrect

**Cause:** Auto-detection failed.

**Solution:** Provide explicit MIME type:
```typescript
return {
  type: 'image',
  data: buffer,
  mimeType: 'image/webp',  // Explicit
};
```

### Issue: "File too large"

**Cause:** File exceeds 50MB limit.

**Solution:** Compress or resize:
```typescript
import sharp from 'sharp';

execute: async (args) => {
  let buffer = generateLargeImage();

  if (buffer.length > 10 * 1024 * 1024) {
    buffer = await sharp(buffer)
      .resize(2000, 2000, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  return buffer;
}
```

### Issue: Path traversal error

**Cause:** Using unsafe file paths.

**Solution:** Use relative paths or configure basePath:
```typescript
const server = new SimplyMCP({
  name: 'my-server',
  version: '1.0.0',
  basePath: '/safe/directory',  // Restrict to this directory
});
```

## Best Practices After Migration

### 1. Take Advantage of Auto-Detection

```typescript
// Good - let SimplyMCP figure it out
return buffer;

// Unnecessary - extra code for no benefit
return {
  type: 'image',
  data: buffer,
  mimeType: 'image/png'  // Redundant if PNG headers present
};
```

### 2. Use Appropriate Input Formats

```typescript
// For generated data - use Buffer
execute: async () => {
  return generateChartBuffer();
}

// For existing files - use file path
execute: async () => {
  return { type: 'file', path: './output.png' };
}

// For explicit control - use object
execute: async () => {
  return {
    type: 'image',
    data: buffer,
    mimeType: 'image/webp'
  };
}
```

### 3. Optimize Performance

```typescript
// Compress large images
if (buffer.length > 5 * 1024 * 1024) {
  buffer = await compressImage(buffer);
}

// Use efficient formats
// PNG for charts/diagrams (lossless)
// JPEG for photos (smaller size)
// WebP for web (best compression)
```

### 4. Handle Errors Gracefully

```typescript
execute: async (args) => {
  try {
    return await generateImage(args);
  } catch (error) {
    return `Failed to generate image: ${error.message}`;
  }
}
```

## Feature Comparison

### SimplyMCP vs FastMCP (Python)

| Feature | SimplyMCP | FastMCP |
|---------|-----------|---------|
| Input Formats | 6 types | 3 types |
| Auto MIME Detection | Extension + Magic Bytes | Extension only |
| Security | Path traversal prevention | Manual |
| Size Limits | Built-in (50MB) | No built-in limit |
| File Reading | Automatic from path | Manual |
| Native Types | Buffer/Uint8Array | bytes |
| Image Helpers | External libraries | Built-in PIL |

### Advantages of SimplyMCP

- **More flexible** - 6 input format options
- **Better security** - Built-in protections
- **TypeScript native** - Full type safety
- **Automatic file handling** - Less code

### When to Use External Libraries

SimplyMCP uses native Buffers, so you'll need libraries for image processing:

**Image Processing:**
- `sharp` - Fast, production-grade (recommended)
- `jimp` - Pure JavaScript
- `canvas` - For drawing/charts

**Chart Generation:**
- `chartjs-node-canvas` - Chart.js for Node.js
- `d3-node` - D3.js for Node.js
- `quickchart-js` - QuickChart API wrapper

**PDF Generation:**
- `pdfkit` - PDF generation
- `puppeteer` - HTML to PDF
- `jspdf` - Client-side PDF

## Examples

See working examples in:
- `/mcp/examples/binary-content-demo.ts` - Complete demo server
- `/mcp/docs/features/binary-content.md` - Full documentation
- `/mcp/tests/phase2/BINARY_CONTENT_TESTS.md` - Test documentation

## Getting Help

If you encounter issues during migration:

1. **Check the documentation**: [Binary Content Guide](../features/binary-content.md)
2. **Review examples**: `/mcp/examples/binary-content-demo.ts`
3. **Check test suite**: `/mcp/tests/phase2/`
4. **Review error messages**: They include helpful details and suggestions

## Next Steps

After migrating to binary content support:

1. ✅ Test all binary-returning tools
2. ✅ Optimize file sizes for performance
3. ✅ Add error handling for edge cases
4. ✅ Document binary outputs in tool descriptions
5. ✅ Consider Phase 3 features (streaming for large files)

---

**Last Updated:** October 2, 2025
**SimplyMCP Version:** 1.1.0+
**Migration Difficulty:** Easy (mostly removing code!)
