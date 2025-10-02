# Phase 2, Feature 1: Image & Binary Content Support - Implementation Plan

## Executive Summary

This document provides a comprehensive implementation plan for adding image and binary content support to SimpleMCP. The feature will allow tools and resources to return images, PDFs, and other binary data in addition to text content.

**Status**: Planning Phase
**Priority**: MEDIUM
**Estimated Complexity**: Medium
**Breaking Changes**: None (fully backward compatible)

---

## 1. Architecture Analysis

### 1.1 Current SimpleMCP Structure

Based on analysis of `/mnt/Shared/cs-projects/cv-gen/mcp/SimpleMCP.ts` and `/mnt/Shared/cs-projects/cv-gen/mcp/core/types.ts`:

**Key Files:**
- `SimpleMCP.ts` (865 lines) - Main server class
- `core/types.ts` (221 lines) - Type definitions
- `core/HandlerManager.ts` - Handler execution
- `examples/` - Example servers

**Current HandlerResult Structure:**
```typescript
export interface HandlerResult {
  content: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
  metadata?: Record<string, unknown>;
  errors?: HandlerError[];
}
```

**Current Resource Definition:**
```typescript
export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  content: string | { [key: string]: any };  // Only text/JSON currently
}
```

**Current normalizeResult() Method:**
Located at line 709-731 in `SimpleMCP.ts`. Currently only handles text content:
```typescript
private normalizeResult(result: string | HandlerResult): HandlerResult {
  // Converts string to { content: [{ type: 'text', text: result }] }
}
```

### 1.2 MCP Protocol Specification (Version 2025-06-18)

**ImageContent Type:**
```typescript
interface ImageContent {
  type: "image";
  data: string;        // base64-encoded image data
  mimeType: string;    // e.g., "image/png", "image/jpeg"
  _meta?: object;      // Optional metadata
}
```

**BlobResourceContents Type:**
```typescript
interface BlobResourceContents {
  uri: string;
  blob: string;        // base64-encoded binary data
  mimeType?: string;   // e.g., "application/pdf"
  _meta?: object;      // Optional metadata
}
```

**AudioContent Type** (also exists):
```typescript
interface AudioContent {
  type: "audio";
  data: string;        // base64-encoded audio data
  mimeType: string;    // e.g., "audio/mp3", "audio/wav"
  _meta?: object;
}
```

### 1.3 Where Binary Content Fits

Binary content needs to be integrated into two main areas:

1. **Tool Results** - Tools can return images/binary as part of their HandlerResult
2. **Resources** - Resources can serve binary content (PDFs, images, etc.)

**CallToolResult.content** already supports:
- `TextContent` - type: "text"
- `ImageContent` - type: "image" ✅ (already in SDK)
- `AudioContent` - type: "audio" ✅ (already in SDK)

**ReadResourceResult.contents** supports:
- `TextResourceContents` - has `text` field
- `BlobResourceContents` - has `blob` field ✅ (already in SDK)

### 1.4 Files That Need Modification

1. **`core/types.ts`** - Add new type definitions for binary content handling
2. **`SimpleMCP.ts`** - Enhance `normalizeResult()` and resource handling
3. **`core/content-helpers.ts`** (NEW) - Binary content helper functions
4. **`examples/binary-content-demo.ts`** (NEW) - Example demonstrating feature

### 1.5 New Files to Create

```
mcp/
├── core/
│   └── content-helpers.ts          (NEW - ~200 lines)
└── examples/
    └── binary-content-demo.ts      (NEW - ~150 lines)
```

---

## 2. Implementation Approach

### 2.1 Core Strategy

The implementation follows these principles:

1. **Auto-Detection** - Automatically detect content type from input
2. **Multiple Input Formats** - Support Buffer, Uint8Array, base64, file paths
3. **MIME Type Detection** - Auto-detect MIME types when not provided
4. **Backward Compatibility** - Existing string returns still work
5. **Type Safety** - Full TypeScript support with proper types
6. **Zero Config** - Works out of the box without configuration

### 2.2 Helper Functions/Classes Needed

**File: `core/content-helpers.ts`**

```typescript
// 1. Content type detection
function detectContentType(input: ContentInput): ContentType;

// 2. Binary to base64 conversion
function bufferToBase64(buffer: Buffer | Uint8Array): string;

// 3. File reading and conversion
async function fileToBase64(filePath: string): Promise<string>;

// 4. MIME type detection
function detectMimeType(input: ContentInput, filePath?: string): string;

// 5. Main conversion function
async function toImageContent(input: ImageInput, mimeType?: string): Promise<ImageContent>;
async function toBinaryContent(input: BinaryInput, mimeType?: string): Promise<BlobContent>;

// 6. Validation
function validateBase64(data: string): boolean;
function isValidMimeType(mimeType: string): boolean;
```

**Utility Functions:**
- `isBuffer(obj: any): boolean` - Check if Buffer
- `isUint8Array(obj: any): boolean` - Check if Uint8Array
- `isBase64String(str: string): boolean` - Validate base64
- `getFileExtension(path: string): string` - Extract extension
- `getMimeTypeFromExtension(ext: string): string` - Map extension to MIME

### 2.3 Type Definitions Required

**File: `core/types.ts`** (additions)

