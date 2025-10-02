#!/bin/bash
###############################################################################
# Unit Tests for Binary Content Helpers (content-helpers.ts)
#
# Tests all helper functions in isolation with REAL data (no mocking).
# This script tests:
# - detectMimeType() and related functions
# - bufferToBase64() and base64ToBuffer()
# - validateBase64()
# - sanitizeFilePath()
# - readBinaryFile()
# - createImageContent(), createAudioContent(), createBlobContent()
#
# Usage: bash mcp/tests/phase2/test-binary-helpers.sh
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

# Test helper script path
TEST_HELPER="$SCRIPT_DIR/test-helper.ts"

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Binary Content Helpers - Unit Tests${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Create test helper TypeScript file
cat > "$TEST_HELPER" << 'EOFTEST'
#!/usr/bin/env node
/**
 * Test helper for binary content helpers
 * Runs tests and outputs JSON results
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import {
  detectMimeType,
  detectMimeTypeFromExtension,
  detectMimeTypeFromMagicBytes,
  bufferToBase64,
  base64ToBuffer,
  validateBase64,
  sanitizeFilePath,
  readBinaryFile,
  createImageContent,
  createAudioContent,
  createBlobContent,
  isBuffer,
  isUint8Array,
} from '../../core/content-helpers.js';

const args = process.argv.slice(2);
const testName = args[0];
const testArgs = args.slice(1);

interface TestResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

async function runTest(): Promise<TestResult> {
  try {
    switch (testName) {
      // ========================================================================
      // MIME Type Detection Tests
      // ========================================================================
      case 'detectMimeTypeFromExtension': {
        const filePath = testArgs[0];
        const result = detectMimeTypeFromExtension(filePath);
        return {
          success: true,
          data: { mimeType: result },
        };
      }

      case 'detectMimeTypeFromMagicBytes': {
        const filePath = testArgs[0];
        const buffer = await readFile(filePath);
        const result = detectMimeTypeFromMagicBytes(buffer);
        return {
          success: true,
          data: { mimeType: result },
        };
      }

      case 'detectMimeType': {
        const filePath = testArgs[0];
        const buffer = await readFile(filePath);
        const result = detectMimeType(buffer, filePath);
        return {
          success: true,
          data: { mimeType: result },
        };
      }

      // ========================================================================
      // Base64 Conversion Tests
      // ========================================================================
      case 'bufferToBase64': {
        const filePath = testArgs[0];
        const buffer = await readFile(filePath);
        const base64 = bufferToBase64(buffer);

        // Verify it's valid base64
        const isValid = validateBase64(base64);

        // Decode and compare
        const decoded = base64ToBuffer(base64);
        const matches = Buffer.compare(buffer, decoded) === 0;

        return {
          success: matches && isValid,
          data: {
            originalSize: buffer.length,
            base64Length: base64.length,
            decodedSize: decoded.length,
            matches,
            isValidBase64: isValid,
          },
          message: matches && isValid ? 'Buffer correctly encoded and decoded' : 'Mismatch in encoding/decoding',
        };
      }

      case 'base64ToBuffer': {
        const base64String = testArgs[0];
        const buffer = base64ToBuffer(base64String);
        return {
          success: true,
          data: {
            bufferLength: buffer.length,
            isBuffer: isBuffer(buffer),
          },
        };
      }

      case 'base64ToBufferWithDataURL': {
        const base64String = testArgs[0];
        const dataURL = `data:image/png;base64,${base64String}`;
        const buffer = base64ToBuffer(dataURL);

        // Compare with direct decode
        const directBuffer = base64ToBuffer(base64String);
        const matches = Buffer.compare(buffer, directBuffer) === 0;

        return {
          success: matches,
          data: { matches },
          message: matches ? 'Data URL prefix correctly stripped' : 'Data URL handling failed',
        };
      }

      // ========================================================================
      // Validation Tests
      // ========================================================================
      case 'validateBase64Valid': {
        const base64String = testArgs[0];
        const isValid = validateBase64(base64String);
        return {
          success: isValid,
          data: { isValid },
          message: isValid ? 'Valid base64 string' : 'Invalid base64 string',
        };
      }

      case 'validateBase64Invalid': {
        const invalidString = testArgs[0];
        const isValid = validateBase64(invalidString);
        return {
          success: !isValid,
          data: { isValid },
          message: !isValid ? 'Correctly identified as invalid' : 'Should have been invalid',
        };
      }

      // ========================================================================
      // Path Sanitization Tests
      // ========================================================================
      case 'sanitizeFilePath': {
        const filePath = testArgs[0];
        const basePath = testArgs[1] || process.cwd();
        const sanitized = sanitizeFilePath(filePath, basePath);
        return {
          success: true,
          data: { sanitizedPath: sanitized },
        };
      }

      case 'sanitizeFilePathTraversal': {
        const filePath = testArgs[0];
        const basePath = testArgs[1] || process.cwd();
        try {
          sanitizeFilePath(filePath, basePath);
          return {
            success: false,
            message: 'Should have thrown error for path traversal',
          };
        } catch (error) {
          return {
            success: true,
            message: 'Correctly prevented path traversal',
            data: { error: error instanceof Error ? error.message : String(error) },
          };
        }
      }

      // ========================================================================
      // File Reading Tests
      // ========================================================================
      case 'readBinaryFile': {
        const filePath = testArgs[0];
        const basePath = testArgs[1] || process.cwd();
        const buffer = await readBinaryFile(filePath, basePath);
        return {
          success: true,
          data: {
            size: buffer.length,
            isBuffer: isBuffer(buffer),
          },
        };
      }

      case 'readBinaryFileNotFound': {
        const filePath = testArgs[0];
        const basePath = testArgs[1] || process.cwd();
        try {
          await readBinaryFile(filePath, basePath);
          return {
            success: false,
            message: 'Should have thrown error for missing file',
          };
        } catch (error) {
          return {
            success: true,
            message: 'Correctly handled missing file',
            data: { error: error instanceof Error ? error.message : String(error) },
          };
        }
      }

      case 'readBinaryFileTooLarge': {
        const filePath = testArgs[0];
        const basePath = testArgs[1] || process.cwd();
        try {
          await readBinaryFile(filePath, basePath);
          return {
            success: false,
            message: 'Should have thrown error for file too large',
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          const isSizeError = errorMsg.includes('too large') || errorMsg.includes('max:');
          return {
            success: isSizeError,
            message: isSizeError ? 'Correctly rejected large file' : 'Wrong error type',
            data: { error: errorMsg },
          };
        }
      }

      // ========================================================================
      // Content Creation Tests
      // ========================================================================
      case 'createImageContentFromBuffer': {
        const filePath = testArgs[0];
        const buffer = await readFile(filePath);
        const imageContent = await createImageContent(buffer);

        // Verify structure
        const hasCorrectStructure =
          imageContent.type === 'image' &&
          typeof imageContent.data === 'string' &&
          typeof imageContent.mimeType === 'string' &&
          imageContent.data.length > 0;

        // Verify base64 is valid
        const isValidBase64 = validateBase64(imageContent.data);

        // Decode and compare size
        const decoded = base64ToBuffer(imageContent.data);
        const sizeMatches = decoded.length === buffer.length;

        return {
          success: hasCorrectStructure && isValidBase64 && sizeMatches,
          data: {
            type: imageContent.type,
            mimeType: imageContent.mimeType,
            dataLength: imageContent.data.length,
            originalSize: buffer.length,
            decodedSize: decoded.length,
            hasCorrectStructure,
            isValidBase64,
            sizeMatches,
          },
        };
      }

      case 'createImageContentFromPath': {
        const filePath = testArgs[0];
        const basePath = testArgs[1] || process.cwd();
        const imageContent = await createImageContent(filePath, undefined, basePath);

        const hasCorrectStructure =
          imageContent.type === 'image' &&
          typeof imageContent.data === 'string' &&
          typeof imageContent.mimeType === 'string';

        const isValidBase64 = validateBase64(imageContent.data);

        return {
          success: hasCorrectStructure && isValidBase64,
          data: {
            type: imageContent.type,
            mimeType: imageContent.mimeType,
            dataLength: imageContent.data.length,
            hasMetadata: !!imageContent._meta,
            originalPath: imageContent._meta?.originalPath,
          },
        };
      }

      case 'createImageContentFromBase64': {
        const base64String = testArgs[0];
        const imageContent = await createImageContent(base64String);

        const hasCorrectStructure =
          imageContent.type === 'image' &&
          typeof imageContent.data === 'string' &&
          typeof imageContent.mimeType === 'string';

        return {
          success: hasCorrectStructure,
          data: {
            type: imageContent.type,
            mimeType: imageContent.mimeType,
            dataLength: imageContent.data.length,
          },
        };
      }

      case 'createImageContentFromObject': {
        const filePath = testArgs[0];
        const buffer = await readFile(filePath);
        const inputObject = {
          type: 'image' as const,
          data: buffer,
          mimeType: 'image/png',
        };
        const imageContent = await createImageContent(inputObject);

        return {
          success: imageContent.type === 'image' && imageContent.mimeType === 'image/png',
          data: {
            type: imageContent.type,
            mimeType: imageContent.mimeType,
          },
        };
      }

      case 'createAudioContentFromBuffer': {
        const filePath = testArgs[0];
        const buffer = await readFile(filePath);
        const audioContent = await createAudioContent(buffer);

        const hasCorrectStructure =
          audioContent.type === 'audio' &&
          typeof audioContent.data === 'string' &&
          typeof audioContent.mimeType === 'string';

        return {
          success: hasCorrectStructure,
          data: {
            type: audioContent.type,
            mimeType: audioContent.mimeType,
            dataLength: audioContent.data.length,
          },
        };
      }

      case 'createBlobContentFromBuffer': {
        const filePath = testArgs[0];
        const buffer = await readFile(filePath);
        const blobContent = await createBlobContent(buffer);

        const hasCorrectStructure =
          blobContent.type === 'binary' &&
          typeof blobContent.data === 'string' &&
          typeof blobContent.mimeType === 'string';

        return {
          success: hasCorrectStructure,
          data: {
            type: blobContent.type,
            mimeType: blobContent.mimeType,
            dataLength: blobContent.data.length,
          },
        };
      }

      case 'createImageContentEmpty': {
        const emptyBuffer = Buffer.alloc(0);
        try {
          await createImageContent(emptyBuffer);
          return {
            success: false,
            message: 'Should have thrown error for empty buffer',
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          const isEmptyError = errorMsg.includes('empty');
          return {
            success: isEmptyError,
            message: isEmptyError ? 'Correctly rejected empty buffer' : 'Wrong error type',
            data: { error: errorMsg },
          };
        }
      }

      case 'createImageContentUint8Array': {
        const filePath = testArgs[0];
        const buffer = await readFile(filePath);
        const uint8Array = new Uint8Array(buffer);
        const imageContent = await createImageContent(uint8Array);

        return {
          success: imageContent.type === 'image',
          data: {
            type: imageContent.type,
            mimeType: imageContent.mimeType,
          },
        };
      }

      // ========================================================================
      // Type Guard Tests
      // ========================================================================
      case 'isBufferTest': {
        const buffer = Buffer.from('test');
        const uint8 = new Uint8Array([1, 2, 3]);
        const string = 'test';

        return {
          success: isBuffer(buffer) && !isBuffer(uint8) && !isBuffer(string),
          data: {
            bufferResult: isBuffer(buffer),
            uint8Result: isBuffer(uint8),
            stringResult: isBuffer(string),
          },
        };
      }

      case 'isUint8ArrayTest': {
        const buffer = Buffer.from('test');
        const uint8 = new Uint8Array([1, 2, 3]);
        const string = 'test';

        // Note: Buffer is instanceof Uint8Array, but isUint8Array should return false for Buffer
        return {
          success: !isUint8Array(buffer) && isUint8Array(uint8) && !isUint8Array(string),
          data: {
            bufferResult: isUint8Array(buffer),
            uint8Result: isUint8Array(uint8),
            stringResult: isUint8Array(string),
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
EOFTEST

chmod +x "$TEST_HELPER"

# Helper function to run a test
run_test() {
    local test_name="$1"
    shift
    local description="$1"
    shift

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -n "  Test $TOTAL_TESTS: $description... "

    # Run test and capture output
    if output=$(cd "$MCP_DIR" && npx tsx "$TEST_HELPER" "$test_name" "$@" 2>&1); then
        # Parse JSON output
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
# MIME Type Detection Tests
# ============================================================================
echo -e "${BLUE}Testing MIME Type Detection:${NC}"

run_test "detectMimeTypeFromExtension" "Detect MIME from .png extension" "test.png"
run_test "detectMimeTypeFromExtension" "Detect MIME from .jpg extension" "test.jpg"
run_test "detectMimeTypeFromExtension" "Detect MIME from .pdf extension" "test.pdf"
run_test "detectMimeTypeFromExtension" "Detect MIME from .wav extension" "test.wav"
run_test "detectMimeTypeFromExtension" "Detect MIME from .zip extension" "test.zip"
run_test "detectMimeTypeFromExtension" "Detect MIME from .gif extension" "test.gif"
run_test "detectMimeTypeFromExtension" "Detect MIME from .webp extension" "test.webp"

run_test "detectMimeTypeFromMagicBytes" "Detect PNG from magic bytes" "$ASSETS_DIR/test-image.png"
run_test "detectMimeTypeFromMagicBytes" "Detect JPEG from magic bytes" "$ASSETS_DIR/test-image.jpg"
run_test "detectMimeTypeFromMagicBytes" "Detect PDF from magic bytes" "$ASSETS_DIR/test-file.pdf"
run_test "detectMimeTypeFromMagicBytes" "Detect WAV from magic bytes" "$ASSETS_DIR/test-audio.wav"
run_test "detectMimeTypeFromMagicBytes" "Detect ZIP from magic bytes" "$ASSETS_DIR/test-archive.zip"
run_test "detectMimeTypeFromMagicBytes" "Detect GIF from magic bytes" "$ASSETS_DIR/test-image.gif"
run_test "detectMimeTypeFromMagicBytes" "Detect WebP from magic bytes" "$ASSETS_DIR/test-image.webp"

run_test "detectMimeType" "Auto-detect PNG" "$ASSETS_DIR/test-image.png"
run_test "detectMimeType" "Auto-detect JPEG" "$ASSETS_DIR/test-image.jpg"
run_test "detectMimeType" "Auto-detect PDF" "$ASSETS_DIR/test-file.pdf"

echo ""

# ============================================================================
# Base64 Conversion Tests
# ============================================================================
echo -e "${BLUE}Testing Base64 Conversion:${NC}"

run_test "bufferToBase64" "Convert PNG to base64 and back" "$ASSETS_DIR/test-image.png"
run_test "bufferToBase64" "Convert JPEG to base64 and back" "$ASSETS_DIR/test-image.jpg"
run_test "bufferToBase64" "Convert PDF to base64 and back" "$ASSETS_DIR/test-file.pdf"
run_test "bufferToBase64" "Convert WAV to base64 and back" "$ASSETS_DIR/test-audio.wav"

# Test with real base64 data
PNG_BASE64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
run_test "base64ToBuffer" "Decode valid base64 string" "$PNG_BASE64"
run_test "base64ToBufferWithDataURL" "Handle data URL prefix" "$PNG_BASE64"

echo ""

# ============================================================================
# Validation Tests
# ============================================================================
echo -e "${BLUE}Testing Validation:${NC}"

run_test "validateBase64Valid" "Validate correct base64" "$PNG_BASE64"
run_test "validateBase64Invalid" "Reject invalid base64" "This is not base64!!!"
run_test "validateBase64Invalid" "Reject invalid characters" "invalid@@base64"

echo ""

# ============================================================================
# Path Sanitization Tests
# ============================================================================
echo -e "${BLUE}Testing Path Sanitization:${NC}"

run_test "sanitizeFilePath" "Sanitize normal path" "test.png" "$ASSETS_DIR"
run_test "sanitizeFilePath" "Sanitize relative path" "./test.png" "$ASSETS_DIR"
run_test "sanitizeFilePathTraversal" "Prevent path traversal (../)" "../../etc/passwd" "$ASSETS_DIR"
run_test "sanitizeFilePathTraversal" "Prevent path traversal (absolute)" "/etc/passwd" "$ASSETS_DIR"

echo ""

# ============================================================================
# File Reading Tests
# ============================================================================
echo -e "${BLUE}Testing File Reading:${NC}"

run_test "readBinaryFile" "Read PNG file" "$ASSETS_DIR/test-image.png" "$ASSETS_DIR"
run_test "readBinaryFile" "Read PDF file" "$ASSETS_DIR/test-file.pdf" "$ASSETS_DIR"
run_test "readBinaryFileNotFound" "Handle missing file" "$ASSETS_DIR/nonexistent.png" "$ASSETS_DIR"
run_test "readBinaryFileTooLarge" "Reject file >50MB" "$ASSETS_DIR/test-very-large.bin" "$ASSETS_DIR"

echo ""

# ============================================================================
# Content Creation Tests
# ============================================================================
echo -e "${BLUE}Testing Image Content Creation:${NC}"

run_test "createImageContentFromBuffer" "Create from Buffer" "$ASSETS_DIR/test-image.png"
run_test "createImageContentFromPath" "Create from file path" "$ASSETS_DIR/test-image.png" "$ASSETS_DIR"
run_test "createImageContentFromBase64" "Create from base64 string" "$PNG_BASE64"
run_test "createImageContentFromObject" "Create from object with type hint" "$ASSETS_DIR/test-image.png"
run_test "createImageContentUint8Array" "Create from Uint8Array" "$ASSETS_DIR/test-image.png"
run_test "createImageContentEmpty" "Reject empty buffer"

echo ""

echo -e "${BLUE}Testing Audio Content Creation:${NC}"

run_test "createAudioContentFromBuffer" "Create audio from Buffer" "$ASSETS_DIR/test-audio.wav"

echo ""

echo -e "${BLUE}Testing Binary Content Creation:${NC}"

run_test "createBlobContentFromBuffer" "Create blob from Buffer" "$ASSETS_DIR/test-file.pdf"

echo ""

# ============================================================================
# Type Guard Tests
# ============================================================================
echo -e "${BLUE}Testing Type Guards:${NC}"

run_test "isBufferTest" "isBuffer() type guard"
run_test "isUint8ArrayTest" "isUint8Array() type guard"

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

# Cleanup
rm -f "$TEST_HELPER"

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
