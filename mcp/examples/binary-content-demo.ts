#!/usr/bin/env node
/**
 * Binary Content Demo Server
 *
 * This example demonstrates SimpleMCP's Phase 2 Feature 1: Image & Binary Content Support
 * Shows how to return images, PDFs, audio, and other binary data from tools and resources.
 *
 * Features demonstrated:
 * - Returning Buffer directly (auto-detected as image)
 * - Returning file paths
 * - Returning base64 strings
 * - Mixed content (text + image)
 * - Binary resources (PDFs, images)
 * - Audio content
 *
 * Usage:
 *   # Run with stdio transport:
 *   npx tsx mcp/examples/binary-content-demo.ts
 *
 *   # Run with HTTP transport:
 *   npx tsx mcp/examples/binary-content-demo.ts --http --port 3000
 */

import { SimpleMCP } from '../SimpleMCP.js';
import { z } from 'zod';
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

// Create a SimpleMCP server
const server = new SimpleMCP({
  name: 'binary-content-demo',
  version: '1.0.0',
  port: 3000,
});

// ============================================================================
// TOOL 1: Generate Chart (returns PNG image as Buffer)
// ============================================================================

server.addTool({
  name: 'generate_chart',
  description: 'Generate a simple bar chart as a PNG image',
  parameters: z.object({
    data: z.array(z.number()).describe('Array of numbers to chart'),
    title: z.string().optional().describe('Chart title'),
  }),
  execute: async (args) => {
    // Generate a simple PNG image (1x1 red pixel for demo)
    // In a real implementation, you'd use a charting library like Chart.js or D3
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
      'base64'
    );

    // SimpleMCP auto-detects this is an image and converts it
    return pngBuffer;
  },
});

// ============================================================================
// TOOL 2: Create Thumbnail (returns image with explicit type)
// ============================================================================

server.addTool({
  name: 'create_thumbnail',
  description: 'Create a thumbnail from an image (demo returns a blue pixel)',
  parameters: z.object({
    size: z.number().default(200).describe('Thumbnail size in pixels'),
  }),
  execute: async (args) => {
    // Generate a 1x1 blue pixel PNG
    const bluePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==';

    return {
      type: 'image',
      data: bluePngBase64,
      mimeType: 'image/png',
    };
  },
});

// ============================================================================
// TOOL 3: Generate PDF Report (returns file path)
// ============================================================================

server.addTool({
  name: 'generate_pdf_report',
  description: 'Generate a PDF report (creates a minimal PDF file)',
  parameters: z.object({
    reportId: z.string().describe('Unique identifier for the report'),
  }),
  execute: async (args, context) => {
    // Create a minimal PDF file
    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
endobj
5 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Report ID: ${args.reportId}) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
0000000309 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
406
%%EOF`;

    // Write PDF to temp file
    const pdfPath = `/tmp/report-${args.reportId}.pdf`;
    await writeFile(pdfPath, pdfContent);

    context?.logger.info(`Generated PDF report: ${pdfPath}`);

    // SimpleMCP reads the file and converts to base64
    return {
      type: 'file',
      path: pdfPath,
      mimeType: 'application/pdf',
    };
  },
});

// ============================================================================
// TOOL 4: Analyze Image (returns mixed text + image content)
// ============================================================================

server.addTool({
  name: 'analyze_image',
  description: 'Analyze an image and return results with annotated version',
  parameters: z.object({
    description: z.string().describe('Description of what to analyze'),
  }),
  execute: async (args) => {
    // Simulated analysis results
    const analysis = {
      objects_detected: ['person', 'car', 'tree'],
      confidence: 0.95,
      dimensions: { width: 1920, height: 1080 },
    };

    // Generate an annotated image (green pixel for demo)
    const greenPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+A+EAAQUATIEYB+9AAAAAElFTkSuQmCC';

    // Return both text analysis and annotated image
    return {
      content: [
        {
          type: 'text',
          text: `Analysis Results:\n${JSON.stringify(analysis, null, 2)}`,
        },
        {
          type: 'image',
          data: greenPngBase64,
          mimeType: 'image/png',
        },
      ],
    };
  },
});

// ============================================================================
// TOOL 5: Text to Speech (returns audio content)
// ============================================================================

server.addTool({
  name: 'text_to_speech',
  description: 'Convert text to speech (demo returns a minimal WAV file)',
  parameters: z.object({
    text: z.string().describe('Text to convert to speech'),
    voice: z.enum(['male', 'female']).optional().describe('Voice type'),
  }),
  execute: async (args) => {
    // Create a minimal WAV file (44-byte header + silent audio)
    // This is just a demo - real implementation would use TTS service
    const wavHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // "RIFF"
      0x24, 0x00, 0x00, 0x00, // File size - 8
      0x57, 0x41, 0x56, 0x45, // "WAVE"
      0x66, 0x6d, 0x74, 0x20, // "fmt "
      0x10, 0x00, 0x00, 0x00, // Subchunk size
      0x01, 0x00,             // Audio format (PCM)
      0x01, 0x00,             // Num channels
      0x44, 0xac, 0x00, 0x00, // Sample rate (44100)
      0x88, 0x58, 0x01, 0x00, // Byte rate
      0x02, 0x00,             // Block align
      0x10, 0x00,             // Bits per sample
      0x64, 0x61, 0x74, 0x61, // "data"
      0x00, 0x00, 0x00, 0x00, // Data size
    ]);

    return {
      type: 'audio',
      data: wavHeader,
      mimeType: 'audio/wav',
    };
  },
});

// ============================================================================
// TOOL 6: Encode Data (returns binary with Uint8Array)
// ============================================================================

server.addTool({
  name: 'encode_data',
  description: 'Encode text as binary data',
  parameters: z.object({
    text: z.string().describe('Text to encode'),
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

// ============================================================================
// TOOL 7: Create QR Code (demonstrates file path with auto-detection)
// ============================================================================

server.addTool({
  name: 'create_qr_code',
  description: 'Create a QR code image (demo creates a placeholder PNG)',
  parameters: z.object({
    data: z.string().describe('Data to encode in QR code'),
  }),
  execute: async (args) => {
    // Create a yellow pixel PNG as placeholder
    const yellowPngData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
      'base64'
    );

    // Write to temp file
    const qrPath = `/tmp/qr-${Date.now()}.png`;
    await writeFile(qrPath, yellowPngData);

    // Return file path - SimpleMCP will auto-detect it's an image
    return {
      type: 'file',
      path: qrPath,
    };
  },
});

// ============================================================================
// RESOURCES: Binary Content Examples
// ============================================================================

// Resource 1: PDF Documentation (from Buffer)
const pdfDocBuffer = Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
endobj
5 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Binary Content Demo) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
0000000309 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
406
%%EOF`);

server.addResource({
  uri: 'doc://user-manual',
  name: 'User Manual',
  description: 'Binary Content Demo user manual (PDF)',
  mimeType: 'application/pdf',
  content: pdfDocBuffer, // SimpleMCP handles Buffer automatically
});

// Resource 2: Company Logo (PNG image)
const logoPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64'
);