```typescript
// Input types that users can return
export type ImageInput =
  | Buffer
  | Uint8Array
  | string  // base64 or file path
  | { type: 'image'; data: string | Buffer | Uint8Array; mimeType?: string }
  | { type: 'file'; path: string; mimeType?: string };

export type BinaryInput =
  | Buffer
  | Uint8Array
  | string  // base64 or file path
  | { type: 'binary'; data: string | Buffer | Uint8Array; mimeType?: string }
  | { type: 'file'; path: string; mimeType?: string };

export type AudioInput =
  | Buffer
  | Uint8Array
  | string  // base64 or file path
  | { type: 'audio'; data: string | Buffer | Uint8Array; mimeType?: string }
  | { type: 'file'; path: string; mimeType?: string };

// Enhanced content types for HandlerResult
export interface ImageContent {
  type: 'image';
  data: string;      // base64-encoded
  mimeType: string;
  _meta?: object;
}

export interface AudioContent {
  type: 'audio';
  data: string;      // base64-encoded
  mimeType: string;
  _meta?: object;
}

export interface BinaryContent {
  type: 'binary';
  data: string;      // base64-encoded
  mimeType: string;
  _meta?: object;
}

// Enhanced HandlerResult content array
export interface HandlerResult {
  content: Array<
    | { type: 'text'; text: string; [key: string]: unknown }
    | ImageContent
    | AudioContent
    | BinaryContent
  >;
  metadata?: Record<string, unknown>;
  errors?: HandlerError[];
}

// Enhanced ResourceDefinition
export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  content: string | { [key: string]: any } | Buffer | Uint8Array;  // Added binary support
}

// Enhanced ResourceContents (for ctx.readResource)
export interface ResourceContents {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;  // base64-encoded binary
}
```

### 2.4 Changes to SimpleMCP.ts

**1. Enhanced normalizeResult() Method** (line 709-731)

```typescript
private async normalizeResult(result: string | HandlerResult | ImageInput | BinaryInput): Promise<HandlerResult> {
  // If already in correct HandlerResult format
  if (result && typeof result === 'object' && 'content' in result && Array.isArray(result.content)) {
    return result;
  }

  // If result is a string, wrap it as text
  if (typeof result === 'string') {
    // Check if it might be base64 image data or file path
    if (isLikelyImagePath(result) || isLikelyBase64Image(result)) {
      const imageContent = await toImageContent(result);
      return { content: [imageContent] };
    }

    return {
      content: [{ type: 'text', text: result }],
    };
  }

  // If result is Buffer or Uint8Array
  if (Buffer.isBuffer(result) || result instanceof Uint8Array) {
    const imageContent = await toImageContent(result);
    return { content: [imageContent] };
  }

  // If result is an object with type hint
  if (result && typeof result === 'object') {
    if ('type' in result) {
      if (result.type === 'image' || result.type === 'file') {
        const imageContent = await toImageContent(result);
        return { content: [imageContent] };
      }
      if (result.type === 'binary') {
        const binaryContent = await toBinaryContent(result);
        return { content: [binaryContent] };
      }
      if (result.type === 'audio') {
        const audioContent = await toAudioContent(result);
        return { content: [audioContent] };
      }
    }
  }

  // Default case (shouldn't happen with TypeScript)
  return {
    content: [{ type: 'text', text: String(result) }],
  };
}
```

**2. Enhanced registerResourceHandlers()** (line 476-515)

```typescript
private registerResourceHandlers(): void {
  // ... existing code ...

  // Read resource handler
  this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const resourceUri = request.params.uri;
    const resource = this.resources.get(resourceUri);

    if (!resource) {
      throw new Error(`Unknown resource: ${resourceUri}`);
    }

    // Handle binary content (Buffer or Uint8Array)
    if (Buffer.isBuffer(resource.content) || resource.content instanceof Uint8Array) {
      const base64Data = bufferToBase64(resource.content);
      return {
        contents: [{
          uri: resource.uri,
          mimeType: resource.mimeType,
          blob: base64Data,
        }],
      };
    }

    // Handle text content
    return {
      contents: [{
        uri: resource.uri,
        mimeType: resource.mimeType,
        text: typeof resource.content === 'string'
          ? resource.content
          : JSON.stringify(resource.content, null, 2),
      }],
    };
  });
}
```

**3. Update ExecuteFunction Type** (line 58-61)

```typescript
export type ExecuteFunction<T = any> = (
  args: T,
  context?: HandlerContext
) => Promise<string | HandlerResult | ImageInput | BinaryInput | AudioInput>
   | string | HandlerResult | ImageInput | BinaryInput | AudioInput;
```

### 2.5 Integration Points

1. **Tool Execution Flow:**
   ```
   User calls tool
   → execute() returns Buffer/base64/path
   → normalizeResult() converts to ImageContent
   → SDK sends to client as { type: "image", data: "base64...", mimeType: "..." }
   ```

2. **Resource Reading Flow:**
   ```
   User adds resource with Buffer
   → Client requests resource
   → registerResourceHandlers() converts to base64
   → SDK sends as BlobResourceContents
   ```

3. **Context API Enhancement:**
   ```typescript
   // In HandlerContext, readResource already returns ResourceContents
   // No changes needed - it already has text and blob fields
   ```

---

## 3. API Design

### 3.1 User-Facing API Examples

**Example 1: Return Buffer (Auto-Detected as Image)**

```typescript
import { readFile } from 'fs/promises';

server.addTool({
  name: 'generate_chart',
  description: 'Generate a bar chart',
  parameters: z.object({
    data: z.array(z.number()),
  }),
  execute: async (args) => {
    // Generate chart and get Buffer
    const chartBuffer = await generateChart(args.data);

    // SimpleMCP auto-detects this is an image and converts it
    return chartBuffer;
  },
});
```

**Example 2: Return Base64 String with Explicit Type**

```typescript
server.addTool({
  name: 'create_thumbnail',
  description: 'Create an image thumbnail',
  parameters: z.object({
    imageUrl: z.string(),
    size: z.number(),
  }),
  execute: async (args) => {
    const thumbnailBase64 = await createThumbnail(args.imageUrl, args.size);

    return {
      type: 'image',
      data: thumbnailBase64,
      mimeType: 'image/jpeg',
    };
  },
});
```

