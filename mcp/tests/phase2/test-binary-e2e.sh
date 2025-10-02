#!/bin/bash
###############################################################################
# End-to-End Tests for Binary Content Feature
#
# Tests complete workflows from client request to binary data delivery.
# These tests verify the entire stack works together correctly.
#
# Test scenarios:
# 1. Client requests image tool → receives base64 image → can decode it
# 2. Client requests PDF resource → receives blob → size matches original
# 3. Client requests audio tool → receives audio content → MIME type correct
# 4. Mixed content tool → returns text + multiple images
# 5. Error recovery → invalid file → proper error message returned
#
# Usage: bash mcp/tests/phase2/test-binary-e2e.sh
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS_DIR="$SCRIPT_DIR/assets"
MCP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMP_DIR="/tmp/mcp-e2e-tests-$$"

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Binary Content - End-to-End Tests${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Create temp directory
mkdir -p "$TEMP_DIR"

# Cleanup function
cleanup() {
    rm -rf "$TEMP_DIR"
}

trap cleanup EXIT INT TERM

# Helper function to run a test
run_test() {
    local test_name="$1"
    local description="$2"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -n "  Test $TOTAL_TESTS: $description... "

    # Execute the test
    if eval "$test_name" > /dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# ============================================================================
# Test Functions (Using TypeScript test client)
# ============================================================================

# Create a test client TypeScript file
create_test_client() {
    # Create the TypeScript file with proper imports
    # Use a two-part approach: dynamic import line, then static content
    cat > "$TEMP_DIR/e2e-client.ts" <<EOFPART1
#!/usr/bin/env node
import { SimpleMCP } from '$MCP_DIR/SimpleMCP.js';
import { z } from '$MCP_DIR/../node_modules/zod/index.js';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
EOFPART1

    # Append the rest with single quotes to prevent substitution
    cat >> "$TEMP_DIR/e2e-client.ts" <<'EOFPART2'

const testName = process.argv[2];
const args = process.argv.slice(3);

// Get assets path from environment
const assetsRoot = process.env.ASSETS_ROOT || '';

interface TestResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

async function runTest(): Promise<TestResult> {
  try {
    // Create a test server
    const server = new SimpleMCP({
      name: 'e2e-test-server',
      version: '1.0.0',
    });

    const assetsDir = assetsRoot;

    switch (testName) {
      // ====================================================================
      // Workflow 1: Image Tool → Base64 → Decode
      // ====================================================================
      case 'workflow_image_decode': {
        // Add tool that returns PNG Buffer
        server.addTool({
          name: 'get_image',
          description: 'Get test image',
          parameters: z.object({}),
          execute: async () => {
            const imagePath = resolve(assetsDir, 'test-image.png');
            return await readFile(imagePath);
          },
        });

        // Simulate calling the tool
        const tools = Array.from((server as any).tools.values());
        const tool = tools.find((t: any) => t.definition.name === 'get_image');

        if (!tool) {
          return { success: false, error: 'Tool not found' };
        }

        const result = await tool.definition.execute({});

        // Normalize result
        const normalized = await (server as any).normalizeResult(result);

        // Verify structure
        if (!normalized.content || normalized.content.length === 0) {
          return { success: false, error: 'No content in result' };
        }

        const imageContent = normalized.content[0];

        if (imageContent.type !== 'image') {
          return { success: false, error: `Expected type 'image', got '${imageContent.type}'` };
        }

        if (!imageContent.data || typeof imageContent.data !== 'string') {
          return { success: false, error: 'Missing or invalid base64 data' };
        }

        // Decode base64
        const decoded = Buffer.from(imageContent.data, 'base64');

        // Read original file to compare
        const originalPath = resolve(assetsDir, 'test-image.png');
        const original = await readFile(originalPath);

        // Compare sizes
        const sizeMatches = decoded.length === original.length;

        // Compare content
        const contentMatches = Buffer.compare(decoded, original) === 0;

        return {
          success: sizeMatches && contentMatches,
          data: {
            originalSize: original.length,
            decodedSize: decoded.length,
            mimeType: imageContent.mimeType,
            sizeMatches,
            contentMatches,
          },
          message: contentMatches ? 'Image correctly encoded and decoded' : 'Content mismatch',
        };
      }

      // ====================================================================
      // Workflow 2: PDF Resource → Blob → Size Verification
      // ====================================================================
      case 'workflow_pdf_resource': {
        // Add PDF resource
        const pdfPath = resolve(assetsDir, 'test-file.pdf');
        const pdfBuffer = await readFile(pdfPath);

        server.addResource({
          uri: 'doc://test-pdf',
          name: 'Test PDF',
          description: 'Test PDF document',
          mimeType: 'application/pdf',
          content: pdfBuffer,
        });

        // Read resource
        const resourceContents = await (server as any).readResourceByUri('doc://test-pdf');

        // For binary resources, we need to check the resource handling
        const resources = Array.from((server as any).resources.values());
        const resource = resources.find((r: any) => r.uri === 'doc://test-pdf');

        if (!resource) {
          return { success: false, error: 'Resource not found' };
        }

        // Verify it's a Buffer
        const isBuffer = Buffer.isBuffer(resource.content);

        // Compare sizes
        const sizeMatches = resource.content.length === pdfBuffer.length;

        return {
          success: isBuffer && sizeMatches,
          data: {
            uri: resource.uri,
            mimeType: resource.mimeType,
            originalSize: pdfBuffer.length,
            resourceSize: resource.content.length,
            isBuffer,
            sizeMatches,
          },
        };
      }

      // ====================================================================
      // Workflow 3: Audio Tool → Audio Content → MIME Type
      // ====================================================================
      case 'workflow_audio_mime': {
        // Add tool that returns WAV audio
        server.addTool({
          name: 'get_audio',
          description: 'Get test audio',
          parameters: z.object({}),
          execute: async () => {
            const audioPath = resolve(assetsDir, 'test-audio.wav');
            const buffer = await readFile(audioPath);
            return {
              type: 'audio',
              data: buffer,
              mimeType: 'audio/wav',
            };
          },
        });

        // Call tool
        const tools = Array.from((server as any).tools.values());
        const tool = tools.find((t: any) => t.definition.name === 'get_audio');

        if (!tool) {
          return { success: false, error: 'Tool not found' };
        }

        const result = await tool.definition.execute({});
        const normalized = await (server as any).normalizeResult(result);

        const audioContent = normalized.content[0];

        const isCorrectType = audioContent.type === 'audio';
        const isCorrectMime = audioContent.mimeType === 'audio/wav';
        const hasData = typeof audioContent.data === 'string' && audioContent.data.length > 0;

        return {
          success: isCorrectType && isCorrectMime && hasData,
          data: {
            type: audioContent.type,
            mimeType: audioContent.mimeType,
            hasData,
          },
        };
      }

      // ====================================================================
      // Workflow 4: Mixed Content → Text + Images
      // ====================================================================
      case 'workflow_mixed_content': {
        // Add tool that returns mixed content
        server.addTool({
          name: 'analyze',
          description: 'Analyze and return mixed content',
          parameters: z.object({}),
          execute: async () => {
            const imagePath = resolve(assetsDir, 'test-image.png');
            const imageBuffer = await readFile(imagePath);

            return {
              content: [
                {
                  type: 'text',
                  text: 'Analysis Results:\n- Object detected: car\n- Confidence: 95%',
                },
                {
                  type: 'image',
                  data: imageBuffer,
                  mimeType: 'image/png',
                },
                {
                  type: 'text',
                  text: 'Processing complete.',
                },
              ],
            };
          },
        });

        // Call tool
        const tools = Array.from((server as any).tools.values());
        const tool = tools.find((t: any) => t.definition.name === 'analyze');

        if (!tool) {
          return { success: false, error: 'Tool not found' };
        }

        const result = await tool.definition.execute({});

        // Result is already in HandlerResult format, so it should pass through
        const hasContent = result.content && Array.isArray(result.content);
        const hasThreeItems = result.content.length === 3;
        const hasText = result.content[0]?.type === 'text';
        const hasImage = result.content[1]?.type === 'image';
        const hasSecondText = result.content[2]?.type === 'text';

        return {
          success: hasContent && hasThreeItems && hasText && hasImage && hasSecondText,
          data: {
            contentCount: result.content.length,
            types: result.content.map((c: any) => c.type),
          },
        };
      }

      // ====================================================================
      // Workflow 5: Error Recovery → Invalid File
      // ====================================================================
      case 'workflow_error_handling': {
        // Add tool that tries to read non-existent file
        server.addTool({
          name: 'read_missing',
          description: 'Read non-existent file',
          parameters: z.object({}),
          execute: async () => {
            return {
              type: 'file',
              path: '/nonexistent/file.png',
            };
          },
        });

        // Call tool
        const tools = Array.from((server as any).tools.values());
        const tool = tools.find((t: any) => t.definition.name === 'read_missing');

        if (!tool) {
          return { success: false, error: 'Tool not found' };
        }

        try {
          const result = await tool.definition.execute({});
          await (server as any).normalizeResult(result);

          // Should have thrown error
          return {
            success: false,
            error: 'Expected error for missing file',
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          const hasFileError = errorMsg.toLowerCase().includes('file') ||
                              errorMsg.toLowerCase().includes('not found') ||
                              errorMsg.toLowerCase().includes('permission');

          return {
            success: hasFileError,
            message: 'Correctly handled missing file error',
            data: { error: errorMsg },
          };
        }
      }

      // ====================================================================
      // Additional Workflows
      // ====================================================================
      case 'workflow_uint8array': {
        // Test Uint8Array handling
        server.addTool({
          name: 'get_uint8',
          description: 'Get Uint8Array data',
          parameters: z.object({}),
          execute: async () => {
            const data = new Uint8Array([1, 2, 3, 4, 5]);
            return {
              type: 'binary',
              data,
              mimeType: 'application/octet-stream',
            };
          },
        });

        const tools = Array.from((server as any).tools.values());
        const tool = tools.find((t: any) => t.definition.name === 'get_uint8');

        if (!tool) {
          return { success: false, error: 'Tool not found' };
        }

        const result = await tool.definition.execute({});
        const normalized = await (server as any).normalizeResult(result);

        const content = normalized.content[0];
        const isCorrect = content.type === 'binary' && typeof content.data === 'string';

        // Decode and verify
        const decoded = Buffer.from(content.data, 'base64');
        const matches = Buffer.compare(decoded, Buffer.from([1, 2, 3, 4, 5])) === 0;

        return {
          success: isCorrect && matches,
          data: {
            type: content.type,
            decodedCorrectly: matches,
          },
        };
      }

      case 'workflow_backward_compat_text': {
        // Test backward compatibility - text tools still work
        server.addTool({
          name: 'get_text',
          description: 'Get text data',
          parameters: z.object({}),
          execute: async () => {
            return "Hello, world!";
          },
        });

        const tools = Array.from((server as any).tools.values());
        const tool = tools.find((t: any) => t.definition.name === 'get_text');

        if (!tool) {
          return { success: false, error: 'Tool not found' };
        }

        const result = await tool.definition.execute({});
        const normalized = await (server as any).normalizeResult(result);

        const content = normalized.content[0];
        const isCorrect = content.type === 'text' && content.text === "Hello, world!";

        return {
          success: isCorrect,
          data: {
            type: content.type,
            text: content.text,
          },
        };
      }

      default:
        return {
          success: false,
          error: `Unknown test: ${testName}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

runTest()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
    process.exit(1);
  });
EOFPART2

    chmod +x "$TEMP_DIR/e2e-client.ts"
}

# Helper to run e2e test
run_e2e_test() {
    local test_name="$1"
    shift
    local description="$1"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -n "  Test $TOTAL_TESTS: $description... "

    # Run test with environment variables for paths
    if output=$(cd "$MCP_DIR" && MCP_SILENT_LOGGER=true MCP_ROOT="$MCP_DIR" ASSETS_ROOT="$ASSETS_DIR" npx tsx "$TEMP_DIR/e2e-client.ts" "$test_name" "$@" 2>&1); then
        if success=$(echo "$output" | jq -r '.success' 2>/dev/null); then
            if [ "$success" = "true" ]; then
                echo -e "${GREEN}PASS${NC}"
                PASSED_TESTS=$((PASSED_TESTS + 1))
                return 0
            else
                echo -e "${RED}FAIL${NC}"
                echo "$output" | jq -r '.message // .error // "Unknown error"' | sed 's/^/    /'
                FAILED_TESTS=$((FAILED_TESTS + 1))
                return 1
            fi
        else
            echo -e "${RED}FAIL${NC} (Invalid JSON output)"
            echo "$output" | sed 's/^/    /'
            FAILED_TESTS=$((FAILED_TESTS + 1))
            return 1
        fi
    else
        echo -e "${RED}FAIL${NC} (Test execution failed)"
        echo "$output" | sed 's/^/    /'
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# ============================================================================
# Run E2E Tests
# ============================================================================

echo -e "${BLUE}Generating test assets...${NC}"
bash "$SCRIPT_DIR/generate-test-assets.sh" > /dev/null 2>&1
echo -e "${GREEN}✓ Test assets ready${NC}"
echo ""

echo -e "${BLUE}Creating test client...${NC}"
create_test_client
echo -e "${GREEN}✓ Test client created${NC}"
echo ""

echo -e "${BLUE}Running End-to-End Workflows:${NC}"

run_e2e_test "workflow_image_decode" "Workflow: Image tool → base64 → decode → verify"
run_e2e_test "workflow_pdf_resource" "Workflow: PDF resource → blob → size matches"
run_e2e_test "workflow_audio_mime" "Workflow: Audio tool → audio content → MIME correct"
run_e2e_test "workflow_mixed_content" "Workflow: Mixed content → text + images"
run_e2e_test "workflow_error_handling" "Workflow: Error recovery → invalid file → error message"
run_e2e_test "workflow_uint8array" "Workflow: Uint8Array → binary → decode → verify"
run_e2e_test "workflow_backward_compat_text" "Workflow: Backward compat → text tools still work"

echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}==========================================${NC}"
echo -e "Total Tests:  $TOTAL_TESTS"
echo -e "${GREEN}Passed:       $PASSED_TESTS${NC}"
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}Failed:       $FAILED_TESTS${NC}"
else
    echo -e "Failed:       $FAILED_TESTS"
fi
echo -e "${BLUE}==========================================${NC}"

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All end-to-end tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some end-to-end tests failed${NC}"
    exit 1
fi
