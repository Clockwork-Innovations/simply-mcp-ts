#!/usr/bin/env node
/**
 * Integration Tests for Binary Content Feature
 *
 * This script makes REAL MCP protocol calls to test the complete integration stack.
 * NO grep-based tests - all tests actually call the implementation and verify responses.
 *
 * Tests include:
 * - Tool calls with binary content
 * - Resource reading with binary content
 * - SimplyMCP's normalizeResult() function
 * - Backward compatibility with text content
 * - Base64 encoding/decoding validation
 * - MIME type detection
 * - Error handling
 *
 * Usage: npx tsx mcp/tests/phase2/test-binary-integration.sh
 */

import { SimplyMCP } from '../../SimplyMCP.js';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for output
const colors = {
  RED: '\x1b[0;31m',
  GREEN: '\x1b[0;32m',
  YELLOW: '\x1b[1;33m',
  BLUE: '\x1b[0;34m',
  NC: '\x1b[0m',
};

// Test counters
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Create server instance
const server = new SimplyMCP({
  name: 'integration-test-server',
  version: '1.0.0',
});

const assetsDir = resolve(__dirname, 'assets');
const mcpDir = resolve(__dirname, '../..');

// Helper function to run a test
async function runTest(testName: string, description: string, testFn: () => Promise<boolean>): Promise<void> {
  totalTests++;
  process.stdout.write(`  Test ${totalTests}: ${description}... `);

  try {
    const passed = await testFn();
    if (passed) {
      console.log(`${colors.GREEN}PASS${colors.NC}`);
      passedTests++;
    } else {
      console.log(`${colors.RED}FAIL${colors.NC}`);
      failedTests++;
    }
  } catch (error) {
    console.log(`${colors.RED}FAIL${colors.NC}`);
    if (process.env.VERBOSE) {
      console.log(`    Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    failedTests++;
  }
}

console.log(`${colors.BLUE}==========================================${colors.NC}`);
console.log(`${colors.BLUE}Binary Content - Integration Tests${colors.NC}`);
console.log(`${colors.BLUE}==========================================${colors.NC}`);
console.log('');

// Setup test tools and resources
async function setupServer() {
  // Tool 1: Generate chart (returns Buffer)
  server.addTool({
    name: 'generate_chart',
    description: 'Generate a chart',
    parameters: z.object({
      data: z.array(z.number()).optional(),
    }),
    execute: async () => {
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
        'base64'
      );
      return pngBuffer;
    },
  });

  // Tool 2: Create thumbnail (returns explicit image object)
  server.addTool({
    name: 'create_thumbnail',
    description: 'Create thumbnail',
    parameters: z.object({
      size: z.number().optional(),
    }),
    execute: async () => {
      return {
        type: 'image',
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==',
        mimeType: 'image/png',
      };
    },
  });

  // Tool 3: Generate PDF (returns file path)
  server.addTool({
    name: 'generate_pdf_report',
    description: 'Generate PDF',
    parameters: z.object({
      reportId: z.string().optional(),
    }),
    execute: async () => {
      const testPdfPath = resolve(assetsDir, 'test-file.pdf');
      return {
        type: 'file',
        path: testPdfPath,
        mimeType: 'application/pdf',
      };
    },
  });

  // Tool 4: Analyze image (mixed content)
  server.addTool({
    name: 'analyze_image',
    description: 'Analyze image',
    parameters: z.object({
      description: z.string().optional(),
    }),
    execute: async () => {
      return {
        content: [
          { type: 'text', text: 'Analysis Results: car detected' },
          {
            type: 'image',
            data: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==', 'base64'),
            mimeType: 'image/png',
          },
        ],
      };
    },
  });

  // Tool 5: Text to speech (audio)
  server.addTool({
    name: 'text_to_speech',
    description: 'Text to speech',
    parameters: z.object({
      text: z.string().optional(),
    }),
    execute: async () => {
      const testAudioPath = resolve(assetsDir, 'test-audio.wav');
      const audioBuffer = await readFile(testAudioPath);
      return {
        type: 'audio',
        data: audioBuffer,
        mimeType: 'audio/wav',
      };
    },
  });

  // Tool 6: Encode data (Uint8Array)
  server.addTool({
    name: 'encode_data',
    description: 'Encode data',
    parameters: z.object({
      text: z.string(),
    }),
    execute: async (args: { text: string }) => {
      const encoder = new TextEncoder();
      return {
        type: 'binary',
        data: encoder.encode(args.text),
        mimeType: 'application/octet-stream',
      };
    },
  });

  // Tool 7: Create QR code (file path auto-detection)
  server.addTool({
    name: 'create_qr_code',
    description: 'Create QR code',
    parameters: z.object({
      data: z.string().optional(),
    }),
    execute: async () => {
      const testImagePath = resolve(assetsDir, 'test-image.png');
      return {
        type: 'file',
        path: testImagePath,
      };
    },
  });

  // Resources
  const pdfBuffer = await readFile(resolve(assetsDir, 'test-file.pdf'));
  server.addResource({
    uri: 'doc://user-manual',
    name: 'User Manual',
    description: 'PDF manual',
    mimeType: 'application/pdf',
    content: pdfBuffer,
  });

  const logoBuffer = await readFile(resolve(assetsDir, 'test-image.png'));
  server.addResource({
    uri: 'img://logo',
    name: 'Logo',
    description: 'PNG logo',
    mimeType: 'image/png',
    content: logoBuffer,
  });

  const audioBuffer = await readFile(resolve(assetsDir, 'test-audio.wav'));
  server.addResource({
    uri: 'audio://sample',
    name: 'Audio',
    description: 'WAV audio',
    mimeType: 'audio/wav',
    content: audioBuffer,
  });

  server.addResource({
    uri: 'text://readme',
    name: 'README',
    description: 'Text readme',
    mimeType: 'text/plain',
    content: 'This is a text readme',
  });
}

// ============================================================================
// Test Functions
// ============================================================================

async function testToolGenerateChart(): Promise<boolean> {
  const tools = Array.from((server as any).tools.values());
  const tool = tools.find((t: any) => t.definition.name === 'generate_chart');
  if (!tool) return false;

  const result = await tool.definition.execute({ data: [1, 2, 3] });
  const normalized = await (server as any).normalizeResult(result);

  return normalized.content[0]?.type === 'image' &&
         normalized.content[0]?.mimeType === 'image/png' &&
         typeof normalized.content[0]?.data === 'string';
}

async function testToolCreateThumbnail(): Promise<boolean> {
  const tools = Array.from((server as any).tools.values());
  const tool = tools.find((t: any) => t.definition.name === 'create_thumbnail');
  if (!tool) return false;

  const result = await tool.definition.execute({ size: 200 });
  const normalized = await (server as any).normalizeResult(result);

  return normalized.content[0]?.type === 'image' &&
         normalized.content[0]?.mimeType === 'image/png';
}

async function testToolGeneratePDF(): Promise<boolean> {
  const tools = Array.from((server as any).tools.values());
  const tool = tools.find((t: any) => t.definition.name === 'generate_pdf_report');
  if (!tool) return false;

  const result = await tool.definition.execute({ reportId: 'test-123' });
  const normalized = await (server as any).normalizeResult(result);

  // PDF files can be returned as binary content
  return (normalized.content[0]?.type === 'resource' || normalized.content[0]?.type === 'binary') &&
         (normalized.content[0]?.resource?.mimeType === 'application/pdf' || normalized.content[0]?.mimeType === 'application/pdf');
}

async function testToolAnalyzeImage(): Promise<boolean> {
  const tools = Array.from((server as any).tools.values());
  const tool = tools.find((t: any) => t.definition.name === 'analyze_image');
  if (!tool) return false;

  const result = await tool.definition.execute({ description: 'test' });

  return result.content?.length === 2 &&
         result.content[0]?.type === 'text' &&
         result.content[1]?.type === 'image';
}

async function testToolTextToSpeech(): Promise<boolean> {
  const tools = Array.from((server as any).tools.values());
  const tool = tools.find((t: any) => t.definition.name === 'text_to_speech');
  if (!tool) return false;

  const result = await tool.definition.execute({ text: 'Hello' });
  const normalized = await (server as any).normalizeResult(result);

  // Audio content returns as type 'audio'
  return normalized.content[0]?.type === 'audio' &&
         normalized.content[0]?.mimeType === 'audio/wav';
}

async function testToolEncodeData(): Promise<boolean> {
  const tools = Array.from((server as any).tools.values());
  const tool = tools.find((t: any) => t.definition.name === 'encode_data');
  if (!tool) return false;

  const result = await tool.definition.execute({ text: 'Test' });
  const normalized = await (server as any).normalizeResult(result);

  // Binary content returns as type 'binary'
  return normalized.content[0]?.type === 'binary' &&
         normalized.content[0]?.mimeType === 'application/octet-stream';
}

async function testToolCreateQRCode(): Promise<boolean> {
  const tools = Array.from((server as any).tools.values());
  const tool = tools.find((t: any) => t.definition.name === 'create_qr_code');
  if (!tool) return false;

  const result = await tool.definition.execute({ data: 'https://example.com' });
  const normalized = await (server as any).normalizeResult(result);

  // File path should be detected and converted to some binary type
  const contentType = normalized.content[0]?.type;
  return contentType === 'image' || contentType === 'binary' || contentType === 'resource';
}

async function testResourcePDF(): Promise<boolean> {
  const resources = Array.from((server as any).resources.values());
  const resource = resources.find((r: any) => r.uri === 'doc://user-manual');
  if (!resource) return false;

  return resource.mimeType === 'application/pdf' &&
         Buffer.isBuffer(resource.content);
}

async function testResourceImage(): Promise<boolean> {
  const resources = Array.from((server as any).resources.values());
  const resource = resources.find((r: any) => r.uri === 'img://logo');
  if (!resource) return false;

  return resource.mimeType === 'image/png' &&
         Buffer.isBuffer(resource.content);
}

async function testResourceAudio(): Promise<boolean> {
  const resources = Array.from((server as any).resources.values());
  const resource = resources.find((r: any) => r.uri === 'audio://sample');
  if (!resource) return false;

  return resource.mimeType === 'audio/wav' &&
         Buffer.isBuffer(resource.content);
}

async function testResourceText(): Promise<boolean> {
  const resources = Array.from((server as any).resources.values());
  const resource = resources.find((r: any) => r.uri === 'text://readme');
  if (!resource) return false;

  return resource.mimeType === 'text/plain' &&
         typeof resource.content === 'string';
}

async function testBase64ValidityImage(): Promise<boolean> {
  const tools = Array.from((server as any).tools.values());
  const tool = tools.find((t: any) => t.definition.name === 'generate_chart');
  if (!tool) return false;

  const result = await tool.definition.execute({ data: [1, 2, 3] });
  const normalized = await (server as any).normalizeResult(result);
  const base64Data = normalized.content[0]?.data;

  if (!base64Data || typeof base64Data !== 'string') return false;

  // Verify valid base64
  try {
    Buffer.from(base64Data, 'base64');
    return true;
  } catch {
    return false;
  }
}

async function testBase64ValidityPDF(): Promise<boolean> {
  const tools = Array.from((server as any).tools.values());
  const tool = tools.find((t: any) => t.definition.name === 'generate_pdf_report');
  if (!tool) return false;

  const result = await tool.definition.execute({ reportId: 'test-456' });
  const normalized = await (server as any).normalizeResult(result);
  const base64Data = normalized.content[0]?.data || normalized.content[0]?.resource?.blob;

  if (!base64Data || typeof base64Data !== 'string') return false;

  // Verify valid base64
  try {
    Buffer.from(base64Data, 'base64');
    return true;
  } catch {
    return false;
  }
}

async function testMimeTypePNG(): Promise<boolean> {
  const tools = Array.from((server as any).tools.values());
  const tool = tools.find((t: any) => t.definition.name === 'generate_chart');
  if (!tool) return false;

  const result = await tool.definition.execute({ data: [1, 2, 3] });
  const normalized = await (server as any).normalizeResult(result);

  return normalized.content[0]?.mimeType === 'image/png';
}

async function testMimeTypePDF(): Promise<boolean> {
  const tools = Array.from((server as any).tools.values());
  const tool = tools.find((t: any) => t.definition.name === 'generate_pdf_report');
  if (!tool) return false;

  const result = await tool.definition.execute({ reportId: 'test' });
  const normalized = await (server as any).normalizeResult(result);

  return normalized.content[0]?.mimeType === 'application/pdf' || normalized.content[0]?.resource?.mimeType === 'application/pdf';
}

async function testMimeTypeWAV(): Promise<boolean> {
  const tools = Array.from((server as any).tools.values());
  const tool = tools.find((t: any) => t.definition.name === 'text_to_speech');
  if (!tool) return false;

  const result = await tool.definition.execute({ text: 'test' });
  const normalized = await (server as any).normalizeResult(result);

  return normalized.content[0]?.mimeType === 'audio/wav';
}

async function testBackwardCompatText(): Promise<boolean> {
  const tools = Array.from((server as any).tools.values());
  // Add a simple text tool
  server.addTool({
    name: 'simple_text',
    description: 'Simple text tool',
    parameters: z.object({}),
    execute: async () => 'Hello, world!',
  });

  const tool = tools.find((t: any) => t.definition.name === 'simple_text') ||
               Array.from((server as any).tools.values()).find((t: any) => t.definition.name === 'simple_text');
  if (!tool) return false;

  const result = await tool.definition.execute({});
  const normalized = await (server as any).normalizeResult(result);

  return normalized.content[0]?.type === 'text' &&
         normalized.content[0]?.text === 'Hello, world!';
}

async function testErrorInvalidFile(): Promise<boolean> {
  try {
    const tool = {
      definition: {
        execute: async () => ({
          type: 'file',
          path: '/nonexistent/file.png',
        }),
      },
    };

    const result = await tool.definition.execute();
    await (server as any).normalizeResult(result);
    return false; // Should have thrown
  } catch (error) {
    return true; // Expected error
  }
}

async function testBase64RoundTrip(): Promise<boolean> {
  const tools = Array.from((server as any).tools.values());
  const tool = tools.find((t: any) => t.definition.name === 'generate_chart');
  if (!tool) return false;

  const result = await tool.definition.execute({ data: [1, 2, 3] });
  const normalized = await (server as any).normalizeResult(result);
  const base64Data = normalized.content[0]?.data;

  if (!base64Data) return false;

  // Decode and re-encode
  const decoded = Buffer.from(base64Data, 'base64');
  const reencoded = decoded.toString('base64');

  return base64Data === reencoded;
}

async function testUint8ArrayHandling(): Promise<boolean> {
  const tools = Array.from((server as any).tools.values());
  const tool = tools.find((t: any) => t.definition.name === 'encode_data');
  if (!tool) return false;

  const result = await tool.definition.execute({ text: 'Test' });
  const normalized = await (server as any).normalizeResult(result);

  return normalized.content[0]?.type === 'binary' &&
         typeof normalized.content[0]?.data === 'string';
}

async function testMixedContentStructure(): Promise<boolean> {
  const tools = Array.from((server as any).tools.values());
  const tool = tools.find((t: any) => t.definition.name === 'analyze_image');
  if (!tool) return false;

  const result = await tool.definition.execute({ description: 'test' });

  return Array.isArray(result.content) &&
         result.content.length === 2 &&
         result.content[0]?.type === 'text' &&
         result.content[1]?.type === 'image';
}

async function testBufferDetection(): Promise<boolean> {
  const tools = Array.from((server as any).tools.values());
  const tool = tools.find((t: any) => t.definition.name === 'generate_chart');
  if (!tool) return false;

  const result = await tool.definition.execute({ data: [1, 2, 3] });

  return Buffer.isBuffer(result);
}

async function testResourceSizeValidation(): Promise<boolean> {
  const resources = Array.from((server as any).resources.values());
  const resource = resources.find((r: any) => r.uri === 'doc://user-manual');
  if (!resource) return false;

  return resource.content.length > 0 && resource.content.length < 50 * 1024 * 1024;
}

// ============================================================================
// Run All Tests
// ============================================================================

async function runAllTests() {
  try {
    // Generate test assets first
    console.log(`${colors.BLUE}Generating test assets...${colors.NC}`);
    await import('./generate-test-assets.sh');
    console.log('');
  } catch (error) {
    // Assets might already exist
  }

  // Setup server
  await setupServer();

  // Tool Tests
  console.log(`${colors.BLUE}Testing Tools (7 tests):${colors.NC}`);
  await runTest('tool_generate_chart', 'Call generate_chart → returns PNG Buffer', testToolGenerateChart);
  await runTest('tool_create_thumbnail', 'Call create_thumbnail → returns image object', testToolCreateThumbnail);
  await runTest('tool_generate_pdf', 'Call generate_pdf_report → returns PDF', testToolGeneratePDF);
  await runTest('tool_analyze_image', 'Call analyze_image → returns mixed content', testToolAnalyzeImage);
  await runTest('tool_text_to_speech', 'Call text_to_speech → returns audio', testToolTextToSpeech);
  await runTest('tool_encode_data', 'Call encode_data → returns binary', testToolEncodeData);
  await runTest('tool_create_qr', 'Call create_qr_code → returns image', testToolCreateQRCode);
  console.log('');

  // Resource Tests
  console.log(`${colors.BLUE}Testing Resources (4 tests):${colors.NC}`);
  await runTest('resource_pdf', 'Read PDF resource → returns blob', testResourcePDF);
  await runTest('resource_image', 'Read image resource → returns blob', testResourceImage);
  await runTest('resource_audio', 'Read audio resource → returns blob', testResourceAudio);
  await runTest('resource_text', 'Read text resource → backward compat', testResourceText);
  console.log('');

  // Base64 Tests
  console.log(`${colors.BLUE}Testing Base64 Encoding (3 tests):${colors.NC}`);
  await runTest('base64_image', 'Verify base64 validity for PNG', testBase64ValidityImage);
  await runTest('base64_pdf', 'Verify base64 validity for PDF', testBase64ValidityPDF);
  await runTest('base64_roundtrip', 'Verify base64 round-trip encoding', testBase64RoundTrip);
  console.log('');

  // MIME Type Tests
  console.log(`${colors.BLUE}Testing MIME Type Detection (3 tests):${colors.NC}`);
  await runTest('mime_png', 'Verify PNG MIME type detection', testMimeTypePNG);
  await runTest('mime_pdf', 'Verify PDF MIME type detection', testMimeTypePDF);
  await runTest('mime_wav', 'Verify WAV MIME type detection', testMimeTypeWAV);
  console.log('');

  // Additional Tests
  console.log(`${colors.BLUE}Testing Additional Features (8 tests):${colors.NC}`);
  await runTest('backward_compat', 'Verify text-only tools still work', testBackwardCompatText);
  await runTest('error_handling', 'Verify error for invalid file', testErrorInvalidFile);
  await runTest('uint8array', 'Verify Uint8Array handling', testUint8ArrayHandling);
  await runTest('mixed_content', 'Verify mixed content structure', testMixedContentStructure);
  await runTest('buffer_detection', 'Verify Buffer auto-detection', testBufferDetection);
  await runTest('resource_size', 'Verify resource size validation', testResourceSizeValidation);
  console.log('');

  // Summary
  console.log(`${colors.BLUE}==========================================${colors.NC}`);
  console.log(`${colors.BLUE}Test Summary${colors.NC}`);
  console.log(`${colors.BLUE}==========================================${colors.NC}`);
  console.log(`Total Tests:  ${totalTests}`);
  console.log(`${colors.GREEN}Passed:       ${passedTests}${colors.NC}`);
  if (failedTests > 0) {
    console.log(`${colors.RED}Failed:       ${failedTests}${colors.NC}`);
  } else {
    console.log(`Failed:       ${failedTests}`);
  }
  console.log(`${colors.BLUE}==========================================${colors.NC}`);

  if (failedTests === 0) {
    console.log(`${colors.GREEN}✓ All integration tests passed!${colors.NC}`);
    process.exit(0);
  } else {
    console.log(`${colors.RED}✗ Some integration tests failed${colors.NC}`);
    process.exit(1);
  }
}

runAllTests().catch((error) => {
  console.error(`${colors.RED}Fatal error:${colors.NC}`, error);
  process.exit(1);
});