**Example 3: Return File Path**

```typescript
server.addTool({
  name: 'generate_pdf_report',
  description: 'Generate a PDF report',
  parameters: z.object({
    reportId: z.string(),
  }),
  execute: async (args) => {
    const pdfPath = await generateReport(args.reportId);

    // SimpleMCP reads the file and converts to base64
    return {
      type: 'file',
      path: pdfPath,
      mimeType: 'application/pdf',
    };
  },
});
```

**Example 4: Return Multiple Content Items (Mixed Text and Image)**

```typescript
server.addTool({
  name: 'analyze_image',
  description: 'Analyze an image and return results with annotated version',
  parameters: z.object({
    imagePath: z.string(),
  }),
  execute: async (args) => {
    const analysis = await analyzeImage(args.imagePath);
    const annotatedImage = await annotateImage(args.imagePath, analysis);

    return {
      content: [
        {
          type: 'text',
          text: `Analysis Results:\n${JSON.stringify(analysis, null, 2)}`,
        },
        {
          type: 'image',
          data: annotatedImage.toString('base64'),
          mimeType: 'image/png',
        },
      ],
    };
  },
});
```

**Example 5: Binary Resource (PDF Documentation)**

```typescript
import { readFile } from 'fs/promises';

const pdfBuffer = await readFile('./documentation.pdf');

server.addResource({
  uri: 'doc://user-manual',
  name: 'User Manual',
  description: 'Application user manual (PDF)',
  mimeType: 'application/pdf',
  content: pdfBuffer,  // SimpleMCP handles Buffer automatically
});
```

**Example 6: Image Resource**

```typescript
server.addResource({
  uri: 'img://logo',
  name: 'Company Logo',
  description: 'Company logo in PNG format',
  mimeType: 'image/png',
  content: await readFile('./logo.png'),
});
```

**Example 7: Using Uint8Array**

```typescript
server.addTool({
  name: 'encode_data',
  description: 'Encode data as binary',
  parameters: z.object({
    text: z.string(),
  }),
  execute: async (args) => {
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(args.text);

    // Return Uint8Array (auto-converted to base64)
    return {
      type: 'binary',
      data: uint8Array,
      mimeType: 'application/octet-stream',
    };
  },
});
```

**Example 8: Audio Content**

```typescript
server.addTool({
  name: 'text_to_speech',
  description: 'Convert text to speech',
  parameters: z.object({
    text: z.string(),
  }),
  execute: async (args) => {
    const audioBuffer = await synthesizeSpeech(args.text);

    return {
      type: 'audio',
      data: audioBuffer,
      mimeType: 'audio/mp3',
    };
  },
});
```

### 3.2 Helper Function API (Advanced Users)

```typescript
import { toImageContent, toBinaryContent, bufferToBase64 } from './core/content-helpers';

// Manual conversion if needed
server.addTool({
  name: 'custom_processing',
  description: 'Custom image processing',
  parameters: z.object({ /* ... */ }),
  execute: async (args) => {
    const imageBuffer = await processImage(args);

    // Explicitly convert to ImageContent
    const imageContent = await toImageContent(imageBuffer, 'image/png');

    return {
      content: [
        { type: 'text', text: 'Processing complete' },
        imageContent,
      ],
    };
  },
});
```

---

## 4. Test Scenarios

### 4.1 Positive Tests (What Should Work)

1. **Test: Return PNG image as Buffer**
   - Tool returns `Buffer.from(pngData)`
   - Expected: `{ type: "image", data: "base64...", mimeType: "image/png" }`

2. **Test: Return JPEG image as Uint8Array**
   - Tool returns `new Uint8Array(jpegData)`
   - Expected: Auto-detected as image/jpeg

3. **Test: Return base64 string with explicit type**
   - Tool returns `{ type: 'image', data: base64String, mimeType: 'image/png' }`
   - Expected: Passed through as ImageContent

4. **Test: Return file path**
   - Tool returns `{ type: 'file', path: './image.png' }`
   - Expected: File read, converted to base64, MIME detected

5. **Test: Return PDF as Buffer**
   - Tool returns PDF Buffer
   - Expected: `{ type: "binary", data: "base64...", mimeType: "application/pdf" }`

6. **Test: Mixed content (text + image)**
   - Tool returns HandlerResult with both text and image content
   - Expected: Both content items preserved

7. **Test: Resource with Buffer**
   - Resource defined with `content: pngBuffer`
   - Expected: BlobResourceContents with base64

8. **Test: Auto MIME type detection from extension**
   - File path: `./chart.png`
   - Expected: `mimeType: "image/png"`

9. **Test: Auto MIME type detection from Buffer headers**
   - PNG Buffer (starts with `89 50 4E 47`)
   - Expected: `mimeType: "image/png"`

10. **Test: WebP image support**
    - Return WebP image Buffer
    - Expected: `mimeType: "image/webp"`

11. **Test: GIF image support**
    - Return GIF image Buffer
    - Expected: `mimeType: "image/gif"`

12. **Test: Audio MP3 file**
    - Return MP3 Buffer
    - Expected: `{ type: "audio", data: "base64...", mimeType: "audio/mp3" }`

13. **Test: ZIP file as binary**
    - Return ZIP Buffer
    - Expected: `{ type: "binary", data: "base64...", mimeType: "application/zip" }`

14. **Test: Large image (5MB)**
    - Return 5MB PNG Buffer
    - Expected: Successfully converted to base64

15. **Test: Backward compatibility - string return**
    - Tool returns `"Hello World"`
    - Expected: `{ type: "text", text: "Hello World" }` (unchanged)

### 4.2 Negative Tests (Error Handling)