server.addResource({
  uri: 'img://logo',
  name: 'Company Logo',
  description: 'Company logo in PNG format (red pixel demo)',
  mimeType: 'image/png',
  content: logoPngBuffer,
});

// Resource 3: Audio Sample
const audioBuffer = Buffer.from([
  0x52, 0x49, 0x46, 0x46, // "RIFF"
  0x24, 0x00, 0x00, 0x00, // File size
  0x57, 0x41, 0x56, 0x45, // "WAVE"
  0x66, 0x6d, 0x74, 0x20, // "fmt "
  0x10, 0x00, 0x00, 0x00, // Subchunk size
  0x01, 0x00,             // Audio format
  0x01, 0x00,             // Channels
  0x44, 0xac, 0x00, 0x00, // Sample rate
  0x88, 0x58, 0x01, 0x00, // Byte rate
  0x02, 0x00,             // Block align
  0x10, 0x00,             // Bits per sample
  0x64, 0x61, 0x74, 0x61, // "data"
  0x00, 0x00, 0x00, 0x00, // Data size
]);

server.addResource({
  uri: 'audio://sample',
  name: 'Audio Sample',
  description: 'Sample audio file (WAV format)',
  mimeType: 'audio/wav',
  content: audioBuffer,
});

// Resource 4: Text resource (to show backward compatibility)
server.addResource({
  uri: 'text://readme',
  name: 'README',
  description: 'Binary Content Demo README',
  mimeType: 'text/plain',
  content: `Binary Content Demo Server

This server demonstrates SimpleMCP's support for binary content including:
- Images (PNG, JPEG, GIF, WebP)
- PDFs
- Audio files (MP3, WAV)
- Generic binary data

All binary content is automatically base64-encoded for transmission.`,
});

// ============================================================================
// ADD A PROMPT
// ============================================================================

server.addPrompt({
  name: 'binary-demo-help',
  description: 'Get help with the binary content demo server',
  arguments: [],
  template: `Binary Content Demo Server Help

This server demonstrates Phase 2 Feature 1: Image & Binary Content Support.

Available Tools:
1. generate_chart - Generate PNG charts from data
2. create_thumbnail - Create image thumbnails
3. generate_pdf_report - Create PDF reports
4. analyze_image - Analyze images and return mixed content
5. text_to_speech - Convert text to audio (WAV)
6. encode_data - Encode text as binary data
7. create_qr_code - Generate QR code images

Available Resources:
1. doc://user-manual - PDF user manual
2. img://logo - Company logo (PNG)
3. audio://sample - Audio sample (WAV)
4. text://readme - Text README

All binary content is automatically detected and base64-encoded!`,
});

// ============================================================================
// START THE SERVER
// ============================================================================

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const useHttp = args.includes('--http');

  console.error('\n========================================');
  console.error('Binary Content Demo Server');
  console.error('========================================');
  console.error('Phase 2 Feature 1: Image & Binary Content Support\n');

  if (useHttp) {
    const portArg = args.indexOf('--port');
    const port = portArg !== -1 && args[portArg + 1] ? parseInt(args[portArg + 1], 10) : 3000;

    console.error(`Starting HTTP server on port ${port}...`);
    await server.start({ transport: 'http', port });
    console.error(`\nServer running at http://localhost:${port}`);
    console.error('Press Ctrl+C to stop\n');
  } else {
    console.error('Starting stdio server...');
    console.error('Registered:');
    console.error('  - 7 tools (with binary content support)');
    console.error('  - 4 resources (including binary)');
    console.error('  - 1 prompt\n');

    await server.start();
  }
}

main().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});