16. **Test: Invalid file path**
    - Tool returns `{ type: 'file', path: './nonexistent.png' }`
    - Expected: Error message "File not found: ./nonexistent.png"

17. **Test: Invalid base64 string**
    - Tool returns `{ type: 'image', data: 'not-valid-base64!!!', mimeType: 'image/png' }`
    - Expected: Error "Invalid base64 data"

18. **Test: Missing MIME type with ambiguous data**
    - Tool returns Buffer without MIME type and no magic bytes
    - Expected: Default to `application/octet-stream`

19. **Test: Unsupported MIME type**
    - Tool returns `{ type: 'image', data: base64, mimeType: 'image/xyz-invalid' }`
    - Expected: Warning logged, but content still sent

20. **Test: Empty Buffer**
    - Tool returns `Buffer.alloc(0)`
    - Expected: Error "Cannot convert empty buffer"

21. **Test: Null/undefined return**
    - Tool returns `null` or `undefined`
    - Expected: Error "Invalid result"

22. **Test: Resource reading non-existent URI**
    - Context calls `readResource('unknown://resource')`
    - Expected: Error "Resource not found"

### 4.3 Edge Cases

23. **Test: Very large file (50MB)**
    - Return 50MB image
    - Expected: Warning about size, successful conversion (with timeout consideration)

24. **Test: Base64 with data URL prefix**
    - Input: `data:image/png;base64,iVBORw0KG...`
    - Expected: Prefix stripped, base64 extracted

25. **Test: Relative file path resolution**
    - Input: `./images/chart.png`
    - Expected: Resolved relative to `basePath`

26. **Test: Absolute file path**
    - Input: `/usr/local/images/chart.png`
    - Expected: Absolute path used as-is

27. **Test: Concurrent tool calls returning images**
    - Multiple tools return images simultaneously
    - Expected: All converted correctly without race conditions

### 4.4 Integration Scenarios

28. **Test: Tool uses ctx.readResource for image**
    - Tool reads image resource and returns it
    - Expected: Image passed through correctly

29. **Test: Progress reporting + image return**
    - Tool reports progress while generating image
    - Expected: Both progress notifications and final image work

30. **Test: Logging + image return**
    - Tool logs messages and returns image
    - Expected: Logs sent, image returned

---

## 5. Edge Cases & Error Handling

### 5.1 Invalid Input Handling

**Case 1: Invalid File Path**
```typescript
// Input: { type: 'file', path: './missing.png' }
// Behavior: Throw HandlerExecutionError with clear message
// Error: "Failed to read file: ./missing.png - File not found"
```

**Case 2: Corrupted Base64**
```typescript
// Input: { type: 'image', data: 'invalid!!base64', mimeType: 'image/png' }
// Behavior: Attempt to validate, throw error if invalid
// Error: "Invalid base64 data: String contains invalid characters"
```

**Case 3: Permission Denied on File**
```typescript
// Input: { type: 'file', path: '/root/restricted.png' }
// Behavior: Catch file system error, wrap in user-friendly message
// Error: "Failed to read file: Permission denied"
```

### 5.2 MIME Type Handling

**Strategy:**
1. **Explicit MIME type provided** - Use it (trust the user)
2. **File extension available** - Map extension to MIME type
3. **Magic bytes detection** - Check first few bytes of binary data
4. **Default fallback** - Use `application/octet-stream`

**MIME Type Mapping Table:**
```typescript
const MIME_TYPES = {
  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',

  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  // Archives
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.7z': 'application/x-7z-compressed',

  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',

  // Video
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',

  // Default
  '*': 'application/octet-stream',
};
```

**Magic Bytes Detection:**
```typescript
const MAGIC_BYTES = {
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // Followed by WEBP
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
  'application/zip': [0x50, 0x4B, 0x03, 0x04],
};
```

### 5.3 Memory Considerations

**Large File Handling:**

1. **Size Warnings:**
   ```typescript
   const MAX_SAFE_SIZE = 10 * 1024 * 1024; // 10MB
   const MAX_SIZE = 50 * 1024 * 1024; // 50MB

   if (fileSize > MAX_SIZE) {
     throw new Error(`File too large: ${fileSize} bytes (max: ${MAX_SIZE})`);
   }

   if (fileSize > MAX_SAFE_SIZE) {
     context?.logger.warn(`Large file detected: ${fileSize} bytes. Consider streaming or chunking.`);
   }
   ```

2. **Streaming Consideration (Future):**
   - Current implementation: Load entire file into memory
   - Future enhancement: Stream large files in chunks
   - For now: Document size limits in user guide

3. **Base64 Overhead:**
   - Base64 encoding increases size by ~33%
   - 10MB binary → ~13.3MB base64
   - Document this in user guide

### 5.4 Security Considerations

**Path Traversal Prevention:**
```typescript
function sanitizeFilePath(filePath: string, basePath: string): string {
  const resolved = path.resolve(basePath, filePath);

  // Ensure resolved path is within basePath
  if (!resolved.startsWith(basePath)) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }

  return resolved;
}
```

**File Type Validation:**
```typescript
function validateFileType(mimeType: string, allowedTypes?: string[]): boolean {
  if (!allowedTypes) return true;

  return allowedTypes.some(allowed => {
    if (allowed.endsWith('/*')) {
      return mimeType.startsWith(allowed.replace('/*', '/'));
    }
    return mimeType === allowed;
  });
}
```

### 5.5 Error Messages (User-Friendly)

All error messages should be:
1. **Clear** - Explain what went wrong
2. **Actionable** - Suggest how to fix it
3. **Contextual** - Include relevant details

**Examples:**

```typescript
// Bad: "File error"
// Good: "Failed to read file './chart.png': File not found. Check that the path is correct and the file exists."

// Bad: "Invalid data"
// Good: "Invalid base64 data: String contains invalid characters. Ensure the data is properly base64-encoded."

// Bad: "Size error"
// Good: "File too large: 52428800 bytes (max: 52428800). Consider reducing image quality or splitting into smaller files."
```

---

## 6. Backward Compatibility

### 6.1 Ensuring Existing Code Works

**Guarantee: All existing SimpleMCP code continues to work without modification.**

**Test Cases:**

1. **String Returns:**
   ```typescript
   // Before: Works
   execute: async (args) => {
     return "Hello World";
   }
   // After: Still works exactly the same
   ```

2. **HandlerResult Returns:**
   ```typescript
   // Before: Works
   execute: async (args) => {
     return {
       content: [{ type: 'text', text: 'Result' }]
     };
   }
   // After: Still works exactly the same
   ```

3. **Text Resources:**
   ```typescript
   // Before: Works
   server.addResource({
     uri: 'doc://readme',
     mimeType: 'text/plain',
     content: 'Documentation text'
   });
   // After: Still works exactly the same
   ```

4. **JSON Resources:**
   ```typescript
   // Before: Works
   server.addResource({
     uri: 'config://settings',
     mimeType: 'application/json',
     content: { key: 'value' }
   });
   // After: Still works exactly the same
   ```

### 6.2 Type Compatibility

**Strategy: Use union types to expand, not replace**

```typescript
// Before:
export type ExecuteFunction<T = any> = (
  args: T,
  context?: HandlerContext
) => Promise<string | HandlerResult> | string | HandlerResult;

// After (expanded, not replaced):
export type ExecuteFunction<T = any> = (
  args: T,
  context?: HandlerContext
) => Promise<string | HandlerResult | ImageInput | BinaryInput | AudioInput>
   | string | HandlerResult | ImageInput | BinaryInput | AudioInput;
```

**Result: Existing function signatures still match the type.**

### 6.3 Migration Path

**For users who want to use the new feature:**

**Migration Step 1: No changes needed**
```typescript
// Existing code works as-is
execute: async (args) => {
  return "Text result";
}
```

**Migration Step 2: Add image support (when ready)**
```typescript
// Simply return a Buffer
execute: async (args) => {
  const imageBuffer = await generateImage();
  return imageBuffer;  // SimpleMCP handles it
}
```

**Migration Step 3: Use explicit types (optional, for clarity)**
```typescript
// More explicit, but optional
execute: async (args) => {
  const imageBuffer = await generateImage();
  return {
    type: 'image',
    data: imageBuffer,
    mimeType: 'image/png'
  };
}
```

### 6.4 Deprecation Strategy

**Nothing is deprecated in this feature.**

All additions are additive - no existing APIs are removed or changed in breaking ways.

---

## 7. File Structure

### 7.1 Complete File Organization

```
mcp/
├── SimpleMCP.ts                    (MODIFIED - ~900 lines, +35 lines)
│   ├── Enhanced normalizeResult()
│   ├── Enhanced registerResourceHandlers()
│   └── Updated ExecuteFunction type
│
├── core/
│   ├── types.ts                    (MODIFIED - ~300 lines, +80 lines)
│   │   ├── ImageInput type
│   │   ├── BinaryInput type
│   │   ├── AudioInput type
│   │   ├── ImageContent interface
│   │   ├── AudioContent interface
│   │   ├── BinaryContent interface
│   │   ├── Enhanced HandlerResult
│   │   ├── Enhanced ResourceDefinition
│   │   └── Enhanced ResourceContents
│   │
│   ├── content-helpers.ts          (NEW - ~250 lines)
│   │   ├── detectContentType()
│   │   ├── bufferToBase64()
│   │   ├── base64ToBuffer()
│   │   ├── fileToBase64()
│   │   ├── detectMimeType()
│   │   ├── detectMimeTypeFromMagicBytes()
│   │   ├── detectMimeTypeFromExtension()
│   │   ├── toImageContent()
│   │   ├── toAudioContent()
│   │   ├── toBinaryContent()
│   │   ├── validateBase64()
│   │   ├── isValidMimeType()
│   │   ├── isBuffer()
│   │   ├── isUint8Array()
│   │   ├── sanitizeFilePath()
│   │   └── Constants (MIME_TYPES, MAGIC_BYTES, MAX_FILE_SIZE)
│   │
│   ├── HandlerManager.ts           (NO CHANGES)
│   ├── logger.ts                   (NO CHANGES)
│   ├── errors.ts                   (NO CHANGES)
│   └── index.ts                    (MODIFIED - export content-helpers)
│
├── examples/
│   ├── binary-content-demo.ts      (NEW - ~200 lines)
│   │   ├── Tool: generate_chart (returns PNG)
│   │   ├── Tool: create_thumbnail (returns JPEG)
│   │   ├── Tool: generate_pdf_report
│   │   ├── Tool: analyze_image (mixed text + image)
│   │   ├── Tool: text_to_speech (audio)
│   │   ├── Resource: PDF documentation
│   │   ├── Resource: Company logo image
│   │   └── Resource: Audio sample
│   │
│   ├── phase1-features.ts          (NO CHANGES)
│   └── simple-server.ts            (NO CHANGES)
│
├── docs/
│   └── features/
│       └── binary-content.md       (NEW - comprehensive user guide)
│
└── tests/                          (Future - not in this phase)
    └── content-helpers.test.ts
```

### 7.2 Dependencies

**New Dependencies Required:**
- `mime-types` (already installed) - For MIME type detection
- `file-type` (optional) - Enhanced magic byte detection (consider for future)

**Standard Library:**
- `fs/promises` - File reading
- `path` - Path manipulation
- `crypto` (optional) - For validation

**No Breaking Dependency Changes**

---

## 8. Implementation Checklist

### Phase 1: Core Infrastructure (Day 1-2)

- [ ] Create `core/content-helpers.ts`
  - [ ] Implement `bufferToBase64()`
  - [ ] Implement `base64ToBuffer()`
  - [ ] Implement `isBuffer()` and `isUint8Array()`
  - [ ] Implement `validateBase64()`
  - [ ] Add MIME_TYPES constant map
  - [ ] Add MAGIC_BYTES constant map

- [ ] Update `core/types.ts`
  - [ ] Add `ImageInput` type
  - [ ] Add `BinaryInput` type
  - [ ] Add `AudioInput` type
  - [ ] Add `ImageContent` interface
  - [ ] Add `AudioContent` interface
  - [ ] Add `BinaryContent` interface
  - [ ] Update `HandlerResult` interface
  - [ ] Update `ResourceDefinition` interface
  - [ ] Update `ResourceContents` interface

- [ ] Update `core/index.ts`
  - [ ] Export content helper functions

### Phase 2: MIME Type Detection (Day 2-3)

- [ ] Implement `detectMimeTypeFromExtension()`
- [ ] Implement `detectMimeTypeFromMagicBytes()`
- [ ] Implement `detectMimeType()` (orchestrator)
- [ ] Add support for common image formats (PNG, JPEG, GIF, WebP)
- [ ] Add support for documents (PDF)
- [ ] Add support for archives (ZIP)
- [ ] Add support for audio (MP3, WAV)

### Phase 3: Conversion Functions (Day 3-4)

- [ ] Implement `fileToBase64()`
  - [ ] Handle file reading
  - [ ] Handle errors (file not found, permission denied)
  - [ ] Add file size limits

- [ ] Implement `toImageContent()`
  - [ ] Handle Buffer input
  - [ ] Handle Uint8Array input
  - [ ] Handle base64 string input
  - [ ] Handle file path input
  - [ ] Handle object with type hint
  - [ ] Auto-detect MIME type

- [ ] Implement `toAudioContent()`
  - [ ] Similar to `toImageContent()`

- [ ] Implement `toBinaryContent()`
  - [ ] Similar to `toImageContent()`

### Phase 4: SimpleMCP Integration (Day 4-5)

- [ ] Update `SimpleMCP.ts`
  - [ ] Modify `normalizeResult()` method
  - [ ] Add Buffer/Uint8Array handling
  - [ ] Add file path handling
  - [ ] Add type hint handling
  - [ ] Ensure backward compatibility

- [ ] Update `registerResourceHandlers()`
  - [ ] Add Buffer/Uint8Array handling for resources
  - [ ] Convert to BlobResourceContents format

- [ ] Update `ExecuteFunction` type
  - [ ] Add ImageInput to union
  - [ ] Add BinaryInput to union
  - [ ] Add AudioInput to union

### Phase 5: Error Handling & Validation (Day 5-6)

- [ ] Implement path sanitization
  - [ ] Prevent path traversal
  - [ ] Resolve relative paths

- [ ] Add file size limits
  - [ ] Define MAX_SAFE_SIZE (10MB)
  - [ ] Define MAX_SIZE (50MB)
  - [ ] Add warnings for large files

- [ ] Add comprehensive error messages
  - [ ] File not found errors
  - [ ] Invalid base64 errors
  - [ ] File too large errors
  - [ ] Permission denied errors

### Phase 6: Examples & Documentation (Day 6-7)

- [ ] Create `examples/binary-content-demo.ts`
  - [ ] Example: Return Buffer (image)
  - [ ] Example: Return base64 string
  - [ ] Example: Return file path
  - [ ] Example: Mixed content (text + image)
  - [ ] Example: Binary resource
  - [ ] Example: Image resource
  - [ ] Example: Audio content
  - [ ] Example: Using context.readResource with binary

- [ ] Create `docs/features/binary-content.md`
  - [ ] Overview and benefits
  - [ ] Quick start guide
  - [ ] API reference
  - [ ] All examples from section 3
  - [ ] Best practices
  - [ ] Troubleshooting
  - [ ] Performance considerations

### Phase 7: Testing (Day 7-8)

- [ ] Test all 30 scenarios from section 4
- [ ] Verify backward compatibility (existing tests still pass)
- [ ] Test error handling
- [ ] Test edge cases
- [ ] Performance testing with large files
- [ ] Integration testing with example server

### Phase 8: Polish & Review (Day 8)

- [ ] Code review
- [ ] Documentation review
- [ ] Performance optimization
- [ ] Final testing
- [ ] Update CHANGELOG
- [ ] Update main README

---

## 9. Risk Assessment

### 9.1 Technical Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **Memory overflow with large files** | HIGH | MEDIUM | Implement size limits (50MB), add warnings, document best practices |
| **Base64 encoding performance** | MEDIUM | LOW | Use Node.js native Buffer.toString('base64'), consider streaming for future |
| **MIME type detection accuracy** | LOW | MEDIUM | Use well-tested libraries (mime-types), fallback to octet-stream |
| **Path traversal security** | HIGH | LOW | Strict path validation, basePath enforcement |
| **Breaking backward compatibility** | CRITICAL | VERY LOW | Extensive testing, union types, additive changes only |
| **File I/O errors** | MEDIUM | MEDIUM | Comprehensive error handling, clear error messages |

### 9.2 Implementation Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **Scope creep** | MEDIUM | MEDIUM | Stick to defined feature set, defer streaming to Phase 3 |
| **Testing gaps** | MEDIUM | MEDIUM | Follow 30-scenario test plan strictly |
| **Documentation incomplete** | LOW | LOW | Create docs alongside code, not after |
| **Example quality** | LOW | LOW | Test all examples before committing |

### 9.3 User Experience Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **API confusion** | MEDIUM | MEDIUM | Clear examples, comprehensive docs, TypeScript types |
| **Unexpected behavior** | MEDIUM | LOW | Explicit auto-detection logic, document defaults |
| **Performance surprises** | MEDIUM | MEDIUM | Document size limits, warn on large files |
| **Error message clarity** | LOW | LOW | User-friendly, actionable error messages |

### 9.4 Risk Mitigation Summary

**High Priority Mitigations:**
1. Implement strict file size limits (MAX_SIZE = 50MB)
2. Add path sanitization to prevent security issues
3. Comprehensive backward compatibility testing
4. Clear documentation of auto-detection behavior

**Medium Priority Mitigations:**
1. Performance benchmarking with various file sizes
2. Extensive error message testing
3. User guide with troubleshooting section
4. Example diversity (cover all use cases)

**Low Priority (Future Enhancements):**
1. Streaming support for very large files
2. Caching for frequently accessed resources
3. Compression options for large base64 payloads

---

## 10. Success Criteria

### 10.1 Feature Complete When:

- [x] All items in Implementation Checklist completed
- [x] All 30 test scenarios pass
- [x] Backward compatibility verified (all existing tests pass)
- [x] Example server runs successfully
- [x] Documentation complete and reviewed
- [x] No critical or high-severity bugs
- [x] Code review approved
- [x] Performance benchmarks within acceptable range (<500ms for 10MB file)

### 10.2 User Acceptance Criteria:

1. **User can return an image from a tool with zero configuration**
   ```typescript
   execute: async () => Buffer.from(pngData)  // Just works
   ```

2. **User can return a file path and it's automatically loaded**
   ```typescript
   execute: async () => ({ type: 'file', path: './chart.png' })  // Just works
   ```

3. **User can add a binary resource easily**
   ```typescript
   server.addResource({ uri: 'doc://manual', content: pdfBuffer, ... })  // Just works
   ```

4. **Existing code continues to work without modification**
   ```typescript
   execute: async () => "text result"  // Still works
   ```

5. **Clear error messages when things go wrong**
   ```typescript
   // Returns: "Failed to read file './missing.png': File not found. Check that..."
   ```

---

## 11. Future Enhancements (Out of Scope for Phase 2 Feature 1)

### 11.1 Streaming Support (Phase 3)

For files larger than memory limits, implement streaming:

```typescript
// Future API (example only)
execute: async (args) => {
  return {
    type: 'stream',
    stream: fs.createReadStream('./large-video.mp4'),
    mimeType: 'video/mp4',
  };
}
```

### 11.2 Image Processing Helpers (Phase 4)

Convenience helpers for common operations:

```typescript
import { resizeImage, convertFormat } from './core/image-helpers';

// Future API (example only)
execute: async (args) => {
  const image = await loadImage(args.path);
  const thumbnail = await resizeImage(image, { width: 200, height: 200 });
  return thumbnail;
}
```

### 11.3 Caching Layer (Phase 4)

For frequently accessed resources:

```typescript
// Future API (example only)
server.addResource({
  uri: 'img://logo',
  content: pdfBuffer,
  cache: { ttl: 3600 }  // Cache for 1 hour
});
```

### 11.4 Compression (Phase 5)

Optional compression for large payloads:

```typescript
// Future API (example only)
execute: async (args) => {
  return {
    type: 'image',
    data: largeImageBuffer,
    compress: true  // Apply gzip before base64
  };
}
```

### 11.5 URL Support (Phase 5)

Fetch images from URLs:

```typescript
// Future API (example only)
execute: async (args) => {
  return {
    type: 'image',
    url: 'https://example.com/chart.png'  // SimpleMCP fetches it
  };
}
```

---

## 12. Comparison with FastMCP

### 12.1 FastMCP Approach

**FastMCP (Python) uses:**
- `Image` helper class that wraps PIL/Pillow
- Automatic base64 encoding/decoding
- Type hints with `bytes` for binary data

**Example (FastMCP):**
```python
@mcp.tool()
def create_thumbnail(image: Image) -> Image:
    img = image.to_pil()
    img.thumbnail((200, 200))
    return Image.from_pil(img, format="JPEG")
```

### 12.2 SimpleMCP Approach (This Feature)

**SimpleMCP (TypeScript) uses:**
- Native Buffer/Uint8Array support
- Automatic base64 encoding
- Multiple input formats (Buffer, path, base64, object)
- Auto-detection of content type

**Example (SimpleMCP):**
```typescript
server.addTool({
  name: 'create_thumbnail',
  execute: async (args) => {
    const thumbnail = await createThumbnail(args.imagePath);
    return thumbnail;  // Buffer auto-detected as image
  }
});
```

### 12.3 Advantages of SimpleMCP Approach

1. **More flexible input types** - Buffer, Uint8Array, base64, file path, object
2. **Native TypeScript types** - No need for custom Image class
3. **Auto-detection** - Less boilerplate code
4. **Consistent with Node.js ecosystem** - Uses standard Buffer
5. **Zero config** - Just return a Buffer, it works

### 12.4 What We Can Learn from FastMCP

1. **Explicit Image class** - Consider for Phase 4 (optional convenience)
2. **PIL integration** - We could add sharp integration for image processing
3. **Format conversion helpers** - Add in Phase 4

---

## 13. Open Questions for Agent 2 (Implementer)

1. **Should we use `mime-types` package or implement our own MIME detection?**
   - Recommendation: Use `mime-types` (already installed), supplement with magic bytes

2. **What should be the default MAX_FILE_SIZE?**
   - Recommendation: 50MB (configurable in future)

3. **Should we support data URLs (e.g., `data:image/png;base64,...`)?**
   - Recommendation: Yes, strip prefix and extract base64

4. **Should we add special handling for SVG (text-based format)?**
   - Recommendation: Treat as image/svg+xml, but allow text field as alternative

5. **How should we handle file paths relative to process.cwd() vs basePath?**
   - Recommendation: Relative paths resolve to basePath from SimpleMCPOptions

6. **Should we validate that base64 decodes successfully?**
   - Recommendation: Yes, catch decode errors and provide clear message

7. **Should we support streams in this phase?**
   - Recommendation: No, defer to Phase 3 (avoid scope creep)

8. **Should we add TypeScript generics for content types?**
   - Recommendation: No, keep types simple for now

---

## 14. Summary

### 14.1 What This Feature Adds

✅ **Tools can return images, PDFs, and binary data**
✅ **Resources can serve binary content**
✅ **Multiple input formats supported (Buffer, Uint8Array, base64, file path)**
✅ **Automatic MIME type detection**
✅ **Automatic base64 encoding**
✅ **Fully backward compatible**
✅ **Zero configuration required**
✅ **TypeScript-friendly with proper types**

### 14.2 What Users Can Do After This Feature

**Before:**
```typescript
// Only text content
execute: async (args) => {
  return "Text result";
}
```

**After:**
```typescript
// Text still works, plus images!
execute: async (args) => {
  return generateChartBuffer();  // Returns image automatically
}

// And PDFs!
execute: async (args) => {
  return { type: 'file', path: './report.pdf' };
}

// And mixed content!
execute: async (args) => {
  return {
    content: [
      { type: 'text', text: 'Analysis results...' },
      { type: 'image', data: chartBuffer },
    ]
  };
}
```

### 14.3 Key Design Principles

1. **Simplicity** - Just return a Buffer, it works
2. **Flexibility** - Support multiple input formats
3. **Safety** - Strict validation and error handling
4. **Compatibility** - No breaking changes
5. **Performance** - Efficient encoding, size limits
6. **Developer Experience** - Clear errors, good docs

---

## 15. Next Steps for Agent 2 (Implementer)

1. **Read this entire plan carefully**
2. **Set up development environment**
3. **Follow the Implementation Checklist (Section 8) in order**
4. **Reference the API Design (Section 3) for expected behavior**
5. **Use the Test Scenarios (Section 4) to verify each component**
6. **Ask questions if any requirements are unclear**
7. **Update this plan if you discover necessary changes**

**Estimated Implementation Time: 8 days**

**Start with:** `core/content-helpers.ts` (easiest to test in isolation)
**Then move to:** `core/types.ts` (type definitions)
**Finally:** `SimpleMCP.ts` (integration)

---

**Plan Version:** 1.0
**Created:** 2025-10-01
**Author:** Agent 1 (Planner)
**For:** SimpleMCP Phase 2, Feature 1
**Next:** Agent 2 (Implementer) executes this plan

---

## Appendix A: Type Definitions Reference

```typescript
// Complete type definitions for quick reference

// Input types
export type ImageInput =
  | Buffer
  | Uint8Array
  | string
  | { type: 'image'; data: string | Buffer | Uint8Array; mimeType?: string }
  | { type: 'file'; path: string; mimeType?: string };

export type BinaryInput =
  | Buffer
  | Uint8Array
  | string
  | { type: 'binary'; data: string | Buffer | Uint8Array; mimeType?: string }
  | { type: 'file'; path: string; mimeType?: string };

export type AudioInput =
  | Buffer
  | Uint8Array
  | string
  | { type: 'audio'; data: string | Buffer | Uint8Array; mimeType?: string }
  | { type: 'file'; path: string; mimeType?: string };

// Output content types
export interface ImageContent {
  type: 'image';
  data: string;
  mimeType: string;
  _meta?: object;
}

export interface AudioContent {
  type: 'audio';
  data: string;
  mimeType: string;
  _meta?: object;
}

export interface BinaryContent {
  type: 'binary';
  data: string;
  mimeType: string;
  _meta?: object;
}

// Enhanced HandlerResult
export interface HandlerResult {
  content: Array<
    | { type: 'text'; text: string; [key: string]: unknown }
    | ImageContent
    | AudioContent
    | BinaryContent
  >;
  metadata?: Record<string, unknown>;
  errors?: HandlerError[];
}
```

## Appendix B: Helper Functions Reference

```typescript
// Complete function signatures for quick reference

// Conversion functions
export function bufferToBase64(buffer: Buffer | Uint8Array): string;
export function base64ToBuffer(base64: string): Buffer;
export async function fileToBase64(filePath: string, basePath: string): Promise<string>;

// MIME type detection
export function detectMimeType(
  input: Buffer | Uint8Array | string,
  filePath?: string,
  providedMimeType?: string
): string;
export function detectMimeTypeFromExtension(filePath: string): string;
export function detectMimeTypeFromMagicBytes(buffer: Buffer | Uint8Array): string | null;

// Content conversion
export async function toImageContent(
  input: ImageInput,
  mimeType?: string,
  basePath?: string
): Promise<ImageContent>;

export async function toAudioContent(
  input: AudioInput,
  mimeType?: string,
  basePath?: string
): Promise<AudioContent>;

export async function toBinaryContent(
  input: BinaryInput,
  mimeType?: string,
  basePath?: string
): Promise<BinaryContent>;

// Validation
export function validateBase64(data: string): boolean;
export function isValidMimeType(mimeType: string): boolean;
export function isBuffer(obj: any): obj is Buffer;
export function isUint8Array(obj: any): obj is Uint8Array;

// Security
export function sanitizeFilePath(filePath: string, basePath: string): string;
```

---

**END OF PLAN**
